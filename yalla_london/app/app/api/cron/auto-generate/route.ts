export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { autoContentScheduler } from '@/lib/content-automation/auto-scheduler';
import { logCronExecution } from "@/lib/cron-logger";

// Cron endpoint for automatic content generation
export async function POST(request: NextRequest) {
  // Auth: allow if CRON_SECRET not set, reject if set and doesn't match
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const _cronStart = Date.now();

  try {
    console.log('Cron job triggered: auto-generate');

    // Run the auto content scheduler
    await autoContentScheduler.processAutoGeneration();

    await logCronExecution("auto-generate", "completed", {
      durationMs: Date.now() - _cronStart,
      resultSummary: { message: "Auto-generation process completed" },
    });

    return NextResponse.json({
      success: true,
      message: 'Auto-generation process completed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Cron job failed:', error);
    await logCronExecution("auto-generate", "failed", {
      durationMs: Date.now() - _cronStart,
      errorMessage: errMsg,
    });

    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    onCronFailure({ jobName: "auto-generate", error: errMsg }).catch(() => {});

    // SECURITY: Do not leak error details to client
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}

// GET handler — supports both healthcheck and real execution for Vercel cron compatibility
export async function GET(request: NextRequest) {
  // Healthcheck mode — quick status without generating content
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    return NextResponse.json({
      status: 'healthy',
      endpoint: 'auto-generate cron',
      timestamp: new Date().toISOString()
    });
  }

  // Real execution — delegate to POST handler
  return POST(request);
}
