/**
 * Canva Template Registry
 *
 * Static registry of all pre-built Canva brand template assets for the three
 * Zenitha portfolio brands: Yalla London, Zenitha.Luxury, and Zenitha Yachts.
 *
 * Each brand has 10 templates:
 *   01-06: PDF Cover variants (1200×1600)
 *   07:    Etsy Listing (1200×800)
 *   08:    Social Square (1080×1080)
 *   09:    Social Story (1080×1920)
 *   10:    Email Header (600×200)
 *
 * Template images are hosted in Supabase Storage (public bucket):
 *   https://nphnntnvqfpveyfktdct.supabase.co/storage/v1/object/public/canva-templates/{prefix}-{template}.png
 *
 * Canva asset IDs are provided for direct Canva API integration when available.
 */

// ─── Types ────────────────────────────────────────────────────────

export type TemplateBrand = "yalla-london" | "zenitha-luxury" | "zenitha-yachts";

export type TemplateCategory =
  | "pdf-cover"
  | "etsy-listing"
  | "social-square"
  | "social-story"
  | "email-header";

export interface CanvaTemplate {
  /** Unique ID: {brand}--{template-slug} */
  id: string;
  /** Template number (01-10) */
  number: string;
  /** Human-readable name */
  name: string;
  /** Brand this template belongs to */
  brand: TemplateBrand;
  /** Template category */
  category: TemplateCategory;
  /** Canva asset ID for API integration */
  canvaAssetId: string;
  /** Canva folder ID containing this template */
  canvaFolderId: string;
  /** Canva folder URL */
  canvaFolderUrl: string;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** CDN URL (Supabase Storage public bucket) */
  cdnUrl: string;
  /** Preview thumbnail (same CDN with ?width=400) */
  thumbnailUrl: string;
  /** Template description */
  description: string;
  /** Suggested use cases */
  useCases: string[];
}

export interface BrandTemplateSet {
  brand: TemplateBrand;
  displayName: string;
  domain: string;
  canvaFolderId: string;
  canvaFolderUrl: string;
  brandKitId?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    dark: string;
  };
  fonts: {
    display: string;
    body: string;
  };
  templates: CanvaTemplate[];
}

export interface BrandAsset {
  name: string;
  canvaAssetId: string;
  description: string;
}

// ─── CDN Config ───────────────────────────────────────────────────

const CDN_BASE =
  "https://nphnntnvqfpveyfktdct.supabase.co/storage/v1/object/public/canva-templates";

const BRAND_PREFIXES: Record<TemplateBrand, string> = {
  "yalla-london": "yl",
  "zenitha-luxury": "zl",
  "zenitha-yachts": "zy",
};

function cdnUrl(brand: TemplateBrand, filename: string): string {
  return `${CDN_BASE}/${BRAND_PREFIXES[brand]}-${filename}.png`;
}

function thumbUrl(brand: TemplateBrand, filename: string): string {
  return `${CDN_BASE}/${BRAND_PREFIXES[brand]}-${filename}.png?width=400`;
}

// ─── Template Definitions ─────────────────────────────────────────

/** Shared template structure per brand — only names and Canva IDs differ */
interface TemplateSlot {
  number: string;
  /** Yalla London template name */
  ylName: string;
  /** Zenitha.Luxury / Zenitha Yachts template name (shared naming) */
  zName: string;
  /** Yalla London filename slug */
  ylFile: string;
  /** Zenitha filename slug */
  zFile: string;
  category: TemplateCategory;
  width: number;
  height: number;
  description: string;
  useCases: string[];
}

