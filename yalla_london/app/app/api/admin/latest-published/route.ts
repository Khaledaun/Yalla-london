/**
 * Latest Published Content API
 *
 * Returns the 15 most recently published articles with:
 * - Indexing status (from URLIndexingStatus — matched by URL, not slug)
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

    // 2. Build canonical URLs for each article
    const articleUrls: string[] = [];
    const urlToSlug: Record<string, string> = {};
    for (const a of articles) {
      const url = `https://${domain}/blog/${a.slug}`;
      articleUrls.push(url);
      urlToSlug[url] = a.slug;
    }

    // 3. Fetch indexing status by URL (not slug — slug format is inconsistent across creation points)
    const indexingRows = await prisma.uRLIndexingStatus.findMany({
      where: {
        site_id: siteId,
        url: { in: articleUrls },
      },
      select: {
        url: true,
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
    const indexByUrl: Record<string, (typeof indexingRows)[0]> = {};
    for (const row of indexingRows) {
      indexByUrl[row.url] = row;
    }

    // 4. Fetch GSC performance metrics (last 30 days aggregated)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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

    // Aggregate GSC data per URL with impression-weighted CTR and position
    const gscByUrl: Record<
      string,
      { clicks: number; impressions: number; weightedCtr: number; weightedPos: number }
    > = {};
    for (const row of gscRows) {
      if (!gscByUrl[row.url]) {
        gscByUrl[row.url] = { clicks: 0, impressions: 0, weightedCtr: 0, weightedPos: 0 };
      }
      const agg = gscByUrl[row.url];
      agg.clicks += row.clicks;
      agg.impressions += row.impressions;
      // Weight CTR and position by impressions for accurate averaging
      agg.weightedCtr += row.ctr * row.impressions;
      agg.weightedPos += row.position * row.impressions;
    }

    // 5. Build response
    const result = articles.map((a) => {
      const url = `https://${domain}/blog/${a.slug}`;
      const idx = indexByUrl[url] || null;
      const gsc = gscByUrl[url] || null;

      // Compute impression-weighted averages
      let ctr = 0;
      let avgPosition = 0;
      if (gsc && gsc.impressions > 0) {
        ctr = Math.round((gsc.weightedCtr / gsc.impressions) * 1000) / 1000;
        avgPosition = Math.round((gsc.weightedPos / gsc.impressions) * 10) / 10;
      }

      return {
        id: a.id,
        title: a.title_en,
        slug: a.slug,
        url,
        pageType: a.page_type || "blog",
        seoScore: a.seo_score,
        // created_at is used as publish date — BlogPost has no published_at field.
        // For articles promoted from reservoir, created_at is the promotion timestamp.
        publishedAt: a.created_at,
        updatedAt: a.updated_at,
        // Indexing — matched by full URL for accuracy
        indexingStatus: idx?.status || "not_tracked",
        coverageState: idx?.coverage_state || null,
        submittedIndexNow: idx?.submitted_indexnow || false,
        submittedGoogleApi: idx?.submitted_google_api || false,
        submittedSitemap: idx?.submitted_sitemap || false,
        lastSubmittedAt: idx?.last_submitted_at || null,
        lastInspectedAt: idx?.last_inspected_at || null,
        lastCrawledAt: idx?.last_crawled_at || null,
        indexingError: idx?.last_error || null,
        indexingTrackedSince: idx?.created_at || null,
        // GSC Metrics (last 30 days, impression-weighted averages)
        clicks: gsc?.clicks || 0,
        impressions: gsc?.impressions || 0,
        ctr,
        avgPosition,
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
