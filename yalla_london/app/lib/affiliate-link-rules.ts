/**
 * Affiliate Link Rule Engine
 *
 * Provides flexible bulk affiliate link management:
 * - Assign affiliate partners to content by specific IDs
 * - Filter-based assignment: by category, tags, page_type, site, published status
 * - Service-based targeting: auto-match by partner_type to relevant content
 * - Priority and placement configuration
 * - Dry-run mode for previewing matches before applying
 */

import { prisma } from '@/lib/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContentTargetType =
  | 'blog_post'
  | 'place'
  | 'event'
  | 'page'
  | 'all';

export type BulkAction =
  | 'assign'
  | 'unassign'
  | 'activate'
  | 'deactivate'
  | 'update_priority'
  | 'update_placement';

export type LinkPlacement =
  | 'auto'
  | 'top'
  | 'bottom'
  | 'inline'
  | 'sidebar'
  | 'cta_button';

export interface ContentFilter {
  /** Category IDs to match */
  categories?: string[];
  /** Tags to match (any of) */
  tags?: string[];
  /** Page types to match (guide, place, event, list, faq, news, itinerary) */
  page_types?: string[];
  /** Site IDs to scope to */
  site_ids?: string[];
  /** Only published content */
  published_only?: boolean;
  /** Partner types to auto-match content to (hotel, ticket, restaurant, etc.) */
  partner_types?: string[];
  /** Keyword search in title */
  title_search?: string;
}

export interface BulkTargeting {
  /** "specific" = target exact content IDs, "filter" = use filters */
  mode: 'specific' | 'filter';
  /** Content type to target */
  content_type: ContentTargetType;
  /** For specific mode: list of content IDs */
  content_ids?: string[];
  /** For filter mode: filter criteria */
  filters?: ContentFilter;
}

export interface BulkAssignmentOptions {
  /** Link placement within content */
  link_position?: LinkPlacement;
  /** Assignment priority (1 = highest) */
  priority?: number;
  /** Max affiliate links per content item */
  max_links_per_content?: number;
  /** Skip content that already has this partner assigned */
  skip_existing?: boolean;
  /** Custom placement data (JSON) */
  placement_data?: Record<string, unknown>;
}

export interface BulkAffiliateRequest {
  action: BulkAction;
  /** Partner ID to assign */
  partner_id?: string;
  /** Widget ID to attach (optional) */
  widget_id?: string;
  /** Targeting configuration */
  targeting: BulkTargeting;
  /** Assignment options */
  options?: BulkAssignmentOptions;
  /** For update_priority action */
  new_priority?: number;
  /** For update_placement action */
  new_placement?: LinkPlacement;
  /** Dry run — return matching content without applying changes */
  dry_run?: boolean;
}

export interface BulkAffiliateResult {
  success: boolean;
  action: BulkAction;
  matched_count: number;
  affected_count: number;
  skipped_count: number;
  dry_run: boolean;
  /** Preview of matched content (in dry_run mode) */
  matched_content?: Array<{
    id: string;
    title: string;
    content_type: string;
    already_assigned?: boolean;
  }>;
  /** IDs of created/updated assignments */
  assignment_ids?: string[];
  errors?: string[];
}

// ---------------------------------------------------------------------------
// Content matching
// ---------------------------------------------------------------------------

/** Map partner_type to content tags/categories that are relevant */
const PARTNER_TYPE_CONTENT_MAP: Record<string, string[]> = {
  hotel: ['hotel', 'hotels', 'accommodation', 'stay', 'resort', 'booking', 'lodging'],
  ticket: ['ticket', 'tickets', 'event', 'events', 'show', 'concert', 'match', 'stadium'],
  restaurant: ['restaurant', 'restaurants', 'food', 'dining', 'eat', 'cuisine', 'cafe'],
  attraction: ['attraction', 'attractions', 'museum', 'landmark', 'sightseeing', 'tour'],
  experience: ['experience', 'experiences', 'activity', 'activities', 'tour', 'adventure'],
  shopping: ['shopping', 'shop', 'market', 'bazaar', 'mall', 'souk', 'retail'],
  transport: ['transport', 'transfer', 'taxi', 'bus', 'train', 'flight', 'airport'],
  car: ['car', 'rental', 'car-rental', 'drive', 'vehicle'],
};

