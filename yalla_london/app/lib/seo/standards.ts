/**
 * SEO Standards Configuration — Single Source of Truth
 *
 * All SEO modules (pre-pub gate, scoring, schema generator, content pipeline,
 * SEO agent) MUST reference these standards instead of hardcoding thresholds.
 *
 * Updated: 2026-02-18
 * Source: Google Search Central docs, Search Quality Rater Guidelines (Sept 2025),
 *         CrUX data, Schema.org V29.4, confirmed algorithm updates through Feb 2026.
 *
 * The SEO orchestrator refreshes this knowledge base weekly by comparing
 * against the latest Google documentation changelog.
 */

// ─── Last verified against Google docs ──────────────────────────────────────
export const STANDARDS_VERSION = "2026-02-19";
export const STANDARDS_SOURCE = "Google Search Central + Quality Rater Guidelines Sept 2025 + January 2026 Core Update";

// ─── Algorithm Context ──────────────────────────────────────────────────────
export const ALGORITHM_CONTEXT = {
  /** Helpful Content System absorbed into core ranking (March 2024) — no standalone HCU */
  helpfulContentAbsorbed: true,
  /** AI Overviews live for 2B+ monthly users across 200+ countries, 25-60% of searches (varies by study) */
  aiOverviewsActive: true,
  /** INP replaced FID as Core Web Vital in March 2024 */
  inpReplacedFid: true,
  /** Google confirmed continuous smaller updates happen without announcements */
  continuousUpdates: true,
  /** E-E-A-T strengthened — first-hand experience, original data, author credentials */
  eeatStrengthened: true,
  /** Topical authority elevated — deep expertise favored over generalist coverage */
  topicalAuthorityElevated: true,
  /** Information gain rewarded — unique info not found elsewhere */
  informationGainRewarded: true,
  /** Content freshness — Google better distinguishes real updates from cosmetic date changes */
  freshnessImproved: true,
  /** Mobile-first indexing 100% complete since July 5, 2024 */
  mobileFirstComplete: true,

  // ── January 2026 "Authenticity Update" (Core Update, rolled out Jan 4 2026) ──
  /** First-hand Experience is now the dominant E-E-A-T signal — content must prove lived experience */
  authenticityUpdateActive: true,
  /** AI content not banned but mass-produced unedited AI content demoted. Human oversight required. */
  aiContentRequiresHumanOversight: true,
  /** Stock photography penalized — original media signals authenticity */
  originalMediaPreferred: true,
  /** Anonymous content penalized — every article needs author byline with digital footprint */
  authorBylineRequired: true,
  /** Topical depth > publishing frequency — content clusters and internal linking weighted higher */
  topicalDepthOverFrequency: true,
  /** "Second-hand knowledge" demoted — summarized/repackaged content without original insights loses rank */
  secondHandKnowledgeDemoted: true,
  /** Scaled content abuse manual actions active since March 2024 spam update */
  scaledContentAbuseActions: true,
  /** 25-60% of searches feature AI Overviews (varies by study) — cited content must demonstrate genuine expertise */
  aiOverviewCitationExpertiseRequired: true,
} as const;

// ─── Core Web Vitals Thresholds (75th percentile CrUX) ─────────────────────
export const CORE_WEB_VITALS = {
  /** Largest Contentful Paint */
  lcp: { good: 2500, needsImprovement: 4000, unit: "ms" },
  /** Interaction to Next Paint — replaced FID in March 2024 */
  inp: { good: 200, needsImprovement: 500, unit: "ms" },
  /** Cumulative Layout Shift */
  cls: { good: 0.1, needsImprovement: 0.25, unit: "score" },
  /** Time to First Byte — secondary signal */
  ttfb: { good: 600, needsImprovement: 1200, unit: "ms" },
} as const;

