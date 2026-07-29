"use client";

/**
 * Styled inline text link with tracking.
 * Renders within body text as a natural-looking affiliate link.
 */

interface AffiliateInlineLinkProps {
  text: string;
  affiliateUrl: string;
  linkId?: string;
  baseUrl?: string;
  advertiserName?: string;
  language: "en" | "ar";
}

export default function AffiliateInlineLink({
  text,
  affiliateUrl,
  linkId,
  baseUrl = "",
  advertiserName = "",
  language,
}: AffiliateInlineLinkProps) {
  const isRtl = language === "ar";
  const trackingUrl = linkId
    ? `${baseUrl}/api/affiliate/click?id=${encodeURIComponent(linkId)}`
    : affiliateUrl;

  return (
    <a
      href={trackingUrl}
      target="_blank"
      rel="sponsored nofollow noopener"
      style={{
        color: "#C8322B",
        textDecoration: "underline",
        textDecorationColor: "rgba(200, 50, 43, 0.3)",
        textUnderlineOffset: "3px",
        fontWeight: 600,
        transition: "color 0.2s",
        fontFamily: isRtl ? "'IBM Plex Sans Arabic', sans-serif" : "inherit",
      }}
      aria-label={advertiserName ? `${text} via ${advertiserName}` : text}
    >
      {text}
      <span
        style={{
          fontSize: "0.7em",
          verticalAlign: "super",
          marginInlineStart: "2px",
          opacity: 0.5,
        }}
      >
        ↗
      </span>
    </a>
  );
}
