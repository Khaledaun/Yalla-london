#!/usr/bin/env npx tsx
/**
 * SEO Compliance Audit Script
 *
 * Performs static analysis of the codebase to verify SEO compliance
 * across sitemap, robots.txt, schema, metadata, hreflang, multi-site,
 * noindex, and performance configurations.
 *
 * Does NOT make HTTP requests — analyses source files directly.
 *
 * Run: npx tsx scripts/seo-audit.ts
 */

import * as fs from "fs";
import * as path from "path";

// ─── Config ─────────────────────────────────────────────────────────────────

const APP_DIR = path.resolve(__dirname, "../yalla_london/app");

const PASS = "PASS";
const FAIL = "FAIL";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TestResult {
  name: string;
  category: string;
  status: typeof PASS | typeof FAIL;
  details: string;
}

const results: TestResult[] = [];

// ─── Helpers ────────────────────────────────────────────────────────────────

function readFile(relativePath: string): string {
  const fullPath = path.join(APP_DIR, relativePath);
  try {
    return fs.readFileSync(fullPath, "utf-8");
  } catch {
    return "";
  }
}

function test(
  category: string,
  name: string,
  fn: () => { status: string; details: string }
) {
  try {
    const result = fn();
    results.push({
      category,
      name,
      status: result.status as typeof PASS | typeof FAIL,
      details: result.details,
    });
  } catch (err) {
    results.push({
      category,
      name,
      status: FAIL,
      details: `Exception: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}

// ─── Category 1: Sitemap Audit ──────────────────────────────────────────────

const SITEMAP_FILE = "app/sitemap.ts";

test("Sitemap", "Hreflang uses en-GB (not just en)", () => {
  const content = readFile(SITEMAP_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${SITEMAP_FILE}` };
  const hasEnGB = content.includes('"en-GB"');
  return {
    status: hasEnGB ? PASS : FAIL,
    details: hasEnGB
      ? 'Sitemap hreflang uses "en-GB"'
      : 'Sitemap hreflang should use "en-GB" not "en"',
  };
});

test("Sitemap", "Hreflang uses ar-SA (not just ar)", () => {
  const content = readFile(SITEMAP_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${SITEMAP_FILE}` };
  const hasArSA = content.includes('"ar-SA"');
  return {
    status: hasArSA ? PASS : FAIL,
    details: hasArSA
      ? 'Sitemap hreflang uses "ar-SA"'
      : 'Sitemap hreflang should use "ar-SA" not "ar"',
  };
});

test("Sitemap", "Hreflang includes x-default", () => {
  const content = readFile(SITEMAP_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${SITEMAP_FILE}` };
  const hasXDefault = content.includes('"x-default"');
  return {
    status: hasXDefault ? PASS : FAIL,
    details: hasXDefault
      ? 'Sitemap includes "x-default" hreflang'
      : 'Sitemap missing "x-default" hreflang alternate',
  };
});

const REQUIRED_STATIC_PAGES = [
  "/blog",
  "/information",
  "/recommendations",
  "/events",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/shop",
  "/affiliate-disclosure",
];

for (const page of REQUIRED_STATIC_PAGES) {
  test("Sitemap", `Includes static page: ${page}`, () => {
    const content = readFile(SITEMAP_FILE);
    if (!content) return { status: FAIL, details: `File not found: ${SITEMAP_FILE}` };
    // Look for the path in a url or hreflang() call
    const hasPage =
      content.includes(`"${page}"`) ||
      content.includes(`'${page}'`) ||
      content.includes(`\`\${baseUrl}${page}\``) ||
      content.includes(`hreflang("${page}")`) ||
      content.includes(`hreflang('${page}')`) ||
      content.includes(`hreflang(\`${page}\``);
    return {
      status: hasPage ? PASS : FAIL,
      details: hasPage
        ? `Sitemap includes ${page}`
        : `Sitemap missing static page: ${page}`,
    };
  });
}

test("Sitemap", "Events have hreflang alternates", () => {
  const content = readFile(SITEMAP_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${SITEMAP_FILE}` };
  // Check that event pages use hreflang() helper
  const eventSection = content.includes("eventPages") && content.includes("hreflang");
  // More specific: events mapped with alternates
  const hasEventHreflang =
    /eventPages\s*=\s*events\.map\([^)]*hreflang/s.test(content) ||
    (content.includes("events.map") && content.includes("hreflang("));
  return {
    status: hasEventHreflang ? PASS : FAIL,
    details: hasEventHreflang
      ? "Event pages have hreflang alternates"
      : "Event pages missing hreflang alternates in sitemap",
  };
});

// ─── Category 2: Robots.txt Audit ───────────────────────────────────────────

const ROBOTS_FILE = "app/robots.ts";

test("Robots.txt", "Disallows /admin/", () => {
  const content = readFile(ROBOTS_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${ROBOTS_FILE}` };
  const disallowsAdmin = content.includes("/admin/");
  return {
    status: disallowsAdmin ? PASS : FAIL,
    details: disallowsAdmin
      ? "Robots.txt disallows /admin/"
      : "Robots.txt does NOT disallow /admin/ — admin pages may be indexed",
  };
});

test("Robots.txt", "Disallows /api/", () => {
  const content = readFile(ROBOTS_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${ROBOTS_FILE}` };
  const disallowsApi = content.includes("/api/");
  return {
    status: disallowsApi ? PASS : FAIL,
    details: disallowsApi
      ? "Robots.txt disallows /api/"
      : "Robots.txt does NOT disallow /api/ — API routes may be indexed",
  };
});

test("Robots.txt", "GPTBot rule exists", () => {
  const content = readFile(ROBOTS_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${ROBOTS_FILE}` };
  const hasGPTBot = content.includes("GPTBot");
  return {
    status: hasGPTBot ? PASS : FAIL,
    details: hasGPTBot
      ? "GPTBot crawler rule present"
      : "Missing GPTBot AI crawler rule",
  };
});

test("Robots.txt", "ClaudeBot rule exists", () => {
  const content = readFile(ROBOTS_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${ROBOTS_FILE}` };
  const hasClaudeBot = content.includes("ClaudeBot");
  return {
    status: hasClaudeBot ? PASS : FAIL,
    details: hasClaudeBot
      ? "ClaudeBot crawler rule present"
      : "Missing ClaudeBot AI crawler rule",
  };
});

test("Robots.txt", "PerplexityBot rule exists", () => {
  const content = readFile(ROBOTS_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${ROBOTS_FILE}` };
  const hasPerplexityBot = content.includes("PerplexityBot");
  return {
    status: hasPerplexityBot ? PASS : FAIL,
    details: hasPerplexityBot
      ? "PerplexityBot crawler rule present"
      : "Missing PerplexityBot AI crawler rule",
  };
});

test("Robots.txt", "Sitemap reference exists", () => {
  const content = readFile(ROBOTS_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${ROBOTS_FILE}` };
  const hasSitemap = content.includes("sitemap") || content.includes("sitemap.xml");
  return {
    status: hasSitemap ? PASS : FAIL,
    details: hasSitemap
      ? "Robots.txt includes sitemap reference"
      : "Robots.txt missing sitemap reference",
  };
});

// ─── Category 3: Schema Audit ───────────────────────────────────────────────

const STRUCTURED_DATA_FILE = "components/structured-data.tsx";
const BLOG_SLUG_FILE = "app/blog/[slug]/page.tsx";

test("Schema", 'structured-data.tsx does NOT hardcode "Yalla London" as site name', () => {
  const content = readFile(STRUCTURED_DATA_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${STRUCTURED_DATA_FILE}` };
  // Check that "Yalla London" is not used as a literal string value for name/publisher
  // Allow it in comments. Look for it in actual property assignments.
  const lines = content.split("\n");
  const hardcodedLines: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Skip comments
    if (line.startsWith("//") || line.startsWith("*") || line.startsWith("/*")) continue;
    // Check for hardcoded "Yalla London" as a string value
    if (
      (line.includes('"Yalla London"') || line.includes("'Yalla London'")) &&
      !line.includes("||") // allow fallbacks like `siteName || "Yalla London"`
    ) {
      hardcodedLines.push(i + 1);
    }
  }
  return {
    status: hardcodedLines.length === 0 ? PASS : FAIL,
    details:
      hardcodedLines.length === 0
        ? "structured-data.tsx uses dynamic site name (not hardcoded)"
        : `Hardcoded "Yalla London" found on lines: ${hardcodedLines.join(", ")}`,
  };
});

