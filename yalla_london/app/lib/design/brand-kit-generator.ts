/**
 * Brand Kit Generator
 *
 * Generates downloadable brand kits for any of the 5 sites under Zenitha.Luxury LLC.
 * Each kit includes: color palette (hex/rgb/hsl), typography specs, SVG logos,
 * social media templates, and a brand-guide.html overview.
 *
 * Usage:
 *   const kit = generateBrandKit("yalla-london");
 *   const zip = await generateBrandKitZip("yalla-london");
 */

import { getBrandProfile, type BrandProfile } from "@/lib/design/brand-provider";
import {
  getDestinationTheme,
  type DestinationTheme,
} from "@/lib/design/destination-themes";

// ─── Public Interfaces ──────────────────────────────────────────

export interface ColorEntry {
  name: string;
  hex: string;
  rgb: string;
  hsl: string;
}

export interface TypographyEntry {
  font: string;
  weight: number;
  usage: string;
}

export interface LogoSvgEntry {
  name: string;
  svg: string;
}

export interface SocialTemplateEntry {
  platform: string;
  width: number;
  height: number;
  svg: string;
}

export interface BrandKitAssets {
  colorPalette: ColorEntry[];
  typography: TypographyEntry[];
  logoSvgs: LogoSvgEntry[];
  socialTemplates: SocialTemplateEntry[];
}

// ─── Color Conversion Helpers ───────────────────────────────────

