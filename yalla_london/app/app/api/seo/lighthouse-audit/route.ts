export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

/**
 * POST /api/seo/lighthouse-audit
 * Run a Lighthouse audit on a given URL.
 *
 * Requires LIGHTHOUSE_API_KEY env var for PageSpeed Insights API,
 * or falls back to returning a "not configured" response.
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const { url, device = "desktop" } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const apiKey =
      process.env.LIGHTHOUSE_API_KEY || process.env.PAGESPEED_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Lighthouse audit not configured",
          message:
            "Set LIGHTHOUSE_API_KEY or PAGESPEED_API_KEY env var to enable PageSpeed Insights integration.",
          results: null,
        },
        { status: 503 },
      );
    }

    // Use Google PageSpeed Insights API (real implementation)
    const strategy = device === "mobile" ? "MOBILE" : "DESKTOP";
    const categories = [
      "PERFORMANCE",
      "ACCESSIBILITY",
      "BEST_PRACTICES",
      "SEO",
    ];
    const categoryParams = categories.map((c) => `category=${c}`).join("&");
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&${categoryParams}&key=${apiKey}`;

    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("PageSpeed API error:", errorBody);
      return NextResponse.json(
        { error: "PageSpeed Insights API returned an error", success: false },
        { status: 502 },
      );
    }

    const data = await response.json();
    const lighthouseResult = data.lighthouseResult;

    const scores = {
      performance: Math.round(
        (lighthouseResult?.categories?.performance?.score || 0) * 100,
      ),
      accessibility: Math.round(
        (lighthouseResult?.categories?.accessibility?.score || 0) * 100,
      ),
      bestPractices: Math.round(
        (lighthouseResult?.categories?.["best-practices"]?.score || 0) * 100,
      ),
      seo: Math.round((lighthouseResult?.categories?.seo?.score || 0) * 100),
    };

    const audits = lighthouseResult?.audits || {};
    const coreWebVitals = {
      lcp: audits["largest-contentful-paint"]?.numericValue
        ? audits["largest-contentful-paint"].numericValue / 1000
        : null,
      fid: audits["max-potential-fid"]?.numericValue || null,
      cls: audits["cumulative-layout-shift"]?.numericValue || null,
      fcp: audits["first-contentful-paint"]?.numericValue
        ? audits["first-contentful-paint"].numericValue / 1000
        : null,
      tti: audits["interactive"]?.numericValue
        ? audits["interactive"].numericValue / 1000
        : null,
    };

    // Extract opportunities (performance improvements)
    const opportunities = Object.values(audits)
      .filter(
        (a: any) =>
          a.details?.type === "opportunity" && a.details?.overallSavingsMs > 0,
      )
      .map((a: any) => ({
        title: a.title,
        impact:
          a.details.overallSavingsMs > 1000
            ? "High"
            : a.details.overallSavingsMs > 300
              ? "Medium"
              : "Low",
        savings: `${(a.details.overallSavingsMs / 1000).toFixed(1)}s`,
      }))
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      results: {
        lighthouse: scores,
        coreWebVitals,
        opportunities,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Lighthouse audit error:", error);
    return NextResponse.json(
      { error: "Failed to run Lighthouse audit", success: false },
      { status: 500 },
    );
  }
});
