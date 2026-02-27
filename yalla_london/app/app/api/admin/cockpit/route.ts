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

interface IndexingStatus {
  total: number;
  indexed: number;
  submitted: number;
  neverSubmitted: number;
  errors: number;
  rate: number;
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
}

interface RevenueSnapshot {
  affiliateClicksToday: number;
  affiliateClicksWeek: number;
  conversionsWeek: number;
  revenueWeekUsd: number;
  topPartner: string | null;
  aiCostWeekUsd: number;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Compute hours between a past date and now. */
function hoursAgo(date: Date): number {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60);
}

// ─────────────────────────────────────────────
// GET handler
// ─────────────────────────────────────────────

export const GET = withAdminAuth(async (request: NextRequest) => {
  const { prisma } = await import("@/lib/db");

  // ── 1. DB latency check ───────────────────────────────
  const dbResult: SystemStatus["db"] = { connected: false, latencyMs: 0, error: null };
  let dbOk = false;

  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbResult.latencyMs = Date.now() - t0;
    dbResult.connected = true;
    dbOk = true;
  } catch (err) {
    dbResult.error = err instanceof Error ? err.message : String(err);
    console.warn("[cockpit] DB connectivity check failed:", dbResult.error);
  }

  // ── 2. AI providers ───────────────────────────────────
  const activeProviders: string[] = [];
  const xaiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const googleKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;

  if (xaiKey) activeProviders.push("grok");
  if (anthropicKey) activeProviders.push("claude");
  if (openaiKey) activeProviders.push("openai");
  if (googleKey) activeProviders.push("gemini");

  const aiStatus: SystemStatus["ai"] = {
    configured: activeProviders.length > 0,
    provider: activeProviders[0] ?? null,
    activeProviders,
  };

  // ── 3. IndexNow / GSC / CRON ─────────────────────────
  const indexNowStatus = { configured: !!process.env.INDEXNOW_KEY };
  const gscStatus = {
    configured: !!(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GSC_CREDENTIALS),
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

  // ── 5. Pipeline ───────────────────────────────────────
  const pipeline = await buildPipeline(prisma, activeSiteIds);

  // ── 6. Indexing ───────────────────────────────────────
  const indexing = await buildIndexing(prisma, activeSiteIds);

  // ── 7. Cron health ────────────────────────────────────
  const cronHealth = await buildCronHealth(prisma);

  // ── 8. Per-site summaries ─────────────────────────────
  const sites = await buildSites(prisma, allSiteIds);

  // ── 9. Revenue snapshot ─────────────────────────────
  const revenue = await buildRevenue(prisma, activeSiteIds);

  // ── 10. Alerts ────────────────────────────────────────
  const alerts = computeAlerts({
    system,
    pipeline,
    indexing,
    cronHealth,
    sites,
  });

  return NextResponse.json({
    system,
    pipeline,
    indexing,
    cronHealth,
    revenue,
    alerts,
    sites,
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────
// Pipeline builder
// ─────────────────────────────────────────────

async function buildPipeline(prisma: any, activeSiteIds: string[]): Promise<PipelineStatus> {
  const pipeline = emptyPipeline();

  try {
    // Topics
    const topicsReady = await prisma.topicProposal.count({
      where: {
        status: { in: ["ready", "planned"] },
        ...(activeSiteIds.length ? { site_id: { in: activeSiteIds } } : {}),
      },
    });
    const topicsTotal = await prisma.topicProposal.count({
      where: activeSiteIds.length ? { site_id: { in: activeSiteIds } } : {},
    });

    pipeline.topicsReady = topicsReady;
    pipeline.topicsTotal = topicsTotal;

    // Drafts by phase
    const ACTIVE_PHASES = ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"] as const;
    const TERMINAL_PHASES = ["reservoir", "published", "rejected"];

    const draftGroups = await prisma.articleDraft.groupBy({
      by: ["current_phase"],
      _count: { id: true },
      where: activeSiteIds.length ? { site_id: { in: activeSiteIds } } : {},
    });

    let draftsActive = 0;
    let reservoir = 0;

    for (const group of draftGroups) {
      const phase = group.current_phase as string;
      const count = group._count.id;

      if (ACTIVE_PHASES.includes(phase as (typeof ACTIVE_PHASES)[number])) {
        draftsActive += count;
        const key = phase as keyof typeof pipeline.byPhase;
        if (key in pipeline.byPhase) {
          pipeline.byPhase[key as keyof typeof pipeline.byPhase] = count;
        }
      } else if (phase === "reservoir") {
        reservoir += count;
        pipeline.byPhase.reservoir = count;
      }
    }

    pipeline.draftsActive = draftsActive;
    pipeline.reservoir = reservoir;

    // Published today
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    pipeline.publishedToday = await prisma.blogPost.count({
      where: {
        published: true,
        created_at: { gte: todayStart },
        deletedAt: null,
        ...(activeSiteIds.length ? { siteId: { in: activeSiteIds } } : {}),
      },
    });

    pipeline.publishedTotal = await prisma.blogPost.count({
      where: {
        published: true,
        deletedAt: null,
        ...(activeSiteIds.length ? { siteId: { in: activeSiteIds } } : {}),
      },
    });

    // Stuck drafts: active phase, no update in > 3 hours, limit 5
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const stuckRaw = await prisma.articleDraft.findMany({
      where: {
        current_phase: { notIn: TERMINAL_PHASES },
        updated_at: { lt: threeHoursAgo },
        ...(activeSiteIds.length ? { site_id: { in: activeSiteIds } } : {}),
      },
      orderBy: { updated_at: "asc" },
      take: 5,
      select: {
        id: true,
        keyword: true,
        current_phase: true,
        updated_at: true,
        last_error: true,
      },
    });

    pipeline.stuckDrafts = stuckRaw.map((d) => {
      const hours = Math.round(hoursAgo(d.updated_at) * 10) / 10;
      const interpreted = interpretError(d.last_error);
      return {
        id: d.id,
        keyword: d.keyword,
        phase: d.current_phase,
        hoursStuck: hours,
        lastError: d.last_error ?? null,
        plainError: interpreted.plain,
      };
    });
  } catch (err) {
    console.warn("[cockpit] pipeline query failed:", err instanceof Error ? err.message : err);
  }

  return pipeline;
}

// ─────────────────────────────────────────────
// Indexing builder
// ─────────────────────────────────────────────

async function buildIndexing(prisma: any, activeSiteIds: string[]): Promise<IndexingStatus> {
  const indexing = emptyIndexing();

  try {
    const groups = await prisma.uRLIndexingStatus.groupBy({
      by: ["status"],
      _count: { id: true },
      where: activeSiteIds.length ? { site_id: { in: activeSiteIds } } : {},
    });

    let total = 0;
    let indexed = 0;
    let submitted = 0;
    let errors = 0;

    for (const g of groups) {
      const count = g._count.id;
      total += count;
      if (g.status === "indexed") indexed += count;
      else if (g.status === "submitted") submitted += count;
      else if (g.status === "error") errors += count;
    }

    const neverSubmitted = await prisma.uRLIndexingStatus.count({
      where: {
        submitted_indexnow: false,
        submitted_google_api: false,
        submitted_sitemap: false,
        ...(activeSiteIds.length ? { site_id: { in: activeSiteIds } } : {}),
      },
    });

    indexing.total = total;
    indexing.indexed = indexed;
    indexing.submitted = submitted;
    indexing.neverSubmitted = neverSubmitted;
    indexing.errors = errors;
    indexing.rate = total > 0 ? Math.round((indexed / total) * 100) : 0;
  } catch (err) {
    console.warn("[cockpit] indexing query failed:", err instanceof Error ? err.message : err);
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

    const [failedCount, timedOutCount, recentJobs] = await Promise.all([
      prisma.cronJobLog.count({
        where: { status: "failed", started_at: { gte: since24h } },
      }),
      prisma.cronJobLog.count({
        where: { timed_out: true, started_at: { gte: since24h } },
      }),
      prisma.cronJobLog.findMany({
        where: { started_at: { gte: since24h } },
        orderBy: { started_at: "desc" },
        take: 10,
        select: {
          job_name: true,
          status: true,
          duration_ms: true,
          started_at: true,
          error_message: true,
          items_processed: true,
        },
      }),
    ]);

    cronHealth.failedLast24h = failedCount;
    cronHealth.timedOutLast24h = timedOutCount;
    cronHealth.lastRunAt = recentJobs[0]?.started_at?.toISOString() ?? null;

    cronHealth.recentJobs = recentJobs.map((j) => {
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

  for (const siteId of activeSiteIds) {
    const siteConfig = SITES[siteId];
    if (!siteConfig) continue;

    try {
      const PIPELINE_PHASES = ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"];

      const [articleAgg, topicsQueued, indexingGroups, latestPost, reservoirCount, inPipelineCount] = await Promise.all([
        prisma.blogPost.aggregate({
          _count: { id: true },
          _avg: { seo_score: true },
          where: { siteId, published: true, deletedAt: null },
        }),
        prisma.topicProposal.count({
          where: {
            site_id: siteId,
            status: { in: ["ready", "planned", "proposed"] },
          },
        }),
        prisma.uRLIndexingStatus.groupBy({
          by: ["status"],
          _count: { id: true },
          where: { site_id: siteId },
        }),
        prisma.blogPost.findFirst({
          where: { siteId, published: true, deletedAt: null },
          orderBy: { created_at: "desc" },
          select: { created_at: true },
        }),
        prisma.articleDraft.count({
          where: { site_id: siteId, current_phase: "reservoir" },
        }),
        prisma.articleDraft.count({
          where: { site_id: siteId, current_phase: { in: PIPELINE_PHASES } },
        }),
      ]);

      let totalUrls = 0;
      let indexedUrls = 0;
      for (const g of indexingGroups) {
        totalUrls += g._count.id;
        if (g.status === "indexed") indexedUrls += g._count.id;
      }

      const published = articleAgg._count.id;

      results.push({
        id: siteId,
        name: siteConfig.name,
        domain: getSiteDomain(siteId),
        articlesTotal: published,
        articlesPublished: published,
        reservoir: reservoirCount,
        inPipeline: inPipelineCount,
        avgSeoScore: Math.round(articleAgg._avg.seo_score ?? 0),
        topicsQueued,
        indexRate: totalUrls > 0 ? Math.round((indexedUrls / totalUrls) * 100) : 0,
        lastPublishedAt: latestPost?.created_at?.toISOString() ?? null,
        lastCronAt: null, // CronJobLog has no siteId column — shown as N/A
        isActive: siteConfig.status === "active",
      });
    } catch (err) {
      console.warn(`[cockpit] site summary failed for ${siteId}:`, err instanceof Error ? err.message : err);
      results.push({
        id: siteId,
        name: siteConfig.name,
        domain: getSiteDomain(siteId),
        articlesTotal: 0,
        articlesPublished: 0,
        reservoir: 0,
        inPipeline: 0,
        avgSeoScore: 0,
        topicsQueued: 0,
        indexRate: 0,
        lastPublishedAt: null,
        lastCronAt: null,
        isActive: siteConfig.status === "active",
      });
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
  return { total: 0, indexed: 0, submitted: 0, neverSubmitted: 0, errors: 0, rate: 0 };
}

function emptyCronHealth(): CronHealth {
  return { failedLast24h: 0, timedOutLast24h: 0, lastRunAt: null, recentJobs: [] };
}

function emptyRevenue(): RevenueSnapshot {
  return { affiliateClicksToday: 0, affiliateClicksWeek: 0, conversionsWeek: 0, revenueWeekUsd: 0, topPartner: null, aiCostWeekUsd: 0 };
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
    const siteFilter = { site_id: { in: activeSiteIds } };

    const [clicksToday, clicksWeek, conversions, topPartnerGroup, aiCosts] = await Promise.all([
      // Affiliate clicks today
      prisma.affiliateClick.count({
        where: { ...siteFilter, clicked_at: { gte: todayStart } },
      }).catch(() => 0),

      // Affiliate clicks this week
      prisma.affiliateClick.count({
        where: { ...siteFilter, clicked_at: { gte: weekAgo } },
      }).catch(() => 0),

      // Conversions this week (value in cents)
      prisma.conversion.aggregate({
        _count: { id: true },
        _sum: { commission: true },
        where: { ...siteFilter, converted_at: { gte: weekAgo } },
      }).catch(() => ({ _count: { id: 0 }, _sum: { commission: null } })),

      // Top partner by clicks this week
      prisma.affiliateClick.groupBy({
        by: ["partner_id"],
        _count: { id: true },
        where: { ...siteFilter, clicked_at: { gte: weekAgo } },
        orderBy: { _count: { id: "desc" } },
        take: 1,
      }).catch(() => []),

      // AI cost this week (from ApiUsageLog)
      prisma.apiUsageLog.aggregate({
        _sum: { estimatedCostUsd: true },
        where: { createdAt: { gte: weekAgo } },
      }).catch(() => ({ _sum: { estimatedCostUsd: null } })),
    ]);

    snapshot.affiliateClicksToday = clicksToday;
    snapshot.affiliateClicksWeek = clicksWeek;
    snapshot.conversionsWeek = conversions._count?.id ?? 0;
    snapshot.revenueWeekUsd = Math.round((conversions._sum?.commission ?? 0)) / 100; // cents → dollars
    snapshot.topPartner = topPartnerGroup[0]?.partner_id ?? null;
    snapshot.aiCostWeekUsd = Math.round((aiCosts._sum?.estimatedCostUsd ?? 0) * 100) / 100;
  } catch (err) {
    console.warn("[cockpit] revenue snapshot failed:", err instanceof Error ? err.message : err);
  }

  return snapshot;
}

