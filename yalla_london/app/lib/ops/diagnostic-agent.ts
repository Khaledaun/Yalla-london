/**
 * Diagnostic Agent — Multi-Phase Root-Cause Analysis & Auto-Fix
 *
 * Runs in 3 phases:
 *   Phase 1: DIAGNOSE — Analyze stuck/failed drafts and cron jobs, classify root cause
 *   Phase 2: FIX — Apply targeted remediation based on diagnosis
 *   Phase 3: VERIFY — Confirm the fix worked, log full trail to AutoFixLog
 *
 * Called by:
 *   - /api/cron/diagnostic-sweep (every 2 hours)
 *   - Cockpit "Diagnose" button (on-demand)
 */

export type DiagnosisCategory =
  | "timeout"           // AI call exceeds budget
  | "provider_down"     // All providers failing
  | "bad_data"          // Malformed input (broken JSON in sections_data, etc.)
  | "budget_exhaustion" // Cron runs out of time before reaching this draft
  | "stuck_loop"        // Draft retried 5+ times on same phase without progress
  | "schema_mismatch"   // Prisma field doesn't exist
  | "unknown";

export interface Diagnosis {
  targetType: "draft" | "cron";
  targetId: string;
  category: DiagnosisCategory;
  details: string;
  phase?: string;
  attempts?: number;
  lastError?: string;
  age_hours?: number;
}

export interface DiagnosticFix {
  diagnosis: Diagnosis;
  fixApplied: string;
  success: boolean;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  error?: string;
}

export interface DiagnosticVerification {
  fix: DiagnosticFix;
  verified: boolean;
  verificationDetails: string;
}

export interface DiagnosticResult {
  timestamp: string;
  stuckDrafts: number;
  failedCrons: number;
  diagnoses: Diagnosis[];
  fixes: DiagnosticFix[];
  verifications: DiagnosticVerification[];
  summary: string;
}

// ─── Phase 1: DIAGNOSE ──────────────────────────────────────────────────────

export async function diagnoseStuckDrafts(): Promise<Diagnosis[]> {
  const { prisma } = await import("@/lib/db");
  const diagnoses: Diagnosis[] = [];

  try {
    // Find drafts stuck in the same phase for 3+ attempts or >2 hours
    const stuckDrafts = await prisma.articleDraft.findMany({
      where: {
        current_phase: {
          in: ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"],
        },
        OR: [
          { phase_attempts: { gte: 3 } },
          { phase_started_at: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
        ],
      },
      select: {
        id: true,
        keyword: true,
        locale: true,
        current_phase: true,
        phase_attempts: true,
        phase_started_at: true,
        last_error: true,
        updated_at: true,
        sections_data: true,
        outline_data: true,
        research_data: true,
      },
      take: 20,
      orderBy: { phase_attempts: "desc" },
    });

    for (const draft of stuckDrafts) {
      const ageHours = draft.phase_started_at
        ? (Date.now() - new Date(draft.phase_started_at).getTime()) / (60 * 60 * 1000)
        : 0;
      const lastError = (draft.last_error || "").toLowerCase();

      let category: DiagnosisCategory = "unknown";
      let details = "";

      if (lastError.includes("timeout") || lastError.includes("aborted") || lastError.includes("budget too low")) {
        category = "timeout";
        details = `Phase "${draft.current_phase}" timing out after ${draft.phase_attempts} attempts. Last error: ${draft.last_error}`;
      } else if (lastError.includes("api error") || lastError.includes("no api key") || lastError.includes("429") || lastError.includes("503")) {
        category = "provider_down";
        details = `AI provider errors for "${draft.current_phase}". Last error: ${draft.last_error}`;
      } else if (lastError.includes("json") || lastError.includes("parse") || lastError.includes("unexpected token")) {
        category = "bad_data";
        details = `Malformed data in phase "${draft.current_phase}". Last error: ${draft.last_error}`;
      } else if ((draft.phase_attempts || 0) >= 5) {
        category = "stuck_loop";
        details = `Draft stuck in "${draft.current_phase}" for ${draft.phase_attempts} attempts over ${Math.round(ageHours)}h`;
      } else if (lastError.includes("budget")) {
        category = "budget_exhaustion";
        details = `Cron budget exhausted before reaching "${draft.current_phase}" phase`;
      } else {
        category = "unknown";
        details = `Draft stuck in "${draft.current_phase}" (${draft.phase_attempts} attempts, ${Math.round(ageHours)}h). Error: ${draft.last_error || "none"}`;
      }

      diagnoses.push({
        targetType: "draft",
        targetId: draft.id,
        category,
        details,
        phase: draft.current_phase,
        attempts: draft.phase_attempts || 0,
        lastError: draft.last_error || undefined,
        age_hours: Math.round(ageHours * 10) / 10,
      });
    }
  } catch (err) {
    console.warn("[diagnostic-agent] Draft diagnosis failed:", err instanceof Error ? err.message : err);
  }

  return diagnoses;
}

export async function diagnoseFailedCrons(): Promise<Diagnosis[]> {
  const { prisma } = await import("@/lib/db");
  const diagnoses: Diagnosis[] = [];

  try {
    // Find cron jobs that failed in the last 4 hours
    const failedCrons = await prisma.cronJobLog.findMany({
      where: {
        status: { in: ["failed", "error"] },
        started_at: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) },
      },
      select: {
        id: true,
        job_name: true,
        status: true,
        error_message: true,
        started_at: true,
        duration_ms: true,
      },
      take: 20,
      orderBy: { started_at: "desc" },
    });

    for (const cron of failedCrons) {
      const errorMsg = (cron.error_message || "").toLowerCase();
      let category: DiagnosisCategory = "unknown";

      if (errorMsg.includes("timeout") || errorMsg.includes("aborted")) {
        category = "timeout";
      } else if (errorMsg.includes("api") || errorMsg.includes("429") || errorMsg.includes("503")) {
        category = "provider_down";
      } else if (errorMsg.includes("prisma") || errorMsg.includes("p2") || errorMsg.includes("does not exist")) {
        category = "schema_mismatch";
      }

      diagnoses.push({
        targetType: "cron",
        targetId: cron.id,
        category,
        details: `Cron "${cron.job_name}" failed: ${cron.error_message || "unknown error"}`,
        lastError: cron.error_message || undefined,
      });
    }
  } catch (err) {
    console.warn("[diagnostic-agent] Cron diagnosis failed:", err instanceof Error ? err.message : err);
  }

  return diagnoses;
}

