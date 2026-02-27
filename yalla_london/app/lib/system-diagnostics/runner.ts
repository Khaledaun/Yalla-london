/**
 * Diagnostic Runner — Orchestrates all diagnostic sections
 *
 * Runs test sections sequentially within a time budget (50s default).
 * Each section is independently try/caught so one failure doesn't block others.
 * Returns structured results for the diagnostics API to persist and display.
 */

import type { DiagnosticResult, DiagnosticRunResult, DiagnosticSection } from "./types";

// ── Section Registry ──────────────────────────────────────────────────────────

const SECTION_MAP: Record<string, () => Promise<{ default: DiagnosticSection }>> = {
  general: () => import("./sections/general"),
  pipeline: () => import("./sections/pipeline"),
  indexing: () => import("./sections/indexing"),
  seo: () => import("./sections/seo"),
  crons: () => import("./sections/crons"),
  yachts: () => import("./sections/yachts"),
  commerce: () => import("./sections/commerce"),
  security: () => import("./sections/security"),
  "ai-costs": () => import("./sections/ai-models"),
};

// ── Env Var Scanner ───────────────────────────────────────────────────────────

const CRITICAL_ENV_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
];

const IMPORTANT_ENV_VARS = [
  "XAI_API_KEY",
  "GROK_API_KEY",
  "INDEXNOW_KEY",
  "CRON_SECRET",
  "GOOGLE_CLIENT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
  "GA4_PROPERTY_ID",
  "GSC_SITE_URL",
  "ADMIN_EMAILS",
];

function scanEnvVars(): { confirmed: string[]; missing: string[] } {
  const confirmed: string[] = [];
  const missing: string[] = [];

  for (const v of [...CRITICAL_ENV_VARS, ...IMPORTANT_ENV_VARS]) {
    if (process.env[v]) {
      confirmed.push(v);
    } else {
      missing.push(v);
    }
  }

  return { confirmed, missing };
}

// ── Main Runner ───────────────────────────────────────────────────────────────

export async function runDiagnosticGroups(
  groups: string[],
  siteId: string,
  budgetMs: number = 50_000,
  startTime: number = Date.now(),
): Promise<DiagnosticRunResult> {
  const allResults: DiagnosticResult[] = [];

  // Scan env vars first (instant, no budget cost)
  const { confirmed: envConfirmed, missing: envMissing } = scanEnvVars();

  // Run each group section sequentially within budget
  for (const group of groups) {
    // Budget check before each section
    if (Date.now() - startTime > budgetMs - 5_000) {
      allResults.push({
        id: `budget-exceeded-${group}`,
        section: group,
        name: "Budget Exceeded",
        status: "warn",
        detail: `Skipped "${group}" — not enough time remaining (${Math.round((Date.now() - startTime) / 1000)}s used of ${Math.round(budgetMs / 1000)}s budget)`,
        explanation: "The diagnostic runner has a time budget to avoid Vercel timeouts. This section was skipped because previous sections took too long. Try running this group individually.",
      });
      continue;
    }

    const loader = SECTION_MAP[group];
    if (!loader) {
      allResults.push({
        id: `unknown-group-${group}`,
        section: group,
        name: "Unknown Group",
        status: "warn",
        detail: `No diagnostic section registered for group "${group}"`,
        explanation: `The group "${group}" does not have any diagnostic tests registered.`,
      });
      continue;
    }

    try {
      const sectionModule = await loader();
      const sectionFn = sectionModule.default;
      const sectionStart = Date.now();
      const results = await sectionFn(siteId, budgetMs, startTime);

      // Tag each result with timing
      for (const r of results) {
        if (!r.durationMs) r.durationMs = Date.now() - sectionStart;
      }

      allResults.push(...results);
    } catch (sectionErr) {
      const msg = sectionErr instanceof Error ? sectionErr.message : String(sectionErr);
      console.error(`[diagnostics] Section "${group}" crashed:`, msg);
      allResults.push({
        id: `section-crash-${group}`,
        section: group,
        name: `${group} Section Error`,
        status: "fail",
        detail: `Section crashed: ${msg}`,
        explanation: `The "${group}" diagnostic section encountered an unexpected error. This usually indicates a code issue in the test itself.`,
      });
    }
  }

  return { results: allResults, envConfirmed, envMissing };
}
