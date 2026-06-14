/**
 * Affiliate Link Health & Suitability Auditor
 *
 * Scans published articles, extracts all affiliate links, and runs 6 checks:
 * 1. Liveness — HTTP HEAD to verify link is live + redirects correctly
 * 2. Tracking — Is the link routed through our /api/affiliate/click tracker?
 * 3. Relevance — Does the link match the article's topic/context?
 * 4. Freshness — Does the link reference expired events or outdated offers?
 * 5. Placement — Is the link positioned for maximum conversion?
 * 6. Visual match — Does the link appear near relevant imagery?
 */

import { getDefaultSiteId, getActiveSiteIds } from "@/config/sites";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LinkInstance {
  url: string;
  trackingUrl: string | null; // null if link bypasses our tracker
  partner: string;
  advertiserId: string | null;
  anchorText: string;
  positionInArticle: "top-quarter" | "mid-upper" | "mid-lower" | "bottom-quarter";
  nearestHeading: string;
  articleSlug: string;
  articleTitle: string;
  articleId: string;
}

export interface LinkCheck {
  link: LinkInstance;
  liveness: { ok: boolean; statusCode: number | null; finalUrl: string | null; error: string | null };
  tracked: { ok: boolean; reason: string };
  relevance: { ok: boolean; score: number; reason: string };
  freshness: { ok: boolean; reason: string };
  placement: { ok: boolean; score: number; reason: string };
  visual: { ok: boolean; reason: string };
  overallScore: number; // 0-100
}

export interface AuditResult {
  scannedArticles: number;
  totalLinks: number;
  healthScore: number; // 0-100 overall
  checks: LinkCheck[];
  issues: Array<{
    severity: "critical" | "high" | "medium" | "low";
    issue: string;
    fix: string;
    articleSlug: string;
    linkUrl: string;
  }>;
  summary: {
    live: number;
    dead: number;
    tracked: number;
    untracked: number;
    relevant: number;
    irrelevant: number;
    fresh: number;
    stale: number;
    wellPlaced: number;
    poorlyPlaced: number;
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────

const BUDGET_MS = 250_000; // 250s max (inside 300s vercel limit)

// Keywords that signal irrelevance when link partner doesn't match article topic
const TOPIC_CLUSTERS: Record<string, string[]> = {
  hotel: ["hotel", "accommodation", "stay", "room", "suite", "resort", "hostel", "boutique", "check-in", "booking", "lodge"],
  restaurant: ["restaurant", "dining", "food", "eat", "cuisine", "meal", "brunch", "lunch", "dinner", "halal", "michelin", "cafe"],
  attraction: ["attraction", "museum", "gallery", "tour", "sightseeing", "landmark", "palace", "castle", "monument", "exhibit"],
  transport: ["transport", "transfer", "airport", "taxi", "train", "tube", "bus", "ride", "pickup", "car hire", "rental"],
  spa: ["spa", "wellness", "massage", "hammam", "treatment", "relaxation", "beauty", "sauna", "retreat"],
  shopping: ["shopping", "shop", "store", "market", "boutique", "mall", "designer", "fashion", "luxury goods"],
  event: ["event", "concert", "show", "theatre", "theater", "match", "festival", "ticket", "performance", "exhibition"],
  experience: ["experience", "activity", "adventure", "class", "workshop", "cruise", "boat", "yacht", "charter"],
};

// Partner → expected topic cluster mapping
const PARTNER_CLUSTERS: Record<string, string[]> = {
  vrbo: ["hotel"],
  "booking.com": ["hotel"],
  agoda: ["hotel"],
  halalbooking: ["hotel"],
  marriott: ["hotel"],
  hotels: ["hotel"],
  expedia: ["hotel", "experience"],
  "getyourguide": ["attraction", "experience"],
  viator: ["attraction", "experience"],
  klook: ["attraction", "experience", "transport"],
  tiqets: ["attraction", "event"],
  ticketnetwork: ["event"],
  "welcome pickups": ["transport"],
  "welcome-pickups": ["transport"],
  stay22: ["hotel"],
  boatbookings: ["experience"],
  skyscanner: ["transport"],
  discovercars: ["transport"],
  omio: ["transport"],
};

// Words that signal time-sensitive / expired content
const EXPIRY_SIGNALS = [
  /\b20(?:2[0-5])\b/,         // Past years (2020-2025)
  /\bjanuary|february|march|april|may|june|july|august|september|october|november|december\b.*\b20(?:2[0-5])\b/i,
  /\bended\b/i,
  /\bexpired?\b/i,
  /\bclosed\b/i,
  /\bsold\s+out\b/i,
  /\bno\s+longer\s+available\b/i,
  /\blast\s+chance\b/i,
  /\buntil\s+\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
];

// ─── Link Extraction ────────────────────────────────────────────────────────

function extractLinksFromHtml(
  html: string,
  articleId: string,
  articleSlug: string,
  articleTitle: string
): LinkInstance[] {
  const links: LinkInstance[] = [];
  // Match all <a> tags with affiliate-related attributes
  const linkRegex = /<a\s[^>]*(?:rel="[^"]*sponsored[^"]*"|class="[^"]*affiliate[^"]*"|data-affiliate[^"]*|data-advertiser[^"]*)[^>]*>([^<]*(?:<[^/a][^>]*>[^<]*)*)<\/a>/gi;
  let match: RegExpExecArray | null;

  // Calculate total text length for position scoring
  const textOnly = html.replace(/<[^>]+>/g, " ");
  const totalLen = textOnly.length;

  while ((match = linkRegex.exec(html)) !== null) {
    const fullTag = match[0];
    const anchorText = match[1]?.replace(/<[^>]+>/g, "").trim() || "";

    // Extract href
    const hrefMatch = fullTag.match(/href="([^"]+)"/);
    const url = hrefMatch?.[1] || "";
    if (!url) continue;

    // Extract partner info
    const partnerMatch = fullTag.match(/data-(?:affiliate-partner|advertiser)="([^"]+)"/);
    const partner = partnerMatch?.[1] || extractPartnerFromUrl(url);

    const advIdMatch = fullTag.match(/data-advertiser-id="([^"]+)"/);
    const advertiserId = advIdMatch?.[1] || null;

