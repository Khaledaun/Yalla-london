/**
 * Health Audit — Content Pipeline Checks
 *
 * 4 checks: pipeline status, topic queue health,
 * keyword cannibalization, title sanitizer.
 */

import {
  type AuditConfig,
  type CheckResult,
  makeResult,
  runCheck,
} from "@/lib/health-audit/types";

const ACTIVE_PHASES = ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"];
const EARLY_PHASES = ["research", "outline", "drafting"];

/* ------------------------------------------------------------------ */
/* 1. Pipeline status                                                  */
/* ------------------------------------------------------------------ */
async function pipelineStatus(config: AuditConfig): Promise<CheckResult> {
  const { prisma } = await import("@/lib/db");
  const now = new Date();
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60_000);
  const twentyFourHAgo = new Date(now.getTime() - 24 * 3_600_000);

  // Count by phase
  const drafts = await prisma.articleDraft.findMany({
    where: { site_id: config.siteId },
    select: { id: true, current_phase: true, phase_started_at: true, created_at: true },
  });

  const byPhase: Record<string, number> = {};
  const stuck: { id: string; phase: string; stuckMinutes: number }[] = [];
  const aging: { id: string; phase: string; ageHours: number }[] = [];

  for (const d of drafts) {
    const phase = d.current_phase ?? "unknown";
    byPhase[phase] = (byPhase[phase] ?? 0) + 1;

    // Stuck: in an active phase with phase_started_at > 30 min ago
    if (
      ACTIVE_PHASES.includes(phase) &&
      d.phase_started_at &&
      d.phase_started_at < thirtyMinAgo
    ) {
      stuck.push({
        id: d.id,
        phase,
        stuckMinutes: Math.round((now.getTime() - d.phase_started_at.getTime()) / 60_000),
      });
    }

    // Aging: in early phase and created > 24h ago
    if (
      EARLY_PHASES.includes(phase) &&
      d.created_at < twentyFourHAgo
    ) {
      aging.push({
        id: d.id,
        phase,
        ageHours: Math.round((now.getTime() - d.created_at.getTime()) / 3_600_000),
      });
    }
  }

  const status =
    stuck.length > 0 ? "fail" :
    aging.length > 0 ? "warn" :
    "pass";

  return makeResult(status, {
    totalDrafts: drafts.length,
    byPhase,
    stuckCount: stuck.length,
    stuckItems: stuck.slice(0, 10),
    agingCount: aging.length,
    agingItems: aging.slice(0, 10),
  }, {
    ...(stuck.length > 0 && {
      error: `${stuck.length} draft(s) stuck in active phases for 30+ minutes`,
      action: "Run Diagnostic Sweep or manually re-queue stuck drafts from Content Matrix.",
    }),
    ...(stuck.length === 0 && aging.length > 0 && {
      action: `${aging.length} draft(s) queued for 24+ hours. Check if content-builder cron is running.`,
    }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 2. Topic queue health                                               */
/* ------------------------------------------------------------------ */
async function topicQueueHealth(config: AuditConfig): Promise<CheckResult> {
  const { prisma } = await import("@/lib/db");

  // Count by status
  const topics = await prisma.topicProposal.groupBy({
    by: ["status"],
    where: { site_id: config.siteId },
    _count: { id: true },
  });

  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const t of topics) {
    byStatus[t.status] = t._count.id;
    total += t._count.id;
  }

  const pendingCount = byStatus["pending"] ?? 0;
  const approvedCount = byStatus["approved"] ?? 0;
  const readyTopics = pendingCount + approvedCount;

  // Find duplicate keywords among pending/approved
  const duplicates = (await prisma.$queryRaw`
    SELECT keyword, count(*) as cnt
    FROM "TopicProposal"
    WHERE site_id = ${config.siteId}
      AND status IN ('pending', 'approved')
    GROUP BY keyword
    HAVING count(*) > 1
    LIMIT 20
  `) as { keyword: string; cnt: bigint }[];

  const dupeCount = duplicates.length;

  const status =
    readyTopics === 0 ? "fail" :
    dupeCount > 0 ? "warn" :
    "pass";

  return makeResult(status, {
    total,
    byStatus,
    readyTopics,
    duplicateKeywords: dupeCount,
    duplicates: duplicates.map(d => ({ keyword: d.keyword, count: Number(d.cnt) })),
  }, {
    ...(readyTopics === 0 && {
      error: "No pending or approved topics in queue",
      action: "Run weekly-topics cron or use Topic Research in cockpit to seed new topics.",
    }),
    ...(readyTopics > 0 && dupeCount > 0 && {
      action: `${dupeCount} duplicate keyword(s) in topic queue. De-duplicate to avoid cannibalization.`,
    }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 3. Keyword cannibalization check                                    */
/* ------------------------------------------------------------------ */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

async function cannibalizationCheck(config: AuditConfig): Promise<CheckResult> {
  const { prisma } = await import("@/lib/db");

  const posts = await prisma.blogPost.findMany({
    where: { siteId: config.siteId, published: true, deletedAt: null },
    select: { id: true, slug: true, title_en: true, keywords_json: true },
    take: 50,
    orderBy: { created_at: "desc" },
  });

  // Parse keyword sets
  const postKeywords: { id: string; slug: string; title: string; keywords: Set<string> }[] = [];
  for (const p of posts) {
    let kw: string[] = [];
    try {
      if (p.keywords_json) {
        const parsed = typeof p.keywords_json === "string" ? JSON.parse(p.keywords_json) : p.keywords_json;
        if (Array.isArray(parsed)) {
          kw = parsed.map((k: unknown) => String(k).toLowerCase().trim()).filter(Boolean);
        }
      }
    } catch {
      // Skip unparseable keywords
    }
    if (kw.length > 0) {
      postKeywords.push({ id: p.id, slug: p.slug, title: p.title_en, keywords: new Set(kw) });
    }
  }

  // Compare pairs
  const conflicts: { slugA: string; slugB: string; overlap: number; sharedKeywords: string[] }[] = [];

  for (let i = 0; i < postKeywords.length; i++) {
    for (let j = i + 1; j < postKeywords.length; j++) {
      const a = postKeywords[i];
      const b = postKeywords[j];
      const similarity = jaccardSimilarity(a.keywords, b.keywords);

      if (similarity > 0.6) {
        const shared: string[] = [];
        for (const kw of a.keywords) {
          if (b.keywords.has(kw)) shared.push(kw);
        }
        conflicts.push({
          slugA: a.slug,
          slugB: b.slug,
          overlap: Math.round(similarity * 100),
          sharedKeywords: shared.slice(0, 5),
        });
      }
    }
  }

  const status =
    conflicts.length === 0 ? "pass" :
    conflicts.length <= 3 ? "warn" :
    "fail";

  return makeResult(status, {
    articlesAnalyzed: postKeywords.length,
    conflictsFound: conflicts.length,
    conflicts: conflicts.slice(0, 10),
  }, {
    ...(conflicts.length > 0 && {
      action: `${conflicts.length} article pair(s) share >60% keywords. Differentiate focus keywords or merge content.`,
    }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* 4. Title sanitizer check                                            */
/* ------------------------------------------------------------------ */
const TITLE_ARTIFACT_PATTERNS = [
  /\(\d+\s*chars?\)/i,
  /\(under\s+\d+/i,
  /SEO[- ]optimized/i,
  /including keyword/i,
];

async function titleSanitizerCheck(config: AuditConfig): Promise<CheckResult> {
  const { prisma } = await import("@/lib/db");

  const posts = await prisma.blogPost.findMany({
    where: { siteId: config.siteId, published: true, deletedAt: null },
    select: { id: true, slug: true, title_en: true },
    take: 500,
  });

  const dirty: { slug: string; title: string; matchedPattern: string }[] = [];

  for (const p of posts) {
    if (!p.title_en) continue;
    for (const pattern of TITLE_ARTIFACT_PATTERNS) {
      if (pattern.test(p.title_en)) {
        dirty.push({
          slug: p.slug,
          title: p.title_en,
          matchedPattern: pattern.source,
        });
        break; // One match per title is enough
      }
    }
  }

  const status =
    dirty.length === 0 ? "pass" :
    dirty.length <= 3 ? "warn" :
    "fail";

  return makeResult(status, {
    totalScanned: posts.length,
    dirtyCount: dirty.length,
    dirtyTitles: dirty.slice(0, 10),
  }, {
    ...(dirty.length > 0 && {
      action: `${dirty.length} title(s) contain AI artifacts (char counts, "SEO-optimized", etc). Clean via Content Matrix.`,
    }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* Exported runner                                                     */
/* ------------------------------------------------------------------ */
export async function runContentPipelineChecks(
  config: AuditConfig
): Promise<Record<string, CheckResult>> {
  const checks: Record<string, (c: AuditConfig) => Promise<CheckResult>> = {
    pipelineStatus: pipelineStatus,
    topicQueueHealth: topicQueueHealth,
    cannibalizationCheck: cannibalizationCheck,
    titleSanitizerCheck: titleSanitizerCheck,
  };

  const results: Record<string, CheckResult> = {};
  for (const [name, fn] of Object.entries(checks)) {
    results[name] = await runCheck(name, fn, config);
  }
  return results;
}
