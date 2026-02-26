"use client";

/**
 * Commerce Cockpit — Multi-tab dashboard for the Hybrid Commerce Engine
 *
 * Tab 1: Overview (revenue, pipeline, alerts, quick actions)
 * Tab 2: Trends (TrendRun history, niche cards, manual trigger)
 * Tab 3: Briefs (ProductBrief table, approve/reject, filtering)
 * Tab 4: Products (DigitalProducts with commerce metadata)
 *
 * Mobile-first, iPhone 375px optimized.
 */

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────

interface CommerceStats {
  siteId: string;
  period: string;
  revenue: {
    website: { totalCents: number; orders: number };
    etsy: { totalCents: number; orders: number };
    combined: { totalCents: number; orders: number };
  };
  products: { total: number; active: number };
  pipeline: {
    briefs: Record<string, number>;
    trendRuns: number;
    activeCampaigns: number;
  };
  topProducts: {
    productId: string;
    name: string;
    tier: number | null;
    revenueCents: number;
    orders: number;
  }[];
  alerts: {
    unread: number;
    recent: {
      id: string;
      type: string;
      severity: string;
      title: string;
      message: string;
      createdAt: string;
      actionUrl?: string;
    }[];
  };
}

interface TrendRunSummary {
  id: string;
  siteId: string;
  runDate: string;
  status: string;
  nicheCount: number;
  briefCount: number;
  topNiches: { name: string; score: number }[];
  briefs: { id: string; title: string; status: string; tier: number }[];
  estimatedCostUsd: number;
  durationMs: number | null;
  errorMessage: string | null;
}

interface ProductBrief {
  id: string;
  siteId: string;
  title: string;
  description: string | null;
  productType: string;
  tier: number;
  ontologyCategory: string | null;
  targetPrice: number | null;
  status: string;
  keywordsJson: string[] | null;
  createdAt: string;
  approvedAt: string | null;
  rejectionNote: string | null;
  trendRun?: { id: string; runDate: string } | null;
}

