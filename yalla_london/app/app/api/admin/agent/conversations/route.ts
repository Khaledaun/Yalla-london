/**
 * Agent Conversations API — list, search, and manage conversations.
 *
 * GET  — List conversations (paginated, filterable by channel/status/siteId)
 * POST — Update conversation (status, tags, assignment)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { prisma } from "@/lib/db";
import { getDefaultSiteId } from "@/config/sites";

export const maxDuration = 30;

// ---------------------------------------------------------------------------
// GET — List Conversations
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = request.nextUrl;
    const siteId = searchParams.get("siteId") || getDefaultSiteId();
    const channel = searchParams.get("channel");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
    const offset = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = { siteId };
    if (channel) where.channel = channel;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      const createdAt: Record<string, Date> = {};
      if (dateFrom) createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      where.createdAt = createdAt;
    }
    if (search) {
      where.OR = [
        { contactName: { contains: search, mode: "insensitive" } },
        { contactEmail: { contains: search, mode: "insensitive" } },
        { contactPhone: { contains: search } },
        { externalId: { contains: search } },
      ];
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        orderBy: { lastMessageAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              content: true,
              direction: true,
              createdAt: true,
              agentId: true,
            },
          },
          _count: { select: { messages: true } },
        },
      }),
      prisma.conversation.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      conversations: conversations.map((c) => ({
        id: c.id,
        channel: c.channel,
        externalId: c.externalId,
        contactName: c.contactName,
        contactEmail: c.contactEmail,
        contactPhone: c.contactPhone,
        status: c.status,
        summary: c.summary,
        sentiment: c.sentiment,
        tags: c.tags,
        messageCount: c._count.messages,
        lastMessage: c.messages[0] || null,
        lastMessageAt: c.lastMessageAt,
        createdAt: c.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[admin/agent/conversations] GET failed:", message);
    return NextResponse.json(
      { success: false, error: "Failed to list conversations" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST — Update Conversation
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { conversationId, action } = body as {
      conversationId: string;
      action: string;
    };

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: "conversationId is required" },
        { status: 400 },
      );
    }

    switch (action) {
      case "resolve": {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { status: "resolved" },
        });
        return NextResponse.json({ success: true, action: "resolved" });
      }

      case "archive": {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { status: "archived" },
        });
        return NextResponse.json({ success: true, action: "archived" });
      }

      case "reopen": {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { status: "open" },
        });
        return NextResponse.json({ success: true, action: "reopened" });
      }

      case "update_tags": {
        const tags = (body.tags as string[]) || [];
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { tags },
        });
        return NextResponse.json({ success: true, action: "tags_updated", tags });
      }

      case "update_summary": {
        const summary = body.summary as string;
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { summary },
        });
        return NextResponse.json({ success: true, action: "summary_updated" });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[admin/agent/conversations] POST failed:", message);
    return NextResponse.json(
      { success: false, error: "Failed to update conversation" },
      { status: 500 },
    );
  }
}
