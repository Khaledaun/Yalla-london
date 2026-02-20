/**
 * Master Audit API Route
 *
 * Dashboard-triggered SEO compliance audit with full data enrichment.
 * Vercel Pro allows up to 300s — we use 120s with 110s budget.
 *
 * GET  — Returns latest audit results from CronJobLog
 * POST — Runs audit with: static pages + blog articles + GA4 + GSC + indexing data
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminOrCronAuth } from "@/lib/admin-middleware";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const BUDGET_MS = 110_000;
const JOB_NAME = "master-audit";

// ---------------------------------------------------------------------------
// GET — Retrieve latest audit results
// ---------------------------------------------------------------------------

export const GET = withAdminOrCronAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");

    const siteId =
      request.nextUrl.searchParams.get("siteId") ||
      request.headers.get("x-site-id") ||
      getDefaultSiteId();

    // Get last 10 audit runs
    const recentRuns = await prisma.cronJobLog.findMany({
      where: { site_id: siteId, job_name: JOB_NAME },
      orderBy: { started_at: "desc" },
      take: 10,
    });

    // Parse the latest result
    let latestResult = null;
    if (recentRuns.length > 0 && recentRuns[0].result_summary) {
      try {
        latestResult = JSON.parse(recentRuns[0].result_summary);
      } catch {
        latestResult = { summary: recentRuns[0].result_summary };
      }
    }

    return NextResponse.json({
      success: true,
      siteId,
      latestResult,
      history: recentRuns.map((r) => ({
        id: r.id,
        status: r.status,
        startedAt: r.started_at,
        completedAt: r.completed_at,
        durationMs: r.duration_ms,
        itemsProcessed: r.items_processed,
        itemsSucceeded: r.items_succeeded,
        itemsFailed: r.items_failed,
        errorMessage: r.error_message,
      })),
    });
  } catch (error) {
    console.error("[master-audit] GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve audit results" },
      { status: 500 }
    );
  }
});

// ---------------------------------------------------------------------------
// POST — Run enriched audit
// ---------------------------------------------------------------------------

export const POST = withAdminOrCronAuth(async (request: NextRequest) => {
  const startTime = Date.now();

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId, getSiteDomain, getSiteConfig } = await import("@/config/sites");
    const { loadAuditConfig } = await import("@/lib/master-audit/config-loader");
    const { crawlBatch } = await import("@/lib/master-audit/crawler");
    const { extractSignals } = await import("@/lib/master-audit/extractor");
    const { validateHttp } = await import("@/lib/master-audit/validators/http");
    const { validateCanonical } = await import("@/lib/master-audit/validators/canonical");
    const { validateHreflang } = await import("@/lib/master-audit/validators/hreflang");
    const { validateSchema } = await import("@/lib/master-audit/validators/schema");
    const { validateLinks } = await import("@/lib/master-audit/validators/links");
    const { validateMetadata } = await import("@/lib/master-audit/validators/metadata");
    const { validateRobots } = await import("@/lib/master-audit/validators/robots");

    const body = await request.json().catch(() => ({}));
    const siteId = body.siteId || request.headers.get("x-site-id") || getDefaultSiteId();
    const rawDomain = getSiteDomain(siteId);
    // getSiteDomain() already returns full URL like "https://www.yalla-london.com"
    const baseUrl = rawDomain.startsWith("http") ? rawDomain : `https://${rawDomain}`;
    const siteConfig = getSiteConfig(siteId);

    // Load config — pass baseUrl as override so validation passes
    const config = loadAuditConfig(siteId, { baseUrl } as Partial<import("@/lib/master-audit/types").AuditConfig>);

    // -----------------------------------------------------------------------
    // Phase 1: Build URL inventory (static routes + blog articles from DB)
    // -----------------------------------------------------------------------
    const urls: string[] = [];
    const urlSources: Record<string, "static" | "blog"> = {};

    // Static routes
    for (const route of config.staticRoutes) {
      const fullUrl = `${baseUrl}${route}`;
      urls.push(fullUrl);
      urlSources[fullUrl] = "static";
    }

    // Blog articles from database + static content files
    type BlogArticleEntry = { slug: string; seo_score: number | null; title_en: string; meta_title_en: string | null; meta_description_en: string | null; published: boolean; created_at: Date };
    let blogArticles: BlogArticleEntry[] = [];
    try {
      // DB articles
      const dbArticles = await prisma.blogPost.findMany({
        where: { siteId, published: true, deletedAt: null },
        select: {
          slug: true,
          seo_score: true,
          title_en: true,
          meta_title_en: true,
          meta_description_en: true,
          published: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
        take: 200,
      });
      blogArticles.push(...dbArticles);

      // Static articles (legacy content that's live on the site and indexed by Google)
      if (siteId === "yalla-london") {
        const dbSlugs = new Set(dbArticles.map((a) => a.slug));
        try {
          const { blogPosts: staticBlogPosts } = await import("@/data/blog-content");
          const { extendedBlogPosts } = await import("@/data/blog-content-extended");
          const staticArticles: BlogArticleEntry[] = [...staticBlogPosts, ...extendedBlogPosts]
            .filter((p) => p.published && !dbSlugs.has(p.slug))
            .map((p) => ({
              slug: p.slug,
              seo_score: p.seo_score ?? null,
              title_en: p.title_en,
              meta_title_en: p.meta_title_en ?? null,
              meta_description_en: p.meta_description_en ?? null,
              published: true,
              created_at: p.created_at ?? new Date(),
            }));
          blogArticles.push(...staticArticles);
        } catch { /* static content unavailable */ }
      }

      // Only crawl the 15 newest articles — Vercel SSR can't handle 45+ concurrent renders
      const articlesToCrawl = blogArticles.slice(0, 15);
      for (const article of articlesToCrawl) {
        const articleUrl = `${baseUrl}/blog/${article.slug}`;
        if (!urls.includes(articleUrl)) {
          urls.push(articleUrl);
          urlSources[articleUrl] = "blog";
        }
      }
    } catch (err) {
      console.warn("[master-audit] Failed to fetch blog articles:", err);
    }

    // -----------------------------------------------------------------------
    // Phase 2 + 3: Parallel — data fetches + page crawling at the same time
    // -----------------------------------------------------------------------
    const remainingBudget = () => BUDGET_MS - (Date.now() - startTime);

    const quickCrawlSettings = {
      ...config.crawl,
      timeoutMs: 5000,       // 5s per page (SSR should respond within this)
      maxRetries: 1,
      concurrency: 5,        // Conservative — Vercel SSR can't handle too many concurrent renders
      rateDelayMs: 100,      // Small delay to avoid overwhelming serverless functions
    };

    // Run data fetches and page crawling concurrently
    const [dataResults, crawlResults] = await Promise.all([
      Promise.all([
        fetchGSCData(siteId, remainingBudget),
        fetchGA4Data(remainingBudget),
        fetchIndexingData(prisma, siteId),
        fetchSeoMetrics(prisma, siteId),
      ]),
      crawlBatch(urls, quickCrawlSettings),
    ]);

    const [gscData, ga4Data, indexingData, seoMetrics] = dataResults;
    const crawlMap = new Map(crawlResults.map((r) => [r.url, r]));

    // Budget check after parallel phase
    if (remainingBudget() < 3000) {
      return respondWithPartialResults(
        siteId, startTime, crawlResults, "Budget exhausted after crawling",
        { gscData, ga4Data, indexingData, seoMetrics }
      );
    }

    // -----------------------------------------------------------------------
    // Phase 4: Extract signals + validate
    // -----------------------------------------------------------------------
    const allSignals = new Map<string, Awaited<ReturnType<typeof extractSignals>>>();
    for (const result of crawlResults) {
      if (result.status === 200 && result.html) {
        try {
          const signals = extractSignals(result.html, result.finalUrl, baseUrl);
          allSignals.set(result.url, signals);
        } catch (err) {
          console.warn(`[master-audit] Signal extraction failed for ${result.url}:`, err);
        }
      }
    }

    // Run all validators
    type AuditIssue = Awaited<ReturnType<typeof validateHttp>>[number];
    const allIssues: AuditIssue[] = [];

    for (const result of crawlResults) {
      allIssues.push(...validateHttp(result, config));
    }
    for (const [url, signals] of allSignals) {
      allIssues.push(...validateCanonical(signals, url, config));
    }
    for (const [url, signals] of allSignals) {
      allIssues.push(...validateHreflang(signals, url, allSignals, config));
    }
    for (const [url, signals] of allSignals) {
      allIssues.push(...validateSchema(signals, url, config));
    }
    allIssues.push(...validateLinks(allSignals, crawlMap, config));
    for (const [url, signals] of allSignals) {
      allIssues.push(...validateMetadata(signals, url, allSignals, config));
    }
    for (const [url, signals] of allSignals) {
      allIssues.push(...validateRobots(signals, url, new Set(), config));
    }

    // -----------------------------------------------------------------------
    // Phase 5: Evaluate gates
    // -----------------------------------------------------------------------
    const hardGates = config.hardGates.map((gate) => {
      const catIssues = allIssues.filter((i) => i.category === gate.category);
      const p0Count = catIssues.filter((i) => i.severity === "P0").length;
      const totalCount = catIssues.length;
      let passed = true;
      if (p0Count > gate.maxP0) passed = false;
      if (gate.maxTotal >= 0 && totalCount > gate.maxTotal) passed = false;
      return {
        name: gate.name,
        category: gate.category,
        passed,
        p0Count,
        totalCount,
        description: gate.description,
        urls: [...new Set(catIssues.map((i) => i.url))],
      };
    });

    // Soft gates
    const softGates: Array<{ name: string; count: number; description: string }> = [];
    const thinPages = [...allSignals.entries()]
      .filter(([, s]) => s.wordCount > 0 && s.wordCount < config.riskScanners.minWordCount)
      .map(([url]) => url);
    if (thinPages.length > 0) {
      softGates.push({
        name: "thin-content",
        count: thinPages.length,
        description: `${thinPages.length} page(s) below ${config.riskScanners.minWordCount} words`,
      });
    }
    const noDescPages = [...allSignals.entries()]
      .filter(([, s]) => !s.metaDescription)
      .map(([url]) => url);
    if (noDescPages.length > 0) {
      softGates.push({
        name: "missing-meta-description",
        count: noDescPages.length,
        description: `${noDescPages.length} page(s) missing meta description`,
      });
    }
    const noSchemaPages = [...allSignals.entries()]
      .filter(([, s]) => s.jsonLd.length === 0)
      .map(([url]) => url);
    if (noSchemaPages.length > 0) {
      softGates.push({
        name: "missing-structured-data",
        count: noSchemaPages.length,
        description: `${noSchemaPages.length} page(s) without JSON-LD structured data`,
      });
    }

    // -----------------------------------------------------------------------
    // Phase 6: Build enriched response
    // -----------------------------------------------------------------------
    const p0 = allIssues.filter((i) => i.severity === "P0").length;
    const p1 = allIssues.filter((i) => i.severity === "P1").length;
    const p2 = allIssues.filter((i) => i.severity === "P2").length;
    const allPassed = hardGates.every((g) => g.passed);
    const durationMs = Date.now() - startTime;

    // Website parameters
    const responseTimesMs = crawlResults
      .filter((r) => r.timing && r.status === 200)
      .map((r) => r.timing.durationMs);
    const avgResponseMs = responseTimesMs.length > 0
      ? Math.round(responseTimesMs.reduce((a, b) => a + b, 0) / responseTimesMs.length)
      : 0;
    const slowestPage = crawlResults
      .filter((r) => r.status === 200 && r.timing)
      .sort((a, b) => b.timing.durationMs - a.timing.durationMs)[0];

    const siteParameters = {
      siteName: siteConfig?.name || siteId,
      domain: baseUrl,
      totalStaticPages: config.staticRoutes.length,
      totalPublishedArticles: blogArticles.length,
      totalUrlsAudited: urls.length,
      averageResponseMs: avgResponseMs,
      slowestPageMs: slowestPage?.timing.durationMs || 0,
      slowestPageUrl: slowestPage ? slowestPage.url.replace(baseUrl, "") : null,
      pagesWithJsonLd: [...allSignals.values()].filter((s) => s.jsonLd.length > 0).length,
      pagesWithCanonical: [...allSignals.values()].filter((s) => s.canonical).length,
      pagesWithHreflang: [...allSignals.values()].filter((s) => s.hreflangAlternates.length > 0).length,
      averageWordCount: Math.round(
        [...allSignals.values()].reduce((a, s) => a + s.wordCount, 0) / Math.max(allSignals.size, 1)
      ),
    };

    // Per-page results (enriched with source, DB SEO score, indexing status)
    const indexMap = new Map(
      (indexingData?.pages || []).map((p: { url: string }) => [p.url, p])
    );
    const blogMap = new Map(
      blogArticles.map((a) => [`/blog/${a.slug}`, a])
    );

    const pageResults = urls.map((url) => {
      const crawl = crawlMap.get(url);
      const signals = allSignals.get(url);
      const pageIssues = allIssues.filter((i) => i.url === url);
      const path = url.replace(baseUrl, "") || "/";
      const blogData = blogMap.get(path);
      const indexStatus = indexMap.get(url) || indexMap.get(path);

      return {
        url: path,
        source: urlSources[url] || "static",
        status: crawl?.status ?? 0,
        responseMs: crawl?.timing?.durationMs ?? 0,
        hasCanonical: !!signals?.canonical,
        hasHreflang: (signals?.hreflangAlternates?.length ?? 0) > 0,
        hasJsonLd: (signals?.jsonLd?.length ?? 0) > 0,
        wordCount: signals?.wordCount ?? 0,
        title: signals?.title ?? null,
        metaDescription: signals?.metaDescription ?? null,
        // DB enrichment
        seoScore: blogData?.seo_score ?? null,
        indexingStatus: (indexStatus as Record<string, unknown>)?.status ?? null,
        lastCrawled: (indexStatus as Record<string, unknown>)?.lastCrawled ?? null,
        issueCount: pageIssues.length,
        issues: pageIssues.map((i) => ({
          severity: i.severity,
          category: i.category,
          message: i.message,
        })),
      };
    });

    // SEO issues summary — grouped by category for visibility
    const issuesByCategory: Record<string, { count: number; p0: number; p1: number; p2: number; samples: string[] }> = {};
    for (const issue of allIssues) {
      if (!issuesByCategory[issue.category]) {
        issuesByCategory[issue.category] = { count: 0, p0: 0, p1: 0, p2: 0, samples: [] };
      }
      const cat = issuesByCategory[issue.category];
      cat.count++;
      if (issue.severity === "P0") cat.p0++;
      if (issue.severity === "P1") cat.p1++;
      if (issue.severity === "P2") cat.p2++;
      if (cat.samples.length < 3) {
        cat.samples.push(issue.message);
      }
    }

    // Blog metadata validation from DB (catches issues on all articles, not just crawled ones)
    const blogMetadataIssues: Array<{ slug: string; title: string; issues: string[] }> = [];
    for (const article of blogArticles) {
      const articleIssues: string[] = [];
      const metaTitle = article.meta_title_en || article.title_en || "";
      const metaDesc = article.meta_description_en || "";

      if (metaTitle.length > 60) {
        articleIssues.push(`Title too long: ${metaTitle.length} chars (max 60)`);
      }
      if (metaTitle.length > 0 && metaTitle.length < 30) {
        articleIssues.push(`Title too short: ${metaTitle.length} chars (min 30)`);
      }
      if (metaDesc.length > 160) {
        articleIssues.push(`Description too long: ${metaDesc.length} chars (max 160)`);
      }
      if (metaDesc.length > 0 && metaDesc.length < 120) {
        articleIssues.push(`Description too short: ${metaDesc.length} chars (min 120)`);
      }
      if (!metaDesc) {
        articleIssues.push("Missing meta description");
      }

      if (articleIssues.length > 0) {
        blogMetadataIssues.push({
          slug: article.slug,
          title: metaTitle.slice(0, 60),
          issues: articleIssues,
        });
      }
    }

    const result = {
      success: true,
      siteId,
      baseUrl,
      mode: "quick",
      durationMs,

      // Website parameters
      siteParameters,

      // Crawl summary
      totalUrls: urls.length,
      crawledOk: crawlResults.filter((r) => r.status === 200).length,
      crawledFailed: crawlResults.filter((r) => r.status !== 200).length,
      signalsExtracted: allSignals.size,

      // Issues
      issues: { total: allIssues.length, p0, p1, p2 },
      issuesByCategory,
      hardGates,
      softGates,
      allPassed,

      // GA4 data
      ga4: ga4Data,

      // GSC data
      gsc: gscData,

      // Indexing data
      indexing: indexingData,

      // DB SEO metrics
      seoMetrics,

      // Per-page results
      pages: pageResults,

      // Blog metadata from DB (validates all articles without crawling)
      blogMetadataIssues,
    };

    // Save to CronJobLog
    try {
      await prisma.cronJobLog.create({
        data: {
          site_id: siteId,
          job_name: JOB_NAME,
          status: allPassed ? "success" : "warning",
          started_at: new Date(startTime),
          completed_at: new Date(),
          duration_ms: durationMs,
          items_processed: urls.length,
          items_succeeded: crawlResults.filter((r) => r.status === 200).length,
          items_failed: crawlResults.filter((r) => r.status !== 200).length,
          result_summary: JSON.stringify({
            mode: "quick",
            totalUrls: urls.length,
            issues: { total: allIssues.length, p0, p1, p2 },
            allPassed,
            hardGates: hardGates.map((g) => ({
              name: g.name,
              passed: g.passed,
              p0Count: g.p0Count,
              totalCount: g.totalCount,
            })),
            softGates,
            siteParameters: {
              totalPublishedArticles: blogArticles.length,
              averageResponseMs: avgResponseMs,
              averageWordCount: siteParameters.averageWordCount,
            },
            ga4Configured: ga4Data.configured,
            gscConfigured: gscData.configured,
            indexedCount: indexingData?.indexed ?? 0,
          }),
          error_message: allPassed
            ? null
            : `${p0} P0, ${p1} P1, ${p2} P2 issues found`,
        },
      });
    } catch (err) {
      console.warn("[master-audit] Failed to save to CronJobLog:", err);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[master-audit] POST error:", error);

    // Try to log failure
    try {
      const { prisma } = await import("@/lib/db");
      const { getDefaultSiteId } = await import("@/config/sites");
      await prisma.cronJobLog.create({
        data: {
          site_id: getDefaultSiteId(),
          job_name: JOB_NAME,
          status: "error",
          started_at: new Date(startTime),
          completed_at: new Date(),
          duration_ms: Date.now() - startTime,
          items_processed: 0,
          items_succeeded: 0,
          items_failed: 0,
          error_message: "Audit failed unexpectedly",
        },
      });
    } catch {
      // Can't even log
    }

    return NextResponse.json(
      { error: "Audit failed" },
      { status: 500 }
    );
  }
});

