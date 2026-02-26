/**
 * Report Generator — Weekly commerce intelligence reports
 *
 * Generates comprehensive weekly reports with:
 * - Revenue breakdown (website vs Etsy, by product)
 * - Top products and trending niches
 * - Campaign progress and ROI
 * - AI-generated recommendations
 * - Payout profile verification status
 *
 * Called from: weekly cron or manual trigger via API.
 */

import { alertWeeklySummary } from "./alert-engine";

// ─── Report Types ────────────────────────────────────────

interface WeeklyReport {
  id: string;
  siteId: string;
  periodStart: string;
  periodEnd: string;
  revenue: {
    totalCents: number;
    websiteCents: number;
    etsyCents: number;
    orderCount: number;
    averageOrderCents: number;
    vsLastWeekPercent: number | null;
  };
  topProducts: {
    name: string;
    revenueCents: number;
    orders: number;
    channel: string;
  }[];
  campaigns: {
    name: string;
    status: string;
    progressPercent: number;
    tasksCompleted: number;
    tasksTotal: number;
  }[];
  trends: {
    topNiches: string[];
    newBriefsCount: number;
    approvedBriefsCount: number;
  };
  listings: {
    totalDrafts: number;
    published: number;
    pending: number;
  };
  aiRecommendations: string[];
  generatedAt: string;
}

// ─── Generate Weekly Report ──────────────────────────────

/**
 * Generate a comprehensive weekly commerce report for a site.
 */
