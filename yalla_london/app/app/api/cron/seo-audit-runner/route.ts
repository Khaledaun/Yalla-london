/**
 * SEO Audit Runner Cron
 *
 * Multi-step cron that advances audit runs through stages:
 *   pending → inventory → crawling (batches) → validating → completed
 *
 * Scheduled every 15 minutes. Each invocation processes one step per site.
 * When no active run exists and it's the nightly window (2:00-2:30 UTC),
 * auto-creates a new run for each active site.
 *
 * Also supports manual triggers via POST with { siteId, mode } body.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { withCronLog } from "@/lib/cron-logger";
import { getActiveSiteIds } from "@/config/sites";

// Nightly window: 2:00-2:30 UTC
const NIGHTLY_HOUR = 2;
const NIGHTLY_MAX_MINUTE = 30;

const handler = withCronLog("seo-audit-runner", async (log) => {
  const { advanceAuditStep } = await import("@/lib/audit-system/step-runner");
  const {
    getActiveAuditRun,
    createAuditRun,
  } = await import("@/lib/audit-system/db-adapter");

  const startMs = Date.now();
  const siteIds = getActiveSiteIds();
  const results: Array<{ siteId: string; action: string; message: string }> =
    [];

  // Process each site sequentially (avoid DB pool exhaustion)
  for (const siteId of siteIds) {
    if (log.isExpired()) {
      log.skipSite(siteId);
      continue;
    }

    try {
      // Check for active run
      const activeRun = await getActiveAuditRun(siteId);

      if (activeRun) {
        // Advance the existing run
        const stepResult = await advanceAuditStep(siteId, startMs);

        results.push({
          siteId,
          action: stepResult.advanced ? "advanced" : "skipped",
          message: stepResult.message,
        });

        log.addSite(siteId);
        log.trackItem(stepResult.advanced);
      } else if (isNightlyWindow()) {
        // No active run + nightly window → create new run
        const runId = await createAuditRun(siteId, "full", "scheduled");

        results.push({
          siteId,
          action: "created",
          message: `New nightly audit created: ${runId}`,
        });

        log.addSite(siteId);
        log.trackItem(true);
      } else {
        results.push({
          siteId,
          action: "idle",
          message: "No active run, not in nightly window",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[seo-audit-runner] Site ${siteId} failed:`, msg);
      results.push({
        siteId,
        action: "error",
        message: msg.slice(0, 200),
      });
      log.addSite(siteId);
      log.trackItem(false);
    }
  }

  return {
    sites: results,
    nightlyWindow: isNightlyWindow(),
  };
});

export const GET = handler;
export const POST = handler;

function isNightlyWindow(): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  return utcHour === NIGHTLY_HOUR && utcMinute <= NIGHTLY_MAX_MINUTE;
}
