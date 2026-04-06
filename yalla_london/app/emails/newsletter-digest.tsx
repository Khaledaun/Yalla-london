/**
 * Newsletter Digest Email Template — Bilingual EN/AR
 *
 * Weekly digest of latest articles. Sent to subscribers by the
 * subscriber-emails cron or manually via email campaigns.
 */

import * as React from "react";

// ---------------------------------------------------------------------------
// Brand resolution — derives colors from site identity, no hardcoding
// ---------------------------------------------------------------------------

const SITE_BRANDS: Record<string, { primary: string; accent: string; highlight: string; dark: string; cream: string; heading: string; logoPath: string }> = {
  "yalla-london": {
    primary: "#C8322B", accent: "#C49A2A", highlight: "#4A7BA8",
    dark: "#1C1917", cream: "#FAF8F4",
    heading: "'Source Serif 4', Georgia, serif",
    logoPath: "/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-stamp-200px.png",
  },
  "zenitha-luxury": {
    primary: "#C49A2A", accent: "#D4AF6A", highlight: "#C9A84C",
    dark: "#0C0C0C", cream: "#F0EBE1",
    heading: "'Cormorant Garamond', Georgia, serif",
    logoPath: "/branding/zenitha-luxury/logo/zenitha-logo-light.png",
  },
  "zenitha-yachts-med": {
    primary: "#B8923E", accent: "#D4B254", highlight: "#101F31",
    dark: "#101F31", cream: "#FBF2E3",
    heading: "'Cormorant Garamond', Georgia, serif",
    logoPath: "/branding/zenitha-luxury/logo/zenitha-logo-light.png",
  },
  "worldtme": {
    primary: "#07A4F2", accent: "#03AD62", highlight: "#FFC417",
    dark: "#000000", cream: "#FFFFFF",
    heading: "'Montserrat', 'Helvetica Neue', Arial, sans-serif",
    logoPath: "/branding/worldtme/logo/wtme-logo-1024.png",
  },
};

function getBrand(siteId?: string) {
  const brand = SITE_BRANDS[siteId || "yalla-london"] || SITE_BRANDS["yalla-london"];
  return {
    ...brand,
    text: "#333333",
    lightText: "#666666",
    border: "#E5E5E5",
    white: "#FFFFFF",
  };
}

const FONTS = {
  body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  arabic: "'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DigestArticle {
  title: string;
  excerpt: string;
  url: string;
  imageUrl?: string;
  category?: string;
}

interface NewsletterDigestProps {
  locale?: "en" | "ar";
  articles?: DigestArticle[];
  siteUrl?: string;
  siteId?: string;
  unsubscribeUrl?: string;
  weekLabel?: string;
}

// ---------------------------------------------------------------------------
// Newsletter Digest
// ---------------------------------------------------------------------------

