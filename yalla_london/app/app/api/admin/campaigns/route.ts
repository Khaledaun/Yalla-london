/**
 * Campaign Agent — Admin API
 *
 * GET:  List campaigns with progress + items
 * POST: Create campaign, or execute actions (run, pause, resume, cancel, run_single)
 *
 * All routes require admin auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// ─── GET: List campaigns ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import('@/lib/db');
    const url = new URL(request.url);
    const siteId = url.searchParams.get('siteId');
    const campaignId = url.searchParams.get('id');
    const { getDefaultSiteId } = await import('@/config/sites');

    // Single campaign detail
    if (campaignId) {
      const { getCampaignStatus } = await import('@/lib/campaigns/campaign-runner');
      const campaign = await getCampaignStatus(campaignId);
      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }
      return NextResponse.json(campaign);
    }

    // List all campaigns for site
    const targetSiteId = siteId || getDefaultSiteId();
    const campaigns = await prisma.campaign.findMany({
      where: { siteId: targetSiteId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    // Get summary stats
    const activeCampaigns = campaigns.filter(c => c.status === 'running' || c.status === 'queued');
    const totalCost = campaigns.reduce((sum, c) => sum + c.currentCostUsd, 0);

    return NextResponse.json({
      campaigns,
      summary: {
        total: campaigns.length,
        active: activeCampaigns.length,
        totalCostUsd: Math.round(totalCost * 100) / 100,
      },
    });
  } catch (err) {
    console.error('[campaigns-api] GET error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to load campaigns' }, { status: 500 });
  }
}

// ─── POST: Create or execute campaign actions ────────────────────────────────

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const action = body.action as string;

    switch (action) {
      case 'create':
        return handleCreate(body);
      case 'kickstart':
        return handleKickstart(body, request);
      case 'run':
        return handleRun(body.campaignId);
      case 'run_single':
        return handleRunSingle(body.campaignId);
      case 'pause':
        return handlePause(body.campaignId);
      case 'resume':
        return handleResume(body.campaignId);
      case 'cancel':
        return handleCancel(body.campaignId);
      case 'preview':
        return handlePreview(body);
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error('[campaigns-api] POST error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to process campaign action' }, { status: 500 });
  }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleCreate(body: Record<string, unknown>) {
  const { createCampaign } = await import('@/lib/campaigns/campaign-runner');
  const { getDefaultSiteId } = await import('@/config/sites');

  const siteId = (body.siteId as string) || getDefaultSiteId();
  const name = body.name as string;
  const type = body.type as string;
  const config = body.config as Record<string, unknown>;

  if (!name || !type || !config) {
    return NextResponse.json({ error: 'Missing required fields: name, type, config' }, { status: 400 });
  }

  const result = await createCampaign(
    siteId, name, type,
    config as unknown as import('@/lib/campaigns/types').CampaignConfig,
    body.createdBy as string,
  );

  return NextResponse.json({
    success: true,
    campaignId: result.id,
    totalItems: result.totalItems,
    message: `Campaign created with ${result.totalItems} items`,
  });
}

async function handleRun(campaignId: string) {
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 });

  const { prisma } = await import('@/lib/db');

  // Set to queued so the cron picks it up, or run immediately
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  if (campaign.status === 'draft') {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'queued' },
    });
    return NextResponse.json({ success: true, message: 'Campaign queued — will start on next executor run (every 30 min)' });
  }

  // If already running/queued, process one batch now
  const { runCampaignBatch } = await import('@/lib/campaigns/campaign-runner');
  const result = await runCampaignBatch(campaignId, 270_000);

  return NextResponse.json({ success: true, result });
}

async function handleRunSingle(campaignId: string) {
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 });

  const { prisma } = await import('@/lib/db');
  const { runCampaignBatch } = await import('@/lib/campaigns/campaign-runner');

  // Temporarily set maxItemsPerRun to 1
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  if (!['running', 'queued', 'draft'].includes(campaign.status)) {
    return NextResponse.json({ error: `Cannot run — status is "${campaign.status}"` }, { status: 400 });
  }

  // Ensure it's running
  if (campaign.status !== 'running') {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'running', startedAt: campaign.startedAt || new Date() },
    });
  }

  // Set batch size to 1 temporarily
  const originalBatchSize = campaign.maxItemsPerRun;
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { maxItemsPerRun: 1 },
  });

  const result = await runCampaignBatch(campaignId, 270_000);

  // Restore batch size
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { maxItemsPerRun: originalBatchSize },
  });

  return NextResponse.json({ success: true, result });
}

async function handlePause(campaignId: string) {
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 });
  const { pauseCampaign } = await import('@/lib/campaigns/campaign-runner');
  await pauseCampaign(campaignId);
  return NextResponse.json({ success: true, message: 'Campaign paused' });
}

async function handleResume(campaignId: string) {
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 });
  const { resumeCampaign } = await import('@/lib/campaigns/campaign-runner');
  await resumeCampaign(campaignId);
  return NextResponse.json({ success: true, message: 'Campaign resumed — will continue on next executor run' });
}

async function handleCancel(campaignId: string) {
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 });
  const { cancelCampaign } = await import('@/lib/campaigns/campaign-runner');
  await cancelCampaign(campaignId);
  return NextResponse.json({ success: true, message: 'Campaign cancelled' });
}

/**
 * Kickstart — one-tap campaign creation + immediate first batch processing.
 * Creates the campaign, queues it, and runs the first batch of items right now.
 * Designed for ADHD owner: one tap → articles start getting enhanced.
 */
