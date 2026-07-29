/**
 * CJ Affiliate Health Monitor
 *
 * Tracks link health, CTR, revenue trends, and content coverage.
 * Feeds alerts to the admin dashboard.
 */

import { CJ_NETWORK_ID } from "./cj-client";
import { getDefaultSiteId } from "@/config/sites";
import { hasAnyAffiliateMarker } from "./partner-detector";
import { getClickSummary, getClicksByArticle } from "./click-aggregator";

// ---------------------------------------------------------------------------
// Link Health Monitor
// ---------------------------------------------------------------------------

export interface LinkHealthReport {
  totalLinks: number;
  activeLinks: number;
  zeroClickLinks: number;
  zeroImpressionLinks: number;
  topPerformers: Array<{ id: string; name: string; clicks: number; ctr: number }>;
  underperformers: Array<{ id: string; name: string; impressions: number; clicks: number; ctr: number }>;
  healthScore: number; // 0–100
}

export async function checkLinkHealth(): Promise<LinkHealthReport> {
  const { prisma } = await import("@/lib/db");

  const links = await prisma.cjLink.findMany({
    where: { advertiser: { networkId: CJ_NETWORK_ID } },
    select: {
      id: true,
      name: true,
      clicks: true,
      impressions: true,
      isActive: true,
    },
    orderBy: { clicks: "desc" },
  });

  const active = links.filter((l) => l.isActive);
  const zeroClick = active.filter((l) => l.clicks === 0 && l.impressions > 0);
  const zeroImpression = active.filter((l) => l.impressions === 0);

  const withCtr = active
    .filter((l) => l.impressions > 0)
    .map((l) => ({
      ...l,
      ctr: l.impressions > 0 ? l.clicks / l.impressions : 0,
    }));

  const topPerformers = withCtr
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5)
    .map((l) => ({ id: l.id, name: l.name, clicks: l.clicks, ctr: l.ctr }));

  const underperformers = withCtr
    .filter((l) => l.ctr < 0.005 && l.impressions >= 10)
    .slice(0, 5)
    .map((l) => ({
      id: l.id,
      name: l.name,
      impressions: l.impressions,
      clicks: l.clicks,
      ctr: l.ctr,
    }));

  // Health score: penalize zero-click and zero-impression links
  const activeCount = active.length || 1;
  const zeroClickPenalty = (zeroClick.length / activeCount) * 30;
  const zeroImpPenalty = (zeroImpression.length / activeCount) * 20;
  const healthScore = Math.max(0, Math.round(100 - zeroClickPenalty - zeroImpPenalty));

  return {
    totalLinks: links.length,
    activeLinks: active.length,
    zeroClickLinks: zeroClick.length,
    zeroImpressionLinks: zeroImpression.length,
    topPerformers,
    underperformers,
    healthScore,
  };
}

// ---------------------------------------------------------------------------
// Revenue Monitor
// ---------------------------------------------------------------------------

export interface RevenueReport {
  last7Days: { revenue: number; commissions: number; avgPerDay: number };
  last30Days: { revenue: number; commissions: number; avgPerDay: number };
  byAdvertiser: Array<{ name: string; revenue: number; trend: "up" | "down" | "stable" }>;
  projectedMonthly: number;
}

export async function getRevenueReport(siteId?: string): Promise<RevenueReport> {
  const { prisma } = await import("@/lib/db");

  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400_000);
  const d30 = new Date(now.getTime() - 30 * 86400_000);
  const d60 = new Date(now.getTime() - 60 * 86400_000);

  // Include records for this site OR unscoped records (null siteId = legacy data before migration)
  const siteFilter = siteId ? { OR: [{ siteId }, { siteId: null }] } : {};

  const [last7, last30, prev30] = await Promise.all([
    prisma.cjCommission.findMany({
      where: { networkId: CJ_NETWORK_ID, eventDate: { gte: d7 }, ...siteFilter },
      select: { commissionAmount: true, advertiserId: true },
    }),
    prisma.cjCommission.findMany({
      where: { networkId: CJ_NETWORK_ID, eventDate: { gte: d30 }, ...siteFilter },
      include: { advertiser: { select: { name: true } } },
    }),
    prisma.cjCommission.findMany({
      where: { networkId: CJ_NETWORK_ID, eventDate: { gte: d60, lt: d30 }, ...siteFilter },
      include: { advertiser: { select: { name: true } } },
    }),
  ]);

  const rev7 = last7.reduce((s, c) => s + c.commissionAmount, 0);
  const rev30 = last30.reduce((s, c) => s + c.commissionAmount, 0);

  // Revenue by advertiser with trend
  const byAdv: Record<string, { current: number; previous: number; name: string }> = {};
  for (const c of last30) {
    const name = c.advertiser?.name || "Unknown";
    if (!byAdv[name]) byAdv[name] = { current: 0, previous: 0, name };
    byAdv[name].current += c.commissionAmount;
  }
  for (const c of prev30) {
    const name = c.advertiser?.name || "Unknown";
    if (!byAdv[name]) byAdv[name] = { current: 0, previous: 0, name };
    byAdv[name].previous += c.commissionAmount;
  }

  const byAdvertiser = Object.values(byAdv)
    .sort((a, b) => b.current - a.current)
    .map((a) => ({
      name: a.name,
      revenue: a.current,
      trend: (a.current > a.previous * 1.1 ? "up" : a.current < a.previous * 0.9 ? "down" : "stable") as "up" | "down" | "stable",
    }));

  return {
    last7Days: { revenue: rev7, commissions: last7.length, avgPerDay: rev7 / 7 },
    last30Days: { revenue: rev30, commissions: last30.length, avgPerDay: rev30 / 30 },
    byAdvertiser,
    projectedMonthly: (rev30 / 30) * 30,
  };
}

