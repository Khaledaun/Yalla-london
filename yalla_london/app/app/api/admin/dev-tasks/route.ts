export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { getDefaultSiteId, getActiveSiteIds } from "@/config/sites";

// ── GET: List tasks (filterable by siteId, status, priority, source) ──────────

export const GET = withAdminAuth(async (request: NextRequest) => {
  const { prisma } = await import("@/lib/db");
  const url = new URL(request.url);

  const siteId = url.searchParams.get("siteId") || request.headers.get("x-site-id") || "";
  const statusFilter = url.searchParams.get("status") || ""; // pending, in_progress, completed, dismissed
  const priorityFilter = url.searchParams.get("priority") || "";
  const sourceFilter = url.searchParams.get("source") || "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 500);

  const activeSiteIds = getActiveSiteIds();

  // Build where clause
  const where: Record<string, unknown> = {};

  if (siteId && siteId !== "all") {
    where.siteId = siteId;
  } else {
    where.siteId = { in: activeSiteIds };
  }

  if (statusFilter) {
    where.status = statusFilter;
  } else {
    // Default: show open tasks (exclude completed/dismissed)
    where.status = { in: ["pending", "in_progress"] };
  }

  if (priorityFilter) where.priority = priorityFilter;
  if (sourceFilter) where.source = sourceFilter;

  try {
    const [tasks, counts] = await Promise.all([
      prisma.devTask.findMany({
        where,
        orderBy: [
          { priority: "asc" }, // critical first (alphabetical: critical < high < low < medium)
          { dueDate: "asc" },
          { created_at: "desc" },
        ],
        take: limit,
      }),
      prisma.devTask.groupBy({
        by: ["status"],
        where: {
          siteId: siteId && siteId !== "all" ? siteId : { in: activeSiteIds },
        },
        _count: true,
      }),
    ]);

    // Sort by priority order (not alphabetical)
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    tasks.sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));

    // Compute summary
    const summary = {
      total: 0,
      pending: 0,
      in_progress: 0,
      completed: 0,
      dismissed: 0,
      overdue: 0,
      dueToday: 0,
      dueThisWeek: 0,
    };

    for (const c of counts) {
      summary[c.status as keyof typeof summary] = (summary[c.status as keyof typeof summary] || 0) + c._count;
      summary.total += c._count;
    }

    // Count overdue + due today/this week
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const weekEnd = new Date(todayEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const task of tasks) {
      if (task.dueDate && task.status !== "completed" && task.status !== "dismissed") {
        if (task.dueDate < now) summary.overdue++;
        else if (task.dueDate <= todayEnd) summary.dueToday++;
        else if (task.dueDate <= weekEnd) summary.dueThisWeek++;
      }
    }

    return NextResponse.json({ tasks, summary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Handle missing table gracefully
    if (msg.includes("P2021") || msg.includes("does not exist") || msg.includes("dev_tasks")) {
      return NextResponse.json({
        _migrationNeeded: true,
        message: "DevTask table not found — run npx prisma db push",
        tasks: [],
        summary: { total: 0, pending: 0, in_progress: 0, completed: 0, dismissed: 0, overdue: 0, dueToday: 0, dueThisWeek: 0 },
      });
    }
    console.error("[dev-tasks] GET error:", msg);
    return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
  }
});

// ── POST: Create / Update / Complete / Dismiss tasks ──────────────────────────

export const POST = withAdminAuth(async (request: NextRequest) => {
  const { prisma } = await import("@/lib/db");

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action } = body;

  try {
    switch (action) {
      case "create": {
        const { siteId, title, description, category, priority, dueDate, source, sourceRef, actionLabel, actionApi, actionPayload, metadata } = body;
        if (!siteId || !title || !category) {
          return NextResponse.json({ error: "siteId, title, and category are required" }, { status: 400 });
        }

        const task = await prisma.devTask.create({
          data: {
            siteId: siteId || getDefaultSiteId(),
            title,
            description: description || null,
            category,
            priority: priority || "medium",
            dueDate: dueDate ? new Date(dueDate) : null,
            source: source || "manual",
            sourceRef: sourceRef || null,
            actionLabel: actionLabel || null,
            actionApi: actionApi || null,
            actionPayload: actionPayload || null,
            metadata: metadata || null,
          },
        });
        return NextResponse.json({ success: true, task });
      }

      case "complete": {
        const { taskId } = body;
        if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

        const task = await prisma.devTask.update({
          where: { id: taskId },
          data: { status: "completed", completedAt: new Date(), completedBy: "admin" },
        });
        return NextResponse.json({ success: true, task });
      }

      case "dismiss": {
        const { taskId } = body;
        if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

        const task = await prisma.devTask.update({
          where: { id: taskId },
          data: { status: "dismissed", completedAt: new Date(), completedBy: "admin" },
        });
        return NextResponse.json({ success: true, task });
      }

      case "update": {
        const { taskId, ...updates } = body;
        if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

        // Only allow safe field updates
        const safeFields: Record<string, unknown> = {};
        for (const key of ["title", "description", "category", "priority", "status", "dueDate", "actionLabel", "actionApi", "actionPayload", "metadata"]) {
          if (updates[key] !== undefined) {
            safeFields[key] = key === "dueDate" && updates[key] ? new Date(updates[key]) : updates[key];
          }
        }

        const task = await prisma.devTask.update({
          where: { id: taskId },
          data: safeFields,
        });
        return NextResponse.json({ success: true, task });
      }

      case "bulk_complete": {
        const { taskIds } = body;
        if (!Array.isArray(taskIds)) return NextResponse.json({ error: "taskIds array required" }, { status: 400 });

        const result = await prisma.devTask.updateMany({
          where: { id: { in: taskIds } },
          data: { status: "completed", completedAt: new Date(), completedBy: "admin" },
        });
        return NextResponse.json({ success: true, updated: result.count });
      }

      case "cleanup": {
        // Remove completed/dismissed tasks older than 30 days
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const result = await prisma.devTask.deleteMany({
          where: {
            status: { in: ["completed", "dismissed"] },
            completedAt: { lt: cutoff },
          },
        });
        return NextResponse.json({ success: true, deleted: result.count });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("P2021") || msg.includes("does not exist") || msg.includes("dev_tasks")) {
      return NextResponse.json({
        _migrationNeeded: true,
        message: "DevTask table not found — run npx prisma db push",
      });
    }
    console.error("[dev-tasks] POST error:", msg);
    return NextResponse.json({ error: "Failed to process task action" }, { status: 500 });
  }
});
