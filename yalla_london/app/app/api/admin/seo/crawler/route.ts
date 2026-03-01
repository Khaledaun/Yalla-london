export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { SITES } from "@/config/sites";
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

const ALL_SITE_DOMAINS = Object.values(SITES).map(s => s.domain);

interface CrawlResult {
  url: string;
  status: "success" | "error" | "warning";
  issues: string[];
  score: number;
  lastCrawled: string;
  title?: string;
  metaDescription?: string;
  h1Count?: number;
  imageCount?: number;
  linkCount?: number;
  loadTime?: number;
}

interface SEOAnalysis {
  title: {
    present: boolean;
    length: number;
    optimal: boolean;
  };
  metaDescription: {
    present: boolean;
    length: number;
    optimal: boolean;
  };
  headings: {
    h1Count: number;
    h2Count: number;
    h3Count: number;
    optimal: boolean;
  };
  images: {
    count: number;
    altTags: number;
    missingAlt: number;
  };
  links: {
    internal: number;
    external: number;
    broken: number;
  };
  performance: {
    loadTime: number;
    optimal: boolean;
  };
}

async function handleCrawlPost(request: NextRequest) {
  try {
    const { urls, options = {} } = await request.json();

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: "URLs array is required" },
        { status: 400 },
      );
    }

    // Limit to 10 URLs per request to prevent abuse
    if (urls.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 URLs per request" },
        { status: 400 },
      );
    }

    const results: CrawlResult[] = [];
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    for (const url of urls) {
      try {
        const page = await browser.newPage();
        const startTime = Date.now();

        // Set viewport and user agent
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        );

        // Navigate to the page
        const response = await page.goto(url, {
          waitUntil: "networkidle2",
          timeout: 30000,
        });

        const loadTime = Date.now() - startTime;

        if (!response || !response.ok()) {
          results.push({
            url,
            status: "error",
            issues: [`HTTP ${response?.status() || "Unknown"} error`],
            score: 0,
            lastCrawled: new Date().toISOString(),
          });
          await page.close();
          continue;
        }

        // Get page content
        const content = await page.content();
        const $ = cheerio.load(content);

        // Analyze SEO elements
        const analysis = analyzeSEO($, loadTime);

        // Calculate SEO score
        const score = calculateSEOScore(analysis);

        // Determine status and issues
        const { status, issues } = determineStatusAndIssues(analysis, score);

        results.push({
          url,
          status,
          issues,
          score,
          lastCrawled: new Date().toISOString(),
          title: $("title").text(),
          metaDescription: $('meta[name="description"]').attr("content"),
          h1Count: $("h1").length,
          imageCount: $("img").length,
          linkCount: $("a").length,
          loadTime,
        });

        await page.close();
      } catch (error) {
        results.push({
          url,
          status: "error",
          issues: [
            `Crawl error: ${error instanceof Error ? error.message : "Unknown error"}`,
          ],
          score: 0,
          lastCrawled: new Date().toISOString(),
        });
      }
    }

    await browser.close();

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        success: results.filter((r) => r.status === "success").length,
        warnings: results.filter((r) => r.status === "warning").length,
        errors: results.filter((r) => r.status === "error").length,
        averageScore: Math.round(
          results.reduce((sum, r) => sum + r.score, 0) / results.length,
        ),
      },
    });
  } catch (error) {
    console.error("SEO Crawler Error:", error);
    return NextResponse.json(
      { error: "Failed to crawl websites" },
      { status: 500 },
    );
  }
}

function analyzeSEO($: cheerio.CheerioAPI, loadTime: number): SEOAnalysis {
  const title = $("title").text();
  const metaDescription = $('meta[name="description"]').attr("content") || "";

  return {
    title: {
      present: !!title,
      length: title.length,
      optimal: title.length >= 30 && title.length <= 60,
    },
    metaDescription: {
      present: !!metaDescription,
      length: metaDescription.length,
      optimal: metaDescription.length >= 120 && metaDescription.length <= 160,
    },
    headings: {
      h1Count: $("h1").length,
      h2Count: $("h2").length,
      h3Count: $("h3").length,
      optimal: $("h1").length === 1 && $("h2").length > 0,
    },
    images: {
      count: $("img").length,
      altTags: $("img[alt]").length,
      missingAlt: $("img").length - $("img[alt]").length,
    },
    links: {
      internal: $(`a[href^="/"]${ALL_SITE_DOMAINS.map(d => `, a[href*="${d}"]`).join('')}`).length,
      external: $('a[href^="http"]').not(ALL_SITE_DOMAINS.map(d => `a[href*="${d}"]`).join(', ')).length,
      broken: 0, // Would need additional checking
    },
    performance: {
      loadTime,
      optimal: loadTime < 3000,
    },
  };
}

function calculateSEOScore(analysis: SEOAnalysis): number {
  let score = 0;

  // Title (20 points)
  if (analysis.title.present) score += 10;
  if (analysis.title.optimal) score += 10;

  // Meta Description (20 points)
  if (analysis.metaDescription.present) score += 10;
  if (analysis.metaDescription.optimal) score += 10;

  // Headings (20 points)
  if (analysis.headings.optimal) score += 20;
  else if (analysis.headings.h1Count > 0) score += 10;

  // Images (15 points)
  if (analysis.images.count > 0) score += 5;
  if (analysis.images.missingAlt === 0) score += 10;
  else if (analysis.images.missingAlt < analysis.images.count * 0.5) score += 5;

  // Links (10 points)
  if (analysis.links.internal > 0) score += 5;
  if (analysis.links.external > 0) score += 5;

  // Performance (15 points)
  if (analysis.performance.optimal) score += 15;
  else if (analysis.performance.loadTime < 5000) score += 10;
  else if (analysis.performance.loadTime < 10000) score += 5;

  return Math.min(score, 100);
}

function determineStatusAndIssues(
  analysis: SEOAnalysis,
  score: number,
): { status: "success" | "warning" | "error"; issues: string[] } {
  const issues: string[] = [];

  if (!analysis.title.present) {
    issues.push("Missing page title");
  } else if (!analysis.title.optimal) {
    issues.push(
      `Title length ${analysis.title.length} (optimal: 30-60 characters)`,
    );
  }

  if (!analysis.metaDescription.present) {
    issues.push("Missing meta description");
  } else if (!analysis.metaDescription.optimal) {
    issues.push(
      `Meta description length ${analysis.metaDescription.length} (optimal: 120-160 characters)`,
    );
  }

  if (analysis.headings.h1Count === 0) {
    issues.push("Missing H1 heading");
  } else if (analysis.headings.h1Count > 1) {
    issues.push("Multiple H1 headings found");
  }

  if (analysis.images.missingAlt > 0) {
    issues.push(`${analysis.images.missingAlt} images missing alt tags`);
  }

  if (!analysis.performance.optimal) {
    issues.push(`Slow loading time: ${analysis.performance.loadTime}ms`);
  }

  if (analysis.links.internal === 0) {
    issues.push("No internal links found");
  }

  let status: "success" | "warning" | "error";
  if (score >= 90) {
    status = "success";
  } else if (score >= 70) {
    status = "warning";
  } else {
    status = "error";
  }

  return { status, issues };
}

export const POST = withAdminAuth(handleCrawlPost);

export async function GET() {
  return NextResponse.json({
    message: "SEO Crawler API - requires admin authentication",
    endpoints: {
      POST: "Crawl websites for SEO analysis (max 10 URLs)",
      parameters: {
        urls: "Array of URLs to crawl (max 10)",
        options: "Optional crawl configuration",
      },
    },
  });
}
