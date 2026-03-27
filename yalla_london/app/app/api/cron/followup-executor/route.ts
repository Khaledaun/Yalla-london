/**
 * Follow-up Executor — Processes Due CEO Agent Follow-ups
 *
 * Schedule: Every 4 hours (1:00, 5:00, 9:00, 13:00, 17:00, 21:00 UTC)
 * Budget: 280s (300s maxDuration - 20s buffer)
 *
 * Picks up due AgentTask records (follow_up type, pending status, dueAt <= now)
 * and re-invokes CEO Brain to execute each follow-up action.
 */

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BUDGET_MS = 280_000;

async function handler(request: NextRequest) {
  const startTime = Date.now();

  // Feature flag guard
  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const blocked = await checkCronEnabled("followup-executor");
  if (blocked) return blocked;

  // CRON_SECRET auth
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let totalProcessed = 0;
  let totalSucceeded = 0;
  let totalFailed = 0;
  let overallStatus: "completed" | "failed" | "timed_out" = "completed";
  const errors: string[] = [];

  try {
    const { prisma } = await import("@/lib/db");

    // -----------------------------------------------------------------------
    // Step 1: Find due follow-up tasks
    // -----------------------------------------------------------------------
    const dueTasks = await prisma.agentTask.findMany({
      where: {
        agentType: "ceo",
        taskType: "follow_up",
        status: "pending",
        dueAt: { lte: new Date() },
      },
      orderBy: { dueAt: "asc" },
      take: 20, // Process up to 20 follow-ups per run
    });

    if (dueTasks.length === 0) {
      // Log and return — no work to do
      try {
        const { logCronExecution } = await import("@/lib/cron-logger");
        await logCronExecution("followup-executor", "completed", {
          durationMs: Date.now() - startTime,
          itemsProcessed: 0,
          resultSummary: { message: "No due follow-ups" },
        });
      } catch (err) {
        console.warn("[followup-executor] Log failed:", err instanceof Error ? err.message : String(err));
      }

      return NextResponse.json({
        success: true,
        durationMs: Date.now() - startTime,
        processed: 0,
        succeeded: 0,
        failed: 0,
      });
    }

    // -----------------------------------------------------------------------
    // Step 2: Process each due follow-up
    // -----------------------------------------------------------------------
    const { processCEOEvent } = await import("@/lib/agents/ceo-brain");
    const { getDefaultSiteId } = await import("@/config/sites");

    for (const task of dueTasks) {
      if (Date.now() - startTime > BUDGET_MS - 30_000) break;

      totalProcessed++;

      try {
        // Mark task as running
        await prisma.agentTask.update({
          where: { id: task.id },
          data: { status: "running" },
        });

        // Extract follow-up context from task input
        const input = (task.input as Record<string, unknown>) || {};
        const contactId = (input.contactId as string) || undefined;
        const channel = (input.channel as string) || "internal";

        // Build a CEOEvent for the follow-up
        const event = {
          id: `followup-${task.id}`,
          siteId: task.siteId || getDefaultSiteId(),
          channel: channel as "whatsapp" | "email" | "web" | "internal",
          direction: "outbound" as const,
          externalId: contactId || "system",
          content: task.description,
          contentType: "text" as const,
          timestamp: new Date().toISOString(),
          metadata: {
            isFollowUp: true,
            taskId: task.id,
            conversationId: task.conversationId || undefined,
            priority: task.priority,
          },
        };

        // Re-invoke CEO Brain
        const result = await processCEOEvent(event);

        // Mark task completed
        await prisma.agentTask.update({
          where: { id: task.id },
          data: {
            status: result.success ? "completed" : "failed",
            completedAt: new Date(),
            durationMs: Date.now() - startTime,
            output: {
              responseText: result.responseText,
              toolsUsed: result.toolsUsed,
              crmActionsCount: result.crmActions?.length || 0,
            },
            errorMessage: result.success ? null : "CEO Brain returned failure",
          },
        });

        if (result.success) {
          totalSucceeded++;
        } else {
          totalFailed++;
        }
      } catch (err) {
        const msg = `Follow-up ${task.id} failed: ${err instanceof Error ? err.message : String(err)}`;
        console.warn(`[followup-executor] ${msg}`);
        errors.push(msg);
        totalFailed++;

        // Mark task failed
        try {
          await prisma.agentTask.update({
            where: { id: task.id },
            data: {
              status: "failed",
              completedAt: new Date(),
              errorMessage: err instanceof Error ? err.message : String(err),
            },
          });
        } catch (updateErr) {
          console.warn("[followup-executor] Failed to update task status:", updateErr instanceof Error ? updateErr.message : String(updateErr));
        }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[followup-executor] Fatal error:", msg);
    errors.push(msg);
    overallStatus = "failed";
  }

  if (errors.length > 0 && totalSucceeded === 0) {
    overallStatus = "failed";
  }

  // Log to CronJobLog
  try {
    const { logCronExecution } = await import("@/lib/cron-logger");
    await logCronExecution("followup-executor", overallStatus, {
      durationMs: Date.now() - startTime,
      itemsProcessed: totalProcessed,
      resultSummary: {
        processed: totalProcessed,
        succeeded: totalSucceeded,
        failed: totalFailed,
        errors: errors.length,
      },
    });
  } catch (err) {
    console.warn("[followup-executor] Log failed:", err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json({
    success: overallStatus === "completed",
    durationMs: Date.now() - startTime,
    processed: totalProcessed,
    succeeded: totalSucceeded,
    failed: totalFailed,
    errors: errors.length,
  });
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
