export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logCronExecution } from "@/lib/cron-logger";
import { onCronFailure } from "@/lib/ops/failure-hooks";

/**
 * Weekly Topic Generation Cron Job
 * Generates 30 topics weekly + triggers on low backlog
 */
export async function POST(request: NextRequest) {
  // Verify cron secret for security (optional — Vercel sends it when CRON_SECRET is set)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('❌ Unauthorized cron request');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const _cronStart = Date.now();
  const BUDGET_MS = 53_000; // 53s usable out of 120s maxDuration
  const budgetLeft = () => BUDGET_MS - (Date.now() - _cronStart);

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

    // ─── Per-site topic generation ──────────────────────────────────────
    // Each active site gets topics generated for its own destination.
    // This prevents London travel topics from being assigned to yacht sites.
    const { getActiveSiteIds, getSiteConfig, getDefaultSiteId } = await import('@/config/sites');
    const activeSiteIds = getActiveSiteIds();
    const primarySiteId = activeSiteIds[0] || getDefaultSiteId();
    const targetSiteIds = activeSiteIds.length > 0 ? activeSiteIds : [primarySiteId];

    const today = new Date();
    const isWeeklySchedule = today.getDay() === 1; // Monday = 1 (matches vercel.json "0 4 * * 1")

    const grokAvailable = !!(process.env.XAI_API_KEY || process.env.GROK_API_KEY);
    const pplxKey = process.env.PPLX_API_KEY || process.env.PERPLEXITY_API_KEY;

    let savedCount = 0;
    let totalGenerated = 0;
    let reason = '';
    const perSiteResults: Record<string, { pending: number; generated: number; saved: number }> = {};

    for (const targetSiteId of targetSiteIds) {
      if (budgetLeft() < 10_000) {
        console.log(`[weekly-topics] Budget low (${budgetLeft()}ms), stopping site loop`);
        break;
      }

      // Skip yacht sites — they use a different content model (Yacht, YachtDestination, CharterItinerary)
      // and don't need TopicProposals generated through the blog topic pipeline
      const { isYachtSite } = await import('@/config/sites');
      if (isYachtSite(targetSiteId)) {
        console.log(`[weekly-topics] Skipping ${targetSiteId} — yacht site uses different content model`);
        perSiteResults[targetSiteId] = { pending: 0, generated: 0, saved: 0 };
        continue;
      }

      const siteConfig = getSiteConfig(targetSiteId);
      const siteDestination = siteConfig?.destination || 'luxury travel';

      // Per-site backlog check (ZY-004 fix)
      const pendingCount = await prisma.topicProposal.count({
        where: { site_id: targetSiteId, status: { in: ['proposed', 'ready', 'queued', 'planned'] } }
      });

      console.log(`[weekly-topics] Site ${targetSiteId}: ${pendingCount} pending, destination="${siteDestination}"`);

      const isLowBacklog = pendingCount < 10;
      let shouldGenerate = false;

      if (isWeeklySchedule) {
        shouldGenerate = true;
        reason = 'weekly_scheduled';
      } else if (isLowBacklog) {
        shouldGenerate = true;
        reason = 'low_backlog_trigger';
      }

      if (!shouldGenerate) {
        console.log(`[weekly-topics] Skipping ${targetSiteId} — sufficient backlog (${pendingCount})`);
        perSiteResults[targetSiteId] = { pending: pendingCount, generated: 0, saved: 0 };
        continue;
      }

      // ─── Generate topics with per-site destination ──────────────────
      let topicData: { topics: any[] } = { topics: [] };
      let arabicData: { topics: any[] } | null = null;
      let providerUsed = 'none';

      if (grokAvailable) {
        try {
          topicData = await generateTopicsViaGrok(siteDestination, 'en');
          providerUsed = 'grok';
        } catch (e) {
          console.warn(`[weekly-topics] Grok EN failed for ${targetSiteId}:`, e instanceof Error ? e.message : e);
        }
      }

      if (topicData.topics.length === 0 && pplxKey) {
        try {
          topicData = await generateTopicsDirect(pplxKey, 'weekly_mixed', 'en', siteDestination);
          providerUsed = 'perplexity';
        } catch (e) {
          console.warn(`[weekly-topics] Perplexity EN failed for ${targetSiteId}:`, e instanceof Error ? e.message : e);
        }
      }

      if (topicData.topics.length === 0) {
        try {
          topicData = await generateTopicsViaAIProvider('weekly_mixed', 'en', siteDestination);
          providerUsed = 'ai-provider';
        } catch (e) {
          console.warn(`[weekly-topics] AI provider EN failed for ${targetSiteId}:`, e instanceof Error ? e.message : e);
        }
      }

      // Arabic topics — budget-gated
      if (budgetLeft() > 15_000) {
        if (providerUsed === 'grok' && grokAvailable) {
          try {
            arabicData = await generateTopicsViaGrok(siteDestination, 'ar');
          } catch (e) {
            console.warn(`[weekly-topics] Grok AR failed for ${targetSiteId}:`, e instanceof Error ? e.message : e);
          }
        }
        if (!arabicData && pplxKey) {
          try {
            arabicData = await generateTopicsDirect(pplxKey, 'weekly_mixed', 'ar', siteDestination);
          } catch (e) {
            console.warn(`[weekly-topics] Perplexity AR failed for ${targetSiteId}:`, e instanceof Error ? e.message : e);
          }
        }
      }

      const allTopics = [
        ...(topicData?.topics || []).map((t: any) => ({ ...t, locale: 'en' })),
        ...(arabicData?.topics || []).map((t: any) => ({ ...t, locale: 'ar' })),
      ];

      totalGenerated += allTopics.length;
      let siteSaved = 0;

      for (const t of allTopics) {
        // Budget check — stop DB saves if we're running out of time
        if (budgetLeft() < 3_000) {
          console.log(`[weekly-topics] Budget exhausted during DB saves (${budgetLeft()}ms left), stopping`);
          break;
        }
        try {
          const keyword = t.slug || t.title || '';
          if (!keyword) continue;
          // Skip duplicates per site (check both topic proposals and published articles)
          const exists = await prisma.topicProposal.findFirst({
            where: { primary_keyword: keyword, locale: t.locale, site_id: targetSiteId },
          });
          if (exists) continue;

          // Skip if a published BlogPost already covers this keyword
          const keywordSlug = keyword.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 80);
          const publishedExists = await prisma.blogPost.findFirst({
            where: {
              siteId: targetSiteId,
              published: true,
              deletedAt: null,
              slug: { startsWith: keywordSlug },
            },
            select: { id: true },
          });
          if (publishedExists) {
            console.log(`[weekly-topics] Skipping "${keyword}" — published article already exists`);
            continue;
          }

          // Also skip if an ArticleDraft is already in the pipeline for this keyword
          // (prevents near-duplicate topics from entering the pipeline before the
          // first one has been published)
          const draftExists = await prisma.articleDraft.findFirst({
            where: {
              site_id: targetSiteId,
              keyword: { startsWith: keywordSlug },
              current_phase: { not: 'failed' },
            },
            select: { id: true },
          });
          if (draftExists) {
            console.log(`[weekly-topics] Skipping "${keyword}" — draft already in pipeline`);
            continue;
          }

          await prisma.topicProposal.create({
            data: {
              title: t.title || keyword,
              primary_keyword: keyword,
              longtails: [],
              questions: [],
              intent: 'info',
              suggested_page_type: 'guide',
              locale: t.locale,
              site_id: targetSiteId,
              status: 'ready',
              confidence_score: 0.7,
              evergreen: false,
              source_weights_json: { source: 'weekly-topics-cron', site: targetSiteId, destination: siteDestination },
              authority_links_json: { rationale: t.rationale || '', sources: t.sources || [] },
            },
          });
          savedCount++;
          siteSaved++;
        } catch (saveErr) {
          console.warn(`[weekly-topics] Failed to save topic "${t.title}" for ${targetSiteId}:`, saveErr instanceof Error ? saveErr.message : saveErr);
        }
      }

      perSiteResults[targetSiteId] = { pending: pendingCount, generated: allTopics.length, saved: siteSaved };
    } // end per-site loop

    console.log(`[weekly-topics] Completed: ${totalGenerated} topics generated, ${savedCount} saved across ${targetSiteIds.length} sites`);

    // Detect if zero topics were generated for content sites (not yacht sites)
    const contentSitesAttempted = Object.entries(perSiteResults).filter(
      ([, r]) => r.generated === 0 && r.pending < 10
    );
    const noAiProviders = !grokAvailable && !pplxKey && !process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY && !process.env.GOOGLE_API_KEY;

    // If we attempted generation but got 0 topics, that's a failure
    if (totalGenerated === 0 && contentSitesAttempted.length > 0) {
      const failureMessage = noAiProviders
        ? 'No AI API keys configured — set XAI_API_KEY, PPLX_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY to enable topic generation'
        : 'All AI providers failed to generate topics — check API key validity and provider status';

      console.warn(`[weekly-topics] ${failureMessage}`);

      await logCronExecution("weekly-topics", "failed", {
        durationMs: Date.now() - _cronStart,
        itemsProcessed: 0,
        errorMessage: failureMessage,
        resultSummary: {
          reason,
          total: 0,
          newSaved: 0,
          noAiProviders,
          perSite: perSiteResults,
        },
      });

      onCronFailure({ jobName: "weekly-topics", error: new Error(failureMessage) }).catch(() => {});

      return NextResponse.json({
        success: false,
        error: failureMessage,
        reason,
        generated: { total: 0, newSaved: 0, duplicatesSkipped: 0 },
        perSite: perSiteResults,
        timestamp: new Date().toISOString(),
      });
    }

    await logCronExecution("weekly-topics", "completed", {
      durationMs: Date.now() - _cronStart,
      itemsProcessed: savedCount,
      resultSummary: {
        reason,
        total: totalGenerated,
        newSaved: savedCount,
        duplicatesSkipped: totalGenerated - savedCount,
        perSite: perSiteResults,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Weekly topic generation completed',
      reason,
      generated: {
        total: totalGenerated,
        newSaved: savedCount,
        duplicatesSkipped: totalGenerated - savedCount,
      },
      perSite: perSiteResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Weekly topic generation failed:', error);
    await logCronExecution("weekly-topics", "failed", {
      durationMs: Date.now() - _cronStart,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    // Fire failure hook — checks topic backlog and raises alert if critical
    onCronFailure({ jobName: "weekly-topics", error }).catch(() => {});

    return NextResponse.json(
      { error: 'Weekly topic generation failed' },
      { status: 500 }
    );
  }
}

// GET handler — supports both healthcheck and real execution for Vercel cron compatibility
export async function GET(request: NextRequest) {
  // Healthcheck mode — quick status without generating topics
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    const { getActiveSiteIds, getDefaultSiteId } = await import('@/config/sites');
    const activeSiteIds = getActiveSiteIds();
    const siteIds = activeSiteIds.length > 0 ? activeSiteIds : [getDefaultSiteId()];

    const perSite: Record<string, { pending: number; lowBacklog: boolean }> = {};
    let totalPending = 0;

    for (const sid of siteIds) {
      const count = await prisma.topicProposal.count({
        where: { site_id: sid, status: { in: ['proposed', 'ready', 'queued', 'planned'] } }
      });
      perSite[sid] = { pending: count, lowBacklog: count < 10 };
      totalPending += count;
    }

    return NextResponse.json({
      status: 'healthy',
      endpoint: 'weekly-topics cron',
      pendingTopics: totalPending,
      lowBacklog: totalPending < 10,
      perSite,
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
  destination: string,
): Promise<{ topics: any[] }> {
  const prompt = `You are a local editor specializing in ${destination}. Suggest 5 timely article topics about ${destination} for "${category}"
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
  destination: string,
): Promise<{ topics: any[] }> {
  const { generateJSON } = await import('@/lib/ai/provider');

  const prompt = locale === 'en'
    ? `You are a local editor specializing in ${destination} for a luxury travel platform targeting Arab travelers.
Suggest 5 timely, SEO-worthy article topics about ${destination} for the category "${category}".
Each topic should have a short URL slug and 1-2 authority source domains.
Return a strict JSON array: [{title, slug, rationale, sources: ["domain.com"]}]`
    : `أنت محرر متخصص في ${destination} لمنصة سفر فاخرة تستهدف المسافرين العرب.
اقترح 5 مواضيع مقالات عن ${destination} مناسبة لفئة "${category}".
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
      setTimeout(() => reject(new Error('Grok topic research timed out after 20s')), 20_000)
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