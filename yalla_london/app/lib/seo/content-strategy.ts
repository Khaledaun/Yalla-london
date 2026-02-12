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
 *
 * Diversity engine ensures balanced content mix:
 * - No single type exceeds 40% of total content
 * - Seasonal content published ahead of events
 * - Evergreen content forms the base (minimum 50%)
 * - Weekly volume targets maintained
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
// CONTENT DIVERSITY ENGINE
// ============================================

/** Target distribution for content types (percentages) */
const CONTENT_TYPE_TARGETS: Record<ContentProposal["contentType"], { min: number; max: number }> = {
  guide: { min: 20, max: 40 },
  answer: { min: 10, max: 30 },
  listicle: { min: 10, max: 25 },
  comparison: { min: 5, max: 20 },
  "deep-dive": { min: 5, max: 20 },
  seasonal: { min: 5, max: 25 },
};

/** Upcoming events/seasons with lead-time in days */
const SEASONAL_CALENDAR: { name: string; keywords: string[]; month: number; leadDays: number }[] = [
  { name: "Ramadan", keywords: ["ramadan", "iftar", "suhoor"], month: 2, leadDays: 45 }, // ~March
  { name: "Eid al-Fitr", keywords: ["eid al-fitr", "eid fitr", "eid celebration"], month: 3, leadDays: 30 },
  { name: "Summer Holidays", keywords: ["summer", "july", "august", "family holiday"], month: 6, leadDays: 60 },
  { name: "Eid al-Adha", keywords: ["eid al-adha", "eid adha", "hajj"], month: 6, leadDays: 30 },
  { name: "National Day UAE", keywords: ["uae national day", "december dubai"], month: 11, leadDays: 30 },
  { name: "Christmas & New Year", keywords: ["christmas", "new year", "festive", "nye"], month: 11, leadDays: 45 },
  { name: "Spring Break", keywords: ["spring", "easter", "april"], month: 3, leadDays: 30 },
  { name: "Half Term UK", keywords: ["half term", "school holiday", "february"], month: 1, leadDays: 30 },
  { name: "Winter Getaway", keywords: ["winter", "ski", "cold weather", "january"], month: 10, leadDays: 45 },
];

export interface ContentDiversityReport {
  currentMix: Record<string, number>;
  totalPublished: number;
  underrepresented: string[];
  overrepresented: string[];
  upcomingSeasons: string[];
  weeklyTarget: number;
  weeklyActual: number;
  adjustments: string[];
}

/**
 * Analyze current content mix and return diversity metrics.
 * Used by the SEO agent to understand what types of content to prioritize.
 */
