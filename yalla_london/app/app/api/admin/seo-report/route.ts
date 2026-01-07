export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { googleTrends } from '@/lib/integrations/google-trends';
import { googleAds } from '@/lib/integrations/google-ads';
import { googlePageSpeed } from '@/lib/integrations/google-pagespeed';
import { searchConsole } from '@/lib/integrations/google-search-console';

interface TechnicalSEOReport {
  generatedAt: string;
  siteUrl: string;
  summary: {
    overallScore: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    criticalIssues: number;
    warnings: number;
    passed: number;
  };
  connectivity: {
    googleAnalytics: { connected: boolean; message: string };
    searchConsole: { connected: boolean; message: string };
    googleAds: { connected: boolean; message: string };
    pageSpeedInsights: { connected: boolean; message: string };
    googleTrends: { connected: boolean; message: string };
  };
  performance: {
    mobile: {
      score: number;
      lcp: { value: number; status: string };
      fid: { value: number; status: string };
      cls: { value: number; status: string };
      fcp: { value: number; status: string };
      ttfb: { value: number; status: string };
    } | null;
    desktop: {
      score: number;
      lcp: { value: number; status: string };
      fid: { value: number; status: string };
      cls: { value: number; status: string };
      fcp: { value: number; status: string };
      ttfb: { value: number; status: string };
    } | null;
    recommendations: string[];
  };
  searchConsole: {
    impressions: number;
    clicks: number;
    ctr: number;
    avgPosition: number;
    topQueries: Array<{
      query: string;
      impressions: number;
      clicks: number;
      ctr: number;
      position: number;
    }>;
    topPages: Array<{
      page: string;
      impressions: number;
      clicks: number;
      ctr: number;
      position: number;
    }>;
  } | null;
  trends: {
    trendingTopics: Array<{
      title: string;
      traffic: string;
    }>;
    keywordOpportunities: string[];
  } | null;
  ads: {
    summary: {
      totalImpressions: number;
      totalClicks: number;
      totalCost: number;
      avgCtr: number;
      avgCpc: number;
      activeCampaigns: number;
    };
    topKeywords: Array<{
      keyword: string;
      impressions: number;
      clicks: number;
      ctr: number;
    }>;
  } | null;
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    category: string;
    title: string;
    description: string;
    recommendation: string;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    title: string;
    description: string;
    impact: string;
  }>;
}

