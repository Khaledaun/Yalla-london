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
  "GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL",
  "GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY",
  "GA4_PROPERTY_ID",
  "GSC_SITE_URL",
  "ADMIN_EMAILS",
];

// Alternate env var names (some vars have legacy aliases)
const ENV_VAR_ALTS: Record<string, string> = {
  GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL: "GSC_CLIENT_EMAIL",
  GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY: "GSC_PRIVATE_KEY",
};

function scanEnvVars(): { confirmed: string[]; missing: string[] } {
  const confirmed: string[] = [];
  const missing: string[] = [];

  for (const v of [...CRITICAL_ENV_VARS, ...IMPORTANT_ENV_VARS]) {
    const alt = ENV_VAR_ALTS[v];
    if (process.env[v] || (alt && process.env[alt])) {
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

  // Compute aggregate metrics
  const durationMs = Date.now() - startTime;
  const total = allResults.length;
  const passCount = allResults.filter((r) => r.status === "pass").length;
  const warnCount = allResults.filter((r) => r.status === "warn").length;
  const failCount = allResults.filter((r) => r.status === "fail").length;
  const healthScore = total > 0 ? Math.round(((passCount + warnCount * 0.5) / total) * 100) : 0;
  const verdict =
    failCount === 0 && warnCount === 0
      ? "ALL_SYSTEMS_GO" as const
      : failCount === 0
        ? "OPERATIONAL" as const
        : failCount <= 3
          ? "NEEDS_ATTENTION" as const
          : "CRITICAL" as const;

  return { results: allResults, envConfirmed, envMissing, durationMs, healthScore, verdict };
}
