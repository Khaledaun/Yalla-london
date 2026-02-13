export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/seed-content
 *
 * Migrates static blog content into the database with FULL SEO treatment:
 *   1. BlogPost records (published, siteId, tags, keywords)
 *   2. SeoMeta records (canonical, OG, Twitter, JSON-LD, hreflang, score)
 *   3. URLIndexingStatus records (discovered → ready for indexing pipeline)
 *   4. Categories + system author auto-created
 *
 * GET  → Dry-run: shows what would be created/updated
 * POST → Execute: creates/updates all records
 *
 * Auth: CRON_SECRET bearer token
 */

function checkAuth(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// ─── Constants ──────────────────────────────────────────────────────────────

const BASE_URL = "https://www.yalla-london.com";
const SYSTEM_AUTHOR_EMAIL = "system@yalla-london.com";
const SITE_ID = "yalla-london";

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// Category slug lookup for schema.org articleSection
function getCategoryName(
  categoryId: string,
  staticCategories: any[],
): string {
  const cat = staticCategories.find((c) => c.id === categoryId);
  return cat?.name_en || "Travel Guide";
}

function mapStaticPost(
  post: any,
  authorId: string,
  categoryIdMap: Map<string, string>,
) {
  const dbCategoryId = categoryIdMap.get(post.category_id);
  if (!dbCategoryId) return null;

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
    tags: [...(post.tags || []), "imported-static"],
    page_type: post.page_type || "guide",
    keywords_json: post.keywords
      ? { primary: post.keywords.slice(0, 3), longtail: post.keywords.slice(3) }
      : undefined,
    questions_json: null,
    authority_links_json: null,
    featured_longtails_json: post.keywords
      ? post.keywords.slice(0, 2).map((k: string) => ({
          keyword: k,
          intent: "informational",
        }))
      : null,
    seo_score: post.seo_score ?? null,
    siteId: SITE_ID,
    deletedAt: null,
  };
}

// ─── SEO Record Builders ────────────────────────────────────────────────────

