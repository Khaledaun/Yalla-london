export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

/**
 * Automation Status API
 *
 * Returns real status for each scheduled cron job by querying CronJobLog.
 * Used by the Automation tab in the Workflow dashboard.
 */

// Known cron jobs mapped to their vercel.json schedule + display info
const CRON_JOBS = [
  {
    jobName: "analytics",
    label: "Analytics Sync",
    schedule: "0 3 * * *",
    scheduleLabel: "Daily at 3:00 AM UTC",
    featureFlag: null,
  },
  {
    jobName: "weekly-topics",
    label: "Weekly Topic Research",
    schedule: "0 4 * * 1",
    scheduleLabel: "Mondays at 4:00 AM UTC",
    featureFlag: "FEATURE_CONTENT_PIPELINE",
  },
  {
    jobName: "daily-content-generate",
    label: "Daily Content Generation",
    schedule: "0 5 * * *",
    scheduleLabel: "Daily at 5:00 AM UTC",
    featureFlag: "FEATURE_CONTENT_PIPELINE",
  },
  {
    jobName: "trends-monitor",
    label: "Trends Monitor",
    schedule: "0 6 * * *",
    scheduleLabel: "Daily at 6:00 AM UTC",
    featureFlag: null,
  },
  {
    jobName: "seo-agent",
    label: "SEO Agent",
    schedule: "0 7 * * *",
    scheduleLabel: "Daily at 7, 13, 20 UTC",
    featureFlag: "FEATURE_AI_SEO_AUDIT",
  },
  {
    jobName: "content-builder",
    label: "Content Builder",
    schedule: "*/15 * * * *",
    scheduleLabel: "Every 15 minutes",
    featureFlag: "FEATURE_CONTENT_PIPELINE",
  },
  {
    jobName: "content-selector",
    label: "Content Selector",
    schedule: "30 8 * * *",
    scheduleLabel: "Daily at 8:30 AM UTC",
    featureFlag: "FEATURE_CONTENT_PIPELINE",
  },
  {
    jobName: "affiliate-injection",
    label: "Affiliate Injection",
    schedule: "0 9 * * *",
    scheduleLabel: "Daily at 9:00 AM UTC",
    featureFlag: null,
  },
  {
    jobName: "scheduled-publish",
    label: "Scheduled Publish",
    schedule: "0 9 * * *",
    scheduleLabel: "Daily at 9, 16 UTC",
    featureFlag: "FEATURE_AUTO_PUBLISHING",
  },
  {
    jobName: "daily-publish",
    label: "Daily Publisher",
    schedule: "0 9 * * *",
    scheduleLabel: "Daily at 9:00 AM UTC",
    featureFlag: "FEATURE_AUTO_PUBLISHING",
  },
  {
    jobName: "site-health-check",
    label: "Site Health Check",
    schedule: "0 22 * * *",
    scheduleLabel: "Daily at 10:00 PM UTC",
    featureFlag: null,
  },
  {
    jobName: "seo-orchestrator",
    label: "SEO Orchestrator",
    schedule: "0 6 * * *",
    scheduleLabel: "Daily + weekly Sunday",
    featureFlag: "FEATURE_SEO",
  },
] as const;

export const GET = withAdminAuth(async (_request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");

    // Time windows for freshness checks
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get latest log per job in one query (last 7 days)
    const recentLogs = await prisma.cronJobLog.findMany({
      where: { started_at: { gte: sevenDaysAgo } },
      orderBy: { started_at: "desc" },
      select: {
        job_name: true,
        status: true,
        started_at: true,
        completed_at: true,
        duration_ms: true,
        items_processed: true,
        items_succeeded: true,
        items_failed: true,
        error_message: true,
        timed_out: true,
      },
    });

    // Group by job_name — take latest entry per job
    const latestByJob = new Map<string, (typeof recentLogs)[0]>();
    const last24hCountByJob = new Map<string, { total: number; failed: number }>();

    for (const log of recentLogs) {
      if (!latestByJob.has(log.job_name)) {
        latestByJob.set(log.job_name, log);
      }
      // Count runs in last 24h
      if (log.started_at >= twentyFourHoursAgo) {
        const counts = last24hCountByJob.get(log.job_name) || { total: 0, failed: 0 };
        counts.total++;
        if (log.status === "failed" || log.status === "timeout") counts.failed++;
        last24hCountByJob.set(log.job_name, counts);
      }
    }

    // Check feature flags from DB
    let dbFlags = new Map<string, boolean>();
    try {
      const flags = await prisma.featureFlag.findMany({
        select: { name: true, enabled: true },
      });
      dbFlags = new Map(flags.map((f) => [f.name, f.enabled]));
    } catch {
      // Feature flags table might not have data yet — not an error
    }

    // Build status for each cron job
    const jobs = CRON_JOBS.map((job) => {
      const latest = latestByJob.get(job.jobName);
      const counts = last24hCountByJob.get(job.jobName) || { total: 0, failed: 0 };

      // Determine if feature flag disables this job
      let flagStatus: "enabled" | "disabled" | "no_flag" = "no_flag";
      if (job.featureFlag) {
        if (dbFlags.has(job.featureFlag)) {
          flagStatus = dbFlags.get(job.featureFlag) ? "enabled" : "disabled";
        } else {
          // Check env var
          const envVal = process.env[job.featureFlag];
          if (envVal === "false" || envVal === "0") {
            flagStatus = "disabled";
          } else {
            flagStatus = "enabled";
          }
        }
      }

      // Determine overall status
      let status: "active" | "degraded" | "inactive" | "disabled" | "never_run";
      if (flagStatus === "disabled") {
        status = "disabled";
      } else if (!latest) {
        status = "never_run";
      } else if (latest.status === "completed") {
        status = "active";
      } else if (latest.status === "failed" || latest.status === "timeout") {
        status = "degraded";
      } else if (latest.status === "running") {
        status = "active";
      } else {
        status = "active"; // partial, etc.
      }

      return {
        jobName: job.jobName,
        label: job.label,
        schedule: job.scheduleLabel,
        featureFlag: job.featureFlag,
        flagStatus,
        status,
        lastRun: latest
          ? {
              startedAt: latest.started_at.toISOString(),
              completedAt: latest.completed_at?.toISOString() || null,
              status: latest.status,
              durationMs: latest.duration_ms,
              itemsProcessed: latest.items_processed,
              itemsSucceeded: latest.items_succeeded,
              itemsFailed: latest.items_failed,
              error: latest.error_message,
              timedOut: latest.timed_out,
            }
          : null,
        last24h: {
          runs: counts.total,
          failures: counts.failed,
        },
      };
    });

    // Summary stats
    const active = jobs.filter((j) => j.status === "active").length;
    const degraded = jobs.filter((j) => j.status === "degraded").length;
    const disabled = jobs.filter((j) => j.status === "disabled").length;
    const neverRun = jobs.filter((j) => j.status === "never_run").length;

    return NextResponse.json({
      jobs,
      summary: {
        total: jobs.length,
        active,
        degraded,
        disabled,
        neverRun,
        inactive: jobs.length - active - degraded - disabled - neverRun,
      },
      lastChecked: now.toISOString(),
    });
  } catch (error) {
    console.error("Automation status API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch automation status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