async function handleKickstart(body: Record<string, unknown>, request: NextRequest) {
  const { createCampaign, runCampaignBatch } = await import('@/lib/campaigns/campaign-runner');
  const { getDefaultSiteId } = await import('@/config/sites');
  const { logManualAction } = await import('@/lib/action-logger');

  const siteId = (body.siteId as string) || getDefaultSiteId();
  const preset = (body.preset as string) || 'enhance_all';

  // Built-in presets (same as cockpit UI)
  const PRESETS: Record<string, { name: string; type: string; operations: string[] }> = {
    enhance_all: {
      name: 'Full Content Enhancement',
      type: 'enhance_content',
      operations: [
        'expand_content', 'add_authenticity', 'fix_heading_hierarchy',
        'add_internal_links', 'add_affiliate_links', 'fix_meta_description',
      ],
    },
    fix_seo: {
      name: 'SEO Quick Fix',
      type: 'seo_optimize',
      operations: ['fix_meta_description', 'fix_meta_title', 'add_internal_links'],
    },
    add_revenue: {
      name: 'Revenue Injection',
      type: 'inject_affiliates',
      operations: ['add_affiliate_links'],
    },
    fix_arabic: {
      name: 'Arabic Content Expansion',
      type: 'fix_arabic',
      operations: ['expand_arabic'],
    },
    authenticity: {
      name: 'Authenticity Boost',
      type: 'enhance_content',
      operations: ['add_authenticity', 'expand_content'],
    },
    fix_not_indexed: {
      name: 'Fix Not-Indexed Pages (7+ days)',
      type: 'fix_indexing',
      operations: [
        'expand_content', 'add_internal_links', 'add_affiliate_links',
        'add_authenticity', 'fix_meta_description', 'inject_images',
      ],
    },
    seo_boost: {
      name: 'SEO Boost (Score < 80%)',
      type: 'seo_boost',
      operations: [
        'add_internal_links', 'add_affiliate_links', 'inject_images',
        'fix_meta_description', 'fix_meta_title', 'add_authenticity',
      ],
    },
  };

  const selectedPreset = PRESETS[preset];
  if (!selectedPreset) {
    return NextResponse.json({
      error: `Unknown preset: ${preset}. Available: ${Object.keys(PRESETS).join(', ')}`,
    }, { status: 400 });
  }

  const config = {
    operations: selectedPreset.operations,
    ...(body.config as Record<string, unknown> || {}),
  } as unknown as import('@/lib/campaigns/types').CampaignConfig;

  // Step 1: Create campaign
  const campaign = await createCampaign(
    siteId,
    body.name as string || selectedPreset.name,
    selectedPreset.type,
    config,
    'kickstart',
  );

  if (campaign.totalItems === 0) {
    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      totalItems: 0,
      message: 'No articles need enhancement — all already meet thresholds',
    });
  }

  // Step 2: Set to running
  const { prisma } = await import('@/lib/db');
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: 'running', startedAt: new Date() },
  });

  // Step 3: Run first batch immediately (budget: 250s to leave room for response)
  const result = await runCampaignBatch(campaign.id, 250_000);

  logManualAction(request, {
    action: 'kickstart-campaign',
    resource: 'campaign',
    resourceId: campaign.id,
    success: true,
    summary: `Kickstarted "${selectedPreset.name}" — ${campaign.totalItems} articles queued, ${result.itemsSucceeded} enhanced in first batch`,
  }).catch(err => console.warn('[campaigns] action-log failed:', err.message));

  return NextResponse.json({
    success: true,
    campaignId: campaign.id,
    totalItems: campaign.totalItems,
    firstBatch: {
      processed: result.itemsProcessed,
      succeeded: result.itemsSucceeded,
      failed: result.itemsFailed,
      costUsd: Math.round(result.totalCostUsd * 1000) / 1000,
      duration_ms: result.duration_ms,
    },
    message: `Campaign "${selectedPreset.name}" started with ${campaign.totalItems} articles. ${result.itemsSucceeded} enhanced in first batch. Cron will process ${3} more every 30 minutes.`,
    nextRun: 'Campaign executor runs at :20 and :50 past every hour',
  });
}

