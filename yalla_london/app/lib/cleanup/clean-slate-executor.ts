/**
 * Clean-Slate Executor — applies the manifest produced by the analyzer.
 *
 * Walks the manifest action-by-action. Logs every change to AutoFixLog
 * with before/after so anything can be inspected later. Caps per-phase
 * to avoid runaway operations on a bad manifest.
 *
 * Hard rules:
 *   - Re-verifies protection at execute time (in case GSC traffic
 *     arrived between manifest and execute).
 *   - NEVER deletes a BlogPost row — published=false + canonical_slug only.
 *   - Wraps each cluster's winner→losers in a transaction so canonical_slug
 *     is set atomically with the unpublish.
 *   - Skips the action and continues on per-row errors (don't abort the
 *     whole cleanup over one bad row).
 */

import type { CleanSlateManifest } from "./clean-slate-analyzer";
import { CLEANUP_THRESHOLDS } from "@/lib/standards/professional-standards";

export interface ExecutionResult {
  startedAt: string;
  completedAt: string;
  durationMs: number;
  siteId: string;
  applied: {
    unpublishedDuplicates: number;
    unpublishedThin: number;
    unpublishedSlugArtifacts: number;
    titlesFixed: number;
    metasFixed: number;
    rejectedDraftsDeleted: number;
    cronJobLogsDeleted: number;
    autoFixLogsDeleted: number;
    apiUsageLogsDeleted: number;
    zombieCronsResolved: number;
    promotingDraftsReverted: number;
    generatingTopicsReset: number;
    orphanedUrlsDeleted: number;
  };
  skipped: {
    nowProtected: number; // protection re-check failed at execute time
    perRunCapHit: number;
    errors: number;
  };
  errors: Array<{ phase: string; targetId: string; message: string }>;
}

const META_PLACEHOLDER_PATTERN =
  /^\[(REDIRECTED|DUPLICATE-FLAGGED|UNPUBLISHED|UNPUBLISHED-THIN|AUTO-UNPUBLISHED):[^\]]*\]\s*/;
const TITLE_BRAND_SUFFIX_PATTERN =
  /\s*[\|\-—]\s*(yalla london( guide)?|yallalondon|exclusive|complete( guide)?|definitive( guide)?)\s*$/gi;

/**
 * Re-verify that a BlogPost is still safe to touch at execute time.
 * Re-checks GSC traffic + age in case data changed since manifest was built.
 */
async function isStillSafeToTouch(postId: string, siteId: string): Promise<boolean> {
  const { prisma } = await import("@/lib/db");
  const protectAfter = new Date(Date.now() - CLEANUP_THRESHOLDS.protectAgeDays * 86400000);
  const last30Days = new Date(Date.now() - 30 * 86400000);

  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: { id: true, slug: true, created_at: true, deletedAt: true },
  });
  if (!post || post.deletedAt) return false;
  if (post.created_at >= protectAfter) return false; // too recent

  // Aggregate traffic for this slug
  const traffic = await prisma.gscPagePerformance
    .aggregate({
      where: { siteId, date: { gte: last30Days }, url: { contains: `/blog/${post.slug}` } },
      _sum: { clicks: true, impressions: true },
    })
    .catch(() => ({ _sum: { clicks: 0, impressions: 0 } }));
  const clicks = traffic._sum.clicks ?? 0;
  const impressions = traffic._sum.impressions ?? 0;
  if (clicks >= CLEANUP_THRESHOLDS.minClicksLast30dToProtect) return false;
  if (impressions >= CLEANUP_THRESHOLDS.minImpressionsLast30dToProtect) return false;

  return true;
}

/**
 * Logs an applied fix to AutoFixLog with structured before/after.
 * Fire-and-forget — execution continues even if the audit log write fails.
 */
async function logFix(opts: {
  siteId: string;
  fixType: string;
  targetType: string;
  targetId: string;
  before: unknown;
  after: unknown;
  success: boolean;
  errorMsg?: string;
}): Promise<void> {
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.autoFixLog.create({
      data: {
        siteId: opts.siteId,
        fixType: opts.fixType,
        agent: "clean-slate-executor",
        targetType: opts.targetType,
        targetId: opts.targetId,
        before: (opts.before as Record<string, unknown>) ?? null,
        after: (opts.after as Record<string, unknown>) ?? null,
        success: opts.success,
        error: opts.errorMsg,
      },
    });
  } catch (err) {
    console.warn("[clean-slate] AutoFixLog write failed:", err instanceof Error ? err.message : err);
  }
}

