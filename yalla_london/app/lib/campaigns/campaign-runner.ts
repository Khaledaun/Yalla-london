/**
 * Campaign Agent — Campaign Runner
 *
 * Orchestrates campaign execution: picks up active campaigns, processes
 * items one-at-a-time within budget, tracks progress, handles failures.
 *
 * Called from: /api/cron/campaign-executor (every 30 min)
 *             /api/admin/campaigns POST { action: "run" } (manual trigger)
 *
 * Budget model:
 *   - Cron: 53s total budget, processes maxItemsPerRun items (default 3)
 *   - Manual: 55s total budget, processes 1 item at a time
 *   - Each item gets ~15-35s depending on operations
 */

import type { CampaignConfig, CampaignRunResult, CampaignOperation } from './types';
import { enhancePublishedArticle, expandArabicContent, takeSnapshot, diagnoseArticle } from './article-enhancer';

// ─── Create Campaign (auto-populate items) ───────────────────────────────────

export async function createCampaign(
  siteId: string,
  name: string,
  type: string,
  config: CampaignConfig,
  createdBy?: string,
): Promise<{ id: string; totalItems: number }> {
  const { prisma } = await import('@/lib/db');

  // Build where clause based on filters
  const where: Record<string, unknown> = {
    siteId,
    published: true,
    deletedAt: null,
  };

  if (config.filters?.publishedBefore) {
    where.created_at = { ...(where.created_at as Record<string, unknown> || {}), lt: new Date(config.filters.publishedBefore) };
  }
  if (config.filters?.publishedAfter) {
    where.created_at = { ...(where.created_at as Record<string, unknown> || {}), gt: new Date(config.filters.publishedAfter) };
  }

  // Fetch all matching articles
  const articles = await prisma.blogPost.findMany({
    where,
    select: {
      id: true, slug: true, title_en: true,
      content_en: true, content_ar: true,
      seo_score: true, meta_description_en: true,
      meta_title_en: true, featured_image: true,
      keywords_json: true,
    },
    orderBy: { created_at: 'asc' },
    take: 500, // Safety cap
  });

  // Filter articles based on content-level criteria
  const items = articles.filter(article => {
    const snapshot = takeSnapshot(
      article.content_en, article.content_ar,
      article as unknown as Record<string, unknown>,
    );

    // Apply filters
    if (config.filters?.minWordCount && snapshot.wordCountEn >= config.filters.minWordCount) return false;
    if (config.filters?.maxWordCount && snapshot.wordCountEn < config.filters.maxWordCount) return false;
    if (config.filters?.maxSeoScore && snapshot.seoScore !== null && snapshot.seoScore >= config.filters.maxSeoScore) return false;
    if (config.filters?.hasAffiliates === false && snapshot.affiliateLinkCount > 0) return false;
    if (config.filters?.hasAffiliates === true && snapshot.affiliateLinkCount === 0) return false;
    if (config.filters?.slugPattern && !new RegExp(config.filters.slugPattern).test(article.slug)) return false;

    // Check if any operations would actually be applied
    const neededOps = diagnoseArticle(snapshot, config);
    return neededOps.length > 0;
  });

  // Create campaign + items in a transaction
  const campaign = await prisma.campaign.create({
    data: {
      siteId,
      name,
      type,
      config: config as unknown as Record<string, unknown>,
      totalItems: items.length,
      createdBy: createdBy || 'system',
      items: {
        create: items.map(article => ({
          blogPostId: article.id,
          targetUrl: `/blog/${article.slug}`,
          targetTitle: article.title_en,
        })),
      },
    },
  });

  return { id: campaign.id, totalItems: items.length };
}

// ─── Run Campaign Batch ──────────────────────────────────────────────────────