test("Schema", "FAQPage schema type is NOT generated (deprecated)", () => {
  const content = readFile(STRUCTURED_DATA_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${STRUCTURED_DATA_FILE}` };
  // FAQPage was deprecated Aug 2023. The faq type should generate Article, not FAQPage.
  const hasFAQPage = /"@type":\s*"FAQPage"/.test(content) || /'@type':\s*'FAQPage'/.test(content);
  // Also check for the string "FAQPage" used as a schema type (not just in comments)
  const lines = content.split("\n");
  let faqPageInCode = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
    if (trimmed.includes("FAQPage") && (trimmed.includes("@type") || trimmed.includes("type:"))) {
      faqPageInCode = true;
      break;
    }
  }
  const deprecated = hasFAQPage || faqPageInCode;
  return {
    status: deprecated ? FAIL : PASS,
    details: deprecated
      ? "structured-data.tsx still generates deprecated FAQPage schema"
      : "FAQPage schema correctly NOT generated (deprecated Aug 2023)",
  };
});

test("Schema", "blog/[slug]/page.tsx generates Article schema", () => {
  const content = readFile(BLOG_SLUG_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${BLOG_SLUG_FILE}` };
  const hasArticle =
    content.includes('"@type": "Article"') ||
    content.includes('"@type":"Article"') ||
    content.includes("'@type': 'Article'") ||
    content.includes('@type": "Article');
  return {
    status: hasArticle ? PASS : FAIL,
    details: hasArticle
      ? "Blog slug page generates Article schema"
      : "Blog slug page missing Article schema type",
  };
});