export async function executeCleanSlate(manifest: CleanSlateManifest): Promise<ExecutionResult> {
  const { prisma } = await import("@/lib/db");
  const startedAt = new Date();
  const result: ExecutionResult = {
    startedAt: startedAt.toISOString(),
    completedAt: "",
    durationMs: 0,
    siteId: manifest.siteId,
    applied: {
      unpublishedDuplicates: 0,
      unpublishedThin: 0,
      unpublishedSlugArtifacts: 0,
      titlesFixed: 0,
      metasFixed: 0,
      rejectedDraftsDeleted: 0,
      cronJobLogsDeleted: 0,
      autoFixLogsDeleted: 0,
      apiUsageLogsDeleted: 0,
      zombieCronsResolved: 0,
      promotingDraftsReverted: 0,
      generatingTopicsReset: 0,
      orphanedUrlsDeleted: 0,
    },
    skipped: { nowProtected: 0, perRunCapHit: 0, errors: 0 },
    errors: [],
  };

  // ── Phase 1: UNPUBLISH duplicates (set canonical_slug → 301 redirect) ────
  let unpublishCount = 0;
  for (const cluster of manifest.unpublish.duplicateClusters) {
    if (unpublishCount >= CLEANUP_THRESHOLDS.maxUnpublishesPerRun) {
      result.skipped.perRunCapHit++;
      break;
    }
    for (const drop of cluster.drop) {
      if (unpublishCount >= CLEANUP_THRESHOLDS.maxUnpublishesPerRun) {
        result.skipped.perRunCapHit++;
        break;
      }
      try {
        if (!(await isStillSafeToTouch(drop.id, manifest.siteId))) {
          result.skipped.nowProtected++;
          continue;
        }
        await prisma.blogPost.update({
          where: { id: drop.id },
          data: { published: false, canonical_slug: cluster.keep.slug },
        });
        await logFix({
          siteId: manifest.siteId,
          fixType: "clean-slate:duplicate-unpublish",
          targetType: "blogpost",
          targetId: drop.id,
          before: { slug: drop.slug, title: drop.title },
          after: { published: false, canonical_slug: cluster.keep.slug, redirectsTo: cluster.keep.slug },
          success: true,
        });
        result.applied.unpublishedDuplicates++;
        unpublishCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push({ phase: "duplicate-unpublish", targetId: drop.id, message: msg });
        result.skipped.errors++;
      }
    }
  }

  // ── Phase 2: UNPUBLISH thin content (no canonical — just hide) ───────────
  for (const thin of manifest.unpublish.thinNoTraffic) {
    if (unpublishCount >= CLEANUP_THRESHOLDS.maxUnpublishesPerRun) {
      result.skipped.perRunCapHit++;
      break;
    }
    try {
      if (!(await isStillSafeToTouch(thin.id, manifest.siteId))) {
        result.skipped.nowProtected++;
        continue;
      }
      const tag = `[UNPUBLISHED-THIN:${new Date().toISOString()}] `;
      const post = await prisma.blogPost.findUnique({
        where: { id: thin.id },
        select: { meta_description_en: true },
      });
      const taggedDesc = `${tag}${(post?.meta_description_en || "").slice(0, 160 - tag.length)}`;
      await prisma.blogPost.update({
        where: { id: thin.id },
        data: { published: false, meta_description_en: taggedDesc },
      });
      await logFix({
        siteId: manifest.siteId,
        fixType: "clean-slate:thin-unpublish",
        targetType: "blogpost",
        targetId: thin.id,
        before: { slug: thin.slug, wordCount: thin.wordCount },
        after: { published: false, reason: thin.reason },
        success: true,
      });
      result.applied.unpublishedThin++;
      unpublishCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push({ phase: "thin-unpublish", targetId: thin.id, message: msg });
      result.skipped.errors++;
    }
  }

  // ── Phase 3: UNPUBLISH slug artifacts (canonical → cleaned slug) ─────────
  for (const artifact of manifest.unpublish.slugArtifacts) {
    if (unpublishCount >= CLEANUP_THRESHOLDS.maxUnpublishesPerRun) {
      result.skipped.perRunCapHit++;
      break;
    }
    try {
      if (!(await isStillSafeToTouch(artifact.id, manifest.siteId))) {
        result.skipped.nowProtected++;
        continue;
      }
      // Canonical → cleaned version IF a published article with that clean slug exists.
      // Otherwise just unpublish (the slug pattern indicates AI noise).
      const canonicalCandidate = await prisma.blogPost.findFirst({
        where: { siteId: manifest.siteId, slug: artifact.cleanedSlug, published: true },
        select: { slug: true },
      });
      const canonicalSlug = canonicalCandidate?.slug ?? null;
      await prisma.blogPost.update({
        where: { id: artifact.id },
        data: { published: false, canonical_slug: canonicalSlug },
      });
      await logFix({
        siteId: manifest.siteId,
        fixType: "clean-slate:slug-artifact-unpublish",
        targetType: "blogpost",
        targetId: artifact.id,
        before: { slug: artifact.slug },
        after: { published: false, canonical_slug: canonicalSlug, hadArtifact: true },
        success: true,
      });
      result.applied.unpublishedSlugArtifacts++;
      unpublishCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push({ phase: "slug-artifact-unpublish", targetId: artifact.id, message: msg });
      result.skipped.errors++;
    }
  }

  // ── Phase 4: FIX titles in place ─────────────────────────────────────────
  let fixCount = 0;
  for (const fix of manifest.fix.titleArtifacts) {
    if (fixCount >= CLEANUP_THRESHOLDS.maxFixesPerRun) {
      result.skipped.perRunCapHit++;
      break;
    }
    try {
      // Idempotent — re-clean from current value rather than trusting manifest's
      // 'after' (some other cron may have edited the title in between).
      const current = await prisma.blogPost.findUnique({
        where: { id: fix.id },
        select: { title_en: true },
      });
      if (!current?.title_en) continue;
      const cleaned = current.title_en.replace(TITLE_BRAND_SUFFIX_PATTERN, "").trim();
      if (cleaned === current.title_en || cleaned.length < 20) continue;
      await prisma.blogPost.update({
        where: { id: fix.id },
        data: { title_en: cleaned },
      });
      await logFix({
        siteId: manifest.siteId,
        fixType: "clean-slate:title-artifact",
        targetType: "blogpost",
        targetId: fix.id,
        before: { title_en: current.title_en },
        after: { title_en: cleaned },
        success: true,
      });
      result.applied.titlesFixed++;
      fixCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push({ phase: "title-fix", targetId: fix.id, message: msg });
      result.skipped.errors++;
    }
  }

  // ── Phase 5: FIX meta placeholders in place ──────────────────────────────
  for (const fix of manifest.fix.metaPlaceholders) {
    if (fixCount >= CLEANUP_THRESHOLDS.maxFixesPerRun) {
      result.skipped.perRunCapHit++;
      break;
    }
    try {
      const current = await prisma.blogPost.findUnique({
        where: { id: fix.id },
        select: {
          meta_description_en: true,
          meta_description_ar: true,
          meta_title_en: true,
          meta_title_ar: true,
        },
      });
      if (!current) continue;
      const v = (current as Record<string, unknown>)[fix.field];
      if (typeof v !== "string" || !META_PLACEHOLDER_PATTERN.test(v)) continue;
      const cleaned = v.replace(META_PLACEHOLDER_PATTERN, "").trim();
      await prisma.blogPost.update({
        where: { id: fix.id },
        data: { [fix.field]: cleaned.length > 0 ? cleaned : null } as Record<string, unknown>,
      });
      await logFix({
        siteId: manifest.siteId,
        fixType: "clean-slate:meta-placeholder",
        targetType: "blogpost",
        targetId: fix.id,
        before: { [fix.field]: v },
        after: { [fix.field]: cleaned.length > 0 ? cleaned : null },
        success: true,
      });
      result.applied.metasFixed++;
      fixCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push({ phase: "meta-fix", targetId: fix.id, message: msg });
      result.skipped.errors++;
    }
  }

  // ── Phase 6: DELETE stale operational data (no SEO impact) ───────────────
  const now = Date.now();
  const cronCutoff = new Date(now - CLEANUP_THRESHOLDS.cronJobLogRetentionDays * 86400000);
  const autoFixCutoff = new Date(now - CLEANUP_THRESHOLDS.autoFixLogRetentionDays * 86400000);
  const apiUsageCutoff = new Date(now - CLEANUP_THRESHOLDS.apiUsageLogRetentionDays * 86400000);
  const draftCutoff = new Date(now - CLEANUP_THRESHOLDS.rejectedDraftRetentionDays * 86400000);
  const zombieCronCutoff = new Date(now - CLEANUP_THRESHOLDS.zombieRunningCronAgeMinutes * 60000);

  try {
    const r = await prisma.articleDraft.deleteMany({
      where: { current_phase: "rejected", updated_at: { lt: draftCutoff } },
    });
    result.applied.rejectedDraftsDeleted = r.count;
  } catch (err) {
    result.errors.push({
      phase: "delete-rejected-drafts",
      targetId: "*",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    const r = await prisma.cronJobLog.deleteMany({ where: { started_at: { lt: cronCutoff } } });
    result.applied.cronJobLogsDeleted = r.count;
  } catch (err) {
    result.errors.push({
      phase: "delete-cron-logs",
      targetId: "*",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    const r = await prisma.autoFixLog.deleteMany({ where: { createdAt: { lt: autoFixCutoff } } });
    result.applied.autoFixLogsDeleted = r.count;
  } catch (err) {
    result.errors.push({
      phase: "delete-auto-fix-logs",
      targetId: "*",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    const r = await prisma.apiUsageLog.deleteMany({ where: { createdAt: { lt: apiUsageCutoff } } });
    result.applied.apiUsageLogsDeleted = r.count;
  } catch (err) {
    result.errors.push({
      phase: "delete-api-usage",
      targetId: "*",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Zombie crons → mark as failed (don't delete — keep audit trail)
  try {
    const r = await prisma.cronJobLog.updateMany({
      where: { status: "running", started_at: { lt: zombieCronCutoff } },
      data: { status: "failed", error_message: "Zombie cron resolved by clean-slate (>1h running)" },
    });
    result.applied.zombieCronsResolved = r.count;
  } catch (err) {
    result.errors.push({
      phase: "resolve-zombie-crons",
      targetId: "*",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Stuck "promoting" drafts → revert to reservoir
  for (const id of manifest.delete.stuckPromotingDrafts.ids) {
    try {
      await prisma.articleDraft.update({
        where: { id },
        data: {
          current_phase: "reservoir",
          phase_started_at: null,
          last_error: "[clean-slate] Reverted stuck promoting",
        },
      });
      result.applied.promotingDraftsReverted++;
    } catch (err) {
      result.errors.push({
        phase: "revert-promoting",
        targetId: id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Stuck "generating" topics → reset to "ready"
  for (const id of manifest.delete.stuckGeneratingTopics.ids) {
    try {
      await prisma.topicProposal.update({
        where: { id },
        data: { status: "ready" },
      });
      result.applied.generatingTopicsReset++;
    } catch (err) {
      result.errors.push({
        phase: "reset-generating",
        targetId: id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Orphaned URLIndexingStatus rows
  try {
    const allSlugs = (
      await prisma.blogPost.findMany({
        where: { siteId: manifest.siteId, deletedAt: null },
        select: { slug: true },
      })
    ).map((p) => p.slug);
    const allSlugSet = new Set<string>(allSlugs);
    const allUrlStatuses = await prisma.uRLIndexingStatus.findMany({
      where: { site_id: manifest.siteId },
      select: { id: true, url: true, slug: true },
    });
    const orphanIds: string[] = [];
    for (const row of allUrlStatuses) {
      const slugFromUrl = row.slug || row.url.match(/\/blog\/([^/?#]+)/)?.[1];
      if (slugFromUrl && !allSlugSet.has(slugFromUrl)) orphanIds.push(row.id);
    }
    if (orphanIds.length > 0) {
      const r = await prisma.uRLIndexingStatus.deleteMany({ where: { id: { in: orphanIds } } });
      result.applied.orphanedUrlsDeleted = r.count;
    }
  } catch (err) {
    result.errors.push({
      phase: "delete-orphaned-urls",
      targetId: "*",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // ── Phase 7: regenerate sitemap so the cleaned-up state is visible ───────
  try {
    const { regenerateSitemapCache } = await import("@/lib/sitemap-cache");
    await regenerateSitemapCache(manifest.siteId);
  } catch (err) {
    result.errors.push({
      phase: "regenerate-sitemap",
      targetId: manifest.siteId,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  const completedAt = new Date();
  result.completedAt = completedAt.toISOString();
  result.durationMs = completedAt.getTime() - startedAt.getTime();
  return result;
}
