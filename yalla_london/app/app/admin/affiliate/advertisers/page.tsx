"use client";

import { useState, useEffect, useCallback } from "react";

interface Advertiser {
  id: string;
  externalId: string;
  name: string;
  status: string;
  category: string;
  priority: string;
  threeMonthEpc: number | null;
  sevenDayEpc: number | null;
  _count?: { links: number; offers: number };
}

export default function AdvertisersPage() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    try {
      const res = await fetch(`/api/affiliate/advertisers?${params}`);
      if (res.ok) {
        const d = await res.json();
        setAdvertisers(d.advertisers || []);
      }
    } catch {}
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const syncAll = async () => {
    setSyncing(true);
    try {
      await fetch("/api/affiliate/advertisers/sync", { method: "POST" });
      await fetchData();
    } catch {}
    setSyncing(false);
  };

  const checkPending = async () => {
    setSyncing(true);
    try {
      await fetch("/api/affiliate/advertisers/check-pending", { method: "POST" });
      await fetchData();
    } catch {}
    setSyncing(false);
  };

  const statusColors: Record<string, string> = {
    JOINED: "#22c55e",
    PENDING: "#f59e0b",
    DECLINED: "#ef4444",
    NOT_APPLIED: "#6b7280",
  };

  const priorityColors: Record<string, string> = {
    CRITICAL: "#ef4444",
    HIGH: "#f59e0b",
    MEDIUM: "#3b82f6",
    LOW: "#6b7280",
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700 }}>CJ Advertisers</h1>
        <a href="/admin/affiliate" style={{ fontSize: "0.8rem", color: "#4A7BA8" }}>← Dashboard</a>
      </div>

      {/* Actions Bar */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        {["all", "JOINED", "PENDING", "DECLINED", "NOT_APPLIED"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setLoading(true); }}
            style={{
              padding: "0.3rem 0.7rem",
              borderRadius: "20px",
              border: "none",
              background: statusFilter === s ? "#1a1a2e" : "#f3f4f6",
              color: statusFilter === s ? "#fff" : "#666",
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            {s === "all" ? "All" : s.replace("_", " ")}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={syncAll}
          disabled={syncing}
          style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", border: "1px solid #e5e7eb", background: "#fff", fontSize: "0.8rem", cursor: "pointer" }}
        >
          {syncing ? "Syncing..." : "Sync All"}
        </button>
        <button
          onClick={checkPending}
          disabled={syncing}
          style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", border: "1px solid #C49A2A", background: "#fff8e1", fontSize: "0.8rem", cursor: "pointer", color: "#92700C" }}
        >
          Check Pending
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#666" }}>Loading advertisers...</p>
      ) : advertisers.length === 0 ? (
        <p style={{ color: "#666" }}>No advertisers found. Click &ldquo;Sync All&rdquo; to fetch from CJ.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "0.5rem" }}>Name</th>
                <th style={{ padding: "0.5rem" }}>Status</th>
                <th style={{ padding: "0.5rem" }}>Priority</th>
                <th style={{ padding: "0.5rem" }}>Category</th>
                <th style={{ padding: "0.5rem" }}>3M EPC</th>
                <th style={{ padding: "0.5rem" }}>7D EPC</th>
                <th style={{ padding: "0.5rem" }}>Links</th>
                <th style={{ padding: "0.5rem" }}>Offers</th>
              </tr>
            </thead>
            <tbody>
              {advertisers.map((adv) => (
                <tr key={adv.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.5rem", fontWeight: 600 }}>
                    {adv.name}
                    <div style={{ fontSize: "0.7rem", color: "#999" }}>ID: {adv.externalId}</div>
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    <span style={{ padding: "2px 6px", borderRadius: "10px", background: `${statusColors[adv.status] || "#666"}20`, color: statusColors[adv.status] || "#666", fontSize: "0.7rem", fontWeight: 600 }}>
                      {adv.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    <span style={{ color: priorityColors[adv.priority] || "#666", fontWeight: 600, fontSize: "0.75rem" }}>
                      {adv.priority}
                    </span>
                  </td>
                  <td style={{ padding: "0.5rem", color: "#666" }}>{adv.category}</td>
                  <td style={{ padding: "0.5rem", fontWeight: 600 }}>
                    {adv.threeMonthEpc != null ? `$${adv.threeMonthEpc.toFixed(2)}` : "—"}
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    {adv.sevenDayEpc != null ? `$${adv.sevenDayEpc.toFixed(2)}` : "—"}
                  </td>
                  <td style={{ padding: "0.5rem", textAlign: "center" }}>{adv._count?.links ?? 0}</td>
                  <td style={{ padding: "0.5rem", textAlign: "center" }}>{adv._count?.offers ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
