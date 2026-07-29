/**
 * CJ Affiliate Analytics & Monitoring
 *
 * Dashboard metrics, content performance, advertiser ROI,
 * profitability reports, and actionable alerts.
 */

import { CJ_NETWORK_ID } from "./cj-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DashboardMetrics {
  totalClicks: number;
  totalCommissions: number;
  totalRevenue: number;
  totalSaleAmount: number;
  topLinks: Array<{ id: string; name: string; advertiserName: string; clicks: number; revenue: number; conversions: number }>;
  ctrByPlacement: Array<{ placement: string; impressions: number; clicks: number; ctr: number }>;
  revenueByAdvertiser: Array<{ advertiserName: string; revenue: number; commissions: number }>;
  revenueByCategory: Array<{ category: string; revenue: number }>;
  pendingAdvertisers: number;
  joinedAdvertisers: number;
  activeLinks: number;
  activeOffers: number;
}

export interface ProfitabilityReport {
  revenuePerMille: number; // RPM
  earningsPerClick: number; // EPC
  bestContentRoi: Array<{ pageUrl: string; clicks: number; revenue: number; rpm: number }>;
  worstContentRoi: Array<{ pageUrl: string; clicks: number; revenue: number }>;
  advertiserLeaderboard: Array<{ name: string; revenue: number; clicks: number; conversionRate: number; epc: number }>;
  placementLeaderboard: Array<{ type: string; clicks: number; revenue: number; ctr: number }>;
}

