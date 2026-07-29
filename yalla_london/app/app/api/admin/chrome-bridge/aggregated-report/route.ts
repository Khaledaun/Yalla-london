/**
 * GET /api/admin/chrome-bridge/aggregated-report?siteId=X
 *
 * Returns the latest persisted SeoAuditReport row for a site. For fresh report
 * generation, Claude Chrome should call /api/admin/aggregated-report via admin
 * session (that endpoint runs heavy synthesis + writes to DB).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");

    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "5", 10),
      20,
    );

    const reports = await prisma.seoAuditReport.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        siteId: true,
        healthScore: true,
        totalFindings: true,
        criticalCount: true,
        highCount: true,
        mediumCount: true,
        lowCount: true,
        report: true,
        summary: true,
        triggeredBy: true,
        createdAt: true,
      },
    });

    if (reports.length === 0) {
      return NextResponse.json({
        success: true,
        siteId,
        latest: null,
        history: [],
        hint: "No aggregated reports yet. Trigger one via /admin/cockpit 'Generate Full Report' button.",
      });
    }

    return NextResponse.json({
      success: true,
      siteId,
      latest: reports[0],
      history: reports,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/aggregated-report]", message);
    return NextResponse.json(
      { error: "Failed to load aggregated report" },
      { status: 500 },
    );
  }
}
