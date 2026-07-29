/**
 * CTO Agent — 5-Phase Maintenance Loop
 *
 * Autonomous code quality monitoring, cron health checks, pipeline health
 * analysis, and documentation research.
 *
 * Phases: SCAN → BROWSE → PROPOSE → EXECUTE → REPORT
 *
 * Safety: Read-only in initial release. Auto-fix capability is intentionally
 * minimal — the EXECUTE phase logs proposals but does NOT modify code.
 */

import { createRegistry, CTO_TOOL_DEFS } from "./tool-registry";
import type { ToolContext, ToolResult } from "./types";
import type {
  CTOPhase,
  CTOFinding,
  CTOAction,
  CTOMaintenanceResult,
} from "./types";

// Tool handlers
import { repoReadFile, repoSearchCode, repoListFiles } from "./tools/repo";
import { qaRunTypecheck, qaRunSmokeTests, qaCheckCronHealth, qaCheckPipelineHealth } from "./tools/qa";
import { browsingFetch, browsingSearch } from "./tools/browsing";

// ---------------------------------------------------------------------------
// Phase Budgets (ms) — total should fit within the cron BUDGET_MS
// ---------------------------------------------------------------------------

const PHASE_BUDGETS: Record<CTOPhase, number> = {
  scan: 120_000,     // 2 min — typecheck, smoke tests, cron/pipeline health
  browse: 60_000,    // 1 min — research fixes via allow-listed docs
  propose: 30_000,   // 30s — classify and prioritize findings
  execute: 30_000,   // 30s — read-only in v1 (log proposals only)
  report: 20_000,    // 20s — write AgentTask record to DB
};

// ---------------------------------------------------------------------------
// Registry Setup — wire CTO tool definitions to actual handlers
// ---------------------------------------------------------------------------

