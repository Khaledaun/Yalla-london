/**
 * GET /api/admin/chrome-bridge/overview
 * Lightweight cross-site snapshot for Claude Chrome session kickoff.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds } = await import("@/config/sites");

    const siteIds = getActiveSiteIds();
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      publishedPosts,
      cronFailures24h,
      pipelineByPhase,
      recentAuditReports,
      urlIndexingSummary,
    ] = await Promise.all([
      prisma.blogPost.groupBy({
        by: ["siteId"],
        where: { published: true, siteId: { in: siteIds } },
        _count: { _all: true },
      }),
      prisma.cronJobLog.count({
        where: { status: "failed", started_at: { gte: since24h } },
      }),
      prisma.articleDraft.groupBy({
        by: ["current_phase"],
        where: { site_id: { in: siteIds } },
        _count: { _all: true },
      }),
      prisma.chromeAuditReport
        .findMany({
          where: { uploadedAt: { gte: since7d } },
          orderBy: { uploadedAt: "desc" },
          take: 20,
          select: {
            id: true,
            siteId: true,
            pageUrl: true,
            auditType: true,
            severity: true,
            status: true,
            uploadedAt: true,
          },
        })
        .catch((err) => {
          console.warn(
            "[chrome-bridge/overview] chromeAuditReport query failed (table may not exist yet — run prisma migrate deploy):",
            err instanceof Error ? err.message : String(err),
          );
          return [];
        }),
      prisma.uRLIndexingStatus.groupBy({
        by: ["site_id", "status"],
        where: { site_id: { in: siteIds } },
        _count: { _all: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      sites: siteIds,
      publishedPostsBySite: publishedPosts.map((p) => ({
        siteId: p.siteId,
        count: p._count._all,
      })),
      cronFailures24h,
      pipelineByPhase: pipelineByPhase.map((p) => ({
        phase: p.current_phase,
        count: p._count._all,
      })),
      recentAuditReports,
      urlIndexingSummary: urlIndexingSummary.map((r) => ({
        siteId: r.site_id,
        status: r.status,
        count: r._count._all,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/overview]", message);
    return NextResponse.json(
      { error: "Failed to build overview" },
      { status: 500 },
    );
  }
}