const TEMPLATE_SLOTS: TemplateSlot[] = [
  {
    number: "01",
    ylName: "Boarding Pass Cover",
    zName: "Gold Frame Cover",
    ylFile: "01-boarding-pass-cover",
    zFile: "01-gold-frame-cover",
    category: "pdf-cover",
    width: 1200,
    height: 1600,
    description: "Primary PDF cover — signature brand layout",
    useCases: ["travel-guide", "city-guide", "destination-guide"],
  },
  {
    number: "02",
    ylName: "Red Gold Editorial Cover",
    zName: "Navy Editorial Cover",
    ylFile: "02-red-gold-editorial-cover",
    zFile: "02-navy-editorial-cover",
    category: "pdf-cover",
    width: 1200,
    height: 1600,
    description: "Editorial style cover with bold brand colors",
    useCases: ["editorial", "magazine", "premium-guide"],
  },
  {
    number: "03",
    ylName: "Cream Stamp Cover",
    zName: "Cream Centered Cover",
    ylFile: "03-cream-stamp-cover",
    zFile: "03-cream-centered-cover",
    category: "pdf-cover",
    width: 1200,
    height: 1600,
    description: "Light, elegant cover on cream background",
    useCases: ["restaurant-guide", "hotel-guide", "luxury-listing"],
  },
  {
    number: "04",
    ylName: "Thames Blue Cover",
    zName: "Deep Gradient Cover",
    ylFile: "04-thames-blue-cover",
    zFile: "04-deep-gradient-cover",
    category: "pdf-cover",
    width: 1200,
    height: 1600,
    description: "Deep blue/navy gradient with gold typography",
    useCases: ["evening-guide", "nightlife", "premium-experience"],
  },
  {
    number: "05",
    ylName: "Magazine Split Cover",
    zName: "Split Panel Cover",
    ylFile: "05-magazine-split-cover",
    zFile: "05-split-panel-cover",
    category: "pdf-cover",
    width: 1200,
    height: 1600,
    description: "Split-panel layout — dark editorial + brand accent",
    useCases: ["comparison-guide", "seasonal-guide", "special-edition"],
  },
  {
    number: "06",
    ylName: "Charcoal Luxury Cover",
    zName: "Black Gold Cover",
    ylFile: "06-charcoal-luxury-cover",
    zFile: "06-black-gold-cover",
    category: "pdf-cover",
    width: 1200,
    height: 1600,
    description: "Dark luxury cover with gold frame and accents",
    useCases: ["vip-guide", "concierge", "ultra-luxury"],
  },
  {
    number: "07",
    ylName: "Etsy Listing",
    zName: "Etsy Listing",
    ylFile: "07-etsy-listing",
    zFile: "07-etsy-listing",
    category: "etsy-listing",
    width: 1200,
    height: 800,
    description: "Etsy product listing image — landscape format",
    useCases: ["etsy-product", "digital-download", "printable"],
  },
  {
    number: "08",
    ylName: "Social Square",
    zName: "Social Square",
    ylFile: "08-social-square",
    zFile: "08-social-square",
    category: "social-square",
    width: 1080,
    height: 1080,
    description: "Instagram/Facebook square post template",
    useCases: ["instagram-post", "facebook-post", "carousel-slide"],
  },
  {
    number: "09",
    ylName: "Social Story",
    zName: "Social Story",
    ylFile: "09-social-story",
    zFile: "09-social-story",
    category: "social-story",
    width: 1080,
    height: 1920,
    description: "Instagram/TikTok story/reel template",
    useCases: ["instagram-story", "tiktok", "youtube-short", "reel"],
  },
  {
    number: "10",
    ylName: "Email Header",
    zName: "Email Header",
    ylFile: "10-email-header",
    zFile: "10-email-header",
    category: "email-header",
    width: 600,
    height: 200,
    description: "Email header banner — fits standard email width",
    useCases: ["newsletter", "welcome-email", "digest", "campaign"],
  },
];

// ─── Canva Asset IDs (per brand × template) ──────────────────────

