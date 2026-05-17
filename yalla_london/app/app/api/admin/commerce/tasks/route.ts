/**
 * CommerceTask CRUD — Ops checklist items for the commerce pipeline
 *
 * GET: List tasks with filters (siteId, status, category, briefId, campaignId)
 * POST: Create task / Update task status
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { requireAdmin } = await import("@/lib/admin-middleware");
    const authErr = await requireAdmin(req);
    if (authErr) return authErr;

    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");

    const siteId = req.headers.get("x-site-id") || getDefaultSiteId();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");
    const briefId = url.searchParams.get("briefId");

    const where: Record<string, unknown> = { siteId };
    if (status) where.status = status;
    if (category) where.category = category;
    if (briefId) where.briefId = briefId;

    const tasks = await prisma.commerceTask.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 100,
    });

    const summary = {
      total: tasks.length,
      byStatus: tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] ?? 0) + 1; return acc; }, {} as Record<string, number>),
      byCategory: tasks.reduce((acc, t) => { acc[t.category] = (acc[t.category] ?? 0) + 1; return acc; }, {} as Record<string, number>),
    };

    return NextResponse.json({ data: tasks, summary });
  } catch (error) {
    console.error("[commerce-tasks] GET error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { requireAdmin } = await import("@/lib/admin-middleware");
    const authErr = await requireAdmin(req);
    if (authErr) return authErr;

    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");

    const body = await req.json();
    const siteId = body.siteId || req.headers.get("x-site-id") || getDefaultSiteId();

    if (body.action === "update_status" && body.taskId) {
      const task = await prisma.commerceTask.update({
        where: { id: body.taskId },
        data: {
          status: body.status,
          ...(body.status === "completed" ? { completedAt: new Date() } : {}),
          ...(body.status === "blocked" && body.blockedReason ? { blockedReason: body.blockedReason } : {}),
        },
      });
      return NextResponse.json({ data: task });
    }

    // Create new task
    const task = await prisma.commerceTask.create({
      data: {
        siteId,
        title: body.title,
        description: body.description ?? null,
        category: body.category ?? "research",
        priority: body.priority ?? "medium",
        assignedTo: body.assignedTo ?? null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        briefId: body.briefId ?? null,
        campaignId: body.campaignId ?? null,
        productId: body.productId ?? null,
        listingDraftId: body.listingDraftId ?? null,
        dependsOn: body.dependsOn ?? [],
      },
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    console.error("[commerce-tasks] POST error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to create/update task" }, { status: 500 });
  }
}
