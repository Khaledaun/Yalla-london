import { describe, it, expect } from 'vitest';
import { validateHttp } from '../../lib/master-audit/validators/http';
import { validateCanonical } from '../../lib/master-audit/validators/canonical';
import { validateSchema } from '../../lib/master-audit/validators/schema';
import { validateSitemap } from '../../lib/master-audit/validators/sitemap';
import type { CrawlResult, ExtractedSignals, AuditConfig } from '../../lib/master-audit/types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const BASE_URL = 'https://www.yalla-london.com';

function makeConfig(overrides?: Partial<AuditConfig>): AuditConfig {
  return {
    siteId: 'yalla-london',
    baseUrl: BASE_URL,
    crawl: {
      concurrency: 5,
      batchSize: 20,
      rateDelayMs: 200,
      timeoutMs: 10000,
      maxRetries: 2,
      retryBaseDelayMs: 1000,
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
      requiredSchemaByRoute: {
        '/': ['Organization', 'WebSite'],
        '/blog/*': ['Article'],
      },
      deprecatedSchemaTypes: ['FAQPage', 'HowTo'],
      allowedCanonicalParams: [],
    },
    riskScanners: {
      enabled: { thinContent: true, duplicateContent: true, orphanPages: true },
      minWordCount: 1000,
    },
    hardGates: [],
    staticRoutes: ['/'],
    includeArVariants: true,
    outputDir: 'docs/master-audit',
    ...overrides,
  };
}

function makeCrawlResult(overrides?: Partial<CrawlResult>): CrawlResult {
  return {
    url: `${BASE_URL}/blog/test`,
    status: 200,
    redirectChain: [],
    finalUrl: `${BASE_URL}/blog/test`,
    headers: {},
    html: '<html><head><title>Test</title></head><body>content</body></html>',
    timing: { startMs: 0, endMs: 100, durationMs: 100 },
    ...overrides,
  };
}

