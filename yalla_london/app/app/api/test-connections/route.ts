export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

// ---------------------------------------------------------------------------
// Auth: Cookie-based session. Login via admin credentials OR CRON_SECRET.
// ---------------------------------------------------------------------------
const COOKIE_NAME = "tc_session";
const SESSION_TTL = 4 * 60 * 60 * 1000; // 4 hours

function getSigningKey(): string {
  return process.env.NEXTAUTH_SECRET || process.env.CRON_SECRET || "fallback-dev-key";
}

function createSessionToken(): string {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_TTL });
  const sig = createHmac("sha256", getSigningKey()).update(payload).digest("hex");
  return Buffer.from(payload).toString("base64") + "." + sig;
}

function verifySessionToken(token: string): boolean {
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return false;
    const payload = Buffer.from(payloadB64, "base64").toString();
    const expected = createHmac("sha256", getSigningKey()).update(payload).digest("hex");
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
    const data = JSON.parse(payload) as { exp: number };
    return data.exp > Date.now();
  } catch {
    return false;
  }
}

function isAuthenticated(request: NextRequest): boolean {
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (cookie && verifySessionToken(cookie)) return true;
  return false;
}

async function isAdminSession(request: NextRequest): Promise<boolean> {
  try {
    const { decode } = await import("next-auth/jwt");
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) return false;
    const secureCookie = request.cookies.get("__Secure-next-auth.session-token")?.value;
    const plainCookie = request.cookies.get("next-auth.session-token")?.value;
    const tokenValue = secureCookie || plainCookie;
    if (!tokenValue) return false;
    const decoded = await decode({ secret, token: tokenValue });
    return !!decoded?.email;
  } catch {
    return false;
  }
}

async function validateCredentials(input: string): Promise<{ ok: boolean; method: string }> {
  // Method 1: CRON_SECRET match
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && input === cronSecret) {
    return { ok: true, method: "CRON_SECRET" };
  }

  // Method 2: Admin password check (via User table)
  try {
    const { prisma } = await import("@/lib/db");
    const bcrypt = await import("bcryptjs");
    const admins = await prisma.user.findMany({
      where: { role: "admin", isActive: true, passwordHash: { not: null } },
      select: { passwordHash: true },
    });
    for (const admin of admins) {
      if (admin.passwordHash && await bcrypt.compare(input, admin.passwordHash)) {
        return { ok: true, method: "Admin password" };
      }
    }
  } catch {
    // bcryptjs may not be installed or DB unreachable — skip, CRON_SECRET still works
  }

  return { ok: false, method: "" };
}

