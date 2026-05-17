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

    // Timeline mode: return interactions for a specific opportunity
    const opportunityId = searchParams.get("opportunityId");
    const timeline = searchParams.get("timeline");
    if (opportunityId && timeline === "true") {
      const interactions = await prisma.interactionLog.findMany({
        where: { opportunityId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return NextResponse.json({ success: true, interactions });
    }

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

      case "seed_pipeline": {
        const siteId = (body.siteId as string) || getDefaultSiteId();
        // Check if already seeded
        const existing = await prisma.crmOpportunity.count({ where: { siteId } });
        if (existing > 0) {
          return NextResponse.json({ success: true, created: 0, message: "Pipeline already has data" });
        }

        const SEED_OPPORTUNITIES = [
          {
            contactName: "Ahmed Al Rashid",
            contactEmail: "ahmed.alrashid@example.com",
            contactPhone: "+971501234567",
            stage: "new",
            value: 45000,
            source: "web",
            nextAction: "Send fleet brochure",
            nextActionAt: new Date(Date.now() + 86400000),
            tags: ["family", "summer"],
          },
          {
            contactName: "Sarah Khalil",
            contactEmail: "sarah.k@example.com",
            contactPhone: "+966551234567",
            stage: "qualifying",
            value: 72000,
            source: "whatsapp",
            assignedTo: "ceo-agent",
            nextAction: "Confirm dates and guest count",
            nextActionAt: new Date(Date.now() + 172800000),
            tags: ["luxury", "honeymoon"],
          },
          {
            contactName: "James Mitchell",
            contactEmail: "j.mitchell@corporate.com",
            stage: "proposal",
            value: 120000,
            source: "email",
            assignedTo: "khaled",
            nextAction: "Follow up on proposal",
            nextActionAt: new Date(Date.now() + 259200000),
            tags: ["corporate", "large-group"],
          },
          {
            contactName: "Fatima Al Maktoum",
            contactEmail: "fatima.m@example.com",
            contactPhone: "+971551234567",
            stage: "negotiation",
            value: 85000,
            source: "referral",
            assignedTo: "khaled",
            nextAction: "Finalize itinerary and pricing",
            tags: ["repeat-client", "mediterranean"],
          },
          {
            contactName: "Oliver Chen",
            contactEmail: "oliver.chen@example.com",
            stage: "won",
            value: 55000,
            source: "web",
            closedAt: new Date(Date.now() - 604800000),
            tags: ["sailing"],
          },
          {
            contactName: "Maria Santos",
            contactEmail: "maria.s@example.com",
            stage: "lost",
            value: 38000,
            source: "organic",
            lostReason: "Chose competitor with lower price",
            closedAt: new Date(Date.now() - 1209600000),
            tags: ["budget-sensitive"],
          },
        ];

        const created = await prisma.$transaction(
          SEED_OPPORTUNITIES.map((opp) =>
            prisma.crmOpportunity.create({
              data: { siteId, currency: "USD", ...opp },
            })
          )
        );

        // Seed sample interactions for qualifying and proposal stage opps
        const qualifyingOpp = created.find((o) => o.stage === "qualifying");
        const proposalOpp = created.find((o) => o.stage === "proposal");

        const interactionSeeds = [];
        if (qualifyingOpp) {
          interactionSeeds.push(
            { siteId, opportunityId: qualifyingOpp.id, channel: "whatsapp", direction: "inbound", interactionType: "inquiry", summary: "Interested in a 7-day Mediterranean cruise for honeymoon in July. Budget around $70-80K. Prefers motor yacht with jacuzzi.", sentiment: "positive" },
            { siteId, opportunityId: qualifyingOpp.id, channel: "whatsapp", direction: "outbound", interactionType: "follow_up", summary: "Sent 3 yacht options matching preferences: Azimut 80, Sunseeker 76, Princess V78. Awaiting response.", sentiment: "neutral", agentId: "ceo" },
          );
        }
        if (proposalOpp) {
          interactionSeeds.push(
            { siteId, opportunityId: proposalOpp.id, channel: "email", direction: "inbound", interactionType: "inquiry", summary: "Corporate retreat for 15 executives. Need 2 yachts for 4-day Amalfi Coast trip in September.", sentiment: "neutral" },
            { siteId, opportunityId: proposalOpp.id, channel: "email", direction: "outbound", interactionType: "follow_up", summary: "Sent detailed proposal with dual-yacht package: Ferretti 850 + Azimut 72. Includes catering, water sports, and port fees. Total: $120K.", sentiment: "positive", agentId: "ceo" },
            { siteId, opportunityId: proposalOpp.id, channel: "email", direction: "inbound", interactionType: "feedback", summary: "Client reviewing proposal. Asked about cancellation policy and insurance options.", sentiment: "neutral" },
          );
        }

        if (interactionSeeds.length > 0) {
          await prisma.interactionLog.createMany({ data: interactionSeeds });
        }

        return NextResponse.json({ success: true, created: created.length });
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
