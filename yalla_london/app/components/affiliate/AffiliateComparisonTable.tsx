"use client";

/**
 * Side-by-side comparison table for affiliate products/services.
 * Responsive: stacks vertically on mobile.
 */

interface ComparisonItem {
  name: string;
  advertiserName: string;
  affiliateUrl: string;
  linkId?: string;
  price?: number | null;
  currency?: string;
  features: string[];
  highlight?: boolean;
  imageUrl?: string | null;
}

interface AffiliateComparisonTableProps {
  title?: string;
  items: ComparisonItem[];
  language: "en" | "ar";
  baseUrl?: string;
}

export default function AffiliateComparisonTable({
  title,
  items,
  language,
  baseUrl = "",
}: AffiliateComparisonTableProps) {
  const isRtl = language === "ar";
  const defaultTitle = isRtl ? "قارن الخيارات" : "Compare Options";
  const ctaText = isRtl ? "احجز الآن" : "Book Now";

  if (items.length === 0) return null;

  const formatPrice = (p: number, currency = "GBP") =>
    new Intl.NumberFormat(isRtl ? "ar-SA" : "en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(p);

  return (
    <div
      className="affiliate-comparison"
      dir={isRtl ? "rtl" : "ltr"}
      style={{ maxWidth: "100%", margin: "1.5rem 0" }}
    >
      <h3
        style={{
          fontSize: "1.1rem",
          fontWeight: 700,
          color: "#1a1a2e",
          marginBottom: "1rem",
          fontFamily: isRtl ? "'IBM Plex Sans Arabic', sans-serif" : "'Anybody', sans-serif",
        }}
      >
        {title || defaultTitle}
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, 1fr)`,
          gap: "1rem",
        }}
      >
        {items.slice(0, 3).map((item, i) => {
          const trackingUrl = item.linkId
            ? `${baseUrl}/api/affiliate/click?id=${encodeURIComponent(item.linkId)}`
            : item.affiliateUrl;

          return (
            <div
              key={i}
              style={{
                border: item.highlight ? "2px solid #C49A2A" : "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "1rem",
                background: "#fff",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {item.highlight && (
                <span
                  style={{
                    position: "absolute",
                    top: "-10px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#C49A2A",
                    color: "#fff",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    padding: "2px 10px",
                    borderRadius: "10px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isRtl ? "الأفضل قيمة" : "Best Value"}
                </span>
              )}
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "100px",
                    objectFit: "cover",
                    borderRadius: "8px",
                    marginBottom: "0.75rem",
                  }}
                />
              )}
              <h4
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  color: "#1a1a2e",
                  margin: "0 0 0.25rem",
                }}
              >
                {item.name}
              </h4>
              <p style={{ fontSize: "0.7rem", color: "#666", margin: "0 0 0.5rem" }}>
                {item.advertiserName}
              </p>
              {item.price != null && item.price > 0 && (
                <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "#C8322B", margin: "0 0 0.5rem" }}>
                  {formatPrice(item.price, item.currency)}
                </p>
              )}
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 0.75rem", flex: 1 }}>
                {item.features.map((f, fi) => (
                  <li
                    key={fi}
                    style={{
                      fontSize: "0.75rem",
                      color: "#444",
                      padding: "3px 0",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span style={{ color: "#22c55e" }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <a
                href={trackingUrl}
                target="_blank"
                rel="sponsored nofollow noopener"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "0.5rem",
                  background: item.highlight ? "#C49A2A" : "#1a1a2e",
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                }}
                aria-label={`${ctaText} - ${item.name} via ${item.advertiserName}`}
              >
                {ctaText}
              </a>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: "0.6rem", color: "#999", marginTop: "0.5rem", textAlign: "center" }}>
        {isRtl ? "روابط تسويقية — قد نحصل على عمولة" : "Affiliate links — we may earn a commission"}
      </p>
    </div>
  );
}
