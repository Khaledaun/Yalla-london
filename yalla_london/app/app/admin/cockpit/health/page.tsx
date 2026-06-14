"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────

interface FixAction {
  method: "POST";
  endpoint: string;
  payload: Record<string, unknown>;
  label: string;
  description: string;
}

interface CycleIssue {
  id: string;
  category: string;
  severity: "critical" | "warning" | "info";
  what: string;
  why: string;
  fix: string;
  fixAction: FixAction | null;
  evidence: Record<string, unknown>;
}

interface CycleMetrics {
  topicsCreated: number;
  draftsStarted: number;
  draftsCompleted: number;
  articlesPublished: number;
  articlesIndexed: number;
  cronRuns: number;
  cronFailures: number;
  cronSuccessRate: number;
  avgCronDurationMs: number;
  aiCalls: number;
  aiFailures: number;
  aiCostUsd: number;
  autoFixesApplied: number;
  autoFixesSucceeded: number;
  stuckDrafts: number;
  reservoirSize: number;
  avgSeoScore: number;
  contentVelocity: number;
}

interface CycleHealthReport {
  generatedAt: string;
  siteId: string;
  periodHours: number;
  periodStart: string;
  periodEnd: string;
  grade: string;
  gradeExplanation: string;
  score: number;
  issues: CycleIssue[];
  metrics: CycleMetrics;
  recommendations: string[];
}

