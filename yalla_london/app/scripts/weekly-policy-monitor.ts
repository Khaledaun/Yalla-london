#!/usr/bin/env tsx
/**
 * Weekly Policy Monitor CLI
 *
 * Checks Google Search Status Dashboard and Search Central for policy changes
 * that might affect the site's SEO compliance.
 *
 * Usage:
 *   npx tsx scripts/weekly-policy-monitor.ts --site=yalla-london
 *   npx tsx scripts/weekly-policy-monitor.ts --site=yalla-london --output=docs/seo
 *
 * Multi-site: pass any configured site ID.
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Google sources to monitor
// ---------------------------------------------------------------------------

const POLICY_SOURCES = [
  {
    id: 'search-status',
    name: 'Google Search Status Dashboard',
    url: 'https://status.search.google.com/',
    description: 'Ranking updates, indexing issues, serving issues',
  },
  {
    id: 'search-central-blog',
    name: 'Google Search Central Blog',
    url: 'https://developers.google.com/search/blog',
    description: 'Algorithm updates, new features, deprecations',
  },
  {
    id: 'search-central-docs',
    name: 'Google Search Central Documentation',
    url: 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content',
    description: 'Core documentation updates',
  },
  {
    id: 'schema-changelog',
    name: 'Schema.org Changelog',
    url: 'https://schema.org/docs/releases.html',
    description: 'Structured data type additions and deprecations',
  },
];

// ---------------------------------------------------------------------------
// Current standards snapshot (from lib/seo/standards.ts)
// ---------------------------------------------------------------------------

interface PolicySnapshot {
  date: string;
  siteId: string;
  sources: typeof POLICY_SOURCES;
  currentStandards: {
    deprecatedSchemaTypes: string[];
    coreWebVitals: { lcp: string; inp: string; cls: string };
    contentQuality: { minWords: number; qualityGateScore: number };
    metaLimits: { titleMin: number; titleMax: number; descMin: number; descMax: number };
  };
  checks: PolicyCheck[];
}

interface PolicyCheck {
  source: string;
  status: 'ok' | 'warning' | 'error' | 'unreachable';
  message: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, ...valueParts] = arg.slice(2).split('=');
      args[key] = valueParts.join('=') || 'true';
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Source checks
// ---------------------------------------------------------------------------

async function checkSource(source: typeof POLICY_SOURCES[0]): Promise<PolicyCheck> {
  const timestamp = new Date().toISOString();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MasterAudit/1.0 (PolicyMonitor; +https://zenitha.luxury)',
        Accept: 'text/html',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        source: source.id,
        status: 'error',
        message: `HTTP ${response.status} from ${source.name}`,
        timestamp,
      };
    }

    return {
      source: source.id,
      status: 'ok',
      message: `${source.name} accessible (HTTP ${response.status})`,
      timestamp,
    };
  } catch (err) {
    return {
      source: source.id,
      status: 'unreachable',
      message: `Cannot reach ${source.name}: ${err instanceof Error ? err.message : String(err)}`,
      timestamp,
    };
  }
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

function generateReport(snapshot: PolicySnapshot): string {
  const lines: string[] = [];

  lines.push('# Weekly Policy Monitor Report');
  lines.push('');
  lines.push(`**Site:** ${snapshot.siteId}`);
  lines.push(`**Date:** ${snapshot.date}`);
  lines.push(`**Sources Checked:** ${snapshot.sources.length}`);
  lines.push('');

  // Source status
  lines.push('## Source Accessibility');
  lines.push('');
  lines.push('| Source | Status | Notes |');
  lines.push('|--------|--------|-------|');
  for (const check of snapshot.checks) {
    const icon = check.status === 'ok' ? 'OK' : check.status === 'warning' ? 'WARN' : 'FAIL';
    lines.push(`| ${check.source} | ${icon} | ${check.message} |`);
  }
  lines.push('');

  // Current standards snapshot
  lines.push('## Current Standards Snapshot');
  lines.push('');
  lines.push('### Deprecated Schema Types');
  lines.push('');
  for (const type of snapshot.currentStandards.deprecatedSchemaTypes) {
    lines.push(`- ${type}`);
  }
  lines.push('');

  lines.push('### Core Web Vitals Targets');
  lines.push('');
  lines.push(`- LCP: ${snapshot.currentStandards.coreWebVitals.lcp}`);
  lines.push(`- INP: ${snapshot.currentStandards.coreWebVitals.inp}`);
  lines.push(`- CLS: ${snapshot.currentStandards.coreWebVitals.cls}`);
  lines.push('');

  lines.push('### Content Quality');
  lines.push('');
  lines.push(`- Minimum word count: ${snapshot.currentStandards.contentQuality.minWords}`);
  lines.push(`- Quality gate score: ${snapshot.currentStandards.contentQuality.qualityGateScore}`);
  lines.push('');

  lines.push('### Meta Tag Limits');
  lines.push('');
  lines.push(`- Title: ${snapshot.currentStandards.metaLimits.titleMin}-${snapshot.currentStandards.metaLimits.titleMax} chars`);
  lines.push(`- Description: ${snapshot.currentStandards.metaLimits.descMin}-${snapshot.currentStandards.metaLimits.descMax} chars`);
  lines.push('');

  // Action items
  lines.push('## Action Items');
  lines.push('');
  const unreachable = snapshot.checks.filter(c => c.status === 'unreachable');
  const errors = snapshot.checks.filter(c => c.status === 'error');
  if (unreachable.length === 0 && errors.length === 0) {
    lines.push('No immediate action required. All policy sources are accessible.');
  } else {
    if (unreachable.length > 0) {
      lines.push(`- ${unreachable.length} source(s) unreachable — retry later`);
    }
    if (errors.length > 0) {
      lines.push(`- ${errors.length} source(s) returned errors — investigate`);
    }
  }
  lines.push('');

  lines.push('## Recommended Manual Checks');
  lines.push('');
  lines.push('1. Review Google Search Status Dashboard for any new ranking updates');
  lines.push('2. Check Google Search Central Blog for deprecation notices');
  lines.push('3. Review Schema.org changelog for new/removed types');
  lines.push('4. Verify deprecated types list matches current Google documentation');
  lines.push('5. Compare Core Web Vitals targets with latest Google recommendations');
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push(`*Generated by Weekly Policy Monitor at ${new Date().toISOString()}*`);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);

  const siteId = args.site || args.siteId || 'yalla-london';
  const outputDir = args.output || 'docs/seo';

  console.log('='.repeat(60));
  console.log('  WEEKLY POLICY MONITOR');
  console.log('='.repeat(60));
  console.log(`  Site: ${siteId}`);
  console.log(`  Date: ${new Date().toISOString().slice(0, 10)}`);
  console.log('='.repeat(60));
  console.log('');

  // Check all sources
  console.log('Checking policy sources...');
  const checks: PolicyCheck[] = [];
  for (const source of POLICY_SOURCES) {
    console.log(`  Checking ${source.name}...`);
    const check = await checkSource(source);
    checks.push(check);
    const icon = check.status === 'ok' ? 'OK' : 'FAIL';
    console.log(`    ${icon} ${check.message}`);
  }

  // Build snapshot
  const snapshot: PolicySnapshot = {
    date: new Date().toISOString().slice(0, 10),
    siteId,
    sources: POLICY_SOURCES,
    currentStandards: {
      deprecatedSchemaTypes: [
        'FAQPage', 'HowTo', 'CourseInfo', 'ClaimReview',
        'EstimatedSalary', 'LearningVideo', 'SpecialAnnouncement',
        'VehicleListing', 'PracticeProblems', 'SitelinksSearchBox',
      ],
      coreWebVitals: { lcp: '≤2.5s', inp: '≤200ms', cls: '≤0.1' },
      contentQuality: { minWords: 1000, qualityGateScore: 70 },
      metaLimits: { titleMin: 30, titleMax: 60, descMin: 120, descMax: 160 },
    },
    checks,
  };

  // Generate report
  const report = generateReport(snapshot);

  // Save report to both main location and dated directory
  const fullOutputDir = path.resolve(process.cwd(), outputDir);
  if (!fs.existsSync(fullOutputDir)) {
    fs.mkdirSync(fullOutputDir, { recursive: true });
  }

  const reportPath = path.join(fullOutputDir, 'WEEKLY_POLICY_MONITOR.md');
  fs.writeFileSync(reportPath, report, 'utf-8');

  // Save snapshot JSON
  const snapshotPath = path.join(fullOutputDir, 'policy-snapshot.json');
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');

  // Also save dated copy for history diffing
  const dateStr = new Date().toISOString().slice(0, 10);
  const datedDir = path.join(fullOutputDir, 'policy-monitor', dateStr);
  if (!fs.existsSync(datedDir)) {
    fs.mkdirSync(datedDir, { recursive: true });
  }
  fs.writeFileSync(path.join(datedDir, 'DIFF.md'), report, 'utf-8');
  fs.writeFileSync(path.join(datedDir, 'policy-snapshot.json'), JSON.stringify(snapshot, null, 2), 'utf-8');

  console.log('');
  console.log('='.repeat(60));
  console.log('  MONITOR COMPLETE');
  console.log('='.repeat(60));
  console.log(`  Report: ${reportPath}`);
  console.log(`  Snapshot: ${snapshotPath}`);
  console.log(`  Sources OK: ${checks.filter(c => c.status === 'ok').length}/${checks.length}`);
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('Policy monitor failed:', err instanceof Error ? err.message : String(err));
  process.exit(2);
});
