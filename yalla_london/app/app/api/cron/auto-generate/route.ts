export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { autoContentScheduler } from '@/lib/content-automation/auto-scheduler';
import { logCronExecution } from "@/lib/cron-logger";
import { timingSafeEqual } from 'crypto';

/** SECURITY: Constant-time string comparison to prevent timing attacks */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(new Uint8Array(Buffer.from(a)), new Uint8Array(Buffer.from(b)));
}

// Cron endpoint for automatic content generation
export async function POST(request: NextRequest) {
  // SECURITY: Require CRON_SECRET — fail closed if not configured
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // SECURITY: Use timing-safe comparison for bearer token
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !safeCompare(authHeader, `Bearer ${cronSecret}`)) {
    console.error('Unauthorized cron request');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
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
    console.error('Cron job failed:', error);
    await logCronExecution("auto-generate", "failed", {
      durationMs: Date.now() - _cronStart,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
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
