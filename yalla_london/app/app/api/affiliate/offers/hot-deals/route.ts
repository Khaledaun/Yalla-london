/**
 * Hot Deals API — price drops, new arrivals, expiring soon
 * GET /api/affiliate/offers/hot-deals
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");
    const { getHotDeals } = await import("@/lib/affiliate/deal-discovery");
    const deals = await getHotDeals(limit);

    return NextResponse.json({ success: true, ...deals });
  } catch (error) {
    console.warn("[hot-deals] Failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: "Failed to fetch hot deals" }, { status: 500 });
  }
});
