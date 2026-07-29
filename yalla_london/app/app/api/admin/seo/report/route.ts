/**
 * Full SEO Report API
 *
 * Aggregates data from GA4 Data API, Google Search Console, and IndexNow
 * to produce a comprehensive SEO report with actionable recommendations.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchGA4Metrics,
  isGA4Configured,
  getGA4ConfigStatus,
} from "@/lib/seo/ga4-data-api";
import { gscApi, getAllIndexableUrls } from "@/lib/seo/indexing-service";
import { requireAdmin } from "@/lib/admin-middleware";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const BUDGET_MS = 53_000; // 53s budget, 7s buffer for Vercel Pro 60s limit
  const startTime = Date.now();
  const remainingBudget = () => BUDGET_MS - (Date.now() - startTime);
  const range = request.nextUrl.searchParams.get("range") || "30d";

  // Map range to GA4 date strings
  const rangeMap: Record<string, { start: string; days: number }> = {
    "7d": { start: "7daysAgo", days: 7 },
    "30d": { start: "30daysAgo", days: 30 },
    "90d": { start: "90daysAgo", days: 90 },
  };
  const dateConfig = rangeMap[range] || rangeMap["30d"];

  const report: Record<string, any> = {
    generated_at: new Date().toISOString(),
    range,
    ga4: null,
    gsc: null,
    indexing: null,
    issues: [],
    recommendations: [],
  };

  // 1. GA4 Data
  if (isGA4Configured()) {
    try {
      const ga4 = await fetchGA4Metrics(dateConfig.start, "today");
      if (ga4) {
        report.ga4 = {
          status: "live",
          metrics: ga4.metrics,
          topPages: ga4.topPages,
          topSources: ga4.topSources,
        };
      } else {
        report.ga4 = { status: "error", message: "Failed to fetch GA4 data" };
        report.issues.push({
          severity: "high",
          category: "analytics",
          title: "GA4 data fetch failed",
          description:
            "Could not retrieve data from GA4. Check service account permissions.",
          autoFixable: false,
        });
      }
    } catch (error) {
      report.ga4 = {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  } else {
    const config = getGA4ConfigStatus();
    report.ga4 = { status: "not_configured", config };
    report.issues.push({
      severity: "high",
      category: "analytics",
      title: "GA4 not configured",
      description:
        "GA4_PROPERTY_ID or service account credentials are missing.",
      autoFixable: false,
    });
  }

  // 2. GSC Data — run all 4 analytics queries in parallel
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - dateConfig.days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  try {
    const [queryData, pageData, countryData, deviceData] = await Promise.all([
      gscApi.getSearchAnalytics(startDate, endDate, ["query"]).catch(() => null),
      gscApi.getSearchAnalytics(startDate, endDate, ["page"]).catch(() => null),
      gscApi.getSearchAnalytics(startDate, endDate, ["country"]).catch(() => null),
      gscApi.getSearchAnalytics(startDate, endDate, ["device"]).catch(() => null),
    ]);

    if (queryData?.rows || pageData?.rows) {
      const topQueries = (queryData?.rows || []).slice(0, 50).map((r: any) => ({
        query: r.keys?.[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: Math.round((r.ctr || 0) * 10000) / 100,
        position: Math.round((r.position || 0) * 10) / 10,
      }));

      const topPages = (pageData?.rows || []).slice(0, 30).map((r: any) => ({
        page: r.keys?.[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: Math.round((r.ctr || 0) * 10000) / 100,
        position: Math.round((r.position || 0) * 10) / 10,
      }));

      const countries = (countryData?.rows || [])
        .slice(0, 20)
        .map((r: any) => ({
          country: r.keys?.[0],
          clicks: r.clicks,
          impressions: r.impressions,
        }));

      const devices = (deviceData?.rows || []).map((r: any) => ({
        device: r.keys?.[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: Math.round((r.ctr || 0) * 10000) / 100,
      }));

      // Calculate totals
      const totalClicks = topQueries.reduce(
        (s: number, q: any) => s + q.clicks,
        0,
      );
      const totalImpressions = topQueries.reduce(
        (s: number, q: any) => s + q.impressions,
        0,
      );
      const avgPosition =
        topQueries.length > 0
          ? topQueries.reduce((s: number, q: any) => s + q.position, 0) /
            topQueries.length
          : 0;
      const avgCTR =
        totalImpressions > 0
          ? Math.round((totalClicks / totalImpressions) * 10000) / 100
          : 0;

      report.gsc = {
        status: "live",
        summary: {
          totalClicks,
          totalImpressions,
          avgCTR,
          avgPosition: Math.round(avgPosition * 10) / 10,
        },
        topQueries,
        topPages,
        countries,
        devices,
      };

      // Identify quick wins (high impressions, low CTR)
      const quickWins = topQueries
        .filter((q: any) => q.impressions > 100 && q.ctr < 3 && q.position < 20)
        .slice(0, 10);

      if (quickWins.length > 0) {
        report.recommendations.push({
          priority: "high",
          category: "ctr_optimization",
          title: `${quickWins.length} Quick Win Keywords Found`,
          description:
            "These keywords have high impressions but low CTR. Improving titles and meta descriptions could significantly boost traffic.",
          autoFixable: true,
          items: quickWins.map((q: any) => ({
            query: q.query,
            impressions: q.impressions,
            ctr: q.ctr,
            position: q.position,
            action: `Optimize title & meta for "${q.query}" (position ${q.position}, ${q.impressions} impressions but only ${q.ctr}% CTR)`,
          })),
        });
      }

      // Pages losing position (position > 10 but with impressions)
      const decliningPages = topPages
        .filter((p: any) => p.position > 10 && p.impressions > 50)
        .slice(0, 10);

      if (decliningPages.length > 0) {
        report.recommendations.push({
          priority: "medium",
          category: "ranking_recovery",
          title: `${decliningPages.length} Pages Need Ranking Improvement`,
          description:
            "These pages appear in search but rank beyond page 1. Content refresh and internal linking can help.",
          autoFixable: true,
          items: decliningPages.map((p: any) => ({
            page: p.page,
            position: p.position,
            impressions: p.impressions,
            action:
              "Add internal links, refresh content, optimize heading structure",
          })),
        });
      }
    } else {
      report.gsc = {
        status: queryData === null ? "not_configured" : "no_data",
      };
      if (queryData === null) {
        report.issues.push({
          severity: "high",
          category: "search_console",
          title: "Google Search Console not connected",
          description:
            "GSC credentials are missing. Cannot monitor indexing or search performance.",
          autoFixable: false,
        });
      }
    }
  } catch (error) {
    report.gsc = {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // 3. Indexing Status — parallel checks with budget guard
  if (remainingBudget() > 10_000) {
    try {
      const allUrls = await getAllIndexableUrls();
      const sampleUrls = allUrls.slice(0, 5);

      // Run all indexing checks in parallel instead of sequentially
      const indexingResults = (
        await Promise.all(
          sampleUrls.map((url) =>
            gscApi.checkIndexingStatus(url).catch(() => null),
          ),
        )
      ).filter(Boolean);

      const indexed = indexingResults.filter(
        (r) => r!.coverageState === "Submitted and indexed",
      ).length;
      const notIndexed = indexingResults.length - indexed;

      report.indexing = {
        status: "checked",
        totalUrls: allUrls.length,
        sampled: sampleUrls.length,
        indexedCount: indexed,
        notIndexedCount: notIndexed,
        results: indexingResults,
      };

      if (notIndexed > 0) {
        report.issues.push({
          severity: "medium",
          category: "indexing",
          title: `${notIndexed} of ${sampleUrls.length} sampled URLs not indexed`,
          description:
            "Some URLs are not yet indexed by Google. The cron job will auto-submit them.",
          autoFixable: true,
        });
      }
    } catch {
      report.indexing = { status: "skipped", reason: "GSC not available" };
    }
  } else {
    report.indexing = { status: "skipped", reason: "Budget exceeded, skipped indexing checks" };
  }

  // 4. General Recommendations
  if (report.ga4?.status === "live") {
    const m = report.ga4.metrics;

    if (m.bounceRate > 60) {
      report.recommendations.push({
        priority: "high",
        category: "engagement",
        title: "High Bounce Rate",
        description: `Bounce rate is ${m.bounceRate}%. Consider improving page load speed, content relevance, and adding internal links.`,
        autoFixable: false,
      });
    }

    if (m.avgSessionDuration < 60) {
      report.recommendations.push({
        priority: "medium",
        category: "engagement",
        title: "Low Session Duration",
        description: `Average session is only ${m.avgSessionDuration}s. Add more engaging content, videos, or interactive elements.`,
        autoFixable: false,
      });
    }

    if (m.engagementRate < 50) {
      report.recommendations.push({
        priority: "medium",
        category: "engagement",
        title: "Low Engagement Rate",
        description: `Engagement rate is ${m.engagementRate}%. Improve CTAs, content quality, and page layout.`,
        autoFixable: false,
      });
    }
  }

  // Always recommend
  report.recommendations.push({
    priority: "low",
    category: "maintenance",
    title: "Regular Content Updates",
    description:
      "Publish fresh content regularly and update existing articles. The SEO cron automatically submits new content for indexing.",
    autoFixable: true,
  });

  report.durationMs = Date.now() - startTime;

  return NextResponse.json(report, {
    headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
  });
}
