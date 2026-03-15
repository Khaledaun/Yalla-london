"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AffiliateHQData {
  success: boolean;
  siteId: string;
  revenue: {
    total30d: number;
    total7d: number;
    count30d: number;
    trendPercent: number;
    clicks7d: number;
    topAdvertisers: Array<{ name: string; commission: number }>;
    topArticlesByClicks: Array<{ url: string; clicks: number }>;
  };
  partners: {
    networks: Array<{
      id: string;
      name: string;
      status: string;
      apiHealth: string;
      advertisers: number;
      websiteId: string | null;
    }>;
    advertisers: Array<{
      id: string;
      externalId: string;
      name: string;
      status: string;
      category: string | null;
      sevenDayEpc: number;
      threeMonthEpc: number;
      cookieDuration: number | null;
      priority: string;
      lastSynced: string | null;
    }>;
  };
  coverage: {
    totalArticles: number;
    withAffiliates: number;
    withoutAffiliates: number;
    coveragePercent: number;
    uncoveredArticles: Array<{
      id: string;
      title: string;
      slug: string;
      createdAt: string;
    }>;
  };
  links: {
    total: number;
    active: number;
    inactive: number;
    byType: Record<string, number>;
    recentDeals: Array<{
      id: string;
      title: string;
      advertiser: string;
      price: number | null;
      previousPrice: number | null;
      isPriceDrop: boolean;
      isNewArrival: boolean;
      category: string;
      validTo: string | null;
    }>;
  };
  systemHealth: {
    circuitBreaker: { failures: number; isOpen: boolean; openedAt: number };
    syncHistory: Array<{
      id: string;
      type: string;
      status: string;
      processed: number;
      created: number;
      updated: number;
      errors: string[] | null;
      durationMs: number;
      time: string;
    }>;
    featureFlags: Array<{ name: string; enabled: boolean }>;
    credentials: {
      apiTokenConfigured: boolean;
      websiteIdConfigured: boolean;
    };
  };
  durationMs: number;
}

// ─── Page Component ─────────────────────────────────────────────────────────

const TABS = ["Revenue", "Partners", "Coverage", "Links", "Actions", "System"] as const;
type Tab = (typeof TABS)[number];

