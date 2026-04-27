export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Audit Roundup Cron — Runs twice daily (07:00 + 19:00 UTC per vercel.json)
 *
 * Pulls the audit-roundup aggregator → filters to top auto-fixable actions →
 * executes them within budget → logs each fix to AutoFixLog with before/after
 * snapshots so Batch 8's enrichment layer can compute real ROI 7d later.
 *
 * Budget: 280s (300s maxDuration − 20s buffer).
 * Per-fix budget: 30s (caps a single slow cron from eating the whole window).
 * Max fixes per run: 10 (so one run can't shred half the site if scoring goes
 * sideways).
 *
 * Auth: CRON_SECRET (scheduled) OR admin session (manual dashboard trigger).
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";
import { runAuditRoundup } from "@/app/api/admin/audit-roundup/route";
import { getActiveSiteIds } from "@/config/sites";
import { prisma } from "@/lib/db";

const TOTAL_BUDGET_MS = 280_000;
const PER_FIX_BUDGET_MS = 30_000;
const MAX_FIXES_PER_RUN = 10;
// Minimum ROI score to bother executing — anything lower wastes the cron run.
const MIN_ROI_SCORE = 50;

interface FixOutcome {
  site: string;
  source: string;
  dimension?: string;
  severity: string;
  detail: string;
  cron?: string;
  roiScore: number;
  status: "executed" | "skipped" | "failed" | "escalated";
  durationMs: number;
  error?: string;
  resultSummary?: unknown;
}

