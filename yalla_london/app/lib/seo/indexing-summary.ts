/**
 * Shared Indexing Summary — Single Source of Truth
 *
 * This module provides a single function that computes indexing counts
 * the same way for EVERY consumer (cockpit API, content-indexing API,
 * diagnostics, etc.). If two panels show different numbers, it means
 * one of them is NOT using this function.
 *
 * Rule: total = indexed + submitted + discovered + neverSubmitted + errors + deindexed
 * No double-counting. No exceptions.
 */

// ─── Types ──────────────────────────────────────────────────────────────

export interface IndexingSummary {
  // Core counts — THE numbers, used everywhere
  total: number;
  indexed: number;
  submitted: number;
  discovered: number;
  neverSubmitted: number;
  errors: number;
  deindexed: number;
  chronicFailures: number; // URLs with 5+ submission attempts still not indexed

  // Derived
  rate: number; // indexed / total × 100
  staleCount: number; // submitted >14d ago, still not indexed
  velocity7d: number; // newly indexed in last 7 days
  velocity7dPrevious: number; // indexed in the 7 days before that (for trend comparison)
  orphanedCount: number; // alias for neverSubmitted (backwards compat)

  // Operational context
  avgTimeToIndexDays: number | null;
  lastSubmissionAge: string | null;
  lastVerificationAge: string | null;
  channelBreakdown: { indexnow: number; sitemap: number; googleApi: number };
  blockers: Array<{ reason: string; count: number; severity: "critical" | "warning" | "info" }>;
  topBlocker: string | null;

  // Hreflang reciprocity
  hreflangMismatchCount: number; // pairs where EN is indexed but AR is not (or vice versa)

  // For the IndexingPanel to reuse
  dailyQuotaRemaining: number | null;
}

type StatusValue = "indexed" | "submitted" | "discovered" | "error" | "deindexed" | "chronic_failure" | "never_submitted";

// ─── Helpers ────────────────────────────────────────────────────────────

