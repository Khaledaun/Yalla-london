"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Globe,
  FileText,
  Link2,
  Code,
  Languages,
  Clock,
  ChevronDown,
  ChevronRight,
  Zap,
  Activity,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PageResult {
  url: string;
  status: number;
  hasCanonical: boolean;
  hasHreflang: boolean;
  hasJsonLd: boolean;
  wordCount: number;
  title: string | null;
  metaDescription: string | null;
  issueCount: number;
  issues: Array<{ severity: string; category: string; message: string }>;
}

interface HardGate {
  name: string;
  category: string;
  passed: boolean;
  p0Count: number;
  totalCount: number;
  description: string;
  urls: string[];
}

interface SoftGate {
  name: string;
  count: number;
  description: string;
}

interface AuditResult {
  success: boolean;
  partial?: boolean;
  reason?: string;
  siteId: string;
  baseUrl: string;
  mode: string;
  durationMs: number;
  totalUrls: number;
  crawledOk: number;
  crawledFailed: number;
  signalsExtracted: number;
  issues: { total: number; p0: number; p1: number; p2: number };
  hardGates: HardGate[];
  softGates: SoftGate[];
  allPassed: boolean;
  pages: PageResult[];
}

interface HistoryEntry {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  errorMessage: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MasterAuditPage() {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/master-audit");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setHistory(data.history || []);
      if (data.latestResult) {
        setResult(data.latestResult);
      }
    } catch {
      // Non-critical — history just won't show
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const runAudit = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/master-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed");
      setResult(data);
      loadHistory(); // Refresh history
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setRunning(false);
    }
  };

  const togglePage = (url: string) => {
    setExpandedPages((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case "P0":
        return "text-red-400 bg-red-500/10";
      case "P1":
        return "text-amber-400 bg-amber-500/10";
      case "P2":
        return "text-blue-400 bg-blue-500/10";
      default:
        return "text-gray-400 bg-gray-500/10";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0d1321]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/seo-audits"
              className="p-2 hover:bg-white/5 rounded-lg transition"
            >
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </Link>
            <Shield className="w-5 h-5 text-amber-400" />
            <div>
              <h1 className="text-lg font-semibold">Master SEO Audit</h1>
              <p className="text-xs text-gray-500">
                Full-site compliance scan — 8 validators, 6 hard gates
              </p>
            </div>
          </div>
          <button
            onClick={runAudit}
            disabled={running}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              running
                ? "bg-white/5 text-gray-500 cursor-not-allowed"
                : "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
            }`}
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running Audit...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Run Quick Audit
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-300">Audit Failed</p>
              <p className="text-xs text-red-400 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Running state */}
        {running && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-3" />
            <p className="text-sm text-amber-300 font-medium">
              Crawling your site and running 8 validators...
            </p>
            <p className="text-xs text-gray-500 mt-1">
              This takes 15-40 seconds depending on page count
            </p>
          </div>
        )}

        {/* Results */}
        {result && !running && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard
                label="Pages Scanned"
                value={result.totalUrls}
                icon={<Globe className="w-4 h-4" />}
                color="blue"
              />
              <SummaryCard
                label="Pages OK"
                value={result.crawledOk}
                icon={<CheckCircle className="w-4 h-4" />}
                color="green"
              />
              <SummaryCard
                label="Total Issues"
                value={result.issues.total}
                icon={<AlertTriangle className="w-4 h-4" />}
                color={result.issues.total > 0 ? "amber" : "green"}
              />
              <SummaryCard
                label="Duration"
                value={`${(result.durationMs / 1000).toFixed(1)}s`}
                icon={<Clock className="w-4 h-4" />}
                color="gray"
              />
            </div>

            {/* Issue severity breakdown */}
            {result.issues.total > 0 && (
              <div className="flex gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
                  P0 Critical: {result.issues.p0}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400">
                  P1 Warning: {result.issues.p1}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
                  P2 Info: {result.issues.p2}
                </span>
              </div>
            )}

            {/* Partial warning */}
            {result.partial && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <p className="text-xs text-amber-300">
                  Partial results — {result.reason}. Run the full CLI audit for
                  complete results.
                </p>
              </div>
            )}

            {/* Hard Gates */}
            <div className="bg-[#0d1321] border border-white/10 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-medium">
                  Hard Gates{" "}
                  {result.allPassed ? (
                    <span className="text-green-400 ml-1">All Passed</span>
                  ) : (
                    <span className="text-red-400 ml-1">Failed</span>
                  )}
                </h2>
              </div>
              <div className="divide-y divide-white/5">
                {result.hardGates.map((gate) => (
                  <div
                    key={gate.name}
                    className="px-4 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {gate.passed ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <div>
                        <p className="text-sm">{gate.description}</p>
                        <p className="text-xs text-gray-500">
                          {gate.category} — {gate.totalCount} issue(s),{" "}
                          {gate.p0Count} critical
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        gate.passed
                          ? "bg-green-500/10 text-green-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {gate.passed ? "PASS" : "FAIL"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Soft Gates */}
            {result.softGates.length > 0 && (
              <div className="bg-[#0d1321] border border-white/10 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-medium">Warnings</h2>
                </div>
                <div className="divide-y divide-white/5">
                  {result.softGates.map((gate) => (
                    <div key={gate.name} className="px-4 py-3">
                      <p className="text-sm text-amber-300">
                        {gate.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Per-Page Results */}
            <div className="bg-[#0d1321] border border-white/10 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-medium">Page-by-Page Results</h2>
              </div>
              <div className="divide-y divide-white/5">
                {result.pages.map((page) => (
                  <div key={page.url}>
                    <button
                      onClick={() => togglePage(page.url)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {page.status === 200 ? (
                          <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                        ) : page.status === 0 ? (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        <span className="text-sm truncate">{page.url}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {page.issueCount > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400">
                            {page.issueCount}
                          </span>
                        )}
                        <StatusDot ok={page.status === 200} label="HTTP" />
                        <StatusDot ok={page.hasCanonical} label="Canon" />
                        <StatusDot ok={page.hasJsonLd} label="Schema" />
                        {expandedPages.has(page.url) ? (
                          <ChevronDown className="w-3 h-3 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-3 h-3 text-gray-500" />
                        )}
                      </div>
                    </button>
                    {expandedPages.has(page.url) && (
                      <div className="px-4 pb-3 pl-11 space-y-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <Detail
                            icon={<Globe className="w-3 h-3" />}
                            label="Status"
                            value={
                              page.status === 0
                                ? "Unreachable"
                                : String(page.status)
                            }
                          />
                          <Detail
                            icon={<Link2 className="w-3 h-3" />}
                            label="Canonical"
                            value={page.hasCanonical ? "Yes" : "Missing"}
                          />
                          <Detail
                            icon={<Languages className="w-3 h-3" />}
                            label="Hreflang"
                            value={page.hasHreflang ? "Yes" : "Missing"}
                          />
                          <Detail
                            icon={<Code className="w-3 h-3" />}
                            label="JSON-LD"
                            value={page.hasJsonLd ? "Yes" : "Missing"}
                          />
                          <Detail
                            icon={<FileText className="w-3 h-3" />}
                            label="Words"
                            value={String(page.wordCount)}
                          />
                          <Detail
                            icon={<FileText className="w-3 h-3" />}
                            label="Title"
                            value={
                              page.title
                                ? `${page.title.length} chars`
                                : "Missing"
                            }
                          />
                        </div>
                        {page.issues.length > 0 && (
                          <div className="space-y-1 mt-2">
                            {page.issues.map((issue, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-2 text-xs"
                              >
                                <span
                                  className={`px-1.5 py-0.5 rounded font-mono ${severityColor(issue.severity)}`}
                                >
                                  {issue.severity}
                                </span>
                                <span className="text-gray-400">
                                  {issue.message}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!result && !running && !loading && (
          <div className="bg-[#0d1321] border border-white/10 rounded-lg p-8 text-center">
            <Shield className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No audit results yet</p>
            <p className="text-xs text-gray-600 mt-1">
              Tap &quot;Run Quick Audit&quot; to scan all pages
            </p>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="bg-[#0d1321] border border-white/10 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-medium">Audit History</h2>
            </div>
            <div className="divide-y divide-white/5">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {entry.status === "success" ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : entry.status === "error" ? (
                      <XCircle className="w-4 h-4 text-red-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                    <div>
                      <p className="text-sm">
                        {new Date(entry.startedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {entry.itemsProcessed} pages,{" "}
                        {((entry.durationMs || 0) / 1000).toFixed(1)}s
                        {entry.errorMessage && (
                          <span className="text-amber-500">
                            {" "}
                            — {entry.errorMessage}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      entry.status === "success"
                        ? "bg-green-500/10 text-green-400"
                        : entry.status === "error"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {entry.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    green: "text-green-400 bg-green-500/10 border-green-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    gray: "text-gray-400 bg-gray-500/10 border-gray-500/20",
  };
  return (
    <div className={`rounded-lg border p-3 ${colors[color] || colors.gray}`}>
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs opacity-70">{label}</span></div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`hidden md:inline-flex items-center gap-1 text-[10px] ${
        ok ? "text-green-500" : "text-red-500"
      }`}
      title={`${label}: ${ok ? "OK" : "Missing"}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`}
      />
      {label}
    </span>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-gray-400">
      {icon}
      <span className="opacity-60">{label}:</span>
      <span className="text-gray-300">{value}</span>
    </div>
  );
}
