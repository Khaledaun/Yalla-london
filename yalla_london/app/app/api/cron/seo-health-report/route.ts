export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

/**
 * SEO Health Dashboard - Weekly auto-report generation
 * Generates comprehensive reports using SeoReport model + BlogPost data
 */
export async function POST(request: NextRequest) {
  const _cronStart = Date.now();
  try {
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@/lib/db");

    const report = await generateWeeklyReport(prisma);

    // Store report using SeoReport model (correct model from schema)
    await prisma.seoReport.create({
      data: {
        reportType: "weekly_health",
        data: {
          auditStats: report.auditStats,
          topIssues: report.topIssues,
          schemaCoverage: report.schemaCoverage,
          recommendations: report.recommendations,
          metadata: report.metadata,
        },
      },
    });

    // Log the report
    console.log("[SEO Health Report] Weekly report generated:", {
      avg_score: report.auditStats.avg_seo_score,
      total_articles: report.auditStats.total_articles,
      issues_found: report.topIssues.total_issues,
      timestamp: new Date().toISOString(),
    });

    await logCronExecution("seo-health-report", "completed", {
      durationMs: Date.now() - _cronStart,
      resultSummary: {
        total_articles: report.auditStats.total_articles,
        avg_seo_score: report.auditStats.avg_seo_score,
        issues_found: report.topIssues.total_issues,
      },
    });

    return NextResponse.json({
      success: true,
      report: {
        total_articles: report.auditStats.total_articles,
        avg_seo_score: report.auditStats.avg_seo_score,
        issues_found: report.topIssues.total_issues,
      },
      message: "Weekly SEO health report generated successfully",
    });
  } catch (error) {
    console.error("SEO health report error:", error);
    await logCronExecution("seo-health-report", "failed", {
      durationMs: Date.now() - _cronStart,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Report generation failed",
      },
      { status: 500 },
    );
  }
}

/**
 * Get latest SEO health dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    const { prisma } = await import("@/lib/db");

    // Get latest weekly health report from SeoReport
    const latestReport = await prisma.seoReport.findFirst({
      where: { reportType: "weekly_health" },
      orderBy: { generatedAt: "desc" },
    });

    if (!latestReport) {
      return NextResponse.json({
        success: true,
        dashboard: {
          latest_report: null,
          message: "No SEO health reports yet. The weekly POST job will generate the first one.",
        },
      });
    }

    // Get real-time stats
    const realtimeStats = await generateRealtimeStats(prisma);

    return NextResponse.json({
      success: true,
      dashboard: {
        latest_report: {
          date: latestReport.generatedAt,
          data: latestReport.data,
        },
        realtime_stats: realtimeStats,
      },
    });
  } catch (error) {
    console.error("Get SEO dashboard error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get dashboard data",
      },
      { status: 500 },
    );
  }
}

/**
 * Generate comprehensive weekly report using BlogPost + SeoAuditResult
 */
async function generateWeeklyReport(prisma: any) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const auditStats = await generateAuditStats(prisma, oneWeekAgo);
  const topIssues = await analyzeTopIssues(prisma, oneWeekAgo);
  const schemaCoverage = await analyzeSchemacoverage(prisma);
  const recommendations = generateRecommendations(
    auditStats,
    topIssues,
    schemaCoverage,
  );

  return {
    auditStats,
    topIssues,
    schemaCoverage,
    recommendations,
    metadata: {
      report_period: "7_days",
      generated_at: new Date().toISOString(),
      total_audits_analyzed: auditStats.total_audits,
    },
  };
}

/**
 * Generate audit statistics from BlogPost + SeoAuditResult
 */
async function generateAuditStats(prisma: any, since: Date) {
  const [recentArticles, recentAudits, avgScore] = await Promise.all([
    prisma.blogPost.count({
      where: { created_at: { gte: since } },
    }),
    prisma.seoAuditResult.findMany({
      where: { created_at: { gte: since } },
      select: { score: true },
    }),
    prisma.blogPost.aggregate({
      _avg: { seo_score: true },
      where: { seo_score: { not: null } },
    }),
  ]);

  const scores = recentAudits
    .map((a: any) => a.score)
    .filter((s: number) => s > 0);

  const scoreDistribution = {
    excellent: scores.filter((s: number) => s >= 90).length,
    good: scores.filter((s: number) => s >= 80 && s < 90).length,
    fair: scores.filter((s: number) => s >= 70 && s < 80).length,
    poor: scores.filter((s: number) => s < 70).length,
  };

  return {
    total_articles: recentArticles,
    total_audits: recentAudits.length,
    avg_seo_score: Math.round(avgScore._avg.seo_score || 0),
    audit_rate:
      recentArticles > 0
        ? Math.round((recentAudits.length / recentArticles) * 100)
        : 0,
    score_distribution: scoreDistribution,
  };
}

