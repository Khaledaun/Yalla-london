/**
 * Cron Feature Flag Guard
 *
 * Provides a standardized way to check if a cron job is enabled via feature flags.
 * Each cron maps to a flag name (DB-first via FeatureFlag table, env var fallback).
 *
 * Convention:
 *   Flag name = "CRON_<UPPER_SNAKE_CASE_JOB_NAME>"
 *   e.g. content-builder → CRON_CONTENT_BUILDER
 *
 * Default: ENABLED (flag must explicitly be set to false/0 to disable).
 * This is the safe default — crons run unless deliberately turned off.
 */

import { NextResponse } from "next/server";

/**
 * Map of cron job names to their feature flag keys.
 * Add new cron jobs here as they're created.
 */
const CRON_FLAG_MAP: Record<string, string> = {
  "content-builder": "CRON_CONTENT_BUILDER",
  "content-builder-create": "CRON_CONTENT_BUILDER_CREATE",
  "content-selector": "CRON_CONTENT_SELECTOR",
  "content-auto-fix": "CRON_CONTENT_AUTO_FIX",
  "content-auto-fix-lite": "CRON_CONTENT_AUTO_FIX_LITE",
  "content-freshness": "CRON_CONTENT_FRESHNESS",
  "weekly-topics": "CRON_WEEKLY_TOPICS",
  "daily-content-generate": "CRON_DAILY_CONTENT_GENERATE",
  "seo-agent": "CRON_SEO_AGENT",
  "seo-agent-intelligence": "CRON_SEO_AGENT_INTELLIGENCE",
  "seo-orchestrator": "CRON_SEO_ORCHESTRATOR",
  "seo-deep-review": "CRON_SEO_DEEP_REVIEW",
  "seo-audit-runner": "CRON_SEO_AUDIT_RUNNER",
  "sweeper": "CRON_SWEEPER",
  "diagnostic-sweep": "CRON_DIAGNOSTIC_SWEEP",
  "scheduled-publish": "CRON_SCHEDULED_PUBLISH",
  "reserve-publisher": "CRON_RESERVE_PUBLISHER",
  "trends-monitor": "CRON_TRENDS_MONITOR",
  "analytics": "CRON_ANALYTICS",
  "gsc-sync": "CRON_GSC_SYNC",
  "affiliate-injection": "CRON_AFFILIATE_INJECTION",
  "google-indexing": "CRON_GOOGLE_INDEXING",
  "verify-indexing": "CRON_VERIFY_INDEXING",
  "london-news": "CRON_LONDON_NEWS",
  "fact-verification": "CRON_FACT_VERIFICATION",
  "site-health-check": "CRON_SITE_HEALTH_CHECK",
  "social": "CRON_SOCIAL",
  "subscriber-emails": "CRON_SUBSCRIBER_EMAILS",
  "schedule-executor": "CRON_SCHEDULE_EXECUTOR",
};

/**
 * Check if a cron job is enabled.
 *
 * Checks in order:
 *   1. FeatureFlag DB table (via isFeatureFlagEnabled)
 *   2. Environment variable (e.g. CRON_CONTENT_BUILDER=false)
 *   3. Default: true (enabled)
 *
 * Returns null if enabled (proceed), or a NextResponse if disabled (return early).
 */
export async function checkCronEnabled(
  jobName: string
): Promise<NextResponse | null> {
  const flagKey = CRON_FLAG_MAP[jobName] || `CRON_${jobName.toUpperCase().replace(/-/g, "_")}`;

  try {
    const { isFeatureFlagEnabled } = await import("@/lib/feature-flags");
    // Check DB first — if flag exists in DB and is disabled, stop
    const { getFeatureFlagValue } = await import("@/lib/feature-flags");
    const dbValue = await getFeatureFlagValue(flagKey);

    if (dbValue === false) {
      console.log(`[${jobName}] Disabled via feature flag (DB): ${flagKey}=false`);
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `${jobName} disabled via feature flag ${flagKey}`,
        timestamp: new Date().toISOString(),
      });
    }

    if (dbValue === null) {
      // Not in DB — check env var
      const envVal = process.env[flagKey];
      if (envVal === "false" || envVal === "0") {
        console.log(`[${jobName}] Disabled via env var: ${flagKey}=${envVal}`);
        return NextResponse.json({
          success: true,
          skipped: true,
          message: `${jobName} disabled via env var ${flagKey}`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    // If feature flag check fails, allow cron to run (fail-open for crons)
    console.warn(`[${jobName}] Feature flag check failed, allowing execution:`, (err as Error).message);
  }

  return null; // enabled — proceed
}

/**
 * Get all cron flag keys (for admin dashboard display).
 */
export function getAllCronFlagKeys(): Record<string, string> {
  return { ...CRON_FLAG_MAP };
}
