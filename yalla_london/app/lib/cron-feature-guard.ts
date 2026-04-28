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
 * Alias resolution for cron job names.
 * Maps short/alternate names (e.g. from vercel.json path segments) to canonical names.
 * Canonical names are the keys used in CRON_FLAG_MAP below.
 */
const CRON_NAME_ALIASES: Record<string, string> = {
  // Affiliate crons: vercel.json paths use short names, code uses prefixed names
  "sync-advertisers": "affiliate-sync-advertisers",
  "sync-commissions": "affiliate-sync-commissions",
  "discover-deals": "affiliate-discover-deals",
  "refresh-links": "affiliate-refresh-links",
  // SEO orchestrator: query-param variants resolve to same flag
  "seo-orchestrator-daily": "seo-orchestrator",
  "seo-orchestrator-weekly": "seo-orchestrator",
  "seo-orchestrator?mode=daily": "seo-orchestrator",
  "seo-orchestrator?mode=weekly": "seo-orchestrator",
};

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
  sweeper: "CRON_SWEEPER",
  "diagnostic-sweep": "CRON_DIAGNOSTIC_SWEEP",
  "audit-roundup": "CRON_AUDIT_ROUNDUP",
  "content-cleanup-daily": "CRON_CONTENT_CLEANUP_DAILY",
  "daily-briefing": "CRON_DAILY_BRIEFING",
  "pipeline-health": "CRON_PIPELINE_HEALTH",
  "scheduled-publish": "CRON_SCHEDULED_PUBLISH",
  "reserve-publisher": "CRON_RESERVE_PUBLISHER",
  "trends-monitor": "CRON_TRENDS_MONITOR",
  analytics: "CRON_ANALYTICS",
  "gsc-sync": "CRON_GSC_SYNC",
  "affiliate-injection": "CRON_AFFILIATE_INJECTION",
  "google-indexing": "CRON_GOOGLE_INDEXING",
  "verify-indexing": "CRON_VERIFY_INDEXING",
  "london-news": "CRON_LONDON_NEWS",
  "fact-verification": "CRON_FACT_VERIFICATION",
  "site-health-check": "CRON_SITE_HEALTH_CHECK",
  social: "CRON_SOCIAL",
  "subscriber-emails": "CRON_SUBSCRIBER_EMAILS",
  "schedule-executor": "CRON_SCHEDULE_EXECUTOR",
  "affiliate-sync-advertisers": "CRON_AFFILIATE_SYNC_ADVERTISERS",
  "affiliate-sync-commissions": "CRON_AFFILIATE_SYNC_COMMISSIONS",
  "affiliate-discover-deals": "CRON_AFFILIATE_DISCOVER_DEALS",
  "affiliate-refresh-links": "CRON_AFFILIATE_REFRESH_LINKS",
  // Direct directory names (vercel.json uses these paths under /api/affiliate/cron/)
  "sync-advertisers": "CRON_AFFILIATE_SYNC_ADVERTISERS",
  "sync-commissions": "CRON_AFFILIATE_SYNC_COMMISSIONS",
  "discover-deals": "CRON_AFFILIATE_DISCOVER_DEALS",
  "refresh-links": "CRON_AFFILIATE_REFRESH_LINKS",
  "perplexity-scheduler": "CRON_PERPLEXITY_SCHEDULER",
  "perplexity-executor": "CRON_PERPLEXITY_EXECUTOR",
  "ceo-intelligence": "CRON_CEO_INTELLIGENCE",
  "campaign-executor": "CRON_CAMPAIGN_EXECUTOR",
  "daily-seo-audit": "CRON_DAILY_SEO_AUDIT",
  "data-refresh": "CRON_DATA_REFRESH",
  "discovery-monitor": "CRON_DISCOVERY_MONITOR",
  "events-sync": "CRON_EVENTS_SYNC",
  "image-pipeline": "CRON_IMAGE_PIPELINE",
  "process-indexing-queue": "CRON_PROCESS_INDEXING_QUEUE",
  "agent-maintenance": "CRON_AGENT_MAINTENANCE",
  "retention-executor": "CRON_RETENTION_EXECUTOR",
  "followup-executor": "CRON_FOLLOWUP_EXECUTOR",
};

/**
 * Check if a cron job is enabled.
 *
 * Checks in order (per-site aware):
 *   1. Site-specific FeatureFlag (name + siteId) → if exists, use it
 *   2. Global FeatureFlag (name + null siteId) → if exists, use it
 *   3. Environment variable (e.g. CRON_CONTENT_BUILDER=false)
 *   4. Default: true (enabled)
 *
 * Returns null if enabled (proceed), or a NextResponse if disabled (return early).
 *
 * Usage inside forEachSite loops:
 *   for (const siteId of activeSiteIds) {
 *     const disabled = await checkCronEnabled("content-builder", siteId);
 *     if (disabled) { log.skipSite(siteId); continue; }
 *     // ... process site
 *   }
 *
 * Usage for global check (backwards compatible):
 *   const disabled = await checkCronEnabled("content-builder");
 *   if (disabled) return { skipped: true };
 */
export async function checkCronEnabled(jobName: string, siteId?: string): Promise<NextResponse | null> {
  // Resolve aliases first (e.g. "discover-deals" → "affiliate-discover-deals")
  const canonicalName = CRON_NAME_ALIASES[jobName] || jobName;
  const flagKey = CRON_FLAG_MAP[canonicalName] || `CRON_${canonicalName.toUpperCase().replace(/-/g, "_")}`;

  const siteLabel = siteId ? ` [site:${siteId}]` : "";

  try {
    const { getFeatureFlagValue } = await import("@/lib/feature-flags");
    const dbValue = await getFeatureFlagValue(flagKey, siteId);

    if (dbValue === false) {
      console.log(`[${jobName}]${siteLabel} Disabled via feature flag (DB): ${flagKey}=false`);
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `${jobName} disabled via feature flag ${flagKey}${siteLabel}`,
        siteId: siteId || null,
        timestamp: new Date().toISOString(),
      });
    }

    if (dbValue === null) {
      // Not in DB — check env var (env vars are always global, no per-site override)
      const envVal = process.env[flagKey];
      if (envVal === "false" || envVal === "0") {
        console.log(`[${jobName}]${siteLabel} Disabled via env var: ${flagKey}=${envVal}`);
        return NextResponse.json({
          success: true,
          skipped: true,
          message: `${jobName} disabled via env var ${flagKey}`,
          siteId: siteId || null,
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    // If feature flag check fails, allow cron to run (fail-open for crons)
    console.warn(`[${jobName}]${siteLabel} Feature flag check failed, allowing execution:`, (err as Error).message);
  }

  return null; // enabled — proceed
}

/**
 * Get all cron flag keys (for admin dashboard display).
 */
export function getAllCronFlagKeys(): Record<string, string> {
  return { ...CRON_FLAG_MAP };
}

/**
 * Resolve a cron name alias to its canonical name.
 * Returns the input unchanged if no alias exists.
 */
export function resolveCronAlias(jobName: string): string {
  return CRON_NAME_ALIASES[jobName] || jobName;
}