test("Schema", "blog/[slug]/page.tsx generates BreadcrumbList schema", () => {
  const content = readFile(BLOG_SLUG_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${BLOG_SLUG_FILE}` };
  const hasBreadcrumb =
    content.includes('"@type": "BreadcrumbList"') ||
    content.includes('"@type":"BreadcrumbList"') ||
    content.includes("'@type': 'BreadcrumbList'") ||
    content.includes("BreadcrumbList");
  return {
    status: hasBreadcrumb ? PASS : FAIL,
    details: hasBreadcrumb
      ? "Blog slug page generates BreadcrumbList schema"
      : "Blog slug page missing BreadcrumbList schema type",
  };
});

// ─── Category 4: Metadata Audit ─────────────────────────────────────────────

const ROOT_LAYOUT = "app/layout.tsx";
const BLOG_PAGE = "app/blog/page.tsx";

test("Metadata", "Root layout uses generateMetadata (not static metadata)", () => {
  const content = readFile(ROOT_LAYOUT);
  if (!content) return { status: FAIL, details: `File not found: ${ROOT_LAYOUT}` };
  const hasDynamic = content.includes("generateMetadata");
  return {
    status: hasDynamic ? PASS : FAIL,
    details: hasDynamic
      ? "Root layout uses dynamic generateMetadata()"
      : "Root layout should use generateMetadata() for dynamic canonical/hreflang",
  };
});

test("Metadata", "Root layout metadata has canonical URL", () => {
  const content = readFile(ROOT_LAYOUT);
  if (!content) return { status: FAIL, details: `File not found: ${ROOT_LAYOUT}` };
  const hasCanonical = content.includes("canonical");
  return {
    status: hasCanonical ? PASS : FAIL,
    details: hasCanonical
      ? "Root layout metadata includes canonical URL"
      : "Root layout metadata missing canonical URL",
  };
});

test("Metadata", "Root layout metadata has hreflang alternates", () => {
  const content = readFile(ROOT_LAYOUT);
  if (!content) return { status: FAIL, details: `File not found: ${ROOT_LAYOUT}` };
  const hasAlternates =
    content.includes("alternates") &&
    (content.includes("en-GB") || content.includes("languages"));
  return {
    status: hasAlternates ? PASS : FAIL,
    details: hasAlternates
      ? "Root layout metadata includes hreflang alternates"
      : "Root layout metadata missing hreflang alternates",
  };
});

test("Metadata", "blog/[slug]/page.tsx has generateMetadata", () => {
  const content = readFile(BLOG_SLUG_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${BLOG_SLUG_FILE}` };
  const hasGenerate = content.includes("export async function generateMetadata");
  return {
    status: hasGenerate ? PASS : FAIL,
    details: hasGenerate
      ? "Blog slug page has generateMetadata()"
      : "Blog slug page missing generateMetadata()",
  };
});

