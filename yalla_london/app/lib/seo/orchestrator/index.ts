/**
 * SEO Orchestrator Agent — The Master Coordinator
 *
 * This is the brain of the autonomous SEO system. It sits above all other
 * agents and ensures they work together toward business goals.
 *
 * Responsibilities:
 * 1. Run live site audits (URL health, schema, robots.txt, CDN, rendering)
 * 2. Evaluate business goals against current metrics
 * 3. Monitor all agent performance (are they running? succeeding?)
 * 4. Run weekly SEO/AIO research and update agent configurations
 * 5. Enforce pre-publication gates
 * 6. Generate executive-level health reports
 * 7. Auto-prioritize work based on impact
 *
 * Design principle: "Launch and forget" — this agent ensures the site
 * runs at peak performance without human intervention.
 */

import { runLiveSiteAudit, type LiveAuditResult } from "./live-site-auditor";
import { evaluateGoals, type GoalEvaluation } from "./business-goals";
import { analyzeAgentPerformance, type AgentPerformanceReport } from "./agent-performance-monitor";
import { runWeeklyResearch, type ResearchReport } from "./weekly-research-agent";

export interface OrchestratorReport {
  runId: string;
  runAt: string;
  siteId: string;
  siteUrl: string;

  // Core audit results
  liveAudit: LiveAuditResult;
  businessGoals: GoalEvaluation[];
  agentPerformance: AgentPerformanceReport;
  research: ResearchReport | null;

  // Synthesized outputs
  healthScore: number;
  status: "excellent" | "good" | "needs_attention" | "critical";
  criticalIssues: string[];
  prioritizedActions: PrioritizedAction[];
  agentDirectives: AgentDirective[];

  // Timing
  durationMs: number;
}

export interface PrioritizedAction {
  id: string;
  title: string;
  description: string;
  priority: number; // 0 = highest
  category: "fix" | "optimize" | "research" | "monitor";
  ownerAgent: string;
  estimatedImpact: "critical" | "high" | "medium" | "low";
  automated: boolean;
}

export interface AgentDirective {
  agentId: string;
  directive: string;
  priority: "urgent" | "normal" | "low";
  context: string;
}

/**
 * Run the full orchestration cycle.
 *
 * @param siteId - The site to orchestrate
 * @param siteUrl - The base URL of the site
 * @param options - Configuration options
 */
