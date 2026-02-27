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

import { useState, useEffect, useCallback, useRef } from "react";
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
  indexing: { total: number; indexed: number; submitted: number; neverSubmitted: number; errors: number; rate: number };
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
  qualityScore: number | null;
  seoScore: number | null;
  wordCount: number;
  internalLinksCount: number;
  indexingStatus: string | null;
  lastSubmittedAt: string | null;
  rejectionReason: string | null;
  lastError: string | null;
  plainError: string | null;
  phase: string | null;
  phaseProgress: number;
  hoursInPhase: number;
  tags: string[];
  metaDescriptionEn: string | null;
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
  indexingStatus: "indexed" | "submitted" | "not_indexed" | "error" | "never_submitted";
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
  summary: { total: number; indexed: number; submitted: number; notIndexed: number; neverSubmitted: number; errors: number };
  healthDiagnosis: { status: string; message: string; detail: string; indexingRate: number };
  articles: IndexingArticleInfo[];
  systemIssues: Array<{ severity: string; category: string; message: string; detail: string; fixAction?: string }>;
  recentActivity: Array<{ jobName: string; status: string; startedAt: string; durationMs: number; itemsProcessed: number; itemsSucceeded: number; errorMessage: string | null }>;
}

function IndexingPanel({ siteId, onClose }: { siteId: string; onClose: () => void }) {
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load indexing data");
    } finally {
      setLoading(false);
    }
  }, [siteId]);

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
                ["Not Indexed", data.summary.notIndexed, "text-amber-400", "not_indexed"],
                ["Never Sent", data.summary.neverSubmitted, "text-zinc-400", "never_submitted"],
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

            {/* Action row */}
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={submitAll}
                disabled={submitLoading === "all"}
                className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold disabled:opacity-50"
              >
                {submitLoading === "all" ? "⏳ Submitting…" : "📤 Submit All Unsubmitted"}
              </button>
              {submitResult && (
                <span className={`text-xs px-2 py-1 rounded-lg ${submitResult.startsWith("✅") ? "bg-emerald-950/30 text-emerald-300" : "bg-red-950/30 text-red-300"}`}>
                  {submitResult}
                </span>
              )}
            </div>

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

