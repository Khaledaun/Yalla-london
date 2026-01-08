export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { searchConsole } from '@/lib/integrations/google-search-console';
import { googleTrends } from '@/lib/integrations/google-trends';
import { googlePageSpeed } from '@/lib/integrations/google-pagespeed';

/**
 * SEO Data Dashboard API
 * Aggregates data from all SEO integrations into a unified dashboard
 *
 * ============================================================
 * DATA SOURCES & WHAT THEY PROVIDE
 * ============================================================
 *
 * 1. GOOGLE SEARCH CONSOLE (searchConsole)
 *    ----------------------------------------
 *    Authentication: Service Account JWT
 *    Data Available:
 *    - Search Analytics (last 16 months):
 *      • Impressions: How many times pages appeared in search
 *      • Clicks: How many times users clicked through
 *      • CTR: Click-through rate (clicks/impressions)
 *      • Position: Average ranking position
 *      • Dimensions: query, page, country, device, date
 *    - URL Inspection:
 *      • Indexing status of specific URLs
 *      • Last crawl date
 *      • Mobile usability issues
 *      • Rich results status
 *    - Sitemap Status:
 *      • Submitted URLs count
 *      • Indexed URLs count
 *      • Errors and warnings
 *
 *    API Endpoints Used:
 *    - GET /webmasters/v3/sites/{siteUrl}/searchAnalytics/query
 *    - POST /searchconsole/v1/urlInspection/index:inspect
 *    - GET /indexing.googleapis.com/v3/urlNotifications (for submissions)
 *
 * 2. GOOGLE ANALYTICS (GA4)
 *    ----------------------------------------
 *    Authentication: Measurement ID (client-side) + Service Account (server-side)
 *    Data Available:
 *    - Real-time Data:
 *      • Active users right now
 *      • Current pageviews
 *      • Active pages
 *    - Historical Data (via Data API):
 *      • Sessions, users, pageviews
 *      • Bounce rate, session duration
 *      • Traffic sources
 *      • Geographic data
 *      • Device/browser breakdown
 *    - Event Data:
 *      • Core Web Vitals (LCP, FID, CLS)
 *      • Scroll depth
 *      • Custom events (bookings, signups)
 *
 *    Configuration:
 *    - GA4_MEASUREMENT_ID: G-H7YNG7CH88
 *    - Events tracked via gtag.js
 *
 * 3. GOOGLE TRENDS (via SerpAPI)
 *    ----------------------------------------
 *    Authentication: SerpAPI API Key
 *    Data Available:
 *    - Trending Searches:
 *      • Daily trending topics
 *      • Related articles
 *      • Traffic estimates
 *    - Interest Over Time:
 *      • Historical interest for keywords
 *      • Comparison between keywords
 *    - Related Queries:
 *      • Top related searches
 *      • Rising queries
 *    - Geographic Interest:
 *      • Interest by region/city
 *
 * 4. GOOGLE PAGESPEED INSIGHTS
 *    ----------------------------------------
 *    Authentication: API Key (optional for higher limits)
 *    Data Available:
 *    - Lighthouse Scores:
 *      • Performance (0-100)
 *      • Accessibility (0-100)
 *      • Best Practices (0-100)
 *      • SEO (0-100)
 *    - Core Web Vitals:
 *      • LCP (Largest Contentful Paint)
 *      • FID (First Input Delay)
 *      • CLS (Cumulative Layout Shift)
 *      • FCP (First Contentful Paint)
 *      • TTFB (Time to First Byte)
 *    - Opportunities:
 *      • Render-blocking resources
 *      • Image optimization
 *      • Unused JavaScript
 *    - Field Data (CrUX):
 *      • Real-world performance from Chrome users
 *
 * 5. INDEXNOW
 *    ----------------------------------------
 *    Authentication: IndexNow Key
 *    Data Available:
 *    - Submission Status:
 *      • URLs submitted
 *      • Submission timestamp
 *      • Response status
 *
 *    Search Engines Notified:
 *    - Bing
 *    - Yandex
 *    - Seznam
 *    - Naver
 *
 * ============================================================
 * AUTOMATION WORKFLOW ARCHITECTURE
 * ============================================================
 *
 * 1. CONTENT PUBLISHING WORKFLOW
 *    [New Content] → [Auto-SEO Service] → [Schema Injection] → [Internal Linking]
 *                 → [Sitemap Update] → [IndexNow Ping] → [GSC Submission]
 *
 * 2. TRENDS MONITORING WORKFLOW (Cron: 6 AM daily)
 *    [Cron Trigger] → [Fetch Trending Topics] → [Analyze Relevance]
 *                  → [Generate Content Opportunities] → [Update Content Calendar]
 *
 * 3. PERFORMANCE MONITORING WORKFLOW
 *    [GA4 Events] → [Core Web Vitals] → [PageSpeed Analysis]
 *                → [Performance Alerts] → [Optimization Recommendations]
 *
 * 4. RANKING TRACKING WORKFLOW (Cron: Weekly)
 *    [GSC Data Fetch] → [Position Changes] → [Keyword Opportunities]
 *                    → [Content Updates] → [Competitor Analysis]
 *
 * ============================================================
 */

