/**
 * Brand Defaults for UI Components
 *
 * Provides brand-aware default colors for components that can't easily
 * access React context (email builders, static config objects, SSR).
 *
 * Uses getSiteConfig() with graceful fallbacks — safe to call at module level.
 * For React components, prefer the BrandContext hook instead.
 */

import { getSiteConfig, getDefaultSiteId, type SiteConfig } from "@/config/sites";

export interface BrandDefaults {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textLight: string;
  cream: string;
  navy: string;
}

// Yalla London defaults — used as fallback only
const FALLBACK: BrandDefaults = {
  primary: "#1C1917",
  secondary: "#C8322B",
  accent: "#C49A2A",
  background: "#F5F0E8",
  surface: "#FFFFFF",
  text: "#1C1917",
  textLight: "#A09A8E",
  cream: "#FAF8F4",
  navy: "#0F1621",
};

/**
 * Get brand default colors for a site. Safe to call anywhere — returns
 * fallback values if site config is unavailable.
 */
export function getBrandDefaults(siteId?: string): BrandDefaults {
  try {
    const id = siteId || getDefaultSiteId();
    const cfg = getSiteConfig(id);
    if (!cfg) return FALLBACK;
    return mapSiteConfigToDefaults(cfg);
  } catch {
    return FALLBACK;
  }
}

function mapSiteConfigToDefaults(cfg: SiteConfig): BrandDefaults {
  const primary = cfg.primaryColor || FALLBACK.primary;
  const secondary = cfg.secondaryColor || FALLBACK.secondary;

  // Derive accent from secondary (gold for most sites)
  const accent = secondary;

  // Determine if this is a dark-primary brand (Zenitha) or light-primary (Yalla London)
  const isDarkPrimary = isColorDark(primary);

  return {
    primary,
    secondary,
    accent,
    background: isDarkPrimary ? "#FBF2E3" : "#F5F0E8", // cream variant
    surface: "#FFFFFF",
    text: primary, // primary doubles as text color
    textLight: "#A09A8E",
    cream: isDarkPrimary ? "#FBF2E3" : "#FAF8F4",
    navy: isDarkPrimary ? primary : "#0F1621",
  };
}

/** Check if a hex color is dark (luminance < 128) */
function isColorDark(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

/**
 * Build a tricolor gradient string from brand colors.
 * Used by news carousel, progress bars, decorative elements.
 */
export function getTricolorGradient(siteId?: string): string {
  const d = getBrandDefaults(siteId);
  return `conic-gradient(from var(--border-angle, 0deg), ${d.secondary}, ${d.accent}, ${d.primary}, ${d.secondary})`;
}

/**
 * Build a tricolor linear gradient (left-to-right) for bar elements.
 */
export function getTricolorLinear(siteId?: string): string {
  const d = getBrandDefaults(siteId);
  // Yalla London: red | gold | blue. Other brands: primary | secondary | accent
  if (siteId === "yalla-london" || !siteId) {
    return `linear-gradient(to right, #C8322B 0% 33%, #C49A2A 33% 66%, #4A7BA8 66% 100%)`;
  }
  return `linear-gradient(to right, ${d.primary} 0% 33%, ${d.secondary} 33% 66%, ${d.accent} 66% 100%)`;
}
