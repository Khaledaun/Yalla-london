/**
 * AgentTask helpers — goal ancestry + per-task budget + approval persistence.
 *
 * Three paperclip-inspired patterns, layered on top of the existing AgentTask
 * model (May 24 2026):
 *
 *   1. Goal ancestry — `parentTaskId` links a task to its parent goal.
 *      `getTaskTree(rootId)` walks the tree. Useful for showing "this article
 *      rewrite is part of CTR optimization Q2".
 *
 *   2. Per-task budget — `budgetUsd` caps total AI spend across a task and
 *      all its descendants. `recordTaskSpend(taskId, usd)` accumulates;
 *      `checkTaskBudget(taskId)` returns whether further AI calls are allowed.
 *
 *   3. Approval persistence — `persistPendingApproval(...)` creates a
 *      `status="needs_approval"` AgentTask row so the in-memory pendingApprovals
 *      array survives the request/response cycle and surfaces in the cockpit
 *      Approvals page.
 */

import { prisma } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Goal ancestry
// ─────────────────────────────────────────────────────────────────────────────

export interface TaskTreeNode {
  id: string;
  agentType: string;
  taskType: string;
  status: string;
  description: string;
  budgetUsd: number | null;
  spentUsd: number;
  createdAt: Date;
  completedAt: Date | null;
  children: TaskTreeNode[];
}

/**
 * Walk the AgentTask tree rooted at `rootId`. Returns the root + all descendants.
 * Capped at 5 levels deep to bound runtime on pathological trees.
 */
export async function getTaskTree(rootId: string): Promise<TaskTreeNode | null> {
  const root = await prisma.agentTask.findUnique({
    where: { id: rootId },
    select: {
      id: true,
      agentType: true,
      taskType: true,
      status: true,
      description: true,
      budgetUsd: true,
      spentUsd: true,
      createdAt: true,
      completedAt: true,
    },
  });
  if (!root) return null;

  // BFS up to 5 levels deep — pragmatic cap for cockpit display.
  const result: TaskTreeNode = { ...root, children: [] };
  const queue: Array<{ node: TaskTreeNode; depth: number }> = [{ node: result, depth: 0 }];
  while (queue.length > 0) {
    const { node, depth } = queue.shift()!;
    if (depth >= 5) continue;
    const children = await prisma.agentTask.findMany({
      where: { parentTaskId: node.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        agentType: true,
        taskType: true,
        status: true,
        description: true,
        budgetUsd: true,
        spentUsd: true,
        createdAt: true,
        completedAt: true,
      },
    });
    for (const c of children) {
      const childNode: TaskTreeNode = { ...c, children: [] };
      node.children.push(childNode);
      queue.push({ node: childNode, depth: depth + 1 });
    }
  }
  return result;
}

/**
 * Walk UP from a task to find the root ancestor (no parent). Returns root id.
 */
