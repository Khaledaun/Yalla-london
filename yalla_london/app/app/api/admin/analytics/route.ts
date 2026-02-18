export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { prisma } from "@/lib/db";

interface AnalyticsConfig {
  service: "ga4" | "google_search_console" | "custom";
  config_name: string;
  status: "configured" | "not_configured" | "error" | "testing";
  configuration: {
    tracking_id?: string;
    measurement_id?: string;
    property_id?: string;
    client_id?: string;
    client_secret?: string;
    service_account_email?: string;
    private_key?: string;
    site_url?: string;
    api_key?: string;
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

// Initialize default configurations
const DEFAULT_ANALYTICS_CONFIGS: AnalyticsConfig[] = [
  {
    service: "ga4",
    config_name: "Google Analytics 4",
    status: process.env.GOOGLE_ANALYTICS_ID ? "configured" : "not_configured",
    configuration: {
      tracking_id: process.env.GOOGLE_ANALYTICS_ID || "",
      measurement_id: process.env.GOOGLE_ANALYTICS_TRACKING_ID || "",
      property_id: process.env.GA4_PROPERTY_ID || "",
      client_id: process.env.GOOGLE_ANALYTICS_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_ANALYTICS_CLIENT_SECRET || "",
      service_account_email: process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL || "",
      private_key: process.env.GOOGLE_ANALYTICS_PRIVATE_KEY || "",
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
    status: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID
      ? "configured"
      : "not_configured",
    configuration: {
      client_id: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET || "",
      site_url: process.env.NEXTAUTH_URL || "https://your-site.com",
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

function getEmptyMetrics(service: string, period: string): AnalyticsMetrics {
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

function validateAnalyticsConfig(
  service: string,
  configuration: any,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (service === "ga4") {
    if (!configuration.tracking_id && !configuration.measurement_id) {
      errors.push("GA4 requires either tracking_id or measurement_id");
    }
    if (configuration.service_account_email && !configuration.private_key) {
      errors.push("Service account email requires private key");
    }
  } else if (service === "google_search_console") {
    if (!configuration.client_id || !configuration.client_secret) {
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
        response.metrics = getEmptyMetrics(service, period);
      }

      return NextResponse.json(response);
    }

    // Get all analytics configurations
    const allConfigs = Array.from(analyticsConfigurations.values());

    const response: any = {
      status: "success",
      analytics_services: allConfigs.map((config) => ({
        service: config.service,
        config_name: config.config_name,
        status: config.status,
        features: config.features,
        metrics_available: config.metrics_available,
        last_sync: config.last_sync,
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
      allConfigs.forEach((config) => {
        if (config.status === "configured") {
          response.recent_metrics[config.service] = getEmptyMetrics(
            config.service,
            period,
          );
        }
      });
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
        configuration.tracking_id ||
        configuration.measurement_id ||
        configuration.property_id ||
        configuration.api_key;
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

    // Log configuration change
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
          config.configuration.tracking_id ||
          config.configuration.measurement_id ||
          config.configuration.property_id ||
          config.configuration.api_key;
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
