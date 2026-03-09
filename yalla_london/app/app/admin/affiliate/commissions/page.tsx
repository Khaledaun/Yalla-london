"use client";

import { useState, useEffect, useCallback } from "react";

interface Commission {
  id: string;
  externalId: string;
  advertiserId: string;
  advertiser: { name: string };
  eventDate: string;
  amount: number;
  currency: string;
  status: string;
  orderId: string | null;
  actionType: string | null;
}

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [aggregate, setAggregate] = useState<{ total: number; pending: number; locked: number; paid: number } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/affiliate/commissions?limit=50");
      if (res.ok) {
        const d = await res.json();
        setCommissions(d.commissions || []);
        setAggregate(d.aggregate || null);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const syncCommissions = async () => {
    setSyncing(true);
    await fetch("/api/affiliate/commissions/sync", { method: "POST" }).catch(() => {});
    await fetchData();
    setSyncing(false);
  };

  const statusColors: Record<string, string> = {
    RECEIVED: "#3b82f6",
    EXTENDED: "#6366f1",
    LOCKED: "#f59e0b",
    CLOSED: "#22c55e",
    CORRECTED: "#ef4444",
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Commissions</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={syncCommissions}
            disabled={syncing}
            style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", border: "1px solid #e5e7eb", background: "#fff", fontSize: "0.8rem", cursor: "pointer" }}
          >
            {syncing ? "Syncing..." : "Sync Last 7 Days"}
          </button>
          <a href="/admin/affiliate" style={{ fontSize: "0.8rem", color: "#4A7BA8" }}>← Dashboard</a>
        </div>
      </div>

      {/* Aggregate Summary */}
      {aggregate && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Total", value: `£${aggregate.total.toFixed(2)}`, color: "#1a1a2e" },
            { label: "Pending", value: `£${aggregate.pending.toFixed(2)}`, color: "#3b82f6" },
            { label: "Locked", value: `£${aggregate.locked.toFixed(2)}`, color: "#f59e0b" },
            { label: "Paid", value: `£${aggregate.paid.toFixed(2)}`, color: "#22c55e" },
          ].map((s) => (
            <div key={s.label} style={{ padding: "1rem", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", textAlign: "center" }}>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.75rem", color: "#666" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#666" }}>Loading commissions...</p>
      ) : commissions.length === 0 ? (
        <p style={{ color: "#666" }}>No commissions yet. Click &ldquo;Sync Last 7 Days&rdquo; to fetch from CJ.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "0.5rem" }}>Date</th>
                <th style={{ padding: "0.5rem" }}>Advertiser</th>
                <th style={{ padding: "0.5rem" }}>Amount</th>
                <th style={{ padding: "0.5rem" }}>Status</th>
                <th style={{ padding: "0.5rem" }}>Order ID</th>
                <th style={{ padding: "0.5rem" }}>Type</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.5rem" }}>{new Date(c.eventDate).toLocaleDateString("en-GB")}</td>
                  <td style={{ padding: "0.5rem", fontWeight: 600 }}>{c.advertiser?.name || "—"}</td>
                  <td style={{ padding: "0.5rem", fontWeight: 700, color: "#22c55e" }}>
                    {c.currency} {c.amount.toFixed(2)}
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    <span style={{ padding: "2px 6px", borderRadius: "10px", background: `${statusColors[c.status] || "#666"}20`, color: statusColors[c.status] || "#666", fontSize: "0.7rem", fontWeight: 600 }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.5rem", fontSize: "0.7rem", color: "#666" }}>{c.orderId || "—"}</td>
                  <td style={{ padding: "0.5rem", fontSize: "0.7rem" }}>{c.actionType || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