function ageStr(date: Date | null | undefined): string | null {
  if (!date) return null;
  const ms = Date.now() - date.getTime();
  const hours = Math.round(ms / (1000 * 60 * 60));
  if (hours < 1) return "< 1h ago";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * Resolve the indexing status for a single URL.
 * Cross-checks both `status` AND `indexing_state` fields.
 * This is the ONLY place status resolution logic lives.
 */
function resolveStatus(record: { status: string; indexing_state: string | null } | null): StatusValue {
  if (!record) return "never_submitted";
  if (record.status === "indexed" || record.indexing_state === "INDEXED" || record.indexing_state === "PARTIALLY_INDEXED") {
    return "indexed";
  }
  if (record.status === "chronic_failure") return "chronic_failure";
  if (record.status === "error") return "error";
  if (record.status === "deindexed") return "deindexed";
  if (record.status === "submitted" || record.status === "pending") return "submitted";
  if (record.status === "discovered") return "discovered";
  // Fallback for unknown statuses
  return "discovered";
}

// ─── Main Function ──────────────────────────────────────────────────────

/**
 * Compute indexing summary for a site. Used by cockpit API and content-indexing API.
 * Starts from published content (what we care about), resolves each page's status.
 */
export async function getIndexingSummary(siteId: string): Promise<IndexingSummary> {
  const { prisma } = await import("@/lib/db");
  const { getSiteDomain } = await import("@/config/sites");

  // ── 1. Count all published/indexable pages ──────────────────────────────
  // Uses getAllIndexableUrls (English-only) as single source of truth.
  // This includes: static pages, blog posts (DB + static), news, events,
  // information hub, categories, walks, shop products, yacht pages — everything.
  let publishedCount = 0;
  try {
    const { getAllIndexableUrls } = await import("@/lib/seo/indexing-service");
    const siteUrl = getSiteDomain(siteId);
    const englishUrls = await getAllIndexableUrls(siteId, siteUrl, false);
    publishedCount = englishUrls.length;
  } catch (err) {
    console.warn("[indexing-summary] getAllIndexableUrls failed, falling back to DB count:", err instanceof Error ? err.message : err);
    // Fallback: just count DB blog posts if the comprehensive function fails
    try {
      publishedCount = await prisma.blogPost.count({
        where: { published: true, siteId, deletedAt: null },
      });
    } catch (e) { console.warn("[indexing-summary] BlogPost.count fallback failed:", e instanceof Error ? e.message : e); }
  }

  // ── 1b. Normalize "pending" → "discovered" (one-time migration per request) ──
  // "pending" and "discovered" are semantically identical. Normalizing prevents confusion.
  try {
    await prisma.uRLIndexingStatus.updateMany({
      where: { site_id: siteId, status: "pending" },
      data: { status: "discovered" },
    });
  } catch {
    // Non-critical — normalization is best-effort
  }

  // ── 2. Get all URLIndexingStatus records for this site ────────────────

  let trackingRecords: Array<{
    status: string;
    indexing_state: string | null;
    submitted_indexnow: boolean;
    submitted_sitemap: boolean;
    submitted_google_api: boolean;
    last_submitted_at: Date | null;
    last_inspected_at: Date | null;
    updated_at: Date | null;
  }> = [];

  try {
    trackingRecords = await prisma.uRLIndexingStatus.findMany({
      where: { site_id: siteId },
      select: {
        status: true,
        indexing_state: true,
        submitted_indexnow: true,
        submitted_sitemap: true,
        submitted_google_api: true,
        last_submitted_at: true,
        last_inspected_at: true,
        updated_at: true,
      },
    });
  } catch (e) { console.warn("[indexing-summary] URLIndexingStatus query failed:", e instanceof Error ? e.message : e); }

  // ── 2b. Cross-reference with GscPagePerformance ────────────────────────
  // GSC Search Analytics is the ultimate source of truth for indexing.
  // Any URL with impressions > 0 in GscPagePerformance is DEFINITELY indexed
  // by Google, even if URLIndexingStatus hasn't been updated yet.
  let gscConfirmedUrls = new Set<string>();
  try {
    const gscRecords = await prisma.gscPagePerformance.findMany({
      where: { site_id: siteId, impressions: { gt: 0 } },
      select: { url: true },
      distinct: ["url"],
      take: 2000,
    });
    gscConfirmedUrls = new Set(gscRecords.map((r: { url: string }) => r.url));
  } catch (e) { console.warn("[indexing-summary] GscPagePerformance query failed:", e instanceof Error ? e.message : e); }

  // Build a url→status lookup from URLIndexingStatus for cross-referencing
  let trackingUrlMap = new Map<string, string>();
  try {
    const trackingWithUrls = await prisma.uRLIndexingStatus.findMany({
      where: { site_id: siteId },
      select: { url: true, status: true, indexing_state: true },
      take: 2000,
    });
    for (const r of trackingWithUrls) {
      trackingUrlMap.set(r.url, r.status);
    }
  } catch (e) { console.warn("[indexing-summary] trackingUrlMap query failed:", e instanceof Error ? e.message : e); }

  // ── 3. Resolve status for each tracking record ────────────────────────

  let indexed = 0;
  let submitted = 0;
  let discovered = 0;
  let errors = 0;
  let deindexed = 0;
  let chronicFailures = 0;

  for (const record of trackingRecords) {
    const status = resolveStatus(record);
    if (status === "indexed") indexed++;
    else if (status === "submitted") submitted++;
    else if (status === "discovered") discovered++;
    else if (status === "error") errors++;
    else if (status === "deindexed") deindexed++;
    else if (status === "chronic_failure") chronicFailures++;
  }

  // ── 3b. Promote URLs confirmed by GSC but not yet marked indexed ──────
  // If GscPagePerformance shows a URL with impressions but URLIndexingStatus
  // still says "submitted"/"discovered"/"error", count it as indexed.
  // This closes the gap where gsc-sync runs daily but URLIndexingStatus
  // hasn't been updated yet.
  const gscPromotedUrls: string[] = [];
  for (const gscUrl of gscConfirmedUrls) {
    const trackingStatus = trackingUrlMap.get(gscUrl);
    if (trackingStatus && trackingStatus !== "indexed") {
      // This URL is confirmed indexed by GSC but not marked in our tracking.
      // Promote it: decrement its current bucket, increment indexed.
      if (trackingStatus === "submitted" || trackingStatus === "pending") { submitted--; indexed++; }
      else if (trackingStatus === "discovered") { discovered--; indexed++; }
      else if (trackingStatus === "error") { errors--; indexed++; }
      gscPromotedUrls.push(gscUrl);
    }
    // If URL is in GSC but has NO tracking record, it's still counted
    // under neverSubmitted below — but it's actually indexed. We handle
    // this by checking gscConfirmedUrls when computing neverSubmitted.
  }

  // Persist GSC promotions to DB — prevents recomputation on every call
  if (gscPromotedUrls.length > 0) {
    try {
      await prisma.uRLIndexingStatus.updateMany({
        where: { site_id: siteId, url: { in: gscPromotedUrls }, status: { not: "indexed" } },
        data: { status: "indexed", updated_at: new Date() },
      });
      console.log(`[indexing-summary] Persisted GSC promotions: ${gscPromotedUrls.length} URL(s) → indexed`);
    } catch (e) {
      console.warn("[indexing-summary] GSC promotion persistence failed:", e instanceof Error ? e.message : e);
    }
  }

  // Ensure no negative counts from the promotion
  submitted = Math.max(0, submitted);
  discovered = Math.max(0, discovered);
  errors = Math.max(0, errors);

  // "neverSubmitted" = published pages that have NO tracking record at all.
  // tracked = everything in URLIndexingStatus (regardless of status).
  // If published > tracked, the difference are orphaned/never-submitted pages.
  // HOWEVER: some untracked pages may already be indexed (GSC found them).
  // We count those as indexed, not neverSubmitted.
  const tracked = trackingRecords.length;
  const rawNeverSubmitted = Math.max(0, publishedCount - tracked);

  // Count how many "untracked" pages are actually confirmed indexed by GSC
  // These are URLs in gscConfirmedUrls that don't have a URLIndexingStatus record
  let untrackedButIndexed = 0;
  for (const gscUrl of gscConfirmedUrls) {
    if (!trackingUrlMap.has(gscUrl)) {
      untrackedButIndexed++;
    }
  }
  // Cap to avoid counting more than the gap
  untrackedButIndexed = Math.min(untrackedButIndexed, rawNeverSubmitted);
  indexed += untrackedButIndexed;
  const neverSubmitted = Math.max(0, rawNeverSubmitted - untrackedButIndexed);

  // Total must equal the sum of all buckets — this is the invariant
  const total = indexed + submitted + discovered + neverSubmitted + errors + deindexed + chronicFailures;

  // ── 4-9. Parallel operational queries ──────────────────────────────────
  // These are all independent — run in parallel for speed.

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);

  let staleCount = 0;
  let velocity7d = 0;
  let velocity7dPrevious = 0;
  let viaIndexNow = 0;
  let viaSitemap = 0;
  let viaGoogleApi = 0;
  let lastSubmissionDate: Date | null = null;
  let lastVerificationDate: Date | null = null;
  let avgTimeToIndexDays: number | null = null;
  let dailyQuotaRemaining: number | null = null;

  const parallelResults = await Promise.allSettled([
    // [0] Stale submissions
    gscConfirmedUrls.size > 0
      ? prisma.uRLIndexingStatus.findMany({
          where: { site_id: siteId, status: "submitted", last_submitted_at: { lt: fourteenDaysAgo } },
          select: { url: true },
        }).then((records: Array<{ url: string }>) => records.filter(r => !gscConfirmedUrls.has(r.url)).length)
      : prisma.uRLIndexingStatus.count({
          where: { site_id: siteId, status: "submitted", last_submitted_at: { lt: fourteenDaysAgo } },
        }),
    // [1] Velocity 7d
    prisma.uRLIndexingStatus.count({
      where: { site_id: siteId, status: "indexed", updated_at: { gte: sevenDaysAgo } },
    }),
    // [2] Velocity previous 7d
    prisma.uRLIndexingStatus.count({
      where: { site_id: siteId, status: "indexed", updated_at: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
    }),
    // [3] Channel: IndexNow
    prisma.uRLIndexingStatus.count({ where: { site_id: siteId, submitted_indexnow: true } }),
    // [4] Channel: Sitemap
    prisma.uRLIndexingStatus.count({ where: { site_id: siteId, submitted_sitemap: true } }),
    // [5] Channel: Google API
    prisma.uRLIndexingStatus.count({ where: { site_id: siteId, submitted_google_api: true } }),
    // [6] Last submission timestamp
    prisma.uRLIndexingStatus.findFirst({
      where: { site_id: siteId, last_submitted_at: { not: null } },
      orderBy: { last_submitted_at: "desc" },
      select: { last_submitted_at: true },
    }),
    // [7] Last verification timestamp
    prisma.uRLIndexingStatus.findFirst({
      where: { site_id: siteId, last_inspected_at: { not: null } },
      orderBy: { last_inspected_at: "desc" },
      select: { last_inspected_at: true },
    }),
    // [8] Avg time to index
    prisma.uRLIndexingStatus.findMany({
      where: { site_id: siteId, status: "indexed", last_submitted_at: { not: null } },
      select: { last_submitted_at: true, updated_at: true },
      take: 30,
    }),
    // [9] Daily quota used
    prisma.uRLIndexingStatus.count({
      where: { site_id: siteId, submitted_google_api: true, last_submitted_at: { gte: todayMidnight } },
    }),
  ]);

  // Extract results (default to safe values on failure)
  if (parallelResults[0].status === "fulfilled") staleCount = parallelResults[0].value as number;
  if (parallelResults[1].status === "fulfilled") velocity7d = parallelResults[1].value as number;
  if (parallelResults[2].status === "fulfilled") velocity7dPrevious = parallelResults[2].value as number;
  if (parallelResults[3].status === "fulfilled") viaIndexNow = parallelResults[3].value as number;
  if (parallelResults[4].status === "fulfilled") viaSitemap = parallelResults[4].value as number;
  if (parallelResults[5].status === "fulfilled") viaGoogleApi = parallelResults[5].value as number;
  if (parallelResults[6].status === "fulfilled") {
    const sub = parallelResults[6].value as { last_submitted_at: Date | null } | null;
    lastSubmissionDate = sub?.last_submitted_at ?? null;
  }
  if (parallelResults[7].status === "fulfilled") {
    const ver = parallelResults[7].value as { last_inspected_at: Date | null } | null;
    lastVerificationDate = ver?.last_inspected_at ?? null;
  }
  if (parallelResults[8].status === "fulfilled") {
    const indexedWithDates = parallelResults[8].value as Array<{ last_submitted_at: Date | null; updated_at: Date }>;
    const deltas = indexedWithDates
      .filter(r => r.last_submitted_at)
      .map(r => r.updated_at.getTime() - r.last_submitted_at!.getTime())
      .filter(d => d > 0);
    if (deltas.length >= 3) {
      avgTimeToIndexDays = Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length / (1000 * 60 * 60 * 24));
    }
  }
  if (parallelResults[9].status === "fulfilled") dailyQuotaRemaining = Math.max(0, 200 - (parallelResults[9].value as number));

  // ── 10. Hreflang reciprocity check ────────────────────────────────────
  // Count pairs where one language version is indexed but its counterpart is not.
  // Uses a SINGLE batch query instead of N+1 per-URL queries (was causing 504 timeouts).
  let hreflangMismatchCount = 0;
  try {
    // Fetch ALL tracking records at once — build a URL→status lookup in memory
    const allTracked = await prisma.uRLIndexingStatus.findMany({
      where: { site_id: siteId },
      select: { url: true, status: true },
    });
    const urlStatusMap = new Map<string, string>();
    for (const r of allTracked) {
      urlStatusMap.set(r.url, r.status);
    }

    // Check indexed URLs against their counterparts using the in-memory map
    const checkedPairs = new Set<string>();
    for (const [url, status] of urlStatusMap) {
      if (status !== "indexed") continue;
      try {
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        let counterpartPath: string | null = null;
        if (path.startsWith("/ar/") || path === "/ar") {
          counterpartPath = path === "/ar" ? "/" : path.replace(/^\/ar/, "");
        } else {
          counterpartPath = path === "/" ? "/ar" : `/ar${path}`;
        }
        if (counterpartPath) {
          const counterpartUrl = `${urlObj.origin}${counterpartPath}`;
          // Deduplicate: create a stable key for the pair
          const pairKey = [url, counterpartUrl].sort().join("|");
          if (checkedPairs.has(pairKey)) continue;
          checkedPairs.add(pairKey);

          const counterpartStatus = urlStatusMap.get(counterpartUrl);
          // Only count if counterpart exists in tracking but is NOT indexed
          if (counterpartStatus && counterpartStatus !== "indexed") {
            hreflangMismatchCount++;
          }
        }
      } catch { /* URL parse error — skip */ }
    }
  } catch (e) { console.warn("[indexing-summary] hreflang check failed:", e instanceof Error ? e.message : e); }

  // ── 11. Build blockers list ───────────────────────────────────────────

  const blockers: IndexingSummary["blockers"] = [];

  if (!process.env.INDEXNOW_KEY) {
    blockers.push({
      reason: "IndexNow key not set — search engines can't be notified of new content",
      count: publishedCount,
      severity: "critical",
    });
  }
  if (neverSubmitted > 0) {
    blockers.push({
      reason: `${neverSubmitted} article${neverSubmitted === 1 ? "" : "s"} not tracked — SEO agent never discovered them`,
      count: neverSubmitted,
      severity: "critical",
    });
  }
  if (staleCount > 0) {
    blockers.push({
      reason: `${staleCount} article${staleCount === 1 ? "" : "s"} submitted 14+ days ago but still not indexed by Google`,
      count: staleCount,
      severity: "critical",
    });
  }
  if (errors > 0) {
    blockers.push({
      reason: `${errors} article${errors === 1 ? "" : "s"} had submission errors`,
      count: errors,
      severity: "critical",
    });
  }
  if (discovered > 0) {
    blockers.push({
      reason: `${discovered} article${discovered === 1 ? "" : "s"} discovered but never submitted to search engines`,
      count: discovered,
      severity: "warning",
    });
  }
  if (deindexed > 0) {
    blockers.push({
      reason: `${deindexed} article${deindexed === 1 ? "" : "s"} were REMOVED from Google's index`,
      count: deindexed,
      severity: "critical",
    });
  }
  if (chronicFailures > 0) {
    blockers.push({
      reason: `${chronicFailures} article${chronicFailures === 1 ? "" : "s"} failed to index after 5+ attempts — investigate content quality or technical issues`,
      count: chronicFailures,
      severity: "critical",
    });
  }

  // Cron health checks
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const [seoAgentRuns, seoCronRuns] = await Promise.all([
      prisma.cronJobLog.count({ where: { job_name: "seo-agent", started_at: { gte: threeDaysAgo } } }),
      prisma.cronJobLog.count({ where: { job_name: { startsWith: "seo-cron" }, started_at: { gte: threeDaysAgo } } }),
    ]);
    if (seoAgentRuns === 0) {
      blockers.push({ reason: "SEO agent hasn't run in 3 days — new URLs not being discovered", count: 0, severity: "warning" });
    }
    if (seoCronRuns === 0 && process.env.INDEXNOW_KEY) {
      blockers.push({ reason: "SEO submission cron hasn't run in 3 days — URLs not being sent to Google", count: 0, severity: "warning" });
    }
  } catch (e) { console.warn("[indexing-summary] cron health check failed:", e instanceof Error ? e.message : e); }

  // Thin content check (word_count_en doesn't exist on BlogPost — compute from content_en)
  try {
    const allPosts = await prisma.blogPost.findMany({
      where: { siteId, published: true, deletedAt: null },
      select: { content_en: true },
    });
    const thinCount = allPosts.filter(
      (p) => (p.content_en || "").split(/\s+/).filter(Boolean).length < 800
    ).length;
    if (thinCount > 0) {
      blockers.push({
        reason: `${thinCount} article${thinCount === 1 ? "" : "s"} under 800 words — Google may reject thin content`,
        count: thinCount,
        severity: "warning",
      });
    }
  } catch (e) { console.warn("[indexing-summary] thin content check failed:", e instanceof Error ? e.message : e); }

  if (hreflangMismatchCount > 0) {
    blockers.push({
      reason: `${hreflangMismatchCount} hreflang pair${hreflangMismatchCount === 1 ? "" : "s"} mismatched — one language version is indexed but the other is not`,
      count: hreflangMismatchCount,
      severity: "warning",
    });
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  blockers.sort((a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2));

  // ── 12. Assemble result ───────────────────────────────────────────────

  return {
    total,
    indexed,
    submitted,
    discovered,
    neverSubmitted,
    errors,
    deindexed,
    chronicFailures,
    rate: total > 0 ? Math.round((indexed / total) * 100) : 0,
    staleCount,
    velocity7d,
    velocity7dPrevious,
    orphanedCount: neverSubmitted,
    avgTimeToIndexDays,
    lastSubmissionAge: ageStr(lastSubmissionDate),
    lastVerificationAge: ageStr(lastVerificationDate),
    channelBreakdown: { indexnow: viaIndexNow, sitemap: viaSitemap, googleApi: viaGoogleApi },
    hreflangMismatchCount,
    blockers,
    topBlocker: blockers.length > 0 ? blockers[0].reason : null,
    dailyQuotaRemaining,
  };
}

