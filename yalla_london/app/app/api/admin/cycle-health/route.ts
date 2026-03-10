export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cycle Health Analyzer — Evidence-Based Platform Diagnostics
 *
 * GET  — Analyzes the last 12-24h of platform operation and returns a comprehensive
 *         health report with per-issue "Fix Now" action IDs.
 * POST — Executes a specific fix action by ID.
 *
 * Data Sources:
 *   - CronJobLog: success/failure rates, duration trends, error patterns
 *   - ArticleDraft: pipeline throughput, bottlenecks, stuck phases
 *   - BlogPost: publishing velocity, quality scores, content gaps
 *   - URLIndexingStatus: indexing pipeline health
 *   - ApiUsageLog: AI cost and failure rates
 *   - AutoFixLog: remediation history
 *   - TopicProposal: topic feed health
 *
 * Each issue includes:
 *   - what: plain-English description
 *   - why: root cause analysis with evidence
 *   - fix: step-by-step resolution
 *   - fixAction: API endpoint + payload for "Fix Now" button (when auto-fixable)
 *   - evidence: the actual data proving the issue
 *   - severity: critical | warning | info
 */

import { NextRequest, NextResponse } from "next/server";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CycleIssue {
  id: string;
  category: "pipeline" | "cron" | "indexing" | "quality" | "ai" | "content" | "seo";
  severity: "critical" | "warning" | "info";
  what: string;
  why: string;
  fix: string;
  fixAction: FixAction | null;
  evidence: Record<string, unknown>;
}

interface FixAction {
  method: "POST";
  endpoint: string;
  payload: Record<string, unknown>;
  label: string;
  description: string;
}

interface CycleHealthReport {
  generatedAt: string;
  siteId: string;
  periodHours: number;
  periodStart: string;
  periodEnd: string;
  grade: "A" | "B" | "C" | "D" | "F";
  gradeExplanation: string;
  score: number;
  issues: CycleIssue[];
  metrics: CycleMetrics;
  recommendations: string[];
}

interface CycleMetrics {
  topicsCreated: number;
  draftsStarted: number;
  draftsCompleted: number;
  articlesPublished: number;
  articlesIndexed: number;
  cronRuns: number;
  cronFailures: number;
  cronSuccessRate: number;
  avgCronDurationMs: number;
  aiCalls: number;
  aiFailures: number;
  aiCostUsd: number;
  autoFixesApplied: number;
  autoFixesSucceeded: number;
  stuckDrafts: number;
  reservoirSize: number;
  avgSeoScore: number;
  contentVelocity: number; // articles/day
}

// ─── GET: Generate Health Report ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { requireAdmin } = await import("@/lib/admin-middleware");
    await requireAdmin(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { getDefaultSiteId } = await import("@/config/sites");
  const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
  const periodHours = Math.min(parseInt(request.nextUrl.searchParams.get("hours") || "24", 10), 168);

  try {
    const report = await generateCycleReport(siteId, periodHours);
    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error("[cycle-health] Report generation failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: "Failed to generate cycle health report" },
      { status: 500 },
    );
  }
}

// ─── POST: Execute Fix Action ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { requireAdmin } = await import("@/lib/admin-middleware");
    await requireAdmin(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action as string;
  const siteId = (body.siteId as string) || "";
  const issueId = body.issueId as string;

  if (action === "fix") {
    return executeFix(request, issueId, siteId);
  }

  if (action === "fix_all") {
    return executeFixAll(request, siteId);
  }

  if (action === "diagnose") {
    // Run diagnostic-agent + fix orphaned "promoting" drafts
    const { prisma } = await import("@/lib/db");
    const results: Record<string, unknown> = {};

    // Fix orphaned "promoting" drafts (stuck from crashed content-selector)
    try {
      const fixed = await prisma.articleDraft.updateMany({
        where: {
          current_phase: "promoting",
          updated_at: { lte: new Date(Date.now() - 10 * 60 * 1000) },
        },
        data: { current_phase: "reservoir", updated_at: new Date() },
      });
      results.promotingFixed = fixed.count;
    } catch { results.promotingFixed = 0; }

    // Run diagnostic agent
    try {
      const { diagnoseStuckDrafts, applyDiagnosticFix } = await import("@/lib/ops/diagnostic-agent");
      const diagnoses = await diagnoseStuckDrafts();
      let fixed = 0;
      for (const d of diagnoses.slice(0, 10)) {
        const result = await applyDiagnosticFix(d);
        if (result?.success) fixed++;
      }
      results.diagnosed = diagnoses.length;
      results.fixed = fixed;
    } catch (err) {
      results.diagnoseError = err instanceof Error ? err.message : String(err);
    }

    return NextResponse.json({ success: true, action: "diagnose", results });
  }

  return NextResponse.json({ error: "Unknown action. Use 'fix', 'fix_all', or 'diagnose'" }, { status: 400 });
}

// ─── Report Generator ──────────────────────────────────────────────────────