const CANVA_ASSET_IDS: Record<TemplateBrand, string[]> = {
  "yalla-london": [
    "MAHGA6uRCZU", // 01 Boarding Pass
    "MAHGA9eJAfE", // 02 Red Gold Editorial
    "MAHGA1Tti9U", // 03 Cream Stamp
    "MAHGA68yH6k", // 04 Thames Blue
    "MAHGA-VTSyU", // 05 Magazine Split
    "MAHGA7JVic0", // 06 Charcoal Luxury
    "MAHGA9Qg04U", // 07 Etsy Listing
    "MAHGA1L62fc", // 08 Social Square
    "MAHGA-kQEuM", // 09 Social Story
    "MAHGA-wo1u4", // 10 Email Header
  ],
  "zenitha-luxury": [
    "MAHGBNq68b8", // 01 Gold Frame
    "MAHGBK7quaQ", // 02 Navy Editorial
    "MAHGBIAbPQ0", // 03 Cream Centered
    "MAHGBPiKdJw", // 04 Deep Gradient
    "MAHGBLy_G18", // 05 Split Panel
    "MAHGBFeuM44", // 06 Black Gold
    "MAHGBHcMo-Q", // 07 Etsy Listing
    "MAHGBCqtj2o", // 08 Social Square
    "MAHGBIIhRc4", // 09 Social Story
    "MAHGBPxeRbk", // 10 Email Header
  ],
  "zenitha-yachts": [
    "MAHGBPubNl4", // 01 Gold Frame
    "MAHGBEb2GTM", // 02 Navy Editorial
    "MAHGBK6oZ9c", // 03 Cream Centered
    "MAHGBClnu6c", // 04 Deep Gradient
    "MAHGBNW8_FM", // 05 Split Panel
    "MAHGBLinYNs", // 06 Black Gold
    "MAHGBPTcb84", // 07 Etsy Listing
    "MAHGBKXdXhw", // 08 Social Square
    "MAHGBP_S8Sc", // 09 Social Story
    "MAHGBFkD-hw", // 10 Email Header
  ],
};

const CANVA_FOLDERS: Record<TemplateBrand, { id: string; url: string }> = {
  "yalla-london": {
    id: "FAHGA4ZPMR8",
    url: "https://www.canva.com/folder/FAHGA4ZPMR8",
  },
  "zenitha-luxury": {
    id: "FAHGBAIduP0",
    url: "https://www.canva.com/folder/FAHGBAIduP0",
  },
  "zenitha-yachts": {
    id: "FAHGBDx0oO8",
    url: "https://www.canva.com/folder/FAHGBDx0oO8",
  },
};

// ─── Additional Brand Assets (Yalla London) ──────────────────────

export const YALLA_LONDON_BRAND_ASSETS: BrandAsset[] = [
  { name: "Stamp Seal 1000px", canvaAssetId: "MAHGAdBrlqo", description: "High-res stamp seal for prints" },
  { name: "Primary Logo Light", canvaAssetId: "MAHGAUtsgm4", description: "Logo on light backgrounds" },
  { name: "Primary Logo Dark", canvaAssetId: "MAHGAal1Hlo", description: "Logo on dark backgrounds" },
  { name: "Horizontal Logo (Dark BG)", canvaAssetId: "MAHGAfkRhSw", description: "Wide logo for headers" },
  { name: "Tri-Color Bar", canvaAssetId: "MAHGAQCKgW0", description: "Red | Gold | Blue accent bar" },
  { name: "Watermark", canvaAssetId: "MAHGAWsIwNE", description: "Subtle brand watermark overlay" },
  { name: "Icon 512", canvaAssetId: "MAHGAYRKfbw", description: "Square icon for favicons/apps" },
  { name: "Stacked Logo Light", canvaAssetId: "MAHGAXdJDTI", description: "Stacked logo for vertical layouts" },
  { name: "Stamp Seal Transparent", canvaAssetId: "MAHGAQuqg58", description: "Transparent stamp overlay" },
];

// ─── Brand Template Sets ─────────────────────────────────────────

function buildTemplates(brand: TemplateBrand): CanvaTemplate[] {
  const assetIds = CANVA_ASSET_IDS[brand];
  const folder = CANVA_FOLDERS[brand];
  const isYL = brand === "yalla-london";

  return TEMPLATE_SLOTS.map((slot, idx) => ({
    id: `${brand}--${isYL ? slot.ylFile : slot.zFile}`,
    number: slot.number,
    name: isYL ? slot.ylName : slot.zName,
    brand,
    category: slot.category,
    canvaAssetId: assetIds[idx],
    canvaFolderId: folder.id,
    canvaFolderUrl: folder.url,
    width: slot.width,
    height: slot.height,
    cdnUrl: cdnUrl(brand, isYL ? slot.ylFile : slot.zFile),
    thumbnailUrl: thumbUrl(brand, isYL ? slot.ylFile : slot.zFile),
    description: slot.description,
    useCases: slot.useCases,
  }));
}

