#!/usr/bin/env tsx

/**
 * Database Consistency Health Checker
 *
 * Queries the live database via Prisma and outputs a phone-readable scorecard.
 * Run: npx tsx scripts/db-consistency.ts
 *
 * Exit codes:
 *   0 — all pass or warnings only
 *   1 — any FAIL (❌) found
 */

require('dotenv').config({ path: '.env.local' });

import { writeFileSync } from 'fs';
import { join } from 'path';

interface CheckResult {
  name: string;
  passed: boolean;
  warning: boolean;
  detail: string;
}

interface CronHealth {
  job_name: string;
  total: number;
  failed: number;
  rate: number;
}

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  const results: CheckResult[] = [];
  const cronResults: CronHealth[] = [];
  let seoDistribution = { range0_49: 0, range50_69: 0, range70_89: 0, range90_100: 0 };

  try {
    await prisma.$connect();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`FATAL: Cannot connect to database — ${msg}`);
    process.exit(1);
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  // ─── Check 1: BlogPost siteId coverage ───────────────────────────

  try {
    const totalPosts = await prisma.blogPost.count();
    const missingPosts = await prisma.blogPost.count({
      where: {
        OR: [
          { siteId: null },
          { siteId: '' },
          { siteId: 'undefined' },
        ],
      },
    });
    const valid = totalPosts - missingPosts;
    const pass = missingPosts === 0;
    let detail = `${valid}/${totalPosts}`;
    if (!pass) {
      const bad = await prisma.blogPost.findMany({
        where: { OR: [{ siteId: null }, { siteId: '' }, { siteId: 'undefined' }] },
        select: { id: true },
        take: 10,
      });
      detail += ` [Missing: ${bad.map((b: { id: string }) => b.id).join(', ')}]`;
    }
    results.push({ name: 'BlogPost siteId coverage', passed: pass, warning: !pass, detail });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name: 'BlogPost siteId coverage', passed: false, warning: false, detail: `ERROR: ${msg}` });
  }

  // ─── Check 2: BlogPost category coverage ─────────────────────────

  try {
    const totalPosts = await prisma.blogPost.count();
    const missingCat = await prisma.blogPost.count({
      where: { category_id: '' },
    });
    const valid = totalPosts - missingCat;
    const pass = missingCat === 0;
    let detail = `${valid}/${totalPosts}`;
    if (!pass) {
      const bad = await prisma.blogPost.findMany({
        where: { category_id: '' },
        select: { id: true },
        take: 10,
      });
      detail += ` [Missing: ${bad.map((b: { id: string }) => b.id).join(', ')}]`;
    }
    results.push({ name: 'BlogPost category coverage', passed: pass, warning: !pass, detail });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name: 'BlogPost category coverage', passed: false, warning: false, detail: `ERROR: ${msg}` });
  }

  // ─── Check 3: Stuck topics (>2h in "generating") ─────────────────

  try {
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const stuck = await prisma.topicProposal.findMany({
      where: {
        status: 'generating',
        updated_at: { lt: twoHoursAgo },
      },
      select: { id: true },
      take: 20,
    });
    const pass = stuck.length === 0;
    let detail = `${stuck.length}`;
    if (!pass) {
      detail += ` [IDs: ${stuck.map((s: { id: string }) => s.id).join(', ')}]`;
    }
    results.push({ name: 'Stuck topics (>2h)', passed: pass, warning: !pass, detail });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name: 'Stuck topics (>2h)', passed: false, warning: false, detail: `ERROR: ${msg}` });
  }

  // ─── Check 4: Stuck drafts (>48h in same phase) ──────────────────

  try {
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const stuck = await prisma.articleDraft.findMany({
      where: {
        current_phase: { notIn: ['reservoir', 'published', 'rejected'] },
        updated_at: { lt: fortyEightHoursAgo },
      },
      select: { id: true, current_phase: true },
      take: 20,
    });
    const pass = stuck.length === 0;
    let detail = `${stuck.length}`;
    if (!pass) {
      detail += ` [IDs: ${stuck.map((s: { id: string }) => s.id).join(', ')}]`;
    }
    results.push({ name: 'Stuck drafts (>48h)', passed: pass, warning: !pass, detail });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name: 'Stuck drafts (>48h)', passed: false, warning: false, detail: `ERROR: ${msg}` });
  }

  // ─── Check 5: Orphan indexing records ─────────────────────────────

  try {
    // Get all URLIndexingStatus slugs that reference blog posts
    const indexRecords = await prisma.uRLIndexingStatus.findMany({
      where: {
        slug: { not: null },
        url: { contains: '/blog/' },
      },
      select: { id: true, slug: true },
    });

    let orphanCount = 0;
    const orphanIds: string[] = [];

    if (indexRecords.length > 0) {
      const slugs = indexRecords
        .map((r: { slug: string | null }) => r.slug)
        .filter((s: string | null): s is string => s !== null && s !== '');

      const existingPosts = await prisma.blogPost.findMany({
        where: { slug: { in: slugs } },
        select: { slug: true },
      });
      const existingSlugs = new Set<string>(existingPosts.map((p: { slug: string }) => p.slug));

      for (const rec of indexRecords) {
        if (rec.slug && !existingSlugs.has(rec.slug)) {
          orphanCount++;
          if (orphanIds.length < 10) orphanIds.push(rec.id);
        }
      }
    }

    const pass = orphanCount === 0;
    let detail = `${orphanCount}`;
    if (!pass) {
      detail += ` [IDs: ${orphanIds.join(', ')}]`;
    }
    results.push({ name: 'Orphan indexing records', passed: pass, warning: !pass, detail });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name: 'Orphan indexing records', passed: false, warning: false, detail: `ERROR: ${msg}` });
  }

  // ─── Check 6: Cron failure rate (7 days) ──────────────────────────

  try {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const logs: Array<{ job_name: string; status: string; _count: number }> = await prisma.cronJobLog.groupBy({
      by: ['job_name', 'status'],
      where: {
        started_at: { gte: sevenDaysAgo },
      },
      _count: true,
    });

    const jobMap = new Map<string, { total: number; failed: number }>();
    for (const row of logs) {
      const existing = jobMap.get(row.job_name) || { total: 0, failed: 0 };
      existing.total += row._count;
      if (row.status === 'failed' || row.status === 'timed_out') {
        existing.failed += row._count;
      }
      jobMap.set(row.job_name, existing);
    }

    for (const [jobName, stats] of jobMap) {
      const rate = stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0;
      cronResults.push({ job_name: jobName, total: stats.total, failed: stats.failed, rate });
    }
    cronResults.sort((a, b) => b.rate - a.rate || a.job_name.localeCompare(b.job_name));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    cronResults.push({ job_name: 'ERROR', total: 0, failed: 0, rate: -1 });
    console.warn(`[db-consistency] Cron health check failed: ${msg}`);
  }

  // ─── Check 7: Duplicate slugs within same siteId ─────────────────

  try {
    const dupes: Array<{ slug: string; siteId: string | null; _count: number }> = await prisma.blogPost.groupBy({
      by: ['slug', 'siteId'],
      _count: true,
      having: {
        slug: { _count: { gt: 1 } },
      },
    });
    const pass = dupes.length === 0;
    let detail = `${dupes.length}`;
    if (!pass) {
      const examples = dupes.slice(0, 5).map((d) => `${d.slug} (${d._count}x)`);
      detail += ` [${examples.join(', ')}]`;
    }
    results.push({ name: 'Duplicate slugs', passed: pass, warning: false, detail });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name: 'Duplicate slugs', passed: false, warning: false, detail: `ERROR: ${msg}` });
  }

  // ─── Check 8: Empty English content (published) ──────────────────

  try {
    const published = await prisma.blogPost.count({ where: { published: true } });
    // content_en is a required String, so check for empty or very short
    const emptyContent = await prisma.blogPost.findMany({
      where: {
        published: true,
        content_en: { not: '' },
      },
      select: { id: true, content_en: true },
    });
    // Filter in JS for length < 100 chars (Prisma string length filters are limited)
    const allPublished = await prisma.blogPost.findMany({
      where: { published: true },
      select: { id: true, content_en: true },
    });
    const shortIds: string[] = [];
    for (const post of allPublished) {
      if (post.content_en.length < 100) {
        shortIds.push(post.id);
      }
    }
    const pass = shortIds.length === 0;
    let detail = `${shortIds.length}`;
    if (!pass) {
      detail += ` [IDs: ${shortIds.slice(0, 10).join(', ')}]`;
    }
    results.push({ name: 'Empty English content', passed: pass, warning: !pass, detail });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name: 'Empty English content', passed: false, warning: false, detail: `ERROR: ${msg}` });
  }

  // ─── Check 9: Missing Arabic content (published) ─────────────────

  try {
    // content_ar is required String — check for empty
    const allPublished = await prisma.blogPost.findMany({
      where: { published: true },
      select: { id: true, content_ar: true },
    });
    const missingAr: string[] = [];
    for (const post of allPublished) {
      if (post.content_ar.length < 10) {
        missingAr.push(post.id);
      }
    }
    const pass = missingAr.length === 0;
    let detail = `${missingAr.length}`;
    results.push({ name: 'Missing Arabic content', passed: pass, warning: !pass, detail });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name: 'Missing Arabic content', passed: false, warning: false, detail: `ERROR: ${msg}` });
  }

  // ─── Check 10: SEO score distribution ─────────────────────────────

  try {
    const posts = await prisma.blogPost.findMany({
      where: { published: true },
      select: { seo_score: true },
    });
    for (const p of posts) {
      const score = p.seo_score ?? 0;
      if (score < 50) seoDistribution.range0_49++;
      else if (score < 70) seoDistribution.range50_69++;
      else if (score < 90) seoDistribution.range70_89++;
      else seoDistribution.range90_100++;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[db-consistency] SEO score distribution failed: ${msg}`);
  }

  // ─── Disconnect ──────────────────────────────────────────────────

  await prisma.$disconnect();

  // ─── Build report ────────────────────────────────────────────────

  const lines: string[] = [];

  lines.push(`DB CONSISTENCY REPORT — ${dateStr}`);
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let failCount = 0;
  let warnCount = 0;
  const totalChecks = results.length;

  for (const r of results) {
    const icon = r.passed ? '✅' : r.warning ? '⚠️' : '❌';
    if (!r.passed && !r.warning) failCount++;
    if (r.warning) warnCount++;
    const padded = (r.name + ':').padEnd(32);
    lines.push(`${padded} ${r.detail.padEnd(16)} ${icon}`);
  }

  lines.push(
    `SEO scores: 0-49: ${seoDistribution.range0_49} | 50-69: ${seoDistribution.range50_69} | 70-89: ${seoDistribution.range70_89} | 90-100: ${seoDistribution.range90_100}`
  );

  lines.push('');
  lines.push('CRON HEALTH (7 DAYS)');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let cronFails = 0;
  if (cronResults.length === 0 || (cronResults.length === 1 && cronResults[0].job_name === 'ERROR')) {
    lines.push('No cron logs found in last 7 days');
  } else {
    for (const c of cronResults) {
      if (c.job_name === 'ERROR') continue;
      const succeeded = c.total - c.failed;
      const icon = c.rate > 20 ? '❌ FIX NEEDED' : c.rate > 0 ? '⚠️' : '✅';
      if (c.rate > 20) cronFails++;
      const padded = (c.job_name + ':').padEnd(30);
      const stats = `${succeeded}/${c.total}`.padEnd(8);
      lines.push(`${padded} ${stats} ${c.rate}%  ${icon}`);
    }
  }

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const passCount = totalChecks - failCount - warnCount;
  const attentionCount = failCount + warnCount + cronFails;
  const overallIcon = failCount > 0 || cronFails > 0 ? '❌' : warnCount > 0 ? '⚠️' : '✅';

  if (attentionCount === 0) {
    lines.push(`OVERALL: ${totalChecks}/${totalChecks} PASS ${overallIcon}`);
  } else {
    lines.push(`OVERALL: ${passCount}/${totalChecks} PASS — ${attentionCount} items need attention ${overallIcon}`);
  }

  // ─── Output ──────────────────────────────────────────────────────

  const report = lines.join('\n');
  console.log(report);

  // Write to docs/
  const reportPath = join(__dirname, '..', 'docs', 'DB-CONSISTENCY-REPORT.md');
  try {
    writeFileSync(reportPath, '```\n' + report + '\n```\n');
    console.log(`\nReport written to: docs/DB-CONSISTENCY-REPORT.md`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[db-consistency] Could not write report file: ${msg}`);
  }

  // ─── Exit code ───────────────────────────────────────────────────

  const hasHardFail = failCount > 0 || cronFails > 0;
  process.exit(hasHardFail ? 1 : 0);
}

main().catch((err) => {
  console.error(`FATAL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
