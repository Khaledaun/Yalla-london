/**
 * Resort Domain Types
 *
 * Types for the Maldives resort module.
 */

// ============================================================================
// ENUMS
// ============================================================================

export const TransferType = {
  SPEEDBOAT: 'SPEEDBOAT',
  SEAPLANE: 'SEAPLANE',
  DOMESTIC_FLIGHT: 'DOMESTIC_FLIGHT',
  SPEEDBOAT_SEAPLANE: 'SPEEDBOAT_SEAPLANE',
} as const;

export type TransferType = (typeof TransferType)[keyof typeof TransferType];

export const ResortCategory = {
  LUXURY: 'LUXURY',
  ULTRA_LUXURY: 'ULTRA_LUXURY',
  PREMIUM: 'PREMIUM',
  MID_RANGE: 'MID_RANGE',
  BOUTIQUE: 'BOUTIQUE',
} as const;

export type ResortCategory = (typeof ResortCategory)[keyof typeof ResortCategory];

export const ResortStyle = {
  FAMILY: 'FAMILY',
  ROMANTIC: 'ROMANTIC',
  HONEYMOON: 'HONEYMOON',
  DIVING: 'DIVING',
  SURFING: 'SURFING',
  WELLNESS: 'WELLNESS',
  ADULTS_ONLY: 'ADULTS_ONLY',
  ALL_INCLUSIVE: 'ALL_INCLUSIVE',
} as const;

export type ResortStyle = (typeof ResortStyle)[keyof typeof ResortStyle];

export const PriceRange = {
  BUDGET: 'BUDGET',       // < $500/night
  MID: 'MID',             // $500-$1000
  HIGH: 'HIGH',           // $1000-$2000
  ULTRA: 'ULTRA',         // $2000+
} as const;

export type PriceRange = (typeof PriceRange)[keyof typeof PriceRange];

// ============================================================================
// BASE TYPES
// ============================================================================

export interface Resort {
  id: string;
  site_id: string;
  slug: string;

  // Names
  name_ar: string;
  name_en: string | null;

  // Location
  atoll: string;
  island: string;
  latitude: number | null;
  longitude: number | null;
  transfer_type: TransferType;
  transfer_duration: number | null;

  // Classification
  star_rating: number;
  category: ResortCategory;
  styles: ResortStyle[];

  // Pricing
  price_range: PriceRange;
  starting_price: number | null;
  all_inclusive: boolean;

  // Attributes
  attributes_json: ResortAttributes | null;
  amenities: string[];
  dining_options: string[];

  // Scoring
  overall_score: number | null;
  score_breakdown: ScoreBreakdown | null;
  review_count: number;

  // Content
  description_ar: string;
  description_en: string | null;
  highlights_ar: string[];
  highlights_en: string[];

  // Media
  hero_image_url: string | null;
  gallery_urls: string[];
  video_url: string | null;

  // Freshness
  last_verified_at: Date | null;
  verified_by: string | null;
  data_source: string | null;

  // Affiliate
  affiliate_url: string | null;
  affiliate_partner_id: string | null;
  commission_rate: number | null;

  // SEO
  meta_title_ar: string | null;
  meta_description_ar: string | null;
  schema_json: object | null;