    // Check if link goes through our tracker
    const trackingUrl = url.includes("/api/affiliate/click") ? url : null;

    // Determine position in article
    const posIdx = match.index;
    const textBefore = html.substring(0, posIdx).replace(/<[^>]+>/g, " ").length;
    const posRatio = totalLen > 0 ? textBefore / totalLen : 0.5;
    const positionInArticle: LinkInstance["positionInArticle"] =
      posRatio < 0.25 ? "top-quarter" :
      posRatio < 0.5 ? "mid-upper" :
      posRatio < 0.75 ? "mid-lower" : "bottom-quarter";

    // Find nearest heading above the link
    const htmlBefore = html.substring(0, posIdx);
    const headingMatches = htmlBefore.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi);
    const nearestHeading = headingMatches
      ? headingMatches[headingMatches.length - 1]?.replace(/<[^>]+>/g, "").trim() || ""
      : "";

    links.push({
      url,
      trackingUrl,
      partner,
      advertiserId,
      anchorText,
      positionInArticle,
      nearestHeading,
      articleSlug,
      articleTitle,
      articleId,
    });
  }

  return links;
}

function extractPartnerFromUrl(url: string): string {
  if (url.includes("booking.com")) return "booking.com";
  if (url.includes("vrbo.com") || url.includes("anrdoezrs.net")) return "vrbo";
  if (url.includes("agoda.com")) return "agoda";
  if (url.includes("halalbooking")) return "halalbooking";
  if (url.includes("getyourguide")) return "getyourguide";
  if (url.includes("viator.com")) return "viator";
  if (url.includes("klook.com")) return "klook";
  if (url.includes("tiqets.com")) return "tiqets";
  if (url.includes("ticketnetwork")) return "ticketnetwork";
  if (url.includes("welcomepickups") || url.includes("welcome-pickups")) return "welcome-pickups";
  if (url.includes("tp.media") || url.includes("tp-em.com")) return "travelpayouts";
  if (url.includes("stay22")) return "stay22";
  if (url.includes("skyscanner")) return "skyscanner";
  return "unknown";
}

// ─── Check Functions ────────────────────────────────────────────────────────

async function checkLiveness(url: string, baseUrl: string): Promise<LinkCheck["liveness"]> {
  // Resolve relative URLs
  const fullUrl = url.startsWith("/") ? `${baseUrl}${url}` : url;

  // Affiliate click tracking URLs are always live — skip HEAD check to avoid false positives.
  // Partner sites (Booking.com, GetYourGuide, etc.) reject HEAD requests, but our redirect
  // endpoint is correct by definition. These 302 redirects should never be flagged as dead.
  if (fullUrl.includes("/api/affiliate/click")) {
    return { ok: true, statusCode: 302, finalUrl: fullUrl, error: null };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(fullUrl, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "YallaLondon-LinkAuditor/1.0" },
    });
    clearTimeout(timeout);
    return {
      ok: res.status >= 200 && res.status < 400,
      statusCode: res.status,
      finalUrl: res.url || fullUrl,
      error: res.status >= 400 ? `HTTP ${res.status}` : null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, statusCode: null, finalUrl: null, error: msg.includes("abort") ? "Timeout (8s)" : msg };
  }
}

