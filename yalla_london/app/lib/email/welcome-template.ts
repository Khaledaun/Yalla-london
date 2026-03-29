/**
 * Welcome Email Template
 *
 * Professional branded welcome email for new subscribers.
 * Table-based layout for maximum email client compatibility
 * (Gmail, Outlook, Apple Mail, Yahoo). All styles are inline.
 *
 * Uses real brand assets: logo PNG, hero photography, branded color palette.
 * No emojis — luxury brand standard.
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
  /** Override the hero image URL (defaults to site hero photography) */
  heroImageUrl?: string;
  /** Override the logo image URL (defaults to site PNG stamp) */
  logoUrl?: string;
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

/**
 * Site-specific hero images and logo paths.
 * All paths are relative to the site root (public/).
 */
const SITE_HERO_IMAGES: Record<string, string> = {
  "yalla-london": "/images/hero/tower-bridge.jpg",
  "arabaldives": "/images/hero/tower-bridge.jpg", // placeholder until Maldives photos added
  "french-riviera": "/images/hero/tower-bridge.jpg",
  "istanbul": "/images/hero/tower-bridge.jpg",
  "thailand": "/images/hero/tower-bridge.jpg",
  "zenitha-yachts-med": "/images/hero/tower-bridge.jpg",
};

const SITE_LOGO_IMAGES: Record<string, string> = {
  "yalla-london": "/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-stamp-200px.png",
  "arabaldives": "/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-stamp-200px.png",
  "french-riviera": "/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-stamp-200px.png",
  "istanbul": "/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-stamp-200px.png",
  "thailand": "/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-stamp-200px.png",
  "zenitha-yachts-med": "/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-stamp-200px.png",
};

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

  const heroImageUrl = options.heroImageUrl
    || `${siteUrl}${SITE_HERO_IMAGES[siteId] || "/images/hero/tower-bridge.jpg"}`;

  const logoUrl = options.logoUrl
    || `${siteUrl}${SITE_LOGO_IMAGES[siteId] || "/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-stamp-200px.png"}`;

  const html = buildHtml(brand, content, dir, align, siteUrl, unsubUrl, domain, isAr, heroImageUrl, logoUrl);
  const plainText = buildPlainText(brand, content, siteUrl, unsubUrl, isAr);

  // Professional subject — no emojis for luxury brand
  const subject = isAr
    ? `مرحباً بك في ${brand.name}`
    : `Welcome to ${brand.name}`;

  return { html, plainText, subject };
}

// ─── Content by language ────────────────────────────────────────

