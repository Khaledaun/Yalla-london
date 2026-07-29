export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Full Pipeline Run — End-to-End Article Generation + Publishing + Indexing
 *
 * POST /api/admin/full-pipeline-run
 *
 * Body (all optional):
 * {
 *   "keyword": "specific keyword to write about",
 *   "siteId": "yalla-london",
 *   "locale": "en",
 *   "singleLanguage": false
 * }
 *
 * If no keyword is provided, picks from TopicProposal queue or template topics.
 *
 * GET /api/admin/full-pipeline-run?status=true
 *   Returns the last pipeline run status from CronJobLog.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

// POST — Run the full pipeline
export const POST = withAdminAuth(async (request: NextRequest) => {
  const startTime = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const { keyword, siteId, locale, singleLanguage } = body as {
      keyword?: string;
      siteId?: string;
      locale?: string;
      singleLanguage?: boolean;
    };

    const { runFullPipeline } = await import(
      "@/lib/content-pipeline/full-pipeline-runner"
    );

    const result = await runFullPipeline({
      timeoutMs: 55_000,
      keyword,
      siteId,
      locale,
      singleLanguage,
    });

    return NextResponse.json(
      {
        ...result,
        timestamp: new Date().toISOString(),
      },
      { status: result.success ? 200 : 500 },
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[full-pipeline-run] Route error:", errMsg);

    return NextResponse.json(
      {
        success: false,
        message: errMsg,
        steps: [],
        stopReason: "error",
        published: false,
        indexed: false,
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
});

// GET — Status check / last run info
export const GET = withAdminAuth(async () => {
  try {
    const { prisma } = await import("@/lib/db");

    // Get the last pipeline run log
    const lastRun = await prisma.cronJobLog.findFirst({
      where: { job_name: "full-pipeline-run" },
      orderBy: { started_at: "desc" },
    });

    // Get active drafts in the pipeline (not terminal)
    let activeDrafts = 0;
    let reservoirCount = 0;
    try {
      activeDrafts = await prisma.articleDraft.count({
        where: {
          current_phase: {
            in: ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"],
          },
        },
      });
      reservoirCount = await prisma.articleDraft.count({
        where: { current_phase: "reservoir" },
      });
    } catch {
      // Table may not exist
    }

    // Get today's published count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    let publishedToday = 0;
    try {
      publishedToday = await prisma.blogPost.count({
        where: { published: true, created_at: { gte: todayStart } },
      });
    } catch {
      // Best effort
    }

    return NextResponse.json({
      success: true,
      data: {
        lastRun: lastRun
          ? {
              status: lastRun.status,
              started_at: lastRun.started_at,
              completed_at: lastRun.completed_at,
              duration_ms: lastRun.duration_ms,
              result_summary: lastRun.result_summary,
              error_message: lastRun.error_message,
            }
          : null,
        pipeline: {
          activeDrafts,
          reservoirCount,
          publishedToday,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
