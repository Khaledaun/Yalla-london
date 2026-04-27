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
// Dimension 2: Unedited content (AI artifacts that leaked into published copy)
// ───────────────────────────────────────────────────────────────────────────

// Patterns the AI sometimes prefixes/leaks into TITLE or META fields. These
// must never reach a real reader.
const TITLE_LEAK_PREFIX = /^(title|meta\s*title|meta\s*description|seo\s*title|h1|heading)\s*:\s*/i;
const PARENTHETICAL_LENGTH_NOTE = /\(\s*(?:under\s+\d+|\d+\s*(?:chars?|characters?))\b[^)]*\)/i;

// Placeholder / stub markers that should have been cleaned before publish.
const PLACEHOLDER_MARKERS =
  /\[(?:TODO|PLACEHOLDER|REDIRECTED|DUPLICATE-FLAGGED|PENDING|FIXME|TBD)\]|TOPIC_SLUG|<<<.*?>>>|XXXTODOXXX/i;

// Markdown that escaped the renderer and printed as literal text.
const MARKDOWN_LEAK = /```|~~~/;

// Generic AI phrases — Google demotes these per the Jan 2026 Authenticity
// Update. Each instance is low-severity by itself; the count matters.
const AI_GENERIC_PHRASES = [
  "in conclusion",
  "it's worth noting",
  "without further ado",
  "look no further",
  "nestled in the heart of",
  "in this comprehensive guide",
  "whether you're a",
  "stands as a testament",
  "embark on a journey",
];

function auditUnedited(posts: ArticleRow[]): DimensionResult {
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

    // Check every visible-to-reader text field for leaks.
    const textFields: Array<{ name: string; value: string }> = [
      { name: "title_en", value: p.title_en || "" },
      { name: "title_ar", value: p.title_ar || "" },
      { name: "meta_title_en", value: p.meta_title_en || "" },
      { name: "meta_title_ar", value: p.meta_title_ar || "" },
      { name: "meta_description_en", value: p.meta_description_en || "" },
      { name: "meta_description_ar", value: p.meta_description_ar || "" },
    ];

    for (const f of textFields) {
      if (!f.value) continue;
      if (TITLE_LEAK_PREFIX.test(f.value)) {
        pushIssue(issues, bySeverity, {
          slug,
          title,
          severity: "critical",
          detail: `${f.name} starts with AI prefix ("${f.value.slice(0, 40)}...")`,
        });
      }
      if (PARENTHETICAL_LENGTH_NOTE.test(f.value)) {
        pushIssue(issues, bySeverity, {
          slug,
          title,
          severity: "high",
          detail: `${f.name} contains AI char-count note`,
        });
      }
    }

    const content = p.content_en || "";

    if (PLACEHOLDER_MARKERS.test(content)) {
      const match = content.match(PLACEHOLDER_MARKERS);
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "critical",
        detail: `Placeholder marker in body: ${match?.[0]}`,
      });
    }

    if (MARKDOWN_LEAK.test(content)) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "high",
        detail: "Markdown code fences leaked into rendered HTML",
      });
    }

    const lower = content.toLowerCase();
    let genericCount = 0;
    for (const phrase of AI_GENERIC_PHRASES) {
      if (lower.includes(phrase)) genericCount++;
    }
    if (genericCount >= 3) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "medium",
        detail: `${genericCount} generic AI phrases (Jan 2026 Authenticity Update demotes)`,
      });
    } else if (genericCount > 0) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "low",
        detail: `${genericCount} generic AI phrase(s) — borderline acceptable`,
      });
    }
  }

  return {
    name: "unedited",
    score: scoreFromIssues(bySeverity),
    issuesCount: issues.length,
    bySeverity,
    top: topIssues(issues),
    nextAction:
      bySeverity.critical > 0
        ? "Run content-auto-fix cron — strips known placeholder markers (Section 14 in route). Critical title-prefix leaks need a manual edit on each article."
        : bySeverity.high > 0
          ? "Run seo-deep-review cron — rewrites meta with stronger anchors and trims AI residue"
          : "Content looks edited",
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Dimension 3: News refresh (date-stale content losing relevance)
// ───────────────────────────────────────────────────────────────────────────

// Recognise a category as "news" by id or by slug-style hint. Different sites
// use different category schemes so we look at both.
function isNewsCategoryId(catId: string | null): boolean {
  if (!catId) return false;
  return /news|breaking|current|today|update/i.test(catId);
}

const STALE_TEMPORAL_ANCHORS = [
  /\btoday\b/i,
  /\byesterday\b/i,
  /\bthis\s+week\b/i,
  /\blast\s+week\b/i,
  /\bthis\s+month\b/i,
];

function auditNewsRefresh(posts: ArticleRow[]): DimensionResult {
  const issues: Issue[] = [];
  const bySeverity: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const sevenDaysMs = 7 * 86400000;
  const ninetyDaysMs = 90 * 86400000;

  for (const p of posts) {
    const slug = p.slug;
    const title = (p.title_en || "").slice(0, 80);
    const ageMs = now.getTime() - p.created_at.getTime();
    const isNews = isNewsCategoryId(p.category_id) || /\bnews\b/i.test(slug);

    // News articles older than 7 days are probably stale. Flag for review or
    // archival — they shouldn't dominate the news rail any more.
    if (isNews && ageMs > sevenDaysMs && ageMs < ninetyDaysMs) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "high",
        detail: `News article ${Math.floor(ageMs / 86400000)}d old — past relevance window`,
      });
    } else if (isNews && ageMs >= ninetyDaysMs) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "critical",
        detail: `News article ${Math.floor(ageMs / 86400000)}d old — should be archived or rewritten as evergreen`,
      });
    }

    // Stale year reference in any visible field.
    const allText = [
      p.title_en,
      p.title_ar,
      p.meta_title_en,
      p.meta_description_en,
      p.content_en?.slice(0, 4000), // first 4KB is enough for an indicator
    ]
      .filter(Boolean)
      .join(" ");

    const yearMatches = [...allText.matchAll(/\b(20\d{2})\b/g)]
      .map((m) => parseInt(m[1], 10))
      .filter((y) => y >= 2018 && y < currentYear);

    if (yearMatches.length > 0) {
      const oldest = Math.min(...yearMatches);
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: oldest <= currentYear - 2 ? "high" : "medium",
        detail: `Stale year ref: ${[...new Set(yearMatches)].sort().join(", ")} (current: ${currentYear})`,
      });
    }

    // Floating temporal anchors only matter on news where "today" actually
    // refers to a moment in time. On evergreen posts they're less critical.
    if (isNews) {
      const content = p.content_en || "";
      let anchorHits = 0;
      for (const re of STALE_TEMPORAL_ANCHORS) {
        if (re.test(content)) anchorHits++;
      }
      if (anchorHits >= 2 && ageMs > sevenDaysMs) {
        pushIssue(issues, bySeverity, {
          slug,
          title,
          severity: "medium",
          detail: `${anchorHits} floating temporal anchors ("today", "this week") in stale news — meaning has drifted`,
        });
      }
    }
  }

  return {
    name: "newsRefresh",
    score: scoreFromIssues(bySeverity),
    issuesCount: issues.length,
    bySeverity,
    top: topIssues(issues),
    nextAction:
      bySeverity.critical > 0
        ? "Archive stale news articles — set published=false or noindex. Run content-auto-fix Section 12 (thin/stale unpublish)."
        : bySeverity.high > 0
          ? "Run dates_audit MCP tool to confirm scope, then bulk-rewrite year references to current year"
          : "News content is fresh",
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
      unedited: auditUnedited(posts),
      newsRefresh: auditNewsRefresh(posts),
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
