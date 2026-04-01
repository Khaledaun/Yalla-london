/**
 * Zenitha Yachts Monthly Newsletter — Bilingual EN/AR
 *
 * Monthly digest for charter leads and subscribers featuring:
 * - Featured yachts with specs and pricing
 * - New/seasonal destinations
 * - Last-minute charter deals
 * - Charter tips and insights
 *
 * Branded with Zenitha design tokens (navy, gold, teal, pearl).
 */

import * as React from "react";

// ---------------------------------------------------------------------------
// Brand Constants — Zenitha Yachts
// ---------------------------------------------------------------------------

const BRAND = {
  navy: "#0A1628",
  gold: "#C9A96E",
  teal: "#0EA5A2",
  pearl: "#FAFAF7",
  champagne: "#E8D5B5",
  sand: "#F5EDE0",
  coral: "#E07A5F",
  aegean: "#2E5A88",
  text: "#333333",
  lightText: "#666666",
  border: "#E5DDD0",
  white: "#FFFFFF",
};

const FONTS = {
  display: "'Playfair Display', 'Georgia', 'Times New Roman', serif",
  heading: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  body: "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  arabic: "'IBM Plex Sans Arabic', 'Noto Sans Arabic', Tahoma, Arial, sans-serif",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeaturedYacht {
  name: string;
  imageUrl?: string;
  url: string;
  length?: string;
  cabins?: number;
  guests?: number;
  priceFrom?: string;
  currency?: string;
  builder?: string;
}

interface Destination {
  name: string;
  url: string;
  imageUrl?: string;
  excerpt: string;
}

interface Deal {
  yachtName: string;
  url: string;
  originalPrice?: string;
  dealPrice: string;
  currency?: string;
  dates?: string;
  savings?: string;
}

interface CharterTip {
  title: string;
  body: string;
  url?: string;
}

export interface ZenithaMonthlyNewsletterProps {
  locale?: "en" | "ar";
  siteUrl?: string;
  unsubscribeUrl?: string;
  monthLabel?: string;
  recipientName?: string;
  featuredYachts?: FeaturedYacht[];
  destinations?: Destination[];
  deals?: Deal[];
  tips?: CharterTip[];
}

// ---------------------------------------------------------------------------
// Reusable section header
// ---------------------------------------------------------------------------

