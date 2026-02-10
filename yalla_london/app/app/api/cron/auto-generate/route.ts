export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { NextRequest, NextResponse } from 'next/server';
import { autoContentScheduler } from '@/lib/content-automation/auto-scheduler';
import { logCronExecution } from "@/lib/cron-logger";


// Cron endpoint for automatic content generation
export async function POST(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('❌ Unauthorized cron request');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const _cronStart = Date.now();

  try {
    console.log('🕐 Cron job triggered: auto-generate');

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
    console.error('❌ Cron job failed:', error);
    await logCronExecution("auto-generate", "failed", {
      durationMs: Date.now() - _cronStart,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { 
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'auto-generate cron',
    timestamp: new Date().toISOString()
  });
}
