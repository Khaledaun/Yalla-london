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

const BUDGET_MS = 280_000; // 280s usable budget within 300s maxDuration
const MIN_WORD_COUNT = 1000;
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
    duplicatesFlagged: 0,
    arabicContentBackfilled: 0,
    errors: [] as string[],
  };

  // NOTE: Sections 1 (stuck recovery), 2 (heading fix) moved to content-auto-fix-lite

  // ── 1. WORD COUNT FIX (AI-powered, ~20s per draft) ───────────────────────
  // Find reservoir drafts with word_count < MIN_WORD_COUNT, oldest first
  if (Date.now() - cronStart < BUDGET_MS - 25_000) {
    try {
    const shortDrafts = await prisma.articleDraft.findMany({
      where: {
        site_id: { in: activeSiteIds },
        current_phase: "reservoir",
        OR: [
          { word_count: { lt: MIN_WORD_COUNT } },
          { word_count: null },
        ],
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
        console.warn(`[content-auto-fix] Budget low (${Math.round(budgetUsed / 1000)}s used) — stopping enhancement loop`);
        break;
      }

      const wordCount = (draft.assembled_html || "")
        .replace(/<[^>]+>/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;

      console.log(`[content-auto-fix] Enhancing draft ${draft.id} (keyword: "${draft.keyword}", words: ${wordCount})`);

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
  // Find reservoir drafts with quality_score < 70 but adequate word count.
  // These articles are stuck: content-selector won't promote them and the
  // word count query above won't find them. Without this, they sit forever.
  const QUALITY_THRESHOLD = 70;
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

          console.log(`[content-auto-fix] Enhancing low-score draft ${draft.id} (keyword: "${draft.keyword}", score: ${draft.quality_score})`);

          try {
            const result = await enhanceLowScore(draft as Record<string, unknown>);
            if (result.success) {
              results.enhancedLowScore++;
              console.log(`[content-auto-fix] Low-score enhanced ${draft.id}: score ${result.previousScore} → ${result.newScore}`);
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

      const { injectInternalLinks } = await import("@/lib/auto-remediate/engine") as { injectInternalLinks: (id: string, siteId: string) => Promise<{ success: boolean }> };
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
  if (Date.now() - cronStart < BUDGET_MS - 5_000) {
    try {
      // Build a Set of all real published slugs for O(1) lookup
      const realPosts = await prisma.blogPost.findMany({
        where: { published: true, deletedAt: null },
        select: { slug: true, title_en: true },
        orderBy: { created_at: "desc" },
        take: 500,
      });
      const validSlugs = new Set<string>(realPosts.map(p => p.slug));

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
            const match = realPosts.find(p => {
              const title = (p.title_en || "").toLowerCase();
              return topicWords.filter((w: string) => title.includes(w)).length >= 2;
            });
            if (match) return `<a ${pre}href="/blog/${match.slug}"${post2}>${anchor}</a>`;
            return anchor;
          }
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
          await prisma.blogPost.update({ where: { id: post.id }, data: updateData });
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

      const affiliatePattern = /booking\.com|halalbooking|agoda|getyourguide|viator|klook|boatbookings|class="affiliate|anrdoezrs\.net|dpbolvw\.net|tkqlhce\.com|jdoqocy\.com|kqzyfj\.com|affiliate-recommendation|data-affiliate-id/i;
      const { injectAffiliateLinks } = await import("@/lib/auto-remediate/engine") as { injectAffiliateLinks: (id: string, siteId: string) => Promise<{ success: boolean }> };

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
          OR: [
            { meta_title_ar: null },
            { meta_description_ar: null },
          ],
        },
        select: { id: true },
        take: 2,
      });

      if (postsMissingArMeta.length > 0) {
        const { generateArabicMeta } = await import("@/lib/auto-remediate/engine") as { generateArabicMeta: (id: string) => Promise<{ success: boolean }> };
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
      const orphans = allPosts.filter(p => (inboundCount.get(p.slug) || 0) === 0);
      let orphansFixed = 0;

      for (const orphan of orphans) {
        if (Date.now() - cronStart > BUDGET_MS - 3_000) break;
        if (orphansFixed >= 5) break;

        // Find best host article: same site, has content, doesn't already link to orphan
        const orphanWords = (orphan.title_en || "").toLowerCase().split(/\s+/).filter(w => w.length > 3);
        if (orphanWords.length < 2) continue;

        let bestHost: typeof allPosts[0] | null = null;
        let bestScore = 0;
        for (const candidate of allPosts) {
          if (candidate.id === orphan.id) continue;
          if (candidate.siteId !== orphan.siteId) continue;
          if ((candidate.content_en || "").includes(`/blog/${orphan.slug}`)) continue;
          // Score by title word overlap
          const candidateTitle = (candidate.title_en || "").toLowerCase();
          const score = orphanWords.filter(w => candidateTitle.includes(w)).length;
          if (score > bestScore) {
            bestScore = score;
            bestHost = candidate;
          }
        }

        if (!bestHost || bestScore < 1) continue;

        // Skip if the host already has any related section (from seo-agent or previous runs)
        // Prevents accumulation of multiple "Related:" blocks from different injectors.
        if ((bestHost.content_en || "").includes("related-articles") || (bestHost.content_en || "").includes("related-link")) continue;

        // Append a "Related reading" link at the end of the host article
        const linkHtml = `\n<p class="related-link"><strong>Related:</strong> <a href="/blog/${orphan.slug}" class="internal-link">${orphan.title_en}</a></p>`;
        await prisma.blogPost.update({
          where: { id: bestHost.id },
          data: { content_en: (bestHost.content_en || "") + linkHtml },
        });
        orphansFixed++;
        console.log(`[content-auto-fix] Fixed orphan: "${orphan.slug}" — linked from "${bestHost.slug}"`);
      }
      results.orphansFixed = orphansFixed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`orphan-resolution: ${msg}`);
      console.warn("[content-auto-fix] Orphan page resolution failed:", msg);
    }
  }

  // ── 12. THIN CONTENT AUTO-UNPUBLISH — published blog articles below 1000 words ──
  // Blog articles that bypassed the quality gate (1000w min as per standards.ts).
  // Aligned to match CONTENT_QUALITY.minWords (was 800, now 1000).
  // News/info pages have their own lower thresholds via CONTENT_TYPE_THRESHOLDS.
  // GUARD: Skip articles with active campaign enhancement tasks — unpublishing mid-campaign
  // wastes AI budget and erases the duplicate/thin flag marker.
  if (Date.now() - cronStart < BUDGET_MS - 3_000) {
    try {
      // Get IDs of articles currently being enhanced by campaigns
      let activeCampaignPostIds: Set<string> = new Set();
      try {
        const activeTasks = await prisma.campaignItem.findMany({
          where: { status: { in: ["pending", "processing"] } },
          select: { targetId: true },
        });
        activeCampaignPostIds = new Set(activeTasks.map((t: { targetId: string }) => t.targetId));
      } catch {
        // CampaignItem table may not exist — proceed without filter
      }

      // Only check articles published more than 2 hours ago — freshly created
      // articles may still be in the enhancement pipeline (campaigns, SEO agent).
      // Without this guard, a just-published 300-word article could be immediately
      // unpublished before the expansion pass runs.
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const allPublished = await prisma.blogPost.findMany({
        where: {
          siteId: { in: activeSiteIds },
          published: true,
          deletedAt: null,
          content_en: { not: "" },
          created_at: { lt: twoHoursAgo },
        },
        select: { id: true, slug: true, title_en: true, content_en: true, category_id: true },
        orderBy: { created_at: "asc" },
        take: 50,
      });

      let thinUnpublished = 0;
      for (const post of allPublished) {
        // Skip articles being enhanced by active campaign
        if (activeCampaignPostIds.has(post.id)) {
          console.log(`[content-auto-fix] Skipping thin check for "${post.slug}" — active campaign task`);
          continue;
        }
        const text = (post.content_en || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        const wordCount = text.split(" ").filter(Boolean).length;
        if (wordCount < 1000) {
          await prisma.blogPost.update({
            where: { id: post.id },
            data: {
              published: false,
              meta_description_en: `[AUTO-UNPUBLISHED: ${wordCount}w < 1000w minimum] ${(post.title_en || "").slice(0, 100)}`,
            },
          });
          thinUnpublished++;
          console.log(`[content-auto-fix] Unpublished thin article: "${post.slug}" (${wordCount}w)`);
          if (thinUnpublished >= 5) break;
        }
      }
      results.thinUnpublished = thinUnpublished;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`thin-content: ${msg}`);
      console.warn("[content-auto-fix] Thin content unpublish failed:", msg);
    }
  }

  // ── 12. DUPLICATE CONTENT DETECTION — flag near-duplicate published articles ──
  // Compares title similarity between all published articles per site.
  // If two articles have > 80% word overlap in title, the newer one is flagged.
  if (Date.now() - cronStart < BUDGET_MS - 3_000) {
    try {
      let duplicatesFlagged = 0;
      for (const siteId of activeSiteIds) {
        if (Date.now() - cronStart > BUDGET_MS - 2_000) break;
        const sitePosts = await prisma.blogPost.findMany({
          where: {
            siteId,
            published: true,
            deletedAt: null,
          },
          select: { id: true, slug: true, title_en: true, created_at: true, meta_description_en: true },
          orderBy: { created_at: "asc" },
          take: 100,
        });

        // Compare each pair for title similarity using word overlap (Jaccard)
        for (let i = 0; i < sitePosts.length; i++) {
          for (let j = i + 1; j < sitePosts.length; j++) {
            const wordsA = new Set((sitePosts[i].title_en || "").toLowerCase().split(/\s+/).filter(w => w.length > 2));
            const wordsB = new Set((sitePosts[j].title_en || "").toLowerCase().split(/\s+/).filter(w => w.length > 2));
            if (wordsA.size < 3 || wordsB.size < 3) continue;
            let intersection = 0;
            for (const w of wordsA) { if (wordsB.has(w)) intersection++; }
            const union = new Set([...wordsA, ...wordsB]).size;
            const jaccard = union > 0 ? intersection / union : 0;

            if (jaccard > 0.8) {
              // Flag the newer article (j) — unpublish it to stop cannibalization
              const newer = sitePosts[j];
              // Skip if already flagged
              if ((newer.meta_description_en || "").includes("[DUPLICATE-FLAGGED]")) continue;
              await prisma.blogPost.update({
                where: { id: newer.id },
                data: {
                  published: false,
                  meta_description_en: `[DUPLICATE-FLAGGED: overlaps with "${sitePosts[i].slug}"] ${(newer.meta_description_en || "").replace(/\[DUPLICATE-FLAGGED[^\]]*\]\s*/, "").slice(0, 100)}`,
                },
              });
              duplicatesFlagged++;
              console.log(`[content-auto-fix] Flagged duplicate: "${newer.slug}" overlaps with "${sitePosts[i].slug}" (jaccard=${jaccard.toFixed(2)})`);
              if (duplicatesFlagged >= 3) break;
            }
          }
          if (duplicatesFlagged >= 3) break;
        }
      }
      results.duplicatesFlagged = duplicatesFlagged;
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
          select: { id: true, content_en: true, title_en: true, meta_title_en: true, meta_description_en: true, seo_score: true, tags: true },
        });
        if (!post) continue;

        const contentText = (post.content_en || "").replace(/<[^>]+>/g, " ").trim();
        const wordCount = contentText.split(/\s+/).filter(Boolean).length;

        const issues: string[] = [];
        const updateData: Record<string, unknown> = {};

        // Fix 1: Thin content → unpublish (will be caught by Section 12 too, but be explicit)
        if (wordCount < 1000) {
          issues.push(`thin (${wordCount}w)`);
        }

        // Fix 2: Missing or short meta description → auto-generate from content
        const metaDesc = post.meta_description_en || "";
        if (metaDesc.length < 120 || metaDesc.startsWith("[AUTO-")) {
          const firstParagraph = contentText.split(/[.!?]/).slice(0, 2).join(". ").trim();
          if (firstParagraph.length >= 60) {
            const trimmedMeta = firstParagraph.length > 155 ? firstParagraph.slice(0, 152) + "..." : firstParagraph + ".";
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
          await prisma.blogPost.update({
            where: { id: post.id },
            data: updateData,
          });
        }

        // Reset submission attempts so IndexNow resubmits with improved content
        // Only reset if we actually fixed something (meta desc or meta title)
        if (issues.some(i => i.startsWith("fixed"))) {
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
        console.log(`[content-auto-fix] Chronic indexing fix: ${slug} (${page.submission_attempts} attempts, ${issues.join(", ") || "no fixable issues"})`);
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
          OR: [
            { content_en: { contains: " words)" } },
            { content_ar: { contains: " words)" } },
          ],
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
          await prisma.blogPost.update({
            where: { id: post.id },
            data: {
              ...(cleanEn !== post.content_en ? { content_en: cleanEn } : {}),
              ...(cleanAr !== post.content_ar ? { content_ar: cleanAr } : {}),
            },
          });
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
      const dupeContentPosts: Array<{ id: string; title_en: string; slug: string; content_en: string }> = await prisma.$queryRawUnsafe(
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
        console.log(`[content-auto-fix] Found ${dupeContentPosts.length} articles with English-in-Arabic fallback — backfilling`);
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
              { role: "system" as const, content: site?.systemPromptEN || "You are a professional Arabic translator specializing in luxury travel content." },
              { role: "user" as const, content: `Translate this English travel article into Arabic. Maintain the HTML structure, headings (h2, h3), paragraph tags, and links. Write naturally in Modern Standard Arabic (فصحى). Add dir="rtl" lang="ar" to the wrapping element. Keep all href URLs unchanged. Do NOT translate brand names, hotel names, or restaurant names.\n\nTitle: ${post.title_en}\n\nContent:\n${enContent}` },
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

  // ── Log + respond ──────────────────────────────────────────────────────────
  const durationMs = Date.now() - cronStart;
  const totalFixed = results.enhanced + results.enhancedLowScore + results.internalLinksInjected + results.affiliateLinksInjected + results.duplicateMetasFixed + results.arabicMetaGenerated + results.brokenLinksFixed + results.orphansFixed + results.thinUnpublished + results.duplicatesFlagged + chronicIndexingFixed + wordCountArtifactsCleaned + results.arabicContentBackfilled;
  const hasErrors = results.errors.length > 0;

  // Fire onCronFailure if everything failed — ensures dashboard visibility
  if (hasErrors && totalFixed === 0) {
    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    await onCronFailure({ jobName: "content-auto-fix", error: results.errors.join("; ") }).catch(err => console.warn("[content-auto-fix] onCronFailure hook failed:", err instanceof Error ? err.message : err));
  }

  await logCronExecution("content-auto-fix", hasErrors && totalFixed === 0 ? "failed" : "completed", {
    durationMs,
    itemsProcessed: totalFixed + results.enhanceFailed,
    itemsSucceeded: totalFixed,
    itemsFailed: results.enhanceFailed,
    errorMessage: hasErrors ? results.errors.slice(0, 3).join(" | ") : undefined,
    resultSummary: results,
  }).catch((e) => console.warn("[content-auto-fix] Log failed:", e instanceof Error ? e.message : e));

  return NextResponse.json({
    success: true,
    durationMs,
    results,
    summary: `Enhanced ${results.enhanced}+${results.enhancedLowScore}, links +${results.internalLinksInjected}, broken ${results.brokenLinksFixed}, orphans ${results.orphansFixed}, affiliates +${results.affiliateLinksInjected}, dupe metas ${results.duplicateMetasFixed}, ar meta ${results.arabicMetaGenerated}, ar backfill ${results.arabicContentBackfilled}, thin ${results.thinUnpublished}, dupes ${results.duplicatesFlagged}`,
  });
}

export async function GET(request: NextRequest) {
  return handleAutoFix(request);
}

export async function POST(request: NextRequest) {
  return handleAutoFix(request);
}
