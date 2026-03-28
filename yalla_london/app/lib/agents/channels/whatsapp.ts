/**
 * WhatsApp Channel Adapter — Meta Cloud API integration via Kapso SDK
 *
 * Implements ChannelAdapter for bidirectional WhatsApp messaging.
 * Uses @kapso/whatsapp-cloud-api SDK for typed, validated API calls.
 * Supports direct mode (graph.facebook.com) and proxy mode (api.kapso.ai).
 *
 * Env vars:
 *   WHATSAPP_PHONE_NUMBER_ID  — Meta Business phone number ID
 *   WHATSAPP_ACCESS_TOKEN     — Meta Business API access token
 *   WHATSAPP_VERIFY_TOKEN     — Webhook verification token (custom string)
 *   WHATSAPP_BUSINESS_ACCOUNT_ID — Meta Business account ID
 *   KAPSO_API_KEY             — Kapso proxy API key (optional)
 *   KAPSO_PROXY_ENABLED       — "true" to route via api.kapso.ai (optional)
 */

import type {
  ChannelAdapter,
  CEOEvent,
  SendOptions,
  SendResult,
} from "../types";
import {
  getKapsoClient,
  getPhoneNumberId,
  isKapsoConfigured,
} from "@/lib/integrations/kapso-client";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function getConfig() {
  return {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
  };
}

export function isWhatsAppConfigured(): boolean {
  return isKapsoConfigured();
}

// ---------------------------------------------------------------------------
// WhatsApp Cloud API helpers — via Kapso SDK
// ---------------------------------------------------------------------------

/**
 * Send a text message via Kapso SDK.
 */
async function sendTextMessage(
  to: string,
  text: string,
): Promise<{ messageId: string }> {
  const client = getKapsoClient();
  const phoneNumberId = getPhoneNumberId();

  const result = await client.messages.sendText({
    phoneNumberId,
    to,
    body: text,
  });

  const messageId = result.messages?.[0]?.id || "";
  return { messageId };
}

/**
 * Send a template message via Kapso SDK.
 */
async function sendTemplateMessage(
  to: string,
  templateName: string,
  templateParams?: Record<string, string>,
): Promise<{ messageId: string }> {
  const client = getKapsoClient();
  const phoneNumberId = getPhoneNumberId();

  const components: Array<Record<string, unknown>> = [];
  if (templateParams && Object.keys(templateParams).length > 0) {
    components.push({
      type: "body",
      parameters: Object.values(templateParams).map((value) => ({
        type: "text",
        text: value,
      })),
    });
  }

  const result = await client.messages.sendTemplate({
    phoneNumberId,
    to,
    template: {
      name: templateName,
      language: { code: "en" },
      components: components as any,
    },
  });

  return { messageId: result.messages?.[0]?.id || "" };
}

/**
 * Mark a message as read (blue ticks) via Kapso SDK sendRaw.
 * The SDK has no dedicated markAsRead method — use sendRaw with status payload.
 */
