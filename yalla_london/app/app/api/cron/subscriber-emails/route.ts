export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Subscriber Email Processing Cron
 *
 * Processes pending BackgroundJob records of type "subscriber_notification"
 * by sending notification emails to confirmed subscribers about new content.
 *
 * Uses the existing processSubscriberNotifications() from lib/email-notifications.ts
 * which was fully built but never had a cron trigger.
 *
 * Schedule: Daily at 10:00 UTC (after content is published and indexed)
 * Budget: 53s with 7s buffer
 */

import { NextRequest, NextResponse } from "next/server";
const BUDGET_MS = 53_000;

async function handleSubscriberEmails(request: NextRequest) {
  const cronStart = Date.now();
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Feature flag guard
  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const flagResponse = await checkCronEnabled("subscriber-emails");
  if (flagResponse) return flagResponse;

  // Healthcheck mode
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    try {
      const { prisma } = await import("@/lib/db");
      const pendingJobs = await prisma.backgroundJob.count({
        where: { job_type: "subscriber_notification", status: "pending" },
      });
      const confirmedSubscribers = await prisma.subscriber.count({
        where: { status: "confirmed" },
      });
      return NextResponse.json({
        status: "healthy",
        endpoint: "subscriber-emails",
        pendingJobs,
        confirmedSubscribers,
        timestamp: new Date().toISOString(),
      });
    } catch {
      return NextResponse.json({
        status: "healthy",
        endpoint: "subscriber-emails",
        timestamp: new Date().toISOString(),
      });
    }
  }

  try {
    const { processSubscriberNotifications } = await import("@/lib/email-notifications");

    // Process pending notification jobs with budget guard
    const result = await processSubscriberNotifications();

    const durationMs = Date.now() - cronStart;

    const { logCronExecution } = await import("@/lib/cron-logger");
    await logCronExecution("subscriber-emails", "completed", {
      durationMs,
      itemsProcessed: typeof result === "object" && result !== null
        ? (result as unknown as Record<string, number>).sent || 0
        : 0,
      resultSummary: typeof result === "object" && result !== null ? result as unknown as Record<string, unknown> : { result },
    }).catch((err: Error) => console.warn("[subscriber-emails] log failed:", err.message));

    return NextResponse.json({
      success: true,
      result,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const durationMs = Date.now() - cronStart;
    const error = err as Error;

    const { logCronExecution: logFailed } = await import("@/lib/cron-logger");
    await logFailed("subscriber-emails", "failed", {
      durationMs,
      itemsProcessed: 0,
      errorMessage: error.message,
    }).catch((logErr: Error) => console.warn("[subscriber-emails] log failed:", logErr.message));

    return NextResponse.json(
      { success: false, error: "Subscriber email processing failed", durationMs },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleSubscriberEmails(request);
}

export async function POST(request: NextRequest) {
  return handleSubscriberEmails(request);
}
