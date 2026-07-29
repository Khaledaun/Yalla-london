/**
 * Crawl Freshness & Indexing Health Validator
 *
 * Answers: "What is the exact indexing/crawling status of EVERY page?"
 *
 * Data sources:
 * 1. URLIndexingStatus table — full record including inspection_result JSON
 *    (populated by verify-indexing cron, runs 2x daily)
 * 2. GscPagePerformance table — daily clicks/impressions per page
 *    (populated by gsc-sync cron)
 * 3. Live sitemap fetch — checks reachability + response time
 *
 * Produces:
 * - CrawlFreshnessData with per-page detail (inspection, GSC performance, submission history)
 * - IndexingHealthSnapshot for the exec summary
 * - AuditIssue[] for pages with stale/missing crawl data or indexing problems
 *
 * Design: Extracts ALL available data from DB in batched queries.
 * Never skips pages — every tracked URL gets a full PageIndexingDetail record.
 */

import type {
  AuditIssue,
  AuditConfig,
  CrawlFreshnessData,
  PageIndexingDetail,
  CrawlFreshnessSummary,
  IndexingHealthSnapshot,
} from '../types';
import { extractInspectionDetails } from '@/lib/seo/indexing-summary';

const STALE_CRAWL_DAYS = 14;
const CRITICAL_STALE_DAYS = 30;
const SITEMAP_TIMEOUT_MS = 10_000;

// ─── Sitemap Check ──────────────────────────────────────────────────────

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

// ─── Extract inspection_result JSON into structured fields ──────────────
// Uses shared extractInspectionDetails() from @/lib/seo/indexing-summary
// (single source of truth for inspection parsing)

// ─── Full DB Data Extraction ────────────────────────────────────────────

