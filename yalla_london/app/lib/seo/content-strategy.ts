/**
 * SEO Content Strategy Engine
 *
 * Turns real GSC keyword data into strategic, typed content proposals.
 * Creates TopicProposal records that the daily content generator picks up.
 *
 * Content types generated:
 * - "answer"     → "Is X halal?" / specific questions (e.g., "is novikov london halal")
 * - "comparison" → "X vs Y" / "Best X in Y" comparisons
 * - "deep-dive"  → Expand thin content ranking close to page 1
 * - "seasonal"   → Event/holiday/seasonal guides (Ramadan, Eid, etc.)
 * - "listicle"   → "Top N" / "Best N" collection posts
 * - "guide"      → Comprehensive how-to / destination guides
 */

import type { SearchPerformanceAnalysis, KeywordIssue } from "./seo-intelligence";

// ============================================
// TYPES
// ============================================

export interface ContentProposal {
  title: string;
  primaryKeyword: string;
  longtails: string[];
  questions: string[];
  contentType: "answer" | "comparison" | "deep-dive" | "seasonal" | "listicle" | "guide";
  pageType: string;
  priority: "critical" | "high" | "medium" | "low";
  confidenceScore: number;
  source: "seo-agent-strategy";
  rationale: string;
  locale: string;
  expandsSlug?: string; // For deep-dive: which existing post to expand
}

// ============================================
// KEYWORD → CONTENT TYPE CLASSIFIER
// ============================================

function classifyKeyword(query: string): {
  contentType: ContentProposal["contentType"];
  pageType: string;
} {
  const q = query.toLowerCase();

  // "Is X halal?" / "Is X good?" / specific yes/no questions
  if (q.startsWith("is ") && (q.includes("halal") || q.includes("good") || q.includes("worth"))) {
    return { contentType: "answer", pageType: "faq" };
  }

  // "X vs Y" / "X or Y" comparisons
  if (q.includes(" vs ") || q.includes(" or ") || q.includes(" versus ")) {
    return { contentType: "comparison", pageType: "guide" };
  }

  // "Best X" / "Top X" listicles
  if (q.startsWith("best ") || q.startsWith("top ") || q.includes("best ")) {
    return { contentType: "listicle", pageType: "list" };
  }

  // Seasonal content (Ramadan, Eid, Christmas, New Year, specific months/years)
  if (
    q.includes("ramadan") || q.includes("eid") ||
    q.includes("2026") || q.includes("2025") ||
    q.includes("christmas") || q.includes("new year") ||
    q.includes("summer") || q.includes("winter")
  ) {
    return { contentType: "seasonal", pageType: "guide" };
  }

  // "How to" / "Guide" / "Tips"
  if (q.includes("how to") || q.includes("guide") || q.includes("tips")) {
    return { contentType: "guide", pageType: "guide" };
  }

  // Default to guide
  return { contentType: "guide", pageType: "guide" };
}

// ============================================
// STRATEGIC CONTENT PROPOSAL GENERATOR
// ============================================

