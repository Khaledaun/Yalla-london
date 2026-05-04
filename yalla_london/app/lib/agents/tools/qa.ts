/**
 * QA Tool Handlers — CTO Agent quality assurance tools.
 *
 * Tools: run_typecheck, run_smoke_tests, check_cron_health, check_pipeline_health
 *
 * Safety: All tools are read-only. TypeScript check and smoke tests execute
 * via child_process with strict timeouts. DB queries use Prisma read-only operations.
 */

import { execSync } from "child_process";
import { prisma } from "@/lib/db";
import type { ToolContext, ToolResult } from "../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Working directory for CLI commands */
const APP_DIR = process.cwd();

/** Maximum timeout for tsc --noEmit (60 seconds) */
const TYPECHECK_TIMEOUT_MS = 60_000;

/** Maximum timeout for smoke tests (120 seconds) */
const SMOKE_TEST_TIMEOUT_MS = 120_000;

/** Default lookback window for cron health */
const DEFAULT_HOURS_BACK = 24;

/** Threshold for "stuck" drafts (4 hours) */
const STUCK_THRESHOLD_MS = 4 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// run_typecheck — runs `npx tsc --noEmit` and parses output
// ---------------------------------------------------------------------------

interface TypecheckError {
  file: string;
  line: number;
  column: number;
  message: string;
}

interface TypecheckData {
  errorCount: number;
  errors: TypecheckError[];
  passed: boolean;
}

