/**
 * System Health Audit — Scoring Algorithm
 *
 * Section weights and overall score calculation.
 */

import type { SectionResult, CheckResult, CheckStatus, AuditSummary } from "./types";

const SECTION_WEIGHTS: Record<string, number> = {
  database: 0.15,
  environment: 0.10,
  aiProviders: 0.05,
  seoInfrastructure: 0.20,
  indexingSystem: 0.15,
  contentPipeline: 0.10,
  cronJobs: 0.10,
  analytics: 0.05,
  security: 0.05,
  contentQuality: 0.05,
  multiSite: 0.00, // only scored if >1 site
  duplicateDetection: 0.00, // included in content weight
};

export function computeSectionResult(
  checks: Record<string, CheckResult>
): SectionResult {
  const entries = Object.values(checks).filter((c) => c.status !== "skip");
  if (entries.length === 0) return { status: "skip", score: 0, checks };

  const avg = entries.reduce((s, c) => s + c.score, 0) / entries.length;
  const hasAnyFail = entries.some((c) => c.status === "fail");
  const hasAnyWarn = entries.some((c) => c.status === "warn");

  return {
    status: hasAnyFail ? "fail" : hasAnyWarn ? "warn" : "pass",
    score: Math.round(avg),
    checks,
  };
}

export function computeOverallScore(sections: Record<string, SectionResult>): {
  score: number;
  status: "healthy" | "degraded" | "unhealthy";
  summary: AuditSummary;
} {
  // Adjust weights if multi-site has content
  const weights = { ...SECTION_WEIGHTS };
  const multiSiteChecks = Object.values(sections.multiSite?.checks || {});
  if (multiSiteChecks.length > 0 && multiSiteChecks.some((c) => c.status !== "skip")) {
    weights.multiSite = 0.05;
    weights.seoInfrastructure = 0.17;
    weights.indexingSystem = 0.13;
  }
  // Include duplicate detection in content weight
  const dupChecks = Object.values(sections.duplicateDetection?.checks || {});
  if (dupChecks.length > 0 && dupChecks.some((c) => c.status !== "skip")) {
    weights.duplicateDetection = 0.05;
    weights.contentQuality = 0.02;
    weights.environment = 0.08;
  }

  let totalWeight = 0;
  let weightedSum = 0;

  for (const [key, section] of Object.entries(sections)) {
    const w = weights[key] || 0;
    if (w === 0) continue;
    if (section.status === "skip") continue;
    totalWeight += w;
    weightedSum += section.score * w;
  }

  const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  // Count all checks
  let passed = 0, warnings = 0, failed = 0, skipped = 0;
  for (const section of Object.values(sections)) {
    for (const check of Object.values(section.checks)) {
      if (check.status === "pass") passed++;
      else if (check.status === "warn") warnings++;
      else if (check.status === "fail") failed++;
      else skipped++;
    }
  }

  return {
    score,
    status: score >= 80 ? "healthy" : score >= 60 ? "degraded" : "unhealthy",
    summary: { totalChecks: passed + warnings + failed + skipped, passed, warnings, failed, skipped },
  };
}
