export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Analytics Sync Cron — Multi-Site
 *
 * Syncs GA4 + GSC data for ALL active sites (not just default).
 * Uses per-site env vars via getSiteSeoConfig(siteId).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchGA4Metrics,
  getGA4ConfigStatus,
} from "@/lib/seo/ga4-data-api";
import { gscApi } from "@/lib/seo/indexing-service";
import { logCronExecution } from "@/lib/cron-logger";
import { getActiveSiteIds, getSiteSeoConfig } from "@/config/sites";

const BUDGET_MS = 280_000;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const flagResponse = await checkCronEnabled("analytics");
  if (flagResponse) return flagResponse;

  try {
    const { prisma } = await import("@/lib/db");
    const activeSites = getActiveSiteIds();
    const perSiteResults: Record<string, Record<string, unknown>> = {};

    for (const siteId of activeSites) {
      if (Date.now() - startTime > BUDGET_MS) break;

      const seoConfig = getSiteSeoConfig(siteId);
      const siteResult: Record<string, unknown> = { ga4: null, gsc: null, snapshot: null };

      // ── GA4 Data for this site ──
      if (seoConfig.ga4PropertyId) {
        try {
          const ga4Report = await fetchGA4Metrics("30daysAgo", "today", seoConfig.ga4PropertyId);
          if (ga4Report) {
            const m = ga4Report.metrics;
            const alerts: string[] = [];
            if (m.bounceRate > 70) alerts.push(`High bounce rate (${m.bounceRate.toFixed(1)}%)`);
            if (m.engagementRate < 30) alerts.push(`Low engagement (${m.engagementRate.toFixed(1)}%)`);
            if (m.sessions < 10) alerts.push(`Very low sessions (${m.sessions})`);

            siteResult.ga4 = {
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
              })),
              topPagesCount: ga4Report.topPages.length,
              alerts,
              insights: {
                pagesPerSession: m.sessions > 0 ? (m.pageViews / m.sessions).toFixed(1) : "0",
                newVsReturning: m.totalUsers > 0 ? Math.round((m.newUsers / m.totalUsers) * 100) + "% new" : "unknown",
              },
            };
          } else {
            siteResult.ga4 = { status: "error", message: "GA4 fetch returned null" };
          }
        } catch (err) {
          siteResult.ga4 = { status: "error", message: err instanceof Error ? err.message : String(err) };
          console.warn(`[analytics] GA4 failed for ${siteId}:`, err instanceof Error ? err.message : err);
        }
      } else {
        siteResult.ga4 = { status: "not_configured", message: `No GA4_PROPERTY_ID for ${siteId}` };
      }

      // ── GSC Data for this site ──
      if (seoConfig.gscSiteUrl) {
        try {
          const endDate = new Date().toISOString().split("T")[0];
          const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          const gscData = await gscApi.getSearchAnalytics(startDate, endDate, ["query"]);

          if (gscData?.rows) {
            siteResult.gsc = {
              status: "success",
              queriesCount: gscData.rows.length,
              topQueries: gscData.rows.slice(0, 5).map((row: Record<string, unknown>) => ({
                query: (row.keys as string[])?.[0],
                clicks: row.clicks,
                impressions: row.impressions,
                ctr: Math.round(((row.ctr as number) || 0) * 10000) / 100,
                position: Math.round(((row.position as number) || 0) * 10) / 10,
              })),
            };
          } else {
            siteResult.gsc = { status: "no_data" };
          }
        } catch (err) {
          siteResult.gsc = { status: "error", message: err instanceof Error ? err.message : String(err) };
          console.warn(`[analytics] GSC failed for ${siteId}:`, err instanceof Error ? err.message : err);
        }
      } else {
        siteResult.gsc = { status: "not_configured" };
      }

      // ── Store snapshot per site ──
      try {
        const ga4Data = siteResult.ga4 as Record<string, unknown> | null;
        const gscData = siteResult.gsc as Record<string, unknown> | null;
        await prisma.analyticsSnapshot.create({
          data: {
            site_id: siteId,
            date_range: "30d",
            data_json: {
              synced_at: new Date().toISOString(),
              source: "cron",
              ga4: ga4Data?.status === "success" ? ga4Data : null,
              gsc: gscData?.status === "success" ? gscData : null,
            },
            indexed_pages: (gscData as Record<string, unknown>)?.queriesCount as number || 0,
            top_queries: [],
            performance_metrics: ga4Data?.status === "success"
              ? {
                  bounceRate: ga4Data.bounceRate,
                  avgDuration: ga4Data.avgSessionDuration,
                  sessions: ga4Data.sessions,
                  pageViews: ga4Data.pageViews,
                  engagementRate: ga4Data.engagementRate,
                }
              : { bounceRate: 0, avgDuration: 0, sessions: 0, pageViews: 0, engagementRate: 0 },
          },
        });
        siteResult.snapshot = { status: "created" };
      } catch (err) {
        console.warn(`[analytics] Snapshot save failed for ${siteId}:`, err instanceof Error ? err.message : err);
        siteResult.snapshot = { status: "error" };
      }

      perSiteResults[siteId] = siteResult;
    }

    const durationMs = Date.now() - startTime;
    await logCronExecution("analytics", "completed", {
      durationMs,
      itemsProcessed: activeSites.length,
      itemsSucceeded: activeSites.length,
      resultSummary: perSiteResults,
    }).catch(err => console.warn("[analytics] logCronExecution failed:", err instanceof Error ? err.message : err));

    return NextResponse.json({ success: true, durationMs, sites: perSiteResults });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[analytics] Failed:", error);
    await logCronExecution("analytics", "failed", {
      durationMs: Date.now() - startTime,
      errorMessage: errMsg,
    });

    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    onCronFailure({ jobName: "analytics", error: errMsg }).catch(err => console.warn("[analytics] onCronFailure hook failed:", err instanceof Error ? err.message : err));

    return NextResponse.json(
      { success: false, error: errMsg, durationMs: Date.now() - startTime },
      { status: 500 },
    );
  }
}
