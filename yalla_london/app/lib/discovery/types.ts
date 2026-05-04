/**
 * Discovery Engine — Types
 *
 * Comprehensive type system for search engine + AI engine discovery monitoring.
 * Covers: Google, Bing, Yandex, AI Overviews, ChatGPT, Perplexity, Claude, Apple Intelligence.
 */

// ─── Discovery Channels ──────────────────────────────────────────────────────

export type SearchEngine = "google" | "bing" | "yandex";
export type AIEngine = "google_aio" | "chatgpt" | "perplexity" | "claude" | "apple_intelligence";
export type DiscoveryChannel = SearchEngine | AIEngine;

export type CrawlStatus = "crawled" | "not_crawled" | "blocked" | "error" | "redirect";
export type IndexStatus = "indexed" | "submitted" | "discovered" | "not_indexed" | "deindexed" | "error" | "never_submitted";
export type AIOStatus = "cited" | "eligible" | "not_eligible" | "unknown";

export type FixSeverity = "critical" | "high" | "medium" | "low";
export type FixCategory =
  | "crawlability"
  | "indexability"
  | "content_quality"
  | "structured_data"
  | "meta_tags"
  | "internal_linking"
  | "performance"
  | "mobile"
  | "security"
  | "aio_readiness"
  | "hreflang"
  | "freshness"
  | "authority";

// ─── Page-Level Discovery Report ─────────────────────────────────────────────

export interface PageDiscoveryReport {
  // Identity
  url: string;
  slug: string;
  title: string;
  titleAr: string | null;
  siteId: string;
  contentType: "blog" | "news" | "information" | "guide" | "static" | "yacht" | "destination" | "itinerary";
  publishedAt: string | null;
  updatedAt: string | null;

  // Crawl Layer
  crawl: {
    status: CrawlStatus;
    httpStatus: number | null;
    lastCrawledAt: string | null;
    crawlBudgetWaste: boolean; // soft 404, redirect chain, etc.
    robotsBlocked: boolean;
    canonicalCorrect: boolean;
    canonicalUrl: string | null;
    redirectChain: string[]; // empty = no redirects
    responseTimeMs: number | null;
    mobileUsable: boolean;
  };

  // Index Layer
  index: {
    status: IndexStatus;
    coverageState: string | null; // GSC coverage state verbatim
    submittedChannels: {
      indexnow: boolean;
      sitemap: boolean;
      googleApi: boolean;
    };
    submissionAttempts: number;
    lastSubmittedAt: string | null;
    lastInspectedAt: string | null;
    timeToIndexDays: number | null;
    inSitemap: boolean;
  };

  // Performance Layer (GSC data)
  performance: {
    clicks7d: number;
    impressions7d: number;
    ctr7d: number;
    position7d: number;
    clicks30d: number;
    impressions30d: number;
    ctr30d: number;
    position30d: number;
    trend: "improving" | "declining" | "stable" | "new" | "no_data";
    trendDetail: string; // e.g., "+45% impressions vs prev 7d"
  };

  // Content Quality Layer
  content: {
    wordCount: number;
    wordCountAr: number;
    internalLinksCount: number;
    externalLinksCount: number;
    affiliateLinksCount: number;
    hasAuthorAttribution: boolean;
    authenticityScore: number; // 0-100
    readabilityGrade: number; // Flesch-Kincaid
    headingHierarchyValid: boolean;
    h1Count: number;
    h2Count: number;
    imagesWithAlt: number;
    imagesWithoutAlt: number;
  };

  // Structured Data Layer
  structuredData: {
    hasJsonLd: boolean;
    types: string[]; // e.g., ["Article", "BreadcrumbList", "Organization"]
    errors: string[];
    warnings: string[];
    hasBreadcrumb: boolean;
    hasArticleSchema: boolean;
    hasOrganizationSchema: boolean;
    hasFaqSchema: boolean; // deprecated — should warn
  };

  // Meta Tags Layer
  meta: {
    titleLength: number;
    titleOptimal: boolean; // 30-60 chars
    descriptionLength: number;
    descriptionOptimal: boolean; // 120-160 chars
    hasOgImage: boolean;
    hasTwitterCard: boolean;
    ogImageUrl: string | null;
    robotsDirective: string | null; // "index, follow" etc.
    hasNoindex: boolean;
    hasNofollow: boolean;
  };

  // Hreflang Layer
  hreflang: {
    hasEnglish: boolean;
    hasArabic: boolean;
    hasXDefault: boolean;
    reciprocalValid: boolean;
    arabicPageExists: boolean;
    arabicPageIndexed: boolean;
  };

