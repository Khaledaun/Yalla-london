/**
 * Admin Cockpit API — Mission Control
 *
 * Single GET endpoint that returns all critical platform health data in one call.
 * Designed for the Yalla London admin dashboard: fast (<2s), gracefully degrades
 * when DB is down, and surfaces plain-English errors so Khaled can act from his iPhone.
 *
 * Response covers:
 *  - System connectivity (DB, AI providers, IndexNow, GSC, CRON_SECRET)
 *  - Pipeline snapshot (topics → drafts → reservoir → published)
 *  - Indexing stats (URLIndexingStatus aggregate)
 *  - Cron health (last 24h failures / timeouts, last 10 jobs)
 *  - Computed alerts with severity + fix instructions
 *  - Per-site summary row for every active site
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import {
  SITES,
  getActiveSiteIds,
  getSiteDomain,
} from "@/config/sites";
import { interpretError } from "@/lib/error-interpreter";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface SystemStatus {
  db: { connected: boolean; latencyMs: number; error: string | null };
  ai: { configured: boolean; provider: string | null; activeProviders: string[] };
  indexNow: { configured: boolean };
  gsc: { configured: boolean };
  cronSecret: { configured: boolean };
  nextAuthSecret: { configured: boolean };
  email: { configured: boolean; provider: string | null };
}

interface PipelineStatus {
  topicsReady: number;
  topicsTotal: number;
  draftsActive: number;
  reservoir: number;
  publishedToday: number;
  publishedTotal: number;
  byPhase: {
    research: number;
    outline: number;
    drafting: number;
    assembly: number;
    images: number;
    seo: number;
    scoring: number;
    reservoir: number;
  };
  stuckDrafts: Array<{
    id: string;
    keyword: string;
    phase: string;
    hoursStuck: number;
    lastError: string | null;
    plainError: string;
  }>;
}

// IndexingStatus is now derived from the shared indexing-summary utility.
// Import type from there to ensure both cockpit and content-indexing use the same shape.
interface IndexingStatus {
  total: number;
  indexed: number;
  submitted: number;
  discovered: number;
  neverSubmitted: number;
  errors: number;
  rate: number;
  staleCount: number;
  orphanedCount: number;
  deindexedCount: number;
  velocity7d: number;
  avgTimeToIndexDays: number | null;
  topBlocker: string | null;
  blockers: Array<{ reason: string; count: number; severity: "critical" | "warning" | "info" }>;
  lastSubmissionAge: string | null;
  lastVerificationAge: string | null;
  channelBreakdown: { indexnow: number; sitemap: number; googleApi: number };
  dailyQuotaRemaining: number | null;
  chronicFailures: number;
  velocity7dPrevious: number;
  // GSC Search Analytics totals (populated by gsc-sync cron)
  gscTotalClicks7d: number;
  gscTotalImpressions7d: number;
  gscClicksTrend: number | null;
  gscImpressionsTrend: number | null;
  lastGscSync: string | null;
  // Data source indicator so frontend can show "(approx)" when using fallback
  dataSource: "full" | "lightweight" | "lightweight+gsc" | "error";
  // Impression drop diagnostic (only populated when trend is negative)
  impressionDiagnostic: {
    gscDelayNote: string | null;
    blockedByGate: number;
    publishVelocity: { thisWeek: number; lastWeek: number };
    topDroppers: Array<{ url: string; impressionsDelta: number }>;
  } | null;
}

interface CronHealth {
  failedLast24h: number;
  timedOutLast24h: number;
  lastRunAt: string | null;
  recentJobs: Array<{
    name: string;
    status: string;
    durationMs: number | null;
    startedAt: string;
    error: string | null;
    plainError: string | null;
    itemsProcessed: number;
  }>;
}

interface Alert {
  severity: "critical" | "warning" | "info";
  code: string;
  message: string;
  detail: string;
  fix: string;
  action?: string;
}

interface SiteSummary {
  id: string;
  name: string;
  domain: string;
  articlesTotal: number;
  articlesPublished: number;
  reservoir: number;
  inPipeline: number;
  avgSeoScore: number;
  topicsQueued: number;
  indexRate: number;
  lastPublishedAt: string | null;
  lastCronAt: string | null;
  isActive: boolean;
  dataError: string | null; // Non-null when DB query failed — show error instead of misleading zeros
}

interface RevenueSnapshot {
  affiliateClicksToday: number;
  affiliateClicksWeek: number;
  conversionsWeek: number;
  revenueWeekUsd: number;
  topPartner: string | null;
  aiCostWeekUsd: number;
}

interface TrafficSnapshot {
  sessions7d: number;
  users7d: number;
  pageViews7d: number;
  bounceRate: number;
  avgSessionDuration: number;
  topPages: Array<{ path: string; pageViews: number }>;
  topSources: Array<{ source: string; sessions: number }>;
  configured: boolean;
  fetchedAt: string | null;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Compute hours between a past date and now. */
function hoursAgo(date: Date): number {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60);
}

