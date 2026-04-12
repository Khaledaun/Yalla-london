/**
 * CTO Agent Admin API
 *
 * GET  — List recent CTO agent tasks (from AgentTask table)
 * POST — Trigger a CTO task on demand
 *
 * Protected by requireAdmin.
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET — list recent CTO tasks
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { requireAdmin } = await import("@/lib/admin-middleware");
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 100);
    const siteId = url.searchParams.get("siteId") || undefined;

    const where: Record<string, unknown> = { agentType: "cto" };
    if (siteId) where.siteId = siteId;

    const tasks = await prisma.agentTask.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Summary stats
    const stats = await prisma.agentTask.groupBy({
      by: ["status"],
      where: { agentType: "cto" },
      _count: { id: true },
    });

    const statusCounts: Record<string, number> = {};
    for (const stat of stats) {
      statusCounts[stat.status] = stat._count.id;
    }

    return NextResponse.json({
      success: true,
      tasks: tasks.map((t) => ({
        id: t.id,
        taskType: t.taskType,
        priority: t.priority,
        status: t.status,
        description: t.description,
        findings: t.findings,
        followUps: t.followUps,
        testsRun: t.testsRun,
        changes: t.changes,
        durationMs: t.durationMs,
        siteId: t.siteId,
        errorMessage: t.errorMessage,
        createdAt: t.createdAt,
        completedAt: t.completedAt,
      })),
      stats: statusCounts,
      total: tasks.length,
    });
  } catch (err) {
    console.error("[admin/agent/cto] GET error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { success: false, error: "Failed to fetch CTO tasks" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST — trigger a CTO task on demand
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const { requireAdmin } = await import("@/lib/admin-middleware");
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const taskType = (body.taskType as string) || "maintenance";
    const siteId = (body.siteId as string) || undefined;

    // Validate task type
    const validTypes = ["maintenance", "typecheck", "smoke_tests", "cron_health", "pipeline_health"];
    if (!validTypes.includes(taskType)) {
      return NextResponse.json(
        { success: false, error: `Invalid taskType. Valid: ${validTypes.join(", ")}` },
        { status: 400 },
      );
    }

    // Resolve siteId
    let effectiveSiteId = siteId;
    if (!effectiveSiteId) {
      const { getDefaultSiteId } = await import("@/config/sites");
      effectiveSiteId = getDefaultSiteId();
    }

    // Run the task with a 270s budget (300s maxDuration - 30s buffer for response)
    const TASK_BUDGET_MS = 270_000;

    const { runCTOTask } = await import("@/lib/agents/cto-brain");
    const result = await runCTOTask(effectiveSiteId, taskType, TASK_BUDGET_MS);

    return NextResponse.json({
      success: true,
      taskType,
      siteId: effectiveSiteId,
      phase: result.phase,
      durationMs: result.durationMs,
      findings: result.findings,
      actions: result.actionsPerformed,
      errors: result.errors,
    });
  } catch (err) {
    console.error("[admin/agent/cto] POST error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { success: false, error: "Failed to run CTO task" },
      { status: 500 },
    );
  }
}