// ---------------------------------------------------------------------------
// Data fetchers — run in parallel with crawling
// ---------------------------------------------------------------------------

async function fetchGSCData(siteId: string, remainingBudget: () => number) {
  try {
    if (remainingBudget() < 5000) return { configured: false, reason: "budget" };

    const { GoogleSearchConsole } = await import("@/lib/integrations/google-search-console");
    const gsc = new GoogleSearchConsole();

    if (!gsc.isConfigured()) {
      return { configured: false, reason: "missing_credentials" };
    }

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split("T")[0];
    const endDate = today.toISOString().split("T")[0];

    // Fetch top pages and keywords in parallel
    const [topPages, topKeywords, sitemaps] = await Promise.all([
      gsc.getTopPages(startDate, endDate, 20).catch(() => []),
      gsc.getTopKeywords(startDate, endDate, 20).catch(() => []),
      gsc.getSitemaps().catch(() => []),
    ]);

    // Calculate totals
    let totalClicks = 0;
    let totalImpressions = 0;
    for (const page of topPages) {
      totalClicks += page.clicks;
      totalImpressions += page.impressions;
    }
    const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgPosition = topPages.length > 0
      ? topPages.reduce((a, p) => a + p.position, 0) / topPages.length
      : 0;

    return {
      configured: true,
      dateRange: { start: startDate, end: endDate },
      totalClicks,
      totalImpressions,
      averageCtr: Math.round(averageCtr * 100) / 100,
      averagePosition: Math.round(avgPosition * 10) / 10,
      topPages: topPages.slice(0, 10).map((p) => ({
        page: p.keys[0] || "",
        clicks: p.clicks,
        impressions: p.impressions,
        ctr: Math.round(p.ctr * 10000) / 100,
        position: Math.round(p.position * 10) / 10,
      })),
      topKeywords: topKeywords.slice(0, 10).map((k) => ({
        keyword: k.keys[0] || "",
        clicks: k.clicks,
        impressions: k.impressions,
        ctr: Math.round(k.ctr * 10000) / 100,
        position: Math.round(k.position * 10) / 10,
      })),
      sitemaps: sitemaps.map((s) => ({
        path: s.path,
        lastSubmitted: s.lastSubmitted || null,
        errors: s.errors || 0,
        warnings: s.warnings || 0,
      })),
    };
  } catch (err) {
    console.warn("[master-audit] GSC fetch error:", err);
    return { configured: false, reason: "error", error: "GSC data fetch failed" };
  }
}

