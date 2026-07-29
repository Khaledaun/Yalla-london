export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin-middleware'
import { getBaseUrl } from '@/lib/url-utils'
import { logManualAction } from '@/lib/action-logger'

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()

    const {
      title,
      titleAr,
      slug,
      pageType,
      primaryKeyword,
      longTail1,
      longTail2,
      authorityLink1,
      authorityLink2,
      authorityLink3,
      authorityLink4,
      excerpt,
      tags,
      content,
      ogImage,
      seoScore
    } = body

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const { prisma } = await import("@/lib/db");

    // Look up system user and default category
    const systemUser = await prisma.user.findFirst({
      where: { role: "admin", isActive: true },
      select: { id: true },
    });
    if (!systemUser) {
      return NextResponse.json(
        { error: 'No admin user found. Please create one first.' },
        { status: 500 }
      )
    }

    const defaultCategory = await prisma.category.findFirst({
      select: { id: true },
    });
    if (!defaultCategory) {
      return NextResponse.json(
        { error: 'No category found. Please create one first.' },
        { status: 500 }
      )
    }

    // Build keyword and authority link JSON
    const keywordsJson = [primaryKeyword, longTail1, longTail2].filter(Boolean);
    const authorityLinksJson = [authorityLink1, authorityLink2, authorityLink3, authorityLink4]
      .filter(Boolean)
      .map((url: string) => ({ url, title: "", sourceDomain: "" }));

    const { sanitizeTitle, sanitizeMetaDescription, sanitizeContentBody } = await import("@/lib/content-pipeline/title-sanitizer");
    const cleanedTitle = sanitizeTitle(title);
    const computedSlug = slug || cleanedTitle.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

    const newArticle = await prisma.blogPost.create({
      data: {
        title_en: cleanedTitle,
        title_ar: titleAr || cleanedTitle,
        slug: computedSlug,
        content_en: sanitizeContentBody(content),
        content_ar: sanitizeContentBody(content), // Same content until Arabic version is created
        excerpt_en: excerpt || content.substring(0, 157) + '...',
        excerpt_ar: excerpt || content.substring(0, 157) + '...',
        meta_title_en: sanitizeTitle(title),
        meta_description_en: sanitizeMetaDescription(excerpt || content.substring(0, 157) + '...'),
        tags: tags ? tags.split(',').map((tag: string) => tag.trim()) : [],
        published: false,
        featured_image: ogImage || null,
        page_type: pageType || 'guide',
        keywords_json: keywordsJson.length > 0 ? keywordsJson : undefined,
        authority_links_json: authorityLinksJson.length > 0 ? authorityLinksJson : undefined,
        seo_score: seoScore ? parseInt(seoScore, 10) : undefined,
        category_id: defaultCategory.id,
        author_id: systemUser.id,
      }
    })

    const publicUrl = `${await getBaseUrl()}/blog/${newArticle.slug}`

    // Track URL in indexing system immediately
    try {
      const { ensureUrlTracked } = await import("@/lib/seo/indexing-service");
      const { getDefaultSiteId } = await import("@/config/sites");
      ensureUrlTracked(publicUrl, getDefaultSiteId(), `blog/${newArticle.slug}`).catch(() => {});
    } catch {
      // Non-fatal
    }

    logManualAction(request, {
      action: "editor-save-article",
      resource: "blogpost",
      resourceId: newArticle.id,
      success: true,
      summary: `Created article "${title}" (slug: ${computedSlug}, ${content.length} chars)`,
      details: { slug: computedSlug, pageType: pageType || "guide", contentLength: content.length, hasSeoScore: !!seoScore, keywordCount: keywordsJson.length, authorityLinkCount: authorityLinksJson.length }
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Article saved successfully!',
      data: {
        id: newArticle.id,
        title: newArticle.title_en,
        slug: newArticle.slug,
        createdAt: newArticle.created_at,
        publicUrl,
        contentLength: content.length
      }
    })

  } catch (error) {
    console.error('Error saving article:', error)
    logManualAction(request, {
      action: "editor-save-article",
      resource: "blogpost",
      success: false,
      summary: `Failed to save article`,
      error: error instanceof Error ? error.message : "Unknown error",
      fix: "Check Prisma schema alignment, required fields, and database connectivity."
    }).catch(() => {});
    return NextResponse.json(
      {
        error: 'Failed to save article',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
});
