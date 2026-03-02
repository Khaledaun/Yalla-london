export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

/**
 * GSC Sync Cron — Pulls per-page Search Analytics from Google Search Console
 *
 * Runs daily at 4:00 UTC (after analytics at 3:00, before content generation at 5:00).
 *
 * What it does:
 * 1. Calls GSC Search Analytics API with dimensions: ['page'] for EACH active site
 *    — ONE API call returns clicks/impressions/CTR/position for every page with impressions
 * 2. Upserts daily snapshots into GscPagePerformance table
 * 3. Cross-references: any URL with GSC impressions > 0 = confirmed indexed by Google
 *    → Updates URLIndexingStatus to "indexed" (fast path to close the 8-vs-60 gap)
 * 4. Creates URLIndexingStatus records for GSC-discovered URLs we never tracked
 * 5. Fetches previous 7-day window for trend comparison
 * 6. Detects significant traffic drops (>30% clicks decrease) and logs alerts
 *
 * GSC Search Analytics quota: 25,000 requests/day — very generous. One call per site.
 */

async function handleGscSync(request: NextRequest) {
  const cronStart = Date.now();
  const BUDGET_MS = 53_000;

  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Healthcheck mode
    if (request.nextUrl.searchParams.get("healthcheck") === "true") {
      const { GoogleSearchConsole } = await import("@/lib/integrations/google-search-console");
      const gsc = new GoogleSearchConsole();
      return NextResponse.json({
        status: "healthy",
        endpoint: "gsc-sync",
        gscConfigured: gsc.isConfigured(),
        timestamp: new Date().toISOString(),
      });
    }

    const { prisma } = await import("@/lib/db");
    const { GoogleSearchConsole } = await import("@/lib/integrations/google-search-console");
    const { getActiveSiteIds, getSiteSeoConfig, getSiteDomain, SITES } = await import("@/config/sites");

    const gsc = new GoogleSearchConsole();
    if (!gsc.isConfigured()) {
      await logCronExecution("gsc-sync", "completed", {
        durationMs: Date.now() - cronStart,
        resultSummary: {
          message: "GSC not configured — skipping sync. Set GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL and GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY.",
        },
      });
      return NextResponse.json({
        success: true,
        message: "GSC not configured — skipping sync",
        timestamp: new Date().toISOString(),
      });
    }

    const { syncAllUrlsToTracking } = await import("@/lib/seo/indexing-service");

    const activeSites = getActiveSiteIds();
    const today = new Date();
    // GSC data has a 2-3 day delay, so fetch from 10 days ago to 3 days ago for current window
    const currentEnd = new Date(today.getTime() - 3 * 86400000);
    const currentStart = new Date(today.getTime() - 10 * 86400000);
    // Previous window: 17 days ago to 10 days ago
    const previousEnd = new Date(today.getTime() - 10 * 86400000);
    const previousStart = new Date(today.getTime() - 17 * 86400000);

    const toDateStr = (d: Date) => d.toISOString().split("T")[0];
    const snapshotDate = new Date(toDateStr(today)); // Midnight-aligned date for DB

    let totalPagesProcessed = 0;
    let totalIndexedUpdated = 0;
    let totalNewTracking = 0;
    let totalDropAlerts = 0;
    const siteResults: Array<{
      siteId: string;
      pagesProcessed: number;
      indexedUpdated: number;
      newTracking: number;
      currentClicks: number;
      currentImpressions: number;
      previousClicks: number;
      previousImpressions: number;
      clicksChangePercent: number;
      dropAlert: boolean;
    }> = [];

    for (const siteId of activeSites) {
      if (Date.now() - cronStart > BUDGET_MS) break;

      const seoConfig = getSiteSeoConfig(siteId);
      gsc.setSiteUrl(seoConfig.gscSiteUrl);
      const siteBaseUrl = getSiteDomain(siteId);
      // Extract bare domain for URL matching (handles both www. and non-www.)
      // GSC may return URLs with or without www — match on the bare domain
      const bareDomain = SITES[siteId]?.domain || siteBaseUrl.replace(/^https?:\/\/(www\.)?/, "");

      let sitePagesProcessed = 0;
      let siteIndexedUpdated = 0;
      let siteNewTracking = 0;
      let siteCurrentClicks = 0;
      let siteCurrentImpressions = 0;
      let sitePreviousClicks = 0;
      let sitePreviousImpressions = 0;

      try {
        // ── Step 0: Sync all published URLs to tracking table ──
        // Ensures every published page has a URLIndexingStatus record before we
        // cross-reference with GSC. Without this, pages that exist but haven't
        // been discovered by SEO agent show as "never submitted" in the dashboard.
        try {
          const syncResult = await syncAllUrlsToTracking(siteId, siteBaseUrl);
          if (syncResult.synced > 0) {
            console.log(`[gsc-sync] ${siteId}: Synced ${syncResult.synced} new URLs to tracking (total: ${syncResult.total})`);
          }
        } catch (syncErr) {
          console.warn(`[gsc-sync] ${siteId}: URL sync failed:`, syncErr instanceof Error ? syncErr.message : String(syncErr));
        }

        // ── Step 1: Fetch CURRENT period per-page performance ──
        const currentData = await gsc.getSearchAnalytics(
          toDateStr(currentStart),
          toDateStr(currentEnd),
          ["page"],
        );

        if (!currentData?.rows?.length) {
          console.log(`[gsc-sync] ${siteId}: No Search Analytics data available`);
          siteResults.push({
            siteId, pagesProcessed: 0, indexedUpdated: 0, newTracking: 0,
            currentClicks: 0, currentImpressions: 0, previousClicks: 0, previousImpressions: 0,
            clicksChangePercent: 0, dropAlert: false,
          });
          continue;
        }

        // ── Step 2: Upsert page performance snapshots ──
        for (const row of currentData.rows) {
          if (Date.now() - cronStart > BUDGET_MS - 5000) break;

          const pageUrl = row.keys[0];
          // Skip URLs that don't belong to this site (GSC may return cross-domain)
          if (!pageUrl.includes(bareDomain)) continue;

          try {
            await prisma.gscPagePerformance.upsert({
              where: {
                site_id_url_date: {
                  site_id: siteId,
                  url: pageUrl,
                  date: snapshotDate,
                },
              },
              create: {
                site_id: siteId,
                url: pageUrl,
                date: snapshotDate,
                clicks: row.clicks || 0,
                impressions: row.impressions || 0,
                ctr: row.ctr || 0,
                position: row.position || 0,
              },
              update: {
                clicks: row.clicks || 0,
                impressions: row.impressions || 0,
                ctr: row.ctr || 0,
                position: row.position || 0,
              },
            });
            sitePagesProcessed++;
            siteCurrentClicks += row.clicks || 0;
            siteCurrentImpressions += row.impressions || 0;
          } catch (upsertErr) {
            console.warn(`[gsc-sync] ${siteId}: Failed to upsert ${pageUrl}:`, upsertErr instanceof Error ? upsertErr.message : String(upsertErr));
          }
        }

        // ── Step 3: Cross-reference indexing status ──
        // Any URL with GSC impressions > 0 is definitively indexed by Google
        const urlsWithImpressions = currentData.rows
          .filter((r: { impressions?: number }) => (r.impressions || 0) > 0)
          .map((r: { keys: string[] }) => r.keys[0])
          .filter((url: string) => url.includes(bareDomain));

        if (urlsWithImpressions.length > 0) {
          try {
            const updated = await prisma.uRLIndexingStatus.updateMany({
              where: {
                site_id: siteId,
                url: { in: urlsWithImpressions },
                status: { notIn: ["indexed"] },
              },
              data: {
                status: "indexed",
                indexing_state: "INDEXED",
                last_inspected_at: new Date(),
              },
            });
            siteIndexedUpdated = updated.count;
          } catch (err) {
            console.warn(`[gsc-sync] ${siteId}: Failed to update indexing status:`, err instanceof Error ? err.message : String(err));
          }
        }

        // ── Step 4: Create missing URLIndexingStatus records ──
        // For URLs GSC knows about but we never tracked
        try {
          const allGscUrls = currentData.rows
            .map((r: { keys: string[] }) => r.keys[0])
            .filter((url: string) => url.includes(bareDomain));

          const existing = await prisma.uRLIndexingStatus.findMany({
            where: { site_id: siteId, url: { in: allGscUrls } },
            select: { url: true },
          });
          const existingSet = new Set(existing.map((r: { url: string }) => r.url));

          const newUrls = allGscUrls.filter((u: string) => !existingSet.has(u));
          for (const url of newUrls) {
            if (Date.now() - cronStart > BUDGET_MS - 3000) break;
            try {
              // Extract slug from URL path
              const urlPath = new URL(url).pathname;
              const pathParts = urlPath.split("/").filter(Boolean);
              const slug = pathParts.length > 0 ? pathParts[pathParts.length - 1] : urlPath;

              await prisma.uRLIndexingStatus.create({
                data: {
                  site_id: siteId,
                  url,
                  slug,
                  status: "indexed", // GSC has impressions → it's indexed
                  indexing_state: "INDEXED",
                  last_inspected_at: new Date(),
                  submitted_indexnow: false,
                  submitted_sitemap: false,
                  submitted_google_api: false,
                },
              });
              siteNewTracking++;
            } catch (createErr) {
              // Likely unique constraint violation (URL already exists) — skip silently
              const msg = createErr instanceof Error ? createErr.message : String(createErr);
              if (!msg.includes("Unique constraint")) {
                console.warn(`[gsc-sync] ${siteId}: Failed to create tracking for ${url}:`, msg);
              }
            }
          }
        } catch (err) {
          console.warn(`[gsc-sync] ${siteId}: Failed to create missing tracking records:`, err instanceof Error ? err.message : String(err));
        }

        // ── Step 5: Fetch PREVIOUS period for trend comparison ──
        if (Date.now() - cronStart < BUDGET_MS - 8000) {
          try {
            const previousData = await gsc.getSearchAnalytics(
              toDateStr(previousStart),
              toDateStr(previousEnd),
              ["page"],
            );

            if (previousData?.rows?.length) {
              // Store previous period snapshots with their date
              const prevSnapshotDate = new Date(toDateStr(previousEnd));
              for (const row of previousData.rows) {
                if (Date.now() - cronStart > BUDGET_MS - 3000) break;
                const pageUrl = row.keys[0];
                if (!pageUrl.includes(bareDomain)) continue;

                sitePreviousClicks += row.clicks || 0;
                sitePreviousImpressions += row.impressions || 0;

                try {
                  await prisma.gscPagePerformance.upsert({
                    where: {
                      site_id_url_date: {
                        site_id: siteId,
                        url: pageUrl,
                        date: prevSnapshotDate,
                      },
                    },
                    create: {
                      site_id: siteId,
                      url: pageUrl,
                      date: prevSnapshotDate,
                      clicks: row.clicks || 0,
                      impressions: row.impressions || 0,
                      ctr: row.ctr || 0,
                      position: row.position || 0,
                    },
                    update: {
                      clicks: row.clicks || 0,
                      impressions: row.impressions || 0,
                      ctr: row.ctr || 0,
                      position: row.position || 0,
                    },
                  });
                } catch {
                  // Skip individual upsert failures
                }
              }
            }
          } catch (prevErr) {
            console.warn(`[gsc-sync] ${siteId}: Previous period fetch failed:`, prevErr instanceof Error ? prevErr.message : String(prevErr));
          }
        }

        // ── Step 6: Detect significant traffic drops ──
        const clicksChangePercent = sitePreviousClicks > 0
          ? ((siteCurrentClicks - sitePreviousClicks) / sitePreviousClicks) * 100
          : 0;

        const dropAlert = sitePreviousClicks >= 10 && clicksChangePercent < -30;
        if (dropAlert) {
          totalDropAlerts++;
          console.error(`[gsc-sync] TRAFFIC DROP ALERT: ${siteId} — ${siteCurrentClicks} clicks (was ${sitePreviousClicks}, ${clicksChangePercent.toFixed(0)}% change)`);
          await logCronExecution("gsc-sync-traffic-alert", "completed", {
            durationMs: 0,
            resultSummary: {
              alert: "TRAFFIC_DROP",
              siteId,
              currentClicks: siteCurrentClicks,
              previousClicks: sitePreviousClicks,
              changePercent: Math.round(clicksChangePercent),
            },
          });
        }

        totalPagesProcessed += sitePagesProcessed;
        totalIndexedUpdated += siteIndexedUpdated;
        totalNewTracking += siteNewTracking;

        siteResults.push({
          siteId,
          pagesProcessed: sitePagesProcessed,
          indexedUpdated: siteIndexedUpdated,
          newTracking: siteNewTracking,
          currentClicks: siteCurrentClicks,
          currentImpressions: siteCurrentImpressions,
          previousClicks: sitePreviousClicks,
          previousImpressions: sitePreviousImpressions,
          clicksChangePercent: Math.round(clicksChangePercent),
          dropAlert,
        });
      } catch (siteErr) {
        console.error(`[gsc-sync] ${siteId}: Site-level failure:`, siteErr instanceof Error ? siteErr.message : String(siteErr));
        siteResults.push({
          siteId, pagesProcessed: 0, indexedUpdated: 0, newTracking: 0,
          currentClicks: 0, currentImpressions: 0, previousClicks: 0, previousImpressions: 0,
          clicksChangePercent: 0, dropAlert: false,
        });
      }
    }

    const durationMs = Date.now() - cronStart;

    await logCronExecution("gsc-sync", "completed", {
      durationMs,
      itemsProcessed: totalPagesProcessed,
      itemsSucceeded: totalIndexedUpdated,
      itemsFailed: 0,
      resultSummary: {
        totalPagesProcessed,
        totalIndexedUpdated,
        totalNewTracking,
        totalDropAlerts,
        sites: siteResults,
      },
    });

    return NextResponse.json({
      success: true,
      durationMs,
      totalPagesProcessed,
      totalIndexedUpdated,
      totalNewTracking,
      totalDropAlerts,
      sites: siteResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[gsc-sync] Cron failed:", errMsg);

    await logCronExecution("gsc-sync", "failed", {
      durationMs: Date.now() - cronStart,
      errorMessage: errMsg,
    }).catch(() => {});

    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    onCronFailure({ jobName: "gsc-sync", error: errMsg }).catch(() => {});

    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleGscSync(request);
}

export async function POST(request: NextRequest) {
  return handleGscSync(request);
}