/**
 * Re-export resolveStatus for use in per-article detail views.
 * The content-indexing API needs this to resolve individual article statuses.
 */
export { resolveStatus };

// ─── Per-Article Status (for UI) ────────────────────────────────────────

/**
 * UI-friendly status type used by content-indexing, cockpit, and indexing pages.
 * Maps from the internal StatusValue to what the frontend displays.
 */
export type PageIndexingStatus =
  | "indexed"
  | "submitted"
  | "discovered"
  | "not_indexed"
  | "error"
  | "never_submitted";

/**
 * Resolve a single page's indexing status for UI display.
 * This is the ONLY function that should map DB records → UI status.
 *
 * Uses resolveStatus() internally, then maps internal-only values
 * (deindexed, chronic_failure) to UI-visible equivalents.
 */
export function resolvePageStatus(
  record: { status: string; indexing_state: string | null } | null | undefined,
): PageIndexingStatus {
  if (!record) return "never_submitted";
  const internal = resolveStatus(record);
  switch (internal) {
    case "indexed": return "indexed";
    case "submitted": return "submitted";
    case "discovered": return "discovered";
    case "error": return "error";
    case "chronic_failure": return "error"; // Show as error in UI — needs attention
    case "deindexed": return "not_indexed"; // Was indexed, now removed
    case "never_submitted": return "never_submitted";
    default: return "not_indexed";
  }
}

