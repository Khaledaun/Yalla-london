/**
 * Cron Job Diagnostics
 *
 * Tests: schedule verification, last-run health, timeout detection, failure rates.
 * Covers all 17+ scheduled cron jobs in vercel.json.
 */

import type { DiagnosticResult } from "../types";

const SECTION = "crons";

function pass(id: string, name: string, detail: string, explanation: string): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "pass", detail, explanation };
}
function warn(id: string, name: string, detail: string, explanation: string, diagnosis?: string, fixAction?: DiagnosticResult["fixAction"]): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "warn", detail, explanation, diagnosis, fixAction };
}
function fail(id: string, name: string, detail: string, explanation: string, diagnosis?: string, fixAction?: DiagnosticResult["fixAction"]): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "fail", detail, explanation, diagnosis, fixAction };
}

/** Known cron jobs with expected schedules and descriptions */
const KNOWN_CRONS: { name: string; path: string; description: string }[] = [
  { name: "analytics", path: "/api/cron/analytics", description: "Syncs GA4 and GSC analytics data for dashboard metrics" },
  { name: "weekly-topics", path: "/api/cron/weekly-topics", description: "Generates new topic proposals for all active sites (runs Monday)" },
  { name: "daily-content-generate", path: "/api/cron/daily-content-generate", description: "Creates new article drafts from approved topic proposals" },
  { name: "content-builder", path: "/api/cron/content-builder", description: "Moves article drafts through the 8-phase pipeline (research → reservoir)" },
  { name: "content-selector", path: "/api/cron/content-selector", description: "Selects reservoir articles for publication and creates scheduled content" },
  { name: "scheduled-publish", path: "/api/cron/scheduled-publish", description: "Publishes scheduled articles at their designated times (runs 9am + 4pm)" },
  { name: "seo-agent", path: "/api/cron/seo-agent", description: "Auto-fixes meta tags, injects internal links, submits to IndexNow" },
  { name: "seo-orchestrator", path: "/api/cron/seo-orchestrator", description: "Weekly deep SEO audit and health report generation" },
  { name: "seo-cron", path: "/api/seo/cron", description: "Daily SEO maintenance — sitemap updates, IndexNow submissions" },
  { name: "trends-monitor", path: "/api/cron/trends-monitor", description: "Scans trending topics for timely content opportunities" },
  { name: "affiliate-injection", path: "/api/cron/affiliate-injection", description: "Injects affiliate/booking links into published articles" },
  { name: "content-auto-fix", path: "/api/cron/content-auto-fix", description: "Expands thin articles (<1000 words) and trims long meta descriptions" },
  { name: "london-news", path: "/api/cron/london-news", description: "Fetches and generates London-specific news articles" },
  { name: "site-health", path: "/api/cron/site-health", description: "Nightly health check across all sites" },
  { name: "fact-verification", path: "/api/cron/fact-verification", description: "Verifies factual claims in generated content" },
];

