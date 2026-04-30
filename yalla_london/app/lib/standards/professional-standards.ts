/**
 * Professional Standards — single source of truth for content quality,
 * SEO, AIO, indexing, and topic discipline across ALL websites.
 *
 * Adopted April 30, 2026 as part of the platform-wide quality reset
 * after the F-grade discovery audit revealed that the pipeline was
 * producing near-duplicate halal-restaurant variants that diluted
 * topical authority and earned 3 organic clicks/week after 6 months.
 *
 * Philosophy:
 *   - PUBLISH FEWER, MUCH BETTER ARTICLES.
 *   - Topical authority comes from depth on a topic, not breadth across
 *     near-duplicates.
 *   - For new domains (sandbox period), Google rewards: (1) original
 *     first-hand insight, (2) consistent author identity, (3) tight
 *     internal linking, (4) zero duplicate content.
 *
 * Every cron, every prompt, every quality gate must read its thresholds
 * from this file. If you find a hardcoded threshold elsewhere, replace
 * it with an import from here.
 *
 * Usage:
 *   import { PROFESSIONAL_STANDARDS, getTierForType, meetsTier } from "@/lib/standards/professional-standards";
 */

// ─── Tier System ──────────────────────────────────────────────────────────────
// Articles are graded against four tiers. The pipeline targets a minimum tier
// based on content type. Articles below the floor are auto-unpublished by the
// clean-slate operation.

export type Tier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export interface TierRequirements {
  minWords: number;
  minInternalLinks: number;
  minInboundLinks: number; // count of OTHER articles linking TO this one
  minStatistics: number; // numeric/measurable claims with attribution
  minFirstHandMarkers: number; // "we visited", "I noticed", "insider tip"
  minQuestionH2s: number; // for AIO eligibility
  requireAffiliates: boolean;
  requireAffiliateDisclosure: boolean;
  requireNamedAuthor: boolean;
  requireAuthorBio: boolean;
  requireSchemaMarkup: string[]; // schema.org types required
  requireCanonical: boolean;
  requireBreadcrumbs: boolean;
  requireOriginalImages: boolean; // false = stock OK, true = no Unsplash/etc
  minSeoScore: number; // pre-pub gate threshold
}

export const TIERS: Record<Tier, TierRequirements> = {
  BRONZE: {
    minWords: 800,
    minInternalLinks: 2,
    minInboundLinks: 0,
    minStatistics: 1,
    minFirstHandMarkers: 1,
    minQuestionH2s: 1,
    requireAffiliates: false,
    requireAffiliateDisclosure: true, // even if 0 affiliate links, still no harm
    requireNamedAuthor: true,
    requireAuthorBio: false,
    requireSchemaMarkup: ["Article"],
    requireCanonical: true,
    requireBreadcrumbs: true,
    requireOriginalImages: false,
    minSeoScore: 50,
  },
  SILVER: {
    minWords: 1200,
    minInternalLinks: 3,
    minInboundLinks: 1,
    minStatistics: 2,
    minFirstHandMarkers: 2,
    minQuestionH2s: 2,
    requireAffiliates: false,
    requireAffiliateDisclosure: true,
    requireNamedAuthor: true,
    requireAuthorBio: false,
    requireSchemaMarkup: ["Article", "BreadcrumbList"],
    requireCanonical: true,
    requireBreadcrumbs: true,
    requireOriginalImages: false,
    minSeoScore: 60,
  },
  GOLD: {
    minWords: 1800,
    minInternalLinks: 5,
    minInboundLinks: 3,
    minStatistics: 3,
    minFirstHandMarkers: 3,
    minQuestionH2s: 2,
    requireAffiliates: true,
    requireAffiliateDisclosure: true,
    requireNamedAuthor: true,
    requireAuthorBio: true,
    requireSchemaMarkup: ["Article", "BreadcrumbList"],
    requireCanonical: true,
    requireBreadcrumbs: true,
    requireOriginalImages: false,
    minSeoScore: 70,
  },
  PLATINUM: {
    minWords: 2500,
    minInternalLinks: 8,
    minInboundLinks: 5,
    minStatistics: 5,
    minFirstHandMarkers: 5,
    minQuestionH2s: 3,
    requireAffiliates: true,
    requireAffiliateDisclosure: true,
    requireNamedAuthor: true,
    requireAuthorBio: true,
    requireSchemaMarkup: ["Article", "BreadcrumbList", "FAQPage"],
    requireCanonical: true,
    requireBreadcrumbs: true,
    requireOriginalImages: true, // photographer or original on-site photos
    minSeoScore: 80,
  },
};