// ---------------------------------------------------------------------------
// GET — Show login page OR test dashboard
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  // Already authenticated via our cookie?
  if (isAuthenticated(request)) {
    return new NextResponse(buildTestPage(), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Already logged into admin dashboard? (NextAuth session cookie)
  if (await isAdminSession(request)) {
    const response = new NextResponse(buildTestPage(), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
    const token = createSessionToken();
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_TTL / 1000,
      path: "/api/test-connections",
    });
    return response;
  }

  // Not authenticated — show login page
  return new NextResponse(buildLoginPage(), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// ---------------------------------------------------------------------------
// POST — Login OR run a test suite
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const body = await request.json();

  // --- Login action ---
  if (body.action === "login") {
    const { password } = body as { password: string };
    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }
    const result = await validateCredentials(password);
    if (!result.ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const token = createSessionToken();
    const response = NextResponse.json({ success: true, method: result.method });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_TTL / 1000,
      path: "/api/test-connections",
    });
    return response;
  }

  // --- Logout action ---
  if (body.action === "logout") {
    const response = NextResponse.json({ success: true });
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // --- All remaining actions require auth ---
  if (!isAuthenticated(request) && !(await isAdminSession(request))) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // --- Fix issues action ---
  if (body.action === "fix-issues") {
    return await handleFixIssues();
  }

  // --- Test suite execution ---
  const { suite } = body as { suite: string };

  if (!suite) {
    return NextResponse.json({ error: "Missing 'suite' parameter" }, { status: 400 });
  }

  const startTime = Date.now();
  let result: TestSuiteResult;

  try {
    switch (suite) {
      case "db-connection":
        result = await testDbConnection();
        break;
      case "design-crud":
        result = await testDesignCrud();
        break;
      case "email-template-crud":
        result = await testEmailTemplateCrud();
        break;
      case "email-campaign-crud":
        result = await testEmailCampaignCrud();
        break;
      case "video-project-crud":
        result = await testVideoProjectCrud();
        break;
      case "content-pipeline-crud":
        result = await testContentPipelineCrud();
        break;
      case "pdf-guide-crud":
        result = await testPdfGuideCrud();
        break;
      case "brand-provider":
        result = await testBrandProvider();
        break;
      case "brand-kit":
        result = await testBrandKit();
        break;
      case "svg-exporter":
        result = await testSvgExporter();
        break;
      case "content-engine-imports":
        result = await testContentEngineImports();
        break;
      case "seo-standards":
        result = await testSeoStandards();
        break;
      case "site-config":
        result = await testSiteConfig();
        break;
      case "html-sanitizer":
        result = await testHtmlSanitizer();
        break;
      case "pre-pub-gate":
        result = await testPrePubGate();
        break;
      case "distribution":
        result = await testDistribution();
        break;
      default:
        return NextResponse.json({ error: `Unknown suite: ${suite}` }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    result = {
      suite,
      passed: false,
      tests: [{ name: "Suite execution", passed: false, error: msg, fix: "Check server logs for the full stack trace" }],
      duration: Date.now() - startTime,
      error: msg,
      stack,
    };
  }

  result.duration = Date.now() - startTime;
  return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// Fix Issues Handler — executes migration SQL directly via Prisma raw queries
// ---------------------------------------------------------------------------

// Each missing table's CREATE TABLE + indexes + foreign keys as SQL statements.
// Uses IF NOT EXISTS so it's safe to re-run.
const DESIGN_SYSTEM_MIGRATION_SQL: Record<string, string[]> = {
  designs: [
    `CREATE TABLE IF NOT EXISTS "designs" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "type" TEXT NOT NULL,
      "category" TEXT,
      "site" TEXT NOT NULL,
      "canvasData" JSONB NOT NULL DEFAULT '{}',
      "thumbnail" TEXT,
      "exportedUrls" JSONB,
      "width" INTEGER NOT NULL DEFAULT 1200,
      "height" INTEGER NOT NULL DEFAULT 630,
      "tags" TEXT[],
      "isTemplate" BOOLEAN NOT NULL DEFAULT false,
      "templateId" TEXT,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "createdBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "designs_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "designs_site_type_idx" ON "designs"("site", "type")`,
    `CREATE INDEX IF NOT EXISTS "designs_status_idx" ON "designs"("status")`,
    `CREATE INDEX IF NOT EXISTS "designs_isTemplate_idx" ON "designs"("isTemplate")`,
    `CREATE INDEX IF NOT EXISTS "designs_createdAt_idx" ON "designs"("createdAt")`,
  ],
  pdf_guides: [
    `CREATE TABLE IF NOT EXISTS "pdf_guides" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
      "title" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "description" TEXT,
      "site" TEXT NOT NULL,
      "style" TEXT NOT NULL DEFAULT 'modern',
      "language" TEXT NOT NULL DEFAULT 'en',
      "contentSections" JSONB NOT NULL DEFAULT '[]',
      "htmlContent" TEXT,
      "pdfUrl" TEXT,
      "coverDesignId" TEXT,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "price" DOUBLE PRECISION DEFAULT 0,
      "isGated" BOOLEAN NOT NULL DEFAULT false,
      "downloads" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "pdf_guides_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "pdf_guides_slug_key" ON "pdf_guides"("slug")`,
    `CREATE INDEX IF NOT EXISTS "pdf_guides_site_idx" ON "pdf_guides"("site")`,
    `CREATE INDEX IF NOT EXISTS "pdf_guides_status_idx" ON "pdf_guides"("status")`,
    `CREATE INDEX IF NOT EXISTS "pdf_guides_slug_idx" ON "pdf_guides"("slug")`,
  ],
  pdf_downloads: [
    `CREATE TABLE IF NOT EXISTS "pdf_downloads" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
      "pdfGuideId" TEXT NOT NULL,
      "leadId" TEXT,
      "email" TEXT,
      "ip" TEXT,
      "userAgent" TEXT,
      "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "pdf_downloads_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "pdf_downloads_pdfGuideId_idx" ON "pdf_downloads"("pdfGuideId")`,
    `CREATE INDEX IF NOT EXISTS "pdf_downloads_email_idx" ON "pdf_downloads"("email")`,
  ],
  email_templates: [
    `CREATE TABLE IF NOT EXISTS "email_templates" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "site" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "subject" TEXT,
      "htmlContent" TEXT NOT NULL DEFAULT '',
      "jsonContent" JSONB,
      "thumbnail" TEXT,
      "isDefault" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "email_templates_site_type_idx" ON "email_templates"("site", "type")`,
    `CREATE INDEX IF NOT EXISTS "email_templates_isDefault_idx" ON "email_templates"("isDefault")`,
  ],
  email_campaigns: [
    `CREATE TABLE IF NOT EXISTS "email_campaigns" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
      "name" TEXT NOT NULL,
      "site" TEXT NOT NULL,
      "templateId" TEXT,
      "subject" TEXT NOT NULL DEFAULT '',
      "htmlContent" TEXT NOT NULL DEFAULT '',
      "recipientCount" INTEGER NOT NULL DEFAULT 0,
      "sentCount" INTEGER NOT NULL DEFAULT 0,
      "openCount" INTEGER NOT NULL DEFAULT 0,
      "clickCount" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "scheduledAt" TIMESTAMP(3),
      "sentAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "email_campaigns_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "email_campaigns_site_idx" ON "email_campaigns"("site")`,
    `CREATE INDEX IF NOT EXISTS "email_campaigns_status_idx" ON "email_campaigns"("status")`,
    `CREATE INDEX IF NOT EXISTS "email_campaigns_scheduledAt_idx" ON "email_campaigns"("scheduledAt")`,
  ],
  video_projects: [
    `CREATE TABLE IF NOT EXISTS "video_projects" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
      "title" TEXT NOT NULL,
      "site" TEXT NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'general',
      "format" TEXT NOT NULL DEFAULT 'landscape',
      "language" TEXT NOT NULL DEFAULT 'en',
      "scenes" JSONB NOT NULL DEFAULT '[]',
      "compositionCode" TEXT,
      "prompt" TEXT,
      "duration" INTEGER NOT NULL DEFAULT 30,
      "fps" INTEGER NOT NULL DEFAULT 30,
      "width" INTEGER NOT NULL DEFAULT 1920,
      "height" INTEGER NOT NULL DEFAULT 1080,
      "thumbnail" TEXT,
      "exportedUrl" TEXT,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "video_projects_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "video_projects_site_idx" ON "video_projects"("site")`,
    `CREATE INDEX IF NOT EXISTS "video_projects_status_idx" ON "video_projects"("status")`,
    `CREATE INDEX IF NOT EXISTS "video_projects_category_idx" ON "video_projects"("category")`,
  ],
  content_pipelines: [
    `CREATE TABLE IF NOT EXISTS "content_pipelines" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
      "site" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'researching',
      "topic" TEXT,
      "language" TEXT NOT NULL DEFAULT 'en',
      "researchData" JSONB,
      "contentAngles" JSONB,
      "scripts" JSONB,
      "analysisData" JSONB,
      "generatedPosts" JSONB,
      "generatedArticleId" TEXT,
      "generatedEmailId" TEXT,
      "generatedVideoIds" JSONB,
      "generatedDesignIds" JSONB,
      "feedForwardApplied" JSONB,
      "createdBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "content_pipelines_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "content_pipelines_site_idx" ON "content_pipelines"("site")`,
    `CREATE INDEX IF NOT EXISTS "content_pipelines_status_idx" ON "content_pipelines"("status")`,
    `CREATE INDEX IF NOT EXISTS "content_pipelines_createdAt_idx" ON "content_pipelines"("createdAt")`,
  ],
  content_performance: [
    `CREATE TABLE IF NOT EXISTS "content_performance" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
      "pipelineId" TEXT NOT NULL,
      "platform" TEXT NOT NULL,
      "contentType" TEXT NOT NULL,
      "postUrl" TEXT,
      "publishedAt" TIMESTAMP(3),
      "impressions" INTEGER NOT NULL DEFAULT 0,
      "engagements" INTEGER NOT NULL DEFAULT 0,
      "clicks" INTEGER NOT NULL DEFAULT 0,
      "shares" INTEGER NOT NULL DEFAULT 0,
      "saves" INTEGER NOT NULL DEFAULT 0,
      "comments" INTEGER NOT NULL DEFAULT 0,
      "conversionRate" DOUBLE PRECISION,
      "grade" TEXT,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "content_performance_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "content_performance_pipelineId_idx" ON "content_performance"("pipelineId")`,
    `CREATE INDEX IF NOT EXISTS "content_performance_platform_idx" ON "content_performance"("platform")`,
    `CREATE INDEX IF NOT EXISTS "content_performance_grade_idx" ON "content_performance"("grade")`,
  ],
};

// Foreign keys — applied after all tables exist
const FOREIGN_KEY_SQL = [
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pdf_downloads_pdfGuideId_fkey') THEN
      ALTER TABLE "pdf_downloads" ADD CONSTRAINT "pdf_downloads_pdfGuideId_fkey"
        FOREIGN KEY ("pdfGuideId") REFERENCES "pdf_guides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_performance_pipelineId_fkey') THEN
      ALTER TABLE "content_performance" ADD CONSTRAINT "content_performance_pipelineId_fkey"
        FOREIGN KEY ("pipelineId") REFERENCES "content_pipelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END $$`,
];

async function handleFixIssues(): Promise<NextResponse> {
  const steps: Array<{ step: string; status: "pass" | "fail" | "skip"; message: string; duration: number }> = [];
  const overallStart = Date.now();

  // Step 1: Check which tables are missing
  const requiredTables = Object.keys(DESIGN_SYSTEM_MIGRATION_SQL);
  let missingBefore: string[] = [];

  try {
    const { prisma } = await import("@/lib/db");
    const t0 = Date.now();
    const tables: Array<{ tablename: string }> = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    const existing = tables.map((t) => t.tablename);
    missingBefore = requiredTables.filter((t) => !existing.includes(t));
    if (missingBefore.length === 0) {
      steps.push({ step: "Check missing tables", status: "pass", message: "All 8 design system tables already exist — nothing to fix", duration: Date.now() - t0 });
      return NextResponse.json({ success: true, steps, duration: Date.now() - overallStart, tablesFixed: 0 });
    }
    steps.push({ step: "Check missing tables", status: "fail", message: `Missing ${missingBefore.length}: ${missingBefore.join(", ")}`, duration: Date.now() - t0 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ step: "Check missing tables", status: "fail", message: `Cannot query database: ${msg}`, duration: 0 });
    return NextResponse.json({ success: false, steps, duration: Date.now() - overallStart, tablesFixed: 0 });
  }

  // Step 2: Create missing tables + indexes via raw SQL
  const created: string[] = [];
  const errors: string[] = [];

  try {
    const { prisma } = await import("@/lib/db");
    const t0 = Date.now();

    for (const tableName of missingBefore) {
      const statements = DESIGN_SYSTEM_MIGRATION_SQL[tableName];
      if (!statements) continue;

      try {
        for (const sql of statements) {
          await prisma.$executeRawUnsafe(sql);
        }
        created.push(tableName);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${tableName}: ${msg.split("\n")[0]}`);
      }
    }

    if (created.length > 0) {
      steps.push({
        step: `Create tables (${created.length}/${missingBefore.length})`,
        status: errors.length === 0 ? "pass" : "fail",
        message: `Created: ${created.join(", ")}${errors.length > 0 ? ` | Errors: ${errors.join("; ")}` : ""}`,
        duration: Date.now() - t0,
      });
    } else {
      steps.push({
        step: "Create tables",
        status: "fail",
        message: `No tables created. Errors: ${errors.join("; ")}`,
        duration: Date.now() - t0,
      });
      return NextResponse.json({ success: false, steps, duration: Date.now() - overallStart, tablesFixed: 0 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ step: "Create tables", status: "fail", message: msg, duration: 0 });
    return NextResponse.json({ success: false, steps, duration: Date.now() - overallStart, tablesFixed: 0 });
  }

  // Step 3: Apply foreign keys
  try {
    const { prisma } = await import("@/lib/db");
    const t0 = Date.now();
    const fkErrors: string[] = [];

    for (const sql of FOREIGN_KEY_SQL) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        fkErrors.push(msg.split("\n")[0]);
      }
    }

    steps.push({
      step: "Apply foreign keys",
      status: fkErrors.length === 0 ? "pass" : "skip",
      message: fkErrors.length === 0 ? "2 foreign keys applied" : `Partial: ${fkErrors.join("; ")}`,
      duration: Date.now() - t0,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ step: "Apply foreign keys", status: "skip", message: msg.split("\n")[0], duration: 0 });
  }

  // Step 4: Verify tables now exist
  try {
    const { prisma } = await import("@/lib/db");
    const t0 = Date.now();
    const tables: Array<{ tablename: string }> = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    const existing = tables.map((t) => t.tablename);
    const stillMissing = requiredTables.filter((t) => !existing.includes(t));
    const fixed = missingBefore.filter((t) => existing.includes(t));
    if (stillMissing.length === 0) {
      steps.push({ step: "Verify tables", status: "pass", message: `All 8 tables confirmed. Created: ${fixed.join(", ")}`, duration: Date.now() - t0 });
    } else {
      steps.push({ step: "Verify tables", status: "fail", message: `Still missing: ${stillMissing.join(", ")}`, duration: Date.now() - t0 });
    }
    return NextResponse.json({ success: stillMissing.length === 0, steps, duration: Date.now() - overallStart, tablesFixed: fixed.length, stillMissing });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ step: "Verify tables", status: "fail", message: msg, duration: 0 });
    return NextResponse.json({ success: false, steps, duration: Date.now() - overallStart, tablesFixed: 0 });
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  fix?: string;
  data?: unknown;
}

interface TestSuiteResult {
  suite: string;
  passed: boolean;
  tests: TestResult[];
  duration: number;
  error?: string;
  stack?: string;
}

function suiteResult(suite: string, tests: TestResult[]): TestSuiteResult {
  return {
    suite,
    passed: tests.every((t) => t.passed),
    tests,
    duration: 0,
  };
}

// ---------------------------------------------------------------------------
// 1. Database Connection
// ---------------------------------------------------------------------------
async function testDbConnection(): Promise<TestSuiteResult> {
  const tests: TestResult[] = [];

  // Test 1: Import prisma
  try {
    const { prisma } = await import("@/lib/db");
    tests.push({ name: "Import @/lib/db", passed: true, data: { type: typeof prisma } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "Import @/lib/db",
      passed: false,
      error: msg,
      fix: "Check that lib/db.ts exports a prisma instance. Verify DATABASE_URL env var is set.",
    });
    return suiteResult("db-connection", tests);
  }

  // Test 2: Raw query
  try {
    const { prisma } = await import("@/lib/db");
    const result = await prisma.$queryRaw`SELECT 1 as ok`;
    tests.push({ name: "Raw SQL query (SELECT 1)", passed: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "Raw SQL query (SELECT 1)",
      passed: false,
      error: msg,
      fix: "Database connection failed. Check DATABASE_URL, ensure Supabase is running, and verify network access from Vercel.",
    });
  }

  // Test 3: Check tables exist
  try {
    const { prisma } = await import("@/lib/db");
    const tables: Array<{ tablename: string }> = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `;
    const tableNames = tables.map((t) => t.tablename);
    const requiredTables = [
      "designs",
      "pdf_guides",
      "pdf_downloads",
      "email_templates",
      "email_campaigns",
      "video_projects",
      "content_pipelines",
      "content_performance",
    ];
    const missing = requiredTables.filter((t) => !tableNames.includes(t));
    if (missing.length > 0) {
      tests.push({
        name: "Design system tables exist",
        passed: false,
        error: `Missing tables: ${missing.join(", ")}`,
        fix: `Run prisma migration: npx prisma migrate deploy. The migration at prisma/migrations/20260220170000_add_design_system_models/ needs to be applied.`,
        data: { found: tableNames.length, missing },
      });
    } else {
      tests.push({
        name: "Design system tables exist",
        passed: true,
        data: { found: tableNames.length, designTables: requiredTables },
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "Design system tables exist", passed: false, error: msg, fix: "Check database connection and permissions." });
  }

  return suiteResult("db-connection", tests);
}

// ---------------------------------------------------------------------------
// 2. Design CRUD
// ---------------------------------------------------------------------------
async function testDesignCrud(): Promise<TestSuiteResult> {
  const tests: TestResult[] = [];
  const { prisma } = await import("@/lib/db");
  let createdId = "";

  // CREATE
  try {
    const design = await prisma.design.create({
      data: {
        title: "__test_design__",
        type: "banner",
        site: "yalla-london",
        canvasData: { nodes: [], version: 1 },
        width: 1200,
        height: 630,
        status: "draft",
      },
    });
    createdId = design.id;
    tests.push({ name: "CREATE Design", passed: true, data: { id: design.id, title: design.title } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "CREATE Design",
      passed: false,
      error: msg,
      fix: "Check that the 'designs' table exists and all required fields (title, type, site, canvasData, width, height) are provided. Run: npx prisma migrate deploy",
    });
    return suiteResult("design-crud", tests);
  }

  // READ
  try {
    const found = await prisma.design.findUnique({ where: { id: createdId } });
    tests.push({
      name: "READ Design",
      passed: !!found,
      error: found ? undefined : "Record not found after creation",
      fix: found ? undefined : "The record was created but cannot be read back. Check database consistency.",
      data: found ? { id: found.id, status: found.status } : undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "READ Design", passed: false, error: msg, fix: "Check database read permissions." });
  }

  // UPDATE
  try {
    const updated = await prisma.design.update({
      where: { id: createdId },
      data: { title: "__test_design_updated__", status: "published" },
    });
    tests.push({
      name: "UPDATE Design",
      passed: updated.title === "__test_design_updated__" && updated.status === "published",
      data: { title: updated.title, status: updated.status },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "UPDATE Design", passed: false, error: msg, fix: "Check database write permissions." });
  }

  // DELETE
  try {
    await prisma.design.delete({ where: { id: createdId } });
    const gone = await prisma.design.findUnique({ where: { id: createdId } });
    tests.push({
      name: "DELETE Design",
      passed: !gone,
      error: gone ? "Record still exists after delete" : undefined,
      fix: gone ? "Delete operation did not remove the record. Check database constraints." : undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "DELETE Design", passed: false, error: msg, fix: "Check database delete permissions or foreign key constraints." });
  }

  return suiteResult("design-crud", tests);
}

// ---------------------------------------------------------------------------
// 3. Email Template CRUD
// ---------------------------------------------------------------------------
async function testEmailTemplateCrud(): Promise<TestSuiteResult> {
  const tests: TestResult[] = [];
  const { prisma } = await import("@/lib/db");
  let createdId = "";

  try {
    const rec = await prisma.emailTemplate.create({
      data: {
        name: "__test_email_template__",
        site: "yalla-london",
        type: "newsletter",
        htmlContent: "<h1>Test</h1>",
      },
    });
    createdId = rec.id;
    tests.push({ name: "CREATE EmailTemplate", passed: true, data: { id: rec.id } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "CREATE EmailTemplate",
      passed: false,
      error: msg,
      fix: "Check that the 'email_templates' table exists. Required fields: name, site, type, htmlContent. Run: npx prisma migrate deploy",
    });
    return suiteResult("email-template-crud", tests);
  }

  try {
    const found = await prisma.emailTemplate.findUnique({ where: { id: createdId } });
    tests.push({ name: "READ EmailTemplate", passed: !!found, data: found ? { id: found.id, name: found.name } : undefined });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "READ EmailTemplate", passed: false, error: msg });
  }

  try {
    const updated = await prisma.emailTemplate.update({ where: { id: createdId }, data: { name: "__test_updated__" } });
    tests.push({ name: "UPDATE EmailTemplate", passed: updated.name === "__test_updated__", data: { name: updated.name } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "UPDATE EmailTemplate", passed: false, error: msg });
  }

  try {
    await prisma.emailTemplate.delete({ where: { id: createdId } });
    tests.push({ name: "DELETE EmailTemplate", passed: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "DELETE EmailTemplate", passed: false, error: msg });
  }

  return suiteResult("email-template-crud", tests);
}

// ---------------------------------------------------------------------------
// 4. Email Campaign CRUD
// ---------------------------------------------------------------------------
async function testEmailCampaignCrud(): Promise<TestSuiteResult> {
  const tests: TestResult[] = [];
  const { prisma } = await import("@/lib/db");
  let createdId = "";

  try {
    const rec = await prisma.emailCampaign.create({
      data: {
        name: "__test_campaign__",
        site: "yalla-london",
        subject: "Test Subject",
        htmlContent: "<p>Test campaign</p>",
      },
    });
    createdId = rec.id;
    tests.push({ name: "CREATE EmailCampaign", passed: true, data: { id: rec.id } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "CREATE EmailCampaign",
      passed: false,
      error: msg,
      fix: "Check that the 'email_campaigns' table exists. Required fields: name, site, subject, htmlContent. Run: npx prisma migrate deploy",
    });
    return suiteResult("email-campaign-crud", tests);
  }

  try {
    const found = await prisma.emailCampaign.findUnique({ where: { id: createdId } });
    tests.push({ name: "READ EmailCampaign", passed: !!found, data: found ? { id: found.id, status: found.status } : undefined });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "READ EmailCampaign", passed: false, error: msg });
  }

  try {
    const updated = await prisma.emailCampaign.update({ where: { id: createdId }, data: { subject: "Updated Subject" } });
    tests.push({ name: "UPDATE EmailCampaign", passed: updated.subject === "Updated Subject", data: { subject: updated.subject } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "UPDATE EmailCampaign", passed: false, error: msg });
  }

  try {
    await prisma.emailCampaign.delete({ where: { id: createdId } });
    tests.push({ name: "DELETE EmailCampaign", passed: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "DELETE EmailCampaign", passed: false, error: msg });
  }

  return suiteResult("email-campaign-crud", tests);
}

// ---------------------------------------------------------------------------
// 5. Video Project CRUD
// ---------------------------------------------------------------------------
async function testVideoProjectCrud(): Promise<TestSuiteResult> {
  const tests: TestResult[] = [];
  const { prisma } = await import("@/lib/db");
  let createdId = "";

  try {
    const rec = await prisma.videoProject.create({
      data: {
        title: "__test_video__",
        site: "yalla-london",
        category: "destination-highlight",
        format: "instagram-reel",
        scenes: [{ text: "Test scene", duration: 3 }],
        duration: 30,
        width: 1080,
        height: 1920,
      },
    });
    createdId = rec.id;
    tests.push({ name: "CREATE VideoProject", passed: true, data: { id: rec.id } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "CREATE VideoProject",
      passed: false,
      error: msg,
      fix: "Check that the 'video_projects' table exists. Required fields: title, site, category, format, scenes (Json), duration, width, height. Run: npx prisma migrate deploy",
    });
    return suiteResult("video-project-crud", tests);
  }

  try {
    const found = await prisma.videoProject.findUnique({ where: { id: createdId } });
    tests.push({ name: "READ VideoProject", passed: !!found, data: found ? { id: found.id, status: found.status } : undefined });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "READ VideoProject", passed: false, error: msg });
  }

  try {
    const updated = await prisma.videoProject.update({ where: { id: createdId }, data: { title: "__test_video_updated__" } });
    tests.push({ name: "UPDATE VideoProject", passed: updated.title === "__test_video_updated__", data: { title: updated.title } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "UPDATE VideoProject", passed: false, error: msg });
  }

  try {
    await prisma.videoProject.delete({ where: { id: createdId } });
    tests.push({ name: "DELETE VideoProject", passed: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "DELETE VideoProject", passed: false, error: msg });
  }

  return suiteResult("video-project-crud", tests);
}

