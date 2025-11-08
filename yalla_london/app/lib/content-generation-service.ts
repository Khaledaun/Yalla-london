/**
 * Unified Content Generation Service
 * Handles all content creation workflows with real AI integration
 */

import { prisma } from '@/lib/db'

export interface ContentGenerationOptions {
  type: 'blog_post' | 'social_post' | 'email'
  language: 'en' | 'ar'
  category?: string
  keywords?: string[]
  customPrompt?: string
  topicId?: string
  authorId?: string
}

export interface GeneratedContent {
  title: string
  content: string
  excerpt: string
  slug: string
  metaTitle: string
  metaDescription: string
  tags: string[]
  seoScore?: number
}

interface AIResponse {
  status: 'success' | 'error'
  content?: string
  provider_used?: string
  tokens_used?: number
  error?: string
}

export class ContentGenerationService {
  private static readonly AI_ENDPOINT = '/api/ai/generate'
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 2000 // 2 seconds

  /**
   * Generate content from a topic proposal using real AI
   */
  static async generateFromTopic(
    topicId: string,
    options: Partial<ContentGenerationOptions> = {}
  ): Promise<GeneratedContent> {
    // Get topic from database
    const topic = await prisma.topicProposal.findUnique({
      where: { id: topicId }
    })

    if (!topic) {
      throw new Error('Topic not found')
    }

    // Build AI prompt for luxury travel content
    const prompt = this.buildLuxuryTravelPrompt(topic, options.language || 'en', options.category)

    // Generate content using AI with retry logic
    const aiResponse = await this.generateWithRetry(prompt, {
      type: options.type || 'blog_post',
      language: options.language || 'en',
      maxTokens: 2000
    })

    // Parse and structure the AI response
    return this.parseAIResponse(aiResponse, topic, options.language || 'en')
  }

  /**
   * Generate content from a custom prompt using real AI
   */
  static async generateFromPrompt(
    prompt: string,
    options: Partial<ContentGenerationOptions> = {}
  ): Promise<GeneratedContent> {
    // Generate content using AI
    const aiResponse = await this.generateWithRetry(prompt, {
      type: options.type || 'blog_post',
      language: options.language || 'en',
      maxTokens: 2000
    })

    // Parse and structure the response
    return this.parseCustomPromptResponse(aiResponse, prompt, options.language || 'en')
  }

  /**
   * Save generated content as a blog post
   */
  static async saveAsBlogPost(content: GeneratedContent, options: ContentGenerationOptions): Promise<any> {
    const blogPost = await prisma.blogPost.create({
      data: {
        title_en: options.language === 'en' ? content.title : '',
        title_ar: options.language === 'ar' ? content.title : '',
        slug: content.slug,
        excerpt_en: options.language === 'en' ? content.excerpt : '',
        excerpt_ar: options.language === 'ar' ? content.excerpt : '',
        content_en: options.language === 'en' ? content.content : '',
        content_ar: options.language === 'ar' ? content.content : '',
        meta_title_en: options.language === 'en' ? content.metaTitle : '',
        meta_description_en: options.language === 'en' ? content.metaDescription : '',
        tags: content.tags,
        published: false, // Save as draft by default
        category_id: options.category || 'default-category',
        author_id: options.authorId || 'system-user'
      }
    })

    return blogPost
  }

  /**
   * Build luxury travel-focused prompt from topic
   */
  private static buildLuxuryTravelPrompt(topic: any, language: string, category?: string): string {
    const categoryPrompts: Record<string, { en: string; ar: string }> = {
      'london-guide': {
        en: 'Write a comprehensive luxury travel guide',
        ar: 'اكتب دليل سفر فاخر شامل'
      },
      'food-drink': {
        en: 'Write an in-depth review of a luxury dining establishment',
        ar: 'اكتب مراجعة متعمقة لمؤسسة طعام فاخرة'
      },
      'events': {
        en: 'Write an exclusive event coverage article',
        ar: 'اكتب مقالاً حصرياً عن حدث'
      },
      'default': {
        en: 'Write a sophisticated article',
        ar: 'اكتب مقالاً راقياً'
      }
    }

    const promptPrefix = categoryPrompts[category || 'default'] || categoryPrompts['default']

    if (language === 'ar') {
      return `${promptPrefix.ar} حول "${topic.primary_keyword}" لمنصة Yalla London.

**المتطلبات:**
- المحتوى: 1500-2000 كلمة
- الأسلوب: راقي، احترافي، موجه للمسافرين الأثرياء
- التركيز: لندن، التجارب الفاخرة، النصائح الحصرية
- الكلمات المفتاحية: ${topic.longtails?.slice(0, 5).join('، ') || topic.primary_keyword}
${topic.questions ? `\n**الأسئلة المطلوب الإجابة عنها:**\n${topic.questions.map((q: string) => `- ${q}`).join('\n')}` : ''}

**التنسيق:**
- عنوان جذاب (50-60 حرف)
- مقدمة تشويقية
- أقسام فرعية مع عناوين H2/H3
- نصائح عملية وتوصيات
- خاتمة مع دعوة للعمل

أنشئ محتوى بتنسيق HTML يتضمن:
1. عنوان رئيسي (<h1>)
2. فقرات مع تنسيق (<p>)
3. عناوين فرعية (<h2>, <h3>)
4. قوائم (<ul>, <ol>)
5. روابط مرجعية عند الحاجة`
    }

    return `${promptPrefix.en} about "${topic.primary_keyword}" for Yalla London, a luxury travel platform.

**Requirements:**
- Length: 1500-2000 words
- Style: Sophisticated, professional, tailored for affluent travelers
- Focus: London, luxury experiences, exclusive insider tips
- Keywords to naturally integrate: ${topic.longtails?.slice(0, 5).join(', ') || topic.primary_keyword}
${topic.questions ? `\n**Questions to address:**\n${topic.questions.map((q: string) => `- ${q}`).join('\n')}` : ''}

**Format:**
- Compelling title (50-60 characters)
- Engaging introduction
- Well-structured sections with H2/H3 headings
- Practical tips and recommendations
- Conclusion with call-to-action

Create HTML-formatted content including:
1. Main heading (<h1>)
2. Paragraphs with formatting (<p>)
3. Subheadings (<h2>, <h3>)
4. Lists (<ul>, <ol>)
5. Reference links where appropriate

Write in a tone that reflects Yalla London's brand: elegant, informative, and insider-focused.`
  }

