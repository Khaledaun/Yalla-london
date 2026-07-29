export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

/**
 * Admin Shop Stats API
 * GET /api/admin/shop/stats
 *
 * Returns real revenue, sales, and product data from the database.
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");

    // Get all products with purchase counts
    const products = await prisma.digitalProduct.findMany({
      include: {
        _count: {
          select: { purchases: true },
        },
        purchases: {
          where: { status: "COMPLETED" },
          select: { amount: true, currency: true, created_at: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    // Calculate stats
    const productStats = products.map((p) => {
      const completedPurchases = p.purchases;
      const revenue = completedPurchases.reduce(
        (sum, pur) => sum + pur.amount,
        0,
      );
      return {
        id: p.id,
        name: p.name_en,
        name_ar: p.name_ar,
        slug: p.slug,
        type: p.product_type,
        price: p.price / 100,
        currency: p.currency,
        image: p.cover_image,
        is_active: p.is_active,
        totalPurchases: p._count.purchases,
        completedSales: completedPurchases.length,
        revenue: revenue / 100,
        created_at: p.created_at,
      };
    });

    const totalRevenue =
      productStats.reduce((sum, p) => sum + p.revenue, 0);
    const totalSales =
      productStats.reduce((sum, p) => sum + p.completedSales, 0);
    const activeProducts = products.filter((p) => p.is_active).length;

    // Monthly revenue (last 30 days vs previous 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentPurchases = await prisma.purchase.findMany({
      where: {
        status: "COMPLETED",
        completed_at: { gte: sixtyDaysAgo },
      },
      select: { amount: true, completed_at: true },
    });

    const thisMonthRevenue = recentPurchases
      .filter((p) => p.completed_at && p.completed_at >= thirtyDaysAgo)
      .reduce((sum, p) => sum + p.amount, 0) / 100;

    const lastMonthRevenue = recentPurchases
      .filter(
        (p) =>
          p.completed_at &&
          p.completed_at >= sixtyDaysAgo &&
          p.completed_at < thirtyDaysAgo,
      )
      .reduce((sum, p) => sum + p.amount, 0) / 100;

    const monthlyGrowth =
      lastMonthRevenue > 0
        ? Math.round(
            ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100,
          )
        : thisMonthRevenue > 0
          ? 100
          : 0;

    // Recent orders
    const recentOrders = await prisma.purchase.findMany({
      where: { status: "COMPLETED" },
      include: { product: { select: { name_en: true } } },
      orderBy: { completed_at: "desc" },
      take: 10,
    });

    return NextResponse.json({
      stats: {
        totalRevenue,
        totalSales,
        activeProducts,
        monthlyGrowth,
        thisMonthRevenue,
      },
      products: productStats,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        product: o.product.name_en,
        customer: o.customer_email,
        amount: o.amount / 100,
        currency: o.currency,
        date: o.completed_at || o.created_at,
      })),
    });
  } catch (error) {
    console.error("[Admin Shop Stats] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop stats" },
      { status: 500 },
    );
  }
});
