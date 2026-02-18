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

    // Get posts scheduled for now or earlier that haven't been published
    const duePosts = await prisma.scheduledContent.findMany({
      where: {
        scheduled_time: { lte: now },
        status: 'pending',
        published: false,
        platform: { not: 'blog' },
      },
      take: 20,
    });

    const results = [];

    for (const post of duePosts) {
      try {
        // Get social account for this platform
        const account = await prisma.modelProvider.findFirst({
          where: {
            name: post.platform,
            provider_type: 'social',
            is_active: true,
          },
        });

        if (!account || !account.api_key_encrypted) {
          // Mark as failed - no account connected
          await prisma.scheduledContent.update({
            where: { id: post.id },
            data: {
              status: 'failed',
              metadata: {
                ...(post.metadata as any || {}),
                error: 'Social account not connected — configure a social ModelProvider for this platform',
                failedAt: now.toISOString(),
              },
            },
          });

          results.push({
            postId: post.id,
            platform: post.platform,
            status: 'failed',
            reason: 'Account not connected',
          });
          continue;
        }

        // TODO: Integrate real social media APIs (Twitter/X, Instagram, LinkedIn)
        // Currently a mock — marks as published in DB but does NOT post to any platform.
        console.warn(
          `[social-cron] MOCK PUBLISH: Post ${post.id} for ${post.platform} — social API not integrated yet`
        );

        await prisma.scheduledContent.update({
          where: { id: post.id },
          data: {
            status: 'published',
            published: true,
            published_time: now,
            metadata: {
              ...(post.metadata as any || {}),
              publishedAt: now.toISOString(),
              note: 'Mock publish — social API not integrated yet',
            },
          },
        });

        results.push({
          postId: post.id,
          platform: post.platform,
          status: 'published',
          note: 'Mock — social API not integrated',
        });
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
          platform: post.platform,
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
        mockPublish: true,
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      postsProcessed: duePosts.length,
      published,
      failed,
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
