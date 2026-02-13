export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/blog
 *
 * Public read-only blog API. Returns published posts.
 * No auth required — only returns published, non-deleted posts.
 *
 * Query params:
 *   ?limit=N      — max posts to return (default: 20, max: 50)
 *   ?offset=N     — pagination offset (default: 0)
 *   ?sort=field:dir — sort field and direction (default: created_at:desc)
 */
export async function GET(request: NextRequest) {
  try {
    const { prisma } = await import("@/lib/db");
    const { searchParams } = new URL(request.url);

    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      50,
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Parse sort parameter
    const sortParam = searchParams.get("sort") || "created_at:desc";
    const [sortField, sortDir] = sortParam.split(":");
    const validSortFields = ["created_at", "updated_at", "seo_score", "title_en"];
    const orderField = validSortFields.includes(sortField) ? sortField : "created_at";
    const orderDir = sortDir === "asc" ? "asc" : "desc";

    // Note: siteId column exists in schema but not yet migrated to DB.
    // Don't filter/select on siteId until migration is run.
    const where = {
      published: true,
      deletedAt: null,
    };

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { [orderField]: orderDir },
        skip: offset,
        take: limit,
        select: {
          id: true,
          title_en: true,
          title_ar: true,
          slug: true,
          excerpt_en: true,
          excerpt_ar: true,
          content_ar: true,
          featured_image: true,
          published: true,
          tags: true,
          meta_title_en: true,
          meta_description_en: true,
          seo_score: true,
          page_type: true,
          keywords_json: true,
          authority_links_json: true,
          created_at: true,
          updated_at: true,
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    // Truncate content_ar to a flag (length only, not full text)
    const safePosts = posts.map((p) => ({
      ...p,
      content_ar: p.content_ar ? `[${p.content_ar.length} chars]` : null,
    }));

    return NextResponse.json({
      posts: safePosts,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[Blog API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch posts" },
      { status: 500 },
    );
  }
}
