export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

const VERCEL_TIMEOUT_MS = 9000; // Leave 1s buffer before Vercel kills us

/**
 * GET /api/seo/check-and-index
 *
 * Comprehensive indexing check & submission endpoint.
 * 1. Discovers ALL pages (from database OR sitemap fallback)
 * 2. Checks URL Inspection status via GSC API (which pages are indexed)
 * 3. Submits ALL unindexed pages via IndexNow + Google Indexing API
 * 4. Returns detailed report
 *
 * Query params:
 *   ?submit=true   — actually submit unindexed pages (default: dry-run)
 *   ?limit=N       — limit URL inspection checks (default: 5, max: 50)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const doSubmit = searchParams.get("submit") === "true";
  const inspectLimit = Math.min(
    parseInt(searchParams.get("limit") || "5", 10),
    50,
  );

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";
  const gscSiteUrl =
    process.env.GSC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "";

  try {
    // Static pages every site has
    const staticPages = [
      { slug: "", label: "Homepage" },
      { slug: "blog", label: "Blog Index" },
      { slug: "recommendations", label: "Recommendations" },
      { slug: "events", label: "Events" },
      { slug: "about", label: "About" },
      { slug: "contact", label: "Contact" },
    ];

    // 1. Discover all pages — try database first, fallback to sitemap
    let blogUrls: { url: string; label: string; type: string; created: Date | null }[] = [];
    let source = "unknown";

    // Strategy A: Database
    try {
      const { prisma } = await import("@/lib/db");
      const posts = await prisma.blogPost.findMany({
        where: { published: true, deletedAt: null },
        select: { id: true, slug: true, title_en: true, created_at: true },
        orderBy: { created_at: "desc" },
      });

      blogUrls = posts.map((p: any) => ({
        url: `${siteUrl}/blog/${p.slug}`,
        label: p.title_en || p.slug,
        type: "blog",
        created: p.created_at,
      }));
      source = "database";
    } catch (dbError) {
      console.warn("Database unavailable, falling back to sitemap:", dbError);

      // Strategy B: Parse sitemap.xml
      try {
        const sitemapResponse = await fetch(`${siteUrl}/sitemap.xml`, {
          headers: { "User-Agent": "YallaLondon-SEO-Agent/1.0" },
        });

        if (sitemapResponse.ok) {
          const sitemapXml = await sitemapResponse.text();
          // Extract URLs from <loc> tags
          const locMatches = sitemapXml.match(/<loc>([^<]+)<\/loc>/g) || [];
          blogUrls = locMatches
            .map((m) => m.replace(/<\/?loc>/g, ""))
            .filter((url) => url.includes("/blog/"))
            .map((url) => ({
              url,
              label: url.split("/blog/")[1]?.replace(/-/g, " ") || url,
              type: "blog",
              created: null,
            }));
          source = "sitemap";
        }
      } catch (sitemapError) {
        console.warn("Sitemap also unavailable:", sitemapError);
      }

      // Strategy C: Use static data file as last resort
      if (blogUrls.length === 0) {
        try {
          const { getAllIndexableUrls } = await import(
            "@/lib/seo/indexing-service"
          );
          const staticUrls = await getAllIndexableUrls();
          blogUrls = (staticUrls as string[])
            .filter((u: string) => u.includes("/blog/"))
            .map((url) => ({
              url,
              label: url.split("/blog/")[1]?.replace(/-/g, " ") || url,
              type: "blog",
              created: null,
            }));
          source = "static-data";
        } catch {
          source = "none";
        }
      }
    }

    // Combine static + blog URLs
    const allUrls = [
      ...staticPages.map((p) => ({
        url: p.slug ? `${siteUrl}/${p.slug}` : siteUrl,
        label: p.label,
        type: "static",
        created: null as Date | null,
      })),
      ...blogUrls,
    ];

    // 2. Check URL Inspection status via GSC API
    const indexed: string[] = [];
    const notIndexed: { url: string; label: string; reason: string }[] = [];
    const inspectionErrors: string[] = [];
    let inspected = 0;

    let gscAvailable = false;
    try {
      const { GoogleSearchConsoleAPI } = await import(
        "@/lib/seo/indexing-service"
      );
      const gsc = new GoogleSearchConsoleAPI(gscSiteUrl);

      const urlsToInspect = allUrls.slice(0, inspectLimit);

      for (const item of urlsToInspect) {
        // Timeout guard: return partial results before Vercel kills the function
        if (Date.now() - startTime > VERCEL_TIMEOUT_MS) {
          inspectionErrors.push("Timeout approaching — returning partial results. Use ?limit=N to control batch size.");
          break;
        }

        try {
          const status = await gsc.checkIndexingStatus(item.url);
          inspected++;

          if (status) {
            gscAvailable = true;
            const isIndexed =
              status.coverageState === "Submitted and indexed" ||
              status.indexingState === "INDEXING_ALLOWED" ||
              (status.coverageState &&
                status.coverageState.toLowerCase().includes("indexed"));

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
            if (!gscAvailable) break;
          }
        } catch (e) {
          inspectionErrors.push(`${item.url}: ${(e as Error).message}`);
        }

        // Rate limit: URL Inspection API
        await new Promise((r) => setTimeout(r, 100));
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

    // Build submission list: either just unindexed or ALL urls
    const urlsToSubmit = gscAvailable
      ? notIndexed.map((p) => p.url)
      : allUrls.map((p) => p.url);

    if (doSubmit && urlsToSubmit.length > 0 && (Date.now() - startTime < VERCEL_TIMEOUT_MS)) {
      // 3a. IndexNow (Bing/Yandex)
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

      // 3b. Google Indexing API
      try {
        const { GoogleSearchConsoleAPI } = await import(
          "@/lib/seo/indexing-service"
        );
        const gscIndexer = new GoogleSearchConsoleAPI(gscSiteUrl);

        const urlBatch = urlsToSubmit.slice(0, 50);
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
      dataSource: source,
      summary: {
        totalPages: allUrls.length,
        blogPosts: blogUrls.length,
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
  const url = new URL(request.url);
  url.searchParams.set("submit", "true");
  return GET(new NextRequest(url));
}
