/**
 * Clean-Slate Analyzer — produces the manifest of what should be cleaned.
 *
 * Read-only. Pure analysis. The endpoint at /api/admin/clean-slate calls this
 * and returns the manifest as JSON; the executor at clean-slate-executor.ts
 * applies the manifest's recommended actions.
 *
 * Hard rules (from CLEANUP_THRESHOLDS in professional-standards.ts):
 *   - NEVER delete a BlogPost record — only set published: false
 *   - NEVER touch a BlogPost with > 0 clicks OR > 50 impressions in 30d
 *   - NEVER touch articles created in last 7 days
 *   - NEVER touch zenitha-yachts-med (separate site, separate cleanup)
 */

import {
  CLEANUP_THRESHOLDS,
  normalizeForDuplicateDetection,
  jaccardSimilarity,
} from "@/lib/standards/professional-standards";

export interface CleanSlateManifest {
  generatedAt: string;
  siteId: string;
  rules: {
    minWordsToKeep: number;
    duplicateJaccardThreshold: number;
    minClicksToProtect: number;
    minImpressionsToProtect: number;
    protectAgeDays: number;
  };
  summary: {
    totalBlogPosts: number;
    willKeep: number;
    willUnpublish: number;
    willFix: number;
    willDelete: number;
    estimatedExecutionMs: number;
  };
  delete: {
    rejectedDrafts: { count: number; oldestDays: number };
    cronJobLogs: { count: number; oldestDays: number };
    autoFixLogs: { count: number; oldestDays: number };
    apiUsageLogs: { count: number; oldestDays: number };
    zombieRunningCrons: { count: number };
    stuckPromotingDrafts: { count: number; ids: string[] };
    stuckGeneratingTopics: { count: number; ids: string[] };
    orphanedUrlIndexingStatus: { count: number; sampleSlugs: string[] };
  };
  unpublish: {
    duplicateClusters: Array<{
      clusterTitle: string;
      keep: { id: string; slug: string; title: string; seoScore: number; wordCount: number };
      drop: Array<{ id: string; slug: string; title: string; reason: string }>;
    }>;
    thinNoTraffic: Array<{
      id: string;
      slug: string;
      title: string;
      wordCount: number;
      reason: string;
    }>;
    slugArtifacts: Array<{
      id: string;
      slug: string;
      title: string;
      cleanedSlug: string;
      reason: string;
    }>;
  };
  fix: {
    titleArtifacts: Array<{ id: string; slug: string; before: string; after: string }>;
    metaPlaceholders: Array<{ id: string; slug: string; field: string; before: string; after: string }>;
  };
  protect: {
    withTraffic: number;
    recentlyCreated: number;
    yachtSite: number;
  };
}

interface BlogPostRow {
  id: string;
  slug: string;
  title_en: string | null;
  title_ar: string | null;
  meta_title_en: string | null;
  meta_title_ar: string | null;
  meta_description_en: string | null;
  meta_description_ar: string | null;
  content_en: string;
  content_ar: string;
  seo_score: number | null;
  published: boolean;
  siteId: string;
  created_at: Date;
  updated_at: Date;
}

interface GscRow {
  url: string;
  clicks: number;
  impressions: number;
}

const PROTECT_AGE_MS = CLEANUP_THRESHOLDS.protectAgeDays * 24 * 60 * 60 * 1000;
const SLUG_ARTIFACT_PATTERN = /-v\d{1,3}([a-z0-9]{0,8})?$|-[0-9a-f]{6,}$|-\d{4}(-\d{2})?(-\d{2})?$/i;
const TITLE_BRAND_SUFFIX_PATTERN =
  /\s*[\|\-—]\s*(yalla london( guide)?|yallalondon|exclusive|complete( guide)?|definitive( guide)?)\s*$/gi;
const META_PLACEHOLDER_PATTERN =
  /^\[(REDIRECTED|DUPLICATE-FLAGGED|UNPUBLISHED|UNPUBLISHED-THIN|AUTO-UNPUBLISHED):[^\]]*\]\s*/;

