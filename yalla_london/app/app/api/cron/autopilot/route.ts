export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Autopilot Cron Endpoint
 *
 * Triggered by Vercel cron or external scheduler to run due tasks.
 *
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/autopilot",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { runDueTasks } from '@/lib/scheduler';
import { logCronExecution } from "@/lib/cron-logger";

// Vercel cron requires GET method
export async function GET(request: NextRequest) {
  // Auth: allow if CRON_SECRET not set, reject if set and doesn't match
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const _cronStart = Date.now();

  try {
    const { withTimeout } = await import('@/lib/resilience');
    // 53s budget (60s maxDuration on Vercel Pro - 7s buffer for response + logging)
    const result = await withTimeout(runDueTasks(), 53_000, 'Autopilot runDueTasks');

    await logCronExecution("autopilot", "completed", {
      durationMs: Date.now() - _cronStart,
      resultSummary: result as Record<string, unknown>,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.message.includes('timed out');
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Cron autopilot failed:', error);
    await logCronExecution("autopilot", timedOut ? "timed_out" : "failed", {
      durationMs: Date.now() - _cronStart,
      errorMessage: errMsg,
    });

    if (!timedOut) {
      const { onCronFailure } = await import("@/lib/ops/failure-hooks");
      onCronFailure({ jobName: "autopilot", error: errMsg }).catch(() => {});
    }

    return NextResponse.json(
      {
        success: false,
        error: errMsg,
        timedOut,
        timestamp: new Date().toISOString(),
      },
      { status: timedOut ? 200 : 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  // Auth: allow if CRON_SECRET not set, reject if set and doesn't match
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runDueTasks();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error('Manual autopilot trigger failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Manual trigger failed',
      },
      { status: 500 }
    );
  }
}
