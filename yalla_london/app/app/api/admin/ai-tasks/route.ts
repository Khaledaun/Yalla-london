import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

// ── AI Task Runner API ──────────────────────────────────────────────────────────
// GET  → list available tasks + recent runs
// POST → run a task or explain a result

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { TASK_REGISTRY } = await import("@/lib/ai/task-runner");

    // Get recent runs from ApiUsageLog
    let recentRuns: Array<Record<string, unknown>> = [];
    try {
      const { prisma } = await import("@/lib/db");
      const logs = await (prisma as Record<string, unknown> as {
        apiUsageLog: { findMany: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>> }
      }).apiUsageLog.findMany({
        where: {
          calledFrom: 'lib/ai/task-runner',
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      recentRuns = logs.map((l: Record<string, unknown>) => ({
        id: l.id,
        taskType: l.taskType,
        provider: l.provider,
        model: l.model,
        tokens: l.totalTokens,
        cost: l.estimatedCostUsd,
        success: l.success,
        createdAt: l.createdAt,
      }));
    } catch {
      // ApiUsageLog may not exist yet
    }

    return NextResponse.json({
      tasks: TASK_REGISTRY.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
      })),
      recentRuns,
    });
  } catch (err) {
    console.warn("[ai-tasks] GET error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'explain') {
      const { explainResult } = await import("@/lib/ai/task-runner");
      const explanation = await explainResult(body.output);
      return NextResponse.json({ explanation });
    }

    // Default: run task
    const { runTask } = await import("@/lib/ai/task-runner");
    const output = await runTask({
      taskId: body.taskId,
      prompt: body.prompt,
      siteId: body.siteId,
      context: body.context,
    });

    return NextResponse.json(output);
  } catch (err) {
    console.warn("[ai-tasks] POST error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Task execution failed" }, { status: 500 });
  }
}
