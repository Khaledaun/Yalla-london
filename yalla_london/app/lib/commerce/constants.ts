/**
 * Commerce Engine — Constants & Product Ontology
 *
 * Single source of truth for:
 * - Product categories, tiers, and pricing bands
 * - Etsy platform limits
 * - Payout profile template
 * - Scoring weights
 */

import type { ProductOntologyItem, PayoutProfileTemplate } from "./types";

// ─── Product Ontology (11 categories × 3 tiers) ──────────

export const PRODUCT_ONTOLOGY: ProductOntologyItem[] = [
  // ── Tier 1: Highest profit / best alignment ──
  {
    category: "itinerary_template",
    label: "Destination Itinerary Templates",
    tier: 1,
    productType: "TEMPLATE",
    priceRange: { min: 499, max: 1999 }, // $4.99 - $19.99
    platforms: ["website", "etsy"],
    etsyCategory: "Paper & Party Supplies > Paper > Calendars & Planners",
  },
  {
    category: "travel_guide",
    label: "Travel Guide eBooks / PDFs",
    tier: 1,
    productType: "PDF_GUIDE",
    priceRange: { min: 799, max: 2999 }, // $7.99 - $29.99
    platforms: ["website", "etsy"],
    etsyCategory: "Books, Movies & Music > Books > Travel Books",
  },
  {
    category: "agent_toolkit",
    label: "Travel Agent Templates & Tools Bundle",
    tier: 1,
    productType: "BUNDLE",
    priceRange: { min: 1999, max: 4999 }, // $19.99 - $49.99
    platforms: ["website"], // B2B — website only
  },

  // ── Tier 2: Complementary ──
  {
    category: "wall_art",
    label: "Vintage Travel Posters / Wall Art",
    tier: 2,
    productType: "WALL_ART",
    priceRange: { min: 299, max: 1499 }, // $2.99 - $14.99
    platforms: ["website", "etsy"],
    etsyCategory: "Art & Collectibles > Prints > Digital Prints",
  },
  {
    category: "planner_bundle",
    label: "Trip Planner Bundles (Printable)",
    tier: 2,
    productType: "PLANNER",
    priceRange: { min: 499, max: 1499 }, // $4.99 - $14.99
    platforms: ["website", "etsy"],
    etsyCategory: "Paper & Party Supplies > Paper > Calendars & Planners",
  },
  {
    category: "social_template",
    label: "Social Media Templates for Travel Creators",
    tier: 2,
    productType: "TEMPLATE",
    priceRange: { min: 299, max: 999 }, // $2.99 - $9.99
    platforms: ["website", "etsy"],
    etsyCategory: "Craft Supplies & Tools > Visual Arts > Graphic Design",
  },

  // ── Tier 3: Seasonal / Niche ──
  {
    category: "lightroom_preset",
    label: "Lightroom Presets",
    tier: 3,
    productType: "PRESET",
    priceRange: { min: 199, max: 799 }, // $1.99 - $7.99
    platforms: ["etsy"],
    etsyCategory: "Craft Supplies & Tools > Visual Arts > Photo Editing",
  },
  {
    category: "journal_template",
    label: "Travel Journal / Scrapbook Templates",
    tier: 3,
    productType: "PLANNER",
    priceRange: { min: 199, max: 699 }, // $1.99 - $6.99
    platforms: ["etsy"],
    etsyCategory: "Paper & Party Supplies > Paper > Journals & Notebooks",
  },
  {
    category: "goodnotes_sticker",
    label: "GoodNotes Digital Stickers",
    tier: 3,
    productType: "STICKER",
    priceRange: { min: 99, max: 499 }, // $0.99 - $4.99
    platforms: ["etsy"],
    etsyCategory: "Craft Supplies & Tools > Visual Arts > Clip Art",
  },
  {
    category: "educational_worksheet",
    label: "Educational Worksheets for Kids",
    tier: 3,
    productType: "WORKSHEET",
    priceRange: { min: 99, max: 399 }, // $0.99 - $3.99
    platforms: ["website", "etsy"],
    etsyCategory:
      "Craft Supplies & Tools > Visual Arts > Printable Wall Art",
  },
  {
    category: "seasonal_guide",
    label: "Seasonal Event Guides",
    tier: 3,
    productType: "EVENT_GUIDE",
    priceRange: { min: 299, max: 999 }, // $2.99 - $9.99
    platforms: ["website", "etsy"],
    etsyCategory: "Books, Movies & Music > Books > Travel Books",
  },
];

// ─── Etsy Platform Limits ─────────────────────────────────

