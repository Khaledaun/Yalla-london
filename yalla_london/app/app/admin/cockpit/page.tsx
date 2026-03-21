"use client";
/**
 * /admin/cockpit — Mission Control Dashboard
 *
 * 7-tab ops center giving Khaled full visibility and control over the platform
 * from his iPhone. Zero mock data. Every button calls a real API.
 *
 * Tabs:
 *  1. Mission     — system status, pipeline overview, alerts, quick actions
 *  2. Content     — full article table with "Why not published?" gate check panel
 *  3. Pipeline    — per-site workflow control (content, SEO, topics, social)
 *  4. Crons       — cron job health, history, retry controls
 *  5. Sites       — per-site summary cards
 *  6. AI Config   — provider status + task routing mixer
 *  7. Settings    — env vars, testing tools, feature flags
 */

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ChevronDown, AlertTriangle, FileText, Settings, Zap } from "lucide-react";
import {
  AdminCard,
  AdminPageHeader,
  AdminSectionLabel,
  AdminStatusBadge,
  AdminKPICard,
  AdminButton,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
  AdminTabs,
} from "@/components/admin/admin-ui";

// ─── Types from API responses ────────────────────────────────────────────────

interface SystemStatus {
  db: { connected: boolean; latencyMs: number; error: string | null };
  ai: { configured: boolean; provider: string | null; activeProviders: string[] };
  indexNow: { configured: boolean };
  gsc: { configured: boolean };
  cronSecret: { configured: boolean };
  nextAuthSecret: { configured: boolean };
  email?: { configured: boolean; provider: string | null };
}

interface PipelineStatus {
  topicsReady: number;
  topicsTotal: number;
  draftsActive: number;
  reservoir: number;
  publishedToday: number;
  publishedTotal: number;
  byPhase: Record<string, number>;
  stuckDrafts: Array<{ id: string; keyword: string; phase: string; hoursStuck: number; lastError: string | null; plainError: string }>;
}

interface Alert {
  severity: "critical" | "warning" | "info";
  code: string;
  message: string;
  detail: string;
  fix: string;
  action?: string;
}

interface SiteSummary {
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

interface RevenueSnapshot {
  affiliateClicksToday: number;
  affiliateClicksWeek: number;
  conversionsWeek: number;
  revenueWeekUsd: number;
  topPartner: string | null;
  aiCostWeekUsd: number;
}

interface CockpitData {
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
  };
  cronHealth: { failedLast24h: number; timedOutLast24h: number; lastRunAt: string | null; recentJobs: Array<{ name: string; status: string; durationMs: number | null; startedAt: string; error: string | null; plainError: string | null; itemsProcessed: number }> };
  revenue: RevenueSnapshot;
  traffic: TrafficSnapshot;
  alerts: Alert[];
  sites: SiteSummary[];
  timestamp: string;
  builderErrors?: string[];
}

interface TrafficSnapshot {
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

interface ContentItem {
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
}

interface ContentMatrixData {
  articles: ContentItem[];
  summary: { total: number; published: number; reservoir: number; inPipeline: number; rejected: number; stuck: number };
  siteId: string;
}

interface GateCheck {
  check: string;
  pass: boolean;
  label: string;
  detail: string | null;
  isBlocker: boolean;
}

interface ResearchedTopic {
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

interface LatestPublishedArticle {
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

interface BulkQueueResult {
  success: boolean;
  mode?: string;
  queued?: number;
  message?: string;
  error?: string;
  articles?: Array<{ keyword: string; draftId: string; topicId: string | null; status: string }>;
}

interface ProviderInfo {
  id: string;
  name: string;
  displayName: string;
  isActive: boolean;
  hasKey: boolean;
  testStatus: string | null;
  lastTestedAt: string | null;
}

interface RouteInfo {
  taskType: string;
  label: string;
  primary: string;
  primaryModel: string;
  fallback: string | null;
  status: "active" | "fallback_only" | "inactive";
}

interface AIConfigData {
  providers: ProviderInfo[];
  routes: RouteInfo[];
  providerKeyStatus: Record<string, boolean>;
  providerWarnings?: Record<string, string>;
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-stone-400";
  if (score >= 80) return "text-[#2D5A3D]";
  if (score >= 60) return "text-[#C49A2A]";
  return "text-[#C8322B]";
}

function statusBadge(status: string): { label: string; color: string } {
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

// ─── Shared components (clean light design wrappers) ─────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <AdminCard className={className}>
      {children}
    </AdminCard>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <AdminSectionLabel>{children}</AdminSectionLabel>;
}

function StatusDot({ ok, title }: { ok: boolean; title: string }) {
  return (
    <span title={title} className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? "bg-[#2D5A3D]" : "bg-[#C8322B]"}`} />
  );
}

function ActionButton({
  onClick,
  loading,
  disabled,
  variant = "default",
  children,
  className = "",
}: {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "default" | "danger" | "success" | "amber";
  children: React.ReactNode;
  className?: string;
}) {
  const variantMap: Record<string, "secondary" | "danger" | "success" | "primary"> = {
    default: "secondary",
    danger: "danger",
    success: "success",
    amber: "primary",
  };
  return (
    <AdminButton
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      variant={variantMap[variant] ?? "secondary"}
      size="sm"
      className={className}
    >
      {children}
    </AdminButton>
  );
}

// ─── Content Cleanup Card ─────────────────────────────────────────────────────

interface CleanupScanResult {
  totalArticles: number;
  artifacts: { count: number; items: Array<{ slug: string; field: string; before: string; after: string }> };
  duplicates: { clusters: number; totalDuplicates: number; publishedDuplicates: number; items: Array<{ keep: { slug: string; title: string; wordCount: number; seoScore: number | null }; duplicates: Array<{ slug: string; title: string; reason: string; published: boolean; wordCount: number }> }> };
}

function ContentCleanupCard({ siteId }: { siteId: string }) {
  const [scanResult, setScanResult] = useState<CleanupScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [fixing, setFixing] = useState<string | null>(null);
  const [fixResult, setFixResult] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const scan = async () => {
    setScanning(true);
    setFixResult(null);
    try {
      const res = await fetch(`/api/admin/content-cleanup?siteId=${encodeURIComponent(siteId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setScanResult(data);
    } catch (err) {
      setFixResult(`❌ Scan failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setScanning(false);
    }
  };

  const fix = async (action: "fix_artifacts" | "fix_duplicates" | "fix_all") => {
    setFixing(action);
    setFixResult(null);
    try {
      const res = await fetch("/api/admin/content-cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, siteId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setFixResult(`✅ Fixed ${data.artifactsFixed || 0} artifacts, unpublished ${data.duplicatesUnpublished || 0} duplicates`);
        // Re-scan to update numbers
        scan();
      } else {
        setFixResult(`❌ ${data.errors?.join(", ") || "Fix failed"}`);
      }
    } catch (err) {
      setFixResult(`❌ ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setFixing(null);
    }
  };

  const hasIssues = scanResult && (scanResult.artifacts.count > 0 || scanResult.duplicates.totalDuplicates > 0);

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <SectionTitle>Content Cleanup</SectionTitle>
        <ActionButton onClick={scan} loading={scanning}>
          {scanResult ? "🔄 Re-scan" : "🔍 Scan for Issues"}
        </ActionButton>
      </div>

      {!scanResult && !scanning && (
        <p className="text-xs text-stone-500">Tap Scan to check for title artifacts, overlength meta descriptions, and duplicate articles.</p>
      )}

      {scanResult && (
        <div className="space-y-3">
          {/* Summary badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${scanResult.artifacts.count > 0 ? "bg-[rgba(196,154,42,0.08)] text-[#7a5a10]" : "bg-[rgba(45,90,61,0.08)] text-[#2D5A3D]"}`}>
              {scanResult.artifacts.count} artifact{scanResult.artifacts.count !== 1 ? "s" : ""}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${scanResult.duplicates.totalDuplicates > 0 ? "bg-[rgba(200,50,43,0.08)] text-[#C8322B]" : "bg-[rgba(45,90,61,0.08)] text-[#2D5A3D]"}`}>
              {scanResult.duplicates.totalDuplicates} duplicate{scanResult.duplicates.totalDuplicates !== 1 ? "s" : ""} in {scanResult.duplicates.clusters} cluster{scanResult.duplicates.clusters !== 1 ? "s" : ""}
            </span>
            {scanResult.duplicates.publishedDuplicates > 0 && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-[rgba(200,50,43,0.10)] text-[#C8322B]">
                {scanResult.duplicates.publishedDuplicates} published dups!
              </span>
            )}
            <span className="px-2 py-1 rounded text-xs font-medium bg-stone-100 text-stone-400">
              {scanResult.totalArticles} total
            </span>
          </div>

          {/* Fix buttons */}
          {hasIssues && (
            <div className="grid grid-cols-3 gap-2">
              {scanResult.artifacts.count > 0 && (
                <ActionButton onClick={() => fix("fix_artifacts")} loading={fixing === "fix_artifacts"} variant="amber">
                  Fix Artifacts
                </ActionButton>
              )}
              {scanResult.duplicates.publishedDuplicates > 0 && (
                <ActionButton onClick={() => fix("fix_duplicates")} loading={fixing === "fix_duplicates"} variant="danger">
                  Dedup
                </ActionButton>
              )}
              <ActionButton onClick={() => fix("fix_all")} loading={fixing === "fix_all"} variant="success">
                Fix All
              </ActionButton>
            </div>
          )}

          {/* Expandable details */}
          {hasIssues && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 transition-colors"
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
              {expanded ? "Hide details" : "Show details"}
            </button>
          )}

          {expanded && scanResult.artifacts.count > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#C49A2A]">Artifacts Found:</p>
              {scanResult.artifacts.items.slice(0, 10).map((a, i) => (
                <div key={i} className="text-xs bg-stone-50 rounded p-2 space-y-0.5">
                  <div className="text-stone-400 truncate">{a.slug}</div>
                  <div className="text-[#C8322B] truncate">
                    <span className="text-stone-500">{a.field}:</span> {a.before}
                  </div>
                  <div className="text-[#2D5A3D] truncate">→ {a.after}</div>
                </div>
              ))}
              {scanResult.artifacts.items.length > 10 && (
                <p className="text-xs text-stone-500">...and {scanResult.artifacts.items.length - 10} more</p>
              )}
            </div>
          )}

          {expanded && scanResult.duplicates.items.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#C8322B]">Duplicate Clusters:</p>
              {scanResult.duplicates.items.slice(0, 5).map((cluster, i) => (
                <div key={i} className="text-xs bg-stone-50 rounded p-2 space-y-1">
                  <div className="text-[#2D5A3D] truncate">
                    KEEP: {cluster.keep.title} ({cluster.keep.wordCount}w, SEO:{cluster.keep.seoScore ?? "?"})
                  </div>
                  {cluster.duplicates.map((d, j) => (
                    <div key={j} className="text-[#C8322B] truncate pl-2">
                      DUP: {d.title} ({d.wordCount}w) — {d.reason} {d.published ? "⚠️ PUBLISHED" : ""}
                    </div>
                  ))}
                </div>
              ))}
              {scanResult.duplicates.items.length > 5 && (
                <p className="text-xs text-stone-500">...and {scanResult.duplicates.items.length - 5} more clusters</p>
              )}
            </div>
          )}
        </div>
      )}

      {fixResult && (
        <p className={`mt-2 text-xs p-2 rounded ${fixResult.startsWith("✅") ? "bg-[rgba(45,90,61,0.06)] text-[#2D5A3D]" : "bg-[rgba(200,50,43,0.06)] text-[#C8322B]"}`}>
          {fixResult}
        </p>
      )}
    </Card>
  );
}

// ─── Indexing Status Panel ────────────────────────────────────────────────────

interface IndexingArticleInfo {
  id: string;
  title: string;
  slug: string;
  url: string;
  publishedAt: string | null;
  seoScore: number;
  wordCount: number;
  indexingStatus: "indexed" | "submitted" | "discovered" | "not_indexed" | "error" | "never_submitted";
  submittedAt: string | null;
  lastCrawledAt: string | null;
  lastInspectedAt: string | null;
  coverageState: string | null;
  submittedIndexnow: boolean;
  submittedSitemap: boolean;
  submissionAttempts: number;
  notIndexedReasons: string[];
  fixAction: string | null;
  gscClicks: number | null;
  gscImpressions: number | null;
  gscCtr: number | null;
  gscPosition: number | null;
  inspection?: {
    verdict: string | null;
    robotsTxtState: string | null;
    indexingAllowed: string | null;
    crawlAllowed: string | null;
    pageFetchState: string | null;
    crawledAs: string | null;
    userCanonical: string | null;
    googleCanonical: string | null;
    canonicalMismatch: boolean;
    mobileUsabilityVerdict: string | null;
    richResultsVerdict: string | null;
    referringUrlCount: number;
    sitemapCount: number;
  };
}

interface IndexingPanelData {
  siteId: string;
  baseUrl: string;
  config: { hasIndexNowKey: boolean; hasGscCredentials: boolean; gscSiteUrl: string };
  summary: { total: number; indexed: number; submitted: number; discovered: number; notIndexed: number; neverSubmitted: number; errors: number };
  healthDiagnosis: { status: string; message: string; detail: string; indexingRate: number };
  articles: IndexingArticleInfo[];
  systemIssues: Array<{ severity: string; category: string; message: string; detail: string; fixAction?: string }>;
  recentActivity: Array<{ jobName: string; status: string; startedAt: string; durationMs: number; itemsProcessed: number; itemsSucceeded: number; errorMessage: string | null }>;
}