// ─── Tab definitions ──────────────────────────────────────

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "trends", label: "Trends" },
  { key: "briefs", label: "Briefs" },
  { key: "products", label: "Products" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Component ────────────────────────────────────────────

export default function CommerceHQPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [stats, setStats] = useState<CommerceStats | null>(null);
  const [trendRuns, setTrendRuns] = useState<TrendRunSummary[]>([]);
  const [briefs, setBriefs] = useState<ProductBrief[]>([]);
  const [briefSummary, setBriefSummary] = useState<{
    total: number;
    byStatus: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [briefFilter, setBriefFilter] = useState<string>("all");

  // ─── Data fetching ──────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/commerce/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.warn("[commerce-hq] Stats error:", err);
    }
  }, []);

  const fetchTrends = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/commerce/trends?limit=10");
      if (!res.ok) throw new Error("Failed to load trends");
      const data = await res.json();
      setTrendRuns(data.data ?? []);
    } catch (err) {
      console.warn("[commerce-hq] Trends error:", err);
    }
  }, []);

  const fetchBriefs = useCallback(async () => {
    try {
      const statusParam = briefFilter !== "all" ? `&status=${briefFilter}` : "";
      const res = await fetch(
        `/api/admin/commerce/briefs?limit=50${statusParam}`,
      );
      if (!res.ok) throw new Error("Failed to load briefs");
      const data = await res.json();
      setBriefs(data.data ?? []);
      setBriefSummary(data.summary ?? null);
    } catch (err) {
      console.warn("[commerce-hq] Briefs error:", err);
    }
  }, [briefFilter]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStats(), fetchTrends(), fetchBriefs()])
      .catch(() => setError("Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, [fetchStats, fetchTrends, fetchBriefs]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // ─── Actions ────────────────────────────────────────────

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const runTrendScan = async () => {
    setActionLoading("trend-scan");
    try {
      const res = await fetch("/api/admin/commerce/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_now" }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        await Promise.all([fetchTrends(), fetchBriefs(), fetchStats()]);
      } else {
        showToast(`Error: ${data.error}`);
      }
    } catch {
      showToast("Trend scan failed");
    } finally {
      setActionLoading(null);
    }
  };

  const generateReport = async () => {
    setActionLoading("report");
    try {
      const res = await fetch("/api/admin/commerce/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
      } else {
        showToast(`Error: ${data.error}`);
      }
    } catch {
      showToast("Report generation failed");
    } finally {
      setActionLoading(null);
    }
  };

  const approveBrief = async (briefId: string) => {
    setActionLoading(briefId);
    try {
      const res = await fetch("/api/admin/commerce/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", briefId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        await fetchBriefs();
      } else {
        showToast(`Error: ${data.error}`);
      }
    } catch {
      showToast("Approve failed");
    } finally {
      setActionLoading(null);
    }
  };

  const rejectBrief = async (briefId: string) => {
    setActionLoading(briefId);
    try {
      const res = await fetch("/api/admin/commerce/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", briefId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        await fetchBriefs();
      } else {
        showToast(`Error: ${data.error}`);
      }
    } catch {
      showToast("Reject failed");
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Helpers ────────────────────────────────────────────

  const formatCents = (cents: number) =>
    `$${(cents / 100).toFixed(2)}`;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700",
      approved: "bg-green-100 text-green-700",
      in_production: "bg-blue-100 text-blue-700",
      listed: "bg-purple-100 text-purple-700",
      archived: "bg-red-100 text-red-700",
      completed: "bg-green-100 text-green-700",
      running: "bg-yellow-100 text-yellow-700",
      failed: "bg-red-100 text-red-700",
      pending: "bg-gray-100 text-gray-600",
    };
    return colors[status] ?? "bg-gray-100 text-gray-600";
  };

  const tierLabel = (tier: number) => {
    const labels: Record<number, string> = {
      1: "Tier 1 (High)",
      2: "Tier 2 (Mid)",
      3: "Tier 3 (Niche)",
    };
    return labels[tier] ?? `Tier ${tier}`;
  };

  // ─── Render ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading Commerce HQ...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 font-medium">Dashboard Error</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-red-700 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm max-w-xs">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <h1 className="text-lg font-bold text-gray-900">Commerce HQ</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Hybrid Commerce Engine — Digital Products Pipeline
        </p>
      </div>

      {/* Tab Bar */}
      <div className="bg-white border-b overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 max-w-4xl mx-auto">
        {activeTab === "overview" && (
          <OverviewTab
            stats={stats}
            formatCents={formatCents}
            onRunTrendScan={runTrendScan}
            onGenerateReport={generateReport}
            actionLoading={actionLoading}
          />
        )}
        {activeTab === "trends" && (
          <TrendsTab
            runs={trendRuns}
            formatDate={formatDate}
            statusColor={statusColor}
            onRunTrendScan={runTrendScan}
            actionLoading={actionLoading}
          />
        )}
        {activeTab === "briefs" && (
          <BriefsTab
            briefs={briefs}
            summary={briefSummary}
            filter={briefFilter}
            onFilterChange={(f) => setBriefFilter(f)}
            formatCents={formatCents}
            formatDate={formatDate}
            statusColor={statusColor}
            tierLabel={tierLabel}
            onApprove={approveBrief}
            onReject={rejectBrief}
            actionLoading={actionLoading}
          />
        )}
        {activeTab === "products" && (
          <ProductsTab stats={stats} formatCents={formatCents} tierLabel={tierLabel} />
        )}
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────

function OverviewTab({
  stats,
  formatCents,
  onRunTrendScan,
  onGenerateReport,
  actionLoading,
}: {
  stats: CommerceStats | null;
  formatCents: (c: number) => string;
  onRunTrendScan: () => void;
  onGenerateReport: () => void;
  actionLoading: string | null;
}) {
  if (!stats) return <p className="text-gray-500 text-sm">No data available</p>;

  return (
    <div className="space-y-4">
      {/* Revenue Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Website Revenue
          </p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {formatCents(stats.revenue.website.totalCents)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {stats.revenue.website.orders} orders
          </p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Etsy Revenue
          </p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {formatCents(stats.revenue.etsy.totalCents)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {stats.revenue.etsy.orders} orders
          </p>
        </div>
      </div>

      {/* Combined Revenue */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
        <p className="text-xs text-blue-600 uppercase tracking-wide font-medium">
          Total Revenue ({stats.period})
        </p>
        <p className="text-2xl font-bold text-blue-900 mt-1">
          {formatCents(stats.revenue.combined.totalCents)}
        </p>
        <p className="text-xs text-blue-600 mt-0.5">
          {stats.revenue.combined.orders} total orders
        </p>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {stats.products.active}
          </p>
          <p className="text-xs text-gray-500">Active Products</p>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {stats.pipeline.trendRuns}
          </p>
          <p className="text-xs text-gray-500">Trend Runs</p>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {stats.pipeline.activeCampaigns}
          </p>
          <p className="text-xs text-gray-500">Campaigns</p>
        </div>
      </div>

      {/* Brief Pipeline */}
      {stats.pipeline.briefs &&
        Object.keys(stats.pipeline.briefs).length > 0 && (
          <div className="bg-white rounded-lg border p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Brief Pipeline
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.pipeline.briefs).map(([status, count]) => (
                <span
                  key={status}
                  className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700"
                >
                  {status}: {count}
                </span>
              ))}
            </div>
          </div>
        )}

      {/* Alerts */}
      {stats.alerts.unread > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-amber-900 mb-2">
            {stats.alerts.unread} Unread Alert
            {stats.alerts.unread !== 1 ? "s" : ""}
          </h3>
          <div className="space-y-2">
            {stats.alerts.recent.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className="text-xs text-amber-800 flex items-start gap-2"
              >
                <span
                  className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    alert.severity === "critical"
                      ? "bg-red-500"
                      : alert.severity === "warning"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                  }`}
                />
                <span>
                  <strong>{alert.title}</strong> — {alert.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Products */}
      {stats.topProducts.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Top Products
          </h3>
          <div className="space-y-2">
            {stats.topProducts.map((p, i) => (
              <div
                key={p.productId}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-600">
                  {i + 1}. {p.name}
                </span>
                <span className="font-medium text-gray-900">
                  {formatCents(p.revenueCents)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onRunTrendScan}
            disabled={actionLoading === "trend-scan"}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {actionLoading === "trend-scan"
              ? "Scanning..."
              : "Run Trend Scan"}
          </button>
          <button
            onClick={() =>
              (window.location.href = "/admin/shop")
            }
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            View Shop
          </button>
          <button
            onClick={onGenerateReport}
            disabled={actionLoading === "report"}
            className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {actionLoading === "report" ? "Generating..." : "Weekly Report"}
          </button>
          <button
            onClick={() =>
              (window.location.href = "/admin/cockpit/commerce?tab=briefs")
            }
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            View Briefs
          </button>
        </div>
      </div>

      {/* Payout Profile */}
      <PayoutProfileCard />
    </div>
  );
}

// ─── Trends Tab ───────────────────────────────────────────

function TrendsTab({
  runs,
  formatDate,
  statusColor,
  onRunTrendScan,
  actionLoading,
}: {
  runs: TrendRunSummary[];
  formatDate: (d: string) => string;
  statusColor: (s: string) => string;
  onRunTrendScan: () => void;
  actionLoading: string | null;
}) {
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Run Now button */}
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold text-gray-900">
          Trend Research History
        </h2>
        <button
          onClick={onRunTrendScan}
          disabled={actionLoading === "trend-scan"}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {actionLoading === "trend-scan" ? "Running..." : "Run Now"}
        </button>
      </div>

      {runs.length === 0 ? (
        <div className="bg-white rounded-lg border p-6 text-center">
          <p className="text-gray-500 text-sm">
            No trend runs yet. Click &quot;Run Now&quot; to start your first
            market research scan.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <div key={run.id} className="bg-white rounded-lg border">
              <button
                onClick={() =>
                  setExpandedRun(expandedRun === run.id ? null : run.id)
                }
                className="w-full p-3 text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(run.runDate)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {run.nicheCount} niches, {run.briefCount} briefs
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${statusColor(run.status)}`}
                    >
                      {run.status}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {expandedRun === run.id ? "▼" : "▶"}
                    </span>
                  </div>
                </div>
              </button>

              {expandedRun === run.id && (
                <div className="border-t px-3 pb-3 space-y-2">
                  {/* Top niches */}
                  {run.topNiches.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-600 mb-1">
                        Top Niches:
                      </p>
                      {run.topNiches.map((n, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs py-1"
                        >
                          <span className="text-gray-700">{n.name}</span>
                          <span className="font-medium text-blue-600">
                            {n.score}/100
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Meta */}
                  <div className="text-xs text-gray-400 flex gap-3">
                    {run.durationMs && (
                      <span>{(run.durationMs / 1000).toFixed(1)}s</span>
                    )}
                    <span>${run.estimatedCostUsd.toFixed(4)}</span>
                  </div>
                  {run.errorMessage && (
                    <p className="text-xs text-red-600 mt-1">
                      {run.errorMessage}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Briefs Tab ───────────────────────────────────────────

function BriefsTab({
  briefs,
  summary,
  filter,
  onFilterChange,
  formatCents,
  formatDate,
  statusColor,
  tierLabel,
  onApprove,
  onReject,
  actionLoading,
}: {
  briefs: ProductBrief[];
  summary: { total: number; byStatus: Record<string, number> } | null;
  filter: string;
  onFilterChange: (f: string) => void;
  formatCents: (c: number) => string;
  formatDate: (d: string) => string;
  statusColor: (s: string) => string;
  tierLabel: (t: number) => string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  actionLoading: string | null;
}) {
  const statuses = ["all", "draft", "approved", "in_production", "listed", "archived"];

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(summary.byStatus).map(([status, count]) => (
            <button
              key={status}
              onClick={() => onFilterChange(status)}
              className={`bg-white rounded-lg border p-2 text-center transition-colors ${
                filter === status ? "ring-2 ring-blue-500" : ""
              }`}
            >
              <p className="text-lg font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 capitalize">{status}</p>
            </button>
          ))}
        </div>
      )}

      {/* Filter row */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => onFilterChange(s)}
            className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap ${
              filter === s
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {s === "all" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Brief cards */}
      {briefs.length === 0 ? (
        <div className="bg-white rounded-lg border p-6 text-center">
          <p className="text-gray-500 text-sm">
            No product briefs yet. Run a trend scan to generate opportunities.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {briefs.map((brief) => (
            <div key={brief.id} className="bg-white rounded-lg border p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {brief.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${statusColor(brief.status)}`}
                    >
                      {brief.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {tierLabel(brief.tier)}
                    </span>
                    {brief.targetPrice && (
                      <span className="text-xs text-gray-400">
                        {formatCents(brief.targetPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {brief.description && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                  {brief.description}
                </p>
              )}

              {/* Keywords */}
              {brief.keywordsJson &&
                Array.isArray(brief.keywordsJson) &&
                brief.keywordsJson.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(brief.keywordsJson as string[]).slice(0, 5).map((kw, i) => (
                      <span
                        key={i}
                        className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}

              {/* Actions for draft briefs */}
              {brief.status === "draft" && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => onApprove(brief.id)}
                    disabled={actionLoading === brief.id}
                    className="flex-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading === brief.id ? "..." : "Approve"}
                  </button>
                  <button
                    onClick={() => onReject(brief.id)}
                    disabled={actionLoading === brief.id}
                    className="flex-1 px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}

              {/* Meta */}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span>{formatDate(brief.createdAt)}</span>
                {brief.ontologyCategory && (
                  <span>{brief.ontologyCategory.replace("_", " ")}</span>
                )}
                <span>{brief.productType}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Products Tab ─────────────────────────────────────────

function ProductsTab({
  stats,
  formatCents,
  tierLabel,
}: {
  stats: CommerceStats | null;
  formatCents: (c: number) => string;
  tierLabel: (t: number) => string;
}) {
  if (!stats) return <p className="text-gray-500 text-sm">No data available</p>;

  return (
    <div className="space-y-4">
      {/* Product counts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {stats.products.total}
          </p>
          <p className="text-xs text-gray-500">Total Products</p>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold text-green-600">
            {stats.products.active}
          </p>
          <p className="text-xs text-gray-500">Active</p>
        </div>
      </div>

      {/* Top selling */}
      {stats.topProducts.length > 0 ? (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Revenue by Product
          </h3>
          <div className="space-y-3">
            {stats.topProducts.map((p) => (
              <div key={p.productId} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-900">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {p.tier && (
                      <span className="text-xs text-gray-400">
                        {tierLabel(p.tier)}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {p.orders} orders
                    </span>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {formatCents(p.revenueCents)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border p-6 text-center">
          <p className="text-gray-500 text-sm">
            No product sales yet. Create products from approved briefs to start
            selling.
          </p>
          <button
            onClick={() =>
              (window.location.href = "/admin/shop")
            }
            className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Shop Manager
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Payout Profile Card ─────────────────────────────────

function PayoutProfileCard() {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Payout Profile
      </h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Bank</span>
          <span className="text-sm text-gray-900">Mercury Business Checking</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Entity</span>
          <span className="text-sm text-gray-900">Zenitha.Luxury LLC</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">ABA Routing</span>
          <span className="text-sm font-mono text-gray-900">091311229</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Account</span>
          <span className="text-sm font-mono text-gray-900">****9197</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">SWIFT</span>
          <span className="text-sm font-mono text-gray-900">CHFGUS44021</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Non-USD Intermediary</span>
          <span className="text-sm text-gray-900">JPMorgan Chase</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">Status</span>
          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
            Verified
          </span>
        </div>
      </div>
    </div>
  );
}
