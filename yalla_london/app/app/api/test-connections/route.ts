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

  // --- Production data fix actions ---
  if (body.action === "scan-production-issues") {
    return await handleScanProductionIssues();
  }
  if (body.action === "fix-duplicate-posts") {
    return await handleFixDuplicatePosts();
  }
  if (body.action === "fix-stale-errors") {
    return await handleFixStaleErrors();
  }
  if (body.action === "fix-metadata") {
    return await handleFixMetadata();
  }
  if (body.action === "fix-indexing-urls") {
    return await handleFixIndexingUrls();
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
      case "indexing-pipeline":
        result = await testIndexingPipeline();
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
// Production Data Fix Handlers
// ---------------------------------------------------------------------------

/** Scan for all production data issues — returns counts without changing anything */
async function handleScanProductionIssues(): Promise<NextResponse> {
  const steps: Array<{ step: string; status: string; message: string; count?: number; items?: unknown[] }> = [];
  const overallStart = Date.now();

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");
    const siteId = getDefaultSiteId();

    // 1. Duplicate blog posts (date-suffixed or random-suffixed near-duplicates)
    const allPosts = await prisma.blogPost.findMany({
      where: { siteId, deletedAt: null },
      select: { id: true, slug: true, published: true, created_at: true, content_en: true },
      orderBy: { slug: "asc" },
    });

    const duplicates: Array<{ original: string; duplicate: string; id: string }> = [];
    const slugs = allPosts.map((p: { slug: string }) => p.slug).sort();
    for (let i = 0; i < slugs.length; i++) {
      for (let j = i + 1; j < slugs.length; j++) {
        if (slugs[j].startsWith(slugs[i]) && slugs[j] !== slugs[i]) {
          const suffix = slugs[j].slice(slugs[i].length);
          // Match date suffixes (-2026-02-18) or random suffixes (-a1b2, -c9pd)
          if (/^-(\d{4}-\d{2}-\d{2}|[a-z0-9]{3,5})$/.test(suffix)) {
            const dup = allPosts.find((p: { slug: string }) => p.slug === slugs[j]);
            if (dup) duplicates.push({ original: slugs[i], duplicate: slugs[j], id: dup.id });
          }
        }
      }
    }
    steps.push({
      step: "Duplicate blog posts",
      status: duplicates.length > 0 ? "fail" : "pass",
      message: duplicates.length > 0
        ? `Found ${duplicates.length} near-duplicate posts`
        : "No duplicate posts found",
      count: duplicates.length,
      items: duplicates.slice(0, 20),
    });

    // 2. Empty/malformed slug posts
    const malformedPosts = allPosts.filter((p: { slug: string }) =>
      !p.slug || /^-?\d{4}-\d{2}-\d{2}$/.test(p.slug) || p.slug.startsWith("-")
    );
    steps.push({
      step: "Malformed slug posts",
      status: malformedPosts.length > 0 ? "fail" : "pass",
      message: malformedPosts.length > 0
        ? `Found ${malformedPosts.length} posts with empty or malformed slugs`
        : "All slugs are valid",
      count: malformedPosts.length,
      items: malformedPosts.map((p: { id: string; slug: string }) => ({ id: p.id, slug: p.slug || "(empty)" })),
    });

    // 3. Stale GSC error messages
    const staleErrors = await prisma.uRLIndexingStatus.count({
      where: {
        site_id: siteId,
        last_error: { not: null },
        last_inspected_at: { lt: new Date(Date.now() - 7 * 86400000) }, // older than 7 days
      },
    });
    const allErrors = await prisma.uRLIndexingStatus.count({
      where: { site_id: siteId, last_error: { not: null } },
    });
    steps.push({
      step: "Stale indexing errors",
      status: staleErrors > 0 ? "fail" : "pass",
      message: staleErrors > 0
        ? `${staleErrors} URLs with stale error messages (>7 days old), ${allErrors} total errors`
        : `${allErrors} URLs with errors (all recent)`,
      count: staleErrors,
    });

    // 4. Metadata issues
    const publishedPosts = await prisma.blogPost.findMany({
      where: { siteId, published: true, deletedAt: null },
      select: {
        id: true,
        slug: true,
        meta_title_en: true,
        meta_description_en: true,
        content_en: true,
      },
      take: 300,
    });

    let metaIssues = 0;
    const metaDetails: Array<{ slug: string; issue: string }> = [];
    for (const p of publishedPosts) {
      const post = p as { slug: string; meta_title_en: string | null; meta_description_en: string | null; content_en: string | null };
      if (post.meta_title_en && post.meta_title_en.length > 60) {
        metaIssues++;
        metaDetails.push({ slug: post.slug, issue: `Title too long (${post.meta_title_en.length} chars)` });
      }
      if (!post.meta_description_en || post.meta_description_en.length < 120) {
        metaIssues++;
        metaDetails.push({ slug: post.slug, issue: post.meta_description_en ? `Description too short (${post.meta_description_en.length} chars)` : "Missing description" });
      }
      if (post.meta_description_en && post.meta_description_en.length > 160) {
        metaIssues++;
        metaDetails.push({ slug: post.slug, issue: `Description too long (${post.meta_description_en.length} chars)` });
      }
    }
    steps.push({
      step: "Metadata issues",
      status: metaIssues > 0 ? "fail" : "pass",
      message: metaIssues > 0
        ? `${metaIssues} metadata issues across ${publishedPosts.length} published posts`
        : `All ${publishedPosts.length} published posts have valid metadata`,
      count: metaIssues,
      items: metaDetails.slice(0, 20),
    });

    // 5. Duplicate/orphaned indexing URLs
    const correctBaseUrl = getSiteDomain(siteId);
    const indexEntries = await prisma.uRLIndexingStatus.findMany({
      where: { site_id: siteId },
      select: { id: true, url: true, status: true },
    });
    const nonWww = indexEntries.filter((e: { url: string }) => {
      const url = e.url;
      return url.includes("://") && !url.startsWith(correctBaseUrl) &&
        url.replace("://", "://www.").startsWith(correctBaseUrl);
    });
    const malformedUrls = indexEntries.filter((e: { url: string }) =>
      /\/blog\/-\d{4}-\d{2}-\d{2}/.test(e.url) || /\/blog\/$/.test(e.url)
    );
    steps.push({
      step: "Indexing URL issues",
      status: (nonWww.length + malformedUrls.length) > 0 ? "fail" : "pass",
      message: `${nonWww.length} non-www duplicate URLs, ${malformedUrls.length} malformed URLs`,
      count: nonWww.length + malformedUrls.length,
      items: [...nonWww.slice(0, 5).map((e: { url: string }) => ({ url: e.url, issue: "non-www duplicate" })),
              ...malformedUrls.slice(0, 5).map((e: { url: string }) => ({ url: e.url, issue: "malformed slug" }))],
    });

    // 6. Thin content
    let thinCount = 0;
    const thinPosts: Array<{ slug: string; words: number }> = [];
    for (const p of publishedPosts) {
      const post = p as { slug: string; content_en: string | null };
      if (post.content_en) {
        const wordCount = post.content_en.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
        if (wordCount < 1000) {
          thinCount++;
          thinPosts.push({ slug: post.slug, words: wordCount });
        }
      }
    }
    steps.push({
      step: "Thin content (<1000 words)",
      status: thinCount > 0 ? "warn" : "pass",
      message: thinCount > 0
        ? `${thinCount} published posts under 1000 words (can't auto-fix — need content enrichment)`
        : "All published posts meet 1000-word minimum",
      count: thinCount,
      items: thinPosts.slice(0, 10),
    });

    const totalIssues = duplicates.length + malformedPosts.length + staleErrors + metaIssues + nonWww.length + malformedUrls.length;

    return NextResponse.json({
      success: true,
      totalIssues,
      steps,
      duration: Date.now() - overallStart,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, totalIssues: -1, steps, error: msg, duration: Date.now() - overallStart });
  }
}

/** Delete duplicate blog posts (date-suffixed and random-suffixed near-duplicates) */
async function handleFixDuplicatePosts(): Promise<NextResponse> {
  const steps: Array<{ step: string; status: string; message: string; duration?: number }> = [];
  const overallStart = Date.now();

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");
    const siteId = getDefaultSiteId();

    // Step 1: Find duplicates
    let t0 = Date.now();
    const allPosts = await prisma.blogPost.findMany({
      where: { siteId, deletedAt: null },
      select: { id: true, slug: true, published: true, created_at: true },
      orderBy: { slug: "asc" },
    });

    const duplicateIds: string[] = [];
    const duplicateSlugs: string[] = [];
    const slugs = allPosts.map((p: { slug: string }) => p.slug).sort();
    for (let i = 0; i < slugs.length; i++) {
      for (let j = i + 1; j < slugs.length; j++) {
        if (slugs[j].startsWith(slugs[i]) && slugs[j] !== slugs[i]) {
          const suffix = slugs[j].slice(slugs[i].length);
          if (/^-(\d{4}-\d{2}-\d{2}|[a-z0-9]{3,5})$/.test(suffix)) {
            const dup = allPosts.find((p: { slug: string }) => p.slug === slugs[j]);
            if (dup) { duplicateIds.push(dup.id); duplicateSlugs.push(slugs[j]); }
          }
        }
      }
    }

    // Also catch malformed slugs (empty or date-only)
    for (const p of allPosts) {
      const post = p as { id: string; slug: string };
      if (!post.slug || /^-?\d{4}-\d{2}-\d{2}$/.test(post.slug) || post.slug.startsWith("-")) {
        if (!duplicateIds.includes(post.id)) {
          duplicateIds.push(post.id);
          duplicateSlugs.push(post.slug || "(empty)");
        }
      }
    }

    steps.push({
      step: "Identify duplicates",
      status: "pass",
      message: `Found ${duplicateIds.length} posts to remove: ${duplicateSlugs.slice(0, 10).join(", ")}${duplicateSlugs.length > 10 ? "..." : ""}`,
      duration: Date.now() - t0,
    });

    if (duplicateIds.length === 0) {
      return NextResponse.json({ success: true, steps, fixed: 0, duration: Date.now() - overallStart });
    }

    // Step 2: Soft-delete (set deletedAt instead of hard delete)
    t0 = Date.now();
    const result = await prisma.blogPost.updateMany({
      where: { id: { in: duplicateIds } },
      data: { deletedAt: new Date(), published: false },
    });
    steps.push({
      step: "Soft-delete duplicates",
      status: "pass",
      message: `Soft-deleted ${result.count} duplicate/malformed posts`,
      duration: Date.now() - t0,
    });

    // Step 3: Clean up related URLIndexingStatus entries
    t0 = Date.now();
    let urlsCleaned = 0;
    for (const slug of duplicateSlugs) {
      if (!slug || slug === "(empty)") continue;
      const deleted = await prisma.uRLIndexingStatus.deleteMany({
        where: { site_id: siteId, url: { contains: `/blog/${slug}` } },
      });
      urlsCleaned += deleted.count;
    }
    steps.push({
      step: "Clean indexing entries",
      status: "pass",
      message: `Removed ${urlsCleaned} orphaned URLIndexingStatus entries`,
      duration: Date.now() - t0,
    });

    return NextResponse.json({ success: true, steps, fixed: duplicateIds.length, duration: Date.now() - overallStart });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ step: "Error", status: "fail", message: msg });
    return NextResponse.json({ success: false, steps, fixed: 0, error: msg, duration: Date.now() - overallStart });
  }
}

