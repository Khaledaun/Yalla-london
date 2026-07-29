export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { generateDevelopmentPlan } from "@/lib/new-site/plan-generator";
import { getDefaultSiteId } from "@/config/sites";

/**
 * POST /api/admin/site-builder/plan
 *
 * Generates a development plan from site wizard config.
 * Returns markdown + structured steps.
 * Optionally saves tasks to DevTask table.
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { config, saveTasks = false } = body;

    if (!config?.siteId || !config?.name) {
      return NextResponse.json({ error: "siteId and name are required" }, { status: 400 });
    }

    const plan = generateDevelopmentPlan(config);

    // Optionally save steps as DevTasks
    let tasksCreated = 0;
    if (saveTasks) {
      try {
        const { prisma } = await import("@/lib/db");
        const now = new Date();

        for (const step of plan.steps) {
          await prisma.devTask.create({
            data: {
              siteId: config.siteId,
              title: step.title,
              description: step.description,
              category: step.category,
              priority: step.priority,
              status: "pending",
              source: "builder",
              sourceRef: `plan::${config.siteId}::${step.title.slice(0, 50)}`,
              actionLabel: step.actionLabel ?? null,
              actionApi: step.actionApi ?? null,
              actionPayload: step.actionPayload ?? undefined,
              dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
            },
          });
          tasksCreated++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("P2021") || msg.includes("does not exist")) {
          return NextResponse.json({
            plan,
            tasksCreated: 0,
            _migrationNeeded: true,
            message: "Plan generated but DevTask table not found — run npx prisma db push",
          });
        }
        console.warn("[site-builder/plan] Failed to save tasks:", msg);
      }
    }

    return NextResponse.json({
      plan,
      tasksCreated,
      message: tasksCreated > 0
        ? `Plan generated with ${tasksCreated} tasks saved to database`
        : "Plan generated successfully",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[site-builder/plan] Error:", msg);
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
});
