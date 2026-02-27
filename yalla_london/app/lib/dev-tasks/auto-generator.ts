/**
 * DevTask Auto-Generator
 *
 * Scans system state and creates DevTasks for issues that need attention.
 * Sources: diagnostics, cron failures, pipeline stalls, indexing gaps, site health.
 * Deduplicates by sourceRef — won't create duplicate tasks for the same issue.
 */

interface TaskTemplate {
  title: string;
  description: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  source: string;
  sourceRef: string;
  actionLabel?: string;
  actionApi?: string;
  actionPayload?: Record<string, unknown>;
  dueDate?: Date;
}

export async function autoGenerateTasks(siteId: string): Promise<{
  created: number;
  skipped: number;
  tasks: TaskTemplate[];
}> {
  const { prisma } = await import("@/lib/db");
  const tasks: TaskTemplate[] = [];

  // Helper: check if task with this sourceRef already exists (pending/in_progress)
  async function taskExists(sourceRef: string): Promise<boolean> {
    try {
      const existing = await prisma.devTask.count({
        where: {
          siteId,
          sourceRef,
          status: { in: ["pending", "in_progress"] },
        },
      });
      return existing > 0;
    } catch {
      return false; // If table doesn't exist, no duplicates
    }
  }

  // ── 1. Pipeline Stalls ─────────────────────────────────────────────
  try {
    // No pending topics
    const pendingTopics = await prisma.topicProposal.count({
      where: { site_id: siteId, status: "pending" },
    });
    if (pendingTopics === 0) {
      tasks.push({
        title: "Topic queue empty — pipeline will stall",
        description: "No pending topics for content generation. The content builder needs topics to create articles. Generate new topics now.",
        category: "pipeline",
        priority: "high",
        source: "auto-scan",
        sourceRef: `pipeline-no-topics-${siteId}`,
        actionLabel: "Generate Topics",
        actionApi: "/api/cron/weekly-topics",
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due tomorrow
      });
    }

    // Empty reservoir
    const reservoirCount = await prisma.articleDraft.count({
      where: { site_id: siteId, phase: "reservoir" },
    });
    if (reservoirCount === 0) {
      tasks.push({
        title: "Reservoir empty — nothing to publish",
        description: "No articles in the reservoir waiting to be published. Run the content builder to fill the pipeline.",
        category: "pipeline",
        priority: "high",
        source: "auto-scan",
        sourceRef: `pipeline-empty-reservoir-${siteId}`,
        actionLabel: "Run Content Builder",
        actionApi: "/api/cron/content-builder",
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    }

    // Stuck drafts (>12h in same phase)
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const stuckDrafts = await prisma.articleDraft.count({
      where: {
        site_id: siteId,
        phase: { notIn: ["reservoir", "completed", "failed"] },
        updated_at: { lt: twelveHoursAgo },
      },
    });
    if (stuckDrafts > 0) {
      tasks.push({
        title: `${stuckDrafts} draft(s) stuck in pipeline for 12+ hours`,
        description: "Article drafts haven't progressed. The content builder may be crashing or timing out.",
        category: "pipeline",
        priority: "medium",
        source: "auto-scan",
        sourceRef: `pipeline-stuck-drafts-${siteId}`,
        actionLabel: "Restart Content Builder",
        actionApi: "/api/cron/content-builder",
      });
    }

    // No publishing today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const publishedToday = await prisma.blogPost.count({
      where: { siteId, status: "published", published_at: { gte: today } },
    });
    if (publishedToday === 0) {
      tasks.push({
        title: "No articles published today",
        description: "Target is 2 articles/day. Run the content selector to publish from the reservoir.",
        category: "pipeline",
        priority: "medium",
        source: "auto-scan",
        sourceRef: `pipeline-no-publish-today-${siteId}-${today.toISOString().slice(0, 10)}`,
        actionLabel: "Run Content Selector",
        actionApi: "/api/cron/content-selector",
      });
    }
  } catch {
    // Pipeline tables may not exist yet
  }

  // ── 2. Cron Failures (last 24h) ───────────────────────────────────
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const failedCrons = await prisma.cronJobLog.findMany({
      where: {
        started_at: { gte: oneDayAgo },
        status: { in: ["failed", "timed_out"] },
      },
      select: { job_name: true, error_message: true, started_at: true },
      orderBy: { started_at: "desc" },
      take: 20,
    });

    // Deduplicate by job name (only latest failure per job)
    const seenJobs = new Set<string>();
    for (const cron of failedCrons) {
      if (seenJobs.has(cron.job_name)) continue;
      seenJobs.add(cron.job_name);

      const errorSummary = (cron.error_message || "Unknown error").substring(0, 200);
      tasks.push({
        title: `Cron "${cron.job_name}" failed`,
        description: `Last failure: ${errorSummary}`,
        category: "automation",
        priority: "high",
        source: "cron-failure",
        sourceRef: `cron-fail-${cron.job_name}-${new Date().toISOString().slice(0, 10)}`,
        actionLabel: `Re-run ${cron.job_name}`,
        actionApi: "/api/admin/departures",
        actionPayload: { path: `/api/cron/${cron.job_name}` },
      });
    }
  } catch {
    // CronJobLog may not exist
  }

  // ── 3. Indexing Gaps ───────────────────────────────────────────────
  try {
    const neverSubmitted = await prisma.blogPost.count({
      where: {
        siteId,
        status: "published",
        indexing_status: { in: [null as unknown as string, "not_indexed", ""] },
      },
    });

    if (neverSubmitted > 5) {
      tasks.push({
        title: `${neverSubmitted} articles never submitted to Google`,
        description: "These articles haven't been submitted via IndexNow or GSC. They rely on natural crawl discovery, which is slow.",
        category: "seo",
        priority: "medium",
        source: "auto-scan",
        sourceRef: `indexing-gap-${siteId}`,
        actionLabel: "Submit All to IndexNow",
        actionApi: "/api/admin/content-indexing",
        actionPayload: { action: "submit_all" },
      });
    }
  } catch {
    // BlogPost table may not have indexing fields
  }

  // ── 4. Low Content Count ───────────────────────────────────────────
  try {
    const totalPublished = await prisma.blogPost.count({
      where: { siteId, status: "published" },
    });

    if (totalPublished < 20) {
      tasks.push({
        title: `Only ${totalPublished} published articles — need 20+ for authority`,
        description: "Google needs 20+ quality pages to consider a site authoritative. Keep the content pipeline running.",
        category: "content",
        priority: totalPublished < 5 ? "critical" : "medium",
        source: "auto-scan",
        sourceRef: `low-content-${siteId}`,
        actionLabel: "Run Content Pipeline",
        actionApi: "/api/cron/content-builder",
      });
    }
  } catch {
    // BlogPost may not exist
  }

  // ── 5. Missing Env Vars ────────────────────────────────────────────
  const criticalEnvVars = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"];
  const importantEnvVars = ["XAI_API_KEY", "INDEXNOW_KEY", "CRON_SECRET"];

  for (const key of criticalEnvVars) {
    if (!process.env[key]) {
      tasks.push({
        title: `Missing critical env var: ${key}`,
        description: `${key} is required for the platform to function. Set it in your Vercel environment variables.`,
        category: "config",
        priority: "critical",
        source: "auto-scan",
        sourceRef: `env-missing-${key}`,
      });
    }
  }

  for (const key of importantEnvVars) {
    if (!process.env[key]) {
      tasks.push({
        title: `Missing env var: ${key}`,
        description: `${key} is recommended for full platform functionality.`,
        category: "config",
        priority: "medium",
        source: "auto-scan",
        sourceRef: `env-missing-${key}`,
      });
    }
  }

  // ── Deduplicate and Create ─────────────────────────────────────────
  let created = 0;
  let skipped = 0;

  for (const task of tasks) {
    if (await taskExists(task.sourceRef)) {
      skipped++;
      continue;
    }

    try {
      await prisma.devTask.create({
        data: {
          siteId,
          title: task.title,
          description: task.description,
          category: task.category,
          priority: task.priority,
          source: task.source,
          sourceRef: task.sourceRef,
          actionLabel: task.actionLabel || null,
          actionApi: task.actionApi || null,
          actionPayload: task.actionPayload || null,
          dueDate: task.dueDate || null,
        },
      });
      created++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("P2021") || msg.includes("does not exist")) {
        break; // Table doesn't exist, stop trying
      }
      console.warn(`[auto-generator] Failed to create task "${task.title}":`, msg);
    }
  }

  return { created, skipped, tasks };
}
