"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { RefreshCw, ExternalLink, Copy, Wrench, TrendingUp, TrendingDown, Filter, ArrowUpDown, Search } from "lucide-react";
import {
  AdminCard, AdminAlertBanner, AdminButton, AdminSectionLabel, AdminStatusBadge,
  AdminKPICard, AdminPageHeader, AdminLoadingState, AdminEmptyState,
} from "@/components/admin/admin-ui";
import { safeSessionGetJSON, safeSessionSetJSON } from "@/lib/safe-storage";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SEOData {
  indexed: number;
  total: number;
  rate: number;
  neverSubmitted: number;
  errors: number;
  chronicFailures: number;
  gscClicks7d: number;
  gscImpressions7d: number;
  gscClicksTrend: number | null;
  gscImpressionsTrend: number | null;
  avgPosition: number | null;
  avgCtr: number | null;
  topPages: Array<{ url: string; clicks: number; impressions: number; ctr: number; position: number }>;
  issues: Array<{ severity: string; message: string; count: number; fixEndpoint?: string; fixPayload?: Record<string, unknown> }>;
}

type TabId = "overview" | "gsc" | "audit";

const VALID_TABS: TabId[] = ["overview", "gsc", "audit"];
const AUDIT_SESSION_KEY = "intelligence_auditResult";