/**
 * Resolve content IDs from targeting configuration.
 * Handles both "specific" (direct IDs) and "filter" (query-based) modes.
 */
export async function resolveTargetContent(
  targeting: BulkTargeting,
): Promise<Array<{ id: string; title: string; content_type: string }>> {
  if (targeting.mode === 'specific' && targeting.content_ids?.length) {
    return resolveSpecificContent(targeting.content_type, targeting.content_ids);
  }

  if (targeting.mode === 'filter' && targeting.filters) {
    return resolveFilteredContent(targeting.content_type, targeting.filters);
  }

  return [];
}

async function resolveSpecificContent(
  contentType: ContentTargetType,
  ids: string[],
): Promise<Array<{ id: string; title: string; content_type: string }>> {
  const results: Array<{ id: string; title: string; content_type: string }> = [];

  if (contentType === 'blog_post' || contentType === 'all') {
    const posts = await prisma.blogPost.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, title_en: true },
    });
    results.push(
      ...posts.map((p) => ({ id: p.id, title: p.title_en, content_type: 'blog_post' })),
    );
  }

  if (contentType === 'place' || contentType === 'all') {
    const places = await prisma.place.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    results.push(
      ...places.map((p) => ({ id: p.id, title: p.name, content_type: 'place' })),
    );
  }

  if (contentType === 'event' || contentType === 'all') {
    const events = await prisma.event.findMany({
      where: { id: { in: ids } },
      select: { id: true, title_en: true },
    });
    results.push(
      ...events.map((e) => ({ id: e.id, title: e.title_en, content_type: 'event' })),
    );
  }

  return results;
}

async function resolveFilteredContent(
  contentType: ContentTargetType,
  filters: ContentFilter,
): Promise<Array<{ id: string; title: string; content_type: string }>> {
  const results: Array<{ id: string; title: string; content_type: string }> = [];

  // Blog posts
  if (contentType === 'blog_post' || contentType === 'all') {
    const where: Record<string, unknown> = { deletedAt: null };

    if (filters.published_only) {
      where.published = true;
    }

    if (filters.categories?.length) {
      where.category_id = { in: filters.categories };
    }

    if (filters.tags?.length) {
      where.tags = { hasSome: filters.tags };
    }

    if (filters.page_types?.length) {
      where.page_type = { in: filters.page_types };
    }

    if (filters.site_ids?.length) {
      where.siteId = { in: filters.site_ids };
    }

    if (filters.title_search) {
      where.OR = [
        { title_en: { contains: filters.title_search, mode: 'insensitive' } },
        { title_ar: { contains: filters.title_search, mode: 'insensitive' } },
      ];
    }

    // Auto-match by partner type keywords in tags/title
    if (filters.partner_types?.length) {
      const keywords = filters.partner_types.flatMap(
        (pt) => PARTNER_TYPE_CONTENT_MAP[pt] || [],
      );
      if (keywords.length > 0) {
        where.OR = [
          { tags: { hasSome: keywords } },
          ...keywords.map((kw) => ({
            title_en: { contains: kw, mode: 'insensitive' as const },
          })),
        ];
      }
    }

    const posts = await prisma.blogPost.findMany({
      where: where as any,
      select: { id: true, title_en: true },
      take: 500, // Safety cap
    });

    results.push(
      ...posts.map((p) => ({ id: p.id, title: p.title_en, content_type: 'blog_post' })),
    );
  }

  // Places
  if (contentType === 'place' || contentType === 'all') {
    const where: Record<string, unknown> = {};

    if (filters.tags?.length) {
      where.tags = { hasSome: filters.tags };
    }

    if (filters.title_search) {
      where.name = { contains: filters.title_search, mode: 'insensitive' };
    }

    if (filters.partner_types?.length) {
      const placeCategories = filters.partner_types.flatMap((pt) => {
        if (pt === 'hotel') return ['hotel'];
        if (pt === 'restaurant') return ['restaurant'];
        if (pt === 'attraction') return ['attraction', 'museum', 'landmark'];
        if (pt === 'experience') return ['attraction', 'activity'];
        if (pt === 'shopping') return ['market', 'mall', 'shop'];
        return [];
      });
      if (placeCategories.length > 0) {
        where.category = { in: placeCategories };
      }
    }

    const places = await prisma.place.findMany({
      where: where as any,
      select: { id: true, name: true },
      take: 500,
    });

    results.push(
      ...places.map((p) => ({ id: p.id, title: p.name, content_type: 'place' })),
    );
  }

  // Events
  if (contentType === 'event' || contentType === 'all') {
    const where: Record<string, unknown> = {};

    if (filters.published_only) {
      where.published = true;
    }

    if (filters.site_ids?.length) {
      where.siteId = { in: filters.site_ids };
    }

    if (filters.title_search) {
      where.OR = [
        { title_en: { contains: filters.title_search, mode: 'insensitive' } },
      ];
    }

    if (filters.partner_types?.length) {
      // Events relate to tickets and experiences
      const ticketTypes = ['ticket', 'experience'];
      if (filters.partner_types.some((pt) => ticketTypes.includes(pt))) {
        // Events are inherently ticket/experience content — include all
      } else {
        // Non-ticket partner types don't map to events
        return results;
      }
    }

    const events = await prisma.event.findMany({
      where: where as any,
      select: { id: true, title_en: true },
      take: 500,
    });

    results.push(
      ...events.map((e) => ({ id: e.id, title: e.title_en, content_type: 'event' })),
    );
  }

  return results;
}

