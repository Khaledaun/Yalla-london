export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Sweeper Agent — Automatic Failure Recovery
 *
 * Runs after the content pipeline. Scans for:
 * 1. Rejected drafts with retryable errors (JSON parse, timeout, rate limit)
 * 2. Stuck drafts (no update for 2+ hours)
 * 3. Drafts at max retry count with fixable errors
 *
 * Diagnoses each failure, applies the fix, and restarts the draft.
 * Core logic in @/lib/content-pipeline/sweeper.
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

async function handleSweeper(request: NextRequest) {
  const cronStart = Date.now();
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { runSweeper } = await import("@/lib/content-pipeline/sweeper");
    const result = await runSweeper();

    const durationMs = Date.now() - cronStart;

    const resultAny = result as unknown as Record<string, unknown>;

    if (!result.success) {
      console.error(`[sweeper] Sweeper run failed: ${result.message}`);
      await logCronExecution("sweeper", "failed", {
        durationMs,
        errorMessage: result.message || "Sweeper failed",
        resultSummary: resultAny,
      });
      // Note: Don't call onCronFailure — sweeper IS the recovery agent. Recursive loops = bad.
    } else {
      await logCronExecution("sweeper", "completed", {
        durationMs,
        itemsProcessed: (resultAny.recovered as number) || 0,
        itemsSucceeded: (resultAny.recovered as number) || 0,
        resultSummary: resultAny,
      });
    }

    return NextResponse.json(
      { ...result, timestamp: new Date().toISOString() },
      { status: result.success ? 200 : 500 },
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - cronStart;
    console.error(`[sweeper] Sweeper crashed:`, errMsg);

    await logCronExecution("sweeper", "failed", {
      durationMs,
      errorMessage: errMsg,
    });

    return NextResponse.json(
      { success: false, error: errMsg, timestamp: new Date().toISOString() },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleSweeper(request);
}

export async function POST(request: NextRequest) {
  return handleSweeper(request);
}
