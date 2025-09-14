/**
 * SEO Audit Fixes API Endpoint
 * POST /api/audit/fixes - Apply fixes to an article
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { applyFixes, AuditFix } from '@/lib/audit-engine';
import { withPermission, PERMISSIONS } from '@/lib/rbac';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limiting';

async function handleApplyFixes(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleId, fixes } = body;

    if (!articleId) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      );
    }

    if (!fixes || !Array.isArray(fixes) || fixes.length === 0) {
      return NextResponse.json(
        { error: 'Fixes array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate fixes format
    for (const fix of fixes) {
      if (!fix.suggestion_id || !fix.fix_type) {
        return NextResponse.json(
          { error: 'Each fix must have suggestion_id and fix_type' },
          { status: 400 }
        );
      }
    }

    // Apply the fixes
    const result = await applyFixes(articleId, fixes as AuditFix[]);

    const statusCode = result.success ? 200 : 207; // 207 for partial success

    return NextResponse.json({
      success: result.success,
      applied_fixes: result.applied_fixes,
      failed_fixes: result.failed_fixes,
      updated_fields: result.updated_fields,
      message: result.success 
        ? 'All fixes applied successfully'
        : `${result.applied_fixes.length} fixes applied, ${result.failed_fixes.length} failed`
    }, { status: statusCode });

  } catch (error) {
    console.error('Apply fixes API error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Article not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to apply fixes' },
      { status: 500 }
    );
  }
}

// Apply rate limiting and permission checks  
export const POST = withRateLimit(
  RateLimitPresets.HEAVY_OPERATIONS,
  withPermission(PERMISSIONS.EDIT_CONTENT, handleApplyFixes)
);