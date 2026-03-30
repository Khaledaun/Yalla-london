"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface PageIssue {
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
  detectedAt: string | null;
}

interface PageRow {
  id: string;
  title: string;
  slug: string;
  url: string;
  publishedAt: string | null;
  updatedAt: string | null;
  seoScore: number;
  wordCount: number;
  indexingStatus: string;
  coverageState: string | null;
  lastCrawledAt: string | null;
  lastInspectedAt: string | null;
  lastSubmittedAt: string | null;
  submittedIndexnow: boolean;
  submittedSitemap: boolean;
  indexingError: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  issues: PageIssue[];
}

interface AuditSummary {
  totalPages: number;
  indexed: number;
  withIssues: number;
  criticalIssues: number;
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgSeo: number;
}

type SortField =
  | "publishedAt"
  | "title"
  | "clicks"
  | "impressions"
  | "ctr"
  | "position"
  | "seoScore"
  | "wordCount"
  | "lastCrawledAt"
  | "indexingStatus"
  | "issues";

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "publishedAt", label: "Publish Date" },
  { value: "clicks", label: "Most Clicks" },
  { value: "impressions", label: "Most Impressions" },
  { value: "ctr", label: "CTR" },
  { value: "position", label: "Avg Position" },
  { value: "seoScore", label: "SEO Score" },
  { value: "wordCount", label: "Word Count" },
  { value: "lastCrawledAt", label: "Last Crawled" },
  { value: "indexingStatus", label: "Index Status" },
  { value: "issues", label: "Most Issues" },
  { value: "title", label: "Title A-Z" },
];

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function indexBadge(status: string): { bg: string; text: string; label: string } {
  switch (status) {
    case "indexed": return { bg: "bg-emerald-900/40", text: "text-emerald-400", label: "Indexed" };
    case "submitted": return { bg: "bg-blue-900/40", text: "text-blue-400", label: "Submitted" };
    case "discovered": return { bg: "bg-amber-900/40", text: "text-amber-400", label: "Discovered" };
    case "deindexed": return { bg: "bg-red-900/40", text: "text-red-400", label: "De-indexed" };
    case "error": return { bg: "bg-red-900/40", text: "text-red-400", label: "Error" };
    default: return { bg: "bg-zinc-800", text: "text-zinc-500", label: "Not Submitted" };
  }
}

function severityColor(severity: string): string {
  switch (severity) {
    case "critical": return "text-red-400 bg-red-950/40 border-red-800/50";
    case "warning": return "text-amber-400 bg-amber-950/40 border-amber-800/50";
    default: return "text-zinc-400 bg-zinc-800/50 border-zinc-700/50";
  }
}

/* ── Main Page ─────────────────────────────────────────────────────────────── */