  /**
   * Generate content with retry logic
   */
  private static async generateWithRetry(
    prompt: string,
    options: { type: string; language: string; maxTokens: number }
  ): Promise<string> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(this.AI_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            type: 'content',
            language: options.language,
            max_tokens: options.maxTokens,
            temperature: 0.7,
            provider: 'auto' // Let the system choose best provider
          })
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(`AI API error: ${response.status} - ${error.error || 'Unknown'}`)
        }

        const data: AIResponse = await response.json()

        if (data.status === 'error') {
          throw new Error(data.error || 'AI generation failed')
        }

        if (!data.content) {
          throw new Error('No content returned from AI')
        }

        return data.content
      } catch (error) {
        lastError = error as Error

        // Don't retry on the last attempt
        if (attempt < this.MAX_RETRIES - 1) {
          // Exponential backoff
          const delay = this.RETRY_DELAY * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }
    }

    // If all retries failed, throw the last error
    throw new Error(`AI content generation failed after ${this.MAX_RETRIES} attempts: ${lastError?.message}`)
  }

  /**
   * Parse AI response into structured content
   */
  private static parseAIResponse(
    aiContent: string,
    topic: any,
    language: string
  ): GeneratedContent {
    // Extract title from content (first H1 or use topic keyword)
    const titleMatch = aiContent.match(/<h1[^>]*>(.*?)<\/h1>/i) || aiContent.match(/^#\s+(.+)$/m)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : topic.primary_keyword

    // Generate slug from title
    const slug = this.generateSlug(title)

    // Extract first paragraph as excerpt
    const excerptMatch = aiContent.match(/<p[^>]*>(.*?)<\/p>/i)
    const excerpt = excerptMatch
      ? excerptMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 160)
      : `Discover ${title} - Exclusive guide from Yalla London`

    // Generate meta title (optimized for SEO)
    const metaTitle = title.length <= 60 ? title : title.slice(0, 57) + '...'

    // Generate meta description
    const metaDescription = excerpt.length <= 155 ? excerpt : excerpt.slice(0, 152) + '...'

    // Extract or generate tags
    const tags = topic.longtails?.slice(0, 5) || [topic.primary_keyword]

    return {
      title,
      content: aiContent,
      excerpt,
      slug,
      metaTitle,
      metaDescription,
      tags,
      seoScore: 85 // Placeholder - actual SEO scoring happens later
    }
  }

  /**
   * Parse custom prompt AI response
   */
  private static parseCustomPromptResponse(
    aiContent: string,
    originalPrompt: string,
    language: string
  ): GeneratedContent {
    // Extract title from content
    const titleMatch = aiContent.match(/<h1[^>]*>(.*?)<\/h1>/i) || aiContent.match(/^#\s+(.+)$/m)
    const title = titleMatch
      ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
      : originalPrompt.split(' ').slice(0, 6).join(' ')

    const slug = this.generateSlug(title)

    // Extract first paragraph as excerpt
    const excerptMatch = aiContent.match(/<p[^>]*>(.*?)<\/p>/i)
    const excerpt = excerptMatch
      ? excerptMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 160)
      : `Generated content about ${title}`

    const metaTitle = title.length <= 60 ? title : title.slice(0, 57) + '...'
    const metaDescription = excerpt.length <= 155 ? excerpt : excerpt.slice(0, 152) + '...'

    // Extract keywords from prompt
    const tags = originalPrompt.split(' ')
      .filter(word => word.length > 4)
      .slice(0, 5)

    return {
      title,
      content: aiContent,
      excerpt,
      slug,
      metaTitle,
      metaDescription,
      tags,
      seoScore: 80
    }
  }

  /**
   * Generate URL-friendly slug from title
   */
  private static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
  }
}