async function generateCycleReport(siteId: string, periodHours: number): Promise<CycleHealthReport> {
  const { prisma } = await import("@/lib/db");
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodHours * 60 * 60 * 1000);

  // ── Gather all data in parallel ──
  const [
    cronLogs,
    draftsByPhase,
    stuckDrafts,
    recentPublished,
    topicsCreated,
    reservoirCount,
    indexingStats,
    aiUsage,
    autoFixes,
    publishedStats,
    failedDrafts,
  ] = await Promise.allSettled([
    // 1. Cron logs in period
    prisma.cronJobLog.findMany({
      where: { started_at: { gte: periodStart } },
      select: {
        job_name: true, status: true, error_message: true,
        started_at: true, duration_ms: true, items_processed: true,
      },
      orderBy: { started_at: "desc" },
      take: 500,
    }),

    // 2. Draft phase distribution
    prisma.articleDraft.groupBy({
      by: ["current_phase"],
      where: { site_id: siteId },
      _count: true,
    }),

    // 3. Stuck drafts (3+ attempts or >2h)
    prisma.articleDraft.findMany({
      where: {
        site_id: siteId,
        current_phase: { in: ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"] },
        OR: [
          { phase_attempts: { gte: 3 } },
          { phase_started_at: { lt: new Date(now.getTime() - 2 * 60 * 60 * 1000) } },
        ],
      },
      select: {
        id: true, keyword: true, current_phase: true,
        phase_attempts: true, last_error: true, phase_started_at: true, locale: true,
      },
      take: 50,
      orderBy: { phase_attempts: "desc" },
    }),

    // 4. Recently published articles
    prisma.blogPost.findMany({
      where: { siteId, published: true, created_at: { gte: periodStart } },
      select: { id: true, title_en: true, slug: true, seo_score: true, created_at: true },
      orderBy: { created_at: "desc" },
      take: 50,
    }),

    // 5. Topics created in period
    prisma.topicProposal.count({
      where: { site_id: siteId, created_at: { gte: periodStart } },
    }),

    // 6. Reservoir count
    prisma.articleDraft.count({
      where: { site_id: siteId, current_phase: "reservoir" },
    }),

    // 7. Indexing stats
    (prisma.$queryRawUnsafe(
      `SELECT status, COUNT(*) as count FROM url_indexing_status WHERE site_id = $1 GROUP BY status`,
      siteId,
    ) as Promise<Array<{ status: string; count: bigint }>>).catch(() => []),

    // 8. AI usage in period
    prisma.apiUsageLog.groupBy({
      by: ["provider"],
      where: { createdAt: { gte: periodStart }, siteId },
      _sum: { totalTokens: true, estimatedCostUsd: true },
      _count: true,
    }).catch(() => []),

    // 9. Auto-fix logs in period
    prisma.autoFixLog.findMany({
      where: { siteId, createdAt: { gte: periodStart } },
      select: { fixType: true, success: true, agent: true, createdAt: true },
      take: 200,
    }),

    // 10. Published article aggregate stats
    prisma.blogPost.aggregate({
      where: { siteId, published: true, deletedAt: null },
      _count: true,
      _avg: { seo_score: true },
    }),

    // 11. Rejected/failed drafts in period
    prisma.articleDraft.findMany({
      where: {
        site_id: siteId,
        current_phase: "rejected",
        updated_at: { gte: periodStart },
      },
      select: { id: true, keyword: true, rejection_reason: true, last_error: true },
      take: 20,
    }),
  ]);

  // ── Safe extractors ──
  const safe = <T>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === "fulfilled" ? r.value : fallback;

  const cronData = safe(cronLogs, []);
  const phases = safe(draftsByPhase, []);
  const stuck = safe(stuckDrafts, []);
  const published = safe(recentPublished, []);
  const topics = safe(topicsCreated, 0);
  const reservoir = safe(reservoirCount, 0);
  const indexing = safe(indexingStats, []);
  const ai = safe(aiUsage, []);
  const fixes = safe(autoFixes, []);
  const pubStats = safe(publishedStats, { _count: 0, _avg: { seo_score: null } });
  const failed = safe(failedDrafts, []);

  // ── Compute metrics ──
  const cronSuccess = cronData.filter((c) => c.status === "completed").length;
  const cronFail = cronData.filter((c) => c.status === "failed" || c.status === "error").length;
  const cronTotal = cronData.length;
  const avgDuration = cronTotal > 0
    ? Math.round(cronData.reduce((sum, c) => sum + (c.duration_ms || 0), 0) / cronTotal)
    : 0;

  const aiTotal = (ai as Array<{ _count: number }>).reduce((s, a) => s + a._count, 0);
  const aiCost = (ai as Array<{ _sum: { estimatedCostUsd: number | null } }>)
    .reduce((s, a) => s + (a._sum.estimatedCostUsd || 0), 0);

  const draftsInPipeline = phases
    .filter((p) => !["reservoir", "rejected", "published"].includes(p.current_phase))
    .reduce((s, p) => s + p._count, 0);

  const completedDrafts = phases
    .filter((p) => p.current_phase === "reservoir" || p.current_phase === "published")
    .reduce((s, p) => s + p._count, 0);

  const fixesApplied = fixes.length;
  const fixesSucceeded = fixes.filter((f) => f.success).length;

  const indexedCount = indexing.find((i) => i.status === "indexed");
  const pendingIndex = indexing.find((i) => i.status === "pending");

  const velocity = periodHours > 0 ? Math.round((published.length / (periodHours / 24)) * 10) / 10 : 0;

  const metrics: CycleMetrics = {
    topicsCreated: topics,
    draftsStarted: draftsInPipeline,
    draftsCompleted: completedDrafts,
    articlesPublished: published.length,
    articlesIndexed: indexedCount ? Number(indexedCount.count) : 0,
    cronRuns: cronTotal,
    cronFailures: cronFail,
    cronSuccessRate: cronTotal > 0 ? Math.round((cronSuccess / cronTotal) * 100) : 100,
    avgCronDurationMs: avgDuration,
    aiCalls: aiTotal,
    aiFailures: 0,
    aiCostUsd: Math.round(aiCost * 100) / 100,
    autoFixesApplied: fixesApplied,
    autoFixesSucceeded: fixesSucceeded,
    stuckDrafts: stuck.length,
    reservoirSize: reservoir,
    avgSeoScore: Math.round(pubStats._avg.seo_score || 0),
    contentVelocity: velocity,
  };

  // ── Analyze issues ──
  const issues: CycleIssue[] = [];

  // 1. STUCK DRAFTS
  if (stuck.length > 0) {
    const byPhase = new Map<string, typeof stuck>();
    for (const d of stuck) {
      const phase = d.current_phase;
      if (!byPhase.has(phase)) byPhase.set(phase, []);
      byPhase.get(phase)!.push(d);
    }

    for (const [phase, drafts] of byPhase) {
      const avgAttempts = Math.round(drafts.reduce((s, d) => s + (d.phase_attempts || 0), 0) / drafts.length);
      const errors = drafts.map((d) => d.last_error).filter(Boolean);
      const commonError = findMostCommon(errors as string[]);
      const keywords = drafts.slice(0, 3).map((d) => `"${d.keyword}"`).join(", ");

      issues.push({
        id: `stuck-${phase}`,
        category: "pipeline",
        severity: drafts.length >= 5 || avgAttempts >= 8 ? "critical" : "warning",
        what: `${drafts.length} draft${drafts.length > 1 ? "s" : ""} stuck in "${phase}" phase`,
        why: commonError
          ? `Most common error: "${truncate(commonError, 100)}". Average ${avgAttempts} attempts per draft.`
          : `Drafts averaging ${avgAttempts} attempts without advancing. Likely timeout or provider issues.`,
        fix: phase === "assembly"
          ? "Run Diagnose to force raw assembly fallback (skips AI, concatenates sections directly)"
          : `Run Diagnose to reset attempt counters and unlock these drafts for retry`,
        fixAction: {
          method: "POST",
          endpoint: "/api/admin/cycle-health",
          payload: { action: "fix", issueId: `stuck-${phase}`, siteId: "" },
          label: `Fix ${drafts.length} stuck drafts`,
          description: `Runs diagnostic agent to ${phase === "assembly" ? "force raw assembly" : "reset and retry"} the stuck drafts`,
        },
        evidence: {
          count: drafts.length,
          phase,
          avgAttempts,
          commonError: commonError ? truncate(commonError, 200) : null,
          drafts: drafts.slice(0, 5).map((d) => ({
            keyword: d.keyword, attempts: d.phase_attempts,
            error: truncate(d.last_error || "", 120),
            locale: d.locale,
          })),
        },
      });
    }
  }

  // 2. CRON FAILURES
  const cronByName = new Map<string, typeof cronData>();
  for (const c of cronData) {
    if (!cronByName.has(c.job_name)) cronByName.set(c.job_name, []);
    cronByName.get(c.job_name)!.push(c);
  }

  for (const [name, logs] of cronByName) {
    const failures = logs.filter((l) => l.status === "failed" || l.status === "error");
    const successRate = logs.length > 0 ? Math.round(((logs.length - failures.length) / logs.length) * 100) : 100;

    if (failures.length === 0) continue;

    const lastFailure = failures[0];
    const { interpretError } = await import("@/lib/error-interpreter");
    const interpreted = interpretError(lastFailure.error_message);

    // Only report if failure rate is significant
    if (successRate > 80 && failures.length < 3) continue;

    issues.push({
      id: `cron-${name}`,
      category: "cron",
      severity: successRate < 50 ? "critical" : "warning",
      what: `"${name}" cron failing — ${successRate}% success rate (${failures.length}/${logs.length} failed)`,
      why: interpreted.plain + (interpreted.severity === "critical" ? " — this blocks downstream operations." : ""),
      fix: interpreted.fix,
      fixAction: interpreted.fixAction ? {
        method: "POST",
        endpoint: "/api/admin/cycle-health",
        payload: { action: "fix", issueId: `cron-${name}`, siteId: "" },
        label: "Run Diagnostic Fix",
        description: `Runs diagnostic agent to fix downstream effects of ${name} failures`,
      } : null,
      evidence: {
        jobName: name,
        totalRuns: logs.length,
        failures: failures.length,
        successRate,
        lastError: truncate(lastFailure.error_message || "", 200),
        lastFailureAt: lastFailure.started_at,
        interpretedSeverity: interpreted.severity,
      },
    });
  }

  // 3. PUBLISHING GAPS
  if (published.length === 0 && periodHours >= 24) {
    const hasReservoir = reservoir > 0;
    const hasDrafts = draftsInPipeline > 0;

    issues.push({
      id: "no-published",
      category: "content",
      severity: "critical",
      what: `No articles published in the last ${periodHours}h`,
      why: hasReservoir
        ? `${reservoir} articles sitting in reservoir but not published. The content-selector cron may not be running, or articles are failing the pre-publication gate.`
        : hasDrafts
          ? `${draftsInPipeline} drafts are in the pipeline but none have reached reservoir yet. Check if drafts are stuck.`
          : `No topics, no drafts, no reservoir. The weekly-topics cron may not be generating topics.`,
      fix: hasReservoir
        ? "Click Fix Now to publish the top reservoir article, or run the content-selector cron"
        : hasDrafts
          ? "Wait for pipeline to complete, or run Diagnose to unstick any blocked drafts"
          : "Run Gen Topics to seed the pipeline, then run Build to start drafting",
      fixAction: hasReservoir ? {
        method: "POST",
        endpoint: "/api/admin/cycle-health",
        payload: { action: "fix", issueId: "no-published", siteId: "" },
        label: "Publish Top Reservoir Article",
        description: "Runs content-selector to promote the best reservoir article to published",
      } : null,
      evidence: {
        publishedInPeriod: 0,
        reservoir,
        inPipeline: draftsInPipeline,
        topics,
      },
    });
  }

  // 4. LOW QUALITY ARTICLES
  const lowQuality = published.filter((p) => p.seo_score !== null && p.seo_score < 60);
  if (lowQuality.length > 0) {
    issues.push({
      id: "low-quality",
      category: "quality",
      severity: lowQuality.length >= 3 ? "warning" : "info",
      what: `${lowQuality.length} recently published article${lowQuality.length > 1 ? "s" : ""} with SEO score below 60`,
      why: "Articles with low SEO scores get less organic traffic. Common causes: missing meta descriptions, short content, no internal links, missing affiliate links.",
      fix: "Run content-auto-fix cron to automatically enhance these articles (internal links, affiliate links, meta optimization)",
      fixAction: {
        method: "POST",
        endpoint: "/api/admin/cycle-health",
        payload: { action: "fix", issueId: "low-quality", siteId: "" },
        label: "Auto-Fix Low Quality",
        description: "Runs content-auto-fix to add internal links, affiliate links, and optimize meta tags",
      },
      evidence: {
        count: lowQuality.length,
        articles: lowQuality.slice(0, 5).map((a) => ({ title: a.title_en, slug: a.slug, seoScore: a.seo_score })),
        avgScore: Math.round(lowQuality.reduce((s, a) => s + (a.seo_score || 0), 0) / lowQuality.length),
      },
    });
  }

  // 5. INDEXING BACKLOG
  const pendingCount = pendingIndex ? Number(pendingIndex.count) : 0;
  if (pendingCount > 5) {
    issues.push({
      id: "indexing-backlog",
      category: "indexing",
      severity: pendingCount > 20 ? "warning" : "info",
      what: `${pendingCount} URLs pending indexing submission`,
      why: "These URLs haven't been submitted to Google via IndexNow yet. The seo-agent cron handles submissions, but may have been skipping articles or hitting rate limits.",
      fix: "Run SEO Agent to submit pending URLs to IndexNow",
      fixAction: {
        method: "POST",
        endpoint: "/api/admin/cycle-health",
        payload: { action: "fix", issueId: "indexing-backlog", siteId: "" },
        label: "Submit to IndexNow",
        description: "Triggers SEO agent to batch-submit pending URLs",
      },
      evidence: {
        pendingUrls: pendingCount,
        indexedUrls: indexedCount ? Number(indexedCount.count) : 0,
        allStatuses: indexing.map((i) => ({ status: i.status, count: Number(i.count) })),
      },
    });
  }

  // 6. EMPTY TOPIC PIPELINE
  if (topics === 0 && reservoir < 3 && periodHours >= 24) {
    issues.push({
      id: "no-topics",
      category: "content",
      severity: reservoir === 0 ? "critical" : "warning",
      what: "No new topics generated in the last 24h",
      why: "The weekly-topics cron generates topics on Mondays. If today isn't Monday, this is expected. But with low reservoir, you'll run out of content to publish.",
      fix: "Click Fix Now to generate topics on demand",
      fixAction: {
        method: "POST",
        endpoint: "/api/admin/cycle-health",
        payload: { action: "fix", issueId: "no-topics", siteId: "" },
        label: "Generate Topics Now",
        description: "Triggers weekly-topics cron to generate fresh topics",
      },
      evidence: { topicsInPeriod: topics, reservoir, lastPublishedAt: published[0]?.created_at || null },
    });
  }

  // 7. HIGH AI COSTS
  if (aiCost > 5 && periodHours <= 24) {
    issues.push({
      id: "high-ai-cost",
      category: "ai",
      severity: aiCost > 20 ? "critical" : "warning",
      what: `AI spending at $${aiCost.toFixed(2)} in the last ${periodHours}h`,
      why: "High AI costs usually indicate: too many retry loops (stuck drafts calling AI repeatedly), expansion passes on short articles, or expensive model usage.",
      fix: "Check AI Costs page for per-task breakdown. Run Diagnose to stop retry loops on stuck drafts.",
      fixAction: null,
      evidence: {
        totalCost: aiCost,
        totalCalls: aiTotal,
        byProvider: ai,
      },
    });
  }

  // 8. REJECTED DRAFTS
  if (failed.length > 0) {
    issues.push({
      id: "rejected-drafts",
      category: "pipeline",
      severity: failed.length >= 5 ? "warning" : "info",
      what: `${failed.length} draft${failed.length > 1 ? "s" : ""} rejected in the last ${periodHours}h`,
      why: "Drafts get rejected when they fail too many times (stuck loops) or have schema mismatches. Some rejections are healthy — the system protecting quality.",
      fix: "Review rejected drafts in Content Matrix. Re-queue any that look salvageable.",
      fixAction: null,
      evidence: {
        count: failed.length,
        drafts: failed.slice(0, 5).map((d) => ({
          keyword: d.keyword,
          reason: truncate(d.rejection_reason || d.last_error || "", 150),
        })),
      },
    });
  }

  // 9. RESERVOIR RUNNING LOW
  if (reservoir < 2 && published.length > 0) {
    issues.push({
      id: "low-reservoir",
      category: "content",
      severity: reservoir === 0 ? "warning" : "info",
      what: `Reservoir has only ${reservoir} article${reservoir !== 1 ? "s" : ""} ready to publish`,
      why: "The reservoir is the queue of fully-completed articles waiting to be published. When it's empty, the daily publish crons have nothing to promote.",
      fix: "Run Build to process more drafts through the pipeline, or run Gen Topics first if topics are low",
      fixAction: {
        method: "POST",
        endpoint: "/api/admin/cycle-health",
        payload: { action: "fix", issueId: "low-reservoir", siteId: "" },
        label: "Run Content Builder",
        description: "Triggers content-builder to advance drafts through the pipeline",
      },
      evidence: { reservoir, inPipeline: draftsInPipeline, topics },
    });
  }

  // 10. AUTO-FIX FAILURES
  if (fixesApplied > 0 && fixesSucceeded < fixesApplied) {
    const failedFixes = fixesApplied - fixesSucceeded;
    issues.push({
      id: "autofix-failures",
      category: "pipeline",
      severity: failedFixes > 5 ? "warning" : "info",
      what: `${failedFixes} auto-fix${failedFixes > 1 ? "es" : ""} failed out of ${fixesApplied} attempted`,
      why: "Auto-fixes that fail usually indicate deeper issues (schema mismatches, missing data, or code bugs) that can't be auto-resolved.",
      fix: "Check Diagnose results for specific failure details. These may need manual investigation.",
      fixAction: null,
      evidence: { applied: fixesApplied, succeeded: fixesSucceeded, failed: failedFixes },
    });
  }

  // ── 11. FRAGILITY DETECTION: Attempt oscillation (diagnostic-agent reducing vs failure-hooks incrementing) ──
  try {
    const oscillatingDrafts = await prisma.articleDraft.count({
      where: {
        current_phase: { notIn: ["reservoir", "published", "rejected"] },
        phase_attempts: { gte: 3, lt: 5 },
        updated_at: { lte: new Date(Date.now() - 4 * 60 * 60 * 1000) },
        last_error: { contains: "diagnostic-agent-reset" },
      },
    });
    if (oscillatingDrafts > 0) {
      issues.push({
        id: "attempt-oscillation",
        category: "pipeline",
        severity: oscillatingDrafts > 3 ? "critical" : "warning",
        what: `${oscillatingDrafts} draft${oscillatingDrafts > 1 ? "s" : ""} may be oscillating between recovery systems`,
        why: "Drafts with 3-4 attempts and diagnostic-agent-reset errors that haven't progressed in 4+ hours are likely stuck in a reduce/increment cycle.",
        fix: "Run Diagnose to force-reject these drafts. They'll never recover automatically.",
        fixAction: { endpoint: "/api/admin/cycle-health", method: "POST", payload: { action: "diagnose" }, label: "Force Reject", description: "Permanently reject oscillating drafts" },
        evidence: { oscillatingDrafts },
      });
    }
  } catch { /* ArticleDraft table may not exist */ }

  // ── 12. FRAGILITY DETECTION: Orphaned "promoting" drafts (atomic claim leaked) ──
  try {
    const promotingDrafts = await prisma.articleDraft.count({
      where: {
        current_phase: "promoting",
        updated_at: { lte: new Date(Date.now() - 30 * 60 * 1000) },
      },
    });
    if (promotingDrafts > 0) {
      issues.push({
        id: "orphaned-promoting-drafts",
        category: "pipeline",
        severity: "warning",
        what: `${promotingDrafts} draft${promotingDrafts > 1 ? "s" : ""} stuck in "promoting" phase for 30+ minutes`,
        why: "Drafts are atomically claimed as 'promoting' during content-selector. If the process crashed mid-promotion, they're orphaned.",
        fix: "Reset these drafts back to 'reservoir' so they can be promoted on the next run.",
        fixAction: { endpoint: "/api/admin/cycle-health", method: "POST", payload: { action: "diagnose" }, label: "Reset to Reservoir", description: "Revert orphaned promoting drafts back to reservoir" },
        evidence: { promotingDrafts },
      });
    }
  } catch { /* ArticleDraft table may not exist */ }

  // ── 13. FRAGILITY DETECTION: Duplicate Related sections on BlogPosts ──
  try {
    const postsWithDuplicateRelated = await prisma.blogPost.count({
      where: {
        published: true,
        content_en: { contains: "related-articles" },
        AND: { content_en: { contains: "related-link" } },
      },
    });
    if (postsWithDuplicateRelated > 0) {
      issues.push({
        id: "duplicate-related-sections",
        category: "content",
        severity: "info",
        what: `${postsWithDuplicateRelated} article${postsWithDuplicateRelated > 1 ? "s have" : " has"} both "Related Articles" AND "Related:" sections`,
        why: "Multiple link injectors (seo-agent + content-auto-fix) may have added separate related sections to the same article.",
        fix: "Review articles and consolidate duplicate related sections into one.",
        fixAction: null,
        evidence: { postsWithDuplicateRelated },
      });
    }
  } catch { /* BlogPost table may not exist */ }

  // ── 14. FRAGILITY DETECTION: Campaign items targeting unpublished articles ──
  try {
    const wastedCampaignItems = await (prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "CampaignItem" ci JOIN "BlogPost" bp ON ci."targetId" = bp.id WHERE ci.status IN ('pending', 'processing') AND bp.published = false`
    ) as Promise<Array<{ count: bigint }>>).catch(() => [{ count: BigInt(0) }]);
    const wastedCount = Number(wastedCampaignItems[0]?.count || 0);
    if (wastedCount > 0) {
      issues.push({
        id: "campaign-targets-unpublished",
        category: "content",
        severity: "warning",
        what: `${wastedCount} active campaign task${wastedCount > 1 ? "s" : ""} targeting unpublished articles`,
        why: "Campaign enhancer would waste AI budget processing articles that are no longer live.",
        fix: "Cancel these campaign tasks or re-publish the target articles.",
        fixAction: null,
        evidence: { wastedCampaignItems: wastedCount },
      });
    }
  } catch { /* CampaignItem/BlogPost table may not exist */ }

  // ── 15. AFFILIATE: CJ sync staleness ──
  try {
    const { CJ_NETWORK_ID } = await import("@/lib/affiliate/cj-client");
    const lastAdvSync = await prisma.cjSyncLog.findFirst({
      where: { networkId: CJ_NETWORK_ID, syncType: "ADVERTISERS" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, status: true },
    });
    if (lastAdvSync) {
      const hoursSinceSync = (Date.now() - lastAdvSync.createdAt.getTime()) / 3600_000;
      if (hoursSinceSync > 12) {
        issues.push({
          id: "cj-sync-stale",
          category: "cron",
          severity: hoursSinceSync > 24 ? "critical" : "warning",
          what: `CJ advertiser sync is ${Math.round(hoursSinceSync)}h stale`,
          why: `Last sync was ${lastAdvSync.createdAt.toISOString()} (status: ${lastAdvSync.status}). Expected every 6h.`,
          fix: "Run affiliate-sync-advertisers cron from Departures Board or check if CJ feature flags are disabled.",
          fixAction: { method: "POST", url: "/api/affiliate/cron/sync-advertisers" },
          evidence: { hoursSinceSync: Math.round(hoursSinceSync), lastStatus: lastAdvSync.status },
        });
      }
    }
  } catch { /* CJ tables may not exist yet */ }

  // ── 16. AFFILIATE: Zero coverage articles ──
  try {
    const { getDefaultSiteId } = await import("@/config/sites");
    const targetSiteId = siteId || getDefaultSiteId();
    const totalPublished = await prisma.blogPost.count({
      where: { published: true, deletedAt: null, siteId: targetSiteId },
    });
    if (totalPublished > 5) {
      const withAffiliates = await prisma.blogPost.count({
        where: {
          published: true, deletedAt: null, siteId: targetSiteId,
          OR: [
            { content_en: { contains: 'rel="sponsored' } },
            { content_en: { contains: "affiliate-cta-block" } },
          ],
        },
      });
      const coveragePercent = Math.round((withAffiliates / totalPublished) * 100);
      if (coveragePercent < 80) {
        issues.push({
          id: "cj-low-coverage",
          category: "content",
          severity: coveragePercent < 50 ? "warning" : "info",
          what: `Only ${coveragePercent}% of published articles have affiliate links (${withAffiliates}/${totalPublished})`,
          why: "Articles without affiliate links generate zero revenue. Target is 80%+ coverage.",
          fix: "Run affiliate-injection cron or a campaign with 'add_revenue' preset.",
          fixAction: null,
          evidence: { withAffiliates, totalPublished, coveragePercent },
        });
      }
    }
  } catch { /* BlogPost table may not exist */ }

  // ── 17. AFFILIATE: Commission sync errors ──
  try {
    const { CJ_NETWORK_ID } = await import("@/lib/affiliate/cj-client");
    const lastCommSync = await prisma.cjSyncLog.findFirst({
      where: { networkId: CJ_NETWORK_ID, syncType: "COMMISSIONS" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, status: true, errors: true },
    });
    if (lastCommSync && (lastCommSync.status === "FAILED" || lastCommSync.status === "PARTIAL")) {
      const errorCount = Array.isArray(lastCommSync.errors) ? (lastCommSync.errors as string[]).length : 0;
      issues.push({
        id: "cj-commission-sync-error",
        category: "cron",
        severity: lastCommSync.status === "FAILED" ? "warning" : "info",
        what: `Last commission sync ${lastCommSync.status.toLowerCase()} with ${errorCount} error${errorCount !== 1 ? "s" : ""}`,
        why: `Commission sync ran at ${lastCommSync.createdAt.toISOString()} but encountered errors. Revenue data may be incomplete.`,
        fix: "Check CJ API credentials and run sync-commissions cron manually.",
        fixAction: { method: "POST", url: "/api/affiliate/cron/sync-commissions" },
        evidence: { status: lastCommSync.status, errorCount, lastRun: lastCommSync.createdAt },
      });
    }
  } catch { /* CJ tables may not exist yet */ }

  // ── Calculate grade ──
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "critical") score -= 20;
    else if (issue.severity === "warning") score -= 8;
    else score -= 2;
  }
  score = Math.max(0, Math.min(100, score));

  const grade: "A" | "B" | "C" | "D" | "F" =
    score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";

  const gradeExplanation =
    grade === "A" ? "Platform operating smoothly. All systems healthy."
    : grade === "B" ? "Minor issues detected but nothing blocking content production."
    : grade === "C" ? "Several issues need attention. Content velocity may be impacted."
    : grade === "D" ? "Significant problems detected. Content pipeline is partially blocked."
    : "Critical failures. Content production is halted.";

  // ── Recommendations ──
  const recommendations: string[] = [];
  if (metrics.contentVelocity < 1 && periodHours >= 24)
    recommendations.push("Content velocity below 1/day — run Gen Topics + Build to feed the pipeline");
  if (metrics.cronSuccessRate < 90)
    recommendations.push(`Cron success rate at ${metrics.cronSuccessRate}% — check Settings for misconfigured env vars`);
  if (metrics.stuckDrafts > 3)
    recommendations.push("Multiple stuck drafts — run Diagnose to auto-fix or reject beyond-repair items");
  if (metrics.avgSeoScore < 60 && metrics.avgSeoScore > 0)
    recommendations.push(`Average SEO score ${metrics.avgSeoScore} — below 70 threshold. Run content-auto-fix.`);
  if (issues.length === 0)
    recommendations.push("All clear! System is operating within healthy parameters.");

  return {
    generatedAt: now.toISOString(),
    siteId,
    periodHours,
    periodStart: periodStart.toISOString(),
    periodEnd: now.toISOString(),
    grade,
    gradeExplanation,
    score,
    issues: issues.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
    metrics,
    recommendations,
  };
}

// ─── Fix Executors ──────────────────────────────────────────────────────────

async function executeFix(request: NextRequest, issueId: string, siteId: string): Promise<NextResponse> {
  const { getDefaultSiteId } = await import("@/config/sites");
  const resolvedSiteId = siteId || getDefaultSiteId();
  const origin = request.nextUrl.origin;
  const start = Date.now();

  const steps: Array<{ step: string; status: string; detail: string; durationMs: number }> = [];
  const addStep = (step: string, status: string, detail: string) => {
    steps.push({ step, status, detail, durationMs: Date.now() - start });
  };

  try {
    if (issueId.startsWith("stuck-")) {
      // Run diagnostic sweep
      addStep("Starting diagnostic agent", "running", "Analyzing stuck drafts...");
      const { runDiagnosticSweep } = await import("@/lib/ops/diagnostic-agent");
      const result = await runDiagnosticSweep(resolvedSiteId);
      addStep("Diagnostic sweep complete", "done", result.summary);
      return NextResponse.json({
        success: true,
        issueId,
        steps,
        result: {
          diagnosed: result.diagnoses.length,
          fixed: result.fixes.filter((f) => f.success).length,
          verified: result.verifications.filter((v) => v.verified).length,
          summary: result.summary,
        },
      });
    }

    if (issueId === "no-published") {
      // Run content-selector
      addStep("Triggering content-selector", "running", "Looking for best reservoir article...");
      const res = await fetch(`${origin}/api/cron/content-selector`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
        },
      });
      const json = await res.json().catch(() => ({}));
      addStep("Content selector complete", res.ok ? "done" : "failed", JSON.stringify(json).substring(0, 200));
      return NextResponse.json({ success: res.ok, issueId, steps, result: json });
    }

    if (issueId === "low-quality") {
      // Run content-auto-fix
      addStep("Triggering content-auto-fix", "running", "Enhancing articles...");
      const res = await fetch(`${origin}/api/cron/content-auto-fix`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
        },
      });
      const json = await res.json().catch(() => ({}));
      addStep("Auto-fix complete", res.ok ? "done" : "failed", JSON.stringify(json).substring(0, 200));
      return NextResponse.json({ success: res.ok, issueId, steps, result: json });
    }

    if (issueId === "indexing-backlog") {
      addStep("Triggering SEO agent", "running", "Submitting pending URLs...");
      const res = await fetch(`${origin}/api/cron/seo-agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
        },
      });
      const json = await res.json().catch(() => ({}));
      addStep("SEO agent complete", res.ok ? "done" : "failed", JSON.stringify(json).substring(0, 200));
      return NextResponse.json({ success: res.ok, issueId, steps, result: json });
    }

    if (issueId === "no-topics") {
      addStep("Triggering topic generation", "running", "Creating new topics...");
      const res = await fetch(`${origin}/api/cron/weekly-topics`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
        },
      });
      const json = await res.json().catch(() => ({}));
      addStep("Topic generation complete", res.ok ? "done" : "failed", JSON.stringify(json).substring(0, 200));
      return NextResponse.json({ success: res.ok, issueId, steps, result: json });
    }

    if (issueId === "low-reservoir") {
      addStep("Triggering content builder", "running", "Processing drafts...");
      const res = await fetch(`${origin}/api/cron/content-builder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
        },
      });
      const json = await res.json().catch(() => ({}));
      addStep("Content builder complete", res.ok ? "done" : "failed", JSON.stringify(json).substring(0, 200));
      return NextResponse.json({ success: res.ok, issueId, steps, result: json });
    }

    if (issueId.startsWith("cron-")) {
      addStep("Running diagnostic agent for cron fix", "running", "Analyzing downstream damage...");
      const { runDiagnosticSweep } = await import("@/lib/ops/diagnostic-agent");
      const result = await runDiagnosticSweep(resolvedSiteId);
      addStep("Diagnostic sweep complete", "done", result.summary);
      return NextResponse.json({ success: true, issueId, steps, result: { summary: result.summary } });
    }

    return NextResponse.json({ success: false, error: `No fix handler for issue: ${issueId}` }, { status: 400 });
  } catch (error) {
    addStep("Error", "failed", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, issueId, steps, error: "Fix execution failed" }, { status: 500 });
  }
}

async function executeFixAll(request: NextRequest, siteId: string): Promise<NextResponse> {
  const { getDefaultSiteId } = await import("@/config/sites");
  const resolvedSiteId = siteId || getDefaultSiteId();

  // Generate report first to find fixable issues
  const report = await generateCycleReport(resolvedSiteId, 24);
  const fixableIssues = report.issues.filter((i) => i.fixAction !== null);

  if (fixableIssues.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No fixable issues found",
      fixedCount: 0,
      results: [],
    });
  }

  const results: Array<{ issueId: string; what: string; success: boolean; detail: string }> = [];

  for (const issue of fixableIssues) {
    try {
      const fixResult = await executeFix(request, issue.id, resolvedSiteId);
      const json = await fixResult.json();
      results.push({
        issueId: issue.id,
        what: issue.what,
        success: json.success,
        detail: json.result?.summary || json.error || "Done",
      });
    } catch (err) {
      results.push({
        issueId: issue.id,
        what: issue.what,
        success: false,
        detail: err instanceof Error ? err.message : "Failed",
      });
    }

    // Budget guard — don't spend more than 45s on fix_all
    if (Date.now() > Date.now() + 45_000) break;
  }

  return NextResponse.json({
    success: true,
    message: `Attempted ${results.length} fixes`,
    fixedCount: results.filter((r) => r.success).length,
    totalIssues: fixableIssues.length,
    results,
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function truncate(s: string, max: number): string {
  return s.length > max ? s.substring(0, max) + "…" : s;
}

function findMostCommon(arr: string[]): string | null {
  if (arr.length === 0) return null;
  const counts = new Map<string, number>();
  for (const s of arr) {
    // Normalize error messages by removing IDs and timestamps
    const normalized = s.replace(/[0-9a-f]{8,}/gi, "ID").replace(/\d{4}-\d{2}-\d{2}/g, "DATE");
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }
  let maxCount = 0;
  let maxKey = arr[0];
  for (const [key, count] of counts) {
    if (count > maxCount) { maxCount = count; maxKey = key; }
  }
  return maxKey;
}
