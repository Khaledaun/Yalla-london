export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { withPermission, PERMISSIONS, logAuditEvent } from '@/lib/rbac';
import { analyticsService } from '@/lib/analytics';
import { prisma } from '@/lib/db';

export const GET = withPermission(PERMISSIONS.VIEW_REPORTS, async (request: NextRequest, user) => {
  try {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date'); 
    const format = url.searchParams.get('format') || 'json';

    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Validate date range
    if (start > end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    // Get usage metrics
    const [userMetrics, contentMetrics, systemMetrics] = await Promise.all([
      analyticsService.getUserMetrics(start, end),
      analyticsService.getContentMetrics(start, end), 
      analyticsService.getSystemMetrics(start, end)
    ]);

    // Get additional usage statistics
    const usageStats = await getUsageStatistics(start, end);

    const report = {
      metadata: {
        reportType: 'usage',
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        generatedAt: new Date().toISOString(),
        generatedBy: user.email
      },
      summary: {
        totalUsers: userMetrics.totalUsers,
        activeUsers: userMetrics.activeUsers,
        totalPageViews: contentMetrics.pageViews,
        totalRequests: systemMetrics.requestCount,
        averageResponseTime: systemMetrics.averageResponseTime,
        systemUptime: systemMetrics.uptime
      },
      userMetrics,
      contentMetrics,
      systemMetrics,
      usageStats
    };

    // Log report access
    await logAuditEvent({
      userId: user.id,
      action: 'export',
      resource: 'usage_report',
      details: { dateRange: { start, end }, format },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    // Return different formats
    if (format === 'csv') {
      const csv = generateUsageCSV(report);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="usage-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Usage report generation error:', error);
    
    await logAuditEvent({
      userId: user.id,
      action: 'export',
      resource: 'usage_report',
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json(
      { error: 'Failed to generate usage report' },
      { status: 500 }
    );
  }
});

async function getUsageStatistics(startDate: Date, endDate: Date) {
  try {
    // Get content creation statistics
    const contentCreated = await prisma.blogPost.count({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const scheduledContent = await prisma.scheduledContent.count({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Get user activity
    const userLogins = await prisma.auditLog.count({
      where: {
        action: 'login',
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Get top content by views
    const topContent = await prisma.analyticsEvent.groupBy({
      by: ['properties'],
      where: {
        eventName: 'page_view',
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    // Get feature usage
    const featureUsage = await prisma.analyticsEvent.groupBy({
      by: ['eventName'],
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    return {
      content: {
        blogPostsCreated: contentCreated,
        scheduledContentCreated: scheduledContent
      },
      user: {
        totalLogins: userLogins
      },
      topContent: topContent.map(item => ({
        page: (item.properties as any)?.page || 'unknown',
        views: item._count.id
      })),
      featureUsage: featureUsage.map(item => ({
        feature: item.eventName,
        usage: item._count.id
      }))
    };
  } catch (error) {
    console.error('Error getting usage statistics:', error);
    return {
      content: { blogPostsCreated: 0, scheduledContentCreated: 0 },
      user: { totalLogins: 0 },
      topContent: [],
      featureUsage: []
    };
  }
}

function generateUsageCSV(report: any): string {
  const lines = [
    'Usage Report',
    `Generated: ${report.metadata.generatedAt}`,
    `Date Range: ${report.metadata.dateRange.start} to ${report.metadata.dateRange.end}`,
    '',
    'Summary Metrics',
    'Metric,Value',
    `Total Users,${report.summary.totalUsers}`,
    `Active Users,${report.summary.activeUsers}`,
    `Total Page Views,${report.summary.totalPageViews}`,
    `Total Requests,${report.summary.totalRequests}`,
    `Average Response Time,${report.summary.averageResponseTime}ms`,
    `System Uptime,${report.summary.systemUptime}%`,
    '',
    'Top Content',
    'Page,Views',
    ...report.usageStats.topContent.map((item: any) => `${item.page},${item.views}`),
    '',
    'Feature Usage',
    'Feature,Usage Count',
    ...report.usageStats.featureUsage.map((item: any) => `${item.feature},${item.usage}`)
  ];

  return lines.join('\n');
}