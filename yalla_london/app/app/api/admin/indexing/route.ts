export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * Live Indexing Monitor API
 *
 * Provides real-time indexing status for all site URLs.
 *
 * GET ?action=status   — Get all URLs with their indexing status from DB + live GSC check
 * GET ?action=check    — Run live GSC URL Inspection on a batch of URLs
 * POST                 — Submit URLs to IndexNow + Google Indexing API
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const action = request.nextUrl.searchParams.get("action") || "status";
  const { getDefaultSiteId } = await import("@/config/sites");
  const siteId =
    request.nextUrl.searchParams.get("siteId") ||
    request.headers.get("x-site-id") ||
    getDefaultSiteId();
  const batchParam = request.nextUrl.searchParams.get("batch") || "0";
  const batch = parseInt(batchParam, 10);

  try {
    if (action === "status") {
      return await getIndexingStatus(siteId);
    } else if (action === "check") {
      return await runLiveCheck(siteId, batch);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Indexing monitor error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { urls, method, siteId: reqSiteId } = body as {
      urls: string[];
      method?: "indexnow" | "google" | "both";
      siteId?: string;
    };
    const { getDefaultSiteId: getDefault } = await import("@/config/sites");
    const postSiteId = reqSiteId || request.headers.get("x-site-id") || getDefault();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "urls array is required" },
        { status: 400 }
      );
    }

    return await submitForIndexing(urls, method || "both", postSiteId);
  } catch (error) {
    console.error("Indexing submission error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Submission failed" },
      { status: 500 }
    );
  }
}

// ── GET ?action=status ─────────────────────────────────────────────────

async function getIndexingStatus(siteId: string) {
  const { prisma } = await import("@/lib/db");
  const { getAllIndexableUrls } = await import("@/lib/seo/indexing-service");
  const { searchConsole } = await import(
    "@/lib/integrations/google-search-console"
  );

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || (await import("@/config/sites")).getSiteDomain(siteId);

  // Get all indexable URLs
  const allUrls = await getAllIndexableUrls(siteId, baseUrl);

  // Get stored indexing statuses from DB
  let storedStatuses: Record<
    string,
    { status: string; lastChecked: Date | null; lastSubmitted: Date | null }
  > = {};
  try {
    const records = await prisma.uRLIndexingStatus.findMany({
      where: {
        site_id: siteId,
        url: { in: allUrls },
      },
      select: {
        url: true,
        status: true,
        last_inspected_at: true,
        last_submitted_at: true,
      },
    });
    for (const r of records) {
      storedStatuses[r.url] = {
        status: r.status,
        lastChecked: r.last_inspected_at,
        lastSubmitted: r.last_submitted_at,
      };
    }
  } catch {
    // URLIndexingStatus table may not exist yet
  }

  // Get GSC search analytics to see which URLs have impressions (proxy for indexed)
  let gscPages: Record<string, { impressions: number; clicks: number }> = {};
  try {
    if (searchConsole.isConfigured()) {
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 30 * 86400000)
        .toISOString()
        .split("T")[0];
      const raw = await searchConsole.getSearchAnalytics(
        startDate,
        endDate,
        ["page"]
      );
      if (raw?.rows) {
        for (const row of raw.rows) {
          const pageUrl = row.keys?.[0] || "";
          gscPages[pageUrl] = {
            impressions: row.impressions || 0,
            clicks: row.clicks || 0,
          };
          // Also store normalized path version
          const path = pageUrl.replace(/^https?:\/\/[^/]+/, "");
          gscPages[`${baseUrl}${path}`] = gscPages[pageUrl];
        }
      }
    }
  } catch {
    // GSC not available
  }

  // Build unified URL list
  const urls = allUrls.map((url) => {
    const stored = storedStatuses[url];
    const gsc = gscPages[url];
    const path = url.replace(baseUrl, "");

    // Determine type from URL path
    let type = "static";
    if (path.startsWith("/blog/category/")) type = "blog-category";
    else if (path.startsWith("/blog/")) type = "blog";
    else if (path.startsWith("/information/articles/")) type = "info-article";
    else if (path.startsWith("/information/")) type = "info-section";
    else if (path.startsWith("/news/")) type = "news";

    return {
      url,
      path,
      type,
      storedStatus: stored?.status || "unknown",
      lastChecked: stored?.lastChecked?.toISOString() || null,
      lastSubmitted: stored?.lastSubmitted?.toISOString() || null,
      hasGSCData: !!gsc,
      gscImpressions: gsc?.impressions || 0,
      gscClicks: gsc?.clicks || 0,
      liveStatus: null as string | null, // filled by ?action=check
    };
  });

  // Summary
  const indexed = urls.filter(
    (u) => u.storedStatus === "indexed" || u.hasGSCData
  ).length;
  const submitted = urls.filter(
    (u) => u.storedStatus === "submitted"
  ).length;
  const notIndexed = urls.filter(
    (u) =>
      u.storedStatus !== "indexed" && !u.hasGSCData && u.storedStatus !== "submitted"
  ).length;

  return NextResponse.json({
    success: true,
    siteId,
    gscConfigured: searchConsole.isConfigured(),
    totalUrls: urls.length,
    summary: {
      indexed,
      submitted,
      notIndexed,
      withGSCData: urls.filter((u) => u.hasGSCData).length,
      neverChecked: urls.filter((u) => !u.lastChecked).length,
    },
    urls,
    // How many batches needed for live check (5 URLs per batch)
    totalBatches: Math.ceil(urls.length / 5),
  });
}

