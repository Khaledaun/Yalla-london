"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Network {
  id: string;
  name: string;
  slug: string;
  apiBaseUrl: string | null;
  apiTokenEnvVar: string;
  publisherId: string;
  isActive: boolean;
  _count: { advertisers: number; links: number; offers: number; commissions: number };
}

export default function NetworksPage() {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/affiliate/networks")
      .then((r) => r.ok ? r.json() : { networks: [] })
      .then((d) => setNetworks(d.networks || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: "1.5rem", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Affiliate Networks</h1>
        <Link href="/admin/affiliate" style={{ fontSize: "0.8rem", color: "#4A7BA8" }}>← Dashboard</Link>
      </div>

      {loading ? (
        <p style={{ color: "#666" }}>Loading...</p>
      ) : networks.length === 0 ? (
        <p style={{ color: "#666" }}>No networks configured. Run the migration to seed the CJ network.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {networks.map((n) => (
            <div
              key={n.id}
              style={{
                padding: "1rem",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                background: "#fff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>{n.name}</h3>
                  <p style={{ fontSize: "0.75rem", color: "#666" }}>
                    Slug: {n.slug} · Publisher ID: {n.publisherId}
                  </p>
                </div>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "12px",
                    background: n.isActive ? "#dcfce7" : "#fef2f2",
                    color: n.isActive ? "#166534" : "#991b1b",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                  }}
                >
                  {n.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", fontSize: "0.75rem", color: "#666" }}>
                <span>{n._count.advertisers} advertisers</span>
                <span>{n._count.links} links</span>
                <span>{n._count.offers} offers</span>
                <span>{n._count.commissions} commissions</span>
              </div>
              <p style={{ fontSize: "0.7rem", color: "#999", marginTop: "0.25rem" }}>
                Token: {n.apiTokenEnvVar} · API: {n.apiBaseUrl || "Default"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