test("Metadata", "blog/[slug]/page.tsx metadata has canonical URL", () => {
  const content = readFile(BLOG_SLUG_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${BLOG_SLUG_FILE}` };
  const hasCanonical = content.includes("canonical");
  return {
    status: hasCanonical ? PASS : FAIL,
    details: hasCanonical
      ? "Blog slug metadata includes canonical URL"
      : "Blog slug metadata missing canonical URL",
  };
});

test("Metadata", "blog/[slug]/page.tsx metadata has hreflang", () => {
  const content = readFile(BLOG_SLUG_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${BLOG_SLUG_FILE}` };
  const hasHreflang = content.includes("en-GB") && content.includes("ar-SA");
  return {
    status: hasHreflang ? PASS : FAIL,
    details: hasHreflang
      ? "Blog slug metadata includes en-GB and ar-SA hreflang"
      : "Blog slug metadata missing proper hreflang (en-GB / ar-SA)",
  };
});

test("Metadata", "blog/[slug]/page.tsx metadata has openGraph", () => {
  const content = readFile(BLOG_SLUG_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${BLOG_SLUG_FILE}` };
  const hasOG = content.includes("openGraph");
  return {
    status: hasOG ? PASS : FAIL,
    details: hasOG
      ? "Blog slug metadata includes Open Graph tags"
      : "Blog slug metadata missing Open Graph tags",
  };
});

test("Metadata", "blog/[slug]/page.tsx metadata has twitter card", () => {
  const content = readFile(BLOG_SLUG_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${BLOG_SLUG_FILE}` };
  const hasTwitter = content.includes("twitter");
  return {
    status: hasTwitter ? PASS : FAIL,
    details: hasTwitter
      ? "Blog slug metadata includes Twitter card"
      : "Blog slug metadata missing Twitter card",
  };
});

test("Metadata", "blog/page.tsx has generateMetadata (not static metadata)", () => {
  const content = readFile(BLOG_PAGE);
  if (!content) return { status: FAIL, details: `File not found: ${BLOG_PAGE}` };
  const hasGenerate = content.includes("export async function generateMetadata");
  return {
    status: hasGenerate ? PASS : FAIL,
    details: hasGenerate
      ? "Blog listing page uses dynamic generateMetadata()"
      : "Blog listing page should use generateMetadata() (not static export)",
  };
});

test("Metadata", "No hardcoded yalla-london.com in metadata generation", () => {
  const filesToCheck = [ROOT_LAYOUT, BLOG_PAGE, BLOG_SLUG_FILE];
  const offenders: string[] = [];

  for (const file of filesToCheck) {
    const content = readFile(file);
    if (!content) continue;
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Skip comments and imports
      if (line.startsWith("//") || line.startsWith("*") || line.startsWith("import")) continue;
      // Check for hardcoded domain in metadata-relevant context
      if (
        line.includes("yalla-london.com") &&
        !line.includes("||") && // allow fallback patterns
        !line.includes("getSiteDomain") &&
        !line.includes("getBaseUrl")
      ) {
        offenders.push(`${file}:${i + 1}`);
      }
    }
  }

  return {
    status: offenders.length === 0 ? PASS : FAIL,
    details:
      offenders.length === 0
        ? "No hardcoded yalla-london.com in metadata files (uses config)"
        : `Hardcoded yalla-london.com found in: ${offenders.join(", ")}`,
  };
});

// ─── Category 5: Hreflang Audit ─────────────────────────────────────────────

const HREFLANG_FILE = "components/hreflang-tags.tsx";

test("Hreflang", 'hreflang-tags.tsx does NOT fallback to hardcoded "yalla-london.com"', () => {
  const content = readFile(HREFLANG_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${HREFLANG_FILE}` };
  const lines = content.split("\n");
  let hardcoded = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
    // Allow pattern like getSiteDomain() but flag raw hardcoded domain
    if (
      trimmed.includes("yalla-london.com") &&
      !trimmed.includes("getSiteDomain") &&
      !trimmed.includes("getBaseUrl") &&
      !trimmed.includes("||")
    ) {
      hardcoded = true;
      break;
    }
  }
  return {
    status: hardcoded ? FAIL : PASS,
    details: hardcoded
      ? 'hreflang-tags.tsx has hardcoded "yalla-london.com" fallback'
      : "hreflang-tags.tsx uses config-driven domain (getSiteDomain)",
  };
});

test("Hreflang", "Uses en-GB (not just en)", () => {
  const content = readFile(HREFLANG_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${HREFLANG_FILE}` };
  const hasEnGB = content.includes("en-GB");
  return {
    status: hasEnGB ? PASS : FAIL,
    details: hasEnGB
      ? 'HreflangTags uses "en-GB" language-region code'
      : 'HreflangTags should use "en-GB" not "en"',
  };
});

