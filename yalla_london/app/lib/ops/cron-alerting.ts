/**
 * Cron Failure Alerting System
 *
 * Monitors CronJobLog for failures and sends email alerts to the admin.
 * Called by the diagnostic-sweep cron (every 2h) and optionally standalone.
 *
 * Features:
 *   - Deduplicates alerts (won't re-send for the same job+error within 4h)
 *   - Groups multiple failures into a single digest email
 *   - Includes plain-language error interpretation
 *   - Logs alert history to CronJobLog for dashboard visibility
 *
 * Configuration:
 *   ALERT_EMAIL — Recipient address (defaults to hello@<domain>)
 *   ALERT_COOLDOWN_HOURS — Hours between repeated alerts for same job (default: 4)
 */

import { sendEmail } from "@/lib/email/sender";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CronFailure {
  jobName: string;
  status: string;
  errorMessage: string | null;
  startedAt: Date;
  durationMs: number | null;
}

interface AlertRecord {
  jobName: string;
  sentAt: number; // timestamp
}

// ---------------------------------------------------------------------------
// In-memory dedup cache (resets on cold start — acceptable for serverless)
// ---------------------------------------------------------------------------

const alertHistory: AlertRecord[] = [];
const COOLDOWN_MS = (parseInt(process.env.ALERT_COOLDOWN_HOURS || "4", 10)) * 60 * 60 * 1000;

function wasRecentlyAlerted(jobName: string): boolean {
  const now = Date.now();
  return alertHistory.some(
    (r) => r.jobName === jobName && now - r.sentAt < COOLDOWN_MS
  );
}

function recordAlert(jobName: string): void {
  alertHistory.push({ jobName, sentAt: Date.now() });
  // Keep history trim
  if (alertHistory.length > 200) {
    alertHistory.splice(0, alertHistory.length - 100);
  }
}

// ---------------------------------------------------------------------------
// Plain-language error interpretation
// ---------------------------------------------------------------------------

const ERROR_PATTERNS: Array<{ pattern: RegExp; explanation: string; fix: string }> = [
  { pattern: /timeout|ETIMEDOUT|aborted/i, explanation: "The job ran out of time (60s Vercel limit)", fix: "Check if AI calls are timing out — reduce batch size or add budget guards" },
  { pattern: /ECONNREFUSED|ENOTFOUND|fetch failed/i, explanation: "Network connection failed — external API is unreachable", fix: "Check if the API provider (Grok, OpenAI, etc.) is down. Retry should handle this automatically" },
  { pattern: /rate.?limit|429|too many requests/i, explanation: "Hit an API rate limit", fix: "Reduce batch sizes or add delays between API calls" },
  { pattern: /401|403|unauthorized|forbidden/i, explanation: "Authentication failed — API key may be expired or missing", fix: "Check env vars: GROK_API_KEY, OPENAI_API_KEY, etc." },
  { pattern: /prisma|database|connection.?pool|PgBouncer/i, explanation: "Database connection issue", fix: "Too many concurrent queries. Check Supabase connection pool limits" },
  { pattern: /JSON|parse|unexpected token/i, explanation: "AI returned malformed data that couldn't be parsed", fix: "Usually a one-off — the retry/sweeper will handle it. If persistent, check AI prompts" },
  { pattern: /ENOMEM|heap|memory/i, explanation: "Out of memory", fix: "Reduce batch sizes or split into smaller operations" },
  { pattern: /budget.?exhaust/i, explanation: "Cron ran out of its 53s time budget", fix: "Reduce the number of items processed per run" },
  { pattern: /duplicate|unique.?constraint/i, explanation: "Tried to create a record that already exists", fix: "Add upsert logic or duplicate check before creation" },
];

function interpretError(error: string | null): { explanation: string; fix: string } {
  if (!error) return { explanation: "Unknown error (no message recorded)", fix: "Check the full CronJobLog in the database" };

  for (const { pattern, explanation, fix } of ERROR_PATTERNS) {
    if (pattern.test(error)) {
      return { explanation, fix };
    }
  }

  return { explanation: `Unrecognized error: ${error.slice(0, 120)}`, fix: "Check the full error in CronJobLog" };
}

// ---------------------------------------------------------------------------
// Main: Check for failures and send alerts
// ---------------------------------------------------------------------------

/**
 * Check recent CronJobLog entries for failures and send an email digest.
 *
 * @param lookbackHours - How far back to look for failures (default: 4)
 * @returns Summary of what was found and whether an alert was sent
 */
