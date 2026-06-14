/**
 * Shared types for the Cockpit dashboard.
 * Extracted from page.tsx to enable reuse across ContentTab, ArticleDetailDrawer,
 * Tube Map (Plan B), and other cockpit components.
 */

// ─── System & Pipeline ──────────────────────────────────────────────────────

export interface SystemStatus {
  db: { connected: boolean; latencyMs: number; error: string | null };
  ai: { configured: boolean; provider: string | null; activeProviders: string[] };
  indexNow: { configured: boolean };
  gsc: { configured: boolean };
  cronSecret: { configured: boolean };
  nextAuthSecret: { configured: boolean };
  email?: { configured: boolean; provider: string | null };
}

export interface PipelineStatus {
  topicsReady: number;
  topicsTotal: number;
  draftsActive: number;
  reservoir: number;
  publishedToday: number;
  publishedTotal: number;
  byPhase: Record<string, number>;
  stuckDrafts: Array<{ id: string; keyword: string; phase: string; hoursStuck: number; lastError: string | null; plainError: string }>;
}

export interface Alert {
  severity: "critical" | "warning" | "info";
  code: string;
  message: string;
  detail: string;
  fix: string;
  action?: string;
}

export interface SiteSummary {
  id: string;
  name: string;
  domain: string;
  isActive: boolean;
  articlesTotal: number;
  articlesPublished: number;
  reservoir: number;
  inPipeline: number;
  avgSeoScore: number;
  indexRate: number;
  topicsQueued: number;
  lastPublishedAt: string | null;
  lastCronAt: string | null;
  dataError: string | null;
}

export interface RevenueSnapshot {
  affiliateClicksToday: number;
  affiliateClicksWeek: number;
  conversionsWeek: number;
  revenueWeekUsd: number;
  topPartner: string | null;
  aiCostWeekUsd: number;
}

export interface TrafficSnapshot {
  sessions7d: number;
  users7d: number;
  pageViews7d: number;
  bounceRate: number;
  avgSessionDuration: number;
  topPages: Array<{ path: string; pageViews: number }>;
  topSources: Array<{ source: string; sessions: number }>;
  configured: boolean;
  fetchedAt: string | null;
}

export interface CockpitData {
  system: SystemStatus;
  pipeline: PipelineStatus;
  indexing: {
    total: number; indexed: number; submitted: number; discovered: number; neverSubmitted: number; errors: number; rate: number;
    staleCount: number; orphanedCount: number; deindexedCount: number; chronicFailures: number; velocity7d: number; velocity7dPrevious: number;
    avgTimeToIndexDays: number | null; topBlocker: string | null;
    blockers: Array<{ reason: string; count: number; severity: "critical" | "warning" | "info" }>;
    lastSubmissionAge: string | null; lastVerificationAge: string | null;
    channelBreakdown: { indexnow: number; sitemap: number; googleApi: number };
    gscTotalClicks7d: number; gscTotalImpressions7d: number;
    gscClicksTrend: number | null; gscImpressionsTrend: number | null;
    lastGscSync: string | null;
    dataSource?: "full" | "lightweight";
    impressionDiagnostic?: {
      gscDelayNote: string | null;
      blockedByGate: number;
      publishVelocity: { thisWeek: number; lastWeek: number };
      topDroppers: Array<{ url: string; impressionsDelta: number }>;
    } | null;
    gscTruth?: {
      confirmedIndexed: number;
      coverageReasons: Array<{ reason: string; count: number }>;
      totalWithCoverageState: number;
      untrackedButIndexed: number;
      totalInspected: number;
    };
  };
  cronHealth: { failedLast24h: number; timedOutLast24h: number; lastRunAt: string | null; recentJobs: Array<{ name: string; status: string; durationMs: number | null; startedAt: string; error: string | null; plainError: string | null; itemsProcessed: number }> };
  revenue: RevenueSnapshot;
  traffic: TrafficSnapshot;
  alerts: Alert[];
  sites: SiteSummary[];
  timestamp: string;
  builderErrors?: string[];
}

// ─── Content Matrix ─────────────────────────────────────────────────────────

export interface ContentItem {
  id: string;
  type: "published" | "draft";
  title: string;
  titleAr: string | null;
  slug: string | null;
  url: string | null;
  locale: string;
  siteId: string;
  status: string;
  generatedAt: string;
  publishedAt: string | null;
  qualityScore: number | null;
  seoScore: number | null;
  wordCount: number;
  internalLinksCount: number;
  indexingStatus: string | null;
  coverageState: string | null;
  lastSubmittedAt: string | null;
  lastCrawledAt: string | null;
  gscClicks: number | null;
  gscImpressions: number | null;
  rejectionReason: string | null;
  lastError: string | null;
  plainError: string | null;
  phase: string | null;
  phaseProgress: number;
  hoursInPhase: number;
  pairedDraftId: string | null;
  metaTitleEn: string | null;
  metaDescriptionEn: string | null;
  tags: string[];
  topicTitle: string | null;
  photoOrderQuery: string | null;
  photoOrderStatus: string | null;
  sourcePipeline?: string | null;
  traceId?: string | null;
  // Phase 3.1 additions for UX features
  wordCountAr?: number;
  hasUnreviewedEnhancements?: boolean;
  enhancementSummary?: Array<{ type: string; timestamp: string; cron?: string }>;
  affiliateClicks7d?: number;
  featuredImage?: string | null;
}

