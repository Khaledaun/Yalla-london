export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 120;

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

    // Feature flags — default to enabled so the pipeline works out of the box.
    // Set FEATURE_TOPIC_RESEARCH=false to explicitly disable.
    const topicResearchDisabled = process.env.FEATURE_TOPIC_RESEARCH === 'false';

    if (topicResearchDisabled) {
      console.log('[weekly-topics] Topic research explicitly disabled via FEATURE_TOPIC_RESEARCH=false');
      return NextResponse.json({
        success: true,
        message: 'Topic research disabled by feature flag',
        timestamp: new Date().toISOString(),
      });
    }

    // Check current topic backlog (count all unused topics)
    const pendingCount = await prisma.topicProposal.count({
      where: { status: { in: ['proposed', 'ready', 'queued', 'planned'] } }
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

    // Priority: Grok Live Search (real-time web + X data) → Perplexity → AI provider fallback
    const grokAvailable = !!(process.env.XAI_API_KEY || process.env.GROK_API_KEY);
    const pplxKey = process.env.PPLX_API_KEY || process.env.PERPLEXITY_API_KEY;

    let topicData: { topics: any[] };
    let arabicData: { topics: any[] } | null = null;

    if (grokAvailable) {
      console.log('[weekly-topics] Using Grok Live Search (web + X) for real-time topic research');
      topicData = await generateTopicsViaGrok('London', 'en');
      try {
        arabicData = await generateTopicsViaGrok('London', 'ar');
      } catch (e) {
        console.warn('Arabic topic generation (Grok) failed:', e instanceof Error ? e.message : e);
      }
    } else if (pplxKey) {
      topicData = await generateTopicsDirect(pplxKey, 'weekly_mixed', 'en');
      try {
        arabicData = await generateTopicsDirect(pplxKey, 'weekly_mixed', 'ar');
      } catch (e) {
        console.warn('Arabic topic generation failed:', e instanceof Error ? e.message : e);
      }
    } else {
      console.log('[weekly-topics] No Grok/Perplexity key, using AI provider fallback');
      topicData = await generateTopicsViaAIProvider('weekly_mixed', 'en');
      try {
        arabicData = await generateTopicsViaAIProvider('weekly_mixed', 'ar');
      } catch (e) {
        console.warn('Arabic topic generation (AI fallback) failed:', e instanceof Error ? e.message : e);
      }
    }

    // Persist generated topics as TopicProposal rows
    const allTopics = [
      ...(topicData?.topics || []).map((t: any) => ({ ...t, locale: 'en' })),
      ...(arabicData?.topics || []).map((t: any) => ({ ...t, locale: 'ar' })),
    ];

    let savedCount = 0;
    for (const t of allTopics) {
      try {
        const keyword = t.slug || t.title || '';
        if (!keyword) continue;
        // Skip duplicates
        const exists = await prisma.topicProposal.findFirst({
          where: { primary_keyword: keyword, locale: t.locale },
        });
        if (exists) continue;

        await prisma.topicProposal.create({
          data: {
            title: t.title || keyword,
            description: t.rationale || '',
            primary_keyword: keyword,
            longtails: [],
            questions: [],
            suggested_page_type: 'guide',
            locale: t.locale,
            status: 'ready',
            confidence_score: 0.7,
            source: 'weekly-topics-cron',
            evergreen: false,
            authority_links_json: { sources: t.sources || [] },
          },
        });
        savedCount++;
      } catch (saveErr) {
        console.warn(`[weekly-topics] Failed to save topic "${t.title}":`, saveErr instanceof Error ? saveErr.message : saveErr);
      }
    }

    // Log generation results
    const englishCount = topicData?.topics?.length || 0;
    const arabicCount = arabicData?.topics?.length || 0;
    const totalGenerated = englishCount + arabicCount;
    console.log(`Topic generation completed: ${totalGenerated} topics generated (${savedCount} new, ${totalGenerated - savedCount} duplicates skipped)`);

    await logCronExecution("weekly-topics", "completed", {
      durationMs: Date.now() - _cronStart,
      itemsProcessed: savedCount,
      resultSummary: {
        reason,
        english: englishCount,
        arabic: arabicCount,
        total: totalGenerated,
        newSaved: savedCount,
        duplicatesSkipped: totalGenerated - savedCount,
        pendingCountBefore: pendingCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Weekly topic generation completed',
      reason,
      generated: {
        english: englishCount,
        arabic: arabicCount,
        total: totalGenerated,
        newSaved: savedCount,
        duplicatesSkipped: totalGenerated - savedCount,
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

/**
 * Fallback: generate topics via the unified AI provider layer (Claude/OpenAI/Gemini)
 * when Perplexity API key is not configured.
 */
async function generateTopicsViaAIProvider(
  category: string,
  locale: string,
): Promise<{ topics: any[] }> {
  const { generateJSON } = await import('@/lib/ai/provider');

  const prompt = locale === 'en'
    ? `You are a London-local editor for a luxury travel platform targeting Arab travelers.
Suggest 5 timely, SEO-worthy article topics for the category "${category}".
Each topic should have a short URL slug and 1-2 authority source domains.
Return a strict JSON array: [{title, slug, rationale, sources: ["domain.com"]}]`
    : `أنت محرر محلي في لندن لمنصة سفر فاخرة تستهدف المسافرين العرب.
اقترح 5 مواضيع مقالات مناسبة لفئة "${category}".
لكل موضوع عنوان قصير وسلاغ URL ومصدرين موثوقين.
أرجع مصفوفة JSON: [{title, slug, rationale, sources: ["domain.com"]}]`;

  const result = await Promise.race([
    generateJSON<any[]>(prompt, {
      maxTokens: 1024,
      temperature: 0.5,
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI topic generation timed out after 30s')), 30_000)
    ),
  ]);

  const topics = Array.isArray(result) ? result.slice(0, 5) : [];
  return { topics };
}

/**
 * Generate topics via Grok Live Search (Responses API with web_search + x_search).
 * Uses real-time web and X/Twitter data for the most up-to-date trending topics.
 * This is the preferred method when XAI_API_KEY is configured.
 */
async function generateTopicsViaGrok(
  destination: string,
  locale: string,
): Promise<{ topics: any[] }> {
  const { searchTrendingTopics } = await import('@/lib/ai/grok-live-search');

  const result = await Promise.race([
    searchTrendingTopics(destination, locale),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Grok topic research timed out after 45s')), 45_000)
    ),
  ]);

  // Parse the JSON response from Grok
  let topics: any[] = [];
  try {
    let jsonStr = result.content.trim();
    // Strip markdown code fences if present
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);
    topics = Array.isArray(parsed) ? parsed.slice(0, 10) : [];
  } catch (parseErr) {
    console.warn('[weekly-topics] Failed to parse Grok response as JSON:', parseErr instanceof Error ? parseErr.message : parseErr);
    console.warn('[weekly-topics] Raw Grok response:', result.content.slice(0, 500));
  }

  console.log(`[weekly-topics] Grok returned ${topics.length} topics (${locale}) using ${result.usage.totalTokens} tokens`);
  return { topics };
}