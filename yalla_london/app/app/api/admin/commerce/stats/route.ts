/**
 * Commerce Stats API — Aggregated dashboard data
 *
 * GET: Revenue by channel, top products, alerts, pipeline counts
 *
 * IMPORTANT: DigitalProduct and Purchase models use snake_case field names
 * in Prisma schema. All queries must use snake_case for these models.
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

    // Purchase uses snake_case: created_at, site_id, etc.
    const dateFilter = startDate
      ? { created_at: { gte: startDate } }
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
      // Website revenue (Purchase model: snake_case fields)
      prisma.purchase.aggregate({
        where: {
          site_id: targetSiteId,
          channel: "website",
          status: "COMPLETED",
          ...dateFilter,
        },
        _sum: { amount: true },
        _count: true,
      }),
      // Etsy revenue (Purchase model: snake_case fields)
      prisma.purchase.aggregate({
        where: {
          site_id: targetSiteId,
          channel: "etsy",
          status: "COMPLETED",
          ...dateFilter,
        },
        _sum: { amount: true },
        _count: true,
      }),
      // Total products (DigitalProduct model: snake_case fields)
      prisma.digitalProduct.count({
        where: { site_id: targetSiteId },
      }),
      // Active products (DigitalProduct: is_active not active)
      prisma.digitalProduct.count({
        where: { site_id: targetSiteId, is_active: true },
      }),
      // Brief status counts (ProductBrief: camelCase)
      prisma.productBrief.groupBy({
        by: ["status"],
        where: { siteId: targetSiteId },
        _count: true,
      }),
      // Recent unread alerts (CommerceAlert: camelCase)
      prisma.commerceAlert.findMany({
        where: { siteId: targetSiteId, read: false },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      // Top products by revenue (Purchase: snake_case, group by product_id)
      prisma.purchase.groupBy({
        by: ["product_id"],
        where: {
          site_id: targetSiteId,
          status: "COMPLETED",
          ...dateFilter,
        },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: "desc" } },
        take: 5,
      }),
      // Trend runs count (TrendRun: camelCase)
      prisma.trendRun.count({
        where: { siteId: targetSiteId },
      }),
      // Active campaigns (CommerceCampaign: camelCase)
      prisma.commerceCampaign.count({
        where: { siteId: targetSiteId, status: "active" },
      }),
    ]);

    // Resolve product names for top products (DigitalProduct: name_en not name)
    const topProductIds = topProducts
      .map((p) => p.product_id)
      .filter(Boolean);
    const productDetails: { id: string; name_en: string; tier: number | null }[] =
      topProductIds.length > 0
        ? await prisma.digitalProduct.findMany({
            where: { id: { in: topProductIds } },
            select: { id: true, name_en: true, tier: true },
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
        productId: p.product_id,
        name: productMap.get(p.product_id)?.name_en ?? "Unknown",
        tier: productMap.get(p.product_id)?.tier ?? null,
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
