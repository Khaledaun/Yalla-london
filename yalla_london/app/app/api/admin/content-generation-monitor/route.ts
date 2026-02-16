/**
 * Content Generation Monitor API
 *
 * GET  — Returns all active ArticleDrafts with phase details, phase distribution,
 *        and recent content-builder cron logs for the monitoring dashboard.
 * POST — Triggers the content-builder cron manually and returns its result.
 */
import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

// GET — Live generation status
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const { searchParams } = new URL(request.url);
    const siteFilter = searchParams.get("site_id");

    // 1. Active drafts (not in terminal states)
    const activeDrafts = await prisma.articleDraft.findMany({
      where: {
        current_phase: {
          notIn: ["published", "rejected"],
        },
        ...(siteFilter ? { site_id: siteFilter } : {}),
      },
      orderBy: [{ updated_at: "desc" }],
      take: 50,
    });

    // 2. Recently completed/rejected drafts (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentDrafts = await prisma.articleDraft.findMany({
      where: {
        current_phase: { in: ["published", "rejected", "reservoir"] },
        updated_at: { gte: oneDayAgo },
        ...(siteFilter ? { site_id: siteFilter } : {}),
      },
      orderBy: [{ updated_at: "desc" }],
      take: 30,
    });

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

// POST — Trigger content-builder manually
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => ({}));
    const action = (body as Record<string, unknown>).action || "trigger_build";

    if (action === "trigger_build") {
      // Call the content-builder cron endpoint directly
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000");

      const cronSecret = process.env.CRON_SECRET;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (cronSecret) {
        headers["Authorization"] = `Bearer ${cronSecret}`;
      }

      const res = await fetch(`${baseUrl}/api/cron/content-builder`, {
        method: "POST",
        headers,
      });

      const result = await res.json();

      return NextResponse.json({
        success: true,
        action: "trigger_build",
        result,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === "trigger_selector") {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000");

      const cronSecret = process.env.CRON_SECRET;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (cronSecret) {
        headers["Authorization"] = `Bearer ${cronSecret}`;
      }

      const res = await fetch(`${baseUrl}/api/cron/content-selector`, {
        method: "POST",
        headers,
      });

      const result = await res.json();

      return NextResponse.json({
        success: true,
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
