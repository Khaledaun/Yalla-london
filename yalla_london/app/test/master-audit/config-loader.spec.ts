import { describe, it, expect } from 'vitest';
import { loadAuditConfig, deepMerge } from '../../lib/master-audit/config-loader';

describe('config-loader', () => {
  describe('deepMerge', () => {
    it('merges nested objects', () => {
      const target = { a: { b: 1, c: 2 }, d: 3 };
      const source = { a: { b: 10 } };
      const result = deepMerge(target, source);
      expect(result.a.b).toBe(10);
      expect(result.a.c).toBe(2);
      expect(result.d).toBe(3);
    });

    it('replaces arrays (not merges)', () => {
      const target = { items: [1, 2, 3] };
      const source = { items: [4, 5] };
      const result = deepMerge(target, source);
      expect(result.items).toEqual([4, 5]);
    });

    it('preserves target when source is empty', () => {
      const target = { a: 1, b: 2 };
      const result = deepMerge(target, {});
      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe('loadAuditConfig', () => {
    it('loads config with siteId applied', () => {
      const config = loadAuditConfig('yalla-london', {
        baseUrl: 'https://www.yalla-london.com',
      });
      expect(config.siteId).toBe('yalla-london');
      expect(config.baseUrl).toBe('https://www.yalla-london.com');
    });

    it('uses fallback defaults when no JSON files', () => {
      const config = loadAuditConfig('nonexistent-site', {
        baseUrl: 'https://test.com',
      });
      expect(config.siteId).toBe('nonexistent-site');
      expect(config.crawl.concurrency).toBeGreaterThan(0);
      expect(config.crawl.batchSize).toBeGreaterThan(0);
    });

    it('applies runtime overrides', () => {
      const config = loadAuditConfig('yalla-london', {
        baseUrl: 'http://localhost:3000',
        crawl: {
          batchSize: 50,
          concurrency: 2,
          rateDelayMs: 100,
          timeoutMs: 5000,
          maxRetries: 1,
          retryBaseDelayMs: 500,
          maxRedirects: 3,
          userAgent: 'TestBot',
          allowedStatuses: [200],
        },
      });
      expect(config.baseUrl).toBe('http://localhost:3000');
      expect(config.crawl.batchSize).toBe(50);
      expect(config.crawl.concurrency).toBe(2);
    });

    it('throws for missing baseUrl', () => {
      expect(() => loadAuditConfig('test-site')).toThrow('baseUrl is required');
    });

    it('preserves siteId even with overrides', () => {
      const config = loadAuditConfig('my-site', {
        siteId: 'wrong-site',
        baseUrl: 'https://test.com',
      });
      expect(config.siteId).toBe('my-site');
    });

    it('validates crawl settings', () => {
      expect(() =>
        loadAuditConfig('test-site', {
          baseUrl: 'https://test.com',
          crawl: {
            concurrency: 0,
            batchSize: 20,
            rateDelayMs: 200,
            timeoutMs: 10000,
            maxRetries: 2,
            retryBaseDelayMs: 1000,
            maxRedirects: 5,
            userAgent: 'Test',
            allowedStatuses: [200],
          },
        })
      ).toThrow('concurrency must be >= 1');
    });
  });
});