// ---------------------------------------------------------------------------
// Bulk operations
// ---------------------------------------------------------------------------

/**
 * Execute a bulk affiliate link operation.
 */
export async function executeBulkAffiliateOperation(
  request: BulkAffiliateRequest,
  userId: string,
): Promise<BulkAffiliateResult> {
  const { action, targeting, dry_run = false } = request;

  // Resolve target content
  const matchedContent = await resolveTargetContent(targeting);

  if (matchedContent.length === 0) {
    return {
      success: true,
      action,
      matched_count: 0,
      affected_count: 0,
      skipped_count: 0,
      dry_run,
      matched_content: [],
      errors: [],
    };
  }

  // Check existing assignments for skip_existing logic
  let existingAssignments: Set<string> = new Set();
  if (request.partner_id) {
    const existing = await prisma.affiliateAssignment.findMany({
      where: {
        partner_id: request.partner_id,
        content_id: { in: matchedContent.map((c) => c.id) },
      },
      select: { content_id: true, id: true },
    });
    existingAssignments = new Set(existing.map((e) => e.content_id));
  }

  // Annotate content with existing assignment status
  const annotatedContent = matchedContent.map((c) => ({
    ...c,
    already_assigned: existingAssignments.has(c.id),
  }));

  if (dry_run) {
    return {
      success: true,
      action,
      matched_count: matchedContent.length,
      affected_count: 0,
      skipped_count: 0,
      dry_run: true,
      matched_content: annotatedContent,
    };
  }

  // Execute the action
  switch (action) {
    case 'assign':
      return executeAssign(request, annotatedContent, userId);
    case 'unassign':
      return executeUnassign(request, matchedContent);
    case 'activate':
      return executeToggleActive(request, matchedContent, true);
    case 'deactivate':
      return executeToggleActive(request, matchedContent, false);
    case 'update_priority':
      return executeUpdatePriority(request, matchedContent);
    case 'update_placement':
      return executeUpdatePlacement(request, matchedContent);
    default:
      return {
        success: false,
        action,
        matched_count: matchedContent.length,
        affected_count: 0,
        skipped_count: 0,
        dry_run: false,
        errors: [`Unknown action: ${action}`],
      };
  }
}