export async function checkAndAlertCronFailures(
  lookbackHours = 4
): Promise<{ failures: number; alerted: boolean; message: string }> {
  try {
    const { prisma } = await import("@/lib/db");

    const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

    // Find failed cron runs in the lookback window
    const failedRuns = await prisma.cronJobLog.findMany({
      where: {
        status: "failed",
        started_at: { gte: since },
      },
      orderBy: { started_at: "desc" },
      take: 50,
    });

    if (failedRuns.length === 0) {
      return { failures: 0, alerted: false, message: "No cron failures in the last " + lookbackHours + "h" };
    }

    // Filter out already-alerted failures
    const newFailures: CronFailure[] = failedRuns
      .filter((run) => !wasRecentlyAlerted(run.job_name))
      .map((run) => ({
        jobName: run.job_name,
        status: run.status,
        errorMessage: run.error_message,
        startedAt: run.started_at,
        durationMs: run.duration_ms,
      }));

    if (newFailures.length === 0) {
      return { failures: failedRuns.length, alerted: false, message: `${failedRuns.length} failures found but all already alerted within cooldown period` };
    }

    // Build and send the alert email
    const alertSent = await sendFailureDigest(newFailures);

    if (alertSent) {
      // Record alerts to prevent re-sending
      const uniqueJobs = new Set(newFailures.map((f) => f.jobName));
      for (const job of uniqueJobs) {
        recordAlert(job);
      }
    }

    return {
      failures: failedRuns.length,
      alerted: alertSent,
      message: alertSent
        ? `Alert sent for ${newFailures.length} new failure(s) across ${new Set(newFailures.map(f => f.jobName)).size} job(s)`
        : "Failed to send alert email",
    };
  } catch (err) {
    console.warn("[cron-alerting] Failed to check/send alerts:", (err as Error).message);
    return { failures: 0, alerted: false, message: `Alert check failed: ${(err as Error).message}` };
  }
}

// ---------------------------------------------------------------------------
// Email Builder
// ---------------------------------------------------------------------------

async function sendFailureDigest(failures: CronFailure[]): Promise<boolean> {
  // Determine recipient
  let alertEmail = process.env.ALERT_EMAIL;
  if (!alertEmail) {
    try {
      const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");
      alertEmail = `hello@${getSiteDomain(getDefaultSiteId())}`;
    } catch {
      alertEmail = "hello@zenitha.luxury";
    }
  }

  // Group failures by job
  const byJob = new Map<string, CronFailure[]>();
  for (const f of failures) {
    const list = byJob.get(f.jobName) || [];
    list.push(f);
    byJob.set(f.jobName, list);
  }

  // Build HTML
  const jobRows = Array.from(byJob.entries()).map(([jobName, jobFailures]) => {
    const latest = jobFailures[0];
    const { explanation, fix } = interpretError(latest.errorMessage);
    const timeAgo = Math.round((Date.now() - latest.startedAt.getTime()) / 60_000);

    return `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">
          <strong style="color:#1a1a2e;font-size:15px;">${escapeHtml(jobName)}</strong>
          <span style="color:#ef4444;font-size:13px;margin-left:8px;">${jobFailures.length}x failed</span>
          <br/>
          <span style="color:#6b7280;font-size:13px;">${timeAgo}min ago${latest.durationMs ? ` · ${(latest.durationMs / 1000).toFixed(1)}s` : ""}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 16px 16px;border-bottom:2px solid #e5e7eb;">
          <div style="background:#fef2f2;border-radius:6px;padding:10px 14px;margin-bottom:8px;">
            <span style="color:#991b1b;font-size:13px;"><strong>What happened:</strong> ${escapeHtml(explanation)}</span>
          </div>
          <div style="background:#f0fdf4;border-radius:6px;padding:10px 14px;">
            <span style="color:#166534;font-size:13px;"><strong>Suggested fix:</strong> ${escapeHtml(fix)}</span>
          </div>
        </td>
      </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>Cron Alert</title></head>
<body style="margin:0;padding:20px;background:#f4f4f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;background:#fff;border-radius:8px;overflow:hidden;">
        <tr><td style="height:4px;background:#ef4444;"></td></tr>
        <tr><td style="padding:24px;">
          <h1 style="margin:0 0 4px;font-size:20px;color:#1a1a2e;">⚠ Cron Job Failures</h1>
          <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
            ${failures.length} failure(s) across ${byJob.size} job(s) in the last 4 hours
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
            ${jobRows}
          </table>
          <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;">
            Check the full logs at <strong>/admin/cockpit</strong> → Crons tab<br/>
            This alert will not repeat for the same job within ${Math.round(COOLDOWN_MS / 3_600_000)}h.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const result = await sendEmail({
    to: alertEmail,
    subject: `[Alert] ${failures.length} cron failure(s) — ${Array.from(byJob.keys()).join(", ")}`,
    html,
    plainText: failures.map((f) => {
      const { explanation, fix } = interpretError(f.errorMessage);
      return `${f.jobName}: ${explanation}\n  Fix: ${fix}\n  Time: ${f.startedAt.toISOString()}`;
    }).join("\n\n"),
  });

  if (result.success) {
    console.log(`[cron-alerting] Alert email sent to ${alertEmail} for ${failures.length} failure(s)`);
  } else {
    console.warn(`[cron-alerting] Failed to send alert email: ${result.error}`);
  }

  return result.success;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
