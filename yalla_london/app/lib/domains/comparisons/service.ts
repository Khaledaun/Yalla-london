/**
 * Comparisons Service
 *
 * Business logic for resort comparison engine.
 */

import { getTenantPrisma } from '@/lib/db';
import { assertExists, assertValidSlug } from '@/lib/db/assertions';
import type {
  Comparison,
  ComparisonWithResorts,
  ComparisonResort,
  ComparisonFilters,
  CreateComparisonInput,
  UpdateComparisonInput,
  AddResortToComparisonInput,
  UpdateComparisonResortInput,
  ComparisonTableData,
  ComparisonTableResort,
  ComparisonTableCriterion,
  VerdictCalculation,
  ContentStatus,
} from './types';
import {
  DEFAULT_CRITERIA,
  DEFAULT_DISPLAY_CONFIG,
  VERDICT_TEMPLATES,
} from './types';
import type { Resort, ScoreBreakdown } from '../resorts/types';

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * List comparisons with filters
 */
export async function listComparisons(
  siteId: string,
  filters: ComparisonFilters = {},
  pagination: { page: number; limit: number } = { page: 1, limit: 20 }
): Promise<{ comparisons: Comparison[]; total: number }> {
  const db = getTenantPrisma(siteId);
  const skip = (pagination.page - 1) * pagination.limit;

  const where: any = {};

  if (filters.comparison_type) where.comparison_type = filters.comparison_type;
  if (filters.status) where.status = filters.status;
  if (filters.is_featured !== undefined) where.is_featured = filters.is_featured;

  if (filters.searchQuery) {
    where.OR = [
      { title_ar: { contains: filters.searchQuery, mode: 'insensitive' } },
      { title_en: { contains: filters.searchQuery, mode: 'insensitive' } },
    ];
  }

  const [comparisons, total] = await Promise.all([
    db.comparison.findMany({
      where,
      orderBy: { updated_at: 'desc' },
      skip,
      take: pagination.limit,
    }),
    db.comparison.count({ where }),
  ]);

  return { comparisons: comparisons as Comparison[], total };
}

/**
 * Get published comparisons for public site
 */
export async function getPublishedComparisons(
  siteId: string,
  limit: number = 10
): Promise<Comparison[]> {
  const db = getTenantPrisma(siteId);

  const comparisons = await db.comparison.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { published_at: 'desc' },
    take: limit,
  });

  return comparisons as Comparison[];
}

/**
 * Get comparison by slug with all resort data
 */
export async function getComparisonBySlug(
  siteId: string,
  slug: string
): Promise<ComparisonWithResorts | null> {
  const db = getTenantPrisma(siteId);

  const comparison = await db.comparison.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      resorts: {
        orderBy: { position: 'asc' },
        include: {
          resort: true,
        },
      },
    },
  });

  return comparison as ComparisonWithResorts | null;
}

/**
 * Get comparison by ID (admin)
 */
export async function getComparisonById(
  siteId: string,
  id: string
): Promise<ComparisonWithResorts | null> {
  const db = getTenantPrisma(siteId);

  const comparison = await db.comparison.findUnique({
    where: { id },
    include: {
      resorts: {
        orderBy: { position: 'asc' },
        include: {
          resort: true,
        },
      },
    },
  });

  return comparison as ComparisonWithResorts | null;
}

/**
 * Get featured comparisons for homepage
 */
export async function getFeaturedComparisons(
  siteId: string,
  limit: number = 4
): Promise<Comparison[]> {
  const db = getTenantPrisma(siteId);

  const comparisons = await db.comparison.findMany({
    where: {
      status: 'PUBLISHED',
      is_featured: true,
    },
    orderBy: { published_at: 'desc' },
    take: limit,
  });

  return comparisons as Comparison[];
}

// ============================================================================
// MUTATION FUNCTIONS
// ============================================================================

/**
 * Create a new comparison
 */
