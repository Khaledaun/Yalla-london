/**
 * CJ Advertisers API — List and filter advertisers
 * GET /api/affiliate/advertisers?status=PENDING&category=Hotel&priority=CRITICAL
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const { CJ_NETWORK_ID } = await import("@/lib/affiliate/cj-client");

    const status = request.nextUrl.searchParams.get("status");
    const category = request.nextUrl.searchParams.get("category");
    const priority = request.nextUrl.searchParams.get("priority");

    const where: Record<string, unknown> = { networkId: CJ_NETWORK_ID };
    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;

    const advertisers = await prisma.cjAdvertiser.findMany({
      where,
      include: {
        _count: { select: { links: true, offers: true, commissions: true } },
      },
      orderBy: { threeMonthEpc: "desc" },
    });

    return NextResponse.json({ success: true, advertisers });
  } catch (error) {
    console.warn("[affiliate-advertisers] Failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: "Failed to fetch advertisers" }, { status: 500 });
  }
});
