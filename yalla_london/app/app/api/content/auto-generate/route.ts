export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { NextRequest, NextResponse } from 'next/server';
import { ContentGenerationService } from '@/lib/content-generation-service';

// Auto-generate content endpoint
export async function POST(request: NextRequest) {
  try {
    const { type, category, language, keywords, customPrompt, topicId, saveAsBlogPost } = await request.json();

    let generatedContent;

    // Generate content based on source
    if (topicId) {
      // Generate from topic
      generatedContent = await ContentGenerationService.generateFromTopic(topicId, {
        type,
        language: language || 'en',
        category,
        keywords
      });
    } else if (customPrompt) {
      // Generate from custom prompt
      generatedContent = await ContentGenerationService.generateFromPrompt(customPrompt, {
        type,
        language: language || 'en',
        category,
        keywords
      });
    } else {
      // Fallback to direct generation
      generatedContent = await generateContentDirect(type, category, language, keywords, customPrompt);
    }

    // Save as blog post if requested
    if (saveAsBlogPost && generatedContent) {
      try {
        const blogPost = await ContentGenerationService.saveAsBlogPost(generatedContent, {
          type,
          language: language || 'en',
          category,
          keywords,
          topicId
        });
        
        return NextResponse.json({
          success: true,
          content: generatedContent,
          blogPost,
          message: 'Content generated and saved as blog post successfully.'
        });
      } catch (dbError) {
        console.warn('Failed to save as blog post:', dbError);
        // Continue with regular response
      }
    }

    // Try to save to content generation table as backup
    try {
      const { prisma } = await import('@/lib/db');
      await prisma.contentGeneration.create({
        data: {
          prompt: `Auto-generated ${type} - ${category}`,
          response: JSON.stringify(generatedContent),
          type: type,
          language: language || 'en',
          used: false
        }
      });
    } catch (dbError) {
      console.warn('Database save failed, but content generation succeeded:', dbError);
    }

    return NextResponse.json({
      success: true,
      content: generatedContent,
      message: 'Content generated successfully. Review before publishing.'
    });

  } catch (error) {
    console.error('Auto-generation error:', error);
    return NextResponse.json(
      { error: `Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// Direct content generation function
async function generateContentDirect(type: string, category: string, language: string, keywords: string[], customPrompt?: string) {
  const apiKey = process.env.ABACUSAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('ABACUSAI_API_KEY not found in environment variables');
  }

  let prompt = '';
  let systemPrompt = '';

  // Build prompts based on content type
  switch (type) {
    case 'blog_post':
      systemPrompt = language === 'en' 
        ? `You are a luxury travel content creator for "Yalla London". Create a detailed blog post about luxury London experiences. Write in an elegant, informative style that appeals to affluent travelers. Include practical details, insider tips, and cultural insights.

Return a JSON response with these fields:
{
  "title": "Blog post title (60 chars max)",
  "metaTitle": "SEO title (60 chars max)", 
  "metaDescription": "SEO description (155 chars max)",
  "content": "Full blog content with HTML formatting (800+ words)",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "${category}",
  "seoScore": 85
}`
        : `أنت منشئ محتوى سفر فاخر لـ"يالا لندن". أنشئ مقالة مدونة مفصلة حول تجارب لندن الفاخرة. اكتب بأسلوب أنيق ومفيد يجذب المسافرين الأثرياء.

أرجع استجابة JSON بهذه الحقول:
{
  "title": "عنوان المقال (60 حرف كحد أقصى)",
  "metaTitle": "عنوان SEO (60 حرف كحد أقصى)",
  "metaDescription": "وصف SEO (155 حرف كحد أقصى)", 
  "content": "محتوى المقال الكامل مع تنسيق HTML (800+ كلمة)",
  "tags": ["وسم1", "وسم2", "وسم3"],
  "category": "${category}",
  "seoScore": 85
}`;

      prompt = customPrompt || `Write a luxury blog post about ${category} in London. Keywords: ${keywords?.join(', ') || 'London, luxury, travel'}`;
      break;

    case 'event':
      systemPrompt = language === 'en' 
        ? `Create an event listing for a luxury London experience. Focus on high-end, exclusive events.

Return JSON:
{
  "title": "Event title",
  "metaTitle": "SEO title",
  "metaDescription": "SEO description",
  "content": "Event description with details",
  "tags": ["event", "london", "luxury"],
  "venue": "London venue",
  "date": "${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}"
}`
        : `أنشئ قائمة فعاليات لتجربة لندن الفاخرة. ركز على الفعاليات الراقية والحصرية.`;

      prompt = customPrompt || `Create a luxury event listing for ${category} in London`;
      break;

    case 'recommendation':
      systemPrompt = language === 'en' 
        ? `Create a luxury recommendation for London. Focus on high-end establishments.

Return JSON:
{
  "title": "Recommendation title",
  "metaTitle": "SEO title", 
  "metaDescription": "SEO description",
  "content": "Detailed recommendation with insider tips",
  "tags": ["recommendation", "london", "luxury"],
  "features": ["feature1", "feature2"],
  "priceRange": "£££"
}`
        : `أنشئ توصية فاخرة للندن. ركز على المؤسسات الراقية.`;

      prompt = customPrompt || `Create a luxury recommendation for ${category} in London`;
      break;

    default:
      throw new Error('Invalid content type');
  }

  // Call AI API
  const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user', 
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API responded with status: ${response.status}`);
  }

  const result = await response.json();
  const aiContent = result.choices?.[0]?.message?.content;
  
  if (!aiContent) {
    throw new Error('No content received from AI API');
  }

  // Try to parse as JSON, fallback to text
  let generatedContent;
  try {
    generatedContent = JSON.parse(aiContent);
  } catch {
    // Fallback for non-JSON responses
    generatedContent = {
      title: `Generated ${type}: ${category}`,
      metaTitle: `Generated ${type}: ${category}`,
      metaDescription: `AI generated content about ${category} in London`,
      content: aiContent,
      tags: [type, 'london', category],
      seoScore: 75
    };
  }

  // Add common fields
  generatedContent.id = `gen_${Date.now()}`;
  generatedContent.slug = generateSlug(generatedContent.title);
  generatedContent.publishDate = new Date().toISOString();
  generatedContent.language = language;
  generatedContent.type = type;

  return generatedContent;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Get generated content for review
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const language = searchParams.get('language');

    const whereClause: any = { used: false };
    if (type) whereClause.type = type;
    if (language) whereClause.language = language;

    try {
      const { prisma } = await import('@/lib/db');
      const generatedContent = await prisma.contentGeneration.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        take: 10
      });

      return NextResponse.json({
        success: true,
        content: generatedContent.map((item: any) => ({
          id: item.id,
          type: item.type,
          language: item.language,
          content: JSON.parse(item.response),
          createdAt: item.created_at
        }))
      });
    } catch (dbError) {
      // Return empty array if database is not available
      return NextResponse.json({
        success: true,
        content: [],
        message: 'Database not available - showing empty results'
      });
    }

  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch generated content' },
      { status: 500 }
    );
  }
}
