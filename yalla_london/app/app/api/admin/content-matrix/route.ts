/**
 * Detect article type from keyword/title — used to apply correct quality thresholds
 * in the pre-publication gate. News, information, and guide articles are intentionally
 * shorter than blog posts; applying blog thresholds permanently blocks them.
 */
function detectArticleType(keyword: string): "news" | "information" | "guide" | "blog" {
  const k = keyword.toLowerCase();
  // News signals
  if (/\b(news|alert|update|announcement|breaking|strike|closure|warning|ban)\b/.test(k)) return "news";
  // Information / reference signals
  if (/\b(what is|how (does|do)|facts about|history of|overview|introduction to|guide to|faq)\b/.test(k)) return "information";
  // Guide / practical signals
  if (/\b(guide|tips|advice|how to|top \d|best \d|ways to|checklist|step[s]? to|itinerary|transport|getting around|travel (with|by))\b/.test(k)) return "guide";
  return "blog";
}

/**
 * Content Matrix API
 *
 * GET  — Full article list merging BlogPosts (published) + ArticleDrafts (in-pipeline).
 *        Returns rich metadata: quality/SEO scores, word count, internal link count,
 *        indexing status, pipeline phase progress, stuck detection, plain-English errors.
 *
 * POST — Actions on articles and drafts:
 *        gate_check   — Run pre-publication gate on a draft
 *        re_queue     — Reset draft back to research phase
 *        delete_draft — Hard-delete a draft
 *        delete_post  — Soft-delete a blog post
 *        unpublish    — Unpublish a blog post (keep record)
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { getActiveSiteIds, getDefaultSiteId } from "@/config/sites";
import { interpretError } from "@/lib/error-interpreter";
import { logManualAction } from "@/lib/action-logger";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ContentItem {
  id: string;
  type: "published" | "draft";
  title: string;
  titleAr: string | null;
  slug: string | null;
  url: string | null;
  locale: string;
  siteId: string;
  status: string;
  generatedAt: string;
  publishedAt: string | null;
  qualityScore: number | null;
  seoScore: number | null;
  wordCount: number;
  internalLinksCount: number;
  indexingStatus: string | null;
  coverageState: string | null;
  lastSubmittedAt: string | null;
  lastCrawledAt: string | null;
  gscClicks: number | null;
  gscImpressions: number | null;
  rejectionReason: string | null;
  lastError: string | null;
  plainError: string | null;
  phase: string | null;
  phaseProgress: number;
  hoursInPhase: number;
  pairedDraftId: string | null;
  metaTitleEn: string | null;
  metaDescriptionEn: string | null;
  tags: string[];
  topicTitle: string | null;
}

interface ContentMatrixSummary {
  total: number;
  published: number;
  reservoir: number;
  inPipeline: number;
  rejected: number;
  stuck: number;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Strip HTML tags and count whitespace-delimited words. */