// ---------------------------------------------------------------------------
// Revenue Per Article — links affiliate clicks to specific articles via SID
// ---------------------------------------------------------------------------

export interface ArticleRevenueReport {
  articleSlug: string;
  articleTitle: string;
  clicks7d: number;
  clicks30d: number;
  revenue30d: number;
  topPartner: string | null;
  lastClickAt: string | null;
}

/**
 * Get affiliate revenue attribution per article.
 * Uses CjClickEvent.sessionId (format: "{siteId}_{articleSlug}") to link clicks to articles,
 * and CjCommission.sid to link revenue back to the originating article.
 */
export async function getRevenueByArticle(siteId?: string): Promise<ArticleRevenueReport[]> {
  const { prisma } = await import("@/lib/db");

  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400_000);
  const d30 = new Date(now.getTime() - 30 * 86400_000);

  const siteFilter = siteId ? { OR: [{ siteId }, { siteId: null }] } : {};

  // Unified clicks (CjClickEvent + AuditLog AFFILIATE_CLICK_DIRECT) via aggregator
  const [clicksByArticle30d, clicksByArticle7d, commissions] = await Promise.all([
    getClicksByArticle({ siteId, since: d30 }),
    getClicksByArticle({ siteId, since: d7 }),
    prisma.cjCommission.findMany({
      where: { eventDate: { gte: d30 }, ...siteFilter },
      select: { commissionAmount: true, sid: true, advertiser: { select: { name: true } } },
    }),
  ]);

  // Aggregate clicks by article — start from the 30d map and overlay 7d counts
  const articleMap = new Map<
    string,
    { clicks7d: number; clicks30d: number; revenue: number; lastClick: Date | null; partners: Set<string> }
  >();

  for (const [slug, count] of clicksByArticle30d.entries()) {
    articleMap.set(slug, {
      clicks7d: clicksByArticle7d.get(slug) || 0,
      clicks30d: count,
      revenue: 0,
      lastClick: null,
      partners: new Set(),
    });
  }

  // Populate lastClick from a direct query (aggregator returns counts only)
  const recentCjClicks = await prisma.cjClickEvent.findMany({
    where: { createdAt: { gte: d30 }, ...siteFilter },
    select: { pageUrl: true, sessionId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });
  for (const click of recentCjClicks) {
    const fromUrl = click.pageUrl?.match(/\/blog\/([^/?#]+)/)?.[1];
    const fromSession =
      click.sessionId?.includes("_") ? click.sessionId.split("_").slice(1).join("_") : null;
    const slug = fromUrl || fromSession;
    if (!slug) continue;
    const entry = articleMap.get(slug);
    if (entry && (!entry.lastClick || click.createdAt > entry.lastClick)) {
      entry.lastClick = click.createdAt;
    }
  }

  // Attribute revenue to articles via SID
  for (const comm of commissions) {
    if (comm.sid && comm.sid.includes("_")) {
      const slug = comm.sid.split("_").slice(1).join("_");
      if (!articleMap.has(slug)) articleMap.set(slug, { clicks7d: 0, clicks30d: 0, revenue: 0, lastClick: null, partners: new Set() });
      const entry = articleMap.get(slug)!;
      entry.revenue += comm.commissionAmount;
      if (comm.advertiser?.name) entry.partners.add(comm.advertiser.name);
    }
  }

  // Fetch article titles for known slugs
  const slugs = [...articleMap.keys()].filter(s => s !== "unknown");
  const articles = slugs.length > 0
    ? await prisma.blogPost.findMany({
        where: { slug: { in: slugs }, ...(siteId ? { siteId } : {}) },
        select: { slug: true, title_en: true },
      })
    : [];
  const titleMap = new Map(articles.map(a => [a.slug, a.title_en]));

  // Build sorted result
  return [...articleMap.entries()]
    .filter(([slug]) => slug !== "unknown")
    .map(([slug, data]) => ({
      articleSlug: slug,
      articleTitle: (titleMap.get(slug) as string) || slug,
      clicks7d: data.clicks7d,
      clicks30d: data.clicks30d,
      revenue30d: data.revenue,
      topPartner: data.partners.size > 0 ? [...data.partners][0] : null,
      lastClickAt: data.lastClick?.toISOString() || null,
    }))
    .sort((a, b) => b.clicks30d - a.clicks30d);
}

// ---------------------------------------------------------------------------
// Content Coverage Monitor
// ---------------------------------------------------------------------------

export interface ContentCoverageReport {
  totalArticles: number;
  articlesWithAffiliates: number;
  articlesWithoutAffiliates: number;
  coveragePercent: number;
  uncoveredArticles: Array<{ id: string; title: string; slug: string }>;
}

export async function getContentCoverage(siteId?: string): Promise<ContentCoverageReport> {
  const { prisma } = await import("@/lib/db");
  const targetSiteId = siteId || getDefaultSiteId();

  const articles = await prisma.blogPost.findMany({
    where: { published: true, deletedAt: null, siteId: targetSiteId },
    select: { id: true, title_en: true, slug: true, content_en: true },
    orderBy: { created_at: "desc" },
    take: 200,
  });

  // Shared affiliate-marker detector (synced with injection cron)
  const withAffiliates = articles.filter((a) => hasAnyAffiliateMarker(a.content_en));

  const without = articles.filter((a) => !hasAnyAffiliateMarker(a.content_en));

  return {
    totalArticles: articles.length,
    articlesWithAffiliates: withAffiliates.length,
    articlesWithoutAffiliates: without.length,
    coveragePercent: articles.length > 0 ? Math.round((withAffiliates.length / articles.length) * 100) : 0,
    uncoveredArticles: without.slice(0, 10).map((a) => ({
      id: a.id,
      title: a.title_en,
      slug: a.slug,
    })),
  };
}

// ---------------------------------------------------------------------------
// Profitability Calculator
// ---------------------------------------------------------------------------

export interface ProfitabilityReport {
  totalRevenue: number;
  estimatedCosts: {
    apiCalls: number;
    aiGeneration: number;
    hosting: number;
    total: number;
  };
  netProfit: number;
  roi: number; // percentage
  revenuePerArticle: number;
  revenuePerClick: number;
}

export async function getProfitabilityReport(siteId?: string): Promise<ProfitabilityReport> {
  const { prisma } = await import("@/lib/db");
  const targetSiteId = siteId || getDefaultSiteId();

  const d30 = new Date(Date.now() - 30 * 86400_000);

  // Include records for this site OR unscoped records (null siteId = legacy data before migration)
  const siteFilter = targetSiteId ? { OR: [{ siteId: targetSiteId }, { siteId: null }] } : {};

  const [commissions, clickSummary, articleCount, aiCosts] = await Promise.all([
    prisma.cjCommission.aggregate({
      where: { networkId: CJ_NETWORK_ID, eventDate: { gte: d30 }, ...siteFilter },
      _sum: { commissionAmount: true },
    }),
    // Unified click count (CjClickEvent + AuditLog AFFILIATE_CLICK_DIRECT)
    getClickSummary({ siteId: targetSiteId, since: d30 }),
    prisma.blogPost.count({
      where: { published: true, deletedAt: null, siteId: targetSiteId },
    }),
    prisma.apiUsageLog.aggregate({
      where: { createdAt: { gte: d30 }, siteId: targetSiteId },
      _sum: { estimatedCostUsd: true },
    }),
  ]);

  const clicks = clickSummary.total;
  const totalRevenue = commissions._sum.commissionAmount || 0;
  const aiCost = (aiCosts._sum.estimatedCostUsd || 0);
  const hostingCost = 20; // Vercel Pro $20/month estimate

  const estimatedCosts = {
    apiCalls: 0, // CJ API is free
    aiGeneration: aiCost,
    hosting: hostingCost,
    total: aiCost + hostingCost,
  };

  const netProfit = totalRevenue - estimatedCosts.total;
  const roi = estimatedCosts.total > 0 ? (netProfit / estimatedCosts.total) * 100 : 0;

  return {
    totalRevenue,
    estimatedCosts,
    netProfit,
    roi,
    revenuePerArticle: articleCount > 0 ? totalRevenue / articleCount : 0,
    revenuePerClick: clicks > 0 ? totalRevenue / clicks : 0,
  };
}