interface DashboardData {
  timestamp: string;
  searchConsole: SearchConsoleData | null;
  trends: TrendsData | null;
  pageSpeed: PageSpeedData | null;
  recommendations: string[];
  alerts: Alert[];
}

interface SearchConsoleData {
  status: 'connected' | 'error' | 'not_configured';
  serviceAccount: string;
  siteUrl: string;
  last30Days?: {
    impressions: number;
    clicks: number;
    ctr: number;
    averagePosition: number;
  };
  topQueries?: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  topPages?: Array<{
    page: string;
    clicks: number;
    impressions: number;
  }>;
}

interface TrendsData {
  status: 'connected' | 'error' | 'not_configured';
  trendingTopics: Array<{
    title: string;
    traffic: string;
    isRelevant: boolean;
  }>;
  keywordTrends: Array<{
    keyword: string;
    trend: 'rising' | 'stable' | 'declining';
    interestScore: number;
  }>;
}

interface PageSpeedData {
  status: 'connected' | 'error' | 'not_configured';
  desktop?: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  mobile?: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  coreWebVitals?: {
    lcp: { value: number; rating: string };
    fid: { value: number; rating: string };
    cls: { value: number; rating: string };
  };
}

interface Alert {
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  action?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeGSC = searchParams.get('gsc') !== 'false';
    const includeTrends = searchParams.get('trends') !== 'false';
    const includePageSpeed = searchParams.get('pagespeed') !== 'false';
    const testUrl = searchParams.get('url') || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yalla-london.com';

    const dashboard: DashboardData = {
      timestamp: new Date().toISOString(),
      searchConsole: null,
      trends: null,
      pageSpeed: null,
      recommendations: [],
      alerts: [],
    };

    // 1. Google Search Console Data
    if (includeGSC) {
      dashboard.searchConsole = await getSearchConsoleData();
    }

    // 2. Google Trends Data
    if (includeTrends) {
      dashboard.trends = await getTrendsData();
    }

    // 3. PageSpeed Data
    if (includePageSpeed) {
      dashboard.pageSpeed = await getPageSpeedData(testUrl);
    }

    // 4. Generate recommendations and alerts
    dashboard.recommendations = generateRecommendations(dashboard);
    dashboard.alerts = generateAlerts(dashboard);

    return NextResponse.json({
      success: true,
      data: dashboard,
      documentation: {
        searchConsole: {
          description: 'Google Search Console provides search performance data',
          dataPoints: ['impressions', 'clicks', 'ctr', 'position', 'queries', 'pages'],
          refreshRate: 'Data delayed by 2-3 days',
          authentication: 'Service Account JWT',
        },
        analytics: {
          description: 'Google Analytics 4 provides user behavior data',
          dataPoints: ['sessions', 'users', 'pageviews', 'events', 'conversions'],
          refreshRate: 'Real-time for basic metrics, 24-48h for full reports',
          authentication: 'GA4 Measurement ID + Service Account for Data API',
          measurementId: process.env.GA4_MEASUREMENT_ID || 'G-H7YNG7CH88',
        },
        trends: {
          description: 'Google Trends provides keyword interest and trending topics',
          dataPoints: ['trending_searches', 'interest_over_time', 'related_queries'],
          refreshRate: 'Real-time',
          authentication: 'SerpAPI API Key',
        },
        pageSpeed: {
          description: 'PageSpeed Insights provides performance and Core Web Vitals',
          dataPoints: ['performance_score', 'lcp', 'fid', 'cls', 'opportunities'],
          refreshRate: 'On-demand',
          authentication: 'API Key (optional)',
        },
        indexNow: {
          description: 'IndexNow provides instant URL indexing for Bing/Yandex',
          dataPoints: ['submission_status', 'urls_submitted'],
          refreshRate: 'Real-time',
          authentication: 'IndexNow Key',
        },
      },
    });
  } catch (error) {
    console.error('Dashboard data fetch failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Dashboard fetch failed' },
      { status: 500 }
    );
  }
}

