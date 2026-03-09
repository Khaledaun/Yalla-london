"use client";

/**
 * Footer section with categorized affiliate links.
 * Displays partner logos and quick links by category.
 */

interface FooterLink {
  name: string;
  affiliateUrl: string;
  linkId?: string;
  category: string;
}

interface AffiliateFooterLinksProps {
  links: FooterLink[];
  language: "en" | "ar";
  baseUrl?: string;
}

const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  hotel: { en: "Hotels", ar: "فنادق" },
  flight: { en: "Flights", ar: "رحلات طيران" },
  experience: { en: "Experiences", ar: "تجارب" },
  dining: { en: "Dining", ar: "مطاعم" },
  transport: { en: "Transport", ar: "نقل" },
  shopping: { en: "Shopping", ar: "تسوق" },
  travel: { en: "Travel", ar: "سفر" },
  insurance: { en: "Insurance", ar: "تأمين" },
};

export default function AffiliateFooterLinks({
  links,
  language,
  baseUrl = "",
}: AffiliateFooterLinksProps) {
  const isRtl = language === "ar";

  if (links.length === 0) return null;

  // Group by category
  const grouped: Record<string, FooterLink[]> = {};
  for (const link of links) {
    const cat = link.category || "travel";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(link);
  }

  const categories = Object.keys(grouped);

  return (
    <nav
      className="affiliate-footer-links"
      dir={isRtl ? "rtl" : "ltr"}
      aria-label={isRtl ? "روابط الشركاء" : "Partner Links"}
      style={{
        borderTop: "1px solid #e5e7eb",
        padding: "1.5rem 0",
        margin: "2rem 0 0",
      }}
    >
      <h4
        style={{
          fontSize: "0.8rem",
          fontWeight: 700,
          color: "#C49A2A",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "1rem",
          fontFamily: isRtl ? "'IBM Plex Sans Arabic', sans-serif" : "'Anybody', sans-serif",
        }}
      >
        {isRtl ? "شركاؤنا الموثوقون" : "Our Trusted Partners"}
      </h4>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(categories.length, 4)}, 1fr)`,
          gap: "1.5rem",
        }}
      >
        {categories.map((cat) => {
          const label = CATEGORY_LABELS[cat] || { en: cat, ar: cat };
          return (
            <div key={cat}>
              <h5
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#1a1a2e",
                  margin: "0 0 0.5rem",
                }}
              >
                {isRtl ? label.ar : label.en}
              </h5>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {grouped[cat].map((link, i) => {
                  const trackingUrl = link.linkId
                    ? `${baseUrl}/api/affiliate/click?id=${encodeURIComponent(link.linkId)}`
                    : link.affiliateUrl;

                  return (
                    <li key={i}>
                      <a
                        href={trackingUrl}
                        target="_blank"
                        rel="sponsored nofollow noopener"
                        style={{
                          fontSize: "0.75rem",
                          color: "#4A7BA8",
                          textDecoration: "none",
                        }}
                      >
                        {link.name}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: "0.55rem", color: "#999", marginTop: "1rem" }}>
        {isRtl
          ? "نحن شركاء تسويق. قد نكسب عمولة عند حجزك عبر روابطنا."
          : "We are affiliate partners. We may earn a commission when you book through our links."}
      </p>
    </nav>
  );
}
