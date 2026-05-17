export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { contentEngine } from '@/lib/content-automation/content-generator';
import { requireAdmin } from '@/lib/admin-middleware';


// Schedule content for automatic publishing
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { contentType, category, language, scheduleHours } = await request.json();

    // Generate content
    let generatedContent;
    
    switch (contentType) {
      case 'blog_post':
        generatedContent = await contentEngine.generateBlogPost({
          type: 'blog_post',
          language: language || 'en',
          category: category || 'london-guide',
          tone: 'luxury',
          includeSchema: true
        });
        break;
        
      default:
        return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
    }

    // Calculate publish date
    const publishDate = new Date();
    publishDate.setHours(publishDate.getHours() + (scheduleHours || 24));

    // Save scheduled content
    const scheduledContent = await prisma.contentGeneration.create({
      data: {
        prompt: `Scheduled ${contentType} - ${category}`,
        response: JSON.stringify(generatedContent),
        type: 'scheduled_' + contentType,
        language: language || 'en',
        used: false,
        // Add publishDate field to schema if needed
      }
    });

    return NextResponse.json({
      success: true,
      message: `Content scheduled for publishing in ${scheduleHours || 24} hours`,
      scheduledId: scheduledContent.id,
      publishDate: publishDate.toISOString()
    });

  } catch (error) {
    console.error('Scheduling error:', error);
    return NextResponse.json(
      { error: 'Failed to schedule content' },
      { status: 500 }
    );
  }
}

// Publish scheduled content (called by cron job)
export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // Get ready content
    const readyContent = await prisma.contentGeneration.findMany({
      where: {
        type: { startsWith: 'scheduled_' },
        used: false
      }
    });

    let publishedCount = 0;

    for (const content of readyContent) {
      try {
        const contentData = JSON.parse(content.response);
        
        // Create the actual blog post
        if (content.type.includes('blog_post')) {
          // Find or create default category and system user
          const { getDefaultSiteId } = await import("@/config/sites");
          const defaultSiteId = getDefaultSiteId();
          let category = await prisma.category.findFirst({ where: { site_id: defaultSiteId } });
          if (!category) {
            category = await prisma.category.create({
              data: { name: "General", slug: "general", site_id: defaultSiteId },
            });
          }
          let systemUser = await prisma.user.findFirst({
            where: { email: { startsWith: "system@" } },
          });
          if (!systemUser) {
            systemUser = await prisma.user.findFirst();
          }
          if (!systemUser) {
            throw new Error("No users found in database. Create an admin user first.");
          }

          await prisma.blogPost.create({
            data: {
              title_en: contentData.title,
              title_ar: contentData.title_ar || contentData.title,
              content_en: contentData.content,
              content_ar: contentData.content_ar || contentData.content,
              slug: contentData.slug || contentData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 100),
              excerpt_en: contentData.metaDescription || contentData.content?.substring(0, 155),
              excerpt_ar: contentData.metaDescription || contentData.content?.substring(0, 155),
              meta_title_en: contentData.metaTitle || contentData.title?.substring(0, 60),
              meta_description_en: contentData.metaDescription,
              tags: contentData.tags || [],
              published: true,
              siteId: defaultSiteId,
              category_id: category.id,
              author_id: systemUser.id,
            }
          });

          publishedCount++;
        }

        // Mark as used
        await prisma.contentGeneration.update({
          where: { id: content.id },
          data: { used: true }
        });

      } catch (itemError) {
        console.error(`Failed to publish content ${content.id}:`, itemError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Published ${publishedCount} scheduled content items`
    });

  } catch (error) {
    console.error('Publishing error:', error);
    return NextResponse.json(
      { error: 'Failed to publish scheduled content' },
      { status: 500 }
    );
  }
}
