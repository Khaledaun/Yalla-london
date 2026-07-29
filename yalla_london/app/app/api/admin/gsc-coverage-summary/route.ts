export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * GSC Coverage Summary API
 *
 * Returns grouped "Not Indexed Reasons" from URLIndexingStatus + performance
 * trends from GscPagePerformance. Designed for the cockpit IndexingPanel.
 *
 * GET /api/admin/gsc-coverage-summary?siteId=yalla-london
 */

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { getDefaultSiteId } = await import("@/config/sites");
    const { getIndexingSummary } = await import("@/lib/seo/indexing-summary");
    const { getPerformanceTrend, getLastGscSyncTime } = await import("@/lib/seo/gsc-trend-analysis");

    const siteId =
      request.nextUrl.searchParams.get("siteId") ||
      request.headers.get("x-site-id") ||
      getDefaultSiteId();

    // 1. Use getIndexingSummary() as single source of truth for counts + blockers
    const summary = await getIndexingSummary(siteId);

    const totalTrackedUrls = summary.total;
    const indexed = summary.indexed;
    const notIndexed = totalTrackedUrls - indexed;

    // 2. Map blockers to reasons array (same format the frontend expects)
    const reasons = (summary.blockers || []).map((b) => ({
      reason: b.reason,
      count: b.count,
      severity: b.severity as "critical" | "warning" | "info",
    }));

    // 3. Get performance trend
    let trend = null;
    try {
      const siteTrend = await getPerformanceTrend(siteId, "7d");
      trend = {
        totalClicks7d: siteTrend.totalClicks.current,
        totalImpressions7d: siteTrend.totalImpressions.current,
        clicksChange: siteTrend.totalClicks.changePercent,
        impressionsChange: siteTrend.totalImpressions.changePercent,
        avgPosition: siteTrend.avgPosition.current,
        positionChange: siteTrend.avgPosition.change,
        avgCtr: siteTrend.avgCtr.current,
        ctrChange: siteTrend.avgCtr.change,
      };
    } catch (err) {
      console.warn("[gsc-coverage-summary] Trend analysis failed:", err instanceof Error ? err.message : String(err));
    }

    // 4. Get top droppers and gainers
    let topDroppers: Array<{ url: string; clicksDelta: number; impressionsDelta: number }> = [];
    let topGainers: Array<{ url: string; clicksDelta: number; impressionsDelta: number }> = [];
    try {
      const siteTrend = await getPerformanceTrend(siteId, "7d");
      topDroppers = siteTrend.topDroppers;
      topGainers = siteTrend.topGainers;
    } catch {
      // Already logged above
    }

    // 5. Get last sync time
    const lastSyncTime = await getLastGscSyncTime();
    const lastSynced = lastSyncTime
      ? `${Math.round((Date.now() - lastSyncTime.getTime()) / 3600000)}h ago`
      : "Never";

    return NextResponse.json({
      totalTrackedUrls,
      indexed,
      notIndexed,
      reasons,
      trend,
      topDroppers,
      topGainers,
      lastSynced,
    });
  } catch (err) {
    console.error("[gsc-coverage-summary] Error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: "Failed to load GSC coverage summary" },
      { status: 500 },
    );
  }
}
