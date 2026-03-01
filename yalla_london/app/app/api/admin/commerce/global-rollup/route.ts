/**
 * Global Rollup API — Cross-tenant commerce dashboard
 *
 * GET: Returns aggregated commerce data across ALL active tenants:
 *   - Revenue by tenant (website + Etsy, 30-day)
 *   - Top products across network
 *   - Top trend opportunities network-wide
 *   - TrendRun cross-tenant pattern detection
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { requireAdmin } = await import("@/lib/admin-middleware");
    const authErr = await requireAdmin(req);
    if (authErr) return authErr;

    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds } = await import("@/config/sites");

    const activeSites = getActiveSiteIds();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Revenue by tenant (from Purchase table)
    const purchases = await prisma.purchase.findMany({
      where: {
        site_id: { in: activeSites },
        status: "COMPLETED",
        created_at: { gte: thirtyDaysAgo },
      },
      select: {
        site_id: true,
        amount: true,
        channel: true,
        currency: true,
      },
    });

    const revenueByTenant: Record<string, { siteId: string; websiteCents: number; etsyCents: number; totalCents: number; orders: number }> = {};
    for (const p of purchases) {
      if (!revenueByTenant[p.site_id]) {
        revenueByTenant[p.site_id] = { siteId: p.site_id, websiteCents: 0, etsyCents: 0, totalCents: 0, orders: 0 };
      }
      const entry = revenueByTenant[p.site_id];
      entry.totalCents += p.amount;
      entry.orders += 1;
      if (p.channel === "etsy") entry.etsyCents += p.amount;
      else entry.websiteCents += p.amount;
    }

    // Top products across network
    const topProducts = await prisma.purchase.groupBy({
      by: ["product_id", "site_id"],
      where: {
        site_id: { in: activeSites },
        status: "COMPLETED",
        created_at: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    });

    const productIds = topProducts.map((tp) => tp.product_id);
    const productNames = await prisma.digitalProduct.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name_en: true, site_id: true, tier: true },
    });
    const nameMap: Record<string, { name_en: string; tier: number | null }> = {};
    for (const p of productNames) {
      nameMap[p.id] = { name_en: p.name_en, tier: p.tier };
    }

    const topProductsList = topProducts.map((tp) => ({
      productId: tp.product_id,
      siteId: tp.site_id,
      name: nameMap[tp.product_id]?.name_en ?? "Unknown",
      tier: nameMap[tp.product_id]?.tier ?? null,
      revenueCents: tp._sum.amount ?? 0,
      orders: tp._count.id,
    }));

    // Top trend opportunities (from TrendRun briefs)
    const recentBriefs = await prisma.productBrief.findMany({
      where: {
        siteId: { in: activeSites },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        siteId: true,
        title: true,
        ontologyCategory: true,
        tier: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Cross-tenant pattern detection: find ontology categories appearing in 2+ sites
    const categoryBySite: Record<string, Set<string>> = {};
    for (const brief of recentBriefs) {
      const cat = brief.ontologyCategory ?? "uncategorized";
      if (!categoryBySite[cat]) categoryBySite[cat] = new Set();
      categoryBySite[cat].add(brief.siteId);
    }
    const crossTenantPatterns = Object.entries(categoryBySite)
      .filter(([, sites]) => sites.size >= 2)
      .map(([category, sites]) => ({
        category,
        siteCount: sites.size,
        sites: Array.from(sites),
        suggestion: `"${category}" works across ${sites.size} sites — consider templated cloning`,
      }));

    // TrendRun summary
    const trendRuns = await prisma.trendRun.findMany({
      where: {
        siteId: { in: activeSites },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { id: true, siteId: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      activeSites,
      period: "30d",
      revenueByTenant: Object.values(revenueByTenant),
      networkTotals: {
        totalRevenueCents: Object.values(revenueByTenant).reduce((sum, t) => sum + t.totalCents, 0),
        totalOrders: Object.values(revenueByTenant).reduce((sum, t) => sum + t.orders, 0),
        tenantCount: Object.keys(revenueByTenant).length,
      },
      topProducts: topProductsList,
      recentBriefs: recentBriefs.slice(0, 10),
      crossTenantPatterns,
      trendRunSummary: {
        total: trendRuns.length,
        byStatus: trendRuns.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error("[global-rollup] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to generate global rollup" }, { status: 500 });
  }
}