// ── GET ?action=check&batch=N ──────────────────────────────────────────

async function runLiveCheck(siteId: string, batchIndex: number) {
  const { prisma } = await import("@/lib/db");
  const { getAllIndexableUrls } = await import("@/lib/seo/indexing-service");
  const { searchConsole } = await import(
    "@/lib/integrations/google-search-console"
  );

  if (!searchConsole.isConfigured()) {
    return NextResponse.json({
      success: false,
      error: "GSC not configured",
      gscConfigured: false,
    });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || (await import("@/config/sites")).getSiteDomain(siteId);
  const allUrls = await getAllIndexableUrls(siteId, baseUrl);

  const batchSize = 5;
  const start = batchIndex * batchSize;
  const batchUrls = allUrls.slice(start, start + batchSize);

  if (batchUrls.length === 0) {
    return NextResponse.json({
      success: true,
      batch: batchIndex,
      totalBatches: Math.ceil(allUrls.length / batchSize),
      results: [],
      done: true,
    });
  }

  // Run live GSC URL Inspection
  const results = await searchConsole.checkBulkIndexingStatus(batchUrls);

  // Store results in DB
  for (const r of results) {
    try {
      await prisma.uRLIndexingStatus.upsert({
        where: {
          site_id_url: { site_id: siteId, url: r.url },
        },
        update: {
          status: r.indexingState === "INDEXED" ? "indexed" : "not_indexed",
          last_inspected_at: new Date(),
          coverage_state: r.coverageState || null,
          last_crawled_at: r.lastCrawlTime ? new Date(r.lastCrawlTime) : null,
          inspection_result: {
            indexingState: r.indexingState,
            coverageState: r.coverageState,
            crawlStatus: r.crawlStatus,
            robotsTxtState: r.robotsTxtState,
            verdict: r.verdict,
            issues: r.issues,
          },
        },
        create: {
          url: r.url,
          site_id: siteId,
          status: r.indexingState === "INDEXED" ? "indexed" : "not_indexed",
          last_inspected_at: new Date(),
          coverage_state: r.coverageState || null,
          last_crawled_at: r.lastCrawlTime ? new Date(r.lastCrawlTime) : null,
          inspection_result: {
            indexingState: r.indexingState,
            coverageState: r.coverageState,
            crawlStatus: r.crawlStatus,
            robotsTxtState: r.robotsTxtState,
            verdict: r.verdict,
            issues: r.issues,
          },
        },
      });
    } catch {
      // DB upsert failed — non-fatal
    }
  }

  const inspectionResults = results.map((r) => ({
    url: r.url,
    path: r.url.replace(baseUrl, ""),
    indexingState: r.indexingState,
    coverageState: r.coverageState,
    lastCrawlTime: r.lastCrawlTime || null,
    crawlStatus: r.crawlStatus || null,
    robotsTxtState: r.robotsTxtState || null,
    verdict: r.verdict || null,
    issues: r.issues || [],
  }));

  return NextResponse.json({
    success: true,
    batch: batchIndex,
    totalBatches: Math.ceil(allUrls.length / batchSize),
    batchSize,
    checked: inspectionResults.length,
    results: inspectionResults,
    done: start + batchSize >= allUrls.length,
    summary: {
      indexed: inspectionResults.filter((r) => r.indexingState === "INDEXED")
        .length,
      notIndexed: inspectionResults.filter(
        (r) => r.indexingState === "NOT_INDEXED"
      ).length,
      other: inspectionResults.filter(
        (r) =>
          r.indexingState !== "INDEXED" && r.indexingState !== "NOT_INDEXED"
      ).length,
    },
  });
}

// ── POST: Submit URLs for indexing ─────────────────────────────────────

async function submitForIndexing(
  urls: string[],
  method: "indexnow" | "google" | "both",
  siteId?: string,
) {
  const { prisma } = await import("@/lib/db");
  const { submitToIndexNow } = await import("@/lib/seo/indexing-service");
  const { searchConsole } = await import(
    "@/lib/integrations/google-search-console"
  );

  const results: Array<{
    url: string;
    indexnow?: { success: boolean; message?: string };
    google?: { success: boolean; message?: string };
  }> = [];

  // IndexNow submission (batch)
  let indexNowResults: Array<{
    engine: string;
    success: boolean;
    message?: string;
  }> = [];
  if (method === "indexnow" || method === "both") {
    indexNowResults = await submitToIndexNow(urls);
  }

  // Google Indexing API submission (individual, rate-limited)
  const googleResults: Record<string, { success: boolean; message?: string }> =
    {};
  if (
    (method === "google" || method === "both") &&
    searchConsole.isConfigured()
  ) {
    for (const url of urls.slice(0, 20)) {
      // Max 20 to stay within quota
      try {
        const success = await searchConsole.submitUrl(url);
        googleResults[url] = { success, message: success ? "Submitted" : "Failed" };
      } catch (e) {
        googleResults[url] = {
          success: false,
          message: (e as Error).message,
        };
      }
      // Rate limit: 200ms between requests
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  // Build per-URL results
  for (const url of urls) {
    const result: (typeof results)[0] = { url };
    if (method === "indexnow" || method === "both") {
      result.indexnow = {
        success: indexNowResults.some((r) => r.success),
        message: indexNowResults.map((r) => r.message).join("; "),
      };
    }
    if (method === "google" || method === "both") {
      result.google = googleResults[url] || {
        success: false,
        message: "Not submitted (quota limit)",
      };
    }
    results.push(result);
  }

  // Update DB status — use siteId passed from caller (no hardcoding)
  const { getDefaultSiteId: _gdi } = await import("@/config/sites");
  const effectiveSiteId = siteId || _gdi();
  for (const url of urls) {
    try {
      await prisma.uRLIndexingStatus.upsert({
        where: {
          site_id_url: { site_id: effectiveSiteId, url },
        },
        update: {
          status: "submitted",
          last_submitted_at: new Date(),
          submission_attempts: { increment: 1 },
        },
        create: {
          url,
          site_id: effectiveSiteId,
          status: "submitted",
          last_submitted_at: new Date(),
          submission_attempts: 1,
        },
      });
    } catch {
      // non-fatal
    }
  }

  return NextResponse.json({
    success: true,
    submitted: urls.length,
    method,
    results,
    indexNowResults,
  });
}