export async function createComparison(
  siteId: string,
  data: CreateComparisonInput
): Promise<Comparison> {
  const db = getTenantPrisma(siteId);

  assertValidSlug(data.slug);

  // Check for duplicate slug
  const existing = await db.comparison.findFirst({
    where: { slug: data.slug },
  });

  if (existing) {
    throw new Error(`Comparison with slug "${data.slug}" already exists`);
  }

  const comparison = await db.comparison.create({
    data: {
      ...data,
      criteria: data.criteria || [],
      display_config: data.display_config || null,
      status: 'DRAFT',
    },
  });

  return comparison as Comparison;
}

/**
 * Update a comparison
 */
export async function updateComparison(
  siteId: string,
  id: string,
  data: UpdateComparisonInput
): Promise<Comparison> {
  const db = getTenantPrisma(siteId);

  const existing = await db.comparison.findUnique({
    where: { id },
  });

  assertExists(existing, 'Comparison', id);

  if (data.slug && data.slug !== existing.slug) {
    assertValidSlug(data.slug);

    const duplicate = await db.comparison.findFirst({
      where: { slug: data.slug, id: { not: id } },
    });

    if (duplicate) {
      throw new Error(`Comparison with slug "${data.slug}" already exists`);
    }
  }

  const comparison = await db.comparison.update({
    where: { id },
    data: {
      ...data,
      updated_at: new Date(),
    },
  });

  return comparison as Comparison;
}

/**
 * Delete a comparison
 */
export async function deleteComparison(
  siteId: string,
  id: string
): Promise<void> {
  const db = getTenantPrisma(siteId);

  const existing = await db.comparison.findUnique({
    where: { id },
  });

  assertExists(existing, 'Comparison', id);

  // Delete associated resorts first (cascade)
  await db.comparisonResort.deleteMany({
    where: { comparison_id: id },
  });

  await db.comparison.delete({
    where: { id },
  });
}

/**
 * Publish a comparison
 */
export async function publishComparison(
  siteId: string,
  id: string
): Promise<Comparison> {
  const db = getTenantPrisma(siteId);

  // Verify it has at least 2 resorts
  const resortCount = await db.comparisonResort.count({
    where: { comparison_id: id },
  });

  if (resortCount < 2) {
    throw new Error('Comparison must have at least 2 resorts to publish');
  }

  const comparison = await db.comparison.update({
    where: { id },
    data: {
      status: 'PUBLISHED',
      published_at: new Date(),
    },
  });

  return comparison as Comparison;
}

// ============================================================================
// RESORT MANAGEMENT
// ============================================================================

/**
 * Add a resort to a comparison
 */
export async function addResortToComparison(
  siteId: string,
  comparisonId: string,
  data: AddResortToComparisonInput
): Promise<ComparisonResort> {
  const db = getTenantPrisma(siteId);

  // Verify comparison exists
  const comparison = await db.comparison.findUnique({
    where: { id: comparisonId },
  });
  assertExists(comparison, 'Comparison', comparisonId);

  // Verify resort exists
  const resort = await db.resort.findUnique({
    where: { id: data.resort_id },
  });
  assertExists(resort, 'Resort', data.resort_id);

  // Check if resort already in comparison
  const existing = await db.comparisonResort.findFirst({
    where: { comparison_id: comparisonId, resort_id: data.resort_id },
  });

  if (existing) {
    throw new Error('Resort already in this comparison');
  }

  const comparisonResort = await db.comparisonResort.create({
    data: {
      comparison_id: comparisonId,
      resort_id: data.resort_id,
      position: data.position,
      verdict_ar: data.verdict_ar,
      verdict_en: data.verdict_en,
      pros_ar: data.pros_ar || [],
      cons_ar: data.cons_ar || [],
      custom_scores: data.custom_scores || null,
      is_winner: false,
      is_best_value: false,
    },
  });

  return comparisonResort as ComparisonResort;
}

/**
 * Update a comparison resort
 */