async function executeAssign(
  request: BulkAffiliateRequest,
  content: Array<{ id: string; title: string; content_type: string; already_assigned: boolean }>,
  userId: string,
): Promise<BulkAffiliateResult> {
  const { partner_id, widget_id, options = {} } = request;
  const {
    link_position = 'auto',
    priority = 1,
    max_links_per_content = 5,
    skip_existing = true,
    placement_data,
  } = options;

  if (!partner_id) {
    return {
      success: false,
      action: 'assign',
      matched_count: content.length,
      affected_count: 0,
      skipped_count: 0,
      dry_run: false,
      errors: ['partner_id is required for assign action'],
    };
  }

  // Verify partner exists
  const partner = await prisma.affiliatePartner.findUnique({
    where: { id: partner_id },
    select: { id: true, siteId: true },
  });

  if (!partner) {
    return {
      success: false,
      action: 'assign',
      matched_count: content.length,
      affected_count: 0,
      skipped_count: 0,
      dry_run: false,
      errors: ['Partner not found'],
    };
  }

  const assignmentIds: string[] = [];
  let skipped = 0;
  const errors: string[] = [];

  for (const item of content) {
    // Skip if already assigned and skip_existing is true
    if (skip_existing && item.already_assigned) {
      skipped++;
      continue;
    }

    // Check max links per content
    const existingCount = await prisma.affiliateAssignment.count({
      where: {
        content_id: item.id,
        content_type: item.content_type,
        is_active: true,
      },
    });

    if (existingCount >= max_links_per_content) {
      skipped++;
      continue;
    }

    try {
      const assignment = await prisma.affiliateAssignment.create({
        data: {
          siteId: partner.siteId,
          partner_id,
          widget_id: widget_id || null,
          content_id: item.id,
          content_type: item.content_type,
          placement_data: {
            position: link_position,
            ...placement_data,
          },
          priority,
          is_active: true,
          createdById: userId,
        },
      });
      assignmentIds.push(assignment.id);
    } catch (err) {
      errors.push(`Failed to assign to ${item.content_type}:${item.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }

  // Audit log
  await logBulkAffiliateAction('assign', {
    partner_id,
    widget_id,
    content_count: content.length,
    assigned_count: assignmentIds.length,
    skipped_count: skipped,
    link_position,
    priority,
  });

  return {
    success: true,
    action: 'assign',
    matched_count: content.length,
    affected_count: assignmentIds.length,
    skipped_count: skipped,
    dry_run: false,
    assignment_ids: assignmentIds,
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function executeUnassign(
  request: BulkAffiliateRequest,
  content: Array<{ id: string; content_type: string }>,
): Promise<BulkAffiliateResult> {
  const where: Record<string, unknown> = {
    content_id: { in: content.map((c) => c.id) },
  };

  if (request.partner_id) {
    where.partner_id = request.partner_id;
  }

  const result = await prisma.affiliateAssignment.deleteMany({ where: where as any });

  await logBulkAffiliateAction('unassign', {
    partner_id: request.partner_id,
    content_count: content.length,
    deleted_count: result.count,
  });

  return {
    success: true,
    action: 'unassign',
    matched_count: content.length,
    affected_count: result.count,
    skipped_count: 0,
    dry_run: false,
  };
}

async function executeToggleActive(
  request: BulkAffiliateRequest,
  content: Array<{ id: string }>,
  active: boolean,
): Promise<BulkAffiliateResult> {
  const where: Record<string, unknown> = {
    content_id: { in: content.map((c) => c.id) },
  };

  if (request.partner_id) {
    where.partner_id = request.partner_id;
  }

  const result = await prisma.affiliateAssignment.updateMany({
    where: where as any,
    data: { is_active: active, updated_at: new Date() },
  });

  await logBulkAffiliateAction(active ? 'activate' : 'deactivate', {
    partner_id: request.partner_id,
    content_count: content.length,
    affected_count: result.count,
  });

  return {
    success: true,
    action: active ? 'activate' : 'deactivate',
    matched_count: content.length,
    affected_count: result.count,
    skipped_count: 0,
    dry_run: false,
  };
}

async function executeUpdatePriority(
  request: BulkAffiliateRequest,
  content: Array<{ id: string }>,
): Promise<BulkAffiliateResult> {
  const newPriority = request.new_priority ?? 1;

  const where: Record<string, unknown> = {
    content_id: { in: content.map((c) => c.id) },
  };

  if (request.partner_id) {
    where.partner_id = request.partner_id;
  }

  const result = await prisma.affiliateAssignment.updateMany({
    where: where as any,
    data: { priority: newPriority, updated_at: new Date() },
  });

  await logBulkAffiliateAction('update_priority', {
    partner_id: request.partner_id,
    new_priority: newPriority,
    affected_count: result.count,
  });

  return {
    success: true,
    action: 'update_priority',
    matched_count: content.length,
    affected_count: result.count,
    skipped_count: 0,
    dry_run: false,
  };
}

async function executeUpdatePlacement(
  request: BulkAffiliateRequest,
  content: Array<{ id: string }>,
): Promise<BulkAffiliateResult> {
  const newPlacement = request.new_placement ?? 'auto';

  const where: Record<string, unknown> = {
    content_id: { in: content.map((c) => c.id) },
  };

  if (request.partner_id) {
    where.partner_id = request.partner_id;
  }

  // For placement updates, we need to update the JSON field
  const assignments = await prisma.affiliateAssignment.findMany({
    where: where as any,
    select: { id: true, placement_data: true },
  });

  let affected = 0;
  for (const assignment of assignments) {
    const existingData = (assignment.placement_data as Record<string, unknown>) || {};
    await prisma.affiliateAssignment.update({
      where: { id: assignment.id },
      data: {
        placement_data: { ...existingData, position: newPlacement },
        updated_at: new Date(),
      },
    });
    affected++;
  }

  await logBulkAffiliateAction('update_placement', {
    partner_id: request.partner_id,
    new_placement: newPlacement,
    affected_count: affected,
  });

  return {
    success: true,
    action: 'update_placement',
    matched_count: content.length,
    affected_count: affected,
    skipped_count: 0,
    dry_run: false,
  };
}

// ---------------------------------------------------------------------------
// Audit logging
// ---------------------------------------------------------------------------

async function logBulkAffiliateAction(
  action: string,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: `bulk_affiliate_${action}`,
        resource: 'AffiliateAssignment',
        resourceId: details.partner_id as string || 'bulk',
        details: {
          ...details,
          timestamp: new Date().toISOString(),
        },
        success: true,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log for bulk affiliate action:', err);
  }
}

// ---------------------------------------------------------------------------
// Utility: get assignment summary for dashboard
// ---------------------------------------------------------------------------

export async function getAffiliateAssignmentSummary(siteId?: string) {
  const where: Record<string, unknown> = {};
  if (siteId) {
    where.siteId = siteId;
  }

  const [total, active, byContentType, byPartner] = await Promise.all([
    prisma.affiliateAssignment.count({ where: where as any }),
    prisma.affiliateAssignment.count({
      where: { ...where, is_active: true } as any,
    }),
    prisma.affiliateAssignment.groupBy({
      by: ['content_type'],
      where: where as any,
      _count: true,
    }),
    prisma.affiliateAssignment.groupBy({
      by: ['partner_id'],
      where: where as any,
      _count: true,
      _sum: { clicks: true, conversions: true, revenue: true },
    }),
  ]);

  return {
    total_assignments: total,
    active_assignments: active,
    by_content_type: byContentType.map((ct) => ({
      content_type: ct.content_type,
      count: ct._count,
    })),
    by_partner: byPartner.map((p) => ({
      partner_id: p.partner_id,
      count: p._count,
      clicks: p._sum.clicks || 0,
      conversions: p._sum.conversions || 0,
      revenue: p._sum.revenue || 0,
    })),
  };
}
