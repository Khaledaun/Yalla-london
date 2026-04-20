/**
 * GET /api/admin/chrome-bridge/page/[id]
 * Single-page deep dive: BlogPost + GSC 7/30d + indexing + enhancement log.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireBridgeToken } from "@/lib/agents/bridge-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authError = await requireBridgeToken(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const { prisma } = await import("@/lib/db");
    const { getSiteDomain } = await import("@/config/sites");

    const post = await prisma.blogPost.findUnique({
      where: { id },
      select: {
        id: true,
        siteId: true,
        slug: true,
        title_en: true,
        title_ar: true,
        content_en: true,
        content_ar: true,
        meta_title_en: true,
        meta_title_ar: true,
        meta_description_en: true,
        meta_description_ar: true,
        seo_score: true,
        canonical_slug: true,
        published: true,
        created_at: true,
        updated_at: true,
        source_pipeline: true,
        trace_id: true,
        enhancement_log: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const domain = getSiteDomain(post.siteId);
    const url = `${domain}/blog/${post.slug}`;
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [gscRows, indexing, recentAudits, affiliateLogs] = await Promise.all([
      prisma.gscPagePerformance.findMany({
        where: { site_id: post.siteId, url, date: { gte: since30d } },
        orderBy: { date: "asc" },
        select: {
          date: true,
          clicks: true,
          impressions: true,
          ctr: true,
          position: true,
        },
      }),
      prisma.uRLIndexingStatus.findFirst({
        where: { site_id: post.siteId, url },
        select: {
          status: true,
          indexing_state: true,
          coverage_state: true,
          submitted_indexnow: true,
          submission_attempts: true,
          last_inspected_at: true,
          last_submitted_at: true,
          last_error: true,
        },
      }),
      prisma.chromeAuditReport.findMany({
        where: { siteId: post.siteId, pageUrl: url },
        orderBy: { uploadedAt: "desc" },
        take: 10,
        select: {
          id: true,
          auditType: true,
          severity: true,
          status: true,
          uploadedAt: true,
          findings: true,
        },
      }),
      prisma.autoFixLog.findMany({
        where: {
          siteId: post.siteId,
          targetType: "blogpost",
          targetId: post.id,
          createdAt: { gte: since7d },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          fixType: true,
          agent: true,
          success: true,
          createdAt: true,
          error: true,
        },
      }),
    ]);

    const clicks30d = gscRows.reduce((s, r) => s + (r.clicks ?? 0), 0);
    const impressions30d = gscRows.reduce((s, r) => s + (r.impressions ?? 0), 0);
    const clicks7d = gscRows
      .filter((r) => r.date >= since7d)
      .reduce((s, r) => s + (r.clicks ?? 0), 0);
    const impressions7d = gscRows
      .filter((r) => r.date >= since7d)
      .reduce((s, r) => s + (r.impressions ?? 0), 0);

    const contentEn = post.content_en || "";
    const wordCount = contentEn.trim().split(/\s+/).filter(Boolean).length;
    const hasAffiliates = /data-affiliate-id|affiliate-recommendation|\/api\/affiliate\/click|rel=["']?[^"']*sponsored/i.test(contentEn);
    const internalLinkCount = (contentEn.match(/<a[^>]+href=["'][^"']*yalla-london\.com/gi) || []).length;
    const affiliateLinkCount = (contentEn.match(/\/api\/affiliate\/click/g) || []).length;

    return NextResponse.json({
      success: true,
      page: {
        id: post.id,
        siteId: post.siteId,
        slug: post.slug,
        url,
        canonicalSlug: post.canonical_slug ?? undefined,
        titleEn: post.title_en,
        titleAr: post.title_ar,
        metaTitleEn: post.meta_title_en ?? undefined,
        metaTitleAr: post.meta_title_ar ?? undefined,
        metaDescriptionEn: post.meta_description_en ?? undefined,
        metaDescriptionAr: post.meta_description_ar ?? undefined,
        seoScore: post.seo_score ?? undefined,
        sourcePipeline: post.source_pipeline ?? undefined,
        traceId: post.trace_id ?? undefined,
        wordCount,
        internalLinkCount,
        affiliateLinkCount,
        hasAffiliates,
        published: post.published,
        createdAt: post.created_at,
        updatedAt: post.updated_at,
        enhancementLog: post.enhancement_log ?? [],
      },
      gsc: {
        clicks7d,
        clicks30d,
        impressions7d,
        impressions30d,
        avgCtr30d: impressions30d > 0 ? (clicks30d / impressions30d) * 100 : 0,
        rows: gscRows,
      },
      indexing: indexing ?? null,
      recentAudits,
      recentAutoFixes: affiliateLogs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[chrome-bridge/page]", message);
    return NextResponse.json(
      { error: "Failed to load page" },
      { status: 500 },
    );
  }
}
