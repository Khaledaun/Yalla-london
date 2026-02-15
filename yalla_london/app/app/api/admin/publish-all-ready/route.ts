export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

/**
 * POST /api/admin/publish-all-ready
 * Finds all BlogPosts where published=false and (seo_score >= 50 OR seo_score is null with content > 1000 chars)
 * Sets published=true on all of them. Returns count of published articles.
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");

    // Find eligible unpublished posts in two targeted queries:
    // 1. seo_score >= 50 (directly publishable)
    // 2. seo_score is null AND content_en length > 1000 chars
    const [scoredPosts, unscoredPosts] = await Promise.all([
      prisma.blogPost.findMany({
        where: {
          published: false,
          seo_score: { gte: 50 },
        },
        select: {
          id: true,
          title_en: true,
          slug: true,
          seo_score: true,
        },
      }),
      prisma.blogPost.findMany({
        where: {
          published: false,
          seo_score: null,
        },
        select: {
          id: true,
          title_en: true,
          slug: true,
          seo_score: true,
          content_en: true,
        },
      }),
    ]);

    // Filter unscored posts by content length (must have substantial content)
    const qualifiedUnscored = unscoredPosts.filter(
      (post) => (post.content_en?.length || 0) > 1000,
    );

    const toPublish = [...scoredPosts, ...qualifiedUnscored];

    if (toPublish.length === 0) {
      return NextResponse.json({
        success: true,
        published: 0,
        message: "No articles met the publish criteria",
      });
    }

    // Bulk update
    const result = await prisma.blogPost.updateMany({
      where: {
        id: { in: toPublish.map((p) => p.id) },
      },
      data: {
        published: true,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      published: result.count,
      articles: toPublish.map((p) => ({
        id: p.id,
        title: p.title_en,
        slug: p.slug,
        seo_score: p.seo_score,
      })),
      message: `Published ${result.count} article${result.count === 1 ? "" : "s"}`,
    });
  } catch (error) {
    console.error("Publish all ready error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
