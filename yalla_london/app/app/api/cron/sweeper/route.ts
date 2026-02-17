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

async function handleSweeper(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runSweeper } = await import("@/lib/content-pipeline/sweeper");
  const result = await runSweeper();

  // If sweeper itself failed, log it (but don't trigger sweeper recursively)
  if (!result.success) {
    console.error(`[sweeper] Sweeper run failed: ${result.message}`);
  }

  return NextResponse.json(
    { ...result, timestamp: new Date().toISOString() },
    { status: result.success ? 200 : 500 },
  );
}

export async function GET(request: NextRequest) {
  return handleSweeper(request);
}

export async function POST(request: NextRequest) {
  return handleSweeper(request);
}