async function getSearchConsoleData(): Promise<SearchConsoleData> {
  const clientEmail = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yalla-london.com';

  if (!clientEmail || !privateKey) {
    return {
      status: 'not_configured',
      serviceAccount: '',
      siteUrl,
    };
  }

  try {
    // Get search analytics for last 30 days
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const analytics = await searchConsole.getSearchAnalytics(startDate, endDate, ['query']);

    if (analytics?.rows) {
      const totals = analytics.rows.reduce(
        (acc: any, row: any) => ({
          impressions: acc.impressions + (row.impressions || 0),
          clicks: acc.clicks + (row.clicks || 0),
          position: acc.position + (row.position || 0),
          count: acc.count + 1,
        }),
        { impressions: 0, clicks: 0, position: 0, count: 0 }
      );

      return {
        status: 'connected',
        serviceAccount: clientEmail,
        siteUrl,
        last30Days: {
          impressions: totals.impressions,
          clicks: totals.clicks,
          ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
          averagePosition: totals.count > 0 ? totals.position / totals.count : 0,
        },
        topQueries: analytics.rows.slice(0, 10).map((row: any) => ({
          query: row.keys?.[0] || '',
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr || 0,
          position: row.position || 0,
        })),
      };
    }

    return {
      status: 'connected',
      serviceAccount: clientEmail,
      siteUrl,
    };
  } catch (error) {
    console.error('GSC data fetch failed:', error);
    return {
      status: 'error',
      serviceAccount: clientEmail || '',
      siteUrl,
    };
  }
}

async function getTrendsData(): Promise<TrendsData> {
  if (!googleTrends.isConfigured()) {
    return {
      status: 'not_configured',
      trendingTopics: [],
      keywordTrends: [],
    };
  }

  try {
    const trending = await googleTrends.getTrendingSearches('GB');

    const relevantCategories = ['london', 'restaurant', 'hotel', 'travel', 'food', 'luxury'];
    const trendingTopics = trending.slice(0, 10).map(t => ({
      title: t.title,
      traffic: t.traffic,
      isRelevant: relevantCategories.some(cat =>
        t.title.toLowerCase().includes(cat)
      ),
    }));

    // Get trends for key keywords
    const keywords = ['london restaurants', 'london hotels', 'halal london'];
    const keywordTrends = await googleTrends.getInterestOverTime(keywords, 'GB', 'today 3-m');

    return {
      status: 'connected',
      trendingTopics,
      keywordTrends: keywordTrends.map(kt => {
        const recent = kt.interestOverTime.slice(-7);
        const older = kt.interestOverTime.slice(-14, -7);
        const recentAvg = recent.reduce((s, p) => s + p.value, 0) / recent.length || 0;
        const olderAvg = older.reduce((s, p) => s + p.value, 0) / older.length || 0;

        return {
          keyword: kt.keyword,
          trend: recentAvg > olderAvg * 1.1 ? 'rising' as const :
            recentAvg < olderAvg * 0.9 ? 'declining' as const : 'stable' as const,
          interestScore: recentAvg,
        };
      }),
    };
  } catch (error) {
    console.error('Trends data fetch failed:', error);
    return {
      status: 'error',
      trendingTopics: [],
      keywordTrends: [],
    };
  }
}