export default function PerPageAuditPage() {
  const searchParams = useSearchParams();
  const [siteId, setSiteId] = useState(searchParams.get("siteId") || "yalla-london");
  const [sort, setSort] = useState<SortField>("publishedAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [pages, setPages] = useState<PageRow[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "issues" | "critical" | "not_indexed">("all");

  // Phase 4A: Per-row action states
  const [rowActionLoading, setRowActionLoading] = useState<Record<string, string>>({});
  const [rowActionResults, setRowActionResults] = useState<Record<string, { success: boolean; data: unknown; action: string }>>({});
  const [rowActionExpanded, setRowActionExpanded] = useState<Record<string, boolean>>({});

  // Phase 4B: Bulk action states
  const [bulkLoading, setBulkLoading] = useState<Record<string, boolean>>({});
  const [bulkResult, setBulkResult] = useState<{ success: boolean; message: string; data?: unknown; action: string } | null>(null);
  const [bulkResultExpanded, setBulkResultExpanded] = useState(false);

  const runRowAction = async (pageId: string, actionKey: string, url: string, body: Record<string, unknown>) => {
    setRowActionLoading((prev) => ({ ...prev, [`${pageId}_${actionKey}`]: actionKey }));
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = res.ok ? await res.json().catch(() => ({ ok: true })) : { error: `HTTP ${res.status}` };
      setRowActionResults((prev) => ({
        ...prev,
        [`${pageId}_${actionKey}`]: { success: res.ok, data, action: actionKey },
      }));
      setRowActionExpanded((prev) => ({ ...prev, [`${pageId}_${actionKey}`]: true }));
    } catch (err) {
      setRowActionResults((prev) => ({
        ...prev,
        [`${pageId}_${actionKey}`]: { success: false, data: { error: err instanceof Error ? err.message : "Request failed" }, action: actionKey },
      }));
      setRowActionExpanded((prev) => ({ ...prev, [`${pageId}_${actionKey}`]: true }));
    } finally {
      setRowActionLoading((prev) => {
        const next = { ...prev };
        delete next[`${pageId}_${actionKey}`];
        return next;
      });
    }
  };

  const runBulkAction = async (actionKey: string, url: string, body: Record<string, unknown>) => {
    setBulkLoading((prev) => ({ ...prev, [actionKey]: true }));
    setBulkResult(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = res.ok ? await res.json().catch(() => ({ ok: true })) : { error: `HTTP ${res.status}` };
      setBulkResult({ success: res.ok, message: res.ok ? "Action completed" : (data.error || `Failed (HTTP ${res.status})`), data, action: actionKey });
      setBulkResultExpanded(true);
    } catch (err) {
      setBulkResult({ success: false, message: err instanceof Error ? err.message : "Request failed", action: actionKey });
      setBulkResultExpanded(true);
    } finally {
      setBulkLoading((prev) => ({ ...prev, [actionKey]: false }));
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/per-page-audit?siteId=${encodeURIComponent(siteId)}&sort=${sort}&order=${order}&limit=500`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setPages(data.pages || []);
      setSummary(data.summary || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [siteId, sort, order]);

  useEffect(() => { load(); }, [load]);

  // Apply client-side filter
  const filtered = pages.filter((p) => {
    if (filter === "issues") return p.issues.length > 0;
    if (filter === "critical") return p.issues.some((i) => i.severity === "critical");
    if (filter === "not_indexed") return p.indexingStatus !== "indexed";
    return true;
  });

  const toggleSort = (field: SortField) => {
    if (sort === field) {
      setOrder(order === "desc" ? "asc" : "desc");
    } else {
      setSort(field);
      setOrder(field === "title" ? "asc" : "desc");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Link href="/admin/cockpit" className="text-zinc-500 hover:text-zinc-300 text-sm">
              ← Cockpit
            </Link>
            <h1 className="text-lg font-bold">Per-Page Audit</h1>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
          >
            <option value="yalla-london">Yalla London</option>
            <option value="zenitha-yachts-med">Zenitha Yachts</option>
            <option value="arabaldives">Arabaldives</option>
            <option value="french-riviera">Yalla Riviera</option>
            <option value="istanbul">Yalla Istanbul</option>
            <option value="thailand">Yalla Thailand</option>
          </select>

          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as SortField); }}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <button
            onClick={() => setOrder(order === "desc" ? "asc" : "desc")}
            className="px-2 py-1 text-xs bg-zinc-900 border border-zinc-700 rounded hover:bg-zinc-800"
          >
            {order === "desc" ? "↓ Desc" : "↑ Asc"}
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mt-2 overflow-x-auto">
          {([
            { key: "all", label: "All", count: pages.length },
            { key: "issues", label: "Has Issues", count: pages.filter((p) => p.issues.length > 0).length },
            { key: "critical", label: "Critical", count: pages.filter((p) => p.issues.some((i) => i.severity === "critical")).length },
            { key: "not_indexed", label: "Not Indexed", count: pages.filter((p) => p.indexingStatus !== "indexed").length },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                filter === tab.key
                  ? "bg-blue-900/50 text-blue-300 border border-blue-700/50"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-2 px-4 py-3">
          <div className="bg-zinc-900 rounded-lg p-2 text-center border border-zinc-800">
            <div className="text-lg font-bold text-emerald-400">{summary.indexed}</div>
            <div className="text-[10px] text-zinc-500">Indexed</div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-2 text-center border border-zinc-800">
            <div className="text-lg font-bold text-blue-400">{summary.totalClicks.toLocaleString()}</div>
            <div className="text-[10px] text-zinc-500">Clicks (7d)</div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-2 text-center border border-zinc-800">
            <div className="text-lg font-bold text-violet-400">{summary.totalImpressions.toLocaleString()}</div>
            <div className="text-[10px] text-zinc-500">Impr (7d)</div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-2 text-center border border-zinc-800">
            <div className={`text-lg font-bold ${summary.criticalIssues > 0 ? "text-red-400" : "text-zinc-400"}`}>
              {summary.criticalIssues}
            </div>
            <div className="text-[10px] text-zinc-500">Critical</div>
          </div>
        </div>
      )}

      {/* Phase 4B: Sticky Quick Actions Bar */}
      {!loading && pages.length > 0 && (
        <div className="mx-4 mb-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 space-y-2">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => runBulkAction("submit_all", "/api/admin/content-indexing", { action: "submit_all", siteId })}
              disabled={!!bulkLoading["submit_all"]}
              className="px-3 py-1.5 text-xs font-medium rounded bg-emerald-900/60 text-emerald-300 hover:bg-emerald-800/60 border border-emerald-700/50 disabled:opacity-50"
            >
              {bulkLoading["submit_all"] ? (
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /> Submitting…</span>
              ) : (
                "Submit All Never-Indexed"
              )}
            </button>
            <button
              onClick={() => runBulkAction("full_audit", "/api/admin/seo-audit", { action: "full_audit", siteId })}
              disabled={!!bulkLoading["full_audit"]}
              className="px-3 py-1.5 text-xs font-medium rounded bg-blue-900/60 text-blue-300 hover:bg-blue-800/60 border border-blue-700/50 disabled:opacity-50"
            >
              {bulkLoading["full_audit"] ? (
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> Running…</span>
              ) : (
                "Run Full Audit"
              )}
            </button>
            <button
              onClick={() => runBulkAction("refresh_gsc", "/api/admin/departures", { action: "do_now", path: "/api/cron/gsc-sync" })}
              disabled={!!bulkLoading["refresh_gsc"]}
              className="px-3 py-1.5 text-xs font-medium rounded bg-violet-900/60 text-violet-300 hover:bg-violet-800/60 border border-violet-700/50 disabled:opacity-50"
            >
              {bulkLoading["refresh_gsc"] ? (
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /> Syncing…</span>
              ) : (
                "Refresh GSC Data"
              )}
            </button>
          </div>

          {/* Bulk result banner */}
          {bulkResult && (
            <div className={`rounded px-3 py-2 text-xs border ${bulkResult.success ? "bg-emerald-950/30 border-emerald-800/50 text-emerald-300" : "bg-red-950/30 border-red-800/50 text-red-300"}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{bulkResult.action}: {bulkResult.message}</span>
                <div className="flex items-center gap-2">
                  {bulkResult.data && (
                    <button
                      onClick={() => setBulkResultExpanded(!bulkResultExpanded)}
                      className="text-[10px] text-zinc-400 hover:text-zinc-200"
                    >
                      {bulkResultExpanded ? "▲ Hide" : "▼ Details"}
                    </button>
                  )}
                  <button onClick={() => setBulkResult(null)} className="text-zinc-500 hover:text-zinc-300 text-[10px]">✕</button>
                </div>
              </div>
              {bulkResultExpanded && bulkResult.data && (
                <pre className="mt-2 p-2 bg-black/30 rounded text-[10px] text-zinc-300 overflow-auto max-h-48 whitespace-pre-wrap">
                  {JSON.stringify(bulkResult.data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mb-3 p-3 rounded bg-red-950/40 border border-red-800/50 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-zinc-500">Loading audit data…</div>
      )}

      {/* Page List */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-zinc-500">No pages found{filter !== "all" ? " matching filter" : ""}.</div>
      )}

      <div className="px-4 pb-24 space-y-2">
        {filtered.map((page) => {
          const isExpanded = expandedRow === page.id;
          const badge = indexBadge(page.indexingStatus);
          const hasCritical = page.issues.some((i) => i.severity === "critical");

          return (
            <div
              key={page.id}
              className={`rounded-lg border transition-colors ${
                hasCritical
                  ? "bg-red-950/20 border-red-800/40"
                  : page.issues.length > 0
                  ? "bg-amber-950/10 border-amber-800/30"
                  : "bg-zinc-900 border-zinc-800"
              }`}
            >
              {/* Row header — tappable */}
              <button
                onClick={() => setExpandedRow(isExpanded ? null : page.id)}
                className="w-full text-left p-3"
              >
                {/* Title + status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">{page.title}</p>
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">/blog/{page.slug}</p>
                  </div>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                    {badge.label}
                  </span>
                </div>

                {/* Quick stats row */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-zinc-400">
                  <span>Published {formatDate(page.publishedAt)}</span>
                  <span>Crawled {timeAgo(page.lastCrawledAt)}</span>
                  <span className={page.seoScore >= 70 ? "text-emerald-400" : page.seoScore >= 50 ? "text-amber-400" : "text-red-400"}>
                    SEO {page.seoScore}
                  </span>
                  <span>{page.wordCount.toLocaleString()}w</span>
                </div>

                {/* GSC stats */}
                <div className="flex gap-x-4 mt-1.5 text-[11px]">
                  <span className="text-blue-400">{page.clicks} clicks</span>
                  <span className="text-violet-400">{page.impressions.toLocaleString()} impr</span>
                  <span className={page.ctr >= 3 ? "text-emerald-400" : page.ctr >= 1 ? "text-amber-400" : "text-zinc-500"}>
                    {page.ctr}% CTR
                  </span>
                  {page.position > 0 && (
                    <span className={page.position <= 10 ? "text-emerald-400" : page.position <= 20 ? "text-amber-400" : "text-zinc-500"}>
                      Pos {page.position}
                    </span>
                  )}
                </div>

                {/* Issues summary inline */}
                {page.issues.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {page.issues.map((issue, i) => (
                      <span
                        key={i}
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] border ${severityColor(issue.severity)}`}
                      >
                        {issue.message.length > 40 ? issue.message.slice(0, 37) + "…" : issue.message}
                      </span>
                    ))}
                  </div>
                )}

                {/* Expand indicator */}
                <div className="text-[10px] text-zinc-600 mt-1.5">
                  {isExpanded ? "▲ Less" : "▼ Details"}
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-zinc-800/50 pt-2 space-y-3">
                  {/* Full URL */}
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">URL</p>
                    <a href={page.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 underline break-all">
                      {page.url}
                    </a>
                  </div>

                  {/* Timeline */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Published</p>
                      <p className="text-xs">{formatDate(page.publishedAt)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Last Updated</p>
                      <p className="text-xs">{formatDate(page.updatedAt)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Last Crawled</p>
                      <p className="text-xs">{page.lastCrawledAt ? formatDate(page.lastCrawledAt) : "Never"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Last Inspected</p>
                      <p className="text-xs">{page.lastInspectedAt ? formatDate(page.lastInspectedAt) : "Never"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Last Submitted</p>
                      <p className="text-xs">{page.lastSubmittedAt ? formatDate(page.lastSubmittedAt) : "Never"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Coverage</p>
                      <p className="text-xs">{page.coverageState || "Unknown"}</p>
                    </div>
                  </div>

                  {/* Submission channels */}
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Submission Channels</p>
                    <div className="flex gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${page.submittedIndexnow ? "bg-emerald-900/40 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                        IndexNow {page.submittedIndexnow ? "✓" : "✗"}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${page.submittedSitemap ? "bg-emerald-900/40 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                        Sitemap {page.submittedSitemap ? "✓" : "✗"}
                      </span>
                    </div>
                  </div>

                  {/* GSC Performance detail */}
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Google Search Performance (7 days)</p>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-zinc-950 rounded p-1.5 text-center">
                        <div className="text-sm font-bold text-blue-400">{page.clicks}</div>
                        <div className="text-[10px] text-zinc-500">Clicks</div>
                      </div>
                      <div className="bg-zinc-950 rounded p-1.5 text-center">
                        <div className="text-sm font-bold text-violet-400">{page.impressions.toLocaleString()}</div>
                        <div className="text-[10px] text-zinc-500">Impressions</div>
                      </div>
                      <div className="bg-zinc-950 rounded p-1.5 text-center">
                        <div className={`text-sm font-bold ${page.ctr >= 3 ? "text-emerald-400" : page.ctr >= 1 ? "text-amber-400" : "text-zinc-400"}`}>
                          {page.ctr}%
                        </div>
                        <div className="text-[10px] text-zinc-500">CTR</div>
                      </div>
                      <div className="bg-zinc-950 rounded p-1.5 text-center">
                        <div className={`text-sm font-bold ${page.position <= 10 ? "text-emerald-400" : page.position <= 20 ? "text-amber-400" : "text-zinc-400"}`}>
                          {page.position > 0 ? page.position : "—"}
                        </div>
                        <div className="text-[10px] text-zinc-500">Position</div>
                      </div>
                    </div>
                  </div>

                  {/* Issues detail */}
                  {page.issues.length > 0 && (
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Issues ({page.issues.length})</p>
                      <div className="space-y-1.5">
                        {page.issues.map((issue, i) => (
                          <div key={i} className={`rounded px-2 py-1.5 border text-xs ${severityColor(issue.severity)}`}>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium uppercase text-[10px] opacity-70">{issue.type}</span>
                              <span className="font-medium uppercase text-[10px] px-1 rounded bg-black/20">
                                {issue.severity}
                              </span>
                            </div>
                            <p className="mt-0.5">{issue.message}</p>
                            {issue.detectedAt && (
                              <p className="text-[10px] opacity-60 mt-0.5">Detected {timeAgo(issue.detectedAt)}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Indexing error */}
                  {page.indexingError && (
                    <div className="rounded px-2 py-1.5 bg-red-950/30 border border-red-800/40 text-xs text-red-400">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Indexing Error</p>
                      {page.indexingError}
                    </div>
                  )}

                  {/* Phase 4A: Per-row action buttons */}
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Actions</p>
                    <div className="flex flex-wrap gap-2">
                      {/* Audit This URL */}
                      <button
                        onClick={() => runRowAction(page.id, "audit_url", "/api/admin/seo-audit", { action: "audit_url", url: page.url, siteId })}
                        disabled={!!rowActionLoading[`${page.id}_audit_url`]}
                        className="px-2.5 py-1 text-xs font-medium rounded bg-blue-900/60 text-blue-300 hover:bg-blue-800/60 border border-blue-700/50 disabled:opacity-50"
                      >
                        {rowActionLoading[`${page.id}_audit_url`] ? (
                          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> Auditing…</span>
                        ) : (
                          "Audit This URL"
                        )}
                      </button>

                      {/* Submit to Google — only when not indexed */}
                      {page.indexingStatus !== "indexed" && (
                        <button
                          onClick={() => runRowAction(page.id, "submit_google", "/api/admin/content-indexing", { action: "submit", slug: page.slug, siteId })}
                          disabled={!!rowActionLoading[`${page.id}_submit_google`]}
                          className="px-2.5 py-1 text-xs font-medium rounded bg-emerald-900/60 text-emerald-300 hover:bg-emerald-800/60 border border-emerald-700/50 disabled:opacity-50"
                        >
                          {rowActionLoading[`${page.id}_submit_google`] ? (
                            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /> Submitting…</span>
                          ) : (
                            "Submit to Google"
                          )}
                        </button>
                      )}

                      {/* Run SEO Fix */}
                      <button
                        onClick={() => runRowAction(page.id, "seo_fix", "/api/admin/seo-intelligence", { action: "fix_article", articleId: page.id, siteId })}
                        disabled={!!rowActionLoading[`${page.id}_seo_fix`]}
                        className="px-2.5 py-1 text-xs font-medium rounded bg-amber-900/60 text-amber-300 hover:bg-amber-800/60 border border-amber-700/50 disabled:opacity-50"
                      >
                        {rowActionLoading[`${page.id}_seo_fix`] ? (
                          <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /> Fixing…</span>
                        ) : (
                          "Run SEO Fix"
                        )}
                      </button>
                    </div>

                    {/* Per-row action result panels */}
                    {(["audit_url", "submit_google", "seo_fix"] as const).map((actionKey) => {
                      const resultKey = `${page.id}_${actionKey}`;
                      const result = rowActionResults[resultKey];
                      if (!result) return null;
                      const isResultExpanded = rowActionExpanded[resultKey] ?? false;
                      const actionLabel = actionKey === "audit_url" ? "Audit" : actionKey === "submit_google" ? "Submit" : "SEO Fix";
                      return (
                        <div
                          key={actionKey}
                          className={`mt-2 rounded border text-xs ${result.success ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300" : "bg-red-950/20 border-red-800/40 text-red-300"}`}
                        >
                          <button
                            onClick={() => setRowActionExpanded((prev) => ({ ...prev, [resultKey]: !isResultExpanded }))}
                            className="w-full text-left px-2.5 py-1.5 flex items-center justify-between"
                          >
                            <span className="font-medium">{actionLabel}: {result.success ? "Success" : "Failed"}</span>
                            <span className="text-[10px] text-zinc-400">{isResultExpanded ? "▲" : "▼"}</span>
                          </button>
                          {isResultExpanded && result.data && (
                            <div className="px-2.5 pb-2">
                              {typeof result.data === "object" && result.data !== null ? (
                                <div className="space-y-0.5">
                                  {Object.entries(result.data as Record<string, unknown>).map(([k, v]) => (
                                    <div key={k} className="flex gap-2 text-[10px]">
                                      <span className="text-zinc-500 shrink-0 font-mono">{k}:</span>
                                      <span className="text-zinc-300 break-all">
                                        {typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? "—")}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <pre className="p-1.5 bg-black/30 rounded text-[10px] text-zinc-300 overflow-auto max-h-32 whitespace-pre-wrap">
                                  {JSON.stringify(result.data, null, 2)}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
