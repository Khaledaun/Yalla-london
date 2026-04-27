export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Public Website Audit
 *
 * One endpoint, six dimensions. Scans every published article ONCE and
 * accumulates findings per dimension so we can act on them as a single
 * package instead of running six separate audits.
 *
 *   1. Photos              — missing featured / no alt / suspicious stock host
 *   2. Unedited content    — AI artifacts that leaked into published copy
 *   3. News refresh        — date-stale news + obsolete temporal anchors
 *   4. SEO updates         — meta length, H1 count, structured data, canonical
 *   5. AIO alignment       — answer-first, question H2s, stats / citations
 *   6. Affiliate practices — rel attributes, disclosure, anchor variety
 *
 * Each dimension returns: score (0-100), issuesCount, top examples with slug
 * + specific issue text + actionable next step (which existing cron auto-fixes
 * it OR what manual action is needed).
 *
 * Builds incrementally — Batch 1 ships the skeleton + dimension #1 (Photos)
 * so partial responses are useful even if a session times out.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";
import { prisma } from "@/lib/db";

const BUDGET_MS = 100_000;

type Severity = "critical" | "high" | "medium" | "low";

interface Issue {
  slug: string;
  title: string;
  severity: Severity;
  detail: string;
}

interface DimensionResult {
  name: string;
  score: number;
  issuesCount: number;
  bySeverity: Record<Severity, number>;
  top: Issue[];
  nextAction: string;
}

interface ArticleRow {
  id: string;
  slug: string;
  siteId: string;
  title_en: string | null;
  title_ar: string | null;
  meta_title_en: string | null;
  meta_title_ar: string | null;
  meta_description_en: string | null;
  meta_description_ar: string | null;
  content_en: string | null;
  content_ar: string | null;
  featured_image: string | null;
  category_id: string | null;
  created_at: Date;
  updated_at: Date;
}

function emptyDimension(name: string, nextAction: string): DimensionResult {
  return {
    name,
    score: 100,
    issuesCount: 0,
    bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
    top: [],
    nextAction,
  };
}

function scoreFromIssues(bySeverity: Record<Severity, number>): number {
  // Caps each severity bucket so a single ruined article can't tank the
  // whole dimension. Floors the result at 0.
  const penalty =
    Math.min(bySeverity.critical, 20) * 5 +
    Math.min(bySeverity.high, 30) * 2 +
    Math.min(bySeverity.medium, 50) * 1 +
    Math.min(bySeverity.low, 80) * 0.25;
  return Math.max(0, Math.round(100 - penalty));
}

function pushIssue(issues: Issue[], bySeverity: Record<Severity, number>, issue: Issue): void {
  issues.push(issue);
  bySeverity[issue.severity]++;
}

function topIssues(issues: Issue[], limit = 10): Issue[] {
  const order: Record<Severity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return [...issues].sort((a, b) => order[a.severity] - order[b.severity]).slice(0, limit);
}

// ───────────────────────────────────────────────────────────────────────────
// Dimension 1: Photos
// ───────────────────────────────────────────────────────────────────────────

const SUSPICIOUS_STOCK_PATTERN =
  /(istockphoto|shutterstock|gettyimages|adobestock|123rf|dreamstime|stock\.adobe|pixabay|pexels)/i;

function auditPhotos(posts: ArticleRow[]): DimensionResult {
  const issues: Issue[] = [];
  const bySeverity: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const p of posts) {
    const slug = p.slug;
    const title = (p.title_en || "").slice(0, 80);

    if (!p.featured_image || p.featured_image.trim() === "") {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "critical",
        detail: "Missing featured_image",
      });
    }

    const content = p.content_en || "";
    const imgs = [...content.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);

    if (imgs.length === 0 && (p.featured_image || "").trim() !== "") {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "high",
        detail: "Body has no <img> tags (only the featured image)",
      });
    }

    const missingAlt = imgs.filter((tag) => !/\balt\s*=\s*"[^"]*\S[^"]*"/i.test(tag));
    if (missingAlt.length > 0) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "medium",
        detail: `${missingAlt.length} <img> tag(s) missing or empty alt`,
      });
    }

    const stockHosts = new Set<string>();
    for (const tag of imgs) {
      const src = /\bsrc\s*=\s*"([^"]+)"/i.exec(tag);
      if (!src) continue;
      try {
        const u = new URL(src[1]);
        if (SUSPICIOUS_STOCK_PATTERN.test(u.hostname)) stockHosts.add(u.hostname);
      } catch {
        /* relative URL — ignore */
      }
    }
    if (stockHosts.size > 0) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "medium",
        detail: `Stock photo host(s): ${[...stockHosts].join(", ")}`,
      });
    }
  }

  return {
    name: "photos",
    score: scoreFromIssues(bySeverity),
    issuesCount: issues.length,
    bySeverity,
    top: topIssues(issues),
    nextAction:
      bySeverity.critical > 0 || bySeverity.high > 0
        ? "Run image_fix MCP tool (triggers image-pipeline cron) — fills missing featured images and replaces blocked stock photos"
        : "Photos look good",
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Handler
// ───────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const start = Date.now();
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
  const sample = parseInt(request.nextUrl.searchParams.get("sample") || "500", 10);

  try {
    const posts = (await prisma.blogPost.findMany({
      where: { siteId, published: true },
      select: {
        id: true,
        slug: true,
        siteId: true,
        title_en: true,
        title_ar: true,
        meta_title_en: true,
        meta_title_ar: true,
        meta_description_en: true,
        meta_description_ar: true,
        content_en: true,
        content_ar: true,
        featured_image: true,
        category_id: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: "desc" },
      take: Math.min(Math.max(sample, 50), 1000),
    })) as ArticleRow[];

    const dimensions: Record<string, DimensionResult> = {
      photos: auditPhotos(posts),
      unedited: emptyDimension("unedited", "Pending — Batch 2"),
      newsRefresh: emptyDimension("newsRefresh", "Pending — Batch 2"),
      seoUpdates: emptyDimension("seoUpdates", "Pending — Batch 3"),
      aioAlignment: emptyDimension("aioAlignment", "Pending — Batch 3"),
      affiliatePractices: emptyDimension("affiliatePractices", "Pending — Batch 4"),
    };

    return NextResponse.json({
      success: true,
      site: siteId,
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
      totalArticlesScanned: posts.length,
      dimensions,
      _format: "yalla-public-audit-v1",
      _note:
        "Batch 1 of 5 — only the photos dimension is implemented. The other 5 dimensions return empty placeholders so the response shape stays stable.",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