export function generateContentProposals(
  searchData: SearchPerformanceAnalysis,
  existingSlugs: string[]
): ContentProposal[] {
  const proposals: ContentProposal[] = [];
  const existingKeywords = new Set(
    existingSlugs.flatMap((s) => s.split("-"))
  );

  // ─── STRATEGY 1: Zero-click brand/page-1 queries → Answer posts ───
  for (const kw of searchData.zeroClickBrandQueries) {
    // Skip brand-name queries (yalla, yalla london, etc.)
    if (kw.query.includes("yalla") && !kw.query.includes("halal")) continue;

    const { contentType, pageType } = classifyKeyword(kw.query);

    proposals.push({
      title: generateTitle(kw.query, contentType),
      primaryKeyword: kw.query,
      longtails: generateLongtails(kw.query),
      questions: generateQuestions(kw.query),
      contentType,
      pageType,
      priority: kw.impressions >= 10 ? "critical" : "high",
      confidenceScore: Math.min(0.95, 0.7 + (kw.impressions / 50)),
      source: "seo-agent-strategy",
      rationale: `Zero clicks at position ${kw.position} with ${kw.impressions} impressions — dedicated content needed`,
      locale: "en",
    });
  }

  // ─── STRATEGY 2: Almost-page-1 thin content → Deep-dive expansion ───
  for (const page of searchData.almostPage1) {
    if (!page.slug || page.slug === "") continue;

    proposals.push({
      title: `EXPAND: ${page.slug}`,
      primaryKeyword: page.slug.replace(/-/g, " "),
      longtails: [],
      questions: [],
      contentType: "deep-dive",
      pageType: "guide",
      priority: "high",
      confidenceScore: Math.min(0.9, 0.6 + (page.impressions / 100)),
      source: "seo-agent-strategy",
      rationale: `Position ${page.position} with ${page.impressions} impressions — content expansion could push to page 1`,
      locale: "en",
      expandsSlug: page.slug,
    });
  }

  // ─── STRATEGY 3: Content gap keywords → New content ───
  for (const kw of searchData.contentGapKeywords.slice(0, 10)) {
    // Check if we already have content targeting this keyword
    const kwWords = kw.query.toLowerCase().split(" ");
    const hasExisting = kwWords.some((w) => existingKeywords.has(w) && w.length > 4);
    if (hasExisting) continue;

    const { contentType, pageType } = classifyKeyword(kw.query);

    proposals.push({
      title: generateTitle(kw.query, contentType),
      primaryKeyword: kw.query,
      longtails: generateLongtails(kw.query),
      questions: generateQuestions(kw.query),
      contentType,
      pageType,
      priority: kw.impressions >= 5 ? "medium" : "low",
      confidenceScore: Math.min(0.8, 0.4 + (kw.impressions / 20)),
      source: "seo-agent-strategy",
      rationale: `Content gap — ranking at pos ${kw.position} without dedicated content`,
      locale: "en",
    });
  }

  // ─── STRATEGY 4: Low-CTR pages → Comparison/expanded versions ───
  for (const page of searchData.lowCTRPages.slice(0, 5)) {
    if (!page.slug || page.slug === "") continue;
    if (page.slug.includes("contact") || page.slug.includes("about")) continue;

    // For low-CTR blog posts, suggest a comparison or deep-dive spin-off
    const keyword = page.slug.replace(/-/g, " ").replace(/\d{4}/g, "").trim();

    proposals.push({
      title: `Top Alternatives: ${capitalize(keyword)} — Complete Comparison Guide`,
      primaryKeyword: keyword,
      longtails: [`best ${keyword}`, `${keyword} comparison`, `${keyword} review`],
      questions: [`What is the best ${keyword}?`, `How to choose ${keyword}?`],
      contentType: "comparison",
      pageType: "guide",
      priority: "medium",
      confidenceScore: 0.65,
      source: "seo-agent-strategy",
      rationale: `Low CTR (${page.ctr}%) at pos ${page.position} — comparison content can capture more clicks`,
      locale: "en",
    });
  }

  // Deduplicate by primaryKeyword
  const seen = new Set<string>();
  return proposals.filter((p) => {
    const key = p.primaryKeyword.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================
// SAVE PROPOSALS TO DATABASE
// ============================================

export async function saveContentProposals(
  prisma: any,
  proposals: ContentProposal[],
  fixes: string[]
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (const proposal of proposals) {
    try {
      // Check for duplicate (same primary keyword, not yet published)
      const existing = await prisma.topicProposal.findFirst({
        where: {
          primary_keyword: proposal.primaryKeyword,
          status: { in: ["planned", "queued", "ready", "proposed"] },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.topicProposal.create({
        data: {
          title: proposal.title,
          primary_keyword: proposal.primaryKeyword,
          longtails: proposal.longtails,
          questions: proposal.questions,
          suggested_page_type: proposal.pageType,
          locale: proposal.locale,
          status: "ready", // Immediately available for content generation
          confidence_score: proposal.confidenceScore,
          source: "seo-agent-strategy",
          intent: proposal.contentType === "answer" ? "info" : "info",
          evergreen: proposal.contentType !== "seasonal",
          description: proposal.rationale,
          // Store content type in authority_links_json for the generator to read
          authority_links_json: {
            contentType: proposal.contentType,
            expandsSlug: proposal.expandsSlug || null,
            priority: proposal.priority,
          },
        },
      });

      created++;
    } catch (error) {
      console.warn(`Failed to create proposal for "${proposal.primaryKeyword}":`, error);
      skipped++;
    }
  }

  if (created > 0) {
    fixes.push(
      `Created ${created} strategic content proposals from GSC keyword data (${skipped} duplicates skipped)`
    );
  }

  return { created, skipped };
}

// ============================================
// HELPERS
// ============================================

function generateTitle(keyword: string, contentType: ContentProposal["contentType"]): string {
  const kw = capitalize(keyword);

  switch (contentType) {
    case "answer":
      if (keyword.startsWith("is ")) {
        return `${kw}? Complete Guide for 2026`;
      }
      return `${kw} — Everything You Need to Know`;

    case "comparison":
      return `${kw}: Complete Comparison Guide 2026`;

    case "listicle":
      return `${kw} — Definitive Guide for Arab Travelers 2026`;

    case "seasonal":
      return `${kw}: What You Need to Know`;

    case "deep-dive":
      return `${kw}: In-Depth Guide`;

    default:
      return `${kw}: Complete Guide for Arab Travelers`;
  }
}

function generateLongtails(keyword: string): string[] {
  const base = keyword.toLowerCase();
  const longtails = [
    `${base} 2026`,
    `${base} guide`,
    `${base} for arab travelers`,
  ];

  if (base.includes("london")) {
    longtails.push(`${base} uk`);
  }
  if (base.includes("halal")) {
    longtails.push(`${base} certified`);
    longtails.push(`${base} near me`);
  }

  return longtails.slice(0, 5);
}

function generateQuestions(keyword: string): string[] {
  const base = keyword.toLowerCase();
  return [
    `What is the best ${base}?`,
    `Where to find ${base}?`,
    `Is ${base} worth it for tourists?`,
  ];
}

function capitalize(str: string): string {
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
