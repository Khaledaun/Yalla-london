export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { prisma } from "@/lib/db";

interface DashboardMetrics {
  sessions: number;
  organicClicks: number;
  avgSeoScore: number;
  indexedPages: number;
  totalPageViews: number;
  uniqueVisitors: number;
  publishedContent: number;
  totalUsers: number;
  conversionRate: number;
  lastUpdated: string;
  source: string;
  timeRange: string;
}

interface TaskSummary {
  total: number;
  pending: number;
  inProgress: number;
  overdue: number;
  highPriority: number;
}

interface PipelineHealth {
  contentPipeline: {
    status: "healthy" | "warning" | "error";
    articlesInDraft: number;
    articlesInReview: number;
    scheduledContent: number;
  };
  seoHealth: {
    status: "healthy" | "warning" | "error";
    averageScore: number;
    issuesCount: number;
  };
  systemHealth: {
    status: "healthy" | "warning" | "error";
    uptime: number;
    lastBackup: string;
  };
}

interface ConnectionState {
  analytics: {
    connected: boolean;
    service: string;
    lastSync?: string;
    error?: string;
  };
  searchConsole: {
    connected: boolean;
    service: string;
    lastSync?: string;
    error?: string;
  };
  wordpress: {
    connected: boolean;
    service: string;
    lastSync?: string;
    error?: string;
  };
}

