/**
 * Audit History API
 *
 * GET — returns historical SeoAuditReport records for trend comparison
 *
 * Query params:
 *   siteId  — optional, defaults to getDefaultSiteId()
 *   limit   — optional, max records (default 10)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const siteId =
      request.headers.get("x-site-id") ||
      request.nextUrl.searchParams.get("siteId") ||
      getDefaultSiteId();
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "10", 10) || 10,
      50
    );

    const reports = await prisma.seoAuditReport.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        healthScore: true,
        totalFindings: true,
        criticalCount: true,
        highCount: true,
        mediumCount: true,
        lowCount: true,
        summary: true,
        triggeredBy: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      siteId,
      reports: reports.map((r) => ({
        id: r.id,
        healthScore: r.healthScore,
        totalFindings: r.totalFindings,
        criticalCount: r.criticalCount,
        highCount: r.highCount,
        mediumCount: r.mediumCount,
        lowCount: r.lowCount,
        summary: r.summary,
        triggeredBy: r.triggeredBy,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error(
      "[audit-history] GET error:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      { success: false, error: "Failed to load audit history" },
      { status: 500 }
    );
  }
}
