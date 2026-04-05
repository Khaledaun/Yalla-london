/**
 * Event Router — normalizes raw channel payloads into CEOEvent
 * and routes them to the correct agent (CEO or CTO).
 *
 * Flow: raw payload -> normalizeEvent() -> classifyIntent() -> routeEvent()
 */

import type { CEOEvent, Channel, ResolvedContact } from "./types";
import { resolveContact } from "./crm/contact-resolver";
import { generateCompletion } from "@/lib/ai/provider";

// ---------------------------------------------------------------------------
// Event Normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a raw channel-specific payload into a CEOEvent.
 * Returns null if the payload is unparseable or missing required data.
 */
export function normalizeEvent(
  channel: Channel,
  rawPayload: unknown,
  siteId: string,
): CEOEvent | null {
  try {
    const payload = rawPayload as Record<string, unknown>;
    if (!payload) return null;

    switch (channel) {
      case "whatsapp":
        return normalizeWhatsApp(payload, siteId);
      case "email":
        return normalizeEmail(payload, siteId);
      case "web":
        return normalizeWeb(payload, siteId);
      case "internal":
        return normalizeInternal(payload, siteId);
      default:
        console.warn(`[event-router] Unknown channel: ${channel}`);
        return null;
    }
  } catch (err) {
    console.warn(
      "[event-router] normalizeEvent failed:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

function normalizeWhatsApp(
  payload: Record<string, unknown>,
  siteId: string,
): CEOEvent | null {
  // Meta Cloud API webhook format: entry[0].changes[0].value.messages[0]
  const entry = payload.entry as Array<Record<string, unknown>> | undefined;
  const changes = entry?.[0]?.changes as
    | Array<Record<string, unknown>>
    | undefined;
  const value = changes?.[0]?.value as Record<string, unknown> | undefined;
  const messages = value?.messages as
    | Array<Record<string, unknown>>
    | undefined;
  const message = messages?.[0];

  if (!message) return null;

  const contacts = value?.contacts as
    | Array<Record<string, unknown>>
    | undefined;
  const profile = contacts?.[0]?.profile as
    | Record<string, unknown>
    | undefined;

  const textBody = (message.text as Record<string, unknown> | undefined)
    ?.body as string | undefined;
  const content = textBody || (message.type as string) || "";
  const senderPhone = (message.from as string) || "";

  return {
    id: crypto.randomUUID(),
    channel: "whatsapp",
    direction: "inbound",
    content,
    contentType: "text",
    externalId: senderPhone,
    senderName: (profile?.name as string) || undefined,
    siteId,
    timestamp: new Date().toISOString(),
    metadata: { rawPayload: payload },
  };
}

function normalizeEmail(
  payload: Record<string, unknown>,
  siteId: string,
): CEOEvent | null {
  // Resend inbound format
  const content =
    (payload.text as string) || (payload.html as string) || "";
  const senderEmail = (payload.from as string) || "";
  const senderName = (payload.from_name as string) || undefined;

  if (!content && !senderEmail) return null;

  return {
    id: crypto.randomUUID(),
    channel: "email",
    direction: "inbound",
    content,
    contentType: "text",
    externalId: senderEmail,
    senderName,
    siteId,
    timestamp: new Date().toISOString(),
    metadata: { rawPayload: payload },
  };
}

function normalizeWeb(
  payload: Record<string, unknown>,
  siteId: string,
): CEOEvent | null {
  // Form submission format
  const content = (payload.message as string) || "";
  const senderEmail = (payload.email as string) || "";
  const senderName = (payload.name as string) || undefined;

  if (!content) return null;

  return {
    id: crypto.randomUUID(),
    channel: "web",
    direction: "inbound",
    content,
    contentType: "text",
    externalId: senderEmail || `web-${Date.now()}`,
    senderName,
    siteId,
    timestamp: new Date().toISOString(),
    metadata: { rawPayload: payload },
  };
}

function normalizeInternal(
  payload: Record<string, unknown>,
  siteId: string,
): CEOEvent | null {
  // System event format
  const content =
    (payload.description as string) ||
    (payload.message as string) ||
    "";

  if (!content) return null;

  return {
    id: crypto.randomUUID(),
    channel: "internal",
    direction: "inbound",
    content,
    contentType: "system",
    externalId: "system",
    siteId,
    timestamp: new Date().toISOString(),
    metadata: payload,
  };
}

// ---------------------------------------------------------------------------
// Intent Classification
// ---------------------------------------------------------------------------

const CTO_KEYWORDS = [
  "bug",
  "error",
  "crash",
  "deploy",
  "build",
  "typescript",
  "code",
  "test",
];

const CEO_INTENT_MAP: Record<string, string[]> = {
  inquiry: ["book", "charter", "yacht"],
  pricing: ["price", "cost", "budget"],
  greeting: ["hello", "hi", "hey"],
};

/**
 * Classify the intent of a message and determine which agent should handle it.
 * Uses keyword matching first; falls back to AI only for ambiguous content.
 */
export async function classifyIntent(
  content: string,
): Promise<{
  intent: string;
  confidence: number;
  suggestedAgent: "ceo" | "cto";
}> {
  const lower = content.toLowerCase();

  // Check CTO keywords first
  for (const keyword of CTO_KEYWORDS) {
    if (lower.includes(keyword)) {
      return { intent: "technical", confidence: 0.85, suggestedAgent: "cto" };
    }
  }

  // Check CEO intent keywords
  for (const [intent, keywords] of Object.entries(CEO_INTENT_MAP)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return { intent, confidence: 0.85, suggestedAgent: "ceo" };
      }
    }
  }

  // Ambiguous — use AI classification
  try {
    const result = await generateCompletion(
      [
        {
          role: "system" as const,
          content:
            "Classify this customer message into one intent and assign to an agent.\n" +
            'Return ONLY JSON: {"intent":"<intent>","confidence":<0-1>,"suggestedAgent":"ceo"|"cto"}\n' +
            "Intents: greeting, inquiry, pricing, support, complaint, technical, feedback, other.\n" +
            'Use "cto" for technical/code/infrastructure issues; "ceo" for everything else.',
        },
        { role: "user" as const, content },
      ],
      {
        maxTokens: 100,
        taskType: "classification",
        calledFrom: "event-router",
      },
    );

    const text = result?.content || "";
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        intent: String(parsed.intent || "other"),
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
        suggestedAgent: parsed.suggestedAgent === "cto" ? "cto" : "ceo",
      };
    }
  } catch (err) {
    console.warn(
      "[event-router] AI classification failed, defaulting to CEO:",
      err instanceof Error ? err.message : String(err),
    );
  }

  // Default fallback
  return { intent: "other", confidence: 0.4, suggestedAgent: "ceo" };
}