const HANDLER_MAP: Record<string, (params: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>> = {
  read_file: repoReadFile,
  search_code: repoSearchCode,
  list_files: repoListFiles,
  run_typecheck: qaRunTypecheck,
  run_smoke_tests: qaRunSmokeTests,
  check_cron_health: qaCheckCronHealth,
  check_pipeline_health: qaCheckPipelineHealth,
  browsing_fetch: browsingFetch,
  browsing_search: browsingSearch,
};

function buildRegistry() {
  const registry = createRegistry();

  // Register all CTO tools from the centralized definitions
  for (const def of CTO_TOOL_DEFS) {
    const handler = HANDLER_MAP[def.name];
    if (handler) {
      registry.register(def, handler);
    }
  }

  return registry;
}

// ---------------------------------------------------------------------------
// Phase 1: SCAN — run quality checks
// ---------------------------------------------------------------------------

async function phaseScan(
  ctx: ToolContext,
  budgetMs: number,
): Promise<{ findings: CTOFinding[]; errors: string[] }> {
  const findings: CTOFinding[] = [];
  const errors: string[] = [];
  const start = Date.now();

  // 1a. TypeScript check
  try {
    const tcResult = await qaRunTypecheck({}, ctx);
    if (tcResult.success && tcResult.data) {
      const tc = tcResult.data as { errorCount: number; errors: Array<{ file: string; line: number; message: string }> };
      if (tc.errorCount > 0) {
        for (const err of tc.errors.slice(0, 20)) {
          findings.push({
            severity: "medium",
            category: "typescript",
            description: err.message,
            file: err.file,
            line: err.line,
            suggestion: "Fix TypeScript error",
            autoFixable: false,
          });
        }
        if (tc.errorCount > 20) {
          findings.push({
            severity: "high",
            category: "typescript",
            description: `${tc.errorCount} total TypeScript errors (showing first 20)`,
            autoFixable: false,
          });
        }
      }
    }
  } catch (err) {
    errors.push(`TypeCheck failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Budget check
  if (Date.now() - start > budgetMs - 10_000) {
    return { findings, errors };
  }

  // 1b. Smoke tests
  try {
    const stResult = await qaRunSmokeTests({}, ctx);
    if (stResult.success && stResult.data) {
      const st = stResult.data as { failed: number; warnings: number; details: Array<{ name: string; status: string; category?: string }> };
      if (st.failed > 0) {
        const failedTests = st.details.filter((d) => d.status === "FAIL");
        for (const test of failedTests.slice(0, 10)) {
          findings.push({
            severity: "high",
            category: "smoke_test",
            description: `Smoke test FAIL: ${test.name}`,
            suggestion: `Investigate and fix failing smoke test in ${test.category || "General"}`,
            autoFixable: false,
          });
        }
      }
      if (st.warnings > 0) {
        findings.push({
          severity: "low",
          category: "smoke_test",
          description: `${st.warnings} smoke test warnings`,
          autoFixable: false,
        });
      }
    }
  } catch (err) {
    errors.push(`Smoke tests failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Budget check
  if (Date.now() - start > budgetMs - 10_000) {
    return { findings, errors };
  }

  // 1c. Cron health
  try {
    const chResult = await qaCheckCronHealth({ hoursBack: 24 }, ctx);
    if (chResult.success && chResult.data) {
      const ch = chResult.data as { overallHealth: string; failingJobs: string[]; jobs: Array<{ jobName: string; failed: number; succeeded: number }> };
      if (ch.overallHealth === "critical") {
        findings.push({
          severity: "critical",
          category: "cron_health",
          description: `Cron health CRITICAL — ${ch.failingJobs.length} jobs failing: ${ch.failingJobs.join(", ")}`,
          suggestion: "Investigate failing cron jobs immediately",
          autoFixable: false,
        });
      } else if (ch.overallHealth === "degraded") {
        findings.push({
          severity: "medium",
          category: "cron_health",
          description: `Cron health degraded — ${ch.failingJobs.length} jobs failing: ${ch.failingJobs.join(", ")}`,
          suggestion: "Review failing cron job logs",
          autoFixable: false,
        });
      }
    }
  } catch (err) {
    errors.push(`Cron health check failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 1d. Pipeline health
  try {
    const phResult = await qaCheckPipelineHealth({}, ctx);
    if (phResult.success && phResult.data) {
      const ph = phResult.data as {
        health: string;
        stuckDrafts: number;
        reservoirSize: number;
        recentPublished: number;
        totalActiveDrafts: number;
      };
      if (ph.health === "critical" || ph.health === "stalled") {
        findings.push({
          severity: ph.health === "critical" ? "critical" : "high",
          category: "pipeline_health",
          description: `Pipeline ${ph.health}: ${ph.stuckDrafts} stuck drafts, ${ph.reservoirSize} in reservoir, ${ph.recentPublished} published (24h)`,
          suggestion: "Run diagnostic-sweep or check queue-monitor",
          autoFixable: false,
        });
      } else if (ph.health === "degraded") {
        findings.push({
          severity: "medium",
          category: "pipeline_health",
          description: `Pipeline degraded: ${ph.stuckDrafts} stuck drafts, reservoir=${ph.reservoirSize}`,
          suggestion: "Monitor pipeline — may self-heal",
          autoFixable: false,
        });
      }
    }
  } catch (err) {
    errors.push(`Pipeline health check failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { findings, errors };
}

// ---------------------------------------------------------------------------
// Phase 2: BROWSE — research fixes via allow-listed documentation
// ---------------------------------------------------------------------------

async function phaseBrowse(
  ctx: ToolContext,
  findings: CTOFinding[],
  budgetMs: number,
): Promise<{ researchNotes: string[]; errors: string[] }> {
  const researchNotes: string[] = [];
  const errors: string[] = [];

  // Only browse if there are medium+ findings worth researching
  const researchable = findings.filter(
    (f) =>
      (f.severity === "high" || f.severity === "critical") &&
      (f.category === "typescript" || f.category === "pipeline_health"),
  );

  if (researchable.length === 0) {
    researchNotes.push("No high-severity findings requiring documentation research.");
    return { researchNotes, errors };
  }

  const start = Date.now();

  // Research top 3 findings max
  for (const finding of researchable.slice(0, 3)) {
    if (Date.now() - start > budgetMs - 5_000) break;

    try {
      let query: string | null = null;

      // Build a search query based on the finding category
      if (finding.category === "typescript" && finding.description.includes("Type")) {
        query = `Next.js ${finding.description.slice(0, 80)}`;
      } else if (finding.category === "pipeline_health") {
        query = "Prisma query optimization stuck records";
      }

      if (query) {
        const result = await browsingSearch({ query }, ctx);
        if (result.success && result.data) {
          const data = result.data as { body?: string; url?: string };
          const snippet = data.body?.slice(0, 500) || "";
          researchNotes.push(
            `[${finding.category}] Researched: ${query}\n  URL: ${data.url || "N/A"}\n  Snippet: ${snippet}`,
          );
        }
      }
    } catch (err) {
      errors.push(`Browse research failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (researchNotes.length === 0) {
    researchNotes.push("Research attempted but no useful documentation found.");
  }

  return { researchNotes, errors };
}

// ---------------------------------------------------------------------------
// Phase 3: PROPOSE — classify and prioritize findings
// ---------------------------------------------------------------------------

function phasePropose(
  findings: CTOFinding[],
  researchNotes: string[],
): CTOAction[] {
  const actions: CTOAction[] = [];

  // Group findings by category
  const byCategory = new Map<string, CTOFinding[]>();
  for (const finding of findings) {
    const list = byCategory.get(finding.category) || [];
    list.push(finding);
    byCategory.set(finding.category, list);
  }

  // Generate proposals for each category
  for (const [category, categoryFindings] of byCategory) {
    const criticalCount = categoryFindings.filter((f) => f.severity === "critical").length;
    const highCount = categoryFindings.filter((f) => f.severity === "high").length;

    if (criticalCount > 0 || highCount > 0) {
      actions.push({
        type: "proposal",
        description: `[${category}] ${criticalCount} critical, ${highCount} high findings. Top issue: ${categoryFindings[0].description}`,
        file: categoryFindings[0].file,
        testsPassed: false,
      });
    } else {
      actions.push({
        type: "info_only",
        description: `[${category}] ${categoryFindings.length} findings (all low/medium severity)`,
        testsPassed: true,
      });
    }
  }

  // Add research notes as info
  if (researchNotes.length > 0 && researchNotes[0] !== "No high-severity findings requiring documentation research.") {
    actions.push({
      type: "info_only",
      description: `Documentation research completed: ${researchNotes.length} topic(s) investigated`,
      testsPassed: true,
    });
  }

  return actions;
}

// ---------------------------------------------------------------------------
// Phase 4: EXECUTE — auto-fix safe changes (READ-ONLY in v1)
// ---------------------------------------------------------------------------

function phaseExecute(
  actions: CTOAction[],
): { executedActions: CTOAction[]; errors: string[] } {
  // In v1, CTO Agent is READ-ONLY — no code modifications.
  // This phase logs what WOULD be auto-fixed in future versions.
  const executedActions: CTOAction[] = [];
  const errors: string[] = [];

  for (const action of actions) {
    if (action.type === "auto_fix") {
      // Future: implement safe auto-fixes here
      executedActions.push({
        ...action,
        description: `[SKIPPED — v1 read-only] ${action.description}`,
        testsPassed: false,
      });
    }
  }

  if (executedActions.length === 0) {
    executedActions.push({
      type: "info_only",
      description: "CTO Agent v1 is read-only — no auto-fix actions executed.",
      testsPassed: true,
    });
  }

  return { executedActions, errors };
}

// ---------------------------------------------------------------------------
// Phase 5: REPORT — write AgentTask record to DB
// ---------------------------------------------------------------------------

async function phaseReport(
  siteId: string,
  findings: CTOFinding[],
  actions: CTOAction[],
  errors: string[],
  durationMs: number,
): Promise<void> {
  try {
    const { prisma } = await import("@/lib/db");

    const criticalCount = findings.filter((f) => f.severity === "critical").length;
    const highCount = findings.filter((f) => f.severity === "high").length;

    await prisma.agentTask.create({
      data: {
        agentType: "cto",
        taskType: "maintenance",
        priority: criticalCount > 0 ? "critical" : highCount > 0 ? "high" : "medium",
        status: errors.length > 0 && findings.length === 0 ? "failed" : "completed",
        description: buildReportDescription(findings, actions, errors),
        input: { phase: "maintenance_loop", siteId },
        output: {
          findings: findings.map((f) => ({
            severity: f.severity,
            category: f.category,
            description: f.description,
            file: f.file || null,
            line: f.line || null,
            suggestion: f.suggestion || null,
            autoFixable: f.autoFixable,
          })),
          actions: actions.map((a) => ({
            type: a.type,
            description: a.description,
            file: a.file || null,
            testsPassed: a.testsPassed,
          })),
          errors,
        },
        changes: [],
        testsRun: ["typecheck", "smoke_tests", "cron_health", "pipeline_health"],
        findings: findings.map((f) => `[${f.severity}] ${f.category}: ${f.description}`),
        followUps: actions
          .filter((a) => a.type === "proposal")
          .map((a) => a.description),
        durationMs,
        siteId,
        assignedTo: "cto",
        completedAt: new Date(),
      },
    });
  } catch (err) {
    console.warn("[cto-brain] Failed to write AgentTask:", err instanceof Error ? err.message : String(err));
  }
}

function buildReportDescription(
  findings: CTOFinding[],
  actions: CTOAction[],
  errors: string[],
): string {
  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const mediumCount = findings.filter((f) => f.severity === "medium").length;
  const lowCount = findings.filter((f) => f.severity === "low" || f.severity === "info").length;
  const proposals = actions.filter((a) => a.type === "proposal").length;

  const parts: string[] = [
    `CTO Maintenance Report — ${new Date().toISOString().split("T")[0]}`,
    `Findings: ${criticalCount} critical, ${highCount} high, ${mediumCount} medium, ${lowCount} low/info`,
    `Proposals: ${proposals}`,
  ];

  if (errors.length > 0) {
    parts.push(`Errors during scan: ${errors.length}`);
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

/**
 * Run the full CTO maintenance loop for a given site.
 *
 * @param siteId - The site to analyze
 * @param budgetMs - Total time budget in milliseconds
 * @returns CTOMaintenanceResult with findings and actions
 */
export async function runCTOMaintenance(
  siteId: string,
  budgetMs: number,
): Promise<CTOMaintenanceResult> {
  const loopStart = Date.now();
  const allFindings: CTOFinding[] = [];
  const allActions: CTOAction[] = [];
  const allErrors: string[] = [];

  const ctx: ToolContext = {
    siteId,
    agentId: "cto",
  };

  // Ensure registry is built (validates tool wiring)
  buildRegistry();

  // --- Phase 1: SCAN ---
  const scanBudget = Math.min(PHASE_BUDGETS.scan, budgetMs * 0.45);
  try {
    const scanResult = await phaseScan(ctx, scanBudget);
    allFindings.push(...scanResult.findings);
    allErrors.push(...scanResult.errors);
  } catch (err) {
    allErrors.push(`SCAN phase crashed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Budget check
  const elapsed1 = Date.now() - loopStart;
  if (elapsed1 > budgetMs - 30_000) {
    await phaseReport(siteId, allFindings, allActions, allErrors, Date.now() - loopStart);
    return buildResult("scan", loopStart, allFindings, allActions, allErrors);
  }

  // --- Phase 2: BROWSE ---
  let researchNotes: string[] = [];
  const browseBudget = Math.min(PHASE_BUDGETS.browse, budgetMs - elapsed1 - 60_000);
  if (browseBudget > 10_000) {
    try {
      const browseResult = await phaseBrowse(ctx, allFindings, browseBudget);
      allErrors.push(...browseResult.errors);
      researchNotes = browseResult.researchNotes;
    } catch (err) {
      allErrors.push(`BROWSE phase crashed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Budget check
  const elapsed2 = Date.now() - loopStart;
  if (elapsed2 > budgetMs - 20_000) {
    await phaseReport(siteId, allFindings, allActions, allErrors, Date.now() - loopStart);
    return buildResult("browse", loopStart, allFindings, allActions, allErrors);
  }

  // --- Phase 3: PROPOSE ---
  try {
    const proposedActions = phasePropose(allFindings, researchNotes);
    allActions.push(...proposedActions);
  } catch (err) {
    allErrors.push(`PROPOSE phase crashed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // --- Phase 4: EXECUTE (read-only in v1) ---
  try {
    const executeResult = phaseExecute(allActions);
    allActions.push(...executeResult.executedActions);
    allErrors.push(...executeResult.errors);
  } catch (err) {
    allErrors.push(`EXECUTE phase crashed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // --- Phase 5: REPORT ---
  await phaseReport(siteId, allFindings, allActions, allErrors, Date.now() - loopStart);

  return buildResult("report", loopStart, allFindings, allActions, allErrors);
}

function buildResult(
  lastPhase: CTOPhase,
  startTime: number,
  findings: CTOFinding[],
  actions: CTOAction[],
  errors: string[],
): CTOMaintenanceResult {
  return {
    phase: lastPhase,
    durationMs: Date.now() - startTime,
    findings,
    actionsPerformed: actions,
    errors,
  };
}

// ---------------------------------------------------------------------------
// On-Demand Task Runner (for admin API)
// ---------------------------------------------------------------------------

/**
 * Run a specific CTO task type on demand (triggered via admin API).
 */
export async function runCTOTask(
  siteId: string,
  taskType: string,
  budgetMs: number,
): Promise<CTOMaintenanceResult> {
  const ctx: ToolContext = { siteId, agentId: "cto" };
  const start = Date.now();
  const findings: CTOFinding[] = [];
  const errors: string[] = [];

  buildRegistry();

  switch (taskType) {
    case "typecheck": {
      const result = await qaRunTypecheck({}, ctx);
      if (result.success && result.data) {
        const tc = result.data as { errorCount: number; passed: boolean };
        findings.push({
          severity: tc.passed ? "info" : "high",
          category: "typescript",
          description: tc.passed
            ? "TypeScript check passed with 0 errors"
            : `TypeScript check found ${tc.errorCount} errors`,
          autoFixable: false,
        });
      }
      break;
    }
    case "smoke_tests": {
      const result = await qaRunSmokeTests({}, ctx);
      if (result.success && result.data) {
        const st = result.data as { passed: number; failed: number; total: number };
        findings.push({
          severity: st.failed === 0 ? "info" : "high",
          category: "smoke_test",
          description: `Smoke tests: ${st.passed}/${st.total} passed, ${st.failed} failed`,
          autoFixable: false,
        });
      }
      break;
    }
    case "cron_health": {
      const result = await qaCheckCronHealth({ hoursBack: 24 }, ctx);
      if (result.success) {
        findings.push({
          severity: "info",
          category: "cron_health",
          description: result.summary || "Cron health check completed",
          autoFixable: false,
        });
      }
      break;
    }
    case "pipeline_health": {
      const result = await qaCheckPipelineHealth({}, ctx);
      if (result.success) {
        findings.push({
          severity: "info",
          category: "pipeline_health",
          description: result.summary || "Pipeline health check completed",
          autoFixable: false,
        });
      }
      break;
    }
    case "maintenance":
    default:
      return runCTOMaintenance(siteId, budgetMs);
  }

  return {
    phase: "report",
    durationMs: Date.now() - start,
    findings,
    actionsPerformed: [],
    errors,
  };
}
