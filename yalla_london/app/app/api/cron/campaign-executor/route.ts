// Campaign Executor Cron
//
// Runs every 30 minutes. Finds active campaigns and processes items
// within the 53s budget. Processes campaigns in priority order.
//
// Schedule: every 30 min (vercel.json)
// Budget: 53s (7s buffer from 60s Vercel limit)

import { NextResponse } from 'next/server';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const BUDGET_MS = 280_000; // 280s usable budget (20s buffer from 300s Vercel Pro limit)

async function handler(request: Request) {
  const cronStart = Date.now();

  // ── Auth: standard cron pattern ──────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // ── Feature flag guard ───────────────────────────────────────────
  try {
    const { prisma } = await import('@/lib/db');
    const flag = await prisma.featureFlag.findFirst({
      where: { key: 'campaign-executor', isActive: false },
    });
    if (flag) {
      return NextResponse.json({ skipped: true, reason: 'Feature flag disabled' });
    }
  } catch {
    // Continue if flag check fails
  }

  const results: Array<{ campaignId: string; name: string; result: unknown }> = [];

  try {
    const { prisma } = await import('@/lib/db');
    const { runCampaignBatch } = await import('@/lib/campaigns/campaign-runner');

    // Find active campaigns (running or queued), ordered by priority
    const activeCampaigns = await prisma.campaign.findMany({
      where: { status: { in: ['running', 'queued'] } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      take: 5, // Max 5 campaigns per invocation
    });

    if (activeCampaigns.length === 0) {
      return NextResponse.json({
        status: 'no_campaigns',
        message: 'No active campaigns to process',
        duration_ms: Date.now() - cronStart,
      });
    }

    // Process campaigns sequentially (each gets its own budget slice)
    for (const campaign of activeCampaigns) {
      const remainingBudget = BUDGET_MS - (Date.now() - cronStart);
      if (remainingBudget < 15_000) {
        console.log(`[campaign-executor] Budget low (${Math.round(remainingBudget / 1000)}s) — stopping`);
        break;
      }

      console.log(`[campaign-executor] Processing campaign "${campaign.name}" (${campaign.id}), ${campaign.completedItems}/${campaign.totalItems} done`);

      const batchResult = await runCampaignBatch(campaign.id, remainingBudget - 5000);
      results.push({
        campaignId: campaign.id,
        name: campaign.name,
        result: batchResult,
      });

      // If this campaign processed items, move to next
      if (batchResult.itemsProcessed > 0) {
        console.log(`[campaign-executor] Campaign "${campaign.name}": processed=${batchResult.itemsProcessed}, succeeded=${batchResult.itemsSucceeded}, failed=${batchResult.itemsFailed}`);
      }
    }

    // ── Log to CronJobLog ──────────────────────────────────────────
    const totalProcessed = results.reduce((sum, r) => {
      const res = r.result as { itemsProcessed?: number };
      return sum + (res.itemsProcessed || 0);
    }, 0);
    const totalSucceeded = results.reduce((sum, r) => {
      const res = r.result as { itemsSucceeded?: number };
      return sum + (res.itemsSucceeded || 0);
    }, 0);

    try {
      await prisma.cronJobLog.create({
        data: {
          job_name: 'campaign-executor',
          job_type: 'scheduled',
          status: totalSucceeded > 0 ? 'completed' : (totalProcessed > 0 ? 'failed' : 'completed'),
          duration_ms: Date.now() - cronStart,
          items_processed: totalProcessed,
          items_succeeded: totalSucceeded,
          items_failed: totalProcessed - totalSucceeded,
          result_summary: { campaigns: results.length, results } as unknown as Record<string, unknown>,
          completed_at: new Date(),
        },
      });
    } catch (logErr) {
      console.warn('[campaign-executor] CronJobLog write failed:', logErr instanceof Error ? logErr.message : logErr);
    }

    return NextResponse.json({
      status: 'completed',
      campaigns: results.length,
      totalProcessed,
      totalSucceeded,
      duration_ms: Date.now() - cronStart,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[campaign-executor] Fatal error:', message);

    // Log failure
    try {
      const { prisma } = await import('@/lib/db');
      await prisma.cronJobLog.create({
        data: {
          job_name: 'campaign-executor',
          job_type: 'scheduled',
          status: 'failed',
          duration_ms: Date.now() - cronStart,
          error_message: message,
          completed_at: new Date(),
        },
      });
    } catch {
      // Don't throw from error logging
    }

    return NextResponse.json({ error: message, duration_ms: Date.now() - cronStart }, { status: 500 });
  }
}

export async function GET(request: Request) { return handler(request); }
export async function POST(request: Request) { return handler(request); }
