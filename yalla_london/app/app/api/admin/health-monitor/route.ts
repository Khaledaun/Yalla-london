/**
 * Health Monitor API
 *
 * Returns real-time connection health, cron job status, and recent errors
 * for every site. Used by the admin health monitoring dashboard.
 *
 * GET /api/admin/health-monitor
 *   ?refresh=true  — force a live DB connection test (default: true)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminOrCronAuth } from "@/lib/admin-middleware";
import { getAllSiteIds, getSiteConfig } from "@/config/sites";

// ─── Types ──────────────────────────────────────────────────────────

interface DbStatus {
  connected: boolean;
  latencyMs: number | null;
  error: string | null;
}

interface CronJobStatus {
  jobName: string;
  lastRun: string | null;
  status: string;
  durationMs: number | null;
  error: string | null;
  itemsProcessed: number;
  itemsFailed: number;
}

interface SiteHealth {
  siteId: string;
  siteName: string;
  domain: string;
  healthScore: number | null;
  lastChecked: string | null;
  status: "healthy" | "degraded" | "down" | "unknown";
}

interface RecentError {
  id: string;
  jobName: string;
  siteId: string | null;
  error: string;
  timestamp: string;
  durationMs: number | null;
}

interface IndexingStatus {
  totalUrls: number;
  indexed: number;
  submitted: number;
  discovered: number;
  errors: number;
  lastSubmitted: string | null;
  lastInspected: string | null;
  indexRate: number;
}

interface HealthMonitorResponse {
  timestamp: string;
  database: DbStatus;
  sites: SiteHealth[];
  cronJobs: CronJobStatus[];
  recentErrors: RecentError[];
  indexing: IndexingStatus;
  summary: {
    totalSites: number;
    healthySites: number;
    degradedSites: number;
    downSites: number;
    totalCronJobs: number;
    failedCronJobs: number;
    errorsLast24h: number;
  };
}

// ─── Key cron jobs to monitor ───────────────────────────────────────

const MONITORED_CRONS = [
  "seo-agent",
  "daily-content-generate",
  "scheduled-publish",
  "analytics",
  "site-health-check",
  "trends-monitor",
  "weekly-topics",
  "daily-publish",
  "seo-health-report",
  "fact-verification",
  "london-news",
  "real-time-optimization",
  "google-indexing",
  "autopilot",
  "social",
];

// ─── Handler ────────────────────────────────────────────────────────

export const GET = withAdminOrCronAuth(async (request: NextRequest) => {
  const start = Date.now();

  // 1. Test database connection
  const dbStatus = await testDatabaseConnection();

  // If DB is down, return limited response
  if (!dbStatus.connected) {
    const siteIds = getAllSiteIds();
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      database: dbStatus,
      sites: siteIds.map((id) => {
        const cfg = getSiteConfig(id);
        return {
          siteId: id,
          siteName: cfg?.name ?? id,
          domain: cfg?.domain ?? "",
          healthScore: null,
          lastChecked: null,
          status: "down" as const,
        };
      }),
      cronJobs: [],
      recentErrors: [],
      indexing: fallbackIndexingStatus(),
      summary: {
        totalSites: siteIds.length,
        healthySites: 0,
        degradedSites: 0,
        downSites: siteIds.length,
        totalCronJobs: 0,
        failedCronJobs: 0,
        errorsLast24h: 0,
      },
    } satisfies HealthMonitorResponse);
  }

  // 2. Fetch data in parallel (resilient to missing tables)
  const [sites, cronJobs, recentErrors, indexing] = await Promise.all([
    fetchSiteHealth().catch(() => fallbackSiteHealth()),
    fetchCronJobStatus().catch(() => fallbackCronJobStatus()),
    fetchRecentErrors().catch(() => [] as RecentError[]),
    fetchIndexingStatus().catch(() => fallbackIndexingStatus()),
  ]);

  // 3. Build summary
  // Count jobs that are explicitly failed, timed out, or "completed" but with all items failed
  const healthySites = sites.filter((s) => s.status === "healthy").length;
  const degradedSites = sites.filter((s) => s.status === "degraded").length;
  const downSites = sites.filter((s) => s.status === "down").length;
  const failedCronJobs = cronJobs.filter((c) =>
    c.status === "failed" ||
    c.status === "timed_out" ||
    (c.itemsFailed > 0 && c.itemsFailed === c.itemsProcessed),
  ).length;

  const response: HealthMonitorResponse = {
    timestamp: new Date().toISOString(),
    database: dbStatus,
    sites,
    cronJobs,
    recentErrors,
    indexing,
    summary: {
      totalSites: sites.length,
      healthySites,
      degradedSites,
      downSites,
      totalCronJobs: cronJobs.length,
      failedCronJobs,
      errorsLast24h: recentErrors.length,
    },
  };

  return NextResponse.json(response);
});

export const POST = GET;

// ─── Helpers ────────────────────────────────────────────────────────

async function testDatabaseConnection(): Promise<DbStatus> {
  const start = Date.now();
  try {
    const { prisma } = await import("@/lib/db");
    await (prisma as any).$queryRaw`SELECT 1`;
    return {
      connected: true,
      latencyMs: Date.now() - start,
      error: null,
    };
  } catch (err) {
    return {
      connected: false,
      latencyMs: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function fetchSiteHealth(): Promise<SiteHealth[]> {
  const { prisma } = await import("@/lib/db");
  const siteIds = getAllSiteIds();

  // Get latest health check per site
  const healthChecks = await (prisma as any).siteHealthCheck.findMany({
    where: { site_id: { in: siteIds } },
    orderBy: { checked_at: "desc" },
    distinct: ["site_id"],
    select: {
      site_id: true,
      health_score: true,
      checked_at: true,
    },
  });

  const healthMap = new Map(
    healthChecks.map((h: any) => [h.site_id, h])
  );

  // Get recent cron failures per site (last 24h)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentFailures = await (prisma as any).cronJobLog.groupBy({
    by: ["site_id"],
    where: {
      status: "failed",
      started_at: { gte: oneDayAgo },
      site_id: { not: null },
    },
    _count: true,
  });

  const failureMap = new Map(
    recentFailures.map((f: any) => [f.site_id, f._count])
  );

  return siteIds.map((id) => {
    const cfg = getSiteConfig(id);
    const check = healthMap.get(id) as any;
    const failures = (failureMap.get(id) as number) ?? 0;

    let status: SiteHealth["status"] = "unknown";
    if (check) {
      if (check.health_score >= 70 && failures === 0) status = "healthy";
      else if (check.health_score >= 40 || failures <= 2) status = "degraded";
      else status = "down";
    } else if (failures > 3) {
      status = "down";
    } else if (failures > 0) {
      status = "degraded";
    }

    return {
      siteId: id,
      siteName: cfg?.name ?? id,
      domain: cfg?.domain ?? "",
      healthScore: check?.health_score ?? null,
      lastChecked: check?.checked_at?.toISOString() ?? null,
      status,
    };
  });
}

async function fetchCronJobStatus(): Promise<CronJobStatus[]> {
  const { prisma } = await import("@/lib/db");

  // Get latest run of each monitored cron job
  const results: CronJobStatus[] = [];

  for (const jobName of MONITORED_CRONS) {
    const latest = await (prisma as any).cronJobLog.findFirst({
      where: { job_name: jobName },
      orderBy: { started_at: "desc" },
      select: {
        job_name: true,
        status: true,
        started_at: true,
        completed_at: true,
        duration_ms: true,
        error_message: true,
        items_processed: true,
        items_failed: true,
      },
    });

    if (latest) {
      results.push({
        jobName: latest.job_name,
        lastRun: latest.started_at?.toISOString() ?? null,
        status: latest.status,
        durationMs: latest.duration_ms,
        error: latest.error_message,
        itemsProcessed: latest.items_processed ?? 0,
        itemsFailed: latest.items_failed ?? 0,
      });
    } else {
      results.push({
        jobName,
        lastRun: null,
        status: "never_run",
        durationMs: null,
        error: null,
        itemsProcessed: 0,
        itemsFailed: 0,
      });
    }
  }

  return results;
}

async function fetchRecentErrors(): Promise<RecentError[]> {
  const { prisma } = await import("@/lib/db");
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const errors = await (prisma as any).cronJobLog.findMany({
    where: {
      status: { in: ["failed", "timed_out"] },
      started_at: { gte: oneDayAgo },
    },
    orderBy: { started_at: "desc" },
    take: 50,
    select: {
      id: true,
      job_name: true,
      site_id: true,
      error_message: true,
      started_at: true,
      duration_ms: true,
    },
  });

  if (errors.length === 0) return [];

  // Exclude errors from jobs that have since recovered (latest run succeeded).
  // This prevents stale alerts from lingering after a fix is deployed.
  const failedJobNames = [...new Set<string>(errors.map((e: any) => e.job_name))];
  const latestRuns = await Promise.all(
    failedJobNames.map(async (jobName: string) => {
      const latest = await (prisma as any).cronJobLog.findFirst({
        where: { job_name: jobName },
        orderBy: { started_at: "desc" },
        select: { job_name: true, status: true },
      });
      return latest;
    }),
  );

  // Set of job names whose latest run succeeded — their old errors are resolved
  const recoveredJobs = new Set(
    latestRuns
      .filter((r: any) => r && r.status === "completed")
      .map((r: any) => r.job_name),
  );

  return errors
    .filter((e: any) => !recoveredJobs.has(e.job_name))
    .map((e: any) => ({
      id: e.id,
      jobName: e.job_name,
      siteId: e.site_id,
      error: e.error_message ?? "Unknown error",
      timestamp: e.started_at?.toISOString() ?? new Date().toISOString(),
      durationMs: e.duration_ms,
    }));
}

async function fetchIndexingStatus(): Promise<IndexingStatus> {
  const { prisma } = await import("@/lib/db");

  const counts = await (prisma as any).uRLIndexingStatus.groupBy({
    by: ["status"],
    _count: true,
  });

  const countMap = new Map(
    counts.map((c: any) => [c.status, c._count])
  );

  const totalUrls = counts.reduce((sum: number, c: any) => sum + c._count, 0);
  const indexed = (countMap.get("indexed") as number) ?? 0;
  const submitted = (countMap.get("submitted") as number) ?? 0;
  const discovered = (countMap.get("discovered") as number) ?? 0;
  const errors = (countMap.get("error") as number) ?? 0;

  // Get most recent submission and inspection timestamps
  const lastSubmission = await (prisma as any).uRLIndexingStatus.findFirst({
    where: { last_submitted_at: { not: null } },
    orderBy: { last_submitted_at: "desc" },
    select: { last_submitted_at: true },
  });

  const lastInspection = await (prisma as any).uRLIndexingStatus.findFirst({
    where: { last_inspected_at: { not: null } },
    orderBy: { last_inspected_at: "desc" },
    select: { last_inspected_at: true },
  });

  return {
    totalUrls,
    indexed,
    submitted,
    discovered,
    errors,
    lastSubmitted: lastSubmission?.last_submitted_at?.toISOString() ?? null,
    lastInspected: lastInspection?.last_inspected_at?.toISOString() ?? null,
    indexRate: totalUrls > 0 ? Math.round((indexed / totalUrls) * 100) : 0,
  };
}

// ─── Fallbacks when tables don't exist yet ──────────────────────────

function fallbackSiteHealth(): SiteHealth[] {
  const siteIds = getAllSiteIds();
  return siteIds.map((id) => {
    const cfg = getSiteConfig(id);
    return {
      siteId: id,
      siteName: cfg?.name ?? id,
      domain: cfg?.domain ?? "",
      healthScore: null,
      lastChecked: null,
      status: "unknown" as const,
    };
  });
}

function fallbackCronJobStatus(): CronJobStatus[] {
  return MONITORED_CRONS.map((jobName) => ({
    jobName,
    lastRun: null,
    status: "never_run",
    durationMs: null,
    error: null,
    itemsProcessed: 0,
    itemsFailed: 0,
  }));
}

function fallbackIndexingStatus(): IndexingStatus {
  return {
    totalUrls: 0,
    indexed: 0,
    submitted: 0,
    discovered: 0,
    errors: 0,
    lastSubmitted: null,
    lastInspected: null,
    indexRate: 0,
  };
}
