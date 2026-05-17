/**
 * Agent Performance Monitor
 *
 * Tracks the performance of all agents across the system:
 * - Run frequency (is it running on schedule?)
 * - Success/failure rates
 * - Duration trends
 * - Fix effectiveness (did the fixes actually improve metrics?)
 * - Coverage (which sites/pages are being checked?)
 *
 * This provides the orchestrator with the data it needs to determine
 * if agents are performing at 100% or need attention.
 */

export interface AgentPerformanceReport {
  agents: AgentStatus[];
  overallHealth: "healthy" | "degraded" | "critical";
  timestamp: string;
  recommendations: string[];
}

export interface AgentStatus {
  agentId: string;
  name: string;
  lastRun: string | null;
  lastRunStatus: "completed" | "failed" | "timed_out" | "unknown";
  lastRunDurationMs: number | null;
  runsLast24h: number;
  runsLast7d: number;
  successRate7d: number; // 0-100
  avgDurationMs7d: number;
  itemsProcessed7d: number;
  itemsSucceeded7d: number;
  itemsFailed7d: number;
  health: "healthy" | "degraded" | "stalled" | "failing";
  issues: string[];
}

const AGENT_DEFINITIONS = [
  {
    id: "seo-agent",
    name: "SEO Intelligence Agent",
    cronName: "seo-agent",
    expectedRunsPerDay: 3,
    maxDurationMs: 55000,
  },
  {
    id: "daily-content-generate",
    name: "Daily Content Generator",
    cronName: "daily-content-generate",
    expectedRunsPerDay: 1,
    maxDurationMs: 55000,
  },
  {
    id: "scheduled-publish",
    name: "Scheduled Publisher",
    cronName: "scheduled-publish",
    expectedRunsPerDay: 2,
    maxDurationMs: 30000,
  },
  {
    id: "weekly-topics",
    name: "Weekly Topic Research",
    cronName: "weekly-topics",
    expectedRunsPerDay: 0.14, // Once per week
    maxDurationMs: 55000,
  },
  {
    id: "trends-monitor",
    name: "Trends Monitor",
    cronName: "trends-monitor",
    expectedRunsPerDay: 1,
    maxDurationMs: 30000,
  },
  {
    id: "analytics",
    name: "Analytics Processor",
    cronName: "analytics",
    expectedRunsPerDay: 1,
    maxDurationMs: 30000,
  },
  {
    id: "seo-orchestrator",
    name: "SEO Orchestrator",
    cronName: "seo-orchestrator",
    expectedRunsPerDay: 1,
    maxDurationMs: 55000,
  },
];

/**
 * Analyze all agent performance based on CronJobLog data.
 */
