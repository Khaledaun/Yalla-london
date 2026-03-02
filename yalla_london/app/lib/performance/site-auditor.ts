/**
 * PageSpeed Insights Site Auditor
 *
 * Batch-audits all key pages of a site using Google's free PageSpeed Insights API.
 * Returns Lighthouse scores + Core Web Vitals for every page.
 *
 * Why PSI instead of Unlighthouse?
 * - PSI runs on Google's servers (no headless browser needed)
 * - Works from Vercel serverless (just HTTP calls)
 * - Free: 25,000 requests/day without API key, 25,000/day with key
 * - Returns real CrUX data when available (field data from actual users)
 */

export interface PageAuditResult {
  url: string;
  strategy: "mobile" | "desktop";
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;
  // Core Web Vitals
  lcpMs: number | null;
  clsScore: number | null;
  inpMs: number | null;
  fcpMs: number | null;
  tbtMs: number | null;
  speedIndex: number | null;
  // Diagnostics
  diagnostics: AuditDiagnostic[];
  error: string | null;
}

export interface AuditDiagnostic {
  id: string;
  title: string;
  description: string;
  score: number | null;
  savings: string | null; // e.g. "2.1s", "450KB"
}

export interface SiteAuditResult {
  runId: string;
  siteId: string;
  strategy: "mobile" | "desktop";
  startedAt: string;
  completedAt: string;
  pages: PageAuditResult[];
  summary: {
    avgPerformance: number;
    avgAccessibility: number;
    avgBestPractices: number;
    avgSeo: number;
    avgLcpMs: number;
    avgClsScore: number;
    worstPage: string | null;
    bestPage: string | null;
    passedCwv: number;
    failedCwv: number;
  };
}

const PSI_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/**
 * Get the key URLs to audit for a site.
 * Combines static routes + recent published blog posts.
 */
export async function getAuditUrls(siteId: string, baseUrl: string): Promise<string[]> {
  const { prisma } = await import("@/lib/db");

  // Static pages every site should have
  const staticPaths = [
    "/",
    "/blog",
    "/recommendations",
    "/hotels",
    "/experiences",
    "/about",
    "/contact",
  ];

  // Add yacht-specific pages
  if (siteId === "zenitha-yachts-med") {
    staticPaths.push("/yachts", "/destinations", "/itineraries", "/charter-planner");
  }

  const urls = staticPaths.map((p) => `${baseUrl}${p}`);

  // Add 5 most recent published blog posts
  try {
    const recentPosts = await prisma.blogPost.findMany({
      where: { siteId, published: true, deletedAt: null },
      select: { slug: true },
      orderBy: { created_at: "desc" },
      take: 5,
    });
    for (const post of recentPosts) {
      if (post.slug) urls.push(`${baseUrl}/blog/${post.slug}`);
    }
  } catch (err) {
    console.warn("[site-auditor] Failed to fetch blog posts for audit:", err instanceof Error ? err.message : err);
  }

  return urls;
}

/**
 * Audit a single page using PageSpeed Insights API
 */
