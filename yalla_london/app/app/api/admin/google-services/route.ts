export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { googleTrends } from '@/lib/integrations/google-trends';
import { googleAds } from '@/lib/integrations/google-ads';
import { googlePageSpeed } from '@/lib/integrations/google-pagespeed';
import { searchConsole } from '@/lib/integrations/google-search-console';

interface ServiceStatus {
  service: string;
  displayName: string;
  configured: boolean;
  status: 'connected' | 'disconnected' | 'error' | 'not_configured';
  message: string;
  details?: any;
  lastChecked: string;
}

interface ConnectivityReport {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  services: ServiceStatus[];
  summary: {
    total: number;
    configured: number;
    connected: number;
    errors: number;
  };
}

/**
 * GET /api/admin/google-services
 * Get status of all Google services or test connectivity
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'status';
    const service = url.searchParams.get('service');

    if (action === 'test') {
      // Test connectivity for all or specific service
      const report = await testAllServices(service);
      return NextResponse.json({
        status: 'success',
        report,
      });
    }

    // Return current status
    const services = getServicesStatus();

    return NextResponse.json({
      status: 'success',
      services,
      summary: {
        total: services.length,
        configured: services.filter(s => s.configured).length,
        connected: services.filter(s => s.status === 'connected').length,
      },
    });
  } catch (error) {
    console.error('Google services status error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to get Google services status',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/admin/google-services
 * Perform actions on Google services (trends research, ads data, etc.)
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { service, action, params = {} } = body;

    if (!service || !action) {
      return NextResponse.json(
        { status: 'error', message: 'Service and action are required' },
        { status: 400 }
      );
    }

    let result: any;

    switch (service) {
      case 'trends':
        result = await handleTrendsAction(action, params);
        break;
      case 'ads':
        result = await handleAdsAction(action, params);
        break;
      case 'pagespeed':
        result = await handlePageSpeedAction(action, params);
        break;
      case 'search_console':
        result = await handleSearchConsoleAction(action, params);
        break;
      default:
        return NextResponse.json(
          { status: 'error', message: `Unknown service: ${service}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      status: 'success',
      service,
      action,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Google services action error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to execute service action',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

function getServicesStatus(): ServiceStatus[] {
  return [
    {
      service: 'google_analytics',
      displayName: 'Google Analytics 4',
      configured: !!process.env.GOOGLE_ANALYTICS_ID || !!process.env.GA4_MEASUREMENT_ID,
      status: process.env.GOOGLE_ANALYTICS_ID ? 'connected' : 'not_configured',
      message: process.env.GOOGLE_ANALYTICS_ID
        ? 'GA4 tracking configured'
        : 'GA4 measurement ID not set',
      lastChecked: new Date().toISOString(),
    },
    {
      service: 'search_console',
      displayName: 'Google Search Console',
      configured: !!(process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL && process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY),
      status: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ? 'connected' : 'not_configured',
      message: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL
        ? 'Search Console configured with service account'
        : 'Search Console credentials not set',
      lastChecked: new Date().toISOString(),
    },
    {
      service: 'google_ads',
      displayName: 'Google Ads',
      configured: googleAds.isConfigured(),
      status: googleAds.isConfigured() ? 'connected' : 'not_configured',
      message: googleAds.isConfigured()
        ? 'Google Ads API configured'
        : 'Google Ads credentials not set',
      lastChecked: new Date().toISOString(),
    },
    {
      service: 'pagespeed',
      displayName: 'PageSpeed Insights',
      configured: true, // Works without API key
      status: 'connected',
      message: process.env.GOOGLE_PAGESPEED_API_KEY
        ? 'PageSpeed API configured with API key'
        : 'PageSpeed API available (rate limited without key)',
      lastChecked: new Date().toISOString(),
    },
    {
      service: 'trends',
      displayName: 'Google Trends',
      configured: googleTrends.isConfigured(),
      status: googleTrends.isConfigured() ? 'connected' : 'not_configured',
      message: googleTrends.isConfigured()
        ? 'Google Trends API configured via SerpAPI'
        : 'Trends API not configured. Set SERPAPI_API_KEY or GOOGLE_TRENDS_API_KEY',
      lastChecked: new Date().toISOString(),
    },
  ];
}

async function testAllServices(specificService?: string | null): Promise<ConnectivityReport> {
  const services: ServiceStatus[] = [];
  const timestamp = new Date().toISOString();

  // Test Search Console
  if (!specificService || specificService === 'search_console') {
    try {
      const gscConfigured = !!(
        process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL &&
        process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY
      );

      if (gscConfigured) {
        // Try to get search analytics as a test
        const testResult = await searchConsole.getSearchAnalytics(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          new Date().toISOString().split('T')[0]
        );

        services.push({
          service: 'search_console',
          displayName: 'Google Search Console',
          configured: true,
          status: testResult ? 'connected' : 'error',
          message: testResult ? 'Connection successful' : 'API call failed',
          details: testResult ? { rowCount: testResult.rows?.length || 0 } : undefined,
          lastChecked: timestamp,
        });
      } else {
        services.push({
          service: 'search_console',
          displayName: 'Google Search Console',
          configured: false,
          status: 'not_configured',
          message: 'Service account credentials not configured',
          lastChecked: timestamp,
        });
      }
    } catch (error) {
      services.push({
        service: 'search_console',
        displayName: 'Google Search Console',
        configured: true,
        status: 'error',
        message: error instanceof Error ? error.message : 'Connection test failed',
        lastChecked: timestamp,
      });
    }
  }

  // Test Google Analytics
  if (!specificService || specificService === 'google_analytics') {
    const gaConfigured = !!(process.env.GOOGLE_ANALYTICS_ID || process.env.GA4_MEASUREMENT_ID);
    services.push({
      service: 'google_analytics',
      displayName: 'Google Analytics 4',
      configured: gaConfigured,
      status: gaConfigured ? 'connected' : 'not_configured',
      message: gaConfigured
        ? `Configured with ID: ${process.env.GOOGLE_ANALYTICS_ID || process.env.GA4_MEASUREMENT_ID}`
        : 'Measurement ID not configured',
      lastChecked: timestamp,
    });
  }

  // Test Google Ads
  if (!specificService || specificService === 'google_ads') {
    const adsTest = await googleAds.testConnection();
    services.push({
      service: 'google_ads',
      displayName: 'Google Ads',
      configured: googleAds.isConfigured(),
      status: adsTest.success ? 'connected' : googleAds.isConfigured() ? 'error' : 'not_configured',
      message: adsTest.message,
      details: adsTest.details,
      lastChecked: timestamp,
    });
  }

  // Test PageSpeed Insights
  if (!specificService || specificService === 'pagespeed') {
    const pageSpeedTest = await googlePageSpeed.testConnection();
    services.push({
      service: 'pagespeed',
      displayName: 'PageSpeed Insights',
      configured: true,
      status: pageSpeedTest.success ? 'connected' : 'error',
      message: pageSpeedTest.message,
      details: pageSpeedTest.details,
      lastChecked: timestamp,
    });
  }

  // Test Google Trends
  if (!specificService || specificService === 'trends') {
    const trendsTest = await googleTrends.testConnection();
    services.push({
      service: 'trends',
      displayName: 'Google Trends',
      configured: googleTrends.isConfigured(),
      status: trendsTest.success ? 'connected' : googleTrends.isConfigured() ? 'error' : 'not_configured',
      message: trendsTest.message,
      details: trendsTest.details,
      lastChecked: timestamp,
    });
  }

  // Calculate summary
  const summary = {
    total: services.length,
    configured: services.filter(s => s.configured).length,
    connected: services.filter(s => s.status === 'connected').length,
    errors: services.filter(s => s.status === 'error').length,
  };

  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if (summary.errors > 0) {
    overallStatus = summary.connected > summary.errors ? 'degraded' : 'critical';
  } else if (summary.connected < summary.configured) {
    overallStatus = 'degraded';
  }

  return {
    timestamp,
    overallStatus,
    services,
    summary,
  };
}

async function handleTrendsAction(action: string, params: any): Promise<any> {
  switch (action) {
    case 'trending':
      return await googleTrends.getTrendingSearches(params.geo || 'GB');

    case 'interest':
      return await googleTrends.getInterestOverTime(
        params.keywords || [],
        params.geo || 'GB',
        params.timeRange || 'today 12-m'
      );

    case 'compare':
      return await googleTrends.compareKeywords(
        params.keywords || [],
        params.geo || 'GB',
        params.timeRange || 'today 12-m'
      );

    case 'geo':
      return await googleTrends.getGeoInterest(
        params.keyword,
        params.resolution || 'REGION',
        params.geo || 'GB'
      );

    case 'seasonal':
      return await googleTrends.getSeasonalTrends(params.keyword, params.years || 5);

    case 'test':
      return await googleTrends.testConnection();

    default:
      throw new Error(`Unknown trends action: ${action}`);
  }
}

async function handleAdsAction(action: string, params: any): Promise<any> {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const defaultStartDate = params.startDate || thirtyDaysAgo.toISOString().split('T')[0];
  const defaultEndDate = params.endDate || today.toISOString().split('T')[0];

  switch (action) {
    case 'campaigns':
      return await googleAds.getCampaignPerformance(defaultStartDate, defaultEndDate);

    case 'keywords':
      return await googleAds.getKeywordPerformance(defaultStartDate, defaultEndDate, params.limit || 100);

    case 'conversions':
      return await googleAds.getConversionActions();

    case 'summary':
      return await googleAds.getAccountSummary(defaultStartDate, defaultEndDate);

    case 'track_conversion':
      return await googleAds.trackOfflineConversion(
        params.gclid,
        params.conversionAction,
        params.conversionTime,
        params.conversionValue,
        params.currencyCode || 'GBP'
      );

    case 'test':
      return await googleAds.testConnection();

    default:
      throw new Error(`Unknown ads action: ${action}`);
  }
}

async function handlePageSpeedAction(action: string, params: any): Promise<any> {
  switch (action) {
    case 'analyze':
      return await googlePageSpeed.analyze(
        params.url,
        params.strategy || 'mobile',
        params.categories || ['performance', 'accessibility', 'best-practices', 'seo']
      );

    case 'batch':
      return await googlePageSpeed.batchAnalyze(
        params.urls || [],
        params.strategy || 'mobile'
      );

    case 'summary':
      return await googlePageSpeed.getPerformanceSummary(params.url);

    case 'test':
      return await googlePageSpeed.testConnection();

    default:
      throw new Error(`Unknown pagespeed action: ${action}`);
  }
}

async function handleSearchConsoleAction(action: string, params: any): Promise<any> {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const defaultStartDate = params.startDate || thirtyDaysAgo.toISOString().split('T')[0];
  const defaultEndDate = params.endDate || today.toISOString().split('T')[0];

  switch (action) {
    case 'analytics':
      return await searchConsole.getSearchAnalytics(
        defaultStartDate,
        defaultEndDate,
        params.dimensions || ['query']
      );

    case 'submit_url':
      return await searchConsole.submitUrl(params.url);

    case 'indexing_status':
      return await searchConsole.getIndexingStatus(params.url);

    default:
      throw new Error(`Unknown search console action: ${action}`);
  }
}
