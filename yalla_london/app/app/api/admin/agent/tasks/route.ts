/**
 * AgentTask list/detail API.
 *
 * GET /api/admin/agent/tasks
 *   Query: agentType=ceo|cto, status=running|completed|failed|needs_approval|rejected,
 *          siteId, since=ISO, limit (default 50, max 200)
 *   Returns: { ok, tasks: [...], counts: { total, byStatus, byAgent } }
 *
 * GET /api/admin/agent/tasks?id=<taskId>
 *   Returns: { ok, task, tree } — single task plus its full goal tree (root → leaves)
 *
 * Admin-only. Read-only — no mutation endpoints (use /approvals for actions).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { prisma } from "@/lib/db";
import { getTaskTree, getRootTaskId } from "@/lib/agents/task-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const params = request.nextUrl.searchParams;
  const id = params.get("id");

  // ─── Single-task detail mode ──────────────────────────────────────────
  if (id) {
    try {
      const rootId = await getRootTaskId(id);
      const tree = await getTaskTree(rootId);
      if (!tree) {
        return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 });
      }
      const task = await prisma.agentTask.findUnique({
        where: { id },
        select: {
          id: true,
          agentType: true,
          taskType: true,
          priority: true,
          status: true,
          description: true,
          siteId: true,
          conversationId: true,
          parentTaskId: true,
          budgetUsd: true,
          spentUsd: true,
          input: true,
          output: true,
          errorMessage: true,
          findings: true,
          changes: true,
          durationMs: true,
          createdAt: true,
          completedAt: true,
        },
      });
      return NextResponse.json({ ok: true, task, tree, rootId });
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: err instanceof Error ? err.message : String(err) },
        { status: 500 },
      );
    }
  }

  // ─── List mode ────────────────────────────────────────────────────────
  const agentType = params.get("agentType") || undefined;
  const status = params.get("status") || undefined;
  const siteId = params.get("siteId") || undefined;
  const sinceRaw = params.get("since");
  const since = sinceRaw ? new Date(sinceRaw) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const limitRaw = params.get("limit");
  const limit = limitRaw
    ? Math.min(200, Math.max(1, parseInt(limitRaw, 10) || 50))
    : 50;

  const where: Record<string, unknown> = { createdAt: { gte: since } };
  if (agentType) where.agentType = agentType;
  if (status) where.status = status;
  if (siteId) where.siteId = siteId;

  try {
    const [tasks, allCounts, byAgent, byStatus] = await Promise.all([
      prisma.agentTask.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          agentType: true,
          taskType: true,
          priority: true,
          status: true,
          description: true,
          siteId: true,
          parentTaskId: true,
          budgetUsd: true,
          spentUsd: true,
          durationMs: true,
          createdAt: true,
          completedAt: true,
          errorMessage: true,
        },
      }),
      prisma.agentTask.count({ where: { createdAt: { gte: since } } }),
      prisma.agentTask.groupBy({
        by: ["agentType"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      prisma.agentTask.groupBy({
        by: ["status"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
    ]);

    const totalSpend = tasks.reduce((sum, t) => sum + (t.spentUsd || 0), 0);

    return NextResponse.json({
      ok: true,
      tasks,
      counts: {
        total: allCounts,
        filtered: tasks.length,
        byAgent: Object.fromEntries(byAgent.map((r) => [r.agentType, r._count._all])),
        byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
        totalSpendUsd: Math.round(totalSpend * 10000) / 10000,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