export interface ContentMatrixData {
  articles: ContentItem[];
  summary: { total: number; published: number; reservoir: number; inPipeline: number; rejected: number; stuck: number };
  siteId: string;
}

export interface GateCheck {
  check: string;
  pass: boolean;
  label: string;
  detail: string | null;
  isBlocker: boolean;
}

export interface ResearchedTopic {
  rank: number;
  keyword: string;
  longTails: string[];
  searchVolume: "high" | "medium" | "low";
  estimatedMonthlySearches: string;
  trend: "rising" | "stable" | "declining";
  trendEvidence: string;
  competition: "low" | "medium" | "high";
  relevanceScore: number;
  suggestedPageType: string;
  contentAngle: string;
  rationale: string;
  questions: string[];
}

export interface LatestPublishedArticle {
  id: string;
  title: string;
  slug: string;
  url: string;
  pageType: string;
  seoScore: number | null;
  publishedAt: string;
  updatedAt: string;
  indexingStatus: string;
  coverageState: string | null;
  submittedIndexNow: boolean;
  submittedGoogleApi: boolean;
  submittedSitemap: boolean;
  lastSubmittedAt: string | null;
  lastInspectedAt: string | null;
  lastCrawledAt: string | null;
  indexingError: string | null;
  indexingTrackedSince: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
}

export interface BulkQueueResult {
  success: boolean;
  mode?: string;
  queued?: number;
  message?: string;
  error?: string;
  articles?: Array<{ keyword: string; draftId: string; topicId: string | null; status: string }>;
}

// ─── AI Config ──────────────────────────────────────────────────────────────

export interface ProviderInfo {
  id: string;
  name: string;
  displayName: string;
  isActive: boolean;
  hasKey: boolean;
  testStatus: string | null;
  lastTestedAt: string | null;
}

export interface RouteInfo {
  taskType: string;
  label: string;
  primary: string;
  primaryModel: string;
  fallback: string | null;
  status: "active" | "fallback_only" | "inactive";
}

export interface AIConfigData {
  providers: ProviderInfo[];
  routes: RouteInfo[];
  providerKeyStatus: Record<string, boolean>;
  providerWarnings?: Record<string, string>;
}

// ─── Action Results ─────────────────────────────────────────────────────────

export interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

// ─── Utility functions (shared across cockpit components) ───────────────────

export function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function scoreColor(score: number | null): string {
  if (score === null) return "text-stone-400";
  if (score >= 80) return "text-[#2D5A3D]";
  if (score >= 60) return "text-[#C49A2A]";
  return "text-[#C8322B]";
}

export function statusBadge(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    published: { label: "Published", color: "bg-[rgba(45,90,61,0.08)] text-[#2D5A3D] border-[rgba(45,90,61,0.2)]" },
    reservoir: { label: "Ready", color: "bg-[rgba(59,126,161,0.08)] text-[#1e5a7a] border-[rgba(59,126,161,0.2)]" },
    scoring: { label: "Scoring", color: "bg-[rgba(124,58,237,0.08)] text-[#5B21B6] border-[rgba(124,58,237,0.2)]" },
    seo: { label: "SEO Check", color: "bg-[rgba(124,58,237,0.08)] text-[#5B21B6] border-[rgba(124,58,237,0.2)]" },
    assembly: { label: "Assembling", color: "bg-[rgba(196,154,42,0.08)] text-[#7a5a10] border-[rgba(196,154,42,0.2)]" },
    drafting: { label: "Drafting", color: "bg-[rgba(196,154,42,0.08)] text-[#7a5a10] border-[rgba(196,154,42,0.2)]" },
    outline: { label: "Outlining", color: "bg-[rgba(196,154,42,0.08)] text-[#7a5a10] border-[rgba(196,154,42,0.2)]" },
    research: { label: "Research", color: "bg-[rgba(196,154,42,0.08)] text-[#7a5a10] border-[rgba(196,154,42,0.2)]" },
    images: { label: "Images", color: "bg-[rgba(196,154,42,0.08)] text-[#7a5a10] border-[rgba(196,154,42,0.2)]" },
    rejected: { label: "Rejected", color: "bg-[rgba(200,50,43,0.08)] text-[#C8322B] border-[rgba(200,50,43,0.2)]" },
    stuck: { label: "Stuck", color: "bg-[rgba(217,119,6,0.08)] text-[#92400E] border-[rgba(217,119,6,0.2)]" },
  };
  return map[status] ?? { label: status, color: "bg-stone-50 text-stone-500 border-stone-200" };
}