export async function buildCleanSlateManifest(siteId: string): Promise<CleanSlateManifest> {
  const { prisma } = await import("@/lib/db");
  const now = new Date();
  const protectAfter = new Date(now.getTime() - PROTECT_AGE_MS);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // ── Fetch all candidates ─────────────────────────────────────────────────
  // Pull every BlogPost for the site (yacht site excluded by caller).
  // We need title_en/title_ar/meta fields for dedup + artifact detection.
  const allPosts = (await prisma.blogPost.findMany({
    where: { siteId, deletedAt: null },
    select: {
      id: true,
      slug: true,
      title_en: true,
      title_ar: true,
      meta_title_en: true,
      meta_title_ar: true,
      meta_description_en: true,
      meta_description_ar: true,
      content_en: true,
      content_ar: true,
      seo_score: true,
      published: true,
      siteId: true,
      created_at: true,
      updated_at: true,
    },
  })) as BlogPostRow[];

  // GSC traffic data (last 30d) so we can protect performing articles.
  const gscRows = (await prisma.gscPagePerformance
    .findMany({
      where: { siteId, date: { gte: last30Days } },
      select: { url: true, clicks: true, impressions: true },
    })
    .catch(() => [])) as GscRow[];

  // Roll up GSC by URL → totals, then map slug → traffic.
  const trafficBySlug = new Map<string, { clicks: number; impressions: number }>();
  for (const row of gscRows) {
    const m = row.url.match(/\/blog\/([^/?#]+)/);
    if (!m) continue;
    const slug = m[1];
    const existing = trafficBySlug.get(slug) || { clicks: 0, impressions: 0 };
    existing.clicks += row.clicks;
    existing.impressions += row.impressions;
    trafficBySlug.set(slug, existing);
  }

  // ── Compute protection sets ──────────────────────────────────────────────
  const protectedIds = new Set<string>();
  let protectWithTraffic = 0;
  let protectRecentlyCreated = 0;

  for (const post of allPosts) {
    const traffic = trafficBySlug.get(post.slug) || { clicks: 0, impressions: 0 };
    const hasTraffic =
      traffic.clicks >= CLEANUP_THRESHOLDS.minClicksLast30dToProtect ||
      traffic.impressions >= CLEANUP_THRESHOLDS.minImpressionsLast30dToProtect;
    const isRecent = post.created_at >= protectAfter;
    if (hasTraffic) {
      protectedIds.add(post.id);
      protectWithTraffic++;
    } else if (isRecent) {
      protectedIds.add(post.id);
      protectRecentlyCreated++;
    }
  }

  // ── Duplicate cluster detection ──────────────────────────────────────────
  // Only consider PUBLISHED, NON-PROTECTED posts. Cluster by Jaccard >= threshold.
  const candidatesForCluster = allPosts.filter((p) => p.published && !protectedIds.has(p.id));
  const titleSets = new Map<string, Set<string>>();
  for (const post of candidatesForCluster) {
    titleSets.set(post.id, normalizeForDuplicateDetection(post.title_en || ""));
  }

  const clusters: Array<{ ids: string[]; clusterTitle: string }> = [];
  const assigned = new Set<string>();
  for (const a of candidatesForCluster) {
    if (assigned.has(a.id)) continue;
    const aSet = titleSets.get(a.id)!;
    if (aSet.size === 0) continue;
    const cluster: string[] = [a.id];
    assigned.add(a.id);
    for (const b of candidatesForCluster) {
      if (assigned.has(b.id) || b.id === a.id) continue;
      const bSet = titleSets.get(b.id)!;
      if (jaccardSimilarity(aSet, bSet) >= CLEANUP_THRESHOLDS.duplicateJaccardThreshold) {
        cluster.push(b.id);
        assigned.add(b.id);
      }
    }
    if (cluster.length >= 2) clusters.push({ ids: cluster, clusterTitle: a.title_en || "(untitled)" });
  }

  // For each cluster, pick a winner (highest seo_score → highest word_count → earliest created_at).
  const duplicateClusters: CleanSlateManifest["unpublish"]["duplicateClusters"] = [];
  for (const cluster of clusters) {
    const members = cluster.ids.map((id) => allPosts.find((p) => p.id === id)!).filter(Boolean);
    members.sort((x, y) => {
      const sx = x.seo_score ?? 0;
      const sy = y.seo_score ?? 0;
      if (sx !== sy) return sy - sx;
      const wx = (x.content_en || "").replace(/<[^>]+>/g, "").split(/\s+/).length;
      const wy = (y.content_en || "").replace(/<[^>]+>/g, "").split(/\s+/).length;
      if (wx !== wy) return wy - wx;
      return x.created_at.getTime() - y.created_at.getTime();
    });
    const winner = members[0];
    const losers = members.slice(1);
    const winnerWords = (winner.content_en || "").replace(/<[^>]+>/g, "").split(/\s+/).length;
    duplicateClusters.push({
      clusterTitle: cluster.clusterTitle,
      keep: {
        id: winner.id,
        slug: winner.slug,
        title: winner.title_en || "",
        seoScore: winner.seo_score ?? 0,
        wordCount: winnerWords,
      },
      drop: losers.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title_en || "",
        reason: `Duplicate of "${winner.slug}" (Jaccard ≥ ${CLEANUP_THRESHOLDS.duplicateJaccardThreshold}); winner has higher seo_score/word_count`,
      })),
    });
  }

  // ── Thin content with no traffic ─────────────────────────────────────────
  const thinNoTraffic: CleanSlateManifest["unpublish"]["thinNoTraffic"] = [];
  const inClusterToDrop = new Set(duplicateClusters.flatMap((c) => c.drop.map((d) => d.id)));
  for (const post of allPosts) {
    if (!post.published) continue;
    if (protectedIds.has(post.id)) continue;
    if (inClusterToDrop.has(post.id)) continue; // already covered by cluster drop
    const wordCount = (post.content_en || "")
      .replace(/<[^>]+>/g, "")
      .split(/\s+/)
      .filter(Boolean).length;
    if (wordCount < CLEANUP_THRESHOLDS.thinContentMinWords) {
      thinNoTraffic.push({
        id: post.id,
        slug: post.slug,
        title: post.title_en || "",
        wordCount,
        reason: `${wordCount}w < ${CLEANUP_THRESHOLDS.thinContentMinWords}w threshold and no traffic in last 30d`,
      });
    }
  }

  // ── Slug artifacts (-v3, -v9-hex, year tags) ─────────────────────────────
  const slugArtifacts: CleanSlateManifest["unpublish"]["slugArtifacts"] = [];
  for (const post of allPosts) {
    if (!post.published) continue;
    if (protectedIds.has(post.id)) continue;
    if (inClusterToDrop.has(post.id)) continue;
    if (thinNoTraffic.some((t) => t.id === post.id)) continue;
    if (SLUG_ARTIFACT_PATTERN.test(post.slug)) {
      const cleanedSlug = post.slug.replace(SLUG_ARTIFACT_PATTERN, "");
      slugArtifacts.push({
        id: post.id,
        slug: post.slug,
        title: post.title_en || "",
        cleanedSlug,
        reason: `Slug contains AI-cascade artifact (-v\\d, hex hash, or year tag) — should canonicalize to ${cleanedSlug}`,
      });
    }
  }

  // ── Title artifacts (in-place fix) ───────────────────────────────────────
  const titleArtifacts: CleanSlateManifest["fix"]["titleArtifacts"] = [];
  for (const post of allPosts) {
    if (!post.title_en) continue;
    const cleaned = post.title_en.replace(TITLE_BRAND_SUFFIX_PATTERN, "").trim();
    if (cleaned !== post.title_en && cleaned.length >= 20) {
      titleArtifacts.push({ id: post.id, slug: post.slug, before: post.title_en, after: cleaned });
    }
  }

  // ── Meta description placeholders (in-place fix) ─────────────────────────
  const metaPlaceholders: CleanSlateManifest["fix"]["metaPlaceholders"] = [];
  for (const post of allPosts) {
    for (const field of ["meta_description_en", "meta_description_ar", "meta_title_en", "meta_title_ar"] as const) {
      const v = post[field];
      if (typeof v === "string" && META_PLACEHOLDER_PATTERN.test(v)) {
        const cleaned = v.replace(META_PLACEHOLDER_PATTERN, "").trim();
        metaPlaceholders.push({ id: post.id, slug: post.slug, field, before: v, after: cleaned });
      }
    }
  }

  // ── Stale operational data (counts only — no individual rows) ────────────
  const cronCutoff = new Date(now.getTime() - CLEANUP_THRESHOLDS.cronJobLogRetentionDays * 86400000);
  const autoFixCutoff = new Date(now.getTime() - CLEANUP_THRESHOLDS.autoFixLogRetentionDays * 86400000);
  const apiUsageCutoff = new Date(now.getTime() - CLEANUP_THRESHOLDS.apiUsageLogRetentionDays * 86400000);
  const draftCutoff = new Date(now.getTime() - CLEANUP_THRESHOLDS.rejectedDraftRetentionDays * 86400000);
  const zombieCronCutoff = new Date(now.getTime() - CLEANUP_THRESHOLDS.zombieRunningCronAgeMinutes * 60000);
  const promotingCutoff = new Date(now.getTime() - CLEANUP_THRESHOLDS.stuckPromotingDraftAgeMinutes * 60000);
  const generatingCutoff = new Date(now.getTime() - CLEANUP_THRESHOLDS.stuckGeneratingTopicAgeMinutes * 60000);

  const [
    rejectedDraftCount,
    cronJobLogCount,
    autoFixLogCount,
    apiUsageLogCount,
    zombieRunningCount,
    stuckPromoting,
    stuckGenerating,
  ] = await Promise.all([
    prisma.articleDraft.count({ where: { current_phase: "rejected", updated_at: { lt: draftCutoff } } }),
    prisma.cronJobLog.count({ where: { started_at: { lt: cronCutoff } } }),
    prisma.autoFixLog.count({ where: { createdAt: { lt: autoFixCutoff } } }).catch(() => 0),
    prisma.apiUsageLog.count({ where: { createdAt: { lt: apiUsageCutoff } } }).catch(() => 0),
    prisma.cronJobLog.count({ where: { status: "running", started_at: { lt: zombieCronCutoff } } }),
    prisma.articleDraft.findMany({
      where: { site_id: siteId, current_phase: "promoting", updated_at: { lt: promotingCutoff } },
      select: { id: true },
      take: 100,
    }),
    prisma.topicProposal.findMany({
      where: { site_id: siteId, status: "generating", updated_at: { lt: generatingCutoff } },
      select: { id: true },
      take: 100,
    }),
  ]);

  // Orphaned URLIndexingStatus — slugs that no longer exist as published BlogPosts.
  const allSlugs = new Set(allPosts.map((p) => p.slug));
  const allUrlStatuses = await prisma.uRLIndexingStatus.findMany({
    where: { site_id: siteId },
    select: { url: true, slug: true },
    take: 5000,
  });
  const orphanSamples: string[] = [];
  let orphanCount = 0;
  for (const row of allUrlStatuses) {
    const slugFromUrl = row.slug || row.url.match(/\/blog\/([^/?#]+)/)?.[1];
    if (!slugFromUrl) continue;
    if (!allSlugs.has(slugFromUrl)) {
      orphanCount++;
      if (orphanSamples.length < 10) orphanSamples.push(slugFromUrl);
    }
  }

  // ── Counts ───────────────────────────────────────────────────────────────
  const willUnpublish =
    duplicateClusters.reduce((s, c) => s + c.drop.length, 0) + thinNoTraffic.length + slugArtifacts.length;
  const willFix = titleArtifacts.length + metaPlaceholders.length;
  const willDelete =
    rejectedDraftCount +
    cronJobLogCount +
    autoFixLogCount +
    apiUsageLogCount +
    zombieRunningCount +
    stuckPromoting.length +
    stuckGenerating.length +
    orphanCount;
  const willKeep = allPosts.filter((p) => p.published).length - willUnpublish;

  return {
    generatedAt: now.toISOString(),
    siteId,
    rules: {
      minWordsToKeep: CLEANUP_THRESHOLDS.thinContentMinWords,
      duplicateJaccardThreshold: CLEANUP_THRESHOLDS.duplicateJaccardThreshold,
      minClicksToProtect: CLEANUP_THRESHOLDS.minClicksLast30dToProtect,
      minImpressionsToProtect: CLEANUP_THRESHOLDS.minImpressionsLast30dToProtect,
      protectAgeDays: CLEANUP_THRESHOLDS.protectAgeDays,
    },
    summary: {
      totalBlogPosts: allPosts.length,
      willKeep,
      willUnpublish,
      willFix,
      willDelete,
      // Rough estimate: 50ms per write × all writes + 5s overhead
      estimatedExecutionMs: 5000 + (willUnpublish + willFix) * 50 + Math.min(willDelete, 1000) * 10,
    },
    delete: {
      rejectedDrafts: { count: rejectedDraftCount, oldestDays: CLEANUP_THRESHOLDS.rejectedDraftRetentionDays },
      cronJobLogs: { count: cronJobLogCount, oldestDays: CLEANUP_THRESHOLDS.cronJobLogRetentionDays },
      autoFixLogs: { count: autoFixLogCount, oldestDays: CLEANUP_THRESHOLDS.autoFixLogRetentionDays },
      apiUsageLogs: { count: apiUsageLogCount, oldestDays: CLEANUP_THRESHOLDS.apiUsageLogRetentionDays },
      zombieRunningCrons: { count: zombieRunningCount },
      stuckPromotingDrafts: { count: stuckPromoting.length, ids: stuckPromoting.map((d) => d.id) },
      stuckGeneratingTopics: { count: stuckGenerating.length, ids: stuckGenerating.map((t) => t.id) },
      orphanedUrlIndexingStatus: { count: orphanCount, sampleSlugs: orphanSamples },
    },
    unpublish: {
      duplicateClusters,
      thinNoTraffic,
      slugArtifacts,
    },
    fix: {
      titleArtifacts,
      metaPlaceholders,
    },
    protect: {
      withTraffic: protectWithTraffic,
      recentlyCreated: protectRecentlyCreated,
      yachtSite: 0, // siteId already filters out yacht
    },
  };
}
