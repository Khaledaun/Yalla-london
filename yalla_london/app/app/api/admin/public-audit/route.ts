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
  canonical_slug: string | null;
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
// Dimension 4: SEO updates (technical SEO + the Tier 1+2 blind spots)
// ───────────────────────────────────────────────────────────────────────────

// Length thresholds aligned with lib/seo/standards.ts CONTENT_QUALITY.
const META_TITLE_MIN = 30;
const META_TITLE_MAX = 60;
const META_DESC_MIN = 120;
const META_DESC_MAX = 160;

// Soft 404 indicators — page returns 200 but content reads like an error.
const SOFT_404_PATTERNS = [
  /\bnot\s+found\b/i,
  /\bcoming\s+soon\b/i,
  /\bunder\s+construction\b/i,
  /\bno\s+results?\b/i,
  /\bsorry,?\s+nothing\b/i,
  /\b404\b/,
  /\bpage\s+not\s+available\b/i,
];

// Schema @type values that must match URL pattern. If the URL doesn't fit, the
// schema is wrong and Google will reject the rich result.
const SCHEMA_URL_RULES: Array<{ pattern: RegExp; allowedTypes: string[] }> = [
  { pattern: /\/blog\//, allowedTypes: ["Article", "BlogPosting", "NewsArticle"] },
  { pattern: /\/news\//, allowedTypes: ["NewsArticle", "Article"] },
  { pattern: /\/yachts\//, allowedTypes: ["Product", "Service"] },
  { pattern: /\/destinations\//, allowedTypes: ["Place", "TouristDestination"] },
  { pattern: /\/itineraries\//, allowedTypes: ["Trip", "Article"] },
];

interface SeoSitewide {
  // Hash → array of slugs that share the same meta_description. Anything with
  // length > 1 is a duplicate cluster.
  duplicateMetaDescriptions: Map<string, string[]>;
  // Slugs whose canonical_slug points to another article that ALSO has a
  // canonical_slug — that's a 301 chain.
  redirectChains: Array<{ slug: string; via: string; finalTarget: string }>;
  // Slugs whose Arabic content is mostly English (server-side language
  // mismatch — KG-032 risk).
  arabicLanguageMismatch: string[];
  // Sitewide signals that aren't per-article.
  organizationSchemaHasSameAs: boolean | null;
}

function buildSitewideContext(posts: ArticleRow[]): SeoSitewide {
  const metaHash = new Map<string, string[]>();
  for (const p of posts) {
    const meta = (p.meta_description_en || "").trim();
    if (meta.length < 50) continue; // ignore empties + obvious stubs
    const key = meta.toLowerCase().replace(/\s+/g, " ");
    const existing = metaHash.get(key) || [];
    existing.push(p.slug);
    metaHash.set(key, existing);
  }

  // Build the canonical_slug graph and find chains. A → B → C means article A
  // 301-redirects to B, but B itself 301-redirects to C. Each hop loses ~5%
  // authority so we want every redirect to land on the final target directly.
  const slugToCanonical = new Map<string, string>();
  for (const p of posts) {
    if (p.canonical_slug && p.canonical_slug !== p.slug) {
      slugToCanonical.set(p.slug, p.canonical_slug);
    }
  }
  const chains: SeoSitewide["redirectChains"] = [];
  for (const [from, via] of slugToCanonical) {
    const next = slugToCanonical.get(via);
    if (next && next !== via) {
      chains.push({ slug: from, via, finalTarget: next });
    }
  }

  // Heuristic Arabic-language check: count Arabic Unicode characters in
  // content_ar. If the field exists but has < 30% Arabic characters in the
  // first 2000 chars, the article is probably English masquerading as Arabic.
  const arabicMismatch: string[] = [];
  for (const p of posts) {
    const ar = (p.content_ar || "").slice(0, 2000);
    if (ar.length < 200) continue;
    const arabicChars = (ar.match(/[؀-ۿ]/g) || []).length;
    if (arabicChars / ar.length < 0.3) arabicMismatch.push(p.slug);
  }

  return {
    duplicateMetaDescriptions: metaHash,
    redirectChains: chains,
    arabicLanguageMismatch: arabicMismatch,
    organizationSchemaHasSameAs: null, // populated lazily by per-article scan
  };
}

function auditSeoUpdates(posts: ArticleRow[], sitewide: SeoSitewide): DimensionResult {
  const issues: Issue[] = [];
  const bySeverity: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  // Resolve duplicate meta_description clusters into per-article issues.
  for (const [, slugs] of sitewide.duplicateMetaDescriptions) {
    if (slugs.length < 2) continue;
    for (const slug of slugs) {
      const post = posts.find((p) => p.slug === slug);
      if (!post) continue;
      pushIssue(issues, bySeverity, {
        slug,
        title: (post.title_en || "").slice(0, 80),
        severity: "high",
        detail: `Duplicate meta_description shared with ${slugs.length - 1} other article(s) — Google dedupes in SERP`,
      });
    }
  }

  // Redirect chains.
  for (const c of sitewide.redirectChains) {
    const post = posts.find((p) => p.slug === c.slug);
    pushIssue(issues, bySeverity, {
      slug: c.slug,
      title: (post?.title_en || "").slice(0, 80),
      severity: "high",
      detail: `301 chain: ${c.slug} → ${c.via} → ${c.finalTarget}. Each hop loses ~5% authority.`,
    });
  }

  // Arabic language mismatch (KG-032 manifesting as content not just SSR).
  for (const slug of sitewide.arabicLanguageMismatch) {
    const post = posts.find((p) => p.slug === slug);
    pushIssue(issues, bySeverity, {
      slug,
      title: (post?.title_en || "").slice(0, 80),
      severity: "high",
      detail: "content_ar field exists but is mostly English — hreflang pair is invalidated",
    });
  }

  // Per-article checks.
  for (const p of posts) {
    const slug = p.slug;
    const title = (p.title_en || "").slice(0, 80);
    const content = p.content_en || "";

    // Meta title length.
    const mt = (p.meta_title_en || "").trim();
    if (!mt) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "high",
        detail: "Missing meta_title_en",
      });
    } else if (mt.length < META_TITLE_MIN) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "medium",
        detail: `meta_title_en too short (${mt.length} chars, min ${META_TITLE_MIN})`,
      });
    } else if (mt.length > META_TITLE_MAX) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "medium",
        detail: `meta_title_en too long (${mt.length} chars, max ${META_TITLE_MAX} — gets truncated in SERP)`,
      });
    }

    // Meta description length.
    const md = (p.meta_description_en || "").trim();
    if (!md) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "high",
        detail: "Missing meta_description_en",
      });
    } else if (md.length < META_DESC_MIN) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "medium",
        detail: `meta_description_en too short (${md.length} chars, min ${META_DESC_MIN})`,
      });
    } else if (md.length > META_DESC_MAX) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "low",
        detail: `meta_description_en too long (${md.length} chars, soft cap ${META_DESC_MAX})`,
      });
    }

    // H1 count — page template provides H1, body must use H2+.
    const h1Matches = [...content.matchAll(/<h1\b[^>]*>/gi)];
    if (h1Matches.length > 0) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "high",
        detail: `Body contains ${h1Matches.length} <h1> tag(s) — page template already provides one`,
      });
    }

    // Structured data presence.
    const hasJsonLd = /<script[^>]*type\s*=\s*"application\/ld\+json"/i.test(content);
    if (!hasJsonLd) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "medium",
        detail: "No JSON-LD structured data in body — schema injection may have failed",
      });
    } else {
      // Schema-type mismatch: extract @type values and compare to URL rules.
      const typeMatches = [...content.matchAll(/"@type"\s*:\s*"([^"]+)"/gi)].map((m) => m[1]);
      for (const rule of SCHEMA_URL_RULES) {
        if (!rule.pattern.test(`/blog/${p.slug}`)) continue;
        const wrong = typeMatches.filter((t) => !rule.allowedTypes.includes(t));
        if (wrong.length > 0 && typeMatches.length > 0) {
          pushIssue(issues, bySeverity, {
            slug,
            title,
            severity: "medium",
            detail: `Schema @type "${wrong.join(", ")}" doesn't fit URL pattern (expected: ${rule.allowedTypes.join("|")})`,
          });
        }
      }
    }

    // Soft 404: thin content with error-like patterns.
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    if (wordCount < 200) {
      const matchedPatterns = SOFT_404_PATTERNS.filter((re) => re.test(content));
      if (matchedPatterns.length > 0 || wordCount < 50) {
        pushIssue(issues, bySeverity, {
          slug,
          title,
          severity: "critical",
          detail: `Soft 404: ${wordCount} words${matchedPatterns.length > 0 ? " + error-like patterns" : ""}`,
        });
      }
    }

    // Stale lastmod proxy: if updated_at is older than created_at + 30d AND
    // the article has SEO score issues, sitemap probably isn't telling Google
    // to re-crawl. (Real check needs sitemap cache lookup — that's a Batch 6
    // enrichment.)
    const ageDays = (Date.now() - p.created_at.getTime()) / 86400000;
    const sinceUpdateDays = (Date.now() - p.updated_at.getTime()) / 86400000;
    if (ageDays > 30 && sinceUpdateDays > 30 && wordCount < 500) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "low",
        detail: `${Math.floor(sinceUpdateDays)}d since last update on a thin article — sitemap won't trigger re-crawl`,
      });
    }
  }

  return {
    name: "seoUpdates",
    score: scoreFromIssues(bySeverity),
    issuesCount: issues.length,
    bySeverity,
    top: topIssues(issues),
    nextAction:
      bySeverity.critical > 0
        ? "Run content-auto-fix Section 12 — unpublishes soft 404s. Then run dates_audit and dedup meta descriptions via seo-deep-review."
        : bySeverity.high > 0
          ? "Run seo-deep-review — rewrites thin meta descriptions, fixes redirect chains via canonical_slug normalization. For Arabic mismatches, regenerate content_ar via daily-content-generate."
          : bySeverity.medium > 0
            ? "Run seo-agent — handles meta length trimming and schema injection in batch"
            : "Technical SEO is clean",
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Dimension 5: AIO alignment (citability for AI Overviews + ChatGPT/Perplexity)
// ───────────────────────────────────────────────────────────────────────────
//
// AI Overviews now show in 30-60% of US searches. Organic CTR drops 61% on
// queries that show one. Articles that fit AIO citation patterns recover that
// loss by getting cited inside the AI answer.
//
// Citation-friendly patterns (from Princeton GEO research + standards.ts):
//   - Direct answer in the first 80 words
//   - Question-format H2 headings (matches conversational queries)
//   - Statistics with specific numbers (+37% citation lift)
//   - Source attributions (+30% citation lift)
//   - Self-contained paragraphs of 40-200 words

// Strip markup and collapse whitespace so we can measure real reader-facing
// length, not character count of HTML.
function stripHtml(s: string): string {
  return s
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// First N words of plain-text content (used to grade the answer-first opener).
function firstWords(plain: string, n: number): string {
  const words = plain.split(/\s+/).filter(Boolean).slice(0, n);
  return words.join(" ");
}

// Heuristic for "looks like a direct answer": the opening contains a complete
// declarative sentence with a noun + verb pattern, AND it isn't a generic AI
// preamble. Imperfect but practical — the alternative (LLM grading) is too
// expensive at scale.
function looksLikeDirectAnswer(opener: string): boolean {
  if (opener.length < 40) return false;
  // Reject openers that start with a generic preamble pattern.
  const preambles = [
    /^welcome\b/i,
    /^are you\b/i,
    /^have you ever\b/i,
    /^if you('|')?re\b/i,
    /^whether you('|')?re\b/i,
    /^when it comes to\b/i,
    /^in this (article|post|guide|comprehensive)\b/i,
    /^let('|')?s (dive|explore|talk)\b/i,
    /^picture this\b/i,
    /^imagine\b/i,
  ];
  for (const re of preambles) if (re.test(opener.trim())) return false;
  // Look for a basic subject-verb structure in the first sentence.
  const firstSentence = opener.split(/[.!?]/)[0] || "";
  return /\b(is|are|was|were|has|have|costs?|takes?|offers?|provides?|sits?|lies?|opens?|closes?|requires?)\b/i.test(
    firstSentence,
  );
}

const QUESTION_H2_PATTERNS = [
  /^how\s+/i,
  /^what\s+/i,
  /^why\s+/i,
  /^when\s+/i,
  /^where\s+/i,
  /^who\s+/i,
  /^which\s+/i,
  /^is\s+/i,
  /^are\s+/i,
  /^can\s+/i,
  /^should\s+/i,
  /^do\s+/i,
  /^does\s+/i,
];

function auditAioAlignment(posts: ArticleRow[]): DimensionResult {
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
    const content = p.content_en || "";
    const plain = stripHtml(content);

    if (plain.length < 200) continue; // soft-404 territory — handled by SEO dim

    // Check 1: answer-first opener.
    const opener = firstWords(plain, 80);
    if (!looksLikeDirectAnswer(opener)) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "high",
        detail: `First 80 words don't read as a direct answer (starts: "${opener.slice(0, 60)}...")`,
      });
    }

    // Check 2: question-format H2 count.
    const h2Texts = [...content.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => stripHtml(m[1]));
    const questionH2s = h2Texts.filter((t) => QUESTION_H2_PATTERNS.some((re) => re.test(t.trim())));
    if (h2Texts.length >= 3 && questionH2s.length < 2) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "medium",
        detail: `Only ${questionH2s.length}/${h2Texts.length} H2s are question-format — AI Overviews favor Q&A structure`,
      });
    }

    // Check 3: statistics density. Real numbers beat vague adjectives in
    // citation context. Per Princeton GEO study: stats lift visibility +37%.
    const statMatches = [
      ...plain.matchAll(/\b\d+(?:[.,]\d+)?\s*(?:%|percent|million|billion|users?|visitors?|reviews?|stars?)\b/gi),
      ...plain.matchAll(/[£$€]\s*\d/g),
      ...plain.matchAll(/\b\d{4}\s*(?:guests?|seats?|rooms?|members?)\b/gi),
    ];
    if (statMatches.length < 2 && plain.length > 800) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "medium",
        detail: `Only ${statMatches.length} concrete stat(s) in ${Math.floor(plain.length / 5)} word article — add 2+ for AIO citability`,
      });
    }

    // Check 4: source attributions. Phrases that signal "we're citing" make
    // the article more likely to be cited in turn (+30% per Princeton).
    const attributionPatterns = [
      /\baccording to\b/i,
      /\bdata from\b/i,
      /\bresearch by\b/i,
      /\bas reported by\b/i,
      /\bsource:\s*[A-Z]/i,
      /\bcited by\b/i,
      /\b(transport for london|tfl|bbc|reuters|associated press|gov\.uk|government|office for national statistics|ons)\b/i,
    ];
    let attributions = 0;
    for (const re of attributionPatterns) if (re.test(plain)) attributions++;
    if (attributions === 0 && plain.length > 1000) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "low",
        detail: "No source attributions — citing authoritative sources lifts AIO visibility +30%",
      });
    }

    // Check 5: self-contained paragraph structure. Walls of text don't get
    // cited. Sweet spot: 40-200 words per paragraph.
    const paragraphs = content
      .split(/<\/?p[^>]*>/gi)
      .map((p) => stripHtml(p))
      .filter((p) => p.length > 30);
    const wellSized = paragraphs.filter((p) => {
      const w = p.split(/\s+/).filter(Boolean).length;
      return w >= 40 && w <= 200;
    });
    if (paragraphs.length >= 5 && wellSized.length / paragraphs.length < 0.3) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "low",
        detail: `Only ${wellSized.length}/${paragraphs.length} paragraphs in citation-friendly 40-200 word range`,
      });
    }
  }

  return {
    name: "aioAlignment",
    score: scoreFromIssues(bySeverity),
    issuesCount: issues.length,
    bySeverity,
    top: topIssues(issues),
    nextAction:
      bySeverity.high > 0
        ? "Run seo-deep-review — rewrites article openers to lead with the direct answer (Princeton GEO pattern)"
        : bySeverity.medium > 0
          ? "Refresh content via daily-content-generate with explicit question-H2 + stats prompts"
          : "AIO alignment is healthy",
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Dimension 6: Affiliate practices (FTC compliance + on-page hygiene)
// ───────────────────────────────────────────────────────────────────────────
//
// Bundles three Tier-2 blind spots:
//   - rel + disclosure + anchor variety        (per-article hygiene)
//   - Dead CJ programs                         (cross-ref CjAdvertiser status)
//   - Anchor-text concentration                (sitewide over-optimization)
//
// Outbound link health (#12) is HTTP-bound and lives in Batch 8 where we have
// async execution budget. The static signals we collect here are accurate
// enough to guide most fixes.

const AFFILIATE_PARTNER_HOSTS = [
  "anrdoezrs.net",
  "tkqlhce.com",
  "jdoqocy.com",
  "kqzyfj.com",
  "click.linksynergy.com",
  "stay22.com",
  "letmeallez.com",
  "tp.media",
  "tp-em.com",
  "travelpayouts.com",
  "booking.com",
  "vrbo.com",
  "expedia.com",
  "agoda.com",
  "hotellook.com",
  "getyourguide.com",
  "viator.com",
  "klook.com",
  "tiqets.com",
];

const DISCLOSURE_HINT_PATTERNS = [
  /\baffiliate\s+(?:link|disclosure)\b/i,
  /\bcommission\b/i,
  /\bearn\s+(?:a|small)\s+commission\b/i,
  /\bpartner\s+with\b/i,
  /\bdisclosure\b/i,
];

const GENERIC_ANCHOR_TEXT = [
  /^click here$/i,
  /^this link$/i,
  /^check it out$/i,
  /^learn more$/i,
  /^read more$/i,
  /^here$/i,
  /^link$/i,
  /^website$/i,
];

interface AffiliateLinkRef {
  href: string;
  hostname: string;
  rel: string;
  anchorText: string;
  isAffiliate: boolean;
  isAffiliateClickRedirect: boolean;
}

function extractLinks(content: string): AffiliateLinkRef[] {
  const out: AffiliateLinkRef[] = [];
  const anchorRe = /<a\s+([^>]*?)>([\s\S]*?)<\/a>/gi;
  for (const m of content.matchAll(anchorRe)) {
    const attrs = m[1] || "";
    const inner = stripHtml(m[2] || "").trim();
    const hrefMatch = /\bhref\s*=\s*"([^"]+)"/i.exec(attrs);
    const relMatch = /\brel\s*=\s*"([^"]+)"/i.exec(attrs);
    if (!hrefMatch) continue;
    const href = hrefMatch[1];
    let hostname = "";
    let isAffiliateClickRedirect = false;
    try {
      // Allow relative URLs to be detected as affiliate-click redirects too.
      if (href.startsWith("/api/affiliate/click")) {
        isAffiliateClickRedirect = true;
        hostname = "internal";
      } else {
        const u = new URL(href);
        hostname = u.hostname.toLowerCase().replace(/^www\./, "");
      }
    } catch {
      continue;
    }
    const isAffiliate = isAffiliateClickRedirect || AFFILIATE_PARTNER_HOSTS.some((h) => hostname.includes(h));
    out.push({
      href,
      hostname,
      rel: relMatch ? relMatch[1] : "",
      anchorText: inner,
      isAffiliate,
      isAffiliateClickRedirect,
    });
  }
  return out;
}

