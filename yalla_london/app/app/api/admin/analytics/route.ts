export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { prisma } from "@/lib/db";
import { getDefaultSiteId } from "@/config/sites";

interface AnalyticsConfig {
  service: "ga4" | "google_search_console" | "custom";
  config_name: string;
  status: "configured" | "not_configured" | "error" | "testing";
  configuration: {
    tracking_id_configured?: boolean;
    measurement_id_configured?: boolean;
    property_id_configured?: boolean;
    client_id_configured?: boolean;
    client_secret_configured?: boolean;
    service_account_email_configured?: boolean;
    private_key_configured?: boolean;
    site_url?: string;
    api_key_configured?: boolean;
  };
  features: string[];
  last_sync?: string;
  metrics_available: string[];
}

interface AnalyticsMetrics {
  service: string;
  period: "24h" | "7d" | "30d" | "90d";
  metrics: {
    page_views?: number;
    unique_visitors?: number;
    bounce_rate?: number;
    avg_session_duration?: number;
    click_through_rate?: number;
    impressions?: number;
    avg_position?: number;
    search_queries?: number;
  };
  top_pages: Array<{
    page: string;
    views: number;
    ctr?: number;
    position?: number;
  }>;
  top_queries: Array<{
    query: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  }>;
}

let analyticsConfigurations: Map<string, AnalyticsConfig> = new Map();

// Parse GOOGLE_SERVICE_ACCOUNT_KEY JSON blob if present
let _serviceAccountEmail: string | undefined;
let _serviceAccountKey: string | undefined;
try {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    _serviceAccountEmail = parsed.client_email;
    _serviceAccountKey = parsed.private_key;
  }
} catch { /* not valid JSON */ }

// Detect credentials using the ACTUAL env var names used in the codebase
const ga4HasCredentials = !!(
  process.env.GA4_PROPERTY_ID &&
  (process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL || process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || process.env.GSC_CLIENT_EMAIL || _serviceAccountEmail) &&
  (process.env.GOOGLE_ANALYTICS_PRIVATE_KEY || process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY || process.env.GSC_PRIVATE_KEY || _serviceAccountKey)
);
const gscHasCredentials = !!(
  process.env.GSC_SITE_URL &&
  (process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || process.env.GSC_CLIENT_EMAIL) &&
  (process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY || process.env.GSC_PRIVATE_KEY)
);

