/**
 * Master Audit Engine — Main Orchestrator
 *
 * Coordinates the full audit pipeline:
 * 1. Load config
 * 2. Build or resume URL inventory
 * 3. Crawl in batches (with state saving after each batch)
 * 4. Extract signals from all crawled pages
 * 5. Run all validators
 * 6. Run risk scanners (stub)
 * 7. Evaluate hard gates
 * 8. Generate reports
 * 9. Save final state + outputs
 *
 * Supports resume: skip completed batches, continue from last incomplete.
 * Read-only outside docs/master-audit/<runId>/.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  AuditConfig,
  AuditRunResult,
  AuditIssue,
  AuditState,
  CrawlResult,
  ExtractedSignals,
  HardGateResult,
  SoftGateResult,
  UrlInventoryEntry,
  AuditMode,
} from './types';
import { loadAuditConfig } from './config-loader';
import {
  generateRunId,
  createState,
  saveState,
  loadState,
  markBatchStarted,
  markBatchCompleted,
  markBatchFailed,
  recordError,
  getPendingBatchIndices,
  findLatestRunId,
} from './state-manager';
import { buildInventory } from './inventory-builder';
import { crawlBatch } from './crawler';
import { extractSignals } from './extractor';
import { validateHttp } from './validators/http';
import { validateCanonical } from './validators/canonical';
import { validateHreflang } from './validators/hreflang';
import { validateSitemap } from './validators/sitemap';
import { validateSchema } from './validators/schema';
import { validateLinks } from './validators/links';
import { validateMetadata } from './validators/metadata';
import { validateRobots } from './validators/robots';
import { generateExecSummary, generateFixPlan } from './reporter';
import { scanScaledContentAbuse } from './risk-scanners/scaled-content';
import { scanSiteReputationAbuse } from './risk-scanners/site-reputation';
import { scanExpiredDomainAbuse } from './risk-scanners/expired-domain';

// ---------------------------------------------------------------------------
// Options interface
// ---------------------------------------------------------------------------

export interface MasterAuditOptions {
  /** Site ID (required) */
  siteId: string;
  /** Audit mode: preview (local), prod (live read-only), full, quick, resume */
  mode?: AuditMode;
  /** Base URL override (default: from config) */
  baseUrl?: string;
  /** Batch size override */
  batchSize?: number;
  /** Concurrency override */
  concurrency?: number;
  /** Run ID to resume (for mode=resume) */
  resumeRunId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeOutput(
  outputDir: string,
  runId: string,
  fileName: string,
  content: string
): void {
  const dir = path.resolve(process.cwd(), outputDir, runId);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, fileName), content, 'utf-8');
}

// ---------------------------------------------------------------------------
// Hard gate evaluation
// ---------------------------------------------------------------------------

function evaluateHardGates(
  issues: AuditIssue[],
  config: AuditConfig
): HardGateResult[] {
  return config.hardGates.map((gate) => {
    const categoryIssues = issues.filter(
      (i) => i.category === gate.category
    );
    const p0Count = categoryIssues.filter(
      (i) => i.severity === 'P0'
    ).length;
    const totalCount = categoryIssues.length;
    const affectedUrls = [
      ...new Set(categoryIssues.map((i) => i.url)),
    ];

    let passed = true;

    // Check P0 threshold
    if (p0Count > gate.maxP0) {
      passed = false;
    }

    // Check total threshold (if not unlimited)
    if (gate.maxTotal >= 0 && totalCount > gate.maxTotal) {
      passed = false;
    }

    return {
      gateName: gate.name,
      passed,
      count: totalCount,
      threshold: gate.maxTotal >= 0 ? gate.maxTotal : gate.maxP0,
      urls: affectedUrls,
    };
  });
}

// ---------------------------------------------------------------------------
// Soft gate evaluation
// ---------------------------------------------------------------------------

