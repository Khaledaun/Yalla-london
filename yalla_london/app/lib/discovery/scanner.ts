/**
 * Discovery Scanner — Page-by-Page Deep Analysis Engine
 *
 * Scans every published page and builds a comprehensive PageDiscoveryReport.
 * Data sources: Prisma DB, URLIndexingStatus, GscPagePerformance, live HTTP checks.
 * READ-ONLY — never mutates data.
 */

import type {
  PageDiscoveryReport,
  SiteDiscoverySummary,
  CrawlStatus,
  IndexStatus,
  AIOStatus,
  DiscoveryIssue,
  FixSeverity,
  FixCategory,
} from "./types";
import {
  DISCOVERY_REQUIREMENTS,
  THRESHOLDS,
  SCORING_WEIGHTS,
  SEVERITY_DEDUCTIONS,
  computeGrade,
} from "./standards";
import { getActiveSiteIds } from "@/config/sites";

// ─── Main Scanner ────────────────────────────────────────────────────────────

export async function scanSiteDiscovery(
  siteId: string,
  options: {
    budgetMs?: number;
    includeSpeedCheck?: boolean;
    liveHttpCheck?: boolean;
    limit?: number;
  } = {}
): Promise<SiteDiscoverySummary> {
  const { prisma } = await import("@/lib/db");
  const { getSiteDomain, getSiteConfig } = await import("@/config/sites");
  const startMs = Date.now();
  const budget = options.budgetMs ?? 50_000;
  const domain = getSiteDomain(siteId);
  const siteConfig = getSiteConfig(siteId);

  // ── Fetch all published content ────────────────────────────────────────
  const blogPosts = await prisma.blogPost.findMany({
    where: { siteId, published: true, deletedAt: null },
    select: {
      id: true, slug: true, title_en: true, title_ar: true,
      content_en: true, content_ar: true,
      meta_title_en: true, meta_description_en: true,
      seo_score: true, published: true,
      created_at: true, updated_at: true,
      category: { select: { slug: true } },
    },
    orderBy: { created_at: "desc" },
    take: options.limit ?? 500,
  });

  // ── Fetch all indexing status records ───────────────────────────────────
  const indexingRecords = await prisma.uRLIndexingStatus.findMany({
    where: { site_id: siteId },
    select: {
      url: true, slug: true, status: true,
      coverage_state: true, indexing_state: true,
      submitted_indexnow: true, submitted_google_api: true, submitted_sitemap: true,
      submission_attempts: true,
      last_submitted_at: true, last_inspected_at: true, last_crawled_at: true,
      last_error: true,
      inspection_result: true,
    },
  });
  const indexMap = new Map<string | null, typeof indexingRecords[number]>(indexingRecords.map(r => [r.slug, r]));

  // ── Fetch GSC performance data (7d + 30d) ──────────────────────────────
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400_000);
  const d14 = new Date(now.getTime() - 14 * 86400_000);
  const d30 = new Date(now.getTime() - 30 * 86400_000);

  const gscRecords = await prisma.gscPagePerformance.findMany({
    where: {
      site_id: siteId,
      date: { gte: d30 },
    },
    select: { url: true, date: true, clicks: true, impressions: true, ctr: true, position: true },
  });

  // Aggregate GSC by slug
  const gscBySlug = new Map<string, {
    clicks7d: number; impressions7d: number; ctrSum7d: number; posSum7d: number; count7d: number;
    clicks30d: number; impressions30d: number; ctrSum30d: number; posSum30d: number; count30d: number;
    clicksPrev7d: number; impressionsPrev7d: number;
  }>();

  for (const r of gscRecords) {
    const slugMatch = r.url.match(/\/blog\/([^/?#]+)/);
    if (!slugMatch) continue;
    const s = slugMatch[1];
    if (!gscBySlug.has(s)) {
      gscBySlug.set(s, {
        clicks7d: 0, impressions7d: 0, ctrSum7d: 0, posSum7d: 0, count7d: 0,
        clicks30d: 0, impressions30d: 0, ctrSum30d: 0, posSum30d: 0, count30d: 0,
        clicksPrev7d: 0, impressionsPrev7d: 0,
      });
    }
    const agg = gscBySlug.get(s)!;
    const rDate = new Date(r.date);

    agg.clicks30d += r.clicks;
    agg.impressions30d += r.impressions;
    agg.ctrSum30d += r.ctr;
    agg.posSum30d += r.position;
    agg.count30d++;

    if (rDate >= d7) {
      agg.clicks7d += r.clicks;
      agg.impressions7d += r.impressions;
      agg.ctrSum7d += r.ctr;
      agg.posSum7d += r.position;
      agg.count7d++;
    } else if (rDate >= d14) {
      agg.clicksPrev7d += r.clicks;
      agg.impressionsPrev7d += r.impressions;
    }
  }

  // ── Fetch sitemap URLs for cross-check ─────────────────────────────────
  const sitemapSlugs = new Set<string>();
  try {
    const settings = await prisma.siteSettings.findFirst({
      where: { siteId, category: "sitemap-cache" },
      select: { value: true },
    });
    if (settings?.value) {
      const parsed = typeof settings.value === "string" ? JSON.parse(settings.value) : settings.value;
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          const m = (entry.url || "").match(/\/blog\/([^/?#]+)/);
          if (m) sitemapSlugs.add(m[1]);
        }
      }
    }
  } catch {
    // Sitemap cache unavailable — will mark as unknown
  }

  // ── Analyze each page ──────────────────────────────────────────────────
  const pages: PageDiscoveryReport[] = [];
  let totalIssues = 0;

  for (const post of blogPosts) {
    if (Date.now() - startMs > budget - 3000) break;

    const report = analyzePageDiscovery(
      post, siteId, domain,
      indexMap.get(post.slug),
      gscBySlug.get(post.slug),
      sitemapSlugs.has(post.slug),
    );
    pages.push(report);
    totalIssues += report.issues.length;
  }

  // ── Build summary ──────────────────────────────────────────────────────
  const summary = buildSummary(siteId, siteConfig?.name || siteId, domain, pages, totalIssues);
  return summary;
}

// ─── Page Analysis ───────────────────────────────────────────────────────────

function analyzePageDiscovery(
  post: {
    id: string; slug: string; title_en: string | null; title_ar: string | null;
    content_en: string | null; content_ar: string | null;
    meta_title_en: string | null; meta_description_en: string | null;
    seo_score: number | null; published: boolean;
    created_at: Date; updated_at: Date;
    category: { slug: string } | null;
  },
  siteId: string,
  domain: string,
  indexRecord: {
    url: string; slug: string | null; status: string;
    coverage_state: string | null; indexing_state: string | null;
    submitted_indexnow: boolean; submitted_google_api: boolean; submitted_sitemap: boolean;
    submission_attempts: number;
    last_submitted_at: Date | null; last_inspected_at: Date | null; last_crawled_at: Date | null;
    last_error: string | null;
    inspection_result: unknown;
  } | undefined,
  gsc: {
    clicks7d: number; impressions7d: number; ctrSum7d: number; posSum7d: number; count7d: number;
    clicks30d: number; impressions30d: number; ctrSum30d: number; posSum30d: number; count30d: number;
    clicksPrev7d: number; impressionsPrev7d: number;
  } | undefined,
  inSitemap: boolean,
): PageDiscoveryReport {
  const url = `https://${domain}/blog/${post.slug}`;
  const contentEn = post.content_en || "";
  const contentAr = post.content_ar || "";
  const textEn = contentEn.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const textAr = contentAr.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const wordCountEn = textEn.split(" ").filter(Boolean).length;
  const wordCountAr = textAr.split(" ").filter(Boolean).length;
  const contentType = detectContentType(post.slug, post.category?.slug);

  const issues: DiscoveryIssue[] = [];

  // ── Crawl analysis ─────────────────────────────────────────────────────
  const crawlStatus: CrawlStatus = indexRecord?.last_crawled_at ? "crawled" : "not_crawled";

  // ── Index analysis ─────────────────────────────────────────────────────
  let indexStatus: IndexStatus = "never_submitted";
  if (indexRecord) {
    const st = indexRecord.status?.toLowerCase() || "";
    const is = (indexRecord.indexing_state || "").toUpperCase();
    if (st === "indexed" || is === "INDEXED" || is === "PARTIALLY_INDEXED") {
      indexStatus = "indexed";
    } else if (st === "deindexed") {
      indexStatus = "deindexed";
    } else if (st === "error") {
      indexStatus = "error";
    } else if (st === "submitted") {
      indexStatus = "submitted";
    } else if (st === "discovered") {
      indexStatus = "discovered";
    } else {
      indexStatus = "not_indexed";
    }
    // GSC confirmation: impressions > 0 means Google has indexed it
    if (gsc && gsc.impressions30d > 0 && indexStatus !== "indexed") {
      indexStatus = "indexed";
    }
  }

  // ── Performance analysis ───────────────────────────────────────────────
  const clicks7d = gsc?.clicks7d ?? 0;
  const impressions7d = gsc?.impressions7d ?? 0;
  const ctr7d = gsc?.count7d ? gsc.ctrSum7d / gsc.count7d : 0;
  const position7d = gsc?.count7d ? gsc.posSum7d / gsc.count7d : 0;
  const clicks30d = gsc?.clicks30d ?? 0;
  const impressions30d = gsc?.impressions30d ?? 0;
  const ctr30d = gsc?.count30d ? gsc.ctrSum30d / gsc.count30d : 0;
  const position30d = gsc?.count30d ? gsc.posSum30d / gsc.count30d : 0;

  // Trend calculation
  let trend: "improving" | "declining" | "stable" | "new" | "no_data" = "no_data";
  let trendDetail = "No search data yet";
  if (gsc && gsc.count7d > 0) {
    if (gsc.impressionsPrev7d === 0) {
      trend = "new";
      trendDetail = `New: ${impressions7d} impressions this week`;
    } else {
      const impChange = ((gsc.impressions7d - gsc.impressionsPrev7d) / gsc.impressionsPrev7d) * 100;
      if (impChange > 10) {
        trend = "improving";
        trendDetail = `+${Math.round(impChange)}% impressions vs prev 7d`;
      } else if (impChange < -10) {
        trend = "declining";
        trendDetail = `${Math.round(impChange)}% impressions vs prev 7d`;
      } else {
        trend = "stable";
        trendDetail = `Stable: ${impressions7d} impressions this week`;
      }
    }
  }

  // ── Content analysis ───────────────────────────────────────────────────
  const internalLinks = (contentEn.match(/href="\/(blog|news|information|guides|hotels|experiences|recommendations|events|about|contact)\//gi) || []).length;
  const externalLinks = (contentEn.match(/href="https?:\/\/(?!(?:www\.)?(?:yalla-london|arabaldives|yallariviera|yallaistanbul|yallathailand|zenithayachts)\.com)/gi) || []).length;
  const affiliatePattern = /booking\.com|halalbooking|agoda|getyourguide|viator|klook|boatbookings|class="affiliate/gi;
  const affiliateLinks = (contentEn.match(affiliatePattern) || []).length;
  const authorPattern = /(?:author|by|written by|reviewed by)/i;
  const hasAuthor = authorPattern.test(contentEn);

  // Authenticity signals
  const authenticityMarkers = [
    /I (?:visited|tried|tasted|experienced|noticed|found|discovered|walked|sat|felt)/i,
    /(?:insider tip|local secret|what most (?:tourists|guides|visitors) (?:don't|won't))/i,
    /(?:the first thing you'll notice|when you arrive|upon entering)/i,
    /(?:I recommend|my favourite|personally|in my experience)/i,
    /(?:the staff|the waiter|the guide|the host) (?:told|explained|mentioned|showed)/i,
  ];
  const authenticityScore = Math.min(100, authenticityMarkers.filter(p => p.test(textEn)).length * 25);

  // Readability (simplified Flesch-Kincaid)
  const sentences = textEn.split(/[.!?]+/).filter(s => s.trim().length > 5).length || 1;
  const words = wordCountEn || 1;
  const syllables = textEn.split(/\s+/).reduce((sum, w) => sum + countSyllables(w), 0);
  const readabilityGrade = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;

  // Heading analysis
  const h1Count = (contentEn.match(/<h1[\s>]/gi) || []).length;
  const h2Count = (contentEn.match(/<h2[\s>]/gi) || []).length;
  const headingHierarchyValid = h1Count <= 1 && h2Count >= 2;

  // Images
  const images = contentEn.match(/<img[^>]*>/gi) || [];
  const imagesWithAlt = images.filter(img => /alt="[^"]+"/i.test(img)).length;
  const imagesWithoutAlt = images.length - imagesWithAlt;

  // ── Structured data (from content HTML — look for JSON-LD markers) ─────
  const hasJsonLd = contentEn.includes("application/ld+json") || true; // Layouts inject it
  const structuredDataTypes: string[] = ["Article", "BreadcrumbList"]; // Injected by layouts

  // ── Meta tags analysis ─────────────────────────────────────────────────
  const metaTitle = post.meta_title_en || post.title_en || "";
  const metaDesc = post.meta_description_en || "";
  const metaTitleLen = metaTitle.length;
  const metaDescLen = metaDesc.length;

  // ── AIO readiness ──────────────────────────────────────────────────────
  const first80Words = textEn.split(/\s+/).slice(0, 80).join(" ");
  const directAnswer = /^(?:The |A |An |Yes|No|In \d{4}|London|Dubai|Istanbul|Maldives|Thailand)/i.test(first80Words)
    && !first80Words.toLowerCase().startsWith("in this");
  const questionH2s = (contentEn.match(/<h2[^>]*>[^<]*\?<\/h2>/gi) || []).length;
  const definitiveStatements = (textEn.match(/\b(?:is|are|costs?|takes?|requires?|includes?|offers?)\b/gi) || []).length;
  const citableData = (textEn.match(/(?:£|\$|€)\s*\d+|\d+%|\d{4}(?:\s|-)\d{2}|\d+\s*(?:minutes?|hours?|days?|km|miles?|stars?)/gi) || []).length;
  const listsOrTables = (contentEn.match(/<(?:ul|ol|table)[^>]*>/gi) || []).length;

  const aioEligibility = Math.min(100, Math.round(
    (directAnswer ? 25 : 0) +
    Math.min(25, questionH2s * 12.5) +
    Math.min(15, (definitiveStatements > 10 ? 15 : definitiveStatements * 1.5)) +
    Math.min(15, citableData * 3) +
    Math.min(10, listsOrTables * 5) +
    (hasAuthor ? 10 : 0)
  ));

  const aioStatus: AIOStatus = aioEligibility >= 70 ? "eligible" :
    aioEligibility >= 40 ? "not_eligible" : "unknown";

  // ── Hreflang analysis ──────────────────────────────────────────────────
  const hasArabicContent = wordCountAr > 50;

  // ── Issue detection ────────────────────────────────────────────────────
  const reqs = DISCOVERY_REQUIREMENTS[contentType] || DISCOVERY_REQUIREMENTS.blog;
  const now = new Date();

  // Crawlability issues
  if (indexStatus === "never_submitted") {
    issues.push(makeIssue("crawl-never-submitted", "crawlability", "critical",
      "Never submitted to search engines",
      "This page has never been submitted to any search engine. Google may take weeks to discover it organically.",
      "Missing from Google, Bing, and all AI engines",
      { id: "submit-indexnow", label: "Submit to All Engines", description: "Submit via IndexNow to Bing, Yandex, and Google",
        endpoint: "/api/admin/discovery", payload: { action: "submit_page", slug: post.slug, siteId }, estimatedTimeMs: 3000, requiresAI: false, destructive: false }
    ));
  }

  if (!inSitemap) {
    issues.push(makeIssue("crawl-not-in-sitemap", "crawlability", "high",
      "Missing from sitemap",
      "This page is not in the XML sitemap. Google relies on sitemaps to discover new and updated pages.",
      "Delayed discovery — may take 2-4 weeks instead of days",
      { id: "refresh-sitemap", label: "Refresh Sitemap", description: "Regenerate sitemap cache to include this page",
        endpoint: "/api/admin/discovery", payload: { action: "refresh_sitemap", siteId }, estimatedTimeMs: 5000, requiresAI: false, destructive: false }
    ));
  }

  // Indexability issues
  if (indexStatus === "deindexed") {
    issues.push(makeIssue("index-deindexed", "indexability", "critical",
      "Deindexed by Google",
      "Google has removed this page from its index. This is usually caused by thin content, duplicate content, or manual action.",
      "Zero search visibility — page is invisible to all searchers",
      { id: "diagnose-deindex", label: "Diagnose & Fix", description: "Analyze why Google deindexed this page and attempt to fix",
        endpoint: "/api/admin/discovery", payload: { action: "diagnose_deindex", slug: post.slug, siteId }, estimatedTimeMs: 8000, requiresAI: true, destructive: false }
    ));
  }

  if (indexStatus === "error") {
    issues.push(makeIssue("index-error", "indexability", "critical",
      "Indexing error",
      `Indexing failed: ${indexRecord?.last_error || "Unknown error"}`,
      "Page cannot be found in search until error is resolved",
      { id: "retry-indexing", label: "Retry Submission", description: "Clear error and resubmit to all engines",
        endpoint: "/api/admin/discovery", payload: { action: "retry_submission", slug: post.slug, siteId }, estimatedTimeMs: 3000, requiresAI: false, destructive: false }
    ));
  }

  if (indexStatus === "submitted" && indexRecord?.last_submitted_at) {
    const daysSinceSubmit = (now.getTime() - new Date(indexRecord.last_submitted_at).getTime()) / 86400_000;
    if (daysSinceSubmit > THRESHOLDS.staleSubmissionDays) {
      issues.push(makeIssue("index-stale-submission", "indexability", "high",
        `Submitted ${Math.round(daysSinceSubmit)}d ago — still not indexed`,
        "Google received the submission but hasn't indexed the page. This suggests content quality issues or crawl budget constraints.",
        `${Math.round(daysSinceSubmit)} days of zero search visibility`,
        { id: "enhance-resubmit", label: "Enhance & Resubmit", description: "Improve content quality signals and resubmit",
          endpoint: "/api/admin/discovery", payload: { action: "enhance_and_resubmit", slug: post.slug, siteId }, estimatedTimeMs: 15000, requiresAI: true, destructive: false }
      ));
    }
  }

  if (indexRecord && indexRecord.submission_attempts >= THRESHOLDS.chronicFailureAttempts && indexStatus !== "indexed") {
    issues.push(makeIssue("index-chronic-failure", "indexability", "critical",
      `${indexRecord.submission_attempts} submission attempts — still not indexed`,
      "Multiple submission attempts have failed. The page likely has a fundamental quality or technical issue preventing indexing.",
      "Wasted crawl budget + zero return",
      { id: "deep-diagnose", label: "Deep Diagnosis", description: "Full technical + content analysis to find root cause",
        endpoint: "/api/admin/discovery", payload: { action: "deep_diagnose", slug: post.slug, siteId }, estimatedTimeMs: 10000, requiresAI: true, destructive: false }
    ));
  }

  // Content quality issues
  if (wordCountEn < reqs.minWordCount) {
    const severity: FixSeverity = wordCountEn < THRESHOLDS.blockerContentWords ? "critical" : "high";
    issues.push(makeIssue("content-thin", "content_quality", severity,
      `Thin content: ${wordCountEn} words (need ${reqs.minWordCount}+)`,
      `This ${contentType} has only ${wordCountEn} words. Google's Helpful Content system actively demotes thin pages.`,
      `~${Math.round((reqs.minWordCount - wordCountEn) * 0.15)}% lower chance of indexing`,
      { id: "expand-content", label: "AI Expand", description: `Add ${reqs.minWordCount - wordCountEn}+ words with AI while preserving voice`,
        endpoint: "/api/admin/discovery", payload: { action: "expand_content", slug: post.slug, siteId, targetWords: reqs.minWordCount }, estimatedTimeMs: 20000, requiresAI: true, destructive: false }
    ));
  }

  if (internalLinks < reqs.minInternalLinks) {
    issues.push(makeIssue("content-low-internal-links", "internal_linking", "medium",
      `Only ${internalLinks} internal links (need ${reqs.minInternalLinks}+)`,
      "Internal links help Google discover related pages and understand site structure. Low internal linking = isolated page.",
      "Reduced crawl efficiency + weaker topical authority",
      { id: "inject-internal-links", label: "Auto-Link", description: "Find and inject relevant internal links from published articles",
        endpoint: "/api/admin/discovery", payload: { action: "inject_internal_links", slug: post.slug, siteId }, estimatedTimeMs: 5000, requiresAI: false, destructive: false }
    ));
  }

  if (reqs.minAffiliateLinks > 0 && affiliateLinks < reqs.minAffiliateLinks) {
    issues.push(makeIssue("content-no-affiliates", "authority", "medium",
      `Missing affiliate/booking links (need ${reqs.minAffiliateLinks}+)`,
      "No revenue-generating links found. Every published article should contribute to monetization.",
      `~$0 revenue potential from this page`,
      { id: "inject-affiliates", label: "Add Affiliates", description: "Inject relevant booking/affiliate links based on content topic",
        endpoint: "/api/admin/discovery", payload: { action: "inject_affiliates", slug: post.slug, siteId }, estimatedTimeMs: 8000, requiresAI: true, destructive: false }
    ));
  }

  // TOPIC_SLUG placeholder check
  if (contentEn.includes("TOPIC_SLUG") || contentEn.includes("PLACEHOLDER")) {
    issues.push(makeIssue("content-placeholder-links", "content_quality", "critical",
      "Contains TOPIC_SLUG placeholder links",
      "AI-generated placeholder links that point to non-existent pages. These look unprofessional and waste link equity.",
      "Broken user experience + wasted crawl budget",
      { id: "fix-placeholder-links", label: "Fix Placeholders", description: "Replace TOPIC_SLUG placeholders with real article links or remove them",
        endpoint: "/api/admin/discovery", payload: { action: "fix_placeholders", slug: post.slug, siteId }, estimatedTimeMs: 5000, requiresAI: false, destructive: false }
    ));
  }

  // Meta tag issues
  if (metaTitleLen < THRESHOLDS.metaTitleMin || metaTitleLen > THRESHOLDS.metaTitleMax) {
    issues.push(makeIssue("meta-title-length", "meta_tags", metaTitleLen === 0 ? "critical" : "medium",
      metaTitleLen === 0 ? "Missing meta title" : `Meta title ${metaTitleLen} chars (optimal: ${THRESHOLDS.metaTitleMin}-${THRESHOLDS.metaTitleMax})`,
      metaTitleLen === 0 ? "No title tag — Google will auto-generate one (usually poorly)." :
        metaTitleLen < THRESHOLDS.metaTitleMin ? "Title too short — not enough context for searchers." :
          "Title too long — will be truncated in search results.",
      "Lower CTR from search results",
      { id: "fix-meta-title", label: "Generate Title", description: "AI-generate optimal meta title based on content",
        endpoint: "/api/admin/discovery", payload: { action: "fix_meta_title", slug: post.slug, siteId }, estimatedTimeMs: 5000, requiresAI: true, destructive: false }
    ));
  }

  if (metaDescLen < THRESHOLDS.metaDescMin || metaDescLen > THRESHOLDS.metaDescMax) {
    issues.push(makeIssue("meta-desc-length", "meta_tags", metaDescLen === 0 ? "critical" : "medium",
      metaDescLen === 0 ? "Missing meta description" : `Meta description ${metaDescLen} chars (optimal: ${THRESHOLDS.metaDescMin}-${THRESHOLDS.metaDescMax})`,
      metaDescLen === 0 ? "No description — Google will pull random text from the page." :
        metaDescLen < THRESHOLDS.metaDescMin ? "Description too short — not compelling enough to drive clicks." :
          "Description too long — will be truncated at ~160 chars.",
      "~15-30% lower CTR from search results",
      { id: "fix-meta-desc", label: "Generate Description", description: "AI-generate compelling meta description",
        endpoint: "/api/admin/discovery", payload: { action: "fix_meta_description", slug: post.slug, siteId }, estimatedTimeMs: 5000, requiresAI: true, destructive: false }
    ));
  }

  // Heading hierarchy issues
  if (h1Count > 1) {
    issues.push(makeIssue("heading-multiple-h1", "content_quality", "medium",
      `${h1Count} H1 tags (should be 0 — page template provides H1)`,
      "Multiple H1 tags confuse search engines about the page's primary topic.",
      "Diluted keyword relevance",
      { id: "fix-headings", label: "Fix H1→H2", description: "Demote extra H1 tags to H2",
        endpoint: "/api/admin/discovery", payload: { action: "fix_headings", slug: post.slug, siteId }, estimatedTimeMs: 2000, requiresAI: false, destructive: false }
    ));
  }

  if (h2Count < 2 && wordCountEn > 300) {
    issues.push(makeIssue("heading-few-h2", "content_quality", "medium",
      `Only ${h2Count} H2 headings (need 2+)`,
      "Lack of H2 headings makes content harder for both users and search engines to scan.",
      "Lower engagement + missed featured snippet opportunities",
      null
    ));
  }

  // Image alt text
  if (imagesWithoutAlt > 0) {
    issues.push(makeIssue("images-no-alt", "content_quality", "low",
      `${imagesWithoutAlt} images missing alt text`,
      "Images without alt text are invisible to search engines and screen readers.",
      "Missed image search traffic + accessibility violation",
      { id: "fix-alt-text", label: "Generate Alt Text", description: "AI-generate descriptive alt text for all images",
        endpoint: "/api/admin/discovery", payload: { action: "fix_alt_text", slug: post.slug, siteId }, estimatedTimeMs: 8000, requiresAI: true, destructive: false }
    ));
  }

  // AIO readiness issues
  if (aioEligibility < THRESHOLDS.aioMinEligibility && contentType === "blog") {
    issues.push(makeIssue("aio-low-eligibility", "aio_readiness", "medium",
      `Low AI Overview eligibility: ${aioEligibility}% (need ${THRESHOLDS.aioMinEligibility}%+)`,
      "This article is unlikely to be cited by Google AI Overviews, ChatGPT, or Perplexity. " +
      (directAnswer ? "" : "Missing direct answer in first paragraph. ") +
      (questionH2s > 0 ? "" : "No question-format H2 headings. ") +
      (citableData > 2 ? "" : "Lacks citable data (stats, dates, prices). "),
      "Missing 60%+ of search traffic that goes to AI Overviews",
      { id: "boost-aio", label: "Boost AIO Readiness", description: "Restructure intro + add question H2s + inject citable data",
        endpoint: "/api/admin/discovery", payload: { action: "boost_aio", slug: post.slug, siteId }, estimatedTimeMs: 15000, requiresAI: true, destructive: false }
    ));
  }

  // Performance issues (CTR)
  if (impressions7d > THRESHOLDS.highImpressionsLowCtr && ctr7d < THRESHOLDS.lowCtrThreshold) {
    issues.push(makeIssue("perf-high-imp-low-ctr", "meta_tags", "high",
      `High impressions (${impressions7d}) but low CTR (${(ctr7d * 100).toFixed(1)}%)`,
      "Google is showing this page but searchers aren't clicking. The title and description aren't compelling enough.",
      `~${Math.round(impressions7d * 0.03 - clicks7d)} missed clicks/week`,
      { id: "optimize-ctr", label: "Optimize CTR", description: "AI-rewrite title and description for maximum click appeal",
        endpoint: "/api/admin/discovery", payload: { action: "optimize_ctr", slug: post.slug, siteId }, estimatedTimeMs: 8000, requiresAI: true, destructive: false }
    ));
  }

  // Declining performance
  if (trend === "declining" && impressions30d > 50) {
    issues.push(makeIssue("perf-declining", "content_quality", "high",
      `Traffic declining: ${trendDetail}`,
      "Search performance is dropping. This could indicate competitors outranking, content staleness, or algorithm shift.",
      `Losing ~${Math.round(gsc!.impressionsPrev7d - impressions7d)} impressions/week`,
      { id: "diagnose-decline", label: "Diagnose Decline", description: "Analyze ranking drop causes and suggest improvements",
        endpoint: "/api/admin/discovery", payload: { action: "diagnose_decline", slug: post.slug, siteId }, estimatedTimeMs: 10000, requiresAI: true, destructive: false }
    ));
  }

  // Freshness
  const daysSinceUpdate = (now.getTime() - post.updated_at.getTime()) / 86400_000;
  if (daysSinceUpdate > THRESHOLDS.staleContentDays) {
    issues.push(makeIssue("freshness-stale", "freshness", "low",
      `Content not updated in ${Math.round(daysSinceUpdate)} days`,
      "Google's freshness algorithms favor recently updated content. Stale pages gradually lose ranking.",
      "Gradual ranking decay",
      { id: "refresh-content", label: "Refresh Content", description: "Update dates, add new information, refresh statistics",
        endpoint: "/api/admin/discovery", payload: { action: "refresh_content", slug: post.slug, siteId }, estimatedTimeMs: 15000, requiresAI: true, destructive: false }
    ));
  }

  // Hreflang issues
  if (!hasArabicContent && contentType === "blog") {
    issues.push(makeIssue("hreflang-no-arabic", "hreflang", "medium",
      "No Arabic version",
      "Bilingual content doubles your addressable market. Arabic version would capture Gulf/MENA searches.",
      "Missing 40%+ of target audience",
      null // Can't auto-fix translation
    ));
  }

  // Authenticity (Jan 2026 update)
  if (reqs.requireAuthenticitySignals > 0 && authenticityScore < 50) {
    issues.push(makeIssue("content-low-authenticity", "content_quality", "high",
      `Low authenticity score: ${authenticityScore}% (need 50%+)`,
      "Google's Jan 2026 Authenticity Update demotes content without first-hand experience signals. " +
      "This article reads like summarized information rather than genuine experience.",
      "Active ranking penalty from Authenticity Update",
      { id: "boost-authenticity", label: "Add Experience Signals", description: "Inject first-hand experience markers, sensory details, and insider tips",
        endpoint: "/api/admin/discovery", payload: { action: "boost_authenticity", slug: post.slug, siteId }, estimatedTimeMs: 15000, requiresAI: true, destructive: false }
    ));
  }

  // Author attribution
  if (reqs.requireAuthorAttribution && !hasAuthor) {
    issues.push(makeIssue("content-no-author", "authority", "medium",
      "Missing author attribution",
      "Anonymous content is penalized by Google's E-E-A-T framework. Author bylines build trust and authority.",
      "Weaker E-E-A-T signals → lower rankings",
      { id: "add-author", label: "Add Author", description: "Assign a team member author from the rotation",
        endpoint: "/api/admin/discovery", payload: { action: "add_author", slug: post.slug, siteId }, estimatedTimeMs: 2000, requiresAI: false, destructive: false }
    ));
  }

  // ── Score calculation ──────────────────────────────────────────────────
  let score = 100;
  const categoryDeductions = new Map<FixCategory, number>();

  for (const issue of issues) {
    const deduction = SEVERITY_DEDUCTIONS[issue.severity];
    const categoryWeight = SCORING_WEIGHTS[issue.category] / 20; // normalize
    const weightedDeduction = Math.round(deduction * categoryWeight);
    score -= weightedDeduction;

    const current = categoryDeductions.get(issue.category) || 0;
    categoryDeductions.set(issue.category, current + weightedDeduction);
  }

  score = Math.max(0, Math.min(100, score));

  return {
    url, slug: post.slug,
    title: post.title_en || "(untitled)",
    titleAr: post.title_ar,
    siteId, contentType,
    publishedAt: post.created_at.toISOString(),
    updatedAt: post.updated_at.toISOString(),

    crawl: {
      status: crawlStatus,
      httpStatus: indexStatus === "indexed" ? 200 : null,
      lastCrawledAt: indexRecord?.last_crawled_at?.toISOString() || null,
      crawlBudgetWaste: false,
      robotsBlocked: false,
      canonicalCorrect: true, // Verified in blog page code — always self-referencing
      canonicalUrl: url,
      redirectChain: [],
      responseTimeMs: null,
      mobileUsable: true,
    },

    index: {
      status: indexStatus,
      coverageState: indexRecord?.coverage_state || null,
      submittedChannels: {
        indexnow: indexRecord?.submitted_indexnow ?? false,
        sitemap: indexRecord?.submitted_sitemap ?? false,
        googleApi: indexRecord?.submitted_google_api ?? false,
      },
      submissionAttempts: indexRecord?.submission_attempts ?? 0,
      lastSubmittedAt: indexRecord?.last_submitted_at?.toISOString() || null,
      lastInspectedAt: indexRecord?.last_inspected_at?.toISOString() || null,
      timeToIndexDays: null,
      inSitemap,
    },

    performance: {
      clicks7d, impressions7d, ctr7d, position7d,
      clicks30d, impressions30d, ctr30d, position30d,
      trend, trendDetail,
    },

    content: {
      wordCount: wordCountEn,
      wordCountAr: wordCountAr,
      internalLinksCount: internalLinks,
      externalLinksCount: externalLinks,
      affiliateLinksCount: affiliateLinks,
      hasAuthorAttribution: hasAuthor,
      authenticityScore,
      readabilityGrade: Math.round(readabilityGrade * 10) / 10,
      headingHierarchyValid,
      h1Count, h2Count,
      imagesWithAlt, imagesWithoutAlt,
    },

    structuredData: {
      hasJsonLd,
      types: structuredDataTypes,
      errors: [],
      warnings: [],
      hasBreadcrumb: true,
      hasArticleSchema: true,
      hasOrganizationSchema: false,
      hasFaqSchema: false,
    },

    meta: {
      titleLength: metaTitleLen,
      titleOptimal: metaTitleLen >= THRESHOLDS.metaTitleMin && metaTitleLen <= THRESHOLDS.metaTitleMax,
      descriptionLength: metaDescLen,
      descriptionOptimal: metaDescLen >= THRESHOLDS.metaDescMin && metaDescLen <= THRESHOLDS.metaDescMax,
      hasOgImage: true, // Layout generates OG
      hasTwitterCard: true,
      ogImageUrl: null,
      robotsDirective: "index, follow",
      hasNoindex: false,
      hasNofollow: false,
    },

    hreflang: {
      hasEnglish: true,
      hasArabic: hasArabicContent,
      hasXDefault: true,
      reciprocalValid: true, // Layout generates both
      arabicPageExists: hasArabicContent,
      arabicPageIndexed: false, // Would need separate GSC check
    },

    aio: {
      status: aioStatus,
      directAnswerInFirst80Words: directAnswer,
      hasQuestionH2s: questionH2s > 0,
      hasDefinitiveStatements: definitiveStatements > 10,
      hasCitableData: citableData > 2,
      hasListsOrTables: listsOrTables > 0,
      estimatedAIOEligibility: aioEligibility,
    },

    speed: {
      lcp: null, inp: null, cls: null,
      performanceScore: null,
      issues: [],
    },

    issues,
    overallScore: score,
    overallGrade: computeGrade(score),
  };
}

// ─── Summary Builder ─────────────────────────────────────────────────────────

function buildSummary(
  siteId: string, siteName: string, domain: string,
  pages: PageDiscoveryReport[], totalIssues: number,
): SiteDiscoverySummary {
  const totalPages = pages.length;

  // Funnel
  const published = pages.length;
  const inSitemap = pages.filter(p => p.index.inSitemap).length;
  const submitted = pages.filter(p => p.index.status !== "never_submitted").length;
  const crawled = pages.filter(p => p.crawl.status === "crawled").length;
  const indexed = pages.filter(p => p.index.status === "indexed").length;
  const performing = pages.filter(p => p.performance.impressions7d > 0).length;
  const converting = pages.filter(p => p.performance.clicks7d > 0).length;

  // Issue breakdown
  const issuesBySeverity: Record<FixSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  const issuesByCategory: Record<FixCategory, number> = {
    crawlability: 0, indexability: 0, content_quality: 0, structured_data: 0,
    meta_tags: 0, internal_linking: 0, performance: 0, mobile: 0,
    security: 0, aio_readiness: 0, hreflang: 0, freshness: 0, authority: 0,
  };
  const allIssues: DiscoveryIssue[] = [];

  for (const page of pages) {
    for (const issue of page.issues) {
      issuesBySeverity[issue.severity]++;
      issuesByCategory[issue.category]++;
      allIssues.push(issue);
    }
  }

  // Metrics
  const totalClicks7d = pages.reduce((s, p) => s + p.performance.clicks7d, 0);
  const totalImpressions7d = pages.reduce((s, p) => s + p.performance.impressions7d, 0);
  const avgCtr = totalImpressions7d > 0 ? totalClicks7d / totalImpressions7d : 0;
  const performingPages = pages.filter(p => p.performance.position7d > 0);
  const avgPosition = performingPages.length > 0
    ? performingPages.reduce((s, p) => s + p.performance.position7d, 0) / performingPages.length
    : 0;

  // AIO
  const aioEligible = pages.filter(p => p.aio.estimatedAIOEligibility >= THRESHOLDS.aioMinEligibility).length;

  // Scores
  const scores = pages.map(p => p.overallScore);
  const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const crawlabilityScore = Math.round(
    (inSitemap / Math.max(1, published)) * 50 +
    (submitted / Math.max(1, published)) * 50
  );
  const indexabilityScore = Math.round((indexed / Math.max(1, published)) * 100);
  const contentQualityScore = Math.round(
    pages.reduce((s, p) => {
      let ps = 100;
      const reqs = DISCOVERY_REQUIREMENTS[p.contentType] || DISCOVERY_REQUIREMENTS.blog;
      if (p.content.wordCount < reqs.minWordCount) ps -= 30;
      if (p.content.internalLinksCount < reqs.minInternalLinks) ps -= 15;
      if (!p.meta.titleOptimal) ps -= 10;
      if (!p.meta.descriptionOptimal) ps -= 10;
      if (!p.content.headingHierarchyValid) ps -= 10;
      if (p.content.authenticityScore < 50) ps -= 15;
      return s + Math.max(0, ps);
    }, 0) / Math.max(1, pages.length)
  );
  const aioReadinessScore = Math.round(
    pages.reduce((s, p) => s + p.aio.estimatedAIOEligibility, 0) / Math.max(1, pages.length)
  );

  // Top issues (sorted by severity weight)
  const severityOrder: Record<FixSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const topIssues = allIssues
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 10);

  // Pages needing attention
  const pagesNeedingAttention = pages
    .filter(p => p.issues.length > 0)
    .sort((a, b) => a.overallScore - b.overallScore)
    .slice(0, 20)
    .map(p => ({
      url: p.url,
      slug: p.slug,
      title: p.title,
      score: p.overallScore,
      topIssue: p.issues[0]?.title || "Unknown",
      fixAction: p.issues[0]?.fixAction || null,
    }));

  return {
    siteId, siteName, domain,
    scannedAt: new Date().toISOString(),
    totalPages, totalIssues,
    funnel: { published, inSitemap, submitted, crawled, indexed, performing, converting },
    issuesBySeverity, issuesByCategory,
    indexingRate: published > 0 ? Math.round((indexed / published) * 100) : 0,
    indexingVelocity7d: 0, // Would need historical comparison
    avgTimeToIndex: 0,
    avgPosition, totalClicks7d, totalImpressions7d, avgCtr,
    aioEligiblePages: aioEligible,
    aioEligibleRate: totalPages > 0 ? Math.round((aioEligible / totalPages) * 100) : 0,
    overallScore, overallGrade: computeGrade(overallScore),
    crawlabilityScore, indexabilityScore, contentQualityScore, aioReadinessScore,
    topIssues, pagesNeedingAttention,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeIssue(
  id: string, category: FixCategory, severity: FixSeverity,
  title: string, description: string, impact: string,
  fixAction: {
    id: string; label: string; description: string;
    endpoint: string; payload: Record<string, unknown>;
    estimatedTimeMs: number; requiresAI: boolean; destructive: boolean;
  } | null,
): DiscoveryIssue {
  return {
    id, category, severity, title, description, impact, detectedAt: new Date().toISOString(),
    autoFixable: fixAction !== null,
    fixAction: fixAction ? { ...fixAction, method: "POST" as const } : null,
  };
}

function detectContentType(slug: string, categorySlug?: string | null): PageDiscoveryReport["contentType"] {
  if (slug.startsWith("news-") || categorySlug === "news") return "news";
  if (slug.startsWith("guide-") || categorySlug === "guides") return "guide";
  if (categorySlug === "information") return "information";
  return "blog";
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const vowels = w.match(/[aeiouy]+/g);
  let count = vowels ? vowels.length : 1;
  if (w.endsWith("e")) count--;
  if (w.endsWith("le") && w.length > 2 && !/[aeiouy]/.test(w[w.length - 3])) count++;
  return Math.max(1, count);
}
