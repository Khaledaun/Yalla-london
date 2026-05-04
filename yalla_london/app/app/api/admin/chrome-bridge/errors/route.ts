/**
 * GET /api/admin/chrome-bridge/errors?siteId=X&days=N
 *
 * Surfaces URLs that are likely 404ing for real users or failing in the
 * indexing/crawl pipeline. No Vercel Logs API needed — infers from
 * URLIndexingStatus + GSC data + CronJobLog.
 *
 * Returns:
 *   - `indexingErrors` — URLIndexingStatus rows with status="error" or
 *     last_error present
 *   - `sitemapOrphans` — URLs that appear in GSC impressions but don't
 *     exist as a published BlogPost (dead legacy URLs users hit via Google)
 *   - `cronFailuresWithHttpErrors` — CronJobLog entries with 4xx/5xx
 *     patterns in error_message (crawler, indexer, or sitemap cron issues)
 *   - `summary` — counts + top error patterns
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";
import { buildHints } from "@/lib/chrome-bridge/manifest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");

    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const days = Math.min(
      parseInt(request.nextUrl.searchParams.get("days") || "30", 10),
      90,
    );
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const domain = getSiteDomain(siteId).replace(/\/$/, "");

    const [indexingErrors, gscUrls, publishedSlugs, cronFailures] = await Promise.all([
      prisma.uRLIndexingStatus.findMany({
        where: {
          site_id: siteId,
          OR: [{ status: "error" }, { last_error: { not: null } }],
        },
        orderBy: { last_inspected_at: "desc" },
        take: 100,
        select: {
          url: true,
          status: true,
          coverage_state: true,
          indexing_state: true,
          last_error: true,
          submission_attempts: true,
          last_inspected_at: true,
          last_submitted_at: true,
        },
      }),
      prisma.gscPagePerformance.groupBy({
        by: ["url"],
        where: { site_id: siteId, date: { gte: since } },
        _sum: { clicks: true, impressions: true },
        having: { impressions: { _sum: { gt: 0 } } },
      }),
      prisma.blogPost.findMany({
        where: { published: true, siteId },
        select: { slug: true },
        take: 5000,
      }),
      prisma.cronJobLog.findMany({
        where: {
          site_id: siteId,
          status: { in: ["failed", "timed_out", "partial"] },
          started_at: { gte: since },
          OR: [
            { error_message: { contains: "404" } },
            { error_message: { contains: "500" } },
            { error_message: { contains: "502" } },
            { error_message: { contains: "503" } },
            { error_message: { contains: "504" } },
            { error_message: { contains: "not found" } },
            { error_message: { contains: "ECONNREFUSED" } },
          ],
        },
        orderBy: { started_at: "desc" },
        take: 50,
        select: {
          id: true,
          job_name: true,
          status: true,
          started_at: true,
          duration_ms: true,
          error_message: true,
        },
      }),
    ]);

    const validSlugSet = new Set(publishedSlugs.map((p) => p.slug));

    // Sitemap orphans: GSC sees these URLs but they don't exist as published
    // BlogPosts. Most likely 404 or unpublished.
    const sitemapOrphans: Array<{
      url: string;
      inferredSlug: string | null;
      clicks: number;
      impressions: number;
      reason: string;
    }> = [];

    for (const g of gscUrls) {
      const url = g.url;
      const slug = extractBlogSlug(url, domain);
      // Not a blog URL → skip (static pages ignored here — handled separately if needed)
      if (slug === null) continue;
      if (!validSlugSet.has(slug)) {
        sitemapOrphans.push({
          url,
          inferredSlug: slug,
          clicks: g._sum.clicks ?? 0,
          impressions: g._sum.impressions ?? 0,
          reason: "Appears in GSC impressions but slug not in published BlogPost table",
        });
      }
    }
    sitemapOrphans.sort((a, b) => b.impressions - a.impressions);

    // Cluster indexing errors by normalized error
    const indexingErrorPatterns: Record<string, number> = {};
    for (const row of indexingErrors) {
      const key = normalizeIndexingError(row.last_error ?? row.coverage_state ?? row.status);
      indexingErrorPatterns[key] = (indexingErrorPatterns[key] ?? 0) + 1;
    }

    const summary = {
      indexingErrorCount: indexingErrors.length,
      sitemapOrphanCount: sitemapOrphans.length,
      sitemapOrphansWithImpressions: sitemapOrphans.filter((o) => o.impressions > 0).length,
      cronHttpFailures: cronFailures.length,
      topIndexingErrorPatterns: Object.entries(indexingErrorPatterns)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([pattern, count]) => ({ pattern, count })),
    };

    return NextResponse.json({
      success: true,
      siteId,
      dateRange: { days, startDate: since.toISOString().slice(0, 10) },
      summary,
      indexingErrors: indexingErrors.slice(0, 50),
      sitemapOrphans: sitemapOrphans.slice(0, 30),
      cronFailuresWithHttpErrors: cronFailures,
      _hints: buildHints({ justCalled: "errors" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/errors]", message);
    return NextResponse.json(
      { error: "Failed to load error data", details: message },
      { status: 500 },
    );
  }
}

/**
 * Extract the slug from a blog URL. Returns null if not a blog URL.
 */
function extractBlogSlug(url: string, domain: string): string | null {
  const prefix = `${domain}/blog/`;
  if (!url.startsWith(prefix)) return null;
  const remainder = url.slice(prefix.length);
  const slug = remainder.split("/")[0].split("?")[0].split("#")[0];
  return slug.length > 0 ? slug : null;
}

function normalizeIndexingError(raw: string | null): string {
  if (!raw) return "unknown";
  return raw
    .toLowerCase()
    .replace(/\d+/g, "<n>")
    .replace(/https?:\/\/\S+/g, "<url>")
    .slice(0, 120);
}
