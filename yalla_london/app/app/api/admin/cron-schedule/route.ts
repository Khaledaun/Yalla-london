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
//
// logName: the job_name value stored in CronJobLog.
// When the CRON_SCHEDULE key differs from the logged job_name (e.g. seo-agent-1 logs
// as "seo-agent", analytics-sync logs as "analytics"), set logName to the actual value.
// Omit logName when the key and job_name match exactly.
const CRON_SCHEDULE: Record<string, {
  label: string;
  schedule: string;         // cron expression
  humanSchedule: string;    // friendly description
  apiPath: string;          // route to trigger
  category: 'content' | 'seo' | 'indexing' | 'analytics' | 'maintenance';
  critical: boolean;
  logName?: string;         // actual job_name stored in CronJobLog (if different from key)
}> = {
  'analytics-sync': {
    label: 'Analytics Sync',
    schedule: '0 3 * * *',
    humanSchedule: 'Daily at 3:00 UTC',
    apiPath: '/api/cron/analytics-sync',
    category: 'analytics',
    critical: false,
    logName: 'analytics',   // CronJobLog stores job_name: "analytics"
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
    logName: 'seo-orchestrator',
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
    logName: 'seo-orchestrator',
  },
  'seo-agent-1': {
    label: 'SEO Agent Run 1',
    schedule: '0 7 * * *',
    humanSchedule: 'Daily at 7:00 UTC',
    apiPath: '/api/cron/seo-agent',
    category: 'indexing',
    critical: false,
    logName: 'seo-agent',   // all 3 seo-agent runs share the same job_name in CronJobLog
  },
  'seo-cron-daily': {
    label: 'SEO Cron (Daily)',
    schedule: '30 7 * * *',
    humanSchedule: 'Daily at 7:30 UTC',
    apiPath: '/api/seo/cron',
    category: 'seo',
    critical: false,
    logName: 'seo-cron',
  },
  'content-builder': {
    label: 'Content Builder',
    schedule: '*/15 * * * *',
    humanSchedule: 'Every 15 minutes',
    apiPath: '/api/cron/content-builder',
    category: 'content',
    critical: true,
  },
  'content-selector': {
    label: 'Content Selector',
    schedule: '0 9,13,17,21 * * *',
    humanSchedule: '4× daily (9am, 1pm, 5pm, 9pm UTC)',
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
    critical: false,
  },
  'scheduled-publish-morning': {
    label: 'Publish (Morning)',
    schedule: '0 9 * * *',
    humanSchedule: 'Daily at 9:00 UTC',
    apiPath: '/api/cron/scheduled-publish',
    category: 'content',
    critical: false,
    logName: 'scheduled-publish',  // both publish runs share the same job_name
  },
  'seo-agent-2': {
    label: 'SEO Agent Run 2',
    schedule: '0 13 * * *',
    humanSchedule: 'Daily at 13:00 UTC',
    apiPath: '/api/cron/seo-agent',
    category: 'indexing',
    critical: false,
    logName: 'seo-agent',
  },
  'scheduled-publish-afternoon': {
    label: 'Publish (Afternoon)',
    schedule: '0 16 * * *',
    humanSchedule: 'Daily at 16:00 UTC',
    apiPath: '/api/cron/scheduled-publish',
    category: 'content',
    critical: false,
    logName: 'scheduled-publish',
  },
  'seo-agent-3': {
    label: 'SEO Agent Run 3',
    schedule: '0 20 * * *',
    humanSchedule: 'Daily at 20:00 UTC',
    apiPath: '/api/cron/seo-agent',
    category: 'indexing',
    critical: false,
    logName: 'seo-agent',
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
  // L-005 fix: add missing scheduled cron jobs from vercel.json
  'seo-cron-weekly': {
    label: 'SEO Cron (Weekly)',
    schedule: '0 8 * * 0',
    humanSchedule: 'Every Sunday at 8:00 UTC',
    apiPath: '/api/seo/cron?task=weekly',
    category: 'seo',
    critical: false,
    logName: 'seo-cron',
  },
  'fact-verification': {
    label: 'Fact Verification',
    schedule: '0 10 * * *',
    humanSchedule: 'Daily at 10:00 UTC',
    apiPath: '/api/cron/fact-verification',
    category: 'content',
    critical: false,
  },
  'sweeper': {
    label: 'Data Sweeper',
    schedule: '0 23 * * *',
    humanSchedule: 'Daily at 23:00 UTC',
    apiPath: '/api/cron/sweeper',
    category: 'maintenance',
    critical: false,
  },
  'google-indexing': {
    label: 'Google Indexing',
    schedule: '0 10 * * *',
    humanSchedule: 'Daily at 10:00 UTC',
    apiPath: '/api/cron/google-indexing',
    category: 'indexing',
    critical: false,
  },
  'verify-indexing': {
    label: 'Verify Indexing',
    schedule: '0 11 * * *',
    humanSchedule: 'Daily at 11:00 UTC',
    apiPath: '/api/cron/verify-indexing',
    category: 'indexing',
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
    // Get last run for each cron job — CronJobLog uses snake_case fields
    const recentLogs = await prisma.cronJobLog.findMany({
      where: jobName ? { job_name: jobName } : {},
      orderBy: { started_at: 'desc' },
      take: jobName ? 50 : 300,
      select: {
        id: true,
        job_name: true,
        status: true,
        started_at: true,
        completed_at: true,
        duration_ms: true,
        items_processed: true,
        items_succeeded: true,
        items_failed: true,
        error_message: true,
        timed_out: true,
        result_summary: true,
        site_id: true,
      },
    });

    // Group by job name
    const byJob: Record<string, typeof recentLogs> = {};
    for (const log of recentLogs) {
      if (!byJob[log.job_name]) byJob[log.job_name] = [];
      byJob[log.job_name].push(log);
    }

    const jobs = Object.entries(CRON_SCHEDULE).map(([key, info]) => {
      // Use logName (the actual job_name in CronJobLog) if it differs from the CRON_SCHEDULE key
      const logs = byJob[info.logName ?? key] || [];
      const lastLog = logs[0] || null;
      const last7d = logs.filter((l) => new Date(l.started_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      const durLogs = last7d.filter((l) => l.duration_ms);
      const avgDuration = durLogs.length > 0
        ? Math.round(durLogs.reduce((sum, l) => sum + (l.duration_ms || 0), 0) / durLogs.length)
        : null;

      return {
        key,
        ...info,
        lastRunAt: lastLog?.started_at ?? null,
        lastStatus: lastLog?.status ?? 'never',
        lastDurationMs: lastLog?.duration_ms ?? null,
        lastError: lastLog?.error_message ?? null,
        lastItemsProcessed: lastLog?.items_processed ?? 0,
        lastItemsFailed: lastLog?.items_failed ?? 0,
        timedOut: lastLog?.timed_out ?? false,
        runs7d: last7d.length,
        failures7d: last7d.filter((l) => l.status === 'failed' || l.timed_out).length,
        avgDurationMs: avgDuration,
        health: getHealthFromLogs(last7d.map((l) => ({ status: l.status, timedOut: l.timed_out }))),
        recentLogs: logs.slice(0, 10).map((l) => ({
          id: l.id,
          status: l.status,
          startedAt: l.started_at,
          durationMs: l.duration_ms,
          itemsProcessed: l.items_processed,
          itemsFailed: l.items_failed,
          error: l.error_message,
          timedOut: l.timed_out,
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

    // M-008 fix: correct operator precedence for baseUrl
    const baseUrl = process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const res = await fetch(`${baseUrl}${job.apiPath}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ manual: true }),
      signal: AbortSignal.timeout(55000),
    });

    if (res.ok) {
      // M-011 fix: only return success status, not internal cron response body
      return NextResponse.json({ success: true, message: `${jobKey} triggered successfully` });
    }
    return NextResponse.json({ success: false, error: `Job returned HTTP ${res.status}` });
  } catch (err: unknown) {
    // H-001 fix: don't leak internal error messages
    console.warn('[cron-schedule POST]', err);
    return NextResponse.json({ success: false, error: 'Failed to trigger cron job' });
  }
}
