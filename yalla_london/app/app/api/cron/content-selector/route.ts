export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Content Selector — Reservoir-to-BlogPost Publisher
 *
 * Thin cron route wrapper. Core logic lives in @/lib/content-pipeline/select-runner.
 *
 * Runs daily at 08:30 UTC. Selects highest-quality articles from the
 * ArticleDraft reservoir and promotes them to published BlogPosts.
 */

import { NextRequest, NextResponse } from "next/server";

async function handleContentSelector(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Healthcheck mode
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    try {
      const { prisma } = await import("@/lib/db");
      const reservoirCount = await prisma.articleDraft.count({
        where: { current_phase: "reservoir" },
      }).catch(() => 0);
      const publishedCount = await prisma.articleDraft.count({
        where: { current_phase: "published" },
      }).catch(() => 0);
      return NextResponse.json({
        status: "healthy",
        endpoint: "content-selector",
        reservoirCount,
        publishedCount,
        minQualityScore: 50,
        maxPerRun: 2,
        timestamp: new Date().toISOString(),
      });
    } catch {
      return NextResponse.json(
        { status: "unhealthy", endpoint: "content-selector", note: "ArticleDraft table may not exist yet." },
        { status: 503 },
      );
    }
  }

  // Run the selector
  const { runContentSelector } = await import("@/lib/content-pipeline/select-runner");
  const result = await runContentSelector({ timeoutMs: 53_000 });

  // Fire failure hook if the selector returned a failure
  if (!result.success && result.message) {
    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    onCronFailure({ jobName: "content-selector", error: result.message }).catch(() => {});
  }

  return NextResponse.json(
    { ...result, timestamp: new Date().toISOString() },
    { status: result.success ? 200 : 500 },
  );
}

export async function GET(request: NextRequest) {
  return handleContentSelector(request);
}

export async function POST(request: NextRequest) {
  return handleContentSelector(request);
}
