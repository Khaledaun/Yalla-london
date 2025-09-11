
/**
 * Phase 4B Content Publishing API
 * Automated publishing with SEO validation
 */
import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { prisma } from '@/lib/db';

interface PublishRequest {
  contentId: string;
  publishAt?: string; // ISO date string for scheduling
  skipSeoAudit?: boolean;
}

interface SEOAuditResult {
  score: number;
  issues: string[];
  recommendations: string[];
  passed: boolean;
}

async function performSEOAudit(content: any): Promise<SEOAuditResult> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // Title checks
  if (!content.seoTitle || content.seoTitle.length < 30) {
    issues.push('SEO title too short (minimum 30 characters)');
    score -= 15;
  }
  if (content.seoTitle && content.seoTitle.length > 60) {
    issues.push('SEO title too long (maximum 60 characters)');
    score -= 10;
  }

  // Meta description checks
  if (!content.seoDescription || content.seoDescription.length < 120) {
    issues.push('Meta description too short (minimum 120 characters)');
    score -= 15;
  }
  if (content.seoDescription && content.seoDescription.length > 160) {
    issues.push('Meta description too long (maximum 160 characters)');
    score -= 10;
  }

  // Content length check
  if (!content.content || content.content.length < 500) {
    issues.push('Content too short (minimum 500 characters)');
    score -= 20;
  }

  // Image alt text check (basic)
  if (content.content && content.content.includes('<img') && !content.content.includes('alt=')) {
    issues.push('Images missing alt text');
    score -= 10;
  }

  // Headings structure check
  const headingCount = (content.content?.match(/<h[2-6]/g) || []).length;
  if (headingCount < 2) {
    issues.push('Content needs more headings for better structure');
    score -= 10;
  }

  // Excerpt check
  if (!content.excerpt || content.excerpt.length < 50) {
    issues.push('Excerpt too short or missing');
    score -= 5;
  }

  // Tags check
  if (!content.tags || content.tags.length < 2) {
    issues.push('Content needs at least 2 relevant tags');
    score -= 5;
  }

  // Generate recommendations based on issues
  if (issues.length > 0) {
    recommendations.push('Review and fix the identified SEO issues before publishing');
  }
  if (score >= 90) {
    recommendations.push('Excellent SEO optimization! Ready to publish.');
  } else if (score >= 70) {
    recommendations.push('Good SEO foundation. Consider addressing minor issues.');
  } else {
    recommendations.push('Significant SEO improvements needed before publishing.');
  }

  return {
    score: Math.max(0, score),
    issues,
    recommendations,
    passed: score >= 70, // Minimum threshold for auto-publishing
  };
}

export async function POST(request: NextRequest) {
  try {
    const flags = getFeatureFlags();
    
    if (!flags.PHASE4B_ENABLED || !flags.AUTO_PUBLISHING) {
      return NextResponse.json(
        { error: 'Auto-publishing feature is disabled' },
        { status: 403 }
      );
    }

    const { contentId, publishAt, skipSeoAudit }: PublishRequest = await request.json();

    if (!contentId) {
      return NextResponse.json(
        { error: 'Content ID is required' },
        { status: 400 }
      );
    }

    // Get content draft
    const content = await prisma.content.findFirst({
      where: {
        id: contentId,
        status: 'draft'
      }
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found or not in draft status' },
        { status: 404 }
      );
    }

    let seoAudit: SEOAuditResult | null = null;

    // Perform SEO audit if enabled
    if (!skipSeoAudit && flags.SEO_AUDIT_GATE) {
      seoAudit = await performSEOAudit(content);
      
      if (!seoAudit.passed) {
        return NextResponse.json({
          success: false,
          error: 'Content failed SEO audit',
          seoAudit,
          content: {
            id: content.id,
            title: content.title,
            status: content.status
          }
        }, { status: 422 });
      }
    }

    // Determine publish time
    const publishTime = publishAt ? new Date(publishAt) : new Date();
    const isScheduled = publishTime > new Date();

    // Update content status
    const updatedContent = await prisma.content.update({
      where: { id: contentId },
      data: {
        status: isScheduled ? 'scheduled' : 'published',
        publishedAt: publishTime,
        updatedAt: new Date(),
        metadata: {
          ...content.metadata,
          publishedBy: 'auto-publisher',
          seoAuditScore: seoAudit?.score,
          publishedAt: new Date().toISOString(),
        }
      }
    });

    // Log publishing activity
    await prisma.activityLog.create({
      data: {
        action: isScheduled ? 'content_scheduled' : 'content_published',
        entityType: 'content',
        entityId: contentId,
        details: {
          contentTitle: content.title,
          publishTime: publishTime.toISOString(),
          seoScore: seoAudit?.score,
          automated: true,
        },
        performedBy: 'system',
      }
    });

    return NextResponse.json({
      success: true,
      content: updatedContent,
      seoAudit,
      publishTime,
      isScheduled,
      message: isScheduled ? 'Content scheduled successfully' : 'Content published successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Publishing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to publish content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const flags = getFeatureFlags();
    
    if (!flags.PHASE4B_ENABLED) {
      return NextResponse.json(
        { error: 'Phase 4B features are disabled' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'published';
    const locale = searchParams.get('locale');
    const limit = parseInt(searchParams.get('limit') || '20');
    const days = parseInt(searchParams.get('days') || '7');

    const whereClause: any = { status };
    if (locale) {
      whereClause.locale = locale;
    }

    // Filter by date range
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    whereClause.publishedAt = {
      gte: dateFrom
    };

    const publishedContent = await prisma.content.findMany({
      where: whereClause,
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        publishedAt: true,
        locale: true,
        category: true,
        tags: true,
        metadata: true,
        createdAt: true,
      }
    });

    // Get publishing stats
    const stats = await prisma.content.groupBy({
      by: ['status', 'locale'],
      where: {
        createdAt: {
          gte: dateFrom
        }
      },
      _count: {
        id: true
      }
    });

    return NextResponse.json({
      success: true,
      content: publishedContent,
      stats,
      filters: { status, locale, days },
      count: publishedContent.length,
    });

  } catch (error) {
    console.error('Published content fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch published content' },
      { status: 500 }
    );
  }
}
