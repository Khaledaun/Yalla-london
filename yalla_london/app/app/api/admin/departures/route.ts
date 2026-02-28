/**
 * /api/admin/departures
 *
 * Airport departures board — all upcoming scheduled events in the platform.
 * Returns cron jobs, scheduled publications, reservoir articles ready to publish,
 * and pending audits — all sorted by next fire time.
 *
 * GET  — returns departure list
 * POST — "Do Now" trigger: { type: 'cron', path: '/api/cron/...' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { getActiveSiteIds } from '@/config/sites';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Departure {
  id: string;
  label: string;
  type: 'cron' | 'publication' | 'audit' | 'content';
  icon: string; // emoji used as visual indicator
  scheduledAt: string | null;      // ISO string, null = "on demand"
  countdownMs: number | null;      // ms until scheduledAt (negative = overdue)
  status: 'scheduled' | 'running' | 'overdue' | 'ready' | 'on_demand';
  cronPath: string | null;         // POST target for "Do Now"
  cronSchedule: string | null;     // human-readable schedule string
  lastRunAt: string | null;        // ISO string of last execution
  lastRunStatus: 'success' | 'failed' | 'unknown' | null;
  siteId: string | null;
  meta?: Record<string, string | number>;
  // Phase 6 enhancements
  description: string | null;      // plain-English "what will happen"
  category: string | null;         // content | seo | analytics | maintenance | publishing
  feedsInto: string | null;        // what this cron feeds into
  successRate7d: number | null;    // 7-day success rate (0-100)
  avgDurationMs: number | null;    // average execution duration
  lastError: string | null;        // plain-English last error message
}

// ---------------------------------------------------------------------------
// Cron schedule definitions (mirrors vercel.json)
// ---------------------------------------------------------------------------

interface CronDef {
  path: string;
  schedule: string;
  label: string;
  icon: string;
  type: 'cron';
  description: string;
  category: 'content' | 'seo' | 'analytics' | 'maintenance' | 'publishing';
  feedsInto?: string;
}

const CRON_DEFS: CronDef[] = [
  { path: '/api/cron/analytics',              schedule: '0 3 * * *',          label: 'Analytics Sync',            icon: '📊', type: 'cron', category: 'analytics',    description: 'Syncs GA4 + Search Console data into the dashboard. Updates traffic, clicks, and keyword rankings.',           feedsInto: 'Dashboard metrics' },
  { path: '/api/cron/weekly-topics',          schedule: '0 4 * * 1',          label: 'Weekly Topic Research',     icon: '🔍', type: 'cron', category: 'content',      description: 'Generates new content topic ideas for all active sites. Creates TopicProposal records that feed the content builder.', feedsInto: 'Content Builder' },
  { path: '/api/cron/daily-content-generate', schedule: '0 5 * * *',          label: 'Daily Content Generation',  icon: '✍️', type: 'cron', category: 'content',      description: 'Creates new article drafts from approved topics. Each draft enters the 8-phase pipeline.',                     feedsInto: 'Content Builder' },
  { path: '/api/cron/seo-orchestrator?mode=weekly', schedule: '0 5 * * 0',   label: 'SEO Orchestrator (weekly)', icon: '🎯', type: 'cron', category: 'seo',          description: 'Deep weekly SEO audit. Checks indexing gaps, content quality, schema markup, and generates health reports.',    feedsInto: 'SEO Reports' },
  { path: '/api/cron/trends-monitor',         schedule: '0 6 * * *',          label: 'Trends Monitor',            icon: '📈', type: 'cron', category: 'content',      description: 'Scans trending topics for timely content opportunities. Creates urgent topic proposals for viral moments.',     feedsInto: 'Weekly Topics' },
  { path: '/api/cron/seo-orchestrator?mode=daily', schedule: '0 6 * * *',    label: 'SEO Orchestrator (daily)',  icon: '🎯', type: 'cron', category: 'seo',          description: 'Daily SEO maintenance. Checks for new indexing issues and updates SEO health scores.',                        feedsInto: 'SEO Agent' },
  { path: '/api/cron/london-news',            schedule: '0 6 * * *',          label: 'London News Fetch',         icon: '📰', type: 'cron', category: 'content',      description: 'Fetches London-specific news and generates timely news articles for the site.',                                feedsInto: 'Published content' },
  { path: '/api/cron/seo-agent',              schedule: '0 7 * * *',          label: 'SEO Agent (morning)',       icon: '🤖', type: 'cron', category: 'seo',          description: 'Auto-fixes meta titles/descriptions, injects internal links, discovers new pages for IndexNow submission.',   feedsInto: 'IndexNow' },
  { path: '/api/seo/cron?task=daily',         schedule: '30 7 * * *',         label: 'IndexNow Submission',       icon: '🔗', type: 'cron', category: 'seo',          description: 'Submits new/updated URLs to IndexNow for instant search engine discovery. Faster than waiting for crawlers.',  feedsInto: 'Google indexing' },
  { path: '/api/cron/sweeper',               schedule: '45 8 * * *',          label: 'DB Sweeper / Cleanup',      icon: '🧹', type: 'cron', category: 'maintenance',  description: 'Cleans up old logs, expired sessions, and stale data. Keeps the database lean and performant.' },
  { path: '/api/seo/cron?task=weekly',        schedule: '0 8 * * 0',          label: 'SEO Cron (weekly)',         icon: '🔗', type: 'cron', category: 'seo',          description: 'Weekly deep sitemap and indexing analysis. Checks for broken links, duplicate content, and orphan pages.',     feedsInto: 'SEO Reports' },
  { path: '/api/cron/content-builder',        schedule: '*/15 * * * *',       label: 'Content Builder (15min)',   icon: '🏗️', type: 'cron', category: 'content',      description: 'Moves article drafts through the 8-phase pipeline: research → outline → drafting → assembly → images → SEO → scoring → reservoir.', feedsInto: 'Content Selector' },
  { path: '/api/cron/content-selector',       schedule: '0 9,13,17,21 * * *', label: 'Content Selector',          icon: '✅', type: 'cron', category: 'publishing',   description: 'Selects highest-quality articles from the reservoir and schedules them for publication.',                      feedsInto: 'Scheduled Publish' },
  { path: '/api/cron/affiliate-injection',    schedule: '0 9 * * *',          label: 'Affiliate Injection',       icon: '💰', type: 'cron', category: 'content',      description: 'Injects affiliate and booking links (HalalBooking, Booking.com, Viator) into published articles for revenue.' },
  { path: '/api/cron/scheduled-publish',      schedule: '0 9 * * *',          label: 'Scheduled Publish (9am)',   icon: '🚀', type: 'cron', category: 'publishing',   description: 'Publishes scheduled articles at 9am UTC. Each article passes the 14-check pre-publication gate.',              feedsInto: 'SEO Agent' },
  { path: '/api/cron/google-indexing',        schedule: '15 9 * * *',         label: 'Google Indexing Submit',    icon: '🔎', type: 'cron', category: 'seo',          description: 'Submits newly published pages to Google via the Indexing API for faster crawling and indexing.' },
  { path: '/api/cron/seo-agent',              schedule: '0 13 * * *',         label: 'SEO Agent (afternoon)',     icon: '🤖', type: 'cron', category: 'seo',          description: 'Afternoon SEO pass. Catches newly published articles and fixes any meta tag or link issues.',                 feedsInto: 'IndexNow' },
  { path: '/api/cron/scheduled-publish',      schedule: '0 16 * * *',         label: 'Scheduled Publish (4pm)',   icon: '🚀', type: 'cron', category: 'publishing',   description: 'Afternoon publish window. Publishes remaining scheduled content for the day.',                                feedsInto: 'SEO Agent' },
  { path: '/api/cron/verify-indexing',        schedule: '0 11 * * *',         label: 'Verify Indexing',           icon: '✔️', type: 'cron', category: 'seo',          description: 'Checks previously submitted URLs to confirm Google has indexed them. Updates indexing status in the database.' },
  { path: '/api/cron/content-auto-fix',       schedule: '0 11,18 * * *',      label: 'Content Auto-Fix',          icon: '🔧', type: 'cron', category: 'content',      description: 'Expands thin articles (<1000 words) and trims overlong meta descriptions. Runs twice daily.',                  feedsInto: 'Quality gate' },
  { path: '/api/cron/seo-agent',              schedule: '0 20 * * *',         label: 'SEO Agent (evening)',       icon: '🤖', type: 'cron', category: 'seo',          description: 'Evening SEO sweep. Final daily check for missing meta tags, internal links, and schema markup.',               feedsInto: 'IndexNow' },
  { path: '/api/cron/site-health-check',      schedule: '0 22 * * *',         label: 'Site Health Check',         icon: '❤️', type: 'cron', category: 'maintenance',  description: 'Nightly health check across all configured sites. Detects downtime, slow responses, and configuration issues.' },
  { path: '/api/cron/reserve-publisher',      schedule: '0 21 * * *',         label: 'Reserve Publisher',         icon: '🛡️', type: 'cron', category: 'publishing',   description: 'Daily safety net. At 9pm UTC, checks if each site published 1 EN + 1 AR article today. If not, generates and publishes from reservoir or scratch. Guarantees daily minimums.',  feedsInto: 'SEO Deep Review' },
  { path: '/api/cron/seo-deep-review',        schedule: '0 0 * * *',          label: 'SEO Deep Review',           icon: '🔬', type: 'cron', category: 'seo',          description: '3 hours after reserve-publisher. ACTIVELY FIXES every SEO dimension on articles published today: meta, links, headings, content expansion, affiliate injection, alt text, then resubmits to IndexNow.', feedsInto: 'IndexNow' },
  { path: '/api/cron/fact-verification',      schedule: '0 3 * * 0',          label: 'Fact Verification',         icon: '🔬', type: 'cron', category: 'content',      description: 'Weekly fact-check pass on generated content. Flags suspicious claims and verifies key data points.' },
];

