export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logCronExecution } from "@/lib/cron-logger";

/**
 * Weekly Topic Generation Cron Job
 * Generates 30 topics weekly + triggers on low backlog
 */
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
    console.log('🕐 Weekly topic generation cron triggered');

    // Check feature flags directly
    const phase4bEnabled = process.env.FEATURE_PHASE4B_ENABLED === 'true';
    const topicResearchEnabled = process.env.FEATURE_TOPIC_RESEARCH === 'true';
    
    if (!phase4bEnabled || !topicResearchEnabled) {
      console.log('⚠️ Phase 4B or topic research disabled');
      return NextResponse.json(
        { error: 'Topic research feature is disabled' },
        { status: 403 }
      );
    }

    // Check current topic backlog
    const pendingCount = await prisma.topicProposal.count({
      where: { status: 'proposed' }
    });

    console.log(`📊 Current pending topics: ${pendingCount}`);

    let shouldGenerate = false;
    let reason = '';

    // Check if it's time for weekly generation (run on Sundays)
    const today = new Date();
    const isWeeklySchedule = today.getDay() === 0; // Sunday = 0

    // Check for low backlog trigger
    const isLowBacklog = pendingCount < 10;

    if (isWeeklySchedule) {
      shouldGenerate = true;
      reason = 'weekly_scheduled';
    } else if (isLowBacklog) {
      shouldGenerate = true;
      reason = 'low_backlog_trigger';
    }

    if (!shouldGenerate) {
      console.log('⏭️ No generation needed - sufficient backlog and not weekly schedule');
      return NextResponse.json({
        success: true,
        message: 'No topic generation needed',
        pendingCount,
        reason: 'sufficient_backlog',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`🎯 Generating topics - reason: ${reason}`);

    // Call Perplexity directly instead of self-fetching through the HTTP endpoint
    // (avoids rate-limiter, cold-start loops, and auth indirection on Vercel)
    const pplxKey = process.env.PPLX_API_KEY || process.env.PERPLEXITY_API_KEY;
    if (!pplxKey) {
      throw new Error('Topic generation failed: PPLX_API_KEY or PERPLEXITY_API_KEY is missing from env vars');
    }

    const topicData = await generateTopicsDirect(pplxKey, 'weekly_mixed', 'en');

    // Generate Arabic topics as well
    let arabicData = null;
    try {
      arabicData = await generateTopicsDirect(pplxKey, 'weekly_mixed', 'ar');
    } catch (e) {
      console.warn('Arabic topic generation failed:', e instanceof Error ? e.message : e);
    }

    // Log generation results
    const totalGenerated = (topicData?.topics?.length || 0) + (arabicData?.topics?.length || 0);
    console.log(`✅ Topic generation completed: ${totalGenerated} topics created`);

    await logCronExecution("weekly-topics", "completed", {
      durationMs: Date.now() - _cronStart,
      itemsProcessed: totalGenerated,
      resultSummary: {
        reason,
        english: topicData?.topics?.length || 0,
        arabic: arabicData?.topics?.length || 0,
        total: totalGenerated,
        pendingCountBefore: pendingCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Weekly topic generation completed',
      reason,
      generated: {
        english: topicData?.topics?.length || 0,
        arabic: arabicData?.topics?.length || 0,
        total: totalGenerated,
      },
      pendingCountBefore: pendingCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Weekly topic generation failed:', error);
    await logCronExecution("weekly-topics", "failed", {
      durationMs: Date.now() - _cronStart,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { 
        error: 'Weekly topic generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET handler — supports both healthcheck and real execution for Vercel cron compatibility
export async function GET(request: NextRequest) {
  // Healthcheck mode — quick status without generating topics
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    const pendingCount = await prisma.topicProposal.count({
      where: { status: 'proposed' }
    });

    return NextResponse.json({
      status: 'healthy',
      endpoint: 'weekly-topics cron',
      pendingTopics: pendingCount,
      lowBacklog: pendingCount < 10,
      nextWeeklyRun: getNextSunday(),
      timestamp: new Date().toISOString()
    });
  }

  // Real execution — delegate to POST handler
  return POST(request);
}

function getNextSunday(): string {
  const today = new Date();
  const daysUntilSunday = (7 - today.getDay()) % 7;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  return nextSunday.toISOString();
}

/**
 * Call Perplexity API directly — same logic as /api/phase4b/topics/research
 * but without the HTTP round-trip, rate limiter, and feature-flag re-check.
 */
async function generateTopicsDirect(
  apiKey: string,
  category: string,
  locale: string,
): Promise<{ topics: any[] }> {
  const prompt = `You are a London-local editor. Suggest 5 timely article topics for "${category}"
in locale "${locale}" with short slugs and 1-2 authority sources each (domain only).
Return strict JSON array with objects: {title, slug, rationale, sources: string[]}`;

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(30_000), // 30s max
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Perplexity API HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const content: string =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.delta?.content ??
    '';

  let parsed: any[] = [];
  try {
    const maybe = JSON.parse(content);
    if (Array.isArray(maybe)) parsed = maybe;
  } catch { /* ignore parse failures */ }

  return { topics: parsed.slice(0, 5) };
}