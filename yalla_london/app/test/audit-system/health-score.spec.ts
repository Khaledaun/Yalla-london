/**
 * Unit tests for health score computation.
 */

import { computeHealthScore, computeHealthTrend } from '../../lib/audit-system/health-score';

describe('computeHealthScore', () => {
  it('returns 100 for zero issues', () => {
    const result = computeHealthScore([]);
    expect(result.score).toBe(100);
    expect(result.totalDeduction).toBe(0);
  });

  it('deducts 15 per P0 issue', () => {
    const result = computeHealthScore([
      { severity: 'P0', category: 'http' },
    ]);
    expect(result.score).toBe(85);
    expect(result.deductions.http).toBe(15);
  });

  it('deducts 8 per P1 issue', () => {
    const result = computeHealthScore([
      { severity: 'P1', category: 'canonical' },
    ]);
    expect(result.score).toBe(92);
  });

  it('deducts 3 per P2 issue', () => {
    const result = computeHealthScore([
      { severity: 'P2', category: 'metadata' },
    ]);
    expect(result.score).toBe(97);
  });

  it('applies diminishing returns per category (max 40)', () => {
    // 10 P0 issues in same category = 10 * 15 = 150 → capped at 40
    const issues = Array.from({ length: 10 }, () => ({
      severity: 'P0',
      category: 'http',
    }));
    const result = computeHealthScore(issues);
    expect(result.deductions.http).toBe(40);
    expect(result.score).toBe(60);
  });

  it('deducts from multiple categories independently', () => {
    const result = computeHealthScore([
      { severity: 'P0', category: 'http' },     // -15
      { severity: 'P1', category: 'canonical' }, // -8
      { severity: 'P2', category: 'metadata' },  // -3
    ]);
    expect(result.score).toBe(100 - 15 - 8 - 3); // 74
    expect(result.deductions.http).toBe(15);
    expect(result.deductions.canonical).toBe(8);
    expect(result.deductions.metadata).toBe(3);
  });

  it('floors at 0', () => {
    // Many severe issues across many categories should floor at 0
    const issues = [];
    const categories = ['http', 'canonical', 'hreflang', 'sitemap', 'schema', 'links', 'metadata', 'robots'];
    for (const cat of categories) {
      for (let i = 0; i < 5; i++) {
        issues.push({ severity: 'P0', category: cat });
      }
    }
    const result = computeHealthScore(issues);
    expect(result.score).toBe(0);
  });

  it('handles unknown severity gracefully (defaults to 3)', () => {
    const result = computeHealthScore([
      { severity: 'UNKNOWN', category: 'http' },
    ]);
    expect(result.score).toBe(97); // defaults to weight 3
  });

  it('caps partial remaining within category', () => {
    // 3 P0s = 45 → capped at 40
    const result = computeHealthScore([
      { severity: 'P0', category: 'http' },
      { severity: 'P0', category: 'http' },
      { severity: 'P0', category: 'http' },
    ]);
    expect(result.deductions.http).toBe(40);
    expect(result.score).toBe(60);
  });

  it('returns breakdown with correct categories', () => {
    const result = computeHealthScore([
      { severity: 'P1', category: 'links' },
      { severity: 'P2', category: 'links' },
      { severity: 'P0', category: 'schema' },
    ]);
    expect(Object.keys(result.deductions).sort()).toEqual(['links', 'schema']);
  });
});

describe('computeHealthTrend', () => {
  it('returns "improving" when score increased by >3', () => {
    expect(computeHealthTrend(85, 75)).toBe('improving');
  });

  it('returns "declining" when score decreased by >3', () => {
    expect(computeHealthTrend(70, 80)).toBe('declining');
  });

  it('returns "stable" when score changed by ≤3', () => {
    expect(computeHealthTrend(82, 80)).toBe('stable');
    expect(computeHealthTrend(78, 80)).toBe('stable');
    expect(computeHealthTrend(80, 80)).toBe('stable');
  });

  it('returns "unknown" when current is null', () => {
    expect(computeHealthTrend(null, 80)).toBe('unknown');
  });

  it('returns "unknown" when previous is null', () => {
    expect(computeHealthTrend(80, null)).toBe('unknown');
  });

  it('returns "unknown" when both are null', () => {
    expect(computeHealthTrend(null, null)).toBe('unknown');
  });
});