function evaluateSoftGates(
  issues: AuditIssue[],
  allSignals: Map<string, ExtractedSignals>,
  config: AuditConfig
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
  const minWordCount = config.riskScanners.minWordCount;
  const thinPages = [...allSignals.entries()]
    .filter(([, s]) => s.wordCount > 0 && s.wordCount < minWordCount)
    .map(([url]) => url);
  if (thinPages.length > 0) {
    softGates.push({
      gateName: 'thin-content',
      count: thinPages.length,
      urls: thinPages,
      description: `Pages with fewer than ${minWordCount} words`,
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
      description: 'Pages with no JSON-LD structured data',
    });
  }

  // Pages without hreflang (when expected)
  if (config.validators.expectedHreflangLangs.length > 0) {
    const noHreflangPages = [...allSignals.entries()]
      .filter(([, s]) => s.hreflangAlternates.length === 0)
      .map(([url]) => url);
    if (noHreflangPages.length > 0) {
      softGates.push({
        gateName: 'pages-without-hreflang',
        count: noHreflangPages.length,
        urls: noHreflangPages,
        description: 'Pages missing hreflang tags',
      });
    }
  }

  return softGates;
}

// ---------------------------------------------------------------------------
// Risk scanners
// ---------------------------------------------------------------------------

function runRiskScanners(
  allSignals: Map<string, ExtractedSignals>,
  config: AuditConfig,
  baseUrl: string
): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // Scaled content abuse: near-duplicate clustering, thin clusters, entity coverage
  const scaledIssues = scanScaledContentAbuse(allSignals, config.riskScanners);
  issues.push(...scaledIssues);

  // Site reputation abuse: topic drift, outbound dominance, missing ownership
  const reputationIssues = scanSiteReputationAbuse(allSignals, config.riskScanners);
  issues.push(...reputationIssues);

  // Expired domain abuse: topic pivot, legacy orphans
  const expiredIssues = scanExpiredDomainAbuse(allSignals, config.riskScanners, baseUrl);
  issues.push(...expiredIssues);

  return issues;
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

