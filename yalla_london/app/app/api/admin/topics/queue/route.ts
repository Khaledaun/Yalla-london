/**
 * Topic-to-Content Bridge API
 * Automatically queues approved topics for content generation
 *
 * GET  - Get queued topics and queue status
 * POST - Queue topics for content generation
 * PUT  - Update queue priorities or reschedule
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireAdmin } from "@/lib/admin-middleware";

// Validation schemas
const QueueTopicsSchema = z.object({
  topicIds: z.array(z.string()).min(1),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  scheduledTime: z.string().datetime().optional(),
  autoGenerate: z.boolean().default(false),
  generateImmediately: z.boolean().default(false),
});

const UpdateQueueSchema = z.object({
  topicId: z.string(),
  action: z.enum(['prioritize', 'deprioritize', 'reschedule', 'remove', 'pause', 'resume']),
  newScheduledTime: z.string().datetime().optional(),
});

// Get queue status and queued topics
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'queued';
    const locale = searchParams.get('locale');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause
    const where: any = {};
    if (status !== 'all') {
      where.status = status;
    }
    if (locale) {
      where.locale = locale;
    }

    // Get queued topics
    const queuedTopics = await prisma.topicProposal.findMany({
      where,
      include: {
        scheduled_content: {
          orderBy: { scheduled_time: 'asc' },
          take: 1,
        },
      },
      orderBy: [
        { planned_at: 'asc' },
        { confidence_score: 'desc' },
      ],
      take: limit,
    });

    // Get queue statistics
    const [
      totalQueued,
      totalPending,
      totalGenerated,
      totalPublished,
      dueToday,
      dueThisWeek,
    ] = await Promise.all([
      prisma.topicProposal.count({ where: { status: 'queued' } }),
      prisma.topicProposal.count({ where: { status: 'planned' } }),
      prisma.topicProposal.count({ where: { status: 'generated' } }),
      prisma.topicProposal.count({ where: { status: 'published' } }),
      prisma.topicProposal.count({
        where: {
          status: 'queued',
          planned_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      prisma.topicProposal.count({
        where: {
          status: 'queued',
          planned_at: {
            gte: new Date(),
            lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Transform topics with additional info
    const topics = queuedTopics.map(topic => ({
      id: topic.id,
      title: topic.title,
      locale: topic.locale,
      primaryKeyword: topic.primary_keyword,
      status: topic.status,
      confidenceScore: topic.confidence_score,
      plannedAt: topic.planned_at,
      pageType: topic.suggested_page_type,
      intent: topic.intent,
      evergreen: topic.evergreen,
      season: topic.season,
      longtails: topic.longtails,
      featuredLongtails: topic.featured_longtails,
      authorityLinks: topic.authority_links_json,
      questions: topic.questions,
      hasScheduledContent: topic.scheduled_content.length > 0,
      scheduledContentId: topic.scheduled_content[0]?.id,
      scheduledTime: topic.scheduled_content[0]?.scheduled_time,
      contentStatus: topic.scheduled_content[0]?.status,
      createdAt: topic.created_at,
      updatedAt: topic.updated_at,
    }));

    return NextResponse.json({
      success: true,
      queue: {
        topics,
        count: topics.length,
      },
      statistics: {
        queued: totalQueued,
        pending: totalPending,
        generated: totalGenerated,
        published: totalPublished,
        dueToday,
        dueThisWeek,
        total: totalQueued + totalPending + totalGenerated + totalPublished,
      },
      filters: {
        status,
        locale,
        limit,
      },
    });
  } catch (error) {
    console.error('Failed to get topic queue:', error);
    return NextResponse.json(
      { error: 'Failed to get topic queue' },
      { status: 500 }
    );
  }
}

// Queue topics for content generation
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    const validation = QueueTopicsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { topicIds, priority, scheduledTime, autoGenerate, generateImmediately } = validation.data;

    // Get the topics
    const topics = await prisma.topicProposal.findMany({
      where: { id: { in: topicIds } },
    });

    if (topics.length === 0) {
      return NextResponse.json(
        { error: 'No topics found with the provided IDs' },
        { status: 404 }
      );
    }

    const results: any[] = [];
    const errors: any[] = [];

    // Calculate base scheduled time
    let baseScheduleTime = scheduledTime
      ? new Date(scheduledTime)
      : getNextOptimalTime(priority);

    // Process each topic
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];

      try {
        // Calculate schedule time with offset for multiple topics
        const topicScheduleTime = new Date(baseScheduleTime.getTime() + i * 4 * 60 * 60 * 1000); // 4 hour intervals

        // Update topic status to queued
        await prisma.topicProposal.update({
          where: { id: topic.id },
          data: {
            status: 'queued',
            planned_at: topicScheduleTime,
            updated_at: new Date(),
          },
        });

        // Create scheduled content entry
        const scheduledContent = await prisma.scheduledContent.create({
          data: {
            title: topic.title,
            content: '', // Will be generated
            content_type: 'blog_post',
            language: topic.locale,
            scheduled_time: topicScheduleTime,
            status: generateImmediately ? 'generating' : 'pending',
            topic_proposal_id: topic.id,
            page_type: topic.suggested_page_type,
            generation_source: 'topic_queue',
            authority_links_used: topic.authority_links_json,
            longtails_used: topic.featured_longtails,
            metadata: {
              priority,
              queuedAt: new Date().toISOString(),
              autoGenerate,
              questions: topic.questions,
              intent: topic.intent,
            },
          },
        });

        // Trigger immediate generation if requested
        if (generateImmediately) {
          triggerContentGeneration(scheduledContent.id, topic);
        }

        results.push({
          topicId: topic.id,
          title: topic.title,
          scheduledContentId: scheduledContent.id,
          scheduledTime: topicScheduleTime,
          status: generateImmediately ? 'generating' : 'queued',
        });
      } catch (error) {
        errors.push({
          topicId: topic.id,
          title: topic.title,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: `Queued ${results.length} topics for content generation`,
      queued: results,
      errors: errors.length > 0 ? errors : undefined,
      nextSteps: generateImmediately
        ? 'Content generation has been triggered. Monitor the scheduled content dashboard for progress.'
        : 'Topics are queued. Content will be generated at scheduled times.',
    });
  } catch (error) {
    console.error('Failed to queue topics:', error);
    return NextResponse.json(
      { error: 'Failed to queue topics' },
      { status: 500 }
    );
  }
}

// Update queue priorities or reschedule
export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    const validation = UpdateQueueSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { topicId, action, newScheduledTime } = validation.data;

    const topic = await prisma.topicProposal.findUnique({
      where: { id: topicId },
      include: { scheduled_content: true },
    });

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    let updateData: any = { updated_at: new Date() };
    let message = '';

    switch (action) {
      case 'prioritize':
        // Move to front of queue
        updateData.planned_at = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        message = 'Topic prioritized to front of queue';
        break;

      case 'deprioritize':
        // Move to end of queue
        updateData.planned_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week from now
        message = 'Topic moved to end of queue';
        break;

      case 'reschedule':
        if (!newScheduledTime) {
          return NextResponse.json(
            { error: 'newScheduledTime is required for reschedule action' },
            { status: 400 }
          );
        }
        updateData.planned_at = new Date(newScheduledTime);
        message = `Topic rescheduled to ${newScheduledTime}`;
        break;

      case 'remove':
        updateData.status = 'planned';
        updateData.planned_at = null;
        // Cancel any scheduled content
        if (topic.scheduled_content.length > 0) {
          await prisma.scheduledContent.updateMany({
            where: { topic_proposal_id: topicId, status: 'pending' },
            data: { status: 'cancelled' },
          });
        }
        message = 'Topic removed from queue';
        break;

      case 'pause':
        // Keep in queue but pause generation
        if (topic.scheduled_content.length > 0) {
          await prisma.scheduledContent.updateMany({
            where: { topic_proposal_id: topicId, status: 'pending' },
            data: { status: 'cancelled' },
          });
        }
        message = 'Topic generation paused';
        break;

      case 'resume':
        // Resume paused topic
        const newScheduleTime = getNextOptimalTime('medium');
        updateData.planned_at = newScheduleTime;

        // Create new scheduled content
        await prisma.scheduledContent.create({
          data: {
            title: topic.title,
            content: '',
            content_type: 'blog_post',
            language: topic.locale,
            scheduled_time: newScheduleTime,
            status: 'pending',
            topic_proposal_id: topicId,
            page_type: topic.suggested_page_type,
            generation_source: 'topic_queue',
          },
        });
        message = 'Topic resumed and rescheduled';
        break;
    }

    await prisma.topicProposal.update({
      where: { id: topicId },
      data: updateData,
    });

    // Also update related scheduled content times if rescheduling
    if (action === 'reschedule' || action === 'prioritize') {
      await prisma.scheduledContent.updateMany({
        where: { topic_proposal_id: topicId, status: 'pending' },
        data: { scheduled_time: updateData.planned_at },
      });
    }

    return NextResponse.json({
      success: true,
      message,
      topic: {
        id: topicId,
        title: topic.title,
        newPlannedAt: updateData.planned_at,
        action,
      },
    });
  } catch (error) {
    console.error('Failed to update topic queue:', error);
    return NextResponse.json(
      { error: 'Failed to update topic queue' },
      { status: 500 }
    );
  }
}

// Helper: Get next optimal publishing time based on priority
function getNextOptimalTime(priority: string): Date {
  const now = new Date();
  const preferredHours = [9, 12, 15, 18, 21]; // Optimal posting times
  const currentHour = now.getHours();

  // Find next available slot
  let targetHour = preferredHours.find(h => h > currentHour) || preferredHours[0];
  const targetDate = new Date(now);

  if (targetHour <= currentHour) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  targetDate.setHours(targetHour, 0, 0, 0);

  // Adjust based on priority
  switch (priority) {
    case 'high':
      // Schedule within 2 hours
      return new Date(Math.max(now.getTime() + 2 * 60 * 60 * 1000, targetDate.getTime()));
    case 'low':
      // Schedule 2-3 days out
      targetDate.setDate(targetDate.getDate() + 2);
      return targetDate;
    default:
      return targetDate;
  }
}

// Helper: Trigger content generation (fire and forget)
async function triggerContentGeneration(scheduledContentId: string, topic: any): Promise<void> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Fire and forget - don't await
    fetch(`${baseUrl}/api/admin/command-center/content/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduledContentId,
        topicId: topic.id,
        prompt: buildPromptFromTopic(topic),
        locale: topic.locale,
        targetWordCount: 1500,
        targetKeyword: topic.primary_keyword,
        pageType: topic.suggested_page_type,
        authorityLinks: topic.authority_links_json,
        featuredLongtails: topic.featured_longtails,
        questions: topic.questions,
      }),
    }).catch(err => console.error('Background generation failed:', err));
  } catch (error) {
    console.error('Failed to trigger content generation:', error);
  }
}

// Helper: Build prompt from topic data
function buildPromptFromTopic(topic: any): string {
  const authorityLinks = Array.isArray(topic.authority_links_json)
    ? topic.authority_links_json.map((l: any) => `- ${l.title}: ${l.url}`).join('\n')
    : '';

  const questions = Array.isArray(topic.questions)
    ? topic.questions.map((q: string) => `- ${q}`).join('\n')
    : '';

  const longtails = Array.isArray(topic.featured_longtails)
    ? topic.featured_longtails.join(', ')
    : '';

  return `Write a comprehensive ${topic.suggested_page_type || 'guide'} about "${topic.title}".

Primary Keyword: ${topic.primary_keyword}
Featured Long-tail Keywords (must include naturally): ${longtails}

Questions to Answer:
${questions}

Authority Sources to Reference:
${authorityLinks}

Content Requirements:
- Intent: ${topic.intent || 'informational'}
- Evergreen: ${topic.evergreen ? 'Yes - write for long-term relevance' : 'No - include timely references'}
${topic.season ? `- Season: ${topic.season}` : ''}

Please write engaging, SEO-optimized content that:
1. Naturally incorporates the featured long-tail keywords
2. Answers all listed questions
3. References authority sources where appropriate
4. Follows best practices for the ${topic.suggested_page_type || 'guide'} page type
5. Is optimized for the London luxury travel audience`;
}
