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
const MAX_WORD_COUNT_ENHANCES = 1; // 1 word-count fix (~20s), leaves room for 1 low-score fix
const MAX_LOW_SCORE_ENHANCES = 1;  // 1 low-score fix (~20s), independent of word-count results

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
    stuckUnstuck: 0,
    stuckRejected: 0,
    headingsFixed: 0,
    internalLinksInjected: 0,
    affiliateLinksInjected: 0,
    duplicateMetasFixed: 0,
    arabicMetaGenerated: 0,
    errors: [] as string[],
  };

  // ── 1. STUCK DRAFT RECOVERY (runs FIRST — lightweight, critical) ─────────
  // Drafts stuck in active phases for 1+ hour indicate the content-builder
  // crashed mid-phase or an AI call hung. Reset phase_started_at so the
  // builder picks them up again. If they've already failed 3+ times, reject
  // them — they won't succeed.
  //
  // Previously this was section 5 (after expensive AI enhancement calls)
  // which meant budget exhaustion could prevent it from ever running,
  // leaving 33+ drafts stuck indefinitely.
  try {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const stuckDrafts = await prisma.articleDraft.findMany({
      where: {
        site_id: { in: activeSiteIds },
        current_phase: {
          in: ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"],
        },
        updated_at: { lt: oneHourAgo },
      },
      select: { id: true, current_phase: true, keyword: true, phase_attempts: true },
      take: 20,
    });

    let unstuck = 0;
    let rejected = 0;
    for (const draft of stuckDrafts) {
      if (Date.now() - cronStart > BUDGET_MS - 5_000) break; // budget guard per iteration
      const attempts = draft.phase_attempts || 0;
      const maxAttempts = draft.current_phase === "drafting" ? 5 : 3;

      if (attempts >= maxAttempts) {
        // Too many failed attempts — reject it so it doesn't block the pipeline forever
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: {
            current_phase: "rejected",
            rejection_reason: `Stuck in "${draft.current_phase}" for 1+ hours after ${attempts} attempts — auto-rejected by content-auto-fix`,
            completed_at: new Date(),
            updated_at: new Date(),
          },
        });
        rejected++;
        console.log(`[content-auto-fix] Rejected stuck draft ${draft.id} ("${draft.keyword}") — ${attempts} attempts in "${draft.current_phase}"`);
      } else {
        // Reset the soft-lock so the builder can re-pick it
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: {
            phase_started_at: null, // clears the soft-lock
            updated_at: new Date(),
          },
        });
        unstuck++;
        console.log(`[content-auto-fix] Unstuck draft ${draft.id} ("${draft.keyword}") in "${draft.current_phase}" — ${attempts} prior attempts`);
      }
    }

    results.stuckUnstuck = unstuck;
    results.stuckRejected = rejected;

    if (unstuck > 0 || rejected > 0) {
      console.log(`[content-auto-fix] Stuck draft recovery: ${unstuck} unstuck, ${rejected} rejected`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.errors.push(`stuck-recovery: ${msg}`);
    console.warn("[content-auto-fix] Stuck draft recovery failed:", msg);
  }

  // ── 2. HEADING HIERARCHY FIX ─────────────────────────────────────────────
  // Published articles with multiple H1 tags hurt SEO. Lightweight DB reads.
  if (Date.now() - cronStart < BUDGET_MS - 3_000) {
    try {
      // Retry once on transient Prisma errors (cold start / connection pool issues)
      let recentPosts: Array<{ id: string; slug: string; content_en: string | null }> = [];
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          recentPosts = await prisma.blogPost.findMany({
            where: {
              siteId: { in: activeSiteIds },
              published: true,
              deletedAt: null,
            },
            select: { id: true, slug: true, content_en: true },
            take: 20,
            orderBy: { created_at: "desc" },
          });
          break; // success
        } catch (retryErr) {
          if (attempt === 0) {
            console.warn("[content-auto-fix] heading-fix query failed, retrying:", retryErr instanceof Error ? retryErr.message.substring(0, 200) : String(retryErr));
            await new Promise(r => setTimeout(r, 500));
          } else {
            throw retryErr; // second attempt failed — rethrow
          }
        }
      }

      let headingsFixed = 0;
      for (const post of recentPosts) {
        if (!post.content_en || post.content_en.trim().length === 0) continue;
        let html = post.content_en;
        let modified = false;

        // Count H1 tags
        const h1Matches = html.match(/<h1[\s>]/gi) || [];
        if (h1Matches.length > 1) {
          // Keep the first H1, demote the rest to H2
          let h1Count = 0;
          html = html.replace(/<h1([\s>])/gi, (match: string, after: string) => {
            h1Count++;
            if (h1Count > 1) return `<h2${after}`;
            return match;
          });
          // Fix closing tags: count from start, demote matching closes
          let closeCount = 0;
          html = html.replace(/<\/h1>/gi, () => {
            closeCount++;
            if (closeCount > 1) return "</h2>";
            return "</h1>";
          });
          modified = true;
        }

        // Check H2 count — if 0, the article has no subsections (bad for SEO)
        const h2Count = (html.match(/<h2[\s>]/gi) || []).length;
        if (h2Count === 0 && html.length > 2000) {
          console.warn(`[content-auto-fix] Article ${post.slug} has 0 H2 headings — needs manual review`);
        }

        if (modified) {
          await prisma.blogPost.update({
            where: { id: post.id },
            data: { content_en: html },
          });
          headingsFixed++;
          console.log(`[content-auto-fix] Fixed heading hierarchy for "${post.slug}" (${h1Matches.length} H1s → 1 H1)`);
        }
      }

      results.headingsFixed = headingsFixed;
    } catch (err) {
      // Prisma validation errors dump the full query before the actual error reason.
      // Extract the actionable part: everything after the last newline block (the reason),
      // falling back to the last 200 chars if no clear separator is found.
      const fullMsg = err instanceof Error ? err.message : String(err);
      let msg: string;
      // Prisma errors end with the actual reason after a blank line
      const lastDoubleNewline = fullMsg.lastIndexOf("\n\n");
      if (lastDoubleNewline > 0 && lastDoubleNewline < fullMsg.length - 5) {
        msg = fullMsg.substring(lastDoubleNewline + 2).trim();
      } else if (fullMsg.length > 300) {
        msg = fullMsg.substring(fullMsg.length - 200);
      } else {
        msg = fullMsg;
      }
      results.errors.push(`heading-fix: ${msg}`);
      console.warn("[content-auto-fix] Heading hierarchy fix failed:", msg);
    }
  }

  // ── 3. WORD COUNT FIX (expensive — runs after lightweight fixes) ─────────
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

  // ── 5. META DESCRIPTION TRIM — BlogPosts ──────────────────────────────────
  if (Date.now() - cronStart < BUDGET_MS - 5_000) {
    try {
      // Only fetch posts that actually need trimming (>160 chars).
      // Previously fetched 100 posts including ones that didn't need changes,
      // exhausting the DB connection pool with unnecessary reads + individual updates.
      const longMetaPosts = await prisma.$queryRawUnsafe<Array<{ id: string; meta_description_en: string }>>(
        `SELECT id, meta_description_en FROM "BlogPost" WHERE "siteId" = ANY($1::text[]) AND "deletedAt" IS NULL AND "meta_description_en" IS NOT NULL AND LENGTH("meta_description_en") > 160 LIMIT 20`,
        activeSiteIds,
      );

      for (const post of longMetaPosts) {
        if (Date.now() - cronStart > BUDGET_MS - 3_000) break;
        const desc = post.meta_description_en || "";
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`meta-trim-posts: ${msg}`);
      console.warn("[content-auto-fix] Meta trim (BlogPost) failed:", msg);
    }
  }

  // ── 5b. META DESCRIPTION TRIM — BlogPosts (Arabic) ──────────────────────
  if (Date.now() - cronStart < BUDGET_MS - 5_000) {
    try {
      const longMetaPostsAr = await prisma.$queryRawUnsafe<Array<{ id: string; meta_description_ar: string }>>(
        `SELECT id, meta_description_ar FROM "BlogPost" WHERE "siteId" = ANY($1::text[]) AND "deletedAt" IS NULL AND "meta_description_ar" IS NOT NULL AND LENGTH("meta_description_ar") > 160 LIMIT 20`,
        activeSiteIds,
      );

      for (const post of longMetaPostsAr) {
        if (Date.now() - cronStart > BUDGET_MS - 3_000) break;
        const desc = post.meta_description_ar || "";
        let trimmed = desc.substring(0, META_MAX_CHARS);
        const lastSpace = trimmed.lastIndexOf(" ");
        if (lastSpace > META_MAX_CHARS - 20) trimmed = trimmed.substring(0, lastSpace);
        trimmed = trimmed.replace(/[.,;:!?،؛]$/, "") + "…";

        await prisma.blogPost.update({
          where: { id: post.id },
          data: { meta_description_ar: trimmed },
        });
        results.metaTrimmedPosts++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`meta-trim-posts-ar: ${msg}`);
      console.warn("[content-auto-fix] Meta trim AR (BlogPost) failed:", msg);
    }
  }

  // ── 6. META DESCRIPTION TRIM — ArticleDrafts ──────────────────────────────
  if (Date.now() - cronStart < BUDGET_MS - 3_000) {
    try {
      const draftsWithMeta = await prisma.articleDraft.findMany({
        where: {
          site_id: { in: activeSiteIds },
          current_phase: { in: ["reservoir", "published"] },
          seo_meta: { not: null },
        },
        select: { id: true, seo_meta: true },
        take: 20,
      });

      for (const draft of draftsWithMeta) {
        if (Date.now() - cronStart > BUDGET_MS - 2_000) break;
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

  // ── 7. INTERNAL LINK INJECTION — articles missing internal links ──────────
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
  const totalFixed = results.enhanced + results.enhancedLowScore + results.metaTrimmedPosts + results.metaTrimmedDrafts + (results.stuckUnstuck || 0) + (results.stuckRejected || 0) + (results.headingsFixed || 0) + results.internalLinksInjected + results.affiliateLinksInjected + results.duplicateMetasFixed + results.arabicMetaGenerated;
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
    summary: `Enhanced ${results.enhanced} word-count + ${results.enhancedLowScore} low-score drafts, trimmed ${results.metaTrimmedPosts + results.metaTrimmedDrafts} metas, unstuck ${results.stuckUnstuck} drafts, rejected ${results.stuckRejected} stuck, headings ${results.headingsFixed}, links +${results.internalLinksInjected}, affiliates +${results.affiliateLinksInjected}, dupe metas ${results.duplicateMetasFixed}, Arabic meta ${results.arabicMetaGenerated}`,
  });
}

export async function GET(request: NextRequest) {
  return handleAutoFix(request);
}

export async function POST(request: NextRequest) {
  return handleAutoFix(request);
}