// ---------------------------------------------------------------------------
// Event Routing
// ---------------------------------------------------------------------------

/**
 * Route an event to the correct agent with resolved contact and intent.
 */
export async function routeEvent(
  event: CEOEvent,
  siteId: string,
): Promise<{
  agent: "ceo" | "cto";
  contact: ResolvedContact | null;
  intent: string;
  confidence: number;
}> {
  // Resolve contact (never crash)
  let contact: ResolvedContact | null = null;
  try {
    contact = await resolveContact({
      phone: event.channel === "whatsapp" ? event.externalId : undefined,
      email:
        event.channel === "email" || event.channel === "web"
          ? event.externalId
          : undefined,
      externalId: event.externalId,
      channel: event.channel,
      siteId,
    });
  } catch (err) {
    console.warn(
      "[event-router] resolveContact failed:",
      err instanceof Error ? err.message : String(err),
    );
  }

  // Classify intent (never crash)
  let intent = "other";
  let confidence = 0.4;
  let suggestedAgent: "ceo" | "cto" = "ceo";
  try {
    const classification = await classifyIntent(event.content);
    intent = classification.intent;
    confidence = classification.confidence;
    suggestedAgent = classification.suggestedAgent;
  } catch (err) {
    console.warn(
      "[event-router] classifyIntent failed:",
      err instanceof Error ? err.message : String(err),
    );
  }

  return {
    agent: suggestedAgent,
    contact,
    intent,
    confidence,
  };
}
