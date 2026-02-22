/**
 * Phase 4C Public Content API
 * Public endpoint for content listing and discovery with static content fallback
 */
import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering to avoid build-time database access
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { blogPosts, categories } from "@/data/blog-content";
import { extendedBlogPosts } from "@/data/blog-content-extended";
import { getDefaultSiteId, getSiteDomain } from "@/config/sites";

// Combine all static blog posts
const allStaticPosts = [...blogPosts, ...extendedBlogPosts];

// Zod schemas for validation
const ContentQuerySchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default("1"),
  limit: z
    .string()
    .transform((val) => Math.min(parseInt(val, 10), 50))
    .default("10"),
  category: z.string().optional(),
  locale: z.enum(["en", "ar"]).default("en"),
  page_type: z
    .enum([
      "guide",
      "place",
      "event",
      "list",
      "faq",
      "news",
      "itinerary",
      "comparison",
      "review",
      "listicle",
      "how-to",
    ])
    .optional(),
  place_id: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(["newest", "oldest", "popular", "seo_score"]).default("newest"),
});

// Transform static post to API format
function transformStaticPost(
  post: (typeof allStaticPosts)[0],
  locale: "en" | "ar",
) {
  const category = categories.find((c) => c.id === post.category_id);
  return {
    id: post.id,
    title: locale === "en" ? post.title_en : post.title_ar,
    excerpt: locale === "en" ? post.excerpt_en : post.excerpt_ar,
    slug: post.slug,
    featured_image: post.featured_image,
    page_type: post.page_type,
    seo_score: post.seo_score,
    tags: post.tags,
    created_at: post.created_at,
    updated_at: post.updated_at,
    category: category
      ? {
          name_en: category.name_en,
          name_ar: category.name_ar,
          slug: category.slug,
        }
      : null,
    place: null,
    author: {
      id: "author-yalla",
      name: locale === "en" ? "Yalla London Editorial" : "فريق يلا لندن",
      image: null,
    },
    url: `${getSiteDomain(getDefaultSiteId())}/blog/${post.slug}`,
  };
}