export default function IntelligencePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlTab = searchParams.get("tab") as TabId | null;
  const [tab, setTabState] = useState<TabId>(urlTab && VALID_TABS.includes(urlTab) ? urlTab : "overview");
  const setTab = (t: TabId) => {
    setTabState(t);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  const [data, setData] = useState<SEOData | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditResult, setAuditResult] = useState<Record<string, unknown> | null>(() => {
    if (typeof window === "undefined") return null;
    return safeSessionGetJSON<Record<string, unknown>>(AUDIT_SESSION_KEY);
  });
  const [fixingIssue, setFixingIssue] = useState<number | null>(null);
  const [fixResult, setFixResult] = useState<{ idx: number; ok: boolean; msg: string } | null>(null);
  const [showAllAuditIssues, setShowAllAuditIssues] = useState(false);
  const fixResultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Phase 3B: Audit drill-down state
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<string>("all");
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<string>("all");
  const [auditSortKey, setAuditSortKey] = useState<"severity" | "category" | "title">("severity");
  const [auditHistory, setAuditHistory] = useState<Array<{
    id: string; healthScore: number; totalFindings: number;
    criticalCount: number; highCount: number; mediumCount: number; lowCount: number;
    summary: string | null; triggeredBy: string; createdAt: string;
  }>>([]);
  const [auditHistoryLoading, setAuditHistoryLoading] = useState(false);

  type TopPagesSortKey = "clicks" | "impressions" | "ctr" | "position" | "clicks_asc" | "impressions_asc" | "ctr_asc" | "position_asc";
  const [topPagesSort, setTopPagesSort] = useState<TopPagesSortKey>("clicks");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cockpitRes, indexingRes] = await Promise.all([
        fetch("/api/admin/cockpit"),
        fetch("/api/admin/content-indexing"),
      ]);

      const cockpit = cockpitRes.ok ? await cockpitRes.json() : null;
      const indexing = indexingRes.ok ? await indexingRes.json() : null;

      // Cockpit provides pipeline/indexing overview
      const ix = cockpit?.indexing || {};
      // Content-indexing API provides GSC performance + per-article data
      const gsc = indexing?.gscPerformance || indexing?.gsc || {};
      const topPages: Array<{ url: string; clicks: number; impressions: number; ctr: number; position: number }> =
        (gsc.topPages || gsc.pages || []).slice(0, 10).map((p: Record<string, unknown>) => ({
          url: (p.url || p.page || "") as string,
          clicks: (p.clicks ?? 0) as number,
          impressions: (p.impressions ?? 0) as number,
          ctr: (p.ctr ?? 0) as number,
          position: (p.position ?? 0) as number,
        }));

      setData({
        indexed: ix.indexed || 0,
        total: ix.total || 0,
        rate: ix.rate || 0,
        neverSubmitted: ix.neverSubmitted || 0,
        errors: ix.errors || 0,
        chronicFailures: ix.chronicFailures || 0,
        gscClicks7d: gsc.totalClicks ?? gsc.gscTotalClicks7d ?? ix.gscTotalClicks7d ?? 0,
        gscImpressions7d: gsc.totalImpressions ?? gsc.gscTotalImpressions7d ?? ix.gscTotalImpressions7d ?? 0,
        gscClicksTrend: gsc.clicksTrend ?? gsc.gscClicksTrend ?? ix.gscClicksTrend ?? null,
        gscImpressionsTrend: gsc.impressionsTrend ?? gsc.gscImpressionsTrend ?? ix.gscImpressionsTrend ?? null,
        avgPosition: gsc.avgPosition ?? null,
        avgCtr: gsc.avgCtr ?? null,
        topPages,
        issues: (ix.blockers || []).map((b: { reason: string; count: number; severity: string }) => ({
          severity: b.severity,
          message: b.reason,
          count: b.count,
        })),
      });
    } catch (err) {
      console.warn("[intelligence] fetch failed:", err instanceof Error ? err.message : err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-poll every 30s
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) {
      intervalRef.current = setInterval(() => { fetchData(); }, 30_000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchData]);

  // Auto-clear fixResult after 5s so stale ✓/✗ badges don't linger
  useEffect(() => {
    if (fixResultTimerRef.current) clearTimeout(fixResultTimerRef.current);
    if (fixResult) {
      fixResultTimerRef.current = setTimeout(() => setFixResult(null), 5000);
    }
    return () => { if (fixResultTimerRef.current) clearTimeout(fixResultTimerRef.current); };
  }, [fixResult]);

  const runPublicAudit = async () => {
    setAuditRunning(true);
    setAuditResult(null);
    try {
      const res = await fetch("/api/admin/aggregated-report");
      if (res.ok) {
        const result = await res.json();
        setAuditResult(result);
        safeSessionSetJSON(AUDIT_SESSION_KEY, result);
      }
    } catch (err) {
      console.warn("[intelligence] audit failed:", err instanceof Error ? err.message : err);
    } finally {
      setAuditRunning(false);
    }
  };

  // Phase 3B: Fetch audit history for trend comparison
  const fetchAuditHistory = useCallback(async () => {
    setAuditHistoryLoading(true);
    try {
      const res = await fetch("/api/admin/audit-history?limit=10");
      if (!res.ok) {
        console.warn("[intelligence] audit-history fetch failed:", res.status);
        return;
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.reports)) {
        setAuditHistory(json.reports);
      }
    } catch (err) {
      console.warn("[intelligence] audit-history error:", err instanceof Error ? err.message : err);
    } finally {
      setAuditHistoryLoading(false);
    }
  }, []);

  // Load audit history when switching to audit tab
  useEffect(() => {
    if (tab === "audit" && auditHistory.length === 0 && !auditHistoryLoading) {
      fetchAuditHistory();
    }
  }, [tab, auditHistory.length, auditHistoryLoading, fetchAuditHistory]);

  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const copyAsJson = async (obj: unknown) => {
    const text = JSON.stringify(obj, null, 2);
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setCopyFeedback("Copied!");
        setTimeout(() => setCopyFeedback(null), 2000);
        return;
      }
    } catch { /* falls through to textarea fallback */ }
    // iOS Safari fallback — textarea + execCommand
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
      document.body.appendChild(el);
      el.select();
      el.setSelectionRange(0, text.length);
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopyFeedback("Copied!");
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback("Copy failed — tap and hold to select");
      setTimeout(() => setCopyFeedback(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--admin-bg)] p-4 md:p-6">
        <AdminLoadingState label="Loading SEO intelligence..." />
      </div>
    );
  }

  const d = data || {
    indexed: 0, total: 0, rate: 0, neverSubmitted: 0, errors: 0, chronicFailures: 0,
    gscClicks7d: 0, gscImpressions7d: 0, gscClicksTrend: null, gscImpressionsTrend: null,
    avgPosition: null, avgCtr: null, topPages: [], issues: [],
  };

  const sortedTopPages = (() => {
    const pages = [...d.topPages];
    const baseKey = topPagesSort.replace(/_asc$/, "") as "clicks" | "impressions" | "ctr" | "position";
    const asc = topPagesSort.endsWith("_asc");
    pages.sort((a, b) => {
      const av = a[baseKey] ?? 0;
      const bv = b[baseKey] ?? 0;
      return asc ? av - bv : bv - av;
    });
    return pages;
  })();

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] p-4 md:p-6">
      <div className="space-y-5 max-w-4xl mx-auto">
        {/* Header */}
        <AdminPageHeader
          title="SEO Intelligence"
          subtitle="Search performance & indexing health"
          action={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`text-[10px] px-2 py-0.5 rounded-full border ${autoRefresh ? "bg-green-50 border-green-300 text-green-700" : "bg-stone-100 border-stone-300 text-stone-500"}`}
              >
                {autoRefresh ? "Auto" : "Paused"}
              </button>
              <AdminButton variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              </AdminButton>
            </div>
          }
        />

        {/* Tabs */}
        <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
          {([
            { id: "overview" as const, label: "Overview" },
            { id: "gsc" as const, label: "Search Console" },
            { id: "audit" as const, label: "Public Audit" },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium uppercase tracking-wide transition-colors ${
                tab === t.id ? "bg-white text-stone-800 shadow-sm font-semibold" : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div className="space-y-4">
            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <AdminKPICard label="Indexed" value={d.indexed} />
              <AdminKPICard label="Rate" value={`${d.rate}%`} trend={d.rate > 80 ? { value: d.rate, positive: true } : d.rate > 50 ? { value: d.rate, positive: true } : { value: d.rate, positive: false }} />
              <AdminKPICard label="Clicks (7d)" value={d.gscClicks7d} trend={d.gscClicksTrend !== null ? { value: Math.abs(d.gscClicksTrend), positive: d.gscClicksTrend > 0 } : undefined} />
              <AdminKPICard label="Impressions (7d)" value={d.gscImpressions7d.toLocaleString()} />
            </div>

            {/* Issues */}
            {d.issues.length > 0 && (
              <AdminCard>
                <div className="flex items-center justify-between mb-3">
                  <AdminSectionLabel>Issues</AdminSectionLabel>
                  <AdminButton variant="ghost" size="sm" onClick={() => copyAsJson(d.issues)}>
                    <Copy size={11} /> Copy JSON
                  </AdminButton>
                </div>
                <div className="space-y-2">
                  {d.issues.map((issue, i) => (
                    <div key={i} className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-md px-3 py-2">
                      <div className="flex items-center gap-2">
                        <AdminStatusBadge status={issue.severity === "critical" ? "error" : issue.severity === "warning" ? "warning" : "info"} label={issue.severity} />
                        <span className="text-sm text-stone-800">{issue.message}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-stone-600">{issue.count}</span>
                        {issue.fixEndpoint && (
                          <AdminButton variant="secondary" size="sm" disabled={fixingIssue === i} onClick={async () => {
                            setFixingIssue(i); setFixResult(null);
                            try {
                              const res = await fetch(issue.fixEndpoint!, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(issue.fixPayload || {}) });
                              if (!res.ok) { setFixResult({ idx: i, ok: false, msg: `HTTP ${res.status}` }); return; }
                              setFixResult({ idx: i, ok: true, msg: "Fixed" });
                              fetchData();
                            } catch (err) { console.warn("[intelligence] fix failed:", err); setFixResult({ idx: i, ok: false, msg: "Failed" }); }
                            finally { setFixingIssue(null); }
                          }}>
                            {fixingIssue === i ? <RefreshCw size={10} className="animate-spin" /> : <Wrench size={10} />} {fixingIssue === i ? "Fixing…" : fixResult?.idx === i ? (fixResult.ok ? "✓" : "✗") : "Fix"}
                          </AdminButton>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </AdminCard>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              <AdminKPICard label="Never Submitted" value={d.neverSubmitted} />
              <AdminKPICard label="Errors" value={d.errors} />
              <AdminKPICard label="Chronic Failures" value={d.chronicFailures} />
            </div>
          </div>
        )}

        {/* GSC TAB */}
        {tab === "gsc" && (
          <div className="space-y-4">
            <AdminAlertBanner severity="info" message="GSC data syncs via the gsc-sync cron every 4 hours. For real-time data, open Google Search Console directly." />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <AdminKPICard label="Clicks (7d)" value={d.gscClicks7d} />
              <AdminKPICard label="Impressions (7d)" value={d.gscImpressions7d.toLocaleString()} />
              <AdminKPICard label="Avg Position" value={d.avgPosition !== null ? d.avgPosition.toFixed(1) : "—"} />
              <AdminKPICard label="Avg CTR" value={d.avgCtr !== null ? `${(d.avgCtr * 100).toFixed(1)}%` : "—"} />
            </div>

            {d.topPages.length > 0 && (
              <AdminCard>
                <div className="flex items-center justify-between">
                  <AdminSectionLabel>Top Pages (7d)</AdminSectionLabel>
                  <div className="flex items-center gap-1 text-[10px]">
                    {(["clicks", "impressions", "ctr", "position"] as const).map((col) => (
                      <button
                        key={col}
                        onClick={() => setTopPagesSort((prev) => prev === col ? `${col}_asc` as typeof prev : col)}
                        className={`px-2 py-0.5 rounded border transition-colors ${
                          topPagesSort === col || topPagesSort === `${col}_asc`
                            ? "bg-stone-800 text-white border-stone-800"
                            : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
                        }`}
                      >
                        {col === "ctr" ? "CTR" : col === "position" ? "Pos" : col.charAt(0).toUpperCase() + col.slice(1)}
                        {topPagesSort === col ? " ↓" : topPagesSort === `${col}_asc` ? " ↑" : ""}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1 mt-2">
                  {sortedTopPages.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-md px-3 py-1.5 text-xs">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-stone-700 hover:text-blue-700 truncate max-w-[55%] flex items-center gap-1">
                        {p.url.replace(/^https?:\/\/[^/]+/, "")}
                        <ExternalLink size={10} className="shrink-0 opacity-40" />
                      </a>
                      <div className="flex items-center gap-3 text-stone-500">
                        <span>{p.clicks} clicks</span>
                        <span>{p.impressions} imp</span>
                        <span title={`CTR: ${(p.ctr * 100).toFixed(2)}%`}>{(p.ctr * 100).toFixed(1)}%</span>
                        <span>pos {p.position.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </AdminCard>
            )}

            <AdminCard>
              <AdminSectionLabel>Deeper Analysis</AdminSectionLabel>
              <div className="space-y-2">
                <Link href="/admin/seo-audits" className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-md px-3 py-2 hover:bg-stone-100 transition-colors">
                  <span className="text-sm text-stone-800">SEO Audits</span>
                  <ExternalLink size={12} className="text-stone-400" />
                </Link>
                <Link href="/admin/cockpit?tab=seo" className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-md px-3 py-2 hover:bg-stone-100 transition-colors">
                  <span className="text-sm text-stone-800">SEO Intel (Legacy)</span>
                  <ExternalLink size={12} className="text-stone-400" />
                </Link>
                <Link href="/admin/discovery" className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-md px-3 py-2 hover:bg-stone-100 transition-colors">
                  <span className="text-sm text-stone-800">Discovery Monitor</span>
                  <ExternalLink size={12} className="text-stone-400" />
                </Link>
              </div>
            </AdminCard>
          </div>
        )}

        {/* AUDIT TAB */}
        {tab === "audit" && (
          <div className="space-y-4">
            {/* Run Audit */}
            <AdminCard>
              <AdminSectionLabel>Public SEO Audit</AdminSectionLabel>
              <p className="text-sm text-[var(--admin-text-muted)] mb-3">
                Run a full aggregated report across SEO, indexing, discovery, content velocity, and public website health.
              </p>
              <div className="flex gap-2">
                <AdminButton variant="primary" loading={auditRunning} onClick={runPublicAudit}>
                  Run Full Audit
                </AdminButton>
                {auditResult && (
                  <AdminButton variant="ghost" onClick={() => copyAsJson(auditResult)}>
                    <Copy size={11} /> {copyFeedback || "Copy JSON"}
                  </AdminButton>
                )}
              </div>
            </AdminCard>

            {auditResult && (() => {
              const report = auditResult as {
                compositeScore?: number;
                grade?: string;
                scores?: Record<string, { score: number; weight: number }>;
                issues?: Array<{ severity: string; category: string; title: string; detail?: string; rootCause?: string; fixAction?: string }>;
              };
              const allIssues = report.issues || [];
              const scores = report.scores || {};

              // Severity ordering for sort
              const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

              // Filter
              const filteredIssues = allIssues.filter((iss) => {
                if (auditSeverityFilter !== "all" && iss.severity !== auditSeverityFilter) return false;
                if (auditCategoryFilter !== "all" && iss.category !== auditCategoryFilter) return false;
                return true;
              });

              // Sort
              const sortedIssues = [...filteredIssues].sort((a, b) => {
                if (auditSortKey === "severity") return (sevOrder[a.severity] ?? 5) - (sevOrder[b.severity] ?? 5);
                if (auditSortKey === "category") return (a.category || "").localeCompare(b.category || "");
                return (a.title || "").localeCompare(b.title || "");
              });

              const visible = showAllAuditIssues ? sortedIssues : sortedIssues.slice(0, 15);
              const uniqueCategories = [...new Set<string>(allIssues.map((i) => i.category).filter(Boolean))].sort();

              return (
                <>
                  {/* Overall Score + Grade */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <AdminKPICard label="Overall Score" value={report.compositeScore ?? 0} />
                    <AdminKPICard label="Grade" value={report.grade || "?"} />
                    <AdminKPICard label="Total Issues" value={allIssues.length} />
                  </div>

                  {/* Sub-Score Breakdown */}
                  {Object.keys(scores).length > 0 && (
                    <AdminCard>
                      <AdminSectionLabel>Score Breakdown</AdminSectionLabel>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                        {([
                          { key: "seoAudit", label: "SEO Audit" },
                          { key: "discovery", label: "Discovery" },
                          { key: "indexing", label: "Indexing" },
                          { key: "contentVelocity", label: "Content Velocity" },
                          { key: "operations", label: "Operations" },
                          { key: "publicWebsite", label: "Public Website" },
                        ] as const).map(({ key, label }) => {
                          const s = scores[key];
                          if (!s) return null;
                          const pct = Math.round(s.score);
                          return (
                            <div key={key} className="bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-lg p-3">
                              <div className="text-[10px] uppercase tracking-wide text-[var(--admin-text-muted)] mb-1">{label}</div>
                              <div className="flex items-end gap-1.5">
                                <span className="text-xl font-bold text-[var(--admin-text)]">{pct}</span>
                                <span className="text-xs text-[var(--admin-text-muted)] mb-0.5">/ 100</span>
                              </div>
                              <div className="mt-1.5 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: pct >= 80 ? "var(--admin-green)" : pct >= 50 ? "var(--admin-gold)" : "var(--admin-red)",
                                  }}
                                />
                              </div>
                              <div className="text-[9px] text-[var(--admin-text-muted)] mt-1">Weight: {Math.round(s.weight * 100)}%</div>
                            </div>
                          );
                        })}
                      </div>
                    </AdminCard>
                  )}

                  {/* Filters & Sort Controls */}
                  <AdminCard>
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Filter size={12} className="text-[var(--admin-text-muted)]" />
                        <select
                          value={auditSeverityFilter}
                          onChange={(e) => setAuditSeverityFilter(e.target.value)}
                          className="text-xs border border-[var(--admin-border)] rounded-md px-2 py-1 bg-white text-[var(--admin-text)]"
                        >
                          <option value="all">All Severities</option>
                          <option value="critical">Critical</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                          <option value="info">Info</option>
                        </select>
                        <select
                          value={auditCategoryFilter}
                          onChange={(e) => setAuditCategoryFilter(e.target.value)}
                          className="text-xs border border-[var(--admin-border)] rounded-md px-2 py-1 bg-white text-[var(--admin-text)]"
                        >
                          <option value="all">All Categories</option>
                          {uniqueCategories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ArrowUpDown size={12} className="text-[var(--admin-text-muted)]" />
                        {(["severity", "category", "title"] as const).map((sk) => (
                          <button
                            key={sk}
                            onClick={() => setAuditSortKey(sk)}
                            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                              auditSortKey === sk
                                ? "bg-stone-800 text-white border-stone-800"
                                : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
                            }`}
                          >
                            {sk.charAt(0).toUpperCase() + sk.slice(1)}
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] text-[var(--admin-text-muted)] ml-auto">
                        {filteredIssues.length} of {allIssues.length} issues
                      </span>
                    </div>

                    {/* Issue List */}
                    <AdminSectionLabel>Issues</AdminSectionLabel>
                    {visible.length === 0 ? (
                      <AdminEmptyState icon={Search} title="No issues match" description="Adjust filters or run a new audit." />
                    ) : (
                      <div className="space-y-1 mt-2">
                        {visible.map((issue, i) => (
                          <div key={i} className="flex items-start justify-between bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-md px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <AdminStatusBadge status={issue.severity === "critical" ? "error" : issue.severity === "high" ? "warning" : "info"} label={issue.severity} />
                                <span className="text-[10px] uppercase tracking-wide text-[var(--admin-text-muted)] bg-stone-100 px-1.5 py-0.5 rounded">{issue.category}</span>
                                <span className="text-sm text-[var(--admin-text)]">{issue.title}</span>
                              </div>
                              {issue.detail && <p className="text-xs text-[var(--admin-text-muted)] mt-1 truncate">{issue.detail}</p>}
                              {issue.rootCause && <p className="text-xs text-[var(--admin-text-muted)] mt-0.5"><strong>Root cause:</strong> {issue.rootCause}</p>}
                              {issue.fixAction && <p className="text-xs text-[var(--admin-gold)] mt-0.5"><strong>Fix:</strong> {issue.fixAction}</p>}
                            </div>
                            <AdminButton variant="ghost" size="sm" onClick={() => copyAsJson(issue)}>
                              <Copy size={10} />
                            </AdminButton>
                          </div>
                        ))}
                      </div>
                    )}
                    {sortedIssues.length > 15 && !showAllAuditIssues && (
                      <button onClick={() => setShowAllAuditIssues(true)} className="text-xs text-[var(--admin-blue)] hover:underline mt-2">
                        Show all {sortedIssues.length} issues
                      </button>
                    )}
                    {showAllAuditIssues && sortedIssues.length > 15 && (
                      <button onClick={() => setShowAllAuditIssues(false)} className="text-xs text-[var(--admin-text-muted)] hover:underline mt-2">
                        Collapse
                      </button>
                    )}
                  </AdminCard>
                </>
              );
            })()}

            {/* Historical Trend Comparison */}
            <AdminCard>
              <div className="flex items-center justify-between mb-3">
                <AdminSectionLabel>Historical Comparison</AdminSectionLabel>
                <AdminButton variant="ghost" size="sm" onClick={fetchAuditHistory} disabled={auditHistoryLoading}>
                  <RefreshCw size={11} className={auditHistoryLoading ? "animate-spin" : ""} />
                </AdminButton>
              </div>
              {auditHistoryLoading ? (
                <AdminLoadingState label="Loading history..." />
              ) : auditHistory.length === 0 ? (
                <AdminEmptyState icon={Search} title="No audit history" description="Run SEO audits to build a trend over time." />
              ) : (
                <div className="space-y-2">
                  {/* Trend sparkline header */}
                  {auditHistory.length >= 2 && (() => {
                    const latest = auditHistory[0];
                    const previous = auditHistory[1];
                    const scoreDelta = latest.healthScore - previous.healthScore;
                    const findingsDelta = latest.totalFindings - previous.totalFindings;
                    return (
                      <div className="flex flex-wrap gap-3 mb-3">
                        <div className="flex items-center gap-1 text-sm">
                          {scoreDelta >= 0 ? <TrendingUp size={14} className="text-[var(--admin-green)]" /> : <TrendingDown size={14} className="text-[var(--admin-red)]" />}
                          <span className="text-[var(--admin-text)]">Score: {scoreDelta >= 0 ? "+" : ""}{scoreDelta} pts</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          {findingsDelta <= 0 ? <TrendingUp size={14} className="text-[var(--admin-green)]" /> : <TrendingDown size={14} className="text-[var(--admin-red)]" />}
                          <span className="text-[var(--admin-text)]">Findings: {findingsDelta > 0 ? "+" : ""}{findingsDelta}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* History table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-[var(--admin-text-muted)] border-b border-[var(--admin-border)]">
                          <th className="pb-1.5 pr-3">Date</th>
                          <th className="pb-1.5 pr-3">Score</th>
                          <th className="pb-1.5 pr-3">Findings</th>
                          <th className="pb-1.5 pr-1">
                            <span className="text-[var(--admin-red)]">C</span> /
                            <span className="text-[var(--admin-gold)]"> H</span> /
                            <span className="text-[var(--admin-blue)]"> M</span> /
                            <span className="text-[var(--admin-text-muted)]"> L</span>
                          </th>
                          <th className="pb-1.5">Trigger</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditHistory.map((h) => (
                          <tr key={h.id} className="border-b border-[var(--admin-border)] last:border-0">
                            <td className="py-1.5 pr-3 text-[var(--admin-text-muted)] whitespace-nowrap">
                              {new Date(h.createdAt).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}
                            </td>
                            <td className="py-1.5 pr-3">
                              <span className={`font-semibold ${h.healthScore >= 80 ? "text-[var(--admin-green)]" : h.healthScore >= 50 ? "text-[var(--admin-gold)]" : "text-[var(--admin-red)]"}`}>
                                {h.healthScore}
                              </span>
                            </td>
                            <td className="py-1.5 pr-3 text-[var(--admin-text)]">{h.totalFindings}</td>
                            <td className="py-1.5 pr-1 font-mono text-[10px]">
                              <span className="text-[var(--admin-red)]">{h.criticalCount}</span>{" / "}
                              <span className="text-[var(--admin-gold)]">{h.highCount}</span>{" / "}
                              <span className="text-[var(--admin-blue)]">{h.mediumCount}</span>{" / "}
                              <span className="text-[var(--admin-text-muted)]">{h.lowCount}</span>
                            </td>
                            <td className="py-1.5 text-[var(--admin-text-muted)]">{h.triggeredBy || "manual"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </AdminCard>
          </div>
        )}
      </div>
    </div>
  );
}
