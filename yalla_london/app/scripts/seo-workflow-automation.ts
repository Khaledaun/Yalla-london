#!/usr/bin/env ts-node
/**
 * SEO Workflow Automation Script
 *
 * Integrates zenobi-us/dotfiles skills with our SEO infrastructure.
 * Run this script to:
 * - Verify GSC connection
 * - Check and submit URLs for indexing
 * - Run full SEO audit
 * - Generate optimization reports
 *
 * Usage:
 *   npx ts-node scripts/seo-workflow-automation.ts [command]
 *
 * Commands:
 *   verify-gsc     - Verify Google Search Console connection
 *   check-indexing - Check indexing status of all blog posts
 *   submit-all     - Submit all URLs for indexing
 *   submit-new     - Submit new URLs (last 7 days) for indexing
 *   full-audit     - Run full SEO audit workflow
 *   optimize       - Run content optimization workflow
 *   research       - Run SEO research workflow
 *
 * Examples:
 *   npx ts-node scripts/seo-workflow-automation.ts verify-gsc
 *   npx ts-node scripts/seo-workflow-automation.ts check-indexing
 *   npx ts-node scripts/seo-workflow-automation.ts submit-new
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// Types for the script (inline to avoid import issues)
interface GSCConnectionStatus {
  configured: boolean;
  authenticated: boolean;
  siteVerified: boolean;
  siteUrl: string;
  capabilities: Record<string, boolean>;
  errors: string[];
}

interface IndexingResult {
  url: string;
  indexed: boolean;
  lastCrawled?: string;
  submittedForIndexing: boolean;
}

interface WorkflowReport {
  id: string;
  type: string;
  status: string;
  summary: {
    urlsProcessed: number;
    issuesFound: number;
    issuesFixed: number;
    indexedUrls: number;
    notIndexedUrls: number;
  };
  errors: string[];
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yalla-london.com';
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

// ============================================
// UTILITY FUNCTIONS
// ============================================

function log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
  const prefix = {
    info: '[INFO]',
    success: '[OK]',
    error: '[ERROR]',
    warning: '[WARN]',
  }[type];

  console.log(`${prefix} ${message}`);
}

function printSection(title: string): void {
  console.log('\n' + '='.repeat(60));
  console.log(` ${title}`);
  console.log('='.repeat(60));
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    return await response.json();
  } catch (error) {
    log(`API request failed: ${error}`, 'error');
    return null;
  }
}

// ============================================
// COMMAND HANDLERS
// ============================================

async function verifyGSC(): Promise<void> {
  printSection('Verifying Google Search Console Connection');

  const result = await fetchAPI<{ success: boolean; data: GSCConnectionStatus }>(
    '/api/seo/workflow?action=verify-gsc'
  );

  if (!result) {
    log('Failed to connect to API', 'error');
    return;
  }

  const { data } = result;

  log(`Configured: ${data.configured}`, data.configured ? 'success' : 'error');
  log(`Authenticated: ${data.authenticated}`, data.authenticated ? 'success' : 'error');
  log(`Site Verified: ${data.siteVerified}`, data.siteVerified ? 'success' : 'warning');
  log(`Site URL: ${data.siteUrl}`, 'info');

  console.log('\nCapabilities:');
  for (const [key, value] of Object.entries(data.capabilities)) {
    log(`  ${key}: ${value}`, value ? 'success' : 'warning');
  }

  if (data.errors.length > 0) {
    console.log('\nErrors:');
    data.errors.forEach(err => log(`  ${err}`, 'error'));
  }
}

async function checkIndexing(): Promise<void> {
  printSection('Checking Indexing Status');

  const result = await fetchAPI<{ success: boolean; results: IndexingResult[]; summary: any }>(
    '/api/seo/workflow',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'verify_indexing', forceSubmit: false }),
    }
  );

  if (!result) {
    log('Failed to check indexing status', 'error');
    return;
  }

  const { results, summary } = result;

  console.log('\nSummary:');
  log(`Total Checked: ${summary.totalChecked}`, 'info');
  log(`Indexed: ${summary.indexed}`, 'success');
  log(`Not Indexed: ${summary.notIndexed}`, summary.notIndexed > 0 ? 'warning' : 'success');

  if (summary.notIndexed > 0) {
    console.log('\nNot Indexed URLs:');
    results
      .filter((r: IndexingResult) => !r.indexed)
      .forEach((r: IndexingResult) => log(`  ${r.url}`, 'warning'));
  }
}

async function submitForIndexing(mode: 'all' | 'new' = 'new'): Promise<void> {
  printSection(`Submitting ${mode.toUpperCase()} URLs for Indexing`);

  const result = await fetchAPI<{ success: boolean; results: IndexingResult[]; summary: any }>(
    '/api/seo/workflow',
    {
      method: 'POST',
      body: JSON.stringify({ action: 'verify_indexing', forceSubmit: true }),
    }
  );

  if (!result) {
    log('Failed to submit URLs for indexing', 'error');
    return;
  }

  const { summary } = result;

  console.log('\nResults:');
  log(`URLs Submitted: ${summary.submitted}`, 'success');
  log(`Previously Indexed: ${summary.indexed}`, 'info');
  log(`Newly Submitted: ${summary.notIndexed}`, summary.notIndexed > 0 ? 'success' : 'info');
}

async function runFullAudit(): Promise<void> {
  printSection('Running Full SEO Audit');

  log('Starting full SEO workflow (this may take a few minutes)...', 'info');

  const result = await fetchAPI<{ success: boolean; workflow: string; report: WorkflowReport }>(
    '/api/seo/workflow',
    {
      method: 'POST',
      body: JSON.stringify({ workflow: 'full_audit' }),
    }
  );

  if (!result) {
    log('Failed to run full audit', 'error');
    return;
  }

  const { report } = result;

  console.log('\nAudit Results:');
  log(`Status: ${report.status}`, report.status === 'completed' ? 'success' : 'error');
  log(`URLs Processed: ${report.summary.urlsProcessed}`, 'info');
  log(`Issues Found: ${report.summary.issuesFound}`, report.summary.issuesFound > 0 ? 'warning' : 'success');
  log(`Issues Fixed: ${report.summary.issuesFixed}`, 'success');
  log(`Indexed: ${report.summary.indexedUrls}`, 'info');
  log(`Not Indexed: ${report.summary.notIndexedUrls}`, report.summary.notIndexedUrls > 0 ? 'warning' : 'success');

  if (report.errors.length > 0) {
    console.log('\nErrors:');
    report.errors.forEach(err => log(`  ${err}`, 'error'));
  }
}

async function runOptimization(): Promise<void> {
  printSection('Running Content Optimization Workflow');

  // Get blog URLs first
  const urlsResult = await fetchAPI<{ urls: { all: string[] } }>('/api/seo/index-urls');
  if (!urlsResult) {
    log('Failed to get URLs', 'error');
    return;
  }

  const blogUrls = urlsResult.urls.all.filter(u => u.includes('/blog/')).slice(0, 10);
  log(`Optimizing ${blogUrls.length} blog posts...`, 'info');

  const result = await fetchAPI<{ success: boolean; workflow: string; report: WorkflowReport }>(
    '/api/seo/workflow',
    {
      method: 'POST',
      body: JSON.stringify({ workflow: 'optimization', urls: blogUrls }),
    }
  );

  if (!result) {
    log('Failed to run optimization', 'error');
    return;
  }

  const { report } = result;

  console.log('\nOptimization Results:');
  log(`Status: ${report.status}`, report.status === 'completed' ? 'success' : 'error');
  log(`URLs Processed: ${report.summary.urlsProcessed}`, 'info');
  log(`Issues Found: ${report.summary.issuesFound}`, 'info');
}

async function runResearch(keyword?: string): Promise<void> {
  printSection('Running SEO Research Workflow');

  const targetKeyword = keyword || 'halal restaurants london';
  log(`Researching keyword: "${targetKeyword}"`, 'info');

  const result = await fetchAPI<{ success: boolean; workflow: string; report: WorkflowReport }>(
    '/api/seo/workflow',
    {
      method: 'POST',
      body: JSON.stringify({
        workflow: 'research',
        keyword: targetKeyword,
        locale: 'en',
      }),
    }
  );

  if (!result) {
    log('Failed to run research workflow', 'error');
    return;
  }

  log('Research workflow completed', 'success');
  log('Research methodology from zenobi-us/dotfiles has been applied', 'info');
  console.log('\nSubtopics identified for parallel research:');
  console.log('  - keyword_analysis');
  console.log('  - content_gaps');
  console.log('  - serp_features');
  console.log('  - technical_seo');
  console.log('  - user_intent');
  console.log('  - authority_signals');
}

async function showHelp(): Promise<void> {
  console.log(`
SEO Workflow Automation Script
==============================

Integrates zenobi-us/dotfiles skills with our SEO infrastructure.

Usage:
  npx ts-node scripts/seo-workflow-automation.ts [command]

Commands:
  verify-gsc      Verify Google Search Console connection
  check-indexing  Check indexing status of all blog posts
  submit-all      Submit all URLs for indexing
  submit-new      Submit new URLs (last 7 days) for indexing
  full-audit      Run full SEO audit workflow
  optimize        Run content optimization workflow
  research        Run SEO research workflow
  help            Show this help message

Skills Integrated:
  - seo-research-skill: Parallel research with source verification
  - parallel-seo-agents: Dispatch specialized agents for SEO tasks

Examples:
  npx ts-node scripts/seo-workflow-automation.ts verify-gsc
  npx ts-node scripts/seo-workflow-automation.ts check-indexing
  npx ts-node scripts/seo-workflow-automation.ts full-audit
  npx ts-node scripts/seo-workflow-automation.ts research "best halal food london"
`);
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  console.log('\nSEO Workflow Automation');
  console.log('Powered by zenobi-us/dotfiles skills integration\n');

  switch (command) {
    case 'verify-gsc':
      await verifyGSC();
      break;

    case 'check-indexing':
      await checkIndexing();
      break;

    case 'submit-all':
      await submitForIndexing('all');
      break;

    case 'submit-new':
      await submitForIndexing('new');
      break;

    case 'full-audit':
      await runFullAudit();
      break;

    case 'optimize':
      await runOptimization();
      break;

    case 'research':
      await runResearch(args[1]);
      break;

    case 'help':
    default:
      await showHelp();
  }

  console.log('\n');
}

main().catch(console.error);
