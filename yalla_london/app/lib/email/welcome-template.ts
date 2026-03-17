/**
 * Welcome Email Template
 *
 * Uses the design system brand provider to generate a branded welcome email
 * for new subscribers. Table-based layout for maximum email client compatibility
 * (Gmail, Outlook, Apple Mail, Yahoo). All styles are inline.
 *
 * Brand colors sourced from lib/design/destination-themes.ts via brand-provider.ts
 */

import { getBrandProfile, type BrandProfile } from "@/lib/design/brand-provider";
import { getDefaultSiteId, getSiteDomain } from "@/config/sites";
import { ENTITY } from "@/config/entity";

interface WelcomeEmailOptions {
  recipientName?: string;
  siteId?: string;
  language?: "en" | "ar";
  unsubscribeUrl?: string;
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderWelcomeEmail(options: WelcomeEmailOptions = {}): {
  html: string;
  plainText: string;
  subject: string;
} {
  const siteId = options.siteId || getDefaultSiteId();
  const brand = getBrandProfile(siteId);
  const lang = options.language || "en";
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const align = isAr ? "right" : "left";
  const name = options.recipientName
    ? escapeHtml(options.recipientName)
    : null;

  const domain = brand.domain || getSiteDomain(siteId).replace(/^https?:\/\//, "").replace(/^www\./, "");
  const siteUrl = `https://www.${domain}`;
  const unsubUrl = options.unsubscribeUrl || `${siteUrl}/unsubscribe`;

  const content = getContent(brand, name, siteUrl, unsubUrl, isAr);

  const html = buildHtml(brand, content, dir, align, siteUrl, unsubUrl, domain, isAr);
  const plainText = buildPlainText(brand, content, siteUrl, unsubUrl, isAr);
  const subject = isAr
    ? `مرحباً بك في ${brand.name}! 🎉`
    : `Welcome to ${brand.name}! 🎉`;

  return { html, plainText, subject };
}

// ─── Content by language ────────────────────────────────────────

interface EmailContent {
  greeting: string;
  headline: string;
  intro: string;
  features: Array<{ icon: string; title: string; desc: string }>;
  cta: string;
  ctaUrl: string;
  closing: string;
  footer: string;
  unsubscribe: string;
}

function getContent(
  brand: BrandProfile,
  name: string | null,
  siteUrl: string,
  unsubUrl: string,
  isAr: boolean,
): EmailContent {
  if (isAr) {
    return {
      greeting: name ? `مرحباً ${name}!` : "مرحباً بك!",
      headline: `أهلاً وسهلاً في ${brand.name}`,
      intro: `يسعدنا انضمامك إلينا. ستحصل على أفضل الأدلة الحصرية والنصائح لتخطيط رحلات لا تُنسى.`,
      features: [
        { icon: "🏨", title: "أفضل الفنادق", desc: "مراجعات حقيقية لأفضل الفنادق الفاخرة والحلال" },
        { icon: "🍽️", title: "أدلة الطعام", desc: "اكتشف أفضل المطاعم الحلال والمميزة" },
        { icon: "📍", title: "تجارب حصرية", desc: "نصائح من الداخل لا تجدها في أي مكان آخر" },
      ],
      cta: "اكتشف أحدث المقالات",
      ctaUrl: `${siteUrl}/blog`,
      closing: "نتمنى لك رحلات سعيدة!",
      footer: `© ${new Date().getFullYear()} ${ENTITY.legalName}. جميع الحقوق محفوظة.`,
      unsubscribe: "إلغاء الاشتراك",
    };
  }

  return {
    greeting: name ? `Hi ${name}!` : "Welcome!",
    headline: `Welcome to ${brand.name}`,
    intro: `We're thrilled to have you. You'll receive exclusive guides, insider tips, and curated recommendations to help you plan unforgettable trips.`,
    features: [
      { icon: "🏨", title: "Luxury Hotels", desc: "Honest reviews of the best luxury and halal-friendly hotels" },
      { icon: "🍽️", title: "Food Guides", desc: "Discover the finest halal restaurants and hidden gems" },
      { icon: "📍", title: "Insider Tips", desc: "Local recommendations you won't find anywhere else" },
    ],
    cta: "Explore Latest Articles",
    ctaUrl: `${siteUrl}/blog`,
    closing: "Happy travels!",
    footer: `© ${new Date().getFullYear()} ${ENTITY.legalName}. All rights reserved.`,
    unsubscribe: "Unsubscribe",
  };
}

// ─── HTML Builder ──────────────────────────────────────────────

function buildHtml(
  brand: BrandProfile,
  content: EmailContent,
  dir: string,
  align: string,
  siteUrl: string,
  unsubUrl: string,
  domain: string,
  isAr: boolean,
): string {
  const c = brand.colors;
  const fontFamily = isAr
    ? "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif"
    : "'Helvetica Neue', Helvetica, Arial, sans-serif";

  // Feature rows
  const featureRows = content.features
    .map(
      (f) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid ${c.background};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="48" style="vertical-align: top; padding-${isAr ? "left" : "right"}: 16px;">
                  <div style="width: 44px; height: 44px; border-radius: 12px; background: ${c.background}; text-align: center; line-height: 44px; font-size: 22px;">
                    ${f.icon}
                  </div>
                </td>
                <td style="vertical-align: top;">
                  <p style="margin: 0 0 2px; font-family: ${fontFamily}; font-size: 15px; font-weight: 700; color: ${c.text};">
                    ${escapeHtml(f.title)}
                  </p>
                  <p style="margin: 0; font-family: ${fontFamily}; font-size: 13px; color: ${c.textLight}; line-height: 1.5;">
                    ${escapeHtml(f.desc)}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="${isAr ? "ar" : "en"}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(content.headline)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${c.background}; font-family: ${fontFamily}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${c.background};">
    <tr>
      <td align="center" style="padding: 32px 16px;">

        <!-- Email container -->
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; width: 100%; background-color: ${c.surface}; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">

          <!-- Top accent bar — tricolor brand stripe -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height: 4px; background: ${c.primary}; width: 33.33%;"></td>
                  <td style="height: 4px; background: ${brand.colors.secondary}; width: 33.34%;"></td>
                  <td style="height: 4px; background: ${brand.colors.accent}; width: 33.33%;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Logo + brand header -->
          <tr>
            <td style="padding: 32px 40px 16px; text-align: center;">
              <h1 style="margin: 0; font-family: ${fontFamily}; font-size: 28px; font-weight: 800; color: ${c.primary}; letter-spacing: -0.5px;">
                ${escapeHtml(brand.name)}
              </h1>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 0 40px 8px; text-align: ${align};">
              <p style="margin: 0; font-family: ${fontFamily}; font-size: 22px; font-weight: 700; color: ${c.text};">
                ${content.greeting}
              </p>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding: 8px 40px 24px; text-align: ${align};">
              <p style="margin: 0; font-family: ${fontFamily}; font-size: 15px; color: ${c.textLight}; line-height: 1.7;">
                ${escapeHtml(content.intro)}
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <hr style="border: none; height: 1px; background: linear-gradient(90deg, ${c.primary}, ${brand.colors.secondary}, ${brand.colors.accent}); margin: 0;" />
            </td>
          </tr>

          <!-- What you'll get section -->
          <tr>
            <td style="padding: 24px 40px 8px; text-align: ${align};">
              <p style="margin: 0; font-family: ${fontFamily}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: ${brand.colors.secondary};">
                ${isAr ? "ماذا ستحصل عليه" : "What you'll get"}
              </p>
            </td>
          </tr>

          <!-- Features list -->
          <tr>
            <td style="padding: 8px 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${featureRows}
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 8px 40px 32px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 8px; background: ${c.primary};">
                    <a href="${escapeHtml(content.ctaUrl)}"
                       style="display: inline-block; padding: 14px 36px; font-family: ${fontFamily}; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 8px; letter-spacing: 0.3px;"
                       target="_blank">
                      ${escapeHtml(content.cta)} →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Closing -->
          <tr>
            <td style="padding: 0 40px 32px; text-align: ${align};">
              <p style="margin: 0; font-family: ${fontFamily}; font-size: 14px; color: ${c.textLight}; line-height: 1.6;">
                ${escapeHtml(content.closing)}<br />
                <span style="color: ${brand.colors.secondary}; font-weight: 600;">— ${isAr ? "فريق" : "The"} ${escapeHtml(brand.name)} ${isAr ? "" : "Team"}</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background: ${c.background}; border-top: 1px solid rgba(0,0,0,0.05); text-align: center;">
              <p style="margin: 0 0 8px; font-family: ${fontFamily}; font-size: 11px; color: ${c.textLight};">
                ${escapeHtml(content.footer)}
              </p>
              <p style="margin: 0; font-family: ${fontFamily}; font-size: 11px;">
                <a href="${escapeHtml(siteUrl)}" style="color: ${brand.colors.accent}; text-decoration: none;">${escapeHtml(domain)}</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="${escapeHtml(unsubUrl)}" style="color: ${c.textLight}; text-decoration: underline;">${escapeHtml(content.unsubscribe)}</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Email container -->

      </td>
    </tr>
  </table>
  <!-- /Outer wrapper -->

</body>
</html>`;
}

// ─── Plain Text Builder ────────────────────────────────────────

function buildPlainText(
  brand: BrandProfile,
  content: EmailContent,
  siteUrl: string,
  unsubUrl: string,
  isAr: boolean,
): string {
  const features = content.features
    .map((f) => `${f.icon} ${f.title}: ${f.desc}`)
    .join("\n");

  return [
    content.greeting,
    "",
    content.intro,
    "",
    isAr ? "ماذا ستحصل عليه:" : "What you'll get:",
    features,
    "",
    `${content.cta}: ${content.ctaUrl}`,
    "",
    content.closing,
    `— ${isAr ? "فريق" : "The"} ${brand.name} ${isAr ? "" : "Team"}`,
    "",
    "---",
    content.footer,
    siteUrl,
    `${content.unsubscribe}: ${unsubUrl}`,
  ].join("\n");
}