async function handlePreview(body: Record<string, unknown>) {
  const { prisma } = await import('@/lib/db');
  const { getDefaultSiteId } = await import('@/config/sites');
  const { takeSnapshot, diagnoseArticle } = await import('@/lib/campaigns/article-enhancer');

  const siteId = (body.siteId as string) || getDefaultSiteId();
  const config = body.config as unknown as import('@/lib/campaigns/types').CampaignConfig;

  if (!config || !config.operations) {
    return NextResponse.json({ error: 'config.operations required' }, { status: 400 });
  }

  // Fetch all published articles and check which would be affected
  const articles = await prisma.blogPost.findMany({
    where: { siteId, published: true, deletedAt: null },
    select: {
      id: true, slug: true, title_en: true,
      content_en: true, content_ar: true,
      seo_score: true, meta_description_en: true,
      meta_title_en: true, featured_image: true,
    },
    orderBy: { created_at: 'asc' },
    take: 200,
  });

  const preview = articles.map(article => {
    const snapshot = takeSnapshot(
      article.content_en, article.content_ar,
      article as unknown as Record<string, unknown>,
    );
    const neededOps = diagnoseArticle(snapshot, config);

    return {
      id: article.id,
      slug: article.slug,
      title: article.title_en,
      wordCount: snapshot.wordCountEn,
      h2Count: snapshot.h2Count,
      affiliateCount: snapshot.affiliateLinkCount,
      internalLinkCount: snapshot.internalLinkCount,
      authenticitySignals: snapshot.authenticitySignalCount,
      metaDescLen: snapshot.metaDescLen,
      seoScore: snapshot.seoScore,
      operationsNeeded: neededOps,
      wouldProcess: neededOps.length > 0,
    };
  });

  const wouldProcess = preview.filter(p => p.wouldProcess);

  return NextResponse.json({
    totalArticles: articles.length,
    wouldProcess: wouldProcess.length,
    wouldSkip: articles.length - wouldProcess.length,
    preview: preview.sort((a, b) => b.operationsNeeded.length - a.operationsNeeded.length),
  });
}
