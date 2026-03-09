"use client";

import { useState, useEffect } from "react";

interface Deal {
  id: string;
  title: string;
  price: number | null;
  previousPrice: number | null;
  affiliateUrl: string;
  imageUrl: string | null;
  category: string;
  advertiserName: string;
  validTo?: string | null;
}

export default function HotDealsPage() {
  const [deals, setDeals] = useState<{ priceDrops: Deal[]; newArrivals: Deal[]; expiringSoon: Deal[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"drops" | "new" | "expiring">("drops");

  useEffect(() => {
    fetch("/api/affiliate/offers/hot-deals?limit=50")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setDeals(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const currentList = deals
    ? tab === "drops" ? deals.priceDrops : tab === "new" ? deals.newArrivals : deals.expiringSoon
    : [];

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700 }}>🔥 Hot Deals</h1>
        <a href="/admin/affiliate" style={{ fontSize: "0.8rem", color: "#4A7BA8" }}>← Dashboard</a>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {[
          { key: "drops" as const, label: "Price Drops", count: deals?.priceDrops.length ?? 0 },
          { key: "new" as const, label: "New Arrivals", count: deals?.newArrivals.length ?? 0 },
          { key: "expiring" as const, label: "Expiring Soon", count: deals?.expiringSoon.length ?? 0 },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "20px",
              border: "none",
              background: tab === t.key ? "#1a1a2e" : "#f3f4f6",
              color: tab === t.key ? "#fff" : "#666",
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "#666" }}>Loading hot deals...</p>
      ) : currentList.length === 0 ? (
        <p style={{ color: "#666" }}>No deals in this category. Run deal discovery to find deals.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "0.75rem" }}>
          {currentList.map((deal) => (
            <a
              key={deal.id}
              href={deal.affiliateUrl}
              target="_blank"
              rel="noopener"
              style={{ border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden", textDecoration: "none", color: "inherit", background: "#fff" }}
            >
              {deal.imageUrl && (
                <img src={deal.imageUrl} alt={deal.title} style={{ width: "100%", height: "130px", objectFit: "cover" }} loading="lazy" />
              )}
              <div style={{ padding: "0.75rem" }}>
                <h3 style={{ fontSize: "0.85rem", fontWeight: 600, margin: "0 0 0.25rem" }}>{deal.title}</h3>
                <p style={{ fontSize: "0.7rem", color: "#666" }}>{deal.advertiserName} · {deal.category}</p>
                {tab === "drops" && deal.previousPrice != null && deal.price != null && (
                  <div>
                    <span style={{ textDecoration: "line-through", color: "#999", fontSize: "0.8rem" }}>£{deal.previousPrice.toFixed(0)}</span>{" "}
                    <span style={{ fontWeight: 700, color: "#C8322B", fontSize: "1rem" }}>£{deal.price.toFixed(0)}</span>
                  </div>
                )}
                {tab === "expiring" && deal.validTo && (
                  <p style={{ fontSize: "0.75rem", color: "#C8322B", fontWeight: 600 }}>
                    Expires: {new Date(deal.validTo).toLocaleDateString("en-GB")}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
