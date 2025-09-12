/**
 * Enterprise Analytics Service
 * Handles GA4 integration, custom analytics, and privacy controls
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export interface AnalyticsConfig {
  ga4MeasurementId?: string;
  gtmContainerId?: string;
  enableAnalytics: boolean;
  enablePersonalization: boolean;
  dataRetentionDays: number;
  anonymizeIp: boolean;
  cookieConsent: boolean;
}

export interface AnalyticsEvent {
  eventName: string;
  category?: string;
  label?: string;
  value?: number;
  userId?: string;
  sessionId?: string;
  properties?: any;
}

export interface PageView {
  page: string;
  title: string;
  userId?: string;
  sessionId?: string;
  referrer?: string;
}

export interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  returnUsers: number;
  averageSessionDuration: number;
  bounceRate: number;
}

export interface ContentMetrics {
  pageViews: number;
  uniquePageViews: number;
  averageTimeOnPage: number;
  exitRate: number;
  topPages: Array<{ page: string; views: number }>;
}

export interface SystemMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  uptime: number;
}

class EnterpriseAnalyticsService {
  private config: AnalyticsConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AnalyticsConfig {
    return {
      ga4MeasurementId: process.env.GA4_MEASUREMENT_ID,
      gtmContainerId: process.env.GTM_CONTAINER_ID,
      enableAnalytics: process.env.FEATURE_CONTENT_ANALYTICS === 'true',
      enablePersonalization: process.env.ANALYTICS_PERSONALIZATION === 'true',
      dataRetentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS || '365'),
      anonymizeIp: process.env.ANALYTICS_ANONYMIZE_IP !== 'false',
      cookieConsent: process.env.ANALYTICS_REQUIRE_CONSENT !== 'false'
    };
  }

  /**
   * Track custom analytics event
   */
  async trackEvent(
    event: AnalyticsEvent,
    request?: NextRequest
  ): Promise<void> {
    if (!this.config.enableAnalytics) {
      return;
    }

    try {
      // Store event in database
      await prisma.analyticsEvent.create({
        data: {
          eventName: event.eventName,
          category: event.category || 'engagement',
          label: event.label,
          value: event.value,
          userId: event.userId,
          sessionId: event.sessionId,
          properties: event.properties || null,
          ipAddress: this.config.anonymizeIp ? 
            this.anonymizeIpAddress(request?.ip || request?.headers.get('x-forwarded-for') || 'unknown') :
            request?.ip || request?.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request?.headers.get('user-agent'),
          referer: request?.headers.get('referer')
        }
      });

      // Send to GA4 if configured
      if (this.config.ga4MeasurementId) {
        await this.sendToGA4(event, request);
      }
    } catch (error) {
      console.error('Failed to track analytics event:', error);
    }
  }

  /**
   * Track page view
   */
  async trackPageView(
    pageView: PageView,
    request?: NextRequest
  ): Promise<void> {
    await this.trackEvent({
      eventName: 'page_view',
      category: 'navigation',
      label: pageView.page,
      userId: pageView.userId,
      sessionId: pageView.sessionId,
      properties: {
        page: pageView.page,
        title: pageView.title,
        referrer: pageView.referrer
      }
    }, request);
  }

  /**
   * Get user metrics for reporting
   */
  async getUserMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<UserMetrics> {
    try {
      const totalUsers = await prisma.user.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const activeUsers = await prisma.analyticsEvent.groupBy({
        by: ['userId'],
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate
          },
          userId: {
            not: null
          }
        }
      });

      // Calculate session metrics
      const sessionEvents = await prisma.analyticsEvent.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate
          },
          eventName: 'page_view'
        },
        select: {
          sessionId: true,
          timestamp: true,
          userId: true
        },
        orderBy: {
          timestamp: 'asc'
        }
      });

      const sessionStats = this.calculateSessionStats(sessionEvents);

      return {
        totalUsers,
        activeUsers: activeUsers.length,
        newUsers: totalUsers, // Simplified - could be enhanced
        returnUsers: Math.max(0, activeUsers.length - totalUsers),
        averageSessionDuration: sessionStats.averageDuration,
        bounceRate: sessionStats.bounceRate
      };
    } catch (error) {
      console.error('Failed to get user metrics:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        newUsers: 0,
        returnUsers: 0,
        averageSessionDuration: 0,
        bounceRate: 0
      };
    }
  }

  /**
   * Get content performance metrics
   */
  async getContentMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<ContentMetrics> {
    try {
      const pageViewEvents = await prisma.analyticsEvent.findMany({
        where: {
          eventName: 'page_view',
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          properties: true,
          sessionId: true,
          timestamp: true
        }
      });

      const pageStats = this.calculatePageStats(pageViewEvents);

      return {
        pageViews: pageViewEvents.length,
        uniquePageViews: pageStats.uniqueViews,
        averageTimeOnPage: pageStats.averageTimeOnPage,
        exitRate: pageStats.exitRate,
        topPages: pageStats.topPages
      };
    } catch (error) {
      console.error('Failed to get content metrics:', error);
      return {
        pageViews: 0,
        uniquePageViews: 0,
        averageTimeOnPage: 0,
        exitRate: 0,
        topPages: []
      };
    }
  }

  /**
   * Get system performance metrics
   */
  async getSystemMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<SystemMetrics> {
    try {
      const metrics = await prisma.systemMetrics.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const requestMetrics = metrics.filter((m: any) => m.metricName === 'request_count');
      const responseTimeMetrics = metrics.filter((m: any) => m.metricName === 'response_time');
      const errorMetrics = metrics.filter((m: any) => m.metricName === 'error_count');
      const uptimeMetrics = metrics.filter((m: any) => m.metricName === 'uptime');

      return {
        requestCount: requestMetrics.reduce((sum: number, m: any) => sum + m.metricValue, 0),
        averageResponseTime: responseTimeMetrics.length > 0 ? 
          responseTimeMetrics.reduce((sum: number, m: any) => sum + m.metricValue, 0) / responseTimeMetrics.length : 0,
        errorRate: errorMetrics.length > 0 ? 
          errorMetrics.reduce((sum: number, m: any) => sum + m.metricValue, 0) / requestMetrics.length : 0,
        uptime: uptimeMetrics.length > 0 ? 
          uptimeMetrics[uptimeMetrics.length - 1].metricValue : 100
      };
    } catch (error) {
      console.error('Failed to get system metrics:', error);
      return {
        requestCount: 0,
        averageResponseTime: 0,
        errorRate: 0,
        uptime: 0
      };
    }
  }

  /**
   * Record system performance metric
   */
  async recordSystemMetric(
    metricName: string,
    value: number,
    unit?: string,
    tags?: any
  ): Promise<void> {
    try {
      await prisma.systemMetrics.create({
        data: {
          metricName,
          metricValue: value,
          metricUnit: unit,
          tags: tags || null
        }
      });
    } catch (error) {
      console.error('Failed to record system metric:', error);
    }
  }

  /**
   * Clean up old analytics data based on retention policy
   */
  async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.dataRetentionDays);

    try {
      await Promise.all([
        prisma.analyticsEvent.deleteMany({
          where: {
            timestamp: {
              lt: cutoffDate
            }
          }
        }),
        prisma.systemMetrics.deleteMany({
          where: {
            timestamp: {
              lt: cutoffDate
            }
          }
        })
      ]);
    } catch (error) {
      console.error('Failed to cleanup old analytics data:', error);
    }
  }

  /**
   * Get analytics configuration for frontend
   */
  getClientConfig(): Omit<AnalyticsConfig, 'dataRetentionDays'> {
    return {
      ga4MeasurementId: this.config.enableAnalytics ? this.config.ga4MeasurementId : undefined,
      gtmContainerId: this.config.enableAnalytics ? this.config.gtmContainerId : undefined,
      enableAnalytics: this.config.enableAnalytics,
      enablePersonalization: this.config.enablePersonalization,
      anonymizeIp: this.config.anonymizeIp,
      cookieConsent: this.config.cookieConsent
    };
  }

  /**
   * Send event to Google Analytics 4
   */
  private async sendToGA4(
    event: AnalyticsEvent,
    request?: NextRequest
  ): Promise<void> {
    if (!this.config.ga4MeasurementId) {
      return;
    }

    try {
      const measurementId = this.config.ga4MeasurementId;
      const apiSecret = process.env.GA4_API_SECRET;

      if (!apiSecret) {
        console.warn('GA4_API_SECRET not configured');
        return;
      }

      const payload = {
        client_id: event.sessionId || 'unknown',
        user_id: event.userId,
        events: [{
          name: event.eventName,
          parameters: {
            event_category: event.category,
            event_label: event.label,
            value: event.value,
            ...event.properties
          }
        }]
      };

      await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Failed to send event to GA4:', error);
    }
  }

  /**
   * Anonymize IP address for privacy
   */
  private anonymizeIpAddress(ip: string): string {
    if (ip === 'unknown') return ip;
    
    // IPv4: Remove last octet
    if (ip.includes('.')) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
      }
    }
    
    // IPv6: Remove last 64 bits
    if (ip.includes(':')) {
      const parts = ip.split(':');
      if (parts.length > 4) {
        return `${parts.slice(0, 4).join(':')}::`;
      }
    }
    
    return ip;
  }

  /**
   * Calculate session statistics
   */
  private calculateSessionStats(events: any[]): {
    averageDuration: number;
    bounceRate: number;
  } {
    const sessions = new Map<string, { start: Date; end: Date; pageViews: number }>();

    events.forEach(event => {
      const sessionId = event.sessionId;
      if (!sessionId) return;

      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
          start: event.timestamp,
          end: event.timestamp,
          pageViews: 1
        });
      } else {
        const session = sessions.get(sessionId)!;
        session.end = event.timestamp;
        session.pageViews++;
      }
    });

    const sessionArray = Array.from(sessions.values());
    const totalDuration = sessionArray.reduce((sum, session) => {
      return sum + (session.end.getTime() - session.start.getTime());
    }, 0);

    const bouncedSessions = sessionArray.filter(session => session.pageViews === 1).length;

    return {
      averageDuration: sessionArray.length > 0 ? totalDuration / sessionArray.length / 1000 : 0, // in seconds
      bounceRate: sessionArray.length > 0 ? bouncedSessions / sessionArray.length : 0
    };
  }

  /**
   * Calculate page statistics
   */
  private calculatePageStats(events: any[]): {
    uniqueViews: number;
    averageTimeOnPage: number;
    exitRate: number;
    topPages: Array<{ page: string; views: number }>;
  } {
    const uniqueSessions = new Set(events.map(e => e.sessionId).filter(Boolean));
    const pageViews = new Map<string, number>();

    events.forEach(event => {
      const page = event.properties?.page;
      if (page) {
        pageViews.set(page, (pageViews.get(page) || 0) + 1);
      }
    });

    const topPages = Array.from(pageViews.entries())
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    return {
      uniqueViews: uniqueSessions.size,
      averageTimeOnPage: 0, // Would need more sophisticated tracking
      exitRate: 0, // Would need exit event tracking
      topPages
    };
  }
}

// Export singleton instance
export const analyticsService = new EnterpriseAnalyticsService();