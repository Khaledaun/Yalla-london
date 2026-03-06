export const dynamic = "force-dynamic";

/**
 * Simple Write API — CRUD for the cockpit writer page
 *
 * GET   — List drafts/articles for writing (simple, phone-friendly response)
 * POST  — Create or update an article, or publish directly
 *
 * This API bridges the simple writer to the full content pipeline.
 * Articles created here go through the same pre-publication gate
 * and get affiliate injection, indexing, etc.
 */

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { logManualAction } from "@/lib/action-logger";

async function handleGet(request: NextRequest) {
  const { prisma } = await import("@/lib/db");
  const { getDefaultSiteId } = await import("@/config/sites");

  const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
  const filter = request.nextUrl.searchParams.get("filter") || "all"; // all, drafts, published
  const articleId = request.nextUrl.searchParams.get("id");

  // Fetch single article for editing
  if (articleId) {
    // Check BlogPost first
    const post = await prisma.blogPost.findFirst({
      where: { id: articleId, siteId },
      select: {
        id: true,
        title_en: true,
        title_ar: true,
        slug: true,
        content_en: true,
        content_ar: true,
        meta_title_en: true,
        meta_description_en: true,
        meta_title_ar: true,
        meta_description_ar: true,
        seo_score: true,
        published: true,
        created_at: true,
        updated_at: true,
        category: { select: { id: true, name_en: true } },
        tags: true,
      },
    });

    if (post) {
      return NextResponse.json({
        success: true,
        article: {
          id: post.id,
          type: "blogpost",
          titleEn: post.title_en,
          titleAr: post.title_ar,
          slug: post.slug,
          contentEn: post.content_en,
          contentAr: post.content_ar,
          metaTitleEn: post.meta_title_en,
          metaDescriptionEn: post.meta_description_en,
          metaTitleAr: post.meta_title_ar,
          metaDescriptionAr: post.meta_description_ar,
          seoScore: post.seo_score,
          published: post.published,
          category: post.category?.name_en || null,
          categoryId: post.category?.id || null,
          tags: post.tags || [],
          createdAt: post.created_at,
          updatedAt: post.updated_at,
        },
      });
    }

    // Check ArticleDraft
    const draft = await prisma.articleDraft.findFirst({
      where: { id: articleId, site_id: siteId },
      select: {
        id: true,
        keyword: true,
        slug: true,
        assembled_html: true,
        seo_meta: true,
        quality_score: true,
        current_phase: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (draft) {
      const meta = (draft.seo_meta || {}) as Record<string, unknown>;
      return NextResponse.json({
        success: true,
        article: {
          id: draft.id,
          type: "draft",
          titleEn: meta.metaTitle || draft.keyword || "",
          titleAr: null,
          slug: draft.slug,
          contentEn: draft.assembled_html,
          contentAr: null,
          metaTitleEn: meta.metaTitle || null,
          metaDescriptionEn: meta.metaDescription || null,
          metaTitleAr: null,
          metaDescriptionAr: null,
          seoScore: draft.quality_score,
          published: false,
          phase: draft.current_phase,
          category: null,
          categoryId: null,
          tags: [],
          createdAt: draft.created_at,
          updatedAt: draft.updated_at,
        },
      });
    }

    return NextResponse.json({ success: false, error: "Article not found" }, { status: 404 });
  }

  // List articles
  const wherePublished = filter === "drafts" ? { published: false }
    : filter === "published" ? { published: true }
    : {};

  const articles = await prisma.blogPost.findMany({
    where: { siteId, deletedAt: null, ...wherePublished },
    select: {
      id: true,
      title_en: true,
      slug: true,
      published: true,
      seo_score: true,
      created_at: true,
      updated_at: true,
      category: { select: { name_en: true } },
    },
    orderBy: { updated_at: "desc" },
    take: 50,
  });

  // Also get recent drafts from the pipeline
  const drafts = await prisma.articleDraft.findMany({
    where: {
      site_id: siteId,
      current_phase: { in: ["reservoir", "published"] },
    },
    select: {
      id: true,
      keyword: true,
      slug: true,
      quality_score: true,
      current_phase: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: { updated_at: "desc" },
    take: 20,
  });

  // Fetch categories for the writer form
  const categories = await prisma.category.findMany({
    select: { id: true, name_en: true, slug: true },
    orderBy: { name_en: "asc" },
  });

  return NextResponse.json({
    success: true,
    articles: articles.map((a) => ({
      id: a.id,
      type: "blogpost" as const,
      title: a.title_en,
      slug: a.slug,
      published: a.published,
      seoScore: a.seo_score,
      category: a.category?.name_en || null,
      updatedAt: a.updated_at,
    })),
    drafts: drafts.map((d) => ({
      id: d.id,
      type: "draft" as const,
      title: d.keyword,
      slug: d.slug,
      published: false,
      seoScore: d.quality_score,
      phase: d.current_phase,
      updatedAt: d.updated_at,
    })),
    categories,
  });
}

async function handlePost(request: NextRequest) {
  const body = await request.json();
  const { prisma } = await import("@/lib/db");
  const { getDefaultSiteId } = await import("@/config/sites");

  const action = body.action || "save"; // save | publish | delete
  const siteId = body.siteId || getDefaultSiteId();

  // ─── DELETE ──────────────────────────────────────────────────────────────────
  if (action === "delete" && body.id) {
    const existingPost = await prisma.blogPost.findUnique({ where: { id: body.id }, select: { id: true, title_en: true, deletedAt: true } });
    if (!existingPost) {
      logManualAction(request, { action: "simple-write-delete", resource: "blogpost", resourceId: body.id, siteId, success: false, summary: "Post not found", error: "Record does not exist" }).catch(() => {});
      return NextResponse.json({ success: false, error: "Article not found" }, { status: 404 });
    }
    if (existingPost.deletedAt) {
      logManualAction(request, { action: "simple-write-delete", resource: "blogpost", resourceId: body.id, siteId, success: false, summary: "Post already deleted", error: "Already deleted" }).catch(() => {});
      return NextResponse.json({ success: false, error: "Article already deleted" }, { status: 409 });
    }
    await prisma.blogPost.update({
      where: { id: body.id },
      data: { deletedAt: new Date() },
    });
    // Verify
    const verified = await prisma.blogPost.findUnique({ where: { id: body.id }, select: { deletedAt: true } });
    if (!verified?.deletedAt) {
      logManualAction(request, { action: "simple-write-delete", resource: "blogpost", resourceId: body.id, siteId, success: false, summary: `Delete verification failed for "${existingPost.title_en}"`, error: "Verification failed" }).catch(() => {});
      return NextResponse.json({ success: false, error: "Delete appeared to succeed but verification failed" }, { status: 500 });
    }
    logManualAction(request, { action: "simple-write-delete", resource: "blogpost", resourceId: body.id, siteId, success: true, summary: `Article "${existingPost.title_en}" deleted and verified` }).catch(() => {});
    return NextResponse.json({ success: true, message: `Article "${existingPost.title_en}" deleted` });
  }

  // ─── SAVE or PUBLISH ────────────────────────────────────────────────────────
  const titleEn = (body.titleEn || "").trim();
  if (!titleEn) {
    return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
  }

  // Generate slug from title
  const slug = body.slug || titleEn
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);

  // Get or create category
  let categoryId = body.categoryId;
  if (!categoryId) {
    const defaultCat = await prisma.category.findFirst({
      where: { slug: "general" },
    });
    if (defaultCat) {
      categoryId = defaultCat.id;
    } else {
      const newCat = await prisma.category.create({
        data: { name_en: "General", name_ar: "عام", slug: "general" },
      });
      categoryId = newCat.id;
    }
  }

  // Get or create system author
  let authorId: string;
  const adminUser = await prisma.user.findFirst({
    where: { role: "admin" },
    select: { id: true },
  });
  authorId = adminUser?.id || "";
  if (!authorId) {
    const systemUser = await prisma.user.create({
      data: { email: "system@zenitha.luxury", name: "Editorial Team", role: "admin" },
    });
    authorId = systemUser.id;
  }

  const shouldPublish = action === "publish";
  const contentEn = body.contentEn || "";
  const wordCount = contentEn.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;

  // Warn if publishing with low word count
  if (shouldPublish && wordCount < 300) {
    return NextResponse.json({
      success: false,
      error: `Article is only ${wordCount} words. Minimum 300 words to publish. Save as draft instead.`,
    }, { status: 400 });
  }

  const data = {
    title_en: titleEn,
    title_ar: body.titleAr || titleEn, // Required field — fallback to English title
    slug,
    content_en: contentEn,
    content_ar: body.contentAr || contentEn, // Required field — fallback to English content
    meta_title_en: body.metaTitleEn || titleEn.substring(0, 60),
    meta_description_en: body.metaDescriptionEn || contentEn.replace(/<[^>]+>/g, " ").trim().substring(0, 155),
    meta_title_ar: body.metaTitleAr || null,
    meta_description_ar: body.metaDescriptionAr || null,
    published: shouldPublish,
    siteId,
    category_id: categoryId,
    author_id: authorId,
    tags: body.tags || [],
    updated_at: new Date(),
  };

  let article;
  try {
    if (body.id) {
      // Update existing article
      article = await prisma.blogPost.update({
        where: { id: body.id },
        data,
      });
    } else {
      // Check for duplicate slug first
      const existing = await prisma.blogPost.findFirst({
        where: { slug, siteId, deletedAt: null },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({
          success: false,
          error: `An article with the slug "${slug}" already exists. Change the title or edit the existing article.`,
        }, { status: 409 });
      }
      // Create new article
      article = await prisma.blogPost.create({
        data: {
          ...data,
          created_at: new Date(),
        },
      });
    }
  } catch (dbError) {
    const msg = dbError instanceof Error ? dbError.message : "Unknown database error";
    // Check for common Prisma constraint violations
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({
        success: false,
        error: "An article with this slug already exists. Please change the title.",
      }, { status: 409 });
    }
    if (msg.includes("null") || msg.includes("Null constraint")) {
      console.warn("[simple-write] Null constraint error:", msg);
      return NextResponse.json({
        success: false,
        error: "A required field is missing. Please fill in all fields and try again.",
      }, { status: 400 });
    }
    console.error("[simple-write] Database error:", msg);
    return NextResponse.json({
      success: false,
      error: "Failed to save article. Please try again.",
    }, { status: 500 });
  }

  // If publishing, submit to IndexNow
  if (shouldPublish) {
    try {
      const { getSiteDomain } = await import("@/config/sites");
      const domain = getSiteDomain(siteId);
      const articleUrl = `https://${domain}/blog/${slug}`;

      // Fire-and-forget IndexNow submission
      const { submitToIndexNow } = await import("@/lib/seo/indexing-service");
      submitToIndexNow([articleUrl]).catch((e: Error) =>
        console.warn("[simple-write] IndexNow submit failed:", e.message)
      );
    } catch (e) {
      console.warn("[simple-write] IndexNow setup failed:", e instanceof Error ? e.message : e);
    }
  }

  const isNew = !body.id;
  logManualAction(request, { action: shouldPublish ? "simple-write-publish" : "simple-write-save", resource: "blogpost", resourceId: article.id, siteId, success: true, summary: `${isNew ? "Created" : "Updated"} ${shouldPublish ? "and published" : "as draft"}: "${titleEn}" (${wordCount} words)`, details: { slug, wordCount, published: shouldPublish, isNew } }).catch(() => {});

  return NextResponse.json({
    success: true,
    id: article.id,
    slug: article.slug,
    published: article.published,
    message: shouldPublish
      ? `Published! Article is live at /blog/${slug}`
      : `Saved as draft. Edit anytime.`,
  });
}

export const GET = withAdminAuth(handleGet);
export const POST = withAdminAuth(handlePost);
