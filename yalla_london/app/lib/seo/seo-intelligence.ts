/**
 * SEO Intelligence Module
 *
 * Pulls real GSC and GA4 data, analyzes performance issues,
 * and auto-fixes problems using AI-generated meta optimizations.
 *
 * Used by the autonomous SEO agent (3x daily cron).
 */

import { searchConsole } from "../integrations/google-search-console";
import { fetchGA4Metrics } from "./ga4-data-api";

// ============================================
// TYPES
// ============================================

export interface SearchPerformanceAnalysis {
  totals: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  lowCTRPages: PageIssue[];
  almostPage1: PageIssue[];
  zeroClickBrandQueries: KeywordIssue[];
  page1NoClicks: PageIssue[];
  contentGapKeywords: KeywordIssue[];
  issues: string[];
  opportunities: string[];
}

export interface TrafficAnalysis {
  sessions: number;
  organicShare: number;
  bounceRate: number;
  engagementRate: number;
  topPagesNotInGSC: string[];
  lowEngagementPages: { path: string; bounceRate: number }[];
  issues: string[];
}

export interface PageIssue {
  url: string;
  slug: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  issue: string;
  fix: string;
}

export interface KeywordIssue {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  opportunity: string;
  suggestedAction: string;
}

export interface MetaOptimization {
  postId: string;
  slug: string;
  oldTitle: string;
  newTitle: string;
  oldDescription: string;
  newDescription: string;
  reason: string;
  topKeywords: string[];
}

// ============================================
// GSC SEARCH PERFORMANCE ANALYSIS
// ============================================

