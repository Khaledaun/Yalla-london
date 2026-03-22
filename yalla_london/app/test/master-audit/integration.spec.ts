/**
 * Master Audit Engine — Integration Tests
 *
 * Tests the hard gate evaluation, soft gate evaluation, risk scanner wiring,
 * and report generation with realistic in-memory data (no network required).
 */
import { describe, it, expect } from 'vitest';
import type {
  AuditIssue,
  AuditConfig,
  ExtractedSignals,
  HardGateConfig,
  CrawlResult,
} from '../../lib/master-audit/types';
import { generateExecSummary, generateFixPlan } from '../../lib/master-audit/reporter';
import { scanScaledContentAbuse } from '../../lib/master-audit/risk-scanners/scaled-content';
import { scanSiteReputationAbuse } from '../../lib/master-audit/risk-scanners/site-reputation';
import { scanExpiredDomainAbuse } from '../../lib/master-audit/risk-scanners/expired-domain';

// ---------------------------------------------------------------------------
// Helpers (duplicated locally to avoid importing orchestrator internals)
// ---------------------------------------------------------------------------

const BASE_URL = 'https://www.yalla-london.com';

function evaluateHardGates(
  issues: AuditIssue[],
  hardGates: HardGateConfig[]
): Array<{ gateName: string; passed: boolean; count: number; threshold: number; urls: string[] }> {
  return hardGates.map((gate) => {
    const categoryIssues = issues.filter((i) => i.category === gate.category);
    const p0Count = categoryIssues.filter((i) => i.severity === 'P0').length;
    const totalCount = categoryIssues.length;
    const affectedUrls = [...new Set(categoryIssues.map((i) => i.url))];

    let passed = true;
    if (p0Count > gate.maxP0) passed = false;
    if (gate.maxTotal >= 0 && totalCount > gate.maxTotal) passed = false;

    return {
      gateName: gate.name,
      passed,
      count: totalCount,
      threshold: gate.maxTotal >= 0 ? gate.maxTotal : gate.maxP0,
      urls: affectedUrls,
    };
  });
}

function makeConfig(): AuditConfig {
  return {
    siteId: 'yalla-london',
    baseUrl: BASE_URL,
    crawl: {
      concurrency: 3,
      batchSize: 50,
      rateDelayMs: 100,
      timeoutMs: 10000,
      maxRetries: 2,
      retryBaseDelayMs: 500,
      maxRedirects: 3,
      userAgent: 'TestBot/1.0',
      allowedStatuses: [200, 301, 302, 304],
    },
    validators: {
      enabled: { http: true, canonical: true, hreflang: true, sitemap: true, schema: true, links: true, metadata: true, robots: true },
      titleLength: { min: 30, max: 60 },
      descriptionLength: { min: 120, max: 160 },
      expectedHreflangLangs: ['en-GB', 'ar-SA', 'x-default'],
      maxRedirectChain: 3,
      excludePatterns: [],
      maxSitemapUrls: 50000,
      requiredSchemaByRoute: { '/': ['Organization', 'WebSite'], '/blog/*': ['Article'] },
      deprecatedSchemaTypes: ['FAQPage', 'HowTo'],
      allowedCanonicalParams: [],
    },
    riskScanners: {
      enabled: {
        thinContent: true,
        duplicateContent: true,
        orphanPages: true,
        scaledContentAbuse: true,
        siteReputationAbuse: true,
        expiredDomainAbuse: true,
      },
      minWordCount: 1000,
      thinContentThreshold: 300,
      duplicateSimilarityThreshold: 0.85,
      scaledContentMinClusterSize: 3,
      entityCoverageMinScore: 0.3,
      outboundDominanceThreshold: 0.7,
      topicPivotScoreThreshold: 0.6,
    },
    hardGates: [
      { name: 'no-p0-http-errors', category: 'http', maxP0: 0, maxTotal: -1, description: 'No critical HTTP errors' },
      { name: 'no-missing-canonical', category: 'canonical', maxP0: 0, maxTotal: -1, description: 'All pages have canonical' },
      { name: 'no-broken-schema', category: 'schema', maxP0: 0, maxTotal: -1, description: 'Valid JSON-LD' },
      { name: 'no-hreflang-failures', category: 'hreflang', maxP0: 0, maxTotal: -1, description: 'Hreflang reciprocity' },
      { name: 'no-broken-internal-links', category: 'links', maxP0: 0, maxTotal: -1, description: 'No broken links' },
      { name: 'sitemap-valid', category: 'sitemap', maxP0: 0, maxTotal: -1, description: 'Sitemap is valid' },
    ],
    staticRoutes: ['/', '/blog', '/about'],
    includeArVariants: true,
    outputDir: 'docs/master-audit',
  };
}

