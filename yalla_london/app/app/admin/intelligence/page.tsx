"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { RefreshCw, ExternalLink, Copy, Wrench } from "lucide-react";
import {
  AdminCard, AdminAlertBanner, AdminButton, AdminSectionLabel, AdminStatusBadge,
  AdminKPICard, AdminPageHeader, AdminLoadingState,
} from "@/components/admin/admin-ui";

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
    try { const s = sessionStorage.getItem(AUDIT_SESSION_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [fixingIssue, setFixingIssue] = useState<number | null>(null);
  const [fixResult, setFixResult] = useState<{ idx: number; ok: boolean; msg: string } | null>(null);
  const [showAllAuditIssues, setShowAllAuditIssues] = useState(false);
  const fixResultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        try { sessionStorage.setItem(AUDIT_SESSION_KEY, JSON.stringify(result)); } catch { /* quota */ }
      }
    } catch (err) {
      console.warn("[intelligence] audit failed:", err instanceof Error ? err.message : err);
    } finally {
      setAuditRunning(false);
    }
  };

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
                <AdminSectionLabel>Top Pages (7d)</AdminSectionLabel>
                <div className="space-y-1 mt-2">
                  {d.topPages.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-md px-3 py-1.5 text-xs">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-stone-700 hover:text-blue-700 truncate max-w-[55%] flex items-center gap-1">
                        {p.url.replace(/^https?:\/\/[^/]+/, "")}
                        <ExternalLink size={10} className="shrink-0 opacity-40" />
                      </a>
                      <div className="flex items-center gap-3 text-stone-500">
                        <span>{p.clicks} clicks</span>
                        <span>{p.impressions} imp</span>
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
            <AdminCard>
              <AdminSectionLabel>Public SEO Audit</AdminSectionLabel>
              <p className="text-sm text-stone-500 mb-3">
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

            {auditResult && (
              <AdminCard>
                <AdminSectionLabel>Audit Results</AdminSectionLabel>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  <AdminKPICard label="Overall Score" value={(auditResult as { compositeScore?: number }).compositeScore || 0} />
                  <AdminKPICard label="Grade" value={(auditResult as { grade?: string }).grade || "?"} />
                  <AdminKPICard label="Issues" value={((auditResult as { synthesizedIssues?: unknown[] }).synthesizedIssues || []).length} />
                </div>

                {/* Issues with Fix Now + Copy JSON */}
                {(() => {
                  const allIssues = (auditResult as { synthesizedIssues?: Array<{ severity: string; title: string; detail: string }> }).synthesizedIssues || [];
                  const visible = showAllAuditIssues ? allIssues : allIssues.slice(0, 10);
                  return (
                    <>
                      {visible.map((issue, i) => (
                        <div key={i} className="flex items-start justify-between bg-stone-50 border border-stone-200 rounded-md px-3 py-2 mb-1">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <AdminStatusBadge status={issue.severity === "critical" ? "error" : issue.severity === "high" ? "warning" : "info"} label={issue.severity} />
                              <span className="text-sm text-stone-800">{issue.title}</span>
                            </div>
                            {issue.detail && <p className="font-mono text-xs text-stone-500 mt-1">{issue.detail}</p>}
                          </div>
                          <AdminButton variant="ghost" size="sm" onClick={() => copyAsJson({ issue: issue.title, severity: issue.severity, detail: issue.detail })}>
                            <Copy size={10} />
                          </AdminButton>
                        </div>
                      ))}
                      {allIssues.length > 10 && !showAllAuditIssues && (
                        <button onClick={() => setShowAllAuditIssues(true)} className="text-xs text-blue-600 hover:text-blue-800 mt-2">
                          Show all {allIssues.length} issues
                        </button>
                      )}
                    </>
                  );
                })()}
              </AdminCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
