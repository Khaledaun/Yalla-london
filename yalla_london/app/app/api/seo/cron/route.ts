import { NextRequest, NextResponse } from 'next/server';
import { runAutomatedIndexing, pingSitemaps } from '@/lib/seo/indexing-service';

/**
 * Cron endpoint for automated SEO tasks
 *
 * Can be triggered by:
 * - Vercel Cron (add to vercel.json)
 * - External cron service (cron-job.org, easycron.com)
 * - GitHub Actions
 *
 * Vercel Cron config example (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/seo/cron",
 *     "schedule": "0 6 * * *"
 *   }]
 * }
 */

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // If no secret configured, allow in development
  if (!cronSecret) {
    console.warn('CRON_SECRET not configured - allowing request');
    return true;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const task = searchParams.get('task') || 'daily';

  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    task,
    actions: [],
  };

  try {
    switch (task) {
      case 'daily':
        // Daily: Submit new/updated content + ping sitemaps
        const dailyReport = await runAutomatedIndexing('updated');
        results.actions.push({ name: 'submit_updated', report: dailyReport });
        break;

      case 'weekly':
        // Weekly: Submit all content
        const weeklyReport = await runAutomatedIndexing('all');
        results.actions.push({ name: 'submit_all', report: weeklyReport });
        break;

      case 'ping':
        // Just ping sitemaps
        const pings = await pingSitemaps();
        results.actions.push({ name: 'sitemap_ping', results: pings });
        break;

      case 'new':
        // Submit only new content
        const newReport = await runAutomatedIndexing('new');
        results.actions.push({ name: 'submit_new', report: newReport });
        break;

      default:
        return NextResponse.json({ error: 'Invalid task' }, { status: 400 });
    }

    results.success = true;
    return NextResponse.json(results);

  } catch (error) {
    results.success = false;
    results.error = String(error);
    return NextResponse.json(results, { status: 500 });
  }
}

// Also support POST for webhook-style triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
