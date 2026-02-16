/**
 * Content Generation Monitor API
 *
 * GET  — Returns all active ArticleDrafts with phase details, phase distribution,
 *        recent content-builder cron logs, AND pipeline health diagnostics.
 * POST — Triggers the content-builder cron manually and returns its result.
 */
import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

// GET — Live generation status + health diagnostics
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const { searchParams } = new URL(request.url);
    const siteFilter = searchParams.get("site_id");

    // 1. Active drafts (not in terminal states)
    let activeDrafts: Array<Record<string, unknown>> = [];
    let recentDrafts: Array<Record<string, unknown>> = [];
    let tableMissing = false;

    try {
      activeDrafts = await prisma.articleDraft.findMany({
        where: {
          current_phase: {
            notIn: ["published", "rejected"],
          },
          ...(siteFilter ? { site_id: siteFilter } : {}),
        },
        orderBy: [{ updated_at: "desc" }],
        take: 50,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("does not exist") || msg.includes("P2021")) {
        tableMissing = true;
      }
    }

    // 2. Recently completed/rejected drafts (last 24 hours)
    if (!tableMissing) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      try {
        recentDrafts = await prisma.articleDraft.findMany({
          where: {
            current_phase: { in: ["published", "rejected", "reservoir"] },
            updated_at: { gte: oneDayAgo },
            ...(siteFilter ? { site_id: siteFilter } : {}),
          },
          orderBy: [{ updated_at: "desc" }],
          take: 30,
        });
      } catch {
        // Non-fatal
      }
    }

    // 3. Phase distribution counts
    const phaseCounts: Record<string, number> = {};
    try {
      const counts = (await prisma.$queryRawUnsafe(
        `SELECT current_phase, COUNT(*) as count FROM article_drafts GROUP BY current_phase`,
      )) as Array<{ current_phase: string; count: bigint }>;
      for (const row of counts) {
        phaseCounts[row.current_phase] = Number(row.count);
      }
    } catch {
      // Table may not exist yet
    }

    // 4. Recent content-builder cron logs (last 50 runs)
    let recentLogs: Array<Record<string, unknown>> = [];
    try {
      recentLogs = await prisma.cronJobLog.findMany({
        where: {
          job_name: { in: ["content-builder", "content-selector"] },
        },
        orderBy: { started_at: "desc" },
        take: 50,
      });
    } catch {
      // CronJobLog table may not exist
    }

    // 5. Reservoir + published today counts
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let reservoirCount = 0;
    let publishedTodayCount = 0;
    try {
      reservoirCount = await prisma.articleDraft.count({
        where: { current_phase: "reservoir" },
      });
      publishedTodayCount = await prisma.articleDraft.count({
        where: {
          current_phase: "published",
          published_at: { gte: todayStart },
        },
      });
    } catch {
      // Best effort
    }

    // ─── Pipeline Health Diagnostics ───────────────────────────────
    // Surface exactly why the pipeline isn't producing articles.
    const health: {
      ai_configured: boolean;
      ai_provider: string | null;
      feature_flags: Record<string, boolean | null>;
      topics_available: number;
      blockers: string[];
    } = {
      ai_configured: false,
      ai_provider: null,
      feature_flags: {},
      topics_available: 0,
      blockers: [],
    };

    // Check if article_drafts table exists
    if (tableMissing) {
      health.blockers.push(
        "Database migration needed: article_drafts table does not exist. Deploy the latest code to run the migration, or run 'npx prisma migrate deploy' manually.",
      );
    }

    // Check AI provider availability
    try {
      const { getProvidersStatus } = await import("@/lib/ai/provider");
      const providers = await getProvidersStatus();
      const configuredProvider = Object.entries(providers).find(
        ([, v]) => v.configured,
      );
      health.ai_configured = !!configuredProvider;
      health.ai_provider = configuredProvider ? configuredProvider[0] : null;
      if (!configuredProvider) {
        health.blockers.push(
          "No AI provider configured. Add XAI_API_KEY (Grok, cheapest), ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY to Vercel environment variables.",
        );
      }
    } catch {
      health.blockers.push(
        "Could not check AI provider status. The AI provider module may have an error.",
      );
    }

    // Check feature flags that control the pipeline
    try {
      const { getFeatureFlagValue } = await import("@/lib/feature-flags");
      const pipelineFlag = await getFeatureFlagValue("FEATURE_CONTENT_PIPELINE");
      const publishFlag = await getFeatureFlagValue("FEATURE_AUTO_PUBLISHING");
      const topicFlag = await getFeatureFlagValue("FEATURE_TOPICS_RESEARCH");
      health.feature_flags = {
        FEATURE_CONTENT_PIPELINE: pipelineFlag,
        FEATURE_AUTO_PUBLISHING: publishFlag,
        FEATURE_TOPICS_RESEARCH: topicFlag,
      };
      if (pipelineFlag === false) {
        health.blockers.push(
          "FEATURE_CONTENT_PIPELINE is disabled. Enable it in the Feature Flags dashboard page.",
        );
      }
      if (publishFlag === false) {
        health.blockers.push(
          "FEATURE_AUTO_PUBLISHING is disabled. Articles won't be published automatically.",
        );
      }
    } catch {
      // Non-fatal
    }

    // Check if there are topics ready for content generation
    try {
      health.topics_available = await prisma.topicProposal.count({
        where: {
          status: { in: ["planned", "queued", "ready", "proposed"] },
          ...(siteFilter ? { site_id: siteFilter } : {}),
        },
      });
      if (health.topics_available === 0 && activeDrafts.length === 0) {
        health.blockers.push(
          "No topics available for generation. Run Weekly Topics from the dashboard, or wait for the Monday 4 AM UTC cron.",
        );
      }
    } catch {
      // Non-fatal
    }

    // Shape active drafts for the frontend
    const shapeDraft = (d: Record<string, unknown>) => ({
      id: d.id,
      keyword: d.keyword,
      locale: d.locale,
      site_id: d.site_id,
      current_phase: d.current_phase,
      phase_attempts: d.phase_attempts,
      last_error: d.last_error,
      topic_title: d.topic_title,
      quality_score: d.quality_score,
      seo_score: d.seo_score,
      word_count: d.word_count,
      readability_score: d.readability_score,
      content_depth_score: d.content_depth_score,
      generation_strategy: d.generation_strategy,
      paired_draft_id: d.paired_draft_id,
      rejection_reason: d.rejection_reason,
      sections_total: d.sections_total,
      sections_completed: d.sections_completed,
      created_at: d.created_at,
      updated_at: d.updated_at,
      phase_started_at: d.phase_started_at,
      completed_at: d.completed_at,
    });

    return NextResponse.json({
      success: true,
      data: {
        active_drafts: activeDrafts.map(shapeDraft),
        recent_drafts: recentDrafts.map(shapeDraft),
        phase_counts: phaseCounts,
        recent_logs: recentLogs.map((l) => ({
          id: l.id,
          job_name: l.job_name,
          status: l.status,
          started_at: l.started_at,
          completed_at: l.completed_at,
          duration_ms: l.duration_ms,
          items_processed: l.items_processed,
          items_succeeded: l.items_succeeded,
          items_failed: l.items_failed,
          error_message: l.error_message,
          result_summary: l.result_summary,
        })),
        summary: {
          reservoir_count: reservoirCount,
          published_today: publishedTodayCount,
          total_active: activeDrafts.length,
        },
        health,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[content-generation-monitor] GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});

// POST — Trigger content-builder or content-selector directly (no HTTP round-trip)
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => ({}));
    const action = (body as Record<string, unknown>).action || "trigger_build";

    if (action === "trigger_build") {
      const { runContentBuilder } = await import(
        "@/lib/content-pipeline/build-runner"
      );
      const result = await runContentBuilder({ timeoutMs: 53_000 });

      return NextResponse.json({
        success: result.success,
        action: "trigger_build",
        result,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "trigger_selector") {
      const { runContentSelector } = await import(
        "@/lib/content-pipeline/select-runner"
      );
      const result = await runContentSelector({ timeoutMs: 53_000 });

      return NextResponse.json({
        success: result.success,
        action: "trigger_selector",
        result,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: "Unknown action: " + action },
      { status: 400 },
    );
  } catch (error) {
    console.error("[content-generation-monitor] POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
