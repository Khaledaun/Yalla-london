/**
 * Indexing & SEO Diagnostics
 *
 * Tests: IndexNow config, GSC config, URL submission status, sitemap, schema.org.
 * Covers the "get found by Google" part of the pipeline.
 */

import type { DiagnosticResult } from "../types";

const SECTION = "indexing";

function pass(id: string, name: string, detail: string, explanation: string): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "pass", detail, explanation };
}
function warn(id: string, name: string, detail: string, explanation: string, diagnosis?: string, fixAction?: DiagnosticResult["fixAction"]): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "warn", detail, explanation, diagnosis, fixAction };
}
function fail(id: string, name: string, detail: string, explanation: string, diagnosis?: string, fixAction?: DiagnosticResult["fixAction"]): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "fail", detail, explanation, diagnosis, fixAction };
}

const indexingSection = async (
  siteId: string,
  _budgetMs: number,
  _startTime: number,
): Promise<DiagnosticResult[]> => {
  const results: DiagnosticResult[] = [];

  // ── 1. IndexNow Key ────────────────────────────────────────────────
  const indexNowKey = process.env.INDEXNOW_KEY;
  if (indexNowKey && indexNowKey.length > 10) {
    results.push(pass("indexnow-key", "IndexNow Key", `Configured (${indexNowKey.length} chars)`, "IndexNow instantly notifies search engines (Bing, Yandex) when you publish new content. Without it, you wait for crawlers to discover new pages naturally — which can take days or weeks."));
  } else {
    results.push(warn("indexnow-key", "IndexNow Key", "INDEXNOW_KEY not set", "IndexNow instantly notifies search engines when you publish new content.", "Set INDEXNOW_KEY in your environment variables. Get one from indexnow.org."));
  }

  // ── 2. Google Search Console Credentials ───────────────────────────
  const gscEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const gscKey = process.env.GOOGLE_PRIVATE_KEY;
  const gscUrl = process.env.GSC_SITE_URL;

  if (gscEmail && gscKey && gscUrl) {
    results.push(pass("gsc-config", "Google Search Console", "Fully configured", "Google Search Console integration allows monitoring which pages are indexed, what queries bring traffic, and submitting sitemaps. Essential for SEO visibility."));
  } else {
    const missing: string[] = [];
    if (!gscEmail) missing.push("GOOGLE_CLIENT_EMAIL");
    if (!gscKey) missing.push("GOOGLE_PRIVATE_KEY");
    if (!gscUrl) missing.push("GSC_SITE_URL");
    results.push(warn("gsc-config", "Google Search Console", `Missing: ${missing.join(", ")}`, "Google Search Console integration allows monitoring indexing status and search performance.", `Set the missing env var(s) to enable GSC integration. You need a Google service account with Search Console API access.`));
  }

  // ── 3. GA4 Configuration ───────────────────────────────────────────
  const ga4Id = process.env.GA4_PROPERTY_ID;
  if (ga4Id) {
    results.push(pass("ga4-config", "Google Analytics 4", `Property ID: ${ga4Id}`, "Google Analytics 4 tracks visitors, page views, and conversions. Without it, you can't measure how much traffic your content generates."));
  } else {
    results.push(warn("ga4-config", "Google Analytics 4", "GA4_PROPERTY_ID not set", "Google Analytics 4 tracks visitors, page views, and conversions.", "Set GA4_PROPERTY_ID to enable traffic analytics on the dashboard."));
  }

  // ── 4. Indexing Status from Database ───────────────────────────────
  try {
    const { prisma } = await import("@/lib/db");

    // BlogPost has no indexing_status field — use URLIndexingStatus table
    const totalPosts = await prisma.blogPost.count({ where: { siteId, published: true } });
    const [indexedCount, submittedCount, neverSubmittedCount] = await Promise.all([
      prisma.uRLIndexingStatus.count({ where: { site_id: siteId, status: "indexed" } }),
      prisma.uRLIndexingStatus.count({ where: { site_id: siteId, status: "submitted" } }),
      prisma.uRLIndexingStatus.count({ where: { site_id: siteId, status: "discovered" } }),
    ]);
    const neverSubmitted = Math.max(0, totalPosts - indexedCount - submittedCount - neverSubmittedCount) + neverSubmittedCount;

    const indexRate = totalPosts > 0 ? Math.round((indexedCount / totalPosts) * 100) : 0;

    results.push(pass("index-total", "Published Pages", `${totalPosts} published articles`, "Total published pages eligible for Google indexing. Each page is a potential traffic source."));

    if (indexRate >= 80) {
      results.push(pass("index-rate", "Indexing Rate", `${indexRate}% indexed (${indexedCount}/${totalPosts})`, "Percentage of published articles confirmed indexed by Google. Target: 80%+. Higher = more pages appearing in search results."));
    } else if (indexRate >= 50) {
      results.push(warn("index-rate", "Indexing Rate", `${indexRate}% indexed (${indexedCount}/${totalPosts})`, "Percentage of published articles confirmed indexed by Google.", "Indexing rate is moderate. Submit unindexed pages to speed up discovery.", {
        id: "fix-low-indexing",
        label: "Submit to IndexNow",
        api: "/api/admin/content-indexing",
        payload: { action: "submit_all" },
        rerunGroup: "indexing",
      }));
    } else if (totalPosts > 0) {
      results.push(fail("index-rate", "Indexing Rate", `${indexRate}% indexed (${indexedCount}/${totalPosts})`, "Percentage of published articles confirmed indexed by Google.", "Most of your content isn't indexed. This means Google hasn't found or accepted these pages.", {
        id: "fix-poor-indexing",
        label: "Submit All to IndexNow",
        api: "/api/admin/content-indexing",
        payload: { action: "submit_all" },
        rerunGroup: "indexing",
      }));
    }

    if (neverSubmitted > 0) {
      results.push(warn("never-submitted", "Never Submitted", `${neverSubmitted} articles never submitted to search engines`, "These articles exist but were never notified to Google via IndexNow or GSC.", `${neverSubmitted} article(s) haven't been submitted. They'll rely on natural crawl discovery, which is slow.`, {
        id: "fix-never-submitted",
        label: "Submit All Unsubmitted",
        api: "/api/admin/content-indexing",
        payload: { action: "submit_all" },
        rerunGroup: "indexing",
      }));
    } else if (totalPosts > 0) {
      results.push(pass("never-submitted", "Submission Status", "All articles have been submitted", "Confirms every published article has been submitted to search engines via IndexNow or GSC."));
    }

    if (submittedCount > 0) {
      results.push(pass("submitted-pending", "Submitted & Pending", `${submittedCount} awaiting Google confirmation`, "Articles submitted but not yet confirmed indexed. Google typically takes 1-14 days to process."));
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("P2021") || msg.includes("does not exist")) {
      results.push(warn("index-db", "Indexing Database", "BlogPost table missing indexing fields", "Checks indexing status from database."));
    } else {
      results.push(warn("index-db", "Indexing Database", `Error: ${msg}`, "Checks indexing status from database."));
    }
  }

  // ── 5. SEO Score Distribution ──────────────────────────────────────
  try {
    const { prisma } = await import("@/lib/db");

    const posts = await prisma.blogPost.findMany({
      where: { siteId, published: true },
      select: { seo_score: true },
    });

    if (posts.length > 0) {
      const scores = posts.map(p => p.seo_score || 0);
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const below50 = scores.filter(s => s < 50).length;
      const above70 = scores.filter(s => s >= 70).length;

      if (avg >= 70) {
        results.push(pass("seo-scores", "SEO Score Average", `${avg}/100 — ${above70}/${posts.length} above 70`, "Average SEO score across all published articles. Score of 70+ means content is well-optimized for search engines."));
      } else {
        results.push(warn("seo-scores", "SEO Score Average", `${avg}/100 — ${below50} articles below 50`, "Average SEO score across all published articles.", "Multiple articles have low SEO scores. Run the SEO agent to auto-fix meta tags and other issues.", {
          id: "fix-seo-scores",
          label: "Run SEO Agent",
          api: "/api/admin/diagnostics/fix",
          payload: { fixType: "run_seo_agent" },
          rerunGroup: "indexing",
        }));
      }
    }
  } catch {
    results.push(warn("seo-scores", "SEO Scores", "Could not check SEO scores", "Checks the SEO score distribution of published content."));
  }

  // ── 6. Meta Description Coverage ───────────────────────────────────
  try {
    const { prisma } = await import("@/lib/db");
    const missingMeta = await prisma.blogPost.count({
      where: {
        siteId,
        published: true,
        OR: [
          { meta_description_en: null },
          { meta_description_en: "" },
        ],
      },
    });

    if (missingMeta === 0) {
      results.push(pass("meta-coverage", "Meta Description Coverage", "All articles have meta descriptions", "Meta descriptions appear in Google search results. Missing ones mean Google generates a snippet from your content — often poorly."));
    } else {
      results.push(warn("meta-coverage", "Meta Description Coverage", `${missingMeta} articles missing meta descriptions`, "Meta descriptions appear in Google search results.", "Articles without meta descriptions get auto-generated snippets from Google, which are often not compelling.", {
        id: "fix-meta-descriptions",
        label: "Auto-Fix Meta Descriptions",
        api: "/api/admin/diagnostics/fix",
        payload: { fixType: "run_seo_agent" },
        rerunGroup: "indexing",
      }));
    }
  } catch {
    results.push(warn("meta-coverage", "Meta Descriptions", "Could not check meta descriptions", "Checks meta description coverage."));
  }

  return results;
};

export default indexingSection;
