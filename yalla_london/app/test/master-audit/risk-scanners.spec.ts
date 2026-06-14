import { describe, it, expect } from 'vitest';
import { scanScaledContentAbuse } from '../../lib/master-audit/risk-scanners/scaled-content';
import { scanSiteReputationAbuse } from '../../lib/master-audit/risk-scanners/site-reputation';
import { scanExpiredDomainAbuse } from '../../lib/master-audit/risk-scanners/expired-domain';
import type { ExtractedSignals, RiskScannerConfig } from '../../lib/master-audit/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = 'https://www.yalla-london.com';

function makeRiskConfig(overrides?: Partial<RiskScannerConfig>): RiskScannerConfig {
  return {
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
    ...overrides,
  };
}

function makeSignals(overrides?: Partial<ExtractedSignals>): ExtractedSignals {
  return {
    title: 'Test Page Title - Yalla London',
    metaDescription: 'A guide to London experiences for Arabic-speaking travelers.',
    canonical: `${BASE_URL}/blog/test`,
    robotsMeta: null,
    hreflangAlternates: [],
    headings: [{ level: 1, text: 'London Guide' }],
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
// Scaled Content Abuse
// ---------------------------------------------------------------------------

describe('scanScaledContentAbuse', () => {
  it('returns empty when disabled', () => {
    const config = makeRiskConfig({ enabled: { ...makeRiskConfig().enabled, scaledContentAbuse: false } });
    const signals = new Map<string, ExtractedSignals>();
    signals.set(`${BASE_URL}/blog/a`, makeSignals());
    expect(scanScaledContentAbuse(signals, config)).toHaveLength(0);
  });

  it('returns empty for unique pages', () => {
    const config = makeRiskConfig();
    const signals = new Map<string, ExtractedSignals>();
    signals.set(`${BASE_URL}/blog/london-hotels`, makeSignals({
      title: 'Best Hotels in London for Arab Travelers',
      headings: [{ level: 1, text: 'Top London Hotels' }, { level: 2, text: 'Mayfair Hotels' }],
      wordCount: 800,
    }));
    signals.set(`${BASE_URL}/blog/london-restaurants`, makeSignals({
      title: 'Halal Restaurants in London City Centre',
      headings: [{ level: 1, text: 'Best Halal Food' }, { level: 2, text: 'Fine Dining' }],
      wordCount: 900,
    }));
    const issues = scanScaledContentAbuse(signals, config);
    const scaledIssues = issues.filter(i => i.message.includes('near-duplicate'));
    expect(scaledIssues).toHaveLength(0);
  });

  it('detects near-duplicate content clusters', () => {
    const config = makeRiskConfig({ scaledContentMinClusterSize: 2 });
    const signals = new Map<string, ExtractedSignals>();

    // Create 3 near-identical pages
    const sharedContent = {
      title: 'Best luxury hotels in London for Arab visitors and families',
      metaDescription: 'Discover the finest luxury hotels in London for Arab visitors and families',
      headings: [
        { level: 1, text: 'Best luxury hotels in London for Arab visitors' },
        { level: 2, text: 'Why choose luxury hotels in London' },
        { level: 2, text: 'Top picks for Arab families visiting London' },
      ],
      wordCount: 600,
    };

    signals.set(`${BASE_URL}/blog/luxury-hotels-1`, makeSignals(sharedContent));
    signals.set(`${BASE_URL}/blog/luxury-hotels-2`, makeSignals(sharedContent));
    signals.set(`${BASE_URL}/blog/luxury-hotels-3`, makeSignals(sharedContent));

    const issues = scanScaledContentAbuse(signals, config);
    expect(issues.some(i => i.message.includes('near-duplicate'))).toBe(true);
  });

  it('detects thin content clusters', () => {
    const config = makeRiskConfig({ scaledContentMinClusterSize: 3 });
    const signals = new Map<string, ExtractedSignals>();

    // 3 thin pages (below 300 word threshold, but above 50 to be counted)
    signals.set(`${BASE_URL}/blog/thin-1`, makeSignals({
      title: 'Short page 1', headings: [{ level: 1, text: 'Short' }], wordCount: 100,
    }));
    signals.set(`${BASE_URL}/blog/thin-2`, makeSignals({
      title: 'Short page 2', headings: [{ level: 1, text: 'Brief' }], wordCount: 150,
    }));
    signals.set(`${BASE_URL}/blog/thin-3`, makeSignals({
      title: 'Short page 3', headings: [{ level: 1, text: 'Quick' }], wordCount: 200,
    }));

    const issues = scanScaledContentAbuse(signals, config);
    expect(issues.some(i => i.message.includes('Thin content cluster'))).toBe(true);
  });

  it('flags low entity coverage', () => {
    const config = makeRiskConfig({ entityCoverageMinScore: 0.5 });
    const signals = new Map<string, ExtractedSignals>();
    signals.set(`${BASE_URL}/blog/mismatched`, makeSignals({
      title: 'Something completely unrelated',
      metaDescription: 'A random unrelated description',
      headings: [
        { level: 1, text: 'Cryptocurrency Trading Strategies' },
        { level: 2, text: 'Bitcoin Mining Operations' },
        { level: 2, text: 'Ethereum DeFi Protocols' },
      ],
      wordCount: 600,
    }));

    const issues = scanScaledContentAbuse(signals, config);
    expect(issues.some(i => i.message.includes('entity coverage'))).toBe(true);
  });

  it('skips pages with <= 50 words', () => {
    const config = makeRiskConfig();
    const signals = new Map<string, ExtractedSignals>();
    signals.set(`${BASE_URL}/nav`, makeSignals({ wordCount: 30 }));
    const issues = scanScaledContentAbuse(signals, config);
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Site Reputation Abuse
// ---------------------------------------------------------------------------

describe('scanSiteReputationAbuse', () => {
  it('returns empty when disabled', () => {
    const config = makeRiskConfig({ enabled: { ...makeRiskConfig().enabled, siteReputationAbuse: false } });
    const signals = new Map<string, ExtractedSignals>();
    expect(scanSiteReputationAbuse(signals, config)).toHaveLength(0);
  });

  it('returns empty when insufficient site topics', () => {
    const config = makeRiskConfig();
    const signals = new Map<string, ExtractedSignals>();
    // Only one key page with very few words
    signals.set(`${BASE_URL}/`, makeSignals({
      title: 'Hi', headings: [], metaDescription: 'Hi',
    }));
    expect(scanSiteReputationAbuse(signals, config)).toHaveLength(0);
  });

  it('detects outbound link dominance', () => {
    const config = makeRiskConfig({ outboundDominanceThreshold: 0.5 });
    const signals = new Map<string, ExtractedSignals>();

    // Key pages to establish site topics (need 5+ unique topic words)
    signals.set(`${BASE_URL}/`, makeSignals({
      title: 'Yalla London Luxury Travel Guide for Arab Travelers and Families',
      headings: [
        { level: 1, text: 'London luxury travel experiences dining hotels' },
      ],
    }));

    // Page with outbound link dominance
    signals.set(`${BASE_URL}/blog/spam-links`, makeSignals({
      title: 'London Shopping Guide',
      headings: [{ level: 1, text: 'London Shopping' }],
      internalLinks: [{ href: `${BASE_URL}/`, text: 'Home' }],
      externalLinks: [
        { href: 'https://external1.com', text: 'Link 1' },
        { href: 'https://external2.com', text: 'Link 2' },
        { href: 'https://external3.com', text: 'Link 3' },
        { href: 'https://external4.com', text: 'Link 4' },
        { href: 'https://external5.com', text: 'Link 5' },
        { href: 'https://external6.com', text: 'Link 6' },
      ],
    }));

    const issues = scanSiteReputationAbuse(signals, config);
    expect(issues.some(i => i.message.includes('Outbound link dominance'))).toBe(true);
  });

  it('detects missing editorial ownership', () => {
    const config = makeRiskConfig();
    const signals = new Map<string, ExtractedSignals>();

    // Key pages
    signals.set(`${BASE_URL}/`, makeSignals({
      title: 'Yalla London Luxury Travel Guide for Arab Travelers',
      headings: [{ level: 1, text: 'London luxury experiences dining hotels recommendations' }],
    }));

    // Blog post without author in JSON-LD
    signals.set(`${BASE_URL}/blog/no-author-post`, makeSignals({
      title: 'London Hotel Review',
      headings: [{ level: 1, text: 'Hotel Review' }],
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'Article', 'name': 'Review' }],
    }));

    const issues = scanSiteReputationAbuse(signals, config);
    expect(issues.some(i => i.message.includes('Missing editorial ownership'))).toBe(true);
  });

  it('does not flag pages with author in JSON-LD', () => {
    const config = makeRiskConfig();
    const signals = new Map<string, ExtractedSignals>();

    signals.set(`${BASE_URL}/`, makeSignals({
      title: 'Yalla London Luxury Travel Guide for Arab Travelers',
      headings: [{ level: 1, text: 'London luxury experiences dining hotels recommendations' }],
    }));

    signals.set(`${BASE_URL}/blog/with-author`, makeSignals({
      title: 'London Hotel Review',
      headings: [{ level: 1, text: 'Hotel Review' }],
      jsonLd: [{
        '@context': 'https://schema.org',
        '@type': 'Article',
        'name': 'Review',
        'author': { '@type': 'Person', 'name': 'Khaled Aun' },
      }],
    }));

    const issues = scanSiteReputationAbuse(signals, config);
    expect(issues.some(i => i.message.includes('Missing editorial ownership'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Expired Domain Abuse
// ---------------------------------------------------------------------------

describe('scanExpiredDomainAbuse', () => {
  it('returns empty when disabled', () => {
    const config = makeRiskConfig({ enabled: { ...makeRiskConfig().enabled, expiredDomainAbuse: false } });
    const signals = new Map<string, ExtractedSignals>();
    expect(scanExpiredDomainAbuse(signals, config, BASE_URL)).toHaveLength(0);
  });

  it('returns empty for domain-aligned content', () => {
    const config = makeRiskConfig();
    const signals = new Map<string, ExtractedSignals>();

    // Domain is yalla-london.com → expects "london" topic
    signals.set(`${BASE_URL}/`, makeSignals({
      title: 'Yalla London - Your Guide to London',
      headings: [{ level: 1, text: 'Explore London' }],
    }));
    signals.set(`${BASE_URL}/blog/london-guide`, makeSignals({
      title: 'Complete London Travel Guide',
      headings: [{ level: 1, text: 'London Neighborhoods' }],
    }));

    const issues = scanExpiredDomainAbuse(signals, config, BASE_URL);
    const pivotIssues = issues.filter(i => i.message.includes('topic pivot'));
    expect(pivotIssues).toHaveLength(0);
  });

  it('detects site-level topic pivot', () => {
    const config = makeRiskConfig({ topicPivotScoreThreshold: 0.5 });
    const signals = new Map<string, ExtractedSignals>();

    // Domain is yalla-london.com but content is about cryptocurrency
    signals.set(`${BASE_URL}/`, makeSignals({
      title: 'Bitcoin Trading Strategies for Beginners',
      headings: [{ level: 1, text: 'Cryptocurrency Portfolio Management' }],
    }));
    signals.set(`${BASE_URL}/blog/crypto`, makeSignals({
      title: 'Ethereum DeFi Protocols Explained',
      headings: [{ level: 1, text: 'Decentralized Finance Guide' }],
    }));

    const issues = scanExpiredDomainAbuse(signals, config, BASE_URL);
    expect(issues.some(i => i.message.includes('topic pivot'))).toBe(true);
  });

  it('detects legacy orphan pages', () => {
    const config = makeRiskConfig({ topicPivotScoreThreshold: 0.5 });
    const signals = new Map<string, ExtractedSignals>();

    // Main page about London (aligned with domain)
    signals.set(`${BASE_URL}/`, makeSignals({
      title: 'Yalla London Travel Guide',
      headings: [{ level: 1, text: 'London Luxury Travel' }],
      internalLinks: [{ href: `${BASE_URL}/blog/london-hotels`, text: 'Hotels' }],
    }));

    // Linked page (not orphan)
    signals.set(`${BASE_URL}/blog/london-hotels`, makeSignals({
      title: 'London Hotels Guide',
      headings: [{ level: 1, text: 'Best London Hotels' }],
    }));

    // Orphan page with off-topic content (no other page links to it)
    signals.set(`${BASE_URL}/blog/random-crypto-page`, makeSignals({
      title: 'Bitcoin Mining Hardware Reviews',
      headings: [{ level: 1, text: 'GPU Mining Rigs Comparison' }],
    }));

    const issues = scanExpiredDomainAbuse(signals, config, BASE_URL);
    expect(issues.some(i => i.message.includes('orphan'))).toBe(true);
  });

  it('returns empty for empty domain topics', () => {
    const config = makeRiskConfig();
    const signals = new Map<string, ExtractedSignals>();
    signals.set('https://a.com/', makeSignals());
    // Domain 'a' is only 1 char, filtered out (< 3 chars)
    expect(scanExpiredDomainAbuse(signals, config, 'https://a.com')).toHaveLength(0);
  });

  it('handles invalid baseUrl gracefully', () => {
    const config = makeRiskConfig();
    const signals = new Map<string, ExtractedSignals>();
    expect(scanExpiredDomainAbuse(signals, config, 'not-a-url')).toHaveLength(0);
  });
});