// ---------------------------------------------------------------------------
// 6. Content Pipeline CRUD
// ---------------------------------------------------------------------------
async function testContentPipelineCrud(): Promise<TestSuiteResult> {
  const tests: TestResult[] = [];
  const { prisma } = await import("@/lib/db");
  let createdId = "";

  try {
    const rec = await prisma.contentPipeline.create({
      data: {
        site: "yalla-london",
        status: "researching",
        topic: "__test_pipeline__",
      },
    });
    createdId = rec.id;
    tests.push({ name: "CREATE ContentPipeline", passed: true, data: { id: rec.id, status: rec.status } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "CREATE ContentPipeline",
      passed: false,
      error: msg,
      fix: "Check that the 'content_pipelines' table exists. Required: site. Defaults: status='researching', language='en'. Run: npx prisma migrate deploy",
    });
    return suiteResult("content-pipeline-crud", tests);
  }

  // READ with relation
  try {
    const found = await prisma.contentPipeline.findUnique({
      where: { id: createdId },
      include: { performance: true },
    });
    tests.push({
      name: "READ ContentPipeline (with performance relation)",
      passed: !!found && Array.isArray(found.performance),
      data: found ? { id: found.id, performanceCount: found.performance.length } : undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "READ ContentPipeline (with performance relation)",
      passed: false,
      error: msg,
      fix: "The ContentPipeline → ContentPerformance relation may be broken. Check schema and re-run migrations.",
    });
  }

  // CREATE ContentPerformance (child)
  try {
    const perf = await prisma.contentPerformance.create({
      data: {
        pipelineId: createdId,
        platform: "blog",
        contentType: "article",
      },
    });
    tests.push({ name: "CREATE ContentPerformance (child)", passed: true, data: { id: perf.id } });

    // Clean up child
    await prisma.contentPerformance.delete({ where: { id: perf.id } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "CREATE ContentPerformance (child)",
      passed: false,
      error: msg,
      fix: "Check that the 'content_performance' table exists and the pipelineId foreign key works. Run: npx prisma migrate deploy",
    });
  }

  // UPDATE pipeline status through stages
  try {
    const stages = ["ideating", "scripting", "analyzing", "complete"];
    for (const status of stages) {
      await prisma.contentPipeline.update({ where: { id: createdId }, data: { status } });
    }
    const final = await prisma.contentPipeline.findUnique({ where: { id: createdId } });
    tests.push({
      name: "UPDATE ContentPipeline (status transitions)",
      passed: final?.status === "complete",
      data: { finalStatus: final?.status, stagesTested: stages },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "UPDATE ContentPipeline (status transitions)", passed: false, error: msg });
  }

  // DELETE
  try {
    await prisma.contentPipeline.delete({ where: { id: createdId } });
    tests.push({ name: "DELETE ContentPipeline", passed: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "DELETE ContentPipeline", passed: false, error: msg });
  }

  return suiteResult("content-pipeline-crud", tests);
}