const cronSection = async (
  siteId: string,
  _budgetMs: number,
  _startTime: number,
): Promise<DiagnosticResult[]> => {
  const results: DiagnosticResult[] = [];

  try {
    const { prisma } = await import("@/lib/db");

    // ── 1. Overall Cron Health (last 24h) ────────────────────────────
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalRuns, failedRuns, timedOutRuns] = await Promise.all([
      prisma.cronJobLog.count({ where: { started_at: { gte: oneDayAgo } } }),
      prisma.cronJobLog.count({ where: { started_at: { gte: oneDayAgo }, status: "failed" } }),
      prisma.cronJobLog.count({ where: { started_at: { gte: oneDayAgo }, status: "timed_out" } }),
    ]);

    if (totalRuns === 0) {
      results.push(warn("overall-24h", "Cron Activity (24h)", "No cron runs in the last 24 hours", "Checks if cron jobs have been running. If nothing ran in 24h, the scheduler may be disconnected or Vercel cron is not configured.", "No cron jobs have run today. Check vercel.json cron schedule and ensure the project is deployed."));
    } else if (failedRuns === 0 && timedOutRuns === 0) {
      results.push(pass("overall-24h", "Cron Activity (24h)", `${totalRuns} runs — all successful`, "Checks the overall health of cron job execution over the last 24 hours. Green means all jobs completed without errors."));
    } else {
      const status = failedRuns > 3 ? "fail" : "warn";
      const result: DiagnosticResult = {
        id: `${SECTION}-overall-24h`,
        section: SECTION,
        name: "Cron Activity (24h)",
        status: status as "fail" | "warn",
        detail: `${totalRuns} runs — ${failedRuns} failed, ${timedOutRuns} timed out`,
        explanation: "Checks overall cron job health over the last 24 hours.",
        diagnosis: `${failedRuns} job(s) failed and ${timedOutRuns} timed out. Check the departures board for details on which jobs need attention.`,
      };
      results.push(result);
    }

    // ── 2. Per-Cron Health Check ─────────────────────────────────────
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const cron of KNOWN_CRONS) {
      try {
        const recentLogs = await prisma.cronJobLog.findMany({
          where: {
            job_name: cron.name,
            started_at: { gte: sevenDaysAgo },
          },
          orderBy: { started_at: "desc" },
          take: 5,
          select: { status: true, duration_ms: true, started_at: true, error_message: true, items_processed: true },
        });

        if (recentLogs.length === 0) {
          results.push(warn(`cron-${cron.name}`, `Cron: ${cron.name}`, "Never run (7 days)", `${cron.description}. This cron job has no execution records in the last 7 days. It may not be scheduled in vercel.json.`, undefined, {
            id: `fix-cron-${cron.name}`,
            label: `Run ${cron.name} Now`,
            api: "/api/admin/departures",
            method: "POST",
            payload: { path: cron.path },
            rerunGroup: "crons",
          }));
          continue;
        }

        const latest = recentLogs[0];
        const failCount = recentLogs.filter(l => l.status === "failed" || l.status === "timed_out").length;
        const successRate = Math.round(((recentLogs.length - failCount) / recentLogs.length) * 100);
        const ageHours = Math.round((Date.now() - new Date(latest.started_at).getTime()) / (1000 * 60 * 60));

        if (latest.status === "completed" && successRate >= 80) {
          results.push(pass(`cron-${cron.name}`, `Cron: ${cron.name}`, `Last: ${ageHours}h ago — ${successRate}% success (7d)`, `${cron.description}`));
        } else if (latest.status === "failed" || latest.status === "timed_out") {
          let errorSummary = latest.error_message || "Unknown error";
          if (errorSummary.length > 100) errorSummary = errorSummary.substring(0, 100) + "...";

          results.push(fail(`cron-${cron.name}`, `Cron: ${cron.name}`, `Last run FAILED ${ageHours}h ago: ${errorSummary}`, `${cron.description}`, `This cron job's most recent run failed. Error: ${errorSummary}. Try running it manually.`, {
            id: `fix-cron-${cron.name}`,
            label: `Re-run ${cron.name}`,
            api: "/api/admin/departures",
            method: "POST",
            payload: { path: cron.path },
            rerunGroup: "crons",
          }));
        } else {
          results.push(warn(`cron-${cron.name}`, `Cron: ${cron.name}`, `${successRate}% success rate (7d) — last: ${ageHours}h ago`, `${cron.description}`, `Success rate below 100%. ${failCount} of ${recentLogs.length} recent runs had issues.`));
        }
      } catch {
        results.push(warn(`cron-${cron.name}`, `Cron: ${cron.name}`, "Could not check", `${cron.description}`));
      }
    }

    // ── 3. Timeout Budget Analysis ───────────────────────────────────
    try {
      const recentWithDuration = await prisma.cronJobLog.findMany({
        where: {
          started_at: { gte: sevenDaysAgo },
          duration_ms: { not: null },
        },
        select: { job_name: true, duration_ms: true },
      });

      const slowJobs = recentWithDuration.filter(l => (l.duration_ms || 0) > 50000);
      if (slowJobs.length === 0) {
        results.push(pass("timeout-risk", "Timeout Risk", "No jobs approaching 60s limit (7d)", "Vercel has a 60-second timeout for serverless functions. Jobs approaching this limit risk timing out and failing. All recent jobs completed well within budget."));
      } else {
        const jobNames = [...new Set(slowJobs.map(j => j.job_name))];
        results.push(warn("timeout-risk", "Timeout Risk", `${slowJobs.length} run(s) exceeded 50s: ${jobNames.join(", ")}`, "Vercel has a 60-second timeout for serverless functions.", `These jobs are running dangerously close to the 60s limit. They may intermittently time out.`));
      }
    } catch {
      results.push(warn("timeout-risk", "Timeout Risk", "Could not analyze durations", "Checks for jobs approaching Vercel's 60s timeout."));
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("P2021") || msg.includes("does not exist")) {
      results.push(fail("cron-table", "CronJobLog Table", "Table missing", "The CronJobLog table stores cron execution history. Without it, we can't monitor job health.", "Run prisma db push to create the table.", {
        id: "fix-cron-table",
        label: "Fix Database Schema",
        api: "/api/admin/diagnostics/fix",
        payload: { fixType: "db_push" },
        rerunGroup: "crons",
      }));
    } else {
      results.push(fail("cron-db", "Cron Database", `Error: ${msg}`, "Cron diagnostics require database access."));
    }
  }

  return results;
};

export default cronSection;
