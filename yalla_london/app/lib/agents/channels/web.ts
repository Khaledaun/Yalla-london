/**
 * Web Channel Adapter — handles contact form submissions and future web chat.
 *
 * Implements ChannelAdapter for web-originated events.
 * Inbound: contact forms, inquiry forms, web chat messages.
 * Outbound: email reply to the form submitter.
 */

import type {
  ChannelAdapter,
  CEOEvent,
  SendOptions,
  SendResult,
} from "../types";

// ---------------------------------------------------------------------------
// Inbound Parsing — Form submission format
// ---------------------------------------------------------------------------

function parseWebPayload(
  rawPayload: unknown,
  siteId: string,
): CEOEvent | null {
  const payload = rawPayload as Record<string, unknown>;
  if (!payload) return null;

  const content = (payload.message as string) || "";
  const senderEmail = (payload.email as string) || "";
  const senderName = (payload.name as string) || undefined;
  const formType = (payload.formType as string) || "contact";

  if (!content) return null;

  return {
    id: crypto.randomUUID(),
    channel: "web",
    direction: "inbound",
    content,
    contentType: "text",
    externalId: senderEmail,
    senderName,
    siteId,
    timestamp: new Date().toISOString(),
    metadata: {
      formType,
      rawPayload: payload,
    },
  };
}

// ---------------------------------------------------------------------------
// Web Channel Adapter
// ---------------------------------------------------------------------------

export function createWebAdapter(siteId: string): ChannelAdapter {
  return {
    channel: "web",

    async parseInbound(rawPayload: unknown): Promise<CEOEvent | null> {
      return parseWebPayload(rawPayload, siteId);
    },

    async sendResponse(
      externalId: string,
      content: string,
      options?: SendOptions,
    ): Promise<SendResult> {
      try {
        if (!externalId || !externalId.includes("@")) {
          return {
            success: false,
            error: "No email address to reply to",
          };
        }

        const { sendEmail } = await import("@/lib/email/sender");

        await sendEmail({
          to: externalId,
          subject: options?.templateName || "Thank you for your inquiry",
          html: content.replace(/\n/g, "<br>"),
        });

        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err);
        console.warn("[web-adapter] sendResponse failed:", message);
        return { success: false, error: message };
      }
    },
  };
}
