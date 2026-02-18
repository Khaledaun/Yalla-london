export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * Content Indexing Tab API
 *
 * GET  — Returns all published articles with their indexing status,
 *        diagnostic reasons for non-indexing, and system-level indexing issues.
 * POST — Submit specific articles for indexing or trigger fixes.
 */

interface ArticleIndexingInfo {
  id: string;
  title: string;
  slug: string;
  url: string;
  publishedAt: string | null;
  seoScore: number;
  wordCount: number;
  // Indexing status
  indexingStatus: "indexed" | "submitted" | "not_indexed" | "error" | "never_submitted";
  // Diagnostic info
  submittedAt: string | null;
  lastCrawledAt: string | null;
  lastInspectedAt: string | null;
  coverageState: string | null;
  submittedIndexnow: boolean;
  submittedGoogle: boolean;
  submissionAttempts: number;
  // Why not indexed
  notIndexedReasons: string[];
  // Suggested fix
  fixAction: string | null;
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const siteId =
    request.nextUrl.searchParams.get("siteId") ||
    request.headers.get("x-site-id") ||
    "yalla-london";

  try {
    const { prisma } = await import("@/lib/db");
    const { searchConsole } = await import(
      "@/lib/integrations/google-search-console"
    );
    const { getSiteConfig } = await import("@/config/sites");

    const siteConfig = getSiteConfig(siteId);
    const baseUrl = siteConfig?.domain
      ? `https://${siteConfig.domain}`
      : process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

    // 1. Get all published blog posts
    const posts = await prisma.blogPost.findMany({
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

    // 2. Get indexing status for all article URLs
    const articleUrls = posts.map((p) => `${baseUrl}/blog/${p.slug}`);
    let indexingRecords: Record<string, any> = {};
    try {
      const records = await prisma.uRLIndexingStatus.findMany({
        where: {
          site_id: siteId,
          url: { in: articleUrls },
        },
      });
      for (const r of records) {
        indexingRecords[r.url] = r;
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
      const record = indexingRecords[url];
      const wordCount = post.content_en
        ? post.content_en.split(/\s+/).filter(Boolean).length
        : 0;

      // Determine indexing status
      let indexingStatus: ArticleIndexingInfo["indexingStatus"] = "never_submitted";
      if (record) {
        if (record.status === "indexed" || record.indexing_state === "INDEXED") {
          indexingStatus = "indexed";
        } else if (record.status === "error") {
          indexingStatus = "error";
        } else if (record.status === "submitted") {
          indexingStatus = "submitted";
        } else {
          indexingStatus = "not_indexed";
        }
      }

      // Build reasons for not being indexed
      const reasons: string[] = [];
      const fixAction: string | null = null;

      if (indexingStatus === "never_submitted") {
        if (!hasIndexNowKey && !hasGscCredentials) {
          reasons.push("Neither IndexNow key nor Google Search Console credentials are configured — articles cannot be submitted to search engines");
        } else if (!hasIndexNowKey) {
          reasons.push("INDEXNOW_KEY not set — cannot submit to Bing/Yandex");
        }
        if (!hasGscCredentials) {
          reasons.push("Google Search Console credentials not configured — cannot submit sitemap or check indexing");
        }
        reasons.push("Article has never been submitted to search engines");
      } else if (indexingStatus === "submitted") {
        const submittedAt = record?.last_submitted_at;
        if (submittedAt) {
          const hoursSinceSubmission = (Date.now() - new Date(submittedAt).getTime()) / (1000 * 60 * 60);
          if (hoursSinceSubmission < 48) {
            reasons.push(`Submitted ${Math.round(hoursSinceSubmission)} hours ago — Google typically takes 2-14 days to crawl new URLs`);
          } else if (hoursSinceSubmission < 336) {
            reasons.push(`Submitted ${Math.round(hoursSinceSubmission / 24)} days ago — still within normal Google crawl timeframe (up to 14 days)`);
          } else {
            reasons.push(`Submitted ${Math.round(hoursSinceSubmission / 24)} days ago — this is longer than expected. Consider resubmitting.`);
          }
        }
        if (!record?.submitted_indexnow) {
          reasons.push("Not submitted via IndexNow (Bing/Yandex)");
        }
        if (!record?.submitted_google_api) {
          reasons.push("Not submitted via Google Indexing API");
        }
      } else if (indexingStatus === "not_indexed") {
        const coverage = record?.coverage_state || "";
        if (coverage.includes("Crawled - currently not indexed")) {
          reasons.push("Google crawled this page but chose not to index it — content may need improvement (more depth, unique value, or better internal linking)");
        } else if (coverage.includes("Discovered - currently not indexed")) {
          reasons.push("Google discovered this URL but hasn't crawled it yet — this is normal for new sites");
        } else if (coverage.includes("Duplicate")) {
          reasons.push("Google considers this a duplicate of another page — check for similar content on the site");
        } else if (coverage.includes("Excluded by")) {
          reasons.push(`Page excluded: ${coverage}`);
        } else if (coverage.includes("Blocked by robots.txt")) {
          reasons.push("Blocked by robots.txt — check your robots.txt configuration");
        } else if (coverage.includes("noindex")) {
          reasons.push("Page has a noindex tag — remove it to allow indexing");
        } else if (coverage) {
          reasons.push(`Google coverage state: ${coverage}`);
        } else {
          reasons.push("Submitted but Google has not indexed it — no specific reason available from GSC");
        }

        // Inspection-level issues
        const inspectionResult = record?.inspection_result as Record<string, any> | null;
        if (inspectionResult?.issues && Array.isArray(inspectionResult.issues)) {
          for (const issue of inspectionResult.issues) {
            reasons.push(`GSC issue: ${issue}`);
          }
        }
        if (inspectionResult?.robotsTxtState === "DISALLOWED") {
          reasons.push("robots.txt is blocking Google from crawling this URL");
        }
      } else if (indexingStatus === "error") {
        if (record?.last_error) {
          reasons.push(`Error: ${record.last_error}`);
        } else {
          reasons.push("An error occurred during indexing — no details available");
        }
      }

      // SEO quality issues that could prevent indexing
      if (wordCount < 300) {
        reasons.push(`Very thin content (${wordCount} words) — Google rarely indexes pages under 300 words`);
      } else if (wordCount < 1200) {
        reasons.push(`Content below target length (${wordCount}/1,200 words) — may affect indexing priority`);
      }
      if ((post.seo_score || 0) < 50) {
        reasons.push(`Low SEO score (${post.seo_score || 0}/100) — improve meta tags, headings, and content structure`);
      }
      if (!post.meta_title_en) {
        reasons.push("Missing meta title — critical for SEO");
      }
      if (!post.meta_description_en) {
        reasons.push("Missing meta description — important for click-through rate");
      }

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
        submittedGoogle: record?.submitted_google_api || false,
        submissionAttempts: record?.submission_attempts || 0,
        notIndexedReasons: reasons,
        fixAction,
      };
    });

    // 5. Summary counts
    const indexed = articles.filter((a) => a.indexingStatus === "indexed").length;
    const submitted = articles.filter((a) => a.indexingStatus === "submitted").length;
    const notIndexed = articles.filter((a) => a.indexingStatus === "not_indexed").length;
    const neverSubmitted = articles.filter((a) => a.indexingStatus === "never_submitted").length;
    const errors = articles.filter((a) => a.indexingStatus === "error").length;

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
        detail: "The GSC site URL must match exactly what's registered in Google Search Console (e.g., 'sc-domain:yalla-london.com' or 'https://yalla-london.com'). Using a fallback URL that may not match.",
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

    // Content quality issues affecting indexing
    const thinContentCount = articles.filter((a) => a.wordCount < 300).length;
    if (thinContentCount > 0) {
      systemIssues.push({
        severity: "warning",
        category: "Content Quality",
        message: `${thinContentCount} article(s) have very thin content (<300 words)`,
        detail: "Google typically won't index pages with very little content. These articles need more depth.",
      });
    }

    const lowSeoCount = articles.filter((a) => a.seoScore < 50).length;
    if (lowSeoCount > 0) {
      systemIssues.push({
        severity: "info",
        category: "SEO Quality",
        message: `${lowSeoCount} article(s) have low SEO scores (<50)`,
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
        const data = report.data as Record<string, any>;
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
        total: articles.length,
        indexed,
        submitted,
        notIndexed,
        neverSubmitted,
        errors,
      },
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
    const { action, slugs, siteId: reqSiteId } = body as {
      action: "submit" | "submit_all" | "resubmit";
      slugs?: string[];
      siteId?: string;
    };

    const siteId = reqSiteId || "yalla-london";
    const { prisma } = await import("@/lib/db");
    const { submitToIndexNow } = await import("@/lib/seo/indexing-service");
    const { getSiteConfig } = await import("@/config/sites");

    const siteConfig = getSiteConfig(siteId);
    const baseUrl = siteConfig?.domain
      ? `https://${siteConfig.domain}`
      : process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

    // Determine which articles to submit
    let postsToSubmit;
    if (action === "submit_all") {
      // Submit all published articles that aren't indexed
      postsToSubmit = await prisma.blogPost.findMany({
        where: {
          published: true,
          siteId,
          deletedAt: null,
        },
        select: { slug: true },
      });
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
        const result = await searchConsole.submitUrl(`${baseUrl}/sitemap.xml`);
        gscSuccess = !!result;
        gscMessage = result ? "Sitemap submitted" : "Submission failed";
      } else {
        gscMessage = "GSC not configured";
      }
    } catch (e) {
      gscMessage = `Error: ${e instanceof Error ? e.message : String(e)}`;
    }

    // Track submissions in DB
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
            status: "submitted",
            submitted_indexnow: indexNowSuccess,
            last_submitted_at: new Date(),
            submission_attempts: 1,
          },
          update: {
            status: "submitted",
            submitted_indexnow: indexNowSuccess,
            last_submitted_at: new Date(),
            submission_attempts: { increment: 1 },
          },
        });
        dbUpdated++;
      } catch {
        // non-fatal
      }
    }

    return NextResponse.json({
      success: true,
      submitted: urls.length,
      dbUpdated,
      indexNow: { success: indexNowSuccess, message: indexNowMessage },
      gsc: { success: gscSuccess, message: gscMessage },
    });
  } catch (error) {
    console.error("Content indexing submit error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Submission failed" },
      { status: 500 }
    );
  }
}
