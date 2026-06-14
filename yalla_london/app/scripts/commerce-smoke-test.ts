#!/usr/bin/env npx tsx
/**
 * Commerce Engine Smoke Test Suite
 *
 * Static analysis smoke test — no DB, no server, reads source files only.
 * Validates: schema alignment, auth protection, import resolution,
 * Etsy API compliance, budget guards, cron auth, error handling,
 * multi-site scoping, fake data detection, cron registration.
 *
 * Run: npx tsx scripts/commerce-smoke-test.ts
 * Or:  npm run test:commerce
 *
 * Target: 60+ tests across 10 categories
 */

import * as fs from "fs";
import * as path from "path";

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE = path.resolve(__dirname, "..");
const PASS = "\x1b[32mPASS\x1b[0m";
const FAIL = "\x1b[31mFAIL\x1b[0m";

interface TestResult {
  category: string;
  name: string;
  pass: boolean;
  detail: string;
}

const results: TestResult[] = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readFile(relPath: string): string {
  const full = path.join(BASE, relPath);
  if (!fs.existsSync(full)) {
    throw new Error(`File not found: ${relPath}`);
  }
  return fs.readFileSync(full, "utf-8");
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(BASE, relPath));
}

function test(category: string, name: string, fn: () => { pass: boolean; detail: string }) {
  try {
    const result = fn();
    results.push({ category, name, pass: result.pass, detail: result.detail });
  } catch (err) {
    results.push({
      category,
      name,
      pass: false,
      detail: `Exception: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}

/**
 * Extract field names from Prisma schema for a given model.
 * Returns an array of field names (without types, decorators, etc.)
 */
function extractPrismaModelFields(modelName: string): string[] {
  const schema = readFile("prisma/schema.prisma");
  const modelRegex = new RegExp(`model\\s+${modelName}\\s*\\{([\\s\\S]*?)\\n\\}`, "m");
  const match = schema.match(modelRegex);
  if (!match) return [];

  const body = match[1];
  const fields: string[] = [];
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    // Skip empty lines, comments, and index/map directives
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("@@") || trimmed.startsWith("/")) continue;
    // Field lines start with an identifier followed by a type
    const fieldMatch = trimmed.match(/^(\w+)\s+/);
    if (fieldMatch) {
      fields.push(fieldMatch[1]);
    }
  }
  return fields;
}

// ─── Commerce File Inventory ─────────────────────────────────────────────────

const LIB_COMMERCE_FILES = [
  "lib/commerce/types.ts",
  "lib/commerce/constants.ts",
  "lib/commerce/etsy-api.ts",
  "lib/commerce/etsy-csv-import.ts",
  "lib/commerce/trend-engine.ts",
  "lib/commerce/listing-generator.ts",
  "lib/commerce/asset-manager.ts",
  "lib/commerce/utm-engine.ts",
  "lib/commerce/campaign-generator.ts",
  "lib/commerce/alert-engine.ts",
  "lib/commerce/report-generator.ts",
  "lib/commerce/quick-create.ts",
];

const API_ADMIN_ROUTES = [
  "app/api/admin/commerce/trends/route.ts",
  "app/api/admin/commerce/briefs/route.ts",
  "app/api/admin/commerce/csv-import/route.ts",
  "app/api/admin/commerce/stats/route.ts",
  "app/api/admin/commerce/listings/route.ts",
  "app/api/admin/commerce/assets/route.ts",
  "app/api/admin/commerce/packs/route.ts",
  "app/api/admin/commerce/campaigns/route.ts",
  "app/api/admin/commerce/alerts/route.ts",
  "app/api/admin/commerce/reports/route.ts",
  "app/api/admin/commerce/etsy/route.ts",
  "app/api/admin/commerce/quick-create/route.ts",
];

const CRON_ROUTES = [
  "app/api/cron/etsy-sync/route.ts",
  "app/api/cron/commerce-trends/route.ts",
];

const COCKPIT_PAGES = [
  "app/admin/cockpit/commerce/page.tsx",
  "app/admin/cockpit/commerce/campaign/page.tsx",
  "app/admin/cockpit/commerce/listing/page.tsx",
];

const ALL_COMMERCE_FILES = [
  ...LIB_COMMERCE_FILES,
  ...API_ADMIN_ROUTES,
  ...CRON_ROUTES,
  ...COCKPIT_PAGES,
];

// =============================================================================
// CATEGORY 1: Schema Alignment (12 tests)
// =============================================================================

const SCHEMA_CATEGORY = "Schema Alignment";

// Test: TrendRun model fields used correctly
test(SCHEMA_CATEGORY, "TrendRun model fields match code usage", () => {
  const schemaFields = extractPrismaModelFields("TrendRun");
  const trendEngine = readFile("lib/commerce/trend-engine.ts");
  const trendsRoute = readFile("app/api/admin/commerce/trends/route.ts");

  const issues: string[] = [];

  // TrendRun uses camelCase in schema: siteId, runDate, nichesJson, trendsJson, etc.
  if (!schemaFields.includes("siteId")) issues.push("Schema missing siteId");
  if (!schemaFields.includes("nichesJson")) issues.push("Schema missing nichesJson");
  if (!schemaFields.includes("trendsJson")) issues.push("Schema missing trendsJson");
  if (!schemaFields.includes("opportunitiesJson")) issues.push("Schema missing opportunitiesJson");

  // Verify code references correct field names
  if (!trendEngine.includes("nichesJson")) issues.push("trend-engine missing nichesJson reference");
  if (!trendEngine.includes("trendsJson")) issues.push("trend-engine missing trendsJson reference");
  if (!trendsRoute.includes("nichesJson")) issues.push("trends route missing nichesJson reference");

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? `${schemaFields.length} fields verified` : issues.join("; "),
  };
});

// Test: ProductBrief model fields
test(SCHEMA_CATEGORY, "ProductBrief model fields match code usage", () => {
  const schemaFields = extractPrismaModelFields("ProductBrief");
  const issues: string[] = [];

  const expectedFields = [
    "siteId", "trendRunId", "title", "description", "productType", "tier",
    "ontologyCategory", "targetPrice", "currency", "keywordsJson",
    "competitorUrls", "designNotesJson", "listingCopyJson", "status",
    "approvedAt", "approvedBy", "rejectionNote", "digitalProductId",
  ];

  for (const field of expectedFields) {
    if (!schemaFields.includes(field)) {
      issues.push(`Schema missing field: ${field}`);
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? `${expectedFields.length} fields verified` : issues.join("; "),
  };
});

// Test: EtsyListingDraft model fields
test(SCHEMA_CATEGORY, "EtsyListingDraft model fields match code usage", () => {
  const schemaFields = extractPrismaModelFields("EtsyListingDraft");
  const issues: string[] = [];

  const expectedFields = [
    "siteId", "briefId", "title", "description", "tags", "price",
    "currency", "quantity", "section", "materials", "fileUrl",
    "previewImages", "etsyListingId", "etsyState", "etsyUrl",
    "status", "reviewNote", "approvedAt", "publishedAt", "lastSyncAt",
    "errorMessage",
  ];

  for (const field of expectedFields) {
    if (!schemaFields.includes(field)) {
      issues.push(`Schema missing field: ${field}`);
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? `${expectedFields.length} fields verified` : issues.join("; "),
  };
});

// Test: EtsyShopConfig model fields
test(SCHEMA_CATEGORY, "EtsyShopConfig model fields match code usage", () => {
  const schemaFields = extractPrismaModelFields("EtsyShopConfig");
  const issues: string[] = [];

  const expectedFields = [
    "siteId", "shopId", "shopName", "shopUrl",
    "accessTokenCredentialId", "refreshTokenCredentialId",
    "scopes", "tokenExpiresAt", "statsJson", "lastCsvImportAt",
    "connectionStatus", "lastTestedAt",
  ];

  for (const field of expectedFields) {
    if (!schemaFields.includes(field)) {
      issues.push(`Schema missing field: ${field}`);
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? `${expectedFields.length} fields verified` : issues.join("; "),
  };
});

// Test: CommerceAlert model fields
test(SCHEMA_CATEGORY, "CommerceAlert model fields match code usage", () => {
  const schemaFields = extractPrismaModelFields("CommerceAlert");
  const alertEngine = readFile("lib/commerce/alert-engine.ts");
  const issues: string[] = [];

  const expectedFields = ["siteId", "type", "severity", "title", "message",
    "productId", "briefId", "campaignId", "read", "readAt", "actionUrl"];

  for (const field of expectedFields) {
    if (!schemaFields.includes(field)) {
      issues.push(`Schema missing field: ${field}`);
    }
  }

  // Verify alert-engine uses correct field names
  for (const field of ["siteId", "type", "severity", "title", "message", "read", "readAt"]) {
    if (!alertEngine.includes(field)) {
      issues.push(`alert-engine missing reference to ${field}`);
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? `${expectedFields.length} fields verified` : issues.join("; "),
  };
});

// Test: CommerceCampaign model fields
test(SCHEMA_CATEGORY, "CommerceCampaign model fields match code usage", () => {
  const schemaFields = extractPrismaModelFields("CommerceCampaign");
  const issues: string[] = [];

  const expectedFields = [
    "siteId", "briefId", "name", "description", "startDate", "endDate",
    "utmSource", "utmMedium", "utmCampaign", "couponCode", "discountPercent",
    "tasksJson", "resultsJson", "status",
  ];

  for (const field of expectedFields) {
    if (!schemaFields.includes(field)) {
      issues.push(`Schema missing field: ${field}`);
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? `${expectedFields.length} fields verified` : issues.join("; "),
  };
});

// Test: ProductPack model fields
test(SCHEMA_CATEGORY, "ProductPack model fields match code usage", () => {
  const schemaFields = extractPrismaModelFields("ProductPack");
  const packsRoute = readFile("app/api/admin/commerce/packs/route.ts");
  const issues: string[] = [];

  const expectedFields = [
    "siteId", "name_en", "name_ar", "slug", "description_en",
    "description_ar", "price", "compare_price", "currency",
    "productIds", "cover_image", "is_active", "featured",
  ];

  for (const field of expectedFields) {
    if (!schemaFields.includes(field)) {
      issues.push(`Schema missing field: ${field}`);
    }
  }

  // Verify packs route uses correct field names
  if (!packsRoute.includes("name_en")) issues.push("packs route missing name_en");
  if (!packsRoute.includes("is_active")) issues.push("packs route missing is_active");

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? `${expectedFields.length} fields verified` : issues.join("; "),
  };
});

// Test: Purchase model uses snake_case fields (site_id, product_id, etc.)
test(SCHEMA_CATEGORY, "Purchase model — etsy-sync uses correct snake_case field names", () => {
  const schemaFields = extractPrismaModelFields("Purchase");
  const etsySync = readFile("app/api/cron/etsy-sync/route.ts");
  const issues: string[] = [];

  // Schema uses snake_case: site_id, product_id, customer_email, payment_provider, payment_id, created_at
  if (!schemaFields.includes("site_id")) issues.push("Schema missing site_id");
  if (!schemaFields.includes("product_id")) issues.push("Schema missing product_id");
  if (!schemaFields.includes("customer_email")) issues.push("Schema missing customer_email");
  if (!schemaFields.includes("payment_id")) issues.push("Schema missing payment_id");

  // etsy-sync should use snake_case in prisma.purchase.create()
  if (!etsySync.includes("site_id")) issues.push("etsy-sync missing site_id");
  if (!etsySync.includes("product_id")) issues.push("etsy-sync missing product_id");
  if (!etsySync.includes("customer_email")) issues.push("etsy-sync missing customer_email");
  if (!etsySync.includes("payment_id")) issues.push("etsy-sync missing payment_id");

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "Purchase fields correct in etsy-sync" : issues.join("; "),
  };
});

// Test: Purchase model — csv-import uses correct field names
test(SCHEMA_CATEGORY, "Purchase model — csv-import field name alignment", () => {
  const schemaFields = extractPrismaModelFields("Purchase");
  const csvImport = readFile("lib/commerce/etsy-csv-import.ts");
  const issues: string[] = [];

  // CSV import should use the schema field names for Purchase
  // Schema has: site_id, product_id, customer_email, status, channel, payment_id
  // Check for camelCase mismatches that would crash at runtime
  const camelCaseProblems = [
    { wrong: "siteId:", correct: "site_id" },
    { wrong: "digitalProductId:", correct: "product_id" },
  ];

  // The csv-import file's purchase.create — look at the data: block
  // It should match schema fields. Let's just verify core fields exist.
  if (csvImport.includes("prisma.purchase.create")) {
    // Find the data block for purchase.create
    const createBlock = csvImport.slice(
      csvImport.indexOf("prisma.purchase.create"),
      csvImport.indexOf("prisma.purchase.create") + 500,
    );

    // Check for known mismatches: csvImport uses siteId vs site_id
    for (const { wrong, correct } of camelCaseProblems) {
      if (createBlock.includes(wrong) && !schemaFields.includes(wrong.replace(":", ""))) {
        issues.push(`csv-import uses "${wrong}" but schema has "${correct}"`);
      }
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "csv-import purchase fields aligned" : issues.join("; "),
  };
});

// Test: DigitalProduct model — stats route uses correct field names
test(SCHEMA_CATEGORY, "DigitalProduct model — stats route field name check", () => {
  const schemaFields = extractPrismaModelFields("DigitalProduct");
  const statsRoute = readFile("app/api/admin/commerce/stats/route.ts");
  const issues: string[] = [];

  // Check if stats route references "name" on DigitalProduct (should be "name_en")
  if (statsRoute.includes("select: { id: true, name: true") && !schemaFields.includes("name")) {
    issues.push('stats route selects "name" but schema field is "name_en"');
  }

  // Check DigitalProduct queries specifically use site_id and is_active (not siteId / active)
  // Extract DigitalProduct.count sections — there should be "site_id:" near "digitalProduct.count"
  const dpCountMatches = [...statsRoute.matchAll(/digitalProduct\.count\(\{[\s\S]*?where:\s*\{([^}]+)\}/g)];
  for (const match of dpCountMatches) {
    const whereClause = match[1];
    if (whereClause.includes("siteId:") && schemaFields.includes("site_id")) {
      issues.push('stats route uses "siteId" for DigitalProduct.count but schema has "site_id"');
    }
    if (/\bactive:/.test(whereClause) && !whereClause.includes("is_active") && schemaFields.includes("is_active")) {
      issues.push('stats route uses "active" for DigitalProduct but schema has "is_active"');
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "DigitalProduct field names correct in stats" : `MISMATCHES FOUND: ${issues.join("; ")}`,
  };
});

// Test: Purchase model — stats route groupBy uses correct field
test(SCHEMA_CATEGORY, "Purchase model — stats route groupBy field check", () => {
  const schemaFields = extractPrismaModelFields("Purchase");
  const statsRoute = readFile("app/api/admin/commerce/stats/route.ts");
  const issues: string[] = [];

  // Stats route does groupBy: ["digitalProductId"] but schema field is "product_id"
  if (statsRoute.includes('by: ["digitalProductId"]') && !schemaFields.includes("digitalProductId")) {
    issues.push('stats route groupBy "digitalProductId" but schema field is "product_id"');
  }

  // Check Purchase-specific queries: purchase.aggregate and purchase.groupBy should use site_id
  const purchaseQueryMatches = [...statsRoute.matchAll(/purchase\.(aggregate|groupBy)\(\{[\s\S]*?where:\s*\{([^}]+)\}/g)];
  for (const match of purchaseQueryMatches) {
    const whereClause = match[2];
    if (whereClause.includes("siteId:") && schemaFields.includes("site_id") && !schemaFields.includes("siteId")) {
      issues.push(`stats route uses "siteId" in purchase.${match[1]} but schema has "site_id"`);
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "Purchase groupBy fields correct" : `MISMATCHES FOUND: ${issues.join("; ")}`,
  };
});

// Test: Purchase model — report-generator uses correct field names
test(SCHEMA_CATEGORY, "Purchase model — report-generator field name alignment", () => {
  const schemaFields = extractPrismaModelFields("Purchase");
  const reportGen = readFile("lib/commerce/report-generator.ts");
  const issues: string[] = [];

  // Check Purchase-specific queries: purchase.findMany should use site_id and created_at
  const purchaseQueryMatches = [...reportGen.matchAll(/purchase\.findMany\(\{[\s\S]*?where:\s*\{([^}]+)\}/g)];
  for (const match of purchaseQueryMatches) {
    const whereClause = match[1];
    if (whereClause.includes("siteId:") && schemaFields.includes("site_id") && !schemaFields.includes("siteId")) {
      issues.push('report-generator uses "siteId" in purchase.findMany but schema has "site_id"');
    }
    if (whereClause.includes("createdAt:") && schemaFields.includes("created_at") && !schemaFields.includes("createdAt")) {
      issues.push('report-generator uses "createdAt" in purchase.findMany but schema has "created_at"');
    }
  }

  // Uses p.productId but schema has product_id
  if (reportGen.includes("p.productId") && !schemaFields.includes("productId")) {
    issues.push('report-generator accesses "p.productId" but schema field is "product_id"');
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "report-generator Purchase fields aligned" : `MISMATCHES FOUND: ${issues.join("; ")}`,
  };
});

// =============================================================================
// CATEGORY 2: Auth Protection (12 tests)
// =============================================================================

const AUTH_CATEGORY = "Auth Protection";

for (const routeFile of API_ADMIN_ROUTES) {
  const routeName = routeFile.replace("app/api/admin/commerce/", "").replace("/route.ts", "");

  test(AUTH_CATEGORY, `${routeName} route has admin auth`, () => {
    const content = readFile(routeFile);
    const issues: string[] = [];

    // Must import auth from the canonical path
    const hasWithAdminAuth = content.includes("withAdminAuth");
    const hasRequireAdmin = content.includes("requireAdmin");
    const hasAuthImport = content.includes("@/lib/admin-middleware");

    if (!hasAuthImport) {
      issues.push("Missing import from @/lib/admin-middleware");
    }

    if (!hasWithAdminAuth && !hasRequireAdmin) {
      issues.push("No withAdminAuth or requireAdmin usage found");
    }

    // Check each exported handler is wrapped
    const hasGET = content.includes("export const GET") || content.includes("export async function GET");
    const hasPOST = content.includes("export const POST") || content.includes("export async function POST");

    if (hasGET) {
      const getProtected = content.includes("withAdminAuth(async (req") ||
        (content.includes("export async function GET") && content.includes("requireAdmin(request)"));
      if (!getProtected && !content.match(/export\s+const\s+GET\s*=\s*withAdminAuth/)) {
        // The etsy route uses requireAdmin in the function body
        const getSection = content.slice(content.indexOf("function GET"));
        if (!getSection.includes("requireAdmin")) {
          issues.push("GET handler not protected with auth");
        }
      }
    }

    if (hasPOST) {
      const postProtected = content.includes("withAdminAuth(async (req") ||
        (content.includes("export async function POST") && content.includes("requireAdmin(request)"));
      if (!postProtected && !content.match(/export\s+const\s+POST\s*=\s*withAdminAuth/)) {
        const postSection = content.slice(content.indexOf("function POST") || content.indexOf("POST("));
        if (!postSection.includes("requireAdmin")) {
          issues.push("POST handler not protected with auth");
        }
      }
    }

    return {
      pass: issues.length === 0,
      detail: issues.length === 0 ? "Auth verified" : issues.join("; "),
    };
  });
}

// =============================================================================
// CATEGORY 3: Import Resolution (10 tests)
// =============================================================================

const IMPORT_CATEGORY = "Import Resolution";

// Test: All lib/commerce files use @/lib/db (not @/lib/prisma)
test(IMPORT_CATEGORY, "All commerce lib files use @/lib/db (not @/lib/prisma)", () => {
  const issues: string[] = [];

  for (const file of LIB_COMMERCE_FILES) {
    if (!fileExists(file)) continue;
    const content = readFile(file);
    if (content.includes('@/lib/prisma"') || content.includes("@/lib/prisma'")) {
      issues.push(`${file} imports @/lib/prisma (should be @/lib/db)`);
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? `${LIB_COMMERCE_FILES.length} files clean` : issues.join("; "),
  };
});

// Test: All API routes use @/lib/db
test(IMPORT_CATEGORY, "All commerce API routes use @/lib/db (not @/lib/prisma)", () => {
  const issues: string[] = [];

  for (const file of [...API_ADMIN_ROUTES, ...CRON_ROUTES]) {
    if (!fileExists(file)) continue;
    const content = readFile(file);
    if (content.includes('@/lib/prisma"') || content.includes("@/lib/prisma'")) {
      issues.push(`${file} imports @/lib/prisma (should be @/lib/db)`);
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "All routes use @/lib/db" : issues.join("; "),
  };
});

// Test: No @/lib/auth/admin imports (canonical is @/lib/admin-middleware)
test(IMPORT_CATEGORY, "No wrong auth import path (@/lib/auth/admin does not exist)", () => {
  const issues: string[] = [];

  for (const file of ALL_COMMERCE_FILES) {
    if (!fileExists(file)) continue;
    const content = readFile(file);
    if (content.includes("@/lib/auth/admin")) {
      issues.push(`${file} imports @/lib/auth/admin (should be @/lib/admin-middleware)`);
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "All files use correct auth path" : issues.join("; "),
  };
});

// Test: All 12 lib/commerce files exist
test(IMPORT_CATEGORY, "All 12 commerce lib files exist", () => {
  const missing: string[] = [];
  for (const file of LIB_COMMERCE_FILES) {
    if (!fileExists(file)) missing.push(file);
  }

  return {
    pass: missing.length === 0,
    detail: missing.length === 0 ? "12/12 files present" : `Missing: ${missing.join(", ")}`,
  };
});

// Test: All 12 admin API routes exist
test(IMPORT_CATEGORY, "All 12 commerce admin API routes exist", () => {
  const missing: string[] = [];
  for (const file of API_ADMIN_ROUTES) {
    if (!fileExists(file)) missing.push(file);
  }

  return {
    pass: missing.length === 0,
    detail: missing.length === 0 ? "12/12 routes present" : `Missing: ${missing.join(", ")}`,
  };
});

// Test: Both cron routes exist
test(IMPORT_CATEGORY, "Both commerce cron routes exist", () => {
  const missing: string[] = [];
  for (const file of CRON_ROUTES) {
    if (!fileExists(file)) missing.push(file);
  }

  return {
    pass: missing.length === 0,
    detail: missing.length === 0 ? "2/2 cron routes present" : `Missing: ${missing.join(", ")}`,
  };
});

// Test: All 3 cockpit pages exist
test(IMPORT_CATEGORY, "All 3 cockpit commerce pages exist", () => {
  const missing: string[] = [];
  for (const file of COCKPIT_PAGES) {
    if (!fileExists(file)) missing.push(file);
  }

  return {
    pass: missing.length === 0,
    detail: missing.length === 0 ? "3/3 pages present" : `Missing: ${missing.join(", ")}`,
  };
});

// Test: cross-module imports resolve within commerce
test(IMPORT_CATEGORY, "Commerce lib cross-imports reference existing exports", () => {
  const issues: string[] = [];

  // campaign-generator imports from utm-engine
  const campaign = readFile("lib/commerce/campaign-generator.ts");
  if (!campaign.includes('from "./utm-engine"')) {
    issues.push("campaign-generator missing utm-engine import");
  }

  // report-generator imports from alert-engine
  const report = readFile("lib/commerce/report-generator.ts");
  if (!report.includes('from "./alert-engine"')) {
    issues.push("report-generator missing alert-engine import");
  }

  // listing-generator imports from constants
  const listing = readFile("lib/commerce/listing-generator.ts");
  if (!listing.includes('from "./constants"')) {
    issues.push("listing-generator missing constants import");
  }

  // quick-create imports from constants
  const quickCreate = readFile("lib/commerce/quick-create.ts");
  if (!quickCreate.includes('from "./constants"')) {
    issues.push("quick-create missing constants import");
  }

  // trend-engine imports from constants and types
  const trend = readFile("lib/commerce/trend-engine.ts");
  if (!trend.includes('from "./types"')) {
    issues.push("trend-engine missing types import");
  }
  if (!trend.includes('from "./constants"')) {
    issues.push("trend-engine missing constants import");
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "All cross-imports valid" : issues.join("; "),
  };
});

// Test: API routes import from commerce lib correctly
test(IMPORT_CATEGORY, "API routes import from @/lib/commerce/* correctly", () => {
  const issues: string[] = [];

  // trends route should import from trend-engine
  const trendsRoute = readFile("app/api/admin/commerce/trends/route.ts");
  if (!trendsRoute.includes("@/lib/commerce/trend-engine")) {
    issues.push("trends route missing trend-engine import");
  }

  // listings route should import from listing-generator
  const listingsRoute = readFile("app/api/admin/commerce/listings/route.ts");
  if (!listingsRoute.includes("@/lib/commerce/listing-generator")) {
    issues.push("listings route missing listing-generator import");
  }

  // campaigns route should import from campaign-generator
  const campaignsRoute = readFile("app/api/admin/commerce/campaigns/route.ts");
  if (!campaignsRoute.includes("@/lib/commerce/campaign-generator")) {
    issues.push("campaigns route missing campaign-generator import");
  }

  // alerts route should import from alert-engine
  const alertsRoute = readFile("app/api/admin/commerce/alerts/route.ts");
  if (!alertsRoute.includes("@/lib/commerce/alert-engine")) {
    issues.push("alerts route missing alert-engine import");
  }

  // quick-create route should import from quick-create lib
  const qcRoute = readFile("app/api/admin/commerce/quick-create/route.ts");
  if (!qcRoute.includes("@/lib/commerce/quick-create")) {
    issues.push("quick-create route missing quick-create lib import");
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "All API route imports valid" : issues.join("; "),
  };
});

// Test: Cron routes import from commerce lib correctly
test(IMPORT_CATEGORY, "Cron routes import from @/lib/commerce/* correctly", () => {
  const issues: string[] = [];

  const etsySync = readFile("app/api/cron/etsy-sync/route.ts");
  if (!etsySync.includes("@/lib/commerce/etsy-api")) {
    issues.push("etsy-sync missing etsy-api import");
  }

  const commerceTrends = readFile("app/api/cron/commerce-trends/route.ts");
  if (!commerceTrends.includes("@/lib/commerce/trend-engine")) {
    issues.push("commerce-trends missing trend-engine import");
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "Cron imports valid" : issues.join("; "),
  };
});

// =============================================================================
// CATEGORY 4: Etsy API Compliance (8 tests)
// =============================================================================

const ETSY_CATEGORY = "Etsy API Compliance";

// Test: ETSY_LIMITS constants match official Etsy limits
test(ETSY_CATEGORY, "ETSY_LIMITS.titleMaxChars === 140", () => {
  const constants = readFile("lib/commerce/constants.ts");
  const match = constants.match(/titleMaxChars:\s*(\d+)/);
  const value = match ? parseInt(match[1]) : 0;
  return {
    pass: value === 140,
    detail: value === 140 ? "Correct: 140" : `Wrong: ${value} (should be 140)`,
  };
});

test(ETSY_CATEGORY, "ETSY_LIMITS.tagsMax === 13", () => {
  const constants = readFile("lib/commerce/constants.ts");
  const match = constants.match(/tagsMax:\s*(\d+)/);
  const value = match ? parseInt(match[1]) : 0;
  return {
    pass: value === 13,
    detail: value === 13 ? "Correct: 13" : `Wrong: ${value} (should be 13)`,
  };
});

test(ETSY_CATEGORY, "ETSY_LIMITS.tagMaxChars === 20", () => {
  const constants = readFile("lib/commerce/constants.ts");
  const match = constants.match(/tagMaxChars:\s*(\d+)/);
  const value = match ? parseInt(match[1]) : 0;
  return {
    pass: value === 20,
    detail: value === 20 ? "Correct: 20" : `Wrong: ${value} (should be 20)`,
  };
});

test(ETSY_CATEGORY, "ETSY_LIMITS.descriptionMaxChars === 65535", () => {
  const constants = readFile("lib/commerce/constants.ts");
  const match = constants.match(/descriptionMaxChars:\s*(\d+)/);
  const value = match ? parseInt(match[1]) : 0;
  return {
    pass: value === 65535,
    detail: value === 65535 ? "Correct: 65535" : `Wrong: ${value} (should be 65535)`,
  };
});

// Test: validateEtsyListing checks all 4 required fields
test(ETSY_CATEGORY, "validateEtsyListing checks title, tags, description, price", () => {
  const constants = readFile("lib/commerce/constants.ts");
  const fnBody = constants.slice(
    constants.indexOf("function validateEtsyListing"),
    constants.indexOf("return { valid: issues.length === 0, issues };") + 50,
  );

  const checks: string[] = [];
  if (fnBody.includes("fields.title.length")) checks.push("title");
  if (fnBody.includes("fields.tags.length")) checks.push("tags count");
  if (fnBody.includes("tag.length")) checks.push("tag char length");
  if (fnBody.includes("fields.description.length")) checks.push("description");
  if (fnBody.includes("fields.price")) checks.push("price");

  const pass = checks.length >= 5;
  return {
    pass,
    detail: pass ? `All 5 checks present: ${checks.join(", ")}` : `Missing checks. Found: ${checks.join(", ")}`,
  };
});

// Test: createListing sends who_made, when_made, taxonomy_id, type
test(ETSY_CATEGORY, "createListing sends required Etsy API fields", () => {
  const etsyApi = readFile("lib/commerce/etsy-api.ts");
  const createSection = etsyApi.slice(
    etsyApi.indexOf("async function createListing") || etsyApi.indexOf("export async function createListing"),
    etsyApi.indexOf("async function updateListing") || etsyApi.indexOf("export async function updateListing"),
  );

  const issues: string[] = [];
  const required = ["who_made", "when_made", "taxonomy_id", "type"];
  for (const field of required) {
    if (!createSection.includes(`"${field}"`)) {
      issues.push(`Missing required Etsy field: ${field}`);
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "All 4 required fields present" : issues.join("; "),
  };
});

// Test: listing-generator auto-fixes to Etsy limits
test(ETSY_CATEGORY, "listing-generator auto-truncates title/tags/description to Etsy limits", () => {
  const listingGen = readFile("lib/commerce/listing-generator.ts");
  const issues: string[] = [];

  if (!listingGen.includes("ETSY_LIMITS.titleMaxChars")) {
    issues.push("No title truncation to ETSY_LIMITS.titleMaxChars");
  }
  if (!listingGen.includes("ETSY_LIMITS.tagsMax")) {
    issues.push("No tag count truncation to ETSY_LIMITS.tagsMax");
  }
  if (!listingGen.includes("ETSY_LIMITS.tagMaxChars")) {
    issues.push("No tag char truncation to ETSY_LIMITS.tagMaxChars");
  }
  if (!listingGen.includes("ETSY_LIMITS.descriptionMaxChars")) {
    issues.push("No description truncation to ETSY_LIMITS.descriptionMaxChars");
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "All 4 limits enforced" : issues.join("; "),
  };
});

// Test: quick-create also auto-fixes to Etsy limits
test(ETSY_CATEGORY, "quick-create auto-truncates title/tags/description to Etsy limits", () => {
  const qc = readFile("lib/commerce/quick-create.ts");
  const issues: string[] = [];

  if (!qc.includes("ETSY_LIMITS.titleMaxChars")) {
    issues.push("No title truncation");
  }
  if (!qc.includes("ETSY_LIMITS.tagsMax")) {
    issues.push("No tag count truncation");
  }
  if (!qc.includes("ETSY_LIMITS.tagMaxChars")) {
    issues.push("No tag char truncation");
  }
  if (!qc.includes("ETSY_LIMITS.descriptionMaxChars")) {
    issues.push("No description truncation");
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "All 4 limits enforced" : issues.join("; "),
  };
});

// =============================================================================
// CATEGORY 5: Budget Guards (4 tests)
// =============================================================================

const BUDGET_CATEGORY = "Budget Guards";

// Test: etsy-sync has BUDGET_MS <= 53000
test(BUDGET_CATEGORY, "etsy-sync BUDGET_MS <= 53000", () => {
  const content = readFile("app/api/cron/etsy-sync/route.ts");
  const match = content.match(/BUDGET_MS\s*=\s*(\d[\d_]*)/);
  const value = match ? parseInt(match[1].replace(/_/g, "")) : 0;
  return {
    pass: value > 0 && value <= 53000,
    detail: value > 0 && value <= 53000 ? `BUDGET_MS = ${value}ms` : `BUDGET_MS = ${value}ms (should be <= 53000)`,
  };
});

// Test: etsy-sync has budget check inside loop
test(BUDGET_CATEGORY, "etsy-sync has budget check inside site loop", () => {
  const content = readFile("app/api/cron/etsy-sync/route.ts");
  // Look for budget check pattern inside the for loop
  const hasBudgetCheck = content.includes("Date.now() - startTime > BUDGET_MS") ||
    content.includes("Date.now() - startTime > BUDGET");

  return {
    pass: hasBudgetCheck,
    detail: hasBudgetCheck ? "Budget check present in loop" : "No budget check found in processing loop",
  };
});

// Test: commerce-trends has BUDGET_MS <= 53000
test(BUDGET_CATEGORY, "commerce-trends BUDGET_MS <= 53000", () => {
  const content = readFile("app/api/cron/commerce-trends/route.ts");
  const match = content.match(/BUDGET_MS\s*=\s*(\d[\d_]*)/);
  const value = match ? parseInt(match[1].replace(/_/g, "")) : 0;
  return {
    pass: value > 0 && value <= 53000,
    detail: value > 0 && value <= 53000 ? `BUDGET_MS = ${value}ms` : `BUDGET_MS = ${value}ms (should be <= 53000)`,
  };
});

// Test: commerce-trends has budget check inside loop
test(BUDGET_CATEGORY, "commerce-trends has budget check inside site loop", () => {
  const content = readFile("app/api/cron/commerce-trends/route.ts");
  const hasBudgetCheck = content.includes("budgetUsed > BUDGET_MS") ||
    content.includes("Date.now() - cronStart > BUDGET_MS");

  return {
    pass: hasBudgetCheck,
    detail: hasBudgetCheck ? "Budget check present in loop" : "No budget check found in processing loop",
  };
});

// =============================================================================
// CATEGORY 6: Cron Auth Pattern (2 tests)
// =============================================================================

const CRON_AUTH_CATEGORY = "Cron Auth Pattern";

// Standard cron auth: allow if CRON_SECRET unset, reject only if set and doesn't match
test(CRON_AUTH_CATEGORY, "etsy-sync follows standard cron auth pattern", () => {
  const content = readFile("app/api/cron/etsy-sync/route.ts");
  const issues: string[] = [];

  // Must check if CRON_SECRET is set before enforcing
  const hasConditionalCheck =
    content.includes("const cronSecret = process.env.CRON_SECRET") ||
    content.includes("process.env.CRON_SECRET");
  const hasConditionalBlock =
    content.includes("if (cronSecret)") ||
    content.includes("if (cronSecret &&");

  if (!hasConditionalCheck) {
    issues.push("Does not read CRON_SECRET from env");
  }
  if (!hasConditionalBlock) {
    issues.push("Does not conditionally enforce CRON_SECRET (should allow if unset)");
  }

  // Should NOT have unconditional 401
  const hasUnconditionalAuth = content.match(/if\s*\(\s*!.*CRON_SECRET/);
  if (hasUnconditionalAuth && !content.includes("if (cronSecret)")) {
    issues.push("Unconditional CRON_SECRET check blocks when unset");
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "Standard cron auth pattern" : issues.join("; "),
  };
});

test(CRON_AUTH_CATEGORY, "commerce-trends follows standard cron auth pattern", () => {
  const content = readFile("app/api/cron/commerce-trends/route.ts");
  const issues: string[] = [];

  const hasConditionalCheck = content.includes("process.env.CRON_SECRET");
  const hasConditionalBlock =
    content.includes("if (cronSecret &&") ||
    content.includes("if (cronSecret)");

  if (!hasConditionalCheck) {
    issues.push("Does not read CRON_SECRET from env");
  }
  if (!hasConditionalBlock) {
    issues.push("Does not conditionally enforce CRON_SECRET");
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "Standard cron auth pattern" : issues.join("; "),
  };
});

// =============================================================================
// CATEGORY 7: Error Handling (6 tests)
// =============================================================================

const ERROR_CATEGORY = "Error Handling";

// Test: No empty catch blocks in commerce lib files
test(ERROR_CATEGORY, "No empty catch {} in commerce lib files", () => {
  const issues: string[] = [];

  for (const file of LIB_COMMERCE_FILES) {
    if (!fileExists(file)) continue;
    const content = readFile(file);

    // Look for catch blocks that do nothing
    // Pattern: catch { } or catch (err) { } with only whitespace
    const emptyCatchRegex = /catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;
    let match: RegExpExecArray | null;
    while ((match = emptyCatchRegex.exec(content)) !== null) {
      // Get line number
      const lineNum = content.slice(0, match.index).split("\n").length;
      issues.push(`${file}:${lineNum} — empty catch block`);
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? `${LIB_COMMERCE_FILES.length} files clean` : issues.join("; "),
  };
});

// Test: No empty catch blocks in commerce API routes
test(ERROR_CATEGORY, "No empty catch {} in commerce API routes", () => {
  const issues: string[] = [];

  for (const file of API_ADMIN_ROUTES) {
    if (!fileExists(file)) continue;
    const content = readFile(file);

    const emptyCatchRegex = /catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;
    let match: RegExpExecArray | null;
    while ((match = emptyCatchRegex.exec(content)) !== null) {
      const lineNum = content.slice(0, match.index).split("\n").length;
      issues.push(`${file}:${lineNum} — empty catch block`);
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? `${API_ADMIN_ROUTES.length} routes clean` : issues.join("; "),
  };
});

// Test: No empty catch blocks in cron routes
test(ERROR_CATEGORY, "No empty catch {} in commerce cron routes", () => {
  const issues: string[] = [];

  for (const file of CRON_ROUTES) {
    if (!fileExists(file)) continue;
    const content = readFile(file);

    const emptyCatchRegex = /catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;
    let match: RegExpExecArray | null;
    while ((match = emptyCatchRegex.exec(content)) !== null) {
      const lineNum = content.slice(0, match.index).split("\n").length;
      issues.push(`${file}:${lineNum} — empty catch block`);
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? `${CRON_ROUTES.length} cron routes clean` : issues.join("; "),
  };
});

// Test: catch blocks log or re-throw in etsy-api.ts
test(ERROR_CATEGORY, "etsy-api.ts catch blocks log or re-throw", () => {
  const content = readFile("lib/commerce/etsy-api.ts");
  const issues: string[] = [];

  // Find all catch blocks
  const catchRegex = /catch\s*(?:\([^)]*\))?\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = catchRegex.exec(content)) !== null) {
    const body = match[1].trim();
    // Empty or only whitespace/comments
    if (!body || body.replace(/\/\/[^\n]*/g, "").trim() === "") {
      const lineNum = content.slice(0, match.index).split("\n").length;
      issues.push(`Line ${lineNum}: empty catch body`);
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "All catch blocks handle errors" : issues.join("; "),
  };
});

// Test: catch blocks log or re-throw in trend-engine.ts
test(ERROR_CATEGORY, "trend-engine.ts catch blocks log or re-throw", () => {
  const content = readFile("lib/commerce/trend-engine.ts");
  const issues: string[] = [];

  const catchRegex = /catch\s*(?:\([^)]*\))?\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = catchRegex.exec(content)) !== null) {
    const body = match[1].trim();
    if (!body || body.replace(/\/\/[^\n]*/g, "").trim() === "") {
      const lineNum = content.slice(0, match.index).split("\n").length;
      issues.push(`Line ${lineNum}: empty catch body`);
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "All catch blocks handle errors" : issues.join("; "),
  };
});

// Test: No swallowed errors in etsy-csv-import.ts
test(ERROR_CATEGORY, "etsy-csv-import.ts catch blocks log or re-throw", () => {
  const content = readFile("lib/commerce/etsy-csv-import.ts");
  const issues: string[] = [];

  const catchRegex = /catch\s*(?:\([^)]*\))?\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = catchRegex.exec(content)) !== null) {
    const body = match[1].trim();
    if (!body || body.replace(/\/\/[^\n]*/g, "").trim() === "") {
      const lineNum = content.slice(0, match.index).split("\n").length;
      issues.push(`Line ${lineNum}: empty catch body`);
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "All catch blocks handle errors" : issues.join("; "),
  };
});

// =============================================================================
// CATEGORY 8: Multi-Site Scoping (4 tests)
// =============================================================================

const MULTISITE_CATEGORY = "Multi-Site Scoping";

// Test: API routes accept and validate siteId
test(MULTISITE_CATEGORY, "Commerce API routes accept siteId parameter", () => {
  const issues: string[] = [];
  const routesToCheck = [
    "app/api/admin/commerce/trends/route.ts",
    "app/api/admin/commerce/briefs/route.ts",
    "app/api/admin/commerce/stats/route.ts",
    "app/api/admin/commerce/campaigns/route.ts",
    "app/api/admin/commerce/alerts/route.ts",
    "app/api/admin/commerce/listings/route.ts",
    "app/api/admin/commerce/packs/route.ts",
    "app/api/admin/commerce/reports/route.ts",
  ];

  for (const file of routesToCheck) {
    if (!fileExists(file)) continue;
    const content = readFile(file);
    const routeName = file.replace("app/api/admin/commerce/", "").replace("/route.ts", "");

    if (!content.includes("siteId") && !content.includes("site_id")) {
      issues.push(`${routeName}: no siteId parameter handling`);
    }

    if (!content.includes("getDefaultSiteId")) {
      issues.push(`${routeName}: no getDefaultSiteId fallback`);
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? `${routesToCheck.length} routes scoped` : issues.join("; "),
  };
});

// Test: Cron routes loop through active sites
test(MULTISITE_CATEGORY, "Cron routes process multiple sites", () => {
  const issues: string[] = [];

  const etsySync = readFile("app/api/cron/etsy-sync/route.ts");
  if (!etsySync.includes("getActiveSiteIds") && !etsySync.includes("activeSites")) {
    issues.push("etsy-sync does not iterate active sites");
  }

  const commerceTrends = readFile("app/api/cron/commerce-trends/route.ts");
  if (!commerceTrends.includes("getActiveSiteIds") && !commerceTrends.includes("activeSiteIds")) {
    issues.push("commerce-trends does not iterate active sites");
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "Both crons process all sites" : issues.join("; "),
  };
});

// Test: Commerce lib functions accept siteId parameter
test(MULTISITE_CATEGORY, "Commerce lib functions accept siteId parameter", () => {
  const issues: string[] = [];

  // Check key functions have siteId parameter
  const trendEngine = readFile("lib/commerce/trend-engine.ts");
  if (!trendEngine.includes("siteId: string")) {
    issues.push("executeTrendRun missing siteId parameter");
  }

  const alertEngine = readFile("lib/commerce/alert-engine.ts");
  if (!alertEngine.includes("siteId: string")) {
    issues.push("createAlert missing siteId parameter");
  }

  const reportGen = readFile("lib/commerce/report-generator.ts");
  if (!reportGen.includes("siteId: string")) {
    issues.push("generateWeeklyReport missing siteId parameter");
  }

  const quickCreate = readFile("lib/commerce/quick-create.ts");
  if (!quickCreate.includes("siteId: string")) {
    issues.push("quickCreate missing siteId parameter");
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "All key functions accept siteId" : issues.join("; "),
  };
});

// Test: DB queries include siteId in where clause
test(MULTISITE_CATEGORY, "Alert engine DB queries include siteId in where clause", () => {
  const alertEngine = readFile("lib/commerce/alert-engine.ts");
  const issues: string[] = [];

  // Count prisma queries that should be scoped
  const queryMethods = ["findMany", "findFirst", "count", "updateMany"];
  for (const method of queryMethods) {
    const regex = new RegExp(`prisma\\.commerceAlert\\.${method}\\(`, "g");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(alertEngine)) !== null) {
      // Check if the query near this position includes siteId
      const nearby = alertEngine.slice(match.index, match.index + 200);
      if (!nearby.includes("siteId")) {
        const lineNum = alertEngine.slice(0, match.index).split("\n").length;
        issues.push(`Line ${lineNum}: ${method} missing siteId in where clause`);
      }
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "All alert queries scoped by siteId" : issues.join("; "),
  };
});

// =============================================================================
// CATEGORY 9: No Fake Data (4 tests)
// =============================================================================

const FAKE_DATA_CATEGORY = "No Fake Data";

// Test: No Math.random() in any commerce lib file
test(FAKE_DATA_CATEGORY, "No Math.random() in commerce lib files", () => {
  const issues: string[] = [];

  for (const file of LIB_COMMERCE_FILES) {
    if (!fileExists(file)) continue;
    const content = readFile(file);
    if (content.includes("Math.random()")) {
      const lineNum = content.slice(0, content.indexOf("Math.random()")).split("\n").length;
      issues.push(`${file}:${lineNum}`);
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? `${LIB_COMMERCE_FILES.length} files clean` : `Math.random() found: ${issues.join(", ")}`,
  };
});

// Test: No Math.random() in any commerce API route
test(FAKE_DATA_CATEGORY, "No Math.random() in commerce API routes", () => {
  const issues: string[] = [];

  for (const file of [...API_ADMIN_ROUTES, ...CRON_ROUTES]) {
    if (!fileExists(file)) continue;
    const content = readFile(file);
    if (content.includes("Math.random()")) {
      const lineNum = content.slice(0, content.indexOf("Math.random()")).split("\n").length;
      issues.push(`${file}:${lineNum}`);
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "All routes clean" : `Math.random() found: ${issues.join(", ")}`,
  };
});

// Test: No hardcoded mock arrays or fake data in lib files
test(FAKE_DATA_CATEGORY, "No hardcoded mock/placeholder data objects in commerce lib", () => {
  const issues: string[] = [];
  const fakePatterns = [
    /mock[A-Z]\w*\s*[:=]/i,
    /fake[A-Z]\w*\s*[:=]/i,
    /MOCK_DATA/,
    /FAKE_/,
    /placeholder[A-Z]\w*\s*[:=]/i,
  ];

  for (const file of LIB_COMMERCE_FILES) {
    if (!fileExists(file)) continue;
    // Skip types.ts — it may define type names that contain "mock" etc.
    if (file.includes("types.ts")) continue;
    const content = readFile(file);

    for (const pattern of fakePatterns) {
      if (pattern.test(content)) {
        issues.push(`${file}: matches pattern ${pattern.source}`);
      }
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "No mock/fake data found" : issues.join("; "),
  };
});

// Test: No Math.random() in cockpit commerce pages
test(FAKE_DATA_CATEGORY, "No Math.random() in cockpit commerce pages", () => {
  const issues: string[] = [];

  for (const file of COCKPIT_PAGES) {
    if (!fileExists(file)) continue;
    const content = readFile(file);
    if (content.includes("Math.random()")) {
      const lineNum = content.slice(0, content.indexOf("Math.random()")).split("\n").length;
      issues.push(`${file}:${lineNum}`);
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? `${COCKPIT_PAGES.length} pages clean` : `Math.random() found: ${issues.join(", ")}`,
  };
});

// =============================================================================
// CATEGORY 10: Cron Registration (2 tests)
// =============================================================================

const CRON_REG_CATEGORY = "Cron Registration";

test(CRON_REG_CATEGORY, "commerce-trends registered in vercel.json", () => {
  const vercelJson = readFile("vercel.json");
  const hasPath = vercelJson.includes("/api/cron/commerce-trends");

  return {
    pass: hasPath,
    detail: hasPath ? "Registered with schedule" : "NOT FOUND in vercel.json crons",
  };
});

test(CRON_REG_CATEGORY, "etsy-sync registered in vercel.json", () => {
  const vercelJson = readFile("vercel.json");
  const hasPath = vercelJson.includes("/api/cron/etsy-sync");

  return {
    pass: hasPath,
    detail: hasPath ? "Registered with schedule" : "NOT FOUND in vercel.json crons",
  };
});

// =============================================================================
// BONUS CATEGORY: Structural Integrity (4 tests)
// =============================================================================

const STRUCTURAL_CATEGORY = "Structural Integrity";

// Test: OPPORTUNITY_SCORE_WEIGHTS sum to 1.0
test(STRUCTURAL_CATEGORY, "OPPORTUNITY_SCORE_WEIGHTS sum to 1.0", () => {
  const constants = readFile("lib/commerce/constants.ts");
  const weightBlock = constants.slice(
    constants.indexOf("OPPORTUNITY_SCORE_WEIGHTS"),
    constants.indexOf("} as const", constants.indexOf("OPPORTUNITY_SCORE_WEIGHTS")) + 15,
  );

  const weights: number[] = [];
  const regex = /:\s*(0\.\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(weightBlock)) !== null) {
    weights.push(parseFloat(match[1]));
  }

  const sum = weights.reduce((a, b) => a + b, 0);
  const pass = Math.abs(sum - 1.0) < 0.001;

  return {
    pass,
    detail: pass ? `Sum = ${sum.toFixed(2)} (7 weights)` : `Sum = ${sum.toFixed(4)} (should be 1.0)`,
  };
});

// Test: PRODUCT_ONTOLOGY has 11 categories
test(STRUCTURAL_CATEGORY, "PRODUCT_ONTOLOGY has 11 categories", () => {
  const constants = readFile("lib/commerce/constants.ts");
  const categoryMatches = constants.match(/category:\s*"/g);
  const count = categoryMatches?.length ?? 0;

  return {
    pass: count === 11,
    detail: count === 11 ? "11 categories present" : `${count} categories found (expected 11)`,
  };
});

// Test: Both cron routes export GET and POST handlers
test(STRUCTURAL_CATEGORY, "Cron routes export both GET and POST for Vercel compatibility", () => {
  const issues: string[] = [];

  for (const file of CRON_ROUTES) {
    if (!fileExists(file)) continue;
    const content = readFile(file);
    const routeName = file.includes("etsy-sync") ? "etsy-sync" : "commerce-trends";

    if (!content.includes("export async function GET") && !content.includes("export const GET")) {
      issues.push(`${routeName}: missing GET export`);
    }
    if (!content.includes("export async function POST") && !content.includes("export const POST")) {
      issues.push(`${routeName}: missing POST export`);
    }
  }

  return {
    pass: issues.length === 0,
    detail: issues.length === 0 ? "Both crons export GET+POST" : issues.join("; "),
  };
});

// Test: UTM engine uses crypto.getRandomValues (not Math.random)
test(STRUCTURAL_CATEGORY, "UTM engine coupon code uses crypto.getRandomValues (not Math.random)", () => {
  const utmEngine = readFile("lib/commerce/utm-engine.ts");
  const usesCrypto = utmEngine.includes("crypto.getRandomValues");
  const usesMathRandom = utmEngine.includes("Math.random()");

  return {
    pass: usesCrypto && !usesMathRandom,
    detail: usesCrypto && !usesMathRandom
      ? "Uses crypto.getRandomValues"
      : usesMathRandom
        ? "Uses Math.random() instead of crypto"
        : "crypto.getRandomValues not found",
  };
});

// =============================================================================
// 11. Extended Models (V2 schema additions)
// =============================================================================

test("Extended Models", "Prisma schema has Tenant model", () => {
  const schema = readFile("prisma/schema.prisma");
  const has = schema.includes("model Tenant {");
  return { pass: has, detail: has ? "Found" : "Missing model Tenant" };
});

test("Extended Models", "Prisma schema has TenantIntegration model", () => {
  const schema = readFile("prisma/schema.prisma");
  const has = schema.includes("model TenantIntegration {");
  return { pass: has, detail: has ? "Found" : "Missing model TenantIntegration" };
});

test("Extended Models", "Prisma schema has DistributionAsset model", () => {
  const schema = readFile("prisma/schema.prisma");
  const has = schema.includes("model DistributionAsset {");
  return { pass: has, detail: has ? "Found" : "Missing model DistributionAsset" };
});

test("Extended Models", "Prisma schema has CommerceSettings model", () => {
  const schema = readFile("prisma/schema.prisma");
  const has = schema.includes("model CommerceSettings {");
  return { pass: has, detail: has ? "Found" : "Missing model CommerceSettings" };
});

test("Extended Models", "Prisma schema has CommerceOrder model", () => {
  const schema = readFile("prisma/schema.prisma");
  const has = schema.includes("model CommerceOrder {");
  return { pass: has, detail: has ? "Found" : "Missing model CommerceOrder" };
});

test("Extended Models", "Prisma schema has Payout model", () => {
  const schema = readFile("prisma/schema.prisma");
  const has = schema.includes("model Payout {");
  return { pass: has, detail: has ? "Found" : "Missing model Payout" };
});

test("Extended Models", "Prisma schema has PayoutProfileTemplate model", () => {
  const schema = readFile("prisma/schema.prisma");
  const has = schema.includes("model PayoutProfileTemplate {");
  return { pass: has, detail: has ? "Found" : "Missing model PayoutProfileTemplate" };
});

test("Extended Models", "Prisma schema has TrendSignal model", () => {
  const schema = readFile("prisma/schema.prisma");
  const has = schema.includes("model TrendSignal {");
  return { pass: has, detail: has ? "Found" : "Missing model TrendSignal" };
});

test("Extended Models", "Prisma schema has KeywordCluster model", () => {
  const schema = readFile("prisma/schema.prisma");
  const has = schema.includes("model KeywordCluster {");
  return { pass: has, detail: has ? "Found" : "Missing model KeywordCluster" };
});

test("Extended Models", "Prisma schema has CommerceTask model", () => {
  const schema = readFile("prisma/schema.prisma");
  const has = schema.includes("model CommerceTask {");
  return { pass: has, detail: has ? "Found" : "Missing model CommerceTask" };
});

test("Extended Models", "Purchase model has gross/net fee breakdown", () => {
  const schema = readFile("prisma/schema.prisma");
  const hasGross = schema.includes("gross_amount");
  const hasNet = schema.includes("net_amount");
  const hasFees = schema.includes("platform_fees");
  return { pass: hasGross && hasNet && hasFees, detail: `gross:${hasGross} net:${hasNet} fees:${hasFees}` };
});

test("Extended Models", "DigitalProduct has sku and version", () => {
  const schema = readFile("prisma/schema.prisma");
  const hasSku = schema.includes("sku") && schema.includes("@unique");
  const hasVersion = schema.includes("version") && schema.includes("@default(1)");
  return { pass: hasSku && hasVersion, detail: `sku:${hasSku} version:${hasVersion}` };
});

test("Extended Models", "EtsyListingDraft has titleVariants and descriptionBlocks", () => {
  const schema = readFile("prisma/schema.prisma");
  const hasTitleVar = schema.includes("titleVariants");
  const hasDescBlocks = schema.includes("descriptionBlocks");
  return { pass: hasTitleVar && hasDescBlocks, detail: `titleVariants:${hasTitleVar} descBlocks:${hasDescBlocks}` };
});

// =============================================================================
// 12. New API Routes
// =============================================================================

test("New API Routes", "global-rollup route exists", () => {
  const exists = fileExists("app/api/admin/commerce/global-rollup/route.ts");
  return { pass: exists, detail: exists ? "Found" : "Missing" };
});

test("New API Routes", "global-rollup uses requireAdmin", () => {
  const src = readFile("app/api/admin/commerce/global-rollup/route.ts");
  const hasAuth = src.includes("requireAdmin");
  return { pass: hasAuth, detail: hasAuth ? "Protected" : "UNPROTECTED" };
});

test("New API Routes", "tasks route exists", () => {
  const exists = fileExists("app/api/admin/commerce/tasks/route.ts");
  return { pass: exists, detail: exists ? "Found" : "Missing" };
});

test("New API Routes", "tasks route uses requireAdmin", () => {
  const src = readFile("app/api/admin/commerce/tasks/route.ts");
  const hasAuth = src.includes("requireAdmin");
  return { pass: hasAuth, detail: hasAuth ? "Protected" : "UNPROTECTED" };
});

test("New API Routes", "orders route exists", () => {
  const exists = fileExists("app/api/admin/commerce/orders/route.ts");
  return { pass: exists, detail: exists ? "Found" : "Missing" };
});

test("New API Routes", "orders route uses requireAdmin", () => {
  const src = readFile("app/api/admin/commerce/orders/route.ts");
  const hasAuth = src.includes("requireAdmin");
  return { pass: hasAuth, detail: hasAuth ? "Protected" : "UNPROTECTED" };
});

test("New API Routes", "payouts route exists", () => {
  const exists = fileExists("app/api/admin/commerce/payouts/route.ts");
  return { pass: exists, detail: exists ? "Found" : "Missing" };
});

test("New API Routes", "payouts route uses requireAdmin", () => {
  const src = readFile("app/api/admin/commerce/payouts/route.ts");
  const hasAuth = src.includes("requireAdmin");
  return { pass: hasAuth, detail: hasAuth ? "Protected" : "UNPROTECTED" };
});

// =============================================================================
// 13. Sidebar Navigation
// =============================================================================

test("Sidebar Navigation", "Sidebar has all 7 Etsy Hybrid Engine modules", () => {
  const src = readFile("components/admin/mophy/mophy-admin-layout.tsx");
  const hasNiche = src.includes("Niche Goldmine");
  const hasIdeation = src.includes("Ideation & Validation");
  const hasBranding = src.includes("Branding & Identity");
  const hasDesign = src.includes("Design Assistant");
  const hasEtsy = src.includes("Etsy SEO");
  const hasMarketing = src.includes("Marketing Machine");
  const hasGrowth = src.includes("Growth Blueprint");
  const allPresent = hasNiche && hasIdeation && hasBranding && hasDesign && hasEtsy && hasMarketing && hasGrowth;
  return { pass: allPresent, detail: `niche:${hasNiche} ideation:${hasIdeation} branding:${hasBranding} design:${hasDesign} etsy:${hasEtsy} marketing:${hasMarketing} growth:${hasGrowth}` };
});

test("Sidebar Navigation", "Sidebar has TrendRun Engine link", () => {
  const src = readFile("components/admin/mophy/mophy-admin-layout.tsx");
  const has = src.includes("TrendRun Engine");
  return { pass: has, detail: has ? "Found" : "Missing" };
});

test("Sidebar Navigation", "Sidebar has Sales & Payouts link", () => {
  const src = readFile("components/admin/mophy/mophy-admin-layout.tsx");
  const has = src.includes("Sales & Payouts");
  return { pass: has, detail: has ? "Found" : "Missing" };
});

test("Sidebar Navigation", "Sidebar has Assets & Links link", () => {
  const src = readFile("components/admin/mophy/mophy-admin-layout.tsx");
  const has = src.includes("Assets & Links");
  return { pass: has, detail: has ? "Found" : "Missing" };
});

test("Sidebar Navigation", "Sidebar has Settings link under commerce", () => {
  const src = readFile("components/admin/mophy/mophy-admin-layout.tsx");
  const has = src.includes("tab=settings");
  return { pass: has, detail: has ? "Found" : "Missing" };
});

// =============================================================================
// 14. Cockpit Tabs
// =============================================================================

test("Cockpit Tabs", "Commerce page has all 12 tabs", () => {
  const src = readFile("app/admin/cockpit/commerce/page.tsx");
  const tabs = ["overview", "trends", "briefs", "products", "etsy", "campaigns", "branding", "design", "growth", "trendrun", "assets", "settings"];
  const missing = tabs.filter((t) => !src.includes(`"${t}"`));
  return { pass: missing.length === 0, detail: missing.length === 0 ? "All 12 tabs present" : `Missing: ${missing.join(", ")}` };
});

test("Cockpit Tabs", "Commerce page reads tab from URL query params", () => {
  const src = readFile("app/admin/cockpit/commerce/page.tsx");
  const hasSearchParams = src.includes("useSearchParams");
  return { pass: hasSearchParams, detail: hasSearchParams ? "URL tab sync works" : "Missing useSearchParams" };
});

test("Cockpit Tabs", "Payout onboarding checklist exists in Settings tab", () => {
  const src = readFile("app/admin/cockpit/commerce/page.tsx");
  const has = src.includes("Onboarding Checklist") && src.includes("091311229") && src.includes("Zenitha.Luxury");
  return { pass: has, detail: has ? "Mercury payout validation present" : "Missing payout checklist" };
});

test("Cockpit Tabs", "Growth Blueprint has lock/unlock logic", () => {
  const src = readFile("app/admin/cockpit/commerce/page.tsx");
  const hasLock = src.includes("Growth Blueprint Locked") && src.includes("Growth Blueprint Unlocked");
  return { pass: hasLock, detail: hasLock ? "Lock/unlock states present" : "Missing lock logic" };
});

// =============================================================================
// 15. Documentation
// =============================================================================

test("Documentation", "docs/hybrid-engine.md exists", () => {
  const exists = fileExists("docs/hybrid-engine.md");
  return { pass: exists, detail: exists ? "Found" : "Missing — required by spec" };
});

test("Documentation", "Test suite has unit tests", () => {
  const exists = fileExists("test/commerce/scoring.spec.ts") &&
    fileExists("test/commerce/utm-builder.spec.ts") &&
    fileExists("test/commerce/etsy-adapter.spec.ts");
  return { pass: exists, detail: exists ? "All test files found" : "Missing test files" };
});

// =============================================================================
// Report
// =============================================================================

function printReport() {
  console.log("\n" + "=".repeat(72));
  console.log("  COMMERCE ENGINE SMOKE TEST SUITE");
  console.log("=".repeat(72) + "\n");

  // Group by category
  const categories = new Map<string, TestResult[]>();
  for (const r of results) {
    const arr = categories.get(r.category) ?? [];
    arr.push(r);
    categories.set(r.category, arr);
  }

  let totalPass = 0;
  let totalFail = 0;

  for (const [category, tests] of categories) {
    const catPass = tests.filter((t) => t.pass).length;
    const catFail = tests.filter((t) => !t.pass).length;
    totalPass += catPass;
    totalFail += catFail;

    const catStatus = catFail === 0 ? "\x1b[32mALL PASS\x1b[0m" : `\x1b[31m${catFail} FAIL\x1b[0m`;
    console.log(`--- ${category} (${catPass}/${tests.length}) ${catStatus} ---`);

    for (const t of tests) {
      const icon = t.pass ? PASS : FAIL;
      console.log(`  ${icon}  ${t.name}`);
      if (!t.pass) {
        console.log(`         ${t.detail}`);
      }
    }
    console.log();
  }

  // Summary
  console.log("=".repeat(72));
  const total = totalPass + totalFail;
  const score = total > 0 ? Math.round((totalPass / total) * 100) : 0;
  const color = totalFail === 0 ? "\x1b[32m" : "\x1b[31m";
  console.log(
    `  TOTAL: ${color}${totalPass}/${total} PASS (${score}%)\x1b[0m` +
      (totalFail > 0 ? ` — ${totalFail} FAILED` : ""),
  );
  console.log("=".repeat(72) + "\n");

  return totalFail;
}

const failCount = printReport();
process.exit(failCount > 0 ? 1 : 0);