// Per-content-type minimum tier. Raises the floor for what we'll publish.
// "blog" is the default for evergreen articles — we want GOLD minimum.
// "comparison" articles target high commercial intent and must be PLATINUM.
// "news" can be BRONZE because it's time-sensitive.
export const TIER_FOR_TYPE: Record<string, Tier> = {
  blog: "GOLD",
  guide: "GOLD",
  comparison: "PLATINUM",
  review: "GOLD",
  listicle: "GOLD",
  "deep-dive": "PLATINUM",
  answer: "SILVER",
  information: "SILVER",
  news: "BRONZE",
  events: "BRONZE",
  seasonal: "SILVER",
  sales: "SILVER",
};

export function getTierForType(contentType: string | null | undefined): Tier {
  if (!contentType) return "GOLD";
  return TIER_FOR_TYPE[contentType.toLowerCase()] || "GOLD";
}

// ─── Topic Discipline ─────────────────────────────────────────────────────────
// The single biggest cause of low organic traffic on yalla-london is duplicate
// content. The pipeline produced 12+ "Best Halal Restaurants" variants competing
// for the same query. Google's Helpful Content Update specifically demotes this.

export const TOPIC_DISCIPLINE = {
  // Maximum allowed near-duplicate articles per keyword cluster (Jaccard >70%).
  maxVariantsPerCluster: 1,

  // Cooldown before a similar topic can be published again (calendar days).
  // 90 days lets Google fully crawl + rank the first attempt before testing
  // a different angle.
  minDaysBetweenSimilarTopics: 90,

  // If a new topic shares >X% words with a published article (after stop-word
  // removal), reject it during topic creation.
  duplicateRejectionJaccardThreshold: 0.7,

  // Slug patterns that indicate "cascade naming" — the pipeline producing
  // -v2/-v3/-v9 versions of the same topic. These are auto-rejected from
  // new topic generation.
  forbiddenSlugPatterns: [
    /-v\d+$/i,
    /-v\d+[a-z0-9]*$/i,
    /-v[a-z0-9]{4,}$/i, // -v9-e924a639
    /-[0-9a-f]{6,}$/i, // hex hash suffix
    /-\d{4}-?\d*-?\d*$/, // -2025, -2025-04, -2025-04-01
  ],

  // Per-cluster keywords that have been heavily over-served on yalla-london
  // and should be paused for new topic generation until cleanup completes.
  pausedClusters: [
    "halal restaurants london",
    "halal afternoon tea london",
    "luxury hammam spa london",
    "halal luxury restaurants",
    "halal fine dining london",
  ],
};

// ─── E-E-A-T Requirements ─────────────────────────────────────────────────────
// Google's January 2026 Authenticity Update made first-hand experience the #1
// E-E-A-T signal. AI-generated personas without traceable identity are
// systematically demoted.

export const EEAT_REQUIREMENTS = {
  // Author profiles must have:
  requireAuthorName: true, // real human name, not "Editorial" or "Yalla Team"
  requireAuthorBio: true, // 100+ word bio explaining expertise
  requireAuthorAvatar: true, // photo (real human face preferred)
  requireDigitalFootprint: true, // at least 1 external link (LinkedIn, About, etc.)
  requireSocialProof: false, // optional: Twitter handle etc.

  // Content markers:
  requireFirstHandMarkers: 3, // sensory details, insider tips, specific dates/visits
  forbiddenAiGenericPhrases: [
    "in conclusion",
    "it's worth noting",
    "whether you're a",
    "look no further",
    "without further ado",
    "in this comprehensive guide",
    "nestled in the heart of",
    "diverse range of",
    "wide variety of",
    "rich tapestry of",
    "a perfect blend of",
  ],
  maxAiGenericPhraseInstances: 1, // total across an article
};

// ─── AIO (Generative Engine Optimization) Requirements ───────────────────────
// AI Overviews now appear on 30-60% of queries (Jan 2026). Citation eligibility
// requires direct-answer structure + statistics + source attribution.

