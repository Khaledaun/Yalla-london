/**
 * GET /api/admin/chrome-bridge/cycle-health?siteId=X
 *
 * Lightweight pipeline health signals for Claude Chrome session kickoff.
 * For the full cycle-health engine output, Claude Chrome should call
 * /api/admin/cycle-health via admin session (bridge token is read-only).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds, getDefaultSiteId } = await import("@/config/sites");

    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const allSites = request.nextUrl.searchParams.get("allSites") === "true";
    const siteFilter = allSites ? { in: getActiveSiteIds() } : siteId;

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since4h = new Date(Date.now() - 4 * 60 * 60 * 1000);

    const [
      draftsByPhase,
      stuckDrafts,
      reservoirCount,
      recentCronFailures,
      recentPublishes,
      indexingCounts,
      aiFailures,
    ] = await Promise.all([
      prisma.articleDraft.groupBy({
        by: ["current_phase"],
        where: { site_id: siteFilter },
        _count: { _all: true },
      }),
      prisma.articleDraft.count({
        where: {
          site_id: siteFilter,
          current_phase: { notIn: ["reservoir", "published", "rejected"] },
          updated_at: { lt: since4h },
        },
      }),
      prisma.articleDraft.count({
        where: { site_id: siteFilter, current_phase: "reservoir" },
      }),
      prisma.cronJobLog.groupBy({
        by: ["job_name"],
        where: {
          site_id: typeof siteFilter === "string" ? siteFilter : undefined,
          status: "failed",
          started_at: { gte: since24h },
        },
        _count: { _all: true },
      }),
      prisma.blogPost.count({
        where: {
          siteId: siteFilter,
          published: true,
          created_at: { gte: since24h },
        },
      }),
      prisma.uRLIndexingStatus.groupBy({
        by: ["status"],
        where: { site_id: siteFilter },
        _count: { _all: true },
      }),
      prisma.apiUsageLog.count({
        where: {
          siteId: typeof siteFilter === "string" ? siteFilter : undefined,
          success: false,
          createdAt: { gte: since24h },
        },
      }),
    ]);

    const totalDrafts = draftsByPhase.reduce((s, p) => s + p._count._all, 0);
    const pipelineHealth =
      stuckDrafts === 0 && recentCronFailures.length <= 2
        ? "healthy"
        : stuckDrafts <= 5 && recentCronFailures.length <= 5
          ? "degraded"
          : "critical";

    return NextResponse.json({
      success: true,
      siteId: allSites ? "all" : siteId,
      generatedAt: new Date().toISOString(),
      pipelineHealth,
      draftsByPhase,
      totalDrafts,
      stuckDrafts,
      reservoirCount,
      recentPublishes24h: recentPublishes,
      cronFailures24h: recentCronFailures,
      indexingCounts,
      aiFailures24h: aiFailures,
      hint: "For full cycle-health engine output with Fix Now actions, use admin session to call /api/admin/cycle-health",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/cycle-health]", message);
    return NextResponse.json(
      { error: "Failed to load cycle health" },
      { status: 500 },
    );
  }
}