function makeSignals(overrides?: Partial<ExtractedSignals>): ExtractedSignals {
  return {
    title: 'Test Page Title - Yalla London',
    metaDescription: 'A comprehensive guide to London experiences for Arabic-speaking travelers visiting the city for the first time.',
    canonical: `${BASE_URL}/blog/test`,
    robotsMeta: null,
    hreflangAlternates: [],
    headings: [{ level: 1, text: 'Test' }],
    jsonLd: [],
    internalLinks: [],
    externalLinks: [],
    langAttr: 'en-GB',
    dirAttr: 'ltr',
    wordCount: 1500,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// HTTP Validator
// ---------------------------------------------------------------------------

describe('validateHttp', () => {
  const config = makeConfig();

  it('returns no issues for 200 response', () => {
    const result = makeCrawlResult({ status: 200 });
    const issues = validateHttp(result, config);
    expect(issues.filter(i => i.severity === 'P0')).toHaveLength(0);
  });

  it('flags 500 as P0', () => {
    const result = makeCrawlResult({ status: 500 });
    const issues = validateHttp(result, config);
    expect(issues.some(i => i.severity === 'P0' && i.message.includes('500'))).toBe(true);
  });

  it('flags 404 as P1', () => {
    const result = makeCrawlResult({ status: 404 });
    const issues = validateHttp(result, config);
    expect(issues.some(i => i.severity === 'P1')).toBe(true);
  });

  it('flags connection errors as P0', () => {
    const result = makeCrawlResult({ status: 0, error: 'ECONNREFUSED' });
    const issues = validateHttp(result, config);
    expect(issues.some(i => i.severity === 'P0' && i.message.includes('Connection failed'))).toBe(true);
  });

  it('flags long redirect chains', () => {
    const result = makeCrawlResult({
      redirectChain: [
        { url: `${BASE_URL}/a`, status: 301 },
        { url: `${BASE_URL}/b`, status: 301 },
        { url: `${BASE_URL}/c`, status: 301 },
        { url: `${BASE_URL}/d`, status: 301 },
      ],
    });
    const issues = validateHttp(result, config);
    expect(issues.some(i => i.message.includes('Redirect chain too long'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Canonical Validator
// ---------------------------------------------------------------------------

describe('validateCanonical', () => {
  const config = makeConfig();

  it('returns no issues for valid self-referencing canonical', () => {
    const signals = makeSignals({ canonical: `${BASE_URL}/blog/test` });
    const issues = validateCanonical(signals, `${BASE_URL}/blog/test`, config);
    expect(issues.filter(i => i.severity === 'P0' || i.severity === 'P1')).toHaveLength(0);
  });

  it('flags missing canonical as P1', () => {
    const signals = makeSignals({ canonical: null });
    const issues = validateCanonical(signals, `${BASE_URL}/blog/test`, config);
    expect(issues.some(i => i.severity === 'P1' && i.message.includes('Missing canonical'))).toBe(true);
  });

  it('flags invalid URL format as P0', () => {
    const signals = makeSignals({ canonical: 'not-a-url' });
    const issues = validateCanonical(signals, `${BASE_URL}/blog/test`, config);
    expect(issues.some(i => i.severity === 'P0' && i.message.includes('Invalid canonical'))).toBe(true);
  });

  it('skips validation for noindexed pages', () => {
    const signals = makeSignals({ canonical: null, robotsMeta: 'noindex' });
    const issues = validateCanonical(signals, `${BASE_URL}/test`, config);
    expect(issues).toHaveLength(0);
  });

  it('flags non-HTTPS canonical', () => {
    const signals = makeSignals({ canonical: 'http://www.yalla-london.com/blog/test' });
    const issues = validateCanonical(signals, `${BASE_URL}/blog/test`, config);
    expect(issues.some(i => i.message.includes('https'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Schema Validator
// ---------------------------------------------------------------------------

describe('validateSchema', () => {
  const config = makeConfig();

  it('returns no issues for valid JSON-LD with required type', () => {
    const signals = makeSignals({
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'Article', 'name': 'Test' }],
    });
    const issues = validateSchema(signals, `${BASE_URL}/blog/test-article`, config);
    expect(issues.filter(i => i.severity === 'P0')).toHaveLength(0);
  });

  it('flags malformed JSON-LD as P0', () => {
    const signals = makeSignals({
      jsonLd: [{ _parseError: true, _raw: '{invalid}' }],
    });
    const issues = validateSchema(signals, `${BASE_URL}/blog/test`, config);
    expect(issues.some(i => i.severity === 'P0' && i.message.includes('Invalid JSON'))).toBe(true);
  });

  it('flags deprecated types as P1', () => {
    const signals = makeSignals({
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'FAQPage' }],
    });
    const issues = validateSchema(signals, `${BASE_URL}/blog/test`, config);
    expect(issues.some(i => i.severity === 'P1' && i.message.includes('Deprecated'))).toBe(true);
  });

  it('flags missing required types for route', () => {
    const signals = makeSignals({
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'WebPage' }],
    });
    const issues = validateSchema(signals, `${BASE_URL}/`, config);
    expect(issues.some(i => i.message.includes('Missing required JSON-LD type'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sitemap Validator
// ---------------------------------------------------------------------------

describe('validateSitemap', () => {
  const config = makeConfig();

  it('flags empty sitemap as P0', () => {
    const issues = validateSitemap('', new Map(), config);
    expect(issues.some(i => i.severity === 'P0')).toBe(true);
  });

  it('flags invalid XML structure as P0', () => {
    const issues = validateSitemap('<html>not a sitemap</html>', new Map(), config);
    expect(issues.some(i => i.severity === 'P0' && i.message.includes('urlset'))).toBe(true);
  });

  it('returns no P0 issues for valid sitemap', () => {
    const xml = `<?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>${BASE_URL}/</loc></url>
        <url><loc>${BASE_URL}/blog</loc></url>
      </urlset>`;
    const issues = validateSitemap(xml, new Map(), config);
    expect(issues.filter(i => i.severity === 'P0')).toHaveLength(0);
  });

  it('flags sitemap with zero loc entries as P0', () => {
    const xml = `<?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      </urlset>`;
    const issues = validateSitemap(xml, new Map(), config);
    expect(issues.some(i => i.severity === 'P0' && i.message.includes('no URL'))).toBe(true);
  });

  it('flags non-200 URLs in sitemap', () => {
    const xml = `<?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>${BASE_URL}/gone-page</loc></url>
      </urlset>`;
    const crawlResults = new Map<string, CrawlResult>([
      [`${BASE_URL}/gone-page`, makeCrawlResult({ url: `${BASE_URL}/gone-page`, status: 404 })],
    ]);
    const issues = validateSitemap(xml, crawlResults, config);
    expect(issues.some(i => i.message.includes('404'))).toBe(true);
  });
});
