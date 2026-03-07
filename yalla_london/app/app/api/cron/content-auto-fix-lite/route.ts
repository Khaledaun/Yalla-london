export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Content Auto-Fix LITE — Lightweight DB-Only Fixes
 *
 * Split from content-auto-fix to avoid connection pool exhaustion.
 * This route handles ONLY fast, DB-only operations:
 *
 * 1. Stuck draft recovery (reset/reject stuck pipeline drafts)
 * 2. Heading hierarchy fix (demote duplicate H1s to H2)
 * 3. Meta description trim — BlogPost EN
 * 4. Meta description trim — BlogPost AR
 * 5. Meta description trim — ArticleDraft seo_meta
 * 6. Title & meta artifact cleanup (strip AI-generated artifacts from DB)
 *
 * Runs every 4 hours. Completes in 5-15 seconds.
 * The HEAVY version (content-auto-fix) handles AI enhancement,
 * link injection, and Arabic meta generation — runs 2x/day.
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

const BUDGET_MS = 53_000;
const META_MAX_CHARS = 155;

async function handleAutoFixLite(request: NextRequest) {
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
    stuckUnstuck: 0,
    stuckRejected: 0,
    headingsFixed: 0,
    metaTrimmedPosts: 0,
    metaTrimmedDrafts: 0,
    titleArtifactsCleaned: 0,
    errors: [] as string[],
  };

  // ── 1. STUCK DRAFT RECOVERY ────────────────────────────────────────────
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

    for (const draft of stuckDrafts) {
      if (Date.now() - cronStart > BUDGET_MS - 5_000) break;
      const attempts = draft.phase_attempts || 0;
      const maxAttempts = draft.current_phase === "drafting" ? 5 : 3;

      if (attempts >= maxAttempts) {
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: {
            current_phase: "rejected",
            rejection_reason: `Stuck in "${draft.current_phase}" for 1+ hours after ${attempts} attempts — auto-rejected by content-auto-fix-lite`,
            completed_at: new Date(),
            updated_at: new Date(),
          },
        });
        results.stuckRejected++;
      } else {
        await prisma.articleDraft.update({
          where: { id: draft.id },
          data: {
            phase_started_at: null,
            updated_at: new Date(),
          },
        });
        results.stuckUnstuck++;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.errors.push(`stuck-recovery: ${msg}`);
    console.warn("[auto-fix-lite] Stuck draft recovery failed:", msg);
  }

  // ── 2. HEADING HIERARCHY FIX ───────────────────────────────────────────
  if (Date.now() - cronStart < BUDGET_MS - 3_000) {
    try {
      const recentPosts = await prisma.blogPost.findMany({
        where: {
          siteId: { in: activeSiteIds },
          published: true,
          deletedAt: null,
        },
        select: { id: true, slug: true, content_en: true, content_ar: true },
        take: 50,
        orderBy: { created_at: "desc" },
      });

      for (const post of recentPosts) {
        if (!post.content_en || post.content_en.trim().length === 0) continue;
        let htmlEn = post.content_en;
        let htmlAr = post.content_ar || "";
        let modified = false;

        // Demote ALL <h1> to <h2> in content body — the blog page template already
        // provides the H1 via the article title. Even a single <h1> in body content
        // causes "Multiple H1 headings" in SEO audits.
        const h1InEn = /<h1[\s>]/i.test(htmlEn);
        const h1InAr = /<h1[\s>]/i.test(htmlAr);

        if (h1InEn) {
          htmlEn = htmlEn.replace(/<h1(\s[^>]*)?>|<h1>/gi, "<h2$1>").replace(/<\/h1>/gi, "</h2>");
          modified = true;
        }
        if (h1InAr) {
          htmlAr = htmlAr.replace(/<h1(\s[^>]*)?>|<h1>/gi, "<h2$1>").replace(/<\/h1>/gi, "</h2>");
          modified = true;
        }

        if (modified) {
          const updateData: Record<string, string> = {};
          if (h1InEn) updateData.content_en = htmlEn;
          if (h1InAr) updateData.content_ar = htmlAr;
          await prisma.blogPost.update({
            where: { id: post.id },
            data: updateData,
          });
          results.headingsFixed++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`heading-fix: ${msg}`);
      console.warn("[auto-fix-lite] Heading fix failed:", msg);
    }
  }

  // ── 3. META DESCRIPTION TRIM — BlogPosts EN ───────────────────────────
  if (Date.now() - cronStart < BUDGET_MS - 5_000) {
    try {
      const longMetaPosts = (await prisma.$queryRawUnsafe(
        `SELECT id, meta_description_en FROM "BlogPost" WHERE "siteId" = ANY($1::text[]) AND "deletedAt" IS NULL AND "meta_description_en" IS NOT NULL AND LENGTH("meta_description_en") > 160 LIMIT 20`,
        activeSiteIds,
      )) as Array<{ id: string; meta_description_en: string }>;

      for (const post of longMetaPosts) {
        if (Date.now() - cronStart > BUDGET_MS - 3_000) break;
        const desc = post.meta_description_en || "";
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
      results.errors.push(`meta-trim-en: ${msg}`);
      console.warn("[auto-fix-lite] Meta trim EN failed:", msg);
    }
  }

  // ── 4. META DESCRIPTION TRIM — BlogPosts AR ───────────────────────────
  if (Date.now() - cronStart < BUDGET_MS - 5_000) {
    try {
      const longMetaPostsAr = (await prisma.$queryRawUnsafe(
        `SELECT id, meta_description_ar FROM "BlogPost" WHERE "siteId" = ANY($1::text[]) AND "deletedAt" IS NULL AND "meta_description_ar" IS NOT NULL AND LENGTH("meta_description_ar") > 160 LIMIT 20`,
        activeSiteIds,
      )) as Array<{ id: string; meta_description_ar: string }>;

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
      results.errors.push(`meta-trim-ar: ${msg}`);
      console.warn("[auto-fix-lite] Meta trim AR failed:", msg);
    }
  }

  // ── 5. META DESCRIPTION TRIM — ArticleDrafts ──────────────────────────
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
      console.warn("[auto-fix-lite] Meta trim drafts failed:", msg);
    }
  }

  // ── 6. TITLE & META ARTIFACT CLEANUP ──────────────────────────────────
  if (Date.now() - cronStart < BUDGET_MS - 5_000) {
    try {
      const { sanitizeTitle, sanitizeMetaDescription, hasTitleArtifacts } = await import("@/lib/content-pipeline/title-sanitizer");

      // Scan recent posts for title artifacts
      const postsToCheck = await prisma.blogPost.findMany({
        where: {
          siteId: { in: activeSiteIds },
          deletedAt: null,
        },
        select: {
          id: true,
          title_en: true,
          meta_title_en: true,
          meta_description_en: true,
        },
        take: 50,
        orderBy: { updated_at: "desc" },
      });

      for (const post of postsToCheck) {
        if (Date.now() - cronStart > BUDGET_MS - 3_000) break;

        const updates: Record<string, string> = {};

        // Check title_en for artifacts
        if (hasTitleArtifacts(post.title_en)) {
          const cleaned = sanitizeTitle(post.title_en);
          if (cleaned && cleaned !== post.title_en) {
            updates.title_en = cleaned;
          }
        }

        // Check meta_title_en for artifacts
        if (post.meta_title_en && hasTitleArtifacts(post.meta_title_en)) {
          const cleaned = sanitizeTitle(post.meta_title_en);
          if (cleaned && cleaned !== post.meta_title_en) {
            updates.meta_title_en = cleaned;
          }
        }

        // Check meta_description_en for artifacts (not just overlength — also AI echoes)
        if (post.meta_description_en && hasTitleArtifacts(post.meta_description_en)) {
          const cleaned = sanitizeMetaDescription(post.meta_description_en);
          if (cleaned && cleaned !== post.meta_description_en) {
            updates.meta_description_en = cleaned;
          }
        }

        if (Object.keys(updates).length > 0) {
          await prisma.blogPost.update({
            where: { id: post.id },
            data: updates,
          });
          results.titleArtifactsCleaned++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`title-artifact-cleanup: ${msg}`);
      console.warn("[auto-fix-lite] Title artifact cleanup failed:", msg);
    }
  }

  // ── Log + respond ──────────────────────────────────────────────────────
  const durationMs = Date.now() - cronStart;
  const totalFixed = results.stuckUnstuck + results.stuckRejected + results.headingsFixed + results.metaTrimmedPosts + results.metaTrimmedDrafts + results.titleArtifactsCleaned;
  const hasErrors = results.errors.length > 0;

  if (hasErrors && totalFixed === 0) {
    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    await onCronFailure({ jobName: "content-auto-fix-lite", error: results.errors.join("; ") }).catch(err => console.warn("[auto-fix-lite] onCronFailure hook failed:", err instanceof Error ? err.message : err));
  }

  await logCronExecution("content-auto-fix-lite", hasErrors && totalFixed === 0 ? "failed" : "completed", {
    durationMs,
    itemsProcessed: totalFixed,
    itemsSucceeded: totalFixed,
    resultSummary: results,
  }).catch(err => console.warn("[auto-fix-lite] logCronExecution failed:", err instanceof Error ? err.message : err));

  return NextResponse.json({ success: true, durationMs, ...results });
}

export async function GET(request: NextRequest) {
  return handleAutoFixLite(request);
}

export async function POST(request: NextRequest) {
  return handleAutoFixLite(request);
}