// ─── Phase 2: FIX ───────────────────────────────────────────────────────────

export async function applyDiagnosticFix(diagnosis: Diagnosis): Promise<DiagnosticFix> {
  const { prisma } = await import("@/lib/db");

  if (diagnosis.targetType !== "draft") {
    // Cron failures are informational — log but don't auto-fix
    return {
      diagnosis,
      fixApplied: "logged_only",
      success: true,
      before: {},
      after: {},
    };
  }

  try {
    const draft = await prisma.articleDraft.findUnique({
      where: { id: diagnosis.targetId },
      select: {
        id: true,
        current_phase: true,
        phase_attempts: true,
        phase_started_at: true,
        last_error: true,
        sections_data: true,
        assembled_html: true,
      },
    });

    if (!draft) {
      return { diagnosis, fixApplied: "none", success: false, before: {}, after: {}, error: "Draft not found" };
    }

    const before = {
      phase: draft.current_phase,
      attempts: draft.phase_attempts,
      phase_started_at: draft.phase_started_at?.toISOString(),
    };

    switch (diagnosis.category) {
      case "timeout":
      case "budget_exhaustion": {
        // ASSEMBLY SPECIAL CASE: Do NOT reset attempts to 0.
        // The assembly phase has a raw fallback at attempts >= 1 that concatenates sections
        // directly without AI. Resetting to 0 would cause it to try the AI call again,
        // which will just timeout again — creating an infinite loop.
        // Instead, ensure attempts >= 1 so the raw fallback fires on next builder run.
        if (draft.current_phase === "assembly") {
          const newAttempts = Math.max(draft.phase_attempts || 0, 1);
          await prisma.articleDraft.update({
            where: { id: draft.id },
            data: {
              phase_attempts: newAttempts,
              phase_started_at: null,
              last_error: `[diagnostic-agent] Assembly timeout — raw fallback will fire (attempts=${newAttempts})`,
              updated_at: new Date(),
            },
          });
          return {
            diagnosis,
            fixApplied: "assembly_unlock_for_raw_fallback",
            success: true,
            before,
            after: { phase: draft.current_phase, attempts: newAttempts, phase_started_at: null },
          };
        }

        // Non-assembly phases: Reset attempts and unlock for retry with fresh budget.
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: {
            phase_attempts: 0,
            phase_started_at: null,
            last_error: `[diagnostic-agent] Reset from ${diagnosis.category} — was stuck ${diagnosis.attempts} attempts`,
            updated_at: new Date(),
          },
        });
        return {
          diagnosis,
          fixApplied: "reset_attempts_and_unlock",
          success: true,
          before,
          after: { phase: draft.current_phase, attempts: 0, phase_started_at: null },
        };
      }

      case "stuck_loop": {
        // If stuck in assembly with 5+ attempts, force raw assembly fallback
        if (draft.current_phase === "assembly" && (draft.sections_data as unknown[])?.length > 0) {
          const sections = draft.sections_data as Array<Record<string, unknown>>;
          let rawHtml = '<article lang="en">';
          for (const section of sections) {
            const level = (section.level as number) || 2;
            rawHtml += `<h${level}>${section.heading || ""}</h${level}>\n${section.content || ""}\n`;
          }
          rawHtml += "</article>";
          const wordCount = rawHtml.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;

          await prisma.articleDraft.update({
            where: { id: draft.id },
            data: {
              current_phase: "images",
              phase_attempts: 0,
              phase_started_at: null,
              assembled_html: rawHtml,
              word_count: wordCount,
              last_error: `[diagnostic-agent] Force-advanced from assembly via raw fallback after ${diagnosis.attempts} attempts`,
              updated_at: new Date(),
            },
          });
          return {
            diagnosis,
            fixApplied: "force_raw_assembly_advance",
            success: true,
            before,
            after: { phase: "images", attempts: 0, word_count: wordCount },
          };
        }

        // For other stuck phases, mark as needs_manual_review if 8+ attempts
        if ((diagnosis.attempts || 0) >= 8) {
          await prisma.articleDraft.update({
            where: { id: draft.id },
            data: {
              current_phase: "rejected",
              rejection_reason: `[diagnostic-agent] Stuck in "${draft.current_phase}" for ${diagnosis.attempts} attempts — needs manual review`,
              completed_at: new Date(),
              updated_at: new Date(),
            },
          });
          return {
            diagnosis,
            fixApplied: "rejected_for_manual_review",
            success: true,
            before,
            after: { phase: "rejected" },
          };
        }

        // Otherwise, reset for retry
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: { phase_attempts: 0, phase_started_at: null, updated_at: new Date() },
        });
        return {
          diagnosis,
          fixApplied: "reset_attempts",
          success: true,
          before,
          after: { phase: draft.current_phase, attempts: 0 },
        };
      }

      case "bad_data": {
        // Try to repair JSON fields
        let repaired = false;
        const updateData: Record<string, unknown> = { updated_at: new Date() };

        if (draft.current_phase === "drafting" || draft.current_phase === "assembly") {
          // Validate sections_data is a proper array
          const sections = draft.sections_data;
          if (sections && !Array.isArray(sections)) {
            updateData.sections_data = [];
            updateData.sections_completed = 0;
            updateData.current_phase = "drafting"; // Restart drafting
            updateData.phase_attempts = 0;
            repaired = true;
          }
        }

        if (repaired) {
          await prisma.articleDraft.update({ where: { id: draft.id }, data: updateData });
          return {
            diagnosis,
            fixApplied: "repair_json_data",
            success: true,
            before,
            after: updateData,
          };
        }

        // Can't auto-repair — reset for retry
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: { phase_attempts: 0, phase_started_at: null, updated_at: new Date() },
        });
        return {
          diagnosis,
          fixApplied: "reset_attempts_bad_data",
          success: true,
          before,
          after: { phase: draft.current_phase, attempts: 0 },
        };
      }

      case "provider_down": {
        // Nothing to fix — providers are external. Just reset attempts so it retries later.
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: { phase_attempts: 0, phase_started_at: null, updated_at: new Date() },
        });
        return {
          diagnosis,
          fixApplied: "reset_for_provider_retry",
          success: true,
          before,
          after: { phase: draft.current_phase, attempts: 0 },
        };
      }

      default: {
        // Unknown — reset attempts as a generic fix
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: { phase_attempts: Math.max(0, (draft.phase_attempts || 0) - 2), phase_started_at: null, updated_at: new Date() },
        });
        return {
          diagnosis,
          fixApplied: "reduce_attempts_generic",
          success: true,
          before,
          after: { phase: draft.current_phase, attempts: Math.max(0, (draft.phase_attempts || 0) - 2) },
        };
      }
    }
  } catch (err) {
    return {
      diagnosis,
      fixApplied: "none",
      success: false,
      before: {},
      after: {},
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Phase 3: VERIFY ────────────────────────────────────────────────────────

export async function verifyFix(fix: DiagnosticFix): Promise<DiagnosticVerification> {
  if (!fix.success || fix.fixApplied === "logged_only" || fix.fixApplied === "none") {
    return { fix, verified: true, verificationDetails: "No verification needed" };
  }

  const { prisma } = await import("@/lib/db");

  try {
    if (fix.diagnosis.targetType === "draft") {
      const draft = await prisma.articleDraft.findUnique({
        where: { id: fix.diagnosis.targetId },
        select: { current_phase: true, phase_attempts: true, phase_started_at: true },
      });

      if (!draft) {
        return { fix, verified: false, verificationDetails: "Draft no longer exists" };
      }

      // Check that the fix actually changed the state
      const expectedPhase = fix.after.phase as string | undefined;
      const expectedAttempts = fix.after.attempts as number | undefined;

      if (expectedPhase && draft.current_phase !== expectedPhase) {
        return { fix, verified: false, verificationDetails: `Phase is "${draft.current_phase}" but expected "${expectedPhase}"` };
      }

      if (expectedAttempts !== undefined && draft.phase_attempts !== expectedAttempts) {
        return { fix, verified: false, verificationDetails: `Attempts is ${draft.phase_attempts} but expected ${expectedAttempts}` };
      }

      return { fix, verified: true, verificationDetails: `Draft state confirmed: phase=${draft.current_phase}, attempts=${draft.phase_attempts}` };
    }

    return { fix, verified: true, verificationDetails: "Cron fix verified" };
  } catch (err) {
    return { fix, verified: false, verificationDetails: `Verification failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ─── LOG ─────────────────────────────────────────────────────────────────────

async function logDiagnostic(verification: DiagnosticVerification, siteId: string): Promise<void> {
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.autoFixLog.create({
      data: {
        siteId,
        targetType: verification.fix.diagnosis.targetType,
        targetId: verification.fix.diagnosis.targetId,
        fixType: `diagnostic:${verification.fix.diagnosis.category}:${verification.fix.fixApplied}`,
        agent: "diagnostic-agent",
        before: verification.fix.before as Record<string, unknown>,
        after: { ...verification.fix.after as Record<string, unknown>, verified: verification.verified, verificationDetails: verification.verificationDetails },
        success: verification.fix.success && verification.verified,
        error: verification.fix.error || (verification.verified ? null : verification.verificationDetails),
      },
    });
  } catch (err) {
    console.warn("[diagnostic-agent] Failed to log diagnostic:", err instanceof Error ? err.message : err);
  }
}

// ─── ORCHESTRATOR ────────────────────────────────────────────────────────────

export async function runDiagnosticSweep(siteId?: string): Promise<DiagnosticResult> {
  const start = Date.now();

  // Phase 1: Diagnose
  const [draftDiagnoses, cronDiagnoses] = await Promise.all([
    diagnoseStuckDrafts(),
    diagnoseFailedCrons(),
  ]);
  const allDiagnoses = [...draftDiagnoses, ...cronDiagnoses];

  // Phase 2: Fix (only draft fixes — crons are informational)
  const fixes: DiagnosticFix[] = [];
  for (const diagnosis of allDiagnoses) {
    // Budget guard — don't spend more than 30s on fixes
    if (Date.now() - start > 30_000) {
      console.log(`[diagnostic-agent] Budget limit reached after ${fixes.length} fixes`);
      break;
    }
    const fix = await applyDiagnosticFix(diagnosis);
    fixes.push(fix);
  }

  // Phase 3: Verify
  const verifications: DiagnosticVerification[] = [];
  for (const fix of fixes) {
    const verification = await verifyFix(fix);
    verifications.push(verification);

    // Log to AutoFixLog
    const resolvedSiteId = siteId || "system";
    await logDiagnostic(verification, resolvedSiteId);
  }

  const fixedCount = verifications.filter((v) => v.verified && v.fix.success).length;
  const failedCount = verifications.filter((v) => !v.verified || !v.fix.success).length;

  const summary = allDiagnoses.length === 0
    ? "All clear — no stuck drafts or failed crons"
    : `Diagnosed ${allDiagnoses.length} issues (${draftDiagnoses.length} drafts, ${cronDiagnoses.length} crons). Fixed: ${fixedCount}, Failed: ${failedCount}`;

  return {
    timestamp: new Date().toISOString(),
    stuckDrafts: draftDiagnoses.length,
    failedCrons: cronDiagnoses.length,
    diagnoses: allDiagnoses,
    fixes,
    verifications,
    summary,
  };
}
