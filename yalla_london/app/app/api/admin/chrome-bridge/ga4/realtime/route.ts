/**
 * GET /api/admin/chrome-bridge/ga4/realtime?siteId=X
 *
 * Active users in the last 30 minutes. GA4 Realtime API.
 * Returns: total active users, by-country breakdown, top pages being viewed,
 * top sources sending traffic right now.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { getDefaultSiteId } = await import("@/config/sites");
    const { runGA4RealtimeReport } = await import("@/lib/seo/ga4-data-api");

    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const perSitePropertyId =
      process.env[`GA4_PROPERTY_ID_${siteId.toUpperCase().replace(/-/g, "_")}`];

    const [totalsReport, countryReport, pagesReport, sourcesReport] =
      await Promise.all([
        runGA4RealtimeReport(
          {
            metrics: [{ name: "activeUsers" }],
          },
          perSitePropertyId,
        ),
        runGA4RealtimeReport(
          {
            dimensions: [{ name: "country" }],
            metrics: [{ name: "activeUsers" }],
            limit: "20",
          },
          perSitePropertyId,
        ),
        runGA4RealtimeReport(
          {
            dimensions: [{ name: "unifiedScreenName" }],
            metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
            limit: "20",
          },
          perSitePropertyId,
        ),
        runGA4RealtimeReport(
          {
            dimensions: [{ name: "sessionSource" }],
            metrics: [{ name: "activeUsers" }],
            limit: "15",
          },
          perSitePropertyId,
        ),
      ]);

    if (!totalsReport) {
      return NextResponse.json(
        {
          success: false,
          siteId,
          error: "GA4 realtime not configured or unavailable",
          hint: "Realtime reports require same service account + GA4_PROPERTY_ID env vars as the standard Data API.",
        },
        { status: 503 },
      );
    }

    const totalsRows = Array.isArray(totalsReport.rows)
      ? (totalsReport.rows as unknown[])
      : [];
    const activeUsers = totalsRows.length > 0
      ? parseFirstMetric(totalsRows[0])
      : 0;

    return NextResponse.json({
      success: true,
      siteId,
      generatedAt: new Date().toISOString(),
      activeUsers,
      byCountry: extractDimensionMetricRows(countryReport, 1).map((r) => ({
        country: r.dimensions[0],
        activeUsers: Number(r.metrics[0] ?? 0),
      })),
      topPages: extractDimensionMetricRows(pagesReport, 1).map((r) => ({
        page: r.dimensions[0],
        activeUsers: Number(r.metrics[0] ?? 0),
        pageViews: Number(r.metrics[1] ?? 0),
      })),
      topSources: extractDimensionMetricRows(sourcesReport, 1).map((r) => ({
        source: r.dimensions[0],
        activeUsers: Number(r.metrics[0] ?? 0),
      })),
      _hints: buildHints({ justCalled: "ga4-realtime" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/ga4/realtime]", message);
    return NextResponse.json(
      { error: "Failed to load GA4 realtime", details: message },
      { status: 500 },
    );
  }
}

function parseFirstMetric(row: unknown): number {
  const r = row as Record<string, unknown>;
  const metVals = Array.isArray(r?.metricValues)
    ? (r.metricValues as Array<Record<string, unknown>>)
    : [];
  return Number(metVals[0]?.value ?? 0);
}

function extractDimensionMetricRows(
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