export async function analyzeSearchPerformance(
  days: number = 28,
  siteId?: string
): Promise<SearchPerformanceAnalysis | null> {
  // Per-site GSC config — checks Variable Vault (DB), then env vars
  let siteUrl: string | undefined;
  if (siteId) {
    try {
      const { getSiteSeoConfigFromVault } = await import("@/config/sites");
      const seoConfig = await getSiteSeoConfigFromVault(siteId);
      siteUrl = seoConfig.gscSiteUrl;
      if (siteUrl) {
        searchConsole.setSiteUrl(siteUrl);
      }
    } catch (error) {
      console.warn(`[SEO Intelligence] Failed to load site SEO config from vault for site "${siteId}":`, error);
    }
  }
  if (!siteUrl) {
    siteUrl = process.env.GSC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (!siteUrl) return null;

  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  try {
    const [pageData, keywordData] = await Promise.all([
      searchConsole.getTopPages(startDate, endDate, 50),
      searchConsole.getTopKeywords(startDate, endDate, 100),
    ]);

    if (!pageData?.length && !keywordData?.length) {
      return null;
    }

    // Calculate totals
    const totals = {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    };

    const pages = (pageData || []).map((p: any) => ({
      url: p.keys?.[0] || p.url || "",
      clicks: p.clicks || 0,
      impressions: p.impressions || 0,
      ctr: p.ctr ? p.ctr * 100 : 0,
      position: p.position || 0,
    }));

    for (const p of pages) {
      totals.clicks += p.clicks;
      totals.impressions += p.impressions;
    }
    totals.ctr =
      totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    totals.position =
      pages.length > 0
        ? pages.reduce((s: number, p: any) => s + p.position, 0) / pages.length
        : 0;

    const keywords = (keywordData || []).map((k: any) => ({
      query: k.keys?.[0] || k.query || "",
      clicks: k.clicks || 0,
      impressions: k.impressions || 0,
      ctr: k.ctr ? k.ctr * 100 : 0,
      position: k.position || 0,
    }));

    const issues: string[] = [];
    const opportunities: string[] = [];

    // ANALYSIS 1: Low CTR pages (ranking well but not getting clicks)
    const lowCTRPages: PageIssue[] = pages
      .filter(
        (p: any) =>
          p.impressions >= 10 && p.ctr < 3 && p.position <= 15
      )
      .map((p: any) => {
        const slug = extractSlug(p.url);
        return {
          url: p.url,
          slug,
          clicks: p.clicks,
          impressions: p.impressions,
          ctr: Math.round(p.ctr * 100) / 100,
          position: Math.round(p.position * 10) / 10,
          issue: `CTR ${p.ctr.toFixed(1)}% at position ${p.position.toFixed(1)} — meta title/description not compelling`,
          fix: "auto_optimize_meta",
        };
      });

    if (lowCTRPages.length > 0) {
      issues.push(
        `${lowCTRPages.length} pages have low CTR despite good ranking positions`
      );
    }

    // ANALYSIS 2: Almost page 1 (positions 11-20)
    const almostPage1: PageIssue[] = pages
      .filter(
        (p: any) =>
          p.position > 10 && p.position <= 20 && p.impressions >= 5
      )
      .map((p: any) => ({
        url: p.url,
        slug: extractSlug(p.url),
        clicks: p.clicks,
        impressions: p.impressions,
        ctr: Math.round(p.ctr * 100) / 100,
        position: Math.round(p.position * 10) / 10,
        issue: `Position ${p.position.toFixed(1)} — just off page 1`,
        fix: "strengthen_content",
      }));

    if (almostPage1.length > 0) {
      opportunities.push(
        `${almostPage1.length} pages are on page 2 and could be pushed to page 1`
      );
    }

    // ANALYSIS 3: Zero-click high-impression queries (brand + valuable keywords)
    const zeroClickBrandQueries: KeywordIssue[] = keywords
      .filter(
        (k: any) =>
          k.clicks === 0 && k.impressions >= 5 && k.position <= 10
      )
      .map((k: any) => ({
        query: k.query,
        clicks: k.clicks,
        impressions: k.impressions,
        ctr: 0,
        position: Math.round(k.position * 10) / 10,
        opportunity:
          k.position <= 5 ? "high_value_zero_click" : "page1_optimize",
        suggestedAction: "Optimize meta snippet for this query",
      }));

    if (zeroClickBrandQueries.length > 0) {
      issues.push(
        `${zeroClickBrandQueries.length} queries on page 1 getting 0 clicks — meta snippets need work`
      );
    }

    // ANALYSIS 4: Page 1 rankings with no clicks
    const page1NoClicks: PageIssue[] = pages
      .filter(
        (p: any) =>
          p.clicks === 0 && p.impressions >= 10 && p.position <= 10
      )
      .map((p: any) => ({
        url: p.url,
        slug: extractSlug(p.url),
        clicks: p.clicks,
        impressions: p.impressions,
        ctr: 0,
        position: Math.round(p.position * 10) / 10,
        issue: `Page 1 (pos ${p.position.toFixed(1)}) with ${p.impressions} impressions but 0 clicks`,
        fix: "auto_optimize_meta",
      }));

    if (page1NoClicks.length > 0) {
      issues.push(
        `CRITICAL: ${page1NoClicks.length} pages ranking on page 1 but getting ZERO clicks`
      );
    }

    // ANALYSIS 5: Content gap keywords (high position = no relevant content)
    const contentGapKeywords: KeywordIssue[] = keywords
      .filter(
        (k: any) =>
          k.position > 20 && k.impressions >= 3
      )
      .map((k: any) => ({
        query: k.query,
        clicks: k.clicks,
        impressions: k.impressions,
        ctr: Math.round(k.ctr * 100) / 100,
        position: Math.round(k.position * 10) / 10,
        opportunity: "content_gap",
        suggestedAction: "Create or strengthen content targeting this keyword",
      }));

    if (contentGapKeywords.length > 0) {
      opportunities.push(
        `${contentGapKeywords.length} keywords with ranking potential need dedicated content`
      );
    }

    return {
      totals,
      lowCTRPages,
      almostPage1,
      zeroClickBrandQueries,
      page1NoClicks,
      contentGapKeywords,
      issues,
      opportunities,
    };
  } catch (error) {
    console.error("Search performance analysis failed:", error);
    return null;
  }
}

// ============================================
// GA4 TRAFFIC ANALYSIS
// ============================================

export async function analyzeTrafficPatterns(
  days: number = 28,
  siteId?: string
): Promise<TrafficAnalysis | null> {
  try {
    const startDate = `${days}daysAgo`;
    // Per-site GA4 config — checks Variable Vault (DB), then env vars
    let ga4PropertyId: string | undefined;
    if (siteId) {
      try {
        const { getSiteSeoConfigFromVault } = await import("@/config/sites");
        const seoConfig = await getSiteSeoConfigFromVault(siteId);
        ga4PropertyId = seoConfig.ga4PropertyId;
      } catch (error) {
        console.warn(`[SEO Intelligence] Failed to load GA4 config from vault for site "${siteId}":`, error);
      }
    }
    const ga4Data = await fetchGA4Metrics(startDate, "today", ga4PropertyId);

    if (!ga4Data) return null;

    const { metrics, topPages, topSources } = ga4Data;
    const issues: string[] = [];

    // Calculate organic search share from sources
    const totalSessions = metrics.sessions || 0;
    const googleSource = (topSources || []).find(
      (s: any) => s.source === "google"
    );
    const organicSessions = googleSource?.sessions || 0;
    const organicShare =
      totalSessions > 0 ? (organicSessions / totalSessions) * 100 : 0;

    if (organicShare < 20) {
      issues.push(
        `Organic search is only ${organicShare.toFixed(1)}% of traffic — indexing and ranking need improvement`
      );
    }

    if (metrics.bounceRate > 50) {
      issues.push(
        `Overall bounce rate is ${metrics.bounceRate.toFixed(1)}% — content engagement needs work`
      );
    }

    // Identify low-engagement pages (pages with very short session times)
    const lowEngagementPages: { path: string; bounceRate: number }[] = [];
    if (topPages) {
      for (const page of topPages) {
        // Flag pages with very low engagement time (< 10s) and enough sessions
        if (
          page.avgEngagementTime < 10 &&
          page.sessions >= 5
        ) {
          lowEngagementPages.push({
            path: page.path,
            bounceRate: Math.round(
              (1 - page.avgEngagementTime / 60) * 100
            ),
          });
        }
      }
    }

    if (lowEngagementPages.length > 0) {
      issues.push(
        `${lowEngagementPages.length} pages have very low engagement time (<10s)`
      );
    }

    return {
      sessions: totalSessions,
      organicShare: Math.round(organicShare * 10) / 10,
      bounceRate: metrics.bounceRate,
      engagementRate: metrics.engagementRate,
      topPagesNotInGSC: [],
      lowEngagementPages,
      issues,
    };
  } catch (error) {
    console.error("Traffic analysis failed:", error);
    return null;
  }
}

// ============================================
// AI-POWERED META OPTIMIZATION
// ============================================

export async function generateOptimizedMeta(
  post: {
    title_en: string;
    meta_title_en?: string | null;
    meta_description_en?: string | null;
    excerpt_en?: string | null;
    content_en?: string | null;
    slug: string;
  },
  topKeywords: string[],
  performance: { ctr: number; position: number; impressions: number }
): Promise<{ title: string; description: string } | null> {
  try {
    const { generateJSON } = await import("@/lib/ai/provider");

    const currentTitle = post.meta_title_en || post.title_en || "";
    const currentDesc = post.meta_description_en || post.excerpt_en || "";
    const contentPreview = (post.content_en || "").slice(0, 500);

    const prompt = `You are an SEO specialist for a luxury travel content site targeting Arab visitors to destinations worldwide.

Current page performance:
- Position: ${performance.position.toFixed(1)} (${performance.position <= 10 ? "page 1" : "page 2"})
- CTR: ${performance.ctr.toFixed(1)}% (${performance.ctr < 3 ? "LOW - needs improvement" : "acceptable"})
- Impressions: ${performance.impressions}

Current meta:
- Title: "${currentTitle}"
- Description: "${currentDesc}"

Top search queries reaching this page: ${topKeywords.slice(0, 5).join(", ")}

Content preview: ${contentPreview}

Generate an optimized meta title and description that will increase CTR. Rules:
- Title: 50-60 characters, include primary keyword near start, use power words (Best, Guide, Top, 2026)
- Description: 140-155 characters, include call-to-action, mention unique value proposition
- Target audience: Arab/Muslim travelers looking for halal-friendly, luxury experiences
- Maintain the same topic/intent as the original

Return JSON: { "title": "...", "description": "..." }`;

    const result = await generateJSON<{ title: string; description: string }>(
      prompt,
      { temperature: 0.4, maxTokens: 200 }
    );

    // Validate lengths
    if (
      result.title &&
      result.title.length >= 30 &&
      result.title.length <= 65 &&
      result.description &&
      result.description.length >= 80 &&
      result.description.length <= 165
    ) {
      return result;
    }

    return null;
  } catch (error) {
    console.error("AI meta generation failed:", error);
    return null;
  }
}

// ============================================
// AUTO-FIX: OPTIMIZE LOW-CTR META
// ============================================

export async function autoOptimizeLowCTRMeta(
  prisma: any,
  searchData: SearchPerformanceAnalysis,
  issues: string[],
  fixes: string[]
): Promise<MetaOptimization[]> {
  const optimizations: MetaOptimization[] = [];

  // Combine page1 no-click pages and low CTR pages — these need meta fixes
  const pagesToOptimize = [
    ...searchData.page1NoClicks,
    ...searchData.lowCTRPages,
  ]
    .filter((p) => p.fix === "auto_optimize_meta")
    .slice(0, 2); // Limit to 2 per run to prevent timeout (was 5)

  if (pagesToOptimize.length === 0) return optimizations;

  // Get keywords for each page
  const keywordMap = new Map<string, string[]>();
  for (const kw of searchData.zeroClickBrandQueries) {
    // We don't have URL-to-keyword mapping from GSC directly,
    // so we'll pass top keywords to the AI
  }

  // Get all top keywords for context
  const allTopKeywords = [
    ...searchData.zeroClickBrandQueries.map((k) => k.query),
    ...searchData.contentGapKeywords.map((k) => k.query),
  ].slice(0, 20);

  for (const page of pagesToOptimize) {
    if (!page.slug || page.slug === "") continue;

    // Find the blog post in the database
    const post = await prisma.blogPost.findFirst({
      where: {
        slug: page.slug,
        published: true,
        
      },
      select: {
        id: true,
        title_en: true,
        slug: true,
        meta_title_en: true,
        meta_description_en: true,
        excerpt_en: true,
        content_en: true,
        keywords_json: true,
      },
    });

    if (!post) continue;

    // Find keywords related to this page
    const pageKeywords = allTopKeywords.filter((kw) => {
      const slugWords = page.slug.replace(/-/g, " ").toLowerCase();
      return kw
        .toLowerCase()
        .split(" ")
        .some((w: string) => slugWords.includes(w));
    });

    // Generate optimized meta using AI
    const optimized = await generateOptimizedMeta(
      post,
      pageKeywords.length > 0 ? pageKeywords : allTopKeywords.slice(0, 5),
      {
        ctr: page.ctr,
        position: page.position,
        impressions: page.impressions,
      }
    );

    if (!optimized) continue;

    // Only update if the new meta is actually different
    const titleChanged =
      optimized.title !== (post.meta_title_en || post.title_en);
    const descChanged =
      optimized.description !==
      (post.meta_description_en || post.excerpt_en || "");

    if (!titleChanged && !descChanged) continue;

    // Apply the fix to the database
    try {
      const updateData: any = {};
      if (titleChanged) updateData.meta_title_en = optimized.title;
      if (descChanged) updateData.meta_description_en = optimized.description;

      await prisma.blogPost.update({
        where: { id: post.id },
        data: updateData,
      });

      const optimization: MetaOptimization = {
        postId: post.id,
        slug: post.slug,
        oldTitle: post.meta_title_en || post.title_en,
        newTitle: titleChanged ? optimized.title : post.meta_title_en || "",
        oldDescription: post.meta_description_en || post.excerpt_en || "",
        newDescription: descChanged
          ? optimized.description
          : post.meta_description_en || "",
        reason: page.issue,
        topKeywords: pageKeywords.slice(0, 5),
      };

      optimizations.push(optimization);
      fixes.push(
        `AI-optimized meta for "${post.slug}" — was CTR ${page.ctr}% at pos ${page.position}`
      );
    } catch (error) {
      console.warn(`Failed to update meta for ${post.slug}:`, error);
    }
  }

  if (optimizations.length > 0) {
    issues.push(
      `AUTO-FIX: Optimized meta titles/descriptions for ${optimizations.length} low-CTR pages`
    );
  }

  return optimizations;
}

// ============================================
// AUTO-FIX: SUBMIT UNINDEXED PAGES
// ============================================

export async function submitUnindexedPages(
  prisma: any,
  fixes: string[],
  siteId?: string
): Promise<{ indexNow: number; gscApi: number; urls: string[] }> {
  let siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";
  let indexNowKey = process.env.INDEXNOW_KEY;
  // Per-site URL and IndexNow key (multi-tenant)
  if (siteId) {
    try {
      const { getSiteSeoConfigFromVault, getSiteDomain } = await import("@/config/sites");
      siteUrl = getSiteDomain(siteId) || siteUrl;
      const seoConfig = await getSiteSeoConfigFromVault(siteId);
      indexNowKey = seoConfig.indexNowKey || indexNowKey;
    } catch (error) {
      console.warn(`[SEO Intelligence] Failed to load IndexNow/domain config from vault for site "${siteId}":`, error);
    }
  }
  let indexNowCount = 0;
  let gscApiCount = 0;

  try {
    // Get all published posts (filtered by site for multi-tenant)
    const blogSiteFilter = siteId ? { siteId } : {};
    const posts = await prisma.blogPost.findMany({
      where: { published: true, ...blogSiteFilter },
      select: { slug: true, created_at: true },
      orderBy: { created_at: "desc" },
    });

    const allUrls = posts.map((p: any) => `${siteUrl}/blog/${p.slug}`);

    // Also include static pages
    const staticPages = ["", "/blog", "/recommendations", "/events", "/about", "/contact"];
    const allSubmitUrls = [
      ...staticPages.map((p) => `${siteUrl}${p}`),
      ...allUrls,
    ];

    // 1. IndexNow (Bing, Yandex — idempotent, submit all)
    if (indexNowKey && allSubmitUrls.length > 0) {
      try {
        const response = await fetch("https://api.indexnow.org/indexnow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            host: new URL(siteUrl).hostname,
            key: indexNowKey,
            keyLocation: `${siteUrl}/${indexNowKey}.txt`,
            urlList: allSubmitUrls.slice(0, 100),
          }),
        });

        if (response.ok || response.status === 202) {
          indexNowCount = Math.min(allSubmitUrls.length, 100);
        }
      } catch (e) {
        console.warn("IndexNow submission failed:", e);
      }
    }

    // 2. Submit sitemap to Google via GSC API
    // NOTE: The Google Indexing API (urlNotifications:publish) only works for
    // JobPosting/BroadcastEvent pages. For regular blog content, programmatic
    // sitemap submission is the correct approach for Google discovery.
    try {
      const { GoogleSearchConsoleAPI } = await import("./indexing-service");
      const gsc = new GoogleSearchConsoleAPI();

      const sitemapResult = await gsc.submitSitemap(`${siteUrl}/sitemap.xml`);
      if (sitemapResult.success) {
        gscApiCount = 1; // Sitemap submitted = all URLs discovered
        fixes.push(`Submitted sitemap to Google Search Console (${allSubmitUrls.length} URLs in sitemap)`);
      } else {
        console.warn("GSC sitemap submission failed:", sitemapResult.error);
      }
    } catch (gscError) {
      console.warn("GSC API not available:", gscError);
    }

    if (indexNowCount > 0 || gscApiCount > 0) {
      fixes.push(
        `Indexing: ${indexNowCount} URLs via IndexNow + sitemap submitted to GSC`
      );
    }

    return { indexNow: indexNowCount, gscApi: gscApiCount, urls: allSubmitUrls };
  } catch (error) {
    console.error("Indexing submission failed:", error);
    return { indexNow: 0, gscApi: 0, urls: [] };
  }
}