// ---------------------------------------------------------------------------
// Cron expression parser — next fire time from a cron expression (UTC)
// ---------------------------------------------------------------------------

function nextFireTime(expr: string, from: Date = new Date()): Date {
  // Supports: minute hour dom month dow
  // Special: */N patterns, comma lists, single values, *
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return new Date(from.getTime() + 60_000);

  const [minExpr, hrExpr, domExpr, , dowExpr] = parts;

  // Parse a field into an array of valid values
  function expand(field: string, min: number, max: number): number[] {
    if (field === '*') return Array.from({ length: max - min + 1 }, (_, i) => i + min);
    const vals = new Set<number>();
    for (const part of field.split(',')) {
      if (part.includes('/')) {
        const [rangeStr, step] = part.split('/');
        const start = rangeStr === '*' ? min : parseInt(rangeStr);
        for (let v = start; v <= max; v += parseInt(step)) vals.add(v);
      } else {
        vals.add(parseInt(part));
      }
    }
    return Array.from(vals).sort((a, b) => a - b);
  }

  const validMins = expand(minExpr, 0, 59);
  const validHrs  = expand(hrExpr, 0, 23);
  const validDows = dowExpr === '*' ? [0,1,2,3,4,5,6] : expand(dowExpr, 0, 6);
  const domWild   = domExpr === '*';

  // Walk forward minute-by-minute for up to 8 days
  const candidate = new Date(from);
  candidate.setUTCSeconds(0, 0);
  candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);

  const limit = new Date(from.getTime() + 8 * 24 * 60 * 60 * 1000);
  while (candidate < limit) {
    const dow = candidate.getUTCDay();
    const hr  = candidate.getUTCHours();
    const min = candidate.getUTCMinutes();

    if (!validDows.includes(dow)) {
      // skip to next day
      candidate.setUTCDate(candidate.getUTCDate() + 1);
      candidate.setUTCHours(0, 0, 0, 0);
      continue;
    }
    if (!validHrs.includes(hr)) {
      const nextHr = validHrs.find((h) => h > hr);
      if (nextHr !== undefined) {
        candidate.setUTCHours(nextHr, validMins[0], 0, 0);
      } else {
        candidate.setUTCDate(candidate.getUTCDate() + 1);
        candidate.setUTCHours(validHrs[0], validMins[0], 0, 0);
      }
      continue;
    }
    if (!validMins.includes(min)) {
      const nextMin = validMins.find((m) => m > min);
      if (nextMin !== undefined) {
        candidate.setUTCMinutes(nextMin, 0, 0);
      } else {
        const nextHr2 = validHrs.find((h) => h > hr);
        if (nextHr2 !== undefined) {
          candidate.setUTCHours(nextHr2, validMins[0], 0, 0);
        } else {
          candidate.setUTCDate(candidate.getUTCDate() + 1);
          candidate.setUTCHours(validHrs[0], validMins[0], 0, 0);
        }
      }
      continue;
    }
    // All fields match
    if (!domWild) {
      // Skip DOM validation for simplicity — treat as wildcard if DOM specified
    }
    return new Date(candidate);
  }

  return new Date(from.getTime() + 24 * 60 * 60 * 1000); // fallback: tomorrow
}

