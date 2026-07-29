"use client";

/**
 * Hot deals section showing price drops, new arrivals, and expiring-soon offers.
 * Fetches from /api/affiliate/offers/hot-deals.
 */

import { useState, useEffect } from "react";

interface HotDeal {
  id: string;
  title: string;
  price: number | null;
  previousPrice?: number | null;
  affiliateUrl: string;
  imageUrl?: string | null;
  category: string;
  advertiserName: string;
  validTo?: string | null;
}

interface AffiliateHotDealsProps {
  language: "en" | "ar";
  baseUrl?: string;
  limit?: number;
}

export default function AffiliateHotDeals({
  language,
  baseUrl = "",
  limit = 6,
}: AffiliateHotDealsProps) {
  const isRtl = language === "ar";
  const [deals, setDeals] = useState<{
    priceDrops: HotDeal[];
    newArrivals: HotDeal[];
    expiringSoon: HotDeal[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"drops" | "new" | "expiring">("drops");

  useEffect(() => {
    fetch(`${baseUrl}/api/affiliate/offers/hot-deals?limit=${limit}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setDeals(data);
      })
      .catch(() => {});
  }, [baseUrl, limit]);

  if (!deals) return null;

  const tabs = [
    { key: "drops" as const, labelEn: "Price Drops", labelAr: "تخفيضات", count: deals.priceDrops.length },
    { key: "new" as const, labelEn: "New Arrivals", labelAr: "وصل حديثاً", count: deals.newArrivals.length },
    { key: "expiring" as const, labelEn: "Ending Soon", labelAr: "ينتهي قريباً", count: deals.expiringSoon.length },
  ];

  const activeDealList =
    activeTab === "drops" ? deals.priceDrops :
    activeTab === "new" ? deals.newArrivals :
    deals.expiringSoon;

  if (activeDealList.length === 0 && deals.priceDrops.length === 0 && deals.newArrivals.length === 0 && deals.expiringSoon.length === 0) {
    return null;
  }

  const formatPrice = (p: number) =>
    new Intl.NumberFormat(isRtl ? "ar-SA" : "en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(p);

  const calcDiscount = (prev: number, curr: number) =>
    Math.round(((prev - curr) / prev) * 100);

  return (
    <section
      className="affiliate-hot-deals"
      dir={isRtl ? "rtl" : "ltr"}
      style={{ margin: "2rem 0" }}
    >
      <h3
        style={{
          fontSize: "1.2rem",
          fontWeight: 700,
          color: "#1a1a2e",
          marginBottom: "1rem",
          fontFamily: isRtl ? "'IBM Plex Sans Arabic', sans-serif" : "'Anybody', sans-serif",
        }}
      >
        🔥 {isRtl ? "عروض ساخنة" : "Hot Deals"}
      </h3>

      {/* Tab Buttons */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "20px",
              border: "none",
              background: activeTab === tab.key ? "#1a1a2e" : "#f3f4f6",
              color: activeTab === tab.key ? "#fff" : "#666",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {isRtl ? tab.labelAr : tab.labelEn} ({tab.count})
          </button>
        ))}
      </div>

      {/* Deal Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
        {activeDealList.slice(0, limit).map((deal) => (
          <a
            key={deal.id}
            href={deal.affiliateUrl}
            target="_blank"
            rel="sponsored nofollow noopener"
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              overflow: "hidden",
              textDecoration: "none",
              color: "inherit",
              background: "#fff",
            }}
          >
            {deal.imageUrl && (
              <img
                src={deal.imageUrl}
                alt={deal.title}
                loading="lazy"
                style={{ width: "100%", height: "120px", objectFit: "cover" }}
              />
            )}
            <div style={{ padding: "0.75rem" }}>
              <p style={{ fontSize: "0.8rem", fontWeight: 600, margin: "0 0 0.25rem", color: "#1a1a2e" }}>
                {deal.title}
              </p>
              <p style={{ fontSize: "0.65rem", color: "#666", margin: "0 0 0.25rem" }}>
                {deal.advertiserName}
              </p>
              {activeTab === "drops" && deal.previousPrice && deal.price && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <span style={{ fontSize: "0.7rem", color: "#999", textDecoration: "line-through" }}>
                    {formatPrice(deal.previousPrice)}
                  </span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#C8322B" }}>
                    {formatPrice(deal.price)}
                  </span>
                  <span
                    style={{
                      fontSize: "0.65rem",
                      background: "#C8322B",
                      color: "#fff",
                      padding: "1px 5px",
                      borderRadius: "4px",
                      fontWeight: 600,
                    }}
                  >
                    -{calcDiscount(deal.previousPrice, deal.price)}%
                  </span>
                </div>
              )}
              {activeTab === "expiring" && deal.validTo && (
                <p style={{ fontSize: "0.7rem", color: "#C8322B", fontWeight: 600, margin: "0.25rem 0 0" }}>
                  ⏰ {isRtl ? "ينتهي" : "Ends"} {new Date(deal.validTo).toLocaleDateString(isRtl ? "ar-SA" : "en-GB")}
                </p>
              )}
              {activeTab === "new" && deal.price && (
                <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "#C8322B", margin: "0.25rem 0 0" }}>
                  {formatPrice(deal.price)}
                </p>
              )}
            </div>
          </a>
        ))}
      </div>
      <p style={{ fontSize: "0.6rem", color: "#999", marginTop: "0.5rem", textAlign: "center" }}>
        {isRtl ? "روابط تسويقية" : "Affiliate links"}
      </p>
    </section>
  );
}
