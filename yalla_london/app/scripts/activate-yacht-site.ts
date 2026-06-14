#!/usr/bin/env npx tsx
/**
 * Zenitha Yachts — Activation Checklist Script
 *
 * Runs a comprehensive readiness check and outputs a plain-English report.
 * Does NOT activate anything — just verifies everything is ready.
 *
 * Run: npx tsx scripts/activate-yacht-site.ts
 * (from the yalla_london/app/ directory)
 */

import * as fs from "fs";
import * as path from "path";

const SITE_ID = "zenitha-yachts-med";
const DOMAIN = "zenithayachts.com";
const APP_DIR = path.resolve(__dirname, "..");

// ─── Result tracking ────────────────────────────────────────────────

type Severity = "pass" | "fail" | "warn";

interface CheckResult {
  category: string;
  label: string;
  severity: Severity;
  detail: string;
}

const results: CheckResult[] = [];

function record(category: string, label: string, severity: Severity, detail: string) {
  results.push({ category, label, severity, detail });
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(APP_DIR, relativePath));
}

function fileContains(relativePath: string, needle: string): boolean {
  const fullPath = path.join(APP_DIR, relativePath);
  if (!fs.existsSync(fullPath)) return false;
  const content = fs.readFileSync(fullPath, "utf-8");
  return content.includes(needle);
}

function fileContainsRegex(relativePath: string, pattern: RegExp): boolean {
  const fullPath = path.join(APP_DIR, relativePath);
  if (!fs.existsSync(fullPath)) return false;
  const content = fs.readFileSync(fullPath, "utf-8");
  return pattern.test(content);
}

// ─── 1. Site Configuration ──────────────────────────────────────────

function checkSiteConfig() {
  const cat = "1. SITE CONFIGURATION";
  const sitesPath = "config/sites.ts";

  if (!fileExists(sitesPath)) {
    record(cat, "config/sites.ts exists", "fail", "File not found");
    return;
  }

  const content = fs.readFileSync(path.join(APP_DIR, sitesPath), "utf-8");

  // Check site ID exists
  if (content.includes(`"${SITE_ID}"`)) {
    record(cat, `${SITE_ID} found in sites.ts`, "pass", "Site config present");
  } else {
    record(cat, `${SITE_ID} found in sites.ts`, "fail", "Site ID not found in SITES object");
  }

  // Check domain
  if (content.includes(`"${DOMAIN}"`)) {
    record(cat, `Domain: ${DOMAIN}`, "pass", "Correct domain configured");
  } else {
    record(cat, `Domain: ${DOMAIN}`, "fail", `Domain "${DOMAIN}" not found in site config`);
  }

  // Check status
  const statusMatch = content.match(
    new RegExp(`"${SITE_ID}"[^}]*?status:\\s*"(\\w+)"`, "s")
  );
  if (statusMatch) {
    const status = statusMatch[1];
    if (status === "active") {
      record(cat, `Status: ${status}`, "pass", "Site is active");
    } else {
      record(cat, `Status: ${status}`, "warn", `Change to "active" to activate`);
    }
  } else {
    record(cat, "Status detection", "warn", "Could not detect site status from config");
  }
}

// ─── 2. Database Models ─────────────────────────────────────────────

