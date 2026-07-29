"use client";

/**
 * Site Health Dashboard — Mobile-first SEO audit visibility
 *
 * Shows: health score, issue summary, category breakdown, hard gates,
 * issue list with filters, audit history, trigger button, export.
 *
 * Designed for Khaled's iPhone (375px), auto-refreshes when audit is running.
 */

import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SiteHealthOverview {
  siteId: string;
  healthScore: number | null;
  healthTrend: "improving" | "declining" | "stable" | "unknown";
  previousHealthScore: number | null;
  openIssues: { total: number; p0: number; p1: number; p2: number };
  issuesByCategory: Record<string, number>;
  lastAuditAt: string | null;
  isRunning: boolean;
  latestRun: AuditRunSummary | null;
}

interface AuditRunSummary {
  id: string;
  siteId: string;
  status: string;
  mode: string;
  triggeredBy: string;
  totalUrls: number;
  processedUrls: number;
  currentBatch: number;
  totalBatches: number;
  totalIssues: number;
  p0Count: number;
  p1Count: number;
  p2Count: number;
  healthScore: number | null;
  hardGatesPassed: boolean | null;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

interface AuditIssue {
  id: string;
  severity: string;
  category: string;
  url: string;
  title: string;
  description: string;
  evidence: unknown;
  suggestedFix: unknown;
  status: string;
  fingerprint: string;
  firstDetectedAt: string;
  lastDetectedAt: string;
  detectionCount: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// Known sites — populated from first API call or hardcoded fallback
const KNOWN_SITES = [
  { id: "yalla-london", name: "Yalla London" },
  { id: "zenitha-yachts-med", name: "Zenitha Yachts" },
  { id: "arabaldives", name: "Arabaldives" },
  { id: "french-riviera", name: "Yalla Riviera" },
  { id: "istanbul", name: "Yalla Istanbul" },
  { id: "thailand", name: "Yalla Thailand" },
];

export default function SiteHealthPage() {
  const [siteId, setSiteId] = useState<string>(() => {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\s*)siteId=([^;]*)/)
      if (match?.[1]) return match[1]
    }
    return "yalla-london"
  });
  const [overview, setOverview] = useState<SiteHealthOverview | null>(null);
  const [history, setHistory] = useState<AuditRunSummary[]>([]);
  const [issues, setIssues] = useState<AuditIssue[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [urlSearch, setUrlSearch] = useState<string>("");

  // Active tab
  const [activeTab, setActiveTab] = useState<"overview" | "issues" | "history">("overview");

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchOverview = useCallback(async () => {
    try {
      const url = siteId
        ? `/api/admin/audit-system?siteId=${encodeURIComponent(siteId)}`
        : "/api/admin/audit-system";
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setOverview(data.overview);
        setHistory(data.history ?? []);
        if (!siteId && data.overview?.siteId) {
          setSiteId(data.overview.siteId);
        }
      }
    } catch (err) {
      console.warn("[site-health] fetch overview failed:", err instanceof Error ? err.message : err);
    }
  }, [siteId]);

  const fetchIssues = useCallback(async () => {
    if (!overview?.latestRun?.id) return;
    try {
      const params = new URLSearchParams({
        siteId: overview.siteId,
        runId: overview.latestRun.id,
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (severityFilter) params.set("severity", severityFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (urlSearch) params.set("urlSearch", urlSearch);

      const res = await fetch(`/api/admin/audit-system/issues?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setIssues(data.issues ?? []);
        setPagination(data.pagination ?? pagination);
      }
    } catch (err) {
      console.warn("[site-health] fetch issues failed:", err instanceof Error ? err.message : err);
    }
  }, [overview, severityFilter, categoryFilter, statusFilter, urlSearch, pagination.page, pagination.limit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchOverview().finally(() => setLoading(false));
  }, [fetchOverview]);

  // Fetch issues when filters change
  useEffect(() => {
    if (activeTab === "issues") fetchIssues();
  }, [fetchIssues, activeTab]);

  // Auto-refresh when audit is running
  useEffect(() => {
    if (!overview?.isRunning) return undefined;
    const interval = setInterval(fetchOverview, 15_000);
    return () => clearInterval(interval);
  }, [overview?.isRunning, fetchOverview]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const triggerAudit = async () => {
    setTriggering(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/audit-system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: overview?.siteId || siteId, mode: "full" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Failed to trigger audit");
      } else {
        // Refresh to show active run
        await fetchOverview();
      }
    } catch (err) {
      setError("Could not connect to server. Check your network and try again.");
    } finally {
      setTriggering(false);
    }
  };

  const updateIssueStatus = async (issueId: string, newStatus: string) => {
    if (!overview?.latestRun?.id) return;
    try {
      const res = await fetch(
        `/api/admin/audit-system/${overview.latestRun.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ issueId, status: newStatus, siteId: overview.siteId }),
        }
      );
      if (res.ok) {
        await fetchIssues();
        await fetchOverview();
      }
    } catch (err) {
      console.warn("[site-health] update issue failed:", err instanceof Error ? err.message : err);
    }
  };

  const exportData = (format: "json" | "csv") => {
    const params = new URLSearchParams({ siteId: overview?.siteId ?? "", format });
    if (overview?.latestRun?.id) params.set("runId", overview.latestRun.id);
    window.open(`/api/admin/audit-system/export?${params}`, "_blank");
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const scoreColor = (score: number | null) => {
    if (score === null) return "#94a3b8";
    if (score >= 80) return "#22c55e";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const trendArrow = (trend: string) => {
    if (trend === "improving") return "▲";
    if (trend === "declining") return "▼";
    if (trend === "stable") return "—";
    return ""; // unknown trend — don't show confusing "?" next to score
  };

  const severityBadge = (severity: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      P0: { bg: "#fee2e2", text: "#dc2626" },
      P1: { bg: "#fef3c7", text: "#d97706" },
      P2: { bg: "#dbeafe", text: "#2563eb" },
    };
    const c = colors[severity] ?? { bg: "#f1f5f9", text: "#475569" };
    return (
      <span
        style={{
          padding: "2px 8px",
          borderRadius: 4,
          backgroundColor: c.bg,
          color: c.text,
          fontWeight: 600,
          fontSize: 12,
        }}
      >
        {severity}
      </span>
    );
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      open: { bg: "#fee2e2", text: "#dc2626" },
      ignored: { bg: "#f1f5f9", text: "#64748b" },
      fixed: { bg: "#dcfce7", text: "#16a34a" },
      wontfix: { bg: "#f1f5f9", text: "#94a3b8" },
      completed: { bg: "#dcfce7", text: "#16a34a" },
      failed: { bg: "#fee2e2", text: "#dc2626" },
      crawling: { bg: "#dbeafe", text: "#2563eb" },
      validating: { bg: "#fef3c7", text: "#d97706" },
      pending: { bg: "#f1f5f9", text: "#64748b" },
      inventory: { bg: "#dbeafe", text: "#2563eb" },
    };
    const c = colors[status] ?? { bg: "#f1f5f9", text: "#475569" };
    return (
      <span
        style={{
          padding: "2px 8px",
          borderRadius: 4,
          backgroundColor: c.bg,
          color: c.text,
          fontWeight: 500,
          fontSize: 12,
        }}
      >
        {status}
      </span>
    );
  };

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui" }}>
        <h1 style={{ fontSize: 20, marginBottom: 12 }}>Site Health</h1>
        <p style={{ color: "#64748b" }}>Loading audit data...</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div style={{ padding: 16, fontFamily: "system-ui", maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Site Health</h1>
          <select
            value={siteId}
            onChange={(e) => {
              setSiteId(e.target.value);
              setOverview(null);
              setIssues([]);
              setHistory([]);
              setLoading(true);
            }}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #e2e8f0",
              fontSize: 12,
              backgroundColor: "#fff",
            }}
          >
            {KNOWN_SITES.map((site) => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={triggerAudit}
            disabled={triggering || overview?.isRunning}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              backgroundColor: overview?.isRunning ? "#94a3b8" : "#2563eb",
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
              cursor: overview?.isRunning ? "default" : "pointer",
            }}
          >
            {triggering ? "Starting..." : overview?.isRunning ? "Audit Running..." : "Run Audit Now"}
          </button>
          <button
            onClick={() => exportData("json")}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #e2e8f0",
              backgroundColor: "#fff",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Export
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: 12, backgroundColor: "#fee2e2", borderRadius: 6, marginBottom: 16, color: "#dc2626", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Running progress banner */}
      {overview?.isRunning && overview.latestRun && (
        <div style={{ padding: 12, backgroundColor: "#dbeafe", borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          <strong>Audit in progress:</strong> {overview.latestRun.status} — {overview.latestRun.processedUrls}/{overview.latestRun.totalUrls} URLs
          (batch {overview.latestRun.currentBatch}/{overview.latestRun.totalBatches})
          <div style={{ marginTop: 6, backgroundColor: "#bfdbfe", borderRadius: 4, height: 6, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${overview.latestRun.totalUrls > 0 ? (overview.latestRun.processedUrls / overview.latestRun.totalUrls) * 100 : 0}%`,
                backgroundColor: "#2563eb",
                borderRadius: 4,
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "2px solid #e2e8f0" }}>
        {(["overview", "issues", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 20px",
              border: "none",
              backgroundColor: "transparent",
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? "#2563eb" : "#64748b",
              borderBottom: activeTab === tab ? "2px solid #2563eb" : "2px solid transparent",
              marginBottom: -2,
              cursor: "pointer",
              fontSize: 14,
              textTransform: "capitalize",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <OverviewTab
          overview={overview}
          scoreColor={scoreColor}
          trendArrow={trendArrow}
          severityBadge={severityBadge}
        />
      )}

      {activeTab === "issues" && (
        <IssuesTab
          issues={issues}
          pagination={pagination}
          setPagination={setPagination}
          severityFilter={severityFilter}
          setSeverityFilter={setSeverityFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          urlSearch={urlSearch}
          setUrlSearch={setUrlSearch}
          severityBadge={severityBadge}
          statusBadge={statusBadge}
          updateIssueStatus={updateIssueStatus}
          overview={overview}
        />
      )}

      {activeTab === "history" && (
        <HistoryTab
          history={history}
          statusBadge={statusBadge}
          scoreColor={scoreColor}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function OverviewTab({
  overview,
  scoreColor,
  trendArrow,
  severityBadge,
}: {
  overview: SiteHealthOverview | null;
  scoreColor: (s: number | null) => string;
  trendArrow: (t: string) => string;
  severityBadge: (s: string) => React.ReactNode;
}) {
  if (!overview) {
    return <p style={{ color: "#64748b", fontSize: 14 }}>No audit data yet. Click &quot;Run Audit Now&quot; to start.</p>;
  }

  const categories = Object.entries(overview.issuesByCategory).sort(
    ([, a], [, b]) => b - a
  );
  const maxCatCount = Math.max(...categories.map(([, c]) => c), 1);

  return (
    <div>
      {/* Health Score */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 200px", padding: 20, borderRadius: 8, border: "1px solid #e2e8f0", textAlign: "center" }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: scoreColor(overview.healthScore) }}>
            {overview.healthScore ?? "—"}
          </div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            Health Score{" "}
            <span style={{ color: overview.healthTrend === "improving" ? "#22c55e" : overview.healthTrend === "declining" ? "#ef4444" : "#94a3b8" }}>
              {trendArrow(overview.healthTrend)}
            </span>
            {overview.previousHealthScore !== null && (
              <span style={{ fontSize: 11, color: "#94a3b8" }}> (prev: {overview.previousHealthScore})</span>
            )}
          </div>
          {overview.lastAuditAt && (
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
              Last audit: {new Date(overview.lastAuditAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* Severity cards */}
        {[
          { label: "Blockers", key: "p0" as const, color: "#dc2626" },
          { label: "High", key: "p1" as const, color: "#d97706" },
          { label: "Medium", key: "p2" as const, color: "#2563eb" },
        ].map(({ label, key, color }) => (
          <div key={key} style={{ flex: "1 1 100px", padding: 16, borderRadius: 8, border: "1px solid #e2e8f0", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color }}>
              {overview.openIssues[key]}
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
          </div>
        ))}

        <div style={{ flex: "1 1 100px", padding: 16, borderRadius: 8, border: "1px solid #e2e8f0", textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#475569" }}>
            {overview.openIssues.total}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Total Open</div>
        </div>
      </div>

      {/* Hard Gates — only show when the audit actually produced a health score */}
      {overview.latestRun?.hardGatesPassed !== null && overview.latestRun?.healthScore !== null && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Hard Gates</h3>
          {overview.latestRun?.hardGatesPassed ? (
            <div style={{ padding: 12, borderRadius: 6, backgroundColor: "#dcfce7", color: "#16a34a", fontWeight: 600, fontSize: 13 }}>
              ALL GATES PASSED
            </div>
          ) : overview.openIssues.total === 0 ? (
            <div style={{ padding: 12, borderRadius: 6, backgroundColor: "#fef3c7", color: "#92400e", fontWeight: 600, fontSize: 13 }}>
              Previous audit had gate failures — all issues since resolved. Re-run audit to verify.
            </div>
          ) : (
            <div style={{ padding: 12, borderRadius: 6, backgroundColor: "#fee2e2", color: "#dc2626", fontWeight: 600, fontSize: 13 }}>
              GATES FAILED — Action Required
            </div>
          )}
        </div>
      )}
      {/* Show info when audit has no health score */}
      {overview.latestRun && overview.latestRun.healthScore === null && !overview.isRunning && (
        <div style={{ padding: 12, borderRadius: 6, backgroundColor: "#f1f5f9", color: "#475569", fontSize: 13, marginBottom: 20 }}>
          Last audit did not produce a health score. Tap &quot;Run Audit&quot; to get fresh results.
        </div>
      )}

      {/* Category Breakdown */}
      {categories.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Issues by Category</h3>
          {categories.map(([cat, count]) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 80, fontSize: 12, color: "#64748b", textTransform: "capitalize" }}>{cat}</div>
              <div style={{ flex: 1, backgroundColor: "#f1f5f9", borderRadius: 4, height: 16, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${(count / maxCatCount) * 100}%`,
                    backgroundColor: "#2563eb",
                    borderRadius: 4,
                  }}
                />
              </div>
              <div style={{ width: 30, fontSize: 12, fontWeight: 600, textAlign: "right" }}>{count}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Issues Tab
// ---------------------------------------------------------------------------

function IssuesTab({
  issues,
  pagination,
  setPagination,
  severityFilter,
  setSeverityFilter,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  urlSearch,
  setUrlSearch,
  severityBadge,
  statusBadge,
  updateIssueStatus,
  overview,
}: {
  issues: AuditIssue[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  setPagination: (p: { page: number; limit: number; total: number; totalPages: number }) => void;
  severityFilter: string;
  setSeverityFilter: (s: string) => void;
  categoryFilter: string;
  setCategoryFilter: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  urlSearch: string;
  setUrlSearch: (s: string) => void;
  severityBadge: (s: string) => React.ReactNode;
  statusBadge: (s: string) => React.ReactNode;
  updateIssueStatus: (id: string, status: string) => void;
  overview: SiteHealthOverview | null;
}) {
  const selectStyle: React.CSSProperties = {
    padding: "6px 8px",
    borderRadius: 4,
    border: "1px solid #e2e8f0",
    fontSize: 12,
    backgroundColor: "#fff",
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={selectStyle}>
          <option value="">All Severities</option>
          <option value="P0">P0 - Blocker</option>
          <option value="P1">P1 - High</option>
          <option value="P2">P2 - Medium</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={selectStyle}>
          <option value="">All Categories</option>
          {["http", "canonical", "hreflang", "sitemap", "schema", "links", "metadata", "robots", "performance", "risk"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="ignored">Ignored</option>
          <option value="fixed">Fixed</option>
          <option value="wontfix">Won&apos;t Fix</option>
        </select>
        <input
          type="text"
          placeholder="Search URL..."
          value={urlSearch}
          onChange={(e) => setUrlSearch(e.target.value)}
          style={{ ...selectStyle, flex: "1 1 150px" }}
        />
      </div>

      {/* Results count */}
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
        {pagination.total} issues found (page {pagination.page} of {pagination.totalPages})
      </div>

      {/* Issue cards */}
      {issues.length === 0 ? (
        <p style={{ color: "#64748b", fontSize: 14, textAlign: "center", padding: 40 }}>
          {overview?.latestRun ? "No issues matching filters." : "No audit data yet."}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {issues.map((issue) => (
            <div
              key={issue.id}
              style={{
                padding: 12,
                borderRadius: 6,
                border: "1px solid #e2e8f0",
                backgroundColor: "#fff",
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                {severityBadge(issue.severity)}
                <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>{issue.category}</span>
                {statusBadge(issue.status)}
                {issue.detectionCount > 1 && (
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>seen {issue.detectionCount}x</span>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{issue.title}</div>
              <div style={{ fontSize: 12, color: "#64748b", wordBreak: "break-all", marginBottom: 4 }}>
                {issue.url}
              </div>
              {issue.suggestedFix && (
                <div style={{ fontSize: 11, color: "#16a34a", backgroundColor: "#f0fdf4", padding: "4px 8px", borderRadius: 4, marginBottom: 8 }}>
                  Fix: {typeof issue.suggestedFix === "string" ? issue.suggestedFix : JSON.stringify(issue.suggestedFix)}
                </div>
              )}

              {/* Actions */}
              {issue.status === "open" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => updateIssueStatus(issue.id, "ignored")}
                    style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", fontSize: 11, cursor: "pointer" }}
                  >
                    Ignore
                  </button>
                  <button
                    onClick={() => updateIssueStatus(issue.id, "fixed")}
                    style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #dcfce7", backgroundColor: "#f0fdf4", fontSize: 11, cursor: "pointer", color: "#16a34a" }}
                  >
                    Mark Fixed
                  </button>
                  <button
                    onClick={() => updateIssueStatus(issue.id, "wontfix")}
                    style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", fontSize: 11, cursor: "pointer", color: "#94a3b8" }}
                  >
                    Won&apos;t Fix
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          <button
            disabled={pagination.page <= 1}
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            style={{ padding: "6px 12px", borderRadius: 4, border: "1px solid #e2e8f0", fontSize: 12, cursor: pagination.page <= 1 ? "default" : "pointer" }}
          >
            Previous
          </button>
          <span style={{ padding: "6px 12px", fontSize: 12, color: "#64748b" }}>
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            style={{ padding: "6px 12px", borderRadius: 4, border: "1px solid #e2e8f0", fontSize: 12, cursor: pagination.page >= pagination.totalPages ? "default" : "pointer" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// History Tab
// ---------------------------------------------------------------------------

function HistoryTab({
  history,
  statusBadge,
  scoreColor,
}: {
  history: AuditRunSummary[];
  statusBadge: (s: string) => React.ReactNode;
  scoreColor: (s: number | null) => string;
}) {
  if (history.length === 0) {
    return <p style={{ color: "#64748b", fontSize: 14 }}>No audit history yet.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {history.map((run) => (
        <div
          key={run.id}
          style={{
            padding: 12,
            borderRadius: 6,
            border: "1px solid #e2e8f0",
            backgroundColor: "#fff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {statusBadge(run.status)}
              <span style={{ fontSize: 11, color: "#94a3b8" }}>{run.triggeredBy}</span>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>{run.mode}</span>
            </div>
            {run.healthScore !== null && (
              <span style={{ fontSize: 20, fontWeight: 700, color: scoreColor(run.healthScore) }}>
                {run.healthScore}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#475569" }}>
            {run.totalUrls} URLs audited — {run.totalIssues} issues
            (P0: {run.p0Count}, P1: {run.p1Count}, P2: {run.p2Count})
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
            {new Date(run.startedAt).toLocaleString()}
            {run.completedAt && ` — ${Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`}
          </div>
          {run.errorMessage && (
            <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>
              Error: {run.errorMessage}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
