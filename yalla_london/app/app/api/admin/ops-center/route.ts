export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Operations Center API
 *
 * GET  — Returns full intelligence report (system health, cron status, pipeline state, alerts, timeline, insights)
 * POST — Executes Fix Now actions (trigger crons, run migrations, generate content)
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

// ─── GET — Intelligence Report ──────────────────────────────────────────

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    // Check if requesting sweeper logs specifically
    const url = new URL(request.url);
    if (url.searchParams.get("view") === "sweeper-logs") {
      const { getSweeperLogs } = await import("@/lib/ops/failure-hooks");
      const limit = parseInt(url.searchParams.get("limit") || "50", 10);
      const logs = await getSweeperLogs(limit);
      return NextResponse.json({ success: true, data: { sweeperLogs: logs } });
    }

    const { generateIntelligenceReport } = await import("@/lib/ops/intelligence-engine");
    const { CRON_JOBS, PIPELINES, AGENTS, DATA_FLOWS, getDailySchedule } = await import("@/lib/ops/system-registry");
    const { getSweeperLogs } = await import("@/lib/ops/failure-hooks");

    const [report, sweeperLogs] = await Promise.all([
      generateIntelligenceReport(),
      getSweeperLogs(30),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...report,
        sweeperLogs,
        registry: {
          cronJobs: CRON_JOBS,
          pipelines: PIPELINES,
          agents: AGENTS,
          dataFlows: DATA_FLOWS,
          dailySchedule: getDailySchedule(),
        },
      },
    });
  } catch (error) {
    console.error("[ops-center] GET error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
});