function makeSignals(overrides?: Partial<ExtractedSignals>): ExtractedSignals {
  return {
    title: 'Test Page Title - Yalla London Guide',
    metaDescription: 'A comprehensive guide to London experiences for Arabic-speaking travelers visiting the city for the first time.',
    canonical: `${BASE_URL}/blog/test`,
    robotsMeta: null,
    hreflangAlternates: [
      { hreflang: 'en-GB', href: `${BASE_URL}/blog/test` },
      { hreflang: 'ar-SA', href: `${BASE_URL}/ar/blog/test` },
      { hreflang: 'x-default', href: `${BASE_URL}/blog/test` },
    ],
    headings: [
      { level: 1, text: 'London Travel Guide' },
      { level: 2, text: 'Best Hotels' },
      { level: 2, text: 'Fine Dining' },
    ],
    jsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'Article',
      'name': 'London Travel Guide',
      'author': { '@type': 'Person', 'name': 'Khaled Aun' },
    }],
    internalLinks: [
      { href: `${BASE_URL}/hotels`, text: 'Hotels' },
      { href: `${BASE_URL}/restaurants`, text: 'Restaurants' },
    ],
    externalLinks: [
      { href: 'https://booking.com/london', text: 'Book Now' },
    ],
    langAttr: 'en-GB',
    dirAttr: 'ltr',
    wordCount: 1500,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Hard Gate Evaluation
// ---------------------------------------------------------------------------