// ─── Content Quality Thresholds ─────────────────────────────────────────────
export const CONTENT_QUALITY = {
  /** Minimum words for a publishable article (blocker threshold) */
  minWords: 1000,
  /** Minimum words before content is considered "thin" by Google */
  thinContentThreshold: 300,
  /** Target word count for topical authority */
  targetWords: 1800,
  /** Ideal word count for deep-dive content */
  idealWords: 2000,
  /** Minimum meta title length (chars) */
  metaTitleMin: 30,
  /** Optimal meta title length (chars) */
  metaTitleOptimal: { min: 50, max: 60 },
  /** Minimum meta description length (chars) */
  metaDescriptionMin: 120,
  /** Optimal meta description length (chars) */
  metaDescriptionOptimal: { min: 120, max: 160 },
  /** Maximum keyword density (percentage) — 2025: favor semantic variation */
  maxKeywordDensity: 2.5,
  /** Target readability: Flesch-Kincaid grade level */
  readabilityTarget: 10,
  /** Maximum readability before warning */
  readabilityMax: 12,
  /** Minimum internal links per article */
  minInternalLinks: 3,
  /** Target internal links for topical authority */
  targetInternalLinks: 5,
  /** Minimum H2 headings per article */
  minH2Count: 2,
  /** Target H2 headings for structured content */
  targetH2Count: 6,
  /** Maximum one H1 per page */
  maxH1Count: 1,
  /** Minimum SEO score to pass quality gate (out of 100) */
  qualityGateScore: 70,
  /**
   * Minimum quality score to fetch articles FROM the reservoir for promotion.
   * Intentionally lower than qualityGateScore (70) so that articles scoring 60–69
   * are still fetched and evaluated — the gate's hard blocker is seo_score < 50,
   * not < 70. This prevents articles from being permanently frozen if the
   * qualityGateScore threshold is raised after they entered the reservoir.
   */
  reservoirMinScore: 60,
} as const;

// ─── Per-Content-Type Quality Thresholds ─────────────────────────────────────
// News items, information hub articles, and guides are intentionally shorter
// than blog posts. Applying blog thresholds to them causes them to be permanently
// blocked from publication even though they are high-quality for their format.
//
// URL detection in the gate:
//   /blog/...        → blog thresholds (default)
//   /news/...        → news thresholds
//   /information/... → information thresholds
//   /guides/...      → guide thresholds
export const CONTENT_TYPE_THRESHOLDS = {
  blog: {
    minWords: 1000,
    targetWords: 1800,
    thinContentThreshold: 300,
    metaTitleMin: 30,
    metaTitleOptimal: { min: 50, max: 60 },
    metaDescriptionMin: 120,
    metaDescriptionOptimal: { min: 120, max: 160 },
    qualityGateScore: 70,
    seoScoreBlocker: 50,
    minInternalLinks: 3,
    minH2Count: 2,
    requireAffiliateLinks: true,
    requireAuthenticitySignals: true,
  },
  news: {
    /** News items: 150–500 words — timely and scannable by design */
    minWords: 150,
    targetWords: 400,
    thinContentThreshold: 80,
    metaTitleMin: 20,
    metaTitleOptimal: { min: 40, max: 60 },
    metaDescriptionMin: 80,
    metaDescriptionOptimal: { min: 80, max: 160 },
    qualityGateScore: 40,
    seoScoreBlocker: 20,
    minInternalLinks: 1,
    minH2Count: 0,
    requireAffiliateLinks: false,
    requireAuthenticitySignals: false,
  },
  information: {
    /** Information hub articles: 300–900 words — reference content, factual depth */
    minWords: 300,
    targetWords: 800,
    thinContentThreshold: 150,
    metaTitleMin: 20,
    metaTitleOptimal: { min: 40, max: 60 },
    metaDescriptionMin: 80,
    metaDescriptionOptimal: { min: 80, max: 160 },
    qualityGateScore: 50,
    seoScoreBlocker: 30,
    minInternalLinks: 1,
    minH2Count: 1,
    requireAffiliateLinks: false,
    requireAuthenticitySignals: false,
  },
  guide: {
    /** Guides: 400–1000 words — practical, step-oriented, may include booking links */
    minWords: 400,
    targetWords: 1000,
    thinContentThreshold: 200,
    metaTitleMin: 20,
    metaTitleOptimal: { min: 40, max: 60 },
    metaDescriptionMin: 80,
    metaDescriptionOptimal: { min: 80, max: 160 },
    qualityGateScore: 50,
    seoScoreBlocker: 30,
    minInternalLinks: 1,
    minH2Count: 1,
    requireAffiliateLinks: true,
    requireAuthenticitySignals: false,
  },
} as const;

