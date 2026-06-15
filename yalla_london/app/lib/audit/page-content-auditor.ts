/**
 * Per-Page Content Auditor (static layer)
 * ----------------------------------------
 * Analyzes a published article's stored HTML (content_en) + DB context and
 * produces a per-dimension scorecard. This is the STATIC layer of the two-layer
 * page audit — everything here is extractable from HTML/DB without rendering:
 *
 *   links         — broken internal links, link counts, affiliate routing
 *   images        — alt text, CLS-safe dimensions, format, broken/placeholder src
 *   fonts         — inline font overrides that break the design system
 *   seo           — title/meta length, H1 dupes, heading hierarchy, keyword placement
 *   aio           — answer capsule, question H2s, Key Takeaways, FAQ, stats, tables
 *   internalLinks — outbound count, anchor-text quality, orphan (inbound) status
 *   ctas          — affiliate/booking CTA presence + distribution + disclosure
 *
 * The RENDERED layer (visual alignment, font rendering, CLS, mobile) is handled
 * separately by the Chrome Bridge / PageSpeed integration — see auditPageVisual()
 * placeholder at the bottom and docs/chrome-audits/PLAYBOOK.md.
 *
 * Pure functions, zero DB calls — the caller passes the context it has already
 * fetched (published slug set + inbound-link counts) so this stays O(1) per page
 * and can run across the whole site in a single audit pass.
 */

export type AuditSeverity = "critical" | "warning" | "info";

export interface PageAuditIssue {
  dimension: AuditDimension;
  severity: AuditSeverity;
  message: string;
}

export type AuditDimension = "links" | "images" | "fonts" | "seo" | "aio" | "internalLinks" | "ctas";

export interface PageScorecard {
  overall: number; // 0-100 weighted
  dimensions: Record<AuditDimension, number>; // 0-100 each
  issues: PageAuditIssue[];
  signals: Record<string, number | boolean>; // raw counts for the dashboard
}

export interface AuditInput {
  slug: string;
  contentEn: string | null;
  titleEn: string | null;
  metaTitleEn: string | null;
  metaDescriptionEn: string | null;
  featuredImage?: string | null;
  keyword?: string | null; // focus keyword (falls back to slug words)
}

export interface AuditContext {
  /** Slugs that are published AND canonical (a link to anything else is broken/redirected). */
  liveSlugs: Set<string>;
  /** Slugs that exist but redirect (canonical_slug set) — links here should be updated. */
  redirectedSlugs: Set<string>;
  /** How many published articles link TO this slug (for orphan detection). */
  inboundCount: number;
  /** Known affiliate partner hosts (for CTA / affiliate routing checks). */
  partnerHosts?: RegExp;
}

const DEFAULT_PARTNER_HOSTS =
  /(booking\.com|expedia\.|hotels\.com|agoda\.|getyourguide\.|viator\.|thefork\.|opentable\.|tripadvisor\.|stubhub\.|blacklane\.|welcomepickups\.|tiqets\.|ticketnetwork\.|klook\.|skyscanner\.|halalbooking\.|vrbo\.|stay22\.|travelpayouts\.|tp\.media|axs\.|ticketmaster\.)/i;

const GENERIC_ANCHORS = /^(click here|read more|here|learn more|this|link|more|read this)$/i;

const DIMENSION_WEIGHTS: Record<AuditDimension, number> = {
  seo: 0.2,
  aio: 0.18,
  links: 0.16,
  internalLinks: 0.14,
  images: 0.14,
  ctas: 0.12,
  fonts: 0.06,
};

function wordsFromSlug(slug: string): string[] {
  return slug
    .replace(/-v\d+.*$/i, "")
    .split("-")
    .filter((w) => w.length > 2 && !/^\d+$/.test(w));
}

