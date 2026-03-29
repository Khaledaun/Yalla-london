/**
 * CJ Commissions API — List and filter commissions
 * GET /api/affiliate/commissions?dateFrom=2026-01-01&dateTo=2026-03-09&status=PENDING
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const { CJ_NETWORK_ID } = await import("@/lib/affiliate/cj-client");

    const dateFrom = request.nextUrl.searchParams.get("dateFrom");
    const dateTo = request.nextUrl.searchParams.get("dateTo");
    const status = request.nextUrl.searchParams.get("status");
    const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "50"), 100);

    const where: Record<string, unknown> = { networkId: CJ_NETWORK_ID };
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.eventDate = {};
      if (dateFrom) (where.eventDate as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.eventDate as Record<string, unknown>).lte = new Date(dateTo);
    }

    const [commissions, total, aggregates] = await Promise.all([
      prisma.cjCommission.findMany({
        where,
        include: { advertiser: { select: { name: true } } },
        orderBy: { eventDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.cjCommission.count({ where }),
      prisma.cjCommission.aggregate({
        where,
        _sum: { commissionAmount: true, saleAmount: true },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      success: true,
      commissions,
      total,
      page,
      limit,
      summary: {
        totalCommission: aggregates._sum.commissionAmount || 0,
        totalSales: aggregates._sum.saleAmount || 0,
        count: aggregates._count,
      },
    });
  } catch (error) {
    console.warn("[affiliate-commissions] Failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: "Failed to fetch commissions" }, { status: 500 });
  }
});
