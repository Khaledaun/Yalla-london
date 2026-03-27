/**
 * Stripe Agent Webhook — payment events → FinanceEvent → CEO Agent processing.
 *
 * POST — Receives Stripe webhook events and routes them to the CEO Agent.
 *
 * Events handled:
 *   - payment_intent.succeeded  → auto-send receipt, link to opportunity
 *   - payment_intent.payment_failed → escalate to Khaled
 *   - charge.dispute.created    → escalate to Khaled (always)
 *   - charge.refunded           → log + notify
 *   - invoice.paid              → log + receipt
 *   - invoice.payment_failed    → escalate
 *   - checkout.session.completed → log + receipt
 *
 * Env vars:
 *   STRIPE_WEBHOOK_SECRET — Stripe webhook signing secret (whsec_...)
 *   STRIPE_SECRET_KEY     — Stripe API key (for verification)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDefaultSiteId } from "@/config/sites";

export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Event Type Classification
// ---------------------------------------------------------------------------

const ESCALATION_EVENTS = new Set([
  "payment_intent.payment_failed",
  "charge.dispute.created",
  "charge.dispute.updated",
  "invoice.payment_failed",
]);

const AUTO_PROCESS_EVENTS = new Set([
  "payment_intent.succeeded",
  "charge.refunded",
  "invoice.paid",
  "checkout.session.completed",
]);

function classifyEventType(stripeType: string): string {
  const map: Record<string, string> = {
    "payment_intent.succeeded": "payment_succeeded",
    "payment_intent.payment_failed": "payment_failed",
    "charge.dispute.created": "dispute_created",
    "charge.dispute.updated": "dispute_updated",
    "charge.refunded": "refund_completed",
    "invoice.paid": "invoice_paid",
    "invoice.payment_failed": "invoice_payment_failed",
    "checkout.session.completed": "checkout_completed",
  };
  return map[stripeType] || stripeType;
}

// ---------------------------------------------------------------------------
// POST — Stripe Webhook Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    console.warn("[stripe-agent] Invalid request body");
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Verify signature if secret is configured
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  if (webhookSecret && signature) {
    try {
      const crypto = await import("crypto");
      const elements = signature.split(",");
      const timestamp = elements.find((e) => e.startsWith("t="))?.slice(2);
      const v1Sig = elements.find((e) => e.startsWith("v1="))?.slice(3);

      if (!timestamp || !v1Sig) {
        return NextResponse.json({ error: "Invalid signature format" }, { status: 400 });
      }

      // Check timestamp tolerance (5 minutes)
      const ts = parseInt(timestamp, 10);
      if (Math.abs(Date.now() / 1000 - ts) > 300) {
        return NextResponse.json({ error: "Timestamp too old" }, { status: 400 });
      }

      const payload = `${timestamp}.${rawBody}`;
      const expected = crypto
        .createHmac("sha256", webhookSecret)
        .update(payload)
        .digest("hex");

      if (expected !== v1Sig) {
        console.warn("[stripe-agent] Signature verification failed");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    } catch (err) {
      console.warn("[stripe-agent] Signature verification error:", err instanceof Error ? err.message : String(err));
      return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
    }
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.type as string;
  const eventId = event.id as string;

  if (!eventType || !eventId) {
    return NextResponse.json({ error: "Missing event type or id" }, { status: 400 });
  }

  // Check if already processed (idempotency)
  const existing = await prisma.financeEvent.findFirst({
    where: { externalId: eventId },
  });
  if (existing) {
    return NextResponse.json({ status: "already_processed" }, { status: 200 });
  }

  const siteId = request.headers.get("x-site-id") || getDefaultSiteId();
  const eventObj = (event.data as Record<string, unknown>)?.object as Record<string, unknown> || {};

  // Extract common fields
  const amount = typeof eventObj.amount === "number"
    ? eventObj.amount / 100 // Stripe amounts are in cents
    : typeof eventObj.amount_total === "number"
      ? (eventObj.amount_total as number) / 100
      : null;

  const currency = ((eventObj.currency as string) || "usd").toUpperCase();
  const contactEmail =
    (eventObj.receipt_email as string) ||
    ((eventObj.customer_details as Record<string, unknown>)?.email as string) ||
    null;

  // Determine action based on event type
  const needsEscalation = ESCALATION_EVENTS.has(eventType);
  const isAutoProcess = AUTO_PROCESS_EVENTS.has(eventType);

  let agentAction: string;
  let status: string;

  if (needsEscalation) {
    agentAction = "escalated_to_khaled";
    status = "escalated";
  } else if (isAutoProcess) {
    agentAction = eventType.includes("refund") ? "logged_refund" : "sent_receipt";
    status = "processed";
  } else {
    agentAction = "logged";
    status = "pending";
  }

  // Store FinanceEvent
  const financeEvent = await prisma.financeEvent.create({
    data: {
      siteId,
      source: "stripe",
      eventType: classifyEventType(eventType),
      externalId: eventId,
      amount,
      currency,
      contactEmail,
      status,
      agentAction,
      processedAt: status !== "pending" ? new Date() : null,
      metadata: {
        stripeType: eventType,
        objectId: eventObj.id || null,
        livemode: event.livemode || false,
      },
    },
  });

  // Process in background — CEO Agent handles escalation/notification
  processFinanceEvent(financeEvent.id, siteId, needsEscalation).catch((err) => {
    console.warn(
      "[stripe-agent] Background processing failed:",
      err instanceof Error ? err.message : String(err),
    );
  });

  return NextResponse.json({ status: "received", financeEventId: financeEvent.id }, { status: 200 });
}

// ---------------------------------------------------------------------------
// Background Processing
// ---------------------------------------------------------------------------

async function processFinanceEvent(
  financeEventId: string,
  siteId: string,
  needsEscalation: boolean,
) {
  const fe = await prisma.financeEvent.findUnique({
    where: { id: financeEventId },
  });
  if (!fe) return;

  // Route to CEO Agent via internal channel
  try {
    const { createInternalAdapter } = await import("@/lib/agents/channels/internal");
    const { processCEOEvent } = await import("@/lib/agents/ceo-brain");

    const adapter = createInternalAdapter(siteId);
    const event = await adapter.parseInbound({
      eventType: `finance:${fe.eventType}`,
      source: "stripe",
      description: buildFinanceDescription(fe),
      amount: fe.amount,
      currency: fe.currency,
      contactEmail: fe.contactEmail,
      financeEventId: fe.id,
      needsEscalation,
    });

    if (event) {
      await processCEOEvent(event);
    }
  } catch (err) {
    console.warn(
      "[stripe-agent] CEO Agent processing failed:",
      err instanceof Error ? err.message : String(err),
    );
  }

  // If escalation needed, create AgentTask for visibility
  if (needsEscalation) {
    try {
      await prisma.agentTask.create({
        data: {
          agentType: "ceo",
          taskType: "finance_escalation",
          priority: "high",
          status: "pending",
          description: `ESCALATION: ${fe.eventType} — ${fe.currency} ${fe.amount || "N/A"}${fe.contactEmail ? ` from ${fe.contactEmail}` : ""}`,
          input: {
            financeEventId: fe.id,
            eventType: fe.eventType,
            amount: fe.amount,
            currency: fe.currency,
            contactEmail: fe.contactEmail,
          },
          siteId,
        },
      });
    } catch (err) {
      console.warn(
        "[stripe-agent] AgentTask creation failed:",
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

function buildFinanceDescription(fe: {
  eventType: string;
  amount: number | null;
  currency: string;
  contactEmail: string | null;
}): string {
  const parts = [`Stripe event: ${fe.eventType}`];
  if (fe.amount != null) parts.push(`Amount: ${fe.currency} ${fe.amount.toFixed(2)}`);
  if (fe.contactEmail) parts.push(`Customer: ${fe.contactEmail}`);
  return parts.join(" | ");
}
