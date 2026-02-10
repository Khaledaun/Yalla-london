export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { searchConsole } from "@/lib/integrations/google-search-console";
import { fetchGA4Metrics, isGA4Configured } from "@/lib/seo/ga4-data-api";
import { googlePageSpeed } from "@/lib/integrations/google-pagespeed";
import { cloudflare } from "@/lib/integrations/cloudflare";
import { requireAdmin } from "@/lib/admin-middleware";
import { getSiteSeoConfig } from "@/config/sites";

/**
 * Full-Site SEO Audit API
 * GET /api/seo/full-audit
 *
 * Pulls real data from GSC + GA4 + PageSpeed and generates
 * a comprehensive audit with actionable fixes.
 *
 * Query params:
 *   ?siteId=X      - Target site (default: from x-site-id header or yalla-london)
 *   ?days=30       - Date range (default 30)
 *   ?pagespeed=true - Include PageSpeed analysis (slower)
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);
    const includePageSpeed = searchParams.get("pagespeed") === "true";

    // Per-site scoping: query param > header > default
    const siteId = searchParams.get("siteId")
      || request.headers.get("x-site-id")
      || "yalla-london";
    const seoConfig = getSiteSeoConfig(siteId);

    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Check service configuration
    const gscConfigured = searchConsole.isConfigured();
    const ga4Configured = isGA4Configured();

    const cfConfigured = cloudflare.isConfigured();

    const configStatus = {
      gsc: gscConfigured,
      gscSiteUrl: searchConsole.getStatus().siteUrl,
      ga4: ga4Configured,
      cloudflare: cfConfigured,
      pageSpeed: true, // Always available (no key required)
    };

    if (!gscConfigured && !ga4Configured) {
      return NextResponse.json({
        success: false,
        error: "No data sources configured",
        configStatus,
        setup: {
          message: "Set the following environment variables to enable the audit",
          required: [
            "GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL - Service account email",
            "GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY - Service account private key (PEM format)",
            "NEXT_PUBLIC_SITE_URL - Your verified site URL in GSC (e.g. https://www.yalla-london.com)",
          ],
          optional: [
            "GA4_PROPERTY_ID - Numeric GA4 property ID for traffic data",
          ],
        },
      }, { status: 503 });
    }

    // Pull all data in parallel
    const [
      searchAnalyticsQueries,
      searchAnalyticsPages,
      topPages,
      topKeywords,
      countryPerformance,
      devicePerformance,
      sitemaps,
      ga4Data,
      cfAudit,
    ] = await Promise.all([
      gscConfigured
        ? searchConsole.getSearchAnalytics(startDate, endDate, ["query"])
        : null,
      gscConfigured
        ? searchConsole.getSearchAnalytics(startDate, endDate, ["page"])
        : null,
      gscConfigured
        ? searchConsole.getTopPages(startDate, endDate, 50)
        : [],
      gscConfigured
        ? searchConsole.getTopKeywords(startDate, endDate, 100)
        : [],
      gscConfigured
        ? searchConsole.getPerformanceByCountry(startDate, endDate)
        : [],
      gscConfigured
        ? searchConsole.getPerformanceByDevice(startDate, endDate)
        : [],
      gscConfigured
        ? searchConsole.getSitemaps()
        : [],
      ga4Configured
        ? fetchGA4Metrics(`${days}daysAgo`, "today")
        : null,
      cfConfigured
        ? cloudflare.runAudit()
        : null,
    ]);

    // Aggregate GSC totals
    const gscTotals = {
      impressions: 0,
      clicks: 0,
      ctr: 0,
      averagePosition: 0,
    };

    if (searchAnalyticsQueries?.rows) {
      let totalPosition = 0;
      for (const row of searchAnalyticsQueries.rows) {
        gscTotals.impressions += row.impressions || 0;
        gscTotals.clicks += row.clicks || 0;
        totalPosition += row.position || 0;
      }
      gscTotals.ctr = gscTotals.impressions > 0
        ? Math.round((gscTotals.clicks / gscTotals.impressions) * 10000) / 100
        : 0;
      gscTotals.averagePosition = searchAnalyticsQueries.rows.length > 0
        ? Math.round((totalPosition / searchAnalyticsQueries.rows.length) * 10) / 10
        : 0;
    }

    // Analyze page performance from GSC
    const pageAnalysis = (searchAnalyticsPages?.rows || []).map((row: any) => {
      const url = row.keys?.[0] || "";
      const clicks = row.clicks || 0;
      const impressions = row.impressions || 0;
      const ctr = row.ctr || 0;
      const position = row.position || 0;

      const issues: string[] = [];

      // High impressions but low CTR = bad title/description
      if (impressions > 20 && ctr < 0.02) {
        issues.push("Low CTR despite impressions - improve meta title/description");
      }

      // Good position but no clicks
      if (position <= 10 && clicks === 0 && impressions > 5) {
        issues.push("Page ranking in top 10 but getting no clicks - meta snippet needs work");
      }

      // Position 11-20 = almost on page 1
      if (position > 10 && position <= 20) {
        issues.push("Almost on page 1 - improve content quality to push into top 10");
      }

      // High position = low visibility
      if (position > 30) {
        issues.push("Poor ranking - needs significant content improvement or backlinks");
      }

      return {
        url,
        clicks,
        impressions,
        ctr: Math.round(ctr * 10000) / 100,
        position: Math.round(position * 10) / 10,
        issues,
      };
    });

    // Analyze keywords
    const keywordAnalysis = (topKeywords || []).map((row: any) => {
      const query = row.keys?.[0] || "";
      const clicks = row.clicks || 0;
      const impressions = row.impressions || 0;
      const ctr = row.ctr || 0;
      const position = row.position || 0;

      const opportunity =
        position <= 5 ? "defending" :
        position <= 10 ? "page1_optimize" :
        position <= 20 ? "almost_page1" :
        position <= 50 ? "needs_work" : "long_shot";

      return {
        query,
        clicks,
        impressions,
        ctr: Math.round(ctr * 10000) / 100,
        position: Math.round(position * 10) / 10,
        opportunity,
      };
    });

    // Generate issues and recommendations
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    const opportunities: string[] = [];

    // Check indexing from sitemaps
    if (sitemaps.length === 0 && gscConfigured) {
      criticalIssues.push("No sitemaps submitted to Google Search Console");
    }

    // Check overall performance
    if (gscTotals.clicks === 0 && gscTotals.impressions > 0) {
      criticalIssues.push(
        `Site has ${gscTotals.impressions} impressions but 0 clicks - meta titles/descriptions need immediate improvement`
      );
    }

    if (gscTotals.ctr < 2 && gscTotals.impressions > 50) {
      warnings.push(
        `Overall CTR is ${gscTotals.ctr}% (industry avg is 3-5%) - improve meta titles to be more compelling`
      );
    }

    if (gscTotals.averagePosition > 20) {
      warnings.push(
        `Average position is ${gscTotals.averagePosition} - most content is not on page 1`
      );
    }

    // Find quick wins: high impressions, low position
    const quickWins = keywordAnalysis
      .filter((k: any) => k.opportunity === "almost_page1" && k.impressions > 5)
      .sort((a: any, b: any) => b.impressions - a.impressions)
      .slice(0, 10);

    if (quickWins.length > 0) {
      opportunities.push(
        `${quickWins.length} keywords on page 2 that could be pushed to page 1 with content improvements`
      );
    }

    // Find high-impression zero-click queries
    const zeroClickHighImpression = keywordAnalysis
      .filter((k: any) => k.clicks === 0 && k.impressions > 10)
      .sort((a: any, b: any) => b.impressions - a.impressions)
      .slice(0, 10);

    if (zeroClickHighImpression.length > 0) {
      opportunities.push(
        `${zeroClickHighImpression.length} queries getting impressions but zero clicks - optimize meta snippets`
      );
    }

    // Check country targeting
    const targetCountries = ["gbr", "sau", "are", "kwt", "bhr", "qat", "omn"];
    const actualCountries = (countryPerformance || []).map((r: any) => r.keys?.[0]?.toLowerCase());
    const missingTargets = targetCountries.filter(
      (c) => !actualCountries.includes(c)
    );
    if (missingTargets.length > 0 && actualCountries.length > 0) {
      warnings.push(
        `Not reaching these target markets: ${missingTargets.join(", ")} - consider creating market-specific content`
      );
    }

    // Check mobile vs desktop
    const mobileData = (devicePerformance || []).find((r: any) => r.keys?.[0] === "MOBILE");
    const desktopData = (devicePerformance || []).find((r: any) => r.keys?.[0] === "DESKTOP");
    if (mobileData && desktopData) {
      const mobileClicks = mobileData.clicks || 0;
      const desktopClicks = desktopData.clicks || 0;
      if (mobileClicks < desktopClicks * 0.5) {
        warnings.push("Mobile traffic significantly lower than desktop - check mobile usability");
      }
    }

    // GA4 analysis
    let ga4Analysis = null;
    if (ga4Data) {
      const m = ga4Data.metrics;
      ga4Analysis = {
        metrics: m,
        topPages: ga4Data.topPages,
        topSources: ga4Data.topSources,
        issues: [] as string[],
      };

      if (m.bounceRate > 70) {
        ga4Analysis.issues.push(
          `High bounce rate (${m.bounceRate}%) - users are leaving quickly. Improve page load speed and content relevance`
        );
      }
      if (m.avgSessionDuration < 30) {
        ga4Analysis.issues.push(
          `Very low session duration (${m.avgSessionDuration}s) - content not engaging enough`
        );
      }
      if (m.engagementRate < 40) {
        ga4Analysis.issues.push(
          `Low engagement rate (${m.engagementRate}%) - add more interactive elements and internal links`
        );
      }
    }

    // Optional PageSpeed
    let pageSpeedData = null;
    if (includePageSpeed) {
      const siteUrl = seoConfig.siteUrl;
      try {
        const [mobile, desktop] = await Promise.all([
          googlePageSpeed.analyze(siteUrl, "mobile"),
          googlePageSpeed.analyze(siteUrl, "desktop"),
        ]);
        pageSpeedData = {
          mobile: mobile ? {
            performance: mobile.categories.performance.score,
            accessibility: mobile.categories.accessibility.score,
            seo: mobile.categories.seo.score,
            bestPractices: mobile.categories.bestPractices.score,
            coreWebVitals: mobile.coreWebVitals,
          } : null,
          desktop: desktop ? {
            performance: desktop.categories.performance.score,
            accessibility: desktop.categories.accessibility.score,
            seo: desktop.categories.seo.score,
            bestPractices: desktop.categories.bestPractices.score,
            coreWebVitals: desktop.coreWebVitals,
          } : null,
        };

        if (mobile && mobile.categories.performance.score < 50) {
          criticalIssues.push(
            `Mobile performance score is ${mobile.categories.performance.score}/100 - prioritize speed optimization`
          );
        }
        if (mobile && mobile.categories.seo.score < 80) {
          warnings.push(
            `Lighthouse SEO score is ${mobile.categories.seo.score}/100 - technical SEO needs improvement`
          );
        }
      } catch {
        pageSpeedData = { error: "PageSpeed analysis failed" };
      }
    }

    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      siteId,
      siteUrl: seoConfig.siteUrl,
      auditDate: new Date().toISOString(),
      dateRange: { startDate, endDate, days },
      configStatus,
      elapsed: `${elapsed}ms`,

      // Raw performance data
      gsc: gscConfigured ? {
        totals: gscTotals,
        pages: pageAnalysis,
        keywords: keywordAnalysis,
        quickWins,
        zeroClickHighImpression,
        countryPerformance: (countryPerformance || []).map((r: any) => ({
          country: r.keys?.[0],
          clicks: r.clicks,
          impressions: r.impressions,
          ctr: Math.round((r.ctr || 0) * 10000) / 100,
          position: Math.round((r.position || 0) * 10) / 10,
        })),
        devicePerformance: (devicePerformance || []).map((r: any) => ({
          device: r.keys?.[0],
          clicks: r.clicks,
          impressions: r.impressions,
          ctr: Math.round((r.ctr || 0) * 10000) / 100,
          position: Math.round((r.position || 0) * 10) / 10,
        })),
        sitemaps: sitemaps.map((s) => ({
          path: s.path,
          lastSubmitted: s.lastSubmitted,
          errors: s.errors,
          warnings: s.warnings,
          isPending: s.isPending,
        })),
      } : null,

      ga4: ga4Analysis,
      pageSpeed: pageSpeedData,
      cloudflare: cfAudit ? {
        zone: cfAudit.zone,
        analytics: cfAudit.analytics,
        cache: cfAudit.cache,
        security: cfAudit.security,
        dns: cfAudit.dns,
        pageRules: cfAudit.pageRules,
        botManagement: cfAudit.botManagement,
      } : null,

      // Actionable summary (merge Cloudflare issues)
      summary: {
        criticalIssues: [
          ...criticalIssues,
          ...(cfAudit?.issues || []),
        ],
        warnings: [
          ...warnings,
        ],
        opportunities: [
          ...opportunities,
          ...(cfAudit?.recommendations || []),
        ],
        score: Math.max(0, 100
          - (criticalIssues.length * 20)
          - ((cfAudit?.issues?.length || 0) * 15)
          - (warnings.length * 5)
          + (opportunities.length * 2)
        ),
      },
    });
  } catch (error) {
    console.error("Full SEO audit failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Audit failed",
        elapsed: `${Date.now() - startTime}ms`,
      },
      { status: 500 },
    );
  }
}