// ─── POST — Fix Now Actions ─────────────────────────────────────────────

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => ({}));
    const action = (body as Record<string, unknown>).action as string;

    if (!action) {
      return NextResponse.json({ success: false, error: "No action specified" }, { status: 400 });
    }

    const startTime = Date.now();

    // Fix: Run database migration
    if (action === "fix-database") {
      const { prisma } = await import("@/lib/db");
      const results: Array<{ table: string; status: string }> = [];

      const tables = [
        { name: "article_drafts", sql: `CREATE TABLE IF NOT EXISTS "article_drafts" ("id" TEXT NOT NULL, "site_id" TEXT NOT NULL, "keyword" TEXT NOT NULL, "locale" TEXT NOT NULL DEFAULT 'en', "topic_title" TEXT, "current_phase" TEXT NOT NULL DEFAULT 'research', "phase_attempts" INTEGER NOT NULL DEFAULT 0, "last_error" TEXT, "sections_completed" INTEGER NOT NULL DEFAULT 0, "sections_total" INTEGER NOT NULL DEFAULT 0, "research_data" JSONB, "outline_data" JSONB, "sections_data" JSONB, "assembled_html" TEXT, "assembled_html_alt" TEXT, "seo_meta" JSONB, "images_data" JSONB, "quality_score" DOUBLE PRECISION, "seo_score" DOUBLE PRECISION, "word_count" INTEGER, "readability_score" DOUBLE PRECISION, "content_depth_score" DOUBLE PRECISION, "topic_proposal_id" TEXT, "ai_model_used" TEXT, "generation_strategy" TEXT, "paired_draft_id" TEXT, "blog_post_id" TEXT, "published_at" TIMESTAMP(3), "rejection_reason" TEXT, "needs_review" BOOLEAN NOT NULL DEFAULT true, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "phase_started_at" TIMESTAMP(3), "completed_at" TIMESTAMP(3), CONSTRAINT "article_drafts_pkey" PRIMARY KEY ("id"))` },
        { name: "feature_flags", sql: `CREATE TABLE IF NOT EXISTS "feature_flags" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "enabled" BOOLEAN NOT NULL DEFAULT false, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id"))` },
        { name: "cron_job_logs", sql: `CREATE TABLE IF NOT EXISTS "cron_job_logs" ("id" TEXT NOT NULL, "site_id" TEXT, "job_name" TEXT NOT NULL, "job_type" TEXT NOT NULL DEFAULT 'scheduled', "status" TEXT NOT NULL DEFAULT 'running', "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completed_at" TIMESTAMP(3), "duration_ms" INTEGER, "result_summary" JSONB, "items_processed" INTEGER NOT NULL DEFAULT 0, "items_succeeded" INTEGER NOT NULL DEFAULT 0, "items_failed" INTEGER NOT NULL DEFAULT 0, "error_message" TEXT, "error_stack" TEXT, "sites_processed" TEXT[], "sites_skipped" TEXT[], "timed_out" BOOLEAN NOT NULL DEFAULT false, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "cron_job_logs_pkey" PRIMARY KEY ("id"))` },
      ];

      for (const t of tables) {
        try {
          await prisma.$executeRawUnsafe(t.sql);
          results.push({ table: t.name, status: "OK" });
        } catch (e) {
          results.push({ table: t.name, status: `Error: ${(e as Error).message}` });
        }
      }

      return NextResponse.json({
        success: true,
        action,
        results,
        durationMs: Date.now() - startTime,
      });
    }

    // Fix: Generate topics
    if (action === "generate-topics") {
      try {
        const requestUrl = new URL(request.url);
        const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
        const cronSecret = process.env.CRON_SECRET;
        const headers: Record<string, string> = {};
        if (cronSecret) headers["Authorization"] = `Bearer ${cronSecret}`;

        const res = await fetch(`${baseUrl}/api/cron/weekly-topics`, { method: "POST", headers });
        const ct = res.headers.get("content-type") || "";
        const result = ct.includes("json") ? await res.json() : { status: res.status, note: "Non-JSON response" };

        return NextResponse.json({ success: true, action, result, durationMs: Date.now() - startTime });
      } catch (e) {
        return NextResponse.json({ success: false, action, error: (e as Error).message, durationMs: Date.now() - startTime });
      }
    }

    // Fix: Run sweeper agent (direct call)
    if (action === "run-sweeper") {
      const { runSweeper } = await import("@/lib/content-pipeline/sweeper");
      const result = await runSweeper();
      return NextResponse.json({ success: result.success, action, result, durationMs: Date.now() - startTime });
    }

    // Fix: Generate content (direct call)
    if (action === "generate-content") {
      const { runContentBuilder } = await import("@/lib/content-pipeline/build-runner");
      const result = await runContentBuilder({ timeoutMs: 53_000 });
      return NextResponse.json({ success: result.success, action, result, durationMs: Date.now() - startTime });
    }

    // Fix: Publish ready articles
    if (action === "publish-ready") {
      const { runContentSelector } = await import("@/lib/content-pipeline/select-runner");
      const result = await runContentSelector({ timeoutMs: 53_000 });
      return NextResponse.json({ success: result.success, action, result, durationMs: Date.now() - startTime });
    }

    // Fix: Run SEO agent
    if (action === "run-seo-agent") {
      try {
        const requestUrl = new URL(request.url);
        const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
        const cronSecret = process.env.CRON_SECRET;
        const headers: Record<string, string> = {};
        if (cronSecret) headers["Authorization"] = `Bearer ${cronSecret}`;

        const res = await fetch(`${baseUrl}/api/cron/seo-agent`, { method: "POST", headers });
        const ct = res.headers.get("content-type") || "";
        const result = ct.includes("json") ? await res.json() : { status: res.status, note: "Non-JSON response" };

        return NextResponse.json({ success: true, action, result, durationMs: Date.now() - startTime });
      } catch (e) {
        return NextResponse.json({ success: false, action, error: (e as Error).message, durationMs: Date.now() - startTime });
      }
    }

    // Fix: Run specific cron by ID
    if (action === "run-cron") {
      const cronId = (body as Record<string, unknown>).cronId as string;
      const { CRON_JOBS } = await import("@/lib/ops/system-registry");
      const cron = CRON_JOBS.find((c) => c.id === cronId);
      if (!cron) {
        return NextResponse.json({ success: false, error: `Unknown cron: ${cronId}` }, { status: 404 });
      }

      try {
        const requestUrl = new URL(request.url);
        const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
        const cronSecret = process.env.CRON_SECRET;
        const headers: Record<string, string> = {};
        if (cronSecret) headers["Authorization"] = `Bearer ${cronSecret}`;

        const res = await fetch(`${baseUrl}${cron.route}`, { method: "POST", headers });
        const ct = res.headers.get("content-type") || "";
        const result = ct.includes("json") ? await res.json() : { status: res.status, note: "Non-JSON response" };

        return NextResponse.json({ success: true, action, cronId, result, durationMs: Date.now() - startTime });
      } catch (e) {
        return NextResponse.json({ success: false, action, cronId, error: (e as Error).message, durationMs: Date.now() - startTime });
      }
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error("[ops-center] POST error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
});
