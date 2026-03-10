"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  affiliateUrl: string;
  imageUrl: string | null;
  price: number | null;
  previousPrice: number | null;
  currency: string;
  category: string;
  isActive: boolean;
  isNewArrival: boolean;
  isPriceDropped: boolean;
  advertiser: { name: string };
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchOffers = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter === "new") params.set("newArrivals", "true");
    if (filter === "drops") params.set("priceDrops", "true");
    if (filter === "active") params.set("active", "true");
    try {
      const res = await fetch(`/api/affiliate/offers?${params}`);
      if (res.ok) {
        const d = await res.json();
        setOffers(d.offers || []);
      }
    } catch {}
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const discover = async () => {
    setLoading(true);
    await fetch("/api/affiliate/offers/discover", { method: "POST" }).catch(() => {});
    await fetchOffers();
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700 }}>CJ Offers</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={discover} style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", border: "1px solid #C49A2A", background: "#fff8e1", fontSize: "0.8rem", cursor: "pointer", color: "#92700C" }}>
            Discover Deals
          </button>
          <Link href="/admin/affiliate" style={{ fontSize: "0.8rem", color: "#4A7BA8" }}>← Dashboard</Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {["all", "new", "drops", "active"].map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setLoading(true); }}
            style={{
              padding: "0.3rem 0.7rem",
              borderRadius: "20px",
              border: "none",
              background: filter === f ? "#1a1a2e" : "#f3f4f6",
              color: filter === f ? "#fff" : "#666",
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            {f === "all" ? "All" : f === "new" ? "New Arrivals" : f === "drops" ? "Price Drops" : "Active"}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "#666" }}>Loading...</p>
      ) : offers.length === 0 ? (
        <p style={{ color: "#666" }}>No offers found. Click &ldquo;Discover Deals&rdquo; to search.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem" }}>
          {offers.map((offer) => (
            <div key={offer.id} style={{ border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden", background: "#fff" }}>
              {offer.imageUrl && (
                <img src={offer.imageUrl} alt={offer.title} style={{ width: "100%", height: "140px", objectFit: "cover" }} loading="lazy" />
              )}
              <div style={{ padding: "0.75rem" }}>
                <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.25rem" }}>
                  {offer.isNewArrival && <span style={{ fontSize: "0.6rem", background: "#dbeafe", color: "#1e40af", padding: "1px 5px", borderRadius: "4px" }}>NEW</span>}
                  {offer.isPriceDropped && <span style={{ fontSize: "0.6rem", background: "#fef2f2", color: "#991b1b", padding: "1px 5px", borderRadius: "4px" }}>PRICE DROP</span>}
                </div>
                <h3 style={{ fontSize: "0.85rem", fontWeight: 600, margin: "0 0 0.25rem" }}>{offer.title}</h3>
                <p style={{ fontSize: "0.7rem", color: "#666", margin: "0 0 0.25rem" }}>{offer.advertiser?.name} · {offer.category}</p>
                {offer.price != null && (
                  <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                    {offer.previousPrice != null && offer.previousPrice > (offer.price || 0) && (
                      <span style={{ fontSize: "0.75rem", color: "#999", textDecoration: "line-through" }}>
                        {offer.currency} {offer.previousPrice.toFixed(0)}
                      </span>
                    )}
                    <span style={{ fontSize: "1rem", fontWeight: 700, color: "#C8322B" }}>
                      {offer.currency} {offer.price.toFixed(0)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
