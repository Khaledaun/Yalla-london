// ── System Diagnostics Type Definitions ───────────────────────────────────────

/** Status of a single diagnostic test */
export type DiagnosticStatus = "pass" | "warn" | "fail";

/** A fix action that can be executed from the UI */
export interface FixAction {
  /** Unique identifier for this fix */
  id: string;
  /** Button label shown to user (e.g., "Fix Database Schema") */
  label: string;
  /** API endpoint to call (e.g., "/api/admin/db-migrate") */
  api: string;
  /** HTTP method (defaults to POST) */
  method?: "GET" | "POST" | "PUT";
  /** JSON body to send with the request */
  payload?: Record<string, unknown>;
  /** Which diagnostic group to re-run after fix is applied */
  rerunGroup?: string;
}

/** Result of a single diagnostic test */
export interface DiagnosticResult {
  /** Unique test identifier (e.g., "general-db-connection") */
  id: string;
  /** Group/section this test belongs to (e.g., "general") */
  section: string;
  /** Short name of the test (e.g., "Database Connection") */
  name: string;
  /** Pass/warn/fail status */
  status: DiagnosticStatus;
  /** Technical detail of what happened (e.g., "Connected in 45ms") */
  detail: string;
  /** Human-readable diagnosis when status is warn/fail */
  diagnosis?: string;
  /** Plain-English explanation of what this test does and why it matters */
  explanation: string;
  /** Available fix action (only when status is warn/fail) */
  fixAction?: FixAction;
  /** Duration of this specific test in ms */
  durationMs?: number;
}

/** Output from running a set of diagnostic groups */
export interface DiagnosticRunResult {
  results: DiagnosticResult[];
  envConfirmed: string[];
  envMissing: string[];
  /** Total wall-clock duration of the run in ms */
  durationMs: number;
  /** Computed health score 0-100 */
  healthScore: number;
  /** Overall system verdict */
  verdict: DiagnosticVerdict;
}

/** A diagnostic section function */
export type DiagnosticSection = (
  siteId: string,
  budgetMs: number,
  startTime: number,
) => Promise<DiagnosticResult[]>;

/** Verdict levels */
export type DiagnosticVerdict =
  | "ALL_SYSTEMS_GO"
  | "OPERATIONAL"
  | "NEEDS_ATTENTION"
  | "CRITICAL"
  | "UNKNOWN";

/** Fix execution result */
export interface FixResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}