export async function updateComparisonResort(
  siteId: string,
  comparisonId: string,
  resortId: string,
  data: UpdateComparisonResortInput
): Promise<ComparisonResort> {
  const db = getTenantPrisma(siteId);

  const comparisonResort = await db.comparisonResort.updateMany({
    where: {
      comparison_id: comparisonId,
      resort_id: resortId,
    },
    data,
  });

  if (comparisonResort.count === 0) {
    throw new Error('Comparison resort not found');
  }

  const updated = await db.comparisonResort.findFirst({
    where: { comparison_id: comparisonId, resort_id: resortId },
  });

  return updated as ComparisonResort;
}

/**
 * Remove a resort from a comparison
 */
export async function removeResortFromComparison(
  siteId: string,
  comparisonId: string,
  resortId: string
): Promise<void> {
  const db = getTenantPrisma(siteId);

  await db.comparisonResort.deleteMany({
    where: {
      comparison_id: comparisonId,
      resort_id: resortId,
    },
  });
}

/**
 * Reorder resorts in a comparison
 */
export async function reorderComparisonResorts(
  siteId: string,
  comparisonId: string,
  order: string[] // resort IDs in desired order
): Promise<void> {
  const db = getTenantPrisma(siteId);

  // Update positions in a transaction
  await db.$transaction(
    order.map((resortId, index) =>
      db.comparisonResort.updateMany({
        where: { comparison_id: comparisonId, resort_id: resortId },
        data: { position: index + 1 },
      })
    )
  );
}

// ============================================================================
// TABLE BUILDER
// ============================================================================

/**
 * Build comparison table data for rendering
 */
export async function buildComparisonTable(
  siteId: string,
  comparisonId: string,
  locale: 'ar' | 'en' = 'ar'
): Promise<ComparisonTableData> {
  const comparison = await getComparisonById(siteId, comparisonId);

  if (!comparison) {
    throw new Error('Comparison not found');
  }

  const criteria = comparison.criteria.length > 0
    ? comparison.criteria
    : []; // Use default criteria if none specified

  // Transform resorts for table
  const tableResorts: ComparisonTableResort[] = comparison.resorts.map((cr) => {
    const resort = cr.resort as Resort;
    const scoreBreakdown = resort.score_breakdown as ScoreBreakdown | null;

    // Build scores from custom scores or resort scores
    const scores: Record<string, number> = {};
    for (const criterion of criteria) {
      const customScore = cr.custom_scores?.[criterion.key];
      const resortScore = scoreBreakdown?.[criterion.key as keyof ScoreBreakdown];
      scores[criterion.key] = customScore ?? resortScore ?? 0;
    }

    return {
      id: resort.id,
      position: cr.position,
      name: locale === 'ar' ? resort.name_ar : (resort.name_en || resort.name_ar),
      slug: resort.slug,
      hero_image_url: resort.hero_image_url,
      overall_score: resort.overall_score,
      starting_price: resort.starting_price,
      verdict: locale === 'ar' ? cr.verdict_ar : (cr.verdict_en || cr.verdict_ar),
      pros: cr.pros_ar, // TODO: support English
      cons: cr.cons_ar,
      is_winner: cr.is_winner,
      is_best_value: cr.is_best_value,
      scores,
    };
  });

  // Build criteria rows with highest markers
  const tableCriteria: ComparisonTableCriterion[] = criteria.map((criterion) => {
    const values = tableResorts.map((r) => ({
      resortId: r.id,
      value: r.scores[criterion.key] || 0,
      isHighest: false,
    }));

    // Find highest
    const maxValue = Math.max(...values.map((v) => v.value as number));
    values.forEach((v) => {
      if (v.value === maxValue) v.isHighest = true;
    });

    return {
      key: criterion.key,
      label: locale === 'ar' ? criterion.label_ar : criterion.label_en,
      icon: criterion.icon,
      values,
    };
  });

  // Find winner and best value
  const winner = tableResorts.find((r) => r.is_winner)?.id || null;
  const bestValue = tableResorts.find((r) => r.is_best_value)?.id || null;

  return {
    comparison,
    resorts: tableResorts,
    criteria: tableCriteria,
    winner,
    bestValue,
  };
}

