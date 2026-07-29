/**
 * GET /api/admin/chrome-bridge/ga4/conversions?siteId=X&days=30&eventName=affiliate_click
 *
 * Returns event counts + per-event metrics. Defaults to all events in window
 * with key_events flag; filter by eventName for specific tracking (e.g.,
 * `affiliate_click` fired from /api/affiliate/click).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { getDefaultSiteId } = await import("@/config/sites");
    const { runGA4CustomReport } = await import("@/lib/seo/ga4-data-api");

    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const days = Math.min(
      parseInt(request.nextUrl.searchParams.get("days") || "30", 10),
      90,
    );
    const startDate = `${days}daysAgo`;
    const endDate = "today";
    const eventNameFilter = request.nextUrl.searchParams.get("eventName");

    const perSitePropertyId =
      process.env[`GA4_PROPERTY_ID_${siteId.toUpperCase().replace(/-/g, "_")}`];

    const body: Record<string, unknown> = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "eventName" }],
      metrics: [
        { name: "eventCount" },
        { name: "eventCountPerUser" },
        { name: "totalUsers" },
      ],
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
      limit: "50",
    };
    if (eventNameFilter) {
      body.dimensionFilter = {
        filter: {
          fieldName: "eventName",
          stringFilter: { value: eventNameFilter, matchType: "EXACT" },
        },
      };
    }

    const eventsReport = await runGA4CustomReport(body, perSitePropertyId);

    if (!eventsReport) {
      return NextResponse.json(
        {
          success: false,
          siteId,
          error: "GA4 not configured or unavailable",
        },
        { status: 503 },
      );
    }

    const rows = Array.isArray(eventsReport.rows)
      ? (eventsReport.rows as unknown[])
      : [];

    const events = rows.map((row) => {
      const r = row as Record<string, unknown>;
      const dimVals = Array.isArray(r.dimensionValues)
        ? (r.dimensionValues as Array<Record<string, unknown>>)
        : [];
      const metVals = Array.isArray(r.metricValues)
        ? (r.metricValues as Array<Record<string, unknown>>)
        : [];
      return {
        eventName: String(dimVals[0]?.value ?? ""),
        eventCount: Number(metVals[0]?.value ?? 0),
        eventsPerUser: Number(Number(metVals[1]?.value ?? 0).toFixed(2)),
        totalUsers: Number(metVals[2]?.value ?? 0),
      };
    });

    // Identify key business events
    const affiliateClicks = events.find((e) => e.eventName === "affiliate_click");
    const pageViews = events.find((e) => e.eventName === "page_view");
    const sessions = events.find((e) => e.eventName === "session_start");

    const affiliateConversionRate =
      pageViews && pageViews.eventCount > 0 && affiliateClicks
        ? Number(((affiliateClicks.eventCount / pageViews.eventCount) * 100).toFixed(3))
        : 0;

    return NextResponse.json({
      success: true,
      siteId,
      dateRange: { startDate, endDate, days },
      filter: eventNameFilter ?? "all events",
      eventCount: events.length,
      events,
      businessMetrics: {
        affiliateClicks: affiliateClicks?.eventCount ?? 0,
        pageViews: pageViews?.eventCount ?? 0,
        sessions: sessions?.eventCount ?? 0,
        affiliateConversionRate,
        affiliateConversionRatePct: `${affiliateConversionRate}%`,
      },
      _hints: buildHints({ justCalled: "ga4-conversions" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/ga4/conversions]", message);
    return NextResponse.json(
      { error: "Failed to load GA4 conversions", details: message },
      { status: 500 },
    );
  }
}