/**
 * GET /api/admin/dashboard
 * Get real dashboard data including metrics, tasks, pipeline health, and connection states
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const timeRange = url.searchParams.get("timeRange") || "7d";

    // Calculate date range
    const now = new Date();
    const daysBack =
      timeRange === "24h"
        ? 1
        : timeRange === "7d"
          ? 7
          : timeRange === "30d"
            ? 30
            : 90;
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Get real metrics from database
    const [
      publishedPosts,
      totalUsers,
      recentBackups,
      scheduledContent,
      draftContent,
      reviewContent,
      totalTopics,
      avgSeoScore,
      recentDrafts,
      upcomingTopics,
    ] = await Promise.all([
      prisma.blogPost.count({
        where: { published: true },
      }),
      prisma.user.count({
        where: { isActive: true },
      }),
      prisma.databaseBackup.findFirst({
        where: { status: "completed" },
        orderBy: { created_at: "desc" },
      }),
      prisma.scheduledContent.count({
        where: {
          status: "pending",
          scheduled_time: { gte: now },
        },
      }),
      prisma.blogPost.count({
        where: { published: false },
      }),
      prisma.scheduledContent.count({
        where: { status: "pending" },
      }),
      prisma.topicProposal.count({
        where: { status: { in: ["planned", "queued", "ready"] } },
      }),
      prisma.blogPost.aggregate({
        _avg: { seo_score: true },
        where: { seo_score: { not: null } },
      }),
      // Recent unpublished posts (ready to publish)
      prisma.blogPost.findMany({
        where: { published: false, deletedAt: null },
        select: {
          id: true,
          title_en: true,
          title_ar: true,
          slug: true,
          seo_score: true,
          updated_at: true,
          tags: true,
        },
        orderBy: { updated_at: "desc" },
        take: 5,
      }),
      // Upcoming topic proposals
      prisma.topicProposal.findMany({
        where: { status: { in: ["planned", "queued", "ready"] } },
        select: {
          id: true,
          title: true,
          locale: true,
          primary_keyword: true,
          suggested_page_type: true,
          status: true,
          planned_at: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
        take: 5,
      }),
    ]);

    // Get analytics settings to determine connection status
    const [analyticsConfig, searchConsoleConfig] = await Promise.all([
      prisma.apiSettings.findFirst({
        where: {
          key_name: "google_analytics_id",
          is_active: true,
        },
      }),
      prisma.apiSettings.findFirst({
        where: {
          key_name: "google_search_console_client_id",
          is_active: true,
        },
      }),
    ]);

    // Calculate real metrics
    const metrics: DashboardMetrics = {
      sessions: 0, // Would come from GA4 API
      organicClicks: 0, // Would come from Search Console API
      avgSeoScore: Math.round(avgSeoScore._avg.seo_score || 0),
      indexedPages: 0, // Would come from Search Console API
      totalPageViews: 0, // Would come from GA4 API
      uniqueVisitors: 0, // Would come from GA4 API
      publishedContent: publishedPosts,
      totalUsers: totalUsers,
      conversionRate: 0, // Would come from GA4 API
      lastUpdated: new Date().toISOString(),
      source: "Yalla London Database",
      timeRange: timeRange,
    };

    // Calculate task summary (simulated structure for now)
    const taskSummary: TaskSummary = {
      total: draftContent + reviewContent + scheduledContent,
      pending: draftContent,
      inProgress: reviewContent,
      overdue: 0, // Would need a tasks table
      highPriority: Math.floor((draftContent + reviewContent) * 0.2), // Estimate 20% high priority
    };

    // Calculate pipeline health
    const pipelineHealth: PipelineHealth = {
      contentPipeline: {
        status: draftContent > 10 ? "warning" : "healthy",
        articlesInDraft: draftContent,
        articlesInReview: reviewContent,
        scheduledContent: scheduledContent,
      },
      seoHealth: {
        status: "healthy", // Would calculate from SEO scores
        averageScore: 0, // Would calculate from blog posts seo_score
        issuesCount: 0, // Would calculate from content analysis
      },
      systemHealth: {
        status: "healthy",
        uptime: 99.9,
        lastBackup: recentBackups?.created_at?.toISOString() || "Never",
      },
    };

    // Calculate connection states
    const connectionStates: ConnectionState = {
      analytics: {
        connected: !!analyticsConfig?.key_value,
        service: "Google Analytics 4",
        lastSync: analyticsConfig?.last_tested?.toISOString(),
        error:
          analyticsConfig?.test_status === "failed"
            ? "Connection failed"
            : undefined,
      },
      searchConsole: {
        connected: !!searchConsoleConfig?.key_value,
        service: "Google Search Console",
        lastSync: searchConsoleConfig?.last_tested?.toISOString(),
        error:
          searchConsoleConfig?.test_status === "failed"
            ? "Connection failed"
            : undefined,
      },
      wordpress: {
        connected: false, // Would check WordPress API settings
        service: "WordPress",
        error: "Not configured",
      },
    };

    // If analytics is connected, we would fetch real data here
    if (connectionStates.analytics.connected) {
      // TODO: Implement GA4 API calls
      // metrics.totalPageViews = await getGA4PageViews(timeRange);
      // metrics.uniqueVisitors = await getGA4UniqueVisitors(timeRange);
      // metrics.conversionRate = await getGA4ConversionRate(timeRange);
    }

    // Recent activity from audit logs
    const recentActivity = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        action: true,
        entity_type: true,
        entity_id: true,
        details: true,
        created_at: true,
        user_id: true,
      },
    });

    return NextResponse.json({
      status: "success",
      // Flat fields for simple frontend consumption
      readyToPublish: draftContent,
      scheduledContent: scheduledContent,
      totalArticles: publishedPosts + draftContent,
      totalTopics: totalTopics,
      seoScore: Math.round(avgSeoScore._avg.seo_score || 0),
      automationJobs: scheduledContent + reviewContent,
      // Lists for dashboard widgets
      recentDrafts: recentDrafts.map((post: any) => ({
        id: post.id,
        title: post.title_en,
        titleAr: post.title_ar,
        slug: post.slug,
        seoScore: post.seo_score || 0,
        updatedAt: post.updated_at,
        locale: post.title_ar && !post.title_en ? "ar" : "en",
      })),
      upcomingTopics: upcomingTopics.map((topic: any) => ({
        id: topic.id,
        title: topic.title,
        locale: topic.locale,
        keyword: topic.primary_keyword,
        pageType: topic.suggested_page_type,
        status: topic.status,
        plannedAt: topic.planned_at || topic.created_at,
      })),
      data: {
        metrics,
        taskSummary,
        pipelineHealth,
        connectionStates,
        recentActivity: recentActivity.map((activity: any) => ({
          id: activity.id,
          type: activity.entity_type?.toLowerCase() || "system",
          action: activity.action,
          title: `${activity.action} - ${activity.entity_type}`,
          description: activity.entity_id
            ? `Entity: ${activity.entity_id}`
            : "System action",
          timestamp: activity.created_at,
          user: activity.user_id,
          status: "success",
        })),
        lastUpdated: new Date().toISOString(),
        cached: false,
      },
    });
  } catch (error) {
    console.error("Dashboard data retrieval error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to retrieve dashboard data",
        error: error instanceof Error ? error.message : "Unknown error",
        fallback: {
          metrics: {
            totalPageViews: 0,
            uniqueVisitors: 0,
            publishedContent: 0,
            totalUsers: 0,
            conversionRate: 0,
            lastUpdated: new Date().toISOString(),
            source: "Error - Using Fallback",
            timeRange: "7d",
          },
          taskSummary: {
            total: 0,
            pending: 0,
            inProgress: 0,
            overdue: 0,
            highPriority: 0,
          },
          pipelineHealth: {
            contentPipeline: {
              status: "error" as const,
              articlesInDraft: 0,
              articlesInReview: 0,
              scheduledContent: 0,
            },
            seoHealth: {
              status: "error" as const,
              averageScore: 0,
              issuesCount: 0,
            },
            systemHealth: {
              status: "error" as const,
              uptime: 0,
              lastBackup: "Unknown",
            },
          },
          connectionStates: {
            analytics: {
              connected: false,
              service: "Google Analytics 4",
              error: "Service unavailable",
            },
            searchConsole: {
              connected: false,
              service: "Google Search Console",
              error: "Service unavailable",
            },
            wordpress: {
              connected: false,
              service: "WordPress",
              error: "Service unavailable",
            },
          },
          recentActivity: [],
          lastUpdated: new Date().toISOString(),
          cached: false,
        },
      },
      { status: 500 },
    );
  }
});
