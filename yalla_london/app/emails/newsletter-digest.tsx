/**
 * Newsletter Digest Email Template — Bilingual EN/AR
 *
 * Weekly digest of latest articles. Sent to subscribers by the
 * subscriber-emails cron or manually via email campaigns.
 */

import * as React from "react";

// ---------------------------------------------------------------------------
// Brand Constants (shared with welcome.tsx)
// ---------------------------------------------------------------------------

const BRAND = {
  red: "#C8322B",
  gold: "#C49A2A",
  blue: "#4A7BA8",
  navy: "#1C1917",
  cream: "#FAF8F4",
  text: "#333333",
  lightText: "#666666",
  border: "#E5E5E5",
  white: "#FFFFFF",
};

const FONTS = {
  heading: "'Source Serif 4', 'Georgia', 'Times New Roman', serif",
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
  unsubscribeUrl?: string;
  weekLabel?: string;
}

// ---------------------------------------------------------------------------
// Newsletter Digest
// ---------------------------------------------------------------------------

export default function NewsletterDigest({
  locale = "en",
  articles = [],
  siteUrl = "https://www.yalla-london.com",
  unsubscribeUrl,
  weekLabel,
}: NewsletterDigestProps) {
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const fontFamily = isAr ? FONTS.arabic : FONTS.body;
  const headingFamily = isAr ? FONTS.arabic : FONTS.heading;

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
                              <td style={{ backgroundColor: BRAND.red, height: "4px", width: "33.33%" }} />
                              <td style={{ backgroundColor: BRAND.gold, height: "4px", width: "33.34%" }} />
                              <td style={{ backgroundColor: BRAND.blue, height: "4px", width: "33.33%" }} />
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* Header with brand wordmark */}
                    <tr>
                      <td style={{ padding: "28px 32px 16px", textAlign: "center", backgroundColor: BRAND.navy }}>
                        {/* YALLA + LDN badge */}
                        <div style={{ marginBottom: "12px" }}>
                          <span style={{ fontSize: "28px", fontWeight: 800, color: BRAND.white, fontFamily: headingFamily, letterSpacing: "-0.5px" }}>YALLA</span>
                          <span style={{ display: "inline-block", marginLeft: "8px", padding: "3px 10px", border: `2px solid ${BRAND.blue}`, borderRadius: "3px", fontSize: "12px", fontWeight: 600, color: BRAND.blue, fontFamily: headingFamily, letterSpacing: "3px" }}>LDN</span>
                        </div>
                        {/* Gold accent line */}
                        <div style={{ width: "40px", height: "2px", backgroundColor: BRAND.gold, margin: "0 auto 16px" }} />
                        <h1 style={{
                          margin: "0",
                          color: BRAND.gold,
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
                                      color: BRAND.blue,
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
                                    <a href={article.url} style={{ color: BRAND.navy, textDecoration: "none" }}>
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
                                    color: BRAND.red,
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
                          backgroundColor: BRAND.red,
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
                      <td style={{ padding: "20px 32px", backgroundColor: BRAND.navy, textAlign: "center" }}>
                        <p style={{ margin: "0 0 8px", color: "#999", fontSize: "12px", fontFamily }}>
                          Zenitha.Luxury LLC
                        </p>
                        {unsubscribeUrl && (
                          <a href={unsubscribeUrl} style={{ color: BRAND.gold, fontSize: "12px", fontFamily, textDecoration: "underline" }}>
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
