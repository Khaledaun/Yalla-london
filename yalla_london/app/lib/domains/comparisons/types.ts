/**
 * Comparisons Domain Types
 *
 * Types for the resort comparison engine.
 */

import type { Resort, ResortCategory, PriceRange } from '../resorts/types';

// ============================================================================
// ENUMS
// ============================================================================

export const ComparisonType = {
  HEAD_TO_HEAD: 'HEAD_TO_HEAD',     // 2 resorts direct comparison
  CATEGORY: 'CATEGORY',              // "Best family resorts"
  PRICE_BRACKET: 'PRICE_BRACKET',   // "Best luxury under $1000"
  LOCATION: 'LOCATION',              // "Best in North Malé Atoll"
  STYLE: 'STYLE',                    // "Best for honeymoon"
} as const;

export type ComparisonType = (typeof ComparisonType)[keyof typeof ComparisonType];

export const ContentStatus = {
  DRAFT: 'DRAFT',
  REVIEW: 'REVIEW',
  SCHEDULED: 'SCHEDULED',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus];

// ============================================================================
// BASE TYPES
// ============================================================================

export interface Comparison {
  id: string;
  site_id: string;
  slug: string;

  // Content
  title_ar: string;
  title_en: string | null;
  subtitle_ar: string | null;
  intro_ar: string;
  intro_en: string | null;
  conclusion_ar: string | null;

  // Type
  comparison_type: ComparisonType;

  // Configuration
  criteria: ComparisonCriterion[];
  display_config: ComparisonDisplayConfig | null;

  // SEO
  meta_title_ar: string | null;
  meta_description_ar: string | null;
  target_keyword: string | null;
  schema_json: object | null;

  // Status
  status: ContentStatus;
  is_featured: boolean;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ComparisonResort {
  id: string;
  comparison_id: string;
  resort_id: string;

  // Position & Verdict
  position: number;
  verdict_ar: string | null;
  verdict_en: string | null;
  is_winner: boolean;
  is_best_value: boolean;

  // Per-resort notes
  pros_ar: string[];
  cons_ar: string[];
  custom_scores: Record<string, number> | null;
}

export interface ComparisonCriterion {
  key: string;
  label_ar: string;
  label_en: string;
  weight: number;
  icon?: string;
  description_ar?: string;
}

export interface ComparisonDisplayConfig {
  showPrices: boolean;
  showScores: boolean;
  showWinner: boolean;
  showBestValue: boolean;
  highlightDifferences: boolean;
  tableStyle: 'standard' | 'compact' | 'detailed';
}

// ============================================================================
// JOIN TYPES
// ============================================================================

export interface ComparisonWithResorts extends Comparison {
  resorts: (ComparisonResort & { resort: Resort })[];
}

export interface ComparisonResortWithDetails extends ComparisonResort {
  resort: Resort;
}

// ============================================================================
// TABLE BUILDER TYPES
// ============================================================================

export interface ComparisonTableData {
  comparison: Comparison;
  resorts: ComparisonTableResort[];
  criteria: ComparisonTableCriterion[];
  winner: string | null;
  bestValue: string | null;
}

export interface ComparisonTableResort {
  id: string;
  position: number;
  name: string;
  slug: string;
  hero_image_url: string | null;
  overall_score: number | null;
  starting_price: number | null;
  verdict: string | null;
  pros: string[];
  cons: string[];
  is_winner: boolean;
  is_best_value: boolean;
  scores: Record<string, number>;
}

export interface ComparisonTableCriterion {
  key: string;
  label: string;
  icon?: string;
  values: { resortId: string; value: number | string; isHighest: boolean }[];
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface CreateComparisonInput {
  slug: string;
  title_ar: string;
  title_en?: string;
  subtitle_ar?: string;
  intro_ar: string;
  intro_en?: string;
  conclusion_ar?: string;
  comparison_type: ComparisonType;
  criteria?: ComparisonCriterion[];
  display_config?: ComparisonDisplayConfig;
  meta_title_ar?: string;
  meta_description_ar?: string;
  target_keyword?: string;
  is_featured?: boolean;
}

export interface UpdateComparisonInput extends Partial<CreateComparisonInput> {
  status?: ContentStatus;
}

export interface AddResortToComparisonInput {
  resort_id: string;
  position: number;
  verdict_ar?: string;
  verdict_en?: string;
  pros_ar?: string[];
  cons_ar?: string[];
  custom_scores?: Record<string, number>;
}

export interface UpdateComparisonResortInput {
  position?: number;
  verdict_ar?: string;
  verdict_en?: string;
  is_winner?: boolean;
  is_best_value?: boolean;
  pros_ar?: string[];
  cons_ar?: string[];
  custom_scores?: Record<string, number>;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface ComparisonFilters {
  comparison_type?: ComparisonType;
  status?: ContentStatus;
  is_featured?: boolean;
  searchQuery?: string;
}

// ============================================================================
// BEST-FOR VERDICT TYPES
// ============================================================================

export interface VerdictCalculation {
  resortId: string;
  verdict: string;
  confidence: number;
  factors: string[];
}

export const VERDICT_TEMPLATES = {
  ar: {
    overall_best: 'الأفضل بشكل عام',
    best_value: 'الأفضل قيمة مقابل السعر',
    best_for_families: 'الأفضل للعائلات',
    best_for_honeymoon: 'الأفضل لشهر العسل',
    best_for_diving: 'الأفضل للغوص',
    best_beach: 'أفضل شاطئ',
    best_reef: 'أفضل شعاب مرجانية',
    best_service: 'أفضل خدمة',
    best_dining: 'أفضل مطاعم',
    most_luxurious: 'الأكثر فخامة',
    best_location: 'أفضل موقع',
  },
  en: {
    overall_best: 'Best Overall',
    best_value: 'Best Value',
    best_for_families: 'Best for Families',
    best_for_honeymoon: 'Best for Honeymoon',
    best_for_diving: 'Best for Diving',
    best_beach: 'Best Beach',
    best_reef: 'Best Reef',
    best_service: 'Best Service',
    best_dining: 'Best Dining',
    most_luxurious: 'Most Luxurious',
    best_location: 'Best Location',
  },
} as const;

// ============================================================================
// DEFAULT CRITERIA
// ============================================================================

export const DEFAULT_CRITERIA: ComparisonCriterion[] = [
  { key: 'beach', label_ar: 'الشاطئ', label_en: 'Beach', weight: 1.0, icon: 'sun' },
  { key: 'reef', label_ar: 'الشعاب المرجانية', label_en: 'Reef', weight: 1.0, icon: 'fish' },
  { key: 'service', label_ar: 'الخدمة', label_en: 'Service', weight: 1.0, icon: 'star' },
  { key: 'dining', label_ar: 'المطاعم', label_en: 'Dining', weight: 1.0, icon: 'utensils' },
  { key: 'value', label_ar: 'القيمة', label_en: 'Value', weight: 1.0, icon: 'wallet' },
  { key: 'location', label_ar: 'الموقع', label_en: 'Location', weight: 0.8, icon: 'map-pin' },
  { key: 'rooms', label_ar: 'الغرف', label_en: 'Rooms', weight: 0.8, icon: 'bed' },
];

export const DEFAULT_DISPLAY_CONFIG: ComparisonDisplayConfig = {
  showPrices: true,
  showScores: true,
  showWinner: true,
  showBestValue: true,
  highlightDifferences: true,
  tableStyle: 'standard',
};
