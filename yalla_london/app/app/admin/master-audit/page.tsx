"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
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
import {
  AdminPageHeader,
  AdminCard,
  AdminKPICard,
  AdminButton,
  AdminStatusBadge,
  AdminSectionLabel,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
} from "@/components/admin/admin-ui";

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
        return { bg: "rgba(200,50,43,0.08)", text: "#C8322B" };
      case "P1":
        return { bg: "rgba(196,154,42,0.08)", text: "#7a5a10" };
      case "P2":
        return { bg: "rgba(59,126,161,0.08)", text: "#1e5a7a" };
      default:
        return { bg: "rgba(120,113,108,0.08)", text: "#78716C" };
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="admin-page p-4 md:p-6">
        <AdminPageHeader
          title="Master SEO Audit"
          subtitle="Full-site compliance scan — 8 validators, 6 hard gates"
          backHref="/admin/seo-audits"
        />
        <AdminLoadingState label="Loading audit data..." />
      </div>
    );
  }

  return (
    <div className="admin-page p-4 md:p-6">
      {/* Header */}
      <AdminPageHeader
        title="Master SEO Audit"
        subtitle="Full-site compliance scan — 8 validators, 6 hard gates"
        backHref="/admin/seo-audits"
        action={
          <AdminButton
            onClick={runAudit}
            disabled={running}
            loading={running}
            variant="primary"
            size="md"
          >
            <Zap size={14} />
            {running ? "Running..." : "Run Quick Audit"}
          </AdminButton>
        }
      />

      <div className="space-y-6">
        {/* Error */}
        {error && (
          <AdminAlertBanner
            severity="critical"
            message="Audit Failed"
            detail={error}
            onDismiss={() => setError(null)}
          />
        )}

        {/* Running state */}
        {running && (
          <AdminCard className="text-center py-8">
            <div className="w-10 h-10 border-2 border-stone-200 border-t-[#C8322B] rounded-full animate-spin mx-auto mb-4" />
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 15,
                color: "#1C1917",
              }}
            >
              Crawling your site and running 8 validators...
            </p>
            <p
              style={{
                fontFamily: "var(--font-system)",
                fontSize: 11,
                color: "#78716C",
                marginTop: 6,
              }}
            >
              This takes 15-40 seconds depending on page count
            </p>
          </AdminCard>
        )}

        {/* Results */}
        {result && !running && (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <AdminKPICard
                label="Pages Scanned"
                value={result.totalUrls}
                color="#3B7EA1"
              />
              <AdminKPICard
                label="Pages OK"
                value={result.crawledOk}
                color="#2D5A3D"
              />
              <AdminKPICard
                label="Total Issues"
                value={result.issues.total}
                color={result.issues.total > 0 ? "#C49A2A" : "#2D5A3D"}
              />
              <AdminKPICard
                label="Duration"
                value={`${(result.durationMs / 1000).toFixed(1)}s`}
                color="#78716C"
              />
            </div>

            {/* Issue severity breakdown */}
            {result.issues.total > 0 && (
              <div className="flex flex-wrap gap-2">
                <AdminStatusBadge status="failed" label={`P0 Critical: ${result.issues.p0}`} />
                <AdminStatusBadge status="warning" label={`P1 Warning: ${result.issues.p1}`} />
                <AdminStatusBadge status="promoting" label={`P2 Info: ${result.issues.p2}`} />
              </div>
            )}

            {/* Partial warning */}
            {result.partial && (
              <AdminAlertBanner
                severity="warning"
                message="Partial Results"
                detail={`${result.reason}. Run the full CLI audit for complete results.`}
              />
            )}

            {/* Hard Gates */}
            <div>
              <AdminSectionLabel>
                Hard Gates {result.allPassed ? "— All Passed" : "— Failed"}
              </AdminSectionLabel>
              <AdminCard accent accentColor={result.allPassed ? "green" : "red"}>
                <div className="divide-y divide-stone-100">
                  {result.hardGates.map((gate) => (
                    <div
                      key={gate.name}
                      className="px-4 py-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {gate.passed ? (
                          <CheckCircle size={16} color="#2D5A3D" />
                        ) : (
                          <XCircle size={16} color="#C8322B" />
                        )}
                        <div>
                          <p
                            style={{
                              fontFamily: "var(--font-system)",
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#1C1917",
                            }}
                          >
                            {gate.description}
                          </p>
                          <p
                            style={{
                              fontFamily: "var(--font-system)",
                              fontSize: 10,
                              color: "#78716C",
                              marginTop: 2,
                            }}
                          >
                            {gate.category} — {gate.totalCount} issue(s),{" "}
                            {gate.p0Count} critical
                          </p>
                        </div>
                      </div>
                      <AdminStatusBadge
                        status={gate.passed ? "success" : "failed"}
                        label={gate.passed ? "PASS" : "FAIL"}
                      />
                    </div>
                  ))}
                </div>
              </AdminCard>
            </div>

            {/* Soft Gates */}
            {result.softGates.length > 0 && (
              <div>
                <AdminSectionLabel>Warnings</AdminSectionLabel>
                <AdminCard accent accentColor="gold">
                  <div className="divide-y divide-stone-100">
                    {result.softGates.map((gate) => (
                      <div key={gate.name} className="px-4 py-3">
                        <p
                          style={{
                            fontFamily: "var(--font-system)",
                            fontSize: 12,
                            fontWeight: 500,
                            color: "#7a5a10",
                          }}
                        >
                          {gate.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </AdminCard>
              </div>
            )}

            {/* Per-Page Results */}
            <div>
              <AdminSectionLabel>Page-by-Page Results</AdminSectionLabel>
              <AdminCard>
                <div className="divide-y divide-stone-100">
                  {result.pages.map((page) => (
                    <div key={page.url}>
                      <button
                        onClick={() => togglePage(page.url)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {page.status === 200 ? (
                            <CheckCircle size={16} color="#2D5A3D" className="shrink-0" />
                          ) : page.status === 0 ? (
                            <XCircle size={16} color="#C8322B" className="shrink-0" />
                          ) : (
                            <AlertTriangle size={16} color="#C49A2A" className="shrink-0" />
                          )}
                          <span
                            className="truncate"
                            style={{
                              fontFamily: "var(--font-system)",
                              fontSize: 12,
                              color: "#1C1917",
                            }}
                          >
                            {page.url}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {page.issueCount > 0 && (
                            <AdminStatusBadge
                              status="failed"
                              label={String(page.issueCount)}
                            />
                          )}
                          <StatusDot ok={page.status === 200} label="HTTP" />
                          <StatusDot ok={page.hasCanonical} label="Canon" />
                          <StatusDot ok={page.hasJsonLd} label="Schema" />
                          {expandedPages.has(page.url) ? (
                            <ChevronDown size={14} color="#78716C" />
                          ) : (
                            <ChevronRight size={14} color="#78716C" />
                          )}
                        </div>
                      </button>
                      {expandedPages.has(page.url) && (
                        <div className="px-4 pb-3 pl-11 space-y-3">
                          <div className="admin-card-inset p-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <Detail
                                icon={<Globe size={12} />}
                                label="Status"
                                value={
                                  page.status === 0
                                    ? "Unreachable"
                                    : String(page.status)
                                }
                              />
                              <Detail
                                icon={<Link2 size={12} />}
                                label="Canonical"
                                value={page.hasCanonical ? "Yes" : "Missing"}
                              />
                              <Detail
                                icon={<Languages size={12} />}
                                label="Hreflang"
                                value={page.hasHreflang ? "Yes" : "Missing"}
                              />
                              <Detail
                                icon={<Code size={12} />}
                                label="JSON-LD"
                                value={page.hasJsonLd ? "Yes" : "Missing"}
                              />
                              <Detail
                                icon={<FileText size={12} />}
                                label="Words"
                                value={String(page.wordCount)}
                              />
                              <Detail
                                icon={<FileText size={12} />}
                                label="Title"
                                value={
                                  page.title
                                    ? `${page.title.length} chars`
                                    : "Missing"
                                }
                              />
                            </div>
                          </div>
                          {page.issues.length > 0 && (
                            <div className="space-y-1.5">
                              {page.issues.map((issue, i) => {
                                const sc = severityColor(issue.severity);
                                return (
                                  <div
                                    key={i}
                                    className="flex items-start gap-2"
                                    style={{ fontSize: 11 }}
                                  >
                                    <span
                                      className="px-1.5 py-0.5 rounded font-mono shrink-0"
                                      style={{
                                        backgroundColor: sc.bg,
                                        color: sc.text,
                                        fontFamily: "var(--font-system)",
                                        fontSize: 10,
                                        fontWeight: 600,
                                      }}
                                    >
                                      {issue.severity}
                                    </span>
                                    <span style={{ color: "#5C564F" }}>
                                      {issue.message}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </AdminCard>
            </div>
          </>
        )}

        {/* Empty state */}
        {!result && !running && (
          <AdminEmptyState
            icon={Shield}
            title="No audit results yet"
            description='Tap "Run Quick Audit" to scan all pages for SEO compliance.'
            action={
              <AdminButton onClick={runAudit} variant="primary">
                <Zap size={14} />
                Run Quick Audit
              </AdminButton>
            }
          />
        )}

        {/* History */}
        {history.length > 0 && (
          <div>
            <AdminSectionLabel>Audit History</AdminSectionLabel>
            <AdminCard>
              <div className="divide-y divide-stone-100">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="px-4 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {entry.status === "success" ? (
                        <CheckCircle size={16} color="#2D5A3D" />
                      ) : entry.status === "error" ? (
                        <XCircle size={16} color="#C8322B" />
                      ) : (
                        <AlertTriangle size={16} color="#C49A2A" />
                      )}
                      <div>
                        <p
                          style={{
                            fontFamily: "var(--font-system)",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#1C1917",
                          }}
                        >
                          {new Date(entry.startedAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <p
                          style={{
                            fontFamily: "var(--font-system)",
                            fontSize: 10,
                            color: "#78716C",
                            marginTop: 2,
                          }}
                        >
                          {entry.itemsProcessed} pages,{" "}
                          {((entry.durationMs || 0) / 1000).toFixed(1)}s
                          {entry.errorMessage && (
                            <span style={{ color: "#C49A2A" }}>
                              {" "}
                              — {entry.errorMessage}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <AdminStatusBadge
                      status={
                        entry.status === "success"
                          ? "success"
                          : entry.status === "error"
                            ? "error"
                            : "warning"
                      }
                      label={entry.status}
                    />
                  </div>
                ))}
              </div>
            </AdminCard>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className="hidden md:inline-flex items-center gap-1"
      style={{
        fontFamily: "var(--font-system)",
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.5px",
        color: ok ? "#2D5A3D" : "#C8322B",
      }}
      title={`${label}: ${ok ? "OK" : "Missing"}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: ok ? "#2D5A3D" : "#C8322B" }}
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
    <div className="flex items-center gap-1.5">
      <span style={{ color: "#A8A29E" }}>{icon}</span>
      <span
        style={{
          fontFamily: "var(--font-system)",
          fontSize: 10,
          color: "#A8A29E",
          fontWeight: 500,
        }}
      >
        {label}:
      </span>
      <span
        style={{
          fontFamily: "var(--font-system)",
          fontSize: 10,
          color: "#44403C",
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </div>
  );
}
