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

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

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
  alerts: Alert[];
  sites: SiteSummary[];
  timestamp: string;
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
  if (score === null) return "text-zinc-500";
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

function statusBadge(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    published: { label: "✅ Published", color: "bg-emerald-900/50 text-emerald-300 border-emerald-700" },
    reservoir: { label: "📦 Ready", color: "bg-blue-900/50 text-blue-300 border-blue-700" },
    scoring: { label: "🔢 Scoring", color: "bg-purple-900/50 text-purple-300 border-purple-700" },
    seo: { label: "🔍 SEO Check", color: "bg-purple-900/50 text-purple-300 border-purple-700" },
    assembly: { label: "🔧 Assembling", color: "bg-amber-900/50 text-amber-300 border-amber-700" },
    drafting: { label: "✍️ Drafting", color: "bg-amber-900/50 text-amber-300 border-amber-700" },
    outline: { label: "📐 Outlining", color: "bg-amber-900/50 text-amber-300 border-amber-700" },
    research: { label: "🔬 Research", color: "bg-amber-900/50 text-amber-300 border-amber-700" },
    images: { label: "🖼 Images", color: "bg-amber-900/50 text-amber-300 border-amber-700" },
    rejected: { label: "❌ Rejected", color: "bg-red-900/50 text-red-300 border-red-700" },
    stuck: { label: "⚠️ Stuck", color: "bg-orange-900/50 text-orange-300 border-orange-700" },
  };
  return map[status] ?? { label: status, color: "bg-zinc-800 text-zinc-300 border-zinc-600" };
}

// ─── Shared components ────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">{children}</h3>;
}

