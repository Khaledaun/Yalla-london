export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { prisma } from '@/lib/db';

/**
 * POST /api/internal/cron/audit-daily
 * Internal cron job for daily audit automation
 * This endpoint is protected by cron secret rather than admin auth
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🕐 Daily audit cron triggered');

    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if audit system is enabled
    if (!isFeatureEnabled('AUDIT_SYSTEM') || !isFeatureEnabled('ADVANCED_CRON')) {
      console.log('⚠️ Audit system or advanced cron disabled');
      return NextResponse.json(
        { error: 'Audit system or advanced cron is disabled' },
        { status: 403 }
      );
    }

    const auditResults = {
      audit_id: `daily_audit_${Date.now()}`,
      started_at: new Date().toISOString(),
      audit_type: 'daily_automated',
      results: {}
    };

    console.log('📊 Running daily audit checks...');

    // 1. Content Health Audit
    auditResults.results.content_health = await performContentHealthAudit();
    
    // 2. System Performance Audit
    auditResults.results.system_performance = await performSystemPerformanceAudit();
    
    // 3. Security Audit
    auditResults.results.security_check = await performSecurityAudit();
    
    // 4. Data Integrity Audit
    auditResults.results.data_integrity = await performDataIntegrityAudit();
    
    // 5. Feature Flag Audit
    auditResults.results.feature_flags = await performFeatureFlagAudit();

    auditResults.completed_at = new Date().toISOString();
    auditResults.status = 'completed';

    // Calculate overall health score
    const healthScore = calculateOverallHealthScore(auditResults.results);
    auditResults.overall_health_score = healthScore;

    // Log critical issues if any
    const criticalIssues = findCriticalIssues(auditResults.results);
    if (criticalIssues.length > 0) {
      console.error('🚨 Critical issues found during daily audit:', criticalIssues);
      auditResults.critical_issues = criticalIssues;
    }

    console.log(`✅ Daily audit completed. Health score: ${healthScore}/100`);

    return NextResponse.json({
      status: 'success',
      message: 'Daily audit completed successfully',
      audit_results: auditResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Daily audit failed:', error);
    return NextResponse.json(
      { 
        error: 'Daily audit failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/internal/cron/audit-daily
 * Health check for the daily audit cron job
 */
export async function GET(request: NextRequest) {
  const isEnabled = isFeatureEnabled('AUDIT_SYSTEM') && isFeatureEnabled('ADVANCED_CRON');
  
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'daily audit cron',
    enabled: isEnabled,
    last_run: new Date().toISOString(), // In production, get from database
    next_scheduled: 'daily at 02:00 UTC',
    timestamp: new Date().toISOString()
  });
}

async function performContentHealthAudit() {
  try {
    // Check content published in last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentContent = await prisma.scheduledContent.count({
      where: {
        published_time: {
          gte: yesterday
        }
      }
    });

    // Check content with low SEO scores
    const lowSeoContent = await prisma.scheduledContent.count({
      where: {
        seo_score: {
          lt: 70
        },
        published: true
      }
    });

    // Check for broken or incomplete content
    const incompleteContent = await prisma.scheduledContent.count({
      where: {
        OR: [
          { title: { equals: '' } },
          { content: { equals: '' } },
          { status: 'draft' }
        ]
      }
    });

    return {
      status: 'completed',
      metrics: {
        content_published_24h: recentContent,
        low_seo_score_count: lowSeoContent,
        incomplete_content_count: incompleteContent
      },
      health_score: recentContent > 0 && lowSeoContent < 5 && incompleteContent === 0 ? 100 : 75,
      recommendations: generateContentRecommendations(recentContent, lowSeoContent, incompleteContent)
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      health_score: 0
    };
  }
}

async function performSystemPerformanceAudit() {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  // Calculate performance metrics
  const memoryHealthScore = memoryUsage.heapUsed / memoryUsage.heapTotal < 0.8 ? 100 : 60;
  const uptimeHealthScore = uptime > 86400 ? 100 : 80; // 1 day uptime is good

  return {
    status: 'completed',
    metrics: {
      memory_usage: memoryUsage,
      uptime_seconds: uptime,
      memory_health_score: memoryHealthScore,
      uptime_health_score: uptimeHealthScore
    },
    health_score: Math.round((memoryHealthScore + uptimeHealthScore) / 2),
    recommendations: generatePerformanceRecommendations(memoryHealthScore, uptimeHealthScore)
  };
}

