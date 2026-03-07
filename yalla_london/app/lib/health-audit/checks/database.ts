/**
 * Health Audit — Database Checks
 *
 * 5 checks: connection latency, connection pool, critical tables,
 * article integrity, content freshness.
 */

import {
  type AuditConfig,
  type CheckResult,
  makeResult,
  runCheck,
} from "@/lib/health-audit/types";

/* ------------------------------------------------------------------ */
/* 1. Connection latency                                               */
/* ------------------------------------------------------------------ */
async function connectionCheck(config: AuditConfig): Promise<CheckResult> {
  const { prisma } = await import("@/lib/db");
  const t0 = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  const latencyMs = Date.now() - t0;

  const status = latencyMs < 500 ? "pass" : latencyMs < 2000 ? "warn" : "fail";
  return makeResult(status, { latencyMs }, {
    ...(status === "warn" && { action: "Database latency is elevated. Check Supabase dashboard for load." }),
    ...(status === "fail" && { error: `Latency ${latencyMs}ms exceeds 2000ms threshold`, action: "Investigate Supabase connection — possible region mismatch or overload." }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 2. Connection pool usage                                            */
/* ------------------------------------------------------------------ */
async function connectionPoolCheck(config: AuditConfig): Promise<CheckResult> {
  const { prisma } = await import("@/lib/db");

  try {
    const rows = (await prisma.$queryRaw`
      SELECT
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') AS active,
        (SELECT setting::bigint FROM pg_settings WHERE name = 'max_connections') AS max
    `) as { active: bigint; max: bigint }[];

    const active = Number(rows[0]?.active ?? 0);
    const max = Number(rows[0]?.max ?? 100);
    const pct = max > 0 ? Math.round((active / max) * 100) : 0;

    const status = pct < 70 ? "pass" : pct < 90 ? "warn" : "fail";
    return makeResult(status, { activeConnections: active, maxConnections: max, usagePercent: pct }, {
      ...(status !== "pass" && { action: `Connection pool at ${pct}%. Consider reducing concurrent queries or upgrading plan.` }),
    }) as CheckResult;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return makeResult("fail", { activeConnections: null, maxConnections: null }, {
      error: `Could not query pg_stat_activity: ${msg}`,
      action: "Database user may lack pg_stat_activity permissions.",
    }) as CheckResult;
  }
}

/* ------------------------------------------------------------------ */
/* 3. Critical tables existence                                        */
/* ------------------------------------------------------------------ */
const CRITICAL_TABLES = [
  { name: "BlogPost", query: () => import("@/lib/db").then(({ prisma }) => prisma.blogPost.count()) },
  { name: "ArticleDraft", query: () => import("@/lib/db").then(({ prisma }) => prisma.articleDraft.count()) },
  { name: "TopicProposal", query: () => import("@/lib/db").then(({ prisma }) => prisma.topicProposal.count()) },
  { name: "CronJobLog", query: () => import("@/lib/db").then(({ prisma }) => prisma.cronJobLog.count()) },
  { name: "URLIndexingStatus", query: () => import("@/lib/db").then(({ prisma }) => prisma.uRLIndexingStatus.count()) },
  { name: "FeatureFlag", query: () => import("@/lib/db").then(({ prisma }) => prisma.featureFlag.count()) },
  { name: "ApiUsageLog", query: () => import("@/lib/db").then(({ prisma }) => prisma.apiUsageLog.count()) },
] as const;

async function criticalTablesCheck(config: AuditConfig): Promise<CheckResult> {
  const existing: Record<string, number> = {};
  const missing: string[] = [];

  for (const table of CRITICAL_TABLES) {
    try {
      existing[table.name] = await table.query();
    } catch {
      missing.push(table.name);
    }
  }

  const status = missing.length === 0 ? "pass" : "fail";
  return makeResult(status, { existing, missing, total: CRITICAL_TABLES.length }, {
    ...(missing.length > 0 && {
      error: `Missing tables: ${missing.join(", ")}`,
      action: "Run `npx prisma migrate deploy` or `npx prisma db push` to sync schema.",
    }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 4. Article data integrity                                           */
/* ------------------------------------------------------------------ */
async function articleIntegrityCheck(config: AuditConfig): Promise<CheckResult> {
  const { prisma } = await import("@/lib/db");
  const siteFilter = config.siteId ? { siteId: config.siteId } : {};

  const [total, published] = await Promise.all([
    prisma.blogPost.count({ where: { ...siteFilter, deletedAt: null } }),
    prisma.blogPost.count({ where: { ...siteFilter, deletedAt: null, published: true } }),
  ]);
  const draft = total - published;

  // Find issues
  const TITLE_ARTIFACT = /\(\d+\s*chars?\)/i;
  const issues: string[] = [];

  const emptyTitles = await prisma.blogPost.count({
    where: { ...siteFilter, deletedAt: null, title_en: "" },
  });
  if (emptyTitles > 0) issues.push(`${emptyTitles} empty title(s)`);

  const emptyContent = await prisma.blogPost.count({
    where: { ...siteFilter, deletedAt: null, content_en: "" },
  });
  if (emptyContent > 0) issues.push(`${emptyContent} empty content_en`);

  // Duplicate slugs (should not happen with @unique but check anyway)
  const dupes = (await prisma.$queryRaw`
    SELECT slug, count(*) as cnt FROM "BlogPost"
    WHERE "deletedAt" IS NULL
    GROUP BY slug HAVING count(*) > 1
    LIMIT 10
  `) as { slug: string; cnt: bigint }[];
  if (dupes.length > 0) issues.push(`${dupes.length} duplicate slug(s): ${dupes.map(d => d.slug).join(", ")}`);

  // Title artifacts (char count leftovers from AI)
  const allTitles = await prisma.blogPost.findMany({
    where: { ...siteFilter, deletedAt: null },
    select: { id: true, title_en: true },
    take: 500,
  });
  const artifactCount = allTitles.filter(a => TITLE_ARTIFACT.test(a.title_en)).length;
  if (artifactCount > 0) issues.push(`${artifactCount} title(s) with char-count artifacts`);

  const issueCount = issues.length;
  const status = issueCount === 0 ? "pass" : issueCount <= 5 ? "warn" : "fail";

  return makeResult(status, { total, published, draft, issueCount, issues }, {
    ...(issueCount > 0 && { action: "Review flagged articles in Content Matrix and fix or delete." }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 5. Content freshness                                                */
/* ------------------------------------------------------------------ */
async function contentFreshnessCheck(config: AuditConfig): Promise<CheckResult> {
  const { prisma } = await import("@/lib/db");
  const siteFilter = config.siteId ? { siteId: config.siteId } : {};
  const now = new Date();

  const d30 = new Date(now.getTime() - 30 * 86_400_000);
  const d90 = new Date(now.getTime() - 90 * 86_400_000);
  const d180 = new Date(now.getTime() - 180 * 86_400_000);

  const [fresh, aging, stale, ancient] = await Promise.all([
    prisma.blogPost.count({ where: { ...siteFilter, deletedAt: null, published: true, updated_at: { gte: d30 } } }),
    prisma.blogPost.count({ where: { ...siteFilter, deletedAt: null, published: true, updated_at: { gte: d90, lt: d30 } } }),
    prisma.blogPost.count({ where: { ...siteFilter, deletedAt: null, published: true, updated_at: { gte: d180, lt: d90 } } }),
    prisma.blogPost.count({ where: { ...siteFilter, deletedAt: null, published: true, updated_at: { lt: d180 } } }),
  ]);

  const total = fresh + aging + stale + ancient;
  const stalePct = total > 0 ? Math.round(((stale + ancient) / total) * 100) : 0;

  const status = total === 0 ? "skip" : stalePct < 20 ? "pass" : stalePct < 50 ? "warn" : "fail";
  return makeResult(status, {
    distribution: { "< 30d": fresh, "30-90d": aging, "90-180d": stale, "> 180d": ancient },
    totalPublished: total,
    stalePercent: stalePct,
  }, {
    ...(status === "warn" && { action: `${stalePct}% of content is over 90 days old. Schedule content refreshes.` }),
    ...(status === "fail" && { action: `${stalePct}% of content is stale. Prioritise content refresh pipeline.` }),
    ...(status === "skip" && { action: "No published articles found." }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* Exported runner                                                     */
/* ------------------------------------------------------------------ */
export async function runDatabaseChecks(
  config: AuditConfig
): Promise<Record<string, CheckResult>> {
  const checks: Record<string, (c: AuditConfig) => Promise<CheckResult>> = {
    connection: connectionCheck,
    connectionPool: connectionPoolCheck,
    criticalTables: criticalTablesCheck,
    articleIntegrity: articleIntegrityCheck,
    contentFreshness: contentFreshnessCheck,
  };

  const results: Record<string, CheckResult> = {};
  for (const [name, fn] of Object.entries(checks)) {
    results[name] = await runCheck(name, fn, config);
  }
  return results;
}
