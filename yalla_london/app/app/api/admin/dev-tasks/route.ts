export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { getDefaultSiteId, getActiveSiteIds } from "@/config/sites";
import { getPlan, getAllPlans, getPhases, computePhaseReadiness, computeProjectReadiness } from "@/lib/dev-tasks/plan-registry";

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

  if (statusFilter && statusFilter !== "all") {
    where.status = statusFilter;
  } else if (!statusFilter) {
    // Default: show open tasks (exclude completed/dismissed)
    where.status = { in: ["pending", "in_progress"] };
  }
  // statusFilter === "all" → no status filter, return everything

  if (priorityFilter) where.priority = priorityFilter;
  if (sourceFilter) where.source = sourceFilter;

  try {
    // ── Dev-plan grouped response ───────────────────────────────────────
    if (sourceFilter === "dev-plan") {
      const tasks = await prisma.devTask.findMany({
        where: { ...where, source: "dev-plan" },
        orderBy: [{ created_at: "asc" }],
        take: 1000,
      });

      // Group tasks by plan (sourceRef prefix) then by phase
      type PlanGroup = {
        planId: string;
        planTitle: string;
        project: string;
        phases: Array<{ name: string; order: number; tasks: typeof tasks; readiness: number; done: number; total: number }>;
        totalTasks: number;
        completedTasks: number;
        readiness: number;
      };

      const planMap = new Map<string, { planTitle: string; project: string; phases: Record<string, { name: string; order: number; tasks: typeof tasks; readiness: number; done: number; total: number }> }>();

      for (const task of tasks) {
        const meta = (task.metadata || {}) as Record<string, unknown>;
        const phase = (meta.phase as string) || "Unknown";
        const phaseOrder = (meta.phaseOrder as number) || 99;
        // Extract planId from sourceRef "plan:{planId}/{taskId}"
        const planId = task.sourceRef?.match(/^plan:([^/]+)\//)?.[1] || "stage-a";
        const planTitle = (meta.title as string)?.includes("—") ? "" : "";
        const project = (meta.project as string) || "general / march26";

        if (!planMap.has(planId)) {
          // Look up plan title from registry
          const registryPlan = getPlan(planId);
          planMap.set(planId, {
            planTitle: registryPlan?.title || planId,
            project,
            phases: {},
          });
        }

        const planData = planMap.get(planId)!;
        if (!planData.phases[phase]) {
          planData.phases[phase] = { name: phase, order: phaseOrder, tasks: [], readiness: 0, done: 0, total: 0 };
        }
        planData.phases[phase].tasks.push(task);
        planData.phases[phase].total++;
        if (task.status === "completed") planData.phases[phase].done++;
      }

      // Build plans array with readiness computed
      const plans: PlanGroup[] = [];
      for (const [planId, planData] of planMap) {
        // Compute readiness per phase
        for (const p of Object.values(planData.phases)) {
          const readinessValues = p.tasks.map((t) => {
            const m = (t.metadata || {}) as Record<string, unknown>;
            return (m.readiness as number) || (t.status === "completed" ? 100 : 0);
          });
          p.readiness = readinessValues.length > 0
            ? Math.round(readinessValues.reduce((a, b) => a + b, 0) / readinessValues.length)
            : 0;
        }

        const sortedPhases = Object.values(planData.phases).sort((a, b) => a.order - b.order);
        const allTasks = sortedPhases.flatMap((p) => p.tasks);
        const allReadiness = allTasks.map((t) => {
          const m = (t.metadata || {}) as Record<string, unknown>;
          return (m.readiness as number) || (t.status === "completed" ? 100 : 0);
        });
        const planReadiness = allReadiness.length > 0
          ? Math.round(allReadiness.reduce((a, b) => a + b, 0) / allReadiness.length)
          : 0;

        plans.push({
          planId,
          planTitle: planData.planTitle,
          project: planData.project,
          phases: sortedPhases,
          totalTasks: allTasks.length,
          completedTasks: allTasks.filter((t) => t.status === "completed").length,
          readiness: planReadiness,
        });
      }

      // Overall project stats across all plans
      const allReadiness = tasks.map((t) => {
        const m = (t.metadata || {}) as Record<string, unknown>;
        return (m.readiness as number) || (t.status === "completed" ? 100 : 0);
      });
      const projectReadiness = allReadiness.length > 0
        ? Math.round(allReadiness.reduce((a, b) => a + b, 0) / allReadiness.length)
        : 0;

      // Flat phases for backward compatibility
      const flatPhases = plans.flatMap((p) => p.phases);

      return NextResponse.json({
        tasks,
        phases: flatPhases,
        plans,
        projectStats: {
          project: "All Plans",
          totalTasks: tasks.length,
          completedTasks: tasks.filter((t) => t.status === "completed").length,
          readiness: projectReadiness,
          phaseCount: flatPhases.length,
          planCount: plans.length,
        },
      });
    }

    // ── Standard task listing ───────────────────────────────────────────
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

      case "sync_plan": {
        const { planId, siteId: syncSiteId } = body;
        const plan = getPlan(planId || "stage-a");
        if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

        const targetSiteId = syncSiteId || request.headers.get("x-site-id") || getDefaultSiteId();
        let created = 0;
        let updated = 0;

        for (const task of plan.tasks) {
          const sourceRef = `plan:${plan.id}/${task.id}`;
          const existing = await prisma.devTask.findFirst({
            where: { sourceRef, siteId: targetSiteId },
          });

          const taskMeta = {
            ...task,
            project: plan.project,
          };

          if (existing) {
            // Update from plan definition
            const existingMeta = (existing.metadata || {}) as Record<string, unknown>;
            await prisma.devTask.update({
              where: { id: existing.id },
              data: {
                title: `${task.id} — ${task.title}`,
                description: task.description,
                metadata: { ...existingMeta, ...taskMeta },
                status: task.status === "done" ? "completed" : task.status === "in-progress" ? "in_progress" : "pending",
                completedAt: task.status === "done" ? (existing.completedAt || new Date()) : null,
              },
            });
            updated++;
          } else {
            await prisma.devTask.create({
              data: {
                siteId: targetSiteId,
                title: `${task.id} — ${task.title}`,
                description: task.description,
                category: task.category,
                priority: task.phaseOrder <= 1 ? "high" : "medium",
                status: task.status === "done" ? "completed" : "pending",
                source: "dev-plan",
                sourceRef,
                dueDate: task.dueDate ? new Date(task.dueDate) : null,
                completedAt: task.status === "done" ? new Date() : null,
                metadata: taskMeta,
              },
            });
            created++;
          }
        }

        return NextResponse.json({
          success: true,
          plan: plan.id,
          project: plan.project,
          created,
          updated,
          total: plan.tasks.length,
        });
      }

      case "sync_all_plans": {
        const { siteId: syncSiteId } = body;
        const targetSiteId = syncSiteId || request.headers.get("x-site-id") || getDefaultSiteId();
        const allPlans = getAllPlans();
        let totalCreated = 0;
        let totalUpdated = 0;
        const planResults: Array<{ planId: string; title: string; created: number; updated: number; total: number }> = [];

        for (const plan of allPlans) {
          let created = 0;
          let updated = 0;

          for (const task of plan.tasks) {
            const sourceRef = `plan:${plan.id}/${task.id}`;
            const existing = await prisma.devTask.findFirst({
              where: { sourceRef, siteId: targetSiteId },
            });

            const taskMeta = {
              ...task,
              project: plan.project,
            };

            if (existing) {
              const existingMeta = (existing.metadata || {}) as Record<string, unknown>;
              await prisma.devTask.update({
                where: { id: existing.id },
                data: {
                  title: `${task.id} — ${task.title}`,
                  description: task.description,
                  metadata: { ...existingMeta, ...taskMeta },
                  status: task.status === "done" ? "completed" : task.status === "in-progress" ? "in_progress" : "pending",
                  completedAt: task.status === "done" ? (existing.completedAt || new Date()) : null,
                },
              });
              updated++;
            } else {
              await prisma.devTask.create({
                data: {
                  siteId: targetSiteId,
                  title: `${task.id} — ${task.title}`,
                  description: task.description,
                  category: task.category,
                  priority: task.phaseOrder <= 1 ? "high" : "medium",
                  status: task.status === "done" ? "completed" : "pending",
                  source: "dev-plan",
                  sourceRef,
                  dueDate: task.dueDate ? new Date(task.dueDate) : null,
                  completedAt: task.status === "done" ? new Date() : null,
                  metadata: taskMeta,
                },
              });
              created++;
            }
          }

          totalCreated += created;
          totalUpdated += updated;
          planResults.push({ planId: plan.id, title: plan.title, created, updated, total: plan.tasks.length });
        }

        return NextResponse.json({
          success: true,
          totalPlans: allPlans.length,
          totalCreated,
          totalUpdated,
          totalTasks: allPlans.reduce((s, p) => s + p.tasks.length, 0),
          plans: planResults,
        });
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
