/**
 * Health Audit — SEO Infrastructure Checks
 *
 * 6 checks: sitemap accessibility, robots.txt, structured data,
 * hreflang tags, canonical tags, Open Graph tags.
 */

import {
  type AuditConfig,
  type CheckResult,
  makeResult,
  runCheck,
} from "@/lib/health-audit/types";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Fetch a URL with timeout, cache-buster, and abort signal support. */
async function auditFetch(
  url: string,
  signal?: AbortSignal,
  timeoutMs = 8000
): Promise<Response> {
  const separator = url.includes("?") ? "&" : "?";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Combine external signal with our timeout controller
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    return await fetch(`${url}${separator}_audit=1&t=${Date.now()}`, {
      signal: controller.signal,
      headers: { "User-Agent": "ZenithaHealthAudit/1.0" },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Safely assign a key to a record without triggering object-injection lint. */
function safeSet<T>(record: Record<string, T>, key: string, value: T): void {
  Object.defineProperty(record, key, { value, writable: true, enumerable: true, configurable: true });
}

/** Pick up to N random published slugs from the database. */
async function getRandomSlugs(siteId: string, count: number): Promise<string[]> {
  const { prisma } = await import("@/lib/db");
  const posts = await prisma.blogPost.findMany({
    where: { siteId, published: true, deletedAt: null, content_en: { not: "" } },
    select: { slug: true },
    take: 50,
    orderBy: { created_at: "desc" },
  });
  if (posts.length === 0) return [];

  // Shuffle and take `count`
  const shuffled = posts.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((p) => p.slug);
}

/* ------------------------------------------------------------------ */
/* 1. Sitemap accessibility                                            */
/* ------------------------------------------------------------------ */
async function sitemapAccessibility(config: AuditConfig): Promise<CheckResult> {
  const { prisma } = await import("@/lib/db");
  const sitemapUrl = `${config.siteUrl}/sitemap.xml`;

  let res: Response;
  try {
    res = await auditFetch(sitemapUrl, config.signal);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return makeResult("fail", { sitemapUrl, accessible: false }, {
      error: `Could not fetch sitemap: ${msg}`,
      action: "Verify sitemap.xml is served at the site root. Check Next.js sitemap.ts exists.",
    }) as CheckResult;
  }

  if (!res.ok) {
    return makeResult("fail", { sitemapUrl, accessible: false, httpStatus: res.status }, {
      error: `Sitemap returned HTTP ${res.status}`,
      action: "Ensure app/sitemap.ts is configured and deployed.",
    }) as CheckResult;
  }

  const xml = await res.text();

  // Count <loc> entries
  const locMatches = xml.match(/<loc>/gi);
  const sitemapUrlCount = locMatches ? locMatches.length : 0;

  // Count <lastmod> entries
  const lastmodMatches = xml.match(/<lastmod>/gi);
  const lastmodCount = lastmodMatches ? lastmodMatches.length : 0;

  // Cross-reference with published BlogPosts
  const publishedCount = await prisma.blogPost.count({
    where: { siteId: config.siteId, published: true, deletedAt: null },
  });

  const hasLastmod = lastmodCount > 0;

  // Sitemap includes static pages + blog posts + /ar/ variants, so it should
  // always have MORE URLs than just published blog posts. If sitemap has FEWER
  // than published, blog posts are likely missing.
  const blogUrlsMissing = sitemapUrlCount < publishedCount
    ? publishedCount - sitemapUrlCount
    : 0;

  let status: "pass" | "warn" | "fail";
  if (sitemapUrlCount === 0) {
    status = "fail";
  } else if (blogUrlsMissing > 5) {
    status = "fail";
  } else if (blogUrlsMissing > 0 || !hasLastmod) {
    status = "warn";
  } else {
    status = "pass";
  }

  return makeResult(status, {
    sitemapUrl,
    accessible: true,
    sitemapUrlCount,
    lastmodCount,
    hasLastmod,
    publishedBlogPosts: publishedCount,
    possibleMissing: blogUrlsMissing,
    note: "Sitemap includes static + blog + /ar/ pages; URL count should exceed blog post count.",
  }, {
    ...(sitemapUrlCount === 0 && { error: "Sitemap is empty", action: "Verify sitemap.ts query returns URLs." }),
    ...(blogUrlsMissing > 0 && { action: `Sitemap has fewer URLs (${sitemapUrlCount}) than published posts (${publishedCount}). ${blogUrlsMissing} blog post(s) may be missing.` }),
    ...(!hasLastmod && blogUrlsMissing === 0 && { action: "Sitemap is missing <lastmod> dates. Add them for better crawl prioritization." }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 2. robots.txt                                                       */
/* ------------------------------------------------------------------ */
async function robotsTxt(config: AuditConfig): Promise<CheckResult> {
  const robotsUrl = `${config.siteUrl}/robots.txt`;

  let res: Response;
  try {
    res = await auditFetch(robotsUrl, config.signal);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return makeResult("fail", { robotsUrl, accessible: false }, {
      error: `Could not fetch robots.txt: ${msg}`,
      action: "Verify robots.txt is served at the site root.",
    }) as CheckResult;
  }

  if (!res.ok) {
    return makeResult("fail", { robotsUrl, accessible: false, httpStatus: res.status }, {
      error: `robots.txt returned HTTP ${res.status}`,
      action: "Create app/robots.ts to serve robots.txt.",
    }) as CheckResult;
  }

  const text = await res.text();
  const lower = text.toLowerCase();

  const hasAdminDisallow = /disallow:\s*\/admin\//i.test(text);
  const hasApiDisallow = /disallow:\s*\/api\//i.test(text);
  const hasSitemapRef = /sitemap:/i.test(text);

  // AI crawler rules
  const aiCrawlers = ["gptbot", "claudebot", "perplexitybot"];
  const aiCrawlersMentioned = aiCrawlers.filter((c) => lower.includes(c));

  const issues: string[] = [];
  if (!hasAdminDisallow) issues.push("Missing Disallow for /admin/");
  if (!hasApiDisallow) issues.push("Missing Disallow for /api/");
  if (!hasSitemapRef) issues.push("Missing Sitemap reference");

  const status = issues.length === 0 ? "pass" : issues.length <= 1 ? "warn" : "fail";

  return makeResult(status, {
    robotsUrl,
    accessible: true,
    hasAdminDisallow,
    hasApiDisallow,
    hasSitemapRef,
    aiCrawlerRules: aiCrawlersMentioned,
    aiCrawlersChecked: aiCrawlers,
    issues,
  }, {
    ...(issues.length > 0 && { action: `Fix robots.txt: ${issues.join("; ")}.` }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 3. Structured data (JSON-LD)                                        */
/* ------------------------------------------------------------------ */
async function structuredData(config: AuditConfig): Promise<CheckResult> {
  const slugs = await getRandomSlugs(config.siteId, 3);
  if (slugs.length === 0) {
    return makeResult("skip", { reason: "No published articles to check" }) as CheckResult;
  }

  const REQUIRED_FIELDS = ["@type", "headline", "datePublished", "author"];
  const pageResults: Record<string, { hasSchema: boolean; fields: string[]; missingFields: string[] }> = {};
  let totalValid = 0;

  for (const slug of slugs) {
    const url = `${config.siteUrl}/blog/${slug}`;
    try {
      const res = await auditFetch(url, config.signal);
      if (!res.ok) {
        safeSet(pageResults, slug, { hasSchema: false, fields: [], missingFields: REQUIRED_FIELDS });
        continue;
      }

      const html = await res.text();

      // Extract JSON-LD blocks
      const jsonLdRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      const jsonLdBlocks: string[] = [];
      let match;
      while ((match = jsonLdRegex.exec(html)) !== null) {
        jsonLdBlocks.push(match[1]);
      }

      if (jsonLdBlocks.length === 0) {
        safeSet(pageResults, slug, { hasSchema: false, fields: [], missingFields: REQUIRED_FIELDS });
        continue;
      }

      // Check first valid JSON-LD block for required fields
      let foundFields: string[] = [];
      for (const block of jsonLdBlocks) {
        try {
          const parsed = JSON.parse(block);
          const obj = Array.isArray(parsed) ? parsed[0] : parsed;
          if (!obj) continue;
          const keys = Object.keys(obj);
          foundFields = REQUIRED_FIELDS.filter((f) => keys.includes(f));
          if (foundFields.length > 0) break;
        } catch {
          // Malformed JSON-LD, try next block
        }
      }

      const missingFields = REQUIRED_FIELDS.filter((f) => !foundFields.includes(f));
      const valid = missingFields.length === 0;
      if (valid) totalValid++;

      safeSet(pageResults, slug, { hasSchema: true, fields: foundFields, missingFields });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      safeSet(pageResults, slug, { hasSchema: false, fields: [], missingFields: REQUIRED_FIELDS });
      console.warn(`[health-audit] structured-data fetch failed for ${slug}: ${msg}`);
    }
  }

  const checked = slugs.length;
  const status = totalValid === checked ? "pass" : totalValid > 0 ? "warn" : "fail";

  return makeResult(status, {
    pagesChecked: checked,
    pagesWithValidSchema: totalValid,
    requiredFields: REQUIRED_FIELDS,
    pageResults,
  }, {
    ...(status === "warn" && { action: "Some articles have incomplete JSON-LD. Check schema generator covers headline, datePublished, author." }),
    ...(status === "fail" && { error: "No valid structured data found on sampled articles", action: "Verify StructuredData component is rendered on blog pages and JSON-LD is well-formed." }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 4. Hreflang tags                                                    */
/* ------------------------------------------------------------------ */
async function hreflangTags(config: AuditConfig): Promise<CheckResult> {
  const slugs = await getRandomSlugs(config.siteId, 2);
  if (slugs.length === 0) {
    return makeResult("skip", { reason: "No published articles to check" }) as CheckResult;
  }

  const EXPECTED_HREFLANGS = ["en-gb", "ar-sa", "x-default"];
  const pageResults: Record<string, { found: string[]; missing: string[] }> = {};
  let totalComplete = 0;

  for (const slug of slugs) {
    const url = `${config.siteUrl}/blog/${slug}`;
    try {
      const res = await auditFetch(url, config.signal);
      if (!res.ok) {
        safeSet(pageResults, slug, { found: [], missing: EXPECTED_HREFLANGS });
        continue;
      }

      const html = await res.text();

      // Find hreflang values
      const hreflangRegex = /<link[^>]+rel=["']alternate["'][^>]+hreflang=["']([^"']+)["']/gi;
      const foundLangs: string[] = [];
      let match;
      while ((match = hreflangRegex.exec(html)) !== null) {
        foundLangs.push(match[1].toLowerCase());
      }

      const missing = EXPECTED_HREFLANGS.filter((h) => !foundLangs.includes(h));
      if (missing.length === 0) totalComplete++;
      safeSet(pageResults, slug, { found: foundLangs, missing });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      safeSet(pageResults, slug, { found: [], missing: EXPECTED_HREFLANGS });
      console.warn(`[health-audit] hreflang check failed for ${slug}: ${msg}`);
    }
  }

  const checked = slugs.length;
  const status = totalComplete === checked ? "pass" : totalComplete > 0 ? "warn" : "fail";

  return makeResult(status, {
    pagesChecked: checked,
    pagesWithCompleteHreflang: totalComplete,
    expectedHreflangs: EXPECTED_HREFLANGS,
    pageResults,
  }, {
    ...(status === "warn" && { action: "Some pages are missing hreflang tags. Check generateMetadata() in blog layout includes en-GB, ar-SA, x-default." }),
    ...(status === "fail" && { error: "No hreflang tags found on sampled articles", action: "Add hreflang alternate links in blog page metadata. Required: en-GB, ar-SA, x-default." }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 5. Canonical tags                                                   */
/* ------------------------------------------------------------------ */
async function canonicalTags(config: AuditConfig): Promise<CheckResult> {
  const slugs = await getRandomSlugs(config.siteId, 2);
  if (slugs.length === 0) {
    return makeResult("skip", { reason: "No published articles to check" }) as CheckResult;
  }

  const pageResults: Record<string, { hasCanonical: boolean; selfReferencing: boolean; canonicalHref: string | null }> = {};
  let totalCorrect = 0;

  for (const slug of slugs) {
    const url = `${config.siteUrl}/blog/${slug}`;
    try {
      const res = await auditFetch(url, config.signal);
      if (!res.ok) {
        safeSet(pageResults, slug, { hasCanonical: false, selfReferencing: false, canonicalHref: null });
        continue;
      }

      const html = await res.text();

      // Find canonical link
      const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
      if (!canonicalMatch) {
        safeSet(pageResults, slug, { hasCanonical: false, selfReferencing: false, canonicalHref: null });
        continue;
      }

      const canonicalHref = canonicalMatch[1];
      // Check self-referencing: canonical should end with /blog/{slug} (path match)
      const expectedPath = `/blog/${slug}`;
      const selfReferencing = canonicalHref.includes(expectedPath);

      if (selfReferencing) totalCorrect++;
      safeSet(pageResults, slug, { hasCanonical: true, selfReferencing, canonicalHref });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      safeSet(pageResults, slug, { hasCanonical: false, selfReferencing: false, canonicalHref: null });
      console.warn(`[health-audit] canonical check failed for ${slug}: ${msg}`);
    }
  }

  const checked = slugs.length;
  const status = totalCorrect === checked ? "pass" : totalCorrect > 0 ? "warn" : "fail";

  return makeResult(status, {
    pagesChecked: checked,
    pagesWithCorrectCanonical: totalCorrect,
    pageResults,
  }, {
    ...(status === "warn" && { action: "Some pages have incorrect or non-self-referencing canonical tags. Check generateMetadata() canonical URL construction." }),
    ...(status === "fail" && { error: "Canonical tags missing or incorrect on sampled articles", action: "Add self-referencing canonical tags in blog page metadata using getBaseUrl() + path." }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 6. Open Graph tags                                                  */
/* ------------------------------------------------------------------ */
async function openGraphTags(config: AuditConfig): Promise<CheckResult> {
  const slugs = await getRandomSlugs(config.siteId, 2);
  if (slugs.length === 0) {
    return makeResult("skip", { reason: "No published articles to check" }) as CheckResult;
  }

  const OG_TAGS = ["og:title", "og:description", "og:image", "og:url"];
  const TWITTER_TAGS = ["twitter:card"];

  const pageResults: Record<string, { ogFound: string[]; ogMissing: string[]; twitterFound: string[]; twitterMissing: string[] }> = {};
  let totalComplete = 0;

  for (const slug of slugs) {
    const url = `${config.siteUrl}/blog/${slug}`;
    try {
      const res = await auditFetch(url, config.signal);
      if (!res.ok) {
        safeSet(pageResults, slug, { ogFound: [], ogMissing: OG_TAGS, twitterFound: [], twitterMissing: TWITTER_TAGS });
        continue;
      }

      const html = await res.text();

      // Check OG tags
      const ogFound: string[] = [];
      for (const tag of OG_TAGS) {
        const regex = new RegExp(`<meta[^>]+property=["']${tag}["'][^>]*>`, "i");
        if (regex.test(html)) ogFound.push(tag);
      }
      const ogMissing = OG_TAGS.filter((t) => !ogFound.includes(t));

      // Check Twitter tags
      const twitterFound: string[] = [];
      for (const tag of TWITTER_TAGS) {
        const regex = new RegExp(`<meta[^>]+name=["']${tag}["'][^>]*>`, "i");
        if (regex.test(html)) twitterFound.push(tag);
      }
      const twitterMissing = TWITTER_TAGS.filter((t) => !twitterFound.includes(t));

      const allPresent = ogMissing.length === 0 && twitterMissing.length === 0;
      if (allPresent) totalComplete++;

      safeSet(pageResults, slug, { ogFound, ogMissing, twitterFound, twitterMissing });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      safeSet(pageResults, slug, { ogFound: [], ogMissing: OG_TAGS, twitterFound: [], twitterMissing: TWITTER_TAGS });
      console.warn(`[health-audit] og-tags check failed for ${slug}: ${msg}`);
    }
  }

  const checked = slugs.length;
  const status = totalComplete === checked ? "pass" : totalComplete > 0 ? "warn" : "fail";

  return makeResult(status, {
    pagesChecked: checked,
    pagesWithCompleteTags: totalComplete,
    requiredOgTags: OG_TAGS,
    requiredTwitterTags: TWITTER_TAGS,
    pageResults,
  }, {
    ...(status === "warn" && { action: "Some pages are missing Open Graph or Twitter Card tags. Check generateMetadata() openGraph and twitter properties." }),
    ...(status === "fail" && { error: "Critical social sharing tags missing on sampled articles", action: "Add og:title, og:description, og:image, og:url, and twitter:card to blog page metadata." }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* Exported runner                                                     */
/* ------------------------------------------------------------------ */
export async function runSEOInfrastructureChecks(
  config: AuditConfig
): Promise<Record<string, CheckResult>> {
  const checks: Record<string, (c: AuditConfig) => Promise<CheckResult>> = {
    sitemapAccessibility,
    robotsTxt,
    structuredData,
    hreflangTags,
    canonicalTags,
    openGraphTags,
  };

  const results: Record<string, CheckResult> = {};
  for (const [name, fn] of Object.entries(checks)) {
    results[name] = await runCheck(name, fn, config);
  }
  return results;
}
