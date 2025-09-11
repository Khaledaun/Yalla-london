export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { getFeatureFlags, getFeatureFlagStats, getFeatureFlagsByCategory } from '@/lib/feature-flags';

/**
 * GET /api/phase4/status
 * Admin-only endpoint that returns the current feature flag state
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    // Get all feature flags
    const featureFlags = getFeatureFlags();
    const stats = getFeatureFlagStats();
    const flagsByCategory = getFeatureFlagsByCategory();

    // Get environment info
    const environment = process.env.NODE_ENV || 'development';
    const buildTime = process.env.BUILD_TIME || new Date().toISOString();

    // Phase 4 specific status
    const phase4Status = {
      phase4b_enabled: featureFlags.PHASE4B_ENABLED?.enabled || false,
      auto_publishing: featureFlags.AUTO_PUBLISHING?.enabled || false,
      content_analytics: featureFlags.CONTENT_ANALYTICS?.enabled || false,
      seo_optimization: featureFlags.SEO_OPTIMIZATION?.enabled || false,
      social_media_integration: featureFlags.SOCIAL_MEDIA_INTEGRATION?.enabled || false,
      advanced_topics: featureFlags.ADVANCED_TOPICS?.enabled || false,
      export_wordpress: featureFlags.EXPORT_WORDPRESS?.enabled || false,
      audit_system: featureFlags.AUDIT_SYSTEM?.enabled || false,
      enterprise_features: featureFlags.ENTERPRISE_FEATURES?.enabled || false,
      advanced_cron: featureFlags.ADVANCED_CRON?.enabled || false,
    };

    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      environment,
      build_time: buildTime,
      phase4_status: phase4Status,
      feature_flags: {
        total_count: stats.total,
        enabled_count: stats.enabled,
        disabled_count: stats.disabled,
        by_category: stats.byCategory,
        all_flags: featureFlags,
        grouped_by_category: flagsByCategory
      },
      system_health: {
        memory_usage: process.memoryUsage(),
        uptime: process.uptime(),
        platform: process.platform,
        node_version: process.version,
      },
      api_info: {
        endpoint: '/api/phase4/status',
        method: 'GET',
        admin_only: true,
        description: 'Returns current feature flag state and system status'
      }
    });

  } catch (error) {
    console.error('Phase4 status endpoint error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve phase4 status',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
});