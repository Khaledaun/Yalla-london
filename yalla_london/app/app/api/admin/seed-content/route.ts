export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/seed-content
 *
 * Migrates static blog content (data/blog-content.ts + blog-content-extended.ts)
 * into the BlogPost database table so the SEO agent, indexing pipeline,
 * CMS, and content orchestrator can treat them like any other article.
 *
 * GET  → Dry-run: shows what would be created/updated
 * POST → Execute: actually creates/updates records
 *
 * Auth: CRON_SECRET bearer token
 */

function checkAuth(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const SYSTEM_AUTHOR_EMAIL = "system@yalla-london.com";
const SITE_ID = "yalla-london";

async function ensureSystemAuthor(prisma: any) {
  return prisma.user.upsert({
    where: { email: SYSTEM_AUTHOR_EMAIL },
    update: {},
    create: {
      email: SYSTEM_AUTHOR_EMAIL,
      name: "Yalla London",
      role: "editor",
      isActive: true,
    },
  });
}

async function ensureCategories(
  prisma: any,
  staticCategories: any[],
): Promise<Map<string, string>> {
  // Maps static category ID → DB category ID
  const idMap = new Map<string, string>();

  for (const cat of staticCategories) {
    const dbCat = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name_en: cat.name_en,
        name_ar: cat.name_ar,
        description_en: cat.description_en || null,
        description_ar: cat.description_ar || null,
      },
      create: {
        name_en: cat.name_en,
        name_ar: cat.name_ar,
        slug: cat.slug,
        description_en: cat.description_en || null,
        description_ar: cat.description_ar || null,
      },
    });
    idMap.set(cat.id, dbCat.id);
  }

  return idMap;
}

function mapStaticPost(
  post: any,
  authorId: string,
  categoryIdMap: Map<string, string>,
) {
  // Map the static category_id to the DB category_id
  const dbCategoryId = categoryIdMap.get(post.category_id);
  if (!dbCategoryId) {
    return null; // Skip if category not found
  }

  return {
    title_en: post.title_en,
    title_ar: post.title_ar,
    slug: post.slug,
    excerpt_en: post.excerpt_en || null,
    excerpt_ar: post.excerpt_ar || null,
    content_en: post.content_en,
    content_ar: post.content_ar,
    featured_image: post.featured_image || null,
    published: true,
    category_id: dbCategoryId,
    author_id: authorId,
    meta_title_en: post.meta_title_en || null,
    meta_title_ar: post.meta_title_ar || null,
    meta_description_en: post.meta_description_en || null,
    meta_description_ar: post.meta_description_ar || null,
    tags: [
      ...(post.tags || []),
      "imported-static", // Track origin
    ],
    page_type: post.page_type || "guide",
    keywords_json: post.keywords ? { primary: post.keywords } : undefined,
    seo_score: post.seo_score ?? null,
    siteId: SITE_ID,
    deletedAt: null,
  };
}

// ─── Route Handlers ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authError = checkAuth(request);
  if (authError) return authError;

  try {
    const { blogPosts, categories: staticCats } = await import(
      "@/data/blog-content"
    );
    const { extendedBlogPosts } = await import(
      "@/data/blog-content-extended"
    );
    const allStatic = [...blogPosts, ...extendedBlogPosts].filter(
      (p) => p.published,
    );

    const { prisma } = await import("@/lib/db");

    // Check which slugs already exist in DB
    const existingSlugs = new Set(
      (
        await prisma.blogPost.findMany({
          where: { slug: { in: allStatic.map((p) => p.slug) } },
          select: { slug: true },
        })
      ).map((p: any) => p.slug),
    );

    const toCreate = allStatic.filter((p) => !existingSlugs.has(p.slug));
    const toUpdate = allStatic.filter((p) => existingSlugs.has(p.slug));

    return NextResponse.json({
      success: true,
      action: "dry-run",
      totalStatic: allStatic.length,
      categories: staticCats.length,
      alreadyInDb: toUpdate.length,
      toCreate: toCreate.length,
      toUpdate: toUpdate.length,
      slugsToCreate: toCreate.map((p) => p.slug),
      slugsToUpdate: toUpdate.map((p) => p.slug),
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = checkAuth(request);
  if (authError) return authError;

  const startTime = Date.now();

  try {
    const { blogPosts, categories: staticCats } = await import(
      "@/data/blog-content"
    );
    const { extendedBlogPosts } = await import(
      "@/data/blog-content-extended"
    );
    const allStatic = [...blogPosts, ...extendedBlogPosts].filter(
      (p) => p.published,
    );

    const { prisma } = await import("@/lib/db");

    // 1. Ensure system author exists
    const author = await ensureSystemAuthor(prisma);

    // 2. Ensure categories exist and get ID mapping
    const categoryIdMap = await ensureCategories(prisma, staticCats);

    // 3. Upsert each blog post
    const results = {
      created: [] as string[],
      updated: [] as string[],
      skipped: [] as string[],
      errors: [] as { slug: string; error: string }[],
    };

    for (const post of allStatic) {
      try {
        const mapped = mapStaticPost(post, author.id, categoryIdMap);
        if (!mapped) {
          results.skipped.push(
            `${post.slug} (category ${post.category_id} not found)`,
          );
          continue;
        }

        const existing = await prisma.blogPost.findUnique({
          where: { slug: post.slug },
          select: { id: true },
        });

        if (existing) {
          // Update existing — preserve any DB-side changes to seo_score etc.
          await prisma.blogPost.update({
            where: { slug: post.slug },
            data: {
              title_en: mapped.title_en,
              title_ar: mapped.title_ar,
              content_en: mapped.content_en,
              content_ar: mapped.content_ar,
              excerpt_en: mapped.excerpt_en,
              excerpt_ar: mapped.excerpt_ar,
              featured_image: mapped.featured_image,
              meta_title_en: mapped.meta_title_en,
              meta_title_ar: mapped.meta_title_ar,
              meta_description_en: mapped.meta_description_en,
              meta_description_ar: mapped.meta_description_ar,
              tags: mapped.tags,
              page_type: mapped.page_type,
              keywords_json: mapped.keywords_json,
              siteId: mapped.siteId,
              published: true,
              deletedAt: null,
            },
          });
          results.updated.push(post.slug);
        } else {
          await prisma.blogPost.create({ data: mapped });
          results.created.push(post.slug);
        }
      } catch (e: any) {
        results.errors.push({
          slug: post.slug,
          error: e.message?.substring(0, 200) || "Unknown error",
        });
      }
    }

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      action: "seed",
      durationMs,
      author: { id: author.id, email: author.email },
      categories: categoryIdMap.size,
      results,
      summary: {
        total: allStatic.length,
        created: results.created.length,
        updated: results.updated.length,
        skipped: results.skipped.length,
        errors: results.errors.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 },
    );
  }
}
