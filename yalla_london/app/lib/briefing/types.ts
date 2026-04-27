/**
 * Briefing section types
 *
 * Each section is its own typed payload so the React Email template, the MCP
 * `briefing_get` tool, and any future consumers all read the same shape.
 *
 * Spec: docs/briefing/CEO-DAILY-BRIEFING.md
 */

export type Severity = "critical" | "high" | "medium" | "low" | "info";

// §1: Executive summary
export interface ExecutiveSummary {
  overallGrade: "A" | "B" | "C" | "D" | "F" | "?";
  overallScore: number;
  oneLine: string;
  topThreeWins: string[];
  topThreeAttention: string[];
}

// §2: Tests run
export interface TestsRun {
  totalRuns: number;
  passed: number;
  failed: number;
  byCron: Array<{ jobName: string; runs: number; failures: number; lastDurationMs: number | null }>;
}

// §3: Website status
export interface SiteStatusRow {
  siteId: string;
  publicAuditGrade: "A" | "B" | "C" | "D" | "F" | "?";
  publicAuditScore: number;
  dimensionScores: Record<string, number>;
  criticalIssues: number;
  highIssues: number;
}

// §4: GSC update
export interface GscUpdate {
  hasData: boolean;
  last7d: { clicks: number; impressions: number; avgCtr: number; avgPosition: number };
  prior7d: { clicks: number; impressions: number; avgCtr: number; avgPosition: number };
  delta: { clicks: number; impressions: number; ctrPp: number; positionPlaces: number };
  topMovers: Array<{ url: string; clicksDelta: number; positionDelta: number }>;
  trafficSparkline: number[]; // last 14 days, daily clicks
  notes?: string[];
}

// §5: GA4 numbers
export interface Ga4Numbers {
  hasData: boolean;
  last7d: { sessions: number; users: number; pageViews: number; engagementRate: number; bounceRate: number };
  topPages: Array<{ path: string; views: number }>;
  briefExplanation: string;
  trafficSparkline: number[]; // last 14 days, daily sessions
}

// §6: System logs deep audit
export interface SystemLogs {
  totalCronRuns: number;
  failedRuns: number;
  topFailures: Array<{ jobName: string; failures: number; lastError: string; severity: Severity }>;
  meaningfulFindings: string[]; // plain language insights extracted from logs
}

// §7: EN vs AR
export interface EnArComparison {
  publications: { en: number; ar: number; ratio: number };
  traffic: { enClicks: number; arClicks: number; enImpressions: number; arImpressions: number };
  enArTrafficRatio: number;
  notes: string[];
}

// §8: Traffic sources + countries
export interface TrafficSources {
  hasData: boolean;
  sources: Array<{ source: string; sessions: number; share: number }>;
  countries: Array<{ country: string; sessions: number; share: number }>;
}

// §9: Affiliate clicks + revenue
export interface AffiliateClicksRevenue {
  last7d: { clicks: number; revenueUsd: number; conversions: number };
  last30d: { clicks: number; revenueUsd: number; conversions: number };
  revenueSparkline: number[]; // last 30 days, daily revenue
}

// §10: Affiliate health
export interface AffiliateHealth {
  totalLinks: number;
  deadLinks: number;
  untrackedDirectUrls: number;
  missingDisclosure: number;
  uncoveredArticles: number;
  coveragePct: number;
  topIssues: Array<{ slug: string; issue: string; severity: Severity }>;
}

// §11: Affiliate comparisons
export interface AffiliateComparisons {
  byPartner: Array<{
    partner: string;
    clicks: number;
    conversions: number;
    revenueUsd: number;
    contentTypes: string[]; // e.g. "hotel", "activity", "transport"
  }>;
}

// §12: Affiliate trends
export interface AffiliateTrends {
  weekOverWeekRevenuePct: number;
  weekOverWeekClicksPct: number;
  movingAverages: { revenue7d: number; revenue30d: number };
  obviousTrends: string[]; // plain-language observations
}

// §13: Latest affiliate link updates
export interface AffiliateLinkUpdates {
  last24h: number;
  recentlyAdded: Array<{ partner: string; advertiser: string; addedAt: string }>;
  recentlyExpired: Array<{ partner: string; advertiser: string; expiredAt: string }>;
}

// §14: A/B testing
export interface AbTesting {
  active: number;
  completed: number;
  recentResults: Array<{
    name: string;
    variant: string;
    status: string;
    winner: string | null;
    confidence: number | null;
  }>;
}

// §15: Technical issues
export interface TechnicalIssues {
  criticalCount: number;
  highCount: number;
  byCategory: Record<string, number>;
  topIssues: Array<{
    severity: Severity;
    category: string;
    detail: string;
    why: string;
    fixPlan: string;
  }>;
}

// §16: Fixes applied (24h)
export interface FixesApplied {
  totalFixes: number;
  successCount: number;
  failureCount: number;
  byFixType: Array<{ fixType: string; count: number; successPct: number }>;
  recent: Array<{ targetSlug: string | null; fixType: string; agent: string; success: boolean }>;
}

// §17: Validation
export interface Validation {
  pendingValidation: number;
  byFixType: Array<{ fixType: string; how: string; whenToCheck: string }>;
}

// §18: KPIs and progress
export interface KpisProgress {
  kpis: Array<{
    name: string;
    actual: number | null;
    target30d: number;
    target90d: number;
    progressVs30d: number | null;
    grade: "A" | "B" | "C" | "D" | "F" | "?";
    unit: string;
  }>;
}

// §19: Per-site deep dive
export interface PerSiteDeepDive {
  siteId: string;
  niche: string;
  destination: string;
  businessLandscape: string;
  algorithmUpdates: Array<{ source: string; date: string; impact: string; ourResponse: string }>;
  improvementsProposed: Array<{
    title: string;
    expectedImpact: string;
    effort: "small" | "medium" | "large";
    plan: string[];
  }>;
  sevenDayPlan: string[];
}

// Wrapper for a section that may have failed during assembly.
export type SectionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface DailyBriefingData {
  metadata: {
    siteId: string | null;
    siteIds: string[]; // sites covered by this briefing
    briefingDate: string; // YYYY-MM-DD
    generatedAt: string; // ISO
    durationMs: number;
  };
  sections: {
    executiveSummary: SectionResult<ExecutiveSummary>;
    testsRun: SectionResult<TestsRun>;
    siteStatus: SectionResult<SiteStatusRow[]>;
    gscUpdate: SectionResult<GscUpdate>;
    ga4Numbers: SectionResult<Ga4Numbers>;
    systemLogs: SectionResult<SystemLogs>;
    enArComparison: SectionResult<EnArComparison>;
    trafficSources: SectionResult<TrafficSources>;
    affiliateClicksRevenue: SectionResult<AffiliateClicksRevenue>;
    affiliateHealth: SectionResult<AffiliateHealth>;
    affiliateComparisons: SectionResult<AffiliateComparisons>;
    affiliateTrends: SectionResult<AffiliateTrends>;
    affiliateLinkUpdates: SectionResult<AffiliateLinkUpdates>;
    abTesting: SectionResult<AbTesting>;
    technicalIssues: SectionResult<TechnicalIssues>;
    fixesApplied: SectionResult<FixesApplied>;
    validation: SectionResult<Validation>;
    kpisProgress: SectionResult<KpisProgress>;
    perSiteDeepDive: SectionResult<PerSiteDeepDive[]>;
  };
}
