/**
 * WhatsApp Channel Adapter — Meta Cloud API integration
 *
 * Implements ChannelAdapter for bidirectional WhatsApp messaging.
 * Uses Meta Cloud API (no intermediary like Kapso) via pure HTTP fetch.
 *
 * Env vars:
 *   WHATSAPP_PHONE_NUMBER_ID  — Meta Business phone number ID
 *   WHATSAPP_ACCESS_TOKEN     — Meta Business API access token
 *   WHATSAPP_VERIFY_TOKEN     — Webhook verification token (custom string)
 *   WHATSAPP_BUSINESS_ACCOUNT_ID — Meta Business account ID
 */

import type {
  ChannelAdapter,
  CEOEvent,
  SendOptions,
  SendResult,
} from "../types";

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
  const cfg = getConfig();
  return !!(cfg.phoneNumberId && cfg.accessToken);
}

// ---------------------------------------------------------------------------
// WhatsApp Cloud API helpers
// ---------------------------------------------------------------------------

const CLOUD_API_BASE = "https://graph.facebook.com/v19.0";

/**
 * Send a text message via WhatsApp Cloud API.
 */
async function sendTextMessage(
  to: string,
  text: string,
): Promise<{ messageId: string }> {
  const cfg = getConfig();
  const url = `${CLOUD_API_BASE}/${cfg.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(
      `WhatsApp API ${response.status}: ${errBody.slice(0, 300)}`,
    );
  }

  const result = (await response.json()) as {
    messages?: Array<{ id: string }>;
  };
  const messageId = result.messages?.[0]?.id || "";
  return { messageId };
}

/**
 * Send a template message via WhatsApp Cloud API.
 */
async function sendTemplateMessage(
  to: string,
  templateName: string,
  templateParams?: Record<string, string>,
): Promise<{ messageId: string }> {
  const cfg = getConfig();
  const url = `${CLOUD_API_BASE}/${cfg.phoneNumberId}/messages`;

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

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: "en" },
        components,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(
      `WhatsApp template API ${response.status}: ${errBody.slice(0, 300)}`,
    );
  }

  const result = (await response.json()) as {
    messages?: Array<{ id: string }>;
  };
  return { messageId: result.messages?.[0]?.id || "" };
}

/**
 * Mark a message as read (blue ticks).
 */
async function markAsRead(messageId: string): Promise<void> {
  const cfg = getConfig();
  const url = `${CLOUD_API_BASE}/${cfg.phoneNumberId}/messages`;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
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
