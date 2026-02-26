/**
 * Bulk Publish API
 * Publish multiple content items at once from the content calendar
 *
 * POST - Bulk publish/schedule content
 * GET  - Get bulk publish status and history
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-middleware';
import { z } from 'zod';

// Validation schema
const BulkPublishSchema = z.object({
  contentIds: z.array(z.string()).min(1).max(50),
  contentType: z.enum(['scheduled_content', 'blog_post', 'mixed']).default('scheduled_content'),
  action: z.enum(['publish_now', 'schedule', 'draft', 'archive']).default('publish_now'),
  scheduledTime: z.string().datetime().optional(),
  options: z.object({
    triggerSeoAudit: z.boolean().default(true),
    submitToSearchConsole: z.boolean().default(true),
    submitToIndexNow: z.boolean().default(true),
    notifySubscribers: z.boolean().default(false),
    generateSocialPosts: z.boolean().default(false),
  }).optional(),
});

// Get bulk publish status and history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get recent bulk publish operations (from audit logs)
    const recentBulkOps = await prisma.auditLog.findMany({
      where: {
        action: 'bulk_publish',
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    // Get publishing queue status
    const [
      readyToPublish,
      scheduled,
      published,
      failed,
    ] = await Promise.all([
      prisma.scheduledContent.count({
        where: { status: 'pending', scheduled_time: { lte: new Date() } },
      }),
      prisma.scheduledContent.count({
        where: { status: 'pending', scheduled_time: { gt: new Date() } },
      }),
      prisma.scheduledContent.count({ where: { status: 'published' } }),
      prisma.scheduledContent.count({ where: { status: 'failed' } }),
    ]);

    // Get content ready for bulk actions
    const readyContent = await prisma.scheduledContent.findMany({
      where: {
        status: { in: ['pending', 'generated'] },
      },
      select: {
        id: true,
        title: true,
        content_type: true,
        language: true,
        scheduled_time: true,
        status: true,
        page_type: true,
        seo_score: true,
        created_at: true,
      },
      orderBy: { scheduled_time: 'asc' },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      status: {
        readyToPublish,
        scheduled,
        published,
        failed,
        total: readyToPublish + scheduled + published + failed,
      },
      readyContent: readyContent.map(c => ({
        id: c.id,
        title: c.title,
        contentType: c.content_type,
        language: c.language,
        scheduledTime: c.scheduled_time,
        status: c.status,
        pageType: c.page_type,
        seoScore: c.seo_score,
        createdAt: c.created_at,
      })),
      recentOperations: recentBulkOps.map(op => ({
        id: op.id,
        action: op.action,
        details: op.details,
        success: op.success,
        createdAt: op.timestamp,
      })),
    });
  } catch (error) {
    console.error('Failed to get bulk publish status:', error);
    return NextResponse.json(
      { error: 'Failed to get bulk publish status' },
      { status: 500 }
    );
  }
}

// Bulk publish content
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;

  try {
    const body = await request.json();

    const validation = BulkPublishSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { contentIds, contentType, action, scheduledTime, options } = validation.data;

    const results: any[] = [];
    const errors: any[] = [];

    const publishOptions = {
      triggerSeoAudit: options?.triggerSeoAudit ?? true,
      submitToSearchConsole: options?.submitToSearchConsole ?? true,
      submitToIndexNow: options?.submitToIndexNow ?? true,
      notifySubscribers: options?.notifySubscribers ?? false,
      generateSocialPosts: options?.generateSocialPosts ?? false,
    };

    // Process each content item
    for (const contentId of contentIds) {
      try {
        const result = await processContentAction(
          contentId,
          contentType,
          action,
          scheduledTime,
          publishOptions
        );
        results.push(result);
      } catch (error) {
        errors.push({
          contentId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Log the bulk operation
    try {
      await prisma.auditLog.create({
        data: {
          userId: 'system', // TODO: Get from auth
          action: 'bulk_publish',
          resource: contentType,
          resourceId: contentIds.join(','),
          details: {
            action,
            contentCount: contentIds.length,
            successCount: results.length,
            errorCount: errors.length,
            options: publishOptions,
            scheduledTime,
          },
          success: errors.length === 0,
        },
      });
    } catch (logError) {
      console.warn('Failed to create audit log:', logError);
    }

    // Trigger IndexNow for all published URLs if enabled
    if (action === 'publish_now' && publishOptions.submitToIndexNow && results.length > 0) {
      await submitToIndexNow(results.filter(r => r.url).map(r => r.url));
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: `Processed ${results.length} of ${contentIds.length} content items`,
      results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: contentIds.length,
        success: results.length,
        failed: errors.length,
        action,
      },
    });
  } catch (error) {
    console.error('Bulk publish failed:', error);
    return NextResponse.json(
      { error: 'Bulk publish failed' },
      { status: 500 }
    );
  }
}

// Process individual content action
async function processContentAction(
  contentId: string,
  contentType: string,
  action: string,
  scheduledTime: string | undefined,
  options: any
): Promise<any> {
  const { getSiteDomain, getDefaultSiteId } = await import("@/config/sites");

  if (contentType === 'blog_post' || contentType === 'mixed') {
    const blogPost = await prisma.blogPost.findUnique({ where: { id: contentId } });
    if (blogPost) {
      const baseUrl = getSiteDomain(blogPost.siteId || getDefaultSiteId());
      return await processBlogPostAction(blogPost, action, options, baseUrl);
    }
  }

  // Default to scheduled content
  const scheduledContent = await prisma.scheduledContent.findUnique({
    where: { id: contentId },
    include: { topic_proposal: true },
  });

  if (!scheduledContent) {
    throw new Error(`Content not found: ${contentId}`);
  }

  const baseUrl = getSiteDomain(scheduledContent.site_id || getDefaultSiteId());
  return await processScheduledContentAction(
    scheduledContent,
    action,
    scheduledTime,
    options,
    baseUrl
  );
}

// Process blog post action
async function processBlogPostAction(
  blogPost: any,
  action: string,
  options: any,
  baseUrl: string
): Promise<any> {
  const url = `${baseUrl}/blog/${blogPost.slug}`;

  switch (action) {
    case 'publish_now':
      await prisma.blogPost.update({
        where: { id: blogPost.id },
        data: { published: true, updated_at: new Date() },
      });

      if (options.submitToSearchConsole) {
        await submitToSearchConsole(url);
      }

      return {
        id: blogPost.id,
        title: blogPost.title_en,
        type: 'blog_post',
        action: 'published',
        url,
      };

    case 'draft':
      await prisma.blogPost.update({
        where: { id: blogPost.id },
        data: { published: false, updated_at: new Date() },
      });
      return {
        id: blogPost.id,
        title: blogPost.title_en,
        type: 'blog_post',
        action: 'unpublished',
      };

    default:
      return { id: blogPost.id, title: blogPost.title_en, action: 'no_change' };
  }
}

// Process scheduled content action
async function processScheduledContentAction(
  content: any,
  action: string,
  scheduledTime: string | undefined,
  options: any,
  baseUrl: string
): Promise<any> {
  switch (action) {
    case 'publish_now':
      // Create blog post from scheduled content
      const blogPost = await createBlogPostFromScheduledContent(content);
      const url = `${baseUrl}/blog/${blogPost.slug}`;

      // Update scheduled content status
      await prisma.scheduledContent.update({
        where: { id: content.id },
        data: {
          status: 'published',
          published: true,
          published_time: new Date(),
        },
      });

      // Update topic if linked
      if (content.topic_proposal_id) {
        await prisma.topicProposal.update({
          where: { id: content.topic_proposal_id },
          data: { status: 'published', updated_at: new Date() },
        });
      }

      // Trigger SEO audit if enabled
      if (options.triggerSeoAudit) {
        await triggerSeoAudit(blogPost.id, 'blog_post');
      }

      // Submit to Search Console if enabled
      if (options.submitToSearchConsole) {
        await submitToSearchConsole(url);
      }

      return {
        id: content.id,
        title: content.title,
        type: 'scheduled_content',
        action: 'published',
        blogPostId: blogPost.id,
        url,
      };

    case 'schedule':
      if (!scheduledTime) {
        throw new Error('scheduledTime is required for schedule action');
      }

      await prisma.scheduledContent.update({
        where: { id: content.id },
        data: {
          scheduled_time: new Date(scheduledTime),
          status: 'pending',
        },
      });

      return {
        id: content.id,
        title: content.title,
        type: 'scheduled_content',
        action: 'scheduled',
        scheduledTime,
      };

    case 'draft':
      await prisma.scheduledContent.update({
        where: { id: content.id },
        data: { status: 'pending' },
      });
      return {
        id: content.id,
        title: content.title,
        type: 'scheduled_content',
        action: 'moved_to_draft',
      };

    case 'archive':
      await prisma.scheduledContent.update({
        where: { id: content.id },
        data: { status: 'cancelled' },
      });
      return {
        id: content.id,
        title: content.title,
        type: 'scheduled_content',
        action: 'archived',
      };

    default:
      return { id: content.id, title: content.title, action: 'no_change' };
  }
}

// Create blog post from scheduled content
async function createBlogPostFromScheduledContent(content: any): Promise<any> {
  // Get or create default category
  let category = await prisma.category.findFirst({
    where: { slug: content.category || 'london-guide' },
  });

  if (!category) {
    category = await prisma.category.findFirst() ||
      await prisma.category.create({
        data: {
          name_en: 'London Guide',
          name_ar: 'دليل لندن',
          slug: 'london-guide',
        },
      });
  }

  // Get system user
  const systemUser = await prisma.user.findFirst() ||
    await prisma.user.create({
      data: {
        email: 'system@zenitha.luxury',
        name: 'System',
      },
    });

  // Generate slug from title
  const slug = content.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);

  // Check if slug exists and make unique
  const existingPost = await prisma.blogPost.findUnique({ where: { slug } });
  const finalSlug = existingPost ? `${slug}-${Date.now()}` : slug;

  const metadata = content.metadata || {};

  return await prisma.blogPost.create({
    data: {
      title_en: content.title,
      title_ar: content.title, // TODO: Add translation
      slug: finalSlug,
      content_en: content.content,
      content_ar: content.content, // TODO: Add translation
      excerpt_en: metadata.metaDescription || content.content.substring(0, 200),
      excerpt_ar: metadata.metaDescription || content.content.substring(0, 200),
      meta_title_en: metadata.metaTitle || content.title,
      meta_title_ar: metadata.metaTitle || content.title,
      meta_description_en: metadata.metaDescription,
      meta_description_ar: metadata.metaDescription,
      tags: content.tags || [],
      published: true,
      category_id: category.id,
      author_id: systemUser.id,
      page_type: content.page_type,
      keywords_json: metadata.keywords,
      seo_score: content.seo_score,
    },
  });
}

// Helper: Trigger SEO audit
async function triggerSeoAudit(contentId: string, contentType: string): Promise<void> {
  try {
    // Real audit score computed by pipeline scoring phase
    const auditScore = null;

    await prisma.seoAuditResult.create({
      data: {
        content_id: contentId,
        content_type: contentType,
        score: 0, // Placeholder until real pipeline scoring runs
        breakdown_json: {
          content_quality: 0,
          keyword_optimization: 0,
          technical_seo: 0,
          user_experience: 0,
        },
        suggestions: [
          'Add more internal links',
          'Optimize images for better loading',
        ],
        quick_fixes: [],
        audit_version: '4C.1',
      },
    });
  } catch (error) {
    console.warn('Failed to trigger SEO audit:', error);
  }
}

// Helper: Submit to Search Console
async function submitToSearchConsole(url: string): Promise<void> {
  try {
    const { searchConsole } = await import('@/lib/integrations/google-search-console');
    await searchConsole.submitUrl(url);
  } catch (error) {
    console.warn('Failed to submit to Search Console:', error);
  }
}

// Helper: Submit to IndexNow
async function submitToIndexNow(urls: string[]): Promise<void> {
  try {
    const indexNowKey = process.env.INDEXNOW_KEY;
    if (!indexNowKey || urls.length === 0) return;

    const host = new URL(urls[0]).host;

    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host,
        key: indexNowKey,
        keyLocation: `https://${host}/${indexNowKey}.txt`,
        urlList: urls,
      }),
    });
  } catch (error) {
    console.warn('Failed to submit to IndexNow:', error);
  }
}
