/**
 * A/B test statistics — z-test for two-proportion hypothesis.
 *
 * Used to declare winners + compute confidence for AbTest rows.
 */

export interface AbTestCounters {
  impressionsA: number;
  impressionsB: number;
  successesA: number; // clicks or conversions depending on primaryMetric
  successesB: number;
}

export interface AbTestResult {
  rateA: number;
  rateB: number;
  lift: number; // (rateB - rateA) / rateA, 0 if rateA === 0
  zScore: number;
  pValue: number;
  confidence: number; // 1 - pValue, clamped 0-1
  winner: "A" | "B" | "tie" | "inconclusive";
  sampleSufficient: boolean; // true if both arms have ≥100 impressions
}

const MIN_IMPRESSIONS = 100;
const CONFIDENCE_THRESHOLD = 0.95;

/**
 * Compute z-score + p-value for two-proportion difference.
 * Returns "inconclusive" if sample size below threshold.
 */
export function computeAbTestResult(c: AbTestCounters): AbTestResult {
  const nA = c.impressionsA;
  const nB = c.impressionsB;
  const xA = c.successesA;
  const xB = c.successesB;

  const rateA = nA > 0 ? xA / nA : 0;
  const rateB = nB > 0 ? xB / nB : 0;
  const lift = rateA > 0 ? (rateB - rateA) / rateA : 0;

  const sampleSufficient = nA >= MIN_IMPRESSIONS && nB >= MIN_IMPRESSIONS;

  if (!sampleSufficient || nA === 0 || nB === 0) {
    return {
      rateA,
      rateB,
      lift,
      zScore: 0,
      pValue: 1,
      confidence: 0,
      winner: "inconclusive",
      sampleSufficient,
    };
  }

  // Pooled proportion
  const pooled = (xA + xB) / (nA + nB);
  const variance = pooled * (1 - pooled) * (1 / nA + 1 / nB);
  if (variance <= 0) {
    return {
      rateA,
      rateB,
      lift,
      zScore: 0,
      pValue: 1,
      confidence: 0,
      winner: rateA === rateB ? "tie" : rateB > rateA ? "B" : "A",
      sampleSufficient,
    };
  }

  const zScore = (rateB - rateA) / Math.sqrt(variance);
  const pValue = 2 * (1 - standardNormalCdf(Math.abs(zScore)));
  const confidence = Math.max(0, Math.min(1, 1 - pValue));

  let winner: "A" | "B" | "tie" | "inconclusive";
  if (confidence < CONFIDENCE_THRESHOLD) {
    winner = "inconclusive";
  } else if (Math.abs(rateB - rateA) < 0.0001) {
    winner = "tie";
  } else if (rateB > rateA) {
    winner = "B";
  } else {
    winner = "A";
  }

  return {
    rateA,
    rateB,
    lift,
    zScore,
    pValue,
    confidence,
    winner,
    sampleSufficient,
  };
}

/**
 * Standard normal CDF approximation (Abramowitz & Stegun 26.2.17).
 * Accurate to ~7.5e-8 — sufficient for test confidence intervals.
 */
function standardNormalCdf(x: number): number {
  // Constants
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * absX);
  const y =
    1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return 0.5 * (1 + sign * y);
}