// ---------------------------------------------------------------------------
// 7. PDF Guide CRUD
// ---------------------------------------------------------------------------
async function testPdfGuideCrud(): Promise<TestSuiteResult> {
  const tests: TestResult[] = [];
  const { prisma } = await import("@/lib/db");
  let createdId = "";
  const testSlug = `__test_pdf_${Date.now()}`;

  try {
    const rec = await prisma.pdfGuide.create({
      data: {
        title: "__test_pdf_guide__",
        slug: testSlug,
        site: "yalla-london",
        style: "luxury",
        contentSections: [{ heading: "Test Section", body: "Test body content" }],
      },
    });
    createdId = rec.id;
    tests.push({ name: "CREATE PdfGuide", passed: true, data: { id: rec.id, slug: rec.slug } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "CREATE PdfGuide",
      passed: false,
      error: msg,
      fix: "Check that the 'pdf_guides' table exists. Required: title, slug (unique), site, style, contentSections (Json). Run: npx prisma migrate deploy",
    });
    return suiteResult("pdf-guide-crud", tests);
  }

  // CREATE PdfDownload (child)
  try {
    const dl = await prisma.pdfDownload.create({
      data: {
        pdfGuideId: createdId,
        email: "test@test.com",
      },
    });
    tests.push({ name: "CREATE PdfDownload (child)", passed: true, data: { id: dl.id } });
    await prisma.pdfDownload.delete({ where: { id: dl.id } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "CREATE PdfDownload (child)",
      passed: false,
      error: msg,
      fix: "Check 'pdf_downloads' table and pdfGuideId foreign key.",
    });
  }

  // READ with relation
  try {
    const found = await prisma.pdfGuide.findUnique({
      where: { id: createdId },
      include: { pdfDownloads: true },
    });
    tests.push({
      name: "READ PdfGuide (with downloads relation)",
      passed: !!found && Array.isArray(found.pdfDownloads),
      data: found ? { id: found.id, downloadsCount: found.pdfDownloads.length } : undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "READ PdfGuide (with downloads relation)", passed: false, error: msg });
  }

  // DELETE
  try {
    await prisma.pdfGuide.delete({ where: { id: createdId } });
    tests.push({ name: "DELETE PdfGuide", passed: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "DELETE PdfGuide", passed: false, error: msg });
  }

  return suiteResult("pdf-guide-crud", tests);
}

