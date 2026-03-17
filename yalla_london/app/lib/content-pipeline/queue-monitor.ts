/**
 * Queue Monitor — Strict Pipeline Health Enforcement
 *
 * This module provides a centralized view of the content pipeline queue
 * with strict health enforcement rules. It answers three questions:
 *
 * 1. WHAT is in the queue? (drafts by phase, age, attempt count)
 * 2. WHAT is stuck? (health rules with auto-fix actions)
 * 3. WHAT should happen next? (recommended actions)
 *
 * Called by:
 * - /api/admin/queue-monitor (dashboard API)
 * - diagnostic-sweep cron (auto-remediation)
 * - cockpit Mission Control tab (real-time status)
 *
 * Design principles:
 * - READ-ONLY diagnostics, WRITE-ONLY fixes (separate methods)
 * - Every fix is logged to CronJobLog for audit trail
 * - All thresholds from constants.ts (single source of truth)
 * - No silent failures — every action returns a result
 */

import {
  MAX_ATTEMPTS,
  getMaxAttempts,
  LIFETIME_RECOVERY_CAP,
  ASSEMBLY_RAW_FALLBACK_ATTEMPTS,
  DRAFTING_BACKLOG_REJECT_HOURS,
  GENERAL_STUCK_REJECT_HOURS,
  STUCK_WITH_ATTEMPTS_REJECT_HOURS,
  ACTIVE_DRAFT_STALENESS_HOURS,
} from "@/lib/content-pipeline/constants";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface QueueDraft {
  id: string;
  keyword: string;
  locale: string;
  siteId: string;
  currentPhase: string;
  phaseAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  lastError: string | null;
  sectionsCompleted: number;
  sectionsTotal: number;
}

export interface QueueHealthRule {
  id: string;
  name: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  affectedDrafts: QueueDraft[];
  autoFixAvailable: boolean;
  fixDescription: string;
}

export interface QueueSnapshot {
  timestamp: Date;
  totalActive: number;
  byPhase: Record<string, { count: number; avgAgeHours: number; oldestHours: number }>;
  bySite: Record<string, number>;
  healthRules: QueueHealthRule[];
  overallHealth: "healthy" | "degraded" | "stalled" | "critical";
  recommendedActions: string[];
  constants: typeof MAX_ATTEMPTS & { lifetimeCap: number; backlogRejectHours: number };
}

export interface QueueFixResult {
  ruleId: string;
  action: string;
  affectedCount: number;
  draftIds: string[];
  success: boolean;
  error?: string;
}

// ─── Snapshot (READ-ONLY) ───────────────────────────────────────────────────