export const BRAND_TEMPLATE_SETS: Record<TemplateBrand, BrandTemplateSet> = {
  "yalla-london": {
    brand: "yalla-london",
    displayName: "Yalla London",
    domain: "yalla-london.com",
    canvaFolderId: CANVA_FOLDERS["yalla-london"].id,
    canvaFolderUrl: CANVA_FOLDERS["yalla-london"].url,
    brandKitId: "kAGy-_WP9fE",
    colors: {
      primary: "#C8322B",
      secondary: "#C49A2A",
      accent: "#4A7BA8",
      background: "#F5F0E8",
      dark: "#0F1621",
    },
    fonts: { display: "Anybody", body: "Source Serif 4" },
    templates: buildTemplates("yalla-london"),
  },
  "zenitha-luxury": {
    brand: "zenitha-luxury",
    displayName: "Zenitha.Luxury",
    domain: "zenitha.luxury",
    canvaFolderId: CANVA_FOLDERS["zenitha-luxury"].id,
    canvaFolderUrl: CANVA_FOLDERS["zenitha-luxury"].url,
    colors: {
      primary: "#0D1B2A",
      secondary: "#C9962A",
      accent: "#D4B254",
      background: "#FBF2E3",
      dark: "#0A0A0A",
    },
    fonts: { display: "Cormorant Garamond", body: "Inter" },
    templates: buildTemplates("zenitha-luxury"),
  },
  "zenitha-yachts": {
    brand: "zenitha-yachts",
    displayName: "Zenitha Yachts",
    domain: "zenithayachts.com",
    canvaFolderId: CANVA_FOLDERS["zenitha-yachts"].id,
    canvaFolderUrl: CANVA_FOLDERS["zenitha-yachts"].url,
    colors: {
      primary: "#101F31",
      secondary: "#B8923E",
      accent: "#D4B254",
      background: "#FBF2E3",
      dark: "#0A0A0A",
    },
    fonts: { display: "Cormorant Garamond", body: "Inter" },
    templates: buildTemplates("zenitha-yachts"),
  },
};

// ─── Public API ───────────────────────────────────────────────────

/** Get all templates across all brands (30 total) */
export function getAllCanvaTemplates(): CanvaTemplate[] {
  return Object.values(BRAND_TEMPLATE_SETS).flatMap((s) => s.templates);
}

/** Get the brand template set for a given brand */
export function getBrandTemplateSet(brand: TemplateBrand): BrandTemplateSet {
  return BRAND_TEMPLATE_SETS[brand];
}

/** Get templates for a specific brand */
export function getTemplatesForBrand(brand: TemplateBrand): CanvaTemplate[] {
  return BRAND_TEMPLATE_SETS[brand]?.templates ?? [];
}

/** Get templates by category (e.g., all PDF covers across all brands) */
export function getTemplatesByCategory(category: TemplateCategory): CanvaTemplate[] {
  return getAllCanvaTemplates().filter((t) => t.category === category);
}

/** Get a specific template by its full ID */
export function getTemplateById(id: string): CanvaTemplate | undefined {
  return getAllCanvaTemplates().find((t) => t.id === id);
}

/** Get PDF cover templates for a specific brand (templates 01-06) */
export function getPdfCoverTemplates(brand: TemplateBrand): CanvaTemplate[] {
  return getTemplatesForBrand(brand).filter((t) => t.category === "pdf-cover");
}

/** Get social templates for a specific brand (08 square + 09 story) */
export function getSocialTemplates(brand: TemplateBrand): CanvaTemplate[] {
  return getTemplatesForBrand(brand).filter(
    (t) => t.category === "social-square" || t.category === "social-story"
  );
}

/**
 * Resolve a site ID (e.g., "yalla-london", "zenitha-yachts-med") to a TemplateBrand.
 * Falls back to "yalla-london" if no match.
 */
export function siteIdToTemplateBrand(siteId: string): TemplateBrand {
  if (siteId === "yalla-london") return "yalla-london";
  if (siteId === "zenitha-yachts-med" || siteId.includes("yacht")) return "zenitha-yachts";
  // Zenitha.Luxury is the parent entity site
  if (siteId === "zenitha-luxury" || siteId.includes("zenitha")) return "zenitha-luxury";
  return "yalla-london";
}

