
/**
 * Phase 4B Content Generation API
 * Automated content creation with topic research integration
 */
import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { prisma } from '@/lib/db';
import { getBrandConfig } from '@/config/brand-config';

interface ContentGenerationRequest {
  topicId: string;
  contentType: 'article' | 'guide' | 'list' | 'review';
  locale: 'en' | 'ar';
  publishSchedule?: string;
}

interface GeneratedContent {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
  category: string;
  featuredImage?: string;
  readingTime: number;
}

const CONTENT_TEMPLATES = {
  article: {
    system: "You are a London travel and culture expert writer. Create engaging, informative articles that capture the essence of London's diverse offerings.",
    structure: "Introduction → Main Content (3-4 sections) → Practical Tips → Conclusion"
  },
  guide: {
    system: "You are a comprehensive London guide writer. Create practical, actionable guides that help visitors and locals alike.",
    structure: "Overview → Step-by-step Guide → Insider Tips → What to Expect → Resources"
  },
  list: {
    system: "You are a London curator creating compelling list-based content. Focus on variety, quality, and local insights.",
    structure: "Introduction → Curated List Items (5-10) → Why Each Matters → Getting There → Final Thoughts"
  },
  review: {
    system: "You are an honest London reviewer with deep local knowledge. Provide balanced, detailed reviews that help readers make informed decisions.",
    structure: "Overview → Detailed Review → Pros & Cons → Price & Value → Final Verdict"
  }
};

async function generateContent(topic: any, request: ContentGenerationRequest): Promise<GeneratedContent> {
  const brandConfig = getBrandConfig();
  const template = CONTENT_TEMPLATES[request.contentType];
  
  const prompt = `
Create a ${request.contentType} about "${topic.title}" for ${brandConfig.name}.

Topic Details:
- Description: ${topic.description}
- Category: ${topic.category}
- Keywords: ${topic.keywords.join(', ')}
- Search Intent: ${topic.searchIntent}
- Locale: ${request.locale}

Content Requirements:
- Length: 800-1200 words
- Tone: ${brandConfig.content?.tone || 'Friendly and informative'}
- Target Audience: ${brandConfig.content?.audience || 'London visitors and locals'}
- Brand Voice: ${brandConfig.content?.voice || 'Authentic, local, engaging'}
- Structure: ${template.structure}

SEO Requirements:
- Primary keyword integration
- Natural keyword density (1-2%)
- Clear headings (H2, H3)
- Meta title (50-60 chars)
- Meta description (150-160 chars)

Format as JSON:
{
  "title": "Engaging title with primary keyword",
  "slug": "url-friendly-slug",
  "excerpt": "Compelling 2-3 sentence summary",
  "content": "Full HTML content with proper headings",
  "seoTitle": "SEO-optimized title",
  "seoDescription": "SEO meta description",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "appropriate category",
  "readingTime": estimated_minutes
}
`;

  try {
    // Call your preferred AI service (OpenAI, Claude, etc.)
    // For this example, we'll use the configured LLM API
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: template.system },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        maxTokens: 2500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Content generation failed: ${response.status}`);
    }

    const data = await response.json();
    const contentText = data.choices?.[0]?.message?.content || data.content;
    
    if (!contentText) {
      throw new Error('No content generated');
    }

    // Parse JSON response
    const cleanedContent = contentText.replace(/```json|```/g, '').trim();
    const generatedContent = JSON.parse(cleanedContent) as GeneratedContent;
    
    return generatedContent;
    
  } catch (error) {
    console.error('Content generation error:', error);
    throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const flags = getFeatureFlags();
    
    if (!flags.PHASE4B_ENABLED || !flags.AUTO_CONTENT_GENERATION) {
      return NextResponse.json(
        { error: 'Content generation feature is disabled' },
        { status: 403 }
      );
    }

    const requestData: ContentGenerationRequest = await request.json();
    const { topicId, contentType, locale, publishSchedule } = requestData;

    // Validate input
    if (!topicId || !contentType || !locale) {
      return NextResponse.json(
        { error: 'Missing required fields: topicId, contentType, locale' },
        { status: 400 }
      );
    }

    // Get approved topic
    const topic = await prisma.topicProposal.findFirst({
      where: {
        id: topicId,
        status: 'approved'
      }
    });

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic not found or not approved' },
        { status: 404 }
      );
    }

    // Generate content
    const generatedContent = await generateContent(topic, requestData);

    // Save as draft
    const draft = await prisma.content.create({
      data: {
        title: generatedContent.title,
        slug: generatedContent.slug,
        excerpt: generatedContent.excerpt,
        content: generatedContent.content,
        status: 'draft',
        type: 'post',
        locale,
        seoTitle: generatedContent.seoTitle,
        seoDescription: generatedContent.seoDescription,
        tags: generatedContent.tags,
        category: generatedContent.category,
        featuredImage: generatedContent.featuredImage,
        readingTime: generatedContent.readingTime,
        publishedAt: publishSchedule ? new Date(publishSchedule) : null,
        metadata: {
          topicId,
          contentType,
          generatedAt: new Date().toISOString(),
          aiGenerated: true,
          needsReview: true,
        },
      },
    });

    // Update topic status
    await prisma.topicProposal.update({
      where: { id: topicId },
      data: { 
        status: 'used',
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      draft,
      topic,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Content generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const flags = getFeatureFlags();
    
    if (!flags.PHASE4B_ENABLED || !flags.AUTO_CONTENT_GENERATION) {
      return NextResponse.json(
        { error: 'Content generation feature is disabled' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'draft';
    const locale = searchParams.get('locale');
    const limit = parseInt(searchParams.get('limit') || '20');

    const whereClause: any = { status };
    if (locale) {
      whereClause.locale = locale;
    }

    // Only show AI-generated content
    whereClause.metadata = {
      path: ['aiGenerated'],
      equals: true
    };

    const drafts = await prisma.content.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      drafts,
      count: drafts.length,
      filters: { status, locale },
    });

  } catch (error) {
    console.error('Draft fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drafts' },
      { status: 500 }
    );
  }
}