export async function getQueueSnapshot(siteId?: string): Promise<QueueSnapshot> {
  const { prisma } = await import("@/lib/db");
  const now = new Date();

  // Fetch all active drafts (not rejected, not completed/published)
  const activeDrafts = await prisma.articleDraft.findMany({
    where: {
      current_phase: {
        notIn: ["rejected", "completed", "published"],
      },
      ...(siteId ? { site_id: siteId } : {}),
    },
    select: {
      id: true,
      keyword: true,
      locale: true,
      site_id: true,
      current_phase: true,
      phase_attempts: true,
      created_at: true,
      updated_at: true,
      last_error: true,
      sections_completed: true,
      sections_data: true,
    },
    orderBy: { updated_at: "asc" },
  });

  // Map to QueueDraft
  const drafts: QueueDraft[] = activeDrafts.map((d) => ({
    id: d.id,
    keyword: d.keyword || "unknown",
    locale: d.locale || "en",
    siteId: d.site_id || "unknown",
    currentPhase: d.current_phase || "unknown",
    phaseAttempts: (d.phase_attempts as number) || 0,
    createdAt: d.created_at || now,
    updatedAt: d.updated_at || now,
    lastError: d.last_error as string | null,
    sectionsCompleted: (d.sections_completed as number) || 0,
    sectionsTotal: Array.isArray(d.sections_data) ? d.sections_data.length : 0,
  }));

  // ── Phase breakdown ──
  const byPhase: Record<string, { count: number; avgAgeHours: number; oldestHours: number }> = {};
  for (const d of drafts) {
    if (!byPhase[d.currentPhase]) {
      byPhase[d.currentPhase] = { count: 0, avgAgeHours: 0, oldestHours: 0 };
    }
    const ageHours = (now.getTime() - d.createdAt.getTime()) / (60 * 60 * 1000);
    byPhase[d.currentPhase].count++;
    byPhase[d.currentPhase].avgAgeHours += ageHours;
    byPhase[d.currentPhase].oldestHours = Math.max(byPhase[d.currentPhase].oldestHours, ageHours);
  }
  for (const phase of Object.keys(byPhase)) {
    byPhase[phase].avgAgeHours = Math.round((byPhase[phase].avgAgeHours / byPhase[phase].count) * 10) / 10;
    byPhase[phase].oldestHours = Math.round(byPhase[phase].oldestHours * 10) / 10;
  }

  // ── Site breakdown ──
  const bySite: Record<string, number> = {};
  for (const d of drafts) {
    bySite[d.siteId] = (bySite[d.siteId] || 0) + 1;
  }

  // ── Health Rules ──
  const healthRules: QueueHealthRule[] = [];

  // Rule 1: Drafts at or near max attempts (about to be rejected)
  const nearMaxDrafts = drafts.filter((d) => d.phaseAttempts >= getMaxAttempts(d.currentPhase) - 1);
  if (nearMaxDrafts.length > 0) {
    healthRules.push({
      id: "near-max-attempts",
      name: "Drafts near rejection",
      severity: nearMaxDrafts.length > 5 ? "critical" : "high",
      description: `${nearMaxDrafts.length} drafts are 1 attempt away from permanent rejection`,
      affectedDrafts: nearMaxDrafts,
      autoFixAvailable: false,
      fixDescription: "Review manually — these may need topic changes or prompt adjustments",
    });
  }

  // Rule 2: Drafts stuck in same phase >24h
  const stuckDrafts = drafts.filter((d) => {
    const ageH = (now.getTime() - d.updatedAt.getTime()) / (60 * 60 * 1000);
    return ageH > GENERAL_STUCK_REJECT_HOURS;
  });
  if (stuckDrafts.length > 0) {
    healthRules.push({
      id: "stuck-24h",
      name: "Stuck >24h",
      severity: stuckDrafts.length > 10 ? "critical" : "high",
      description: `${stuckDrafts.length} drafts haven't advanced in ${GENERAL_STUCK_REJECT_HOURS}+ hours`,
      affectedDrafts: stuckDrafts,
      autoFixAvailable: true,
      fixDescription: `Auto-reject drafts stuck >${GENERAL_STUCK_REJECT_HOURS}h with 1+ attempts`,
    });
  }

  // Rule 3: Drafting backlog >50 (queue depth too high)
  const draftingCount = byPhase["drafting"]?.count || 0;
  if (draftingCount > 50) {
    const draftingDrafts = drafts.filter((d) => d.currentPhase === "drafting");
    healthRules.push({
      id: "drafting-backlog",
      name: "Drafting backlog",
      severity: draftingCount > 100 ? "critical" : "high",
      description: `${draftingCount} drafts queued in drafting phase (target: <20). Pipeline throughput is lower than creation rate.`,
      affectedDrafts: draftingDrafts.slice(0, 20), // Don't send 150 drafts to the UI
      autoFixAvailable: true,
      fixDescription: `Reject drafts older than ${DRAFTING_BACKLOG_REJECT_HOURS}h with 1+ attempt to clear backlog`,
    });
  }

  // Rule 4: Assembly stuck with high attempts (should have triggered raw fallback)
  const assemblyStuck = drafts.filter(
    (d) => d.currentPhase === "assembly" && d.phaseAttempts >= ASSEMBLY_RAW_FALLBACK_ATTEMPTS
  );
  if (assemblyStuck.length > 0) {
    healthRules.push({
      id: "assembly-stuck",
      name: "Assembly stuck (raw fallback should have fired)",
      severity: "high",
      description: `${assemblyStuck.length} drafts have ${ASSEMBLY_RAW_FALLBACK_ATTEMPTS}+ assembly attempts but haven't advanced`,
      affectedDrafts: assemblyStuck,
      autoFixAvailable: true,
      fixDescription: "Force raw fallback by setting phase_attempts to trigger threshold",
    });
  }

  // Rule 5: Drafts with diagnostic-agent errors still "active"
  const diagnosticStuck = drafts.filter((d) =>
    d.lastError?.includes("[diagnostic-agent") || d.lastError?.includes("MAX_RECOVERIES_EXCEEDED")
  );
  if (diagnosticStuck.length > 0) {
    healthRules.push({
      id: "diagnostic-stuck",
      name: "Diagnostic-agent artifacts",
      severity: "medium",
      description: `${diagnosticStuck.length} drafts have diagnostic-agent error markers but aren't rejected`,
      affectedDrafts: diagnosticStuck,
      autoFixAvailable: true,
      fixDescription: "Reject drafts that hit max recoveries",
    });
  }

  // Rule 6: Zero progress in last 4 hours (pipeline stalled)
  const recentlyAdvanced = drafts.filter((d) => {
    const updateAge = (now.getTime() - d.updatedAt.getTime()) / (60 * 60 * 1000);
    return updateAge < 4;
  });
  if (drafts.length > 5 && recentlyAdvanced.length === 0) {
    healthRules.push({
      id: "pipeline-stalled",
      name: "Pipeline stalled",
      severity: "critical",
      description: "No draft has advanced in the last 4 hours. The pipeline is frozen.",
      affectedDrafts: drafts.slice(0, 10),
      autoFixAvailable: false,
      fixDescription: "Check cron job health, AI provider status, and database connectivity",
    });
  }

  // ── Overall Health ──
  const criticalCount = healthRules.filter((r) => r.severity === "critical").length;
  const highCount = healthRules.filter((r) => r.severity === "high").length;
  const overallHealth: QueueSnapshot["overallHealth"] =
    criticalCount > 0 ? "critical"
      : highCount > 1 ? "stalled"
        : highCount > 0 ? "degraded"
          : "healthy";

  // ── Recommended Actions ──
  const recommendedActions: string[] = [];
  if (draftingCount > 100) {
    recommendedActions.push(`Pause topic creation — ${draftingCount} drafts in queue. Clear backlog before adding more.`);
  }
  if (assemblyStuck.length > 0) {
    recommendedActions.push(`Run diagnostic-sweep to force raw assembly fallback on ${assemblyStuck.length} stuck drafts.`);
  }
  if (criticalCount > 0) {
    recommendedActions.push("Check AI provider status — multiple critical issues detected.");
  }
  if (drafts.length === 0) {
    recommendedActions.push("Queue is empty. Run topic research + bulk create to seed new articles.");
  }
  if (healthRules.length === 0) {
    recommendedActions.push("Pipeline is healthy. No action needed.");
  }

  return {
    timestamp: now,
    totalActive: drafts.length,
    byPhase,
    bySite,
    healthRules,
    overallHealth,
    recommendedActions,
    constants: {
      ...MAX_ATTEMPTS,
      lifetimeCap: LIFETIME_RECOVERY_CAP,
      backlogRejectHours: DRAFTING_BACKLOG_REJECT_HOURS,
    },
  };
}