async function fetchGA4Data(remainingBudget: () => number) {
  try {
    if (remainingBudget() < 5000) return { configured: false, reason: "budget" };

    const { isGA4Configured, fetchGA4Metrics } = await import("@/lib/seo/ga4-data-api");

    if (!isGA4Configured()) {
      return { configured: false, reason: "missing_credentials" };
    }

    const report = await fetchGA4Metrics("30daysAgo", "today");
    if (!report) {
      return { configured: true, reason: "no_data", error: "GA4 returned no data" };
    }

    return {
      configured: true,
      dateRange: report.dateRange,
      metrics: {
        sessions: report.metrics.sessions,
        totalUsers: report.metrics.totalUsers,
        newUsers: report.metrics.newUsers,
        pageViews: report.metrics.pageViews,
        bounceRate: Math.round(report.metrics.bounceRate * 100) / 100,
        avgSessionDuration: Math.round(report.metrics.avgSessionDuration),
        engagementRate: Math.round(report.metrics.engagementRate * 100) / 100,
      },
      topPages: report.topPages.slice(0, 10).map((p) => ({
        path: p.path,
        pageViews: p.pageViews,
        sessions: p.sessions,
      })),
      topSources: report.topSources.slice(0, 10),
    };
  } catch (err) {
    console.warn("[master-audit] GA4 fetch error:", err);
    return { configured: false, reason: "error", error: "GA4 data fetch failed" };
  }
}

