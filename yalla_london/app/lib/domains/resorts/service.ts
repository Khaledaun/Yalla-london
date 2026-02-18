/**
 * Resort Service
 *
 * Business logic for managing Maldives resorts.
 */

import { prisma } from '@/lib/db';
import { getTenantPrisma, TenantPrismaClient } from '@/lib/db/tenant-queries';
import { assertExists, assertValidSlug, ResourceNotFoundError } from '@/lib/db/assertions';
import type {
  Resort,
  ResortFilters,
  ResortSortOptions,
  PaginationOptions,
  ResortListResult,
  ResortFacets,
  CreateResortInput,
  UpdateResortInput,
  ResortPublicView,
  ResortCardView,
  ScoreBreakdown,
  SCORE_WEIGHTS,
} from './types';

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * List resorts with filters, sorting, and pagination
 */
export async function listResorts(
  siteId: string,
  filters: ResortFilters = {},
  sort: ResortSortOptions = { field: 'overall_score', direction: 'desc' },
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<ResortListResult> {
  const db = getTenantPrisma(siteId);
  const skip = (pagination.page - 1) * pagination.limit;

  // Build where clause
  const where: any = {
    is_active: filters.isActive ?? true,
  };

  if (filters.category) where.category = filters.category;
  if (filters.priceRange) where.price_range = filters.priceRange;
  if (filters.atoll) where.atoll = filters.atoll;
  if (filters.transferType) where.transfer_type = filters.transferType;
  if (filters.isFeatured !== undefined) where.is_featured = filters.isFeatured;
  if (filters.minScore) where.overall_score = { gte: filters.minScore };
  if (filters.maxPrice) where.starting_price = { lte: filters.maxPrice };

  if (filters.styles && filters.styles.length > 0) {
    where.styles = { hasSome: filters.styles };
  }

  if (filters.amenities && filters.amenities.length > 0) {
    where.amenities = { hasSome: filters.amenities };
  }

  if (filters.searchQuery) {
    where.OR = [
      { name_ar: { contains: filters.searchQuery, mode: 'insensitive' } },
      { name_en: { contains: filters.searchQuery, mode: 'insensitive' } },
      { atoll: { contains: filters.searchQuery, mode: 'insensitive' } },
    ];
  }

  // Execute queries in parallel
  const [resorts, total, facets] = await Promise.all([
    db.resort.findMany({
      where,
      orderBy: { [sort.field]: sort.direction },
      skip,
      take: pagination.limit,
    }),
    db.resort.count({ where }),
    getResortFacets(siteId, filters),
  ]);

  return {
    resorts: resorts as Resort[],
    total,
    page: pagination.page,
    totalPages: Math.ceil(total / pagination.limit),
    facets,
  };
}

/**
 * Get facet counts for filtering UI
 */
async function getResortFacets(siteId: string, filters: ResortFilters): Promise<ResortFacets> {
  const db = getTenantPrisma(siteId);
  const baseWhere = { is_active: filters.isActive ?? true };

  // Get counts for each facet
  const [categories, atolls, priceRanges] = await Promise.all([
    db.resort.groupBy({
      by: ['category'],
      where: baseWhere,
      _count: true,
    }),
    db.resort.groupBy({
      by: ['atoll'],
      where: baseWhere,
      _count: true,
    }),
    db.resort.groupBy({
      by: ['price_range'],
      where: baseWhere,
      _count: true,
    }),
  ]);

  return {
    categories: categories.map((c: any) => ({ value: c.category, count: c._count })),
    atolls: atolls.map((a: any) => ({ value: a.atoll, count: a._count })),
    priceRanges: priceRanges.map((p: any) => ({ value: p.price_range, count: p._count })),
    styles: [], // Would need a separate query for array fields
    transferTypes: [],
  };
}

/**
 * Get a single resort by slug
 */
export async function getResortBySlug(
  siteId: string,
  slug: string
): Promise<Resort | null> {
  const db = getTenantPrisma(siteId);

  const resort = await db.resort.findFirst({
    where: { slug, is_active: true },
  });

  return resort as Resort | null;
}

/**
 * Get a single resort by ID (admin)
 */
export async function getResortById(
  siteId: string,
  id: string
): Promise<Resort | null> {
  const db = getTenantPrisma(siteId);

  const resort = await db.resort.findUnique({
    where: { id },
  });

  return resort as Resort | null;
}

/**
 * Get featured resorts for homepage
 */
export async function getFeaturedResorts(
  siteId: string,
  limit: number = 6
): Promise<Resort[]> {
  const db = getTenantPrisma(siteId);

  const resorts = await db.resort.findMany({
    where: {
      is_active: true,
      is_featured: true,
    },
    orderBy: { overall_score: 'desc' },
    take: limit,
  });

  return resorts as Resort[];
}

/**
 * Get related resorts (same category or atoll)
 */
export async function getRelatedResorts(
  siteId: string,
  resortId: string,
  limit: number = 4
): Promise<Resort[]> {
  const db = getTenantPrisma(siteId);

  const resort = await db.resort.findUnique({
    where: { id: resortId },
    select: { category: true, atoll: true, price_range: true },
  });

  if (!resort) return [];

  const resorts = await db.resort.findMany({
    where: {
      is_active: true,
      id: { not: resortId },
      OR: [
        { category: resort.category },
        { atoll: resort.atoll },
        { price_range: resort.price_range },
      ],
    },
    orderBy: { overall_score: 'desc' },
    take: limit,
  });

  return resorts as Resort[];
}

/**
 * Get resorts that need verification (stale data)
 */
export async function getStaleResorts(
  siteId: string,
  staleDays: number = 90
): Promise<Resort[]> {
  const db = getTenantPrisma(siteId);
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - staleDays);

  const resorts = await db.resort.findMany({
    where: {
      is_active: true,
      OR: [
        { last_verified_at: null },
        { last_verified_at: { lt: staleDate } },
      ],
    },
    orderBy: { last_verified_at: 'asc' },
  });

  return resorts as Resort[];
}

