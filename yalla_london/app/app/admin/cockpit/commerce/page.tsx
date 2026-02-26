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
  { key: "etsy", label: "Etsy" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Etsy Types ──────────────────────────────────────────

interface EtsyStatus {
  configured: boolean;
  connected: boolean;
  connectionStatus?: string;
  shopName?: string;
  shopId?: string;
  shopUrl?: string;
  tokenExpiresAt?: string;
  lastTestedAt?: string;
  stats?: {
    totalDrafts: number;
    publishedOnEtsy: number;
    pendingPublish: number;
  };
  message?: string;
  error?: string;
}

interface EtsyDraft {
  id: string;
  title: string;
  status: string;
  price: number;
  tags: string[];
  etsyListingId?: string;
  etsyUrl?: string;
  etsyState?: string;
  errorMessage?: string;
  publishedAt?: string;
  createdAt: string;
}

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
  const [etsyStatus, setEtsyStatus] = useState<EtsyStatus | null>(null);
  const [etsyDrafts, setEtsyDrafts] = useState<EtsyDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [briefFilter, setBriefFilter] = useState<string>("all");
  const [quickCreateIdea, setQuickCreateIdea] = useState("");
  const [quickCreateResult, setQuickCreateResult] = useState<{
    success: boolean;
    title?: string;
    tags?: string[];
    price?: number;
    draftId?: string;
    complianceValid?: boolean;
    complianceIssues?: { field: string; message: string }[];
    error?: string;
  } | null>(null);

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

  const fetchEtsyStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/commerce/etsy");
      if (!res.ok) throw new Error("Failed to load Etsy status");
      const data = await res.json();
      setEtsyStatus(data);
    } catch (err) {
      console.warn("[commerce-hq] Etsy status error:", err);
    }
  }, []);

  const fetchEtsyDrafts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/commerce/listings");
      if (!res.ok) return;
      const data = await res.json();
      setEtsyDrafts(data.data ?? []);
    } catch (err) {
      console.warn("[commerce-hq] Etsy drafts error:", err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStats(), fetchTrends(), fetchBriefs(), fetchEtsyStatus(), fetchEtsyDrafts()])
      .catch(() => setError("Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, [fetchStats, fetchTrends, fetchBriefs, fetchEtsyStatus, fetchEtsyDrafts]);

  // Check URL params for Etsy OAuth callback messages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("etsy_connected") === "true") {
      showToast("Etsy connected successfully!");
      setActiveTab("etsy");
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
      fetchEtsyStatus();
    }
    const etsyError = params.get("etsy_error");
    if (etsyError) {
      showToast(`Etsy error: ${etsyError}`);
      setActiveTab("etsy");
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const testEtsyConnection = async () => {
    setActionLoading("etsy-test");
    try {
      const res = await fetch("/api/admin/commerce/etsy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_connection" }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Connected to ${data.shopName} (${data.listingCount} listings)`);
        await fetchEtsyStatus();
      } else {
        showToast(`Connection failed: ${data.error}`);
      }
    } catch {
      showToast("Connection test failed");
    } finally {
      setActionLoading(null);
    }
  };

  const publishToEtsy = async (draftId: string) => {
    setActionLoading(`publish-${draftId}`);
    try {
      const res = await fetch("/api/admin/commerce/etsy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish_draft", draftId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Published! ${data.etsyUrl}`);
        await Promise.all([fetchEtsyStatus(), fetchEtsyDrafts()]);
      } else {
        showToast(`Publish failed: ${data.error}`);
      }
    } catch {
      showToast("Publish to Etsy failed");
    } finally {
      setActionLoading(null);
    }
  };

  const disconnectEtsy = async () => {
    if (!confirm("Disconnect Etsy shop? You can reconnect anytime.")) return;
    setActionLoading("etsy-disconnect");
    try {
      const res = await fetch("/api/admin/commerce/etsy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Etsy disconnected");
        await fetchEtsyStatus();
      } else {
        showToast(`Error: ${data.error}`);
      }
    } catch {
      showToast("Disconnect failed");
    } finally {
      setActionLoading(null);
    }
  };

  const quickCreateProduct = async () => {
    if (!quickCreateIdea.trim() || quickCreateIdea.trim().length < 5) {
      showToast("Product idea must be at least 5 characters");
      return;
    }
    setActionLoading("quick-create");
    setQuickCreateResult(null);
    try {
      const res = await fetch("/api/admin/commerce/quick-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: quickCreateIdea.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setQuickCreateResult({
          success: true,
          title: data.title,
          tags: data.tags,
          price: data.price,
          draftId: data.draftId,
          complianceValid: data.complianceValid,
          complianceIssues: data.complianceIssues,
        });
        setQuickCreateIdea("");
        showToast(`Created: ${data.title}`);
        await Promise.all([fetchEtsyDrafts(), fetchStats(), fetchBriefs()]);
      } else {
        setQuickCreateResult({ success: false, error: data.error });
        showToast(`Error: ${data.error}`);
      }
    } catch {
      showToast("Quick create failed");
      setQuickCreateResult({ success: false, error: "Network error" });
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
        {activeTab === "etsy" && (
          <EtsyTab
            status={etsyStatus}
            drafts={etsyDrafts}
            formatCents={formatCents}
            formatDate={formatDate}
            statusColor={statusColor}
            onTestConnection={testEtsyConnection}
            onPublish={publishToEtsy}
            onDisconnect={disconnectEtsy}
            quickCreateIdea={quickCreateIdea}
            onQuickCreateIdeaChange={setQuickCreateIdea}
            onQuickCreate={quickCreateProduct}
            quickCreateResult={quickCreateResult}
            actionLoading={actionLoading}
          />
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

// ─── Etsy Tab ────────────────────────────────────────────

function EtsyTab({
  status,
  drafts,
  formatCents,
  formatDate,
  statusColor,
  onTestConnection,
  onPublish,
  onDisconnect,
  quickCreateIdea,
  onQuickCreateIdeaChange,
  onQuickCreate,
  quickCreateResult,
  actionLoading,
}: {
  status: EtsyStatus | null;
  drafts: EtsyDraft[];
  formatCents: (c: number) => string;
  formatDate: (d: string) => string;
  statusColor: (s: string) => string;
  onTestConnection: () => void;
  onPublish: (draftId: string) => void;
  onDisconnect: () => void;
  quickCreateIdea: string;
  onQuickCreateIdeaChange: (v: string) => void;
  onQuickCreate: () => void;
  quickCreateResult: {
    success: boolean;
    title?: string;
    tags?: string[];
    price?: number;
    draftId?: string;
    complianceValid?: boolean;
    complianceIssues?: { field: string; message: string }[];
    error?: string;
  } | null;
  actionLoading: string | null;
}) {
  return (
    <div className="space-y-4">
      {/* Connection Status Card */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Etsy Shop Connection
          </h3>
          {status?.connected && (
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
              Connected
            </span>
          )}
          {status && !status.connected && status.configured && (
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
              Not Connected
            </span>
          )}
          {status && !status.configured && (
            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
              Not Configured
            </span>
          )}
        </div>

        {/* Not configured state */}
        {status && !status.configured && (
          <div className="bg-red-50 rounded-lg p-3 mb-3">
            <p className="text-sm text-red-700">
              Set <code className="bg-red-100 px-1 rounded text-xs">ETSY_API_KEY</code> and{" "}
              <code className="bg-red-100 px-1 rounded text-xs">ETSY_SHARED_SECRET</code> in
              Vercel environment variables.
            </p>
          </div>
        )}

        {/* Configured but not connected */}
        {status?.configured && !status.connected && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Your Etsy API keys are configured. Connect your shop to start publishing listings.
            </p>
            <a
              href="/api/auth/etsy?siteId=yalla-london"
              className="block w-full text-center px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium transition-colors"
            >
              Connect Etsy Shop
            </a>
          </div>
        )}

        {/* Connected */}
        {status?.connected && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Shop Name</p>
                <p className="text-sm font-medium text-gray-900">
                  {status.shopName ?? "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Shop ID</p>
                <p className="text-sm font-mono text-gray-900">
                  {status.shopId ?? "—"}
                </p>
              </div>
            </div>

            {status.shopUrl && (
              <a
                href={status.shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                View shop on Etsy →
              </a>
            )}

            {status.lastTestedAt && (
              <p className="text-xs text-gray-400">
                Last tested: {formatDate(status.lastTestedAt)}
              </p>
            )}

            {/* Stats */}
            {status.stats && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-gray-900">
                    {status.stats.totalDrafts}
                  </p>
                  <p className="text-xs text-gray-500">Drafts</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-green-600">
                    {status.stats.publishedOnEtsy}
                  </p>
                  <p className="text-xs text-gray-500">Published</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-blue-600">
                    {status.stats.pendingPublish}
                  </p>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={onTestConnection}
                disabled={actionLoading === "etsy-test"}
                className="flex-1 px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading === "etsy-test" ? "Testing..." : "Test Connection"}
              </button>
              <button
                onClick={onDisconnect}
                disabled={actionLoading === "etsy-disconnect"}
                className="px-3 py-2 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
              >
                {actionLoading === "etsy-disconnect" ? "..." : "Disconnect"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Create — One-tap product creation */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          Quick Create
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Type a product idea and AI creates an Etsy-ready listing in one tap.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={quickCreateIdea}
            onChange={(e) => onQuickCreateIdeaChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && quickCreateIdea.trim().length >= 5) {
                onQuickCreate();
              }
            }}
            placeholder="e.g. London 3-day luxury itinerary"
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            disabled={actionLoading === "quick-create"}
          />
          <button
            onClick={onQuickCreate}
            disabled={actionLoading === "quick-create" || quickCreateIdea.trim().length < 5}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 whitespace-nowrap"
          >
            {actionLoading === "quick-create" ? (
              <span className="flex items-center gap-1">
                <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full inline-block" />
                Creating...
              </span>
            ) : (
              "Create"
            )}
          </button>
        </div>

        {/* Quick Create Result */}
        {quickCreateResult && quickCreateResult.success && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-green-600 text-sm font-medium">Listing Created</span>
              {quickCreateResult.complianceValid ? (
                <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">
                  Compliant
                </span>
              ) : (
                <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                  Needs Review
                </span>
              )}
            </div>
            <p className="text-sm text-gray-900 font-medium">{quickCreateResult.title}</p>
            <p className="text-xs text-gray-500 mt-1">
              Price: ${((quickCreateResult.price ?? 0) / 100).toFixed(2)}
            </p>
            {quickCreateResult.tags && quickCreateResult.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {quickCreateResult.tags.slice(0, 6).map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded"
                  >
                    {tag}
                  </span>
                ))}
                {quickCreateResult.tags.length > 6 && (
                  <span className="text-xs text-gray-400">
                    +{quickCreateResult.tags.length - 6} more
                  </span>
                )}
              </div>
            )}
            {quickCreateResult.complianceIssues && quickCreateResult.complianceIssues.length > 0 && (
              <div className="mt-2 space-y-1">
                {quickCreateResult.complianceIssues.map((issue, i) => (
                  <p key={i} className="text-xs text-amber-700">
                    {issue.field}: {issue.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {quickCreateResult && !quickCreateResult.success && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">
              Failed: {quickCreateResult.error}
            </p>
          </div>
        )}

        <div className="mt-3 text-xs text-gray-400">
          Examples: &quot;London afternoon tea guide PDF&quot;, &quot;Luxury hotel checklist printable&quot;,
          &quot;Arabic calligraphy wall art set&quot;
        </div>
      </div>

      {/* Listing Drafts */}
      {status?.connected && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Listing Drafts
          </h3>

          {drafts.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">
                No listing drafts yet. Use Quick Create above or approve a product brief.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="border rounded-lg p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {draft.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${statusColor(draft.status)}`}
                        >
                          {draft.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatCents(draft.price)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {draft.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {draft.tags.slice(0, 5).map((tag, i) => (
                        <span
                          key={i}
                          className="text-xs px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {draft.tags.length > 5 && (
                        <span className="text-xs text-gray-400">
                          +{draft.tags.length - 5} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Error message */}
                  {draft.errorMessage && (
                    <p className="text-xs text-red-600 mt-2 bg-red-50 rounded p-2">
                      {draft.errorMessage}
                    </p>
                  )}

                  {/* Published link */}
                  {draft.etsyUrl && (
                    <a
                      href={draft.etsyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                    >
                      View on Etsy →
                    </a>
                  )}

                  {/* Publish button — only for approved unpublished drafts */}
                  {!draft.etsyListingId &&
                    (draft.status === "draft" || draft.status === "approved") && (
                      <button
                        onClick={() => onPublish(draft.id)}
                        disabled={actionLoading === `publish-${draft.id}`}
                        className="w-full mt-3 px-3 py-2 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
                      >
                        {actionLoading === `publish-${draft.id}`
                          ? "Publishing to Etsy..."
                          : "Publish to Etsy"}
                      </button>
                    )}

                  {/* Meta */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>{formatDate(draft.createdAt)}</span>
                    {draft.etsyState && <span>Etsy: {draft.etsyState}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Help / Setup Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          Two Ways to Create Products
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-blue-900 font-medium mb-1">Quick Create (fastest)</p>
            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
              <li>Type a product idea in the <strong>Quick Create</strong> box above</li>
              <li>AI generates a full Etsy listing (title, 13 tags, description, price)</li>
              <li>Review the draft, then tap <strong>Publish to Etsy</strong></li>
            </ol>
          </div>
          <div>
            <p className="text-xs text-blue-900 font-medium mb-1">Full Pipeline</p>
            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
              <li>Run a <strong>Trend Scan</strong> (Trends tab) to discover opportunities</li>
              <li><strong>Approve</strong> a product brief from the Briefs tab</li>
              <li>AI generates an <strong>Etsy-optimized listing</strong></li>
              <li>Review and <strong>Publish to Etsy</strong></li>
            </ol>
          </div>
        </div>
      </div>
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