// Use actual Prisma client type from imports
type PrismaInstance = Awaited<typeof import("@/lib/db")>["prisma"];

async function fetchIndexingData(prisma: PrismaInstance, siteId: string) {
  try {
    // Get all indexing statuses
    const statuses = await prisma.uRLIndexingStatus.findMany({
      where: { site_id: siteId },
      select: {
        url: true,
        status: true,
        coverage_state: true,
        indexing_state: true,
        submitted_indexnow: true,
        submitted_google_api: true,
        submitted_sitemap: true,
        last_submitted_at: true,
        last_crawled_at: true,
        last_error: true,
      },
      take: 300,
    });

    // Count by status
    const indexed = statuses.filter((s) => s.status === "indexed").length;
    const submitted = statuses.filter((s) => s.status === "submitted").length;
    const discovered = statuses.filter((s) => s.status === "discovered").length;
    const notIndexed = statuses.filter((s) => s.status === "not_indexed" || s.status === "deindexed").length;
    const errors = statuses.filter((s) => s.status === "error").length;

    // Submission methods
    const submittedIndexNow = statuses.filter((s) => s.submitted_indexnow).length;
    const submittedGoogleApi = statuses.filter((s) => s.submitted_google_api).length;
    const submittedSitemap = statuses.filter((s) => s.submitted_sitemap).length;

    return {
      totalTracked: statuses.length,
      indexed,
      submitted,
      discovered,
      notIndexed,
      errors,
      submissionMethods: {
        indexNow: submittedIndexNow,
        googleApi: submittedGoogleApi,
        sitemap: submittedSitemap,
      },
      pages: statuses.map((s) => ({
        url: s.url,
        status: s.status,
        coverageState: s.coverage_state,
        lastSubmitted: s.last_submitted_at,
        lastCrawled: s.last_crawled_at,
        error: s.last_error,
      })),
    };
  } catch (err) {
    console.warn("[master-audit] Indexing data fetch error:", err);
    return {
      totalTracked: 0,
      indexed: 0,
      submitted: 0,
      discovered: 0,
      notIndexed: 0,
      errors: 0,
      submissionMethods: { indexNow: 0, googleApi: 0, sitemap: 0 },
      pages: [],
    };
  }
}

