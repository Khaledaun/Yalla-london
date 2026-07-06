/**
 * Perplexity Audit Report Generator
 *
 * Converts raw AuditReport into formatted Markdown for display and export.
 */

import type { AuditReport, AuditSection, AuditFinding } from "./perplexity-audit";

function severityBadge(severity: string): string {
  switch (severity) {
    case "critical": return "🔴 CRITICAL";
    case "high": return "🟠 HIGH";
    case "medium": return "🟡 MEDIUM";
    case "low": return "🟢 LOW";
    default: return severity.toUpperCase();
  }
}

function sectionScoreEmoji(score: number): string {
  if (score >= 80) return "✅";
  if (score >= 60) return "⚠️";
  if (score >= 40) return "🟠";
  return "🔴";
}

export function generateAuditReportMarkdown(report: AuditReport): string {
  const lines: string[] = [];

  lines.push(`# SEO Audit Report: ${report.domain}`);
  lines.push(`## Date: ${new Date(report.timestamp).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })} | Score: ${report.overallScore}/100`);
  lines.push("");
  lines.push("### Executive Summary");
  lines.push(report.executiveSummary);
  lines.push("");

  // Section details
  for (const section of report.sections) {
    lines.push(`### ${sectionScoreEmoji(section.score)} ${section.title} (Score: ${section.score}/100)`);
    lines.push("");

    if (section.findings.length === 0) {
      lines.push("No issues found in this section.");
      lines.push("");
      continue;
    }

    lines.push("#### Findings");
    for (const finding of section.findings) {
      lines.push(`- ${severityBadge(finding.severity)}: **${finding.title}**`);
      lines.push(`  - ${finding.description}`);
      if (finding.currentState) {
        lines.push(`  - Current: ${finding.currentState}`);
      }
      if (finding.expectedState) {
        lines.push(`  - Expected: ${finding.expectedState}`);
      }
      if (finding.affectedUrls.length > 0) {
        lines.push(`  - Affected: ${finding.affectedUrls.slice(0, 5).join(", ")}`);
      }
      if (finding.autoFixable) {
        lines.push(`  - ✨ Auto-fixable (${finding.fixType})`);
      }
    }
    lines.push("");

    if (section.citations.length > 0) {
      lines.push("#### Sources");
      for (const citation of section.citations.slice(0, 5)) {
        lines.push(`- [${citation.url}](${citation.url})`);
      }
      lines.push("");
    }
  }

  // Action Items Summary Table
  const allFindings = report.sections.flatMap(s => s.findings);
  if (allFindings.length > 0) {
    lines.push("### Action Items Summary");
    lines.push("");
    lines.push("| # | Severity | Title | Auto-Fix? | Fix Type |");
    lines.push("|---|----------|-------|-----------|----------|");
    allFindings
      .sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.severity] || 3) - (order[b.severity] || 3);
      })
      .forEach((f, i) => {
        lines.push(`| ${i + 1} | ${f.severity} | ${f.title} | ${f.autoFixable ? "Yes" : "No"} | ${f.fixType} |`);
      });
    lines.push("");
  }

  // Cost
  lines.push("### Audit Metadata");
  lines.push(`- Tokens used: ${report.totalTokensUsed.toLocaleString()}`);
  lines.push(`- Estimated cost: $${report.estimatedCostUsd.toFixed(4)}`);
  lines.push(`- Sections analyzed: ${report.sections.length}`);
  lines.push(`- Site ID: ${report.siteId}`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Extract all action items from a report, sorted by severity.
 */
export function extractActionItems(report: AuditReport): (AuditFinding & { sectionId: string; sectionTitle: string })[] {
  const items: (AuditFinding & { sectionId: string; sectionTitle: string })[] = [];

  for (const section of report.sections) {
    for (const finding of section.findings) {
      items.push({
        ...finding,
        sectionId: section.id,
        sectionTitle: section.title,
      });
    }
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  items.sort((a, b) => (order[a.severity] || 3) - (order[b.severity] || 3));

  return items;
}