export const AIO_REQUIREMENTS = {
  // Direct answer in first 80 words after intro paragraph.
  requireDirectAnswerInFirst80Words: true,

  // Question-format H2s (matches AI Overview triggers like "How much does X cost?").
  minQuestionH2s: 2,

  // Statistics with attribution (Princeton: +37% AI visibility boost).
  minStatisticsWithCitations: 3,

  // Self-contained paragraphs (40-200 words) — optimal for citation extraction.
  minSelfContainedParagraphs: 3,
  selfContainedParagraphMinWords: 40,
  selfContainedParagraphMaxWords: 200,

  // Comparison tables, ordered lists, definitions — structured data extracts well.
  minStructuredDataElements: 1,

  // Answer capsule length (40-80 words for citation extraction).
  answerCapsuleMinWords: 40,
  answerCapsuleMaxWords: 80,
};

// ─── Indexing Requirements ────────────────────────────────────────────────────

export const INDEXING_REQUIREMENTS = {
  // On publish, immediately:
  submitToIndexNow: true, // Bing + Yandex + api.indexnow.org
  trackInUrlIndexingStatus: true, // even if IndexNow fails (so retry can find it)
  refreshSitemapCache: true, // never let cache go stale
  trackArabicVariant: true, // /ar/ URL gets tracked alongside EN

  // Required for a URL to be considered "indexable":
  requireCanonicalUrl: true,
  requireOpenGraphTags: true,
  requireTwitterCardTags: true,
  requireSchemaMarkup: ["Article"], // minimum
  requireHreflangTags: true, // en-GB, ar-SA, x-default
  requireMobileResponsive: true, // automatic via Tailwind

  // Quality bar for index submission:
  minWordsBeforeSubmit: 800, // never submit thin content
  requireFeaturedImage: true,

  // Retry policy:
  maxSubmissionAttempts: 5, // after this, mark for manual review
  retryBackoffMinutes: [60, 240, 1440, 4320, 10080], // 1h, 4h, 1d, 3d, 7d

  // Sandbox-aware staleness threshold (Google takes 30-90 days for new domains):
  staleSubmissionDays: 30, // bumped from 14 — was over-flagging legit sandbox period
  chronicFailureAttempts: 5,
};

// ─── Affiliate Requirements ───────────────────────────────────────────────────
// FTC compliance + revenue tracking. Every affiliate link must be:
//   - rel="noopener sponsored" (or equivalent)
//   - Routed through /api/affiliate/click for SID tracking
//   - Within 800 chars of a disclosure paragraph
// Articles with affiliates but no disclosure → auto-injected by content-auto-fix
// Section 25.

export const AFFILIATE_REQUIREMENTS = {
  requireDisclosureWhenLinked: true,
  requireRelSponsoredNoopener: true,
  requireSidTrackingViaClickEndpoint: true,
  minDisclosureWords: 30,
  minAffiliateLinksForGoldArticles: 2,
  minAffiliateLinksForPlatinumArticles: 4,
  forbiddenAdvertisers: [], // populated dynamically from CjAdvertiser status=DECLINED
};

// ─── Cleanup Thresholds ───────────────────────────────────────────────────────
// Used by the /api/admin/clean-slate endpoint to decide what to keep, fix,
// unpublish, or delete.

