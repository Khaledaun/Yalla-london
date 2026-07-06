#!/usr/bin/env npx tsx
/**
 * CI Audit Gate — Quick audit for CI/CD pipelines.
 *
 * Runs a lightweight audit on key pages only (no full crawl).
 * Exits with code 1 if any P0 issues found, 0 if clean.
 *
 * Usage:
 *   npx tsx scripts/ci-audit-gate.ts --site=yalla-london --baseUrl=http://localhost:3000
 *   npm run audit:ci -- --site=yalla-london
 */

import { loadAuditConfig } from '../lib/master-audit/config-loader';
import { crawlBatch } from '../lib/master-audit/crawler';
import { extractSignals } from '../lib/master-audit/extractor';
import { validateHttp } from '../lib/master-audit/validators/http';
import { validateCanonical } from '../lib/master-audit/validators/canonical';
import { validateSchema } from '../lib/master-audit/validators/schema';
import { validateMetadata } from '../lib/master-audit/validators/metadata';
import type { AuditIssue, ExtractedSignals } from '../lib/master-audit/types';

// ---------------------------------------------------------------------------
// Parse args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg?.split('=')[1];
};

const siteId = getArg('site') ?? 'yalla-london';
const baseUrl = getArg('baseUrl') ?? undefined;

// Key pages to check (configurable via audit config's keyUrls or defaults)
const DEFAULT_KEY_PAGES = ['/', '/blog', '/hotels', '/experiences'];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n🔍 CI Audit Gate — Site: ${siteId}\n`);

  const config = loadAuditConfig(siteId);
  const base = (baseUrl ?? config.baseUrl).replace(/\/+$/, '');

  // Get key URLs from config or defaults
  const keyPages =
    (config as unknown as Record<string, unknown>).keyUrls as string[] | undefined ??
    DEFAULT_KEY_PAGES;

  const fullUrls = keyPages.map((p) =>
    p.startsWith('http') ? p : `${base}${p.startsWith('/') ? '' : '/'}${p}`
  );

  console.log(`Base URL: ${base}`);
  console.log(`Key pages: ${fullUrls.length}\n`);

  // Crawl key pages
  console.log('Crawling...');
  const results = await crawlBatch(fullUrls, {
    ...config.crawl,
    timeoutMs: 10_000,
    concurrency: 3,
  });

  // Extract signals
  const allSignals = new Map<string, ExtractedSignals>();
  for (const result of results) {
    if (result.html && result.status >= 200 && result.status < 400) {
      allSignals.set(result.url, extractSignals(result.html, result.url, base));
    }
  }

  // Run key validators
  const allIssues: AuditIssue[] = [];

  for (const result of results) {
    allIssues.push(...validateHttp(result, config));

    const signals = allSignals.get(result.url);
    if (signals) {
      allIssues.push(...validateCanonical(signals, result.url, config));
      allIssues.push(...validateSchema(signals, result.url, config));
      allIssues.push(
        ...validateMetadata(signals, result.url, allSignals, config)
      );
    }
  }

  // Count by severity
  const p0 = allIssues.filter((i) => i.severity === 'P0');
  const p1 = allIssues.filter((i) => i.severity === 'P1');
  const p2 = allIssues.filter((i) => i.severity === 'P2');

  // Report
  console.log(`\n📊 Results:`);
  console.log(`  P0 (Blockers): ${p0.length}`);
  console.log(`  P1 (High):     ${p1.length}`);
  console.log(`  P2 (Medium):   ${p2.length}`);
  console.log(`  Total:         ${allIssues.length}\n`);

  if (p0.length > 0) {
    console.log('❌ BLOCKERS FOUND:\n');
    for (const issue of p0) {
      console.log(`  [P0] ${issue.message}`);
      console.log(`        URL: ${issue.url}`);
      if (issue.suggestedFix) {
        console.log(`        Fix: ${issue.suggestedFix.notes}`);
      }
      console.log('');
    }
    console.log('CI gate: FAILED\n');
    process.exit(1);
  }

  if (p1.length > 0) {
    console.log('⚠️  HIGH SEVERITY ISSUES:\n');
    for (const issue of p1.slice(0, 10)) {
      console.log(`  [P1] ${issue.message}`);
      console.log(`        URL: ${issue.url}`);
    }
    if (p1.length > 10) {
      console.log(`  ... and ${p1.length - 10} more\n`);
    }
  }

  console.log('✅ CI gate: PASSED (no blockers)\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('CI audit gate crashed:', err);
  process.exit(1);
});
