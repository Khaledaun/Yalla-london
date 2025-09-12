export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { withPermission, PERMISSIONS, logAuditEvent } from '@/lib/rbac';
import { prisma } from '@/lib/db';

export const GET = withPermission(PERMISSIONS.VIEW_REPORTS, async (request: NextRequest, user) => {
  try {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const severity = url.searchParams.get('severity'); // error, warning, info
    const format = url.searchParams.get('format') || 'json';

    // Default to last 7 days for error reports
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Validate date range
    if (start > end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    // Get error statistics
    const errorStats = await getErrorStatistics(start, end, severity);

    const report = {
      metadata: {
        reportType: 'errors',
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        severityFilter: severity,
        generatedAt: new Date().toISOString(),
        generatedBy: user.email
      },
      summary: {
        totalErrors: errorStats.totalErrors,
        errorRate: errorStats.errorRate,
        topErrorTypes: errorStats.topErrorTypes,
        affectedUsers: errorStats.affectedUsers,
        systemAvailability: errorStats.systemAvailability
      },
      details: errorStats.details,
      trends: errorStats.trends
    };

    // Log report access
    await logAuditEvent({
      userId: user.id,
      action: 'export',
      resource: 'error_report',
      details: { dateRange: { start, end }, severity, format },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    // Return different formats
    if (format === 'csv') {
      const csv = generateErrorCSV(report);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="error-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error report generation error:', error);
    
    await logAuditEvent({
      userId: user.id,
      action: 'export',
      resource: 'error_report',
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json(
      { error: 'Failed to generate error report' },
      { status: 500 }
    );
  }
});

async function getErrorStatistics(startDate: Date, endDate: Date, severity?: string | null) {
  try {
    // Get failed audit logs (system errors)
    const auditLogFilter: any = {
      timestamp: { gte: startDate, lte: endDate },
      success: false
    };

    const failedAudits = await prisma.auditLog.findMany({
      where: auditLogFilter,
      orderBy: { timestamp: 'desc' }
    });

    // Get system error events
    const systemErrors = await prisma.analyticsEvent.findMany({
      where: {
        eventName: { in: ['error', 'system_error', 'api_error'] },
        timestamp: { gte: startDate, lte: endDate }
      },
      orderBy: { timestamp: 'desc' }
    });

    // Get total requests for error rate calculation
    const totalRequests = await prisma.systemMetrics.aggregate({
      where: {
        metricName: 'request_count',
        timestamp: { gte: startDate, lte: endDate }
      },
      _sum: { metricValue: true }
    });

    const totalErrors = failedAudits.length + systemErrors.length;
    const totalRequestCount = totalRequests._sum.metricValue || 1;
    const errorRate = (totalErrors / totalRequestCount) * 100;

    // Analyze error patterns
    const errorsByAction = failedAudits.reduce((acc: Record<string, number>, log: any) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});

    const errorsByEvent = systemErrors.reduce((acc: Record<string, number>, event: any) => {
      acc[event.eventName] = (acc[event.eventName] || 0) + 1;
      return acc;
    }, {});

    const topErrorTypes = [
      ...Object.entries(errorsByAction).map(([type, count]) => ({ type: `audit_${type}`, count })),
      ...Object.entries(errorsByEvent).map(([type, count]) => ({ type, count }))
    ]
      .sort((a, b) => (b.count as number) - (a.count as number))
      .slice(0, 10);

    // Get affected users
    const affectedUserIds = new Set([
      ...failedAudits.map((log: any) => log.userId).filter(Boolean),
      ...systemErrors.map((event: any) => event.userId).filter(Boolean)
    ]);

    // Calculate daily error trends
    const dailyTrends = calculateDailyErrorTrends(failedAudits, systemErrors, startDate, endDate);

    // System availability calculation (simplified)
    const systemMetrics = await prisma.systemMetrics.findMany({
      where: {
        metricName: 'uptime',
        timestamp: { gte: startDate, lte: endDate }
      },
      orderBy: { timestamp: 'desc' },
      take: 1
    });

    const systemAvailability = systemMetrics.length > 0 ? systemMetrics[0].metricValue : 99.0;

    return {
      totalErrors,
      errorRate: Math.round(errorRate * 100) / 100,
      topErrorTypes,
      affectedUsers: affectedUserIds.size,
      systemAvailability,
      details: {
        auditFailures: failedAudits.slice(0, 50).map((log: any) => ({
          timestamp: log.timestamp,
          action: log.action,
          resource: log.resource,
          userId: log.userId,
          errorMessage: log.errorMessage,
          ipAddress: log.ipAddress
        })),
        systemErrors: systemErrors.slice(0, 50).map((event: any) => ({
          timestamp: event.timestamp,
          eventName: event.eventName,
          category: event.category,
          userId: event.userId,
          properties: event.properties,
          ipAddress: event.ipAddress
        }))
      },
      trends: dailyTrends
    };
  } catch (error) {
    console.error('Error getting error statistics:', error);
    return {
      totalErrors: 0,
      errorRate: 0,
      topErrorTypes: [],
      affectedUsers: 0,
      systemAvailability: 0,
      details: { auditFailures: [], systemErrors: [] },
      trends: []
    };
  }
}

function calculateDailyErrorTrends(auditLogs: any[], systemErrors: any[], startDate: Date, endDate: Date) {
  const trends = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayStart = new Date(current);
    const dayEnd = new Date(current);
    dayEnd.setHours(23, 59, 59, 999);

    const dayAuditErrors = auditLogs.filter(log => 
      log.timestamp >= dayStart && log.timestamp <= dayEnd
    ).length;

    const daySystemErrors = systemErrors.filter(event => 
      event.timestamp >= dayStart && event.timestamp <= dayEnd
    ).length;

    trends.push({
      date: dayStart.toISOString().split('T')[0],
      auditErrors: dayAuditErrors,
      systemErrors: daySystemErrors,
      totalErrors: dayAuditErrors + daySystemErrors
    });

    current.setDate(current.getDate() + 1);
  }

  return trends;
}

function generateErrorCSV(report: any): string {
  const lines = [
    'Error Report',
    `Generated: ${report.metadata.generatedAt}`,
    `Date Range: ${report.metadata.dateRange.start} to ${report.metadata.dateRange.end}`,
    `Severity Filter: ${report.metadata.severityFilter || 'All'}`,
    '',
    'Summary',
    'Metric,Value',
    `Total Errors,${report.summary.totalErrors}`,
    `Error Rate,${report.summary.errorRate}%`,
    `Affected Users,${report.summary.affectedUsers}`,
    `System Availability,${report.summary.systemAvailability}%`,
    '',
    'Top Error Types',
    'Error Type,Count',
    ...report.summary.topErrorTypes.map((item: any) => `${item.type},${item.count}`),
    '',
    'Daily Trends',
    'Date,Audit Errors,System Errors,Total Errors',
    ...report.trends.map((item: any) => `${item.date},${item.auditErrors},${item.systemErrors},${item.totalErrors}`),
    '',
    'Recent Audit Failures',
    'Timestamp,Action,Resource,User ID,Error Message',
    ...report.details.auditFailures.map((item: any) => 
      `${item.timestamp},${item.action},${item.resource || ''},${item.userId || ''},${(item.errorMessage || '').replace(/,/g, ';')}`
    ),
    '',
    'Recent System Errors',
    'Timestamp,Event Name,Category,User ID,IP Address',
    ...report.details.systemErrors.map((item: any) => 
      `${item.timestamp},${item.eventName},${item.category},${item.userId || ''},${item.ipAddress || ''}`
    )
  ];

  return lines.join('\n');
}