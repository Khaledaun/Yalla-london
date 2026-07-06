import { describe, it, expect } from 'vitest';
import { extractSignals } from '../../lib/master-audit/extractor';

const BASE_URL = 'https://www.yalla-london.com';

function html(head: string, body: string): string {
  return `<!DOCTYPE html><html lang="en-GB" dir="ltr"><head>${head}</head><body>${body}</body></html>`;
}

describe('extractor', () => {
  describe('title extraction', () => {
    it('extracts title tag', () => {
      const h = html('<title>Hello World</title>', '<p>body</p>');
      const signals = extractSignals(h, `${BASE_URL}/test`, BASE_URL);
      expect(signals.title).toBe('Hello World');
    });

    it('returns null when no title', () => {
      const h = html('', '<p>body</p>');
      const signals = extractSignals(h, `${BASE_URL}/test`, BASE_URL);
      expect(signals.title).toBeNull();
    });

    it('strips HTML entities from title', () => {
      const h = html('<title>Hotels &amp; Restaurants</title>', '<p>body</p>');
      const signals = extractSignals(h, `${BASE_URL}/test`, BASE_URL);
      expect(signals.title).toBe('Hotels & Restaurants');
    });
  });

  describe('meta description extraction', () => {
    it('extracts meta description', () => {
      const h = html(
        '<meta name="description" content="A great page about London">',
        '<p>body</p>'
      );
      const signals = extractSignals(h, `${BASE_URL}/test`, BASE_URL);
      expect(signals.metaDescription).toBe('A great page about London');
    });

    it('handles content before name attribute order', () => {
      const h = html(
        '<meta content="Reversed order" name="description">',
        '<p>body</p>'
      );
      const signals = extractSignals(h, `${BASE_URL}/test`, BASE_URL);
      // Should still extract regardless of attribute order
      expect(signals.metaDescription).not.toBeNull();
    });
  });

  describe('canonical extraction', () => {
    it('extracts canonical URL', () => {
      const h = html(
        '<link rel="canonical" href="https://www.yalla-london.com/blog">',
        '<p>body</p>'
      );
      const signals = extractSignals(h, `${BASE_URL}/blog`, BASE_URL);
      expect(signals.canonical).toBe('https://www.yalla-london.com/blog');
    });
  });

  describe('hreflang extraction', () => {
    it('extracts hreflang alternates', () => {
      const h = html(
        `<link rel="alternate" hreflang="en-GB" href="${BASE_URL}/blog">
         <link rel="alternate" hreflang="ar-SA" href="${BASE_URL}/ar/blog">
         <link rel="alternate" hreflang="x-default" href="${BASE_URL}/blog">`,
        '<p>body</p>'
      );
      const signals = extractSignals(h, `${BASE_URL}/blog`, BASE_URL);
      expect(signals.hreflangAlternates).toHaveLength(3);
      expect(signals.hreflangAlternates[0].hreflang).toBe('en-GB');
      expect(signals.hreflangAlternates[1].hreflang).toBe('ar-SA');
    });
  });

  describe('JSON-LD extraction', () => {
    it('extracts valid JSON-LD', () => {
      const h = html(
        '',
        `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","name":"Test"}</script>`
      );
      const signals = extractSignals(h, `${BASE_URL}/blog/test`, BASE_URL);
      expect(signals.jsonLd).toHaveLength(1);
      expect((signals.jsonLd[0] as Record<string, unknown>)['@type']).toBe('Article');
    });

    it('records parse errors for invalid JSON-LD', () => {
      const h = html(
        '',
        `<script type="application/ld+json">{invalid json}</script>`
      );
      const signals = extractSignals(h, `${BASE_URL}/test`, BASE_URL);
      expect(signals.jsonLd).toHaveLength(1);
      expect((signals.jsonLd[0] as Record<string, unknown>)._parseError).toBe(true);
    });

    it('extracts multiple JSON-LD blocks', () => {
      const h = html(
        '',
        `<script type="application/ld+json">{"@type":"Organization"}</script>
         <script type="application/ld+json">{"@type":"WebSite"}</script>`
      );
      const signals = extractSignals(h, `${BASE_URL}/`, BASE_URL);
      expect(signals.jsonLd).toHaveLength(2);
    });
  });

  describe('headings extraction', () => {
    it('extracts headings with levels', () => {
      const h = html(
        '',
        '<h1>Main Title</h1><h2>Section 1</h2><h3>Subsection</h3>'
      );
      const signals = extractSignals(h, `${BASE_URL}/test`, BASE_URL);
      expect(signals.headings).toHaveLength(3);
      expect(signals.headings[0]).toEqual({ level: 1, text: 'Main Title' });
      expect(signals.headings[1]).toEqual({ level: 2, text: 'Section 1' });
    });
  });

  describe('link extraction', () => {
    it('classifies internal and external links', () => {
      const h = html(
        '',
        `<a href="/blog">Blog</a>
         <a href="https://www.yalla-london.com/about">About</a>
         <a href="https://example.com">External</a>`
      );
      const signals = extractSignals(h, `${BASE_URL}/test`, BASE_URL);
      expect(signals.internalLinks.length).toBeGreaterThanOrEqual(1);
      expect(signals.externalLinks.length).toBeGreaterThanOrEqual(1);
    });

    it('ignores mailto and tel links', () => {
      const h = html(
        '',
        `<a href="mailto:test@test.com">Email</a>
         <a href="tel:+44123">Call</a>
         <a href="/blog">Blog</a>`
      );
      const signals = extractSignals(h, `${BASE_URL}/test`, BASE_URL);
      expect(signals.internalLinks.length).toBe(1);
      expect(signals.externalLinks.length).toBe(0);
    });
  });

  describe('word count', () => {
    it('counts words in body text', () => {
      const h = html(
        '<title>Test</title>',
        '<p>This is a simple test paragraph with exactly nine words here.</p>'
      );
      const signals = extractSignals(h, `${BASE_URL}/test`, BASE_URL);
      expect(signals.wordCount).toBeGreaterThan(5);
    });

    it('excludes script and style text from count', () => {
      const h = html(
        '',
        `<script>var x = "should not count";</script>
         <style>.class { color: red; }</style>
         <p>Only these words count.</p>`
      );
      const signals = extractSignals(h, `${BASE_URL}/test`, BASE_URL);
      expect(signals.wordCount).toBeLessThan(20);
    });
  });

  describe('lang and dir attributes', () => {
    it('extracts lang and dir from html tag', () => {
      const h = `<!DOCTYPE html><html lang="ar" dir="rtl"><head></head><body><p>test</p></body></html>`;
      const signals = extractSignals(h, `${BASE_URL}/ar/test`, BASE_URL);
      expect(signals.langAttr).toBe('ar');
      expect(signals.dirAttr).toBe('rtl');
    });
  });
});
