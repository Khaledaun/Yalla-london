/**
 * Cron Job Success Monitor API
 *
 * Returns a structured, per-job health report across 24h / 48h / 72h windows.
 * Each job includes: run count, success/fail counts, success rate, average duration,
 * individual run details (with timestamps, duration, error), and plain-English
 * error interpretation from lib/error-interpreter.ts.
 *
 * GET /api/admin/cron-monitor
 *   ?hours=24|48|72 (default: 72)
 *   &category=content|seo|indexing|analytics|maintenance (optional)
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { interpretError } from "@/lib/error-interpreter";

// Mirror of CRON_SCHEDULE from cron-schedule/route.ts — job metadata
const JOB_META: Record<
  string,
  {
    label: string;
    category: string;
    critical: boolean;
    schedule: string;
    humanSchedule: string;
    logName?: string;
  }
> = {
  "analytics-sync": { label: "Analytics Sync", category: "analytics", critical: false, schedule: "0 3 * * *", humanSchedule: "Daily 3:00 UTC", logName: "analytics" },
  "weekly-topics": { label: "Weekly Topic Research", category: "content", critical: true, schedule: "0 4 * * 1", humanSchedule: "Monday 4:00 UTC" },
  "daily-content-generate": { label: "Daily Content Generation", category: "content", critical: true, schedule: "0 5 * * *", humanSchedule: "Daily 5:00 UTC" },
  "seo-orchestrator": { label: "SEO Orchestrator", category: "seo", critical: false, schedule: "0 5-6 * * *", humanSchedule: "Daily + Weekly" },
  "trends-monitor": { label: "Trends Monitor", category: "content", critical: false, schedule: "0 6 * * *", humanSchedule: "Daily 6:00 UTC" },
  "seo-agent": { label: "SEO Agent", category: "indexing", critical: false, schedule: "0 7,13,20 * * *", humanSchedule: "3× daily" },
  "seo-cron-daily": { label: "SEO Cron (Daily)", category: "seo", critical: false, schedule: "30 7 * * *", humanSchedule: "Daily 7:30 UTC" },
  "seo-cron-weekly": { label: "SEO Cron (Weekly)", category: "seo", critical: false, schedule: "0 8 * * 0", humanSchedule: "Sunday 8:00 UTC" },
  "content-builder": { label: "Content Builder", category: "content", critical: true, schedule: "*/15 * * * *", humanSchedule: "Every 15 min" },
  "content-selector": { label: "Content Selector", category: "content", critical: true, schedule: "0 9,13,17,21 * * *", humanSchedule: "4× daily" },
  "affiliate-injection": { label: "Affiliate Injection", category: "content", critical: false, schedule: "0 9 * * *", humanSchedule: "Daily 9:00 UTC" },
  "scheduled-publish": { label: "Scheduled Publish", category: "content", critical: false, schedule: "0 9,16 * * *", humanSchedule: "2× daily" },
  "site-health-check": { label: "Site Health Check", category: "maintenance", critical: false, schedule: "0 22 * * *", humanSchedule: "Daily 22:00 UTC" },
  "london-news": { label: "London News", category: "content", critical: false, schedule: "0 6 * * *", humanSchedule: "Daily 6:00 UTC" },
  "fact-verification": { label: "Fact Verification", category: "content", critical: false, schedule: "0 3 * * 0", humanSchedule: "Sunday 3:00 UTC" },
  "sweeper": { label: "Data Sweeper", category: "maintenance", critical: false, schedule: "45 8 * * *", humanSchedule: "Daily 8:45 UTC" },
  "google-indexing": { label: "Google Indexing", category: "indexing", critical: false, schedule: "15 9 * * *", humanSchedule: "Daily 9:15 UTC" },
  "verify-indexing": { label: "Verify Indexing", category: "indexing", critical: false, schedule: "0 11,17 * * *", humanSchedule: "2× daily" },
  "content-auto-fix": { label: "Content Auto-Fix", category: "content", critical: false, schedule: "0 11,18 * * *", humanSchedule: "2× daily" },
  "commerce-trends": { label: "Commerce Trends", category: "content", critical: false, schedule: "30 4 * * 1", humanSchedule: "Monday 4:30 UTC" },
  "etsy-sync": { label: "Etsy Sync", category: "content", critical: false, schedule: "0 10 * * *", humanSchedule: "Daily 10:00 UTC" },
  "social": { label: "Social Publisher", category: "content", critical: false, schedule: "0 10,15,20 * * *", humanSchedule: "3× daily" },
  "reserve-publisher": { label: "Reserve Publisher", category: "content", critical: false, schedule: "0 21 * * *", humanSchedule: "Daily 21:00 UTC" },
  "seo-deep-review": { label: "SEO Deep Review", category: "seo", critical: false, schedule: "0 0 * * *", humanSchedule: "Daily midnight" },
  "process-indexing-queue": { label: "Process Indexing Queue", category: "indexing", critical: false, schedule: "15 7,13,20 * * *", humanSchedule: "3× daily" },
};