describe('Hard Gate Evaluation', () => {
  const config = makeConfig();

  it('all gates pass with zero issues', () => {
    const gates = evaluateHardGates([], config.hardGates);
    expect(gates.every(g => g.passed)).toBe(true);
  });

  it('HTTP gate fails with P0 HTTP issue', () => {
    const issues: AuditIssue[] = [{
      severity: 'P0',
      category: 'http',
      url: `${BASE_URL}/broken`,
      message: 'Server Error 500',
    }];
    const gates = evaluateHardGates(issues, config.hardGates);
    const httpGate = gates.find(g => g.gateName === 'no-p0-http-errors');
    expect(httpGate?.passed).toBe(false);
    expect(httpGate?.count).toBe(1);
  });

  it('schema gate fails with P0 schema issue', () => {
    const issues: AuditIssue[] = [{
      severity: 'P0',
      category: 'schema',
      url: `${BASE_URL}/blog/bad`,
      message: 'Invalid JSON-LD',
    }];
    const gates = evaluateHardGates(issues, config.hardGates);
    const schemaGate = gates.find(g => g.gateName === 'no-broken-schema');
    expect(schemaGate?.passed).toBe(false);
  });

  it('P2 issues do not fail hard gates (maxTotal=-1)', () => {
    const issues: AuditIssue[] = [{
      severity: 'P2',
      category: 'http',
      url: `${BASE_URL}/slow`,
      message: 'Slow response',
    }];
    const gates = evaluateHardGates(issues, config.hardGates);
    expect(gates.every(g => g.passed)).toBe(true);
  });

  it('maxTotal=0 gate fails on any issue', () => {
    const strictGates: HardGateConfig[] = [{
      name: 'zero-tolerance',
      category: 'links',
      maxP0: 0,
      maxTotal: 0,
      description: 'Zero link issues allowed',
    }];
    const issues: AuditIssue[] = [{
      severity: 'P2',
      category: 'links',
      url: `${BASE_URL}/page`,
      message: 'Minor link issue',
    }];
    const gates = evaluateHardGates(issues, strictGates);
    expect(gates[0].passed).toBe(false);
  });

  it('unrelated category issues do not affect gate', () => {
    const issues: AuditIssue[] = [{
      severity: 'P0',
      category: 'metadata',
      url: `${BASE_URL}/page`,
      message: 'Bad metadata',
    }];
    const gates = evaluateHardGates(issues, config.hardGates);
    const httpGate = gates.find(g => g.gateName === 'no-p0-http-errors');
    expect(httpGate?.passed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Report Generation
// ---------------------------------------------------------------------------

describe('Report Generation', () => {
  it('generates EXEC_SUMMARY.md with correct structure', () => {
    const result = {
      runId: 'test-run-001',
      siteId: 'yalla-london',
      mode: 'prod' as const,
      startTime: '2026-02-21T00:00:00Z',
      endTime: '2026-02-21T00:05:00Z',
      totalUrls: 32,
      issues: [
        { severity: 'P0' as const, category: 'http' as const, url: `${BASE_URL}/broken`, message: '500 error' },
        { severity: 'P1' as const, category: 'schema' as const, url: `${BASE_URL}/blog/a`, message: 'Deprecated type' },
        { severity: 'P2' as const, category: 'metadata' as const, url: `${BASE_URL}/about`, message: 'Short title' },
      ],
      hardGates: [
        { gateName: 'no-p0-http-errors', passed: false, count: 1, threshold: 0, urls: [`${BASE_URL}/broken`] },
        { gateName: 'no-broken-schema', passed: true, count: 1, threshold: 0, urls: [`${BASE_URL}/blog/a`] },
      ],
      softGates: [],
      urlInventory: [],
    };

    const summary = generateExecSummary(result);
    expect(summary).toContain('test-run-001');
    expect(summary).toContain('yalla-london');
    expect(summary).toContain('32');
    expect(summary).toContain('P0');
  });

  it('generates FIX_PLAN.md with issue details', () => {
    const result = {
      runId: 'test-run-002',
      siteId: 'yalla-london',
      mode: 'prod' as const,
      startTime: '2026-02-21T00:00:00Z',
      endTime: '2026-02-21T00:05:00Z',
      totalUrls: 10,
      issues: [
        {
          severity: 'P0' as const,
          category: 'http' as const,
          url: `${BASE_URL}/broken`,
          message: 'Server Error 500',
          suggestedFix: { scope: 'page-level' as const, target: `${BASE_URL}/broken`, notes: 'Fix server error' },
        },
      ],
      hardGates: [
        { gateName: 'no-p0-http-errors', passed: false, count: 1, threshold: 0, urls: [`${BASE_URL}/broken`] },
      ],
      softGates: [],
      urlInventory: [],
    };

    const fixPlan = generateFixPlan(result);
    expect(fixPlan).toContain('P0');
    expect(fixPlan).toContain('Server Error 500');
  });
});

// ---------------------------------------------------------------------------
// Risk Scanner Wiring (Full Pipeline)
// ---------------------------------------------------------------------------

describe('Risk Scanner Full Pipeline', () => {
  it('all three scanners produce combined issues', () => {
    const config = makeConfig();

    // Build a signal map with various risk patterns
    const signals = new Map<string, ExtractedSignals>();

    // Homepage for topic reference
    signals.set(`${BASE_URL}/`, makeSignals({
      title: 'Yalla London Luxury Travel Guide for Arab Visitors',
      headings: [
        { level: 1, text: 'London luxury travel experiences dining hotels recommendations' },
      ],
      canonical: `${BASE_URL}/`,
    }));

    // Blog page with external link dominance
    signals.set(`${BASE_URL}/blog/affiliate-heavy`, makeSignals({
      title: 'London Shopping Deals',
      headings: [{ level: 1, text: 'Shopping Deals' }],
      internalLinks: [],
      externalLinks: Array.from({ length: 10 }, (_, i) => ({
        href: `https://external${i}.com`, text: `Link ${i}`,
      })),
      canonical: `${BASE_URL}/blog/affiliate-heavy`,
    }));

    // Thin content pages (below 300 words)
    for (let i = 0; i < 4; i++) {
      signals.set(`${BASE_URL}/blog/thin-${i}`, makeSignals({
        title: `Thin Page ${i}`,
        headings: [{ level: 1, text: `Thin ${i}` }],
        wordCount: 100 + i * 20,
        canonical: `${BASE_URL}/blog/thin-${i}`,
      }));
    }

    // Run all risk scanners
    const scaledIssues = scanScaledContentAbuse(signals, config.riskScanners);
    const reputationIssues = scanSiteReputationAbuse(signals, config.riskScanners);
    const expiredIssues = scanExpiredDomainAbuse(signals, config.riskScanners, BASE_URL);

    const allRiskIssues = [...scaledIssues, ...reputationIssues, ...expiredIssues];

    // Should find at least thin content issues
    expect(allRiskIssues.length).toBeGreaterThan(0);

    // All risk issues should have category 'risk'
    for (const issue of allRiskIssues) {
      expect(issue.category).toBe('risk');
    }
  });

  it('risk issues do not affect non-risk hard gates', () => {
    const config = makeConfig();
    const riskIssues: AuditIssue[] = [
      { severity: 'P1', category: 'risk', url: `${BASE_URL}/blog/a`, message: 'Scaled content' },
      { severity: 'P2', category: 'risk', url: `${BASE_URL}/blog/b`, message: 'Topic drift' },
    ];

    const gates = evaluateHardGates(riskIssues, config.hardGates);
    // All standard gates should pass since risk is a different category
    expect(gates.every(g => g.passed)).toBe(true);
  });
});