export interface AffiliateAlert {
  type: "broken_link" | "declining_ctr" | "zero_clicks" | "no_revenue" | "expiring_offer" | "unmonetized_content" | "pending_long";
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  details: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Dashboard Metrics
// ---------------------------------------------------------------------------

/**
 * Get aggregate dashboard metrics for a date range.
 */
export async function getDashboardMetrics(
  dateFrom: Date,
  dateTo: Date
): Promise<DashboardMetrics> {
  const { prisma } = await import("@/lib/db");

  const [
    clicksCount,
    commissionsAgg,
    topLinks,
    placementStats,
    advertiserRevenue,
    advertiserCounts,
    linkCount,
    offerCount,
  ] = await Promise.all([
    // Total clicks in period
    prisma.cjClickEvent.count({
      where: { createdAt: { gte: dateFrom, lte: dateTo } },
    }),

    // Commission aggregates
    prisma.cjCommission.aggregate({
      where: {
        networkId: CJ_NETWORK_ID,
        eventDate: { gte: dateFrom, lte: dateTo },
      },
      _sum: { commissionAmount: true, saleAmount: true },
      _count: true,
    }),

    // Top performing links by clicks
    prisma.cjLink.findMany({
      where: { networkId: CJ_NETWORK_ID, isActive: true },
      include: { advertiser: { select: { name: true } } },
      orderBy: { clicks: "desc" },
      take: 5,
    }),

    // CTR by placement type (link.placement field)
    prisma.cjLink.groupBy({
      by: ["placement"],
      where: { networkId: CJ_NETWORK_ID, isActive: true },
      _sum: { impressions: true, clicks: true },
    }),

    // Revenue by advertiser (from commissions)
    prisma.cjCommission.groupBy({
      by: ["advertiserId"],
      where: {
        networkId: CJ_NETWORK_ID,
        eventDate: { gte: dateFrom, lte: dateTo },
      },
      _sum: { commissionAmount: true },
      _count: true,
    }),

    // Advertiser counts
    prisma.cjAdvertiser.groupBy({
      by: ["status"],
      where: { networkId: CJ_NETWORK_ID },
      _count: true,
    }),

    // Active links count
    prisma.cjLink.count({
      where: { networkId: CJ_NETWORK_ID, isActive: true },
    }),

    // Active offers count
    prisma.cjOffer.count({
      where: { networkId: CJ_NETWORK_ID, isActive: true },
    }),
  ]);

  // Resolve advertiser names for revenue
  const advIds = advertiserRevenue.map((a) => a.advertiserId);
  const advNames = advIds.length > 0
    ? await prisma.cjAdvertiser.findMany({
        where: { id: { in: advIds } },
        select: { id: true, name: true },
      })
    : [];
  const advNameMap = new Map(advNames.map((a) => [a.id, a.name]));

  const pendingCount = advertiserCounts.find((c) => c.status === "PENDING")?._count || 0;
  const joinedCount = advertiserCounts.find((c) => c.status === "JOINED")?._count || 0;

  return {
    totalClicks: clicksCount,
    totalCommissions: commissionsAgg._count,
    totalRevenue: commissionsAgg._sum.commissionAmount || 0,
    totalSaleAmount: commissionsAgg._sum.saleAmount || 0,
    topLinks: topLinks.map((l) => ({
      id: l.id,
      name: l.name,
      advertiserName: l.advertiser.name,
      clicks: l.clicks,
      revenue: l.revenue,
      conversions: l.conversions,
    })),
    ctrByPlacement: placementStats
      .filter((p) => p.placement)
      .map((p) => ({
        placement: p.placement || "unknown",
        impressions: p._sum.impressions || 0,
        clicks: p._sum.clicks || 0,
        ctr:
          (p._sum.impressions || 0) > 0
            ? ((p._sum.clicks || 0) / (p._sum.impressions || 1)) * 100
            : 0,
      })),
    revenueByAdvertiser: advertiserRevenue.map((a) => ({
      advertiserName: advNameMap.get(a.advertiserId) || "Unknown",
      revenue: a._sum.commissionAmount || 0,
      commissions: a._count,
    })),
    revenueByCategory: [], // Would need join through links/offers
    pendingAdvertisers: pendingCount,
    joinedAdvertisers: joinedCount,
    activeLinks: linkCount,
    activeOffers: offerCount,
  };
}

/**
 * Get affiliate performance for a specific article.
 */
export async function getContentPerformance(articleSlug: string): Promise<{
  clicks: number;
  impressions: number;
  ctr: number;
  linksByAdvertiser: Array<{ advertiserName: string; clicks: number }>;
}> {
  const { prisma } = await import("@/lib/db");

  // Use slug boundary match to avoid "london" matching "london-hotels"
  const clickEvents = await prisma.cjClickEvent.findMany({
    where: {
      OR: [
        { pageUrl: { endsWith: `/${articleSlug}` } },
        { pageUrl: { contains: `/${articleSlug}?` } },
        { pageUrl: { contains: `/${articleSlug}#` } },
      ],
    },
    include: {
      link: {
        include: { advertiser: { select: { name: true } } },
      },
    },
  });

  const byAdvertiser = new Map<string, number>();
  for (const ev of clickEvents) {
    const name = ev.link?.advertiser?.name || "Unknown";
    byAdvertiser.set(name, (byAdvertiser.get(name) || 0) + 1);
  }

  return {
    clicks: clickEvents.length,
    impressions: 0, // Would need page view data
    ctr: 0,
    linksByAdvertiser: Array.from(byAdvertiser.entries()).map(([name, clicks]) => ({
      advertiserName: name,
      clicks,
    })),
  };
}

/**
 * Get actionable alerts for the admin dashboard.
 */
export async function getAlerts(): Promise<AffiliateAlert[]> {
  const { prisma } = await import("@/lib/db");
  const alerts: AffiliateAlert[] = [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  try {
    // 1. Zero-click links (active for 7+ days but 0 clicks)
    const zeroClickLinks = await prisma.cjLink.findMany({
      where: {
        networkId: CJ_NETWORK_ID,
        isActive: true,
        clicks: 0,
        createdAt: { lte: sevenDaysAgo },
      },
      include: { advertiser: { select: { name: true } } },
      take: 10,
    });
    for (const link of zeroClickLinks) {
      alerts.push({
        type: "zero_clicks",
        severity: "medium",
        message: `Link "${link.name}" (${link.advertiser.name}) has zero clicks after 7+ days`,
        details: { linkId: link.id, advertiserName: link.advertiser.name },
      });
    }

    // 2. Advertisers with no revenue in 30 days (batch query instead of N+1)
    const joinedAdvs = await prisma.cjAdvertiser.findMany({
      where: { networkId: CJ_NETWORK_ID, status: "JOINED" },
      select: { id: true, name: true },
    });
    if (joinedAdvs.length > 0) {
      const advsWithRevenue = await prisma.cjCommission.groupBy({
        by: ["advertiserId"],
        where: {
          advertiserId: { in: joinedAdvs.map((a) => a.id) },
          eventDate: { gte: thirtyDaysAgo },
        },
      });
      const advsWithRevenueSet = new Set<string>(advsWithRevenue.map((a) => a.advertiserId));
      for (const adv of joinedAdvs) {
        if (!advsWithRevenueSet.has(adv.id)) {
          alerts.push({
            type: "no_revenue",
            severity: "low",
            message: `${adv.name} has generated no revenue in the last 30 days`,
            details: { advertiserId: adv.id },
          });
        }
      }
    }

    // 3. Expiring offers (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const expiringOffers = await prisma.cjOffer.count({
      where: {
        networkId: CJ_NETWORK_ID,
        isActive: true,
        validTo: { lte: sevenDaysFromNow, gte: new Date() },
      },
    });
    if (expiringOffers > 0) {
      alerts.push({
        type: "expiring_offer",
        severity: "medium",
        message: `${expiringOffers} offer(s) expiring within 7 days`,
        details: { count: expiringOffers },
      });
    }

    // 4. Pending advertisers for >14 days
    const longPending = await prisma.cjAdvertiser.findMany({
      where: {
        networkId: CJ_NETWORK_ID,
        status: "PENDING",
        createdAt: { lte: fourteenDaysAgo },
      },
      select: { name: true, externalId: true },
    });
    for (const adv of longPending) {
      alerts.push({
        type: "pending_long",
        severity: "high",
        message: `${adv.name} has been pending for >14 days — follow up with CJ`,
        details: { externalId: adv.externalId },
      });
    }

    // 5. Last sync check
    const lastSync = await prisma.cjSyncLog.findFirst({
      where: { networkId: CJ_NETWORK_ID },
      orderBy: { createdAt: "desc" },
    });
    if (!lastSync || lastSync.createdAt < sevenDaysAgo) {
      alerts.push({
        type: "broken_link",
        severity: "critical",
        message: "CJ sync has not run in over 7 days — check cron configuration",
        details: { lastSync: lastSync?.createdAt?.toISOString() || "never" },
      });
    }
    if (lastSync?.status === "FAILED") {
      alerts.push({
        type: "broken_link",
        severity: "critical",
        message: `Last CJ sync failed: ${JSON.stringify(lastSync.errors)}`,
        details: { syncId: lastSync.id },
      });
    }
  } catch (err) {
    console.warn("[cj-analytics] Alert check failed:", err instanceof Error ? err.message : String(err));
  }

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Get sync health status for dashboard display.
 */
export async function getSyncHealth(): Promise<{
  lastSyncByType: Record<string, { at: Date; status: string; records: number }>;
  totalSyncs24h: number;
  failedSyncs24h: number;
}> {
  const { prisma } = await import("@/lib/db");

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const [recentSyncs, syncCounts] = await Promise.all([
    prisma.cjSyncLog.findMany({
      where: { networkId: CJ_NETWORK_ID },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.cjSyncLog.groupBy({
      by: ["status"],
      where: { networkId: CJ_NETWORK_ID, createdAt: { gte: oneDayAgo } },
      _count: true,
    }),
  ]);

  const lastByType: Record<string, { at: Date; status: string; records: number }> = {};
  for (const sync of recentSyncs) {
    if (!lastByType[sync.syncType]) {
      lastByType[sync.syncType] = {
        at: sync.createdAt,
        status: sync.status,
        records: sync.recordsProcessed,
      };
    }
  }

  const totalSyncs24h = syncCounts.reduce((sum, c) => sum + c._count, 0);
  const failedSyncs24h = syncCounts.find((c) => c.status === "FAILED")?._count || 0;

  return { lastSyncByType: lastByType, totalSyncs24h, failedSyncs24h };
}
