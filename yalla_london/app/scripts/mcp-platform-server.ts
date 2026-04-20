#!/usr/bin/env npx tsx
/**
 * MCP Server: Platform Control
 *
 * Exposes all CEO-level platform operations as MCP tools so Claude Code
 * (via Dispatch, CLI, Desktop, or Web) can control the entire Yalla London
 * platform using personal subscription tokens — zero API cost.
 *
 * Usage: npx tsx scripts/mcp-platform-server.ts
 *
 * Required env vars:
 *   DATABASE_URL (or DIRECT_URL for Supabase)
 *
 * Optional env vars:
 *   CRON_SECRET — needed for write operations (run_cron, publish_ready, etc.)
 */

import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

// Load .env.local from the app directory (4 fallback paths)
const __script_dir = typeof __dirname !== "undefined"
  ? __dirname
  : resolve(fileURLToPath(import.meta.url), "..");
config({ path: resolve(__script_dir, "../.env.local") });
config({ path: resolve(__script_dir, "../.env") });
config({ path: resolve(process.cwd(), "yalla_london/app/.env.local") });
config({ path: resolve(process.cwd(), "yalla_london/app/.env") });

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDefaultSiteId(): string {
  return process.env.DEFAULT_SITE_ID || "yalla-london";
}

function getSiteDomain(siteId: string): string {
  const domains: Record<string, string> = {
    "yalla-london": "https://www.yalla-london.com",
    "arabaldives": "https://www.arabaldives.com",
    "french-riviera": "https://www.yallariviera.com",
    "istanbul": "https://www.yallaistanbul.com",
    "thailand": "https://www.yallathailand.com",
    "zenitha-yachts-med": "https://www.zenithayachts.com",
  };
  return domains[siteId] || domains["yalla-london"]!;
}

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function error(msg: string) {
  return {
    content: [{ type: "text" as const, text: `Error: ${msg}` }],
  };
}

