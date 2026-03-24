/**
 * Welcome Email Template — Bilingual EN/AR
 *
 * Sent when a new subscriber signs up on any Zenitha site.
 * Uses email-safe table layout with Yalla London tri-color branding.
 */

import * as React from "react";

// ---------------------------------------------------------------------------
// Brand Constants
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
// Shared Components
// ---------------------------------------------------------------------------

function TriColorBar() {
  return (
    <table width="100%" cellPadding="0" cellSpacing="0" role="presentation">
      <tbody>
        <tr>
          <td style={{ backgroundColor: BRAND.red, height: "4px", width: "33.33%" }} />
          <td style={{ backgroundColor: BRAND.gold, height: "4px", width: "33.34%" }} />
          <td style={{ backgroundColor: BRAND.blue, height: "4px", width: "33.33%" }} />
        </tr>
      </tbody>
    </table>
  );
}

function Footer({ locale, unsubscribeUrl }: { locale: "en" | "ar"; unsubscribeUrl?: string }) {
  const isAr = locale === "ar";
  return (
    <table width="100%" cellPadding="0" cellSpacing="0" role="presentation">
      <tbody>
        <tr>
          <td style={{ padding: "24px 32px", backgroundColor: BRAND.navy, textAlign: "center" }}>
            <p style={{
              margin: "0 0 8px 0",
              color: "#999999",
              fontSize: "12px",
              fontFamily: isAr ? FONTS.arabic : FONTS.body,
              direction: isAr ? "rtl" : "ltr",
              lineHeight: "18px",
            }}>
              {isAr ? "Zenitha.Luxury LLC" : "Zenitha.Luxury LLC"}
            </p>
            <p style={{
              margin: "0 0 8px 0",
              color: "#999999",
              fontSize: "12px",
              fontFamily: isAr ? FONTS.arabic : FONTS.body,
              direction: isAr ? "rtl" : "ltr",
            }}>
              {isAr ? "ولمنغتون، ديلاوير، الولايات المتحدة" : "Wilmington, Delaware, USA"}
            </p>
            {unsubscribeUrl && (
              <p style={{ margin: "12px 0 0 0" }}>
                <a href={unsubscribeUrl} style={{
                  color: BRAND.gold,
                  fontSize: "12px",
                  fontFamily: isAr ? FONTS.arabic : FONTS.body,
                  textDecoration: "underline",
                }}>
                  {isAr ? "إلغاء الاشتراك" : "Unsubscribe"}
                </a>
              </p>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// Welcome Email
// ---------------------------------------------------------------------------

interface WelcomeEmailProps {
  name?: string;
  locale?: "en" | "ar";
  siteUrl?: string;
  unsubscribeUrl?: string;
}

export default function WelcomeEmail({
  name = "there",
  locale = "en",
  siteUrl = "https://www.yalla-london.com",
  unsubscribeUrl,
}: WelcomeEmailProps) {
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const fontFamily = isAr ? FONTS.arabic : FONTS.body;
  const headingFamily = isAr ? FONTS.arabic : FONTS.heading;

  const content = isAr
    ? {
        greeting: `مرحباً ${name}!`,
        title: "أهلاً بك في يالا لندن",
        subtitle: "دليلك الفاخر للسفر في لندن",
        body1: "شكراً لانضمامك إلى مجتمع يالا لندن. نحن هنا لنقدم لك أفضل التجارب الفاخرة في لندن — من المطاعم الحلال الراقية إلى الفنادق الفخمة والتجارب الثقافية الفريدة.",
        body2: "كل أسبوع، ستتلقى أحدث الأدلة والنصائح المختارة بعناية لمساعدتك في اكتشاف أفضل ما في لندن.",
        cta: "استكشف أحدث المقالات",
        features: [
          "أدلة مطاعم حلال فاخرة",
          "مراجعات فنادق 5 نجوم",
          "تجارب ثقافية وترفيهية",
          "نصائح حصرية للمسافرين العرب",
        ],
      }
    : {
        greeting: `Hello ${name}!`,
        title: "Welcome to Yalla London",
        subtitle: "Your luxury guide to London travel",
        body1: "Thank you for joining the Yalla London community. We're here to bring you the finest luxury experiences London has to offer — from exquisite halal dining to five-star hotels and unforgettable cultural experiences.",
        body2: "Each week, you'll receive our latest curated guides and insider tips to help you discover the best of London.",
        cta: "Explore Latest Articles",
        features: [
          "Luxury halal restaurant guides",
          "5-star hotel reviews",
          "Cultural & entertainment experiences",
          "Exclusive tips for Arab travellers",
        ],
      };

  return (
    <html dir={dir} lang={isAr ? "ar" : "en"}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{content.title}</title>
      </head>
      <body style={{
        margin: "0",
        padding: "0",
        backgroundColor: BRAND.cream,
        fontFamily,
      }}>
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
                    <tr><td><TriColorBar /></td></tr>

                    {/* Header */}
                    <tr>
                      <td style={{
                        padding: "40px 32px 24px",
                        textAlign: "center",
                        backgroundColor: BRAND.navy,
                      }}>
                        <h1 style={{
                          margin: "0 0 8px 0",
                          color: BRAND.gold,
                          fontSize: "28px",
                          fontFamily: headingFamily,
                          fontWeight: "600",
                          letterSpacing: isAr ? "0" : "0.5px",
                          lineHeight: "1.3",
                        }}>
                          {content.title}
                        </h1>
                        <p style={{
                          margin: "0",
                          color: "#cccccc",
                          fontSize: "14px",
                          fontFamily,
                          lineHeight: "1.5",
                        }}>
                          {content.subtitle}
                        </p>
                      </td>
                    </tr>

                    {/* Body */}
                    <tr>
                      <td style={{ padding: "32px" }}>
                        <p style={{
                          margin: "0 0 16px 0",
                          color: BRAND.text,
                          fontSize: "20px",
                          fontFamily: headingFamily,
                          fontWeight: "600",
                          direction: dir,
                          lineHeight: "1.4",
                        }}>
                          {content.greeting}
                        </p>
                        <p style={{
                          margin: "0 0 16px 0",
                          color: BRAND.text,
                          fontSize: "15px",
                          fontFamily,
                          lineHeight: "1.7",
                          direction: dir,
                        }}>
                          {content.body1}
                        </p>
                        <p style={{
                          margin: "0 0 24px 0",
                          color: BRAND.text,
                          fontSize: "15px",
                          fontFamily,
                          lineHeight: "1.7",
                          direction: dir,
                        }}>
                          {content.body2}
                        </p>

                        {/* Features */}
                        <table width="100%" cellPadding="0" cellSpacing="0" role="presentation" style={{
                          margin: "0 0 24px 0",
                          backgroundColor: BRAND.cream,
                          borderRadius: "6px",
                        }}>
                          <tbody>
                            {content.features.map((feature, i) => (
                              <tr key={i}>
                                <td style={{
                                  padding: "10px 16px",
                                  borderBottom: i < content.features.length - 1 ? `1px solid ${BRAND.border}` : "none",
                                  color: BRAND.text,
                                  fontSize: "14px",
                                  fontFamily,
                                  direction: dir,
                                  lineHeight: "1.5",
                                }}>
                                  {isAr ? "◀" : "▶"} {feature}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* CTA Button */}
                        <table width="100%" cellPadding="0" cellSpacing="0" role="presentation">
                          <tbody>
                            <tr>
                              <td align="center" style={{ padding: "8px 0 16px" }}>
                                <a
                                  href={`${siteUrl}/blog`}
                                  style={{
                                    display: "inline-block",
                                    padding: "14px 32px",
                                    backgroundColor: BRAND.red,
                                    color: BRAND.white,
                                    fontSize: "15px",
                                    fontFamily,
                                    fontWeight: "600",
                                    textDecoration: "none",
                                    borderRadius: "6px",
                                    lineHeight: "1",
                                  }}
                                >
                                  {content.cta}
                                </a>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr><td><Footer locale={locale} unsubscribeUrl={unsubscribeUrl} /></td></tr>
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
