import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '30d';
  const siteId = searchParams.get('siteId');

  try {
    const { prisma } = await import('@/lib/db');

    // Calculate date range
    const now = new Date();
    const daysBack = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const previousStartDate = new Date(startDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Build site filter for ContentReview (has site_id field)
    const contentReviewSiteFilter = siteId ? { site_id: siteId } : {};
    // Build site filter for Reviewer (has site_ids array)
    const reviewerSiteFilter = siteId ? { site_ids: { has: siteId } } : {};

    // Get total reviewers
    const totalReviewers = await prisma.reviewer.count({
      where: reviewerSiteFilter,
    });

    // Get active reviewers (with reviews in this period)
    const activeReviewerIds = await prisma.contentReview.groupBy({
      by: ['reviewer_id'],
      where: {
        reviewer_id: { not: null },
        created_at: { gte: startDate },
        ...contentReviewSiteFilter,
      },
    });
    const activeReviewers = activeReviewerIds.length;

    // Get total reviews in period
    const totalReviews = await prisma.contentReview.count({
      where: {
        created_at: { gte: startDate },
        ...contentReviewSiteFilter,
      },
    });

    // Get reviews from previous period for comparison
    const previousReviews = await prisma.contentReview.count({
      where: {
        created_at: {
          gte: previousStartDate,
          lt: startDate,
        },
        ...contentReviewSiteFilter,
      },
    });

    // Calculate average review time (in seconds, converted to minutes for display)
    const completedReviews = await prisma.contentReview.findMany({
      where: {
        status: 'approved',
        total_active_seconds: { not: null },
        created_at: { gte: startDate },
        ...contentReviewSiteFilter,
      },
      select: {
        total_active_seconds: true,
      },
    });
    const avgReviewTime = completedReviews.length > 0
      ? Math.round(
          completedReviews.reduce((sum, r) => sum + (r.total_active_seconds || 0), 0) / completedReviews.length / 60
        )
      : 0;

    // Calculate approval rate
    const approvedCount = await prisma.contentReview.count({
      where: {
        status: 'approved',
        created_at: { gte: startDate },
        ...contentReviewSiteFilter,
      },
    });
    const decidedCount = await prisma.contentReview.count({
      where: {
        status: { in: ['approved', 'rejected'] },
        created_at: { gte: startDate },
        ...contentReviewSiteFilter,
      },
    });
    const approvalRate = decidedCount > 0 ? Math.round((approvedCount / decidedCount) * 1000) / 10 : 0;

    // Get reviews by status
    const reviewsByStatus = await prisma.contentReview.groupBy({
      by: ['status'],
      where: {
        created_at: { gte: startDate },
        ...contentReviewSiteFilter,
      },
      _count: true,
    });
    const statusMap: Record<string, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
      revision_requested: 0,
    };
    reviewsByStatus.forEach((r) => {
      statusMap[r.status] = r._count;
    });

    // Get top reviewers
    const topReviewersData = await prisma.contentReview.groupBy({
      by: ['reviewer_id'],
      where: {
        reviewer_id: { not: null },
        created_at: { gte: startDate },
        ...contentReviewSiteFilter,
      },
      _count: true,
      _avg: {
        total_active_seconds: true,
      },
      orderBy: {
        _count: {
          reviewer_id: 'desc',
        },
      },
      take: 5,
    });

    // Get reviewer details for top reviewers
    const topReviewerIds = topReviewersData
      .map((r) => r.reviewer_id)
      .filter((id): id is string => id !== null);
    const reviewerDetails = await prisma.reviewer.findMany({
      where: { id: { in: topReviewerIds } },
      select: {
        id: true,
        name: true,
        avatar_url: true,
      },
    });
    const reviewerMap = new Map<string, { id: string; name: string | null; avatar_url: string | null }>(
      reviewerDetails.map((r) => [r.id, r])
    );

    // Calculate approval rate per reviewer
    const topReviewers = await Promise.all(
      topReviewersData.map(async (r) => {
        const reviewer = reviewerMap.get(r.reviewer_id || '');
        const approvedByReviewer = await prisma.contentReview.count({
          where: {
            reviewer_id: r.reviewer_id,
            status: 'approved',
            created_at: { gte: startDate },
          },
        });
        const decidedByReviewer = await prisma.contentReview.count({
          where: {
            reviewer_id: r.reviewer_id,
            status: { in: ['approved', 'rejected'] },
            created_at: { gte: startDate },
          },
        });
        return {
          id: r.reviewer_id || '',
          name: reviewer?.name || 'Unknown',
          profilePicture: reviewer?.avatar_url || null,
          reviewCount: r._count,
          avgTime: Math.round((r._avg.total_active_seconds || 0) / 60),
          approvalRate: decidedByReviewer > 0
            ? Math.round((approvedByReviewer / decidedByReviewer) * 100)
            : 0,
        };
      })
    );

    // Get review trend (weekly buckets for the period)
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const numWeeks = Math.ceil(daysBack / 7);
    const reviewTrend: Array<{ date: string; count: number }> = [];

    for (let i = numWeeks - 1; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * weekMs);
      const weekEnd = new Date(now.getTime() - i * weekMs);
      const count = await prisma.contentReview.count({
        where: {
          created_at: {
            gte: weekStart,
            lt: weekEnd,
          },
          ...contentReviewSiteFilter,
        },
      });
      reviewTrend.push({
        date: weekStart.toISOString().split('T')[0],
        count,
      });
    }

    // Get average time by expertise
    const reviewersWithExpertise = await prisma.reviewer.findMany({
      where: {
        ...reviewerSiteFilter,
        expertise_areas: { isEmpty: false },
      },
      select: {
        id: true,
        expertise_areas: true,
      },
    });

    const expertiseMap = new Map<string, { total: number; count: number }>();
    for (const reviewer of reviewersWithExpertise) {
      const reviews = await prisma.contentReview.findMany({
        where: {
          reviewer_id: reviewer.id,
          total_active_seconds: { not: null },
          created_at: { gte: startDate },
        },
        select: { total_active_seconds: true },
      });

      for (const exp of reviewer.expertise_areas) {
        const existing = expertiseMap.get(exp) || { total: 0, count: 0 };
        reviews.forEach((r) => {
          existing.total += (r.total_active_seconds || 0) / 60;
          existing.count += 1;
        });
        expertiseMap.set(exp, existing);
      }
    }

    const avgTimeByExpertise = Array.from(expertiseMap.entries())
      .map(([expertise, data]) => ({
        expertise,
        avgTime: data.count > 0 ? Math.round(data.total / data.count) : 0,
        count: data.count,
      }))
      .filter((e) => e.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalReviewers,
          activeReviewers,
          totalReviews,
          avgReviewTime,
          approvalRate,
          reviewsThisMonth: totalReviews,
          reviewsLastMonth: previousReviews,
        },
        topReviewers,
        reviewsByStatus: statusMap,
        reviewTrend,
        avgTimeByExpertise,
      },
    });
  } catch (error) {
    console.error('[reviewer-analytics] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