export async function runCampaignBatch(
  campaignId: string,
  budgetMs: number = 50_000,
): Promise<CampaignRunResult> {
  const startTime = Date.now();
  const { prisma } = await import('@/lib/db');

  const result: CampaignRunResult = {
    campaignId,
    itemsProcessed: 0,
    itemsSucceeded: 0,
    itemsFailed: 0,
    itemsSkipped: 0,
    totalCostUsd: 0,
    errors: [],
    duration_ms: 0,
  };

  // Load campaign
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    result.errors.push('Campaign not found');
    return result;
  }

  if (campaign.status !== 'running' && campaign.status !== 'queued') {
    result.errors.push(`Campaign status is "${campaign.status}" — must be "running" or "queued"`);
    return result;
  }

  const config = campaign.config as unknown as CampaignConfig;

  // Mark as running if queued
  if (campaign.status === 'queued') {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'running', startedAt: new Date() },
    });
  }

  // Check cost ceiling
  if (campaign.maxAiCostUsd && campaign.currentCostUsd >= campaign.maxAiCostUsd) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'paused', pausedAt: new Date(), lastError: 'AI cost ceiling reached' },
    });
    result.errors.push('Cost ceiling reached');
    return result;
  }

  // Fetch pending items (ordered by creation = article age, oldest first)
  const pendingItems = await prisma.campaignItem.findMany({
    where: {
      campaignId,
      status: 'pending',
      attempts: { lt: 3 },
    },
    orderBy: { createdAt: 'asc' },
    take: campaign.maxItemsPerRun,
  });

  if (pendingItems.length === 0) {
    // Check if all items are done
    const remaining = await prisma.campaignItem.count({
      where: { campaignId, status: { in: ['pending', 'processing'] } },
    });

    if (remaining === 0) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'completed', completedAt: new Date() },
      });
    }

    result.duration_ms = Date.now() - startTime;
    return result;
  }

  // Process items one at a time with budget checks
  for (const item of pendingItems) {
    const remainingBudget = budgetMs - (Date.now() - startTime);
    if (remainingBudget < 20_000) {
      console.log(`[campaign-runner] Budget low (${Math.round(remainingBudget / 1000)}s) — stopping batch`);
      break;
    }

    // Check circuit breaker state — don't burn items when all providers are down
    try {
      const { getAllCircuitStates } = await import('@/lib/ai/provider');
      if (typeof getAllCircuitStates === 'function') {
        const circuits = getAllCircuitStates();
        if (circuits && Object.keys(circuits).length > 0 && Object.values(circuits).every(s => s.state === 'open')) {
          console.log('[campaign-runner] All AI providers circuit-open — pausing batch until cooldown');
          result.errors.push('All AI providers circuit-open — batch paused, will retry next run');
          break;
        }
      }
    } catch { /* getAllCircuitStates may not exist in older builds */ }

    // Mark as processing
    await prisma.campaignItem.update({
      where: { id: item.id },
      data: { status: 'processing', attempts: { increment: 1 } },
    });

    result.itemsProcessed++;

    try {
      if (!item.blogPostId) {
        await prisma.campaignItem.update({
          where: { id: item.id },
          data: { status: 'skipped', error: 'No blogPostId', processedAt: new Date() },
        });
        result.itemsSkipped++;
        continue;
      }

      // ── Determine operations needed ──────────────────────────────
      const neededOps = config.operations as CampaignOperation[];
      const hasArabicExpand = neededOps.includes('expand_arabic');
      const contentOps = neededOps.filter(o => o !== 'expand_arabic');

      let itemCost = 0;
      let allOpsApplied: CampaignOperation[] = [];
      let beforeSnap = null;
      let afterSnap = null;
      let changes = {};

      // ── Run content enhancement (if any non-Arabic ops) ────────
      if (contentOps.length > 0) {
        const itemBudget = Math.min(remainingBudget - 5000, 90_000);
        const enhanceResult = await enhancePublishedArticle(
          item.blogPostId, contentOps, config, itemBudget,
        );

        beforeSnap = enhanceResult.beforeSnapshot;
        afterSnap = enhanceResult.afterSnapshot || beforeSnap;
        changes = enhanceResult.changes;
        itemCost += enhanceResult.costUsd;
        allOpsApplied = enhanceResult.operationsApplied;

        if (!enhanceResult.success && enhanceResult.error !== 'Skipped — no operations needed') {
          throw new Error(enhanceResult.error || 'Enhancement failed');
        }
      }

      // ── Run Arabic expansion (separate call) ────────────────────
      if (hasArabicExpand && (budgetMs - (Date.now() - startTime)) > 15_000) {
        const arResult = await expandArabicContent(
          item.blogPostId,
          Math.min(budgetMs - (Date.now() - startTime) - 3000, 30_000),
        );
        if (arResult.success && arResult.wordsAdded > 0) {
          allOpsApplied.push('expand_arabic');
          changes = { ...changes, arabicExpanded: true };
          itemCost += arResult.costUsd;
        }
      }

      // ── Mark completed ──────────────────────────────────────────
      await prisma.campaignItem.update({
        where: { id: item.id },
        data: {
          status: 'completed',
          processedAt: new Date(),
          beforeSnapshot: beforeSnap as unknown as Record<string, unknown>,
          afterSnapshot: afterSnap as unknown as Record<string, unknown>,
          operationsApplied: allOpsApplied as unknown as Record<string, unknown>,
          changes: changes as unknown as Record<string, unknown>,
          aiCostUsd: itemCost,
        },
      });

      result.itemsSucceeded++;
      result.totalCostUsd += itemCost;

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[campaign-runner] Item ${item.id} failed:`, message);

      // attempts was already incremented when we set status=processing
      const currentAttempts = (item.attempts || 0) + 1;
      await prisma.campaignItem.update({
        where: { id: item.id },
        data: {
          status: currentAttempts >= 3 ? 'failed' : 'pending',
          error: message,
          processedAt: new Date(),
        },
      });

      result.itemsFailed++;
      result.errors.push(`${item.targetTitle}: ${message}`);
    }
  }

  // ── Update campaign progress ──────────────────────────────────────
  const counts = await prisma.campaignItem.groupBy({
    by: ['status'],
    where: { campaignId },
    _count: true,
  });

  const statusCounts = Object.fromEntries(counts.map(c => [c.status, c._count]));
  const completed = statusCounts['completed'] || 0;
  const failed = statusCounts['failed'] || 0;
  const skipped = statusCounts['skipped'] || 0;
  const pending = statusCounts['pending'] || 0;
  const processing = statusCounts['processing'] || 0;

  const isFinished = pending === 0 && processing === 0;

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      completedItems: completed,
      failedItems: failed,
      skippedItems: skipped,
      runCount: { increment: 1 },
      lastRunAt: new Date(),
      currentCostUsd: { increment: result.totalCostUsd },
      ...(isFinished ? { status: 'completed', completedAt: new Date() } : {}),
    },
  });

  result.duration_ms = Date.now() - startTime;
  return result;
}

// ─── Pause / Resume / Cancel ─────────────────────────────────────────────────

export async function pauseCampaign(campaignId: string): Promise<void> {
  const { prisma } = await import('@/lib/db');
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'paused', pausedAt: new Date() },
  });
}

export async function resumeCampaign(campaignId: string): Promise<void> {
  const { prisma } = await import('@/lib/db');
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'queued', pausedAt: null },
  });
}

export async function cancelCampaign(campaignId: string): Promise<void> {
  const { prisma } = await import('@/lib/db');
  await prisma.$transaction([
    prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'cancelled' },
    }),
    prisma.campaignItem.updateMany({
      where: { campaignId, status: { in: ['pending', 'processing'] } },
      data: { status: 'skipped', error: 'Campaign cancelled' },
    }),
  ]);
}

// ─── Get Campaign Status ─────────────────────────────────────────────────────

export async function getCampaignStatus(campaignId: string) {
  const { prisma } = await import('@/lib/db');

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
        take: 200,
      },
    },
  });

  if (!campaign) return null;

  // Aggregate changes across completed items
  const completedItems = campaign.items.filter(i => i.status === 'completed');
  const totalChanges = {
    totalWordsAdded: 0,
    totalH2sAdded: 0,
    totalInternalLinksAdded: 0,
    totalAffiliateLinksAdded: 0,
    totalAuthenticitySignalsAdded: 0,
    metaDescsRewritten: 0,
    arabicExpanded: 0,
  };

  for (const item of completedItems) {
    const changes = item.changes as Record<string, unknown> | null;
    if (changes) {
      totalChanges.totalWordsAdded += (changes.wordsAdded as number) || 0;
      totalChanges.totalH2sAdded += (changes.h2sAdded as number) || 0;
      totalChanges.totalInternalLinksAdded += (changes.internalLinksAdded as number) || 0;
      totalChanges.totalAffiliateLinksAdded += (changes.affiliateLinksAdded as number) || 0;
      totalChanges.totalAuthenticitySignalsAdded += (changes.authenticitySignalsAdded as number) || 0;
      if (changes.metaDescRewritten) totalChanges.metaDescsRewritten++;
      if (changes.arabicExpanded) totalChanges.arabicExpanded++;
    }
  }

  return {
    ...campaign,
    totalChanges,
    progressPercent: campaign.totalItems > 0
      ? Math.round(((campaign.completedItems + campaign.failedItems + campaign.skippedItems) / campaign.totalItems) * 100)
      : 0,
  };
}
