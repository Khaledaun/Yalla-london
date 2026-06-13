export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — Vercel Pro supports up to 300s per route

/**
 * Content Auto-Fix HEAVY — AI-Powered Content Enhancement
 *
 * Runs twice daily (11am + 6pm UTC). Handles ONLY expensive AI operations:
 *
 * 1. WORD COUNT FIX — AI expansion for short reservoir drafts (~20s each)
 * 2. LOW QUALITY FIX — AI enhancement for low-score drafts (~20s each)
 * 3. INTERNAL LINK INJECTION — Auto-remediate engine
 * 4. AFFILIATE LINK INJECTION — Auto-remediate engine
 * 5. DUPLICATE META REWRITE — AI-powered uniqueness fix
 * 6. ARABIC META GENERATION — AI translation
 *
 * Lightweight DB-only fixes (stuck recovery, heading fix, meta trims)
 * are handled by content-auto-fix-lite (runs every 4 hours).
 * This split prevents connection pool exhaustion from 300+ DB ops.
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";
import { CONTENT_QUALITY } from "@/lib/seo/standards";
import { optimisticBlogPostUpdate } from "@/lib/db/optimistic-update";
import { isEnhancementOwner, buildEnhancementLogEntry } from "@/lib/db/enhancement-log";

const BUDGET_MS = 280_000; // 280s usable budget within 300s maxDuration
const MIN_WORD_COUNT = CONTENT_QUALITY.minWords; // 500 — aligned with standards.ts
const MAX_WORD_COUNT_ENHANCES = 1;
const MAX_LOW_SCORE_ENHANCES = 1;

async function handleAutoFix(request: NextRequest) {
  const cronStart = Date.now();
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Feature flag guard — can be disabled via DB flag or env var CRON_CONTENT_AUTO_FIX=false
  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const flagResponse = await checkCronEnabled("content-auto-fix");
  if (flagResponse) return flagResponse;

  const { prisma } = await import("@/lib/db");
  const { getActiveSiteIds } = await import("@/config/sites");
  const activeSiteIds = getActiveSiteIds();

  const results = {
    enhanced: 0,
    enhancedLowScore: 0,
    enhanceFailed: 0,
    internalLinksInjected: 0,
    affiliateLinksInjected: 0,
    duplicateMetasFixed: 0,
    arabicMetaGenerated: 0,
    brokenLinksFixed: 0,
    orphansFixed: 0,
    thinUnpublished: 0,
    badSlugUnpublished: 0,
    duplicatesUnpublished: 0,
    arabicContentBackfilled: 0,
    deadAffiliateLinksRemoved: 0,
    staleAffiliateLinksRemoved: 0,
    untrackedLinksWrapped: 0,
    placeholderIdsFixed: 0,
    notIndexedEnhanced: 0,
    seoBoostEnhanced: 0,
    affiliateDisclosuresInjected: 0,
    emptyParamAffiliatesStripped: 0,
    expediaLinksConverted: 0,
    errors: [] as string[],
  };

  // NOTE: Sections 1 (stuck recovery), 2 (heading fix) moved to content-auto-fix-lite

  // ── 0. THIN CONTENT CLEANUP (zero AI, runs FIRST — prevents budget starvation) ──
  // Previously Section 12, moved to run before AI-heavy sections because:
  // 1) Thin content (<300w) actively harms SEO (Helpful Content system site-wide demotion)
  // 2) This section is pure DB operations — no AI budget needed
  // 3) When AI sections consume full budget, thin content cleanup never runs
  if (Date.now() - cronStart < BUDGET_MS - 3_000) {
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const allPublished = await prisma.blogPost.findMany({
        where: {
          siteId: { in: activeSiteIds },
          published: true,
          deletedAt: null,
          created_at: { lt: twoHoursAgo },
        },
        select: { id: true, slug: true, content_en: true, content_ar: true, title_en: true, title_ar: true },
        orderBy: { created_at: "desc" },
        take: 500,
      });

      let earlyThinUnpublished = 0;
      let earlyBadSlugUnpublished = 0;
      const thinThreshold = CONTENT_QUALITY.thinContentThreshold || 300;

      for (const post of allPublished) {
        if (Date.now() - cronStart > BUDGET_MS - 5_000) break;

        const hasBadSlug = !post.slug || post.slug === "-" || post.slug === "";
        const hasExpandPrefix = /^EXPAND:\s/i.test(post.title_en || "") || /^EXPAND:\s/i.test(post.title_ar || "");
        if (hasBadSlug || hasExpandPrefix) {
          try {
            const reason = hasBadSlug
              ? `BAD_SLUG: "${post.slug}"`
              : `EXPAND_PREFIX: "${(post.title_en || "").slice(0, 60)}"`;
            await optimisticBlogPostUpdate(
              post.id,
              () => ({
                published: false,
                meta_description_en: `[UNPUBLISHED: ${reason}] ${(post.slug || "").slice(0, 80)}`,
              }),
              { tag: "[content-auto-fix]" },
            );
            earlyBadSlugUnpublished++;
            console.log(`[content-auto-fix] Unpublished bad article: ${reason}`);
          } catch (upErr) {
            console.warn(
              `[content-auto-fix] Failed to unpublish bad article "${post.slug}":`,
              upErr instanceof Error ? upErr.message : upErr,
            );
          }
          continue;
        }

        const enText = (post.content_en || "")
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const arText = (post.content_ar || "")
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const enWords = enText.split(" ").filter(Boolean).length;
        const arWords = arText.split(" ").filter(Boolean).length;
        const wordCount = Math.max(enWords, arWords);

        if (wordCount < thinThreshold) {
          try {
            await optimisticBlogPostUpdate(
              post.id,
              () => ({
                published: false,
                meta_description_en: `[UNPUBLISHED: THIN_CONTENT ${wordCount}w < ${thinThreshold}w] ${(post.slug || "").slice(0, 80)}`,
              }),
              { tag: "[content-auto-fix]" },
            );
            earlyThinUnpublished++;
            console.log(
              `[content-auto-fix] Unpublished ultra-thin article "${post.slug}" (${wordCount}w < ${thinThreshold}w)`,
            );
          } catch (upErr) {
            console.warn(
              `[content-auto-fix] Failed to unpublish thin "${post.slug}":`,
              upErr instanceof Error ? upErr.message : upErr,
            );
          }
        }
      }

      if (earlyThinUnpublished > 0 || earlyBadSlugUnpublished > 0) {
        console.log(
          `[content-auto-fix] Section 0: ${earlyThinUnpublished} thin + ${earlyBadSlugUnpublished} bad-slug unpublished`,
        );
      }
      results.thinUnpublished = (results.thinUnpublished || 0) + earlyThinUnpublished;
      results.badSlugUnpublished = (results.badSlugUnpublished || 0) + earlyBadSlugUnpublished;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`early-thin-cleanup: ${msg}`);
      console.warn("[content-auto-fix] Section 0 (early thin cleanup) failed:", msg);
    }
  }

  // ── 1. WORD COUNT FIX (AI-powered, ~20s per draft) ───────────────────────
  // Find reservoir drafts with word_count < MIN_WORD_COUNT, oldest first
  if (Date.now() - cronStart < BUDGET_MS - 25_000) {
    try {
      const shortDrafts = await prisma.articleDraft.findMany({
        where: {
          site_id: { in: activeSiteIds },
          current_phase: "reservoir",
          OR: [{ word_count: { lt: MIN_WORD_COUNT } }, { word_count: null }],
          assembled_html: { not: null },
        },
        orderBy: { updated_at: "asc" }, // oldest first → longest-waiting first
        take: MAX_WORD_COUNT_ENHANCES,
      });

      const { enhanceReservoirDraft } = await import("@/lib/content-pipeline/enhance-runner");

      for (const draft of shortDrafts) {
        const budgetUsed = Date.now() - cronStart;
        if (budgetUsed > BUDGET_MS - 25_000) {
          // Need 25s budget remaining for a full enhance call
          console.warn(
            `[content-auto-fix] Budget low (${Math.round(budgetUsed / 1000)}s used) — stopping enhancement loop`,
          );
          break;
        }

        const wordCount = (draft.assembled_html || "")
          .replace(/<[^>]+>/g, " ")
          .trim()
          .split(/\s+/)
          .filter(Boolean).length;

        console.log(
          `[content-auto-fix] Enhancing draft ${draft.id} (keyword: "${draft.keyword}", words: ${wordCount})`,
        );

        try {
          const result = await enhanceReservoirDraft(draft as Record<string, unknown>);
          if (result.success) {
            results.enhanced++;
            console.log(`[content-auto-fix] Enhanced ${draft.id}: score ${result.previousScore} → ${result.newScore}`);
          } else {
            results.enhanceFailed++;
            results.errors.push(`enhance:${draft.id}: ${result.error}`);
            console.warn(`[content-auto-fix] Enhance failed for ${draft.id}: ${result.error}`);
          }
        } catch (err) {
          results.enhanceFailed++;
          const msg = err instanceof Error ? err.message : String(err);
          results.errors.push(`enhance:${draft.id}: ${msg}`);
          console.warn(`[content-auto-fix] Enhance threw for ${draft.id}:`, msg);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`word-count-query: ${msg}`);
      console.warn("[content-auto-fix] Word count query failed:", msg);
    }
  }

  // ── 4. LOW QUALITY SCORE FIX ──────────────────────────────────────────────
  // Find reservoir drafts with quality_score below the gate threshold but adequate word count.
  // These articles are stuck: content-selector won't promote them and the
  // word count query above won't find them. Without this, they sit forever.
  const QUALITY_THRESHOLD = CONTENT_QUALITY.qualityGateScore;
  if (Date.now() - cronStart < BUDGET_MS - 25_000) {
    try {
      const lowScoreDrafts = await prisma.articleDraft.findMany({
        where: {
          site_id: { in: activeSiteIds },
          current_phase: "reservoir",
          quality_score: { lt: QUALITY_THRESHOLD },
          word_count: { gte: MIN_WORD_COUNT }, // adequate words — only score is low
          assembled_html: { not: null },
        },
        orderBy: { updated_at: "asc" },
        take: MAX_LOW_SCORE_ENHANCES,
      });

      if (lowScoreDrafts.length > 0) {
        const { enhanceReservoirDraft: enhanceLowScore } = await import("@/lib/content-pipeline/enhance-runner");

        for (const draft of lowScoreDrafts) {
          const budgetUsed = Date.now() - cronStart;
          if (budgetUsed > BUDGET_MS - 25_000) break;

          console.log(
            `[content-auto-fix] Enhancing low-score draft ${draft.id} (keyword: "${draft.keyword}", score: ${draft.quality_score})`,
          );

          try {
            const result = await enhanceLowScore(draft as Record<string, unknown>);
            if (result.success) {
              results.enhancedLowScore++;
              console.log(
                `[content-auto-fix] Low-score enhanced ${draft.id}: score ${result.previousScore} → ${result.newScore}`,
              );
            } else {
              results.enhanceFailed++;
              results.errors.push(`low-score:${draft.id}: ${result.error}`);
              console.warn(`[content-auto-fix] Low-score enhance failed for ${draft.id}: ${result.error}`);
            }
          } catch (err) {
            results.enhanceFailed++;
            const msg = err instanceof Error ? err.message : String(err);
            results.errors.push(`low-score:${draft.id}: ${msg}`);
            console.warn(`[content-auto-fix] Low-score enhance threw for ${draft.id}:`, msg);
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`low-score-query: ${msg}`);
      console.warn("[content-auto-fix] Low-score query failed:", msg);
    }
  }

  // NOTE: Sections 5, 5b, 6 (meta trims) moved to content-auto-fix-lite

  // ── 3. INTERNAL LINK INJECTION — articles missing internal links ──────────
  if (Date.now() - cronStart < BUDGET_MS - 5_000) {
    try {
      const postsNoLinks = await prisma.blogPost.findMany({
        where: {
          siteId: { in: activeSiteIds },
          published: true,
          deletedAt: null,
          content_en: { not: "" },
        },
        select: { id: true, content_en: true, siteId: true },
        take: 20,
        orderBy: { created_at: "desc" },
      });

      const { injectInternalLinks } = (await import("@/lib/auto-remediate/engine")) as {
        injectInternalLinks: (id: string, siteId: string) => Promise<{ success: boolean }>;
      };
      for (const post of postsNoLinks) {
        if (Date.now() - cronStart > BUDGET_MS - 3_000) break;
        const linkCount = ((post.content_en || "").match(/class="internal-link"|href="\/blog\//gi) || []).length;
        if (linkCount < 1 && (post.content_en || "").length > 2000) {
          const result = await injectInternalLinks(post.id, post.siteId);
          if (result.success) results.internalLinksInjected++;
          if (results.internalLinksInjected >= 5) break; // max 5 per run
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`internal-links: ${msg}`);
      console.warn("[content-auto-fix] Internal link injection failed:", msg);
    }
  }

  // ── 7. BROKEN INTERNAL LINK CLEANUP — fix ALL broken /blog/ links in published content ──
  // Catches both TOPIC_SLUG (uppercase) AND AI-hallucinated slugs (lowercase fake slugs
  // like "top-halal-restaurants-in-central-london" that point to non-existent articles).
  if (Date.now() - cronStart < BUDGET_MS - 5_000 && isEnhancementOwner("content-auto-fix", "broken_links")) {
    try {
      // Build a Set of all real published slugs for O(1) lookup
      const realPosts = await prisma.blogPost.findMany({
        where: { published: true, deletedAt: null },
        select: { slug: true, title_en: true },
        orderBy: { created_at: "desc" },
        take: 500,
      });
      const validSlugs = new Set<string>(realPosts.map((p) => p.slug));

      // Target articles that actually contain broken links (TOPIC_SLUG or hallucinated slugs)
      // instead of just scanning the 50 newest articles — old articles with placeholders
      // were never cleaned because they fell outside the take:50 window.
      const postsToCheck = await prisma.blogPost.findMany({
        where: {
          siteId: { in: activeSiteIds },
          published: true,
          deletedAt: null,
          content_en: { not: "" },
          OR: [
            { content_en: { contains: "TOPIC_SLUG" } },
            { content_en: { contains: "PLACEHOLDER" } },
            { content_ar: { contains: "TOPIC_SLUG" } },
            { content_ar: { contains: "PLACEHOLDER" } },
          ],
        },
        select: { id: true, content_en: true, content_ar: true, siteId: true, slug: true },
        take: 50,
      });

      // Helper: fix broken links in a content string
      const fixBrokenLinks = (content: string): string => {
        // Phase 1: Strip TOPIC_SLUG placeholders immediately (no fuzzy matching needed)
        let fixed = content.replace(
          /<a\s+[^>]*href="\/blog\/TOPIC_SLUG"[^>]*>(.*?)<\/a>/gi,
          (_match, anchor) => anchor,
        );
        // Phase 2: Fix remaining broken links (hallucinated slugs)
        fixed = fixed.replace(
          /<a\s+([^>]*?)href="\/blog\/([a-zA-Z0-9_-]+)"([^>]*?)>(.*?)<\/a>/gi,
          (fullMatch, pre, slug, post2, anchor) => {
            if (validSlugs.has(slug) || validSlugs.has(slug.toLowerCase())) return fullMatch;
            const topic = slug.toLowerCase().replace(/[-_]/g, " ");
            const topicWords = topic.split(" ").filter((w: string) => w.length > 3);
            const match = realPosts.find((p) => {
              const title = (p.title_en || "").toLowerCase();
              return topicWords.filter((w: string) => title.includes(w)).length >= 2;
            });
            if (match) return `<a ${pre}href="/blog/${match.slug}"${post2}>${anchor}</a>`;
            return anchor;
          },
        );
        return fixed;
      };

      let brokenLinksFixed = 0;
      const processPost = async (post: { id: string; content_en: string | null; content_ar: string | null }) => {
        const contentEn = post.content_en || "";
        const contentAr = post.content_ar || "";
        const fixedEn = fixBrokenLinks(contentEn);
        const fixedAr = fixBrokenLinks(contentAr);
        const enChanged = fixedEn !== contentEn;
        const arChanged = fixedAr !== contentAr;
        if (enChanged || arChanged) {
          const updateData: Record<string, string> = {};
          if (enChanged) updateData.content_en = fixedEn;
          if (arChanged) updateData.content_ar = fixedAr;
          await optimisticBlogPostUpdate(
            post.id,
            (current) => {
              const result: Record<string, unknown> = {};
              if (enChanged) result.content_en = fixBrokenLinks(current.content_en || "");
              if (arChanged) result.content_ar = fixBrokenLinks(current.content_ar || "");
              result.enhancement_log = buildEnhancementLogEntry(
                current.enhancement_log,
                "broken_links",
                "content-auto-fix",
                `Fixed broken internal links`,
              );
              return result;
            },
            { tag: "[content-auto-fix]" },
          );
          brokenLinksFixed++;
        }
      };

      // Pass 1: articles with explicit placeholders (TOPIC_SLUG, PLACEHOLDER)
      const checkedIds = new Set<string>();
      for (const post of postsToCheck) {
        if (Date.now() - cronStart > BUDGET_MS - 3_000 || brokenLinksFixed >= 30) break;
        checkedIds.add(post.id);
        await processPost(post);
      }

      // Pass 2: recent articles that may have hallucinated slugs (no placeholder text)
      if (Date.now() - cronStart < BUDGET_MS - 3_000 && brokenLinksFixed < 30) {
        const recentPosts = await prisma.blogPost.findMany({
          where: {
            siteId: { in: activeSiteIds },
            published: true,
            deletedAt: null,
            content_en: { not: "" },
            id: { notIn: Array.from(checkedIds) },
          },
          select: { id: true, content_en: true, content_ar: true, siteId: true, slug: true },
          take: 30,
          orderBy: { created_at: "desc" },
        });
        for (const post of recentPosts) {
          if (Date.now() - cronStart > BUDGET_MS - 3_000 || brokenLinksFixed >= 30) break;
          await processPost(post);
        }
      }
      if (brokenLinksFixed > 0) {
        console.log(`[content-auto-fix] Fixed broken internal links in ${brokenLinksFixed} articles`);
      }
      results.brokenLinksFixed = brokenLinksFixed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`broken-links: ${msg}`);
      console.warn("[content-auto-fix] Broken link cleanup failed:", msg);
    }
  }

  // ── 8. AFFILIATE LINK INJECTION — published articles missing affiliate links
  if (Date.now() - cronStart < BUDGET_MS - 5_000) {
    try {
      const postsNoAffiliates = await prisma.blogPost.findMany({
        where: {
          siteId: { in: activeSiteIds },
          published: true,
          deletedAt: null,
          content_en: { not: "" },
        },
        select: { id: true, content_en: true, siteId: true },
        take: 20,
        orderBy: { created_at: "desc" },
      });

      const affiliatePattern =
        /booking\.com|halalbooking|agoda|getyourguide|viator|klook|boatbookings|class="affiliate|anrdoezrs\.net|dpbolvw\.net|tkqlhce\.com|jdoqocy\.com|kqzyfj\.com|affiliate-recommendation|data-affiliate-id/i;
      const { injectAffiliateLinks } = (await import("@/lib/auto-remediate/engine")) as {
        injectAffiliateLinks: (id: string, siteId: string) => Promise<{ success: boolean }>;
      };

      for (const post of postsNoAffiliates) {
        if (Date.now() - cronStart > BUDGET_MS - 3_000) break;
        if (!affiliatePattern.test(post.content_en || "") && (post.content_en || "").length > 2000) {
          const result = await injectAffiliateLinks(post.id, post.siteId);
          if (result.success) results.affiliateLinksInjected++;
          if (results.affiliateLinksInjected >= 5) break; // max 5 per run
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`affiliate-links: ${msg}`);
      console.warn("[content-auto-fix] Affiliate link injection failed:", msg);
    }
  }

  // ── 9. DUPLICATE META DESCRIPTIONS — rewrite duplicates for uniqueness ─────
  if (Date.now() - cronStart < BUDGET_MS - 5_000) {
    try {
      const { fixDuplicateMetas } = await import("@/lib/auto-remediate/engine");
      for (const siteId of activeSiteIds) {
        if (Date.now() - cronStart > BUDGET_MS - 3_000) break;
        const fixes = await fixDuplicateMetas(siteId, 2);
        results.duplicateMetasFixed += fixes.filter((f) => f.success).length;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`duplicate-metas: ${msg}`);
      console.warn("[content-auto-fix] Duplicate meta fix failed:", msg);
    }
  }

  // ── 10. ARABIC META GENERATION — bilingual articles missing Arabic meta ────
  if (Date.now() - cronStart < BUDGET_MS - 10_000) {
    try {
      const postsMissingArMeta = await prisma.blogPost.findMany({
        where: {
          siteId: { in: activeSiteIds },
          published: true,
          deletedAt: null,
          content_ar: { not: "" },
          OR: [{ meta_title_ar: null }, { meta_description_ar: null }],
        },
        select: { id: true },
        take: 2,
      });

      if (postsMissingArMeta.length > 0) {
        const { generateArabicMeta } = (await import("@/lib/auto-remediate/engine")) as {
          generateArabicMeta: (id: string) => Promise<{ success: boolean }>;
        };
        for (const post of postsMissingArMeta) {
          if (Date.now() - cronStart > BUDGET_MS - 8_000) break;
          const result = await generateArabicMeta(post.id);
          if (result.success) results.arabicMetaGenerated++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`arabic-meta: ${msg}`);
      console.warn("[content-auto-fix] Arabic meta generation failed:", msg);
    }
  }

  // ── 11. ORPHAN PAGE RESOLUTION — inject links TO orphan articles ───────────
  // Finds published articles with NO inbound internal links, then edits
  // related articles to add a contextual link to the orphan. This solves
  // crawl isolation (19 orphans detected in audit).
  if (Date.now() - cronStart < BUDGET_MS - 5_000) {
    try {
      const allPosts = await prisma.blogPost.findMany({
        where: {
          siteId: { in: activeSiteIds },
          published: true,
          deletedAt: null,
          content_en: { not: "" },
        },
        select: { id: true, slug: true, title_en: true, content_en: true, siteId: true },
        orderBy: { created_at: "desc" },
        take: 100,
      });

      // Build inbound link map: slug → number of articles linking to it
      const inboundCount = new Map<string, number>();
      for (const p of allPosts) inboundCount.set(p.slug, 0);
      for (const p of allPosts) {
        const links = (p.content_en || "").match(/href="\/blog\/([a-zA-Z0-9_-]+)"/gi) || [];
        for (const link of links) {
          const m = link.match(/href="\/blog\/([a-zA-Z0-9_-]+)"/i);
          if (m && inboundCount.has(m[1])) {
            inboundCount.set(m[1], (inboundCount.get(m[1]) || 0) + 1);
          }
        }
      }

      // Find orphans (0 inbound links)
      const orphans = allPosts.filter((p) => (inboundCount.get(p.slug) || 0) === 0);
      let orphansFixed = 0;

      for (const orphan of orphans) {
        if (Date.now() - cronStart > BUDGET_MS - 3_000) break;
        if (orphansFixed >= 10) break; // Raised from 5 to clear 13-orphan backlog

        // Find top-3 host articles by title word overlap. Boosting from 1
        // host to 3 because Google weighs PageRank flow from multiple sources
        // — a single inbound link is barely a signal; 3+ inbound links from
        // topically-relevant articles is what moves indexing/ranking.
        const orphanWords = (orphan.title_en || "")
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3);
        if (orphanWords.length < 2) continue;

        const scoredCandidates: Array<{ post: (typeof allPosts)[0]; score: number }> = [];
        for (const candidate of allPosts) {
          if (candidate.id === orphan.id) continue;
          if (candidate.siteId !== orphan.siteId) continue;
          if ((candidate.content_en || "").includes(`/blog/${orphan.slug}`)) continue;
          // Skip candidates that already have a related section — accumulating
          // multiple "Related:" blocks from different injectors looks bad.
          if (
            (candidate.content_en || "").includes("related-articles") ||
            (candidate.content_en || "").includes("related-link")
          )
            continue;
          const candidateTitle = (candidate.title_en || "").toLowerCase();
          const score = orphanWords.filter((w) => candidateTitle.includes(w)).length;
          if (score >= 1) scoredCandidates.push({ post: candidate, score });
        }

        if (scoredCandidates.length === 0) continue;

        // Top-3 by score, descending. Tie-broken by created_at (already sorted
        // by createdAt desc in the parent findMany so the order is stable).
        scoredCandidates.sort((a, b) => b.score - a.score);
        const topHosts = scoredCandidates.slice(0, 3);

        let injectedForThisOrphan = 0;
        for (const { post: host } of topHosts) {
          if (Date.now() - cronStart > BUDGET_MS - 3_000) break;
          // Append a "Related reading" link at the end of the host article.
          const linkHtml = `\n<p class="related-link"><strong>Related:</strong> <a href="/blog/${orphan.slug}" class="internal-link">${orphan.title_en}</a></p>`;
          await optimisticBlogPostUpdate(
            host.id,
            (current) => ({
              content_en: (current.content_en || "") + linkHtml,
            }),
            { tag: "[content-auto-fix]" },
          );
          // Mark the host's in-memory copy so subsequent orphan iterations
          // skip it via the related-link guard above (avoids hitting the same
          // host twice in one run).
          host.content_en = (host.content_en || "") + linkHtml;
          injectedForThisOrphan++;
        }

        if (injectedForThisOrphan > 0) {
          orphansFixed++;
          console.log(
            `[content-auto-fix] Fixed orphan: "${orphan.slug}" — gained ${injectedForThisOrphan} inbound link(s) from ${topHosts
              .slice(0, injectedForThisOrphan)
              .map((h) => h.post.slug)
              .join(", ")}`,
          );
        }
      }
      results.orphansFixed = orphansFixed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`orphan-resolution: ${msg}`);
      console.warn("[content-auto-fix] Orphan page resolution failed:", msg);
    }
  }

  // ── 11B. RECOVER AUTO-UNPUBLISHED ARTICLES — re-publish articles wrongly unpublished by old thin-content logic ──
  // The old Section 12 used to unpublish articles with < 500 words. This was destructive:
  // it removed indexed pages from Google, lost SEO equity, and caused "false positive" removals.
  // This recovery section finds articles with [AUTO-UNPUBLISHED:] in their meta description
  // and re-publishes them so they can be expanded by seo-deep-review instead.
  if (Date.now() - cronStart < BUDGET_MS - 3_000) {
    try {
      const autoUnpublished = await prisma.blogPost.findMany({
        where: {
          siteId: { in: activeSiteIds },
          published: false,
          deletedAt: null,
          meta_description_en: { startsWith: "[AUTO-UNPUBLISHED:" },
        },
        select: { id: true, slug: true, meta_description_en: true, title_en: true },
        take: 20,
      });

      let recovered = 0;
      for (const post of autoUnpublished) {
        // Restore original meta description (strip the [AUTO-UNPUBLISHED:...] prefix)
        const originalMeta = (post.meta_description_en || "").replace(/^\[AUTO-UNPUBLISHED:[^\]]*\]\s*/, "").trim();
        await optimisticBlogPostUpdate(
          post.id,
          () => ({
            published: true,
            meta_description_en: originalMeta || post.title_en || "",
          }),
          { tag: "[content-auto-fix]" },
        );
        recovered++;
        console.log(`[content-auto-fix] Re-published auto-unpublished article: "${post.slug}"`);
      }
      if (recovered > 0) {
        console.log(`[content-auto-fix] Recovered ${recovered} wrongly auto-unpublished articles`);
      }
      (results as Record<string, unknown>).articlesRecovered = recovered;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`recover-unpublished: ${msg}`);
      console.warn("[content-auto-fix] Recovery of auto-unpublished articles failed:", msg);
    }
  }

  // ── 12. THIN CONTENT HANDLING — noindex ultra-thin, flag moderate-thin for expansion ──
  // Strategy: Articles below thinContentThreshold (300w for blog) are ACTIVELY HARMFUL to SEO.
  // Google's Helpful Content system demotes entire sites for thin pages.
  // - Ultra-thin (< thinContentThreshold): unpublish — zero SEO equity to protect
  // - Moderate-thin (< minWords but >= thinContentThreshold): flag for seo-deep-review expansion
  // Also catches: bad slugs (empty/"-"), "EXPAND:" prefix titles that leaked through pipeline
  if (Date.now() - cronStart < BUDGET_MS - 3_000) {
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      // Fetch ALL published articles — scan entire catalog for thin content.
      // Previous take:200 + orderBy:asc missed newer thin articles beyond position 200.
      // With ~109 published articles, take:500 covers the full catalog.
      const allPublished = await prisma.blogPost.findMany({
        where: {
          siteId: { in: activeSiteIds },
          published: true,
          deletedAt: null,
          created_at: { lt: twoHoursAgo },
        },
        select: { id: true, slug: true, content_en: true, content_ar: true, title_en: true, title_ar: true },
        orderBy: { created_at: "desc" }, // newest first — most likely to have issues
        take: 500,
      });

      let thinCount = 0;
      let ultraThinUnpublished = 0;
      let badSlugUnpublished = 0;
      const thinThreshold = CONTENT_QUALITY.thinContentThreshold || 300;

      for (const post of allPublished) {
        if (Date.now() - cronStart > BUDGET_MS - 5_000) break;

        // ── Bad slug / "EXPAND:" prefix check ──
        const hasBadSlug = !post.slug || post.slug === "-" || post.slug === "";
        const hasExpandPrefix = /^EXPAND:\s/i.test(post.title_en || "") || /^EXPAND:\s/i.test(post.title_ar || "");
        if (hasBadSlug || hasExpandPrefix) {
          try {
            const reason = hasBadSlug
              ? `BAD_SLUG: "${post.slug}"`
              : `EXPAND_PREFIX: "${(post.title_en || "").slice(0, 60)}"`;
            await optimisticBlogPostUpdate(
              post.id,
              () => ({
                published: false,
                meta_description_en: `[UNPUBLISHED: ${reason}] ${(post.slug || "").slice(0, 80)}`,
              }),
              { tag: "[content-auto-fix]" },
            );
            badSlugUnpublished++;
            console.log(`[content-auto-fix] Unpublished bad article: ${reason}`);
          } catch (upErr) {
            console.warn(
              `[content-auto-fix] Failed to unpublish bad article "${post.slug}":`,
              upErr instanceof Error ? upErr.message : upErr,
            );
          }
          continue;
        }

        // ── Word count check — use whichever language has content ──
        const enText = (post.content_en || "")
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const arText = (post.content_ar || "")
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const enWords = enText.split(" ").filter(Boolean).length;
        const arWords = arText.split(" ").filter(Boolean).length;
        const wordCount = Math.max(enWords, arWords); // Use the longer version

        if (wordCount < thinThreshold) {
          // Ultra-thin: unpublish — actively harmful, zero SEO equity
          try {
            await optimisticBlogPostUpdate(
              post.id,
              () => ({
                published: false,
                meta_description_en: `[UNPUBLISHED-THIN: ${wordCount}w < ${thinThreshold}w threshold] ${(post.slug || "").slice(0, 80)}`,
              }),
              { tag: "[content-auto-fix]" },
            );
            ultraThinUnpublished++;
            console.log(
              `[content-auto-fix] Unpublished ultra-thin article: "${post.slug}" (${wordCount}w < ${thinThreshold}w threshold)`,
            );
          } catch (upErr) {
            console.warn(
              `[content-auto-fix] Failed to unpublish thin "${post.slug}":`,
              upErr instanceof Error ? upErr.message : upErr,
            );
          }
        } else if (wordCount < CONTENT_QUALITY.minWords) {
          thinCount++;
          console.log(
            `[content-auto-fix] Moderate-thin article flagged for expansion: "${post.slug}" (${wordCount}w) — will be expanded by seo-deep-review`,
          );
        }
      }
      results.thinUnpublished = ultraThinUnpublished;
      results.badSlugUnpublished = badSlugUnpublished;
      if (thinCount > 0) {
        console.log(`[content-auto-fix] ${thinCount} moderate-thin articles flagged for seo-deep-review expansion`);
      }
      if (ultraThinUnpublished > 0) {
        console.log(`[content-auto-fix] ${ultraThinUnpublished} ultra-thin articles unpublished (<${thinThreshold}w)`);
      }
      if (badSlugUnpublished > 0) {
        console.log(`[content-auto-fix] ${badSlugUnpublished} bad-slug/EXPAND-prefix articles unpublished`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`thin-content-flag: ${msg}`);
      console.warn("[content-auto-fix] Thin content handling failed:", msg);
    }
  }

  // ── 12. DUPLICATE CONTENT DETECTION — unpublish the worse duplicate ──
  // Compares title similarity between all published articles per site.
  // If two articles have > 80% word overlap in title, the one with fewer words
  // (or lower SEO score as tiebreaker) is unpublished. Keeping both causes
  // keyword cannibalization — Google splits authority between them, neither ranks.
  if (Date.now() - cronStart < BUDGET_MS - 3_000) {
    try {
      let duplicatesUnpublished = 0;
      const alreadyUnpublished = new Set<string>();
      for (const siteId of activeSiteIds) {
        if (Date.now() - cronStart > BUDGET_MS - 2_000) break;
        const sitePosts = await prisma.blogPost.findMany({
          where: {
            siteId,
            published: true,
            deletedAt: null,
          },
          select: {
            id: true,
            slug: true,
            title_en: true,
            created_at: true,
            meta_description_en: true,
            content_en: true,
            seo_score: true,
          },
          orderBy: { created_at: "asc" },
          take: 100,
        });

        // Compare each pair for title similarity using word overlap (Jaccard)
        for (let i = 0; i < sitePosts.length; i++) {
          if (alreadyUnpublished.has(sitePosts[i].id)) continue;
          for (let j = i + 1; j < sitePosts.length; j++) {
            if (alreadyUnpublished.has(sitePosts[j].id)) continue;
            const wordsA = new Set(
              (sitePosts[i].title_en || "")
                .toLowerCase()
                .split(/\s+/)
                .filter((w) => w.length > 2),
            );
            const wordsB = new Set(
              (sitePosts[j].title_en || "")
                .toLowerCase()
                .split(/\s+/)
                .filter((w) => w.length > 2),
            );
            if (wordsA.size < 3 || wordsB.size < 3) continue;
            let intersection = 0;
            for (const w of wordsA) {
              if (wordsB.has(w)) intersection++;
            }
            const union = new Set([...wordsA, ...wordsB]).size;
            const jaccard = union > 0 ? intersection / union : 0;

            if (jaccard > 0.8) {
              // Pick the worse version: fewer words, or lower SEO score as tiebreaker
              const wcA = (sitePosts[i].content_en || "").split(/\s+/).length;
              const wcB = (sitePosts[j].content_en || "").split(/\s+/).length;
              const scoreA = sitePosts[i].seo_score ?? 0;
              const scoreB = sitePosts[j].seo_score ?? 0;
              // Worse = fewer words; if equal, lower SEO score; if still equal, newer article
              const worseIdx = wcA < wcB ? i : wcB < wcA ? j : scoreA < scoreB ? i : j;
              const betterIdx = worseIdx === i ? j : i;
              const worse = sitePosts[worseIdx];
              const better = sitePosts[betterIdx];

              await optimisticBlogPostUpdate(
                worse.id,
                () => ({
                  published: false,
                  meta_description_en: `[DUPLICATE-UNPUBLISHED: kept "${better.slug}"] ${(worse.meta_description_en || "").replace(/\[DUPLICATE[^\]]*\]\s*/, "").slice(0, 100)}`,
                }),
                { tag: "[content-auto-fix]" },
              );
              alreadyUnpublished.add(worse.id);
              duplicatesUnpublished++;
              console.log(
                `[content-auto-fix] Unpublished duplicate: "${worse.slug}" (${wcA}w/${scoreA}s) — kept "${better.slug}" (${wcB}w/${scoreB}s) (jaccard=${jaccard.toFixed(2)})`,
              );
              if (duplicatesUnpublished >= 5) break;
            }
          }
          if (duplicatesUnpublished >= 5) break;
        }
      }
      results.duplicatesUnpublished = duplicatesUnpublished;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`duplicate-content: ${msg}`);
      console.warn("[content-auto-fix] Duplicate content detection failed:", msg);
    }
  }

  // ── 14. CHRONIC INDEXING FAILURES — fix & resubmit pages Google won't index ──
  // Pages submitted 5+ times without indexing likely have content quality issues.
  // Lowered from 10 to 5 to catch problems earlier (report showed 5-14 attempt pages).
  // Now actively fixes: thin meta descriptions, missing meta, and resets submission
  // attempts to trigger resubmission via IndexNow on next seo-agent run.
  let chronicIndexingFixed = 0;
  if (Date.now() - cronStart < BUDGET_MS - 8_000) {
    try {
      const chronicPages = await prisma.uRLIndexingStatus.findMany({
        where: {
          site_id: { in: activeSiteIds },
          status: { in: ["submitted", "discovered", "pending_review", "error"] },
          submission_attempts: { gte: 5 },
        },
        select: { url: true, site_id: true, submission_attempts: true, id: true },
        take: 20,
      });

      for (const page of chronicPages) {
        if (Date.now() - cronStart > BUDGET_MS - 5_000) break;
        // Extract slug from URL
        const slugMatch = page.url.match(/\/blog\/([^\/]+)$/);
        if (!slugMatch) continue;
        const slug = slugMatch[1];

        // Find the BlogPost and check content quality
        const post = await prisma.blogPost.findFirst({
          where: { slug, siteId: page.site_id },
          select: {
            id: true,
            content_en: true,
            title_en: true,
            meta_title_en: true,
            meta_description_en: true,
            seo_score: true,
            tags: true,
          },
        });
        if (!post) continue;

        const contentText = (post.content_en || "").replace(/<[^>]+>/g, " ").trim();
        const wordCount = contentText.split(/\s+/).filter(Boolean).length;

        const issues: string[] = [];
        const updateData: Record<string, unknown> = {};

        // Fix 1: Thin content → flag (will be caught by Section 12 too, but be explicit)
        if (wordCount < CONTENT_QUALITY.minWords) {
          issues.push(`thin (${wordCount}w)`);
        }

        // Fix 2: Missing or short meta description → auto-generate from content
        const metaDesc = post.meta_description_en || "";
        if (metaDesc.length < 120 || metaDesc.startsWith("[AUTO-")) {
          const firstParagraph = contentText.split(/[.!?]/).slice(0, 2).join(". ").trim();
          if (firstParagraph.length >= 60) {
            const trimmedMeta =
              firstParagraph.length > 155 ? firstParagraph.slice(0, 152) + "..." : firstParagraph + ".";
            updateData.meta_description_en = trimmedMeta;
            issues.push("fixed meta desc");
          } else {
            issues.push("weak meta desc (too short to auto-fix)");
          }
        }

        // Fix 3: Missing meta title → generate from title
        if (!post.meta_title_en || post.meta_title_en.length < 20) {
          const title = post.title_en || "";
          if (title.length >= 20 && title.length <= 60) {
            updateData.meta_title_en = title;
            issues.push("fixed meta title");
          } else if (title.length > 60) {
            updateData.meta_title_en = title.slice(0, 57) + "...";
            issues.push("fixed meta title (trimmed)");
          }
        }

        // Tag for review and apply fixes
        const currentTags = (post.tags || []) as string[];
        if (!currentTags.includes("needs-indexing-review")) {
          updateData.tags = [...currentTags, "needs-indexing-review"];
        }

        if (Object.keys(updateData).length > 0) {
          updateData.updated_at = new Date();
          await optimisticBlogPostUpdate(post.id, () => updateData, { tag: "[content-auto-fix]" });
        }

        // Reset submission attempts so IndexNow resubmits with improved content
        // Only reset if we actually fixed something (meta desc or meta title)
        if (issues.some((i) => i.startsWith("fixed"))) {
          await prisma.uRLIndexingStatus.update({
            where: { id: page.id },
            data: {
              submission_attempts: 0,
              status: "discovered",
              last_error: `[content-auto-fix] Reset after fixes: ${issues.join(", ")}`,
            },
          });
        }

        chronicIndexingFixed++;
        console.log(
          `[content-auto-fix] Chronic indexing fix: ${slug} (${page.submission_attempts} attempts, ${issues.join(", ") || "no fixable issues"})`,
        );
      }
      if (chronicIndexingFixed > 0) {
        console.log(`[content-auto-fix] Fixed ${chronicIndexingFixed} chronic indexing failures`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`chronic-indexing: ${msg}`);
      console.warn("[content-auto-fix] Chronic indexing fix failed:", msg);
    }
  }

  // ── 15. WORD COUNT ARTIFACT CLEANUP — strip "(248 words)" from published content ──
  // AI models echo word counts from prompt instructions into article body text.
  // Visible to readers as "(248 words)", "(212 words)" etc.
  let wordCountArtifactsCleaned = 0;
  if (Date.now() - cronStart < BUDGET_MS - 5_000) {
    try {
      const { sanitizeContentBody } = await import("@/lib/content-pipeline/title-sanitizer");
      // Find published posts containing word count patterns
      const postsWithArtifacts = await prisma.blogPost.findMany({
        where: {
          published: true,
          deletedAt: null,
          siteId: { in: activeSiteIds },
          OR: [{ content_en: { contains: " words)" } }, { content_ar: { contains: " words)" } }],
        },
        select: { id: true, content_en: true, content_ar: true, slug: true },
        take: 50,
      });

      for (const post of postsWithArtifacts) {
        if (Date.now() - cronStart > BUDGET_MS - 3_000) break;
        const cleanEn = sanitizeContentBody(post.content_en || "");
        const cleanAr = sanitizeContentBody(post.content_ar || "");
        // Only update if content actually changed
        if (cleanEn !== post.content_en || cleanAr !== post.content_ar) {
          await optimisticBlogPostUpdate(
            post.id,
            (current) => ({
              ...(cleanEn !== post.content_en ? { content_en: sanitizeContentBody(current.content_en || "") } : {}),
              ...(cleanAr !== post.content_ar ? { content_ar: sanitizeContentBody(current.content_ar || "") } : {}),
            }),
            { tag: "[content-auto-fix]" },
          );
          wordCountArtifactsCleaned++;
          console.log(`[content-auto-fix] Stripped word count artifacts from: ${post.slug}`);
        }
      }
      if (wordCountArtifactsCleaned > 0) {
        console.log(`[content-auto-fix] Cleaned word count artifacts from ${wordCountArtifactsCleaned} articles`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`word-count-cleanup: ${msg}`);
      console.warn("[content-auto-fix] Word count cleanup failed:", msg);
    }
  }

  // ── 16. ARABIC CONTENT BACKFILL — translate EN→AR for articles published with English fallback ──
  // When an AR draft wasn't ready, select-runner copies content_en into content_ar as a placeholder.
  // This section detects those articles (content_ar === content_en) and generates real Arabic via AI.
  // Budget: ~25-40s per article (AI translation). Max 2 per run to stay within budget.
  if (Date.now() - cronStart < BUDGET_MS - 30_000) {
    try {
      // Find articles where content_ar is exactly the same as content_en (English fallback)
      // Use raw query since Prisma doesn't support column-to-column comparison
      const dupeContentPosts: Array<{ id: string; title_en: string; slug: string; content_en: string }> =
        await prisma.$queryRawUnsafe(
          `SELECT id, title_en, slug, LEFT(content_en, 6000) as content_en
         FROM "BlogPost"
         WHERE published = true
           AND "deletedAt" IS NULL
           AND "siteId" = ANY($1)
           AND content_en != ''
           AND content_ar = content_en
         ORDER BY created_at DESC
         LIMIT 5`,
          activeSiteIds,
        );

      if (dupeContentPosts.length > 0) {
        console.log(
          `[content-auto-fix] Found ${dupeContentPosts.length} articles with English-in-Arabic fallback — backfilling`,
        );
        const { generateCompletion } = await import("@/lib/ai/provider");
        const { SITES, getDefaultSiteId } = await import("@/config/sites");
        let backfilled = 0;

        for (const post of dupeContentPosts) {
          if (Date.now() - cronStart > BUDGET_MS - 25_000) break;
          if (backfilled >= 2) break; // Max 2 per run

          try {
            // Truncate content to avoid huge prompts
            const enContent = (post.content_en || "").substring(0, 5000);
            const siteId = getDefaultSiteId();
            const site = SITES[siteId];

            const messages = [
              {
                role: "system" as const,
                content:
                  site?.systemPromptEN ||
                  "You are a professional Arabic translator specializing in luxury travel content.",
              },
              {
                role: "user" as const,
                content: `Translate this English travel article into Arabic. Maintain the HTML structure, headings (h2, h3), paragraph tags, and links. Write naturally in Modern Standard Arabic (فصحى). Add dir="rtl" lang="ar" to the wrapping element. Keep all href URLs unchanged. Do NOT translate brand names, hotel names, or restaurant names.\n\nTitle: ${post.title_en}\n\nContent:\n${enContent}`,
              },
            ];

            const arResult = await generateCompletion(messages, {
              maxTokens: 3500, // Arabic is ~2.5x more token-dense
              taskType: "arabic-backfill",
              calledFrom: "content-auto-fix-s16",
              phaseBudgetHint: "heavy",
              timeoutMs: 40_000,
            });

            if (arResult.content && arResult.content.length > 200) {
              // Wrap in RTL article tag if not already present
              let arHtml = arResult.content;
              if (!arHtml.includes('dir="rtl"') && !arHtml.includes("dir='rtl'")) {
                arHtml = `<article dir="rtl" lang="ar">${arHtml}</article>`;
              }

              await prisma.blogPost.update({
                where: { id: post.id },
                data: { content_ar: arHtml },
              });
              results.arabicContentBackfilled++;
              backfilled++;
              console.log(`[content-auto-fix] Backfilled Arabic content for: ${post.slug} (${arHtml.length} chars)`);
            }
          } catch (postErr) {
            const msg = postErr instanceof Error ? postErr.message : String(postErr);
            console.warn(`[content-auto-fix] Arabic backfill failed for ${post.slug}:`, msg);
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`arabic-backfill: ${msg}`);
      console.warn("[content-auto-fix] Arabic content backfill failed:", msg);
    }
  }

  // ── 16b. ARABIC TITLE + META BACKFILL ──────────────────────────────────────
  // The May 15 iPhone screenshot showed the Arabic homepage rendering article
  // titles in ENGLISH ("Novikov Michelin Guide: Luxury Dining in Mayfair London")
  // because title_ar fell back to title_en when the article was force-published
  // without an AR draft pair.
  //
  // Section 16 above only translates content_ar (heavy, max 2/run). This
  // section is LIGHT — a 1-call structured-JSON request that fills title_ar,
  // meta_title_ar, meta_description_ar in one shot. Up to 12 articles/run.
  // No content_ar work here — Section 16 owns body translation.
  if (Date.now() - cronStart < BUDGET_MS - 15_000) {
    try {
      // Find articles where title_ar is missing, English-contaminated, or has
      // bracket-placeholder leaks (May 17 re-audit found "high hotel prices with
      // [x]..." on the AR hero card; "Best Halal Afternoon Tea London V2: Ultimate"
      // also English in title_ar field). PostgreSQL `~` is POSIX regex match.
      // ؀-ۿ is the Arabic Unicode block.
      const dupeTitlePosts: Array<{
        id: string;
        slug: string;
        title_en: string;
        title_ar: string;
        meta_title_ar: string | null;
        meta_description_ar: string | null;
      }> = await prisma.$queryRawUnsafe(
        `SELECT id, slug, title_en, title_ar, meta_title_ar, meta_description_ar
           FROM "BlogPost"
          WHERE published = true
            AND "deletedAt" IS NULL
            AND "siteId" = ANY($1)
            AND title_en != ''
            AND (
                  title_ar = '' OR title_ar IS NULL
                  OR title_ar = title_en
                  -- Bracket placeholder leak in title_ar (e.g. "[x]", "[TBD]")
                  OR title_ar ~ '\\[(x|X|TBD|TODO|placeholder|insert)'
                  -- No Arabic script characters at all = Latin contamination
                  OR title_ar !~ '[\\u0600-\\u06FF]'
                )
          ORDER BY created_at DESC
          LIMIT 12`,
        activeSiteIds,
      );

      if (dupeTitlePosts.length > 0) {
        console.log(`[content-auto-fix] Section 16b: ${dupeTitlePosts.length} articles need Arabic title translation`);
        const { generateCompletion } = await import("@/lib/ai/provider");
        let titlesFilled = 0;

        for (const post of dupeTitlePosts) {
          if (Date.now() - cronStart > BUDGET_MS - 10_000) break;
          if (titlesFilled >= 12) break;

          try {
            const messages = [
              {
                role: "system" as const,
                content:
                  "You translate luxury travel article titles from English to Modern Standard Arabic (الفصحى). You return ONLY a minified JSON object with the requested keys — no prose, no markdown fences, no explanation.",
              },
              {
                role: "user" as const,
                content: `Translate this article's English title + meta into natural Arabic for a Gulf luxury travel audience. Keep brand/restaurant/hotel names in their original form (do NOT translate "Novikov", "Mayfair", "Harrods", etc.). Keep numbers and prices as digits.

English title: ${post.title_en}

Return ONLY this JSON shape (no other text):
{"title_ar":"...","meta_title_ar":"...","meta_description_ar":"..."}

Constraints:
- title_ar: under 60 chars
- meta_title_ar: under 60 chars (can mirror title_ar)
- meta_description_ar: 120–160 chars, compelling, includes the destination`,
              },
            ];

            const result = await generateCompletion(messages, {
              maxTokens: 600,
              taskType: "arabic-title-backfill",
              calledFrom: "content-auto-fix-s16b",
              phaseBudgetHint: "light",
              timeoutMs: 12_000,
            });

            const raw = (result.content || "").trim();
            if (!raw) continue;

            // Strip possible code fences and find the first {...} block
            const cleaned = raw
              .replace(/^```(?:json)?\s*/i, "")
              .replace(/```\s*$/i, "")
              .trim();
            const match = cleaned.match(/\{[\s\S]*\}/);
            if (!match) {
              console.warn(`[content-auto-fix:s16b] no JSON found in response for ${post.slug}`);
              continue;
            }

            let parsed: { title_ar?: string; meta_title_ar?: string; meta_description_ar?: string };
            try {
              parsed = JSON.parse(match[0]);
            } catch (jsonErr) {
              console.warn(
                `[content-auto-fix:s16b] JSON parse failed for ${post.slug}:`,
                jsonErr instanceof Error ? jsonErr.message : jsonErr,
              );
              continue;
            }

            const newTitleAr = (parsed.title_ar || "").trim();
            const newMetaTitleAr = (parsed.meta_title_ar || newTitleAr).trim();
            const newMetaDescAr = (parsed.meta_description_ar || "").trim();

            // Defensive: don't write empty / suspiciously short Arabic
            if (newTitleAr.length < 4) continue;
            // Sanity: Arabic should contain Arabic-range characters
            if (!/[؀-ۿ]/.test(newTitleAr)) {
              console.warn(`[content-auto-fix:s16b] response not Arabic for ${post.slug}, skipping`);
              continue;
            }

            const updates: Record<string, string> = { title_ar: newTitleAr };
            if (newMetaTitleAr.length >= 4 && /[؀-ۿ]/.test(newMetaTitleAr)) {
              updates.meta_title_ar = newMetaTitleAr.slice(0, 60);
            }
            if (newMetaDescAr.length >= 40 && /[؀-ۿ]/.test(newMetaDescAr)) {
              updates.meta_description_ar = newMetaDescAr.slice(0, 160);
            }

            await prisma.blogPost.update({
              where: { id: post.id },
              data: updates,
            });
            titlesFilled++;
            console.log(
              `[content-auto-fix:s16b] ${post.slug} → title_ar="${newTitleAr.slice(0, 40)}..." (${Object.keys(updates).length} fields)`,
            );
          } catch (postErr) {
            const msg = postErr instanceof Error ? postErr.message : String(postErr);
            console.warn(`[content-auto-fix:s16b] failed for ${post.slug}:`, msg);
          }
        }

        if (titlesFilled > 0) {
          (results as Record<string, unknown>).arabicTitlesBackfilled = titlesFilled;
          console.log(`[content-auto-fix:s16b] Backfilled Arabic title+meta for ${titlesFilled} articles`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`arabic-title-backfill: ${msg}`);
      console.warn("[content-auto-fix:s16b] Section 16b failed:", msg);
    }
  }

  // ── 17. DEAD AFFILIATE LINK REMOVAL ─────────────────────────────────────────
  // HTTP HEAD check on affiliate links in published articles. Strip links returning 404/403/410.
  if (Date.now() - cronStart < BUDGET_MS - 15_000) {
    try {
      const postsWithAffiliates = await prisma.blogPost.findMany({
        where: {
          published: true,
          siteId: { in: activeSiteIds },
          OR: [
            { content_en: { contains: 'rel="sponsored"' } },
            { content_en: { contains: "affiliate-recommendation" } },
            { content_en: { contains: 'rel="noopener sponsored"' } },
          ],
        },
        select: { id: true, content_en: true, slug: true, updated_at: true },
        take: 20,
        orderBy: { created_at: "desc" },
      });

      for (const post of postsWithAffiliates) {
        if (Date.now() - cronStart > BUDGET_MS - 8_000) break;
        if (results.deadAffiliateLinksRemoved >= 10) break;

        let content = post.content_en || "";
        let modified = false;

        // Extract all affiliate link hrefs
        const affiliateLinkRegex =
          /<a\s[^>]*(?:rel="[^"]*sponsored[^"]*"|class="[^"]*affiliate[^"]*")[^>]*href="([^"]+)"[^>]*>[\s\S]*?<\/a>/gi;
        const linksToCheck: Array<{ fullMatch: string; url: string }> = [];
        let linkMatch: RegExpExecArray | null;
        while ((linkMatch = affiliateLinkRegex.exec(content)) !== null) {
          const href = linkMatch[1];
          // Only check external URLs (skip our own /api/affiliate/click — those are tracked redirects)
          if (
            href &&
            !href.startsWith("/api/affiliate/click") &&
            (href.startsWith("http://") || href.startsWith("https://"))
          ) {
            linksToCheck.push({ fullMatch: linkMatch[0], url: href });
          }
        }

        for (const link of linksToCheck.slice(0, 3)) {
          // Max 3 checks per article
          if (Date.now() - cronStart > BUDGET_MS - 8_000) break;
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(link.url, {
              method: "HEAD",
              redirect: "follow",
              signal: controller.signal,
              headers: { "User-Agent": "YallaLondon-LinkChecker/1.0" },
            });
            clearTimeout(timeout);

            if (res.status === 404 || res.status === 410 || res.status === 403) {
              // Dead link — remove the entire affiliate block containing it
              content = content.replace(link.fullMatch, "<!-- affiliate link removed: dead -->");
              modified = true;
              results.deadAffiliateLinksRemoved++;
              console.log(
                `[content-auto-fix] Removed dead affiliate link (${res.status}) in /${post.slug}: ${link.url.substring(0, 80)}`,
              );
            }
          } catch {
            // Timeout or network error — don't remove, might be transient
          }
        }

        if (modified) {
          // Also remove empty affiliate-recommendation divs left behind
          content = content.replace(
            /<div class="affiliate-recommendation"[^>]*>\s*<!-- affiliate link removed: dead -->\s*<\/div>/gi,
            "",
          );
          const { optimisticBlogPostUpdate } = await import("@/lib/db/optimistic-update");
          await optimisticBlogPostUpdate(post.id, () => ({ content_en: content }), { tag: "[content-auto-fix]" }).catch(
            (err) =>
              console.warn(
                "[content-auto-fix] Dead link update failed:",
                err instanceof Error ? err.message : String(err),
              ),
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`dead-affiliate-links: ${msg}`);
      console.warn("[content-auto-fix] Dead affiliate link removal failed:", msg);
    }
  }

  // ── 18. STALE AFFILIATE LINK REMOVAL ──────────────────────────────────────────
  // Detect affiliate links near past-year dates or expired event references. Strip them.
  if (Date.now() - cronStart < BUDGET_MS - 5_000) {
    try {
      const currentYear = new Date().getFullYear();
      const stalePatterns = [
        new RegExp(
          `\\b20(?:${Array.from({ length: currentYear - 2020 }, (_, i) => String(20 + i).padStart(2, "0")).join("|")})\\b`,
        ), // 2020-2025 (past years)
        /\bexpired?\b/i,
        /\bclosed\b/i,
        /\bsold\s+out\b/i,
        /\bno\s+longer\s+available\b/i,
      ];

      const postsForStale = await prisma.blogPost.findMany({
        where: {
          published: true,
          siteId: { in: activeSiteIds },
          OR: [
            { content_en: { contains: 'rel="sponsored"' } },
            { content_en: { contains: "affiliate-recommendation" } },
          ],
        },
        select: { id: true, content_en: true, slug: true },
        take: 20,
        orderBy: { created_at: "asc" }, // Oldest first — most likely to have stale content
      });

      for (const post of postsForStale) {
        if (Date.now() - cronStart > BUDGET_MS - 3_000) break;
        if (results.staleAffiliateLinksRemoved >= 10) break;

        let content = post.content_en || "";
        let modified = false;

        // Find affiliate blocks and check their surrounding text for stale signals
        const blockRegex = /<div class="affiliate-recommendation"[^>]*>[\s\S]*?<\/div>/gi;
        let blockMatch: RegExpExecArray | null;
        const blocksToRemove: string[] = [];

        while ((blockMatch = blockRegex.exec(content)) !== null) {
          const blockStart = Math.max(0, blockMatch.index - 500);
          const blockEnd = Math.min(content.length, blockMatch.index + blockMatch[0].length + 200);
          const surroundingText = content.substring(blockStart, blockEnd).replace(/<[^>]+>/g, " ");

          for (const pattern of stalePatterns) {
            if (pattern.test(surroundingText)) {
              blocksToRemove.push(blockMatch[0]);
              break;
            }
          }
        }

        for (const block of blocksToRemove) {
          content = content.replace(block, "<!-- affiliate block removed: stale content -->");
          modified = true;
          results.staleAffiliateLinksRemoved++;
          console.log(`[content-auto-fix] Removed stale affiliate block in /${post.slug}`);
        }

        if (modified) {
          const { optimisticBlogPostUpdate } = await import("@/lib/db/optimistic-update");
          await optimisticBlogPostUpdate(post.id, () => ({ content_en: content }), { tag: "[content-auto-fix]" }).catch(
            (err) =>
              console.warn(
                "[content-auto-fix] Stale link update failed:",
                err instanceof Error ? err.message : String(err),
              ),
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`stale-affiliate-links: ${msg}`);
      console.warn("[content-auto-fix] Stale affiliate link removal failed:", msg);
    }
  }

  // ── 19. UNTRACKED AFFILIATE LINK WRAPPING ────────────────────────────────────
  // Find affiliate links that go directly to partner URLs (bypass /api/affiliate/click).
  // Wrap them through our click tracker for revenue attribution + GA4 events.
  // Covers ALL known partner domains including CJ deep links and Travelpayouts.
  if (Date.now() - cronStart < BUDGET_MS - 5_000) {
    try {
      // Known affiliate partner domains — includes CJ deep link domains and Travelpayouts
      const AFFILIATE_PARTNER_DOMAINS = [
        "booking.com",
        "agoda.com",
        "expedia.com",
        "hotels.com",
        "getyourguide.com",
        "viator.com",
        "klook.com",
        "halalbooking.com",
        "tripadvisor.com",
        "tripadvisor.co.uk",
        "thefork.co.uk",
        "thefork.com",
        "thefork.fr",
        "opentable.co.uk",
        "opentable.com",
        "welcomepickups.com",
        "tiqets.com",
        "ticketnetwork.com",
        "blacklane.com",
        "stubhub.co.uk",
        "stubhub.com",
        "boatbookings.com",
        "clickandboat.com",
        "harrods.com",
        "selfridges.com",
        "allianztravelinsurance.com",
        // CJ deep link domains
        "anrdoezrs.net",
        "dpbolvw.net",
        "jdoqocy.com",
        "kqzyfj.com",
        "tkqlhce.com",
        // Travelpayouts
        "tp.media",
        "tp-em.com",
        // Vrbo / VRBO
        "vrbo.com",
      ];

      // Build OR conditions: articles with rel="sponsored" OR any known partner domain
      const partnerDomainConditions = AFFILIATE_PARTNER_DOMAINS.map((domain) => ({
        content_en: { contains: domain },
      }));

      const postsForTracking = await prisma.blogPost.findMany({
        where: {
          published: true,
          siteId: { in: activeSiteIds },
          OR: [
            { content_en: { contains: 'rel="sponsored"' } },
            { content_en: { contains: "affiliate-recommendation" } },
            { content_en: { contains: 'rel="noopener sponsored"' } },
            ...partnerDomainConditions,
          ],
        },
        select: { id: true, content_en: true, slug: true, siteId: true },
        take: 30,
        orderBy: { created_at: "desc" },
      });

      const { getDefaultSiteId } = await import("@/config/sites");

      // Build regex pattern for all partner domains
      const domainPattern = AFFILIATE_PARTNER_DOMAINS.map((d) => d.replace(/\./g, "\\.")).join("|");

      for (const post of postsForTracking) {
        if (Date.now() - cronStart > BUDGET_MS - 3_000) break;
        if (results.untrackedLinksWrapped >= 50) break;

        let content = post.content_en || "";
        // Skip if ALL affiliate links are already tracked
        if (
          !content.includes("booking.com") &&
          !content.includes("getyourguide.com") &&
          !content.includes("viator.com") &&
          !content.includes("agoda.com") &&
          !content.includes("anrdoezrs.net") &&
          !content.includes("welcomepickups.com") &&
          !content.includes("tiqets.com") &&
          !content.includes("ticketnetwork.com") &&
          !content.includes('rel="sponsored"') &&
          !content.includes("affiliate-recommendation") &&
          !content.includes("halalbooking.com") &&
          !content.includes("vrbo.com") &&
          !content.includes("expedia.com") &&
          !content.includes("tripadvisor")
        )
          continue;

        let modified = false;
        const postSiteId = post.siteId || getDefaultSiteId();
        const sid = `${postSiteId}_${post.slug}`.substring(0, 100);

        // Match ANY <a> tag pointing to a known affiliate partner domain
        // This catches: rel="sponsored" links, AI-generated inline links, CJ deep links, Travelpayouts links
        const partnerLinkRegex = new RegExp(
          `<a\\s([^>]*)href="(https?:\\/\\/[^"]*(?:${domainPattern})[^"]*)"([^>]*)>`,
          "gi",
        );
        let directMatch: RegExpExecArray | null;

        while ((directMatch = partnerLinkRegex.exec(content)) !== null) {
          const originalHref = directMatch[2];
          // Skip if already tracked through our click tracker
          if (originalHref.includes("/api/affiliate/click")) continue;

          const trackedHref = `/api/affiliate/click?url=${encodeURIComponent(originalHref)}&sid=${encodeURIComponent(sid)}`;
          const originalTag = directMatch[0];

          // Also ensure rel="noopener sponsored" is present
          let newTag = originalTag.replace(`href="${originalHref}"`, `href="${trackedHref}"`);
          if (!newTag.includes('rel="') || !newTag.includes("sponsored")) {
            if (newTag.includes('rel="')) {
              // Add "sponsored" to existing rel attribute
              newTag = newTag.replace(/rel="([^"]*)"/, 'rel="$1 sponsored"');
            } else {
              // Add rel attribute before closing >
              newTag = newTag.replace(/>$/, ' rel="noopener sponsored">');
            }
          }

          content = content.replace(originalTag, newTag);
          modified = true;
          results.untrackedLinksWrapped++;
        }

        if (modified) {
          await optimisticBlogPostUpdate(post.id, () => ({ content_en: content }), { tag: "[content-auto-fix]" }).catch(
            (err) =>
              console.warn(
                "[content-auto-fix] Tracking wrap failed:",
                err instanceof Error ? err.message : String(err),
              ),
          );
          console.log(
            `[content-auto-fix] Wrapped ${results.untrackedLinksWrapped} untracked affiliate links in /${post.slug}`,
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`untracked-link-wrapping: ${msg}`);
      console.warn("[content-auto-fix] Untracked link wrapping failed:", msg);
    }
  }

  // ── 20. PLACEHOLDER AFFILIATE ID CLEANUP ─────────────────────────────────────
  // AI content generation often writes links with placeholder IDs like aid=12345,
  // AFFILIATE_ID, youraffiliateid. Find and fix them — either replace with real
  // tracked URLs or strip the broken parameters.
  if (Date.now() - cronStart < BUDGET_MS - 5_000) {
    try {
      // Patterns that indicate a placeholder/fake affiliate ID
      const PLACEHOLDER_PATTERNS = [
        /\baid=12345\b/gi,
        /\baid=1234567\b/gi,
        /\baid=123456\b/gi,
        /\bpartner_id=12345\b/gi,
        /\bpid=12345\b/gi,
        /\bcid=12345\b/gi,
        /\bref=12345\b/gi,
        /AFFILIATE_ID/g,
        /YOUR_AFFILIATE_ID/gi,
        /youraffiliateid/gi,
        /your-affiliate-id/gi,
        /\[affiliate[_-]?id\]/gi,
        /\{affiliate[_-]?id\}/gi,
        /INSERT_AFFILIATE_ID/gi,
        /PARTNER_ID_HERE/gi,
        /YOUR_PARTNER_ID/gi,
        /\baid=\b(?=[&"' ])/gi, // aid= with nothing after (empty)
        /\bcid=\b(?=[&"' ])/gi, // cid= with nothing after
      ];

      // Find articles with potential placeholder IDs
      const postsWithPlaceholders = await prisma.blogPost.findMany({
        where: {
          published: true,
          siteId: { in: activeSiteIds },
          OR: [
            { content_en: { contains: "aid=12345" } },
            { content_en: { contains: "AFFILIATE_ID" } },
            { content_en: { contains: "youraffiliateid" } },
            { content_en: { contains: "your-affiliate-id" } },
            { content_en: { contains: "partner_id=12345" } },
            { content_en: { contains: "pid=12345" } },
            { content_en: { contains: "INSERT_AFFILIATE" } },
            { content_en: { contains: "PARTNER_ID_HERE" } },
            { content_en: { contains: "YOUR_PARTNER" } },
          ],
        },
        select: { id: true, content_en: true, slug: true, siteId: true },
        take: 20,
        orderBy: { created_at: "desc" },
      });

      const { getDefaultSiteId } = await import("@/config/sites");

      for (const post of postsWithPlaceholders) {
        if (Date.now() - cronStart > BUDGET_MS - 3_000) break;
        if (results.placeholderIdsFixed >= 30) break;

        let content = post.content_en || "";
        let modified = false;
        const postSiteId = post.siteId || getDefaultSiteId();
        const sid = `${postSiteId}_${post.slug}`.substring(0, 100);

        // Find <a> tags with known partner domains that have placeholder params
        const linkRegex = /<a\s([^>]*)href="(https?:\/\/[^"]+)"([^>]*)>([\s\S]*?)<\/a>/gi;
        let match: RegExpExecArray | null;
        const replacements: Array<{ original: string; replacement: string }> = [];

        while ((match = linkRegex.exec(content)) !== null) {
          const fullTag = match[0];
          const href = match[2];

          // Check if this href contains a placeholder pattern
          const hasPlaceholder = PLACEHOLDER_PATTERNS.some((p) => p.test(href));
          // Reset regex lastIndex after test()
          PLACEHOLDER_PATTERNS.forEach((p) => {
            p.lastIndex = 0;
          });

          if (!hasPlaceholder) continue;
          if (href.includes("/api/affiliate/click")) continue;

          // Strip placeholder params from URL and wrap through click tracker
          let cleanUrl = href;
          for (const pattern of PLACEHOLDER_PATTERNS) {
            cleanUrl = cleanUrl.replace(pattern, "");
            pattern.lastIndex = 0;
          }
          // Clean up resulting URL (remove dangling ?&, &&, trailing &)
          cleanUrl = cleanUrl.replace(/[?&]$/, "").replace(/&&+/g, "&").replace(/\?&/, "?").replace(/\?$/, "");

          const trackedUrl = `/api/affiliate/click?url=${encodeURIComponent(cleanUrl)}&sid=${encodeURIComponent(sid)}`;
          let newTag = fullTag.replace(`href="${href}"`, `href="${trackedUrl}"`);

          // Add rel="noopener sponsored" if missing
          if (!newTag.includes("sponsored")) {
            if (newTag.includes('rel="')) {
              newTag = newTag.replace(/rel="([^"]*)"/, 'rel="$1 sponsored"');
            } else {
              newTag = newTag.replace(/<a\s/, '<a rel="noopener sponsored" ');
            }
          }

          replacements.push({ original: fullTag, replacement: newTag });
        }

        for (const { original, replacement } of replacements) {
          content = content.replace(original, replacement);
          modified = true;
          results.placeholderIdsFixed++;
        }

        if (modified) {
          await optimisticBlogPostUpdate(post.id, () => ({ content_en: content }), { tag: "[content-auto-fix]" }).catch(
            (err) =>
              console.warn(
                "[content-auto-fix] Placeholder cleanup failed:",
                err instanceof Error ? err.message : String(err),
              ),
          );
          console.log(`[content-auto-fix] Fixed ${replacements.length} placeholder affiliate IDs in /${post.slug}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`placeholder-affiliate-cleanup: ${msg}`);
      console.warn("[content-auto-fix] Placeholder affiliate cleanup failed:", msg);
    }
  }

  // ── Section 21: Fix Not-Indexed Pages (7+ days) ────────────────────────────
  // Finds published articles stuck "not indexed" for 7+ days, enhances content
  // (expand, add links, affiliates, images) and resubmits to IndexNow.
  if (Date.now() - cronStart < BUDGET_MS - 25_000) {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Find URLs that were submitted 7+ days ago but are NOT indexed
      const stuckUrls = await prisma.uRLIndexingStatus.findMany({
        where: {
          site_id: { in: activeSiteIds },
          status: { in: ["submitted", "discovered", "error"] },
          last_submitted_at: { lt: sevenDaysAgo },
          indexing_state: { not: "indexed" },
        },
        select: { url: true, site_id: true },
        take: 5,
      });

      if (stuckUrls.length > 0) {
        // Extract slugs from URLs to find matching BlogPosts
        const slugsFromUrls = stuckUrls
          .map((u) => {
            const parts = u.url.split("/blog/");
            return parts[1]?.replace(/\/$/, "") || null;
          })
          .filter(Boolean) as string[];

        const postsToFix = await prisma.blogPost.findMany({
          where: {
            siteId: { in: activeSiteIds },
            published: true,
            deletedAt: null,
            slug: { in: slugsFromUrls },
          },
          select: { id: true, slug: true, siteId: true },
          take: 3,
        });

        const { enhancePublishedArticle } = await import("@/lib/campaigns/article-enhancer");

        for (const post of postsToFix) {
          if (Date.now() - cronStart > BUDGET_MS - 15_000) break;

          try {
            const enhanceResult = await enhancePublishedArticle(
              post.id,
              [
                "expand_content",
                "add_internal_links",
                "add_affiliate_links",
                "add_authenticity",
                "fix_meta_description",
                "inject_images",
              ],
              {
                operations: [
                  "expand_content",
                  "add_internal_links",
                  "add_affiliate_links",
                  "add_authenticity",
                  "fix_meta_description",
                  "inject_images",
                ],
              },
              Math.min(40_000, BUDGET_MS - (Date.now() - cronStart) - 5_000),
            );

            if (enhanceResult.success) {
              results.notIndexedEnhanced++;
              console.log(
                `[content-auto-fix] Enhanced not-indexed article /${post.slug}: +${enhanceResult.changes?.wordsAdded || 0}w, +${enhanceResult.changes?.internalLinksAdded || 0} links`,
              );

              // Resubmit to IndexNow
              try {
                const { getSiteDomain } = await import("@/config/sites");
                const domain = getSiteDomain(post.siteId);
                const articleUrl = `${domain}/blog/${post.slug}`;
                const { submitToIndexNow } = await import("@/lib/seo/indexing-service");
                await submitToIndexNow([articleUrl]);
                console.log(`[content-auto-fix] Resubmitted /${post.slug} to IndexNow`);
              } catch (indexErr) {
                console.warn(
                  "[content-auto-fix] IndexNow resubmit failed:",
                  indexErr instanceof Error ? indexErr.message : String(indexErr),
                );
              }
            }
          } catch (err) {
            console.warn(
              `[content-auto-fix] Not-indexed fix failed for /${post.slug}:`,
              err instanceof Error ? err.message : String(err),
            );
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`not-indexed-fix: ${msg}`);
      console.warn("[content-auto-fix] Not-indexed fix section failed:", msg);
    }
  }

  // ── Section 22: SEO Boost for Low-Score Articles (< 80%) ──────────────────
  // Enhances articles with seo_score < 80 by adding photos, internal links,
  // affiliate links, and fixing meta tags.
  if (Date.now() - cronStart < BUDGET_MS - 25_000) {
    try {
      const lowScorePosts = await prisma.blogPost.findMany({
        where: {
          siteId: { in: activeSiteIds },
          published: true,
          deletedAt: null,
          seo_score: { lt: 80 },
          content_en: { not: "" },
        },
        select: { id: true, slug: true, seo_score: true, siteId: true },
        orderBy: { seo_score: "asc" },
        take: 3,
      });

      if (lowScorePosts.length > 0) {
        const { enhancePublishedArticle } = await import("@/lib/campaigns/article-enhancer");

        for (const post of lowScorePosts) {
          if (Date.now() - cronStart > BUDGET_MS - 15_000) break;

          try {
            const enhanceResult = await enhancePublishedArticle(
              post.id,
              [
                "add_internal_links",
                "add_affiliate_links",
                "inject_images",
                "fix_meta_description",
                "fix_meta_title",
                "add_authenticity",
              ],
              {
                operations: [
                  "add_internal_links",
                  "add_affiliate_links",
                  "inject_images",
                  "fix_meta_description",
                  "fix_meta_title",
                  "add_authenticity",
                ],
              },
              Math.min(40_000, BUDGET_MS - (Date.now() - cronStart) - 5_000),
            );

            if (enhanceResult.success && (enhanceResult.operationsApplied?.length || 0) > 0) {
              results.seoBoostEnhanced++;
              console.log(
                `[content-auto-fix] SEO boosted /${post.slug} (score: ${post.seo_score}): +${enhanceResult.changes?.wordsAdded || 0}w, +${enhanceResult.changes?.internalLinksAdded || 0} links, +${enhanceResult.changes?.affiliateLinksAdded || 0} affiliates`,
              );
            }
          } catch (err) {
            console.warn(
              `[content-auto-fix] SEO boost failed for /${post.slug}:`,
              err instanceof Error ? err.message : String(err),
            );
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`seo-boost: ${msg}`);
      console.warn("[content-auto-fix] SEO boost section failed:", msg);
    }
  }

  // ── Section 23: [REDIRECTED to X] Meta Pollution Cleanup ──────────────────
  // From Chrome Bridge audit finding #1: bulk-consolidation script prefixed
  // `[REDIRECTED to /slug]` into metaDescription/metaTitle fields but the
  // follow-up 301/canonical/unpublish step never ran, so bookkeeping markers
  // leak into Google SERP. Self-healing: strip the prefix from any field
  // that still has it. Idempotent (safe to re-run).
  let redirectedMetaCleaned = 0;
  if (Date.now() - cronStart < BUDGET_MS - 5_000) {
    try {
      const REDIRECTED_RE = /^\s*\[REDIRECTED\s+to\s+[^\]]+\]\s*/i;
      const contaminated = await prisma.blogPost.findMany({
        where: {
          siteId: { in: activeSiteIds },
          deletedAt: null,
          OR: [
            { meta_description_en: { startsWith: "[REDIRECTED" } },
            { meta_description_ar: { startsWith: "[REDIRECTED" } },
            { meta_title_en: { startsWith: "[REDIRECTED" } },
            { meta_title_ar: { startsWith: "[REDIRECTED" } },
          ],
        },
        select: {
          id: true,
          slug: true,
          meta_description_en: true,
          meta_description_ar: true,
          meta_title_en: true,
          meta_title_ar: true,
        },
        take: 50,
      });

      for (const post of contaminated) {
        const update: Record<string, string | null> = {};
        for (const field of ["meta_description_en", "meta_description_ar", "meta_title_en", "meta_title_ar"] as const) {
          const val = post[field];
          if (typeof val === "string" && REDIRECTED_RE.test(val)) {
            const cleaned = val.replace(REDIRECTED_RE, "").trim();
            update[field] = cleaned.length > 0 ? cleaned : null;
          }
        }
        if (Object.keys(update).length > 0) {
          await prisma.blogPost.update({ where: { id: post.id }, data: update });
          redirectedMetaCleaned++;
        }
      }

      if (redirectedMetaCleaned > 0) {
        console.log(
          `[content-auto-fix] Section 23: cleaned [REDIRECTED] prefix from ${redirectedMetaCleaned} articles`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`redirected-meta-cleanup: ${msg}`);
      console.warn("[content-auto-fix] Section 23 failed:", msg);
    }
  }

  // ── Section 24: Auto-Mark Chrome Audit Reports as Fixed ───────────────────
  // When a ChromeAuditReport is in status="fix_queued" and its linked
  // AgentTask has completed, auto-mark the report as fixed. Closes the loop
  // from Chrome Bridge audit upload → Apply Fix → CLI work → marked fixed.
  // No manual Mark Fixed tap required.
  let chromeAuditsMarkedFixed = 0;
  if (Date.now() - cronStart < BUDGET_MS - 3_000) {
    try {
      const queued = await prisma.chromeAuditReport.findMany({
        where: {
          status: "fix_queued",
          agentTaskId: { not: null },
          reviewedAt: { lt: new Date(Date.now() - 6 * 60 * 60 * 1000) }, // at least 6h old
        },
        select: { id: true, agentTaskId: true },
        take: 30,
      });

      for (const report of queued) {
        if (!report.agentTaskId) continue;
        const task = await prisma.agentTask.findUnique({
          where: { id: report.agentTaskId },
          select: { status: true },
        });
        if (task?.status === "completed") {
          await prisma.chromeAuditReport.update({
            where: { id: report.id },
            data: { status: "fixed", fixedAt: new Date() },
          });
          chromeAuditsMarkedFixed++;
        }
      }

      if (chromeAuditsMarkedFixed > 0) {
        console.log(
          `[content-auto-fix] Section 24: auto-marked ${chromeAuditsMarkedFixed} ChromeAuditReport(s) as fixed`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`chrome-audit-auto-mark: ${msg}`);
      console.warn("[content-auto-fix] Section 24 failed:", msg);
    }
  }

  // ── Section 25: FTC Affiliate Disclosure Injection ────────────────────────
  // Closes the auditAffiliatePractices "no disclosure paragraph (FTC violation)"
  // findings by appending a short disclosure paragraph to articles that contain
  // affiliate links but no disclosure language. Owned by content-auto-fix per
  // ENHANCEMENT_OWNERS.affiliate_disclosure (rule #121).
  //
  // Detection mirrors public-audit/auditAffiliatePractices: link is "affiliate"
  // if it goes through /api/affiliate/click OR has rel="sponsored". Disclosure
  // is "present" if the content matches any of the DISCLOSURE_PATTERNS regexes.
  if (Date.now() - cronStart < BUDGET_MS - 3_000) {
    try {
      const { isEnhancementOwner, buildEnhancementLogEntry } = await import("@/lib/db/enhancement-log");
      const { optimisticBlogPostUpdate } = await import("@/lib/db/optimistic-update");

      if (!isEnhancementOwner("content-auto-fix", "affiliate_disclosure")) {
        // Defensive — should never trip given the constants.ts mapping above.
        console.warn("[content-auto-fix] Section 25 skipped: not the registered owner of affiliate_disclosure");
      } else {
        const DISCLOSURE_PATTERNS = [
          /\baffiliate\s+(?:link|disclosure)\b/i,
          /\bcommission\b/i,
          /\bearn\s+(?:a|small)\s+commission\b/i,
          /\bpartner\s+with\b/i,
          /\bdisclosure\b/i,
        ];
        // May 19 audit: 3 articles flagged "no disclosure paragraph (FTC violation)"
        // because the OLD regex only matched /api/affiliate/click or rel="sponsored"
        // — articles with BARE partner URLs (the booking.com / expedia.com / etc.
        // dead-program links Section 26 will strip) were invisible to Section 25,
        // so they never got a disclosure either. Widen to match the same
        // PARTNER_HOSTS pattern Section 26 uses so disclosure injection covers
        // any article that has affiliate-INTENT links, even if they're broken.
        const AFFILIATE_LINK_RE =
          /(<a\b[^>]*\bhref="[^"]*\/api\/affiliate\/click[^"]*"[^>]*>)|(<a\b[^>]*\brel="[^"]*\bsponsored\b[^"]*"[^>]*>)|(<a\b[^>]*\bhref="https?:\/\/(?:[^"\/]*\.)?(?:booking\.com|expedia\.com|hotels\.com|agoda\.com|getyourguide\.com|viator\.com|thefork\.|opentable\.|tripadvisor\.|stubhub\.|blacklane\.com|welcomepickups\.com|tiqets\.com|ticketnetwork\.com|klook\.com|skyscanner\.|sportsevents365\.com|halalbooking\.com|universe\.com|eticketing\.co\.uk|travelpayouts\.com|tp\.media|stay22\.com)[^"]*"[^>]*>)/i;

        const candidates = await prisma.blogPost.findMany({
          where: {
            siteId: { in: activeSiteIds },
            published: true,
            deletedAt: null,
            content_en: { not: "" },
          },
          select: { id: true, slug: true, siteId: true, content_en: true, content_ar: true },
          orderBy: { updated_at: "desc" },
          take: 50,
        });

        const MAX_DISCLOSURE_INJECTIONS = 20;
        let injected = 0;

        for (const post of candidates) {
          if (injected >= MAX_DISCLOSURE_INJECTIONS) break;
          if (Date.now() - cronStart > BUDGET_MS - 5_000) break;

          const en = post.content_en || "";
          const ar = post.content_ar || "";

          const enHasAffiliate = AFFILIATE_LINK_RE.test(en);
          const arHasAffiliate = AFFILIATE_LINK_RE.test(ar);
          if (!enHasAffiliate && !arHasAffiliate) continue;

          const enHasDisclosure = enHasAffiliate ? DISCLOSURE_PATTERNS.some((re) => re.test(en)) : true;
          const arHasDisclosure = arHasAffiliate ? DISCLOSURE_PATTERNS.some((re) => re.test(ar)) : true;
          if (enHasDisclosure && arHasDisclosure) continue;

          const enDisclosure =
            '<p class="affiliate-disclosure"><em>Affiliate disclosure: some links on this page are affiliate links. We may earn a small commission, at no extra cost to you, when you book or purchase through them. We only recommend partners we trust.</em></p>';
          const arDisclosure =
            '<p class="affiliate-disclosure" dir="rtl"><em>إفصاح عن الشراكة: تحتوي هذه الصفحة على روابط تابعة. قد نحصل على عمولة صغيرة دون أي تكلفة إضافية عليك عند الحجز أو الشراء عبرها. نوصي فقط بشركاء نثق بهم.</em></p>';

          try {
            const updated = await optimisticBlogPostUpdate(
              post.id,
              (current) => {
                const updates: Record<string, unknown> = {};
                const curEn = (current.content_en as string) || "";
                const curAr = (current.content_ar as string) || "";
                const curEnHasAffiliate = AFFILIATE_LINK_RE.test(curEn);
                const curArHasAffiliate = AFFILIATE_LINK_RE.test(curAr);
                const curEnNeeds = curEnHasAffiliate && !DISCLOSURE_PATTERNS.some((re) => re.test(curEn));
                const curArNeeds = curArHasAffiliate && !DISCLOSURE_PATTERNS.some((re) => re.test(curAr));
                if (!curEnNeeds && !curArNeeds) return null;
                if (curEnNeeds) updates.content_en = `${curEn}\n\n${enDisclosure}`;
                if (curArNeeds) updates.content_ar = `${curAr}\n\n${arDisclosure}`;
                const summary = `Injected FTC disclosure (${curEnNeeds ? "EN" : ""}${curEnNeeds && curArNeeds ? "+" : ""}${curArNeeds ? "AR" : ""})`;
                updates.enhancement_log = buildEnhancementLogEntry(
                  current.enhancement_log,
                  "affiliate_disclosure",
                  "content-auto-fix",
                  summary,
                );
                return updates;
              },
              { tag: "[content-auto-fix:section-25]" },
            );
            if (updated) injected++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[content-auto-fix] Section 25: disclosure inject failed for ${post.slug}:`, msg);
          }
        }

        results.affiliateDisclosuresInjected = injected;
        if (injected > 0) {
          console.log(`[content-auto-fix] Section 25: injected FTC disclosure into ${injected} articles`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`affiliate-disclosure-inject: ${msg}`);
      console.warn("[content-auto-fix] Section 25 failed:", msg);
    }
  }

  // ── Section 26: Empty-Param Affiliate Link Cleanup ────────────────────────
  // Live verification (May 16) found articles like /blog/novikov-michelin-guide-mayfair-london
  // still contain affiliate links with EMPTY tracking params:
  //   /api/affiliate/click?url=https%3A%2F%2Fwww.thefork.co.uk%2Flondon%3Fref%3D&sid=...
  //   /api/affiliate/click?url=...getyourguide.com%2F%3Fpartner_id%3D&sid=...
  //   /api/affiliate/click?url=...stubhub.co.uk%2F%3Fgcid%3D&sid=...
  //
  // These predate the affiliate-injection cron's empty-param skip (line 661).
  // Old injections from when env vars were unset still ship traffic to partners
  // WITHOUT commission attribution — pure leakage. Worse than no link because
  // the user leaves yalla-london and we earn $0 from the click.
  //
  // Strategy: scan each published article's HTML; for every <a> whose href is
  // /api/affiliate/click?url=ENCODED&sid=..., decode the partner URL and check
  // its query string. If ANY recognized tracking key (ref/partner_id/pid/aid/
  // cid/gcid/aff/utm_source) is present with an empty value, REMOVE the entire
  // <a> tag and keep its inner text as plain text. Anchor text is preserved so
  // context still reads naturally; the broken link just stops driving traffic.
  //
  // Owner of "affiliate_links" enhancement type per ENHANCEMENT_OWNERS.
  // Idempotent: after the strip, the link won't be detected as needing fix
  // again, so the same article isn't re-touched on subsequent runs.
  if (Date.now() - cronStart < BUDGET_MS - 3_000) {
    try {
      const { isEnhancementOwner, buildEnhancementLogEntry } = await import("@/lib/db/enhancement-log");
      const { optimisticBlogPostUpdate } = await import("@/lib/db/optimistic-update");

      // June 12 audit: this section gated on "affiliate_links" (owned by
      // affiliate-injection) and therefore NEVER ran — 230+ articles kept
      // their broken links. Cleanup now has its own registered type.
      if (!isEnhancementOwner("content-auto-fix", "affiliate_link_cleanup")) {
        console.warn("[content-auto-fix] Section 26 skipped: not the registered owner of affiliate_link_cleanup");
      } else {
        // Tracking-param keys that produce REAL commission. utm_source / utm_medium
        // are campaign tags — they tell us "this came from yalla-london" but DO NOT
        // pay commission on partner networks (TripAdvisor needs Awin, Booking needs
        // populated aid, Expedia needs cjevent). May 17 audit found 6 inline links
        // using utm-only tags and producing $0 revenue.
        const REAL_AFFILIATE_KEYS = [
          "ref",
          "partner_id",
          "pid",
          "aid",
          // SportsEvents365 pays via a_aid — June 12 audit: this key was missing,
          // so the strip pass treated WORKING sports links as broken and removed
          // them. Never remove a_aid from this list.
          "a_aid",
          "cid",
          "gcid",
          "aff",
          "affid",
          "subid",
          "sub_id",
          "clickref",
          "marker",
        ];
        // Kept for backward compat — empty-only check still flags these as broken.
        // Includes utm_source so old explicit utm-empty cases still strip.
        const TRACKING_KEYS = [...REAL_AFFILIATE_KEYS, "utm_source"];

        // Match <a href="/api/affiliate/click?url=ENCODED[&sid=...]">...</a>
        // The href value may be HTML-attribute-escaped, so the inner & is &amp;
        // in some renders. We match both literal & and &amp;.
        const TRACKED_LINK_RE = /<a\b[^>]*\bhref="(\/api\/affiliate\/click\?url=[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

        function hasEmptyTrackingParam(decodedUrl: string): boolean {
          // Use a try/catch — malformed URLs from old/buggy injections shouldn't crash
          try {
            // The decoded URL is the partner destination (e.g. https://www.thefork.co.uk/london?ref=)
            const u = new URL(decodedUrl);
            for (const key of TRACKING_KEYS) {
              if (u.searchParams.has(key) && (u.searchParams.get(key) || "").trim() === "") {
                return true;
              }
            }
            return false;
          } catch {
            // Couldn't parse → treat as broken so we strip it
            return true;
          }
        }

        /**
         * Returns true when a partner URL has NO real affiliate key populated
         * (either entirely absent OR only carries utm_* tags). May 17 follow-up
         * audit found 6 inline links in this state — they produce $0 revenue but
         * the original hasEmptyTrackingParam doesn't catch them because there's
         * no empty-value key to detect.
         *
         * Pass partnerHostsPattern so this only runs against recognized affiliate
         * partners — editorial links (e.g. theritzlondon.com) shouldn't be stripped.
         */
        function hasNoRealAffiliateKey(decodedUrl: string, partnerHostsPattern: RegExp): boolean {
          try {
            const u = new URL(decodedUrl);
            if (!partnerHostsPattern.test(u.hostname)) return false;
            for (const key of REAL_AFFILIATE_KEYS) {
              const val = (u.searchParams.get(key) || "").trim();
              if (val !== "") return false; // found a real affiliate key with value
            }
            return true; // partner URL with zero real affiliate keys = broken
          } catch {
            return false;
          }
        }

        // PARTNER_HOSTS hoisted out of stripBrokenAffiliates so hasNoRealAffiliateKey
        // can reference it. Same regex as before — partner domains where untracked
        // links == revenue leak. May 17 (round 2) added: halalbooking, universe,
        // eticketing must be checked even when URL has no tracking params at all.
        const PARTNER_HOSTS = new RegExp(
          "(booking\\.com|expedia\\.com|hotels\\.com|agoda\\.com|getyourguide\\.com|" +
            "viator\\.com|thefork\\.|opentable\\.|tripadvisor\\.|stubhub\\.|" +
            "blacklane\\.com|welcomepickups\\.com|tiqets\\.com|ticketnetwork\\.com|" +
            "klook\\.com|skyscanner\\.|sportsevents365\\.com|halalbooking\\.com|" +
            "universe\\.com|eticketing\\.co\\.uk)",
          "i",
        );

        // June 12 audit: Expedia is a JOINED CJ advertiser (EPC $61.44) but 97
        // articles carried expedia.com links with utm-only tags (often malformed
        // with a double "?"). Stripping those throws away monetizable intent —
        // CONVERT them to the CJ deep link instead. Other dead partners
        // (booking.com empty aid, GetYourGuide no ID) still get stripped.
        const { buildCjDeepLinkRaw } = await import("@/lib/affiliate/page-affiliate-links");

        function cleanExpediaDestination(url: string): string {
          // Cut at the first utm_ param — also repairs the "?x=1?utm_source=" malformation
          const firstUtm = url.search(/[?&]utm_/i);
          return firstUtm === -1 ? url : url.slice(0, firstUtm);
        }

        function buildExpediaReplacement(partnerUrl: string, slug: string, siteId: string): string | null {
          const dest = cleanExpediaDestination(partnerUrl);
          const sid = `${siteId}_${slug}`.substring(0, 100);
          const raw = buildCjDeepLinkRaw("expedia", dest, sid);
          if (!raw) return null;
          return `/api/affiliate/click?url=${encodeURIComponent(raw)}&sid=${encodeURIComponent(sid)}&partner=expedia&article=${encodeURIComponent(slug)}`;
        }

        function stripBrokenAffiliates(
          html: string,
          slug: string,
          siteId: string,
        ): { html: string; stripped: number; converted: number } {
          if (!html) return { html, stripped: 0, converted: 0 };
          let stripped = 0;
          let converted = 0;

          function fixOrStrip(full: string, hrefAttr: string, inner: string, partnerUrl: string): string {
            // Expedia → convert to paying CJ deep link (keep anchor + text)
            try {
              if (/(^|\.)expedia\.com$/i.test(new URL(partnerUrl).hostname)) {
                const replacement = buildExpediaReplacement(partnerUrl, slug, siteId);
                if (replacement) {
                  converted++;
                  // Function replacer so "$" in the URL is never treated as a pattern token
                  return full.replace(hrefAttr, () => replacement);
                }
              }
            } catch {
              // fall through to strip
            }
            stripped++;
            return inner;
          }

          // ── Pass 1: tracked-redirect links (/api/affiliate/click?url=...) ──
          let cleaned = html.replace(TRACKED_LINK_RE, (full, hrefAttr: string, inner: string) => {
            // Parse the click-tracker URL to extract the partner URL
            // hrefAttr looks like: /api/affiliate/click?url=ENCODED&sid=...
            // The url param is the encoded partner destination.
            let partnerUrl: string | null = null;
            try {
              const trackerQuery = hrefAttr.split("?")[1] || "";
              // Decode &amp; first (HTML-attribute escape), then parse query
              const normalized = trackerQuery.replace(/&amp;/g, "&");
              const params = new URLSearchParams(normalized);
              const raw = params.get("url");
              if (raw) partnerUrl = decodeURIComponent(raw);
            } catch {
              partnerUrl = null;
            }

            if (!partnerUrl) {
              // Couldn't decode — leave the link alone (don't accidentally strip working ones)
              return full;
            }

            // Fix/strip if EITHER: empty tracking key OR partner URL with no real affiliate key
            if (hasEmptyTrackingParam(partnerUrl) || hasNoRealAffiliateKey(partnerUrl, PARTNER_HOSTS)) {
              return fixOrStrip(full, hrefAttr, inner, partnerUrl);
            }

            return full;
          });
          // ── Pass 2: DIRECT partner links bypassing the tracker ──
          // Perplexity re-audit (May 17 round 1) caught Booking.com SERP-spam +
          // empty-aid URLs going direct (not via /api/affiliate/click). May 17
          // round 2 added cases where the URL has NO tracking param at all
          // (booking.com/searchresults with no aid; tripadvisor with utm-only;
          // halalbooking direct link; universe/eticketing no aff ID).
          const DIRECT_LINK_RE = /<a\b[^>]*\bhref="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
          cleaned = cleaned.replace(DIRECT_LINK_RE, (full, hrefAttr: string, inner: string) => {
            // Skip if already routed through our tracker — Pass 1 handled those.
            if (hrefAttr.includes("/api/affiliate/click")) return full;
            // Skip if not a recognized partner domain — don't touch editorial links.
            if (!PARTNER_HOSTS.test(hrefAttr)) return full;
            // Decode &amp; → & for URL parsing
            const normalized = hrefAttr.replace(/&amp;/g, "&");
            // Fix/strip if EITHER empty key OR no real affiliate key at all (utm-only / no params)
            if (!hasEmptyTrackingParam(normalized) && !hasNoRealAffiliateKey(normalized, PARTNER_HOSTS)) {
              return full;
            }
            return fixOrStrip(full, hrefAttr, inner, normalized);
          });

          return { html: cleaned, stripped, converted };
        }

        // Limit scope: scan up to 50 posts per run, max 10 mutations per run.
        // Older articles first so the backlog drains chronologically.
        const candidates = await prisma.blogPost.findMany({
          where: {
            siteId: { in: activeSiteIds },
            published: true,
            deletedAt: null,
            // Pre-filter: catch BOTH tracked-redirect links AND direct
            // partner links that bypass the tracker. Booking.com SERP-spam
            // URLs (Perplexity audit May 17) fall into the second bucket —
            // they're <a href="https://www.booking.com/searchresults...&aid="> with
            // no /api/affiliate/click wrapper. Using OR keeps the query
            // simple while widening coverage.
            OR: [
              { content_en: { contains: "/api/affiliate/click" } },
              { content_en: { contains: "booking.com" } },
              { content_en: { contains: "expedia.com" } },
              { content_en: { contains: "getyourguide.com" } },
              { content_en: { contains: "tripadvisor." } },
              { content_en: { contains: "halalbooking.com" } },
              { content_en: { contains: "universe.com" } },
              { content_en: { contains: "eticketing.co.uk" } },
            ],
          },
          // June 12 audit: id+slug only — content is fetched per-chunk below.
          // The old `take: 50` + orderBy updated_at window STARVED: clean
          // articles never leave the window (their updated_at never changes),
          // so broken articles beyond position 50 were never scanned. 230+
          // articles with dead links accumulated. Now ALL candidates are
          // covered every run, bounded by budget + mutation cap.
          select: { id: true, slug: true, siteId: true },
          orderBy: { updated_at: "asc" },
        });

        const MAX_MUTATIONS = 25;
        const CHUNK = 25;
        let mutations = 0;
        let totalStripped = 0;
        let totalConverted = 0;

        for (let i = 0; i < candidates.length && mutations < MAX_MUTATIONS; i += CHUNK) {
          if (Date.now() - cronStart > BUDGET_MS - 10_000) break;
          const chunk = candidates.slice(i, i + CHUNK);
          const posts = await prisma.blogPost.findMany({
            where: { id: { in: chunk.map((c) => c.id) } },
            select: { id: true, slug: true, siteId: true, content_en: true, content_ar: true },
          });

          for (const post of posts) {
            if (mutations >= MAX_MUTATIONS) break;
            if (Date.now() - cronStart > BUDGET_MS - 5_000) break;

            const enResult = stripBrokenAffiliates(post.content_en || "", post.slug, post.siteId);
            const arResult = stripBrokenAffiliates(post.content_ar || "", post.slug, post.siteId);
            if (enResult.stripped + enResult.converted === 0 && arResult.stripped + arResult.converted === 0) {
              continue;
            }

            try {
              await optimisticBlogPostUpdate(
                post.id,
                (current) => {
                  const curEn = (current.content_en as string) || "";
                  const curAr = (current.content_ar as string) || "";
                  const curEnResult = stripBrokenAffiliates(curEn, post.slug, post.siteId);
                  const curArResult = stripBrokenAffiliates(curAr, post.slug, post.siteId);
                  const totalChanges =
                    curEnResult.stripped + curEnResult.converted + curArResult.stripped + curArResult.converted;
                  if (totalChanges === 0) return null;

                  const updates: Record<string, unknown> = {};
                  if (curEnResult.stripped + curEnResult.converted > 0) updates.content_en = curEnResult.html;
                  if (curArResult.stripped + curArResult.converted > 0) updates.content_ar = curArResult.html;
                  updates.enhancement_log = buildEnhancementLogEntry(
                    current.enhancement_log,
                    "affiliate_link_cleanup",
                    "content-auto-fix",
                    `Converted ${curEnResult.converted + curArResult.converted} Expedia link(s) to CJ deep links, stripped ${curEnResult.stripped + curArResult.stripped} dead affiliate link(s)`,
                  );
                  return updates;
                },
                { tag: "[content-auto-fix:section-26]" },
              );
              mutations++;
              totalStripped += enResult.stripped + arResult.stripped;
              totalConverted += enResult.converted + arResult.converted;
              console.log(
                `[content-auto-fix:s26] ${post.slug}: converted ${enResult.converted + arResult.converted}, stripped ${enResult.stripped + arResult.stripped} affiliate link(s)`,
              );
            } catch (err) {
              console.warn(
                `[content-auto-fix:s26] ${post.slug} update failed:`,
                err instanceof Error ? err.message : err,
              );
            }
          }
        }

        results.emptyParamAffiliatesStripped = totalStripped;
        results.expediaLinksConverted = totalConverted;
        if (totalStripped + totalConverted > 0) {
          console.log(
            `[content-auto-fix:s26] Converted ${totalConverted} + stripped ${totalStripped} affiliate link(s) across ${mutations} article(s)`,
          );
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`empty-param-affiliate-strip: ${msg}`);
      console.warn("[content-auto-fix:s26] Section 26 failed:", msg);
    }
  }

  // ── Section 27: Raw pipe-table backfill (May 17 2026 re-audit) ────────────
  // Some older published articles ship pipe-table syntax raw: "| col | col |"
  // sequences inside <p> tags that never got converted to <table> by the assembly
  // phase. BlogPostClient now also unwraps them at render, but DB cleanup means
  // canonical content is always semantic HTML — better for AI search ingestion,
  // schema.org extraction, and copy-to-clipboard UX.
  if (Date.now() - cronStart < BUDGET_MS - 15_000) {
    try {
      const { convertPipeTables, hasPipeTable, unwrapPipeParagraphs } = await import("@/lib/markdown/pipe-tables");
      const PIPE_CAP = 20;
      const candidates = await prisma.blogPost.findMany({
        where: {
          siteId: { in: activeSiteIds },
          published: true,
          deletedAt: null,
          // Pre-filter: look for table separator rows (|---| or | --- |)
          OR: [
            { content_en: { contains: "|---" } },
            { content_en: { contains: "| ---" } },
            { content_ar: { contains: "|---" } },
            { content_ar: { contains: "| ---" } },
          ],
        },
        select: { id: true, slug: true, content_en: true, content_ar: true },
        orderBy: { updated_at: "asc" },
        take: PIPE_CAP,
      });

      let pipeFixed = 0;
      for (const post of candidates) {
        if (Date.now() - cronStart > BUDGET_MS - 5_000) break;

        const enUnwrapped = unwrapPipeParagraphs(post.content_en || "");
        const arUnwrapped = unwrapPipeParagraphs(post.content_ar || "");
        const needEn = hasPipeTable(enUnwrapped);
        const needAr = hasPipeTable(arUnwrapped);
        if (!needEn && !needAr) continue;

        try {
          await optimisticBlogPostUpdate(
            post.id,
            (current) => {
              const curEn = unwrapPipeParagraphs((current.content_en as string) || "");
              const curAr = unwrapPipeParagraphs((current.content_ar as string) || "");
              const fixEn = hasPipeTable(curEn);
              const fixAr = hasPipeTable(curAr);
              if (!fixEn && !fixAr) return null;
              const updates: Record<string, unknown> = {};
              if (fixEn) updates.content_en = convertPipeTables(curEn);
              if (fixAr) updates.content_ar = convertPipeTables(curAr);
              updates.enhancement_log = buildEnhancementLogEntry(
                current.enhancement_log,
                "markdown_tables",
                "content-auto-fix",
                `Converted ${(fixEn ? 1 : 0) + (fixAr ? 1 : 0)} raw pipe-table block(s) to <table>`,
              );
              return updates;
            },
            { tag: "[content-auto-fix:section-27]" },
          );
          pipeFixed++;
          console.log(`[content-auto-fix:s27] ${post.slug}: pipe table → <table>`);
        } catch (err) {
          console.warn(`[content-auto-fix:s27] ${post.slug} update failed:`, err instanceof Error ? err.message : err);
        }
      }

      (results as Record<string, unknown>).pipeTablesConverted = pipeFixed;
      if (pipeFixed > 0) {
        console.log(`[content-auto-fix:s27] Converted pipe tables in ${pipeFixed} article(s)`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`pipe-tables-backfill: ${msg}`);
      console.warn("[content-auto-fix:s27] Section 27 failed:", msg);
    }
  }

  // ── Section 28: Bracket placeholder body cleanup ──────────────────────────
  // May 17 re-audit: "high hotel prices with [x] unexpected add-on costs" leaked
  // to AR hero. Title-level placeholders are blocked by pre-pub gate Check 17,
  // but body-level placeholders only warn (auto-fix sweeps them post-hoc).
  // sanitizeContentBody now strips BRACKET_PLACEHOLDER as well — re-run on existing rows.
  if (Date.now() - cronStart < BUDGET_MS - 10_000) {
    try {
      const { sanitizeContentBody } = await import("@/lib/content-pipeline/title-sanitizer");
      const PLACEHOLDER_CAP = 30;
      const candidates = await prisma.blogPost.findMany({
        where: {
          siteId: { in: activeSiteIds },
          published: true,
          deletedAt: null,
          OR: [
            { content_en: { contains: "[x]" } },
            { content_ar: { contains: "[x]" } },
            { content_en: { contains: "[TBD]" } },
            { content_ar: { contains: "[TBD]" } },
            { content_en: { contains: "[insert" } },
            { content_en: { contains: "[placeholder" } },
            { content_en: { contains: "[TODO]" } },
          ],
        },
        select: { id: true, slug: true, content_en: true, content_ar: true },
        orderBy: { updated_at: "asc" },
        take: PLACEHOLDER_CAP,
      });

      let placeholdersStripped = 0;
      for (const post of candidates) {
        if (Date.now() - cronStart > BUDGET_MS - 3_000) break;

        try {
          await optimisticBlogPostUpdate(
            post.id,
            (current) => {
              const curEn = (current.content_en as string) || "";
              const curAr = (current.content_ar as string) || "";
              const newEn = sanitizeContentBody(curEn);
              const newAr = sanitizeContentBody(curAr);
              if (newEn === curEn && newAr === curAr) return null;
              const updates: Record<string, unknown> = {};
              if (newEn !== curEn) updates.content_en = newEn;
              if (newAr !== curAr) updates.content_ar = newAr;
              updates.enhancement_log = buildEnhancementLogEntry(
                current.enhancement_log,
                "bracket_placeholders",
                "content-auto-fix",
                "Stripped unfilled bracket placeholder(s) from article body",
              );
              return updates;
            },
            { tag: "[content-auto-fix:section-28]" },
          );
          placeholdersStripped++;
          console.log(`[content-auto-fix:s28] ${post.slug}: stripped bracket placeholders`);
        } catch (err) {
          console.warn(`[content-auto-fix:s28] ${post.slug} update failed:`, err instanceof Error ? err.message : err);
        }
      }

      (results as Record<string, unknown>).bracketPlaceholdersStripped = placeholdersStripped;
      if (placeholdersStripped > 0) {
        console.log(`[content-auto-fix:s28] Stripped placeholders from ${placeholdersStripped} article(s)`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`bracket-placeholder-cleanup: ${msg}`);
      console.warn("[content-auto-fix:s28] Section 28 failed:", msg);
    }
  }

  // ── Section 29: Mojibake repair (BlogPost + Event) ────────────────────────
  // May 17 re-audit: "Willie Colã³N" on /events. UTF-8 double-encoding from
  // upstream ingestion (Ticketmaster, news feeds). repairMojibake() is safe-by-
  // default — only rewrites when decode produces valid Latin/Arabic AND removes
  // the mojibake markers. If validation fails, the original string is preserved.
  if (Date.now() - cronStart < BUDGET_MS - 8_000) {
    try {
      const { repairRecord } = await import("@/lib/utils/mojibake");
      const MOJI_BLOG_CAP = 30;
      const MOJI_EVENT_CAP = 30;
      let blogRepaired = 0;
      let eventRepaired = 0;

      // BlogPost title fields (content body is usually safe — mojibake mostly appears in
      // shorter fields that pass through ingest scripts without normalization).
      const blogCandidates = await prisma.blogPost.findMany({
        where: {
          siteId: { in: activeSiteIds },
          OR: [{ title_en: { contains: "Ã" } }, { title_ar: { contains: "Ã" } }, { title_en: { contains: "â€" } }],
        },
        select: { id: true, slug: true, title_en: true, title_ar: true },
        orderBy: { updated_at: "asc" },
        take: MOJI_BLOG_CAP,
      });

      for (const post of blogCandidates) {
        if (Date.now() - cronStart > BUDGET_MS - 5_000) break;
        const diff = repairRecord(post, ["title_en", "title_ar"]);
        if (!diff) continue;
        try {
          await optimisticBlogPostUpdate(
            post.id,
            (current) => {
              const updates = repairRecord(
                {
                  title_en: (current.title_en as string) || null,
                  title_ar: (current.title_ar as string) || null,
                },
                ["title_en", "title_ar"],
              );
              if (!updates) return null;
              return {
                ...updates,
                enhancement_log: buildEnhancementLogEntry(
                  current.enhancement_log,
                  "mojibake_repair",
                  "content-auto-fix",
                  "Repaired UTF-8 double-encoded characters in title",
                ),
              };
            },
            { tag: "[content-auto-fix:section-29]" },
          );
          blogRepaired++;
          console.log(`[content-auto-fix:s29] ${post.slug}: mojibake repaired in title`);
        } catch (err) {
          console.warn(`[content-auto-fix:s29] ${post.slug} update failed:`, err instanceof Error ? err.message : err);
        }
      }

      // Event records (title + venue + descriptions)
      if (Date.now() - cronStart < BUDGET_MS - 3_000) {
        const eventCandidates = await prisma.event.findMany({
          where: {
            siteId: { in: activeSiteIds },
            OR: [
              { title_en: { contains: "Ã" } },
              { title_ar: { contains: "Ã" } },
              { venue: { contains: "Ã" } },
              { title_en: { contains: "â€" } },
              { venue: { contains: "â€" } },
            ],
          },
          select: { id: true, title_en: true, title_ar: true, venue: true, description_en: true, description_ar: true },
          take: MOJI_EVENT_CAP,
        });

        for (const ev of eventCandidates) {
          if (Date.now() - cronStart > BUDGET_MS - 2_000) break;
          const diff = repairRecord(ev as Record<string, string | null | undefined>, [
            "title_en",
            "title_ar",
            "venue",
            "description_en",
            "description_ar",
          ]);
          if (!diff) continue;
          try {
            await prisma.event.update({
              where: { id: ev.id },
              data: diff as Record<string, string>,
            });
            eventRepaired++;
          } catch (err) {
            console.warn(
              `[content-auto-fix:s29] event ${ev.id} update failed:`,
              err instanceof Error ? err.message : err,
            );
          }
        }
      }

      (results as Record<string, unknown>).mojibakeRepaired = blogRepaired + eventRepaired;
      if (blogRepaired + eventRepaired > 0) {
        console.log(`[content-auto-fix:s29] Repaired ${blogRepaired} blog + ${eventRepaired} event mojibake records`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`mojibake-repair: ${msg}`);
      console.warn("[content-auto-fix:s29] Section 29 failed:", msg);
    }
  }

  // ── Log + respond ──────────────────────────────────────────────────────────
  const durationMs = Date.now() - cronStart;
  const totalFixed =
    results.enhanced +
    results.enhancedLowScore +
    results.internalLinksInjected +
    results.affiliateLinksInjected +
    results.duplicateMetasFixed +
    results.arabicMetaGenerated +
    results.brokenLinksFixed +
    results.orphansFixed +
    results.thinUnpublished +
    results.duplicatesUnpublished +
    chronicIndexingFixed +
    wordCountArtifactsCleaned +
    results.arabicContentBackfilled +
    results.deadAffiliateLinksRemoved +
    results.staleAffiliateLinksRemoved +
    results.untrackedLinksWrapped +
    results.placeholderIdsFixed +
    results.notIndexedEnhanced +
    results.seoBoostEnhanced +
    results.affiliateDisclosuresInjected;
  const hasErrors = results.errors.length > 0;

  // Fire onCronFailure if everything failed — ensures dashboard visibility
  if (hasErrors && totalFixed === 0) {
    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    await onCronFailure({ jobName: "content-auto-fix", error: results.errors.join("; ") }).catch((err) =>
      console.warn("[content-auto-fix] onCronFailure hook failed:", err instanceof Error ? err.message : err),
    );
  }

  // Invalidate sitemap cache if any articles were published/unpublished
  const publishStateChanged =
    (results.thinUnpublished || 0) > 0 ||
    (((results as Record<string, unknown>).articlesRecovered as number) || 0) > 0 ||
    (results.duplicatesUnpublished || 0) > 0;
  if (publishStateChanged) {
    try {
      const { invalidateSitemapCache } = await import("@/lib/sitemap-cache");
      for (const sid of activeSiteIds) {
        invalidateSitemapCache(sid);
      }
    } catch (e) {
      console.warn("[content-auto-fix] Sitemap invalidation failed:", e instanceof Error ? e.message : e);
    }
  }

  await logCronExecution("content-auto-fix", hasErrors && totalFixed === 0 ? "failed" : "completed", {
    durationMs,
    itemsProcessed: totalFixed + results.enhanceFailed,
    itemsSucceeded: totalFixed,
    itemsFailed: results.enhanceFailed,
    errorMessage: hasErrors ? results.errors.slice(0, 3).join(" | ") : undefined,
    resultSummary: results,
  }).catch((e) => console.warn("[content-auto-fix] Log failed:", e instanceof Error ? e.message : e));

  const isSuccess = !(hasErrors && totalFixed === 0);
  return NextResponse.json({
    success: isSuccess,
    durationMs,
    results,
    summary: `Enhanced ${results.enhanced}+${results.enhancedLowScore}, links +${results.internalLinksInjected}, broken ${results.brokenLinksFixed}, orphans ${results.orphansFixed}, affiliates +${results.affiliateLinksInjected}, tracked ${results.untrackedLinksWrapped}, placeholders ${results.placeholderIdsFixed}, dead aff ${results.deadAffiliateLinksRemoved}, dupe metas ${results.duplicateMetasFixed}, ar meta ${results.arabicMetaGenerated}, ar backfill ${results.arabicContentBackfilled}, thin ${results.thinUnpublished}, dupes ${results.duplicatesUnpublished}, not-indexed-fix ${results.notIndexedEnhanced}, seo-boost ${results.seoBoostEnhanced}, ftc-disclosure +${results.affiliateDisclosuresInjected}`,
  });
}

export async function GET(request: NextRequest) {
  return handleAutoFix(request);
}

export async function POST(request: NextRequest) {
  return handleAutoFix(request);
}
