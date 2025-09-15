export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';

interface AlertMetrics {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  database_response_time: number;
  error_rate: number;
  active_users: number;
  request_count: number;
}

interface Alert {
  id: string;
  type: 'performance' | 'error' | 'security' | 'database';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metrics: AlertMetrics;
  created_at: string;
  resolved_at?: string;
}

let alertHistory: Alert[] = [];
let currentMetrics: AlertMetrics = {
  timestamp: new Date().toISOString(),
  cpu_usage: 0,
  memory_usage: 0,
  database_response_time: 0,
  error_rate: 0,
  active_users: 0,
  request_count: 0
};

// Performance thresholds for alerts
const ALERT_THRESHOLDS = {
  cpu_usage: 80,
  memory_usage: 85,
  database_response_time: 1000, // ms
  error_rate: 5, // percentage
  active_users: 1000
};

function generateAlert(type: Alert['type'], severity: Alert['severity'], message: string): Alert {
  return {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    severity,
    message,
    metrics: { ...currentMetrics },
    created_at: new Date().toISOString()
  };
}

function checkPerformanceAlerts(): Alert[] {
  const alerts: Alert[] = [];
  
  if (currentMetrics.cpu_usage > ALERT_THRESHOLDS.cpu_usage) {
    alerts.push(generateAlert(
      'performance',
      currentMetrics.cpu_usage > 95 ? 'critical' : 'high',
      `High CPU usage detected: ${currentMetrics.cpu_usage}%`
    ));
  }
  
  if (currentMetrics.memory_usage > ALERT_THRESHOLDS.memory_usage) {
    alerts.push(generateAlert(
      'performance',
      currentMetrics.memory_usage > 95 ? 'critical' : 'high',
      `High memory usage detected: ${currentMetrics.memory_usage}%`
    ));
  }
  
  if (currentMetrics.database_response_time > ALERT_THRESHOLDS.database_response_time) {
    alerts.push(generateAlert(
      'database',
      currentMetrics.database_response_time > 5000 ? 'critical' : 'medium',
      `Slow database response: ${currentMetrics.database_response_time}ms`
    ));
  }
  
  if (currentMetrics.error_rate > ALERT_THRESHOLDS.error_rate) {
    alerts.push(generateAlert(
      'error',
      currentMetrics.error_rate > 10 ? 'critical' : 'high',
      `High error rate detected: ${currentMetrics.error_rate}%`
    ));
  }

  return alerts;
}

async function collectMetrics(): Promise<AlertMetrics> {
  const startTime = Date.now();
  
  try {
    // Test database response time
    await prisma.$queryRaw`SELECT 1`;
    const dbResponseTime = Date.now() - startTime;
    
    // Get memory usage
    const memUsage = process.memoryUsage();
    const memoryPercentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
    
    // Simulate CPU usage (in production, this would come from system monitoring)
    const cpuUsage = Math.random() * 100;
    
    // Update current metrics
    currentMetrics = {
      timestamp: new Date().toISOString(),
      cpu_usage: cpuUsage,
      memory_usage: memoryPercentage,
      database_response_time: dbResponseTime,
      error_rate: Math.random() * 10, // In production, calculate from error logs
      active_users: Math.floor(Math.random() * 500), // In production, get from session store
      request_count: Math.floor(Math.random() * 1000) // In production, get from request logs
    };
    
    return currentMetrics;
    
  } catch (error) {
    // Database error - create critical alert
    const dbAlert = generateAlert(
      'database',
      'critical',
      'Database connection failed'
    );
    alertHistory.push(dbAlert);
    
    throw error;
  }
}

/**
 * GET /api/monitoring/alerts
 * Real-time performance monitoring endpoint
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    // Collect current metrics
    const metrics = await collectMetrics();
    
    // Check for new alerts
    const newAlerts = checkPerformanceAlerts();
    alertHistory.push(...newAlerts);
    
    // Keep only last 100 alerts
    if (alertHistory.length > 100) {
      alertHistory = alertHistory.slice(-100);
    }
    
    // Get query parameters
    const url = new URL(request.url);
    const severity = url.searchParams.get('severity') as Alert['severity'] | null;
    const type = url.searchParams.get('type') as Alert['type'] | null;
    const resolved = url.searchParams.get('resolved') === 'true';
    
    // Filter alerts
    let filteredAlerts = alertHistory;
    if (severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
    }
    if (type) {
      filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
    }
    if (resolved !== null) {
      filteredAlerts = filteredAlerts.filter(alert => 
        resolved ? alert.resolved_at : !alert.resolved_at
      );
    }
    
    // Calculate alert summary
    const alertSummary = {
      total: alertHistory.length,
      unresolved: alertHistory.filter(a => !a.resolved_at).length,
      by_severity: {
        critical: alertHistory.filter(a => a.severity === 'critical' && !a.resolved_at).length,
        high: alertHistory.filter(a => a.severity === 'high' && !a.resolved_at).length,
        medium: alertHistory.filter(a => a.severity === 'medium' && !a.resolved_at).length,
        low: alertHistory.filter(a => a.severity === 'low' && !a.resolved_at).length
      }
    };
    
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      current_metrics: metrics,
      alert_summary: alertSummary,
      alerts: filteredAlerts.slice(-20), // Last 20 alerts
      thresholds: ALERT_THRESHOLDS,
      system_status: {
        overall: alertSummary.by_severity.critical > 0 ? 'critical' : 
                 alertSummary.by_severity.high > 0 ? 'warning' : 'healthy',
        database: metrics.database_response_time < 500 ? 'healthy' : 'degraded',
        performance: metrics.cpu_usage < 80 && metrics.memory_usage < 85 ? 'healthy' : 'degraded'
      }
    });
    
  } catch (error) {
    console.error('Monitoring alerts error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to collect monitoring data',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/monitoring/alerts
 * Resolve alerts or create custom alerts
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, alert_id, custom_alert } = body;
    
    if (action === 'resolve' && alert_id) {
      // Resolve an alert
      const alertIndex = alertHistory.findIndex(alert => alert.id === alert_id);
      if (alertIndex >= 0) {
        alertHistory[alertIndex].resolved_at = new Date().toISOString();
        
        return NextResponse.json({
          status: 'success',
          message: 'Alert resolved successfully',
          alert: alertHistory[alertIndex]
        });
      } else {
        return NextResponse.json(
          { status: 'error', message: 'Alert not found' },
          { status: 404 }
        );
      }
    }
    
    if (action === 'create' && custom_alert) {
      // Create custom alert
      const newAlert = generateAlert(
        custom_alert.type || 'security',
        custom_alert.severity || 'medium',
        custom_alert.message || 'Custom alert'
      );
      alertHistory.push(newAlert);
      
      return NextResponse.json({
        status: 'success',
        message: 'Custom alert created',
        alert: newAlert
      });
    }
    
    return NextResponse.json(
      { status: 'error', message: 'Invalid action or missing parameters' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Alert action error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to process alert action',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});