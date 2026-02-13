/**
 * Site Health Check Cron
 *
 * Aggregates health metrics for every site and stores snapshots
 * in the SiteHealthCheck model. Designed to run hourly or daily.
 *
 * Metrics collected per site:
 *   - Blog post counts (total, published, pending)
 *   - Average SEO score
 *   - Pending topic proposals & rewrite queue
 *   - Latest cron run timestamps (seo-agent, daily-content-generate)
 *   - GSC performance (clicks, impressions, CTR, avg position)
 *   - GA4 traffic (sessions, bounce rate, engagement rate, organic share)
 *   - Composite health score (0-100)
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { withCronLog } from "@/lib/cron-logger";
import { forEachSite } from "@/lib/resilience";
import { getAllSiteIds, getSiteSeoConfig, getSiteSeoConfigFromVault } from "@/config/sites";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SiteHealthData {
  site_id: string;
  health_score: number;
  indexed_pages: number | null;
  total_pages: number | null;
  indexing_rate: number | null;
  gsc_clicks: number | null;
  gsc_impressions: number | null;
  gsc_ctr: number | null;
  gsc_avg_position: number | null;
  ga4_sessions: number | null;
  ga4_bounce_rate: number | null;
  ga4_engagement_rate: number | null;
  ga4_organic_share: number | null;
  total_posts: number;
  posts_published: number;
  posts_pending: number;
  avg_seo_score: number | null;
  last_agent_run: Date | null;
  last_content_gen: Date | null;
  pending_proposals: number;
  rewrite_queue: number;
  pagespeed_mobile: number | null;
  pagespeed_desktop: number | null;
  snapshot_data: Record<string, unknown> | null;
}

interface ScoreInputs {
  totalPosts: number;
  postsPublished: number;
  avgSeoScore: number | null;
  indexingRate: number | null;
  gscCtr: number | null;
  ga4EngagementRate: number | null;
  lastAgentRun: Date | null;
  lastContentGen: Date | null;
  pendingProposals: number;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

const handler = withCronLog("site-health-check", async (log) => {
  const { prisma } = await import("@/lib/db");
  const siteIds = getAllSiteIds();

  const loopResult = await forEachSite(siteIds, async (siteId) => {
    if (log.isExpired()) {
      log.skipSite(siteId);
      return null;
    }

    const health = await collectSiteHealth(prisma, siteId);

    await prisma.siteHealthCheck.create({ data: health });

    log.addSite(siteId);
    log.trackItem(true);
    return { siteId, healthScore: health.health_score };
  });

  return {
    sites: loopResult.results,
    errors: loopResult.errors,
    skipped: loopResult.skipped,
    completed: loopResult.completed,
    failed: loopResult.failed,
    timedOut: loopResult.timedOut,
  };
});

export const GET = handler;
export const POST = handler;

// ---------------------------------------------------------------------------
// Per-site data collection
// ---------------------------------------------------------------------------

async function collectSiteHealth(
  prisma: unknown,
  siteId: string,
): Promise<SiteHealthData> {
  const db = prisma as Record<string, any>;

  // ── Content metrics ────────────────────────────────────────────────
  // Note: siteId column exists in Prisma schema but not yet migrated to DB.
  // Fall back to global counts until migration is run.
  let totalPosts = 0;
  let postsPublished = 0;
  let postsPending = 0;
  let avgSeoScore: number | null = null;

  try {
    const [tp, pp, ppend, avgRes] = await Promise.all([
      db.blogPost.count({ where: { siteId } }),
      db.blogPost.count({ where: { siteId, published: true } }),
      db.blogPost.count({ where: { siteId, published: false } }),
      db.blogPost.aggregate({
        _avg: { seo_score: true },
        where: { siteId, seo_score: { not: null } },
      }),
    ]);
    totalPosts = tp;
    postsPublished = pp;
    postsPending = ppend;
    avgSeoScore = avgRes._avg.seo_score ?? null;
  } catch {
    // siteId column doesn't exist yet — fall back to global counts
    const [tp, pp, ppend, avgRes] = await Promise.all([
      db.blogPost.count({ where: { deletedAt: null } }),
      db.blogPost.count({ where: { published: true, deletedAt: null } }),
      db.blogPost.count({ where: { published: false, deletedAt: null } }),
      db.blogPost.aggregate({
        _avg: { seo_score: true },
        where: { seo_score: { not: null }, deletedAt: null },
      }),
    ]);
    totalPosts = tp;
    postsPublished = pp;
    postsPending = ppend;
    avgSeoScore = avgRes._avg.seo_score ?? null;
  }

  // ── Topic proposals & rewrite queue ────────────────────────────────
  const [pendingProposals, rewriteQueue] = await Promise.all([
    db.topicProposal.count({
      where: {
        site_id: siteId,
        status: { in: ["planned", "queued"] },
      },
    }),
    db.topicProposal.count({
      where: {
        site_id: siteId,
        status: "planned",
        source_weights_json: {
          path: ["source"],
          equals: "seo-agent-rewrite",
        },
      },
    }).catch(() => 0),
  ]);

  // ── Latest cron runs ───────────────────────────────────────────────
  const [lastAgentLog, lastContentLog] = await Promise.all([
    db.cronJobLog
      .findFirst({
        where: { job_name: "seo-agent", status: "completed" },
        orderBy: { completed_at: "desc" },
        select: { completed_at: true },
      })
      .catch(() => null),
    db.cronJobLog
      .findFirst({
        where: { job_name: "daily-content-generate", status: "completed" },
        orderBy: { completed_at: "desc" },
        select: { completed_at: true },
      })
      .catch(() => null),
  ]);

  const lastAgentRun: Date | null = lastAgentLog?.completed_at ?? null;
  const lastContentGen: Date | null = lastContentLog?.completed_at ?? null;

  // ── GSC data (may not be configured for this site) ─────────────────
  let gscClicks: number | null = null;
  let gscImpressions: number | null = null;
  let gscCtr: number | null = null;
  let gscAvgPosition: number | null = null;
  let indexedPages: number | null = null;

  try {
    const seoConfig = getSiteSeoConfig(siteId);
    if (seoConfig.gscSiteUrl) {
      const { GoogleSearchConsole } = await import(
        "@/lib/integrations/google-search-console"
      );
      const gsc = new GoogleSearchConsole();

      if (gsc.isConfigured()) {
        const endDate = new Date().toISOString().split("T")[0];
        const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];

        const analytics = await gsc.getSearchAnalytics(startDate, endDate, [
          "query",
        ]);

        if (analytics?.rows && Array.isArray(analytics.rows)) {
          let clicks = 0;
          let impressions = 0;
          let weightedPosition = 0;

          for (const row of analytics.rows) {
            clicks += row.clicks ?? 0;
            impressions += row.impressions ?? 0;
            weightedPosition += (row.position ?? 0) * (row.impressions ?? 0);
          }

          gscClicks = clicks;
          gscImpressions = impressions;
          gscCtr =
            impressions > 0
              ? Math.round((clicks / impressions) * 10000) / 100
              : 0;
          gscAvgPosition =
            impressions > 0
              ? Math.round((weightedPosition / impressions) * 10) / 10
              : null;
        }
      }
    }
  } catch (gscError) {
    console.warn(
      `[site-health-check] GSC fetch failed for ${siteId}:`,
      gscError instanceof Error ? gscError.message : gscError,
    );
  }

  // ── GA4 data (may not be configured for this site) ─────────────────
  let ga4Sessions: number | null = null;
  let ga4BounceRate: number | null = null;
  let ga4EngagementRate: number | null = null;
  let ga4OrganicShare: number | null = null;

  try {
    const { fetchGA4Metrics } = await import("@/lib/seo/ga4-data-api");
    const ga4Report = await fetchGA4Metrics("28daysAgo", "today");

    if (ga4Report) {
      ga4Sessions = ga4Report.metrics.sessions;
      ga4BounceRate = ga4Report.metrics.bounceRate;
      ga4EngagementRate = ga4Report.metrics.engagementRate;

      // Calculate organic share from traffic sources
      if (ga4Report.topSources && ga4Report.topSources.length > 0) {
        const totalSessions = ga4Report.topSources.reduce(
          (sum: number, s: { source: string; sessions: number }) =>
            sum + s.sessions,
          0,
        );
        const organicSessions = ga4Report.topSources
          .filter((s: { source: string; sessions: number }) =>
            s.source.toLowerCase().includes("google") ||
            s.source.toLowerCase().includes("bing") ||
            s.source.toLowerCase().includes("yahoo") ||
            s.source.toLowerCase().includes("duckduckgo"),
          )
          .reduce(
            (sum: number, s: { source: string; sessions: number }) =>
              sum + s.sessions,
            0,
          );

        ga4OrganicShare =
          totalSessions > 0
            ? Math.round((organicSessions / totalSessions) * 10000) / 100
            : 0;
      }
    }
  } catch (ga4Error) {
    console.warn(
      `[site-health-check] GA4 fetch failed for ${siteId}:`,
      ga4Error instanceof Error ? ga4Error.message : ga4Error,
    );
  }

  // ── Indexing rate ──────────────────────────────────────────────────
  const totalPages = postsPublished;
  const indexingRate =
    totalPages > 0 && indexedPages !== null
      ? Math.round((indexedPages / totalPages) * 10000) / 100
      : null;

  // ── Calculate composite health score ──────────────────────────────
  const healthScore = calculateHealthScore({
    totalPosts,
    postsPublished,
    avgSeoScore,
    indexingRate,
    gscCtr,
    ga4EngagementRate,
    lastAgentRun,
    lastContentGen,
    pendingProposals,
  });

  return {
    site_id: siteId,
    health_score: healthScore,
    indexed_pages: indexedPages,
    total_pages: totalPages,
    indexing_rate: indexingRate,
    gsc_clicks: gscClicks,
    gsc_impressions: gscImpressions,
    gsc_ctr: gscCtr,
    gsc_avg_position: gscAvgPosition,
    ga4_sessions: ga4Sessions,
    ga4_bounce_rate: ga4BounceRate,
    ga4_engagement_rate: ga4EngagementRate,
    ga4_organic_share: ga4OrganicShare,
    total_posts: totalPosts,
    posts_published: postsPublished,
    posts_pending: postsPending,
    avg_seo_score: avgSeoScore,
    last_agent_run: lastAgentRun,
    last_content_gen: lastContentGen,
    pending_proposals: pendingProposals,
    rewrite_queue: rewriteQueue,
    pagespeed_mobile: null,
    pagespeed_desktop: null,
    snapshot_data: {
      collectedAt: new Date().toISOString(),
      gscConfigured: gscClicks !== null,
      ga4Configured: ga4Sessions !== null,
    },
  };
}

// ---------------------------------------------------------------------------
// Health score calculation (0-100)
// ---------------------------------------------------------------------------

function calculateHealthScore(inputs: ScoreInputs): number {
  let score = 0;
  let weights = 0;

  // 1. Content volume (0-15 pts)
  //    At least 10 published posts = full marks
  if (inputs.totalPosts > 0) {
    const contentScore = Math.min(inputs.postsPublished / 10, 1) * 15;
    score += contentScore;
  }
  weights += 15;

  // 2. Average SEO score (0-25 pts)
  //    Maps SEO score (0-100) to 0-25 pts
  if (inputs.avgSeoScore !== null) {
    score += (inputs.avgSeoScore / 100) * 25;
  }
  weights += 25;

  // 3. Indexing rate (0-20 pts)
  //    100% indexed = full marks
  if (inputs.indexingRate !== null) {
    score += (inputs.indexingRate / 100) * 20;
  }
  weights += 20;

  // 4. GSC CTR (0-10 pts)
  //    CTR >= 5% = full marks
  if (inputs.gscCtr !== null) {
    const ctrScore = Math.min(inputs.gscCtr / 5, 1) * 10;
    score += ctrScore;
  }
  weights += 10;

  // 5. GA4 engagement rate (0-10 pts)
  //    Engagement >= 80% = full marks
  if (inputs.ga4EngagementRate !== null) {
    const engScore = Math.min(inputs.ga4EngagementRate / 80, 1) * 10;
    score += engScore;
  }
  weights += 10;

  // 6. Content freshness (0-10 pts)
  //    Agent ran in last 24h = 5 pts, content generated in last 48h = 5 pts
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (inputs.lastAgentRun) {
    const agentAge = now - inputs.lastAgentRun.getTime();
    if (agentAge < oneDayMs) {
      score += 5;
    } else if (agentAge < 3 * oneDayMs) {
      score += 3;
    } else if (agentAge < 7 * oneDayMs) {
      score += 1;
    }
  }

  if (inputs.lastContentGen) {
    const contentAge = now - inputs.lastContentGen.getTime();
    if (contentAge < 2 * oneDayMs) {
      score += 5;
    } else if (contentAge < 7 * oneDayMs) {
      score += 3;
    } else if (contentAge < 14 * oneDayMs) {
      score += 1;
    }
  }
  weights += 10;

  // 7. Pipeline health (0-10 pts)
  //    Healthy ratio of pending proposals to published posts
  if (inputs.postsPublished > 0) {
    const pipelineRatio = inputs.pendingProposals / inputs.postsPublished;
    // Having some proposals queued is good (0.1-0.5 ratio), too many is bad
    if (pipelineRatio >= 0.1 && pipelineRatio <= 0.5) {
      score += 10;
    } else if (pipelineRatio > 0 && pipelineRatio < 0.1) {
      score += 5; // too few proposals in pipeline
    } else if (pipelineRatio > 0.5 && pipelineRatio <= 1) {
      score += 7;
    } else if (pipelineRatio > 1) {
      score += 3; // large backlog
    }
    // 0 proposals when there are posts = 0 pts (stale pipeline)
  }
  weights += 10;

  // Normalize to 0-100
  return weights > 0 ? Math.round((score / weights) * 100) : 0;
}