function scheduleLabel(expr: string): string {
  const labels: Record<string, string> = {
    '0 3 * * *': 'Daily 3:00 AM UTC',
    '0 4 * * 1': 'Mon 4:00 AM UTC',
    '0 5 * * *': 'Daily 5:00 AM UTC',
    '0 5 * * 0': 'Sun 5:00 AM UTC',
    '0 6 * * *': 'Daily 6:00 AM UTC',
    '0 7 * * *': 'Daily 7:00 AM UTC',
    '30 7 * * *': 'Daily 7:30 AM UTC',
    '45 8 * * *': 'Daily 8:45 AM UTC',
    '0 8 * * 0': 'Sun 8:00 AM UTC',
    '*/15 * * * *': 'Every 15 min',
    '0 9,13,17,21 * * *': 'Daily 9,13,17,21 UTC',
    '0 9 * * *': 'Daily 9:00 AM UTC',
    '15 9 * * *': 'Daily 9:15 AM UTC',
    '0 11 * * *': 'Daily 11:00 AM UTC',
    '0 11,18 * * *': 'Daily 11:00 & 18:00 UTC',
    '0 13 * * *': 'Daily 1:00 PM UTC',
    '0 16 * * *': 'Daily 4:00 PM UTC',
    '0 20 * * *': 'Daily 8:00 PM UTC',
    '0 22 * * *': 'Daily 10:00 PM UTC',
    '0 3 * * 0': 'Sun 3:00 AM UTC',
  };
  return labels[expr] ?? expr;
}

