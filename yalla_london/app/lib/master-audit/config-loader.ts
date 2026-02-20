/**
 * Master Audit Engine — Config Loader
 *
 * Loads audit configuration with deep-merge support:
 * 1. Load _default.audit.json from config/sites/
 * 2. Load site-specific override (e.g., yalla-london.audit.json)
 * 3. Deep merge with site overriding default
 * 4. Validate required fields
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AuditConfig } from './types';

// ---------------------------------------------------------------------------
// Default configuration (used when no JSON files exist)
// ---------------------------------------------------------------------------

const FALLBACK_DEFAULTS: AuditConfig = {
  siteId: '',
  baseUrl: '',
  crawl: {
    concurrency: 5,
    batchSize: 20,
    rateDelayMs: 200,
    timeoutMs: 10000,
    maxRetries: 2,
    retryBaseDelayMs: 1000,
    maxRedirects: 5,
    userAgent: 'MasterAudit/1.0 (SEO Compliance; +https://zenitha.luxury)',
    allowedStatuses: [200, 301, 302, 304],
  },
  validators: {
    enabled: {
      http: true,
      canonical: true,
      hreflang: true,
      sitemap: true,
      schema: true,
      links: true,
      metadata: true,
      robots: true,
    },
    titleLength: { min: 30, max: 60 },
    descriptionLength: { min: 120, max: 160 },
    expectedHreflangLangs: ['en-GB', 'ar-SA', 'x-default'],
    maxRedirectChain: 3,
    excludePatterns: [
      '*/api/*',
      '*/_next/*',
      '*/admin/*',
      '*/favicon.ico',
      '*/robots.txt',
    ],
    maxSitemapUrls: 50000,
    requiredSchemaByRoute: {
      '/blog/*': ['Article'],
      '/': ['WebSite', 'Organization'],
    },
    deprecatedSchemaTypes: [
      'FAQPage',
      'HowTo',
      'CourseInfo',
      'ClaimReview',
      'EstimatedSalary',
      'LearningVideo',
      'SpecialAnnouncement',
      'VehicleListing',
      'PracticeProblems',
      'SitelinksSearchBox',
    ],
    allowedCanonicalParams: [],
  },
  riskScanners: {
    enabled: {
      thinContent: true,
      duplicateContent: true,
      orphanPages: true,
    },
    minWordCount: 1000,
  },
  hardGates: [
    {
      name: 'no-p0-http-errors',
      category: 'http',
      maxP0: 0,
      maxTotal: -1,
      description: 'No critical HTTP errors (5xx on important pages)',
    },
    {
      name: 'no-missing-canonical',
      category: 'canonical',
      maxP0: 0,
      maxTotal: -1,
      description: 'All indexable pages must have canonical tags',
    },
    {
      name: 'no-broken-schema',
      category: 'schema',
      maxP0: 0,
      maxTotal: -1,
      description: 'All JSON-LD must be valid and non-deprecated',
    },
  ],
  staticRoutes: [
    '/',
    '/blog',
    '/information',
    '/information/articles',
    '/news',
    '/events',
    '/experiences',
    '/hotels',
    '/recommendations',
    '/london-by-foot',
    '/shop',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/affiliate-disclosure',
  ],
  includeArVariants: true,
  outputDir: 'docs/master-audit',
};

// ---------------------------------------------------------------------------
// Deep merge utility
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Deep merge `source` into `target`. Arrays in source replace target arrays.
 * Objects are recursively merged. Primitives in source override target.
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>
      ) as T[keyof T];
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal as T[keyof T];
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// File loading helpers
// ---------------------------------------------------------------------------

function tryLoadJson(filePath: string): Record<string, unknown> | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    console.warn(
      `[master-audit/config-loader] Failed to parse ${filePath}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateConfig(config: AuditConfig): void {
  const errors: string[] = [];

  if (!config.siteId) {
    errors.push('siteId is required');
  }
  if (!config.baseUrl) {
    errors.push('baseUrl is required');
  }
  if (config.crawl.concurrency < 1) {
    errors.push('crawl.concurrency must be >= 1');
  }
  if (config.crawl.batchSize < 1) {
    errors.push('crawl.batchSize must be >= 1');
  }
  if (config.crawl.timeoutMs < 1000) {
    errors.push('crawl.timeoutMs must be >= 1000');
  }
  if (config.validators.titleLength.min >= config.validators.titleLength.max) {
    errors.push('validators.titleLength.min must be < max');
  }
  if (
    config.validators.descriptionLength.min >=
    config.validators.descriptionLength.max
  ) {
    errors.push('validators.descriptionLength.min must be < max');
  }

  if (errors.length > 0) {
    throw new Error(
      `[master-audit/config-loader] Invalid config:\n  - ${errors.join('\n  - ')}`
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load audit configuration for a given site.
 *
 * Resolution order:
 * 1. Hardcoded FALLBACK_DEFAULTS
 * 2. Deep-merge with config/sites/_default.audit.json (if exists)
 * 3. Deep-merge with config/sites/<siteId>.audit.json (if exists)
 * 4. Apply runtime overrides (siteId, baseUrl if provided)
 * 5. Validate final config
 */
export function loadAuditConfig(
  siteId: string,
  overrides?: Partial<AuditConfig>
): AuditConfig {
  const configDir = path.resolve(process.cwd(), 'config', 'sites');

  // Layer 1: Start with hardcoded defaults
  let config: AuditConfig = { ...FALLBACK_DEFAULTS };

  // Layer 2: Merge _default.audit.json
  const defaultJsonPath = path.join(configDir, '_default.audit.json');
  const defaultJson = tryLoadJson(defaultJsonPath);
  if (defaultJson) {
    config = deepMerge(
      config as unknown as Record<string, unknown>,
      defaultJson
    ) as unknown as AuditConfig;
  }

  // Layer 3: Merge site-specific config
  const siteJsonPath = path.join(configDir, `${siteId}.audit.json`);
  const siteJson = tryLoadJson(siteJsonPath);
  if (siteJson) {
    config = deepMerge(
      config as unknown as Record<string, unknown>,
      siteJson
    ) as unknown as AuditConfig;
  }

  // Layer 4: Apply runtime overrides
  config.siteId = siteId;
  if (overrides) {
    config = deepMerge(
      config as unknown as Record<string, unknown>,
      overrides as unknown as Record<string, unknown>
    ) as unknown as AuditConfig;
    // Ensure siteId is never overridden by partial merge
    config.siteId = siteId;
  }

  // Layer 5: Validate
  validateConfig(config);

  return config;
}

/**
 * Export the deep merge utility for testing.
 */
export { deepMerge };
