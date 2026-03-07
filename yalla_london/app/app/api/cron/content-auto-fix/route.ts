export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

const BUDGET_MS = 53_000;
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

      const affiliatePattern = /booking\.com|halalbooking|agoda|getyourguide|viator|klook|boatbookings|class="affiliate/i;
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

  // ── Log + respond ──────────────────────────────────────────────────────────
  const durationMs = Date.now() - cronStart;
  const totalFixed = results.enhanced + results.enhancedLowScore + results.internalLinksInjected + results.affiliateLinksInjected + results.duplicateMetasFixed + results.arabicMetaGenerated;
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
    summary: `Enhanced ${results.enhanced} word-count + ${results.enhancedLowScore} low-score drafts, links +${results.internalLinksInjected}, affiliates +${results.affiliateLinksInjected}, dupe metas ${results.duplicateMetasFixed}, Arabic meta ${results.arabicMetaGenerated}`,
  });
}

export async function GET(request: NextRequest) {
  return handleAutoFix(request);
}

export async function POST(request: NextRequest) {
  return handleAutoFix(request);
}
