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
import { logManualAction } from "@/lib/action-logger";

// Allow up to 5 minutes — enhancement calls Grok (~30s each), promotion ~10s each.
// 4 articles × 40s each = 160s well within Vercel Pro limit.
export const maxDuration = 300;

export const POST = withAdminAuth(async (req: NextRequest) => {
  const start = Date.now();

  let locale: "en" | "ar" | "both" = "both";
  let count = 2; // per language
  let specificDraftId: string | null = null;
  let skipDedup = false;

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
    // Accept skipDedup — bypass title/keyword cannibalization checks
    if (body.skipDedup === true) {
      skipDedup = true;
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
        logManualAction(req, { action: "force-publish", resource: "draft", resourceId: specificDraftId, siteId, success: false, summary: "Draft not found", error: "Draft not found", fix: "The draft may have been deleted. Check the Content Matrix.", durationMs: Date.now() - start }).catch(() => {});
        return NextResponse.json({ success: false, error: "Draft not found" }, { status: 404 });
      }
      if (draft.current_phase !== "reservoir") {
        logManualAction(req, { action: "force-publish", resource: "draft", resourceId: specificDraftId, siteId, success: false, summary: `Draft is in '${draft.current_phase}' phase, not reservoir`, error: `Wrong phase: ${draft.current_phase}`, fix: "Only reservoir drafts can be force-published. Wait for pipeline to complete or re-queue the draft.", durationMs: Date.now() - start }).catch(() => {});
        return NextResponse.json({ success: false, error: `Draft is in '${draft.current_phase}' phase, not reservoir` }, { status: 400 });
      }
      const keyword = (draft.keyword as string) || "unknown";
      const score = (draft.quality_score as number) || 0;
      const html = ((draft.assembled_html as string) || "");
      const wordCount = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
      let draftToPublish = draft as Record<string, unknown>;

      if (wordCount < 1000) {
        log(`[force-publish] Word count ${wordCount} < 1000 — attempting enhancement...`);
        const enhResult = await enhanceReservoirDraft(draft as Record<string, unknown>);
        if (!enhResult.success) {
          log(`[force-publish] Enhancement failed: ${enhResult.error} — publishing as-is (force-publish overrides)`);
          // Force-publish means publish regardless — don't skip the article
        } else {
          const refreshed = await prisma.articleDraft.findUnique({ where: { id: specificDraftId } });
          if (refreshed) draftToPublish = refreshed as Record<string, unknown>;
        }
      }

      // Hard floor: even force-publish refuses truly empty content
      if (wordCount < 200) {
        logManualAction(req, { action: "force-publish", resource: "draft", resourceId: specificDraftId, siteId, success: false, summary: `Refused: "${keyword}" only has ${wordCount} words (hard floor: 200)`, error: "Content too thin for any publish path", durationMs: Date.now() - start }).catch(() => {});
        return NextResponse.json({ success: false, error: `Article only has ${wordCount} words. Even force-publish requires at least 200 words. This content would damage the site's SEO.` }, { status: 400 });
      }

      try {
        // Admin explicitly chose this draft — skip the pre-pub gate
        const result = await promoteToBlogPost(draftToPublish, prisma, SITES, getSiteDomain, { skipGate: true, skipDedup });
        if (result) {
          log(`[force-publish] Published "${keyword}" → BlogPost ${result.blogPostId}`);
          // Track URL for indexing (fire-and-forget)
          try {
            const { ensureUrlTracked } = await import("@/lib/seo/indexing-service");
            const domain = getSiteDomain(siteId);
            ensureUrlTracked(`https://${domain}/blog/${result.slug}`, siteId, `blog/${result.slug}`).catch(e => console.warn("[force-publish] URL tracking failed:", e instanceof Error ? e.message : e));
            ensureUrlTracked(`https://${domain}/ar/blog/${result.slug}`, siteId, `ar/blog/${result.slug}`).catch(e => console.warn("[force-publish] AR URL tracking failed:", e instanceof Error ? e.message : e));
          } catch { /* non-fatal */ }
          logManualAction(req, { action: "force-publish", resource: "draft", resourceId: specificDraftId, siteId, success: true, summary: `Published "${keyword}" → BlogPost ${result.blogPostId}`, durationMs: Date.now() - start, details: { blogPostId: result.blogPostId, keyword, locale: draft.locale, score } }).catch(() => {});
          return NextResponse.json({ success: true, published: [{ ...result, locale: draft.locale }], skipped: [], durationMs: Date.now() - start, logs });
        } else {
          logManualAction(req, { action: "force-publish", resource: "draft", resourceId: specificDraftId, siteId, success: false, summary: `Slug collision or missing content for "${keyword}"`, error: "Slug collision or missing content", fix: "The article slug may already exist. Check Content Matrix for duplicates.", durationMs: Date.now() - start }).catch(() => {});
          return NextResponse.json({ success: false, error: "Slug collision or missing content — check logs" }, { status: 400 });
        }
      } catch (promoteErr) {
        const msg = promoteErr instanceof Error ? promoteErr.message : String(promoteErr);
        logManualAction(req, { action: "force-publish", resource: "draft", resourceId: specificDraftId, siteId, success: false, summary: `Promotion error for "${keyword}"`, error: msg, fix: "Check database connectivity and article content.", durationMs: Date.now() - start }).catch(() => {});
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
          log(`[force-publish] Word count ${wordCount} < 1000 — attempting enhancement...`);
          const enhResult = await enhanceReservoirDraft(draft as Record<string, unknown>);
          if (!enhResult.success) {
            log(`[force-publish] Enhancement failed for "${keyword}": ${enhResult.error} — publishing as-is (force-publish overrides)`);
            // Force-publish means publish regardless — don't skip the article
          } else {
            log(`[force-publish] Enhanced "${keyword}": score ${enhResult.previousScore}→${enhResult.newScore}`);
            // Re-fetch enhanced draft
            const refreshed = await prisma.articleDraft.findUnique({ where: { id: draftId } });
            if (!refreshed) {
              skipped.push({ draftId, keyword, reason: "Draft disappeared after enhancement", locale: lang });
              continue;
            }
            draftToPublish = refreshed as Record<string, unknown>;
          }
        }

        // Hard floor: even force-publish refuses truly empty content
        if (wordCount < 200) {
          log(`[force-publish] REFUSED "${keyword}" — only ${wordCount} words (hard floor: 200)`);
          skipped.push({ draftId, keyword, reason: `Only ${wordCount} words — hard floor is 200`, locale: lang });
          continue;
        }

        // ── Step 2: Promote to BlogPost — admin override skips pre-pub gate ────
        try {
          const result = await promoteToBlogPost(draftToPublish, prisma, SITES, getSiteDomain, { skipGate: true, skipDedup });
          if (result) {
            published.push({ ...result, locale: lang });
            published_this_locale++;
            log(`[force-publish] Published "${keyword}" → BlogPost ${result.blogPostId}`);
            // Track URL for indexing (fire-and-forget)
            try {
              const { ensureUrlTracked } = await import("@/lib/seo/indexing-service");
              const domain = getSiteDomain(siteId);
              ensureUrlTracked(`https://${domain}/blog/${result.slug}`, siteId, `blog/${result.slug}`).catch(e => console.warn("[force-publish] URL tracking failed:", e instanceof Error ? e.message : e));
              ensureUrlTracked(`https://${domain}/ar/blog/${result.slug}`, siteId, `ar/blog/${result.slug}`).catch(e => console.warn("[force-publish] AR URL tracking failed:", e instanceof Error ? e.message : e));
            } catch { /* non-fatal */ }
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

    logManualAction(req, {
      action: "force-publish-batch",
      resource: "draft",
      siteId,
      success: published.length > 0,
      summary: `Force-published ${published.length} article(s), skipped ${skipped.length}`,
      error: published.length === 0 ? "No articles could be published" : undefined,
      fix: published.length === 0 ? "Check reservoir for eligible drafts. Run content builder to move drafts through the pipeline." : undefined,
      durationMs,
      details: { locale, count, published, skipped },
    }).catch(() => {});

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
    logManualAction(req, { action: "force-publish", resource: "draft", siteId, success: false, summary: "Force-publish crashed", error: msg, fix: "Check database and AI provider connectivity.", durationMs: Date.now() - start }).catch(() => {});
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
