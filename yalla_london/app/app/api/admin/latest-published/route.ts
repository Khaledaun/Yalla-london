/**
 * Latest Published Content API
 *
 * Returns the 15 most recently published articles with:
 * - Indexing status (from URLIndexingStatus)
 * - GSC metrics: impressions, clicks, CTR, position (from GscPagePerformance)
 * - Publication and indexing verification timestamps
 *
 * GET /api/admin/latest-published?siteId=yalla-london
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { getDefaultSiteId, getSiteDomain } from "@/config/sites";

async function handler(request: NextRequest) {
  const { prisma } = await import("@/lib/db");
  const siteId =
    request.nextUrl.searchParams.get("siteId") ||
    request.headers.get("x-site-id") ||
    getDefaultSiteId();

  const domain = getSiteDomain(siteId);

  try {
    // 1. Fetch latest 15 published articles
    const articles = await prisma.blogPost.findMany({
      where: { siteId, published: true, deletedAt: null },
      orderBy: { created_at: "desc" },
      take: 15,
      select: {
        id: true,
        title_en: true,
        slug: true,
        seo_score: true,
        created_at: true,
        updated_at: true,
        meta_title_en: true,
        page_type: true,
      },
    });

    if (articles.length === 0) {
      return NextResponse.json({ articles: [], siteId, domain });
    }

    // 2. Build URLs for each article
    const slugs = articles.map((a) => a.slug);
    const urlMap: Record<string, string> = {};
    for (const a of articles) {
      urlMap[a.slug] = `https://${domain}/blog/${a.slug}`;
    }

    // 3. Fetch indexing status for these slugs
    const indexingRows = await prisma.uRLIndexingStatus.findMany({
      where: {
        site_id: siteId,
        slug: { in: slugs },
      },
      select: {
        slug: true,
        status: true,
        coverage_state: true,
        submitted_indexnow: true,
        submitted_google_api: true,
        submitted_sitemap: true,
        last_submitted_at: true,
        last_inspected_at: true,
        last_crawled_at: true,
        last_error: true,
        created_at: true,
      },
    });
    const indexBySlug: Record<string, (typeof indexingRows)[0]> = {};
    for (const row of indexingRows) {
      if (row.slug) indexBySlug[row.slug] = row;
    }

    // 4. Fetch GSC performance metrics (last 30 days aggregated)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const articleUrls = articles.map((a) => urlMap[a.slug]);
    const gscRows = await prisma.gscPagePerformance.findMany({
      where: {
        site_id: siteId,
        url: { in: articleUrls },
        date: { gte: thirtyDaysAgo },
      },
      select: {
        url: true,
        clicks: true,
        impressions: true,
        ctr: true,
        position: true,
      },
    });

    // Aggregate GSC data per URL
    const gscByUrl: Record<
      string,
      { clicks: number; impressions: number; ctr: number; position: number; days: number }
    > = {};
    for (const row of gscRows) {
      if (!gscByUrl[row.url]) {
        gscByUrl[row.url] = { clicks: 0, impressions: 0, ctr: 0, position: 0, days: 0 };
      }
      const agg = gscByUrl[row.url];
      agg.clicks += row.clicks;
      agg.impressions += row.impressions;
      agg.ctr += row.ctr;
      agg.position += row.position;
      agg.days++;
    }
    // Average CTR and position
    for (const url of Object.keys(gscByUrl)) {
      const agg = gscByUrl[url];
      if (agg.days > 0) {
        agg.ctr = Math.round((agg.ctr / agg.days) * 1000) / 1000;
        agg.position = Math.round((agg.position / agg.days) * 10) / 10;
      }
    }

    // 5. Build response
    const result = articles.map((a) => {
      const url = urlMap[a.slug];
      const idx = indexBySlug[a.slug] || null;
      const gsc = gscByUrl[url] || null;

      return {
        id: a.id,
        title: a.title_en,
        slug: a.slug,
        url,
        pageType: a.page_type || "blog",
        seoScore: a.seo_score,
        publishedAt: a.created_at,
        updatedAt: a.updated_at,
        // Indexing
        indexingStatus: idx?.status || "unknown",
        coverageState: idx?.coverage_state || null,
        submittedIndexNow: idx?.submitted_indexnow || false,
        submittedGoogleApi: idx?.submitted_google_api || false,
        submittedSitemap: idx?.submitted_sitemap || false,
        lastSubmittedAt: idx?.last_submitted_at || null,
        lastInspectedAt: idx?.last_inspected_at || null,
        lastCrawledAt: idx?.last_crawled_at || null,
        indexingError: idx?.last_error || null,
        indexingTrackedSince: idx?.created_at || null,
        // GSC Metrics (last 30 days)
        clicks: gsc?.clicks || 0,
        impressions: gsc?.impressions || 0,
        ctr: gsc?.ctr || 0,
        avgPosition: gsc?.position || 0,
      };
    });

    return NextResponse.json({ articles: result, siteId, domain });
  } catch (err) {
    console.error("[latest-published] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Failed to load latest published content" },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handler);
