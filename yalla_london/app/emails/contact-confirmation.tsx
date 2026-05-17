/**
 * Contact Form Confirmation Email — Bilingual EN/AR
 *
 * Auto-reply sent after contact form submission.
 */

import * as React from "react";

const BRAND = {
  red: "#C8322B", gold: "#C49A2A", blue: "#4A7BA8",
  navy: "#1C1917", cream: "#FAF8F4", text: "#333333",
  lightText: "#666666", border: "#E5E5E5", white: "#FFFFFF",
};

const FONTS = {
  heading: "'Source Serif 4', Georgia, serif",
  body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
  arabic: "'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif",
};

interface ContactConfirmationProps {
  name?: string;
  locale?: "en" | "ar";
  inquirySubject?: string;
  siteUrl?: string;
}

export default function ContactConfirmation({
  name = "there",
  locale = "en",
  inquirySubject = "",
  siteUrl = "https://www.yalla-london.com",
}: ContactConfirmationProps) {
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const fontFamily = isAr ? FONTS.arabic : FONTS.body;
  const headingFamily = isAr ? FONTS.arabic : FONTS.heading;

  const content = isAr
    ? {
        title: "تم استلام رسالتك",
        greeting: `مرحباً ${name}`,
        body1: "شكراً لتواصلك معنا! لقد استلمنا رسالتك وسنقوم بالرد عليك في أقرب وقت ممكن.",
        body2: "عادةً ما نرد خلال 24-48 ساعة عمل.",
        subject: inquirySubject ? `الموضوع: ${inquirySubject}` : "",
        faqCta: "تصفح أدلتنا",
        faqText: "بينما تنتظر ردنا، قد تجد إجابتك في أحدث مقالاتنا:",
      }
    : {
        title: "We've Received Your Message",
        greeting: `Hello ${name}`,
        body1: "Thank you for reaching out! We've received your inquiry and will get back to you as soon as possible.",
        body2: "We typically respond within 24-48 business hours.",
        subject: inquirySubject ? `Subject: ${inquirySubject}` : "",
        faqCta: "Browse Our Guides",
        faqText: "While you wait, you might find your answer in our latest articles:",
      };

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

                    {/* Content */}
                    <tr>
                      <td style={{ padding: "32px" }}>
                        <h1 style={{
                          margin: "0 0 16px", color: BRAND.navy, fontSize: "22px",
                          fontFamily: headingFamily, fontWeight: "600", lineHeight: "1.3", direction: dir,
                        }}>
                          {content.greeting}
                        </h1>
                        <p style={{
                          margin: "0 0 12px", color: BRAND.text, fontSize: "15px",
                          fontFamily, lineHeight: "1.7", direction: dir,
                        }}>
                          {content.body1}
                        </p>
                        {content.subject && (
                          <p style={{
                            margin: "0 0 12px", padding: "12px 16px",
                            backgroundColor: BRAND.cream, borderRadius: "4px",
                            color: BRAND.text, fontSize: "14px", fontFamily,
                            direction: dir, fontStyle: "italic",
                          }}>
                            {content.subject}
                          </p>
                        )}
                        <p style={{
                          margin: "0 0 24px", color: BRAND.lightText, fontSize: "14px",
                          fontFamily, lineHeight: "1.6", direction: dir,
                        }}>
                          {content.body2}
                        </p>

                        {/* Divider */}
                        <hr style={{ border: "none", borderTop: `1px solid ${BRAND.border}`, margin: "24px 0" }} />

                        <p style={{
                          margin: "0 0 12px", color: BRAND.text, fontSize: "14px",
                          fontFamily, lineHeight: "1.6", direction: dir,
                        }}>
                          {content.faqText}
                        </p>
                        <table cellPadding="0" cellSpacing="0" role="presentation">
                          <tbody><tr><td>
                            <a href={`${siteUrl}/blog`} style={{
                              display: "inline-block", padding: "10px 24px",
                              backgroundColor: BRAND.blue, color: BRAND.white,
                              fontSize: "14px", fontFamily, fontWeight: "600",
                              textDecoration: "none", borderRadius: "6px",
                            }}>
                              {content.faqCta}
                            </a>
                          </td></tr></tbody>
                        </table>
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
