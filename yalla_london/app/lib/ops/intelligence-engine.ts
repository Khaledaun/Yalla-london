/**
 * Intelligence Engine — Generates plain-English narratives from live system data.
 *
 * Turns raw database numbers into sentences Khaled can read on his phone.
 * No jargon. No code references. Business language only.
 */

import { CRON_JOBS, PIPELINES, getNextRunTime, type CronJobDef } from "./system-registry";

// ─── Types ──────────────────────────────────────────────────────────────

export interface CronJobStatus {
  id: string;
  name: string;
  lastRun: Date | null;
  lastStatus: "completed" | "failed" | "timed_out" | "never_run";
  lastDurationMs: number | null;
  lastError: string | null;
  runsLast24h: number;
  failsLast24h: number;
  nextRun: Date;
  health: "healthy" | "warning" | "critical" | "unknown";
}

export interface PipelineStatus {
  id: string;
  name: string;
  stageCounts: Record<string, number>;
  totalActive: number;
  bottleneckStage: string | null;
  throughputLast24h: number;
  health: "healthy" | "warning" | "critical" | "idle";
}

export interface Alert {
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  fixAction?: string; // API route to call for fix
  fixLabel?: string;
  cronJobId?: string;
  pipelineId?: string;
}

export interface IntelligenceReport {
  generatedAt: string;
  overallHealth: "healthy" | "warning" | "critical";
  overallScore: number; // 0-100
  narrative: string; // plain-English summary
  cronJobs: CronJobStatus[];
  pipelines: PipelineStatus[];
  alerts: Alert[];
  timeline: TimelineEvent[];
  seoInsight: string | null;
  indexingInsight: string | null;
  revenueInsight: string | null;
}

export interface TimelineEvent {
  time: string; // ISO string
  label: string;
  type: "past" | "upcoming";
  status?: "completed" | "failed" | "scheduled";
  cronJobId?: string;
}

// ─── Main Function ──────────────────────────────────────────────────────