export async function auditPage(
  url: string,
  strategy: "mobile" | "desktop" = "mobile"
): Promise<PageAuditResult> {
  const apiKey = process.env.PAGESPEED_API_KEY || process.env.PSI_API_KEY;

  const params = new URLSearchParams();
  params.set("url", url);
  params.set("strategy", strategy);
  params.append("category", "PERFORMANCE");
  params.append("category", "ACCESSIBILITY");
  params.append("category", "BEST_PRACTICES");
  params.append("category", "SEO");
  // URLSearchParams overwrites duplicate keys, so we build the URL manually
  const queryUrl = `${PSI_API_URL}?url=${encodeURIComponent(url)}&strategy=${strategy}&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO${apiKey ? `&key=${apiKey}` : ""}`;

  try {
    const res = await fetch(queryUrl, {
      signal: AbortSignal.timeout(30_000), // 30s timeout per page
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      return {
        url,
        strategy,
        performanceScore: null,
        accessibilityScore: null,
        bestPracticesScore: null,
        seoScore: null,
        lcpMs: null,
        clsScore: null,
        inpMs: null,
        fcpMs: null,
        tbtMs: null,
        speedIndex: null,
        diagnostics: [],
        error: `HTTP ${res.status}: ${errorBody.substring(0, 200)}`,
      };
    }

    const data = await res.json();
    const lhr = data.lighthouseResult;
    if (!lhr) {
      return {
        url,
        strategy,
        performanceScore: null,
        accessibilityScore: null,
        bestPracticesScore: null,
        seoScore: null,
        lcpMs: null,
        clsScore: null,
        inpMs: null,
        fcpMs: null,
        tbtMs: null,
        speedIndex: null,
        diagnostics: [],
        error: "No Lighthouse result in PSI response",
      };
    }

    const categories = lhr.categories || {};
    const audits = lhr.audits || {};

    // Extract Core Web Vitals
    const lcpMs = audits["largest-contentful-paint"]?.numericValue ?? null;
    const clsScore = audits["cumulative-layout-shift"]?.numericValue ?? null;
    const fcpMs = audits["first-contentful-paint"]?.numericValue ?? null;
    const tbtMs = audits["total-blocking-time"]?.numericValue ?? null;
    const speedIndex = audits["speed-index"]?.numericValue ?? null;
    // INP isn't always in Lighthouse lab data — check field data first
    const inpMs = data.loadingExperience?.metrics?.INTERACTION_TO_NEXT_PAINT?.percentile ?? null;

    // Extract top diagnostics (opportunities + diagnostics with score < 1)
    const diagnostics: AuditDiagnostic[] = [];
    const diagnosticAudits = [
      "render-blocking-resources",
      "unused-css-rules",
      "unused-javascript",
      "modern-image-formats",
      "uses-optimized-images",
      "uses-text-compression",
      "server-response-time",
      "dom-size",
      "redirects",
      "uses-responsive-images",
      "efficient-animated-content",
      "third-party-summary",
      "largest-contentful-paint-element",
      "layout-shifts",
    ];

    for (const auditId of diagnosticAudits) {
      const audit = audits[auditId];
      if (audit && audit.score !== null && audit.score < 1) {
        const savings = audit.details?.overallSavingsMs
          ? `${(audit.details.overallSavingsMs / 1000).toFixed(1)}s`
          : audit.details?.overallSavingsBytes
            ? `${Math.round(audit.details.overallSavingsBytes / 1024)}KB`
            : null;

        diagnostics.push({
          id: auditId,
          title: audit.title || auditId,
          description: (audit.description || "").substring(0, 200),
          score: audit.score,
          savings,
        });
      }
    }

    return {
      url,
      strategy,
      performanceScore: categories.performance?.score != null ? Math.round(categories.performance.score * 100) : null,
      accessibilityScore: categories.accessibility?.score != null ? Math.round(categories.accessibility.score * 100) : null,
      bestPracticesScore: categories["best-practices"]?.score != null ? Math.round(categories["best-practices"].score * 100) : null,
      seoScore: categories.seo?.score != null ? Math.round(categories.seo.score * 100) : null,
      lcpMs: lcpMs != null ? Math.round(lcpMs) : null,
      clsScore: clsScore != null ? Math.round(clsScore * 1000) / 1000 : null,
      inpMs,
      fcpMs: fcpMs != null ? Math.round(fcpMs) : null,
      tbtMs: tbtMs != null ? Math.round(tbtMs) : null,
      speedIndex: speedIndex != null ? Math.round(speedIndex) : null,
      diagnostics,
      error: null,
    };
  } catch (err) {
    return {
      url,
      strategy,
      performanceScore: null,
      accessibilityScore: null,
      bestPracticesScore: null,
      seoScore: null,
      lcpMs: null,
      clsScore: null,
      inpMs: null,
      fcpMs: null,
      tbtMs: null,
      speedIndex: null,
      diagnostics: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Run a full site audit across all key pages
 */
export async function runSiteAudit(
  siteId: string,
  baseUrl: string,
  strategy: "mobile" | "desktop" = "mobile",
  budgetMs: number = 50_000
): Promise<SiteAuditResult> {
  const { randomUUID } = await import("crypto");
  const runId = `perf-${siteId}-${Date.now()}-${randomUUID().substring(0, 6)}`;
  const startedAt = new Date().toISOString();

  const urls = await getAuditUrls(siteId, baseUrl);
  const pages: PageAuditResult[] = [];
  const start = Date.now();

  // Audit pages sequentially (PSI rate limits concurrent requests)
  for (const url of urls) {
    if (Date.now() - start > budgetMs) {
      console.warn(`[site-auditor] Budget exhausted after ${pages.length}/${urls.length} pages`);
      break;
    }

    const result = await auditPage(url, strategy);
    pages.push(result);

    // Small delay between requests to be respectful to the API
    await new Promise((r) => setTimeout(r, 500));
  }

  // Calculate summary
  const scored = pages.filter((p) => p.performanceScore != null);
  const avg = (arr: (number | null)[], fallback = 0) => {
    const valid = arr.filter((v): v is number => v != null);
    return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : fallback;
  };

  const CWV_THRESHOLDS = { lcp: 2500, cls: 0.1, tbt: 200 };
  let passedCwv = 0;
  let failedCwv = 0;
  for (const p of pages) {
    if (p.lcpMs == null) continue;
    const lcpOk = (p.lcpMs ?? Infinity) <= CWV_THRESHOLDS.lcp;
    const clsOk = (p.clsScore ?? Infinity) <= CWV_THRESHOLDS.cls;
    const tbtOk = (p.tbtMs ?? Infinity) <= CWV_THRESHOLDS.tbt;
    if (lcpOk && clsOk && tbtOk) passedCwv++;
    else failedCwv++;
  }

  const worstPage = scored.length > 0
    ? scored.reduce((a, b) => ((a.performanceScore ?? 100) < (b.performanceScore ?? 100) ? a : b)).url
    : null;
  const bestPage = scored.length > 0
    ? scored.reduce((a, b) => ((a.performanceScore ?? 0) > (b.performanceScore ?? 0) ? a : b)).url
    : null;

  return {
    runId,
    siteId,
    strategy,
    startedAt,
    completedAt: new Date().toISOString(),
    pages,
    summary: {
      avgPerformance: avg(pages.map((p) => p.performanceScore)),
      avgAccessibility: avg(pages.map((p) => p.accessibilityScore)),
      avgBestPractices: avg(pages.map((p) => p.bestPracticesScore)),
      avgSeo: avg(pages.map((p) => p.seoScore)),
      avgLcpMs: avg(pages.map((p) => p.lcpMs)),
      avgClsScore: parseFloat((pages.filter((p) => p.clsScore != null).reduce((a, p) => a + (p.clsScore ?? 0), 0) / Math.max(1, pages.filter((p) => p.clsScore != null).length)).toFixed(3)),
      worstPage,
      bestPage,
      passedCwv,
      failedCwv,
    },
  };
}

/**
 * Save audit results to database
 */
export async function saveAuditResults(result: SiteAuditResult): Promise<void> {
  const { prisma } = await import("@/lib/db");

  for (const page of result.pages) {
    await prisma.performanceAudit.create({
      data: {
        siteId: result.siteId,
        url: page.url,
        strategy: result.strategy,
        performanceScore: page.performanceScore,
        accessibilityScore: page.accessibilityScore,
        bestPracticesScore: page.bestPracticesScore,
        seoScore: page.seoScore,
        lcpMs: page.lcpMs,
        clsScore: page.clsScore,
        inpMs: page.inpMs,
        fcpMs: page.fcpMs,
        tbtMs: page.tbtMs,
        speedIndex: page.speedIndex,
        diagnostics: page.diagnostics as unknown as Record<string, unknown>,
        runId: result.runId,
      },
    });
  }
}
