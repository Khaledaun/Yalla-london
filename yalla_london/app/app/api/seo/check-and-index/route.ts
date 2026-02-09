export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/seo/check-and-index
 *
 * Comprehensive indexing check & submission endpoint.
 * 1. Fetches ALL published pages from the database
 * 2. Checks URL Inspection status via GSC API (which pages are indexed)
 * 3. Submits ALL unindexed pages via IndexNow + Google Indexing API
 * 4. Returns detailed report
 *
 * Query params:
 *   ?submit=true   — actually submit unindexed pages (default: dry-run)
 *   ?limit=N       — limit URL inspection checks (default: 50, max: 200)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const doSubmit = searchParams.get("submit") === "true";
  const inspectLimit = Math.min(
    parseInt(searchParams.get("limit") || "50", 10),
    200,
  );

  try {
    const { prisma } = await import("@/lib/db");

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";
    const gscSiteUrl =
      process.env.GSC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "";

    // 1. Get all published blog posts from the database
    const posts = await prisma.blogPost.findMany({
      where: { published: true, deletedAt: null },
      select: { id: true, slug: true, title_en: true, created_at: true },
      orderBy: { created_at: "desc" },
    });

    // Build full URL list (static pages + blog posts)
    const staticPages = [
      { slug: "", label: "Homepage" },
      { slug: "blog", label: "Blog Index" },
      { slug: "recommendations", label: "Recommendations" },
      { slug: "events", label: "Events" },
      { slug: "about", label: "About" },
      { slug: "contact", label: "Contact" },
    ];

    const allUrls = [
      ...staticPages.map((p) => ({
        url: `${siteUrl}/${p.slug}`,
        label: p.label,
        type: "static" as const,
        created: null as Date | null,
      })),
      ...posts.map((p: any) => ({
        url: `${siteUrl}/blog/${p.slug}`,
        label: p.title_en || p.slug,
        type: "blog" as const,
        created: p.created_at,
      })),
    ];

    // 2. Check URL Inspection status via GSC API
    const indexed: string[] = [];
    const notIndexed: { url: string; label: string; reason: string }[] = [];
    const inspectionErrors: string[] = [];
    let inspected = 0;

    // Try URL Inspection API
    let gscAvailable = false;
    try {
      const { GoogleSearchConsoleAPI } = await import(
        "@/lib/seo/indexing-service"
      );
      const gsc = new GoogleSearchConsoleAPI(gscSiteUrl);

      // Check a subset of URLs (URL Inspection API has quota limits ~2000/day)
      const urlsToInspect = allUrls.slice(0, inspectLimit);

      for (const item of urlsToInspect) {
        try {
          const status = await gsc.checkIndexingStatus(item.url);
          inspected++;

          if (status) {
            gscAvailable = true;
            const isIndexed =
              status.coverageState === "Submitted and indexed" ||
              status.indexingState === "INDEXING_ALLOWED" ||
              status.coverageState?.includes("indexed");

            if (isIndexed) {
              indexed.push(item.url);
            } else {
              notIndexed.push({
                url: item.url,
                label: item.label,
                reason:
                  status.coverageState ||
                  status.indexingState ||
                  "Not indexed",
              });
            }
          } else {
            // null response means API not available
            if (!gscAvailable) break; // Don't keep trying if first one fails
          }
        } catch (e) {
          inspectionErrors.push(`${item.url}: ${(e as Error).message}`);
        }

        // Rate limit: 1 request per 200ms for URL Inspection API
        await new Promise((r) => setTimeout(r, 200));
      }
    } catch (gscError) {
      inspectionErrors.push(
        `GSC API not available: ${(gscError as Error).message}`,
      );
    }

    // 3. Submit unindexed pages if requested
    let submission = {
      indexNow: { submitted: 0, status: "skipped" as string },
      googleApi: {
        submitted: 0,
        failed: 0,
        errors: [] as string[],
        status: "skipped" as string,
      },
    };

    // Build submission list: either just unindexed (if we have inspection data) or ALL urls
    const urlsToSubmit = gscAvailable
      ? notIndexed.map((p) => p.url)
      : allUrls.map((p) => p.url);

    if (doSubmit && urlsToSubmit.length > 0) {
      // 3a. IndexNow (Bing/Yandex) — submit all, it's idempotent
      const indexNowKey = process.env.INDEXNOW_KEY;
      if (indexNowKey) {
        try {
          const response = await fetch("https://api.indexnow.org/indexnow", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              host: new URL(siteUrl).hostname,
              key: indexNowKey,
              urlList: urlsToSubmit.slice(0, 100),
            }),
          });

          if (response.ok || response.status === 202) {
            submission.indexNow = {
              submitted: Math.min(urlsToSubmit.length, 100),
              status: "success",
            };
          } else {
            submission.indexNow = {
              submitted: 0,
              status: `HTTP ${response.status}`,
            };
          }
        } catch (e) {
          submission.indexNow = {
            submitted: 0,
            status: `Error: ${(e as Error).message}`,
          };
        }
      } else {
        submission.indexNow = { submitted: 0, status: "INDEXNOW_KEY not set" };
      }

      // 3b. Google Indexing API — submit up to 50 URLs per run
      try {
        const { GoogleSearchConsoleAPI } = await import(
          "@/lib/seo/indexing-service"
        );
        const gscIndexer = new GoogleSearchConsoleAPI(gscSiteUrl);

        const batchSize = 50;
        const urlBatch = urlsToSubmit.slice(0, batchSize);
        const result = await gscIndexer.submitUrlsForIndexing(urlBatch);

        submission.googleApi = {
          submitted: result.submitted,
          failed: result.failed,
          errors: result.errors.slice(0, 5),
          status:
            result.submitted > 0
              ? "success"
              : result.errors.length > 0
                ? "errors"
                : "no_credentials",
        };
      } catch (e) {
        submission.googleApi = {
          submitted: 0,
          failed: 0,
          errors: [(e as Error).message],
          status: "error",
        };
      }
    }

    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      mode: doSubmit ? "submit" : "dry-run",
      hint: doSubmit
        ? undefined
        : "Add ?submit=true to actually submit unindexed pages",
      site: {
        url: siteUrl,
        gscProperty: gscSiteUrl,
      },
      summary: {
        totalPages: allUrls.length,
        blogPosts: posts.length,
        staticPages: staticPages.length,
        inspected,
        indexed: indexed.length,
        notIndexed: notIndexed.length,
        gscApiAvailable: gscAvailable,
      },
      indexedPages: indexed,
      notIndexedPages: notIndexed,
      submission: doSubmit ? submission : "dry-run (add ?submit=true)",
      inspectionErrors:
        inspectionErrors.length > 0 ? inspectionErrors.slice(0, 10) : undefined,
      elapsed: `${elapsed}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Check failed",
        elapsed: `${Date.now() - startTime}ms`,
      },
      { status: 500 },
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  // Force submit mode
  const url = new URL(request.url);
  url.searchParams.set("submit", "true");
  return GET(new NextRequest(url));
}