export async function generateIntelligenceReport(): Promise<IntelligenceReport> {
  const { prisma } = await import("@/lib/db");

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // ── Fetch cron job logs ─────────────────────────────────────────────
  let cronLogs: Array<Record<string, unknown>> = [];
  try {
    cronLogs = await prisma.cronJobLog.findMany({
      where: { started_at: { gte: oneDayAgo } },
      orderBy: { started_at: "desc" },
      take: 500,
    });
  } catch {
    // Table may not exist
  }

  // ── Build cron job statuses ─────────────────────────────────────────
  const cronStatuses: CronJobStatus[] = CRON_JOBS.map((cron) => {
    const logs = cronLogs.filter((l) => matchesCronJob(l, cron));
    const lastLog = logs[0] || null;
    const failsLast24h = logs.filter((l) => l.status === "failed" || l.status === "timed_out").length;

    let health: CronJobStatus["health"] = "unknown";
    if (logs.length === 0) {
      health = cron.critical ? "warning" : "unknown";
    } else if (failsLast24h > 0 && failsLast24h >= logs.length / 2) {
      health = "critical";
    } else if (failsLast24h > 0) {
      health = "warning";
    } else {
      health = "healthy";
    }

    return {
      id: cron.id,
      name: cron.name,
      lastRun: lastLog ? new Date(lastLog.started_at as string) : null,
      lastStatus: lastLog ? (lastLog.status as CronJobStatus["lastStatus"]) : "never_run",
      lastDurationMs: lastLog ? (lastLog.duration_ms as number | null) : null,
      lastError: lastLog ? (lastLog.error_message as string | null) : null,
      runsLast24h: logs.length,
      failsLast24h,
      nextRun: getNextRunTime(cron.schedule),
      health,
    };
  });

  // ── Build pipeline statuses ─────────────────────────────────────────
  const pipelineStatuses: PipelineStatus[] = [];

  // Content pipeline
  try {
    const phaseCounts = (await prisma.$queryRawUnsafe(
      `SELECT current_phase, COUNT(*) as count FROM article_drafts GROUP BY current_phase`,
    )) as Array<{ current_phase: string; count: bigint }>;

    const counts: Record<string, number> = {};
    let totalActive = 0;
    let bottleneck: string | null = null;
    let bottleneckCount = 0;

    for (const row of phaseCounts) {
      const phase = row.current_phase;
      const count = Number(row.count);
      counts[phase] = count;
      if (!["published", "rejected"].includes(phase)) {
        totalActive += count;
        if (count > bottleneckCount) {
          bottleneckCount = count;
          bottleneck = phase;
        }
      }
    }

    const publishedToday = await prisma.articleDraft.count({
      where: {
        current_phase: "published",
        published_at: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
      },
    }).catch(() => 0);

    pipelineStatuses.push({
      id: "content-to-revenue",
      name: "Content → Revenue",
      stageCounts: counts,
      totalActive,
      bottleneckStage: bottleneck,
      throughputLast24h: publishedToday,
      health: totalActive > 0 ? "healthy" : publishedToday > 0 ? "healthy" : "idle",
    });
  } catch {
    pipelineStatuses.push({
      id: "content-to-revenue",
      name: "Content → Revenue",
      stageCounts: {},
      totalActive: 0,
      bottleneckStage: null,
      throughputLast24h: 0,
      health: "critical",
    });
  }

  // Indexing pipeline
  try {
    const indexCounts = (await prisma.$queryRawUnsafe(
      `SELECT status, COUNT(*) as count FROM "URLIndexingStatus" GROUP BY status`,
    )) as Array<{ status: string; count: bigint }>;

    const counts: Record<string, number> = {};
    for (const row of indexCounts) {
      counts[row.status] = Number(row.count);
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const indexed = counts["indexed"] || 0;

    pipelineStatuses.push({
      id: "indexing-pipeline",
      name: "Google Indexing",
      stageCounts: counts,
      totalActive: total - indexed,
      bottleneckStage: (counts["submitted"] || 0) > (counts["discovered"] || 0) ? "submitted" : "discovered",
      throughputLast24h: indexed,
      health: total === 0 ? "idle" : indexed > 0 ? "healthy" : "warning",
    });
  } catch {
    pipelineStatuses.push({
      id: "indexing-pipeline",
      name: "Google Indexing",
      stageCounts: {},
      totalActive: 0,
      bottleneckStage: null,
      throughputLast24h: 0,
      health: "idle",
    });
  }

  // ── Generate alerts ─────────────────────────────────────────────────
  const alerts: Alert[] = [];

  // Critical cron failures
  for (const cs of cronStatuses) {
    if (cs.health === "critical") {
      const cron = CRON_JOBS.find((c) => c.id === cs.id);
      alerts.push({
        severity: "critical",
        title: `${cs.name} is failing`,
        detail: cs.lastError || `Failed ${cs.failsLast24h} out of ${cs.runsLast24h} runs in the last 24 hours.`,
        cronJobId: cs.id,
        fixAction: cron?.route,
        fixLabel: `Run ${cs.name}`,
      });
    }
    if (cs.health === "warning" && cs.lastStatus === "never_run") {
      const cron = CRON_JOBS.find((c) => c.id === cs.id);
      alerts.push({
        severity: "warning",
        title: `${cs.name} has never run`,
        detail: `This cron job has no execution history in the last 24 hours. Click "Run Now" to trigger it manually.`,
        cronJobId: cs.id,
        fixAction: cron?.route,
        fixLabel: `Run ${cs.name} Now`,
      });
    }
  }

  // Pipeline alerts
  const contentPipeline = pipelineStatuses.find((p) => p.id === "content-to-revenue");
  if (contentPipeline) {
    if (contentPipeline.health === "idle") {
      alerts.push({
        severity: "warning",
        title: "Content pipeline is idle",
        detail: "No articles are being processed. Generate content from the Generation Monitor page.",
        pipelineId: "content-to-revenue",
        fixAction: "/api/admin/content-generation-monitor",
        fixLabel: "Generate Content",
      });
    }
    if (contentPipeline.bottleneckStage && contentPipeline.stageCounts[contentPipeline.bottleneckStage] > 5) {
      alerts.push({
        severity: "warning",
        title: `Bottleneck at "${contentPipeline.bottleneckStage}" stage`,
        detail: `${contentPipeline.stageCounts[contentPipeline.bottleneckStage]} articles stuck in the ${contentPipeline.bottleneckStage} phase. This may indicate an AI provider issue.`,
        pipelineId: "content-to-revenue",
      });
    }
  }

  // Topic supply
  try {
    const topicCount = await prisma.topicProposal.count({
      where: { status: { in: ["planned", "queued", "ready", "proposed"] } },
    });
    if (topicCount === 0) {
      alerts.push({
        severity: "critical",
        title: "No topics available",
        detail: "The content pipeline has no topics to work with. Run Weekly Topics to generate new ones.",
        fixAction: "/api/cron/weekly-topics",
        fixLabel: "Generate Topics",
      });
    } else if (topicCount < 5) {
      alerts.push({
        severity: "warning",
        title: `Only ${topicCount} topics left`,
        detail: "Topic supply is running low. The weekly cron generates 30 topics every Monday.",
      });
    }
  } catch { /* */ }

  // Published article count
  try {
    const publishedCount = await prisma.blogPost.count({
      where: { published: true },
    });
    if (publishedCount === 0) {
      alerts.push({
        severity: "critical",
        title: "No published articles",
        detail: "Your site has zero published articles. No content = no traffic = no revenue.",
        pipelineId: "content-to-revenue",
      });
    }
  } catch { /* */ }

  // ── Build timeline ──────────────────────────────────────────────────
  const timeline: TimelineEvent[] = [];

  // Past events (last 24h)
  for (const log of cronLogs.slice(0, 20)) {
    const cronDef = CRON_JOBS.find((c) => matchesCronJob(log, c));
    timeline.push({
      time: (log.started_at as Date).toISOString(),
      label: cronDef?.name || (log.job_name as string),
      type: "past",
      status: log.status as "completed" | "failed",
      cronJobId: cronDef?.id,
    });
  }

  // Upcoming events (next 24h)
  for (const cron of CRON_JOBS) {
    const nextRun = getNextRunTime(cron.schedule);
    if (nextRun.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      timeline.push({
        time: nextRun.toISOString(),
        label: cron.name,
        type: "upcoming",
        status: "scheduled",
        cronJobId: cron.id,
      });
    }
  }

  timeline.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  // ── SEO insight ─────────────────────────────────────────────────────
  let seoInsight: string | null = null;
  try {
    const latestSeoReport = await prisma.seoReport.findFirst({
      orderBy: { createdAt: "desc" },
    });
    if (latestSeoReport) {
      const data = latestSeoReport.data as Record<string, unknown> | null;
      const issues = (data?.criticalIssues as string[]) || [];
      const actions = (data?.prioritizedActions as Array<Record<string, unknown>>) || [];
      seoInsight = issues.length > 0
        ? `Last SEO audit found ${issues.length} issue(s): ${issues.slice(0, 3).join("; ")}. ${actions.length} actions recommended.`
        : "Last SEO audit found no critical issues. System is healthy.";
    } else {
      seoInsight = "No SEO audit reports found yet. The SEO orchestrator runs daily at 6 AM UTC.";
    }
  } catch (seoErr) {
    const errMsg = seoErr instanceof Error ? seoErr.message : "";
    if (errMsg.includes("does not exist") || errMsg.includes("P2021")) {
      seoInsight = "SEO reports table needs setup. Click 'Fix Database' on the Generation Monitor page to create missing tables, then run the SEO agent.";
    } else {
      seoInsight = "No SEO audit data available yet. The SEO agent runs 3x daily (7am, 1pm, 8pm UTC) and will create reports automatically after its first run.";
    }
  }

  // ── Indexing insight ────────────────────────────────────────────────
  let indexingInsight: string | null = null;
  try {
    const indexingPipeline = pipelineStatuses.find((p) => p.id === "indexing-pipeline");
    if (indexingPipeline) {
      const total = Object.values(indexingPipeline.stageCounts).reduce((a, b) => a + b, 0);
      const indexed = indexingPipeline.stageCounts["indexed"] || 0;
      const submitted = indexingPipeline.stageCounts["submitted"] || 0;
      const discovered = indexingPipeline.stageCounts["discovered"] || 0;
      if (total === 0) {
        indexingInsight = "No URLs have been tracked yet. Publish articles first, then the SEO agent will submit them to Google.";
      } else {
        indexingInsight = `${total} URLs tracked: ${indexed} indexed by Google, ${submitted} submitted (waiting), ${discovered} discovered (not yet submitted). Indexing rate: ${total > 0 ? Math.round((indexed / total) * 100) : 0}%.`;
      }
    }
  } catch { /* */ }

  // ── Revenue insight ─────────────────────────────────────────────────
  let revenueInsight: string | null = null;
  try {
    const postsWithAffiliates = await prisma.blogPost.count({
      where: {
        published: true,
        content_en: { contains: "affiliate-partners-section" },
      },
    });
    const totalPublished = await prisma.blogPost.count({ where: { published: true } });
    if (totalPublished === 0) {
      revenueInsight = "No published articles yet. Revenue starts when articles go live with affiliate links.";
    } else {
      revenueInsight = `${postsWithAffiliates} of ${totalPublished} published articles have affiliate links (${Math.round((postsWithAffiliates / totalPublished) * 100)}%). Each click on a partner link earns commission.`;
    }
  } catch { /* */ }

  // ── Overall health score ────────────────────────────────────────────
  const criticalAlerts = alerts.filter((a) => a.severity === "critical").length;
  const warningAlerts = alerts.filter((a) => a.severity === "warning").length;
  const healthyCrons = cronStatuses.filter((c) => c.health === "healthy").length;
  const totalCrons = cronStatuses.length;

  let overallScore = 100;
  overallScore -= criticalAlerts * 20;
  overallScore -= warningAlerts * 5;
  overallScore -= (totalCrons - healthyCrons) * 2;
  overallScore = Math.max(0, Math.min(100, overallScore));

  const overallHealth: IntelligenceReport["overallHealth"] =
    criticalAlerts > 0 ? "critical" : warningAlerts > 2 ? "warning" : "healthy";

  // ── Narrative summary ───────────────────────────────────────────────
  const narrative = generateNarrative({
    overallHealth,
    overallScore,
    criticalAlerts,
    warningAlerts,
    healthyCrons,
    totalCrons,
    contentPipeline,
    seoInsight,
    indexingInsight,
    revenueInsight,
  });

  return {
    generatedAt: now.toISOString(),
    overallHealth,
    overallScore,
    narrative,
    cronJobs: cronStatuses,
    pipelines: pipelineStatuses,
    alerts,
    timeline,
    seoInsight,
    indexingInsight,
    revenueInsight,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────

function matchesCronJob(log: Record<string, unknown>, cron: CronJobDef): boolean {
  const jobName = (log.job_name as string) || "";
  // Match by route path or by common name patterns
  return (
    jobName === cron.id ||
    jobName === cron.name.toLowerCase().replace(/\s+/g, "-") ||
    cron.route.includes(jobName) ||
    jobName.includes(cron.id.replace(/-/g, "_")) ||
    jobName.includes(cron.id)
  );
}

function generateNarrative(ctx: {
  overallHealth: string;
  overallScore: number;
  criticalAlerts: number;
  warningAlerts: number;
  healthyCrons: number;
  totalCrons: number;
  contentPipeline?: PipelineStatus | null;
  seoInsight: string | null;
  indexingInsight: string | null;
  revenueInsight: string | null;
}): string {
  const lines: string[] = [];

  // Health headline
  if (ctx.overallHealth === "critical") {
    lines.push(`System needs attention. ${ctx.criticalAlerts} critical issue(s) require immediate action.`);
  } else if (ctx.overallHealth === "warning") {
    lines.push(`System is running with ${ctx.warningAlerts} warning(s). Review the alerts below.`);
  } else {
    lines.push(`System is healthy. ${ctx.healthyCrons} of ${ctx.totalCrons} scheduled jobs running normally.`);
  }

  // Content pipeline
  if (ctx.contentPipeline) {
    if (ctx.contentPipeline.health === "idle") {
      lines.push("Content pipeline is idle — no articles are being generated. Tap Generate Content to start.");
    } else {
      lines.push(`Content pipeline is active: ${ctx.contentPipeline.totalActive} article(s) in progress, ${ctx.contentPipeline.throughputLast24h} published today.`);
      if (ctx.contentPipeline.bottleneckStage) {
        lines.push(`Current bottleneck: "${ctx.contentPipeline.bottleneckStage}" stage.`);
      }
    }
  }

  // Indexing
  if (ctx.indexingInsight) {
    lines.push(ctx.indexingInsight);
  }

  // Revenue
  if (ctx.revenueInsight) {
    lines.push(ctx.revenueInsight);
  }

  return lines.join(" ");
}
