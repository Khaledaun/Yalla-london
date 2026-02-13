export const dynamic = "force-dynamic";
export const maxDuration = 45;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * Article Performance API
 *
 * Merges data from three sources to give a per-article performance view:
 *   1. Database: article metadata (title, slug, dates, SEO score)
 *   2. GSC: search impressions, clicks, CTR, avg position per URL
 *   3. GA4: pageviews, sessions, avg engagement time per URL
 *
 * Optionally checks indexing status via GSC URL Inspection (slow: ~6s/URL).
 *
 * Query params:
 *   ?days=30        — lookback window (default 30)
 *   ?siteId=...     — filter by site (default from header)
 *   ?checkIndex=true — also run URL inspection (slow, max 10 URLs)
 *   ?limit=50       — max articles returned (default 50)
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const days = parseInt(request.nextUrl.searchParams.get("days") || "30", 10);
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") || "50", 10),
    200
  );
  const checkIndex =
    request.nextUrl.searchParams.get("checkIndex") === "true";
  const siteId =
    request.nextUrl.searchParams.get("siteId") ||
    request.headers.get("x-site-id") ||
    "yalla-london";

  const startTime = Date.now();

  try {
    const { prisma } = await import("@/lib/db");
    const { searchConsole } = await import(
      "@/lib/integrations/google-search-console"
    );
    const { fetchGA4Metrics, isGA4Configured } = await import(
      "@/lib/seo/ga4-data-api"
    );

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

    // ── 1a. Get published blog articles from DB ────────────────────
    const articles = await prisma.blogPost.findMany({
      where: {
        published: true,
        deletedAt: null,
        ...(siteId ? { site_id: siteId } : {}),
      },
      orderBy: { created_at: "desc" },
      take: limit,
      select: {
        id: true,
        title_en: true,
        title_ar: true,
        slug: true,
        published: true,
        created_at: true,
        updated_at: true,
        seo_score: true,
        page_type: true,
        meta_title_en: true,
        meta_description_en: true,
        featured_image: true,
        category_id: true,
        site_id: true,
      },
    });

    // ── 1b. Get information hub articles (static data) ─────────────
    let infoHubArticles: Array<{
      id: string;
      title_en: string;
      slug: string;
      path: string;
      type: "info-section" | "info-article";
    }> = [];
    try {
      const { informationSections, informationArticles } = await import(
        "@/data/information-hub-content"
      );
      const { extendedInformationArticles } = await import(
        "@/data/information-hub-articles-extended"
      );
      const allInfoArticles = [
        ...informationArticles,
        ...extendedInformationArticles,
      ];
      infoHubArticles = [
        ...informationSections
          .filter((s: any) => s.published)
          .map((s: any) => ({
            id: `info-section-${s.slug}`,
            title_en: s.title_en || s.title || s.slug,
            slug: s.slug,
            path: `/information/${s.slug}`,
            type: "info-section" as const,
          })),
        ...allInfoArticles
          .filter((a: any) => a.published)
          .map((a: any) => ({
            id: `info-article-${a.slug}`,
            title_en: a.title_en || a.title || a.slug,
            slug: a.slug,
            path: `/information/articles/${a.slug}`,
            type: "info-article" as const,
          })),
      ];
    } catch {
      // Information hub data not available
    }

    // ── 2. Fetch GSC search analytics (per page) ───────────────────
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - days * 86400000)
      .toISOString()
      .split("T")[0];

    let gscPageData: Record<
      string,
      {
        clicks: number;
        impressions: number;
        ctr: number;
        position: number;
      }
    > = {};
    let gscConfigured = false;

    try {
      if (searchConsole.isConfigured()) {
        gscConfigured = true;
        const raw = await searchConsole.getSearchAnalytics(
          startDate,
          endDate,
          ["page"]
        );
        if (raw?.rows) {
          for (const row of raw.rows) {
            const pageUrl = row.keys?.[0] || "";
            // Normalize to path only
            const path = pageUrl.replace(/^https?:\/\/[^/]+/, "");
            gscPageData[path] = {
              clicks: row.clicks || 0,
              impressions: row.impressions || 0,
              ctr: row.ctr || 0,
              position: row.position || 0,
            };
          }
        }
      }
    } catch (e) {
      console.warn("GSC fetch failed:", (e as Error).message);
    }

    // ── 3. Fetch GA4 top pages ─────────────────────────────────────
    let ga4PageData: Record<
      string,
      { pageViews: number; sessions: number; avgEngagementTime: number }
    > = {};
    let ga4Configured = false;
    let ga4Metrics = null;

    try {
      if (isGA4Configured()) {
        ga4Configured = true;
        const report = await fetchGA4Metrics(
          `${days}daysAgo`,
          "today"
        );
        if (report) {
          ga4Metrics = report.metrics;
          for (const page of report.topPages) {
            ga4PageData[page.path] = {
              pageViews: page.pageViews,
              sessions: page.sessions,
              avgEngagementTime: page.avgEngagementTime,
            };
          }
        }
      }
    } catch (e) {
      console.warn("GA4 fetch failed:", (e as Error).message);
    }

    // ── 4. Optional: Check indexing status (slow) ──────────────────
    let indexingData: Record<
      string,
      { indexed: boolean; lastCrawl: string | null; verdict: string | null }
    > = {};

    if (checkIndex && gscConfigured) {
      // Check blog + info hub URLs (max 10 total to stay within timeout)
      const blogUrls = articles.slice(0, 5).map(
        (a: { slug: string }) => `${baseUrl}/blog/${a.slug}`
      );
      const infoUrls = infoHubArticles.slice(0, 5).map(
        (a: { path: string }) => `${baseUrl}${a.path}`
      );
      const urlsToCheck = [...blogUrls, ...infoUrls];
      try {
        const results = await searchConsole.checkBulkIndexingStatus(
          urlsToCheck
        );
        for (const r of results) {
          const path = r.url.replace(/^https?:\/\/[^/]+/, "");
          indexingData[path] = {
            indexed: r.indexingState === "INDEXED",
            lastCrawl: r.lastCrawlTime || null,
            verdict: r.verdict || r.coverageState || null,
          };
        }
      } catch (e) {
        console.warn("Indexing check failed:", (e as Error).message);
      }
    }

    // ── 5. Merge all data per article ──────────────────────────────
    // Blog articles from DB
    const mergedBlog = articles.map(
      (article: {
        id: string;
        title_en: string | null;
        title_ar: string | null;
        slug: string;
        created_at: Date;
        updated_at: Date;
        seo_score: number | null;
        page_type: string | null;
        meta_title_en: string | null;
        meta_description_en: string | null;
        featured_image: string | null;
        site_id: string | null;
      }) => {
        const path = `/blog/${article.slug}`;
        const fullUrl = `${baseUrl}${path}`;
        const gsc = gscPageData[path] || gscPageData[fullUrl] || null;
        const ga4 = ga4PageData[path] || ga4PageData[fullUrl] || null;
        const idx = indexingData[path] || null;

        return {
          id: article.id,
          title: article.title_en || article.title_ar || "(untitled)",
          slug: article.slug,
          url: fullUrl,
          path,
          contentType: "blog" as const,
          publishedAt: article.created_at?.toISOString(),
          updatedAt: article.updated_at?.toISOString(),
          seoScore: article.seo_score || 0,
          pageType: article.page_type,
          hasMetaTitle: !!article.meta_title_en,
          hasMetaDescription: !!article.meta_description_en,
          hasFeaturedImage: !!article.featured_image,
          siteId: article.site_id,
          gsc: gsc
            ? {
                impressions: gsc.impressions,
                clicks: gsc.clicks,
                ctr: Math.round(gsc.ctr * 10000) / 100,
                avgPosition: Math.round(gsc.position * 10) / 10,
              }
            : null,
          ga4: ga4
            ? {
                pageViews: ga4.pageViews,
                sessions: ga4.sessions,
                avgEngagementTime: Math.round(ga4.avgEngagementTime),
              }
            : null,
          indexing: idx,
        };
      }
    );

    // Information hub articles (static data)
    const mergedInfo = infoHubArticles.map((info) => {
      const fullUrl = `${baseUrl}${info.path}`;
      const gsc = gscPageData[info.path] || gscPageData[fullUrl] || null;
      const ga4 = ga4PageData[info.path] || ga4PageData[fullUrl] || null;
      const idx = indexingData[info.path] || null;

      return {
        id: info.id,
        title: info.title_en,
        slug: info.slug,
        url: fullUrl,
        path: info.path,
        contentType: info.type as string,
        publishedAt: new Date().toISOString(), // static content, no publish date
        updatedAt: new Date().toISOString(),
        seoScore: 0, // static content doesn't have DB SEO scores
        pageType: info.type,
        hasMetaTitle: true, // static pages have hardcoded meta
        hasMetaDescription: true,
        hasFeaturedImage: true,
        siteId: "yalla-london",
        gsc: gsc
          ? {
              impressions: gsc.impressions,
              clicks: gsc.clicks,
              ctr: Math.round(gsc.ctr * 10000) / 100,
              avgPosition: Math.round(gsc.position * 10) / 10,
            }
          : null,
        ga4: ga4
          ? {
              pageViews: ga4.pageViews,
              sessions: ga4.sessions,
              avgEngagementTime: Math.round(ga4.avgEngagementTime),
            }
          : null,
        indexing: idx,
      };
    });

    const merged = [...mergedBlog, ...mergedInfo];

    // ── 6. Calculate summary stats ─────────────────────────────────
    const withGSC = merged.filter((a: { gsc: unknown }) => a.gsc);
    const withGA4 = merged.filter((a: { ga4: unknown }) => a.ga4);
    const indexed = merged.filter(
      (a: { indexing: { indexed: boolean } | null }) => a.indexing?.indexed
    );

    const totalImpressions = withGSC.reduce(
      (s: number, a: { gsc: { impressions: number } }) =>
        s + a.gsc.impressions,
      0
    );
    const totalClicks = withGSC.reduce(
      (s: number, a: { gsc: { clicks: number } }) => s + a.gsc.clicks,
      0
    );
    const totalPageViews = withGA4.reduce(
      (s: number, a: { ga4: { pageViews: number } }) => s + a.ga4.pageViews,
      0
    );
    const avgPosition =
      withGSC.length > 0
        ? Math.round(
            (withGSC.reduce(
              (s: number, a: { gsc: { avgPosition: number } }) =>
                s + a.gsc.avgPosition,
              0
            ) /
              withGSC.length) *
              10
          ) / 10
        : null;
    const avgCTR =
      totalImpressions > 0
        ? Math.round((totalClicks / totalImpressions) * 10000) / 100
        : null;

    return NextResponse.json({
      success: true,
      dateRange: { startDate, endDate, days },
      siteId,
      sources: {
        gsc: gscConfigured,
        ga4: ga4Configured,
        indexingChecked: checkIndex,
      },
      summary: {
        totalArticles: merged.length,
        articlesWithGSCData: withGSC.length,
        articlesWithGA4Data: withGA4.length,
        ...(checkIndex
          ? {
              indexed: indexed.length,
              notIndexed: merged.length - indexed.length,
            }
          : {}),
        totalImpressions,
        totalClicks,
        avgCTR,
        avgPosition,
        totalPageViews,
        ...(ga4Metrics
          ? {
              siteMetrics: {
                sessions: ga4Metrics.sessions,
                users: ga4Metrics.totalUsers,
                bounceRate: ga4Metrics.bounceRate,
                engagementRate: ga4Metrics.engagementRate,
              },
            }
          : {}),
      },
      articles: merged,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error("Article performance error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch article performance",
      },
      { status: 500 }
    );
  }
}
