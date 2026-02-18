export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/blog
 *
 * Public read-only blog API. Returns published posts from the database.
 * The database is the single source of truth — static content files
 * should be seeded into the DB via /api/admin/seed-content.
 *
 * No auth required — only returns published, non-deleted posts.
 *
 * Query params:
 *   ?limit=N        — max posts to return (default: 20, max: 50)
 *   ?offset=N       — pagination offset (default: 0)
 *   ?sort=field:dir  — sort field and direction (default: created_at:desc)
 *   ?site=SITE_ID   — filter by site (optional)
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
    const siteFilter = searchParams.get("site");

    // Parse sort parameter
    const sortParam = searchParams.get("sort") || "created_at:desc";
    const [sortField, sortDir] = sortParam.split(":");
    const validSortFields = [
      "created_at",
      "updated_at",
      "seo_score",
      "title_en",
    ];
    const orderField = validSortFields.includes(sortField)
      ? sortField
      : "created_at";
    const orderDir = sortDir === "asc" ? "asc" : "desc";

    // Build where clause with column-existence fallbacks
    let posts: any[];
    let total: number;

    const fullSelect = {
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
      siteId: true,
      created_at: true,
      updated_at: true,
    };

    const baseSelect = {
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
      created_at: true,
      updated_at: true,
    };

    try {
      const where: any = { published: true, deletedAt: null };
      if (siteFilter) where.siteId = siteFilter;

      [posts, total] = await Promise.all([
        prisma.blogPost.findMany({
          where,
          orderBy: { [orderField]: orderDir },
          skip: offset,
          take: limit,
          select: fullSelect,
        }),
        prisma.blogPost.count({ where }),
      ]);
    } catch {
      // deletedAt/siteId/SEO columns don't exist yet — simpler query
      const where: any = { published: true };

      [posts, total] = await Promise.all([
        prisma.blogPost.findMany({
          where,
          orderBy: { [orderField]: orderDir },
          skip: offset,
          take: limit,
          select: baseSelect,
        }),
        prisma.blogPost.count({ where }),
      ]);
    }

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
      {
        error: "Failed to fetch posts",
      },
      { status: 500 },
    );
  }
}
