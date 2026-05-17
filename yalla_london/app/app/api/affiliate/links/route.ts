/**
 * CJ Links API — List and manage affiliate links
 * GET /api/affiliate/links?advertiserId=...&category=...&isActive=true
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const { CJ_NETWORK_ID } = await import("@/lib/affiliate/cj-client");

    const advertiserId = request.nextUrl.searchParams.get("advertiserId");
    const category = request.nextUrl.searchParams.get("category");
    const isActive = request.nextUrl.searchParams.get("isActive");
    const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "50"), 100);

    const where: Record<string, unknown> = { networkId: CJ_NETWORK_ID };
    if (advertiserId) where.advertiserId = advertiserId;
    if (category) where.category = category;
    if (isActive !== null) where.isActive = isActive !== "false";

    const [links, total] = await Promise.all([
      prisma.cjLink.findMany({
        where,
        include: { advertiser: { select: { name: true, priority: true } } },
        orderBy: { clicks: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.cjLink.count({ where }),
    ]);

    return NextResponse.json({ success: true, links, total, page, limit });
  } catch (error) {
    console.warn("[affiliate-links] Failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: "Failed to fetch links" }, { status: 500 });
  }
});
