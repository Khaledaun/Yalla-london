/**
 * Commerce Trends API — TrendRun listing and manual trigger
 *
 * GET: List recent TrendRuns with summaries
 * POST: Trigger a manual trend scan for a site
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { getDefaultSiteId, getActiveSiteIds } from "@/config/sites";

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const { searchParams } = new URL(req.url);

    const siteId = searchParams.get("siteId") || getDefaultSiteId();
    const activeSiteIds = getActiveSiteIds();
    const targetSiteId = activeSiteIds.includes(siteId)
      ? siteId
      : getDefaultSiteId();
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "10") || 10, 50);

    const runs = await prisma.trendRun.findMany({
      where: { siteId: targetSiteId },
      orderBy: { runDate: "desc" },
      take: limit,
      include: {
        briefs: {
          select: { id: true, title: true, status: true, tier: true },
        },
      },
    });

    const summaries = runs.map((run) => {
      const niches =
        (run.nichesJson as Array<{ niche?: string; score?: number }>) ?? [];
      return {
        id: run.id,
        siteId: run.siteId,
        runDate: run.runDate,
        status: run.status,
        nicheCount: niches.length,
        briefCount: run.briefs.length,
        topNiches: niches
          .slice(0, 5)
          .map((n) => ({ name: n.niche ?? "Unknown", score: n.score ?? 0 })),
        briefs: run.briefs,
        estimatedCostUsd: run.estimatedCostUsd,
        durationMs: run.durationMs,
        errorMessage: run.errorMessage,
      };
    });

    // Summary stats
    const totalRuns = await prisma.trendRun.count({
      where: { siteId: targetSiteId },
    });
    const completedRuns = await prisma.trendRun.count({
      where: { siteId: targetSiteId, status: "completed" },
    });

    return NextResponse.json({
      data: summaries,
      summary: {
        totalRuns,
        completedRuns,
        siteId: targetSiteId,
      },
    });
  } catch (err) {
    console.warn(
      "[commerce-trends] GET error:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "Failed to load trends" }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { action, siteId: requestedSiteId } = body as {
      action?: string;
      siteId?: string;
    };

    const activeSiteIds = getActiveSiteIds();
    const siteId =
      requestedSiteId && activeSiteIds.includes(requestedSiteId)
        ? requestedSiteId
        : getDefaultSiteId();

    if (action === "run_now" || !action) {
      const { executeTrendRun } = await import("@/lib/commerce/trend-engine");

      const result = await executeTrendRun(siteId, {
        maxNiches: 10,
        minScore: 40,
        calledFrom: "/api/admin/commerce/trends",
      });

      return NextResponse.json({
        success: true,
        message: `Trend scan completed — ${result.niches.length} niches found, ${result.briefsCreated} briefs created`,
        data: {
          trendRunId: result.trendRunId,
          nichesFound: result.niches.length,
          briefsCreated: result.briefsCreated,
          costUsd: result.estimatedCostUsd.toFixed(4),
          durationMs: result.durationMs,
        },
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}. Supported: run_now` },
      { status: 400 },
    );
  } catch (err) {
    console.warn(
      "[commerce-trends] POST error:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "Trend scan failed" }, { status: 500 });
  }
});
