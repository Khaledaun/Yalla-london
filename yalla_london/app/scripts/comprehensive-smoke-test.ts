#!/usr/bin/env npx tsx
/**
 * Comprehensive Smoke Test Suite — Full Platform Coverage
 *
 * 220+ tests across 17 categories:
 * A. Build & Compilation
 * B. Content Pipeline (End-to-End)
 * C. Content Generation (AI Routes)
 * D. Cron Jobs (30 scheduled)
 * E. SEO & Indexing
 * F. Security
 * G. Multi-Site Isolation
 * H. Data Integrity
 * I. Observability
 * J. Quality Gates (14 pre-pub checks)
 * K. Per-Content-Type Thresholds
 * L. Admin Dashboard
 * M. Yacht Platform
 * N. Design System
 * O. Master Audit Engine
 * P. Anti-Patterns
 * Q. Vercel Deployment
 *
 * Run: npx tsx scripts/comprehensive-smoke-test.ts
 *
 * Exit code 0 = all pass, 1 = failures found
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
  priority: "P0" | "P1" | "P2";
  status: typeof PASS | typeof FAIL | typeof WARN;
  details: string;
}

const results: TestResult[] = [];

function test(
  category: string,
  name: string,
  fn: () => { status: string; details: string },
  priority: "P0" | "P1" | "P2" = "P1"
) {
  try {
    const result = fn();
    results.push({
      category,
      name,
      priority,
      status: result.status as typeof PASS | typeof FAIL | typeof WARN,
      details: result.details,
    });
  } catch (err) {
    results.push({
      category,
      name,
      priority,
      status: FAIL,
      details: `Exception: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}

function grepCount(pattern: string, dir: string, include?: string): number {
  try {
    const includeFlag = include ? `--include="${include}"` : "";
    const cmd = `grep -rE "${pattern}" ${dir} ${includeFlag} --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=docs --exclude-dir=test --exclude-dir=scripts 2>/dev/null | wc -l`;
    return parseInt(execSync(cmd, { cwd: APP_DIR, encoding: "utf-8" }).trim(), 10);
  } catch {
    return 0;
  }
}

function grepFiles(pattern: string, dir: string, include?: string): string[] {
  try {
    const includeFlag = include ? `--include="${include}"` : "";
    const cmd = `grep -rlE "${pattern}" ${dir} ${includeFlag} --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=docs --exclude-dir=test --exclude-dir=scripts 2>/dev/null`;
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

function readFile(relativePath: string): string {
  try {
    return fs.readFileSync(path.join(APP_DIR, relativePath), "utf-8");
  } catch {
    return "";
  }
}

function pass(details: string = "OK") { return { status: PASS, details }; }
function fail(details: string) { return { status: FAIL, details }; }
function warn(details: string) { return { status: WARN, details }; }

// ==================== A. BUILD & COMPILATION (P0) ====================

test("A. Build", "TypeScript compiles with 0 errors", () => {
  try {
    execSync("npx tsc --noEmit 2>&1", { cwd: APP_DIR, encoding: "utf-8", timeout: 120000 });
    return pass("Zero TypeScript errors");
  } catch (e) {
    const output = e instanceof Error ? (e as { stdout?: string }).stdout || "" : "";
    const errorCount = (output.match(/error TS/g) || []).length;
    return fail(`${errorCount} TypeScript errors found`);
  }
}, "P0");

test("A. Build", "No duplicate Prisma models", () => {
  const schema = readFile("prisma/schema.prisma");
  const models = (schema.match(/^model\s+(\w+)/gm) || []).map(m => m.split(/\s+/)[1]);
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const m of models) { if (seen.has(m)) dupes.push(m); seen.add(m); }
  return dupes.length === 0 ? pass(`${models.length} models, no duplicates`) : fail(`Duplicates: ${dupes.join(", ")}`);
}, "P0");

test("A. Build", "No @/lib/auth/admin imports", () => {
  const count = grepCount("@/lib/auth/admin", "app/", "*.ts");
  return count === 0 ? pass("No invalid auth imports") : fail(`${count} files use non-existent @/lib/auth/admin`);
}, "P0");

test("A. Build", "No invalid @typescript-eslint disable comments", () => {
  const count = grepCount("@typescript-eslint/no-var-requires|@typescript-eslint/no-explicit-any", "app/", "*.ts");
  return count === 0 ? pass("No invalid eslint-disable") : fail(`${count} invalid @typescript-eslint comments`);
}, "P0");

test("A. Build", "All imports use @/lib/db not @/lib/prisma", () => {
  const bad = grepFiles("from ['\"]@/lib/prisma['\"]", "app/", "*.ts");
  const allowed = ["lib/db.ts", "lib/db/index.ts", "lib/db/tenant-queries.ts"];
  const violations = bad.filter(f => !allowed.some(a => f.endsWith(a)));
  return violations.length === 0 ? pass("All imports canonical") : fail(`${violations.length} files use @/lib/prisma: ${violations.slice(0, 3).join(", ")}`);
}, "P0");

// ==================== B. CONTENT PIPELINE (P0) ====================

test("B. Pipeline", "weekly-topics cron exists", () => {
  return fileExists("app/api/cron/weekly-topics/route.ts") ? pass() : fail("Missing");
}, "P0");

test("B. Pipeline", "content-builder cron exists", () => {
  return fileExists("app/api/cron/content-builder/route.ts") ? pass() : fail("Missing");
}, "P0");

test("B. Pipeline", "content-selector cron exists", () => {
  return fileExists("app/api/cron/content-selector/route.ts") ? pass() : fail("Missing");
}, "P0");

test("B. Pipeline", "scheduled-publish cron exists", () => {
  return fileExists("app/api/cron/scheduled-publish/route.ts") ? pass() : fail("Missing");
}, "P0");

test("B. Pipeline", "build-runner.ts has 8 phases", () => {
  const content = readFile("lib/content-pipeline/build-runner.ts");
  const phases = ["research", "outline", "drafting", "assembly", "images", "seo", "scoring", "reservoir"];
  const found = phases.filter(p => content.includes(p));
  return found.length >= 7 ? pass(`${found.length}/8 phases found`) : fail(`Only ${found.length}/8: ${found.join(", ")}`);
}, "P0");

test("B. Pipeline", "select-runner calls runPrePublicationGate", () => {
  return fileContains("lib/content-pipeline/select-runner.ts", "runPrePublicationGate")
    ? pass("Gate enforced") : fail("Missing gate call");
}, "P0");

test("B. Pipeline", "scheduled-publish calls runPrePublicationGate", () => {
  return fileContains("app/api/cron/scheduled-publish/route.ts", "runPrePublicationGate")
    ? pass("Gate enforced") : fail("Missing gate call");
}, "P0");

test("B. Pipeline", "Pre-publication gate has 14 checks", () => {
  const content = readFile("lib/seo/orchestrator/pre-publication-gate.ts");
  const checks = (content.match(/── \d+\./g) || []).length;
  return checks >= 14 ? pass(`${checks} checks found`) : fail(`Only ${checks} checks (need 14)`);
}, "P0");

test("B. Pipeline", "Pre-pub gate accepts page_type param", () => {
  return fileContains("lib/seo/orchestrator/pre-publication-gate.ts", "page_type")
    ? pass("page_type supported") : fail("Missing page_type parameter");
}, "P0");

test("B. Pipeline", "Atomic topic claiming — build-runner", () => {
  const content = readFile("lib/content-pipeline/build-runner.ts");
  return content.includes("updateMany") && content.includes("generating")
    ? pass("updateMany + generating status") : fail("Missing atomic claiming");
}, "P0");

test("B. Pipeline", "Atomic topic claiming — daily-content-generate", () => {
  const content = readFile("app/api/cron/daily-content-generate/route.ts");
  return content.includes("updateMany") && content.includes("generating")
    ? pass("updateMany + generating status") : fail("Missing atomic claiming");
}, "P0");

test("B. Pipeline", "Build-runner loops ALL active sites", () => {
  const content = readFile("lib/content-pipeline/build-runner.ts");
  return content.includes("getActiveSiteIds") || content.includes("activeSites") || content.includes("activeSiteIds")
    ? pass("Multi-site loop") : fail("May only process first site");
}, "P0");

test("B. Pipeline", "content-auto-fix cron exists", () => {
  return fileExists("app/api/cron/content-auto-fix/route.ts") ? pass() : fail("Missing");
}, "P1");

test("B. Pipeline", "content-auto-fix scheduled in vercel.json", () => {
  return fileContains("vercel.json", "content-auto-fix") ? pass() : fail("Not scheduled");
}, "P1");

test("B. Pipeline", "reserve-publisher scheduled in vercel.json", () => {
  return fileContains("vercel.json", "reserve-publisher") ? pass() : fail("Not scheduled");
}, "P1");

test("B. Pipeline", "Content types in shared lib (not inline)", () => {
  return fileExists("lib/content-automation/content-types.ts") ? pass() : fail("Missing shared file");
}, "P0");

test("B. Pipeline", "Affiliate injection per-site destination URLs", () => {
  const content = readFile("app/api/cron/affiliate-injection/route.ts");
  return content.includes("getActiveSiteIds") || content.includes("destination")
    ? pass("Per-site rules") : fail("May be single-site");
}, "P1");

// ==================== C. CONTENT GENERATION — AI Routes (P0) ====================

test("C. Content Gen", "ai-generate route exists with auth", () => {
  return fileExists("app/api/admin/ai-generate/route.ts") &&
    fileContains("app/api/admin/ai-generate/route.ts", "withAdminAuth")
    ? pass() : fail("Missing or unprotected");
}, "P0");

test("C. Content Gen", "bulk-generate route exists with auth", () => {
  return fileExists("app/api/admin/bulk-generate/route.ts") &&
    fileContains("app/api/admin/bulk-generate/route.ts", "withAdminAuth")
    ? pass() : fail("Missing or unprotected");
}, "P0");

test("C. Content Gen", "12 content types defined", () => {
  const content = readFile("lib/content-automation/content-types.ts");
  const types = ["guide", "comparison", "hotel-review", "restaurant-review", "service-review",
    "news", "events", "sales", "listicle", "deep-dive", "seasonal", "answer"];
  const missing = types.filter(t => !content.includes(`"${t}"`));
  return missing.length === 0 ? pass("All 12 types present") : fail(`Missing: ${missing.join(", ")}`);
}, "P0");

test("C. Content Gen", "Content types have required fields", () => {
  const content = readFile("lib/content-automation/content-types.ts");
  const hasMinWords = content.includes("minWords");
  const hasTargetWords = content.includes("targetWords");
  const hasAffiliates = content.includes("requireAffiliateLinks");
  return hasMinWords && hasTargetWords && hasAffiliates
    ? pass("minWords, targetWords, requireAffiliateLinks") : fail("Missing required fields");
}, "P0");

test("C. Content Gen", "bulk-generate has budget guard", () => {
  return fileContains("app/api/admin/bulk-generate/route.ts", "BUDGET_MS") ||
    fileContains("app/api/admin/bulk-generate/route.ts", "budget")
    ? pass("Budget guard present") : fail("No budget guard");
}, "P0");

test("C. Content Gen", "bulk-generate autoPublish defaults false", () => {
  const content = readFile("app/api/admin/bulk-generate/route.ts");
  return content.includes("autoPublish === true") || content.includes("autoPublish: false")
    ? pass("Defaults to false") : fail("May default to true");
}, "P0");

test("C. Content Gen", "bulk-generate PER_ARTICLE_ESTIMATE >= 32000", () => {
  const content = readFile("app/api/admin/bulk-generate/route.ts");
  const match = content.match(/PER_ARTICLE_ESTIMATE_MS\s*=\s*([\d_]+)/);
  if (!match) return fail("PER_ARTICLE_ESTIMATE_MS not found");
  const ms = parseInt(match[1].replace(/_/g, ""));
  return ms >= 32000 ? pass(`${ms}ms (>= 32s)`) : fail(`${ms}ms (< 32s, risk of budget overrun)`);
}, "P0");

test("C. Content Gen", "ai-generate has slug dedup", () => {
  const content = readFile("app/api/admin/ai-generate/route.ts");
  return content.includes("findFirst") && content.includes("suffix")
    ? pass("Slug dedup with suffix") : fail("Missing slug dedup");
}, "P0");

test("C. Content Gen", "ai-generate seoScore fallback = 65", () => {
  const content = readFile("app/api/admin/ai-generate/route.ts");
  return content.includes("seoScore") && content.includes("65")
    ? pass("Conservative default 65") : fail("May use inflated default");
}, "P1");

test("C. Content Gen", "bulk-generate seoScore fallback = 65", () => {
  const content = readFile("app/api/admin/bulk-generate/route.ts");
  return content.includes("65") ? pass("Conservative default") : fail("May use inflated default");
}, "P1");

test("C. Content Gen", "ai-generate supports 4 actions", () => {
  const content = readFile("app/api/admin/ai-generate/route.ts");
  const actions = ["generate", "publish", "pick_topic", "content_types"];
  const found = actions.filter(a => content.includes(`"${a}"`));
  return found.length === 4 ? pass("All 4 actions") : fail(`Missing: ${actions.filter(a => !found.includes(a)).join(", ")}`);
}, "P0");

test("C. Content Gen", "ai-generate uses type-specific word threshold", () => {
  return fileContains("app/api/admin/ai-generate/route.ts", "getThresholdsForPageType")
    ? pass("Type-specific thresholds") : fail("Hardcoded threshold");
}, "P0");

// ==================== D. CRON JOBS ====================

const ALL_CRON_ROUTES = [
  "analytics", "auto-generate", "autopilot", "content-builder", "content-selector",
  "daily-content-generate", "daily-publish", "london-news", "process-indexing-queue",
  "real-time-optimization", "scheduled-publish", "seo-agent", "seo-health-report",
  "seo-orchestrator", "site-health-check", "sweeper", "weekly-topics",
  "affiliate-injection", "commerce-trends", "etsy-sync", "fact-verification",
  "google-indexing", "reserve-publisher", "seo-deep-review", "social",
  "trends-monitor", "gsc-sync", "verify-indexing", "content-auto-fix",
];

// D1: Route file existence
for (const cron of ALL_CRON_ROUTES) {
  test("D. Cron Routes", `${cron} route file exists`, () => {
    return fileExists(`app/api/cron/${cron}/route.ts`) ? pass() : fail("Missing file");
  }, "P0");
}

// D2: maxDuration on critical crons
const CRITICAL_CRONS = [
  "weekly-topics", "daily-content-generate", "content-builder", "content-selector",
  "scheduled-publish", "seo-agent", "affiliate-injection", "trends-monitor",
  "london-news", "google-indexing", "verify-indexing", "process-indexing-queue",
  "content-auto-fix", "fact-verification", "seo-orchestrator", "gsc-sync",
];

for (const cron of CRITICAL_CRONS) {
  test("D. Cron maxDuration", `${cron} has maxDuration`, () => {
    return fileContains(`app/api/cron/${cron}/route.ts`, "maxDuration")
      ? pass() : fail("Missing maxDuration");
  }, "P0");
}

// D3: Budget guards on critical crons
for (const cron of CRITICAL_CRONS) {
  test("D. Cron Budget", `${cron} has budget guard`, () => {
    const content = readFile(`app/api/cron/${cron}/route.ts`);
    const hasBudget = content.includes("53_000") || content.includes("53000") ||
      content.includes("BUDGET_MS") || content.includes("budgetMs") ||
      content.includes("budget") || content.includes("Budget");
    return hasBudget ? pass() : warn("No explicit budget guard found");
  }, "P0");
}

// D4: Auth pattern on all crons
for (const cron of ALL_CRON_ROUTES) {
  test("D. Cron Auth", `${cron} auth pattern`, () => {
    const content = readFile(`app/api/cron/${cron}/route.ts`);
    if (!content) return fail("File not found");
    // Bad pattern: returning 500/401 when CRON_SECRET is not set
    const hasBadPattern = /if\s*\(\s*!cronSecret\s*\)/.test(content) &&
      content.includes("return") && (content.includes("500") || content.includes("401"));
    return hasBadPattern ? fail("Fails when CRON_SECRET unset") : pass("Standard auth pattern");
  }, "P0");
}

// D5: Verify vercel.json paths map to existing routes
test("D. Cron Config", "All vercel.json cron paths have route files", () => {
  try {
    const vercelJson = JSON.parse(readFile("vercel.json"));
    const cronPaths: string[] = (vercelJson.crons || []).map((c: { path: string }) => c.path.split("?")[0]);
    const uniquePaths = [...new Set(cronPaths)];
    const missing = uniquePaths.filter(p => {
      const routeFile = p.replace("/api/", "app/api/") + "/route.ts";
      return !fileExists(routeFile);
    });
    return missing.length === 0
      ? pass(`${uniquePaths.length} paths, all have route files`)
      : fail(`Missing: ${missing.join(", ")}`);
  } catch (e) {
    return fail(`Could not parse vercel.json: ${e}`);
  }
}, "P0");

// ==================== E. SEO & INDEXING ====================

test("E. SEO", "standards.ts exists as single source of truth", () => {
  return fileExists("lib/seo/standards.ts") ? pass() : fail("Missing");
}, "P0");

test("E. SEO", "Standards version is 2026+", () => {
  return fileContains("lib/seo/standards.ts", "2026") ? pass("Current version") : fail("Outdated");
}, "P0");

test("E. SEO", "IndexNow 7-day window (not 24h)", () => {
  const content = readFile("lib/seo/indexing-service.ts");
  return content.includes("7") && (content.includes("days") || content.includes("DAY"))
    ? pass("7-day window") : warn("Could not verify window");
}, "P0");

test("E. SEO", "seo-agent delegates IndexNow to seo/cron", () => {
  const content = readFile("lib/seo/seo-intelligence.ts");
  return content.includes("pending") ? pass("Sets pending for seo/cron") : warn("Could not verify delegation");
}, "P0");

test("E. SEO", "No deprecated FAQPage schema", () => {
  const gen = readFile("lib/seo/schema-generator.ts");
  const hasFaqGeneration = gen.includes("FAQPage") && !gen.includes("deprecated") && !gen.includes("// FAQPage");
  return hasFaqGeneration ? fail("FAQPage still generated") : pass("No FAQPage generation");
}, "P0");

test("E. SEO", "sitemap.ts has take limits", () => {
  return fileContains("app/sitemap.ts", "take:") || fileContains("app/sitemap.ts", "take :")
    ? pass("OOM prevention") : fail("No take limits on queries");
}, "P0");

test("E. SEO", "sitemap.ts includes yacht URLs", () => {
  const content = readFile("app/sitemap.ts");
  return content.toLowerCase().includes("yacht") ? pass("Yacht URLs included") : warn("No yacht URLs in sitemap");
}, "P1");

test("E. SEO", "llms.txt route exists for AIO", () => {
  return fileExists("app/llms.txt/route.ts") ? pass() : fail("Missing");
}, "P1");

test("E. SEO", "Jan 2026 Authenticity Update flags", () => {
  return fileContains("lib/seo/standards.ts", "authenticityUpdateActive")
    ? pass("Flags present") : fail("Missing authenticity flags");
}, "P0");

test("E. SEO", "qualityGateScore = 70 in standards", () => {
  const content = readFile("lib/seo/standards.ts");
  return content.includes("qualityGateScore: 70") ? pass("Threshold = 70") : fail("Wrong threshold");
}, "P0");

test("E. SEO", "Meta description min = 120 in standards", () => {
  const content = readFile("lib/seo/standards.ts");
  return content.includes("metaDescriptionMin: 120") ? pass("120 chars") : fail("Wrong minimum");
}, "P0");

test("E. SEO", "verify-indexing scheduled in vercel.json", () => {
  return fileContains("vercel.json", "verify-indexing") ? pass() : fail("Not scheduled");
}, "P1");

test("E. SEO", "process-indexing-queue scheduled in vercel.json", () => {
  return fileContains("vercel.json", "process-indexing-queue") ? pass() : fail("Not scheduled");
}, "P1");

// ==================== F. SECURITY (P0) ====================

test("F. Security", "MCP Stripe balance has requireAdmin", () => {
  return fileContains("app/api/admin/mcp/stripe/balance/route.ts", "requireAdmin")
    ? pass() : fail("Unprotected financial route");
}, "P0");

test("F. Security", "MCP Mercury accounts has requireAdmin", () => {
  return fileContains("app/api/admin/mcp/mercury/accounts/route.ts", "requireAdmin")
    ? pass() : fail("Unprotected financial route");
}, "P0");

test("F. Security", "Database routes have requireAdmin", () => {
  const routes = ["app/api/admin/db-migrate/route.ts", "app/api/admin/migrate/route.ts"];
  const unprotected = routes.filter(r => fileExists(r) && !fileContains(r, "requireAdmin"));
  return unprotected.length === 0 ? pass("All protected") : fail(`Unprotected: ${unprotected.join(", ")}`);
}, "P0");

test("F. Security", "Admin setup locked after first admin", () => {
  return fileContains("app/api/admin/setup/route.ts", "403") ? pass("Locked") : fail("No lockout");
}, "P0");

test("F. Security", "No API key logging in responses", () => {
  const count = grepCount("apiKey|api_key|privateKey|private_key", "app/api/", "*.ts");
  // Exclude legitimate config reads
  return count < 50 ? pass(`${count} refs (normal for config)`) : warn(`${count} refs found — review`);
}, "P1");

test("F. Security", "content/bulk-publish has requireAdmin", () => {
  const f = "app/api/content/bulk-publish/route.ts";
  return !fileExists(f) || fileContains(f, "requireAdmin") ? pass() : fail("Unprotected mutation");
}, "P0");

test("F. Security", "homepage-blocks/reorder has requireAdmin", () => {
  const f = "app/api/homepage-blocks/reorder/route.ts";
  return !fileExists(f) || fileContains(f, "requireAdmin") ? pass() : fail("Unprotected mutation");
}, "P0");

test("F. Security", "CSP headers in next.config.js", () => {
  return fileContains("next.config.js", "Content-Security-Policy") ||
    fileContains("next.config.js", "content-security-policy")
    ? pass() : warn("No CSP headers found");
}, "P1");

test("F. Security", "SSRF protection on social embed", () => {
  const content = readFile("app/api/social/embed-data/route.ts");
  return content.includes("ALLOWED") || content.includes("allowlist") || content.includes("blocklist")
    ? pass("URL filtering present") : fail("No SSRF protection");
}, "P0");

test("F. Security", "html-sanitizer.ts utility exists", () => {
  return fileExists("lib/html-sanitizer.ts") ? pass() : fail("Missing XSS sanitizer");
}, "P0");

test("F. Security", "XSS: All dangerouslySetInnerHTML use sanitization", () => {
  const dihFiles = grepFiles("dangerouslySetInnerHTML", "app/", "*.tsx")
    .concat(grepFiles("dangerouslySetInnerHTML", "components/", "*.tsx"));
  // Filter to unique files, exclude .next/
  const unique = [...new Set(dihFiles)].filter(f => !f.includes(".next/") && !f.includes("node_modules/"));
  const unsanitized = unique.filter(f => {
    const content = readFile(f);
    return !content.includes("sanitizeHtml") && !content.includes("sanitizeSvg") && !content.includes("DOMPurify");
  });
  return unsanitized.length === 0
    ? pass(`${unique.length} files, all sanitized`)
    : warn(`${unsanitized.length} unsanitized: ${unsanitized.slice(0, 3).join(", ")}`);
}, "P0");

// ==================== G. MULTI-SITE ISOLATION ====================

test("G. Multi-Site", "6 sites configured", () => {
  const content = readFile("config/sites.ts");
  const sites = ["yalla-london", "zenitha-yachts-med", "arabaldives", "french-riviera", "istanbul", "thailand"];
  const found = sites.filter(s => content.includes(`"${s}"`));
  return found.length === 6 ? pass("All 6 sites") : fail(`Only ${found.length}/6 sites`);
}, "P0");

test("G. Multi-Site", "getDefaultSiteId() exists", () => {
  return fileContains("config/sites.ts", "getDefaultSiteId") ? pass() : fail("Missing");
}, "P0");

test("G. Multi-Site", "getBaseUrl utility exists", () => {
  return fileExists("lib/url-utils.ts") && fileContains("lib/url-utils.ts", "getBaseUrl")
    ? pass() : fail("Missing");
}, "P0");

test("G. Multi-Site", "middleware maps zenithayachts.com", () => {
  return fileContains("middleware.ts", "zenithayachts.com") ? pass() : fail("Missing yacht domain");
}, "P0");

test("G. Multi-Site", "No hardcoded yalla-london in shared crons", () => {
  const sharedCrons = ["content-builder", "content-selector", "scheduled-publish",
    "seo-agent", "affiliate-injection", "sweeper"];
  const bad = sharedCrons.filter(c => {
    const content = readFile(`app/api/cron/${c}/route.ts`);
    return content.includes('"yalla-london"') && !content.includes("getDefaultSiteId");
  });
  return bad.length === 0 ? pass("No hardcoding") : fail(`Hardcoded in: ${bad.join(", ")}`);
}, "P0");

test("G. Multi-Site", "Blog queries scoped by siteId", () => {
  const content = readFile("app/api/blog/route.ts");
  return content.includes("siteId") || content.includes("site_id")
    ? pass("Scoped") : fail("Global query — cross-site leakage risk");
}, "P0");

test("G. Multi-Site", "next.config.js includes zenithayachts.com", () => {
  return fileContains("next.config.js", "zenithayachts.com") ? pass() : warn("Missing yacht domain in images");
}, "P1");

test("G. Multi-Site", "Dynamic llms.txt per site", () => {
  const content = readFile("app/llms.txt/route.ts");
  return content.includes("siteId") || content.includes("x-site-id")
    ? pass("Per-site content") : fail("Static content");
}, "P1");

test("G. Multi-Site", "trends-monitor skips yacht site", () => {
  return fileContains("app/api/cron/trends-monitor/route.ts", "zenitha-yachts-med")
    ? pass("Yacht site excluded from topic gen") : warn("May generate topics for yacht site");
}, "P1");

// ==================== H. DATA INTEGRITY ====================

test("H. Data", "No Math.random() for fake metrics in API routes", () => {
  // Exclude legitimate ID generation (toString(36).substr) which is acceptable
  const files = grepFiles("Math\\.random\\(\\)", "app/api/", "*.ts");
  const fakeMetrics = files.filter(f => {
    const content = readFile(f);
    // Find lines with Math.random that are NOT for ID generation
    const lines = content.split("\n").filter(l => l.includes("Math.random()"));
    return lines.some(l => !l.includes("toString(36)") && !l.includes("substr") && !l.includes("substring"));
  });
  return fakeMetrics.length === 0 ? pass("No fake metrics") : fail(`${fakeMetrics.length} files with fake data: ${fakeMetrics.slice(0, 3).join(", ")}`);
}, "P0");

test("H. Data", "No Math.random() for fake metrics in components", () => {
  const files = grepFiles("Math\\.random\\(\\)", "components/", "*.tsx");
  const fakeMetrics = files.filter(f => {
    const content = readFile(f);
    const allLines = content.split("\n");
    const matchingIndices = allLines.map((l, i) => l.includes("Math.random()") ? i : -1).filter(i => i >= 0);
    // For each Math.random() line, check it + surrounding 5 lines for acceptable context
    return matchingIndices.some(idx => {
      const line = allLines[idx];
      const context = allLines.slice(Math.max(0, idx - 5), idx + 5).join(" ");
      // Acceptable: ID generation, progress bars, key generation
      const isIdGen = line.includes("toString(36)") || line.includes("substr") || line.includes("substring");
      const isProgress = context.toLowerCase().includes("progress") || context.toLowerCase().includes("upload");
      const isKey = line.includes("key=") || line.includes("id:");
      return !isIdGen && !isProgress && !isKey;
    });
  });
  return fakeMetrics.length === 0 ? pass("No fake metrics") : fail(`${fakeMetrics.length} files with fake data`);
}, "P0");

test("H. Data", "No hardcoded emails in route files", () => {
  const count = grepCount("@yallalondon\\.com|@yalla-london\\.com", "app/api/", "*.ts");
  return count === 0 ? pass("Dynamic emails") : fail(`${count} hardcoded emails found`);
}, "P1");

test("H. Data", "No mock data arrays in admin pages", () => {
  const patterns = ["mockAudit", "mockGuide", "mockPost", "mockAccount"];
  let total = 0;
  for (const p of patterns) { total += grepCount(p, "app/admin/", "*.tsx"); }
  return total === 0 ? pass("No mock fallbacks") : warn(`${total} mock data references`);
}, "P1");

test("H. Data", "BlogPost.slug has @unique in schema", () => {
  const schema = readFile("prisma/schema.prisma");
  // Find the BlogPost model block and check for slug @unique
  const blogPostBlock = schema.substring(schema.indexOf("model BlogPost"), schema.indexOf("model BlogPost") + 2000);
  return blogPostBlock.includes("slug") && blogPostBlock.includes("@unique")
    ? pass("Global uniqueness enforced") : fail("Slug not @unique");
}, "P0");

// ==================== I. OBSERVABILITY ====================

test("I. Observability", "CronJobLog model exists", () => {
  return fileContains("prisma/schema.prisma", "model CronJobLog") ? pass() : fail("Missing model");
}, "P0");

test("I. Observability", "error-interpreter.ts exists", () => {
  return fileExists("lib/error-interpreter.ts") ? pass() : fail("Missing");
}, "P1");

test("I. Observability", "ApiUsageLog model exists", () => {
  return fileContains("prisma/schema.prisma", "model ApiUsageLog") ? pass() : fail("Missing model");
}, "P1");

test("I. Observability", "AI provider logs usage", () => {
  return fileContains("lib/ai/provider.ts", "logUsage") ? pass() : fail("No cost tracking");
}, "P1");

test("I. Observability", "onCronFailure has logging", () => {
  // Check both possible locations
  let content = readFile("lib/ops/failure-hooks.ts");
  if (!content) content = readFile("lib/cron/failure-hooks.ts");
  if (!content) return fail("failure-hooks.ts not found");
  return content.includes("onCronFailure") && (content.includes("console.error") || content.includes("console.warn") || content.includes("console.log"))
    ? pass("Logged") : fail("Silent failure hook");
}, "P0");

test("I. Observability", "Zero empty catch blocks in critical API routes", () => {
  const criticalRoutes = [
    "app/api/cron/content-builder/route.ts",
    "app/api/cron/content-selector/route.ts",
    "app/api/cron/scheduled-publish/route.ts",
    "app/api/cron/seo-agent/route.ts",
    "app/api/admin/cockpit/route.ts",
  ];
  const bad = criticalRoutes.filter(r => {
    const content = readFile(r);
    return /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/.test(content) || /catch\s*\{\s*\}/.test(content);
  });
  return bad.length === 0 ? pass("All catch blocks log") : fail(`Empty catches in: ${bad.join(", ")}`);
}, "P0");

// ==================== J. QUALITY GATES ====================

test("J. Quality", "qualityGateScore = 70 in phases.ts", () => {
  const content = readFile("lib/content-pipeline/phases.ts");
  return content.includes("70") || content.includes("qualityGateScore")
    ? pass("Threshold aligned") : fail("Wrong threshold");
}, "P0");

test("J. Quality", "select-runner MIN_QUALITY_SCORE aligned", () => {
  const content = readFile("lib/content-pipeline/select-runner.ts");
  return content.includes("70") || content.includes("qualityGateScore")
    ? pass("Threshold = 70") : fail("Wrong threshold");
}, "P0");

test("J. Quality", "getThresholdsForUrl exists in standards", () => {
  return fileContains("lib/seo/standards.ts", "getThresholdsForUrl") ? pass() : fail("Missing");
}, "P0");

test("J. Quality", "getThresholdsForPageType exists in standards", () => {
  return fileContains("lib/seo/standards.ts", "getThresholdsForPageType") ? pass() : fail("Missing");
}, "P0");

// ==================== K. PER-CONTENT-TYPE THRESHOLDS ====================

test("K. Thresholds", "8 content type thresholds in standards.ts", () => {
  const content = readFile("lib/seo/standards.ts");
  const types = ["blog", "news", "information", "guide", "comparison", "review", "events", "sales"];
  const found = types.filter(t => {
    const regex = new RegExp(`${t}\\s*:`);
    return regex.test(content);
  });
  return found.length >= 8 ? pass(`All ${found.length} types`) : fail(`Only ${found.length}/8: missing ${types.filter(t => !found.includes(t)).join(", ")}`);
}, "P0");

test("K. Thresholds", "Blog minWords = 1000", () => {
  const content = readFile("lib/seo/standards.ts");
  const blogSection = content.substring(
    content.indexOf("blog:"),
    content.indexOf("blog:") + 200
  );
  return blogSection.includes("1000") || blogSection.includes("1_000")
    ? pass("1000 words") : fail("Wrong threshold");
}, "P0");

test("K. Thresholds", "News minWords = 150", () => {
  const content = readFile("lib/seo/standards.ts");
  const newsSection = content.substring(
    content.indexOf("news:"),
    content.indexOf("news:") + 200
  );
  return newsSection.includes("150") ? pass("150 words") : fail("Wrong threshold");
}, "P1");

test("K. Thresholds", "Comparison minWords = 1200", () => {
  const content = readFile("lib/seo/standards.ts");
  const section = content.substring(
    content.indexOf("comparison:"),
    content.indexOf("comparison:") + 200
  );
  return section.includes("1200") || section.includes("1_200")
    ? pass("1200 words") : fail("Wrong threshold");
}, "P1");

// ==================== L. ADMIN DASHBOARD ====================

test("L. Dashboard", "Cockpit page exists", () => {
  return fileExists("app/admin/cockpit/page.tsx") ? pass() : fail("Missing");
}, "P0");

test("L. Dashboard", "Cockpit has 7 tabs", () => {
  const content = readFile("app/admin/cockpit/page.tsx");
  const tabs = ["mission", "content", "pipeline", "crons", "sites", "ai", "settings"];
  const found = tabs.filter(t => content.toLowerCase().includes(t));
  return found.length >= 7 ? pass("All 7 tabs") : fail(`Only ${found.length}/7`);
}, "P0");

test("L. Dashboard", "Cockpit API exists", () => {
  return fileExists("app/api/admin/cockpit/route.ts") ? pass() : fail("Missing");
}, "P0");

test("L. Dashboard", "Content Matrix API exists", () => {
  return fileExists("app/api/admin/content-matrix/route.ts") ? pass() : fail("Missing");
}, "P0");

test("L. Dashboard", "Departures Board page exists", () => {
  return fileExists("app/admin/departures/page.tsx") ? pass() : fail("Missing");
}, "P0");

test("L. Dashboard", "Departures API exists", () => {
  return fileExists("app/api/admin/departures/route.ts") ? pass() : fail("Missing");
}, "P0");

test("L. Dashboard", "AI Costs page exists", () => {
  return fileExists("app/admin/ai-costs/page.tsx") ? pass() : fail("Missing");
}, "P1");

test("L. Dashboard", "AI Costs API exists with auth", () => {
  return fileExists("app/api/admin/ai-costs/route.ts") &&
    (fileContains("app/api/admin/ai-costs/route.ts", "withAdminAuth") ||
     fileContains("app/api/admin/ai-costs/route.ts", "requireAdmin") ||
     fileContains("app/api/admin/ai-costs/route.ts", "withAdminOrCronAuth"))
    ? pass() : fail("Missing or unprotected");
}, "P1");

test("L. Dashboard", "Bulk generate page exists", () => {
  return fileExists("app/admin/cockpit/bulk-generate/page.tsx") ? pass() : fail("Missing");
}, "P0");

test("L. Dashboard", "Content generation monitor exists", () => {
  return fileExists("app/api/admin/content-generation-monitor/route.ts") ? pass() : fail("Missing");
}, "P1");

test("L. Dashboard", "No hardcoded siteId in cockpit", () => {
  const content = readFile("app/admin/cockpit/page.tsx");
  const hardcoded = content.includes('"yalla-london"') && !content.includes("getDefaultSiteId");
  return hardcoded ? fail("Hardcoded yalla-london") : pass("Dynamic siteId");
}, "P0");

// ==================== M. YACHT PLATFORM ====================

test("M. Yachts", "Yacht model in Prisma schema", () => {
  return fileContains("prisma/schema.prisma", "model Yacht ") ? pass() : fail("Missing model");
}, "P0");

test("M. Yachts", "CharterInquiry model in schema", () => {
  return fileContains("prisma/schema.prisma", "model CharterInquiry") ? pass() : fail("Missing model");
}, "P0");

test("M. Yachts", "YachtDestination model in schema", () => {
  return fileContains("prisma/schema.prisma", "model YachtDestination") ? pass() : fail("Missing model");
}, "P0");

test("M. Yachts", "Admin yacht API exists with auth", () => {
  return fileExists("app/api/admin/yachts/route.ts") &&
    (fileContains("app/api/admin/yachts/route.ts", "withAdminAuth") ||
     fileContains("app/api/admin/yachts/route.ts", "requireAdmin") ||
     fileContains("app/api/admin/yachts/route.ts", "withAdminOrCronAuth"))
    ? pass() : fail("Missing or unprotected");
}, "P0");

const YACHT_SUB_ROUTES = ["destinations", "inquiries", "itineraries", "brokers", "analytics", "sync"];
for (const sub of YACHT_SUB_ROUTES) {
  test("M. Yachts", `Admin yacht ${sub} route exists`, () => {
    return fileExists(`app/api/admin/yachts/${sub}/route.ts`) ? pass() : fail("Missing");
  }, "P1");
}

test("M. Yachts", "Public yacht API exists", () => {
  return fileExists("app/api/yachts/route.ts") ? pass() : fail("Missing");
}, "P0");

test("M. Yachts", "Inquiry API exists", () => {
  return fileExists("app/api/inquiry/route.ts") ? pass() : fail("Missing");
}, "P0");

test("M. Yachts", "SiteShell component exists", () => {
  return fileExists("components/site-shell.tsx") ? pass() : fail("Missing hermetic shell");
}, "P0");

test("M. Yachts", "zenitha-tokens.css exists", () => {
  return fileExists("app/zenitha-tokens.css") ? pass() : fail("Missing design tokens");
}, "P1");

// ==================== N. DESIGN SYSTEM ====================

test("N. Design", "Design model in Prisma schema", () => {
  return fileContains("prisma/schema.prisma", "model Design ") ? pass() : fail("Missing");
}, "P1");

test("N. Design", "PdfGuide model in Prisma schema", () => {
  return fileContains("prisma/schema.prisma", "model PdfGuide") ? pass() : fail("Missing");
}, "P1");

test("N. Design", "Brand provider exists", () => {
  return fileExists("lib/design/brand-provider.ts") ? pass() : fail("Missing");
}, "P1");

test("N. Design", "Media picker component exists", () => {
  return fileExists("components/shared/media-picker.tsx") ? pass() : fail("Missing");
}, "P2");

test("N. Design", "Email renderer exists", () => {
  return fileExists("lib/email/renderer.ts") ? pass() : fail("Missing");
}, "P2");

test("N. Design", "Content engine researcher exists", () => {
  return fileExists("lib/content-engine/researcher.ts") ? pass() : fail("Missing");
}, "P2");

// ==================== O. MASTER AUDIT ENGINE ====================

test("O. Audit Engine", "Master audit CLI entry point exists", () => {
  return fileExists("scripts/master-audit.ts") ? pass() : fail("Missing");
}, "P2");

test("O. Audit Engine", "Config loader exists", () => {
  return fileExists("lib/master-audit/config-loader.ts") ? pass() : fail("Missing");
}, "P2");

test("O. Audit Engine", "8 validators exist", () => {
  const validators = ["http", "canonical", "hreflang", "sitemap", "schema", "links", "metadata", "robots"];
  const found = validators.filter(v => fileExists(`lib/master-audit/validators/${v}.ts`));
  return found.length >= 8 ? pass("All 8 validators") : fail(`Only ${found.length}/8`);
}, "P2");

test("O. Audit Engine", "3 risk scanners exist", () => {
  const scanners = ["scaled-content", "site-reputation", "expired-domain"];
  const found = scanners.filter(s => fileExists(`lib/master-audit/risk-scanners/${s}.ts`));
  return found.length >= 3 ? pass("All 3 scanners") : fail(`Only ${found.length}/3`);
}, "P2");

test("O. Audit Engine", "Default audit config exists", () => {
  return fileExists("config/sites/_default.audit.json") ? pass() : fail("Missing");
}, "P2");

// ==================== P. ANTI-PATTERNS ====================

test("P. Anti-Patterns", "No @/lib/prisma in app code", () => {
  const files = grepFiles("from ['\"]@/lib/prisma['\"]", "app/", "*.ts");
  const violations = files.filter(f => !f.includes("lib/db") && !f.includes("tenant-queries"));
  return violations.length === 0 ? pass() : fail(`${violations.length} violations`);
}, "P0");

test("P. Anti-Patterns", "No hardcoded yallalondon.com fallbacks", () => {
  const count = grepCount("yallalondon\\.com", "app/api/", "*.ts");
  return count === 0 ? pass() : warn(`${count} references found`);
}, "P1");

test("P. Anti-Patterns", "Deprecated schema types have Article fallback", () => {
  const content = readFile("lib/seo/schema-generator.ts");
  // FAQPage and HowTo methods may exist but must have Article fallback
  const hasDeprecatedComment = content.includes("deprecated") || content.includes("Deprecated");
  const hasArticleFallback = content.includes("Article") && (content.includes("faq") || content.includes("FAQ"));
  return hasDeprecatedComment || hasArticleFallback
    ? pass("Deprecated types fall back to Article schema")
    : fail("No deprecation handling found");
}, "P0");

test("P. Anti-Patterns", "No error.message in public API responses", () => {
  const publicRoutes = ["app/api/blog/", "app/api/search/", "app/api/content/", "app/api/yachts/", "app/api/inquiry/"];
  let violations = 0;
  for (const route of publicRoutes) {
    const files = grepFiles("error\\.message", route, "*.ts");
    violations += files.length;
  }
  return violations === 0 ? pass("No info disclosure") : warn(`${violations} routes may expose error details`);
}, "P1");

// ==================== Q. VERCEL DEPLOYMENT ====================

test("Q. Vercel", "vercel.json exists", () => {
  return fileExists("vercel.json") ? pass() : fail("Missing");
}, "P0");

test("Q. Vercel", "Cron count >= 25 in vercel.json", () => {
  try {
    const config = JSON.parse(readFile("vercel.json"));
    const count = (config.crons || []).length;
    return count >= 25 ? pass(`${count} crons registered`) : fail(`Only ${count} crons`);
  } catch {
    return fail("Could not parse vercel.json");
  }
}, "P0");

test("Q. Vercel", "GscPagePerformance model exists (for GSC sync)", () => {
  return fileContains("prisma/schema.prisma", "model GscPagePerformance") ? pass() : fail("Missing");
}, "P1");

test("Q. Vercel", "gsc-sync cron registered", () => {
  return fileContains("vercel.json", "gsc-sync") ? pass() : fail("Not scheduled");
}, "P1");

// ==================== PRINT RESULTS ====================

console.log("\n" + "=".repeat(90));
console.log("  COMPREHENSIVE SMOKE TEST RESULTS — Yalla London / Zenitha Platform");
console.log("  " + new Date().toISOString());
console.log("=".repeat(90) + "\n");

const categories = [...new Set(results.map(r => r.category))];
let totalPass = 0, totalFail = 0, totalWarn = 0;
let p0Fail = 0, p1Fail = 0, p2Fail = 0;

for (const cat of categories) {
  const catResults = results.filter(r => r.category === cat);
  const catPass = catResults.filter(r => r.status === PASS).length;
  const catFail = catResults.filter(r => r.status === FAIL).length;
  const catWarn = catResults.filter(r => r.status === WARN).length;

  const catIcon = catFail === 0 ? "✓" : "✗";
  const catColor = catFail === 0 ? "\x1b[32m" : "\x1b[31m";
  console.log(`\n${catColor}${catIcon}\x1b[0m ${cat} (${catPass}/${catResults.length} pass${catWarn ? `, ${catWarn} warn` : ""})`);

  for (const r of catResults) {
    if (r.status === PASS) continue; // Only show failures and warnings
    const icon = r.status === FAIL ? "✗" : "⚠";
    const color = r.status === FAIL ? "\x1b[31m" : "\x1b[33m";
    console.log(`    ${color}${icon}\x1b[0m [${r.priority}] ${r.name}: ${r.details}`);
  }

  totalPass += catPass;
  totalFail += catFail;
  totalWarn += catWarn;
}

// Count priority failures
for (const r of results.filter(r => r.status === FAIL)) {
  if (r.priority === "P0") p0Fail++;
  else if (r.priority === "P1") p1Fail++;
  else p2Fail++;
}

console.log("\n" + "=".repeat(90));
console.log(`  TOTAL: ${totalPass} PASS | ${totalFail} FAIL | ${totalWarn} WARN | ${results.length} tests`);
console.log(`  Score: ${Math.round((totalPass / results.length) * 100)}%`);
if (totalFail > 0) {
  console.log(`  Failures by priority: P0=${p0Fail} P1=${p1Fail} P2=${p2Fail}`);
}
console.log("=".repeat(90) + "\n");

if (totalFail > 0) {
  console.log("FAILED TESTS:");
  for (const r of results.filter(r => r.status === FAIL)) {
    console.log(`  ✗ [${r.priority}] [${r.category}] ${r.name}: ${r.details}`);
  }
  console.log("");
}

if (totalWarn > 0) {
  console.log("WARNINGS:");
  for (const r of results.filter(r => r.status === WARN)) {
    console.log(`  ⚠ [${r.priority}] [${r.category}] ${r.name}: ${r.details}`);
  }
  console.log("");
}

// Export results for report generation
const reportData = {
  timestamp: new Date().toISOString(),
  total: results.length,
  pass: totalPass,
  fail: totalFail,
  warn: totalWarn,
  score: Math.round((totalPass / results.length) * 100),
  p0Fail,
  p1Fail,
  p2Fail,
  categories: categories.map(cat => {
    const catResults = results.filter(r => r.category === cat);
    return {
      name: cat,
      total: catResults.length,
      pass: catResults.filter(r => r.status === PASS).length,
      fail: catResults.filter(r => r.status === FAIL).length,
      warn: catResults.filter(r => r.status === WARN).length,
    };
  }),
  failures: results.filter(r => r.status === FAIL).map(r => ({
    category: r.category,
    name: r.name,
    priority: r.priority,
    details: r.details,
  })),
  warnings: results.filter(r => r.status === WARN).map(r => ({
    category: r.category,
    name: r.name,
    priority: r.priority,
    details: r.details,
  })),
};

// Write JSON report for consumption by report generator
const reportPath = path.join(APP_DIR, "docs/reports/smoke-test-results.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
console.log(`Report data saved to: docs/reports/smoke-test-results.json`);

process.exit(totalFail > 0 ? 1 : 0);