async function fetchSeoMetrics(prisma: PrismaInstance, siteId: string) {
  try {
    // Blog post SEO scores (DB)
    const dbPosts = await prisma.blogPost.findMany({
      where: { siteId, published: true, deletedAt: null },
      select: { slug: true, seo_score: true, page_type: true },
      take: 300,
    });

    // Include static articles for accurate metrics
    type MetricEntry = { slug: string; seo_score: number | null; page_type: string | null };
    const allPosts: MetricEntry[] = [...dbPosts];
    if (siteId === "yalla-london") {
      const dbSlugs = new Set(dbPosts.map((p) => p.slug));
      try {
        const { blogPosts: staticBlogPosts } = await import("@/data/blog-content");
        const { extendedBlogPosts } = await import("@/data/blog-content-extended");
        const staticEntries: MetricEntry[] = [...staticBlogPosts, ...extendedBlogPosts]
          .filter((p) => p.published && !dbSlugs.has(p.slug))
          .map((p) => ({ slug: p.slug, seo_score: p.seo_score ?? null, page_type: p.page_type ?? null }));
        allPosts.push(...staticEntries);
      } catch { /* static content unavailable */ }
    }

    const scores = allPosts.filter((p) => p.seo_score !== null).map((p) => p.seo_score as number);
    const avgSeoScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    const belowThreshold = scores.filter((s) => s < 70).length;
    const above80 = scores.filter((s) => s >= 80).length;

    // Page type breakdown
    const pageTypes: Record<string, number> = {};
    for (const p of allPosts) {
      const type = (p.page_type as string) || "unknown";
      pageTypes[type] = (pageTypes[type] || 0) + 1;
    }

    // Total content counts (DB for drafts, allPosts for published)
    const totalPublished = allPosts.length;
    const totalDrafts = await prisma.blogPost.count({
      where: { siteId, published: false, deletedAt: null },
    });

    return {
      totalPublished,
      totalDrafts,
      averageSeoScore: avgSeoScore,
      articlesBelow70: belowThreshold,
      articlesAbove80: above80,
      totalWithScore: scores.length,
      pageTypeBreakdown: pageTypes,
    };
  } catch (err) {
    console.warn("[master-audit] SEO metrics fetch error:", err);
    return {
      totalPublished: 0,
      totalDrafts: 0,
      averageSeoScore: 0,
      articlesBelow70: 0,
      articlesAbove80: 0,
      totalWithScore: 0,
      pageTypeBreakdown: {},
    };
  }
}

