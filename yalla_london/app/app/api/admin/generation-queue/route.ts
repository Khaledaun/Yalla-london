/**
 * Content Generation Queue Status API
 *
 * Provides real-time visibility into the content generation pipeline.
 * Shows pending, in-progress, completed, and failed generation jobs.
 *
 * GET /api/admin/generation-queue
 *   Query params: status, type, language, page, limit
 *   Returns: queue items, summary stats, recent activity
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const QuerySchema = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  language: z.string().optional(),
  page: z
    .string()
    .transform((v) => parseInt(v, 10))
    .default('1'),
  limit: z
    .string()
    .transform((v) => Math.min(parseInt(v, 10), 100))
    .default('20'),
});

// ---------------------------------------------------------------------------
// GET — Queue status and items
// ---------------------------------------------------------------------------

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const params = QuerySchema.safeParse(Object.fromEntries(searchParams.entries()));

    if (!params.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: params.error.issues },
        { status: 400 },
      );
    }

    const { status, type, language, page, limit } = params.data;
    const offset = (page - 1) * limit;

    // Build where clause for ScheduledContent
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.content_type = type;
    }

    if (language) {
      where.language = language;
    }

    // Fetch queue items, summary stats, and recent cron logs in parallel
    const [items, totalCount, statusStats, recentLogs, dailyGenCount] = await Promise.all([
      // Queue items
      prisma.scheduledContent.findMany({
        where: where as any,
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          title: true,
          content_type: true,
          language: true,
          category: true,
          tags: true,
          status: true,
          scheduled_time: true,
          published_time: true,
          published: true,
          page_type: true,
          seo_score: true,
          generation_source: true,
          created_at: true,
          updated_at: true,
          metadata: true,
        },
      }),

      // Total count for pagination
      prisma.scheduledContent.count({ where: where as any }),

      // Status breakdown
      prisma.scheduledContent.groupBy({
        by: ['status'],
        _count: true,
      }),

      // Recent cron execution logs (last 10)
      prisma.auditLog.findMany({
        where: {
          action: { in: ['cron_auto_generate', 'cron_autopilot', 'content_version'] },
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          details: true,
          success: true,
          timestamp: true,
        },
      }),

      // Today's generation count (for daily budget tracking)
      prisma.scheduledContent.count({
        where: {
          created_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    // Build status summary
    const statusSummary: Record<string, number> = {
      pending: 0,
      published: 0,
      failed: 0,
      cancelled: 0,
    };
    for (const stat of statusStats) {
      statusSummary[stat.status] = stat._count;
    }

    // Transform items for response
    const queueItems = items.map((item) => {
      const meta = item.metadata as any;
      return {
        id: item.id,
        title: item.title,
        content_type: item.content_type,
        language: item.language,
        category: item.category,
        tags: item.tags,
        status: item.status,
        page_type: item.page_type,
        seo_score: item.seo_score,
        generation_source: item.generation_source,
        scheduled_time: item.scheduled_time?.toISOString(),
        published_time: item.published_time?.toISOString(),
        published: item.published,
        created_at: item.created_at.toISOString(),
        updated_at: item.updated_at.toISOString(),
        meta_title: meta?.metaTitle,
        meta_description: meta?.metaDescription,
      };
    });

    return NextResponse.json({
      success: true,
      queue: queueItems,
      summary: {
        ...statusSummary,
        total: totalCount,
        daily_generated: dailyGenCount,
        daily_budget: 20, // MAX_GENERATIONS_PER_DAY from auto-scheduler
        budget_remaining: Math.max(0, 20 - dailyGenCount),
      },
      recent_activity: recentLogs.map((log) => ({
        id: log.id,
        action: log.action,
        success: log.success,
        timestamp: log.timestamp.toISOString(),
        details: log.details,
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch generation queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch generation queue' },
      { status: 500 },
    );
  }
});
