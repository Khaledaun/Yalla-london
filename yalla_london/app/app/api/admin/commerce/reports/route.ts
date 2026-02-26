/**
 * Commerce Reports API — Weekly report generation and history
 *
 * GET: List report periods
 * POST: Generate on-demand weekly report
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { getDefaultSiteId, getActiveSiteIds } from "@/config/sites";

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);

    const siteId = searchParams.get("siteId") || getDefaultSiteId();
    const activeSiteIds = getActiveSiteIds();
    const targetSiteId = activeSiteIds.includes(siteId) ? siteId : getDefaultSiteId();
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "10") || 10, 50);

    const { getRecentReportPeriods } = await import("@/lib/commerce/report-generator");
    const periods = await getRecentReportPeriods(targetSiteId, limit);

    return NextResponse.json({ data: periods });
  } catch (err) {
    console.warn("[commerce-reports] GET error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { action } = body as { action: string };

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    // ── Generate weekly report ──
    if (action === "generate") {
      const { siteId: requestedSiteId } = body as { siteId?: string };
      const activeSiteIds = getActiveSiteIds();
      const siteId = requestedSiteId && activeSiteIds.includes(requestedSiteId)
        ? requestedSiteId
        : getDefaultSiteId();

      const { generateWeeklyReport } = await import("@/lib/commerce/report-generator");
      const report = await generateWeeklyReport(siteId, {
        calledFrom: "/api/admin/commerce/reports",
      });

      return NextResponse.json({
        success: true,
        message: `Weekly report generated for ${report.periodStart.slice(0, 10)} to ${report.periodEnd.slice(0, 10)}`,
        data: report,
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}. Supported: generate` },
      { status: 400 },
    );
  } catch (err) {
    console.warn("[commerce-reports] POST error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
});