/** Clamp to 0-100 and round. */
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function auditPageContent(input: AuditInput, ctx: AuditContext): PageScorecard {
  const html = input.contentEn || "";
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const lower = html.toLowerCase();
  const issues: PageAuditIssue[] = [];
  const partnerHosts = ctx.partnerHosts || DEFAULT_PARTNER_HOSTS;
  const add = (dimension: AuditDimension, severity: AuditSeverity, message: string) =>
    issues.push({ dimension, severity, message });

  // ── Extract anchors once ──────────────────────────────────────────────────
  const anchors = [...html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis)].map((m) => ({
    href: m[1],
    anchorText: m[2].replace(/<[^>]+>/g, "").trim(),
    raw: m[0],
  }));
  const internalAnchors = anchors.filter((a) => a.href.startsWith("/") && !a.href.startsWith("//"));
  const blogAnchors = internalAnchors.filter((a) => /\/blog\//.test(a.href));
  const affiliateAnchors = anchors.filter(
    (a) =>
      /\/api\/affiliate\/click/.test(a.href) || partnerHosts.test(a.href) || /rel=["'][^"']*sponsored/i.test(a.raw),
  );

  // ── Extract images once ───────────────────────────────────────────────────
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);

  // ════════════════════════════ 1. LINKS ════════════════════════════════════
  let linksScore = 100;
  let brokenInternal = 0;
  let redirectedInternal = 0;
  for (const a of blogAnchors) {
    const m = a.href.match(/\/blog\/([^/?#]+)/);
    if (!m) continue;
    const target = m[1];
    if (target === input.slug) continue; // self-link, harmless
    if (ctx.redirectedSlugs.has(target)) {
      redirectedInternal++;
    } else if (!ctx.liveSlugs.has(target)) {
      brokenInternal++;
    }
  }
  if (brokenInternal > 0) {
    linksScore -= brokenInternal * 25;
    add("links", "critical", `${brokenInternal} broken internal link(s) — target page does not exist`);
  }
  if (redirectedInternal > 0) {
    linksScore -= redirectedInternal * 8;
    add(
      "links",
      "warning",
      `${redirectedInternal} internal link(s) point to a redirected page — update to the live URL`,
    );
  }
  // placeholder / hallucinated link slugs
  if (/\/blog\/(topic[-_]slug|example|insert|tbd|placeholder)\b/i.test(html)) {
    linksScore -= 20;
    add("links", "critical", "Placeholder link slug (TOPIC_SLUG / example) left in content");
  }

  // ═══════════════════════════ 2. IMAGES ═════════════════════════════════════
  let imagesScore = 100;
  let missingAlt = 0;
  let missingDims = 0;
  let nonWebp = 0;
  let brokenImg = 0;
  for (const img of imgs) {
    const alt = img.match(/\balt=["']([^"']*)["']/i);
    if (!alt || !alt[1].trim()) missingAlt++;
    const hasDims = /\b(width|height)=/.test(img) || /aspect-ratio|width\s*:\s*100%/.test(img);
    if (!hasDims) missingDims++;
    const src = img.match(/\bsrc=["']([^"']+)["']/i)?.[1] || "";
    if (!src || /TOPIC_SLUG|example\.com|placeholder|\[/.test(src)) brokenImg++;
    else if (!/\.webp|fm=webp/i.test(src) && /\.(jpe?g|png)\b/i.test(src)) nonWebp++;
  }
  if (imgs.length === 0) {
    imagesScore -= 40;
    add("images", "warning", "No images in body content — articles with imagery rank and convert better");
  }
  if (!input.featuredImage) {
    imagesScore -= 20;
    add("images", "warning", "No featured image (used for OG/social cards + listing thumbnails)");
  }
  if (brokenImg > 0) {
    imagesScore -= brokenImg * 25;
    add("images", "critical", `${brokenImg} broken/placeholder image source(s)`);
  }
  if (missingAlt > 0) {
    imagesScore -= missingAlt * 12;
    add("images", "warning", `${missingAlt} image(s) missing alt text (accessibility + image SEO)`);
  }
  if (missingDims > 0) {
    imagesScore -= missingDims * 6;
    add("images", "info", `${missingDims} image(s) without width/height or aspect-ratio — risks layout shift (CLS)`);
  }
  if (nonWebp > 0) {
    imagesScore -= nonWebp * 3;
    add("images", "info", `${nonWebp} non-WebP image(s) — convert for faster LCP`);
  }

  // ═══════════════════════════ 3. FONTS ══════════════════════════════════════
  // True font rendering needs the browser layer; here we catch inline overrides
  // that break the site's design-system typography (the common content-pipeline bug).
  let fontsScore = 100;
  const inlineFontFamily = (html.match(/style=["'][^"']*font-family/gi) || []).length;
  const inlineFontSize = (html.match(/style=["'][^"']*font-size/gi) || []).length;
  if (inlineFontFamily > 0) {
    fontsScore -= Math.min(40, inlineFontFamily * 10);
    add("fonts", "warning", `${inlineFontFamily} inline font-family override(s) — breaks design-system typography`);
  }
  if (inlineFontSize > 2) {
    fontsScore -= Math.min(20, (inlineFontSize - 2) * 4);
    add("fonts", "info", `${inlineFontSize} inline font-size override(s) — prefer heading tags for hierarchy`);
  }

  // ════════════════════════════ 4. SEO ═══════════════════════════════════════
  let seoScore = 100;
  const titleLen = (input.metaTitleEn || input.titleEn || "").length;
  const descLen = (input.metaDescriptionEn || "").length;
  if (titleLen < 30 || titleLen > 60) {
    seoScore -= 12;
    add("seo", titleLen === 0 ? "critical" : "warning", `Meta title ${titleLen} chars (target 30-60)`);
  }
  if (descLen < 120 || descLen > 160) {
    seoScore -= 12;
    add("seo", descLen === 0 ? "critical" : "warning", `Meta description ${descLen} chars (target 120-160)`);
  }
  const bodyH1 = (html.match(/<h1\b/gi) || []).length;
  if (bodyH1 > 0) {
    seoScore -= 15;
    add("seo", "warning", `${bodyH1} <h1> in body — the page template already renders the H1 (duplicate H1)`);
  }
  const h2s = [...html.matchAll(/<h2\b[^>]*>(.*?)<\/h2>/gis)].map((m) => m[1].replace(/<[^>]+>/g, "").trim());
  if (h2s.length < 3) {
    seoScore -= 12;
    add("seo", "warning", `Only ${h2s.length} H2 sections (target 4-8 for topical depth)`);
  }
  // skipped heading levels (h2 -> h4 with no h3)
  if (/<h4\b/i.test(html) && !/<h3\b/i.test(html)) {
    seoScore -= 6;
    add("seo", "info", "Heading hierarchy skips a level (H2 → H4 with no H3)");
  }
  // keyword placement
  const kw = (input.keyword || wordsFromSlug(input.slug).join(" ")).toLowerCase();
  const kwTokens = kw.split(/\s+/).filter((w) => w.length > 2);
  const firstPara = (html.match(/<p\b[^>]*>(.*?)<\/p>/is)?.[1] || "").replace(/<[^>]+>/g, " ").toLowerCase();
  const kwInTitle = kwTokens.some((t) => (input.titleEn || "").toLowerCase().includes(t));
  const kwInFirst = kwTokens.some((t) => firstPara.includes(t));
  const kwInH2 = h2s.some((h) => kwTokens.some((t) => h.toLowerCase().includes(t)));
  if (!kwInTitle) {
    seoScore -= 8;
    add("seo", "warning", "Focus keyword not in title");
  }
  if (!kwInFirst) {
    seoScore -= 6;
    add("seo", "info", "Focus keyword not in the first paragraph");
  }
  if (!kwInH2) {
    seoScore -= 4;
    add("seo", "info", "Focus keyword not in any H2");
  }

  // ════════════════════════════ 5. AIO ═══════════════════════════════════════
  let aioScore = 100;
  const hasCapsule = /class=["'][^"']*answer-capsule|quick answer:/i.test(lower.slice(0, 1200));
  const questionH2s = h2s.filter((h) => h.includes("?")).length;
  const hasKeyTakeaways = /key takeaways|quick summary|tl;dr|at a glance/i.test(lower);
  const hasFaq = /frequently asked questions|<h2[^>]*>\s*faq\b|people also ask/i.test(lower);
  const statCount = (
    text.match(/(£|\$|€)\s?\d|\b\d+(\.\d+)?\s?(%|stars?|minutes?|hours?|km|miles?|metres?|m\b)/gi) || []
  ).length;
  const hasTable = /<table\b|^\s*\|.*\|/im.test(html);
  if (!hasCapsule && questionH2s === 0) {
    aioScore -= 18;
    add("aio", "warning", "No answer capsule or question-format H2 — weak AI Overview / featured-snippet eligibility");
  }
  if (!hasKeyTakeaways) {
    aioScore -= 14;
    add("aio", "warning", "No 'Key Takeaways' / summary block (AI Overviews lift these)");
  }
  if (!hasFaq) {
    aioScore -= 12;
    add("aio", "info", "No FAQ section — misses People-Also-Ask + long-tail capture");
  }
  if (statCount < 3) {
    aioScore -= 10;
    add("aio", "info", `Only ${statCount} concrete data point(s) — AI engines cite content with stats`);
  }
  if (!hasTable && /\b(vs|versus|compare|comparison|best|top \d)\b/i.test(input.slug)) {
    aioScore -= 8;
    add("aio", "info", "Comparison/list page without a table — AI engines extract tables for side-by-side answers");
  }

  // ═══════════════════════ 6. INTERNAL LINKS (backlinks) ═════════════════════
  let internalScore = 100;
  const outbound = internalAnchors.length;
  if (outbound < 3) {
    internalScore -= (3 - outbound) * 15;
    add("internalLinks", "warning", `Only ${outbound} outbound internal link(s) (target 3+)`);
  }
  const genericAnchors = internalAnchors.filter((a) => GENERIC_ANCHORS.test(a.anchorText)).length;
  if (genericAnchors > 0) {
    internalScore -= genericAnchors * 8;
    add(
      "internalLinks",
      "info",
      `${genericAnchors} generic anchor(s) ("click here"/"read more") — use descriptive, keyword-rich anchors`,
    );
  }
  if (ctx.inboundCount === 0) {
    internalScore -= 30;
    add("internalLinks", "warning", "Orphan page — no other article links to it (no inbound internal links)");
  } else if (ctx.inboundCount === 1) {
    internalScore -= 10;
    add(
      "internalLinks",
      "info",
      "Only 1 inbound internal link — add links from related authority pages to help it rank",
    );
  }

  // ════════════════════════════ 7. CTAs ══════════════════════════════════════
  let ctasScore = 100;
  const affiliateCount = affiliateAnchors.length;
  const hasDisclosure =
    /affiliate (link|commission|partner|disclosure)|we may earn|at no extra cost|affiliate-disclosure/i.test(lower);
  if (affiliateCount === 0) {
    ctasScore -= 30;
    add("ctas", "warning", "No affiliate/booking CTA — page earns nothing from its traffic");
  } else {
    // distribution: at least one CTA in the top half of the document
    const half = Math.floor(html.length / 2);
    const ctaInTopHalf = affiliateAnchors.some((a) => html.indexOf(a.raw) < half);
    if (!ctaInTopHalf) {
      ctasScore -= 15;
      add("ctas", "info", "All CTAs are in the bottom half — add one earlier where intent is high");
    }
    if (!hasDisclosure) {
      ctasScore -= 25;
      add("ctas", "critical", "Affiliate links present but NO FTC disclosure paragraph");
    }
  }

  // ── Roll up ────────────────────────────────────────────────────────────────
  const dimensions: Record<AuditDimension, number> = {
    links: clamp(linksScore),
    images: clamp(imagesScore),
    fonts: clamp(fontsScore),
    seo: clamp(seoScore),
    aio: clamp(aioScore),
    internalLinks: clamp(internalScore),
    ctas: clamp(ctasScore),
  };
  const overall = clamp(
    (Object.keys(dimensions) as AuditDimension[]).reduce((sum, d) => sum + dimensions[d] * DIMENSION_WEIGHTS[d], 0),
  );

  return {
    overall,
    dimensions,
    issues,
    signals: {
      internalOutbound: outbound,
      inbound: ctx.inboundCount,
      brokenInternal,
      affiliateCtas: affiliateCount,
      images: imgs.length,
      missingAlt,
      questionH2s,
      hasCapsule,
      hasKeyTakeaways,
      hasFaq,
      statCount,
      titleLen,
      descLen,
    },
  };
}

/**
 * Build the inbound-link count map for a whole site in ONE O(n) pass.
 * Scans every article's HTML for /blog/<slug> references and tallies targets.
 */
export function buildInboundCounts(posts: Array<{ slug: string; content_en: string | null }>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of posts) {
    const html = p.content_en || "";
    const seen = new Set<string>();
    for (const m of html.matchAll(/\/blog\/([a-z0-9][a-z0-9-]*)/gi)) {
      const target = m[1].toLowerCase();
      if (target === p.slug.toLowerCase() || seen.has(target)) continue;
      seen.add(target);
      counts.set(target, (counts.get(target) || 0) + 1);
    }
  }
  return counts;
}

/**
 * RENDERED VISUAL LAYER (placeholder / integration contract).
 *
 * Photo alignment, font rendering (FOUT/FOIT), real CLS, spacing, and mobile
 * responsiveness CANNOT be judged from HTML — they need a real browser. The
 * platform already has two ways to get this; this function documents the
 * contract so the per-page-audit endpoint can merge rendered findings when
 * available:
 *
 *   1. Chrome Bridge (Claude Chrome) — opens the live URL, inspects the rendered
 *      DOM + computed styles + screenshots, and POSTs findings to
 *      /api/admin/chrome-bridge/report (see docs/chrome-audits/PLAYBOOK.md).
 *   2. PageSpeed Insights (lib/performance/site-auditor.ts) — returns CLS, LCP,
 *      and Lighthouse "best practices" (image aspect-ratio, font-display) per URL.
 *
 * Visual audits are EXPENSIVE (one headless render each), so run them sampled /
 * on-demand for the highest-impression pages, not on every audit pass.
 */
export interface VisualAuditResult {
  cls: number | null; // cumulative layout shift (alignment/jank)
  lcpMs: number | null;
  fontDisplayOk: boolean | null; // font-display: swap present
  imageAspectRatioOk: boolean | null; // declared dimensions (no shift)
  screenshotUrl?: string;
  source: "chrome-bridge" | "pagespeed";
}
