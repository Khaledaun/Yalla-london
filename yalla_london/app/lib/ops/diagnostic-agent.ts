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
  duplicateTitles?: number;
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

      if (lastError.includes("timeout") || lastError.includes("aborted") || lastError.includes("budget too low") || lastError.includes("timed out") || lastError.includes("deadline") || lastError.includes("etimedout") || lastError.includes("signal")) {
        category = "timeout";
        details = `Phase "${draft.current_phase}" timing out after ${draft.phase_attempts} attempts. Last error: ${draft.last_error}`;
      } else if (lastError.includes("api error") || lastError.includes("no api key") || lastError.includes("429") || lastError.includes("503") || lastError.includes("401") || lastError.includes("rate limit") || lastError.includes("quota") || lastError.includes("unauthenticated") || lastError.includes("insufficient")) {
        category = "provider_down";
        details = `AI provider errors for "${draft.current_phase}". Last error: ${draft.last_error}`;
      } else if (lastError.includes("json") || lastError.includes("parse") || lastError.includes("unexpected token") || lastError.includes("syntaxerror") || lastError.includes("not valid")) {
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

/**
 * Fix cron failures by addressing their downstream effects:
 * - Unlock drafts stuck because a cron failed mid-processing
 * - Reset phase_started_at locks left behind by crashed crons
 * - Clear stale "running" CronJobLog entries from crashed runs
 */
async function applyCronFix(diagnosis: Diagnosis): Promise<DiagnosticFix> {
  const { prisma } = await import("@/lib/db");
  const cronName = diagnosis.details.match(/Cron "([^"]+)"/)?.[1] || "";
  const before: Record<string, unknown> = { cronName, category: diagnosis.category };

  try {
    // 1. Content-builder / content-auto-fix failures → unlock stuck drafts
    if (["content-builder", "content-auto-fix", "daily-content-generate"].includes(cronName)) {
      // Find drafts with stale phase_started_at locks (>30 min old = crashed mid-processing)
      const stuckByLock = await prisma.articleDraft.updateMany({
        where: {
          current_phase: { notIn: ["reservoir", "rejected", "published"] },
          phase_started_at: { lt: new Date(Date.now() - 30 * 60 * 1000) },
        },
        data: {
          phase_started_at: null,
          last_error: `[diagnostic-agent] Unlocked after ${cronName} crash — lock was stale >30min`,
          updated_at: new Date(),
        },
      });
      if (stuckByLock.count > 0) {
        return {
          diagnosis,
          fixApplied: `unlocked_${stuckByLock.count}_stale_drafts`,
          success: true,
          before,
          after: { unlockedDrafts: stuckByLock.count },
        };
      }
    }

    // 2. SEO agent / google-indexing failures → mark stale "submitted" URLs for retry
    if (["seo-agent", "google-indexing"].includes(cronName)) {
      const staleSubmissions = await prisma.uRLIndexingStatus.updateMany({
        where: {
          status: "submitted",
          last_inspected_at: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        data: {
          status: "pending",
          last_error: `[diagnostic-agent] Re-queued after ${cronName} failure — was stuck in submitted >7d`,
        },
      });
      if (staleSubmissions.count > 0) {
        return {
          diagnosis,
          fixApplied: `requeued_${staleSubmissions.count}_stale_indexing_urls`,
          success: true,
          before,
          after: { requeuedUrls: staleSubmissions.count },
        };
      }
    }

    // 3. Sweeper failures → clear "running" status from stale CronJobLog entries
    //    Skip dedup markers to avoid false failures on content-builder
    if (["sweeper", "sweeper-agent"].includes(cronName)) {
      const staleLogs = await prisma.cronJobLog.updateMany({
        where: {
          status: "running",
          started_at: { lt: new Date(Date.now() - 10 * 60 * 1000) },
          NOT: {
            result_summary: { path: ["dedup_marker"], equals: true },
          },
        },
        data: {
          status: "failed",
          error_message: `[diagnostic-agent] Marked failed — was stuck in "running" >10min`,
          completed_at: new Date(),
        },
      });
      if (staleLogs.count > 0) {
        return {
          diagnosis,
          fixApplied: `cleared_${staleLogs.count}_stale_running_crons`,
          success: true,
          before,
          after: { clearedStaleRuns: staleLogs.count },
        };
      }
    }

    // 4. For any cron: clean up stale "running" CronJobLog entries from this specific cron
    //    Skip dedup markers (result_summary contains dedup_marker: true) — they are
    //    informational entries, not actual stuck jobs. Previously this caused false
    //    failures on content-builder every 15 minutes.
    const staleSelfLogs = await prisma.cronJobLog.updateMany({
      where: {
        job_name: cronName,
        status: "running",
        started_at: { lt: new Date(Date.now() - 15 * 60 * 1000) },
        NOT: {
          result_summary: { path: ["dedup_marker"], equals: true },
        },
      },
      data: {
        status: "failed",
        error_message: `[diagnostic-agent] Marked failed — ${cronName} was stuck in "running" >15min`,
        completed_at: new Date(),
      },
    });

    if (staleSelfLogs.count > 0) {
      return {
        diagnosis,
        fixApplied: `cleared_${staleSelfLogs.count}_stale_${cronName}_runs`,
        success: true,
        before,
        after: { clearedRuns: staleSelfLogs.count },
      };
    }

    // No downstream damage found — log for visibility
    return {
      diagnosis,
      fixApplied: "no_downstream_damage",
      success: true,
      before,
      after: { note: `${cronName} failed but no stuck resources found` },
    };
  } catch (err) {
    return {
      diagnosis,
      fixApplied: "cron_fix_error",
      success: false,
      before,
      after: {},
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function applyDiagnosticFix(diagnosis: Diagnosis): Promise<DiagnosticFix> {
  const { prisma } = await import("@/lib/db");

  if (diagnosis.targetType !== "draft") {
    // Cron failures: attempt targeted remediation based on error category
    return applyCronFix(diagnosis);
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
        // The assembly phase has a raw fallback at attempts >= 2 (phases.ts:588)
        // that concatenates sections directly without AI. Resetting to 0 would cause
        // it to try the AI call again, which will just timeout — creating an infinite loop.
        // Ensure attempts >= 2 so the raw fallback fires on the very next builder run.
        if (draft.current_phase === "assembly") {
          const newAttempts = Math.max(draft.phase_attempts || 0, 2);
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

        // Non-assembly phases: Reduce attempts by 2 (not reset to 0) and unlock.
        // Reducing by 2 gives the draft 2 more chances while preserving lifetime history.
        // But if already at permanent cap (5+), reject instead of reducing — prevents
        // infinite loops where diagnostic-agent keeps resurrecting permanently failed drafts.
        if ((draft.phase_attempts || 0) >= 5) {
          await prisma.articleDraft.update({
            where: { id: draft.id },
            data: {
              current_phase: "rejected",
              last_error: "MAX_RECOVERIES_EXCEEDED",
              updated_at: new Date(),
            },
          });
          return {
            diagnosis,
            fixApplied: "permanently_rejected_at_cap",
            success: true,
            before,
            after: { phase: "rejected", attempts: draft.phase_attempts, phase_started_at: null },
          };
        }

        // If attempts=0, just clear stale lock — reducing 0 by 2 is a no-op
        if ((draft.phase_attempts || 0) === 0 && draft.phase_started_at) {
          await prisma.articleDraft.update({
            where: { id: draft.id },
            data: {
              phase_started_at: null,
              last_error: `[diagnostic-agent] Cleared stale lock from ${diagnosis.category} (0 attempts, lock was stale)`,
              updated_at: new Date(),
            },
          });
          return {
            diagnosis,
            fixApplied: "unlock_stale_lock",
            success: true,
            before,
            after: { phase: draft.current_phase, attempts: 0, phase_started_at: null },
          };
        }

        const reducedAttempts = Math.max((draft.phase_attempts || 0) - 2, 0);
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: {
            phase_attempts: reducedAttempts,
            phase_started_at: null,
            last_error: `[diagnostic-agent-reset] Reduced from ${diagnosis.category} — was ${diagnosis.attempts} attempts, now ${reducedAttempts}`,
            updated_at: new Date(),
          },
        });
        return {
          diagnosis,
          fixApplied: "reduce_attempts_and_unlock",
          success: true,
          before,
          after: { phase: draft.current_phase, attempts: reducedAttempts, phase_started_at: null },
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
              // Don't reset to 0 — preserve lifetime history. New phase gets a fresh start
              // but the total attempt count is remembered for the permanent cap.
              phase_attempts: Math.max((draft.phase_attempts || 0) - 2, 0),
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

        // For other stuck phases, mark as needs_manual_review if 5+ attempts
        // Unified cap: all recovery paths use 5 as the permanent failure threshold.
        if ((diagnosis.attempts || 0) >= 5) {
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

        // Otherwise, reduce attempts by 2 for retry (not reset to 0 — prevents infinite loops)
        const loopReducedAttempts = Math.max((draft.phase_attempts || 0) - 2, 0);
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: {
            phase_attempts: loopReducedAttempts,
            phase_started_at: null,
            last_error: `[diagnostic-agent-reset] Reduced stuck_loop from ${draft.phase_attempts} to ${loopReducedAttempts}`,
            updated_at: new Date(),
          },
        });
        return {
          diagnosis,
          fixApplied: "reduce_attempts",
          success: true,
          before,
          after: { phase: draft.current_phase, attempts: loopReducedAttempts },
        };
      }

      case "bad_data": {
        // Check permanent cap FIRST — prevents infinite loops where bad_data keeps
        // resetting attempts to 0 and the draft fails with the same error forever.
        const bdAttempts = draft.phase_attempts || 0;
        if (bdAttempts >= 5) {
          await prisma.articleDraft.update({
            where: { id: draft.id },
            data: { current_phase: "rejected", last_error: "MAX_RECOVERIES_EXCEEDED", updated_at: new Date() },
          });
          return { diagnosis, fixApplied: "permanently_rejected_at_cap", success: true, before, after: { phase: "rejected", attempts: bdAttempts } };
        }

        // Try to repair JSON fields
        let repaired = false;
        const updateData: Record<string, unknown> = { updated_at: new Date() };

        if (draft.current_phase === "drafting" || draft.current_phase === "assembly") {
          const sections = draft.sections_data;
          if (sections && !Array.isArray(sections)) {
            updateData.sections_data = [];
            updateData.sections_completed = 0;
            updateData.current_phase = "drafting";
            // Reduce by 2 instead of resetting to 0 — preserves lifetime history
            updateData.phase_attempts = Math.max(bdAttempts - 2, 0);
            repaired = true;
          }
        }

        if (repaired) {
          await prisma.articleDraft.update({ where: { id: draft.id }, data: updateData });
          return { diagnosis, fixApplied: "repair_json_data", success: true, before, after: updateData };
        }

        // Can't auto-repair — reduce by 2 for retry (NOT reset to 0)
        const bdReduced = Math.max(bdAttempts - 2, 0);
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: { phase_attempts: bdReduced, phase_started_at: null, updated_at: new Date() },
        });
        return { diagnosis, fixApplied: "reduce_attempts_bad_data", success: true, before, after: { phase: draft.current_phase, attempts: bdReduced } };
      }

      case "provider_down": {
        // Check permanent cap FIRST — prevents infinite loops when provider stays down
        const pdAttempts = draft.phase_attempts || 0;
        if (pdAttempts >= 5) {
          await prisma.articleDraft.update({
            where: { id: draft.id },
            data: { current_phase: "rejected", last_error: "MAX_RECOVERIES_EXCEEDED", updated_at: new Date() },
          });
          return { diagnosis, fixApplied: "permanently_rejected_at_cap", success: true, before, after: { phase: "rejected", attempts: pdAttempts } };
        }
        // Reduce by 2 instead of resetting to 0 — preserves lifetime history
        const pdReduced = Math.max(pdAttempts - 2, 0);
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: { phase_attempts: pdReduced, phase_started_at: null, updated_at: new Date() },
        });
        return { diagnosis, fixApplied: "reduce_for_provider_retry", success: true, before, after: { phase: draft.current_phase, attempts: pdReduced } };
      }

      case "schema_mismatch": {
        // Schema mismatches indicate code bugs (wrong field names, missing required fields).
        // These can't be auto-fixed by resetting attempts — the same code will crash again.
        // Log a critical alert and reject the draft to prevent infinite retry loops.
        console.error(`[diagnostic-agent] SCHEMA MISMATCH detected for draft ${draft.id} in phase "${draft.current_phase}": ${diagnosis.details}`);
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: {
            current_phase: "rejected",
            rejection_reason: `[diagnostic-agent] Schema mismatch — requires code fix: ${diagnosis.details}`,
            completed_at: new Date(),
            updated_at: new Date(),
          },
        });
        return {
          diagnosis,
          fixApplied: "rejected_schema_mismatch",
          success: true,
          before,
          after: { phase: "rejected" },
        };
      }

      default: {
        // Unknown — check permanent cap first, then reduce attempts
        const unkAttempts = draft.phase_attempts || 0;
        if (unkAttempts >= 5) {
          await prisma.articleDraft.update({
            where: { id: draft.id },
            data: { current_phase: "rejected", last_error: "MAX_RECOVERIES_EXCEEDED", updated_at: new Date() },
          });
          return { diagnosis, fixApplied: "permanently_rejected_at_cap", success: true, before, after: { phase: "rejected", attempts: unkAttempts } };
        }

        // If attempts=0 but draft is stuck (stale phase_started_at lock >2h),
        // just clear the lock — no need to "reduce" attempts. Previously this
        // was a no-op (Math.max(0-2, 0) = 0) generating 25+ useless log entries.
        if (unkAttempts === 0 && draft.phase_started_at) {
          await prisma.articleDraft.update({
            where: { id: draft.id },
            data: {
              phase_started_at: null,
              last_error: `[diagnostic-agent] Cleared stale lock (was ${Math.round((Date.now() - new Date(draft.phase_started_at).getTime()) / 60000)}min old, 0 attempts)`,
              updated_at: new Date(),
            },
          });
          return { diagnosis, fixApplied: "unlock_stale_lock", success: true, before, after: { phase: draft.current_phase, attempts: 0, phase_started_at: null } };
        }

        const unkReduced = Math.max(unkAttempts - 2, 0);
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: { phase_attempts: unkReduced, phase_started_at: null, updated_at: new Date() },
        });
        return { diagnosis, fixApplied: "reduce_attempts_generic", success: true, before, after: { phase: draft.current_phase, attempts: unkReduced } };
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
  if (!fix.success || fix.fixApplied === "logged_only" || fix.fixApplied === "none" || fix.fixApplied === "no_downstream_damage" || fix.fixApplied === "cron_fix_error") {
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

  // ─── Phase 4: DUPLICATE TITLE CHECK + AUTO-UNPUBLISH ─────────────────
  // Scan published articles for near-duplicate titles. When found, unpublish
  // the worse copy (lower SEO score, shorter content, newer).
  // Previously this only counted duplicates but never fixed them — the sweep
  // reported "Duplicate titles found: 5" every 2 hours with no remediation.
  let duplicateCount = 0;
  let duplicatesFixed = 0;
  try {
    const { prisma } = await import("@/lib/db");
    const { getActiveSiteIds } = await import("@/config/sites");

    const normalizeTitle = (t: string) => t.toLowerCase()
      .replace(/\b20\d{2}\b/g, '')
      .replace(/\b(comparison|guide|review|complete|ultimate|best|top)\b/g, '')
      .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

    for (const sid of getActiveSiteIds()) {
      const published = await prisma.blogPost.findMany({
        where: { siteId: sid, published: true, deletedAt: null },
        select: { id: true, slug: true, title_en: true, seo_score: true, content_en: true, created_at: true },
      });

      // Group by normalized title
      const groups = new Map<string, typeof published>();
      for (const post of published) {
        const normalized = normalizeTitle(post.title_en);
        if (normalized.length < 10) continue;
        if (!groups.has(normalized)) groups.set(normalized, []);
        groups.get(normalized)!.push(post);
      }

      for (const [, group] of groups) {
        if (group.length < 2) continue;
        duplicateCount += group.length - 1;

        // Pick the best version: highest SEO score → longest content → oldest (first created)
        const sorted = [...group].sort((a, b) => {
          if ((a.seo_score || 0) !== (b.seo_score || 0)) return (b.seo_score || 0) - (a.seo_score || 0);
          const aw = a.content_en.replace(/<[^>]*>/g, '').split(/\s+/).length;
          const bw = b.content_en.replace(/<[^>]*>/g, '').split(/\s+/).length;
          if (aw !== bw) return bw - aw;
          return a.created_at.getTime() - b.created_at.getTime();
        });

        // Unpublish all except best
        for (let d = 1; d < sorted.length; d++) {
          console.warn(`[diagnostic] Unpublishing duplicate: "${sorted[d].slug}" (duplicate of "${sorted[0].slug}", site: ${sid})`);
          await prisma.blogPost.update({
            where: { id: sorted[d].id },
            data: { published: false },
          });
          duplicatesFixed++;
        }
      }
    }
  } catch (e) {
    console.warn("[diagnostic] Duplicate check failed:", e instanceof Error ? e.message : e);
  }

  const summary = allDiagnoses.length === 0 && duplicateCount === 0
    ? "All clear — no stuck drafts, failed crons, or duplicate titles"
    : `Diagnosed ${allDiagnoses.length} issues (${draftDiagnoses.length} drafts, ${cronDiagnoses.length} crons). Fixed: ${fixedCount}, Failed: ${failedCount}. Duplicate titles: ${duplicateCount} found, ${duplicatesFixed} unpublished`;

  return {
    timestamp: new Date().toISOString(),
    stuckDrafts: draftDiagnoses.length,
    failedCrons: cronDiagnoses.length,
    diagnoses: allDiagnoses,
    fixes,
    verifications,
    summary,
    duplicateTitles: duplicateCount,
  };
}