test("Hreflang", "Uses ar-SA (not just ar)", () => {
  const content = readFile(HREFLANG_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${HREFLANG_FILE}` };
  const hasArSA = content.includes("ar-SA");
  return {
    status: hasArSA ? PASS : FAIL,
    details: hasArSA
      ? 'HreflangTags uses "ar-SA" language-region code'
      : 'HreflangTags should use "ar-SA" not "ar"',
  };
});

test("Hreflang", "x-default is present", () => {
  const content = readFile(HREFLANG_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${HREFLANG_FILE}` };
  const hasXDefault = content.includes("x-default");
  return {
    status: hasXDefault ? PASS : FAIL,
    details: hasXDefault
      ? "HreflangTags includes x-default alternate"
      : "HreflangTags missing x-default alternate",
  };
});

// ─── Category 6: Multi-Site Compliance ──────────────────────────────────────

test("Multi-Site", "structured-data.tsx imports from config/sites", () => {
  const content = readFile(STRUCTURED_DATA_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${STRUCTURED_DATA_FILE}` };
  const importsConfig =
    content.includes("@/config/sites") || content.includes("config/sites");
  return {
    status: importsConfig ? PASS : FAIL,
    details: importsConfig
      ? "structured-data.tsx imports site config from config/sites"
      : "structured-data.tsx does NOT import from config/sites — may use hardcoded values",
  };
});

test("Multi-Site", "blog/page.tsx reads siteId from headers", () => {
  const content = readFile(BLOG_PAGE);
  if (!content) return { status: FAIL, details: `File not found: ${BLOG_PAGE}` };
  const readsSiteId =
    content.includes('x-site-id') || content.includes("getDefaultSiteId");
  return {
    status: readsSiteId ? PASS : FAIL,
    details: readsSiteId
      ? "Blog listing page reads siteId from headers"
      : "Blog listing page does NOT read siteId — all sites show same content",
  };
});

test("Multi-Site", 'No hardcoded "Yalla London" in schema generation (structured-data.tsx)', () => {
  const content = readFile(STRUCTURED_DATA_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${STRUCTURED_DATA_FILE}` };
  // Look for "Yalla London" used as a direct value (not in a fallback || or comment)
  const lines = content.split("\n");
  const offenders: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("//") || line.startsWith("*") || line.startsWith("/*")) continue;
    if (
      (line.includes('"Yalla London"') || line.includes("'Yalla London'")) &&
      !line.includes("||")
    ) {
      offenders.push(i + 1);
    }
  }
  return {
    status: offenders.length === 0 ? PASS : FAIL,
    details:
      offenders.length === 0
        ? "structured-data.tsx uses dynamic site name in schema generation"
        : `Hardcoded "Yalla London" in schema on lines: ${offenders.join(", ")}`,
  };
});

test("Multi-Site", 'No hardcoded "Yalla London" in blog/[slug]/page.tsx schema', () => {
  const content = readFile(BLOG_SLUG_FILE);
  if (!content) return { status: FAIL, details: `File not found: ${BLOG_SLUG_FILE}` };
  const lines = content.split("\n");
  const offenders: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("//") || line.startsWith("*")) continue;
    if (
      (line.includes('"Yalla London"') || line.includes("'Yalla London'")) &&
      !line.includes("||")
    ) {
      offenders.push(i + 1);
    }
  }
  return {
    status: offenders.length === 0 ? PASS : FAIL,
    details:
      offenders.length === 0
        ? "blog/[slug]/page.tsx uses dynamic site name in schema"
        : `Hardcoded "Yalla London" in blog slug schema on lines: ${offenders.join(", ")}`,
  };
});

// ─── Category 7: Noindex Compliance ─────────────────────────────────────────

const SHOP_DOWNLOAD_LAYOUT = "app/shop/download/layout.tsx";
const SHOP_PURCHASES_LAYOUT = "app/shop/purchases/layout.tsx";

test("Noindex", "shop/download has noindex", () => {
  // Check layout first, then page
  let content = readFile(SHOP_DOWNLOAD_LAYOUT);
  if (!content) {
    content = readFile("app/shop/download/page.tsx");
  }
  if (!content)
    return { status: FAIL, details: "shop/download layout and page not found" };
  const hasNoindex =
    content.includes("index: false") || content.includes("noindex");
  return {
    status: hasNoindex ? PASS : FAIL,
    details: hasNoindex
      ? "shop/download has noindex directive"
      : "shop/download missing noindex — download pages should not be indexed",
  };
});

