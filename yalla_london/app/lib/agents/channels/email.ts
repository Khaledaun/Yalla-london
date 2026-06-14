/**
 * Email Channel Adapter — wraps Resend for CEO Agent inbound/outbound email.
 *
 * Implements ChannelAdapter for email messages.
 * Inbound: parses Resend forward/webhook payloads.
 * Outbound: sends via existing email sender.
 */

import type {
  ChannelAdapter,
  CEOEvent,
  SendOptions,
  SendResult,
} from "../types";

// ---------------------------------------------------------------------------
// Inbound Parsing — Resend forward format
// ---------------------------------------------------------------------------

function parseEmailPayload(
  rawPayload: unknown,
  siteId: string,
): CEOEvent | null {
  const payload = rawPayload as Record<string, unknown>;
  if (!payload) return null;

  const content =
    (payload.text as string) || (payload.html as string) || "";
  const senderEmail = (payload.from as string) || "";
  const senderName = (payload.from_name as string) || undefined;
  const subject = (payload.subject as string) || "";

  if (!content && !senderEmail) return null;

  return {
    id: crypto.randomUUID(),
    channel: "email",
    direction: "inbound",
    content: subject ? `[${subject}] ${content}` : content,
    contentType: "text",
    externalId: senderEmail,
    senderName,
    siteId,
    timestamp: new Date().toISOString(),
    metadata: {
      subject,
      rawPayload: payload,
    },
  };
}

// ---------------------------------------------------------------------------
// Email Channel Adapter
// ---------------------------------------------------------------------------

export function createEmailAdapter(siteId: string): ChannelAdapter {
  return {
    channel: "email",

    async parseInbound(rawPayload: unknown): Promise<CEOEvent | null> {
      return parseEmailPayload(rawPayload, siteId);
    },

    async sendResponse(
      externalId: string,
      content: string,
      options?: SendOptions,
    ): Promise<SendResult> {
      try {
        // Dynamic import to avoid circular deps
        const { sendEmail } = await import("@/lib/email/sender");

        await sendEmail({
          to: externalId,
          subject:
            options?.templateName || "Re: Your inquiry",
          html: content.replace(/\n/g, "<br>"),
        });

        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err);
        console.warn("[email-adapter] sendResponse failed:", message);
        return { success: false, error: message };
      }
    },
  };
}
