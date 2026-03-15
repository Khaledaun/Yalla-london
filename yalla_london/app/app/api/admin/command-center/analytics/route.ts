/**
 * Unified Analytics API
 *
 * Fetches real analytics from GA4 Data API and Google Search Console.
 * Falls back gracefully when database tables or APIs are unavailable.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchGA4Metrics, isGA4Configured } from "@/lib/seo/ga4-data-api";
import { gscApi } from "@/lib/seo/indexing-service";
import { requireAdmin } from "@/lib/admin-middleware";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";

    const rangeMap: Record<string, { start: string; days: number }> = {
      "7d": { start: "7daysAgo", days: 7 },
      "30d": { start: "30daysAgo", days: 30 },
      "90d": { start: "90daysAgo", days: 90 },
      year: { start: "365daysAgo", days: 365 },
    };
    const dateConfig = rangeMap[range] || rangeMap["30d"];

    // Fetch real GA4 data
    let ga4Data = null;
    if (isGA4Configured()) {
      ga4Data = await fetchGA4Metrics(dateConfig.start, "today");
    }

    // Fetch real GSC data
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(
      Date.now() - dateConfig.days * 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .split("T")[0];

    let gscQueries = null;
    let gscCountries = null;
    try {
      gscQueries = await gscApi.getSearchAnalytics(startDate, endDate, [
        "query",
      ]);
      gscCountries = await gscApi.getSearchAnalytics(startDate, endDate, [
        "country",
      ]);
    } catch {
      // GSC not available
    }

    // Try to load recent snapshot from DB
    let latestSnapshot = null;
    try {
      const { prisma } = await import("@/lib/db");
      latestSnapshot = await prisma.analyticsSnapshot.findFirst({
        orderBy: { created_at: "desc" },
      });
    } catch {
      // Table may not exist
    }

    // Build response from real data
    const metrics = ga4Data
      ? {
          users: ga4Data.metrics.totalUsers,
          pageviews: ga4Data.metrics.pageViews,
          sessions: ga4Data.metrics.sessions,
          bounceRate: ga4Data.metrics.bounceRate,
          avgDuration: ga4Data.metrics.avgSessionDuration,
          newUsers: ga4Data.metrics.newUsers,
          engagementRate: ga4Data.metrics.engagementRate,
        }
      : {
          users: 0,
          pageviews: 0,
          sessions: 0,
          bounceRate: 0,
          avgDuration: 0,
          newUsers: 0,
          engagementRate: 0,
        };

    const topPages = ga4Data
      ? ga4Data.topPages.map((p) => ({ path: p.path, views: p.pageViews }))
      : [];

    const topSources = ga4Data ? ga4Data.topSources : [];

    const topKeywords = gscQueries?.rows
      ? gscQueries.rows.slice(0, 20).map((r: any) => ({
          keyword: r.keys?.[0],
          clicks: r.clicks,
          impressions: r.impressions,
          ctr: Math.round((r.ctr || 0) * 10000) / 100,
          position: Math.round((r.position || 0) * 10) / 10,
        }))
      : [];

    const topCountries = gscCountries?.rows
      ? gscCountries.rows.slice(0, 15).map((r: any) => ({
          country: r.keys?.[0],
          clicks: r.clicks,
          impressions: r.impressions,
        }))
      : [];

    // Build site analytics from config
    const { getDefaultSiteId, getSiteConfig, getSiteDomain } = await import("@/config/sites");
    const activeSiteId = request.nextUrl.searchParams.get("siteId") || request.headers.get("x-site-id") || getDefaultSiteId();
    const activeSiteConfig = getSiteConfig(activeSiteId);
    const siteAnalytics = [
      {
        siteId: activeSiteId,
        siteName: activeSiteConfig?.name || activeSiteId,
        domain: activeSiteConfig?.domain || getSiteDomain(activeSiteId).replace("https://", ""),
        locale: (activeSiteConfig?.locale || "en") as "en" | "ar",
        metrics,
        change: { users: 0, pageviews: 0, sessions: 0 },
        topPages,
        topKeywords,
        topCountries: topCountries.map((c: any) => ({
          country: c.country,
          users: c.clicks,
        })),
        topSources,
      },
    ];

    return NextResponse.json({
      sites: siteAnalytics,
      dataSource: {
        ga4: ga4Data ? "live" : "not_configured",
        gsc: gscQueries?.rows ? "live" : "not_configured",
        snapshot: latestSnapshot ? "available" : "none",
      },
      range,
    });
  } catch (error) {
    console.error("Failed to get analytics:", error);
    return NextResponse.json(
      {
        error: "Failed to get analytics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