function MissionTab({ data, onRefresh, onSwitchTab, siteId }: { data: CockpitData | null; onRefresh: () => void; onSwitchTab: (tab: TabId) => void; siteId: string }) {
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showIndexPanel, setShowIndexPanel] = useState(false);

  const triggerAction = useCallback(async (endpoint: string, body: object, label: string) => {
    setActionLoading(label);
    setActionResult(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
      setActionResult(`❌ Network error: ${e instanceof Error ? e.message : String(e)}`);
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
      <IndexingPanel siteId={effectiveSiteId} onClose={() => setShowIndexPanel(false)} />
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
          <ActionButton onClick={() => triggerAction("/api/cron/weekly-topics", {}, "Topics")} loading={actionLoading === "Topics"}>
            🔬 Generate Topics
          </ActionButton>
          <ActionButton onClick={() => triggerAction("/api/cron/content-builder", {}, "Content")} loading={actionLoading === "Content"}>
            ✍️ Build Content
          </ActionButton>
          <ActionButton onClick={() => triggerAction("/api/admin/force-publish", { locale: "both", count: 2 }, "Publish")} loading={actionLoading === "Publish"} variant="success">
            📤 Force Publish
          </ActionButton>
          <ActionButton onClick={() => triggerAction("/api/cron/seo-agent", {}, "SEO")} loading={actionLoading === "SEO"}>
            🔍 Submit to Google
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
                  <span className="text-zinc-300 font-medium">"{d.keyword}"</span>
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
      if (action === "re_queue" || action === "delete_draft") body.draftId = id;
      if (action === "delete_post" || action === "unpublish") body.postId = id;
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

      {/* Article table */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card className="text-center py-8">
            <p className="text-zinc-500 text-sm">No articles match the current filter.</p>
          </Card>
        )}
        {filtered.map((item) => {
          const badge = statusBadge(item.status);
          const isExpanded = expandedId === item.id;
          const checks = gateResults[item.id];

          return (
            <Card key={item.id}>
              {/* Article row */}
              <div className="flex flex-wrap gap-2 items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-zinc-500 uppercase">{item.locale}</span>
                    {item.type === "draft" && item.phase === "reservoir" && item.wordCount < 1000 && (
                      <span className="text-xs text-amber-400">📝 Needs expansion ({item.wordCount} words)</span>
                    )}
                    {item.type === "draft" && item.phase === "reservoir" && item.wordCount >= 1000 && item.hoursInPhase > 6 && (
                      <span className="text-xs text-blue-400">📦 Ready — {item.hoursInPhase}h in queue</span>
                    )}
                    {item.type === "draft" && item.status === "stuck" && (
                      <span className="text-xs text-orange-400">⚠️ {item.hoursInPhase}h stuck in pipeline</span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-100 font-medium mt-1 truncate">{item.title || item.slug || item.id}</p>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline truncate block">
                      {item.url}
                    </a>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 text-xs text-zinc-500">
                  <span>{timeAgo(item.generatedAt)}</span>
                  {item.wordCount > 0 && (
                    <span className={item.wordCount < 1000 ? "text-red-400 font-medium" : item.wordCount < 1200 ? "text-amber-400" : "text-zinc-500"}>
                      {item.wordCount.toLocaleString()} words{item.wordCount < 1000 ? " ✗" : item.wordCount < 1200 ? " ⚠" : ""}
                    </span>
                  )}
                  {item.metaDescriptionEn && item.metaDescriptionEn.length > 160 && (
                    <span className="text-amber-400">Meta {item.metaDescriptionEn.length}ch ⚠</span>
                  )}
                  {item.seoScore !== null && (
                    <span className={scoreColor(item.seoScore)}>SEO {item.seoScore}</span>
                  )}
                  <span className={item.internalLinksCount < 3 ? "text-amber-400" : "text-zinc-500"}>{item.internalLinksCount} links{item.internalLinksCount < 3 ? " ⚠️" : ""}</span>
                </div>
              </div>

              {/* Indexing status */}
              {item.indexingStatus && (
                <div className="mt-1 text-xs text-zinc-500">
                  Indexing: <span className={
                    item.indexingStatus === "indexed" ? "text-emerald-400" :
                    item.indexingStatus === "submitted" ? "text-blue-400" :
                    item.indexingStatus === "error" ? "text-red-400" : "text-zinc-400"
                  }>{item.indexingStatus}</span>
                  {item.lastSubmittedAt && <span className="ml-2">(submitted {timeAgo(item.lastSubmittedAt)})</span>}
                </div>
              )}

              {/* Error message */}
              {item.plainError && (
                <p className="mt-1.5 text-xs text-red-400 bg-red-950/20 rounded px-2 py-1">{item.plainError}</p>
              )}

              {/* Action result */}
              {actionResult[item.id] && (
                <p className={`mt-1.5 text-xs rounded px-2 py-1 ${actionResult[item.id].startsWith("✅") ? "bg-emerald-950/30 text-emerald-300" : "bg-red-950/30 text-red-300"}`}>
                  {actionResult[item.id]}
                </p>
              )}

              {/* Action buttons row */}
              <div className="mt-2 flex flex-wrap gap-1.5">
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
                      className="px-2 py-1 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                    >
                      {isExpanded ? "Hide Diagnosis" : "Why Not Published?"}
                    </button>
                    <ActionButton
                      onClick={async () => {
                        setActionLoading(`publish-${item.id}`);
                        try {
                          const r = await fetch("/api/admin/force-publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId: item.id, locale: item.locale, count: 1 }) });
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
                      Publish Now
                    </ActionButton>
                    <ActionButton
                      onClick={async () => {
                        setActionLoading(`enhance-${item.id}`);
                        try {
                          const r = await fetch("/api/admin/content-matrix", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "enhance", draftId: item.id }) });
                          const j = await r.json();
                          setActionResult((prev) => ({ ...prev, [item.id]: j.success !== false ? "✅ Enhancing content — reload in 30s" : `❌ ${j.error ?? "Failed"}` }));
                          fetchData();
                        } catch (e) {
                          setActionResult((prev) => ({ ...prev, [item.id]: `❌ ${e instanceof Error ? e.message : "Error"}` }));
                        } finally { setActionLoading(null); }
                      }}
                      loading={actionLoading === `enhance-${item.id}`}
                    >
                      Expand
                    </ActionButton>
                    <ActionButton
                      onClick={() => doAction("re_queue", item.id, "Re-queued")}
                      loading={actionLoading === `re_queue-${item.id}`}
                    >
                      Re-queue
                    </ActionButton>
                    <ActionButton
                      onClick={() => doAction("delete_draft", item.id, "Deleted")}
                      loading={actionLoading === `delete_draft-${item.id}`}
                      variant="danger"
                    >
                      Delete
                    </ActionButton>
                  </>
                )}
                {item.type === "published" && (
                  <>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        className="px-2 py-1 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700">
                        View Live →
                      </a>
                    )}
                    <ActionButton
                      onClick={async () => {
                        setActionLoading(`index-${item.id}`);
                        try {
                          const r = await fetch(`/api/admin/content-indexing`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit", slugs: [item.slug] }) });
                          const j = await r.json();
                          setActionResult((prev) => ({ ...prev, [item.id]: j.success !== false ? "✅ Submitted to Google" : `❌ ${j.error ?? "Failed"}` }));
                          fetchData();
                        } catch (e) {
                          setActionResult((prev) => ({ ...prev, [item.id]: `❌ ${e instanceof Error ? e.message : "Error"}` }));
                        } finally { setActionLoading(null); }
                      }}
                      loading={actionLoading === `index-${item.id}`}
                    >
                      Submit to Google
                    </ActionButton>
                    <ActionButton onClick={() => doAction("unpublish", item.id, "Unpublished")} loading={actionLoading === `unpublish-${item.id}`} variant="amber">
                      Unpublish
                    </ActionButton>
                    <ActionButton onClick={() => doAction("delete_post", item.id, "Deleted")} loading={actionLoading === `delete_post-${item.id}`} variant="danger">
                      Delete
                    </ActionButton>
                  </>
                )}
              </div>

              {/* Gate check panel */}
              {isExpanded && (
                <div className="mt-3 border-t border-zinc-800 pt-3">
                  <p className="text-xs font-semibold text-zinc-400 mb-2">Why Isn't This Published?</p>
                  {gateLoading === item.id && <p className="text-xs text-zinc-500">Running gate checks…</p>}
                  {checks && (
                    <div className="space-y-1.5">
                      {checks.map((c) => (
                        <div key={c.check} className={`flex items-start gap-2 text-xs rounded p-1.5 ${c.pass ? "bg-zinc-800/30" : c.isBlocker ? "bg-red-950/20" : "bg-amber-950/20"}`}>
                          <span className="shrink-0 mt-0.5">{c.pass ? "✅" : c.isBlocker ? "❌" : "⚠️"}</span>
                          <div>
                            <span className={c.pass ? "text-zinc-400" : c.isBlocker ? "text-red-300" : "text-amber-300"}>
                              {c.label}
                            </span>
                            {!c.pass && c.detail && <p className="text-zinc-500 mt-0.5">{c.detail}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!checks && !gateLoading && (
                    <button onClick={() => runGateCheck(item)} className="text-xs text-blue-400 hover:underline">
                      Run gate check
                    </button>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
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
    fetch(`/api/admin/content-generation-monitor?siteId=${activeSiteId}`)
      .then((r) => r.json())
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

  const summary = (data as { summary?: Record<string, number> })?.summary ?? {};
  const byPhase = (data as { byPhase?: Record<string, number> })?.byPhase ?? {};
  const drafts = (data as { drafts?: unknown[] })?.drafts ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Content Pipeline — {activeSiteId}</SectionTitle>
        <div className="flex flex-wrap gap-3 text-sm mb-3">
          {[
            ["Topics", summary.topics ?? 0, "text-blue-400"],
            ["Building", summary.active ?? 0, "text-amber-400"],
            ["Reservoir", summary.reservoir ?? 0, "text-blue-300"],
            ["Published", summary.published ?? 0, "text-emerald-400"],
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
            {(drafts as ContentItem[]).slice(0, 10).map((d) => (
              <div key={d.id} className="flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <span className="text-zinc-300 truncate block">{d.title || d.slug || d.id}</span>
                  <span className="text-zinc-500 capitalize">{d.phase ?? "unknown"}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-zinc-500">
                  {d.seoScore !== null && d.seoScore !== undefined && (
                    <span className={scoreColor(d.seoScore)}>SEO{d.seoScore}</span>
                  )}
                  <span>{d.wordCount > 0 ? `${d.wordCount}w` : ""}</span>
                </div>
              </div>
            ))}
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
      .then((r) => r.json())
      .then(setData)
      .catch((e) => { setFetchError(e instanceof Error ? e.message : "Failed to load cron data"); setData(null); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runCron = async (endpoint: string, name: string) => {
    setActionLoading(name);
    try {
      const res = await fetch(endpoint, { method: "POST" });
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
    "indexing-cron": "/api/cron/indexing-cron",
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
              for (const step of sequence) {
                try {
                  await fetch(step.path, { method: "POST" });
                } catch { /* continue sequence */ }
              }
              setActionLoading(null);
              setActionResult((prev) => ({ ...prev, "critical-seq": "✅ All 4 steps triggered" }));
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
            error_message?: string; plainError?: string; itemsProcessed?: number
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
                  {isFailed && last.plainError && (
                    <p className="mt-1.5 text-xs text-red-400 bg-red-950/20 rounded px-2 py-1">{last.plainError}</p>
                  )}
                  {isFailed && last.error_message && !last.plainError && (
                    <p className="mt-1.5 text-xs text-red-400">{String(last.error_message).slice(0, 120)}</p>
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
              onClick={() => runCron(endpoint as string, key as string)}
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

// ─── Tab 5: Sites Overview ────────────────────────────────────────────────────

function SitesTab({ sites, onSelectSite }: { sites: SiteSummary[]; onSelectSite: (id: string) => void }) {
  const [publishLoading, setPublishLoading] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<Record<string, string>>({});
  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      console.warn(`[sites] ${label} failed`);
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

            {/* Content gap warning */}
            {daysSincePublish !== null && daysSincePublish > 3 && (
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
      .then((r) => r.json())
      .then((json) => {
        setData(json);
        setRoutes(json.routes ?? []);
      })
      .catch(() => setData(null))
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
      setTestResults(json.results ?? json);
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

function SettingsTab({ system }: { system: SystemStatus | null }) {
  const [flags, setFlags] = useState<Array<{ key: string; enabled: boolean; description: string }>>([]);
  const [flagsLoading, setFlagsLoading] = useState(true);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState<string | null>(null);

  // Migration state
  const [migrationStatus, setMigrationStatus] = useState<"idle" | "scanning" | "migrating" | "done">("idle");
  const [migrationResult, setMigrationResult] = useState<{
    type: "scan" | "migrate";
    missingTables: number;
    missingColumns: number;
    missingIndexes: number;
    needsMigration: boolean;
    indexesCreated?: string[];
    foreignKeysCreated?: string[];
    errors?: string[];
    durationMs?: number;
  } | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/feature-flags")
      .then((r) => r.json())
      .then((j) => setFlags(j.flags ?? []))
      .catch(() => setFlags([]))
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
    try {
      await fetch("/api/admin/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", key, enabled: !enabled }),
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
        <div className="flex gap-2">
          <ActionButton onClick={runMigrationScan} loading={migrationStatus === "scanning"}>
            🔍 Scan Schema
          </ActionButton>
          <ActionButton
            onClick={runMigrationFix}
            loading={migrationStatus === "migrating"}
          >
            🔧 Fix All
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
                {(migrationResult.indexesCreated?.length ?? 0) > 0 && (
                  <p className="text-emerald-400">+ {migrationResult.indexesCreated!.length} indexes created</p>
                )}
                {(migrationResult.foreignKeysCreated?.length ?? 0) > 0 && (
                  <p className="text-emerald-400">+ {migrationResult.foreignKeysCreated!.length} foreign keys created</p>
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
    await fetch("/api/admin/dev-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss", taskId }),
    });
    fetchTasks();
  };

  const completeTask = async (taskId: string) => {
    await fetch("/api/admin/dev-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", taskId }),
    });
    fetchTasks();
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

export default function CockpitPage() {
  const [activeTab, setActiveTab] = useState<TabId>("mission");
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
          <MissionTab data={cockpitData} onRefresh={fetchCockpit} onSwitchTab={setActiveTab} siteId={activeSiteId} />
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
          <SitesTab sites={cockpitData.sites} onSelectSite={handleSiteSelect} />
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
