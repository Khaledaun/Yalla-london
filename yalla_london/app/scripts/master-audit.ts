#!/usr/bin/env tsx
/**
 * Master Audit CLI
 *
 * Usage:
 *   npx tsx scripts/master-audit.ts --site=yalla-london --mode=preview --batchSize=200 --concurrency=6
 *   npx tsx scripts/master-audit.ts --site=yalla-london --mode=prod
 *   npx tsx scripts/master-audit.ts --resume=<runId>
 */

import { runMasterAudit } from '../lib/master-audit/index';

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

async function main() {
  const args = parseArgs(process.argv);

  const siteId = args.site || args.siteId;
  const mode = (args.mode || 'full') as 'full' | 'quick' | 'resume';
  const batchSize = args.batchSize ? parseInt(args.batchSize, 10) : undefined;
  const concurrency = args.concurrency ? parseInt(args.concurrency, 10) : undefined;
  const baseUrl = args.baseUrl;
  const resumeRunId = args.resume;

  if (!siteId && !resumeRunId) {
    console.error('Usage: npx tsx scripts/master-audit.ts --site=<siteId> [--mode=full|quick|resume] [--batchSize=200] [--concurrency=6] [--baseUrl=http://localhost:3000]');
    console.error('       npx tsx scripts/master-audit.ts --resume=<runId>');
    process.exit(1);
  }

  console.log('='.repeat(72));
  console.log('  MASTER AUDIT');
  console.log('='.repeat(72));
  console.log(`  Site:        ${siteId || '(resumed)'}`);
  console.log(`  Mode:        ${mode}`);
  console.log(`  Batch Size:  ${batchSize || 'default'}`);
  console.log(`  Concurrency: ${concurrency || 'default'}`);
  if (baseUrl) console.log(`  Base URL:    ${baseUrl}`);
  if (resumeRunId) console.log(`  Resume Run:  ${resumeRunId}`);
  console.log('='.repeat(72));
  console.log('');

  const startTime = Date.now();

  try {
    const result = await runMasterAudit({
      siteId: siteId || '',
      mode,
      baseUrl,
      batchSize,
      concurrency,
      resumeRunId,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('');
    console.log('='.repeat(72));
    console.log('  AUDIT COMPLETE');
    console.log('='.repeat(72));
    console.log(`  Run ID:      ${result.runId}`);
    console.log(`  Duration:    ${elapsed}s`);
    console.log(`  URLs Tested: ${result.totalUrls}`);
    console.log(`  Issues:      P0=${result.issues.filter(i => i.severity === 'P0').length} P1=${result.issues.filter(i => i.severity === 'P1').length} P2=${result.issues.filter(i => i.severity === 'P2').length}`);
    console.log('');

    // Hard gates summary
    console.log('  HARD GATES:');
    let allPassed = true;
    for (const gate of result.hardGates) {
      const icon = gate.passed ? '\u2705' : '\u274C';
      console.log(`    ${icon} ${gate.gateName}: ${gate.count}/${gate.threshold} ${gate.passed ? 'PASS' : 'FAIL'}`);
      if (!gate.passed) allPassed = false;
    }

    console.log('');
    if (allPassed) {
      console.log('  \u2705 ALL HARD GATES PASSED');
    } else {
      console.log('  \u274C HARD GATES FAILED — see FIX_PLAN.md');
    }
    console.log('');
    console.log(`  Reports: docs/master-audit/${result.runId}/`);
    console.log('='.repeat(72));

    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error('');
    console.error(`  AUDIT FAILED after ${elapsed}s`);
    console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(2);
  }
}

main();
