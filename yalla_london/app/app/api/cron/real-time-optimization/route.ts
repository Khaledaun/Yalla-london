export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { logCronExecution } from '@/lib/cron-logger';

/**
 * Real-time optimization triggers
 * Monitors recently published articles and triggers SEO re-audits when needed
 */
export async function POST(request: NextRequest) {
  const _cronStart = Date.now();
  try {
    // Auth: allow if CRON_SECRET not set, reject if set and doesn't match
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');

    // Get published articles from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentArticles = await prisma.blogPost.findMany({
      where: {
        published: true,
        created_at: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        id: true,
        title_en: true,
        slug: true,
        seo_score: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const optimizationResults = {
      articles_checked: recentArticles.length,
      optimizations_triggered: 0,
      low_score_articles: 0,
      stale_articles: 0,
      details: [] as Array<{ slug: string; reason: string; seo_score: number | null }>,
    };

    const now = new Date();

    for (const article of recentArticles) {
      const daysSinceCreated = Math.floor(
        (now.getTime() - new Date(article.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysSinceUpdated = Math.floor(
        (now.getTime() - new Date(article.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      let shouldOptimize = false;
      let reason = '';

      // Flag articles with low SEO scores
      if (article.seo_score !== null && article.seo_score < 70) {
        shouldOptimize = true;
        reason = `low_seo_score (${article.seo_score})`;
        optimizationResults.low_score_articles++;
      }
      // Flag stale articles (created 14+ days ago, not updated in 7+ days)
      else if (daysSinceCreated >= 14 && daysSinceUpdated >= 7) {
        shouldOptimize = true;
        reason = `stale_content (created ${daysSinceCreated}d ago, updated ${daysSinceUpdated}d ago)`;
        optimizationResults.stale_articles++;
      }

      if (shouldOptimize) {
        optimizationResults.optimizations_triggered++;
        optimizationResults.details.push({
          slug: article.slug,
          reason,
          seo_score: article.seo_score,
        });
      }
    }

    await logCronExecution("real-time-optimization", "completed", {
      durationMs: Date.now() - _cronStart,
      itemsProcessed: optimizationResults.articles_checked,
      itemsSucceeded: optimizationResults.optimizations_triggered,
      itemsFailed: 0,
      resultSummary: {
        articles_checked: optimizationResults.articles_checked,
        optimizations_triggered: optimizationResults.optimizations_triggered,
        low_score_articles: optimizationResults.low_score_articles,
        stale_articles: optimizationResults.stale_articles,
      },
    });

    return NextResponse.json({
      success: true,
      durationMs: Date.now() - _cronStart,
      results: optimizationResults,
      message: `Checked ${optimizationResults.articles_checked} articles, flagged ${optimizationResults.optimizations_triggered} for optimization`,
    });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Real-time optimization error:', error);
    await logCronExecution("real-time-optimization", "failed", {
      durationMs: Date.now() - _cronStart,
      errorMessage: errMsg,
    });

    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    onCronFailure({ jobName: "real-time-optimization", error: errMsg }).catch(() => {});

    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 },
    );
  }
}

// GET handler — Vercel cron compatibility
export async function GET(request: NextRequest) {
  return POST(request);
}