// ---------------------------------------------------------------------------
// 8. Brand Provider
// ---------------------------------------------------------------------------
async function testBrandProvider(): Promise<TestSuiteResult> {
  const tests: TestResult[] = [];

  try {
    const { getBrandProfile, getAllBrandProfiles } = await import("@/lib/design/brand-provider");
    tests.push({ name: "Import brand-provider", passed: true });

    const allProfiles = getAllBrandProfiles();
    tests.push({
      name: "getAllBrandProfiles() returns profiles",
      passed: allProfiles.length > 0,
      data: { count: allProfiles.length, siteIds: allProfiles.map((p) => p.siteId) },
      error: allProfiles.length === 0 ? "No brand profiles returned" : undefined,
      fix: allProfiles.length === 0 ? "Check that config/sites.ts has active sites configured and destination-themes.ts exports themes." : undefined,
    });

    // Test each site
    const siteIds = ["yalla-london", "arabaldives", "french-riviera", "istanbul", "thailand"];
    for (const siteId of siteIds) {
      try {
        const profile = getBrandProfile(siteId);
        const hasColors = profile.colors && Object.keys(profile.colors).length > 0;
        const hasFonts = profile.fonts && Object.keys(profile.fonts).length > 0;
        tests.push({
          name: `getBrandProfile("${siteId}")`,
          passed: !!profile && hasColors && hasFonts,
          data: {
            siteId: profile.siteId,
            siteName: profile.name,
            colorCount: Object.keys(profile.colors || {}).length,
            hasFonts,
          },
          error: !hasColors ? "Missing colors" : !hasFonts ? "Missing fonts" : undefined,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        tests.push({
          name: `getBrandProfile("${siteId}")`,
          passed: false,
          error: msg,
          fix: `Site "${siteId}" not found in brand-provider. Check config/sites.ts and lib/design/destination-themes.ts.`,
        });
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "Import brand-provider",
      passed: false,
      error: msg,
      fix: "Cannot import @/lib/design/brand-provider. Check the file exists and exports getBrandProfile/getAllBrandProfiles.",
    });
  }

  return suiteResult("brand-provider", tests);
}

// ---------------------------------------------------------------------------
// 9. Brand Kit Generator
// ---------------------------------------------------------------------------
async function testBrandKit(): Promise<TestSuiteResult> {
  const tests: TestResult[] = [];

  try {
    const { generateBrandKit } = await import("@/lib/design/brand-kit-generator");
    tests.push({ name: "Import brand-kit-generator", passed: true });

    const kit = generateBrandKit("yalla-london");
    const hasColors = kit.colorPalette && kit.colorPalette.length > 0;
    const hasTypography = kit.typography && kit.typography.length > 0;
    tests.push({
      name: "generateBrandKit('yalla-london')",
      passed: !!kit && hasColors,
      data: {
        hasColors,
        hasTypography,
        keys: Object.keys(kit),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "Import brand-kit-generator",
      passed: false,
      error: msg,
      fix: "Cannot import @/lib/design/brand-kit-generator. Check the file exists and exports generateBrandKit.",
    });
  }

  return suiteResult("brand-kit", tests);
}

// ---------------------------------------------------------------------------
// 10. SVG Exporter
// ---------------------------------------------------------------------------
async function testSvgExporter(): Promise<TestSuiteResult> {
  const tests: TestResult[] = [];

  try {
    const { konvaToSvg, svgToDataUrl } = await import("@/lib/design/svg-exporter");
    tests.push({ name: "Import svg-exporter", passed: true });

    // Test with a simple Konva-like stage object
    const testStage = {
      attrs: { width: 200, height: 100 },
      children: [
        {
          attrs: {},
          children: [
            {
              className: "Rect",
              attrs: { x: 0, y: 0, width: 200, height: 100, fill: "#FF0000" },
            },
            {
              className: "Text",
              attrs: { x: 10, y: 10, text: "Hello", fontSize: 16, fill: "#FFFFFF" },
            },
          ],
        },
      ],
    };

    const svg = konvaToSvg(testStage, 200, 100);
    const isSvg = svg.includes("<svg") && svg.includes("</svg>");
    tests.push({
      name: "konvaToSvg() produces valid SVG",
      passed: isSvg,
      data: { length: svg.length, preview: svg.substring(0, 100) + "..." },
      error: isSvg ? undefined : "Output does not contain valid SVG tags",
    });

    if (isSvg) {
      const dataUrl = svgToDataUrl(svg);
      tests.push({
        name: "svgToDataUrl() produces data URL",
        passed: dataUrl.startsWith("data:image/svg+xml"),
        data: { prefix: dataUrl.substring(0, 30) },
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "Import svg-exporter",
      passed: false,
      error: msg,
      fix: "Cannot import @/lib/design/svg-exporter. Check the file exists and exports konvaToSvg/svgToDataUrl.",
    });
  }

  return suiteResult("svg-exporter", tests);
}

// ---------------------------------------------------------------------------
// 11. Content Engine Imports
// ---------------------------------------------------------------------------
async function testContentEngineImports(): Promise<TestSuiteResult> {
  const tests: TestResult[] = [];

  // NOTE: Each import MUST be a literal string — Next.js/webpack cannot resolve
  // dynamic imports with variable paths (they get excluded from the bundle).

  // Agent 1: Researcher
  try {
    const mod = await import("@/lib/content-engine/researcher");
    const hasFn = typeof mod.runResearcher === "function";
    tests.push({
      name: "Import @/lib/content-engine/researcher → runResearcher",
      passed: hasFn,
      data: { exported: Object.keys(mod), hasFn },
      error: hasFn ? undefined : "Module loaded but runResearcher is not exported as a function",
      fix: hasFn ? undefined : "Check that @/lib/content-engine/researcher exports runResearcher",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "Import @/lib/content-engine/researcher → runResearcher", passed: false, error: msg, fix: "Module failed to import. Check file exists, compiles, and all dependencies are installed." });
  }

  // Agent 2: Ideator
  try {
    const mod = await import("@/lib/content-engine/ideator");
    const hasFn = typeof mod.runIdeator === "function";
    tests.push({
      name: "Import @/lib/content-engine/ideator → runIdeator",
      passed: hasFn,
      data: { exported: Object.keys(mod), hasFn },
      error: hasFn ? undefined : "Module loaded but runIdeator is not exported as a function",
      fix: hasFn ? undefined : "Check that @/lib/content-engine/ideator exports runIdeator",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "Import @/lib/content-engine/ideator → runIdeator", passed: false, error: msg, fix: "Module failed to import. Check file exists, compiles, and all dependencies are installed." });
  }

  // Agent 3: Scripter
  try {
    const mod = await import("@/lib/content-engine/scripter");
    const hasFn = typeof mod.runScripter === "function";
    tests.push({
      name: "Import @/lib/content-engine/scripter → runScripter",
      passed: hasFn,
      data: { exported: Object.keys(mod), hasFn },
      error: hasFn ? undefined : "Module loaded but runScripter is not exported as a function",
      fix: hasFn ? undefined : "Check that @/lib/content-engine/scripter exports runScripter",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "Import @/lib/content-engine/scripter → runScripter", passed: false, error: msg, fix: "Module failed to import. Check file exists, compiles, and all dependencies are installed." });
  }

  // Agent 4: Analyst
  try {
    const mod = await import("@/lib/content-engine/analyst");
    const hasFn = typeof mod.runAnalyst === "function";
    tests.push({
      name: "Import @/lib/content-engine/analyst → runAnalyst",
      passed: hasFn,
      data: { exported: Object.keys(mod), hasFn },
      error: hasFn ? undefined : "Module loaded but runAnalyst is not exported as a function",
      fix: hasFn ? undefined : "Check that @/lib/content-engine/analyst exports runAnalyst",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "Import @/lib/content-engine/analyst → runAnalyst", passed: false, error: msg, fix: "Module failed to import. Check file exists, compiles, and all dependencies are installed." });
  }

  // Test social scheduler
  try {
    const mod = await import("@/lib/social/scheduler");
    const hasFn = typeof mod.getScheduledPosts === "function";
    tests.push({
      name: "Import @/lib/social/scheduler → getScheduledPosts",
      passed: hasFn,
      data: { exported: Object.keys(mod) },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "Import @/lib/social/scheduler → getScheduledPosts",
      passed: false,
      error: msg,
      fix: "Module @/lib/social/scheduler failed to import.",
    });
  }

  return suiteResult("content-engine-imports", tests);
}

// ---------------------------------------------------------------------------
// 12. SEO Standards
// ---------------------------------------------------------------------------
async function testSeoStandards(): Promise<TestSuiteResult> {
  const tests: TestResult[] = [];

  try {
    const mod = await import("@/lib/seo/standards");
    tests.push({ name: "Import @/lib/seo/standards", passed: true });

    // Version check
    tests.push({
      name: "STANDARDS_VERSION is set",
      passed: !!mod.STANDARDS_VERSION,
      data: { version: mod.STANDARDS_VERSION, source: mod.STANDARDS_SOURCE },
    });

    // Content quality thresholds
    const cq = mod.CONTENT_QUALITY;
    tests.push({
      name: "CONTENT_QUALITY thresholds are correct",
      passed: cq.minWords >= 1000 && cq.qualityGateScore >= 70 && cq.metaDescriptionMin >= 120,
      data: { minWords: cq.minWords, qualityGateScore: cq.qualityGateScore, metaDescriptionMin: cq.metaDescriptionMin },
      error:
        cq.minWords < 1000 ? "minWords should be >= 1000" :
        cq.qualityGateScore < 70 ? "qualityGateScore should be >= 70" :
        cq.metaDescriptionMin < 120 ? "metaDescriptionMin should be >= 120" : undefined,
      fix: "Update lib/seo/standards.ts to match CLAUDE.md quality gates.",
    });

    // Core Web Vitals
    const cwv = mod.CORE_WEB_VITALS;
    tests.push({
      name: "CORE_WEB_VITALS are defined",
      passed: !!cwv && !!cwv.lcp && !!cwv.inp && !!cwv.cls,
      data: cwv,
    });

    // E-E-A-T
    const eeat = mod.EEAT_REQUIREMENTS;
    tests.push({
      name: "EEAT_REQUIREMENTS includes Jan 2026 authenticity flags",
      passed: !!eeat && eeat.experienceIsDominant === true && eeat.requireFirstHandSignals === true,
      data: { experienceIsDominant: eeat?.experienceIsDominant, requireFirstHandSignals: eeat?.requireFirstHandSignals },
      error: !eeat?.experienceIsDominant ? "experienceIsDominant should be true (Jan 2026 Authenticity Update)" : undefined,
    });

    // Schema deprecation
    const faqDeprecated = mod.isSchemaDeprecated("FAQPage");
    const articleNotDeprecated = !mod.isSchemaDeprecated("Article");
    tests.push({
      name: "Schema deprecation checker works",
      passed: faqDeprecated && articleNotDeprecated,
      data: { FAQPageDeprecated: faqDeprecated, ArticleNotDeprecated: articleNotDeprecated },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "Import @/lib/seo/standards",
      passed: false,
      error: msg,
      fix: "Cannot import @/lib/seo/standards. Check the file exists.",
    });
  }

  return suiteResult("seo-standards", tests);
}

// ---------------------------------------------------------------------------
// 13. Site Config
// ---------------------------------------------------------------------------
async function testSiteConfig(): Promise<TestSuiteResult> {
  const tests: TestResult[] = [];

  try {
    const { getActiveSiteIds, getDefaultSiteId, getDefaultSiteName, getSiteConfig, getSiteDomain } = await import("@/config/sites");
    tests.push({ name: "Import @/config/sites", passed: true });

    const activeIds = getActiveSiteIds();
    tests.push({
      name: "getActiveSiteIds() returns active sites",
      passed: activeIds.length > 0,
      data: { count: activeIds.length, ids: activeIds },
    });

    const defaultId = getDefaultSiteId();
    tests.push({
      name: "getDefaultSiteId() returns a value",
      passed: !!defaultId,
      data: { defaultId },
    });

    const defaultName = getDefaultSiteName();
    tests.push({
      name: "getDefaultSiteName() returns a value",
      passed: !!defaultName,
      data: { defaultName },
    });

    // Test each known site
    const allSites = ["yalla-london", "arabaldives", "french-riviera", "istanbul", "thailand"];
    for (const siteId of allSites) {
      const config = getSiteConfig(siteId);
      const domain = getSiteDomain(siteId);
      tests.push({
        name: `getSiteConfig("${siteId}")`,
        passed: !!config,
        data: config ? { name: config.name, domain, hasSystemPromptEn: !!(config as unknown as Record<string, unknown>).systemPromptEn } : undefined,
        error: config ? undefined : `Site "${siteId}" not found in config/sites.ts`,
        fix: config ? undefined : `Add "${siteId}" to the SITES object in config/sites.ts`,
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "Import @/config/sites",
      passed: false,
      error: msg,
      fix: "Cannot import config/sites. Check the file exists and exports the helper functions.",
    });
  }

  return suiteResult("site-config", tests);
}

// ---------------------------------------------------------------------------
// 14. HTML Sanitizer
// ---------------------------------------------------------------------------
async function testHtmlSanitizer(): Promise<TestSuiteResult> {
  const tests: TestResult[] = [];

  try {
    const { sanitizeHtml, sanitizeSvg } = await import("@/lib/html-sanitizer");
    tests.push({ name: "Import @/lib/html-sanitizer", passed: true });

    // Test XSS removal
    const xssInput = '<p>Hello</p><script>alert("xss")</script><img onerror="hack()" src="x">';
    const sanitized = sanitizeHtml(xssInput);
    const noScript = !sanitized.includes("<script") && !sanitized.includes("onerror");
    const hasP = sanitized.includes("<p>");
    tests.push({
      name: "sanitizeHtml() removes XSS vectors",
      passed: noScript && hasP,
      data: { input: xssInput, output: sanitized, scriptRemoved: noScript, pPreserved: hasP },
      error: !noScript ? "Script tag or event handler was NOT removed — XSS vulnerability!" : undefined,
      fix: !noScript ? "Update lib/html-sanitizer.ts to strip <script> tags and on* event handlers." : undefined,
    });

    // Test SVG sanitization
    const svgInput = '<svg><circle r="10"/><script>hack()</script></svg>';
    const sanitizedSvg = sanitizeSvg(svgInput);
    const svgNoScript = !sanitizedSvg.includes("<script");
    tests.push({
      name: "sanitizeSvg() removes script from SVG",
      passed: svgNoScript,
      data: { input: svgInput, output: sanitizedSvg },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "Import @/lib/html-sanitizer",
      passed: false,
      error: msg,
      fix: "Cannot import @/lib/html-sanitizer. Check the file exists and isomorphic-dompurify is installed.",
    });
  }

  return suiteResult("html-sanitizer", tests);
}

// ---------------------------------------------------------------------------
// 15. Pre-Publication Gate
// ---------------------------------------------------------------------------
async function testPrePubGate(): Promise<TestSuiteResult> {
  const tests: TestResult[] = [];

  try {
    const { runPrePublicationGate } = await import("@/lib/seo/orchestrator/pre-publication-gate");
    tests.push({ name: "Import pre-publication-gate", passed: true, data: { type: typeof runPrePublicationGate } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "Import pre-publication-gate",
      passed: false,
      error: msg,
      fix: "Cannot import @/lib/seo/orchestrator/pre-publication-gate. Check the file exists and exports runPrePublicationGate.",
    });
  }

  return suiteResult("pre-pub-gate", tests);
}

// ---------------------------------------------------------------------------
// 16. Distribution
// ---------------------------------------------------------------------------
async function testDistribution(): Promise<TestSuiteResult> {
  const tests: TestResult[] = [];

  try {
    const { getDistributionTargetsForDesign } = await import("@/lib/design/distribution");
    tests.push({ name: "Import distribution", passed: true });

    const targets = getDistributionTargetsForDesign({ type: "social-post", site: "yalla-london" });
    tests.push({
      name: "getDistributionTargetsForDesign() returns targets",
      passed: Array.isArray(targets) && targets.length > 0,
      data: { count: targets.length, targets },
      error: !targets || targets.length === 0 ? "No distribution targets returned for social-post type" : undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "Import distribution",
      passed: false,
      error: msg,
      fix: "Cannot import @/lib/design/distribution. Check the file exists and exports getDistributionTargetsForDesign.",
    });
  }

  return suiteResult("distribution", tests);
}

// ---------------------------------------------------------------------------
// Login Page
// ---------------------------------------------------------------------------
function buildLoginPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Test Connections — Login</title>
<style>
  :root {
    --bg: #0f1117;
    --card: #1a1d27;
    --border: #2a2d3a;
    --text: #e4e4e7;
    --text2: #9ca3af;
    --fail: #ef4444;
    --gold: #d4a853;
    --navy: #1e3a5f;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
    background: var(--bg);
    color: var(--text);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 20px;
  }
  .login-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 32px 28px;
    width: 100%;
    max-width: 400px;
  }
  .login-card h1 {
    font-size: 20px;
    color: var(--gold);
    margin-bottom: 6px;
  }
  .login-card p {
    color: var(--text2);
    font-size: 13px;
    margin-bottom: 24px;
    line-height: 1.5;
  }
  .field {
    margin-bottom: 16px;
  }
  .field label {
    display: block;
    font-size: 12px;
    color: var(--text2);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .field input {
    width: 100%;
    padding: 12px 14px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-size: 15px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;
  }
  .field input:focus { border-color: var(--gold); }
  .login-btn {
    width: 100%;
    padding: 14px;
    border-radius: 8px;
    border: none;
    background: var(--gold);
    color: var(--bg);
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s;
    margin-top: 8px;
  }
  .login-btn:hover { background: #c4983f; }
  .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .error-msg {
    color: var(--fail);
    font-size: 13px;
    margin-top: 12px;
    display: none;
    text-align: center;
  }
  .divider {
    color: var(--text2);
    font-size: 11px;
    text-align: center;
    margin: 16px 0;
    position: relative;
  }
  .divider::before, .divider::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 35%;
    height: 1px;
    background: var(--border);
  }
  .divider::before { left: 0; }
  .divider::after { right: 0; }
  .admin-hint {
    color: var(--text2);
    font-size: 12px;
    text-align: center;
    margin-top: 16px;
    line-height: 1.5;
  }
</style>
</head>
<body>
<div class="login-card">
  <h1>Test Connections</h1>
  <p>Enter your admin password or cron secret to access the design system test dashboard.</p>
  <form onsubmit="return doLogin(event)">
    <div class="field">
      <label>Password</label>
      <input type="password" id="pw" autocomplete="current-password" placeholder="Admin password or CRON_SECRET" autofocus>
    </div>
    <button class="login-btn" type="submit" id="loginBtn">Sign In</button>
    <div class="error-msg" id="errMsg"></div>
  </form>
  <div class="admin-hint">Already logged into the admin dashboard?<br><a href="" onclick="return tryAdminSession()" style="color:var(--gold)">Continue with admin session</a></div>
</div>
<script>
async function doLogin(e) {
  e.preventDefault();
  const pw = document.getElementById('pw').value.trim();
  if (!pw) return false;
  const btn = document.getElementById('loginBtn');
  const err = document.getElementById('errMsg');
  btn.disabled = true;
  btn.textContent = 'Signing in...';
  err.style.display = 'none';
  try {
    const resp = await fetch(window.location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', password: pw }),
    });
    const data = await resp.json();
    if (data.success) {
      window.location.reload();
    } else {
      err.textContent = data.error || 'Invalid credentials';
      err.style.display = 'block';
    }
  } catch (ex) {
    err.textContent = 'Network error — try again';
    err.style.display = 'block';
  }
  btn.disabled = false;
  btn.textContent = 'Sign In';
  return false;
}
function tryAdminSession() {
  window.location.reload();
  return false;
}
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Test Dashboard Page
// ---------------------------------------------------------------------------
function buildTestPage(): string {
  const suites = [
    { id: "db-connection", label: "Database Connection", icon: "db", desc: "Prisma + Supabase connectivity, tables exist" },
    { id: "design-crud", label: "Design CRUD", icon: "palette", desc: "Create, Read, Update, Delete in designs table" },
    { id: "email-template-crud", label: "Email Template CRUD", icon: "mail", desc: "Create, Read, Update, Delete email templates" },
    { id: "email-campaign-crud", label: "Email Campaign CRUD", icon: "send", desc: "Create, Read, Update, Delete campaigns" },
    { id: "video-project-crud", label: "Video Project CRUD", icon: "video", desc: "Create, Read, Update, Delete video projects" },
    { id: "content-pipeline-crud", label: "Content Pipeline CRUD", icon: "pipe", desc: "Pipeline + ContentPerformance child records" },
    { id: "pdf-guide-crud", label: "PDF Guide CRUD", icon: "pdf", desc: "PDF guides + downloads child records" },
    { id: "brand-provider", label: "Brand Provider", icon: "brand", desc: "Brand profiles for all 5 sites" },
    { id: "brand-kit", label: "Brand Kit Generator", icon: "kit", desc: "Color palettes, typography, templates" },
    { id: "svg-exporter", label: "SVG Exporter", icon: "svg", desc: "Konva canvas → SVG conversion" },
    { id: "content-engine-imports", label: "Content Engine Agents", icon: "robot", desc: "All 4 agents + social scheduler importable" },
    { id: "seo-standards", label: "SEO Standards", icon: "seo", desc: "Thresholds, CWV, E-E-A-T, schema deprecation" },
    { id: "site-config", label: "Site Config", icon: "site", desc: "All 5 sites + helper functions" },
    { id: "html-sanitizer", label: "HTML Sanitizer", icon: "shield", desc: "XSS removal for HTML and SVG" },
    { id: "pre-pub-gate", label: "Pre-Publication Gate", icon: "gate", desc: "13-check SEO quality gate" },
    { id: "distribution", label: "Design Distribution", icon: "share", desc: "Design → social/email/blog routing" },
  ];

  const iconMap: Record<string, string> = {
    db: "&#128450;",      // file cabinet
    palette: "&#127912;", // palette
    mail: "&#9993;",      // envelope
    send: "&#128228;",    // outbox
    video: "&#127909;",   // movie camera
    pipe: "&#9881;",      // gear
    pdf: "&#128196;",     // document
    brand: "&#127912;",   // palette
    kit: "&#128188;",     // briefcase
    svg: "&#9998;",       // pencil
    robot: "&#129302;",   // robot
    seo: "&#128270;",     // magnifier
    site: "&#127760;",    // globe
    shield: "&#128737;",  // shield
    gate: "&#128682;",    // barrier
    share: "&#128257;",   // share
  };

  const suiteBtns = suites
    .map(
      (s) => `
      <div class="suite-card" id="card-${s.id}">
        <div class="suite-header">
          <span class="suite-icon">${iconMap[s.icon] || "&#9679;"}</span>
          <div>
            <div class="suite-label">${s.label}</div>
            <div class="suite-desc">${s.desc}</div>
          </div>
          <div class="suite-status" id="status-${s.id}"></div>
        </div>
        <button class="btn" onclick="runSuite('${s.id}')">Run Test</button>
        <div class="result-area" id="result-${s.id}"></div>
      </div>
    `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Design System — Test Connections</title>
<style>
  :root {
    --bg: #0f1117;
    --card: #1a1d27;
    --border: #2a2d3a;
    --text: #e4e4e7;
    --text2: #9ca3af;
    --pass: #22c55e;
    --fail: #ef4444;
    --warn: #f59e0b;
    --running: #3b82f6;
    --gold: #d4a853;
    --navy: #1e3a5f;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
    background: var(--bg);
    color: var(--text);
    padding: 16px;
    max-width: 900px;
    margin: 0 auto;
  }
  h1 {
    font-size: 22px;
    color: var(--gold);
    margin-bottom: 4px;
  }
  .subtitle {
    color: var(--text2);
    font-size: 13px;
    margin-bottom: 20px;
  }
  .top-bar {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }
  .btn {
    background: var(--navy);
    color: var(--gold);
    border: 1px solid var(--gold);
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s;
  }
  .btn:hover { background: #2a4a6f; }
  .btn:active { transform: scale(0.97); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-big {
    background: var(--gold);
    color: var(--bg);
    font-size: 15px;
    padding: 12px 28px;
  }
  .btn-big:hover { background: #c4983f; }
  .summary-bar {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px 18px;
    margin-bottom: 20px;
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
    align-items: center;
  }
  .summary-item {
    text-align: center;
  }
  .summary-num {
    font-size: 28px;
    font-weight: 700;
  }
  .summary-label {
    font-size: 11px;
    color: var(--text2);
    text-transform: uppercase;
  }
  .suite-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px 18px;
    margin-bottom: 12px;
    transition: border-color 0.3s;
  }
  .suite-card.pass { border-left: 4px solid var(--pass); }
  .suite-card.fail { border-left: 4px solid var(--fail); }
  .suite-card.running { border-left: 4px solid var(--running); }
  .suite-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }
  .suite-icon { font-size: 22px; }
  .suite-label { font-weight: 600; font-size: 14px; }
  .suite-desc { font-size: 12px; color: var(--text2); }
  .suite-status {
    margin-left: auto;
    font-weight: 700;
    font-size: 13px;
  }
  .result-area {
    margin-top: 10px;
    display: none;
  }
  .result-area.visible { display: block; }
  .test-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
  }
  .test-row:last-child { border-bottom: none; }
  .test-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-top: 4px;
    flex-shrink: 0;
  }
  .test-dot.pass { background: var(--pass); }
  .test-dot.fail { background: var(--fail); }
  .test-name { font-weight: 500; }
  .test-error {
    color: var(--fail);
    font-size: 12px;
    margin-top: 4px;
    word-break: break-word;
  }
  .test-fix {
    color: var(--warn);
    font-size: 12px;
    margin-top: 2px;
    word-break: break-word;
  }
  .test-data {
    margin-top: 4px;
  }
  .json-block {
    background: #0d0f14;
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 8px;
    font-size: 11px;
    font-family: 'SFMono-Regular', Consolas, monospace;
    overflow-x: auto;
    max-height: 200px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--text2);
  }
  .duration {
    color: var(--text2);
    font-size: 11px;
    margin-left: auto;
    flex-shrink: 0;
  }
  @media (max-width: 600px) {
    body { padding: 10px; }
    .summary-bar { gap: 16px; }
    .suite-header { flex-wrap: wrap; }
  }
  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid var(--border);
    border-top-color: var(--running);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .btn-fix {
    background: #1a2e1a;
    color: var(--pass);
    border: 1px solid var(--pass);
  }
  .btn-fix:hover { background: #2a4a2a; }
  .btn-fix:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-sm {
    background: var(--card);
    color: var(--text2);
    border: 1px solid var(--border);
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }
  .fix-panel {
    background: var(--card);
    border: 2px solid var(--pass);
    border-radius: 10px;
    padding: 18px;
    margin-bottom: 20px;
  }
  .fix-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }
  .fix-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--pass);
  }
  .fix-step {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
  }
  .fix-step:last-child { border-bottom: none; }
  .fix-step-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .fix-step-icon.pending { background: var(--border); color: var(--text2); }
  .fix-step-icon.running { background: var(--running); color: #fff; }
  .fix-step-icon.pass { background: var(--pass); color: #fff; }
  .fix-step-icon.fail { background: var(--fail); color: #fff; }
  .fix-step-icon.skip { background: var(--warn); color: #fff; }
  .fix-step-name { font-weight: 600; }
  .fix-step-msg {
    color: var(--text2);
    font-size: 12px;
    margin-top: 2px;
    word-break: break-word;
  }
  .fix-step-dur {
    margin-left: auto;
    color: var(--text2);
    font-size: 11px;
    flex-shrink: 0;
  }
  .fix-summary {
    margin-top: 14px;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    text-align: center;
  }
  .fix-summary.success { background: #122612; color: var(--pass); border: 1px solid var(--pass); }
  .fix-summary.failure { background: #261212; color: var(--fail); border: 1px solid var(--fail); }
</style>
</head>
<body>

<h1>Design System — Test Connections</h1>
<p class="subtitle">Tests only need Vercel + Supabase. No external APIs required. All test data is cleaned up automatically.</p>

<div class="summary-bar" id="summary">
  <div class="summary-item"><div class="summary-num" id="sum-total">0</div><div class="summary-label">Total</div></div>
  <div class="summary-item"><div class="summary-num" style="color:var(--pass)" id="sum-pass">0</div><div class="summary-label">Passed</div></div>
  <div class="summary-item"><div class="summary-num" style="color:var(--fail)" id="sum-fail">0</div><div class="summary-label">Failed</div></div>
  <div class="summary-item"><div class="summary-num" style="color:var(--text2)" id="sum-time">0s</div><div class="summary-label">Time</div></div>
</div>

<div class="top-bar">
  <button class="btn btn-big" id="runAllBtn" onclick="runAll()">Run All Tests</button>
  <button class="btn btn-fix" id="fixBtn" onclick="fixIssues()">Fix Issues</button>
  <button class="btn" onclick="clearAll()">Clear Results</button>
  <button class="btn" style="margin-left:auto;border-color:var(--text2);color:var(--text2)" onclick="doLogout()">Logout</button>
</div>

<div id="fix-panel" class="fix-panel" style="display:none">
  <div class="fix-header">
    <span class="fix-title" id="fix-title">Fix Issues</span>
    <button class="btn btn-sm" onclick="closeFixPanel()">Close</button>
  </div>
  <div id="fix-steps"></div>
  <div id="fix-summary" class="fix-summary" style="display:none"></div>
</div>

${suiteBtns}

<script>
const BASE = window.location.pathname;
const SUITES = ${JSON.stringify(suites.map((s) => s.id))};

let runningCount = 0;
let results = {};

function updateSummary() {
  let total = 0, pass = 0, fail = 0, time = 0;
  for (const r of Object.values(results)) {
    const res = r;
    if (!res.tests) continue;
    total += res.tests.length;
    pass += res.tests.filter(t => t.passed).length;
    fail += res.tests.filter(t => !t.passed).length;
    time += res.duration || 0;
  }
  document.getElementById('sum-total').textContent = total;
  document.getElementById('sum-pass').textContent = pass;
  document.getElementById('sum-fail').textContent = fail;
  document.getElementById('sum-time').textContent = (time / 1000).toFixed(1) + 's';
}

async function runSuite(suiteId) {
  const card = document.getElementById('card-' + suiteId);
  const status = document.getElementById('status-' + suiteId);
  const resultArea = document.getElementById('result-' + suiteId);
  const btn = card.querySelector('.btn');

  card.className = 'suite-card running';
  status.innerHTML = '<span class="spinner"></span>';
  resultArea.className = 'result-area';
  resultArea.innerHTML = '';
  btn.disabled = true;
  runningCount++;

  try {
    const resp = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suite: suiteId }),
    });
    const data = await resp.json();
    results[suiteId] = data;

    if (data.passed) {
      card.className = 'suite-card pass';
      status.innerHTML = '<span style="color:var(--pass)">PASS</span>';
    } else {
      card.className = 'suite-card fail';
      status.innerHTML = '<span style="color:var(--fail)">FAIL</span>';
    }

    let html = '';
    if (data.tests) {
      for (const t of data.tests) {
        html += '<div class="test-row">';
        html += '<div class="test-dot ' + (t.passed ? 'pass' : 'fail') + '"></div>';
        html += '<div style="flex:1">';
        html += '<div class="test-name">' + escHtml(t.name) + '</div>';
        if (t.error) html += '<div class="test-error">Error: ' + escHtml(t.error) + '</div>';
        if (t.fix) html += '<div class="test-fix">Fix: ' + escHtml(t.fix) + '</div>';
        if (t.data) html += '<div class="test-data"><div class="json-block">' + escHtml(JSON.stringify(t.data, null, 2)) + '</div></div>';
        html += '</div>';
        html += '<div class="duration">' + (data.duration ? (data.duration / 1000).toFixed(1) + 's' : '') + '</div>';
        html += '</div>';
      }
    }
    if (data.error && !data.tests?.length) {
      html += '<div class="test-row"><div class="test-dot fail"></div><div><div class="test-error">' + escHtml(data.error) + '</div>';
      if (data.stack) html += '<div class="json-block">' + escHtml(data.stack) + '</div>';
      html += '</div></div>';
    }

    resultArea.innerHTML = html;
    resultArea.className = 'result-area visible';
  } catch (err) {
    card.className = 'suite-card fail';
    status.innerHTML = '<span style="color:var(--fail)">ERROR</span>';
    resultArea.innerHTML = '<div class="test-row"><div class="test-dot fail"></div><div class="test-error">Network error: ' + escHtml(err.message) + '</div></div>';
    resultArea.className = 'result-area visible';
  }

  btn.disabled = false;
  runningCount--;
  updateSummary();
}

async function runAll() {
  const btn = document.getElementById('runAllBtn');
  btn.disabled = true;
  btn.textContent = 'Running...';
  results = {};

  for (const suiteId of SUITES) {
    await runSuite(suiteId);
  }

  btn.disabled = false;
  btn.textContent = 'Run All Tests';
}

function clearAll() {
  results = {};
  for (const suiteId of SUITES) {
    document.getElementById('card-' + suiteId).className = 'suite-card';
    document.getElementById('status-' + suiteId).innerHTML = '';
    const resultArea = document.getElementById('result-' + suiteId);
    resultArea.className = 'result-area';
    resultArea.innerHTML = '';
  }
  updateSummary();
}

function escHtml(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function fixIssues() {
  const btn = document.getElementById('fixBtn');
  const panel = document.getElementById('fix-panel');
  const stepsEl = document.getElementById('fix-steps');
  const summaryEl = document.getElementById('fix-summary');
  const titleEl = document.getElementById('fix-title');

  btn.disabled = true;
  btn.textContent = 'Fixing...';
  panel.style.display = 'block';
  summaryEl.style.display = 'none';
  titleEl.textContent = 'Applying fixes...';

  // Show initial spinner state
  stepsEl.innerHTML = '<div class="fix-step"><div class="fix-step-icon running"><span class="spinner" style="width:12px;height:12px;border-width:2px"></span></div><div><div class="fix-step-name">Running migrations...</div><div class="fix-step-msg">This may take up to 30 seconds</div></div></div>';

  try {
    const resp = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'fix-issues' }),
    });
    const data = await resp.json();

    // Render steps
    let html = '';
    if (data.steps) {
      for (const s of data.steps) {
        const icon = s.status === 'pass' ? '&#10003;' : s.status === 'fail' ? '&#10007;' : '&#8212;';
        html += '<div class="fix-step">';
        html += '<div class="fix-step-icon ' + s.status + '">' + icon + '</div>';
        html += '<div style="flex:1"><div class="fix-step-name">' + escHtml(s.step) + '</div>';
        html += '<div class="fix-step-msg">' + escHtml(s.message) + '</div></div>';
        if (s.duration) html += '<div class="fix-step-dur">' + (s.duration / 1000).toFixed(1) + 's</div>';
        html += '</div>';
      }
    }
    stepsEl.innerHTML = html;

    // Summary
    titleEl.textContent = data.success ? 'Fixes Applied' : 'Fix Issues';
    summaryEl.style.display = 'block';
    if (data.success) {
      const fixed = data.tablesFixed || 0;
      summaryEl.className = 'fix-summary success';
      summaryEl.innerHTML = fixed > 0
        ? 'All good! ' + fixed + ' table' + (fixed > 1 ? 's' : '') + ' created. Run tests again to verify.'
        : 'All tables already exist — nothing to fix.';
    } else {
      const still = data.stillMissing ? data.stillMissing.join(', ') : 'unknown';
      summaryEl.className = 'fix-summary failure';
      summaryEl.innerHTML = 'Some issues remain. Still missing: ' + escHtml(still);
    }
  } catch (err) {
    stepsEl.innerHTML = '<div class="fix-step"><div class="fix-step-icon fail">&#10007;</div><div><div class="fix-step-name">Network Error</div><div class="fix-step-msg">' + escHtml(err.message) + '</div></div></div>';
    summaryEl.style.display = 'block';
    summaryEl.className = 'fix-summary failure';
    summaryEl.textContent = 'Could not reach the server. Try again.';
  }

  btn.disabled = false;
  btn.textContent = 'Fix Issues';
}

function closeFixPanel() {
  document.getElementById('fix-panel').style.display = 'none';
}

async function doLogout() {
  await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'logout' }),
  });
  window.location.reload();
}
</script>

</body>
</html>`;
}