// ============================================================================
// MUTATION FUNCTIONS
// ============================================================================

/**
 * Create a new resort
 */
export async function createResort(
  siteId: string,
  data: CreateResortInput
): Promise<Resort> {
  const db = getTenantPrisma(siteId);

  assertValidSlug(data.slug);

  // Check for duplicate slug
  const existing = await db.resort.findFirst({
    where: { slug: data.slug },
  });

  if (existing) {
    throw new Error(`Resort with slug "${data.slug}" already exists`);
  }

  const resort = await db.resort.create({
    data: {
      ...data,
      styles: data.styles || [],
      amenities: data.amenities || [],
      dining_options: data.dining_options || [],
      highlights_ar: data.highlights_ar || [],
      highlights_en: data.highlights_en || [],
      gallery_urls: data.gallery_urls || [],
      attributes_json: data.attributes_json || null,
      review_count: 0,
      is_active: true,
    },
  });

  return resort as Resort;
}

/**
 * Update a resort
 */
export async function updateResort(
  siteId: string,
  id: string,
  data: UpdateResortInput
): Promise<Resort> {
  const db = getTenantPrisma(siteId);

  // Verify resort exists and belongs to tenant
  const existing = await db.resort.findUnique({
    where: { id },
  });

  assertExists(existing, 'Resort', id);

  if (data.slug && data.slug !== existing.slug) {
    assertValidSlug(data.slug);

    // Check for duplicate slug
    const duplicate = await db.resort.findFirst({
      where: { slug: data.slug, id: { not: id } },
    });

    if (duplicate) {
      throw new Error(`Resort with slug "${data.slug}" already exists`);
    }
  }

  const resort = await db.resort.update({
    where: { id },
    data: {
      ...data,
      updated_at: new Date(),
    },
  });

  return resort as Resort;
}

/**
 * Delete a resort (soft delete by setting is_active = false)
 */
export async function deleteResort(
  siteId: string,
  id: string
): Promise<void> {
  const db = getTenantPrisma(siteId);

  const existing = await db.resort.findUnique({
    where: { id },
  });

  assertExists(existing, 'Resort', id);

  await db.resort.update({
    where: { id },
    data: { is_active: false },
  });
}

/**
 * Mark resort as verified
 */
