/**
 * PIPELINE CONSTANTS — Single source of truth for all retry/budget/threshold values.
 *
 * RULE: Every file in the content pipeline (build-runner, phases, failure-hooks,
 * diagnostic-agent, sweeper, select-runner) MUST import these values. NEVER
 * hardcode retry counts, budget values, or threshold numbers inline.
 *
 * When changing a value here, search for its name across the codebase to verify
 * all consumers still behave correctly.
 */

// ─── Phase Attempt Caps ─────────────────────────────────────────────────────
// How many times each phase can fail before the draft is rejected.
// Drafting is highest because multi-section articles need 2-3 cron runs.
// Assembly is medium because raw HTML fallback triggers at >= 2 attempts.
export const MAX_ATTEMPTS = {
  drafting: 8,   // 6-8 section articles need multiple runs; each timeout = 1 attempt
  assembly: 5,   // Raw fallback fires at attempts >= 2; extra margin for edge cases
  research: 3,
  outline: 3,
  images: 3,
  seo: 3,
  scoring: 3,
} as const;

export function getMaxAttempts(phase: string): number {
  return (MAX_ATTEMPTS as Record<string, number>)[phase] ?? 3;
}

// ─── Lifetime Recovery Cap ──────────────────────────────────────────────────
// After this many total recovery attempts across ALL mechanisms (failure-hooks,
// diagnostic-agent, sweeper), the draft is permanently rejected with
// MAX_RECOVERIES_EXCEEDED. Prevents infinite resurrection loops.
export const LIFETIME_RECOVERY_CAP = 5;

// ─── Assembly Raw Fallback ──────────────────────────────────────────────────
// When assembly phase_attempts >= this value, skip AI entirely and concatenate
// raw HTML sections. Also triggers when budget < ASSEMBLY_BUDGET_THRESHOLD_MS.
export const ASSEMBLY_RAW_FALLBACK_ATTEMPTS = 2;
export const ASSEMBLY_BUDGET_THRESHOLD_MS = 20_000; // 20 seconds

// ─── Drafting Budget ────────────────────────────────────────────────────────
// Time per section (used to calculate maxSectionsThisRun).
// Conservative: Arabic sections can take 45-60s. 60s prevents overcommitting.
export const SECTION_BUDGET_MS = 60_000;
// Minimum budget to attempt a section (AI call ~10s + DB save ~2s).
export const MIN_SECTION_BUDGET_MS = 12_000;

// ─── Content Selector ───────────────────────────────────────────────────────
// Stale marker cleanup: marks "started" entries older than this as "failed".
// Previous value of 5 minutes blocked publishing for 4+ min after any crash.
// Max budget is 53s + overhead ≈ 90s.
export const SELECTOR_STALE_MARKER_MS = 90_000; // 90 seconds
// Dedup: skip if another content-selector started within this window.
export const SELECTOR_DEDUP_WINDOW_MS = 60_000; // 60 seconds

// ─── AI Provider Budget ─────────────────────────────────────────────────────
// First provider gets this share of total budget. Remaining split among fallbacks.
export const AI_FIRST_PROVIDER_SHARE = {
  light: 0.45,    // Quick tasks (meta generation): balanced split
  medium: 0.50,   // Standard tasks (section drafting): balanced
  heavy: 0.55,    // Complex tasks (campaign enhance): slightly more to first
  default: 0.50,  // Backwards compatible
} as const;
// Minimum time per provider to make a meaningful API call.
export const AI_MIN_PROVIDER_MS = 5_000;
// Skip provider if less than this remaining in total budget.
export const AI_BUDGET_SKIP_MS = 2_000;

// ─── Diagnostic Agent ───────────────────────────────────────────────────────
// Reject drafts stuck in drafting longer than this (based on created_at).
export const DRAFTING_BACKLOG_REJECT_HOURS = 24;
// Reject any draft stuck in ANY phase longer than this.
export const GENERAL_STUCK_REJECT_HOURS = 24;
// Reject drafts stuck >12h with 2+ failed attempts.
export const STUCK_WITH_ATTEMPTS_REJECT_HOURS = 12;

// ─── Indexing ───────────────────────────────────────────────────────────────
// Never-submitted pages batch size per content-auto-fix-lite run.
export const NEVER_SUBMITTED_BATCH_SIZE = 200;
// IndexNow chronic failure cap: stop submitting after this many failed attempts.
export const INDEXNOW_CHRONIC_FAILURE_CAP = 15;

// ─── Active Draft Exclusion ─────────────────────────────────────────────────
// Drafts not updated within this window are considered stuck (not active).
// Prevents diagnostic-agent-touched drafts from blocking new creation.
export const ACTIVE_DRAFT_STALENESS_HOURS = 1;

// ─── Phase State Machine ────────────────────────────────────────────────────
// Valid transitions for ArticleDraft.current_phase. Any transition not in this
// map is a bug. Call validatePhaseTransition() before every phase change.
export const VALID_TRANSITIONS: Record<string, string[]> = {
  research:  ["outline", "rejected"],
  outline:   ["drafting", "rejected"],
  drafting:  ["assembly", "rejected"],
  assembly:  ["images", "rejected"],
  images:    ["seo", "rejected"],
  seo:       ["scoring", "rejected"],
  scoring:   ["reservoir", "rejected"],
  reservoir: ["promoting", "rejected"],
  promoting: ["published", "reservoir", "rejected"],
};

/**
 * Validates that a phase transition is allowed by the state machine.
 * Throws Error for invalid transitions.
 *
 * @param from - Current phase
 * @param to - Target phase
 * @throws Error if transition is not in VALID_TRANSITIONS
 */
export function validatePhaseTransition(from: string, to: string): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) {
    throw new Error(`[state-machine] Unknown source phase "${from}" — cannot transition to "${to}"`);
  }
  if (!allowed.includes(to)) {
    throw new Error(
      `[state-machine] Invalid transition: "${from}" → "${to}". Allowed: ${allowed.join(", ")}`
    );
  }
}

// ─── Enhancement Ownership ──────────────────────────────────────────────────
// Maps each post-publish modification type to the SINGLE cron that owns it.
// Before making an enhancement, check this map to confirm ownership.
export const ENHANCEMENT_OWNERS: Record<string, string> = {
  internal_links: "seo-agent",
  schema_markup: "seo-agent",
  meta_optimization: "seo-deep-review",
  heading_hierarchy: "content-auto-fix-lite",
  affiliate_links: "affiliate-injection",
  content_expansion: "seo-deep-review",
  broken_links: "content-auto-fix",
  authenticity_signals: "seo-deep-review",
};

// ─── Escalation Policy ──────────────────────────────────────────────────────
// Controls CEO Inbox alert volume and pipeline auto-pause behavior.
export const ESCALATION_POLICY = {
  MAX_DAILY_CEO_ALERTS: 10,        // After this, batch remaining into daily digest
  AUTO_PAUSE_THRESHOLD: 5,          // Critical failures in 1 hour → auto-pause pipeline
  ALERT_COOLDOWN_MINUTES: 30,       // Minimum gap between alerts for same job
  PIPELINE_MIN_SUCCESS_RATE: 0.30,  // Below 30% success rate in 4h → auto-pause
  PIPELINE_HEALTH_WINDOW_HOURS: 4,  // Window for computing success rate
};
