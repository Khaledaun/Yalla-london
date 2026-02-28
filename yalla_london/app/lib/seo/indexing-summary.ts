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
    } catch { /* table may not exist */ }
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
  } catch { /* table may not exist */ }

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

  // "neverSubmitted" = published pages that have NO tracking record at all.
  // tracked = everything in URLIndexingStatus (regardless of status).
  // If published > tracked, the difference are orphaned/never-submitted pages.
  const tracked = trackingRecords.length;
  const neverSubmitted = Math.max(0, publishedCount - tracked);

  // Total must equal the sum of all buckets — this is the invariant
  const total = indexed + submitted + discovered + neverSubmitted + errors + deindexed + chronicFailures;

  // ── 4. Stale submissions (submitted >14d, still not indexed) ──────────

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  let staleCount = 0;
  try {
    staleCount = await prisma.uRLIndexingStatus.count({
      where: {
        site_id: siteId,
        status: "submitted",
        last_submitted_at: { lt: fourteenDaysAgo },
      },
    });
  } catch { /* non-critical */ }

  // ── 5. Velocity: indexed in last 7 days + previous 7 days (trend) ────

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgoV = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  let velocity7d = 0;
  let velocity7dPrevious = 0;
  try {
    [velocity7d, velocity7dPrevious] = await Promise.all([
      prisma.uRLIndexingStatus.count({
        where: { site_id: siteId, status: "indexed", updated_at: { gte: sevenDaysAgo } },
      }),
      prisma.uRLIndexingStatus.count({
        where: {
          site_id: siteId, status: "indexed",
          updated_at: { gte: fourteenDaysAgoV, lt: sevenDaysAgo },
        },
      }),
    ]);
  } catch { /* non-critical */ }

  // ── 6. Channel breakdown ──────────────────────────────────────────────

  let viaIndexNow = 0;
  let viaSitemap = 0;
  let viaGoogleApi = 0;
  try {
    [viaIndexNow, viaSitemap, viaGoogleApi] = await Promise.all([
      prisma.uRLIndexingStatus.count({ where: { site_id: siteId, submitted_indexnow: true } }),
      prisma.uRLIndexingStatus.count({ where: { site_id: siteId, submitted_sitemap: true } }),
      prisma.uRLIndexingStatus.count({ where: { site_id: siteId, submitted_google_api: true } }),
    ]);
  } catch { /* non-critical */ }

  // ── 7. Timestamps ─────────────────────────────────────────────────────

  let lastSubmissionDate: Date | null = null;
  let lastVerificationDate: Date | null = null;
  try {
    const lastSub = await prisma.uRLIndexingStatus.findFirst({
      where: { site_id: siteId, last_submitted_at: { not: null } },
      orderBy: { last_submitted_at: "desc" },
      select: { last_submitted_at: true },
    });
    lastSubmissionDate = lastSub?.last_submitted_at ?? null;

    const lastVer = await prisma.uRLIndexingStatus.findFirst({
      where: { site_id: siteId, last_inspected_at: { not: null } },
      orderBy: { last_inspected_at: "desc" },
      select: { last_inspected_at: true },
    });
    lastVerificationDate = lastVer?.last_inspected_at ?? null;
  } catch { /* non-critical */ }

  // ── 8. Average time to index ──────────────────────────────────────────

  let avgTimeToIndexDays: number | null = null;
  try {
    const indexedWithDates = await prisma.uRLIndexingStatus.findMany({
      where: { site_id: siteId, status: "indexed", last_submitted_at: { not: null } },
      select: { last_submitted_at: true, updated_at: true },
      take: 30,
    });
    const deltas = indexedWithDates
      .filter((r: { last_submitted_at: Date | null }) => r.last_submitted_at)
      .map((r: { last_submitted_at: Date | null; updated_at: Date }) =>
        r.updated_at.getTime() - r.last_submitted_at!.getTime()
      )
      .filter((d: number) => d > 0);
    if (deltas.length >= 3) {
      avgTimeToIndexDays = Math.round(
        deltas.reduce((a: number, b: number) => a + b, 0) / deltas.length / (1000 * 60 * 60 * 24)
      );
    }
  } catch { /* non-critical */ }

  // ── 9. Google Indexing API daily quota remaining ───────────────────────

  let dailyQuotaRemaining: number | null = null;
  try {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const usedToday = await prisma.uRLIndexingStatus.count({
      where: {
        site_id: siteId,
        submitted_google_api: true,
        last_submitted_at: { gte: todayMidnight },
      },
    });
    dailyQuotaRemaining = Math.max(0, 200 - usedToday);
  } catch { /* non-critical */ }

  // ── 10. Hreflang reciprocity check ────────────────────────────────────
  // Count pairs where one language version is indexed but its counterpart is not.
  let hreflangMismatchCount = 0;
  try {
    const indexedUrls = await prisma.uRLIndexingStatus.findMany({
      where: { site_id: siteId, status: "indexed" },
      select: { url: true },
    });
    for (const { url } of indexedUrls) {
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
          const counterpart = await prisma.uRLIndexingStatus.findFirst({
            where: { site_id: siteId, url: counterpartUrl },
            select: { status: true },
          });
          // Only count if counterpart exists in tracking but is NOT indexed
          if (counterpart && counterpart.status !== "indexed") {
            hreflangMismatchCount++;
          }
        }
      } catch { /* URL parse error — skip */ }
    }
    // Each pair would be counted from both sides; deduplicate by halving
    hreflangMismatchCount = Math.ceil(hreflangMismatchCount / 2);
  } catch { /* non-critical */ }

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
      prisma.cronJobLog.count({ where: { job_name: "seo-cron", started_at: { gte: threeDaysAgo } } }),
    ]);
    if (seoAgentRuns === 0) {
      blockers.push({ reason: "SEO agent hasn't run in 3 days — new URLs not being discovered", count: 0, severity: "warning" });
    }
    if (seoCronRuns === 0 && process.env.INDEXNOW_KEY) {
      blockers.push({ reason: "SEO submission cron hasn't run in 3 days — URLs not being sent to Google", count: 0, severity: "warning" });
    }
  } catch { /* non-critical */ }

  // Thin content check
  try {
    const thinCount = await prisma.blogPost.count({
      where: { siteId, published: true, deletedAt: null, word_count_en: { lt: 800 } },
    });
    if (thinCount > 0) {
      blockers.push({
        reason: `${thinCount} article${thinCount === 1 ? "" : "s"} under 800 words — Google may reject thin content`,
        count: thinCount,
        severity: "warning",
      });
    }
  } catch { /* non-critical */ }

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