interface DeadAdvertiserSet {
  // Lowercased advertiser names whose CJ status is DECLINED, CANCELLED, etc.
  names: Set<string>;
  // Lowercased advertiser hostnames (programUrl host) for the same.
  hostnames: Set<string>;
}

async function loadDeadAdvertisers(): Promise<DeadAdvertiserSet> {
  const dead: DeadAdvertiserSet = {
    names: new Set<string>(),
    hostnames: new Set<string>(),
  };
  try {
    const advertisers = await prisma.cjAdvertiser.findMany({
      // AdvertiserStatus enum: JOINED | PENDING | NOT_JOINED | DECLINED
      where: { status: { in: ["DECLINED", "NOT_JOINED"] } },
      select: { name: true, programUrl: true },
      take: 500,
    });
    for (const a of advertisers) {
      if (a.name) dead.names.add(a.name.toLowerCase().trim());
      if (a.programUrl) {
        try {
          const u = new URL(a.programUrl);
          dead.hostnames.add(u.hostname.toLowerCase().replace(/^www\./, ""));
        } catch {
          /* not a URL — name match still works */
        }
      }
    }
  } catch {
    // CJ tables may not exist on every site or migration may be pending. Don't
    // crash the audit — return an empty set and let the caller carry on.
  }
  return dead;
}