// ─────────────────────────────────────────────
// Response cache — prevents connection pool exhaustion from rapid refreshes.
// Auto-refresh (60s) + manual refresh can collide, causing the 2nd request
// to wait on pool_timeout (5s) then fail. A 30s cache guarantees only 1 DB
// round-trip per 30s, regardless of how many refreshes fire.
// ─────────────────────────────────────────────

interface CachedResponse {
  data: unknown;
  timestamp: number;
  siteKey: string;
}

const CACHE_TTL_MS = 120_000; // 120 seconds — reduced from 30s to ease Supabase Disk IO pressure
let responseCache: CachedResponse | null = null;

// ─────────────────────────────────────────────
// GET handler
// ─────────────────────────────────────────────

export const GET = withAdminAuth(async (request: NextRequest) => {
  // Check cache before hitting DB
  const requestedSiteParam = new URL(request.url).searchParams.get("siteId") || "all";
  if (
    responseCache &&
    responseCache.siteKey === requestedSiteParam &&
    Date.now() - responseCache.timestamp < CACHE_TTL_MS
  ) {
    return NextResponse.json({
      ...(responseCache.data as Record<string, unknown>),
      cached: true,
      cacheAge: Math.round((Date.now() - responseCache.timestamp) / 1000),
    });
  }

  const { prisma } = await import("@/lib/db");

  // ── 1. DB latency check ───────────────────────────────
  const dbResult: SystemStatus["db"] = { connected: false, latencyMs: 0, error: null };
  let dbOk = false;

  // Explicitly connect on every cold start — the lazy proxy triggers engine
  // init + query simultaneously, which races on Vercel serverless cold starts
  // and produces "Engine is not yet connected" errors.
  try {
    await prisma.$connect();
  } catch {
    // $connect may fail if already connected (safe to ignore)
  }

  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbResult.latencyMs = Date.now() - t0;
    dbResult.connected = true;
    dbOk = true;
  } catch (firstErr) {
    // Retry once after small delay — PgBouncer slot may have freed
    try {
      await new Promise((r) => setTimeout(r, 1000));
      await prisma.$connect();
      const t0 = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbResult.latencyMs = Date.now() - t0;
      dbResult.connected = true;
      dbOk = true;
    } catch (retryErr) {
      dbResult.error = retryErr instanceof Error ? retryErr.message : String(retryErr);
      console.warn("[cockpit] DB connectivity check failed after retry:", dbResult.error);
    }
  }

  // ── 2. AI providers ───────────────────────────────────
  const activeProviders: string[] = [];
  const xaiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const googleKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  const perplexityKey = process.env.PERPLEXITY_API_KEY || process.env.PPLX_API_KEY;

  if (xaiKey) activeProviders.push("grok");
  if (anthropicKey) activeProviders.push("claude");
  if (openaiKey) activeProviders.push("openai");
  if (googleKey) activeProviders.push("gemini");
  if (perplexityKey) activeProviders.push("perplexity");

  const aiStatus: SystemStatus["ai"] = {
    configured: activeProviders.length > 0,
    provider: activeProviders[0] ?? null,
    activeProviders,
  };

  // ── 3. IndexNow / GSC / CRON ─────────────────────────
  const indexNowStatus = { configured: !!process.env.INDEXNOW_KEY };
  const gscStatus = {
    configured: !!(
      process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ||
      process.env.GSC_CLIENT_EMAIL
    ),
  };
  const cronSecretStatus = { configured: !!process.env.CRON_SECRET };
  const nextAuthSecretStatus = { configured: !!process.env.NEXTAUTH_SECRET };

  const emailProvider = process.env.RESEND_API_KEY ? "resend"
    : process.env.SENDGRID_API_KEY ? "sendgrid"
    : (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) ? "smtp"
    : null;
  const emailStatus = { configured: !!emailProvider, provider: emailProvider };

  const system: SystemStatus = {
    db: dbResult,
    ai: aiStatus,
    indexNow: indexNowStatus,
    gsc: gscStatus,
    cronSecret: cronSecretStatus,
    nextAuthSecret: nextAuthSecretStatus,
    email: emailStatus,
  };

  // ── Early exit if DB is down ──────────────────────────
  if (!dbOk) {
    const alerts: Alert[] = [
      {
        severity: "critical",
        code: "DB_DOWN",
        message: "Database is unreachable",
        detail: dbResult.error ?? "Connection failed",
        fix: "Check Supabase project status at supabase.com/dashboard",
      },
    ];

    return NextResponse.json({
      system,
      pipeline: emptyPipeline(),
      indexing: emptyIndexing(),
      cronHealth: emptyCronHealth(),
      revenue: emptyRevenue(),
      traffic: emptyTraffic(),
      alerts,
      sites: [],
      timestamp: new Date().toISOString(),
    });
  }

  // ── 4. Site scoping ──────────────────────────────────
  const allSiteIds = getActiveSiteIds();
  const requestedSiteId = new URL(request.url).searchParams.get("siteId");
  const activeSiteIds = requestedSiteId && requestedSiteId !== "all"
    ? allSiteIds.filter((id) => id === requestedSiteId)
    : allSiteIds;

  // ── 5-9. Run builders sequentially with GLOBAL budget guard ──
  // Vercel Pro = 60s max. Auth + overhead ≈ 5s. Global budget = 50s.
  // Each builder gets min(8s, remaining budget). If one builder is slow,
  // later builders get less time but the total NEVER exceeds Vercel's limit.
  // buildTraffic (GA4 API, no DB) runs in parallel with the first DB builder.
  const GLOBAL_BUDGET_MS = 50_000;
  const MAX_PER_BUILDER_MS = 8_000;
  const globalStart = Date.now();

  // Track which builders failed so we can tell Khaled what's wrong
  const builderErrors: string[] = [];

  function remainingBudget(): number {
    return Math.max(0, GLOBAL_BUDGET_MS - (Date.now() - globalStart));
  }

  async function withErrorTracking<T>(promise: Promise<T>, fallback: T, label: string): Promise<T> {
    const budget = remainingBudget();
    if (budget < 1_000) {
      // Less than 1s left — skip this builder entirely
      builderErrors.push(`${label}: skipped (budget exhausted)`);
      return fallback;
    }
    const ms = Math.min(MAX_PER_BUILDER_MS, budget);
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
        ),
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[cockpit] ${label} failed: ${msg}`);
      builderErrors.push(`${label}: ${msg.substring(0, 100)}`);
      return fallback;
    }
  }

  // Serialize DB builders to prevent connection pool exhaustion on Supabase.
  // buildTraffic (GA4 API — no DB) runs in parallel with the first DB builder.
  const trafficPromise = withErrorTracking(buildTraffic(), emptyTraffic(), "buildTraffic");
  const pipeline = await withErrorTracking(buildPipeline(prisma, activeSiteIds), emptyPipeline(), "buildPipeline");
  const indexing = await withErrorTracking(buildIndexing(prisma, activeSiteIds), emptyIndexing(), "buildIndexing");
  const cronHealth = await withErrorTracking(buildCronHealth(prisma), emptyCronHealth(), "buildCronHealth");
  const sites = await withErrorTracking(buildSites(prisma, allSiteIds), [], "buildSites");
  const revenue = await withErrorTracking(buildRevenue(prisma, activeSiteIds), emptyRevenue(), "buildRevenue");
  const traffic = await trafficPromise;

  // ── 10. Alerts ────────────────────────────────────────
  const alerts = computeAlerts({
    system,
    pipeline,
    indexing,
    cronHealth,
    sites,
  });

  // Surface SEO standards staleness as a warning alert
  try {
    const { checkStandardsStaleness } = await import("@/lib/seo/standards");
    const staleness = checkStandardsStaleness();
    if (staleness.stale) {
      alerts.push({
        severity: "warning",
        code: "SEO_STANDARDS_STALE",
        message: `SEO standards are ${staleness.daysSinceUpdate} days old`,
        detail: staleness.message,
        fix: "Ask Claude to update lib/seo/standards.ts by checking Google Search Central changelog.",
      });
    }
  } catch {
    // Non-fatal — standards module may not exist
  }

  // Surface builder errors as a critical alert so Khaled sees them on his phone
  if (builderErrors.length > 0) {
    alerts.unshift({
      severity: "critical",
      code: "DATA_LOAD_PARTIAL",
      message: `${builderErrors.length} dashboard section(s) failed to load`,
      detail: builderErrors.join(" | "),
      fix: "This usually means the database connection pool is overloaded. Wait 30 seconds and refresh. If it persists, check Supabase dashboard for connection pool status.",
    });
  }

  // GA4 traffic alerts
  if (traffic.configured && traffic.sessions7d === 0) {
    alerts.push({
      severity: "warning",
      code: "GA4_ZERO_SESSIONS",
      message: "GA4 configured but reporting 0 sessions",
      detail: "Google Analytics credentials are set but no traffic data was returned for the last 7 days. This could be a data delay (GA4 takes 24-48h) or a configuration issue.",
      fix: "Check GA4 property ID matches your live site. Verify the service account has Viewer access. Wait 48h after initial setup.",
    });
  } else if (!traffic.configured) {
    alerts.push({
      severity: "info",
      code: "GA4_NOT_CONFIGURED",
      message: "GA4 not configured — no traffic data",
      detail: "Add GA4_PROPERTY_ID and service account credentials to see website traffic on the dashboard.",
      fix: "Add GA4_PROPERTY_ID, GOOGLE_ANALYTICS_CLIENT_EMAIL, and GOOGLE_ANALYTICS_PRIVATE_KEY to Vercel environment variables.",
    });
  }

  const responseBody = {
    system,
    pipeline,
    indexing,
    cronHealth,
    revenue,
    traffic,
    alerts,
    sites,
    builderErrors: builderErrors.length > 0 ? builderErrors : undefined,
    timestamp: new Date().toISOString(),
  };

  // Cache the response to prevent pool exhaustion on rapid refreshes
  if (builderErrors.length === 0) {
    responseCache = {
      data: responseBody,
      timestamp: Date.now(),
      siteKey: requestedSiteParam,
    };
  }

  return NextResponse.json(responseBody);
});

// ─────────────────────────────────────────────
// Pipeline builder
// ─────────────────────────────────────────────

async function buildPipeline(prisma: any, activeSiteIds: string[]): Promise<PipelineStatus> {
  const pipeline = emptyPipeline();

  try {
    const siteFilter = activeSiteIds.length
      ? `AND site_id IN (${activeSiteIds.map((_, i) => `$${i + 1}`).join(",")})`
      : "";
    const siteFilterBP = activeSiteIds.length
      ? `AND "siteId" IN (${activeSiteIds.map((_, i) => `$${i + 1}`).join(",")})`
      : "";
    const params = activeSiteIds.length ? activeSiteIds : [];

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

    // Single raw SQL query replacing 6 separate Prisma calls:
    // topics ready, topics total, drafts by phase, published today, published total
    const paramsWithDates = [...params, todayStart];
    const dateIdx = params.length + 1;

    const combinedResult = await prisma.$queryRawUnsafe(`
      SELECT
        (SELECT COUNT(*) FROM "TopicProposal" WHERE status IN ('ready','planned') ${siteFilter})::int AS topics_ready,
        (SELECT COUNT(*) FROM "TopicProposal" WHERE 1=1 ${siteFilter})::int AS topics_total,
        (SELECT COUNT(*) FROM "BlogPost" WHERE published = true AND "deletedAt" IS NULL AND created_at >= $${dateIdx} ${siteFilterBP})::int AS published_today,
        (SELECT COUNT(*) FROM "BlogPost" WHERE published = true AND "deletedAt" IS NULL ${siteFilterBP})::int AS published_total
    `, ...paramsWithDates) as Array<{
      topics_ready: number;
      topics_total: number;
      published_today: number;
      published_total: number;
    }>;

    const r = combinedResult[0];
    pipeline.topicsReady = r.topics_ready;
    pipeline.topicsTotal = r.topics_total;
    pipeline.publishedToday = r.published_today;
    pipeline.publishedTotal = r.published_total;

    // Draft phase distribution — single groupBy (fast)
    const draftGroups = await prisma.articleDraft.groupBy({
      by: ["current_phase"],
      _count: { id: true },
      where: activeSiteIds.length ? { site_id: { in: activeSiteIds } } : {},
    });

    const ACTIVE_PHASES = ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"] as const;
    let draftsActive = 0;

    for (const group of draftGroups) {
      const phase = group.current_phase as string;
      const count = group._count.id;
      if (ACTIVE_PHASES.includes(phase as (typeof ACTIVE_PHASES)[number])) {
        draftsActive += count;
        if (phase in pipeline.byPhase) {
          pipeline.byPhase[phase as keyof typeof pipeline.byPhase] = count;
        }
      } else if (phase === "reservoir") {
        pipeline.reservoir = count;
        pipeline.byPhase.reservoir = count;
      }
    }
    pipeline.draftsActive = draftsActive;

    // Stuck drafts — single query, limit 5
    const stuckRaw = await prisma.articleDraft.findMany({
      where: {
        current_phase: { notIn: ["reservoir", "published", "rejected"] },
        updated_at: { lt: threeHoursAgo },
        ...(activeSiteIds.length ? { site_id: { in: activeSiteIds } } : {}),
      },
      orderBy: { updated_at: "asc" },
      take: 5,
      select: { id: true, keyword: true, current_phase: true, updated_at: true, last_error: true },
    });

    pipeline.stuckDrafts = stuckRaw.map((d: any) => ({
      id: d.id,
      keyword: d.keyword,
      phase: d.current_phase,
      hoursStuck: Math.round(hoursAgo(d.updated_at) * 10) / 10,
      lastError: d.last_error ?? null,
      plainError: interpretError(d.last_error).plain,
    }));
  } catch (err) {
    console.warn("[cockpit] pipeline query failed:", err instanceof Error ? err.message : err);
  }

  return pipeline;
}

// ─────────────────────────────────────────────
// Indexing builder — LIGHTWEIGHT version for cockpit.
// getIndexingSummary() runs 23+ DB operations and routinely times out (15s+).
// The cockpit only needs aggregate counts, so we query URLIndexingStatus directly
// with a single groupBy — ~200ms instead of 15s.
//
// Status mapping uses resolveStatus() from indexing-summary.ts (single source of truth)
// applied to each group's status value, ensuring cockpit and content-indexing agree.
// ─────────────────────────────────────────────

async function buildIndexing(prisma: any, activeSiteIds: string[]): Promise<IndexingStatus> {
  const indexing = emptyIndexing();

  const targetSiteId = activeSiteIds[0];
  if (!targetSiteId) return indexing;

  try {
    const { resolveStatus } = await import("@/lib/seo/indexing-summary");
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Single raw SQL combining: indexing status groups, GSC distinct count,
    // published count, velocity, and GSC trend — replaces 11 separate queries
    const combined = await prisma.$queryRawUnsafe(`
      SELECT
        (SELECT json_agg(row_to_json(g)) FROM (
          SELECT status, COUNT(*)::int AS cnt FROM "URLIndexingStatus" WHERE site_id = $1 GROUP BY status
        ) g) AS status_groups,
        (SELECT COUNT(DISTINCT url)::int FROM "GscPagePerformance" WHERE site_id = $1 AND impressions > 0) AS gsc_indexed,
        (SELECT COUNT(*)::int FROM "BlogPost" WHERE "siteId" = $1 AND published = true AND "deletedAt" IS NULL) AS published_count,
        (SELECT COUNT(*)::int FROM "URLIndexingStatus" WHERE site_id = $1 AND status IN ('indexed','verified') AND last_inspected_at >= $2) AS velocity_7d,
        (SELECT COALESCE(SUM(clicks),0)::int FROM "GscPagePerformance" WHERE site_id = $1 AND date = (
          SELECT MAX(date) FROM "GscPagePerformance" WHERE site_id = $1 AND date >= $2
        )) AS gsc_clicks_current,
        (SELECT COALESCE(SUM(impressions),0)::int FROM "GscPagePerformance" WHERE site_id = $1 AND date = (
          SELECT MAX(date) FROM "GscPagePerformance" WHERE site_id = $1 AND date >= $2
        )) AS gsc_impressions_current,
        (SELECT COALESCE(SUM(clicks),0)::int FROM "GscPagePerformance" WHERE site_id = $1 AND date = (
          SELECT MAX(date) FROM "GscPagePerformance" WHERE site_id = $1 AND date < $2
        )) AS gsc_clicks_previous,
        (SELECT COALESCE(SUM(impressions),0)::int FROM "GscPagePerformance" WHERE site_id = $1 AND date = (
          SELECT MAX(date) FROM "GscPagePerformance" WHERE site_id = $1 AND date < $2
        )) AS gsc_impressions_previous,
        (SELECT MAX(started_at) FROM "CronJobLog" WHERE job_name = 'gsc-sync' AND status = 'completed') AS last_gsc_sync
    `, targetSiteId, sevenDaysAgo) as any[];

    const r = combined[0] || {};
    const statusGroups: Array<{ status: string; cnt: number }> = r.status_groups || [];

    let total = 0;
    for (const group of statusGroups) {
      const count = group.cnt;
      total += count;
      const resolved = resolveStatus({ status: group.status || "", indexing_state: null });
      if (resolved === "indexed") indexing.indexed += count;
      else if (resolved === "submitted") indexing.submitted += count;
      else if (resolved === "discovered") indexing.discovered += count;
      else if (resolved === "error") indexing.errors += count;
      else if (resolved === "deindexed") indexing.deindexedCount += count;
      else if (resolved === "chronic_failure") { indexing.chronicFailures += count; indexing.errors += count; }
      else if (resolved === "never_submitted") indexing.neverSubmitted += count;
      else indexing.discovered += count;
    }

    // GSC reconciliation
    const gscIndexedCount = Number(r.gsc_indexed ?? 0);
    const promotable = Math.max(0, gscIndexedCount - indexing.indexed);
    if (promotable > 0) {
      const fromSubmitted = Math.min(promotable, indexing.submitted);
      indexing.submitted -= fromSubmitted;
      indexing.indexed += fromSubmitted;
      const remaining = promotable - fromSubmitted;
      if (remaining > 0) {
        const fromDiscovered = Math.min(remaining, indexing.discovered);
        indexing.discovered -= fromDiscovered;
        indexing.indexed += fromDiscovered;
      }
    }

    // Published baseline
    const publishedCount = Number(r.published_count ?? 0);
    indexing.total = publishedCount > 0 ? publishedCount : total;
    if (publishedCount > total) {
      indexing.neverSubmitted = publishedCount - total;
    }
    indexing.rate = indexing.total > 0 ? Math.min(100, Math.round((indexing.indexed / indexing.total) * 100)) : 0;
    indexing.velocity7d = Number(r.velocity_7d ?? 0);

    // GSC trend — computed from the single query results above
    const curClicks = Number(r.gsc_clicks_current ?? 0);
    const prevClicks = Number(r.gsc_clicks_previous ?? 0);
    const curImpressions = Number(r.gsc_impressions_current ?? 0);
    const prevImpressions = Number(r.gsc_impressions_previous ?? 0);
    indexing.gscTotalClicks7d = curClicks;
    indexing.gscTotalImpressions7d = curImpressions;
    indexing.gscClicksTrend = prevClicks > 0 ? Math.round(((curClicks - prevClicks) / prevClicks) * 100) : null;
    indexing.gscImpressionsTrend = prevImpressions > 0 ? Math.round(((curImpressions - prevImpressions) / prevImpressions) * 100) : null;

    if (r.last_gsc_sync) {
      indexing.lastGscSync = `${Math.round((Date.now() - new Date(r.last_gsc_sync).getTime()) / 3600000)}h ago`;
    }

    indexing.dataSource = "lightweight+gsc";
  } catch (summaryErr) {
    console.warn("[cockpit] indexing query failed:", summaryErr instanceof Error ? summaryErr.message : summaryErr);
    indexing.dataSource = "error";
  }

  return indexing;
}

// ─────────────────────────────────────────────
// Cron health builder
// ─────────────────────────────────────────────

async function buildCronHealth(prisma: any): Promise<CronHealth> {
  const cronHealth = emptyCronHealth();

  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Single query: recent jobs (contains enough data to derive counts)
    const recentJobs = await prisma.cronJobLog.findMany({
      where: { started_at: { gte: since24h } },
      orderBy: { started_at: "desc" },
      take: 50, // Get more so we can count failures accurately
      select: {
        job_name: true,
        status: true,
        duration_ms: true,
        started_at: true,
        error_message: true,
        items_processed: true,
        timed_out: true,
      },
    });

    // Derive counts from the result set instead of 2 extra queries
    cronHealth.failedLast24h = recentJobs.filter((j: any) => j.status === "failed").length;
    cronHealth.timedOutLast24h = recentJobs.filter((j: any) => j.timed_out === true).length;
    cronHealth.lastRunAt = recentJobs[0]?.started_at?.toISOString() ?? null;

    cronHealth.recentJobs = recentJobs.slice(0, 10).map((j: any) => {
      const interpreted = j.error_message ? interpretError(j.error_message) : null;
      return {
        name: j.job_name,
        status: j.status,
        durationMs: j.duration_ms ?? null,
        startedAt: j.started_at.toISOString(),
        error: j.error_message ?? null,
        plainError: interpreted?.plain ?? null,
        itemsProcessed: j.items_processed,
      };
    });
  } catch (err) {
    console.warn("[cockpit] cron health query failed:", err instanceof Error ? err.message : err);
  }

  return cronHealth;
}

// ─────────────────────────────────────────────
// Per-site summaries
// ─────────────────────────────────────────────

async function buildSites(prisma: any, activeSiteIds: string[]): Promise<SiteSummary[]> {
  const results: SiteSummary[] = [];

  // Single raw SQL for ALL sites — replaces 5 queries × N sites
  try {
    const siteList = activeSiteIds.map((_, i) => `$${i + 1}`).join(",");
    if (!siteList) return results;

    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        s.site_id,
        COALESCE(bp.published_count, 0)::int AS published_count,
        COALESCE(bp.avg_seo, 0)::int AS avg_seo,
        bp.last_published_at,
        COALESCE(tp.topics_queued, 0)::int AS topics_queued,
        COALESCE(ad.reservoir_count, 0)::int AS reservoir_count,
        COALESCE(ad.pipeline_count, 0)::int AS pipeline_count,
        COALESCE(ix.indexed_count, 0)::int AS indexed_count
      FROM (SELECT unnest(ARRAY[${siteList}]::text[]) AS site_id) s
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS published_count,
               COALESCE(AVG(seo_score), 0)::int AS avg_seo,
               MAX(created_at) AS last_published_at
        FROM "BlogPost" WHERE "siteId" = s.site_id AND published = true AND "deletedAt" IS NULL
      ) bp ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS topics_queued
        FROM "TopicProposal" WHERE site_id = s.site_id AND status IN ('ready','planned','proposed')
      ) tp ON true
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (WHERE current_phase = 'reservoir')::int AS reservoir_count,
          COUNT(*) FILTER (WHERE current_phase IN ('research','outline','drafting','assembly','images','seo','scoring'))::int AS pipeline_count
        FROM "article_drafts" WHERE site_id = s.site_id
      ) ad ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS indexed_count
        FROM "URLIndexingStatus" WHERE site_id = s.site_id AND status = 'indexed'
      ) ix ON true
    `, ...activeSiteIds) as any[];

    for (const row of rows) {
      const siteId = row.site_id;
      const siteConfig = SITES[siteId];
      if (!siteConfig) continue;

      const published = row.published_count;
      const denominator = published > 0 ? published : 1;
      const indexRate = Math.min(100, Math.round((row.indexed_count / denominator) * 100));

      results.push({
        id: siteId,
        name: siteConfig.name,
        domain: getSiteDomain(siteId),
        articlesTotal: published,
        articlesPublished: published,
        reservoir: row.reservoir_count,
        inPipeline: row.pipeline_count,
        avgSeoScore: row.avg_seo,
        topicsQueued: row.topics_queued,
        indexRate,
        lastPublishedAt: row.last_published_at ? new Date(row.last_published_at).toISOString() : null,
        lastCronAt: null,
        isActive: siteConfig.status === "active",
        dataError: null,
      } as SiteSummary);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn("[cockpit] buildSites failed:", errMsg);
    // Return empty summaries for all sites
    for (const siteId of activeSiteIds) {
      const siteConfig = SITES[siteId];
      if (!siteConfig) continue;
      results.push({
        id: siteId,
        name: siteConfig.name,
        domain: getSiteDomain(siteId),
        articlesTotal: 0, articlesPublished: 0, reservoir: 0, inPipeline: 0,
        avgSeoScore: 0, topicsQueued: 0, indexRate: 0,
        lastPublishedAt: null, lastCronAt: null,
        isActive: siteConfig.status === "active",
        dataError: `Failed to load site data: ${errMsg.substring(0, 120)}`,
      } as SiteSummary);
    }
  }

  return results;
}