function StatusDot({ ok, title }: { ok: boolean; title: string }) {
  return (
    <span title={title} className={`inline-block w-2 h-2 rounded-full ${ok ? "bg-emerald-400" : "bg-red-500"}`} />
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
  const variants = {
    default: "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700",
    danger: "bg-red-900/40 hover:bg-red-900/70 text-red-300 border-red-800",
    success: "bg-emerald-900/40 hover:bg-emerald-900/70 text-emerald-300 border-emerald-800",
    amber: "bg-amber-900/40 hover:bg-amber-900/70 text-amber-300 border-amber-800",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {loading ? "⏳ …" : children}
    </button>
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
    indexed: "text-emerald-400 bg-emerald-950/40 border-emerald-800",
    submitted: "text-blue-400 bg-blue-950/40 border-blue-800",
    not_indexed: "text-amber-400 bg-amber-950/40 border-amber-800",
    error: "text-red-400 bg-red-950/40 border-red-800",
    never_submitted: "text-zinc-400 bg-zinc-800/60 border-zinc-700",
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
    healthy: "border-emerald-700 bg-emerald-950/30",
    warning: "border-amber-700 bg-amber-950/30",
    critical: "border-red-700 bg-red-950/30",
    not_started: "border-zinc-700 bg-zinc-800/30",
  } as const;

  const filtered = (data?.articles ?? []).filter((a) => {
    if (statusFilter === "all") return true;
    return a.indexingStatus === statusFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950" role="dialog" aria-label="Indexing Status">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold text-white">🔍 Indexing Status</h2>
          <p className="text-xs text-zinc-500">{siteId} — all published articles</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs disabled:opacity-50"
            title="Refresh"
          >
            {loading ? "⏳" : "↻"}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
          >
            ✕ Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-screen-xl mx-auto w-full">
        {loading && !data && (
          <div className="flex items-center justify-center h-48">
            <p className="text-zinc-500 text-sm">Loading indexing data…</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            ⚠️ {error}
            <button onClick={fetchData} className="ml-3 underline text-xs">Retry</button>
          </div>
        )}

        {data && (
          <>
            {/* Health Diagnosis */}
            <div className={`rounded-xl border px-4 py-3 ${healthColor[data.healthDiagnosis.status as keyof typeof healthColor] || healthColor.not_started}`}>
              <div className="font-semibold text-sm text-zinc-100">{data.healthDiagnosis.message}</div>
              <div className="text-xs text-zinc-400 mt-1">{data.healthDiagnosis.detail}</div>
              {typeof data.healthDiagnosis.indexingRate === "number" && data.healthDiagnosis.indexingRate > 0 && (
                <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${data.healthDiagnosis.indexingRate}%` }}
                  />
                </div>
              )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                ["Total", data.summary.total, "text-zinc-300", "all"],
                ["Indexed", data.summary.indexed, "text-emerald-400", "indexed"],
                ["Submitted", data.summary.submitted, "text-blue-400", "submitted"],
                ["Discovered", data.summary.discovered ?? 0, "text-amber-400", "discovered"],
                ["Untracked", data.summary.neverSubmitted, "text-zinc-400", "never_submitted"],
                ["Errors", data.summary.errors, "text-red-400", "error"],
              ].map(([label, val, color, filter]) => (
                <button
                  key={label as string}
                  onClick={() => setStatusFilter(filter as string)}
                  className={`rounded-xl border text-center py-2.5 px-1 transition-colors ${
                    statusFilter === filter
                      ? "border-zinc-500 bg-zinc-800"
                      : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/60"
                  }`}
                >
                  <div className={`text-lg font-bold ${color}`}>{val}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{label}</div>
                </button>
              ))}
            </div>

            {/* Config warnings */}
            {(!data.config.hasIndexNowKey || !data.config.hasGscCredentials) && (
              <div className="rounded-xl border border-amber-700 bg-amber-950/20 px-4 py-3 text-xs space-y-1">
                <p className="font-semibold text-amber-300">⚠️ Indexing Not Fully Configured</p>
                {!data.config.hasIndexNowKey && <p className="text-amber-400/80">INDEXNOW_KEY not set — cannot submit to Bing/Yandex</p>}
                {!data.config.hasGscCredentials && <p className="text-amber-400/80">Google Search Console credentials not configured</p>}
                <p className="text-zinc-500">Add missing keys in Vercel Dashboard → Settings → Environment Variables</p>
              </div>
            )}

            {/* Primary action: Sync with Google to get real indexed count */}
            <button
              onClick={syncWithGoogle}
              disabled={submitLoading === "gsc-sync"}
              className="w-full px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold disabled:opacity-50 transition-colors"
            >
              {submitLoading === "gsc-sync" ? "⏳ Syncing with Google Search Console…" : "📡 Sync with Google — Get Real Indexed Count"}
            </button>

            {/* Secondary action row */}
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={submitAll}
                disabled={submitLoading === "all"}
                className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold disabled:opacity-50"
              >
                {submitLoading === "all" ? "⏳ Submitting…" : "📤 Submit All Unsubmitted"}
              </button>
              <button
                onClick={resubmitStuck}
                disabled={submitLoading === "resubmit-stuck"}
                className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-xs font-semibold disabled:opacity-50"
              >
                {submitLoading === "resubmit-stuck" ? "⏳ Resubmitting…" : "🔄 Resubmit All Stuck"}
              </button>
            </div>
            {submitResult && (
              <div className={`text-xs px-3 py-2 rounded-xl ${submitResult.startsWith("✅") ? "bg-emerald-950/30 text-emerald-300 border border-emerald-800" : submitResult.startsWith("⚠️") ? "bg-amber-950/30 text-amber-300 border border-amber-800" : "bg-red-950/30 text-red-300 border border-red-800"}`}>
                {submitResult}
              </div>
            )}

            {/* Article List */}
            <div className="space-y-2">
              {filtered.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 py-8 text-center">
                  <p className="text-zinc-500 text-sm">No articles match this filter.</p>
                </div>
              ) : (
                filtered.map((article) => {
                  const isExpanded = expanded === article.id;
                  const statusCls = statusColor[article.indexingStatus] || statusColor.never_submitted;
                  const statusLbl = statusLabel[article.indexingStatus] || article.indexingStatus;
                  return (
                    <div key={article.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                      {/* Row */}
                      <div className="px-3 py-2.5 flex flex-col gap-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-zinc-100 truncate">{article.title}</p>
                            <p className="text-[10px] text-zinc-500 truncate mt-0.5">/blog/{article.slug}</p>
                          </div>
                          <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusCls}`}>
                            {statusLbl}
                          </span>
                        </div>

                        {/* Metrics row */}
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-zinc-500">
                          {article.publishedAt && (
                            <span>📅 Published: {new Date(article.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                          )}
                          {article.lastCrawledAt && (
                            <span>🕷 Crawled: {new Date(article.lastCrawledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                          )}
                          {article.submittedAt && (
                            <span>📤 Submitted: {new Date(article.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                          )}
                          <span className={article.wordCount < 300 ? "text-red-400" : article.wordCount < 800 ? "text-amber-400" : "text-zinc-500"}>
                            📝 {article.wordCount.toLocaleString()} words
                          </span>
                          {article.seoScore > 0 && (
                            <span className={article.seoScore >= 70 ? "text-emerald-400" : article.seoScore >= 50 ? "text-amber-400" : "text-red-400"}>
                              SEO: {article.seoScore}/100
                            </span>
                          )}
                          {/* GSC performance */}
                          {article.gscImpressions !== null ? (
                            <span className="text-purple-400">👁 {article.gscImpressions.toLocaleString()} impressions</span>
                          ) : (
                            <span className="text-zinc-600">👁 — impressions</span>
                          )}
                          {article.gscClicks !== null ? (
                            <span className="text-cyan-400">🖱 {article.gscClicks.toLocaleString()} clicks</span>
                          ) : (
                            <span className="text-zinc-600">🖱 — clicks</span>
                          )}
                          {article.gscPosition !== null && (
                            <span className="text-zinc-400">Pos: #{Math.round(article.gscPosition)}</span>
                          )}
                        </div>

                        {/* Issues + expand */}
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <div className="flex-1 min-w-0">
                            {article.notIndexedReasons.length > 0 && !isExpanded && (
                              <p className="text-[10px] text-amber-400/80 truncate">
                                ⚠️ {article.notIndexedReasons[0]}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {article.indexingStatus !== "indexed" && (
                              <button
                                onClick={() => submitArticle(article.slug)}
                                disabled={submitLoading === article.slug}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-blue-900/40 hover:bg-blue-900/70 text-blue-300 border border-blue-800 disabled:opacity-50"
                              >
                                {submitLoading === article.slug ? "⏳" : "Submit"}
                              </button>
                            )}
                            <button
                              onClick={() => verifyUrl(article.url)}
                              disabled={submitLoading === `verify-${article.url}`}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-purple-900/40 hover:bg-purple-900/70 text-purple-300 border border-purple-800 disabled:opacity-50"
                            >
                              {submitLoading === `verify-${article.url}` ? "⏳" : "Check"}
                            </button>
                            {(article.notIndexedReasons.length > 0 || article.coverageState) && (
                              <button
                                onClick={() => setExpanded(isExpanded ? null : article.id)}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
                              >
                                {isExpanded ? "▲ Hide" : "▼ Issues"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expanded reasons */}
                        {isExpanded && (
                          <div className="mt-2 pt-2 border-t border-zinc-800 space-y-1.5">
                            {article.coverageState && (
                              <p className="text-[10px] text-zinc-400 bg-zinc-800/60 rounded px-2 py-1">
                                <span className="font-medium text-zinc-300">Google coverage: </span>{article.coverageState}
                              </p>
                            )}
                            {article.notIndexedReasons.map((reason, i) => (
                              <p key={i} className="text-[10px] text-amber-400/90 bg-amber-950/20 rounded px-2 py-1">
                                • {reason}
                              </p>
                            ))}
                            <div className="flex gap-3 text-[10px] text-zinc-500 pt-1">
                              <span>IndexNow: {article.submittedIndexnow ? "✅" : "❌"}</span>
                              <span>Sitemap: {article.submittedSitemap ? "✅" : "❌"}</span>
                              <span>Attempts: {article.submissionAttempts}</span>
                            </div>
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
                <p className="text-xs font-semibold text-zinc-400">System Issues</p>
                {data.systemIssues.map((issue, i) => (
                  <div key={i} className={`rounded-xl border px-3 py-2 text-xs ${
                    issue.severity === "critical" ? "border-red-800 bg-red-950/20 text-red-300" :
                    issue.severity === "warning" ? "border-amber-800 bg-amber-950/20 text-amber-300" :
                    "border-zinc-700 bg-zinc-800/30 text-zinc-400"
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
        setActionResult(`✅ Published ${json.published.length} articles. Skipped ${json.skipped?.length ?? 0}.`);
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
        <p className="text-zinc-500 text-sm">Loading mission control…</p>
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
          <div className="flex items-center gap-2 text-sm">
            <StatusDot ok={system.db.connected} title={system.db.error ?? "DB connected"} />
            <span className="text-zinc-300">Database</span>
            {system.db.latencyMs > 0 && <span className="text-zinc-500 text-xs">{system.db.latencyMs}ms</span>}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <StatusDot ok={system.ai.configured} title={system.ai.activeProviders.join(", ") || "No AI key"} />
            <span className="text-zinc-300">AI</span>
            {system.ai.activeProviders.length > 0 ? (
              <span className="text-zinc-500 text-xs">{system.ai.activeProviders.join(", ")}</span>
            ) : (
              <span className="text-red-400 text-xs font-medium">No keys configured</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <StatusDot ok={system.indexNow.configured} title="IndexNow" />
            <span className="text-zinc-300">IndexNow</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <StatusDot ok={system.gsc.configured} title="Google Search Console" />
            <span className="text-zinc-300">GSC</span>
          </div>
        </div>
        {!system.db.connected && system.db.error && (
          <p className="mt-2 text-xs text-red-400">{system.db.error}</p>
        )}
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Card key={alert.code} className={`border-l-4 ${
              alert.severity === "critical" ? "border-l-red-500 bg-red-950/20" :
              alert.severity === "warning" ? "border-l-amber-500 bg-amber-950/20" :
              "border-l-blue-500 bg-blue-950/20"
            }`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`font-medium text-sm ${
                    alert.severity === "critical" ? "text-red-300" :
                    alert.severity === "warning" ? "text-amber-300" : "text-blue-300"
                  }`}>{alert.message}</p>
                  <p className="text-zinc-400 text-xs mt-0.5">{alert.detail}</p>
                  <p className="text-zinc-500 text-xs mt-1">Fix: {alert.fix}</p>
                </div>
                {alert.action && (
                  <ActionButton
                    onClick={() => triggerAction(alert.action!, {}, alert.code)}
                    loading={actionLoading === alert.code}
                    variant={alert.severity === "critical" ? "danger" : "amber"}
                  >
                    Fix →
                  </ActionButton>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pipeline Flow — each counter is a tap target that jumps to the relevant tab */}
      <Card>
        <SectionTitle>Pipeline</SectionTitle>
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <button onClick={() => onSwitchTab("pipeline")} className="bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-2 text-center min-w-[70px] transition-colors cursor-pointer">
            <div className="text-lg font-bold text-blue-400">{pipeline.topicsReady}</div>
            <div className="text-xs text-zinc-500">Topics</div>
          </button>
          <span className="text-zinc-600">→</span>
          <button onClick={() => onSwitchTab("pipeline")} className="bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-2 text-center min-w-[70px] transition-colors cursor-pointer">
            <div className="text-lg font-bold text-amber-400">{pipeline.draftsActive}</div>
            <div className="text-xs text-zinc-500">Building</div>
          </button>
          <span className="text-zinc-600">→</span>
          <button onClick={() => onSwitchTab("content")} className="bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-2 text-center min-w-[70px] transition-colors cursor-pointer">
            <div className="text-lg font-bold text-blue-400">{pipeline.reservoir}</div>
            <div className="text-xs text-zinc-500">Reservoir</div>
          </button>
          <span className="text-zinc-600">→</span>
          <button onClick={() => onSwitchTab("content")} className="bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-2 text-center min-w-[70px] transition-colors cursor-pointer">
            <div className="text-lg font-bold text-emerald-400">{pipeline.publishedTotal}</div>
            <div className="text-xs text-zinc-500">Live</div>
          </button>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-xs text-center">
          {Object.entries(pipeline.byPhase).map(([phase, count]) => (
            <div key={phase} className="bg-zinc-800/60 rounded px-2 py-1">
              <div className="font-semibold text-zinc-300">{count}</div>
              <div className="text-zinc-600 capitalize">{phase}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Today's stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <div className="text-2xl font-bold text-emerald-400">{pipeline.publishedToday}</div>
          <div className="text-xs text-zinc-500 mt-1">Published Today</div>
        </Card>
        <button
          onClick={() => setShowIndexPanel(true)}
          className="rounded-xl border border-zinc-800 bg-zinc-900 text-center p-3 hover:bg-zinc-800 hover:border-blue-700 transition-colors group w-full"
          title="View indexing status for all articles"
        >
          <div className="text-2xl font-bold text-blue-400">{indexing.indexed}</div>
          <div className="text-xs text-zinc-500 mt-1 group-hover:text-blue-400 transition-colors">Indexed 🔍</div>
        </button>
        <Card className="text-center">
          <div className={`text-2xl font-bold ${cronHealth.failedLast24h > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {cronHealth.failedLast24h > 0 ? `${cronHealth.failedLast24h} ❌` : "OK ✅"}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Cron Status</div>
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
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-zinc-800/50 rounded-lg p-2">
            <div className={`text-lg font-bold ${indexing.rate >= 80 ? "text-emerald-400" : indexing.rate >= 50 ? "text-amber-400" : "text-red-400"}`}>
              {indexing.rate}%
            </div>
            <div className="text-zinc-500 text-[10px]">Indexed</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-2">
            <div className={`text-lg font-bold ${(indexing.velocity7d ?? 0) > 0 ? "text-blue-400" : "text-zinc-500"}`}>
              {indexing.velocity7d ?? 0}
              {typeof indexing.velocity7dPrevious === "number" && (indexing.velocity7d ?? 0) !== indexing.velocity7dPrevious && (
                <span className={`text-[10px] ml-1 ${(indexing.velocity7d ?? 0) > indexing.velocity7dPrevious ? "text-emerald-400" : "text-red-400"}`}>
                  {(indexing.velocity7d ?? 0) > indexing.velocity7dPrevious ? "▲" : "▼"} was {indexing.velocity7dPrevious}
                </span>
              )}
            </div>
            <div className="text-zinc-500 text-[10px]">This Week</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-2">
            <div className={`text-lg font-bold ${indexing.submitted > 0 ? "text-purple-400" : "text-zinc-600"}`}>
              {indexing.submitted}
            </div>
            <div className="text-zinc-500 text-[10px]">Pending</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-2">
            <div className={`text-lg font-bold ${indexing.errors > 0 ? "text-red-400" : "text-emerald-400"}`}>
              {indexing.errors > 0 ? indexing.errors : "0"}
            </div>
            <div className="text-zinc-500 text-[10px]">Errors</div>
          </div>
        </div>

        {/* Progress bar — all segments sum to indexing.total (single source of truth) */}
        {indexing.total > 0 && (
          <div className="mt-2">
            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden flex">
              {indexing.indexed > 0 && (
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(indexing.indexed / indexing.total) * 100}%` }} title={`${indexing.indexed} indexed`} />
              )}
              {indexing.submitted > 0 && (
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${(indexing.submitted / indexing.total) * 100}%` }} title={`${indexing.submitted} submitted`} />
              )}
              {(indexing.discovered ?? 0) > 0 && (
                <div className="h-full bg-amber-600 transition-all" style={{ width: `${((indexing.discovered ?? 0) / indexing.total) * 100}%` }} title={`${indexing.discovered} discovered`} />
              )}
              {indexing.errors > 0 && (
                <div className="h-full bg-red-500 transition-all" style={{ width: `${(indexing.errors / indexing.total) * 100}%` }} title={`${indexing.errors} errors`} />
              )}
              {(indexing.neverSubmitted ?? 0) > 0 && (
                <div className="h-full bg-zinc-600 transition-all" style={{ width: `${((indexing.neverSubmitted ?? 0) / indexing.total) * 100}%` }} title={`${indexing.neverSubmitted} never submitted`} />
              )}
            </div>
            <div className="flex justify-between mt-1 text-[9px] text-zinc-600">
              <span>{indexing.indexed} indexed</span>
              <span>{indexing.submitted} pending</span>
              <span>{indexing.discovered ?? 0} discovered</span>
              <span>{indexing.neverSubmitted ?? 0} untracked</span>
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
                className="mt-2 w-full text-xs bg-amber-700/30 hover:bg-amber-700/50 text-amber-300 border border-amber-700/50 rounded py-1.5 px-3 transition-colors"
              >
                Submit {indexing.discovered} discovered article{indexing.discovered === 1 ? "" : "s"} to Google
              </button>
            )}
            {indexing.dataSource === "lightweight" && (
              <div className="mt-1 text-[9px] text-zinc-600 italic">Numbers are approximate (blog posts only). Full count includes static pages.</div>
            )}
          </div>
        )}

        {/* Impression Drop Diagnostic — only shown when impressions are falling */}
        {indexing.impressionDiagnostic && (
          <div className="mt-3 bg-amber-950/20 border border-amber-800/50 rounded-lg p-3">
            <div className="text-xs font-semibold text-amber-300 mb-2">Why impressions are dropping</div>
            <div className="space-y-1.5 text-[11px] text-zinc-300">
              {indexing.impressionDiagnostic.gscDelayNote && (
                <div className="flex items-start gap-1.5">
                  <span className="text-amber-400 mt-0.5 shrink-0">!</span>
                  <span>{indexing.impressionDiagnostic.gscDelayNote}</span>
                </div>
              )}
              <div className="flex items-start gap-1.5">
                <span className="text-blue-400 mt-0.5 shrink-0">#</span>
                <span>Publishing velocity: {indexing.impressionDiagnostic.publishVelocity.thisWeek} this week vs {indexing.impressionDiagnostic.publishVelocity.lastWeek} last week</span>
              </div>
              {indexing.impressionDiagnostic.blockedByGate > 0 && (
                <div className="flex items-start gap-1.5">
                  <span className="text-red-400 mt-0.5 shrink-0">X</span>
                  <span>{indexing.impressionDiagnostic.blockedByGate} article(s) stuck in reservoir — quality score below 70</span>
                </div>
              )}
              {indexing.impressionDiagnostic.topDroppers.length > 0 && (
                <div className="mt-1.5">
                  <div className="text-[10px] text-zinc-500 mb-1">Top impression losers:</div>
                  {indexing.impressionDiagnostic.topDroppers.map((d, i) => (
                    <div key={i} className="flex justify-between text-[10px] py-0.5">
                      <span className="text-zinc-400 truncate mr-2">{d.url.replace(/^https?:\/\/[^/]+/, "")}</span>
                      <span className="text-red-400 shrink-0">{d.impressionsDelta}</span>
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
                    ? "bg-red-950/30 text-red-300 border border-red-900/50"
                    : blocker.severity === "warning"
                    ? "bg-amber-950/20 text-amber-300 border border-amber-900/40"
                    : "bg-zinc-800/40 text-zinc-400 border border-zinc-700/50"
                }`}
              >
                {blocker.severity === "critical" ? "🚨" : "⚠️"} {blocker.reason}
              </div>
            ))}
          </div>
        )}

        {/* Meta line */}
        <div className="mt-2 flex flex-wrap gap-x-3 text-[10px] text-zinc-600">
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
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">GSC Performance (7d)</div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-zinc-800/50 rounded-lg p-2">
                <div className="text-lg font-bold text-cyan-400">
                  {indexing.gscTotalClicks7d.toLocaleString()}
                  {indexing.gscClicksTrend != null && (
                    <span className={`text-[10px] ml-1 ${indexing.gscClicksTrend > 0 ? "text-emerald-400" : indexing.gscClicksTrend < 0 ? "text-red-400" : "text-zinc-500"}`}>
                      {indexing.gscClicksTrend > 0 ? "▲" : indexing.gscClicksTrend < 0 ? "▼" : "—"}{Math.abs(indexing.gscClicksTrend)}%
                    </span>
                  )}
                </div>
                <div className="text-zinc-500 text-[10px]">Clicks</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-2">
                <div className="text-lg font-bold text-violet-400">
                  {indexing.gscTotalImpressions7d.toLocaleString()}
                  {indexing.gscImpressionsTrend != null && (
                    <span className={`text-[10px] ml-1 ${indexing.gscImpressionsTrend > 0 ? "text-emerald-400" : indexing.gscImpressionsTrend < 0 ? "text-red-400" : "text-zinc-500"}`}>
                      {indexing.gscImpressionsTrend > 0 ? "▲" : indexing.gscImpressionsTrend < 0 ? "▼" : "—"}{Math.abs(indexing.gscImpressionsTrend)}%
                    </span>
                  )}
                </div>
                <div className="text-zinc-500 text-[10px]">Impressions</div>
              </div>
            </div>
            {indexing.lastGscSync && (
              <div className="mt-1 text-[9px] text-zinc-600 text-center">Last GSC sync: {indexing.lastGscSync}</div>
            )}
          </div>
        )}

        {/* Tap to see full details */}
        <button
          onClick={() => setShowIndexPanel(true)}
          className="mt-2 w-full text-center text-[10px] text-blue-400 hover:text-blue-300 py-1"
        >
          Tap for full indexing details →
        </button>
      </Card>

      {/* Revenue & Costs */}
      {data?.revenue && (
        <Card>
          <SectionTitle>Revenue & Costs (7d)</SectionTitle>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-zinc-800/50 rounded-lg p-2">
              <div className="text-lg font-bold text-amber-400">{data.revenue.affiliateClicksToday}</div>
              <div className="text-[10px] text-zinc-500">Clicks Today</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-2">
              <div className="text-lg font-bold text-emerald-400">{data.revenue.conversionsWeek}</div>
              <div className="text-[10px] text-zinc-500">Conversions</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-2">
              <div className="text-lg font-bold text-emerald-300">${data.revenue.revenueWeekUsd.toFixed(2)}</div>
              <div className="text-[10px] text-zinc-500">Commission</div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
            <span>{data.revenue.affiliateClicksWeek} clicks this week{data.revenue.topPartner ? ` · Top: ${data.revenue.topPartner}` : ""}</span>
            <span className="text-red-400">AI: ${data.revenue.aiCostWeekUsd.toFixed(2)}</span>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <SectionTitle>Quick Actions</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton
            onClick={() => triggerAction("/api/admin/launch-sequence", {}, "Launch")}
            loading={actionLoading === "Launch"}
            variant="success"
            className="col-span-2 py-3 text-sm font-bold"
          >
            {actionLoading === "Launch" ? "Publishing all ready articles..." : "🚀 LAUNCH — Publish Everything Ready"}
          </ActionButton>
          <ActionButton onClick={() => triggerAction("/api/cron/weekly-topics", {}, "Topics")} loading={actionLoading === "Topics"}>
            🔬 Generate Topics
          </ActionButton>
          <ActionButton onClick={() => triggerAction("/api/cron/content-builder", {}, "Content")} loading={actionLoading === "Content"}>
            ✍️ Build Content
          </ActionButton>
          <ActionButton onClick={() => triggerAction("/api/admin/force-publish", { locale: "both", count: 2 }, "Publish")} loading={actionLoading === "Publish"} variant="success">
            📤 Force Publish (2)
          </ActionButton>
          <ActionButton onClick={() => triggerAction("/api/cron/seo-agent", {}, "SEO")} loading={actionLoading === "SEO"}>
            🔍 Submit to Google
          </ActionButton>
          <ActionButton onClick={() => triggerAction("/api/cron/gsc-sync", {}, "GSC Sync")} loading={actionLoading === "GSC Sync"}>
            📡 Sync GSC Data
          </ActionButton>
          <Link href="/admin/cockpit/validator" className="col-span-2 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-center block">
            🩺 System Validator
          </Link>
        </div>
        {actionResult && (
          <p className={`mt-3 text-xs p-2 rounded-lg ${actionResult.startsWith("✅") ? "bg-emerald-950/30 text-emerald-300" : "bg-red-950/30 text-red-300"}`}>
            {actionResult}
          </p>
        )}
      </Card>

      {/* Recent cron activity */}
      <Card>
        <SectionTitle>Recent Activity</SectionTitle>
        <div className="space-y-2">
          {cronHealth.recentJobs.slice(0, 6).map((job, i) => (
            <div key={i} className="flex items-start justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className={job.status === "success" ? "text-emerald-400" : job.status === "failed" ? "text-red-400" : "text-amber-400"}>
                  {job.status === "success" ? "✅" : job.status === "failed" ? "❌" : "⏱"}
                </span>
                <span className="text-zinc-300 truncate">{job.name}</span>
                {job.itemsProcessed > 0 && <span className="text-zinc-500">{job.itemsProcessed} items</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-zinc-500">{formatDuration(job.durationMs)}</span>
                <span className="text-zinc-600">{timeAgo(job.startedAt)}</span>
              </div>
            </div>
          ))}
          {cronHealth.recentJobs.length === 0 && (
            <p className="text-zinc-500 text-xs text-center py-4">No cron runs in last 24h</p>
          )}
        </div>
      </Card>

      {/* Stuck drafts */}
      {pipeline.stuckDrafts.length > 0 && (
        <Card className="border-orange-900/40">
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
                  <span className="text-zinc-300 font-medium">&quot;{d.keyword}&quot;</span>
                  <span className="text-orange-400">{d.hoursStuck}h in {d.phase}</span>
                </div>
                {d.plainError && <p className="text-zinc-500 mt-0.5">{d.plainError}</p>}
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
      // Store error as a visible gate check item so user sees what went wrong
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

  if (loading) return <div className="flex items-center justify-center h-48"><p className="text-zinc-500 text-sm">Loading content…</p></div>;

  if (fetchError) return (
    <Card className="text-center py-8 space-y-2">
      <p className="text-red-400 text-sm">⚠️ Failed to load articles: {fetchError}</p>
      <button onClick={fetchData} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs">Retry</button>
    </Card>
  );

  const indexColor = (s: string | null) => {
    if (!s) return "text-zinc-500";
    if (s === "indexed") return "text-emerald-400";
    if (s === "submitted") return "text-blue-400";
    if (s === "error") return "text-red-400";
    return "text-zinc-400";
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

  return (
    <div className="space-y-4">
      {/* Summary */}
      {data && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            ["Total", data.summary.total, "text-zinc-300"],
            ["Published", data.summary.published, "text-emerald-400"],
            ["Reservoir", data.summary.reservoir, "text-blue-400"],
            ["Pipeline", data.summary.inPipeline, "text-amber-400"],
            ["Rejected", data.summary.rejected, "text-red-400"],
            ["Stuck", data.summary.stuck, "text-orange-400"],
          ].map(([label, val, color]) => (
            <Card key={label as string} className="text-center py-3">
              <div className={`text-xl font-bold ${color}`}>{val}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Filters + Search */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search articles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[150px] bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
        />
        {["all", "published", "draft", "reservoir", "rejected", "stuck"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
              filter === f ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Content table */}
      {filtered.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-zinc-500 text-sm">No articles match the current filter.</p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                  <th className="px-3 py-2.5 font-medium min-w-[200px]">Page</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap">Created</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap">Published</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap">Crawled</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap">Google Status</th>
                  <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Impr.</th>
                  <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Clicks</th>
                  <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">SEO</th>
                  <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">Words</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const badge = statusBadge(item.status);
                  const isExpanded = expandedId === item.id;
                  const checks = gateResults[item.id];

                  return (
                    <tr key={item.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors group">
                      {/* Page name */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`inline-block px-1.5 py-0.5 rounded-full border text-[10px] font-medium leading-none ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-zinc-100 font-medium truncate max-w-[280px]" title={item.title}>
                          {item.title || item.slug || item.id}
                        </p>
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate block max-w-[280px] text-[10px]">
                            {item.url}
                          </a>
                        )}
                        {/* Inline error */}
                        {item.plainError && (
                          <p className="text-red-400 mt-0.5 truncate max-w-[280px]" title={item.plainError}>{item.plainError}</p>
                        )}
                        {/* Action result */}
                        {actionResult[item.id] && (
                          <p className={`mt-0.5 ${actionResult[item.id].startsWith("✅") ? "text-emerald-300" : "text-red-300"}`}>
                            {actionResult[item.id]}
                          </p>
                        )}
                        {/* Expanded gate check panel */}
                        {isExpanded && (
                          <div className="mt-2 border-t border-zinc-800 pt-2">
                            <p className="font-semibold text-zinc-400 mb-1.5">Why Isn{"'"}t This Published?</p>
                            {gateLoading === item.id && <p className="text-zinc-500">Running gate checks…</p>}
                            {checks && (
                              <div className="space-y-1">
                                {checks.map((c) => (
                                  <div key={c.check} className={`flex items-start gap-1.5 rounded p-1 ${c.pass ? "bg-zinc-800/30" : c.isBlocker ? "bg-red-950/20" : "bg-amber-950/20"}`}>
                                    <span className="shrink-0">{c.pass ? "✅" : c.isBlocker ? "❌" : "⚠️"}</span>
                                    <div>
                                      <span className={c.pass ? "text-zinc-400" : c.isBlocker ? "text-red-300" : "text-amber-300"}>{c.label}</span>
                                      {!c.pass && c.detail && <p className="text-zinc-500 mt-0.5">{c.detail}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {!checks && !gateLoading && (
                              <button onClick={() => runGateCheck(item)} className="text-blue-400 hover:underline">Run gate check</button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Created */}
                      <td className="px-3 py-2.5 text-zinc-400 whitespace-nowrap">{shortDate(item.generatedAt)}</td>

                      {/* Published */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {item.publishedAt ? (
                          <span className="text-emerald-400">{shortDate(item.publishedAt)}</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Crawled */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {item.lastCrawledAt ? (
                          <span className="text-zinc-400">{shortDate(item.lastCrawledAt)}</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Google Status */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`font-medium ${indexColor(item.indexingStatus)}`}>
                          {indexLabel(item)}
                        </span>
                        {item.coverageState && item.indexingStatus !== "indexed" && (
                          <p className="text-zinc-500 text-[10px] mt-0.5 max-w-[120px] truncate" title={item.coverageState}>
                            {item.coverageState}
                          </p>
                        )}
                      </td>

                      {/* Impressions */}
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        {item.gscImpressions !== null ? (
                          <span className="text-zinc-300">{item.gscImpressions.toLocaleString()}</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Clicks */}
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        {item.gscClicks !== null ? (
                          <span className={item.gscClicks > 0 ? "text-emerald-400 font-medium" : "text-zinc-300"}>{item.gscClicks.toLocaleString()}</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      {/* SEO Score */}
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        {item.seoScore !== null ? (
                          <span className={scoreColor(item.seoScore)}>{item.seoScore}</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Word Count */}
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <span className={item.wordCount < 1000 ? "text-red-400" : item.wordCount < 1200 ? "text-amber-400" : "text-zinc-400"}>
                          {item.wordCount > 0 ? item.wordCount.toLocaleString() : "—"}
                        </span>
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
                                className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 whitespace-nowrap"
                              >
                                {isExpanded ? "Hide" : "Why?"}
                              </button>
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
                            </>
                          )}
                          {item.type === "published" && (
                            <>
                              {item.url && (
                                <a href={item.url} target="_blank" rel="noopener noreferrer"
                                  className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 whitespace-nowrap">
                                  View
                                </a>
                              )}
                              <ActionButton
                                onClick={async () => {
                                  if (!item.slug) { setActionResult((prev) => ({ ...prev, [item.id]: "❌ No slug — cannot submit" })); return; }
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

  if (loading) return <div className="flex items-center justify-center h-48"><p className="text-zinc-500 text-sm">Loading pipeline…</p></div>;
  if (fetchError) return (
    <Card>
      <p className="text-red-400 text-sm">⚠️ Failed to load pipeline: {fetchError}</p>
      <button onClick={fetchData} className="mt-2 px-3 py-1.5 rounded-lg border text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700">
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
            ["Building", summary.total_active ?? 0, "text-amber-400"],
            ["Reservoir", summary.reservoir_count ?? 0, "text-blue-300"],
            ["Published Today", summary.published_today ?? 0, "text-emerald-400"],
          ].map(([label, val, color]) => (
            <div key={label as string} className="bg-zinc-800 rounded-lg px-3 py-2 text-center min-w-[70px]">
              <div className={`text-xl font-bold ${color}`}>{val}</div>
              <div className="text-xs text-zinc-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Phase breakdown */}
        {Object.entries(byPhase).length > 0 && (
          <div className="space-y-1.5">
            {Object.entries(byPhase).map(([phase, count]) => (
              <div key={phase} className="flex items-center gap-2 text-xs">
                <span className="text-zinc-400 capitalize w-20 shrink-0">{phase}</span>
                <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((count as number) / Math.max(1, ...Object.values(byPhase).map(v => Number(v)))) * 100)}%` }}
                  />
                </div>
                <span className="text-zinc-400 w-6 text-right">{count}</span>
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
          <p className={`mt-2 text-xs p-2 rounded ${actionResult.startsWith("✅") ? "bg-emerald-950/30 text-emerald-300" : "bg-red-950/30 text-red-300"}`}>
            {actionResult}
          </p>
        )}
      </Card>

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
                    <span className="text-zinc-300 truncate block">{title}</span>
                    <span className="text-zinc-500 capitalize">{phase}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-zinc-500">
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

  if (loading) return <div className="flex items-center justify-center h-48"><p className="text-zinc-500 text-sm">Loading cron logs…</p></div>;
  if (fetchError) return (
    <Card>
      <p className="text-red-400 text-sm">⚠️ Failed to load cron logs: {fetchError}</p>
      <button onClick={fetchData} className="mt-2 px-3 py-1.5 rounded-lg border text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700">
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
          <div className="text-xl font-bold text-zinc-300">{summary.total ?? logs.length}</div>
          <div className="text-xs text-zinc-500 mt-1">Runs (24h)</div>
        </Card>
        <Card className="text-center">
          <div className={`text-xl font-bold ${(summary.failed ?? 0) > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {summary.failed ?? 0}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Failed</div>
        </Card>
        <Card className="text-center">
          <div className={`text-xl font-bold ${(summary.timedOut ?? 0) > 0 ? "text-amber-400" : "text-zinc-500"}`}>
            {summary.timedOut ?? 0}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Timed Out</div>
        </Card>
      </div>

      {/* Run All Critical */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-300">Run Critical Sequence</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Topics → Builder → Selector → SEO</p>
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
          <p className="mt-2 text-xs bg-emerald-950/30 text-emerald-300 rounded px-2 py-1">{actionResult["critical-seq"]}</p>
        )}
      </Card>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "failed", "ok"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${filter === f ? "bg-zinc-100 text-zinc-900" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Cron cards */}
      <div className="space-y-2">
        {entries.length === 0 && (
          <Card className="text-center py-8"><p className="text-zinc-500 text-sm">No cron runs found.</p></Card>
        )}
        {entries.map(([name, jobLogs]) => {
          const last = jobLogs[0] as {
            status?: string; durationMs?: number; startedAt?: string;
            errorMessage?: string; itemsProcessed?: number
          };
          const isOk = last.status === "success" || last.status === "completed";
          const isFailed = last.status === "failed" || last.status === "error";

          return (
            <Card key={name} className={isFailed ? "border-red-900/40" : ""}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={isOk ? "text-emerald-400" : isFailed ? "text-red-400" : "text-amber-400"}>
                      {isOk ? "✅" : isFailed ? "❌" : "⏱"}
                    </span>
                    <span className="text-sm font-medium text-zinc-200">{name}</span>
                    <span className="text-xs text-zinc-500">{timeAgo(last.startedAt ?? null)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                    <span>{formatDuration(last.durationMs ?? null)}</span>
                    {last.itemsProcessed !== undefined && last.itemsProcessed > 0 && (
                      <span>{last.itemsProcessed} items</span>
                    )}
                    <span className="text-zinc-600">{jobLogs.length} runs in 24h</span>
                  </div>
                  {isFailed && last.errorMessage && (
                    <p className="mt-1.5 text-xs text-red-400 bg-red-950/20 rounded px-2 py-1">{String(last.errorMessage).slice(0, 200)}</p>
                  )}
                  {actionResult[name] && (
                    <p className={`mt-1 text-xs rounded px-2 py-1 ${actionResult[name].startsWith("✅") ? "bg-emerald-950/30 text-emerald-300" : "bg-red-950/30 text-red-300"}`}>
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
          <Card className="border-amber-900/40">
            <SectionTitle>⚠️ Not Run Today ({notRunToday.length})</SectionTitle>
            <div className="space-y-1.5">
              {notRunToday.map((name) => (
                <div key={name} className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-amber-300">{name}</span>
                    <span className="ml-2 text-zinc-500">{EXPECTED_WEEKLY.includes(name) ? "weekly" : "daily"}</span>
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
      const res = await fetch("/api/admin/seo-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_cron", cron: cronName, siteId }),
      });
      const json = await res.json();
      setSeoAuditActionResult((prev) => ({
        ...prev,
        [actionId]: json.success ? "✅ Done" : `❌ ${json.error || "Failed"}`,
      }));
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
      const json = await res.json();
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
        <p className="text-zinc-500 text-sm">No site data available. Check database connection in Settings.</p>
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
                      ? "bg-emerald-900/50 text-emerald-300 border-emerald-700"
                      : "bg-zinc-800 text-zinc-500 border-zinc-700"
                  }`}>
                    {site.isActive ? "Active" : "Inactive"}
                  </span>
                  <h3 className="text-sm font-semibold text-zinc-100">{site.name}</h3>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{site.domain}</p>
              </div>
              {/* Readiness badge */}
              <div className={`text-xs px-2 py-1 rounded-lg border font-medium ${
                readiness.percentage >= 80 ? "bg-emerald-900/30 text-emerald-300 border-emerald-700" :
                readiness.percentage >= 50 ? "bg-amber-900/30 text-amber-300 border-amber-700" :
                "bg-red-900/30 text-red-300 border-red-700"
              }`}>
                {readiness.percentage}% ready
              </div>
            </div>

            {/* Data load error — show instead of misleading zeros */}
            {site.dataError && (
              <div className="mt-2 bg-red-950/30 border border-red-800/50 rounded-lg px-3 py-2 text-xs text-red-300">
                <div className="font-medium mb-1">Data load failed</div>
                <div className="text-red-400/80 text-[10px]">{site.dataError}</div>
                <button
                  onClick={() => onRefresh()}
                  className="mt-1.5 px-2 py-0.5 rounded bg-red-900/50 hover:bg-red-800/50 text-red-300 text-[10px] border border-red-700/50"
                >
                  Tap to retry
                </button>
              </div>
            )}

            {/* Content gap warning */}
            {!site.dataError && daysSincePublish !== null && daysSincePublish > 3 && (
              <div className="mt-2 bg-amber-950/20 border border-amber-800/50 rounded-lg px-3 py-1.5 text-xs text-amber-300">
                {daysSincePublish}d since last publish — content gap detected
              </div>
            )}

            <div className="mt-3 grid grid-cols-4 gap-2 text-xs text-center">
              <div className="bg-zinc-800/50 rounded p-2">
                <div className="font-bold text-emerald-400">{site.articlesPublished}</div>
                <div className="text-zinc-500">Published</div>
              </div>
              <div className="bg-zinc-800/50 rounded p-2">
                <div className="font-bold text-blue-400">{site.reservoir}</div>
                <div className="text-zinc-500">Reservoir</div>
              </div>
              <div className="bg-zinc-800/50 rounded p-2">
                <div className="font-bold text-amber-400">{site.inPipeline}</div>
                <div className="text-zinc-500">Pipeline</div>
              </div>
              <div className="bg-zinc-800/50 rounded p-2">
                <div className="font-bold text-zinc-400">{site.topicsQueued}</div>
                <div className="text-zinc-500">Topics</div>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-1 text-xs text-zinc-500">
              <span>Avg SEO: <span className={site.avgSeoScore >= 70 ? "text-emerald-400" : site.avgSeoScore > 0 ? "text-amber-400" : "text-red-400"}>{site.avgSeoScore > 0 ? site.avgSeoScore : "n/a"}</span></span>
              <span className="ml-2">Indexed: <span className={site.indexRate >= 80 ? "text-emerald-400" : site.indexRate > 0 ? "text-amber-400" : "text-red-400"}>{site.indexRate}%</span></span>
              {site.lastPublishedAt && <span className="ml-2">Last article: {timeAgo(site.lastPublishedAt)}</span>}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                onClick={() => onSelectSite(site.id)}
                className="px-2 py-1 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
              >
                Content
              </button>
              <button
                onClick={() => window.open(`https://${site.domain}`, "_blank")}
                className="px-2 py-1 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
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
              <button
                onClick={() => {
                  if (seoAuditHistoryOpen === site.id) {
                    setSeoAuditHistoryOpen(null);
                  } else {
                    loadAuditHistory(site.id);
                    setSeoAuditHistoryOpen(site.id);
                  }
                }}
                className="px-2 py-1 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-violet-400 border border-zinc-700"
              >
                Reports
              </button>
              <button
                onClick={() => setExpandedSite(isExpanded ? null : site.id)}
                className="px-2 py-1 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700"
              >
                {isExpanded ? "▲ Less" : "▼ Readiness"}
              </button>
            </div>

            {publishResult[site.id] && (
              <p className={`mt-2 text-xs rounded px-2 py-1 ${publishResult[site.id].startsWith("✅") ? "bg-emerald-950/30 text-emerald-300" : "bg-red-950/30 text-red-300"}`}>
                {publishResult[site.id]}
              </p>
            )}

            {/* Automation readiness checklist */}
            {isExpanded && (
              <div className="mt-3 border-t border-zinc-800 pt-3">
                <p className="text-xs font-semibold text-zinc-400 mb-2">Automation Readiness</p>
                <div className="space-y-1">
                  {readiness.checks.map((check) => (
                    <div key={check.label} className="flex items-center gap-2 text-xs">
                      <span className={check.ok ? "text-emerald-400" : "text-zinc-600"}>
                        {check.ok ? "✓" : "○"}
                      </span>
                      <span className={check.ok ? "text-zinc-300" : "text-zinc-500"}>{check.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      readiness.percentage >= 80 ? "bg-emerald-500" :
                      readiness.percentage >= 50 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${readiness.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1">{readiness.passCount}/{readiness.total} checks passed</p>
              </div>
            )}

            {/* Performance Audit Results Panel */}
            {auditSiteId === site.id && auditResults[site.id] && (
              <div className="mt-3 border-t border-zinc-800 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-zinc-400">Performance Audit (Mobile)</p>
                  <button onClick={() => setAuditSiteId(null)} className="text-xs text-zinc-500 hover:text-zinc-300">✕ Close</button>
                </div>
                {/* Summary scores */}
                <div className="grid grid-cols-4 gap-2 text-xs text-center mb-3">
                  {[
                    { label: "Perf", value: auditResults[site.id].avgPerformance, threshold: 90 },
                    { label: "A11y", value: auditResults[site.id].avgAccessibility, threshold: 90 },
                    { label: "SEO", value: auditResults[site.id].avgSeo, threshold: 90 },
                    { label: "LCP", value: auditResults[site.id].avgLcpMs, threshold: 2500, isMs: true },
                  ].map((m) => (
                    <div key={m.label} className="bg-zinc-800/50 rounded p-2">
                      <div className={`font-bold ${
                        m.isMs ? (m.value <= m.threshold ? "text-emerald-400" : "text-red-400") :
                        m.value >= m.threshold ? "text-emerald-400" : m.value >= 50 ? "text-amber-400" : "text-red-400"
                      }`}>
                        {m.isMs ? `${(m.value / 1000).toFixed(1)}s` : m.value}
                      </div>
                      <div className="text-zinc-500">{m.label}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mb-2">{auditResults[site.id].pagesAudited} pages audited</p>
                {auditResults[site.id].avgPerformance === 0 && auditResults[site.id].avgSeo === 0 && (
                  <div className="bg-red-950/30 border border-red-800/40 rounded p-2 mb-2 text-xs text-red-400">
                    All audits failed. This usually means the Google PageSpeed API is rejecting requests.
                    {!process.env.NEXT_PUBLIC_HAS_PSI_KEY && " No PageSpeed API key detected — consider adding GOOGLE_PAGESPEED_API_KEY to Vercel env vars."}
                  </div>
                )}
                {/* Per-page results */}
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {auditResults[site.id].pages.map((p) => (
                    <div key={p.url} className="flex items-center justify-between text-xs bg-zinc-800/30 rounded px-2 py-1.5">
                      <span className="text-zinc-400 truncate max-w-[55%]">{(() => { try { return new URL(p.url).pathname; } catch { return p.url; } })()}</span>
                      <div className="flex gap-2 text-right shrink-0">
                        {p.error ? (
                          <span className="text-red-400" title={p.error}>
                            {p.error.startsWith("HTTP ") ? p.error.substring(0, 20) : "API Error"}
                          </span>
                        ) : (
                          <>
                            <span className={p.performance != null && p.performance >= 90 ? "text-emerald-400" : p.performance != null && p.performance >= 50 ? "text-amber-400" : "text-red-400"}>
                              {p.performance ?? "–"}
                            </span>
                            <span className={p.seo != null && p.seo >= 90 ? "text-emerald-400" : "text-amber-400"}>
                              {p.seo ?? "–"}
                            </span>
                            {p.lcpMs != null && (
                              <span className={p.lcpMs <= 2500 ? "text-emerald-400" : "text-red-400"}>
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
              <div className="mt-3 border-t border-zinc-800 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-violet-400">Previous SEO Audit Reports</p>
                  <button onClick={() => setSeoAuditHistoryOpen(null)} className="text-xs text-zinc-500 hover:text-zinc-300">✕ Close</button>
                </div>
                {(!seoAuditHistory[site.id] || seoAuditHistory[site.id].length === 0) ? (
                  <p className="text-xs text-zinc-500">No saved reports yet. Run a Master Audit to create the first one.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {seoAuditHistory[site.id].map((report) => (
                      <button
                        key={report.id}
                        onClick={() => loadPreviousReport(report.id, site.id)}
                        className="w-full text-left bg-zinc-800/50 hover:bg-zinc-800 rounded-lg px-3 py-2 text-xs transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${
                              report.healthScore >= 70 ? "text-emerald-400" :
                              report.healthScore >= 40 ? "text-amber-400" : "text-red-400"
                            }`}>
                              {report.healthScore}/100
                            </span>
                            <span className="text-zinc-500">{timeAgo(report.createdAt)}</span>
                          </div>
                          <div className="flex gap-1.5">
                            {report.criticalCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-red-900/50 text-red-300 text-[10px]">{report.criticalCount} critical</span>
                            )}
                            {report.highCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-orange-900/50 text-orange-300 text-[10px]">{report.highCount} high</span>
                            )}
                          </div>
                        </div>
                        <p className="text-zinc-400 text-[11px] mt-1 line-clamp-1">{report.summary}</p>
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
                critical: "bg-red-900/50 text-red-300 border-red-700",
                high: "bg-orange-900/50 text-orange-300 border-orange-700",
                medium: "bg-amber-900/50 text-amber-300 border-amber-700",
                low: "bg-blue-900/50 text-blue-300 border-blue-700",
                info: "bg-zinc-800 text-zinc-400 border-zinc-700",
              };
              const severityDots: Record<string, string> = {
                critical: "bg-red-500",
                high: "bg-orange-500",
                medium: "bg-amber-500",
                low: "bg-blue-500",
                info: "bg-zinc-500",
              };
              return (
                <div className="mt-3 border-t border-violet-800/50 pt-3">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-violet-400">Master SEO Audit</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500">{Math.round(audit.durationMs / 1000)}s</span>
                      <button onClick={() => setSeoAuditSiteId(null)} className="text-xs text-zinc-500 hover:text-zinc-300">✕ Close</button>
                    </div>
                  </div>

                  {/* Save warning */}
                  {audit.saveError && (
                    <div className="mb-2 bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-1.5 text-[11px] text-amber-300">
                      {audit.saveError}
                    </div>
                  )}

                  {/* Health Score + Summary */}
                  <div className="bg-zinc-800/60 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl font-black ${
                        audit.healthScore >= 70 ? "text-emerald-400" :
                        audit.healthScore >= 40 ? "text-amber-400" : "text-red-400"
                      }`}>
                        {audit.healthScore}
                      </div>
                      <div className="flex-1">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Health Score</div>
                        <div className="h-1.5 bg-zinc-700 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              audit.healthScore >= 70 ? "bg-emerald-500" :
                              audit.healthScore >= 40 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${audit.healthScore}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-300 mt-2">{audit.summary}</p>
                    <div className="flex gap-2 mt-2 text-[10px]">
                      {audit.criticalCount > 0 && <span className="px-1.5 py-0.5 rounded bg-red-900/50 text-red-300">{audit.criticalCount} critical</span>}
                      {audit.highCount > 0 && <span className="px-1.5 py-0.5 rounded bg-orange-900/50 text-orange-300">{audit.highCount} high</span>}
                      {audit.mediumCount > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300">{audit.mediumCount} medium</span>}
                      {audit.lowCount > 0 && <span className="px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300">{audit.lowCount} low</span>}
                    </div>
                  </div>

                  {/* Indexing Quick Stats */}
                  <div className="grid grid-cols-4 gap-1.5 mb-3 text-center text-xs">
                    <div className="bg-zinc-800/50 rounded-lg p-2">
                      <div className={`font-bold ${audit.indexingSummary.indexRate >= 60 ? "text-emerald-400" : "text-red-400"}`}>
                        {audit.indexingSummary.indexRate}%
                      </div>
                      <div className="text-zinc-500 text-[10px]">Indexed</div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-2">
                      <div className="font-bold text-blue-400">{audit.indexingSummary.submitted}</div>
                      <div className="text-zinc-500 text-[10px]">Submitted</div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-2">
                      <div className={`font-bold ${audit.indexingSummary.discovered > 10 ? "text-amber-400" : "text-zinc-400"}`}>
                        {audit.indexingSummary.discovered}
                      </div>
                      <div className="text-zinc-500 text-[10px]">Discovered</div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-lg p-2">
                      <div className={`font-bold ${audit.indexingSummary.errors > 0 ? "text-red-400" : "text-zinc-400"}`}>
                        {audit.indexingSummary.errors}
                      </div>
                      <div className="text-zinc-500 text-[10px]">Errors</div>
                    </div>
                  </div>

                  {/* Trends */}
                  {audit.trends && (
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Week-over-Week Trends</p>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <div className="bg-zinc-800/50 rounded-lg px-2.5 py-2">
                          <div className="text-zinc-500 text-[10px]">Clicks</div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-zinc-200">{audit.trends.weeklyClicks.current}</span>
                            {audit.trends.weeklyClicks.change !== 0 && (
                              <span className={`text-[10px] font-medium ${audit.trends.weeklyClicks.change > 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {audit.trends.weeklyClicks.change > 0 ? "↑" : "↓"}{Math.abs(audit.trends.weeklyClicks.change)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg px-2.5 py-2">
                          <div className="text-zinc-500 text-[10px]">Impressions</div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-zinc-200">{audit.trends.weeklyImpressions.current}</span>
                            {audit.trends.weeklyImpressions.change !== 0 && (
                              <span className={`text-[10px] font-medium ${audit.trends.weeklyImpressions.change > 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {audit.trends.weeklyImpressions.change > 0 ? "↑" : "↓"}{Math.abs(audit.trends.weeklyImpressions.change)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg px-2.5 py-2">
                          <div className="text-zinc-500 text-[10px]">Indexing Velocity</div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-zinc-200">{audit.trends.indexingVelocity.thisWeek}</span>
                            <span className="text-zinc-500 text-[10px]">vs {audit.trends.indexingVelocity.lastWeek} prev</span>
                          </div>
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg px-2.5 py-2">
                          <div className="text-zinc-500 text-[10px]">Content Published</div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-zinc-200">{audit.trends.contentVelocity.thisWeek}</span>
                            <span className="text-zinc-500 text-[10px]">vs {audit.trends.contentVelocity.lastWeek} prev</span>
                          </div>
                        </div>
                      </div>

                      {/* Top growing/declining */}
                      {(audit.trends.topGrowing.length > 0 || audit.trends.topDeclining.length > 0) && (
                        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
                          {audit.trends.topGrowing.length > 0 && (
                            <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-lg px-2 py-1.5">
                              <div className="text-emerald-400 font-medium mb-1">Top Growing</div>
                              {audit.trends.topGrowing.slice(0, 3).map((p, i) => (
                                <div key={i} className="text-zinc-400 truncate">
                                  +{p.clickGain} {(() => { try { return new URL(p.url).pathname; } catch { return p.url; } })()}
                                </div>
                              ))}
                            </div>
                          )}
                          {audit.trends.topDeclining.length > 0 && (
                            <div className="bg-red-950/20 border border-red-800/30 rounded-lg px-2 py-1.5">
                              <div className="text-red-400 font-medium mb-1">Top Declining</div>
                              {audit.trends.topDeclining.slice(0, 3).map((p, i) => (
                                <div key={i} className="text-zinc-400 truncate">
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
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Findings by Category</p>
                    {audit.sections.map((section) => {
                      const isExpanded = seoAuditExpandedSection === section.name;
                      const criticals = section.findings.filter((f) => f.severity === "critical").length;
                      const highs = section.findings.filter((f) => f.severity === "high").length;
                      return (
                        <div key={section.name}>
                          <button
                            onClick={() => setSeoAuditExpandedSection(isExpanded ? null : section.name)}
                            className="w-full flex items-center justify-between bg-zinc-800/50 hover:bg-zinc-800 rounded-lg px-3 py-2 text-xs transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span>{section.icon}</span>
                              <span className="font-medium text-zinc-200">{section.name}</span>
                              <span className="text-zinc-500">({section.findings.length})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {criticals > 0 && <span className="w-2 h-2 rounded-full bg-red-500" />}
                              {highs > 0 && <span className="w-2 h-2 rounded-full bg-orange-500" />}
                              <span className={`text-[10px] font-bold ${
                                section.score >= 80 ? "text-emerald-400" :
                                section.score >= 50 ? "text-amber-400" : "text-red-400"
                              }`}>
                                {section.score}/{section.maxScore}
                              </span>
                              <span className="text-zinc-600">{isExpanded ? "▲" : "▼"}</span>
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
                                      <div className="ml-4 mt-1 bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] space-y-2">
                                        <div>
                                          <span className="text-zinc-500 font-medium">What it means: </span>
                                          <span className="text-zinc-300">{finding.description}</span>
                                        </div>
                                        {finding.impact && (
                                          <div>
                                            <span className="text-zinc-500 font-medium">Impact: </span>
                                            <span className="text-zinc-300">{finding.impact}</span>
                                          </div>
                                        )}
                                        {finding.fix && (
                                          <div>
                                            <span className="text-zinc-500 font-medium">How to fix: </span>
                                            <span className="text-zinc-300">{finding.fix}</span>
                                          </div>
                                        )}
                                        {finding.affected.length > 0 && (
                                          <div>
                                            <span className="text-zinc-500 font-medium">Affected ({finding.count}): </span>
                                            <div className="mt-1 max-h-24 overflow-y-auto space-y-0.5">
                                              {finding.affected.slice(0, 10).map((a, i) => (
                                                <div key={i} className="text-zinc-400 text-[10px] font-mono truncate">{a}</div>
                                              ))}
                                              {finding.affected.length > 10 && (
                                                <div className="text-zinc-600 text-[10px]">... and {finding.affected.length - 10} more</div>
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
                      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Quick Fix Actions</p>
                      <div className="space-y-1">
                        {audit.availableActions.map((action) => (
                          <div key={action.id} className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-2">
                            <div className="flex-1 mr-2">
                              <div className="text-xs font-medium text-zinc-200">{action.label}</div>
                              <div className="text-[10px] text-zinc-500">{action.description}</div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {seoAuditActionResult[action.id] && (
                                <span className={`text-[10px] ${seoAuditActionResult[action.id].startsWith("✅") ? "text-emerald-400" : "text-red-400"}`}>
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
                  <div className="flex items-center justify-between text-[10px] text-zinc-600 pt-2 border-t border-zinc-800">
                    <span>{audit.siteName} — {new Date(audit.timestamp).toLocaleString()}</span>
                    {audit.reportId && <span className="text-violet-500">Saved</span>}
                  </div>
                </div>
              );
            })()}

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

  if (loading) return <div className="flex items-center justify-center h-48"><p className="text-zinc-500 text-sm">Loading AI config…</p></div>;
  if (!data) return <Card><p className="text-zinc-500 text-sm">Failed to load AI configuration.</p></Card>;

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
                <span className={p.hasKey ? "text-emerald-400" : "text-zinc-600"}>{p.hasKey ? "✅" : "❌"}</span>
                <span className={p.hasKey ? "text-zinc-200" : "text-zinc-500"}>{p.displayName}</span>
                {p.testStatus && (
                  <span className="text-xs text-zinc-500">({p.testStatus})</span>
                )}
              </div>
              <span className="text-xs text-zinc-500">{p.hasKey ? "Key configured" : "No API key"}</span>
            </div>
          ))}
        </div>
        {configuredProviders.length === 0 && (
          <p className="mt-2 text-xs text-red-400">No AI providers configured. Add at least one API key in Vercel environment variables.</p>
        )}
      </Card>

      {/* Task routing */}
      <Card>
        <SectionTitle>Task Routing</SectionTitle>
        <div className="space-y-3">
          {routes.map((route) => (
            <div key={route.taskType} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-zinc-300 w-36 shrink-0">{route.label}</span>
              <div className="flex items-center gap-1">
                <span className="text-zinc-600">Primary:</span>
                <select
                  value={route.primary}
                  onChange={(e) => updateRoute(route.taskType, "primary", e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                >
                  {data.providers.filter((p) => p.hasKey).map((p) => (
                    <option key={p.name} value={p.name}>{p.displayName}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-zinc-600">Fallback:</span>
                <select
                  value={route.fallback ?? ""}
                  onChange={(e) => updateRoute(route.taskType, "fallback", e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                >
                  <option value="">None</option>
                  {data.providers.filter((p) => p.hasKey).map((p) => (
                    <option key={p.name} value={p.name}>{p.displayName}</option>
                  ))}
                </select>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded border ${
                route.status === "active" ? "bg-emerald-900/30 text-emerald-400 border-emerald-800" :
                route.status === "fallback_only" ? "bg-amber-900/30 text-amber-400 border-amber-800" :
                "bg-red-900/30 text-red-400 border-red-800"
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
          <p className={`mt-2 text-xs rounded px-2 py-1 ${saveResult.startsWith("✅") ? "bg-emerald-950/30 text-emerald-300" : "bg-red-950/30 text-red-300"}`}>
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
                <span className="text-zinc-300 capitalize">{provider}</span>
                <span className={
                  (result as { success?: boolean })?.success ? "text-emerald-400" : "text-red-400"
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
    success: "bg-emerald-900/40 text-emerald-300 border-emerald-800",
    failed: "bg-red-900/40 text-red-300 border-red-800",
    partial: "bg-amber-900/40 text-amber-300 border-amber-800",
    timeout: "bg-orange-900/40 text-orange-300 border-orange-800",
    running: "bg-blue-900/40 text-blue-300 border-blue-800",
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
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold text-zinc-100">Action Logs</h2>
        <div className="flex items-center gap-2">
          <button onClick={exportAll} className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700">
            {copied === "all" ? "Copied!" : "Export All JSON"}
          </button>
          <button onClick={cleanup} disabled={cleaning} className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700">
            {cleaning ? "Cleaning..." : "Purge >21d"}
          </button>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100 text-lg px-2">✕</button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900/80 border-b border-zinc-800 px-4 py-2 flex flex-wrap gap-2 shrink-0">
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700">
          {["1h", "12h", "24h", "3d", "7d", "14d", "21d"].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700">
          <option value="">All types</option>
          <option value="cron">Cron jobs</option>
          <option value="auto-fix">Auto-fixes</option>
          <option value="ai-call">AI calls</option>
          <option value="audit">Audits</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700">
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="partial">Partial</option>
          <option value="timeout">Timeout</option>
        </select>
        {data?.filters.functions && data.filters.functions.length > 0 && (
          <select value={func} onChange={(e) => setFunc(e.target.value)} className="bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700">
            <option value="">All functions</option>
            {data.filters.functions.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        )}
        <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700">
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
        <div className="bg-zinc-900/60 border-b border-zinc-800 px-4 py-2 flex gap-3 text-xs shrink-0 overflow-x-auto">
          <span className="text-zinc-400">{data.stats.total} total</span>
          <span className="text-emerald-400">{data.stats.success} ok</span>
          <span className="text-red-400">{data.stats.failed} failed</span>
          {data.stats.timeout > 0 && <span className="text-orange-400">{data.stats.timeout} timeout</span>}
          {data.stats.partial > 0 && <span className="text-amber-400">{data.stats.partial} partial</span>}
          {data.stats.running > 0 && <span className="text-blue-400">{data.stats.running} running</span>}
        </div>
      )}

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {loading ? (
          <p className="text-zinc-500 text-xs text-center py-8">Loading logs...</p>
        ) : !data || data.logs.length === 0 ? (
          <p className="text-zinc-500 text-xs text-center py-8">No logs found for this period/filters.</p>
        ) : (
          data.logs.map((log) => (
            <div key={log.id} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              {/* Log row */}
              <button
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                className="w-full px-3 py-2 flex items-start gap-2 text-left hover:bg-zinc-800/50"
              >
                <span className="text-sm shrink-0 mt-0.5">{statusIcon[log.status] || "•"}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-zinc-500">{categoryIcon[log.category] || ""} {log.category}</span>
                    <span className="text-xs font-medium text-zinc-200 truncate">{log.action}</span>
                    {log.siteId && <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">{log.siteId}</span>}
                    {log.durationMs != null && <span className="text-[10px] text-zinc-600">{(log.durationMs / 1000).toFixed(1)}s</span>}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{log.summary}</p>
                  <span className="text-[10px] text-zinc-600">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${statusColor[log.status] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                  {log.status}
                </span>
              </button>

              {/* Expanded detail */}
              {expandedId === log.id && (
                <div className="px-3 pb-3 border-t border-zinc-800 space-y-2">
                  {log.outcome && (
                    <div className="mt-2">
                      <p className="text-[10px] text-zinc-500 uppercase">Outcome</p>
                      <p className="text-xs text-emerald-300">{log.outcome}</p>
                    </div>
                  )}
                  {log.error && (
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase">Error</p>
                      <p className="text-xs text-red-300">{log.error}</p>
                    </div>
                  )}
                  {log.fix && (
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase">How to fix</p>
                      <p className="text-xs text-amber-300">{log.fix}</p>
                    </div>
                  )}
                  <button
                    onClick={() => copyJson(log)}
                    className="mt-1 px-2 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded border border-zinc-700"
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

function SettingsTab({ system }: { system: SystemStatus | null }) {
  const [flags, setFlags] = useState<Array<{ id: string; key: string; enabled: boolean; description: string }>>([]);
  const [flagsLoading, setFlagsLoading] = useState(true);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState<string | null>(null);
  const [showActionLogs, setShowActionLogs] = useState(false);

  // Migration state
  const [migrationStatus, setMigrationStatus] = useState<"idle" | "scanning" | "migrating" | "done">("idle");
  const [migrationResult, setMigrationResult] = useState<{
    type: "scan" | "migrate";
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
  } | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);

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
              <span className={ok ? "text-emerald-400" : "text-zinc-600"}>{ok ? "✅" : "❌"}</span>
              <span className={ok ? "text-zinc-300" : "text-zinc-500"}>{key}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* API Keys monitoring panel */}
      <Card>
        <SectionTitle>API Keys Status</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {API_KEYS.map(({ key, status, capability, emoji }) => (
            <div key={key} className={`flex items-start gap-2 rounded-lg p-2 text-xs ${status ? "bg-zinc-800/40" : "bg-red-950/10 border border-red-900/30"}`}>
              <span className="text-base mt-0.5">{emoji}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={status ? "text-emerald-400" : "text-red-500"}>
                    {status ? "✅" : "❌"}
                  </span>
                  <span className={`font-mono font-medium ${status ? "text-zinc-200" : "text-zinc-400"}`}>{key}</span>
                </div>
                <p className="text-zinc-500 mt-0.5">{capability}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-zinc-800 pt-2">
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:underline"
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
          <p className={`mt-2 text-xs rounded px-2 py-1 break-all ${testResult.startsWith("✅") ? "bg-emerald-950/30 text-emerald-300" : "bg-red-950/30 text-red-300"}`}>
            {testResult}
          </p>
        )}

        <div className="mt-3 border-t border-zinc-800 pt-3 flex flex-wrap gap-2">
          <ActionButton onClick={() => setShowActionLogs(true)}>
            📊 Action Logs
          </ActionButton>
          <a href="/test-connections.html" target="_blank" className="px-3 py-1.5 rounded-lg border text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700">
            🔬 test-connections.html
          </a>
          <Link href="/admin/cron-logs" className="px-3 py-1.5 rounded-lg border text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700">
            📋 Full Cron History
          </Link>
          <Link href="/admin" className="px-3 py-1.5 rounded-lg border text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700">
            📁 Full Admin
          </Link>
        </div>
      </Card>

      {/* Database Migration */}
      <Card>
        <SectionTitle>Database Migration</SectionTitle>
        <p className="text-zinc-500 text-xs mb-3">Scan for missing tables, columns, and indexes. Fix applies all pending schema changes.</p>
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
        </div>
        {migrationError && (
          <p className="mt-2 text-xs bg-red-950/30 text-red-300 rounded px-2 py-1">{migrationError}</p>
        )}
        {migrationResult && (
          <div className="mt-2 text-xs space-y-1">
            {migrationResult.type === "scan" ? (
              <>
                <div className="flex items-center gap-2">
                  <span className={migrationResult.needsMigration ? "text-amber-400" : "text-emerald-400"}>
                    {migrationResult.needsMigration ? "⚠️" : "✅"}
                  </span>
                  <span className="text-zinc-300">
                    {migrationResult.needsMigration
                      ? "Migration needed"
                      : "Schema is up to date"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <div className={`rounded px-2 py-1 text-center ${migrationResult.missingTables > 0 ? "bg-red-950/30 text-red-300" : "bg-zinc-800 text-zinc-400"}`}>
                    {migrationResult.missingTables} tables
                  </div>
                  <div className={`rounded px-2 py-1 text-center ${migrationResult.missingColumns > 0 ? "bg-red-950/30 text-red-300" : "bg-zinc-800 text-zinc-400"}`}>
                    {migrationResult.missingColumns} columns
                  </div>
                  <div className={`rounded px-2 py-1 text-center ${migrationResult.missingIndexes > 0 ? "bg-amber-950/30 text-amber-300" : "bg-zinc-800 text-zinc-400"}`}>
                    {migrationResult.missingIndexes} indexes
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className={(migrationResult.errors?.length ?? 0) > 0 ? "text-amber-400" : "text-emerald-400"}>
                    {(migrationResult.errors?.length ?? 0) > 0 ? "⚠️" : "✅"}
                  </span>
                  <span className="text-zinc-300">
                    Migration complete{migrationResult.durationMs ? ` (${(migrationResult.durationMs / 1000).toFixed(1)}s)` : ""}
                  </span>
                </div>
                {(migrationResult.tablesCreated?.length ?? 0) > 0 && (
                  <p className="text-emerald-400">+ {migrationResult.tablesCreated!.length} table(s) created: {migrationResult.tablesCreated!.join(", ")}</p>
                )}
                {(migrationResult.columnsAdded?.length ?? 0) > 0 && (
                  <p className="text-emerald-400">+ {migrationResult.columnsAdded!.length} column(s) added</p>
                )}
                {(migrationResult.indexesCreated?.length ?? 0) > 0 && (
                  <p className="text-emerald-400">+ {migrationResult.indexesCreated!.length} index(es) created</p>
                )}
                {(migrationResult.foreignKeysCreated?.length ?? 0) > 0 && (
                  <p className="text-emerald-400">+ {migrationResult.foreignKeysCreated!.length} foreign key(s) created</p>
                )}
                {(migrationResult.errors?.length ?? 0) > 0 && (
                  <p className="text-red-400">{migrationResult.errors!.length} errors — check logs</p>
                )}
              </>
            )}
          </div>
        )}
      </Card>

      {/* Feature flags */}
      <Card>
        <SectionTitle>Feature Flags</SectionTitle>
        {flagsLoading ? (
          <p className="text-zinc-500 text-xs">Loading flags…</p>
        ) : flags.length === 0 ? (
          <p className="text-zinc-500 text-xs">No feature flags found in database.</p>
        ) : (
          <div className="space-y-2">
            {flags.map((flag) => (
              <div key={flag.key} className="flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-zinc-300 font-medium">{flag.key}</span>
                  {flag.description && <p className="text-zinc-500 mt-0.5">{flag.description}</p>}
                </div>
                <button
                  onClick={() => toggleFlag(flag.key, flag.enabled)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${flag.enabled ? "bg-emerald-600" : "bg-zinc-700"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${flag.enabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Links */}
      <Card>
        <SectionTitle>System Info</SectionTitle>
        <div className="text-xs space-y-1 text-zinc-500">
          <p>Platform: Vercel Pro</p>
          <p>Cockpit v1.0.0</p>
          <p>
            <Link href="/admin/cockpit/design" className="text-blue-400 hover:underline">→ Design Studio</Link>
          </p>
          <p>
            <Link href="/admin/cockpit/email" className="text-blue-400 hover:underline">→ Email Center</Link>
          </p>
          <p>
            <Link href="/admin/cockpit/new-site" className="text-blue-400 hover:underline">→ New Website Builder</Link>
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

function TasksTab({ siteId }: { siteId: string }) {
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
      setTasks(data.tasks || []);
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
      if (data.created > 0) {
        fetchTasks(); // Refresh
      }
      setActionResults(prev => ({
        ...prev,
        "scan": { success: true, message: data.message || `${data.created} created` },
      }));
    } catch {
      setActionResults(prev => ({
        ...prev,
        "scan": { success: false, message: "Scan failed" },
      }));
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
      setActionResults(prev => ({
        ...prev,
        [task.id]: { success: res.ok, message: data.message || (res.ok ? "Done" : `HTTP ${res.status}`) },
      }));
      // Auto-complete the task on success
      if (res.ok) {
        await fetch("/api/admin/dev-tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "complete", taskId: task.id }),
        });
        fetchTasks();
      }
    } catch (err) {
      setActionResults(prev => ({
        ...prev,
        [task.id]: { success: false, message: err instanceof Error ? err.message : "Failed" },
      }));
    } finally {
      setExecutingId(null);
    }
  };

  const dismissTask = async (taskId: string) => {
    try {
      const res = await fetch("/api/admin/dev-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss", taskId }),
      });
      if (!res.ok) console.warn("[cockpit] dismissTask failed:", res.status);
      fetchTasks();
    } catch (e) {
      console.warn("[cockpit] dismissTask error:", e instanceof Error ? e.message : e);
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      const res = await fetch("/api/admin/dev-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", taskId }),
      });
      if (!res.ok) console.warn("[cockpit] completeTask failed:", res.status);
      fetchTasks();
    } catch (e) {
      console.warn("[cockpit] completeTask error:", e instanceof Error ? e.message : e);
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "critical": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "high": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "medium": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      default: return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const categoryIcon = (c: string) => {
    switch (c) {
      case "pipeline": return "⚙️";
      case "seo": return "🔍";
      case "automation": return "🤖";
      case "config": return "🔧";
      case "content": return "📝";
      case "security": return "🛡️";
      case "database": return "🗄️";
      default: return "📌";
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading tasks...</div>;

  return (
    <div className="space-y-4 p-1">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summary.overdue > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center border border-red-200 dark:border-red-800">
              <div className="text-2xl font-bold text-red-600">{summary.overdue}</div>
              <div className="text-xs text-red-500">Overdue</div>
            </div>
          )}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center border border-amber-200 dark:border-amber-800">
            <div className="text-2xl font-bold text-amber-600">{summary.dueToday}</div>
            <div className="text-xs text-amber-500">Due Today</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center border border-blue-200 dark:border-blue-800">
            <div className="text-2xl font-bold text-blue-600">{summary.pending}</div>
            <div className="text-xs text-blue-500">Pending</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center border border-green-200 dark:border-green-800">
            <div className="text-2xl font-bold text-green-600">{summary.completed}</div>
            <div className="text-xs text-green-500">Completed</div>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={scanForTasks}
          disabled={scanning}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 text-white font-medium rounded-lg text-sm transition-colors inline-flex items-center gap-2"
        >
          {scanning ? (
            <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> Scanning...</>
          ) : (
            <>🔍 Scan for Tasks</>
          )}
        </button>

        {actionResults["scan"] && (
          <span className={`text-xs ${actionResults["scan"].success ? "text-green-600" : "text-red-600"}`}>
            {actionResults["scan"].message}
          </span>
        )}

        <div className="flex-1" />

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
        >
          <option value="">Open Tasks</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg mb-2">No tasks found</p>
          <p className="text-sm">Click &quot;Scan for Tasks&quot; to detect issues that need attention</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0 mt-0.5">{categoryIcon(task.category)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className="font-medium text-sm text-gray-900 dark:text-white">{task.title}</span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{task.description}</p>
                  )}
                  {task.dueDate && (
                    <span className="text-xs text-gray-400">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {task.actionLabel && task.actionApi && (
                      <>
                        {actionResults[task.id] ? (
                          <span className={`text-xs px-3 py-1 rounded-lg ${
                            actionResults[task.id].success
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}>
                            {actionResults[task.id].success ? "✅" : "❌"} {actionResults[task.id].message}
                          </span>
                        ) : (
                          <button
                            onClick={() => executeAction(task)}
                            disabled={executingId === task.id}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            {executingId === task.id ? (
                              <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> Running...</>
                            ) : (
                              <>🚀 {task.actionLabel}</>
                            )}
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => completeTask(task.id)}
                      className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                    >
                      ✓ Done
                    </button>
                    <button
                      onClick={() => dismissTask(task.id)}
                      className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      Dismiss
                    </button>
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
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-zinc-950"><p className="text-zinc-500 text-sm">Loading cockpit…</p></div>}>
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
    autoRefreshRef.current = setInterval(fetchCockpit, 60_000);
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-white">🚀 Cockpit</h1>
            {cockpitData && activeSiteId && (
              <select
                value={activeSiteId}
                onChange={(e) => setActiveSiteId(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-300 focus:outline-none"
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
              href="/admin/cockpit/write"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-700 hover:bg-emerald-600 text-white"
            >
              + Write
            </Link>
            {lastRefresh && (
              <span className="text-xs text-zinc-600 hidden sm:block">
                Updated {timeAgo(lastRefresh.toISOString())}
              </span>
            )}
            <button
              onClick={fetchCockpit}
              disabled={cockpitLoading}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs disabled:opacity-50"
              title="Refresh"
            >
              {cockpitLoading ? "⏳" : "↻"}
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex overflow-x-auto scrollbar-hide border-t border-zinc-800">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-3 sm:px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {cockpitError && (
        <div className="bg-red-950/60 border-b border-red-800 px-4 py-2 text-xs text-red-300 flex items-center justify-between gap-2">
          <span>⚠️ Dashboard data failed to load: {cockpitError}</span>
          <button onClick={fetchCockpit} className="underline hover:text-red-200">Retry</button>
        </div>
      )}

      {/* Content */}
      <main className="max-w-screen-xl mx-auto px-4 py-4 pb-20">
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