export async function runMasterAudit(
  options: MasterAuditOptions
): Promise<AuditRunResult> {
  const startTime = new Date().toISOString();
  const rawMode = options.mode ?? 'full';
  // Normalize mode: preview/prod both run as 'full' but with different defaults
  const mode: AuditMode = rawMode === 'preview' || rawMode === 'prod' ? rawMode : rawMode;

  console.log(
    `[master-audit] Starting ${mode} audit for site "${options.siteId}"...`
  );

  // preview mode defaults: localhost:3000, higher concurrency
  if (rawMode === 'preview' && !options.baseUrl) {
    options.baseUrl = 'http://localhost:3000';
  }
  // prod mode defaults: stricter rate limiting
  if (rawMode === 'prod' && !options.concurrency) {
    options.concurrency = 6;
  }

  // ================================================================
  // Step 1: Load config
  // ================================================================

  const configOverrides: Partial<AuditConfig> = {};
  if (options.baseUrl) configOverrides.baseUrl = options.baseUrl;
  if (options.batchSize) {
    configOverrides.crawl = { batchSize: options.batchSize } as AuditConfig['crawl'];
  }
  if (options.concurrency) {
    configOverrides.crawl = {
      ...(configOverrides.crawl ?? {}),
      concurrency: options.concurrency,
    } as AuditConfig['crawl'];
  }

  const config = loadAuditConfig(options.siteId, configOverrides);
  const baseUrl = config.baseUrl.replace(/\/+$/, '');

  console.log(
    `[master-audit] Config loaded. Base URL: ${baseUrl}, ` +
      `Concurrency: ${config.crawl.concurrency}, Batch size: ${config.crawl.batchSize}`
  );

  // ================================================================
  // Step 2: Build or resume inventory
  // ================================================================

  let state: AuditState;
  let allUrls: string[];
  let inventory: UrlInventoryEntry[];
  let sitemapXml: string;
  const crawlResults = new Map<string, CrawlResult>();

  if (mode === 'resume') {
    // Find the run to resume
    const resumeId =
      options.resumeRunId ??
      findLatestRunId(config.outputDir, options.siteId);

    if (!resumeId) {
      throw new Error(
        `[master-audit] No previous run found to resume for site "${options.siteId}"`
      );
    }

    const loadedState = loadState(config.outputDir, resumeId);
    if (!loadedState) {
      throw new Error(
        `[master-audit] Could not load state for run "${resumeId}"`
      );
    }

    state = loadedState;
    state.status = 'running';
    allUrls = state.batches.flatMap((b) => b.urls);
    inventory = allUrls.map((url) => ({
      url,
      source: 'sitemap' as const,
    }));
    sitemapXml = ''; // Already processed in the previous run

    // Load existing crawl results from completed batches
    const completedUrls = state.batches
      .filter((b) => b.status === 'completed')
      .flatMap((b) => b.urls);

    console.log(
      `[master-audit] Resuming run "${resumeId}". ` +
        `${state.completedBatchIndices.length}/${state.batches.length} batches done, ` +
        `${completedUrls.length}/${allUrls.length} URLs already crawled.`
    );

    // Try to load cached crawl results
    const crawlCachePath = path.resolve(
      process.cwd(),
      config.outputDir,
      resumeId,
      'crawl-results.json'
    );
    if (fs.existsSync(crawlCachePath)) {
      try {
        const cached = JSON.parse(
          fs.readFileSync(crawlCachePath, 'utf-8')
        ) as Array<[string, CrawlResult]>;
        for (const [url, result] of cached) {
          crawlResults.set(url, result);
        }
        console.log(
          `[master-audit] Loaded ${crawlResults.size} cached crawl results.`
        );
      } catch (err) {
        console.warn(
          `[master-audit] Could not load cached crawl results: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
  } else {
    // Fresh run
    const inventoryResult = await buildInventory(config, baseUrl);
    allUrls = inventoryResult.urls;
    inventory = inventoryResult.inventory;
    sitemapXml = inventoryResult.sitemapXml;

    if (allUrls.length === 0) {
      console.warn(
        '[master-audit] No URLs found in inventory. Check sitemap and static routes.'
      );
    }

    const runId = generateRunId(options.siteId);
    state = createState(
      runId,
      options.siteId,
      mode,
      baseUrl,
      allUrls,
      config.crawl.batchSize,
      config.outputDir
    );

    console.log(
      `[master-audit] Run ID: ${runId}. ` +
        `Inventory: ${allUrls.length} URLs in ${state.batches.length} batches.`
    );
  }

  // ================================================================
  // Step 3: Crawl in batches (with state saving)
  // ================================================================

  const pendingBatchIndices = getPendingBatchIndices(state);

  console.log(
    `[master-audit] ${pendingBatchIndices.length} batch(es) to process...`
  );

  for (const batchIndex of pendingBatchIndices) {
    const batch = state.batches[batchIndex];
    if (!batch) continue;

    markBatchStarted(state, batchIndex);
    saveState(state, config.outputDir);

    console.log(
      `[master-audit] Crawling batch ${batchIndex + 1}/${state.batches.length} ` +
        `(${batch.urls.length} URLs)...`
    );

    try {
      const results = await crawlBatch(batch.urls, config.crawl);

      for (const result of results) {
        crawlResults.set(result.url, result);
        if (result.error) {
          recordError(state, result.error, result.url);
        }
      }

      markBatchCompleted(state, batchIndex, 0); // Issue count updated after validation
      saveState(state, config.outputDir);

      // Cache crawl results after each batch for resume
      const crawlCachePath = path.resolve(
        process.cwd(),
        config.outputDir,
        state.runId,
        'crawl-results.json'
      );
      fs.writeFileSync(
        crawlCachePath,
        JSON.stringify([...crawlResults.entries()]),
        'utf-8'
      );

      console.log(
        `[master-audit] Batch ${batchIndex + 1} complete. ` +
          `${crawlResults.size}/${allUrls.length} URLs crawled total.`
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      markBatchFailed(state, batchIndex, errMsg);
      saveState(state, config.outputDir);
      console.error(
        `[master-audit] Batch ${batchIndex + 1} failed: ${errMsg}`
      );
    }
  }

  // ================================================================
  // Step 4: Extract signals from all crawled pages
  // ================================================================

  console.log('[master-audit] Extracting SEO signals...');

  const allSignals = new Map<string, ExtractedSignals>();

  for (const [url, result] of crawlResults) {
    if (result.status === 200 && result.html) {
      try {
        const signals = extractSignals(result.html, result.finalUrl, baseUrl);
        allSignals.set(url, signals);
      } catch (err) {
        recordError(
          state,
          `Signal extraction failed for ${url}: ${
            err instanceof Error ? err.message : String(err)
          }`,
          url
        );
      }
    }
  }

  console.log(
    `[master-audit] Extracted signals from ${allSignals.size} pages.`
  );

  // ================================================================
  // Step 5: Run all validators
  // ================================================================

  console.log('[master-audit] Running validators...');

  const allIssues: AuditIssue[] = [];
  const validators = config.validators.enabled;

  // --- HTTP validator ---
  if (validators.http) {
    for (const [, result] of crawlResults) {
      const issues = validateHttp(result, config);
      allIssues.push(...issues);
    }
    console.log(
      `[master-audit]   HTTP: ${allIssues.length} issues so far`
    );
  }

  // --- Canonical validator ---
  if (validators.canonical) {
    const beforeCount = allIssues.length;
    for (const [url, signals] of allSignals) {
      const issues = validateCanonical(signals, url, config);
      allIssues.push(...issues);
    }
    console.log(
      `[master-audit]   Canonical: ${allIssues.length - beforeCount} new issues`
    );
  }

  // --- Hreflang validator ---
  if (validators.hreflang) {
    const beforeCount = allIssues.length;
    for (const [url, signals] of allSignals) {
      const issues = validateHreflang(signals, url, allSignals, config);
      allIssues.push(...issues);
    }
    console.log(
      `[master-audit]   Hreflang: ${allIssues.length - beforeCount} new issues`
    );
  }

  // --- Sitemap validator ---
  if (validators.sitemap && sitemapXml) {
    const beforeCount = allIssues.length;
    const issues = validateSitemap(sitemapXml, crawlResults, config);
    allIssues.push(...issues);
    console.log(
      `[master-audit]   Sitemap: ${allIssues.length - beforeCount} new issues`
    );
  }

  // --- Schema validator ---
  if (validators.schema) {
    const beforeCount = allIssues.length;
    for (const [url, signals] of allSignals) {
      const issues = validateSchema(signals, url, config);
      allIssues.push(...issues);
    }
    console.log(
      `[master-audit]   Schema: ${allIssues.length - beforeCount} new issues`
    );
  }

  // --- Links validator ---
  if (validators.links) {
    const beforeCount = allIssues.length;
    const issues = validateLinks(allSignals, crawlResults, config);
    allIssues.push(...issues);
    console.log(
      `[master-audit]   Links: ${allIssues.length - beforeCount} new issues`
    );
  }

  // --- Metadata validator ---
  if (validators.metadata) {
    const beforeCount = allIssues.length;
    for (const [url, signals] of allSignals) {
      const issues = validateMetadata(signals, url, allSignals, config);
      allIssues.push(...issues);
    }
    console.log(
      `[master-audit]   Metadata: ${allIssues.length - beforeCount} new issues`
    );
  }

  // --- Robots validator ---
  if (validators.robots) {
    const beforeCount = allIssues.length;
    // Build sitemap URL set for cross-reference
    const sitemapUrls = new Set<string>();
    if (sitemapXml) {
      const locRegex = /<loc>\s*(.*?)\s*<\/loc>/gi;
      let match: RegExpExecArray | null;
      while ((match = locRegex.exec(sitemapXml)) !== null) {
        const loc = match[1]
          .trim()
          .replace(/&amp;/g, '&')
          .replace(/\/$/, '');
        if (loc) sitemapUrls.add(loc);
      }
    }

    for (const [url, signals] of allSignals) {
      const issues = validateRobots(signals, url, sitemapUrls, config);
      allIssues.push(...issues);
    }
    console.log(
      `[master-audit]   Robots: ${allIssues.length - beforeCount} new issues`
    );
  }

  // ================================================================
  // Step 6: Run risk scanners (stub)
  // ================================================================

  const riskIssues = runRiskScanners(allSignals, config, baseUrl);
  allIssues.push(...riskIssues);

  console.log(
    `[master-audit] Total issues after all validators: ${allIssues.length}`
  );

  // ================================================================
  // Step 7: Evaluate hard gates
  // ================================================================

  const hardGates = evaluateHardGates(allIssues, config);
  const softGates = evaluateSoftGates(allIssues, allSignals, config);

  const allPassed = hardGates.every((g) => g.passed);
  console.log(
    `[master-audit] Hard gates: ${
      allPassed ? 'ALL PASSED' : 'SOME FAILED'
    } (${hardGates.filter((g) => g.passed).length}/${hardGates.length})`
  );

  // ================================================================
  // Step 8: Build result
  // ================================================================

  const endTime = new Date().toISOString();

  // Update inventory with crawl status and issue counts
  const urlIssueCount = new Map<string, number>();
  for (const issue of allIssues) {
    urlIssueCount.set(
      issue.url,
      (urlIssueCount.get(issue.url) ?? 0) + 1
    );
  }

  const finalInventory: UrlInventoryEntry[] = inventory.map((entry) => ({
    ...entry,
    status: crawlResults.get(entry.url)?.status,
    issueCount: urlIssueCount.get(entry.url) ?? 0,
  }));

  const result: AuditRunResult = {
    runId: state.runId,
    siteId: options.siteId,
    mode,
    startTime,
    endTime,
    totalUrls: allUrls.length,
    issues: allIssues,
    hardGates,
    softGates,
    urlInventory: finalInventory,
  };

  // ================================================================
  // Step 9: Generate reports + save outputs
  // ================================================================

  console.log('[master-audit] Generating reports...');

  // Executive summary
  const execSummary = generateExecSummary(result);
  writeOutput(config.outputDir, state.runId, 'EXEC_SUMMARY.md', execSummary);

  // Fix plan
  const fixPlan = generateFixPlan(result);
  writeOutput(config.outputDir, state.runId, 'FIX_PLAN.md', fixPlan);

  // Full issues JSON
  writeOutput(
    config.outputDir,
    state.runId,
    'issues.json',
    JSON.stringify(allIssues, null, 2)
  );

  // Full result JSON
  writeOutput(
    config.outputDir,
    state.runId,
    'result.json',
    JSON.stringify(result, null, 2)
  );

  // Config snapshot (for reproducibility)
  writeOutput(
    config.outputDir,
    state.runId,
    'config_snapshot.json',
    JSON.stringify(config, null, 2)
  );

  // URL inventory
  writeOutput(
    config.outputDir,
    state.runId,
    'url_inventory.json',
    JSON.stringify(finalInventory, null, 2)
  );

  // CHANGELOG.md (run metadata)
  const changelogLines = [
    `# Audit Run Changelog`,
    '',
    `## ${state.runId}`,
    '',
    `- **Date:** ${new Date(endTime).toISOString().slice(0, 10)}`,
    `- **Site:** ${options.siteId}`,
    `- **Mode:** ${mode}`,
    `- **URLs Audited:** ${allUrls.length}`,
    `- **Issues Found:** ${allIssues.length}`,
    `- **P0:** ${allIssues.filter((i) => i.severity === 'P0').length}`,
    `- **P1:** ${allIssues.filter((i) => i.severity === 'P1').length}`,
    `- **P2:** ${allIssues.filter((i) => i.severity === 'P2').length}`,
    `- **Hard Gates:** ${hardGates.filter((g) => g.passed).length}/${hardGates.length} passed`,
    `- **Verdict:** ${hardGates.every((g) => g.passed) ? 'PASS' : 'FAIL'}`,
    '',
  ];
  writeOutput(config.outputDir, state.runId, 'CHANGELOG.md', changelogLines.join('\n'));

  // Update state to completed
  state.status = 'completed';
  state.issueCount = allIssues.length;
  saveState(state, config.outputDir);

  const outputPath = path.resolve(
    process.cwd(),
    config.outputDir,
    state.runId
  );
  console.log(
    `[master-audit] Audit complete. ` +
      `${allIssues.length} issues found. ` +
      `Reports saved to ${outputPath}/`
  );

  return result;
}

// Re-export types and utilities for external consumers
export type {
  AuditConfig,
  AuditRunResult,
  AuditIssue,
  AuditState,
  CrawlResult,
  ExtractedSignals,
  HardGateResult,
  SoftGateResult,
} from './types';
export { loadAuditConfig } from './config-loader';
export { generateExecSummary, generateFixPlan } from './reporter';