async function callCron(path: string): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const domain = getSiteDomain(getDefaultSiteId());
  const secret = process.env.CRON_SECRET;
  try {
    const res = await fetch(`${domain}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-cron-secret": secret, Authorization: `Bearer ${secret}` } : {}),
      },
      signal: AbortSignal.timeout(55_000),
    });
    const text = await res.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = text; }
    return { ok: res.ok, data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// MCP Server Setup
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "platform-control",
  version: "1.0.0",
});

// ═══════════════════════════════════════════════════════════════════════════
// Tool 1: platform_status — One-tap dashboard overview
// ═══════════════════════════════════════════════════════════════════════════

server.tool(
  "platform_status",
  "Get a complete platform dashboard: pipeline health, articles today, cron status, indexing rate, AI costs, and alerts. Start here for any status check.",
  {
    siteId: z.string().optional().describe("Site ID (default: yalla-london)"),
  },
  async ({ siteId }) => {
    const site = siteId || getDefaultSiteId();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
      // Pipeline snapshot
      const [totalDrafts, phaseCounts, reservoirCount, publishedToday, publishedTotal] = await Promise.all([
        prisma.articleDraft.count({ where: { site_id: site } }),
        prisma.articleDraft.groupBy({
          by: ["current_phase"],
          where: { site_id: site, current_phase: { notIn: ["published", "rejected"] } },
          _count: true,
        }),
        prisma.articleDraft.count({ where: { site_id: site, current_phase: "reservoir" } }),
        prisma.blogPost.count({ where: { siteId: site, published: true, created_at: { gte: today } } }),
        prisma.blogPost.count({ where: { siteId: site, published: true } }),
      ]);

      // Cron health (last 24h)
      const recentCrons = await prisma.cronJobLog.findMany({
        where: { started_at: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
        orderBy: { started_at: "desc" },
        take: 100,
        select: { job_name: true, status: true, error_message: true, duration_ms: true, started_at: true },
      });
      const failedCrons = recentCrons.filter(c => c.status === "failed");

      // Indexing
      const [indexed, submitted, neverSubmitted] = await Promise.all([
        prisma.uRLIndexingStatus.count({ where: { site_id: site, status: "indexed" } }),
        prisma.uRLIndexingStatus.count({ where: { site_id: site, submitted_indexnow: true } }),
        prisma.uRLIndexingStatus.count({ where: { site_id: site, submitted_indexnow: false, submitted_google_api: false } }),
      ]);

      // AI costs (last 7 days)
      const aiCosts = await prisma.apiUsageLog.aggregate({
        where: { siteId: site, createdAt: { gte: weekAgo } },
        _sum: { estimatedCostUsd: true, totalTokens: true },
        _count: true,
      });

      // CEO Inbox alerts
      const alerts = await prisma.cronJobLog.count({
        where: { job_name: "ceo-inbox", started_at: { gte: today } },
      });

      // Topics available
      const topicsReady = await prisma.topicProposal.count({
        where: { site_id: site, status: { in: ["ready", "queued", "planned", "proposed"] } },
      });

      const phases = Object.fromEntries(phaseCounts.map(p => [p.current_phase, p._count]));

      return json({
        site,
        pipeline: {
          totalDrafts,
          activePipeline: phases,
          reservoir: reservoirCount,
          publishedToday,
          publishedTotal,
          topicsReady,
        },
        crons: {
          last24h: recentCrons.length,
          failed: failedCrons.length,
          failedJobs: failedCrons.slice(0, 5).map(c => ({
            job: c.job_name,
            error: c.error_message?.substring(0, 100),
            when: c.started_at,
          })),
        },
        indexing: { indexed, submitted, neverSubmitted },
        aiCosts7d: {
          totalUsd: aiCosts._sum.estimatedCostUsd || 0,
          totalTokens: aiCosts._sum.totalTokens || 0,
          calls: aiCosts._count,
        },
        alertsToday: alerts,
        timestamp: now.toISOString(),
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Tool 2: pipeline_health — Queue monitor snapshot
// ═══════════════════════════════════════════════════════════════════════════

server.tool(
  "pipeline_health",
  "Detailed pipeline health: phase distribution, stuck drafts, near-max-attempts, health grade. Use when pipeline seems slow or articles aren't publishing.",
  {
    siteId: z.string().optional().describe("Site ID (default: yalla-london)"),
  },
  async ({ siteId }) => {
    const site = siteId || getDefaultSiteId();
    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      const drafts = await prisma.articleDraft.findMany({
        where: { site_id: site, current_phase: { notIn: ["published", "rejected"] } },
        select: {
          id: true, keyword: true, current_phase: true, phase_attempts: true,
          last_error: true, updated_at: true, locale: true, word_count: true, seo_score: true,
        },
        orderBy: { updated_at: "desc" },
        take: 100,
      });

      const stuck24h = drafts.filter(d => d.updated_at < twentyFourHoursAgo);
      const stuckPipeline = drafts.filter(d => d.updated_at < fourHoursAgo && d.current_phase !== "reservoir");
      const nearMaxAttempts = drafts.filter(d => (d.phase_attempts || 0) >= 4);
      const phases = drafts.reduce((acc, d) => {
        acc[d.current_phase] = (acc[d.current_phase] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Health grade
      let grade = "A";
      if (stuck24h.length > 5 || nearMaxAttempts.length > 3) grade = "C";
      else if (stuck24h.length > 10 || nearMaxAttempts.length > 5) grade = "D";
      else if (stuckPipeline.length > 0 || nearMaxAttempts.length > 0) grade = "B";
      if (drafts.length === 0 && phases["reservoir"] === undefined) grade = "F";

      // Recent progress (published in last 24h)
      const recentPublished = await prisma.blogPost.count({
        where: { siteId: site, published: true, created_at: { gte: twentyFourHoursAgo } },
      });

      return json({
        healthGrade: grade,
        totalActive: drafts.length,
        phases,
        stuck24h: stuck24h.length,
        stuckItems: stuck24h.slice(0, 5).map(d => ({
          keyword: d.keyword, phase: d.current_phase, attempts: d.phase_attempts,
          error: d.last_error?.substring(0, 80), lastUpdate: d.updated_at,
        })),
        nearMaxAttempts: nearMaxAttempts.map(d => ({
          keyword: d.keyword, phase: d.current_phase, attempts: d.phase_attempts,
        })),
        publishedLast24h: recentPublished,
        recommendation: grade === "A" ? "Pipeline healthy — no action needed" :
          grade === "B" ? "Minor delays — monitor, likely self-healing" :
          grade === "C" ? "Multiple stuck items — consider running diagnose_pipeline" :
          grade === "D" ? "Pipeline degraded — run diagnose_pipeline now" :
          "Pipeline stalled — immediate attention needed",
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Tool 3: list_articles — Recent articles with status
// ═══════════════════════════════════════════════════════════════════════════

server.tool(
  "list_articles",
  "List recent articles with title, status, word count, SEO score. Filter by published/draft/all.",
  {
    siteId: z.string().optional().describe("Site ID (default: yalla-london)"),
    status: z.enum(["published", "draft", "all"]).optional().describe("Filter: published, draft, or all (default: all)"),
    limit: z.number().optional().describe("Max results (default: 20, max: 50)"),
  },
  async ({ siteId, status, limit }) => {
    const site = siteId || getDefaultSiteId();
    const take = Math.min(limit || 20, 50);

    try {
      const where: Record<string, unknown> = { siteId: site };
      if (status === "published") where.published = true;
      if (status === "draft") where.published = false;

      const articles = await prisma.blogPost.findMany({
        where,
        orderBy: { created_at: "desc" },
        take,
        select: {
          id: true, title_en: true, slug: true, published: true,
          seo_score: true, created_at: true, updated_at: true,
          meta_title_en: true, meta_description_en: true, siteId: true,
          source_pipeline: true, trace_id: true,
        },
      });

      // Get word counts from content length (approximate)
      const articlesWithCounts = await Promise.all(
        articles.map(async (a) => {
          const full = await prisma.blogPost.findUnique({
            where: { id: a.id },
            select: { content_en: true },
          });
          const wordCount = full?.content_en ? full.content_en.split(/\s+/).length : 0;
          return { ...a, wordCount };
        })
      );

      return json({
        site,
        count: articlesWithCounts.length,
        articles: articlesWithCounts.map(a => ({
          title: a.title_en,
          slug: a.slug,
          published: a.published,
          seoScore: a.seo_score,
          wordCount: a.wordCount,
          source: a.source_pipeline || "unknown",
          created: a.created_at,
          url: a.published ? `${getSiteDomain(site)}/blog/${a.slug}` : null,
        })),
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Tool 4: publish_ready — Trigger content-selector
// ═══════════════════════════════════════════════════════════════════════════

server.tool(
  "publish_ready",
  "Trigger the content-selector to publish top reservoir articles. Returns what was published.",
  {},
  async () => {
    try {
      const result = await callCron("/api/cron/content-selector");
      return json({
        action: "publish_ready",
        success: result.ok,
        result: result.data,
        error: result.error,
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Tool 5: run_cron — Trigger any whitelisted cron
// ═══════════════════════════════════════════════════════════════════════════

const SAFE_CRONS: Record<string, string> = {
  "content-selector": "/api/cron/content-selector",
  "content-builder": "/api/cron/content-builder",
  "content-builder-create": "/api/cron/content-builder-create",
  "seo-agent": "/api/cron/seo-agent",
  "seo-deep-review": "/api/cron/seo-deep-review",
  "weekly-topics": "/api/cron/weekly-topics",
  "content-auto-fix": "/api/cron/content-auto-fix",
  "content-auto-fix-lite": "/api/cron/content-auto-fix-lite",
  "diagnostic-sweep": "/api/cron/diagnostic-sweep",
  "sweeper": "/api/cron/sweeper",
  "affiliate-injection": "/api/cron/affiliate-injection",
  "sync-advertisers": "/api/cron/sync-advertisers",
  "gsc-sync": "/api/cron/gsc-sync",
  "process-indexing-queue": "/api/cron/process-indexing-queue",
  "schedule-executor": "/api/cron/schedule-executor",
  "scheduled-publish": "/api/cron/scheduled-publish",
  "london-news": "/api/cron/london-news",
  "trends-monitor": "/api/cron/trends-monitor",
  "daily-content-generate": "/api/cron/daily-content-generate",
  "reserve-publisher": "/api/cron/reserve-publisher",
  "image-pipeline": "/api/cron/image-pipeline",
  "data-refresh": "/api/cron/data-refresh",
  "analytics": "/api/cron/analytics",
};

server.tool(
  "run_cron",
  "Trigger a cron job by name. Only whitelisted safe crons allowed. Use cron_health first to see what's available.",
  {
    cronName: z.string().describe("Cron job name (e.g. 'seo-agent', 'content-selector', 'weekly-topics')"),
  },
  async ({ cronName }) => {
    const path = SAFE_CRONS[cronName];
    if (!path) {
      return json({
        error: `Unknown or unsafe cron: ${cronName}`,
        availableCrons: Object.keys(SAFE_CRONS),
      });
    }

    try {
      const result = await callCron(path);
      return json({
        action: "run_cron",
        cron: cronName,
        success: result.ok,
        result: result.data,
        error: result.error,
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Tool 6: cron_health — Last run status for all crons
// ═══════════════════════════════════════════════════════════════════════════

server.tool(
  "cron_health",
  "Show last run status, errors, and duration for all cron jobs. Identifies which crons are failing or slow.",
  {
    hoursBack: z.number().optional().describe("Hours to look back (default: 24)"),
  },
  async ({ hoursBack }) => {
    const hours = hoursBack || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
      const logs = await prisma.cronJobLog.findMany({
        where: { started_at: { gte: since } },
        orderBy: { started_at: "desc" },
        take: 500,
        select: {
          job_name: true, status: true, started_at: true,
          duration_ms: true, error_message: true, items_processed: true,
        },
      });

      // Group by job name, keep latest per job
      const byJob = new Map<string, typeof logs>();
      for (const log of logs) {
        const existing = byJob.get(log.job_name) || [];
        existing.push(log);
        byJob.set(log.job_name, existing);
      }

      const summary = Array.from(byJob.entries()).map(([name, runs]) => {
        const latest = runs[0]!;
        const failed = runs.filter(r => r.status === "failed").length;
        const avgDuration = runs.reduce((s, r) => s + (r.duration_ms || 0), 0) / runs.length;
        return {
          name,
          lastRun: latest.started_at,
          lastStatus: latest.status,
          lastError: latest.status === "failed" ? latest.error_message?.substring(0, 100) : null,
          runsInPeriod: runs.length,
          failures: failed,
          avgDurationMs: Math.round(avgDuration),
        };
      });

      summary.sort((a, b) => (b.failures || 0) - (a.failures || 0));

      const totalRuns = logs.length;
      const totalFailed = logs.filter(l => l.status === "failed").length;

      return json({
        period: `Last ${hours}h`,
        totalRuns,
        totalFailed,
        successRate: totalRuns > 0 ? `${Math.round(((totalRuns - totalFailed) / totalRuns) * 100)}%` : "N/A",
        jobs: summary,
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Tool 7: ceo_inbox_alerts — Active alerts with diagnosis
// ═══════════════════════════════════════════════════════════════════════════

server.tool(
  "ceo_inbox_alerts",
  "Show active CEO inbox alerts with plain-English diagnosis and fix suggestions. Use dismiss_alert to clear resolved ones.",
  {
    limit: z.number().optional().describe("Max alerts to return (default: 10)"),
  },
  async ({ limit }) => {
    const take = Math.min(limit || 10, 30);

    try {
      const entries = await prisma.cronJobLog.findMany({
        where: { job_name: "ceo-inbox" },
        orderBy: { started_at: "desc" },
        take,
        select: {
          id: true, status: true, started_at: true,
          result_summary: true, error_message: true,
        },
      });

      const alerts = entries.map((e) => {
        const summary = e.result_summary as Record<string, unknown> | null;
        return {
          id: e.id,
          originalJob: summary?.originalJob || "unknown",
          status: summary?.status || e.status,
          diagnosis: summary?.diagnosis || e.error_message || "No details",
          fixAttempted: summary?.fixAttempted || false,
          fixResult: summary?.fixResult || null,
          retestResult: summary?.retestResult || null,
          timestamp: e.started_at,
        };
      });

      const unresolved = alerts.filter(a =>
        a.status !== "resolved" && a.status !== "dismissed"
      );

      return json({
        totalAlerts: alerts.length,
        unresolvedCount: unresolved.length,
        alerts,
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Tool 8: dismiss_alert — Dismiss a CEO inbox alert
// ═══════════════════════════════════════════════════════════════════════════

server.tool(
  "dismiss_alert",
  "Dismiss a CEO inbox alert by its ID. Get IDs from ceo_inbox_alerts.",
  {
    alertId: z.string().describe("Alert ID from ceo_inbox_alerts"),
  },
  async ({ alertId }) => {
    try {
      const entry = await prisma.cronJobLog.findUnique({ where: { id: alertId } });
      if (!entry) return error(`Alert not found: ${alertId}`);

      const summary = (entry.result_summary as Record<string, unknown>) || {};
      await prisma.cronJobLog.update({
        where: { id: alertId },
        data: {
          result_summary: { ...summary, status: "dismissed", dismissedAt: new Date().toISOString() },
        },
      });

      return json({ action: "dismiss_alert", alertId, success: true });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Tool 9: diagnose_pipeline — Run diagnostic agent
// ═══════════════════════════════════════════════════════════════════════════

server.tool(
  "diagnose_pipeline",
  "Run the diagnostic agent to find and fix stuck drafts, zombie crons, and pipeline issues. Safe — auto-fixes are non-destructive.",
  {},
  async () => {
    try {
      const result = await callCron("/api/cron/diagnostic-sweep");
      return json({
        action: "diagnose_pipeline",
        success: result.ok,
        result: result.data,
        error: result.error,
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Tool 10: indexing_status — SEO indexing overview
// ═══════════════════════════════════════════════════════════════════════════

server.tool(
  "indexing_status",
  "Indexing overview: indexed, submitted, never-submitted, errors, recent submissions. Shows how visible the site is to Google.",
  {
    siteId: z.string().optional().describe("Site ID (default: yalla-london)"),
  },
  async ({ siteId }) => {
    const site = siteId || getDefaultSiteId();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    try {
      const [indexed, submitted, neverSubmitted, errors, recentSubmissions, chronicFailures] = await Promise.all([
        prisma.uRLIndexingStatus.count({ where: { site_id: site, status: "indexed" } }),
        prisma.uRLIndexingStatus.count({ where: { site_id: site, submitted_indexnow: true } }),
        prisma.uRLIndexingStatus.count({ where: { site_id: site, submitted_indexnow: false, submitted_google_api: false } }),
        prisma.uRLIndexingStatus.count({ where: { site_id: site, status: "error" } }),
        prisma.uRLIndexingStatus.findMany({
          where: { site_id: site, last_submitted_at: { gte: weekAgo } },
          orderBy: { last_submitted_at: "desc" },
          take: 10,
          select: { url: true, status: true, last_submitted_at: true, submission_attempts: true },
        }),
        prisma.uRLIndexingStatus.count({
          where: { site_id: site, submission_attempts: { gte: 10 }, status: { not: "indexed" } },
        }),
      ]);

      const total = indexed + submitted + neverSubmitted + errors;
      const indexRate = total > 0 ? Math.round((indexed / total) * 100) : 0;

      return json({
        site,
        total,
        indexed,
        indexRate: `${indexRate}%`,
        submitted,
        neverSubmitted,
        errors,
        chronicFailures,
        recentSubmissions: recentSubmissions.map(s => ({
          url: s.url, status: s.status, submitted: s.last_submitted_at, attempts: s.submission_attempts,
        })),
        recommendation: neverSubmitted > 10
          ? "Run process-indexing-queue to submit pending pages"
          : chronicFailures > 5
            ? "Check IndexNow key file — chronic failures suggest verification issues"
            : "Indexing pipeline healthy",
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Tool 11: seo_health — SEO audit score and top issues
// ═══════════════════════════════════════════════════════════════════════════

server.tool(
  "seo_health",
  "SEO health overview: latest audit score, top issues, articles needing attention. Pulls from latest aggregated report data.",
  {
    siteId: z.string().optional().describe("Site ID (default: yalla-london)"),
  },
  async ({ siteId }) => {
    const site = siteId || getDefaultSiteId();

    try {
      // Get latest SEO-related cron results
      const latestSeoAgent = await prisma.cronJobLog.findFirst({
        where: { job_name: "seo-agent", status: "completed" },
        orderBy: { started_at: "desc" },
        select: { result_summary: true, started_at: true, duration_ms: true },
      });

      const latestDeepReview = await prisma.cronJobLog.findFirst({
        where: { job_name: "seo-deep-review", status: "completed" },
        orderBy: { started_at: "desc" },
        select: { result_summary: true, started_at: true },
      });

      // Articles with low SEO scores
      const lowSeoArticles = await prisma.blogPost.findMany({
        where: { siteId: site, published: true, seo_score: { lt: 50 } },
        orderBy: { seo_score: "asc" },
        take: 10,
        select: { title_en: true, slug: true, seo_score: true, created_at: true },
      });

      // Articles missing meta
      const missingMeta = await prisma.blogPost.count({
        where: {
          siteId: site, published: true,
          OR: [
            { meta_title_en: { equals: "" } },
            { meta_description_en: { equals: "" } },
          ],
        },
      });

      return json({
        site,
        lastSeoAgentRun: latestSeoAgent ? {
          when: latestSeoAgent.started_at,
          duration: `${latestSeoAgent.duration_ms}ms`,
          result: latestSeoAgent.result_summary,
        } : null,
        lastDeepReview: latestDeepReview ? {
          when: latestDeepReview.started_at,
          result: latestDeepReview.result_summary,
        } : null,
        lowSeoArticles: lowSeoArticles.map(a => ({
          title: a.title_en, slug: a.slug, score: a.seo_score,
        })),
        missingMetaCount: missingMeta,
        recommendation: lowSeoArticles.length > 5
          ? "Multiple articles below SEO threshold — run seo-deep-review"
          : missingMeta > 0
            ? `${missingMeta} articles missing meta tags — seo-agent will auto-fix`
            : "SEO health looks good",
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Tool 12: affiliate_revenue — Clicks, commissions, coverage
// ═══════════════════════════════════════════════════════════════════════════

server.tool(
  "affiliate_revenue",
  "Affiliate performance: clicks, commissions, coverage percentage, top earning articles. Shows how money flows.",
  {
    siteId: z.string().optional().describe("Site ID (default: yalla-london)"),
    days: z.number().optional().describe("Look-back period in days (default: 30)"),
  },
  async ({ siteId, days }) => {
    const site = siteId || getDefaultSiteId();
    const period = days || 30;
    const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000);
    const siteFilter = { OR: [{ siteId: site }, { siteId: null }] };

    try {
      const [clicksTotal, clicksRecent, commissions, publishedCount] = await Promise.all([
        prisma.cjClickEvent.count({ where: siteFilter }),
        prisma.cjClickEvent.count({ where: { ...siteFilter, createdAt: { gte: since } } }),
        prisma.cjCommission.aggregate({
          where: { ...siteFilter, createdAt: { gte: since } },
          _sum: { commissionAmount: true },
          _count: true,
        }),
        prisma.blogPost.count({ where: { siteId: site, published: true } }),
      ]);

      // Top articles by clicks
      const topArticles = await prisma.cjClickEvent.groupBy({
        by: ["articleSlug"],
        where: { ...siteFilter, createdAt: { gte: since }, articleSlug: { not: null } },
        _count: true,
        orderBy: { _count: { articleSlug: "desc" } },
        take: 5,
      });

      // Coverage: articles with affiliate links vs total
      const withAffiliates = await prisma.blogPost.count({
        where: {
          siteId: site, published: true,
          content_en: { contains: "affiliate" },
        },
      });

      const coverageRate = publishedCount > 0 ? Math.round((withAffiliates / publishedCount) * 100) : 0;

      return json({
        site,
        period: `Last ${period} days`,
        clicks: { total: clicksTotal, inPeriod: clicksRecent },
        commissions: {
          total: commissions._sum.commissionAmount || 0,
          count: commissions._count,
        },
        coverage: {
          articlesWithAffiliates: withAffiliates,
          totalPublished: publishedCount,
          rate: `${coverageRate}%`,
        },
        topArticles: topArticles.map(a => ({
          slug: a.articleSlug, clicks: a._count,
        })),
        recommendation: coverageRate < 50
          ? "Low affiliate coverage — run affiliate-injection cron"
          : clicksRecent === 0
            ? "Zero clicks — check if affiliate links are visible on articles"
            : "Affiliate pipeline active",
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Tool 13: ai_costs — AI spend breakdown
// ═══════════════════════════════════════════════════════════════════════════

server.tool(
  "ai_costs",
  "AI spending: today, this week, this month. Per-provider and per-task breakdown. Identifies what's consuming budget.",
  {
    siteId: z.string().optional().describe("Site ID (default: yalla-london)"),
  },
  async ({ siteId }) => {
    const site = siteId || getDefaultSiteId();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    try {
      const [costsToday, costsWeek, costsMonth] = await Promise.all([
        prisma.apiUsageLog.aggregate({
          where: { siteId: site, createdAt: { gte: today } },
          _sum: { estimatedCostUsd: true, totalTokens: true },
          _count: true,
        }),
        prisma.apiUsageLog.aggregate({
          where: { siteId: site, createdAt: { gte: weekAgo } },
          _sum: { estimatedCostUsd: true, totalTokens: true },
          _count: true,
        }),
        prisma.apiUsageLog.aggregate({
          where: { siteId: site, createdAt: { gte: monthAgo } },
          _sum: { estimatedCostUsd: true, totalTokens: true },
          _count: true,
        }),
      ]);

      // Per-provider breakdown (last 7 days)
      const byProvider = await prisma.apiUsageLog.groupBy({
        by: ["provider"],
        where: { siteId: site, createdAt: { gte: weekAgo } },
        _sum: { estimatedCostUsd: true, totalTokens: true },
        _count: true,
      });

      // Per-task breakdown (last 7 days)
      const byTask = await prisma.apiUsageLog.groupBy({
        by: ["taskType"],
        where: { siteId: site, createdAt: { gte: weekAgo }, taskType: { not: null } },
        _sum: { estimatedCostUsd: true },
        _count: true,
        orderBy: { _sum: { estimatedCostUsd: "desc" } },
        take: 10,
      });

      return json({
        site,
        today: {
          cost: `$${(costsToday._sum.estimatedCostUsd || 0).toFixed(4)}`,
          tokens: costsToday._sum.totalTokens || 0,
          calls: costsToday._count,
        },
        thisWeek: {
          cost: `$${(costsWeek._sum.estimatedCostUsd || 0).toFixed(4)}`,
          tokens: costsWeek._sum.totalTokens || 0,
          calls: costsWeek._count,
        },
        thisMonth: {
          cost: `$${(costsMonth._sum.estimatedCostUsd || 0).toFixed(4)}`,
          tokens: costsMonth._sum.totalTokens || 0,
          calls: costsMonth._count,
        },
        byProvider: byProvider.map(p => ({
          provider: p.provider,
          cost: `$${(p._sum.estimatedCostUsd || 0).toFixed(4)}`,
          calls: p._count,
        })),
        byTask: byTask.map(t => ({
          task: t.taskType,
          cost: `$${(t._sum.estimatedCostUsd || 0).toFixed(4)}`,
          calls: t._count,
        })),
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Tool 14: crm_lookup — Find contact across all models
// ═══════════════════════════════════════════════════════════════════════════

server.tool(
  "crm_lookup",
  "Find a contact by email or phone. Searches across Lead, Subscriber, CharterInquiry, and CrmOpportunity tables.",
  {
    email: z.string().optional().describe("Email to search for"),
    phone: z.string().optional().describe("Phone number to search for"),
  },
  async ({ email, phone }) => {
    if (!email && !phone) return error("Provide email or phone to search");

    try {
      const results: Record<string, unknown> = {};

      if (email) {
        const [lead, subscriber, inquiry, opportunity] = await Promise.all([
          prisma.lead.findFirst({ where: { email } }),
          prisma.subscriber.findFirst({ where: { email } }),
          prisma.charterInquiry.findFirst({ where: { email } }),
          prisma.crmOpportunity.findFirst({ where: { contactEmail: email } }),
        ]);

        if (lead) results.lead = {
          name: lead.name, email: lead.email, status: lead.status,
          score: lead.score, source: lead.lead_source, created: lead.created_at,
        };
        if (subscriber) results.subscriber = {
          email: subscriber.email, status: subscriber.status, created: subscriber.created_at,
        };
        if (inquiry) results.charterInquiry = {
          email: inquiry.email, firstName: inquiry.firstName,
          yachtType: inquiry.yachtType, status: inquiry.status, created: inquiry.createdAt,
        };
        if (opportunity) results.opportunity = {
          stage: opportunity.stage, value: opportunity.value,
          source: opportunity.source, nextAction: opportunity.nextAction, created: opportunity.createdAt,
        };
      }

      if (phone) {
        const lead = await prisma.lead.findFirst({ where: { phone } });
        const inquiry = await prisma.charterInquiry.findFirst({ where: { phone } });
        if (lead) results.leadByPhone = {
          name: lead.name, email: lead.email, status: lead.status, score: lead.score,
        };
        if (inquiry) results.inquiryByPhone = {
          email: inquiry.email, firstName: inquiry.firstName, status: inquiry.status,
        };
      }

      const found = Object.keys(results).length > 0;
      return json({
        query: { email, phone },
        found,
        ...(found ? results : { message: "No contact found with this email/phone" }),
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Tool 15: crm_create_lead — Create a new CRM lead
// ═══════════════════════════════════════════════════════════════════════════

server.tool(
  "crm_create_lead",
  "Create a new CRM lead. Use for contacts from WhatsApp, email inquiries, or manual entry.",
  {
    email: z.string().describe("Contact email"),
    name: z.string().describe("Contact name"),
    phone: z.string().optional().describe("Phone number"),
    source: z.string().optional().describe("Lead source (e.g. whatsapp, email, website)"),
    interests: z.string().optional().describe("What they're interested in"),
    siteId: z.string().optional().describe("Site ID (default: yalla-london)"),
  },
  async ({ email, name, phone, source, interests, siteId }) => {
    const site = siteId || getDefaultSiteId();

    try {
      // Check for duplicate
      const existing = await prisma.lead.findFirst({ where: { email } });
      if (existing) {
        return json({
          action: "crm_create_lead",
          success: false,
          message: `Lead already exists with email ${email}`,
          existingLead: { id: existing.id, name: existing.name, status: existing.status },
        });
      }

      const lead = await prisma.lead.create({
        data: {
          site_id: site,
          email,
          name,
          phone: phone || null,
          lead_source: source || "manual",
          interests_json: interests ? { interests } : undefined,
          status: "new",
        },
      });

      return json({
        action: "crm_create_lead",
        success: true,
        lead: { id: lead.id, name: lead.name, email: lead.email, status: lead.status },
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Tool 16: list_topics — Topic proposals by status
// ═══════════════════════════════════════════════════════════════════════════

server.tool(
  "list_topics",
  "List topic proposals: ready, generating, drafted. Shows what's in the content pipeline queue.",
  {
    siteId: z.string().optional().describe("Site ID (default: yalla-london)"),
    status: z.string().optional().describe("Filter by status: ready, generating, drafted, all (default: ready)"),
    limit: z.number().optional().describe("Max results (default: 20)"),
  },
  async ({ siteId, status, limit }) => {
    const site = siteId || getDefaultSiteId();
    const take = Math.min(limit || 20, 50);
    const targetStatus = status || "ready";

    try {
      const where: Record<string, unknown> = { site_id: site };
      if (targetStatus !== "all") {
        where.status = targetStatus === "ready"
          ? { in: ["ready", "queued", "planned", "proposed"] }
          : targetStatus;
      }

      const topics = await prisma.topicProposal.findMany({
        where,
        orderBy: { created_at: "desc" },
        take,
        select: {
          id: true, title: true, status: true, locale: true,
          primary_keyword: true, intent: true, confidence_score: true,
          suggested_page_type: true, created_at: true,
        },
      });

      // Counts by status
      const statusCounts = await prisma.topicProposal.groupBy({
        by: ["status"],
        where: { site_id: site },
        _count: true,
      });

      return json({
        site,
        filter: targetStatus,
        count: topics.length,
        statusSummary: Object.fromEntries(statusCounts.map(s => [s.status, s._count])),
        topics: topics.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          locale: t.locale,
          keyword: t.primary_keyword,
          intent: t.intent,
          confidence: t.confidence_score,
          pageType: t.suggested_page_type,
          created: t.created_at,
        })),
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Tool 17: research_topics — Trigger AI topic research
// ═══════════════════════════════════════════════════════════════════════════

server.tool(
  "research_topics",
  "Trigger AI topic research for a specific focus area. Creates topic proposals that feed into the content pipeline.",
  {
    focusArea: z.string().describe("Focus area to research (e.g. 'ramadan london', 'luxury hotels mayfair')"),
    siteId: z.string().optional().describe("Site ID (default: yalla-london)"),
  },
  async ({ focusArea, siteId }) => {
    const site = siteId || getDefaultSiteId();
    const domain = getSiteDomain(site);

    try {
      const res = await fetch(`${domain}/api/admin/topic-research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focusArea, siteId: site }),
        signal: AbortSignal.timeout(55_000),
      });

      const text = await res.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch { data = text; }

      return json({
        action: "research_topics",
        focusArea,
        site,
        success: res.ok,
        result: data,
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Tool 18: site_metrics — Per-site summary
// ═══════════════════════════════════════════════════════════════════════════

server.tool(
  "site_metrics",
  "Per-site summary: articles, traffic proxy, indexing, revenue, pipeline status. Compare across sites.",
  {
    siteId: z.string().optional().describe("Site ID. Omit to see all active sites."),
  },
  async ({ siteId }) => {
    const sites = siteId ? [siteId] : ["yalla-london", "zenitha-yachts-med"];

    try {
      const metrics = await Promise.all(
        sites.map(async (site) => {
          const [published, drafts, reservoir, indexed, clicks, aiCost] = await Promise.all([
            prisma.blogPost.count({ where: { siteId: site, published: true } }),
            prisma.articleDraft.count({ where: { site_id: site, current_phase: { notIn: ["published", "rejected"] } } }),
            prisma.articleDraft.count({ where: { site_id: site, current_phase: "reservoir" } }),
            prisma.uRLIndexingStatus.count({ where: { site_id: site, status: "indexed" } }),
            prisma.cjClickEvent.count({ where: { OR: [{ siteId: site }, { siteId: null }] } }),
            prisma.apiUsageLog.aggregate({
              where: { siteId: site, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
              _sum: { estimatedCostUsd: true },
            }),
          ]);

          return {
            site,
            articles: { published, activeDrafts: drafts, reservoir },
            indexing: { indexed },
            revenue: { affiliateClicks: clicks },
            aiCost7d: `$${(aiCost._sum.estimatedCostUsd || 0).toFixed(4)}`,
          };
        })
      );

      return json({ sites: metrics });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Tool 19: content_cleanup — Trigger content-auto-fix
// ═══════════════════════════════════════════════════════════════════════════

server.tool(
  "content_cleanup",
  "Trigger content cleanup: fix broken links, remove thin content, detect duplicates, wrap untracked affiliate links. Safe — flags issues, rarely deletes.",
  {},
  async () => {
    try {
      const result = await callCron("/api/cron/content-auto-fix");
      return json({
        action: "content_cleanup",
        success: result.ok,
        result: result.data,
        error: result.error,
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Tool 20: cycle_health — Evidence-based diagnostics
// ═══════════════════════════════════════════════════════════════════════════

server.tool(
  "cycle_health",
  "Evidence-based platform diagnostics: analyzes last 12-24h of operations, identifies issues with severity, suggests fixes. Like a doctor's checkup.",
  {
    siteId: z.string().optional().describe("Site ID (default: yalla-london)"),
  },
  async ({ siteId }) => {
    const site = siteId || getDefaultSiteId();
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      // Pipeline throughput
      const [publishedRecent, draftsStuck, reservoirCount] = await Promise.all([
        prisma.blogPost.count({ where: { siteId: site, published: true, created_at: { gte: twentyFourHoursAgo } } }),
        prisma.articleDraft.count({
          where: { site_id: site, current_phase: { notIn: ["published", "rejected", "reservoir"] }, updated_at: { lt: twelveHoursAgo } },
        }),
        prisma.articleDraft.count({ where: { site_id: site, current_phase: "reservoir" } }),
      ]);

      // Cron success rate
      const cronLogs = await prisma.cronJobLog.findMany({
        where: { started_at: { gte: twentyFourHoursAgo } },
        select: { status: true, job_name: true, error_message: true },
      });
      const cronTotal = cronLogs.length;
      const cronFailed = cronLogs.filter(c => c.status === "failed").length;
      const successRate = cronTotal > 0 ? Math.round(((cronTotal - cronFailed) / cronTotal) * 100) : 0;

      // AI provider health
      const aiLogs = await prisma.apiUsageLog.findMany({
        where: { createdAt: { gte: twelveHoursAgo } },
        select: { provider: true, success: true },
      });
      const providerHealth = new Map<string, { total: number; success: number }>();
      for (const log of aiLogs) {
        const existing = providerHealth.get(log.provider) || { total: 0, success: 0 };
        existing.total++;
        if (log.success) existing.success++;
        providerHealth.set(log.provider, existing);
      }

      // Build issues list
      const issues: { severity: string; category: string; description: string; fix: string }[] = [];

      if (publishedRecent === 0) {
        issues.push({ severity: "high", category: "pipeline", description: "Zero articles published in 24h", fix: "Run publish_ready or diagnose_pipeline" });
      }
      if (draftsStuck > 5) {
        issues.push({ severity: "high", category: "pipeline", description: `${draftsStuck} drafts stuck for 12h+`, fix: "Run diagnose_pipeline" });
      }
      if (reservoirCount > 50) {
        issues.push({ severity: "medium", category: "pipeline", description: `Reservoir overflow: ${reservoirCount} articles`, fix: "Run publish_ready to drain reservoir" });
      }
      if (successRate < 80) {
        issues.push({ severity: "high", category: "crons", description: `Cron success rate only ${successRate}%`, fix: "Check cron_health for failing jobs" });
      }
      for (const [provider, health] of providerHealth) {
        const rate = health.total > 0 ? (health.success / health.total) * 100 : 0;
        if (rate < 50 && health.total >= 3) {
          issues.push({ severity: "medium", category: "ai", description: `${provider} failing ${Math.round(100 - rate)}% of calls`, fix: "Check API key / quota" });
        }
      }

      // Overall grade
      const criticalCount = issues.filter(i => i.severity === "high").length;
      const grade = criticalCount === 0 ? (issues.length === 0 ? "A" : "B") :
        criticalCount <= 2 ? "C" : criticalCount <= 4 ? "D" : "F";

      return json({
        site,
        grade,
        period: "Last 24h",
        metrics: {
          publishedLast24h: publishedRecent,
          stuckDrafts: draftsStuck,
          reservoir: reservoirCount,
          cronSuccessRate: `${successRate}%`,
          cronRuns: cronTotal,
          cronFailed,
        },
        aiProviders: Object.fromEntries(
          Array.from(providerHealth.entries()).map(([p, h]) => [p, {
            calls: h.total, successRate: `${h.total > 0 ? Math.round((h.success / h.total) * 100) : 0}%`,
          }])
        ),
        issues,
        recommendation: grade === "A" ? "Everything running smoothly" :
          grade === "B" ? "Minor issues — self-healing systems should resolve" :
          "Action needed — check issues above",
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Chrome Bridge Tools — for Claude Chrome auditing workflow
// ═══════════════════════════════════════════════════════════════════════════

server.tool(
  "chrome_bridge_list_pages",
  "List published pages for a site with GSC 7-day metrics. Use to pick audit targets.",
  {
    siteId: z.string().optional().describe("Site ID (default: yalla-london)"),
    limit: z.number().optional().describe("Max pages to return (default: 20, max: 100)"),
  },
  async ({ siteId, limit }) => {
    const site = siteId || getDefaultSiteId();
    const take = Math.min(limit || 20, 100);
    const domain = getSiteDomain(site);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    try {
      const posts = await prisma.blogPost.findMany({
        where: { published: true, siteId: site },
        orderBy: { created_at: "desc" },
        take,
        select: {
          id: true, slug: true, title_en: true, seo_score: true, created_at: true,
        },
      });
      const urls = posts.map((p) => `${domain}/blog/${p.slug}`);
      const gsc = await prisma.gscPagePerformance.groupBy({
        by: ["url"],
        where: { site_id: site, url: { in: urls }, date: { gte: since7d } },
        _sum: { clicks: true, impressions: true },
        _avg: { ctr: true, position: true },
      });
      const gscByUrl: Record<string, { clicks: number; impressions: number; ctr: number; position: number }> = {};
      for (const m of gsc) {
        gscByUrl[m.url] = {
          clicks: m._sum.clicks ?? 0,
          impressions: m._sum.impressions ?? 0,
          ctr: m._avg.ctr ?? 0,
          position: m._avg.position ?? 0,
        };
      }
      return json({
        siteId: site,
        count: posts.length,
        pages: posts.map((p) => ({
          id: p.id,
          slug: p.slug,
          url: `${domain}/blog/${p.slug}`,
          title: p.title_en,
          seoScore: p.seo_score ?? undefined,
          createdAt: p.created_at,
          gsc7d: gscByUrl[`${domain}/blog/${p.slug}`] ?? null,
        })),
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  },
);

server.tool(
  "chrome_bridge_read_page",
  "Get deep-dive data for a single page: BlogPost + GSC 30d + indexing + enhancement log. Input: page ID.",
  {
    pageId: z.string().describe("BlogPost ID"),
  },
  async ({ pageId }) => {
    try {
      const post = await prisma.blogPost.findUnique({
        where: { id: pageId },
        select: {
          id: true, siteId: true, slug: true, title_en: true, title_ar: true,
          content_en: true, meta_title_en: true, meta_description_en: true,
          seo_score: true, published: true, created_at: true,
          source_pipeline: true, enhancement_log: true,
        },
      });
      if (!post) return error(`Page not found: ${pageId}`);

      const domain = getSiteDomain(post.siteId || getDefaultSiteId());
      const url = `${domain}/blog/${post.slug}`;
      const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [gsc, indexing] = await Promise.all([
        prisma.gscPagePerformance.aggregate({
          where: { site_id: post.siteId || undefined, url, date: { gte: since30d } },
          _sum: { clicks: true, impressions: true },
          _avg: { ctr: true, position: true },
        }),
        prisma.uRLIndexingStatus.findFirst({
          where: { site_id: post.siteId || undefined, url },
          select: {
            status: true, coverage_state: true, indexing_state: true,
            submission_attempts: true, last_inspected_at: true, last_error: true,
          },
        }),
      ]);

      const contentEn = post.content_en || "";
      const wordCount = contentEn.trim().split(/\s+/).filter(Boolean).length;
      const internalLinkCount = (contentEn.match(/<a[^>]+href=["'][^"']*yalla-london\.com/gi) || []).length;
      const affiliateLinkCount = (contentEn.match(/\/api\/affiliate\/click/g) || []).length;

      return json({
        page: {
          id: post.id, url, title: post.title_en,
          seoScore: post.seo_score ?? undefined,
          wordCount, internalLinkCount, affiliateLinkCount,
          metaTitleEn: post.meta_title_en ?? undefined,
          metaDescriptionEn: post.meta_description_en ?? undefined,
          published: post.published,
          createdAt: post.created_at,
          enhancementLog: post.enhancement_log ?? [],
        },
        gsc30d: {
          clicks: gsc._sum.clicks ?? 0,
          impressions: gsc._sum.impressions ?? 0,
          ctr: gsc._avg.ctr ?? 0,
          position: gsc._avg.position ?? 0,
        },
        indexing: indexing ?? null,
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  },
);

server.tool(
  "chrome_bridge_get_action_logs",
  "Unified action log view: cron/audit/autofix/AI failures clustered for triage.",
  {
    hours: z.number().optional().describe("Lookback window in hours (default: 24, max: 168)"),
    siteId: z.string().optional().describe("Filter by site (optional)"),
  },
  async ({ hours, siteId }) => {
    const window = Math.min(hours || 24, 168);
    const since = new Date(Date.now() - window * 60 * 60 * 1000);
    const site = siteId;

    try {
      const cronWhere: Record<string, unknown> = { started_at: { gte: since } };
      if (site) cronWhere.site_id = site;

      const [cronLogs, autoFixes, apiFailures] = await Promise.all([
        prisma.cronJobLog.findMany({
          where: cronWhere,
          orderBy: { started_at: "desc" },
          take: 100,
          select: {
            job_name: true, status: true, started_at: true, duration_ms: true,
            items_failed: true, error_message: true,
          },
        }),
        prisma.autoFixLog.count({
          where: { createdAt: { gte: since }, ...(site ? { siteId: site } : {}) },
        }),
        prisma.apiUsageLog.count({
          where: { createdAt: { gte: since }, success: false, ...(site ? { siteId: site } : {}) },
        }),
      ]);

      const failedByJob: Record<string, number> = {};
      for (const c of cronLogs) {
        if (c.status === "failed" || c.status === "timed_out") {
          failedByJob[c.job_name] = (failedByJob[c.job_name] ?? 0) + 1;
        }
      }

      return json({
        windowHours: window,
        siteId: site ?? "all",
        totalCronRuns: cronLogs.length,
        failedByJob,
        autoFixesAttempted: autoFixes,
        aiFailures: apiFailures,
        recentFailures: cronLogs
          .filter((c) => c.status === "failed" || c.status === "timed_out")
          .slice(0, 10)
          .map((c) => ({
            job: c.job_name,
            status: c.status,
            startedAt: c.started_at,
            durationMs: c.duration_ms,
            itemsFailed: c.items_failed,
            error: c.error_message?.slice(0, 200),
          })),
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  },
);

server.tool(
  "chrome_bridge_upload_report",
  "Upload a per-page, sitewide, or offsite audit report. Creates ChromeAuditReport + AgentTask for CLI pick-up.",
  {
    siteId: z.string().describe("Site ID (required)"),
    pageUrl: z.string().url().describe("Full canonical page URL"),
    auditType: z.enum(["per_page", "sitewide", "offsite"]).describe("Audit type"),
    severity: z.enum(["info", "warning", "critical"]).describe("Overall severity"),
    findings: z.array(z.record(z.unknown())).describe("Findings array per PLAYBOOK.md"),
    interpretedActions: z.array(z.record(z.unknown())).describe("Actions array per PLAYBOOK.md"),
    reportMarkdown: z.string().min(20).describe("Full markdown report"),
    rawData: z.record(z.unknown()).optional().describe("Raw GSC/GA4/indexing snapshot"),
  },
  async ({ siteId, pageUrl, auditType, severity, findings, interpretedActions, reportMarkdown, rawData }) => {
    const domain = getSiteDomain(getDefaultSiteId());
    const secret = process.env.CLAUDE_BRIDGE_TOKEN || process.env.CRON_SECRET;
    try {
      const res = await fetch(`${domain}/api/admin/chrome-bridge/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({ siteId, pageUrl, auditType, severity, findings, interpretedActions, reportMarkdown, rawData }),
        signal: AbortSignal.timeout(55_000),
      });
      const text = await res.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch { data = text; }
      if (!res.ok) return error(`Upload failed: ${res.status} ${JSON.stringify(data).slice(0, 500)}`);
      return json(data);
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  },
);

server.tool(
  "chrome_bridge_upload_triage",
  "Upload an action-log triage report (cross-cron failure clustering). Creates ChromeAuditReport + AgentTask.",
  {
    siteId: z.string().optional().describe("Site ID (optional — triage can be cross-site)"),
    periodHours: z.number().describe("Lookback window that was analyzed (hours)"),
    severity: z.enum(["info", "warning", "critical"]).describe("Overall severity"),
    findings: z.array(z.record(z.unknown())).describe("Findings array"),
    interpretedActions: z.array(z.record(z.unknown())).describe("Actions array"),
    reportMarkdown: z.string().min(20).describe("Full markdown report"),
    rawData: z.record(z.unknown()).optional().describe("Raw log snapshot"),
  },
  async ({ siteId, periodHours, severity, findings, interpretedActions, reportMarkdown, rawData }) => {
    const domain = getSiteDomain(getDefaultSiteId());
    const secret = process.env.CLAUDE_BRIDGE_TOKEN || process.env.CRON_SECRET;
    try {
      const res = await fetch(`${domain}/api/admin/chrome-bridge/triage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({ siteId, periodHours, severity, findings, interpretedActions, reportMarkdown, rawData }),
        signal: AbortSignal.timeout(55_000),
      });
      const text = await res.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch { data = text; }
      if (!res.ok) return error(`Upload failed: ${res.status} ${JSON.stringify(data).slice(0, 500)}`);
      return json(data);
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  },
);

server.tool(
  "chrome_bridge_list_reports",
  "List recent Chrome audit reports. Filter by siteId, auditType, or status.",
  {
    siteId: z.string().optional(),
    auditType: z.string().optional().describe("per_page | sitewide | action_log_triage | offsite"),
    status: z.string().optional().describe("new | reviewed | fix_queued | fixed | dismissed"),
    limit: z.number().optional().describe("Max results (default: 30, max: 100)"),
  },
  async ({ siteId, auditType, status, limit }) => {
    const take = Math.min(limit || 30, 100);
    const where: Record<string, unknown> = {};
    if (siteId) where.siteId = siteId;
    if (auditType) where.auditType = auditType;
    if (status) where.status = status;

    try {
      const reports = await prisma.chromeAuditReport.findMany({
        where,
        orderBy: { uploadedAt: "desc" },
        take,
        select: {
          id: true, siteId: true, pageUrl: true, pageSlug: true,
          auditType: true, severity: true, status: true,
          uploadedAt: true, reviewedAt: true, fixedAt: true,
          agentTaskId: true,
        },
      });
      return json({
        count: reports.length,
        reports,
      });
    } catch (err: unknown) {
      return error(err instanceof Error ? err.message : String(err));
    }
  },
);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Platform Control MCP Server failed to start:", err);
  process.exit(1);
});