// ============================================================================
// VERDICT CALCULATION
// ============================================================================

/**
 * Auto-calculate "best for" verdicts for resorts in a comparison
 */
export async function calculateVerdicts(
  siteId: string,
  comparisonId: string,
  locale: 'ar' | 'en' = 'ar'
): Promise<VerdictCalculation[]> {
  const comparison = await getComparisonById(siteId, comparisonId);

  if (!comparison || comparison.resorts.length < 2) {
    return [];
  }

  const verdicts: VerdictCalculation[] = [];
  const templates = locale === 'ar' ? VERDICT_TEMPLATES.ar : VERDICT_TEMPLATES.en;

  // Find best overall
  const bestOverall = comparison.resorts.reduce((best, current) => {
    const currentScore = (current.resort as Resort).overall_score || 0;
    const bestScore = (best.resort as Resort).overall_score || 0;
    return currentScore > bestScore ? current : best;
  });

  verdicts.push({
    resortId: bestOverall.resort_id,
    verdict: templates.overall_best,
    confidence: 0.9,
    factors: ['highest_overall_score'],
  });

  // Find best value (best score-to-price ratio)
  const bestValue = comparison.resorts.reduce((best, current) => {
    const currentResort = current.resort as Resort;
    const bestResort = best.resort as Resort;
    const currentRatio = (currentResort.overall_score || 0) / (currentResort.starting_price || 1);
    const bestRatio = (bestResort.overall_score || 0) / (bestResort.starting_price || 1);
    return currentRatio > bestRatio ? current : best;
  });

  if (bestValue.resort_id !== bestOverall.resort_id) {
    verdicts.push({
      resortId: bestValue.resort_id,
      verdict: templates.best_value,
      confidence: 0.8,
      factors: ['best_score_to_price_ratio'],
    });
  }

  // Find best for specific categories based on score breakdown
  const scoreCategories: { key: keyof ScoreBreakdown; verdictKey: keyof typeof templates }[] = [
    { key: 'beach', verdictKey: 'best_beach' },
    { key: 'reef', verdictKey: 'best_reef' },
    { key: 'service', verdictKey: 'best_service' },
    { key: 'dining', verdictKey: 'best_dining' },
  ];

  for (const { key, verdictKey } of scoreCategories) {
    const best = comparison.resorts.reduce((best, current) => {
      const currentScores = (current.resort as Resort).score_breakdown as ScoreBreakdown | null;
      const bestScores = (best.resort as Resort).score_breakdown as ScoreBreakdown | null;
      const currentScore = currentScores?.[key] || 0;
      const bestScore = bestScores?.[key] || 0;
      return currentScore > bestScore ? current : best;
    });

    // Only add if this resort doesn't already have a verdict
    if (!verdicts.some((v) => v.resortId === best.resort_id)) {
      verdicts.push({
        resortId: best.resort_id,
        verdict: templates[verdictKey],
        confidence: 0.7,
        factors: [`highest_${key}_score`],
      });
    }
  }

  return verdicts;
}

/**
 * Apply calculated verdicts to comparison resorts
 */
export async function applyVerdicts(
  siteId: string,
  comparisonId: string,
  verdicts: VerdictCalculation[]
): Promise<void> {
  const db = getTenantPrisma(siteId);

  for (const verdict of verdicts) {
    await db.comparisonResort.updateMany({
      where: {
        comparison_id: comparisonId,
        resort_id: verdict.resortId,
      },
      data: {
        verdict_ar: verdict.verdict,
        is_winner: verdict.verdict.includes('الأفضل بشكل عام') || verdict.verdict.includes('Best Overall'),
        is_best_value: verdict.verdict.includes('قيمة') || verdict.verdict.includes('Value'),
      },
    });
  }
}
