/**
 * Ensure required database tables exist.
 *
 * Some tables were added in recent migrations that may not have been applied
 * to the production Supabase database. Instead of crashing, these helpers
 * run CREATE TABLE IF NOT EXISTS to self-heal.
 *
 * This is safe to call multiple times — all statements are idempotent.
 */

export async function ensureGscPagePerformance(): Promise<void> {
  const { prisma } = await import("@/lib/db");
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "gsc_page_performance" (
        "id" TEXT NOT NULL,
        "site_id" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "date" DATE NOT NULL,
        "clicks" INTEGER NOT NULL DEFAULT 0,
        "impressions" INTEGER NOT NULL DEFAULT 0,
        "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "gsc_page_performance_pkey" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "gsc_page_performance_site_id_url_date_key"
        ON "gsc_page_performance"("site_id", "url", "date");
      CREATE INDEX IF NOT EXISTS "gsc_page_performance_site_id_date_idx"
        ON "gsc_page_performance"("site_id", "date");
      CREATE INDEX IF NOT EXISTS "gsc_page_performance_site_id_url_idx"
        ON "gsc_page_performance"("site_id", "url");
    `);
  } catch (err) {
    console.warn("[ensure-tables] Failed to ensure gsc_page_performance:", err instanceof Error ? err.message : err);
  }
}

export async function ensurePerformanceAudits(): Promise<void> {
  const { prisma } = await import("@/lib/db");
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "performance_audits" (
        "id" TEXT NOT NULL,
        "siteId" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "strategy" TEXT NOT NULL DEFAULT 'mobile',
        "performanceScore" DOUBLE PRECISION,
        "accessibilityScore" DOUBLE PRECISION,
        "bestPracticesScore" DOUBLE PRECISION,
        "seoScore" DOUBLE PRECISION,
        "lcpMs" DOUBLE PRECISION,
        "clsScore" DOUBLE PRECISION,
        "inpMs" DOUBLE PRECISION,
        "fcpMs" DOUBLE PRECISION,
        "tbtMs" DOUBLE PRECISION,
        "speedIndex" DOUBLE PRECISION,
        "diagnostics" JSONB,
        "runId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "performance_audits_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "performance_audits_siteId_createdAt_idx"
        ON "performance_audits"("siteId", "createdAt");
      CREATE INDEX IF NOT EXISTS "performance_audits_runId_idx"
        ON "performance_audits"("runId");
    `);
  } catch (err) {
    console.warn("[ensure-tables] Failed to ensure performance_audits:", err instanceof Error ? err.message : err);
  }
}

export async function ensureAutoFixLogs(): Promise<void> {
  const { prisma } = await import("@/lib/db");
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "auto_fix_logs" (
        "id" TEXT NOT NULL,
        "siteId" TEXT NOT NULL,
        "targetType" TEXT NOT NULL,
        "targetId" TEXT NOT NULL,
        "fixType" TEXT NOT NULL,
        "agent" TEXT NOT NULL,
        "before" JSONB,
        "after" JSONB,
        "success" BOOLEAN NOT NULL DEFAULT true,
        "error" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "auto_fix_logs_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "auto_fix_logs_siteId_createdAt_idx"
        ON "auto_fix_logs"("siteId", "createdAt");
      CREATE INDEX IF NOT EXISTS "auto_fix_logs_fixType_idx"
        ON "auto_fix_logs"("fixType");
    `);
  } catch (err) {
    console.warn("[ensure-tables] Failed to ensure auto_fix_logs:", err instanceof Error ? err.message : err);
  }
}
