"use client";

/**
 * Specialized hotel card with star rating, price, Booking.com branding.
 * Designed for hotel content pages.
 */

interface AffiliateHotelCardProps {
  hotelName: string;
  starRating?: number;
  price?: number | null;
  currency?: string;
  location?: string;
  affiliateUrl: string;
  imageUrl?: string | null;
  language: "en" | "ar";
  linkId?: string;
  baseUrl?: string;
  advertiserName?: string;
}

export default function AffiliateHotelCard({
  hotelName,
  starRating = 0,
  price,
  currency = "GBP",
  location,
  affiliateUrl,
  imageUrl,
  language,
  linkId,
  baseUrl = "",
  advertiserName = "Booking.com",
}: AffiliateHotelCardProps) {
  const isRtl = language === "ar";
  const trackingUrl = linkId
    ? `${baseUrl}/api/affiliate/click?id=${encodeURIComponent(linkId)}`
    : affiliateUrl;

  const ctaText = isRtl ? "احجز الآن" : "Book Now";
  const fromText = isRtl ? "من" : "From";
  const perNightText = isRtl ? "/ ليلة" : "/ night";

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat(isRtl ? "ar-SA" : "en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(p);
  };

  return (
    <div
      className="affiliate-hotel-card"
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        display: "flex",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        maxWidth: "600px",
      }}
    >
      {imageUrl && (
        <div
          style={{
            width: "180px",
            minHeight: "140px",
            flexShrink: 0,
            background: "#f3f4f6",
          }}
        >
          <img
            src={imageUrl}
            alt={hotelName}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}
      <div style={{ padding: "1rem", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          {starRating > 0 && (
            <div style={{ marginBottom: "0.25rem", color: "#C49A2A" }}>
              {"★".repeat(Math.min(starRating, 5))}
              {"☆".repeat(Math.max(5 - starRating, 0))}
            </div>
          )}
          <h4
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              color: "#1a1a2e",
              margin: "0 0 0.25rem",
              fontFamily: isRtl ? "'IBM Plex Sans Arabic', sans-serif" : "'Anybody', sans-serif",
            }}
          >
            {hotelName}
          </h4>
          {location && (
            <p style={{ fontSize: "0.8rem", color: "#666", margin: "0 0 0.5rem" }}>
              📍 {location}
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
          {price !== null && price !== undefined && price > 0 && (
            <div>
              <span style={{ fontSize: "0.75rem", color: "#666" }}>{fromText} </span>
              <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#C8322B" }}>
                {formatPrice(price)}
              </span>
              <span style={{ fontSize: "0.75rem", color: "#666" }}> {perNightText}</span>
            </div>
          )}
          <a
            href={trackingUrl}
            target="_blank"
            rel="sponsored nofollow noopener"
            style={{
              padding: "0.5rem 1.2rem",
              background: "#003B95", // Booking.com blue
              color: "#fff",
              textDecoration: "none",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.85rem",
              whiteSpace: "nowrap",
            }}
            aria-label={`${ctaText} - ${hotelName} via ${advertiserName}`}
          >
            {ctaText}
          </a>
        </div>
        <p style={{ fontSize: "0.65rem", color: "#999", marginTop: "0.5rem" }}>
          via {advertiserName}
        </p>
      </div>
    </div>
  );
}
