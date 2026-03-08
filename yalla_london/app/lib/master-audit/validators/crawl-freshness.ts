/**
 * Crawl Freshness Validator
 *
 * Answers: "When did Google last crawl our pages and sitemap?"
 *
 * Data sources:
 * 1. URLIndexingStatus table — stores last_crawled_at from GSC URL Inspection API
 *    (populated by verify-indexing cron, runs 2x daily)
 * 2. Live sitemap fetch — checks reachability + response time
 *
 * Produces:
 * - CrawlFreshnessData for the exec summary report (top-level visibility)
 * - AuditIssue[] for pages with stale or missing crawl data
 */

import type { AuditIssue, AuditConfig, CrawlFreshnessData } from '../types';

const STALE_CRAWL_DAYS = 14;
const CRITICAL_STALE_DAYS = 30;
const SITEMAP_TIMEOUT_MS = 10_000;

/**
 * Check sitemap reachability and measure response time.
 */
async function checkSitemapReachability(baseUrl: string): Promise<CrawlFreshnessData['sitemapCheck']> {
  const sitemapUrl = `${baseUrl}/sitemap.xml`;
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SITEMAP_TIMEOUT_MS);

    const response = await fetch(sitemapUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ZenithaAudit/1.0' },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    const responseTimeMs = Date.now() - start;
    const body = await response.text();

    // Count URLs in sitemap
    const urlMatches = body.match(/<loc>/gi);
    const urlCount = urlMatches ? urlMatches.length : 0;

    return {
      reachable: response.ok,
      responseTimeMs,
      statusCode: response.status,
      urlCount,
      checkedAt: new Date().toISOString(),
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (err) {
    const responseTimeMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = message.includes('abort') || message.includes('timeout');

    return {
      reachable: false,
      responseTimeMs,
      statusCode: 0,
      urlCount: 0,
      checkedAt: new Date().toISOString(),
      error: isTimeout ? `Timeout after ${SITEMAP_TIMEOUT_MS}ms` : message,
    };
  }
}

/**
 * Query URLIndexingStatus for crawl freshness data per page.
 */
async function getCrawlDataFromDb(siteId: string): Promise<CrawlFreshnessData['pages']> {
  try {
    const { prisma } = await import('@/lib/db');

    const records = await prisma.uRLIndexingStatus.findMany({
      where: { site_id: siteId },
      select: {
        url: true,
        last_crawled_at: true,
        last_inspected_at: true,
        indexing_state: true,
        coverage_state: true,
      },
      orderBy: { last_crawled_at: 'desc' },
      take: 500,
    });

    const now = Date.now();
    return records.map((r) => ({
      url: r.url,
      lastCrawledAt: r.last_crawled_at?.toISOString() || null,
      lastInspectedAt: r.last_inspected_at?.toISOString() || null,
      indexingState: r.indexing_state || null,
      coverageState: r.coverage_state || null,
      daysSinceLastCrawl: r.last_crawled_at
        ? Math.floor((now - r.last_crawled_at.getTime()) / (24 * 60 * 60 * 1000))
        : null,
    }));
  } catch (err) {
    console.warn('[crawl-freshness] DB query failed:', err instanceof Error ? err.message : String(err));
    return [];
  }
}

/**
 * Build summary statistics from page-level crawl data.
 */
function buildSummary(pages: CrawlFreshnessData['pages']): CrawlFreshnessData['summary'] {
  const withCrawlDate = pages.filter((p) => p.daysSinceLastCrawl !== null);
  const neverCrawled = pages.filter((p) => p.daysSinceLastCrawl === null);

  const crawledWithin7d = withCrawlDate.filter((p) => p.daysSinceLastCrawl! <= 7).length;
  const crawledWithin14d = withCrawlDate.filter((p) => p.daysSinceLastCrawl! <= 14).length;
  const crawledWithin30d = withCrawlDate.filter((p) => p.daysSinceLastCrawl! <= 30).length;

  const crawlDates = withCrawlDate
    .map((p) => p.lastCrawledAt!)
    .sort();

  const dayValues = withCrawlDate.map((p) => p.daysSinceLastCrawl!);
  const avgDays = dayValues.length > 0
    ? Math.round(dayValues.reduce((sum, d) => sum + d, 0) / dayValues.length)
    : null;

  return {
    totalTracked: pages.length,
    crawledWithin7d,
    crawledWithin14d,
    crawledWithin30d,
    neverCrawled: neverCrawled.length,
    oldestCrawlDate: crawlDates[0] || null,
    newestCrawlDate: crawlDates[crawlDates.length - 1] || null,
    averageDaysSinceCrawl: avgDays,
  };
}

/**
 * Main validator — returns issues + full crawl freshness data.
 */
export async function validateCrawlFreshness(
  siteId: string,
  baseUrl: string,
  _config: AuditConfig,
): Promise<{ issues: AuditIssue[]; data: CrawlFreshnessData }> {
  const issues: AuditIssue[] = [];

  // 1. Check sitemap reachability
  const sitemapCheck = await checkSitemapReachability(baseUrl);

  if (!sitemapCheck.reachable) {
    issues.push({
      severity: 'P0',
      category: 'crawl',
      url: `${baseUrl}/sitemap.xml`,
      message: `Sitemap unreachable: ${sitemapCheck.error || 'unknown error'}`,
      evidence: {
        snippet: `Status: ${sitemapCheck.statusCode}, Response time: ${sitemapCheck.responseTimeMs}ms`,
      },
      suggestedFix: {
        scope: 'systemic',
        target: 'sitemap.ts',
        notes: 'Sitemap must respond within 10s. Check Vercel function timeout, DB connection pool, and sitemap cache.',
      },
    });
  } else if (sitemapCheck.responseTimeMs > 5000) {
    issues.push({
      severity: 'P1',
      category: 'crawl',
      url: `${baseUrl}/sitemap.xml`,
      message: `Sitemap slow: ${sitemapCheck.responseTimeMs}ms response time (should be <2s)`,
      evidence: {
        snippet: `${sitemapCheck.urlCount} URLs, ${sitemapCheck.responseTimeMs}ms`,
      },
      suggestedFix: {
        scope: 'systemic',
        target: 'sitemap-cache.ts',
        notes: 'Ensure sitemap cache is being refreshed by content-auto-fix-lite cron. A cached sitemap should respond in <200ms.',
      },
    });
  }

  if (sitemapCheck.reachable && sitemapCheck.urlCount === 0) {
    issues.push({
      severity: 'P0',
      category: 'crawl',
      url: `${baseUrl}/sitemap.xml`,
      message: 'Sitemap is reachable but contains 0 URLs',
      suggestedFix: {
        scope: 'systemic',
        target: 'sitemap-cache.ts',
        notes: 'Sitemap cache may be empty. Run content-auto-fix-lite cron or check regenerateAllSitemapCaches().',
      },
    });
  }

  // 2. Get crawl data from DB
  const pages = await getCrawlDataFromDb(siteId);
  const summary = buildSummary(pages);

  // 3. Flag stale crawls
  for (const page of pages) {
    if (page.daysSinceLastCrawl === null) {
      issues.push({
        severity: 'P1',
        category: 'crawl',
        url: page.url,
        message: 'Google has never crawled this page (no last_crawled_at in GSC inspection)',
        evidence: {
          snippet: `Indexing state: ${page.indexingState || 'unknown'}, Coverage: ${page.coverageState || 'unknown'}`,
        },
        suggestedFix: {
          scope: 'page-level',
          target: page.url,
          notes: 'Submit via IndexNow and GSC sitemap. Check robots.txt is not blocking. Ensure page is in sitemap.xml.',
        },
      });
    } else if (page.daysSinceLastCrawl >= CRITICAL_STALE_DAYS) {
      issues.push({
        severity: 'P1',
        category: 'crawl',
        url: page.url,
        message: `Last crawled ${page.daysSinceLastCrawl} days ago (>${CRITICAL_STALE_DAYS}d threshold)`,
        evidence: {
          snippet: `Last crawl: ${page.lastCrawledAt}, State: ${page.indexingState || 'unknown'}`,
        },
        suggestedFix: {
          scope: 'page-level',
          target: page.url,
          notes: 'Page may be deprioritized by Google. Update content, resubmit via IndexNow, and verify internal linking.',
        },
      });
    } else if (page.daysSinceLastCrawl >= STALE_CRAWL_DAYS) {
      issues.push({
        severity: 'P2',
        category: 'crawl',
        url: page.url,
        message: `Last crawled ${page.daysSinceLastCrawl} days ago (>${STALE_CRAWL_DAYS}d)`,
        evidence: {
          snippet: `Last crawl: ${page.lastCrawledAt}`,
        },
      });
    }
  }

  // 4. Summary-level issues
  if (summary.neverCrawled > 0 && summary.totalTracked > 0) {
    const pct = Math.round((summary.neverCrawled / summary.totalTracked) * 100);
    if (pct >= 50) {
      issues.push({
        severity: 'P0',
        category: 'crawl',
        url: baseUrl,
        message: `${pct}% of tracked pages (${summary.neverCrawled}/${summary.totalTracked}) have never been crawled by Google`,
        suggestedFix: {
          scope: 'systemic',
          target: 'verify-indexing cron + IndexNow',
          notes: 'Ensure verify-indexing cron is running, sitemap is submitted in GSC, and IndexNow key is configured.',
        },
      });
    }
  }

  return {
    issues,
    data: {
      sitemapCheck,
      pages,
      summary,
    },
  };
}
