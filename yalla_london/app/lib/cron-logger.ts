/**
 * CronJobLog utility — wraps cron route handlers with automatic logging.
 *
 * Usage in a cron route:
 *   import { withCronLog } from "@/lib/cron-logger";
 *   export const GET = withCronLog("seo-agent", async (log) => {
 *     // ... your cron logic ...
 *     log.trackItem(true);  // success
 *     log.trackItem(false); // failure
 *     log.addSite("yalla-london");
 *     return { myResult: "data" };
 *   });
 */

import { NextRequest, NextResponse } from "next/server";
import { onCronFailure } from "@/lib/ops/failure-hooks";

interface CronLogHandle {
  /** Increment success/failure counters */
  trackItem: (success: boolean) => void;
  /** Record a site that was processed */
  addSite: (siteId: string) => void;
  /** Record a site that was skipped */
  skipSite: (siteId: string) => void;
  /** Check if deadline is approaching */
  isExpired: () => boolean;
  /** Elapsed time in ms */
  elapsedMs: () => number;
}

interface CronLogOptions {
  /** Cron job type category (default: "scheduled") */
  jobType?: string;
  /** Timeout margin in ms (default: 5000) */
  marginMs?: number;
  /** Max execution time in ms (default: 60000) */
  maxDurationMs?: number;
}

/**
 * Wraps a cron handler with CronJobLog persistence.
 * Handles: auth check, log creation, timing, error capture, log completion.
 */
/**
 * Lightweight logging for existing cron routes that don't use withCronLog.
 * Call at the end of a cron handler to record the run without restructuring.
 */
export async function logCronExecution(
  jobName: string,
  status: "completed" | "failed" | "timed_out",
  details: {
    durationMs: number;
    itemsProcessed?: number;
    itemsSucceeded?: number;
    itemsFailed?: number;
    sitesProcessed?: string[];
    errorMessage?: string;
    resultSummary?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.cronJobLog.create({
      data: {
        job_name: jobName,
        job_type: "scheduled",
        status,
        started_at: new Date(Date.now() - details.durationMs),
        completed_at: new Date(),
        duration_ms: details.durationMs,
        items_processed: details.itemsProcessed ?? 0,
        items_succeeded: details.itemsSucceeded ?? 0,
        items_failed: details.itemsFailed ?? 0,
        sites_processed: details.sitesProcessed ?? [],
        error_message: details.errorMessage ?? null,
        result_summary: details.resultSummary as Record<string, unknown> | undefined,
        timed_out: status === "timed_out",
      },
    });
  } catch {
    // best-effort — never break the cron route
  }
}

export function withCronLog(
  jobName: string,
  handler: (log: CronLogHandle, request: NextRequest) => Promise<Record<string, unknown>>,
  options: CronLogOptions = {},
) {
  const {
    jobType = "scheduled",
    marginMs = 5_000,
    maxDurationMs = 60_000,
  } = options;

  return async function cronHandler(request: NextRequest) {
    // 1. Auth check
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!cronSecret && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Server misconfiguration: CRON_SECRET not set" },
        { status: 503 },
      );
    }

    const startTime = Date.now();
    const deadline = startTime + maxDurationMs - marginMs;
    let itemsProcessed = 0;
    let itemsSucceeded = 0;
    let itemsFailed = 0;
    const sitesProcessed: string[] = [];
    const sitesSkipped: string[] = [];
    let timedOut = false;

    const logHandle: CronLogHandle = {
      trackItem: (success: boolean) => {
        itemsProcessed++;
        if (success) itemsSucceeded++;
        else itemsFailed++;
      },
      addSite: (siteId: string) => {
        if (!sitesProcessed.includes(siteId)) sitesProcessed.push(siteId);
      },
      skipSite: (siteId: string) => {
        if (!sitesSkipped.includes(siteId)) sitesSkipped.push(siteId);
      },
      isExpired: () => {
        if (Date.now() >= deadline) {
          timedOut = true;
          return true;
        }
        return false;
      },
      elapsedMs: () => Date.now() - startTime,
    };

    // 2. Create log entry
    let logId: string | null = null;
    try {
      const { prisma } = await import("@/lib/db");
      const logEntry = await prisma.cronJobLog.create({
        data: {
          job_name: jobName,
          job_type: jobType,
          status: "running",
          started_at: new Date(startTime),
        },
      });
      logId = logEntry.id;
    } catch (dbErr) {
      // DB unavailable — run anyway without logging
      console.warn(`[cron-logger] Failed to create log for ${jobName}:`, dbErr);
    }

    // 3. Run handler
    let result: Record<string, unknown> = {};
    let errorMessage: string | null = null;
    let errorStack: string | null = null;
    let status = "completed";

    try {
      result = await handler(logHandle, request);
    } catch (error) {
      status = "failed";
      errorMessage = error instanceof Error ? error.message : String(error);
      errorStack = error instanceof Error ? error.stack ?? null : null;
      console.error(`[cron-logger] ${jobName} failed:`, error);

      // Fire failure hook for automatic recovery
      onCronFailure({ jobName, error }).catch(() => {});
    }

    if (timedOut) status = "timed_out";

    const durationMs = Date.now() - startTime;

    // 4. Update log entry
    if (logId) {
      try {
        const { prisma } = await import("@/lib/db");
        await prisma.cronJobLog.update({
          where: { id: logId },
          data: {
            status,
            completed_at: new Date(),
            duration_ms: durationMs,
            result_summary: result as Record<string, unknown>,
            items_processed: itemsProcessed,
            items_succeeded: itemsSucceeded,
            items_failed: itemsFailed,
            error_message: errorMessage,
            error_stack: errorStack,
            sites_processed: sitesProcessed,
            sites_skipped: sitesSkipped,
            timed_out: timedOut,
          },
        });
      } catch (dbErr) {
        console.warn(`[cron-logger] Failed to update log for ${jobName}:`, dbErr);
      }
    }

    // 5. Return response
    if (status === "failed") {
      return NextResponse.json(
        {
          success: false,
          job: jobName,
          error: errorMessage,
          durationMs,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      job: jobName,
      status,
      durationMs,
      items: { processed: itemsProcessed, succeeded: itemsSucceeded, failed: itemsFailed },
      sites: { processed: sitesProcessed, skipped: sitesSkipped },
      timedOut,
      ...result,
    });
  };
}