export async function analyzeAgentPerformance(
  prisma: any
): Promise<AgentPerformanceReport> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const agents: AgentStatus[] = [];
  const recommendations: string[] = [];

  for (const def of AGENT_DEFINITIONS) {
    try {
      // Get last run
      const lastRun = await prisma.cronJobLog.findFirst({
        where: { job_name: def.cronName },
        orderBy: { started_at: "desc" },
      });

      // Get runs in last 24h
      const runs24h = await prisma.cronJobLog.count({
        where: {
          job_name: def.cronName,
          started_at: { gte: oneDayAgo },
        },
      });

      // Get runs in last 7 days with stats
      const runs7d = await prisma.cronJobLog.findMany({
        where: {
          job_name: def.cronName,
          started_at: { gte: sevenDaysAgo },
        },
        select: {
          status: true,
          duration_ms: true,
          items_processed: true,
          items_succeeded: true,
          items_failed: true,
        },
      });

      const totalRuns = runs7d.length;
      const successfulRuns = runs7d.filter(
        (r: any) => r.status === "completed"
      ).length;
      const successRate =
        totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;
      const avgDuration =
        totalRuns > 0
          ? Math.round(
              runs7d.reduce(
                (sum: number, r: any) => sum + (r.duration_ms || 0),
                0
              ) / totalRuns
            )
          : 0;
      const totalProcessed = runs7d.reduce(
        (sum: number, r: any) => sum + (r.items_processed || 0),
        0
      );
      const totalSucceeded = runs7d.reduce(
        (sum: number, r: any) => sum + (r.items_succeeded || 0),
        0
      );
      const totalFailed = runs7d.reduce(
        (sum: number, r: any) => sum + (r.items_failed || 0),
        0
      );

      // Determine health status
      const issues: string[] = [];
      let health: AgentStatus["health"] = "healthy";

      // Check if running on schedule
      if (def.expectedRunsPerDay >= 1 && runs24h < def.expectedRunsPerDay * 0.5) {
        issues.push(
          `Expected ${def.expectedRunsPerDay} runs/day, got ${runs24h}`
        );
        health = "stalled";
      }

      // Check success rate
      if (successRate < 50 && totalRuns > 2) {
        issues.push(`Success rate ${successRate}% is below 50%`);
        health = "failing";
      } else if (successRate < 80 && totalRuns > 2) {
        issues.push(`Success rate ${successRate}% is below 80%`);
        if (health === "healthy") health = "degraded";
      }

      // Check for timeout issues
      if (avgDuration > def.maxDurationMs * 0.9) {
        issues.push(
          `Average duration ${avgDuration}ms is close to timeout (${def.maxDurationMs}ms)`
        );
        if (health === "healthy") health = "degraded";
      }

      // Check last run status
      if (lastRun?.status === "failed") {
        issues.push(`Last run failed: ${lastRun.error_message || "unknown error"}`);
        if (health === "healthy") health = "degraded";
      }

      // Check staleness
      if (lastRun && def.expectedRunsPerDay >= 1) {
        const hoursSinceLastRun =
          (now.getTime() - new Date(lastRun.started_at).getTime()) / 3600000;
        const expectedInterval = 24 / def.expectedRunsPerDay;
        if (hoursSinceLastRun > expectedInterval * 2) {
          issues.push(
            `Last run was ${Math.round(hoursSinceLastRun)}h ago (expected every ${Math.round(expectedInterval)}h)`
          );
          health = "stalled";
        }
      }

      agents.push({
        agentId: def.id,
        name: def.name,
        lastRun: lastRun?.started_at?.toISOString() || null,
        lastRunStatus: lastRun?.status || "unknown",
        lastRunDurationMs: lastRun?.duration_ms || null,
        runsLast24h: runs24h,
        runsLast7d: totalRuns,
        successRate7d: successRate,
        avgDurationMs7d: avgDuration,
        itemsProcessed7d: totalProcessed,
        itemsSucceeded7d: totalSucceeded,
        itemsFailed7d: totalFailed,
        health,
        issues,
      });

      // Generate recommendations
      if (health === "stalled") {
        recommendations.push(
          `${def.name} appears stalled — check Vercel cron configuration and CRON_SECRET`
        );
      }
      if (health === "failing") {
        recommendations.push(
          `${def.name} has high failure rate (${successRate}%) — investigate error logs`
        );
      }
    } catch {
      agents.push({
        agentId: def.id,
        name: def.name,
        lastRun: null,
        lastRunStatus: "unknown",
        lastRunDurationMs: null,
        runsLast24h: 0,
        runsLast7d: 0,
        successRate7d: 0,
        avgDurationMs7d: 0,
        itemsProcessed7d: 0,
        itemsSucceeded7d: 0,
        itemsFailed7d: 0,
        health: "stalled",
        issues: ["Could not query agent metrics — table may not exist"],
      });
    }
  }

  // Calculate overall health
  const criticalCount = agents.filter(
    (a) => a.health === "failing" || a.health === "stalled"
  ).length;
  const degradedCount = agents.filter((a) => a.health === "degraded").length;

  const overallHealth =
    criticalCount > 0
      ? "critical"
      : degradedCount > 1
        ? "degraded"
        : "healthy";

  return {
    agents,
    overallHealth,
    timestamp: new Date().toISOString(),
    recommendations,
  };
}