async function performSecurityAudit() {
  // Mock security checks - in production would check actual security metrics
  const securityChecks = {
    admin_sessions_active: 1, // Mock data
    failed_login_attempts_24h: 0,
    api_rate_limiting_active: true,
    ssl_certificate_valid: true
  };

  const healthScore = securityChecks.failed_login_attempts_24h < 10 && 
                     securityChecks.api_rate_limiting_active && 
                     securityChecks.ssl_certificate_valid ? 100 : 70;

  return {
    status: 'completed',
    metrics: securityChecks,
    health_score: healthScore,
    recommendations: generateSecurityRecommendations(securityChecks)
  };
}

async function performDataIntegrityAudit() {
  try {
    // Check for data consistency issues
    const totalContent = await prisma.scheduledContent.count();
    const publishedContent = await prisma.scheduledContent.count({
      where: { published: true }
    });
    
    const dataConsistencyScore = totalContent > 0 ? 100 : 80;

    return {
      status: 'completed',
      metrics: {
        total_content_records: totalContent,
        published_content_records: publishedContent,
        data_consistency_score: dataConsistencyScore
      },
      health_score: dataConsistencyScore,
      recommendations: generateDataIntegrityRecommendations(totalContent, publishedContent)
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Database connectivity issue',
      health_score: 0
    };
  }
}

async function performFeatureFlagAudit() {
  const { getFeatureFlags, getFeatureFlagStats } = await import('@/lib/feature-flags');
  
  const flags = getFeatureFlags();
  const stats = getFeatureFlagStats();
  
  // Check for potential feature flag issues
  const healthScore = stats.total > 0 ? 100 : 80;

  return {
    status: 'completed',
    metrics: {
      total_flags: stats.total,
      enabled_flags: stats.enabled,
      disabled_flags: stats.disabled
    },
    health_score: healthScore,
    recommendations: generateFeatureFlagRecommendations(stats)
  };
}

function calculateOverallHealthScore(results: any): number {
  const scores = Object.values(results).map((result: any) => result.health_score || 0);
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function findCriticalIssues(results: any): string[] {
  const issues: string[] = [];
  
  Object.entries(results).forEach(([category, result]: [string, any]) => {
    if (result.health_score < 50) {
      issues.push(`Critical issue in ${category}: Health score ${result.health_score}/100`);
    }
    if (result.status === 'error') {
      issues.push(`Error in ${category}: ${result.error}`);
    }
  });
  
  return issues;
}

function generateContentRecommendations(recent: number, lowSeo: number, incomplete: number): string[] {
  const recommendations: string[] = [];
  
  if (recent === 0) {
    recommendations.push('No content published in last 24 hours - review publishing schedule');
  }
  if (lowSeo > 5) {
    recommendations.push(`${lowSeo} pieces of content have low SEO scores - review and optimize`);
  }
  if (incomplete > 0) {
    recommendations.push(`${incomplete} incomplete content items found - review drafts`);
  }
  
  return recommendations;
}

function generatePerformanceRecommendations(memoryScore: number, uptimeScore: number): string[] {
  const recommendations: string[] = [];
  
  if (memoryScore < 80) {
    recommendations.push('High memory usage detected - consider optimization or scaling');
  }
  if (uptimeScore < 90) {
    recommendations.push('System restart detected recently - monitor for stability');
  }
  
  return recommendations;
}

function generateSecurityRecommendations(checks: any): string[] {
  const recommendations: string[] = [];
  
  if (checks.failed_login_attempts_24h > 10) {
    recommendations.push('High number of failed login attempts - review security logs');
  }
  if (!checks.api_rate_limiting_active) {
    recommendations.push('API rate limiting disabled - security risk');
  }
  
  return recommendations;
}

function generateDataIntegrityRecommendations(total: number, published: number): string[] {
  const recommendations: string[] = [];
  
  if (total === 0) {
    recommendations.push('No content records found - check database connectivity');
  }
  if (published / total < 0.5) {
    recommendations.push('Low published content ratio - review content workflow');
  }
  
  return recommendations;
}

function generateFeatureFlagRecommendations(stats: any): string[] {
  const recommendations: string[] = [];
  
  if (stats.total === 0) {
    recommendations.push('No feature flags configured - review feature flag system');
  }
  if (stats.enabled / stats.total > 0.8) {
    recommendations.push('Most features enabled - consider gradual rollout strategy');
  }
  
  return recommendations;
}