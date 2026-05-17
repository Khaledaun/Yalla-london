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

  // Quick check — skip DDL if table already exists
  try {
    await prisma.$queryRawUnsafe(`SELECT 1 FROM "gsc_page_performance" LIMIT 1`);
    return;
  } catch {
    // Table doesn't exist — create it below
  }

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
      )
    `);
  } catch (err) {
    console.warn("[ensure-tables] Failed to create gsc_page_performance table:", err instanceof Error ? err.message : err);
    return;
  }

  for (const sql of [
    `CREATE UNIQUE INDEX IF NOT EXISTS "gsc_page_performance_site_id_url_date_key" ON "gsc_page_performance"("site_id", "url", "date")`,
    `CREATE INDEX IF NOT EXISTS "gsc_page_performance_site_id_date_idx" ON "gsc_page_performance"("site_id", "date")`,
    `CREATE INDEX IF NOT EXISTS "gsc_page_performance_site_id_url_idx" ON "gsc_page_performance"("site_id", "url")`,
  ]) {
    try { await prisma.$executeRawUnsafe(sql); } catch { /* index creation is non-fatal */ }
  }
}

export async function ensurePerformanceAudits(): Promise<void> {
  const { prisma } = await import("@/lib/db");

  // Quick check — skip DDL if table already exists
  try {
    await prisma.$queryRawUnsafe(`SELECT 1 FROM "performance_audits" LIMIT 1`);
    return; // Table exists — nothing to do
  } catch {
    // Table doesn't exist — create it below
  }

  // Split each statement into a separate call. Some Supabase connection poolers
  // (PgBouncer in transaction mode) reject multi-statement raw SQL.
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
      )
    `);
  } catch (err) {
    console.warn("[ensure-tables] Failed to create performance_audits table:", err instanceof Error ? err.message : err);
    return; // Don't try indexes if table creation failed
  }

  // Create indexes individually (non-fatal if these fail)
  for (const sql of [
    `CREATE INDEX IF NOT EXISTS "performance_audits_siteId_createdAt_idx" ON "performance_audits"("siteId", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS "performance_audits_runId_idx" ON "performance_audits"("runId")`,
    `CREATE INDEX IF NOT EXISTS "performance_audits_url_strategy_idx" ON "performance_audits"("url", "strategy")`,
  ]) {
    try { await prisma.$executeRawUnsafe(sql); } catch { /* index creation is non-fatal */ }
  }
}

export async function ensureAutoFixLogs(): Promise<void> {
  const { prisma } = await import("@/lib/db");

  try {
    await prisma.$queryRawUnsafe(`SELECT 1 FROM "auto_fix_logs" LIMIT 1`);
    return;
  } catch {
    // Table doesn't exist — create it below
  }

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
      )
    `);
  } catch (err) {
    console.warn("[ensure-tables] Failed to create auto_fix_logs table:", err instanceof Error ? err.message : err);
    return;
  }

  for (const sql of [
    `CREATE INDEX IF NOT EXISTS "auto_fix_logs_siteId_createdAt_idx" ON "auto_fix_logs"("siteId", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS "auto_fix_logs_fixType_idx" ON "auto_fix_logs"("fixType")`,
  ]) {
    try { await prisma.$executeRawUnsafe(sql); } catch { /* index creation is non-fatal */ }
  }
}
