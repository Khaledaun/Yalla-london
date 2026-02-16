export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

/**
 * POST /api/admin/run-migration
 *
 * Creates missing pipeline-critical tables directly via SQL.
 * Safe to run multiple times — all statements use IF NOT EXISTS.
 * Protected by admin auth.
 */
export const POST = withAdminAuth(async (_request: NextRequest) => {
  const results: Array<{ table: string; status: string }> = [];
  const errors: string[] = [];

  try {
    const { prisma } = await import("@/lib/db");

    // ── article_drafts ──────────────────────────────────────────────
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "article_drafts" (
          "id" TEXT NOT NULL,
          "site_id" TEXT NOT NULL,
          "keyword" TEXT NOT NULL,
          "locale" TEXT NOT NULL DEFAULT 'en',
          "topic_title" TEXT,
          "current_phase" TEXT NOT NULL DEFAULT 'research',
          "phase_attempts" INTEGER NOT NULL DEFAULT 0,
          "last_error" TEXT,
          "sections_completed" INTEGER NOT NULL DEFAULT 0,
          "sections_total" INTEGER NOT NULL DEFAULT 0,
          "research_data" JSONB,
          "outline_data" JSONB,
          "sections_data" JSONB,
          "assembled_html" TEXT,
          "assembled_html_alt" TEXT,
          "seo_meta" JSONB,
          "images_data" JSONB,
          "quality_score" DOUBLE PRECISION,
          "seo_score" DOUBLE PRECISION,
          "word_count" INTEGER,
          "readability_score" DOUBLE PRECISION,
          "content_depth_score" DOUBLE PRECISION,
          "topic_proposal_id" TEXT,
          "ai_model_used" TEXT,
          "generation_strategy" TEXT,
          "paired_draft_id" TEXT,
          "blog_post_id" TEXT,
          "published_at" TIMESTAMP(3),
          "rejection_reason" TEXT,
          "needs_review" BOOLEAN NOT NULL DEFAULT true,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "phase_started_at" TIMESTAMP(3),
          "completed_at" TIMESTAMP(3),
          CONSTRAINT "article_drafts_pkey" PRIMARY KEY ("id")
        )
      `);
      // Indexes
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "article_drafts_current_phase_site_id_idx" ON "article_drafts"("current_phase", "site_id")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "article_drafts_current_phase_created_at_idx" ON "article_drafts"("current_phase", "created_at")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "article_drafts_quality_score_idx" ON "article_drafts"("quality_score")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "article_drafts_site_id_current_phase_idx" ON "article_drafts"("site_id", "current_phase")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "article_drafts_created_at_idx" ON "article_drafts"("created_at")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "article_drafts_paired_draft_id_idx" ON "article_drafts"("paired_draft_id")`);

      // Verify
      const count = await prisma.articleDraft.count();
      results.push({ table: "article_drafts", status: `OK (${count} rows)` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ table: "article_drafts", status: `ERROR: ${msg}` });
      errors.push(`article_drafts: ${msg}`);
    }

    // ── feature_flags ───────────────────────────────────────────────
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "feature_flags" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "enabled" BOOLEAN NOT NULL DEFAULT false,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
        )
      `);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "feature_flags_name_key" ON "feature_flags"("name")`);

      // Seed default flags
      await prisma.$executeRawUnsafe(`
        INSERT INTO "feature_flags" ("id", "name", "description", "enabled", "created_at", "updated_at")
        VALUES
          ('flag_content_pipeline', 'FEATURE_CONTENT_PIPELINE', 'Master toggle for content generation pipeline', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
          ('flag_auto_publishing', 'FEATURE_AUTO_PUBLISHING', 'Automatic daily content publishing', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
          ('flag_topics_research', 'FEATURE_TOPICS_RESEARCH', 'AI-powered topic research and suggestions', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
          ('flag_ai_seo_audit', 'FEATURE_AI_SEO_AUDIT', 'AI-powered SEO audit functionality', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
          ('flag_seo', 'FEATURE_SEO', 'SEO optimization tools and monitoring', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("name") DO NOTHING
      `);

      const count = await prisma.featureFlag.count();
      results.push({ table: "feature_flags", status: `OK (${count} flags)` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ table: "feature_flags", status: `ERROR: ${msg}` });
      errors.push(`feature_flags: ${msg}`);
    }

    // ── ModelProvider ───────────────────────────────────────────────
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ModelProvider" (
          "id" TEXT NOT NULL,
          "site_id" TEXT,
          "name" TEXT NOT NULL,
          "display_name" TEXT NOT NULL,
          "provider_type" TEXT NOT NULL,
          "api_endpoint" TEXT,
          "api_key_encrypted" TEXT,
          "api_version" TEXT,
          "rate_limits_json" JSONB,
          "cost_per_token" DOUBLE PRECISION,
          "capabilities" TEXT[],
          "model_config_json" JSONB,
          "is_active" BOOLEAN NOT NULL DEFAULT true,
          "last_tested_at" TIMESTAMP(3),
          "test_status" TEXT,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ModelProvider_pkey" PRIMARY KEY ("id")
        )
      `);
      results.push({ table: "ModelProvider", status: "OK" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ table: "ModelProvider", status: `ERROR: ${msg}` });
      errors.push(`ModelProvider: ${msg}`);
    }

    // ── cron_job_logs (may already exist) ────────────────────────────
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "cron_job_logs" (
          "id" TEXT NOT NULL,
          "site_id" TEXT,
          "job_name" TEXT NOT NULL,
          "job_type" TEXT NOT NULL DEFAULT 'scheduled',
          "status" TEXT NOT NULL DEFAULT 'running',
          "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "completed_at" TIMESTAMP(3),
          "duration_ms" INTEGER,
          "result_summary" JSONB,
          "items_processed" INTEGER NOT NULL DEFAULT 0,
          "items_succeeded" INTEGER NOT NULL DEFAULT 0,
          "items_failed" INTEGER NOT NULL DEFAULT 0,
          "error_message" TEXT,
          "error_stack" TEXT,
          "sites_processed" TEXT[],
          "sites_skipped" TEXT[],
          "timed_out" BOOLEAN NOT NULL DEFAULT false,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "cron_job_logs_pkey" PRIMARY KEY ("id")
        )
      `);
      results.push({ table: "cron_job_logs", status: "OK" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ table: "cron_job_logs", status: `ERROR: ${msg}` });
      errors.push(`cron_job_logs: ${msg}`);
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: errors.length === 0
        ? `All ${results.length} tables created/verified successfully`
        : `Completed with ${errors.length} error(s)`,
      results,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[run-migration] Fatal error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        results,
        errors,
      },
      { status: 500 },
    );
  }
});
