/**
 * Indexing Database Cleanup API
 *
 * Fixes the non-www / www URL duplication caused by a bug in google-indexing cron.
 * Also removes entries with malformed slugs (empty slugs like "/blog/-2026-02-14").
 *
 * GET  — Dry run: shows what would be cleaned up
 * POST — Applies cleanup: merges non-www entries into www equivalents, deletes orphans
 *
 * Protected by admin auth.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminOrCronAuth } from "@/lib/admin-middleware";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

    // Also find entries with malformed slugs (empty slug like "/blog/-2026-02-14")
    const malformedEntries = allEntries.filter((e) => {
      const path = e.url.replace(/^https?:\/\/[^/]+/, "");
      return /\/blog\/-\d{4}-\d{2}-\d{2}/.test(path);
    });

    let deleted = 0;
    let converted = 0;
    let merged = 0;
    let malformedDeleted = 0;
    let errors = 0;

    // Phase 1: Batch-delete malformed entries
    if (malformedEntries.length > 0) {
      try {
        const result = await prisma.uRLIndexingStatus.deleteMany({
          where: { id: { in: malformedEntries.map((e) => e.id) } },
        });
        malformedDeleted = result.count;
      } catch (err) {
        console.warn("[cleanup-indexing] Failed to delete malformed entries:", err);
      }
    }

    // Phase 2: Separate duplicates (have www equivalent) from orphans (no www equivalent)
    const duplicates: Array<{ entry: IndexEntry; wwwEntry: IndexEntry }> = [];
    const orphans: IndexEntry[] = [];

    for (const entry of nonWwwEntries) {
      // Skip if already deleted as malformed
      if (malformedEntries.some((m) => m.id === entry.id)) continue;

      const wwwEquivalent = entry.url.replace("://", "://www.");
      const existingWww = wwwUrlMap.get(wwwEquivalent);
      if (existingWww) {
        duplicates.push({ entry, wwwEntry: existingWww });
      } else {
        orphans.push(entry);
      }
    }

    // Phase 3: Merge data from duplicates into www entries, then batch-delete
    // Process merges in parallel batches of 10
    const BATCH_SIZE = 10;
    const mergeNeeded = duplicates.filter((d) => {
      const e = d.entry;
      const w = d.wwwEntry;
      return (
        (e.submitted_indexnow && !w.submitted_indexnow) ||
        (e.submitted_sitemap && !w.submitted_sitemap) ||
        (e.last_submitted_at && (!w.last_submitted_at || e.last_submitted_at > w.last_submitted_at))
      );
    });

    for (let i = 0; i < mergeNeeded.length; i += BATCH_SIZE) {
      const batch = mergeNeeded.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(({ entry, wwwEntry }) => {
          const mergeData: Record<string, unknown> = {};
          if (entry.submitted_indexnow && !wwwEntry.submitted_indexnow) mergeData.submitted_indexnow = true;
          if (entry.submitted_sitemap && !wwwEntry.submitted_sitemap) mergeData.submitted_sitemap = true;
          if (entry.last_submitted_at && (!wwwEntry.last_submitted_at || entry.last_submitted_at > wwwEntry.last_submitted_at)) {
            mergeData.last_submitted_at = entry.last_submitted_at;
          }
          return prisma.uRLIndexingStatus.update({ where: { id: wwwEntry.id }, data: mergeData });
        }),
      );
      merged += results.filter((r) => r.status === "fulfilled").length;
      errors += results.filter((r) => r.status === "rejected").length;
    }

    // Batch-delete all duplicate non-www entries
    if (duplicates.length > 0) {
      try {
        const result = await prisma.uRLIndexingStatus.deleteMany({
          where: { id: { in: duplicates.map((d) => d.entry.id) } },
        });
        deleted = result.count;
      } catch (err) {
        console.warn("[cleanup-indexing] Failed to batch-delete duplicates:", err);
        errors += duplicates.length;
      }
    }

    // Phase 4: Convert orphans to www in parallel batches
    for (let i = 0; i < orphans.length; i += BATCH_SIZE) {
      const batch = orphans.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((entry) =>
          prisma.uRLIndexingStatus.update({
            where: { id: entry.id },
            data: {
              url: entry.url.replace("://", "://www."),
              last_inspected_at: null,
              coverage_state: null,
              indexing_state: null,
              inspection_result: null,
              last_error: null,
              status: "submitted",
            },
          }),
        ),
      );
      converted += results.filter((r) => r.status === "fulfilled").length;
      errors += results.filter((r) => r.status === "rejected").length;
    }

    const totalCleaned = deleted + converted + malformedDeleted;
    return NextResponse.json({
      success: true,
      siteId,
      correctBaseUrl,
      totalProcessed: nonWwwEntries.length + malformedEntries.length,
      deleted,
      converted,
      merged,
      malformedDeleted,
      errors,
      message: `Cleaned up ${totalCleaned} entries: ${deleted} duplicates deleted, ${converted} orphans converted to www, ${merged} entries had data merged, ${malformedDeleted} malformed URLs removed`,
    });
  } catch (error) {
    console.error("[cleanup-indexing] POST error:", error);
    return NextResponse.json(
      { error: "Failed to clean up indexing entries" },
      { status: 500 }
    );
  }
});