export type ContentTypeKey = keyof typeof CONTENT_TYPE_THRESHOLDS;

/**
 * Detect which content type a target URL belongs to, and return its quality
 * thresholds. Falls back to blog (strictest) if the URL doesn't match.
 */
export function getThresholdsForUrl(targetUrl: string) {
  const path = targetUrl.toLowerCase();
  if (path.startsWith("/news/") || path.includes("/ar/news/")) return CONTENT_TYPE_THRESHOLDS.news;
  if (path.startsWith("/information/") || path.includes("/ar/information/")) return CONTENT_TYPE_THRESHOLDS.information;
  if (path.startsWith("/guides/") || path.includes("/ar/guides/")) return CONTENT_TYPE_THRESHOLDS.guide;
  return CONTENT_TYPE_THRESHOLDS.blog;
}

// ─── E-E-A-T Requirements (Updated for Jan 2026 Authenticity Update) ────────
export const EEAT_REQUIREMENTS = {
  /** Articles should have identifiable author attribution */
  requireAuthorAttribution: true,
  /** Author should have verifiable credentials or bio */
  requireAuthorBio: true,
  /** Organization contact info must be accessible */
  requireContactInfo: true,
  /** HTTPS required */
  requireHttps: true,
  /** Editorial/privacy policy should be linked */
  requireEditorialPolicy: true,
  /** Original photography/first-hand content preferred — stock photos penalized */
  preferOriginalContent: true,
  /** Trust is the most important E-E-A-T component */
  trustIsPrimary: true,

  // ── Jan 2026 Authenticity Update additions ──
  /** Experience (first "E") is now the dominant signal — content must prove author lived it */
  experienceIsDominant: true,
  /** Content must contain first-hand experience signals: sensory details, specific observations, insider knowledge */
  requireFirstHandSignals: true,
  /** Content must offer unique information not found elsewhere (not repackaged summaries) */
  requireOriginalInsights: true,
  /** Author byline with verifiable digital footprint required — anonymous content penalized */
  requireAuthorDigitalFootprint: true,
  /** Content should demonstrate understanding through explanation, not assertion */
  demonstrateThroughExplanation: true,
} as const;

// ─── Schema Markup — Supported Types (2025-2026) ────────────────────────────
export const SCHEMA_TYPES = {
  /** Actively supported types that generate rich results */
  supported: [
    "Article",
    "Product",
    "LocalBusiness",
    "Organization",
    "BreadcrumbList",
    "Event",
    "Recipe",
    "VideoObject",
    "Review",           // Review Snippet
    "JobPosting",
    "SoftwareApplication",
    "Person",
    "WebSite",
    "DiscussionForumPosting", // Added Nov 2023
    "ProfilePage",            // Added Nov 2023
    "VacationRental",         // Added Dec 2023
    "Restaurant",
    "Hotel",
    "TouristAttraction",
  ] as const,

  /** Deprecated types — DO NOT generate these */
  deprecated: [
    { type: "HowTo", deprecatedDate: "2023-09", reason: "Fully deprecated, no longer generates rich results" },
    { type: "FAQPage", deprecatedDate: "2023-08", reason: "Restricted to authoritative government and health websites only" },
    { type: "CourseInfo", deprecatedDate: "2025-06", reason: "Deprecated in June 2025 batch" },
    { type: "ClaimReview", deprecatedDate: "2025-06", reason: "Fact Check deprecated June 2025" },
    { type: "EstimatedSalary", deprecatedDate: "2025-06", reason: "Deprecated June 2025" },
    { type: "LearningVideo", deprecatedDate: "2025-06", reason: "Deprecated June 2025" },
    { type: "SpecialAnnouncement", deprecatedDate: "2025-06", reason: "Deprecated June 2025" },
    { type: "VehicleListing", deprecatedDate: "2025-06", reason: "Deprecated June 2025" },
    { type: "PracticeProblems", deprecatedDate: "2025-11", reason: "Deprecated November 2025" },
    { type: "SitelinksSearchBox", deprecatedDate: "2024-10", reason: "Deprecated October 2024" },
  ] as const,

  /** Best types for travel/luxury content sites */
  recommendedForTravel: [
    "Article",
    "BreadcrumbList",
    "Organization",
    "Person",
    "Event",
    "Restaurant",
    "Hotel",
    "TouristAttraction",
    "VideoObject",
    "Review",
    "WebSite",
  ] as const,
} as const;