// ─────────────────────────────────────────────
// Alert computation
// ─────────────────────────────────────────────

function computeAlerts(ctx: {
  system: SystemStatus;
  pipeline: PipelineStatus;
  indexing: IndexingStatus;
  cronHealth: CronHealth;
  sites: SiteSummary[];
}): Alert[] {
  const alerts: Alert[] = [];
  const { system, pipeline, indexing, cronHealth } = ctx;

  if (!system.ai.configured) {
    alerts.push({
      severity: "critical",
      code: "NO_AI_KEY",
      message: "No AI provider configured",
      detail: "XAI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, and GOOGLE_AI_API_KEY are all missing.",
      fix: "Add at least one AI API key in Vercel → Settings → Environment Variables",
      action: "https://vercel.com/dashboard",
    });
  }

  if (pipeline.topicsReady === 0 && pipeline.topicsTotal === 0) {
    alerts.push({
      severity: "warning",
      code: "NO_TOPICS",
      message: "No topics in pipeline",
      detail: "The weekly-topics cron hasn't generated any topics yet, or all have been consumed.",
      fix: "Trigger 'Weekly Topics' from Cron Jobs to seed new topics immediately",
      action: "/api/cron/weekly-topics",
    });
  }

  if (pipeline.stuckDrafts.length > 0) {
    const names = pipeline.stuckDrafts.map((d) => d.keyword).join(", ");
    alerts.push({
      severity: "warning",
      code: "STUCK_DRAFTS",
      message: `${pipeline.stuckDrafts.length} draft(s) stuck in pipeline`,
      detail: `These drafts haven't progressed in over 3 hours: ${names}`,
      fix: "Trigger 'Content Builder' to resume processing, or re-queue individual drafts from the Content Matrix",
      action: "/api/cron/build-runner",
    });
  }

  if (pipeline.publishedToday === 0) {
    alerts.push({
      severity: "info",
      code: "NOTHING_PUBLISHED_TODAY",
      message: "No articles published today",
      detail:
        pipeline.reservoir > 0
          ? `${pipeline.reservoir} article(s) are ready in the reservoir — run the Content Selector to publish them.`
          : "Pipeline may be building articles now. Check the Content Matrix for active drafts.",
      fix:
        pipeline.reservoir > 0
          ? "Trigger 'Content Selector' to publish reservoir articles"
          : "Check pipeline status — drafts may be building",
      action: pipeline.reservoir > 0 ? "/api/cron/content-selector" : undefined,
    });
  }

  const failureRate =
    cronHealth.recentJobs.length > 0
      ? cronHealth.failedLast24h / cronHealth.recentJobs.length
      : 0;

  if (failureRate > 0.3 || cronHealth.failedLast24h >= 5) {
    alerts.push({
      severity: "critical",
      code: "HIGH_FAILURE_RATE",
      message: `High cron failure rate: ${cronHealth.failedLast24h} failures in last 24h`,
      detail: "Multiple automated jobs have failed. Content generation may be stalled.",
      fix: "Check Cron Job Logs for error details and fix the root cause",
      action: "/admin/cron-logs",
    });
  }

  if (!system.indexNow.configured) {
    alerts.push({
      severity: "warning",
      code: "INDEXNOW_MISSING",
      message: "IndexNow key not configured",
      detail: "INDEXNOW_KEY env var is missing. Articles will not be submitted to search engines automatically.",
      fix: "Register a free key at indexnow.org and add INDEXNOW_KEY to Vercel",
      action: "https://www.indexnow.org/register",
    });
  }

  if (pipeline.reservoir === 0 && pipeline.draftsActive === 0) {
    alerts.push({
      severity: "warning",
      code: "RESERVOIR_EMPTY",
      message: "Content reservoir is empty",
      detail: "No articles are ready to publish and none are being built.",
      fix: "Trigger 'Daily Content Generate' to start building new articles",
      action: "/api/cron/daily-content-generate",
    });
  }

  return alerts;
}

