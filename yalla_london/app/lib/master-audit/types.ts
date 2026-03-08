/**
 * Master Audit Engine — Type Definitions
 *
 * All TypeScript interfaces for the audit engine.
 * No external dependencies.
 */

// ---------------------------------------------------------------------------
// Severity & Categories
// ---------------------------------------------------------------------------

export type IssueSeverity = 'P0' | 'P1' | 'P2';

export type IssueCategory =
  | 'http'
  | 'canonical'
  | 'hreflang'
  | 'sitemap'
  | 'schema'
  | 'links'
  | 'metadata'
  | 'robots'
  | 'performance'
  | 'security'
  | 'content'
  | 'accessibility'
  | 'risk'
  | 'crawl';

export type AuditMode = 'full' | 'quick' | 'resume' | 'preview' | 'prod';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface CrawlSettings {
  /** Maximum concurrent requests */
  concurrency: number;
  /** URLs per batch */
  batchSize: number;
  /** Minimum ms between requests to same host */
  rateDelayMs: number;
  /** Per-request timeout in ms */
  timeoutMs: number;
  /** Max retry attempts per URL */
  maxRetries: number;
  /** Base delay for exponential backoff in ms */
  retryBaseDelayMs: number;
  /** Max redirect hops to follow */
  maxRedirects: number;
  /** User-Agent header */
  userAgent: string;
  /** Allowed HTTP status codes (others are flagged) */
  allowedStatuses: number[];
}

export interface ValidatorConfig {
  /** Enable/disable individual validators */
  enabled: {
    http: boolean;
    canonical: boolean;
    hreflang: boolean;
    sitemap: boolean;
    schema: boolean;
    links: boolean;
    metadata: boolean;
    robots: boolean;
    crawlFreshness: boolean;
  };
  /** Meta title length bounds */
  titleLength: { min: number; max: number };
  /** Meta description length bounds */
  descriptionLength: { min: number; max: number };
  /** Expected hreflang language codes */
  expectedHreflangLangs: string[];
  /** Maximum redirect chain length */
  maxRedirectChain: number;
  /** URL patterns to skip validation for (glob patterns) */
  excludePatterns: string[];
  /** Maximum URLs allowed in sitemap */
  maxSitemapUrls: number;
  /** Required JSON-LD types by route pattern */
  requiredSchemaByRoute: Record<string, string[]>;
  /** Deprecated JSON-LD types to flag */
  deprecatedSchemaTypes: string[];
  /** Query params allowed in canonical URLs */
  allowedCanonicalParams: string[];
}

export interface RiskScannerConfig {
  /** Enable/disable risk scanners */
  enabled: {
    thinContent: boolean;
    duplicateContent: boolean;
    orphanPages: boolean;
    scaledContentAbuse: boolean;
    siteReputationAbuse: boolean;
    expiredDomainAbuse: boolean;
  };
  /** Minimum word count to avoid thin content flag */
  minWordCount: number;
  /** Word count below which content is flagged as very thin */
  thinContentThreshold: number;
  /** Jaccard similarity threshold (0-1) for duplicate detection */
  duplicateSimilarityThreshold: number;
  /** Minimum cluster size to flag as scaled content abuse */
  scaledContentMinClusterSize: number;
  /** Minimum entity coverage score (0-1) for content relevance */
  entityCoverageMinScore: number;
  /** Outbound link ratio threshold (0-1) for site reputation abuse */
  outboundDominanceThreshold: number;
  /** Topic pivot score threshold (0-1) for expired domain abuse */
  topicPivotScoreThreshold: number;
}

export interface HardGateConfig {
  /** Gate name */
  name: string;
  /** Category this gate evaluates */
  category: IssueCategory;
  /** Maximum P0 issues allowed (0 = none tolerated) */
  maxP0: number;
  /** Maximum total issues allowed (-1 = unlimited) */
  maxTotal: number;
  /** Human-readable description */
  description: string;
}