/** Get all available brand names */
export function getAvailableBrands(): TemplateBrand[] {
  return Object.keys(BRAND_TEMPLATE_SETS) as TemplateBrand[];
}

/** Get total template count */
export function getTemplateCount(): number {
  return getAllCanvaTemplates().length;
}

// ─── Extended Brand Profiles (for design tools, Canva setup, and content generation) ───

export interface ExtendedBrandProfile {
  brand: string;
  displayName: string;
  domain: string;
  colors: Record<string, string>;
  fonts: { display: string; body: string; arabic?: string };
  logoDescription: string;
  tagline: string;
  canvaBrandKitName: string;
}

/**
 * Full brand profiles for all portfolio brands — used by design tools,
 * Canva brand kit setup, content generation prompts, and email templates.
 */
export const EXTENDED_BRAND_PROFILES: Record<string, ExtendedBrandProfile> = {
  "yalla-london": {
    brand: "yalla-london",
    displayName: "Yalla London",
    domain: "yalla-london.com",
    colors: {
      red: "#C8322B",
      gold: "#C49A2A",
      blue: "#4A7BA8",
      charcoal: "#1C1917",
      cream: "#F5F0E8",
      navy: "#0F1621",
      parchment: "#EDE9E1",
    },
    fonts: { display: "Anybody", body: "Source Serif 4", arabic: "Noto Sans Arabic" },
    logoDescription: "Big Ben scalloped stamp + YALLA (parchment) + LONDON (red) wordmark",
    tagline: "Your Luxury London Guide",
    canvaBrandKitName: "Yalla London",
  },
  "zenitha-luxury": {
    brand: "zenitha-luxury",
    displayName: "Zenitha.Luxury",
    domain: "zenitha.luxury",
    colors: {
      obsidian: "#0C0C0C",
      midnight: "#111111",
      charcoal: "#161616",
      stone: "#5A5248",
      muted: "#9E9080",
      gold: "#C49A2A",
      goldWarm: "#C9A84C",
      goldSoft: "#D4AF6A",
      cream: "#F0EBE1",
      white: "#FFFFFF",
    },
    fonts: { display: "Cormorant Garamond", body: "Inter" },
    logoDescription: "Gold anchor mark on dark background — serif ZENITHA wordmark",
    tagline: "Curated Luxury Across the World",
    canvaBrandKitName: "Zenitha.Luxury",
  },
  "zenitha-yachts": {
    brand: "zenitha-yachts",
    displayName: "Zenitha Yachts",
    domain: "zenithayachts.com",
    colors: {
      navy: "#101F31",
      gold: "#B8923E",
      goldLight: "#D4B254",
      cream: "#FBF2E3",
      charcoal: "#0A0A0A",
      white: "#FFFFFF",
    },
    fonts: { display: "Cormorant Garamond", body: "Inter" },
    logoDescription: "Compass rose/star + ZENITHA (spaced caps) / YACHTS (small caps)",
    tagline: "Private Charter & Bespoke Voyages",
    canvaBrandKitName: "Zenitha Yachts",
  },
  "worldtme": {
    brand: "worldtme",
    displayName: "World Through My Eyes",
    domain: "worldtme.com",
    colors: {
      skyBlue: "#07A4F2",
      blue: "#068DD0",
      green: "#03AD62",
      darkTeal: "#007965",
      lime: "#85C342",
      gold: "#FFC417",
      burgundy: "#9B1749",
      black: "#000000",
      white: "#FFFFFF",
    },
    fonts: { display: "Gilroy", body: "Montserrat", arabic: "Shamel Family Sans" },
    logoDescription: "Circular badge — WORLD THROUGH MY EYES text around nature/travel illustration (sun, mountains, airplane, leaf). Sky blue outer ring.",
    tagline: "Travel & Discovery",
    canvaBrandKitName: "World Through My Eyes",
  },
};

/** Get extended brand profile by brand key */
export function getExtendedBrandProfile(brand: string): ExtendedBrandProfile | undefined {
  return EXTENDED_BRAND_PROFILES[brand];
}

/** Get all extended brand profiles */
export function getAllExtendedBrandProfiles(): ExtendedBrandProfile[] {
  return Object.values(EXTENDED_BRAND_PROFILES);
}