async function markAsRead(messageId: string): Promise<void> {
  const client = getKapsoClient();
  const phoneNumberId = getPhoneNumberId();

  try {
    await client.messages.sendRaw({
      phoneNumberId,
      payload: {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      },
    });
  } catch (err) {
    console.warn(
      "[whatsapp] markAsRead failed:",
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ---------------------------------------------------------------------------
// Inbound Parsing — Meta Cloud API webhook format
// ---------------------------------------------------------------------------

/**
 * Parse Meta Cloud API webhook payload into a CEOEvent.
 *
 * Webhook format: entry[0].changes[0].value.messages[0]
 */
function parseWebhookPayload(
  rawPayload: unknown,
  siteId: string,
): CEOEvent | null {
  const payload = rawPayload as Record<string, unknown>;
  if (!payload) return null;

  const entry = payload.entry as Array<Record<string, unknown>> | undefined;
  const changes = entry?.[0]?.changes as
    | Array<Record<string, unknown>>
    | undefined;
  const value = changes?.[0]?.value as Record<string, unknown> | undefined;

  if (!value) return null;

  // Status updates (delivered, read) — not a message
  const statuses = value.statuses as Array<unknown> | undefined;
  if (statuses && statuses.length > 0) {
    return null; // Status update, not a message
  }

  const messages = value.messages as
    | Array<Record<string, unknown>>
    | undefined;
  const message = messages?.[0];
  if (!message) return null;

  // Extract contact info
  const contacts = value.contacts as
    | Array<Record<string, unknown>>
    | undefined;
  const profile = contacts?.[0]?.profile as
    | Record<string, unknown>
    | undefined;

  // Determine content type and extract content
  const msgType = (message.type as string) || "text";
  let content = "";
  let contentType: CEOEvent["contentType"] = "text";
  const mediaUrls: string[] = [];

  switch (msgType) {
    case "text": {
      const textObj = message.text as Record<string, unknown> | undefined;
      content = (textObj?.body as string) || "";
      break;
    }
    case "image": {
      const imgObj = message.image as Record<string, unknown> | undefined;
      content = (imgObj?.caption as string) || "[Image]";
      contentType = "image";
      if (imgObj?.id) mediaUrls.push(imgObj.id as string);
      break;
    }
    case "document": {
      const docObj = message.document as Record<string, unknown> | undefined;
      content = (docObj?.caption as string) || (docObj?.filename as string) || "[Document]";
      contentType = "document";
      if (docObj?.id) mediaUrls.push(docObj.id as string);
      break;
    }
    case "location": {
      const locObj = message.location as Record<string, unknown> | undefined;
      content = `Location: ${locObj?.latitude}, ${locObj?.longitude}`;
      break;
    }
    case "contacts": {
      content = "[Contact shared]";
      break;
    }
    case "interactive": {
      const intObj = message.interactive as Record<string, unknown> | undefined;
      const btnReply = intObj?.button_reply as Record<string, unknown> | undefined;
      const listReply = intObj?.list_reply as Record<string, unknown> | undefined;
      content = (btnReply?.title as string) || (listReply?.title as string) || "[Interactive]";
      break;
    }
    default:
      content = `[${msgType}]`;
  }

  const senderPhone = (message.from as string) || "";
  const whatsappMsgId = (message.id as string) || "";

  return {
    id: crypto.randomUUID(),
    channel: "whatsapp",
    direction: "inbound",
    content,
    contentType,
    externalId: senderPhone,
    senderName: (profile?.name as string) || undefined,
    mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
    siteId,
    timestamp: new Date(
      Number(message.timestamp as string) * 1000 || Date.now(),
    ).toISOString(),
    metadata: {
      whatsappMessageId: whatsappMsgId,
      rawPayload: payload,
    },
  };
}

// ---------------------------------------------------------------------------
// WhatsApp Channel Adapter
// ---------------------------------------------------------------------------

export function createWhatsAppAdapter(siteId: string): ChannelAdapter {
  return {
    channel: "whatsapp",

    async parseInbound(rawPayload: unknown): Promise<CEOEvent | null> {
      return parseWebhookPayload(rawPayload, siteId);
    },

    async sendResponse(
      externalId: string,
      content: string,
      options?: SendOptions,
    ): Promise<SendResult> {
      try {
        if (!isWhatsAppConfigured()) {
          return { success: false, error: "WhatsApp not configured" };
        }

        let result: { messageId: string };

        if (options?.contentType === "template" && options.templateName) {
          result = await sendTemplateMessage(
            externalId,
            options.templateName,
            options.templateParams,
          );
        } else {
          result = await sendTextMessage(externalId, content);
        }

        return { success: true, messageId: result.messageId };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err);
        console.warn("[whatsapp] sendResponse failed:", message);
        return { success: false, error: message };
      }
    },

    async verifySignature(request: Request): Promise<boolean> {
      // Meta verifies via X-Hub-Signature-256 header: sha256=<hex digest>
      const signature = request.headers.get("x-hub-signature-256");
      if (!signature || !signature.startsWith("sha256=")) return false;

      const appSecret = process.env.WHATSAPP_APP_SECRET;
      if (!appSecret) {
        console.warn("[whatsapp] WHATSAPP_APP_SECRET not configured — signature verification skipped");
        return false;
      }

      try {
        const body = await request.clone().text();
        const { createHmac } = await import("crypto");
        const expectedHash = createHmac("sha256", appSecret)
          .update(body)
          .digest("hex");
        const expectedSignature = `sha256=${expectedHash}`;

        // Timing-safe comparison to prevent timing attacks
        if (signature.length !== expectedSignature.length) return false;
        const { timingSafeEqual } = await import("crypto");
        return timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expectedSignature),
        );
      } catch (err) {
        console.warn("[whatsapp] Signature verification error:", err instanceof Error ? err.message : String(err));
        return false;
      }
    },
  };
}

/**
 * Verify WhatsApp webhook subscription (GET challenge).
 * Meta sends: hub.mode=subscribe, hub.verify_token=<token>, hub.challenge=<challenge>
 */
export function verifyWebhookSubscription(
  searchParams: URLSearchParams,
): { verified: boolean; challenge?: string } {
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const cfg = getConfig();

  if (mode === "subscribe" && token === cfg.verifyToken && challenge) {
    return { verified: true, challenge };
  }

  return { verified: false };
}

// Re-export markAsRead for use in webhook handler
export { markAsRead };
