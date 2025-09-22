/**
 * Unified Content Generation Service
 * Handles all content creation workflows
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
}

export class ContentGenerationService {
  /**
   * Generate content from a topic proposal
   */
  static async generateFromTopic(topicId: string, options: Partial<ContentGenerationOptions> = {}): Promise<GeneratedContent> {
    // Get topic from database
    const topic = await prisma.topicProposal.findUnique({
      where: { id: topicId }
    })

    if (!topic) {
      throw new Error('Topic not found')
    }

    // Generate content using AI (simplified for now)
    const content = this.generateMockContent(topic, options.language || 'en')
    
    return content
  }

  /**
   * Generate content from a custom prompt
   */
  static async generateFromPrompt(prompt: string, options: Partial<ContentGenerationOptions> = {}): Promise<GeneratedContent> {
    // Generate content using AI (simplified for now)
    const content = this.generateMockContentFromPrompt(prompt, options.language || 'en')
    
    return content
  }

  /**
   * Save generated content as a blog post
   */
  static async saveAsBlogPost(content: GeneratedContent, options: ContentGenerationOptions): Promise<any> {
    const blogPost = await prisma.blogPost.create({
      data: {
        title_en: content.title,
        title_ar: content.title, // TODO: Add translation
        slug: content.slug,
        excerpt_en: content.excerpt,
        excerpt_ar: content.excerpt,
        content_en: content.content,
        content_ar: content.content,
        meta_title_en: content.metaTitle,
        meta_description_en: content.metaDescription,
        tags: content.tags,
        published: false, // Save as draft by default
        category_id: options.category || 'default-category',
        author_id: options.authorId || 'system-user'
      }
    })

    return blogPost
  }

  /**
   * Generate mock content from topic (replace with actual AI generation)
   */
  private static generateMockContent(topic: any, language: string): GeneratedContent {
    const title = topic.primary_keyword
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    
    const content = language === 'ar' 
      ? this.generateArabicContent(topic)
      : this.generateEnglishContent(topic)

    return {
      title,
      content,
      excerpt: `Comprehensive guide to ${title} in London`,
      slug,
      metaTitle: title,
      metaDescription: `Discover everything about ${title} in London. Expert guide with insider tips and recommendations.`,
      tags: topic.longtails || []
    }
  }

  /**
   * Generate mock content from prompt (replace with actual AI generation)
   */
  private static generateMockContentFromPrompt(prompt: string, language: string): GeneratedContent {
    const title = prompt.split(' ').slice(0, 6).join(' ')
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    
    const content = language === 'ar'
      ? `# ${title}\n\nهذا المحتوى تم إنشاؤه بناءً على: ${prompt}\n\n## المحتوى الرئيسي\n\n[المحتوى سيتم إنشاؤه هنا]`
      : `# ${title}\n\nThis content was generated based on: ${prompt}\n\n## Main Content\n\n[Content will be generated here]`

    return {
      title,
      content,
      excerpt: `Generated content about ${title}`,
      slug,
      metaTitle: title,
      metaDescription: `Learn about ${title} with our comprehensive guide.`,
      tags: prompt.split(' ').slice(0, 5)
    }
  }

  /**
   * Generate English content from topic
   */
  private static generateEnglishContent(topic: any): string {
    return `# ${topic.primary_keyword}

## Introduction

${topic.primary_keyword} is one of London's most fascinating topics. This comprehensive guide will help you discover everything you need to know.

## Key Information

${topic.questions?.map((q: string) => `### ${q}\n\n[Content to be generated]\n`).join('\n') || ''}

## Essential Details

- **Category**: ${topic.suggested_page_type || 'General'}
- **Best Time to Visit**: Year-round
- **Location**: London, UK

## Authority Sources

${topic.authority_links_json?.map((link: any) => `- [${link.title || link.url}](${link.url})`).join('\n') || ''}

## Long-tail Keywords Covered

${topic.longtails?.map((longtail: string) => `- ${longtail}`).join('\n') || ''}

*This content was automatically generated and is ready for review and enhancement.*`
  }

  /**
   * Generate Arabic content from topic
   */
  private static generateArabicContent(topic: any): string {
    return `# ${topic.primary_keyword}

## مقدمة

${topic.primary_keyword} هو واحد من أكثر المواضيع إثارة للاهتمام في لندن. سيساعدك هذا الدليل الشامل على اكتشاف كل ما تحتاج لمعرفته.

## المعلومات الرئيسية

${topic.questions?.map((q: string) => `### ${q}\n\n[المحتوى سيتم إنشاؤه]\n`).join('\n') || ''}

## التفاصيل الأساسية

- **الفئة**: ${topic.suggested_page_type || 'عام'}
- **أفضل وقت للزيارة**: على مدار السنة
- **الموقع**: لندن، المملكة المتحدة

## المصادر الموثوقة

${topic.authority_links_json?.map((link: any) => `- [${link.title || link.url}](${link.url})`).join('\n') || ''}

## الكلمات المفتاحية طويلة الذيل

${topic.longtails?.map((longtail: string) => `- ${longtail}`).join('\n') || ''}

*تم إنشاء هذا المحتوى تلقائياً وهو جاهز للمراجعة والتحسين.*`
  }
}

