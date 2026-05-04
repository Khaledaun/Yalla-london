import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const siteId =
    request.headers.get("x-site-id") ||
    request.nextUrl.searchParams.get("siteId") ||
    getDefaultSiteId();

  try {
    const { prisma } = await import("@/lib/db");

    // --- BlogPost aggregation ---
    const posts = await prisma.blogPost.findMany({
      where: { siteId },
      take: 500,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        slug: true,
        title_en: true,
        title_ar: true,
        meta_title_en: true,
        meta_description_en: true,
        seo_score: true,
        content_en: true,
        content_ar: true,
        published: true,
        created_at: true,
        updated_at: true,
      },
    });

    const publishedPosts = posts.filter((p) => p.published);
    const withMeta = posts.filter(
      (p) => p.meta_description_en && p.meta_description_en.trim().length > 0
    );
    const withSeoScore = posts.filter(
      (p) => p.seo_score !== null && p.seo_score !== undefined
    );
    const avgSeoScore =
      withSeoScore.length > 0
        ? Math.round(
            withSeoScore.reduce((sum, p) => sum + (p.seo_score ?? 0), 0) /
              withSeoScore.length
          )
        : null;

    // --- URLIndexingStatus ---
    const indexingRaw = await prisma.uRLIndexingStatus.groupBy({
      by: ["status"],
      where: { site_id: siteId },
      _count: { status: true },
    });
    const indexingStats: Record<string, number> = {};
    let indexedCount = 0;
    for (const row of indexingRaw) {
      const s = row.status || "unknown";
      indexingStats[s] = row._count.status;
      if (s === "indexed") indexedCount = row._count.status;
    }

    // --- SeoAuditReport (latest) ---
    let latestAudit: {
      score: number | null;
      issueCount: number;
      created_at: string;
    } | null = null;
    try {
      const report = await prisma.seoAuditReport.findFirst({
        where: { site_id: siteId },
        orderBy: { created_at: "desc" },
        select: { score: true, issues_json: true, created_at: true },
      });
      if (report) {
        let issueCount = 0;
        if (report.issues_json) {
          try {
            const parsed =
              typeof report.issues_json === "string"
                ? JSON.parse(report.issues_json)
                : report.issues_json;
            issueCount = Array.isArray(parsed) ? parsed.length : 0;
          } catch {
            // malformed JSON
          }
        }
        latestAudit = {
          score: typeof report.score === "number" ? report.score : null,
          issueCount,
          created_at: report.created_at.toISOString(),
        };
      }
    } catch {
      // SeoAuditReport table may not exist
    }

    // --- Build routes array ---
    const routes = posts.map((p) => {
      const contentEn = p.content_en || "";
      const contentAr = p.content_ar || "";
      const wordCount = Math.round(
        contentEn.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length
      );
      return {
        id: p.id,
        slug: p.slug,
        titleEn: p.title_en || "",
        titleAr: p.title_ar || "",
        metaTitleEn: p.meta_title_en || "",
        metaDescriptionEn: p.meta_description_en || "",
        seoScore: p.seo_score ?? null,
        wordCount,
        hasArabic: contentAr.replace(/<[^>]*>/g, "").trim().length > 50,
        published: p.published,
        createdAt: p.created_at?.toISOString() || null,
        updatedAt: p.updated_at?.toISOString() || null,
      };
    });

    // --- Indexing lookup for routes ---
    const indexingRows = await prisma.uRLIndexingStatus.findMany({
      where: { site_id: siteId },
      take: 500,
      select: { url: true, status: true },
    });
    const indexingMap: Record<string, string> = {};
    for (const row of indexingRows) {
      if (row.url) {
        // extract slug from URL
        const match = row.url.match(/\/blog\/([^/?#]+)/);
        if (match) indexingMap[match[1]] = row.status || "unknown";
      }
    }

    // Attach indexing status to routes
    const routesWithIndexing = routes.map((r) => ({
      ...r,
      indexingStatus: indexingMap[r.slug] || "not_submitted",
    }));

    // --- Summary ---
    const summary = {
      totalPages: posts.length,
      publishedPages: publishedPosts.length,
      draftPages: posts.length - publishedPosts.length,
      withMeta: withMeta.length,
      withoutMeta: posts.length - withMeta.length,
      avgSeoScore,
      indexedCount,
      latestAuditScore: latestAudit?.score ?? null,
    };

    return NextResponse.json({
      success: true,
      siteId,
      summary,
      routes: routesWithIndexing,
      indexingStats,
      latestAudit,
    });
  } catch (err) {
    console.error("[seo-dashboard] API error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load SEO dashboard data" },
      { status: 500 }
    );
  }
}
