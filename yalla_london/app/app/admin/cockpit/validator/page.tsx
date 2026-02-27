"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useAdminSession } from "@/hooks/use-admin-session";

// ── Types ────────────────────────────────────────────────────────────────────

interface FixAction {
  id: string;
  label: string;
  api: string;
  method?: string;
  payload?: Record<string, unknown>;
  rerunGroup?: string;
}

interface DiagnosticResult {
  id: string;
  section: string;
  name: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  diagnosis?: string;
  explanation: string;
  fixAction?: FixAction;
  durationMs?: number;
}

interface RunHistory {
  id: string;
  runId: string;
  mode: string;
  totalTests: number;
  passed: number;
  warnings: number;
  failed: number;
  healthScore: number;
  verdict: string;
  durationMs: number;
  created_at: string;
}

interface GroupInfo {
  id: string;
  label: string;
  description: string;
  tests: number;
}

// ── Page Component ───────────────────────────────────────────────────────────

export default function ValidatorPage() {
  const { data: session, status: authStatus } = useAdminSession();
  const isAdmin = authStatus === "authenticated" && !!session;
  const authLoading = authStatus === "loading";

  // State
  const [mode, setMode] = useState<"quick" | "full" | "group">("quick");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [availableGroups, setAvailableGroups] = useState<GroupInfo[]>([]);
  const [quickGroups, setQuickGroups] = useState<string[]>([]);
  const [fullGroups, setFullGroups] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [envStatus, setEnvStatus] = useState<{ confirmed: string[]; missing: string[] } | null>(null);
  const [summary, setSummary] = useState<{ total: number; passed: number; warnings: number; failed: number; healthScore: number; verdict: string; durationMs: number } | null>(null);
  const [history, setHistory] = useState<RunHistory[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [fixResults, setFixResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [siteId, setSiteId] = useState("yalla-london");
  const [error, setError] = useState<string | null>(null);

  // ── Load available groups + history on mount ─────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    loadGroupsAndHistory();
  }, [isAdmin]);

  const loadGroupsAndHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/diagnostics");
      if (!res.ok) return;
      const data = await res.json();
      setAvailableGroups(data.availableGroups || []);
      setQuickGroups(data.quickGroups || []);
      setFullGroups(data.fullGroups || []);
      setHistory(data.lastRuns || []);
      if (data.siteId) setSiteId(data.siteId);
    } catch (err) {
      console.warn("[validator] Failed to load groups:", err);
    }
  }, []);

  // ── Run Diagnostics ──────────────────────────────────────────────────
  const runDiagnostics = useCallback(async () => {
    setRunning(true);
    setError(null);
    setResults([]);
    setSummary(null);
    setFixResults({});

    try {
      const body: Record<string, unknown> = { mode, siteId };
      if (mode === "group" && selectedGroups.length > 0) {
        body.groups = selectedGroups;
      }

      const res = await fetch("/api/admin/diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setError(`Diagnostics failed: HTTP ${res.status}`);
        return;
      }

      const data = await res.json();
      setResults(data.results || []);
      setEnvStatus(data.envStatus || null);
      setSummary({
        total: data.totalTests,
        passed: data.passed,
        warnings: data.warnings,
        failed: data.failed,
        healthScore: data.healthScore,
        verdict: data.verdict,
        durationMs: data.durationMs,
      });

      // Expand sections with failures by default
      const failSections = new Set<string>(
        (data.results || []).filter((r: DiagnosticResult) => r.status === "fail").map((r: DiagnosticResult) => r.section)
      );
      setExpandedSections(failSections);

      // Refresh history
      loadGroupsAndHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run diagnostics");
    } finally {
      setRunning(false);
    }
  }, [mode, selectedGroups, siteId, loadGroupsAndHistory]);

  // ── Execute Fix ──────────────────────────────────────────────────────
  const executeFix = useCallback(async (result: DiagnosticResult) => {
    if (!result.fixAction) return;
    const fix = result.fixAction;
    setFixingId(result.id);

    try {
      const res = await fetch(fix.api, {
        method: fix.method || "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fix.payload || {}),
      });
      const data = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      setFixResults(prev => ({
        ...prev,
        [result.id]: {
          success: res.ok && data.success !== false,
          message: data.message || (res.ok ? "Fix applied" : "Fix failed"),
        },
      }));
    } catch (err) {
      setFixResults(prev => ({
        ...prev,
        [result.id]: { success: false, message: err instanceof Error ? err.message : "Fix failed" },
      }));
    } finally {
      setFixingId(null);
    }
  }, []);

  // ── Toggle Group Selection ───────────────────────────────────────────
  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId) ? prev.filter(g => g !== groupId) : [...prev, groupId]
    );
  };

  // ── Toggle Section Expand ────────────────────────────────────────────
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  // ── Group results by section ─────────────────────────────────────────
  const resultsBySection = results.reduce<Record<string, DiagnosticResult[]>>((acc, r) => {
    if (!acc[r.section]) acc[r.section] = [];
    acc[r.section].push(r);
    return acc;
  }, {});

  // ── Verdict styling ──────────────────────────────────────────────────
  const verdictStyle = (v: string) => {
    switch (v) {
      case "ALL_SYSTEMS_GO": return { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-800 dark:text-green-300", label: "ALL SYSTEMS GO" };
      case "OPERATIONAL": return { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-800 dark:text-blue-300", label: "OPERATIONAL" };
      case "NEEDS_ATTENTION": return { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-300", label: "NEEDS ATTENTION" };
      case "CRITICAL": return { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-800 dark:text-red-300", label: "CRITICAL" };
      default: return { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-800 dark:text-gray-300", label: v };
    }
  };

  // ── Auth guard ───────────────────────────────────────────────────────
  if (authLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!isAdmin) return <div className="p-8 text-center text-red-500">Admin access required</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Validator</h1>
          <p className="text-sm text-gray-500 mt-1">
            Diagnose, fix, and verify platform health — no terminal needed
          </p>
        </div>
        {summary && (
          <div className={`px-4 py-2 rounded-xl font-bold text-lg ${verdictStyle(summary.verdict).bg} ${verdictStyle(summary.verdict).text}`}>
            {summary.healthScore}% — {verdictStyle(summary.verdict).label}
          </div>
        )}
      </div>

      {/* Mode Selector */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {(["quick", "full", "group"] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                mode === m
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {m === "quick" ? "Quick Scan" : m === "full" ? "Full Scan" : "By Group"}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500">
          {mode === "quick" && `Quick: ${quickGroups.join(", ")} (~5 seconds)`}
          {mode === "full" && `Full: All ${fullGroups.length} groups (~30 seconds)`}
          {mode === "group" && `Select groups below, then run`}
        </div>

        {/* Group Pills (for group mode) */}
        {mode === "group" && (
          <div className="flex flex-wrap gap-2">
            {availableGroups.map(g => (
              <button
                key={g.id}
                onClick={() => toggleGroup(g.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedGroups.includes(g.id)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                title={g.description}
              >
                {g.label} ({g.tests})
              </button>
            ))}
          </div>
        )}

        {/* Site Selector + Run Button */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={siteId}
            onChange={e => setSiteId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          >
            <option value="yalla-london">Yalla London</option>
            <option value="zenitha-yachts-med">Zenitha Yachts</option>
            <option value="arabaldives">Arabaldives</option>
            <option value="french-riviera">Yalla Riviera</option>
            <option value="istanbul">Yalla Istanbul</option>
            <option value="thailand">Yalla Thailand</option>
          </select>

          <button
            onClick={runDiagnostics}
            disabled={running || (mode === "group" && selectedGroups.length === 0)}
            className="flex-1 min-w-[200px] px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-xl text-base transition-colors"
          >
            {running ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Running Diagnostics...
              </span>
            ) : (
              `Run ${mode === "quick" ? "Quick" : mode === "full" ? "Full" : "Selected"} Scan`
            )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Summary Bar */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <SummaryCard label="Total Tests" value={summary.total} color="text-gray-700 dark:text-gray-300" />
          <SummaryCard label="Passed" value={summary.passed} color="text-green-600" />
          <SummaryCard label="Warnings" value={summary.warnings} color="text-amber-600" />
          <SummaryCard label="Failed" value={summary.failed} color="text-red-600" />
          <SummaryCard label="Duration" value={`${(summary.durationMs / 1000).toFixed(1)}s`} color="text-blue-600" />
        </div>
      )}

      {/* Environment Status */}
      {envStatus && envStatus.missing.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <h3 className="font-semibold text-amber-800 dark:text-amber-300 text-sm mb-2">Missing Environment Variables</h3>
          <div className="flex flex-wrap gap-1.5">
            {envStatus.missing.map(v => (
              <span key={v} className="px-2 py-0.5 bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 rounded text-xs font-mono">
                {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Results by Section */}
      {Object.entries(resultsBySection).map(([section, sectionResults]) => {
        const passCount = sectionResults.filter(r => r.status === "pass").length;
        const warnCount = sectionResults.filter(r => r.status === "warn").length;
        const failCount = sectionResults.filter(r => r.status === "fail").length;
        const isExpanded = expandedSections.has(section);
        const sectionLabel = availableGroups.find(g => g.id === section)?.label || section;

        return (
          <div key={section} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{isExpanded ? "▼" : "▶"}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{sectionLabel}</span>
                <span className="text-xs text-gray-500">{sectionResults.length} tests</span>
              </div>
              <div className="flex items-center gap-2">
                {passCount > 0 && <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">{passCount} pass</span>}
                {warnCount > 0 && <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">{warnCount} warn</span>}
                {failCount > 0 && <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">{failCount} fail</span>}
              </div>
            </button>

            {/* Section Results */}
            {isExpanded && (
              <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                {sectionResults.map(r => (
                  <TestResultRow
                    key={r.id}
                    result={r}
                    fixing={fixingId === r.id}
                    fixResult={fixResults[r.id]}
                    onFix={() => executeFix(r)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* History Panel */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Recent Runs</h3>
          <div className="space-y-2">
            {history.map(h => {
              const vs = verdictStyle(h.verdict);
              return (
                <div key={h.id} className="flex items-center justify-between text-sm py-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${vs.bg} ${vs.text}`}>{vs.label}</span>
                    <span className="text-gray-500">{h.mode} — {h.totalTests} tests</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{h.healthScore}%</span>
                    <span className="text-green-600">{h.passed}✓</span>
                    {h.warnings > 0 && <span className="text-amber-600">{h.warnings}⚠</span>}
                    {h.failed > 0 && <span className="text-red-600">{h.failed}✗</span>}
                    <span>{new Date(h.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Deprecation Banner for old page */}
      <div className="text-center text-xs text-gray-400 py-4">
        Replaces test-connections.html — no CRON_SECRET needed
      </div>
    </div>
  );
}

// ── Sub-Components ───────────────────────────────────────────────────────────

function SummaryCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function TestResultRow({
  result,
  fixing,
  fixResult,
  onFix,
}: {
  result: DiagnosticResult;
  fixing: boolean;
  fixResult?: { success: boolean; message: string };
  onFix: () => void;
}) {
  const [showExplanation, setShowExplanation] = useState(result.status !== "pass");

  const statusIcon = result.status === "pass" ? "✅" : result.status === "warn" ? "⚠️" : "❌";
  const statusBg = result.status === "pass"
    ? "bg-green-50 dark:bg-green-900/10"
    : result.status === "warn"
      ? "bg-amber-50 dark:bg-amber-900/10"
      : "bg-red-50 dark:bg-red-900/10";

  return (
    <div className={`px-4 py-3 ${statusBg}`}>
      {/* Test Header */}
      <div className="flex items-start gap-2">
        <span className="text-base mt-0.5 flex-shrink-0">{statusIcon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900 dark:text-white">{result.name}</span>
            {result.durationMs && (
              <span className="text-xs text-gray-400">{result.durationMs}ms</span>
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{result.detail}</p>

          {/* Diagnosis (for warn/fail) */}
          {result.diagnosis && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 italic">{result.diagnosis}</p>
          )}

          {/* Explanation toggle */}
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-xs text-blue-600 dark:text-blue-400 mt-1 hover:underline"
          >
            {showExplanation ? "Hide explanation" : "Why does this matter?"}
          </button>
          {showExplanation && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
              {result.explanation}
            </p>
          )}

          {/* Fix Button */}
          {result.fixAction && (
            <div className="mt-2">
              {fixResult ? (
                <div className={`text-xs px-3 py-1.5 rounded-lg inline-block ${
                  fixResult.success
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                }`}>
                  {fixResult.success ? "✅" : "❌"} {fixResult.message}
                </div>
              ) : (
                <button
                  onClick={onFix}
                  disabled={fixing}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  {fixing ? (
                    <>
                      <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                      Fixing...
                    </>
                  ) : (
                    <>🔧 {result.fixAction.label}</>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
