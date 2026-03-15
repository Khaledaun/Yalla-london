"use client";

/**
 * Full-width promotional banner for affiliate offers.
 * Supports background image, gradient overlay, bilingual text.
 */

interface AffiliateBannerProps {
  headline: string;
  subtext?: string;
  ctaText: string;
  affiliateUrl: string;
  linkId?: string;
  baseUrl?: string;
  advertiserName?: string;
  backgroundImage?: string | null;
  language: "en" | "ar";
}

export default function AffiliateBanner({
  headline,
  subtext,
  ctaText,
  affiliateUrl,
  linkId,
  baseUrl = "",
  advertiserName = "",
  backgroundImage,
  language,
}: AffiliateBannerProps) {
  const isRtl = language === "ar";
  const trackingUrl = linkId
    ? `${baseUrl}/api/affiliate/click?id=${encodeURIComponent(linkId)}`
    : affiliateUrl;

  return (
    <div
      className="affiliate-banner"
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        position: "relative",
        borderRadius: "12px",
        overflow: "hidden",
        background: backgroundImage
          ? `linear-gradient(135deg, rgba(26,26,46,0.85), rgba(26,26,46,0.7)), url(${backgroundImage}) center/cover`
          : "linear-gradient(135deg, #1a1a2e 0%, #2d2d5e 100%)",
        color: "#fff",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: isRtl ? "flex-end" : "flex-start",
        gap: "0.75rem",
        maxWidth: "100%",
      }}
    >
      <h3
        style={{
          fontSize: "1.3rem",
          fontWeight: 700,
          margin: 0,
          lineHeight: 1.3,
          fontFamily: isRtl ? "'IBM Plex Sans Arabic', sans-serif" : "'Anybody', sans-serif",
        }}
      >
        {headline}
      </h3>
      {subtext && (
        <p style={{ fontSize: "0.9rem", margin: 0, opacity: 0.85, maxWidth: "500px" }}>
          {subtext}
        </p>
      )}
      <a
        href={trackingUrl}
        target="_blank"
        rel="sponsored nofollow noopener"
        style={{
          display: "inline-block",
          marginTop: "0.5rem",
          padding: "0.6rem 1.5rem",
          background: "#C49A2A",
          color: "#1a1a2e",
          textDecoration: "none",
          borderRadius: "6px",
          fontWeight: 700,
          fontSize: "0.9rem",
          whiteSpace: "nowrap",
        }}
        aria-label={`${ctaText} — ${headline} via ${advertiserName}`}
      >
        {ctaText}
      </a>
      {advertiserName && (
        <p style={{ fontSize: "0.6rem", margin: 0, opacity: 0.5 }}>
          via {advertiserName}
        </p>
      )}
    </div>
  );
}
