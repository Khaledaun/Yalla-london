/**
 * Lighthouse Runner — PageSpeed Insights API integration for audit system.
 *
 * Calls the PSI API for key URLs and converts results to AuditIssue[] format.
 * Thresholds from lib/seo/standards.ts CORE_WEB_VITALS.
 *
 * Env var: GOOGLE_PAGESPEED_API_KEY (falls back to PAGESPEED_API_KEY, PSI_API_KEY)
 */

import type { AuditIssue as MasterAuditIssue } from '@/lib/master-audit/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PSIResult {
  url: string;
  performanceScore: number | null;
  seoScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  lcpMs: number | null;
  clsScore: number | null;
  inpMs: number | null;
  fcpMs: number | null;
  tbtMs: number | null;
}

// ---------------------------------------------------------------------------
// API Key
// ---------------------------------------------------------------------------

function getApiKey(): string | null {
  return (
    process.env.GOOGLE_PAGESPEED_API_KEY ??
    process.env.PAGESPEED_API_KEY ??
    process.env.PSI_API_KEY ??
    null
  );
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

/**
 * Run PageSpeed audits for a list of key URLs and return issues.
 * Skips if no API key is configured.
 */
export async function runLighthouseAudits(
  keyUrls: string[],
  baseUrl: string,
  options: { timeoutMs?: number; strategy?: 'mobile' | 'desktop' } = {}
): Promise<{ issues: MasterAuditIssue[]; results: PSIResult[] }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[lighthouse-runner] No API key configured (GOOGLE_PAGESPEED_API_KEY), skipping Lighthouse audits');
    return { issues: [], results: [] };
  }

  const strategy = options.strategy ?? 'mobile';
  const timeoutMs = options.timeoutMs ?? 15_000;
  const issues: MasterAuditIssue[] = [];
  const results: PSIResult[] = [];

  for (const keyUrl of keyUrls) {
    const fullUrl = keyUrl.startsWith('http')
      ? keyUrl
      : `${baseUrl.replace(/\/+$/, '')}${keyUrl.startsWith('/') ? '' : '/'}${keyUrl}`;

    try {
      const psiResult = await fetchPSI(fullUrl, apiKey, strategy, timeoutMs);
      results.push(psiResult);
      issues.push(...evaluateResult(psiResult));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[lighthouse-runner] Failed for ${fullUrl}: ${msg}`);

      // Don't create an issue for API failures — could be transient
      results.push({
        url: fullUrl,
        performanceScore: null,
        seoScore: null,
        accessibilityScore: null,
        bestPracticesScore: null,
        lcpMs: null,
        clsScore: null,
        inpMs: null,
        fcpMs: null,
        tbtMs: null,
      });
    }
  }

  return { issues, results };
}

// ---------------------------------------------------------------------------
// Fetch PSI
// ---------------------------------------------------------------------------

async function fetchPSI(
  url: string,
  apiKey: string,
  strategy: 'mobile' | 'desktop',
  timeoutMs: number
): Promise<PSIResult> {
  const apiUrl = new URL(
    'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
  );
  apiUrl.searchParams.set('url', url);
  apiUrl.searchParams.set('key', apiKey);
  apiUrl.searchParams.set('strategy', strategy);
  apiUrl.searchParams.set(
    'category',
    ['performance', 'seo', 'accessibility', 'best-practices'].join(',')
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(apiUrl.toString(), {
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`PSI API returned ${res.status}`);
    }

    const data = await res.json();
    const lhr = data.lighthouseResult;
    const categories = lhr?.categories ?? {};
    const audits = lhr?.audits ?? {};

    return {
      url,
      performanceScore: categories.performance?.score != null
        ? Math.round(categories.performance.score * 100)
        : null,
      seoScore: categories.seo?.score != null
        ? Math.round(categories.seo.score * 100)
        : null,
      accessibilityScore: categories.accessibility?.score != null
        ? Math.round(categories.accessibility.score * 100)
        : null,
      bestPracticesScore: categories['best-practices']?.score != null
        ? Math.round(categories['best-practices'].score * 100)
        : null,
      lcpMs: audits['largest-contentful-paint']?.numericValue ?? null,
      clsScore: audits['cumulative-layout-shift']?.numericValue ?? null,
      inpMs: audits['interaction-to-next-paint']?.numericValue ??
        audits['experimental-interaction-to-next-paint']?.numericValue ??
        null,
      fcpMs: audits['first-contentful-paint']?.numericValue ?? null,
      tbtMs: audits['total-blocking-time']?.numericValue ?? null,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Evaluate results against thresholds
// ---------------------------------------------------------------------------

function evaluateResult(result: PSIResult): MasterAuditIssue[] {
  const issues: MasterAuditIssue[] = [];

  // Performance score
  if (result.performanceScore !== null && result.performanceScore < 60) {
    issues.push({
      severity: 'P0',
      category: 'performance',
      url: result.url,
      message: `Performance score ${result.performanceScore}/100 (threshold: 60)`,
      suggestedFix: {
        scope: 'page-level',
        target: result.url,
        notes: 'Run PageSpeed Insights for detailed optimization suggestions',
      },
    });
  } else if (
    result.performanceScore !== null &&
    result.performanceScore < 80
  ) {
    issues.push({
      severity: 'P1',
      category: 'performance',
      url: result.url,
      message: `Performance score ${result.performanceScore}/100 (threshold: 80)`,
    });
  }

  // SEO score
  if (result.seoScore !== null && result.seoScore < 80) {
    issues.push({
      severity: 'P1',
      category: 'performance',
      url: result.url,
      message: `Lighthouse SEO score ${result.seoScore}/100 (threshold: 80)`,
      suggestedFix: {
        scope: 'page-level',
        target: result.url,
        notes: 'Check meta tags, viewport, canonical, and robots directives',
      },
    });
  }

  // LCP > 2.5s
  if (result.lcpMs !== null && result.lcpMs > 2500) {
    issues.push({
      severity: result.lcpMs > 4000 ? 'P0' : 'P1',
      category: 'performance',
      url: result.url,
      message: `LCP ${(result.lcpMs / 1000).toFixed(1)}s (threshold: 2.5s)`,
      suggestedFix: {
        scope: 'page-level',
        target: result.url,
        notes: 'Optimize largest element: compress images, preload fonts, reduce server time',
      },
    });
  }

  // INP > 200ms
  if (result.inpMs !== null && result.inpMs > 200) {
    issues.push({
      severity: result.inpMs > 500 ? 'P0' : 'P1',
      category: 'performance',
      url: result.url,
      message: `INP ${Math.round(result.inpMs)}ms (threshold: 200ms)`,
      suggestedFix: {
        scope: 'page-level',
        target: result.url,
        notes: 'Reduce JavaScript execution time, break up long tasks, optimize event handlers',
      },
    });
  }

  // CLS > 0.1
  if (result.clsScore !== null && result.clsScore > 0.1) {
    issues.push({
      severity: result.clsScore > 0.25 ? 'P0' : 'P1',
      category: 'performance',
      url: result.url,
      message: `CLS ${result.clsScore.toFixed(3)} (threshold: 0.1)`,
      suggestedFix: {
        scope: 'page-level',
        target: result.url,
        notes: 'Set explicit dimensions on images/videos, avoid inserting content above existing content',
      },
    });
  }

  return issues;
}
