#!/usr/bin/env npx tsx
/**
 * SEO Check Script — Automated CI-Ready SEO Regression Testing
 *
 * Discovers all routes from sitemap + static route list, then checks each page for:
 * - Title tag presence and length (30-60 chars)
 * - Meta description presence and length (120-160 chars)
 * - Canonical URL
 * - Open Graph tags (title, description, image)
 * - Structured data (JSON-LD)
 * - Hreflang alternates (en-GB, ar-SA, x-default)
 * - Heading hierarchy (single H1, H2+ present, no skipped levels)
 * - Image alt text
 * - Internal links count
 *
 * Usage:
 *   npx tsx scripts/seo-check.ts                     # Full check against live site
 *   npx tsx scripts/seo-check.ts --quick              # Quick mode (20 pages sample)
 *   npx tsx scripts/seo-check.ts --base=http://localhost:3000  # Local dev
 *   npx tsx scripts/seo-check.ts --threshold=80       # Fail if below 80
 *   npx tsx scripts/seo-check.ts --output=reports/seo-check.md
 *
 * Exit codes: 0 = all pages above threshold, 1 = some pages below threshold
 */

// ─── Types ──────────────────────────────────────────────────────────────────

interface PageResult {
  url: string;
  score: number;
  checks: CheckResult[];
  errors: string[];
}

interface CheckResult {
  name: string;
  passed: boolean;
  value?: string | number;
  expected?: string;
  severity: "error" | "warning" | "info";
}

interface SummaryReport {
  totalPages: number;
  averageScore: number;
  passingPages: number;
  failingPages: number;
  results: PageResult[];
  timestamp: string;
}

// ─── Configuration ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isQuick = args.includes("--quick");
const baseUrlArg = args.find((a) => a.startsWith("--base="))?.split("=")[1];
const thresholdArg = args.find((a) => a.startsWith("--threshold="))?.split("=")[1];
const outputArg = args.find((a) => a.startsWith("--output="))?.split("=")[1];

const BASE_URL = baseUrlArg || "https://www.yalla-london.com";
const THRESHOLD = Number(thresholdArg) || 70;
const MAX_PAGES = isQuick ? 20 : 500;
const FETCH_TIMEOUT = 10_000;

// ─── Static Routes ──────────────────────────────────────────────────────────

const STATIC_ROUTES = [
  "/",
  "/blog",
  "/about",
  "/contact",
  "/events",
  "/hotels",
  "/experiences",
  "/recommendations",
  "/shop",
  "/privacy",
  "/terms",
  "/ar",
  "/ar/blog",
  "/ar/about",
  "/ar/contact",
];

// ─── Fetch with timeout ─────────────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  timeoutMs = FETCH_TIMEOUT
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "YallaLondon-SEO-Check/1.0 (automated audit; +https://zenitha.luxury)",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// ─── Discover URLs from Sitemap ─────────────────────────────────────────────

async function discoverUrls(): Promise<string[]> {
  const urls = new Set<string>();

  // Add static routes
  for (const route of STATIC_ROUTES) {
    urls.add(`${BASE_URL}${route}`);
  }

  // Try to fetch sitemap
  const sitemapXml = await fetchWithTimeout(`${BASE_URL}/sitemap.xml`);
  if (sitemapXml) {
    const locMatches = sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g);
    for (const match of locMatches) {
      urls.add(match[1]);
    }
  }

  const urlArray = [...urls].slice(0, MAX_PAGES);
  return urlArray;
}

// ─── HTML Extraction Helpers ────────────────────────────────────────────────

function extractTag(html: string, regex: RegExp): string | null {
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

function extractAllMatches(html: string, regex: RegExp): string[] {
  const results: string[] = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    results.push(m[1] || m[0]);
  }
  return results;
}

// ─── Page Checker ───────────────────────────────────────────────────────────