export const CLEANUP_THRESHOLDS = {
  // Duplicate detection — articles whose normalized titles share more than this
  // fraction of words (after stop-word removal) are considered duplicates.
  duplicateJaccardThreshold: 0.7,

  // Articles below this word count AND with no traffic are unpublished.
  thinContentMinWords: 800,

  // Protected articles — never touch:
  minClicksLast30dToProtect: 1,
  minImpressionsLast30dToProtect: 50,

  // Don't touch articles created within this window — let them mature.
  protectAgeDays: 7,

  // Stale operational data — safe to delete:
  rejectedDraftRetentionDays: 14,
  cronJobLogRetentionDays: 14,
  autoFixLogRetentionDays: 14,
  apiUsageLogRetentionDays: 7,
  zombieRunningCronAgeMinutes: 60,
  stuckPromotingDraftAgeMinutes: 30,
  stuckGeneratingTopicAgeMinutes: 120,

  // Per-execution caps to prevent runaway operations:
  maxUnpublishesPerRun: 100,
  maxFixesPerRun: 200,
  maxDeletesPerRun: 5000,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the minimum tier requirements for a given content type.
 * Use this in pre-pub gate, content-auto-fix, and quality scoring.
 */
export function getMinimumRequirements(contentType: string | null | undefined): TierRequirements {
  return TIERS[getTierForType(contentType)];
}

/**
 * Checks whether an article meets the requirements of a given tier.
 * Returns { meets: boolean, gaps: string[] } for actionable feedback.
 */
export function meetsTier(
  tier: Tier,
  article: {
    wordCount: number;
    internalLinks: number;
    inboundLinks: number;
    statistics: number;
    firstHandMarkers: number;
    questionH2s: number;
    affiliateLinks: number;
    affiliateDisclosurePresent: boolean;
    namedAuthor: boolean;
    authorBio: boolean;
    schemaTypes: string[];
    canonical: boolean;
    breadcrumbs: boolean;
    seoScore: number;
  },
): { meets: boolean; gaps: string[] } {
  const req = TIERS[tier];
  const gaps: string[] = [];

  if (article.wordCount < req.minWords) gaps.push(`Word count ${article.wordCount} < ${req.minWords}`);
  if (article.internalLinks < req.minInternalLinks)
    gaps.push(`Internal links ${article.internalLinks} < ${req.minInternalLinks}`);
  if (article.inboundLinks < req.minInboundLinks)
    gaps.push(`Inbound links ${article.inboundLinks} < ${req.minInboundLinks}`);
  if (article.statistics < req.minStatistics)
    gaps.push(`Statistics with citations ${article.statistics} < ${req.minStatistics}`);
  if (article.firstHandMarkers < req.minFirstHandMarkers)
    gaps.push(`First-hand markers ${article.firstHandMarkers} < ${req.minFirstHandMarkers}`);
  if (article.questionH2s < req.minQuestionH2s)
    gaps.push(`Question H2s ${article.questionH2s} < ${req.minQuestionH2s}`);
  if (req.requireAffiliates && article.affiliateLinks === 0) gaps.push("No affiliate links (required)");
  if (req.requireAffiliateDisclosure && article.affiliateLinks > 0 && !article.affiliateDisclosurePresent)
    gaps.push("Affiliate disclosure paragraph missing");
  if (req.requireNamedAuthor && !article.namedAuthor) gaps.push("Named author missing (E-E-A-T)");
  if (req.requireAuthorBio && !article.authorBio) gaps.push("Author bio missing (E-E-A-T)");
  for (const requiredSchema of req.requireSchemaMarkup) {
    if (!article.schemaTypes.includes(requiredSchema)) gaps.push(`Schema.org ${requiredSchema} missing`);
  }
  if (req.requireCanonical && !article.canonical) gaps.push("Canonical URL missing");
  if (req.requireBreadcrumbs && !article.breadcrumbs) gaps.push("BreadcrumbList missing");
  if (article.seoScore < req.minSeoScore) gaps.push(`SEO score ${article.seoScore} < ${req.minSeoScore}`);

  return { meets: gaps.length === 0, gaps };
}

/**
 * Normalises a title for duplicate-detection comparison.
 * Strips: site brand, year tags, separators, "best/top/ultimate" filler,
 * and other AI-cascade artifacts.
 */
export function normalizeForDuplicateDetection(title: string): Set<string> {
  const FILLER_WORDS = new Set([
    "best",
    "top",
    "ultimate",
    "complete",
    "definitive",
    "guide",
    "comparison",
    "review",
    "yalla",
    "london",
    "the",
    "a",
    "an",
    "for",
    "with",
    "and",
    "or",
    "of",
    "to",
    "in",
    "on",
    "at",
    "by",
    "is",
    "as",
    "it",
    "you",
    "your",
    "our",
    "luxury",
    "exclusive",
  ]);
  return new Set(
    title
      .toLowerCase()
      .replace(/[\|\-:&,.()]/g, " ")
      .replace(/\b20\d{2}\b/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !FILLER_WORDS.has(w)),
  );
}

/**
 * Jaccard similarity between two title word sets.
 * Used to decide if two articles are duplicates.
 */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}
