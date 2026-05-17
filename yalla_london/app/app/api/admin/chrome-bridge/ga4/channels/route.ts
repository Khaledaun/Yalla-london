/**
 * GET /api/admin/chrome-bridge/ga4/channels?siteId=X&days=30
 *
 * Traffic acquisition breakdown by channel + source/medium. Answers:
 * "Where is traffic coming from and which channels convert best?"
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

    const perSitePropertyId =
      process.env[`GA4_PROPERTY_ID_${siteId.toUpperCase().replace(/-/g, "_")}`];

    const [channelReport, sourceMediumReport] = await Promise.all([
      runGA4CustomReport(
        {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          metrics: [
            { name: "sessions" },
            { name: "totalUsers" },
            { name: "engagementRate" },
            { name: "bounceRate" },
            { name: "screenPageViews" },
            { name: "averageSessionDuration" },
          ],
          limit: "20",
        },
        perSitePropertyId,
      ),
      runGA4CustomReport(
        {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
          metrics: [
            { name: "sessions" },
            { name: "engagementRate" },
            { name: "bounceRate" },
          ],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: "25",
        },
        perSitePropertyId,
      ),
    ]);

    if (!channelReport && !sourceMediumReport) {
      return NextResponse.json(
        {
          success: false,
          siteId,
          error: "GA4 not configured or unavailable",
          hint: "Set GA4_PROPERTY_ID + service account env vars in Vercel.",
        },
        { status: 503 },
      );
    }

    const channels = parseRows(channelReport, 1);
    const sourceMedium = parseRows(sourceMediumReport, 2);

    return NextResponse.json({
      success: true,
      siteId,
      dateRange: { startDate, endDate, days },
      channels: channels.map((r) => ({
        channel: r.dimensions[0] ?? "Unassigned",
        sessions: Number(r.metrics[0] ?? 0),
        totalUsers: Number(r.metrics[1] ?? 0),
        engagementRate: Number((Number(r.metrics[2] ?? 0) * 100).toFixed(2)),
        bounceRate: Number((Number(r.metrics[3] ?? 0) * 100).toFixed(2)),
        pageViews: Number(r.metrics[4] ?? 0),
        avgSessionDuration: Number(Number(r.metrics[5] ?? 0).toFixed(1)),
      })),
      sourceMedium: sourceMedium.map((r) => ({
        source: r.dimensions[0] ?? "(not set)",
        medium: r.dimensions[1] ?? "(not set)",
        sessions: Number(r.metrics[0] ?? 0),
        engagementRate: Number((Number(r.metrics[1] ?? 0) * 100).toFixed(2)),
        bounceRate: Number((Number(r.metrics[2] ?? 0) * 100).toFixed(2)),
      })),
      _hints: buildHints({ justCalled: "ga4-channels" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/ga4/channels]", message);
    return NextResponse.json(
      { error: "Failed to load GA4 channels", details: message },
      { status: 500 },
    );
  }
}

function parseRows(
  report: Record<string, unknown> | null,
  dimCount: number,
): Array<{ dimensions: string[]; metrics: string[] }> {
  if (!report || !Array.isArray(report.rows)) return [];
  return (report.rows as unknown[]).map((row) => {
    const r = row as Record<string, unknown>;
    const dimVals = Array.isArray(r.dimensionValues)
      ? (r.dimensionValues as Array<Record<string, unknown>>)
      : [];
    const metVals = Array.isArray(r.metricValues)
      ? (r.metricValues as Array<Record<string, unknown>>)
      : [];
    return {
      dimensions: dimVals.slice(0, dimCount).map((d) => String(d.value ?? "")),
      metrics: metVals.map((m) => String(m.value ?? "")),
    };
  });
}
