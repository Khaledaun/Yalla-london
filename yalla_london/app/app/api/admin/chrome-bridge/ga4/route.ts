/**
 * GET /api/admin/chrome-bridge/ga4?siteId=X&days=N
 * GA4 metrics via fetchGA4Metrics.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { getDefaultSiteId } = await import("@/config/sites");
    const { fetchGA4Metrics } = await import("@/lib/seo/ga4-data-api");

    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const days = Math.min(
      parseInt(request.nextUrl.searchParams.get("days") || "30", 10),
      90,
    );

    const perSitePropertyId = process.env[
      `GA4_PROPERTY_ID_${siteId.toUpperCase().replace(/-/g, "_")}`
    ];

    const startDate = `${days}daysAgo`;
    const endDate = "today";
    const report = await fetchGA4Metrics(startDate, endDate, perSitePropertyId);

    if (!report) {
      return NextResponse.json({
        success: false,
        siteId,
        error: "GA4 credentials not configured or unavailable",
        hint: "Ensure GA4_PROPERTY_ID + service account env vars are set in Vercel.",
      });
    }

    return NextResponse.json({
      success: true,
      siteId,
      dateRange: { startDate, endDate, days },
      ...report,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/ga4]", message);
    return NextResponse.json(
      { error: "Failed to load GA4 data", details: message },
      { status: 500 },
    );
  }
}