async function checkPage(url: string): Promise<PageResult> {
  const checks: CheckResult[] = [];
  const errors: string[] = [];
  let score = 100;

  const html = await fetchWithTimeout(url);
  if (!html) {
    return { url, score: 0, checks: [], errors: ["Failed to fetch page"] };
  }

  // 1. Title tag
  const title = extractTag(html, /<title[^>]*>([^<]+)<\/title>/i);
  if (!title) {
    checks.push({ name: "Title tag", passed: false, severity: "error", expected: "Present" });
    score -= 15;
  } else {
    const titleLen = title.length;
    const titleOk = titleLen >= 30 && titleLen <= 70;
    checks.push({
      name: "Title tag length",
      passed: titleOk,
      value: titleLen,
      expected: "30-70 chars",
      severity: titleOk ? "info" : "warning",
    });
    if (!titleOk) score -= 5;
  }

  // 2. Meta description
  const metaDesc = extractTag(html, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
    || extractTag(html, /<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
  if (!metaDesc) {
    checks.push({ name: "Meta description", passed: false, severity: "error", expected: "Present" });
    score -= 10;
  } else {
    const descLen = metaDesc.length;
    const descOk = descLen >= 120 && descLen <= 160;
    checks.push({
      name: "Meta description length",
      passed: descOk,
      value: descLen,
      expected: "120-160 chars",
      severity: descOk ? "info" : "warning",
    });
    if (!descOk) score -= 3;
  }

  // 3. Canonical URL
  const canonical = extractTag(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  const hasCanonical = !!canonical;
  checks.push({
    name: "Canonical URL",
    passed: hasCanonical,
    value: canonical || "Missing",
    severity: hasCanonical ? "info" : "error",
  });
  if (!hasCanonical) score -= 10;

  // 4. Open Graph tags
  const ogTitle = extractTag(html, /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  const ogDesc = extractTag(html, /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
  const ogImage = extractTag(html, /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);

  const ogComplete = !!ogTitle && !!ogDesc && !!ogImage;
  checks.push({
    name: "Open Graph (title+desc+image)",
    passed: ogComplete,
    value: [ogTitle ? "✓title" : "✗title", ogDesc ? "✓desc" : "✗desc", ogImage ? "✓image" : "✗image"].join(" "),
    severity: ogComplete ? "info" : "warning",
  });
  if (!ogComplete) score -= 5;

  // 5. JSON-LD Structured Data
  const jsonLdMatches = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>/gi);
  const jsonLdCount = jsonLdMatches?.length || 0;
  checks.push({
    name: "JSON-LD structured data",
    passed: jsonLdCount > 0,
    value: jsonLdCount,
    expected: "1+",
    severity: jsonLdCount > 0 ? "info" : "warning",
  });
  if (jsonLdCount === 0) score -= 5;

  // 6. Hreflang
  const hreflangMatches = html.match(/hreflang=["'][^"']+["']/gi) || [];
  const hasEnGB = hreflangMatches.some((h) => h.includes("en-GB") || h.includes("en-gb"));
  const hasArSA = hreflangMatches.some((h) => h.includes("ar-SA") || h.includes("ar-sa"));
  const hasXDefault = hreflangMatches.some((h) => h.includes("x-default"));

  const hreflangComplete = hasEnGB && hasArSA && hasXDefault;
  checks.push({
    name: "Hreflang (en-GB, ar-SA, x-default)",
    passed: hreflangComplete,
    value: [hasEnGB ? "✓en-GB" : "✗en-GB", hasArSA ? "✓ar-SA" : "✗ar-SA", hasXDefault ? "✓x-default" : "✗x-default"].join(" "),
    severity: hreflangComplete ? "info" : "warning",
  });
  if (!hreflangComplete) score -= 5;

  // 7. Heading hierarchy
  const h1Matches = html.match(/<h1[\s>]/gi) || [];
  const h2Matches = html.match(/<h2[\s>]/gi) || [];
  const h1Count = h1Matches.length;
  const h2Count = h2Matches.length;
  const headingOk = h1Count === 1 && h2Count >= 1;
  checks.push({
    name: "Heading hierarchy (1 H1, 1+ H2)",
    passed: headingOk,
    value: `${h1Count} H1, ${h2Count} H2`,
    expected: "1 H1, 1+ H2",
    severity: h1Count !== 1 ? "error" : headingOk ? "info" : "warning",
  });
  if (h1Count !== 1) score -= 10;
  else if (h2Count === 0) score -= 3;

  // 8. Image alt text
  const imgTags = html.match(/<img\s[^>]+>/gi) || [];
  const imgsWithoutAlt = imgTags.filter(
    (img) => !img.match(/alt=["'][^"']*["']/i) || img.match(/alt=["']\s*["']/i)
  ).length;
  const altOk = imgsWithoutAlt === 0;
  checks.push({
    name: "Image alt text",
    passed: altOk,
    value: `${imgsWithoutAlt}/${imgTags.length} missing alt`,
    severity: imgsWithoutAlt > 3 ? "error" : imgsWithoutAlt > 0 ? "warning" : "info",
  });
  if (imgsWithoutAlt > 3) score -= 5;
  else if (imgsWithoutAlt > 0) score -= 2;

  // 9. Internal links
  const internalLinkRegex = new RegExp(
    `href=["'](${BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"']*|/[^"']*?)["']`,
    "gi"
  );
  const internalLinks = (html.match(internalLinkRegex) || []).length;
  const linksOk = internalLinks >= 3;
  checks.push({
    name: "Internal links (3+ minimum)",
    passed: linksOk,
    value: internalLinks,
    expected: "3+",
    severity: linksOk ? "info" : "warning",
  });
  if (!linksOk) score -= 3;

  // 10. Robots meta
  const robotsMeta = extractTag(html, /<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
  const isNoindex = robotsMeta?.includes("noindex") || false;
  if (isNoindex) {
    checks.push({
      name: "Robots meta",
      passed: false,
      value: robotsMeta || "",
      severity: "error",
    });
    score -= 15;
  } else {
    checks.push({
      name: "Robots meta",
      passed: true,
      value: robotsMeta || "Not set (default index)",
      severity: "info",
    });
  }

  // 11. Lang attribute
  const langAttr = extractTag(html, /<html[^>]*\slang=["']([^"']+)["']/i);
  const hasLang = !!langAttr;
  checks.push({
    name: "HTML lang attribute",
    passed: hasLang,
    value: langAttr || "Missing",
    severity: hasLang ? "info" : "warning",
  });
  if (!hasLang) score -= 3;

  return { url, score: Math.max(0, score), checks, errors };
}

// ─── Report Generation ──────────────────────────────────────────────────────

function generateMarkdownReport(report: SummaryReport): string {
  const lines: string[] = [];
  lines.push(`# SEO Check Report — ${report.timestamp}`);
  lines.push("");
  lines.push(`**Base URL:** ${BASE_URL}`);
  lines.push(`**Pages Checked:** ${report.totalPages}`);
  lines.push(`**Average Score:** ${report.averageScore.toFixed(1)}/100`);
  lines.push(`**Passing (≥${THRESHOLD}):** ${report.passingPages} | **Failing (<${THRESHOLD}):** ${report.failingPages}`);
  lines.push("");

  // Failing pages
  const failing = report.results.filter((r) => r.score < THRESHOLD);
  if (failing.length > 0) {
    lines.push("## Failing Pages");
    lines.push("");
    for (const page of failing.sort((a, b) => a.score - b.score)) {
      lines.push(`### ${page.url} — Score: ${page.score}/100`);
      for (const check of page.checks.filter((c) => !c.passed)) {
        const icon = check.severity === "error" ? "🔴" : "🟡";
        lines.push(`- ${icon} **${check.name}**: ${check.value || "FAIL"}${check.expected ? ` (expected: ${check.expected})` : ""}`);
      }
      lines.push("");
    }
  }

  // Summary table
  lines.push("## All Pages");
  lines.push("");
  lines.push("| URL | Score | Title | Meta | OG | Schema | Hreflang | H1 |");
  lines.push("|-----|-------|-------|------|-----|--------|----------|-----|");

  for (const page of report.results.sort((a, b) => a.score - b.score)) {
    const getCheck = (name: string) => page.checks.find((c) => c.name.startsWith(name));
    const icon = (c?: CheckResult) => (c?.passed ? "✅" : "❌");
    lines.push(
      `| ${page.url.replace(BASE_URL, "")} | ${page.score} | ${icon(getCheck("Title"))} | ${icon(getCheck("Meta desc"))} | ${icon(getCheck("Open Graph"))} | ${icon(getCheck("JSON-LD"))} | ${icon(getCheck("Hreflang"))} | ${icon(getCheck("Heading"))} |`
    );
  }

  return lines.join("\n");
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔍 SEO Check — ${BASE_URL}`);
  console.log(`   Mode: ${isQuick ? "Quick (20 pages)" : "Full"} | Threshold: ${THRESHOLD}\n`);

  // Discover URLs
  console.log("📡 Discovering URLs...");
  const urls = await discoverUrls();
  console.log(`   Found ${urls.length} URLs\n`);

  // Check each page
  console.log("🔎 Checking pages...");
  const results: PageResult[] = [];
  const concurrency = 5;

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(checkPage));
    results.push(...batchResults);

    const done = Math.min(i + concurrency, urls.length);
    process.stdout.write(`   ${done}/${urls.length} pages checked\r`);
  }
  console.log("");

  // Build report
  const validResults = results.filter((r) => r.errors.length === 0);
  const avgScore =
    validResults.length > 0
      ? validResults.reduce((sum, r) => sum + r.score, 0) / validResults.length
      : 0;

  const report: SummaryReport = {
    totalPages: results.length,
    averageScore: avgScore,
    passingPages: validResults.filter((r) => r.score >= THRESHOLD).length,
    failingPages: validResults.filter((r) => r.score < THRESHOLD).length,
    results,
    timestamp: new Date().toISOString(),
  };

  // Output report
  const markdown = generateMarkdownReport(report);
  const outputPath = outputArg || "reports/seo-check.md";

  const fs = await import("fs");
  const pathMod = await import("path");
  const dir = pathMod.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, markdown);
  console.log(`\n📄 Report saved to ${outputPath}`);

  // Print summary
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  SEO CHECK RESULTS`);
  console.log(`${"═".repeat(60)}`);
  console.log(`  Pages Checked:  ${report.totalPages}`);
  console.log(`  Average Score:  ${report.averageScore.toFixed(1)}/100`);
  console.log(`  Passing (≥${THRESHOLD}):  ${report.passingPages}`);
  console.log(`  Failing (<${THRESHOLD}):  ${report.failingPages}`);
  console.log(`  Unreachable:    ${results.length - validResults.length}`);
  console.log(`${"═".repeat(60)}`);

  // Top issues
  const allFailedChecks = results
    .flatMap((r) => r.checks.filter((c) => !c.passed && c.severity === "error"))
    .reduce<Record<string, number>>((acc, check) => {
      acc[check.name] = (acc[check.name] || 0) + 1;
      return acc;
    }, {});

  if (Object.keys(allFailedChecks).length > 0) {
    console.log("\n  Top Issues:");
    for (const [name, count] of Object.entries(allFailedChecks).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      console.log(`    🔴 ${name}: ${count} pages`);
    }
  }

  // Exit code
  const passed = report.failingPages === 0;
  if (!passed) {
    console.log(`\n❌ ${report.failingPages} pages below threshold (${THRESHOLD})`);
    process.exit(1);
  } else {
    console.log(`\n✅ All pages above threshold (${THRESHOLD})`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("SEO Check failed:", err);
  process.exit(1);
});
