/**
 * Health Audit — Cron Job Checks
 *
 * 4 checks: cron job registry/schedule compliance, error rate,
 * diagnostic sweep status, content freshness cron.
 */

import {
  type AuditConfig,
  type CheckResult,
  makeResult,
  runCheck,
} from "@/lib/health-audit/types";

/** Known crons with expected run intervals in minutes */
const KNOWN_CRONS: Record<string, { intervalMin: number; label: string }> = {
  "content-builder":       { intervalMin: 15,     label: "Content Builder (phases)" },
  "content-builder-create":{ intervalMin: 30,     label: "Content Builder (create)" },
  "content-selector":      { intervalMin: 360,    label: "Content Selector" },
  "daily-content-generate":{ intervalMin: 1440,   label: "Daily Content Generate" },
  "content-auto-fix-lite": { intervalMin: 240,    label: "Content Auto-Fix Lite" },
  "content-auto-fix":      { intervalMin: 720,    label: "Content Auto-Fix" },
  "diagnostic-sweep":      { intervalMin: 120,    label: "Diagnostic Sweep" },
  "seo-agent":             { intervalMin: 480,    label: "SEO Agent" },
  "weekly-topics":         { intervalMin: 10080,  label: "Weekly Topics" },
};

/* ------------------------------------------------------------------ */
/* 1. Cron job registry — schedule compliance                          */
/* ------------------------------------------------------------------ */
async function cronJobRegistry(config: AuditConfig): Promise<CheckResult> {
  const { prisma } = await import("@/lib/db");
  const now = new Date();

  // Get distinct job names and their latest run
  const jobs = await prisma.cronJobLog.groupBy({
    by: ["job_name"],
    _max: { started_at: true },
    _count: { id: true },
  });

  const jobMap: Record<string, { lastRun: Date | null; runCount: number }> = {};
  for (const j of jobs) {
    jobMap[j.job_name] = {
      lastRun: j._max.started_at,
      runCount: j._count.id,
    };
  }

  // Get last status for each known cron
  const registry: {
    name: string;
    label: string;
    expectedIntervalMin: number;
    lastRun: string | null;
    lastStatus: string | null;
    avgDurationMs: number | null;
    missedCycles: number;
  }[] = [];

  const missed: string[] = [];

  for (const [cronName, spec] of Object.entries(KNOWN_CRONS)) {
    const info = jobMap[cronName];
    let lastStatus: string | null = null;
    let avgDurationMs: number | null = null;
    let missedCycles = 0;

    if (info?.lastRun) {
      // Get last status
      const lastLog = await prisma.cronJobLog.findFirst({
        where: { job_name: cronName },
        orderBy: { started_at: "desc" },
        select: { status: true },
      });
      lastStatus = lastLog?.status ?? null;

      // Avg duration from last 10 runs
      const recentLogs = await prisma.cronJobLog.findMany({
        where: { job_name: cronName, duration_ms: { not: null } },
        orderBy: { started_at: "desc" },
        select: { duration_ms: true },
        take: 10,
      });
      if (recentLogs.length > 0) {
        const sum = recentLogs.reduce((acc, l) => acc + (l.duration_ms ?? 0), 0);
        avgDurationMs = Math.round(sum / recentLogs.length);
      }

      // Missed cycles
      const elapsedMin = (now.getTime() - info.lastRun.getTime()) / 60_000;
      missedCycles = Math.max(0, Math.floor(elapsedMin / spec.intervalMin) - 1);
    } else {
      missedCycles = 99; // Never ran
    }

    if (missedCycles >= 2) missed.push(cronName);

    registry.push({
      name: cronName,
      label: spec.label,
      expectedIntervalMin: spec.intervalMin,
      lastRun: info?.lastRun?.toISOString() ?? null,
      lastStatus,
      avgDurationMs,
      missedCycles,
    });
  }

  // Unknown crons (in DB but not in KNOWN_CRONS)
  const unknownCrons = Object.keys(jobMap).filter(n => !(n in KNOWN_CRONS));

  const status =
    missed.length > 0 ? "fail" :
    unknownCrons.length > 0 ? "warn" :
    "pass";

  return makeResult(status, {
    knownCrons: Object.keys(KNOWN_CRONS).length,
    registeredInDb: Object.keys(jobMap).length,
    unknownCrons,
    missedCrons: missed,
    registry,
  }, {
    ...(missed.length > 0 && {
      error: `${missed.length} cron(s) missed 2+ cycles: ${missed.join(", ")}`,
      action: "Check Vercel cron schedule and deployment logs. Run missed crons from Departures Board.",
    }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 2. Cron error rate (last 7 days)                                    */
/* ------------------------------------------------------------------ */
async function cronErrorRate(config: AuditConfig): Promise<CheckResult> {
  const { prisma } = await import("@/lib/db");
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3_600_000);

  const [total, completed, failed, timedOut] = await Promise.all([
    prisma.cronJobLog.count({ where: { started_at: { gte: sevenDaysAgo } } }),
    prisma.cronJobLog.count({ where: { started_at: { gte: sevenDaysAgo }, status: "completed" } }),
    prisma.cronJobLog.count({ where: { started_at: { gte: sevenDaysAgo }, status: "failed" } }),
    prisma.cronJobLog.count({ where: { started_at: { gte: sevenDaysAgo }, status: "timed_out" } }),
  ]);

  const errorCount = failed + timedOut;
  const errorRate = total > 0 ? Math.round((errorCount / total) * 100) : 0;

  // Get recent errors for context
  const recentErrors = await prisma.cronJobLog.findMany({
    where: {
      started_at: { gte: sevenDaysAgo },
      status: { in: ["failed", "timed_out"] },
    },
    orderBy: { started_at: "desc" },
    select: { job_name: true, status: true, error_message: true, started_at: true },
    take: 5,
  });

  const status =
    total === 0 ? "skip" :
    errorRate < 5 ? "pass" :
    errorRate < 15 ? "warn" :
    "fail";

  return makeResult(status, {
    total,
    completed,
    failed,
    timedOut,
    errorRate,
    recentErrors: recentErrors.map(e => ({
      job: e.job_name,
      status: e.status,
      error: e.error_message?.slice(0, 200) ?? null,
      at: e.started_at?.toISOString() ?? null,
    })),
  }, {
    ...(status === "skip" && { action: "No cron runs in 7 days. Cron jobs may not be deployed." }),
    ...(status === "warn" && { action: `Cron error rate is ${errorRate}%. Review recent failures in Cron Logs.` }),
    ...(status === "fail" && {
      error: `Cron error rate is ${errorRate}% (${errorCount}/${total} runs failed)`,
      action: "Critical cron failure rate. Check Vercel function logs and Departures Board immediately.",
    }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 3. Diagnostic sweep status                                          */
/* ------------------------------------------------------------------ */
async function diagnosticSweepStatus(config: AuditConfig): Promise<CheckResult> {
  const { prisma } = await import("@/lib/db");
  const twentyFourHAgo = new Date(Date.now() - 24 * 3_600_000);

  const lastSweep = await prisma.cronJobLog.findFirst({
    where: { job_name: "diagnostic-sweep" },
    orderBy: { started_at: "desc" },
    select: {
      status: true,
      started_at: true,
      duration_ms: true,
      items_processed: true,
      items_succeeded: true,
      items_failed: true,
      result_summary: true,
    },
  });

  if (!lastSweep || !lastSweep.started_at) {
    return makeResult("fail", { lastRun: null, hasNeverRun: true }, {
      error: "Diagnostic sweep has never run",
      action: "Run diagnostic-sweep from Departures Board or check cron schedule.",
    }) as CheckResult;
  }

  const ranRecently = lastSweep.started_at > twentyFourHAgo;
  const succeeded = lastSweep.status === "completed";
  const fixesApplied = lastSweep.items_succeeded ?? 0;
  const issuesFound = lastSweep.items_processed ?? 0;

  // Parse result_summary for details
  let summaryDetails: Record<string, unknown> = {};
  try {
    if (lastSweep.result_summary && typeof lastSweep.result_summary === "object") {
      summaryDetails = lastSweep.result_summary as Record<string, unknown>;
    }
  } catch {
    // Ignore parse errors
  }

  const status =
    !ranRecently ? "fail" :
    !succeeded || issuesFound > 0 ? "warn" :
    "pass";

  return makeResult(status, {
    lastRun: lastSweep.started_at.toISOString(),
    status: lastSweep.status,
    durationMs: lastSweep.duration_ms,
    issuesFound,
    fixesApplied,
    failedFixes: lastSweep.items_failed ?? 0,
    ranRecently,
    summary: summaryDetails,
  }, {
    ...(!ranRecently && {
      error: "Diagnostic sweep hasn't run in 24+ hours",
      action: "Run diagnostic-sweep from Departures Board. Check if cron is scheduled.",
    }),
    ...(ranRecently && issuesFound > 0 && {
      action: `Last sweep found ${issuesFound} issue(s), applied ${fixesApplied} fix(es). Review Auto-Fix Log.`,
    }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 4. Content freshness cron                                           */
/* ------------------------------------------------------------------ */
async function contentFreshnessCron(config: AuditConfig): Promise<CheckResult> {
  const { prisma } = await import("@/lib/db");
  const fortyEightHAgo = new Date(Date.now() - 48 * 3_600_000);

  // Look for either variant
  const lastRun = await prisma.cronJobLog.findFirst({
    where: {
      job_name: { in: ["content-auto-fix-lite", "content-auto-fix"] },
    },
    orderBy: { started_at: "desc" },
    select: {
      job_name: true,
      status: true,
      started_at: true,
      duration_ms: true,
      items_processed: true,
      items_succeeded: true,
      items_failed: true,
      error_message: true,
    },
  });

  if (!lastRun || !lastRun.started_at) {
    return makeResult("fail", { lastRun: null, hasNeverRun: true }, {
      error: "Content auto-fix cron has never run",
      action: "Verify content-auto-fix is scheduled in vercel.json and deploy.",
    }) as CheckResult;
  }

  const ranRecently = lastRun.started_at > fortyEightHAgo;
  const succeeded = lastRun.status === "completed";
  const hadErrors = (lastRun.items_failed ?? 0) > 0;

  const status =
    !ranRecently ? "fail" :
    !succeeded || hadErrors ? "warn" :
    "pass";

  return makeResult(status, {
    lastRun: lastRun.started_at.toISOString(),
    cronName: lastRun.job_name,
    status: lastRun.status,
    durationMs: lastRun.duration_ms,
    itemsProcessed: lastRun.items_processed ?? 0,
    itemsFixed: lastRun.items_succeeded ?? 0,
    itemsFailed: lastRun.items_failed ?? 0,
    ranRecently,
    errorMessage: lastRun.error_message?.slice(0, 200) ?? null,
  }, {
    ...(!ranRecently && {
      error: "Content auto-fix hasn't run in 48+ hours",
      action: "Run content-auto-fix from Departures Board. Check vercel.json cron schedule.",
    }),
    ...(ranRecently && hadErrors && {
      action: `Last run had ${lastRun.items_failed} failed fix(es). Check error: ${lastRun.error_message?.slice(0, 100) ?? "unknown"}`,
    }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* Exported runner                                                     */
/* ------------------------------------------------------------------ */
export async function runCronJobChecks(
  config: AuditConfig
): Promise<Record<string, CheckResult>> {
  const checks: Record<string, (c: AuditConfig) => Promise<CheckResult>> = {
    cronJobRegistry: cronJobRegistry,
    cronErrorRate: cronErrorRate,
    diagnosticSweepStatus: diagnosticSweepStatus,
    contentFreshnessCron: contentFreshnessCron,
  };

  const results: Record<string, CheckResult> = {};
  for (const [name, fn] of Object.entries(checks)) {
    results[name] = await runCheck(name, fn, config);
  }
  return results;
}
