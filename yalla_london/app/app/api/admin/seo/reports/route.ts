export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminOrCronAuth } from "@/lib/admin-middleware";

/**
 * GET /api/admin/seo/reports
 *
 * Returns stored SEO reports from the SeoReport table.
 * Proves the orchestrator and SEO agent write data to the database.
 *
 * Query params:
 *   ?limit=N         — max reports (default: 10, max: 50)
 *   ?type=TYPE        — filter by reportType (optional)
 *   ?site=SITE_ID     — filter by site_id (optional)
 */
export const GET = withAdminOrCronAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const { searchParams } = new URL(request.url);

    const limit = Math.min(
      parseInt(searchParams.get("limit") || "10", 10),
      50,
    );
    const reportType = searchParams.get("type");
    const siteId = searchParams.get("site");

    const where: Record<string, unknown> = {};
    if (reportType) where.reportType = reportType;
    if (siteId) where.site_id = siteId;

    const [reports, total] = await Promise.all([
      prisma.seoReport.findMany({
        where,
        orderBy: { generatedAt: "desc" },
        take: limit,
      }),
      prisma.seoReport.count({ where }),
    ]);

    // Get distinct report types for reference
    const reportTypes = await prisma.seoReport.groupBy({
      by: ["reportType"],
      _count: true,
      orderBy: { _count: { reportType: "desc" } },
    });

    return NextResponse.json({
      reports: reports.map((r) => ({
        id: r.id,
        reportType: r.reportType,
        site_id: r.site_id,
        generatedAt: r.generatedAt,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        data: r.data,
      })),
      total,
      limit,
      reportTypes: reportTypes.map((rt) => ({
        type: rt.reportType,
        count: rt._count,
      })),
    });
  } catch (error) {
    console.error("[SEO Reports] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch reports" },
      { status: 500 },
    );
  }
});

export const POST = GET;
