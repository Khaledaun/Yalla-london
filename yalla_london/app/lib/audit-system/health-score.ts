/**
 * Health Score Calculator — Computes a 0-100 site health score from audit issues.
 *
 * Scoring: Start at 100, deduct per issue weighted by severity.
 * P0 (Blocker) = -15 each
 * P1 (High)    = -8 each
 * P2 (Medium)  = -3 each
 *
 * Uses diminishing returns per category to prevent a single category
 * (e.g., 50 missing meta descriptions) from driving the score to 0.
 * Max deduction per category = 40 points.
 */

import type { IssueSeverity, IssueCategory } from './types';

const SEVERITY_WEIGHTS: Record<string, number> = {
  P0: 15,
  P1: 8,
  P2: 3,
};

const MAX_DEDUCTION_PER_CATEGORY = 40;

export interface HealthScoreInput {
  severity: string;
  category: string;
}

export interface HealthScoreBreakdown {
  score: number;
  deductions: Record<string, number>;
  totalDeduction: number;
}

/**
 * Compute site health score from a list of issues.
 * Returns a score between 0 and 100, plus a breakdown of deductions by category.
 */
export function computeHealthScore(
  issues: HealthScoreInput[]
): HealthScoreBreakdown {
  const deductionsByCategory: Record<string, number> = {};

  for (const issue of issues) {
    const weight = SEVERITY_WEIGHTS[issue.severity] ?? 3;
    const cat = issue.category;

    if (!deductionsByCategory[cat]) {
      deductionsByCategory[cat] = 0;
    }

    // Diminishing returns: cap per category
    const currentDeduction = deductionsByCategory[cat];
    if (currentDeduction < MAX_DEDUCTION_PER_CATEGORY) {
      const remaining = MAX_DEDUCTION_PER_CATEGORY - currentDeduction;
      deductionsByCategory[cat] += Math.min(weight, remaining);
    }
  }

  const totalDeduction = Object.values(deductionsByCategory).reduce(
    (sum, d) => sum + d,
    0
  );

  return {
    score: Math.max(0, 100 - totalDeduction),
    deductions: deductionsByCategory,
    totalDeduction,
  };
}

/**
 * Determine health trend by comparing current and previous scores.
 */
export function computeHealthTrend(
  current: number | null,
  previous: number | null
): 'improving' | 'declining' | 'stable' | 'unknown' {
  if (current === null || previous === null) return 'unknown';
  const diff = current - previous;
  if (diff > 3) return 'improving';
  if (diff < -3) return 'declining';
  return 'stable';
}