/**
 * Compute human-readable diagnostic reasons for why a page is not indexed.
 * Used by content-indexing tab and cockpit Content Matrix.
 */
export function computeNotIndexedReasons(
  pageStatus: PageIndexingStatus,
  record: {
    last_submitted_at?: Date | string | null;
    submitted_indexnow?: boolean;
    submitted_sitemap?: boolean;
    coverage_state?: string | null;
    last_error?: string | null;
    submission_attempts?: number;
  } | null | undefined,
  config: {
    hasIndexNowKey: boolean;
    hasGscCredentials: boolean;
  },
): string[] {
  const reasons: string[] = [];

  if (pageStatus === "never_submitted") {
    if (!config.hasIndexNowKey && !config.hasGscCredentials) {
      reasons.push("Neither IndexNow key nor Google Search Console credentials are configured — articles cannot be submitted to search engines");
    } else if (!config.hasIndexNowKey) {
      reasons.push("INDEXNOW_KEY not set — cannot submit to Bing/Yandex");
    }
    if (!config.hasGscCredentials) {
      reasons.push("Google Search Console credentials not configured — cannot submit sitemap or check indexing");
    }
    reasons.push("Article has never been submitted to search engines");
    return reasons;
  }

  if (pageStatus === "submitted" && record) {
    const submittedAt = record.last_submitted_at;
    if (submittedAt) {
      const ts = typeof submittedAt === "string" ? new Date(submittedAt).getTime() : submittedAt.getTime();
      const hoursSinceSubmission = (Date.now() - ts) / (1000 * 60 * 60);
      if (hoursSinceSubmission < 48) {
        reasons.push(`Submitted ${Math.round(hoursSinceSubmission)} hours ago — Google typically takes 2-14 days to crawl new URLs`);
      } else if (hoursSinceSubmission < 336) {
        reasons.push(`Submitted ${Math.round(hoursSinceSubmission / 24)} days ago — still within normal Google crawl timeframe (up to 14 days)`);
      } else {
        reasons.push(`Submitted ${Math.round(hoursSinceSubmission / 24)} days ago — this is longer than expected. Consider resubmitting.`);
      }
    }
    if (!record.submitted_indexnow) {
      reasons.push("Not submitted via IndexNow (Bing/Yandex)");
    }
    if (!record.submitted_sitemap) {
      reasons.push("Sitemap not submitted to Google via GSC — Google relies on sitemap discovery for blog content");
    }
    return reasons;
  }

  if (pageStatus === "not_indexed" && record) {
    const coverage = record.coverage_state || "";
    if (coverage.includes("Crawled - currently not indexed")) {
      reasons.push("Google crawled this page but chose not to index it — content may need improvement (more depth, unique value, or better internal linking)");
    } else if (coverage.includes("Discovered - currently not indexed")) {
      reasons.push("Google discovered this URL but hasn't crawled it yet — this is normal for new sites");
    } else if (coverage.includes("Duplicate")) {
      reasons.push("Google considers this a duplicate of another page — check for similar content on the site");
    } else if (coverage.includes("Excluded by")) {
      reasons.push(`Page excluded: ${coverage}`);
    } else if (coverage.includes("Blocked by robots.txt")) {
      reasons.push("Blocked by robots.txt — check your robots.txt configuration");
    } else if (coverage.includes("noindex")) {
      reasons.push("Page has a noindex tag — remove it to allow indexing");
    } else if (coverage) {
      reasons.push(`Google coverage state: ${coverage}`);
    } else {
      reasons.push("Page status unknown — run the SEO agent to inspect this URL via Google Search Console");
    }
    return reasons;
  }

  if (pageStatus === "error" && record) {
    if (record.last_error) {
      reasons.push(`Submission error: ${record.last_error}`);
    }
    if ((record.submission_attempts || 0) >= 5) {
      reasons.push(`Failed after ${record.submission_attempts} submission attempts — may need manual investigation`);
    }
    return reasons;
  }

  return reasons;
}