// ---------------------------------------------------------------------------
// GET handler — build departures list
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth) return auth;

  const { prisma } = await import('@/lib/db');
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Fetch 7 days of logs for success rate + last run info
  const recentLogs = await prisma.cronJobLog.findMany({
    where: { started_at: { gte: sevenDaysAgo } },
    orderBy: { started_at: 'desc' },
    select: { job_name: true, status: true, started_at: true, duration_ms: true, error_message: true },
    take: 1000,
  });

  // Build maps: lastRun + 7-day stats
  const lastRunMap = new Map<string, { at: Date; status: string; error: string | null }>();
  const statsMap = new Map<string, { total: number; success: number; durations: number[] }>();
  for (const log of recentLogs) {
    if (!lastRunMap.has(log.job_name)) {
      lastRunMap.set(log.job_name, { at: log.started_at, status: log.status, error: log.error_message });
    }
    const prev = statsMap.get(log.job_name) ?? { total: 0, success: 0, durations: [] };
    prev.total++;
    if (log.status === 'success' || log.status === 'completed') prev.success++;
    if (log.duration_ms) prev.durations.push(log.duration_ms);
    statsMap.set(log.job_name, prev);
  }

  // Derive job name from cron path
  function jobName(path: string): string {
    return path.split('/').pop()?.split('?')[0] ?? path;
  }

  // Build cron departures (deduplicated by next fire — keep closest)
  const seen = new Set<string>();
  const departures: Departure[] = [];

  for (const def of CRON_DEFS) {
    const fireAt = nextFireTime(def.schedule, now);
    const countdown = fireAt.getTime() - now.getTime();
    const name = jobName(def.path);
    const lastRun = lastRunMap.get(name) ?? lastRunMap.get(def.path);

    // Deduplicate same path+schedule combos
    const dedupeKey = `${def.path}::${def.schedule}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    // 7-day stats
    const stats = statsMap.get(name) ?? statsMap.get(def.path);
    const successRate = stats && stats.total > 0
      ? Math.round((stats.success / stats.total) * 100)
      : null;
    const avgDuration = stats && stats.durations.length > 0
      ? Math.round(stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length)
      : null;

    // Plain-English error from last failure
    let lastError: string | null = null;
    if (lastRun?.status !== 'success' && lastRun?.status !== 'completed' && lastRun?.error) {
      try {
        const { interpretError } = await import('@/lib/error-interpreter');
        const interpreted = interpretError(lastRun.error);
        lastError = interpreted.plain;
      } catch (interpErr) {
        console.warn('[departures] interpretError import failed:', interpErr instanceof Error ? interpErr.message : String(interpErr));
        lastError = lastRun.error.slice(0, 120);
      }
    }

    departures.push({
      id: `cron::${dedupeKey}`,
      label: def.label,
      type: 'cron',
      icon: def.icon,
      scheduledAt: fireAt.toISOString(),
      countdownMs: countdown,
      status: countdown < 0 ? 'overdue' : 'scheduled',
      cronPath: def.path,
      cronSchedule: scheduleLabel(def.schedule),
      lastRunAt: lastRun?.at.toISOString() ?? null,
      lastRunStatus: lastRun ? (lastRun.status === 'success' || lastRun.status === 'completed' ? 'success' : 'failed') : 'unknown',
      siteId: null,
      description: def.description,
      category: def.category,
      feedsInto: def.feedsInto ?? null,
      successRate7d: successRate,
      avgDurationMs: avgDuration,
      lastError,
    });
  }

  // Scheduled content publications
  try {
    const scheduled = await prisma.scheduledContent.findMany({
      where: {
        status: { in: ['scheduled', 'pending'] },
        scheduled_time: { gte: now },
      },
      orderBy: { scheduled_time: 'asc' },
      take: 20,
      select: {
        id: true,
        title: true,
        scheduled_time: true,
        content_type: true,
        site_id: true,
      },
    });

    for (const sc of scheduled) {
      const fireAt = sc.scheduled_time ?? new Date(now.getTime() + 999 * 60_000);
      departures.push({
        id: `pub::${sc.id}`,
        label: sc.title ?? 'Scheduled Publication',
        type: 'publication',
        icon: '📄',
        scheduledAt: fireAt.toISOString(),
        countdownMs: fireAt.getTime() - now.getTime(),
        status: 'scheduled',
        cronPath: '/api/cron/scheduled-publish',
        cronSchedule: fireAt.toLocaleString('en-GB', { timeZone: 'UTC', hour12: false }),
        lastRunAt: null,
        lastRunStatus: null,
        siteId: sc.site_id ?? null,
        meta: { contentType: sc.content_type ?? 'article' },
        description: 'Scheduled article awaiting its publish time. Will pass the 14-check pre-publication gate before going live.',
        category: 'publishing',
        feedsInto: 'SEO Agent',
        successRate7d: null,
        avgDurationMs: null,
        lastError: null,
      });
    }
  } catch (err) {
    console.warn("[departures] ScheduledContent query failed:", err instanceof Error ? err.message : String(err));
  }

  // Articles ready in reservoir (awaiting content-selector)
  try {
    const activeSiteIds = getActiveSiteIds();
    const reservoir = await prisma.articleDraft.findMany({
      where: { current_phase: 'reservoir', site_id: { in: activeSiteIds } },
      orderBy: { updated_at: 'desc' },
      take: 5,
      select: { id: true, keyword: true, quality_score: true, site_id: true },
    });
    for (const d of reservoir) {
      // Next content-selector run = closest of 9,13,17,21 UTC today
      const selectorNext = nextFireTime('0 9,13,17,21 * * *', now);
      departures.push({
        id: `reservoir::${d.id}`,
        label: `Publish: ${d.keyword?.slice(0, 50) ?? 'Article'}`,
        type: 'content',
        icon: '✅',
        scheduledAt: selectorNext.toISOString(),
        countdownMs: selectorNext.getTime() - now.getTime(),
        status: 'ready',
        cronPath: '/api/cron/content-selector',
        cronSchedule: 'Next content-selector run',
        lastRunAt: null,
        lastRunStatus: null,
        siteId: d.site_id,
        meta: { qualityScore: d.quality_score ?? 0 },
        description: 'Article ready in the reservoir — highest quality score articles are published first by the content selector.',
        category: 'publishing',
        feedsInto: 'Published content → SEO Agent',
        successRate7d: null,
        avgDurationMs: null,
        lastError: null,
      });
    }
  } catch (err) {
    console.warn("[departures] ArticleDraft reservoir query failed:", err instanceof Error ? err.message : String(err));
  }

  // Sort all departures: overdue first, then by countdown ascending
  departures.sort((a, b) => {
    if (a.status === 'overdue' && b.status !== 'overdue') return -1;
    if (b.status === 'overdue' && a.status !== 'overdue') return 1;
    if (a.countdownMs === null) return 1;
    if (b.countdownMs === null) return -1;
    return a.countdownMs - b.countdownMs;
  });

  // Category breakdown for grouped view
  const categories: Record<string, number> = {};
  for (const d of departures) {
    if (d.category) categories[d.category] = (categories[d.category] ?? 0) + 1;
  }

  return NextResponse.json({
    departures,
    generatedAt: now.toISOString(),
    totalCrons: CRON_DEFS.length,
    totalPublications: departures.filter((d) => d.type === 'publication').length,
    totalReady: departures.filter((d) => d.status === 'ready').length,
    categories,
  });
}

// ---------------------------------------------------------------------------
// POST handler — "Do Now" trigger
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth) return auth;

  const body = await req.json().catch(() => ({}));
  const { cronPath } = body as { cronPath?: string };

  if (!cronPath || !cronPath.startsWith('/api/')) {
    return NextResponse.json({ error: 'Invalid cronPath' }, { status: 400 });
  }

  // Validate against known cron paths only
  const knownPaths = new Set(CRON_DEFS.map((d) => d.path));
  const basePath = cronPath.split('?')[0];
  const isKnown = knownPaths.has(cronPath) || knownPaths.has(basePath) ||
    Array.from(knownPaths).some((p) => p.split('?')[0] === basePath);

  if (!isKnown) {
    return NextResponse.json({ error: 'Unknown cron path' }, { status: 400 });
  }

  // Trigger the cron by calling it as an internal POST request
  const base = req.nextUrl.origin;
  const targetUrl = `${base}${cronPath}`;

  try {
    const triggerRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Pass through the cron secret if configured
        ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
      },
      signal: AbortSignal.timeout(55_000),
    });

    const text = await triggerRes.text().catch(() => '');
    let result: unknown;
    try { result = JSON.parse(text); } catch { result = text.slice(0, 200); }

    return NextResponse.json({
      triggered: true,
      path: cronPath,
      statusCode: triggerRes.status,
      result,
    });
  } catch (err) {
    return NextResponse.json(
      { triggered: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
