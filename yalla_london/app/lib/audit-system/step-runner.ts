/**
 * Step Runner — Multi-step cron state machine for SEO audits.
 *
 * Each cron invocation (every 15 min) advances the audit through one step:
 *   pending → inventory → crawling (N batches) → validating → completed
 *
 * State is persisted in the AuditRun DB record between invocations.
 * Designed to fit within Vercel's 53s budget per invocation.
 */

import type { StepRunnerResult, AuditRunStatus } from './types';
import type {
  AuditConfig,
  CrawlResult,
  ExtractedSignals,
  AuditIssue as MasterAuditIssue,
  AuditRunResult,
  HardGateResult,
  SoftGateResult,
  UrlInventoryEntry,
} from '@/lib/master-audit/types';
import {
  getActiveAuditRun,
  updateAuditRunStatus,
  saveAuditResults,
} from './db-adapter';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUDGET_MS = 53_000; // 53s budget (7s buffer for Vercel's 60s limit)
const BATCH_SIZE = 10; // URLs per crawl batch (conservative for 53s)

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Advance the audit for a site by one step. Called by the cron route.
 * Returns info about what was done.
 */
export async function advanceAuditStep(
  siteId: string,
  startTimeMs: number = Date.now()
): Promise<StepRunnerResult> {
  const run = await getActiveAuditRun(siteId);

  if (!run) {
    return {
      advanced: false,
      newStatus: 'completed' as AuditRunStatus,
      message: 'No active audit run found',
      processedInStep: 0,
    };
  }

  const remainingMs = () => BUDGET_MS - (Date.now() - startTimeMs);

  try {
    switch (run.status) {
      case 'pending':
        return await stepInventory(run.id, siteId, startTimeMs);

      case 'inventory':
      case 'crawling':
        return await stepCrawl(run, remainingMs, startTimeMs);

      case 'validating':
        return await stepValidate(run, startTimeMs);

      default:
        return {
          advanced: false,
          newStatus: run.status as AuditRunStatus,
          message: `Unexpected status: ${run.status}`,
          processedInStep: 0,
        };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[audit-step-runner] Error in step for run ${run.id}:`, msg);

    await updateAuditRunStatus(run.id, {
      status: 'failed',
      errorMessage: msg,
      completedAt: new Date(),
    });

    return {
      advanced: true,
      newStatus: 'failed',
      message: `Failed: ${msg}`,
      processedInStep: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Step 1: Inventory — build URL list
// ---------------------------------------------------------------------------

async function stepInventory(
  runId: string,
  siteId: string,
  _startTimeMs: number
): Promise<StepRunnerResult> {
  // Load config
  const { loadAuditConfig } = await import('@/lib/master-audit/config-loader');
  const config = loadAuditConfig(siteId);
  const baseUrl = config.baseUrl.replace(/\/+$/, '');

  // Build inventory
  const { buildInventory } = await import(
    '@/lib/master-audit/inventory-builder'
  );
  const { urls, inventory, sitemapXml } = await buildInventory(config, baseUrl);

  const totalBatches = Math.ceil(urls.length / BATCH_SIZE);

  // Save state
  await updateAuditRunStatus(runId, {
    status: 'crawling',
    totalUrls: urls.length,
    totalBatches,
    currentBatch: 0,
    processedUrls: 0,
    urlInventory: urls,
    sitemapXml,
    crawlResults: {}, // empty to start
  });

  console.log(
    `[audit-step-runner] Inventory built: ${urls.length} URLs, ${totalBatches} batches`
  );

  return {
    advanced: true,
    newStatus: 'crawling',
    message: `Inventory built: ${urls.length} URLs in ${totalBatches} batches`,
    processedInStep: urls.length,
  };
}

// ---------------------------------------------------------------------------
// Step 2: Crawl — process one batch of URLs
// ---------------------------------------------------------------------------

async function stepCrawl(
  run: any, // Prisma dynamic return type
  remainingMs: () => number,
  _startTimeMs: number
): Promise<StepRunnerResult> {
  const urls: string[] = (run.urlInventory as string[]) ?? [];
  const currentBatch = run.currentBatch ?? 0;
  const totalBatches = run.totalBatches ?? 1;

  // All batches done?
  if (currentBatch >= totalBatches) {
    await updateAuditRunStatus(run.id, { status: 'validating' });
    return {
      advanced: true,
      newStatus: 'validating',
      message: 'All crawl batches complete, moving to validation',
      processedInStep: 0,
    };
  }

  // Budget check
  if (remainingMs() < 10_000) {
    return {
      advanced: false,
      newStatus: 'crawling',
      message: 'Insufficient budget for crawl batch, will continue next invocation',
      processedInStep: 0,
    };
  }

  // Get batch URLs
  const batchStart = currentBatch * BATCH_SIZE;
  const batchUrls = urls.slice(batchStart, batchStart + BATCH_SIZE);

  // Load config for crawl settings
  const { loadAuditConfig } = await import('@/lib/master-audit/config-loader');
  const config = loadAuditConfig(run.siteId);

  // Adjust timeout to fit within remaining budget
  const crawlTimeout = Math.min(
    config.crawl.timeoutMs,
    Math.floor(remainingMs() * 0.8) // leave 20% buffer
  );

  // Crawl the batch
  const { crawlBatch } = await import('@/lib/master-audit/crawler');
  const batchResults = await crawlBatch(batchUrls, {
    ...config.crawl,
    timeoutMs: crawlTimeout,
  });

  // Merge results into existing crawl data
  const existingResults =
    (run.crawlResults as Record<string, unknown>) ?? {};
  for (const result of batchResults) {
    // Store a minimal version (no html body) to keep DB size manageable
    existingResults[result.url] = {
      url: result.url,
      status: result.status,
      redirectChain: result.redirectChain,
      finalUrl: result.finalUrl,
      headers: result.headers,
      html: result.html, // Need full HTML for signal extraction in validation step
      timing: result.timing,
      error: result.error,
    };
  }

  const newProcessedUrls = (run.processedUrls ?? 0) + batchResults.length;
  const nextBatch = currentBatch + 1;
  const allDone = nextBatch >= totalBatches;

  await updateAuditRunStatus(run.id, {
    status: allDone ? 'validating' : 'crawling',
    currentBatch: nextBatch,
    processedUrls: newProcessedUrls,
    crawlResults: existingResults,
  });

  const statusMsg = allDone
    ? `Batch ${nextBatch}/${totalBatches} complete. All URLs crawled, moving to validation.`
    : `Batch ${nextBatch}/${totalBatches} complete (${batchResults.length} URLs). ${totalBatches - nextBatch} batches remaining.`;

  console.log(`[audit-step-runner] ${statusMsg}`);

  return {
    advanced: true,
    newStatus: allDone ? 'validating' : 'crawling',
    message: statusMsg,
    processedInStep: batchResults.length,
  };
}

// ---------------------------------------------------------------------------
// Step 3: Validate — run all validators + risk scanners + evaluate gates
// ---------------------------------------------------------------------------

async function stepValidate(
  run: any, // Prisma dynamic return type
  _startTimeMs: number
): Promise<StepRunnerResult> {
  // Load config
  const { loadAuditConfig } = await import('@/lib/master-audit/config-loader');
  const config = loadAuditConfig(run.siteId);
  const baseUrl = config.baseUrl.replace(/\/+$/, '');

  // Reconstruct crawl results map
  const rawResults = (run.crawlResults as Record<string, CrawlResult>) ?? {};
  const crawlResults = new Map<string, CrawlResult>();
  for (const [url, result] of Object.entries(rawResults)) {
    crawlResults.set(url, result as CrawlResult);
  }

  // Extract signals from all crawled pages
  const { extractSignals } = await import('@/lib/master-audit/extractor');
  const allSignals = new Map<string, ExtractedSignals>();
  for (const [url, result] of crawlResults) {
    if (result.html && result.status >= 200 && result.status < 400) {
      const signals = extractSignals(result.html, url, baseUrl);
      allSignals.set(url, signals);
    }
  }

  // Run validators
  const allIssues: MasterAuditIssue[] = [];
  const sitemapUrls = new Set(
    ((run.urlInventory as string[]) ?? []).filter(
      (u: string) => !u.includes('/ar/')
    )
  );

  // Import validators
  const { validateHttp } = await import('@/lib/master-audit/validators/http');
  const { validateCanonical } = await import('@/lib/master-audit/validators/canonical');
  const { validateHreflang } = await import('@/lib/master-audit/validators/hreflang');
  const { validateSitemap } = await import('@/lib/master-audit/validators/sitemap');
  const { validateSchema } = await import('@/lib/master-audit/validators/schema');
  const { validateLinks } = await import('@/lib/master-audit/validators/links');
  const { validateMetadata } = await import('@/lib/master-audit/validators/metadata');
  const { validateRobots } = await import('@/lib/master-audit/validators/robots');

  // Per-page validators
  for (const [url, result] of crawlResults) {
    if (config.validators.enabled.http) {
      allIssues.push(...validateHttp(result, config));
    }

    const signals = allSignals.get(url);
    if (signals) {
      if (config.validators.enabled.canonical) {
        allIssues.push(...validateCanonical(signals, url, config));
      }
      if (config.validators.enabled.hreflang) {
        allIssues.push(
          ...validateHreflang(signals, url, allSignals, config)
        );
      }
      if (config.validators.enabled.schema) {
        allIssues.push(...validateSchema(signals, url, config));
      }
      if (config.validators.enabled.metadata) {
        allIssues.push(
          ...validateMetadata(signals, url, allSignals, config)
        );
      }
      if (config.validators.enabled.robots) {
        allIssues.push(
          ...validateRobots(signals, url, sitemapUrls, config)
        );
      }
    }
  }

  // Cross-page validators
  if (config.validators.enabled.sitemap) {
    allIssues.push(
      ...validateSitemap(run.sitemapXml ?? '', crawlResults, config)
    );
  }
  if (config.validators.enabled.links) {
    allIssues.push(
      ...validateLinks(allSignals, crawlResults, config)
    );
  }

  // Risk scanners
  const { scanScaledContentAbuse } = await import('@/lib/master-audit/risk-scanners/scaled-content');
  const { scanSiteReputationAbuse } = await import('@/lib/master-audit/risk-scanners/site-reputation');
  const { scanExpiredDomainAbuse } = await import('@/lib/master-audit/risk-scanners/expired-domain');

  if (config.riskScanners.enabled.scaledContentAbuse) {
    allIssues.push(
      ...scanScaledContentAbuse(allSignals, config.riskScanners)
    );
  }
  if (config.riskScanners.enabled.siteReputationAbuse) {
    allIssues.push(
      ...scanSiteReputationAbuse(allSignals, config.riskScanners)
    );
  }
  if (config.riskScanners.enabled.expiredDomainAbuse) {
    allIssues.push(
      ...scanExpiredDomainAbuse(allSignals, config.riskScanners, baseUrl)
    );
  }

  // Run Lighthouse on key URLs (if API key is configured)
  try {
    const keyUrls =
      (config as unknown as Record<string, unknown>).keyUrls as string[] | undefined;
    if (keyUrls && keyUrls.length > 0) {
      const { runLighthouseAudits } = await import('./lighthouse-runner');
      const lighthouseResult = await runLighthouseAudits(
        keyUrls.slice(0, 5), // Max 5 key URLs
        baseUrl,
        { timeoutMs: 15_000, strategy: 'mobile' }
      );
      allIssues.push(...lighthouseResult.issues);
      console.log(
        `[audit-step-runner] Lighthouse: ${lighthouseResult.issues.length} issues from ${lighthouseResult.results.length} pages`
      );
    }
  } catch (lhError) {
    console.warn(
      '[audit-step-runner] Lighthouse step failed (non-blocking):',
      lhError instanceof Error ? lhError.message : lhError
    );
  }

  // Evaluate hard gates
  const hardGates = evaluateHardGates(allIssues, config);
  const softGates = evaluateSoftGates(allIssues, allSignals, config);

  // Generate reports
  const { generateExecSummary, generateFixPlan } = await import(
    '@/lib/master-audit/reporter'
  );

  const result: AuditRunResult = {
    runId: run.id,
    siteId: run.siteId,
    mode: run.mode as 'full' | 'quick',
    startTime: run.startedAt.toISOString(),
    endTime: new Date().toISOString(),
    totalUrls: run.totalUrls,
    issues: allIssues,
    hardGates,
    softGates,
    urlInventory: ((run.urlInventory as string[]) ?? []).map((url: string) => ({
      url,
      source: 'static' as const,
      status: crawlResults.get(url)?.status,
    })),
  };

  const reportMarkdown = generateExecSummary(result);
  const fixPlanMarkdown = generateFixPlan(result);

  // Save to DB via adapter (handles fingerprinting + dedup)
  await saveAuditResults(
    run.id,
    run.siteId,
    result,
    reportMarkdown,
    fixPlanMarkdown,
    config
  );

  console.log(
    `[audit-step-runner] Validation complete: ${allIssues.length} issues, ` +
      `health score ${computeQuickScore(allIssues)}, ` +
      `hard gates ${hardGates.every((g) => g.passed) ? 'PASSED' : 'FAILED'}`
  );

  return {
    advanced: true,
    newStatus: 'completed',
    message: `Audit complete: ${allIssues.length} issues found (P0: ${allIssues.filter((i) => i.severity === 'P0').length}, P1: ${allIssues.filter((i) => i.severity === 'P1').length}, P2: ${allIssues.filter((i) => i.severity === 'P2').length})`,
    processedInStep: allIssues.length,
  };
}

// ---------------------------------------------------------------------------
// Helper: evaluate hard gates (duplicated from master-audit/index.ts to avoid
// importing the full orchestrator which has fs dependencies)
// ---------------------------------------------------------------------------

function evaluateHardGates(
  issues: MasterAuditIssue[],
  config: AuditConfig
): HardGateResult[] {
  return config.hardGates.map((gate) => {
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
      threshold: gate.maxTotal,
      urls: affectedUrls,
    };
  });
}

function evaluateSoftGates(
  issues: MasterAuditIssue[],
  allSignals: Map<string, ExtractedSignals>,
  _config: AuditConfig
): SoftGateResult[] {
  const softGates: SoftGateResult[] = [];

  // Pages without meta description
  const noDescPages = [...allSignals.entries()]
    .filter(([, s]) => !s.metaDescription)
    .map(([url]) => url);
  if (noDescPages.length > 0) {
    softGates.push({
      gateName: 'pages-without-meta-description',
      count: noDescPages.length,
      urls: noDescPages,
      description: 'Pages missing meta description',
    });
  }

  // Thin content pages
  const thinPages = [...allSignals.entries()]
    .filter(([, s]) => s.wordCount < 300)
    .map(([url]) => url);
  if (thinPages.length > 0) {
    softGates.push({
      gateName: 'thin-content-pages',
      count: thinPages.length,
      urls: thinPages,
      description: 'Pages with fewer than 300 words',
    });
  }

  // Pages without structured data
  const noSchemaPages = [...allSignals.entries()]
    .filter(([, s]) => s.jsonLd.length === 0)
    .map(([url]) => url);
  if (noSchemaPages.length > 0) {
    softGates.push({
      gateName: 'pages-without-structured-data',
      count: noSchemaPages.length,
      urls: noSchemaPages,
      description: 'Pages without JSON-LD structured data',
    });
  }

  return softGates;
}

function computeQuickScore(issues: MasterAuditIssue[]): number {
  const weights: Record<string, number> = { P0: 15, P1: 8, P2: 3 };
  let deduction = 0;
  for (const issue of issues) {
    deduction += weights[issue.severity] ?? 3;
  }
  return Math.max(0, 100 - deduction);
}
