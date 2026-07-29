/**
 * System Health Audit — Types
 *
 * Shared TypeScript interfaces for the 47-check health audit system.
 */

export type CheckStatus = "pass" | "warn" | "fail" | "skip";

export interface CheckResult {
  status: CheckStatus;
  score: number; // 0-100
  durationMs: number;
  details: Record<string, unknown>;
  error?: string;
  action?: string;
  timestamp: string;
}

export interface SectionResult {
  status: CheckStatus;
  score: number;
  checks: Record<string, CheckResult>;
}

export interface AuditSummary {
  totalChecks: number;
  passed: number;
  warnings: number;
  failed: number;
  skipped: number;
}

export interface AuditReport {
  id: string;
  timestamp: string;
  durationMs: number;
  environment: string;
  siteUrl: string;
  siteId: string;
  overallScore: number;
  overallStatus: "healthy" | "degraded" | "unhealthy";
  summary: AuditSummary;
  sections: Record<string, SectionResult>;
}

export interface AuditConfig {
  siteUrl: string;
  siteId: string;
  /** Abort signal for per-check timeout */
  signal?: AbortSignal;
}

/** Convenience type for check functions */
export type CheckFn = (config: AuditConfig) => Promise<CheckResult>;

/** Helper to create a check result */
export function makeResult(
  status: CheckStatus,
  details: Record<string, unknown>,
  opts?: { error?: string; action?: string }
): Omit<CheckResult, "durationMs" | "timestamp"> {
  return {
    status,
    score: status === "pass" ? 100 : status === "warn" ? 50 : status === "skip" ? -1 : 0,
    details,
    ...(opts?.error && { error: opts.error }),
    ...(opts?.action && { action: opts.action }),
  };
}

/** Run a single check with timeout and error handling */
export async function runCheck(
  name: string,
  fn: CheckFn,
  config: AuditConfig,
  timeoutMs = 10_000
): Promise<CheckResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await fn({ ...config, signal: controller.signal });
    return { ...result, durationMs: Date.now() - start, timestamp: new Date().toISOString() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: "fail",
      score: 0,
      durationMs: Date.now() - start,
      details: {},
      error: msg,
      action: `Check "${name}" threw an unexpected error. Review server logs.`,
      timestamp: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
}