function auditAffiliatePractices(posts: ArticleRow[], dead: DeadAdvertiserSet): DimensionResult {
  const issues: Issue[] = [];
  const bySeverity: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  // Sitewide anchor-concentration map: "anchor text → href" → article slugs.
  // Anything > 10 articles using the same anchor for the same href is an
  // over-optimization signal Google's spam team flags.
  const anchorMap = new Map<string, string[]>();

  for (const p of posts) {
    const slug = p.slug;
    const title = (p.title_en || "").slice(0, 80);
    const content = p.content_en || "";
    const links = extractLinks(content);
    const affiliateLinks = links.filter((l) => l.isAffiliate);
    const partners = new Set<string>();

    for (const link of affiliateLinks) {
      partners.add(link.hostname);

      // Per-article: rel attribute compliance.
      const rel = link.rel.toLowerCase();
      if (!link.isAffiliateClickRedirect && !(rel.includes("sponsored") && rel.includes("noopener"))) {
        pushIssue(issues, bySeverity, {
          slug,
          title,
          severity: "high",
          detail: `Affiliate link to ${link.hostname} missing rel="noopener sponsored" (FTC + SEO)`,
        });
      }

      // Per-article: generic anchor text ("click here").
      if (link.anchorText && GENERIC_ANCHOR_TEXT.some((re) => re.test(link.anchorText))) {
        pushIssue(issues, bySeverity, {
          slug,
          title,
          severity: "medium",
          detail: `Generic anchor "${link.anchorText}" on affiliate link — descriptive anchor text helps both SEO and conversion`,
        });
      }

      // Sitewide: feed the anchor concentration map.
      const anchorKey = `${link.anchorText.toLowerCase().trim()}|${link.href}`;
      if (link.anchorText.length > 0 && link.anchorText.length < 80) {
        const existing = anchorMap.get(anchorKey) || [];
        existing.push(slug);
        anchorMap.set(anchorKey, existing);
      }

      // Per-article: dead CJ program cross-ref.
      const dataAdvertiserMatch = /\bdata-advertiser\s*=\s*"([^"]+)"/i.exec(
        content.slice(content.indexOf(link.href) - 200, content.indexOf(link.href) + 400),
      );
      const advertiserName = dataAdvertiserMatch?.[1]?.toLowerCase().trim();
      if (advertiserName && dead.names.has(advertiserName)) {
        pushIssue(issues, bySeverity, {
          slug,
          title,
          severity: "critical",
          detail: `Affiliate link to "${advertiserName}" — CJ program is DECLINED/CANCELLED, link earns $0`,
        });
      } else if (dead.hostnames.has(link.hostname)) {
        pushIssue(issues, bySeverity, {
          slug,
          title,
          severity: "critical",
          detail: `Affiliate link to ${link.hostname} — partner program is dead, link earns $0`,
        });
      }
    }

    // Per-article: disclosure paragraph required when affiliates present.
    if (affiliateLinks.length > 0) {
      const hasDisclosure = DISCLOSURE_HINT_PATTERNS.some((re) => re.test(content));
      if (!hasDisclosure) {
        pushIssue(issues, bySeverity, {
          slug,
          title,
          severity: "critical",
          detail: `${affiliateLinks.length} affiliate link(s) but no disclosure paragraph (FTC violation)`,
        });
      }
    }

    // Per-article: single-partner concentration (>80% from same partner).
    if (affiliateLinks.length >= 5 && partners.size === 1) {
      pushIssue(issues, bySeverity, {
        slug,
        title,
        severity: "low",
        detail: `${affiliateLinks.length} affiliate links all to ${[...partners][0]} — diversify partners for resilience`,
      });
    }
  }

  // Sitewide anchor concentration check (#7).
  for (const [anchorKey, slugs] of anchorMap) {
    if (slugs.length < 10) continue;
    const [anchorText, href] = anchorKey.split("|");
    const sample = slugs.slice(0, 5).join(", ");
    pushIssue(issues, bySeverity, {
      slug: slugs[0],
      title: anchorText,
      severity: "high",
      detail: `Anchor "${anchorText}" used ${slugs.length}x pointing to ${href} — over-optimization risk. Affected: ${sample}${slugs.length > 5 ? "..." : ""}`,
    });
  }

  return {
    name: "affiliatePractices",
    score: scoreFromIssues(bySeverity),
    issuesCount: issues.length,
    bySeverity,
    top: topIssues(issues, 15),
    nextAction:
      bySeverity.critical > 0
        ? "Run affiliate_link_health MCP tool — confirms dead programs. Run affiliate-injection cron to swap dead links to live partners. Add disclosure paragraph via content-auto-fix or template update."
        : bySeverity.high > 0
          ? "Run seo-agent or affiliate-injection — fixes rel attributes in batch. Diversify anchor text via manual edits."
          : bySeverity.medium > 0
            ? "Manual: rewrite generic anchor text to descriptive keyphrases on the affected articles."
            : "Affiliate practices look clean",
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
    const result = await runPublicAudit(siteId, sample);
    return NextResponse.json({
      success: true,
      ...result,
      durationMs: Date.now() - start,
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

// ───────────────────────────────────────────────────────────────────────────
// Public exports — used by the route above AND the platform-control MCP
// (`public_audit` tool) so both surfaces produce identical reports without
// HTTP round-tripping.
// ───────────────────────────────────────────────────────────────────────────

export interface PublicAuditReport {
  site: string;
  generatedAt: string;
  totalArticlesScanned: number;
  overallScore: number;
  overallGrade: "A" | "B" | "C" | "D" | "F";
  topActions: Array<{
    dimension: string;
    severity: Severity;
    detail: string;
    affectedSlug: string;
    nextAction: string;
  }>;
  plainLanguageSummary: string;
  dimensions: Record<string, DimensionResult>;
  _format: "yalla-public-audit-v1";
}

export async function runPublicAudit(siteId: string, sample = 500): Promise<PublicAuditReport> {
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
      canonical_slug: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: { created_at: "desc" },
    take: Math.min(Math.max(sample, 50), 1000),
  })) as ArticleRow[];

  const [sitewide, deadAdvertisers] = await Promise.all([
    Promise.resolve(buildSitewideContext(posts)),
    loadDeadAdvertisers(),
  ]);

  const dimensions: Record<string, DimensionResult> = {
    photos: auditPhotos(posts),
    unedited: auditUnedited(posts),
    newsRefresh: auditNewsRefresh(posts),
    seoUpdates: auditSeoUpdates(posts, sitewide),
    aioAlignment: auditAioAlignment(posts),
    affiliatePractices: auditAffiliatePractices(posts, deadAdvertisers),
  };

  // Overall score: simple average of the 6 dimension scores. Equal weighting
  // because each dimension represents a distinct failure mode — one bad
  // dimension shouldn't be drowned out by 5 good ones.
  const dimList = Object.values(dimensions);
  const overallScore = Math.round(dimList.reduce((sum, d) => sum + d.score, 0) / dimList.length);
  const overallGrade: PublicAuditReport["overallGrade"] =
    overallScore >= 90 ? "A" : overallScore >= 80 ? "B" : overallScore >= 70 ? "C" : overallScore >= 60 ? "D" : "F";

  // Top actions: take the highest-severity issue from each dimension that has
  // criticals or highs, ranked by severity. Caps at 12 so the surfacing
  // surface stays scannable on a phone.
  const sevOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const topActions: PublicAuditReport["topActions"] = [];
  for (const [name, dim] of Object.entries(dimensions)) {
    for (const issue of dim.top) {
      if (issue.severity !== "critical" && issue.severity !== "high") continue;
      topActions.push({
        dimension: name,
        severity: issue.severity,
        detail: issue.detail,
        affectedSlug: issue.slug,
        nextAction: dim.nextAction,
      });
    }
  }
  topActions.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
  const cappedActions = topActions.slice(0, 12);

  // Plain-language summary for the iPhone view.
  const totalCritical = dimList.reduce((s, d) => s + d.bySeverity.critical, 0);
  const totalHigh = dimList.reduce((s, d) => s + d.bySeverity.high, 0);
  const worst = dimList.reduce((a, b) => (a.score < b.score ? a : b));
  const best = dimList.reduce((a, b) => (a.score > b.score ? a : b));
  const plainLanguageSummary =
    totalCritical === 0 && totalHigh === 0
      ? `Site looks healthy across all 6 dimensions. Overall grade ${overallGrade} (${overallScore}/100). Best: ${best.name}. No critical or high issues found.`
      : `Overall grade ${overallGrade} (${overallScore}/100). ${totalCritical} critical and ${totalHigh} high-severity issues across ${posts.length} published articles. Worst dimension: ${worst.name} (${worst.score}/100). Top action: ${cappedActions[0]?.nextAction || "No fixes available"}.`;

  return {
    site: siteId,
    generatedAt: new Date().toISOString(),
    totalArticlesScanned: posts.length,
    overallScore,
    overallGrade,
    topActions: cappedActions,
    plainLanguageSummary,
    dimensions,
    _format: "yalla-public-audit-v1",
  };
}
