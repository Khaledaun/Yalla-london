export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

/**
 * Process Indexing Queue — Google Indexing API for Qualifying Pages ONLY
 *
 * Runs 3× daily (7:15, 13:15, 20:15 UTC) — 15 min after seo-agent.
 *
 * SOLE RESPONSIBILITY: Submit URLs via Google Indexing API.
 *
 * IMPORTANT: The Google Indexing API only accepts pages with:
 *   - JobPosting structured data
 *   - BroadcastEvent embedded in a VideoObject
 * Regular events, news, and blog content do NOT qualify.
 * See: https://developers.google.com/search/apis/indexing-api/v3/using-api
 *
 * Currently we have NO qualifying pages, so this cron is effectively a no-op.
 * Standard content is submitted via IndexNow + GSC Sitemap by the google-indexing
 * cron (9:15 daily). Add qualifying prefixes to INDEXING_API_PREFIXES in
 * lib/seo/google-indexing-api.ts when BroadcastEvent/JobPosting pages are created.
 *
 * Google Indexing API quota: 200 URLs/day.
 * Budget: 53s with 7s buffer (Vercel Pro).
 */

async function handleProcessQueue(request: NextRequest) {
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
      const { GoogleIndexingAPI } = await import("@/lib/seo/google-indexing-api");
      const api = new GoogleIndexingAPI();
      return NextResponse.json({
        status: "healthy",
        endpoint: "process-indexing-queue",
        googleIndexingApiConfigured: api.isConfigured(),
        timestamp: new Date().toISOString(),
      });
    }

    const dryRun = request.nextUrl.searchParams.get("dryRun") === "true" ||
      process.env.GOOGLE_INDEXING_DRY_RUN === "true";

    const { prisma } = await import("@/lib/db");
    const { GoogleIndexingAPI, classifyUrl, getBilingualPair } = await import("@/lib/seo/google-indexing-api");
    const { getActiveSiteIds, getSiteDomain } = await import("@/config/sites");

    const api = new GoogleIndexingAPI();
    const siteIds = getActiveSiteIds();

    let totalApiSubmitted = 0;
    let totalApiFailed = 0;
    let totalIndexNowSubmitted = 0;
    let totalIndexNowFailed = 0;
    const siteResults: Array<{
      siteId: string;
      apiUrls: number;
      standardUrls: number;
      apiSubmitted: number;
      indexNowSubmitted: number;
    }> = [];

    for (const siteId of siteIds) {
      if (Date.now() - cronStart > BUDGET_MS) break;

      try {
        const siteUrl = getSiteDomain(siteId);

        // ── 1. Check remaining daily quota ──
        const quota = await api.getRemainingQuota(siteId);
        if (quota.remaining <= 0) {
          console.log(`[process-indexing-queue] Daily quota exhausted for ${siteId} (${quota.used}/${quota.limit})`);
          siteResults.push({ siteId, apiUrls: 0, standardUrls: 0, apiSubmitted: 0, indexNowSubmitted: 0 });
          continue;
        }

        // ── 2. Find URLs that need submission ──
        // Get "discovered" URLs that haven't been submitted via any channel yet
        const pendingUrls = await prisma.uRLIndexingStatus.findMany({
          where: {
            site_id: siteId,
            status: { in: ["discovered", "pending"] },
            submitted_indexnow: false,
            submitted_google_api: false,
            submitted_sitemap: false,
          },
          select: { url: true, id: true },
          take: 100, // Cap per site per run
        });

        if (pendingUrls.length === 0) {
          siteResults.push({ siteId, apiUrls: 0, standardUrls: 0, apiSubmitted: 0, indexNowSubmitted: 0 });
          continue;
        }

        // ── 3. Classify URLs: events/news → Indexing API, blogs → IndexNow ──
        const apiUrls: string[] = [];
        const standardUrls: string[] = [];

        for (const record of pendingUrls) {
          const classification = classifyUrl(record.url);
          if (classification === "indexing_api") {
            apiUrls.push(record.url);
          } else {
            standardUrls.push(record.url);
          }
        }

        let siteApiSubmitted = 0;
        let siteIndexNowSubmitted = 0;

        // ── 4. Submit qualifying URLs via Google Indexing API ──
        if (apiUrls.length > 0 && api.isConfigured()) {
          // Bundle bilingual pairs (EN + AR submitted together)
          const urlsToSubmit: string[] = [];
          const seen = new Set<string>();
          for (const url of apiUrls) {
            const pair = getBilingualPair(url);
            if (!seen.has(pair.en)) { urlsToSubmit.push(pair.en); seen.add(pair.en); }
            if (!seen.has(pair.ar)) { urlsToSubmit.push(pair.ar); seen.add(pair.ar); }
          }

          // Respect daily quota
          const budgetUrls = urlsToSubmit.slice(0, quota.remaining);

          if (dryRun) {
            console.log(`[process-indexing-queue] DRY RUN: Would submit ${budgetUrls.length} URLs via Google Indexing API for ${siteId}`);
            siteApiSubmitted = budgetUrls.length;
          } else {
            const batchResult = await api.submitBatch(budgetUrls, "URL_UPDATED", BUDGET_MS, cronStart);
            siteApiSubmitted = batchResult.submitted;
            totalApiFailed += batchResult.failed;

            // Track successful submissions in URLIndexingStatus
            for (const result of batchResult.results) {
              if (result.success) {
                await prisma.uRLIndexingStatus.upsert({
                  where: { site_id_url: { site_id: siteId, url: result.url } },
                  create: {
                    site_id: siteId,
                    url: result.url,
                    slug: result.url.replace(siteUrl, "").replace(/^\/ar/, "").replace(/^\//, "") || "/",
                    status: "submitted",
                    submitted_google_api: true,
                    last_submitted_at: new Date(),
                  },
                  update: {
                    status: "submitted",
                    submitted_google_api: true,
                    last_submitted_at: new Date(),
                  },
                }).catch((e: Error) => console.warn(`[process-indexing-queue] Track failed for ${result.url}:`, e.message));
              }
            }
          }
        }

        // NOTE: Standard URLs (non-events/news) are NOT submitted here.
        // IndexNow + sitemap submission is handled by google-indexing cron (9:15 daily).
        // This cron only handles Google Indexing API for events/news.
        if (standardUrls.length > 0) {
          console.log(`[process-indexing-queue] ${standardUrls.length} standard URLs for ${siteId} — deferred to google-indexing cron`);
        }

        totalApiSubmitted += siteApiSubmitted;
        totalIndexNowSubmitted += siteIndexNowSubmitted;

        siteResults.push({
          siteId,
          apiUrls: apiUrls.length,
          standardUrls: standardUrls.length,
          apiSubmitted: siteApiSubmitted,
          indexNowSubmitted: siteIndexNowSubmitted,
        });
      } catch (siteError) {
        console.error(`[process-indexing-queue] Failed for ${siteId}:`, siteError instanceof Error ? siteError.message : siteError);
        siteResults.push({ siteId, apiUrls: 0, standardUrls: 0, apiSubmitted: 0, indexNowSubmitted: 0 });
      }
    }

    const durationMs = Date.now() - cronStart;

    await logCronExecution("process-indexing-queue", "completed", {
      durationMs,
      itemsProcessed: totalApiSubmitted + totalIndexNowSubmitted + totalApiFailed + totalIndexNowFailed,
      itemsSucceeded: totalApiSubmitted + totalIndexNowSubmitted,
      itemsFailed: totalApiFailed + totalIndexNowFailed,
      resultSummary: {
        dryRun,
        totalApiSubmitted,
        totalApiFailed,
        totalIndexNowSubmitted,
        totalIndexNowFailed,
        sites: siteResults,
      },
    });

    return NextResponse.json({
      success: true,
      dryRun,
      durationMs,
      totalApiSubmitted,
      totalIndexNowSubmitted,
      sites: siteResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[process-indexing-queue] Cron failed:", errMsg);

    await logCronExecution("process-indexing-queue", "failed", {
      durationMs: Date.now() - cronStart,
      errorMessage: errMsg,
    }).catch(() => {});

    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    onCronFailure({ jobName: "process-indexing-queue", error: errMsg }).catch(() => {});

    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleProcessQueue(request);
}

export async function POST(request: NextRequest) {
  return handleProcessQueue(request);
}