function IndexingPanel({ siteId, onClose, onSummaryUpdate }: { siteId: string; onClose: () => void; onSummaryUpdate?: (summary: { total: number; indexed: number; submitted: number; discovered: number; neverSubmitted: number; errors: number; rate: number }) => void }) {
  const [data, setData] = useState<IndexingPanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/content-indexing?siteId=${siteId}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
      // Push fresh summary numbers back to the cockpit so Mission tab stays in sync
      if (onSummaryUpdate && json.summary) {
        onSummaryUpdate({
          total: json.summary.total,
          indexed: json.summary.indexed,
          submitted: json.summary.submitted,
          discovered: json.summary.discovered,
          neverSubmitted: json.summary.neverSubmitted,
          errors: json.summary.errors,
          rate: json.summary.rate ?? (json.summary.total > 0 ? Math.round((json.summary.indexed / json.summary.total) * 100) : 0),
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load indexing data");
    } finally {
      setLoading(false);
    }
  }, [siteId, onSummaryUpdate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const submitArticle = async (slug: string) => {
    setSubmitLoading(slug);
    setSubmitResult(null);
    try {
      const res = await fetch("/api/admin/content-indexing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", slugs: [slug] }),
      });
      const json = await res.json();
      setSubmitResult(json.success ? `✅ Submitted "${slug}" for indexing` : `❌ ${json.error || "Submit failed"}`);
      await fetchData();
    } catch (e) {
      setSubmitResult(`❌ ${e instanceof Error ? e.message : "Error"}`);
    } finally {
      setSubmitLoading(null);
    }
  };

  const submitAll = async () => {
    setSubmitLoading("all");
    setSubmitResult(null);
    try {
      const res = await fetch("/api/admin/content-indexing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_all" }),
      });
      const json = await res.json();
      setSubmitResult(json.success ? `✅ Submitted all articles for indexing` : `❌ ${json.error || "Submit failed"}`);
      await fetchData();
    } catch (e) {
      setSubmitResult(`❌ ${e instanceof Error ? e.message : "Error"}`);
    } finally {
      setSubmitLoading(null);
    }
  };

  const verifyUrl = async (url: string) => {
    setSubmitLoading(`verify-${url}`);
    setSubmitResult(null);
    try {
      const res = await fetch("/api/admin/content-indexing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_url", url, siteId }),
      });
      const json = await res.json();
      if (json.success) {
        setSubmitResult(json.isIndexed
          ? `✅ ${json.url} is INDEXED (${json.coverageState || json.indexingState})`
          : `⚠️ ${json.url} — ${json.coverageState || json.message || "Not indexed yet"}`
        );
      } else {
        setSubmitResult(`❌ ${json.error || "Verify failed"}`);
      }
      await fetchData();
    } catch (e) {
      setSubmitResult(`❌ ${e instanceof Error ? e.message : "Error"}`);
    } finally {
      setSubmitLoading(null);
    }
  };

  const resubmitStuck = async () => {
    setSubmitLoading("resubmit-stuck");
    setSubmitResult(null);
    try {
      const res = await fetch("/api/admin/content-indexing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resubmit_stuck", siteId }),
      });
      const json = await res.json();
      setSubmitResult(json.success
        ? `✅ Resubmitted ${json.resubmitted} stuck articles`
        : `❌ ${json.error || "Resubmit failed"}`
      );
      await fetchData();
    } catch (e) {
      setSubmitResult(`❌ ${e instanceof Error ? e.message : "Error"}`);
    } finally {
      setSubmitLoading(null);
    }
  };

  const syncWithGoogle = async () => {
    setSubmitLoading("gsc-sync");
    setSubmitResult(null);
    try {
      // Route through admin departures API (server-side) so CRON_SECRET is attached.
      // Direct fetch to /api/cron/gsc-sync from client-side returns 401 because
      // CRON_SECRET is server-only and the client can't send the Bearer token.
      const res = await fetch("/api/admin/departures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "/api/cron/gsc-sync" }),
      });
      if (!res.ok) {
        setSubmitResult(`❌ GSC sync failed: HTTP ${res.status}`);
        await fetchData();
        return;
      }
      const json = await res.json();
      // Departures API wraps cron response in { triggered, result: { ... } }
      const cronResult = json.result && typeof json.result === "object" ? json.result : json;
      if (json.triggered && (cronResult.success !== false)) {
        const updated = cronResult.totalIndexedUpdated || 0;
        const newTracking = cronResult.totalNewTracking || 0;
        const pages = cronResult.totalPagesProcessed || 0;
        if (cronResult.message?.includes("not configured")) {
          setSubmitResult(`⚠️ ${cronResult.message}`);
        } else {
          setSubmitResult(`✅ GSC sync complete: ${pages} pages scanned, ${updated} newly confirmed indexed, ${newTracking} new URLs tracked`);
        }
      } else {
        const errMsg = cronResult.error || cronResult.message || json.error || "Unknown error";
        setSubmitResult(`❌ GSC sync failed: ${errMsg}`);
      }
      await fetchData();
    } catch (e) {
      setSubmitResult(`❌ ${e instanceof Error ? e.message : "GSC sync error"}`);
    } finally {
      setSubmitLoading(null);
    }
  };

  const statusColor = {
    indexed: "text-[#2D5A3D] bg-[rgba(45,90,61,0.08)] border-[rgba(45,90,61,0.3)]",
    submitted: "text-[#3B7EA1] bg-[rgba(59,126,161,0.08)] border-[rgba(59,126,161,0.3)]",
    not_indexed: "text-[#C49A2A] bg-[rgba(196,154,42,0.08)] border-[rgba(196,154,42,0.3)]",
    error: "text-[#C8322B] bg-[rgba(200,50,43,0.08)] border-[rgba(200,50,43,0.3)]",
    never_submitted: "text-stone-400 bg-stone-100/60 border-stone-200",
  } as const;

  const statusLabel = {
    indexed: "✅ Indexed",
    submitted: "⏳ Submitted",
    discovered: "🔍 Discovered",
    not_indexed: "⚠️ Not Indexed",
    error: "❌ Error",
    never_submitted: "— Not Submitted",
  } as const;

  const healthColor = {
    healthy: "border-[rgba(45,90,61,0.25)] bg-[rgba(45,90,61,0.06)]",
    warning: "border-[rgba(196,154,42,0.25)] bg-[rgba(196,154,42,0.06)]",
    critical: "border-[rgba(200,50,43,0.25)] bg-[rgba(200,50,43,0.06)]",
    not_started: "border-stone-200 bg-stone-100/30",
  } as const;

  const filtered = (data?.articles ?? []).filter((a) => {
    if (statusFilter === "all") return true;
    return a.indexingStatus === statusFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" role="dialog" aria-label="Indexing Status">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-stone-50 border-b border-stone-200 px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold text-white">🔍 Indexing Status</h2>
          <p className="text-xs text-stone-500">{siteId} — published articles only (GSC counts all URLs incl. /ar/ variants &amp; static pages)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-400 text-xs disabled:opacity-50"
            title="Refresh"
          >
            {loading ? "⏳" : "↻"}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-medium"
          >
            ✕ Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-screen-xl mx-auto w-full">
        {loading && !data && (
          <div className="flex items-center justify-center h-48">
            <p className="text-stone-500 text-sm">Loading indexing data…</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-[rgba(200,50,43,0.3)] bg-[rgba(200,50,43,0.06)] px-4 py-3 text-sm text-[#C8322B]">
            ⚠️ {error}
            <button onClick={fetchData} className="ml-3 underline text-xs">Retry</button>
          </div>
        )}

        {data && (
          <>
            {/* Health Diagnosis */}
            <div className={`rounded-xl border px-4 py-3 ${healthColor[data.healthDiagnosis.status as keyof typeof healthColor] || healthColor.not_started}`}>
              <div className="font-semibold text-sm text-stone-800">{data.healthDiagnosis.message}</div>
              <div className="text-xs text-stone-400 mt-1">{data.healthDiagnosis.detail}</div>
              {typeof data.healthDiagnosis.indexingRate === "number" && data.healthDiagnosis.indexingRate > 0 && (
                <div className="mt-2 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#2D5A3D] transition-all"
                    style={{ width: `${data.healthDiagnosis.indexingRate}%` }}
                  />
                </div>
              )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                ["Total", data.summary.total, "text-stone-600", "all"],
                ["Indexed", data.summary.indexed, "text-[#2D5A3D]", "indexed"],
                ["Submitted", data.summary.submitted, "text-[#3B7EA1]", "submitted"],
                ["Discovered", data.summary.discovered ?? 0, "text-[#C49A2A]", "discovered"],
                ["Untracked", data.summary.neverSubmitted, "text-stone-400", "never_submitted"],
                ["Errors", data.summary.errors, "text-[#C8322B]", "error"],
              ].map(([label, val, color, filter]) => (
                <button
                  key={label as string}
                  onClick={() => setStatusFilter(filter as string)}
                  className={`rounded-xl border text-center py-2.5 px-1 transition-colors ${
                    statusFilter === filter
                      ? "border-stone-300 bg-stone-100"
                      : "border-stone-200 bg-stone-50/50 hover:bg-stone-100/60"
                  }`}
                >
                  <div className={`text-lg font-bold ${color}`}>{val}</div>
                  <div className="text-[10px] text-stone-500 mt-0.5 leading-tight">{label}</div>
                </button>
              ))}
            </div>

            {/* Config warnings */}
            {(!data.config.hasIndexNowKey || !data.config.hasGscCredentials) && (
              <div className="rounded-xl border border-[rgba(196,154,42,0.25)] bg-[rgba(196,154,42,0.04)] px-4 py-3 text-xs space-y-1">
                <p className="font-semibold text-[#7a5a10]">⚠️ Indexing Not Fully Configured</p>
                {!data.config.hasIndexNowKey && <p className="text-[#C49A2A]/80">INDEXNOW_KEY not set — cannot submit to Bing/Yandex</p>}
                {!data.config.hasGscCredentials && <p className="text-[#C49A2A]/80">Google Search Console credentials not configured</p>}
                <p className="text-stone-500">Add missing keys in Vercel Dashboard → Settings → Environment Variables</p>
              </div>
            )}

            {/* Primary action: Sync with Google to get real indexed count */}
            <button
              onClick={syncWithGoogle}
              disabled={submitLoading === "gsc-sync"}
              className="w-full px-4 py-3 rounded-xl bg-[#2D5A3D] hover:bg-[#1e4a2d] text-white text-sm font-bold disabled:opacity-50 transition-colors"
            >
              {submitLoading === "gsc-sync" ? "⏳ Syncing with Google Search Console…" : "📡 Sync with Google — Get Real Indexed Count"}
            </button>

            {/* Secondary action row */}
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={submitAll}
                disabled={submitLoading === "all"}
                className="px-4 py-2 rounded-lg bg-[#3B7EA1] hover:bg-[#2d6a8a] text-white text-xs font-semibold disabled:opacity-50"
              >
                {submitLoading === "all" ? "⏳ Submitting…" : "📤 Submit All Unsubmitted"}
              </button>
              <button
                onClick={resubmitStuck}
                disabled={submitLoading === "resubmit-stuck"}
                className="px-4 py-2 rounded-lg bg-[#C49A2A] hover:bg-[#b08a22] text-white text-xs font-semibold disabled:opacity-50"
              >
                {submitLoading === "resubmit-stuck" ? "⏳ Resubmitting…" : "🔄 Resubmit All Stuck"}
              </button>
            </div>
            {submitResult && (
              <div className={`text-xs px-3 py-2 rounded-xl ${submitResult.startsWith("✅") ? "bg-[rgba(45,90,61,0.06)] text-[#2D5A3D] border border-[rgba(45,90,61,0.3)]" : submitResult.startsWith("⚠️") ? "bg-[rgba(196,154,42,0.06)] text-[#7a5a10] border border-[rgba(196,154,42,0.3)]" : "bg-[rgba(200,50,43,0.06)] text-[#C8322B] border border-[rgba(200,50,43,0.3)]"}`}>
                {submitResult}
              </div>
            )}

            {/* Article List */}
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <div className="rounded-xl border border-stone-200 py-8 text-center">
                  <p className="text-stone-500 text-sm">No articles match this filter.</p>
                </div>
              ) : (
                filtered.map((article) => {
                  const isExpanded = expanded === article.id;
                  const statusCls = statusColor[article.indexingStatus] || statusColor.never_submitted;
                  const statusLbl = statusLabel[article.indexingStatus] || article.indexingStatus;
                  return (
                    <div key={article.id} className="rounded-xl border border-stone-200 bg-stone-50/50 overflow-hidden">
                      {/* Row */}
                      <div className="px-3 py-2.5 flex flex-col gap-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-stone-800 truncate">{article.title}</p>
                            <p className="text-[10px] text-stone-500 truncate mt-0.5">/blog/{article.slug}</p>
                          </div>
                          <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusCls}`}>
                            {statusLbl}
                          </span>
                        </div>

                        {/* Metrics row */}
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-stone-500">
                          {article.publishedAt && (
                            <span>📅 Published: {new Date(article.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                          )}
                          {article.lastCrawledAt && (
                            <span>🕷 Crawled: {new Date(article.lastCrawledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                          )}
                          {article.submittedAt && (
                            <span>📤 Submitted: {new Date(article.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                          )}
                          <span className={article.wordCount < 300 ? "text-[#C8322B]" : article.wordCount < 800 ? "text-[#C49A2A]" : "text-stone-500"}>
                            📝 {article.wordCount.toLocaleString()} words
                          </span>
                          {article.seoScore > 0 && (
                            <span className={article.seoScore >= 70 ? "text-[#2D5A3D]" : article.seoScore >= 50 ? "text-[#C49A2A]" : "text-[#C8322B]"}>
                              SEO: {article.seoScore}/100
                            </span>
                          )}
                          {/* GSC performance */}
                          {article.gscImpressions !== null ? (
                            <span className="text-purple-400">👁 {article.gscImpressions.toLocaleString()} impressions</span>
                          ) : (
                            <span className="text-stone-500">👁 — impressions</span>
                          )}
                          {article.gscClicks !== null ? (
                            <span className="text-[#3B7EA1]">🖱 {article.gscClicks.toLocaleString()} clicks</span>
                          ) : (
                            <span className="text-stone-500">🖱 — clicks</span>
                          )}
                          {article.gscPosition !== null && (
                            <span className="text-stone-400">Pos: #{Math.round(article.gscPosition)}</span>
                          )}
                        </div>

                        {/* Issues + expand */}
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <div className="flex-1 min-w-0">
                            {article.notIndexedReasons.length > 0 && !isExpanded && (
                              <p className="text-[10px] text-[#C49A2A]/80 truncate">
                                ⚠️ {article.notIndexedReasons[0]}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {article.indexingStatus !== "indexed" && (
                              <button
                                onClick={() => submitArticle(article.slug)}
                                disabled={submitLoading === article.slug}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-[rgba(59,126,161,0.08)] hover:bg-[rgba(59,126,161,0.15)] text-[#1e5a7a] border border-[rgba(59,126,161,0.3)] disabled:opacity-50"
                              >
                                {submitLoading === article.slug ? "⏳" : "Submit"}
                              </button>
                            )}
                            <button
                              onClick={() => verifyUrl(article.url)}
                              disabled={submitLoading === `verify-${article.url}`}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-[rgba(124,58,237,0.08)] hover:bg-[rgba(124,58,237,0.15)] text-[#5B21B6] border border-[rgba(124,58,237,0.3)] disabled:opacity-50"
                            >
                              {submitLoading === `verify-${article.url}` ? "⏳" : "Check"}
                            </button>
                            {(article.notIndexedReasons.length > 0 || article.coverageState) && (
                              <button
                                onClick={() => setExpanded(isExpanded ? null : article.id)}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-400"
                              >
                                {isExpanded ? "▲ Hide" : "▼ Issues"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expanded reasons */}
                        {isExpanded && (
                          <div className="mt-2 pt-2 border-t border-stone-200 space-y-1.5">
                            {article.coverageState && (
                              <p className="text-[10px] text-stone-400 bg-stone-100/60 rounded px-2 py-1">
                                <span className="font-medium text-stone-600">Google coverage: </span>{article.coverageState}
                              </p>
                            )}
                            {article.notIndexedReasons.map((reason, i) => (
                              <p key={i} className="text-[10px] text-[#C49A2A]/90 bg-[rgba(196,154,42,0.04)] rounded px-2 py-1">
                                • {reason}
                              </p>
                            ))}
                            <div className="flex gap-3 text-[10px] text-stone-500 pt-1">
                              <span>IndexNow: {article.submittedIndexnow ? "✅" : "❌"}</span>
                              <span>Sitemap: {article.submittedSitemap ? "✅" : "❌"}</span>
                              <span>Attempts: {article.submissionAttempts}</span>
                            </div>
                            {/* GSC Inspection Details */}
                            {article.inspection && (
                              <div className="mt-2 pt-2 border-t border-stone-200/50">
                                <p className="text-[10px] font-medium text-stone-400 mb-1">GSC Inspection</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
                                  {article.inspection.verdict && (
                                    <span className={article.inspection.verdict === "PASS" ? "text-[#2D5A3D]" : "text-[#C8322B]"}>
                                      Verdict: {article.inspection.verdict}
                                    </span>
                                  )}
                                  {article.inspection.pageFetchState && (
                                    <span className={article.inspection.pageFetchState === "SUCCESSFUL" ? "text-[#2D5A3D]" : "text-[#C49A2A]"}>
                                      Fetch: {article.inspection.pageFetchState}
                                    </span>
                                  )}
                                  {article.inspection.robotsTxtState && (
                                    <span className={article.inspection.robotsTxtState === "ALLOWED" ? "text-stone-500" : "text-[#C8322B]"}>
                                      Robots: {article.inspection.robotsTxtState}
                                    </span>
                                  )}
                                  {article.inspection.indexingAllowed && (
                                    <span className={article.inspection.indexingAllowed.includes("ALLOWED") ? "text-stone-500" : "text-[#C8322B]"}>
                                      Indexing: {article.inspection.indexingAllowed}
                                    </span>
                                  )}
                                  {article.inspection.crawledAs && (
                                    <span className="text-stone-500">Crawler: {article.inspection.crawledAs}</span>
                                  )}
                                  {article.inspection.mobileUsabilityVerdict && (
                                    <span className={article.inspection.mobileUsabilityVerdict === "PASS" ? "text-stone-500" : "text-[#C49A2A]"}>
                                      Mobile: {article.inspection.mobileUsabilityVerdict}
                                    </span>
                                  )}
                                  {article.inspection.referringUrlCount > 0 && (
                                    <span className="text-stone-500">Referring URLs: {article.inspection.referringUrlCount}</span>
                                  )}
                                  {article.inspection.sitemapCount > 0 && (
                                    <span className="text-stone-500">Sitemaps: {article.inspection.sitemapCount}</span>
                                  )}
                                </div>
                                {article.inspection.canonicalMismatch && (
                                  <p className="text-[10px] text-[#C8322B] mt-1">
                                    ⚠️ Canonical mismatch — yours: {article.inspection.userCanonical} | Google: {article.inspection.googleCanonical}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* System Issues */}
            {data.systemIssues.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-stone-400">System Issues</p>
                {data.systemIssues.map((issue, i) => (
                  <div key={i} className={`rounded-xl border px-3 py-2 text-xs ${
                    issue.severity === "critical" ? "border-[rgba(200,50,43,0.3)] bg-[rgba(200,50,43,0.04)] text-[#C8322B]" :
                    issue.severity === "warning" ? "border-[rgba(196,154,42,0.3)] bg-[rgba(196,154,42,0.04)] text-[#7a5a10]" :
                    "border-stone-200 bg-stone-100/30 text-stone-400"
                  }`}>
                    <div className="font-medium">{issue.category}: {issue.message}</div>
                    <div className="text-[10px] mt-0.5 opacity-80">{issue.detail}</div>
                    {issue.fixAction && <div className="text-[10px] mt-1 opacity-60">Fix: {issue.fixAction}</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── News Card (used in Mission Control) ──────────────────────────────────────

function NewsCard({ siteId, triggerAction, actionLoading }: { siteId: string; triggerAction: (endpoint: string, body: object, label: string) => void; actionLoading: string | null }) {
  const [news, setNews] = useState<{ total: number; published: number; draft: number; expiringSoon: number; latestItems: Array<{ id: string; headline_en: string; news_category: string; urgency: string; status: string; published_at: string | null; expires_at: string | null }> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/news?site_id=${encodeURIComponent(siteId)}`);
        if (!res.ok) { setLoading(false); return; }
        const json = await res.json();
        if (!cancelled) {
          setNews({
            total: json.stats?.total ?? 0,
            published: json.stats?.published ?? 0,
            draft: json.stats?.draft ?? 0,
            expiringSoon: json.stats?.expiringSoon ?? 0,
            latestItems: (json.items ?? []).slice(0, 3),
          });
        }
      } catch {
        console.warn("[NewsCard] failed to fetch news");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [siteId]);

  const urgencyColor = (u: string) => u === "breaking" ? "text-[#C8322B]" : u === "urgent" ? "text-[#C49A2A]" : "text-stone-400";
  const statusBadge = (s: string) => s === "published" ? "bg-[rgba(45,90,61,0.08)] text-[#2D5A3D]" : s === "draft" ? "bg-[rgba(59,126,161,0.08)] text-[#1e5a7a]" : "bg-stone-100 text-stone-400";

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <SectionTitle>London News</SectionTitle>
        <Link href="/admin/news" className="text-[10px] text-[#3B7EA1] hover:text-[#1e5a7a]">View All →</Link>
      </div>

      {loading ? (
        <p className="text-xs text-stone-500 text-center py-3">Loading…</p>
      ) : !news || news.total === 0 ? (
        <div className="text-center py-3">
          <p className="text-xs text-stone-500 mb-2">No news items yet</p>
          <ActionButton
            onClick={() => triggerAction("/api/cron/london-news", {}, "News")}
            loading={actionLoading === "News"}
            variant="success"
          >
            📰 Generate News Now
          </ActionButton>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs mb-3">
            <div className="bg-stone-100/50 rounded-lg p-2">
              <div className="text-lg font-bold text-stone-700">{news.total}</div>
              <div className="text-[10px] text-stone-500">Total</div>
            </div>
            <div className="bg-stone-100/50 rounded-lg p-2">
              <div className="text-lg font-bold text-[#2D5A3D]">{news.published}</div>
              <div className="text-[10px] text-stone-500">Published</div>
            </div>
            <div className="bg-stone-100/50 rounded-lg p-2">
              <div className="text-lg font-bold text-[#3B7EA1]">{news.draft}</div>
              <div className="text-[10px] text-stone-500">Draft</div>
            </div>
            <div className="bg-stone-100/50 rounded-lg p-2">
              <div className={`text-lg font-bold ${news.expiringSoon > 0 ? "text-[#C49A2A]" : "text-stone-500"}`}>{news.expiringSoon}</div>
              <div className="text-[10px] text-stone-500">Expiring</div>
            </div>
          </div>

          {/* Latest items */}
          {news.latestItems.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {news.latestItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-xs">
                  <span className={urgencyColor(item.urgency)}>
                    {item.urgency === "breaking" ? "🔴" : item.urgency === "urgent" ? "🟠" : "🔵"}
                  </span>
                  <span className="text-stone-600 truncate flex-1">{item.headline_en}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] ${statusBadge(item.status)}`}>{item.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <ActionButton
              onClick={() => triggerAction("/api/cron/london-news", {}, "News")}
              loading={actionLoading === "News"}
            >
              📰 Generate News
            </ActionButton>
            <ActionButton
              onClick={() => triggerAction("/api/cron/london-news?type=weekly_deep", {}, "Deep Research")}
              loading={actionLoading === "Deep Research"}
            >
              🔬 Deep Research
            </ActionButton>
          </div>
        </>
      )}
    </Card>
  );
}

// ─── CEO Inbox Panel ─────────────────────────────────────────────────────────

interface CeoInboxAlert {
  id: string;
  originalJob: string;
  error: string;
  diagnosis: { plain: string; fix: string; severity: string };
  fixStrategy: { path: string; label: string } | null;
  fixResult: { attempted: boolean; success: boolean; message: string } | null;
  retestResult: { attempted: boolean; success: boolean; message: string } | null;
  status: "new" | "fixing" | "retesting" | "resolved" | "failed";
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

function CeoInboxPanel() {
  const [alerts, setAlerts] = useState<CeoInboxAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [dismissing, setDismissing] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ceo-inbox?limit=10");
      if (!res.ok) { setLoading(false); return; }
      const json = await res.json();
      setAlerts(json.alerts || []);
    } catch {
      // Non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleDismiss = async (id: string) => {
    setDismissing(id);
    try {
      await fetch("/api/admin/ceo-inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss", entryId: id }),
      });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // Non-fatal
    } finally {
      setDismissing(null);
    }
  };

  const handleRetest = async (alert: CeoInboxAlert) => {
    setDismissing(alert.id);
    try {
      const cronPath = alert.fixStrategy?.path || `/api/cron/${alert.originalJob}`;
      await fetch("/api/admin/ceo-inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retest", entryId: alert.id, jobName: alert.originalJob, cronPath }),
      });
      await fetchAlerts();
    } catch {
      // Non-fatal
    } finally {
      setDismissing(null);
    }
  };

  // Only show active (unresolved, unread) alerts
  const activeAlerts = alerts.filter((a) => a.status !== "resolved" && !a.read);

  if (loading || activeAlerts.length === 0) return null;

  const statusColor = (status: string) => {
    switch (status) {
      case "new": return "#C8322B";
      case "fixing": return "#D97706";
      case "retesting": return "#3B7EA1";
      case "resolved": return "#2D5A3D";
      case "failed": return "#C8322B";
      default: return "#78716C";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "new": return "NEW";
      case "fixing": return "FIXING...";
      case "retesting": return "RETESTING...";
      case "resolved": return "FIXED";
      case "failed": return "FAILED";
      default: return status.toUpperCase();
    }
  };

  return (
    <div className="rounded-2xl border-l-4 overflow-hidden" style={{
      backgroundColor: "rgba(200,50,43,0.04)",
      borderLeftColor: "#C8322B",
      boxShadow: "0 1px 3px rgba(28,25,23,0.06)",
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 16 }}>📮</span>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#C8322B" }}>
            CEO Inbox
          </span>
          <span className="rounded-full px-2 py-0.5" style={{
            backgroundColor: "#C8322B", color: "white",
            fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 700,
          }}>
            {activeAlerts.length}
          </span>
        </div>
        <span style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C" }}>
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {activeAlerts.map((alert) => (
            <div key={alert.id} className="rounded-xl p-3" style={{
              backgroundColor: "rgba(255,255,255,0.8)",
              border: "1px solid rgba(214,208,196,0.5)",
            }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-full px-2 py-0.5" style={{
                      backgroundColor: statusColor(alert.status),
                      color: "white",
                      fontFamily: "var(--font-system)",
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: "uppercase" as const,
                    }}>
                      {statusLabel(alert.status)}
                    </span>
                    <span style={{ fontFamily: "var(--font-system)", fontSize: 12, fontWeight: 600, color: "#44403C" }}>
                      {alert.originalJob}
                    </span>
                    <span style={{ fontFamily: "var(--font-system)", fontSize: 10, color: "#A8A29E" }}>
                      {new Date(alert.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="mt-1" style={{ fontFamily: "var(--font-system)", fontSize: 12, color: "#57534E" }}>
                    {alert.diagnosis.plain}
                  </p>
                  <p className="mt-0.5" style={{ fontFamily: "var(--font-system)", fontSize: 11, color: "#78716C" }}>
                    Fix: {alert.diagnosis.fix}
                  </p>

                  {/* Fix result */}
                  {alert.fixResult && (
                    <p className="mt-1" style={{
                      fontFamily: "var(--font-system)", fontSize: 11,
                      color: alert.fixResult.success ? "#2D5A3D" : "#C8322B",
                    }}>
                      {alert.fixResult.success ? "✅" : "❌"} Auto-fix: {alert.fixResult.message.substring(0, 100)}
                    </p>
                  )}

                  {/* Retest result */}
                  {alert.retestResult && (
                    <p className="mt-1" style={{
                      fontFamily: "var(--font-system)", fontSize: 11, fontWeight: 600,
                      color: alert.retestResult.success ? "#2D5A3D" : "#C8322B",
                    }}>
                      {alert.retestResult.success ? "✅" : "❌"} Retest: {alert.retestResult.message.substring(0, 100)}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  {alert.status === "failed" && (
                    <button
                      onClick={() => handleRetest(alert)}
                      disabled={dismissing === alert.id}
                      className="rounded-lg px-2.5 py-1.5 text-white transition-all active:scale-[0.97]"
                      style={{
                        backgroundColor: "#3B7EA1",
                        fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600,
                        opacity: dismissing === alert.id ? 0.6 : 1,
                      }}
                    >
                      {dismissing === alert.id ? "..." : "Retry"}
                    </button>
                  )}
                  <button
                    onClick={() => handleDismiss(alert.id)}
                    disabled={dismissing === alert.id}
                    className="rounded-lg px-2.5 py-1.5 transition-all active:scale-[0.97]"
                    style={{
                      backgroundColor: "rgba(214,208,196,0.3)",
                      fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 500, color: "#78716C",
                      opacity: dismissing === alert.id ? 0.6 : 1,
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab 1: Mission Control ───────────────────────────────────────────────────

function MissionTab({ data, onRefresh, onSwitchTab, siteId, onUpdateIndexing }: { data: CockpitData | null; onRefresh: () => void; onSwitchTab: (tab: TabId) => void; siteId: string; onUpdateIndexing?: (summary: { total: number; indexed: number; submitted: number; discovered: number; neverSubmitted: number; errors: number; rate: number }) => void }) {
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showIndexPanel, setShowIndexPanel] = useState(false);

  const triggerAction = useCallback(async (endpoint: string, body: object, label: string) => {
    // External URLs and admin page URLs → navigate instead of POST
    if (endpoint.startsWith("http")) {
      window.open(endpoint, "_blank");
      return;
    }
    if (endpoint.startsWith("/admin/")) {
      window.location.href = endpoint;
      return;
    }
    setActionLoading(label);
    setActionResult(null);
    try {
      // Cron routes require CRON_SECRET (server-only). Route them through the
      // departures admin API which attaches the secret server-side.
      const isCronRoute = endpoint.startsWith("/api/cron/");
      const fetchUrl = isCronRoute ? "/api/admin/departures" : endpoint;
      const fetchBody = isCronRoute ? { path: endpoint } : body;

      const res = await fetch(fetchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fetchBody),
      });
      const json = await res.json();
      if (json.success === false) {
        setActionResult(`❌ ${label}: ${json.error || "Failed"}`);
      } else if (json.published) {
        const skipReasons = (json.skipped ?? []).map((s: { reason?: string; keyword?: string }) => s.reason || s.keyword || "unknown").slice(0, 3).join("; ");
        const skipMsg = json.skipped?.length > 0 ? ` Skipped ${json.skipped.length}: ${skipReasons}` : "";
        setActionResult(`✅ Published ${json.published.length} articles.${skipMsg}`);
      } else {
        setActionResult(`✅ ${label} triggered`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Safari throws "The string did not match the expected pattern" for URL issues
      const isSafariUrlError = msg.includes("expected pattern");
      setActionResult(isSafariUrlError
        ? `❌ Request failed — try refreshing the page and retrying.`
        : `❌ Network error: ${msg}`);
    } finally {
      setActionLoading(null);
      onRefresh(); // Always refresh — shows current state regardless of success/failure
    }
  }, [onRefresh]);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-48">
        <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: '#78716C', textTransform: 'uppercase', letterSpacing: '2px' }}>Loading mission control…</p>
      </div>
    );
  }

  const { system, pipeline, indexing, cronHealth, alerts } = data;
  // Use the site from context, or fall back to the first configured site from the API response
  const effectiveSiteId = siteId || data.sites?.[0]?.id || "";

  return (
    <>
    {/* Indexing Panel Overlay */}
    {showIndexPanel && (
      <IndexingPanel siteId={effectiveSiteId} onClose={() => { setShowIndexPanel(false); onRefresh(); }} onSummaryUpdate={onUpdateIndexing} />
    )}
    <div className="space-y-4">
      {/* System Status Row */}
      <Card>
        <SectionTitle>System Status</SectionTitle>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <StatusDot ok={system.db.connected} title={system.db.error ?? "DB connected"} />
            <span style={{ fontFamily: "var(--font-system)", fontSize: 12, fontWeight: 500, color: '#44403C' }}>Database</span>
            {system.db.latencyMs > 0 && <span style={{ fontFamily: "var(--font-system)", fontSize: 10, color: '#A8A29E' }}>{system.db.latencyMs}ms</span>}
          </div>
          <div className="flex items-center gap-2">
            <StatusDot ok={system.ai.configured} title={system.ai.activeProviders.join(", ") || "No AI key"} />
            <span style={{ fontFamily: "var(--font-system)", fontSize: 12, fontWeight: 500, color: '#44403C' }}>AI</span>
            {system.ai.activeProviders.length > 0 ? (
              <span style={{ fontFamily: "var(--font-system)", fontSize: 10, color: '#A8A29E' }}>{system.ai.activeProviders.join(", ")}</span>
            ) : (
              <span style={{ fontFamily: "var(--font-system)", fontSize: 10, color: '#C8322B', fontWeight: 600 }}>No keys</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusDot ok={system.indexNow.configured} title="IndexNow" />
            <span style={{ fontFamily: "var(--font-system)", fontSize: 12, fontWeight: 500, color: '#44403C' }}>IndexNow</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot ok={system.gsc.configured} title="Google Search Console" />
            <span style={{ fontFamily: "var(--font-system)", fontSize: 12, fontWeight: 500, color: '#44403C' }}>GSC</span>
          </div>
        </div>
        {!system.db.connected && system.db.error && (
          <p className="mt-2" style={{ fontFamily: "var(--font-system)", fontSize: 11, color: '#C8322B' }}>{system.db.error}</p>
        )}
      </Card>

      {/* CEO Inbox — Incident Response */}
      <CeoInboxPanel />

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.code} className="rounded-2xl p-4 border-l-4" style={{
              backgroundColor: alert.severity === "critical" ? 'rgba(200,50,43,0.06)' : alert.severity === "warning" ? 'rgba(217,119,6,0.06)' : 'rgba(74,123,168,0.06)',
              borderLeftColor: alert.severity === "critical" ? '#C8322B' : alert.severity === "warning" ? '#D97706' : '#3B7EA1',
              boxShadow: '0 1px 3px rgba(28,25,23,0.06)',
            }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p style={{
                    fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13,
                    color: alert.severity === "critical" ? '#C8322B' : alert.severity === "warning" ? '#92400E' : '#1E3A5F',
                  }}>{alert.message}</p>
                  <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: '#57534E', marginTop: 4 }}>{alert.detail}</p>
                  <p style={{ fontFamily: "var(--font-system)", fontSize: 11, color: '#78716C', marginTop: 6 }}>Fix: {alert.fix}</p>
                </div>
                {alert.action && (
                  <ActionButton
                    onClick={() => triggerAction(alert.action!, {}, alert.code)}
                    loading={actionLoading === alert.code}
                    variant={alert.severity === "critical" ? "danger" : "amber"}
                  >
                    Fix
                  </ActionButton>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pipeline Flow */}
      <Card>
        <SectionTitle>Content Pipeline</SectionTitle>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {[
            { label: "Topics", value: pipeline.topicsReady, color: "#3B7EA1", tab: "pipeline" as TabId },
            { label: "Building", value: pipeline.draftsActive, color: "#D97706", tab: "pipeline" as TabId },
            { label: "Ready", value: pipeline.reservoir, color: "#7C3AED", tab: "content" as TabId },
            { label: "Live", value: pipeline.publishedTotal, color: "#16A34A", tab: "content" as TabId },
          ].map((step, i) => (
            <React.Fragment key={step.label}>
              {i > 0 && <span style={{ color: '#D6D3D1', fontSize: 16, fontWeight: 300 }}>→</span>}
              <button
                onClick={() => onSwitchTab(step.tab)}
                className="rounded-xl px-3 sm:px-4 py-2.5 text-center min-w-[68px] transition-all active:scale-[0.97]"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(214,208,196,0.6)', borderRadius: 12, boxShadow: '0 1px 3px rgba(28,25,23,0.06)' }}
              >
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: step.color }}>{step.value}</div>
                <div style={{ fontFamily: "var(--font-system)", fontSize: 9, fontWeight: 600, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 2 }}>{step.label}</div>
              </button>
            </React.Fragment>
          ))}
        </div>
        {Object.keys(pipeline.byPhase).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(pipeline.byPhase).map(([phase, count]) => (
              <span key={phase} className="rounded-lg px-2.5 py-1" style={{
                backgroundColor: 'rgba(120,113,108,0.08)',
                fontFamily: "var(--font-system)",
                fontSize: 10,
                color: '#78716C',
              }}>
                <strong style={{ color: '#44403C' }}>{count}</strong> {phase}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Today's stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28, color: '#16A34A' }}>{pipeline.publishedToday}</div>
          <div style={{ fontFamily: "var(--font-system)", fontSize: 9, fontWeight: 600, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 4 }}>Published Today</div>
        </Card>
        <button
          onClick={() => setShowIndexPanel(true)}
          className="rounded-2xl text-center p-4 sm:p-5 transition-all active:scale-[0.97] w-full"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(214,208,196,0.6)', borderRadius: 12, boxShadow: '0 1px 3px rgba(28,25,23,0.06)' }}
          title="View indexing status for all articles"
        >
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28, color: '#3B7EA1' }}>{indexing.indexed}</div>
          <div style={{ fontFamily: "var(--font-system)", fontSize: 9, fontWeight: 600, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 4 }}>Indexed</div>
        </button>
        <Card className="text-center">
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28, color: cronHealth.failedLast24h > 0 ? '#C8322B' : '#16A34A' }}>
            {cronHealth.failedLast24h > 0 ? cronHealth.failedLast24h : "OK"}
          </div>
          <div style={{ fontFamily: "var(--font-system)", fontSize: 9, fontWeight: 600, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 4 }}>
            {cronHealth.failedLast24h > 0 ? "Failed Crons" : "All Systems"}
          </div>
        </Card>
      </div>

      {/* Indexing Health — Comprehensive Overview */}
      <Card>
        <button
          onClick={() => setShowIndexPanel(true)}
          className="w-full text-left"
        >
          <SectionTitle>Indexing Health</SectionTitle>
        </button>

        {/* Rate + Velocity Row */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { value: `${indexing.rate}%`, label: "Indexed", color: indexing.rate >= 80 ? '#16A34A' : indexing.rate >= 50 ? '#D97706' : '#C8322B' },
            { value: String(indexing.velocity7d ?? 0), label: "This Week", color: (indexing.velocity7d ?? 0) > 0 ? '#3B7EA1' : '#A8A29E', extra: typeof indexing.velocity7dPrevious === "number" && (indexing.velocity7d ?? 0) !== indexing.velocity7dPrevious ? `${(indexing.velocity7d ?? 0) > indexing.velocity7dPrevious ? "▲" : "▼"} was ${indexing.velocity7dPrevious}` : undefined },
            { value: String(indexing.submitted), label: "Pending", color: indexing.submitted > 0 ? '#7C3AED' : '#A8A29E' },
            { value: String(indexing.errors > 0 ? indexing.errors : "0"), label: "Errors", color: indexing.errors > 0 ? '#C8322B' : '#16A34A' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl p-2.5" style={{ backgroundColor: '#FAF8F4', border: '1px solid rgba(214,208,196,0.4)' }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: stat.color }}>{stat.value}</div>
              {stat.extra && <div style={{ fontFamily: "var(--font-system)", fontSize: 9, color: '#A8A29E', marginTop: 1 }}>{stat.extra}</div>}
              <div style={{ fontFamily: "var(--font-system)", fontSize: 9, fontWeight: 600, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Progress bar — all segments sum to indexing.total (single source of truth) */}
        {indexing.total > 0 && (
          <div className="mt-2">
            <div className="h-3 rounded-full overflow-hidden flex" style={{ backgroundColor: 'rgba(120,113,108,0.12)' }}>
              {indexing.indexed > 0 && (
                <div className="h-full bg-[#2D5A3D] transition-all" style={{ width: `${(indexing.indexed / indexing.total) * 100}%` }} title={`${indexing.indexed} indexed`} />
              )}
              {indexing.submitted > 0 && (
                <div className="h-full bg-[#3B7EA1] transition-all" style={{ width: `${(indexing.submitted / indexing.total) * 100}%` }} title={`${indexing.submitted} submitted`} />
              )}
              {(indexing.discovered ?? 0) > 0 && (
                <div className="h-full bg-[#C49A2A] transition-all" style={{ width: `${((indexing.discovered ?? 0) / indexing.total) * 100}%` }} title={`${indexing.discovered} discovered`} />
              )}
              {indexing.errors > 0 && (
                <div className="h-full bg-[#C8322B] transition-all" style={{ width: `${(indexing.errors / indexing.total) * 100}%` }} title={`${indexing.errors} errors`} />
              )}
              {(indexing.neverSubmitted ?? 0) > 0 && (
                <div className="h-full bg-stone-400 transition-all" style={{ width: `${((indexing.neverSubmitted ?? 0) / indexing.total) * 100}%` }} title={`${indexing.neverSubmitted} never submitted`} />
              )}
            </div>
            <div className="flex justify-between mt-1" style={{ fontFamily: "var(--font-system)", fontSize: 9, color: '#A8A29E' }}>
              <span>{indexing.indexed} indexed</span>
              <span>{indexing.submitted} pending</span>
              <span>{indexing.discovered ?? 0} discovered</span>
              <span>{indexing.neverSubmitted ?? 0} untracked</span>
            </div>
            <div className="mt-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(120,113,108,0.06)', fontFamily: "var(--font-system)", fontSize: 10, color: '#A8A29E', lineHeight: '1.5' }}>
              Blog articles only. GSC counts /ar/ pages, static pages, and old URLs too.
            </div>
            {(indexing.discovered ?? 0) > 0 && (
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/admin/content-indexing", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "submit_discovered", siteId }),
                    });
                    const json = await res.json();
                    if (json.success && json.submitted > 0) {
                      onRefresh();
                    }
                  } catch { /* silently fail — refresh will show current state */ }
                }}
                className="mt-2 w-full text-xs bg-[rgba(196,154,42,0.08)] hover:bg-[rgba(196,154,42,0.12)] text-[#7a5a10] border border-[rgba(196,154,42,0.25)] rounded py-1.5 px-3 transition-colors"
              >
                Submit {indexing.discovered} discovered article{indexing.discovered === 1 ? "" : "s"} to Google
              </button>
            )}
            {indexing.dataSource === "lightweight" && (
              <div className="mt-1 text-[9px] text-stone-500 italic">Numbers are approximate (blog posts only). Full count includes static pages.</div>
            )}
          </div>
        )}

        {/* Impression Drop Diagnostic — only shown when impressions are falling */}
        {indexing.impressionDiagnostic && (
          <div className="mt-3 bg-[rgba(196,154,42,0.04)] border border-[rgba(196,154,42,0.3)] rounded-lg p-3">
            <div className="text-xs font-semibold text-[#7a5a10] mb-2">Why impressions are dropping</div>
            <div className="space-y-1.5 text-[11px] text-stone-600">
              {indexing.impressionDiagnostic.gscDelayNote && (
                <div className="flex items-start gap-1.5">
                  <span className="text-[#C49A2A] mt-0.5 shrink-0">!</span>
                  <span>{indexing.impressionDiagnostic.gscDelayNote}</span>
                </div>
              )}
              <div className="flex items-start gap-1.5">
                <span className="text-[#3B7EA1] mt-0.5 shrink-0">#</span>
                <span>Publishing velocity: {indexing.impressionDiagnostic.publishVelocity.thisWeek} this week vs {indexing.impressionDiagnostic.publishVelocity.lastWeek} last week</span>
              </div>
              {indexing.impressionDiagnostic.blockedByGate > 0 && (
                <div className="flex items-start gap-1.5">
                  <span className="text-[#C8322B] mt-0.5 shrink-0">X</span>
                  <span>{indexing.impressionDiagnostic.blockedByGate} article(s) stuck in reservoir — quality score below 70</span>
                </div>
              )}
              {indexing.impressionDiagnostic.topDroppers.length > 0 && (
                <div className="mt-1.5">
                  <div className="text-[10px] text-stone-500 mb-1">Top impression losers:</div>
                  {indexing.impressionDiagnostic.topDroppers.map((d, i) => (
                    <div key={i} className="flex justify-between text-[10px] py-0.5">
                      <span className="text-stone-400 truncate mr-2">{d.url.replace(/^https?:\/\/[^/]+/, "")}</span>
                      <span className="text-[#C8322B] shrink-0">{d.impressionsDelta}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Blockers — the key diagnostic info */}
        {(indexing.blockers ?? []).length > 0 && (
          <div className="mt-3 space-y-1.5">
            {(indexing.blockers ?? []).slice(0, 4).map((blocker, i) => (
              <div
                key={i}
                className={`text-[11px] rounded-lg px-2.5 py-1.5 ${
                  blocker.severity === "critical"
                    ? "bg-[rgba(200,50,43,0.06)] text-[#C8322B] border border-[rgba(200,50,43,0.20)]"
                    : blocker.severity === "warning"
                    ? "bg-[rgba(196,154,42,0.04)] text-[#7a5a10] border border-[rgba(196,154,42,0.15)]"
                    : "bg-stone-100/40 text-stone-400 border border-stone-200/50"
                }`}
              >
                {blocker.severity === "critical" ? "🚨" : "⚠️"} {blocker.reason}
              </div>
            ))}
          </div>
        )}

        {/* Meta line */}
        <div className="mt-2 flex flex-wrap gap-x-3 text-[10px] text-stone-500">
          {indexing.avgTimeToIndexDays != null && (
            <span>Avg index time: {indexing.avgTimeToIndexDays}d</span>
          )}
          {indexing.lastSubmissionAge && (
            <span>Last submit: {indexing.lastSubmissionAge}</span>
          )}
          {indexing.lastVerificationAge && (
            <span>Last check: {indexing.lastVerificationAge}</span>
          )}
          {indexing.channelBreakdown && (indexing.channelBreakdown.indexnow > 0 || indexing.channelBreakdown.sitemap > 0) && (
            <span>
              Channels: {indexing.channelBreakdown.indexnow > 0 ? `IN:${indexing.channelBreakdown.indexnow}` : ""}{indexing.channelBreakdown.sitemap > 0 ? ` SM:${indexing.channelBreakdown.sitemap}` : ""}
            </span>
          )}
        </div>

        {/* GSC Search Performance — real clicks/impressions from gsc-sync */}
        {(indexing.gscTotalClicks7d > 0 || indexing.gscTotalImpressions7d > 0) && (
          <div className="mt-3">
            <div style={{ fontFamily: "var(--font-system)", fontSize: 10, fontWeight: 600, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8 }}>Google Search (7d)</div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl p-3" style={{ backgroundColor: '#FAF8F4', border: '1px solid rgba(214,208,196,0.4)' }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: '#0891B2' }}>
                  {indexing.gscTotalClicks7d.toLocaleString()}
                  {indexing.gscClicksTrend != null && (
                    <span style={{ fontFamily: "var(--font-system)", fontSize: 10, marginLeft: 4, color: indexing.gscClicksTrend > 0 ? '#16A34A' : indexing.gscClicksTrend < 0 ? '#C8322B' : '#A8A29E' }}>
                      {indexing.gscClicksTrend > 0 ? "▲" : indexing.gscClicksTrend < 0 ? "▼" : "—"}{Math.abs(indexing.gscClicksTrend)}%
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: "var(--font-system)", fontSize: 9, fontWeight: 600, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Clicks</div>
              </div>
              <div className="rounded-xl p-3" style={{ backgroundColor: '#FAF8F4', border: '1px solid rgba(214,208,196,0.4)' }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: '#7C3AED' }}>
                  {indexing.gscTotalImpressions7d.toLocaleString()}
                  {indexing.gscImpressionsTrend != null && (
                    <span style={{ fontFamily: "var(--font-system)", fontSize: 10, marginLeft: 4, color: indexing.gscImpressionsTrend > 0 ? '#16A34A' : indexing.gscImpressionsTrend < 0 ? '#C8322B' : '#A8A29E' }}>
                      {indexing.gscImpressionsTrend > 0 ? "▲" : indexing.gscImpressionsTrend < 0 ? "▼" : "—"}{Math.abs(indexing.gscImpressionsTrend)}%
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: "var(--font-system)", fontSize: 9, fontWeight: 600, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>Impressions</div>
              </div>
            </div>
            {indexing.lastGscSync && (
              <div className="mt-1.5 text-center" style={{ fontFamily: "var(--font-system)", fontSize: 9, color: '#A8A29E' }}>Last sync: {indexing.lastGscSync}</div>
            )}
          </div>
        )}

        {/* Tap to see full details */}
        <button
          onClick={() => setShowIndexPanel(true)}
          className="mt-2 w-full text-center text-[10px] text-[#3B7EA1] hover:text-[#1e5a7a] py-1"
        >
          Tap for full indexing details →
        </button>
      </Card>

      {/* Website Traffic (GA4) */}
      {data?.traffic && (
        <Card>
          <SectionTitle>Website Traffic (7d)</SectionTitle>
          {!data.traffic.configured ? (
            <div className="text-center py-3">
              <div style={{ fontFamily: "var(--font-system)", fontSize: 12, color: '#78716C' }}>GA4 not configured</div>
              <div style={{ fontFamily: "var(--font-system)", fontSize: 10, color: '#A8A29E', marginTop: 4 }}>Add GA4_PROPERTY_ID to Vercel env vars</div>
            </div>
          ) : data.traffic.sessions7d === 0 ? (
            <div className="text-center py-3">
              <div style={{ fontFamily: "var(--font-system)", fontSize: 12, color: '#78716C' }}>No traffic data yet</div>
              <div style={{ fontFamily: "var(--font-system)", fontSize: 10, color: '#A8A29E', marginTop: 4 }}>GA4 takes 24-48h to report</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { value: data.traffic.sessions7d, label: "Sessions", color: "#3B7EA1" },
                  { value: data.traffic.users7d, label: "Users", color: "#0891B2" },
                  { value: data.traffic.pageViews7d, label: "Views", color: "#7C3AED" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl p-2.5" style={{ backgroundColor: '#FAF8F4', border: '1px solid rgba(214,208,196,0.4)' }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: s.color }}>{s.value.toLocaleString()}</div>
                    <div style={{ fontFamily: "var(--font-system)", fontSize: 9, fontWeight: 600, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {data.traffic.topPages.length > 0 && (
                <div className="mt-3">
                  <div style={{ fontFamily: "var(--font-system)", fontSize: 9, fontWeight: 600, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Top Pages</div>
                  {data.traffic.topPages.slice(0, 3).map((p, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span style={{ fontFamily: "var(--font-system)", fontSize: 11, color: '#57534E' }} className="truncate max-w-[70%]">{p.path}</span>
                      <span style={{ fontFamily: "var(--font-system)", fontSize: 11, fontWeight: 600, color: '#78716C' }}>{p.pageViews}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* Revenue & Costs */}
      {data?.revenue && (
        <Card>
          <SectionTitle>Revenue & Costs (7d)</SectionTitle>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { value: String(data.revenue.affiliateClicksToday), label: "Clicks Today", color: "#D97706" },
              { value: String(data.revenue.conversionsWeek), label: "Conversions", color: "#16A34A" },
              { value: `$${data.revenue.revenueWeekUsd.toFixed(2)}`, label: "Commission", color: "#16A34A" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-2.5" style={{ backgroundColor: '#FAF8F4', border: '1px solid rgba(214,208,196,0.4)' }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: s.color }}>{s.value}</div>
                <div style={{ fontFamily: "var(--font-system)", fontSize: 9, fontWeight: 600, color: '#A8A29E', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between" style={{ fontFamily: "var(--font-system)", fontSize: 10, color: '#A8A29E' }}>
            <span>{data.revenue.affiliateClicksWeek} clicks this week{data.revenue.topPartner ? ` · Top: ${data.revenue.topPartner}` : ""}</span>
            <span style={{ color: '#C8322B', fontWeight: 600 }}>AI: ${data.revenue.aiCostWeekUsd.toFixed(2)}</span>
          </div>
        </Card>
      )}

      {/* London News */}
      <NewsCard siteId={siteId} triggerAction={triggerAction} actionLoading={actionLoading} />

      {/* Quick Actions */}
      <Card>
        <SectionTitle>Quick Actions</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">
          <ActionButton
            onClick={() => triggerAction("/api/admin/launch-sequence", {}, "Launch")}
            loading={actionLoading === "Launch"}
            variant="success"
            className="col-span-2 py-3.5"
          >
            {actionLoading === "Launch" ? "Publishing…" : "LAUNCH — Publish All Ready"}
          </ActionButton>
          <ActionButton onClick={() => triggerAction("/api/cron/weekly-topics", {}, "Topics")} loading={actionLoading === "Topics"}>
            Generate Topics
          </ActionButton>
          <ActionButton onClick={() => triggerAction("/api/cron/content-builder", {}, "Content")} loading={actionLoading === "Content"}>
            Build Content
          </ActionButton>
          <ActionButton onClick={() => triggerAction("/api/admin/force-publish", { locale: "both", count: 2 }, "Publish")} loading={actionLoading === "Publish"} variant="success">
            Force Publish (2)
          </ActionButton>
          <ActionButton onClick={() => triggerAction("/api/admin/force-publish", { locale: "both", count: 2, skipDedup: true }, "Fix & Publish")} loading={actionLoading === "Fix & Publish"} variant="amber">
            Fix & Publish
          </ActionButton>
          <ActionButton onClick={() => triggerAction("/api/cron/seo-agent", {}, "SEO")} loading={actionLoading === "SEO"}>
            Submit to Google
          </ActionButton>
          <ActionButton onClick={() => triggerAction("/api/cron/gsc-sync", {}, "GSC Sync")} loading={actionLoading === "GSC Sync"}>
            Sync GSC Data
          </ActionButton>
          <ActionButton onClick={() => triggerAction("/api/cron/content-auto-fix-lite", {}, "Auto-Fix")} loading={actionLoading === "Auto-Fix"}>
            Auto-Fix Lite
          </ActionButton>
          <ActionButton onClick={() => triggerAction("/api/admin/content-cleanup", { action: "fix_all" }, "Cleanup")} loading={actionLoading === "Cleanup"} variant="amber">
            Clean + Dedup
          </ActionButton>
          <Link href="/admin/cockpit/validator" className="col-span-2 rounded-xl text-center block py-2.5 transition-all active:scale-[0.97]"
                style={{ fontFamily: "var(--font-system)", fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', color: '#78716C', backgroundColor: '#FFFFFF', border: '1px solid rgba(214,208,196,0.8)', borderRadius: 10, boxShadow: '0 1px 3px rgba(28,25,23,0.06)' }}>
            System Validator
          </Link>
        </div>
        {actionResult && (
          <p className="mt-3 px-3 py-2.5 rounded-xl" style={{
            fontFamily: "var(--font-system)",
            fontSize: 11,
            backgroundColor: actionResult.startsWith("✅") ? 'rgba(22,163,74,0.08)' : 'rgba(200,50,43,0.08)',
            color: actionResult.startsWith("✅") ? '#16A34A' : '#C8322B',
          }}>
            {actionResult}
          </p>
        )}
      </Card>

      {/* Site Health Quick Link */}
      <Link href="/admin/site-health" className="block">
        <Card className="transition-all active:scale-[0.98]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FAF8F4', border: '1px solid rgba(214,208,196,0.6)' }}>
                <ShieldCheck className="w-4 h-4" style={{ color: '#3B7EA1' }} />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: '#1C1917' }}>Site Health Monitor</div>
                <div style={{ fontFamily: "var(--font-system)", fontSize: 10, color: '#A8A29E' }}>SEO audit, issues, health score</div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 -rotate-90" style={{ color: '#A8A29E' }} />
          </div>
        </Card>
      </Link>

      {/* Recent cron activity */}
      <Card>
        <SectionTitle>Recent Activity</SectionTitle>
        <div className="space-y-2">
          {cronHealth.recentJobs.slice(0, 6).map((job, i) => (
            <div key={i} className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex-shrink-0" style={{ fontSize: 12 }}>
                  {job.status === "success" ? "✅" : job.status === "failed" ? "❌" : "⏱"}
                </span>
                <span className="truncate" style={{ fontFamily: "var(--font-system)", fontSize: 11, fontWeight: 500, color: '#44403C' }}>{job.name}</span>
                {job.itemsProcessed > 0 && <span style={{ fontFamily: "var(--font-system)", fontSize: 10, color: '#A8A29E' }}>{job.itemsProcessed}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span style={{ fontFamily: "var(--font-system)", fontSize: 10, color: '#A8A29E' }}>{formatDuration(job.durationMs)}</span>
                <span style={{ fontFamily: "var(--font-system)", fontSize: 10, color: '#D6D3D1' }}>{timeAgo(job.startedAt)}</span>
              </div>
            </div>
          ))}
          {cronHealth.recentJobs.length === 0 && (
            <p className="text-center py-4" style={{ fontFamily: "var(--font-system)", fontSize: 11, color: '#A8A29E' }}>No cron runs in last 24h</p>
          )}
        </div>
      </Card>

      {/* Stuck drafts */}
      {pipeline.stuckDrafts.length > 0 && (
        <Card className="border-[rgba(217,119,6,0.15)]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <SectionTitle>⚠️ Stuck Drafts ({pipeline.stuckDrafts.length})</SectionTitle>
            <ActionButton
              onClick={async () => {
                setActionLoading("fix-stuck");
                setActionResult(null);
                const results = await Promise.allSettled(
                  pipeline.stuckDrafts.map((d) =>
                    fetch("/api/admin/content-matrix", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "re_queue", draftId: d.id }),
                    }).then((r) => r.json())
                  )
                );
                const succeeded = results.filter(
                  (r) => r.status === "fulfilled" && (r.value as { success?: boolean }).success !== false
                ).length;
                const failed = results.length - succeeded;
                setActionResult(
                  failed === 0
                    ? `✅ Re-queued ${succeeded} stuck draft${succeeded !== 1 ? "s" : ""}`
                    : `⚠️ ${succeeded}/${results.length} re-queued (${failed} failed)`
                );
                onRefresh();
              }}
              loading={actionLoading === "fix-stuck"}
              variant="amber"
            >
              ⚡ Fix All Stuck ({pipeline.stuckDrafts.length})
            </ActionButton>
          </div>
          <div className="space-y-2">
            {pipeline.stuckDrafts.map((d) => (
              <div key={d.id} className="text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-600 font-medium">&quot;{d.keyword}&quot;</span>
                  <span className="text-[#92400E]">{d.hoursStuck}h in {d.phase}</span>
                </div>
                {d.plainError && <p className="text-stone-500 mt-0.5">{d.plainError}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
    </>
  );
}

// ─── Tab 2: Content Matrix ────────────────────────────────────────────────────

function ContentTab({ activeSiteId }: { activeSiteId: string }) {
  const [data, setData] = useState<ContentMatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [gateResults, setGateResults] = useState<Record<string, GateCheck[]>>({});
  const [gateLoading, setGateLoading] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<Record<string, string>>({});

  // ─── Topic Research & Bulk Create state ──────────────────────────────────
  const [contentView, setContentView] = useState<"articles" | "research">("articles");
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [researchedTopics, setResearchedTopics] = useState<ResearchedTopic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set());
  const [focusArea, setFocusArea] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkQueueResult | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/admin/content-matrix?siteId=${activeSiteId}&limit=100`);
      if (!res.ok) throw new Error(`API error: HTTP ${res.status}`);
      const json = await res.json();
      if (json.articles) {
        setData(json);
      } else if (json.error) {
        throw new Error(json.error);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.warn("[cockpit] Content matrix fetch failed:", msg);
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeSiteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset research state when site changes
  useEffect(() => {
    setResearchedTopics([]);
    setSelectedTopics(new Set());
    setBulkResult(null);
    setResearchError(null);
  }, [activeSiteId]);

  const runTopicResearch = async () => {
    setResearchLoading(true);
    setResearchError(null);
    setResearchedTopics([]);
    setSelectedTopics(new Set());
    setBulkResult(null);
    try {
      const res = await fetch("/api/admin/topic-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: activeSiteId,
          count: 20,
          focusArea: focusArea.trim() || undefined,
          language: "en",
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || json.detail || `HTTP ${res.status}`);
      setResearchedTopics(json.topics || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Research failed";
      console.warn("[cockpit] Topic research failed:", msg);
      setResearchError(msg);
    } finally {
      setResearchLoading(false);
    }
  };

  const toggleTopicSelection = (rank: number) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(rank)) {
        next.delete(rank);
      } else if (next.size < 5) {
        next.add(rank);
      }
      return next;
    });
  };

  const createBulkArticles = async () => {
    const selected = researchedTopics.filter((t) => selectedTopics.has(t.rank));
    if (selected.length === 0) return;

    setBulkLoading(true);
    setBulkResult(null);
    try {
      const res = await fetch("/api/admin/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "queue",
          siteId: activeSiteId,
          language: "en",
          topicSource: "researched",
          count: selected.length,
          researchedTopics: selected.map((t) => ({
            keyword: t.keyword,
            longTails: t.longTails,
            searchVolume: t.searchVolume,
            estimatedMonthlySearches: t.estimatedMonthlySearches,
            trend: t.trend,
            trendEvidence: t.trendEvidence,
            competition: t.competition,
            relevanceScore: t.relevanceScore,
            suggestedPageType: t.suggestedPageType,
            contentAngle: t.contentAngle,
            rationale: t.rationale,
            questions: t.questions,
          })),
        }),
      });
      const json = await res.json();
      setBulkResult(json);
      if (json.success) {
        // Refresh article list after a short delay
        setTimeout(() => fetchData(), 2000);
      }
    } catch (e) {
      setBulkResult({ success: false, error: e instanceof Error ? e.message : "Failed to queue articles" });
    } finally {
      setBulkLoading(false);
    }
  };

  const runGateCheck = async (item: ContentItem) => {
    if (item.type !== "draft") return;
    setGateLoading(item.id);
    try {
      const res = await fetch("/api/admin/content-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "gate_check", draftId: item.id }),
      });
      const json = await res.json();
      if (json.checks) setGateResults((prev) => ({ ...prev, [item.id]: json.checks }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      console.warn("[cockpit] runGateCheck failed:", msg);
      setGateResults((prev) => ({
        ...prev,
        [item.id]: [{ check: "gate_api", pass: false, label: `Gate check failed: ${msg}`, detail: "Tap 'Run gate check' to retry.", isBlocker: false }],
      }));
    } finally {
      setGateLoading(null);
    }
  };

  const doAction = async (action: string, id: string, label: string) => {
    setActionLoading(`${action}-${id}`);
    try {
      const body: Record<string, string> = { action };
      if (action === "re_queue" || action === "delete_draft" || action === "enhance" || action === "rewrite") body.draftId = id;
      if (action === "delete_post" || action === "unpublish") body.blogPostId = id;
      const res = await fetch("/api/admin/content-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      setActionResult((prev) => ({ ...prev, [id]: json.success ? `✅ ${label} done` : `❌ ${json.error}` }));
      fetchData();
    } catch (e) {
      setActionResult((prev) => ({ ...prev, [id]: `❌ ${e instanceof Error ? e.message : "Error"}` }));
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = (data?.articles ?? []).filter((a) => {
    if (filter === "published" && a.type !== "published") return false;
    if (filter === "draft" && a.type !== "draft") return false;
    if (filter === "reservoir" && a.status !== "reservoir") return false;
    if (filter === "rejected" && a.status !== "rejected") return false;
    if (filter === "stuck" && a.hoursInPhase < 3) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const indexColor = (s: string | null) => {
    if (!s) return "text-stone-500";
    if (s === "indexed") return "text-[#2D5A3D]";
    if (s === "submitted") return "text-[#3B7EA1]";
    if (s === "error") return "text-[#C8322B]";
    return "text-stone-400";
  };

  const indexLabel = (item: ContentItem) => {
    if (!item.indexingStatus) return "—";
    if (item.indexingStatus === "indexed") return "Indexed";
    if (item.indexingStatus === "submitted") return "Submitted";
    if (item.indexingStatus === "error") return "Error";
    if (item.indexingStatus === "discovered") return "Discovered";
    if (item.indexingStatus === "never_submitted") return "Not submitted";
    return item.indexingStatus;
  };

  const volumeColor = (v: string) => v === "high" ? "text-[#2D5A3D]" : v === "medium" ? "text-[#C49A2A]" : "text-stone-400";
  const trendIcon = (t: string) => t === "rising" ? "📈" : t === "declining" ? "📉" : "➡️";
  const competitionColor = (c: string) => c === "low" ? "text-[#2D5A3D]" : c === "high" ? "text-[#C8322B]" : "text-[#C49A2A]";

  return (
    <div className="space-y-4">
      {/* ─── View Toggle: Articles | Research ──────────────────────────── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setContentView("articles")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            contentView === "articles" ? "bg-[#3B7EA1] text-white" : "bg-stone-100 text-stone-400 hover:bg-stone-200"
          }`}
        >
          Articles ({data?.summary.total ?? "…"})
        </button>
        <button
          onClick={() => setContentView("research")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            contentView === "research" ? "bg-[#5B21B6] text-white" : "bg-stone-100 text-stone-400 hover:bg-stone-200"
          }`}
        >
          Research & Create
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
           RESEARCH & BULK CREATE VIEW
         ═══════════════════════════════════════════════════════════════════ */}
      {contentView === "research" && (
        <div className="space-y-4">
          {/* Research controls */}
          <Card>
            <SectionTitle>SEO Topic Research</SectionTitle>
            <p className="text-stone-400 text-xs mb-3">
              AI-powered keyword research finds 20 high-potential topics for your site.
              Select up to 5 and create bulk articles instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Focus area (optional): e.g. Ramadan, summer, luxury hotels…"
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
                className="flex-1 bg-stone-100 border border-stone-200 rounded-lg px-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#5B21B6]"
              />
              <ActionButton
                onClick={runTopicResearch}
                loading={researchLoading}
                variant="default"
                className="whitespace-nowrap bg-[#5B21B6] hover:bg-[#5B21B6] border-[#5B21B6] text-white"
              >
                Research Topics
              </ActionButton>
            </div>
            {researchError && (
              <p className="text-[#C8322B] text-xs mt-2">Research failed: {researchError}</p>
            )}
          </Card>

          {/* Research loading state */}
          {researchLoading && (
            <Card className="text-center py-8">
              <div className="animate-pulse space-y-2">
                <p className="text-[#5B21B6] text-sm font-medium">Researching trending topics…</p>
                <p className="text-stone-500 text-xs">This takes 20-40 seconds. AI is analyzing search trends, competition, and relevance.</p>
              </div>
            </Card>
          )}

          {/* Research results — topic picker */}
          {researchedTopics.length > 0 && (
            <>
              {/* Selection summary bar */}
              <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-stone-800 text-sm font-medium">
                    {researchedTopics.length} topics found — select up to 5
                  </p>
                  <p className="text-stone-500 text-xs">
                    {selectedTopics.size} selected{selectedTopics.size > 0 ? `: ${researchedTopics.filter((t) => selectedTopics.has(t.rank)).map((t) => t.keyword).join(", ")}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedTopics.size > 0 && (
                    <button
                      onClick={() => setSelectedTopics(new Set())}
                      className="px-3 py-1.5 rounded-lg text-xs bg-stone-100 hover:bg-stone-200 text-stone-400 border border-stone-200"
                    >
                      Clear
                    </button>
                  )}
                  <ActionButton
                    onClick={createBulkArticles}
                    loading={bulkLoading}
                    disabled={selectedTopics.size === 0}
                    variant="success"
                    className="whitespace-nowrap"
                  >
                    Create {selectedTopics.size} Article{selectedTopics.size !== 1 ? "s" : ""}
                  </ActionButton>
                </div>
              </Card>

              {/* Bulk creation result */}
              {bulkResult && (
                <Card className={bulkResult.success ? "border-[rgba(45,90,61,0.3)] bg-[rgba(45,90,61,0.04)]" : "border-[rgba(200,50,43,0.3)] bg-[rgba(200,50,43,0.04)]"}>
                  {bulkResult.success ? (
                    <div>
                      <p className="text-[#2D5A3D] text-sm font-medium">
                        {bulkResult.queued} article{(bulkResult.queued ?? 0) !== 1 ? "s" : ""} queued in pipeline
                      </p>
                      <p className="text-stone-400 text-xs mt-1">{bulkResult.message}</p>
                      {bulkResult.articles && bulkResult.articles.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {bulkResult.articles.map((a, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="text-[#2D5A3D]">✓</span>
                              <span className="text-stone-600">{a.keyword}</span>
                              <span className="text-stone-500">→ pipeline</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => { setContentView("articles"); fetchData(); }}
                        className="mt-3 px-3 py-1.5 rounded-lg text-xs bg-[#3B7EA1] hover:bg-[#2d6a8a] text-white"
                      >
                        View in Articles
                      </button>
                    </div>
                  ) : (
                    <p className="text-[#C8322B] text-sm">{bulkResult.error || "Failed to queue articles"}</p>
                  )}
                </Card>
              )}

              {/* Topic cards */}
              <div className="space-y-2">
                {researchedTopics.map((topic) => {
                  const isSelected = selectedTopics.has(topic.rank);
                  const atLimit = selectedTopics.size >= 5 && !isSelected;

                  return (
                    <Card
                      key={topic.rank}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? "border-[rgba(124,58,237,0.4)] bg-[rgba(124,58,237,0.06)] ring-1 ring-[rgba(124,58,237,0.15)]"
                          : atLimit
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-stone-300"
                      }`}
                    >
                      <div
                        onClick={() => !atLimit && toggleTopicSelection(topic.rank)}
                        className="flex items-start gap-3"
                      >
                        {/* Checkbox */}
                        <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-[#5B21B6] border-[#5B21B6]" : "border-stone-300"
                        }`}>
                          {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Header row */}
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-stone-500 text-xs font-mono">#{topic.rank}</span>
                            <span className="text-stone-800 text-sm font-semibold">{topic.keyword}</span>
                            <span className="text-xs">{trendIcon(topic.trend)}</span>
                          </div>

                          {/* Metrics row */}
                          <div className="flex flex-wrap gap-3 text-[11px] mb-2">
                            <span>
                              Vol: <span className={`font-medium ${volumeColor(topic.searchVolume)}`}>{topic.searchVolume}</span>
                              <span className="text-stone-500 ml-1">({topic.estimatedMonthlySearches})</span>
                            </span>
                            <span>
                              Competition: <span className={`font-medium ${competitionColor(topic.competition)}`}>{topic.competition}</span>
                            </span>
                            <span>
                              Relevance: <span className={scoreColor(topic.relevanceScore)}>{topic.relevanceScore}/100</span>
                            </span>
                            <span className="text-stone-500">
                              {topic.suggestedPageType}
                            </span>
                          </div>

                          {/* Long tails */}
                          {topic.longTails.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {topic.longTails.map((lt, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-400 text-[10px] border border-stone-200">
                                  {lt}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Trend evidence + rationale */}
                          {topic.trendEvidence && (
                            <p className="text-stone-500 text-[11px] mb-1">
                              <span className="text-stone-400 font-medium">Trend:</span> {topic.trendEvidence}
                            </p>
                          )}
                          <p className="text-stone-500 text-[11px]">
                            <span className="text-stone-400 font-medium">Why:</span> {topic.rationale}
                          </p>

                          {/* Content angle */}
                          {topic.contentAngle && (
                            <p className="text-[#5B21B6]/70 text-[11px] mt-1">
                              Angle: {topic.contentAngle}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {/* Empty state */}
          {!researchLoading && researchedTopics.length === 0 && !researchError && (
            <Card className="text-center py-12">
              <p className="text-stone-500 text-sm mb-2">No research results yet</p>
              <p className="text-stone-500 text-xs">Click &quot;Research Topics&quot; to discover high-performing keywords for your site.</p>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
           ARTICLES VIEW (enhanced existing table)
         ═══════════════════════════════════════════════════════════════════ */}
      {contentView === "articles" && (
        <>
          {loading ? (
            <div className="flex items-center justify-center h-48"><p className="text-stone-500 text-sm">Loading content…</p></div>
          ) : fetchError ? (
            <Card className="text-center py-8 space-y-2">
              <p className="text-[#C8322B] text-sm">Failed to load articles: {fetchError}</p>
              <button onClick={fetchData} className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs">Retry</button>
            </Card>
          ) : (
            <>
              {/* Summary cards */}
              {data && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    ["Total", data.summary.total, "text-stone-600"],
                    ["Published", data.summary.published, "text-[#2D5A3D]"],
                    ["Reservoir", data.summary.reservoir, "text-[#3B7EA1]"],
                    ["Pipeline", data.summary.inPipeline, "text-[#C49A2A]"],
                    ["Rejected", data.summary.rejected, "text-[#C8322B]"],
                    ["Stuck", data.summary.stuck, "text-[#92400E]"],
                  ].map(([label, val, color]) => (
                    <Card key={label as string} className="text-center py-3">
                      <div className={`text-xl font-bold ${color}`}>{val}</div>
                      <div className="text-xs text-stone-500 mt-0.5">{label}</div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Quick actions row */}
              <Card className="flex flex-wrap gap-2 items-center">
                <ActionButton
                  onClick={() => setContentView("research")}
                  variant="default"
                  className="bg-[#5B21B6] hover:bg-[#5B21B6] border-[#5B21B6] text-white"
                >
                  Research & Create Topics
                </ActionButton>
                <ActionButton
                  onClick={async () => {
                    setActionLoading("run-builder");
                    try {
                      const r = await fetch("/api/cron/content-builder", { method: "POST" });
                      const j = await r.json();
                      setActionResult((prev) => ({ ...prev, __builder: j.success !== false ? "✅ Builder triggered" : `❌ ${j.error ?? "Failed"}` }));
                      setTimeout(() => fetchData(), 3000);
                    } catch (e) {
                      setActionResult((prev) => ({ ...prev, __builder: `❌ ${e instanceof Error ? e.message : "Error"}` }));
                    } finally { setActionLoading(null); }
                  }}
                  loading={actionLoading === "run-builder"}
                >
                  Run Pipeline
                </ActionButton>
                <ActionButton
                  onClick={async () => {
                    setActionLoading("run-selector");
                    try {
                      const r = await fetch("/api/cron/content-selector", { method: "POST" });
                      const j = await r.json();
                      setActionResult((prev) => ({ ...prev, __selector: j.success !== false ? "✅ Selector ran" : `❌ ${j.error ?? "Failed"}` }));
                      setTimeout(() => fetchData(), 2000);
                    } catch (e) {
                      setActionResult((prev) => ({ ...prev, __selector: `❌ ${e instanceof Error ? e.message : "Error"}` }));
                    } finally { setActionLoading(null); }
                  }}
                  loading={actionLoading === "run-selector"}
                >
                  Publish Ready
                </ActionButton>
                <ActionButton onClick={fetchData} loading={loading}>
                  Refresh
                </ActionButton>
                {actionResult.__builder && <span className={`text-xs ${actionResult.__builder.startsWith("✅") ? "text-[#2D5A3D]" : "text-[#C8322B]"}`}>{actionResult.__builder}</span>}
                {actionResult.__selector && <span className={`text-xs ${actionResult.__selector.startsWith("✅") ? "text-[#2D5A3D]" : "text-[#C8322B]"}`}>{actionResult.__selector}</span>}
              </Card>

              {/* Filters + Search */}
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Search articles…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 min-w-[150px] bg-stone-100 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-300"
                />
                {["all", "published", "draft", "reservoir", "rejected", "stuck"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                      filter === f ? "bg-stone-100 text-stone-800" : "bg-stone-100 text-stone-400 hover:bg-stone-200"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Content table */}
              {filtered.length === 0 ? (
                <Card className="text-center py-8">
                  <p className="text-stone-500 text-sm">No articles match the current filter.</p>
                </Card>
              ) : (
                <Card className="p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-stone-200 text-stone-500 text-left">
                          <th className="px-3 py-2.5 font-medium min-w-[200px]">Page</th>
                          <th className="px-3 py-2.5 font-medium whitespace-nowrap">Status</th>
                          <th className="px-3 py-2.5 font-medium whitespace-nowrap">Created</th>
                          <th className="px-3 py-2.5 font-medium whitespace-nowrap">Google</th>
                          <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">SEO</th>
                          <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Words</th>
                          <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Clicks</th>
                          <th className="px-3 py-2.5 font-medium whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((item) => {
                          const badge = statusBadge(item.status);
                          const isExpanded = expandedId === item.id;
                          const checks = gateResults[item.id];

                          return (
                            <tr key={item.id} className="border-b border-stone-200/50 hover:bg-stone-100/30 transition-colors group">
                              {/* Page name */}
                              <td className="px-3 py-2.5">
                                <p className="text-stone-800 font-medium truncate max-w-[280px]" title={item.title}>
                                  {item.title || item.slug || item.id}
                                </p>
                                {item.url && (
                                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[#3B7EA1] hover:underline truncate block max-w-[280px] text-[10px]">
                                    {item.url}
                                  </a>
                                )}
                                {item.plainError && (
                                  <p className="text-[#C8322B] mt-0.5 truncate max-w-[280px] text-[10px]" title={item.plainError}>{item.plainError}</p>
                                )}
                                {actionResult[item.id] && (
                                  <p className={`mt-0.5 text-[10px] ${actionResult[item.id].startsWith("✅") ? "text-[#2D5A3D]" : "text-[#C8322B]"}`}>
                                    {actionResult[item.id]}
                                  </p>
                                )}
                                {/* Expanded gate check panel */}
                                {isExpanded && (
                                  <div className="mt-2 border-t border-stone-200 pt-2">
                                    <p className="font-semibold text-stone-400 mb-1.5">Why Isn{"'"}t This Published?</p>
                                    {gateLoading === item.id && <p className="text-stone-500">Running gate checks…</p>}
                                    {checks && (
                                      <div className="space-y-1">
                                        {checks.map((c) => (
                                          <div key={c.check} className={`flex items-start gap-1.5 rounded p-1 ${c.pass ? "bg-stone-100/30" : c.isBlocker ? "bg-[rgba(200,50,43,0.04)]" : "bg-[rgba(196,154,42,0.04)]"}`}>
                                            <span className="shrink-0">{c.pass ? "✅" : c.isBlocker ? "❌" : "⚠️"}</span>
                                            <div>
                                              <span className={c.pass ? "text-stone-400" : c.isBlocker ? "text-[#C8322B]" : "text-[#7a5a10]"}>{c.label}</span>
                                              {!c.pass && c.detail && <p className="text-stone-500 mt-0.5">{c.detail}</p>}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {!checks && !gateLoading && (
                                      <button onClick={() => runGateCheck(item)} className="text-[#3B7EA1] hover:underline">Run gate check</button>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Status badge */}
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className={`inline-block px-1.5 py-0.5 rounded-full border text-[10px] font-medium leading-none ${badge.color}`}>
                                  {badge.label}
                                </span>
                                {item.phase && item.type === "draft" && item.status !== "reservoir" && (
                                  <p className="text-stone-500 text-[10px] mt-0.5">{item.phase}</p>
                                )}
                              </td>

                              {/* Created */}
                              <td className="px-3 py-2.5 text-stone-400 whitespace-nowrap">
                                {shortDate(item.generatedAt)}
                                {item.publishedAt && (
                                  <p className="text-[#2D5A3D] text-[10px]">Pub {shortDate(item.publishedAt)}</p>
                                )}
                              </td>

                              {/* Google Status */}
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className={`font-medium ${indexColor(item.indexingStatus)}`}>
                                  {indexLabel(item)}
                                </span>
                              </td>

                              {/* SEO Score */}
                              <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                {item.seoScore !== null ? (
                                  <span className={scoreColor(item.seoScore)}>{item.seoScore}</span>
                                ) : (
                                  <span className="text-stone-500">—</span>
                                )}
                              </td>

                              {/* Word Count */}
                              <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                <span className={item.wordCount < 1000 ? "text-[#C8322B]" : item.wordCount < 1200 ? "text-[#C49A2A]" : "text-stone-400"}>
                                  {item.wordCount > 0 ? item.wordCount.toLocaleString() : "—"}
                                </span>
                              </td>

                              {/* Clicks */}
                              <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                {item.gscClicks !== null ? (
                                  <span className={item.gscClicks > 0 ? "text-[#2D5A3D] font-medium" : "text-stone-600"}>{item.gscClicks.toLocaleString()}</span>
                                ) : (
                                  <span className="text-stone-500">—</span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap gap-1">
                                  {item.type === "draft" && item.status !== "published" && (
                                    <>
                                      <button
                                        onClick={() => {
                                          if (isExpanded && checks) {
                                            setExpandedId(null);
                                          } else {
                                            setExpandedId(item.id);
                                            if (!checks) runGateCheck(item);
                                          }
                                        }}
                                        className="px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200 whitespace-nowrap"
                                      >
                                        {isExpanded ? "Hide" : "Why?"}
                                      </button>
                                      {item.status === "reservoir" && (
                                        <ActionButton
                                          onClick={async () => {
                                            setActionLoading(`publish-${item.id}`);
                                            try {
                                              const r = await fetch("/api/admin/force-publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: item.id, locale: item.locale, count: 1, siteId: activeSiteId }) });
                                              const j = await r.json();
                                              setActionResult((prev) => ({ ...prev, [item.id]: j.success ? "✅ Published!" : `❌ ${j.error ?? "Failed"}` }));
                                              fetchData();
                                            } catch (e) {
                                              setActionResult((prev) => ({ ...prev, [item.id]: `❌ ${e instanceof Error ? e.message : "Error"}` }));
                                            } finally { setActionLoading(null); }
                                          }}
                                          loading={actionLoading === `publish-${item.id}`}
                                          variant="success"
                                        >
                                          Publish
                                        </ActionButton>
                                      )}
                                      {(item.status === "rejected" || item.hoursInPhase > 3) && (
                                        <ActionButton
                                          onClick={() => doAction("re_queue", item.id, "Re-queued")}
                                          loading={actionLoading === `re_queue-${item.id}`}
                                          variant="amber"
                                        >
                                          Retry
                                        </ActionButton>
                                      )}
                                    </>
                                  )}
                                  {item.type === "published" && (
                                    <>
                                      {item.url && (
                                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                                          className="px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200 whitespace-nowrap">
                                          View
                                        </a>
                                      )}
                                      <ActionButton
                                        onClick={async () => {
                                          if (!item.slug) { setActionResult((prev) => ({ ...prev, [item.id]: "❌ No slug" })); return; }
                                          setActionLoading(`index-${item.id}`);
                                          try {
                                            const r = await fetch(`/api/admin/content-indexing`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit", slugs: [item.slug] }) });
                                            const j = await r.json();
                                            setActionResult((prev) => ({ ...prev, [item.id]: j.success !== false ? "✅ Submitted" : `❌ ${j.error ?? "Failed"}` }));
                                            fetchData();
                                          } catch (e) {
                                            setActionResult((prev) => ({ ...prev, [item.id]: `❌ ${e instanceof Error ? e.message : "Error"}` }));
                                          } finally { setActionLoading(null); }
                                        }}
                                        loading={actionLoading === `index-${item.id}`}
                                      >
                                        Index
                                      </ActionButton>
                                      <ActionButton
                                        onClick={async () => {
                                          setActionLoading(`fix-${item.id}`);
                                          try {
                                            const r = await fetch("/api/admin/content-matrix", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "review_fix", blogPostId: item.id }) });
                                            const j = await r.json().catch(() => ({ success: false, error: "Bad response" }));
                                            if (j.success) {
                                              const msg = j.issues?.length > 0
                                                ? `${j.message || "Fixed"}\nIssues: ${j.issues.join(", ")}`
                                                : "No issues found";
                                              setActionResult((prev) => ({ ...prev, [item.id]: `✅ ${msg}` }));
                                              fetchData();
                                            } else {
                                              setActionResult((prev) => ({ ...prev, [item.id]: `❌ ${j.error ?? "Failed"}` }));
                                            }
                                          } catch (e) {
                                            setActionResult((prev) => ({ ...prev, [item.id]: `❌ ${e instanceof Error ? e.message : "Error"}` }));
                                          } finally { setActionLoading(null); }
                                        }}
                                        loading={actionLoading === `fix-${item.id}`}
                                        variant="amber"
                                      >
                                        Review & Fix
                                      </ActionButton>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tab 3: Pipeline & Workflows ─────────────────────────────────────────────

function PipelineTab({ activeSiteId }: { activeSiteId: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setFetchError(null);
    fetch(`/api/admin/content-generation-monitor?site_id=${encodeURIComponent(activeSiteId)}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData)
      .catch((e) => { setFetchError(e instanceof Error ? e.message : "Failed to load pipeline data"); setData(null); })
      .finally(() => setLoading(false));
  }, [activeSiteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const trigger = async (endpoint: string, body: object, label: string) => {
    setActionLoading(label);
    setActionResult(null);
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      setActionResult(json.success !== false ? `✅ ${label} triggered` : `❌ ${json.error || "Failed"}`);
    } catch (e) {
      setActionResult(`❌ ${e instanceof Error ? e.message : "Error"}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-48"><p className="text-stone-500 text-sm">Loading pipeline…</p></div>;
  if (fetchError) return (
    <Card>
      <p className="text-[#C8322B] text-sm">⚠️ Failed to load pipeline: {fetchError}</p>
      <button onClick={fetchData} className="mt-2 px-3 py-1.5 rounded-lg border text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-600 border-stone-200">
        ↺ Retry
      </button>
    </Card>
  );

  const inner = (data as { data?: Record<string, unknown> })?.data ?? data ?? {};
  const summary = (inner as { summary?: Record<string, number> })?.summary ?? {};
  const byPhase = (inner as { phase_counts?: Record<string, number> })?.phase_counts ?? {};
  const drafts = (inner as { active_drafts?: unknown[] })?.active_drafts ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Content Pipeline — {activeSiteId}</SectionTitle>
        <div className="flex flex-wrap gap-3 text-sm mb-3">
          {[
            ["Building", summary.total_active ?? 0, "text-[#C49A2A]"],
            ["Reservoir", summary.reservoir_count ?? 0, "text-[#1e5a7a]"],
            ["Published Today", summary.published_today ?? 0, "text-[#2D5A3D]"],
          ].map(([label, val, color]) => (
            <div key={label as string} className="bg-stone-100 rounded-lg px-3 py-2 text-center min-w-[70px]">
              <div className={`text-xl font-bold ${color}`}>{val}</div>
              <div className="text-xs text-stone-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Phase breakdown */}
        {Object.entries(byPhase).length > 0 && (
          <div className="space-y-1.5">
            {Object.entries(byPhase).map(([phase, count]) => (
              <div key={phase} className="flex items-center gap-2 text-xs">
                <span className="text-stone-400 capitalize w-20 shrink-0">{phase}</span>
                <div className="flex-1 bg-stone-100 rounded-full h-1.5">
                  <div
                    className="bg-[#3B7EA1] h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((count as number) / Math.max(1, ...Object.values(byPhase).map(v => Number(v)))) * 100)}%` }}
                  />
                </div>
                <span className="text-stone-400 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Workflow Controls */}
      <Card>
        <SectionTitle>Run Pipeline Steps</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton onClick={() => trigger("/api/cron/content-builder", { siteId: activeSiteId }, "Content Builder")} loading={actionLoading === "Content Builder"}>
            ▶ Content Builder
          </ActionButton>
          <ActionButton onClick={() => trigger("/api/cron/content-selector", { siteId: activeSiteId }, "Content Selector")} loading={actionLoading === "Content Selector"}>
            ▶ Content Selector
          </ActionButton>
          <ActionButton onClick={() => trigger("/api/cron/weekly-topics", { siteId: activeSiteId }, "Topic Research")} loading={actionLoading === "Topic Research"}>
            ▶ Topic Research
          </ActionButton>
          <ActionButton onClick={() => trigger("/api/cron/seo-agent", { siteId: activeSiteId }, "SEO Agent")} loading={actionLoading === "SEO Agent"}>
            ▶ SEO Agent
          </ActionButton>
          <ActionButton
            onClick={() => trigger("/api/admin/force-publish", { locale: "both", count: 2 }, "Force Publish")}
            loading={actionLoading === "Force Publish"}
            variant="success"
            className="col-span-2"
          >
            📤 Force Publish Best 2 EN + 2 AR
          </ActionButton>
        </div>
        {actionResult && (
          <p className={`mt-2 text-xs p-2 rounded ${actionResult.startsWith("✅") ? "bg-[rgba(45,90,61,0.06)] text-[#2D5A3D]" : "bg-[rgba(200,50,43,0.06)] text-[#C8322B]"}`}>
            {actionResult}
          </p>
        )}
      </Card>

      {/* Content Cleanup */}
      <ContentCleanupCard siteId={activeSiteId} />

      {/* Active drafts */}
      {drafts.length > 0 && (
        <Card>
          <SectionTitle>Active Drafts ({drafts.length})</SectionTitle>
          <div className="space-y-2">
            {(drafts as Array<Record<string, unknown>>).slice(0, 10).map((d) => {
              const id = (d.id as string) ?? "";
              const title = (d.keyword as string) || (d.topic_title as string) || id;
              const phase = (d.current_phase as string) ?? "unknown";
              const seoScore = d.seo_score != null ? Number(d.seo_score) : null;
              const wordCount = d.word_count != null ? Number(d.word_count) : 0;
              return (
                <div key={id} className="flex items-center justify-between text-xs">
                  <div className="min-w-0">
                    <span className="text-stone-600 truncate block">{title}</span>
                    <span className="text-stone-500 capitalize">{phase}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-stone-500">
                    {seoScore !== null && (
                      <span className={scoreColor(seoScore)}>SEO{seoScore}</span>
                    )}
                    <span>{wordCount > 0 ? `${wordCount}w` : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Tab 4: Cron Control ─────────────────────────────────────────────────────

function CronsTab() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [actionResult, setActionResult] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setFetchError(null);
    fetch("/api/admin/cron-logs?hours=24&limit=100")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setData)
      .catch((e) => { setFetchError(e instanceof Error ? e.message : "Failed to load cron data"); setData(null); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runCron = async (endpoint: string, name: string, body?: object) => {
    setActionLoading(name);
    try {
      const opts: RequestInit = { method: "POST" };
      if (body && Object.keys(body).length > 0) {
        opts.headers = { "Content-Type": "application/json" };
        opts.body = JSON.stringify(body);
      }
      const res = await fetch(endpoint, opts);
      const json = await res.json();
      setActionResult((prev) => ({ ...prev, [name]: json.success !== false ? "✅ Triggered" : `❌ ${json.error ?? "Failed"}` }));
      fetchData();
    } catch (e) {
      setActionResult((prev) => ({ ...prev, [name]: `❌ ${e instanceof Error ? e.message : "Error"}` }));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-48"><p className="text-stone-500 text-sm">Loading cron logs…</p></div>;
  if (fetchError) return (
    <Card>
      <p className="text-[#C8322B] text-sm">⚠️ Failed to load cron logs: {fetchError}</p>
      <button onClick={fetchData} className="mt-2 px-3 py-1.5 rounded-lg border text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-600 border-stone-200">
        ↺ Retry
      </button>
    </Card>
  );

  const logs = (data as { logs?: unknown[] })?.logs ?? [];
  const summary = (data as { summary?: Record<string, number> })?.summary ?? {};

  // Group by cron name
  const byName: Record<string, unknown[]> = {};
  for (const log of logs as Array<{ jobName?: string; [key: string]: unknown }>) {
    const name = log.jobName ?? "unknown";
    if (!byName[name]) byName[name] = [];
    byName[name].push(log);
  }

  const cronEndpoints: Record<string, string> = {
    "content-builder": "/api/cron/content-builder",
    "content-selector": "/api/cron/content-selector",
    "weekly-topics": "/api/cron/weekly-topics",
    "seo-agent": "/api/cron/seo-agent",
    "affiliate-injection": "/api/cron/affiliate-injection",
    "trends-monitor": "/api/cron/trends-monitor",
    "analytics-sync": "/api/cron/analytics",
    "seo-health-report": "/api/cron/seo-health-report",
    "site-health-check": "/api/cron/site-health-check",
    "scheduled-publish": "/api/cron/scheduled-publish",
    "indexing-cron": "/api/seo/cron",
  };

  const entries = Object.entries(byName).filter(([name]) => {
    const lastRun = (byName[name][0] as { status?: string })?.status;
    if (filter === "failed") return lastRun === "failed" || lastRun === "error";
    if (filter === "ok") return lastRun === "success" || lastRun === "completed";
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Health summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="text-center">
          <div className="text-xl font-bold text-stone-600">{summary.total ?? logs.length}</div>
          <div className="text-xs text-stone-500 mt-1">Runs (24h)</div>
        </Card>
        <Card className="text-center">
          <div className={`text-xl font-bold ${(summary.failed ?? 0) > 0 ? "text-[#C8322B]" : "text-[#2D5A3D]"}`}>
            {summary.failed ?? 0}
          </div>
          <div className="text-xs text-stone-500 mt-1">Failed</div>
        </Card>
        <Card className="text-center">
          <div className={`text-xl font-bold ${(summary.timedOut ?? 0) > 0 ? "text-[#C49A2A]" : "text-stone-500"}`}>
            {summary.timedOut ?? 0}
          </div>
          <div className="text-xs text-stone-500 mt-1">Timed Out</div>
        </Card>
      </div>

      {/* Run All Critical */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-600">Run Critical Sequence</p>
            <p className="text-[10px] text-stone-500 mt-0.5">Topics → Builder → Selector → SEO</p>
          </div>
          <ActionButton
            onClick={async () => {
              setActionLoading("critical-seq");
              const sequence = [
                { path: "/api/cron/weekly-topics", name: "Topics" },
                { path: "/api/cron/content-builder", name: "Builder" },
                { path: "/api/cron/content-selector", name: "Selector" },
                { path: "/api/cron/seo-agent", name: "SEO" },
              ];
              const errors: string[] = [];
              for (const step of sequence) {
                try {
                  await fetch(step.path, { method: "POST" });
                } catch (e) {
                  console.warn(`[cockpit] Critical sequence step ${step.name} failed:`, e);
                  errors.push(step.name);
                }
              }
              setActionLoading(null);
              setActionResult((prev) => ({
                ...prev,
                "critical-seq": errors.length === 0
                  ? "✅ All 4 steps triggered"
                  : `⚠️ ${4 - errors.length}/4 triggered (failed: ${errors.join(", ")})`
              }));
              fetchData();
            }}
            loading={actionLoading === "critical-seq"}
            variant="success"
          >
            ▶ Run All
          </ActionButton>
        </div>
        {actionResult["critical-seq"] && (
          <p className="mt-2 text-xs bg-[rgba(45,90,61,0.06)] text-[#2D5A3D] rounded px-2 py-1">{actionResult["critical-seq"]}</p>
        )}
      </Card>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "failed", "ok"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${filter === f ? "bg-stone-100 text-stone-800" : "bg-stone-100 text-stone-400 hover:bg-stone-200"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Cron cards */}
      <div className="space-y-2">
        {entries.length === 0 && (
          <Card className="text-center py-8"><p className="text-stone-500 text-sm">No cron runs found.</p></Card>
        )}
        {entries.map(([name, jobLogs]) => {
          const last = jobLogs[0] as {
            status?: string; durationMs?: number; startedAt?: string;
            errorMessage?: string; itemsProcessed?: number
          };
          const isOk = last.status === "success" || last.status === "completed";
          const isFailed = last.status === "failed" || last.status === "error";

          return (
            <Card key={name} className={isFailed ? "border-[rgba(200,50,43,0.15)]" : ""}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={isOk ? "text-[#2D5A3D]" : isFailed ? "text-[#C8322B]" : "text-[#C49A2A]"}>
                      {isOk ? "✅" : isFailed ? "❌" : "⏱"}
                    </span>
                    <span className="text-sm font-medium text-stone-700">{name}</span>
                    <span className="text-xs text-stone-500">{timeAgo(last.startedAt ?? null)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
                    <span>{formatDuration(last.durationMs ?? null)}</span>
                    {last.itemsProcessed !== undefined && last.itemsProcessed > 0 && (
                      <span>{last.itemsProcessed} items</span>
                    )}
                    <span className="text-stone-500">{jobLogs.length} runs in 24h</span>
                  </div>
                  {isFailed && last.errorMessage && (
                    <p className="mt-1.5 text-xs text-[#C8322B] bg-[rgba(200,50,43,0.04)] rounded px-2 py-1">{String(last.errorMessage).slice(0, 200)}</p>
                  )}
                  {actionResult[name] && (
                    <p className={`mt-1 text-xs rounded px-2 py-1 ${actionResult[name].startsWith("✅") ? "bg-[rgba(45,90,61,0.06)] text-[#2D5A3D]" : "bg-[rgba(200,50,43,0.06)] text-[#C8322B]"}`}>
                      {actionResult[name]}
                    </p>
                  )}
                </div>
                {cronEndpoints[name] && (
                  <ActionButton
                    onClick={() => runCron(cronEndpoints[name], name)}
                    loading={actionLoading === name}
                    variant={isFailed ? "amber" : "default"}
                  >
                    ▶ Run
                  </ActionButton>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Not Run Today — crons that should have run but have 0 runs in last 24h */}
      {(() => {
        const EXPECTED_DAILY = ["content-builder", "content-selector", "seo-agent", "affiliate-injection", "trends-monitor", "analytics-sync", "seo-health-report", "site-health-check", "scheduled-publish"];
        const EXPECTED_WEEKLY = ["weekly-topics", "indexing-cron"];
        const notRunToday = [
          ...EXPECTED_DAILY.filter((name) => !byName[name]),
          ...EXPECTED_WEEKLY.filter((name) => !byName[name]),
        ];
        if (notRunToday.length === 0) return null;
        return (
          <Card className="border-[rgba(196,154,42,0.15)]">
            <SectionTitle>⚠️ Not Run Today ({notRunToday.length})</SectionTitle>
            <div className="space-y-1.5">
              {notRunToday.map((name) => (
                <div key={name} className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#7a5a10]">{name}</span>
                    <span className="ml-2 text-stone-500">{EXPECTED_WEEKLY.includes(name) ? "weekly" : "daily"}</span>
                  </div>
                  {cronEndpoints[name] && (
                    <ActionButton onClick={() => runCron(cronEndpoints[name], name)} loading={actionLoading === name} variant="amber">
                      ▶ Run
                    </ActionButton>
                  )}
                </div>
              ))}
            </div>
          </Card>
        );
      })()}

      {/* Bulk actions */}
      <Card>
        <SectionTitle>Bulk Actions</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["▶ Run Content Crons", "/api/admin/content-generation-monitor", { action: "trigger_build" }, "build"],
            ["▶ Run SEO Crons", "/api/cron/seo-agent", {}, "seo-all"],
            ["📤 Force Publish", "/api/admin/force-publish", { locale: "both", count: 2 }, "fp-all"],
            ["🔍 Index All", "/api/admin/content-indexing", { action: "submit_all" }, "idx-all"],
          ].map(([label, endpoint, body, key]) => (
            <ActionButton
              key={key as string}
              onClick={() => runCron(endpoint as string, key as string, body as object)}
              loading={actionLoading === (key as string)}
            >
              {label as string}
            </ActionButton>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Performance Audit Types ──────────────────────────────────────────────────

interface AuditPageResult {
  url: string;
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
  lcpMs: number | null;
  cls: number | null;
  error: string | null;
}

interface AuditSummary {
  runId: string;
  avgPerformance: number;
  avgAccessibility: number;
  avgSeo: number;
  avgLcpMs: number;
  pagesAudited: number;
  pages: AuditPageResult[];
  createdAt: string;
  warning?: string | null;
}

// ─── SEO Master Audit Types ───────────────────────────────────────────────────

interface SeoAuditFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  description: string;
  impact: string;
  fix: string;
  affected: string[];
  count: number;
}

interface SeoAuditSection {
  name: string;
  icon: string;
  score: number;
  maxScore: number;
  findings: SeoAuditFinding[];
}

interface SeoAuditAction {
  id: string;
  label: string;
  cron: string;
  description: string;
  safe: boolean;
}

interface SeoAuditResult {
  healthScore: number;
  siteId: string;
  siteDomain: string;
  siteName: string;
  summary: string;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  sections: SeoAuditSection[];
  findings: SeoAuditFinding[];
  trends: {
    weeklyClicks: { current: number; previous: number; change: number };
    weeklyImpressions: { current: number; previous: number; change: number };
    indexingVelocity: { thisWeek: number; lastWeek: number; change: number };
    contentVelocity: { thisWeek: number; lastWeek: number };
    topGrowing: Array<{ url: string; clickGain: number }>;
    topDeclining: Array<{ url: string; clickLoss: number }>;
  };
  availableActions: SeoAuditAction[];
  indexingSummary: {
    totalTracked: number;
    indexed: number;
    submitted: number;
    discovered: number;
    errors: number;
    chronicFailures: number;
    neverSubmitted: number;
    indexRate: number;
  };
  durationMs: number;
  timestamp: string;
  reportId?: string;
  saveError?: string;
}

interface SeoAuditHistoryItem {
  id: string;
  healthScore: number;
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  summary: string;
  triggeredBy: string;
  createdAt: string;
}

// ─── Tab 5: Sites Overview ────────────────────────────────────────────────────

function SitesTab({ sites, onSelectSite, onRefresh }: { sites: SiteSummary[]; onSelectSite: (id: string) => void; onRefresh: () => void }) {
  const [publishLoading, setPublishLoading] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<Record<string, string>>({});
  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [auditSiteId, setAuditSiteId] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState<string | null>(null);
  const [auditResults, setAuditResults] = useState<Record<string, AuditSummary>>({});

  // ── Master SEO Audit state ──
  const [seoAuditSiteId, setSeoAuditSiteId] = useState<string | null>(null);
  const [seoAuditLoading, setSeoAuditLoading] = useState<string | null>(null);
  const [seoAuditResult, setSeoAuditResult] = useState<Record<string, SeoAuditResult>>({});
  const [seoAuditHistory, setSeoAuditHistory] = useState<Record<string, SeoAuditHistoryItem[]>>({});
  const [seoAuditHistoryOpen, setSeoAuditHistoryOpen] = useState<string | null>(null);
  const [seoAuditExpandedSection, setSeoAuditExpandedSection] = useState<string | null>(null);
  const [seoAuditExpandedFinding, setSeoAuditExpandedFinding] = useState<string | null>(null);
  const [seoAuditActionLoading, setSeoAuditActionLoading] = useState<string | null>(null);
  const [seoAuditActionResult, setSeoAuditActionResult] = useState<Record<string, string>>({});

  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState<string | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<Record<string, string>>({});

  // ── Audit Reports state (daily scheduled audit history + JSON summaries) ──
  const [auditReportsOpen, setAuditReportsOpen] = useState<string | null>(null);
  const [auditReportsData, setAuditReportsData] = useState<Record<string, Array<{
    id: string; healthScore: number; totalFindings: number; criticalCount: number;
    highCount: number; summary: string; triggeredBy: string; createdAt: string;
  }>>>({});
  const [auditReportsLoading, setAuditReportsLoading] = useState<string | null>(null);
  const [auditJsonExpanded, setAuditJsonExpanded] = useState<string | null>(null);
  const [auditJsonData, setAuditJsonData] = useState<Record<string, unknown> | null>(null);
  const [auditJsonLoading, setAuditJsonLoading] = useState<string | null>(null);
  const [auditJsonCopied, setAuditJsonCopied] = useState(false);

  // ── Aggregated Report state ──
  const [aggReportSiteId, setAggReportSiteId] = useState<string | null>(null);
  const [aggReportLoading, setAggReportLoading] = useState<string | null>(null);
  const [aggReportStep, setAggReportStep] = useState<"idle" | "checking" | "choose" | "generating" | "done" | "error">("idle");
  const [aggReportSources, setAggReportSources] = useState<Record<string, unknown> | null>(null);
  const [aggReportData, setAggReportData] = useState<Record<string, Record<string, unknown>>>({});
  const [aggReportCopied, setAggReportCopied] = useState<string | null>(null);
  const [aggReportSaving, setAggReportSaving] = useState(false);
  const [aggReportSaved, setAggReportSaved] = useState(false);
  const [aggReportSection, setAggReportSection] = useState<string | null>(null);
  const [aggReportError, setAggReportError] = useState<string | null>(null);

  // ── Latest Published Content state ──
  const [latestPubSiteId, setLatestPubSiteId] = useState<string | null>(null);
  const [latestPubLoading, setLatestPubLoading] = useState<string | null>(null);
  const [latestPubData, setLatestPubData] = useState<Record<string, LatestPublishedArticle[]>>({});

  const loadLatestPublished = async (siteId: string) => {
    if (latestPubSiteId === siteId) { setLatestPubSiteId(null); return; }
    setLatestPubSiteId(siteId);
    setLatestPubLoading(siteId);
    try {
      const res = await fetch(`/api/admin/latest-published?siteId=${encodeURIComponent(siteId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setLatestPubData((prev) => ({ ...prev, [siteId]: json.articles ?? [] }));
    } catch (e) {
      console.warn("[cockpit] latest-published load failed:", e instanceof Error ? e.message : e);
      setLatestPubData((prev) => ({ ...prev, [siteId]: [] }));
    } finally {
      setLatestPubLoading(null);
    }
  };

  const openAggReport = async (siteId: string) => {
    if (aggReportSiteId === siteId && aggReportStep !== "idle") {
      setAggReportSiteId(null);
      setAggReportStep("idle");
      return;
    }
    setAggReportSiteId(siteId);
    setAggReportStep("checking");
    setAggReportError(null);
    setAggReportSaved(false);
    setAggReportSection(null);
    try {
      const res = await fetch(`/api/admin/aggregated-report?siteId=${encodeURIComponent(siteId)}&checkRecent=true`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setAggReportSources(json);
      // If there's a recent aggregated report saved, offer to load it directly
      if (json.sources?.aggregatedReport?.hasRecent && json.sources.aggregatedReport.report) {
        setAggReportData((prev) => ({ ...prev, [siteId]: json.sources.aggregatedReport.report as Record<string, unknown> }));
      }
      setAggReportStep("choose");
    } catch (e) {
      setAggReportError(e instanceof Error ? e.message : "Failed to check data sources");
      setAggReportStep("error");
    }
  };

  const generateAggReport = async (siteId: string, useCached: boolean) => {
    setAggReportStep("generating");
    setAggReportError(null);
    setAggReportLoading(siteId);
    try {
      // If useCached and there's already a report, skip generation
      if (useCached && aggReportData[siteId] && Object.keys(aggReportData[siteId]).length > 0) {
        setAggReportStep("done");
        return;
      }
      const res = await fetch(`/api/admin/aggregated-report?siteId=${encodeURIComponent(siteId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Generation failed");
      setAggReportData((prev) => ({ ...prev, [siteId]: json }));
      setAggReportStep("done");
    } catch (e) {
      setAggReportError(e instanceof Error ? e.message : "Report generation failed");
      setAggReportStep("error");
    } finally {
      setAggReportLoading(null);
    }
  };

  const saveAggReport = async (siteId: string) => {
    setAggReportSaving(true);
    try {
      const res = await fetch("/api/admin/aggregated-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setAggReportSaved(true);
        if (json.reportId) {
          setAggReportData((prev) => ({ ...prev, [siteId]: { ...prev[siteId], reportId: json.reportId, savedAt: new Date().toISOString() } }));
        }
      }
    } catch (e) {
      console.warn("[cockpit] save aggregated report failed:", e instanceof Error ? e.message : e);
    } finally {
      setAggReportSaving(false);
    }
  };

  const copyAggReportSection = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setAggReportCopied(label);
      setTimeout(() => setAggReportCopied(null), 3000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setAggReportCopied(label);
      setTimeout(() => setAggReportCopied(null), 3000);
    }
  };

  const loadAuditReports = async (siteId: string) => {
    if (auditReportsOpen === siteId) { setAuditReportsOpen(null); return; }
    setAuditReportsOpen(siteId);
    setAuditReportsLoading(siteId);
    setAuditJsonExpanded(null);
    setAuditJsonData(null);
    try {
      const res = await fetch(`/api/admin/seo-audit?siteId=${encodeURIComponent(siteId)}&history=true`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setAuditReportsData((prev) => ({ ...prev, [siteId]: json.reports ?? [] }));
    } catch (e) {
      console.warn("[cockpit] audit reports load failed:", e instanceof Error ? e.message : e);
      setAuditReportsData((prev) => ({ ...prev, [siteId]: [] }));
    } finally {
      setAuditReportsLoading(null);
    }
  };

  const loadAuditJson = async (reportId: string, siteId: string) => {
    if (auditJsonExpanded === reportId) { setAuditJsonExpanded(null); return; }
    setAuditJsonExpanded(reportId);
    setAuditJsonLoading(reportId);
    setAuditJsonCopied(false);
    try {
      const res = await fetch(`/api/admin/seo-audit?reportId=${encodeURIComponent(reportId)}&format=json_summary&siteId=${encodeURIComponent(siteId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setAuditJsonData(json);
    } catch (e) {
      console.warn("[cockpit] audit JSON load failed:", e instanceof Error ? e.message : e);
      setAuditJsonData({ error: e instanceof Error ? e.message : "Failed to load" });
    } finally {
      setAuditJsonLoading(null);
    }
  };

  const copyAuditJson = async () => {
    if (!auditJsonData) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(auditJsonData, null, 2));
      setAuditJsonCopied(true);
      setTimeout(() => setAuditJsonCopied(false), 3000);
    } catch {
      // Fallback for iOS Safari
      const textarea = document.createElement("textarea");
      textarea.value = JSON.stringify(auditJsonData, null, 2);
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setAuditJsonCopied(true);
      setTimeout(() => setAuditJsonCopied(false), 3000);
    }
  };

  const exportAuditJson = async (siteId: string) => {
    setExportLoading(siteId);
    try {
      const res = await fetch(`/api/admin/audit-export?siteId=${encodeURIComponent(siteId)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.hint || body.detail || `Export failed: ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-${siteId}-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setPublishResult((prev) => ({ ...prev, [siteId]: `❌ Export failed: ${e instanceof Error ? e.message : "Network error"}` }));
    } finally {
      setExportLoading(null);
    }
  };

  const runDiagnosticSweep = async (siteId: string) => {
    setDiagnosticLoading(siteId);
    try {
      const res = await fetch("/api/cron/diagnostic-sweep", { method: "POST" });
      if (!res.ok) throw new Error(res.status === 401 ? "Not authorized — check admin login" : `Server error: ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setDiagnosticResult((prev) => ({ ...prev, [siteId]: `Fixed ${json.fixes?.filter((f: Record<string, unknown>) => f.success).length || 0} issues. ${json.summary || ""}` }));
      } else {
        setDiagnosticResult((prev) => ({ ...prev, [siteId]: `❌ ${json.error || "Diagnostic failed"}` }));
      }
    } catch (e) {
      setDiagnosticResult((prev) => ({ ...prev, [siteId]: `❌ ${e instanceof Error ? e.message : "Network error"}` }));
    } finally {
      setDiagnosticLoading(null);
    }
  };

  const runMasterAudit = async (siteId: string) => {
    setSeoAuditLoading(siteId);
    setSeoAuditExpandedSection(null);
    setSeoAuditExpandedFinding(null);
    try {
      const res = await fetch("/api/admin/seo-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_report", siteId }),
      });
      const json = await res.json();
      if (json.success) {
        setSeoAuditResult((prev) => ({ ...prev, [siteId]: json as SeoAuditResult }));
        setSeoAuditSiteId(siteId);
        // Refresh history
        loadAuditHistory(siteId);
      } else {
        setPublishResult((prev) => ({ ...prev, [siteId]: `❌ Audit failed: ${json.error}` }));
      }
    } catch (e) {
      setPublishResult((prev) => ({ ...prev, [siteId]: `❌ Audit error: ${e instanceof Error ? e.message : "Network error"}` }));
    } finally {
      setSeoAuditLoading(null);
    }
  };

  const loadAuditHistory = async (siteId: string) => {
    try {
      const res = await fetch(`/api/admin/seo-audit?siteId=${encodeURIComponent(siteId)}&history=true`);
      const json = await res.json();
      if (json.success && json.reports) {
        setSeoAuditHistory((prev) => ({ ...prev, [siteId]: json.reports }));
      }
    } catch {
      console.warn("[sites] Failed to load audit history");
    }
  };

  const loadPreviousReport = async (reportId: string, siteId: string) => {
    setSeoAuditLoading(siteId);
    try {
      const res = await fetch(`/api/admin/seo-audit?reportId=${encodeURIComponent(reportId)}`);
      const json = await res.json();
      if (json.success) {
        setSeoAuditResult((prev) => ({ ...prev, [siteId]: json as SeoAuditResult }));
        setSeoAuditSiteId(siteId);
        setSeoAuditHistoryOpen(null);
      }
    } catch {
      console.warn("[sites] Failed to load report");
    } finally {
      setSeoAuditLoading(null);
    }
  };

  const runAuditAction = async (siteId: string, cronName: string, actionId: string) => {
    setSeoAuditActionLoading(actionId);
    try {
      // auto_fix_all is its own action handler, not a run_cron target
      const isAutoFixAll = cronName === "auto_fix_all";
      const res = await fetch("/api/admin/seo-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isAutoFixAll
          ? { action: "auto_fix_all", siteId }
          : { action: "run_cron", cron: cronName, siteId }),
      });
      if (!res.ok) {
        let errorMsg = `Server error (${res.status})`;
        try { const err = await res.json(); errorMsg = err.error || errorMsg; } catch { /* non-JSON */ }
        setSeoAuditActionResult((prev) => ({ ...prev, [actionId]: `❌ ${errorMsg}` }));
        return;
      }
      let json;
      try { json = await res.json(); } catch { json = { success: false, error: "Invalid response" }; }
      if (isAutoFixAll && json.success) {
        const msg = `✅ ${json.fixesRun}/${json.fixesTotal} fixes ran (score: ${json.auditScore})`;
        setSeoAuditActionResult((prev) => ({ ...prev, [actionId]: msg }));
      } else {
        setSeoAuditActionResult((prev) => ({
          ...prev,
          [actionId]: json.success ? "✅ Done" : `❌ ${json.error || "Failed"}`,
        }));
      }
    } catch (e) {
      setSeoAuditActionResult((prev) => ({
        ...prev,
        [actionId]: `❌ ${e instanceof Error ? e.message : "Error"}`,
      }));
    } finally {
      setSeoAuditActionLoading(null);
    }
  };

  const runAudit = async (siteId: string) => {
    setAuditLoading(siteId);
    try {
      const res = await fetch("/api/admin/performance-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, strategy: "mobile" }),
      });
      if (!res.ok) {
        let errorMsg = `Server error (${res.status})`;
        try { const err = await res.json(); errorMsg = err.error || errorMsg; } catch { /* non-JSON response */ }
        setPublishResult((prev) => ({ ...prev, [siteId]: `❌ Audit failed: ${errorMsg}` }));
        return;
      }
      let json;
      try { json = await res.json(); } catch { setPublishResult((prev) => ({ ...prev, [siteId]: "❌ Audit returned invalid response" })); return; }
      if (json.success) {
        setAuditResults((prev) => ({
          ...prev,
          [siteId]: {
            runId: json.runId,
            avgPerformance: json.summary.avgPerformance,
            avgAccessibility: json.summary.avgAccessibility,
            avgSeo: json.summary.avgSeo,
            avgLcpMs: json.summary.avgLcpMs,
            pagesAudited: json.pagesAudited,
            pages: json.pages,
            createdAt: new Date().toISOString(),
            warning: json.warning || null,
          },
        }));
        setAuditSiteId(siteId);
      } else {
        setPublishResult((prev) => ({ ...prev, [siteId]: `❌ Audit failed: ${json.error}` }));
      }
    } catch (e) {
      setPublishResult((prev) => ({ ...prev, [siteId]: `❌ Audit error: ${e instanceof Error ? e.message : "Network error"}` }));
    } finally {
      setAuditLoading(null);
    }
  };

  const publishSite = async (siteId: string) => {
    setPublishLoading(siteId);
    try {
      const r = await fetch("/api/admin/force-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, locale: "both", count: 1 }),
      });
      const j = await r.json();
      setPublishResult((prev) => ({ ...prev, [siteId]: j.success ? `✅ ${j.published?.length ?? 0} article(s) published` : `❌ ${j.error ?? "No articles ready"}` }));
    } catch (e) {
      setPublishResult((prev) => ({ ...prev, [siteId]: `❌ ${e instanceof Error ? e.message : "Error"}` }));
    } finally {
      setPublishLoading(null);
    }
  };

  const quickAction = async (endpoint: string, body: object, label: string) => {
    setActionLoading(label);
    try {
      // Cron routes require CRON_SECRET — route through departures API
      const isCronRoute = endpoint.startsWith("/api/cron/");
      const fetchUrl = isCronRoute ? "/api/admin/departures" : endpoint;
      const fetchBody = isCronRoute ? { path: endpoint, ...body } : body;
      const res = await fetch(fetchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fetchBody),
      });
      if (!res.ok) console.warn(`[sites] ${label} returned HTTP ${res.status}`);
    } catch (e) {
      console.warn(`[sites] ${label} failed:`, e instanceof Error ? e.message : e);
    } finally {
      setActionLoading(null);
    }
  };

  // Automation readiness checklist per site
  const getReadiness = (site: SiteSummary) => {
    const checks = [
      { label: "Site config in sites.ts", ok: site.isActive },
      { label: "Topic templates", ok: site.topicsQueued > 0 },
      { label: "Published content", ok: site.articlesPublished > 0 },
      { label: "Content in pipeline", ok: site.inPipeline > 0 || site.reservoir > 0 },
      { label: "SEO scoring active", ok: site.avgSeoScore > 0 },
      { label: "Indexing active", ok: site.indexRate > 0 },
    ];
    const passCount = checks.filter((c) => c.ok).length;
    return { checks, passCount, total: checks.length, percentage: Math.round((passCount / checks.length) * 100) };
  };

  if (sites.length === 0) {
    return (
      <Card className="text-center py-8">
        <p className="text-stone-500 text-sm">No site data available. Check database connection in Settings.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {sites.map((site) => {
        const readiness = getReadiness(site);
        const isExpanded = expandedSite === site.id;
        const daysSincePublish = site.lastPublishedAt
          ? Math.floor((Date.now() - new Date(site.lastPublishedAt).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return (
          <Card key={site.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                    site.isActive
                      ? "bg-[rgba(45,90,61,0.10)] text-[#2D5A3D] border-[rgba(45,90,61,0.25)]"
                      : "bg-stone-100 text-stone-500 border-stone-200"
                  }`}>
                    {site.isActive ? "Active" : "Inactive"}
                  </span>
                  <h3 className="text-sm font-semibold text-stone-800">{site.name}</h3>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">{site.domain}</p>
              </div>
              {/* Readiness badge */}
              <div className={`text-xs px-2 py-1 rounded-lg border font-medium ${
                readiness.percentage >= 80 ? "bg-[rgba(45,90,61,0.06)] text-[#2D5A3D] border-[rgba(45,90,61,0.25)]" :
                readiness.percentage >= 50 ? "bg-[rgba(196,154,42,0.06)] text-[#7a5a10] border-[rgba(196,154,42,0.25)]" :
                "bg-[rgba(200,50,43,0.06)] text-[#C8322B] border-[rgba(200,50,43,0.25)]"
              }`}>
                {readiness.percentage}% ready
              </div>
            </div>

            {/* Data load error — show instead of misleading zeros */}
            {site.dataError && (
              <div className="mt-2 bg-[rgba(200,50,43,0.06)] border border-[rgba(200,50,43,0.3)] rounded-lg px-3 py-2 text-xs text-[#C8322B]">
                <div className="font-medium mb-1">Data load failed</div>
                <div className="text-[#C8322B]/80 text-[10px]">{site.dataError}</div>
                <button
                  onClick={() => onRefresh()}
                  className="mt-1.5 px-2 py-0.5 rounded bg-[rgba(200,50,43,0.10)] hover:bg-[rgba(200,50,43,0.15)] text-[#C8322B] text-[10px] border border-[rgba(200,50,43,0.25)]"
                >
                  Tap to retry
                </button>
              </div>
            )}

            {/* Content gap warning */}
            {!site.dataError && daysSincePublish !== null && daysSincePublish > 3 && (
              <div className="mt-2 bg-[rgba(196,154,42,0.04)] border border-[rgba(196,154,42,0.3)] rounded-lg px-3 py-1.5 text-xs text-[#7a5a10]">
                {daysSincePublish}d since last publish — content gap detected
              </div>
            )}

            <div className="mt-3 grid grid-cols-4 gap-2 text-xs text-center">
              <div className="bg-stone-100/50 rounded p-2">
                <div className="font-bold text-[#2D5A3D]">{site.articlesPublished}</div>
                <div className="text-stone-500">Published</div>
              </div>
              <div className="bg-stone-100/50 rounded p-2">
                <div className="font-bold text-[#3B7EA1]">{site.reservoir}</div>
                <div className="text-stone-500">Reservoir</div>
              </div>
              <div className="bg-stone-100/50 rounded p-2">
                <div className="font-bold text-[#C49A2A]">{site.inPipeline}</div>
                <div className="text-stone-500">Pipeline</div>
              </div>
              <div className="bg-stone-100/50 rounded p-2">
                <div className="font-bold text-stone-400">{site.topicsQueued}</div>
                <div className="text-stone-500">Topics</div>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-1 text-xs text-stone-500">
              <span>Avg SEO: <span className={site.avgSeoScore >= 70 ? "text-[#2D5A3D]" : site.avgSeoScore > 0 ? "text-[#C49A2A]" : "text-[#C8322B]"}>{site.avgSeoScore > 0 ? site.avgSeoScore : "n/a"}</span></span>
              <span className="ml-2">Indexed: <span className={site.indexRate >= 80 ? "text-[#2D5A3D]" : site.indexRate > 0 ? "text-[#C49A2A]" : "text-[#C8322B]"}>{site.indexRate}%</span></span>
              {site.lastPublishedAt && <span className="ml-2">Last article: {timeAgo(site.lastPublishedAt)}</span>}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                onClick={() => onSelectSite(site.id)}
                className="px-2 py-1 rounded text-xs bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200"
              >
                Content
              </button>
              <button
                onClick={() => window.open(`https://${site.domain}`, "_blank")}
                className="px-2 py-1 rounded text-xs bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200"
              >
                View Site
              </button>
              <ActionButton
                onClick={() => publishSite(site.id)}
                loading={publishLoading === site.id}
                variant="success"
              >
                Publish
              </ActionButton>
              <ActionButton
                onClick={() => quickAction("/api/cron/weekly-topics", { siteId: site.id }, `topics-${site.id}`)}
                loading={actionLoading === `topics-${site.id}`}
              >
                Gen Topics
              </ActionButton>
              <ActionButton
                onClick={() => quickAction("/api/cron/content-builder", { siteId: site.id }, `build-${site.id}`)}
                loading={actionLoading === `build-${site.id}`}
              >
                Build
              </ActionButton>
              <ActionButton
                onClick={() => quickAction("/api/cron/seo-agent", { siteId: site.id }, `seo-${site.id}`)}
                loading={actionLoading === `seo-${site.id}`}
              >
                SEO
              </ActionButton>
              <ActionButton
                onClick={() => runAudit(site.id)}
                loading={auditLoading === site.id}
                variant="amber"
              >
                Audit Site
              </ActionButton>
              <ActionButton
                onClick={() => runMasterAudit(site.id)}
                loading={seoAuditLoading === site.id}
                variant="amber"
              >
                Master Audit
              </ActionButton>
              <ActionButton
                onClick={() => exportAuditJson(site.id)}
                loading={exportLoading === site.id}
                variant="amber"
              >
                Export JSON
              </ActionButton>
              <ActionButton
                onClick={() => runDiagnosticSweep(site.id)}
                loading={diagnosticLoading === site.id}
              >
                Diagnose
              </ActionButton>
              <button
                onClick={() => window.location.href = `/admin/cockpit/health?siteId=${encodeURIComponent(site.id)}`}
                className="px-2 py-1 rounded text-xs bg-[rgba(124,58,237,0.08)] hover:bg-[rgba(124,58,237,0.12)] text-[#5B21B6] border border-[rgba(124,58,237,0.25)] font-medium"
              >
                Health Report
              </button>
              <button
                onClick={() => {
                  if (seoAuditHistoryOpen === site.id) {
                    setSeoAuditHistoryOpen(null);
                  } else {
                    loadAuditHistory(site.id);
                    setSeoAuditHistoryOpen(site.id);
                  }
                }}
                className="px-2 py-1 rounded text-xs bg-stone-100 hover:bg-stone-200 text-[#5B21B6] border border-stone-200"
              >
                Reports
              </button>
              <button
                onClick={() => loadAuditReports(site.id)}
                className={`px-2 py-1 rounded text-xs border font-medium transition-colors ${
                  auditReportsOpen === site.id
                    ? "bg-[rgba(45,90,61,0.10)] text-[#2D5A3D] border-[rgba(45,90,61,0.25)]"
                    : "bg-[rgba(45,90,61,0.08)] hover:bg-[rgba(45,90,61,0.12)] text-[#2D5A3D] border-[rgba(45,90,61,0.25)]"
                }`}
              >
                {auditReportsLoading === site.id ? "Loading…" : "Audit Reports"}
              </button>
              <button
                onClick={() => window.location.href = `/admin/cockpit/per-page-audit?siteId=${encodeURIComponent(site.id)}`}
                className="px-2 py-1 rounded text-xs bg-[rgba(59,126,161,0.08)] hover:bg-[rgba(59,126,161,0.12)] text-[#1e5a7a] border border-[rgba(59,126,161,0.25)] font-medium"
              >
                Per-Page Audit
              </button>
              <button
                onClick={() => loadLatestPublished(site.id)}
                className={`px-2 py-1 rounded text-xs border transition-colors ${
                  latestPubSiteId === site.id
                    ? "bg-[rgba(59,126,161,0.10)] text-[#1e5a7a] border-[rgba(59,126,161,0.25)]"
                    : "bg-stone-100 hover:bg-stone-200 text-[#3B7EA1] border-stone-200"
                }`}
              >
                {latestPubLoading === site.id ? "Loading…" : "Latest Published"}
              </button>
              <button
                onClick={() => openAggReport(site.id)}
                className={`px-2 py-1 rounded text-xs border font-medium transition-colors ${
                  aggReportSiteId === site.id && aggReportStep !== "idle"
                    ? "bg-[rgba(196,154,42,0.12)] text-[#7a5a10] border-[rgba(196,154,42,0.3)]"
                    : "bg-[rgba(196,154,42,0.08)] hover:bg-[rgba(196,154,42,0.12)] text-[#7a5a10] border-[rgba(196,154,42,0.25)]"
                }`}
              >
                {aggReportLoading === site.id ? "Generating…" : "Aggregated Report"}
              </button>
              <button
                onClick={() => setExpandedSite(isExpanded ? null : site.id)}
                className="px-2 py-1 rounded text-xs bg-stone-100 hover:bg-stone-200 text-stone-400 border border-stone-200"
              >
                {isExpanded ? "▲ Less" : "▼ Readiness"}
              </button>
            </div>

            {publishResult[site.id] && (
              <p className={`mt-2 text-xs rounded px-2 py-1 ${publishResult[site.id].startsWith("✅") ? "bg-[rgba(45,90,61,0.06)] text-[#2D5A3D]" : "bg-[rgba(200,50,43,0.06)] text-[#C8322B]"}`}>
                {publishResult[site.id]}
              </p>
            )}
            {diagnosticResult[site.id] && (
              <p className={`mt-2 text-xs rounded px-2 py-1 ${diagnosticResult[site.id].startsWith("❌") ? "bg-[rgba(200,50,43,0.06)] text-[#C8322B]" : "bg-[rgba(59,126,161,0.06)] text-[#1e5a7a]"}`}>
                {diagnosticResult[site.id]}
              </p>
            )}

            {/* Automation readiness checklist */}
            {isExpanded && (
              <div className="mt-3 border-t border-stone-200 pt-3">
                <p className="text-xs font-semibold text-stone-400 mb-2">Automation Readiness</p>
                <div className="space-y-1">
                  {readiness.checks.map((check) => (
                    <div key={check.label} className="flex items-center gap-2 text-xs">
                      <span className={check.ok ? "text-[#2D5A3D]" : "text-stone-500"}>
                        {check.ok ? "✓" : "○"}
                      </span>
                      <span className={check.ok ? "text-stone-600" : "text-stone-500"}>{check.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      readiness.percentage >= 80 ? "bg-[#2D5A3D]" :
                      readiness.percentage >= 50 ? "bg-[#C49A2A]" : "bg-[#C8322B]"
                    }`}
                    style={{ width: `${readiness.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-stone-500 mt-1">{readiness.passCount}/{readiness.total} checks passed</p>
              </div>
            )}

            {/* Performance Audit Results Panel */}
            {auditSiteId === site.id && auditResults[site.id] && (
              <div className="mt-3 border-t border-stone-200 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-stone-400">Performance Audit (Mobile)</p>
                  <button onClick={() => setAuditSiteId(null)} className="text-xs text-stone-500 hover:text-stone-600">✕ Close</button>
                </div>
                {/* Summary scores */}
                <div className="grid grid-cols-4 gap-2 text-xs text-center mb-3">
                  {[
                    { label: "Perf", value: auditResults[site.id].avgPerformance, threshold: 90 },
                    { label: "A11y", value: auditResults[site.id].avgAccessibility, threshold: 90 },
                    { label: "SEO", value: auditResults[site.id].avgSeo, threshold: 90 },
                    { label: "LCP", value: auditResults[site.id].avgLcpMs, threshold: 2500, isMs: true },
                  ].map((m) => (
                    <div key={m.label} className="bg-stone-100/50 rounded p-2">
                      <div className={`font-bold ${
                        m.isMs ? (m.value <= m.threshold ? "text-[#2D5A3D]" : "text-[#C8322B]") :
                        m.value >= m.threshold ? "text-[#2D5A3D]" : m.value >= 50 ? "text-[#C49A2A]" : "text-[#C8322B]"
                      }`}>
                        {m.isMs ? `${(m.value / 1000).toFixed(1)}s` : m.value}
                      </div>
                      <div className="text-stone-500">{m.label}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-stone-500 mb-2">{auditResults[site.id].pagesAudited} pages audited</p>
                {auditResults[site.id].avgPerformance === 0 && auditResults[site.id].avgSeo === 0 && (
                  <div className="bg-[rgba(200,50,43,0.06)] border border-[rgba(200,50,43,0.3)]/40 rounded p-2 mb-2 text-xs text-[#C8322B]">
                    All audits failed. This usually means the Google PageSpeed API key is invalid or missing.
                    Check that GOOGLE_PAGESPEED_API_KEY starts with &quot;AIza&quot; (API Key type, not OAuth).
                  </div>
                )}
                {auditResults[site.id].warning && (
                  <div className="bg-[rgba(196,154,42,0.06)] border border-[rgba(196,154,42,0.3)]/40 rounded p-2 mb-2 text-xs text-[#C49A2A]">
                    {auditResults[site.id].warning}
                  </div>
                )}
                {/* Per-page results */}
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {auditResults[site.id].pages.map((p) => (
                    <div key={p.url} className="flex items-center justify-between text-xs bg-stone-100/30 rounded px-2 py-1.5">
                      <span className="text-stone-400 truncate max-w-[55%]">{(() => { try { return new URL(p.url).pathname; } catch { return p.url; } })()}</span>
                      <div className="flex gap-2 text-right shrink-0">
                        {p.error ? (
                          <span className="text-[#C8322B]" title={p.error}>
                            {p.error.startsWith("HTTP ") ? p.error.substring(0, 20) : "API Error"}
                          </span>
                        ) : (
                          <>
                            <span className={p.performance != null && p.performance >= 90 ? "text-[#2D5A3D]" : p.performance != null && p.performance >= 50 ? "text-[#C49A2A]" : "text-[#C8322B]"}>
                              {p.performance ?? "–"}
                            </span>
                            <span className={p.seo != null && p.seo >= 90 ? "text-[#2D5A3D]" : "text-[#C49A2A]"}>
                              {p.seo ?? "–"}
                            </span>
                            {p.lcpMs != null && (
                              <span className={p.lcpMs <= 2500 ? "text-[#2D5A3D]" : "text-[#C8322B]"}>
                                {(p.lcpMs / 1000).toFixed(1)}s
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══════ Previous Reports History Panel ══════ */}
            {seoAuditHistoryOpen === site.id && (
              <div className="mt-3 border-t border-stone-200 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[#5B21B6]">Previous SEO Audit Reports</p>
                  <button onClick={() => setSeoAuditHistoryOpen(null)} className="text-xs text-stone-500 hover:text-stone-600">✕ Close</button>
                </div>
                {(!seoAuditHistory[site.id] || seoAuditHistory[site.id].length === 0) ? (
                  <p className="text-xs text-stone-500">No saved reports yet. Run a Master Audit to create the first one.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {seoAuditHistory[site.id].map((report) => (
                      <button
                        key={report.id}
                        onClick={() => loadPreviousReport(report.id, site.id)}
                        className="w-full text-left bg-stone-100/50 hover:bg-stone-100 rounded-lg px-3 py-2 text-xs transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${
                              report.healthScore >= 70 ? "text-[#2D5A3D]" :
                              report.healthScore >= 40 ? "text-[#C49A2A]" : "text-[#C8322B]"
                            }`}>
                              {report.healthScore}/100
                            </span>
                            <span className="text-stone-500">{timeAgo(report.createdAt)}</span>
                          </div>
                          <div className="flex gap-1.5">
                            {report.criticalCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-[rgba(200,50,43,0.10)] text-[#C8322B] text-[10px]">{report.criticalCount} critical</span>
                            )}
                            {report.highCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-[rgba(217,119,6,0.10)] text-[#92400E] text-[10px]">{report.highCount} high</span>
                            )}
                          </div>
                        </div>
                        <p className="text-stone-400 text-[11px] mt-1 line-clamp-1">{report.summary}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══════ Master SEO Audit Results Panel ══════ */}
            {seoAuditSiteId === site.id && seoAuditResult[site.id] && (() => {
              const audit = seoAuditResult[site.id];
              const severityColors: Record<string, string> = {
                critical: "bg-[rgba(200,50,43,0.10)] text-[#C8322B] border-[rgba(200,50,43,0.25)]",
                high: "bg-[rgba(217,119,6,0.10)] text-[#92400E] border-[rgba(217,119,6,0.25)]",
                medium: "bg-[rgba(196,154,42,0.10)] text-[#7a5a10] border-[rgba(196,154,42,0.25)]",
                low: "bg-[rgba(59,126,161,0.10)] text-[#1e5a7a] border-[rgba(59,126,161,0.25)]",
                info: "bg-stone-100 text-stone-400 border-stone-200",
              };
              const severityDots: Record<string, string> = {
                critical: "bg-[#C8322B]",
                high: "bg-[#D97706]",
                medium: "bg-[#C49A2A]",
                low: "bg-[#3B7EA1]",
                info: "bg-stone-400",
              };
              return (
                <div className="mt-3 border-t border-[rgba(124,58,237,0.15)] pt-3">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-[#5B21B6]">Master SEO Audit</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-500">{Math.round(audit.durationMs / 1000)}s</span>
                      <button onClick={() => setSeoAuditSiteId(null)} className="text-xs text-stone-500 hover:text-stone-600">✕ Close</button>
                    </div>
                  </div>

                  {/* Save warning */}
                  {audit.saveError && (
                    <div className="mb-2 bg-[rgba(196,154,42,0.06)] border border-[rgba(196,154,42,0.3)]/40 rounded-lg px-3 py-1.5 text-[11px] text-[#7a5a10]">
                      {audit.saveError}
                    </div>
                  )}

                  {/* Health Score + Summary */}
                  <div className="bg-stone-100/60 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl font-black ${
                        audit.healthScore >= 70 ? "text-[#2D5A3D]" :
                        audit.healthScore >= 40 ? "text-[#C49A2A]" : "text-[#C8322B]"
                      }`}>
                        {audit.healthScore}
                      </div>
                      <div className="flex-1">
                        <div className="text-[10px] text-stone-500 uppercase tracking-wider">Health Score</div>
                        <div className="h-1.5 bg-stone-200 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              audit.healthScore >= 70 ? "bg-[#2D5A3D]" :
                              audit.healthScore >= 40 ? "bg-[#C49A2A]" : "bg-[#C8322B]"
                            }`}
                            style={{ width: `${audit.healthScore}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-stone-600 mt-2">{audit.summary}</p>
                    <div className="flex gap-2 mt-2 text-[10px]">
                      {audit.criticalCount > 0 && <span className="px-1.5 py-0.5 rounded bg-[rgba(200,50,43,0.10)] text-[#C8322B]">{audit.criticalCount} critical</span>}
                      {audit.highCount > 0 && <span className="px-1.5 py-0.5 rounded bg-[rgba(217,119,6,0.10)] text-[#92400E]">{audit.highCount} high</span>}
                      {audit.mediumCount > 0 && <span className="px-1.5 py-0.5 rounded bg-[rgba(196,154,42,0.10)] text-[#7a5a10]">{audit.mediumCount} medium</span>}
                      {audit.lowCount > 0 && <span className="px-1.5 py-0.5 rounded bg-[rgba(59,126,161,0.10)] text-[#1e5a7a]">{audit.lowCount} low</span>}
                    </div>
                  </div>

                  {/* Indexing Quick Stats */}
                  <div className="grid grid-cols-4 gap-1.5 mb-3 text-center text-xs">
                    <div className="bg-stone-100/50 rounded-lg p-2">
                      <div className={`font-bold ${audit.indexingSummary.indexRate >= 60 ? "text-[#2D5A3D]" : "text-[#C8322B]"}`}>
                        {audit.indexingSummary.indexRate}%
                      </div>
                      <div className="text-stone-500 text-[10px]">Indexed</div>
                    </div>
                    <div className="bg-stone-100/50 rounded-lg p-2">
                      <div className="font-bold text-[#3B7EA1]">{audit.indexingSummary.submitted}</div>
                      <div className="text-stone-500 text-[10px]">Submitted</div>
                    </div>
                    <div className="bg-stone-100/50 rounded-lg p-2">
                      <div className={`font-bold ${audit.indexingSummary.discovered > 10 ? "text-[#C49A2A]" : "text-stone-400"}`}>
                        {audit.indexingSummary.discovered}
                      </div>
                      <div className="text-stone-500 text-[10px]">Discovered</div>
                    </div>
                    <div className="bg-stone-100/50 rounded-lg p-2">
                      <div className={`font-bold ${audit.indexingSummary.errors > 0 ? "text-[#C8322B]" : "text-stone-400"}`}>
                        {audit.indexingSummary.errors}
                      </div>
                      <div className="text-stone-500 text-[10px]">Errors</div>
                    </div>
                  </div>

                  {/* Trends */}
                  {audit.trends && (
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Week-over-Week Trends</p>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <div className="bg-stone-100/50 rounded-lg px-2.5 py-2">
                          <div className="text-stone-500 text-[10px]">Clicks</div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-stone-700">{audit.trends.weeklyClicks.current}</span>
                            {audit.trends.weeklyClicks.change !== 0 && (
                              <span className={`text-[10px] font-medium ${audit.trends.weeklyClicks.change > 0 ? "text-[#2D5A3D]" : "text-[#C8322B]"}`}>
                                {audit.trends.weeklyClicks.change > 0 ? "↑" : "↓"}{Math.abs(audit.trends.weeklyClicks.change)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="bg-stone-100/50 rounded-lg px-2.5 py-2">
                          <div className="text-stone-500 text-[10px]">Impressions</div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-stone-700">{audit.trends.weeklyImpressions.current}</span>
                            {audit.trends.weeklyImpressions.change !== 0 && (
                              <span className={`text-[10px] font-medium ${audit.trends.weeklyImpressions.change > 0 ? "text-[#2D5A3D]" : "text-[#C8322B]"}`}>
                                {audit.trends.weeklyImpressions.change > 0 ? "↑" : "↓"}{Math.abs(audit.trends.weeklyImpressions.change)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="bg-stone-100/50 rounded-lg px-2.5 py-2">
                          <div className="text-stone-500 text-[10px]">Indexing Velocity</div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-stone-700">{audit.trends.indexingVelocity.thisWeek}</span>
                            <span className="text-stone-500 text-[10px]">vs {audit.trends.indexingVelocity.lastWeek} prev</span>
                          </div>
                        </div>
                        <div className="bg-stone-100/50 rounded-lg px-2.5 py-2">
                          <div className="text-stone-500 text-[10px]">Content Published</div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-stone-700">{audit.trends.contentVelocity.thisWeek}</span>
                            <span className="text-stone-500 text-[10px]">vs {audit.trends.contentVelocity.lastWeek} prev</span>
                          </div>
                        </div>
                      </div>

                      {/* Top growing/declining */}
                      {(audit.trends.topGrowing.length > 0 || audit.trends.topDeclining.length > 0) && (
                        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
                          {audit.trends.topGrowing.length > 0 && (
                            <div className="bg-[rgba(45,90,61,0.04)] border border-[rgba(45,90,61,0.3)]/30 rounded-lg px-2 py-1.5">
                              <div className="text-[#2D5A3D] font-medium mb-1">Top Growing</div>
                              {audit.trends.topGrowing.slice(0, 3).map((p, i) => (
                                <div key={i} className="text-stone-400 truncate">
                                  +{p.clickGain} {(() => { try { return new URL(p.url).pathname; } catch { return p.url; } })()}
                                </div>
                              ))}
                            </div>
                          )}
                          {audit.trends.topDeclining.length > 0 && (
                            <div className="bg-[rgba(200,50,43,0.04)] border border-[rgba(200,50,43,0.3)]/30 rounded-lg px-2 py-1.5">
                              <div className="text-[#C8322B] font-medium mb-1">Top Declining</div>
                              {audit.trends.topDeclining.slice(0, 3).map((p, i) => (
                                <div key={i} className="text-stone-400 truncate">
                                  -{p.clickLoss} {(() => { try { return new URL(p.url).pathname; } catch { return p.url; } })()}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sections with findings */}
                  <div className="space-y-1.5 mb-3">
                    <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">Findings by Category</p>
                    {audit.sections.map((section) => {
                      const isExpanded = seoAuditExpandedSection === section.name;
                      const criticals = section.findings.filter((f) => f.severity === "critical").length;
                      const highs = section.findings.filter((f) => f.severity === "high").length;
                      return (
                        <div key={section.name}>
                          <button
                            onClick={() => setSeoAuditExpandedSection(isExpanded ? null : section.name)}
                            className="w-full flex items-center justify-between bg-stone-100/50 hover:bg-stone-100 rounded-lg px-3 py-2 text-xs transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span>{section.icon}</span>
                              <span className="font-medium text-stone-700">{section.name}</span>
                              <span className="text-stone-500">({section.findings.length})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {criticals > 0 && <span className="w-2 h-2 rounded-full bg-[#C8322B]" />}
                              {highs > 0 && <span className="w-2 h-2 rounded-full bg-[#D97706]" />}
                              <span className={`text-[10px] font-bold ${
                                section.score >= 80 ? "text-[#2D5A3D]" :
                                section.score >= 50 ? "text-[#C49A2A]" : "text-[#C8322B]"
                              }`}>
                                {section.score}/{section.maxScore}
                              </span>
                              <span className="text-stone-500">{isExpanded ? "▲" : "▼"}</span>
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="mt-1 space-y-1 ml-2">
                              {section.findings.map((finding) => {
                                const findingExpanded = seoAuditExpandedFinding === finding.id;
                                return (
                                  <div key={finding.id}>
                                    <button
                                      onClick={() => setSeoAuditExpandedFinding(findingExpanded ? null : finding.id)}
                                      className={`w-full text-left rounded-lg px-3 py-2 text-xs border ${severityColors[finding.severity]}`}
                                    >
                                      <div className="flex items-start gap-2">
                                        <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${severityDots[finding.severity]}`} />
                                        <div className="flex-1">
                                          <div className="font-medium">{finding.title}</div>
                                          {!findingExpanded && finding.count > 0 && (
                                            <span className="text-[10px] opacity-70">({finding.count} affected)</span>
                                          )}
                                        </div>
                                      </div>
                                    </button>
                                    {findingExpanded && (
                                      <div className="ml-4 mt-1 bg-stone-50/80 border border-stone-200 rounded-lg px-3 py-2 text-[11px] space-y-2">
                                        <div>
                                          <span className="text-stone-500 font-medium">What it means: </span>
                                          <span className="text-stone-600">{finding.description}</span>
                                        </div>
                                        {finding.impact && (
                                          <div>
                                            <span className="text-stone-500 font-medium">Impact: </span>
                                            <span className="text-stone-600">{finding.impact}</span>
                                          </div>
                                        )}
                                        {finding.fix && (
                                          <div>
                                            <span className="text-stone-500 font-medium">How to fix: </span>
                                            <span className="text-stone-600">{finding.fix}</span>
                                          </div>
                                        )}
                                        {finding.affected.length > 0 && (
                                          <div>
                                            <span className="text-stone-500 font-medium">Affected ({finding.count}): </span>
                                            <div className="mt-1 max-h-24 overflow-y-auto space-y-0.5">
                                              {finding.affected.slice(0, 10).map((a, i) => (
                                                <div key={i} className="text-stone-400 text-[10px] font-mono truncate">{a}</div>
                                              ))}
                                              {finding.affected.length > 10 && (
                                                <div className="text-stone-500 text-[10px]">... and {finding.affected.length - 10} more</div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Available Actions */}
                  {audit.availableActions && audit.availableActions.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Quick Fix Actions</p>
                      <div className="space-y-1">
                        {audit.availableActions.map((action) => (
                          <div key={action.id} className="flex items-center justify-between bg-stone-100/50 rounded-lg px-3 py-2">
                            <div className="flex-1 mr-2">
                              <div className="text-xs font-medium text-stone-700">{action.label}</div>
                              <div className="text-[10px] text-stone-500">{action.description}</div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {seoAuditActionResult[action.id] && (
                                <span className={`text-[10px] ${seoAuditActionResult[action.id].startsWith("✅") ? "text-[#2D5A3D]" : "text-[#C8322B]"}`}>
                                  {seoAuditActionResult[action.id]}
                                </span>
                              )}
                              <ActionButton
                                onClick={() => runAuditAction(site.id, action.cron, action.id)}
                                loading={seoAuditActionLoading === action.id}
                                variant="success"
                                className="!px-2 !py-1 !text-[10px]"
                              >
                                Run
                              </ActionButton>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-[10px] text-stone-500 pt-2 border-t border-stone-200">
                    <span>{audit.siteName} — {new Date(audit.timestamp).toLocaleString()}</span>
                    {audit.reportId && <span className="text-[#5B21B6]">Saved</span>}
                  </div>
                </div>
              );
            })()}

            {/* ══════ Audit Reports Panel (daily + manual reports with JSON copy) ══════ */}
            {auditReportsOpen === site.id && (
              <div className="mt-3 border-t border-[rgba(45,90,61,0.3)] pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[#2D5A3D]">Audit Reports</p>
                  <button onClick={() => setAuditReportsOpen(null)} className="text-xs text-stone-500 hover:text-stone-600">✕ Close</button>
                </div>
                <p className="text-[10px] text-stone-500 mb-2">Daily automated + manual SEO audits. Tap any report to see the JSON summary you can copy.</p>
                {(!auditReportsData[site.id] || auditReportsData[site.id].length === 0) ? (
                  <p className="text-xs text-stone-500">No audit reports yet. Run a Master Audit or wait for the daily scheduled audit (4:30 AM UTC).</p>
                ) : (
                  <div className="space-y-1.5 max-h-[70vh] overflow-y-auto">
                    {auditReportsData[site.id].map((report) => {
                      const isJsonOpen = auditJsonExpanded === report.id;
                      return (
                        <div key={report.id}>
                          <button
                            onClick={() => loadAuditJson(report.id, site.id)}
                            className="w-full text-left bg-stone-100/50 hover:bg-stone-100 rounded-lg px-3 py-2.5 text-xs transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-sm ${
                                  report.healthScore >= 70 ? "text-[#2D5A3D]" :
                                  report.healthScore >= 40 ? "text-[#C49A2A]" : "text-[#C8322B]"
                                }`}>
                                  {report.healthScore}
                                </span>
                                <div>
                                  <div className="text-stone-600 text-[11px]">
                                    {new Date(report.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                    {" "}
                                    <span className="text-stone-500">{new Date(report.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                                  </div>
                                  <span className={`text-[9px] px-1 py-0.5 rounded ${
                                    report.triggeredBy === "scheduled" ? "bg-[rgba(59,126,161,0.08)] text-[#3B7EA1]" : "bg-stone-200/50 text-stone-400"
                                  }`}>
                                    {report.triggeredBy === "scheduled" ? "Daily Auto" : "Manual"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                {report.criticalCount > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-[rgba(200,50,43,0.10)] text-[#C8322B] text-[10px]">{report.criticalCount}C</span>
                                )}
                                {report.highCount > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-[rgba(217,119,6,0.10)] text-[#92400E] text-[10px]">{report.highCount}H</span>
                                )}
                                <span className="text-stone-500 text-[10px]">{isJsonOpen ? "▲" : "▼"}</span>
                              </div>
                            </div>
                            <p className="text-stone-500 text-[10px] mt-1 line-clamp-2">{report.summary}</p>
                          </button>

                          {/* Expanded JSON summary + plain language report */}
                          {isJsonOpen && (
                            <div className="ml-2 mt-1 space-y-2">
                              {auditJsonLoading === report.id ? (
                                <p className="text-xs text-stone-500 animate-pulse px-3 py-2">Loading report data…</p>
                              ) : auditJsonData ? (
                                <>
                                  {/* Plain language report */}
                                  {(auditJsonData as Record<string, unknown>).plainLanguage && (
                                    <div className="bg-stone-50/80 border border-stone-200 rounded-lg px-3 py-2.5">
                                      <p className="text-[10px] font-semibold text-[#2D5A3D] uppercase tracking-wider mb-1.5">Plain Language Summary</p>
                                      <pre className="text-[11px] text-stone-600 whitespace-pre-wrap font-mono leading-relaxed">
                                        {(auditJsonData as Record<string, unknown>).plainLanguage as string}
                                      </pre>
                                    </div>
                                  )}

                                  {/* JSON with copy button */}
                                  <div className="bg-stone-50/80 border border-stone-200 rounded-lg px-3 py-2.5">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">JSON Summary (tap to copy)</p>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); copyAuditJson(); }}
                                        className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                                          auditJsonCopied
                                            ? "bg-[rgba(45,90,61,0.10)] text-[#2D5A3D] border border-[rgba(45,90,61,0.25)]"
                                            : "bg-stone-200 hover:bg-stone-400 text-stone-700 border border-stone-300"
                                        }`}
                                      >
                                        {auditJsonCopied ? "Copied!" : "Copy JSON"}
                                      </button>
                                    </div>
                                    <pre className="text-[10px] text-stone-400 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto leading-relaxed">
                                      {JSON.stringify(auditJsonData, null, 2)}
                                    </pre>
                                  </div>
                                </>
                              ) : null}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══════ Aggregated Report Panel ══════ */}
            {aggReportSiteId === site.id && aggReportStep !== "idle" && (
              <div className="mt-3 border-t border-[rgba(196,154,42,0.3)] pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[#C49A2A]">Aggregated SEO Report</p>
                  <button onClick={() => { setAggReportSiteId(null); setAggReportStep("idle"); }} className="text-xs text-stone-500 hover:text-stone-600">✕ Close</button>
                </div>

                {/* Step 1: Checking sources */}
                {aggReportStep === "checking" && (
                  <p className="text-xs text-stone-400 animate-pulse">Checking data sources for recent reports…</p>
                )}

                {/* Step 2: Choose — use cached or generate fresh */}
                {aggReportStep === "choose" && aggReportSources && (() => {
                  const src = aggReportSources as { sources: { seoAudit: { hasRecent: boolean; score: number | null; lastRun: string | null }; aggregatedReport: { hasRecent: boolean; score: number | null; lastRun: string | null; summary: string | null }; gscData: { hasRecent: boolean; lastDate: string | null }; indexingData: { hasRecent: boolean } }; allSourcesFresh: boolean; estimatedGenerationTimeSec: number; recommendation: string };
                  const hasSavedReport = src.sources.aggregatedReport.hasRecent;
                  return (
                    <div className="space-y-3">
                      <p className="text-[11px] text-stone-400">{src.recommendation}</p>

                      {/* Source freshness indicators */}
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <div className={`rounded-lg px-2.5 py-2 border ${src.sources.seoAudit.hasRecent ? "bg-[rgba(45,90,61,0.04)] border-[rgba(45,90,61,0.3)]/30 text-[#2D5A3D]" : "bg-[rgba(200,50,43,0.04)] border-[rgba(200,50,43,0.3)]/30 text-[#C8322B]"}`}>
                          <div className="font-medium">{src.sources.seoAudit.hasRecent ? "✓" : "✗"} SEO Audit</div>
                          {src.sources.seoAudit.lastRun && <div className="text-[10px] opacity-70">Score: {src.sources.seoAudit.score} — {timeAgo(src.sources.seoAudit.lastRun)}</div>}
                          {!src.sources.seoAudit.hasRecent && <div className="text-[10px] opacity-70">No report in last 12h</div>}
                        </div>
                        <div className={`rounded-lg px-2.5 py-2 border ${src.sources.gscData.hasRecent ? "bg-[rgba(45,90,61,0.04)] border-[rgba(45,90,61,0.3)]/30 text-[#2D5A3D]" : "bg-[rgba(196,154,42,0.04)] border-[rgba(196,154,42,0.3)]/30 text-[#C49A2A]"}`}>
                          <div className="font-medium">{src.sources.gscData.hasRecent ? "✓" : "~"} GSC Data</div>
                          {src.sources.gscData.lastDate && <div className="text-[10px] opacity-70">Last: {new Date(src.sources.gscData.lastDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>}
                          {!src.sources.gscData.hasRecent && <div className="text-[10px] opacity-70">Data may be stale</div>}
                        </div>
                        <div className={`rounded-lg px-2.5 py-2 border ${src.sources.indexingData.hasRecent ? "bg-[rgba(45,90,61,0.04)] border-[rgba(45,90,61,0.3)]/30 text-[#2D5A3D]" : "bg-[rgba(196,154,42,0.04)] border-[rgba(196,154,42,0.3)]/30 text-[#C49A2A]"}`}>
                          <div className="font-medium">{src.sources.indexingData.hasRecent ? "✓" : "~"} Indexing</div>
                        </div>
                        {hasSavedReport && (
                          <div className="bg-[rgba(59,126,161,0.04)] border-[rgba(59,126,161,0.3)]/30 border rounded-lg px-2.5 py-2 text-[#3B7EA1]">
                            <div className="font-medium">✓ Saved Report</div>
                            <div className="text-[10px] opacity-70">Score: {src.sources.aggregatedReport.score} — {timeAgo(src.sources.aggregatedReport.lastRun!)}</div>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2">
                        {hasSavedReport && (
                          <button
                            onClick={() => generateAggReport(site.id, true)}
                            className="px-3 py-2 rounded-lg text-xs font-medium bg-[rgba(59,126,161,0.10)] hover:bg-[rgba(59,126,161,0.15)] text-[#1e5a7a] border border-[rgba(59,126,161,0.25)] transition-colors"
                          >
                            Use Saved Report
                          </button>
                        )}
                        {src.allSourcesFresh && (
                          <button
                            onClick={() => generateAggReport(site.id, false)}
                            className="px-3 py-2 rounded-lg text-xs font-medium bg-[rgba(45,90,61,0.10)] hover:bg-[rgba(45,90,61,0.15)] text-[#2D5A3D] border border-[rgba(45,90,61,0.25)] transition-colors"
                          >
                            Generate from Recent Data (~{src.estimatedGenerationTimeSec}s)
                          </button>
                        )}
                        <button
                          onClick={() => generateAggReport(site.id, false)}
                          className="px-3 py-2 rounded-lg text-xs font-medium bg-[rgba(196,154,42,0.10)] hover:bg-[rgba(196,154,42,0.15)] text-[#7a5a10] border border-[rgba(196,154,42,0.25)] transition-colors"
                        >
                          Generate Fresh (~{src.estimatedGenerationTimeSec}s)
                        </button>
                      </div>

                      {/* Tip for non-fresh sources */}
                      {!src.allSourcesFresh && (
                        <p className="text-[10px] text-stone-500">
                          Tip: Run the daily SEO audit cron first for the most complete report. Expected generation: ~{src.estimatedGenerationTimeSec}s.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Step 3: Generating */}
                {aggReportStep === "generating" && (
                  <div className="flex items-center gap-2 text-xs text-[#7a5a10]">
                    <div className="w-4 h-4 border-2 border-[rgba(196,154,42,0.4)] border-t-transparent rounded-full animate-spin" />
                    <span>Generating aggregated report… This may take 15-40 seconds.</span>
                  </div>
                )}

                {/* Step 4: Error */}
                {aggReportStep === "error" && (
                  <div className="space-y-2">
                    <div className="bg-[rgba(200,50,43,0.06)] border border-[rgba(200,50,43,0.3)] rounded-lg px-3 py-2 text-xs text-[#C8322B]">
                      {aggReportError || "An error occurred"}
                    </div>
                    <button
                      onClick={() => generateAggReport(site.id, false)}
                      className="px-3 py-1.5 rounded text-xs bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Step 5: Done — Full report display */}
                {aggReportStep === "done" && aggReportData[site.id] && (() => {
                  const rpt = aggReportData[site.id];
                  const grade = (rpt.grade as string) || "?";
                  const score = (rpt.compositeScore as number) || 0;
                  const gradeColor = grade === "A" ? "text-[#2D5A3D]" : grade === "B" ? "text-[#3B7EA1]" : grade === "C" ? "text-[#C49A2A]" : "text-[#C8322B]";
                  const gradeBg = grade === "A" ? "bg-[rgba(45,90,61,0.06)]" : grade === "B" ? "bg-[rgba(59,126,161,0.06)]" : grade === "C" ? "bg-[rgba(196,154,42,0.06)]" : "bg-[rgba(200,50,43,0.06)]";
                  const issues = (rpt.issues as Array<{ severity: string; category: string; title: string; rootCause: string; fix: string }>) || [];
                  const fixPlan = (rpt.fixPlan as Array<{ priority: number; action: string; category: string; severity: string; expectedImpact: string }>) || [];
                  const claudePrompt = (rpt.claudePrompt as string) || "";
                  const plainLanguage = (rpt.plainLanguage as string) || "";
                  const executiveSummary = (rpt.executiveSummary as string) || "";
                  const latestArticles = (rpt.latestArticles as Array<{ title: string; slug: string; indexingStatus: string; clicks: number; impressions: number; position: number; seoScore: number }>) || [];
                  const scores = (rpt.scores as { seoAudit: number; discovery: number; indexing: number; contentVelocity: number; operations: number; publicWebsite: number }) || { seoAudit: 0, discovery: 0, indexing: 0, contentVelocity: 0, operations: 0, publicWebsite: 0 };
                  const gsc = (rpt.gsc as { clicks7d: number; impressions7d: number; avgCtr7d: number; avgPosition7d: number; topPages: Array<{ url: string; clicks: number; impressions: number; position: number }> }) || { clicks7d: 0, impressions7d: 0, avgCtr7d: 0, avgPosition7d: 0, topPages: [] };
                  const indexing = (rpt.indexing as { rate: number; indexed: number; errors: number; chronicFailures: number; neverSubmitted: number }) || { rate: 0, indexed: 0, errors: 0, chronicFailures: 0, neverSubmitted: 0 };
                  const operations = (rpt.operations as { cronFailures24h: number; cronSuccesses24h: number; aiCost7d: number; failedCrons: string[] }) || { cronFailures24h: 0, cronSuccesses24h: 0, aiCost7d: 0, failedCrons: [] };
                  const discoveryData = rpt.discovery as { totalPages: number; totalIssues: number; overallScore: number; overallGrade: string; funnel: { published: number; inSitemap: number; submitted: number; crawled: number; indexed: number; performing: number; converting: number }; crawlabilityScore: number; indexabilityScore: number; contentQualityScore: number; aioReadinessScore: number; aioEligiblePages: number; topIssues: Array<{ severity: string; category: string; title: string; description: string }>; pagesNeedingAttention: Array<{ url: string; slug: string; title: string; score: number; topIssue: string }> } | null;
                  const publicAuditData = rpt.publicAudit as { pagesChecked: number; pagesReachable: number; pagesUnreachable: number; avgResponseTimeMs: number; results: Array<{ url: string; status: number; responseTimeMs: number; ok: boolean; error?: string }> } | null;
                  const platformHealthData = rpt.platformHealth as { score: number; grade: string; totalChecks: number; passed: number; failed: number; warnings: number; checks: Array<{ category: string; name: string; status: "pass" | "fail" | "warn"; detail: string }>; recentFixes: Array<{ date: string; description: string }> } | null;

                  const sections = [
                    { id: "summary", label: "Executive Summary" },
                    { id: "scores", label: "Score Breakdown" },
                    { id: "gsc", label: "Search Performance (GSC)" },
                    { id: "discovery", label: `Discovery Audit${discoveryData ? ` (${discoveryData.overallGrade})` : ""}` },
                    { id: "publicAudit", label: `Public Website${publicAuditData ? ` (${publicAuditData.pagesReachable}/${publicAuditData.pagesChecked})` : ""}` },
                    { id: "platformHealth", label: `Platform Health${platformHealthData ? ` (${platformHealthData.grade} ${platformHealthData.passed}/${platformHealthData.totalChecks})` : ""}` },
                    { id: "indexing", label: "Indexing Status" },
                    { id: "operations", label: "Operations Health" },
                    { id: "articles", label: "Latest Articles" },
                    { id: "issues", label: `Issues (${issues.length})` },
                    { id: "fixplan", label: "Fix Plan" },
                    { id: "prompt", label: "Claude Prompt" },
                    { id: "plain", label: "Plain Language Report" },
                    { id: "json", label: "Full JSON" },
                  ];

                  return (
                    <div className="space-y-3">
                      {/* Grade header */}
                      <div className={`${gradeBg} rounded-xl p-4`}>
                        <div className="flex items-center gap-4">
                          <div className={`text-4xl font-black ${gradeColor}`}>{grade}</div>
                          <div className="flex-1">
                            <div className={`text-xl font-bold ${gradeColor}`}>{score}/100</div>
                            <div className="text-[10px] text-stone-500 uppercase tracking-wider">Composite Score</div>
                            <div className="h-1.5 bg-stone-200/50 rounded-full mt-1.5 overflow-hidden">
                              <div className={`h-full rounded-full ${grade === "A" ? "bg-[#2D5A3D]" : grade === "B" ? "bg-[#3B7EA1]" : grade === "C" ? "bg-[#C49A2A]" : "bg-[#C8322B]"}`} style={{ width: `${score}%` }} />
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-stone-600 mt-2">{executiveSummary}</p>
                      </div>

                      {/* Top-level action buttons */}
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => copyAggReportSection(plainLanguage, "plain")}
                          className={`px-2.5 py-1.5 rounded text-[11px] font-medium transition-colors ${aggReportCopied === "plain" ? "bg-[rgba(45,90,61,0.10)] text-[#2D5A3D] border border-[rgba(45,90,61,0.25)]" : "bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200"}`}
                        >
                          {aggReportCopied === "plain" ? "Copied!" : "Copy Report"}
                        </button>
                        <button
                          onClick={() => copyAggReportSection(claudePrompt, "prompt")}
                          className={`px-2.5 py-1.5 rounded text-[11px] font-medium transition-colors ${aggReportCopied === "prompt" ? "bg-[rgba(45,90,61,0.10)] text-[#2D5A3D] border border-[rgba(45,90,61,0.25)]" : "bg-[rgba(124,58,237,0.08)] hover:bg-[rgba(124,58,237,0.12)] text-[#5B21B6] border border-[rgba(124,58,237,0.25)]"}`}
                        >
                          {aggReportCopied === "prompt" ? "Copied!" : "Copy Claude Prompt"}
                        </button>
                        <button
                          onClick={() => copyAggReportSection(JSON.stringify(rpt, null, 2), "json")}
                          className={`px-2.5 py-1.5 rounded text-[11px] font-medium transition-colors ${aggReportCopied === "json" ? "bg-[rgba(45,90,61,0.10)] text-[#2D5A3D] border border-[rgba(45,90,61,0.25)]" : "bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200"}`}
                        >
                          {aggReportCopied === "json" ? "Copied!" : "Copy Full JSON"}
                        </button>
                        {!aggReportSaved ? (
                          <button
                            onClick={() => saveAggReport(site.id)}
                            disabled={aggReportSaving}
                            className="px-2.5 py-1.5 rounded text-[11px] font-medium bg-[rgba(196,154,42,0.08)] hover:bg-[rgba(196,154,42,0.12)] text-[#7a5a10] border border-[rgba(196,154,42,0.25)] transition-colors disabled:opacity-50"
                          >
                            {aggReportSaving ? "Saving…" : "Save Report"}
                          </button>
                        ) : (
                          <span className="px-2.5 py-1.5 rounded text-[11px] font-medium bg-[rgba(45,90,61,0.06)] text-[#2D5A3D] border border-[rgba(45,90,61,0.25)]/30">Saved</span>
                        )}
                        <button
                          onClick={() => {
                            // Copy prompt + instructions to review saved report
                            const reviewPrompt = `I have a saved aggregated SEO report for ${site.name} (site ID: ${site.id}).

The report was generated at ${(rpt._generated as string) || new Date().toISOString()} with a composite score of ${score}/100 (Grade ${grade}).

Here is the full Claude prompt from the report — please review and fix the issues:

${claudePrompt}

The full report JSON is saved in our SeoAuditReport table with triggeredBy="aggregated". If you need the raw data, fetch it from /api/admin/aggregated-report?siteId=${site.id}`;
                            copyAggReportSection(reviewPrompt, "review");
                          }}
                          className={`px-2.5 py-1.5 rounded text-[11px] font-medium transition-colors ${aggReportCopied === "review" ? "bg-[rgba(45,90,61,0.10)] text-[#2D5A3D] border border-[rgba(45,90,61,0.25)]" : "bg-[rgba(124,58,237,0.08)] hover:bg-[rgba(124,58,237,0.12)] text-[#5B21B6] border border-[rgba(124,58,237,0.25)]"}`}
                        >
                          {aggReportCopied === "review" ? "Copied!" : "Copy Review Prompt"}
                        </button>
                      </div>

                      {/* Expandable sections */}
                      <div className="space-y-1">
                        {sections.map((sec) => {
                          const isOpen = aggReportSection === sec.id;
                          return (
                            <div key={sec.id}>
                              <button
                                onClick={() => setAggReportSection(isOpen ? null : sec.id)}
                                className="w-full flex items-center justify-between bg-stone-100/50 hover:bg-stone-100 rounded-lg px-3 py-2 text-xs transition-colors"
                              >
                                <span className="font-medium text-stone-700">{sec.label}</span>
                                <span className="text-stone-500">{isOpen ? "▲" : "▼"}</span>
                              </button>
                              {isOpen && (
                                <div className="ml-1 mt-1 bg-stone-50/80 border border-stone-200 rounded-lg px-3 py-2.5 text-[11px] space-y-2 max-h-[60vh] overflow-y-auto">
                                  {sec.id === "summary" && (
                                    <p className="text-stone-600 whitespace-pre-wrap">{executiveSummary}</p>
                                  )}
                                  {sec.id === "scores" && (
                                    <div className="grid grid-cols-2 gap-2">
                                      {[
                                        { label: "SEO Audit", value: scores.seoAudit, weight: "30%" },
                                        { label: "Discovery", value: scores.discovery || 0, weight: "15%" },
                                        { label: "Indexing", value: scores.indexing, weight: "15%" },
                                        { label: "Content Velocity", value: scores.contentVelocity, weight: "15%" },
                                        { label: "Operations", value: scores.operations, weight: "15%" },
                                        { label: "Public Website", value: scores.publicWebsite || 0, weight: "10%" },
                                      ].map((s) => (
                                        <div key={s.label} className="bg-stone-100/50 rounded-lg px-2.5 py-2">
                                          <div className="text-stone-500 text-[10px]">{s.label} ({s.weight})</div>
                                          <div className={`font-bold ${s.value >= 70 ? "text-[#2D5A3D]" : s.value >= 40 ? "text-[#C49A2A]" : "text-[#C8322B]"}`}>{s.value}/100</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {sec.id === "gsc" && (
                                    <div className="space-y-2">
                                      <div className="grid grid-cols-4 gap-1.5 text-center">
                                        <div className="bg-stone-100/50 rounded p-1.5"><div className="font-bold text-[#3B7EA1]">{gsc.clicks7d}</div><div className="text-stone-500 text-[10px]">Clicks 7d</div></div>
                                        <div className="bg-stone-100/50 rounded p-1.5"><div className="font-bold text-stone-600">{gsc.impressions7d}</div><div className="text-stone-500 text-[10px]">Imp 7d</div></div>
                                        <div className="bg-stone-100/50 rounded p-1.5"><div className="font-bold text-stone-600">{gsc.avgCtr7d}%</div><div className="text-stone-500 text-[10px]">CTR</div></div>
                                        <div className="bg-stone-100/50 rounded p-1.5"><div className={`font-bold ${gsc.avgPosition7d <= 20 ? "text-[#2D5A3D]" : "text-[#C49A2A]"}`}>{gsc.avgPosition7d || "—"}</div><div className="text-stone-500 text-[10px]">Avg Pos</div></div>
                                      </div>
                                      {gsc.topPages.length > 0 && (
                                        <div>
                                          <p className="text-stone-500 text-[10px] font-medium mb-1">Top Pages</p>
                                          {gsc.topPages.slice(0, 5).map((p, i) => (
                                            <div key={i} className="flex justify-between text-[10px] py-0.5">
                                              <span className="text-stone-400 truncate max-w-[60%]">{(() => { try { return new URL(p.url).pathname; } catch { return p.url; } })()}</span>
                                              <span className="text-stone-500">{p.clicks}c / {p.impressions}i / pos {p.position}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {sec.id === "discovery" && (
                                    discoveryData ? (
                                      <div className="space-y-2">
                                        <div className="flex items-center gap-3 mb-2">
                                          <div className={`text-2xl font-black ${discoveryData.overallGrade === "A" ? "text-[#2D5A3D]" : discoveryData.overallGrade === "B" ? "text-[#3B7EA1]" : discoveryData.overallGrade === "C" ? "text-[#C49A2A]" : "text-[#C8322B]"}`}>
                                            {discoveryData.overallGrade}
                                          </div>
                                          <div className="text-stone-400 text-[11px]">{discoveryData.overallScore}/100 — {discoveryData.totalPages} pages, {discoveryData.totalIssues} issues</div>
                                        </div>
                                        <p className="text-stone-500 text-[10px] font-medium mb-1">Discovery Funnel</p>
                                        <div className="grid grid-cols-4 gap-1 text-center">
                                          {[
                                            { label: "Published", value: discoveryData.funnel.published, color: "text-stone-600" },
                                            { label: "Submitted", value: discoveryData.funnel.submitted, color: "text-[#3B7EA1]" },
                                            { label: "Indexed", value: discoveryData.funnel.indexed, color: "text-[#2D5A3D]" },
                                            { label: "Performing", value: discoveryData.funnel.performing, color: "text-[#5B21B6]" },
                                          ].map((f) => (
                                            <div key={f.label} className="bg-stone-100/50 rounded p-1">
                                              <div className={`font-bold text-sm ${f.color}`}>{f.value}</div>
                                              <div className="text-stone-500 text-[9px]">{f.label}</div>
                                            </div>
                                          ))}
                                        </div>
                                        <p className="text-stone-500 text-[10px] font-medium mt-2 mb-1">Health Scores</p>
                                        <div className="grid grid-cols-2 gap-1.5">
                                          {[
                                            { label: "Crawlability", value: discoveryData.crawlabilityScore },
                                            { label: "Indexability", value: discoveryData.indexabilityScore },
                                            { label: "Content Quality", value: discoveryData.contentQualityScore },
                                            { label: "AIO Readiness", value: discoveryData.aioReadinessScore },
                                          ].map((s) => (
                                            <div key={s.label} className="bg-stone-100/50 rounded px-2 py-1">
                                              <div className="text-stone-500 text-[10px]">{s.label}</div>
                                              <div className={`font-bold ${s.value >= 70 ? "text-[#2D5A3D]" : s.value >= 40 ? "text-[#C49A2A]" : "text-[#C8322B]"}`}>{s.value}/100</div>
                                            </div>
                                          ))}
                                        </div>
                                        {discoveryData.topIssues.length > 0 && (
                                          <div className="mt-2">
                                            <p className="text-stone-500 text-[10px] font-medium mb-1">Top Issues</p>
                                            {discoveryData.topIssues.slice(0, 5).map((di, i) => (
                                              <div key={i} className="flex items-start gap-1.5 py-0.5 text-[10px]">
                                                <span className={`shrink-0 px-1 py-0.5 rounded text-[8px] font-medium uppercase ${di.severity === "critical" ? "bg-[rgba(200,50,43,0.10)] text-[#C8322B]" : di.severity === "high" ? "bg-[rgba(217,119,6,0.10)] text-[#92400E]" : "bg-[rgba(196,154,42,0.10)] text-[#7a5a10]"}`}>{di.severity}</span>
                                                <span className="text-stone-600">{di.title}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        {discoveryData.pagesNeedingAttention.length > 0 && (
                                          <div className="mt-2">
                                            <p className="text-stone-500 text-[10px] font-medium mb-1">Pages Needing Attention</p>
                                            {discoveryData.pagesNeedingAttention.slice(0, 5).map((p, i) => (
                                              <div key={i} className="flex justify-between py-0.5 text-[10px]">
                                                <span className="text-stone-400 truncate max-w-[55%]">{p.title || p.slug}</span>
                                                <span className="text-stone-500">{p.score}/100 — {p.topIssue}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ) : <p className="text-stone-500">Discovery audit did not run (budget exceeded).</p>
                                  )}
                                  {sec.id === "publicAudit" && (
                                    publicAuditData ? (
                                      <div className="space-y-2">
                                        <div className="grid grid-cols-3 gap-1.5 text-center">
                                          <div className="bg-stone-100/50 rounded p-1.5">
                                            <div className={`font-bold ${publicAuditData.pagesReachable === publicAuditData.pagesChecked ? "text-[#2D5A3D]" : "text-[#C49A2A]"}`}>{publicAuditData.pagesReachable}/{publicAuditData.pagesChecked}</div>
                                            <div className="text-stone-500 text-[10px]">Reachable</div>
                                          </div>
                                          <div className="bg-stone-100/50 rounded p-1.5">
                                            <div className={`font-bold ${publicAuditData.pagesUnreachable > 0 ? "text-[#C8322B]" : "text-stone-400"}`}>{publicAuditData.pagesUnreachable}</div>
                                            <div className="text-stone-500 text-[10px]">Unreachable</div>
                                          </div>
                                          <div className="bg-stone-100/50 rounded p-1.5">
                                            <div className={`font-bold ${publicAuditData.avgResponseTimeMs <= 2500 ? "text-[#2D5A3D]" : publicAuditData.avgResponseTimeMs <= 5000 ? "text-[#C49A2A]" : "text-[#C8322B]"}`}>{publicAuditData.avgResponseTimeMs}ms</div>
                                            <div className="text-stone-500 text-[10px]">Avg Response</div>
                                          </div>
                                        </div>
                                        <div className="mt-2">
                                          <p className="text-stone-500 text-[10px] font-medium mb-1">Page Results</p>
                                          {publicAuditData.results.map((r, i) => (
                                            <div key={i} className="flex items-center justify-between py-0.5 text-[10px]">
                                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                <span className={r.ok ? "text-[#2D5A3D]" : "text-[#C8322B]"}>{r.ok ? "✓" : "✗"}</span>
                                                <span className="text-stone-400 truncate">{r.url}</span>
                                              </div>
                                              <div className="flex gap-2 shrink-0 text-stone-500">
                                                <span className={r.ok ? "" : "text-[#C8322B]"}>{r.status || "ERR"}</span>
                                                <span>{r.responseTimeMs}ms</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : <p className="text-stone-500">Public website audit did not run (budget exceeded).</p>
                                  )}
                                  {sec.id === "platformHealth" && (
                                    platformHealthData ? (
                                      <div className="space-y-3">
                                        <div className="grid grid-cols-4 gap-1.5 text-center">
                                          <div className="bg-stone-100/50 rounded p-1.5">
                                            <div className={`text-xl font-black ${platformHealthData.grade === "A" ? "text-[#2D5A3D]" : platformHealthData.grade === "B" ? "text-[#3B7EA1]" : "text-[#C49A2A]"}`}>{platformHealthData.grade}</div>
                                            <div className="text-stone-500 text-[10px]">Grade</div>
                                          </div>
                                          <div className="bg-stone-100/50 rounded p-1.5">
                                            <div className="font-bold text-[#2D5A3D]">{platformHealthData.passed}</div>
                                            <div className="text-stone-500 text-[10px]">Pass</div>
                                          </div>
                                          <div className="bg-stone-100/50 rounded p-1.5">
                                            <div className={`font-bold ${platformHealthData.failed > 0 ? "text-[#C8322B]" : "text-stone-400"}`}>{platformHealthData.failed}</div>
                                            <div className="text-stone-500 text-[10px]">Fail</div>
                                          </div>
                                          <div className="bg-stone-100/50 rounded p-1.5">
                                            <div className={`font-bold ${platformHealthData.warnings > 0 ? "text-[#C49A2A]" : "text-stone-400"}`}>{platformHealthData.warnings}</div>
                                            <div className="text-stone-500 text-[10px]">Warn</div>
                                          </div>
                                        </div>
                                        {Object.entries(
                                          platformHealthData.checks.reduce((acc, c) => {
                                            if (!acc[c.category]) acc[c.category] = [];
                                            acc[c.category].push(c);
                                            return acc;
                                          }, {} as Record<string, typeof platformHealthData.checks>)
                                        ).map(([cat, checks]) => (
                                          <div key={cat}>
                                            <p className="text-stone-500 text-[10px] font-medium mb-1">{cat}</p>
                                            {checks.map((c, i) => (
                                              <div key={i} className="flex items-center justify-between py-0.5 text-[10px]">
                                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                  <span className={c.status === "pass" ? "text-[#2D5A3D]" : c.status === "fail" ? "text-[#C8322B]" : "text-[#C49A2A]"}>
                                                    {c.status === "pass" ? "✓" : c.status === "fail" ? "✗" : "⚠"}
                                                  </span>
                                                  <span className="text-stone-600 truncate">{c.name}</span>
                                                </div>
                                                <span className="text-stone-500 text-[9px] shrink-0 ml-2">{c.detail}</span>
                                              </div>
                                            ))}
                                          </div>
                                        ))}
                                        {platformHealthData.recentFixes.length > 0 && (
                                          <div>
                                            <p className="text-stone-500 text-[10px] font-medium mb-1">Recent Fixes Applied</p>
                                            {platformHealthData.recentFixes.slice(0, 8).map((f, i) => (
                                              <div key={i} className="flex items-center gap-1.5 py-0.5 text-[10px]">
                                                <span className="text-[#2D5A3D]">+</span>
                                                <span className="text-stone-400">{f.description}</span>
                                                <span className="text-stone-500 ml-auto shrink-0">{f.date}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ) : <p className="text-stone-500">Platform health check did not run.</p>
                                  )}
                                  {sec.id === "indexing" && (
                                    <div className="grid grid-cols-3 gap-1.5 text-center">
                                      <div className="bg-stone-100/50 rounded p-1.5"><div className={`font-bold ${indexing.rate >= 60 ? "text-[#2D5A3D]" : "text-[#C8322B]"}`}>{indexing.rate}%</div><div className="text-stone-500 text-[10px]">Rate</div></div>
                                      <div className="bg-stone-100/50 rounded p-1.5"><div className="font-bold text-[#2D5A3D]">{indexing.indexed}</div><div className="text-stone-500 text-[10px]">Indexed</div></div>
                                      <div className="bg-stone-100/50 rounded p-1.5"><div className={`font-bold ${indexing.errors > 0 ? "text-[#C8322B]" : "text-stone-400"}`}>{indexing.errors}</div><div className="text-stone-500 text-[10px]">Errors</div></div>
                                      {indexing.chronicFailures > 0 && <div className="bg-stone-100/50 rounded p-1.5"><div className="font-bold text-[#C8322B]">{indexing.chronicFailures}</div><div className="text-stone-500 text-[10px]">Chronic</div></div>}
                                      {indexing.neverSubmitted > 0 && <div className="bg-stone-100/50 rounded p-1.5"><div className="font-bold text-[#C49A2A]">{indexing.neverSubmitted}</div><div className="text-stone-500 text-[10px]">Never Submitted</div></div>}
                                    </div>
                                  )}
                                  {sec.id === "operations" && (
                                    <div className="space-y-2">
                                      <div className="grid grid-cols-3 gap-1.5 text-center">
                                        <div className="bg-stone-100/50 rounded p-1.5"><div className="font-bold text-[#2D5A3D]">{operations.cronSuccesses24h}</div><div className="text-stone-500 text-[10px]">Cron OK (24h)</div></div>
                                        <div className="bg-stone-100/50 rounded p-1.5"><div className={`font-bold ${operations.cronFailures24h > 0 ? "text-[#C8322B]" : "text-stone-400"}`}>{operations.cronFailures24h}</div><div className="text-stone-500 text-[10px]">Cron Fails</div></div>
                                        <div className="bg-stone-100/50 rounded p-1.5"><div className="font-bold text-stone-600">${operations.aiCost7d}</div><div className="text-stone-500 text-[10px]">AI Cost 7d</div></div>
                                      </div>
                                      {operations.failedCrons.length > 0 && (
                                        <div className="bg-[rgba(200,50,43,0.04)] border border-[rgba(200,50,43,0.3)]/30 rounded-lg px-2.5 py-1.5 text-[10px] text-[#C8322B]">
                                          Failed: {operations.failedCrons.join(", ")}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {sec.id === "articles" && (
                                    <div className="space-y-1">
                                      {latestArticles.length === 0 ? (
                                        <p className="text-stone-500">No published articles.</p>
                                      ) : latestArticles.map((a, i) => (
                                        <div key={i} className="flex items-center justify-between text-[10px] py-1 border-b border-stone-200/50 last:border-0">
                                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                            <span className={a.indexingStatus === "indexed" ? "text-[#2D5A3D]" : a.indexingStatus === "submitted" ? "text-[#3B7EA1]" : "text-[#C8322B]"}>
                                              {a.indexingStatus === "indexed" ? "✓" : a.indexingStatus === "submitted" ? "⟳" : "✗"}
                                            </span>
                                            <span className="text-stone-600 truncate">{a.title}</span>
                                          </div>
                                          <div className="flex gap-2 shrink-0 text-stone-500">
                                            {a.clicks > 0 && <span>{a.clicks}c</span>}
                                            <span className={a.seoScore >= 70 ? "text-[#2D5A3D]" : a.seoScore >= 50 ? "text-[#C49A2A]" : "text-[#C8322B]"}>{a.seoScore}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {sec.id === "issues" && (
                                    <div className="space-y-2">
                                      {issues.length === 0 ? (
                                        <p className="text-[#2D5A3D]">No issues found!</p>
                                      ) : issues.map((issue, i) => (
                                        <div key={i} className={`rounded-lg px-2.5 py-2 border ${
                                          issue.severity === "critical" ? "bg-[rgba(200,50,43,0.04)] border-[rgba(200,50,43,0.3)]/30" :
                                          issue.severity === "high" ? "bg-[rgba(217,119,6,0.04)] border-[rgba(217,119,6,0.25)]/30" :
                                          "bg-[rgba(196,154,42,0.04)] border-[rgba(196,154,42,0.3)]/30"
                                        }`}>
                                          <div className="flex items-center gap-1.5">
                                            <span className={`text-[9px] px-1 py-0.5 rounded font-medium uppercase ${
                                              issue.severity === "critical" ? "bg-[rgba(200,50,43,0.10)] text-[#C8322B]" :
                                              issue.severity === "high" ? "bg-[rgba(217,119,6,0.10)] text-[#92400E]" :
                                              "bg-[rgba(196,154,42,0.10)] text-[#7a5a10]"
                                            }`}>{issue.severity}</span>
                                            <span className="text-stone-500 text-[10px]">{issue.category}</span>
                                          </div>
                                          <div className="text-stone-700 font-medium mt-1">{issue.title}</div>
                                          <div className="text-stone-400 mt-1"><span className="text-stone-500 font-medium">Root cause:</span> {issue.rootCause}</div>
                                          <div className="text-stone-400 mt-0.5"><span className="text-stone-500 font-medium">Fix:</span> {issue.fix}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {sec.id === "fixplan" && (
                                    <div className="space-y-1.5">
                                      {fixPlan.length === 0 ? (
                                        <p className="text-stone-500">No fix plan items.</p>
                                      ) : fixPlan.map((fp) => (
                                        <div key={fp.priority} className="flex items-start gap-2 text-[11px]">
                                          <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                            fp.severity === "critical" ? "bg-[rgba(200,50,43,0.10)] text-[#C8322B]" :
                                            fp.severity === "high" ? "bg-[rgba(217,119,6,0.10)] text-[#92400E]" :
                                            "bg-[rgba(196,154,42,0.10)] text-[#7a5a10]"
                                          }`}>{fp.priority}</span>
                                          <div>
                                            <div className="text-stone-700">{fp.action}</div>
                                            <div className="text-stone-500 text-[10px]">{fp.category} — {fp.expectedImpact}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {sec.id === "prompt" && (
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <p className="text-stone-500 text-[10px] font-medium">Claude review prompt — copy this to a new conversation</p>
                                        <button
                                          onClick={() => copyAggReportSection(claudePrompt, "prompt-sec")}
                                          className={`px-2 py-0.5 rounded text-[10px] transition-colors ${aggReportCopied === "prompt-sec" ? "bg-[rgba(45,90,61,0.10)] text-[#2D5A3D]" : "bg-stone-200 hover:bg-stone-400 text-stone-600"}`}
                                        >
                                          {aggReportCopied === "prompt-sec" ? "Copied!" : "Copy"}
                                        </button>
                                      </div>
                                      <pre className="text-stone-600 whitespace-pre-wrap font-mono text-[10px] leading-relaxed">{claudePrompt}</pre>
                                    </div>
                                  )}
                                  {sec.id === "plain" && (
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <p className="text-stone-500 text-[10px] font-medium">Plain language report</p>
                                        <button
                                          onClick={() => copyAggReportSection(plainLanguage, "plain-sec")}
                                          className={`px-2 py-0.5 rounded text-[10px] transition-colors ${aggReportCopied === "plain-sec" ? "bg-[rgba(45,90,61,0.10)] text-[#2D5A3D]" : "bg-stone-200 hover:bg-stone-400 text-stone-600"}`}
                                        >
                                          {aggReportCopied === "plain-sec" ? "Copied!" : "Copy"}
                                        </button>
                                      </div>
                                      <pre className="text-stone-600 whitespace-pre-wrap font-mono text-[10px] leading-relaxed">{plainLanguage}</pre>
                                    </div>
                                  )}
                                  {sec.id === "json" && (
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <p className="text-stone-500 text-[10px] font-medium">Full JSON data</p>
                                        <button
                                          onClick={() => copyAggReportSection(JSON.stringify(rpt, null, 2), "json-sec")}
                                          className={`px-2 py-0.5 rounded text-[10px] transition-colors ${aggReportCopied === "json-sec" ? "bg-[rgba(45,90,61,0.10)] text-[#2D5A3D]" : "bg-stone-200 hover:bg-stone-400 text-stone-600"}`}
                                        >
                                          {aggReportCopied === "json-sec" ? "Copied!" : "Copy"}
                                        </button>
                                      </div>
                                      <pre className="text-stone-400 whitespace-pre-wrap font-mono text-[9px] leading-relaxed max-h-96 overflow-y-auto">{JSON.stringify(rpt, null, 2)}</pre>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-[10px] text-stone-500 pt-2 border-t border-stone-200">
                        <span>Generated: {(rpt._generated as string) ? new Date(rpt._generated as string).toLocaleString() : "now"}</span>
                        <span>Duration: {((rpt.durationMs as number) || 0) / 1000}s</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ══════ Latest Published Content Panel ══════ */}
            {latestPubSiteId === site.id && (
              <div className="mt-3 border-t border-[rgba(59,126,161,0.15)] pt-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-[#3B7EA1]">Latest Published Content</p>
                  <button onClick={() => setLatestPubSiteId(null)} className="text-xs text-stone-500 hover:text-stone-600">✕ Close</button>
                </div>
                {latestPubLoading === site.id ? (
                  <p className="text-xs text-stone-500 animate-pulse">Loading latest articles…</p>
                ) : !latestPubData[site.id] || latestPubData[site.id].length === 0 ? (
                  <p className="text-xs text-stone-500">No published articles yet.</p>
                ) : (
                  <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                    {/* Summary row */}
                    {(() => {
                      const arts = latestPubData[site.id];
                      const indexed = arts.filter((a) => a.indexingStatus === "indexed").length;
                      const totalClicks = arts.reduce((s, a) => s + a.clicks, 0);
                      const totalImpressions = arts.reduce((s, a) => s + a.impressions, 0);
                      return (
                        <div className="grid grid-cols-4 gap-1.5 text-xs text-center mb-2">
                          <div className="bg-stone-100/50 rounded p-1.5">
                            <div className="font-bold text-[#3B7EA1]">{arts.length}</div>
                            <div className="text-stone-500 text-[10px]">Articles</div>
                          </div>
                          <div className="bg-stone-100/50 rounded p-1.5">
                            <div className={`font-bold ${indexed === arts.length ? "text-[#2D5A3D]" : indexed > 0 ? "text-[#C49A2A]" : "text-[#C8322B]"}`}>{indexed}/{arts.length}</div>
                            <div className="text-stone-500 text-[10px]">Indexed</div>
                          </div>
                          <div className="bg-stone-100/50 rounded p-1.5">
                            <div className="font-bold text-[#3B7EA1]">{totalClicks}</div>
                            <div className="text-stone-500 text-[10px]">Clicks</div>
                          </div>
                          <div className="bg-stone-100/50 rounded p-1.5">
                            <div className="font-bold text-stone-600">{totalImpressions}</div>
                            <div className="text-stone-500 text-[10px]">Impressions</div>
                          </div>
                        </div>
                      );
                    })()}
                    {/* Per-article rows */}
                    {latestPubData[site.id].map((article) => {
                      const idxColor =
                        article.indexingStatus === "indexed" ? "text-[#2D5A3D] bg-[rgba(45,90,61,0.06)]" :
                        article.indexingStatus === "submitted" ? "text-[#3B7EA1] bg-[rgba(59,126,161,0.06)]" :
                        article.indexingStatus === "error" ? "text-[#C8322B] bg-[rgba(200,50,43,0.06)]" :
                        "text-[#C49A2A] bg-[rgba(196,154,42,0.06)]";
                      return (
                        <div key={article.id} className="bg-stone-100/40 rounded-lg px-3 py-2">
                          {/* Title row */}
                          <div className="flex items-start gap-2 mb-1.5">
                            <div className="flex-1 min-w-0">
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-medium text-stone-700 hover:text-[#1e5a7a] line-clamp-2 transition-colors"
                              >
                                {article.title}
                              </a>
                              <div className="text-[10px] text-stone-500 mt-0.5 truncate">/blog/{article.slug}</div>
                            </div>
                            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${idxColor}`}>
                              {article.indexingStatus}
                            </span>
                          </div>
                          {/* Metrics row */}
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                            <span className="text-stone-500">Clicks: <span className="text-[#3B7EA1] font-medium">{article.clicks}</span></span>
                            <span className="text-stone-500">Impressions: <span className="text-stone-600 font-medium">{article.impressions}</span></span>
                            {article.avgPosition > 0 && (
                              <span className="text-stone-500">Pos: <span className={`font-medium ${article.avgPosition <= 10 ? "text-[#2D5A3D]" : article.avgPosition <= 30 ? "text-[#C49A2A]" : "text-[#C8322B]"}`}>{article.avgPosition}</span></span>
                            )}
                            {article.ctr > 0 && (
                              <span className="text-stone-500">CTR: <span className="text-stone-600 font-medium">{(article.ctr * 100).toFixed(1)}%</span></span>
                            )}
                            {article.seoScore != null && (
                              <span className="text-stone-500">SEO: <span className={`font-medium ${article.seoScore >= 70 ? "text-[#2D5A3D]" : article.seoScore >= 50 ? "text-[#C49A2A]" : "text-[#C8322B]"}`}>{article.seoScore}</span></span>
                            )}
                          </div>
                          {/* Timestamps row */}
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-stone-500">
                            <span>Published: {new Date(article.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                            {article.lastInspectedAt && (
                              <span>Verified: {new Date(article.lastInspectedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                            )}
                            {article.lastCrawledAt && (
                              <span>Crawled: {new Date(article.lastCrawledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                            )}
                            {article.lastSubmittedAt && (
                              <span>Submitted: {new Date(article.lastSubmittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                            )}
                          </div>
                          {/* Submission channels */}
                          <div className="flex gap-1.5 mt-1.5">
                            {article.submittedIndexNow && <span className="px-1 py-0.5 rounded bg-stone-200/50 text-[9px] text-stone-400">IndexNow</span>}
                            {article.submittedSitemap && <span className="px-1 py-0.5 rounded bg-stone-200/50 text-[9px] text-stone-400">Sitemap</span>}
                            {article.submittedGoogleApi && <span className="px-1 py-0.5 rounded bg-stone-200/50 text-[9px] text-stone-400">GSC API</span>}
                          </div>
                          {/* Error if any */}
                          {article.indexingError && (
                            <div className="mt-1.5 text-[10px] text-[#C8322B] bg-[rgba(200,50,43,0.04)] rounded px-2 py-1 line-clamp-2">
                              {article.indexingError}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </Card>
        );
      })}
    </div>
  );
}

// ─── Tab 6: AI Config ─────────────────────────────────────────────────────────

function AIConfigTab() {
  const [data, setData] = useState<AIConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, unknown> | null>(null);
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [saveResult, setSaveResult] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/ai-config")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((json) => {
        setData(json);
        setRoutes(json.routes ?? []);
      })
      .catch((e) => { console.warn("[cockpit] ai-config load failed:", e instanceof Error ? e.message : e); setData(null); })
      .finally(() => setLoading(false));
  }, []);

  const saveRoutes = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch("/api/admin/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routes }),
      });
      const json = await res.json();
      setSaveResult(json.success !== false ? "✅ Routes saved" : `❌ ${json.error}`);
    } catch (e) {
      setSaveResult(`❌ ${e instanceof Error ? e.message : "Error"}`);
    } finally {
      setSaving(false);
    }
  };

  const testAll = async () => {
    setTesting(true);
    setTestResults(null);
    try {
      const res = await fetch("/api/admin/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_all" }),
      });
      const json = await res.json();
      // API returns array of {provider, success, latencyMs, error} — convert to object keyed by provider
      const results = json.results ?? json;
      if (Array.isArray(results)) {
        setTestResults(Object.fromEntries(results.map((r: { provider: string }) => [r.provider, r])));
      } else {
        setTestResults(results);
      }
    } catch (e) {
      setTestResults({ error: e instanceof Error ? e.message : "Error" });
    } finally {
      setTesting(false);
    }
  };

  const updateRoute = (taskType: string, field: "primary" | "fallback", value: string) => {
    setRoutes((prev) => prev.map((r) => r.taskType === taskType ? { ...r, [field]: value } : r));
  };

  if (loading) return <div className="flex items-center justify-center h-48"><p className="text-stone-500 text-sm">Loading AI config…</p></div>;
  if (!data) return <Card><p className="text-stone-500 text-sm">Failed to load AI configuration.</p></Card>;

  const configuredProviders = data.providers.filter((p) => p.hasKey);

  return (
    <div className="space-y-4">
      {/* Provider status */}
      <Card>
        <SectionTitle>Available Providers</SectionTitle>
        <div className="space-y-2">
          {data.providers.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={p.hasKey ? "text-[#2D5A3D]" : "text-stone-500"}>{p.hasKey ? "✅" : "❌"}</span>
                <span className={p.hasKey ? "text-stone-700" : "text-stone-500"}>{p.displayName}</span>
                {p.testStatus && (
                  <span className="text-xs text-stone-500">({p.testStatus})</span>
                )}
              </div>
              <span className="text-xs text-stone-500">{p.hasKey ? "Key configured" : "No API key"}</span>
            </div>
          ))}
        </div>
        {configuredProviders.length === 0 && (
          <p className="mt-2 text-xs text-[#C8322B]">No AI providers configured. Add at least one API key in Vercel environment variables.</p>
        )}
        {/* Provider warnings (wrong key format, missing keys for assigned tasks) */}
        {data.providerWarnings && Object.keys(data.providerWarnings).length > 0 && (
          <div className="mt-3 space-y-2">
            {Object.entries(data.providerWarnings).map(([provider, warning]) => (
              <div key={provider} className="p-2 bg-[rgba(196,154,42,0.06)] border border-[rgba(196,154,42,0.25)] rounded text-xs text-[#7a5a10]">
                <span className="font-semibold">⚠️ {provider}:</span> {String(warning)}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Task routing */}
      <Card>
        <SectionTitle>Task Routing</SectionTitle>
        <div className="space-y-3">
          {routes.map((route) => (
            <div key={route.taskType} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-stone-600 w-36 shrink-0">{route.label}</span>
              <div className="flex items-center gap-1">
                <span className="text-stone-500">Primary:</span>
                <select
                  value={route.primary}
                  onChange={(e) => updateRoute(route.taskType, "primary", e.target.value)}
                  className="bg-stone-100 border border-stone-200 rounded px-2 py-1 text-xs text-stone-700 focus:outline-none focus:border-stone-300"
                >
                  {data.providers.filter((p) => p.hasKey).map((p) => (
                    <option key={p.name} value={p.name}>{p.displayName}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-stone-500">Fallback:</span>
                <select
                  value={route.fallback ?? ""}
                  onChange={(e) => updateRoute(route.taskType, "fallback", e.target.value)}
                  className="bg-stone-100 border border-stone-200 rounded px-2 py-1 text-xs text-stone-700 focus:outline-none focus:border-stone-300"
                >
                  <option value="">None</option>
                  {data.providers.filter((p) => p.hasKey).map((p) => (
                    <option key={p.name} value={p.name}>{p.displayName}</option>
                  ))}
                </select>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded border ${
                route.status === "active" ? "bg-[rgba(45,90,61,0.06)] text-[#2D5A3D] border-[rgba(45,90,61,0.3)]" :
                route.status === "fallback_only" ? "bg-[rgba(196,154,42,0.06)] text-[#C49A2A] border-[rgba(196,154,42,0.3)]" :
                "bg-[rgba(200,50,43,0.06)] text-[#C8322B] border-[rgba(200,50,43,0.3)]"
              }`}>
                {route.status === "active" ? "✅" : route.status === "fallback_only" ? "⚠️" : "❌"}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <ActionButton onClick={saveRoutes} loading={saving} variant="success">
            💾 Save Routes
          </ActionButton>
          <ActionButton onClick={testAll} loading={testing}>
            🧪 Test All Providers
          </ActionButton>
        </div>
        {saveResult && (
          <p className={`mt-2 text-xs rounded px-2 py-1 ${saveResult.startsWith("✅") ? "bg-[rgba(45,90,61,0.06)] text-[#2D5A3D]" : "bg-[rgba(200,50,43,0.06)] text-[#C8322B]"}`}>
            {saveResult}
          </p>
        )}
      </Card>

      {/* Test results */}
      {testResults && (
        <Card>
          <SectionTitle>Test Results</SectionTitle>
          <div className="space-y-2 text-xs">
            {Object.entries(testResults).map(([provider, result]) => (
              <div key={provider} className="flex items-center justify-between">
                <span className="text-stone-600 capitalize">{provider}</span>
                <span className={
                  (result as { success?: boolean })?.success ? "text-[#2D5A3D]" : "text-[#C8322B]"
                }>
                  {(result as { success?: boolean })?.success
                    ? `✅ ${(result as { latencyMs?: number })?.latencyMs ?? 0}ms`
                    : `❌ ${(result as { error?: string })?.error ?? "Failed"}`}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Tab 7: Settings & Testing ────────────────────────────────────────────────

interface ActionLogEntry {
  id: string;
  timestamp: string;
  category: string;
  action: string;
  status: string;
  siteId: string | null;
  durationMs: number | null;
  summary: string;
  outcome: string | null;
  error: string | null;
  fix: string | null;
  details: Record<string, unknown>;
}

interface ActionLogsData {
  stats: { total: number; success: number; failed: number; partial: number; timeout: number; running: number; byCategory: Record<string, number> };
  logs: ActionLogEntry[];
  filters: { periods: string[]; categories: string[]; statuses: string[]; functions: string[] };
  exportUrl?: string;
}

function ActionLogsPanel({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<ActionLogsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("24h");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [func, setFunc] = useState("");
  const [siteId, setSiteId] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (category) params.set("category", category);
      if (status) params.set("status", status);
      if (func) params.set("function", func);
      if (siteId) params.set("siteId", siteId);
      const res = await fetch(`/api/admin/action-logs?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (e) { console.warn("[cockpit] action-logs fetch failed:", e instanceof Error ? e.message : e); }
    setLoading(false);
  }, [period, category, status, func, siteId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const copyJson = (entry: ActionLogEntry) => {
    navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
    setCopied(entry.id);
    setTimeout(() => setCopied(null), 1500);
  };

  const exportAll = async () => {
    const params = new URLSearchParams({ period, export: "json" });
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    if (func) params.set("function", func);
    if (siteId) params.set("siteId", siteId);
    const res = await fetch(`/api/admin/action-logs?${params}`);
    const json = await res.json();
    navigator.clipboard.writeText(JSON.stringify(json, null, 2));
    setCopied("all");
    setTimeout(() => setCopied(null), 2000);
  };

  const cleanup = async () => {
    setCleaning(true);
    try {
      await fetch("/api/admin/action-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cleanup" }),
      });
      fetchLogs();
    } catch { /* network error */ }
    setCleaning(false);
  };

  const statusColor: Record<string, string> = {
    success: "bg-[rgba(45,90,61,0.08)] text-[#2D5A3D] border-[rgba(45,90,61,0.3)]",
    failed: "bg-[rgba(200,50,43,0.08)] text-[#C8322B] border-[rgba(200,50,43,0.3)]",
    partial: "bg-[rgba(196,154,42,0.08)] text-[#7a5a10] border-[rgba(196,154,42,0.3)]",
    timeout: "bg-[rgba(217,119,6,0.08)] text-[#92400E] border-[rgba(217,119,6,0.25)]",
    running: "bg-[rgba(59,126,161,0.08)] text-[#1e5a7a] border-[rgba(59,126,161,0.3)]",
  };

  const statusIcon: Record<string, string> = {
    success: "✅", failed: "❌", partial: "⚠️", timeout: "⏳", running: "🔄",
  };

  const categoryIcon: Record<string, string> = {
    cron: "⏰", "auto-fix": "🔧", "ai-call": "🤖", audit: "🔍", seo: "🔍",
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-stone-50 border-b border-stone-200 px-4 py-3 flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold text-stone-800">Action Logs</h2>
        <div className="flex items-center gap-2">
          <button onClick={exportAll} className="px-2 py-1 text-xs bg-stone-100 hover:bg-stone-200 text-stone-600 rounded border border-stone-200">
            {copied === "all" ? "Copied!" : "Export All JSON"}
          </button>
          <button onClick={cleanup} disabled={cleaning} className="px-2 py-1 text-xs bg-stone-100 hover:bg-stone-200 text-stone-600 rounded border border-stone-200">
            {cleaning ? "Cleaning..." : "Purge >21d"}
          </button>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-800 text-lg px-2">✕</button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-stone-50/80 border-b border-stone-200 px-4 py-2 flex flex-wrap gap-2 shrink-0">
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="bg-stone-100 text-stone-600 text-xs rounded px-2 py-1 border border-stone-200">
          {["1h", "12h", "24h", "3d", "7d", "14d", "21d"].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-stone-100 text-stone-600 text-xs rounded px-2 py-1 border border-stone-200">
          <option value="">All types</option>
          <option value="cron">Cron jobs</option>
          <option value="auto-fix">Auto-fixes</option>
          <option value="ai-call">AI calls</option>
          <option value="audit">Audits</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-stone-100 text-stone-600 text-xs rounded px-2 py-1 border border-stone-200">
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="partial">Partial</option>
          <option value="timeout">Timeout</option>
        </select>
        {data?.filters.functions && data.filters.functions.length > 0 && (
          <select value={func} onChange={(e) => setFunc(e.target.value)} className="bg-stone-100 text-stone-600 text-xs rounded px-2 py-1 border border-stone-200">
            <option value="">All functions</option>
            {data.filters.functions.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        )}
        <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="bg-stone-100 text-stone-600 text-xs rounded px-2 py-1 border border-stone-200">
          <option value="">All sites</option>
          <option value="yalla-london">Yalla London</option>
          <option value="zenitha-yachts-med">Zenitha Yachts</option>
          <option value="arabaldives">Arabaldives</option>
          <option value="french-riviera">Yalla Riviera</option>
          <option value="istanbul">Yalla Istanbul</option>
          <option value="thailand">Yalla Thailand</option>
        </select>
      </div>

      {/* Stats bar */}
      {data?.stats && (
        <div className="bg-stone-50/60 border-b border-stone-200 px-4 py-2 flex gap-3 text-xs shrink-0 overflow-x-auto">
          <span className="text-stone-400">{data.stats.total} total</span>
          <span className="text-[#2D5A3D]">{data.stats.success} ok</span>
          <span className="text-[#C8322B]">{data.stats.failed} failed</span>
          {data.stats.timeout > 0 && <span className="text-[#92400E]">{data.stats.timeout} timeout</span>}
          {data.stats.partial > 0 && <span className="text-[#C49A2A]">{data.stats.partial} partial</span>}
          {data.stats.running > 0 && <span className="text-[#3B7EA1]">{data.stats.running} running</span>}
        </div>
      )}

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {loading ? (
          <p className="text-stone-500 text-xs text-center py-8">Loading logs...</p>
        ) : !data || data.logs.length === 0 ? (
          <p className="text-stone-500 text-xs text-center py-8">No logs found for this period/filters.</p>
        ) : (
          data.logs.map((log) => (
            <div key={log.id} className="bg-stone-50 border border-stone-200 rounded-lg overflow-hidden">
              {/* Log row */}
              <button
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                className="w-full px-3 py-2 flex items-start gap-2 text-left hover:bg-stone-100/50"
              >
                <span className="text-sm shrink-0 mt-0.5">{statusIcon[log.status] || "•"}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-stone-500">{categoryIcon[log.category] || ""} {log.category}</span>
                    <span className="text-xs font-medium text-stone-700 truncate">{log.action}</span>
                    {log.siteId && <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">{log.siteId}</span>}
                    {log.durationMs != null && <span className="text-[10px] text-stone-500">{(log.durationMs / 1000).toFixed(1)}s</span>}
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">{log.summary}</p>
                  <span className="text-[10px] text-stone-500">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${statusColor[log.status] || "bg-stone-100 text-stone-400 border-stone-200"}`}>
                  {log.status}
                </span>
              </button>

              {/* Expanded detail */}
              {expandedId === log.id && (
                <div className="px-3 pb-3 border-t border-stone-200 space-y-2">
                  {log.outcome && (
                    <div className="mt-2">
                      <p className="text-[10px] text-stone-500 uppercase">Outcome</p>
                      <p className="text-xs text-[#2D5A3D]">{log.outcome}</p>
                    </div>
                  )}
                  {log.error && (
                    <div>
                      <p className="text-[10px] text-stone-500 uppercase">Error</p>
                      <p className="text-xs text-[#C8322B]">{log.error}</p>
                    </div>
                  )}
                  {log.fix && (
                    <div>
                      <p className="text-[10px] text-stone-500 uppercase">How to fix</p>
                      <p className="text-xs text-[#7a5a10]">{log.fix}</p>
                    </div>
                  )}
                  <button
                    onClick={() => copyJson(log)}
                    className="mt-1 px-2 py-1 text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-400 rounded border border-stone-200"
                  >
                    {copied === log.id ? "Copied!" : "Copy JSON"}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Website Config Panel (Affiliates, Email, Social, Workflow) ─────────────

interface SiteCategorySettings {
  config: Record<string, unknown>;
  enabled: boolean;
  updatedAt: string | null;
}

interface AffiliatePartner {
  name: string;
  category: string;
  enabled: boolean;
  affiliateId: string;
  baseUrl: string;
  paramTemplate: string;
  commissionRate: string;
}

function WebsiteConfigPanel() {
  const [siteId, setSiteId] = useState("yalla-london");
  const [settings, setSettings] = useState<Record<string, SiteCategorySettings> | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<{ category: string; ok: boolean; msg: string } | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([]);

  // Load available sites
  useEffect(() => {
    import("@/config/sites").then((mod) => {
      const all = mod.getActiveSiteIds().map((id: string) => ({
        id,
        name: mod.getSiteConfig(id)?.name || id,
      }));
      setSites(all);
    }).catch(() => {
      setSites([{ id: "yalla-london", name: "Yalla London" }]);
    });
  }, []);

  // Load settings for selected site
  useEffect(() => {
    setLoading(true);
    setSettings(null);
    fetch(`/api/admin/site-settings?siteId=${encodeURIComponent(siteId)}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j) => setSettings(j.settings || {}))
      .catch((e) => console.warn("[cockpit] site-settings load failed:", e instanceof Error ? e.message : e))
      .finally(() => setLoading(false));
  }, [siteId]);

  const saveCategory = async (category: string, config: Record<string, unknown>, enabled: boolean) => {
    setSaving(category);
    setSaveResult(null);
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, category, config, enabled }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaveResult({ category, ok: true, msg: "Saved" });
      // Update local state
      setSettings((prev) => prev ? { ...prev, [category]: { config, enabled, updatedAt: new Date().toISOString() } } : prev);
    } catch (e) {
      setSaveResult({ category, ok: false, msg: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(null);
    }
  };

  const toggleCategory = (category: string) => {
    if (!settings?.[category]) return;
    const current = settings[category];
    saveCategory(category, current.config, !current.enabled);
  };

  const updateConfig = (category: string, key: string, value: unknown) => {
    setSettings((prev) => {
      if (!prev?.[category]) return prev;
      return {
        ...prev,
        [category]: {
          ...prev[category],
          config: { ...prev[category].config, [key]: value },
        },
      };
    });
  };

  const CATEGORIES = [
    { key: "affiliates", label: "Affiliates", icon: "💰", desc: "Partner links, commission tracking, injection rules" },
    { key: "email", label: "Email", icon: "📧", desc: "Provider config, campaigns, subscriber emails" },
    { key: "social", label: "Social Media", icon: "📱", desc: "Platform connections, auto-posting rules" },
    { key: "workflow", label: "Workflow", icon: "⚙️", desc: "Content tone, publishing rules, AI instructions" },
    { key: "general", label: "General", icon: "🌐", desc: "Site activation, indexing, maintenance mode" },
  ];

  return (
    <Card>
      <div className="flex items-center justify-between gap-2 mb-3">
        <SectionTitle>Website Config</SectionTitle>
        <select
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          className="bg-stone-100 text-stone-600 text-xs rounded px-2 py-1 border border-stone-200"
        >
          {sites.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-stone-500 text-xs animate-pulse">Loading settings…</p>
      ) : !settings ? (
        <p className="text-stone-500 text-xs">Failed to load settings. The site_settings table may need migration.</p>
      ) : (
        <div className="space-y-2">
          {CATEGORIES.map(({ key, label, icon, desc }) => {
            const cat = settings[key];
            const isExpanded = expandedCategory === key;
            if (!cat) return null;
            return (
              <div key={key} className={`rounded-lg border ${cat.enabled ? "border-stone-200 bg-stone-100/40" : "border-stone-200 bg-stone-50/40 opacity-70"}`}>
                {/* Header row */}
                <div className="flex items-center gap-2 p-2.5 cursor-pointer" onClick={() => setExpandedCategory(isExpanded ? null : key)}>
                  <span className="text-base">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-stone-700 text-xs font-medium">{label}</span>
                      {cat.updatedAt && (
                        <span className="text-stone-500 text-[10px]">updated {new Date(cat.updatedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    <p className="text-stone-500 text-[11px] truncate">{desc}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleCategory(key); }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${cat.enabled ? "bg-[#2D5A3D]" : "bg-stone-200"}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${cat.enabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
                  </button>
                  <span className={`text-stone-500 text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t border-stone-200/50 p-3 space-y-3">
                    {key === "affiliates" && <AffiliatesEditor config={cat.config} onChange={(k, v) => updateConfig("affiliates", k, v)} />}
                    {key === "email" && <EmailEditor config={cat.config} onChange={(k, v) => updateConfig("email", k, v)} />}
                    {key === "social" && <SocialEditor config={cat.config} onChange={(k, v) => updateConfig("social", k, v)} />}
                    {key === "workflow" && <WorkflowEditor config={cat.config} onChange={(k, v) => updateConfig("workflow", k, v)} />}
                    {key === "general" && <GeneralEditor config={cat.config} onChange={(k, v) => updateConfig("general", k, v)} />}

                    {/* Instructions textarea (shared across all categories) */}
                    {cat.config.instructions !== undefined && (
                      <div>
                        <label className="text-stone-400 text-[11px] font-medium block mb-1">AI Instructions</label>
                        <textarea
                          value={(cat.config.instructions as string) || ""}
                          onChange={(e) => updateConfig(key, "instructions", e.target.value)}
                          rows={3}
                          className="w-full bg-stone-50 text-stone-600 text-xs rounded px-2 py-1.5 border border-stone-200 resize-y"
                          placeholder="Instructions for AI when handling this category…"
                        />
                      </div>
                    )}

                    {/* Save button */}
                    <div className="flex items-center gap-2">
                      <ActionButton
                        onClick={() => saveCategory(key, cat.config, cat.enabled)}
                        loading={saving === key}
                        variant="success"
                      >
                        Save {label}
                      </ActionButton>
                      {saveResult?.category === key && (
                        <span className={`text-xs ${saveResult.ok ? "text-[#2D5A3D]" : "text-[#C8322B]"}`}>
                          {saveResult.ok ? "✅" : "❌"} {saveResult.msg}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Category Editors ───────────────────────────────────────────────────────

function AffiliatesEditor({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const partners = (config.partners || []) as AffiliatePartner[];
  const togglePartner = (idx: number) => {
    const updated = [...partners];
    updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
    onChange("partners", updated);
  };
  const updatePartnerField = (idx: number, field: string, value: string) => {
    const updated = [...partners];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange("partners", updated);
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs">
        <label className="text-stone-400">Injection Mode:</label>
        <select
          value={(config.injectionMode as string) || "auto"}
          onChange={(e) => onChange("injectionMode", e.target.value)}
          className="bg-stone-50 text-stone-600 rounded px-2 py-1 border border-stone-200 text-xs"
        >
          <option value="auto">Auto (cron injects into articles)</option>
          <option value="manual">Manual (AI includes during generation)</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <label className="text-stone-400">Max links/article:</label>
        <input
          type="number"
          value={(config.maxLinksPerArticle as number) || 5}
          onChange={(e) => onChange("maxLinksPerArticle", parseInt(e.target.value) || 5)}
          className="bg-stone-50 text-stone-600 rounded px-2 py-1 border border-stone-200 text-xs w-16"
          min={1}
          max={20}
        />
      </div>
      <label className="text-stone-400 text-[11px] font-medium block">Active Partners</label>
      <div className="space-y-1.5">
        {partners.map((p, i) => (
          <div key={i} className={`rounded-md border p-2 ${p.enabled ? "border-stone-200 bg-stone-100/30" : "border-stone-200 bg-stone-50/30 opacity-60"}`}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => togglePartner(i)}
                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors shrink-0 ${p.enabled ? "bg-[#2D5A3D]" : "bg-stone-200"}`}
              >
                <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${p.enabled ? "translate-x-3.5" : "translate-x-0.5"}`} />
              </button>
              <span className="text-stone-700 text-xs font-medium">{p.name}</span>
              <span className="text-stone-500 text-[10px]">{p.category}</span>
              <span className="text-[#2D5A3D] text-[10px] ml-auto">{p.commissionRate}</span>
            </div>
            {p.enabled && (
              <div className="mt-1.5 grid grid-cols-1 gap-1">
                <input
                  value={p.affiliateId}
                  onChange={(e) => updatePartnerField(i, "affiliateId", e.target.value)}
                  placeholder="Affiliate ID (from partner dashboard)"
                  className="bg-stone-50 text-stone-600 text-[11px] rounded px-2 py-1 border border-stone-200"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmailEditor({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-2 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-stone-400 text-[11px] block mb-0.5">Provider</label>
          <select
            value={(config.provider as string) || "auto"}
            onChange={(e) => onChange("provider", e.target.value)}
            className="w-full bg-stone-50 text-stone-600 rounded px-2 py-1 border border-stone-200 text-xs"
          >
            <option value="auto">Auto-detect</option>
            <option value="resend">Resend</option>
            <option value="sendgrid">SendGrid</option>
            <option value="smtp">SMTP</option>
          </select>
        </div>
        <div>
          <label className="text-stone-400 text-[11px] block mb-0.5">Digest Frequency</label>
          <select
            value={(config.digestFrequency as string) || "weekly"}
            onChange={(e) => onChange("digestFrequency", e.target.value)}
            className="w-full bg-stone-50 text-stone-600 rounded px-2 py-1 border border-stone-200 text-xs"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-stone-400 text-[11px] block mb-0.5">From Name</label>
          <input
            value={(config.fromName as string) || ""}
            onChange={(e) => onChange("fromName", e.target.value)}
            placeholder="e.g. Yalla London"
            className="w-full bg-stone-50 text-stone-600 rounded px-2 py-1 border border-stone-200 text-xs"
          />
        </div>
        <div>
          <label className="text-stone-400 text-[11px] block mb-0.5">From Email</label>
          <input
            value={(config.fromEmail as string) || ""}
            onChange={(e) => onChange("fromEmail", e.target.value)}
            placeholder="e.g. info@yalla-london.com"
            className="w-full bg-stone-50 text-stone-600 rounded px-2 py-1 border border-stone-200 text-xs"
          />
        </div>
      </div>
      <div>
        <label className="text-stone-400 text-[11px] block mb-0.5">Reply-To</label>
        <input
          value={(config.replyTo as string) || ""}
          onChange={(e) => onChange("replyTo", e.target.value)}
          placeholder="e.g. support@yalla-london.com"
          className="w-full bg-stone-50 text-stone-600 rounded px-2 py-1 border border-stone-200 text-xs"
        />
      </div>
      <div className="flex gap-4">
        <label className="flex items-center gap-1.5 text-stone-600">
          <input type="checkbox" checked={!!config.welcomeEmailEnabled} onChange={(e) => onChange("welcomeEmailEnabled", e.target.checked)} className="rounded" />
          Welcome email
        </label>
        <label className="flex items-center gap-1.5 text-stone-600">
          <input type="checkbox" checked={!!config.digestEmailEnabled} onChange={(e) => onChange("digestEmailEnabled", e.target.checked)} className="rounded" />
          Digest email
        </label>
      </div>
    </div>
  );
}

function SocialEditor({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  const platforms = (config.platforms || {}) as Record<string, { connected: boolean; handle?: string; pageId?: string }>;
  const updatePlatform = (platform: string, field: string, value: unknown) => {
    onChange("platforms", {
      ...platforms,
      [platform]: { ...platforms[platform], [field]: value },
    });
  };
  const PLATFORMS = [
    { key: "instagram", label: "Instagram", field: "handle", placeholder: "@yallalondon" },
    { key: "twitter", label: "Twitter / X", field: "handle", placeholder: "@yallalondon" },
    { key: "tiktok", label: "TikTok", field: "handle", placeholder: "@yallalondon" },
    { key: "facebook", label: "Facebook", field: "pageId", placeholder: "Page ID" },
  ];
  return (
    <div className="space-y-2 text-xs">
      {PLATFORMS.map((p) => (
        <div key={p.key} className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-stone-600 w-24 shrink-0">
            <input
              type="checkbox"
              checked={!!platforms[p.key]?.connected}
              onChange={(e) => updatePlatform(p.key, "connected", e.target.checked)}
              className="rounded"
            />
            {p.label}
          </label>
          <input
            value={(platforms[p.key]?.[p.field as keyof typeof platforms[string]] as string) || ""}
            onChange={(e) => updatePlatform(p.key, p.field, e.target.value)}
            placeholder={p.placeholder}
            className="flex-1 bg-stone-50 text-stone-600 rounded px-2 py-1 border border-stone-200 text-xs"
            disabled={!platforms[p.key]?.connected}
          />
        </div>
      ))}
      <label className="flex items-center gap-1.5 text-stone-600 text-xs mt-2">
        <input type="checkbox" checked={!!config.autoPostOnPublish} onChange={(e) => onChange("autoPostOnPublish", e.target.checked)} className="rounded" />
        Auto-post when article is published
      </label>
    </div>
  );
}

function WorkflowEditor({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-2 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-stone-400 text-[11px] block mb-0.5">Content Tone</label>
          <select
            value={(config.contentTone as string) || "luxury-editorial"}
            onChange={(e) => onChange("contentTone", e.target.value)}
            className="w-full bg-stone-50 text-stone-600 rounded px-2 py-1 border border-stone-200 text-xs"
          >
            <option value="luxury-editorial">Luxury Editorial</option>
            <option value="casual-friendly">Casual & Friendly</option>
            <option value="expert-authority">Expert Authority</option>
            <option value="adventure-inspiring">Adventure Inspiring</option>
          </select>
        </div>
        <div>
          <label className="text-stone-400 text-[11px] block mb-0.5">Publishing Frequency</label>
          <select
            value={(config.publishingFrequency as string) || "2/day"}
            onChange={(e) => onChange("publishingFrequency", e.target.value)}
            className="w-full bg-stone-50 text-stone-600 rounded px-2 py-1 border border-stone-200 text-xs"
          >
            <option value="1/day">1 per day</option>
            <option value="2/day">2 per day</option>
            <option value="3/day">3 per day</option>
            <option value="1/week">1 per week</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-stone-400 text-[11px] block mb-0.5">Target Audience</label>
        <input
          value={(config.targetAudience as string) || ""}
          onChange={(e) => onChange("targetAudience", e.target.value)}
          className="w-full bg-stone-50 text-stone-600 rounded px-2 py-1 border border-stone-200 text-xs"
          placeholder="e.g. Arab travellers seeking luxury experiences"
        />
      </div>
      <div>
        <label className="text-stone-400 text-[11px] block mb-0.5">Brand Voice Notes</label>
        <textarea
          value={(config.brandVoiceNotes as string) || ""}
          onChange={(e) => onChange("brandVoiceNotes", e.target.value)}
          rows={2}
          className="w-full bg-stone-50 text-stone-600 text-xs rounded px-2 py-1.5 border border-stone-200 resize-y"
          placeholder="Special notes about brand voice, phrases to use/avoid…"
        />
      </div>
    </div>
  );
}

function GeneralEditor({ config, onChange }: { config: Record<string, unknown>; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-2 text-xs">
      <div className="flex flex-wrap gap-4">
        {[
          { key: "siteActive", label: "Site Active" },
          { key: "indexingEnabled", label: "Google Indexing" },
          { key: "cronJobsEnabled", label: "Cron Jobs" },
          { key: "maintenanceMode", label: "Maintenance Mode" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-1.5 text-stone-600">
            <input
              type="checkbox"
              checked={key === "maintenanceMode" ? !!config[key] : config[key] !== false}
              onChange={(e) => onChange(key, e.target.checked)}
              className="rounded"
            />
            {label}
          </label>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2">
        <div>
          <label className="text-stone-400 text-[11px] block mb-0.5">Custom Domain</label>
          <input
            value={(config.customDomain as string) || ""}
            onChange={(e) => onChange("customDomain", e.target.value)}
            placeholder="e.g. yalla-london.com"
            className="w-full bg-stone-50 text-stone-600 rounded px-2 py-1 border border-stone-200 text-xs"
          />
        </div>
        <div>
          <label className="text-stone-400 text-[11px] block mb-0.5">Google Verification Code</label>
          <input
            value={(config.googleVerification as string) || ""}
            onChange={(e) => onChange("googleVerification", e.target.value)}
            placeholder="google-site-verification=…"
            className="w-full bg-stone-50 text-stone-600 rounded px-2 py-1 border border-stone-200 text-xs"
          />
        </div>
        <div>
          <label className="text-stone-400 text-[11px] block mb-0.5">GA4 Measurement ID</label>
          <input
            value={(config.analyticsId as string) || ""}
            onChange={(e) => onChange("analyticsId", e.target.value)}
            placeholder="G-XXXXXXXXXX"
            className="w-full bg-stone-50 text-stone-600 rounded px-2 py-1 border border-stone-200 text-xs"
          />
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ system }: { system: SystemStatus | null }) {
  const [flags, setFlags] = useState<Array<{ id: string; key: string; enabled: boolean; description: string }>>([]);
  const [flagsLoading, setFlagsLoading] = useState(true);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState<string | null>(null);
  const [showActionLogs, setShowActionLogs] = useState(false);

  // Migration state
  const [migrationStatus, setMigrationStatus] = useState<"idle" | "scanning" | "migrating" | "done">("idle");
  const [migrationResult, setMigrationResult] = useState<{
    type: "scan" | "migrate" | "prisma-migrate";
    missingTables: number;
    missingColumns: number;
    missingIndexes: number;
    needsMigration: boolean;
    tablesCreated?: string[];
    columnsAdded?: string[];
    indexesCreated?: string[];
    foreignKeysCreated?: string[];
    errors?: string[];
    durationMs?: number;
    prismaMigrations?: any;
  } | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  // System Health Audit state
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditProgress, setAuditProgress] = useState<string | null>(null);
  const [auditReport, setAuditReport] = useState<{
    overallScore: number;
    overallStatus: "healthy" | "degraded" | "unhealthy";
    durationMs: number;
    summary: { totalChecks: number; passed: number; warnings: number; failed: number; skipped: number };
    sections: Record<string, {
      status: "pass" | "warn" | "fail" | "skip";
      score: number;
      checks: Record<string, {
        status: "pass" | "warn" | "fail" | "skip";
        score: number;
        durationMs: number;
        details: Record<string, unknown>;
        error?: string;
        action?: string;
      }>;
    }>;
  } | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const runSystemAudit = async () => {
    setAuditRunning(true);
    setAuditError(null);
    setAuditReport(null);
    setAuditProgress("Starting audit…");
    setExpandedSections(new Set());
    try {
      const res = await fetch("/api/admin/system-health-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      const report = await res.json();
      setAuditReport(report);
      setAuditProgress(null);
      // Auto-expand failed sections
      const failedSections = new Set<string>();
      for (const [key, section] of Object.entries(report.sections || {})) {
        const s = section as { status: string };
        if (s.status === "fail") failedSections.add(key);
      }
      setExpandedSections(failedSections);
    } catch (e) {
      setAuditError(e instanceof Error ? e.message : String(e));
      setAuditProgress(null);
    } finally {
      setAuditRunning(false);
    }
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const copyAuditJson = () => {
    if (!auditReport) return;
    navigator.clipboard.writeText(JSON.stringify(auditReport, null, 2))
      .then(() => alert("Copied to clipboard"))
      .catch(() => alert("Failed to copy"));
  };

  useEffect(() => {
    fetch("/api/admin/feature-flags")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j) => setFlags((j.flags ?? []).map((f: { id: string; name: string; enabled: boolean; description: string }) => ({ id: f.id, key: f.name, enabled: f.enabled, description: f.description || "" }))))
      .catch((e) => { console.warn("[cockpit] feature-flags load failed:", e instanceof Error ? e.message : e); setFlags([]); })
      .finally(() => setFlagsLoading(false));
  }, []);

  const runTest = async (endpoint: string, label: string) => {
    setTestLoading(label);
    setTestResult(null);
    try {
      const res = await fetch(endpoint);
      const json = await res.json();
      setTestResult(`✅ ${label}: ${JSON.stringify(json).slice(0, 100)}`);
    } catch (e) {
      setTestResult(`❌ ${label}: ${e instanceof Error ? e.message : "Error"}`);
    } finally {
      setTestLoading(null);
    }
  };

  const toggleFlag = async (key: string, enabled: boolean) => {
    const flag = flags.find((f) => f.key === key);
    if (!flag) return;
    try {
      await fetch("/api/admin/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-flag", data: { flagId: flag.id, enabled: !enabled } }),
      });
      setFlags((prev) => prev.map((f) => f.key === key ? { ...f, enabled: !f.enabled } : f));
    } catch (e) {
      console.warn("[cockpit] toggleFlag failed:", e instanceof Error ? e.message : e);
      // Revert optimistic update on failure
      setFlags((prev) => prev.map((f) => f.key === key ? { ...f, enabled } : f));
    }
  };

  const runMigrationScan = async () => {
    setMigrationStatus("scanning");
    setMigrationError(null);
    setMigrationResult(null);
    try {
      const res = await fetch("/api/admin/db-migrate");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Scan failed");
      setMigrationResult({
        type: "scan",
        missingTables: json.summary?.missingTables ?? 0,
        missingColumns: json.summary?.missingColumns ?? 0,
        missingIndexes: json.missingIndexes ?? 0,
        needsMigration: json.summary?.needsMigration ?? false,
      });
    } catch (e) {
      setMigrationError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setMigrationStatus("idle");
    }
  };

  const runMigrationFix = async () => {
    setMigrationStatus("migrating");
    setMigrationError(null);
    try {
      const res = await fetch("/api/admin/db-migrate", { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Migration failed");
      setMigrationResult({
        type: "migrate",
        missingTables: json.after?.missingTables ?? 0,
        missingColumns: json.after?.missingColumns ?? 0,
        missingIndexes: 0,
        needsMigration: false,
        tablesCreated: json.result?.tablesCreated ?? [],
        columnsAdded: json.result?.columnsAdded ?? [],
        indexesCreated: json.result?.indexesCreated ?? [],
        foreignKeysCreated: json.result?.foreignKeysCreated ?? [],
        errors: json.result?.errors ?? [],
        durationMs: json.durationMs,
      });
      setMigrationStatus("done");
    } catch (e) {
      setMigrationError(e instanceof Error ? e.message : "Migration failed");
      setMigrationStatus("idle");
    }
  };

  const ENV_VARS = [
    { key: "DATABASE_URL", ok: system?.db.connected ?? false },
    { key: "XAI_API_KEY / GROK_API_KEY", ok: system?.ai.activeProviders.includes("grok") ?? false },
    { key: "ANTHROPIC_API_KEY", ok: system?.ai.activeProviders.includes("claude") ?? false },
    { key: "NEXTAUTH_SECRET", ok: system?.nextAuthSecret.configured ?? false },
    { key: "INDEXNOW_KEY", ok: system?.indexNow.configured ?? false },
    { key: "GSC_CREDENTIALS", ok: system?.gsc.configured ?? false },
    { key: "CRON_SECRET", ok: system?.cronSecret.configured ?? false },
    { key: "OPENAI_API_KEY", ok: system?.ai.activeProviders.includes("openai") ?? false },
    { key: "GOOGLE_AI_API_KEY", ok: system?.ai.activeProviders.includes("gemini") ?? false },
    { key: "Email (RESEND/SENDGRID/SMTP)", ok: system?.email?.configured ?? false },
  ];

  const API_KEYS = [
    { key: "DATABASE_URL", status: system?.db.connected ?? false, capability: "Supabase PostgreSQL — all data", emoji: "🗄" },
    { key: "XAI_API_KEY", status: system?.ai.activeProviders.includes("grok") ?? false, capability: "Grok (xAI) — EN content + topics", emoji: "🤖" },
    { key: "ANTHROPIC_API_KEY", status: system?.ai.activeProviders.includes("claude") ?? false, capability: "Claude — AR translation + editing", emoji: "🧠" },
    { key: "OPENAI_API_KEY", status: system?.ai.activeProviders.includes("openai") ?? false, capability: "OpenAI DALL-E — AI image generation", emoji: "🎨" },
    { key: "GOOGLE_AI_API_KEY", status: system?.ai.activeProviders.includes("gemini") ?? false, capability: "Gemini — alternative AI provider", emoji: "✨" },
    { key: "PERPLEXITY_API_KEY", status: system?.ai.activeProviders.includes("perplexity") ?? false, capability: "Perplexity — web-grounded AI research", emoji: "🔎" },
    { key: "INDEXNOW_KEY", status: system?.indexNow.configured ?? false, capability: "IndexNow — instant Google indexing", emoji: "🔍" },
    { key: "GSC_CREDENTIALS", status: system?.gsc.configured ?? false, capability: "Google Search Console — search analytics", emoji: "📊" },
    { key: "CRON_SECRET", status: system?.cronSecret.configured ?? false, capability: "Cron job authentication", emoji: "⏰" },
    { key: "NEXTAUTH_SECRET", status: system?.nextAuthSecret.configured ?? false, capability: "Admin session security", emoji: "🔐" },
    { key: "Email Provider", status: system?.email?.configured ?? false, capability: `${system?.email?.provider ? `${system.email.provider} — email campaigns` : "No email provider configured"}`, emoji: "📧" },
  ];

  return (
    <div className="space-y-4">
      {/* Env var status */}
      <Card>
        <SectionTitle>Environment Status</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {ENV_VARS.map(({ key, ok }) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className={ok ? "text-[#2D5A3D]" : "text-stone-500"}>{ok ? "✅" : "❌"}</span>
              <span className={ok ? "text-stone-600" : "text-stone-500"}>{key}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* API Keys monitoring panel */}
      <Card>
        <SectionTitle>API Keys Status</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {API_KEYS.map(({ key, status, capability, emoji }) => (
            <div key={key} className={`flex items-start gap-2 rounded-lg p-2 text-xs ${status ? "bg-stone-100/40" : "bg-[rgba(200,50,43,0.03)] border border-[rgba(200,50,43,0.15)]"}`}>
              <span className="text-base mt-0.5">{emoji}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={status ? "text-[#2D5A3D]" : "text-[#C8322B]"}>
                    {status ? "✅" : "❌"}
                  </span>
                  <span className={`font-mono font-medium ${status ? "text-stone-700" : "text-stone-400"}`}>{key}</span>
                </div>
                <p className="text-stone-500 mt-0.5">{capability}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-stone-200 pt-2">
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#3B7EA1] hover:underline"
          >
            → Add missing keys in Vercel Dashboard → Settings → Environment Variables
          </a>
        </div>
      </Card>

      {/* Testing tools */}
      <Card>
        <SectionTitle>Testing Tools</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton onClick={() => runTest("/api/admin/cockpit", "Cockpit API")} loading={testLoading === "Cockpit API"}>
            🔌 Test Cockpit API
          </ActionButton>
          <ActionButton onClick={() => runTest("/api/admin/ai-config", "AI Config API")} loading={testLoading === "AI Config API"}>
            🤖 Test AI Config
          </ActionButton>
          <ActionButton onClick={() => runTest("/api/admin/content-matrix", "Content Matrix")} loading={testLoading === "Content Matrix"}>
            📋 Test Content API
          </ActionButton>
          <ActionButton onClick={() => runTest("/api/health", "Health Check")} loading={testLoading === "Health Check"}>
            ❤️ Health Check
          </ActionButton>
        </div>
        {testResult && (
          <p className={`mt-2 text-xs rounded px-2 py-1 break-all ${testResult.startsWith("✅") ? "bg-[rgba(45,90,61,0.06)] text-[#2D5A3D]" : "bg-[rgba(200,50,43,0.06)] text-[#C8322B]"}`}>
            {testResult}
          </p>
        )}

        {/* System Health Audit */}
        <div className="mt-3 border-t border-stone-200 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <ActionButton
              onClick={runSystemAudit}
              loading={auditRunning}
              variant="success"
              className="flex-1"
            >
              🩺 System Health Audit
            </ActionButton>
            {auditReport && (
              <ActionButton onClick={copyAuditJson}>
                📋 Copy JSON
              </ActionButton>
            )}
          </div>

          {/* Progress */}
          {auditProgress && (
            <div className="flex items-center gap-2 text-xs text-[#1e5a7a] bg-[rgba(59,126,161,0.06)] px-3 py-2 rounded-lg mb-2">
              <span className="animate-spin">⏳</span>
              <span>{auditProgress}</span>
            </div>
          )}

          {/* Error */}
          {auditError && (
            <div className="text-xs text-[#C8322B] bg-[rgba(200,50,43,0.06)] px-3 py-2 rounded-lg mb-2">
              ❌ Audit failed: {auditError}
            </div>
          )}

          {/* Results */}
          {auditReport && (
            <div className="space-y-2">
              {/* Overall Score */}
              <div className={`rounded-lg p-3 border ${
                auditReport.overallStatus === "healthy" ? "bg-[rgba(45,90,61,0.06)] border-[rgba(45,90,61,0.3)]" :
                auditReport.overallStatus === "degraded" ? "bg-[rgba(196,154,42,0.06)] border-[rgba(196,154,42,0.3)]" :
                "bg-[rgba(200,50,43,0.06)] border-[rgba(200,50,43,0.3)]"
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-2xl font-bold ${
                      auditReport.overallStatus === "healthy" ? "text-[#2D5A3D]" :
                      auditReport.overallStatus === "degraded" ? "text-[#7a5a10]" :
                      "text-[#C8322B]"
                    }`}>{auditReport.overallScore}/100</span>
                    <span className={`ml-2 text-xs font-medium uppercase ${
                      auditReport.overallStatus === "healthy" ? "text-[#2D5A3D]" :
                      auditReport.overallStatus === "degraded" ? "text-[#C49A2A]" :
                      "text-[#C8322B]"
                    }`}>{auditReport.overallStatus}</span>
                  </div>
                  <span className="text-xs text-stone-500">{formatDuration(auditReport.durationMs)}</span>
                </div>
                <div className="flex gap-3 mt-2 text-xs">
                  <span className="text-[#2D5A3D]">✅ {auditReport.summary.passed}</span>
                  <span className="text-[#C49A2A]">⚠️ {auditReport.summary.warnings}</span>
                  <span className="text-[#C8322B]">❌ {auditReport.summary.failed}</span>
                  <span className="text-stone-500">⏭️ {auditReport.summary.skipped}</span>
                </div>
              </div>

              {/* Sections */}
              {Object.entries(auditReport.sections).map(([sectionKey, section]) => {
                const isExpanded = expandedSections.has(sectionKey);
                const sectionLabel = sectionKey.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim();
                const statusIcon = section.status === "pass" ? "✅" : section.status === "warn" ? "⚠️" : section.status === "fail" ? "❌" : "⏭️";
                const borderColor = section.status === "pass" ? "border-[rgba(45,90,61,0.3)]" : section.status === "warn" ? "border-[rgba(196,154,42,0.3)]" : section.status === "fail" ? "border-[rgba(200,50,43,0.3)]" : "border-stone-200";
                const bgColor = section.status === "fail" ? "bg-[rgba(200,50,43,0.04)]" : section.status === "warn" ? "bg-[rgba(196,154,42,0.03)]" : "bg-stone-50/50";

                return (
                  <div key={sectionKey} className={`rounded-lg border ${borderColor} ${bgColor} overflow-hidden`}>
                    <button
                      onClick={() => toggleSection(sectionKey)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-stone-100/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm">{statusIcon}</span>
                        <span className="text-xs font-medium text-stone-700 truncate">{sectionLabel}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-mono ${scoreColor(section.score)}`}>{section.score}</span>
                        <ChevronDown className={`w-3 h-3 text-stone-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-2 space-y-1 border-t border-stone-200/50">
                        {Object.entries(section.checks).map(([checkKey, check]) => {
                          const checkIcon = check.status === "pass" ? "✅" : check.status === "warn" ? "⚠️" : check.status === "fail" ? "❌" : "⏭️";
                          const checkLabel = checkKey.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^./, s => s.toUpperCase()).trim();
                          return (
                            <div key={checkKey} className="pt-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-1.5 min-w-0">
                                  <span className="text-xs mt-0.5">{checkIcon}</span>
                                  <div className="min-w-0">
                                    <span className="text-xs text-stone-600 block">{checkLabel}</span>
                                    {check.error && (
                                      <span className="text-[10px] text-[#C8322B] block mt-0.5 break-all">{check.error}</span>
                                    )}
                                    {check.action && (
                                      <span className="text-[10px] text-[#C49A2A] block mt-0.5">{check.action}</span>
                                    )}
                                  </div>
                                </div>
                                <span className="text-[10px] text-stone-500 shrink-0">{formatDuration(check.durationMs)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-3 border-t border-stone-200 pt-3 flex flex-wrap gap-2">
          <ActionButton onClick={() => setShowActionLogs(true)}>
            📊 Action Logs
          </ActionButton>
          <a href="/test-connections.html" target="_blank" className="px-3 py-1.5 rounded-lg border text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-600 border-stone-200">
            🔬 test-connections.html
          </a>
          <Link href="/admin/cron-logs" className="px-3 py-1.5 rounded-lg border text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-600 border-stone-200">
            📋 Full Cron History
          </Link>
          <Link href="/admin" className="px-3 py-1.5 rounded-lg border text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-600 border-stone-200">
            📁 Full Admin
          </Link>
        </div>
      </Card>

      {/* Database Migration */}
      <Card>
        <SectionTitle>Database Migration</SectionTitle>
        <p className="text-stone-500 text-xs mb-3">Scan for missing tables, columns, and indexes. Fix applies all pending schema changes.</p>
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={runMigrationScan} loading={migrationStatus === "scanning"}>
            🔍 Scan Schema
          </ActionButton>
          <ActionButton
            onClick={runMigrationFix}
            loading={migrationStatus === "migrating"}
          >
            🔧 Fix All
          </ActionButton>
          <ActionButton
            variant="success"
            onClick={async () => {
              setMigrationStatus("scanning");
              setMigrationError(null);
              setMigrationResult(null);
              try {
                // Step 1: Scan
                const scanRes = await fetch("/api/admin/db-migrate");
                const scanJson = await scanRes.json();
                if (!scanJson.success) throw new Error(scanJson.error || "Scan failed");
                if (!scanJson.summary?.needsMigration) {
                  setMigrationResult({ type: "scan", missingTables: 0, missingColumns: 0, missingIndexes: 0, needsMigration: false });
                  setMigrationStatus("done");
                  return;
                }
                // Step 2: Apply all fixes
                setMigrationStatus("migrating");
                const fixRes = await fetch("/api/admin/db-migrate", { method: "POST" });
                const fixJson = await fixRes.json();
                if (!fixJson.success) throw new Error(fixJson.error || "Migration failed");
                setMigrationResult({
                  type: "migrate",
                  missingTables: fixJson.after?.missingTables ?? 0,
                  missingColumns: fixJson.after?.missingColumns ?? 0,
                  missingIndexes: 0,
                  needsMigration: false,
                  tablesCreated: fixJson.result?.tablesCreated ?? [],
                  columnsAdded: fixJson.result?.columnsAdded ?? [],
                  indexesCreated: fixJson.result?.indexesCreated ?? [],
                  foreignKeysCreated: fixJson.result?.foreignKeysCreated ?? [],
                  errors: fixJson.result?.errors ?? [],
                  durationMs: fixJson.durationMs,
                });
                setMigrationStatus("done");
              } catch (e) {
                setMigrationError(e instanceof Error ? e.message : "Full migration failed");
                setMigrationStatus("idle");
              }
            }}
            loading={migrationStatus === "scanning" || migrationStatus === "migrating"}
          >
            🚀 Full Migration (Scan + Fix)
          </ActionButton>
          <ActionButton
            variant="success"
            onClick={async () => {
              setMigrationStatus("migrating");
              setMigrationError(null);
              setMigrationResult(null);
              try {
                const res = await fetch("/api/admin/db-migrate?action=prisma-migrate", { method: "POST" });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                if (!json.success && json.errors?.length) throw new Error(json.errors.join(", "));
                setMigrationResult({
                  type: "prisma-migrate",
                  needsMigration: false,
                  missingTables: 0,
                  missingColumns: 0,
                  missingIndexes: 0,
                  prismaMigrations: json,
                });
                setMigrationStatus("done");
              } catch (e) {
                setMigrationError(e instanceof Error ? e.message : "Prisma migration failed");
                setMigrationStatus("idle");
              }
            }}
            loading={migrationStatus === "migrating"}
          >
            📦 Run Prisma Migrations
          </ActionButton>
        </div>
        {migrationError && (
          <p className="mt-2 text-xs bg-[rgba(200,50,43,0.06)] text-[#C8322B] rounded px-2 py-1">{migrationError}</p>
        )}
        {migrationResult && (
          <div className="mt-2 text-xs space-y-1">
            {migrationResult.type === "scan" ? (
              <>
                <div className="flex items-center gap-2">
                  <span className={migrationResult.needsMigration ? "text-[#C49A2A]" : "text-[#2D5A3D]"}>
                    {migrationResult.needsMigration ? "⚠️" : "✅"}
                  </span>
                  <span className="text-stone-600">
                    {migrationResult.needsMigration
                      ? "Migration needed"
                      : "Schema is up to date"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <div className={`rounded px-2 py-1 text-center ${migrationResult.missingTables > 0 ? "bg-[rgba(200,50,43,0.06)] text-[#C8322B]" : "bg-stone-100 text-stone-400"}`}>
                    {migrationResult.missingTables} tables
                  </div>
                  <div className={`rounded px-2 py-1 text-center ${migrationResult.missingColumns > 0 ? "bg-[rgba(200,50,43,0.06)] text-[#C8322B]" : "bg-stone-100 text-stone-400"}`}>
                    {migrationResult.missingColumns} columns
                  </div>
                  <div className={`rounded px-2 py-1 text-center ${migrationResult.missingIndexes > 0 ? "bg-[rgba(196,154,42,0.06)] text-[#7a5a10]" : "bg-stone-100 text-stone-400"}`}>
                    {migrationResult.missingIndexes} indexes
                  </div>
                </div>
              </>
            ) : migrationResult.type === "prisma-migrate" ? (
              <>
                <div className="flex items-center gap-2">
                  <span className={(migrationResult.prismaMigrations?.errors?.length ?? 0) > 0 ? "text-[#C49A2A]" : "text-[#2D5A3D]"}>
                    {(migrationResult.prismaMigrations?.errors?.length ?? 0) > 0 ? "⚠️" : "✅"}
                  </span>
                  <span className="text-stone-600">
                    Prisma migrations: {migrationResult.prismaMigrations?.newlyApplied ?? 0} applied, {migrationResult.prismaMigrations?.alreadyApplied ?? 0} already up-to-date
                    {migrationResult.prismaMigrations?.durationMs ? ` (${(migrationResult.prismaMigrations.durationMs / 1000).toFixed(1)}s)` : ""}
                  </span>
                </div>
                {(migrationResult.prismaMigrations?.applied?.length ?? 0) > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {migrationResult.prismaMigrations!.applied.map((m: string, i: number) => (
                      <p key={i} className="text-[#2D5A3D] text-[11px]">✅ {m}</p>
                    ))}
                  </div>
                )}
                {(migrationResult.prismaMigrations?.errors?.length ?? 0) > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[#C8322B] font-medium">{migrationResult.prismaMigrations!.errors.length} error(s):</p>
                    {migrationResult.prismaMigrations!.errors.map((err: string, i: number) => (
                      <p key={i} className="text-[#C8322B]/80 text-[11px] bg-[rgba(200,50,43,0.04)] rounded px-2 py-1 break-words">{err}</p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className={(migrationResult.errors?.length ?? 0) > 0 ? "text-[#C49A2A]" : "text-[#2D5A3D]"}>
                    {(migrationResult.errors?.length ?? 0) > 0 ? "⚠️" : "✅"}
                  </span>
                  <span className="text-stone-600">
                    Migration complete{migrationResult.durationMs ? ` (${(migrationResult.durationMs / 1000).toFixed(1)}s)` : ""}
                  </span>
                </div>
                {(migrationResult.tablesCreated?.length ?? 0) > 0 && (
                  <p className="text-[#2D5A3D]">+ {migrationResult.tablesCreated!.length} table(s) created: {migrationResult.tablesCreated!.join(", ")}</p>
                )}
                {(migrationResult.columnsAdded?.length ?? 0) > 0 && (
                  <p className="text-[#2D5A3D]">+ {migrationResult.columnsAdded!.length} column(s) added</p>
                )}
                {(migrationResult.indexesCreated?.length ?? 0) > 0 && (
                  <p className="text-[#2D5A3D]">+ {migrationResult.indexesCreated!.length} index(es) created</p>
                )}
                {(migrationResult.foreignKeysCreated?.length ?? 0) > 0 && (
                  <p className="text-[#2D5A3D]">+ {migrationResult.foreignKeysCreated!.length} foreign key(s) created</p>
                )}
                {(migrationResult.errors?.length ?? 0) > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[#C8322B] font-medium">{migrationResult.errors!.length} error(s):</p>
                    {migrationResult.errors!.map((err, i) => (
                      <p key={i} className="text-[#C8322B]/80 text-[11px] bg-[rgba(200,50,43,0.04)] rounded px-2 py-1 break-words">{err}</p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Card>

      {/* Per-Site Website Config */}
      <WebsiteConfigPanel />

      {/* Feature flags */}
      <Card>
        <SectionTitle>Feature Flags</SectionTitle>
        {flagsLoading ? (
          <p className="text-stone-500 text-xs">Loading flags…</p>
        ) : flags.length === 0 ? (
          <p className="text-stone-500 text-xs">No feature flags found in database.</p>
        ) : (
          <div className="space-y-2">
            {flags.map((flag) => (
              <div key={flag.key} className="flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-stone-600 font-medium">{flag.key}</span>
                  {flag.description && <p className="text-stone-500 mt-0.5">{flag.description}</p>}
                </div>
                <button
                  onClick={() => toggleFlag(flag.key, flag.enabled)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${flag.enabled ? "bg-[#2D5A3D]" : "bg-stone-200"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${flag.enabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Cron Schedule Reference */}
      <Card>
        <SectionTitle>Cron Schedules & Quantities</SectionTitle>
        <p className="text-stone-500 text-xs mb-3">
          Current cron timing and article generation quantities. To change schedules, update <code className="text-stone-400">vercel.json</code> and redeploy.
        </p>
        <div className="space-y-2 text-xs">
          {[
            { name: "Content Builder", schedule: "*/15 * * * *", desc: "Every 15 min — advances 1-2 drafts per run through 8 phases", quantity: "1-2 drafts/run" },
            { name: "Content Selector", schedule: "0 9,13,17,21 * * *", desc: "4x daily — promotes reservoir articles to published", quantity: "Up to 3 per run" },
            { name: "Weekly Topics", schedule: "0 4 * * 1", desc: "Monday 4am UTC — generates topic proposals for all sites", quantity: "10-20 topics/site" },
            { name: "Content Auto-Fix", schedule: "0 11,18 * * *", desc: "2x daily — expands short articles, trims meta descriptions", quantity: "Up to 10 per run" },
            { name: "SEO Agent", schedule: "0 7,13,20 * * *", desc: "3x daily — auto-fixes meta, schema, internal links", quantity: "50 meta + 20 schema + 5 links" },
            { name: "Diagnostic Sweep", schedule: "0 */2 * * *", desc: "Every 2 hours — diagnoses stuck drafts and failed crons", quantity: "All stuck items" },
          ].map((cron) => (
            <div key={cron.name} className="rounded-lg bg-stone-100/50 p-2.5">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-stone-700 font-medium">{cron.name}</span>
                <code className="text-[#5B21B6] font-mono text-[10px] bg-stone-50 px-1.5 py-0.5 rounded">{cron.schedule}</code>
              </div>
              <p className="text-stone-500">{cron.desc}</p>
              <p className="text-stone-500 mt-0.5">Quantity: <span className="text-stone-400">{cron.quantity}</span></p>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-stone-200 pt-2">
          <p className="text-stone-500 text-[11px]">
            Tip: To increase article output, the content-builder runs every 15 min and processes 1-2 drafts each run.
            More topics = more articles. Use &quot;Research &amp; Create&quot; in the Content tab to add topics on demand.
          </p>
        </div>
      </Card>

      {/* Links */}
      <Card>
        <SectionTitle>System Info</SectionTitle>
        <div className="text-xs space-y-1 text-stone-500">
          <p>Platform: Vercel Pro</p>
          <p>Cockpit v2.0.0</p>
          <p>
            <Link href="/admin/design" className="text-[#3B7EA1] hover:underline">→ Design Studio</Link>
          </p>
          <p>
            <Link href="/admin/email-campaigns" className="text-[#3B7EA1] hover:underline">→ Email Campaigns</Link>
          </p>
          <p>
            <Link href="/admin/cockpit/new-site" className="text-[#3B7EA1] hover:underline">→ New Website Builder</Link>
          </p>
        </div>
      </Card>

      {/* Action Logs overlay */}
      {showActionLogs && <ActionLogsPanel onClose={() => setShowActionLogs(false)} />}
    </div>
  );
}

// ─── Tasks Tab ───────────────────────────────────────────────────────────────

interface DevTask {
  id: string;
  siteId: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  dueDate?: string;
  source: string;
  sourceRef?: string;
  actionLabel?: string;
  actionApi?: string;
  actionPayload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface TaskSummary {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  dismissed: number;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
}

interface DevPhase {
  name: string;
  order: number;
  tasks: DevTask[];
  readiness: number;
  done: number;
  total: number;
}

interface TestResult {
  success: boolean | null;
  readiness: number;
  timestamp: string;
  durationMs: number;
  plainLanguage: string;
  json: Record<string, unknown>;
  evidence?: { type: string; content: unknown };
  error?: { code: string; message: string; where: string; howToFix: string; envVarsNeeded?: string[] };
}

// ── Development Monitor Section ──────────────────────────────────────────────

interface DevPlanGroup {
  planId: string;
  planTitle: string;
  project: string;
  phases: DevPhase[];
  totalTasks: number;
  completedTasks: number;
  readiness: number;
}

function DevMonitorSection({ siteId }: { siteId: string }) {
  const [plans, setPlans] = useState<DevPlanGroup[]>([]);
  const [phases, setPhases] = useState<DevPhase[]>([]);
  const [projectStats, setProjectStats] = useState<{ project: string; totalTasks: number; completedTasks: number; readiness: number; phaseCount: number; planCount?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [testingTask, setTestingTask] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testAllRunning, setTestAllRunning] = useState(false);
  const [testAllProgress, setTestAllProgress] = useState<{ done: number; total: number; passed: number; failed: number; skipped: number } | null>(null);
  const [copiedJson, setCopiedJson] = useState<string | null>(null);

  const fetchDevPlan = useCallback(async () => {
    try {
      const params = new URLSearchParams({ siteId: siteId || "all", source: "dev-plan", status: "all" });
      const res = await fetch(`/api/admin/dev-tasks?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setPhases(data.phases || []);
      setPlans(data.plans || []);
      setProjectStats(data.projectStats || null);

      // Auto-sync ALL plans if no dev-plan tasks exist
      if (!data.phases || data.phases.length === 0) {
        await syncPlan();
      }
    } catch (err) {
      console.warn("[dev-monitor] Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => { fetchDevPlan(); }, [fetchDevPlan]);

  const syncPlan = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/dev-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_all_plans", siteId }),
      });
      if (res.ok) await fetchDevPlan();
    } catch (err) {
      console.warn("[dev-monitor] Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  const runTest = async (task: DevTask) => {
    const meta = (task.metadata || {}) as Record<string, unknown>;
    const testType = meta.testType as string;
    if (!testType) return;

    setTestingTask(task.id);
    try {
      const res = await fetch("/api/admin/dev-tasks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_test", testType, taskId: task.id, siteId }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestResults(prev => ({ ...prev, [task.id]: data.result }));
      }
    } catch (err) {
      console.warn("[dev-monitor] Test failed:", err);
    } finally {
      setTestingTask(null);
    }
  };

  const runTestAll = async () => {
    setTestAllRunning(true);
    const allTasks = plans.length > 0
      ? plans.reduce((s, p) => s + p.phases.reduce((s2, ph) => s2 + ph.tasks.length, 0), 0)
      : phases.reduce((s, p) => s + p.tasks.length, 0);
    setTestAllProgress({ done: 0, total: allTasks, passed: 0, failed: 0, skipped: 0 });
    try {
      const res = await fetch("/api/admin/dev-tasks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_all", siteId }),
      });
      if (res.ok) {
        const data = await res.json();
        // Populate individual results
        const newResults: Record<string, TestResult> = {};
        const allPhases = plans.length > 0
          ? plans.flatMap(p => p.phases)
          : phases;
        for (const r of data.results || []) {
          for (const phase of allPhases) {
            for (const task of phase.tasks) {
              const meta = (task.metadata || {}) as Record<string, unknown>;
              if (meta.id === r.taskId) {
                newResults[task.id] = r.result;
              }
            }
          }
        }
        setTestResults(prev => ({ ...prev, ...newResults }));
        setTestAllProgress({
          done: data.summary.total,
          total: data.summary.total,
          passed: data.summary.passed,
          failed: data.summary.failed,
          skipped: data.summary.skipped,
        });
      }
    } catch (err) {
      console.warn("[dev-monitor] Test All failed:", err);
    } finally {
      setTestAllRunning(false);
    }
  };

  const copyJson = (taskId: string, result: TestResult, task: DevTask) => {
    const meta = (task.metadata || {}) as Record<string, unknown>;
    // Find containing phase and plan
    let phase: DevPhase | undefined;
    let containingPlan: DevPlanGroup | undefined;
    for (const p of plans) {
      for (const ph of p.phases) {
        if (ph.tasks.some(t => t.id === task.id)) { phase = ph; containingPlan = p; break; }
      }
      if (phase) break;
    }
    if (!phase) phase = phases.find(p => p.tasks.some(t => t.id === task.id));
    const jsonReport = {
      task: { id: meta.id, title: meta.title, phase: meta.phase, project: projectStats?.project },
      test: { type: meta.testType, success: result.success, readiness: result.readiness, timestamp: result.timestamp, durationMs: result.durationMs },
      evidence: result.json,
      plainLanguage: result.plainLanguage,
      error: result.error || null,
      dates: { started: meta.startDate, lastTest: result.timestamp, dueDate: meta.dueDate },
      phase_status: phase ? { name: phase.name, done: `${phase.done}/${phase.total}`, readiness: phase.readiness } : null,
      project_status: containingPlan
        ? { name: containingPlan.planTitle, done: `${containingPlan.completedTasks}/${containingPlan.totalTasks}`, readiness: containingPlan.readiness }
        : projectStats ? { name: projectStats.project, done: `${projectStats.completedTasks}/${projectStats.totalTasks}`, readiness: projectStats.readiness } : null,
    };
    navigator.clipboard.writeText(JSON.stringify(jsonReport, null, 2));
    setCopiedJson(taskId);
    setTimeout(() => setCopiedJson(null), 2000);
  };

  const readinessBarColor = (r: number) => {
    if (r >= 70) return "bg-[#2D5A3D]";
    if (r >= 30) return "bg-[#C49A2A]";
    return "bg-[#C8322B]";
  };

  if (loading) return <div className="p-4 text-center text-stone-500 text-sm">Loading development plan...</div>;

  return (
    <div className="space-y-3">
      {/* Project Header */}
      <div className="bg-[rgba(124,58,237,0.08)] border border-[rgba(124,58,237,0.25)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium opacity-80">Ongoing Development</div>
          <div className="flex gap-2">
            <button
              onClick={runTestAll}
              disabled={testAllRunning}
              className="px-3 py-1 bg-[#3B7EA1] hover:bg-[#2d6a8a] disabled:bg-stone-300 text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1"
            >
              {testAllRunning ? <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> Testing...</> : "Test All"}
            </button>
            <button
              onClick={syncPlan}
              disabled={syncing}
              className="px-3 py-1 bg-stone-100 hover:bg-stone-200 disabled:bg-stone-50 text-stone-700 text-xs font-medium rounded-lg transition-colors"
            >
              {syncing ? "Syncing..." : "Sync Plans"}
            </button>
          </div>
        </div>

        {projectStats && (
          <>
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-semibold">{projectStats.project} — {plans.length} plan{plans.length !== 1 ? "s" : ""}</div>
              <div className="text-lg font-bold">{projectStats.readiness}%</div>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div className={`${readinessBarColor(projectStats.readiness)} h-2 rounded-full transition-all`} style={{ width: `${projectStats.readiness}%` }} />
            </div>
            <div className="text-xs opacity-70 mt-1">{projectStats.completedTasks}/{projectStats.totalTasks} tasks complete across {projectStats.planCount || plans.length} plans</div>
          </>
        )}

        {projectStats && projectStats.completedTasks === projectStats.totalTasks && projectStats.totalTasks > 0 && (
          <div className="mt-2 bg-[rgba(45,90,61,0.08)] border border-[rgba(45,90,61,0.25)] rounded-lg p-2 text-center text-sm font-medium">
            ALL PLANS COMPLETE — all {projectStats.totalTasks} tasks verified
          </div>
        )}
      </div>

      {/* Test All Progress */}
      {testAllProgress && (
        <div className="bg-stone-50 rounded-xl p-3 border border-[rgba(214,208,196,0.6)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-stone-600">Test All Results</span>
            <span className="text-xs text-stone-500">{testAllProgress.done}/{testAllProgress.total}</span>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-1.5 mb-2">
            <div className="bg-[#3B7EA1] h-1.5 rounded-full transition-all" style={{ width: `${(testAllProgress.done / Math.max(testAllProgress.total, 1)) * 100}%` }} />
          </div>
          <div className="flex gap-3 text-xs">
            <span className="text-[#2D5A3D]">{testAllProgress.passed} pass</span>
            <span className="text-[#C8322B]">{testAllProgress.failed} fail</span>
            <span className="text-stone-500">{testAllProgress.skipped} skip</span>
          </div>
        </div>
      )}

      {/* Plan-Grouped View */}
      {plans.length > 0 ? plans.map(plan => {
        const isPlanExpanded = expandedPlan === plan.planId;
        return (
          <div key={plan.planId} className="admin-card rounded-xl border border-[rgba(214,208,196,0.6)] overflow-hidden">
            {/* Plan Header */}
            <button
              onClick={() => setExpandedPlan(isPlanExpanded ? null : plan.planId)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-center gap-2 text-left">
                <span className="text-xs text-stone-400">{isPlanExpanded ? "▾" : "▸"}</span>
                <div>
                  <span className="font-semibold text-sm text-stone-900">{plan.planTitle}</span>
                  {plan.project && <span className="text-xs text-stone-400 ml-2">{plan.project}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-stone-500">{plan.completedTasks}/{plan.totalTasks}</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 bg-stone-200 rounded-full h-1.5">
                    <div className={`${readinessBarColor(plan.readiness)} h-1.5 rounded-full transition-all`} style={{ width: `${plan.readiness}%` }} />
                  </div>
                  <span className="text-xs font-medium text-stone-500 w-8 text-right">{plan.readiness}%</span>
                </div>
              </div>
            </button>

            {/* Plan Phases */}
            {isPlanExpanded && (
              <div className="border-t border-stone-100">
                {plan.phases.map(phase => {
                  const isPhaseExp = expandedPhase === `${plan.planId}:${phase.name}`;
                  return (
                    <div key={phase.name} className="border-b border-stone-100 last:border-b-0">
                      {/* Phase Header */}
                      <button
                        onClick={() => setExpandedPhase(isPhaseExp ? null : `${plan.planId}:${phase.name}`)}
                        className="w-full px-6 py-2.5 flex items-center justify-between hover:bg-stone-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-left">
                          <span className="text-xs text-stone-400">{isPhaseExp ? "▾" : "▸"}</span>
                          <span className="font-medium text-sm text-stone-600">{phase.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-stone-500">{phase.done}/{phase.total} done</span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 bg-stone-200 rounded-full h-1.5">
                              <div className={`${readinessBarColor(phase.readiness)} h-1.5 rounded-full transition-all`} style={{ width: `${phase.readiness}%` }} />
                            </div>
                            <span className="text-xs font-medium text-stone-500 w-8 text-right">{phase.readiness}%</span>
                          </div>
                        </div>
                      </button>

                      {/* Phase Tasks */}
                      {isPhaseExp && (
                        <div className="bg-stone-50">
                          {phase.tasks.map((task, idx) => {
                            const meta = (task.metadata || {}) as Record<string, unknown>;
                            const taskReadiness = (meta.readiness as number) || (task.status === "completed" ? 100 : 0);
                            const testType = meta.testType as string;
                            const isTaskExpanded = expandedTask === task.id;
                            const result = testResults[task.id];
                            const lastTestResult = (meta.lastTestResult as TestResult) || result;
                            const isDone = task.status === "completed";
                            const dueDate = meta.dueDate as string || task.dueDate;
                            const isOverdue = dueDate && new Date(dueDate) < new Date() && !isDone;

                            return (
                              <div key={task.id} className="border-b border-stone-100 last:border-b-0">
                                <div className="px-6 py-2.5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <span className="text-xs text-stone-400 font-mono w-4">{idx + 1}</span>
                                      {isDone ? (
                                        <span className="text-[#2D5A3D] text-sm flex-shrink-0">&#10003;</span>
                                      ) : (
                                        <span className="text-stone-400 text-sm flex-shrink-0">&#9675;</span>
                                      )}
                                      <button
                                        onClick={() => setExpandedTask(isTaskExpanded ? null : task.id)}
                                        className="text-sm text-stone-700 truncate text-left hover:text-[#5B21B6] transition-colors"
                                      >
                                        {meta.title as string || task.title}
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                      <div className="w-12 bg-stone-200 rounded-full h-1.5 hidden sm:block">
                                        <div className={`${readinessBarColor(taskReadiness)} h-1.5 rounded-full`} style={{ width: `${taskReadiness}%` }} />
                                      </div>
                                      <span className="text-xs font-medium text-stone-500 w-8 text-right">{taskReadiness}%</span>
                                      {testType && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); runTest(task); }}
                                          disabled={testingTask === task.id}
                                          className="px-2 py-0.5 bg-[#3B7EA1] hover:bg-[#2d6a8a] disabled:bg-stone-300 text-white text-xs rounded transition-colors inline-flex items-center gap-1"
                                        >
                                          {testingTask === task.id ? (
                                            <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                          ) : "Test"}
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {lastTestResult && !isTaskExpanded && (
                                    <div className={`mt-1 text-xs ml-8 ${lastTestResult.success ? "text-[#2D5A3D]" : lastTestResult.success === false ? "text-[#C8322B]" : "text-stone-500"}`}>
                                      {lastTestResult.plainLanguage?.slice(0, 100)}{(lastTestResult.plainLanguage?.length || 0) > 100 ? "..." : ""}
                                      {lastTestResult.timestamp && (
                                        <span className="text-stone-400 ml-2">{new Date(lastTestResult.timestamp).toLocaleString()}</span>
                                      )}
                                    </div>
                                  )}

                                  {isOverdue && (
                                    <div className="mt-1 ml-8 text-xs text-[#C8322B] animate-pulse">
                                      Overdue — due {new Date(dueDate!).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>

                                {isTaskExpanded && (
                                  <div className="px-6 pb-3 space-y-2 bg-stone-50/50">
                                    <p className="text-xs text-stone-500 ml-8">{task.description}</p>
                                    <div className="flex gap-4 text-xs text-stone-400 ml-8 flex-wrap">
                                      {meta.startDate && <span>Started: {new Date(meta.startDate as string).toLocaleDateString()}</span>}
                                      {lastTestResult?.timestamp && <span>Last Test: {new Date(lastTestResult.timestamp).toLocaleString()}</span>}
                                      {dueDate && <span className={isOverdue ? "text-[#C8322B] font-medium" : ""}>Due: {new Date(dueDate).toLocaleDateString()}</span>}
                                    </div>

                                    {(result || lastTestResult) && (() => {
                                      const tr = result || lastTestResult!;
                                      return (
                                        <div className={`ml-8 rounded-lg p-3 border ${tr.success ? "bg-[rgba(45,90,61,0.06)] border-[rgba(45,90,61,0.2)]" : tr.success === false ? "bg-[rgba(200,50,43,0.06)] border-[rgba(200,50,43,0.2)]" : "bg-stone-50 border-stone-200"}`}>
                                          <p className={`text-sm mb-2 ${tr.success ? "text-[#2D5A3D]" : "text-[#C8322B]"}`}>
                                            {tr.plainLanguage}
                                          </p>
                                          {tr.error && (
                                            <div className="bg-[rgba(200,50,43,0.06)] rounded p-2 mb-2 text-xs">
                                              <div className="font-medium text-[#C8322B] mb-1">Error: {tr.error.code}</div>
                                              <div className="text-[#C8322B]">{tr.error.message}</div>
                                              <div className="text-[#C8322B]/80 mt-1">Where: {tr.error.where}</div>
                                              <div className="text-[#C8322B]/80 font-medium mt-1">Fix: {tr.error.howToFix}</div>
                                              {tr.error.envVarsNeeded && (
                                                <div className="mt-1 text-[#C8322B]/80">Env vars needed: {tr.error.envVarsNeeded.join(", ")}</div>
                                              )}
                                            </div>
                                          )}
                                          <div className="relative">
                                            <button
                                              onClick={() => copyJson(task.id, tr, task)}
                                              className="absolute top-1 right-1 px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-xs rounded transition-colors"
                                            >
                                              {copiedJson === task.id ? "Copied!" : "Copy JSON"}
                                            </button>
                                            <pre className="bg-stone-100 text-stone-800 text-xs p-3 rounded overflow-x-auto max-h-48 overflow-y-auto font-mono">
                                              {JSON.stringify(tr.json, null, 2)}
                                            </pre>
                                          </div>
                                          <div className="flex items-center gap-3 mt-2 text-xs text-stone-500">
                                            <span>{tr.durationMs}ms</span>
                                            <span>{new Date(tr.timestamp).toLocaleString()}</span>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }) : phases.length > 0 ? (
        /* Fallback: flat phase list if API returns old format without plans */
        phases.map(phase => {
          const isExpanded = expandedPhase === phase.name;
          return (
            <div key={phase.name} className="admin-card rounded-xl border border-[rgba(214,208,196,0.6)] overflow-hidden">
              <button
                onClick={() => setExpandedPhase(isExpanded ? null : phase.name)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-2 text-left">
                  <span className="text-xs text-stone-400">{isExpanded ? "▾" : "▸"}</span>
                  <span className="font-medium text-sm text-stone-900">{phase.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-stone-500">{phase.done}/{phase.total} done</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 bg-stone-200 rounded-full h-1.5">
                      <div className={`${readinessBarColor(phase.readiness)} h-1.5 rounded-full transition-all`} style={{ width: `${phase.readiness}%` }} />
                    </div>
                    <span className="text-xs font-medium text-stone-500 w-8 text-right">{phase.readiness}%</span>
                  </div>
                </div>
              </button>
            </div>
          );
        })
      ) : null}

      {plans.length === 0 && phases.length === 0 && !loading && (
        <div className="text-center py-6 text-stone-500">
          <p className="text-sm mb-2">No development plans synced yet.</p>
          <button onClick={syncPlan} className="px-4 py-2 bg-[#5B21B6] hover:bg-[#4a1a96] text-white text-sm rounded-lg">
            Sync All Plans
          </button>
        </div>
      )}
    </div>
  );
}

// ── Operational Tasks Section ────────────────────────────────────────────────

function OperationalTasksSection({ siteId }: { siteId: string }) {
  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [statusFilter, setStatusFilter] = useState("");

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams({ siteId: siteId || "all" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/dev-tasks?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      // Filter out dev-plan tasks
      const opTasks = (data.tasks || []).filter((t: DevTask) => t.source !== "dev-plan");
      setTasks(opTasks);
      setSummary(data.summary || null);
    } catch (err) {
      console.warn("[tasks] Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, [siteId, statusFilter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const scanForTasks = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/admin/dev-tasks/auto-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });
      const data = await res.json();
      if (data.created > 0) fetchTasks();
      setActionResults(prev => ({ ...prev, "scan": { success: true, message: data.message || `${data.created} created` } }));
    } catch {
      setActionResults(prev => ({ ...prev, "scan": { success: false, message: "Scan failed" } }));
    } finally {
      setScanning(false);
    }
  };

  const executeAction = async (task: DevTask) => {
    if (!task.actionApi) return;
    setExecutingId(task.id);
    try {
      const res = await fetch(task.actionApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task.actionPayload || {}),
      });
      const data = await res.json().catch(() => ({}));
      setActionResults(prev => ({ ...prev, [task.id]: { success: res.ok, message: data.message || (res.ok ? "Done" : `HTTP ${res.status}`) } }));
      if (res.ok) {
        await fetch("/api/admin/dev-tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete", taskId: task.id }) });
        fetchTasks();
      }
    } catch (err) {
      setActionResults(prev => ({ ...prev, [task.id]: { success: false, message: err instanceof Error ? err.message : "Failed" } }));
    } finally {
      setExecutingId(null);
    }
  };

  const dismissTask = async (taskId: string) => {
    try {
      const res = await fetch("/api/admin/dev-tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "dismiss", taskId }) });
      if (!res.ok) console.warn("[cockpit] dismissTask failed:", res.status);
      fetchTasks();
    } catch (e) {
      console.warn("[cockpit] dismissTask error:", e instanceof Error ? e.message : e);
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      const res = await fetch("/api/admin/dev-tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete", taskId }) });
      if (!res.ok) console.warn("[cockpit] completeTask failed:", res.status);
      fetchTasks();
    } catch (e) {
      console.warn("[cockpit] completeTask error:", e instanceof Error ? e.message : e);
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "critical": return "bg-[rgba(200,50,43,0.08)] text-[#C8322B]";
      case "high": return "bg-[rgba(217,119,6,0.08)] text-[#92400E]";
      case "medium": return "bg-[rgba(59,126,161,0.08)] text-[#1e5a7a]";
      default: return "bg-stone-50 text-stone-500";
    }
  };

  const categoryIcon = (c: string) => {
    switch (c) {
      case "pipeline": return "P";
      case "seo": return "S";
      case "automation": return "A";
      case "config": return "C";
      case "content": return "W";
      default: return "T";
    }
  };

  if (loading) return <div className="p-4 text-center text-stone-500 text-sm">Loading operational tasks...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-600">Operational Tasks</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={scanForTasks}
            disabled={scanning}
            className="px-3 py-1 bg-[#5B21B6] hover:bg-[#5B21B6] disabled:bg-stone-300 text-white font-medium rounded-lg text-xs transition-colors inline-flex items-center gap-1"
          >
            {scanning ? "Scanning..." : "Scan"}
          </button>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2 py-1 rounded-lg border border-[rgba(214,208,196,0.6)] bg-white text-xs"
          >
            <option value="">Open</option>
            <option value="pending">Pending</option>
            <option value="completed">Done</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      {actionResults["scan"] && (
        <span className={`text-xs ${actionResults["scan"].success ? "text-[#2D5A3D]" : "text-[#C8322B]"}`}>
          {actionResults["scan"].message}
        </span>
      )}

      {tasks.length === 0 ? (
        <div className="text-center py-4 text-stone-400 text-xs">No operational tasks. Tap Scan to check.</div>
      ) : (
        <div className="space-y-1.5">
          {tasks.map(task => (
            <div key={task.id} className="bg-white rounded-lg border border-[rgba(214,208,196,0.6)] p-3">
              <div className="flex items-start gap-2">
                <span className="text-xs font-mono text-stone-400 flex-shrink-0 mt-0.5 w-4 text-center">{categoryIcon(task.category)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityColor(task.priority)}`}>{task.priority}</span>
                    <span className="font-medium text-xs text-stone-900 truncate">{task.title}</span>
                  </div>
                  {task.description && <p className="text-[11px] text-stone-500 mb-1 line-clamp-2">{task.description}</p>}
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {task.actionLabel && task.actionApi && (
                      actionResults[task.id] ? (
                        <span className={`text-[10px] px-2 py-0.5 rounded ${actionResults[task.id].success ? "bg-[rgba(45,90,61,0.08)] text-[#2D5A3D]" : "bg-[rgba(200,50,43,0.08)] text-[#C8322B]"}`}>
                          {actionResults[task.id].message}
                        </span>
                      ) : (
                        <button
                          onClick={() => executeAction(task)}
                          disabled={executingId === task.id}
                          className="px-2 py-0.5 bg-[#3B7EA1] hover:bg-[#2d6a8a] disabled:bg-stone-300 text-white text-[10px] rounded transition-colors"
                        >
                          {executingId === task.id ? "..." : task.actionLabel}
                        </button>
                      )
                    )}
                    <button onClick={() => completeTask(task.id)} className="px-1.5 py-0.5 text-[10px] text-[#2D5A3D] hover:bg-[rgba(45,90,61,0.06)] rounded">Done</button>
                    <button onClick={() => dismissTask(task.id)} className="px-1.5 py-0.5 text-[10px] text-stone-400 hover:bg-stone-100 rounded">Dismiss</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Combined Tasks Tab ───────────────────────────────────────────────────────

function TasksTab({ siteId }: { siteId: string }) {
  return (
    <div className="space-y-6 p-1">
      <DevMonitorSection siteId={siteId} />
      <div className="border-t border-[rgba(214,208,196,0.4)] pt-4">
        <OperationalTasksSection siteId={siteId} />
      </div>
    </div>
  );
}

// ─── Root Cockpit Page ────────────────────────────────────────────────────────

const TABS = [
  { id: "mission", label: "🚀 Mission" },
  { id: "content", label: "📋 Content" },
  { id: "pipeline", label: "⚙️ Pipeline" },
  { id: "crons", label: "⏱ Crons" },
  { id: "sites", label: "🌍 Sites" },
  { id: "ai", label: "🤖 AI Config" },
  { id: "settings", label: "🔧 Settings" },
  { id: "tasks", label: "📌 Tasks" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function CockpitPageWrapper() {
  return (
    <Suspense fallback={<div className="admin-page flex items-center justify-center h-screen"><AdminLoadingState label="Loading HQ…" /></div>}>
      <CockpitPage />
    </Suspense>
  );
}

function CockpitPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabId) || "mission";
  const validTab = TABS.some(t => t.id === initialTab) ? initialTab : "mission";
  const [activeTab, setActiveTab] = useState<TabId>(validTab);
  const [cockpitData, setCockpitData] = useState<CockpitData | null>(null);
  const [cockpitLoading, setCockpitLoading] = useState(true);
  const [cockpitError, setCockpitError] = useState<string | null>(null);
  const [activeSiteId, setActiveSiteId] = useState<string>("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCockpit = useCallback(async () => {
    setCockpitError(null);
    try {
      const url = activeSiteId
        ? `/api/admin/cockpit?siteId=${encodeURIComponent(activeSiteId)}`
        : "/api/admin/cockpit";
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      setCockpitData(json);
      setLastRefresh(new Date());
      if (!activeSiteId && json.sites?.length > 0) {
        setActiveSiteId(json.sites[0].id);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.warn("[cockpit] Cockpit fetch failed:", msg);
      setCockpitError(msg);
    } finally {
      setCockpitLoading(false);
    }
  }, [activeSiteId]);

  useEffect(() => {
    fetchCockpit();
    autoRefreshRef.current = setInterval(fetchCockpit, 180_000); // 3 min — reduced from 60s to ease Supabase Disk IO
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [fetchCockpit]);

  const handleSiteSelect = (siteId: string) => {
    setActiveSiteId(siteId);
    setActiveTab("content");
  };

  // When IndexingPanel loads fresh data, push summary back to cockpit
  // so Mission tab numbers stay in sync with panel numbers
  const handleUpdateIndexing = useCallback((summary: { total: number; indexed: number; submitted: number; discovered: number; neverSubmitted: number; errors: number; rate: number }) => {
    setCockpitData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        indexing: {
          ...prev.indexing,
          total: summary.total,
          indexed: summary.indexed,
          submitted: summary.submitted,
          discovered: summary.discovered,
          neverSubmitted: summary.neverSubmitted,
          errors: summary.errors,
          rate: summary.rate,
        },
      };
    });
  }, []);

  return (
    <div className="admin-page min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-md bg-white/92" style={{ borderBottom: '1px solid var(--admin-border, rgba(214,208,196,0.6))' }}>
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: '#1C1917', letterSpacing: '-0.3px' }}>
              HQ
            </h1>
            {cockpitData && activeSiteId && (
              <select
                value={activeSiteId}
                onChange={(e) => setActiveSiteId(e.target.value)}
                className="admin-input rounded-lg px-3 py-1.5 text-xs focus:outline-none appearance-none"
                style={{
                  fontFamily: 'var(--font-system)',
                  fontSize: 10,
                  fontWeight: 500,
                  color: '#78716C',
                }}
              >
                <option value="all">All Sites</option>
                {cockpitData.sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/cockpit/activity"
              className="admin-card px-3 py-2 rounded-lg text-xs font-semibold transition-all active:scale-[0.97]"
              style={{
                fontFamily: 'var(--font-system)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: '#3B7EA1',
              }}
            >
              FEED
            </Link>
            <Link
              href="/admin/cockpit/write"
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all active:scale-[0.97]"
              style={{
                fontFamily: 'var(--font-system)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                backgroundColor: '#C8322B',
                color: '#FAF8F4',
              }}
            >
              + WRITE
            </Link>
            {lastRefresh && (
              <span className="hidden sm:block" style={{ fontFamily: 'var(--font-system)', fontSize: 9, color: '#A8A29E', letterSpacing: '0.5px' }}>
                {timeAgo(lastRefresh.toISOString())}
              </span>
            )}
            <AdminButton
              onClick={fetchCockpit}
              disabled={cockpitLoading}
              variant="secondary"
              size="sm"
            >
              {cockpitLoading ? "..." : "Refresh"}
            </AdminButton>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex overflow-x-auto scrollbar-hide" style={{ borderTop: '1px solid var(--admin-border, rgba(214,208,196,0.4))' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-shrink-0 px-3 sm:px-4 py-2.5 whitespace-nowrap transition-all border-b-2"
              style={{
                fontFamily: 'var(--font-system)',
                fontSize: 10,
                fontWeight: activeTab === tab.id ? 700 : 500,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                color: activeTab === tab.id ? '#C8322B' : '#A8A29E',
                borderBottomColor: activeTab === tab.id ? '#C8322B' : 'transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {cockpitError && (
        <AdminAlertBanner
          severity="critical"
          message={`Dashboard data failed to load: ${cockpitError}`}
          action={<AdminButton onClick={fetchCockpit} variant="danger" size="sm">Retry</AdminButton>}
        />
      )}

      {/* Builder errors — some dashboard sections returned zeros due to DB/timeout issues */}
      {cockpitData?.builderErrors && cockpitData.builderErrors.length > 0 && (
        <AdminAlertBanner
          severity="warning"
          message="Some dashboard sections may show incomplete data"
          detail={cockpitData.builderErrors.join(" | ")}
        />
      )}

      {/* Content */}
      <main className="max-w-screen-xl mx-auto px-3 sm:px-4 py-4 pb-20">
        {activeTab === "mission" && (
          <MissionTab data={cockpitData} onRefresh={fetchCockpit} onSwitchTab={setActiveTab} siteId={activeSiteId} onUpdateIndexing={handleUpdateIndexing} />
        )}
        {activeTab === "content" && (
          <ContentTab activeSiteId={activeSiteId} />
        )}
        {activeTab === "pipeline" && (
          <PipelineTab activeSiteId={activeSiteId} />
        )}
        {activeTab === "crons" && (
          <CronsTab />
        )}
        {activeTab === "sites" && cockpitData && (
          <SitesTab sites={cockpitData.sites} onSelectSite={handleSiteSelect} onRefresh={fetchCockpit} />
        )}
        {activeTab === "ai" && (
          <AIConfigTab />
        )}
        {activeTab === "settings" && (
          <SettingsTab system={cockpitData?.system ?? null} />
        )}
        {activeTab === "tasks" && (
          <TasksTab siteId={activeSiteId} />
        )}
      </main>
    </div>
  );
}