  // AIO Readiness Layer
  aio: {
    status: AIOStatus;
    directAnswerInFirst80Words: boolean;
    hasQuestionH2s: boolean;
    hasDefinitiveStatements: boolean;
    hasCitableData: boolean; // statistics, dates, prices
    hasListsOrTables: boolean;
    estimatedAIOEligibility: number; // 0-100
  };

  // Page Speed Layer
  speed: {
    lcp: number | null;
    inp: number | null;
    cls: number | null;
    performanceScore: number | null;
    issues: string[];
  };

  // Issues & Fixes
  issues: DiscoveryIssue[];
  overallScore: number; // 0-100
  overallGrade: "A" | "B" | "C" | "D" | "F";
}

// ─── Issues & Fixes ──────────────────────────────────────────────────────────

export interface DiscoveryIssue {
  id: string;
  category: FixCategory;
  severity: FixSeverity;
  title: string; // Short: "Missing meta description"
  description: string; // Detailed: "This page has no meta description, reducing CTR by ~30%"
  impact: string; // Business impact: "Estimated -15 clicks/week"
  fixAction: DiscoveryFixAction | null;
  detectedAt: string;
  autoFixable: boolean;
}

export interface DiscoveryFixAction {
  id: string;
  label: string; // Button text: "Generate Meta Description"
  description: string; // "AI will create a 120-155 char description based on content"
  method: "POST";
  endpoint: string;
  payload: Record<string, unknown>;
  estimatedTimeMs: number; // For UI progress indicator
  requiresAI: boolean;
  destructive: boolean; // Shows confirmation dialog if true
}

// ─── Site-Level Summary ──────────────────────────────────────────────────────

export interface SiteDiscoverySummary {
  siteId: string;
  siteName: string;
  domain: string;
  scannedAt: string;
  totalPages: number;
  totalIssues: number;

  // Discovery funnel
  funnel: {
    published: number;
    inSitemap: number;
    submitted: number;
    crawled: number;
    indexed: number;
    performing: number; // Has >0 impressions
    converting: number; // Has >0 clicks
  };

  // Issue breakdown
  issuesBySeverity: Record<FixSeverity, number>;
  issuesByCategory: Record<FixCategory, number>;

  // Trend indicators
  indexingRate: number; // 0-100%
  indexingVelocity7d: number; // newly indexed this week
  avgTimeToIndex: number; // days
  avgPosition: number;
  totalClicks7d: number;
  totalImpressions7d: number;
  avgCtr: number;

  // AIO readiness
  aioEligiblePages: number;
  aioEligibleRate: number; // 0-100%

  // Health scores
  overallScore: number; // 0-100
  overallGrade: "A" | "B" | "C" | "D" | "F";
  crawlabilityScore: number;
  indexabilityScore: number;
  contentQualityScore: number;
  aioReadinessScore: number;

  // Top issues (max 10, sorted by impact)
  topIssues: DiscoveryIssue[];

  // Pages needing attention (max 20)
  pagesNeedingAttention: Array<{
    url: string;
    slug: string;
    title: string;
    score: number;
    topIssue: string;
    fixAction: DiscoveryFixAction | null;
  }>;
}

// ─── Discovery Monitor Snapshot (stored in DB) ───────────────────────────────

export interface DiscoverySnapshot {
  id: string;
  siteId: string;
  createdAt: string;
  summary: SiteDiscoverySummary;
  pages: PageDiscoveryReport[];
}

// ─── API Response Types ──────────────────────────────────────────────────────

export interface DiscoveryAPIResponse {
  success: boolean;
  summary: SiteDiscoverySummary;
  pages: PageDiscoveryReport[];
  lastScanAt: string;
  nextScanAt: string | null;
}

export interface DiscoveryFixResponse {
  success: boolean;
  fixId: string;
  action: string;
  result: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    message: string;
  };
  error?: string;
}

// ─── Content Generation Discovery Requirements ──────────────────────────────

export interface DiscoveryRequirements {
  // Minimum requirements for content to be discoverable
  minWordCount: number;
  minInternalLinks: number;
  minAffiliateLinks: number;
  requireAuthorAttribution: boolean;
  requireAuthenticitySignals: number; // min count
  requireDirectAnswer: boolean; // AIO: answer in first 80 words
  requireQuestionH2: boolean; // AIO: at least 1 question-format H2
  requireStructuredData: boolean;
  requireMetaTitle: { min: number; max: number };
  requireMetaDescription: { min: number; max: number };
  requireHreflang: boolean;
  requireCanonical: boolean;
  maxGenericPhrases: number;
  requireCitableData: boolean; // AIO: statistics, dates, prices
}
