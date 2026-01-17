/**
 * Autopilot Tasks API
 *
 * Manage automated tasks for content generation, SEO, social media, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get all background jobs
    const jobs = await prisma.backgroundJob.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    // Get content schedule rules
    const scheduleRules = await prisma.contentScheduleRule.findMany({
      orderBy: { created_at: 'desc' },
    });

    // Map to task format
    const tasks = [
      // Map background jobs
      ...jobs.map((job) => ({
        id: job.id,
        name: formatJobName(job.job_name),
        type: mapJobType(job.job_name),
        status: job.status === 'running' ? 'running' :
                job.status === 'failed' ? 'error' :
                job.status === 'pending' ? 'scheduled' : 'paused',
        schedule: job.schedule_cron || 'Manual',
        lastRun: job.completed_at ? formatRelativeTime(job.completed_at) : null,
        nextRun: job.next_run_at ? formatRelativeTime(job.next_run_at) : null,
        sites: [],
        config: job.parameters_json || {},
        stats: {
          totalRuns: job.retry_count + 1,
          successRate: job.status === 'completed' ? 100 : 0,
          itemsProcessed: (job.result_json as any)?.processed || 0,
        },
      })),
      // Map schedule rules
      ...scheduleRules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        type: 'content' as const,
        status: rule.is_active ? 'running' : 'paused',
        schedule: `Every ${rule.frequency_hours} hours`,
        lastRun: null,
        nextRun: calculateNextRun(rule.preferred_times),
        sites: [],
        config: {
          autoPublish: rule.auto_publish,
          maxPerDay: rule.max_posts_per_day,
          categories: rule.categories,
        },
        stats: {
          totalRuns: 0,
          successRate: 100,
          itemsProcessed: 0,
        },
      })),
    ];

    // Add default tasks if none exist
    if (tasks.length === 0) {
      tasks.push(
        {
          id: 'default-content',
          name: 'Daily Content Generation',
          type: 'content',
          status: 'paused',
          schedule: 'Every 6 hours',
          lastRun: null,
          nextRun: null,
          sites: [],
          config: { articlesPerRun: 5 },
          stats: { totalRuns: 0, successRate: 0, itemsProcessed: 0 },
        },
        {
          id: 'default-seo',
          name: 'SEO Meta Optimization',
          type: 'seo',
          status: 'paused',
          schedule: 'Daily at 2 AM',
          lastRun: null,
          nextRun: null,
          sites: [],
          config: { optimizeImages: true },
          stats: { totalRuns: 0, successRate: 0, itemsProcessed: 0 },
        }
      );
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Failed to get autopilot tasks:', error);
    return NextResponse.json(
      { error: 'Failed to get tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, type, schedule, sites, config } = await request.json();

    // Create a new background job or schedule rule based on type
    if (type === 'content') {
      const rule = await prisma.contentScheduleRule.create({
        data: {
          name,
          content_type: 'blog_post',
          language: 'both',
          frequency_hours: parseScheduleHours(schedule),
          auto_publish: config?.autoPublish || false,
          max_posts_per_day: config?.maxPerDay || 4,
          categories: config?.categories || [],
          is_active: true,
        },
      });

      return NextResponse.json({ success: true, task: rule });
    } else {
      const job = await prisma.backgroundJob.create({
        data: {
          job_name: mapTypeToJobName(type),
          job_type: 'scheduled',
          schedule_cron: schedule,
          parameters_json: config,
          status: 'pending',
        },
      });

      return NextResponse.json({ success: true, task: job });
    }
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, status } = await request.json();

    // Try to update background job
    const job = await prisma.backgroundJob.findUnique({ where: { id } });

    if (job) {
      await prisma.backgroundJob.update({
        where: { id },
        data: { status: status === 'running' ? 'pending' : 'cancelled' },
      });
    } else {
      // Try schedule rule
      await prisma.contentScheduleRule.update({
        where: { id },
        data: { is_active: status === 'running' },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

function formatJobName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function mapJobType(jobName: string): string {
  if (jobName.includes('content')) return 'content';
  if (jobName.includes('seo')) return 'seo';
  if (jobName.includes('social')) return 'social';
  if (jobName.includes('email')) return 'email';
  if (jobName.includes('analytics')) return 'analytics';
  return 'content';
}

function mapTypeToJobName(type: string): string {
  const mapping: Record<string, string> = {
    content: 'content_generation',
    seo: 'seo_optimization',
    social: 'social_media_posting',
    email: 'email_campaign',
    analytics: 'analytics_sync',
  };
  return mapping[type] || 'custom_task';
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.abs(Math.floor(diff / 3600000));
  const isPast = diff < 0;

  if (hours < 1) return isPast ? 'Just now' : 'In < 1 hour';
  if (hours < 24) return isPast ? `${hours} hours ago` : `In ${hours} hours`;
  const days = Math.floor(hours / 24);
  return isPast ? `${days} days ago` : `In ${days} days`;
}

function parseScheduleHours(schedule: string): number {
  const match = schedule.match(/(\d+)\s*hours?/i);
  return match ? parseInt(match[1]) : 24;
}

function calculateNextRun(preferredTimes: string[]): string | null {
  if (!preferredTimes?.length) return null;
  const now = new Date();
  const [hours, minutes] = preferredTimes[0].split(':').map(Number);
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return formatRelativeTime(next);
}
