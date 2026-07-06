/**
 * Centralized Action Logger — Records every manual dashboard action to AuditLog
 *
 * Call this from any API route that handles a manual user action (button tap).
 * Captures: what was done, what happened, what broke, and what to fix.
 *
 * All manual actions logged here show up in /api/admin/action-logs?category=manual
 * and in the JSON export at /api/admin/action-logs?export=json
 */

import { NextRequest } from "next/server";

export interface ActionLogEntry {
  /** Which button / action was triggered */
  action: string;
  /** Which resource type: "blogpost" | "draft" | "cron" | "topic" | "site" | "indexing" | "config" */
  resource: string;
  /** Specific record ID if applicable */
  resourceId?: string;
  /** Site this action applies to */
  siteId?: string;
  /** Did it succeed? */
  success: boolean;
  /** Plain-language outcome for Khaled */
  summary: string;
  /** Error message if failed */
  error?: string;
  /** Suggested fix if failed */
  fix?: string;
  /** Full details object for JSON export */
  details?: Record<string, unknown>;
  /** Duration in ms */
  durationMs?: number;
}

/**
 * Log a manual dashboard action to the AuditLog table.
 * Fire-and-forget — never throws, never blocks the response.
 */
export async function logManualAction(
  request: NextRequest | null,
  entry: ActionLogEntry
): Promise<void> {
  try {
    const { prisma } = await import("@/lib/db");

    const ip = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request?.headers.get("x-real-ip")
      || null;
    const ua = request?.headers.get("user-agent") || null;

    await prisma.auditLog.create({
      data: {
        action: `manual:${entry.action}`,
        resource: entry.resource,
        resourceId: entry.resourceId || null,
        details: {
          siteId: entry.siteId || null,
          summary: entry.summary,
          error: entry.error || null,
          fix: entry.fix || null,
          durationMs: entry.durationMs || null,
          ...(entry.details || {}),
        },
        ipAddress: ip,
        userAgent: ua,
        success: entry.success,
        errorMessage: entry.error || null,
      },
    });
  } catch (err) {
    // Never throw — logging failure must not break the actual action
    console.warn("[action-logger] Failed to log action:", err instanceof Error ? err.message : err);
  }
}

/**
 * Wrapper that times an async action and logs the result.
 * Returns the action's result (or throws if the action throws).
 */
export async function withActionLog<T>(
  request: NextRequest | null,
  meta: Pick<ActionLogEntry, "action" | "resource" | "resourceId" | "siteId">,
  fn: () => Promise<{ result: T; summary: string; details?: Record<string, unknown> }>
): Promise<T> {
  const start = Date.now();
  try {
    const { result, summary, details } = await fn();
    const durationMs = Date.now() - start;

    logManualAction(request, {
      ...meta,
      success: true,
      summary,
      durationMs,
      details,
    }).catch(() => {}); // fire-and-forget

    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    const errorMsg = err instanceof Error ? err.message : String(err);
    const fix = interpretActionError(meta.action, errorMsg);

    logManualAction(request, {
      ...meta,
      success: false,
      summary: `${meta.action} failed`,
      error: errorMsg,
      fix,
      durationMs,
    }).catch(() => {}); // fire-and-forget

    throw err; // Re-throw so the caller can handle it
  }
}

function interpretActionError(action: string, error: string): string {
  const e = error.toLowerCase();

  if (e.includes("timeout") || e.includes("aborted"))
    return "The operation ran out of time. Try again — it may succeed with fewer items.";
  if (e.includes("prisma") || e.includes("database") || e.includes("relation"))
    return "Database error. Go to Settings → Database and run 'Scan Schema' then 'Fix All'.";
  if (e.includes("unauthorized") || e.includes("401") || e.includes("forbidden"))
    return "Authentication failed. Try refreshing the page and logging in again.";
  if (e.includes("rate limit") || e.includes("429"))
    return "Rate limited by external API. Wait a few minutes and try again.";
  if (e.includes("not found") || e.includes("404"))
    return "The target item was not found. It may have been deleted or already processed.";
  if (e.includes("ai") || e.includes("provider") || e.includes("completion"))
    return "AI provider error. Check AI Config tab — the provider may be down.";
  if (e.includes("gate") || e.includes("quality") || e.includes("score"))
    return "Quality gate blocked this action. Check the article's SEO score and fix any issues first.";

  return `Error during ${action}. Check JSON export for full details.`;
}
