/**
 * Force Publish — Admin endpoint
 *
 * Manually finds the best reservoir articles (by quality_score), enhances them
 * to meet the pre-pub gate (word count, experience signals, etc.), and publishes
 * them as BlogPosts. No time-budget constraints — uses Vercel's 300s max.
 *
 * POST /api/admin/force-publish
 *   body (optional): { locale?: "en" | "ar" | "both", count?: 1 | 2 }
 *
 * Called by: Admin dashboard "Force Publish" button
 *
 * Auth: withAdminAuth (admin session required)
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { getDefaultSiteId, getActiveSiteIds } from "@/config/sites";

// Allow up to 5 minutes — enhancement calls Grok (~30s each), promotion ~10s each.
// 4 articles × 40s each = 160s well within Vercel Pro limit.
export const maxDuration = 300;

export const POST = withAdminAuth(async (req: NextRequest) => {
  const start = Date.now();

  let locale: "en" | "ar" | "both" = "both";
  let count = 2; // per language
  let specificDraftId: string | null = null;

  let siteId = getDefaultSiteId();

  try {
    const body = await req.json().catch(() => ({}));
    if (body.locale && ["en", "ar", "both"].includes(body.locale)) locale = body.locale;
    if (body.count && [1, 2].includes(body.count)) count = body.count;
    // Accept siteId override — validate it's a known active site
    if (body.siteId && typeof body.siteId === "string" && getActiveSiteIds().includes(body.siteId)) {
      siteId = body.siteId;
    }
    // Accept specific draftId — publish that exact draft instead of picking by score
    if (body.draftId && typeof body.draftId === "string") {
      specificDraftId = body.draftId;
    }
  } catch {
    // Use defaults
  }

  const logs: string[] = [];
  const log = (msg: string) => { console.log(msg); logs.push(msg); };

  try {
    const { prisma } = await import("@/lib/db");
    const { SITES, getSiteDomain } = await import("@/config/sites");
    const { enhanceReservoirDraft } = await import("@/lib/content-pipeline/enhance-runner");
    const { promoteToBlogPost } = await import("@/lib/content-pipeline/select-runner");

    // ── Find top reservoir candidates per locale ───────────────────────────────

    const localesToProcess: Array<"en" | "ar"> = locale === "both" ? ["en", "ar"] : [locale];
    const published: Array<{ draftId: string; blogPostId: string; keyword: string; score: number; locale: string }> = [];
    const skipped: Array<{ draftId: string; keyword: string; reason: string; locale: string }> = [];

    // ── Specific draft mode: publish one exact draft by ID ───────────────────
    if (specificDraftId) {
      log(`[force-publish] Publishing specific draft ${specificDraftId}...`);
      const draft = await prisma.articleDraft.findUnique({ where: { id: specificDraftId } });
      if (!draft) {
        return NextResponse.json({ success: false, error: "Draft not found" }, { status: 404 });
      }
      if (draft.current_phase !== "reservoir") {
        return NextResponse.json({ success: false, error: `Draft is in '${draft.current_phase}' phase, not reservoir` }, { status: 400 });
      }
      const keyword = (draft.keyword as string) || "unknown";
      const score = (draft.quality_score as number) || 0;
      const html = ((draft.assembled_html as string) || "");
      const wordCount = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
      let draftToPublish = draft as Record<string, unknown>;

      if (wordCount < 1000) {
        log(`[force-publish] Word count ${wordCount} < 1000 — enhancing...`);
        const enhResult = await enhanceReservoirDraft(draft as Record<string, unknown>);
        if (!enhResult.success) {
          return NextResponse.json({ success: false, error: `Enhancement failed: ${enhResult.error}` }, { status: 500 });
        }
        const refreshed = await prisma.articleDraft.findUnique({ where: { id: specificDraftId } });
        if (refreshed) draftToPublish = refreshed as Record<string, unknown>;
      }

      try {
        // Admin explicitly chose this draft — skip the pre-pub gate
        const result = await promoteToBlogPost(draftToPublish, prisma, SITES, getSiteDomain, { skipGate: true });
        if (result) {
          log(`[force-publish] Published "${keyword}" → BlogPost ${result.blogPostId}`);
          return NextResponse.json({ success: true, published: [{ ...result, locale: draft.locale }], skipped: [], durationMs: Date.now() - start, logs });
        } else {
          return NextResponse.json({ success: false, error: "Slug collision or missing content — check logs" }, { status: 400 });
        }
      } catch (promoteErr) {
        const msg = promoteErr instanceof Error ? promoteErr.message : String(promoteErr);
        return NextResponse.json({ success: false, error: `Promotion error: ${msg}` }, { status: 500 });
      }
    }

    // ── Batch mode: pick best reservoir articles by score ────────────────────
    for (const lang of localesToProcess) {
      log(`[force-publish] Looking for top ${count} ${lang.toUpperCase()} reservoir articles...`);

      const candidates = await prisma.articleDraft.findMany({
        where: {
          site_id: siteId,
          current_phase: "reservoir",
          locale: lang,
          assembled_html: { not: null },
        },
        orderBy: [{ quality_score: "desc" }, { created_at: "asc" }],
        take: count * 2, // fetch extras in case some fail
      });

      log(`[force-publish] Found ${candidates.length} ${lang.toUpperCase()} candidates`);

      let published_this_locale = 0;

      for (const draft of candidates) {
        if (published_this_locale >= count) break;

        const draftId = draft.id;
        const keyword = draft.keyword as string || "unknown";
        const score = (draft.quality_score as number) || 0;
        const html = (draft.assembled_html as string) || "";
        const wordCount = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

        log(`[force-publish] Processing ${lang.toUpperCase()} draft ${draftId} — "${keyword}" (score: ${score}, words: ${wordCount})`);

        // ── Step 1: Enhance if below 1,000 words (pre-pub gate hard block) ────
        let draftToPublish = draft as Record<string, unknown>;

        if (wordCount < 1000) {
          log(`[force-publish] Word count ${wordCount} < 1000 — enhancing with Grok...`);
          const enhResult = await enhanceReservoirDraft(draft as Record<string, unknown>);
          if (!enhResult.success) {
            log(`[force-publish] Enhancement failed for "${keyword}": ${enhResult.error} — skipping`);
            skipped.push({ draftId, keyword, reason: `Enhancement failed: ${enhResult.error}`, locale: lang });
            continue;
          }
          log(`[force-publish] Enhanced "${keyword}": score ${enhResult.previousScore}→${enhResult.newScore}`);
          // Re-fetch enhanced draft
          const refreshed = await prisma.articleDraft.findUnique({ where: { id: draftId } });
          if (!refreshed) {
            skipped.push({ draftId, keyword, reason: "Draft disappeared after enhancement", locale: lang });
            continue;
          }
          draftToPublish = refreshed as Record<string, unknown>;
        }

        // ── Step 2: Promote to BlogPost — admin override skips pre-pub gate ────
        try {
          const result = await promoteToBlogPost(draftToPublish, prisma, SITES, getSiteDomain, { skipGate: true });
          if (result) {
            published.push({ ...result, locale: lang });
            published_this_locale++;
            log(`[force-publish] Published "${keyword}" → BlogPost ${result.blogPostId}`);
          } else {
            log(`[force-publish] promoteToBlogPost returned null for "${keyword}" — slug collision or missing content`);
            skipped.push({ draftId, keyword, reason: "Slug collision or missing content (check logs)", locale: lang });
          }
        } catch (promoteErr) {
          const msg = promoteErr instanceof Error ? promoteErr.message : String(promoteErr);
          log(`[force-publish] promoteToBlogPost threw for "${keyword}": ${msg}`);
          skipped.push({ draftId, keyword, reason: `Promotion error: ${msg}`, locale: lang });
        }
      }

      if (published_this_locale === 0) {
        log(`[force-publish] No ${lang.toUpperCase()} articles could be published this run`);
      }
    }

    const durationMs = Date.now() - start;
    log(`[force-publish] Done in ${(durationMs / 1000).toFixed(1)}s — published: ${published.length}, skipped: ${skipped.length}`);

    return NextResponse.json({
      success: true,
      published,
      skipped,
      durationMs,
      logs,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[force-publish] Fatal error:", msg);
    return NextResponse.json({ success: false, error: msg, logs, durationMs: Date.now() - start }, { status: 500 });
  }
});

export const GET = withAdminAuth(async () => {
  // Convenience: GET returns the endpoint info so the dashboard button can confirm it's alive
  return NextResponse.json({
    endpoint: "POST /api/admin/force-publish",
    description: "Enhances and publishes the best reservoir articles (2 EN + 2 AR)",
    params: {
      locale: '"en" | "ar" | "both" (default: "both")',
      count: "1 | 2 per language (default: 2)",
    },
  });
});
