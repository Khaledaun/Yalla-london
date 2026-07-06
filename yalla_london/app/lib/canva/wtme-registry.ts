/**
 * WTME (World Through My Eyes) — Social Frame & Asset Registry
 *
 * 14 social media frame templates stored in Canva folder FAHGEYMPxtQ.
 * 8 logo/pattern assets for brand applications.
 *
 * Use `getWtmeFrame(id)` to get a specific frame.
 * Use `getWtmeFrames(filter)` to list frames by type/language.
 * Use `getWtmeAsset(name)` to get a logo/pattern asset.
 */

// ─── Types ────────────────────────────────────────────────────

export type WtmeFrameType = "story" | "ig_post";
export type WtmeFrameLang = "en" | "ar";

export interface WtmeFrame {
  id: string;
  canvaDesignId: string;
  type: WtmeFrameType;
  lang: WtmeFrameLang;
  purpose: string;
  purposeAr?: string;
  width: number;
  height: number;
  /** Placeholder text fields in the template that can be replaced */
  editableFields: string[];
}

export interface WtmeAsset {
  name: string;
  canvaAssetId: string;
  width: number;
  height: number;
  description: string;
}

// ─── Constants ────────────────────────────────────────────────

export const WTME_CANVA_FOLDER_ID = "FAHGEYMPxtQ";
export const WTME_CANVA_FOLDER_URL = "https://www.canva.com/folder/FAHGEYMPxtQ";

export const WTME_BRAND = {
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
  fonts: {
    display: "Rift Soft",
    displayFallback: "Gilroy",
    body: "Montserrat",
    arabicHeading: "Shamel Family Sans",
    arabicBody: "Shamel Family Sans",
    arabicFallback: "Noto Sans Arabic",
  },
  ownership: "zenitha.luxury | worldtme.com",
} as const;

// ─── Frame Registry ───────────────────────────────────────────

export const WTME_FRAMES: WtmeFrame[] = [
  // ── English Story Frames (1080×1920) ──
  {
    id: "EN_01_PHOTO_FEATURE",
    canvaDesignId: "DAHGEb-N6hw",
    type: "story",
    lang: "en",
    purpose: "Destination photo showcase",
    width: 1080,
    height: 1920,
    editableFields: ["title", "subtitle", "photo"],
  },
  {
    id: "EN_02_QUOTE_CARD",
    canvaDesignId: "DAHGEXc03SE",
    type: "story",
    lang: "en",
    purpose: "Travel quote or tip",
    width: 1080,
    height: 1920,
    editableFields: ["quote", "author", "location"],
  },
  {
    id: "EN_03_PROMO_DEAL",
    canvaDesignId: "DAHGEZTLp6s",
    type: "story",
    lang: "en",
    purpose: "Flash sale / exclusive offer",
    width: 1080,
    height: 1920,
    editableFields: ["headline", "discount", "cta", "dates"],
  },
  {
    id: "EN_04_EVENT_CARD",
    canvaDesignId: "DAHGEb4j6ms",
    type: "story",
    lang: "en",
    purpose: "Event announcement",
    width: 1080,
    height: 1920,
    editableFields: ["eventName", "date", "venue", "description"],
  },
  {
    id: "EN_05_CONTENT_LIST",
    canvaDesignId: "DAHGEd3fDyA",
    type: "story",
    lang: "en",
    purpose: "Top N listicle",
    width: 1080,
    height: 1920,
    editableFields: ["title", "items"],
  },

  // ── English Instagram Posts (1080×1350) ──
  {
    id: "EN_06_IG_PHOTO",
    canvaDesignId: "DAHGEb6xD2Q",
    type: "ig_post",
    lang: "en",
    purpose: "Destination photo post",
    width: 1080,
    height: 1350,
    editableFields: ["title", "subtitle", "photo"],
  },
  {
    id: "EN_07_IG_QUOTE",
    canvaDesignId: "DAHGEZfnVKo",
    type: "ig_post",
    lang: "en",
    purpose: "Quote/tip post",
    width: 1080,
    height: 1350,
    editableFields: ["quote", "author"],
  },

  // ── Arabic Story Frames (1080×1920) — RTL ──
  {
    id: "AR_01_PHOTO_FEATURE",
    canvaDesignId: "DAHGEQNCbnA",
    type: "story",
    lang: "ar",
    purpose: "Destination photo showcase",
    purposeAr: "عرض وجهة سياحية",
    width: 1080,
    height: 1920,
    editableFields: ["title", "subtitle", "photo"],
  },
  {
    id: "AR_02_QUOTE_CARD",
    canvaDesignId: "DAHGEUd8r2M",
    type: "story",
    lang: "ar",
    purpose: "Travel quote or tip",
    purposeAr: "اقتباسات ونصائح سفر",
    width: 1080,
    height: 1920,
    editableFields: ["quote", "author", "location"],
  },
  {
    id: "AR_03_PROMO_DEAL",
    canvaDesignId: "DAHGEUyV4Ao",
    type: "story",
    lang: "ar",
    purpose: "Flash sale / exclusive offer",
    purposeAr: "عروض وتخفيضات",
    width: 1080,
    height: 1920,
    editableFields: ["headline", "discount", "cta", "dates"],
  },
  {
    id: "AR_04_EVENT_CARD",
    canvaDesignId: "DAHGEfLoU00",
    type: "story",
    lang: "ar",
    purpose: "Event announcement",
    purposeAr: "إعلانات ومناسبات",
    width: 1080,
    height: 1920,
    editableFields: ["eventName", "date", "venue", "description"],
  },
  {
    id: "AR_05_CONTENT_LIST",
    canvaDesignId: "DAHGERRG8IY",
    type: "story",
    lang: "ar",
    purpose: "Top N listicle",
    purposeAr: "قوائم أفضل ٥...",
    width: 1080,
    height: 1920,
    editableFields: ["title", "items"],
  },

  // ── Arabic Instagram Posts (1080×1350) — RTL ──
  {
    id: "AR_06_IG_PHOTO",
    canvaDesignId: "DAHGEbFUbZg",
    type: "ig_post",
    lang: "ar",
    purpose: "Destination photo post",
    purposeAr: "منشور وجهة",
    width: 1080,
    height: 1350,
    editableFields: ["title", "subtitle", "photo"],
  },
  {
    id: "AR_07_IG_QUOTE",
    canvaDesignId: "DAHGEXYaTGs",
    type: "ig_post",
    lang: "ar",
    purpose: "Quote/tip post",
    purposeAr: "منشور اقتباس",
    width: 1080,
    height: 1350,
    editableFields: ["quote", "author"],
  },
];

