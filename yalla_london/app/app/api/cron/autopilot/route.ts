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
import { timingSafeEqual } from 'crypto';

/** SECURITY: Constant-time string comparison to prevent timing attacks */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(new Uint8Array(Buffer.from(a)), new Uint8Array(Buffer.from(b)));
}

// Vercel cron requires GET method
export async function GET(request: NextRequest) {
  // SECURITY: Require CRON_SECRET — fail closed if not configured
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET not configured — rejecting cron request');
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 500 }
    );
  }

  // SECURITY: Validate authorization header with timing-safe comparison
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !safeCompare(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const _cronStart = Date.now();

  try {
    const { withTimeout } = await import('@/lib/resilience');
    // 110s budget (120s maxDuration - 10s buffer for response + logging)
    const result = await withTimeout(runDueTasks(), 110_000, 'Autopilot runDueTasks');

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
    console.error('Cron autopilot failed:', error);
    await logCronExecution("autopilot", timedOut ? "timed_out" : "failed", {
      durationMs: Date.now() - _cronStart,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Cron job failed',
        timedOut,
        timestamp: new Date().toISOString(),
      },
      { status: timedOut ? 200 : 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  // SECURITY: Require CRON_SECRET — fail closed if not configured
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET not configured — rejecting manual trigger');
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { secret } = body;

    // SECURITY: Validate secret with timing-safe comparison
    if (!secret || !safeCompare(secret, cronSecret)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
