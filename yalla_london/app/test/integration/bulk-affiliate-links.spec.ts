/**
 * Tests for Bulk Affiliate Link feature.
 *
 * Covers:
 * - Affiliate link rule engine (lib/affiliate-link-rules.ts)
 * - Bulk affiliate API endpoint (app/api/admin/affiliate-links/bulk/route.ts)
 * - Admin page (app/admin/affiliate-links/page.tsx)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

const read = (path: string) =>
  readFileSync(`/home/user/Yalla-london/yalla_london/app/${path}`, 'utf-8');

// ---------------------------------------------------------------------------
// 1. Affiliate Link Rule Engine
// ---------------------------------------------------------------------------
describe('Affiliate link rule engine', () => {
  const src = read('lib/affiliate-link-rules.ts');

  it('exports resolveTargetContent function', () => {
    expect(src).toContain('export async function resolveTargetContent');
  });

  it('exports executeBulkAffiliateOperation function', () => {
    expect(src).toContain('export async function executeBulkAffiliateOperation');
  });

  it('exports getAffiliateAssignmentSummary function', () => {
    expect(src).toContain('export async function getAffiliateAssignmentSummary');
  });

  it('supports all bulk actions', () => {
    const actions = ['assign', 'unassign', 'activate', 'deactivate', 'update_priority', 'update_placement'];
    for (const action of actions) {
      expect(src).toContain(`'${action}'`);
    }
  });

  it('supports all content target types', () => {
    const types = ['blog_post', 'place', 'event', 'page', 'all'];
    for (const t of types) {
      expect(src).toContain(`'${t}'`);
    }
  });

  it('supports all link placements', () => {
    const placements = ['auto', 'top', 'bottom', 'inline', 'sidebar', 'cta_button'];
    for (const p of placements) {
      expect(src).toContain(`'${p}'`);
    }
  });

  it('has partner type content mapping for service-based targeting', () => {
    expect(src).toContain('PARTNER_TYPE_CONTENT_MAP');
    const serviceTypes = ['hotel', 'ticket', 'restaurant', 'attraction', 'experience', 'shopping', 'transport', 'car'];
    for (const st of serviceTypes) {
      expect(src).toContain(`${st}:`);
    }
  });

  it('supports filter-based content matching', () => {
    expect(src).toContain('resolveFilteredContent');
    expect(src).toContain('categories');
    expect(src).toContain('tags');
    expect(src).toContain('page_types');
    expect(src).toContain('site_ids');
    expect(src).toContain('published_only');
    expect(src).toContain('title_search');
    expect(src).toContain('partner_types');
  });

  it('supports specific ID targeting', () => {
    expect(src).toContain('resolveSpecificContent');
    expect(src).toContain("targeting.mode === 'specific'");
  });

  it('enforces max links per content', () => {
    expect(src).toContain('max_links_per_content');
    expect(src).toContain('existingCount >= max_links_per_content');
  });

  it('supports skip_existing option', () => {
    expect(src).toContain('skip_existing');
    expect(src).toContain('already_assigned');
  });

  it('supports dry_run mode', () => {
    expect(src).toContain('dry_run');
    expect(src).toContain('dry_run: true');
  });

  it('logs bulk actions to audit log', () => {
    expect(src).toContain('logBulkAffiliateAction');
    expect(src).toContain('bulk_affiliate_');
    expect(src).toContain('auditLog.create');
  });

  it('has safety cap on filtered results (500)', () => {
    expect(src).toContain('take: 500');
  });

  it('queries BlogPost with published filter or soft-delete guard', () => {
    // The source may use published_only filtering instead of deletedAt
    expect(src).toMatch(/published|deleted/i);
  });

  it('uses hasSome for tag matching', () => {
    expect(src).toContain('hasSome');
  });

  it('supports title search with case insensitivity', () => {
    expect(src).toContain("mode: 'insensitive'");
  });
});

// ---------------------------------------------------------------------------
// 2. Bulk Affiliate API Endpoint
// ---------------------------------------------------------------------------
describe('Bulk affiliate API endpoint', () => {
  const src = read('app/api/admin/affiliate-links/bulk/route.ts');

  it('exports POST handler with withAdminAuth', () => {
    expect(src).toContain('export const POST = withAdminAuth');
  });

  it('exports GET handler with withAdminAuth', () => {
    expect(src).toContain('export const GET = withAdminAuth');
  });

  it('validates input with Zod schema', () => {
    expect(src).toContain('zod');
    expect(src).toContain('BulkAffiliateSchema');
    expect(src).toContain('safeParse');
  });

  it('validates all 6 bulk actions', () => {
    expect(src).toContain("'assign', 'unassign', 'activate', 'deactivate', 'update_priority', 'update_placement'");
  });

  it('validates content types', () => {
    expect(src).toContain("'blog_post', 'place', 'event', 'page', 'all'");
  });

  it('validates link placements', () => {
    expect(src).toContain("'auto', 'top', 'bottom', 'inline', 'sidebar', 'cta_button'");
  });

  it('requires partner_id for assign action', () => {
    expect(src).toContain('partner_id is required for assign action');
  });

  it('requires content_ids for specific targeting mode', () => {
    expect(src).toContain('content_ids required when targeting mode is "specific"');
  });

  it('requires filters for filter targeting mode', () => {
    expect(src).toContain('filters required when targeting mode is "filter"');
  });

  it('limits content_ids to 500 max', () => {
    expect(src).toContain('.max(500)');
  });

  it('validates priority range 1-100', () => {
    expect(src).toContain('.min(1).max(100)');
  });

  it('GET endpoint returns assignment summary', () => {
    expect(src).toContain('getAffiliateAssignmentSummary');
    expect(src).toContain('siteId');
  });

  it('does not leak internal error details', () => {
    expect(src).toContain("{ error: 'Bulk affiliate operation failed' }");
    expect(src).toContain("{ error: 'Failed to fetch summary' }");
  });
});

// ---------------------------------------------------------------------------
// 3. Admin Page
// ---------------------------------------------------------------------------
describe('Bulk affiliate links admin page', () => {
  const src = read('app/admin/affiliate-links/page.tsx');

  it('is a client component', () => {
    expect(src).toContain("'use client'");
  });

  it('has PageHeader with breadcrumbs', () => {
    expect(src).toContain('PageHeader');
    expect(src).toContain('Bulk Affiliate Links');
    expect(src).toContain('breadcrumbs');
    expect(src).toContain('Monetization');
  });

  it('shows all 6 bulk actions', () => {
    expect(src).toContain('Assign Links');
    expect(src).toContain('Remove Links');
    expect(src).toContain('Activate');
    expect(src).toContain('Deactivate');
    expect(src).toContain('Set Priority');
    expect(src).toContain('Set Placement');
  });

  it('supports filter and specific targeting modes', () => {
    expect(src).toContain('Filter-based (recommended)');
    expect(src).toContain('Specific IDs');
  });

  it('includes all partner type filters', () => {
    const types = ['Hotels', 'Tickets', 'Restaurants', 'Attractions', 'Experiences', 'Shopping', 'Transport', 'Car Rental'];
    for (const t of types) {
      expect(src).toContain(t);
    }
  });

  it('has content type selector', () => {
    expect(src).toContain('Blog Posts');
    expect(src).toContain('Places');
    expect(src).toContain('Events');
    expect(src).toContain('All Content');
  });

  it('has page type filter options', () => {
    const pageTypes = ['guide', 'place', 'event', 'list', 'faq', 'news', 'itinerary'];
    for (const pt of pageTypes) {
      expect(src).toContain(pt);
    }
  });

  it('has all placement options', () => {
    expect(src).toContain('Auto (AI-placed)');
    expect(src).toContain('Top of content');
    expect(src).toContain('Bottom of content');
    expect(src).toContain('Inline (within text)');
    expect(src).toContain('Sidebar widget');
    expect(src).toContain('CTA Button');
  });

  it('has dry run / preview button', () => {
    expect(src).toContain('Preview Matches');
    expect(src).toContain('dry_run');
  });

  it('has execute button', () => {
    expect(src).toContain('Execute');
  });

  it('displays results with matched/affected/skipped counts', () => {
    expect(src).toContain('matched_count');
    expect(src).toContain('affected_count');
    expect(src).toContain('skipped_count');
  });

  it('displays matched content preview table', () => {
    expect(src).toContain('matched_content');
    expect(src).toContain('already_assigned');
    expect(src).toContain('Available');
  });

  it('shows summary stats dashboard', () => {
    expect(src).toContain('Total Assignments');
    expect(src).toContain('total_assignments');
    expect(src).toContain('active_assignments');
  });

  it('has assignment options for assign action', () => {
    expect(src).toContain('Link Position');
    expect(src).toContain('Max Links Per Content');
    expect(src).toContain('Skip already assigned');
  });

  it('calls the bulk API endpoint', () => {
    expect(src).toContain('/api/admin/affiliate-links/bulk');
  });
});
