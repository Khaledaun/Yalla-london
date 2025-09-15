export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { getFeatureFlags, getFeatureFlagStats, getFeatureFlagsByCategory } from '@/lib/feature-flags';
import { getPremiumFeatureFlags, isPremiumFeatureEnabled } from '@/src/lib/feature-flags';
import { prisma } from '@/lib/db';

/**
 * GET /api/phase4/status
 * Enhanced admin-only endpoint that returns comprehensive system status
 * including premium backend features, health monitoring, and diagnostics
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  const startTime = Date.now();
  
  try {
    const errors: string[] = [];
    
    // Get legacy feature flags
    const legacyFeatureFlags = getFeatureFlags();
    const legacyStats = getFeatureFlagStats();
    const legacyFlagsByCategory = getFeatureFlagsByCategory();
    
    // Get premium feature flags
    let premiumFeatureFlags = {};
    let premiumStats = { total: 0, enabled: 0, disabled: 0 };
    
    try {
      premiumFeatureFlags = getPremiumFeatureFlags();
      const premiumFlagsArray = Object.values(premiumFeatureFlags);
      premiumStats = {
        total: premiumFlagsArray.length,
        enabled: premiumFlagsArray.filter((f: any) => f.enabled).length,
        disabled: premiumFlagsArray.filter((f: any) => !f.enabled).length
      };
    } catch (error) {
      errors.push(`Premium feature flags error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Database health check
    let databaseStatus = { status: 'disconnected', responseTime: 0, error: '' };
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      databaseStatus = {
        status: 'connected',
        responseTime: Date.now() - dbStart,
        error: ''
      };
    } catch (error) {
      databaseStatus = {
        status: 'error',
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Database connection failed'
      };
      errors.push(`Database error: ${databaseStatus.error}`);
    }

    // Authentication providers check
    const authProviders = [];
    if (process.env.NEXTAUTH_SECRET) authProviders.push('credentials');
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) authProviders.push('google');
    
    // Storage configuration check
    const storageProvider = process.env.AWS_S3_BUCKET ? 'aws-s3' : 'local';
    
    // Get environment info
    const environment = process.env.NODE_ENV || 'development';
    const buildTime = process.env.BUILD_TIME || new Date().toISOString();

    // Premium backend status
    const premiumBackendEnabled = isPremiumFeatureEnabled('PREMIUM_BACKEND');
    const premiumBackendStatus = {
      enabled: premiumBackendEnabled,
      stable_left_nav: isPremiumFeatureEnabled('STABLE_LEFT_NAV'),
      admin_dashboard: isPremiumFeatureEnabled('ADMIN_DASHBOARD'),
      content_management: isPremiumFeatureEnabled('CONTENT_MANAGEMENT'),
      design_tools: isPremiumFeatureEnabled('DESIGN_TOOLS'),
      people_management: isPremiumFeatureEnabled('PEOPLE_MANAGEMENT'),
      integrations: isPremiumFeatureEnabled('INTEGRATIONS'),
      automations: isPremiumFeatureEnabled('AUTOMATIONS'),
      affiliate_hub: isPremiumFeatureEnabled('AFFILIATE_HUB'),
      settings_management: isPremiumFeatureEnabled('SETTINGS_MANAGEMENT'),
      
      // Core design principles
      optimistic_updates: isPremiumFeatureEnabled('OPTIMISTIC_UPDATES'),
      instant_undo: isPremiumFeatureEnabled('INSTANT_UNDO'),
      keyboard_shortcuts: isPremiumFeatureEnabled('KEYBOARD_SHORTCUTS'),
      live_previews: isPremiumFeatureEnabled('LIVE_PREVIEWS'),
      state_transparency: isPremiumFeatureEnabled('STATE_TRANSPARENCY'),
      
      // Security & Auth
      enhanced_auth: isPremiumFeatureEnabled('ENHANCED_AUTH'),
      rbac_premium: isPremiumFeatureEnabled('RBAC_PREMIUM'),
      secret_encryption: isPremiumFeatureEnabled('SECRET_ENCRYPTION'),
      field_masking: isPremiumFeatureEnabled('FIELD_MASKING'),
      
      // Additional features
      review_queue: isPremiumFeatureEnabled('REVIEW_QUEUE'),
      trust_workflows: isPremiumFeatureEnabled('TRUST_WORKFLOWS'),
      job_monitoring: isPremiumFeatureEnabled('JOB_MONITORING'),
      structured_logs: isPremiumFeatureEnabled('STRUCTURED_LOGS'),
    };

    // Legacy Phase 4 status
    const phase4Status = {
      phase4b_enabled: legacyFeatureFlags.PHASE4B_ENABLED?.enabled || false,
      auto_publishing: legacyFeatureFlags.AUTO_PUBLISHING?.enabled || false,
      content_analytics: legacyFeatureFlags.CONTENT_ANALYTICS?.enabled || false,
      seo_optimization: legacyFeatureFlags.SEO_OPTIMIZATION?.enabled || false,
      social_media_integration: legacyFeatureFlags.SOCIAL_MEDIA_INTEGRATION?.enabled || false,
      advanced_topics: legacyFeatureFlags.ADVANCED_TOPICS?.enabled || false,
      export_wordpress: legacyFeatureFlags.EXPORT_WORDPRESS?.enabled || false,
      audit_system: legacyFeatureFlags.AUDIT_SYSTEM?.enabled || false,
      enterprise_features: legacyFeatureFlags.ENTERPRISE_FEATURES?.enabled || false,
      advanced_cron: legacyFeatureFlags.ADVANCED_CRON?.enabled || false,
      
      // Required production flags
      ai_seo_audit: legacyFeatureFlags.FEATURE_AI_SEO_AUDIT?.enabled || false,
      content_pipeline: legacyFeatureFlags.FEATURE_CONTENT_PIPELINE?.enabled || false,
      internal_links: legacyFeatureFlags.FEATURE_INTERNAL_LINKS?.enabled || false,
      rich_editor: legacyFeatureFlags.FEATURE_RICH_EDITOR?.enabled || false,
      homepage_builder: legacyFeatureFlags.FEATURE_HOMEPAGE_BUILDER?.enabled || false,
    };

    // System metrics
    const memUsage = process.memoryUsage();
    const systemMetrics = {
      uptime: process.uptime(),
      memory_usage: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      },
      process_info: {
        pid: process.pid,
        node_version: process.version,
        platform: process.platform
      }
    };

    // Background jobs status (mock for now)
    const jobsStatus = {
      active: 0,
      pending: 0,
      failed: 0,
      last_run: new Date(Date.now() - 60 * 60 * 1000).toISOString()
    };

    // Determine overall health
    const overallStatus = errors.length === 0 ? 'healthy' : 
                         (databaseStatus.status === 'error' || errors.length > 3) ? 'unhealthy' : 'degraded';

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'success',
      health: overallStatus,
      timestamp: new Date().toISOString(),
      response_time: `${responseTime}ms`,
      environment,
      build_time: buildTime,
      version: process.env.APP_VERSION || '1.0.0',
      
      // Premium Backend Status
      premium_backend: premiumBackendStatus,
      
      // Legacy Phase 4 Status
      phase4_status: phase4Status,
      
      // Services Health
      services: {
        database: databaseStatus,
        auth: {
          status: authProviders.length > 0 ? 'operational' : 'degraded',
          providers: authProviders
        },
        storage: {
          status: storageProvider === 'aws-s3' ? 'operational' : 'degraded',
          provider: storageProvider
        }
      },
      
      // Background Jobs
      jobs: jobsStatus,
      
      // Feature Flags
      feature_flags: {
        legacy: {
          total_count: legacyStats.total,
          enabled_count: legacyStats.enabled,
          disabled_count: legacyStats.disabled,
          by_category: legacyStats.byCategory,
          flags: legacyFeatureFlags,
          grouped_by_category: legacyFlagsByCategory
        },
        premium: {
          total_count: premiumStats.total,
          enabled_count: premiumStats.enabled,
          disabled_count: premiumStats.disabled,
          flags: premiumFeatureFlags
        }
      },
      
      // System Metrics
      system_metrics: systemMetrics,
      
      // Errors and Warnings
      errors: errors,
      warnings: [
        ...(storageProvider === 'local' ? ['Using local storage instead of AWS S3'] : []),
        ...(authProviders.length === 1 ? ['Only one authentication provider configured'] : []),
        ...(!premiumBackendEnabled ? ['Premium backend features are disabled'] : [])
      ],
      
      // API Information
      api_info: {
        endpoint: '/api/phase4/status',
        method: 'GET',
        admin_only: true,
        description: 'Returns comprehensive system status including premium backend features'
      }
    }, {
      status: overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 206 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Phase4 status endpoint error:', error);
    return NextResponse.json(
      {
        status: 'error',
        health: 'unhealthy',
        error: 'Failed to retrieve system status',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        response_time: `${Date.now() - startTime}ms`
      },
      { status: 500 }
    );
  }
});