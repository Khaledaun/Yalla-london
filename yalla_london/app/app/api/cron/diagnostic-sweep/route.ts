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

  // Auth: standard pattern
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
