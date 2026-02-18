export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Analytics Sync Cron Endpoint
 *
 * Syncs real analytics data from GA4 Data API and Google Search Console.
 * Run daily to keep data fresh.
 *
 * Required env vars:
 *   CRON_SECRET - authentication for cron requests
 *   GA4_PROPERTY_ID - GA4 property ID (numeric)
 *   GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL - service account email
 *   GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY - service account private key
 *
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/analytics",
 *     "schedule": "0 3 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  fetchGA4Metrics,
  isGA4Configured,
  getGA4ConfigStatus,
} from "@/lib/seo/ga4-data-api";
import { gscApi } from "@/lib/seo/indexing-service";
import { logCronExecution } from "@/lib/cron-logger";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is configured and doesn't match, reject.
  // If CRON_SECRET is NOT configured, allow — Vercel crons don't send secrets unless configured.
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const _cronStart = Date.now();
  console.log(`[ANALYTICS-CRON] Starting at ${new Date().toISOString()}`);

  try {
    const results: Record<string, unknown> = {
      ga4: null,
      gsc: null,
      snapshot: null,
    };

    // 1. Fetch GA4 Data
    let ga4Report = null;
    if (isGA4Configured()) {
      console.log("[ANALYTICS-CRON] Fetching GA4 metrics (last 30 days)...");
      ga4Report = await fetchGA4Metrics("30daysAgo", "today");

      if (ga4Report) {
        const m = ga4Report.metrics;
        const alerts: string[] = [];
        if (m.bounceRate > 70) alerts.push('High bounce rate (' + m.bounceRate.toFixed(1) + '%) — visitors leave without interacting');
        if (m.engagementRate < 30) alerts.push('Low engagement rate (' + m.engagementRate.toFixed(1) + '%) — content may not be compelling');
        if (m.sessions < 10) alerts.push('Very low sessions (' + m.sessions + ') — site may have indexing or visibility issues');
        if (m.avgSessionDuration < 30) alerts.push('Short avg session (' + m.avgSessionDuration.toFixed(0) + 's) — visitors not reading content');

        results.ga4 = {
          status: "success",
          sessions: m.sessions,
          users: m.totalUsers,
          pageViews: m.pageViews,
          bounceRate: m.bounceRate,
          engagementRate: m.engagementRate,
          avgSessionDuration: m.avgSessionDuration,
          topPages: ga4Report.topPages.slice(0, 10).map((p: any) => ({
            path: p.path || p.pagePath,
            pageViews: p.pageViews || p.screenPageViews,
            sessions: p.sessions,
          })),
          topSources: (ga4Report.topSources || []).slice(0, 10).map((s: any) => ({
            source: s.source || s.sessionSource,
            sessions: s.sessions,
            users: s.users || s.totalUsers,
          })),
          topPagesCount: ga4Report.topPages.length,
          alerts,
          insights: {
            pagesPerSession: m.sessions > 0 ? (m.pageViews / m.sessions).toFixed(1) : '0',
            newVsReturning: m.totalUsers > 0 ? Math.round((m.newUsers / m.totalUsers) * 100) + '% new' : 'unknown',
          },
        };
        console.log(
          `[ANALYTICS-CRON] GA4: ${ga4Report.metrics.sessions} sessions, ${ga4Report.metrics.pageViews} pageviews`,
        );
      } else {
        results.ga4 = { status: "error", message: "Failed to fetch GA4 data" };
        console.warn("[ANALYTICS-CRON] GA4 fetch returned null");
      }
    } else {
      const configStatus = getGA4ConfigStatus();
      results.ga4 = {
        status: "not_configured",
        missing: Object.entries(configStatus)
          .filter(([key, val]) => key !== "configured" && !val)
          .map(([key]) => key),
      };
      console.warn("[ANALYTICS-CRON] GA4 not configured - skipping");
    }

    // 2. Fetch GSC Search Analytics (last 30 days)
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    console.log(
      `[ANALYTICS-CRON] Fetching GSC data (${startDate} to ${endDate})...`,
    );
    const gscData = await gscApi.getSearchAnalytics(startDate, endDate, [
      "query",
    ]);

    if (gscData?.rows) {
      results.gsc = {
        status: "success",
        queriesCount: gscData.rows.length,
        topQueries: gscData.rows.slice(0, 5).map((row: any) => ({
          query: row.keys?.[0],
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: Math.round((row.ctr || 0) * 10000) / 100,
          position: Math.round((row.position || 0) * 10) / 10,
        })),
      };
      console.log(`[ANALYTICS-CRON] GSC: ${gscData.rows.length} queries found`);
    } else {
      results.gsc = {
        status: gscData === null ? "not_configured" : "no_data",
        message:
          gscData === null
            ? "GSC credentials not configured"
            : "No search data available",
      };
      console.warn("[ANALYTICS-CRON] GSC returned no data");
    }

    // 3. Store snapshot in database
    const topQueries = gscData?.rows
      ? gscData.rows.slice(0, 50).map((row: any) => ({
          query: row.keys?.[0],
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
        }))
      : [];

    await prisma.analyticsSnapshot.create({
      data: {
        date_range: "30d",
        data_json: {
          synced_at: new Date().toISOString(),
          source: "cron",
          ga4: ga4Report
            ? {
                metrics: ga4Report.metrics,
                topPages: ga4Report.topPages.slice(0, 20),
                topSources: ga4Report.topSources,
              }
            : null,
          gsc: gscData?.rows
            ? {
                totalQueries: gscData.rows.length,
                topQueries: topQueries.slice(0, 20),
              }
            : null,
        },
        indexed_pages: gscData?.rows?.length || 0,
        top_queries: topQueries,
        performance_metrics: ga4Report
          ? {
              bounceRate: ga4Report.metrics.bounceRate,
              avgDuration: ga4Report.metrics.avgSessionDuration,
              sessions: ga4Report.metrics.sessions,
              pageViews: ga4Report.metrics.pageViews,
              engagementRate: ga4Report.metrics.engagementRate,
            }
          : {
              bounceRate: 0,
              avgDuration: 0,
              sessions: 0,
              pageViews: 0,
              engagementRate: 0,
            },
      },
    });

    results.snapshot = { status: "created" };

    const durationMs = Date.now() - startTime;
    console.log(`[ANALYTICS-CRON] Completed in ${durationMs}ms`);

    await logCronExecution("analytics", "completed", {
      durationMs: Date.now() - _cronStart,
      resultSummary: {
        ga4: results.ga4,
        gsc: results.gsc,
        snapshot: results.snapshot,
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      durationMs,
      results,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[ANALYTICS-CRON] Failed after ${durationMs}ms:`, error);
    await logCronExecution("analytics", "failed", {
      durationMs: Date.now() - _cronStart,
      errorMessage: errMsg,
    });

    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    onCronFailure({ jobName: "analytics", error: errMsg }).catch(() => {});

    return NextResponse.json(
      { success: false, error: errMsg, durationMs },
      { status: 500 },
    );
  }
}