export const ETSY_LIMITS = {
  /** Maximum characters in listing title */
  titleMaxChars: 140,
  /** Maximum number of tags per listing */
  tagsMax: 13,
  /** Maximum characters per tag */
  tagMaxChars: 20,
  /** Maximum characters in description */
  descriptionMaxChars: 65535,
  /** Maximum listing images */
  imagesMax: 10,
  /** Maximum digital files per listing */
  digitalFilesMax: 5,
  /** Maximum file size in bytes (20MB) */
  maxFileSizeBytes: 20 * 1024 * 1024,
  /** Maximum shop sections */
  sectionsMax: 20,
  /** Minimum price in cents (USD) */
  minPriceCents: 20, // $0.20
} as const;

// ─── Payout Profile Template (Mercury / Zenitha.Luxury LLC) ─

export const PAYOUT_PROFILE: PayoutProfileTemplate = {
  profileName: "Mercury — Zenitha.Luxury LLC",
  legalEntity: "Zenitha.Luxury LLC",
  beneficiaryAddress: {
    line1: "16192 Coastal Highway",
    city: "Lewes",
    state: "DE",
    zip: "19958",
    country: "US",
  },
  domestic: {
    bankName: "Choice Financial Group",
    routingAba: "091311229",
    accountType: "Checking",
    accountNumber: "****9197", // Masked for display — last 4 only
    bankAddress: "4501 23rd Avenue S, Fargo, ND 58104",
  },
  internationalUsd: {
    swift: "CHFGUS44021",
    aba: "091311229",
    accountNumber: "****9197",
  },
  internationalNonUsd: {
    intermediaryBank: "JPMorgan Chase Bank N.A., New York",
    intermediarySwift: "CHASUS33XXX",
    intermediaryAba: "021000021",
    beneficiaryBankAccount: "****7692", // Masked
    reference:
      "/FFC/****9197/Zenitha.Luxury LLC/Lewes, USA",
  },
};

// ─── Scoring Weights ──────────────────────────────────────

export const OPPORTUNITY_SCORE_WEIGHTS = {
  buyerIntent: 0.20,
  trendVelocity: 0.10,
  competitionGap: 0.20,
  productionEase: 0.10,
  authorityFit: 0.15,
  seasonalTiming: 0.10,
  bundlePotential: 0.15,
} as const;

// ─── Default Feature Flags ────────────────────────────────

export const COMMERCE_FEATURE_FLAGS = [
  {
    name: "COMMERCE_ENGINE",
    description: "Enable the Hybrid Commerce Engine for this site",
  },
  {
    name: "COMMERCE_TREND_CRON",
    description: "Enable weekly TrendRun cron for commerce product research",
  },
  {
    name: "COMMERCE_ETSY_INTEGRATION",
    description: "Enable Etsy API connection and listing management",
  },
] as const;

// ─── Helper: Get ontology item by category ────────────────

export function getOntologyItem(
  category: string,
): ProductOntologyItem | undefined {
  return PRODUCT_ONTOLOGY.find((item) => item.category === category);
}

// ─── Helper: Get ontology items by tier ───────────────────

export function getOntologyByTier(tier: 1 | 2 | 3): ProductOntologyItem[] {
  return PRODUCT_ONTOLOGY.filter((item) => item.tier === tier);
}

// ─── Helper: Validate Etsy listing fields ─────────────────

export function validateEtsyListing(fields: {
  title: string;
  tags: string[];
  description: string;
  price: number;
}): { valid: boolean; issues: { field: string; message: string }[] } {
  const issues: { field: string; message: string }[] = [];

  if (fields.title.length > ETSY_LIMITS.titleMaxChars) {
    issues.push({
      field: "title",
      message: `Title exceeds ${ETSY_LIMITS.titleMaxChars} characters (${fields.title.length})`,
    });
  }

  if (fields.tags.length > ETSY_LIMITS.tagsMax) {
    issues.push({
      field: "tags",
      message: `More than ${ETSY_LIMITS.tagsMax} tags (${fields.tags.length})`,
    });
  }

  for (const tag of fields.tags) {
    if (tag.length > ETSY_LIMITS.tagMaxChars) {
      issues.push({
        field: "tags",
        message: `Tag "${tag}" exceeds ${ETSY_LIMITS.tagMaxChars} chars`,
      });
    }
  }

  if (fields.description.length > ETSY_LIMITS.descriptionMaxChars) {
    issues.push({
      field: "description",
      message: `Description exceeds ${ETSY_LIMITS.descriptionMaxChars} chars`,
    });
  }

  if (fields.price < ETSY_LIMITS.minPriceCents) {
    issues.push({
      field: "price",
      message: `Price below Etsy minimum ($${(ETSY_LIMITS.minPriceCents / 100).toFixed(2)})`,
    });
  }

  return { valid: issues.length === 0, issues };
}
