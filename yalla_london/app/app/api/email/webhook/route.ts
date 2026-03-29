/**
 * Resend Webhook Handler — POST /api/email/webhook
 *
 * Receives Resend webhook events (delivery, bounce, complaint, open, click).
 * Logs to CronJobLog (no separate email_events table needed — uses existing infra).
 * Updates subscriber status on bounce/complaint.
 *
 * Setup: In Resend dashboard → Webhooks → Add endpoint:
 *   URL: https://www.yalla-london.com/api/email/webhook
 *   Events: email.sent, email.delivered, email.opened, email.clicked,
 *           email.bounced, email.complained
 *   Signing secret → set as RESEND_WEBHOOK_SECRET in Vercel env vars
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 10;

// Resend event types we care about
type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.opened"
  | "email.clicked"
  | "email.bounced"
  | "email.complained";

interface ResendWebhookPayload {
  type: ResendEventType;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject?: string;
    created_at: string;
    // bounce/complaint specific
    bounce?: { message: string; type: string };
    complaint?: { message: string };
    // click specific
    click?: { link: string; timestamp: string };
  };
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Verify webhook signature
    const { verifyWebhookSignature } = await import("@/lib/email/resend-service");
    const payload = await verifyWebhookSignature(rawBody, {
      "svix-id": request.headers.get("svix-id") || undefined,
      "svix-timestamp": request.headers.get("svix-timestamp") || undefined,
      "svix-signature": request.headers.get("svix-signature") || undefined,
    });

    if (!payload) {
      console.warn("[email/webhook] Signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = payload as unknown as ResendWebhookPayload;
    const { type, data } = event;

    console.log(`[email/webhook] Received ${type} for ${data.email_id}`);

    // Log event to CronJobLog for dashboard visibility
    const { prisma } = await import("@/lib/db");

    await prisma.cronJobLog.create({
      data: {
        job_name: "email-webhook",
        job_type: "webhook",
        status: "completed",
        started_at: new Date(),
        completed_at: new Date(),
        duration_ms: 0,
        items_processed: 1,
        result_summary: {
          eventType: type,
          emailId: data.email_id,
          recipients: data.to,
          subject: data.subject || null,
          timestamp: event.created_at,
          ...(data.bounce ? { bounceType: data.bounce.type, bounceMessage: data.bounce.message } : {}),
          ...(data.complaint ? { complaintMessage: data.complaint.message } : {}),
          ...(data.click ? { clickLink: data.click.link } : {}),
        },
      },
    });

    // Handle bounces and complaints — unsubscribe to stop future sends
    if (type === "email.bounced" || type === "email.complained") {
      const reason = type === "email.bounced" ? "bounce" : "complaint";
      const emails = data.to || [];

      for (const email of emails) {
        try {
          await prisma.subscriber.updateMany({
            where: { email: email.toLowerCase() },
            data: {
              status: "UNSUBSCRIBED",
              unsubscribed_at: new Date(),
              metadata_json: {
                unsubscribe_reason: reason,
                unsubscribe_detail: type === "email.bounced"
                  ? data.bounce?.message || "Hard bounce"
                  : data.complaint?.message || "Spam complaint",
                unsubscribe_event_id: data.email_id,
              },
            },
          });
          console.log(`[email/webhook] Unsubscribed ${email} — reason: ${reason}`);
        } catch (subErr) {
          // Subscriber may not exist in DB (e.g., one-off transactional email)
          console.warn(`[email/webhook] Could not update subscriber ${email}:`, subErr instanceof Error ? subErr.message : subErr);
        }
      }
    }

    return NextResponse.json({ received: true, type });
  } catch (err) {
    console.error("[email/webhook] Error:", err instanceof Error ? err.message : err);
    // Return 200 to prevent Resend from retrying on our errors
    return NextResponse.json({ received: true, error: "Processing error" }, { status: 200 });
  }
}

// Resend sends GET for webhook endpoint verification
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Resend webhook endpoint",
    events: ["email.sent", "email.delivered", "email.opened", "email.clicked", "email.bounced", "email.complained"],
  });
}