function SectionHeader({ title, fontFamily }: { title: string; fontFamily: string }) {
  return (
    <tr>
      <td style={{ padding: "32px 32px 16px" }}>
        <table width="100%" cellPadding="0" cellSpacing="0" role="presentation">
          <tbody>
            <tr>
              <td style={{ borderBottom: `2px solid ${BRAND.gold}`, paddingBottom: "8px" }}>
                <h2 style={{
                  margin: "0",
                  fontSize: "20px",
                  fontFamily,
                  fontWeight: "600",
                  color: BRAND.navy,
                  letterSpacing: "0.3px",
                }}>
                  {title}
                </h2>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Zenitha Monthly Newsletter
// ---------------------------------------------------------------------------

export default function ZenithaMonthlyNewsletter({
  locale = "en",
  siteUrl = "https://www.zenithayachts.com",
  unsubscribeUrl,
  monthLabel,
  recipientName,
  featuredYachts = [],
  destinations = [],
  deals = [],
  tips = [],
}: ZenithaMonthlyNewsletterProps) {
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const fontFamily = isAr ? FONTS.arabic : FONTS.body;
  const headingFamily = isAr ? FONTS.arabic : FONTS.display;
  const subheadingFamily = isAr ? FONTS.arabic : FONTS.heading;

  const label = monthLabel || (isAr ? "النشرة الشهرية" : "Monthly Charter Digest");
  const greeting = recipientName
    ? (isAr ? `مرحباً ${recipientName}،` : `Dear ${recipientName},`)
    : (isAr ? "مرحباً،" : "Dear Charter Enthusiast,");

  const t = {
    intro: isAr
      ? "إليك أحدث اليخوت والوجهات والعروض الحصرية لهذا الشهر."
      : "Here are the latest yachts, destinations, and exclusive offers this month.",
    featuredYachts: isAr ? "يخوت مميزة" : "Featured Yachts",
    newDestinations: isAr ? "وجهات جديدة" : "New Destinations",
    lastMinuteDeals: isAr ? "عروض اللحظة الأخيرة" : "Last-Minute Deals",
    charterTips: isAr ? "نصائح التأجير" : "Charter Tips",
    viewYacht: isAr ? "عرض اليخت" : "View Yacht",
    explore: isAr ? "استكشف" : "Explore",
    bookNow: isAr ? "احجز الآن" : "Book Now",
    readMore: isAr ? "اقرأ المزيد" : "Read More",
    browseFleet: isAr ? "تصفح الأسطول" : "Browse Full Fleet",
    from: isAr ? "من" : "From",
    meters: isAr ? "م" : "m",
    cabins: isAr ? "كبائن" : "cabins",
    guests: isAr ? "ضيوف" : "guests",
    was: isAr ? "كان" : "Was",
    save: isAr ? "وفر" : "Save",
    unsubscribe: isAr ? "إلغاء الاشتراك" : "Unsubscribe",
  };

  return (
    <html dir={dir} lang={isAr ? "ar" : "en"}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{label}</title>
      </head>
      <body style={{ margin: "0", padding: "0", backgroundColor: BRAND.pearl, fontFamily }}>
        <table width="100%" cellPadding="0" cellSpacing="0" role="presentation" style={{ backgroundColor: BRAND.pearl }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "24px 16px" }}>
                <table width="600" cellPadding="0" cellSpacing="0" role="presentation" style={{
                  maxWidth: "600px",
                  width: "100%",
                  backgroundColor: BRAND.white,
                  borderRadius: "8px",
                  overflow: "hidden",
                  boxShadow: "0 2px 12px rgba(10,22,40,0.08)",
                }}>
                  <tbody>
                    {/* Gold accent bar */}
                    <tr>
                      <td style={{ backgroundColor: BRAND.gold, height: "4px" }} />
                    </tr>

                    {/* Header */}
                    <tr>
                      <td style={{ padding: "40px 32px 24px", textAlign: "center", backgroundColor: BRAND.navy }}>
                        <p style={{
                          margin: "0 0 8px",
                          fontSize: "12px",
                          fontFamily: subheadingFamily,
                          fontWeight: "500",
                          color: BRAND.gold,
                          textTransform: "uppercase",
                          letterSpacing: isAr ? "0" : "2px",
                        }}>
                          Zenitha Yachts
                        </p>
                        <h1 style={{
                          margin: "0",
                          color: BRAND.white,
                          fontSize: "26px",
                          fontFamily: headingFamily,
                          fontWeight: "600",
                          letterSpacing: isAr ? "0" : "0.5px",
                        }}>
                          {label}
                        </h1>
                      </td>
                    </tr>

                    {/* Greeting & Intro */}
                    <tr>
                      <td style={{ padding: "28px 32px 8px" }}>
                        <p style={{
                          margin: "0 0 12px",
                          color: BRAND.navy,
                          fontSize: "16px",
                          fontFamily: subheadingFamily,
                          fontWeight: "600",
                          direction: dir,
                        }}>
                          {greeting}
                        </p>
                        <p style={{
                          margin: "0",
                          color: BRAND.text,
                          fontSize: "15px",
                          fontFamily,
                          lineHeight: "1.7",
                          direction: dir,
                        }}>
                          {t.intro}
                        </p>
                      </td>
                    </tr>

                    {/* ── Featured Yachts ── */}
                    {featuredYachts.length > 0 && (
                      <>
                        <SectionHeader title={t.featuredYachts} fontFamily={subheadingFamily} />
                        {featuredYachts.slice(0, 3).map((yacht, i) => (
                          <tr key={`yacht-${i}`}>
                            <td style={{ padding: "8px 32px 16px" }}>
                              <table width="100%" cellPadding="0" cellSpacing="0" role="presentation" style={{
                                borderRadius: "6px",
                                overflow: "hidden",
                                border: `1px solid ${BRAND.border}`,
                              }}>
                                <tbody>
                                  {yacht.imageUrl && (
                                    <tr>
                                      <td>
                                        <a href={yacht.url} style={{ textDecoration: "none" }}>
                                          <img
                                            src={yacht.imageUrl}
                                            alt={yacht.name}
                                            width="536"
                                            style={{
                                              display: "block",
                                              width: "100%",
                                              maxWidth: "536px",
                                              height: "auto",
                                              maxHeight: "220px",
                                              objectFit: "cover",
                                            }}
                                          />
                                        </a>
                                      </td>
                                    </tr>
                                  )}
                                  <tr>
                                    <td style={{ padding: "16px 20px", direction: dir }}>
                                      <h3 style={{
                                        margin: "0 0 8px",
                                        fontSize: "18px",
                                        fontFamily: headingFamily,
                                        fontWeight: "600",
                                        color: BRAND.navy,
                                      }}>
                                        <a href={yacht.url} style={{ color: BRAND.navy, textDecoration: "none" }}>
                                          {yacht.name}
                                        </a>
                                      </h3>
                                      <p style={{
                                        margin: "0 0 10px",
                                        color: BRAND.lightText,
                                        fontSize: "13px",
                                        fontFamily,
                                        lineHeight: "1.5",
                                      }}>
                                        {[
                                          yacht.length && `${yacht.length}${t.meters}`,
                                          yacht.cabins && `${yacht.cabins} ${t.cabins}`,
                                          yacht.guests && `${yacht.guests} ${t.guests}`,
                                          yacht.builder,
                                        ].filter(Boolean).join(" · ")}
                                      </p>
                                      <table width="100%" cellPadding="0" cellSpacing="0" role="presentation">
                                        <tbody>
                                          <tr>
                                            <td style={{ direction: dir }}>
                                              {yacht.priceFrom && (
                                                <span style={{
                                                  color: BRAND.teal,
                                                  fontSize: "15px",
                                                  fontFamily: subheadingFamily,
                                                  fontWeight: "600",
                                                }}>
                                                  {t.from} {yacht.currency || "€"}{yacht.priceFrom}/wk
                                                </span>
                                              )}
                                            </td>
                                            <td align={isAr ? "left" : "right"}>
                                              <a href={yacht.url} style={{
                                                display: "inline-block",
                                                padding: "8px 18px",
                                                backgroundColor: BRAND.navy,
                                                color: BRAND.gold,
                                                fontSize: "12px",
                                                fontFamily: subheadingFamily,
                                                fontWeight: "600",
                                                textDecoration: "none",
                                                borderRadius: "4px",
                                                textTransform: "uppercase",
                                                letterSpacing: isAr ? "0" : "0.5px",
                                              }}>
                                                {t.viewYacht}
                                              </a>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}

                    {/* ── Destinations ── */}
                    {destinations.length > 0 && (
                      <>
                        <SectionHeader title={t.newDestinations} fontFamily={subheadingFamily} />
                        {destinations.slice(0, 3).map((dest, i) => (
                          <tr key={`dest-${i}`}>
                            <td style={{ padding: "8px 32px 16px" }}>
                              <table width="100%" cellPadding="0" cellSpacing="0" role="presentation" style={{
                                borderRadius: "6px",
                                overflow: "hidden",
                                border: `1px solid ${BRAND.border}`,
                              }}>
                                <tbody>
                                  <tr>
                                    {dest.imageUrl && (
                                      <td width="160" style={{ verticalAlign: "top" }}>
                                        <a href={dest.url} style={{ textDecoration: "none" }}>
                                          <img
                                            src={dest.imageUrl}
                                            alt={dest.name}
                                            width="160"
                                            style={{
                                              display: "block",
                                              width: "160px",
                                              height: "120px",
                                              objectFit: "cover",
                                            }}
                                          />
                                        </a>
                                      </td>
                                    )}
                                    <td style={{ padding: "14px 18px", verticalAlign: "top", direction: dir }}>
                                      <h3 style={{
                                        margin: "0 0 6px",
                                        fontSize: "16px",
                                        fontFamily: subheadingFamily,
                                        fontWeight: "600",
                                        color: BRAND.navy,
                                      }}>
                                        <a href={dest.url} style={{ color: BRAND.navy, textDecoration: "none" }}>
                                          {dest.name}
                                        </a>
                                      </h3>
                                      <p style={{
                                        margin: "0 0 8px",
                                        color: BRAND.lightText,
                                        fontSize: "13px",
                                        fontFamily,
                                        lineHeight: "1.5",
                                      }}>
                                        {dest.excerpt}
                                      </p>
                                      <a href={dest.url} style={{
                                        color: BRAND.teal,
                                        fontSize: "12px",
                                        fontFamily: subheadingFamily,
                                        fontWeight: "600",
                                        textDecoration: "none",
                                      }}>
                                        {t.explore} {isAr ? "←" : "→"}
                                      </a>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}

                    {/* ── Last-Minute Deals ── */}
                    {deals.length > 0 && (
                      <>
                        <SectionHeader title={t.lastMinuteDeals} fontFamily={subheadingFamily} />
                        {deals.slice(0, 3).map((deal, i) => (
                          <tr key={`deal-${i}`}>
                            <td style={{ padding: "8px 32px 12px" }}>
                              <table width="100%" cellPadding="0" cellSpacing="0" role="presentation" style={{
                                borderRadius: "6px",
                                backgroundColor: BRAND.sand,
                                border: `1px solid ${BRAND.champagne}`,
                              }}>
                                <tbody>
                                  <tr>
                                    <td style={{ padding: "16px 20px", direction: dir }}>
                                      <h3 style={{
                                        margin: "0 0 6px",
                                        fontSize: "16px",
                                        fontFamily: subheadingFamily,
                                        fontWeight: "600",
                                        color: BRAND.navy,
                                      }}>
                                        {deal.yachtName}
                                      </h3>
                                      <p style={{
                                        margin: "0 0 8px",
                                        fontSize: "13px",
                                        fontFamily,
                                        color: BRAND.lightText,
                                      }}>
                                        {deal.dates && <span>{deal.dates} · </span>}
                                        {deal.originalPrice && (
                                          <span style={{ textDecoration: "line-through", color: BRAND.coral }}>
                                            {deal.currency || "€"}{deal.originalPrice}
                                          </span>
                                        )}
                                        {deal.originalPrice && " "}
                                        <span style={{ color: BRAND.teal, fontWeight: "700", fontSize: "15px" }}>
                                          {deal.currency || "€"}{deal.dealPrice}
                                        </span>
                                        {deal.savings && (
                                          <span style={{
                                            display: "inline-block",
                                            marginLeft: isAr ? "0" : "8px",
                                            marginRight: isAr ? "8px" : "0",
                                            padding: "2px 8px",
                                            backgroundColor: BRAND.coral,
                                            color: BRAND.white,
                                            fontSize: "11px",
                                            fontFamily: subheadingFamily,
                                            fontWeight: "600",
                                            borderRadius: "3px",
                                          }}>
                                            {t.save} {deal.savings}
                                          </span>
                                        )}
                                      </p>
                                      <a href={deal.url} style={{
                                        display: "inline-block",
                                        padding: "8px 20px",
                                        backgroundColor: BRAND.teal,
                                        color: BRAND.white,
                                        fontSize: "12px",
                                        fontFamily: subheadingFamily,
                                        fontWeight: "600",
                                        textDecoration: "none",
                                        borderRadius: "4px",
                                      }}>
                                        {t.bookNow}
                                      </a>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}

                    {/* ── Charter Tips ── */}
                    {tips.length > 0 && (
                      <>
                        <SectionHeader title={t.charterTips} fontFamily={subheadingFamily} />
                        {tips.slice(0, 2).map((tip, i) => (
                          <tr key={`tip-${i}`}>
                            <td style={{ padding: "8px 32px 12px" }}>
                              <table width="100%" cellPadding="0" cellSpacing="0" role="presentation" style={{
                                borderRadius: "6px",
                                border: `1px solid ${BRAND.border}`,
                              }}>
                                <tbody>
                                  <tr>
                                    <td style={{ padding: "16px 20px", direction: dir }}>
                                      <h3 style={{
                                        margin: "0 0 6px",
                                        fontSize: "15px",
                                        fontFamily: subheadingFamily,
                                        fontWeight: "600",
                                        color: BRAND.navy,
                                      }}>
                                        {tip.title}
                                      </h3>
                                      <p style={{
                                        margin: "0",
                                        color: BRAND.lightText,
                                        fontSize: "13px",
                                        fontFamily,
                                        lineHeight: "1.6",
                                      }}>
                                        {tip.body}
                                        {tip.url && (
                                          <>
                                            {" "}
                                            <a href={tip.url} style={{ color: BRAND.aegean, fontWeight: "600", textDecoration: "none" }}>
                                              {t.readMore} {isAr ? "←" : "→"}
                                            </a>
                                          </>
                                        )}
                                      </p>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}

                    {/* Browse Fleet CTA */}
                    <tr>
                      <td align="center" style={{ padding: "24px 32px 32px" }}>
                        <a href={`${siteUrl}/yachts`} style={{
                          display: "inline-block",
                          padding: "14px 32px",
                          backgroundColor: BRAND.gold,
                          color: BRAND.navy,
                          fontSize: "14px",
                          fontFamily: subheadingFamily,
                          fontWeight: "700",
                          textDecoration: "none",
                          borderRadius: "6px",
                          textTransform: "uppercase",
                          letterSpacing: isAr ? "0" : "1px",
                        }}>
                          {t.browseFleet}
                        </a>
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td style={{ padding: "24px 32px", backgroundColor: BRAND.navy, textAlign: "center" }}>
                        <p style={{ margin: "0 0 4px", color: BRAND.gold, fontSize: "13px", fontFamily: subheadingFamily, fontWeight: "600" }}>
                          Zenitha Yachts
                        </p>
                        <p style={{ margin: "0 0 12px", color: "#888", fontSize: "11px", fontFamily }}>
                          Zenitha.Luxury LLC
                        </p>
                        {unsubscribeUrl && (
                          <a href={unsubscribeUrl} style={{ color: BRAND.champagne, fontSize: "11px", fontFamily, textDecoration: "underline" }}>
                            {t.unsubscribe}
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