export async function getRootTaskId(taskId: string): Promise<string> {
  let current = taskId;
  for (let i = 0; i < 10; i++) {
    const task = await prisma.agentTask.findUnique({
      where: { id: current },
      select: { parentTaskId: true },
    });
    if (!task || !task.parentTaskId) return current;
    current = task.parentTaskId;
  }
  return current; // fallback after depth cap
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Per-task budget
// ─────────────────────────────────────────────────────────────────────────────

export interface TaskBudgetStatus {
  taskId: string;
  budgetUsd: number | null;
  spentUsd: number;
  remainingUsd: number | null;
  allowed: boolean;
  reason?: string;
}

/**
 * Check whether a task has budget remaining for additional AI spend.
 *
 * Walks UP the tree — if any ancestor has a budget and is over-spent, this
 * task fails the check. Mirrors paperclip's pattern: budget caps cascade
 * down the goal tree.
 *
 * When `budgetUsd` is null, no cap is enforced (allowed = true).
 */
export async function checkTaskBudget(taskId: string): Promise<TaskBudgetStatus> {
  // Walk up to root, checking each ancestor's budget.
  let currentId: string | null = taskId;
  let firstTask: { id: string; budgetUsd: number | null; spentUsd: number; parentTaskId: string | null } | null = null;

  for (let depth = 0; depth < 10 && currentId; depth++) {
    const task = await prisma.agentTask.findUnique({
      where: { id: currentId },
      select: { id: true, budgetUsd: true, spentUsd: true, parentTaskId: true },
    });
    if (!task) break;
    if (depth === 0) firstTask = task;

    if (task.budgetUsd !== null && task.spentUsd >= task.budgetUsd) {
      return {
        taskId,
        budgetUsd: firstTask?.budgetUsd ?? null,
        spentUsd: firstTask?.spentUsd ?? 0,
        remainingUsd: 0,
        allowed: false,
        reason: `Ancestor task ${task.id} over budget ($${task.spentUsd.toFixed(2)} / $${task.budgetUsd.toFixed(2)})`,
      };
    }
    currentId = task.parentTaskId;
  }

  if (!firstTask) {
    return { taskId, budgetUsd: null, spentUsd: 0, remainingUsd: null, allowed: true };
  }

  const remainingUsd = firstTask.budgetUsd === null ? null : firstTask.budgetUsd - firstTask.spentUsd;
  return {
    taskId,
    budgetUsd: firstTask.budgetUsd,
    spentUsd: firstTask.spentUsd,
    remainingUsd,
    allowed: remainingUsd === null || remainingUsd > 0,
  };
}

/**
 * Record AI spend against a task. Increments spentUsd; the value cascades
 * implicitly because checkTaskBudget walks the ancestor chain.
 *
 * Fire-and-forget by callers — if the increment fails, the calling AI call
 * should still proceed (don't block work on accounting hiccups).
 */
export async function recordTaskSpend(taskId: string, usd: number): Promise<void> {
  if (!taskId || usd <= 0 || !Number.isFinite(usd)) return;
  try {
    await prisma.agentTask.update({
      where: { id: taskId },
      data: { spentUsd: { increment: usd } },
    });
  } catch (err) {
    console.warn("[task-helpers] recordTaskSpend failed:", err instanceof Error ? err.message : err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Approval persistence
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persist a pending approval as an AgentTask row with status="needs_approval".
 * Returns the new task id so the caller can include it in the result.
 *
 * Idempotency: if a pending approval already exists with the same tool +
 * conversationId, returns the existing id instead of creating a duplicate.
 */
export async function persistPendingApproval(args: {
  tool: string;
  params: Record<string, unknown>;
  reason: string;
  agentType: "ceo" | "cto";
  siteId?: string | null;
  conversationId?: string | null;
  parentTaskId?: string | null;
}): Promise<string | null> {
  try {
    // Dedup: if same conversation + tool already has a pending approval, reuse it.
    if (args.conversationId) {
      const existing = await prisma.agentTask.findFirst({
        where: {
          status: "needs_approval",
          conversationId: args.conversationId,
          taskType: `approval:${args.tool}`,
        },
        select: { id: true },
      });
      if (existing) return existing.id;
    }

    const created = await prisma.agentTask.create({
      data: {
        agentType: args.agentType,
        taskType: `approval:${args.tool}`,
        priority: "high",
        status: "needs_approval",
        description: args.reason,
        input: { tool: args.tool, params: args.params } as Record<string, unknown>,
        siteId: args.siteId ?? null,
        conversationId: args.conversationId ?? null,
        parentTaskId: args.parentTaskId ?? null,
      },
    });
    return created.id;
  } catch (err) {
    console.warn(
      "[task-helpers] persistPendingApproval failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * Approve a pending approval — flips status to "approved" so a worker can
 * pick it up and execute the tool. Returns the task with its tool + params.
 */
export async function approvePendingApproval(taskId: string, approvedBy: string): Promise<{
  ok: boolean;
  task?: { id: string; tool: string; params: Record<string, unknown> };
  error?: string;
}> {
  try {
    const task = await prisma.agentTask.findUnique({
      where: { id: taskId },
      select: { id: true, status: true, input: true, taskType: true },
    });
    if (!task) return { ok: false, error: "Task not found" };
    if (task.status !== "needs_approval") {
      return { ok: false, error: `Task is not awaiting approval (status=${task.status})` };
    }
    const input = (task.input ?? {}) as Record<string, unknown>;
    const tool = (input.tool as string) || task.taskType.replace(/^approval:/, "");
    const params = (input.params ?? {}) as Record<string, unknown>;

    await prisma.agentTask.update({
      where: { id: taskId },
      data: {
        status: "approved",
        output: { approvedBy, approvedAt: new Date().toISOString() } as Record<string, unknown>,
      },
    });

    return { ok: true, task: { id: taskId, tool, params } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Reject a pending approval — flips status to "rejected" with a reason.
 */
export async function rejectPendingApproval(
  taskId: string,
  rejectedBy: string,
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const task = await prisma.agentTask.findUnique({
      where: { id: taskId },
      select: { status: true },
    });
    if (!task) return { ok: false, error: "Task not found" };
    if (task.status !== "needs_approval") {
      return { ok: false, error: `Task is not awaiting approval (status=${task.status})` };
    }
    await prisma.agentTask.update({
      where: { id: taskId },
      data: {
        status: "rejected",
        errorMessage: reason || "Rejected by reviewer",
        output: {
          rejectedBy,
          rejectedAt: new Date().toISOString(),
          reason: reason || null,
        } as Record<string, unknown>,
        completedAt: new Date(),
      },
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * List pending approvals — for the cockpit queue UI. Filters by site,
 * orders by priority then age.
 */
export async function listPendingApprovals(opts: {
  siteId?: string;
  limit?: number;
} = {}): Promise<Array<{
  id: string;
  agentType: string;
  taskType: string;
  tool: string;
  params: Record<string, unknown>;
  description: string;
  priority: string;
  siteId: string | null;
  conversationId: string | null;
  createdAt: Date;
  ageMinutes: number;
}>> {
  const rows = await prisma.agentTask.findMany({
    where: {
      status: "needs_approval",
      ...(opts.siteId ? { siteId: opts.siteId } : {}),
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: opts.limit ?? 50,
    select: {
      id: true,
      agentType: true,
      taskType: true,
      input: true,
      description: true,
      priority: true,
      siteId: true,
      conversationId: true,
      createdAt: true,
    },
  });

  const now = Date.now();
  return rows.map((r) => {
    const input = (r.input ?? {}) as Record<string, unknown>;
    return {
      id: r.id,
      agentType: r.agentType,
      taskType: r.taskType,
      tool: (input.tool as string) || r.taskType.replace(/^approval:/, ""),
      params: (input.params ?? {}) as Record<string, unknown>,
      description: r.description,
      priority: r.priority,
      siteId: r.siteId,
      conversationId: r.conversationId,
      createdAt: r.createdAt,
      ageMinutes: Math.round((now - r.createdAt.getTime()) / 60_000),
    };
  });
}
