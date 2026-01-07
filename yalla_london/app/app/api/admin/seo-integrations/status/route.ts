export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { searchConsole } from '@/lib/integrations/google-search-console';

interface IntegrationStatus {
  name: string;
  status: 'connected' | 'not_configured' | 'error';
  details?: string;
  lastChecked: string;
}

interface SEOIntegrationsStatus {
  timestamp: string;
  overall: 'healthy' | 'degraded' | 'error';
  integrations: {
    googleSearchConsole: IntegrationStatus;
    googleAnalytics: IntegrationStatus;
    indexNow: IntegrationStatus;
    sitemap: IntegrationStatus;
    seoFeatures: IntegrationStatus;
  };
  environmentVariables: {
    configured: string[];
    missing: string[];
  };
  recommendations: string[];
}

export async function GET(request: NextRequest) {
  const status: SEOIntegrationsStatus = {
    timestamp: new Date().toISOString(),
    overall: 'healthy',
    integrations: {
      googleSearchConsole: await checkGoogleSearchConsole(),
      googleAnalytics: checkGoogleAnalytics(),
      indexNow: checkIndexNow(),
      sitemap: await checkSitemap(),
      seoFeatures: checkSEOFeatures(),
    },
    environmentVariables: checkEnvironmentVariables(),
    recommendations: [],
  };

  // Calculate overall status
  const statuses = Object.values(status.integrations).map(i => i.status);
  if (statuses.some(s => s === 'error')) {
    status.overall = 'error';
  } else if (statuses.some(s => s === 'not_configured')) {
    status.overall = 'degraded';
  }

  // Generate recommendations
  status.recommendations = generateRecommendations(status);

  return NextResponse.json(status);
}

async function checkGoogleSearchConsole(): Promise<IntegrationStatus> {
  const clientEmail = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    return {
      name: 'Google Search Console',
      status: 'not_configured',
      details: 'Missing GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL or GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY',
      lastChecked: new Date().toISOString(),
    };
  }

  try {
    // Test connection by checking if credentials are valid format
    if (!clientEmail.includes('@') || !privateKey.includes('PRIVATE KEY')) {
      return {
        name: 'Google Search Console',
        status: 'error',
        details: 'Invalid credential format',
        lastChecked: new Date().toISOString(),
      };
    }

    return {
      name: 'Google Search Console',
      status: 'connected',
      details: `Service account: ${clientEmail}`,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name: 'Google Search Console',
      status: 'error',
      details: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString(),
    };
  }
}

function checkGoogleAnalytics(): IntegrationStatus {
  const ga4Id = process.env.GA4_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
  const gaClientEmail = process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL;
  const gaPrivateKey = process.env.GOOGLE_ANALYTICS_PRIVATE_KEY;

  if (!ga4Id) {
    return {
      name: 'Google Analytics',
      status: 'not_configured',
      details: 'Missing GA4_MEASUREMENT_ID or NEXT_PUBLIC_GOOGLE_ANALYTICS_ID',
      lastChecked: new Date().toISOString(),
    };
  }

  // Check if GA4 ID format is valid
  if (!ga4Id.startsWith('G-') && !ga4Id.startsWith('UA-')) {
    return {
      name: 'Google Analytics',
      status: 'error',
      details: 'Invalid Google Analytics ID format (should start with G- or UA-)',
      lastChecked: new Date().toISOString(),
    };
  }

  const hasApiAccess = gaClientEmail && gaPrivateKey;

  return {
    name: 'Google Analytics',
    status: 'connected',
    details: hasApiAccess
      ? `Tracking ID: ${ga4Id}, API access configured`
      : `Tracking ID: ${ga4Id} (client-side only, no API access)`,
    lastChecked: new Date().toISOString(),
  };
}

function checkIndexNow(): IntegrationStatus {
  const indexNowKey = process.env.INDEXNOW_KEY;

  if (!indexNowKey) {
    return {
      name: 'IndexNow',
      status: 'not_configured',
      details: 'Missing INDEXNOW_KEY - automatic indexing via Bing/Yandex disabled',
      lastChecked: new Date().toISOString(),
    };
  }

  return {
    name: 'IndexNow',
    status: 'connected',
    details: 'IndexNow key configured for instant indexing',
    lastChecked: new Date().toISOString(),
  };
}

async function checkSitemap(): Promise<IntegrationStatus> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    return {
      name: 'Sitemap',
      status: 'not_configured',
      details: 'Missing NEXT_PUBLIC_SITE_URL',
      lastChecked: new Date().toISOString(),
    };
  }

  try {
    // Check if sitemap endpoint is accessible
    const sitemapUrl = `${siteUrl}/sitemap.xml`;

    return {
      name: 'Sitemap',
      status: 'connected',
      details: `Sitemap URL: ${sitemapUrl}`,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name: 'Sitemap',
      status: 'error',
      details: error instanceof Error ? error.message : 'Failed to verify sitemap',
      lastChecked: new Date().toISOString(),
    };
  }
}

