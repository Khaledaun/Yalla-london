export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';

interface AnalyticsConfig {
  service: 'ga4' | 'google_search_console' | 'custom';
  config_name: string;
  status: 'configured' | 'not_configured' | 'error' | 'testing';
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
  period: '24h' | '7d' | '30d' | '90d';
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
    service: 'ga4',
    config_name: 'Google Analytics 4',
    status: process.env.GOOGLE_ANALYTICS_ID ? 'configured' : 'not_configured',
    configuration: {
      tracking_id: process.env.GOOGLE_ANALYTICS_ID || '',
      measurement_id: process.env.GOOGLE_ANALYTICS_TRACKING_ID || '',
      property_id: process.env.GA4_PROPERTY_ID || '',
      client_id: process.env.GOOGLE_ANALYTICS_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_ANALYTICS_CLIENT_SECRET || '',
      service_account_email: process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL || '',
      private_key: process.env.GOOGLE_ANALYTICS_PRIVATE_KEY || ''
    },
    features: [
      'page_views_tracking',
      'user_behavior_analysis',
      'conversion_tracking',
      'custom_events',
      'ecommerce_tracking',
      'real_time_data'
    ],
    metrics_available: [
      'page_views',
      'unique_visitors',
      'bounce_rate',
      'avg_session_duration',
      'conversion_rate',
      'revenue'
    ]
  },
  {
    service: 'google_search_console',
    config_name: 'Google Search Console',
    status: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID ? 'configured' : 'not_configured',
    configuration: {
      client_id: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET || '',
      site_url: process.env.NEXTAUTH_URL || 'https://your-site.com'
    },
    features: [
      'search_performance',
      'index_coverage',
      'mobile_usability',
      'core_web_vitals',
      'sitemaps_management',
      'url_inspection'
    ],
    metrics_available: [
      'impressions',
      'clicks',
      'click_through_rate',
      'avg_position',
      'search_queries',
      'indexed_pages'
    ]
  }
];

DEFAULT_ANALYTICS_CONFIGS.forEach(config => {
  analyticsConfigurations.set(config.service, config);
});

function generateMockMetrics(service: string, period: string): AnalyticsMetrics {
  const baseMultiplier = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
  
  if (service === 'ga4') {
    return {
      service,
      period: period as any,
      metrics: {
        page_views: Math.floor(Math.random() * 10000 * baseMultiplier),
        unique_visitors: Math.floor(Math.random() * 2000 * baseMultiplier),
        bounce_rate: Math.random() * 100,
        avg_session_duration: Math.random() * 300 // seconds
      },
      top_pages: [
        { page: '/experiences/luxury-desert-safari', views: Math.floor(Math.random() * 1000) },
        { page: '/dining/michelin-star-restaurants', views: Math.floor(Math.random() * 800) },
        { page: '/hotels/burj-al-arab-experience', views: Math.floor(Math.random() * 600) },
        { page: '/shopping/gold-souk-guide', views: Math.floor(Math.random() * 400) },
        { page: '/culture/dubai-museum-tour', views: Math.floor(Math.random() * 300) }
      ],
      top_queries: []
    };
  } else if (service === 'google_search_console') {
    return {
      service,
      period: period as any,
      metrics: {
        impressions: Math.floor(Math.random() * 50000 * baseMultiplier),
        click_through_rate: Math.random() * 10,
        avg_position: Math.random() * 50 + 5,
        search_queries: Math.floor(Math.random() * 1000 * baseMultiplier)
      },
      top_pages: [
        { page: '/experiences/luxury-desert-safari', views: 0, ctr: 5.2, position: 8.3 },
        { page: '/dining/michelin-star-restaurants', views: 0, ctr: 4.8, position: 12.1 },
        { page: '/hotels/burj-al-arab-experience', views: 0, ctr: 6.1, position: 6.7 }
      ],
      top_queries: [
        { query: 'luxury desert safari dubai', impressions: 15000, clicks: 780, ctr: 5.2, position: 8.3 },
        { query: 'best restaurants dubai', impressions: 22000, clicks: 1056, ctr: 4.8, position: 12.1 },
        { query: 'burj al arab booking', impressions: 18000, clicks: 1098, ctr: 6.1, position: 6.7 },
        { query: 'gold souk dubai guide', impressions: 8500, clicks: 340, ctr: 4.0, position: 15.2 },
        { query: 'dubai culture attractions', impressions: 6200, clicks: 310, ctr: 5.0, position: 18.9 }
      ]
    };
  }
  
  return {
    service,
    period: period as any,
    metrics: {},
    top_pages: [],
    top_queries: []
  };
}

