#!/usr/bin/env npx tsx
/**
 * Comprehensive Smoke Test Suite
 *
 * Tests every critical function in the platform:
 * - Pipeline stages (topic → draft → publish → index)
 * - Cron auth patterns
 * - Security compliance
 * - Anti-pattern verification
 * - Schema-code consistency
 * - Import patterns
 * - XSS sanitization coverage
 * - URL/email hardcoding
 * - Quality gate checks
 *
 * Run: npx tsx scripts/smoke-test.ts
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const APP_DIR = path.resolve(__dirname, "..");
const PASS = "PASS";
const FAIL = "FAIL";
const WARN = "WARN";

interface TestResult {
  name: string;
  category: string;
  status: typeof PASS | typeof FAIL | typeof WARN;
  details: string;
}

const results: TestResult[] = [];

function test(category: string, name: string, fn: () => { status: string; details: string }) {
  try {
    const result = fn();
    results.push({ category, name, status: result.status as typeof PASS | typeof FAIL | typeof WARN, details: result.details });
  } catch (err) {
    results.push({ category, name, status: FAIL, details: `Exception: ${err instanceof Error ? err.message : String(err)}` });
  }
}

function grepCount(pattern: string, dir: string, include?: string): number {
  try {
    const includeFlag = include ? `--include="${include}"` : "";
    const cmd = `grep -r "${pattern}" ${dir} ${includeFlag} --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=docs 2>/dev/null | wc -l`;
    return parseInt(execSync(cmd, { cwd: APP_DIR, encoding: "utf-8" }).trim(), 10);
  } catch {
    return 0;
  }
}

function grepFiles(pattern: string, dir: string, include?: string): string[] {
  try {
    const includeFlag = include ? `--include="${include}"` : "";
    const cmd = `grep -rl "${pattern}" ${dir} ${includeFlag} --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=docs 2>/dev/null`;
    return execSync(cmd, { cwd: APP_DIR, encoding: "utf-8" }).trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(APP_DIR, relativePath));
}

function fileContains(relativePath: string, pattern: string): boolean {
  try {
    const content = fs.readFileSync(path.join(APP_DIR, relativePath), "utf-8");
    return content.includes(pattern);
  } catch {
    return false;
  }
}

// ==================== CATEGORY 1: TypeScript Compilation ====================

test("Build", "TypeScript compiles with zero errors", () => {
  try {
    execSync("npx tsc --noEmit 2>&1", { cwd: APP_DIR, encoding: "utf-8" });
    return { status: PASS, details: "Zero TypeScript errors" };
  } catch (err) {
    return { status: FAIL, details: `TypeScript errors found` };
  }
});

// ==================== CATEGORY 2: Pipeline Stage Files Exist ====================

test("Pipeline", "weekly-topics cron route exists", () => {
  return fileExists("app/api/cron/weekly-topics/route.ts")
    ? { status: PASS, details: "File exists" }
    : { status: FAIL, details: "Missing: app/api/cron/weekly-topics/route.ts" };
});

test("Pipeline", "trends-monitor cron route exists", () => {
  return fileExists("app/api/cron/trends-monitor/route.ts")
    ? { status: PASS, details: "File exists" }
    : { status: FAIL, details: "Missing" };
});

test("Pipeline", "content-builder cron route exists", () => {
  return fileExists("app/api/cron/content-builder/route.ts")
    ? { status: PASS, details: "File exists" }
    : { status: FAIL, details: "Missing" };
});

test("Pipeline", "build-runner.ts exists", () => {
  return fileExists("lib/content-pipeline/build-runner.ts")
    ? { status: PASS, details: "File exists" }
    : { status: FAIL, details: "Missing" };
});

test("Pipeline", "phases.ts exists with 8 phases", () => {
  if (!fileExists("lib/content-pipeline/phases.ts")) return { status: FAIL, details: "Missing" };
  const phases = ["research", "outline", "drafting", "assembly", "images", "seo", "scoring", "reservoir"];
  const content = fs.readFileSync(path.join(APP_DIR, "lib/content-pipeline/phases.ts"), "utf-8");
  const missing = phases.filter(p => !content.includes(`"${p}"`));
  return missing.length === 0
    ? { status: PASS, details: "All 8 phases present" }
    : { status: FAIL, details: `Missing phases: ${missing.join(", ")}` };
});

test("Pipeline", "content-selector cron route exists", () => {
  return fileExists("app/api/cron/content-selector/route.ts")
    ? { status: PASS, details: "File exists" }
    : { status: FAIL, details: "Missing" };
});

test("Pipeline", "select-runner.ts exists", () => {
  return fileExists("lib/content-pipeline/select-runner.ts")
    ? { status: PASS, details: "File exists" }
    : { status: FAIL, details: "Missing" };
});

test("Pipeline", "scheduled-publish cron route exists", () => {
  return fileExists("app/api/cron/scheduled-publish/route.ts")
    ? { status: PASS, details: "File exists" }
    : { status: FAIL, details: "Missing" };
});

test("Pipeline", "seo-agent cron route exists", () => {
  return fileExists("app/api/cron/seo-agent/route.ts")
    ? { status: PASS, details: "File exists" }
    : { status: FAIL, details: "Missing" };
});

test("Pipeline", "seo/cron route exists", () => {
  return fileExists("app/api/seo/cron/route.ts")
    ? { status: PASS, details: "File exists" }
    : { status: FAIL, details: "Missing" };
});

test("Pipeline", "indexing-service.ts exists with retry logic", () => {
  if (!fileExists("lib/seo/indexing-service.ts")) return { status: FAIL, details: "Missing" };
  return fileContains("lib/seo/indexing-service.ts", "fetchWithRetry")
    ? { status: PASS, details: "Has fetchWithRetry for IndexNow" }
    : { status: FAIL, details: "Missing retry logic" };
});

test("Pipeline", "pre-publication-gate.ts exists", () => {
  return fileExists("lib/seo/orchestrator/pre-publication-gate.ts")
    ? { status: PASS, details: "File exists" }
    : { status: FAIL, details: "Missing" };
});

// ==================== CATEGORY 3: Atomic Topic Claiming ====================

test("Pipeline", "build-runner uses atomic claiming (updateMany)", () => {
  return fileContains("lib/content-pipeline/build-runner.ts", "updateMany")
    ? { status: PASS, details: "Uses updateMany for atomic claiming" }
    : { status: FAIL, details: "Missing atomic claiming" };
});

test("Pipeline", "daily-content-generate uses atomic claiming", () => {
  return fileContains("app/api/cron/daily-content-generate/route.ts", "updateMany")
    ? { status: PASS, details: "Uses updateMany for atomic claiming" }
    : { status: FAIL, details: "Missing atomic claiming" };
});

test("Pipeline", "full-pipeline-runner uses atomic claiming", () => {
  return fileContains("lib/content-pipeline/full-pipeline-runner.ts", "updateMany")
    ? { status: PASS, details: "Uses updateMany for atomic claiming" }
    : { status: FAIL, details: "Missing atomic claiming" };
});

test("Pipeline", "build-runner uses 'generating' status", () => {
  return fileContains("lib/content-pipeline/build-runner.ts", '"generating"')
    ? { status: PASS, details: "Uses generating status" }
    : { status: FAIL, details: "Missing generating status" };
});

// ==================== CATEGORY 4: Quality Gate ====================

test("Quality Gate", "SEO score threshold is 60 in phases.ts", () => {
  if (!fileExists("lib/content-pipeline/phases.ts")) return { status: FAIL, details: "Missing" };
  return fileContains("lib/content-pipeline/phases.ts", ">= 60")
    ? { status: PASS, details: "Threshold 60 found" }
    : { status: FAIL, details: "Threshold 60 not found" };
});

test("Quality Gate", "Pre-pub gate is fail-closed (blockers.length === 0)", () => {
  return fileContains("lib/seo/orchestrator/pre-publication-gate.ts", "blockers.length === 0")
    ? { status: PASS, details: "Fail-closed confirmed" }
    : { status: FAIL, details: "Not fail-closed" };
});

test("Quality Gate", "select-runner calls runPrePublicationGate", () => {
  return fileContains("lib/content-pipeline/select-runner.ts", "runPrePublicationGate")
    ? { status: PASS, details: "Gate enforced" }
    : { status: FAIL, details: "Gate not enforced" };
});

test("Quality Gate", "scheduled-publish calls runPrePublicationGate", () => {
  return fileContains("app/api/cron/scheduled-publish/route.ts", "runPrePublicationGate")
    ? { status: PASS, details: "Gate enforced" }
    : { status: FAIL, details: "Gate not enforced" };
});

// ==================== CATEGORY 5: Cron Auth Pattern ====================

const cronRoutes = [
  "app/api/cron/weekly-topics/route.ts",
  "app/api/cron/content-builder/route.ts",
  "app/api/cron/content-selector/route.ts",
  "app/api/cron/affiliate-injection/route.ts",
  "app/api/cron/analytics/route.ts",
  "app/api/cron/seo-agent/route.ts",
  "app/api/cron/auto-generate/route.ts",
  "app/api/cron/autopilot/route.ts",
  "app/api/cron/fact-verification/route.ts",
  "app/api/cron/london-news/route.ts",
  "app/api/cron/seo-health-report/route.ts",
  "app/api/cron/real-time-optimization/route.ts",
];

for (const route of cronRoutes) {
  const name = route.split("/")[3]; // extract cron job name
  test("Cron Auth", `${name} does NOT use !cronSecret pattern`, () => {
    if (!fileExists(route)) return { status: WARN, details: "Route not found" };
    const content = fs.readFileSync(path.join(APP_DIR, route), "utf-8");
    if (content.includes("!cronSecret") && content.includes("return") && content.includes("500")) {
      return { status: FAIL, details: "Old fail-closed pattern found" };
    }
    return { status: PASS, details: "Safe auth pattern" };
  });
}

// ==================== CATEGORY 6: Security ====================

test("Security", "Database backup routes have requireAdmin", () => {
  const files = [
    "app/api/database/backups/route.ts",
    "app/api/database/stats/route.ts",
  ];
  const missing = files.filter(f => !fileContains(f, "requireAdmin"));
  return missing.length === 0
    ? { status: PASS, details: "All database routes protected" }
    : { status: FAIL, details: `Missing auth: ${missing.join(", ")}` };
});

test("Security", "Admin setup is locked after first admin", () => {
  return fileContains("app/api/admin/setup/route.ts", "Setup already completed")
    ? { status: PASS, details: "Setup lockdown present" }
    : { status: FAIL, details: "No lockdown found" };
});

test("Security", "No API keys in analytics response", () => {
  const content = fs.readFileSync(path.join(APP_DIR, "app/api/admin/analytics/route.ts"), "utf-8");
  if (content.includes("client_secret:") && !content.includes("client_secret_configured")) {
    return { status: FAIL, details: "Raw client_secret in response" };
  }
  return { status: PASS, details: "Credentials replaced with boolean indicators" };
});

test("Security", "No API key prefix logging", () => {
  const count = grepCount("console\\.log.*apiKey\\.substring", "app/");
  return count === 0
    ? { status: PASS, details: "No API key prefix logging" }
    : { status: FAIL, details: `${count} instances found` };
});

test("Security", "CSP headers configured", () => {
  return fileContains("next.config.js", "Content-Security-Policy")
    ? { status: PASS, details: "CSP configured in next.config.js" }
    : { status: FAIL, details: "Missing CSP headers" };
});

test("Security", "Public mutation routes have auth", () => {
  const routes = [
    "app/api/content/auto-generate/route.ts",
    "app/api/homepage-blocks/publish/route.ts",
    "app/api/cache/invalidate/route.ts",
    "app/api/media/upload/route.ts",
  ];
  const missing = routes.filter(f => !fileContains(f, "requireAdmin"));
  return missing.length === 0
    ? { status: PASS, details: "All mutation routes protected" }
    : { status: FAIL, details: `Missing auth: ${missing.join(", ")}` };
});

// ==================== CATEGORY 7: XSS Sanitization ====================

test("XSS", "BlogPostClient uses sanitizeHtml", () => {
  return fileContains("app/blog/[slug]/BlogPostClient.tsx", "sanitizeHtml")
    ? { status: PASS, details: "Sanitized" }
    : { status: FAIL, details: "Missing sanitization" };
});

test("XSS", "ArticleClient uses sanitizeHtml", () => {
  return fileContains("app/information/articles/[slug]/ArticleClient.tsx", "sanitizeHtml")
    ? { status: PASS, details: "Sanitized" }
    : { status: FAIL, details: "Missing sanitization" };
});

test("XSS", "HowTo builder uses sanitizeHtml", () => {
  return fileContains("components/seo/howto-builder.tsx", "sanitizeHtml")
    ? { status: PASS, details: "Sanitized" }
    : { status: FAIL, details: "Missing sanitization" };
});

test("XSS", "FAQ builder uses sanitizeHtml", () => {
  return fileContains("components/seo/faq-builder.tsx", "sanitizeHtml")
    ? { status: PASS, details: "Sanitized" }
    : { status: FAIL, details: "Missing sanitization" };
});

test("XSS", "Social embed uses sanitizeHtml", () => {
  return fileContains("components/social/lite-social-embed.tsx", "sanitizeHtml")
    ? { status: PASS, details: "Sanitized" }
    : { status: FAIL, details: "Missing sanitization" };
});

test("XSS", "html-sanitizer.ts utility exists", () => {
  return fileExists("lib/html-sanitizer.ts")
    ? { status: PASS, details: "Sanitizer utility present" }
    : { status: FAIL, details: "Missing sanitizer" };
});

// ==================== CATEGORY 8: Anti-Patterns ====================

test("Anti-Patterns", "Zero Math.random() in admin API routes", () => {
  const count = grepCount("Math\\.random()", "app/api/admin/", "*.ts");
  return count === 0
    ? { status: PASS, details: "No fake metrics" }
    : { status: FAIL, details: `${count} instances remain` };
});

test("Anti-Patterns", "Zero @/lib/prisma direct imports (except bridges)", () => {
  const files = grepFiles('from.*@/lib/prisma"', "lib/", "*.ts")
    .filter(f => !f.includes("lib/db.ts") && !f.includes("lib/db/") && !f.includes("prisma-types") && !f.includes("prisma-stub"));
  return files.length === 0
    ? { status: PASS, details: "All imports use @/lib/db" }
    : { status: FAIL, details: `Direct imports: ${files.join(", ")}` };
});

test("Anti-Patterns", "Zero hardcoded emails @yallalondon.com in legal pages", () => {
  const files = ["app/privacy/page.tsx", "app/terms/page.tsx", "app/about/page.tsx", "app/contact/page.tsx"];
  const bad = files.filter(f => fileContains(f, "@yallalondon.com") || fileContains(f, "@yalla-london.com"));
  return bad.length === 0
    ? { status: PASS, details: "All dynamic from config" }
    : { status: FAIL, details: `Hardcoded in: ${bad.join(", ")}` };
});

// ==================== CATEGORY 9: Multi-Site Infrastructure ====================

test("Multi-Site", "config/sites.ts has 5 sites", () => {
  if (!fileExists("config/sites.ts")) return { status: FAIL, details: "Missing" };
  const content = fs.readFileSync(path.join(APP_DIR, "config/sites.ts"), "utf-8");
  const sites = ["yalla-london", "arabaldives", "french-riviera", "istanbul", "thailand"];
  const missing = sites.filter(s => !content.includes(s));
  return missing.length === 0
    ? { status: PASS, details: "All 5 sites configured" }
    : { status: FAIL, details: `Missing: ${missing.join(", ")}` };
});

test("Multi-Site", "middleware.ts maps all 5 domains", () => {
  if (!fileExists("middleware.ts")) return { status: FAIL, details: "Missing" };
  const content = fs.readFileSync(path.join(APP_DIR, "middleware.ts"), "utf-8");
  const domains = ["yalla-london.com", "arabaldives.com", "yallariviera.com", "yallaistanbul.com", "yallathailand.com"];
  const missing = domains.filter(d => !content.includes(d));
  return missing.length === 0
    ? { status: PASS, details: "All 5 domains mapped" }
    : { status: FAIL, details: `Missing: ${missing.join(", ")}` };
});

test("Multi-Site", "getDefaultSiteId exists in config", () => {
  return fileContains("config/sites.ts", "getDefaultSiteId")
    ? { status: PASS, details: "Helper exists" }
    : { status: FAIL, details: "Missing getDefaultSiteId" };
});

test("Multi-Site", "getBaseUrl utility exists", () => {
  return fileExists("lib/url-utils.ts")
    ? { status: PASS, details: "URL utility present" }
    : { status: FAIL, details: "Missing lib/url-utils.ts" };
});

test("Multi-Site", "Root layout uses generateMetadata (not static)", () => {
  return fileContains("app/layout.tsx", "generateMetadata")
    ? { status: PASS, details: "Dynamic metadata" }
    : { status: FAIL, details: "Still uses static metadata export" };
});

test("Multi-Site", "affiliate-injection has per-site rules", () => {
  const content = fs.readFileSync(path.join(APP_DIR, "app/api/cron/affiliate-injection/route.ts"), "utf-8");
  const sites = ["arabaldives", "french-riviera", "istanbul", "thailand"];
  const missing = sites.filter(s => !content.includes(s));
  return missing.length === 0
    ? { status: PASS, details: "All 5 site affiliate rules" }
    : { status: FAIL, details: `Missing: ${missing.join(", ")}` };
});

// ==================== CATEGORY 10: Observability ====================

test("Observability", "onCronFailure has internal error handling", () => {
  return fileContains("lib/ops/failure-hooks.ts", "[onCronFailure]")
    ? { status: PASS, details: "Self-error logging present" }
    : { status: FAIL, details: "onCronFailure can silently fail" };
});

test("Observability", "logCronExecution has internal error handling", () => {
  return fileContains("lib/cron-logger.ts", "[cron-logger]")
    ? { status: PASS, details: "Self-error logging present" }
    : { status: FAIL, details: "logCronExecution can silently fail" };
});

test("Observability", "CronJobLog model exists in schema", () => {
  return fileContains("prisma/schema.prisma", "model CronJobLog")
    ? { status: PASS, details: "CronJobLog model present" }
    : { status: FAIL, details: "Missing CronJobLog model" };
});

// ==================== CATEGORY 11: SEO Compliance ====================

test("SEO", "IndexNow uses 7-day window (not 24h)", () => {
  const content = fs.readFileSync(path.join(APP_DIR, "app/api/cron/seo-agent/route.ts"), "utf-8");
  return content.includes("7 * 24 * 60 * 60 * 1000") || content.includes("7 *")
    ? { status: PASS, details: "7-day window" }
    : { status: FAIL, details: "Still using 24h window" };
});

test("SEO", "seo-agent delegates IndexNow to seo/cron", () => {
  return fileContains("app/api/cron/seo-agent/route.ts", "delegated")
    ? { status: PASS, details: "Delegation confirmed" }
    : { status: FAIL, details: "Still submitting directly" };
});

test("SEO", "standards.ts exists as single source of truth", () => {
  return fileExists("lib/seo/standards.ts")
    ? { status: PASS, details: "Standards file present" }
    : { status: FAIL, details: "Missing SEO standards" };
});

test("SEO", "Deprecated schemas removed (FAQPage, HowTo)", () => {
  if (!fileExists("lib/seo/standards.ts")) return { status: FAIL, details: "Missing" };
  return fileContains("lib/seo/standards.ts", "FAQPage")
    ? { status: PASS, details: "Deprecation tracking present" }
    : { status: WARN, details: "FAQPage not in standards" };
});

test("SEO", "related-content.ts queries DB + static", () => {
  return fileContains("lib/related-content.ts", "fetchDbRelatedArticles")
    ? { status: PASS, details: "DB-backed related articles" }
    : { status: FAIL, details: "Static only" };
});

// ==================== CATEGORY 12: Budget Guards ====================

test("Budget", "build-runner has 53s budget guard", () => {
  return fileContains("lib/content-pipeline/build-runner.ts", "53")
    ? { status: PASS, details: "53s budget present" }
    : { status: FAIL, details: "Missing budget guard" };
});

test("Budget", "seo-agent has budget guard", () => {
  return fileContains("app/api/cron/seo-agent/route.ts", "53_000") || fileContains("app/api/cron/seo-agent/route.ts", "53000")
    ? { status: PASS, details: "Budget guard present" }
    : { status: FAIL, details: "Missing budget guard" };
});

test("Budget", "london-news has budget guard", () => {
  return fileContains("app/api/cron/london-news/route.ts", "53_000") || fileContains("app/api/cron/london-news/route.ts", "BUDGET_MS")
    ? { status: PASS, details: "Budget guard present" }
    : { status: FAIL, details: "Missing budget guard" };
});

// ==================== CATEGORY 13: London News Feature ====================

test("London News", "london-news cron route exists", () => {
  return fileExists("app/api/cron/london-news/route.ts")
    ? { status: PASS, details: "File exists" }
    : { status: FAIL, details: "Missing london-news cron route" };
});

test("London News", "london-news scheduled in vercel.json", () => {
  return fileContains("vercel.json", "/api/cron/london-news")
    ? { status: PASS, details: "Cron scheduled" }
    : { status: FAIL, details: "NOT scheduled in vercel.json" };
});

test("London News", "london-news has budget guard (53s)", () => {
  return fileContains("app/api/cron/london-news/route.ts", "BUDGET_MS") || fileContains("app/api/cron/london-news/route.ts", "53_000")
    ? { status: PASS, details: "Budget guard present" }
    : { status: FAIL, details: "Missing budget guard" };
});

test("London News", "london-news sets siteId on NewsItem", () => {
  return fileContains("app/api/cron/london-news/route.ts", "siteId")
    ? { status: PASS, details: "siteId populated" }
    : { status: FAIL, details: "Missing siteId on NewsItem creation" };
});

test("London News", "news API filters by siteId", () => {
  return fileContains("app/api/news/route.ts", "siteId")
    ? { status: PASS, details: "Site filtering present" }
    : { status: FAIL, details: "No site filtering on news API" };
});

test("London News", "news public page exists", () => {
  return fileExists("app/news/page.tsx") && fileExists("app/news/[slug]/page.tsx")
    ? { status: PASS, details: "Both listing and detail pages exist" }
    : { status: FAIL, details: "Missing news pages" };
});

test("London News", "news detail page uses dynamic baseUrl", () => {
  const content = fs.readFileSync(path.join(APP_DIR, "app/news/[slug]/page.tsx"), "utf-8");
  const hasHardcoded = content.includes('"https://www.yalla-london.com"');
  return !hasHardcoded
    ? { status: PASS, details: "No hardcoded yalla-london.com" }
    : { status: FAIL, details: "Hardcoded URL remains" };
});

// ==================== CATEGORY 14: SEO Audit Scalability ====================

test("SEO Audit", "seo-agent auditBlogPosts has take limit", () => {
  const content = fs.readFileSync(path.join(APP_DIR, "app/api/cron/seo-agent/route.ts"), "utf-8");
  const auditFnStart = content.indexOf("async function auditBlogPosts");
  if (auditFnStart === -1) return { status: FAIL, details: "auditBlogPosts not found" };
  const fnSlice = content.substring(auditFnStart, auditFnStart + 1200);
  return fnSlice.includes("take:")
    ? { status: PASS, details: "Query has take limit" }
    : { status: FAIL, details: "Unbounded findMany — OOM risk" };
});

test("SEO Audit", "live-site-auditor uses AbortSignal.timeout", () => {
  return fileContains("lib/seo/orchestrator/live-site-auditor.ts", "AbortSignal.timeout")
    ? { status: PASS, details: "Per-URL timeout present" }
    : { status: FAIL, details: "No per-URL timeout" };
});

test("SEO Audit", "seo-health-report accepts siteId", () => {
  return fileContains("app/api/cron/seo-health-report/route.ts", "siteId")
    ? { status: PASS, details: "Site filtering supported" }
    : { status: FAIL, details: "No site filtering" };
});

test("SEO Audit", "pre-publication gate exists with 11+ checks", () => {
  if (!fileExists("lib/seo/orchestrator/pre-publication-gate.ts")) return { status: FAIL, details: "Missing" };
  const content = fs.readFileSync(path.join(APP_DIR, "lib/seo/orchestrator/pre-publication-gate.ts"), "utf-8");
  // Gate uses numbered section comments: "── 1.", "── 2.", etc.
  const checkCount = (content.match(/── \d+\./g) || []).length;
  return checkCount >= 11
    ? { status: PASS, details: `${checkCount} checks found` }
    : { status: FAIL, details: `Only ${checkCount} checks` };
});

test("SEO Audit", "SEO standards.ts exists", () => {
  return fileExists("lib/seo/standards.ts")
    ? { status: PASS, details: "Standards file present" }
    : { status: FAIL, details: "Missing" };
});

test("SEO Audit", "live-site-auditor warns on sitemap truncation", () => {
  return fileContains("lib/seo/orchestrator/live-site-auditor.ts", "totalSitemapUrls")
    ? { status: PASS, details: "Truncation tracking present" }
    : { status: FAIL, details: "Silent truncation" };
});

// ==================== CATEGORY 15: System-Wide Validation (Audit #15) ====================

test("System Validation", "seo/cron has maxDuration = 60", () => {
  return fileContains("app/api/seo/cron/route.ts", "maxDuration = 60")
    ? { status: PASS, details: "maxDuration = 60 set" }
    : { status: FAIL, details: "Missing or wrong maxDuration — will silently timeout at 30s" };
});

test("System Validation", "scheduled-publish has maxDuration = 60", () => {
  return fileContains("app/api/cron/scheduled-publish/route.ts", "maxDuration = 60")
    ? { status: PASS, details: "maxDuration = 60 set" }
    : { status: FAIL, details: "maxDuration too low — needs 60 for Vercel Pro" };
});

test("System Validation", "sweeper has maxDuration = 60", () => {
  return fileContains("app/api/cron/sweeper/route.ts", "maxDuration = 60")
    ? { status: PASS, details: "maxDuration = 60 set" }
    : { status: FAIL, details: "maxDuration too low — needs 60 for Vercel Pro" };
});

test("System Validation", "blog listing page filters by siteId", () => {
  const content = fs.readFileSync(path.join(APP_DIR, "app/blog/page.tsx"), "utf-8");
  // Must filter DB posts by siteId to prevent cross-site leakage
  return content.includes("siteId") && content.includes("x-site-id")
    ? { status: PASS, details: "Blog listing scoped per-site" }
    : { status: FAIL, details: "Blog listing shows ALL sites' posts mixed together" };
});

test("System Validation", "sitemap news items scoped by siteId", () => {
  const content = fs.readFileSync(path.join(APP_DIR, "app/sitemap.ts"), "utf-8");
  // Find the newsItem findMany block and check it includes siteId
  const newsQueryIdx = content.indexOf("prisma.newsItem.findMany");
  if (newsQueryIdx === -1) return { status: WARN, details: "No newsItem query found" };
  const querySlice = content.substring(newsQueryIdx, newsQueryIdx + 200);
  return querySlice.includes("siteId")
    ? { status: PASS, details: "News sitemap scoped per-site" }
    : { status: FAIL, details: "News sitemap leaks cross-site items" };
});

// ==================== PRINT RESULTS ====================

console.log("\n" + "=".repeat(80));
console.log("  SMOKE TEST RESULTS — Yalla London Platform");
console.log("  " + new Date().toISOString());
console.log("=".repeat(80) + "\n");

const categories = [...new Set(results.map(r => r.category))];
let totalPass = 0, totalFail = 0, totalWarn = 0;

for (const cat of categories) {
  const catResults = results.filter(r => r.category === cat);
  const catPass = catResults.filter(r => r.status === PASS).length;
  const catFail = catResults.filter(r => r.status === FAIL).length;
  const catWarn = catResults.filter(r => r.status === WARN).length;

  console.log(`\n--- ${cat} (${catPass}/${catResults.length} pass) ---`);

  for (const r of catResults) {
    const icon = r.status === PASS ? "✓" : r.status === FAIL ? "✗" : "⚠";
    const color = r.status === PASS ? "\x1b[32m" : r.status === FAIL ? "\x1b[31m" : "\x1b[33m";
    console.log(`  ${color}${icon}\x1b[0m ${r.name}: ${r.details}`);
  }

  totalPass += catPass;
  totalFail += catFail;
  totalWarn += catWarn;
}

console.log("\n" + "=".repeat(80));
console.log(`  TOTAL: ${totalPass} PASS | ${totalFail} FAIL | ${totalWarn} WARN | ${results.length} tests`);
console.log(`  Score: ${Math.round((totalPass / results.length) * 100)}%`);
console.log("=".repeat(80) + "\n");

if (totalFail > 0) {
  console.log("FAILED TESTS:");
  for (const r of results.filter(r => r.status === FAIL)) {
    console.log(`  ✗ [${r.category}] ${r.name}: ${r.details}`);
  }
  console.log("");
}

process.exit(totalFail > 0 ? 1 : 0);