// ─── AI Overview Optimization ───────────────────────────────────────────────
export const AIO_OPTIMIZATION = {
  /** Google says: no special optimization needed beyond standard SEO */
  noSpecialRequirements: true,
  /** But studies show these patterns correlate with citation */
  bestPractices: {
    /** Answer-first approach: concise 50-70 word direct answer near top */
    answerFirstWordCount: { min: 50, max: 70 },
    /** Clear hierarchical structure (H2/H3 headings) */
    hierarchicalStructure: true,
    /** Scannable formatting (bullets, tables, short paragraphs) */
    scannableFormatting: true,
    /** Strong entity signals (clear who/what/where) */
    entitySignals: true,
    /** ~92% of cited domains rank in top 10 organic results */
    topResultCorrelation: 0.92,
    /** Question-based queries 84% more likely to trigger AI Overview */
    questionQueryBoost: 0.84,
  },
} as const;

// ─── Indexing Configuration ─────────────────────────────────────────────────
export const INDEXING_CONFIG = {
  /** Google Indexing API only works for JobPosting/BroadcastEvent */
  indexingApiLimitedTo: ["JobPosting", "BroadcastEvent"],
  /** For blog content, use sitemap + IndexNow */
  blogIndexingMethods: ["sitemap_submission", "indexnow"],
  /** IndexNow batch limit */
  indexNowBatchMax: 10000,
  /** Google Indexing API daily quota */
  indexingApiDailyQuota: 200,
  /** Sitemap max URLs per file */
  sitemapMaxUrls: 50000,
  /** Sitemap max file size */
  sitemapMaxSizeMb: 50,
  /** Typical Google crawl delay for new URLs */
  typicalCrawlDelayDays: { min: 2, max: 14 },
} as const;

// ─── Technical SEO ──────────────────────────────────────────────────────────
export const TECHNICAL_SEO = {
  /** Use 301 for permanent redirects, keep 12+ months */
  permanentRedirectCode: 301,
  redirectMinMonths: 12,
  /** Max click depth for important content */
  maxClickDepth: 3,
  /** Canonical tags: self-referencing, absolute URLs */
  canonicalSelfReferencing: true,
  canonicalAbsoluteUrls: true,
  /** Hreflang: bidirectional, include x-default */
  hreflangBidirectional: true,
  hreflangIncludeXDefault: true,
  /** Robots.txt: not an indexing control, use noindex for that */
  robotsTxtNotIndexingControl: true,
  /** JSON-LD is Google's recommended structured data format */
  preferredSchemaFormat: "JSON-LD",
} as const;

// ─── Authoritative Sources ──────────────────────────────────────────────────
export const AUTHORITATIVE_SOURCES = {
  googleSearchCentral: "https://developers.google.com/search/docs",
  googleSearchBlog: "https://developers.google.com/search/blog",
  documentationChangelog: "https://developers.google.com/search/updates",
  qualityRaterGuidelines: "https://guidelines.raterhub.com/searchqualityevaluatorguidelines.pdf",
  searchStatusDashboard: "https://status.search.google.com",
  webDev: "https://web.dev",
  schemaOrg: "https://schema.org",
  richResultsTest: "https://search.google.com/test/rich-results",
  schemaValidator: "https://validator.schema.org",
} as const;

// ─── Helper: Check if a schema type is deprecated ───────────────────────────
export function isSchemaDeprecated(type: string): boolean {
  return SCHEMA_TYPES.deprecated.some(
    (d) => d.type.toLowerCase() === type.toLowerCase()
  );
}

// ─── Helper: Get deprecation info for a schema type ─────────────────────────
export function getSchemaDeprecationInfo(type: string) {
  return SCHEMA_TYPES.deprecated.find(
    (d) => d.type.toLowerCase() === type.toLowerCase()
  );
}
