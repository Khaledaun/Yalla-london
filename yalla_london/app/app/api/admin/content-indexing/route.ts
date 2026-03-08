export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { logManualAction } from "@/lib/action-logger";
import {
  resolvePageStatus,
  computeNotIndexedReasons,
  extractInspectionDetails,
  type PageIndexingStatus,
} from "@/lib/seo/indexing-summary";

/**
 * Content Indexing Tab API
 *
 * GET  — Returns all published articles with their indexing status,
 *        diagnostic reasons for non-indexing, and system-level indexing issues.
 * POST — Submit specific articles for indexing or trigger fixes.
 *
 * Status resolution uses resolvePageStatus() from indexing-summary.ts —
 * the single source of truth for mapping DB records → UI status.
 */

interface ArticleIndexingInfo {
  id: string;
  title: string;
  slug: string;
  url: string;
  publishedAt: string | null;
  seoScore: number;
  wordCount: number;
  // Indexing status — uses PageIndexingStatus from shared module
  indexingStatus: PageIndexingStatus;
  // Diagnostic info
  submittedAt: string | null;
  lastCrawledAt: string | null;
  lastInspectedAt: string | null;
  coverageState: string | null;
  submittedIndexnow: boolean;
  submittedSitemap: boolean;
  submittedGoogleApi: boolean;
  submissionAttempts: number;
  // Content type (for dashboard badge)
  contentType: "blog" | "news" | "event" | "yacht" | "destination" | "itinerary" | "static" | "info";
  // Why not indexed
  notIndexedReasons: string[];
  // Suggested fix
  fixAction: string | null;
  // GSC performance (from GscPagePerformance table)
  gscClicks: number | null;
  gscImpressions: number | null;
  gscCtr: number | null;
  gscPosition: number | null;
  // GSC Inspection details — uses shared InspectionDetails from indexing-summary.ts
  inspection?: {
    verdict: string | null;
    robotsTxtState: string | null;
    indexingAllowed: string | null;
    crawlAllowed: string | null;
    pageFetchState: string | null;
    crawledAs: string | null;
    userCanonical: string | null;
    googleCanonical: string | null;
    canonicalMismatch: boolean;
    mobileUsabilityVerdict: string | null;
    richResultsVerdict: string | null;
    referringUrlCount: number;
    sitemapCount: number;
  };
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { getDefaultSiteId } = await import("@/config/sites");
  const siteId =
    request.nextUrl.searchParams.get("siteId") ||
    request.headers.get("x-site-id") ||
    getDefaultSiteId();