interface RunDetail {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  durationFormatted: string;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  errorMessage: string | null;
  errorPlain: string | null;
  errorFix: string | null;
  errorSeverity: string | null;
  timedOut: boolean;
  siteId: string | null;
  sitesProcessed: string[];
}

interface JobReport {
  jobName: string;
  label: string;
  category: string;
  critical: boolean;
  schedule: string;
  humanSchedule: string;
  // Per-window stats
  windows: {
    h24: WindowStats;
    h48: WindowStats;
    h72: WindowStats;
  };
  // Full run list within selected window
  runs: RunDetail[];
  // Derived health
  health: "healthy" | "warning" | "failing" | "idle";
  healthReason: string;
}

interface WindowStats {
  total: number;
  completed: number;
  failed: number;
  timedOut: number;
  partial: number;
  running: number;
  successRate: number; // 0–100
  avgDurationMs: number | null;
  avgDurationFormatted: string;
  totalItemsProcessed: number;
  totalItemsFailed: number;
}

function fmtDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function computeWindowStats(
  logs: Array<{
    status: string;
    duration_ms: number | null;
    timed_out: boolean;
    items_processed: number;
    items_succeeded: number;
    items_failed: number;
  }>,
): WindowStats {
  const total = logs.length;
  const completed = logs.filter((l) => l.status === "completed").length;
  const failed = logs.filter((l) => l.status === "failed").length;
  const timedOut = logs.filter((l) => l.timed_out).length;
  const partial = logs.filter((l) => l.status === "partial").length;
  const running = logs.filter((l) => l.status === "running").length;

  const durLogs = logs.filter((l) => l.duration_ms !== null && l.duration_ms !== undefined);
  const avgDurationMs =
    durLogs.length > 0
      ? Math.round(durLogs.reduce((sum, l) => sum + (l.duration_ms || 0), 0) / durLogs.length)
      : null;

  return {
    total,
    completed,
    failed,
    timedOut,
    partial,
    running,
    successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    avgDurationMs,
    avgDurationFormatted: fmtDuration(avgDurationMs),
    totalItemsProcessed: logs.reduce((sum, l) => sum + (l.items_processed || 0), 0),
    totalItemsFailed: logs.reduce((sum, l) => sum + (l.items_failed || 0), 0),
  };
}

function deriveHealth(
  h24: WindowStats,
  h48: WindowStats,
  h72: WindowStats,
): { health: JobReport["health"]; reason: string } {
  // No runs at all in 72h
  if (h72.total === 0) {
    return { health: "idle", reason: "No runs in the last 72 hours" };
  }

  // Recent 24h failures
  if (h24.total > 0 && h24.successRate < 50) {
    return {
      health: "failing",
      reason: `Only ${h24.successRate}% success rate in the last 24h (${h24.failed} failures)`,
    };
  }

  // 48h window
  if (h48.total > 0 && h48.successRate < 60) {
    return {
      health: "failing",
      reason: `${h48.successRate}% success rate over 48h — consistent failures`,
    };
  }

  // Warning if any recent failures
  if (h24.failed > 0 || h24.timedOut > 0) {
    return {
      health: "warning",
      reason: `${h24.failed + h24.timedOut} failure(s) in the last 24h, but mostly healthy`,
    };
  }

  if (h48.failed > 0 || h48.timedOut > 0) {
    return {
      health: "warning",
      reason: `${h48.failed + h48.timedOut} failure(s) in the last 48h`,
    };
  }

  return { health: "healthy", reason: `100% success rate (${h72.completed} runs in 72h)` };
}

