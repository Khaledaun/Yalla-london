"use client";

/**
 * CJ Affiliate Dashboard — Overview page
 * Shows KPIs, recent activity, alerts, and quick actions.
 */

import { useState, useEffect, useCallback } from "react";

interface DashboardData {
  metrics?: {
    totalClicks: number;
    totalCommissions: number;
    totalRevenue: number;
    averageCtr: number;
    activeLinks: number;
    activeOffers: number;
    joinedAdvertisers: number;
    pendingAdvertisers: number;
  };
  syncHealth?: {
    lastSyncs: Record<string, { lastSync: string | null; status: string }>;
    last24h: { syncs: number; errors: number };
  };
  alerts?: Array<{
    type: string;
    severity: string;
    message: string;
    count?: number;
  }>;
}

export default function AffiliateDashboardPage() {
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [metricsRes, alertsRes] = await Promise.all([
        fetch("/api/affiliate/analytics"),
        fetch("/api/affiliate/analytics/alerts"),
      ]);
      const metrics = metricsRes.ok ? await metricsRes.json() : {};
      const alerts = alertsRes.ok ? await alertsRes.json() : {};
      setData({ ...metrics, alerts: alerts.alerts });
    } catch {
      console.warn("[affiliate-dashboard] Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runAction = async (label: string, url: string) => {
    setActionLoading(label);
    try {
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      await fetchData();
    } catch {
      console.warn(`[affiliate-dashboard] ${label} failed`);
    } finally {
      setActionLoading(null);
    }
  };

  const m = data.metrics;
  const sh = data.syncHealth;

  const kpis = [
    { label: "Clicks (30d)", value: m?.totalClicks ?? 0, color: "#4A7BA8" },
    { label: "Revenue", value: m?.totalRevenue ? `£${m.totalRevenue.toFixed(2)}` : "£0.00", color: "#22c55e" },
    { label: "Avg CTR", value: m?.averageCtr ? `${(m.averageCtr * 100).toFixed(1)}%` : "0%", color: "#C49A2A" },
    { label: "Active Links", value: m?.activeLinks ?? 0, color: "#6366f1" },
    { label: "Active Offers", value: m?.activeOffers ?? 0, color: "#f59e0b" },
    { label: "Joined", value: m?.joinedAdvertisers ?? 0, color: "#22c55e" },
    { label: "Pending", value: m?.pendingAdvertisers ?? 0, color: "#C8322B" },
    { label: "Commissions", value: m?.totalCommissions ?? 0, color: "#8b5cf6" },
  ];

  const quickActions = [
    { label: "Sync Advertisers", url: "/api/affiliate/advertisers/sync" },
    { label: "Check Pending", url: "/api/affiliate/advertisers/check-pending" },
    { label: "Refresh Links", url: "/api/affiliate/links/bulk-sync" },
    { label: "Discover Deals", url: "/api/affiliate/offers/discover" },
    { label: "Sync Commissions", url: "/api/affiliate/commissions/sync" },
  ];

  const navLinks = [
    { label: "Networks", href: "/admin/affiliate/networks" },
    { label: "Advertisers", href: "/admin/affiliate/advertisers" },
    { label: "Links", href: "/admin/affiliate/links" },
    { label: "Offers", href: "/admin/affiliate/offers" },
    { label: "Hot Deals", href: "/admin/affiliate/deals" },
    { label: "Placements", href: "/admin/affiliate/placements" },
    { label: "Commissions", href: "/admin/affiliate/commissions" },
    { label: "Analytics", href: "/admin/affiliate/analytics" },
    { label: "Settings", href: "/admin/affiliate/settings" },
  ];

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        CJ Affiliate Dashboard
      </h1>
      <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "1.5rem" }}>
        Publisher CID: 7895467 · Zenitha.luxury LLC
      </p>

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {navLinks.map((n) => (
          <a
            key={n.href}
            href={n.href}
            style={{
              padding: "0.3rem 0.8rem",
              borderRadius: "20px",
              background: "#f3f4f6",
              color: "#1a1a2e",
              textDecoration: "none",
              fontSize: "0.8rem",
              fontWeight: 500,
            }}
          >
            {n.label}
          </a>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "#666" }}>Loading dashboard...</p>
      ) : (
        <>
          {/* KPI Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                style={{
                  padding: "1rem",
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                <div style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.25rem" }}>{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Alerts */}
          {data.alerts && data.alerts.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Alerts</h3>
              {data.alerts.slice(0, 5).map((alert, i) => (
                <div
                  key={i}
                  style={{
                    padding: "0.6rem 1rem",
                    background: alert.severity === "high" ? "#fef2f2" : alert.severity === "medium" ? "#fffbeb" : "#f0fdf4",
                    border: `1px solid ${alert.severity === "high" ? "#fecaca" : alert.severity === "medium" ? "#fde68a" : "#bbf7d0"}`,
                    borderRadius: "8px",
                    marginBottom: "0.5rem",
                    fontSize: "0.8rem",
                  }}
                >
                  <strong>{alert.type}:</strong> {alert.message}
                  {alert.count != null && <span style={{ marginLeft: "0.5rem", color: "#666" }}>({alert.count})</span>}
                </div>
              ))}
            </div>
          )}

          {/* Sync Health */}
          {sh && (
            <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#f8f9fa", borderRadius: "10px" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Sync Health</h3>
              <p style={{ fontSize: "0.8rem", color: "#666" }}>
                Last 24h: {sh.last24h.syncs} syncs, {sh.last24h.errors} errors
              </p>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                {Object.entries(sh.lastSyncs).map(([type, info]) => {
                  const syncInfo = info as { status: string; lastSync: string | null };
                  return (
                    <div key={type} style={{ fontSize: "0.75rem" }}>
                      <strong>{type}:</strong>{" "}
                      <span style={{ color: syncInfo.status === "SUCCESS" ? "#22c55e" : syncInfo.status === "FAILED" ? "#C8322B" : "#666" }}>
                        {syncInfo.lastSync ? new Date(syncInfo.lastSync).toLocaleString() : "Never"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Quick Actions</h3>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => runAction(action.label, action.url)}
                  disabled={actionLoading !== null}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    background: actionLoading === action.label ? "#e5e7eb" : "#fff",
                    cursor: actionLoading !== null ? "wait" : "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                  }}
                >
                  {actionLoading === action.label ? "Running..." : action.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