function wordCount(html: string | null | undefined): number {
  if (!html) return 0;
  return html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

/** Count internal links (href starting with /) in an HTML string. */
function countInternalLinks(html: string | null | undefined): number {
  if (!html) return 0;
  const matches = html.match(/href=["']\//g);
  return matches ? matches.length : 0;
}

/** Compute hours since a given date. */
function hoursAgo(date: Date): number {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60);
}

/** Compute phase progress 0-100 from sections_completed / sections_total. */
function phaseProgress(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((completed / total) * 100));
}

/** Determine the effective status label for a content item. */
function resolveStatus(
  type: "published" | "draft",
  phase: string | null,
  updatedAt: Date,
  isPublished?: boolean,
): string {
  if (type === "published") return isPublished ? "published" : "unpublished";
  if (!phase) return "draft";
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const activePhases = ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"];
  if (activePhases.includes(phase) && updatedAt < threeHoursAgo) return "stuck";
  return phase;
}

// ─────────────────────────────────────────────
// GET handler
// ─────────────────────────────────────────────

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const { searchParams } = new URL(req.url);

    const activeSiteIds = getActiveSiteIds();
    const defaultSiteId = getDefaultSiteId();

    const siteId = searchParams.get("siteId") || searchParams.get("site_id") || defaultSiteId;
    const locale = searchParams.get("locale") || null;
    const statusFilter = searchParams.get("status") || null;
    const search = searchParams.get("search") || null;
    const sort = searchParams.get("sort") || "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    // Guard: only allow querying active sites
    const targetSiteId = activeSiteIds.includes(siteId) ? siteId : defaultSiteId;

    // ── Pre-fetch all URLIndexingStatus for this site in one query ──
    let indexingMap: Map<string, {
      status: string;
      coverageState: string | null;
      lastSubmittedAt: Date | null;
      lastCrawledAt: Date | null;
      gscClicks: number | null;
      gscImpressions: number | null;
    }> = new Map();
    try {
      const indexingRows = await prisma.uRLIndexingStatus.findMany({
        where: { site_id: targetSiteId },
        select: {
          slug: true,
          status: true,
          coverage_state: true,
          last_submitted_at: true,
          last_crawled_at: true,
          inspection_result: true,
        },
      });
      for (const row of indexingRows) {
        if (row.slug) {
          indexingMap.set(row.slug, {
            status: row.status,
            coverageState: row.coverage_state ?? null,
            lastSubmittedAt: row.last_submitted_at,
            lastCrawledAt: row.last_crawled_at,
            gscClicks: null, // Enriched below from GscPagePerformance
            gscImpressions: null,
          });
        }
      }
    } catch (err) {
      console.warn("[content-matrix] indexing status pre-fetch failed:", err instanceof Error ? err.message : err);
    }

    const items: ContentItem[] = [];

    // ── Query BlogPosts ───────────────────────────────────
    const postWhere: Record<string, unknown> = {
      siteId: targetSiteId,
      deletedAt: null,
    };
    // Note: BlogPost is inherently bilingual (title_en + title_ar) — no locale field exists.
    // Locale filtering applies to ArticleDraft only (below).
    if (search) {
      postWhere.OR = [
        { title_en: { contains: search, mode: "insensitive" } },
        { title_ar: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }
    if (statusFilter === "published") postWhere.published = true;
    if (statusFilter === "unpublished") postWhere.published = false;

    // Skip BlogPosts if filter explicitly targets draft states
    const draftOnlyStatuses = ["reservoir", "research", "outline", "drafting", "assembly", "images", "seo", "scoring", "rejected", "stuck"];
    const skipPosts = statusFilter && draftOnlyStatuses.includes(statusFilter);

    if (!skipPosts) {
      try {
        const posts = await prisma.blogPost.findMany({
          where: postWhere,
          orderBy: { created_at: "desc" },
          take: 500, // cap to avoid memory issues
          select: {
            id: true,
            title_en: true,
            title_ar: true,
            slug: true,
            siteId: true,
            published: true,
            created_at: true,
            seo_score: true,
            meta_title_en: true,
            meta_description_en: true,
            tags: true,
            content_en: true,
          },
        });

        for (const post of posts) {
          const slug = post.slug ?? null;
          const indexData = slug ? indexingMap.get(slug) : null;
          const wc = wordCount(post.content_en);
          const ilCount = countInternalLinks(post.content_en);

          items.push({
            id: post.id,
            type: "published",
            title: post.title_en,
            titleAr: post.title_ar ?? null,
            slug,
            url: slug ? `/blog/${slug}` : null,
            locale: "en",
            siteId: post.siteId ?? targetSiteId,
            status: resolveStatus("published", null, post.created_at, post.published),
            generatedAt: post.created_at.toISOString(),
            publishedAt: post.published ? post.created_at.toISOString() : null,
            qualityScore: null,
            seoScore: post.seo_score ?? null,
            wordCount: wc,
            internalLinksCount: ilCount,
            indexingStatus: indexData?.status ?? null,
            coverageState: indexData?.coverageState ?? null,
            lastSubmittedAt: indexData?.lastSubmittedAt?.toISOString() ?? null,
            lastCrawledAt: indexData?.lastCrawledAt?.toISOString() ?? null,
            gscClicks: indexData?.gscClicks ?? null,
            gscImpressions: indexData?.gscImpressions ?? null,
            rejectionReason: null,
            lastError: null,
            plainError: null,
            phase: null,
            phaseProgress: 100,
            hoursInPhase: 0,
            pairedDraftId: null,
            metaTitleEn: post.meta_title_en ?? null,
            metaDescriptionEn: post.meta_description_en ?? null,
            tags: post.tags ?? [],
            topicTitle: null,
          });
        }
      } catch (err) {
        console.warn("[content-matrix] BlogPost query failed:", err instanceof Error ? err.message : err);
      }
    }

    // ── Query ArticleDrafts ───────────────────────────────
    const skipPosts2 = statusFilter === "published" || statusFilter === "unpublished";

    if (!skipPosts2) {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

      const draftWhere: Record<string, unknown> = {
        site_id: targetSiteId,
      };
      if (locale) draftWhere.locale = locale;
      if (statusFilter === "active") {
        draftWhere.current_phase = { notIn: ["published", "rejected"] };
      } else if (statusFilter === "reservoir") {
        draftWhere.current_phase = "reservoir";
      } else if (statusFilter === "rejected") {
        draftWhere.current_phase = "rejected";
      } else if (statusFilter === "stuck") {
        draftWhere.current_phase = {
          notIn: ["published", "rejected", "reservoir"],
        };
        draftWhere.updatedAt = { lt: threeHoursAgo };
      } else if (statusFilter && draftOnlyStatuses.includes(statusFilter)) {
        draftWhere.current_phase = statusFilter;
      }

      if (search) {
        draftWhere.keyword = { contains: search, mode: "insensitive" };
      }

      try {
        const drafts = await prisma.articleDraft.findMany({
          where: draftWhere,
          orderBy: { updated_at: "desc" },
          take: 500,
          select: {
            id: true,
            keyword: true,
            locale: true,
            site_id: true,
            current_phase: true,
            quality_score: true,
            seo_score: true,
            word_count: true,
            assembled_html: true,
            seo_meta: true,
            created_at: true,
            updated_at: true,
            phase_started_at: true,
            sections_completed: true,
            sections_total: true,
            last_error: true,
            rejection_reason: true,
            paired_draft_id: true,
            topic_title: true,
          },
        });

        for (const draft of drafts) {
          // Derive slug from seo_meta if available
          let slug: string | null = null;
          try {
            const meta = draft.seo_meta as Record<string, unknown> | null;
            if (meta && typeof meta.slug === "string") slug = meta.slug;
          } catch (slugErr) {
            console.warn("[content-matrix] slug extraction from seo_meta failed:", slugErr instanceof Error ? slugErr.message : String(slugErr));
          }

          const wc = draft.word_count ?? wordCount(draft.assembled_html);
          const ilCount = countInternalLinks(draft.assembled_html);
          const indexData = slug ? indexingMap.get(slug) : null;

          const meta = draft.seo_meta as Record<string, unknown> | null;
          const metaTitleEn = meta && typeof meta.metaTitle === "string" ? meta.metaTitle : null;
          const metaDescriptionEn = meta && typeof meta.metaDescription === "string" ? meta.metaDescription : null;

          const phaseStart = draft.phase_started_at ?? draft.updated_at;
          const hoursInPhase = Math.round(hoursAgo(phaseStart) * 10) / 10;
          const progress = phaseProgress(draft.sections_completed, draft.sections_total);

          const interpreted = draft.last_error ? interpretError(draft.last_error) : null;

          items.push({
            id: draft.id,
            type: "draft",
            title: draft.keyword,
            titleAr: null,
            slug,
            url: null,
            locale: draft.locale,
            siteId: draft.site_id,
            status: resolveStatus("draft", draft.current_phase, draft.updated_at),
            generatedAt: draft.created_at.toISOString(),
            publishedAt: null,
            qualityScore: draft.quality_score ?? null,
            seoScore: draft.seo_score ?? null,
            wordCount: wc,
            internalLinksCount: ilCount,
            indexingStatus: indexData?.status ?? null,
            coverageState: indexData?.coverageState ?? null,
            lastSubmittedAt: indexData?.lastSubmittedAt?.toISOString() ?? null,
            lastCrawledAt: indexData?.lastCrawledAt?.toISOString() ?? null,
            gscClicks: indexData?.gscClicks ?? null,
            gscImpressions: indexData?.gscImpressions ?? null,
            rejectionReason: draft.rejection_reason ?? null,
            lastError: draft.last_error ?? null,
            plainError: interpreted?.plain ?? null,
            phase: draft.current_phase,
            phaseProgress: progress,
            hoursInPhase,
            pairedDraftId: draft.paired_draft_id ?? null,
            metaTitleEn,
            metaDescriptionEn,
            tags: [],
            topicTitle: draft.topic_title ?? null,
          });
        }
      } catch (err) {
        console.warn("[content-matrix] ArticleDraft query failed:", err instanceof Error ? err.message : err);
      }
    }

    // ── Sort ──────────────────────────────────────────────
    if (sort === "oldest") {
      items.sort((a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime());
    } else if (sort === "score") {
      items.sort((a, b) => (b.seoScore ?? 0) - (a.seoScore ?? 0));
    } else {
      // newest (default)
      items.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    }

    // ── Summary ───────────────────────────────────────────
    const summary: ContentMatrixSummary = {
      total: items.length,
      published: items.filter((i) => i.status === "published").length,
      reservoir: items.filter((i) => i.status === "reservoir").length,
      inPipeline: items.filter(
        (i) =>
          i.type === "draft" &&
          !["published", "rejected", "reservoir", "stuck"].includes(i.status),
      ).length,
      rejected: items.filter((i) => i.status === "rejected").length,
      stuck: items.filter((i) => i.status === "stuck").length,
    };

    // ── Enrich with real GSC performance data from GscPagePerformance table ──
    // The URL Inspection API (inspection_result) does NOT contain clicks/impressions.
    // Real data comes from GSC Search Analytics, synced by the gsc-sync cron.
    try {
      const { getPagePerformance, getPageTrends } = await import("@/lib/seo/gsc-trend-analysis");
      const { getSiteDomain } = await import("@/config/sites");
      const siteBaseUrl = getSiteDomain(targetSiteId);
      const slugToUrl = (slug: string | null) => slug ? `${siteBaseUrl}/blog/${slug}` : "";
      const itemUrls = items
        .filter((i) => i.slug)
        .map((i) => slugToUrl(i.slug));
      const [perfMap, trendMap] = await Promise.all([
        getPagePerformance(targetSiteId, itemUrls),
        getPageTrends(targetSiteId, itemUrls),
      ]);
      for (const item of items) {
        if (!item.slug) continue;
        const fullUrl = slugToUrl(item.slug);
        const perf = perfMap.get(fullUrl);
        const trend = trendMap.get(fullUrl);
        if (perf) {
          item.gscClicks = perf.clicks;
          item.gscImpressions = perf.impressions;
        }
        if (trend) {
          (item as unknown as Record<string, unknown>).gscClicksTrend = trend.clicksChangePercent;
          (item as unknown as Record<string, unknown>).gscImpressionsTrend = trend.impressionsChangePercent;
        }
      }
    } catch (err) {
      console.warn("[content-matrix] GSC enrichment failed:", err instanceof Error ? err.message : String(err));
    }

    // ── Pagination ────────────────────────────────────────
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / limit);
    const start = (page - 1) * limit;
    const paginatedItems = items.slice(start, start + limit);

    return NextResponse.json({
      articles: paginatedItems,
      summary,
      siteId: targetSiteId,
      pagination: {
        page,
        limit,
        total: totalItems,
        totalPages,
      },
    });
  } catch (err) {
    console.warn("[content-matrix] GET handler error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to load content matrix" }, { status: 500 });
  }
});

