export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * AI Content Generation API
 *
 * Generate content using AI based on prompts or templates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  generateArticleFromPrompt,
  generateResortReview,
  generateComparison,
  generateTravelGuide,
} from '@/lib/ai/content-generator';
import { isAIAvailable } from '@/lib/ai/provider';
import { requireAdmin } from "@/lib/admin-middleware";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const {
      prompt,
      template,
      site,
      locale,
      targetWordCount,
      targetKeyword,
      resortName,
      comparisonItems,
      destination,
    } = await request.json();

    // Check if AI is available
    if (!(await isAIAvailable())) {
      return NextResponse.json(
        {
          error: 'AI is not available. Please configure API keys first.',
          requiresApiKeys: true,
        },
        { status: 503 }
      );
    }

    let article;

    // Generate based on template
    switch (template) {
      case 'resort-review':
        article = await generateResortReview({
          resortName: resortName || 'Unknown Resort',
          locale: locale || 'en',
          targetWordCount: targetWordCount || 2000,
          targetKeyword,
        });
        break;

      case 'comparison':
        article = await generateComparison({
          items: comparisonItems || [],
          comparisonType: 'resort',
          locale: locale || 'en',
          targetWordCount: targetWordCount || 2500,
        });
        break;

      case 'travel-guide':
        article = await generateTravelGuide({
          destination: destination || 'Maldives',
          locale: locale || 'en',
          targetWordCount: targetWordCount || 3000,
        });
        break;

      default:
        // Generic article from prompt
        article = await generateArticleFromPrompt({
          prompt,
          locale: locale || 'en',
          targetWordCount: targetWordCount || 1500,
        });
    }

    // Save to scheduled content (as draft)
    const scheduledContent = await prisma.scheduledContent.create({
      data: {
        title: article.title,
        content: article.content,
        content_type: 'blog_post',
        language: locale || 'en',
        tags: article.keywords,
        metadata: {
          excerpt: article.excerpt,
          metaTitle: article.metaTitle,
          metaDescription: article.metaDescription,
          wordCount: article.wordCount,
          headings: article.headings,
        },
        scheduled_time: new Date(),
        status: 'pending',
        page_type: template === 'resort-review' ? 'review' :
                   template === 'comparison' ? 'comparison' :
                   template === 'travel-guide' ? 'guide' : 'article',
        seo_score: 0,
        generation_source: 'ai_generator',
      },
    });

    return NextResponse.json({
      success: true,
      article: {
        id: scheduledContent.id,
        ...article,
      },
      message: 'Content generated successfully',
    });
  } catch (error) {
    console.error('Failed to generate content:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate content',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
