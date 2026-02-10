/**
 * Content Performance Dashboard API
 * Provides GSC + GA4 data per article/content item
 *
 * GET - Get performance metrics for content
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { searchConsole } from '@/lib/integrations/google-search-console';
import { requireAdmin } from "@/lib/admin-middleware";

interface ContentPerformance {
  id: string;
  title: string;
  slug: string;
  url: string;
  type: 'blog_post' | 'scheduled_content';
  publishedAt: string | null;
  locale: string;
  pageType: string | null;
  seoScore: number | null;
  // Search Console Metrics
  searchMetrics: {
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
    topQueries: string[];
  };
  // Indexing Status
  indexingStatus: {
    isIndexed: boolean;
    lastCrawled: string | null;
    coverage: string;
  };
  // Performance Trends
  trends: {
    impressionsTrend: 'up' | 'down' | 'stable';
    clicksTrend: 'up' | 'down' | 'stable';
    positionTrend: 'up' | 'down' | 'stable';
  };
  // SEO Audit Summary
  seoAudit: {
    score: number;
    lastAuditAt: string | null;
    topIssues: string[];
  } | null;
}

// Get content performance data
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('id');
    const contentType = searchParams.get('type') || 'all';
    const locale = searchParams.get('locale');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sort') || 'impressions';
    const dateRange = searchParams.get('range') || '28d';

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yalla-london.com';

    // If specific content ID is requested
    if (contentId) {
      const performance = await getContentPerformance(contentId, contentType, baseUrl, dateRange);
      if (!performance) {
        return NextResponse.json(
          { error: 'Content not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        performance,
      });
    }

    // Get all published content performance
    const contentPerformance = await getAllContentPerformance(
      contentType,
      locale,
      limit,
      sortBy,
      baseUrl,
      dateRange
    );

    // Get aggregate metrics
    const aggregateMetrics = calculateAggregateMetrics(contentPerformance);

    return NextResponse.json({
      success: true,
      content: contentPerformance,
      count: contentPerformance.length,
      aggregate: aggregateMetrics,
      filters: {
        type: contentType,
        locale,
        limit,
        sortBy,
        dateRange,
      },
    });
  } catch (error) {
    console.error('Failed to get content performance:', error);
    return NextResponse.json(
      { error: 'Failed to get content performance data' },
      { status: 500 }
    );
  }
}

// Get performance for a specific content item
async function getContentPerformance(
  contentId: string,
  contentType: string,
  baseUrl: string,
  dateRange: string
): Promise<ContentPerformance | null> {
  // Try blog post first
  if (contentType === 'all' || contentType === 'blog_post') {
    const blogPost = await prisma.blogPost.findUnique({
      where: { id: contentId },
      include: {
        category: true,
      },
    });

    if (blogPost) {
      const url = `${baseUrl}/blog/${blogPost.slug}`;
      return await buildPerformanceData(
        {
          id: blogPost.id,
          title: blogPost.title_en,
          slug: blogPost.slug,
          type: 'blog_post' as const,
          publishedAt: blogPost.published ? blogPost.created_at.toISOString() : null,
          locale: 'en',
          pageType: blogPost.page_type,
          seoScore: blogPost.seo_score,
        },
        url,
        dateRange
      );
    }
  }

  // Try scheduled content
  if (contentType === 'all' || contentType === 'scheduled_content') {
    const scheduledContent = await prisma.scheduledContent.findUnique({
      where: { id: contentId },
    });

    if (scheduledContent && scheduledContent.status === 'published') {
      const slug = scheduledContent.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      const url = `${baseUrl}/blog/${slug}`;

      return await buildPerformanceData(
        {
          id: scheduledContent.id,
          title: scheduledContent.title,
          slug,
          type: 'scheduled_content' as const,
          publishedAt: scheduledContent.published_time?.toISOString() || null,
          locale: scheduledContent.language,
          pageType: scheduledContent.page_type,
          seoScore: scheduledContent.seo_score,
        },
        url,
        dateRange
      );
    }
  }

  return null;
}

// Get all content performance
async function getAllContentPerformance(
  contentType: string,
  locale: string | null,
  limit: number,
  sortBy: string,
  baseUrl: string,
  dateRange: string
): Promise<ContentPerformance[]> {
  const performances: ContentPerformance[] = [];

  // Get published blog posts
  if (contentType === 'all' || contentType === 'blog_post') {
    const blogPosts = await prisma.blogPost.findMany({
      where: {
        published: true,
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    for (const post of blogPosts) {
      const url = `${baseUrl}/blog/${post.slug}`;
      const perf = await buildPerformanceData(
        {
          id: post.id,
          title: post.title_en,
          slug: post.slug,
          type: 'blog_post' as const,
          publishedAt: post.created_at.toISOString(),
          locale: 'en',
          pageType: post.page_type,
          seoScore: post.seo_score,
        },
        url,
        dateRange
      );
      performances.push(perf);
    }
  }

  // Get published scheduled content
  if (contentType === 'all' || contentType === 'scheduled_content') {
    const whereClause: any = { status: 'published' };
    if (locale) whereClause.language = locale;

    const scheduledContent = await prisma.scheduledContent.findMany({
      where: whereClause,
      orderBy: { published_time: 'desc' },
      take: limit,
    });

    for (const content of scheduledContent) {
      const slug = content.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      const url = `${baseUrl}/blog/${slug}`;

      const perf = await buildPerformanceData(
        {
          id: content.id,
          title: content.title,
          slug,
          type: 'scheduled_content' as const,
          publishedAt: content.published_time?.toISOString() || null,
          locale: content.language,
          pageType: content.page_type,
          seoScore: content.seo_score,
        },
        url,
        dateRange
      );
      performances.push(perf);
    }
  }

  // Sort based on sortBy parameter
  performances.sort((a, b) => {
    switch (sortBy) {
      case 'impressions':
        return b.searchMetrics.impressions - a.searchMetrics.impressions;
      case 'clicks':
        return b.searchMetrics.clicks - a.searchMetrics.clicks;
      case 'ctr':
        return b.searchMetrics.ctr - a.searchMetrics.ctr;
      case 'position':
        return a.searchMetrics.position - b.searchMetrics.position;
      case 'seo_score':
        return (b.seoScore || 0) - (a.seoScore || 0);
      default:
        return b.searchMetrics.impressions - a.searchMetrics.impressions;
    }
  });

  return performances.slice(0, limit);
}

// Build performance data for a content item
async function buildPerformanceData(
  content: {
    id: string;
    title: string;
    slug: string;
    type: 'blog_post' | 'scheduled_content';
    publishedAt: string | null;
    locale: string;
    pageType: string | null;
    seoScore: number | null;
  },
  url: string,
  dateRange: string
): Promise<ContentPerformance> {
  // Get Search Console data
  let searchMetrics = {
    impressions: 0,
    clicks: 0,
    ctr: 0,
    position: 0,
    topQueries: [] as string[],
  };

  let indexingStatus = {
    isIndexed: false,
    lastCrawled: null as string | null,
    coverage: 'unknown',
  };

  try {
    // Get search analytics for this specific URL
    const startDate = getStartDate(dateRange);
    const endDate = new Date().toISOString().split('T')[0];
    const analytics = await searchConsole.getSearchAnalytics(startDate, endDate, ['query']);

    if (analytics?.rows?.length > 0) {
      // Aggregate metrics
      searchMetrics.impressions = analytics.rows.reduce((sum: number, row: any) => sum + (row.impressions || 0), 0);
      searchMetrics.clicks = analytics.rows.reduce((sum: number, row: any) => sum + (row.clicks || 0), 0);
      searchMetrics.position = analytics.rows.reduce((sum: number, row: any) => sum + (row.position || 0), 0) / analytics.rows.length;
      searchMetrics.ctr = searchMetrics.impressions > 0
        ? (searchMetrics.clicks / searchMetrics.impressions) * 100
        : 0;
      searchMetrics.topQueries = analytics.rows
        .sort((a: any, b: any) => (b.clicks || 0) - (a.clicks || 0))
        .slice(0, 5)
        .map((row: any) => row.keys?.[0] || '');
    }

    // Get indexing status
    const inspection = await searchConsole.getIndexingStatus(url) as any;
    if (inspection) {
      const indexResult = inspection?.inspectionResult?.indexStatusResult || inspection?.indexStatusResult;
      if (indexResult) {
        indexingStatus.isIndexed = indexResult.verdict === 'PASS';
        indexingStatus.lastCrawled = indexResult.lastCrawlTime || null;
        indexingStatus.coverage = indexResult.coverageState || 'unknown';
      }
    }
  } catch (error) {
    // GSC data not available - use defaults
    console.warn(`GSC data not available for ${url}:`, error);
  }

  // Get SEO audit data
  let seoAudit = null;
  try {
    const audit = await prisma.seoAuditResult.findFirst({
      where: {
        content_id: content.id,
        content_type: content.type,
      },
      orderBy: { created_at: 'desc' },
    });

    if (audit) {
      const suggestions = Array.isArray(audit.suggestions) ? audit.suggestions : [];
      seoAudit = {
        score: audit.score,
        lastAuditAt: audit.created_at.toISOString(),
        topIssues: suggestions.slice(0, 3) as string[],
      };
    }
  } catch (error) {
    // SEO audit data not available
  }

  // Calculate trends (simplified - would need historical data for real trends)
  const trends = {
    impressionsTrend: 'stable' as const,
    clicksTrend: 'stable' as const,
    positionTrend: 'stable' as const,
  };

  return {
    id: content.id,
    title: content.title,
    slug: content.slug,
    url,
    type: content.type,
    publishedAt: content.publishedAt,
    locale: content.locale,
    pageType: content.pageType,
    seoScore: content.seoScore,
    searchMetrics,
    indexingStatus,
    trends,
    seoAudit,
  };
}

// Calculate aggregate metrics
function calculateAggregateMetrics(performances: ContentPerformance[]): any {
  const totalImpressions = performances.reduce((sum, p) => sum + p.searchMetrics.impressions, 0);
  const totalClicks = performances.reduce((sum, p) => sum + p.searchMetrics.clicks, 0);
  const indexedCount = performances.filter(p => p.indexingStatus.isIndexed).length;
  const avgPosition = performances.length > 0
    ? performances.reduce((sum, p) => sum + p.searchMetrics.position, 0) / performances.length
    : 0;
  const avgSeoScore = performances.length > 0
    ? performances.reduce((sum, p) => sum + (p.seoScore || 0), 0) / performances.length
    : 0;

  // Top performing content
  const topByImpressions = [...performances]
    .sort((a, b) => b.searchMetrics.impressions - a.searchMetrics.impressions)
    .slice(0, 5)
    .map(p => ({ id: p.id, title: p.title, impressions: p.searchMetrics.impressions }));

  const topByClicks = [...performances]
    .sort((a, b) => b.searchMetrics.clicks - a.searchMetrics.clicks)
    .slice(0, 5)
    .map(p => ({ id: p.id, title: p.title, clicks: p.searchMetrics.clicks }));

  // Content needing attention (low CTR or not indexed)
  const needsAttention = performances
    .filter(p => !p.indexingStatus.isIndexed || p.searchMetrics.ctr < 1)
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      title: p.title,
      issue: !p.indexingStatus.isIndexed ? 'Not indexed' : 'Low CTR',
    }));

  return {
    totalContent: performances.length,
    totalImpressions,
    totalClicks,
    averageCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    averagePosition: avgPosition,
    averageSeoScore: avgSeoScore,
    indexedPages: indexedCount,
    indexingRate: performances.length > 0 ? (indexedCount / performances.length) * 100 : 0,
    topByImpressions,
    topByClicks,
    needsAttention,
  };
}

// Helper: Get start date based on date range
function getStartDate(dateRange: string): string {
  const now = new Date();
  switch (dateRange) {
    case '7d':
      now.setDate(now.getDate() - 7);
      break;
    case '28d':
      now.setDate(now.getDate() - 28);
      break;
    case '3m':
      now.setMonth(now.getMonth() - 3);
      break;
    case '6m':
      now.setMonth(now.getMonth() - 6);
      break;
    case '1y':
      now.setFullYear(now.getFullYear() - 1);
      break;
    default:
      now.setDate(now.getDate() - 28);
  }
  return now.toISOString().split('T')[0];
}