export async function analyzeContentDiversity(
  prisma: any
): Promise<ContentDiversityReport> {
  const adjustments: string[] = [];

  // Count published posts by content type (stored in authority_links_json.contentType)
  const allPosts = await prisma.blogPost.findMany({
    where: { published: true,  },
    select: {
      authority_links_json: true,
      tags: true,
      created_at: true,
      page_type: true,
    },
  });

  const totalPublished = allPosts.length;
  const typeCounts: Record<string, number> = {
    guide: 0, answer: 0, listicle: 0, comparison: 0, "deep-dive": 0, seasonal: 0,
  };

  for (const post of allPosts) {
    const ct = (post.authority_links_json as any)?.contentType;
    if (ct && ct in typeCounts) {
      typeCounts[ct]++;
    } else {
      // Infer type from page_type or tags
      const pageType = post.page_type || "";
      const tags = (post.tags || []) as string[];
      if (tags.some((t: string) => t.includes("faq") || t.includes("answer"))) {
        typeCounts.answer++;
      } else if (pageType === "list" || tags.some((t: string) => t.includes("top") || t.includes("best"))) {
        typeCounts.listicle++;
      } else if (tags.some((t: string) => t.includes("comparison") || t.includes("vs"))) {
        typeCounts.comparison++;
      } else if (tags.some((t: string) => t.includes("ramadan") || t.includes("eid") || t.includes("seasonal"))) {
        typeCounts.seasonal++;
      } else {
        typeCounts.guide++; // Default bucket
      }
    }
  }

  // Calculate percentages and identify imbalances
  const currentMix: Record<string, number> = {};
  const underrepresented: string[] = [];
  const overrepresented: string[] = [];

  for (const [type, count] of Object.entries(typeCounts)) {
    const pct = totalPublished > 0 ? (count / totalPublished) * 100 : 0;
    currentMix[type] = Math.round(pct * 10) / 10;

    const targets = CONTENT_TYPE_TARGETS[type as ContentProposal["contentType"]];
    if (targets) {
      if (pct < targets.min && totalPublished >= 10) {
        underrepresented.push(type);
        adjustments.push(`${type}: ${pct.toFixed(0)}% (target min ${targets.min}%) — needs more`);
      }
      if (pct > targets.max && totalPublished >= 10) {
        overrepresented.push(type);
        adjustments.push(`${type}: ${pct.toFixed(0)}% (target max ${targets.max}%) — slow down`);
      }
    }
  }

  // Check upcoming seasonal needs
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed
  const upcomingSeasons: string[] = [];

  for (const event of SEASONAL_CALENDAR) {
    const daysUntil = ((event.month - currentMonth + 12) % 12) * 30;
    if (daysUntil <= event.leadDays && daysUntil > 0) {
      upcomingSeasons.push(event.name);
      adjustments.push(`Seasonal: ${event.name} is ${daysUntil} days away — create content now`);
    }
  }

  // Weekly volume check (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklyActual = allPosts.filter(
    (p: any) => new Date(p.created_at) >= sevenDaysAgo
  ).length;
  const weeklyTarget = 14; // 2 per day * 7 days

  if (weeklyActual < weeklyTarget * 0.5) {
    adjustments.push(`Volume: Only ${weeklyActual}/${weeklyTarget} articles this week — content pipeline may be stalled`);
  }

  return {
    currentMix,
    totalPublished,
    underrepresented,
    overrepresented,
    upcomingSeasons,
    weeklyTarget,
    weeklyActual,
    adjustments,
  };
}

/**
 * Re-prioritize proposals based on diversity needs.
 * Boosts underrepresented types and dampens overrepresented ones.
 * Also injects seasonal proposals if upcoming events have no coverage.
 */
export function applyDiversityQuotas(
  proposals: ContentProposal[],
  diversity: ContentDiversityReport
): ContentProposal[] {
  // Boost underrepresented types
  for (const proposal of proposals) {
    if (diversity.underrepresented.includes(proposal.contentType)) {
      proposal.confidenceScore = Math.min(0.99, proposal.confidenceScore + 0.15);
      if (proposal.priority === "low") proposal.priority = "medium";
      if (proposal.priority === "medium") proposal.priority = "high";
    }
    // Dampen overrepresented types
    if (diversity.overrepresented.includes(proposal.contentType)) {
      proposal.confidenceScore = Math.max(0.1, proposal.confidenceScore - 0.15);
      if (proposal.priority === "critical") proposal.priority = "high";
      if (proposal.priority === "high") proposal.priority = "medium";
    }
  }

  // Inject seasonal proposals for upcoming events without coverage
  for (const season of diversity.upcomingSeasons) {
    const event = SEASONAL_CALENDAR.find((e) => e.name === season);
    if (!event) continue;

    // Check if any proposal already targets this season
    const hasCoverage = proposals.some((p) =>
      event.keywords.some((kw) => p.primaryKeyword.toLowerCase().includes(kw))
    );

    if (!hasCoverage) {
      proposals.push({
        title: generateTitle(event.keywords[0], "seasonal"),
        primaryKeyword: event.keywords[0],
        longtails: event.keywords.slice(1),
        questions: [
          `When is ${event.name} 2026?`,
          `Best ${event.name} activities for Arab travelers?`,
          `How to celebrate ${event.name} abroad?`,
        ],
        contentType: "seasonal",
        pageType: "guide",
        priority: "high",
        confidenceScore: 0.85,
        source: "seo-agent-strategy",
        rationale: `Seasonal: ${event.name} approaching — no existing content coverage`,
        locale: "en",
      });
    }
  }

  // Sort by adjusted confidence score (highest first)
  return proposals.sort((a, b) => b.confidenceScore - a.confidenceScore);
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
