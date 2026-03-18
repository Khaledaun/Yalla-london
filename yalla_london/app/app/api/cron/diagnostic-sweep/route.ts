export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Diagnostic Sweep — Runs every 2 hours
 *
 * 3-phase diagnostic agent:
 *   1. DIAGNOSE: Find stuck drafts (3+ attempts or 2+ hours) and failed crons (last 4h)
 *   2. FIX: Reset timeouts, force raw assembly for stuck drafts, repair bad data
 *   3. VERIFY: Confirm fixes took effect, log full trail to AutoFixLog
 *
 * This is the "janitor" cron — it cleans up what other crons couldn't handle.
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

async function handleDiagnosticSweep(request: NextRequest) {
  const cronStart = Date.now();

  // Auth: accept CRON_SECRET (for scheduled runs) OR admin session (for dashboard button)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const hasCronAuth = !cronSecret || authHeader === `Bearer ${cronSecret}`;
  if (!hasCronAuth) {
    // Fallback: check if caller is an authenticated admin (cockpit dashboard calls)
    const { requireAdmin } = await import("@/lib/admin-middleware");
    const authError = await requireAdmin(request);
    if (authError) return authError;
  }

  // Feature flag guard — can be disabled via DB flag or env var CRON_DIAGNOSTIC_SWEEP=false
  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const flagResponse = await checkCronEnabled("diagnostic-sweep");
  if (flagResponse) return flagResponse;

  // Healthcheck mode
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    return NextResponse.json({
      status: "healthy",
      endpoint: "diagnostic-sweep",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const { runDiagnosticSweep } = await import("@/lib/ops/diagnostic-agent");

    // Check for cron failures and send alert emails
    try {
      const { checkAndAlertCronFailures } = await import("@/lib/ops/cron-alerting");
      const alertResult = await checkAndAlertCronFailures();
      console.log(`[diagnostic-sweep] Alert check: ${alertResult.message}`);
    } catch (alertErr) {
      console.warn("[diagnostic-sweep] Alert check failed:", (alertErr as Error).message);
    }

    const result = await runDiagnosticSweep();

    const durationMs = Date.now() - cronStart;

    await logCronExecution("diagnostic-sweep", "completed", {
      durationMs,
      itemsProcessed: result.diagnoses.length,
      itemsSucceeded: result.verifications.filter((v) => v.verified).length,
      resultSummary: {
        stuckDrafts: result.stuckDrafts,
        failedCrons: result.failedCrons,
        fixesApplied: result.fixes.filter((f) => f.success).length,
        summary: result.summary,
      },
    }).catch((logErr: unknown) => {
      console.warn("[diagnostic-sweep] logCronExecution error:", logErr instanceof Error ? logErr.message : logErr);
    });

    return NextResponse.json({
      success: true,
      ...result,
      durationMs,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - cronStart;

    await logCronExecution("diagnostic-sweep", "failed", {
      durationMs,
      errorMessage: errMsg,
    }).catch((logErr: unknown) => {
      console.warn("[diagnostic-sweep] logCronExecution (catch) error:", logErr instanceof Error ? logErr.message : logErr);
    });

    return NextResponse.json(
      { success: false, error: errMsg, timestamp: new Date().toISOString() },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleDiagnosticSweep(request);
}

export async function POST(request: NextRequest) {
  return handleDiagnosticSweep(request);
}
