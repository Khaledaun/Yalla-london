/**
 * Article Lifecycle Trace API
 *
 * Returns the full lifecycle of an article by trace_id:
 * - ArticleDraft record (pipeline phases, scores, errors)
 * - BlogPost record (published content, SEO data)
 * - CronJobLog entries mentioning this trace_id
 * - URLIndexingStatus records for the article's URL
 * - CjClickEvent records attributed to this article
 *
 * GET /api/admin/article-trace/[traceId]
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ traceId: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { traceId } = await params;

  if (!traceId || traceId.length < 5) {
    return NextResponse.json({ error: "Invalid trace ID" }, { status: 400 });
  }

  const { prisma } = await import("@/lib/db");

  try {
    // 1. Find the ArticleDraft
    const draft = await prisma.articleDraft.findFirst({
      where: { trace_id: traceId },
      select: {
        id: true,
        site_id: true,
        keyword: true,
        locale: true,
        topic_title: true,
        current_phase: true,
        phase_attempts: true,
        last_error: true,
        sections_completed: true,
        sections_total: true,
        quality_score: true,
        seo_score: true,
        word_count: true,
        readability_score: true,
        generation_strategy: true,
        ai_model_used: true,
        topic_proposal_id: true,
        paired_draft_id: true,
        blog_post_id: true,
        published_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        phase_started_at: true,
        completed_at: true,
      },
    });

    // 2. Find the BlogPost
    const blogPost = await prisma.blogPost.findFirst({
      where: { trace_id: traceId },
      select: {
        id: true,
        title_en: true,
        title_ar: true,
        slug: true,
        published: true,
        seo_score: true,
        page_type: true,
        siteId: true,
        source_pipeline: true,
        enhancement_log: true,
        meta_title_en: true,
        meta_description_en: true,
        tags: true,
        created_at: true,
        updated_at: true,
      },
    });

    // 3. Find CronJobLog entries mentioning this trace_id
    const cronLogs = await prisma.cronJobLog.findMany({
      where: {
        result_summary: {
          path: ["trace_id"],
          equals: traceId,
        },
      },
      select: {
        id: true,
        job_name: true,
        job_type: true,
        status: true,
        started_at: true,
        completed_at: true,
        result_summary: true,
        error_message: true,
      },
      orderBy: { started_at: "asc" },
      take: 50,
    });

    // 4. Find URLIndexingStatus for the article's slug
    let indexingStatus = null;
    if (blogPost?.slug) {
      indexingStatus = await prisma.uRLIndexingStatus.findMany({
        where: {
          url: { contains: blogPost.slug },
        },
        select: {
          url: true,
          status: true,
          indexing_state: true,
          submission_attempts: true,
          last_submitted_at: true,
          last_inspected_at: true,
          last_error: true,
        },
        take: 5,
      });
    }

    // 5. Find CjClickEvent records for this article (via SID)
    let affiliateClicks = null;
    if (blogPost?.slug) {
      affiliateClicks = await prisma.cjClickEvent.findMany({
        where: {
          sessionId: { contains: blogPost.slug },
        },
        select: {
          id: true,
          sessionId: true,
          advertiserId: true,
          createdAt: true,
          siteId: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    }

    // 6. Build timeline
    const timeline: Array<{ timestamp: string; event: string; source: string; details?: string }> = [];

    if (draft) {
      timeline.push({
        timestamp: draft.created_at.toISOString(),
        event: "Draft created",
        source: "content-pipeline",
        details: `Strategy: ${draft.generation_strategy || "unknown"}, Locale: ${draft.locale}`,
      });
      if (draft.completed_at) {
        timeline.push({
          timestamp: draft.completed_at.toISOString(),
          event: `Draft completed (phase: ${draft.current_phase})`,
          source: "content-pipeline",
        });
      }
      if (draft.rejection_reason) {
        timeline.push({
          timestamp: draft.updated_at.toISOString(),
          event: `Draft rejected: ${draft.rejection_reason}`,
          source: "content-pipeline",
        });
      }
    }

    if (blogPost) {
      timeline.push({
        timestamp: blogPost.created_at.toISOString(),
        event: blogPost.published ? "Published" : "Created (unpublished)",
        source: "content-selector",
        details: `Source: ${blogPost.source_pipeline || "8-phase"}`,
      });
    }

    for (const log of cronLogs) {
      timeline.push({
        timestamp: (log.started_at || log.completed_at || new Date()).toISOString(),
        event: `Cron: ${log.job_name} (${log.status})`,
        source: log.job_name || "unknown",
        details: log.error_message || undefined,
      });
    }

    // Sort timeline chronologically
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return NextResponse.json({
      traceId,
      draft: draft || null,
      blogPost: blogPost || null,
      cronLogs,
      indexingStatus: indexingStatus || [],
      affiliateClicks: affiliateClicks || [],
      timeline,
      found: !!(draft || blogPost),
    });
  } catch (err) {
    console.error("[article-trace] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to fetch trace data" }, { status: 500 });
  }
}
