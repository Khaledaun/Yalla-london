/**
 * Commerce Campaigns API — 30-day launch calendar CRUD + auto-generate
 *
 * GET: List campaigns (filterable by status, siteId)
 * POST: Generate from brief, update task status, update results, update status
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { getDefaultSiteId, getActiveSiteIds } from "@/config/sites";

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const { searchParams } = new URL(req.url);

    const siteId = searchParams.get("siteId") || getDefaultSiteId();
    const activeSiteIds = getActiveSiteIds();
    const targetSiteId = activeSiteIds.includes(siteId) ? siteId : getDefaultSiteId();
    const status = searchParams.get("status") ?? undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50") || 50, 200);

    const where: Record<string, unknown> = { siteId: targetSiteId };
    if (status) where.status = status;

    const [campaigns, total] = await Promise.all([
      prisma.commerceCampaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.commerceCampaign.count({ where }),
    ]);

    return NextResponse.json({ data: campaigns, total });
  } catch (err) {
    console.warn("[commerce-campaigns] GET error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to load campaigns" }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { action } = body as { action: string };

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    // ── Generate campaign from brief ──
    if (action === "generate") {
      const { briefId } = body as { briefId: string };
      if (!briefId) {
        return NextResponse.json({ error: "briefId is required" }, { status: 400 });
      }

      const { generateCampaignFromBrief } = await import("@/lib/commerce/campaign-generator");
      const result = await generateCampaignFromBrief(briefId, {
        calledFrom: "/api/admin/commerce/campaigns",
      });

      return NextResponse.json({
        success: true,
        message: `Campaign created with ${result.tasksCount} tasks. Coupon: ${result.couponCode}`,
        data: result,
      });
    }

    // ── Update task completion ──
    if (action === "update_task") {
      const { campaignId, day, taskIndex, completed } = body as {
        campaignId: string;
        day: number;
        taskIndex: number;
        completed: boolean;
      };

      if (!campaignId || typeof day !== "number" || typeof taskIndex !== "number") {
        return NextResponse.json(
          { error: "campaignId, day, and taskIndex are required" },
          { status: 400 },
        );
      }

      const { updateCampaignTask } = await import("@/lib/commerce/campaign-generator");
      await updateCampaignTask(campaignId, day, taskIndex, completed ?? true);

      return NextResponse.json({
        success: true,
        message: `Task ${completed ? "completed" : "uncompleted"}`,
      });
    }

    // ── Update campaign results ──
    if (action === "update_results") {
      const { campaignId, views, clicks, conversions, revenue } = body as {
        campaignId: string;
        views?: number;
        clicks?: number;
        conversions?: number;
        revenue?: number;
      };

      if (!campaignId) {
        return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
      }

      const { updateCampaignResults } = await import("@/lib/commerce/campaign-generator");
      await updateCampaignResults(campaignId, { views, clicks, conversions, revenue });

      return NextResponse.json({
        success: true,
        message: "Results updated",
      });
    }

    // ── Update campaign status ──
    if (action === "update_status") {
      const { prisma } = await import("@/lib/db");
      const { campaignId, status } = body as { campaignId: string; status: string };

      if (!campaignId || !status) {
        return NextResponse.json({ error: "campaignId and status required" }, { status: 400 });
      }

      const validStatuses = ["planned", "active", "paused", "completed"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be: ${validStatuses.join(", ")}` },
          { status: 400 },
        );
      }

      const campaign = await prisma.commerceCampaign.update({
        where: { id: campaignId },
        data: { status },
      });

      return NextResponse.json({
        success: true,
        message: `Campaign status → ${status}`,
        data: campaign,
      });
    }

    // ── Delete campaign ──
    if (action === "delete") {
      const { prisma } = await import("@/lib/db");
      const { campaignId } = body as { campaignId: string };

      if (!campaignId) {
        return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
      }

      await prisma.commerceCampaign.delete({ where: { id: campaignId } });

      return NextResponse.json({
        success: true,
        message: "Campaign deleted",
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}. Supported: generate, update_task, update_results, update_status, delete` },
      { status: 400 },
    );
  } catch (err) {
    console.warn("[commerce-campaigns] POST error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
});