export default function NewsletterDigest({
  locale = "en",
  articles = [],
  siteId = "yalla-london",
  siteUrl = "https://www.yalla-london.com",
  unsubscribeUrl,
  weekLabel,
}: NewsletterDigestProps) {
  const BRAND = getBrand(siteId);
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const fontFamily = isAr ? FONTS.arabic : FONTS.body;
  const headingFamily = isAr ? FONTS.arabic : BRAND.heading;

  const label = weekLabel || (isAr ? "ملخص الأسبوع" : "This Week in London");
  const ctaText = isAr ? "اقرأ المقال كاملاً" : "Read Full Article";
  const allArticlesText = isAr ? "شاهد جميع المقالات" : "View All Articles";
  const introText = isAr
    ? "إليك أحدث أدلتنا المختارة بعناية لهذا الأسبوع:"
    : "Here are our latest curated guides for you this week:";

  return (
    <html dir={dir} lang={isAr ? "ar" : "en"}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{label}</title>
      </head>
      <body style={{ margin: "0", padding: "0", backgroundColor: BRAND.cream, fontFamily }}>
        <table width="100%" cellPadding="0" cellSpacing="0" role="presentation" style={{ backgroundColor: BRAND.cream }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "24px 16px" }}>
                <table width="600" cellPadding="0" cellSpacing="0" role="presentation" style={{
                  maxWidth: "600px",
                  width: "100%",
                  backgroundColor: BRAND.white,
                  borderRadius: "8px",
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}>
                  <tbody>
                    {/* Tri-color bar */}
                    <tr>
                      <td>
                        <table width="100%" cellPadding="0" cellSpacing="0" role="presentation">
                          <tbody>
                            <tr>
                              <td style={{ backgroundColor: BRAND.primary, height: "4px", width: "33.33%" }} />
                              <td style={{ backgroundColor: BRAND.accent, height: "4px", width: "33.34%" }} />
                              <td style={{ backgroundColor: BRAND.highlight, height: "4px", width: "33.33%" }} />
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* Header with brand logo */}
                    <tr>
                      <td style={{ padding: "28px 32px 16px", textAlign: "center", backgroundColor: BRAND.dark }}>
                        {/* Site logo */}
                        <div style={{ marginBottom: "12px" }}>
                          <img src={`${siteUrl}${BRAND.logoPath}`} alt="" width="48" height="48" style={{ display: "inline-block", borderRadius: "50%", objectFit: "cover" }} />
                        </div>
                        {/* Brand accent line */}
                        <div style={{ width: "40px", height: "2px", backgroundColor: BRAND.accent, margin: "0 auto 16px" }} />
                        <h1 style={{
                          margin: "0",
                          color: BRAND.accent,
                          fontSize: "22px",
                          fontFamily: headingFamily,
                          fontWeight: "600",
                          letterSpacing: isAr ? "0" : "0.5px",
                        }}>
                          {label}
                        </h1>
                      </td>
                    </tr>

                    {/* Intro */}
                    <tr>
                      <td style={{ padding: "24px 32px 8px" }}>
                        <p style={{
                          margin: "0",
                          color: BRAND.text,
                          fontSize: "15px",
                          fontFamily,
                          lineHeight: "1.7",
                          direction: dir,
                        }}>
                          {introText}
                        </p>
                      </td>
                    </tr>

                    {/* Articles */}
                    {articles.slice(0, 5).map((article, i) => (
                      <tr key={i}>
                        <td style={{ padding: "16px 32px" }}>
                          <table width="100%" cellPadding="0" cellSpacing="0" role="presentation" style={{
                            borderRadius: "6px",
                            overflow: "hidden",
                            border: `1px solid ${BRAND.border}`,
                          }}>
                            <tbody>
                              {article.imageUrl && (
                                <tr>
                                  <td>
                                    <a href={article.url} style={{ textDecoration: "none" }}>
                                      <img
                                        src={article.imageUrl}
                                        alt={article.title}
                                        width="536"
                                        style={{
                                          display: "block",
                                          width: "100%",
                                          maxWidth: "536px",
                                          height: "auto",
                                          maxHeight: "200px",
                                          objectFit: "cover",
                                        }}
                                      />
                                    </a>
                                  </td>
                                </tr>
                              )}
                              <tr>
                                <td style={{ padding: "16px 20px" }}>
                                  {article.category && (
                                    <p style={{
                                      margin: "0 0 6px 0",
                                      color: BRAND.highlight,
                                      fontSize: "11px",
                                      fontFamily,
                                      fontWeight: "600",
                                      textTransform: "uppercase",
                                      letterSpacing: isAr ? "0" : "1px",
                                      direction: dir,
                                    }}>
                                      {article.category}
                                    </p>
                                  )}
                                  <h2 style={{
                                    margin: "0 0 8px 0",
                                    fontSize: "18px",
                                    fontFamily: headingFamily,
                                    fontWeight: "600",
                                    lineHeight: "1.3",
                                    direction: dir,
                                  }}>
                                    <a href={article.url} style={{ color: BRAND.dark, textDecoration: "none" }}>
                                      {article.title}
                                    </a>
                                  </h2>
                                  <p style={{
                                    margin: "0 0 12px 0",
                                    color: BRAND.lightText,
                                    fontSize: "14px",
                                    fontFamily,
                                    lineHeight: "1.6",
                                    direction: dir,
                                  }}>
                                    {article.excerpt}
                                  </p>
                                  <a href={article.url} style={{
                                    color: BRAND.primary,
                                    fontSize: "13px",
                                    fontFamily,
                                    fontWeight: "600",
                                    textDecoration: "none",
                                  }}>
                                    {ctaText} {isAr ? "←" : "→"}
                                  </a>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    ))}

                    {/* View All CTA */}
                    <tr>
                      <td align="center" style={{ padding: "16px 32px 32px" }}>
                        <a href={`${siteUrl}/blog`} style={{
                          display: "inline-block",
                          padding: "12px 28px",
                          backgroundColor: BRAND.primary,
                          color: BRAND.white,
                          fontSize: "14px",
                          fontFamily,
                          fontWeight: "600",
                          textDecoration: "none",
                          borderRadius: "6px",
                        }}>
                          {allArticlesText}
                        </a>
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td style={{ padding: "20px 32px", backgroundColor: BRAND.dark, textAlign: "center" }}>
                        <p style={{ margin: "0 0 8px", color: "#999", fontSize: "12px", fontFamily }}>
                          Zenitha.Luxury LLC
                        </p>
                        {unsubscribeUrl && (
                          <a href={unsubscribeUrl} style={{ color: BRAND.accent, fontSize: "12px", fontFamily, textDecoration: "underline" }}>
                            {isAr ? "إلغاء الاشتراك" : "Unsubscribe"}
                          </a>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