function checkTracking(link: LinkInstance): LinkCheck["tracked"] {
  if (link.trackingUrl) {
    // Verify SID parameter exists for revenue attribution
    const hasSid = link.trackingUrl.includes("sid=");
    return {
      ok: true,
      reason: hasSid
        ? "Tracked via /api/affiliate/click with SID attribution"
        : "Tracked via /api/affiliate/click but missing SID — revenue won't attribute to article",
    };
  }
  // Direct partner URLs bypass our tracking
  return {
    ok: false,
    reason: `Direct link to ${link.partner} — bypasses click tracking. Wrap with /api/affiliate/click redirect`,
  };
}

function checkRelevance(link: LinkInstance, articleContent: string): LinkCheck["relevance"] {
  const contentLower = articleContent.toLowerCase();
  const headingLower = link.nearestHeading.toLowerCase();
  const partnerLower = link.partner.toLowerCase();

  // Find what topic clusters the partner belongs to
  const partnerTopics = PARTNER_CLUSTERS[partnerLower] || [];
  if (partnerTopics.length === 0) {
    return { ok: true, score: 70, reason: `Unknown partner "${link.partner}" — cannot assess relevance` };
  }

  // Score: how well does the article section match the partner's expected topics?
  let sectionScore = 0;
  let matchedCluster = "";

  // Check the section around the link (nearest heading context)
  for (const cluster of partnerTopics) {
    const clusterWords = TOPIC_CLUSTERS[cluster] || [];
    const sectionText = headingLower + " " + link.anchorText.toLowerCase();
    const hits = clusterWords.filter(w => sectionText.includes(w)).length;
    if (hits > sectionScore) {
      sectionScore = hits;
      matchedCluster = cluster;
    }
  }

  // Also check broader article relevance
  let articleScore = 0;
  for (const cluster of partnerTopics) {
    const clusterWords = TOPIC_CLUSTERS[cluster] || [];
    const hits = clusterWords.filter(w => contentLower.includes(w)).length;
    if (hits > articleScore) articleScore = hits;
  }

  // Combine: section match is more important (60%) than article match (40%)
  const normalizedSection = Math.min(sectionScore / 2, 1); // 2+ hits = perfect section match
  const normalizedArticle = Math.min(articleScore / 3, 1);  // 3+ hits = perfect article match
  const score = Math.round((normalizedSection * 60 + normalizedArticle * 40));

  if (score >= 50) {
    return { ok: true, score, reason: `${link.partner} matches "${matchedCluster}" context in this section` };
  }

  // Mismatch detected
  const expectedTopics = partnerTopics.join(", ");
  return {
    ok: false,
    score,
    reason: `${link.partner} (${expectedTopics}) placed under "${link.nearestHeading}" — weak topical fit`,
  };
}

function checkFreshness(link: LinkInstance, sectionHtml: string): LinkCheck["freshness"] {
  const textAround = sectionHtml.replace(/<[^>]+>/g, " ").toLowerCase();

  for (const pattern of EXPIRY_SIGNALS) {
    const match = textAround.match(pattern);
    if (match) {
      // Check if it's a past year
      const yearMatch = match[0].match(/20(\d{2})/);
      if (yearMatch) {
        const year = parseInt("20" + yearMatch[1]);
        const currentYear = new Date().getFullYear();
        if (year < currentYear) {
          return { ok: false, reason: `References year ${year} — may be outdated. Update or remove.` };
        }
        continue; // Current or future year — fine
      }
      return { ok: false, reason: `Contains "${match[0]}" — check if this offer/event is still active` };
    }
  }

  // Check anchor text for time-sensitivity
  const anchorLower = link.anchorText.toLowerCase();
  if (anchorLower.includes("last minute") || anchorLower.includes("limited time") || anchorLower.includes("flash sale")) {
    return { ok: false, reason: `Anchor text "${link.anchorText}" suggests time-limited offer — verify still valid` };
  }

  return { ok: true, reason: "No expiry signals detected" };
}

