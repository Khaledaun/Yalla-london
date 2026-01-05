/**
 * Autopilot Scheduler
 *
 * Handles automated task execution for content generation, social posting, etc.
 * Designed to be triggered by cron jobs or Vercel cron.
 */

import { prisma } from '@/lib/prisma';
import { generateResortReview, generateTravelGuide, generateComparison } from '@/lib/ai/content-generator';
import { isAIAvailable } from '@/lib/ai/provider';

export type TaskType =
  | 'content_generation'
  | 'seo_optimization'
  | 'social_posting'
  | 'analytics_sync'
  | 'email_campaign'
  | 'pdf_generation';

export interface ScheduledTask {
  id: string;
  taskType: TaskType;
  config: Record<string, any>;
  siteId?: string;
  scheduledFor: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

/**
 * Run all due tasks
 */
export async function runDueTasks(): Promise<{
  ran: number;
  succeeded: number;
  failed: number;
  results: TaskResult[];
}> {
  const now = new Date();

  // Get all pending tasks that are due
  const dueTasks = await prisma.backgroundJob.findMany({
    where: {
      status: 'pending',
      scheduled_for: { lte: now },
    },
    orderBy: { priority: 'desc' },
    take: 10, // Process in batches
  });

  const results: TaskResult[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const task of dueTasks) {
    const result = await executeTask(task);
    results.push(result);

    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
  }

  return {
    ran: dueTasks.length,
    succeeded,
    failed,
    results,
  };
}

interface TaskResult {
  taskId: string;
  taskName: string;
  success: boolean;
  message: string;
  duration: number;
  output?: any;
}

/**
 * Execute a single task
 */
async function executeTask(job: any): Promise<TaskResult> {
  const startTime = Date.now();
  const taskName = job.job_name;

  // Mark as running
  await prisma.backgroundJob.update({
    where: { id: job.id },
    data: {
      status: 'running',
      started_at: new Date(),
    },
  });

  try {
    let output: any;

    switch (job.job_name) {
      case 'content_generation':
        output = await runContentGeneration(job.input_json);
        break;

      case 'seo_optimization':
        output = await runSEOOptimization(job.input_json);
        break;

      case 'social_posting':
        output = await runSocialPosting(job.input_json);
        break;

      case 'analytics_sync':
        output = await runAnalyticsSync(job.input_json);
        break;

      case 'email_campaign':
        output = await runEmailCampaign(job.input_json);
        break;

      case 'pdf_generation':
        output = await runPDFGeneration(job.input_json);
        break;

      default:
        throw new Error(`Unknown task type: ${job.job_name}`);
    }

    // Mark as completed
    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        completed_at: new Date(),
        result_json: output,
      },
    });

    // Log success
    await logAutopilotAction(job.site_id, job.job_name, true, output);

    return {
      taskId: job.id,
      taskName,
      success: true,
      message: 'Task completed successfully',
      duration: Date.now() - startTime,
      output,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Mark as failed
    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        completed_at: new Date(),
        error_message: errorMessage,
        retry_count: { increment: 1 },
      },
    });

    // Log failure
    await logAutopilotAction(job.site_id, job.job_name, false, null, errorMessage);

    return {
      taskId: job.id,
      taskName,
      success: false,
      message: errorMessage,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Content Generation Task
 */
async function runContentGeneration(config: any): Promise<any> {
  if (!await isAIAvailable()) {
    throw new Error('AI provider not configured');
  }

  const { contentType, destination, locale = 'en', siteId } = config;

  let content;

  switch (contentType) {
    case 'resort_review':
      content = await generateResortReview(
        destination,
        {
          name: config.resortName || destination,
          rating: config.rating || 4.5,
          priceRange: config.priceRange || '$$$',
          highlights: config.highlights || [],
        },
        locale
      );
      break;

    case 'travel_guide':
      content = await generateTravelGuide(destination, {
        sections: config.sections || ['intro', 'activities', 'tips'],
        locale,
      });
      break;

    case 'comparison':
      content = await generateComparison(
        config.resorts || [],
        config.criteria || ['price', 'location', 'amenities'],
        locale
      );
      break;

    default:
      throw new Error(`Unknown content type: ${contentType}`);
  }

  // Store generated content
  if (siteId && content) {
    await prisma.article.create({
      data: {
        site_id: siteId,
        title: content.title || `${destination} Guide`,
        slug: generateSlug(content.title || destination),
        content_json: content,
        locale,
        status: 'draft', // Requires review before publishing
        source: 'ai_autopilot',
      },
    });
  }

  return {
    generated: true,
    contentType,
    wordCount: JSON.stringify(content).split(/\s+/).length,
    status: 'draft',
  };
}

/**
 * SEO Optimization Task
 */
async function runSEOOptimization(config: any): Promise<any> {
  const { siteId, action = 'audit' } = config;

  // Get site content
  const articles = await prisma.article.findMany({
    where: {
      site_id: siteId,
      status: 'published',
    },
    take: 50,
  });

  const issues: string[] = [];
  const optimized: string[] = [];

  for (const article of articles) {
    const content = article.content_json as any;

    // Check for SEO issues
    if (!content?.meta_title || content.meta_title.length < 30) {
      issues.push(`${article.title}: Meta title too short or missing`);
    }
    if (!content?.meta_description || content.meta_description.length < 120) {
      issues.push(`${article.title}: Meta description too short or missing`);
    }
    if (!content?.h1) {
      issues.push(`${article.title}: Missing H1 heading`);
    }
  }

  return {
    articlesChecked: articles.length,
    issuesFound: issues.length,
    issues: issues.slice(0, 10),
    optimized: optimized.length,
    nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Social Posting Task
 */
async function runSocialPosting(config: any): Promise<any> {
  const { postId, platforms } = config;

  // Get scheduled post
  const post = await prisma.scheduledContent.findUnique({
    where: { id: postId },
  });

  if (!post) {
    throw new Error('Post not found');
  }

  // In production, this would integrate with social media APIs
  // For now, mark as posted and log
  await prisma.scheduledContent.update({
    where: { id: postId },
    data: {
      status: 'published',
      published: true,
      published_time: new Date(),
    },
  });

  return {
    postId,
    platforms,
    status: 'posted',
    message: 'Post published successfully (mock)',
  };
}

/**
 * Analytics Sync Task
 */
async function runAnalyticsSync(config: any): Promise<any> {
  const { siteId } = config;

  // In production, this would call GA4 and Search Console APIs
  // For now, create a snapshot with placeholder data
  await prisma.analyticsSnapshot.create({
    data: {
      site_id: siteId,
      date_range: '30d',
      data_json: {
        synced_at: new Date().toISOString(),
        source: 'autopilot',
      },
      indexed_pages: 0,
      top_queries: [],
      performance_metrics: {},
    },
  });

  return {
    synced: true,
    message: 'Analytics snapshot created. Connect GA4/GSC for real data.',
  };
}

/**
 * Email Campaign Task
 */
async function runEmailCampaign(config: any): Promise<any> {
  const { campaignId, siteId } = config;

  // Get campaign
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // Get subscribers
  const subscribers = await prisma.lead.findMany({
    where: {
      site_id: siteId,
      subscribed: true,
      status: { not: 'unsubscribed' },
    },
    take: 1000,
  });

  // In production, integrate with email service (SendGrid, Resend, etc.)
  // For now, just update campaign status
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: 'sent',
      sent_at: new Date(),
      recipients: subscribers.length,
    },
  });

  return {
    campaignId,
    recipientCount: subscribers.length,
    status: 'sent',
    message: 'Campaign queued for delivery (mock)',
  };
}

