/**
 * Booking Confirmation Email — Bilingual EN/AR
 *
 * Sent after Stripe payment for tours, transfers, or experiences.
 */

import * as React from "react";

const BRAND = {
  red: "#C8322B", gold: "#C49A2A", blue: "#4A7BA8",
  navy: "#1C1917", cream: "#FAF8F4", text: "#333333",
  lightText: "#666666", border: "#E5E5E5", white: "#FFFFFF",
  green: "#2D5A3D",
};

const FONTS = {
  heading: "'Source Serif 4', Georgia, serif",
  body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
  arabic: "'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif",
};

interface BookingDetail {
  label: string;
  value: string;
}

interface BookingConfirmationProps {
  name?: string;
  locale?: "en" | "ar";
  bookingName?: string;
  bookingDate?: string;
  guests?: number;
  totalPaid?: string;
  currency?: string;
  stripeReceiptUrl?: string;
  supportEmail?: string;
  details?: BookingDetail[];
  siteUrl?: string;
}

export default function BookingConfirmation({
  name = "there",
  locale = "en",
  bookingName = "London Experience",
  bookingDate = "",
  guests = 1,
  totalPaid = "0.00",
  currency = "GBP",
  stripeReceiptUrl,
  supportEmail = "hello@yalla-london.com",
  details = [],
  siteUrl = "https://www.yalla-london.com",
}: BookingConfirmationProps) {
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const fontFamily = isAr ? FONTS.arabic : FONTS.body;
  const headingFamily = isAr ? FONTS.arabic : FONTS.heading;

  const currencySymbol = currency === "GBP" ? "£" : currency === "AED" ? "AED " : `${currency} `;

  const content = isAr
    ? {
        title: "تأكيد الحجز",
        greeting: `مرحباً ${name}`,
        confirmed: "تم تأكيد حجزك بنجاح!",
        experience: "التجربة",
        date: "التاريخ",
        guestsLabel: "عدد الضيوف",
        total: "المبلغ المدفوع",
        receipt: "عرض الإيصال",
        calendar: "أضف إلى التقويم",
        support: "للاستفسارات أو التعديلات، تواصل معنا على:",
        enjoy: "نتمنى لك تجربة رائعة!",
      }
    : {
        title: "Booking Confirmation",
        greeting: `Hello ${name}`,
        confirmed: "Your booking has been confirmed!",
        experience: "Experience",
        date: "Date",
        guestsLabel: "Guests",
        total: "Total Paid",
        receipt: "View Receipt",
        calendar: "Add to Calendar",
        support: "For any questions or changes, contact us at:",
        enjoy: "We hope you have an amazing experience!",
      };

  // Build the booking details table
  const allDetails: BookingDetail[] = [
    { label: content.experience, value: bookingName },
    ...(bookingDate ? [{ label: content.date, value: bookingDate }] : []),
    { label: content.guestsLabel, value: String(guests) },
    { label: content.total, value: `${currencySymbol}${totalPaid}` },
    ...details,
  ];

  return (
    <html dir={dir} lang={isAr ? "ar" : "en"}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{content.title}</title>
      </head>
      <body style={{ margin: "0", padding: "0", backgroundColor: BRAND.cream, fontFamily }}>
        <table width="100%" cellPadding="0" cellSpacing="0" role="presentation" style={{ backgroundColor: BRAND.cream }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "24px 16px" }}>
                <table width="600" cellPadding="0" cellSpacing="0" role="presentation" style={{
                  maxWidth: "600px", width: "100%", backgroundColor: BRAND.white,
                  borderRadius: "8px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}>
                  <tbody>
                    {/* Tri-color bar */}
                    <tr>
                      <td>
                        <table width="100%" cellPadding="0" cellSpacing="0" role="presentation">
                          <tbody><tr>
                            <td style={{ backgroundColor: BRAND.red, height: "4px", width: "33.33%" }} />
                            <td style={{ backgroundColor: BRAND.gold, height: "4px", width: "33.34%" }} />
                            <td style={{ backgroundColor: BRAND.blue, height: "4px", width: "33.33%" }} />
                          </tr></tbody>
                        </table>
                      </td>
                    </tr>

                    {/* Success Banner */}
                    <tr>
                      <td style={{ padding: "24px 32px", backgroundColor: BRAND.green, textAlign: "center" }}>
                        <p style={{ margin: "0", color: BRAND.white, fontSize: "20px", fontFamily: headingFamily, fontWeight: "600" }}>
                          &#10003; {content.confirmed}
                        </p>
                      </td>
                    </tr>

                    {/* Body */}
                    <tr>
                      <td style={{ padding: "32px" }}>
                        <p style={{
                          margin: "0 0 20px", color: BRAND.text, fontSize: "16px",
                          fontFamily, lineHeight: "1.6", direction: dir,
                        }}>
                          {content.greeting},
                        </p>

                        {/* Details Table */}
                        <table width="100%" cellPadding="0" cellSpacing="0" role="presentation" style={{
                          margin: "0 0 24px", borderRadius: "6px", overflow: "hidden",
                          border: `1px solid ${BRAND.border}`,
                        }}>
                          <tbody>
                            {allDetails.map((detail, i) => (
                              <tr key={i}>
                                <td style={{
                                  padding: "12px 16px", width: "40%",
                                  backgroundColor: i % 2 === 0 ? BRAND.cream : BRAND.white,
                                  color: BRAND.lightText, fontSize: "13px", fontFamily,
                                  fontWeight: "600", direction: dir,
                                  borderBottom: i < allDetails.length - 1 ? `1px solid ${BRAND.border}` : "none",
                                }}>
                                  {detail.label}
                                </td>
                                <td style={{
                                  padding: "12px 16px",
                                  backgroundColor: i % 2 === 0 ? BRAND.cream : BRAND.white,
                                  color: BRAND.text, fontSize: "14px", fontFamily,
                                  fontWeight: i === allDetails.length - 1 ? "700" : "400",
                                  direction: dir,
                                  borderBottom: i < allDetails.length - 1 ? `1px solid ${BRAND.border}` : "none",
                                }}>
                                  {detail.value}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Action Buttons */}
                        <table width="100%" cellPadding="0" cellSpacing="0" role="presentation">
                          <tbody>
                            <tr>
                              {stripeReceiptUrl && (
                                <td align="center" style={{ padding: "0 8px 16px" }}>
                                  <a href={stripeReceiptUrl} style={{
                                    display: "inline-block", padding: "10px 20px",
                                    backgroundColor: BRAND.navy, color: BRAND.white,
                                    fontSize: "13px", fontFamily, fontWeight: "600",
                                    textDecoration: "none", borderRadius: "6px",
                                  }}>
                                    {content.receipt}
                                  </a>
                                </td>
                              )}
                            </tr>
                          </tbody>
                        </table>

                        <p style={{
                          margin: "16px 0 8px", color: BRAND.text, fontSize: "14px",
                          fontFamily, lineHeight: "1.6", direction: dir,
                        }}>
                          {content.enjoy}
                        </p>

                        <hr style={{ border: "none", borderTop: `1px solid ${BRAND.border}`, margin: "24px 0" }} />

                        <p style={{
                          margin: "0 0 4px", color: BRAND.lightText, fontSize: "13px",
                          fontFamily, direction: dir,
                        }}>
                          {content.support}
                        </p>
                        <a href={`mailto:${supportEmail}`} style={{
                          color: BRAND.blue, fontSize: "13px", fontFamily, textDecoration: "underline",
                        }}>
                          {supportEmail}
                        </a>
                      </td>
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td style={{ padding: "20px 32px", backgroundColor: BRAND.navy, textAlign: "center" }}>
                        <p style={{ margin: "0", color: "#999", fontSize: "12px", fontFamily }}>
                          Zenitha.Luxury LLC
                        </p>
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
