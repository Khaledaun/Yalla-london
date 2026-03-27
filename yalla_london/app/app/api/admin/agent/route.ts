/**
 * CEO Agent Admin API — trigger, status, and config
 *
 * GET  — Agent status (registered tools, health)
 * POST — Trigger agent processing (mock event for testing)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getAgentStatus, processCEOEvent } from "@/lib/agents/ceo-brain";
import { normalizeEvent, classifyIntent } from "@/lib/agents/event-router";
import type { CEOEvent, Channel } from "@/lib/agents/types";

export const maxDuration = 60;

// ---------------------------------------------------------------------------
// GET — Agent status
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const status = getAgentStatus();

    return NextResponse.json({
      success: true,
      agent: "ceo",
      status,
      timestamp: new Date().toISOString(),
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
