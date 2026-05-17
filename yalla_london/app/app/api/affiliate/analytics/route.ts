/**
 * Affiliate Analytics API — Dashboard metrics
 * GET /api/affiliate/analytics?dateFrom=2026-01-01&dateTo=2026-03-09
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const dateFromParam = request.nextUrl.searchParams.get("dateFrom");
    const dateToParam = request.nextUrl.searchParams.get("dateTo");

    const dateTo = dateToParam ? new Date(dateToParam) : new Date();
    const dateFrom = dateFromParam
      ? new Date(dateFromParam)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days

    const { getDashboardMetrics, getSyncHealth } = await import("@/lib/affiliate/analytics");
    const [metrics, syncHealth] = await Promise.all([
      getDashboardMetrics(dateFrom, dateTo),
      getSyncHealth(),
    ]);

    return NextResponse.json({ success: true, metrics, syncHealth, dateFrom, dateTo });
  } catch (error) {
    console.warn("[affiliate-analytics] Failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: "Failed to fetch analytics" }, { status: 500 });
  }
});
