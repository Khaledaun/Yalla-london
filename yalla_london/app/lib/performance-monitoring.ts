/**
 * Performance Monitoring and APM Integration
 * Centralized error tracking, performance monitoring, and alerting
 */

import { logAuditEvent } from './rbac';

// Sentry configuration interface
interface SentryConfig {
  dsn?: string;
  environment?: string;
  release?: string;
  sampleRate?: number;
  tracesSampleRate?: number;
}

// Performance metrics interface
interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: Date;
  tags?: Record<string, string>;
  user?: string;
}

// Error tracking interface
interface ErrorEvent {
  error: Error;
  context?: Record<string, any>;
  user?: string;
  extra?: Record<string, any>;
  tags?: Record<string, string>;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private sentryEnabled: boolean = false;
  private config: SentryConfig;

  constructor() {
    this.config = {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.SENTRY_RELEASE,
      sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || '1.0'),
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1')
    };

    this.initializeSentry();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private async initializeSentry() {
    try {
      if (this.config.dsn && typeof window === 'undefined') {
        // Server-side Sentry initialization
        const Sentry = await import('@sentry/nextjs');
        
        Sentry.init({
          dsn: this.config.dsn,
          environment: this.config.environment,
          release: this.config.release,
          sampleRate: this.config.sampleRate,
          tracesSampleRate: this.config.tracesSampleRate,
          
          // Enhanced error filtering
          beforeSend(event, hint) {
            // Filter out common false positives
            const error = hint.originalException;
            if (error instanceof Error) {
              // Skip network errors in development
              if (process.env.NODE_ENV === 'development' && 
                  (error.message.includes('ECONNREFUSED') || 
                   error.message.includes('fetch failed'))) {
                return null;
              }
              
              // Skip known Next.js hydration warnings
              if (error.message.includes('Hydration') || 
                  error.message.includes('Text content does not match')) {
                return null;
              }
            }
            
            return event;
          },

          // Performance monitoring
          profilesSampleRate: 0.1,
          
          // Enhanced context
          initialScope: {
            tags: {
              component: 'zenitha-platform-api',
              version: this.config.release || 'unknown'
            }
          }
        });

        this.sentryEnabled = true;
        console.log('✅ Sentry initialized for performance monitoring');
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize Sentry:', error);
      this.sentryEnabled = false;
    }
  }

  /**
   * Track error events with enhanced context
   */
  async captureError(errorEvent: ErrorEvent): Promise<void> {
    try {
      // Always log to audit system
      await logAuditEvent({
        action: 'error_occurred',
        resource: 'application',
        details: {
          error_message: errorEvent.error.message,
          error_stack: errorEvent.error.stack,
          context: errorEvent.context,
          level: errorEvent.level || 'error'
        },
        success: false,
        errorMessage: errorEvent.error.message,
        userId: errorEvent.user
      });

      // Send to Sentry if available
      if (this.sentryEnabled) {
        const Sentry = await import('@sentry/nextjs');
        
        Sentry.withScope(scope => {
          if (errorEvent.user) {
            scope.setUser({ id: errorEvent.user });
          }
          
          if (errorEvent.tags) {
            Object.entries(errorEvent.tags).forEach(([key, value]) => {
              scope.setTag(key, value);
            });
          }
          
          if (errorEvent.context) {
            scope.setContext('error_context', errorEvent.context);
          }
          
          if (errorEvent.extra) {
            Object.entries(errorEvent.extra).forEach(([key, value]) => {
              scope.setExtra(key, value);
            });
          }
          
          scope.setLevel(errorEvent.level || 'error');
          
          Sentry.captureException(errorEvent.error);
        });
      }

      // Console logging for development
      if (process.env.NODE_ENV === 'development') {
        console.error('🔴 Error captured:', {
          message: errorEvent.error.message,
          context: errorEvent.context,
          user: errorEvent.user
        });
      }
    } catch (error) {
      console.error('Failed to capture error:', error);
    }
  }

  /**
   * Track performance metrics
   */
  async trackPerformance(metric: PerformanceMetric): Promise<void> {
    try {
      // Log to audit system
      await logAuditEvent({
        action: 'performance_metric',
        resource: 'application',
        details: {
          metric_name: metric.name,
          metric_value: metric.value,
          metric_unit: metric.unit,
          tags: metric.tags
        },
        userId: metric.user
      });

      // Send to Sentry
      if (this.sentryEnabled) {
        const Sentry = await import('@sentry/nextjs');
        
        Sentry.addBreadcrumb({
          category: 'performance',
          message: `${metric.name}: ${metric.value}${metric.unit}`,
          level: 'info',
          data: {
            value: metric.value,
            unit: metric.unit,
            tags: metric.tags
          }
        });
      }

      // Check for performance thresholds
      await this.checkPerformanceThresholds(metric);
      
    } catch (error) {
      console.error('Failed to track performance metric:', error);
    }
  }

  /**
   * Check performance thresholds and alert
   */
  private async checkPerformanceThresholds(metric: PerformanceMetric): Promise<void> {
    const thresholds = {
      'api_response_time': { warning: 2000, critical: 5000 }, // ms
      'database_query_time': { warning: 1000, critical: 3000 }, // ms
      'memory_usage': { warning: 80, critical: 95 }, // percentage
      'error_rate': { warning: 1, critical: 5 } // percentage
    };

    const threshold = thresholds[metric.name as keyof typeof thresholds];
    if (!threshold) return;

    let alertLevel: 'warning' | 'critical' | null = null;
    
    if (metric.value >= threshold.critical) {
      alertLevel = 'critical';
    } else if (metric.value >= threshold.warning) {
      alertLevel = 'warning';
    }

    if (alertLevel) {
      await this.sendAlert({
        level: alertLevel,
        metric: metric.name,
        value: metric.value,
        threshold: alertLevel === 'critical' ? threshold.critical : threshold.warning,
        user: metric.user,
        tags: metric.tags
      });
    }
  }

  /**
   * Send performance alerts
   */
  private async sendAlert(alert: {
    level: 'warning' | 'critical';
    metric: string;
    value: number;
    threshold: number;
    user?: string;
    tags?: Record<string, string>;
  }): Promise<void> {
    try {
      // Log alert to audit system
      await logAuditEvent({
        action: 'performance_alert',
        resource: 'monitoring',
        details: {
          alert_level: alert.level,
          metric_name: alert.metric,
          current_value: alert.value,
          threshold_value: alert.threshold,
          tags: alert.tags
        },
        userId: alert.user,
        success: true
      });

      // Send to Sentry
      if (this.sentryEnabled) {
        const Sentry = await import('@sentry/nextjs');
        
        Sentry.withScope(scope => {
          scope.setLevel(alert.level === 'critical' ? 'error' : 'warning');
          scope.setTag('alert_type', 'performance');
          scope.setTag('metric', alert.metric);
          
          if (alert.tags) {
            Object.entries(alert.tags).forEach(([key, value]) => {
              scope.setTag(key, value);
            });
          }
          
          scope.setContext('performance_alert', {
            metric: alert.metric,
            value: alert.value,
            threshold: alert.threshold,
            percentage_over: ((alert.value - alert.threshold) / alert.threshold * 100).toFixed(2)
          });
          
          Sentry.captureMessage(
            `Performance Alert: ${alert.metric} (${alert.value}) exceeded ${alert.level} threshold (${alert.threshold})`,
            alert.level === 'critical' ? 'error' : 'warning'
          );
        });
      }

      // Console logging for development
      if (process.env.NODE_ENV === 'development') {
        console.warn(`🔸 Performance Alert [${alert.level.toUpperCase()}]:`, {
          metric: alert.metric,
          value: alert.value,
          threshold: alert.threshold,
          tags: alert.tags
        });
      }
    } catch (error) {
      console.error('Failed to send performance alert:', error);
    }
  }

  /**
   * Start performance transaction
   */
  startTransaction(name: string, operation: string = 'http.server'): any {
    if (this.sentryEnabled) {
      try {
        const Sentry = require('@sentry/nextjs');
        return Sentry.startTransaction({
          name,
          op: operation,
          tags: {
            component: 'yalla-london-api'
          }
        });
      } catch (error) {
        console.warn('Failed to start Sentry transaction:', error);
      }
    }
    
    // Fallback to simple timer
    return {
      startTime: Date.now(),
      finish: function() {
        const duration = Date.now() - this.startTime;
        console.log(`Transaction ${name} completed in ${duration}ms`);
      }
    };
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category: string = 'custom', data?: Record<string, any>): void {
    if (this.sentryEnabled) {
      try {
        const Sentry = require('@sentry/nextjs');
        Sentry.addBreadcrumb({
          message,
          category,
          level: 'info',
          data
        });
      } catch (error) {
        console.warn('Failed to add breadcrumb:', error);
      }
    }
  }

  /**
   * Set user context
   */
  setUser(user: { id?: string; email?: string; username?: string }): void {
    if (this.sentryEnabled) {
      try {
        const Sentry = require('@sentry/nextjs');
        Sentry.setUser(user);
      } catch (error) {
        console.warn('Failed to set user context:', error);
      }
    }
  }

  /**
   * Get configuration status
   */
  getStatus(): { enabled: boolean; config: SentryConfig } {
    return {
      enabled: this.sentryEnabled,
      config: this.config
    };
  }
}

// Singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Helper functions for common use cases
export async function captureError(error: Error, context?: Record<string, any>, user?: string): Promise<void> {
  await performanceMonitor.captureError({
    error,
    context,
    user,
    level: 'error'
  });
}

export async function captureWarning(error: Error, context?: Record<string, any>, user?: string): Promise<void> {
  await performanceMonitor.captureError({
    error,
    context,
    user,
    level: 'warning'
  });
}

export async function trackApiResponseTime(endpoint: string, duration: number, user?: string): Promise<void> {
  await performanceMonitor.trackPerformance({
    name: 'api_response_time',
    value: duration,
    unit: 'ms',
    timestamp: new Date(),
    tags: { endpoint },
    user
  });
}

export async function trackDatabaseQueryTime(query: string, duration: number, user?: string): Promise<void> {
  await performanceMonitor.trackPerformance({
    name: 'database_query_time',
    value: duration,
    unit: 'ms',
    timestamp: new Date(),
    tags: { query: query.substring(0, 100) }, // Truncate for privacy
    user
  });
}

export function startApiTransaction(endpoint: string): any {
  return performanceMonitor.startTransaction(`API ${endpoint}`, 'http.server');
}

export { PerformanceMonitor };