// ─────────────────────────────────────────────
// Empty-state factories (used when DB is down)
// ─────────────────────────────────────────────

function emptyPipeline(): PipelineStatus {
  return {
    topicsReady: 0,
    topicsTotal: 0,
    draftsActive: 0,
    reservoir: 0,
    publishedToday: 0,
    publishedTotal: 0,
    byPhase: {
      research: 0,
      outline: 0,
      drafting: 0,
      assembly: 0,
      images: 0,
      seo: 0,
      scoring: 0,
      reservoir: 0,
    },
    stuckDrafts: [],
  };
}

function emptyIndexing(): IndexingStatus {
  return {
    total: 0, indexed: 0, submitted: 0, discovered: 0, neverSubmitted: 0, errors: 0, rate: 0,
    staleCount: 0, orphanedCount: 0, deindexedCount: 0, velocity7d: 0,
    avgTimeToIndexDays: null, topBlocker: null, blockers: [],
    lastSubmissionAge: null, lastVerificationAge: null,
    channelBreakdown: { indexnow: 0, sitemap: 0, googleApi: 0 },
    dailyQuotaRemaining: null,
    chronicFailures: 0,
    velocity7dPrevious: 0,
    gscTotalClicks7d: 0,
    gscTotalImpressions7d: 0,
    gscClicksTrend: null,
    gscImpressionsTrend: null,
    lastGscSync: null,
    dataSource: "lightweight",
    impressionDiagnostic: null,
  };
}

