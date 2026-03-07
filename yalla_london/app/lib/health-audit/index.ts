/**
 * System Health Audit — Orchestrator
 *
 * Runs all 12 check sections sequentially, computes scores, and returns
 * the full audit report. Sections run sequentially to avoid overwhelming
 * the server; checks within a section can run in parallel via Promise.allSettled.
 */

import type { AuditConfig, AuditReport, SectionResult } from "./types";
import { computeSectionResult, computeOverallScore } from "./scoring";

type SectionRunner = (config: AuditConfig) => Promise<Record<string, import("./types").CheckResult>>;

interface SectionDef {
  key: string;
  label: string;
  runner: () => Promise<{ default?: SectionRunner } & Record<string, SectionRunner>>;
  fnName: string;
}

const SECTIONS: SectionDef[] = [
  { key: "database", label: "Database Health", runner: () => import("./checks/database"), fnName: "runDatabaseChecks" },
  { key: "environment", label: "Environment & Config", runner: () => import("./checks/environment"), fnName: "runEnvironmentChecks" },
  { key: "aiProviders", label: "AI Providers", runner: () => import("./checks/ai-providers"), fnName: "runAIProviderChecks" },
  { key: "seoInfrastructure", label: "SEO Infrastructure", runner: () => import("./checks/seo-infrastructure"), fnName: "runSEOInfrastructureChecks" },
  { key: "indexingSystem", label: "Indexing System", runner: () => import("./checks/indexing-system"), fnName: "runIndexingSystemChecks" },
  { key: "contentPipeline", label: "Content Pipeline", runner: () => import("./checks/content-pipeline"), fnName: "runContentPipelineChecks" },
  { key: "cronJobs", label: "Cron Jobs", runner: () => import("./checks/cron-jobs"), fnName: "runCronJobChecks" },
  { key: "analytics", label: "Analytics", runner: () => import("./checks/analytics"), fnName: "runAnalyticsChecks" },
  { key: "security", label: "Security & Performance", runner: () => import("./checks/security-performance"), fnName: "runSecurityChecks" },
  { key: "contentQuality", label: "Content Quality", runner: () => import("./checks/content-quality"), fnName: "runContentQualityChecks" },
  { key: "multiSite", label: "Multi-Site Health", runner: () => import("./checks/multi-site"), fnName: "runMultiSiteChecks" },
  { key: "duplicateDetection", label: "Duplicate Detection", runner: () => import("./checks/duplicate-detection"), fnName: "runDuplicateDetectionChecks" },
];

export interface AuditProgress {
  currentSection: string;
  currentSectionIndex: number;
  totalSections: number;
  completedChecks: number;
  totalChecks: number;
}

/**
 * Run the full system health audit.
 *
 * @param config  Site URL + ID
 * @param onProgress  Optional callback for real-time progress updates
 * @returns Complete audit report
 */
export async function runSystemHealthAudit(
  config: AuditConfig,
  onProgress?: (progress: AuditProgress) => void
): Promise<AuditReport> {
  const auditStart = Date.now();
  const sections: Record<string, SectionResult> = {};
  let completedChecks = 0;

  // Estimate total checks (47)
  const totalChecks = 47;

  for (let i = 0; i < SECTIONS.length; i++) {
    const section = SECTIONS[i];

    onProgress?.({
      currentSection: section.label,
      currentSectionIndex: i + 1,
      totalSections: SECTIONS.length,
      completedChecks,
      totalChecks,
    });

    try {
      const mod = await section.runner();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fn = (mod as any)[section.fnName] as SectionRunner | undefined;
      if (!fn) {
        console.warn(`[health-audit] Section "${section.key}" has no export "${section.fnName}"`);
        sections[section.key] = { status: "skip", score: 0, checks: {} };
        continue;
      }

      const checks = await fn(config);
      sections[section.key] = computeSectionResult(checks);
      completedChecks += Object.keys(checks).length;
    } catch (err) {
      console.warn(`[health-audit] Section "${section.key}" failed:`, err instanceof Error ? err.message : err);
      sections[section.key] = {
        status: "fail",
        score: 0,
        checks: {
          _sectionError: {
            status: "fail",
            score: 0,
            durationMs: 0,
            details: {},
            error: err instanceof Error ? err.message : String(err),
            action: `Section "${section.label}" threw an error. Check server logs.`,
            timestamp: new Date().toISOString(),
          },
        },
      };
    }
  }

  const { score, status, summary } = computeOverallScore(sections);

  return {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - auditStart,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    siteUrl: config.siteUrl,
    siteId: config.siteId,
    overallScore: score,
    overallStatus: status,
    summary,
    sections,
  };
}

/** Get the list of section names for progress tracking */
export function getAuditSections(): Array<{ key: string; label: string }> {
  return SECTIONS.map((s) => ({ key: s.key, label: s.label }));
}
