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
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");
    const { getPerformanceTrend, getLastGscSyncTime } = await import("@/lib/seo/gsc-trend-analysis");

    const siteId =
      request.nextUrl.searchParams.get("siteId") ||
      request.headers.get("x-site-id") ||
      getDefaultSiteId();

    // 1. Get all URLIndexingStatus records for this site
    const allRecords = await prisma.uRLIndexingStatus.findMany({
      where: { site_id: siteId },
      select: { status: true, coverage_state: true, url: true },
    });

    const totalTrackedUrls = allRecords.length;
    const indexed = allRecords.filter(
      (r) => r.status === "indexed",
    ).length;
    const notIndexed = totalTrackedUrls - indexed;

    // 2. Group not-indexed URLs by coverage_state (reason)
    const reasonCounts = new Map<string, number>();
    for (const record of allRecords) {
      if (record.status === "indexed") continue;

      let reason = "Not inspected yet";
      const cs = record.coverage_state?.toLowerCase() || "";

      if (cs.includes("crawled") && cs.includes("not indexed")) {
        reason = "Crawled - currently not indexed";
      } else if (cs.includes("discovered") && cs.includes("not indexed")) {
        reason = "Discovered - currently not indexed";
      } else if (cs.includes("duplicate")) {
        reason = "Duplicate, Google chose different canonical";
      } else if (cs.includes("noindex")) {
        reason = "Excluded by noindex tag";
      } else if (cs.includes("blocked") || cs.includes("robots")) {
        reason = "Blocked by robots.txt";
      } else if (cs.includes("soft 404")) {
        reason = "Soft 404";
      } else if (cs.includes("404") || cs.includes("not found")) {
        reason = "Page not found (404)";
      } else if (cs.includes("redirect")) {
        reason = "Redirect";
      } else if (cs.includes("server error") || cs.includes("500")) {
        reason = "Server error";
      } else if (record.coverage_state) {
        reason = record.coverage_state;
      } else if (record.status === "submitted") {
        reason = "Submitted, awaiting crawl";
      } else if (record.status === "discovered") {
        reason = "Discovered, awaiting crawl";
      } else if (record.status === "error") {
        reason = "Submission error";
      } else if (record.status === "chronic_failure") {
        reason = "Chronic failure (5+ attempts)";
      }

      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    }

    // Build sorted reasons array
    const severityMap: Record<string, "critical" | "warning" | "info"> = {
      "Crawled - currently not indexed": "warning",
      "Discovered - currently not indexed": "info",
      "Duplicate, Google chose different canonical": "warning",
      "Excluded by noindex tag": "critical",
      "Blocked by robots.txt": "critical",
      "Soft 404": "warning",
      "Page not found (404)": "critical",
      "Redirect": "info",
      "Server error": "critical",
      "Submitted, awaiting crawl": "info",
      "Discovered, awaiting crawl": "info",
      "Submission error": "warning",
      "Chronic failure (5+ attempts)": "critical",
      "Not inspected yet": "info",
    };

    const reasons = Array.from(reasonCounts.entries())
      .map(([reason, count]) => ({
        reason,
        count,
        severity: severityMap[reason] || ("info" as "critical" | "warning" | "info"),
      }))
      .sort((a, b) => b.count - a.count);

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
