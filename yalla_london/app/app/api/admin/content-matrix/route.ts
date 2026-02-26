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
import { getActiveSiteIds, getDefaultSiteId, getSiteDomain } from "@/config/sites";
import { interpretError } from "@/lib/error-interpreter";

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
  qualityScore: number | null;
  seoScore: number | null;
  wordCount: number;
  internalLinksCount: number;
  indexingStatus: string | null;
  lastSubmittedAt: string | null;
  lastCrawledAt: string | null;
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
    let indexingMap: Map<string, { status: string; lastSubmittedAt: Date | null; lastCrawledAt: Date | null }> =
      new Map();
    try {
      const indexingRows = await prisma.uRLIndexingStatus.findMany({
        where: { site_id: targetSiteId },
        select: { slug: true, status: true, last_submitted_at: true, last_crawled_at: true },
      });
      for (const row of indexingRows) {
        if (row.slug) {
          indexingMap.set(row.slug, {
            status: row.status,
            lastSubmittedAt: row.last_submitted_at,
            lastCrawledAt: row.last_crawled_at,
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
    if (locale) postWhere.locale_en = locale;
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
            qualityScore: null,
            seoScore: post.seo_score ?? null,
            wordCount: wc,
            internalLinksCount: ilCount,
            indexingStatus: indexData?.status ?? null,
            lastSubmittedAt: indexData?.lastSubmittedAt?.toISOString() ?? null,
            lastCrawledAt: indexData?.lastCrawledAt?.toISOString() ?? null,
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
        draftWhere.updated_at = { lt: threeHoursAgo };
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
          } catch { /* no-op */ }

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
            qualityScore: draft.quality_score ?? null,
            seoScore: draft.seo_score ?? null,
            wordCount: wc,
            internalLinksCount: ilCount,
            indexingStatus: indexData?.status ?? null,
            lastSubmittedAt: indexData?.lastSubmittedAt?.toISOString() ?? null,
            lastCrawledAt: indexData?.lastCrawledAt?.toISOString() ?? null,
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

    // ── Pagination ────────────────────────────────────────
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / limit);
    const start = (page - 1) * limit;
    const paginatedItems = items.slice(start, start + limit);

    return NextResponse.json({
      articles: paginatedItems,
      summary,
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
        const targetUrl = `/blog/${slug}`;
        const siteUrl = `https://${getDomain(draft.site_id)}`;

        const gateResult = await runPrePublicationGate(
          targetUrl,
          {
            title_en: draft.keyword,
            meta_title_en: (meta?.metaTitle as string) ?? undefined,
            meta_description_en: (meta?.metaDescription as string) ?? undefined,
            content_en: draft.assembled_html ?? undefined,
            content_ar: draft.assembled_html_alt ?? undefined,
            locale: draft.locale,
            seo_score: draft.seo_score ?? undefined,
          },
          siteUrl,
          { skipRouteCheck: true },
        );

        const checks = gateResult.checks.map((c) => ({
          name: c.name,
          status: c.passed ? "pass" : c.severity === "warning" ? "warn" : "fail",
          message: c.message,
          fix: undefined as string | undefined,
        }));

        return NextResponse.json({ checks });
      } catch (err) {
        console.warn("[content-matrix] gate_check failed:", err instanceof Error ? err.message : err);
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
        await prisma.articleDraft.update({
          where: { id: draftId },
          data: {
            current_phase: "research",
            phase_attempts: 0,
            last_error: null,
            rejection_reason: null,
            updated_at: new Date(),
          },
        });
        return NextResponse.json({ success: true, message: "Draft re-queued for processing" });
      } catch (err) {
        console.warn("[content-matrix] re_queue failed:", err instanceof Error ? err.message : err);
        return NextResponse.json({ success: false, error: "Failed to re-queue draft" }, { status: 500 });
      }
    }

    // ── delete_draft ──────────────────────────────────────
    if (action === "delete_draft") {
      if (!draftId) {
        return NextResponse.json({ error: "draftId is required for delete_draft" }, { status: 400 });
      }

      try {
        await prisma.articleDraft.delete({ where: { id: draftId } });
        return NextResponse.json({ success: true });
      } catch (err) {
        console.warn("[content-matrix] delete_draft failed:", err instanceof Error ? err.message : err);
        return NextResponse.json({ success: false, error: "Failed to delete draft" }, { status: 500 });
      }
    }

    // ── delete_post ───────────────────────────────────────
    if (action === "delete_post") {
      if (!blogPostId) {
        return NextResponse.json({ error: "blogPostId is required for delete_post" }, { status: 400 });
      }

      try {
        await prisma.blogPost.update({
          where: { id: blogPostId },
          data: {
            deletedAt: new Date(),
            published: false,
          },
        });
        return NextResponse.json({ success: true });
      } catch (err) {
        console.warn("[content-matrix] delete_post failed:", err instanceof Error ? err.message : err);
        return NextResponse.json({ success: false, error: "Failed to delete post" }, { status: 500 });
      }
    }

    // ── unpublish ─────────────────────────────────────────
    if (action === "unpublish") {
      if (!blogPostId) {
        return NextResponse.json({ error: "blogPostId is required for unpublish" }, { status: 400 });
      }

      try {
        await prisma.blogPost.update({
          where: { id: blogPostId },
          data: { published: false },
        });
        return NextResponse.json({ success: true });
      } catch (err) {
        console.warn("[content-matrix] unpublish failed:", err instanceof Error ? err.message : err);
        return NextResponse.json({ success: false, error: "Failed to unpublish post" }, { status: 500 });
      }
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.warn("[content-matrix] POST handler error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
});

// Suppress unused import warning
void getSiteDomain;
