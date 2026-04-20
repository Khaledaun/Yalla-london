/**
 * GET /api/admin/chrome-bridge/pages?siteId=X&limit=N&offset=N
 * Published pages with GSC + indexing metrics, ranked by impressions desc.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");

    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "50", 10),
      200,
    );
    const offset = Math.max(
      parseInt(request.nextUrl.searchParams.get("offset") || "0", 10),
      0,
    );

    const domain = getSiteDomain(siteId);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const posts = await prisma.blogPost.findMany({
      where: { published: true, siteId },
      orderBy: { created_at: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        slug: true,
        title_en: true,
        title_ar: true,
        seo_score: true,
        created_at: true,
        updated_at: true,
        meta_description_en: true,
      },
    });

    const urls = posts.map((p) => `${domain}/blog/${p.slug}`);

    const [gscMetrics, indexingStatus] = await Promise.all([
      prisma.gscPagePerformance.groupBy({
        by: ["url"],
        where: { site_id: siteId, url: { in: urls }, date: { gte: since7d } },
        _sum: { clicks: true, impressions: true },
        _avg: { ctr: true, position: true },
      }),
      prisma.uRLIndexingStatus.findMany({
        where: { site_id: siteId, url: { in: urls } },
        select: { url: true, status: true, last_inspected_at: true },
      }),
    ]);

    const gscByUrl: Record<string, {
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }> = {};
    for (const m of gscMetrics) {
      gscByUrl[m.url] = {
        clicks: m._sum.clicks ?? 0,
        impressions: m._sum.impressions ?? 0,
        ctr: m._avg.ctr ?? 0,
        position: m._avg.position ?? 0,
      };
    }

    const indexingByUrl: Record<string, { status: string; lastInspectedAt: Date | null }> = {};
    for (const i of indexingStatus) {
      indexingByUrl[i.url] = {
        status: i.status,
        lastInspectedAt: i.last_inspected_at,
      };
    }

    const pages = posts.map((p) => {
      const url = `${domain}/blog/${p.slug}`;
      return {
        id: p.id,
        slug: p.slug,
        url,
        titleEn: p.title_en,
        titleAr: p.title_ar,
        seoScore: p.seo_score ?? undefined,
        metaDescription: p.meta_description_en ?? undefined,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        gsc7d: gscByUrl[url] ?? undefined,
        indexing: indexingByUrl[url] ?? undefined,
      };
    });

    return NextResponse.json({
      success: true,
      siteId,
      count: pages.length,
      limit,
      offset,
      pages,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/pages]", message);
    return NextResponse.json(
      { error: "Failed to load pages" },
      { status: 500 },
    );
  }
}
