export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

/**
 * Google Indexing Cron — Submits new/updated URLs to search engines
 *
 * Runs daily after content generation & publishing:
 *   - Discovers new/updated published blog posts
 *   - Submits via IndexNow (Bing/Yandex)
 *   - Submits sitemap to Google via GSC API
 *   - Tracks submission status in URLIndexingStatus table
 *
 * Supports GET and POST for Vercel cron compatibility.
 */

async function handleIndexing(request: NextRequest) {
  const _cronStart = Date.now();

  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Healthcheck mode
    if (request.nextUrl.searchParams.get("healthcheck") === "true") {
      return NextResponse.json({
        status: "healthy",
        endpoint: "google-indexing",
        hasIndexNowKey: !!process.env.INDEXNOW_KEY,
        hasGscCredentials: !!(
          process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ||
          process.env.GSC_CLIENT_EMAIL
        ),
        timestamp: new Date().toISOString(),
      });
    }

    const { prisma } = await import("@/lib/db");
    const {
      submitToIndexNow,
      GoogleSearchConsoleAPI,
      getNewUrls,
    } = await import("@/lib/seo/indexing-service");
    const { getActiveSiteIds, getSiteConfig } = await import("@/config/sites");

    // Only index sites with live websites
    const siteIds = getActiveSiteIds();
    const results: Array<{
      siteId: string;
      urlsFound: number;
      indexNow: { submitted: number; status: string };
      gscSitemap: { success: boolean; error?: string };
    }> = [];

    let totalUrlsSubmitted = 0;
    let totalErrors = 0;

    for (const siteId of siteIds) {
      // Time guard: 53s budget for Vercel Pro
      if (Date.now() - _cronStart > 53_000) {
        break;
      }

      try {
        const siteConfig = getSiteConfig(siteId);
        const { getSiteDomain: getDomain } = await import("@/config/sites");
        const siteUrl = siteConfig?.domain
            ? `https://${siteConfig.domain}`
            : getDomain(siteId);

        // Discover new URLs from the last 3 days
        const newUrls = await getNewUrls(3, siteId, siteUrl);

        // Also find recently updated posts from the database
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        let dbUrls: string[] = [];
        try {
          const siteFilter = siteId ? { siteId } : {};
          const updatedPosts = await prisma.blogPost.findMany({
            where: {
              published: true,
              ...siteFilter,
              updated_at: { gte: threeDaysAgo },
            },
            select: { slug: true },
          });
          const existingSlugs = new Set(
            newUrls.map((u) => u.split("/blog/")[1]).filter(Boolean),
          );
          dbUrls = updatedPosts
            .filter((p) => !existingSlugs.has(p.slug))
            .map((p) => `${siteUrl}/blog/${p.slug}`);
        } catch {
          // DB query may fail — proceed with static URLs
        }

        const allUrls = [...new Set([...newUrls, ...dbUrls])];

        if (allUrls.length === 0) {
          results.push({
            siteId,
            urlsFound: 0,
            indexNow: { submitted: 0, status: "no_urls" },
            gscSitemap: { success: true },
          });
          continue;
        }

        // 1. Submit via IndexNow (Bing/Yandex)
        let indexNowResult = { submitted: 0, status: "skipped" };
        try {
          const indexNowKey = process.env.INDEXNOW_KEY;
          if (indexNowKey) {
            const inResults = await submitToIndexNow(allUrls, siteUrl, indexNowKey);
            const success = inResults.some((r) => r.success);
            indexNowResult = {
              submitted: success ? allUrls.length : 0,
              status: success ? "success" : inResults[0]?.message || "failed",
            };
          } else {
            indexNowResult = { submitted: 0, status: "INDEXNOW_KEY_not_set" };
          }
        } catch (e) {
          indexNowResult = {
            submitted: 0,
            status: `error: ${e instanceof Error ? e.message : String(e)}`,
          };
        }

        // 2. Submit sitemap to Google via GSC API
        let gscResult: { success: boolean; error?: string } = { success: false, error: "skipped" };
        try {
          const gsc = new GoogleSearchConsoleAPI();
          gscResult = await gsc.submitSitemap(`${siteUrl}/sitemap.xml`);
        } catch (e) {
          gscResult = {
            success: false,
            error: e instanceof Error ? e.message : String(e),
          };
        }

        // 3. Track submissions in URLIndexingStatus
        try {
          await Promise.allSettled(
            allUrls.map((url) =>
              prisma.uRLIndexingStatus.upsert({
                where: { site_id_url: { site_id: siteId, url } },
                create: {
                  site_id: siteId,
                  url,
                  slug: url.split("/blog/")[1] || null,
                  status: "submitted",
                  submitted_indexnow: indexNowResult.submitted > 0,
                  last_submitted_at: new Date(),
                },
                update: {
                  submitted_indexnow: indexNowResult.submitted > 0,
                  last_submitted_at: new Date(),
                },
              }),
            ),
          );
        } catch {
          // Best-effort tracking
        }

        totalUrlsSubmitted += indexNowResult.submitted;
        if (!gscResult.success) totalErrors++;

        results.push({
          siteId,
          urlsFound: allUrls.length,
          indexNow: indexNowResult,
          gscSitemap: gscResult,
        });
      } catch (siteError) {
        totalErrors++;
        results.push({
          siteId,
          urlsFound: 0,
          indexNow: { submitted: 0, status: "error" },
          gscSitemap: {
            success: false,
            error: siteError instanceof Error ? siteError.message : String(siteError),
          },
        });
      }
    }

    await logCronExecution("google-indexing", "completed", {
      durationMs: Date.now() - _cronStart,
      itemsProcessed: results.reduce((a, r) => a + r.urlsFound, 0),
      itemsSucceeded: totalUrlsSubmitted,
      itemsFailed: totalErrors,
      resultSummary: {
        sites: results.length,
        totalUrlsSubmitted,
        totalErrors,
      },
    });

    // 4. Query current indexing status summary from URLIndexingStatus table
    let indexingStatusSummary: Record<string, unknown> | null = null;
    try {
      const allStatuses = await prisma.uRLIndexingStatus.findMany({
        select: {
          url: true,
          slug: true,
          status: true,
          site_id: true,
          submitted_indexnow: true,
          last_submitted_at: true,
          last_checked_at: true,
          coverage_state: true,
          indexing_state: true,
          error_message: true,
        },
        orderBy: { last_submitted_at: "desc" },
        take: 50,
      });

      const statusCounts: Record<string, number> = {};
      for (const s of allStatuses) {
        const state = s.status || "unknown";
        statusCounts[state] = (statusCounts[state] || 0) + 1;
      }

      indexingStatusSummary = {
        totalTracked: allStatuses.length,
        byStatus: statusCounts,
        recentUrls: allStatuses.slice(0, 15).map((s) => ({
          url: s.url,
          slug: s.slug,
          status: s.status,
          siteId: s.site_id,
          submittedViaIndexNow: s.submitted_indexnow,
          lastSubmitted: s.last_submitted_at,
          lastChecked: s.last_checked_at,
          coverageState: s.coverage_state,
          indexingState: s.indexing_state,
          error: s.error_message,
        })),
      };
    } catch {
      // Table may not exist yet
    }

    return NextResponse.json({
      success: true,
      durationMs: Date.now() - _cronStart,
      totalUrlsSubmitted,
      totalErrors,
      hasIndexNowKey: !!process.env.INDEXNOW_KEY,
      hasGscCredentials: !!(
        process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ||
        process.env.GSC_CLIENT_EMAIL
      ),
      results,
      indexingStatus: indexingStatusSummary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[google-indexing] Cron job failed:", error);
    await logCronExecution("google-indexing", "failed", {
      durationMs: Date.now() - _cronStart,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Indexing cron failed",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleIndexing(request);
}

export async function POST(request: NextRequest) {
  return handleIndexing(request);
}
