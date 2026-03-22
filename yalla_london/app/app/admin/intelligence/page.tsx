"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, Search, TrendingUp, BarChart3, ExternalLink, Copy, Wrench } from "lucide-react";
import {
  ZHCard, ZHAlertBanner, ZHActionBtn, ZHSectionLabel, ZHBadge, ZHMonoVal, ZHMetricCell, ZHTable,
} from "@/components/zh";

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

export default function IntelligencePage() {
  const [tab, setTab] = useState<TabId>("overview");
  const [data, setData] = useState<SEOData | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditResult, setAuditResult] = useState<Record<string, unknown> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Aggregate from cockpit + indexing APIs
      const [cockpitRes, indexingRes] = await Promise.all([
        fetch("/api/admin/cockpit"),
        fetch("/api/admin/content-indexing"),
      ]);

      const cockpit = cockpitRes.ok ? await cockpitRes.json() : null;
      const indexing = indexingRes.ok ? await indexingRes.json() : null;

      const ix = cockpit?.indexing || {};
      const gsc = cockpit?.indexing || {};

      setData({
        indexed: ix.indexed || 0,
        total: ix.total || 0,
        rate: ix.rate || 0,
        neverSubmitted: ix.neverSubmitted || 0,
        errors: ix.errors || 0,
        chronicFailures: ix.chronicFailures || 0,
        gscClicks7d: gsc.gscTotalClicks7d || 0,
        gscImpressions7d: gsc.gscTotalImpressions7d || 0,
        gscClicksTrend: gsc.gscClicksTrend || null,
        gscImpressionsTrend: gsc.gscImpressionsTrend || null,
        avgPosition: null,
        avgCtr: null,
        topPages: [],
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

  const runPublicAudit = async () => {
    setAuditRunning(true);
    setAuditResult(null);
    try {
      const res = await fetch("/api/admin/aggregated-report");
      if (res.ok) {
        const result = await res.json();
        setAuditResult(result);
      }
    } catch (err) {
      console.warn("[intelligence] audit failed:", err instanceof Error ? err.message : err);
    } finally {
      setAuditRunning(false);
    }
  };

  const copyAsJson = (obj: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-zh-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const d = data || {
    indexed: 0, total: 0, rate: 0, neverSubmitted: 0, errors: 0, chronicFailures: 0,
    gscClicks7d: 0, gscImpressions7d: 0, gscClicksTrend: null, gscImpressionsTrend: null,
    avgPosition: null, avgCtr: null, topPages: [], issues: [],
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-zh-ui font-bold text-lg text-zh-cream">SEO Intelligence</h1>
          <p className="font-zh-mono text-[10px] text-zh-cream-muted uppercase tracking-[2px]">
            Search performance & indexing health
          </p>
        </div>
        <ZHActionBtn variant="ghost" size="sm" onClick={fetchData}>
          <RefreshCw size={13} />
        </ZHActionBtn>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zh-navy-mid rounded-lg p-1">
        {([
          { id: "overview" as const, label: "Overview" },
          { id: "gsc" as const, label: "Search Console" },
          { id: "audit" as const, label: "Public Audit" },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-1.5 rounded-md font-zh-mono text-[10px] uppercase tracking-[1px] transition-colors ${
              tab === t.id ? "bg-zh-navy-light text-zh-gold font-semibold" : "text-zh-cream-muted hover:text-zh-cream"
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
            <ZHCard><ZHMetricCell label="Indexed" value={d.indexed} sub={`of ${d.total}`} /></ZHCard>
            <ZHCard><ZHMetricCell label="Rate" value={`${d.rate}%`} trend={d.rate > 80 ? "up" : d.rate > 50 ? "flat" : "down"} /></ZHCard>
            <ZHCard><ZHMetricCell label="Clicks (7d)" value={d.gscClicks7d} trend={d.gscClicksTrend !== null ? (d.gscClicksTrend > 0 ? "up" : "down") : undefined} sub={d.gscClicksTrend !== null ? `${d.gscClicksTrend > 0 ? "+" : ""}${d.gscClicksTrend}%` : undefined} /></ZHCard>
            <ZHCard><ZHMetricCell label="Impressions (7d)" value={d.gscImpressions7d.toLocaleString()} /></ZHCard>
          </div>

          {/* Issues */}
          {d.issues.length > 0 && (
            <ZHCard>
              <div className="flex items-center justify-between mb-3">
                <ZHSectionLabel>Issues</ZHSectionLabel>
                <ZHActionBtn variant="ghost" size="sm" onClick={() => copyAsJson(d.issues)}>
                  <Copy size={11} /> Copy JSON
                </ZHActionBtn>
              </div>
              <div className="space-y-2">
                {d.issues.map((issue, i) => (
                  <div key={i} className="flex items-center justify-between bg-zh-navy rounded-md px-3 py-2">
                    <div className="flex items-center gap-2">
                      <ZHBadge variant={issue.severity === "critical" ? "error" : issue.severity === "warning" ? "warn" : "info"}>
                        {issue.severity}
                      </ZHBadge>
                      <span className="font-zh-ui text-sm text-zh-cream">{issue.message}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ZHMonoVal size="sm" className="text-zh-cream-muted">{issue.count}</ZHMonoVal>
                      {issue.fixEndpoint && (
                        <ZHActionBtn variant="secondary" size="sm" onClick={() => fetch(issue.fixEndpoint!, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(issue.fixPayload || {}) })}>
                          <Wrench size={10} /> Fix
                        </ZHActionBtn>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ZHCard>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <ZHCard>
              <ZHMetricCell label="Never Submitted" value={d.neverSubmitted} />
            </ZHCard>
            <ZHCard>
              <ZHMetricCell label="Errors" value={d.errors} />
            </ZHCard>
            <ZHCard>
              <ZHMetricCell label="Chronic Failures" value={d.chronicFailures} />
            </ZHCard>
          </div>
        </div>
      )}

      {/* GSC TAB */}
      {tab === "gsc" && (
        <div className="space-y-4">
          <ZHAlertBanner severity="info">
            GSC data syncs via the <code className="font-zh-mono">gsc-sync</code> cron every 4 hours.
            For real-time data, open Google Search Console directly.
          </ZHAlertBanner>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ZHCard><ZHMetricCell label="Clicks (7d)" value={d.gscClicks7d} /></ZHCard>
            <ZHCard><ZHMetricCell label="Impressions (7d)" value={d.gscImpressions7d.toLocaleString()} /></ZHCard>
            <ZHCard><ZHMetricCell label="Indexed Pages" value={d.indexed} /></ZHCard>
            <ZHCard><ZHMetricCell label="Index Rate" value={`${d.rate}%`} /></ZHCard>
          </div>

          <ZHCard>
            <ZHSectionLabel>Deeper Analysis</ZHSectionLabel>
            <div className="space-y-2">
              <Link href="/admin/seo-audits" className="flex items-center justify-between bg-zh-navy rounded-md px-3 py-2 hover:bg-zh-navy-light transition-colors">
                <span className="font-zh-ui text-sm text-zh-cream">SEO Audits</span>
                <ExternalLink size={12} className="text-zh-cream-muted" />
              </Link>
              <Link href="/admin/cockpit?tab=seo" className="flex items-center justify-between bg-zh-navy rounded-md px-3 py-2 hover:bg-zh-navy-light transition-colors">
                <span className="font-zh-ui text-sm text-zh-cream">SEO Intel (Legacy)</span>
                <ExternalLink size={12} className="text-zh-cream-muted" />
              </Link>
              <Link href="/admin/discovery" className="flex items-center justify-between bg-zh-navy rounded-md px-3 py-2 hover:bg-zh-navy-light transition-colors">
                <span className="font-zh-ui text-sm text-zh-cream">Discovery Monitor</span>
                <ExternalLink size={12} className="text-zh-cream-muted" />
              </Link>
            </div>
          </ZHCard>
        </div>
      )}

      {/* AUDIT TAB */}
      {tab === "audit" && (
        <div className="space-y-4">
          <ZHCard>
            <ZHSectionLabel>Public SEO Audit</ZHSectionLabel>
            <p className="font-zh-ui text-sm text-zh-cream-muted mb-3">
              Run a full aggregated report across SEO, indexing, discovery, content velocity, and public website health.
            </p>
            <div className="flex gap-2">
              <ZHActionBtn variant="primary" loading={auditRunning} onClick={runPublicAudit}>
                Run Full Audit
              </ZHActionBtn>
              {auditResult && (
                <ZHActionBtn variant="ghost" onClick={() => copyAsJson(auditResult)}>
                  <Copy size={11} /> Copy JSON
                </ZHActionBtn>
              )}
            </div>
          </ZHCard>

          {auditResult && (
            <ZHCard>
              <ZHSectionLabel>Audit Results</ZHSectionLabel>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <ZHMetricCell label="Overall Score" value={(auditResult as { compositeScore?: number }).compositeScore || 0} />
                <ZHMetricCell label="Grade" value={(auditResult as { grade?: string }).grade || "?"} />
                <ZHMetricCell label="Issues" value={((auditResult as { synthesizedIssues?: unknown[] }).synthesizedIssues || []).length} />
              </div>

              {/* Issues with Fix Now + Copy JSON */}
              {((auditResult as { synthesizedIssues?: Array<{ severity: string; title: string; detail: string }> }).synthesizedIssues || []).slice(0, 10).map((issue, i) => (
                <div key={i} className="flex items-start justify-between bg-zh-navy rounded-md px-3 py-2 mb-1">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <ZHBadge variant={issue.severity === "critical" ? "error" : issue.severity === "high" ? "warn" : "info"}>
                        {issue.severity}
                      </ZHBadge>
                      <span className="font-zh-ui text-sm text-zh-cream">{issue.title}</span>
                    </div>
                    {issue.detail && <p className="font-zh-mono text-xs text-zh-cream-muted mt-1">{issue.detail}</p>}
                  </div>
                  <ZHActionBtn variant="ghost" size="sm" onClick={() => copyAsJson({ issue: issue.title, severity: issue.severity, detail: issue.detail })}>
                    <Copy size={10} />
                  </ZHActionBtn>
                </div>
              ))}
            </ZHCard>
          )}
        </div>
      )}
    </div>
  );
}
