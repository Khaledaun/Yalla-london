/**
 * SEO Audit API Endpoint
 * POST /api/audit/article - Audit a specific article
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auditArticle } from '@/lib/audit-engine';
import { withPermission, PERMISSIONS } from '@/lib/rbac';
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limiting';

async function handleAuditRequest(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleId } = body;

    if (!articleId) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      );
    }

    // Perform the audit
    const auditResult = await auditArticle(articleId);

    return NextResponse.json({
      success: true,
      audit: auditResult,
      message: 'Article audit completed successfully'
    });

  } catch (error) {
    console.error('Audit API error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Article not found' },
          { status: 404 }
        );
      }
      
      if (error.message.includes('not enabled')) {
        return NextResponse.json(
          { error: 'Audit feature is not enabled' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to audit article' },
      { status: 500 }
    );
  }
}

// Apply rate limiting and permission checks
export const POST = withRateLimit(
  RateLimitPresets.HEAVY_OPERATIONS,
  withPermission(PERMISSIONS.EDIT_CONTENT, handleAuditRequest)
);