/**
 * Analyze top SEO issues from audit results
 */
async function analyzeTopIssues(prisma: any, since: Date) {
  const audits = await prisma.seoAuditResult.findMany({
    where: { created_at: { gte: since } },
    select: { suggestions: true, quick_fixes: true },
  });

  const issueCounter: Record<string, number> = {};

  audits.forEach((audit: any) => {
    // Count quick fix occurrences
    const fixes = audit.quick_fixes || [];
    if (Array.isArray(fixes)) {
      fixes.forEach((fix: string) => {
        issueCounter[fix] = (issueCounter[fix] || 0) + 1;
      });
    }
    // Count suggestion occurrences
    const suggestions = audit.suggestions || [];
    if (Array.isArray(suggestions)) {
      suggestions.forEach((suggestion: any) => {
        const key =
          typeof suggestion === "string"
            ? suggestion
            : suggestion?.title || "unknown";
        issueCounter[key] = (issueCounter[key] || 0) + 1;
      });
    }
  });

  const topIssues = Object.entries(issueCounter)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([issue, count]) => ({ issue, count }));

  return {
    top_issues: topIssues,
    total_issues: Object.values(issueCounter).reduce((a, b) => a + b, 0),
  };
}

/**
 * Analyze which articles have proper meta data (proxy for schema coverage)
 */
async function analyzeSchemacoverage(prisma: any) {
  const [total, withMeta, withImage] = await Promise.all([
    prisma.blogPost.count({ where: { published: true } }),
    prisma.blogPost.count({
      where: {
        published: true,
        meta_title_en: { not: null },
        meta_description_en: { not: null },
      },
    }),
    prisma.blogPost.count({
      where: {
        published: true,
        featured_image: { not: null },
      },
    }),
  ]);

  return {
    total_articles: total,
    articles_with_meta: withMeta,
    articles_with_image: withImage,
    meta_coverage: total > 0 ? Math.round((withMeta / total) * 100) : 0,
    image_coverage: total > 0 ? Math.round((withImage / total) * 100) : 0,
  };
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(
  auditStats: any,
  topIssues: any,
  schemaCoverage: any,
) {
  const recommendations = [];

  if (auditStats.avg_seo_score < 80) {
    recommendations.push({
      type: "critical",
      title: "Improve Overall SEO Score",
      description: `Average SEO score is ${auditStats.avg_seo_score}. Focus on fixing the most common issues.`,
      action: "Review and fix top issues identified in the report",
    });
  }

  if (schemaCoverage.meta_coverage < 80) {
    recommendations.push({
      type: "important",
      title: "Increase Meta Data Coverage",
      description: `Only ${schemaCoverage.meta_coverage}% of published articles have complete meta data.`,
      action: "Add meta titles and descriptions to articles missing them",
    });
  }

  if (topIssues.top_issues.length > 0) {
    const topIssue = topIssues.top_issues[0];
    recommendations.push({
      type: "focus",
      title: `Address Top Issue: ${topIssue.issue}`,
      description: `This issue affects ${topIssue.count} articles.`,
      action: "Create a systematic approach to fix this recurring issue",
    });
  }

  return recommendations;
}

/**
 * Generate real-time stats for dashboard display
 */
async function generateRealtimeStats(prisma: any) {
  const recentAudits = await prisma.seoAuditResult.findMany({
    orderBy: { created_at: "desc" },
    take: 20,
    select: { created_at: true, score: true },
  });

  return {
    recent_audits: recentAudits.length,
    score_trend: recentAudits.map((a: any) => ({
      date: a.created_at,
      score: a.score,
    })),
    last_audit: recentAudits[0]?.created_at || null,
  };
}