// ─────────────────────────────────────────────
// POST handler — actions
// ─────────────────────────────────────────────

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const body = await req.json();
    const { action, draftId, blogPostId } = body as {
      action: string;
      draftId?: string;
      blogPostId?: string;
      slug?: string;
    };

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    // ── gate_check ──────────────────────────────────────
    if (action === "gate_check") {
      if (!draftId) {
        return NextResponse.json({ error: "draftId is required for gate_check" }, { status: 400 });
      }

      try {
        const draft = await prisma.articleDraft.findUnique({
          where: { id: draftId },
          select: {
            keyword: true,
            assembled_html: true,
            assembled_html_alt: true,
            seo_meta: true,
            seo_score: true,
            locale: true,
            site_id: true,
          },
        });

        if (!draft) {
          return NextResponse.json({ error: "Draft not found" }, { status: 404 });
        }

        const { runPrePublicationGate } = await import("@/lib/seo/orchestrator/pre-publication-gate");
        const { getSiteDomain: getDomain } = await import("@/config/sites");

        const meta = draft.seo_meta as Record<string, unknown> | null;
        const slug = (meta?.slug as string) || draft.keyword.toLowerCase().replace(/\s+/g, "-");

        // Detect article type to apply correct quality thresholds.
        // Priority: explicit articleType in seo_meta → keyword-based detection → default "blog".
        // This determines the URL prefix fed to the gate, which maps to per-type thresholds
        // (news 150w, information 300w, guide 400w, blog 1000w).
        const explicitType = meta?.articleType as string | undefined;
        const articleType = explicitType || detectArticleType(draft.keyword);
        const urlPrefix =
          articleType === "news" ? "/news"
          : articleType === "information" ? "/information"
          : articleType === "guide" ? "/guides"
          : "/blog";
        const targetUrl = `${urlPrefix}/${slug}`;
        const siteUrl = `https://${getDomain(draft.site_id)}`;

        // Locale-aware content mapping:
        // Arabic drafts (locale="ar") store their body in assembled_html (not assembled_html_alt).
        // Passing an Arabic body as content_en causes the gate to report "0 chars English content"
        // and block publication — when the content is actually complete, just in Arabic.
        const isArabicDraft = draft.locale === "ar";
        const gateResult = await runPrePublicationGate(
          targetUrl,
          {
            title_en: draft.keyword,
            meta_title_en: (meta?.metaTitle as string) ?? undefined,
            meta_description_en: (meta?.metaDescription as string) ?? undefined,
            content_en: isArabicDraft ? undefined : (draft.assembled_html ?? undefined),
            content_ar: isArabicDraft ? (draft.assembled_html ?? undefined) : (draft.assembled_html_alt ?? undefined),
            locale: draft.locale,
            seo_score: draft.seo_score ?? undefined,
          },
          siteUrl,
          { skipRouteCheck: true },
        );

        // Map to the shape the cockpit page expects:
        // { check, pass, label, detail, isBlocker }
        const checks = gateResult.checks.map((c) => ({
          check: c.name,
          pass: c.passed,
          label: c.message,
          detail: null as string | null, // pre-pub gate doesn't return per-check fix text yet
          isBlocker: !c.passed && c.severity !== "warning",
        }));

        logManualAction(req, { action: "gate-check", resource: "draft", resourceId: draftId, success: true, summary: `Gate check on "${draft.keyword}": ${checks.filter((c: { pass: boolean }) => c.pass).length}/${checks.length} passed`, details: { checks } }).catch(() => {});
        return NextResponse.json({ checks });
      } catch (err) {
        console.warn("[content-matrix] gate_check failed:", err instanceof Error ? err.message : err);
        logManualAction(req, { action: "gate-check", resource: "draft", resourceId: draftId, success: false, summary: "Gate check crashed", error: err instanceof Error ? err.message : String(err), fix: "Check database connectivity and pre-publication gate code." }).catch(() => {});
        return NextResponse.json(
          { success: false, error: "Gate check failed" },
          { status: 500 },
        );
      }
    }

    // ── re_queue ─────────────────────────────────────────
    if (action === "re_queue") {
      if (!draftId) {
        return NextResponse.json({ error: "draftId is required for re_queue" }, { status: 400 });
      }

      try {
        const existing = await prisma.articleDraft.findUnique({ where: { id: draftId }, select: { id: true, keyword: true, current_phase: true } });
        if (!existing) {
          logManualAction(req, { action: "re-queue", resource: "draft", resourceId: draftId, success: false, summary: "Draft not found", error: "Record does not exist" }).catch(() => {});
          return NextResponse.json({ success: false, error: "Draft not found" }, { status: 404 });
        }

        await prisma.articleDraft.update({
          where: { id: draftId },
          data: {
            current_phase: "research",
            phase_attempts: 0,
            last_error: null,
            rejection_reason: null,
          },
        });

        // Verify
        const updated = await prisma.articleDraft.findUnique({ where: { id: draftId }, select: { current_phase: true } });
        if (updated?.current_phase !== "research") {
          logManualAction(req, { action: "re-queue", resource: "draft", resourceId: draftId, success: false, summary: `Re-queue failed verification — "${existing.keyword}" still in ${updated?.current_phase}`, error: "Verification failed" }).catch(() => {});
          return NextResponse.json({ success: false, error: "Re-queue appeared to succeed but the draft phase didn't change" }, { status: 500 });
        }

        logManualAction(req, { action: "re-queue", resource: "draft", resourceId: draftId, success: true, summary: `Draft "${existing.keyword}" re-queued (was: ${existing.current_phase} → research)` }).catch(() => {});
        return NextResponse.json({ success: true, message: `Draft "${existing.keyword}" re-queued for processing` });
      } catch (err) {
        console.warn("[content-matrix] re_queue failed:", err instanceof Error ? err.message : err);
        logManualAction(req, { action: "re-queue", resource: "draft", resourceId: draftId, success: false, summary: "Re-queue failed", error: err instanceof Error ? err.message : String(err), fix: "Check database connectivity." }).catch(() => {});
        return NextResponse.json({ success: false, error: `Failed to re-queue: ${err instanceof Error ? err.message : "Unknown error"}` }, { status: 500 });
      }
    }

    // ── delete_draft ──────────────────────────────────────
    if (action === "delete_draft") {
      if (!draftId) {
        return NextResponse.json({ error: "draftId is required for delete_draft" }, { status: 400 });
      }

      try {
        // Verify draft exists before attempting delete
        const existingDraft = await prisma.articleDraft.findUnique({ where: { id: draftId }, select: { id: true, keyword: true } });
        if (!existingDraft) {
          logManualAction(req, { action: "delete-draft", resource: "draft", resourceId: draftId, success: false, summary: "Draft not found — nothing to delete", error: "Record does not exist", fix: "The draft may have already been deleted. Refresh the page." }).catch(() => {});
          return NextResponse.json({ success: false, error: "Draft not found — it may have already been deleted" }, { status: 404 });
        }

        await prisma.articleDraft.delete({ where: { id: draftId } });

        // VERIFY the delete actually worked
        const stillExists = await prisma.articleDraft.findUnique({ where: { id: draftId }, select: { id: true } });
        if (stillExists) {
          logManualAction(req, { action: "delete-draft", resource: "draft", resourceId: draftId, success: false, summary: `Delete returned OK but draft "${existingDraft.keyword}" still exists`, error: "Delete verification failed — record still in database", fix: "Database may have a constraint preventing deletion. Check for related records." }).catch(() => {});
          return NextResponse.json({ success: false, error: "Delete appeared to succeed but the draft still exists in the database" }, { status: 500 });
        }

        logManualAction(req, { action: "delete-draft", resource: "draft", resourceId: draftId, success: true, summary: `Draft "${existingDraft.keyword}" deleted and verified gone` }).catch(() => {});
        return NextResponse.json({ success: true, message: `Draft "${existingDraft.keyword}" deleted` });
      } catch (err) {
        console.warn("[content-matrix] delete_draft failed:", err instanceof Error ? err.message : err);
        logManualAction(req, { action: "delete-draft", resource: "draft", resourceId: draftId, success: false, summary: "Delete failed", error: err instanceof Error ? err.message : String(err), fix: "Draft may not exist or has related records preventing deletion. Try refreshing the page." }).catch(() => {});
        return NextResponse.json({ success: false, error: `Failed to delete draft: ${err instanceof Error ? err.message : "Unknown error"}` }, { status: 500 });
      }
    }

    // ── delete_post ───────────────────────────────────────
    if (action === "delete_post") {
      if (!blogPostId) {
        return NextResponse.json({ error: "blogPostId is required for delete_post" }, { status: 400 });
      }

      try {
        // Verify post exists before attempting soft-delete
        const existingPost = await prisma.blogPost.findUnique({ where: { id: blogPostId }, select: { id: true, title_en: true, published: true, deletedAt: true } });
        if (!existingPost) {
          logManualAction(req, { action: "delete-post", resource: "blogpost", resourceId: blogPostId, success: false, summary: "Blog post not found — nothing to delete", error: "Record does not exist", fix: "The post may have already been deleted. Refresh the page." }).catch(() => {});
          return NextResponse.json({ success: false, error: "Blog post not found — it may have already been deleted" }, { status: 404 });
        }
        if (existingPost.deletedAt) {
          logManualAction(req, { action: "delete-post", resource: "blogpost", resourceId: blogPostId, success: false, summary: `Post "${existingPost.title_en}" was already deleted`, error: "Already deleted" }).catch(() => {});
          return NextResponse.json({ success: false, error: "This post was already deleted" }, { status: 409 });
        }

        await prisma.blogPost.update({
          where: { id: blogPostId },
          data: {
            deletedAt: new Date(),
            published: false,
          },
        });

        // VERIFY the soft-delete actually worked
        const updated = await prisma.blogPost.findUnique({ where: { id: blogPostId }, select: { deletedAt: true, published: true } });
        if (!updated?.deletedAt) {
          logManualAction(req, { action: "delete-post", resource: "blogpost", resourceId: blogPostId, success: false, summary: `Soft-delete returned OK but post "${existingPost.title_en}" is not marked deleted`, error: "Delete verification failed", fix: "Database update may have been rolled back. Try again." }).catch(() => {});
          return NextResponse.json({ success: false, error: "Delete appeared to succeed but the post is not marked as deleted" }, { status: 500 });
        }

        logManualAction(req, { action: "delete-post", resource: "blogpost", resourceId: blogPostId, success: true, summary: `Post "${existingPost.title_en}" soft-deleted and verified` }).catch(() => {});
        return NextResponse.json({ success: true, message: `Post "${existingPost.title_en}" deleted` });
      } catch (err) {
        console.warn("[content-matrix] delete_post failed:", err instanceof Error ? err.message : err);
        logManualAction(req, { action: "delete-post", resource: "blogpost", resourceId: blogPostId, success: false, summary: "Delete failed", error: err instanceof Error ? err.message : String(err), fix: "Post may not exist or database error. Refresh the page and try again." }).catch(() => {});
        return NextResponse.json({ success: false, error: `Failed to delete post: ${err instanceof Error ? err.message : "Unknown error"}` }, { status: 500 });
      }
    }

    // ── unpublish ─────────────────────────────────────────
    if (action === "unpublish") {
      if (!blogPostId) {
        return NextResponse.json({ error: "blogPostId is required for unpublish" }, { status: 400 });
      }

      try {
        const existingPost = await prisma.blogPost.findUnique({ where: { id: blogPostId }, select: { id: true, title_en: true, published: true } });
        if (!existingPost) {
          logManualAction(req, { action: "unpublish", resource: "blogpost", resourceId: blogPostId, success: false, summary: "Post not found", error: "Record does not exist" }).catch(() => {});
          return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
        }
        if (!existingPost.published) {
          logManualAction(req, { action: "unpublish", resource: "blogpost", resourceId: blogPostId, success: false, summary: `Post "${existingPost.title_en}" is already unpublished`, error: "Already unpublished" }).catch(() => {});
          return NextResponse.json({ success: false, error: "Post is already unpublished" }, { status: 409 });
        }

        await prisma.blogPost.update({
          where: { id: blogPostId },
          data: { published: false },
        });

        // Verify
        const updated = await prisma.blogPost.findUnique({ where: { id: blogPostId }, select: { published: true } });
        if (updated?.published !== false) {
          logManualAction(req, { action: "unpublish", resource: "blogpost", resourceId: blogPostId, success: false, summary: `Unpublish failed verification — post "${existingPost.title_en}" is still published`, error: "Verification failed" }).catch(() => {});
          return NextResponse.json({ success: false, error: "Unpublish appeared to succeed but the post is still published" }, { status: 500 });
        }

        logManualAction(req, { action: "unpublish", resource: "blogpost", resourceId: blogPostId, success: true, summary: `Post "${existingPost.title_en}" unpublished and verified` }).catch(() => {});
        return NextResponse.json({ success: true, message: `Post "${existingPost.title_en}" unpublished` });
      } catch (err) {
        console.warn("[content-matrix] unpublish failed:", err instanceof Error ? err.message : err);
        logManualAction(req, { action: "unpublish", resource: "blogpost", resourceId: blogPostId, success: false, summary: "Unpublish failed", error: err instanceof Error ? err.message : String(err), fix: "Post may not exist or database error." }).catch(() => {});
        return NextResponse.json({ success: false, error: `Failed to unpublish: ${err instanceof Error ? err.message : "Unknown error"}` }, { status: 500 });
      }
    }

    // -------------------------------------------------------------------------
    // rewrite — Reset draft to research phase to trigger a fresh AI rewrite
    // -------------------------------------------------------------------------
    if (action === "rewrite") {
      const rewriteDraftId = (body.draftId as string | undefined) ?? "";
      if (!rewriteDraftId) return NextResponse.json({ error: "draftId is required" }, { status: 400 });
      try {
        const existing = await prisma.articleDraft.findUnique({ where: { id: rewriteDraftId }, select: { id: true, keyword: true, current_phase: true } });
        if (!existing) {
          logManualAction(req, { action: "rewrite", resource: "draft", resourceId: rewriteDraftId, success: false, summary: "Draft not found", error: "Record does not exist" }).catch(() => {});
          return NextResponse.json({ success: false, error: "Draft not found" }, { status: 404 });
        }

        await prisma.articleDraft.update({
          where: { id: rewriteDraftId },
          data: { current_phase: "research", last_error: null },
        });

        const updated = await prisma.articleDraft.findUnique({ where: { id: rewriteDraftId }, select: { current_phase: true } });
        if (updated?.current_phase !== "research") {
          logManualAction(req, { action: "rewrite", resource: "draft", resourceId: rewriteDraftId, success: false, summary: `Rewrite reset failed verification for "${existing.keyword}"`, error: "Verification failed" }).catch(() => {});
          return NextResponse.json({ success: false, error: "Rewrite reset appeared to succeed but draft phase didn't change" }, { status: 500 });
        }

        logManualAction(req, { action: "rewrite", resource: "draft", resourceId: rewriteDraftId, success: true, summary: `Draft "${existing.keyword}" queued for rewrite (was: ${existing.current_phase})` }).catch(() => {});
        return NextResponse.json({ success: true, message: `Draft "${existing.keyword}" reset to research phase — will be rewritten on next content builder run` });
      } catch (err) {
        console.warn("[content-matrix] rewrite failed:", err instanceof Error ? err.message : err);
        logManualAction(req, { action: "rewrite", resource: "draft", resourceId: rewriteDraftId, success: false, summary: "Rewrite queue failed", error: err instanceof Error ? err.message : String(err), fix: "Check database connectivity." }).catch(() => {});
        return NextResponse.json({ success: false, error: `Failed to queue rewrite: ${err instanceof Error ? err.message : "Unknown error"}` }, { status: 500 });
      }
    }

    // -------------------------------------------------------------------------
    // enhance — Run enhance-runner to expand content word count
    // -------------------------------------------------------------------------
    if (action === "enhance") {
      const draftId = (body.draftId as string | undefined) ?? "";
      if (!draftId) return NextResponse.json({ error: "draftId is required" }, { status: 400 });
      try {
        const draft = await prisma.articleDraft.findUnique({ where: { id: draftId } });
        if (!draft) return NextResponse.json({ success: false, error: "Draft not found" }, { status: 404 });
        const { enhanceReservoirDraft } = await import("@/lib/content-pipeline/enhance-runner");
        const result = await enhanceReservoirDraft(draft as Record<string, unknown>);
        logManualAction(req, { action: "enhance", resource: "draft", resourceId: draftId, success: result.success, summary: result.success ? `Expanded — score: ${result.previousScore} → ${result.newScore}` : `Expand failed: ${result.error}`, error: result.success ? undefined : result.error, fix: result.success ? undefined : "AI provider may be down. Check AI Config tab." }).catch(() => {});
        return NextResponse.json({
          success: result.success,
          message: result.success
            ? `Expanded — score: ${result.previousScore} → ${result.newScore}`
            : `Expand failed: ${result.error}`,
        });
      } catch (err) {
        console.warn("[content-matrix] enhance failed:", err instanceof Error ? err.message : err);
        logManualAction(req, { action: "enhance", resource: "draft", resourceId: draftId, success: false, summary: "Enhance crashed", error: err instanceof Error ? err.message : String(err), fix: "Check AI provider configuration in AI Config tab." }).catch(() => {});
        return NextResponse.json({ success: false, error: "Failed to run expand — check AI provider configuration" }, { status: 500 });
      }
    }

    // -------------------------------------------------------------------------
    // review_fix — Diagnose and fix a published BlogPost (expand thin content, trim meta)
    // -------------------------------------------------------------------------
    if (action === "review_fix") {
      const blogPostId = (body.blogPostId as string | undefined) ?? "";
      if (!blogPostId) return NextResponse.json({ error: "blogPostId is required" }, { status: 400 });
      try {
        const post = await prisma.blogPost.findUnique({ where: { id: blogPostId } });
        if (!post) return NextResponse.json({ success: false, error: "Blog post not found" }, { status: 404 });

        const contentEn = (post.content_en || "").toString();
        const wordCountEn = contentEn.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;

        // Diagnose issues
        const issues: string[] = [];
        if (wordCountEn < 800) issues.push(`English content too thin: ${wordCountEn} words (need 800+)`);
        if (!contentEn.includes('class="affiliate') && !contentEn.includes('rel="sponsored"') && !contentEn.includes('data-affiliate')) issues.push("No affiliate links found");
        if ((contentEn.match(/class="internal-link"/g) || []).length < 2) issues.push("Fewer than 2 internal links");
        const metaDescLen = (post.meta_description_en || "").toString().length;
        if (metaDescLen > 160) issues.push(`Meta description too long: ${metaDescLen} chars`);
        if (metaDescLen > 0 && metaDescLen < 120) issues.push(`Meta description too short: ${metaDescLen} chars`);

        if (issues.length === 0) {
          return NextResponse.json({ success: true, message: "No issues found — article looks healthy", issues: [], wordCount: wordCountEn });
        }

        // Fix: expand thin content with AI
        const updateData: Record<string, unknown> = {};
        let fixSummary = "";

        if (wordCountEn < 800) {
          try {
            const { generateJSON } = await import("@/lib/ai/provider");
            const prompt = `You are a luxury travel editor expanding a published article that is too short.

ARTICLE TITLE: "${post.title_en}"
CURRENT WORD COUNT: ${wordCountEn} — NEED AT LEAST 1,000 WORDS

CURRENT ARTICLE HTML:
${contentEn.substring(0, 6000)}

TASK: Expand to 1,000+ words. For each H2 section add 1-2 paragraphs with specific details. Add a "Practical Tips" section if needed. Do NOT remove existing links. Return the COMPLETE expanded HTML.

Return JSON: { "html": "<article>...full expanded HTML...</article>", "wordCount": 1200 }`;
            const result = await generateJSON<Record<string, unknown>>(prompt, {
              systemPrompt: "Luxury travel editor. Expand articles to meet minimum word counts. Return only valid JSON.",
              maxTokens: 2000,
              temperature: 0.5,
              timeoutMs: 45_000,
              taskType: "content_expansion",
              calledFrom: "content-matrix/review_fix",
            });

            const expandedHtml = (result.html as string) || "";
            const expandedWords = expandedHtml.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
            if (expandedWords > wordCountEn && expandedHtml.length > contentEn.length) {
              const { sanitizeContentBody } = await import("@/lib/content-pipeline/title-sanitizer");
              updateData.content_en = sanitizeContentBody(expandedHtml);
              fixSummary += `Expanded EN from ${wordCountEn} to ${expandedWords} words. `;
            } else {
              fixSummary += `AI expansion returned ${expandedWords} words (not better). `;
            }
          } catch (aiErr) {
            fixSummary += `AI expansion failed: ${(aiErr as Error).message}. `;
          }
        }

        // Fix meta description length
        if (metaDescLen > 160) {
          const trimmed = (post.meta_description_en || "").toString().substring(0, 155).replace(/\s+\S*$/, "...");
          updateData.meta_description_en = trimmed;
          fixSummary += `Trimmed meta description to ${trimmed.length} chars. `;
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.blogPost.update({ where: { id: blogPostId }, data: updateData });
        }

        logManualAction(req, { action: "review_fix", resource: "blogpost", resourceId: blogPostId, success: true, summary: fixSummary || "Issues diagnosed, no auto-fixes applied" }).catch(() => {});
        return NextResponse.json({ success: true, message: fixSummary || "Issues diagnosed — manual fixes needed", issues, fixes: Object.keys(updateData), wordCount: wordCountEn });
      } catch (err) {
        console.warn("[content-matrix] review_fix failed:", err instanceof Error ? err.message : err);
        logManualAction(req, { action: "review_fix", resource: "blogpost", resourceId: blogPostId, success: false, summary: "Review & Fix failed", error: err instanceof Error ? err.message : String(err) }).catch(() => {});
        return NextResponse.json({ success: false, error: `Review & Fix failed: ${err instanceof Error ? err.message : "Unknown"}` }, { status: 500 });
      }
    }

    return NextResponse.json({ error: `Unknown action: ${action}. Supported: gate_check, re_queue, delete_draft, delete_post, unpublish, rewrite, enhance, review_fix` }, { status: 400 });
  } catch (err) {
    console.warn("[content-matrix] POST handler error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
});
