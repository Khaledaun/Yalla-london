export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { contentEngine } from '@/lib/content-automation/content-generator';


// Schedule content for automatic publishing
export async function POST(request: NextRequest) {
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
          await prisma.blogPost.create({
            data: {
              title_en: contentData.title,
              title_ar: contentData.title, // TODO: Add translation
              content_en: contentData.content,
              content_ar: contentData.content, // TODO: Add translation
              slug: contentData.slug,
              excerpt_en: contentData.metaDescription,
              meta_title_en: contentData.metaTitle,
              meta_description_en: contentData.metaDescription,
              tags: contentData.tags || [],
              published: true,
              category_id: 'default-category-id', // TODO: Map to actual category
              author_id: 'system-user-id' // TODO: Map to actual user
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
