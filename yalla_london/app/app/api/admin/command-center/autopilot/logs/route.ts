/**
 * Autopilot Logs API
 *
 * View logs from automated tasks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const taskId = searchParams.get('taskId');

    // Get background jobs as logs
    const jobs = await prisma.backgroundJob.findMany({
      where: taskId ? { id: taskId } : undefined,
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    // Also get audit logs related to automation
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ['content_generated', 'seo_optimized', 'social_posted', 'email_sent'],
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    // Combine and format logs
    const logs = [
      ...jobs.map((job) => ({
        id: job.id,
        taskId: job.id,
        taskName: formatJobName(job.job_name),
        type: mapJobType(job.job_name),
        status: job.status === 'completed' ? 'success' :
                job.status === 'failed' ? 'error' : 'warning',
        message: getJobMessage(job),
        timestamp: formatRelativeTime(job.completed_at || job.created_at),
        details: job.error_message || (job.result_json as any)?.summary,
      })),
      ...auditLogs.map((log) => ({
        id: log.id,
        taskId: log.resourceId || 'unknown',
        taskName: formatAction(log.action),
        type: mapActionType(log.action),
        status: log.success ? 'success' : 'error',
        message: log.errorMessage || getAuditMessage(log),
        timestamp: formatRelativeTime(log.timestamp),
        details: log.details ? JSON.stringify(log.details) : undefined,
      })),
    ];

    // Sort by timestamp
    logs.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB.getTime() - dateA.getTime();
    });

    return NextResponse.json({ logs: logs.slice(0, limit) });
  } catch (error) {
    console.error('Failed to get autopilot logs:', error);
    return NextResponse.json(
      { error: 'Failed to get logs' },
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

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function mapActionType(action: string): string {
  if (action.includes('content')) return 'content';
  if (action.includes('seo')) return 'seo';
  if (action.includes('social')) return 'social';
  if (action.includes('email')) return 'email';
  return 'content';
}

function getJobMessage(job: any): string {
  if (job.status === 'completed') {
    const result = job.result_json as any;
    return result?.message || `${formatJobName(job.job_name)} completed successfully`;
  }
  if (job.status === 'failed') {
    return job.error_message || `${formatJobName(job.job_name)} failed`;
  }
  return `${formatJobName(job.job_name)} is ${job.status}`;
}

function getAuditMessage(log: any): string {
  return `${formatAction(log.action)} for ${log.resource || 'resource'}`;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}
