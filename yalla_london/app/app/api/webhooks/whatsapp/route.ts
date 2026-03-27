/**
 * WhatsApp Cloud API Webhook — bidirectional messaging
 *
 * GET  — Meta webhook verification (hub.challenge)
 * POST — Inbound message handling → CEO Brain → response → WhatsApp send
 *
 * Flow:
 *   Meta webhook POST → parse via WhatsApp adapter → find/create Conversation
 *   → resolve contact (ensureContact) → CEO Brain (processCEOEvent)
 *   → send response via adapter → store Messages + InteractionLog
 *
 * Env vars:
 *   WHATSAPP_PHONE_NUMBER_ID  — Meta Business phone number ID
 *   WHATSAPP_ACCESS_TOKEN     — Meta Business API access token
 *   WHATSAPP_VERIFY_TOKEN     — Webhook verification token (custom string)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createWhatsAppAdapter,
  verifyWebhookSubscription,
  isWhatsAppConfigured,
  markAsRead,
} from "@/lib/agents/channels/whatsapp";
import { processCEOEvent } from "@/lib/agents/ceo-brain";
import { ensureContact } from "@/lib/agents/crm/contact-resolver";
import type { CEOEvent } from "@/lib/agents/types";
import { getDefaultSiteId } from "@/config/sites";

export const maxDuration = 60;

// ---------------------------------------------------------------------------
// GET — Webhook Verification (Meta sends GET with hub.challenge)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const result = verifyWebhookSubscription(searchParams);

  if (result.verified && result.challenge) {
    // Meta requires the challenge string returned as plain text
    return new Response(result.challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json(
    { error: "Verification failed" },
    { status: 403 },
  );
}

// ---------------------------------------------------------------------------
// POST — Inbound Message Handling
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Always respond 200 quickly — Meta retries on non-200
  // Process asynchronously after acknowledging receipt

  if (!isWhatsAppConfigured()) {
    console.warn("[whatsapp-webhook] WhatsApp not configured — skipping");
    return NextResponse.json({ status: "not_configured" }, { status: 200 });
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    console.warn("[whatsapp-webhook] Invalid JSON body");
    return NextResponse.json({ status: "invalid_body" }, { status: 200 });
  }

  const siteId = request.headers.get("x-site-id") || getDefaultSiteId();
  const adapter = createWhatsAppAdapter(siteId);

  // Parse inbound event
  const event = await adapter.parseInbound(rawPayload);
  if (!event) {
    // Status update or unparseable — acknowledge silently
    return NextResponse.json({ status: "ignored" }, { status: 200 });
  }

  // Process in background — don't block Meta's webhook timeout
  processInboundMessage(event, siteId, adapter).catch((err) => {
    console.warn(
      "[whatsapp-webhook] Background processing failed:",
      err instanceof Error ? err.message : String(err),
    );
  });

  return NextResponse.json({ status: "received" }, { status: 200 });
}

// ---------------------------------------------------------------------------
// Background Processing Pipeline
// ---------------------------------------------------------------------------

async function processInboundMessage(
  event: CEOEvent,
  siteId: string,
  adapter: ReturnType<typeof createWhatsAppAdapter>,
) {
  const { prisma } = await import("@/lib/db");
  const startMs = Date.now();

  // 1. Mark inbound message as read (blue ticks)
  const whatsappMsgId = (event.metadata?.whatsappMessageId as string) || "";
  if (whatsappMsgId) {
    markAsRead(whatsappMsgId).catch(() => {
      // Non-critical — don't block processing
    });
  }

  // 2. Find or create Conversation
  let conversation = await prisma.conversation.findFirst({
    where: {
      siteId,
      channel: "whatsapp",
      externalId: event.externalId,
      status: { in: ["open", "waiting"] },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        siteId,
        channel: "whatsapp",
        externalId: event.externalId,
        contactName: event.senderName || null,
        contactPhone: event.externalId,
        status: "open",
        lastMessageAt: new Date(),
        metadata: { source: "whatsapp-webhook" },
      },
    });
  } else {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        contactName: event.senderName || conversation.contactName,
      },
    });
  }

  // 3. Store inbound message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "inbound",
      channel: "whatsapp",
      content: event.content,
      contentType: event.contentType || "text",
      mediaUrls: event.mediaUrls || [],
      senderName: event.senderName || null,
      metadata: {
        whatsappMessageId: whatsappMsgId,
        externalId: event.externalId,
      },
    },
  });

  // 4. Resolve or create contact
  let contact = null;
  try {
    contact = await ensureContact({
      phone: event.externalId,
      siteId,
      name: event.senderName,
      source: "whatsapp",
    });

    // Link contact to conversation if not already linked
    if (contact && !conversation.leadId && contact.leadId) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { leadId: contact.leadId },
      });
    }
  } catch (err) {
    console.warn(
      "[whatsapp-webhook] Contact resolution failed:",
      err instanceof Error ? err.message : String(err),
    );
  }

  // 5. Enrich event with conversation context
  const enrichedEvent: CEOEvent = {
    ...event,
    metadata: {
      ...event.metadata,
      conversationId: conversation.id,
      contactId: contact?.id || undefined,
    },
  };

  // 6. Process through CEO Brain
  let agentResult;
  try {
    agentResult = await processCEOEvent(enrichedEvent);
  } catch (err) {
    console.warn(
      "[whatsapp-webhook] CEO Brain processing failed:",
      err instanceof Error ? err.message : String(err),
    );
    agentResult = {
      success: false,
      responseText:
        "Thank you for your message. Our team will get back to you shortly.",
      responseType: "text" as const,
      toolsUsed: [],
      confidence: 0,
      needsApproval: true,
      crmActions: [],
      followUps: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // 7. Send response back via WhatsApp
  const responseText =
    agentResult.responseText ||
    "Thank you for your message. Our team will get back to you shortly.";

  const sendResult = await adapter.sendResponse(
    event.externalId,
    responseText,
  );

  // 8. Store outbound message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "outbound",
      channel: "whatsapp",
      content: responseText,
      contentType: "text",
      agentId: "ceo",
      toolsUsed: agentResult.toolsUsed || [],
      confidence: agentResult.confidence || null,
      approved: !agentResult.needsApproval,
      metadata: {
        whatsappMessageId: sendResult.messageId || null,
        sendSuccess: sendResult.success,
        sendError: sendResult.error || null,
        durationMs: Date.now() - startMs,
      },
    },
  });

  // 9. Update conversation status
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      status: agentResult.needsApproval ? "waiting" : "open",
      lastMessageAt: new Date(),
    },
  });

  // 10. Log interaction
  try {
    await prisma.interactionLog.create({
      data: {
        siteId,
        conversationId: conversation.id,
        leadId: contact?.leadId || null,
        opportunityId: conversation.opportunityId || null,
        channel: "whatsapp",
        direction: "inbound",
        interactionType: "message",
        summary: `WhatsApp: "${event.content.slice(0, 100)}${event.content.length > 100 ? "..." : ""}" → ${agentResult.toolsUsed.length ? `Used tools: ${agentResult.toolsUsed.join(", ")}` : "Direct response"}`,
        sentiment: null,
        agentId: "ceo",
        metadata: {
          eventId: event.id,
          responseLength: responseText.length,
          toolsUsed: agentResult.toolsUsed,
          confidence: agentResult.confidence,
          durationMs: Date.now() - startMs,
        },
      },
    });
  } catch (err) {
    console.warn(
      "[whatsapp-webhook] InteractionLog write failed:",
      err instanceof Error ? err.message : String(err),
    );
  }

  console.log(
    `[whatsapp-webhook] Processed in ${Date.now() - startMs}ms — conversation: ${conversation.id}, tools: [${agentResult.toolsUsed.join(", ")}], send: ${sendResult.success}`,
  );
}
