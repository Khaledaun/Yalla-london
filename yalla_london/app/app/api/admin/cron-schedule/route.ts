/**
 * Cron Schedule API
 * Returns the full schedule of all cron jobs with last run status,
 * next run time, health, and manual trigger support.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-middleware';

// Vercel cron schedule → human-readable + UTC next-run calculation
const CRON_SCHEDULE: Record<string, {
  label: string;
  schedule: string;         // cron expression
  humanSchedule: string;    // friendly description
  apiPath: string;          // route to trigger
  category: 'content' | 'seo' | 'indexing' | 'analytics' | 'maintenance';
  critical: boolean;
}> = {
  'analytics-sync': {
    label: 'Analytics Sync',
    schedule: '0 3 * * *',
    humanSchedule: 'Daily at 3:00 UTC',
    apiPath: '/api/cron/analytics-sync',
    category: 'analytics',
    critical: false,
  },
  'weekly-topics': {
    label: 'Weekly Topic Research',
    schedule: '0 4 * * 1',
    humanSchedule: 'Every Monday at 4:00 UTC',
    apiPath: '/api/cron/weekly-topics',
    category: 'content',
    critical: true,
  },
  'daily-content-generate': {
    label: 'Daily Content Generation',
    schedule: '0 5 * * *',
    humanSchedule: 'Daily at 5:00 UTC',
    apiPath: '/api/cron/daily-content-generate',
    category: 'content',
    critical: true,
  },
  'seo-orchestrator-weekly': {
    label: 'SEO Orchestrator (Weekly)',
    schedule: '0 5 * * 0',
    humanSchedule: 'Every Sunday at 5:00 UTC',
    apiPath: '/api/cron/seo-orchestrator',
    category: 'seo',
    critical: false,
  },
  'trends-monitor': {
    label: 'Trends Monitor',
    schedule: '0 6 * * *',
    humanSchedule: 'Daily at 6:00 UTC',
    apiPath: '/api/cron/trends-monitor',
    category: 'content',
    critical: false,
  },
  'seo-orchestrator-daily': {
    label: 'SEO Orchestrator (Daily)',
    schedule: '0 6 * * *',
    humanSchedule: 'Daily at 6:00 UTC',
    apiPath: '/api/cron/seo-orchestrator',
    category: 'seo',
    critical: false,
  },
  'seo-agent-1': {
    label: 'SEO Agent Run 1',
    schedule: '0 7 * * *',
    humanSchedule: 'Daily at 7:00 UTC',
    apiPath: '/api/cron/seo-agent',
    category: 'indexing',
    critical: false,
  },
  'seo-cron-daily': {
    label: 'SEO Cron (Daily)',
    schedule: '30 7 * * *',
    humanSchedule: 'Daily at 7:30 UTC',
    apiPath: '/api/seo/cron',
    category: 'seo',
    critical: false,
  },
  'content-builder': {
    label: 'Content Builder',
    schedule: '30 8 * * *',
    humanSchedule: 'Daily at 8:30 UTC (+ every 15 min)',
    apiPath: '/api/cron/content-builder',
    category: 'content',
    critical: true,
  },
  'content-selector': {
    label: 'Content Selector',
    schedule: '30 8 * * *',
    humanSchedule: 'Daily at 8:30 UTC',
    apiPath: '/api/cron/content-selector',
    category: 'content',
    critical: true,
  },
  'affiliate-injection': {
    label: 'Affiliate Injection',
    schedule: '0 9 * * *',
    humanSchedule: 'Daily at 9:00 UTC',
    apiPath: '/api/cron/affiliate-injection',
    category: 'content',
    critical: true,
  },
  'scheduled-publish-morning': {
    label: 'Publish (Morning)',
    schedule: '0 9 * * *',
    humanSchedule: 'Daily at 9:00 UTC',
    apiPath: '/api/cron/scheduled-publish',
    category: 'content',
    critical: false,
  },
  'seo-agent-2': {
    label: 'SEO Agent Run 2',
    schedule: '0 13 * * *',
    humanSchedule: 'Daily at 13:00 UTC',
    apiPath: '/api/cron/seo-agent',
    category: 'indexing',
    critical: false,
  },
  'scheduled-publish-afternoon': {
    label: 'Publish (Afternoon)',
    schedule: '0 16 * * *',
    humanSchedule: 'Daily at 16:00 UTC',
    apiPath: '/api/cron/scheduled-publish',
    category: 'content',
    critical: false,
  },
  'seo-agent-3': {
    label: 'SEO Agent Run 3',
    schedule: '0 20 * * *',
    humanSchedule: 'Daily at 20:00 UTC',
    apiPath: '/api/cron/seo-agent',
    category: 'indexing',
    critical: false,
  },
  'site-health-check': {
    label: 'Site Health Check',
    schedule: '0 22 * * *',
    humanSchedule: 'Daily at 22:00 UTC',
    apiPath: '/api/cron/site-health-check',
    category: 'maintenance',
    critical: false,
  },
  'london-news': {
    label: 'London News',
    schedule: '0 6 * * *',
    humanSchedule: 'Daily at 6:00 UTC',
    apiPath: '/api/cron/london-news',
    category: 'content',
    critical: false,
  },
};

function getHealthFromLogs(logs: Array<{ status: string; timedOut: boolean }>): 'green' | 'yellow' | 'red' | 'gray' {
  if (logs.length === 0) return 'gray';
  const recent = logs.slice(0, 5);
  const failCount = recent.filter((l) => l.status === 'failed' || l.timedOut).length;
  if (failCount === 0) return 'green';
  if (failCount <= 2) return 'yellow';
  return 'red';
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const jobName = searchParams.get('job');

  try {
    // Get last run for each cron job
    const recentLogs = await prisma.cronJobLog.findMany({
      where: jobName ? { jobName } : {},
      orderBy: { startedAt: 'desc' },
      take: jobName ? 50 : 300,
      select: {
        id: true,
        jobName: true,
        status: true,
        startedAt: true,
        completedAt: true,
        durationMs: true,
        itemsProcessed: true,
        itemsSucceeded: true,
        itemsFailed: true,
        errorMessage: true,
        timedOut: true,
        resultSummary: true,
        siteId: true,
      },
    });

    // Group by job name
    const byJob: Record<string, typeof recentLogs> = {};
    for (const log of recentLogs) {
      if (!byJob[log.jobName]) byJob[log.jobName] = [];
      byJob[log.jobName].push(log);
    }

    const jobs = Object.entries(CRON_SCHEDULE).map(([key, info]) => {
      const logs = byJob[key] || [];
      const lastLog = logs[0] || null;
      const last7d = logs.filter((l) => new Date(l.startedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      const avgDuration = last7d.length > 0
        ? Math.round(last7d.filter((l) => l.durationMs).reduce((sum, l) => sum + (l.durationMs || 0), 0) / last7d.filter((l) => l.durationMs).length)
        : null;

      return {
        key,
        ...info,
        lastRunAt: lastLog?.startedAt ?? null,
        lastStatus: lastLog?.status ?? 'never',
        lastDurationMs: lastLog?.durationMs ?? null,
        lastError: lastLog?.errorMessage ?? null,
        lastItemsProcessed: lastLog?.itemsProcessed ?? 0,
        lastItemsFailed: lastLog?.itemsFailed ?? 0,
        timedOut: lastLog?.timedOut ?? false,
        runs7d: last7d.length,
        failures7d: last7d.filter((l) => l.status === 'failed' || l.timedOut).length,
        avgDurationMs: avgDuration,
        health: getHealthFromLogs(last7d),
        recentLogs: logs.slice(0, 10).map((l) => ({
          id: l.id,
          status: l.status,
          startedAt: l.startedAt,
          durationMs: l.durationMs,
          itemsProcessed: l.itemsProcessed,
          itemsFailed: l.itemsFailed,
          error: l.errorMessage,
          timedOut: l.timedOut,
        })),
      };
    });

    const summary = {
      total: jobs.length,
      healthy: jobs.filter((j) => j.health === 'green').length,
      warning: jobs.filter((j) => j.health === 'yellow').length,
      failing: jobs.filter((j) => j.health === 'red').length,
      neverRun: jobs.filter((j) => j.health === 'gray').length,
    };

    return NextResponse.json({ jobs, summary });
  } catch (err) {
    console.warn('[cron-schedule GET]', err);
    return NextResponse.json({ error: 'Failed to load cron schedule' }, { status: 500 });
  }
}

// POST: Trigger a cron job manually
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { jobKey } = await request.json();
    const job = CRON_SCHEDULE[jobKey];
    if (!job) return NextResponse.json({ error: 'Unknown job' }, { status: 404 });

    const cronSecret = process.env.CRON_SECRET;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-trigger': 'manual-dashboard',
    };
    if (cronSecret) headers['Authorization'] = `Bearer ${cronSecret}`;

    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

    const res = await fetch(`${baseUrl}${job.apiPath}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ manual: true }),
      signal: AbortSignal.timeout(55000),
    });

    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json({ success: true, result: body });
    }
    return NextResponse.json({ success: false, error: `Job returned ${res.status}` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Trigger failed';
    console.warn('[cron-schedule POST]', err);
    return NextResponse.json({ success: false, error: msg });
  }
}
