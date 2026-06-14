/**
 * Bulk Affiliate Link Operations API
 *
 * POST /api/admin/affiliate-links/bulk
 *   Actions: assign, unassign, activate, deactivate, update_priority, update_placement
 *   Supports specific content IDs or filter-based targeting
 *   Dry-run mode for previewing matches
 *
 * GET /api/admin/affiliate-links/bulk
 *   Returns assignment summary stats for the dashboard
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { z } from 'zod';
import {
  executeBulkAffiliateOperation,
  getAffiliateAssignmentSummary,
  type BulkAffiliateRequest,
} from '@/lib/affiliate-link-rules';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const ContentFilterSchema = z.object({
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  page_types: z.array(z.string()).optional(),
  site_ids: z.array(z.string()).optional(),
  published_only: z.boolean().optional(),
  partner_types: z.array(z.string()).optional(),
  title_search: z.string().optional(),
});

const BulkTargetingSchema = z.object({
  mode: z.enum(['specific', 'filter']),
  content_type: z.enum(['blog_post', 'place', 'event', 'page', 'all']),
  content_ids: z.array(z.string()).max(500).optional(),
  filters: ContentFilterSchema.optional(),
});

const BulkOptionsSchema = z.object({
  link_position: z.enum(['auto', 'top', 'bottom', 'inline', 'sidebar', 'cta_button']).optional(),
  priority: z.number().int().min(1).max(100).optional(),
  max_links_per_content: z.number().int().min(1).max(20).optional(),
  skip_existing: z.boolean().optional(),
  placement_data: z.record(z.unknown()).optional(),
});

const BulkAffiliateSchema = z.object({
  action: z.enum(['assign', 'unassign', 'activate', 'deactivate', 'update_priority', 'update_placement']),
  partner_id: z.string().optional(),
  widget_id: z.string().optional(),
  targeting: BulkTargetingSchema,
  options: BulkOptionsSchema.optional(),
  new_priority: z.number().int().min(1).max(100).optional(),
  new_placement: z.enum(['auto', 'top', 'bottom', 'inline', 'sidebar', 'cta_button']).optional(),
  dry_run: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// POST — Execute bulk affiliate operation
// ---------------------------------------------------------------------------

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();

    const validation = BulkAffiliateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid bulk affiliate request',
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const data = validation.data as BulkAffiliateRequest;

    // Require partner_id for assign action
    if (data.action === 'assign' && !data.partner_id) {
      return NextResponse.json(
        { error: 'partner_id is required for assign action' },
        { status: 400 },
      );
    }

    // Require content_ids for specific mode
    if (data.targeting.mode === 'specific' && (!data.targeting.content_ids || data.targeting.content_ids.length === 0)) {
      return NextResponse.json(
        { error: 'content_ids required when targeting mode is "specific"' },
        { status: 400 },
      );
    }

    // Require filters for filter mode
    if (data.targeting.mode === 'filter' && !data.targeting.filters) {
      return NextResponse.json(
        { error: 'filters required when targeting mode is "filter"' },
        { status: 400 },
      );
    }

    // Execute the bulk operation
    const userId = 'admin'; // From auth context in production
    const result = await executeBulkAffiliateOperation(data, userId);

    return NextResponse.json({
      success: result.success,
      ...result,
    });
  } catch (error) {
    console.error('Bulk affiliate operation failed:', error);
    return NextResponse.json(
      { error: 'Bulk affiliate operation failed' },
      { status: 500 },
    );
  }
});

// ---------------------------------------------------------------------------
// GET — Assignment summary stats
// ---------------------------------------------------------------------------

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId') || undefined;

    const summary = await getAffiliateAssignmentSummary(siteId);

    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    console.error('Failed to fetch affiliate assignment summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summary' },
      { status: 500 },
    );
  }
});