export interface AuditConfig {
  /** Site identifier */
  siteId: string;
  /** Base URL for crawling */
  baseUrl: string;
  /** Crawl settings */
  crawl: CrawlSettings;
  /** Validator configuration */
  validators: ValidatorConfig;
  /** Risk scanner configuration */
  riskScanners: RiskScannerConfig;
  /** Hard gates that block deployment */
  hardGates: HardGateConfig[];
  /** Static routes to include in inventory */
  staticRoutes: string[];
  /** Whether to include /ar/ variant URLs */
  includeArVariants: boolean;
  /** Output directory (relative to process.cwd()) */
  outputDir: string;
}

// ---------------------------------------------------------------------------
// Audit State (for resume support)
// ---------------------------------------------------------------------------

export type AuditStatus = 'running' | 'paused' | 'completed' | 'failed';

export interface BatchState {
  batchIndex: number;
  urls: string[];
  status: 'pending' | 'completed' | 'failed';
  startTime: string | null;
  endTime: string | null;
}

export interface AuditState {
  runId: string;
  siteId: string;
  mode: AuditMode;
  status: AuditStatus;
  baseUrl: string;
  progress: {
    totalUrls: number;
    processedUrls: number;
    percentComplete: number;
  };
  batches: BatchState[];
  completedBatchIndices: number[];
  /** Issues found so far (accumulated across batches) */
  issueCount: number;
  errors: Array<{ timestamp: string; message: string; url?: string }>;
  startTime: string;
  lastUpdated: string;
}

// ---------------------------------------------------------------------------
// Crawl Results
// ---------------------------------------------------------------------------

export interface RedirectHop {
  url: string;
  status: number;
}

export interface CrawlResult {
  url: string;
  status: number;
  redirectChain: RedirectHop[];
  finalUrl: string;
  headers: Record<string, string>;
  html: string;
  timing: {
    startMs: number;
    endMs: number;
    durationMs: number;
  };
  error?: string;
}

// ---------------------------------------------------------------------------
// Extracted Signals
// ---------------------------------------------------------------------------

export interface HeadingEntry {
  level: number;
  text: string;
}

export interface HreflangEntry {
  hreflang: string;
  href: string;
}

export interface LinkEntry {
  href: string;
  text: string;
  rel?: string;
}

export interface ExtractedSignals {
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robotsMeta: string | null;
  hreflangAlternates: HreflangEntry[];
  headings: HeadingEntry[];
  jsonLd: unknown[];
  internalLinks: LinkEntry[];
  externalLinks: LinkEntry[];
  langAttr: string | null;
  dirAttr: string | null;
  wordCount: number;
}

// ---------------------------------------------------------------------------
// Audit Issues
// ---------------------------------------------------------------------------

export interface IssueEvidence {
  file?: string;
  jsonPath?: string;
  snippet?: string;
}

export interface IssueSuggestedFix {
  scope: 'systemic' | 'page-level';
  target: string;
  notes: string;
}

export interface AuditIssue {
  severity: IssueSeverity;
  category: IssueCategory;
  url: string;
  message: string;
  evidence?: IssueEvidence;
  suggestedFix?: IssueSuggestedFix;
}

// ---------------------------------------------------------------------------
// Hard Gate Results
// ---------------------------------------------------------------------------

export interface HardGateResult {
  gateName: string;
  passed: boolean;
  count: number;
  threshold: number;
  urls: string[];
}

// ---------------------------------------------------------------------------
// Soft Gate (informational, non-blocking)
// ---------------------------------------------------------------------------

export interface SoftGateResult {
  gateName: string;
  count: number;
  urls: string[];
  description: string;
}

// ---------------------------------------------------------------------------
// URL Inventory Entry
// ---------------------------------------------------------------------------

export interface UrlInventoryEntry {
  url: string;
  source: 'sitemap' | 'static' | 'ar-variant';
  status?: number;
  issueCount?: number;
}

// ---------------------------------------------------------------------------
// Final Audit Run Result
// ---------------------------------------------------------------------------

