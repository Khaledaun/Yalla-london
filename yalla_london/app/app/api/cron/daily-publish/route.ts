export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getFeatureFlags } from '@/lib/feature-flags';
import { prisma } from '@/lib/db';

/**
 * Daily Publishing Automation Cron Job
 * Publishes 1 general + 1 date-relevant topic daily
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🕐 Daily publishing cron triggered');

    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const flags = getFeatureFlags();
    
    if (!flags.PHASE4B_ENABLED || !flags.AUTO_PUBLISHING) {
      console.log('⚠️ Phase 4B or auto publishing disabled');
      return NextResponse.json(
        { error: 'Auto publishing feature is disabled' },
        { status: 403 }
      );
    }

    // Check if we've already published today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const publishedToday = await prisma.scheduledContent.count({
      where: {
        published_time: {
          gte: startOfDay,
          lt: endOfDay,
        },
        generation_source: 'topic_proposal',
      },
    });

    if (publishedToday >= 2) {
      console.log(`⏭️ Already published ${publishedToday} topics today`);
      return NextResponse.json({
        success: true,
        message: 'Daily publishing quota already met',
        publishedToday,
        timestamp: new Date().toISOString()
      });
    }

    const remainingSlots = 2 - publishedToday;
    console.log(`📝 Publishing ${remainingSlots} topics today`);

    // Get approved topics sorted by priority (date-relevant first, then general)
    const availableTopics = await prisma.topicProposal.findMany({
      where: { 
        status: 'approved',
        // Exclude topics that have already been used for content
        scheduled_content: {
          none: {}
        }
      },
      orderBy: [
        { confidence_score: 'desc' },
        { created_at: 'asc' }, // Older approved topics first
      ],
      take: remainingSlots,
    });

    if (availableTopics.length === 0) {
      console.log('⚠️ No approved topics available for publishing');
      return NextResponse.json({
        success: true,
        message: 'No approved topics available for publishing',
        availableTopics: 0,
        timestamp: new Date().toISOString()
      });
    }

    const publishedContent = [];

    // Process each selected topic
    for (const topic of availableTopics) {
      try {
        // Create scheduled content from topic
        const content = await createContentFromTopic(topic);
        
        // Mark topic as used
        await prisma.topicProposal.update({
          where: { id: topic.id },
          data: { status: 'approved' }, // Keep as approved but track via scheduled_content relation
        });

        publishedContent.push({
          topicId: topic.id,
          contentId: content.id,
          title: content.title,
          status: 'published',
        });

        console.log(`✅ Published topic: ${topic.primary_keyword}`);

      } catch (error) {
        console.error(`❌ Failed to publish topic ${topic.id}:`, error);
        publishedContent.push({
          topicId: topic.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Daily publishing completed',
      publishedCount: publishedContent.filter(p => p.status === 'published').length,
      failedCount: publishedContent.filter(p => p.status === 'failed').length,
      publishedContent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Daily publishing failed:', error);
    return NextResponse.json(
      { 
        error: 'Daily publishing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function createContentFromTopic(topic: any) {
  // Extract topic data from source_weights_json
  const originalData = topic.source_weights_json?.original_data || {};
  
  // Generate article URL (this would be the actual published URL)
  const slug = generateSlug(topic.primary_keyword);
  const articleUrl = `${process.env.NEXTAUTH_URL || 'https://yalla-london.com'}/articles/${slug}`;

  // Create the scheduled content entry
  const content = await prisma.scheduledContent.create({
    data: {
      title: originalData.title || topic.primary_keyword,
      content: generateContentFromTopic(topic, originalData),
      content_type: 'blog_post',
      language: topic.locale || 'en',
      category: originalData.category || 'london_general',
      tags: topic.longtails || [],
      metadata: {
        topicId: topic.id,
        keywords: topic.longtails,
        authorityLinks: topic.authority_links_json,
        questions: topic.questions,
        articleUrl, // Store the article URL for backlink suggestions
        publishedDate: new Date().toISOString(),
        ...originalData,
      },
      scheduled_time: new Date(), // Published immediately
      published_time: new Date(),
      status: 'published',
      platform: 'blog',
      published: true,
      page_type: topic.suggested_page_type || 'guide',
      topic_proposal_id: topic.id,
      seo_score: Math.floor((topic.confidence_score || 0.8) * 100),
      generation_source: 'topic_proposal',
      authority_links_used: topic.authority_links_json,
      longtails_used: topic.longtails,
    },
  });

  return content;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function generateContentFromTopic(topic: any, originalData: any): string {
  // This is a simplified content generation - in production this would call the content generation API
  const title = originalData.title || topic.primary_keyword;
  const description = originalData.description || `Comprehensive guide to ${topic.primary_keyword} in London`;
  
  return `
# ${title}

${description}

## Key Information

${topic.questions?.map((q: string) => `### ${q}\n\n[Content to be generated]\n`).join('\n') || ''}

## Essential Details

- **Category**: ${originalData.category || 'General'}
- **Best Time to Visit**: Year-round
- **Location**: London, UK

## Authority Sources

${topic.authority_links_json?.map((link: any) => `- [${link.title}](${link.url})`).join('\n') || ''}

*This content was automatically generated and published as part of our daily content automation.*
  `.trim();
}

// Health check endpoint
export async function GET(request: NextRequest) {
  const approvedCount = await prisma.topicProposal.count({
    where: { 
      status: 'approved',
      scheduled_content: { none: {} }
    }
  });

  const publishedToday = await prisma.scheduledContent.count({
    where: {
      published_time: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
      generation_source: 'topic_proposal',
    },
  });

  return NextResponse.json({
    status: 'healthy',
    endpoint: 'daily-publish cron',
    approvedTopicsAvailable: approvedCount,
    publishedToday,
    dailyQuotaRemaining: Math.max(0, 2 - publishedToday),
    timestamp: new Date().toISOString()
  });
}