  try {
    const { prisma } = await import("@/lib/db");
    const { searchConsole } = await import(
      "@/lib/integrations/google-search-console"
    );
    const { getSiteConfig, getSiteDomain } = await import("@/config/sites");

    const siteConfig = getSiteConfig(siteId);
    // CRITICAL: Always use getSiteDomain() — returns "https://www.{domain}"
    // siteConfig.domain is bare ("yalla-london.com") and must NOT be used for URLs
    const baseUrl = getSiteDomain(siteId);
    let thinContentThreshold = 300;
    let targetWordCount = 1200;
    let lowSeoScoreThreshold = 50;
    try {
      const { CONTENT_QUALITY } = await import("@/lib/seo/standards");
      thinContentThreshold = CONTENT_QUALITY.thinContentThreshold;
      targetWordCount = CONTENT_QUALITY.targetWords;
      lowSeoScoreThreshold = Math.round(CONTENT_QUALITY.qualityGateScore * 0.7);
    } catch { /* use fallbacks */ }

    // 1. Get all published blog posts (DB + static content)
    const dbPosts = await prisma.blogPost.findMany({
      where: {
        published: true,
        siteId: siteId,
        deletedAt: null,
      },
      select: {
        id: true,
        title_en: true,
        title_ar: true,
        slug: true,
        seo_score: true,
        content_en: true,
        created_at: true,
        updated_at: true,
        meta_title_en: true,
        meta_description_en: true,
        keywords_json: true,
      },
      orderBy: { created_at: "desc" },
    });

    // Also include static blog articles (legacy content that's live and indexed by Google)
    const dbSlugs = new Set(dbPosts.map((p) => p.slug));
    let staticPosts: typeof dbPosts = [];
    if (siteId === "yalla-london") {
      try {
        const { blogPosts: staticBlogPosts } = await import("@/data/blog-content");
        const { extendedBlogPosts } = await import("@/data/blog-content-extended");
        const allStatic = [...staticBlogPosts, ...extendedBlogPosts].filter(
          (p) => p.published && !dbSlugs.has(p.slug)
        );
        staticPosts = allStatic.map((p) => ({
          id: p.id,
          title_en: p.title_en,
          title_ar: p.title_ar,
          slug: p.slug,
          seo_score: p.seo_score ?? null,
          content_en: p.content_en,
          created_at: p.created_at ?? new Date(),
          updated_at: p.updated_at ?? new Date(),
          meta_title_en: p.meta_title_en ?? null,
          meta_description_en: p.meta_description_en ?? null,
          keywords_json: p.keywords ? JSON.stringify(p.keywords) : null,
        }));
      } catch (err) {
        console.warn("[content-indexing] Failed to load static articles:", err);
      }
    }
    const posts = [...dbPosts, ...staticPosts];

    // 1b. For yacht sites — also pull Yacht, YachtDestination, CharterItinerary pages
    const { isYachtSite } = await import("@/config/sites");
    const isYacht = isYachtSite(siteId);
    type YachtPage = { id: string; title: string; slug: string; urlPrefix: string; updatedAt: Date | null };
    let yachtPages: YachtPage[] = [];
    if (isYacht) {
      try {
        const [yachts, destinations, itineraries] = await Promise.allSettled([
          prisma.yacht.findMany({
            where: { siteId, status: "active" },
            select: { id: true, name: true, slug: true, updatedAt: true },
            orderBy: { updatedAt: "desc" },
            take: 200,
          }),
          prisma.yachtDestination.findMany({
            where: { siteId, status: "active" },
            select: { id: true, name_en: true, slug: true, updatedAt: true },
            orderBy: { updatedAt: "desc" },
            take: 100,
          }),
          prisma.charterItinerary.findMany({
            where: { siteId, status: "active" },
            select: { id: true, title_en: true, slug: true, updatedAt: true },
            orderBy: { updatedAt: "desc" },
            take: 100,
          }),
        ]);
        if (yachts.status === "fulfilled") {
          for (const y of yachts.value) yachtPages.push({ id: y.id, title: y.name, slug: y.slug, urlPrefix: "yachts", updatedAt: y.updatedAt });
        }
        if (destinations.status === "fulfilled") {
          for (const d of destinations.value) yachtPages.push({ id: d.id, title: d.name_en, slug: d.slug, urlPrefix: "destinations", updatedAt: d.updatedAt });
        }
        if (itineraries.status === "fulfilled") {
          for (const it of itineraries.value) yachtPages.push({ id: it.id, title: it.title_en, slug: it.slug, urlPrefix: "itineraries", updatedAt: it.updatedAt });
        }
      } catch (err) {
        console.warn("[content-indexing] Failed to load yacht pages:", err);
      }
    }

    // 2. Get indexing status for all article URLs
    //    Match by BOTH exact URL and slug to handle URL format mismatches
    //    (e.g., www vs non-www, http vs https, trailing slash differences)
    const articleSlugs = posts.map((p) => p.slug);
    const articleUrls = posts.map((p) => `${baseUrl}/blog/${p.slug}`);
    // Also include yacht page URLs in lookup
    const yachtPageSlugs = yachtPages.map((y) => `${y.urlPrefix}/${y.slug}`);
    const yachtPageUrls = yachtPages.map((y) => `${baseUrl}/${y.urlPrefix}/${y.slug}`);
    // Also include news page URLs in lookup (pre-fetch slugs for the query)
    let newsPageSlugs: string[] = [];
    let newsPageUrls: string[] = [];
    if (!isYacht) {
      try {
        const newsForLookup = await prisma.newsItem.findMany({
          where: { siteId, status: "published", OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }] },
          select: { slug: true },
          take: 100,
        });
        newsPageSlugs = newsForLookup.map((n) => `news/${n.slug}`);
        newsPageUrls = newsForLookup.map((n) => `${baseUrl}/news/${n.slug}`);
      } catch { /* will be handled later */ }
    }
    let indexingRecords: Record<string, any> = {};
    try {
      const records = await prisma.uRLIndexingStatus.findMany({
        where: {
          site_id: siteId,
          OR: [
            { url: { in: [...articleUrls, ...yachtPageUrls, ...newsPageUrls] } },
            { slug: { in: [...articleSlugs, ...yachtPageSlugs, ...newsPageSlugs] } },
          ],
        },
      });
      // Index by slug for resilient matching (URL format may vary)
      for (const r of records) {
        // Try to extract slug from URL: works for /blog/x, /yachts/x, /destinations/x, /itineraries/x
        const urlParts = r.url.split("/");
        const slugFromUrl = urlParts.slice(-2).join("/"); // "urlPrefix/slug"
        const slug = r.slug || slugFromUrl || null;
        if (slug) {
          const existing = indexingRecords[slug];
          if (!existing || (r.last_submitted_at && (!existing.last_submitted_at || r.last_submitted_at > existing.last_submitted_at))) {
            indexingRecords[slug] = r;
          }
        }
      }
    } catch {
      // Table may not exist yet
    }

    // 3. Check environment configuration
    const hasIndexNowKey = !!process.env.INDEXNOW_KEY;
    const hasGscCredentials = searchConsole.isConfigured();
    const gscSiteUrl = process.env.GSC_SITE_URL || "";

    // 4. Build per-article indexing info with diagnostics
    const articles: ArticleIndexingInfo[] = posts.map((post) => {
      const url = `${baseUrl}/blog/${post.slug}`;
      const record = indexingRecords[post.slug];
      const wordCount = post.content_en
        ? post.content_en.split(/\s+/).filter(Boolean).length
        : 0;

      // Determine indexing status — uses shared resolvePageStatus()
      const indexingStatus = resolvePageStatus(record);

      // Build reasons — uses shared computeNotIndexedReasons() + endpoint-specific deep inspection
      const reasons: string[] = computeNotIndexedReasons(indexingStatus, record, { hasIndexNowKey, hasGscCredentials });

      if (indexingStatus === "not_indexed") {
        // Inspection-level issues — extract from stored inspection_result JSON
        const inspectionResult = record?.inspection_result as unknown as Record<string, any> | null;
        if (inspectionResult) {
          // Verdict — Google's primary reason for not indexing
          if (inspectionResult.verdict && inspectionResult.verdict !== "PASS" && inspectionResult.verdict !== "NEUTRAL") {
            reasons.push(`Google verdict: ${inspectionResult.verdict}`);
          }
          // Robots.txt state
          if (inspectionResult.robotsTxtState === "DISALLOWED") {
            reasons.push("robots.txt is blocking Google from crawling this URL");
          }
          // Page fetch state
          if (inspectionResult.pageFetchState && inspectionResult.pageFetchState !== "SUCCESSFUL") {
            reasons.push(`Page fetch failed: ${inspectionResult.pageFetchState} — Google couldn't load the page`);
          }
          // Crawl info
          if (inspectionResult.crawledAs) {
            reasons.push(`Crawled as: ${inspectionResult.crawledAs}`);
          }
          // Canonical mismatch
          if (inspectionResult.userCanonical && inspectionResult.googleCanonical &&
              inspectionResult.userCanonical !== inspectionResult.googleCanonical) {
            reasons.push(`Canonical mismatch — Your canonical: ${inspectionResult.userCanonical}, Google selected: ${inspectionResult.googleCanonical}`);
          }
          // Indexing/crawl permissions
          if (inspectionResult.indexingAllowed === "DISALLOWED") {
            reasons.push("Indexing not allowed — page may have a noindex meta tag or X-Robots-Tag header");
          }
          if (inspectionResult.crawlAllowed === "DISALLOWED") {
            reasons.push("Crawling not allowed — robots.txt or robots meta tag is blocking crawl");
          }
          // Mobile usability
          if (inspectionResult.mobileUsabilityVerdict && inspectionResult.mobileUsabilityVerdict !== "PASS") {
            reasons.push(`Mobile usability: ${inspectionResult.mobileUsabilityVerdict}`);
          }
          if (inspectionResult.mobileUsabilityIssues && Array.isArray(inspectionResult.mobileUsabilityIssues)) {
            for (const issue of inspectionResult.mobileUsabilityIssues) {
              reasons.push(`Mobile issue: ${issue}`);
            }
          }
          // Rich results
          if (inspectionResult.richResultsVerdict && inspectionResult.richResultsVerdict !== "PASS") {
            reasons.push(`Rich results: ${inspectionResult.richResultsVerdict}`);
          }
          if (inspectionResult.richResultsItems && Array.isArray(inspectionResult.richResultsItems)) {
            for (const item of inspectionResult.richResultsItems) {
              if (item.issues && item.issues.length > 0) {
                reasons.push(`Rich result "${item.type}" has issues: ${item.issues.join(", ")}`);
              }
            }
          }
          // Generic issues array
          if (inspectionResult.issues && Array.isArray(inspectionResult.issues)) {
            for (const issue of inspectionResult.issues) {
              reasons.push(`GSC issue: ${issue}`);
            }
          }
          // Referring URLs (useful context)
          if (inspectionResult.referringUrls && Array.isArray(inspectionResult.referringUrls) && inspectionResult.referringUrls.length > 0) {
            reasons.push(`Google found ${inspectionResult.referringUrls.length} referring URL(s)`);
          }
          // Raw result for deep inspection
          if (inspectionResult.rawResult) {
            const raw = inspectionResult.rawResult as unknown as Record<string, any>;
            const indexStatusResult = raw.indexStatusResult || {};
            // Extract any additional details from raw API response
            if (indexStatusResult.sitemap && Array.isArray(indexStatusResult.sitemap)) {
              reasons.push(`Found in ${indexStatusResult.sitemap.length} sitemap(s)`);
            }
          }
        }
      }

      // SEO quality issues — only surface as "reasons" for non-indexed articles.
      // For indexed articles these become improvement notes, not blockers.
      // Showing word count warnings as "not indexed reasons" on an already-indexed
      // article is a direct contradiction and confuses the dashboard owner.
      if (indexingStatus !== "indexed") {
        if (wordCount < thinContentThreshold) {
          reasons.push(`Very thin content (${wordCount} words) — Google rarely indexes pages under ${thinContentThreshold} words`);
        } else if (wordCount < targetWordCount) {
          reasons.push(`Content below target length (${wordCount}/${targetWordCount.toLocaleString()} words) — may affect indexing priority`);
        }
        if ((post.seo_score || 0) < lowSeoScoreThreshold) {
          reasons.push(`Low SEO score (${post.seo_score || 0}/100) — improve meta tags, headings, and content structure`);
        }
        if (!post.meta_title_en) {
          reasons.push("Missing meta title — critical for SEO");
        }
        if (!post.meta_description_en) {
          reasons.push("Missing meta description — important for click-through rate");
        }
      }

      // GSC performance data is enriched later in section 4d from GscPagePerformance table.
      // inspection_result does NOT contain clicks/impressions — those come from Search Analytics API.

      return {
        id: post.id,
        title: post.title_en || post.title_ar || "(Untitled)",
        slug: post.slug,
        url: `/blog/${post.slug}`,
        publishedAt: post.created_at?.toISOString() || null,
        seoScore: post.seo_score || 0,
        wordCount,
        indexingStatus,
        submittedAt: record?.last_submitted_at?.toISOString() || null,
        lastCrawledAt: record?.last_crawled_at?.toISOString() || null,
        lastInspectedAt: record?.last_inspected_at?.toISOString() || null,
        coverageState: record?.coverage_state || null,
        submittedIndexnow: record?.submitted_indexnow || false,
        submittedSitemap: record?.submitted_sitemap || false,
        submittedGoogleApi: record?.submitted_google_api || false,
        submissionAttempts: record?.submission_attempts || 0,
        contentType: "blog" as const,
        notIndexedReasons: reasons,
        fixAction: null,
        gscClicks: null,
        gscImpressions: null,
        gscCtr: null,
        gscPosition: null,
        inspection: extractInspectionDetails(record?.inspection_result),
      };
    });

    // 4b. Append yacht pages to articles array for yacht sites
    if (isYacht && yachtPages.length > 0) {
      for (const yp of yachtPages) {
        const compositeSlug = `${yp.urlPrefix}/${yp.slug}`;
        const record = indexingRecords[compositeSlug] || indexingRecords[yp.slug];
        const indexingStatus = resolvePageStatus(record);
        const yachtContentType = yp.urlPrefix === "yachts" ? "yacht" as const
          : yp.urlPrefix === "destinations" ? "destination" as const
          : "itinerary" as const;
        articles.push({
          id: yp.id,
          title: yp.title,
          slug: compositeSlug,
          url: `/${yp.urlPrefix}/${yp.slug}`,
          publishedAt: yp.updatedAt?.toISOString() || null,
          seoScore: 0,
          wordCount: 0,
          indexingStatus,
          submittedAt: record?.last_submitted_at?.toISOString() || null,
          lastCrawledAt: record?.last_crawled_at?.toISOString() || null,
          lastInspectedAt: record?.last_inspected_at?.toISOString() || null,
          coverageState: record?.coverage_state || null,
          submittedIndexnow: record?.submitted_indexnow || false,
          submittedSitemap: record?.submitted_sitemap || false,
          submittedGoogleApi: record?.submitted_google_api || false,
          submissionAttempts: record?.submission_attempts || 0,
          contentType: yachtContentType,
          notIndexedReasons: computeNotIndexedReasons(indexingStatus, record, { hasIndexNowKey, hasGscCredentials }),
          fixAction: null,
          gscClicks: null,
          gscImpressions: null,
          gscCtr: null,
          gscPosition: null,
          inspection: extractInspectionDetails(record?.inspection_result),
        });
      }
    }

    // 4c. Append published news items for non-yacht sites
    if (!isYacht) {
      try {
        const newsItems = await prisma.newsItem.findMany({
          where: {
            siteId,
            status: "published",
            OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
          },
          select: {
            id: true,
            headline_en: true,
            slug: true,
            summary_en: true,
            meta_title_en: true,
            meta_description_en: true,
            published_at: true,
          },
          orderBy: { published_at: "desc" },
          take: 100,
        });
        for (const newsItem of newsItems) {
          const newsSlug = `news/${newsItem.slug}`;
          const record = indexingRecords[newsSlug] || indexingRecords[newsItem.slug];
          const indexingStatus = resolvePageStatus(record);
          const wordCount = newsItem.summary_en ? newsItem.summary_en.split(/\s+/).filter(Boolean).length : 0;
          articles.push({
            id: newsItem.id,
            title: newsItem.headline_en || "(Untitled News)",
            slug: newsSlug,
            url: `/news/${newsItem.slug}`,
            publishedAt: newsItem.published_at?.toISOString() || null,
            seoScore: 0,
            wordCount,
            indexingStatus,
            submittedAt: record?.last_submitted_at?.toISOString() || null,
            lastCrawledAt: record?.last_crawled_at?.toISOString() || null,
            lastInspectedAt: record?.last_inspected_at?.toISOString() || null,
            coverageState: record?.coverage_state || null,
            submittedIndexnow: record?.submitted_indexnow || false,
            submittedSitemap: record?.submitted_sitemap || false,
            submittedGoogleApi: record?.submitted_google_api || false,
            submissionAttempts: record?.submission_attempts || 0,
            contentType: "news" as const,
            notIndexedReasons: computeNotIndexedReasons(indexingStatus, record, { hasIndexNowKey, hasGscCredentials }),
            fixAction: null,
            gscClicks: null,
            gscImpressions: null,
            gscCtr: null,
            gscPosition: null,
            inspection: extractInspectionDetails(record?.inspection_result),
          });
        }
      } catch (err) {
        console.warn("[content-indexing] Failed to load news items:", err instanceof Error ? err.message : err);
      }
    }

    // 4d. Enrich articles with REAL GSC performance data from GscPagePerformance table.
    //     The URL Inspection API (inspection_result) does NOT contain performance data —
    //     clicks/impressions come from the GSC Search Analytics API, synced by gsc-sync cron.
    try {
      const { getPagePerformance, getPageTrends } = await import("@/lib/seo/gsc-trend-analysis");
      const articleFullUrls = articles.map((a) => `${baseUrl}${a.url}`);
      const [perfMap, trendMap] = await Promise.all([
        getPagePerformance(siteId, articleFullUrls),
        getPageTrends(siteId, articleFullUrls),
      ]);
      for (const article of articles) {
        const fullUrl = `${baseUrl}${article.url}`;
        const perf = perfMap.get(fullUrl);
        const trend = trendMap.get(fullUrl);
        if (perf) {
          article.gscClicks = perf.clicks;
          article.gscImpressions = perf.impressions;
          article.gscCtr = perf.ctr;
          article.gscPosition = perf.position;
        }
        // Attach trend data as extra fields (won't break existing interface — added to response)
        (article as unknown as Record<string, unknown>).gscClicksTrend = trend?.clicksChangePercent ?? null;
        (article as unknown as Record<string, unknown>).gscImpressionsTrend = trend?.impressionsChangePercent ?? null;
      }
    } catch (err) {
      console.warn("[content-indexing] Failed to enrich with GSC performance data:", err instanceof Error ? err.message : String(err));
    }

    // 5. Summary counts — use shared utility for aggregate numbers
    //    This ensures cockpit and this endpoint show IDENTICAL summary counts.
    const { getIndexingSummary } = await import("@/lib/seo/indexing-summary");
    const sharedSummary = await getIndexingSummary(siteId);

    // Use shared summary for all counts (single source of truth)
    const indexed = sharedSummary.indexed;
    const submitted = sharedSummary.submitted;
    const discovered = sharedSummary.discovered;
    const notIndexed = sharedSummary.deindexed + (sharedSummary.chronicFailures ?? 0);
    const neverSubmitted = sharedSummary.neverSubmitted;
    const errors = sharedSummary.errors;

    // 6. System-level indexing issues (from cron logs, config, GA4)
    const systemIssues: Array<{
      severity: "critical" | "warning" | "info";
      category: string;
      message: string;
      detail: string;
      fixAction?: string;
    }> = [];

    // Check configuration issues
    if (!hasIndexNowKey) {
      systemIssues.push({
        severity: "critical",
        category: "Configuration",
        message: "INDEXNOW_KEY not configured",
        detail: "Without an IndexNow key, articles cannot be submitted to Bing, Yandex, or other IndexNow-supporting search engines. This is the fastest way to get new content discovered.",
        fixAction: "Set the INDEXNOW_KEY environment variable in Vercel project settings",
      });
    }
    if (!hasGscCredentials) {
      systemIssues.push({
        severity: "critical",
        category: "Configuration",
        message: "Google Search Console not configured",
        detail: "Without GSC credentials, the system cannot submit sitemaps to Google, check indexing status, or verify which pages are indexed. This is essential for Google indexing.",
        fixAction: "Set GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL and GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY in Vercel project settings",
      });
    }
    if (!gscSiteUrl && hasGscCredentials) {
      systemIssues.push({
        severity: "warning",
        category: "Configuration",
        message: "GSC_SITE_URL not explicitly set",
        detail: "The GSC site URL must match exactly what's registered in Google Search Console (e.g., 'sc-domain:yoursite.com' or 'https://yoursite.com'). Set GSC_SITE_URL env var explicitly.",
        fixAction: "Set GSC_SITE_URL to match your Google Search Console property exactly",
      });
    }

    // Check cron job health
    try {
      const recentCronLogs = await prisma.cronJobLog.findMany({
        where: {
          job_name: { in: ["google-indexing", "seo-agent", "verify-indexing"] },
        },
        orderBy: { started_at: "desc" },
        take: 30,
      });

      // Check if indexing crons have run recently
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;

      const lastGoogleIndexing = recentCronLogs.find((l) => l.job_name === "google-indexing");
      const lastSeoAgent = recentCronLogs.find((l) => l.job_name === "seo-agent");
      const lastVerifyIndexing = recentCronLogs.find((l) => l.job_name === "verify-indexing");

      if (!lastGoogleIndexing || now - new Date(lastGoogleIndexing.started_at).getTime() > oneDayMs * 2) {
        systemIssues.push({
          severity: "warning",
          category: "Cron Jobs",
          message: "Google indexing cron hasn't run recently",
          detail: lastGoogleIndexing
            ? `Last run: ${new Date(lastGoogleIndexing.started_at).toISOString()} (${Math.round((now - new Date(lastGoogleIndexing.started_at).getTime()) / oneDayMs)} days ago)`
            : "No record of google-indexing cron ever running",
          fixAction: "Check vercel.json cron schedule and Vercel deployment logs",
        });
      }

      if (!lastSeoAgent || now - new Date(lastSeoAgent.started_at).getTime() > oneDayMs * 2) {
        systemIssues.push({
          severity: "warning",
          category: "Cron Jobs",
          message: "SEO agent hasn't run recently",
          detail: lastSeoAgent
            ? `Last run: ${new Date(lastSeoAgent.started_at).toISOString()}`
            : "No record of seo-agent cron ever running",
        });
      }

      if (!lastVerifyIndexing || now - new Date(lastVerifyIndexing.started_at).getTime() > oneDayMs * 2) {
        systemIssues.push({
          severity: "info",
          category: "Cron Jobs",
          message: "Indexing verification hasn't run recently",
          detail: lastVerifyIndexing
            ? `Last run: ${new Date(lastVerifyIndexing.started_at).toISOString()}`
            : "No record of verify-indexing cron ever running — indexing status won't be verified",
        });
      }

      // Check for failed cron runs
      const failedRuns = recentCronLogs.filter((l) => l.status === "failed");
      if (failedRuns.length > 0) {
        const failedJobNames = [...new Set(failedRuns.map((l) => l.job_name))];
        systemIssues.push({
          severity: "warning",
          category: "Cron Jobs",
          message: `${failedRuns.length} failed indexing cron runs detected`,
          detail: `Failed jobs: ${failedJobNames.join(", ")}. Most recent error: ${failedRuns[0]?.error_message || "Unknown"}`,
        });
      }

      // Check for zero-submission runs (silent failures)
      const zeroSubmissionRuns = recentCronLogs.filter(
        (l) => l.job_name === "google-indexing" && l.status === "completed" && l.items_succeeded === 0
      );
      if (zeroSubmissionRuns.length >= 3) {
        systemIssues.push({
          severity: "critical",
          category: "Silent Failure",
          message: `Google indexing cron completed ${zeroSubmissionRuns.length} times with 0 URLs submitted`,
          detail: "The cron runs successfully but submits nothing to search engines. This is usually caused by missing INDEXNOW_KEY or GSC credentials.",
          fixAction: "Configure INDEXNOW_KEY and GSC credentials in Vercel environment variables",
        });
      }
    } catch {
      // CronJobLog table may not exist
    }

    // Check sitemap health
    if (posts.length > 0) {
      // Check if any recent posts might be missing from sitemap
      const recentPosts = posts.filter((p) => {
        const pubDate = p.published_at || p.created_at;
        return pubDate && Date.now() - new Date(pubDate).getTime() < 7 * 24 * 60 * 60 * 1000;
      });
      if (recentPosts.length > 0 && neverSubmitted > 0) {
        systemIssues.push({
          severity: "warning",
          category: "Sitemap",
          message: `${neverSubmitted} published article(s) never submitted to search engines`,
          detail: "These articles exist in the database but have never been submitted via IndexNow or GSC. They depend on organic sitemap discovery which can take weeks.",
          fixAction: "Use the 'Submit All' button to submit unindexed articles",
        });
      }
    }

    // Content quality issues affecting indexing — thresholds from standards.ts
    const thinContentCount = articles.filter((a) => a.wordCount < thinContentThreshold).length;
    if (thinContentCount > 0) {
      systemIssues.push({
        severity: "warning",
        category: "Content Quality",
        message: `${thinContentCount} article(s) have very thin content (<${thinContentThreshold} words)`,
        detail: "Google typically won't index pages with very little content. These articles need more depth.",
      });
    }

    const lowSeoCount = articles.filter((a) => a.seoScore < lowSeoScoreThreshold).length;
    if (lowSeoCount > 0) {
      systemIssues.push({
        severity: "info",
        category: "SEO Quality",
        message: `${lowSeoCount} article(s) have low SEO scores (<${lowSeoScoreThreshold})`,
        detail: "Low SEO scores indicate missing meta tags, poor heading structure, or other SEO issues that reduce indexing likelihood.",
      });
    }

    // GA4 / Analytics issues
    try {
      // Check for any SeoReport data that mentions indexing issues
      const recentSeoReports = await prisma.seoReport.findMany({
        where: {
          site_id: siteId,
          reportType: { in: ["health", "analytics", "indexing"] },
        },
        orderBy: { generatedAt: "desc" },
        take: 5,
      });

      for (const report of recentSeoReports) {
        const data = report.data as unknown as Record<string, any>;
        if (data?.indexingIssues && Array.isArray(data.indexingIssues)) {
          for (const issue of data.indexingIssues) {
            systemIssues.push({
              severity: "warning",
              category: "SEO Report",
              message: issue.title || "Indexing issue from SEO report",
              detail: issue.description || JSON.stringify(issue),
            });
          }
        }
        // Pull GA4 traffic data if available
        if (data?.traffic?.organic !== undefined && data.traffic.organic === 0) {
          systemIssues.push({
            severity: "info",
            category: "Analytics",
            message: "Zero organic traffic detected",
            detail: "The latest SEO report shows 0 organic sessions. This confirms no pages are effectively indexed and ranking.",
          });
        }
      }
    } catch {
      // SeoReport table may not exist
    }

    // 7. Recent indexing activity from cron logs
    const recentActivity: Array<{
      jobName: string;
      status: string;
      startedAt: string;
      durationMs: number;
      itemsProcessed: number;
      itemsSucceeded: number;
      errorMessage: string | null;
    }> = [];
    try {
      const activityLogs = await prisma.cronJobLog.findMany({
        where: {
          job_name: { in: ["seo-agent", "google-indexing", "verify-indexing", "content-selector"] },
        },
        orderBy: { started_at: "desc" },
        take: 20,
      });
      for (const log of activityLogs) {
        recentActivity.push({
          jobName: log.job_name,
          status: log.status,
          startedAt: log.started_at.toISOString(),
          durationMs: log.duration_ms || 0,
          itemsProcessed: log.items_processed || 0,
          itemsSucceeded: log.items_succeeded || 0,
          errorMessage: log.error_message || null,
        });
      }
    } catch {
      // CronJobLog table may not exist
    }

    // 8. Build health diagnosis — plain language summary for non-technical owner
    const indexingRate = sharedSummary.rate;
    let healthStatus: "healthy" | "warning" | "critical" | "not_started" = "not_started";
    let healthMessage = "";
    let healthDetail = "";

    if (sharedSummary.total === 0) {
      healthStatus = "not_started";
      healthMessage = "No published articles yet";
      healthDetail = "The content pipeline needs to produce and publish articles before they can be indexed by search engines.";
    } else if (!hasIndexNowKey && !hasGscCredentials) {
      healthStatus = "critical";
      healthMessage = "Indexing is not configured";
      healthDetail = "Neither IndexNow nor Google Search Console credentials are set up. Articles cannot be submitted to search engines. Set INDEXNOW_KEY and GSC credentials in Vercel.";
    } else if (indexed === 0 && neverSubmitted === sharedSummary.total) {
      healthStatus = "critical";
      healthMessage = "No articles have been submitted to search engines";
      healthDetail = "All published articles are sitting unsubmitted. The SEO agent cron job may not be running. Check cron logs or use the Submit All button.";
    } else if (indexed === 0 && submitted > 0) {
      healthStatus = "warning";
      healthMessage = `${submitted} articles submitted, waiting for Google to index`;
      healthDetail = "Articles have been submitted but Google hasn't indexed them yet. This is normal for new sites — Google can take 2-14 days to index new URLs. Check back in a few days.";
    } else if (errors > 0) {
      healthStatus = "warning";
      healthMessage = `${errors} indexing error(s) detected`;
      healthDetail = `${indexed} of ${sharedSummary.total} articles are indexed (${indexingRate}%), but ${errors} have errors that need attention. Expand the error articles below to see details.`;
    } else if (indexingRate >= 80) {
      healthStatus = "healthy";
      healthMessage = `${indexed} of ${sharedSummary.total} articles indexed (${indexingRate}%)`;
      healthDetail = "Indexing is working well. Most articles are being picked up by Google.";
    } else if (indexingRate >= 40) {
      healthStatus = "warning";
      healthMessage = `${indexed} of ${sharedSummary.total} articles indexed (${indexingRate}%)`;
      healthDetail = `Indexing is partially working. ${notIndexed + neverSubmitted} articles need attention — check the reasons below each article.`;
    } else {
      healthStatus = "warning";
      healthMessage = `Only ${indexed} of ${sharedSummary.total} articles indexed (${indexingRate}%)`;
      healthDetail = "Most articles are not indexed. This could be a configuration issue, content quality problem, or the site is too new for Google to trust.";
    }

    return NextResponse.json({
      success: true,
      siteId,
      baseUrl,
      config: {
        hasIndexNowKey,
        hasGscCredentials,
        gscSiteUrl: gscSiteUrl || "(fallback)",
      },
      summary: {
        total: sharedSummary.total,
        indexed,
        submitted,
        discovered,
        notIndexed,
        neverSubmitted,
        errors,
        deindexed: sharedSummary.deindexed,
        rate: sharedSummary.rate,
        dailyQuotaRemaining: sharedSummary.dailyQuotaRemaining,
      },
      healthDiagnosis: {
        status: healthStatus,
        message: healthMessage,
        detail: healthDetail,
        indexingRate,
      },
      recentActivity,
      articles,
      systemIssues,
    });
  } catch (error) {
    console.error("Content indexing API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { action, slugs, siteId: reqSiteId, url: actionUrl } = body as {
      action: "submit" | "submit_all" | "submit_discovered" | "resubmit" | "compliance_audit" | "verify_url" | "resubmit_stuck";
      slugs?: string[];
      siteId?: string;
      url?: string;
    };

    const { getDefaultSiteId: getDefaultSite, getSiteConfig, getSiteDomain } = await import("@/config/sites");
    const siteId = reqSiteId || getDefaultSite();
    const { prisma } = await import("@/lib/db");
    const { submitToIndexNow } = await import("@/lib/seo/indexing-service");

    const siteConfig = getSiteConfig(siteId);
    // CRITICAL: Always use getSiteDomain() — returns "https://www.{domain}"
    const baseUrl = getSiteDomain(siteId);

    // ── Verify URL: Immediately check a single URL's indexing status via GSC ──
    if (action === "verify_url") {
      if (!actionUrl) {
        return NextResponse.json({ error: "URL required for verify_url action" }, { status: 400 });
      }
      try {
        const { GoogleSearchConsole } = await import("@/lib/integrations/google-search-console");
        const { getSiteSeoConfig } = await import("@/config/sites");
        const gsc = new GoogleSearchConsole();
        if (!gsc.isConfigured()) {
          return NextResponse.json({ success: false, error: "GSC not configured" }, { status: 400 });
        }
        const seoConfig = getSiteSeoConfig(siteId);
        gsc.setSiteUrl(seoConfig.gscSiteUrl);
        const inspection = await gsc.getIndexingStatus(actionUrl);

        if (inspection) {
          const indexingStateMatch = inspection.indexingState === "INDEXED" || inspection.indexingState === "PARTIALLY_INDEXED";
          const coverageStateMatch = typeof inspection.coverageState === "string" &&
            inspection.coverageState.toLowerCase().includes("indexed");
          const isIndexed = indexingStateMatch || coverageStateMatch;

          // Derive status from actual GSC inspection result — never default to
          // "submitted" since verification is not a submission. Defaulting to
          // "submitted" without channel flags creates ghost submissions.
          let status = "discovered";
          if (isIndexed) status = "indexed";
          else if (inspection.coverageState?.toLowerCase().includes("submitted")) {
            status = "submitted";
          }

          // Update tracking record
          await prisma.uRLIndexingStatus.updateMany({
            where: { site_id: siteId, url: actionUrl },
            data: {
              status,
              indexing_state: inspection.indexingState,
              coverage_state: inspection.coverageState,
              last_inspected_at: new Date(),
              last_error: null,
            },
          });

          logManualAction(request, { action: "verify-url", resource: "indexing", resourceId: actionUrl, siteId, success: true, summary: `URL verified: ${isIndexed ? "INDEXED" : "NOT indexed"} (${inspection.indexingState})`, details: { isIndexed, indexingState: inspection.indexingState, coverageState: inspection.coverageState, status } }).catch(() => {});
          return NextResponse.json({
            success: true,
            action: "verify_url",
            url: actionUrl,
            isIndexed,
            indexingState: inspection.indexingState,
            coverageState: inspection.coverageState,
            lastCrawlTime: inspection.lastCrawlTime,
            status,
          });
        } else {
          logManualAction(request, { action: "verify-url", resource: "indexing", resourceId: actionUrl, siteId, success: true, summary: "GSC returned no data — URL may not be in Google's index yet" }).catch(() => {});
          return NextResponse.json({
            success: true,
            action: "verify_url",
            url: actionUrl,
            isIndexed: false,
            message: "GSC returned no data — URL may not be in Google's index yet",
          });
        }
      } catch (verifyErr) {
        logManualAction(request, { action: "verify-url", resource: "indexing", resourceId: actionUrl, siteId, success: false, summary: "URL verification failed", error: verifyErr instanceof Error ? verifyErr.message : String(verifyErr), fix: "Check GSC credentials in Settings tab." }).catch(() => {});
        return NextResponse.json({
          success: false,
          error: `Verification failed: ${verifyErr instanceof Error ? verifyErr.message : String(verifyErr)}`,
        }, { status: 500 });
      }
    }

    // ── Resubmit Stuck: Reset all stuck/error URLs for resubmission ──
    // ── Submit Discovered: batch-submit all "discovered" URLs that were never submitted ──
    if (action === "submit_discovered") {
      try {
        const discoveredUrls = await prisma.uRLIndexingStatus.findMany({
          where: { site_id: siteId, status: "discovered" },
          select: { url: true, id: true },
          take: 100,
          orderBy: { created_at: "asc" },
        });

        if (discoveredUrls.length === 0) {
          return NextResponse.json({ success: true, action: "submit_discovered", submitted: 0, message: "No discovered URLs to submit" });
        }

        const urls = discoveredUrls.map((u: { url: string }) => u.url);
        let submitted = 0;
        let channel = "none";

        // Try IndexNow first
        const indexNowKey = process.env.INDEXNOW_KEY;
        if (indexNowKey) {
          try {
            const results = await submitToIndexNow(urls, baseUrl, indexNowKey);
            if (results.some((r) => r.success)) {
              await prisma.uRLIndexingStatus.updateMany({
                where: { id: { in: discoveredUrls.map((u: { id: string }) => u.id) } },
                data: { status: "submitted", submitted_indexnow: true, last_submitted_at: new Date(), submission_attempts: { increment: 1 } },
              });
              submitted = urls.length;
              channel = "indexnow";
            }
          } catch (e) {
            console.warn("[content-indexing] IndexNow submit_discovered failed:", e instanceof Error ? e.message : e);
          }
        }

        // Fallback: sitemap ping + mark as submitted
        if (submitted === 0) {
          try {
            const { pingSitemaps } = await import("@/lib/seo/indexing-service");
            await pingSitemaps(baseUrl);
          } catch { /* sitemap ping is best-effort */ }

          // Mark all as submitted regardless — they're in the sitemap, Google will crawl them
          await prisma.uRLIndexingStatus.updateMany({
            where: { id: { in: discoveredUrls.map((u: { id: string }) => u.id) } },
            data: { status: "submitted", submitted_sitemap: true, last_submitted_at: new Date(), submission_attempts: { increment: 1 } },
          });
          submitted = urls.length;
          channel = "sitemap";
        }

        logManualAction(request, { action: "submit-discovered", resource: "indexing", siteId, success: submitted > 0, summary: `Submitted ${submitted} discovered URL(s) via ${channel}`, details: { submitted, total: discoveredUrls.length, channel } }).catch(() => {});
        return NextResponse.json({
          success: true,
          action: "submit_discovered",
          submitted,
          total: discoveredUrls.length,
          channel,
        });
      } catch (err) {
        logManualAction(request, { action: "submit-discovered", resource: "indexing", siteId, success: false, summary: "Submit discovered failed", error: err instanceof Error ? err.message : String(err), fix: "Check IndexNow key and GSC credentials." }).catch(() => {});
        return NextResponse.json({
          success: false,
          error: `Submit discovered failed: ${err instanceof Error ? err.message : String(err)}`,
        }, { status: 500 });
      }
    }

    if (action === "resubmit_stuck") {
      try {
        const { submitToIndexNow: resubmitToIndexNow } = await import("@/lib/seo/indexing-service");
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Find all stuck URLs for this site
        const stuckUrls = await prisma.uRLIndexingStatus.findMany({
          where: {
            site_id: siteId,
            status: { in: ["submitted", "discovered", "pending", "error", "chronic_failure"] },
            last_submitted_at: { lt: sevenDaysAgo },
          },
          select: { url: true, id: true },
          take: 50,
        });

        if (stuckUrls.length === 0) {
          return NextResponse.json({ success: true, action: "resubmit_stuck", resubmitted: 0, message: "No stuck URLs found" });
        }

        const urls = stuckUrls.map((u: { url: string }) => u.url);
        let resubmitted = 0;
        let channel = "none";

        // Try IndexNow first (fastest path)
        const indexNowKey = process.env.INDEXNOW_KEY;
        if (indexNowKey) {
          try {
            const results = await resubmitToIndexNow(urls, baseUrl, indexNowKey);
            const success = results.some((r) => r.success);
            if (success) {
              await Promise.allSettled(
                stuckUrls.map((u: { id: string }) =>
                  prisma.uRLIndexingStatus.update({
                    where: { id: u.id },
                    data: {
                      status: "submitted",
                      submitted_indexnow: true,
                      last_submitted_at: new Date(),
                      submission_attempts: { increment: 1 },
                      last_error: null,
                    },
                  })
                )
              );
              resubmitted = urls.length;
              channel = "indexnow";
            }
          } catch (indexNowErr) {
            console.warn("[content-indexing] IndexNow resubmission failed:", indexNowErr instanceof Error ? indexNowErr.message : indexNowErr);
          }
        }

        // Fallback: Sitemap ping + mark as submitted (Google discovers via sitemap.xml)
        if (resubmitted === 0) {
          try {
            const { pingSitemaps } = await import("@/lib/seo/indexing-service");
            await pingSitemaps(baseUrl);
            await Promise.allSettled(
              stuckUrls.map((u: { id: string }) =>
                prisma.uRLIndexingStatus.update({
                  where: { id: u.id },
                  data: {
                    status: "submitted",
                    submitted_sitemap: true,
                    last_submitted_at: new Date(),
                    submission_attempts: { increment: 1 },
                    last_error: null,
                  },
                })
              )
            );
            resubmitted = urls.length;
            channel = "sitemap";
          } catch (sitemapErr) {
            console.warn("[content-indexing] Sitemap fallback failed:", sitemapErr instanceof Error ? sitemapErr.message : sitemapErr);
          }
        }

        logManualAction(request, { action: "resubmit-stuck", resource: "indexing", siteId, success: resubmitted > 0, summary: `Resubmitted ${resubmitted} stuck URL(s) via ${channel}`, details: { resubmitted, totalStuck: stuckUrls.length, channel } }).catch(() => {});
        return NextResponse.json({
          success: true,
          action: "resubmit_stuck",
          resubmitted,
          totalStuck: stuckUrls.length,
          channel,
        });
      } catch (resubErr) {
        logManualAction(request, { action: "resubmit-stuck", resource: "indexing", siteId, success: false, summary: "Resubmit stuck failed", error: resubErr instanceof Error ? resubErr.message : String(resubErr), fix: "Check IndexNow key and network connectivity." }).catch(() => {});
        return NextResponse.json({
          success: false,
          error: `Resubmit failed: ${resubErr instanceof Error ? resubErr.message : String(resubErr)}`,
        }, { status: 500 });
      }
    }

    // ── Compliance Audit: check all published pages against SEO standards ──
    if (action === "compliance_audit") {
      const { CONTENT_QUALITY } = await import("@/lib/seo/standards");
      const posts = await prisma.blogPost.findMany({
        where: { published: true, siteId, deletedAt: null },
        select: {
          id: true, slug: true, title_en: true, title_ar: true,
          meta_title_en: true, meta_description_en: true,
          content_en: true, content_ar: true, seo_score: true,
          page_type: true, tags: true, keywords_json: true,
          authority_links_json: true,
        },
      });

      const results: Array<{
        slug: string; score: number; issues: string[]; fixes: string[];
      }> = [];
      let totalFixed = 0;

      for (const post of posts) {
        const issues: string[] = [];
        const fixes: string[] = [];
        let score = 100;

        // Meta title check (standards: min 30, optimal 50-60)
        const metaTitle = post.meta_title_en || "";
        if (metaTitle.length < CONTENT_QUALITY.metaTitleMin) {
          issues.push(`Meta title too short (${metaTitle.length} chars, min ${CONTENT_QUALITY.metaTitleMin})`);
          score -= 15;
        } else if (metaTitle.length > CONTENT_QUALITY.metaTitleOptimal.max) {
          issues.push(`Meta title may be truncated (${metaTitle.length} chars, optimal max ${CONTENT_QUALITY.metaTitleOptimal.max})`);
          score -= 5;
        }

        // Meta description check (standards: min 70, optimal 120-160)
        const metaDesc = post.meta_description_en || "";
        if (metaDesc.length < CONTENT_QUALITY.metaDescriptionMin) {
          issues.push(`Meta description too short (${metaDesc.length} chars, min ${CONTENT_QUALITY.metaDescriptionMin})`);
          score -= 10;
        } else if (metaDesc.length > CONTENT_QUALITY.metaDescriptionOptimal.max) {
          issues.push(`Meta description too long (${metaDesc.length} chars, max ${CONTENT_QUALITY.metaDescriptionOptimal.max})`);
          score -= 5;
        }

        // Word count check (standards: min 800)
        const wordCount = post.content_en ? post.content_en.split(/\s+/).filter(Boolean).length : 0;
        if (wordCount < CONTENT_QUALITY.thinContentThreshold) {
          issues.push(`Critically thin content (${wordCount} words, min ${CONTENT_QUALITY.minWords})`);
          score -= 20;
        } else if (wordCount < CONTENT_QUALITY.minWords) {
          issues.push(`Below minimum word count (${wordCount} words, min ${CONTENT_QUALITY.minWords})`);
          score -= 10;
        }

        // H2 headings check
        const h2Count = (post.content_en || "").match(/<h2/gi)?.length || 0;
        if (h2Count < CONTENT_QUALITY.minH2Count) {
          issues.push(`Insufficient H2 headings (${h2Count}, min ${CONTENT_QUALITY.minH2Count})`);
          score -= 5;
        }

        // Arabic content check (bilingual requirement)
        if (!post.content_ar || post.content_ar.length < 100) {
          issues.push("Missing or insufficient Arabic content");
          score -= 5;
        }
        if (!post.title_ar) {
          issues.push("Missing Arabic title");
          score -= 5;
        }

        // Tags check
        if (!post.tags || post.tags.length < 2) {
          issues.push("Insufficient tags (<2)");
          score -= 5;
        }

        // Page type check (needed for schema markup)
        if (!post.page_type) {
          issues.push("Missing page_type for structured data");
          // Auto-fix: set to 'guide'
          try {
            await prisma.blogPost.update({
              where: { id: post.id },
              data: { page_type: "guide" },
            });
            fixes.push("Set page_type to 'guide'");
            totalFixed++;
          } catch { /* non-fatal */ }
        }

        // E-E-A-T: authority links and keywords
        if (post.authority_links_json) score += 5;
        if (post.keywords_json) score += 5;

        score = Math.max(0, Math.min(100, score));

        // Update SEO score if it changed significantly
        if (!post.seo_score || Math.abs(post.seo_score - score) > 5) {
          try {
            await prisma.blogPost.update({
              where: { id: post.id },
              data: { seo_score: score },
            });
            fixes.push(`Updated SEO score: ${post.seo_score || "null"} → ${score}`);
            totalFixed++;
          } catch { /* non-fatal */ }
        }

        results.push({ slug: post.slug, score, issues, fixes });
      }

      const passing = results.filter((r) => r.score >= CONTENT_QUALITY.qualityGateScore).length;
      const failing = results.filter((r) => r.score < CONTENT_QUALITY.qualityGateScore).length;
      const avgScore = results.length > 0
        ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
        : 0;

      logManualAction(request, { action: "compliance-audit", resource: "blogpost", siteId, success: true, summary: `Compliance audit: ${passing} passing, ${failing} failing, ${totalFixed} auto-fixes applied (avg score: ${avgScore})`, details: { totalPosts: results.length, passing, failing, avgScore, totalFixed } }).catch(() => {});
      return NextResponse.json({
        success: true,
        action: "compliance_audit",
        siteId,
        standards: {
          version: "2026-02-18",
          qualityGateScore: CONTENT_QUALITY.qualityGateScore,
          minWords: CONTENT_QUALITY.minWords,
          metaTitleMin: CONTENT_QUALITY.metaTitleMin,
          metaDescriptionMin: CONTENT_QUALITY.metaDescriptionMin,
        },
        summary: {
          totalPosts: results.length,
          passing,
          failing,
          averageScore: avgScore,
          totalAutoFixes: totalFixed,
        },
        posts: results,
      });
    }

    // Determine which articles to submit
    let postsToSubmit: Array<{ slug: string }>;
    if (action === "submit_all") {
      // Submit all published articles (DB + static) that aren't indexed
      const dbArticles = await prisma.blogPost.findMany({
        where: { published: true, siteId, deletedAt: null },
        select: { slug: true },
      });
      const dbSlugSet = new Set(dbArticles.map((p) => p.slug));

      // Include static articles for yalla-london
      let staticArticles: Array<{ slug: string }> = [];
      if (siteId === "yalla-london") {
        try {
          const { blogPosts: staticBlogPosts } = await import("@/data/blog-content");
          const { extendedBlogPosts } = await import("@/data/blog-content-extended");
          staticArticles = [...staticBlogPosts, ...extendedBlogPosts]
            .filter((p) => p.published && !dbSlugSet.has(p.slug))
            .map((p) => ({ slug: p.slug }));
        } catch { /* static content unavailable */ }
      }

      postsToSubmit = [...dbArticles, ...staticArticles];
    } else if (slugs && slugs.length > 0) {
      postsToSubmit = slugs.map((slug) => ({ slug }));
    } else {
      return NextResponse.json({ error: "No articles specified" }, { status: 400 });
    }

    const urls = postsToSubmit.map((p) => `${baseUrl}/blog/${p.slug}`);
    if (urls.length === 0) {
      return NextResponse.json({ success: true, submitted: 0, message: "No articles to submit" });
    }

    // Submit via IndexNow
    let indexNowSuccess = false;
    let indexNowMessage = "Not attempted";
    try {
      const results = await submitToIndexNow(urls, baseUrl);
      indexNowSuccess = results.some((r) => r.success);
      indexNowMessage = results.map((r) => r.message).join("; ");
    } catch (e) {
      indexNowMessage = `Error: ${e instanceof Error ? e.message : String(e)}`;
    }

    // Submit via Google Search Console (sitemap)
    let gscSuccess = false;
    let gscMessage = "Not attempted";
    try {
      const { searchConsole } = await import("@/lib/integrations/google-search-console");
      if (searchConsole.isConfigured()) {
        // Submit sitemap — Google Indexing API only works for JobPosting/BroadcastEvent,
        // NOT regular blog content. Sitemap submission is the correct path for articles.
        const result = await searchConsole.submitSitemap(`${baseUrl}/sitemap.xml`);
        gscSuccess = !!result;
        gscMessage = result ? "Sitemap submitted to Google" : "Sitemap submission failed";
      } else {
        gscMessage = "GSC not configured";
      }
    } catch (e) {
      gscMessage = `Error: ${e instanceof Error ? e.message : String(e)}`;
    }

    // Track submissions in DB — only mark as "submitted" if at least one
    // channel succeeded. Otherwise mark as "pending" to avoid ghost submissions
    // (status="submitted" with no channel flags set).
    const anyChannelSucceeded = indexNowSuccess || gscSuccess;
    const effectiveStatus = anyChannelSucceeded ? "submitted" : "pending";
    let dbUpdated = 0;
    for (const url of urls) {
      try {
        const slug = url.split("/blog/")[1] || null;
        await prisma.uRLIndexingStatus.upsert({
          where: { site_id_url: { site_id: siteId, url } },
          create: {
            site_id: siteId,
            url,
            slug,
            status: effectiveStatus,
            submitted_indexnow: indexNowSuccess,
            submitted_sitemap: gscSuccess,
            last_submitted_at: anyChannelSucceeded ? new Date() : undefined,
            submission_attempts: 1,
          },
          update: {
            status: effectiveStatus,
            ...(indexNowSuccess && { submitted_indexnow: true }),
            ...(gscSuccess && { submitted_sitemap: true }),
            last_submitted_at: anyChannelSucceeded ? new Date() : undefined,
            submission_attempts: { increment: 1 },
          },
        });
        dbUpdated++;
      } catch {
        // non-fatal
      }
    }

    logManualAction(request, { action: `indexing-${action}`, resource: "indexing", siteId, success: indexNowSuccess || gscSuccess, summary: `Submitted ${urls.length} URL(s) for indexing (IndexNow: ${indexNowSuccess ? "OK" : "failed"}, GSC: ${gscSuccess ? "OK" : "failed"})`, error: (!indexNowSuccess && !gscSuccess) ? "No submission channel succeeded" : undefined, fix: (!indexNowSuccess && !gscSuccess) ? "Check INDEXNOW_KEY env var and GSC credentials in Settings." : undefined, details: { submitted: urls.length, dbUpdated, indexNowSuccess, gscSuccess } }).catch(() => {});

    return NextResponse.json({
      success: true,
      submitted: urls.length,
      dbUpdated,
      indexNow: { success: indexNowSuccess, message: indexNowMessage },
      gsc: { success: gscSuccess, message: gscMessage },
    });
  } catch (error) {
    console.error("Content indexing submit error:", error);
    logManualAction(request, { action: "indexing-submit", resource: "indexing", success: false, summary: "Indexing submission crashed", error: error instanceof Error ? error.message : String(error), fix: "Check IndexNow key and GSC config in Settings tab." }).catch(() => {});
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Submission failed" },
      { status: 500 }
    );
  }
}
