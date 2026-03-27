/**
 * Internal Channel Adapter — system-generated events (cron alerts, finance events, etc.)
 *
 * Implements ChannelAdapter for internal system events.
 * Inbound: cron failure alerts, Stripe webhook events, scheduled follow-ups.
 * Outbound: logs to AgentTask (no external messaging).
 */

import type {
  ChannelAdapter,
  CEOEvent,
  SendOptions,
  SendResult,
} from "../types";

// ---------------------------------------------------------------------------
// Inbound Parsing — System event format
// ---------------------------------------------------------------------------

function parseInternalPayload(
  rawPayload: unknown,
  siteId: string,
): CEOEvent | null {
  const payload = rawPayload as Record<string, unknown>;
  if (!payload) return null;

  const content =
    (payload.description as string) ||
    (payload.message as string) ||
    "";

  if (!content) return null;

  const eventType = (payload.eventType as string) || "system";
  const source = (payload.source as string) || "system";

  return {
    id: crypto.randomUUID(),
    channel: "internal",
    direction: "inbound",
    content,
    contentType: "system",
    externalId: source,
    siteId,
    timestamp: new Date().toISOString(),
    metadata: {
      eventType,
      source,
      ...payload,
    },
  };
}

// ---------------------------------------------------------------------------
// Internal Channel Adapter
// ---------------------------------------------------------------------------

export function createInternalAdapter(siteId: string): ChannelAdapter {
  return {
    channel: "internal",

    async parseInbound(rawPayload: unknown): Promise<CEOEvent | null> {
      return parseInternalPayload(rawPayload, siteId);
    },

    async sendResponse(
      _externalId: string,
      content: string,
      _options?: SendOptions,
    ): Promise<SendResult> {
      // Internal events don't send external messages.
      // Log the agent's response as an AgentTask for visibility.
      try {
        const { prisma } = await import("@/lib/db");

        await prisma.agentTask.create({
          data: {
            agentType: "ceo",
            taskType: "internal_response",
            priority: "medium",
            status: "completed",
            description: content.slice(0, 500),
            output: { response: content },
            completedAt: new Date(),
          },
        });

        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err);
        console.warn("[internal-adapter] sendResponse failed:", message);
        return { success: false, error: message };
      }
    },
  };
}
