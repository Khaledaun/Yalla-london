"use client";

import { useState, useEffect, useCallback } from "react";

interface Placement {
  id: string;
  name: string;
  position: string;
  pageType: string;
  maxLinks: number;
  isActive: boolean;
  priority: number;
}

export default function PlacementsPage() {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/affiliate/placements");
      if (res.ok) {
        const d = await res.json();
        setPlacements(d.placements || []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div style={{ padding: "1.5rem", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Affiliate Placements</h1>
        <a href="/admin/affiliate" style={{ fontSize: "0.8rem", color: "#4A7BA8" }}>← Dashboard</a>
      </div>

      <p style={{ fontSize: "0.8rem", color: "#666", marginBottom: "1rem" }}>
        Configure where affiliate links appear in content. Each placement defines a position, page type, and max links.
      </p>

      {loading ? (
        <p style={{ color: "#666" }}>Loading...</p>
      ) : placements.length === 0 ? (
        <p style={{ color: "#666" }}>No placements configured. Run the migration to seed defaults.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {placements.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "0.75rem 1rem",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                background: "#fff",
              }}
            >
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 600, margin: "0 0 0.15rem" }}>{p.name}</h3>
                <p style={{ fontSize: "0.7rem", color: "#666", margin: 0 }}>
                  Position: <code style={{ background: "#f3f4f6", padding: "1px 4px", borderRadius: "3px" }}>{p.position}</code>
                  {" · "}Page type: {p.pageType} · Max links: {p.maxLinks} · Priority: {p.priority}
                </p>
              </div>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: p.isActive ? "#dcfce7" : "#fef2f2",
                  color: p.isActive ? "#166534" : "#991b1b",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                }}
              >
                {p.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