async function callCronInternal(
  path: string,
  cronSecret: string,
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(PER_FIX_BUDGET_MS - 1000),
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { ok: res.ok, data };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function logFixToAutoFixLog(
  siteId: string,
  fixType: string,
  agent: string,
  before: unknown,
  after: unknown,
  success: boolean,
  errorMsg?: string,
) {
  try {
    await prisma.autoFixLog.create({
      data: {
        siteId,
        targetType: "audit-roundup",
        targetId: `roundup-${Date.now()}`,
        fixType,
        agent,
        before: (before as Record<string, unknown>) ?? null,
        after: (after as Record<string, unknown>) ?? null,
        success,
        error: errorMsg,
      },
    });
  } catch (err: unknown) {
    console.warn("[audit-roundup] AutoFixLog write failed:", err instanceof Error ? err.message : String(err));
  }
}

async function processSite(siteId: string, cronSecret: string, remainingBudgetMs: number): Promise<FixOutcome[]> {
  const siteStart = Date.now();
  const outcomes: FixOutcome[] = [];

  let report;
  try {
    report = await runAuditRoundup(siteId);
  } catch (err: unknown) {
    outcomes.push({
      site: siteId,
      source: "roundup-error",
      severity: "high",
      detail: "runAuditRoundup() failed",
      roiScore: 0,
      status: "failed",
      durationMs: Date.now() - siteStart,
      error: err instanceof Error ? err.message : String(err),
    });
    return outcomes;
  }

  const fixable = report.topActions
    .filter((a) => a.fixability === "auto" && a.cron && a.roiScore >= MIN_ROI_SCORE)
    .slice(0, MAX_FIXES_PER_RUN);

  // De-dup so we don't fire the same cron twice in one run (multiple findings
  // can route to the same auto-fix).
  const seen = new Set<string>();
  const queue = fixable.filter((f) => {
    if (!f.cron) return false;
    if (seen.has(f.cron)) return false;
    seen.add(f.cron);
    return true;
  });

  for (const action of queue) {
    const elapsed = Date.now() - siteStart;
    if (elapsed > remainingBudgetMs - PER_FIX_BUDGET_MS) {
      outcomes.push({
        site: siteId,
        source: action.source,
        dimension: action.dimension,
        severity: action.severity,
        detail: action.detail,
        cron: action.cron,
        roiScore: action.roiScore,
        status: "skipped",
        durationMs: 0,
        error: "site budget exhausted",
      });
      continue;
    }

    const fixStart = Date.now();
    const result = await callCronInternal(action.cron!, cronSecret);
    const fixDuration = Date.now() - fixStart;
    const success = result.ok;

    outcomes.push({
      site: siteId,
      source: action.source,
      dimension: action.dimension,
      severity: action.severity,
      detail: action.detail,
      cron: action.cron,
      roiScore: action.roiScore,
      status: success ? "executed" : "failed",
      durationMs: fixDuration,
      error: success ? undefined : result.error,
      resultSummary: result.data,
    });

    // before-snapshot is the finding itself; after-snapshot is the cron's
    // immediate response. Real ROI computation (GSC delta 7d later) lives in
    // the Batch 8 enrichment layer.
    await logFixToAutoFixLog(
      siteId,
      `roundup:${action.dimension || action.source}`,
      "audit-roundup",
      {
        severity: action.severity,
        detail: action.detail,
        affectedSlug: action.affectedSlug,
        roiScore: action.roiScore,
        cron: action.cron,
        capturedAt: new Date().toISOString(),
      },
      {
        cronResponse: result.data,
        cronOk: result.ok,
        durationMs: fixDuration,
      },
      success,
      success ? undefined : result.error,
    );
  }

  return outcomes;
}

async function handleAuditRoundup(request: NextRequest) {
  const cronStart = Date.now();

  // Auth: CRON_SECRET (scheduled) OR admin session (manual).
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const hasCronAuth = !cronSecret || authHeader === `Bearer ${cronSecret}`;
  if (!hasCronAuth) {
    const { requireAdmin } = await import("@/lib/admin-middleware");
    const authError = await requireAdmin(request);
    if (authError) return authError;
  }

  // Feature flag guard.
  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const flagResponse = await checkCronEnabled("audit-roundup");
  if (flagResponse) return flagResponse;

  // Healthcheck mode.
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    return NextResponse.json({
      status: "healthy",
      endpoint: "audit-roundup",
      timestamp: new Date().toISOString(),
    });
  }

  const sites = getActiveSiteIds();
  const allOutcomes: FixOutcome[] = [];
  let executedCount = 0;
  let failedCount = 0;
  let escalatedCount = 0;

  try {
    for (const siteId of sites) {
      const elapsed = Date.now() - cronStart;
      const remaining = TOTAL_BUDGET_MS - elapsed;
      if (remaining < 60_000) {
        // Less than 60s left — don't even start another site.
        break;
      }
      const perSiteBudget = Math.floor(remaining / Math.max(1, sites.length));
      const outcomes = await processSite(siteId, cronSecret || "dev", Math.max(perSiteBudget, 60_000));
      allOutcomes.push(...outcomes);
      executedCount += outcomes.filter((o) => o.status === "executed").length;
      failedCount += outcomes.filter((o) => o.status === "failed").length;
      escalatedCount += outcomes.filter((o) => o.status === "escalated").length;
    }
  } catch (err: unknown) {
    const totalDuration = Date.now() - cronStart;
    await logCronExecution("audit-roundup", "failed", {
      durationMs: totalDuration,
      itemsProcessed: allOutcomes.length,
      resultSummary: { error: err instanceof Error ? err.message : String(err), partial: allOutcomes },
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  const totalDuration = Date.now() - cronStart;
  const overallSuccess = failedCount === 0;

  await logCronExecution("audit-roundup", overallSuccess ? "completed" : "failed", {
    durationMs: totalDuration,
    itemsProcessed: allOutcomes.length,
    itemsSucceeded: executedCount,
    itemsFailed: failedCount,
    resultSummary: {
      sites: sites.length,
      executed: executedCount,
      failed: failedCount,
      escalated: escalatedCount,
      durationMs: totalDuration,
      outcomes: allOutcomes.map((o) => ({
        site: o.site,
        source: o.source,
        dimension: o.dimension,
        cron: o.cron,
        status: o.status,
        roiScore: o.roiScore,
      })),
    },
  });

  return NextResponse.json({
    success: overallSuccess,
    sites: sites.length,
    executed: executedCount,
    failed: failedCount,
    escalated: escalatedCount,
    durationMs: totalDuration,
    outcomes: allOutcomes,
  });
}

export const GET = handleAuditRoundup;
export const POST = handleAuditRoundup;
