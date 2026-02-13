export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/blog
 *
 * Public read-only blog API. Returns published posts.
 * Combines static content files (the primary source displayed on the site)
 * with any database-backed posts from the content pipeline.
 *
 * No auth required — only returns published, non-deleted posts.
 *
 * Query params:
 *   ?limit=N        — max posts to return (default: 20, max: 50)
 *   ?offset=N       — pagination offset (default: 0)
 *   ?sort=field:dir  — sort field and direction (default: created_at:desc)
 *   ?source=static|db|all — filter by source (default: all)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      50,
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const source = searchParams.get("source") || "all";

    // Parse sort parameter
    const sortParam = searchParams.get("sort") || "created_at:desc";
    const [sortField, sortDir] = sortParam.split(":");
    const validSortFields = ["created_at", "updated_at", "seo_score", "title_en"];
    const orderField = validSortFields.includes(sortField) ? sortField : "created_at";
    const orderDir = sortDir === "asc" ? "asc" : "desc";

    // 1. Load static blog posts (the primary content source on the site)
    let staticPosts: any[] = [];
    if (source !== "db") {
      try {
        const { blogPosts } = await import("@/data/blog-content");
        const { extendedBlogPosts } = await import("@/data/blog-content-extended");
        staticPosts = [...blogPosts, ...extendedBlogPosts]
          .filter((p) => p.published)
          .map((p) => ({
            id: p.id,
            title_en: p.title_en,
            title_ar: p.title_ar,
            slug: p.slug,
            excerpt_en: p.excerpt_en,
            excerpt_ar: p.excerpt_ar,
            content_ar: p.content_ar ? `[${p.content_ar.length} chars]` : null,
            featured_image: p.featured_image,
            published: p.published,
            tags: p.tags || [],
            meta_title_en: p.meta_title_en,
            meta_description_en: p.meta_description_en,
            seo_score: p.seo_score ?? null,
            page_type: p.page_type ?? null,
            keywords_json: p.keywords ? JSON.stringify(p.keywords) : null,
            authority_links_json: null,
            created_at: p.created_at,
            updated_at: p.updated_at,
            _source: "static",
          }));
      } catch {
        // Static files not available — continue with DB only
      }
    }

    // 2. Load database posts (from content pipeline)
    let dbPosts: any[] = [];
    let dbTotal = 0;
    if (source !== "static") {
      try {
        const { prisma } = await import("@/lib/db");

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
          const where = { published: true, deletedAt: null };
          const [posts, count] = await Promise.all([
            prisma.blogPost.findMany({
              where,
              orderBy: { [orderField]: orderDir },
              select: {
                ...baseSelect,
                seo_score: true,
                page_type: true,
                keywords_json: true,
                authority_links_json: true,
              },
            }),
            prisma.blogPost.count({ where }),
          ]);
          dbPosts = posts.map((p) => ({
            ...p,
            content_ar: p.content_ar ? `[${p.content_ar.length} chars]` : null,
            _source: "database",
          }));
          dbTotal = count;
        } catch {
          // Column doesn't exist — simpler query
          const where = { published: true };
          const [posts, count] = await Promise.all([
            prisma.blogPost.findMany({
              where,
              orderBy: { [orderField]: orderDir },
              select: baseSelect,
            }),
            prisma.blogPost.count({ where }),
          ]);
          dbPosts = posts.map((p) => ({
            ...p,
            content_ar: p.content_ar ? `[${p.content_ar.length} chars]` : null,
            _source: "database",
          }));
          dbTotal = count;
        }
      } catch {
        // Database unavailable — continue with static only
      }
    }

    // 3. Merge & deduplicate (DB posts override static if same slug)
    const slugsSeen = new Set<string>();
    const merged: any[] = [];

    // DB posts take priority (they're from the content pipeline)
    for (const p of dbPosts) {
      slugsSeen.add(p.slug);
      merged.push(p);
    }
    for (const p of staticPosts) {
      if (!slugsSeen.has(p.slug)) {
        slugsSeen.add(p.slug);
        merged.push(p);
      }
    }

    // 4. Sort
    merged.sort((a, b) => {
      const aVal = a[orderField];
      const bVal = b[orderField];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return orderDir === "asc" ? cmp : -cmp;
    });

    // 5. Paginate
    const total = merged.length;
    const paged = merged.slice(offset, offset + limit);

    return NextResponse.json({
      posts: paged,
      total,
      totalStatic: staticPosts.length,
      totalDatabase: dbTotal,
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