interface EmailContent {
  greeting: string;
  headline: string;
  intro: string;
  features: Array<{ initial: string; title: string; desc: string }>;
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
  _unsubUrl: string,
  isAr: boolean,
): EmailContent {
  if (isAr) {
    return {
      greeting: name ? `مرحباً ${name}،` : "مرحباً بك،",
      headline: `أهلاً وسهلاً في ${brand.name}`,
      intro: `يسعدنا انضمامك إلينا. ستحصل على أفضل الأدلة الحصرية والنصائح المحلية لتخطيط رحلات فاخرة لا تُنسى.`,
      features: [
        { initial: "H", title: "أفضل الفنادق", desc: "مراجعات حقيقية لأفضل الفنادق الفاخرة والحلال" },
        { initial: "D", title: "أدلة الطعام", desc: "اكتشف أفضل المطاعم الحلال والمميزة في المدينة" },
        { initial: "E", title: "تجارب حصرية", desc: "نصائح من الداخل وتوصيات محلية لا تجدها في أي مكان آخر" },
      ],
      cta: "اكتشف أحدث المقالات",
      ctaUrl: `${siteUrl}/blog`,
      closing: "نتمنى لك رحلات سعيدة،",
      footer: `© ${new Date().getFullYear()} ${ENTITY.legalName}. جميع الحقوق محفوظة.`,
      unsubscribe: "إلغاء الاشتراك",
    };
  }

  return {
    greeting: name ? `Hi ${name},` : "Welcome,",
    headline: `Welcome to ${brand.name}`,
    intro: `We're delighted to have you. You'll receive curated guides, insider recommendations, and expert tips to help you plan extraordinary trips.`,
    features: [
      { initial: "H", title: "Luxury Hotels", desc: "Honest reviews of the finest luxury and halal-friendly hotels" },
      { initial: "D", title: "Dining Guides", desc: "Discover the best halal restaurants and hidden culinary gems" },
      { initial: "E", title: "Exclusive Experiences", desc: "Local insider tips and recommendations you won't find anywhere else" },
    ],
    cta: "Explore Latest Articles",
    ctaUrl: `${siteUrl}/blog`,
    closing: "Happy travels,",
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
  heroImageUrl: string,
  logoUrl: string,
): string {
  const c = brand.colors;
  const fontFamily = isAr
    ? "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif"
    : "'Helvetica Neue', Helvetica, Arial, sans-serif";

  // Feature rows — branded colored circles with initials, no emojis
  const featureColors = [c.primary, brand.colors.secondary, brand.colors.accent];
  const featureRows = content.features
    .map(
      (f, i) => `
        <tr>
          <td style="padding: 14px 0; ${i < content.features.length - 1 ? `border-bottom: 1px solid rgba(0,0,0,0.06);` : ""}">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="52" style="vertical-align: top; padding-${isAr ? "left" : "right"}: 16px;">
                  <div style="width: 44px; height: 44px; border-radius: 50%; background: ${featureColors[i % featureColors.length]}; text-align: center; line-height: 44px; font-size: 18px; font-weight: 700; color: #FFFFFF; font-family: ${fontFamily};">
                    ${f.initial}
                  </div>
                </td>
                <td style="vertical-align: top;">
                  <p style="margin: 0 0 2px; font-family: ${fontFamily}; font-size: 15px; font-weight: 700; color: ${c.text};">
                    ${escapeHtml(f.title)}
                  </p>
                  <p style="margin: 0; font-family: ${fontFamily}; font-size: 13px; color: #6B7280; line-height: 1.5;">
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
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: ${fontFamily}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F3F4F6;">
    <tr>
      <td align="center" style="padding: 32px 16px;">

        <!-- Email container -->
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; width: 100%; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Hero image — real photography -->
          <tr>
            <td style="padding: 0; text-align: center; position: relative;">
              <a href="${escapeHtml(siteUrl)}" target="_blank" style="display: block; text-decoration: none;">
                <img src="${escapeHtml(heroImageUrl)}"
                     width="580"
                     alt="${escapeHtml(brand.name)}"
                     style="display: block; width: 100%; max-width: 580px; height: auto; min-height: 200px; border: 0; outline: none; text-decoration: none; object-fit: cover;"
                />
              </a>
            </td>
          </tr>

          <!-- Logo + brand name row -->
          <tr>
            <td style="padding: 28px 40px 4px; text-align: center;">
              <a href="${escapeHtml(siteUrl)}" target="_blank" style="text-decoration: none;">
                <img src="${escapeHtml(logoUrl)}"
                     width="64" height="64"
                     alt="${escapeHtml(brand.name)} logo"
                     style="display: inline-block; width: 64px; height: 64px; border: 0; outline: none; border-radius: 50%;"
                />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 40px 0; text-align: center;">
              <p style="margin: 0; font-family: ${fontFamily}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; color: ${brand.colors.secondary};">
                ${escapeHtml(brand.name)}
              </p>
            </td>
          </tr>

          <!-- Thin accent line -->
          <tr>
            <td style="padding: 16px 40px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height: 2px; background: ${c.primary}; width: 33.33%;"></td>
                  <td style="height: 2px; background: ${brand.colors.secondary}; width: 33.34%;"></td>
                  <td style="height: 2px; background: ${brand.colors.accent}; width: 33.33%;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 24px 40px 8px; text-align: ${align};">
              <p style="margin: 0; font-family: ${fontFamily}; font-size: 22px; font-weight: 700; color: ${c.text};">
                ${content.greeting}
              </p>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding: 4px 40px 24px; text-align: ${align};">
              <p style="margin: 0; font-family: ${fontFamily}; font-size: 15px; color: #4B5563; line-height: 1.7;">
                ${escapeHtml(content.intro)}
              </p>
            </td>
          </tr>

          <!-- Section heading -->
          <tr>
            <td style="padding: 0 40px 8px; text-align: ${align};">
              <p style="margin: 0; font-family: ${fontFamily}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: ${brand.colors.secondary};">
                ${isAr ? "ماذا ستحصل عليه" : "What you'll get"}
              </p>
            </td>
          </tr>

          <!-- Features list — branded circles, no emojis -->
          <tr>
            <td style="padding: 4px 40px 24px;">
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
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeHtml(content.ctaUrl)}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="17%" strokecolor="${c.primary}" fillcolor="${c.primary}">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">${escapeHtml(content.cta)}</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${escapeHtml(content.ctaUrl)}"
                       style="display: inline-block; padding: 14px 40px; font-family: ${fontFamily}; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 8px; letter-spacing: 0.3px;"
                       target="_blank">
                      ${escapeHtml(content.cta)}
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Closing -->
          <tr>
            <td style="padding: 0 40px 28px; text-align: ${align};">
              <p style="margin: 0; font-family: ${fontFamily}; font-size: 14px; color: #6B7280; line-height: 1.6;">
                ${escapeHtml(content.closing)}<br />
                <strong style="color: ${c.text};">${isAr ? "فريق" : "The"} ${escapeHtml(brand.name)} ${isAr ? "" : "Team"}</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background: #F9FAFB; border-top: 1px solid #E5E7EB; text-align: center;">
              <p style="margin: 0 0 6px; font-family: ${fontFamily}; font-size: 11px; color: #9CA3AF;">
                ${escapeHtml(content.footer)}
              </p>
              <p style="margin: 0; font-family: ${fontFamily}; font-size: 11px;">
                <a href="${escapeHtml(siteUrl)}" style="color: ${brand.colors.accent}; text-decoration: none;">${escapeHtml(domain)}</a>
                &nbsp;&nbsp;&middot;&nbsp;&nbsp;
                <a href="${escapeHtml(unsubUrl)}" style="color: #9CA3AF; text-decoration: underline;">${escapeHtml(content.unsubscribe)}</a>
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
    .map((f) => `• ${f.title}: ${f.desc}`)
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
