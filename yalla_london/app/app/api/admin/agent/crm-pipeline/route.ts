/**
 * CRM Pipeline API — opportunity pipeline data for kanban view + stage updates.
 *
 * GET  — List opportunities by stage (kanban data)
 * POST — Update opportunity (stage, next action, assignment, close)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { prisma } from "@/lib/db";
import { getDefaultSiteId } from "@/config/sites";

export const maxDuration = 30;

// ---------------------------------------------------------------------------
// GET — Pipeline Kanban Data
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = request.nextUrl;
    const siteId = searchParams.get("siteId") || getDefaultSiteId();
    const stage = searchParams.get("stage");
    const assignedTo = searchParams.get("assignedTo");

    const where: Record<string, unknown> = { siteId };
    if (stage) where.stage = stage;
    if (assignedTo) where.assignedTo = assignedTo;

    const [opportunities, stageCounts] = await Promise.all([
      prisma.crmOpportunity.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: 200,
        include: {
          interactions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              summary: true,
              channel: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.crmOpportunity.groupBy({
        by: ["stage"],
        where: { siteId },
        _count: { id: true },
        _sum: { value: true },
      }),
    ]);

    // Build kanban columns
    const STAGES = ["new", "qualifying", "proposal", "negotiation", "won", "lost"];
    const columns = STAGES.map((s) => {
      const stats = stageCounts.find((sc) => sc.stage === s);
      return {
        stage: s,
        count: stats?._count.id || 0,
        totalValue: stats?._sum.value || 0,
        opportunities: opportunities
          .filter((o) => o.stage === s)
          .map((o) => ({
            id: o.id,
            contactName: o.contactName,
            contactEmail: o.contactEmail,
            contactPhone: o.contactPhone,
            value: o.value,
            currency: o.currency,
            source: o.source,
            assignedTo: o.assignedTo,
            nextAction: o.nextAction,
            nextActionAt: o.nextActionAt,
            tags: o.tags,
            lastInteraction: o.interactions[0] || null,
            createdAt: o.createdAt,
            updatedAt: o.updatedAt,
            closedAt: o.closedAt,
          })),
      };
    });

    // Pipeline summary
    const totalValue = stageCounts.reduce((sum, sc) => sum + (sc._sum.value || 0), 0);
    const activeCount = stageCounts
      .filter((sc) => !["won", "lost"].includes(sc.stage))
      .reduce((sum, sc) => sum + sc._count.id, 0);

    // Stage breakdown for the page's PipelineSummary interface
    const stageBreakdown: Record<string, number> = {};
    for (const sc of stageCounts) {
      stageBreakdown[sc.stage] = sc._count.id;
    }

    return NextResponse.json({
      success: true,
      columns,
      summary: {
        totalOpportunities: opportunities.length,
        activeOpportunities: activeCount,
        totalPipelineValue: totalValue,
        stageBreakdown,
        currency: "USD",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[admin/agent/crm-pipeline] GET failed:", message);
    return NextResponse.json(
      { success: false, error: "Failed to load pipeline" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST — Update Opportunity
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { opportunityId, action } = body as {
      opportunityId: string;
      action: string;
    };

    if (!opportunityId) {
      return NextResponse.json(
        { success: false, error: "opportunityId is required" },
        { status: 400 },
      );
    }

    const VALID_STAGES = ["new", "qualifying", "proposal", "negotiation", "won", "lost"];

    switch (action) {
      case "update_stage": {
        const newStage = body.stage as string;
        if (!VALID_STAGES.includes(newStage)) {
          return NextResponse.json(
            { success: false, error: `Invalid stage: ${newStage}` },
            { status: 400 },
          );
        }
        const data: Record<string, unknown> = { stage: newStage };
        if (newStage === "won" || newStage === "lost") {
          data.closedAt = new Date();
        }
        if (newStage === "lost" && body.lostReason) {
          data.lostReason = body.lostReason as string;
        }
        await prisma.crmOpportunity.update({
          where: { id: opportunityId },
          data,
        });
        return NextResponse.json({ success: true, action: "stage_updated", stage: newStage });
      }

      case "update_next_action": {
        await prisma.crmOpportunity.update({
          where: { id: opportunityId },
          data: {
            nextAction: (body.nextAction as string) || null,
            nextActionAt: body.nextActionAt ? new Date(body.nextActionAt as string) : null,
          },
        });
        return NextResponse.json({ success: true, action: "next_action_updated" });
      }

      case "assign": {
        await prisma.crmOpportunity.update({
          where: { id: opportunityId },
          data: { assignedTo: (body.assignedTo as string) || null },
        });
        return NextResponse.json({ success: true, action: "assigned" });
      }

      case "update_value": {
        await prisma.crmOpportunity.update({
          where: { id: opportunityId },
          data: {
            value: body.value != null ? Number(body.value) : null,
            currency: (body.currency as string) || "USD",
          },
        });
        return NextResponse.json({ success: true, action: "value_updated" });
      }

      case "update_tags": {
        await prisma.crmOpportunity.update({
          where: { id: opportunityId },
          data: { tags: (body.tags as string[]) || [] },
        });
        return NextResponse.json({ success: true, action: "tags_updated" });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[admin/agent/crm-pipeline] POST failed:", message);
    return NextResponse.json(
      { success: false, error: "Failed to update opportunity" },
      { status: 500 },
    );
  }
}
