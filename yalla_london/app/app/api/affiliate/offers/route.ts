/**
 * CJ Offers API — List and filter offers/deals
 * GET /api/affiliate/offers?category=hotel&isActive=true&isPriceDropped=true
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const { CJ_NETWORK_ID } = await import("@/lib/affiliate/cj-client");

    const category = request.nextUrl.searchParams.get("category");
    const isActive = request.nextUrl.searchParams.get("isActive");
    const isPriceDropped = request.nextUrl.searchParams.get("isPriceDropped");
    const isNewArrival = request.nextUrl.searchParams.get("isNewArrival");
    const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "50"), 100);

    const where: Record<string, unknown> = { networkId: CJ_NETWORK_ID };
    if (category) where.category = category;
    if (isActive !== null) where.isActive = isActive !== "false";
    if (isPriceDropped === "true") where.isPriceDropped = true;
    if (isNewArrival === "true") where.isNewArrival = true;

    const [offers, total] = await Promise.all([
      prisma.cjOffer.findMany({
        where,
        include: { advertiser: { select: { name: true } } },
        orderBy: { priority: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.cjOffer.count({ where }),
    ]);

    return NextResponse.json({ success: true, offers, total, page, limit });
  } catch (error) {
    console.warn("[affiliate-offers] Failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: "Failed to fetch offers" }, { status: 500 });
  }
});