// GET - List published content (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const queryParams = Object.fromEntries(searchParams.entries());
    const validation = ContentQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const { page, limit, category, locale, page_type, search, sort } =
      validation.data;

    const offset = (page - 1) * limit;

    // Try database first, fallback to static content
    let content: any[] = [];
    let totalCount = 0;
    let useStaticContent = false;

    try {
      // Build where clause for database query (scoped by tenant)
      const siteId = request.headers.get("x-site-id") || getDefaultSiteId();
      const where: any = {
        published: true,
        site_id: siteId,
      };

      if (category) {
        where.category = { slug: category };
      }
      if (page_type) {
        where.page_type = page_type;
      }
      if (search) {
        const searchTerms = search.split(" ").filter((term) => term.length > 2);
        if (searchTerms.length > 0) {
          where.OR = [
            { [`title_${locale}`]: { contains: search, mode: "insensitive" } },
            {
              [`excerpt_${locale}`]: { contains: search, mode: "insensitive" },
            },
            { tags: { hasSome: searchTerms } },
          ];
        }
      }

      // Build order by clause
      let orderBy: any;
      switch (sort) {
        case "oldest":
          orderBy = { created_at: "asc" };
          break;
        case "popular":
          orderBy = { seo_score: "desc" };
          break;
        case "seo_score":
          orderBy = { seo_score: "desc" };
          break;
        default:
          orderBy = { created_at: "desc" };
          break;
      }

      // Fetch from database
      const [dbContent, dbCount] = await Promise.all([
        prisma.blogPost.findMany({
          where,
          select: {
            id: true,
            title_en: true,
            title_ar: true,
            excerpt_en: true,
            excerpt_ar: true,
            slug: true,
            featured_image: true,
            page_type: true,
            seo_score: true,
            tags: true,
            created_at: true,
            updated_at: true,
            category: {
              select: { name_en: true, name_ar: true, slug: true },
            },
            author: {
              select: { id: true, name: true, image: true },
            },
          },
          orderBy,
          skip: offset,
          take: limit,
        }),
        prisma.blogPost.count({ where }),
      ]);

      // If database has content, use it
      if (dbCount > 0) {
        content = dbContent.map((post: any) => ({
          id: post.id,
          title: post[`title_${locale}`],
          excerpt: post[`excerpt_${locale}`],
          slug: post.slug,
          featured_image: post.featured_image,
          page_type: post.page_type,
          seo_score: post.seo_score,
          tags: post.tags,
          created_at: post.created_at,
          updated_at: post.updated_at,
          category: post.category,
          place: null,
          author: post.author,
          url: `${getSiteDomain(getDefaultSiteId())}/blog/${post.slug}`,
        }));
        totalCount = dbCount;
      } else {
        useStaticContent = true;
      }
    } catch (dbError) {
      console.log("Database unavailable, using static content:", dbError);
      useStaticContent = true;
    }

    // Use static content as fallback
    if (useStaticContent) {
      let filteredPosts = allStaticPosts.filter((p) => p.published);

      // Apply category filter
      if (category) {
        const categoryObj = categories.find((c) => c.slug === category);
        if (categoryObj) {
          filteredPosts = filteredPosts.filter(
            (p) => p.category_id === categoryObj.id,
          );
        }
      }

      // Apply page type filter
      if (page_type) {
        filteredPosts = filteredPosts.filter((p) => p.page_type === page_type);
      }

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        filteredPosts = filteredPosts.filter(
          (p) =>
            p.title_en.toLowerCase().includes(searchLower) ||
            p.title_ar.includes(search) ||
            p.excerpt_en.toLowerCase().includes(searchLower) ||
            p.tags.some((t) => t.toLowerCase().includes(searchLower)),
        );
      }

      // Apply sorting
      switch (sort) {
        case "oldest":
          filteredPosts.sort(
            (a, b) => a.created_at.getTime() - b.created_at.getTime(),
          );
          break;
        case "seo_score":
        case "popular":
          filteredPosts.sort((a, b) => b.seo_score - a.seo_score);
          break;
        default:
          filteredPosts.sort(
            (a, b) => b.created_at.getTime() - a.created_at.getTime(),
          );
      }

      totalCount = filteredPosts.length;
      const paginatedPosts = filteredPosts.slice(offset, offset + limit);
      content = paginatedPosts.map((p) => transformStaticPost(p, locale));
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Get featured content
    let featuredContent: any[] = [];
    if (page === 1 && !search && !category) {
      const topPosts = allStaticPosts
        .filter((p) => p.published)
        .sort((a, b) => b.seo_score - a.seo_score)
        .slice(0, 3);

      featuredContent = topPosts.map((p) => ({
        id: p.id,
        title: locale === "en" ? p.title_en : p.title_ar,
        excerpt: locale === "en" ? p.excerpt_en : p.excerpt_ar,
        slug: p.slug,
        featured_image: p.featured_image,
        page_type: p.page_type,
        created_at: p.created_at,
        category: categories.find((c) => c.id === p.category_id)
          ? {
              name_en: categories.find((c) => c.id === p.category_id)!.name_en,
              name_ar: categories.find((c) => c.id === p.category_id)!.name_ar,
              slug: categories.find((c) => c.id === p.category_id)!.slug,
            }
          : null,
      }));
    }

    return NextResponse.json({
      success: true,
      data: content,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: totalPages,
        has_next_page: hasNextPage,
        has_prev_page: hasPrevPage,
      },
      featured: featuredContent.length > 0 ? featuredContent : undefined,
      meta: {
        locale,
        category,
        page_type,
        search_query: search,
        sort_by: sort,
        source: useStaticContent ? "static" : "database",
      },
    });
  } catch (error) {
    console.error("Content listing error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch content",
      },
      { status: 500 },
    );
  }
}