function buildSeoMeta(post: any, blogPostId: string, categoryName: string) {
  const url = `${BASE_URL}/blog/${post.slug}`;
  const title = post.meta_title_en || post.title_en;
  const description =
    post.meta_description_en || post.excerpt_en || post.title_en;
  const image = post.featured_image || `${BASE_URL}/og-image.jpg`;
  const publishedAt =
    post.created_at instanceof Date
      ? post.created_at.toISOString()
      : String(post.created_at);
  const updatedAt =
    post.updated_at instanceof Date
      ? post.updated_at.toISOString()
      : String(post.updated_at);

  // JSON-LD Article + BreadcrumbList schemas
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `${url}#article`,
      headline: post.title_en,
      description,
      articleBody: post.content_en?.substring(0, 500),
      author: {
        "@type": "Organization",
        "@id": `${BASE_URL}#organization`,
        name: "Yalla London",
        url: BASE_URL,
      },
      publisher: {
        "@type": "Organization",
        "@id": `${BASE_URL}#organization`,
        name: "Yalla London",
        url: BASE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${BASE_URL}/icons/icon-512x512.png`,
        },
      },
      datePublished: publishedAt,
      dateModified: updatedAt,
      mainEntityOfPage: url,
      url,
      image: {
        "@type": "ImageObject",
        url: image,
        width: 1200,
        height: 630,
      },
      articleSection: categoryName,
      keywords: (post.tags || []).join(", "),
      wordCount: post.content_en?.split(/\s+/).length || 0,
      inLanguage: "en",
      isAccessibleForFree: true,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: BASE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Blog",
          item: `${BASE_URL}/blog`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: post.title_en,
          item: url,
        },
      ],
    },
  ];

  // Calculate SEO score (simplified version of seo-meta-service)
  let score = 0;
  if (title && title.length >= 30 && title.length <= 65) score += 20;
  else if (title) score += 10;
  if (description && description.length >= 120 && description.length <= 160)
    score += 20;
  else if (description) score += 10;
  score += 10; // canonical always set
  if (image) score += 15; // OG image
  score += 10; // Twitter card always set
  score += 15; // structured data always set
  score += 10; // hreflang always set

  return {
    pageId: blogPostId,
    url,
    title,
    description,
    canonical: url,
    metaKeywords: (post.keywords || post.tags || []).join(", "),
    ogTitle: title,
    ogDescription: description,
    ogImage: image,
    ogType: "article",
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: image,
    twitterCard: "summary_large_image",
    robotsMeta: "index,follow",
    schemaType: "Article",
    structuredData,
    hreflangAlternates: {
      "en-GB": url,
      "ar-SA": `${BASE_URL}/ar/blog/${post.slug}`,
    },
    seoScore: score,
  };
}

function buildUrlIndexingStatus(post: any) {
  return {
    site_id: SITE_ID,
    url: `${BASE_URL}/blog/${post.slug}`,
    slug: post.slug,
    status: "discovered",
    submitted_indexnow: false,
    submitted_google_api: false,
    submitted_sitemap: false,
    submission_attempts: 0,
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
      seoRecords: "SeoMeta + URLIndexingStatus will be created for each article",
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

    // 1. Ensure system author
    const author = await ensureSystemAuthor(prisma);

    // 2. Ensure categories
    const categoryIdMap = await ensureCategories(prisma, staticCats);

    // 3. Upsert blog posts + SEO records
    const results = {
      created: [] as string[],
      updated: [] as string[],
      skipped: [] as string[],
      seoMetaCreated: 0,
      urlIndexingCreated: 0,
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

        // ── Upsert BlogPost ──
        let blogPostId: string;
        const existing = await prisma.blogPost.findUnique({
          where: { slug: post.slug },
          select: { id: true },
        });

        if (existing) {
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
              featured_longtails_json: mapped.featured_longtails_json,
              siteId: mapped.siteId,
              published: true,
              deletedAt: null,
            },
          });
          blogPostId = existing.id;
          results.updated.push(post.slug);
        } else {
          const created = await prisma.blogPost.create({ data: mapped });
          blogPostId = created.id;
          results.created.push(post.slug);
        }

        // ── Upsert SeoMeta (canonical, OG, Twitter, JSON-LD, hreflang) ──
        try {
          const categoryName = getCategoryName(post.category_id, staticCats);
          const seoData = buildSeoMeta(post, blogPostId, categoryName);

          await (prisma as any).seoMeta.upsert({
            where: { pageId: blogPostId },
            update: {
              url: seoData.url,
              title: seoData.title,
              description: seoData.description,
              canonical: seoData.canonical,
              metaKeywords: seoData.metaKeywords,
              ogTitle: seoData.ogTitle,
              ogDescription: seoData.ogDescription,
              ogImage: seoData.ogImage,
              ogType: seoData.ogType,
              twitterTitle: seoData.twitterTitle,
              twitterDescription: seoData.twitterDescription,
              twitterImage: seoData.twitterImage,
              twitterCard: seoData.twitterCard,
              robotsMeta: seoData.robotsMeta,
              schemaType: seoData.schemaType,
              structuredData: seoData.structuredData,
              hreflangAlternates: seoData.hreflangAlternates,
              seoScore: seoData.seoScore,
              updatedAt: new Date(),
            },
            create: {
              pageId: blogPostId,
              url: seoData.url,
              title: seoData.title,
              description: seoData.description,
              canonical: seoData.canonical,
              metaKeywords: seoData.metaKeywords,
              ogTitle: seoData.ogTitle,
              ogDescription: seoData.ogDescription,
              ogImage: seoData.ogImage,
              ogType: seoData.ogType,
              twitterTitle: seoData.twitterTitle,
              twitterDescription: seoData.twitterDescription,
              twitterImage: seoData.twitterImage,
              twitterCard: seoData.twitterCard,
              robotsMeta: seoData.robotsMeta,
              schemaType: seoData.schemaType,
              structuredData: seoData.structuredData,
              hreflangAlternates: seoData.hreflangAlternates,
              seoScore: seoData.seoScore,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
          results.seoMetaCreated++;
        } catch (seoErr: any) {
          // SeoMeta table might not exist — non-blocking
          if (!seoErr.message?.includes("does not exist")) {
            results.errors.push({
              slug: `${post.slug} [SeoMeta]`,
              error: seoErr.message?.substring(0, 150) || "SeoMeta error",
            });
          }
        }

        // ── Upsert URLIndexingStatus (for indexing pipeline) ──
        try {
          const indexData = buildUrlIndexingStatus(post);
          await (prisma as any).uRLIndexingStatus.upsert({
            where: {
              site_id_url: {
                site_id: indexData.site_id,
                url: indexData.url,
              },
            },
            update: {
              slug: indexData.slug,
            },
            create: indexData,
          });
          results.urlIndexingCreated++;
        } catch (idxErr: any) {
          // URLIndexingStatus table might not exist — non-blocking
          if (!idxErr.message?.includes("does not exist")) {
            results.errors.push({
              slug: `${post.slug} [URLIndexing]`,
              error: idxErr.message?.substring(0, 150) || "URLIndexing error",
            });
          }
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
        seoMetaRecords: results.seoMetaCreated,
        urlIndexingRecords: results.urlIndexingCreated,
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