/**
 * GET /api/admin/seo-report
 * Generate comprehensive technical SEO report
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const siteUrl = url.searchParams.get('url') || process.env.NEXT_PUBLIC_SITE_URL || 'https://yallalondon.com';
    const includePerformance = url.searchParams.get('performance') !== 'false';
    const includeTrends = url.searchParams.get('trends') !== 'false';
    const includeAds = url.searchParams.get('ads') !== 'false';

    const report = await generateSEOReport(siteUrl, {
      includePerformance,
      includeTrends,
      includeAds,
    });

    return NextResponse.json({
      status: 'success',
      report,
    });
  } catch (error) {
    console.error('SEO report generation error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to generate SEO report',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
});

async function generateSEOReport(
  siteUrl: string,
  options: {
    includePerformance: boolean;
    includeTrends: boolean;
    includeAds: boolean;
  }
): Promise<TechnicalSEOReport> {
  const issues: TechnicalSEOReport['issues'] = [];
  const recommendations: TechnicalSEOReport['recommendations'] = [];

  // Test connectivity for all services
  const connectivity = {
    googleAnalytics: {
      connected: !!(process.env.GOOGLE_ANALYTICS_ID || process.env.GA4_MEASUREMENT_ID),
      message: process.env.GOOGLE_ANALYTICS_ID
        ? `Connected (${process.env.GOOGLE_ANALYTICS_ID})`
        : 'Not configured',
    },
    searchConsole: {
      connected: !!(process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL),
      message: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL
        ? 'Connected via service account'
        : 'Not configured',
    },
    googleAds: {
      connected: googleAds.isConfigured(),
      message: googleAds.isConfigured() ? 'Connected' : 'Not configured',
    },
    pageSpeedInsights: {
      connected: true,
      message: 'Available (API key optional)',
    },
    googleTrends: {
      connected: googleTrends.isConfigured(),
      message: googleTrends.isConfigured() ? 'Connected via SerpAPI' : 'Not configured',
    },
  };

  // Add connectivity issues
  if (!connectivity.googleAnalytics.connected) {
    issues.push({
      severity: 'critical',
      category: 'Analytics',
      title: 'Google Analytics not configured',
      description: 'Unable to track user behavior and conversions',
      recommendation: 'Add GA4_MEASUREMENT_ID to environment variables',
    });
  }

  if (!connectivity.searchConsole.connected) {
    issues.push({
      severity: 'critical',
      category: 'Search Console',
      title: 'Google Search Console not configured',
      description: 'Unable to monitor search performance and indexing',
      recommendation: 'Configure GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL and GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY',
    });
  }

  // Performance analysis
  let performanceData: TechnicalSEOReport['performance'] = {
    mobile: null,
    desktop: null,
    recommendations: [],
  };

  if (options.includePerformance) {
    try {
      const [mobileResult, desktopResult] = await Promise.all([
        googlePageSpeed.analyze(siteUrl, 'mobile'),
        googlePageSpeed.analyze(siteUrl, 'desktop'),
      ]);

      if (mobileResult) {
        performanceData.mobile = {
          score: mobileResult.categories.performance.score,
          lcp: { value: mobileResult.coreWebVitals.lcp.value, status: mobileResult.coreWebVitals.lcp.score },
          fid: { value: mobileResult.coreWebVitals.fid.value, status: mobileResult.coreWebVitals.fid.score },
          cls: { value: mobileResult.coreWebVitals.cls.value, status: mobileResult.coreWebVitals.cls.score },
          fcp: { value: mobileResult.coreWebVitals.fcp.value, status: mobileResult.coreWebVitals.fcp.score },
          ttfb: { value: mobileResult.coreWebVitals.ttfb.value, status: mobileResult.coreWebVitals.ttfb.score },
        };

        // Add performance issues
        if (mobileResult.categories.performance.score < 50) {
          issues.push({
            severity: 'critical',
            category: 'Performance',
            title: 'Poor mobile performance',
            description: `Mobile performance score is ${mobileResult.categories.performance.score}/100`,
            recommendation: 'Optimize images, reduce JavaScript, and improve server response time',
          });
        } else if (mobileResult.categories.performance.score < 75) {
          issues.push({
            severity: 'warning',
            category: 'Performance',
            title: 'Mobile performance needs improvement',
            description: `Mobile performance score is ${mobileResult.categories.performance.score}/100`,
            recommendation: 'Consider lazy loading images and deferring non-critical JavaScript',
          });
        }

        // Add Core Web Vitals issues
        if (mobileResult.coreWebVitals.lcp.score === 'poor') {
          issues.push({
            severity: 'critical',
            category: 'Core Web Vitals',
            title: 'LCP needs improvement',
            description: `Largest Contentful Paint is ${Math.round(mobileResult.coreWebVitals.lcp.value)}ms`,
            recommendation: 'Optimize hero images, preload critical resources, improve server response time',
          });
        }

        if (mobileResult.coreWebVitals.cls.score === 'poor') {
          issues.push({
            severity: 'critical',
            category: 'Core Web Vitals',
            title: 'CLS needs improvement',
            description: `Cumulative Layout Shift is ${mobileResult.coreWebVitals.cls.value.toFixed(3)}`,
            recommendation: 'Add size attributes to images/videos, avoid inserting content above existing content',
          });
        }

        // Extract recommendations
        performanceData.recommendations = mobileResult.opportunities.slice(0, 5).map(
          opp => `${opp.title}${opp.displayValue ? `: ${opp.displayValue}` : ''}`
        );
      }

      if (desktopResult) {
        performanceData.desktop = {
          score: desktopResult.categories.performance.score,
          lcp: { value: desktopResult.coreWebVitals.lcp.value, status: desktopResult.coreWebVitals.lcp.score },
          fid: { value: desktopResult.coreWebVitals.fid.value, status: desktopResult.coreWebVitals.fid.score },
          cls: { value: desktopResult.coreWebVitals.cls.value, status: desktopResult.coreWebVitals.cls.score },
          fcp: { value: desktopResult.coreWebVitals.fcp.value, status: desktopResult.coreWebVitals.fcp.score },
          ttfb: { value: desktopResult.coreWebVitals.ttfb.value, status: desktopResult.coreWebVitals.ttfb.score },
        };
      }
    } catch (error) {
      console.error('PageSpeed analysis failed:', error);
      issues.push({
        severity: 'warning',
        category: 'Performance',
        title: 'Performance analysis failed',
        description: 'Unable to fetch PageSpeed Insights data',
        recommendation: 'Check if the URL is accessible and try again',
      });
    }
  }

  // Search Console data
  let searchConsoleData: TechnicalSEOReport['searchConsole'] = null;

  if (connectivity.searchConsole.connected) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      const [queryData, pageData] = await Promise.all([
        searchConsole.getSearchAnalytics(thirtyDaysAgo, today, ['query']),
        searchConsole.getSearchAnalytics(thirtyDaysAgo, today, ['page']),
      ]);

      if (queryData?.rows || pageData?.rows) {
        const queries = queryData?.rows || [];
        const pages = pageData?.rows || [];

        // Calculate totals
        let totalImpressions = 0;
        let totalClicks = 0;

        queries.forEach((row: any) => {
          totalImpressions += row.impressions || 0;
          totalClicks += row.clicks || 0;
        });

        searchConsoleData = {
          impressions: totalImpressions,
          clicks: totalClicks,
          ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
          avgPosition: queries.length > 0
            ? queries.reduce((sum: number, r: any) => sum + (r.position || 0), 0) / queries.length
            : 0,
          topQueries: queries.slice(0, 10).map((row: any) => ({
            query: row.keys?.[0] || '',
            impressions: row.impressions || 0,
            clicks: row.clicks || 0,
            ctr: row.ctr ? row.ctr * 100 : 0,
            position: row.position || 0,
          })),
          topPages: pages.slice(0, 10).map((row: any) => ({
            page: row.keys?.[0] || '',
            impressions: row.impressions || 0,
            clicks: row.clicks || 0,
            ctr: row.ctr ? row.ctr * 100 : 0,
            position: row.position || 0,
          })),
        };

        // Add CTR issues
        if (searchConsoleData.ctr < 2) {
          issues.push({
            severity: 'warning',
            category: 'Search Console',
            title: 'Low click-through rate',
            description: `Average CTR is ${searchConsoleData.ctr.toFixed(2)}%`,
            recommendation: 'Improve meta titles and descriptions to increase CTR',
          });
        }

        // Add position issues
        if (searchConsoleData.avgPosition > 20) {
          issues.push({
            severity: 'warning',
            category: 'Search Console',
            title: 'Low average search position',
            description: `Average position is ${searchConsoleData.avgPosition.toFixed(1)}`,
            recommendation: 'Focus on content quality and backlink building to improve rankings',
          });
        }
      }
    } catch (error) {
      console.error('Search Console data fetch failed:', error);
    }
  }

  // Google Trends data
  let trendsData: TechnicalSEOReport['trends'] = null;

  if (options.includeTrends && connectivity.googleTrends.connected) {
    try {
      const trending = await googleTrends.getTrendingSearches('GB');

      trendsData = {
        trendingTopics: trending.slice(0, 10).map(t => ({
          title: t.title,
          traffic: t.traffic,
        })),
        keywordOpportunities: [],
      };

      // Identify keyword opportunities based on trending topics
      if (trending.length > 0) {
        recommendations.push({
          priority: 'medium',
          category: 'Content',
          title: 'Leverage trending topics',
          description: `Consider creating content around: ${trending.slice(0, 3).map(t => t.title).join(', ')}`,
          impact: 'Increased organic traffic from trending searches',
        });
      }
    } catch (error) {
      console.error('Trends data fetch failed:', error);
    }
  }

  // Google Ads data
  let adsData: TechnicalSEOReport['ads'] = null;

  if (options.includeAds && connectivity.googleAds.connected) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      const [summary, keywords] = await Promise.all([
        googleAds.getAccountSummary(thirtyDaysAgo, today),
        googleAds.getKeywordPerformance(thirtyDaysAgo, today, 10),
      ]);

      if (summary) {
        adsData = {
          summary: {
            totalImpressions: summary.totalImpressions,
            totalClicks: summary.totalClicks,
            totalCost: summary.totalCost,
            avgCtr: summary.avgCtr,
            avgCpc: summary.avgCpc,
            activeCampaigns: summary.activeCampaigns,
          },
          topKeywords: keywords.map(kw => ({
            keyword: kw.keywordText,
            impressions: kw.impressions,
            clicks: kw.clicks,
            ctr: kw.ctr,
          })),
        };
      }
    } catch (error) {
      console.error('Ads data fetch failed:', error);
    }
  }

  // Generate recommendations
  if (performanceData.mobile && performanceData.mobile.score < 90) {
    recommendations.push({
      priority: 'high',
      category: 'Performance',
      title: 'Optimize page speed',
      description: 'Improve mobile performance score to 90+ for better user experience and SEO',
      impact: 'Better Core Web Vitals can improve search rankings by 5-15%',
    });
  }

  if (!connectivity.googleAnalytics.connected) {
    recommendations.push({
      priority: 'high',
      category: 'Analytics',
      title: 'Set up Google Analytics',
      description: 'Install GA4 to track user behavior and measure conversions',
      impact: 'Essential for data-driven SEO decisions',
    });
  }

  if (!connectivity.searchConsole.connected) {
    recommendations.push({
      priority: 'high',
      category: 'Search Console',
      title: 'Connect Google Search Console',
      description: 'Enable search performance monitoring and indexing management',
      impact: 'Direct insights into how Google sees your site',
    });
  }

  if (searchConsoleData && searchConsoleData.avgPosition > 10) {
    recommendations.push({
      priority: 'medium',
      category: 'Content',
      title: 'Improve content quality',
      description: 'Focus on high-quality, comprehensive content to improve rankings',
      impact: 'Moving from page 2 to page 1 can increase traffic by 200-1000%',
    });
  }

  // Calculate overall score
  let scoreComponents = 0;
  let totalComponents = 0;

  // Performance component (30%)
  if (performanceData.mobile) {
    scoreComponents += performanceData.mobile.score * 0.3;
    totalComponents += 0.3;
  }

  // Search Console metrics (40%)
  if (searchConsoleData) {
    const ctrScore = Math.min(searchConsoleData.ctr * 10, 100);
    const positionScore = Math.max(0, 100 - searchConsoleData.avgPosition * 2);
    scoreComponents += ((ctrScore + positionScore) / 2) * 0.4;
    totalComponents += 0.4;
  }

  // Connectivity (30%)
  const connectedServices = Object.values(connectivity).filter(c => c.connected).length;
  const connectivityScore = (connectedServices / Object.keys(connectivity).length) * 100;
  scoreComponents += connectivityScore * 0.3;
  totalComponents += 0.3;

  const overallScore = totalComponents > 0 ? Math.round(scoreComponents / totalComponents) : 0;

  // Calculate grade
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (overallScore >= 90) grade = 'A';
  else if (overallScore >= 80) grade = 'B';
  else if (overallScore >= 70) grade = 'C';
  else if (overallScore >= 60) grade = 'D';
  else grade = 'F';

  return {
    generatedAt: new Date().toISOString(),
    siteUrl,
    summary: {
      overallScore,
      grade,
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      passed: issues.filter(i => i.severity === 'info').length,
    },
    connectivity,
    performance: performanceData,
    searchConsole: searchConsoleData,
    trends: trendsData,
    ads: adsData,
    issues,
    recommendations,
  };
}
