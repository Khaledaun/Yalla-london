/**
 * Unified Brand Data Access Module
 *
 * Consolidates brand information from two sources:
 *   - config/sites.ts  (SiteConfig: id, name, domain, primaryColor, secondaryColor)
 *   - lib/design/destination-themes.ts  (DestinationTheme: colors, typography, gradients, shadows, shapes, animations)
 *
 * Exports a single BrandProfile interface that downstream consumers
 * (templates, emails, OG images, PDF guides, design studio) can rely on
 * without reaching into two separate configs.
 */

import { SITES, getSiteConfig, getAllSiteIds } from "@/config/sites";
import {
  getDestinationTheme,
  type DestinationTheme,
} from "@/lib/design/destination-themes";

// ─── BrandProfile Interface ──────────────────────────────────────

export interface BrandProfile {
  siteId: string;
  name: string;
  domain: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textLight: string;
    gradient: string;
  };
  fonts: {
    heading: { name: string; weights: number[] };
    body: { name: string; weights: number[] };
    arabic: { name: string; weights: number[] };
  };
  logo: {
    primary: string;
    light: string;
    icon: string;
    favicon: string;
  };
  social: Record<string, string>;
  designTokens: {
    borderRadius: string;
    shadow: string;
    spacing: Record<string, string>;
  };
}

// ─── Defaults ────────────────────────────────────────────────────

const DEFAULT_FONTS = {
  heading: { name: "Anybody", weights: [600, 700, 800] },
  body: { name: "Source Serif 4", weights: [400, 500, 600] },
  arabic: { name: "IBM Plex Sans Arabic", weights: [400, 500, 700] },
};

const DEFAULT_SPACING: Record<string, string> = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
  "3xl": "4rem",
};

const DEFAULT_SOCIAL: Record<string, string> = {};

// ─── Internal helpers ────────────────────────────────────────────

/**
 * Build the fonts block by merging theme typography with sensible
 * weight lists. The theme defines font family names and a single
 * heading/body weight; we expand those into full weight arrays
 * suitable for Google Fonts loading or @font-face declarations.
 */
function buildFonts(theme: DestinationTheme): BrandProfile["fonts"] {
  return {
    heading: {
      name: theme.typography.headingFont,
      weights: deriveWeights(theme.typography.headingWeight, "heading"),
    },
    body: {
      name: theme.typography.bodyFont,
      weights: deriveWeights(theme.typography.bodyWeight, "body"),
    },
    arabic: {
      name: theme.typography.headingFontAr,
      weights: [400, 500, 700],
    },
  };
}

/**
 * Expand a single weight into a useful array. Heading fonts get a
 * bolder range; body fonts get a lighter range.
 */
function deriveWeights(
  baseWeight: number,
  role: "heading" | "body"
): number[] {
  if (role === "heading") {
    // Provide semi-bold through extra-bold around the base weight
    const set = new Set<number>([600, baseWeight, 800]);
    return Array.from(set).sort((a, b) => a - b);
  }
  // Body: regular through semi-bold
  const set = new Set<number>([400, baseWeight, 500, 600]);
  return Array.from(set).sort((a, b) => a - b);
}

/**
 * Generate conventional logo paths for a given site slug.
 * Actual files may or may not exist yet; this provides the
 * canonical paths that design tooling and templates should target.
 */
function buildLogoPaths(slug: string): BrandProfile["logo"] {
  const base = `/images/brand/${slug}`;
  return {
    primary: `${base}/logo.svg`,
    light: `${base}/logo-light.svg`,
    icon: `${base}/icon.svg`,
    favicon: `/favicon.ico`,
  };
}

// ─── Core merge function ─────────────────────────────────────────

function mergeBrandProfile(siteId: string): BrandProfile {
  const siteConfig = getSiteConfig(siteId);
  const theme = getDestinationTheme(siteId);

  // If the site is completely unknown, build a minimal fallback
  // using the default theme (yallaLondonTheme, per getDestinationTheme).
  const name = siteConfig?.name ?? theme.name;
  const domain = siteConfig?.domain ?? "yalla-london.com";
  const slug = siteConfig?.slug ?? siteId;

  // Colors: theme is the authority for detailed palette; site config
  // provides the canonical primary/secondary that may differ slightly
  // (e.g. Istanbul has site config colors but no theme entry yet).
  // When a theme exists for this siteId its detailed palette wins.
  // When only site config exists, we build a reduced palette from its
  // two colors plus neutral defaults.
  const hasThemeMatch = theme.id === siteId || (siteId === "arabaldives" && theme.id === "maldives");

  const colors: BrandProfile["colors"] = hasThemeMatch
    ? {
        primary: theme.colors.primary,
        secondary: theme.colors.secondary,
        accent: theme.colors.accent,
        background: theme.colors.background,
        surface: theme.colors.surface,
        text: theme.colors.text,
        textLight: theme.colors.textMuted,
        gradient: theme.gradients.hero,
      }
    : {
        // Fallback: site config colors + neutral fill
        primary: siteConfig?.primaryColor ?? theme.colors.primary,
        secondary: siteConfig?.secondaryColor ?? theme.colors.secondary,
        accent: siteConfig?.secondaryColor ?? theme.colors.accent,
        background: "#FAFAFA",
        surface: "#FFFFFF",
        text: "#1C1917",
        textLight: "#78716C",
        gradient: `linear-gradient(135deg, ${siteConfig?.primaryColor ?? theme.colors.primary} 0%, ${siteConfig?.secondaryColor ?? theme.colors.secondary} 100%)`,
      };

  const fonts = hasThemeMatch ? buildFonts(theme) : DEFAULT_FONTS;

  const designTokens: BrandProfile["designTokens"] = hasThemeMatch
    ? {
        borderRadius: theme.shape.borderRadius.md,
        shadow: theme.shadows.card,
        spacing: DEFAULT_SPACING,
      }
    : {
        borderRadius: "8px",
        shadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        spacing: DEFAULT_SPACING,
      };

  return {
    siteId,
    name,
    domain,
    colors,
    fonts,
    logo: buildLogoPaths(slug),
    social: DEFAULT_SOCIAL,
    designTokens,
  };
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Get a unified BrandProfile for a given site.
 *
 * Merges data from config/sites.ts (identity, domain, primary/secondary
 * colors) with lib/design/destination-themes.ts (full color palette,
 * typography, gradients, shadows, shape tokens).
 *
 * Falls back to sensible defaults when a site ID is not found in either
 * source — the caller always receives a complete BrandProfile.
 */
export function getBrandProfile(siteId: string): BrandProfile {
  return mergeBrandProfile(siteId);
}

/**
 * Get BrandProfiles for every configured site in config/sites.ts.
 * Useful for multi-site operations (OG image generation, brand
 * consistency audits, design token export).
 */
export function getAllBrandProfiles(): BrandProfile[] {
  return getAllSiteIds().map((id) => mergeBrandProfile(id));
}
