export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminOrCronAuth } from "@/lib/admin-middleware";

/**
 * GET /api/admin/analytics/ga4
 *
 * Returns GA4 server-side analytics data (sessions, page views, traffic sources).
 * Accepts admin session OR CRON_SECRET for auth.
 */
export const GET = withAdminOrCronAuth(async (_request: NextRequest) => {
  try {
    const {
      isGA4Configured,
      getGA4ConfigStatus,
      fetchGA4Metrics,
    } = await import("@/lib/seo/ga4-data-api");

    const configured = isGA4Configured();
    const configStatus = getGA4ConfigStatus();

    if (!configured) {
      return NextResponse.json({
        configured: false,
        configStatus,
        metrics: null,
        topPages: null,
        topSources: null,
        message: "GA4 not configured — missing GA4_PROPERTY_ID or service account credentials",
      });
    }

    const report = await fetchGA4Metrics("30daysAgo", "today");

    if (!report) {
      return NextResponse.json({
        configured: true,
        configStatus,
        metrics: null,
        topPages: null,
        topSources: null,
        message: "GA4 configured but failed to fetch data — check service account permissions",
      });
    }

    return NextResponse.json({
      configured: true,
      configStatus,
      metrics: report.metrics,
      topPages: report.topPages,
      topSources: report.topSources,
      dateRange: report.dateRange,
      fetchedAt: report.fetchedAt,
    });
  } catch (error) {
    console.error("[GA4 Admin] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch GA4 data",
        configured: false,
      },
      { status: 500 },
    );
  }
});

export const POST = GET;