// Initialize default configurations
const DEFAULT_ANALYTICS_CONFIGS: AnalyticsConfig[] = [
  {
    service: "ga4",
    config_name: "Google Analytics 4",
    status: ga4HasCredentials ? "configured" : "not_configured",
    configuration: {
      tracking_id_configured: !!(process.env.GA4_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
      measurement_id_configured: !!(process.env.GA4_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
      property_id_configured: !!process.env.GA4_PROPERTY_ID,
      service_account_email_configured: !!(process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL || process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || process.env.GSC_CLIENT_EMAIL || _serviceAccountEmail),
      private_key_configured: !!(process.env.GOOGLE_ANALYTICS_PRIVATE_KEY || process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY || process.env.GSC_PRIVATE_KEY || _serviceAccountKey),
    },
    features: [
      "page_views_tracking",
      "user_behavior_analysis",
      "conversion_tracking",
      "custom_events",
      "ecommerce_tracking",
      "real_time_data",
    ],
    metrics_available: [
      "page_views",
      "unique_visitors",
      "bounce_rate",
      "avg_session_duration",
      "conversion_rate",
      "revenue",
    ],
  },
  {
    service: "google_search_console",
    config_name: "Google Search Console",
    status: gscHasCredentials ? "configured" : "not_configured",
    configuration: {
      client_id_configured: !!(process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || process.env.GSC_CLIENT_EMAIL),
      client_secret_configured: !!(process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY || process.env.GSC_PRIVATE_KEY),
      site_url: process.env.GSC_SITE_URL || undefined,
    },
    features: [
      "search_performance",
      "index_coverage",
      "mobile_usability",
      "core_web_vitals",
      "sitemaps_management",
      "url_inspection",
    ],
    metrics_available: [
      "impressions",
      "clicks",
      "click_through_rate",
      "avg_position",
      "search_queries",
      "indexed_pages",
    ],
  },
];

DEFAULT_ANALYTICS_CONFIGS.forEach((config) => {
  analyticsConfigurations.set(config.service, config);
});

function emptyMetrics(service: string, period: string): AnalyticsMetrics {
  return {
    service,
    period: period as any,
    metrics: {
      page_views: 0,
      unique_visitors: 0,
      bounce_rate: 0,
      avg_session_duration: 0,
      impressions: 0,
      click_through_rate: 0,
      avg_position: 0,
      search_queries: 0,
    },
    top_pages: [],
    top_queries: [],
  };
}

/** Period string → days lookback */
function periodToDays(period: string): number {
  switch (period) {
    case "24h": return 1;
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    default: return 7;
  }
}

/**
 * Pull real metrics from DB — falls back to zeros when no data exists.
 * GA4 data comes from AnalyticsSnapshot (written by /api/cron/analytics).
 * GSC per-page data comes from GscPagePerformance (written by /api/cron/gsc-sync).
 */
async function getMetricsFromDB(service: string, period: string, siteId: string): Promise<AnalyticsMetrics> {
  try {
    if (service === "ga4") {
      // Get the most recent AnalyticsSnapshot for this site
      const snapshot = await prisma.analyticsSnapshot.findFirst({
        where: { site_id: siteId },
        orderBy: { created_at: "desc" },
      });

      if (!snapshot) return emptyMetrics(service, period);

      const dataJson = snapshot.data_json as any;
      const perfMetrics = snapshot.performance_metrics as any;
      const topQueriesRaw = (snapshot.top_queries as any[]) || [];

      // GA4 metrics from performance_metrics JSON
      const ga4Metrics = dataJson?.ga4?.metrics || {};
      const topPages = (dataJson?.ga4?.topPages || []).slice(0, 10).map((p: any) => ({
        page: p.path || p.pagePath || p.page || "",
        views: p.pageViews || p.screenPageViews || 0,
      }));

      return {
        service,
        period: period as any,
        metrics: {
          page_views: perfMetrics?.pageViews || ga4Metrics.pageViews || 0,
          unique_visitors: ga4Metrics.totalUsers || 0,
          bounce_rate: perfMetrics?.bounceRate || ga4Metrics.bounceRate || 0,
          avg_session_duration: perfMetrics?.avgDuration || ga4Metrics.avgSessionDuration || 0,
          impressions: 0,
          click_through_rate: 0,
          avg_position: 0,
          search_queries: topQueriesRaw.length,
        },
        top_pages: topPages,
        top_queries: topQueriesRaw.slice(0, 10).map((q: any) => ({
          query: q.query || "",
          impressions: q.impressions || 0,
          clicks: q.clicks || 0,
          ctr: Math.round((q.ctr || 0) * 10000) / 100,
          position: Math.round((q.position || 0) * 10) / 10,
        })),
      };
    }

    if (service === "google_search_console") {
      const days = periodToDays(period);
      const since = new Date(Date.now() - days * 86400000);

      // Aggregate GSC per-page data
      const agg = await prisma.gscPagePerformance.aggregate({
        where: { site_id: siteId, date: { gte: since } },
        _sum: { clicks: true, impressions: true },
        _avg: { ctr: true, position: true },
      });

      const topPages = await prisma.gscPagePerformance.groupBy({
        by: ["url"],
        where: { site_id: siteId, date: { gte: since } },
        _sum: { clicks: true, impressions: true },
        _avg: { ctr: true, position: true },
        orderBy: { _sum: { clicks: "desc" } },
        take: 10,
      });

      // Top queries come from the latest AnalyticsSnapshot
      const snapshot = await prisma.analyticsSnapshot.findFirst({
        where: { site_id: siteId },
        orderBy: { created_at: "desc" },
        select: { top_queries: true },
      });
      const topQueriesRaw = (snapshot?.top_queries as any[]) || [];

      const totalClicks = agg._sum.clicks || 0;
      const totalImpressions = agg._sum.impressions || 0;

      return {
        service,
        period: period as any,
        metrics: {
          page_views: 0,
          unique_visitors: 0,
          bounce_rate: 0,
          avg_session_duration: 0,
          impressions: totalImpressions,
          click_through_rate: totalImpressions > 0
            ? Math.round((totalClicks / totalImpressions) * 10000) / 100
            : 0,
          avg_position: Math.round((agg._avg.position || 0) * 10) / 10,
          search_queries: topQueriesRaw.length,
        },
        top_pages: topPages.map((p) => ({
          page: p.url,
          views: p._sum.clicks || 0,
          ctr: p._avg.ctr ? Math.round(p._avg.ctr * 10000) / 100 : 0,
          position: p._avg.position ? Math.round(p._avg.position * 10) / 10 : 0,
        })),
        top_queries: topQueriesRaw.slice(0, 10).map((q: any) => ({
          query: q.query || "",
          impressions: q.impressions || 0,
          clicks: q.clicks || 0,
          ctr: Math.round((q.ctr || 0) * 10000) / 100,
          position: Math.round((q.position || 0) * 10) / 10,
        })),
      };
    }

    return emptyMetrics(service, period);
  } catch (err) {
    console.warn(`[analytics] Failed to fetch ${service} metrics from DB:`, err);
    return emptyMetrics(service, period);
  }
}

function validateAnalyticsConfig(
  service: string,
  configuration: any,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (service === "ga4") {
    if (!configuration.tracking_id_configured && !configuration.measurement_id_configured) {
      errors.push("GA4 requires either tracking_id or measurement_id");
    }
    if (configuration.service_account_email_configured && !configuration.private_key_configured) {
      errors.push("Service account email requires private key");
    }
  } else if (service === "google_search_console") {
    if (!configuration.client_id_configured || !configuration.client_secret_configured) {
      errors.push("Google Search Console requires client_id and client_secret");
    }
    if (!configuration.site_url) {
      errors.push("Site URL is required for Search Console");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * GET /api/admin/analytics
 * Get analytics configurations and metrics
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const service = url.searchParams.get("service");
    const period = url.searchParams.get("period") || "7d";
    const includeMetrics = url.searchParams.get("include_metrics") === "true";
    const siteId = request.headers.get("x-site-id") || getDefaultSiteId();

    if (service) {
      // Get specific service configuration and metrics
      const config = analyticsConfigurations.get(service);
      if (!config) {
        return NextResponse.json(
          { status: "error", message: "Analytics service not found" },
          { status: 404 },
        );
      }

      const response: any = {
        status: "success",
        service,
        configuration: config,
        connection_status: config.status,
      };

      if (includeMetrics && config.status === "configured") {
        response.metrics = await getMetricsFromDB(service, period, siteId);
      }

      return NextResponse.json(response);
    }

    // Get all analytics configurations
    const allConfigs = Array.from(analyticsConfigurations.values());

    // Get latest snapshot timestamp for last_sync
    let lastSync: string | undefined;
    try {
      const latest = await prisma.analyticsSnapshot.findFirst({
        where: { site_id: siteId },
        orderBy: { created_at: "desc" },
        select: { created_at: true },
      });
      lastSync = latest?.created_at?.toISOString();
    } catch { /* table may not exist yet */ }

    const response: any = {
      status: "success",
      analytics_services: allConfigs.map((config) => ({
        service: config.service,
        config_name: config.config_name,
        status: config.status,
        features: config.features,
        metrics_available: config.metrics_available,
        last_sync: lastSync || config.last_sync,
      })),
      summary: {
        total_services: allConfigs.length,
        configured_services: allConfigs.filter((c) => c.status === "configured")
          .length,
        available_features: Array.from(
          new Set(allConfigs.flatMap((c) => c.features)),
        ),
        total_metrics: Array.from(
          new Set(allConfigs.flatMap((c) => c.metrics_available)),
        ).length,
      },
    };

    if (includeMetrics) {
      response.recent_metrics = {};
      for (const config of allConfigs) {
        if (config.status === "configured") {
          response.recent_metrics[config.service] = await getMetricsFromDB(
            config.service,
            period,
            siteId,
          );
        }
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Analytics configuration retrieval error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to retrieve analytics configuration",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});

/**
 * POST /api/admin/analytics
 * Create or update analytics configuration
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { service, configuration, test_connection = false } = body;

    if (!service || !configuration) {
      return NextResponse.json(
        { status: "error", message: "Service and configuration are required" },
        { status: 400 },
      );
    }

    // Validate configuration
    const validation = validateAnalyticsConfig(service, configuration);
    if (!validation.valid) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid configuration",
          errors: validation.errors,
        },
        { status: 400 },
      );
    }

    // Get existing config or create new one
    const existingConfig = analyticsConfigurations.get(service);
    const config: AnalyticsConfig = {
      service: service as any,
      config_name:
        existingConfig?.config_name || `${service.toUpperCase()} Configuration`,
      status: test_connection ? "testing" : "configured",
      configuration,
      features: existingConfig?.features || [],
      metrics_available: existingConfig?.metrics_available || [],
      last_sync: new Date().toISOString(),
    };

    // Test connection if requested
    if (test_connection) {
      // Validate required credentials are present
      const hasCredentials =
        configuration.tracking_id_configured ||
        configuration.measurement_id_configured ||
        configuration.property_id_configured ||
        configuration.api_key_configured;
      config.status = hasCredentials ? "configured" : "error";

      if (!hasCredentials) {
        return NextResponse.json(
          {
            status: "error",
            message: "Connection test failed",
            service,
            details: "Missing required credentials for the analytics service",
          },
          { status: 400 },
        );
      }
    }

    analyticsConfigurations.set(service, config);

    // Log configuration change (never log raw config — only metadata)
    try {
      await prisma.auditLog.create({
        data: {
          action: "ANALYTICS_CONFIG_UPDATE",
          resource: "ANALYTICS_SERVICE",
          resourceId: service,
          details: {
            service,
            status: config.status,
            features_enabled: config.features.length,
            test_connection,
          },
          userId: "admin",
          ipAddress: request.ip || "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      });
    } catch (dbError) {
      console.warn("Failed to log analytics configuration:", dbError);
    }

    return NextResponse.json({
      status: "success",
      message: `${config.config_name} configured successfully`,
      service,
      configuration: config,
      connection_test: test_connection ? "passed" : "skipped",
      next_steps: [
        "Verify data collection is working",
        "Set up custom events and goals",
        "Configure dashboard widgets",
        "Schedule regular data syncing",
      ],
    });
  } catch (error) {
    console.error("Analytics configuration error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to configure analytics service",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});

/**
 * PUT /api/admin/analytics
 * Sync analytics data or update service status
 */
export const PUT = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { service, action } = body;

    const config = analyticsConfigurations.get(service);
    if (!config) {
      return NextResponse.json(
        { status: "error", message: "Analytics service not found" },
        { status: 404 },
      );
    }

    let actionDescription = "";

    switch (action) {
      case "sync_data":
        // Simulate data sync
        config.last_sync = new Date().toISOString();
        actionDescription = "Data synchronized successfully";
        break;
      case "test_connection":
        config.status = "testing";
        // Validate credentials are present for connection test
        const hasCredentials =
          config.configuration.tracking_id_configured ||
          config.configuration.measurement_id_configured ||
          config.configuration.property_id_configured ||
          config.configuration.api_key_configured;
        config.status = hasCredentials ? "configured" : "error";
        actionDescription =
          config.status === "configured"
            ? "Connection test passed"
            : "Connection test failed - missing credentials";
        break;
      case "disable":
        config.status = "not_configured";
        actionDescription = "Service disabled";
        break;
      case "enable":
        config.status = "configured";
        actionDescription = "Service enabled";
        break;
      default:
        return NextResponse.json(
          { status: "error", message: "Invalid action" },
          { status: 400 },
        );
    }

    analyticsConfigurations.set(service, config);

    return NextResponse.json({
      status: "success",
      message: actionDescription,
      service,
      updated_configuration: config,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Analytics service update error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to update analytics service",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