// ============================================
// AUTO-FIX: FLAG CONTENT FOR STRENGTHENING
// ============================================

export async function flagContentForStrengthening(
  prisma: any,
  searchData: SearchPerformanceAnalysis,
  fixes: string[]
): Promise<{ expanded: number; flagged: number; posts: string[] }> {
  const expandedPosts: string[] = [];
  const flaggedPosts: string[] = [];

  // Only process top 1 per run to prevent timeout (was 3)
  for (const page of searchData.almostPage1.slice(0, 1)) {
    if (!page.slug || page.slug === "") continue;

    try {
      const post = await prisma.blogPost.findFirst({
        where: {
          slug: page.slug,
          published: true,
          
        },
        select: {
          id: true,
          slug: true,
          title_en: true,
          content_en: true,
          seo_score: true,
          keywords_json: true,
        },
      });

      if (!post) continue;

      const contentLength = (post.content_en || "").length;

      // If content is thin (<3000 chars), try to auto-expand with AI
      if (contentLength < 3000 && contentLength > 200) {
        try {
          const { generateCompletion } = await import("@/lib/ai/provider");

          const result = await generateCompletion(
            [
              {
                role: "user",
                content: `You are expanding a blog article that currently ranks at position ${page.position} in Google. It needs more depth to reach page 1.

Current title: "${post.title_en}"
Current content (${contentLength} characters):
${(post.content_en || "").slice(0, 1500)}

Expand this article to 2000+ words. Add:
- More practical details, addresses, prices, opening hours where relevant
- A FAQ section with 3-5 common questions and answers
- Expert tips and insider knowledge
- A "What Most Guides Don't Tell You" paragraph
- More subheadings (h2, h3) for better structure

Keep the existing content but enhance and expand it. Return ONLY the expanded HTML content (h2, h3, p, ul/ol tags). Do NOT include the title.`,
              },
            ],
            {
              systemPrompt:
                "You are a luxury travel content specialist writing for Arab travelers. Write detailed, helpful, SEO-optimized content. Return HTML only.",
              maxTokens: 2048,
              temperature: 0.6,
            }
          );

          const expandedContent = result.content;

          // Only apply if the expansion is significantly longer
          if (expandedContent.length > contentLength * 1.3) {
            await prisma.blogPost.update({
              where: { id: post.id },
              data: {
                content_en: expandedContent,
                seo_score: Math.min(100, (post.seo_score || 70) + 10),
              },
            });

            expandedPosts.push(post.slug);
            fixes.push(
              `AUTO-EXPANDED "${post.slug}" from ${contentLength} to ${expandedContent.length} chars (pos ${page.position})`
            );
          }
        } catch (aiError) {
          console.warn(`AI expansion failed for ${post.slug}:`, aiError);
          flaggedPosts.push(post.slug);
        }
      } else if (contentLength < 3000) {
        flaggedPosts.push(post.slug);
      }
    } catch (error) {
      console.warn(`Failed to process ${page.slug}:`, error);
    }
  }

  if (flaggedPosts.length > 0) {
    fixes.push(
      `Flagged ${flaggedPosts.length} almost-page-1 posts for manual content expansion`
    );
  }

  return {
    expanded: expandedPosts.length,
    flagged: flaggedPosts.length,
    posts: [...expandedPosts, ...flaggedPosts],
  };
}

// ============================================
// HELPERS
// ============================================

function extractSlug(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    if (pathname.includes("/blog/")) {
      return pathname.split("/blog/")[1]?.replace(/\/$/, "") || "";
    }
    return pathname.replace(/^\//, "").replace(/\/$/, "");
  } catch {
    return url;
  }
}
