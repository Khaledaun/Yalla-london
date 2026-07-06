/**
 * Email Send Tool Handlers — wraps Resend service for CEO Agent.
 *
 * Tools: send_email, trigger_retention
 */

import type { ToolContext, ToolResult } from "../types";
import { startSequence, pauseSequence } from "../crm/retention";

// ---------------------------------------------------------------------------
// send_email — send via Resend (wraps existing resend-service)
// ---------------------------------------------------------------------------

export async function sendEmail(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const to = params.to as string;
  const subject = params.subject as string;
  const body = params.body as string;
  const siteId = (params.siteId as string) || ctx.siteId;

  try {
    // Dynamic import to avoid pulling Resend SDK at module load
    const { sendResendEmail } = await import("@/lib/email/resend-service");

    const result = await sendResendEmail({
      to,
      subject,
      html: body,
      tags: [
        { name: "source", value: "ceo-agent" },
        { name: "siteId", value: siteId },
      ],
    });

    if (!result?.id) {
      return { success: false, error: "Email send returned no message ID." };
    }

    return {
      success: true,
      data: { messageId: result.id },
      summary: `Email sent to ${to}: "${subject}"`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Email send failed: ${message}` };
  }
}

// ---------------------------------------------------------------------------
// trigger_retention — start/pause/cancel retention sequence
// ---------------------------------------------------------------------------

export async function triggerRetention(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const subscriberId = params.subscriberId as string;
  const action = params.action as string;
  const sequenceId = params.sequenceId as string | undefined;

  switch (action) {
    case "start": {
      // Start a retention sequence based on trigger event
      const triggerEvent = (params.triggerEvent as string) || "subscriber_created";
      const result = await startSequence(ctx.siteId, subscriberId, triggerEvent);
      if (!result.started) {
        return {
          success: false,
          error: result.error || "Failed to start sequence.",
        };
      }
      return {
        success: true,
        data: { sequenceId: result.sequenceId },
        summary: `Retention sequence started for subscriber ${subscriberId}.`,
      };
    }

    case "pause":
    case "cancel": {
      if (!sequenceId) {
        return { success: false, error: "sequenceId required to pause/cancel." };
      }
      const reason = action === "cancel" ? "unsubscribed" : "paused";
      const paused = await pauseSequence(
        sequenceId,
        subscriberId,
        reason as "paused" | "unsubscribed",
      );
      return {
        success: paused,
        summary: paused
          ? `Retention sequence ${action}d for subscriber.`
          : `Failed to ${action} retention sequence.`,
      };
    }

    default:
      return { success: false, error: `Unknown action: ${action}` };
  }
}
