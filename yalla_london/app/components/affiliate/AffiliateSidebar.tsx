"use client";

/**
 * Sidebar widget displaying rotating affiliate offers.
 * Shows top offers sorted by EPC, compact layout for sidebar placement.
 */

interface SidebarOffer {
  id: string;
  title: string;
  advertiserName: string;
  affiliateUrl: string;
  linkId?: string;
  price?: number | null;
  currency?: string;
  imageUrl?: string | null;
}

interface AffiliateSidebarProps {
  title?: string;
  offers: SidebarOffer[];
  language: "en" | "ar";
  baseUrl?: string;
  maxOffers?: number;
}

export default function AffiliateSidebar({
  title,
  offers,
  language,
  baseUrl = "",
  maxOffers = 4,
}: AffiliateSidebarProps) {
  const isRtl = language === "ar";
  const defaultTitle = isRtl ? "عروض مميزة" : "Featured Deals";
  const displayOffers = offers.slice(0, maxOffers);

  if (displayOffers.length === 0) return null;

  const formatPrice = (p: number, currency = "GBP") =>
    new Intl.NumberFormat(isRtl ? "ar-SA" : "en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(p);

  return (
    <aside
      className="affiliate-sidebar"
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "1rem",
        background: "#fff",
        maxWidth: "320px",
      }}
    >
      <h4
        style={{
          fontSize: "0.85rem",
          fontWeight: 700,
          color: "#C49A2A",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          margin: "0 0 0.75rem",
          fontFamily: isRtl ? "'IBM Plex Sans Arabic', sans-serif" : "'Anybody', sans-serif",
        }}
      >
        {title || defaultTitle}
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {displayOffers.map((offer) => {
          const trackingUrl = offer.linkId
            ? `${baseUrl}/api/affiliate/click?id=${encodeURIComponent(offer.linkId)}`
            : offer.affiliateUrl;

          return (
            <a
              key={offer.id}
              href={trackingUrl}
              target="_blank"
              rel="sponsored nofollow noopener"
              style={{
                display: "flex",
                gap: "0.5rem",
                textDecoration: "none",
                color: "inherit",
                padding: "0.5rem",
                borderRadius: "8px",
                transition: "background 0.2s",
              }}
              aria-label={`${offer.title} via ${offer.advertiserName}`}
            >
              {offer.imageUrl && (
                <img
                  src={offer.imageUrl}
                  alt={offer.title}
                  loading="lazy"
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "6px",
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#1a1a2e",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {offer.title}
                </p>
                <p style={{ fontSize: "0.7rem", color: "#666", margin: "2px 0 0" }}>
                  {offer.advertiserName}
                </p>
                {offer.price != null && offer.price > 0 && (
                  <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#C8322B", margin: "2px 0 0" }}>
                    {formatPrice(offer.price, offer.currency)}
                  </p>
                )}
              </div>
            </a>
          );
        })}
      </div>
      <p style={{ fontSize: "0.6rem", color: "#999", marginTop: "0.5rem", textAlign: "center" }}>
        {isRtl ? "روابط تسويقية" : "Affiliate links"}
      </p>
    </aside>
  );
}