export async function verifyResort(
  siteId: string,
  id: string,
  verifiedBy: string
): Promise<Resort> {
  const db = getTenantPrisma(siteId);

  const resort = await db.resort.update({
    where: { id },
    data: {
      last_verified_at: new Date(),
      verified_by: verifiedBy,
    },
  });

  return resort as Resort;
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate overall score from breakdown
 */
export function calculateOverallScore(breakdown: ScoreBreakdown): number {
  const weights: Record<keyof ScoreBreakdown, number> = {
    beach: 0.20,
    reef: 0.15,
    service: 0.20,
    dining: 0.15,
    value: 0.15,
    location: 0.10,
    rooms: 0.05,
  };

  let totalScore = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const score = breakdown[key as keyof ScoreBreakdown];
    if (score !== undefined && score !== null) {
      totalScore += score * weight;
      totalWeight += weight;
    }
  }

  // Normalize if not all scores present
  return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 10) / 10 : 0;
}

/**
 * Update resort score
 */
export async function updateResortScore(
  siteId: string,
  id: string,
  scoreBreakdown: ScoreBreakdown
): Promise<Resort> {
  const db = getTenantPrisma(siteId);
  const overallScore = calculateOverallScore(scoreBreakdown);

  const resort = await db.resort.update({
    where: { id },
    data: {
      score_breakdown: scoreBreakdown,
      overall_score: overallScore,
    },
  });

  return resort as Resort;
}

// ============================================================================
// TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Transform resort to public view
 */
export function toPublicView(resort: Resort, locale: 'ar' | 'en' = 'ar'): ResortPublicView {
  return {
    id: resort.id,
    slug: resort.slug,
    name: locale === 'ar' ? resort.name_ar : (resort.name_en || resort.name_ar),
    atoll: resort.atoll,
    island: resort.island,
    transfer_type: resort.transfer_type,
    transfer_duration: resort.transfer_duration,
    star_rating: resort.star_rating,
    category: resort.category,
    styles: resort.styles,
    price_range: resort.price_range,
    starting_price: resort.starting_price,
    all_inclusive: resort.all_inclusive,
    overall_score: resort.overall_score,
    review_count: resort.review_count,
    description: locale === 'ar' ? resort.description_ar : (resort.description_en || resort.description_ar),
    highlights: locale === 'ar' ? resort.highlights_ar : (resort.highlights_en.length > 0 ? resort.highlights_en : resort.highlights_ar),
    hero_image_url: resort.hero_image_url,
    gallery_urls: resort.gallery_urls,
    amenities: resort.amenities,
    attributes: resort.attributes_json,
    affiliate_url: resort.affiliate_url,
    is_featured: resort.is_featured,
  };
}

/**
 * Transform resort to card view (minimal data for listings)
 */
export function toCardView(resort: Resort, locale: 'ar' | 'en' = 'ar'): ResortCardView {
  return {
    id: resort.id,
    slug: resort.slug,
    name: locale === 'ar' ? resort.name_ar : (resort.name_en || resort.name_ar),
    atoll: resort.atoll,
    category: resort.category,
    price_range: resort.price_range,
    starting_price: resort.starting_price,
    overall_score: resort.overall_score,
    hero_image_url: resort.hero_image_url,
    is_featured: resort.is_featured,
    transfer_type: resort.transfer_type,
  };
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk import resorts from CSV/JSON
 */
export async function bulkImportResorts(
  siteId: string,
  resorts: CreateResortInput[]
): Promise<{ created: number; updated: number; errors: string[] }> {
  const db = getTenantPrisma(siteId);
  const errors: string[] = [];
  let created = 0;
  let updated = 0;

  for (const resortData of resorts) {
    try {
      assertValidSlug(resortData.slug);

      const existing = await db.resort.findFirst({
        where: { slug: resortData.slug },
      });

      if (existing) {
        await db.resort.update({
          where: { id: existing.id },
          data: {
            ...resortData,
            updated_at: new Date(),
          },
        });
        updated++;
      } else {
        await createResort(siteId, resortData);
        created++;
      }
    } catch (error) {
      errors.push(`Error importing ${resortData.slug}: ${(error as Error).message}`);
    }
  }

  return { created, updated, errors };
}