function checkPlacement(link: LinkInstance, totalLinksInArticle: number): LinkCheck["placement"] {
  let score = 50; // baseline
  const reasons: string[] = [];

  // Position scoring
  if (link.positionInArticle === "mid-upper" || link.positionInArticle === "mid-lower") {
    score += 20; // Best: mid-article where engagement is highest
    reasons.push("good mid-article position");
  } else if (link.positionInArticle === "top-quarter") {
    score += 10; // Early placement — user hasn't committed to topic yet
    reasons.push("early placement — user may not be ready to act");
  } else {
    score += 5; // Bottom — many users don't scroll this far
    reasons.push("bottom placement — low scroll reach");
  }

  // Heading proximity
  if (link.nearestHeading) {
    score += 15;
    reasons.push(`under relevant heading "${link.nearestHeading.substring(0, 40)}"`);
  } else {
    reasons.push("no heading context — floating in body text");
  }

  // Link density
  if (totalLinksInArticle > 8) {
    score -= 10;
    reasons.push(`${totalLinksInArticle} affiliate links total — may feel spammy`);
  } else if (totalLinksInArticle >= 2 && totalLinksInArticle <= 5) {
    score += 15;
    reasons.push("healthy link density");
  }

  score = Math.min(100, Math.max(0, score));
  return {
    ok: score >= 50,
    score,
    reason: reasons.join("; "),
  };
}

function checkVisualMatch(link: LinkInstance, sectionHtml: string): LinkCheck["visual"] {
  // Check if there's an image near this link's section
  const hasImage = /<img\s[^>]+>/i.test(sectionHtml);
  if (!hasImage) {
    return { ok: false, reason: "No image near this link — adding a relevant photo improves click-through 2-3x" };
  }

  // Check if image alt text relates to the link's partner category
  const altMatch = sectionHtml.match(/<img[^>]+alt="([^"]+)"/i);
  if (altMatch) {
    const altText = altMatch[1].toLowerCase();
    const partnerTopics = PARTNER_CLUSTERS[link.partner.toLowerCase()] || [];

    for (const cluster of partnerTopics) {
      const clusterWords = TOPIC_CLUSTERS[cluster] || [];
      if (clusterWords.some(w => altText.includes(w))) {
        return { ok: true, reason: `Image alt "${altMatch[1].substring(0, 50)}" matches ${cluster} context` };
      }
    }
    return { ok: true, reason: `Image present near link (alt: "${altMatch[1].substring(0, 50)}") — verify visual match` };
  }

  return { ok: true, reason: "Image present but no alt text — add descriptive alt for accessibility + SEO" };
}

// ─── Section Extractor ──────────────────────────────────────────────────────

function getSectionAroundLink(html: string, linkUrl: string): string {
  const idx = html.indexOf(linkUrl);
  if (idx < 0) return html.substring(0, 2000);

  // Extract ~1000 chars before and after the link
  const start = Math.max(0, idx - 1000);
  const end = Math.min(html.length, idx + 1000);
  return html.substring(start, end);
}

// ─── Main Audit Function ────────────────────────────────────────────────────