async function checkDatabase() {
  const cat = "2. DATABASE";

  let prisma: any;
  try {
    const dbModule = await import("@/lib/db");
    prisma = dbModule.prisma;
  } catch (err) {
    record(cat, "Prisma connection", "fail", `Cannot import @/lib/db: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  const tables: Array<{
    label: string;
    accessor: string;
    min: number;
  }> = [
    { label: "Yachts", accessor: "yacht", min: 8 },
    { label: "Destinations", accessor: "yachtDestination", min: 4 },
    { label: "Itineraries", accessor: "charterItinerary", min: 3 },
    { label: "Broker Partners", accessor: "brokerPartner", min: 0 },
    { label: "Charter Inquiries", accessor: "charterInquiry", min: 0 },
  ];

  for (const table of tables) {
    try {
      const model = (prisma as any)[table.accessor];
      if (!model) {
        record(cat, table.label, "fail", `prisma.${table.accessor} model not found — migration may be pending`);
        continue;
      }
      const count: number = await model.count({
        where: { siteId: SITE_ID },
      });
      if (table.min > 0 && count < table.min) {
        record(cat, `${table.label}: ${count}`, "fail", `Minimum: ${table.min} — need ${table.min - count} more`);
      } else if (table.min > 0) {
        record(cat, `${table.label}: ${count}`, "pass", `Min: ${table.min} — OK`);
      } else {
        record(cat, `${table.label}: ${count}`, "pass", count > 0 ? "Has data" : "Empty (acceptable)");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("does not exist") || msg.includes("relation") || msg.includes("table")) {
        record(cat, table.label, "fail", `Table does not exist — run prisma migrate deploy`);
      } else {
        record(cat, table.label, "fail", `Query failed: ${msg.slice(0, 120)}`);
      }
    }
  }
}

// ─── 3. API Routes ──────────────────────────────────────────────────

function checkApiRoutes() {
  const cat = "3. API ROUTES";
  const routes = [
    "app/api/yachts/route.ts",
    "app/api/yachts/[id]/route.ts",
    "app/api/yachts/destinations/route.ts",
    "app/api/yachts/itineraries/route.ts",
    "app/api/yachts/recommend/route.ts",
    "app/api/yachts/compare/route.ts",
    "app/api/inquiry/route.ts",
    "app/api/admin/yachts/route.ts",
    "app/api/admin/yachts/inquiries/route.ts",
    "app/api/admin/yachts/destinations/route.ts",
    "app/api/admin/yachts/itineraries/route.ts",
    "app/api/admin/yachts/brokers/route.ts",
    "app/api/admin/yachts/analytics/route.ts",
    "app/api/admin/yachts/sync/route.ts",
  ];

  for (const route of routes) {
    if (fileExists(route)) {
      record(cat, route.replace("app/api/", "/api/"), "pass", "File exists");
    } else {
      record(cat, route.replace("app/api/", "/api/"), "fail", "Missing");
    }
  }
}

// ─── 4. Frontend Pages ──────────────────────────────────────────────

function checkFrontendPages() {
  const cat = "4. FRONTEND PAGES";
  const pages = [
    "app/yachts/page.tsx",
    "app/yachts/[slug]/page.tsx",
    "app/destinations/page.tsx",
    "app/destinations/[slug]/page.tsx",
    "app/itineraries/page.tsx",
    "app/itineraries/[slug]/page.tsx",
    "app/charter-planner/page.tsx",
    "app/inquiry/page.tsx",
    "app/faq/page.tsx",
    "app/how-it-works/page.tsx",
    "app/admin/yachts/page.tsx",
    "app/admin/yachts/new/page.tsx",
    "app/admin/yachts/inquiries/page.tsx",
    "app/admin/yachts/destinations/page.tsx",
    "app/admin/yachts/itineraries/page.tsx",
    "app/admin/yachts/brokers/page.tsx",
    "app/admin/yachts/analytics/page.tsx",
    "app/admin/yachts/sync/page.tsx",
  ];

  for (const page of pages) {
    if (fileExists(page)) {
      record(cat, page.replace("app/", ""), "pass", "File exists");
    } else {
      record(cat, page.replace("app/", ""), "fail", "Missing");
    }
  }
}

// ─── 5. Components ──────────────────────────────────────────────────

function checkComponents() {
  const cat = "5. COMPONENTS";
  const components = [
    "components/zenitha/zenitha-header.tsx",
    "components/zenitha/zenitha-footer.tsx",
    "components/zenitha/zenitha-homepage.tsx",
    "components/site-shell.tsx",
    "app/zenitha-tokens.css",
  ];

  for (const comp of components) {
    if (fileExists(comp)) {
      record(cat, comp, "pass", "File exists");
    } else {
      record(cat, comp, "fail", "Missing");
    }
  }
}

// ─── 6. Middleware & Routing ────────────────────────────────────────

function checkMiddlewareRouting() {
  const cat = "6. MIDDLEWARE & ROUTING";

  // Middleware contains domain
  if (fileContains("middleware.ts", DOMAIN)) {
    record(cat, `middleware.ts contains ${DOMAIN}`, "pass", "Domain routing configured");
  } else {
    record(cat, `middleware.ts contains ${DOMAIN}`, "fail", "Domain not found in middleware — routing will not work");
  }

  // Sitemap includes yacht URLs
  if (fileContainsRegex("app/sitemap.ts", /[Yy]acht/)) {
    record(cat, "sitemap.ts includes yacht URLs", "pass", "Yacht pages in sitemap");
  } else {
    record(cat, "sitemap.ts includes yacht URLs", "fail", "No yacht references in sitemap");
  }

  // llms.txt includes zenitha
  if (fileContainsRegex("app/llms.txt/route.ts", /zenitha/i)) {
    record(cat, "llms.txt includes Zenitha content", "pass", "AI search content present");
  } else {
    record(cat, "llms.txt includes Zenitha content", "warn", "Zenitha not mentioned in llms.txt");
  }

  // robots.ts exists
  if (fileExists("app/robots.ts")) {
    record(cat, "robots.ts exists", "pass", "Robots configuration present");
  } else {
    record(cat, "robots.ts exists", "fail", "Missing robots.ts");
  }
}

// ─── 7. Cron Isolation ──────────────────────────────────────────────

function checkCronIsolation() {
  const cat = "7. CRON ISOLATION";

  const cronChecks: Array<{ file: string; needle: string; label: string }> = [
    {
      file: "app/api/cron/weekly-topics/route.ts",
      needle: "isYachtSite",
      label: "weekly-topics skips yacht site",
    },
    {
      file: "app/api/cron/daily-content-generate/route.ts",
      needle: "isYachtSite",
      label: "daily-content-generate skips yacht site",
    },
    {
      file: "app/api/cron/trends-monitor/route.ts",
      needle: "isYachtSite",
      label: "trends-monitor skips yacht site",
    },
    {
      file: "app/api/cron/content-builder-create/route.ts",
      needle: "isYachtSite",
      label: "content-builder-create skips yacht site",
    },
    {
      file: "app/api/cron/affiliate-injection/route.ts",
      needle: SITE_ID,
      label: "affiliate-injection handles yacht site",
    },
  ];

  for (const check of cronChecks) {
    if (!fileExists(check.file)) {
      record(cat, check.label, "warn", `File not found: ${check.file}`);
      continue;
    }
    if (fileContains(check.file, check.needle)) {
      record(cat, check.label, "pass", `Contains "${check.needle}"`);
    } else {
      record(cat, check.label, "fail", `Missing "${check.needle}" — content pipeline may run for yacht site`);
    }
  }
}

// ─── 8. Charter Index API ───────────────────────────────────────────

function checkCharterIndexApi() {
  const cat = "8. CHARTER INDEX API";

  if (fileExists("lib/apis/charter-index.ts")) {
    record(cat, "lib/apis/charter-index.ts exists", "pass", "Charter Index API client present");
  } else {
    record(cat, "lib/apis/charter-index.ts exists", "warn", "Missing — external yacht data feed not available (can seed manually)");
  }
}

// ─── Report Renderer ────────────────────────────────────────────────

function renderReport() {
  const icons: Record<Severity, string> = {
    pass: "\u2705",   // green check
    fail: "\u274C",   // red cross
    warn: "\u26A0\uFE0F",  // warning
  };

  const totalPass = results.filter((r) => r.severity === "pass").length;
  const totalFail = results.filter((r) => r.severity === "fail").length;
  const totalWarn = results.filter((r) => r.severity === "warn").length;
  const total = results.length;

  console.log("");
  console.log("=".repeat(55));
  console.log("  ZENITHA YACHTS -- ACTIVATION CHECKLIST");
  console.log("=".repeat(55));
  console.log("");

  // Group results by category
  let currentCategory = "";
  for (const r of results) {
    if (r.category !== currentCategory) {
      currentCategory = r.category;
      console.log(`${currentCategory}`);
    }
    console.log(`   ${icons[r.severity]} ${r.label}`);
    if (r.severity !== "pass" || r.detail !== "File exists") {
      console.log(`      ${r.detail}`);
    }
  }

  console.log("");
  console.log("=".repeat(55));
  console.log(`  SUMMARY: ${totalPass}/${total} checks passed`);
  if (totalFail > 0) {
    console.log(`  ${icons.fail} ${totalFail} FAILED (must fix before activation)`);
  }
  if (totalWarn > 0) {
    console.log(`  ${icons.warn} ${totalWarn} WARNINGS (review recommended)`);
  }
  console.log("=".repeat(55));

  // Final verdict
  console.log("");
  if (totalFail === 0) {
    // Find the status line number in sites.ts for helpful guidance
    const sitesContent = fs.readFileSync(path.join(APP_DIR, "config/sites.ts"), "utf-8");
    const lines = sitesContent.split("\n");
    let statusLine = -1;
    let inYachtBlock = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`"${SITE_ID}"`)) inYachtBlock = true;
      if (inYachtBlock && lines[i].includes("status:")) {
        statusLine = i + 1;
        break;
      }
    }

    console.log("\uD83D\uDE80 READY TO ACTIVATE");
    if (statusLine > 0) {
      console.log(`   Change config/sites.ts line ${statusLine}: status: "paused" --> status: "active"`);
    } else {
      console.log(`   Change config/sites.ts: set ${SITE_ID} status to "active"`);
    }
    console.log("   Then push to deploy.");
  } else {
    console.log(`\uD83D\uDED1 NOT READY -- ${totalFail} item${totalFail > 1 ? "s" : ""} need attention before activation`);
  }

  console.log("");
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  // Synchronous checks
  checkSiteConfig();

  // Database (async — Prisma connection)
  await checkDatabase();

  // File existence checks
  checkApiRoutes();
  checkFrontendPages();
  checkComponents();
  checkMiddlewareRouting();
  checkCronIsolation();
  checkCharterIndexApi();

  // Render
  renderReport();

  // Disconnect Prisma to allow clean exit
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.$disconnect();
  } catch {
    // Already disconnected or never connected
  }

  // Exit code: 0 if all critical pass, 1 if any fail
  const hasFail = results.some((r) => r.severity === "fail");
  process.exit(hasFail ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error running activation checklist:", err);
  process.exit(2);
});