  // Status
  is_active: boolean;
  is_featured: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ResortAttributes {
  reef_type?: 'house' | 'lagoon' | 'channel' | 'none';
  beach_type?: 'lagoon' | 'natural' | 'sandbank';
  villa_count?: number;
  water_villa_count?: number;
  beach_villa_count?: number;
  restaurant_count?: number;
  bar_count?: number;
  spa?: boolean;
  kids_club?: boolean;
  infinity_pool?: boolean;
  private_pool?: boolean;
  butler_service?: boolean;
  halal_food?: boolean;
  prayer_room?: boolean;
}

export interface ScoreBreakdown {
  beach: number;
  reef: number;
  service: number;
  dining: number;
  value: number;
  location: number;
  rooms: number;
}

// ============================================================================
// FILTER & PAGINATION TYPES
// ============================================================================

export interface ResortFilters {
  category?: ResortCategory;
  styles?: ResortStyle[];
  priceRange?: PriceRange;
  atoll?: string;
  transferType?: TransferType;
  minScore?: number;
  maxPrice?: number;
  amenities?: string[];
  isFeatured?: boolean;
  isActive?: boolean;
  searchQuery?: string;
}

export interface ResortSortOptions {
  field: 'name_ar' | 'overall_score' | 'starting_price' | 'created_at' | 'review_count';
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface ResortListResult {
  resorts: Resort[];
  total: number;
  page: number;
  totalPages: number;
  facets: ResortFacets;
}

export interface ResortFacets {
  categories: { value: ResortCategory; count: number }[];
  atolls: { value: string; count: number }[];
  priceRanges: { value: PriceRange; count: number }[];
  styles: { value: ResortStyle; count: number }[];
  transferTypes: { value: TransferType; count: number }[];
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface CreateResortInput {
  slug: string;
  name_ar: string;
  name_en?: string;
  atoll: string;
  island: string;
  latitude?: number;
  longitude?: number;
  transfer_type: TransferType;
  transfer_duration?: number;
  star_rating: number;
  category: ResortCategory;
  styles?: ResortStyle[];
  price_range: PriceRange;
  starting_price?: number;
  all_inclusive?: boolean;
  attributes_json?: ResortAttributes;
  amenities?: string[];
  dining_options?: string[];
  description_ar: string;
  description_en?: string;
  highlights_ar?: string[];
  highlights_en?: string[];
  hero_image_url?: string;
  gallery_urls?: string[];
  video_url?: string;
  affiliate_url?: string;
  affiliate_partner_id?: string;
  commission_rate?: number;
  meta_title_ar?: string;
  meta_description_ar?: string;
  is_featured?: boolean;
}

export interface UpdateResortInput extends Partial<CreateResortInput> {
  is_active?: boolean;
  overall_score?: number;
  score_breakdown?: ScoreBreakdown;
  last_verified_at?: Date;
  verified_by?: string;
  data_source?: string;
}

// ============================================================================
// PUBLIC VIEW TYPES
// ============================================================================

export interface ResortPublicView {
  id: string;
  slug: string;
  name: string;
  atoll: string;
  island: string;
  transfer_type: TransferType;
  transfer_duration: number | null;
  star_rating: number;
  category: ResortCategory;
  styles: ResortStyle[];
  price_range: PriceRange;
  starting_price: number | null;
  all_inclusive: boolean;
  overall_score: number | null;
  review_count: number;
  description: string;
  highlights: string[];
  hero_image_url: string | null;
  gallery_urls: string[];
  amenities: string[];
  attributes: ResortAttributes | null;
  affiliate_url: string | null;
  is_featured: boolean;
}

export interface ResortCardView {
  id: string;
  slug: string;
  name: string;
  atoll: string;
  category: ResortCategory;
  price_range: PriceRange;
  starting_price: number | null;
  overall_score: number | null;
  hero_image_url: string | null;
  is_featured: boolean;
  transfer_type: TransferType;
}

// ============================================================================
// ATOLL DATA
// ============================================================================

export const MALDIVES_ATOLLS = [
  { code: 'north-male', name_en: 'North Malé Atoll', name_ar: 'أتول ماليه الشمالية' },
  { code: 'south-male', name_en: 'South Malé Atoll', name_ar: 'أتول ماليه الجنوبية' },
  { code: 'ari', name_en: 'Ari Atoll', name_ar: 'أتول آري' },
  { code: 'baa', name_en: 'Baa Atoll', name_ar: 'أتول با' },
  { code: 'lhaviyani', name_en: 'Lhaviyani Atoll', name_ar: 'أتول لهافياني' },
  { code: 'noonu', name_en: 'Noonu Atoll', name_ar: 'أتول نونو' },
  { code: 'raa', name_en: 'Raa Atoll', name_ar: 'أتول را' },
  { code: 'dhaalu', name_en: 'Dhaalu Atoll', name_ar: 'أتول دالو' },
  { code: 'faafu', name_en: 'Faafu Atoll', name_ar: 'أتول فافو' },
  { code: 'gaafu-alifu', name_en: 'Gaafu Alifu Atoll', name_ar: 'أتول غافو أليفو' },
  { code: 'laamu', name_en: 'Laamu Atoll', name_ar: 'أتول لامو' },
  { code: 'meemu', name_en: 'Meemu Atoll', name_ar: 'أتول ميمو' },
] as const;

// ============================================================================
// SCORING WEIGHTS
// ============================================================================

export const SCORE_WEIGHTS: Record<keyof ScoreBreakdown, number> = {
  beach: 0.20,
  reef: 0.15,
  service: 0.20,
  dining: 0.15,
  value: 0.15,
  location: 0.10,
  rooms: 0.05,
};