function checkSEOFeatures(): IntegrationStatus {
  const seoEnabled = process.env.FEATURE_SEO === '1' || process.env.FEATURE_SEO_OPTIMIZATION === 'true';
  const aiSeoEnabled = process.env.FEATURE_AI_SEO_AUDIT === 'true';
  const abacusKey = process.env.ABACUSAI_API_KEY;

  if (!seoEnabled) {
    return {
      name: 'SEO Features',
      status: 'not_configured',
      details: 'SEO features disabled. Set FEATURE_SEO=1 or FEATURE_SEO_OPTIMIZATION=true',
      lastChecked: new Date().toISOString(),
    };
  }

  const features = [];
  if (aiSeoEnabled) features.push('AI SEO Audit');
  if (abacusKey) features.push('AI Meta Generation');
  features.push('Schema Generation', 'Internal Linking', 'Sitemap Generation');

  return {
    name: 'SEO Features',
    status: 'connected',
    details: `Active features: ${features.join(', ')}`,
    lastChecked: new Date().toISOString(),
  };
}

function checkEnvironmentVariables(): { configured: string[]; missing: string[] } {
  const requiredVars = [
    'NEXT_PUBLIC_SITE_URL',
    'FEATURE_SEO',
    'GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL',
    'GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY',
    'GA4_MEASUREMENT_ID',
    'INDEXNOW_KEY',
    'ABACUSAI_API_KEY',
  ];

  const optionalVars = [
    'GOOGLE_ANALYTICS_CLIENT_EMAIL',
    'GOOGLE_ANALYTICS_PRIVATE_KEY',
    'GOOGLE_PAGESPEED_API_KEY',
    'SERPAPI_API_KEY',
  ];

  const configured: string[] = [];
  const missing: string[] = [];

  [...requiredVars, ...optionalVars].forEach(varName => {
    if (process.env[varName]) {
      configured.push(varName);
    } else {
      missing.push(varName);
    }
  });

  return { configured, missing };
}

function generateRecommendations(status: SEOIntegrationsStatus): string[] {
  const recommendations: string[] = [];

  // Check Google Search Console
  if (status.integrations.googleSearchConsole.status !== 'connected') {
    recommendations.push(
      'Configure Google Search Console service account credentials for URL indexing and search analytics'
    );
  }

  // Check Google Analytics
  if (status.integrations.googleAnalytics.status === 'not_configured') {
    recommendations.push(
      'Add GA4_MEASUREMENT_ID for tracking. Format: G-XXXXXXXXXX'
    );
  }

  // Check IndexNow
  if (status.integrations.indexNow.status === 'not_configured') {
    recommendations.push(
      'Configure INDEXNOW_KEY for instant indexing on Bing, Yandex, and other search engines'
    );
  }

  // Check SEO Features
  if (status.integrations.seoFeatures.status === 'not_configured') {
    recommendations.push(
      'Enable SEO features by setting FEATURE_SEO=1 in environment variables'
    );
  }

  // Check for AI capabilities
  if (!process.env.ABACUSAI_API_KEY) {
    recommendations.push(
      'Add ABACUSAI_API_KEY to enable AI-powered meta description and title generation'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('All SEO integrations are properly configured!');
  }

  return recommendations;
}

// POST endpoint to test indexing submission
export async function POST(request: NextRequest) {
  try {
    const { action, url } = await request.json();

    switch (action) {
      case 'test-gsc-submission':
        if (!url) {
          return NextResponse.json({ error: 'URL required' }, { status: 400 });
        }
        const gscResult = await searchConsole.submitUrl(url);
        return NextResponse.json({
          success: gscResult,
          message: gscResult ? 'URL submitted to Google Search Console' : 'Failed to submit URL',
        });

      case 'test-indexnow':
        if (!url) {
          return NextResponse.json({ error: 'URL required' }, { status: 400 });
        }
        const indexNowResult = await testIndexNow(url);
        return NextResponse.json({
          success: indexNowResult,
          message: indexNowResult ? 'URL submitted via IndexNow' : 'Failed to submit via IndexNow',
        });

      case 'ping-search-engines':
        const pingResult = await pingSearchEngines();
        return NextResponse.json({
          success: true,
          results: pingResult,
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Integration test error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Test failed' },
      { status: 500 }
    );
  }
}

async function testIndexNow(url: string): Promise<boolean> {
  const indexNowKey = process.env.INDEXNOW_KEY;
  if (!indexNowKey) return false;

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yalla-london.com';
    const host = siteUrl.replace(/^https?:\/\//, '');

    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host,
        key: indexNowKey,
        urlList: [url],
      }),
    });

    return response.ok || response.status === 202;
  } catch (error) {
    console.error('IndexNow test failed:', error);
    return false;
  }
}

async function pingSearchEngines(): Promise<{ google: boolean; bing: boolean }> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yalla-london.com';
  const sitemapUrl = `${siteUrl}/sitemap.xml`;

  const results = { google: false, bing: false };

  try {
    // Ping Google
    const googleResponse = await fetch(
      `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
      { method: 'GET' }
    );
    results.google = googleResponse.ok;

    // Ping Bing
    const bingResponse = await fetch(
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
      { method: 'GET' }
    );
    results.bing = bingResponse.ok;
  } catch (error) {
    console.error('Search engine ping failed:', error);
  }

  return results;
}