async function getPageSpeedData(url: string): Promise<PageSpeedData> {
  try {
    const [mobileResult, desktopResult] = await Promise.all([
      googlePageSpeed.analyze(url, 'mobile'),
      googlePageSpeed.analyze(url, 'desktop'),
    ]);

    return {
      status: 'connected',
      mobile: mobileResult ? {
        performance: mobileResult.categories.performance.score,
        accessibility: mobileResult.categories.accessibility.score,
        bestPractices: mobileResult.categories.bestPractices.score,
        seo: mobileResult.categories.seo.score,
      } : undefined,
      desktop: desktopResult ? {
        performance: desktopResult.categories.performance.score,
        accessibility: desktopResult.categories.accessibility.score,
        bestPractices: desktopResult.categories.bestPractices.score,
        seo: desktopResult.categories.seo.score,
      } : undefined,
      coreWebVitals: mobileResult ? {
        lcp: {
          value: mobileResult.coreWebVitals.lcp.value,
          rating: mobileResult.coreWebVitals.lcp.score,
        },
        fid: {
          value: mobileResult.coreWebVitals.fid.value,
          rating: mobileResult.coreWebVitals.fid.score,
        },
        cls: {
          value: mobileResult.coreWebVitals.cls.value,
          rating: mobileResult.coreWebVitals.cls.score,
        },
      } : undefined,
    };
  } catch (error) {
    console.error('PageSpeed data fetch failed:', error);
    return {
      status: 'error',
    };
  }
}

function generateRecommendations(dashboard: DashboardData): string[] {
  const recommendations: string[] = [];

  // GSC recommendations
  if (dashboard.searchConsole?.status === 'connected') {
    const ctr = dashboard.searchConsole.last30Days?.ctr || 0;
    if (ctr < 2) {
      recommendations.push('Improve meta titles and descriptions to increase CTR (currently below 2%)');
    }

    const avgPosition = dashboard.searchConsole.last30Days?.averagePosition || 0;
    if (avgPosition > 20) {
      recommendations.push('Focus on improving content quality - average position is outside top 20');
    }
  }

  // Trends recommendations
  if (dashboard.trends?.status === 'connected') {
    const risingKeywords = dashboard.trends.keywordTrends.filter(k => k.trend === 'rising');
    if (risingKeywords.length > 0) {
      recommendations.push(`Capitalize on rising trends: ${risingKeywords.map(k => k.keyword).join(', ')}`);
    }

    const relevantTrending = dashboard.trends.trendingTopics.filter(t => t.isRelevant);
    if (relevantTrending.length > 0) {
      recommendations.push(`Create content for trending topic: "${relevantTrending[0].title}"`);
    }
  }

  // PageSpeed recommendations
  if (dashboard.pageSpeed?.status === 'connected') {
    const mobilePerf = dashboard.pageSpeed.mobile?.performance || 0;
    if (mobilePerf < 50) {
      recommendations.push('Critical: Mobile performance score is below 50 - prioritize performance optimization');
    }

    const cwv = dashboard.pageSpeed.coreWebVitals;
    if (cwv?.lcp.rating === 'poor') {
      recommendations.push('Improve LCP by optimizing images and reducing server response time');
    }
    if (cwv?.cls.rating === 'poor') {
      recommendations.push('Fix CLS issues by adding size attributes to images and avoiding dynamic content injection');
    }
  }

  return recommendations;
}

function generateAlerts(dashboard: DashboardData): Alert[] {
  const alerts: Alert[] = [];

  if (dashboard.searchConsole?.status === 'not_configured') {
    alerts.push({
      type: 'warning',
      title: 'Search Console Not Configured',
      message: 'Connect Google Search Console to track search performance',
      action: 'Configure GSC credentials in environment variables',
    });
  }

  if (dashboard.trends?.status === 'not_configured') {
    alerts.push({
      type: 'info',
      title: 'Google Trends Not Configured',
      message: 'Add SerpAPI key to enable trending topic monitoring',
      action: 'Add SERPAPI_API_KEY to environment variables',
    });
  }

  if (dashboard.pageSpeed?.mobile?.performance && dashboard.pageSpeed.mobile.performance < 50) {
    alerts.push({
      type: 'error',
      title: 'Poor Mobile Performance',
      message: `Mobile performance score is ${dashboard.pageSpeed.mobile.performance}/100`,
      action: 'Run PageSpeed audit and implement optimization recommendations',
    });
  }

  return alerts;
}
