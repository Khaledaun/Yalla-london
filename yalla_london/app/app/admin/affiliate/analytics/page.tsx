"use client";

import { useState, useEffect } from "react";

interface AnalyticsData {
  metrics?: {
    totalClicks: number;
    totalCommissions: number;
    totalRevenue: number;
    averageCtr: number;
    topLinks: Array<{ id: string; name: string; clicks: number; advertiserName: string }>;
    revenueByAdvertiser: Array<{ advertiserName: string; revenue: number; commissions: number }>;
  };
  contentPerformance?: Array<{
    articleId: string;
    articleTitle: string;
    clicks: number;
    impressions: number;
    ctr: number;
  }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/affiliate/analytics")
      .then((r) => r.ok ? r.json() : {})
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const m = data.metrics;

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Affiliate Analytics</h1>
        <a href="/admin/affiliate" style={{ fontSize: "0.8rem", color: "#4A7BA8" }}>← Dashboard</a>
      </div>

      {loading ? (
        <p style={{ color: "#666" }}>Loading analytics...</p>
      ) : !m ? (
        <p style={{ color: "#666" }}>No analytics data yet. Affiliate links need clicks to generate data.</p>
      ) : (
        <>
          {/* Summary KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "2rem" }}>
            {[
              { label: "Total Clicks", value: m.totalClicks, color: "#4A7BA8" },
              { label: "Commissions", value: m.totalCommissions, color: "#6366f1" },
              { label: "Revenue", value: `£${m.totalRevenue.toFixed(2)}`, color: "#22c55e" },
              { label: "Avg CTR", value: `${(m.averageCtr * 100).toFixed(1)}%`, color: "#C49A2A" },
            ].map((kpi) => (
              <div key={kpi.label} style={{ padding: "1rem", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                <div style={{ fontSize: "0.75rem", color: "#666" }}>{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Top Links */}
          {m.topLinks && m.topLinks.length > 0 && (
            <div style={{ marginBottom: "2rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Top Performing Links</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {m.topLinks.map((link, i) => (
                  <div key={link.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.75rem", background: "#fff", borderRadius: "8px", border: "1px solid #f3f4f6" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#C49A2A", minWidth: "20px" }}>#{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{link.name}</div>
                      <div style={{ fontSize: "0.7rem", color: "#666" }}>{link.advertiserName}</div>
                    </div>
                    <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>{link.clicks} clicks</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revenue by Advertiser */}
          {m.revenueByAdvertiser && m.revenueByAdvertiser.length > 0 && (
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Revenue by Advertiser</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                      <th style={{ padding: "0.5rem" }}>Advertiser</th>
                      <th style={{ padding: "0.5rem" }}>Revenue</th>
                      <th style={{ padding: "0.5rem" }}>Commissions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.revenueByAdvertiser.map((row) => (
                      <tr key={row.advertiserName} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.5rem", fontWeight: 600 }}>{row.advertiserName}</td>
                        <td style={{ padding: "0.5rem", color: "#22c55e", fontWeight: 700 }}>£{row.revenue.toFixed(2)}</td>
                        <td style={{ padding: "0.5rem" }}>{row.commissions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
