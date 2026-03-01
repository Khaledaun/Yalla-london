/**
 * /api/admin/commerce/revenue
 *
 * Comprehensive revenue analytics for the commerce engine.
 * Multi-tenant, multi-channel (website + Etsy) — all real DB data.
 *
 * GET ?period=today|week|month|quarter|year|all&siteId=xxx
 *
 * Returns:
 *  - summary: totals, averages, channel split, daily/weekly time-series
 *  - products: per-product breakdown with channel split
 *  - customers: unique, repeat, top spenders
 *  - etsy: active listings, state breakdown, sync status
 *  - trends: WoW%, MoM%, best day, best product
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPeriodStart(period: string): Date {
  const now = new Date();
  switch (period) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "quarter": {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      return new Date(now.getFullYear(), qMonth, 1);
    }
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    case "all":
    default:
      return new Date(0);
  }
}

/** Generate array of date strings for the last N days (YYYY-MM-DD) */
function lastNDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

/** Week label: "Feb 3" format from a Date */
function weekLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function safeDivide(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth) return auth;

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "month";
  const siteId = searchParams.get("siteId") ?? getDefaultSiteId();
  const since = getPeriodStart(period);

  const { prisma } = await import("@/lib/db");

  try {
    // ------------------------------------------------------------------
    // 1. Fetch all completed + refunded purchases in period
    // ------------------------------------------------------------------
    const purchaseWhere = {
      site_id: siteId,
      created_at: { gte: since },
    };

    const [
      allPurchases,
      completedPurchases,
      refundedCount,
      etsyListings,
    ] = await Promise.all([
      // All purchases (for order count)
      prisma.purchase.findMany({
        where: purchaseWhere,
        select: {
          id: true,
          amount: true,
          currency: true,
          channel: true,
          status: true,
          customer_email: true,
          customer_name: true,
          product_id: true,
          created_at: true,
          completed_at: true,
          product: {
            select: {
              id: true,
              name_en: true,
              product_type: true,
              tier: true,
              price: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        take: 10000, // safety cap
      }),

      // Completed purchases (for revenue)
      prisma.purchase.findMany({
        where: { ...purchaseWhere, status: "COMPLETED" },
        select: {
          id: true,
          amount: true,
          channel: true,
          product_id: true,
          customer_email: true,
          created_at: true,
          product: {
            select: {
              id: true,
              name_en: true,
              product_type: true,
              tier: true,
            },
          },
        },
        take: 10000,
      }),

      // Refund count
      prisma.purchase.count({
        where: { ...purchaseWhere, status: "REFUNDED" },
      }),

      // Etsy listings for this site
      prisma.etsyListingDraft.findMany({
        where: { siteId },
        select: {
          id: true,
          title: true,
          price: true,
          etsyState: true,
          etsyUrl: true,
          status: true,
          publishedAt: true,
          lastSyncAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);

    // ------------------------------------------------------------------
    // 2. Summary calculations
    // ------------------------------------------------------------------
    const totalRevenue = completedPurchases.reduce((s, p) => s + p.amount, 0);
    const completedOrders = completedPurchases.length;
    const totalOrders = allPurchases.length;
    const averageOrderValue = Math.round(safeDivide(totalRevenue, completedOrders));
    const refundRate = totalOrders > 0
      ? Math.round((refundedCount / totalOrders) * 10000) / 100
      : 0;

    // Revenue by channel
    const websiteRevenue = completedPurchases
      .filter((p) => p.channel === "website")
      .reduce((s, p) => s + p.amount, 0);
    const websiteOrders = completedPurchases.filter((p) => p.channel === "website").length;
    const etsyRevenue = completedPurchases
      .filter((p) => p.channel === "etsy")
      .reduce((s, p) => s + p.amount, 0);
    const etsyOrders = completedPurchases.filter((p) => p.channel === "etsy").length;

    // Revenue by product (top 10)
    const productMap = new Map<string, { name: string; type: string; tier: number | null; revenue: number; orders: number; websiteRevenue: number; websiteOrders: number; etsyRevenue: number; etsyOrders: number }>();
    for (const p of completedPurchases) {
      const key = p.product_id;
      const existing = productMap.get(key) ?? {
        name: p.product?.name_en ?? "Unknown",
        type: p.product?.product_type ?? "UNKNOWN",
        tier: p.product?.tier ?? null,
        revenue: 0,
        orders: 0,
        websiteRevenue: 0,
        websiteOrders: 0,
        etsyRevenue: 0,
        etsyOrders: 0,
      };
      existing.revenue += p.amount;
      existing.orders += 1;
      if (p.channel === "etsy") {
        existing.etsyRevenue += p.amount;
        existing.etsyOrders += 1;
      } else {
        existing.websiteRevenue += p.amount;
        existing.websiteOrders += 1;
      }
      productMap.set(key, existing);
    }

    const revenueByProduct = Array.from(productMap.entries())
      .map(([productId, data]) => ({
        productId,
        name: data.name,
        type: data.type,
        tier: data.tier,
        totalRevenue: data.revenue,
        orderCount: data.orders,
        avgPrice: Math.round(safeDivide(data.revenue, data.orders)),
        websiteRevenue: data.websiteRevenue,
        websiteOrders: data.websiteOrders,
        etsyRevenue: data.etsyRevenue,
        etsyOrders: data.etsyOrders,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Revenue by day (last 30 days)
    const dayKeys = lastNDays(30);
    const revenueByDayMap = new Map<string, { revenue: number; orders: number }>();
    for (const d of dayKeys) revenueByDayMap.set(d, { revenue: 0, orders: 0 });
    for (const p of completedPurchases) {
      const dayKey = p.created_at.toISOString().slice(0, 10);
      const existing = revenueByDayMap.get(dayKey);
      if (existing) {
        existing.revenue += p.amount;
        existing.orders += 1;
      }
    }
    const revenueByDay = dayKeys.map((day) => ({
      date: day,
      revenue: revenueByDayMap.get(day)?.revenue ?? 0,
      orders: revenueByDayMap.get(day)?.orders ?? 0,
    }));

    // Revenue by week (last 12 weeks)
    const revenueByWeek: { weekStart: string; label: string; revenue: number; orders: number }[] = [];
    const now = new Date();
    for (let w = 11; w >= 0; w--) {
      const weekStart = new Date(now.getTime() - (w * 7 + now.getDay()) * 24 * 60 * 60 * 1000);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      let revenue = 0;
      let orders = 0;
      for (const p of completedPurchases) {
        if (p.created_at >= weekStart && p.created_at < weekEnd) {
          revenue += p.amount;
          orders += 1;
        }
      }
      revenueByWeek.push({
        weekStart: weekStart.toISOString().slice(0, 10),
        label: weekLabel(weekStart),
        revenue,
        orders,
      });
    }

    // ------------------------------------------------------------------
    // 3. Customer analysis
    // ------------------------------------------------------------------
    const customerSpend = new Map<string, { email: string; name: string | null; totalSpent: number; orderCount: number }>();
    for (const p of allPurchases) {
      if (p.status !== "COMPLETED") continue;
      const email = p.customer_email.toLowerCase();
      const existing = customerSpend.get(email) ?? {
        email,
        name: p.customer_name ?? null,
        totalSpent: 0,
        orderCount: 0,
      };
      existing.totalSpent += p.amount;
      existing.orderCount += 1;
      if (p.customer_name && !existing.name) existing.name = p.customer_name;
      customerSpend.set(email, existing);
    }

    const uniqueCustomers = customerSpend.size;
    const repeatCustomers = Array.from(customerSpend.values()).filter((c) => c.orderCount > 1).length;
    const topCustomers = Array.from(customerSpend.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5)
      .map((c) => ({
        email: c.email.replace(/(.{2}).*(@.*)/, "$1***$2"), // privacy: mask email
        name: c.name,
        totalSpent: c.totalSpent,
        orderCount: c.orderCount,
      }));

    // ------------------------------------------------------------------
    // 4. Etsy section
    // ------------------------------------------------------------------
    const activeListings = etsyListings.filter((l) => l.etsyState === "active").length;
    const listingsByState: Record<string, number> = {};
    for (const l of etsyListings) {
      const state = l.etsyState ?? l.status ?? "unknown";
      listingsByState[state] = (listingsByState[state] ?? 0) + 1;
    }

    const mostRecentSync = etsyListings
      .filter((l) => l.lastSyncAt)
      .sort((a, b) => (b.lastSyncAt!.getTime() - a.lastSyncAt!.getTime()))[0];

    const etsyAvgPrice = etsyListings.length > 0
      ? Math.round(etsyListings.reduce((s, l) => s + l.price, 0) / etsyListings.length)
      : 0;

    // ------------------------------------------------------------------
    // 5. Trends
    // ------------------------------------------------------------------
    // Week-over-week: compare this week vs last week
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thisWeekRevenue = completedPurchases
      .filter((p) => p.created_at >= oneWeekAgo)
      .reduce((s, p) => s + p.amount, 0);

    // Need last week's data — query separately if not already in period
    let lastWeekRevenue = 0;
    const lastWeekPurchases = completedPurchases.filter(
      (p) => p.created_at >= twoWeeksAgo && p.created_at < oneWeekAgo
    );
    if (lastWeekPurchases.length > 0) {
      lastWeekRevenue = lastWeekPurchases.reduce((s, p) => s + p.amount, 0);
    } else if (since > twoWeeksAgo) {
      // Period doesn't cover last week — query DB
      const lwPurchases = await prisma.purchase.findMany({
        where: {
          site_id: siteId,
          status: "COMPLETED",
          created_at: { gte: twoWeeksAgo, lt: oneWeekAgo },
        },
        select: { amount: true },
      });
      lastWeekRevenue = lwPurchases.reduce((s, p) => s + p.amount, 0);
    }

    const weekOverWeek = lastWeekRevenue > 0
      ? Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 10000) / 100
      : thisWeekRevenue > 0 ? 100 : 0;

    // Month-over-month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthRevenue = completedPurchases
      .filter((p) => p.created_at >= thisMonthStart)
      .reduce((s, p) => s + p.amount, 0);

    let lastMonthRevenue = 0;
    const lastMonthPurchases = completedPurchases.filter(
      (p) => p.created_at >= lastMonthStart && p.created_at < lastMonthEnd
    );
    if (lastMonthPurchases.length > 0) {
      lastMonthRevenue = lastMonthPurchases.reduce((s, p) => s + p.amount, 0);
    } else if (since > lastMonthStart) {
      const lmPurchases = await prisma.purchase.findMany({
        where: {
          site_id: siteId,
          status: "COMPLETED",
          created_at: { gte: lastMonthStart, lt: lastMonthEnd },
        },
        select: { amount: true },
      });
      lastMonthRevenue = lmPurchases.reduce((s, p) => s + p.amount, 0);
    }

    const monthOverMonth = lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 10000) / 100
      : thisMonthRevenue > 0 ? 100 : 0;

    // Best selling day (day-of-week name from completed purchases)
    const dayOfWeekRevenue = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    for (const p of completedPurchases) {
      dayOfWeekRevenue[p.created_at.getDay()] += p.amount;
    }
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const bestDayIdx = dayOfWeekRevenue.indexOf(Math.max(...dayOfWeekRevenue));
    const bestSellingDay = dayOfWeekRevenue[bestDayIdx] > 0
      ? dayNames[bestDayIdx]
      : null;

    // Best selling product
    const bestSellingProduct = revenueByProduct.length > 0
      ? { name: revenueByProduct[0].name, revenue: revenueByProduct[0].totalRevenue }
      : null;

    // ------------------------------------------------------------------
    // 6. Build response
    // ------------------------------------------------------------------
    return NextResponse.json({
      siteId,
      period,
      since: since.toISOString(),
      summary: {
        totalRevenue,
        completedOrders,
        totalOrders,
        averageOrderValue,
        refundRate,
        refundedCount,
        revenueByChannel: {
          website: { revenue: websiteRevenue, orders: websiteOrders },
          etsy: { revenue: etsyRevenue, orders: etsyOrders },
        },
        revenueByProduct,
        revenueByDay,
        revenueByWeek,
      },
      products: revenueByProduct,
      customers: {
        uniqueCustomers,
        repeatCustomers,
        topCustomers,
      },
      etsy: {
        totalListings: etsyListings.length,
        activeListings,
        avgPrice: etsyAvgPrice,
        listingsByState,
        recentSync: mostRecentSync?.lastSyncAt?.toISOString() ?? null,
      },
      trends: {
        weekOverWeek,
        monthOverMonth,
        bestSellingDay,
        bestSellingProduct,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[commerce-revenue] Failed to build analytics:", err);
    return NextResponse.json(
      { error: "Failed to load revenue analytics" },
      { status: 500 }
    );
  }
}