function hexToRgb(hex: string): string {
  const cleaned = hex.replace("#", "");
  const bigint = parseInt(cleaned, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgbValues(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace("#", "");
  const bigint = parseInt(cleaned, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function hexToHsl(hex: string): string {
  const { r: rRaw, g: gRaw, b: bRaw } = hexToRgbValues(hex);
  const r = rRaw / 255;
  const g = gRaw / 255;
  const b = bRaw / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return `hsl(0, 0%, ${Math.round(l * 100)}%)`;
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    h = ((b - r) / d + 2) / 6;
  } else {
    h = ((r - g) / d + 4) / 6;
  }

  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

// ─── Color Palette Builder ──────────────────────────────────────

function buildColorPalette(brand: BrandProfile, theme: DestinationTheme): ColorEntry[] {
  const colorMap: { name: string; hex: string }[] = [
    { name: "Primary", hex: theme.colors.primary },
    { name: "Primary Light", hex: theme.colors.primaryLight },
    { name: "Primary Dark", hex: theme.colors.primaryDark },
    { name: "Secondary", hex: theme.colors.secondary },
    { name: "Secondary Light", hex: theme.colors.secondaryLight },
    { name: "Accent", hex: theme.colors.accent },
    { name: "Background", hex: theme.colors.background },
    { name: "Surface", hex: theme.colors.surface },
    { name: "Text", hex: theme.colors.text },
    { name: "Text Muted", hex: theme.colors.textMuted },
    { name: "Text on Primary", hex: theme.colors.textOnPrimary },
    { name: "Text on Secondary", hex: theme.colors.textOnSecondary },
    { name: "Border", hex: theme.colors.border },
    { name: "Success", hex: theme.colors.success },
    { name: "Warning", hex: theme.colors.warning },
    { name: "Error", hex: theme.colors.error },
  ];

  // Deduplicate by hex value (some themes share colors between roles)
  const seen = new Set<string>();
  const palette: ColorEntry[] = [];
  for (const { name, hex } of colorMap) {
    const normalizedHex = hex.toUpperCase();
    if (!seen.has(normalizedHex)) {
      seen.add(normalizedHex);
      palette.push({
        name,
        hex: normalizedHex,
        rgb: hexToRgb(hex),
        hsl: hexToHsl(hex),
      });
    } else {
      // Still include it — different semantic name, same color
      palette.push({
        name,
        hex: normalizedHex,
        rgb: hexToRgb(hex),
        hsl: hexToHsl(hex),
      });
    }
  }

  return palette;
}

// ─── Typography Builder ─────────────────────────────────────────

function buildTypography(brand: BrandProfile, theme: DestinationTheme): TypographyEntry[] {
  const entries: TypographyEntry[] = [];

  // Heading font — all weights
  for (const w of brand.fonts.heading.weights) {
    entries.push({
      font: brand.fonts.heading.name,
      weight: w,
      usage: w === theme.typography.headingWeight
        ? "Headings (H1-H6) — primary weight"
        : `Headings — ${w >= 700 ? "bold" : "semi-bold"} variant`,
    });
  }

  // Body font — all weights
  for (const w of brand.fonts.body.weights) {
    entries.push({
      font: brand.fonts.body.name,
      weight: w,
      usage: w === theme.typography.bodyWeight
        ? "Body text — primary weight"
        : w >= 600
          ? "Body text — emphasis/strong"
          : "Body text — medium variant",
    });
  }

  // Arabic font — all weights
  for (const w of brand.fonts.arabic.weights) {
    entries.push({
      font: brand.fonts.arabic.name,
      weight: w,
      usage: w === 700
        ? "Arabic headings"
        : w === 500
          ? "Arabic body — medium"
          : "Arabic body — regular",
    });
  }

  // Display font (if different from heading)
  if (theme.typography.displayFont !== theme.typography.headingFont) {
    entries.push({
      font: theme.typography.displayFont,
      weight: theme.typography.headingWeight,
      usage: "Display / hero text — large decorative headings",
    });
  }

  return entries;
}

// ─── SVG Logo Generator ─────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateTextLogo(
  name: string,
  primaryColor: string,
  secondaryColor: string,
  font: string,
): string {
  const escapedName = escapeXml(name);
  const width = Math.max(300, name.length * 28);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 80" width="${width}" height="80">
  <defs>
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${secondaryColor};stop-opacity:1" />
    </linearGradient>
  </defs>
  <text x="50%" y="55" text-anchor="middle" dominant-baseline="middle"
    font-family="'${escapeXml(font)}', sans-serif" font-size="42" font-weight="700"
    fill="url(#textGrad)">${escapedName}</text>
</svg>`;
}

function generateIconLogo(
  name: string,
  primaryColor: string,
  secondaryColor: string,
  font: string,
): string {
  const initial = name.charAt(0).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${secondaryColor};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="120" height="120" rx="24" ry="24" fill="url(#iconGrad)" />
  <text x="60" y="62" text-anchor="middle" dominant-baseline="middle"
    font-family="'${escapeXml(font)}', sans-serif" font-size="64" font-weight="800"
    fill="#FFFFFF">${escapeXml(initial)}</text>
</svg>`;
}

function generateHorizontalLogo(
  name: string,
  primaryColor: string,
  secondaryColor: string,
  accentColor: string,
  font: string,
): string {
  const initial = name.charAt(0).toUpperCase();
  const escapedName = escapeXml(name);
  const textWidth = Math.max(200, name.length * 22);
  const totalWidth = 60 + 16 + textWidth;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} 60" width="${totalWidth}" height="60">
  <defs>
    <linearGradient id="hIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${secondaryColor};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect x="0" y="4" width="52" height="52" rx="12" ry="12" fill="url(#hIconGrad)" />
  <text x="26" y="32" text-anchor="middle" dominant-baseline="middle"
    font-family="'${escapeXml(font)}', sans-serif" font-size="30" font-weight="800"
    fill="#FFFFFF">${escapeXml(initial)}</text>
  <text x="68" y="38" dominant-baseline="middle"
    font-family="'${escapeXml(font)}', sans-serif" font-size="28" font-weight="700"
    fill="${primaryColor}">${escapedName}</text>
  <line x1="68" y1="48" x2="${68 + textWidth - 20}" y2="48"
    stroke="${accentColor}" stroke-width="2" stroke-linecap="round" />
</svg>`;
}

function generateLightLogo(
  name: string,
  backgroundColor: string,
  font: string,
): string {
  const escapedName = escapeXml(name);
  const width = Math.max(300, name.length * 28);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 80" width="${width}" height="80">
  <text x="50%" y="55" text-anchor="middle" dominant-baseline="middle"
    font-family="'${escapeXml(font)}', sans-serif" font-size="42" font-weight="700"
    fill="#FFFFFF">${escapedName}</text>
</svg>`;
}

function buildLogoSvgs(brand: BrandProfile, theme: DestinationTheme): LogoSvgEntry[] {
  const name = brand.name;
  const primary = theme.colors.primary;
  const secondary = theme.colors.secondary;
  const accent = theme.colors.accent;
  const font = theme.typography.headingFont;

  return [
    {
      name: "logo-text",
      svg: generateTextLogo(name, primary, secondary, font),
    },
    {
      name: "logo-icon",
      svg: generateIconLogo(name, primary, secondary, font),
    },
    {
      name: "logo-horizontal",
      svg: generateHorizontalLogo(name, primary, secondary, accent, font),
    },
    {
      name: "logo-light",
      svg: generateLightLogo(name, theme.colors.background, font),
    },
  ];
}

// ─── Social Media Template Generator ────────────────────────────

interface SocialPlatformSpec {
  platform: string;
  width: number;
  height: number;
}

const SOCIAL_PLATFORMS: SocialPlatformSpec[] = [
  { platform: "Instagram Post", width: 1080, height: 1080 },
  { platform: "Instagram Story", width: 1080, height: 1920 },
  { platform: "Twitter/X Post", width: 1600, height: 900 },
  { platform: "Facebook Cover", width: 820, height: 312 },
  { platform: "LinkedIn Post", width: 1200, height: 627 },
  { platform: "YouTube Thumbnail", width: 1280, height: 720 },
];

function generateSocialTemplate(
  spec: SocialPlatformSpec,
  brand: BrandProfile,
  theme: DestinationTheme,
): SocialTemplateEntry {
  const { platform, width, height } = spec;
  const primary = theme.colors.primary;
  const secondary = theme.colors.secondary;
  const accent = theme.colors.accent;
  const textOnPrimary = theme.colors.textOnPrimary;
  const font = theme.typography.headingFont;
  const bodyFont = theme.typography.bodyFont;
  const escapedName = escapeXml(brand.name);
  const escapedTagline = escapeXml(theme.tagline);

  // Logo area dimensions
  const logoSize = Math.round(Math.min(width, height) * 0.12);
  const logoX = Math.round(width * 0.06);
  const logoY = Math.round(height * 0.06);

  // Title area
  const titleFontSize = Math.round(Math.min(width, height) * 0.07);
  const subtitleFontSize = Math.round(titleFontSize * 0.5);
  const titleY = Math.round(height * 0.55);
  const subtitleY = titleY + titleFontSize + Math.round(height * 0.03);

  // CTA area
  const ctaWidth = Math.round(width * 0.35);
  const ctaHeight = Math.round(Math.min(width, height) * 0.07);
  const ctaX = Math.round(width * 0.06);
  const ctaY = Math.round(height * 0.82);
  const ctaFontSize = Math.round(ctaHeight * 0.45);

  // Decorative bar
  const barHeight = Math.round(height * 0.006);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg-${platform.replace(/[^a-zA-Z]/g, "")}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${primary};stop-opacity:1" />
      <stop offset="60%" style="stop-color:${theme.colors.primaryDark};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${secondary};stop-opacity:0.8" />
    </linearGradient>
    <linearGradient id="cta-${platform.replace(/[^a-zA-Z]/g, "")}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${accent};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${secondary};stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bg-${platform.replace(/[^a-zA-Z]/g, "")})" />

  <!-- Decorative accent bar at top -->
  <rect x="0" y="0" width="${width}" height="${barHeight}" fill="${accent}" />

  <!-- Logo mark -->
  <rect x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" rx="${Math.round(logoSize * 0.2)}"
    fill="rgba(255,255,255,0.15)" />
  <text x="${logoX + logoSize / 2}" y="${logoY + logoSize / 2 + 2}" text-anchor="middle" dominant-baseline="middle"
    font-family="'${escapeXml(font)}', sans-serif" font-size="${Math.round(logoSize * 0.55)}" font-weight="800"
    fill="${textOnPrimary}">${escapeXml(brand.name.charAt(0))}</text>

  <!-- Site name next to logo -->
  <text x="${logoX + logoSize + 12}" y="${logoY + logoSize / 2 + 2}" dominant-baseline="middle"
    font-family="'${escapeXml(font)}', sans-serif" font-size="${Math.round(logoSize * 0.35)}" font-weight="700"
    fill="${textOnPrimary}" opacity="0.9">${escapedName}</text>

  <!-- Placeholder image area indicator -->
  <rect x="${Math.round(width * 0.06)}" y="${Math.round(height * 0.22)}"
    width="${Math.round(width * 0.88)}" height="${Math.round(height * 0.25)}"
    rx="8" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1" stroke-dasharray="8 4" />
  <text x="${width / 2}" y="${Math.round(height * 0.35)}" text-anchor="middle" dominant-baseline="middle"
    font-family="'${escapeXml(bodyFont)}', sans-serif" font-size="${Math.round(subtitleFontSize * 0.7)}"
    fill="rgba(255,255,255,0.3)">[ Image Placeholder ]</text>

  <!-- Title text area -->
  <text x="${Math.round(width * 0.06)}" y="${titleY}"
    font-family="'${escapeXml(font)}', sans-serif" font-size="${titleFontSize}" font-weight="700"
    fill="${textOnPrimary}">Your Headline Here</text>

  <!-- Subtitle / tagline -->
  <text x="${Math.round(width * 0.06)}" y="${subtitleY}"
    font-family="'${escapeXml(bodyFont)}', sans-serif" font-size="${subtitleFontSize}" font-weight="400"
    fill="${textOnPrimary}" opacity="0.8">${escapedTagline}</text>

  <!-- CTA button -->
  <rect x="${ctaX}" y="${ctaY}" width="${ctaWidth}" height="${ctaHeight}" rx="${Math.round(ctaHeight / 2)}"
    fill="url(#cta-${platform.replace(/[^a-zA-Z]/g, "")})" />
  <text x="${ctaX + ctaWidth / 2}" y="${ctaY + ctaHeight / 2 + 1}" text-anchor="middle" dominant-baseline="middle"
    font-family="'${escapeXml(font)}', sans-serif" font-size="${ctaFontSize}" font-weight="600"
    fill="${textOnPrimary}">Read More</text>

  <!-- Bottom decorative bar -->
  <rect x="0" y="${height - barHeight}" width="${width}" height="${barHeight}" fill="${accent}" />
</svg>`;

  return { platform, width, height, svg };
}

function buildSocialTemplates(brand: BrandProfile, theme: DestinationTheme): SocialTemplateEntry[] {
  return SOCIAL_PLATFORMS.map((spec) => generateSocialTemplate(spec, brand, theme));
}

// ─── Brand Guide HTML Generator ─────────────────────────────────

function generateBrandGuideHtml(
  brand: BrandProfile,
  theme: DestinationTheme,
  kit: BrandKitAssets,
): string {
  const colorSwatches = kit.colorPalette
    .map(
      (c) => `
      <div style="display:inline-block;margin:8px;text-align:center;width:120px;">
        <div style="width:100px;height:100px;background:${c.hex};border-radius:12px;margin:0 auto;border:1px solid #ddd;"></div>
        <div style="font-weight:600;margin-top:6px;font-size:13px;">${c.name}</div>
        <div style="font-size:11px;color:#666;">${c.hex}</div>
        <div style="font-size:10px;color:#999;">${c.rgb}</div>
        <div style="font-size:10px;color:#999;">${c.hsl}</div>
      </div>`
    )
    .join("\n");

  const typographyRows = kit.typography
    .map(
      (t) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-family:'${t.font}',sans-serif;font-weight:${t.weight};">
          ${t.font}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${t.weight}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${t.usage}</td>
      </tr>`
    )
    .join("\n");

  const logoEntries = kit.logoSvgs
    .map(
      (l) => `
      <div style="display:inline-block;margin:16px;padding:24px;background:#f8f8f8;border-radius:12px;border:1px solid #eee;vertical-align:top;">
        <div style="margin-bottom:8px;font-weight:600;font-size:13px;text-transform:capitalize;">${l.name.replace(/-/g, " ")}</div>
        ${l.svg}
      </div>`
    )
    .join("\n");

  const gradientDisplay = theme.gradients.hero
    ? `<div style="height:60px;border-radius:12px;background:${theme.gradients.hero};margin:12px 0;"></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${brand.name} — Brand Guide</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a1a; line-height: 1.6; padding: 40px; max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 36px; margin-bottom: 8px; }
    h2 { font-size: 24px; margin: 40px 0 16px; padding-bottom: 8px; border-bottom: 2px solid ${theme.colors.primary}; }
    h3 { font-size: 18px; margin: 24px 0 12px; }
    .header { padding: 32px 0; border-bottom: 3px solid ${theme.colors.primary}; margin-bottom: 32px; }
    .header-sub { color: #666; font-size: 16px; }
    .section { margin-bottom: 40px; }
    table { border-collapse: collapse; width: 100%; }
    th { text-align: left; padding: 10px 12px; background: #f5f5f5; border-bottom: 2px solid #ddd; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    .gradient-label { font-size: 12px; color: #999; margin-top: 4px; word-break: break-all; }
    .token-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .token-card { padding: 16px; background: #f8f8f8; border-radius: 8px; border: 1px solid #eee; }
    .token-card strong { display: block; font-size: 13px; margin-bottom: 4px; }
    .token-card code { font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${brand.name}</h1>
    <p class="header-sub">Brand Guide &mdash; ${brand.domain} &mdash; Zenitha.Luxury LLC</p>
    <p class="header-sub">Generated: ${new Date().toISOString().split("T")[0]}</p>
  </div>

  <div class="section">
    <h2>Color Palette</h2>
    <div>${colorSwatches}</div>
  </div>

  <div class="section">
    <h2>Gradients</h2>
    <h3>Hero Gradient</h3>
    ${gradientDisplay}
    <p class="gradient-label">${theme.gradients.hero}</p>
    <h3>CTA Gradient</h3>
    <div style="height:40px;border-radius:8px;background:${theme.gradients.cta};margin:12px 0;"></div>
    <p class="gradient-label">${theme.gradients.cta}</p>
    <h3>Card Overlay</h3>
    <div style="height:40px;border-radius:8px;background:${theme.gradients.card};margin:12px 0;border:1px solid #eee;"></div>
    <p class="gradient-label">${theme.gradients.card}</p>
  </div>

  <div class="section">
    <h2>Typography</h2>
    <table>
      <thead><tr><th>Font</th><th>Weight</th><th>Usage</th></tr></thead>
      <tbody>${typographyRows}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Logo Variations</h2>
    <div>${logoEntries}</div>
    <p style="margin-top:16px;font-size:13px;color:#999;">
      SVG files are included in the /logos folder. Use the text logo for light backgrounds,
      the light logo for dark backgrounds, and the icon for favicons and app icons.
    </p>
  </div>

  <div class="section">
    <h2>Design Tokens</h2>
    <div class="token-grid">
      <div class="token-card">
        <strong>Border Radius</strong>
        <code>sm: ${theme.shape.borderRadius.sm} | md: ${theme.shape.borderRadius.md} | lg: ${theme.shape.borderRadius.lg} | xl: ${theme.shape.borderRadius.xl}</code>
      </div>
      <div class="token-card">
        <strong>Card Shadow</strong>
        <code>${theme.shadows.card}</code>
      </div>
      <div class="token-card">
        <strong>Card Hover Shadow</strong>
        <code>${theme.shadows.cardHover}</code>
      </div>
      <div class="token-card">
        <strong>Button Shadow</strong>
        <code>${theme.shadows.button}</code>
      </div>
      <div class="token-card">
        <strong>Animation Preset</strong>
        <code>${theme.animation.preset} (${theme.animation.speed})</code>
      </div>
      <div class="token-card">
        <strong>Hover Scale</strong>
        <code>${theme.animation.hoverScale}</code>
      </div>
      <div class="token-card">
        <strong>Easing</strong>
        <code>${theme.animation.easing}</code>
      </div>
      <div class="token-card">
        <strong>Letter Spacing</strong>
        <code>tight: ${theme.typography.letterSpacing.tight} | wide: ${theme.typography.letterSpacing.wide}</code>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Social Media Templates</h2>
    <p style="font-size:14px;color:#666;margin-bottom:16px;">
      Platform-sized templates are included in the /social-templates folder as SVG files.
      Open in any design tool (Figma, Canva, Illustrator) to customize.
    </p>
    <table>
      <thead><tr><th>Platform</th><th>Dimensions</th><th>File</th></tr></thead>
      <tbody>
        ${kit.socialTemplates.map((t) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${t.platform}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${t.width} x ${t.height}px</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;"><code>${t.platform.toLowerCase().replace(/[^a-z0-9]/g, "-")}.svg</code></td>
        </tr>`).join("\n")}
      </tbody>
    </table>
  </div>

  <div class="section" style="border-top:2px solid #eee;padding-top:24px;margin-top:48px;">
    <p style="font-size:12px;color:#999;text-align:center;">
      ${brand.name} is a brand of Zenitha.Luxury LLC &mdash; ${brand.domain}<br/>
      Brand kit generated on ${new Date().toISOString().split("T")[0]}
    </p>
  </div>
</body>
</html>`;
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Generate a complete brand kit for any site.
 * Returns structured data with color palette, typography, logos, and social templates.
 */
export function generateBrandKit(siteId: string): BrandKitAssets {
  const brand = getBrandProfile(siteId);
  const theme = getDestinationTheme(siteId);

  return {
    colorPalette: buildColorPalette(brand, theme),
    typography: buildTypography(brand, theme),
    logoSvgs: buildLogoSvgs(brand, theme),
    socialTemplates: buildSocialTemplates(brand, theme),
  };
}

/**
 * Generate a downloadable ZIP file containing the full brand kit.
 *
 * ZIP structure:
 *   /colors/palette.json
 *   /typography/typography.json
 *   /logos/logo-text.svg
 *   /logos/logo-icon.svg
 *   /logos/logo-horizontal.svg
 *   /logos/logo-light.svg
 *   /social-templates/{platform}.svg
 *   /brand-guide.html
 */
export async function generateBrandKitZip(siteId: string): Promise<Buffer> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const brand = getBrandProfile(siteId);
  const theme = getDestinationTheme(siteId);
  const kit = generateBrandKit(siteId);

  // /colors/palette.json
  const colorsFolder = zip.folder("colors")!;
  colorsFolder.file("palette.json", JSON.stringify(kit.colorPalette, null, 2));

  // /colors/variables.css — CSS custom properties for easy integration
  const cssVars = kit.colorPalette
    .map((c) => `  --brand-${c.name.toLowerCase().replace(/\s+/g, "-")}: ${c.hex};`)
    .join("\n");
  colorsFolder.file(
    "variables.css",
    `:root {\n${cssVars}\n}\n`,
  );

  // /typography/typography.json
  const typographyFolder = zip.folder("typography")!;
  typographyFolder.file("typography.json", JSON.stringify(kit.typography, null, 2));

  // /logos/*.svg
  const logosFolder = zip.folder("logos")!;
  for (const logo of kit.logoSvgs) {
    logosFolder.file(`${logo.name}.svg`, logo.svg);
  }

  // /social-templates/*.svg
  const socialFolder = zip.folder("social-templates")!;
  for (const template of kit.socialTemplates) {
    const filename = template.platform.toLowerCase().replace(/[^a-z0-9]/g, "-") + ".svg";
    socialFolder.file(filename, template.svg);
  }

  // /brand-guide.html
  zip.file("brand-guide.html", generateBrandGuideHtml(brand, theme, kit));

  // /design-tokens.json — raw design tokens for programmatic use
  zip.file(
    "design-tokens.json",
    JSON.stringify(
      {
        siteId: brand.siteId,
        name: brand.name,
        domain: brand.domain,
        colors: theme.colors,
        gradients: theme.gradients,
        typography: {
          headingFont: theme.typography.headingFont,
          headingFontAr: theme.typography.headingFontAr,
          bodyFont: theme.typography.bodyFont,
          bodyFontAr: theme.typography.bodyFontAr,
          displayFont: theme.typography.displayFont,
          headingWeight: theme.typography.headingWeight,
          bodyWeight: theme.typography.bodyWeight,
          letterSpacing: theme.typography.letterSpacing,
        },
        shadows: theme.shadows,
        shape: theme.shape,
        animation: theme.animation,
        patterns: theme.patterns,
      },
      null,
      2,
    ),
  );

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return buffer;
}
