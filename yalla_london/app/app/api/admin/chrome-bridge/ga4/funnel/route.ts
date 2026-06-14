/**
 * GET /api/admin/chrome-bridge/ga4/funnel?siteId=X&days=30&pagePath=/blog/xyz
 *
 * Per-page engagement funnel: sessions, page_views, scroll depth events,
 * affiliate_click events. Lets Claude Chrome see where users drop off on a
 * specific article.
 *
 * If `pagePath` omitted, returns top 20 pages by session drop-off (highest
 * bounce pages ranked).
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
    const pagePath = request.nextUrl.searchParams.get("pagePath") ?? undefined;
    const startDate = `${days}daysAgo`;
    const endDate = "today";

    const perSitePropertyId =
      process.env[`GA4_PROPERTY_ID_${siteId.toUpperCase().replace(/-/g, "_")}`];

    if (pagePath) {
      // Single-page funnel
      const body: Record<string, unknown> = {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
        dimensionFilter: {
          filter: {
            fieldName: "pagePath",
            stringFilter: { value: pagePath, matchType: "EXACT" },
          },
        },
        limit: "30",
      };

      const report = await runGA4CustomReport(body, perSitePropertyId);
      if (!report) {
        return NextResponse.json(
          { success: false, siteId, error: "GA4 not configured" },
          { status: 503 },
        );
      }

      const rows = Array.isArray(report.rows) ? (report.rows as unknown[]) : [];
      const events: Record<string, number> = {};
      for (const row of rows) {
        const r = row as Record<string, unknown>;
        const dimVals = Array.isArray(r.dimensionValues)
          ? (r.dimensionValues as Array<Record<string, unknown>>)
          : [];
        const metVals = Array.isArray(r.metricValues)
          ? (r.metricValues as Array<Record<string, unknown>>)
          : [];
        const eventName = String(dimVals[0]?.value ?? "");
        events[eventName] = Number(metVals[0]?.value ?? 0);
      }

      const pageViews = events["page_view"] ?? 0;
      const scroll = events["scroll"] ?? 0;
      const affiliateClicks = events["affiliate_click"] ?? 0;
      const sessionStart = events["session_start"] ?? 0;

      return NextResponse.json({
        success: true,
        siteId,
        pagePath,
        dateRange: { startDate, endDate, days },
        funnel: {
          sessionStart,
          pageViews,
          scroll,
          affiliateClicks,
        },
        funnelRates: {
          scrollToView: pageViews > 0 ? Number((scroll / pageViews).toFixed(3)) : 0,
          affiliateClickRate:
            pageViews > 0 ? Number((affiliateClicks / pageViews).toFixed(3)) : 0,
          affiliateClickRatePct:
            pageViews > 0
              ? `${((affiliateClicks / pageViews) * 100).toFixed(2)}%`
              : "0%",
        },
        allEvents: events,
        _hints: buildHints({ justCalled: "ga4-funnel" }),
      });
    }

    // Aggregate: top pages by bounce/drop-off
    const body: Record<string, unknown> = {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "pagePath" }],
      metrics: [
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
      ],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: "50",
    };

    const report = await runGA4CustomReport(body, perSitePropertyId);
    if (!report) {
      return NextResponse.json(
        { success: false, siteId, error: "GA4 not configured" },
        { status: 503 },
      );
    }

    const rows = Array.isArray(report.rows) ? (report.rows as unknown[]) : [];
    const pages = rows.map((row) => {
      const r = row as Record<string, unknown>;
      const dimVals = Array.isArray(r.dimensionValues)
        ? (r.dimensionValues as Array<Record<string, unknown>>)
        : [];
      const metVals = Array.isArray(r.metricValues)
        ? (r.metricValues as Array<Record<string, unknown>>)
        : [];
      return {
        pagePath: String(dimVals[0]?.value ?? ""),
        sessions: Number(metVals[0]?.value ?? 0),
        pageViews: Number(metVals[1]?.value ?? 0),
        bounceRate: Number((Number(metVals[2]?.value ?? 0) * 100).toFixed(2)),
        avgSessionDuration: Number(Number(metVals[3]?.value ?? 0).toFixed(1)),
      };
    });

    // Worst performers (high traffic + high bounce)
    const worstPerformers = [...pages]
      .filter((p) => p.sessions >= 20 && p.bounceRate >= 70)
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 20);

    return NextResponse.json({
      success: true,
      siteId,
      dateRange: { startDate, endDate, days },
      hint: "Pass ?pagePath=/blog/xyz to drill into a single page's funnel.",
      pageCount: pages.length,
      pages,
      worstPerformers,
      _hints: buildHints({ justCalled: "ga4-funnel" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/ga4/funnel]", message);
    return NextResponse.json(
      { error: "Failed to load GA4 funnel", details: message },
      { status: 500 },
    );
  }
}
