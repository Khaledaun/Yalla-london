export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Content Auto-Fix Cron
 *
 * Runs twice daily (11am + 6pm UTC) and fixes three categories of issues:
 *
 * 1. WORD COUNT — Finds reservoir drafts with < 1,000 words and calls
 *    enhanceReservoirDraft() to expand them. Each expansion takes ~20s
 *    so we process up to 2 drafts per run within the 53s budget.
 *
 * 2. LOW QUALITY SCORE — Finds reservoir drafts with adequate word count
 *    (>= 1,000) but quality_score < 70. These articles were previously stuck
 *    forever: content-selector wouldn't promote them and word-count fix
 *    wouldn't find them. Now they get enhanced to boost their score.
 *
 * 3. META DESCRIPTION — Finds BlogPosts where meta_description_en is
 *    > 160 chars and auto-trims to 155 chars (safe max). Also trims
 *    ArticleDraft seo_meta.metaDescription if over-length.
 *
 * This is a self-healing cron: it never fails a publish cycle — it just
 * silently expands articles so the content-selector can promote them.
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

const BUDGET_MS = 53_000;
const META_MAX_CHARS = 155;
const MIN_WORD_COUNT = 1000;
const MAX_ENHANCES_PER_RUN = 2; // safe within 53s budget (~20s per enhance)

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
    metaTrimmedPosts: 0,
    metaTrimmedDrafts: 0,
    errors: [] as string[],
  };

  // ── 1. WORD COUNT FIX ──────────────────────────────────────────────────────
  // Find reservoir drafts with word_count < MIN_WORD_COUNT, oldest first
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
      take: MAX_ENHANCES_PER_RUN,
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

  // ── 2. LOW QUALITY SCORE FIX ──────────────────────────────────────────────
  // Find reservoir drafts with quality_score < 70 but adequate word count.
  // These articles are stuck: content-selector won't promote them and the
  // word count query above won't find them. Without this, they sit forever.
  const QUALITY_THRESHOLD = 70;
  if (Date.now() - cronStart < BUDGET_MS - 25_000 && results.enhanced < MAX_ENHANCES_PER_RUN) {
    try {
      const slotsLeft = MAX_ENHANCES_PER_RUN - results.enhanced;
      const lowScoreDrafts = await prisma.articleDraft.findMany({
        where: {
          site_id: { in: activeSiteIds },
          current_phase: "reservoir",
          quality_score: { lt: QUALITY_THRESHOLD },
          word_count: { gte: MIN_WORD_COUNT }, // adequate words — only score is low
          assembled_html: { not: null },
        },
        orderBy: { updated_at: "asc" },
        take: slotsLeft,
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

  // ── 3. META DESCRIPTION TRIM — BlogPosts ──────────────────────────────────
  if (Date.now() - cronStart < BUDGET_MS - 5_000) {
    try {
      const longMetaPosts = await prisma.blogPost.findMany({
        where: {
          siteId: { in: activeSiteIds },
          deletedAt: null,
          meta_description_en: { not: null },
        },
        select: { id: true, meta_description_en: true },
        take: 100,
      });

      for (const post of longMetaPosts) {
        const desc = post.meta_description_en || "";
        if (desc.length > 160) {
          // Trim at last word boundary before META_MAX_CHARS
          let trimmed = desc.substring(0, META_MAX_CHARS);
          const lastSpace = trimmed.lastIndexOf(" ");
          if (lastSpace > META_MAX_CHARS - 20) trimmed = trimmed.substring(0, lastSpace);
          trimmed = trimmed.replace(/[.,;:!?]$/, "") + "…";

          await prisma.blogPost.update({
            where: { id: post.id },
            data: { meta_description_en: trimmed },
          });
          results.metaTrimmedPosts++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`meta-trim-posts: ${msg}`);
      console.warn("[content-auto-fix] Meta trim (BlogPost) failed:", msg);
    }
  }

  // ── 4. META DESCRIPTION TRIM — ArticleDrafts ──────────────────────────────
  if (Date.now() - cronStart < BUDGET_MS - 3_000) {
    try {
      const draftsWithMeta = await prisma.articleDraft.findMany({
        where: {
          site_id: { in: activeSiteIds },
          current_phase: { in: ["reservoir", "published"] },
          seo_meta: { not: null },
        },
        select: { id: true, seo_meta: true },
        take: 100,
      });

      for (const draft of draftsWithMeta) {
        const meta = draft.seo_meta as Record<string, unknown> | null;
        if (!meta) continue;

        const desc = (meta.metaDescription as string) || "";
        if (desc.length > 160) {
          let trimmed = desc.substring(0, META_MAX_CHARS);
          const lastSpace = trimmed.lastIndexOf(" ");
          if (lastSpace > META_MAX_CHARS - 20) trimmed = trimmed.substring(0, lastSpace);
          trimmed = trimmed.replace(/[.,;:!?]$/, "") + "…";

          await prisma.articleDraft.update({
            where: { id: draft.id },
            data: {
              seo_meta: { ...meta, metaDescription: trimmed },
              updated_at: new Date(),
            },
          });
          results.metaTrimmedDrafts++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`meta-trim-drafts: ${msg}`);
      console.warn("[content-auto-fix] Meta trim (ArticleDraft) failed:", msg);
    }
  }

  // ── Log + respond ──────────────────────────────────────────────────────────
  const durationMs = Date.now() - cronStart;
  const totalFixed = results.enhanced + results.enhancedLowScore + results.metaTrimmedPosts + results.metaTrimmedDrafts;
  const hasErrors = results.errors.length > 0;

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
    summary: `Enhanced ${results.enhanced} word-count drafts, ${results.enhancedLowScore} low-score drafts, trimmed ${results.metaTrimmedPosts + results.metaTrimmedDrafts} meta descriptions`,
  });
}

export async function GET(request: NextRequest) {
  return handleAutoFix(request);
}

export async function POST(request: NextRequest) {
  return handleAutoFix(request);
}
