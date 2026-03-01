export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getSiteSeoConfig } from "@/config/sites";

const VERCEL_TIMEOUT_MS = 55000; // Pro plan: 60s max, leave 5s buffer

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
 *   ?siteId=X      — target site (default: from x-site-id header or yalla-london)
 *   ?submit=true   — actually submit unindexed pages (default: dry-run)
 *   ?submit_all=true — submit ALL discovered URLs (skip inspection, useful for bulk submission)
 *   ?limit=N       — limit URL inspection checks (default: 30, max: 100)
 *   ?offset=N      — skip first N URLs (for batch processing: first call default, next ?offset=9, etc.)
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const doSubmit = searchParams.get("submit") === "true";
  const doSubmitAll = searchParams.get("submit_all") === "true";
  const inspectLimit = Math.min(
    parseInt(searchParams.get("limit") || "30", 10),
    100,
  );
  const offset = Math.max(
    parseInt(searchParams.get("offset") || "0", 10),
    0,
  );

  // Per-site scoping: query param > header > default
  const { getDefaultSiteId } = await import("@/config/sites");
  const siteId = searchParams.get("siteId")
    || request.headers.get("x-site-id")
    || getDefaultSiteId();
  const seoConfig = getSiteSeoConfig(siteId);
  const siteUrl = seoConfig.siteUrl;
  const gscSiteUrl = seoConfig.gscSiteUrl;

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
      // Note: siteId column exists in Prisma schema but not yet migrated to DB.
      // Skip siteId filter until migration is run.
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

    // Track all discovered URLs in URLIndexingStatus
    try {
      const { prisma } = await import("@/lib/db");
      await Promise.allSettled(
        allUrls.map((item) =>
          prisma.uRLIndexingStatus.upsert({
            where: { site_id_url: { site_id: siteId, url: item.url } },
            create: {
              site_id: siteId,
              url: item.url,
              slug: item.url.split("/blog/")[1] || null,
              status: "discovered",
            },
            update: {
              slug: item.url.split("/blog/")[1] || null,
            },
          })
        )
      );
    } catch (trackError) {
      console.warn("Failed to track discovered URLs:", trackError);
    }

    // 2. Check URL Inspection status via GSC API (skip when submit_all to save time)
    const indexed: string[] = [];
    const notIndexed: { url: string; label: string; reason: string }[] = [];
    const inspectionErrors: string[] = [];
    let inspected = 0;

    let gscAvailable = false;

    if (!doSubmitAll) {
      // Only inspect when not doing submit_all (inspection takes ~6.5s per URL)
      try {
        const { GoogleSearchConsoleAPI } = await import(
          "@/lib/seo/indexing-service"
        );
        const gsc = new GoogleSearchConsoleAPI(gscSiteUrl);

        const urlsToInspect = allUrls.slice(offset, offset + inspectLimit);

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

              // Update URLIndexingStatus with inspection result
              try {
                const { prisma } = await import("@/lib/db");
                await prisma.uRLIndexingStatus.upsert({
                  where: { site_id_url: { site_id: siteId, url: item.url } },
                  create: {
                    site_id: siteId,
                    url: item.url,
                    slug: item.url.split("/blog/")[1] || null,
                    status: isIndexed ? "indexed" : "not_indexed",
                    coverage_state: status.coverageState || null,
                    indexing_state: status.indexingState || null,
                    last_inspected_at: new Date(),
                    inspection_result: status as object,
                  },
                  update: {
                    status: isIndexed ? "indexed" : "not_indexed",
                    coverage_state: status.coverageState || null,
                    indexing_state: status.indexingState || null,
                    last_inspected_at: new Date(),
                    inspection_result: status as object,
                  },
                });
              } catch (trackError) {
                console.warn("Failed to track inspection result:", trackError);
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

    // Build submission list
    // submit_all=true → submit every discovered URL (idempotent, safe for already-indexed)
    // submit=true → submit only confirmed unindexed, or all if GSC unavailable
    const urlsToSubmit = doSubmitAll
      ? allUrls.map((p) => p.url)
      : gscAvailable
        ? notIndexed.map((p) => p.url)
        : allUrls.map((p) => p.url);

    if ((doSubmit || doSubmitAll) && urlsToSubmit.length > 0 && (Date.now() - startTime < VERCEL_TIMEOUT_MS)) {
      // 3a. IndexNow (Bing/Yandex)
      const indexNowKey = seoConfig.indexNowKey;
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

            // Track IndexNow submission in URLIndexingStatus
            try {
              const { prisma } = await import("@/lib/db");
              const submittedBatch = urlsToSubmit.slice(0, 100);
              await Promise.allSettled(
                submittedBatch.map((url) =>
                  prisma.uRLIndexingStatus.upsert({
                    where: { site_id_url: { site_id: siteId, url } },
                    create: {
                      site_id: siteId,
                      url,
                      slug: url.split("/blog/")[1] || null,
                      status: "submitted",
                      submitted_indexnow: true,
                      last_submitted_at: new Date(),
                    },
                    update: {
                      submitted_indexnow: true,
                      last_submitted_at: new Date(),
                    },
                  })
                )
              );
            } catch (trackError) {
              console.warn("Failed to track IndexNow submission:", trackError);
            }
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

        // Track Google API submission in URLIndexingStatus
        if (result.submitted > 0) {
          try {
            const { prisma } = await import("@/lib/db");
            const googleBatch = urlsToSubmit.slice(0, 50);
            await Promise.allSettled(
              googleBatch.map((url) =>
                prisma.uRLIndexingStatus.upsert({
                  where: { site_id_url: { site_id: siteId, url } },
                  create: {
                    site_id: siteId,
                    url,
                    slug: url.split("/blog/")[1] || null,
                    status: "submitted",
                    submitted_google_api: true,
                    last_submitted_at: new Date(),
                    submission_attempts: 1,
                  },
                  update: {
                    submitted_google_api: true,
                    last_submitted_at: new Date(),
                    submission_attempts: { increment: 1 },
                  },
                })
              )
            );
          } catch (trackError) {
            console.warn("Failed to track Google API submission:", trackError);
          }
        }
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

    const nextOffset = offset + inspected;
    const hasMore = nextOffset < allUrls.length;

    const mode = doSubmitAll ? "submit-all" : doSubmit ? "submit" : "dry-run";

    const responseData = {
      success: true,
      mode,
      hint: doSubmit || doSubmitAll
        ? undefined
        : "Add ?submit=true to submit unindexed, or ?submit_all=true to submit ALL pages",
      site: {
        url: siteUrl,
        gscProperty: gscSiteUrl,
      },
      dataSource: source,
      summary: {
        totalPages: allUrls.length,
        blogPosts: blogUrls.length,
        staticPages: staticPages.length,
        offset,
        inspected,
        indexed: indexed.length,
        notIndexed: notIndexed.length,
        remaining: hasMore ? allUrls.length - nextOffset : 0,
        gscApiAvailable: gscAvailable,
      },
      nextBatch: hasMore
        ? `?offset=${nextOffset}&limit=${inspectLimit}`
        : null,
      indexedPages: indexed,
      notIndexedPages: notIndexed,
      submission: (doSubmit || doSubmitAll) ? submission : "dry-run (add ?submit=true or ?submit_all=true)",
      inspectionErrors:
        inspectionErrors.length > 0 ? inspectionErrors.slice(0, 10) : undefined,
      elapsed: `${elapsed}ms`,
      timestamp: new Date().toISOString(),
    };

    // 4. Persist results to SeoReport for dashboard tracking
    if (doSubmit || doSubmitAll || inspected > 0) {
      try {
        const { prisma } = await import("@/lib/db");
        await prisma.seoReport.create({
          data: {
            reportType: mode === "dry-run" ? "indexing_audit" : "indexing_submission",
            site_id: siteId,
            data: {
              mode,
              siteId,
              dataSource: source,
              totalPages: allUrls.length,
              inspected,
              indexed: indexed.length,
              notIndexed: notIndexed.length,
              indexedPages: indexed,
              notIndexedPages: notIndexed,
              submission: (doSubmit || doSubmitAll) ? submission : null,
              errors: inspectionErrors.length > 0 ? inspectionErrors : null,
              elapsed: `${elapsed}ms`,
            },
          },
        });
      } catch (dbSaveError) {
        console.warn("Failed to persist indexing report:", dbSaveError);
      }
    }

    return NextResponse.json(responseData);
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
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const url = new URL(request.url);
  url.searchParams.set("submit", "true");
  return GET(new NextRequest(url));
}
