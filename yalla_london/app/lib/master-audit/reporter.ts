/**
 * Master Audit Engine — Reporter
 *
 * Generates markdown reports from audit results:
 * - EXEC_SUMMARY.md: Overall pass/fail, hard gate results, issue counts, top issues
 * - FIX_PLAN.md: Issues grouped by root cause, systemic fixes, priority order
 */

import type { AuditRunResult, AuditIssue, IssueSeverity, IssueCategory } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(startTime: string, endTime: string): string {
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();
  const durationMs = endMs - startMs;

  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
  const mins = Math.floor(durationMs / 60000);
  const secs = Math.round((durationMs % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function severityEmoji(severity: IssueSeverity): string {
  switch (severity) {
    case 'P0': return 'CRITICAL';
    case 'P1': return 'HIGH';
    case 'P2': return 'LOW';
  }
}

function severityLabel(severity: IssueSeverity): string {
  switch (severity) {
    case 'P0': return 'P0 (Critical)';
    case 'P1': return 'P1 (High)';
    case 'P2': return 'P2 (Low)';
  }
}

function countBySeverity(
  issues: AuditIssue[]
): Record<IssueSeverity, number> {
  return {
    P0: issues.filter((i) => i.severity === 'P0').length,
    P1: issues.filter((i) => i.severity === 'P1').length,
    P2: issues.filter((i) => i.severity === 'P2').length,
  };
}

function countByCategory(
  issues: AuditIssue[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const issue of issues) {
    counts[issue.category] = (counts[issue.category] ?? 0) + 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// EXEC_SUMMARY.md
// ---------------------------------------------------------------------------

export function generateExecSummary(result: AuditRunResult): string {
  const lines: string[] = [];
  const severityCounts = countBySeverity(result.issues);
  const categoryCounts = countByCategory(result.issues);
  const allHardGatesPassed = result.hardGates.every((g) => g.passed);

  // Header
  lines.push(`# Master Audit — Executive Summary`);
  lines.push('');
  lines.push(`**Site:** ${result.siteId}`);
  lines.push(`**Run ID:** ${result.runId}`);
  lines.push(`**Mode:** ${result.mode}`);
  lines.push(`**Date:** ${new Date(result.startTime).toISOString().slice(0, 10)}`);
  lines.push(`**Duration:** ${formatDuration(result.startTime, result.endTime)}`);
  lines.push(`**URLs Audited:** ${result.totalUrls}`);
  lines.push('');

  // Overall verdict
  lines.push('---');
  lines.push('');
  if (allHardGatesPassed && severityCounts.P0 === 0) {
    lines.push('## Verdict: PASS');
    lines.push('');
    lines.push('All hard gates passed. No critical (P0) issues found.');
  } else if (!allHardGatesPassed) {
    lines.push('## Verdict: FAIL');
    lines.push('');
    lines.push(
      'One or more hard gates failed. Issues must be resolved before deployment.'
    );
  } else {
    lines.push('## Verdict: WARN');
    lines.push('');
    lines.push(
      `${severityCounts.P0} critical issues found. Hard gates passed but review recommended.`
    );
  }
  lines.push('');

  // Issue summary
  lines.push('---');
  lines.push('');
  lines.push('## Issue Summary');
  lines.push('');
  lines.push(`| Severity | Count |`);
  lines.push(`|----------|-------|`);
  lines.push(`| ${severityLabel('P0')} | ${severityCounts.P0} |`);
  lines.push(`| ${severityLabel('P1')} | ${severityCounts.P1} |`);
  lines.push(`| ${severityLabel('P2')} | ${severityCounts.P2} |`);
  lines.push(`| **Total** | **${result.issues.length}** |`);
  lines.push('');

  // Issues by category
  lines.push('## Issues by Category');
  lines.push('');
  lines.push(`| Category | Count |`);
  lines.push(`|----------|-------|`);
  const sortedCategories = Object.entries(categoryCounts).sort(
    ([, a], [, b]) => b - a
  );
  for (const [category, count] of sortedCategories) {
    lines.push(`| ${category} | ${count} |`);
  }
  lines.push('');

  // Hard gates
  lines.push('---');
  lines.push('');
  lines.push('## Hard Gates');
  lines.push('');
  lines.push(`| Gate | Status | Count | Threshold |`);
  lines.push(`|------|--------|-------|-----------|`);
  for (const gate of result.hardGates) {
    const status = gate.passed ? 'PASS' : 'FAIL';
    const threshold =
      gate.threshold === -1 ? 'unlimited' : String(gate.threshold);
    lines.push(
      `| ${gate.gateName} | ${status} | ${gate.count} | ${threshold} |`
    );
  }
  lines.push('');

  // Failed hard gate details
  const failedGates = result.hardGates.filter((g) => !g.passed);
  if (failedGates.length > 0) {
    lines.push('### Failed Gate Details');
    lines.push('');
    for (const gate of failedGates) {
      lines.push(`**${gate.gateName}** (${gate.count} issues, threshold: ${gate.threshold})`);
      lines.push('');
      for (const url of gate.urls.slice(0, 10)) {
        lines.push(`- ${url}`);
      }
      if (gate.urls.length > 10) {
        lines.push(`- ... and ${gate.urls.length - 10} more`);
      }
      lines.push('');
    }
  }

  // Soft gates
  if (result.softGates.length > 0) {
    lines.push('## Soft Gates (Informational)');
    lines.push('');
    for (const gate of result.softGates) {
      lines.push(`- **${gate.gateName}:** ${gate.count} items — ${gate.description}`);
    }
    lines.push('');
  }

  // Top issues (P0 and P1)
  const topIssues = result.issues
    .filter((i) => i.severity === 'P0' || i.severity === 'P1')
    .slice(0, 30);

  if (topIssues.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Top Issues');
    lines.push('');
    for (const issue of topIssues) {
      lines.push(
        `### [${severityEmoji(issue.severity)}] ${issue.category}: ${issue.message}`
      );
      lines.push('');
      lines.push(`- **URL:** ${issue.url}`);
      if (issue.evidence?.snippet) {
        lines.push(`- **Evidence:** \`${issue.evidence.snippet.slice(0, 200)}\``);
      }
      if (issue.suggestedFix) {
        lines.push(
          `- **Fix:** ${issue.suggestedFix.notes} (${issue.suggestedFix.scope})`
        );
      }
      lines.push('');
    }
  }

  // URL inventory summary
  lines.push('---');
  lines.push('');
  lines.push('## URL Inventory');
  lines.push('');
  const sourceBreakdown = {
    sitemap: result.urlInventory.filter((u) => u.source === 'sitemap').length,
    static: result.urlInventory.filter((u) => u.source === 'static').length,
    'ar-variant': result.urlInventory.filter((u) => u.source === 'ar-variant')
      .length,
  };
  lines.push(`| Source | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Sitemap | ${sourceBreakdown.sitemap} |`);
  lines.push(`| Static | ${sourceBreakdown.static} |`);
  lines.push(`| AR Variant | ${sourceBreakdown['ar-variant']} |`);
  lines.push(`| **Total** | **${result.urlInventory.length}** |`);
  lines.push('');

  // Footer
  lines.push('---');
  lines.push('');
  lines.push(
    `*Generated by Master Audit Engine at ${new Date(result.endTime).toISOString()}*`
  );

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// FIX_PLAN.md
// ---------------------------------------------------------------------------

export function generateFixPlan(result: AuditRunResult): string {
  const lines: string[] = [];

  lines.push(`# Master Audit — Fix Plan`);
  lines.push('');
  lines.push(`**Site:** ${result.siteId}`);
  lines.push(`**Run ID:** ${result.runId}`);
  lines.push(
    `**Generated:** ${new Date(result.endTime).toISOString().slice(0, 10)}`
  );
  lines.push(`**Total Issues:** ${result.issues.length}`);
  lines.push('');

  if (result.issues.length === 0) {
    lines.push('No issues found. The site passed all checks.');
    return lines.join('\n');
  }

  // ============================================================
  // Priority 1: P0 issues (Critical — fix immediately)
  // ============================================================

  const p0Issues = result.issues.filter((i) => i.severity === 'P0');
  if (p0Issues.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Priority 1: Critical Issues (P0) — Fix Immediately');
    lines.push('');
    lines.push(
      `${p0Issues.length} critical issue(s) that may block indexing or cause site failures.`
    );
    lines.push('');

    const p0ByCategory = groupByCategory(p0Issues);
    for (const [category, issues] of p0ByCategory) {
      lines.push(`### ${category.toUpperCase()}`);
      lines.push('');
      renderIssueGroup(lines, issues);
    }
  }

  // ============================================================
  // Priority 2: Systemic fixes (issues affecting multiple pages)
  // ============================================================

  const systemicIssues = result.issues.filter(
    (i) => i.suggestedFix?.scope === 'systemic'
  );
  const systemicGrouped = groupByFixTarget(systemicIssues);

  if (systemicGrouped.size > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Priority 2: Systemic Fixes (One Fix, Many Pages)');
    lines.push('');
    lines.push(
      'These issues share a root cause. Fixing the source resolves multiple issues at once.'
    );
    lines.push('');

    for (const [target, issues] of systemicGrouped) {
      const severities = countBySeverity(issues);
      const affectedUrls = [...new Set(issues.map((i) => i.url))];
      lines.push(`### Target: ${target}`);
      lines.push('');
      lines.push(`- **Affected pages:** ${affectedUrls.length}`);
      lines.push(
        `- **Issues:** ${severities.P0} P0, ${severities.P1} P1, ${severities.P2} P2`
      );
      if (issues[0]?.suggestedFix?.notes) {
        lines.push(`- **Fix:** ${issues[0].suggestedFix.notes}`);
      }
      lines.push('');
      lines.push('Affected URLs:');
      for (const url of affectedUrls.slice(0, 10)) {
        lines.push(`- ${url}`);
      }
      if (affectedUrls.length > 10) {
        lines.push(`- ... and ${affectedUrls.length - 10} more`);
      }
      lines.push('');
    }
  }

  // ============================================================
  // Priority 3: P1 page-level issues
  // ============================================================

  const p1PageLevel = result.issues.filter(
    (i) => i.severity === 'P1' && i.suggestedFix?.scope !== 'systemic'
  );
  if (p1PageLevel.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Priority 3: High-Priority Page-Level Issues (P1)');
    lines.push('');

    const p1ByCategory = groupByCategory(p1PageLevel);
    for (const [category, issues] of p1ByCategory) {
      lines.push(`### ${category.toUpperCase()}`);
      lines.push('');
      renderIssueGroup(lines, issues);
    }
  }

  // ============================================================
  // Priority 4: P2 issues (Low priority)
  // ============================================================

  const p2Issues = result.issues.filter((i) => i.severity === 'P2');
  if (p2Issues.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Priority 4: Low-Priority Issues (P2)');
    lines.push('');
    lines.push(`${p2Issues.length} low-priority issues. Address when time permits.`);
    lines.push('');

    const p2ByCategory = groupByCategory(p2Issues);
    for (const [category, issues] of p2ByCategory) {
      lines.push(`### ${category.toUpperCase()}`);
      lines.push('');
      // For P2, just list counts and sample
      lines.push(`${issues.length} issue(s):`);
      lines.push('');
      for (const issue of issues.slice(0, 5)) {
        lines.push(`- **${issue.url}**: ${issue.message}`);
      }
      if (issues.length > 5) {
        lines.push(`- ... and ${issues.length - 5} more`);
      }
      lines.push('');
    }
  }

  // ============================================================
  // Summary checklist
  // ============================================================

  lines.push('---');
  lines.push('');
  lines.push('## Fix Checklist');
  lines.push('');

  const allTargets = new Set<string>();
  for (const issue of result.issues) {
    if (issue.suggestedFix?.scope === 'systemic' && issue.suggestedFix.target) {
      allTargets.add(issue.suggestedFix.target);
    }
  }

  let checklistIndex = 0;
  if (p0Issues.length > 0) {
    lines.push(`${++checklistIndex}. [ ] Fix ${p0Issues.length} critical (P0) issues`);
  }
  for (const target of allTargets) {
    const count = systemicIssues.filter(
      (i) => i.suggestedFix?.target === target
    ).length;
    lines.push(`${++checklistIndex}. [ ] Fix systemic: ${target} (${count} issues)`);
  }
  if (p1PageLevel.length > 0) {
    lines.push(
      `${++checklistIndex}. [ ] Fix ${p1PageLevel.length} high-priority page-level issues`
    );
  }
  if (p2Issues.length > 0) {
    lines.push(`${++checklistIndex}. [ ] Review ${p2Issues.length} low-priority issues`);
  }
  lines.push(`${++checklistIndex}. [ ] Re-run audit to verify fixes`);
  lines.push('');

  // Footer
  lines.push('---');
  lines.push('');
  lines.push(
    `*Generated by Master Audit Engine at ${new Date(result.endTime).toISOString()}*`
  );

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Grouping helpers
// ---------------------------------------------------------------------------

function groupByCategory(
  issues: AuditIssue[]
): Map<IssueCategory, AuditIssue[]> {
  const map = new Map<IssueCategory, AuditIssue[]>();
  for (const issue of issues) {
    const list = map.get(issue.category) ?? [];
    list.push(issue);
    map.set(issue.category, list);
  }
  return map;
}

function groupByFixTarget(
  issues: AuditIssue[]
): Map<string, AuditIssue[]> {
  const map = new Map<string, AuditIssue[]>();
  for (const issue of issues) {
    const target = issue.suggestedFix?.target ?? 'Unknown';
    const list = map.get(target) ?? [];
    list.push(issue);
    map.set(target, list);
  }
  // Sort by issue count descending
  return new Map(
    [...map.entries()].sort(([, a], [, b]) => b.length - a.length)
  );
}

function renderIssueGroup(
  lines: string[],
  issues: AuditIssue[]
): void {
  for (const issue of issues) {
    lines.push(
      `- **[${issue.severity}]** ${issue.message}`
    );
    lines.push(`  - URL: ${issue.url}`);
    if (issue.evidence?.snippet) {
      lines.push(
        `  - Evidence: \`${issue.evidence.snippet.replace(/\n/g, ' ').slice(0, 150)}\``
      );
    }
    if (issue.suggestedFix) {
      lines.push(
        `  - Fix (${issue.suggestedFix.scope}): ${issue.suggestedFix.notes}`
      );
    }
    lines.push('');
  }
}