function emptyCronHealth(): CronHealth {
  return { failedLast24h: 0, timedOutLast24h: 0, lastRunAt: null, recentJobs: [] };
}

function emptyRevenue(): RevenueSnapshot {
  return { affiliateClicksToday: 0, affiliateClicksWeek: 0, conversionsWeek: 0, revenueWeekUsd: 0, topPartner: null, aiCostWeekUsd: 0 };
}

function emptyTraffic(): TrafficSnapshot {
  return { sessions7d: 0, users7d: 0, pageViews7d: 0, bounceRate: 0, avgSessionDuration: 0, topPages: [], topSources: [], configured: false, fetchedAt: null };
}

// ─────────────────────────────────────────────
// Revenue snapshot
// ─────────────────────────────────────────────

async function buildRevenue(prisma: any, activeSiteIds: string[]): Promise<RevenueSnapshot> {
  const snapshot = emptyRevenue();

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Build dynamic site filter for raw SQL
    const siteParams = activeSiteIds.length ? activeSiteIds : [];
    const siteIn = siteParams.length
      ? `site_id IN (${siteParams.map((_, i) => `$${i + 3}`).join(",")})`
      : "1=1";
    // CJ tables use "siteId" (camelCase) and include NULL for legacy records
    const cjSiteIn = siteParams.length
      ? `("siteId" IN (${siteParams.map((_, i) => `$${i + 3}`).join(",")}) OR "siteId" IS NULL)`
      : "1=1";

    // Single raw SQL replacing 8 separate queries
    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        (SELECT COUNT(*)::int FROM "AffiliateClick" WHERE ${siteIn} AND clicked_at >= $1) AS clicks_today,
        (SELECT COUNT(*)::int FROM "AffiliateClick" WHERE ${siteIn} AND clicked_at >= $2) AS clicks_week,
        (SELECT COUNT(*)::int FROM "Conversion" WHERE ${siteIn} AND converted_at >= $2) AS conversions_week,
        (SELECT COALESCE(SUM(commission),0) FROM "Conversion" WHERE ${siteIn} AND converted_at >= $2) AS revenue_cents,
        (SELECT COALESCE(SUM("estimatedCostUsd"),0) FROM "ApiUsageLog" WHERE "createdAt" >= $2) AS ai_cost_week,
        (SELECT COUNT(*)::int FROM "CjClickEvent" WHERE ${cjSiteIn} AND "createdAt" >= $1) AS cj_clicks_today,
        (SELECT COUNT(*)::int FROM "CjClickEvent" WHERE ${cjSiteIn} AND "createdAt" >= $2) AS cj_clicks_week,
        (SELECT COUNT(*)::int FROM "CjCommission" WHERE ${cjSiteIn} AND "eventDate" >= $2) AS cj_conversions,
        (SELECT COALESCE(SUM("commissionAmount"),0) FROM "CjCommission" WHERE ${cjSiteIn} AND "eventDate" >= $2) AS cj_revenue
    `, todayStart, weekAgo, ...siteParams) as any[];

    const r = rows[0] || {};
    snapshot.affiliateClicksToday = Number(r.clicks_today ?? 0) + Number(r.cj_clicks_today ?? 0);
    snapshot.affiliateClicksWeek = Number(r.clicks_week ?? 0) + Number(r.cj_clicks_week ?? 0);
    snapshot.conversionsWeek = Number(r.conversions_week ?? 0) + Number(r.cj_conversions ?? 0);
    snapshot.revenueWeekUsd = Math.round(Number(r.revenue_cents ?? 0)) / 100
      + Math.round(Number(r.cj_revenue ?? 0) * 100) / 100;
    snapshot.aiCostWeekUsd = Math.round(Number(r.ai_cost_week ?? 0) * 100) / 100;
  } catch (err) {
    console.warn("[cockpit] revenue snapshot failed:", err instanceof Error ? err.message : err);
  }

  return snapshot;
}

// ─────────────────────────────────────────────
// Traffic snapshot (GA4 Data API)
// ─────────────────────────────────────────────

async function buildTraffic(): Promise<TrafficSnapshot> {
  const snapshot = emptyTraffic();

  try {
    const { fetchGA4Metrics, isGA4Configured } = await import("@/lib/seo/ga4-data-api");
    if (!isGA4Configured()) return snapshot;

    snapshot.configured = true;
    const report = await fetchGA4Metrics("7daysAgo", "today");
    if (!report) return snapshot;

    snapshot.sessions7d = report.metrics.sessions;
    snapshot.users7d = report.metrics.totalUsers;
    snapshot.pageViews7d = report.metrics.pageViews;
    snapshot.bounceRate = report.metrics.bounceRate;
    snapshot.avgSessionDuration = report.metrics.avgSessionDuration;
    snapshot.topPages = report.topPages.slice(0, 5).map((p) => ({ path: p.path, pageViews: p.pageViews }));
    snapshot.topSources = report.topSources.slice(0, 5);
    snapshot.fetchedAt = report.fetchedAt;
  } catch (err) {
    console.warn("[cockpit] traffic fetch failed:", err instanceof Error ? err.message : err);
  }

  return snapshot;
}
