"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DiscoveryIssue {
  id: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  impact: string;
  autoFixable: boolean;
  fixAction: {
    id: string; label: string; description: string;
    endpoint: string; payload: Record<string, unknown>;
    requiresAI: boolean;
  } | null;
}

interface SiteSummary {
  siteId: string; siteName: string; domain: string; scannedAt: string;
  totalPages: number; totalIssues: number;
  funnel: { published: number; inSitemap: number; submitted: number; crawled: number; indexed: number; performing: number; converting: number };
  issuesBySeverity: Record<string, number>;
  indexingRate: number; totalClicks7d: number; totalImpressions7d: number;
  avgCtr: number; avgPosition: number;
  aioEligiblePages: number; aioEligibleRate: number;
  overallScore: number; overallGrade: string;
  crawlabilityScore: number; indexabilityScore: number;
  contentQualityScore: number; aioReadinessScore: number;
  topIssues: DiscoveryIssue[];
  pagesNeedingAttention: Array<{
    url: string; slug: string; title: string; score: number;
    topIssue: string;
    fixAction: DiscoveryIssue["fixAction"];
  }>;
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function DiscoveryMonitorPage() {
  const [summary, setSummary] = useState<SiteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "pages" | "issues" | "engines">("overview");
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/discovery?mode=quick");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Scan failed");
      setSummary(json.summary);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const fix = useCallback(async (action: string, slug: string, siteId: string, fid: string) => {
    setFixingId(fid);
    try {
      const r = await fetch("/api/admin/discovery", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, slug, siteId }),
      });
      const j = await r.json();
      setToast({ ok: j.success, msg: j.result?.message || j.error || "Done" });
      if (j.success) setTimeout(load, 2000);
    } catch (e) {
      setToast({ ok: false, msg: e instanceof Error ? e.message : "Failed" });
    } finally {
      setFixingId(null);
    }
  }, [load]);

  const submitAll = useCallback(async () => {
    if (!summary) return;
    setFixingId("submit-all");
    try {
      const r = await fetch("/api/admin/discovery", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_all_unsubmitted", siteId: summary.siteId }),
      });
      const j = await r.json();
      setToast({ ok: j.success, msg: j.result?.message || j.error || "Done" });
      if (j.success) setTimeout(load, 2000);
    } catch (e) {
      setToast({ ok: false, msg: e instanceof Error ? e.message : "Failed" });
    } finally {
      setFixingId(null);
    }
  }, [summary, load]);

  if (loading && !summary) return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-zinc-400">Scanning discovery health...</p>
      </div>
    </div>
  );

  if (error && !summary) return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4">
      <div className="bg-red-900/30 border border-red-800 rounded-lg p-4">
        <p className="text-red-300 font-medium">Scan failed</p>
        <p className="text-red-400 text-sm mt-1">{error}</p>
        <button onClick={load} className="mt-3 px-4 py-2 bg-red-800 rounded text-sm">Retry</button>
      </div>
    </div>
  );

  if (!summary) return null;
  const f = summary.funnel;
  const grade = (s: number) => s >= 85 ? "A" : s >= 70 ? "B" : s >= 55 ? "C" : s >= 40 ? "D" : "F";
  const gradeColor: Record<string, string> = { A: "bg-emerald-900 text-emerald-300 border-emerald-700", B: "bg-blue-900 text-blue-300 border-blue-700", C: "bg-amber-900 text-amber-300 border-amber-700", D: "bg-orange-900 text-orange-300 border-orange-700", F: "bg-red-900 text-red-300 border-red-700" };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-xl max-w-sm ${toast.ok ? "bg-emerald-900/90 border border-emerald-700" : "bg-red-900/90 border border-red-700"}`}>
          <p className={`text-sm font-medium ${toast.ok ? "text-emerald-200" : "text-red-200"}`}>{toast.ok ? "Fixed" : "Failed"}</p>
          <p className="text-xs text-zinc-300 mt-1">{toast.msg}</p>
          <button onClick={() => setToast(null)} className="absolute top-2 right-2 text-zinc-500">x</button>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/admin/cockpit" className="text-zinc-500 hover:text-zinc-300 text-sm">Cockpit</Link>
            <h1 className="text-xl font-bold mt-1">Discovery Monitor</h1>
            <p className="text-xs text-zinc-500">Search + AI Engine Health</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`rounded-lg border text-center px-4 py-2 ${gradeColor[summary.overallGrade] || gradeColor.F}`}>
              <div className="text-2xl font-bold">{summary.overallGrade}</div>
              <div className="text-xs opacity-70">{summary.overallScore}/100</div>
            </div>
            <button onClick={load} disabled={loading} className="px-3 py-2 bg-zinc-800 rounded-lg text-sm hover:bg-zinc-700 disabled:opacity-50">{loading ? "..." : "Scan"}</button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 px-4 overflow-x-auto">
        {(["overview", "pages", "issues", "engines"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${tab === t ? "border-emerald-400 text-emerald-400" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>
            {t === "overview" ? "Overview" : t === "pages" ? "Pages" : t === "issues" ? `Issues (${summary.totalIssues})` : "AI Engines"}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* ═══ OVERVIEW TAB ═══ */}
        {tab === "overview" && <>
          {/* Discovery Funnel */}
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3">DISCOVERY FUNNEL</h2>
            {[
              { l: "Published", v: f.published, c: "bg-zinc-600", w: 100 },
              { l: "In Sitemap", v: f.inSitemap, c: "bg-blue-600", w: f.published ? (f.inSitemap/f.published)*100 : 0 },
              { l: "Submitted", v: f.submitted, c: "bg-violet-600", w: f.published ? (f.submitted/f.published)*100 : 0 },
              { l: "Crawled", v: f.crawled, c: "bg-amber-600", w: f.published ? (f.crawled/f.published)*100 : 0 },
              { l: "Indexed", v: f.indexed, c: "bg-emerald-600", w: f.published ? (f.indexed/f.published)*100 : 0 },
              { l: "Impressions", v: f.performing, c: "bg-cyan-600", w: f.published ? (f.performing/f.published)*100 : 0 },
              { l: "Clicks", v: f.converting, c: "bg-green-500", w: f.published ? (f.converting/f.published)*100 : 0 },
            ].map(s => (
              <div key={s.l} className="flex items-center gap-3 mb-1.5">
                <span className="text-xs text-zinc-400 w-24 shrink-0">{s.l}</span>
                <div className="flex-1 bg-zinc-800 rounded-full h-5 overflow-hidden">
                  <div className={`${s.c} h-full rounded-full flex items-center justify-end pr-2`} style={{ width: `${Math.max(s.w,5)}%`, minWidth: "24px" }}>
                    <span className="text-xs font-bold text-white">{s.v}</span>
                  </div>
                </div>
              </div>
            ))}
            {f.submitted < f.published && (
              <button onClick={submitAll} disabled={fixingId === "submit-all"}
                className="mt-3 w-full py-2 bg-violet-700 hover:bg-violet-600 rounded-lg text-sm font-medium disabled:opacity-50">
                {fixingId === "submit-all" ? "Submitting..." : `Submit ${f.published - f.submitted} Unsubmitted Pages`}
              </button>
            )}
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { l: "Crawlability", s: summary.crawlabilityScore },
              { l: "Indexability", s: summary.indexabilityScore },
              { l: "Content Quality", s: summary.contentQualityScore },
              { l: "AIO Readiness", s: summary.aioReadinessScore },
            ].map(c => (
              <div key={c.l} className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
                <div className={`text-2xl font-bold ${c.s >= 80 ? "text-emerald-400" : c.s >= 60 ? "text-amber-400" : "text-red-400"}`}>{c.s}%</div>
                <div className="text-xs text-zinc-500 mt-0.5">{c.l}</div>
              </div>
            ))}
          </div>

          {/* 7-Day Performance */}
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3">7-DAY SEARCH PERFORMANCE</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><div className="text-xl font-bold">{summary.totalClicks7d.toLocaleString()}</div><div className="text-xs text-zinc-500">Clicks</div></div>
              <div><div className="text-xl font-bold">{summary.totalImpressions7d.toLocaleString()}</div><div className="text-xs text-zinc-500">Impressions</div></div>
              <div><div className={`text-xl font-bold ${summary.avgCtr >= 0.03 ? "text-emerald-400" : summary.avgCtr >= 0.01 ? "text-amber-400" : "text-red-400"}`}>{(summary.avgCtr*100).toFixed(1)}%</div><div className="text-xs text-zinc-500">Avg CTR</div></div>
              <div><div className={`text-xl font-bold ${summary.avgPosition > 0 && summary.avgPosition <= 10 ? "text-emerald-400" : "text-zinc-400"}`}>{summary.avgPosition > 0 ? summary.avgPosition.toFixed(1) : "--"}</div><div className="text-xs text-zinc-500">Avg Position</div></div>
            </div>
          </div>

          {/* AIO Readiness */}
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3">AI ENGINE READINESS</h2>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-cyan-400">{summary.aioEligibleRate}%</div>
              <div>
                <p className="text-sm text-zinc-300">{summary.aioEligiblePages}/{summary.totalPages} pages</p>
                <p className="text-xs text-zinc-500">eligible for AI Overview citation</p>
              </div>
            </div>
            <div className="mt-2 bg-zinc-800 rounded-full h-3 overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-600 to-emerald-500 h-full rounded-full" style={{ width: `${summary.aioEligibleRate}%` }} />
            </div>
          </div>

          {/* Issues */}
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3">ISSUES ({summary.totalIssues})</h2>
            <div className="flex gap-3">
              {[
                { l: "Critical", n: summary.issuesBySeverity.critical || 0, c: "text-red-400 bg-red-900/30" },
                { l: "High", n: summary.issuesBySeverity.high || 0, c: "text-orange-400 bg-orange-900/30" },
                { l: "Medium", n: summary.issuesBySeverity.medium || 0, c: "text-amber-400 bg-amber-900/30" },
                { l: "Low", n: summary.issuesBySeverity.low || 0, c: "text-zinc-400 bg-zinc-800" },
              ].map(s => (
                <div key={s.l} className={`flex-1 rounded-lg p-3 text-center ${s.c}`}>
                  <div className="text-2xl font-bold">{s.n}</div>
                  <div className="text-xs mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </>}

        {/* ═══ PAGES TAB ═══ */}
        {tab === "pages" && <>
          {summary.pagesNeedingAttention.map(pg => (
            <div key={pg.slug} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <button onClick={() => setExpanded(expanded === pg.slug ? null : pg.slug)} className="w-full text-left p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{pg.title}</p>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">/blog/{pg.slug}</p>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-2 ${
                      pg.topIssue.includes("Never") || pg.topIssue.includes("placeholder") || pg.topIssue.includes("Deindexed") ? "bg-red-900/50 text-red-300" :
                      pg.topIssue.includes("thin") || pg.topIssue.includes("Thin") || pg.topIssue.includes("declining") ? "bg-orange-900/50 text-orange-300" :
                      "bg-amber-900/50 text-amber-300"
                    }`}>{pg.topIssue}</span>
                  </div>
                  <div className={`rounded-lg border text-center px-2.5 py-1.5 ${gradeColor[grade(pg.score)] || gradeColor.F}`}>
                    <div className="text-lg font-bold">{grade(pg.score)}</div>
                    <div className="text-[10px] opacity-70">{pg.score}</div>
                  </div>
                </div>
              </button>

              {expanded === pg.slug && pg.fixAction && (
                <div className="border-t border-zinc-800 p-4 bg-zinc-900/50">
                  <p className="text-xs text-zinc-400 mb-2">{pg.fixAction.description}</p>
                  <button
                    onClick={() => {
                      const p = pg.fixAction!.payload;
                      fix(p.action as string, pg.slug, summary.siteId, pg.fixAction!.id);
                    }}
                    disabled={fixingId !== null}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-sm font-medium disabled:opacity-50">
                    {fixingId === pg.fixAction.id ? "Fixing..." : `${pg.fixAction.requiresAI ? "AI " : ""}${pg.fixAction.label}`}
                  </button>
                </div>
              )}
            </div>
          ))}
          {summary.pagesNeedingAttention.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <p className="text-4xl mb-3">All pages healthy</p>
            </div>
          )}
        </>}

        {/* ═══ ISSUES TAB ═══ */}
        {tab === "issues" && <>
          {summary.topIssues.map((issue, i) => (
            <div key={`${issue.id}-${i}`} className={`bg-zinc-900 rounded-xl border p-4 ${
              issue.severity === "critical" ? "border-red-800" : issue.severity === "high" ? "border-orange-800" :
              issue.severity === "medium" ? "border-amber-800" : "border-zinc-800"
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      issue.severity === "critical" ? "bg-red-500" : issue.severity === "high" ? "bg-orange-500" :
                      issue.severity === "medium" ? "bg-amber-500" : "bg-zinc-500"
                    }`} />
                    <h3 className="text-sm font-medium text-zinc-200">{issue.title}</h3>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1.5">{issue.description}</p>
                  <p className="text-xs text-zinc-500 mt-1 italic">Impact: {issue.impact}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded font-medium shrink-0 bg-zinc-800 text-zinc-400">
                  {issue.category.replace(/_/g, " ")}
                </span>
              </div>
              {issue.fixAction && (
                <button onClick={() => {
                  const p = issue.fixAction!.payload;
                  fix(p.action as string, p.slug as string, summary.siteId, issue.fixAction!.id);
                }}
                  disabled={fixingId !== null}
                  className="mt-3 w-full py-2 bg-emerald-800 hover:bg-emerald-700 rounded-lg text-sm font-medium disabled:opacity-50">
                  {fixingId === issue.fixAction.id ? "Fixing..." : `${issue.fixAction.requiresAI ? "AI " : ""}${issue.fixAction.label}`}
                </button>
              )}
            </div>
          ))}
        </>}

        {/* ═══ AI ENGINES TAB ═══ */}
        {tab === "engines" && <>
          <p className="text-xs text-zinc-500">How your content is discovered by each engine.</p>
          {[
            { n: "Google Search", i: "G", s: `${summary.indexingRate}% indexed`, d: `${f.indexed}/${f.published} pages | ${summary.totalClicks7d} clicks/wk`, r: summary.indexingRate, b: summary.indexingRate >= 80 ? "border-emerald-700" : "border-amber-700" },
            { n: "Google AI Overviews", i: "AI", s: `${summary.aioEligibleRate}% eligible`, d: `${summary.aioEligiblePages} pages citable | 60%+ of searches`, r: summary.aioEligibleRate, b: summary.aioEligibleRate >= 60 ? "border-emerald-700" : "border-amber-700" },
            { n: "Bing / IndexNow", i: "B", s: "3x daily batch submit", d: "IndexNow to Bing + Yandex + Registry", r: 90, b: "border-blue-700" },
            { n: "ChatGPT / GPTBot", i: "C", s: "Allowed in robots.txt", d: "GPTBot + ChatGPT-User | Schema.org data", r: 85, b: "border-emerald-700" },
            { n: "Perplexity AI", i: "P", s: "Allowed in robots.txt", d: "PerplexityBot allowed | Data-rich content", r: 80, b: "border-violet-700" },
            { n: "Claude / Anthropic", i: "Cl", s: "llms.txt configured", d: "ClaudeBot allowed | llms.txt for all 6 sites", r: 90, b: "border-emerald-700" },
            { n: "Apple Intelligence", i: "A", s: "Applebot allowed", d: "Mobile-optimized | Schema.org | Fast perf", r: 75, b: "border-zinc-600" },
            { n: "Yandex", i: "Y", s: "IndexNow 3x daily", d: "Direct batch submission", r: 85, b: "border-blue-700" },
          ].map(e => (
            <div key={e.n} className={`bg-zinc-900 rounded-xl border ${e.b} p-4 mt-3`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200">{e.n}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{e.s}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{e.r}%</div>
                  <div className="text-xs text-zinc-500">ready</div>
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-2">{e.d}</p>
              <div className="mt-2 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${e.r}%` }} />
              </div>
            </div>
          ))}
        </>}
      </div>
    </div>
  );
}
