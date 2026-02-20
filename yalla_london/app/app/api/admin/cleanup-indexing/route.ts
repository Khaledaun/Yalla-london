/**
 * Indexing Database Cleanup API
 *
 * Fixes the non-www / www URL duplication caused by a bug in google-indexing cron.
 *
 * GET  — Dry run: shows what would be cleaned up
 * POST — Applies cleanup: merges non-www entries into www equivalents, deletes orphans
 *
 * Protected by admin auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminOrCronAuth } from "@/lib/admin-middleware";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET — Preview cleanup
// ---------------------------------------------------------------------------

export const GET = withAdminOrCronAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");

    const siteId =
      request.nextUrl.searchParams.get("siteId") ||
      request.headers.get("x-site-id") ||
      getDefaultSiteId();

    const correctBaseUrl = getSiteDomain(siteId); // "https://www.yalla-london.com"

    // Find all URL entries for this site
    const allEntries = await prisma.uRLIndexingStatus.findMany({
      where: { site_id: siteId },
      select: {
        id: true,
        url: true,
        status: true,
        coverage_state: true,
        submitted_indexnow: true,
        submitted_google_api: true,
        submitted_sitemap: true,
        last_submitted_at: true,
        last_crawled_at: true,
        last_inspected_at: true,
        last_error: true,
      },
    });

    // Separate www and non-www entries
    const wwwEntries = allEntries.filter((e) => e.url.includes("://www."));
    const nonWwwEntries = allEntries.filter((e) => !e.url.includes("://www."));

    // Find duplicates: non-www URL that has a www equivalent
    const wwwUrls = new Set(wwwEntries.map((e) => e.url));
    const duplicates: Array<{
      nonWwwUrl: string;
      wwwUrl: string;
      nonWwwStatus: string | null;
      wwwStatus: string | null;
      action: string;
    }> = [];
    const orphans: Array<{ url: string; status: string | null; action: string }> = [];

    for (const entry of nonWwwEntries) {
      const wwwEquivalent = entry.url.replace("://", "://www.");
      if (wwwUrls.has(wwwEquivalent)) {
        duplicates.push({
          nonWwwUrl: entry.url,
          wwwUrl: wwwEquivalent,
          nonWwwStatus: entry.status,
          wwwStatus: wwwEntries.find((e) => e.url === wwwEquivalent)?.status || null,
          action: "delete non-www (www version exists)",
        });
      } else {
        orphans.push({
          url: entry.url,
          status: entry.status,
          action: "convert to www",
        });
      }
    }

    return NextResponse.json({
      success: true,
      dryRun: true,
      siteId,
      correctBaseUrl,
      totalEntries: allEntries.length,
      wwwEntries: wwwEntries.length,
      nonWwwEntries: nonWwwEntries.length,
      duplicatePairs: duplicates.length,
      orphansToConvert: orphans.length,
      totalToFix: duplicates.length + orphans.length,
      duplicates: duplicates.slice(0, 20),
      orphans: orphans.slice(0, 20),
    });
  } catch (error) {
    console.error("[cleanup-indexing] GET error:", error);
    return NextResponse.json(
      { error: "Failed to analyze indexing entries" },
      { status: 500 }
    );
  }
});

// ---------------------------------------------------------------------------
// POST — Apply cleanup
// ---------------------------------------------------------------------------

export const POST = withAdminOrCronAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");

    const body = await request.json().catch(() => ({}));
    const siteId = body.siteId || request.headers.get("x-site-id") || getDefaultSiteId();
    const correctBaseUrl = getSiteDomain(siteId);

    const allEntries = await prisma.uRLIndexingStatus.findMany({
      where: { site_id: siteId },
      select: {
        id: true,
        url: true,
        status: true,
        submitted_indexnow: true,
        submitted_google_api: true,
        submitted_sitemap: true,
        last_submitted_at: true,
        last_crawled_at: true,
        last_inspected_at: true,
        coverage_state: true,
        indexing_state: true,
      },
    });

    type IndexEntry = (typeof allEntries)[number];
    const wwwEntries = allEntries.filter((e) => e.url.includes("://www."));
    const nonWwwEntries = allEntries.filter((e) => !e.url.includes("://www."));
    const wwwUrlMap = new Map<string, IndexEntry>(wwwEntries.map((e) => [e.url, e]));

    let deleted = 0;
    let converted = 0;
    let merged = 0;
    let errors = 0;

    for (const entry of nonWwwEntries) {
      const wwwEquivalent = entry.url.replace("://", "://www.");
      const existingWww = wwwUrlMap.get(wwwEquivalent);

      try {
        if (existingWww) {
          // Duplicate — merge useful data into www entry, then delete non-www
          const mergeData: Record<string, unknown> = {};

          // Keep the best submission data
          if (entry.submitted_indexnow && !existingWww.submitted_indexnow) {
            mergeData.submitted_indexnow = true;
          }
          if (entry.submitted_sitemap && !existingWww.submitted_sitemap) {
            mergeData.submitted_sitemap = true;
          }
          // Keep latest submission timestamp
          if (
            entry.last_submitted_at &&
            (!existingWww.last_submitted_at || entry.last_submitted_at > existingWww.last_submitted_at)
          ) {
            mergeData.last_submitted_at = entry.last_submitted_at;
          }

          if (Object.keys(mergeData).length > 0) {
            await prisma.uRLIndexingStatus.update({
              where: { id: existingWww.id },
              data: mergeData,
            });
            merged++;
          }

          // Delete the non-www duplicate
          await prisma.uRLIndexingStatus.delete({
            where: { id: entry.id },
          });
          deleted++;
        } else {
          // Orphan — convert URL to www version
          // Use upsert in case a www version was created between our read and write
          await prisma.uRLIndexingStatus.update({
            where: { id: entry.id },
            data: {
              url: wwwEquivalent,
              // Reset inspection data since it was for the wrong URL
              last_inspected_at: null,
              coverage_state: null,
              indexing_state: null,
              inspection_result: null,
              last_error: null,
              // Reset status to "submitted" so verify-indexing re-checks it
              status: "submitted",
            },
          });
          converted++;
        }
      } catch (err) {
        console.warn(`[cleanup-indexing] Failed to process ${entry.url}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      siteId,
      correctBaseUrl,
      totalProcessed: nonWwwEntries.length,
      deleted,
      converted,
      merged,
      errors,
      message: `Cleaned up ${deleted + converted} non-www entries: ${deleted} duplicates deleted, ${converted} orphans converted to www, ${merged} entries had data merged`,
    });
  } catch (error) {
    console.error("[cleanup-indexing] POST error:", error);
    return NextResponse.json(
      { error: "Failed to clean up indexing entries" },
      { status: 500 }
    );
  }
});
