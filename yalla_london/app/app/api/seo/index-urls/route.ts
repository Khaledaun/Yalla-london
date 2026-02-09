import { NextRequest, NextResponse } from "next/server";
import {
  submitToIndexNow,
  pingSitemaps,
  getAllIndexableUrls,
  getNewUrls,
  getUpdatedUrls,
  runAutomatedIndexing,
  gscApi,
} from "@/lib/seo/indexing-service";

/**
 * GET: List all indexable URLs and their count
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  // Check indexing status via GSC API
  if (action === "status") {
    const url = searchParams.get("url");
    if (!url) {
      return NextResponse.json(
        { error: "URL parameter required" },
        { status: 400 },
      );
    }

    const status = await gscApi.checkIndexingStatus(url);
    return NextResponse.json({
      success: !!status,
      data: status,
      note: status
        ? undefined
        : "GSC API credentials not configured or API error",
    });
  }

  // Get search analytics
  if (action === "analytics") {
    const startDate = searchParams.get("start") || getDateString(-28);
    const endDate = searchParams.get("end") || getDateString(0);

    const analytics = await gscApi.getSearchAnalytics(startDate, endDate);
    return NextResponse.json({
      success: !!analytics,
      data: analytics,
      note: analytics
        ? undefined
        : "GSC API credentials not configured or API error",
    });
  }

  // Default: return all indexable URLs
  const allUrls = await getAllIndexableUrls();
  const newUrls = await getNewUrls();
  const updatedUrls = await getUpdatedUrls();

  return NextResponse.json({
    success: true,
    counts: {
      total: allUrls.length,
      new: newUrls.length,
      updated: updatedUrls.length,
    },
    urls: {
      all: allUrls,
      new: newUrls,
      updated: updatedUrls,
    },
    endpoints: {
      submitAll: 'POST /api/seo/index-urls { "mode": "all" }',
      submitNew: 'POST /api/seo/index-urls { "mode": "new" }',
      submitUpdated: 'POST /api/seo/index-urls { "mode": "updated" }',
      submitCustom: 'POST /api/seo/index-urls { "urls": ["url1", "url2"] }',
      checkStatus: "GET /api/seo/index-urls?action=status&url=<url>",
      getAnalytics:
        "GET /api/seo/index-urls?action=analytics&start=2026-01-01&end=2026-01-17",
    },
  });
}

/**
 * POST: Submit URLs for indexing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls, mode = "new", pingOnly = false } = body;

    // If custom URLs provided
    if (urls && Array.isArray(urls) && urls.length > 0) {
      const indexNowResults = await submitToIndexNow(urls);
      const sitemapPings = await pingSitemaps();

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        urlsProcessed: urls.length,
        urls,
        results: {
          indexNow: indexNowResults,
          sitemapPings,
        },
      });
    }

    // Ping only mode
    if (pingOnly) {
      const sitemapPings = await pingSitemaps();
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        action: "sitemap_ping_only",
        results: { sitemapPings },
      });
    }

    // Run automated indexing based on mode
    const report = await runAutomatedIndexing(
      mode as "all" | "new" | "updated",
    );

    return NextResponse.json({
      success: report.errors.length === 0,
      report,
    });
  } catch (error) {
    console.error("Indexing API error:", error);
    return NextResponse.json(
      { error: "Failed to process indexing request", details: String(error) },
      { status: 500 },
    );
  }
}

// Helper function
function getDateString(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split("T")[0];
}