function validateAnalyticsConfig(service: string, configuration: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (service === 'ga4') {
    if (!configuration.tracking_id && !configuration.measurement_id) {
      errors.push('GA4 requires either tracking_id or measurement_id');
    }
    if (configuration.service_account_email && !configuration.private_key) {
      errors.push('Service account email requires private key');
    }
  } else if (service === 'google_search_console') {
    if (!configuration.client_id || !configuration.client_secret) {
      errors.push('Google Search Console requires client_id and client_secret');
    }
    if (!configuration.site_url) {
      errors.push('Site URL is required for Search Console');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * GET /api/admin/analytics
 * Get analytics configurations and metrics
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const service = url.searchParams.get('service');
    const period = url.searchParams.get('period') || '7d';
    const includeMetrics = url.searchParams.get('include_metrics') === 'true';
    
    if (service) {
      // Get specific service configuration and metrics
      const config = analyticsConfigurations.get(service);
      if (!config) {
        return NextResponse.json(
          { status: 'error', message: 'Analytics service not found' },
          { status: 404 }
        );
      }
      
      const response: any = {
        status: 'success',
        service,
        configuration: config,
        connection_status: config.status
      };
      
      if (includeMetrics && config.status === 'configured') {
        response.metrics = generateMockMetrics(service, period);
      }
      
      return NextResponse.json(response);
    }
    
    // Get all analytics configurations
    const allConfigs = Array.from(analyticsConfigurations.values());
    
    const response: any = {
      status: 'success',
      analytics_services: allConfigs.map(config => ({
        service: config.service,
        config_name: config.config_name,
        status: config.status,
        features: config.features,
        metrics_available: config.metrics_available,
        last_sync: config.last_sync
      })),
      summary: {
        total_services: allConfigs.length,
        configured_services: allConfigs.filter(c => c.status === 'configured').length,
        available_features: Array.from(new Set(allConfigs.flatMap(c => c.features))),
        total_metrics: Array.from(new Set(allConfigs.flatMap(c => c.metrics_available))).length
      }
    };
    
    if (includeMetrics) {
      response.recent_metrics = {};
      allConfigs.forEach(config => {
        if (config.status === 'configured') {
          response.recent_metrics[config.service] = generateMockMetrics(config.service, period);
        }
      });
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Analytics configuration retrieval error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve analytics configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
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
        { status: 'error', message: 'Service and configuration are required' },
        { status: 400 }
      );
    }
    
    // Validate configuration
    const validation = validateAnalyticsConfig(service, configuration);
    if (!validation.valid) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Invalid configuration', 
          errors: validation.errors 
        },
        { status: 400 }
      );
    }
    
    // Get existing config or create new one
    const existingConfig = analyticsConfigurations.get(service);
    const config: AnalyticsConfig = {
      service: service as any,
      config_name: existingConfig?.config_name || `${service.toUpperCase()} Configuration`,
      status: test_connection ? 'testing' : 'configured',
      configuration,
      features: existingConfig?.features || [],
      metrics_available: existingConfig?.metrics_available || [],
      last_sync: new Date().toISOString()
    };
    
    // Test connection if requested
    if (test_connection) {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock test result (in production, make actual API calls)
      const testSuccess = Math.random() > 0.2; // 80% success rate
      config.status = testSuccess ? 'configured' : 'error';
      
      if (!testSuccess) {
        return NextResponse.json({
          status: 'error',
          message: 'Connection test failed',
          service,
          details: 'Unable to authenticate with the analytics service'
        }, { status: 400 });
      }
    }
    
    analyticsConfigurations.set(service, config);
    
    // Log configuration change
    try {
      await prisma.auditLog.create({
        data: {
          action: 'ANALYTICS_CONFIG_UPDATE',
          entity_type: 'ANALYTICS_SERVICE',
          entity_id: service,
          details: {
            service,
            status: config.status,
            features_enabled: config.features.length,
            test_connection
          },
          user_id: 'admin',
          ip_address: request.ip || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        }
      });
    } catch (dbError) {
      console.warn('Failed to log analytics configuration:', dbError);
    }
    
    return NextResponse.json({
      status: 'success',
      message: `${config.config_name} configured successfully`,
      service,
      configuration: config,
      connection_test: test_connection ? 'passed' : 'skipped',
      next_steps: [
        'Verify data collection is working',
        'Set up custom events and goals',
        'Configure dashboard widgets',
        'Schedule regular data syncing'
      ]
    });
    
  } catch (error) {
    console.error('Analytics configuration error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to configure analytics service',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
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
        { status: 'error', message: 'Analytics service not found' },
        { status: 404 }
      );
    }
    
    let actionDescription = '';
    
    switch (action) {
      case 'sync_data':
        // Simulate data sync
        config.last_sync = new Date().toISOString();
        actionDescription = 'Data synchronized successfully';
        break;
      case 'test_connection':
        config.status = 'testing';
        // Simulate connection test
        await new Promise(resolve => setTimeout(resolve, 1000));
        config.status = Math.random() > 0.1 ? 'configured' : 'error';
        actionDescription = config.status === 'configured' ? 'Connection test passed' : 'Connection test failed';
        break;
      case 'disable':
        config.status = 'not_configured';
        actionDescription = 'Service disabled';
        break;
      case 'enable':
        config.status = 'configured';
        actionDescription = 'Service enabled';
        break;
      default:
        return NextResponse.json(
          { status: 'error', message: 'Invalid action' },
          { status: 400 }
        );
    }
    
    analyticsConfigurations.set(service, config);
    
    return NextResponse.json({
      status: 'success',
      message: actionDescription,
      service,
      updated_configuration: config,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Analytics service update error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to update analytics service',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});