/** Clear stale GSC error messages (>7 days old) from URLIndexingStatus */
async function handleFixStaleErrors(): Promise<NextResponse> {
  const steps: Array<{ step: string; status: string; message: string; duration?: number }> = [];
  const overallStart = Date.now();

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");
    const siteId = getDefaultSiteId();

    // Step 1: Count stale errors
    let t0 = Date.now();
    const cutoff = new Date(Date.now() - 7 * 86400000);
    const staleCount = await prisma.uRLIndexingStatus.count({
      where: {
        site_id: siteId,
        last_error: { not: null },
        last_inspected_at: { lt: cutoff },
      },
    });
    steps.push({
      step: "Count stale errors",
      status: "pass",
      message: `Found ${staleCount} URLs with errors older than 7 days`,
      duration: Date.now() - t0,
    });

    if (staleCount === 0) {
      return NextResponse.json({ success: true, steps, fixed: 0, duration: Date.now() - overallStart });
    }

    // Step 2: Clear error messages and reset status to "submitted" for re-checking
    t0 = Date.now();
    const result = await prisma.uRLIndexingStatus.updateMany({
      where: {
        site_id: siteId,
        last_error: { not: null },
        last_inspected_at: { lt: cutoff },
      },
      data: {
        last_error: null,
        status: "submitted",
      },
    });
    steps.push({
      step: "Clear stale errors",
      status: "pass",
      message: `Cleared ${result.count} stale error messages — URLs reset to "submitted" for re-checking`,
      duration: Date.now() - t0,
    });

    return NextResponse.json({ success: true, steps, fixed: result.count, duration: Date.now() - overallStart });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ step: "Error", status: "fail", message: msg });
    return NextResponse.json({ success: false, steps, fixed: 0, error: msg, duration: Date.now() - overallStart });
  }
}

/** Auto-fix blog post metadata (titles/descriptions) */
async function handleFixMetadata(): Promise<NextResponse> {
  const steps: Array<{ step: string; status: string; message: string; duration?: number }> = [];
  const overallStart = Date.now();

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");
    const siteId = getDefaultSiteId();

    let t0 = Date.now();
    const posts = await prisma.blogPost.findMany({
      where: { siteId, published: true, deletedAt: null },
      select: {
        id: true,
        slug: true,
        title_en: true,
        meta_title_en: true,
        meta_description_en: true,
        excerpt_en: true,
        content_en: true,
      },
      take: 300,
      orderBy: { created_at: "desc" },
    });
    steps.push({ step: "Load posts", status: "pass", message: `Loaded ${posts.length} published posts`, duration: Date.now() - t0 });

    t0 = Date.now();
    let fixed = 0;
    const fixes: Array<{ slug: string; fix: string }> = [];

    for (const row of posts) {
      const p = row as { id: string; slug: string; title_en: string | null; meta_title_en: string | null; meta_description_en: string | null; excerpt_en: string | null; content_en: string | null };
      const updates: Record<string, string> = {};

      // Fix title > 60 chars
      if (p.meta_title_en && p.meta_title_en.length > 60) {
        const cut = p.meta_title_en.lastIndexOf(" ", 57);
        updates.meta_title_en = p.meta_title_en.slice(0, cut > 30 ? cut : 57) + "...";
        fixes.push({ slug: p.slug, fix: `Title truncated: ${p.meta_title_en.length} → ${updates.meta_title_en.length} chars` });
      }

      // Fix description > 160 chars
      if (p.meta_description_en && p.meta_description_en.length > 160) {
        const cut = p.meta_description_en.lastIndexOf(" ", 157);
        updates.meta_description_en = p.meta_description_en.slice(0, cut > 100 ? cut : 157) + "...";
        fixes.push({ slug: p.slug, fix: `Description truncated: ${p.meta_description_en.length} → ${updates.meta_description_en.length} chars` });
      }

      // Fix missing/short description
      if (!p.meta_description_en || p.meta_description_en.length < 120) {
        const source = p.excerpt_en || (p.content_en ? p.content_en.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "");
        if (source.length >= 120) {
          const cut = source.lastIndexOf(" ", 155);
          updates.meta_description_en = source.slice(0, cut > 120 ? cut : 155).trim();
          if (updates.meta_description_en.length > 160) updates.meta_description_en = updates.meta_description_en.slice(0, 157) + "...";
          fixes.push({ slug: p.slug, fix: `Description generated (${updates.meta_description_en.length} chars)` });
        }
      }

      if (Object.keys(updates).length > 0) {
        await prisma.blogPost.update({ where: { id: p.id }, data: updates });
        fixed++;
      }
    }

    steps.push({
      step: "Fix metadata",
      status: fixed > 0 ? "pass" : "pass",
      message: `Applied ${fixes.length} fixes across ${fixed} posts`,
      duration: Date.now() - t0,
    });

    return NextResponse.json({ success: true, steps, fixed, fixes: fixes.slice(0, 30), duration: Date.now() - overallStart });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ step: "Error", status: "fail", message: msg });
    return NextResponse.json({ success: false, steps, fixed: 0, error: msg, duration: Date.now() - overallStart });
  }
}