async function getFullIndexingData(siteId: string): Promise<PageIndexingDetail[]> {
  try {
    const { prisma } = await import('@/lib/db');

    // Phase 1: Get ALL URLIndexingStatus records (no limit — we want every page)
    const records = await prisma.uRLIndexingStatus.findMany({
      where: { site_id: siteId },
      orderBy: { last_crawled_at: 'desc' },
      take: 2000, // Safety cap for very large sites
    });

    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // Phase 2: Get GSC performance data (batched — one query for 7d, one for 30d)
    let perf7dMap = new Map<string, { clicks: number; impressions: number; ctr: number; position: number }>();
    let perf30dMap = new Map<string, { clicks: number; impressions: number }>();
    let perfPrev7dMap = new Map<string, { impressions: number }>();

    try {
      // 7-day performance
      const perf7d = await prisma.gscPagePerformance.groupBy({
        by: ['url'],
        _sum: { clicks: true, impressions: true },
        _avg: { ctr: true, position: true },
        where: { site_id: siteId, date: { gte: sevenDaysAgo } },
      });
      for (const row of perf7d) {
        perf7dMap.set(row.url, {
          clicks: row._sum.clicks || 0,
          impressions: row._sum.impressions || 0,
          ctr: row._avg.ctr || 0,
          position: row._avg.position || 0,
        });
      }

      // 30-day performance
      const perf30d = await prisma.gscPagePerformance.groupBy({
        by: ['url'],
        _sum: { clicks: true, impressions: true },
        where: { site_id: siteId, date: { gte: thirtyDaysAgo } },
      });
      for (const row of perf30d) {
        perf30dMap.set(row.url, {
          clicks: row._sum.clicks || 0,
          impressions: row._sum.impressions || 0,
        });
      }

      // Previous 7-day impressions (for trend calculation)
      const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
      const prevPerf = await prisma.gscPagePerformance.groupBy({
        by: ['url'],
        _sum: { impressions: true },
        where: { site_id: siteId, date: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
      });
      for (const row of prevPerf) {
        perfPrev7dMap.set(row.url, { impressions: row._sum.impressions || 0 });
      }
    } catch (err) {
      console.warn('[crawl-freshness] GscPagePerformance query failed (non-fatal):', err instanceof Error ? err.message : String(err));
    }

    // Phase 3: Build per-page detail records
    return records.map((r) => {
      const p7d = perf7dMap.get(r.url);
      const p30d = perf30dMap.get(r.url);
      const pPrev = perfPrev7dMap.get(r.url);

      // Calculate impression trend
      let impressionsTrend: number | null = null;
      if (p7d && pPrev && pPrev.impressions > 0) {
        impressionsTrend = Math.round(((p7d.impressions - pPrev.impressions) / pPrev.impressions) * 100);
      }

      const detail: PageIndexingDetail = {
        url: r.url,
        // Crawl timing
        lastCrawledAt: r.last_crawled_at?.toISOString() || null,
        lastInspectedAt: r.last_inspected_at?.toISOString() || null,
        daysSinceLastCrawl: r.last_crawled_at
          ? Math.floor((now - r.last_crawled_at.getTime()) / (24 * 60 * 60 * 1000))
          : null,
        // Indexing status
        status: r.status || null,
        indexingState: r.indexing_state || null,
        coverageState: r.coverage_state || null,
        // Submission history
        submittedIndexnow: r.submitted_indexnow || false,
        submittedSitemap: r.submitted_sitemap || false,
        submittedGoogleApi: r.submitted_google_api || false,
        submissionAttempts: r.submission_attempts || 0,
        lastSubmittedAt: r.last_submitted_at?.toISOString() || null,
        lastError: r.last_error || null,
        // Inspection details
        inspection: extractInspectionDetails(r.inspection_result),
        // GSC performance
        gscPerformance: (p7d || p30d) ? {
          clicks7d: p7d?.clicks || 0,
          impressions7d: p7d?.impressions || 0,
          ctr7d: Math.round((p7d?.ctr || 0) * 1000) / 1000,
          position7d: Math.round((p7d?.position || 0) * 10) / 10,
          clicks30d: p30d?.clicks || 0,
          impressions30d: p30d?.impressions || 0,
          impressionsTrend,
        } : undefined,
      };

      return detail;
    });
  } catch (err) {
    console.warn('[crawl-freshness] Full indexing data extraction failed:', err instanceof Error ? err.message : String(err));
    return [];
  }
}

// ─── Build Summary ──────────────────────────────────────────────────────

function buildSummary(pages: PageIndexingDetail[]): CrawlFreshnessSummary {
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

  // Indexing breakdown
  let indexed = 0, submitted = 0, discovered = 0, errors = 0, deindexed = 0, neverSubmitted = 0;
  let viaIndexnow = 0, viaSitemap = 0, viaGoogleApi = 0;
  let totalClicks7d = 0, totalImpressions7d = 0;
  const positions: number[] = [];

  for (const p of pages) {
    const s = (p.status || '').toLowerCase();
    if (s === 'indexed') indexed++;
    else if (s === 'submitted' || s === 'pending') submitted++;
    else if (s === 'discovered') discovered++;
    else if (s === 'error' || s === 'chronic_failure') errors++;
    else if (s === 'deindexed') deindexed++;
    else neverSubmitted++;

    if (p.submittedIndexnow) viaIndexnow++;
    if (p.submittedSitemap) viaSitemap++;
    if (p.submittedGoogleApi) viaGoogleApi++;

    if (p.gscPerformance) {
      totalClicks7d += p.gscPerformance.clicks7d;
      totalImpressions7d += p.gscPerformance.impressions7d;
      if (p.gscPerformance.position7d > 0) positions.push(p.gscPerformance.position7d);
    }
  }

  return {
    totalTracked: pages.length,
    crawledWithin7d,
    crawledWithin14d,
    crawledWithin30d,
    neverCrawled: neverCrawled.length,
    oldestCrawlDate: crawlDates[0] || null,
    newestCrawlDate: crawlDates[crawlDates.length - 1] || null,
    averageDaysSinceCrawl: avgDays,
    // Indexing
    indexed,
    submitted,
    discovered,
    errors,
    deindexed,
    neverSubmitted,
    // GSC aggregate
    totalClicks7d,
    totalImpressions7d,
    avgPosition7d: positions.length > 0
      ? Math.round(positions.reduce((a, b) => a + b, 0) / positions.length * 10) / 10
      : null,
    // Channels
    viaIndexnow,
    viaSitemap,
    viaGoogleApi,
  };
}

// ─── Build Indexing Health Snapshot ──────────────────────────────────────

function buildIndexingHealth(pages: PageIndexingDetail[], summary: CrawlFreshnessSummary): IndexingHealthSnapshot {
  const total = summary.totalTracked;
  const indexingRate = total > 0 ? Math.round((summary.indexed / total) * 100) : 0;
  const submissionRate = total > 0 ? Math.round(((summary.indexed + summary.submitted) / total) * 100) : 0;

  // Avg time to index (for pages that have both submitted and indexed timestamps)
  const indexedPages = pages.filter((p) => p.status === 'indexed' && p.lastSubmittedAt);
  const deltas = indexedPages
    .map((p) => {
      const submitted = new Date(p.lastSubmittedAt!).getTime();
      const crawled = p.lastCrawledAt ? new Date(p.lastCrawledAt).getTime() : Date.now();
      return crawled - submitted;
    })
    .filter((d) => d > 0);
  const avgTimeToIndexDays = deltas.length >= 3
    ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length / (1000 * 60 * 60 * 24))
    : null;

  // Stale submissions (submitted >14d ago, not indexed)
  const fourteenDaysAgoMs = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const staleSubmissions = pages.filter((p) =>
    (p.status === 'submitted' || p.status === 'pending') &&
    p.lastSubmittedAt &&
    new Date(p.lastSubmittedAt).getTime() < fourteenDaysAgoMs
  ).length;

  // Chronic failures
  const chronicFailures = pages.filter((p) =>
    p.status !== 'indexed' && p.submissionAttempts >= 5
  ).length;

  // Hreflang mismatches (EN indexed but /ar/ counterpart not, or vice versa)
  let hreflangMismatches = 0;
  const urlStatusMap = new Map<string, string>();
  for (const p of pages) {
    urlStatusMap.set(p.url, p.status || '');
  }
  const checkedPairs = new Set<string>();
  for (const [url, status] of urlStatusMap) {
    if (status !== 'indexed') continue;
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      let counterpartPath: string | null = null;
      if (path.startsWith('/ar/') || path === '/ar') {
        counterpartPath = path === '/ar' ? '/' : path.replace(/^\/ar/, '');
      } else {
        counterpartPath = path === '/' ? '/ar' : `/ar${path}`;
      }
      if (counterpartPath) {
        const counterpartUrl = `${urlObj.origin}${counterpartPath}`;
        const pairKey = [url, counterpartUrl].sort().join('|');
        if (checkedPairs.has(pairKey)) continue;
        checkedPairs.add(pairKey);
        const counterpartStatus = urlStatusMap.get(counterpartUrl);
        if (counterpartStatus && counterpartStatus !== 'indexed') {
          hreflangMismatches++;
        }
      }
    } catch { /* URL parse error — skip */ }
  }

  // Top blockers
  const topBlockers: string[] = [];
  if (summary.neverSubmitted > 0) topBlockers.push(`${summary.neverSubmitted} pages never submitted`);
  if (staleSubmissions > 0) topBlockers.push(`${staleSubmissions} pages submitted 14+ days ago, still not indexed`);
  if (summary.errors > 0) topBlockers.push(`${summary.errors} pages with submission errors`);
  if (chronicFailures > 0) topBlockers.push(`${chronicFailures} chronic failures (5+ attempts)`);
  if (summary.deindexed > 0) topBlockers.push(`${summary.deindexed} pages deindexed by Google`);
  if (hreflangMismatches > 0) topBlockers.push(`${hreflangMismatches} hreflang pair mismatches`);

  // Inspection-level blockers
  const robotsBlocked = pages.filter((p) => p.inspection?.robotsTxtState === 'DISALLOWED').length;
  const noindexed = pages.filter((p) => p.inspection?.indexingAllowed === 'DISALLOWED').length;
  const fetchFailed = pages.filter((p) => p.inspection?.pageFetchState && p.inspection.pageFetchState !== 'SUCCESSFUL').length;
  const canonicalMismatch = pages.filter((p) => p.inspection?.canonicalMismatch).length;

  if (robotsBlocked > 0) topBlockers.push(`${robotsBlocked} pages blocked by robots.txt`);
  if (noindexed > 0) topBlockers.push(`${noindexed} pages with noindex`);
  if (fetchFailed > 0) topBlockers.push(`${fetchFailed} pages where Google fetch failed`);
  if (canonicalMismatch > 0) topBlockers.push(`${canonicalMismatch} canonical mismatches`);

  return {
    indexingRate,
    submissionRate,
    avgTimeToIndexDays,
    staleSubmissions,
    chronicFailures,
    hreflangMismatches,
    topBlockers,
  };
}