// ─── Logo & Pattern Assets ────────────────────────────────────

export const WTME_ASSETS: WtmeAsset[] = [
  {
    name: "logo-1024-transparent",
    canvaAssetId: "MAHGD6F9zjE",
    width: 1024,
    height: 1024,
    description: "Primary logo — circular badge, transparent background, web-optimized",
  },
  {
    name: "logo-5040-transparent",
    canvaAssetId: "MAHGDwobXf0",
    width: 5040,
    height: 5040,
    description: "High-res logo — circular badge, transparent, 600 DPI print quality",
  },
  {
    name: "logo-white-bg",
    canvaAssetId: "MAHGD3Cs_D0",
    width: 5040,
    height: 5040,
    description: "Logo on white background — for documents and light surfaces",
  },
  {
    name: "pattern-tile-color",
    canvaAssetId: "MAHGD85jWKM",
    width: 1840,
    height: 2700,
    description: "Brand pattern tile — full color, repeatable",
  },
  {
    name: "pattern-tile-mono",
    canvaAssetId: "MAHGDxaz2KI",
    width: 1840,
    height: 2700,
    description: "Brand pattern tile — monochrome outline, for watermarks",
  },
  {
    name: "pattern-transparent",
    canvaAssetId: "MAHGD9N85vQ",
    width: 1840,
    height: 2700,
    description: "Brand pattern tile — transparent background",
  },
  {
    name: "pattern-full",
    canvaAssetId: "MAHGD7x5564",
    width: 8640,
    height: 6480,
    description: "Full pattern spread — for large backgrounds and print",
  },
  {
    name: "poster-reference",
    canvaAssetId: "MAHGD-MAUfc",
    width: 8000,
    height: 4500,
    description: "Original poster designs — reference for layout patterns",
  },
];

// ─── Public API ───────────────────────────────────────────────

/** Get a specific frame by its ID (e.g., "EN_01_PHOTO_FEATURE") */
export function getWtmeFrame(id: string): WtmeFrame | undefined {
  return WTME_FRAMES.find((f) => f.id === id);
}

/** Get frames filtered by type and/or language */
export function getWtmeFrames(filter?: {
  type?: WtmeFrameType;
  lang?: WtmeFrameLang;
}): WtmeFrame[] {
  let frames = WTME_FRAMES;
  if (filter?.type) frames = frames.filter((f) => f.type === filter.type);
  if (filter?.lang) frames = frames.filter((f) => f.lang === filter.lang);
  return frames;
}

/** Get English frames only */
export function getWtmeEnglishFrames(): WtmeFrame[] {
  return getWtmeFrames({ lang: "en" });
}

/** Get Arabic frames only */
export function getWtmeArabicFrames(): WtmeFrame[] {
  return getWtmeFrames({ lang: "ar" });
}

/** Get a brand asset by name */
export function getWtmeAsset(name: string): WtmeAsset | undefined {
  return WTME_ASSETS.find((a) => a.name === name);
}

/** Get all brand assets */
export function getAllWtmeAssets(): WtmeAsset[] {
  return WTME_ASSETS;
}

/** Get total frame count */
export function getWtmeFrameCount(): number {
  return WTME_FRAMES.length;
}

/**
 * Get the appropriate frame pair (EN + AR) for a given content type.
 * Returns both language versions for bilingual content generation.
 */
export function getWtmeFramePair(purpose: "photo" | "quote" | "promo" | "event" | "list", format: "story" | "ig_post" = "story"): {
  en: WtmeFrame | undefined;
  ar: WtmeFrame | undefined;
} {
  const purposeMap: Record<string, { en: string; ar: string }> = {
    photo: format === "story" ? { en: "EN_01_PHOTO_FEATURE", ar: "AR_01_PHOTO_FEATURE" } : { en: "EN_06_IG_PHOTO", ar: "AR_06_IG_PHOTO" },
    quote: format === "story" ? { en: "EN_02_QUOTE_CARD", ar: "AR_02_QUOTE_CARD" } : { en: "EN_07_IG_QUOTE", ar: "AR_07_IG_QUOTE" },
    promo: { en: "EN_03_PROMO_DEAL", ar: "AR_03_PROMO_DEAL" },
    event: { en: "EN_04_EVENT_CARD", ar: "AR_04_EVENT_CARD" },
    list: { en: "EN_05_CONTENT_LIST", ar: "AR_05_CONTENT_LIST" },
  };
  const ids = purposeMap[purpose];
  return {
    en: ids ? getWtmeFrame(ids.en) : undefined,
    ar: ids ? getWtmeFrame(ids.ar) : undefined,
  };
}