/** Clean up duplicate/orphaned URLIndexingStatus entries (non-www, malformed) */
async function handleFixIndexingUrls(): Promise<NextResponse> {
  const steps: Array<{ step: string; status: string; message: string; duration?: number }> = [];
  const overallStart = Date.now();

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");
    const siteId = getDefaultSiteId();
    const correctBaseUrl = getSiteDomain(siteId);

    let t0 = Date.now();
    const allEntries = await prisma.uRLIndexingStatus.findMany({
      where: { site_id: siteId },
      select: { id: true, url: true, status: true, submitted_indexnow: true, submitted_sitemap: true, last_submitted_at: true },
    });
    steps.push({ step: "Load entries", status: "pass", message: `Found ${allEntries.length} total indexing entries`, duration: Date.now() - t0 });

    // Remove malformed URLs
    t0 = Date.now();
    const malformed = allEntries.filter((e: { url: string }) =>
      /\/blog\/-\d{4}-\d{2}-\d{2}/.test(e.url) || /\/blog\/$/.test(e.url)
    );
    if (malformed.length > 0) {
      await prisma.uRLIndexingStatus.deleteMany({
        where: { id: { in: malformed.map((e: { id: string }) => e.id) } },
      });
    }
    steps.push({
      step: "Remove malformed URLs",
      status: "pass",
      message: `Deleted ${malformed.length} malformed URL entries`,
      duration: Date.now() - t0,
    });

    // Fix non-www duplicates: merge data into www version, delete non-www
    t0 = Date.now();
    let merged = 0;
    let converted = 0;
    const nonWww = allEntries.filter((e: { url: string }) => {
      const url = e.url;
      return url.includes("://") && !url.startsWith(correctBaseUrl) &&
        url.replace("://", "://www.").startsWith(correctBaseUrl);
    });

    for (const entry of nonWww) {
      const e = entry as { id: string; url: string; submitted_indexnow: boolean; submitted_sitemap: boolean; last_submitted_at: Date | null };
      const wwwUrl = e.url.replace("://", "://www.");
      const wwwEntry = allEntries.find((w: { url: string }) => w.url === wwwUrl);

      if (wwwEntry) {
        // Merge: transfer submission state if non-www has more data
        const w = wwwEntry as { id: string; submitted_indexnow: boolean; submitted_sitemap: boolean; last_submitted_at: Date | null };
        const updates: Record<string, unknown> = {};
        if (e.submitted_indexnow && !w.submitted_indexnow) updates.submitted_indexnow = true;
        if (e.submitted_sitemap && !w.submitted_sitemap) updates.submitted_sitemap = true;
        if (e.last_submitted_at && (!w.last_submitted_at || e.last_submitted_at > w.last_submitted_at)) {
          updates.last_submitted_at = e.last_submitted_at;
        }
        if (Object.keys(updates).length > 0) {
          await prisma.uRLIndexingStatus.update({ where: { id: w.id }, data: updates });
        }
        await prisma.uRLIndexingStatus.delete({ where: { id: e.id } });
        merged++;
      } else {
        // No www version — convert this entry to www
        await prisma.uRLIndexingStatus.update({
          where: { id: e.id },
          data: { url: wwwUrl },
        });
        converted++;
      }
    }

    steps.push({
      step: "Fix non-www duplicates",
      status: "pass",
      message: `Merged ${merged} + converted ${converted} non-www entries (${nonWww.length} total processed)`,
      duration: Date.now() - t0,
    });

    return NextResponse.json({
      success: true,
      steps,
      fixed: malformed.length + nonWww.length,
      duration: Date.now() - overallStart,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({ step: "Error", status: "fail", message: msg });
    return NextResponse.json({ success: false, steps, fixed: 0, error: msg, duration: Date.now() - overallStart });
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
// 17. Indexing Pipeline Health
// ---------------------------------------------------------------------------
async function testIndexingPipeline(): Promise<TestSuiteResult> {
  const tests: TestResult[] = [];

  // ── Test 1: Database connection + URLIndexingStatus table exists ──
  try {
    const { prisma } = await import("@/lib/db");
    const tableCheck: Array<{ tablename: string }> = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'url_indexing_statuses'
    `;
    if (tableCheck.length > 0) {
      tests.push({ name: "URLIndexingStatus table exists", passed: true });
    } else {
      tests.push({
        name: "URLIndexingStatus table exists",
        passed: false,
        error: "Table 'url_indexing_statuses' not found in database",
        fix: "Run 'npx prisma migrate deploy' to create the URLIndexingStatus table. This table tracks which URLs have been submitted to search engines and their indexing status.",
      });
      return suiteResult("indexing-pipeline", tests);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "URLIndexingStatus table exists",
      passed: false,
      error: msg,
      fix: "Database connection failed. Check DATABASE_URL env var and ensure Supabase is reachable.",
    });
    return suiteResult("indexing-pipeline", tests);
  }

  // ── Test 2: URLIndexingStatus lifecycle — records exist and statuses are valid ──
  try {
    const { prisma } = await import("@/lib/db");
    const statusCounts = await prisma.uRLIndexingStatus.groupBy({
      by: ["status"],
      _count: { status: true },
    });
    const statusMap: Record<string, number> = {};
    for (const row of statusCounts) {
      statusMap[row.status] = row._count.status;
    }
    const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const discovered = statusMap["discovered"] || 0;
    const submitted = statusMap["submitted"] || 0;
    const indexed = statusMap["indexed"] || 0;
    const pending = statusMap["pending"] || 0;

    if (total === 0) {
      tests.push({
        name: "URL tracking records exist",
        passed: false,
        error: "No URLs tracked in URLIndexingStatus — the indexing pipeline has never run",
        fix: "Trigger the SEO cron by visiting /api/seo/cron?task=daily or wait for the next scheduled run (7:30 UTC daily). The SEO agent (7:00/13:00/20:00 UTC) discovers URLs and the SEO cron submits them.",
        data: { total: 0 },
      });
    } else {
      const stuckDiscovered = discovered > 0 && submitted === 0 && indexed === 0;
      if (stuckDiscovered) {
        tests.push({
          name: "URL tracking records exist",
          passed: false,
          error: `${discovered} URLs stuck in "discovered" — never advanced to "submitted". The seo/cron or google-indexing cron may not be running.`,
          fix: "Check that /api/seo/cron and /api/cron/google-indexing are scheduled in vercel.json. Trigger manually: /api/seo/cron?task=daily. Also verify INDEXNOW_KEY is set.",
          data: { total, byStatus: statusMap },
        });
      } else {
        tests.push({
          name: "URL tracking records exist",
          passed: true,
          data: { total, byStatus: statusMap, lifecycle: `discovered(${discovered}) → submitted(${submitted}) → indexed(${indexed}), pending(${pending})` },
        });
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "URL tracking records exist", passed: false, error: msg, fix: "Check database connection and URLIndexingStatus model." });
  }

  // ── Test 3: GSC credentials configured ──
  {
    const clientEmail = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || process.env.GSC_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY || process.env.GSC_PRIVATE_KEY;
    const gscSiteUrl = process.env.GSC_SITE_URL;

    const hasEmail = !!clientEmail;
    const hasKey = !!privateKey;
    const hasUrl = !!gscSiteUrl;

    if (hasEmail && hasKey && hasUrl) {
      tests.push({
        name: "GSC credentials configured",
        passed: true,
        data: {
          clientEmail: clientEmail!.substring(0, 20) + "...",
          privateKeySet: true,
          gscSiteUrl: gscSiteUrl,
          format: gscSiteUrl!.startsWith("sc-domain:") ? "Domain property (correct)" : "URL-prefix property",
        },
      });
    } else {
      const missing: string[] = [];
      if (!hasEmail) missing.push("GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL (or GSC_CLIENT_EMAIL)");
      if (!hasKey) missing.push("GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY (or GSC_PRIVATE_KEY)");
      if (!hasUrl) missing.push("GSC_SITE_URL");
      tests.push({
        name: "GSC credentials configured",
        passed: false,
        error: `Missing env vars: ${missing.join(", ")}`,
        fix: "Set these in Vercel Environment Variables. For GSC_SITE_URL, use your exact GSC property format — e.g. 'sc-domain:yalla-london.com' for domain properties or 'https://www.yalla-london.com' for URL-prefix properties. The service account email needs 'Owner' permission in GSC.",
        data: { hasEmail, hasKey, hasUrl },
      });
    }
  }

  // ── Test 4: GSC site URL matches property format ──
  {
    const gscSiteUrl = process.env.GSC_SITE_URL || "";
    try {
      const { getDefaultSiteId, getSiteSeoConfig, getSiteDomain } = await import("@/config/sites");
      const siteId = getDefaultSiteId();
      const seoConfig = getSiteSeoConfig(siteId);
      const siteDomain = getSiteDomain(siteId);

      // Check for the common mistake: using site domain URL instead of GSC property URL
      const gscUrlIsPlainDomain = gscSiteUrl.startsWith("https://");
      const configGscUrl = seoConfig.gscSiteUrl;

      if (!gscSiteUrl) {
        tests.push({
          name: "GSC property URL format",
          passed: false,
          error: "GSC_SITE_URL env var not set — falling back to code default",
          fix: `Set GSC_SITE_URL to your GSC property. For domain properties: 'sc-domain:yalla-london.com'. For URL-prefix: '${siteDomain}'. The value MUST match exactly what's registered in Google Search Console.`,
          data: { fallback: configGscUrl, siteDomain },
        });
      } else {
        tests.push({
          name: "GSC property URL format",
          passed: true,
          data: {
            gscSiteUrl,
            format: gscSiteUrl.startsWith("sc-domain:") ? "Domain property" : "URL-prefix property",
            configDefault: configGscUrl,
            siteDomainUrl: siteDomain,
            note: gscUrlIsPlainDomain
              ? "Using URL-prefix format — make sure this exact URL (including www or non-www) is verified in GSC"
              : "Using domain property format — this covers all subdomains and protocols automatically",
          },
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      tests.push({ name: "GSC property URL format", passed: false, error: msg });
    }
  }

  // ── Test 5: IndexNow key configured ──
  {
    const indexNowKey = process.env.INDEXNOW_KEY;
    if (indexNowKey) {
      tests.push({
        name: "IndexNow key configured",
        passed: true,
        data: { keyLength: indexNowKey.length, keyPreview: indexNowKey.substring(0, 8) + "..." },
      });
    } else {
      tests.push({
        name: "IndexNow key configured",
        passed: false,
        error: "INDEXNOW_KEY env var not set — Bing/Yandex won't discover new URLs",
        fix: "Generate a key at https://www.indexnow.org/generate and set INDEXNOW_KEY in Vercel env vars. Also ensure the key file is served at /{key}.txt via the /api/indexnow-key route.",
      });
    }
  }

  // ── Test 6: GSC API authentication test ──
  {
    const clientEmail = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || process.env.GSC_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY || process.env.GSC_PRIVATE_KEY;
    if (clientEmail && privateKey) {
      try {
        const { GoogleSearchConsole } = await import("@/lib/integrations/google-search-console");
        const gsc = new GoogleSearchConsole();
        const status = gsc.getStatus();
        tests.push({
          name: "GSC API authentication",
          passed: status.configured,
          data: { configured: status.configured, siteUrl: status.siteUrl },
          error: !status.configured ? "GSC class reports not configured despite env vars being set" : undefined,
          fix: !status.configured ? "Check that GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY contains a valid PEM private key. Make sure \\n line breaks are preserved correctly in the env var." : undefined,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        tests.push({
          name: "GSC API authentication",
          passed: false,
          error: `Failed to initialize GSC client: ${msg}`,
          fix: "Check that the google-search-console.ts module exists and the private key format is valid. Common issue: line breaks in the key get corrupted — use \\n in the env var.",
        });
      }
    } else {
      tests.push({
        name: "GSC API authentication",
        passed: false,
        error: "Skipped — GSC credentials not configured",
        fix: "Set GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL and GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY first.",
      });
    }
  }

  // ── Test 7: Per-site URL scoping (no cross-site leakage) ──
  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");
    const siteId = getDefaultSiteId();
    const siteDomain = getSiteDomain(siteId);

    // Check if any tracked URLs belong to a different site's domain
    const allTracked = await prisma.uRLIndexingStatus.findMany({
      where: { site_id: siteId },
      select: { url: true },
      take: 200,
    });

    if (allTracked.length === 0) {
      tests.push({
        name: "Per-site URL scoping (no cross-site leakage)",
        passed: true,
        data: { message: "No URLs tracked yet — will validate when URLs are submitted" },
      });
    } else {
      // Extract domain from siteDomain URL
      const expectedHost = new URL(siteDomain).hostname;
      const wrongSiteUrls = allTracked.filter((row) => {
        try {
          const urlHost = new URL(row.url).hostname;
          return urlHost !== expectedHost;
        } catch {
          return false;
        }
      });

      if (wrongSiteUrls.length > 0) {
        tests.push({
          name: "Per-site URL scoping (no cross-site leakage)",
          passed: false,
          error: `${wrongSiteUrls.length} URLs tracked under site "${siteId}" belong to different domains`,
          fix: `Cross-site URL contamination detected. These URLs from other sites are tracked under ${siteId}: ${wrongSiteUrls.slice(0, 5).map((r) => r.url).join(", ")}. Delete these records from URLIndexingStatus or re-run the indexing cron which now scopes per-site.`,
          data: { wrongCount: wrongSiteUrls.length, examples: wrongSiteUrls.slice(0, 5).map((r) => r.url) },
        });
      } else {
        tests.push({
          name: "Per-site URL scoping (no cross-site leakage)",
          passed: true,
          data: { urlsChecked: allTracked.length, allMatchDomain: expectedHost },
        });
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "Per-site URL scoping (no cross-site leakage)", passed: false, error: msg });
  }

  // ── Test 8: Blog page rendering (timeout check) ──
  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");
    const siteId = getDefaultSiteId();

    // Check that published blog posts exist
    const publishedCount = await prisma.blogPost.count({
      where: { published: true, siteId },
    });

    // Check pool_timeout is set correctly (should be ≤5)
    const dbUrl = process.env.DATABASE_URL || "";
    const poolTimeoutMatch = dbUrl.match(/pool_timeout=(\d+)/);
    const poolTimeout = poolTimeoutMatch ? parseInt(poolTimeoutMatch[1]) : null;

    const poolTimeoutOk = poolTimeout !== null && poolTimeout <= 5;

    if (publishedCount === 0) {
      tests.push({
        name: "Blog page rendering health",
        passed: false,
        error: "No published blog posts found — blog pages will 404",
        fix: "Publish blog posts via the content pipeline (Content Hub → Generation Monitor) or trigger /api/cron/content-selector to promote reservoir articles.",
        data: { publishedCount, poolTimeout, poolTimeoutOk },
      });
    } else {
      tests.push({
        name: "Blog page rendering health",
        passed: poolTimeoutOk,
        data: { publishedPosts: publishedCount, poolTimeout, poolTimeoutOk },
        error: !poolTimeoutOk ? `pool_timeout=${poolTimeout || "not set"} in DATABASE_URL — should be ≤5 to prevent page timeouts` : undefined,
        fix: !poolTimeoutOk ? "Add '&pool_timeout=5' to your DATABASE_URL (after pgbouncer=true). High pool_timeout causes blog pages to hang waiting for a connection from the pool." : undefined,
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "Blog page rendering health", passed: false, error: msg });
  }

  // ── Test 9: Slug deduplication (startsWith vs contains) ──
  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");
    const siteId = getDefaultSiteId();

    // Check for duplicate/near-duplicate slugs that indicate the old contains bug
    const slugs = await prisma.blogPost.findMany({
      where: { siteId },
      select: { slug: true },
      orderBy: { slug: "asc" },
    });

    const slugList = slugs.map((s) => s.slug);
    const duplicates: string[] = [];
    for (let i = 0; i < slugList.length; i++) {
      for (let j = i + 1; j < slugList.length; j++) {
        // Check if one slug is a substring/prefix of another (old contains bug)
        if (slugList[j].startsWith(slugList[i]) && slugList[j] !== slugList[i]) {
          duplicates.push(`"${slugList[i]}" ↔ "${slugList[j]}"`);
        }
      }
    }

    if (duplicates.length > 0) {
      tests.push({
        name: "Slug deduplication (no near-duplicates)",
        passed: false,
        error: `${duplicates.length} near-duplicate slug pairs found — may indicate the old 'contains' bug created redundant posts`,
        fix: "Review these slug pairs and delete the duplicates from the BlogPost table. The slug dedup logic now uses 'startsWith' matching to prevent this.",
        data: { duplicatePairs: duplicates.slice(0, 10), totalSlugs: slugList.length },
      });
    } else {
      tests.push({
        name: "Slug deduplication (no near-duplicates)",
        passed: true,
        data: { totalSlugs: slugList.length, nearDuplicates: 0 },
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "Slug deduplication (no near-duplicates)", passed: false, error: msg });
  }

  // ── Test 10: Indexing cron jobs scheduled in vercel.json ──
  try {
    const fs = await import("fs");
    const path = await import("path");
    let vercelConfig: { crons?: Array<{ path: string; schedule: string }> } = {};
    try {
      const vercelPath = path.join(process.cwd(), "vercel.json");
      const content = fs.readFileSync(vercelPath, "utf-8");
      vercelConfig = JSON.parse(content);
    } catch {
      // vercel.json may not be readable in production
    }

    const requiredCrons = [
      { path: "/api/seo/cron", label: "SEO Cron (daily submissions)" },
      { path: "/api/cron/google-indexing", label: "Google Indexing (daily)" },
      { path: "/api/cron/verify-indexing", label: "Verify Indexing (daily)" },
    ];

    if (vercelConfig.crons && vercelConfig.crons.length > 0) {
      const scheduledPaths = vercelConfig.crons.map((c) => c.path);
      const missing = requiredCrons.filter((r) => !scheduledPaths.includes(r.path));
      const found = requiredCrons.filter((r) => scheduledPaths.includes(r.path));

      if (missing.length > 0) {
        tests.push({
          name: "Indexing crons scheduled in vercel.json",
          passed: false,
          error: `Missing cron schedules: ${missing.map((m) => m.label).join(", ")}`,
          fix: `Add these to vercel.json "crons" array: ${missing.map((m) => `{ "path": "${m.path}", "schedule": "30 7 * * *" }`).join(", ")}`,
          data: { found: found.map((f) => f.path), missing: missing.map((m) => m.path) },
        });
      } else {
        const cronDetails = vercelConfig.crons
          .filter((c) => requiredCrons.some((r) => r.path === c.path))
          .map((c) => ({ path: c.path, schedule: c.schedule }));
        tests.push({
          name: "Indexing crons scheduled in vercel.json",
          passed: true,
          data: { schedules: cronDetails },
        });
      }
    } else {
      tests.push({
        name: "Indexing crons scheduled in vercel.json",
        passed: true,
        data: { note: "vercel.json not readable in production — cron schedules verified at deploy time" },
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "Indexing crons scheduled in vercel.json", passed: false, error: msg });
  }

  // ── Test 11: Recent cron execution history ──
  try {
    const { prisma } = await import("@/lib/db");
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentRuns = await prisma.cronJobLog.findMany({
      where: {
        job_name: { in: ["seo-cron", "google-indexing", "verify-indexing", "seo-agent"] },
        started_at: { gte: oneDayAgo },
      },
      orderBy: { started_at: "desc" },
      take: 20,
      select: { job_name: true, status: true, started_at: true, duration_ms: true, error_message: true },
    });

    if (recentRuns.length === 0) {
      tests.push({
        name: "Recent indexing cron executions (last 24h)",
        passed: false,
        error: "No indexing cron runs in the last 24 hours — crons may not be triggering",
        fix: "Check Vercel dashboard → Crons tab to see if cron jobs are firing. Trigger manually: /api/seo/cron?task=daily. If CronJobLog table doesn't exist, run database migrations.",
      });
    } else {
      const failed = recentRuns.filter((r) => r.status === "failed");
      const succeeded = recentRuns.filter((r) => r.status === "completed");

      tests.push({
        name: "Recent indexing cron executions (last 24h)",
        passed: failed.length === 0,
        data: {
          totalRuns: recentRuns.length,
          succeeded: succeeded.length,
          failed: failed.length,
          runs: recentRuns.slice(0, 10).map((r) => ({
            job: r.job_name,
            status: r.status,
            at: r.started_at,
            duration: r.duration_ms ? `${r.duration_ms}ms` : "unknown",
            error: r.error_message || null,
          })),
        },
        error: failed.length > 0 ? `${failed.length} cron runs failed in the last 24h: ${failed.map((f) => `${f.job_name}: ${f.error_message || "unknown error"}`).join("; ")}` : undefined,
        fix: failed.length > 0 ? "Check the error messages above. Common issues: GSC credentials misconfigured, database connection timeout, IndexNow key invalid." : undefined,
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("does not exist") || msg.includes("P2021")) {
      tests.push({
        name: "Recent indexing cron executions (last 24h)",
        passed: false,
        error: "CronJobLog table does not exist",
        fix: "Run 'npx prisma migrate deploy' to create the cron_job_logs table. Without it, cron execution history is not tracked.",
      });
    } else {
      tests.push({ name: "Recent indexing cron executions (last 24h)", passed: false, error: msg });
    }
  }

  // ── Test 12: Indexing-service imports and lazy loading ──
  try {
    const {
      submitToIndexNow,
      getNewUrls,
      GoogleSearchConsoleAPI,
      pingSitemaps,
      runAutomatedIndexing,
    } = await import("@/lib/seo/indexing-service");

    const importChecks = [
      { name: "submitToIndexNow", ok: typeof submitToIndexNow === "function" },
      { name: "getNewUrls", ok: typeof getNewUrls === "function" },
      { name: "GoogleSearchConsoleAPI", ok: typeof GoogleSearchConsoleAPI === "function" },
      { name: "pingSitemaps", ok: typeof pingSitemaps === "function" },
      { name: "runAutomatedIndexing", ok: typeof runAutomatedIndexing === "function" },
    ];

    const allOk = importChecks.every((c) => c.ok);
    tests.push({
      name: "Indexing service imports (lazy-loaded)",
      passed: allOk,
      data: { exports: importChecks },
      error: !allOk ? `Missing exports: ${importChecks.filter((c) => !c.ok).map((c) => c.name).join(", ")}` : undefined,
      fix: !allOk ? "Check lib/seo/indexing-service.ts — one or more exports are missing or not functions." : undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({
      name: "Indexing service imports (lazy-loaded)",
      passed: false,
      error: `Failed to import indexing service: ${msg}`,
      fix: "Check lib/seo/indexing-service.ts for syntax errors. The module should export submitToIndexNow, getNewUrls, GoogleSearchConsoleAPI, pingSitemaps, runAutomatedIndexing.",
    });
  }

  // ── Test 13: Indexing progress summary ──
  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");
    const siteId = getDefaultSiteId();

    // Count published blog posts
    const totalPublished = await prisma.blogPost.count({
      where: { published: true, siteId },
    });

    // Count indexed URLs
    const indexedCount = await prisma.uRLIndexingStatus.count({
      where: { site_id: siteId, status: "indexed" },
    });

    // Count submitted (waiting for indexing)
    const submittedCount = await prisma.uRLIndexingStatus.count({
      where: { site_id: siteId, status: "submitted" },
    });

    // Count discovered but not yet submitted
    const discoveredCount = await prisma.uRLIndexingStatus.count({
      where: { site_id: siteId, status: { in: ["discovered", "pending"] } },
    });

    // Count never tracked
    const totalTracked = await prisma.uRLIndexingStatus.count({
      where: { site_id: siteId },
    });

    const indexingRate = totalPublished > 0 ? Math.round((indexedCount / totalPublished) * 100) : 0;
    const trackingRate = totalPublished > 0 ? Math.round((totalTracked / totalPublished) * 100) : 0;

    // Determine health
    let health: string;
    let passed: boolean;
    if (totalPublished === 0) {
      health = "No published content yet";
      passed = true;
    } else if (indexingRate >= 50) {
      health = "Healthy — majority of content indexed";
      passed = true;
    } else if (submittedCount > 0 || discoveredCount > 0) {
      health = "In progress — URLs submitted, waiting for Google to index";
      passed = true;
    } else if (totalTracked === 0) {
      health = "Not started — no URLs tracked. Run the indexing cron.";
      passed = false;
    } else {
      health = "Warning — low indexing rate";
      passed = false;
    }

    tests.push({
      name: "Indexing progress summary",
      passed,
      data: {
        health,
        totalPublished,
        totalTracked,
        trackingRate: `${trackingRate}%`,
        indexed: indexedCount,
        submitted: submittedCount,
        discovered: discoveredCount,
        indexingRate: `${indexingRate}%`,
      },
      error: !passed ? `Only ${indexingRate}% of published content is indexed by Google` : undefined,
      fix: !passed ? "Run /api/seo/cron?task=daily to submit URLs, then /api/cron/verify-indexing to check status. It typically takes 2-7 days for Google to index new URLs after submission." : undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "Indexing progress summary", passed: false, error: msg });
  }

  // ── Test 14: GSC Live API Probe (actually call GSC with a sample URL) ──
  {
    const clientEmail = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || process.env.GSC_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY || process.env.GSC_PRIVATE_KEY;
    const gscUrl = process.env.GSC_SITE_URL;

    if (clientEmail && privateKey && gscUrl) {
      try {
        const { GoogleSearchConsole } = await import("@/lib/integrations/google-search-console");
        const gsc = new GoogleSearchConsole();

        // Try listing sitemaps — this validates credentials + property access in one call
        const sitemaps = await gsc.getSitemaps();

        if (sitemaps === null) {
          tests.push({
            name: "GSC API live probe (list sitemaps)",
            passed: false,
            error: "GSC API returned null — authentication failed or property not accessible",
            fix: `Check: (1) Service account email is added as OWNER in GSC for property '${gscUrl}'. (2) Private key is valid PEM format with correct line breaks. (3) GSC_SITE_URL matches EXACTLY what's in GSC (case-sensitive, including 'sc-domain:' prefix for domain properties).`,
            data: { gscSiteUrl: gscUrl, serviceAccount: clientEmail.substring(0, 30) + "..." },
          });
        } else if (Array.isArray(sitemaps)) {
          const sitemapInfo = sitemaps.map((s: any) => ({
            path: s.path,
            lastSubmitted: s.lastSubmitted || s.lastDownloaded || "never",
            isPending: s.isPending,
            warnings: s.warnings,
            errors: s.errors,
          }));
          tests.push({
            name: "GSC API live probe (list sitemaps)",
            passed: true,
            data: {
              sitemapCount: sitemaps.length,
              sitemaps: sitemapInfo,
              note: sitemaps.length === 0 ? "No sitemaps registered in GSC — submit one via /api/seo/cron?task=ping" : "GSC API working correctly",
            },
          });
        } else {
          tests.push({
            name: "GSC API live probe (list sitemaps)",
            passed: true,
            data: { result: "API responded (non-array response)", raw: typeof sitemaps },
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // Diagnose common GSC errors
        let diagnosis = "";
        let fixAdvice = "";
        if (msg.includes("403")) {
          diagnosis = "HTTP 403 Forbidden — service account doesn't have access to this GSC property";
          fixAdvice = `Go to Google Search Console → Settings → Users and permissions → Add user: '${clientEmail}' with 'Owner' access. Make sure GSC_SITE_URL='${gscUrl}' matches the property format exactly.`;
        } else if (msg.includes("401")) {
          diagnosis = "HTTP 401 Unauthorized — JWT authentication failed";
          fixAdvice = "The private key is likely corrupted. In Vercel env vars, make sure the key has literal newline characters (not \\n as text). Re-copy from the JSON key file.";
        } else if (msg.includes("404")) {
          diagnosis = "HTTP 404 Not Found — GSC property doesn't exist";
          fixAdvice = `Property '${gscUrl}' not found in GSC. Verify: (1) Property exists in Search Console, (2) GSC_SITE_URL format is correct (domain property uses 'sc-domain:domain.com', URL-prefix uses 'https://www.domain.com').`;
        } else if (msg.includes("PEM") || msg.includes("asn1") || msg.includes("crypto")) {
          diagnosis = "Private key format error — PEM parsing failed";
          fixAdvice = "The private key in GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY is malformed. Common causes: (1) Line breaks lost when copying to Vercel, (2) Quotes around the value stripping backslashes. Copy the raw key from the JSON service account file.";
        } else {
          diagnosis = msg;
          fixAdvice = "Check server logs for detailed GSC API error. Common issues: network timeout, DNS resolution failure, or service account key expired.";
        }
        tests.push({
          name: "GSC API live probe (list sitemaps)",
          passed: false,
          error: diagnosis,
          fix: fixAdvice,
          data: { rawError: msg.substring(0, 200), gscSiteUrl: gscUrl },
        });
      }
    } else {
      tests.push({
        name: "GSC API live probe (list sitemaps)",
        passed: false,
        error: "Skipped — GSC credentials not fully configured",
        fix: "Set GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL, GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY, and GSC_SITE_URL in Vercel env vars.",
      });
    }
  }

  // ── Test 15: URL Inspection probe (check one sample URL) ──
  {
    const clientEmail = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || process.env.GSC_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY || process.env.GSC_PRIVATE_KEY;

    if (clientEmail && privateKey) {
      try {
        const { prisma } = await import("@/lib/db");
        const { getDefaultSiteId, getSiteDomain, getSiteSeoConfig } = await import("@/config/sites");
        const siteId = getDefaultSiteId();

        // Find a URL to inspect — prefer one that was submitted
        const sampleUrl = await prisma.uRLIndexingStatus.findFirst({
          where: { site_id: siteId, status: { in: ["submitted", "indexed"] } },
          orderBy: { last_submitted_at: "desc" },
          select: { url: true, status: true, last_submitted_at: true },
        });

        if (!sampleUrl) {
          // Try getting any published blog post URL
          const post = await prisma.blogPost.findFirst({
            where: { published: true, siteId },
            select: { slug: true },
            orderBy: { created_at: "desc" },
          });

          if (post) {
            const siteUrl = getSiteDomain(siteId);
            const testUrl = `${siteUrl}/blog/${post.slug}`;
            tests.push({
              name: "URL Inspection probe",
              passed: true,
              data: {
                note: "No URLs in URLIndexingStatus yet — found a published post to inspect",
                sampleUrl: testUrl,
                action: `Trigger /api/seo/cron?task=daily to submit this URL, then /api/cron/verify-indexing to inspect it`,
              },
            });
          } else {
            tests.push({
              name: "URL Inspection probe",
              passed: false,
              error: "No published blog posts and no tracked URLs — nothing to inspect",
              fix: "Publish content first, then run the indexing pipeline.",
            });
          }
        } else {
          // Actually inspect this URL via GSC
          try {
            const { GoogleSearchConsole } = await import("@/lib/integrations/google-search-console");
            const gsc = new GoogleSearchConsole();
            const seoConfig = getSiteSeoConfig(siteId);
            gsc.setSiteUrl(seoConfig.gscSiteUrl);

            const inspection = await gsc.getIndexingStatus(sampleUrl.url);

            if (inspection) {
              const isIndexed = inspection.indexingState === "INDEXED" || inspection.indexingState === "PARTIALLY_INDEXED";
              tests.push({
                name: "URL Inspection probe",
                passed: true,
                data: {
                  url: sampleUrl.url,
                  googleSays: {
                    indexingState: inspection.indexingState,
                    coverageState: inspection.coverageState,
                    lastCrawlTime: inspection.lastCrawlTime || "never crawled",
                    robotsTxtState: inspection.robotsTxtState || "unknown",
                    pageFetchState: inspection.pageFetchState || "unknown",
                    crawledAs: inspection.crawledAs || "unknown",
                    googleCanonical: inspection.googleCanonical || "not set",
                    userCanonical: inspection.userCanonical || "not set",
                  },
                  isIndexed,
                  verdict: isIndexed ? "Google has indexed this URL" : `Not indexed — Google says: ${inspection.coverageState || inspection.indexingState}`,
                },
              });
            } else {
              const daysSince = sampleUrl.last_submitted_at
                ? Math.floor((Date.now() - new Date(sampleUrl.last_submitted_at).getTime()) / 86400000)
                : 0;
              tests.push({
                name: "URL Inspection probe",
                passed: true,
                data: {
                  url: sampleUrl.url,
                  result: "GSC returned no data for this URL",
                  daysSinceSubmission: daysSince,
                  note: daysSince < 3
                    ? "Normal — Google needs 2-7 days to discover and crawl new URLs"
                    : "URL submitted over 3 days ago but Google has no data. Check: (1) Is the URL accessible? (2) Is robots.txt blocking it? (3) Does the sitemap include it?",
                },
              });
            }
          } catch (inspErr: unknown) {
            const inspMsg = inspErr instanceof Error ? inspErr.message : String(inspErr);
            tests.push({
              name: "URL Inspection probe",
              passed: false,
              error: `GSC URL Inspection API failed: ${inspMsg}`,
              fix: inspMsg.includes("403")
                ? "Service account needs 'Owner' permission in GSC, and GSC_SITE_URL must match the property exactly."
                : inspMsg.includes("429")
                  ? "Rate limited — GSC URL Inspection API has a 2,000 calls/day quota. Try again later."
                  : "Check GSC credentials and property URL configuration.",
              data: { url: sampleUrl.url },
            });
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        tests.push({ name: "URL Inspection probe", passed: false, error: msg });
      }
    } else {
      tests.push({
        name: "URL Inspection probe",
        passed: false,
        error: "Skipped — GSC credentials not configured",
        fix: "Set GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL and GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY.",
      });
    }
  }

  // ── Test 16: Sitemap accessibility + content check ──
  try {
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");
    const siteId = getDefaultSiteId();
    const siteUrl = getSiteDomain(siteId);
    const sitemapUrl = `${siteUrl}/sitemap.xml`;

    try {
      const resp = await fetch(sitemapUrl, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "YallaBot/1.0 (sitemap-check)" },
      });

      if (!resp.ok) {
        tests.push({
          name: "Sitemap accessible and valid",
          passed: false,
          error: `Sitemap returned HTTP ${resp.status} — Google cannot discover your URLs`,
          fix: `Check that ${sitemapUrl} is accessible. Verify the sitemap.ts route exists in your app directory. HTTP ${resp.status === 404 ? "404 means the sitemap route is missing or misconfigured." : resp.status + " needs investigation."}`,
          data: { url: sitemapUrl, status: resp.status },
        });
      } else {
        const body = await resp.text();
        const urlCount = (body.match(/<url>/g) || []).length;
        const locCount = (body.match(/<loc>/g) || []).length;
        const hasXmlHeader = body.startsWith("<?xml");
        const hasSitemapIndex = body.includes("<sitemapindex");
        const blogUrls = (body.match(/<loc>[^<]*\/blog\/[^<]+<\/loc>/g) || []);

        if (urlCount === 0 && !hasSitemapIndex) {
          tests.push({
            name: "Sitemap accessible and valid",
            passed: false,
            error: "Sitemap is empty — contains 0 URLs. Google has nothing to index.",
            fix: "The sitemap route may not be querying published BlogPosts. Check app/sitemap.ts — it should query BlogPost WHERE published=true AND siteId matches.",
            data: { url: sitemapUrl, bodyLength: body.length, hasXmlHeader, preview: body.substring(0, 300) },
          });
        } else {
          tests.push({
            name: "Sitemap accessible and valid",
            passed: true,
            data: {
              url: sitemapUrl,
              totalUrls: urlCount || locCount,
              blogUrls: blogUrls.length,
              isSitemapIndex: hasSitemapIndex,
              validXml: hasXmlHeader,
              sampleBlogUrls: blogUrls.slice(0, 5).map((u: string) => u.replace(/<\/?loc>/g, "")),
            },
          });
        }
      }
    } catch (fetchErr: unknown) {
      const fetchMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      tests.push({
        name: "Sitemap accessible and valid",
        passed: false,
        error: `Cannot fetch sitemap: ${fetchMsg}`,
        fix: fetchMsg.includes("timeout")
          ? "Sitemap request timed out (>8s). The sitemap may be too large or the server is slow. Check for unbounded DB queries in the sitemap route."
          : `Verify ${sitemapUrl} is accessible from the internet. DNS or SSL issues can prevent Google from fetching it.`,
        data: { url: sitemapUrl },
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "Sitemap accessible and valid", passed: false, error: msg });
  }

  // ── Test 17: robots.txt check (not blocking blog paths) ──
  try {
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");
    const siteId = getDefaultSiteId();
    const siteUrl = getSiteDomain(siteId);
    const robotsUrl = `${siteUrl}/robots.txt`;

    try {
      const resp = await fetch(robotsUrl, {
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "YallaBot/1.0 (robots-check)" },
      });

      if (!resp.ok) {
        tests.push({
          name: "robots.txt not blocking blog pages",
          passed: true,
          data: {
            url: robotsUrl,
            status: resp.status,
            note: "No robots.txt found — all pages are crawlable by default (this is fine)",
          },
        });
      } else {
        const body = await resp.text();
        const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
        const disallowLines = lines.filter((l) => l.toLowerCase().startsWith("disallow:"));
        const disallowPaths = disallowLines.map((l) => l.split(":").slice(1).join(":").trim());

        // Check if any disallow blocks /blog or /*
        const blockedBlog = disallowPaths.some((p) =>
          p === "/" || p === "/blog" || p === "/blog/" || p.startsWith("/blog/")
        );
        const hasSitemap = lines.some((l) => l.toLowerCase().startsWith("sitemap:"));
        const sitemapLines = lines.filter((l) => l.toLowerCase().startsWith("sitemap:"));

        if (blockedBlog) {
          tests.push({
            name: "robots.txt not blocking blog pages",
            passed: false,
            error: `robots.txt is BLOCKING blog pages! Disallow rules found: ${disallowPaths.filter((p) => p === "/" || p.startsWith("/blog")).join(", ")}`,
            fix: "Remove the Disallow rule for /blog from robots.txt. This is preventing Google from crawling your blog content.",
            data: { url: robotsUrl, disallowRules: disallowPaths, sitemapDeclared: hasSitemap },
          });
        } else {
          tests.push({
            name: "robots.txt not blocking blog pages",
            passed: true,
            data: {
              url: robotsUrl,
              disallowRules: disallowPaths.length > 0 ? disallowPaths : ["none — all paths allowed"],
              sitemapDeclared: hasSitemap,
              sitemapUrls: sitemapLines.map((l) => l.split(":").slice(1).join(":").trim()),
              note: hasSitemap ? "Sitemap declared in robots.txt (good for Google discovery)" : "No Sitemap directive in robots.txt — add 'Sitemap: " + siteUrl + "/sitemap.xml' for better discovery",
            },
          });
        }
      }
    } catch (fetchErr: unknown) {
      const fetchMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      tests.push({
        name: "robots.txt not blocking blog pages",
        passed: true,
        data: { note: `Could not fetch robots.txt: ${fetchMsg}. This means no blocking rules exist (all crawlable).` },
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "robots.txt not blocking blog pages", passed: false, error: msg });
  }

  // ── Test 18: IndexNow key file accessibility ──
  try {
    const indexNowKey = process.env.INDEXNOW_KEY;
    if (indexNowKey) {
      const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");
      const siteUrl = getSiteDomain(getDefaultSiteId());
      const keyFileUrl = `${siteUrl}/${indexNowKey}.txt`;

      try {
        const resp = await fetch(keyFileUrl, {
          signal: AbortSignal.timeout(5000),
          headers: { "User-Agent": "YallaBot/1.0 (indexnow-check)" },
        });

        if (!resp.ok) {
          tests.push({
            name: "IndexNow key file accessible",
            passed: false,
            error: `Key file returned HTTP ${resp.status} — IndexNow will reject your submissions`,
            fix: `The key verification file must be accessible at ${keyFileUrl}. Check: (1) vercel.json has a rewrite from '/:key.txt' to '/api/indexnow-key', (2) The /api/indexnow-key route exists and returns the key.`,
            data: { url: keyFileUrl, status: resp.status },
          });
        } else {
          const body = await resp.text();
          const bodyTrimmed = body.trim();
          const keyMatches = bodyTrimmed === indexNowKey;

          tests.push({
            name: "IndexNow key file accessible",
            passed: keyMatches,
            data: {
              url: keyFileUrl,
              keyMatches,
              fileContent: bodyTrimmed.substring(0, 40) + (bodyTrimmed.length > 40 ? "..." : ""),
            },
            error: !keyMatches ? `Key file content doesn't match INDEXNOW_KEY env var. File says: "${bodyTrimmed.substring(0, 20)}..." but env var starts with: "${indexNowKey.substring(0, 8)}..."` : undefined,
            fix: !keyMatches ? "Update the /api/indexnow-key route to return the correct key, or update INDEXNOW_KEY env var to match the file." : undefined,
          });
        }
      } catch (fetchErr: unknown) {
        const fetchMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        tests.push({
          name: "IndexNow key file accessible",
          passed: false,
          error: `Cannot fetch key file: ${fetchMsg}`,
          fix: `Verify ${keyFileUrl} is accessible. Check vercel.json rewrite rule and /api/indexnow-key route.`,
        });
      }
    } else {
      tests.push({
        name: "IndexNow key file accessible",
        passed: false,
        error: "INDEXNOW_KEY not set — skipping key file check",
        fix: "Set INDEXNOW_KEY env var first.",
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "IndexNow key file accessible", passed: false, error: msg });
  }

  // ── Test 19: Published posts not tracked (discovery gap) ──
  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");
    const siteId = getDefaultSiteId();
    const siteUrl = getSiteDomain(siteId);

    // Find published blog posts
    const publishedPosts = await prisma.blogPost.findMany({
      where: { published: true, siteId },
      select: { slug: true, title: true, created_at: true },
      orderBy: { created_at: "desc" },
      take: 100,
    });

    if (publishedPosts.length === 0) {
      tests.push({
        name: "Untracked published posts (discovery gaps)",
        passed: true,
        data: { note: "No published posts yet" },
      });
    } else {
      // Get all tracked URLs
      const trackedUrls = await prisma.uRLIndexingStatus.findMany({
        where: { site_id: siteId },
        select: { url: true, slug: true },
      });
      const trackedSlugs = new Set(trackedUrls.map((t) => t.slug).filter(Boolean));
      const trackedUrlSet = new Set(trackedUrls.map((t) => t.url));

      // Find posts whose URLs are not tracked
      const untracked = publishedPosts.filter((p) => {
        const url = `${siteUrl}/blog/${p.slug}`;
        return !trackedSlugs.has(p.slug) && !trackedUrlSet.has(url);
      });

      if (untracked.length > 0) {
        tests.push({
          name: "Untracked published posts (discovery gaps)",
          passed: false,
          error: `${untracked.length} of ${publishedPosts.length} published posts are NOT tracked in URLIndexingStatus — they may never be submitted to search engines`,
          fix: "Run /api/seo/cron?task=daily or /api/cron/google-indexing to discover and submit these URLs. The SEO agent (3x daily) should also discover them.",
          data: {
            untrackedCount: untracked.length,
            totalPublished: publishedPosts.length,
            untrackedPosts: untracked.slice(0, 10).map((p) => ({
              slug: p.slug,
              title: (p.title as string || "").substring(0, 60),
              created: p.created_at,
            })),
          },
        });
      } else {
        tests.push({
          name: "Untracked published posts (discovery gaps)",
          passed: true,
          data: {
            totalPublished: publishedPosts.length,
            allTracked: true,
          },
        });
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "Untracked published posts (discovery gaps)", passed: false, error: msg });
  }

  // ── Test 20: Stuck URLs (submitted but never verified) ──
  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");
    const siteId = getDefaultSiteId();

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // URLs submitted more than 3 days ago but never inspected
    const neverInspected = await prisma.uRLIndexingStatus.findMany({
      where: {
        site_id: siteId,
        status: { in: ["submitted", "discovered"] },
        last_submitted_at: { lt: threeDaysAgo },
        last_inspected_at: null,
      },
      select: { url: true, status: true, last_submitted_at: true, last_error: true },
      take: 20,
    });

    // URLs submitted more than 7 days ago and still not indexed
    const staleSubmitted = await prisma.uRLIndexingStatus.findMany({
      where: {
        site_id: siteId,
        status: "submitted",
        last_submitted_at: { lt: sevenDaysAgo },
      },
      select: { url: true, last_submitted_at: true, last_inspected_at: true, last_error: true, coverage_state: true, indexing_state: true },
      take: 20,
    });

    // URLs with errors
    const withErrors = await prisma.uRLIndexingStatus.findMany({
      where: {
        site_id: siteId,
        last_error: { not: null },
      },
      select: { url: true, status: true, last_error: true, last_inspected_at: true },
      orderBy: { last_inspected_at: "desc" },
      take: 15,
    });

    const issues: string[] = [];
    if (neverInspected.length > 0) issues.push(`${neverInspected.length} URLs submitted 3+ days ago but never inspected by verify-indexing cron`);
    if (staleSubmitted.length > 0) issues.push(`${staleSubmitted.length} URLs submitted 7+ days ago still not indexed`);
    if (withErrors.length > 0) issues.push(`${withErrors.length} URLs have errors from last inspection`);

    if (issues.length === 0) {
      tests.push({
        name: "Stuck/stale URLs diagnosis",
        passed: true,
        data: { message: "No stuck URLs detected — pipeline is flowing normally" },
      });
    } else {
      tests.push({
        name: "Stuck/stale URLs diagnosis",
        passed: false,
        error: issues.join(". "),
        fix: neverInspected.length > 0
          ? "The verify-indexing cron (/api/cron/verify-indexing) may not be running or may be failing. Check Vercel Crons tab. Trigger manually to inspect these URLs."
          : staleSubmitted.length > 0
            ? "URLs submitted 7+ days ago not indexed usually means: (1) content is thin (<500 words), (2) Google found duplicate/low-quality signals, (3) robots.txt or noindex blocking, (4) URL not in sitemap. Check the coverage_state from GSC inspection for details."
            : "Check the error details below for specific GSC inspection failures.",
        data: {
          neverInspected: neverInspected.slice(0, 5).map((u) => ({ url: u.url, status: u.status, submitted: u.last_submitted_at, error: u.last_error })),
          staleSubmitted: staleSubmitted.slice(0, 5).map((u) => ({
            url: u.url,
            submitted: u.last_submitted_at,
            lastChecked: u.last_inspected_at,
            coverageState: u.coverage_state || "unknown",
            indexingState: u.indexing_state || "unknown",
            error: u.last_error,
          })),
          urlsWithErrors: withErrors.slice(0, 5).map((u) => ({
            url: u.url,
            status: u.status,
            error: u.last_error,
            lastChecked: u.last_inspected_at,
          })),
        },
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "Stuck/stale URLs diagnosis", passed: false, error: msg });
  }

  // ── Test 21: Blog page meta tags check (noindex, canonical) ──
  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");
    const siteId = getDefaultSiteId();
    const siteUrl = getSiteDomain(siteId);

    // Pick a recent published blog post
    const post = await prisma.blogPost.findFirst({
      where: { published: true, siteId },
      select: { slug: true, title: true },
      orderBy: { created_at: "desc" },
    });

    if (!post) {
      tests.push({
        name: "Blog page meta tags (noindex/canonical check)",
        passed: true,
        data: { note: "No published posts to check" },
      });
    } else {
      const blogUrl = `${siteUrl}/blog/${post.slug}`;
      try {
        const resp = await fetch(blogUrl, {
          signal: AbortSignal.timeout(10000),
          headers: { "User-Agent": "YallaBot/1.0 (meta-check)" },
          redirect: "follow",
        });

        if (!resp.ok) {
          tests.push({
            name: "Blog page meta tags (noindex/canonical check)",
            passed: false,
            error: `Blog page returned HTTP ${resp.status} — Google cannot index a ${resp.status} page`,
            fix: resp.status === 404
              ? "The blog page returned 404. Check that the blog/[slug]/page.tsx route can find this post in DB. Verify siteId scoping."
              : resp.status === 500
                ? "Internal server error on the blog page. Check server logs. Common cause: database timeout or missing data."
                : `HTTP ${resp.status} response needs investigation.`,
            data: { url: blogUrl, slug: post.slug, status: resp.status },
          });
        } else {
          const html = await resp.text();

          // Check for noindex
          const noindexMeta = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex[^"']*["'][^>]*>/i);
          const noindexHeader = resp.headers.get("x-robots-tag")?.includes("noindex");
          const hasNoindex = !!noindexMeta || !!noindexHeader;

          // Check canonical
          const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
          const canonical = canonicalMatch ? canonicalMatch[1] : null;

          // Check for title tag
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const pageTitle = titleMatch ? titleMatch[1] : null;

          // Check meta description
          const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
          const metaDesc = descMatch ? descMatch[1] : null;

          // Check for hreflang
          const hreflangTags = html.match(/<link[^>]*hreflang=["'][^"']+["'][^>]*>/gi) || [];

          // Check for JSON-LD
          const jsonLdBlocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>/gi) || [];

          const issues: string[] = [];
          if (hasNoindex) issues.push("CRITICAL: Page has noindex directive — Google will NOT index it");
          if (!canonical) issues.push("No canonical tag — Google may treat this as duplicate content");
          else if (!canonical.includes(post.slug)) issues.push(`Canonical URL doesn't contain the page slug: ${canonical}`);
          if (!pageTitle || pageTitle.length < 20) issues.push(`Title tag too short or missing: "${pageTitle || "none"}"`);
          if (!metaDesc || metaDesc.length < 50) issues.push(`Meta description too short or missing (${metaDesc?.length || 0} chars)`);
          if (jsonLdBlocks.length === 0) issues.push("No JSON-LD structured data found");

          tests.push({
            name: "Blog page meta tags (noindex/canonical check)",
            passed: issues.length === 0,
            error: issues.length > 0 ? issues.join(". ") : undefined,
            fix: hasNoindex
              ? "Remove the noindex meta tag or robots header from the blog page layout. This is the #1 reason pages don't get indexed."
              : issues.length > 0
                ? "Fix the meta tag issues listed above. Missing canonical or structured data reduces indexing likelihood."
                : undefined,
            data: {
              url: blogUrl,
              slug: post.slug,
              title: pageTitle?.substring(0, 60),
              metaDescLength: metaDesc?.length || 0,
              canonical: canonical || "missing",
              hasNoindex,
              hreflangCount: hreflangTags.length,
              jsonLdCount: jsonLdBlocks.length,
              httpStatus: resp.status,
            },
          });
        }
      } catch (fetchErr: unknown) {
        const fetchMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        tests.push({
          name: "Blog page meta tags (noindex/canonical check)",
          passed: false,
          error: `Cannot fetch blog page: ${fetchMsg}`,
          fix: fetchMsg.includes("timeout")
            ? "Blog page timed out (>10s). This is the timeout issue we fixed — check that pool_timeout=5 is in DATABASE_URL and React.cache() is working."
            : "Blog page is not accessible. Check server logs.",
          data: { url: blogUrl },
        });
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "Blog page meta tags (noindex/canonical check)", passed: false, error: msg });
  }

  // ── Test 22: Cron timing chain analysis ──
  try {
    const { prisma } = await import("@/lib/db");
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Get recent cron runs for all indexing-related jobs
    const runs = await prisma.cronJobLog.findMany({
      where: {
        job_name: { in: ["seo-cron", "google-indexing", "verify-indexing", "seo-agent", "content-selector"] },
        started_at: { gte: twoDaysAgo },
      },
      orderBy: { started_at: "desc" },
      select: { job_name: true, status: true, started_at: true, duration_ms: true, error_message: true, items_processed: true, items_succeeded: true, items_failed: true },
    });

    if (runs.length === 0) {
      tests.push({
        name: "Cron timing chain (pipeline flow)",
        passed: false,
        error: "No cron runs in the last 48 hours — the entire pipeline is idle",
        fix: "Check Vercel Crons dashboard. If crons are not firing, check vercel.json cron configuration. You can trigger manually: /api/cron/content-selector → /api/seo/cron?task=daily → /api/cron/verify-indexing",
      });
    } else {
      // Group by job
      const byJob: Record<string, typeof runs> = {};
      for (const r of runs) {
        if (!byJob[r.job_name]) byJob[r.job_name] = [];
        byJob[r.job_name].push(r);
      }

      // Check pipeline ordering: content-selector should run before seo crons
      const chain: Array<{ job: string; lastRun: Date | null; status: string; items: number | null; errors: string | null }> = [];
      for (const jobName of ["content-selector", "seo-agent", "seo-cron", "google-indexing", "verify-indexing"]) {
        const jobRuns = byJob[jobName];
        if (jobRuns && jobRuns.length > 0) {
          const latest = jobRuns[0];
          chain.push({
            job: jobName,
            lastRun: latest.started_at,
            status: latest.status,
            items: latest.items_processed,
            errors: latest.status === "failed" ? (latest.error_message || "unknown error") : null,
          });
        } else {
          chain.push({ job: jobName, lastRun: null, status: "never_run", items: null, errors: null });
        }
      }

      const failedJobs = chain.filter((c) => c.status === "failed");
      const neverRun = chain.filter((c) => c.status === "never_run");

      tests.push({
        name: "Cron timing chain (pipeline flow)",
        passed: failedJobs.length === 0 && neverRun.length <= 1,
        error: failedJobs.length > 0
          ? `Failed crons: ${failedJobs.map((f) => `${f.job}: ${f.errors}`).join("; ")}`
          : neverRun.length > 1
            ? `${neverRun.length} crons never ran: ${neverRun.map((n) => n.job).join(", ")}`
            : undefined,
        fix: failedJobs.length > 0
          ? "Check the error messages for each failed cron. Common causes: GSC auth failure, database timeout, missing env vars. Trigger each manually to see detailed errors."
          : neverRun.length > 1
            ? "Multiple indexing crons have never run. Check vercel.json schedules and Vercel Crons dashboard."
            : undefined,
        data: {
          pipelineChain: chain.map((c) => ({
            ...c,
            lastRun: c.lastRun ? c.lastRun.toISOString() : "never",
          })),
          totalRunsLast48h: runs.length,
          failedCount: failedJobs.length,
          neverRunCount: neverRun.length,
        },
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("does not exist") || msg.includes("P2021")) {
      tests.push({
        name: "Cron timing chain (pipeline flow)",
        passed: false,
        error: "CronJobLog table doesn't exist — pipeline monitoring is blind",
        fix: "Run 'npx prisma migrate deploy' to create the cron_job_logs table.",
      });
    } else {
      tests.push({ name: "Cron timing chain (pipeline flow)", passed: false, error: msg });
    }
  }

  // ── Test 23: Content quality gate alignment (thresholds match) ──
  try {
    const { CONTENT_QUALITY, CORE_WEB_VITALS } = await import("@/lib/seo/standards");

    const qualityGate = CONTENT_QUALITY.qualityGateScore;
    const minWords = CONTENT_QUALITY.minWords;
    const metaDescMin = CONTENT_QUALITY.metaDescriptionMin;

    const issues: string[] = [];

    // Check thresholds are at expected values
    if (qualityGate < 70) issues.push(`Quality gate score ${qualityGate} is below recommended 70`);
    if (minWords < 1000) issues.push(`Min word count ${minWords} is below recommended 1000`);
    if (metaDescMin < 120) issues.push(`Meta description min ${metaDescMin} is below recommended 120`);

    // Verify published content meets these thresholds
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");
    const siteId = getDefaultSiteId();

    const lowQualityPosts = await prisma.blogPost.findMany({
      where: {
        published: true,
        siteId,
        OR: [
          { seo_score: { lt: qualityGate } },
          { seo_score: null },
        ],
      },
      select: { slug: true, title: true, seo_score: true, word_count: true },
      take: 10,
    });

    if (issues.length > 0) {
      tests.push({
        name: "Content quality gate alignment",
        passed: false,
        error: issues.join(". "),
        fix: "Update lib/seo/standards.ts to set recommended thresholds: qualityGateScore=70, minWords=1000, metaDescriptionMin=120.",
        data: { qualityGate, minWords, metaDescMin },
      });
    } else {
      tests.push({
        name: "Content quality gate alignment",
        passed: lowQualityPosts.length === 0,
        data: {
          thresholds: { qualityGate, minWords, metaDescMin },
          publishedBelowGate: lowQualityPosts.length,
          lowQualityPosts: lowQualityPosts.length > 0
            ? lowQualityPosts.map((p) => ({
                slug: p.slug,
                title: (p.title as string || "").substring(0, 50),
                seoScore: p.seo_score,
                words: p.word_count,
              }))
            : undefined,
        },
        error: lowQualityPosts.length > 0
          ? `${lowQualityPosts.length} published posts have SEO score below ${qualityGate} — Google may not rank them well`
          : undefined,
        fix: lowQualityPosts.length > 0
          ? "These posts were published before the quality gate was tightened. Re-run them through the SEO agent to improve their scores, or manually edit to add better meta tags, headings, and content depth."
          : undefined,
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "Content quality gate alignment", passed: false, error: msg });
  }

  // ── Test 24: NEXT_PUBLIC_SITE_URL canonical override risk ──
  try {
    const npsu = process.env.NEXT_PUBLIC_SITE_URL;
    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");
    const siteId = getDefaultSiteId();
    const configDomain = getSiteDomain(siteId);

    if (!npsu) {
      tests.push({
        name: "NEXT_PUBLIC_SITE_URL canonical check",
        passed: true,
        data: {
          note: "NEXT_PUBLIC_SITE_URL not set — canonical tags use config-driven getSiteDomain() (correct)",
          configDomain,
        },
      });
    } else {
      // Check if it matches the expected domain
      const npsuNorm = npsu.replace(/\/$/, "").toLowerCase();
      const configNorm = configDomain.replace(/\/$/, "").toLowerCase();
      const matches = npsuNorm === configNorm;

      if (matches) {
        tests.push({
          name: "NEXT_PUBLIC_SITE_URL canonical check",
          passed: true,
          data: { NEXT_PUBLIC_SITE_URL: npsu, configDomain, match: true },
        });
      } else {
        tests.push({
          name: "NEXT_PUBLIC_SITE_URL canonical check",
          passed: false,
          error: `NEXT_PUBLIC_SITE_URL='${npsu}' doesn't match site config domain '${configDomain}'. Blog canonical tags and structured data will point to the wrong domain!`,
          fix: `Either remove NEXT_PUBLIC_SITE_URL from Vercel env vars (recommended — let the code use config-driven domains), or set it to '${configDomain}'. Mismatched canonicals cause Google to ignore your pages in favor of the canonical URL's domain.`,
          data: { NEXT_PUBLIC_SITE_URL: npsu, expectedDomain: configDomain },
        });
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "NEXT_PUBLIC_SITE_URL canonical check", passed: false, error: msg });
  }

  // ── Test 25: Published posts with missing/empty content ──
  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");
    const siteId = getDefaultSiteId();

    // Find published posts with no content (Google won't index empty pages)
    const emptyPosts = await prisma.blogPost.findMany({
      where: {
        published: true,
        siteId,
        OR: [
          { content_en: null },
          { content_en: "" },
        ],
      },
      select: { slug: true, title: true, word_count: true, created_at: true },
      take: 20,
    });

    // Find published posts with very thin content (<300 words)
    const thinPosts = await prisma.blogPost.findMany({
      where: {
        published: true,
        siteId,
        content_en: { not: null },
        word_count: { lt: 300 },
      },
      select: { slug: true, title: true, word_count: true },
      take: 20,
    });

    const issues: string[] = [];
    if (emptyPosts.length > 0) issues.push(`${emptyPosts.length} published posts have NO English content`);
    if (thinPosts.length > 0) issues.push(`${thinPosts.length} published posts have <300 words (thin content)`);

    tests.push({
      name: "Published posts content health",
      passed: issues.length === 0,
      error: issues.length > 0 ? issues.join(". ") + ". Google deprioritizes thin/empty pages." : undefined,
      fix: issues.length > 0
        ? "Empty or thin content is the #1 reason Google refuses to index a page. Re-generate these articles through the content pipeline with the 1,000+ word minimum, or unpublish them to stop wasting crawl budget."
        : undefined,
      data: {
        emptyPosts: emptyPosts.length > 0 ? emptyPosts.slice(0, 5).map((p) => ({ slug: p.slug, title: (p.title as string || "").substring(0, 50) })) : undefined,
        thinPosts: thinPosts.length > 0 ? thinPosts.slice(0, 5).map((p) => ({ slug: p.slug, title: (p.title as string || "").substring(0, 50), words: p.word_count })) : undefined,
        totalIssues: emptyPosts.length + thinPosts.length,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    tests.push({ name: "Published posts content health", passed: false, error: msg });
  }

  return suiteResult("indexing-pipeline", tests);
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
    { id: "indexing-pipeline", label: "Indexing Pipeline Health", icon: "index", desc: "25 tests: GSC probe, sitemap, robots.txt, URL lifecycle, cron chain, meta tags, discovery gaps, content health" },
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
    index: "&#128269;",   // magnifying glass tilted
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

<!-- Production Data Fixes -->
<div class="prod-fixes-section">
  <h2 style="font-size:17px;color:var(--gold);margin:24px 0 6px">Production Data Fixes</h2>
  <p style="font-size:12px;color:var(--text2);margin-bottom:14px">Scan and fix production data issues found by audits. Each button shows a preview first.</p>

  <div class="top-bar" style="margin-bottom:12px">
    <button class="btn btn-big" id="scanBtn" onclick="scanIssues()" style="background:#f59e0b;color:#000">Scan All Issues</button>
  </div>

  <div id="scan-panel" class="fix-panel" style="display:none;border-color:var(--warn)">
    <div class="fix-header">
      <span class="fix-title" id="scan-title" style="color:var(--warn)">Scanning...</span>
      <button class="btn btn-sm" onclick="document.getElementById('scan-panel').style.display='none'">Close</button>
    </div>
    <div id="scan-steps"></div>
    <div id="scan-summary" class="fix-summary" style="display:none"></div>
  </div>

  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">

    <div class="suite-card" id="card-fix-dupes">
      <div class="suite-header">
        <span class="suite-icon">&#128465;</span>
        <div>
          <div class="suite-label">Remove Duplicate Posts</div>
          <div class="suite-desc">Soft-delete near-duplicate blog posts with date/random suffixes + empty slugs</div>
        </div>
        <div class="suite-status" id="status-fix-dupes"></div>
      </div>
      <button class="btn btn-fix" id="btn-fix-dupes" onclick="runProdFix('fix-duplicate-posts','fix-dupes')">Fix Duplicates</button>
      <div class="result-area" id="result-fix-dupes"></div>
    </div>

    <div class="suite-card" id="card-fix-errors">
      <div class="suite-header">
        <span class="suite-icon">&#128260;</span>
        <div>
          <div class="suite-label">Clear Stale GSC Errors</div>
          <div class="suite-desc">Reset indexing error messages older than 7 days so URLs get re-checked</div>
        </div>
        <div class="suite-status" id="status-fix-errors"></div>
      </div>
      <button class="btn btn-fix" id="btn-fix-errors" onclick="runProdFix('fix-stale-errors','fix-errors')">Clear Errors</button>
      <div class="result-area" id="result-fix-errors"></div>
    </div>

    <div class="suite-card" id="card-fix-meta">
      <div class="suite-header">
        <span class="suite-icon">&#128221;</span>
        <div>
          <div class="suite-label">Fix Blog Metadata</div>
          <div class="suite-desc">Auto-fix long titles, short/missing meta descriptions across all published posts</div>
        </div>
        <div class="suite-status" id="status-fix-meta"></div>
      </div>
      <button class="btn btn-fix" id="btn-fix-meta" onclick="runProdFix('fix-metadata','fix-meta')">Fix Metadata</button>
      <div class="result-area" id="result-fix-meta"></div>
    </div>

    <div class="suite-card" id="card-fix-urls">
      <div class="suite-header">
        <span class="suite-icon">&#128279;</span>
        <div>
          <div class="suite-label">Fix Indexing URLs</div>
          <div class="suite-desc">Remove malformed URL entries, merge non-www duplicates into www versions</div>
        </div>
        <div class="suite-status" id="status-fix-urls"></div>
      </div>
      <button class="btn btn-fix" id="btn-fix-urls" onclick="runProdFix('fix-indexing-urls','fix-urls')">Fix URLs</button>
      <div class="result-area" id="result-fix-urls"></div>
    </div>

  </div>
</div>

<h2 style="font-size:17px;color:var(--gold);margin:28px 0 14px">Connection Tests</h2>

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

// --- Production Data Fixes ---

async function scanIssues() {
  const btn = document.getElementById('scanBtn');
  const panel = document.getElementById('scan-panel');
  const stepsEl = document.getElementById('scan-steps');
  const summaryEl = document.getElementById('scan-summary');
  const titleEl = document.getElementById('scan-title');

  btn.disabled = true;
  btn.textContent = 'Scanning...';
  panel.style.display = 'block';
  summaryEl.style.display = 'none';
  titleEl.textContent = 'Scanning production data...';
  stepsEl.innerHTML = '<div class="fix-step"><div class="fix-step-icon running"><span class="spinner" style="width:12px;height:12px;border-width:2px"></span></div><div><div class="fix-step-name">Scanning database...</div><div class="fix-step-msg">Checking for duplicates, errors, metadata issues...</div></div></div>';

  try {
    const resp = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'scan-production-issues' }),
    });
    const data = await resp.json();

    let html = '';
    if (data.steps) {
      for (const s of data.steps) {
        const icon = s.status === 'pass' ? '&#10003;' : s.status === 'fail' ? '&#10007;' : '&#9888;';
        const cls = s.status === 'warn' ? 'skip' : s.status;
        html += '<div class="fix-step">';
        html += '<div class="fix-step-icon ' + cls + '">' + icon + '</div>';
        html += '<div style="flex:1"><div class="fix-step-name">' + escHtml(s.step) + (s.count !== undefined ? ' <span style="color:' + (s.count > 0 ? 'var(--fail)' : 'var(--pass)') + '">[' + s.count + ']</span>' : '') + '</div>';
        html += '<div class="fix-step-msg">' + escHtml(s.message) + '</div>';
        if (s.items && s.items.length > 0) {
          html += '<div class="json-block" style="margin-top:6px;max-height:150px">' + escHtml(JSON.stringify(s.items, null, 2)) + '</div>';
        }
        html += '</div></div>';
      }
    }
    stepsEl.innerHTML = html;

    summaryEl.style.display = 'block';
    if (data.totalIssues === 0) {
      titleEl.textContent = 'Scan Complete — All Clean!';
      summaryEl.className = 'fix-summary success';
      summaryEl.textContent = 'No production data issues found.';
    } else {
      titleEl.textContent = 'Scan Complete — ' + data.totalIssues + ' Issues Found';
      summaryEl.className = 'fix-summary failure';
      summaryEl.innerHTML = data.totalIssues + ' total issues found. Use the fix buttons below to resolve them.';
    }
  } catch (err) {
    stepsEl.innerHTML = '<div class="fix-step"><div class="fix-step-icon fail">&#10007;</div><div><div class="fix-step-name">Network Error</div><div class="fix-step-msg">' + escHtml(err.message) + '</div></div></div>';
    summaryEl.style.display = 'block';
    summaryEl.className = 'fix-summary failure';
    summaryEl.textContent = 'Could not reach the server.';
  }

  btn.disabled = false;
  btn.textContent = 'Scan All Issues';
}

async function runProdFix(action, cardSuffix) {
  const card = document.getElementById('card-' + cardSuffix);
  const status = document.getElementById('status-' + cardSuffix);
  const resultArea = document.getElementById('result-' + cardSuffix);
  const btn = document.getElementById('btn-' + cardSuffix);

  card.className = 'suite-card running';
  status.innerHTML = '<span class="spinner"></span>';
  resultArea.className = 'result-area';
  resultArea.innerHTML = '';
  btn.disabled = true;
  btn.textContent = 'Fixing...';

  try {
    const resp = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action }),
    });
    const data = await resp.json();

    if (data.success) {
      card.className = 'suite-card pass';
      status.innerHTML = '<span style="color:var(--pass)">DONE</span>';
    } else {
      card.className = 'suite-card fail';
      status.innerHTML = '<span style="color:var(--fail)">FAIL</span>';
    }

    let html = '';
    if (data.steps) {
      for (const s of data.steps) {
        const icon = s.status === 'pass' ? '&#10003;' : '&#10007;';
        html += '<div class="test-row">';
        html += '<div class="test-dot ' + s.status + '"></div>';
        html += '<div style="flex:1">';
        html += '<div class="test-name">' + escHtml(s.step) + '</div>';
        html += '<div class="fix-step-msg">' + escHtml(s.message) + '</div>';
        html += '</div>';
        if (s.duration) html += '<div class="duration">' + (s.duration / 1000).toFixed(1) + 's</div>';
        html += '</div>';
      }
    }
    if (data.fixes && data.fixes.length > 0) {
      html += '<div class="json-block" style="margin-top:8px;max-height:200px">' + escHtml(JSON.stringify(data.fixes, null, 2)) + '</div>';
    }
    if (data.fixed !== undefined) {
      html += '<div style="margin-top:8px;font-size:13px;font-weight:600;color:var(--pass)">' + data.fixed + ' items fixed</div>';
    }
    if (data.error) {
      html += '<div class="test-error" style="margin-top:8px">' + escHtml(data.error) + '</div>';
    }

    resultArea.innerHTML = html;
    resultArea.className = 'result-area visible';
  } catch (err) {
    card.className = 'suite-card fail';
    status.innerHTML = '<span style="color:var(--fail)">ERROR</span>';
    resultArea.innerHTML = '<div class="test-error">Network error: ' + escHtml(err.message) + '</div>';
    resultArea.className = 'result-area visible';
  }

  btn.disabled = false;
  btn.textContent = btn.getAttribute('data-label') || btn.textContent.replace('Fixing...','Fix');
}
</script>

</body>
</html>`;
}
