export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrCron } from "@/lib/admin-middleware";
import { getAllSiteIds, getSiteConfig } from "@/config/sites";

/**
 * GET /api/admin/content-audit
 *
 * Deep content & indexing cross-reference audit.
 * Shows exactly:
 *   - How many articles/blogs/pages exist per site
 *   - How many have requested indexing (submitted to Google/IndexNow)
 *   - How many are confirmed indexed
 *   - How many are NOT indexed and WHY (with GSC coverage reasons)
 *
 * Accepts admin session OR CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdminOrCron(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const siteIds = getAllSiteIds();

    // ── 1. Blog post counts per site ─────────────────────────────────
    const postCountsBySite = await prisma.blogPost.groupBy({
      by: ["siteId", "published"],
      where: { deletedAt: null },
      _count: true,
    });

    // Build site-level stats
    const siteStats: Record<
      string,
      {
        siteName: string;
        domain: string;
        totalPosts: number;
        published: number;
        drafts: number;
      }
    > = {};

    for (const id of siteIds) {
      const cfg = getSiteConfig(id);
      siteStats[id] = {
        siteName: cfg?.name ?? id,
        domain: cfg?.domain ?? "",
        totalPosts: 0,
        published: 0,
        drafts: 0,
      };
    }

    for (const row of postCountsBySite) {
      const sid = row.siteId ?? "unknown";
      if (!siteStats[sid]) {
        siteStats[sid] = {
          siteName: sid,
          domain: "",
          totalPosts: 0,
          published: 0,
          drafts: 0,
        };
      }
      siteStats[sid].totalPosts += row._count;
      if (row.published) siteStats[sid].published += row._count;
      else siteStats[sid].drafts += row._count;
    }

    // ── 2. URL Indexing Status aggregation ───────────────────────────
    const indexStatusBySite = await (prisma as any).uRLIndexingStatus.groupBy({
      by: ["site_id", "status"],
      _count: true,
    });

    const indexBySite: Record<
      string,
      {
        total: number;
        discovered: number;
        submitted: number;
        indexed: number;
        deindexed: number;
        error: number;
      }
    > = {};

    for (const row of indexStatusBySite) {
      const sid = row.site_id;
      if (!indexBySite[sid]) {
        indexBySite[sid] = {
          total: 0,
          discovered: 0,
          submitted: 0,
          indexed: 0,
          deindexed: 0,
          error: 0,
        };
      }
      indexBySite[sid].total += row._count;
      const key = row.status as keyof typeof indexBySite[string];
      if (key in indexBySite[sid]) {
        (indexBySite[sid] as any)[key] += row._count;
      }
    }

    // ── 3. NOT INDEXED — reasons from GSC coverage_state ─────────────
    const notIndexedReasons = await (
      prisma as any
    ).uRLIndexingStatus.groupBy({
      by: ["site_id", "coverage_state"],
      where: {
        status: { notIn: ["indexed"] },
        coverage_state: { not: null },
      },
      _count: true,
    });

    const reasonsBySite: Record<string, Array<{ reason: string; count: number }>> = {};
    for (const row of notIndexedReasons) {
      if (!reasonsBySite[row.site_id]) reasonsBySite[row.site_id] = [];
      reasonsBySite[row.site_id].push({
        reason: row.coverage_state || "Unknown",
        count: row._count,
      });
    }

    // Sort reasons by count descending
    for (const sid of Object.keys(reasonsBySite)) {
      reasonsBySite[sid].sort((a, b) => b.count - a.count);
    }

    // ── 4. URLs with errors — specific error messages ────────────────
    const urlErrors = await (prisma as any).uRLIndexingStatus.findMany({
      where: {
        status: "error",
      },
      select: {
        site_id: true,
        url: true,
        slug: true,
        last_error: true,
        coverage_state: true,
        submission_attempts: true,
        last_submitted_at: true,
      },
      orderBy: { last_submitted_at: "desc" },
      take: 30,
    });

    // ── 5. Pages submitted but NOT indexed (stuck) ───────────────────
    const stuckPages = await (prisma as any).uRLIndexingStatus.findMany({
      where: {
        status: "submitted",
        submitted_indexnow: true,
        last_submitted_at: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // >7 days ago
        },
      },
      select: {
        site_id: true,
        url: true,
        slug: true,
        coverage_state: true,
        indexing_state: true,
        last_submitted_at: true,
        submission_attempts: true,
      },
      orderBy: { last_submitted_at: "asc" },
      take: 20,
    });

    // ── 6. Published posts WITHOUT URL tracking ──────────────────────
    // Find posts that are published but have no URLIndexingStatus entry
    const publishedPosts = await prisma.blogPost.findMany({
      where: { published: true, deletedAt: null },
      select: { id: true, slug: true, siteId: true, title_en: true, created_at: true },
    });

    const trackedSlugs = await (prisma as any).uRLIndexingStatus.findMany({
      select: { slug: true, site_id: true },
      where: { slug: { not: null } },
    });

    const trackedSet = new Set(
      trackedSlugs.map((t: any) => `${t.site_id}:${t.slug}`),
    );

    const untrackedPosts = publishedPosts.filter(
      (p) => p.slug && !trackedSet.has(`${p.siteId}:${p.slug}`),
    );

    // ── 7. Global totals ─────────────────────────────────────────────
    const totalPosts = Object.values(siteStats).reduce((s, v) => s + v.totalPosts, 0);
    const totalPublished = Object.values(siteStats).reduce((s, v) => s + v.published, 0);
    const totalDrafts = Object.values(siteStats).reduce((s, v) => s + v.drafts, 0);
    const totalTracked = Object.values(indexBySite).reduce((s, v) => s + v.total, 0);
    const totalIndexed = Object.values(indexBySite).reduce((s, v) => s + v.indexed, 0);
    const totalSubmitted = Object.values(indexBySite).reduce((s, v) => s + v.submitted, 0);
    const totalErrors = Object.values(indexBySite).reduce((s, v) => s + v.error, 0);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      summary: {
        totalPosts,
        totalPublished,
        totalDrafts,
        totalTrackedUrls: totalTracked,
        totalIndexed,
        totalSubmittedPending: totalSubmitted,
        totalErrors,
        totalUntracked: untrackedPosts.length,
        indexRate: totalTracked > 0
          ? Math.round((totalIndexed / totalTracked) * 100)
          : 0,
      },
      perSite: siteIds.map((id) => {
        const stats = siteStats[id] || {
          siteName: id,
          domain: "",
          totalPosts: 0,
          published: 0,
          drafts: 0,
        };
        const idx = indexBySite[id] || {
          total: 0,
          discovered: 0,
          submitted: 0,
          indexed: 0,
          deindexed: 0,
          error: 0,
        };
        const reasons = reasonsBySite[id] || [];

        return {
          siteId: id,
          ...stats,
          indexing: {
            ...idx,
            indexRate: idx.total > 0
              ? Math.round((idx.indexed / idx.total) * 100)
              : 0,
          },
          notIndexedReasons: reasons,
        };
      }),
      stuckPages: stuckPages.map((p: any) => ({
        siteId: p.site_id,
        url: p.url,
        slug: p.slug,
        coverageState: p.coverage_state,
        indexingState: p.indexing_state,
        submittedAt: p.last_submitted_at,
        attempts: p.submission_attempts,
      })),
      urlErrors: urlErrors.map((e: any) => ({
        siteId: e.site_id,
        url: e.url,
        slug: e.slug,
        error: e.last_error,
        coverageState: e.coverage_state,
        attempts: e.submission_attempts,
      })),
      untrackedPosts: untrackedPosts.slice(0, 20).map((p) => ({
        siteId: p.siteId,
        slug: p.slug,
        title: p.title_en?.substring(0, 60),
        createdAt: p.created_at,
      })),
    });
  } catch (error) {
    console.error("[Content Audit] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run content audit" },
      { status: 500 },
    );
  }
}

export const POST = GET;
