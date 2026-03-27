/**
 * CEO Agent Admin API — trigger, status, and config
 *
 * GET  — Agent status (CEO + CTO health, recent conversations, pipeline summary)
 * POST — Trigger agent processing (mock event for testing)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getAgentStatus, processCEOEvent } from "@/lib/agents/ceo-brain";
import { classifyIntent } from "@/lib/agents/event-router";
import { prisma } from "@/lib/db";
import { getDefaultSiteId } from "@/config/sites";
import type { CEOEvent, Channel } from "@/lib/agents/types";

export const maxDuration = 60;

// ---------------------------------------------------------------------------
// GET — Agent status (shape expected by /admin/agent page)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const siteId =
      request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // ----- CEO Agent Status -----
    const [conversationsToday, messagesHandledToday, recentToolsUsed] =
      await Promise.all([
        prisma.conversation.count({
          where: { siteId, createdAt: { gte: todayStart } },
        }),
        prisma.message.count({
          where: {
            conversation: { siteId },
            direction: "outbound",
            agentId: "ceo",
            createdAt: { gte: todayStart },
          },
        }),
        prisma.message.findMany({
          where: {
            conversation: { siteId },
            agentId: "ceo",
            createdAt: { gte: todayStart },
            toolsUsed: { isEmpty: false },
          },
          select: { toolsUsed: true },
          take: 50,
          orderBy: { createdAt: "desc" },
        }),
      ]);

    // Flatten + deduplicate tools used today
    const toolsUsed = [
      ...new Set<string>(recentToolsUsed.flatMap((m) => m.toolsUsed)),
    ];

    // Last CEO activity: latest outbound message by CEO agent
    const lastCeoMsg = await prisma.message.findFirst({
      where: { agentId: "ceo", direction: "outbound" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const ceoStatus =
      conversationsToday > 0 || messagesHandledToday > 0
        ? "active"
        : lastCeoMsg
          ? "idle"
          : "pending";

    // ----- CTO Agent Status -----
    const lastCtoTask = await prisma.agentTask.findFirst({
      where: { agentType: "cto" },
      orderBy: { createdAt: "desc" },
      select: {
        status: true,
        taskType: true,
        findings: true,
        completedAt: true,
        createdAt: true,
      },
    });

    const ctoFindings = lastCtoTask?.findings?.length ?? 0;

    // ----- Recent Conversations (last 5) -----
    const recentConversations = await prisma.conversation.findMany({
      where: { siteId },
      orderBy: { lastMessageAt: "desc" },
      take: 5,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            content: true,
            direction: true,
            createdAt: true,
          },
        },
        _count: { select: { messages: true } },
      },
    });

    const conversations = recentConversations.map((c) => ({
      id: c.id,
      channel: c.channel,
      contactName: c.contactName,
      status: c.status,
      lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
      messageCount: c._count.messages,
      lastMessage: c.messages[0]
        ? {
            content: c.messages[0].content,
            direction: c.messages[0].direction,
            createdAt: c.messages[0].createdAt.toISOString(),
          }
        : null,
    }));

    // ----- Pipeline Summary -----
    const stageCounts = await prisma.crmOpportunity.groupBy({
      by: ["stage"],
      where: { siteId },
      _count: { id: true },
      _sum: { value: true },
    });

    const totalOpportunities = stageCounts.reduce(
      (s, sc) => s + sc._count.id,
      0,
    );
    const activeOpportunities = stageCounts
      .filter((sc) => !["won", "lost"].includes(sc.stage))
      .reduce((s, sc) => s + sc._count.id, 0);
    const totalPipelineValue = stageCounts.reduce(
      (s, sc) => s + (sc._sum.value || 0),
      0,
    );
    const stageBreakdown: Record<string, number> = {};
    for (const sc of stageCounts) {
      stageBreakdown[sc.stage] = sc._count.id;
    }

    // ----- Response (matches AgentStatus + RecentConversation[] + PipelineSummary) -----
    return NextResponse.json({
      ceo: {
        status: ceoStatus,
        lastActivity: lastCeoMsg?.createdAt?.toISOString() ?? null,
        conversationsToday,
        messagesHandled: messagesHandledToday,
        toolsUsed,
      },
      cto: {
        status: lastCtoTask?.status ?? "pending",
        lastRun: (lastCtoTask?.completedAt ?? lastCtoTask?.createdAt)?.toISOString() ?? null,
        findings: ctoFindings,
        lastTaskType: lastCtoTask?.taskType ?? null,
      },
      recentConversations: conversations,
      pipeline: {
        totalOpportunities,
        activeOpportunities,
        totalPipelineValue,
        stageBreakdown,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[admin/agent] GET failed:", message);
    return NextResponse.json(
      { success: false, error: "Failed to get agent status" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST — Trigger agent (test event or real event)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const action = (body.action as string) || "trigger";

    switch (action) {
      case "trigger": {
        // Process a test event through the CEO brain
        const channel = (body.channel as Channel) || "internal";
        const content = (body.content as string) || "";
        const siteId = (body.siteId as string) || "yalla-london";
        const externalId = (body.externalId as string) || "admin-test";

        if (!content) {
          return NextResponse.json(
            { success: false, error: "content is required" },
            { status: 400 },
          );
        }

        // Build a CEOEvent directly
        const event: CEOEvent = {
          id: crypto.randomUUID(),
          channel,
          direction: "inbound",
          content,
          contentType: "text",
          externalId,
          senderName: body.senderName as string | undefined,
          siteId,
          timestamp: new Date().toISOString(),
          metadata: { source: "admin-api", triggeredBy: "admin" },
        };

        const result = await processCEOEvent(event);

        return NextResponse.json({
          success: true,
          action: "trigger",
          event: { id: event.id, channel, siteId },
          result,
        });
      }

      case "classify": {
        // Classify intent without processing
        const content = body.content as string;
        if (!content) {
          return NextResponse.json(
            { success: false, error: "content is required" },
            { status: 400 },
          );
        }

        const classification = await classifyIntent(content);
        return NextResponse.json({
          success: true,
          action: "classify",
          classification,
        });
      }

      case "status": {
        const status = getAgentStatus();
        return NextResponse.json({
          success: true,
          action: "status",
          status,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[admin/agent] POST failed:", message);
    return NextResponse.json(
      { success: false, error: "Agent processing failed" },
      { status: 500 },
    );
  }
}
