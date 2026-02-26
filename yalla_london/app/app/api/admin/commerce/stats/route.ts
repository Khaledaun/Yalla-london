/**
 * Commerce Stats API — Aggregated dashboard data
 *
 * GET: Revenue by channel, top products, alerts, pipeline counts
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { getDefaultSiteId, getActiveSiteIds } from "@/config/sites";

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const { searchParams } = new URL(req.url);

    const siteId = searchParams.get("siteId") || getDefaultSiteId();
    const activeSiteIds = getActiveSiteIds();
    const targetSiteId = activeSiteIds.includes(siteId)
      ? siteId
      : getDefaultSiteId();

    const period = searchParams.get("period") ?? "month"; // today, week, month, all

    // Calculate date range
    const now = new Date();
    let startDate: Date | undefined;
    if (period === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === "week") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const dateFilter = startDate
      ? { createdAt: { gte: startDate } }
      : {};

    // Run all queries in parallel
    const [
      websiteRevenue,
      etsyRevenue,
      totalProducts,
      activeProducts,
      briefCounts,
      recentAlerts,
      topProducts,
      trendRunCount,
      activeCampaigns,
    ] = await Promise.all([
      // Website revenue
      prisma.purchase.aggregate({
        where: {
          siteId: targetSiteId,
          channel: "website",
          status: "completed",
          ...dateFilter,
        },
        _sum: { amount: true },
        _count: true,
      }),
      // Etsy revenue
      prisma.purchase.aggregate({
        where: {
          siteId: targetSiteId,
          channel: "etsy",
          status: "completed",
          ...dateFilter,
        },
        _sum: { amount: true },
        _count: true,
      }),
      // Total products
      prisma.digitalProduct.count({
        where: { siteId: targetSiteId },
      }),
      // Active products
      prisma.digitalProduct.count({
        where: { siteId: targetSiteId, active: true },
      }),
      // Brief status counts
      prisma.productBrief.groupBy({
        by: ["status"],
        where: { siteId: targetSiteId },
        _count: true,
      }),
      // Recent unread alerts
      prisma.commerceAlert.findMany({
        where: { siteId: targetSiteId, read: false },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      // Top products by revenue
      prisma.purchase.groupBy({
        by: ["digitalProductId"],
        where: {
          siteId: targetSiteId,
          status: "completed",
          ...dateFilter,
        },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: "desc" } },
        take: 5,
      }),
      // Trend runs count
      prisma.trendRun.count({
        where: { siteId: targetSiteId },
      }),
      // Active campaigns
      prisma.commerceCampaign.count({
        where: { siteId: targetSiteId, status: "active" },
      }),
    ]);

    // Resolve product names for top products
    const topProductIds = topProducts
      .map((p) => p.digitalProductId)
      .filter(Boolean);
    const productDetails: { id: string; name: string; tier: number | null }[] =
      topProductIds.length > 0
        ? await prisma.digitalProduct.findMany({
            where: { id: { in: topProductIds } },
            select: { id: true, name: true, tier: true },
          })
        : [];

    const productMap = new Map(productDetails.map((p) => [p.id, p]));

    return NextResponse.json({
      siteId: targetSiteId,
      period,
      revenue: {
        website: {
          totalCents: websiteRevenue._sum.amount ?? 0,
          orders: websiteRevenue._count,
        },
        etsy: {
          totalCents: etsyRevenue._sum.amount ?? 0,
          orders: etsyRevenue._count,
        },
        combined: {
          totalCents:
            (websiteRevenue._sum.amount ?? 0) +
            (etsyRevenue._sum.amount ?? 0),
          orders: websiteRevenue._count + etsyRevenue._count,
        },
      },
      products: {
        total: totalProducts,
        active: activeProducts,
      },
      pipeline: {
        briefs: briefCounts.reduce(
          (acc, item) => {
            acc[item.status] = item._count;
            return acc;
          },
          {} as Record<string, number>,
        ),
        trendRuns: trendRunCount,
        activeCampaigns,
      },
      topProducts: topProducts.map((p) => ({
        productId: p.digitalProductId,
        name: productMap.get(p.digitalProductId)?.name ?? "Unknown",
        tier: productMap.get(p.digitalProductId)?.tier ?? null,
        revenueCents: p._sum.amount ?? 0,
        orders: p._count,
      })),
      alerts: {
        unread: recentAlerts.length,
        recent: recentAlerts.map((a) => ({
          id: a.id,
          type: a.type,
          severity: a.severity,
          title: a.title,
          message: a.message,
          createdAt: a.createdAt,
          actionUrl: a.actionUrl,
        })),
      },
    });
  } catch (err) {
    console.warn(
      "[commerce-stats] GET error:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Failed to load commerce stats" },
      { status: 500 },
    );
  }
});
