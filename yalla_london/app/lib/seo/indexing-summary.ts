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

  // Derived
  rate: number; // indexed / total × 100
  staleCount: number; // submitted >14d ago, still not indexed
  velocity7d: number; // newly indexed in last 7 days
  orphanedCount: number; // alias for neverSubmitted (backwards compat)

  // Operational context
  avgTimeToIndexDays: number | null;
  lastSubmissionAge: string | null;
  lastVerificationAge: string | null;
  channelBreakdown: { indexnow: number; sitemap: number; googleApi: number };
  blockers: Array<{ reason: string; count: number; severity: "critical" | "warning" | "info" }>;
  topBlocker: string | null;

  // For the IndexingPanel to reuse
  dailyQuotaRemaining: number | null;
}

type StatusValue = "indexed" | "submitted" | "discovered" | "error" | "deindexed" | "never_submitted";

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
  const { isYachtSite } = await import("@/config/sites");
  const isYacht = isYachtSite(siteId);

  // ── 1. Count all published content pages ──────────────────────────────

  // Blog posts
  let blogCount = 0;
  try {
    blogCount = await prisma.blogPost.count({
      where: { published: true, siteId, deletedAt: null },
    });
  } catch { /* table may not exist */ }

  // Static blog posts (Yalla London only — legacy)
  let staticSlugs: string[] = [];
  if (siteId === "yalla-london") {
    try {
      const { blogPosts: staticBlogPosts } = await import("@/data/blog-content");
      const { extendedBlogPosts } = await import("@/data/blog-content-extended");
      // Only count static slugs not already in DB
      const dbSlugs = new Set(
        (await prisma.blogPost.findMany({
          where: { published: true, siteId, deletedAt: null },
          select: { slug: true },
        })).map((p: { slug: string }) => p.slug)
      );
      staticSlugs = [...staticBlogPosts, ...extendedBlogPosts]
        .filter((p) => p.published && !dbSlugs.has(p.slug))
        .map((p) => p.slug);
    } catch { /* static data may not exist */ }
  }

  // News items (non-yacht sites only)
  let newsCount = 0;
  if (!isYacht) {
    try {
      newsCount = await prisma.newsItem.count({
        where: {
          siteId,
          status: "published",
          OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
        },
      });
    } catch { /* table may not exist */ }
  }

  // Yacht pages (yacht sites only)
  let yachtPageCount = 0;
  if (isYacht) {
    try {
      const [yachts, destinations, itineraries] = await Promise.allSettled([
        prisma.yacht.count({ where: { siteId, status: "active" } }),
        prisma.yachtDestination.count({ where: { siteId, status: "active" } }),
        prisma.charterItinerary.count({ where: { siteId, status: "active" } }),
      ]);
      if (yachts.status === "fulfilled") yachtPageCount += yachts.value;
      if (destinations.status === "fulfilled") yachtPageCount += destinations.value;
      if (itineraries.status === "fulfilled") yachtPageCount += itineraries.value;
    } catch { /* yacht tables may not exist */ }
  }

  const publishedCount = blogCount + staticSlugs.length + newsCount + yachtPageCount;

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

  for (const record of trackingRecords) {
    const status = resolveStatus(record);
    if (status === "indexed") indexed++;
    else if (status === "submitted") submitted++;
    else if (status === "discovered") discovered++;
    else if (status === "error") errors++;
    else if (status === "deindexed") deindexed++;
  }

  // "neverSubmitted" = published pages that have NO tracking record at all.
  // tracked = everything in URLIndexingStatus (regardless of status).
  // If published > tracked, the difference are orphaned/never-submitted pages.
  const tracked = trackingRecords.length;
  const neverSubmitted = Math.max(0, publishedCount - tracked);

  // Total must equal the sum of all buckets — this is the invariant
  const total = indexed + submitted + discovered + neverSubmitted + errors + deindexed;

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

  // ── 5. Velocity: indexed in last 7 days ───────────────────────────────

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let velocity7d = 0;
  try {
    velocity7d = await prisma.uRLIndexingStatus.count({
      where: {
        site_id: siteId,
        status: "indexed",
        updated_at: { gte: sevenDaysAgo },
      },
    });
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

  // ── 10. Build blockers list ───────────────────────────────────────────

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

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  blockers.sort((a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2));

  // ── 11. Assemble result ───────────────────────────────────────────────

  return {
    total,
    indexed,
    submitted,
    discovered,
    neverSubmitted,
    errors,
    deindexed,
    rate: total > 0 ? Math.round((indexed / total) * 100) : 0,
    staleCount,
    velocity7d,
    orphanedCount: neverSubmitted,
    avgTimeToIndexDays,
    lastSubmissionAge: ageStr(lastSubmissionDate),
    lastVerificationAge: ageStr(lastVerificationDate),
    channelBreakdown: { indexnow: viaIndexNow, sitemap: viaSitemap, googleApi: viaGoogleApi },
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