interface FixResult {
  issueId: string;
  loading: boolean;
  success?: boolean;
  steps?: Array<{ step: string; status: string; detail: string; durationMs: number }>;
  error?: string;
  result?: Record<string, unknown>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CycleHealthPage() {
  const searchParams = useSearchParams();
  const [report, setReport] = useState<CycleHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siteId, setSiteId] = useState(searchParams.get("siteId") || "yalla-london");
  const [period, setPeriod] = useState(24);
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [fixResults, setFixResults] = useState<Record<string, FixResult>>({});
  const [fixAllLoading, setFixAllLoading] = useState(false);
  const [fixAllResult, setFixAllResult] = useState<{ fixedCount: number; totalIssues: number; results: Array<{ issueId: string; what: string; success: boolean; detail: string }> } | null>(null);
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFixAllResult(null);
    try {
      const res = await fetch(`/api/admin/cycle-health?siteId=${encodeURIComponent(siteId)}&hours=${period}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setReport(json.report);
      } else {
        setError(json.error || "Failed to generate report");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [siteId, period]);

  useEffect(() => {
    loadReport();
    // Load sites for selector
    fetch("/api/admin/sites")
      .then((r) => r.ok ? r.json() : { sites: [] })
      .then((j) => {
        if (j.sites?.length > 0) {
          setSites(j.sites.map((s: Record<string, string>) => ({ id: s.id || s.siteId, name: s.name })));
        }
      })
      .catch(() => {});
  }, [loadReport]);

  const executeFix = async (issue: CycleIssue) => {
    if (!issue.fixAction) return;
    const payload = { ...issue.fixAction.payload, siteId };
    setFixResults((prev) => ({
      ...prev,
      [issue.id]: { issueId: issue.id, loading: true },
    }));

    try {
      const res = await fetch(issue.fixAction.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Server error (${res.status}): ${errText.substring(0, 100)}`);
      }
      const json = await res.json();
      setFixResults((prev) => ({
        ...prev,
        [issue.id]: {
          issueId: issue.id,
          loading: false,
          success: json.success,
          steps: json.steps,
          result: json.result,
          error: json.error,
        },
      }));
    } catch (e) {
      setFixResults((prev) => ({
        ...prev,
        [issue.id]: {
          issueId: issue.id,
          loading: false,
          success: false,
          error: e instanceof Error ? e.message : "Network error",
        },
      }));
    }
  };

  const executeFixAll = async () => {
    setFixAllLoading(true);
    setFixAllResult(null);
    try {
      const res = await fetch("/api/admin/cycle-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fix_all", siteId }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Server error (${res.status}): ${errText.substring(0, 100)}`);
      }
      const json = await res.json();
      setFixAllResult({
        fixedCount: json.fixedCount || 0,
        totalIssues: json.totalIssues || 0,
        results: json.results || [],
      });
    } catch (e) {
      setFixAllResult({ fixedCount: 0, totalIssues: 0, results: [{ issueId: "all", what: "Fix All", success: false, detail: e instanceof Error ? e.message : "Error" }] });
    } finally {
      setFixAllLoading(false);
    }
  };

  const severityColor = (s: string) => {
    if (s === "critical") return { bg: "bg-red-950/40", border: "border-red-800", text: "text-red-300", badge: "bg-red-900 text-red-200" };
    if (s === "warning") return { bg: "bg-amber-950/30", border: "border-amber-800/50", text: "text-amber-300", badge: "bg-amber-900 text-amber-200" };
    return { bg: "bg-blue-950/20", border: "border-blue-800/30", text: "text-blue-300", badge: "bg-blue-900 text-blue-200" };
  };

  const gradeColor = (g: string) => {
    if (g === "A") return "text-emerald-400";
    if (g === "B") return "text-blue-400";
    if (g === "C") return "text-amber-400";
    if (g === "D") return "text-orange-400";
    return "text-red-400";
  };

  const categoryIcon = (c: string) => {
    const icons: Record<string, string> = {
      pipeline: "⚙️", cron: "🕐", indexing: "📡", quality: "📊",
      ai: "🤖", content: "📝", seo: "🔍",
    };
    return icons[c] || "❓";
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/admin/cockpit" className="text-xs text-zinc-500 hover:text-zinc-300">
              ← Cockpit
            </Link>
            <h1 className="text-lg font-bold mt-0.5">Cycle Health Report</h1>
          </div>
          <button
            onClick={loadReport}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Refresh"}
          </button>
        </div>

        {/* Controls */}
        <div className="flex gap-2 mt-2">
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-300"
          >
            {sites.length > 0
              ? sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)
              : <option value="yalla-london">Yalla London</option>
            }
          </select>
          <select
            value={period}
            onChange={(e) => setPeriod(parseInt(e.target.value))}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-300"
          >
            <option value={12}>12h</option>
            <option value={24}>24h</option>
            <option value={48}>48h</option>
            <option value={72}>72h</option>
            <option value={168}>7 days</option>
          </select>
        </div>
      </div>

      {/* ── Loading / Error ── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-zinc-700 border-t-blue-500 rounded-full mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Analyzing platform health…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-4 bg-red-950/40 border border-red-800 rounded-xl p-4 text-sm text-red-300">
          <p className="font-medium">Analysis failed</p>
          <p className="text-red-400 text-xs mt-1">{error}</p>
          <button onClick={loadReport} className="mt-2 px-3 py-1 rounded bg-red-900/50 hover:bg-red-800/50 text-xs border border-red-700">
            Retry
          </button>
        </div>
      )}

      {/* ── Report ── */}
      {report && !loading && (
        <div className="px-4 mt-4 space-y-4">

          {/* ── Grade Card ── */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div className={`text-5xl font-black ${gradeColor(report.grade)}`}>
                {report.grade}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold">{report.gradeExplanation}</div>
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Score: {report.score}/100 • {report.issues.length} issue{report.issues.length !== 1 ? "s" : ""} • Last {report.periodHours}h
                </div>
                <div className="mt-2 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      report.score >= 90 ? "bg-emerald-500" :
                      report.score >= 75 ? "bg-blue-500" :
                      report.score >= 60 ? "bg-amber-500" :
                      report.score >= 40 ? "bg-orange-500" : "bg-red-500"
                    }`}
                    style={{ width: `${report.score}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Key Metrics ── */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Published", value: report.metrics.articlesPublished, color: "text-emerald-400" },
              { label: "Reservoir", value: report.metrics.reservoirSize, color: "text-blue-400" },
              { label: "Stuck", value: report.metrics.stuckDrafts, color: report.metrics.stuckDrafts > 0 ? "text-red-400" : "text-zinc-400" },
              { label: "Velocity", value: `${report.metrics.contentVelocity}/d`, color: report.metrics.contentVelocity >= 1 ? "text-emerald-400" : "text-amber-400" },
            ].map((m) => (
              <div key={m.label} className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-2 text-center">
                <div className={`text-lg font-bold ${m.color}`}>{m.value}</div>
                <div className="text-[10px] text-zinc-500">{m.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Cron OK", value: `${report.metrics.cronSuccessRate}%`, color: report.metrics.cronSuccessRate >= 90 ? "text-emerald-400" : "text-amber-400" },
              { label: "AI Cost", value: `$${report.metrics.aiCostUsd.toFixed(2)}`, color: report.metrics.aiCostUsd > 10 ? "text-amber-400" : "text-zinc-400" },
              { label: "Avg SEO", value: report.metrics.avgSeoScore || "n/a", color: report.metrics.avgSeoScore >= 70 ? "text-emerald-400" : "text-amber-400" },
              { label: "Indexed", value: report.metrics.articlesIndexed, color: "text-cyan-400" },
            ].map((m) => (
              <div key={m.label} className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-2 text-center">
                <div className={`text-lg font-bold ${m.color}`}>{m.value}</div>
                <div className="text-[10px] text-zinc-500">{m.label}</div>
              </div>
            ))}
          </div>

          {/* ── Fix All Button ── */}
          {report.issues.filter((i) => i.fixAction).length > 0 && (
            <button
              onClick={executeFixAll}
              disabled={fixAllLoading}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white disabled:opacity-50 transition-all"
            >
              {fixAllLoading
                ? "Fixing all issues…"
                : `Fix All ${report.issues.filter((i) => i.fixAction).length} Fixable Issues`}
            </button>
          )}

          {/* ── Fix All Results ── */}
          {fixAllResult && (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{fixAllResult.fixedCount === fixAllResult.totalIssues ? "✅" : "⚠️"}</span>
                <span className="text-sm font-medium">
                  Fixed {fixAllResult.fixedCount}/{fixAllResult.totalIssues} issues
                </span>
              </div>
              <div className="space-y-2">
                {fixAllResult.results.map((r, i) => (
                  <div key={i} className={`text-xs rounded-lg px-3 py-2 ${r.success ? "bg-emerald-950/30 text-emerald-300 border border-emerald-800/30" : "bg-red-950/30 text-red-300 border border-red-800/30"}`}>
                    <div className="font-medium">{r.success ? "✓" : "✗"} {r.what}</div>
                    <div className="text-[10px] mt-0.5 opacity-80">{r.detail}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setFixAllResult(null); loadReport(); }}
                className="mt-3 w-full py-2 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
              >
                Re-analyze
              </button>
            </div>
          )}

          {/* ── Issues List ── */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-400 mb-2">
              Issues ({report.issues.length})
            </h2>

            {report.issues.length === 0 && (
              <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-xl p-4 text-center">
                <span className="text-2xl">✅</span>
                <p className="text-sm text-emerald-300 mt-2 font-medium">All systems healthy</p>
                <p className="text-xs text-emerald-400/60 mt-1">No issues detected in the last {report.periodHours}h</p>
              </div>
            )}

            <div className="space-y-3">
              {report.issues.map((issue) => {
                const colors = severityColor(issue.severity);
                const isExpanded = expandedIssue === issue.id;
                const fix = fixResults[issue.id];

                return (
                  <div key={issue.id} className={`${colors.bg} border ${colors.border} rounded-xl overflow-hidden`}>
                    {/* Issue Header */}
                    <button
                      onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
                      className="w-full text-left p-3"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-base mt-0.5">{categoryIcon(issue.category)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colors.badge}`}>
                              {issue.severity.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-zinc-500 uppercase">{issue.category}</span>
                          </div>
                          <p className={`text-sm font-medium mt-1 ${colors.text}`}>{issue.what}</p>
                        </div>
                        <span className="text-zinc-500 text-xs mt-1">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="border-t border-zinc-800/50 px-3 pb-3">
                        {/* Why */}
                        <div className="mt-3">
                          <p className="text-[10px] font-semibold text-zinc-500 uppercase mb-1">Why this happened</p>
                          <p className="text-xs text-zinc-300">{issue.why}</p>
                        </div>

                        {/* How to fix */}
                        <div className="mt-3">
                          <p className="text-[10px] font-semibold text-zinc-500 uppercase mb-1">How to fix</p>
                          <p className="text-xs text-zinc-300">{issue.fix}</p>
                        </div>

                        {/* Evidence */}
                        <div className="mt-3">
                          <p className="text-[10px] font-semibold text-zinc-500 uppercase mb-1">Evidence</p>
                          <div className="bg-zinc-950/50 rounded-lg p-2 overflow-x-auto">
                            <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap break-all">
                              {JSON.stringify(issue.evidence, null, 2)}
                            </pre>
                          </div>
                        </div>

                        {/* Fix Now Button */}
                        {issue.fixAction && !fix?.success && (
                          <button
                            onClick={() => executeFix(issue)}
                            disabled={fix?.loading}
                            className="mt-3 w-full py-2.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white disabled:opacity-50 transition-all"
                          >
                            {fix?.loading ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="animate-spin w-3 h-3 border border-white/30 border-t-white rounded-full" />
                                Running fix…
                              </span>
                            ) : (
                              `Fix Now — ${issue.fixAction.label}`
                            )}
                          </button>
                        )}

                        {/* Fix Result */}
                        {fix && !fix.loading && (
                          <div className={`mt-3 rounded-lg p-3 ${fix.success ? "bg-emerald-950/30 border border-emerald-800/30" : "bg-red-950/30 border border-red-800/30"}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <span>{fix.success ? "✅" : "❌"}</span>
                              <span className={`text-xs font-medium ${fix.success ? "text-emerald-300" : "text-red-300"}`}>
                                {fix.success ? "Fix applied successfully" : "Fix failed"}
                              </span>
                            </div>

                            {/* Steps timeline */}
                            {fix.steps && fix.steps.length > 0 && (
                              <div className="space-y-1.5 mb-2">
                                {fix.steps.map((step, i) => (
                                  <div key={i} className="flex items-start gap-2 text-[10px]">
                                    <span className={step.status === "done" ? "text-emerald-400" : step.status === "failed" ? "text-red-400" : "text-blue-400"}>
                                      {step.status === "done" ? "✓" : step.status === "failed" ? "✗" : "→"}
                                    </span>
                                    <div>
                                      <span className="text-zinc-300">{step.step}</span>
                                      <span className="text-zinc-600 ml-1">({step.durationMs}ms)</span>
                                      {step.detail && step.detail !== step.step && (
                                        <p className="text-zinc-500 mt-0.5">{step.detail.substring(0, 200)}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Result summary */}
                            {fix.result && (
                              <div className="bg-zinc-950/50 rounded p-2 mt-1">
                                <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap break-all">
                                  {JSON.stringify(fix.result, null, 2)}
                                </pre>
                              </div>
                            )}

                            {fix.error && (
                              <p className="text-[10px] text-red-400 mt-1">{fix.error}</p>
                            )}

                            {/* Verify button */}
                            <button
                              onClick={() => { setFixResults((prev) => { const next = { ...prev }; delete next[issue.id]; return next; }); loadReport(); }}
                              className="mt-2 w-full py-1.5 rounded text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                            >
                              Re-analyze to verify fix
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Recommendations ── */}
          {report.recommendations.length > 0 && (
            <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-zinc-400 mb-2">Recommendations</h2>
              <div className="space-y-2">
                {report.recommendations.map((rec, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="text-zinc-600">→</span>
                    <span className="text-zinc-300">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Timestamp ── */}
          <p className="text-[10px] text-zinc-600 text-center">
            Generated {new Date(report.generatedAt).toLocaleString()} •
            Period: {new Date(report.periodStart).toLocaleString()} — {new Date(report.periodEnd).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