export async function generateWeeklyReport(
  siteId: string,
  options: { calledFrom?: string } = {},
): Promise<WeeklyReport> {
  const { prisma } = await import("@/lib/db");

  // Calculate period (last 7 days)
  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 7);

  // Also get the week before that for comparison
  const prevPeriodEnd = new Date(periodStart);
  const prevPeriodStart = new Date(prevPeriodEnd);
  prevPeriodStart.setDate(prevPeriodStart.getDate() - 7);

  // ── Revenue Data ──
  const [thisWeekPurchases, lastWeekPurchases] = await Promise.all([
    prisma.purchase.findMany({
      where: {
        siteId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      include: { product: { select: { name_en: true } } },
    }),
    prisma.purchase.findMany({
      where: {
        siteId,
        createdAt: { gte: prevPeriodStart, lte: prevPeriodEnd },
      },
    }),
  ]);

  const websiteRevenue = thisWeekPurchases
    .filter((p) => p.channel === "website")
    .reduce((sum, p) => sum + p.amount, 0);
  const etsyRevenue = thisWeekPurchases
    .filter((p) => p.channel === "etsy")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalRevenue = websiteRevenue + etsyRevenue;
  const lastWeekTotal = lastWeekPurchases.reduce((sum, p) => sum + p.amount, 0);

  const vsLastWeekPercent = lastWeekTotal > 0
    ? Math.round(((totalRevenue - lastWeekTotal) / lastWeekTotal) * 100)
    : null;

  // ── Top Products ──
  const productMap = new Map<string, { name: string; revenue: number; orders: number; channel: string }>();
  for (const p of thisWeekPurchases) {
    const name = p.product?.name_en ?? "Unknown";
    const existing = productMap.get(p.productId) ?? { name, revenue: 0, orders: 0, channel: p.channel ?? "website" };
    existing.revenue += p.amount;
    existing.orders += 1;
    productMap.set(p.productId, existing);
  }

  const topProducts = [...productMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((p) => ({
      name: p.name,
      revenueCents: p.revenue,
      orders: p.orders,
      channel: p.channel,
    }));

  // ── Campaigns ──
  const campaigns = await prisma.commerceCampaign.findMany({
    where: {
      siteId,
      status: { in: ["active", "completed"] },
      OR: [
        { startDate: { gte: periodStart } },
        { endDate: { gte: periodStart } },
      ],
    },
    take: 10,
  });

  const campaignSummaries = campaigns.map((c) => {
    const tasks = (c.tasksJson as { status: string }[]) ?? [];
    const completed = tasks.filter((t) => t.status === "completed").length;
    return {
      name: c.name,
      status: c.status,
      progressPercent: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
      tasksCompleted: completed,
      tasksTotal: tasks.length,
    };
  });

  // ── Trends & Briefs ──
  const [recentBriefs, approvedBriefs, recentTrends] = await Promise.all([
    prisma.productBrief.count({
      where: { siteId, createdAt: { gte: periodStart } },
    }),
    prisma.productBrief.count({
      where: { siteId, status: "approved", approvedAt: { gte: periodStart } },
    }),
    prisma.trendRun.findFirst({
      where: { siteId, status: "completed" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const topNiches = recentTrends?.nichesJson
    ? (recentTrends.nichesJson as { niche: string }[]).slice(0, 5).map((n) => n.niche)
    : [];

  // ── Listings ──
  const [totalDrafts, publishedDrafts, pendingDrafts] = await Promise.all([
    prisma.etsyListingDraft.count({ where: { siteId } }),
    prisma.etsyListingDraft.count({ where: { siteId, status: "published" } }),
    prisma.etsyListingDraft.count({ where: { siteId, status: { in: ["draft", "approved"] } } }),
  ]);

  // ── AI Recommendations ──
  const recommendations = generateRecommendations({
    totalRevenue,
    orderCount: thisWeekPurchases.length,
    vsLastWeekPercent,
    topProducts,
    campaignSummaries,
    recentBriefs,
    approvedBriefs,
    publishedDrafts,
    pendingDrafts,
  });

  // ── Build Report ──
  const report: WeeklyReport = {
    id: `rpt-${siteId}-${periodStart.toISOString().slice(0, 10)}`,
    siteId,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    revenue: {
      totalCents: totalRevenue,
      websiteCents: websiteRevenue,
      etsyCents: etsyRevenue,
      orderCount: thisWeekPurchases.length,
      averageOrderCents: thisWeekPurchases.length > 0 ? Math.round(totalRevenue / thisWeekPurchases.length) : 0,
      vsLastWeekPercent,
    },
    topProducts,
    campaigns: campaignSummaries,
    trends: {
      topNiches,
      newBriefsCount: recentBriefs,
      approvedBriefsCount: approvedBriefs,
    },
    listings: {
      totalDrafts,
      published: publishedDrafts,
      pending: pendingDrafts,
    },
    aiRecommendations: recommendations,
    generatedAt: new Date().toISOString(),
  };

  // ── Fire weekly summary alert ──
  await alertWeeklySummary(siteId, {
    totalRevenueCents: totalRevenue,
    orderCount: thisWeekPurchases.length,
    newProducts: recentBriefs,
    activeCampaigns: campaigns.filter((c) => c.status === "active").length,
    topProduct: topProducts[0]?.name,
  });

  void options;

  return report;
}

// ─── AI Recommendations (rule-based) ─────────────────────

function generateRecommendations(data: {
  totalRevenue: number;
  orderCount: number;
  vsLastWeekPercent: number | null;
  topProducts: { name: string; revenueCents: number; orders: number }[];
  campaignSummaries: { progressPercent: number; status: string }[];
  recentBriefs: number;
  approvedBriefs: number;
  publishedDrafts: number;
  pendingDrafts: number;
}): string[] {
  const recs: string[] = [];

  // Revenue recommendations
  if (data.totalRevenue === 0) {
    recs.push("No revenue this week. Focus on publishing approved listings and running active campaigns.");
  } else if (data.vsLastWeekPercent !== null && data.vsLastWeekPercent < -20) {
    recs.push(`Revenue dropped ${Math.abs(data.vsLastWeekPercent)}% vs last week. Consider running a flash sale or refreshing Etsy listing tags.`);
  } else if (data.vsLastWeekPercent !== null && data.vsLastWeekPercent > 20) {
    recs.push(`Revenue grew ${data.vsLastWeekPercent}% vs last week. Double down on what's working — check your top seller for bundle opportunities.`);
  }

  // Product pipeline
  if (data.pendingDrafts > 3) {
    recs.push(`${data.pendingDrafts} listings pending review. Approve and publish them to start earning.`);
  }

  if (data.recentBriefs === 0) {
    recs.push("No new product briefs created this week. Run a trend scan to discover new opportunities.");
  }

  if (data.approvedBriefs > 0 && data.publishedDrafts === 0) {
    recs.push(`${data.approvedBriefs} briefs approved but no listings published. Generate listings from approved briefs.`);
  }

  // Campaign recommendations
  const activeCampaigns = data.campaignSummaries.filter((c) => c.status === "active");
  if (activeCampaigns.length === 0) {
    recs.push("No active campaigns. Launch a 30-day campaign for your best-selling product.");
  }

  const stuckCampaigns = activeCampaigns.filter((c) => c.progressPercent < 20);
  if (stuckCampaigns.length > 0) {
    recs.push(`${stuckCampaigns.length} campaign(s) below 20% progress. Complete daily tasks to maintain launch momentum.`);
  }

  // Top product insights
  if (data.topProducts.length > 0) {
    const top = data.topProducts[0];
    if (top.orders > 3) {
      recs.push(`"${top.name}" is your best seller (${top.orders} orders). Consider creating a bundle or related product.`);
    }
  }

  // If no recommendations generated, add a default
  if (recs.length === 0) {
    recs.push("Commerce engine is running smoothly. Keep publishing products and completing campaign tasks.");
  }

  return recs;
}

// ─── Report List Helper ──────────────────────────────────

/**
 * Get recent weekly reports for a site (from stored alerts/data).
 * Since reports are generated on-demand, this reconstructs from
 * weekly_summary alerts.
 */
export async function getRecentReportPeriods(
  siteId: string,
  limit = 10,
): Promise<{ date: string; hasReport: boolean }[]> {
  const { prisma } = await import("@/lib/db");

  const summaryAlerts = await prisma.commerceAlert.findMany({
    where: { siteId, type: "weekly_summary" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { createdAt: true },
  });

  return summaryAlerts.map((a) => ({
    date: a.createdAt.toISOString().slice(0, 10),
    hasReport: true,
  }));
}