export default function AffiliateHQPage() {
  const [data, setData] = useState<AffiliateHQData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Revenue");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [advFilter, setAdvFilter] = useState<"ALL" | "JOINED" | "PENDING">("ALL");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/affiliate-hq");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        setError(null);
      } else {
        setError(json.error || "Failed to load");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load affiliate data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const runAction = async (action: string, extra?: Record<string, unknown>) => {
    setActionLoading(action);
    setActionResult(null);
    try {
      const res = await fetch("/api/admin/affiliate-hq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();

      // Build detailed result message for visibility
      if (json.success && json.result) {
        const r = json.result;
        const lines: string[] = [`${action} completed`];

        // Sync advertisers details
        if (r.checked !== undefined) lines.push(`Checked: ${r.checked}`);
        if (r.newlyApproved?.length) lines.push(`Newly approved: ${r.newlyApproved.join(", ")}`);
        if (r.linksSynced !== undefined) lines.push(`Links synced: ${r.linksSynced}`);

        // Generic sync result details
        if (r.result?.processed !== undefined) {
          lines.push(`Processed: ${r.result.processed}, Created: ${r.result.created}, Updated: ${r.result.updated}`);
          if (r.result.errors?.length) lines.push(`Errors: ${r.result.errors.slice(0, 3).join(" | ")}`);
        }

        // Duration
        if (r.durationMs) lines.push(`Duration: ${(r.durationMs / 1000).toFixed(1)}s`);

        // If skipped
        if (r.skipped) lines.push(`⚠ Skipped: ${r.message || "not configured"}`);

        // If error in result
        if (r.error) lines.push(`❌ Error: ${r.error}`);

        // Simple message result (reset_circuit_breaker, etc.)
        if (r.message && !r.skipped) lines.push(r.message);

        // Diagnostic info (env vars, circuit breaker)
        if (r.diagnostic) {
          const d = r.diagnostic;
          lines.push(`--- Diagnostic ---`);
          lines.push(`API Token: ${d.apiTokenSet ? "✓ Set" : "✗ NOT SET"}`);
          lines.push(`Publisher CID: ${d.publisherCid || "NOT SET"}`);
          lines.push(`Website ID: ${d.websiteId || "NOT SET"}`);
          if (d.circuitBreaker?.isOpen) lines.push(`⚠ Circuit breaker: OPEN (${d.circuitBreaker.failures} failures)`);
        }

        setActionResult(lines.join("\n"));
      } else if (!json.success) {
        // Show the full error from the cron response
        const errMsg = json.result?.error || json.error || "Action failed";
        setActionResult(`${action} failed:\n${errMsg}`);
      } else {
        setActionResult(`${action} completed`);
      }
      if (json.success) setTimeout(fetchData, 2000);
    } catch (err) {
      setActionResult(`${action} failed — ${err instanceof Error ? err.message : "network error"}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Affiliate HQ</h1>
        <p style={{ color: "#666", marginTop: "1rem" }}>Loading affiliate data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#dc2626" }}>Affiliate HQ</h1>
        <p style={{ color: "#dc2626", marginTop: "1rem" }}>{error || "No data"}</p>
        <button onClick={fetchData} style={btnStyle("#3b82f6")}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Affiliate HQ</h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{ ...btnStyle(autoRefresh ? "#10b981" : "#6b7280"), padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}
          >
            {autoRefresh ? "Auto" : "Paused"}
          </button>
          <button onClick={fetchData} style={{ ...btnStyle("#3b82f6"), padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}>
            Refresh
          </button>
        </div>
      </div>

      {/* Action result toast — shows detailed sync results */}
      {actionResult && (
        <div
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "0.75rem",
            borderRadius: 8,
            background: actionResult.includes("failed") || actionResult.includes("Error") ? "#fef2f2" : "#f0fdf4",
            color: actionResult.includes("failed") || actionResult.includes("Error") ? "#dc2626" : "#16a34a",
            fontSize: "0.8rem",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            fontFamily: "monospace",
            position: "relative",
          }}
        >
          {actionResult}
          <button
            onClick={() => setActionResult(null)}
            style={{
              position: "absolute", top: 4, right: 8,
              cursor: "pointer", border: "none", background: "none",
              fontSize: "1rem", fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem", overflowX: "auto" }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: activeTab === tab ? 700 : 400,
              background: activeTab === tab ? "#1e3a5f" : "#f3f4f6",
              color: activeTab === tab ? "#fff" : "#374151",
              fontSize: "0.85rem",
              whiteSpace: "nowrap",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "Revenue" && <RevenueTab data={data} onAction={runAction} actionLoading={actionLoading} />}
      {activeTab === "Partners" && (
        <PartnersTab data={data} onAction={runAction} actionLoading={actionLoading} filter={advFilter} onFilterChange={setAdvFilter} />
      )}
      {activeTab === "Coverage" && <CoverageTab data={data} onAction={runAction} actionLoading={actionLoading} />}
      {activeTab === "Links" && <LinksTab data={data} onAction={runAction} actionLoading={actionLoading} />}
      {activeTab === "Actions" && <ActionsTab onAction={runAction} actionLoading={actionLoading} />}
      {activeTab === "System" && <SystemTab data={data} onAction={runAction} actionLoading={actionLoading} />}
    </div>
  );
}

// ─── Tab 1: Revenue ─────────────────────────────────────────────────────────

function RevenueTab({ data, onAction, actionLoading }: { data: AffiliateHQData; onAction: (a: string) => void; actionLoading: string | null }) {
  const { revenue } = data;
  const trendArrow = revenue.trendPercent > 0 ? "^" : revenue.trendPercent < 0 ? "v" : "-";
  const trendColor = revenue.trendPercent > 0 ? "#16a34a" : revenue.trendPercent < 0 ? "#dc2626" : "#6b7280";

  return (
    <div>
      {/* Hero Number */}
      <div style={{ textAlign: "center", padding: "1.5rem", background: "#f8fafc", borderRadius: 12, marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>30-Day Revenue</div>
        <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#1e3a5f" }}>
          ${revenue.total30d.toFixed(2)}
        </div>
        <div style={{ fontSize: "0.85rem", color: trendColor, fontWeight: 600 }}>
          {trendArrow} {Math.abs(revenue.trendPercent)}% vs previous 30d
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
        <KpiCard label="7-Day Revenue" value={`$${revenue.total7d.toFixed(2)}`} />
        <KpiCard label="Commissions (30d)" value={String(revenue.count30d)} />
        <KpiCard label="Clicks (7d)" value={String(revenue.clicks7d)} />
        <KpiCard label="Coverage" value={`${data.coverage.coveragePercent}%`} />
      </div>

      {/* Top Advertisers */}
      {revenue.topAdvertisers.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Top Earning Advertisers</h3>
          {revenue.topAdvertisers.map((a, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontSize: "0.85rem" }}>{a.name}</span>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#16a34a" }}>${a.commission.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Top Articles by Clicks */}
      {revenue.topArticlesByClicks.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Top Articles by Clicks</h3>
          {revenue.topArticlesByClicks.slice(0, 5).map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                {a.url.replace(/^https?:\/\/[^/]+/, "")}
              </span>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, whiteSpace: "nowrap" }}>{a.clicks}</span>
              <a
                href={a.url.startsWith("http") ? a.url : `/blog${a.url.startsWith("/") ? a.url : `/${a.url}`}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding: "3px 8px", background: "#1e3a5f", color: "#fff", borderRadius: 6, fontSize: "0.65rem", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
              >
                View
              </a>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => onAction("sync_commissions")} disabled={actionLoading === "sync_commissions"} style={btnStyle("#C49A2A")}>
        {actionLoading === "sync_commissions" ? "Syncing..." : "Sync Commissions Now"}
      </button>
    </div>
  );
}

// ─── Tab 2: Partners ────────────────────────────────────────────────────────

function PartnersTab({
  data,
  onAction,
  actionLoading,
  filter,
  onFilterChange,
}: {
  data: AffiliateHQData;
  onAction: (a: string) => void;
  actionLoading: string | null;
  filter: "ALL" | "JOINED" | "PENDING";
  onFilterChange: (f: "ALL" | "JOINED" | "PENDING") => void;
}) {
  const { partners } = data;
  const filtered = filter === "ALL" ? partners.advertisers : partners.advertisers.filter((a) => a.status === filter);

  return (
    <div>
      {/* Network Cards */}
      {partners.networks.map((n) => (
        <div key={n.id} style={{ padding: "1rem", background: "#f8fafc", borderRadius: 12, marginBottom: "1rem", border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1rem" }}>{n.name}</div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                {n.advertisers} advertisers | Website ID: {n.websiteId || "Not set"}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: n.apiHealth === "green" ? "#16a34a" : n.apiHealth === "red" ? "#dc2626" : "#9ca3af",
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: "0.75rem", textTransform: "capitalize" }}>{n.status}</span>
            </div>
          </div>
          <button onClick={() => onAction("test_connection")} disabled={!!actionLoading} style={{ ...btnStyle("#6b7280"), marginTop: "0.5rem", padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}>
            Test Connection
          </button>
        </div>
      ))}

      {/* Filter */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.75rem" }}>
        {(["ALL", "JOINED", "PENDING"] as const).map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            style={{
              padding: "0.25rem 0.75rem",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontWeight: filter === f ? 700 : 400,
              background: filter === f ? "#1e3a5f" : "#f3f4f6",
              color: filter === f ? "#fff" : "#374151",
              fontSize: "0.75rem",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Advertiser Table */}
      <div style={{ overflowX: "auto" }}>
        {filtered.map((a) => (
          <div
            key={a.id}
            style={{
              padding: "0.75rem",
              borderBottom: "1px solid #f3f4f6",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div style={{ minWidth: "60%" }}>
              <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{a.name}</div>
              <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                {a.category || "Uncategorized"} | EPC: ${a.threeMonthEpc?.toFixed(2) || "0.00"}
                {a.cookieDuration ? ` | ${a.cookieDuration}d cookie` : ""}
              </div>
            </div>
            <StatusBadge status={a.status} />
          </div>
        ))}
        {filtered.length === 0 && (
          <p style={{ color: "#6b7280", textAlign: "center", padding: "1rem", fontSize: "0.85rem" }}>No advertisers match this filter</p>
        )}
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button onClick={() => onAction("sync_advertisers")} disabled={actionLoading === "sync_advertisers"} style={btnStyle("#C49A2A")}>
          {actionLoading === "sync_advertisers" ? "Syncing..." : "Sync Advertisers Now"}
        </button>
      </div>
    </div>
  );
}

// ─── Tab 3: Coverage ────────────────────────────────────────────────────────

function CoverageTab({ data, onAction, actionLoading }: { data: AffiliateHQData; onAction: (a: string) => void; actionLoading: string | null }) {
  const { coverage } = data;
  const barWidth = Math.max(coverage.coveragePercent, 3);

  return (
    <div>
      {/* Coverage Meter */}
      <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: 12, marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem" }}>Article Coverage</div>
        <div style={{ background: "#e5e7eb", borderRadius: 8, height: 24, overflow: "hidden", marginBottom: "0.5rem" }}>
          <div
            style={{
              width: `${barWidth}%`,
              height: "100%",
              background: coverage.coveragePercent >= 80 ? "#16a34a" : coverage.coveragePercent >= 50 ? "#f59e0b" : "#dc2626",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: "0.75rem",
              fontWeight: 700,
            }}
          >
            {coverage.coveragePercent}%
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#6b7280" }}>
          <span>{coverage.withAffiliates} with affiliates</span>
          <span>{coverage.withoutAffiliates} without</span>
          <span>{coverage.totalArticles} total</span>
        </div>
      </div>

      {/* Uncovered Articles */}
      {coverage.uncoveredArticles.length > 0 && (
        <div>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Articles Without Affiliate Links</h3>
          {coverage.uncoveredArticles.map((a) => (
            <div key={a.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>{a.title}</div>
                <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>/{a.slug}</div>
              </div>
              <a
                href={`/blog/${a.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginLeft: "0.5rem", padding: "4px 10px", background: "#1e3a5f", color: "#fff", borderRadius: 6, fontSize: "0.7rem", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
              >
                View Page
              </a>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "1rem" }}>
        <button onClick={() => onAction("inject_links")} disabled={actionLoading === "inject_links"} style={btnStyle("#C49A2A")}>
          {actionLoading === "inject_links" ? "Injecting..." : "Run Affiliate Injection"}
        </button>
      </div>
    </div>
  );
}

// ─── Tab 4: Links & Offers ──────────────────────────────────────────────────

function LinksTab({ data, onAction, actionLoading }: { data: AffiliateHQData; onAction: (a: string) => void; actionLoading: string | null }) {
  const { links } = data;

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "0.5rem", marginBottom: "1rem" }}>
        <KpiCard label="Total Links" value={String(links.total)} />
        <KpiCard label="Active" value={String(links.active)} />
        <KpiCard label="Inactive" value={String(links.inactive)} />
      </div>

      {/* By Type */}
      {Object.keys(links.byType).length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Links by Type</h3>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {Object.entries(links.byType).map(([type, count]) => (
              <span key={type} style={{ padding: "0.25rem 0.75rem", background: "#f3f4f6", borderRadius: 12, fontSize: "0.75rem" }}>
                {type}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent Deals */}
      {links.recentDeals.length > 0 && (
        <div>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Recent Deals & Offers</h3>
          {links.recentDeals.slice(0, 10).map((d) => (
            <div key={d.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ maxWidth: "70%" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>{d.title}</div>
                  <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                    {d.advertiser} | {d.category}
                    {d.isPriceDrop && <span style={{ color: "#16a34a", fontWeight: 700, marginLeft: 4 }}> PRICE DROP</span>}
                    {d.isNewArrival && <span style={{ color: "#3b82f6", fontWeight: 700, marginLeft: 4 }}> NEW</span>}
                  </div>
                </div>
                {d.price && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>${d.price.toFixed(2)}</div>
                    {d.previousPrice && d.isPriceDrop && (
                      <div style={{ fontSize: "0.7rem", color: "#dc2626", textDecoration: "line-through" }}>${d.previousPrice.toFixed(2)}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
        <button onClick={() => onAction("refresh_deals")} disabled={actionLoading === "refresh_deals"} style={btnStyle("#C49A2A")}>
          {actionLoading === "refresh_deals" ? "Discovering..." : "Discover Deals"}
        </button>
        <button onClick={() => onAction("refresh_links")} disabled={actionLoading === "refresh_links"} style={btnStyle("#6b7280")}>
          {actionLoading === "refresh_links" ? "Refreshing..." : "Refresh Links"}
        </button>
      </div>
    </div>
  );
}

// ─── Tab 5: Actions ──────────────────────────────────────────────────────────

function ActionsTab({ onAction, actionLoading }: { onAction: (a: string, extra?: Record<string, unknown>) => void; actionLoading: string | null }) {
  const [diagResult, setDiagResult] = useState<{
    status: string;
    issueCount: number;
    issues: Array<{ severity: string; issue: string; fix: string }>;
    joinedAdvertisers: number;
    coveragePercent: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ name: string; price: number; salePrice: number; advertiser: string }> | null>(null);
  const [fullSyncResult, setFullSyncResult] = useState<Record<string, unknown> | null>(null);

  const runDiagnose = async () => {
    onAction("diagnose");
    try {
      const res = await fetch("/api/admin/affiliate-hq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "diagnose" }),
      });
      const json = await res.json();
      if (json.success && json.result) setDiagResult(json.result);
    } catch { /* handled by parent */ }
  };

  const runSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch("/api/admin/affiliate-hq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search_products", keywords: searchQuery }),
      });
      const json = await res.json();
      if (json.success && json.result) setSearchResults(json.result.products || []);
    } catch { setSearchResults([]); }
  };

  const runFullSync = async () => {
    setFullSyncResult(null);
    onAction("full_sync");
    try {
      const res = await fetch("/api/admin/affiliate-hq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "full_sync" }),
      });
      const json = await res.json();
      if (json.success && json.result) setFullSyncResult(json.result);
    } catch { /* handled by parent */ }
  };

  const sevColor = (s: string) =>
    s === "critical" ? "#dc2626" : s === "high" ? "#f59e0b" : s === "medium" ? "#3b82f6" : "#6b7280";

  return (
    <div>
      {/* Quick Actions Grid */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.75rem" }}>Quick Actions</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          <ActionCard
            label="Diagnose Issues"
            desc="Check for problems and get fix suggestions"
            color="#7c3aed"
            loading={actionLoading === "diagnose"}
            onClick={runDiagnose}
          />
          <ActionCard
            label="Full Sync"
            desc="Run all 4 CJ syncs in sequence"
            color="#1e3a5f"
            loading={actionLoading === "full_sync"}
            onClick={runFullSync}
          />
          <ActionCard
            label="Inject Links"
            desc="Add affiliate links to uncovered articles"
            color="#16a34a"
            loading={actionLoading === "inject_links"}
            onClick={() => onAction("inject_links")}
          />
          <ActionCard
            label="Sync Commissions"
            desc="Pull latest revenue data from CJ"
            color="#C49A2A"
            loading={actionLoading === "sync_commissions"}
            onClick={() => onAction("sync_commissions")}
          />
          <ActionCard
            label="Sync Advertisers"
            desc="Check for newly approved partners"
            color="#3b82f6"
            loading={actionLoading === "sync_advertisers"}
            onClick={() => onAction("sync_advertisers")}
          />
          <ActionCard
            label="Discover Deals"
            desc="Search CJ catalog for new offers"
            color="#f59e0b"
            loading={actionLoading === "refresh_deals"}
            onClick={() => onAction("refresh_deals")}
          />
          <ActionCard
            label="Refresh Links"
            desc="Update tracking links from CJ"
            color="#6b7280"
            loading={actionLoading === "refresh_links"}
            onClick={() => onAction("refresh_links")}
          />
          <ActionCard
            label="Test Connection"
            desc="Verify CJ API credentials work"
            color="#0ea5e9"
            loading={actionLoading === "test_connection"}
            onClick={() => onAction("test_connection")}
          />
          <ActionCard
            label="Reset Circuit Breaker"
            desc="Clear API failure lockout to retry"
            color="#dc2626"
            loading={actionLoading === "reset_circuit_breaker"}
            onClick={() => onAction("reset_circuit_breaker")}
          />
        </div>
      </div>

      {/* Diagnose Results */}
      {diagResult && (
        <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#f8fafc", borderRadius: 12, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, margin: 0 }}>
              Diagnosis: <span style={{ color: diagResult.status === "healthy" ? "#16a34a" : diagResult.status === "critical" ? "#dc2626" : "#f59e0b" }}>
                {diagResult.status.toUpperCase()}
              </span>
            </h3>
            <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
              {diagResult.joinedAdvertisers} partners | {diagResult.coveragePercent}% coverage
            </span>
          </div>
          {diagResult.issues.length === 0 ? (
            <p style={{ color: "#16a34a", fontSize: "0.85rem", margin: 0 }}>All systems healthy — no issues found</p>
          ) : (
            diagResult.issues.map((issue, i) => (
              <div key={i} style={{ padding: "0.5rem 0", borderBottom: i < diagResult.issues.length - 1 ? "1px solid #e5e7eb" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: sevColor(issue.severity), flexShrink: 0 }} />
                  <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{issue.issue}</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#16a34a", marginLeft: "1rem", marginTop: "0.25rem" }}>
                  Fix: {issue.fix}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Full Sync Results */}
      {fullSyncResult && (
        <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#f0fdf4", borderRadius: 12, border: "1px solid #bbf7d0" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Full Sync Results</h3>
          {Object.entries(fullSyncResult).map(([step, result]) => {
            const r = result as Record<string, unknown>;
            const ok = r && !r.error;
            return (
              <div key={step} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", fontSize: "0.8rem", borderBottom: "1px solid #dcfce7" }}>
                <span style={{ textTransform: "capitalize" }}>{step}</span>
                <span style={{ color: ok ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                  {ok ? (r.success ? "Done" : "OK") : String(r.error || "Failed")}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Search */}
      <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: 12, border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Search CJ Products</h3>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g. hotel london, halal restaurant..."
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            style={{ flex: 1, padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: 8, fontSize: "0.85rem" }}
          />
          <button onClick={runSearch} style={btnStyle("#7c3aed")}>Search</button>
        </div>
        {searchResults && (
          searchResults.length === 0 ? (
            <p style={{ fontSize: "0.8rem", color: "#6b7280" }}>No products found. Try different keywords.</p>
          ) : (
            <div>
              {searchResults.slice(0, 10).map((p, i) => (
                <div key={i} style={{ padding: "0.5rem 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>{p.name}</div>
                  <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                    {p.advertiser} | ${p.salePrice || p.price}
                    {p.salePrice > 0 && p.salePrice < p.price && (
                      <span style={{ color: "#16a34a", fontWeight: 600 }}> (SALE from ${p.price})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function ActionCard({ label, desc, color, loading, onClick }: {
  label: string; desc: string; color: string; loading: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: "0.75rem",
        background: loading ? "#f3f4f6" : "#fff",
        border: `2px solid ${loading ? "#d1d5db" : color}`,
        borderRadius: 10,
        cursor: loading ? "not-allowed" : "pointer",
        textAlign: "left",
        transition: "all 0.15s",
      }}
    >
      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: loading ? "#9ca3af" : color }}>
        {loading ? "Running..." : label}
      </div>
      <div style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: "0.15rem" }}>{desc}</div>
    </button>
  );
}

// ─── Tab 6: System Health ───────────────────────────────────────────────────

function SystemTab({ data, onAction, actionLoading }: { data: AffiliateHQData; onAction: (a: string, extra?: Record<string, unknown>) => void; actionLoading: string | null }) {
  const { systemHealth } = data;
  const { circuitBreaker, credentials, syncHistory, featureFlags } = systemHealth;

  return (
    <div>
      {/* Credentials */}
      <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: 12, marginBottom: "1rem", border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>API Credentials</h3>
        <div style={{ display: "flex", gap: "1rem" }}>
          <HealthDot ok={credentials.apiTokenConfigured} label="API Token" />
          <HealthDot ok={credentials.websiteIdConfigured} label="Website ID" />
          <HealthDot ok={!circuitBreaker.isOpen} label="Circuit Breaker" />
        </div>
        {circuitBreaker.isOpen && (
          <div style={{ marginTop: "0.5rem", padding: "0.5rem", background: "#fef2f2", borderRadius: 6, fontSize: "0.75rem", color: "#dc2626" }}>
            Circuit breaker OPEN — {circuitBreaker.failures} consecutive failures. Will auto-reset after cooldown.
          </div>
        )}
      </div>

      {/* Feature Flags */}
      {featureFlags.length > 0 && (
        <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: 12, marginBottom: "1rem", border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Feature Flags</h3>
          {featureFlags.map((f) => (
            <div key={f.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontSize: "0.8rem" }}>{f.name.replace("FEATURE_AFFILIATE_", "")}</span>
              <button
                onClick={() => onAction("toggle_flag", { flagName: f.name, enabled: !f.enabled })}
                disabled={!!actionLoading}
                style={{
                  padding: "0.15rem 0.5rem",
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  background: f.enabled ? "#dcfce7" : "#fee2e2",
                  color: f.enabled ? "#16a34a" : "#dc2626",
                }}
              >
                {f.enabled ? "ON" : "OFF"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Sync History */}
      <div style={{ marginBottom: "1rem" }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Recent Sync Operations</h3>
        {syncHistory.slice(0, 15).map((s) => (
          <div key={s.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.8rem" }}>
                <StatusDot status={s.status} /> {s.type}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                {new Date(s.time).toLocaleString()} | {s.processed} processed, {s.created} created
                {s.durationMs ? ` | ${(s.durationMs / 1000).toFixed(1)}s` : ""}
              </div>
            </div>
            {s.errors && Array.isArray(s.errors) && s.errors.length > 0 && (
              <span style={{ fontSize: "0.7rem", color: "#dc2626" }}>{s.errors.length} err</span>
            )}
          </div>
        ))}
        {syncHistory.length === 0 && (
          <p style={{ color: "#6b7280", fontSize: "0.85rem" }}>No sync operations recorded yet</p>
        )}
      </div>

      {/* Cron Buttons */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button onClick={() => onAction("sync_advertisers")} disabled={!!actionLoading} style={btnStyle("#3b82f6")}>
          {actionLoading === "sync_advertisers" ? "..." : "Sync Advertisers"}
        </button>
        <button onClick={() => onAction("sync_commissions")} disabled={!!actionLoading} style={btnStyle("#3b82f6")}>
          {actionLoading === "sync_commissions" ? "..." : "Sync Commissions"}
        </button>
        <button onClick={() => onAction("refresh_deals")} disabled={!!actionLoading} style={btnStyle("#3b82f6")}>
          {actionLoading === "refresh_deals" ? "..." : "Discover Deals"}
        </button>
        <button onClick={() => onAction("refresh_links")} disabled={!!actionLoading} style={btnStyle("#3b82f6")}>
          {actionLoading === "refresh_links" ? "..." : "Refresh Links"}
        </button>
        <button onClick={() => onAction("reset_circuit_breaker")} disabled={!!actionLoading} style={btnStyle("#dc2626")}>
          {actionLoading === "reset_circuit_breaker" ? "..." : "Reset Circuit Breaker"}
        </button>
      </div>
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────────────────────────

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "0.75rem", background: "#f8fafc", borderRadius: 10, border: "1px solid #e5e7eb", textAlign: "center" }}>
      <div style={{ fontSize: "0.65rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e3a5f", marginTop: "0.25rem" }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    JOINED: { bg: "#dcfce7", text: "#16a34a" },
    PENDING: { bg: "#fef3c7", text: "#d97706" },
    DECLINED: { bg: "#fee2e2", text: "#dc2626" },
    NOT_JOINED: { bg: "#f3f4f6", text: "#6b7280" },
  };
  const c = colors[status] || colors.NOT_JOINED;
  return (
    <span style={{ padding: "0.15rem 0.5rem", borderRadius: 12, fontSize: "0.7rem", fontWeight: 700, background: c.bg, color: c.text }}>
      {status}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "SUCCESS" ? "#16a34a" : status === "PARTIAL" ? "#f59e0b" : status === "FAILED" ? "#dc2626" : "#6b7280";
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, marginRight: 4 }} />;
}

function HealthDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{ fontSize: "0.8rem" }}>
      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: ok ? "#16a34a" : "#dc2626", marginRight: 4 }} />
      {label}
    </span>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: "0.5rem 1rem",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.85rem",
    background: bg,
    color: "#fff",
  };
}
