export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { auditOnPublishUpdate } from '@/lib/audit-engine';

/**
 * Auto-run SEO audit on article publish/update
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleId, autoFix = true } = body;

    if (!articleId) {
      return NextResponse.json(
        { success: false, error: 'Article ID is required' },
        { status: 400 }
      );
    }

    // Run enhanced audit with auto-fix capabilities
    const auditResult = await auditOnPublishUpdate(articleId, autoFix);

    return NextResponse.json({
      success: true,
      audit: {
        score: auditResult.score,
        breakdown: auditResult.breakdown,
        quality_gate: auditResult.quality_gate,
        suggestions: auditResult.suggestions,
        metadata: auditResult.metadata
      },
      message: auditResult.score >= 85 
        ? 'Article passed SEO audit with high score'
        : auditResult.quality_gate.status === 'review'
        ? 'Article needs review before publishing'
        : 'Article requires improvements'
    });

  } catch (error) {
    console.error('SEO audit error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'SEO audit failed' 
      },
      { status: 500 }
    );
  }
}

/**
 * Get audit status for an article
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');

    if (!articleId) {
      return NextResponse.json(
        { success: false, error: 'Article ID is required' },
        { status: 400 }
      );
    }

    // Get latest audit result
    const { getAuditHistory } = await import('@/lib/audit-engine');
    const history = await getAuditHistory(articleId, 1);
    
    if (history.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No audit history found for this article'
      }, { status: 404 });
    }

    const latestAudit = history[0];
    
    return NextResponse.json({
      success: true,
      audit: {
        score: latestAudit.score,
        breakdown: latestAudit.breakdown,
        quality_gate: latestAudit.quality_gate,
        audit_date: latestAudit.audit_date,
        suggestions_count: latestAudit.suggestions.length
      }
    });

  } catch (error) {
    console.error('Get audit status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get audit status' 
      },
      { status: 500 }
    );
  }
}