// ─── Inspection Details Extraction ────────────────────────────────────
// Shared parser for inspection_result JSON stored in URLIndexingStatus.
// Used by: content-indexing API, master audit crawl-freshness validator,
// cockpit inspection panels, SEO dashboard.

export interface InspectionDetails {
  verdict: string | null;
  robotsTxtState: string | null;
  indexingAllowed: string | null;
  crawlAllowed: string | null;
  pageFetchState: string | null;
  crawledAs: string | null;
  userCanonical: string | null;
  googleCanonical: string | null;
  canonicalMismatch: boolean;
  mobileUsabilityVerdict: string | null;
  richResultsVerdict: string | null;
  referringUrlCount: number;
  sitemapCount: number;
}

/**
 * Parse the inspection_result JSON blob from URLIndexingStatus into structured fields.
 * Handles both flat fields (from our internal format) and nested rawResult
 * (from GSC URL Inspection API response stored verbatim).
 */
export function extractInspectionDetails(inspectionResult: unknown): InspectionDetails | undefined {
  if (!inspectionResult || typeof inspectionResult !== 'object') return undefined;
  const ir = inspectionResult as Record<string, unknown>;

  // Handle nested rawResult (GSC URL Inspection API stores response under indexStatusResult)
  const raw = (ir.rawResult as Record<string, unknown>) || {};
  const indexStatus = (raw.indexStatusResult as Record<string, unknown>) || {};

  const referringUrls = ir.referringUrls || indexStatus.referringUrls;
  const sitemaps = indexStatus.sitemap;

  return {
    verdict: (ir.verdict as string) || null,
    robotsTxtState: (ir.robotsTxtState as string) || (indexStatus.robotsTxtState as string) || null,
    indexingAllowed: (ir.indexingAllowed as string) || (indexStatus.indexingState as string) || null,
    crawlAllowed: (ir.crawlAllowed as string) || (indexStatus.crawlAllowed as string) || null,
    pageFetchState: (ir.pageFetchState as string) || (indexStatus.pageFetchState as string) || null,
    crawledAs: (ir.crawledAs as string) || (indexStatus.crawledAs as string) || null,
    userCanonical: (ir.userCanonical as string) || (indexStatus.userCanonical as string) || null,
    googleCanonical: (ir.googleCanonical as string) || (indexStatus.googleCanonical as string) || null,
    canonicalMismatch: !!(
      ir.userCanonical && ir.googleCanonical &&
      ir.userCanonical !== ir.googleCanonical
    ),
    mobileUsabilityVerdict: (ir.mobileUsabilityVerdict as string) || null,
    richResultsVerdict: (ir.richResultsVerdict as string) || null,
    referringUrlCount: Array.isArray(referringUrls) ? referringUrls.length : 0,
    sitemapCount: Array.isArray(sitemaps) ? sitemaps.length : 0,
  };
}
