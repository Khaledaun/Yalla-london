export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * Per-Page Audit API
 *
 * Returns a sortable list of all published pages with:
 * - Page name, URL, publish date
 * - Latest crawl timestamp, indexing status
 * - Issues and when they appeared
 * - GSC impressions, clicks, CTR, position
 *
 * Query params:
 *   siteId     - required
 *   sort       - field to sort by (default: publishedAt)
 *   order      - asc | desc (default: desc)
 *   limit      - page size (default: 100)
 *   offset     - pagination offset (default: 0)
 */

interface PageAuditRow {
  id: string;
  title: string;
  slug: string;
  url: string;
  publishedAt: string | null;
  updatedAt: string | null;
  seoScore: number;
  wordCount: number;

  // Indexing
  indexingStatus: string;
  coverageState: string | null;
  lastCrawledAt: string | null;
  lastInspectedAt: string | null;
  lastSubmittedAt: string | null;
  submittedIndexnow: boolean;
  submittedSitemap: boolean;
  indexingError: string | null;

  // GSC Performance (7-day)
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;

  // Issues
  issues: Array<{
    type: string;
    severity: "critical" | "warning" | "info";
    message: string;
    detectedAt: string | null;
  }>;
}

export async function GET(request: NextRequest) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  const { searchParams } = request.nextUrl;
  const siteId = searchParams.get("siteId");
  if (!siteId) {
    return NextResponse.json({ error: "siteId required" }, { status: 400 });
  }

  const sort = searchParams.get("sort") || "publishedAt";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    const { prisma } = await import("@/lib/db");
    const { getSiteDomain } = await import("@/config/sites");

    const domain = getSiteDomain(siteId);
    const baseUrl = `https://${domain}`;

    // 1. Get all published blog posts for this site
    const posts = await prisma.blogPost.findMany({
      where: { siteId, published: true },
      select: {
        id: true,
        title_en: true,
        slug: true,
        seo_score: true,
        content_en: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: "desc" },
      take: 500, // Safety cap
    });

    if (posts.length === 0) {
      return NextResponse.json({
        pages: [],
        total: 0,
        sort,
        order,
        limit,
        offset,
        siteId,
      });
    }

    // 2. Get indexing status for all pages
    const slugs = posts.map((p) => p.slug);
    const indexingRows = await prisma.uRLIndexingStatus.findMany({
      where: { site_id: siteId, slug: { in: slugs } },
      select: {
        slug: true,
        status: true,
        coverage_state: true,
        indexing_state: true,
        submitted_indexnow: true,
        submitted_sitemap: true,
        last_submitted_at: true,
        last_inspected_at: true,
        last_crawled_at: true,
        last_error: true,
        updated_at: true,
      },
    });
    const indexingBySlug = new Map(indexingRows.map((r) => [r.slug, r]));

    // 3. Get GSC performance data (last 7 days aggregated)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const urls = posts.map((p) => `${baseUrl}/blog/${p.slug}`);

    let gscByUrl = new Map<string, { clicks: number; impressions: number; ctr: number; position: number }>();

    try {
      const gscRows = await prisma.gscPagePerformance.findMany({
        where: {
          site_id: siteId,
          url: { in: urls },
          date: { gte: sevenDaysAgo },
        },
        select: { url: true, clicks: true, impressions: true, ctr: true, position: true },
      });

      // Aggregate by URL
      const gscAgg = new Map<string, { clicks: number; impressions: number; positions: number[]; count: number }>();
      for (const row of gscRows) {
        const existing = gscAgg.get(row.url) || { clicks: 0, impressions: 0, positions: [], count: 0 };
        existing.clicks += row.clicks;
        existing.impressions += row.impressions;
        existing.positions.push(row.position);
        existing.count++;
        gscAgg.set(row.url, existing);
      }

      for (const [url, agg] of gscAgg) {
        const avgPos = agg.positions.length > 0 ? agg.positions.reduce((a, b) => a + b, 0) / agg.positions.length : 0;
        const ctr = agg.impressions > 0 ? agg.clicks / agg.impressions : 0;
        gscByUrl.set(url, { clicks: agg.clicks, impressions: agg.impressions, ctr, position: Math.round(avgPos * 10) / 10 });
      }
    } catch (gscErr) {
      // GscPagePerformance table may not exist yet — degrade gracefully
      console.warn("[per-page-audit] GSC query failed (non-fatal):", gscErr instanceof Error ? gscErr.message : gscErr);
    }

    // 4. Build rows
    const rows: PageAuditRow[] = posts.map((post) => {
      const fullUrl = `${baseUrl}/blog/${post.slug}`;
      const idx = indexingBySlug.get(post.slug);
      const gsc = gscByUrl.get(fullUrl) || { clicks: 0, impressions: 0, ctr: 0, position: 0 };

      // Compute word count from content
      const wordCount = post.content_en
        ? post.content_en.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length
        : 0;

      // Detect issues
      const issues: PageAuditRow["issues"] = [];

      // Indexing issues
      if (!idx) {
        issues.push({ type: "indexing", severity: "critical", message: "Never submitted for indexing", detectedAt: null });
      } else if (idx.status === "error") {
        issues.push({ type: "indexing", severity: "critical", message: `Indexing error: ${idx.last_error || "unknown"}`, detectedAt: idx.updated_at?.toISOString() || null });
      } else if (idx.status === "deindexed") {
        issues.push({ type: "indexing", severity: "critical", message: "Page was de-indexed by Google", detectedAt: idx.updated_at?.toISOString() || null });
      } else if (idx.status !== "indexed") {
        issues.push({ type: "indexing", severity: "warning", message: `Status: ${idx.status}${idx.coverage_state ? ` (${idx.coverage_state})` : ""}`, detectedAt: idx.last_submitted_at?.toISOString() || null });
      }

      // SEO score issues
      if (post.seo_score !== null && post.seo_score < 50) {
        issues.push({ type: "seo", severity: "critical", message: `SEO score ${post.seo_score}/100 — below minimum`, detectedAt: post.updated_at?.toISOString() || null });
      } else if (post.seo_score !== null && post.seo_score < 70) {
        issues.push({ type: "seo", severity: "warning", message: `SEO score ${post.seo_score}/100 — below target`, detectedAt: post.updated_at?.toISOString() || null });
      }

      // Content issues
      if (wordCount < 1000) {
        issues.push({ type: "content", severity: wordCount < 500 ? "critical" : "warning", message: `Only ${wordCount} words (target: 1,000+)`, detectedAt: null });
      }

      // Performance issues
      if (gsc.impressions > 100 && gsc.ctr < 0.02) {
        issues.push({ type: "performance", severity: "warning", message: `CTR ${(gsc.ctr * 100).toFixed(1)}% despite ${gsc.impressions} impressions`, detectedAt: null });
      }
      if (gsc.position > 20 && gsc.impressions > 0) {
        issues.push({ type: "performance", severity: "info", message: `Avg position ${gsc.position} — buried beyond page 2`, detectedAt: null });
      }

      return {
        id: post.id,
        title: post.title_en || post.slug,
        slug: post.slug,
        url: fullUrl,
        publishedAt: post.created_at?.toISOString() || null,
        updatedAt: post.updated_at?.toISOString() || null,
        seoScore: post.seo_score ?? 0,
        wordCount,
        indexingStatus: idx?.status || "never_submitted",
        coverageState: idx?.coverage_state || null,
        lastCrawledAt: idx?.last_crawled_at?.toISOString() || null,
        lastInspectedAt: idx?.last_inspected_at?.toISOString() || null,
        lastSubmittedAt: idx?.last_submitted_at?.toISOString() || null,
        submittedIndexnow: idx?.submitted_indexnow ?? false,
        submittedSitemap: idx?.submitted_sitemap ?? false,
        indexingError: idx?.last_error || null,
        clicks: gsc.clicks,
        impressions: gsc.impressions,
        ctr: Math.round(gsc.ctr * 10000) / 100, // percentage with 2 decimals
        position: gsc.position,
        issues,
      };
    });

    // 5. Sort
    const sortFn = (a: PageAuditRow, b: PageAuditRow): number => {
      let va: number | string | null;
      let vb: number | string | null;

      switch (sort) {
        case "title": va = a.title.toLowerCase(); vb = b.title.toLowerCase(); break;
        case "publishedAt": va = a.publishedAt || ""; vb = b.publishedAt || ""; break;
        case "lastCrawledAt": va = a.lastCrawledAt || ""; vb = b.lastCrawledAt || ""; break;
        case "lastInspectedAt": va = a.lastInspectedAt || ""; vb = b.lastInspectedAt || ""; break;
        case "clicks": va = a.clicks; vb = b.clicks; break;
        case "impressions": va = a.impressions; vb = b.impressions; break;
        case "ctr": va = a.ctr; vb = b.ctr; break;
        case "position": va = a.position; vb = b.position; break;
        case "seoScore": va = a.seoScore; vb = b.seoScore; break;
        case "wordCount": va = a.wordCount; vb = b.wordCount; break;
        case "issues": va = a.issues.length; vb = b.issues.length; break;
        case "indexingStatus": va = a.indexingStatus; vb = b.indexingStatus; break;
        default: va = a.publishedAt || ""; vb = b.publishedAt || "";
      }

      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (va < vb) return order === "asc" ? -1 : 1;
      if (va > vb) return order === "asc" ? 1 : -1;
      return 0;
    };

    rows.sort(sortFn);

    // 6. Paginate
    const total = rows.length;
    const paged = rows.slice(offset, offset + limit);

    // 7. Summary stats
    const indexed = rows.filter((r) => r.indexingStatus === "indexed").length;
    const withIssues = rows.filter((r) => r.issues.length > 0).length;
    const criticalIssues = rows.filter((r) => r.issues.some((i) => i.severity === "critical")).length;
    const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
    const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
    const avgCtr = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0;
    const avgSeo = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.seoScore, 0) / rows.length) : 0;

    return NextResponse.json({
      pages: paged,
      total,
      summary: {
        totalPages: total,
        indexed,
        withIssues,
        criticalIssues,
        totalClicks,
        totalImpressions,
        avgCtr,
        avgSeo,
      },
      sort,
      order,
      limit,
      offset,
      siteId,
    });
  } catch (err) {
    console.error("[per-page-audit] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to load audit data" }, { status: 500 });
  }
}