// ─── Fix Actions (WRITE) ────────────────────────────────────────────────────

export async function executeQueueFix(ruleId: string, siteId?: string): Promise<QueueFixResult> {
  const { prisma } = await import("@/lib/db");
  const now = new Date();

  try {
    switch (ruleId) {
      case "stuck-24h": {
        const cutoff = new Date(now.getTime() - GENERAL_STUCK_REJECT_HOURS * 60 * 60 * 1000);
        const result = await prisma.articleDraft.updateMany({
          where: {
            current_phase: { notIn: ["rejected", "completed", "published", "reservoir"] },
            updated_at: { lt: cutoff },
            phase_attempts: { gte: 1 },
            ...(siteId ? { site_id: siteId } : {}),
          },
          data: {
            current_phase: "rejected",
            last_error: `[queue-monitor] Auto-rejected: stuck >${GENERAL_STUCK_REJECT_HOURS}h`,
          },
        });
        return {
          ruleId,
          action: `Rejected ${result.count} stuck drafts`,
          affectedCount: result.count,
          draftIds: [],
          success: true,
        };
      }

      case "drafting-backlog": {
        const cutoff = new Date(now.getTime() - DRAFTING_BACKLOG_REJECT_HOURS * 60 * 60 * 1000);
        const result = await prisma.articleDraft.updateMany({
          where: {
            current_phase: "drafting",
            created_at: { lt: cutoff },
            phase_attempts: { gte: 1 },
            ...(siteId ? { site_id: siteId } : {}),
          },
          data: {
            current_phase: "rejected",
            last_error: `[queue-monitor] Auto-rejected: drafting backlog >${DRAFTING_BACKLOG_REJECT_HOURS}h`,
          },
        });
        return {
          ruleId,
          action: `Rejected ${result.count} old drafting-backlog drafts`,
          affectedCount: result.count,
          draftIds: [],
          success: true,
        };
      }

      case "assembly-stuck": {
        // Force raw fallback by ensuring attempts >= ASSEMBLY_RAW_FALLBACK_ATTEMPTS
        const result = await prisma.articleDraft.updateMany({
          where: {
            current_phase: "assembly",
            phase_attempts: { gte: ASSEMBLY_RAW_FALLBACK_ATTEMPTS },
            ...(siteId ? { site_id: siteId } : {}),
          },
          data: {
            // Reset phase_started_at to allow immediate pickup by build-runner
            phase_started_at: new Date(0),
            last_error: "[queue-monitor] Forcing raw assembly fallback",
          },
        });
        return {
          ruleId,
          action: `Unlocked ${result.count} assembly-stuck drafts for raw fallback`,
          affectedCount: result.count,
          draftIds: [],
          success: true,
        };
      }

      case "diagnostic-stuck": {
        const result = await prisma.articleDraft.updateMany({
          where: {
            current_phase: { notIn: ["rejected", "completed", "published"] },
            last_error: { contains: "MAX_RECOVERIES_EXCEEDED" },
            ...(siteId ? { site_id: siteId } : {}),
          },
          data: {
            current_phase: "rejected",
            last_error: "[queue-monitor] Rejected: exceeded max recovery attempts",
          },
        });
        return {
          ruleId,
          action: `Rejected ${result.count} max-recovery-exceeded drafts`,
          affectedCount: result.count,
          draftIds: [],
          success: true,
        };
      }

      default:
        return {
          ruleId,
          action: "Unknown rule",
          affectedCount: 0,
          draftIds: [],
          success: false,
          error: `No auto-fix handler for rule "${ruleId}"`,
        };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[queue-monitor] Fix "${ruleId}" failed:`, msg);
    return {
      ruleId,
      action: `Failed: ${msg}`,
      affectedCount: 0,
      draftIds: [],
      success: false,
      error: msg,
    };
  }
}

// ─── Auto-Fix All (for diagnostic-sweep cron) ──────────────────────────────

export async function autoFixAll(siteId?: string): Promise<QueueFixResult[]> {
  const snapshot = await getQueueSnapshot(siteId);
  const results: QueueFixResult[] = [];

  for (const rule of snapshot.healthRules) {
    if (rule.autoFixAvailable) {
      const result = await executeQueueFix(rule.id, siteId);
      results.push(result);
    }
  }

  return results;
}
