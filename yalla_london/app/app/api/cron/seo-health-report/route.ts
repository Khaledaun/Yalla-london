export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';

/**
 * SEO Health Dashboard - Weekly auto-report generation
 * Generates comprehensive reports on audit rates, top issues, and schema coverage
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');
    
    // Generate comprehensive SEO health report
    const report = await generateWeeklyReport(prisma);
    
    // Send notifications to admins/editors
    await sendHealthReport(report);
    
    // Store report in database for dashboard display
    await prisma.seoHealthReport.create({
      data: {
        reportDate: new Date(),
        auditStats: report.auditStats,
        topIssues: report.topIssues,
        schemaCoverage: report.schemaCoverage,
        performance: report.performance,
        recommendations: report.recommendations,
        metadata: report.metadata
      }
    });

    return NextResponse.json({
      success: true,
      report: {
        total_articles: report.auditStats.total_articles,
        avg_seo_score: report.auditStats.avg_seo_score,
        issues_found: report.topIssues.top_issues.length,
        schema_coverage: report.schemaCoverage.coverage_percentage
      },
      message: 'Weekly SEO health report generated successfully'
    });

  } catch (error) {
    console.error('SEO health report error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Report generation failed' 
      },
      { status: 500 }
    );
  }
}

/**
 * Get latest SEO health dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const { prisma } = await import('@/lib/db');
    
    // Get latest report
    const latestReport = await prisma.seoHealthReport.findFirst({
      orderBy: { reportDate: 'desc' }
    });

    if (!latestReport) {
      return NextResponse.json({
        success: false,
        error: 'No SEO health reports found'
      }, { status: 404 });
    }

    // Get real-time stats for dashboard
    const realtimeStats = await generateRealtimeStats(prisma, days);

    return NextResponse.json({
      success: true,
      dashboard: {
        latest_report: {
          date: latestReport.reportDate,
          audit_stats: latestReport.auditStats,
          top_issues: latestReport.topIssues,
          schema_coverage: latestReport.schemaCoverage,
          performance: latestReport.performance
        },
        realtime_stats: realtimeStats
      }
    });

  } catch (error) {
    console.error('Get SEO dashboard error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get dashboard data' 
      },
      { status: 500 }
    );
  }
}

/**
 * Generate comprehensive weekly report
 */
async function generateWeeklyReport(prisma: any) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Audit Statistics
  const auditStats = await generateAuditStats(prisma, oneWeekAgo);
  
  // Top Issues Analysis
  const topIssues = await analyzeTopIssues(prisma, oneWeekAgo);
  
  // Schema Coverage Analysis
  const schemaCoverage = await analyzeSchemaMarket(prisma);
  
  // Performance Metrics
  const performance = await analyzePerformanceMetrics(prisma, oneWeekAgo);
  
  // Generate recommendations
  const recommendations = generateRecommendations(auditStats, topIssues, schemaCoverage);

  return {
    auditStats,
    topIssues,
    schemaCoverage,
    performance,
    recommendations,
    metadata: {
      report_period: '7_days',
      generated_at: new Date().toISOString(),
      total_audits_analyzed: auditStats.total_audits
    }
  };
}

/**
 * Generate audit statistics
 */
async function generateAuditStats(prisma: any, since: Date) {
  const articles = await prisma.article.findMany({
    where: { publishedAt: { gte: since } },
    include: { seoData: true }
  });

  const audits = await prisma.seoAuditResult.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' }
  });

  const scores = audits.map((audit: any) => audit.score).filter((score: number) => score > 0);
  const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;

  const scoreDistribution = {
    excellent: scores.filter((s: number) => s >= 90).length,
    good: scores.filter((s: number) => s >= 80 && s < 90).length,
    fair: scores.filter((s: number) => s >= 70 && s < 80).length,
    poor: scores.filter((s: number) => s < 70).length
  };

  return {
    total_articles: articles.length,
    total_audits: audits.length,
    avg_seo_score: Math.round(avgScore),
    audit_rate: articles.length > 0 ? Math.round((audits.length / articles.length) * 100) : 0,
    score_distribution: scoreDistribution,
    auto_fixes_applied: audits.reduce((sum: number, audit: any) => 
      sum + (audit.metadata?.auto_fixes_applied || 0), 0)
  };
}

/**
 * Analyze top SEO issues
 */