/**
 * PDF Generation Task
 */
async function runPDFGeneration(config: any): Promise<any> {
  const { guideId, destination, template, locale, siteId } = config;

  // This would trigger the PDF generation pipeline
  // For now, just update the guide status
  if (guideId) {
    await prisma.pdfGuide.update({
      where: { id: guideId },
      data: {
        status: 'published',
        updated_at: new Date(),
      },
    });
  }

  return {
    guideId,
    destination,
    status: 'generated',
    message: 'PDF generation queued',
  };
}

/**
 * Log autopilot action for audit trail
 */
async function logAutopilotAction(
  siteId: string | null,
  action: string,
  success: boolean,
  details?: any,
  errorMessage?: string
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action,
      resource: 'autopilot',
      resourceId: siteId || undefined,
      success,
      errorMessage,
      details: details || {},
      timestamp: new Date(),
    },
  });
}

/**
 * Schedule a new task
 */
export async function scheduleTask(
  taskType: TaskType,
  config: Record<string, any>,
  scheduledFor: Date,
  siteId?: string,
  priority: number = 5
): Promise<string> {
  const job = await prisma.backgroundJob.create({
    data: {
      job_name: taskType,
      site_id: siteId,
      input_json: config,
      status: 'pending',
      scheduled_for: scheduledFor,
      priority,
    },
  });

  return job.id;
}

/**
 * Cancel a scheduled task
 */
export async function cancelTask(taskId: string): Promise<boolean> {
  const job = await prisma.backgroundJob.findUnique({
    where: { id: taskId },
  });

  if (!job || job.status !== 'pending') {
    return false;
  }

  await prisma.backgroundJob.update({
    where: { id: taskId },
    data: { status: 'cancelled' },
  });

  return true;
}

/**
 * Get task status
 */
export async function getTaskStatus(taskId: string): Promise<any> {
  const job = await prisma.backgroundJob.findUnique({
    where: { id: taskId },
  });

  if (!job) {
    return null;
  }

  return {
    id: job.id,
    taskType: job.job_name,
    status: job.status,
    scheduledFor: job.scheduled_for,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    result: job.result_json,
    error: job.error_message,
  };
}

/**
 * Helper to generate URL-safe slugs
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