export async function qaRunTypecheck(
  _params: Record<string, unknown>,
  _ctx: ToolContext,
): Promise<ToolResult> {
  try {
    // tsc --noEmit exits 0 on success, non-zero on errors.
    // execSync throws on non-zero exit, so we catch to parse errors.
    try {
      execSync("npx tsc --noEmit 2>&1", {
        cwd: APP_DIR,
        timeout: TYPECHECK_TIMEOUT_MS,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      // If we get here, zero errors
      const data: TypecheckData = { errorCount: 0, errors: [], passed: true };
      return {
        success: true,
        data,
        summary: "TypeScript check passed with 0 errors.",
      };
    } catch (execErr: unknown) {
      const err = execErr as { stdout?: string; stderr?: string; status?: number; message?: string };
      const output = (err.stdout || "") + (err.stderr || "");

      // Parse TS error lines: path(line,col): error TSxxxx: message
      const errorRegex = /^(.+)\((\d+),(\d+)\):\s*error\s+TS\d+:\s*(.+)$/gm;
      const errors: TypecheckError[] = [];
      let match: RegExpExecArray | null;

      while ((match = errorRegex.exec(output)) !== null) {
        errors.push({
          file: match[1].trim(),
          line: parseInt(match[2], 10),
          column: parseInt(match[3], 10),
          message: match[4].trim(),
        });
      }

      // Also try the colon-separated format: path:line:col - error TSxxxx: message
      const altRegex = /^(.+):(\d+):(\d+)\s*-\s*error\s+TS\d+:\s*(.+)$/gm;
      while ((match = altRegex.exec(output)) !== null) {
        errors.push({
          file: match[1].trim(),
          line: parseInt(match[2], 10),
          column: parseInt(match[3], 10),
          message: match[4].trim(),
        });
      }

      const errorCount = errors.length || (err.status ? 1 : 0);
      const data: TypecheckData = {
        errorCount,
        errors,
        passed: errorCount === 0,
      };

      return {
        success: true, // Tool ran successfully even if TS found errors
        data,
        summary: `TypeScript check found ${errorCount} error${errorCount === 1 ? "" : "s"}.`,
      };
    }
  } catch (outerErr: unknown) {
    const message =
      outerErr instanceof Error ? outerErr.message : String(outerErr);
    return {
      success: false,
      error: `TypeScript check failed to execute: ${message}`,
      summary: "TypeScript check could not be run.",
    };
  }
}

// ---------------------------------------------------------------------------
// run_smoke_tests — runs `npx tsx scripts/smoke-test.ts` and parses output
// ---------------------------------------------------------------------------

interface SmokeTestDetail {
  name: string;
  status: "PASS" | "FAIL" | "WARN";
  category?: string;
}

interface SmokeTestData {
  passed: number;
  failed: number;
  warnings: number;
  total: number;
  details: SmokeTestDetail[];
}

export async function qaRunSmokeTests(
  params: Record<string, unknown>,
  _ctx: ToolContext,
): Promise<ToolResult> {
  const category = params.category as string | undefined;

  try {
    let output: string;

    try {
      output = execSync("npx tsx scripts/smoke-test.ts 2>&1", {
        cwd: APP_DIR,
        timeout: SMOKE_TEST_TIMEOUT_MS,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (execErr: unknown) {
      // Smoke tests may exit non-zero on failures — still parse the output
      const err = execErr as { stdout?: string; stderr?: string };
      output = (err.stdout || "") + (err.stderr || "");

      if (!output) {
        return {
          success: false,
          error: "Smoke tests produced no output.",
          summary: "Smoke test execution failed with no output.",
        };
      }
    }

    // Parse lines matching patterns like:
    //   ✅ PASS: Some test name
    //   ❌ FAIL: Some test name
    //   ⚠️ WARN: Some test name
    //   [Category] ✅ PASS: Some test name
    const details: SmokeTestDetail[] = [];
    let currentCategory = "General";

    const lines = output.split("\n");
    for (const line of lines) {
      // Detect category headers like "=== Category Name ===" or "--- Category Name ---"
      const catMatch = line.match(/^[=\-]{2,}\s*(.+?)\s*[=\-]{2,}$/);
      if (catMatch) {
        currentCategory = catMatch[1].trim();
        continue;
      }

      // Also detect category in brackets: [Category Name]
      const bracketCat = line.match(/^\[([^\]]+)\]/);
      if (bracketCat) {
        currentCategory = bracketCat[1].trim();
      }

      // Match PASS/FAIL/WARN lines
      const passMatch = line.match(/PASS[:\s]+(.+)/i);
      const failMatch = line.match(/FAIL[:\s]+(.+)/i);
      const warnMatch = line.match(/WARN[:\s]+(.+)/i);

      if (passMatch) {
        details.push({
          name: passMatch[1].trim(),
          status: "PASS",
          category: currentCategory,
        });
      } else if (failMatch) {
        details.push({
          name: failMatch[1].trim(),
          status: "FAIL",
          category: currentCategory,
        });
      } else if (warnMatch) {
        details.push({
          name: warnMatch[1].trim(),
          status: "WARN",
          category: currentCategory,
        });
      }
    }

    // Filter by category if requested
    const filtered = category
      ? details.filter(
          (d) =>
            d.category?.toLowerCase().includes(category.toLowerCase()) ||
            d.name.toLowerCase().includes(category.toLowerCase()),
        )
      : details;

    const passed = filtered.filter((d) => d.status === "PASS").length;
    const failed = filtered.filter((d) => d.status === "FAIL").length;
    const warnings = filtered.filter((d) => d.status === "WARN").length;

    const data: SmokeTestData = {
      passed,
      failed,
      warnings,
      total: filtered.length,
      details: filtered,
    };

    const healthLabel =
      failed === 0 ? "all passing" : `${failed} failing`;

    return {
      success: true,
      data,
      summary: `Smoke tests: ${passed} passed, ${failed} failed, ${warnings} warnings (${filtered.length} total — ${healthLabel}).`,
    };
  } catch (outerErr: unknown) {
    const message =
      outerErr instanceof Error ? outerErr.message : String(outerErr);
    return {
      success: false,
      error: `Smoke tests failed to execute: ${message}`,
      summary: "Smoke tests could not be run.",
    };
  }
}

// ---------------------------------------------------------------------------
// check_cron_health — queries CronJobLog for recent cron results
// ---------------------------------------------------------------------------

interface CronJobSummary {
  jobName: string;
  totalRuns: number;
  succeeded: number;
  failed: number;
  lastRunAt: string | null;
  lastStatus: string | null;
  avgDurationMs: number | null;
}

interface CronHealthData {
  jobs: CronJobSummary[];
  failingJobs: string[];
  overallHealth: "healthy" | "degraded" | "critical";
  hoursBack: number;
}

export async function qaCheckCronHealth(
  params: Record<string, unknown>,
  _ctx: ToolContext,
): Promise<ToolResult> {
  try {
    const hoursBack =
      typeof params.hoursBack === "number" ? params.hoursBack : DEFAULT_HOURS_BACK;
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    // Fetch all cron logs in the window
    const logs = await prisma.cronJobLog.findMany({
      where: {
        started_at: { gte: since },
        job_type: { not: "alert" }, // Exclude CEO Inbox alerts
      },
      select: {
        job_name: true,
        status: true,
        started_at: true,
        duration_ms: true,
      },
      orderBy: { started_at: "desc" },
      take: 2000,
    });

    // Group by job_name
    const grouped = new Map<
      string,
      { statuses: string[]; durations: number[]; lastAt: Date; lastStatus: string }
    >();

    for (const log of logs) {
      const existing = grouped.get(log.job_name);
      if (existing) {
        existing.statuses.push(log.status);
        if (log.duration_ms !== null) existing.durations.push(log.duration_ms);
      } else {
        grouped.set(log.job_name, {
          statuses: [log.status],
          durations: log.duration_ms !== null ? [log.duration_ms] : [],
          lastAt: log.started_at,
          lastStatus: log.status,
        });
      }
    }

    const jobs: CronJobSummary[] = [];
    const failingJobs: string[] = [];

    for (const [jobName, data] of grouped) {
      const succeeded = data.statuses.filter(
        (s) => s === "completed",
      ).length;
      const failed = data.statuses.filter(
        (s) => s === "failed" || s === "timed_out",
      ).length;

      const avgDurationMs =
        data.durations.length > 0
          ? Math.round(
              data.durations.reduce((a, b) => a + b, 0) / data.durations.length,
            )
          : null;

      jobs.push({
        jobName,
        totalRuns: data.statuses.length,
        succeeded,
        failed,
        lastRunAt: data.lastAt.toISOString(),
        lastStatus: data.lastStatus,
        avgDurationMs,
      });

      // A job is "failing" if more than half its recent runs failed
      if (failed > 0 && failed >= succeeded) {
        failingJobs.push(jobName);
      }
    }

    // Sort by most failing first, then alphabetically
    jobs.sort((a, b) => b.failed - a.failed || a.jobName.localeCompare(b.jobName));

    // Overall health assessment
    let overallHealth: "healthy" | "degraded" | "critical" = "healthy";
    if (failingJobs.length > 3) {
      overallHealth = "critical";
    } else if (failingJobs.length > 0) {
      overallHealth = "degraded";
    }

    const data: CronHealthData = {
      jobs,
      failingJobs,
      overallHealth,
      hoursBack,
    };

    return {
      success: true,
      data,
      summary: `Cron health (last ${hoursBack}h): ${overallHealth}. ${jobs.length} jobs tracked, ${failingJobs.length} failing${failingJobs.length > 0 ? ` (${failingJobs.join(", ")})` : ""}.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to check cron health: ${message}`,
      summary: "Could not query cron job logs.",
    };
  }
}

// ---------------------------------------------------------------------------
// check_pipeline_health — queries ArticleDraft + BlogPost for pipeline status
// ---------------------------------------------------------------------------

interface PipelineHealthData {
  phaseDistribution: Record<string, number>;
  stuckDrafts: number;
  reservoirSize: number;
  recentPublished: number;
  totalActiveDrafts: number;
  totalRejected: number;
  health: "healthy" | "degraded" | "stalled" | "critical";
}

export async function qaCheckPipelineHealth(
  _params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  try {
    const siteId = ctx.siteId;
    const fourHoursAgo = new Date(Date.now() - STUCK_THRESHOLD_MS);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Run all queries in parallel for speed
    const [
      phaseGroups,
      stuckDrafts,
      reservoirCount,
      recentPublished,
      rejectedCount,
    ] = await Promise.all([
      // Phase distribution — group by current_phase
      prisma.articleDraft.groupBy({
        by: ["current_phase"],
        where: { site_id: siteId },
        _count: { id: true },
      }),

      // Stuck drafts: active phases, not updated in 4+ hours
      prisma.articleDraft.count({
        where: {
          site_id: siteId,
          current_phase: {
            notIn: ["rejected", "reservoir", "published"],
          },
          updated_at: { lt: fourHoursAgo },
          last_error: {
            not: { contains: "MAX_RECOVERIES_EXCEEDED" },
          },
        },
      }),

      // Reservoir size
      prisma.articleDraft.count({
        where: {
          site_id: siteId,
          current_phase: "reservoir",
        },
      }),

      // Recently published BlogPosts (last 24h)
      prisma.blogPost.count({
        where: {
          siteId,
          published: true,
          created_at: { gte: twentyFourHoursAgo },
        },
      }),

      // Total rejected
      prisma.articleDraft.count({
        where: {
          site_id: siteId,
          current_phase: "rejected",
        },
      }),
    ]);

    // Build phase distribution map
    const phaseDistribution: Record<string, number> = {};
    let totalActiveDrafts = 0;

    for (const group of phaseGroups) {
      const phase = group.current_phase;
      const count = group._count.id;
      phaseDistribution[phase] = count;
      if (!["rejected", "reservoir", "published"].includes(phase)) {
        totalActiveDrafts += count;
      }
    }

    // Health assessment
    let health: "healthy" | "degraded" | "stalled" | "critical" = "healthy";

    if (stuckDrafts > 10 || (recentPublished === 0 && totalActiveDrafts === 0 && reservoirCount === 0)) {
      health = "critical";
    } else if (stuckDrafts > 5 || recentPublished === 0) {
      health = "stalled";
    } else if (stuckDrafts > 0 || reservoirCount > 50) {
      health = "degraded";
    }

    const data: PipelineHealthData = {
      phaseDistribution,
      stuckDrafts,
      reservoirSize: reservoirCount,
      recentPublished,
      totalActiveDrafts,
      totalRejected: rejectedCount,
      health,
    };

    const phaseSummary = Object.entries(phaseDistribution)
      .filter(([phase]) => !["rejected", "published"].includes(phase))
      .map(([phase, count]) => `${phase}: ${count}`)
      .join(", ");

    return {
      success: true,
      data,
      summary: `Pipeline health: ${health}. Phases: ${phaseSummary || "none"}. Reservoir: ${reservoirCount}. Stuck: ${stuckDrafts}. Published (24h): ${recentPublished}. Rejected: ${rejectedCount}.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to check pipeline health: ${message}`,
      summary: "Could not query pipeline status.",
    };
  }
}
