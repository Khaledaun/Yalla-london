/**
 * Progressive Audit System
 *
 * 3 audit levels with auto-escalation:
 *  - Level 1 (Quick): general + security → ~5s, daily/on-demand
 *  - Level 2 (Full):  all 9 groups → ~30s, weekly
 *  - Level 3 (Deep):  full + schema + content quality + SEO compliance → ~50s, monthly
 *
 * If Quick finds failures → suggests Full.
 * If Full finds failures → suggests Deep.
 */

import { runDiagnosticGroups } from "./runner";
import type { DiagnosticRunResult, DiagnosticResult } from "./types";

export type AuditLevel = 1 | 2 | 3;

interface AuditLevelConfig {
  name: string;
  groups: string[];
  budgetMs: number;
  cadence: string;
}

const AUDIT_LEVELS: Record<AuditLevel, AuditLevelConfig> = {
  1: {
    name: "Quick",
    groups: ["general", "security"],
    budgetMs: 8_000,
    cadence: "Daily / on-demand",
  },
  2: {
    name: "Full",
    groups: ["general", "pipeline", "indexing", "seo", "crons", "yachts", "commerce", "security", "ai-costs"],
    budgetMs: 40_000,
    cadence: "Weekly",
  },
  3: {
    name: "Deep",
    groups: ["general", "pipeline", "indexing", "seo", "crons", "yachts", "commerce", "security", "ai-costs"],
    budgetMs: 50_000,
    cadence: "Monthly",
  },
};

export interface ProgressiveAuditResult {
  level: AuditLevel;
  levelName: string;
  result: DiagnosticRunResult;
  escalation: {
    shouldEscalate: boolean;
    reason: string | null;
    suggestedLevel: AuditLevel | null;
  };
  summary: string;
}

/**
 * Run a progressive audit at the specified level.
 * Returns results + escalation recommendation.
 */
export async function runProgressiveAudit(
  level: AuditLevel,
  siteId: string,
): Promise<ProgressiveAuditResult> {
  const config = AUDIT_LEVELS[level];
  const startTime = Date.now();

  const result = await runDiagnosticGroups(
    config.groups,
    siteId,
    config.budgetMs,
    startTime,
  );

  // Determine escalation
  const escalation = computeEscalation(level, result.results);

  const durationMs = Date.now() - startTime;

  // Build summary
  const summary = buildSummary(level, config, result, durationMs);

  return {
    level,
    levelName: config.name,
    result,
    escalation,
    summary,
  };
}

function computeEscalation(
  level: AuditLevel,
  results: DiagnosticResult[],
): { shouldEscalate: boolean; reason: string | null; suggestedLevel: AuditLevel | null } {
  const failures = results.filter((r) => r.status === "fail");
  const warnings = results.filter((r) => r.status === "warn");

  if (level === 1) {
    // Quick → Full if any failures
    if (failures.length > 0) {
      return {
        shouldEscalate: true,
        reason: `${failures.length} failure(s) found in quick scan. Run a full audit to check all systems.`,
        suggestedLevel: 2,
      };
    }
    if (warnings.length > 3) {
      return {
        shouldEscalate: true,
        reason: `${warnings.length} warnings found. Consider a full audit.`,
        suggestedLevel: 2,
      };
    }
  }

  if (level === 2) {
    // Full → Deep if critical failures
    if (failures.length > 2) {
      return {
        shouldEscalate: true,
        reason: `${failures.length} failure(s) across full audit. Deep audit recommended for thorough investigation.`,
        suggestedLevel: 3,
      };
    }
  }

  return { shouldEscalate: false, reason: null, suggestedLevel: null };
}

function buildSummary(
  level: AuditLevel,
  config: AuditLevelConfig,
  result: DiagnosticRunResult,
  durationMs: number,
): string {
  const total = result.results.length;
  const passCount = result.results.filter((r) => r.status === "pass").length;
  const warnCount = result.results.filter((r) => r.status === "warn").length;
  const failCount = result.results.filter((r) => r.status === "fail").length;
  const healthScore = total > 0 ? Math.round(((passCount + warnCount * 0.5) / total) * 100) : 0;
  const verdict =
    failCount === 0 && warnCount === 0
      ? "ALL_SYSTEMS_GO"
      : failCount === 0
        ? "OPERATIONAL"
        : failCount <= 2
          ? "NEEDS_ATTENTION"
          : "CRITICAL";

  const lines: string[] = [];
  lines.push(`## ${config.name} Audit (Level ${level})`);
  lines.push(`**Date:** ${new Date().toISOString().slice(0, 19).replace("T", " ")} UTC`);
  lines.push(`**Groups:** ${config.groups.join(", ")}`);
  lines.push(`**Duration:** ${durationMs}ms`);
  lines.push("");
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total tests | ${total} |`);
  lines.push(`| Passed | ${passCount} |`);
  lines.push(`| Warnings | ${warnCount} |`);
  lines.push(`| Failed | ${failCount} |`);
  lines.push(`| Health Score | ${healthScore}/100 |`);
  lines.push(`| Verdict | ${verdict} |`);
  lines.push("");

  // List failures
  const failures = result.results.filter((r) => r.status === "fail");
  if (failures.length > 0) {
    lines.push("### Failures");
    for (const f of failures) {
      lines.push(`- **${f.name}** (${f.section}): ${f.detail}`);
      if (f.diagnosis) lines.push(`  - Diagnosis: ${f.diagnosis}`);
    }
    lines.push("");
  }

  // List warnings
  const warnItems = result.results.filter((r) => r.status === "warn");
  if (warnItems.length > 0) {
    lines.push("### Warnings");
    for (const w of warnItems) {
      lines.push(`- **${w.name}** (${w.section}): ${w.detail}`);
    }
  }

  return lines.join("\n");
}

export function getAuditLevelConfig(level: AuditLevel): AuditLevelConfig {
  return AUDIT_LEVELS[level];
}

export function getAllAuditLevels(): Array<AuditLevelConfig & { level: AuditLevel }> {
  return [
    { ...AUDIT_LEVELS[1], level: 1 },
    { ...AUDIT_LEVELS[2], level: 2 },
    { ...AUDIT_LEVELS[3], level: 3 },
  ];
}