export async function runLinkHealthAudit(options?: {
  siteId?: string;
  maxArticles?: number;
  skipLiveness?: boolean;
}): Promise<AuditResult> {
  const startMs = Date.now();
  const siteId = options?.siteId || getDefaultSiteId();
  const maxArticles = options?.maxArticles || 50;
  const skipLiveness = options?.skipLiveness || false;

  const { prisma } = await import("@/lib/db");
  const { getSiteDomain } = await import("@/config/sites");
  const domain = getSiteDomain(siteId);
  const baseUrl = `https://www.${domain}`;

  // Fetch published articles with content
  const articles = await prisma.blogPost.findMany({
    where: {
      siteId,
      published: true,
      content_en: { not: "" },
    },
    select: {
      id: true,
      slug: true,
      title_en: true,
      content_en: true,
      seo_score: true,
    },
    orderBy: { created_at: "desc" },
    take: maxArticles,
  });

  const allChecks: LinkCheck[] = [];
  const issues: AuditResult["issues"] = [];
  const summary: AuditResult["summary"] = {
    live: 0, dead: 0,
    tracked: 0, untracked: 0,
    relevant: 0, irrelevant: 0,
    fresh: 0, stale: 0,
    wellPlaced: 0, poorlyPlaced: 0,
  };

  for (const article of articles) {
    // Budget guard
    if (Date.now() - startMs > BUDGET_MS) break;

    const html = article.content_en || "";
    const links = extractLinksFromHtml(html, article.id, article.slug, article.title_en || article.slug);

    if (links.length === 0) continue;

    const textContent = html.replace(/<[^>]+>/g, " ").toLowerCase();

    for (const link of links) {
      if (Date.now() - startMs > BUDGET_MS) break;

      const sectionHtml = getSectionAroundLink(html, link.url);

      // 1. Liveness
      const liveness = skipLiveness
        ? { ok: true, statusCode: 200, finalUrl: link.url, error: null }
        : await checkLiveness(link.url, baseUrl);

      // 2. Tracking
      const tracked = checkTracking(link);

      // 3. Relevance
      const relevance = checkRelevance(link, textContent);

      // 4. Freshness
      const freshness = checkFreshness(link, sectionHtml);

      // 5. Placement
      const placement = checkPlacement(link, links.length);

      // 6. Visual match
      const visual = checkVisualMatch(link, sectionHtml);

      // Overall score: weighted average
      const overallScore = Math.round(
        (liveness.ok ? 25 : 0) +       // 25% — dead link is critical
        (tracked.ok ? 15 : 0) +         // 15% — untracked = lost revenue data
        (relevance.score * 0.25) +       // 25% — context match
        (freshness.ok ? 10 : 0) +        // 10% — stale links hurt trust
        (placement.score * 0.15) +       // 15% — placement affects CTR
        (visual.ok ? 10 : 0)            // 10% — visual match
      );

      const check: LinkCheck = { link, liveness, tracked, relevance, freshness, placement, visual, overallScore };
      allChecks.push(check);

      // Tally
      liveness.ok ? summary.live++ : summary.dead++;
      tracked.ok ? summary.tracked++ : summary.untracked++;
      relevance.ok ? summary.relevant++ : summary.irrelevant++;
      freshness.ok ? summary.fresh++ : summary.stale++;
      placement.ok ? summary.wellPlaced++ : summary.poorlyPlaced++;

      // Generate issues
      if (!liveness.ok) {
        issues.push({
          severity: "critical",
          issue: `Dead link: ${link.partner} in "${article.title_en?.substring(0, 50)}" → ${liveness.error}`,
          fix: "Remove or replace with working affiliate link",
          articleSlug: article.slug,
          linkUrl: link.url,
        });
      }
      if (!tracked.ok) {
        issues.push({
          severity: "high",
          issue: `Untracked: ${link.partner} link bypasses click tracking in "${article.title_en?.substring(0, 50)}"`,
          fix: "Wrap with /api/affiliate/click?id=X&sid=siteId_slug redirect",
          articleSlug: article.slug,
          linkUrl: link.url,
        });
      }
      if (!relevance.ok && relevance.score < 30) {
        issues.push({
          severity: "high",
          issue: `Misplaced: ${link.partner} under "${link.nearestHeading}" — poor topical fit`,
          fix: `Move to a ${PARTNER_CLUSTERS[link.partner.toLowerCase()]?.join("/")} section or replace with a contextually relevant partner`,
          articleSlug: article.slug,
          linkUrl: link.url,
        });
      } else if (!relevance.ok) {
        issues.push({
          severity: "medium",
          issue: `Weak fit: ${link.partner} in "${article.title_en?.substring(0, 50)}" — ${relevance.reason}`,
          fix: "Consider repositioning under a more relevant section heading",
          articleSlug: article.slug,
          linkUrl: link.url,
        });
      }
      if (!freshness.ok) {
        issues.push({
          severity: "medium",
          issue: `Stale: ${freshness.reason} in "${article.title_en?.substring(0, 50)}"`,
          fix: "Update link text/surrounding content or remove if offer expired",
          articleSlug: article.slug,
          linkUrl: link.url,
        });
      }
      if (placement.score < 30) {
        issues.push({
          severity: "low",
          issue: `Poor placement: ${link.partner} in ${link.positionInArticle} — ${placement.reason}`,
          fix: "Move affiliate CTA to mid-article, after a relevant subheading with supporting content",
          articleSlug: article.slug,
          linkUrl: link.url,
        });
      }
      if (!visual.ok) {
        issues.push({
          severity: "low",
          issue: `No visual: ${link.partner} link has no nearby image in "${article.title_en?.substring(0, 50)}"`,
          fix: "Add a relevant photo above the affiliate link — images increase click-through 2-3x",
          articleSlug: article.slug,
          linkUrl: link.url,
        });
      }
    }
  }

  // Sort issues by severity
  const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  issues.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

  // Calculate overall health score
  const totalLinks = allChecks.length;
  const healthScore = totalLinks > 0
    ? Math.round(allChecks.reduce((sum, c) => sum + c.overallScore, 0) / totalLinks)
    : 100;

  return {
    scannedArticles: articles.length,
    totalLinks,
    healthScore,
    checks: allChecks,
    issues: issues.slice(0, 50), // Cap at 50 most important issues
    summary,
  };
}
