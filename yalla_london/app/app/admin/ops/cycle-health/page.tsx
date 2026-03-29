"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";

// ─── Types (mirror API response) ────────────────────────────────────────────

interface FixAction {
  method: "POST";
  endpoint: string;
  payload: Record<string, unknown>;
  label: string;
  description: string;
}

interface CycleIssue {
  id: string;
  category: "pipeline" | "cron" | "indexing" | "quality" | "ai" | "content" | "seo";
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
}

interface CycleHealthReport {
  generatedAt: string;
  siteId: string;
  periodHours: number;
  grade: "A" | "B" | "C" | "D" | "F";
  gradeExplanation: string;
  score: number;
  issues: CycleIssue[];
  metrics: CycleMetrics;
  recommendations: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GRADE_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  A: { bg: "bg-[#1a2e1a]", text: "text-[#4ade80]", ring: "ring-[#2D5A3D]" },
  B: { bg: "bg-[#1a2438]", text: "text-[#60a5fa]", ring: "ring-[#3B7EA1]" },
  C: { bg: "bg-[#2a2210]", text: "text-[#fbbf24]", ring: "ring-[#C49A2A]" },
  D: { bg: "bg-[#2a1a0a]", text: "text-[#fb923c]", ring: "ring-orange-600" },
  F: { bg: "bg-[#2a1010]", text: "text-[#f87171]", ring: "ring-[#C8322B]" },
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-[#C8322B]/20 text-[#f87171] ring-1 ring-[#C8322B]/40",
  warning:  "bg-[#C49A2A]/20 text-[#fbbf24] ring-1 ring-[#C49A2A]/40",
  info:     "bg-[#3B7EA1]/20 text-[#60a5fa] ring-1 ring-[#3B7EA1]/40",
};

const CATEGORY_LABELS: Record<string, string> = {
  pipeline: "Pipeline",
  cron:     "Cron",
  indexing: "Indexing",
  quality:  "Quality",
  ai:       "AI",
  content:  "Content",
  seo:      "SEO",
};

function ageLabel(iso: string): { label: string; stale: boolean } {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  const stale = mins > 5;
  if (mins < 1) return { label: "just now", stale };
  if (mins === 1) return { label: "1 min ago", stale };
  if (mins < 60) return { label: `${mins} min ago`, stale };
  const hrs = Math.floor(mins / 60);
  return { label: `${hrs}h ago`, stale: true };
}

function MetricPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5 bg-[#0B1120] rounded-lg px-3 py-2 min-w-0">
      <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">{label}</span>
      <span className="text-white text-sm font-semibold truncate">{value}</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-32 bg-[#111827] rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 bg-[#111827] rounded-lg" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 bg-[#111827] rounded-xl" />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CycleHealthPage() {
  const [report, setReport] = useState<CycleHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [fixing, setFixing] = useState<Record<string, boolean>>({});
  const [fixResults, setFixResults] = useState<Record<string, string>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const env = process.env.NEXT_PUBLIC_VERCEL_ENV || "development";

  const fetchReport = async () => {
    try {
      setError(null);
      const res = await fetch("/api/admin/cycle-health", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load health data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchReport, 60_000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh]);

  const runFix = async (issueId: string, action: FixAction) => {
    setFixing((f) => ({ ...f, [issueId]: true }));
    setFixResults((r) => ({ ...r, [issueId]: "" }));
    try {
      const res = await fetch("/api/admin/cycle-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixActionId: issueId, ...action.payload }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "Request failed");
        setFixResults((r) => ({ ...r, [issueId]: errText || "Failed" }));
        return;
      }
      const data = await res.json();
      setFixResults((r) => ({
        ...r,
        [issueId]: data.message || "Fixed",
      }));
      setTimeout(fetchReport, 1500);
    } catch {
      setFixResults((r) => ({ ...r, [issueId]: "Request failed" }));
    } finally {
      setFixing((f) => ({ ...f, [issueId]: false }));
    }
  };

  const runFixAll = async () => {
    if (!report) return;
    const fixable = report.issues.filter((i) => i.fixAction);
    for (const issue of fixable) {
      if (issue.fixAction) await runFix(issue.id, issue.fixAction);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1120] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="h-7 w-48 bg-[#111827] rounded animate-pulse" />
            <div className="h-5 w-24 bg-[#111827] rounded animate-pulse" />
          </div>
          <Skeleton />
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen bg-[#0B1120] p-6 flex items-center justify-center">
        <div className="bg-[#111827] border border-[#C8322B]/40 rounded-xl p-8 max-w-md text-center space-y-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#C8322B]">Health Check Failed</p>
          <p className="text-gray-400 text-sm">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchReport(); }}
            className="bg-[#C49A2A] hover:bg-[#d4a730] text-[#0B1120] font-bold text-sm px-5 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const gradeStyle = GRADE_STYLES[report.grade] ?? GRADE_STYLES.F;
  const { label: ageStr, stale: isStale } = ageLabel(report.generatedAt);
  const fixableCount = report.issues.filter((i) => i.fixAction).length;
  const criticalCount = report.issues.filter((i) => i.severity === "critical").length;

  return (
    <div className="min-h-screen bg-[#0B1120] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-white text-xl font-bold tracking-tight">Cycle Health</h1>
            <p className="text-gray-500 text-xs mt-0.5">Last {report.periodHours}h of platform operations</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                env === "production"
                  ? "bg-[#C8322B]/20 text-[#f87171]"
                  : "bg-[#3B7EA1]/20 text-[#60a5fa]"
              }`}
            >
              {env}
            </span>
            <button
              onClick={() => setAutoRefresh((v) => !v)}
              className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border transition-colors ${
                autoRefresh
                  ? "border-[#2D5A3D] text-[#4ade80] bg-[#1a2e1a]"
                  : "border-[#1E293B] text-gray-500 bg-transparent"
              }`}
            >
              {autoRefresh ? "● Live" : "○ Paused"}
            </button>
          </div>
        </div>

        {/* ── Grade + Score Card ── */}
        <div className={`${gradeStyle.bg} ring-1 ${gradeStyle.ring} rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4`}>
          <div className={`text-6xl font-black ${gradeStyle.text} leading-none w-16 text-center`}>
            {report.grade}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-white font-bold text-lg">Score: {report.score}/100</span>
              {criticalCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C8322B]/20 text-[#f87171] ring-1 ring-[#C8322B]/40">
                  {criticalCount} critical
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mt-1 leading-snug">{report.gradeExplanation}</p>
            <p className={`text-[11px] mt-1.5 font-mono ${isStale ? "text-[#fbbf24]" : "text-gray-600"}`}>
              {isStale ? "⚠ " : ""}Last checked {ageStr} · Site: {report.siteId}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end w-full sm:w-auto">
            {fixableCount > 0 && (
              <button
                onClick={runFixAll}
                className="bg-[#C49A2A] hover:bg-[#d4a730] text-[#0B1120] font-bold text-xs px-4 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                Fix All ({fixableCount})
              </button>
            )}
            <button
              onClick={() => { setLoading(true); fetchReport(); }}
              className="border border-[#1E293B] hover:border-gray-600 text-gray-400 hover:text-white text-xs px-4 py-1.5 rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* ── Metrics Grid ── */}
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-gray-500 mb-2">Metrics</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MetricPill label="Topics" value={report.metrics.topicsCreated} />
            <MetricPill label="Drafts Started" value={report.metrics.draftsStarted} />
            <MetricPill label="Drafts Done" value={report.metrics.draftsCompleted} />
            <MetricPill label="Published" value={report.metrics.articlesPublished} />
            <MetricPill label="Indexed" value={report.metrics.articlesIndexed} />
            <MetricPill
              label="Cron Success"
              value={`${Math.round(report.metrics.cronSuccessRate * 100)}%`}
            />
            <MetricPill label="AI Calls" value={report.metrics.aiCalls} />
            <MetricPill
              label="AI Cost"
              value={`$${report.metrics.aiCostUsd.toFixed(3)}`}
            />
          </div>
        </div>

        {/* ── Issues ── */}
        {report.issues.length > 0 && (
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-gray-500 mb-2">
              Issues ({report.issues.length})
            </p>
            <div className="space-y-3">
              {report.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-[#111827] border border-[#1E293B] rounded-xl p-5 space-y-3"
                >
                  {/* Issue header */}
                  <div className="flex flex-wrap items-start gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${SEVERITY_STYLES[issue.severity]}`}
                    >
                      {issue.severity}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#0B1120] text-gray-400 ring-1 ring-[#1E293B]">
                      {CATEGORY_LABELS[issue.category] ?? issue.category}
                    </span>
                    <span className="text-white font-semibold text-sm leading-tight flex-1 min-w-0">
                      {issue.what}
                    </span>
                  </div>

                  {/* Why */}
                  <p className="text-gray-400 text-xs leading-relaxed">{issue.why}</p>

                  {/* Fix description */}
                  <p className="text-gray-500 text-xs leading-relaxed border-l-2 border-[#1E293B] pl-3">
                    {issue.fix}
                  </p>

                  {/* Fix action */}
                  {issue.fixAction && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                      <button
                        onClick={() => runFix(issue.id, issue.fixAction!)}
                        disabled={fixing[issue.id]}
                        className="bg-[#C49A2A] hover:bg-[#d4a730] disabled:opacity-50 disabled:cursor-not-allowed text-[#0B1120] font-bold text-xs px-4 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                      >
                        {fixing[issue.id] ? "Fixing…" : issue.fixAction.label}
                      </button>
                      {fixResults[issue.id] && (
                        <span
                          className={`text-xs font-mono ${
                            fixResults[issue.id].toLowerCase().includes("fail") ||
                            fixResults[issue.id].toLowerCase().includes("error")
                              ? "text-[#f87171]"
                              : "text-[#4ade80]"
                          }`}
                        >
                          {fixResults[issue.id]}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── No Issues ── */}
        {report.issues.length === 0 && (
          <div className="bg-[#1a2e1a] border border-[#2D5A3D] rounded-xl p-8 text-center">
            <p className="text-[#4ade80] text-2xl mb-2">✓</p>
            <p className="text-[#4ade80] font-semibold">All systems healthy</p>
            <p className="text-gray-500 text-xs mt-1">No issues detected in the last {report.periodHours}h</p>
          </div>
        )}

        {/* ── Recommendations ── */}
        {report.recommendations.length > 0 && (
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-gray-500 mb-2">
              Recommendations
            </p>
            <div className="bg-[#111827] border border-[#1E293B] rounded-xl divide-y divide-[#1E293B]">
              {report.recommendations.map((rec, i) => (
                <div key={i} className="px-5 py-3 flex gap-3 items-start">
                  <span className="text-[#C49A2A] text-xs mt-0.5 shrink-0">→</span>
                  <p className="text-gray-400 text-xs leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between pt-1 pb-4">
          <p className="text-gray-600 text-[11px] font-mono">
            Generated: {new Date(report.generatedAt).toLocaleTimeString()}
          </p>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#1a2e1a] text-[#4ade80] ring-1 ring-[#2D5A3D]">
            wired
          </span>
        </div>

      </div>
    </div>
  );
}