/** Crawl freshness data collected from GSC URL Inspection results stored in DB */
export interface CrawlFreshnessData {
  /** When the sitemap was last fetched and its response time (ms) */
  sitemapCheck: {
    reachable: boolean;
    responseTimeMs: number;
    statusCode: number;
    urlCount: number;
    checkedAt: string;
    error?: string;
  };
  /** Per-URL crawl data from URLIndexingStatus table */
  pages: Array<PageIndexingDetail>;
  /** Summary statistics */
  summary: CrawlFreshnessSummary;
  /** Indexing health snapshot — mirrors IndexingSummary from indexing-summary.ts */
  indexingHealth?: IndexingHealthSnapshot;
}

/** Comprehensive per-page indexing/crawling detail — maximum data extraction */
export interface PageIndexingDetail {
  url: string;
  // Crawl timing
  lastCrawledAt: string | null;
  lastInspectedAt: string | null;
  daysSinceLastCrawl: number | null;
  // Indexing status
  status: string | null;           // Our tracking status (indexed, submitted, discovered, etc.)
  indexingState: string | null;     // GSC: INDEXING_ALLOWED, etc.
  coverageState: string | null;     // GSC: "Submitted and indexed", "Crawled - currently not indexed", etc.
  // Submission history
  submittedIndexnow: boolean;
  submittedSitemap: boolean;
  submittedGoogleApi: boolean;
  submissionAttempts: number;
  lastSubmittedAt: string | null;
  lastError: string | null;
  // GSC Inspection details (from inspection_result JSON)
  inspection?: {
    verdict: string | null;             // PASS, NEUTRAL, FAIL
    robotsTxtState: string | null;      // ALLOWED, DISALLOWED
    indexingAllowed: string | null;      // INDEXING_ALLOWED, DISALLOWED
    crawlAllowed: string | null;        // CRAWLING_ALLOWED, DISALLOWED
    pageFetchState: string | null;      // SUCCESSFUL, SOFT_404, etc.
    crawledAs: string | null;           // DESKTOP, MOBILE
    userCanonical: string | null;
    googleCanonical: string | null;
    canonicalMismatch: boolean;
    mobileUsabilityVerdict: string | null;
    richResultsVerdict: string | null;
    referringUrlCount: number;
    sitemapCount: number;
  };
  // GSC Search Analytics performance (from GscPagePerformance)
  gscPerformance?: {
    clicks7d: number;
    impressions7d: number;
    ctr7d: number;
    position7d: number;
    clicks30d: number;
    impressions30d: number;
    impressionsTrend: number | null;  // % change week-over-week
  };
}

export interface CrawlFreshnessSummary {
  totalTracked: number;
  crawledWithin7d: number;
  crawledWithin14d: number;
  crawledWithin30d: number;
  neverCrawled: number;
  oldestCrawlDate: string | null;
  newestCrawlDate: string | null;
  averageDaysSinceCrawl: number | null;
  // Indexing breakdown
  indexed: number;
  submitted: number;
  discovered: number;
  errors: number;
  deindexed: number;
  neverSubmitted: number;
  // GSC aggregate
  totalClicks7d: number;
  totalImpressions7d: number;
  avgPosition7d: number | null;
  // Submission channel breakdown
  viaIndexnow: number;
  viaSitemap: number;
  viaGoogleApi: number;
}

/** Site-level indexing health snapshot for master audit report */
export interface IndexingHealthSnapshot {
  indexingRate: number;        // % of pages indexed
  submissionRate: number;      // % of pages submitted or indexed
  avgTimeToIndexDays: number | null;
  staleSubmissions: number;    // submitted >14d ago, still not indexed
  chronicFailures: number;     // 5+ attempts, still not indexed
  hreflangMismatches: number;
  topBlockers: string[];
}

export interface AuditRunResult {
  runId: string;
  siteId: string;
  mode: AuditMode;
  startTime: string;
  endTime: string;
  totalUrls: number;
  issues: AuditIssue[];
  hardGates: HardGateResult[];
  softGates: SoftGateResult[];
  urlInventory: UrlInventoryEntry[];
  crawlFreshness?: CrawlFreshnessData;
}