// ─── Main Validator ─────────────────────────────────────────────────────

/**
 * Main validator — returns issues + comprehensive crawl/indexing data.
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

  // 2. Get FULL indexing data from DB (all fields, all pages)
  const pages = await getFullIndexingData(siteId);
  const summary = buildSummary(pages);
  const indexingHealth = buildIndexingHealth(pages, summary);

  // 3. Flag crawl issues per page
  for (const page of pages) {
    // Crawl freshness issues
    if (page.daysSinceLastCrawl === null) {
      issues.push({
        severity: 'P1',
        category: 'crawl',
        url: page.url,
        message: 'Google has never crawled this page (no last_crawled_at in GSC inspection)',
        evidence: {
          snippet: `Status: ${page.status || 'unknown'}, Coverage: ${page.coverageState || 'unknown'}, Submitted: ${page.submittedIndexnow ? 'IndexNow' : ''} ${page.submittedSitemap ? 'Sitemap' : ''} ${page.submittedGoogleApi ? 'GSC API' : ''} (${page.submissionAttempts} attempts)`.trim(),
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
          snippet: `Last crawl: ${page.lastCrawledAt}, State: ${page.indexingState || 'unknown'}, Impressions(7d): ${page.gscPerformance?.impressions7d ?? 'no data'}`,
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
          snippet: `Last crawl: ${page.lastCrawledAt}, Impressions(7d): ${page.gscPerformance?.impressions7d ?? 'no data'}`,
        },
      });
    }

    // Inspection-level issues
    if (page.inspection) {
      if (page.inspection.robotsTxtState === 'DISALLOWED') {
        issues.push({
          severity: 'P0',
          category: 'crawl',
          url: page.url,
          message: 'robots.txt is blocking Google from crawling this URL',
          suggestedFix: {
            scope: 'page-level',
            target: page.url,
            notes: 'Check robots.txt — this page is blocked from crawling.',
          },
        });
      }
      if (page.inspection.indexingAllowed === 'DISALLOWED') {
        issues.push({
          severity: 'P0',
          category: 'crawl',
          url: page.url,
          message: 'Indexing not allowed — page has noindex meta tag or X-Robots-Tag',
          suggestedFix: {
            scope: 'page-level',
            target: page.url,
            notes: 'Remove noindex directive to allow Google to index this page.',
          },
        });
      }
      if (page.inspection.pageFetchState && page.inspection.pageFetchState !== 'SUCCESSFUL') {
        issues.push({
          severity: 'P1',
          category: 'crawl',
          url: page.url,
          message: `Google page fetch failed: ${page.inspection.pageFetchState}`,
          evidence: {
            snippet: `Crawled as: ${page.inspection.crawledAs || 'unknown'}`,
          },
          suggestedFix: {
            scope: 'page-level',
            target: page.url,
            notes: 'Check if page returns valid HTML. SOFT_404 means Google thinks the page is empty/error despite returning 200.',
          },
        });
      }
      if (page.inspection.canonicalMismatch) {
        issues.push({
          severity: 'P1',
          category: 'canonical',
          url: page.url,
          message: `Canonical mismatch — You: ${page.inspection.userCanonical}, Google: ${page.inspection.googleCanonical}`,
          suggestedFix: {
            scope: 'page-level',
            target: page.url,
            notes: 'Ensure the canonical tag matches the URL Google should index. A mismatch means Google may index a different URL than intended.',
          },
        });
      }
    }

    // Impression drop per page (negative trend > 30%)
    if (page.gscPerformance?.impressionsTrend !== null && page.gscPerformance?.impressionsTrend !== undefined) {
      if (page.gscPerformance.impressionsTrend <= -50 && page.gscPerformance.impressions7d < (page.gscPerformance.impressions30d / 4) * 0.5) {
        issues.push({
          severity: 'P1',
          category: 'crawl',
          url: page.url,
          message: `Impression drop: ${page.gscPerformance.impressionsTrend}% week-over-week (${page.gscPerformance.impressions7d} this week)`,
          evidence: {
            snippet: `Clicks(7d): ${page.gscPerformance.clicks7d}, Position: ${page.gscPerformance.position7d}, Status: ${page.status || 'unknown'}`,
          },
        });
      }
    }

    // Chronic failure
    if (page.status !== 'indexed' && page.submissionAttempts >= 5) {
      issues.push({
        severity: 'P1',
        category: 'crawl',
        url: page.url,
        message: `Chronic failure: ${page.submissionAttempts} submission attempts, still not indexed`,
        evidence: {
          snippet: `Last error: ${page.lastError || 'none'}, Coverage: ${page.coverageState || 'unknown'}`,
        },
        suggestedFix: {
          scope: 'page-level',
          target: page.url,
          notes: 'This page has failed to index after multiple attempts. Check content quality, robots.txt, and try manual URL inspection in GSC.',
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

  // Low indexing rate
  if (indexingHealth.indexingRate < 50 && summary.totalTracked >= 5) {
    issues.push({
      severity: 'P0',
      category: 'crawl',
      url: baseUrl,
      message: `Low indexing rate: ${indexingHealth.indexingRate}% (${summary.indexed}/${summary.totalTracked} pages indexed)`,
      suggestedFix: {
        scope: 'systemic',
        target: 'SEO agent + IndexNow + sitemap',
        notes: 'Check that SEO agent is running, sitemap is valid, and content passes quality gates.',
      },
    });
  }

  return {
    issues,
    data: {
      sitemapCheck,
      pages,
      summary,
      indexingHealth,
    },
  };
}
