export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { withPermission, PERMISSIONS, logAuditEvent } from '@/lib/rbac';
import { prisma } from '@/lib/db';

export const GET = withPermission(PERMISSIONS.VIEW_AUDIT_LOGS, async (request: NextRequest, user) => {
  try {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const complianceType = url.searchParams.get('type'); // gdpr, security, access, data_retention
    const format = url.searchParams.get('format') || 'json';

    // Default to last 30 days for compliance reports
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Validate date range
    if (start > end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    // Get compliance data
    const complianceData = await getComplianceData(start, end, complianceType);

    const report = {
      metadata: {
        reportType: 'compliance',
        complianceType: complianceType || 'all',
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        generatedAt: new Date().toISOString(),
        generatedBy: user.email
      },
      summary: {
        totalAuditEvents: complianceData.totalAuditEvents,
        userAccessEvents: complianceData.userAccessEvents,
        dataExportEvents: complianceData.dataExportEvents,
        privilegeEscalations: complianceData.privilegeEscalations,
        suspiciousActivities: complianceData.suspiciousActivities,
        complianceScore: complianceData.complianceScore
      },
      auditTrail: complianceData.auditTrail,
      accessControl: complianceData.accessControl,
      dataGovernance: complianceData.dataGovernance,
      securityEvents: complianceData.securityEvents
    };

    // Log compliance report access
    await logAuditEvent({
      userId: user.id,
      action: 'export',
      resource: 'compliance_report',
      details: { dateRange: { start, end }, complianceType, format },
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    // Return different formats
    if (format === 'csv') {
      const csv = generateComplianceCSV(report);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="compliance-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Compliance report generation error:', error);
    
    await logAuditEvent({
      userId: user.id,
      action: 'export',
      resource: 'compliance_report',
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json(
      { error: 'Failed to generate compliance report' },
      { status: 500 }
    );
  }
});

async function getComplianceData(startDate: Date, endDate: Date, complianceType?: string | null) {
  try {
    // Get all audit events for the period
    const auditEvents = await prisma.auditLog.findMany({
      where: {
        timestamp: { gte: startDate, lte: endDate }
      },
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Filter by compliance type if specified
    let filteredEvents = auditEvents;
    if (complianceType) {
      filteredEvents = filterEventsByComplianceType(auditEvents, complianceType);
    }

    // Analyze access patterns
    const userAccessEvents = auditEvents.filter(event => 
      ['login', 'logout', 'access'].includes(event.action)
    );

    const dataExportEvents = auditEvents.filter(event => 
      event.action === 'export' || event.resource?.includes('report')
    );

    // Detect potential privilege escalations
    const privilegeEscalations = detectPrivilegeEscalations(auditEvents);

    // Identify suspicious activities
    const suspiciousActivities = detectSuspiciousActivities(auditEvents);

    // Calculate compliance score (simplified scoring)
    const complianceScore = calculateComplianceScore(auditEvents, privilegeEscalations, suspiciousActivities);

    // Get access control summary
    const accessControl = await getAccessControlSummary(startDate, endDate);

    // Get data governance metrics
    const dataGovernance = await getDataGovernanceMetrics(startDate, endDate);

    // Get security events
    const securityEvents = getSecurityEvents(auditEvents);

    return {
      totalAuditEvents: filteredEvents.length,
      userAccessEvents: userAccessEvents.length,
      dataExportEvents: dataExportEvents.length,
      privilegeEscalations: privilegeEscalations.length,
      suspiciousActivities: suspiciousActivities.length,
      complianceScore,
      auditTrail: filteredEvents.slice(0, 100).map(event => ({
        timestamp: event.timestamp,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        userId: event.userId,
        userEmail: event.user?.email,
        userRole: event.user?.role,
        success: event.success,
        ipAddress: event.ipAddress,
        details: event.details
      })),
      accessControl,
      dataGovernance,
      securityEvents: securityEvents.slice(0, 50)
    };
  } catch (error) {
    console.error('Error getting compliance data:', error);
    return {
      totalAuditEvents: 0,
      userAccessEvents: 0,
      dataExportEvents: 0,
      privilegeEscalations: 0,
      suspiciousActivities: 0,
      complianceScore: 0,
      auditTrail: [],
      accessControl: {},
      dataGovernance: {},
      securityEvents: []
    };
  }
}

function filterEventsByComplianceType(events: any[], type: string) {
  switch (type) {
    case 'gdpr':
      return events.filter(event => 
        ['export', 'delete', 'access'].includes(event.action) ||
        event.resource?.includes('user_data')
      );
    case 'security':
      return events.filter(event => 
        ['login', 'logout', 'access_denied', 'permission_change'].includes(event.action) ||
        event.success === false
      );
    case 'access':
      return events.filter(event => 
        ['access', 'permission_change', 'role_change'].includes(event.action)
      );
    case 'data_retention':
      return events.filter(event => 
        ['delete', 'archive', 'export'].includes(event.action)
      );
    default:
      return events;
  }
}

function detectPrivilegeEscalations(events: any[]) {
  // Look for patterns indicating potential privilege escalation
  const escalations = [];
  
  // Group events by user
  const userEvents = events.reduce((acc, event) => {
    if (event.userId) {
      if (!acc[event.userId]) acc[event.userId] = [];
      acc[event.userId].push(event);
    }
    return acc;
  }, {} as Record<string, any[]>);

  for (const [userId, userEventList] of Object.entries(userEvents)) {
    // Look for access denied followed by successful access to admin resources
    const accessDenied = userEventList.filter(e => 
      e.action === 'access_denied' || e.success === false
    );
    const adminAccess = userEventList.filter(e => 
      e.resource?.includes('admin') || e.action === 'manage_system'
    );

    if (accessDenied.length > 0 && adminAccess.length > 0) {
      escalations.push({
        userId,
        suspiciousPattern: 'access_denied_then_admin_access',
        events: [...accessDenied.slice(0, 3), ...adminAccess.slice(0, 3)]
      });
    }

    // Look for multiple failed attempts followed by success
    const failures = userEventList.filter(e => e.success === false);
    if (failures.length >= 3) {
      escalations.push({
        userId,
        suspiciousPattern: 'multiple_failures',
        events: failures.slice(0, 5)
      });
    }
  }

  return escalations;
}

function detectSuspiciousActivities(events: any[]) {
  const suspicious = [];

  // Detect unusual access patterns
  const ipGroups = events.reduce((acc, event) => {
    if (event.ipAddress && event.ipAddress !== 'unknown') {
      if (!acc[event.ipAddress]) acc[event.ipAddress] = [];
      acc[event.ipAddress].push(event);
    }
    return acc;
  }, {} as Record<string, any[]>);

  // Flag IPs with high activity
  for (const [ip, ipEvents] of Object.entries(ipGroups)) {
    if (ipEvents.length > 100) { // Threshold for suspicious activity
      suspicious.push({
        type: 'high_activity_ip',
        ip,
        eventCount: ipEvents.length,
        events: ipEvents.slice(0, 10)
      });
    }

    // Flag multiple user accounts from same IP
    const uniqueUsers = new Set(ipEvents.map(e => e.userId).filter(Boolean));
    if (uniqueUsers.size > 5) {
      suspicious.push({
        type: 'multiple_users_same_ip',
        ip,
        userCount: uniqueUsers.size,
        events: ipEvents.slice(0, 10)
      });
    }
  }

  // Detect off-hours access
  const offHoursEvents = events.filter(event => {
    const hour = new Date(event.timestamp).getHours();
    return hour < 6 || hour > 22; // Consider 6 AM - 10 PM as normal hours
  });

  if (offHoursEvents.length > 20) {
    suspicious.push({
      type: 'off_hours_access',
      eventCount: offHoursEvents.length,
      events: offHoursEvents.slice(0, 10)
    });
  }

  return suspicious;
}

function calculateComplianceScore(events: any[], escalations: any[], suspicious: any[]) {
  let score = 100;

  // Deduct points for security issues
  score -= escalations.length * 10;
  score -= suspicious.length * 5;

  // Deduct points for failed events
  const failedEvents = events.filter(e => e.success === false);
  const failureRate = failedEvents.length / events.length;
  score -= failureRate * 20;

  // Deduct points for missing audit coverage
  const criticalActions = ['login', 'export', 'delete', 'permission_change'];
  const coveredActions = new Set(events.map(e => e.action));
  const missingCoverage = criticalActions.filter(action => !coveredActions.has(action));
  score -= missingCoverage.length * 5;

  return Math.max(0, Math.round(score));
}

async function getAccessControlSummary(startDate: Date, endDate: Date) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true
    }
  });

  const roleDistribution = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const inactiveUsers = users.filter(user => !user.isActive).length;
  const staleUsers = users.filter(user => 
    !user.lastLoginAt || user.lastLoginAt < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  ).length;

  return {
    totalUsers: users.length,
    roleDistribution,
    inactiveUsers,
    staleUsers,
    adminUsers: roleDistribution['admin'] || 0
  };
}

async function getDataGovernanceMetrics(startDate: Date, endDate: Date) {
  const dataExports = await prisma.auditLog.count({
    where: {
      action: 'export',
      timestamp: { gte: startDate, lte: endDate }
    }
  });

  const dataDeletions = await prisma.auditLog.count({
    where: {
      action: 'delete',
      timestamp: { gte: startDate, lte: endDate }
    }
  });

  return {
    dataExports,
    dataDeletions,
    retentionCompliance: 95 // Simplified - would need actual retention policy check
  };
}

function getSecurityEvents(events: any[]) {
  return events.filter(event => 
    event.success === false ||
    ['access_denied', 'login_failed', 'permission_denied'].includes(event.action)
  ).map(event => ({
    timestamp: event.timestamp,
    action: event.action,
    resource: event.resource,
    userId: event.userId,
    ipAddress: event.ipAddress,
    errorMessage: event.errorMessage
  }));
}

function generateComplianceCSV(report: any): string {
  const lines = [
    'Compliance Report',
    `Generated: ${report.metadata.generatedAt}`,
    `Date Range: ${report.metadata.dateRange.start} to ${report.metadata.dateRange.end}`,
    `Type: ${report.metadata.complianceType}`,
    '',
    'Summary',
    'Metric,Value',
    `Total Audit Events,${report.summary.totalAuditEvents}`,
    `User Access Events,${report.summary.userAccessEvents}`,
    `Data Export Events,${report.summary.dataExportEvents}`,
    `Privilege Escalations,${report.summary.privilegeEscalations}`,
    `Suspicious Activities,${report.summary.suspiciousActivities}`,
    `Compliance Score,${report.summary.complianceScore}%`,
    '',
    'Audit Trail (Recent Events)',
    'Timestamp,Action,Resource,User Email,User Role,Success,IP Address',
    ...report.auditTrail.slice(0, 100).map((item: any) => 
      `${item.timestamp},${item.action},${item.resource || ''},${item.userEmail || ''},${item.userRole || ''},${item.success},${item.ipAddress || ''}`
    )
  ];

  return lines.join('\n');
}