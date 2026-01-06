/**
 * Social Media Posting Cron Endpoint
 * Publishes scheduled social media posts every 15 minutes.
 * Configured in vercel.json crons array.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
                error: 'Social account not connected',
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

        // In production, decrypt token and call social media API
        // For now, mark as published (mock)
        await prisma.scheduledContent.update({
          where: { id: post.id },
          data: {
            status: 'published',
            published: true,
            published_time: now,
            metadata: {
              ...(post.metadata as any || {}),
              publishedAt: now.toISOString(),
              note: 'Mock publish - integrate social API for real posting',
            },
          },
        });

        results.push({
          postId: post.id,
          platform: post.platform,
          status: 'published',
          note: 'Mock - connect social API',
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

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      postsProcessed: duePosts.length,
      results,
    });
  } catch (error) {
    console.error('Social cron failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
