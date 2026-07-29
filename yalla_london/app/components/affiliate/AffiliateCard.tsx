"use client";

/**
 * Single affiliate offer card with image, title, price, and CTA button.
 * Uses yalla-london brand colors: Gold #C49A2A, Navy #1a1a2e.
 * All links include rel="sponsored nofollow".
 */

interface AffiliateCardProps {
  title: string;
  advertiserName: string;
  affiliateUrl: string;
  imageUrl?: string | null;
  price?: number | null;
  previousPrice?: number | null;
  currency?: string;
  category: string;
  language: "en" | "ar";
  linkId?: string;
  baseUrl?: string;
}

export default function AffiliateCard({
  title,
  advertiserName,
  affiliateUrl,
  imageUrl,
  price,
  previousPrice,
  currency = "GBP",
  category,
  language,
  linkId,
  baseUrl = "",
}: AffiliateCardProps) {
  const isRtl = language === "ar";
  const trackingUrl = linkId
    ? `${baseUrl}/api/affiliate/click?id=${encodeURIComponent(linkId)}`
    : affiliateUrl;

  const ctaText = isRtl ? `عرض على ${advertiserName}` : `View on ${advertiserName}`;
  const isPriceDrop = previousPrice && price && price < previousPrice;

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat(isRtl ? "ar-SA" : "en-GB", {
      style: "currency",
      currency,
    }).format(p);
  };

  return (
    <div
      className="affiliate-card"
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        transition: "box-shadow 0.2s, transform 0.2s",
        maxWidth: "320px",
      }}
    >
      {imageUrl && (
        <div style={{ height: "160px", overflow: "hidden", background: "#f3f4f6" }}>
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}
      <div style={{ padding: "1rem" }}>
        <p
          style={{
            fontSize: "0.7rem",
            textTransform: "uppercase",
            color: "#4A7BA8",
            fontWeight: 600,
            margin: "0 0 0.25rem",
            letterSpacing: "0.05em",
          }}
        >
          {category}
        </p>
        <h4
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: "#1a1a2e",
            margin: "0 0 0.5rem",
            lineHeight: 1.3,
            fontFamily: isRtl ? "'IBM Plex Sans Arabic', sans-serif" : "'Anybody', sans-serif",
          }}
        >
          {title}
        </h4>
        {price !== null && price !== undefined && price > 0 && (
          <div style={{ marginBottom: "0.75rem" }}>
            <span
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: isPriceDrop ? "#C8322B" : "#1a1a2e",
              }}
            >
              {formatPrice(price)}
            </span>
            {isPriceDrop && previousPrice && (
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "#999",
                  textDecoration: "line-through",
                  marginLeft: isRtl ? 0 : "0.5rem",
                  marginRight: isRtl ? "0.5rem" : 0,
                }}
              >
                {formatPrice(previousPrice)}
              </span>
            )}
          </div>
        )}
        <a
          href={trackingUrl}
          target="_blank"
          rel="sponsored nofollow noopener"
          style={{
            display: "block",
            textAlign: "center",
            padding: "0.6rem 1rem",
            background: "#C49A2A",
            color: "#fff",
            textDecoration: "none",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "0.9rem",
            transition: "background 0.2s",
          }}
          aria-label={`${ctaText} - ${title}`}
        >
          {ctaText} →
        </a>
        <p
          style={{
            fontSize: "0.7rem",
            color: "#999",
            marginTop: "0.5rem",
            textAlign: "center",
          }}
        >
          via {advertiserName}
        </p>
      </div>
    </div>
  );
}
