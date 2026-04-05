export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * Content Engine — Performance Metrics
 *
 * GET  — Retrieve performance data for a pipeline or across all pipelines for a site
 * POST — Log performance metrics for a pipeline's published content
 */

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");

    const { searchParams } = new URL(request.url);
    const pipelineId = searchParams.get("pipelineId");
    const siteId =
      searchParams.get("site") ||
      request.headers.get("x-site-id") ||
      getDefaultSiteId();
    const platform = searchParams.get("platform") || undefined;
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    // If a specific pipeline is requested, return its performance records
    if (pipelineId) {
      const records = await prisma.contentPerformance.findMany({
        where: {
          pipelineId,
          ...(platform ? { platform } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      // Aggregate totals
      const totals = records.reduce(
        (acc, r) => ({
          impressions: acc.impressions + r.impressions,
          engagements: acc.engagements + r.engagements,
          clicks: acc.clicks + r.clicks,
          shares: acc.shares + r.shares,
          saves: acc.saves + r.saves,
          comments: acc.comments + r.comments,
        }),
        { impressions: 0, engagements: 0, clicks: 0, shares: 0, saves: 0, comments: 0 },
      );

      return NextResponse.json({
        success: true,
        data: {
          pipelineId,
          records,
          totals,
          count: records.length,
        },
      });
    }

    // Site-wide performance: aggregate across all pipelines for the site
    const pipelines = await prisma.contentPipeline.findMany({
      where: { site: siteId },
      select: { id: true },
    });
    const pipelineIds = pipelines.map((p) => p.id);

    if (pipelineIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          siteId,
          records: [],
          totals: { impressions: 0, engagements: 0, clicks: 0, shares: 0, saves: 0, comments: 0 },
          count: 0,
          pipelineCount: 0,
        },
      });
    }

    const records = await prisma.contentPerformance.findMany({
      where: {
        pipelineId: { in: pipelineIds },
        ...(platform ? { platform } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        pipeline: {
          select: { id: true, topic: true, site: true },
        },
      },
    });

    const totals = records.reduce(
      (acc, r) => ({
        impressions: acc.impressions + r.impressions,
        engagements: acc.engagements + r.engagements,
        clicks: acc.clicks + r.clicks,
        shares: acc.shares + r.shares,
        saves: acc.saves + r.saves,
        comments: acc.comments + r.comments,
      }),
      { impressions: 0, engagements: 0, clicks: 0, shares: 0, saves: 0, comments: 0 },
    );

    // Per-platform breakdown
    const byPlatform: Record<string, { impressions: number; engagements: number; clicks: number; count: number }> = {};
    for (const r of records) {
      if (!byPlatform[r.platform]) {
        byPlatform[r.platform] = { impressions: 0, engagements: 0, clicks: 0, count: 0 };
      }
      byPlatform[r.platform].impressions += r.impressions;
      byPlatform[r.platform].engagements += r.engagements;
      byPlatform[r.platform].clicks += r.clicks;
      byPlatform[r.platform].count += 1;
    }

    return NextResponse.json({
      success: true,
      data: {
        siteId,
        records,
        totals,
        byPlatform,
        count: records.length,
        pipelineCount: pipelineIds.length,
      },
    });
  } catch (error) {
    console.error("[content-engine/performance] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch performance data" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");

    const body = await request.json();
    const {
      pipelineId,
      platform,
      contentType,
      postUrl,
      publishedAt,
      impressions,
      engagements,
      clicks,
      shares,
      saves,
      comments,
      conversionRate,
      grade,
      notes,
    } = body as {
      pipelineId: string;
      platform: string;
      contentType: string;
      postUrl?: string;
      publishedAt?: string;
      impressions?: number;
      engagements?: number;
      clicks?: number;
      shares?: number;
      saves?: number;
      comments?: number;
      conversionRate?: number;
      grade?: string;
      notes?: string;
    };

    if (!pipelineId) {
      return NextResponse.json({ error: "pipelineId is required" }, { status: 400 });
    }
    if (!platform) {
      return NextResponse.json({ error: "platform is required" }, { status: 400 });
    }
    if (!contentType) {
      return NextResponse.json({ error: "contentType is required" }, { status: 400 });
    }

    // Verify pipeline exists
    const pipeline = await prisma.contentPipeline.findUnique({
      where: { id: pipelineId },
    });
    if (!pipeline) {
      return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });
    }

    const record = await prisma.contentPerformance.create({
      data: {
        pipelineId,
        platform,
        contentType,
        postUrl: postUrl || null,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        impressions: impressions || 0,
        engagements: engagements || 0,
        clicks: clicks || 0,
        shares: shares || 0,
        saves: saves || 0,
        comments: comments || 0,
        conversionRate: conversionRate ?? null,
        grade: grade || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: record,
    }, { status: 201 });
  } catch (error) {
    console.error("[content-engine/performance] POST error:", error);
    return NextResponse.json(
      { error: "Failed to log performance metrics" },
      { status: 500 },
    );
  }
}