// ---------------------------------------------------------------------------
// Helper: respond with partial results when budget is hit
// ---------------------------------------------------------------------------

async function respondWithPartialResults(
  siteId: string,
  startTime: number,
  crawlResults: Array<{ status: number; url: string }>,
  reason: string,
  enrichment?: {
    gscData?: Record<string, unknown>;
    ga4Data?: Record<string, unknown>;
    indexingData?: Record<string, unknown>;
    seoMetrics?: Record<string, unknown>;
  }
) {
  const durationMs = Date.now() - startTime;

  try {
    const { prisma } = await import("@/lib/db");
    await prisma.cronJobLog.create({
      data: {
        site_id: siteId,
        job_name: JOB_NAME,
        status: "partial",
        started_at: new Date(startTime),
        completed_at: new Date(),
        duration_ms: durationMs,
        items_processed: crawlResults.length,
        items_succeeded: crawlResults.filter((r) => r.status === 200).length,
        items_failed: crawlResults.filter((r) => r.status !== 200).length,
        error_message: reason,
      },
    });
  } catch {
    // Silent — can't log
  }

  return NextResponse.json({
    success: true,
    partial: true,
    reason,
    siteId,
    durationMs,
    totalUrls: crawlResults.length,
    crawledOk: crawlResults.filter((r) => r.status === 200).length,
    issues: { total: 0, p0: 0, p1: 0, p2: 0 },
    hardGates: [],
    softGates: [],
    // Still include enrichment data even if crawl was partial
    ga4: enrichment?.ga4Data || { configured: false },
    gsc: enrichment?.gscData || { configured: false },
    indexing: enrichment?.indexingData || null,
    seoMetrics: enrichment?.seoMetrics || null,
  });
}