async function analyzeTopIssues(prisma: any, since: Date) {
  const audits = await prisma.seoAuditResult.findMany({
    where: { createdAt: { gte: since } },
    select: { suggestions: true }
  });

  const issueCounter: { [key: string]: number } = {};
  const severityCounter: { [key: string]: number } = {};

  audits.forEach((audit: any) => {
    const suggestions = audit.suggestions || [];
    suggestions.forEach((suggestion: any) => {
      issueCounter[suggestion.title] = (issueCounter[suggestion.title] || 0) + 1;
      severityCounter[suggestion.severity] = (severityCounter[suggestion.severity] || 0) + 1;
    });
  });

  const topIssues = Object.entries(issueCounter)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([issue, count]) => ({ issue, count }));

  return {
    top_issues: topIssues,
    severity_breakdown: severityCounter,
    total_issues: Object.values(issueCounter).reduce((a: number, b: number) => a + b, 0)
  };
}

/**
 * Analyze schema markup coverage
 */
async function analyzeSchemaMarket(prisma: any) {
  const articles = await prisma.article.findMany({
    include: { seoData: true }
  });

  let schemaCount = 0;
  const schemaTypes: { [key: string]: number } = {};

  articles.forEach((article: any) => {
    if (article.seoData?.schema) {
      schemaCount++;
      const schema = article.seoData.schema;
      if (schema['@type']) {
        schemaTypes[schema['@type']] = (schemaTypes[schema['@type']] || 0) + 1;
      }
    }
  });

  const coveragePercentage = articles.length > 0 ? Math.round((schemaCount / articles.length) * 100) : 0;

  return {
    total_articles: articles.length,
    articles_with_schema: schemaCount,
    coverage_percentage: coveragePercentage,
    schema_types: schemaTypes,
    missing_schema: articles.length - schemaCount
  };
}

/**
 * Analyze performance metrics
 */
async function analyzePerformanceMetrics(prisma: any, since: Date) {
  const optimizations = await prisma.optimizationLog.findMany({
    where: { createdAt: { gte: since } }
  });

  const avgScoreImprovement = optimizations.length > 0 
    ? optimizations.reduce((sum: number, opt: any) => sum + (opt.afterScore - opt.beforeScore), 0) / optimizations.length
    : 0;

  return {
    total_optimizations: optimizations.length,
    avg_score_improvement: Math.round(avgScoreImprovement),
    low_traffic_fixes: optimizations.filter((opt: any) => opt.trigger.includes('low_traffic')).length,
    stale_content_refreshes: optimizations.filter((opt: any) => opt.trigger.includes('stale')).length
  };
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(auditStats: any, topIssues: any, schemaCoverage: any) {
  const recommendations = [];

  if (auditStats.avg_seo_score < 80) {
    recommendations.push({
      type: 'critical',
      title: 'Improve Overall SEO Score',
      description: `Average SEO score is ${auditStats.avg_seo_score}. Focus on fixing the most common issues.`,
      action: 'Review and fix top issues identified in the report'
    });
  }

  if (schemaCoverage.coverage_percentage < 80) {
    recommendations.push({
      type: 'important',
      title: 'Increase Schema Markup Coverage',
      description: `Only ${schemaCoverage.coverage_percentage}% of articles have schema markup.`,
      action: 'Add schema markup to articles without structured data'
    });
  }

  if (topIssues.top_issues.length > 0) {
    const topIssue = topIssues.top_issues[0];
    recommendations.push({
      type: 'focus',
      title: `Address Top Issue: ${topIssue.issue}`,
      description: `This issue affects ${topIssue.count} articles.`,
      action: 'Create a systematic approach to fix this recurring issue'
    });
  }

  return recommendations;
}

/**
 * Generate real-time stats for dashboard
 */
async function generateRealtimeStats(prisma: any, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const recentAudits = await prisma.seoAuditResult.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  const scoresTrend = recentAudits.map((audit: any) => ({
    date: audit.createdAt,
    score: audit.score
  }));

  return {
    recent_audits: recentAudits.length,
    score_trend: scoresTrend,
    last_audit: recentAudits[0]?.createdAt || null
  };
}

/**
 * Send health report notifications
 */
async function sendHealthReport(report: any) {
  try {
    // In a real implementation, this would send to Slack/Discord/Email
    console.log('📊 Weekly SEO Health Report', {
      avg_score: report.auditStats.avg_seo_score,
      total_issues: report.topIssues.total_issues,
      schema_coverage: report.schemaCoverage.coverage_percentage + '%',
      recommendations: report.recommendations.length,
      timestamp: new Date().toISOString()
    });

    // Example integrations:
    // await sendSlackReport(report);
    // await sendEmailReport(report);
    
  } catch (error) {
    console.error('Error sending SEO health report:', error);
  }
}