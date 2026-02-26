/**
 * Commerce Engine — Shared TypeScript Types
 *
 * Used across: trend-engine, listing-generator, campaign-generator,
 * alert-engine, report-generator, CSV importers, and all commerce API routes.
 */

// ─── Product Ontology ─────────────────────────────────────

export interface ProductOntologyItem {
  /** Internal key: "itinerary_template", "wall_art", etc. */
  category: string;
  /** Human label: "Destination Itinerary Templates" */
  label: string;
  /** Priority tier: 1 = highest profit/alignment, 2 = complementary, 3 = seasonal/niche */
  tier: 1 | 2 | 3;
  /** Maps to Prisma ProductType enum */
  productType: string;
  /** Price range in cents */
  priceRange: { min: number; max: number };
  /** Which platforms this product type sells on */
  platforms: ("website" | "etsy")[];
  /** Suggested Etsy taxonomy category path */
  etsyCategory?: string;
}

// ─── Trend Research ───────────────────────────────────────

export interface TrendSignal {
  keyword: string;
  score: number; // 0-100
  source:
    | "google_trends"
    | "etsy_search"
    | "pinterest"
    | "internal"
    | "seasonal";
  volume?: number;
  competition?: "low" | "medium" | "high";
  timeWindow?: string; // "rising", "stable", "declining"
}

export interface NicheOpportunity {
  niche: string;
  score: number; // 0-100 composite score
  rationale: string;
  keywords: string[];
  competitorCount: number;
  avgPrice: number; // cents
  demandSignal: "rising" | "stable" | "seasonal" | "declining";
  suggestedProductType: string;
  suggestedTier: 1 | 2 | 3;
}

export interface ProductOpportunityBrief {
  title: string;
  description: string;
  tier: 1 | 2 | 3;
  productType: string;
  ontologyCategory: string;
  estimatedPrice: number; // cents
  keywords: string[];
  rationale: string;
  designNotes?: string;
  bundlePotential?: string;
}

// ─── Scoring Model ────────────────────────────────────────

export interface OpportunityScore {
  /** 0-100: How likely buyers are to purchase */
  buyerIntent: number;
  /** 0-100: Week-over-week trend velocity */
  trendVelocity: number;
  /** 0-100: Inverse of competition density (100 = no competition) */
  competitionGap: number;
  /** 0-100: Inverse of production hours needed (100 = 1h, 0 = 40h+) */
  productionEase: number;
  /** 0-100: How well this fits the site's destination authority */
  authorityFit: number;
  /** 0-100: How well-timed for current season */
  seasonalTiming: number;
  /** 0-100: Bundle and upsell potential */
  bundlePotential: number;
  /** Weighted composite score 0-100 */
  composite: number;
}

export const SCORE_WEIGHTS = {
  buyerIntent: 0.20,
  trendVelocity: 0.10,
  competitionGap: 0.20,
  productionEase: 0.10,
  authorityFit: 0.15,
  seasonalTiming: 0.10,
  bundlePotential: 0.15,
} as const;

// ─── Etsy Listing ─────────────────────────────────────────

export interface EtsyListingFields {
  title: string; // max 140 chars
  description: string; // max 65535 chars
  tags: string[]; // max 13 tags, each max 20 chars
  price: number; // cents
  currency: string;
  quantity: number;
  section?: string;
  materials: string[];
}

export interface EtsyComplianceResult {
  valid: boolean;
  issues: {
    field: string;
    message: string;
    severity: "error" | "warning";
  }[];
}

// ─── CSV Import ───────────────────────────────────────────

export interface EtsyOrderCsvRow {
  sale_date: string;
  item_name: string;
  quantity: string;
  price: string;
  shipping: string;
  sales_tax: string;
  order_id: string;
  currency: string;
  buyer_email?: string;
  coupon_code?: string;
}

export interface EtsyStatsCsvRow {
  date: string;
  views: string;
  visits: string;
  orders: string;
  revenue: string;
  favorited?: string;
  conversion_rate?: string;
}

export interface CsvImportResult {
  rowsParsed: number;
  rowsImported: number;
  rowsSkipped: number;
  errors: string[];
}

// ─── Campaign ─────────────────────────────────────────────

export interface CampaignTask {
  day: number; // 1-30
  task: string;
  channel: "social" | "email" | "blog" | "etsy" | "pinterest";
  status: "pending" | "completed" | "skipped";
  completedAt?: string;
}

export interface CampaignResults {
  views: number;
  clicks: number;
  conversions: number;
  revenue: number; // cents
}

// ─── UTM Tracking ─────────────────────────────────────────

export interface UtmParams {
  source: string; // "etsy", "instagram", "email", "blog", "pinterest"
  medium: string; // "social", "email", "referral", "organic"
  campaign: string; // auto-generated slug
  content?: string; // variant tracking
  term?: string; // keyword
}

// ─── Distribution Assets (per-tenant moat) ────────────────

export interface DistributionAsset {
  type:
    | "facebook_group"
    | "email_list"
    | "agent_network"
    | "social_following"
    | "seo_traffic";
  label: string;
  url?: string;
  size?: number; // members/subscribers/followers
  notes?: string;
}

// ─── Payout Profile ───────────────────────────────────────

export interface PayoutProfileTemplate {
  profileName: string;
  legalEntity: string;
  beneficiaryAddress: {
    line1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  domestic: {
    bankName: string;
    routingAba: string;
    accountType: string;
    accountNumber: string;
    bankAddress: string;
  };
  internationalUsd: {
    swift: string;
    aba: string;
    accountNumber: string;
  };
  internationalNonUsd: {
    intermediaryBank: string;
    intermediarySwift: string;
    intermediaryAba: string;
    beneficiaryBankAccount: string;
    reference: string;
  };
}

// ─── Dashboard Aggregates ─────────────────────────────────

export interface CommerceStats {
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    total: number;
    byChannel: { website: number; etsy: number };
  };
  products: {
    active: number;
    total: number;
    byTier: { tier1: number; tier2: number; tier3: number };
  };
  briefs: {
    draft: number;
    approved: number;
    inProduction: number;
    listed: number;
  };
  campaigns: {
    active: number;
    completed: number;
  };
  alerts: {
    unread: number;
  };
}
