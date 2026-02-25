export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Social Media Posting Cron Endpoint
 * Publishes scheduled social media posts every 15 minutes.
 * Configured in vercel.json crons array.
 *
 * NOTE: Social API integration is not yet connected.
 * Posts are currently marked as published in the database but are NOT
 * actually sent to any social platform. Connect real social APIs
 * (Twitter/X, Instagram, LinkedIn, etc.) to enable actual posting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logCronExecution } from '@/lib/cron-logger';

async function handleSocialCron(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Healthcheck mode — quick status without processing
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    try {
      const pendingPosts = await prisma.scheduledContent.count({
        where: {
          status: 'pending',
          published: false,
          platform: { not: 'blog' },
        },
      });
      return NextResponse.json({
        status: 'healthy',
        endpoint: 'social cron',
        pendingPosts,
        timestamp: new Date().toISOString(),
      });
    } catch {
      return NextResponse.json(
        { status: 'unhealthy', endpoint: 'social cron' },
        { status: 503 },
      );
    }
  }

  const _cronStart = Date.now();

  try {
    const now = new Date();

    // Check which platforms can be auto-published via env-var credentials.
    // Twitter/X: fully automated when TWITTER_* env vars are configured.
    // All other platforms: require manual publishing via the social calendar dashboard.
    const twitterConfigured = !!(
      process.env.TWITTER_API_KEY &&
      process.env.TWITTER_API_SECRET &&
      process.env.TWITTER_ACCESS_TOKEN &&
      (process.env.TWITTER_ACCESS_TOKEN_SECRET || process.env.TWITTER_ACCESS_SECRET)
    );

    // Only fetch posts for platforms we can actually auto-publish.
    // Other platforms (Instagram, TikTok, LinkedIn) stay pending until Khaled
    // publishes them manually via /admin/social-calendar.
    const autoPublishPlatforms = twitterConfigured ? ['twitter', 'x'] : [];

    // Count pending non-auto posts for dashboard visibility
    const pendingManualCount = await prisma.scheduledContent.count({
      where: {
        scheduled_time: { lte: now },
        status: 'pending',
        published: false,
        platform: { notIn: ['blog', ...autoPublishPlatforms] },
      },
    }).catch(() => 0);

    let duePosts: any[] = [];
    if (autoPublishPlatforms.length > 0) {
      // Retry with backoff to handle PgBouncer MaxClientsInSessionMode errors
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          duePosts = await prisma.scheduledContent.findMany({
            where: {
              scheduled_time: { lte: now },
              status: 'pending',
              published: false,
              platform: { in: autoPublishPlatforms },
            },
            take: 20,
          });
          break;
        } catch (dbErr) {
          const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
          if (attempt < maxRetries && (msg.includes('MaxClients') || msg.includes('FATAL') || msg.includes('connection'))) {
            const delayMs = attempt * 2000;
            console.warn(`[social-cron] DB connection failed (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms: ${msg}`);
            await new Promise(r => setTimeout(r, delayMs));
          } else {
            throw dbErr;
          }
        }
      }
    }

    const results = [];

    for (const post of duePosts) {
      const platform = (post.platform || '').toLowerCase();
      try {
        if (platform === 'twitter' || platform === 'x') {
          // Real Twitter/X publish via twitter-api-v2 (credentials from env vars)
          const { publishPost } = await import('@/lib/social/scheduler');
          const result = await publishPost(post.id);
          if (result.success) {
            console.log(`[social-cron] Published tweet for post ${post.id}: ${result.postUrl}`);
          } else {
            console.warn(`[social-cron] Tweet failed for post ${post.id}: ${result.error}`);
          }
          results.push({
            postId: post.id,
            platform,
            status: result.success ? 'published' : 'failed',
            postUrl: result.postUrl,
            reason: result.error,
          });
        } else {
          // Should not reach here given the query filter — defensive log only
          console.warn(`[social-cron] Unexpected platform in auto-publish queue: ${platform} (post ${post.id})`);
        }
      } catch (error) {
        // Mark individual post as failed
        await prisma.scheduledContent.update({
          where: { id: post.id },
          data: {
            status: 'failed',
            metadata: {
              ...(post.metadata as any || {}),
              error: error instanceof Error ? error.message : 'Unknown error',
              failedAt: now.toISOString(),
            },
          },
        });

        results.push({
          postId: post.id,
          platform,
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const published = results.filter((r) => r.status === 'published').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    await logCronExecution("social", "completed", {
      durationMs: Date.now() - _cronStart,
      itemsProcessed: duePosts.length,
      itemsSucceeded: published,
      itemsFailed: failed,
      resultSummary: {
        postsProcessed: duePosts.length,
        published,
        failed,
        twitterEnabled: twitterConfigured,
        pendingManual: pendingManualCount,
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      postsProcessed: duePosts.length,
      published,
      failed,
      twitterEnabled: twitterConfigured,
      pendingManual: pendingManualCount,
      results,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Social cron failed:', error);
    await logCronExecution("social", "failed", {
      durationMs: Date.now() - _cronStart,
      errorMessage: errMsg,
    });

    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    onCronFailure({ jobName: "social", error: errMsg }).catch(() => {});

    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleSocialCron(request);
}

export async function POST(request: NextRequest) {
  return handleSocialCron(request);
}