export async function runOrchestrator(
  prisma: any,
  siteId: string,
  siteUrl: string,
  options: {
    includeResearch?: boolean;
    maxDurationMs?: number;
  } = {}
): Promise<OrchestratorReport> {
  const startTime = Date.now();
  const { includeResearch = false, maxDurationMs = 50000 } = options;
  const deadline = startTime + maxDurationMs;

  const runId = `orch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // ── Phase 1: Parallel data collection ───────────────────────────────
  // Run live audit, agent performance check, and metrics collection
  // simultaneously to maximize use of our 60s window.
  const [liveAudit, agentPerformance, currentMetrics] = await Promise.all([
    runLiveSiteAudit(siteUrl, {
      maxUrls: 50,
      timeoutMs: Math.min(35000, deadline - Date.now() - 15000),
    }).catch((e) => {
      console.error("Live audit failed:", e);
      return createDefaultAudit();
    }),

    analyzeAgentPerformance(prisma).catch((e) => {
      console.error("Agent performance check failed:", e);
      return createDefaultAgentReport();
    }),

    collectCurrentMetrics(prisma, siteId).catch(() => ({} as Record<string, number>)),
  ]);

  // ── Phase 2: Business goal evaluation ───────────────────────────────
  // Merge live audit metrics into current metrics
  const enrichedMetrics = {
    ...currentMetrics,
    sitemap_health:
      liveAudit.sitemapHealth.totalUrls > 0
        ? Math.round(
            (liveAudit.sitemapHealth.healthy /
              liveAudit.sitemapHealth.totalUrls) *
              100
          )
        : 0,
    schema_validity: liveAudit.schemaValidation.valid ? 100 : 0,
    robots_conflicts: liveAudit.robotsConflicts.conflicts.length,
    cache_hit_rate: liveAudit.cdnPerformance.hitRate,
    ai_crawlers_allowed: liveAudit.robotsConflicts.aiCrawlersAllowed.length,
    pending_proposals: currentMetrics.pending_proposals || 0,
    indexed_pages: currentMetrics.indexed_pages || 0,
  };

  const businessGoals = evaluateGoals(enrichedMetrics);

  // ── Phase 3: Weekly research (if scheduled) ─────────────────────────
  let research: ResearchReport | null = null;
  if (includeResearch && Date.now() < deadline - 15000) {
    research = await runWeeklyResearch(prisma, siteId).catch((e) => {
      console.warn("Weekly research failed:", e);
      return null;
    });
  }

  // ── Phase 4: Synthesize findings ────────────────────────────────────
  const criticalIssues: string[] = [
    ...liveAudit.criticalIssues,
    ...businessGoals
      .filter((g) => g.overallStatus === "critical")
      .map((g) => `Business goal "${g.goal.name}" is in critical state`),
    ...agentPerformance.recommendations.filter((r) =>
      r.toLowerCase().includes("stall")
    ),
  ];

  const prioritizedActions = generatePrioritizedActions(
    liveAudit,
    businessGoals,
    agentPerformance,
    research
  );

  const agentDirectives = generateAgentDirectives(
    liveAudit,
    businessGoals,
    agentPerformance
  );

  // Calculate overall health score
  const healthScore = calculateOverallHealth(
    liveAudit,
    businessGoals,
    agentPerformance
  );

  const status: OrchestratorReport["status"] =
    healthScore >= 85
      ? "excellent"
      : healthScore >= 65
        ? "good"
        : healthScore >= 40
          ? "needs_attention"
          : "critical";

  const report: OrchestratorReport = {
    runId,
    runAt: new Date().toISOString(),
    siteId,
    siteUrl,
    liveAudit,
    businessGoals,
    agentPerformance,
    research,
    healthScore,
    status,
    criticalIssues,
    prioritizedActions,
    agentDirectives,
    durationMs: Date.now() - startTime,
  };

  // ── Phase 5: Store report ───────────────────────────────────────────
  try {
    await prisma.seoReport.create({
      data: {
        reportType: "orchestrator",
        site_id: siteId,
        generatedAt: new Date(),
        data: {
          runId,
          status,
          healthScore,
          criticalIssues,
          prioritizedActions: prioritizedActions.slice(0, 20),
          agentDirectives,
          liveAuditSummary: {
            sitemapBroken: liveAudit.sitemapHealth.broken,
            sitemapTotal: liveAudit.sitemapHealth.totalUrls,
            schemaValid: liveAudit.schemaValidation.valid,
            robotsConflicts: liveAudit.robotsConflicts.conflicts.length,
            aiCrawlersBlocked:
              liveAudit.robotsConflicts.aiCrawlersBlocked.length,
            cacheHitRate: liveAudit.cdnPerformance.hitRate,
            csrBailouts: liveAudit.renderingCheck.csrBailouts.length,
          },
          agentHealthSummary: {
            overall: agentPerformance.overallHealth,
            stalled: agentPerformance.agents.filter(
              (a) => a.health === "stalled"
            ).length,
            failing: agentPerformance.agents.filter(
              (a) => a.health === "failing"
            ).length,
          },
          businessGoalsSummary: businessGoals.map((g) => ({
            goal: g.goal.id,
            status: g.overallStatus,
          })),
          researchSummary: research
            ? {
                findingsCount: research.findingsCount,
                agentUpdates: research.agentUpdates.length,
              }
            : null,
          durationMs: report.durationMs,
          agent: "seo-orchestrator-v1",
        },
      },
    });
  } catch (e) {
    console.warn("Failed to store orchestrator report:", e);
  }

  // ── Phase 6: Update site health check ───────────────────────────────
  try {
    await prisma.siteHealthCheck.upsert({
      where: {
        site_id_checked_at: {
          site_id: siteId,
          checked_at: new Date(new Date().toISOString().split("T")[0]),
        },
      },
      update: {
        health_score: healthScore,
        last_agent_run: new Date(),
        pending_proposals: enrichedMetrics.pending_proposals || 0,
      },
      create: {
        site_id: siteId,
        checked_at: new Date(),
        health_score: healthScore,
        last_agent_run: new Date(),
        total_pages: liveAudit.sitemapHealth.totalUrls,
        indexed_pages: enrichedMetrics.indexed_pages || 0,
        indexing_rate:
          liveAudit.sitemapHealth.totalUrls > 0
            ? Math.round(
                ((enrichedMetrics.indexed_pages || 0) /
                  liveAudit.sitemapHealth.totalUrls) *
                  100
              )
            : 0,
        pending_proposals: enrichedMetrics.pending_proposals || 0,
      },
    });
  } catch {
    // SiteHealthCheck may not have all required fields — non-fatal
  }

  console.log(
    `[Orchestrator] ${siteId}: health=${healthScore}%, status=${status}, ` +
      `critical=${criticalIssues.length}, actions=${prioritizedActions.length}, ` +
      `duration=${report.durationMs}ms`
  );

  return report;
}

// ── Prioritized Action Generation ─────────────────────────────────────

function generatePrioritizedActions(
  liveAudit: LiveAuditResult,
  goals: GoalEvaluation[],
  agents: AgentPerformanceReport,
  research: ResearchReport | null
): PrioritizedAction[] {
  const actions: PrioritizedAction[] = [];
  let actionId = 0;

  // Critical: broken sitemap URLs
  if (liveAudit.sitemapHealth.broken > 0) {
    actions.push({
      id: `action-${actionId++}`,
      title: "Fix broken sitemap URLs",
      description: `${liveAudit.sitemapHealth.broken} URLs in sitemap return non-200. Top: ${liveAudit.sitemapHealth.brokenUrls
        .slice(0, 3)
        .map((u) => `${u.url}→${u.status}`)
        .join(", ")}`,
      priority: 0,
      category: "fix",
      ownerAgent: "live-site-auditor",
      estimatedImpact: "critical",
      automated: false,
    });
  }

  // Critical: robots.txt conflicts
  if (liveAudit.robotsConflicts.conflicts.length > 0) {
    actions.push({
      id: `action-${actionId++}`,
      title: "Resolve robots.txt conflicts",
      description: `${liveAudit.robotsConflicts.conflicts.length} conflicting rules detected. ${liveAudit.robotsConflicts.aiCrawlersBlocked.length} AI crawlers blocked.`,
      priority: 0,
      category: "fix",
      ownerAgent: "live-site-auditor",
      estimatedImpact: "critical",
      automated: false,
    });
  }

  // Critical: broken schema URLs
  if (liveAudit.schemaValidation.brokenSchemaUrls.length > 0) {
    actions.push({
      id: `action-${actionId++}`,
      title: "Fix broken URLs in structured data",
      description: `${liveAudit.schemaValidation.brokenSchemaUrls.length} URLs in JSON-LD schemas return errors`,
      priority: 1,
      category: "fix",
      ownerAgent: "seo-agent",
      estimatedImpact: "high",
      automated: false,
    });
  }

  // High: stalled agents
  for (const agent of agents.agents) {
    if (agent.health === "stalled" || agent.health === "failing") {
      actions.push({
        id: `action-${actionId++}`,
        title: `Investigate ${agent.name}`,
        description: agent.issues.join("; "),
        priority: 1,
        category: "fix",
        ownerAgent: "seo-orchestrator",
        estimatedImpact: "high",
        automated: false,
      });
    }
  }

  // High: CSR bailouts
  if (liveAudit.renderingCheck.csrBailouts.length > 0) {
    actions.push({
      id: `action-${actionId++}`,
      title: "Fix client-side rendering bailouts",
      description: `${liveAudit.renderingCheck.csrBailouts.length} pages fall back to CSR, hurting crawler visibility`,
      priority: 2,
      category: "optimize",
      ownerAgent: "live-site-auditor",
      estimatedImpact: "high",
      automated: false,
    });
  }

  // Medium: low cache hit rate
  if (liveAudit.cdnPerformance.hitRate < 50) {
    actions.push({
      id: `action-${actionId++}`,
      title: "Improve CDN cache hit rate",
      description: `Cache hit rate is ${liveAudit.cdnPerformance.hitRate}% — target >50%`,
      priority: 3,
      category: "optimize",
      ownerAgent: "live-site-auditor",
      estimatedImpact: "medium",
      automated: false,
    });
  }

  // Business goal-driven actions
  for (const goal of goals) {
    if (
      goal.overallStatus === "critical" ||
      goal.overallStatus === "behind"
    ) {
      for (const kpi of goal.kpiResults) {
        if (kpi.status === "critical" || kpi.status === "behind") {
          actions.push({
            id: `action-${actionId++}`,
            title: `Improve ${kpi.kpi.name}`,
            description: `Current: ${kpi.currentValue ?? "unknown"} ${kpi.kpi.unit}, Target (30d): ${kpi.kpi.target30d}`,
            priority:
              kpi.status === "critical" ? 1 : 3,
            category: "optimize",
            ownerAgent: goal.goal.ownerAgent,
            estimatedImpact:
              kpi.status === "critical" ? "critical" : "medium",
            automated: false,
          });
        }
      }
    }
  }

  // Research-driven actions
  if (research) {
    for (const finding of research.findings.filter(
      (f) => f.priority === "critical" || f.priority === "high"
    )) {
      actions.push({
        id: `action-${actionId++}`,
        title: finding.title,
        description: finding.actionableInsights.join("; "),
        priority: finding.priority === "critical" ? 2 : 4,
        category: "research",
        ownerAgent: finding.affectedAgents[0] || "seo-orchestrator",
        estimatedImpact: finding.priority === "critical" ? "high" : "medium",
        automated: false,
      });
    }
  }

  return actions.sort((a, b) => a.priority - b.priority);
}

// ── Agent Directive Generation ────────────────────────────────────────

function generateAgentDirectives(
  liveAudit: LiveAuditResult,
  goals: GoalEvaluation[],
  agents: AgentPerformanceReport
): AgentDirective[] {
  const directives: AgentDirective[] = [];

  // Direct the SEO agent based on audit findings
  if (liveAudit.sitemapHealth.broken > 0) {
    directives.push({
      agentId: "seo-agent",
      directive:
        "PRIORITY: Verify all sitemap URLs return 200 before submitting to IndexNow. " +
        "Skip broken URLs to avoid wasting crawl budget.",
      priority: "urgent",
      context: `${liveAudit.sitemapHealth.broken} broken URLs detected in sitemap`,
    });
  }

  if (liveAudit.robotsConflicts.aiCrawlersBlocked.length > 0) {
    directives.push({
      agentId: "seo-agent",
      directive:
        "ALERT: AI crawlers are being blocked by robots.txt. " +
        "Do not submit URLs to AI search engines until this is resolved. " +
        "Blocked: " +
        liveAudit.robotsConflicts.aiCrawlersBlocked.join(", "),
      priority: "urgent",
      context: "Cloudflare may be injecting blocking rules",
    });
  }

  // Direct content generator based on goals
  const contentGoal = goals.find((g) => g.goal.id === "content_quality");
  if (contentGoal?.overallStatus === "critical") {
    directives.push({
      agentId: "content-generator",
      directive:
        "INCREASE OUTPUT: Content quality metrics are critical. " +
        "Ensure all generated content has SEO score >70 before publishing.",
      priority: "urgent",
      context: "Content quality goal is in critical state",
    });
  }

  // Alert for stalled agents
  for (const agent of agents.agents) {
    if (agent.health === "stalled") {
      directives.push({
        agentId: agent.agentId,
        directive: `STALLED: This agent has not run in expected timeframe. Issues: ${agent.issues.join("; ")}`,
        priority: "urgent",
        context: `Last run: ${agent.lastRun || "never"}`,
      });
    }
  }

  return directives;
}

// ── Health Score Calculation ──────────────────────────────────────────

function calculateOverallHealth(
  liveAudit: LiveAuditResult,
  goals: GoalEvaluation[],
  agents: AgentPerformanceReport
): number {
  let score = 100;

  // Live audit (40% weight)
  score -= liveAudit.criticalIssues.length * 8;
  score -= liveAudit.warnings.length * 3;

  // Business goals (35% weight)
  const criticalGoals = goals.filter(
    (g) => g.overallStatus === "critical"
  ).length;
  const behindGoals = goals.filter(
    (g) => g.overallStatus === "behind"
  ).length;
  score -= criticalGoals * 10;
  score -= behindGoals * 5;

  // Agent performance (25% weight)
  if (agents.overallHealth === "critical") score -= 15;
  if (agents.overallHealth === "degraded") score -= 8;

  return Math.max(0, Math.min(100, score));
}

// ── Metric Collection ─────────────────────────────────────────────────

async function collectCurrentMetrics(
  prisma: any,
  siteId: string
): Promise<Record<string, number>> {
  const metrics: Record<string, number> = {};
  const siteFilter = siteId ? { siteId } : {};
  const topicSiteFilter = siteId ? { site_id: siteId } : {};

  try {
    // Published posts
    const totalPosts = await prisma.blogPost.count({
      where: { published: true, ...siteFilter },
    });
    metrics.total_posts = totalPosts;

    // Average SEO score
    const avgScore = await prisma.blogPost.aggregate({
      where: { published: true, seo_score: { not: null }, ...siteFilter },
      _avg: { seo_score: true },
    });
    metrics.avg_seo_score = Math.round(avgScore._avg?.seo_score || 0);

    // Arabic content ratio
    const arPosts = await prisma.blogPost.count({
      where: { published: true, content_ar: { not: "" }, ...siteFilter },
    });
    metrics.ar_content_ratio =
      totalPosts > 0 ? Math.round((arPosts / totalPosts) * 100) : 0;

    // Posts published this week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    metrics.published_this_week = await prisma.blogPost.count({
      where: {
        published: true,
        created_at: { gte: weekAgo },
        ...siteFilter,
      },
    });

    // Pending proposals
    metrics.pending_proposals = await prisma.topicProposal.count({
      where: {
        status: { in: ["planned", "queued", "ready", "approved"] },
        ...topicSiteFilter,
      },
    });

    // Indexed pages (from URLIndexingStatus)
    try {
      metrics.indexed_pages = await prisma.uRLIndexingStatus.count({
        where: { status: "indexed" },
      });
    } catch {
      metrics.indexed_pages = 0;
    }
  } catch {
    // DB queries failed — return what we have
  }

  return metrics;
}

// ── Default Results ───────────────────────────────────────────────────

function createDefaultAudit(): LiveAuditResult {
  return {
    sitemapHealth: {
      totalUrls: 0, totalSitemapUrls: 0, healthy: 0, broken: 0, redirected: 0, slow: 0,
      brokenUrls: [], avgLatencyMs: 0,
    },
    schemaValidation: {
      pagesChecked: 0, schemasFound: 0, urlsInSchemas: 0,
      brokenSchemaUrls: [], valid: true,
    },
    robotsConflicts: {
      fetched: false, conflicts: [], aiCrawlersBlocked: [],
      aiCrawlersAllowed: [], hasCloudflareInjection: false,
    },
    cdnPerformance: {
      sampledUrls: 0, hits: 0, misses: 0, hitRate: 0, avgTTFBMs: 0,
    },
    renderingCheck: {
      pagesChecked: 0, csrBailouts: [], missingContent: [],
    },
    timestamp: new Date().toISOString(),
    overallScore: 0,
    criticalIssues: ["Live audit could not run"],
    warnings: [],
    fixes: [],
  };
}

function createDefaultAgentReport(): AgentPerformanceReport {
  return {
    agents: [],
    overallHealth: "critical",
    timestamp: new Date().toISOString(),
    recommendations: ["Could not analyze agent performance — check database connectivity"],
  };
}

// Re-export sub-modules
export { runLiveSiteAudit } from "./live-site-auditor";
export { runPrePublicationGate } from "./pre-publication-gate";
export { runWeeklyResearch, getRecentFindings } from "./weekly-research-agent";
export { analyzeAgentPerformance } from "./agent-performance-monitor";
export { evaluateGoals, BUSINESS_GOALS } from "./business-goals";
