"use client";

/**
 * Qatar Airways flight CTA for transport/flight content.
 * GCC-audience priority with bilingual support.
 */

interface AffiliateFlightCTAProps {
  destination?: string;
  affiliateUrl: string;
  linkId?: string;
  baseUrl?: string;
  advertiserName?: string;
  language: "en" | "ar";
  price?: number | null;
  currency?: string;
}

export default function AffiliateFlightCTA({
  destination,
  affiliateUrl,
  linkId,
  baseUrl = "",
  advertiserName = "Qatar Airways",
  language,
  price,
  currency = "GBP",
}: AffiliateFlightCTAProps) {
  const isRtl = language === "ar";
  const trackingUrl = linkId
    ? `${baseUrl}/api/affiliate/click?id=${encodeURIComponent(linkId)}`
    : affiliateUrl;

  const headlineEn = destination ? `Fly to ${destination}` : "Book Your Flight";
  const headlineAr = destination ? `حلّق إلى ${destination}` : "احجز رحلتك";
  const headline = isRtl ? headlineAr : headlineEn;

  const subtextEn = "Award-winning airline · World-class service · Doha hub connections";
  const subtextAr = "شركة طيران حائزة على جوائز · خدمة عالمية · وصلات عبر الدوحة";
  const subtext = isRtl ? subtextAr : subtextEn;

  const ctaText = isRtl ? "ابحث عن رحلات" : "Search Flights";

  const formatPrice = (p: number) =>
    new Intl.NumberFormat(isRtl ? "ar-SA" : "en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(p);

  return (
    <div
      className="affiliate-flight-cta"
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        background: "linear-gradient(135deg, #5C0632 0%, #7A1145 50%, #5C0632 100%)",
        borderRadius: "12px",
        padding: "1.5rem",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        maxWidth: "600px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "1.5rem" }}>✈️</span>
        <h4
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            margin: 0,
            fontFamily: isRtl ? "'IBM Plex Sans Arabic', sans-serif" : "'Anybody', sans-serif",
          }}
        >
          {headline}
        </h4>
      </div>
      <p style={{ fontSize: "0.8rem", margin: 0, opacity: 0.8 }}>{subtext}</p>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
        {price != null && price > 0 && (
          <div>
            <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>{isRtl ? "من" : "From"} </span>
            <span style={{ fontSize: "1.3rem", fontWeight: 700 }}>{formatPrice(price)}</span>
          </div>
        )}
        <a
          href={trackingUrl}
          target="_blank"
          rel="sponsored nofollow noopener"
          style={{
            padding: "0.5rem 1.5rem",
            background: "#fff",
            color: "#5C0632",
            textDecoration: "none",
            borderRadius: "6px",
            fontWeight: 700,
            fontSize: "0.85rem",
            whiteSpace: "nowrap",
          }}
          aria-label={`${ctaText} via ${advertiserName}`}
        >
          {ctaText}
        </a>
      </div>
      <p style={{ fontSize: "0.6rem", margin: 0, opacity: 0.4 }}>via {advertiserName}</p>
    </div>
  );
}