export const GET = withAdminAuth(async (request: NextRequest) => {
  const url = new URL(request.url);
  const hoursParam = parseInt(url.searchParams.get("hours") ?? "72", 10);
  const hours = [24, 48, 72].includes(hoursParam) ? hoursParam : 72;
  const categoryFilter = url.searchParams.get("category") || "";

  try {
    const { prisma } = await import("@/lib/db");

    const since72h = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Fetch all logs in the 72h window in one query
    const allLogs = await (prisma as any).cronJobLog.findMany({
      where: { started_at: { gte: since72h } },
      orderBy: { started_at: "desc" },
      take: 5000,
      select: {
        id: true,
        job_name: true,
        status: true,
        started_at: true,
        completed_at: true,
        duration_ms: true,
        items_processed: true,
        items_succeeded: true,
        items_failed: true,
        error_message: true,
        timed_out: true,
        result_summary: true,
        site_id: true,
        sites_processed: true,
      },
    });

    // Group by job_name
    const byJob: Record<string, typeof allLogs> = {};
    for (const log of allLogs) {
      if (!byJob[log.job_name]) byJob[log.job_name] = [];
      byJob[log.job_name].push(log);
    }

    // Build per-job reports from JOB_META
    const reports: JobReport[] = [];
    const usedJobNames = new Set<string>();

    for (const [key, meta] of Object.entries(JOB_META)) {
      if (categoryFilter && meta.category !== categoryFilter) continue;

      const logName = meta.logName ?? key;
      usedJobNames.add(logName);
      const logs = byJob[logName] || [];

      const logs24h = logs.filter((l: any) => new Date(l.started_at) >= since24h);
      const logs48h = logs.filter((l: any) => new Date(l.started_at) >= since48h);
      const logs72h = logs;

      const w24 = computeWindowStats(logs24h);
      const w48 = computeWindowStats(logs48h);
      const w72 = computeWindowStats(logs72h);

      // Select which logs to return based on requested window
      const windowLogs = hours === 24 ? logs24h : hours === 48 ? logs48h : logs72h;

      const runs: RunDetail[] = windowLogs.map((log: any) => {
        const interpreted = log.error_message ? interpretError(log.error_message) : null;
        return {
          id: log.id,
          status: log.status,
          startedAt: log.started_at?.toISOString(),
          completedAt: log.completed_at?.toISOString() ?? null,
          durationMs: log.duration_ms,
          durationFormatted: fmtDuration(log.duration_ms),
          itemsProcessed: log.items_processed ?? 0,
          itemsSucceeded: log.items_succeeded ?? 0,
          itemsFailed: log.items_failed ?? 0,
          errorMessage: log.error_message,
          errorPlain: interpreted?.plain ?? null,
          errorFix: interpreted?.fix ?? null,
          errorSeverity: interpreted?.severity ?? null,
          timedOut: log.timed_out ?? false,
          siteId: log.site_id,
          sitesProcessed: log.sites_processed ?? [],
        };
      });

      const { health, reason } = deriveHealth(w24, w48, w72);

      reports.push({
        jobName: logName,
        label: meta.label,
        category: meta.category,
        critical: meta.critical,
        schedule: meta.schedule,
        humanSchedule: meta.humanSchedule,
        windows: { h24: w24, h48: w48, h72: w72 },
        runs,
        health,
        healthReason: reason,
      });
    }

    // Also include any jobs in the DB that aren't in JOB_META (ad-hoc or renamed)
    for (const [jobName, logs] of Object.entries(byJob)) {
      if (usedJobNames.has(jobName)) continue;
      if (categoryFilter) continue; // unknown jobs have no category to filter by

      const logs24h = (logs as any[]).filter((l: any) => new Date(l.started_at) >= since24h);
      const logs48h = (logs as any[]).filter((l: any) => new Date(l.started_at) >= since48h);
      const logs72h = logs as any[];

      const w24 = computeWindowStats(logs24h);
      const w48 = computeWindowStats(logs48h);
      const w72 = computeWindowStats(logs72h);

      const windowLogs = hours === 24 ? logs24h : hours === 48 ? logs48h : logs72h;

      const runs: RunDetail[] = windowLogs.map((log: any) => {
        const interpreted = log.error_message ? interpretError(log.error_message) : null;
        return {
          id: log.id,
          status: log.status,
          startedAt: log.started_at?.toISOString(),
          completedAt: log.completed_at?.toISOString() ?? null,
          durationMs: log.duration_ms,
          durationFormatted: fmtDuration(log.duration_ms),
          itemsProcessed: log.items_processed ?? 0,
          itemsSucceeded: log.items_succeeded ?? 0,
          itemsFailed: log.items_failed ?? 0,
          errorMessage: log.error_message,
          errorPlain: interpreted?.plain ?? null,
          errorFix: interpreted?.fix ?? null,
          errorSeverity: interpreted?.severity ?? null,
          timedOut: log.timed_out ?? false,
          siteId: log.site_id,
          sitesProcessed: log.sites_processed ?? [],
        };
      });

      const { health, reason } = deriveHealth(w24, w48, w72);

      reports.push({
        jobName,
        label: jobName,
        category: "unknown",
        critical: false,
        schedule: "—",
        humanSchedule: "Unknown schedule",
        windows: { h24: w24, h48: w48, h72: w72 },
        runs,
        health,
        healthReason: reason,
      });
    }

    // Sort: failing first, then warning, then idle, then healthy. Within same health, critical first.
    const healthOrder = { failing: 0, warning: 1, idle: 2, healthy: 3 };
    reports.sort((a, b) => {
      const h = healthOrder[a.health] - healthOrder[b.health];
      if (h !== 0) return h;
      if (a.critical !== b.critical) return a.critical ? -1 : 1;
      return a.label.localeCompare(b.label);
    });

    // Global summary
    const globalStats = {
      totalJobs: reports.length,
      healthy: reports.filter((r) => r.health === "healthy").length,
      warning: reports.filter((r) => r.health === "warning").length,
      failing: reports.filter((r) => r.health === "failing").length,
      idle: reports.filter((r) => r.health === "idle").length,
      totalRuns24h: reports.reduce((s, r) => s + r.windows.h24.total, 0),
      totalRuns48h: reports.reduce((s, r) => s + r.windows.h48.total, 0),
      totalRuns72h: reports.reduce((s, r) => s + r.windows.h72.total, 0),
      overallSuccessRate24h: (() => {
        const total = reports.reduce((s, r) => s + r.windows.h24.total, 0);
        const completed = reports.reduce((s, r) => s + r.windows.h24.completed, 0);
        return total > 0 ? Math.round((completed / total) * 100) : 0;
      })(),
      overallSuccessRate72h: (() => {
        const total = reports.reduce((s, r) => s + r.windows.h72.total, 0);
        const completed = reports.reduce((s, r) => s + r.windows.h72.completed, 0);
        return total > 0 ? Math.round((completed / total) * 100) : 0;
      })(),
      criticalFailures: reports.filter((r) => r.critical && r.health === "failing").length,
    };

    return NextResponse.json({
      reports,
      summary: globalStats,
      selectedWindow: hours,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron-monitor] API error:", err);
    return NextResponse.json(
      { error: "Failed to load cron monitor data", reports: [], summary: null },
      { status: 500 },
    );
  }
});
