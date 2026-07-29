"use client";

/**
 * FTC/Legal affiliate disclosure component.
 * Must appear on every page that contains affiliate content.
 * Bilingual EN/AR with RTL support.
 */

interface AffiliateDisclosureProps {
  language: "en" | "ar";
  className?: string;
}

const DISCLOSURE_EN =
  "This page contains affiliate links. We may earn a commission at no extra cost to you when you book through these links.";

const DISCLOSURE_AR =
  "تحتوي هذه الصفحة على روابط تابعة. قد نحصل على عمولة دون أي تكلفة إضافية عليك عند الحجز من خلال هذه الروابط.";

export default function AffiliateDisclosure({
  language,
  className = "",
}: AffiliateDisclosureProps) {
  const isRtl = language === "ar";
  const text = isRtl ? DISCLOSURE_AR : DISCLOSURE_EN;

  return (
    <div
      className={`affiliate-disclosure ${className}`}
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        marginBottom: "1.5rem",
        padding: "0.75rem 1rem",
        background: "#f8f9fa",
        borderRadius: "6px",
        fontSize: "0.8rem",
        color: "#666",
        fontFamily: isRtl
          ? "'IBM Plex Sans Arabic', sans-serif"
          : "'IBM Plex Mono', monospace",
      }}
    >
      <p style={{ margin: 0 }}>{text}</p>
    </div>
  );
}