test("Noindex", "shop/purchases has noindex", () => {
  let content = readFile(SHOP_PURCHASES_LAYOUT);
  if (!content) {
    content = readFile("app/shop/purchases/page.tsx");
  }
  if (!content)
    return { status: FAIL, details: "shop/purchases layout and page not found" };
  const hasNoindex =
    content.includes("index: false") || content.includes("noindex");
  return {
    status: hasNoindex ? PASS : FAIL,
    details: hasNoindex
      ? "shop/purchases has noindex directive"
      : "shop/purchases missing noindex — purchase pages should not be indexed",
  };
});

// ─── Category 8: Performance ────────────────────────────────────────────────

const NEXT_CONFIG = "next.config.js";

test("Performance", "next.config.js has AVIF image format", () => {
  const content = readFile(NEXT_CONFIG);
  if (!content) return { status: FAIL, details: `File not found: ${NEXT_CONFIG}` };
  const hasAvif = content.includes("image/avif");
  return {
    status: hasAvif ? PASS : FAIL,
    details: hasAvif
      ? "next.config.js enables AVIF image optimization"
      : "next.config.js missing AVIF format — should include image/avif for optimal LCP",
  };
});

test("Performance", "next.config.js has WebP image format", () => {
  const content = readFile(NEXT_CONFIG);
  if (!content) return { status: FAIL, details: `File not found: ${NEXT_CONFIG}` };
  const hasWebp = content.includes("image/webp");
  return {
    status: hasWebp ? PASS : FAIL,
    details: hasWebp
      ? "next.config.js enables WebP image optimization"
      : "next.config.js missing WebP format — should include image/webp",
  };
});

test("Performance", "next.config.js image optimization is enabled (not unoptimized)", () => {
  const content = readFile(NEXT_CONFIG);
  if (!content) return { status: FAIL, details: `File not found: ${NEXT_CONFIG}` };
  // Check for unoptimized: false (good) vs unoptimized: true (bad)
  const optimized =
    content.includes("unoptimized: false") || !content.includes("unoptimized: true");
  return {
    status: optimized ? PASS : FAIL,
    details: optimized
      ? "Image optimization is enabled"
      : "Image optimization is DISABLED (unoptimized: true) — will degrade LCP",
  };
});

test("Performance", "Root layout uses afterInteractive for GA script", () => {
  const content = readFile(ROOT_LAYOUT);
  if (!content) return { status: FAIL, details: `File not found: ${ROOT_LAYOUT}` };
  const hasAfterInteractive = content.includes("afterInteractive");
  return {
    status: hasAfterInteractive ? PASS : FAIL,
    details: hasAfterInteractive
      ? 'GA script uses strategy="afterInteractive" (non-blocking)'
      : "GA script should use afterInteractive strategy to avoid blocking page load",
  };
});

// ─── Print Results ──────────────────────────────────────────────────────────

function printResults() {
  console.log("\n");
  console.log("=".repeat(90));
  console.log("  SEO COMPLIANCE AUDIT REPORT");
  console.log("=".repeat(90));
  console.log("");

  // Group by category
  const categories = [...new Set(results.map((r) => r.category))];
  let totalPass = 0;
  let totalFail = 0;
  const failures: TestResult[] = [];

  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    console.log(`  ${cat}`);
    console.log("  " + "-".repeat(cat.length));

    for (const r of catResults) {
      const icon = r.status === PASS ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
      const line = `    [${icon}] ${r.name}`;
      console.log(line);
      if (r.status === PASS) {
        totalPass++;
      } else {
        totalFail++;
        failures.push(r);
      }
    }
    console.log("");
  }

  // Summary
  const total = totalPass + totalFail;
  console.log("=".repeat(90));
  const color = totalFail === 0 ? "\x1b[32m" : "\x1b[33m";
  console.log(`  ${color}SUMMARY: ${totalPass}/${total} tests passed\x1b[0m`);

  if (failures.length > 0) {
    console.log("");
    console.log("  \x1b[31mFAILURES:\x1b[0m");
    for (const f of failures) {
      console.log(`    [${f.category}] ${f.name}`);
      console.log(`      -> ${f.details}`);
    }
  } else {
    console.log("  All SEO compliance checks passed.");
  }

  console.log("=".repeat(90));
  console.log("");

  // Exit code: non-zero if any failures
  process.exit(totalFail > 0 ? 1 : 0);
}

printResults();
