
import { prisma } from '@/lib/db';
import { contentScheduler } from '@/lib/integrations/content-scheduler';

interface AutoGenerationRule {
  id: string;
  name: string;
  contentType: string;
  language: string;
  frequencyHours: number;
  autoPublish: boolean;
  categories: string[];
  isActive: boolean;
}

export class AutoContentScheduler {
  private isRunning = false;

  /** Maximum content items that can be generated per single run */
  private static readonly MAX_GENERATIONS_PER_RUN = 10;
  /** Maximum content items that can be generated per 24-hour period */
  private static readonly MAX_GENERATIONS_PER_DAY = 20;
  /** Maximum content items that can be published per single run */
  private static readonly MAX_PUBLISHES_PER_RUN = 10;

  // Process automatic content generation
  async processAutoGeneration(): Promise<void> {
    if (this.isRunning) {
      console.log('Auto-generation already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('Starting automatic content generation...');

    try {
      // Rate limit check: count how many items were generated in the last 24 hours
      const recentGenerationCount = await prisma.scheduledContent.count({
        where: {
          created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          metadata: { path: ['generatedBy'], equals: 'auto-scheduler' }
        }
      }).catch(() => 0);

      if (recentGenerationCount >= AutoContentScheduler.MAX_GENERATIONS_PER_DAY) {
        console.log(`Daily generation limit reached (${recentGenerationCount}/${AutoContentScheduler.MAX_GENERATIONS_PER_DAY}). Skipping generation.`);
        // Still publish ready content even when generation limit is reached
        await this.publishReadyContent();
        return;
      }

      const remainingBudget = AutoContentScheduler.MAX_GENERATIONS_PER_DAY - recentGenerationCount;
      const runBudget = Math.min(remainingBudget, AutoContentScheduler.MAX_GENERATIONS_PER_RUN);

      // Get active automation rules
      const rules = await this.getActiveRules();
      console.log(`Found ${rules.length} active automation rules (budget: ${runBudget} items)`);

      let generatedCount = 0;
      for (const rule of rules) {
        if (generatedCount >= runBudget) {
          console.log(`Generation budget exhausted (${generatedCount}/${runBudget}), stopping.`);
          break;
        }
        try {
          await this.processRule(rule);
          generatedCount++;
        } catch (error) {
          console.error(`Failed to process rule ${rule.name}:`, error);
        }
      }

      // Also publish any ready content
      await this.publishReadyContent();

    } catch (error) {
      console.error('Auto-generation process failed:', error);
    } finally {
      this.isRunning = false;
      console.log('Auto-generation process completed');
    }
  }

  private async getActiveRules(): Promise<AutoGenerationRule[]> {
    try {
      const rules = await prisma.contentScheduleRule.findMany({
        where: { is_active: true }
      });

      return rules.map((rule: any) => ({
        id: rule.id,
        name: rule.name,
        contentType: rule.content_type,
        language: rule.language,
        frequencyHours: rule.frequency_hours,
        autoPublish: rule.auto_publish,
        categories: rule.categories,
        isActive: rule.is_active
      }));
    } catch (error) {
      console.error('Failed to fetch automation rules:', error);
      return [];
    }
  }

  private async processRule(rule: AutoGenerationRule): Promise<void> {
    console.log(`Processing rule: ${rule.name}`);

    // Check if we need to generate content for this rule
    const shouldGenerate = await this.shouldGenerateForRule(rule);
    if (!shouldGenerate) {
      console.log(`Skipping rule ${rule.name} - not due yet`);
      return;
    }

    // Generate content for each category
    for (const category of rule.categories) {
      try {
        const scheduledContent = await this.generateAndScheduleContent(
          rule.contentType,
          category,
          rule.language,
          rule.autoPublish
        );

        if (scheduledContent) {
          console.log(`✅ Generated and scheduled: ${scheduledContent.title}`);
        }
      } catch (error) {
        console.error(`Failed to generate content for category ${category}:`, error);
      }
    }
  }

  private async shouldGenerateForRule(rule: AutoGenerationRule): Promise<boolean> {
    try {
      // Check when we last generated content for this rule
      const lastGenerated = await prisma.scheduledContent.findFirst({
        where: {
          content_type: rule.contentType,
          language: rule.language,
          category: { in: rule.categories }
        },
        orderBy: { created_at: 'desc' }
      });

      if (!lastGenerated) {
        return true; // Never generated, so generate now
      }

      // Check if enough time has passed
      const timeSinceLastGeneration = Date.now() - lastGenerated.created_at.getTime();
      const requiredInterval = rule.frequencyHours * 60 * 60 * 1000; // Convert to milliseconds

      return timeSinceLastGeneration >= requiredInterval;
    } catch (error) {
      console.error('Error checking generation timing:', error);
      return false;
    }
  }

  private async generateAndScheduleContent(
    contentType: string,
    category: string,
    language: string,
    autoPublish: boolean
  ): Promise<any> {
    try {
      // Content deduplication check: prevent generating content too similar to recent posts
      const recentSimilarContent = await prisma.scheduledContent.findMany({
        where: {
          content_type: contentType,
          category,
          language,
          created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        select: { title: true },
        orderBy: { created_at: 'desc' },
        take: 10,
      });

      const recentBlogPosts = await prisma.blogPost.findMany({
        where: {
          published: true,
          created_at: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
        },
        select: { title_en: true, title_ar: true },
        orderBy: { created_at: 'desc' },
        take: 20,
      });

      const existingTitles = [
        ...recentSimilarContent.map(c => c.title?.toLowerCase() || ''),
        ...recentBlogPosts.map(p => (p.title_en || '').toLowerCase()),
        ...recentBlogPosts.map(p => (p.title_ar || '').toLowerCase()),
      ].filter(Boolean);

      // Generate content using the content generation API
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/content/auto-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: contentType,
          category,
          language,
          keywords: this.getKeywordsForCategory(category),
          customPrompt: this.getPromptForCategory(category, language)
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Content generation failed');
      }

      const generatedContent = result.content;

      // Deduplication: check if generated title is too similar to existing content
      const generatedTitleLower = (generatedContent.title || '').toLowerCase();
      const isDuplicate = existingTitles.some(existing => {
        if (!existing || !generatedTitleLower) return false;
        // Check for exact match or high substring overlap
        if (existing === generatedTitleLower) return true;
        // Check if titles share more than 60% of words
        const existingWords = new Set(existing.split(/\s+/));
        const newWords = generatedTitleLower.split(/\s+/);
        const overlap = newWords.filter(w => existingWords.has(w)).length;
        return newWords.length > 0 && overlap / newWords.length > 0.6;
      });

      if (isDuplicate) {
        console.warn(`Skipping duplicate content: "${generatedContent.title}" is too similar to existing content`);
        return null;
      }

      // Calculate schedule time
      const scheduledTime = autoPublish 
        ? this.getNextPublishTime()
        : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now for review

      // Schedule the content
      const scheduledContent = await prisma.scheduledContent.create({
        data: {
          title: generatedContent.title,
          content: generatedContent.content,
          content_type: contentType,
          language,
          category,
          tags: generatedContent.tags || [],
          metadata: {
            metaTitle: generatedContent.metaTitle,
            metaDescription: generatedContent.metaDescription,
            seoScore: generatedContent.seoScore,
            generatedBy: 'auto-scheduler',
            generatedAt: new Date().toISOString()
          },
          scheduled_time: scheduledTime,
          status: autoPublish ? 'pending' : 'pending',
          platform: 'blog'
        }
      });

      return scheduledContent;
    } catch (error) {
      console.error('Content generation and scheduling failed:', error);
      return null;
    }
  }

  private getNextPublishTime(): Date {
    // Smart scheduling based on optimal posting times
    const now = new Date();
    const preferredTimes = [9, 15, 21]; // 9 AM, 3 PM, 9 PM
    const currentHour = now.getHours();

    // Find next preferred time
    const nextPreferredHour = preferredTimes.find(hour => hour > currentHour) || preferredTimes[0];
    
    const scheduledTime = new Date(now);
    scheduledTime.setHours(nextPreferredHour, 0, 0, 0);
    
    // If the preferred time is earlier than now, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    return scheduledTime;
  }

  private getKeywordsForCategory(category: string): string[] {
    const categoryKeywords: Record<string, string[]> = {
      'london-guide': ['London', 'luxury', 'travel', 'guide', 'experience'],
      'food-drink': ['London', 'restaurant', 'food', 'dining', 'cuisine'],
      'events': ['London', 'events', 'tickets', 'entertainment', 'culture'],
      'culture-art': ['London', 'art', 'culture', 'museum', 'gallery'],
      'style-shopping': ['London', 'fashion', 'shopping', 'style', 'boutique'],
      'uk-travel': ['UK', 'travel', 'Britain', 'England', 'tourism']
    };

    return categoryKeywords[category] || ['London', 'luxury', 'guide'];
  }

  private getPromptForCategory(category: string, language: string): string {
    const prompts: Record<string, Record<string, string>> = {
      'london-guide': {
        'en': 'Write a comprehensive luxury travel guide about an exclusive London experience that most tourists miss. Focus on insider tips and premium offerings.',
        'ar': 'اكتب دليل سفر فاخر شامل حول تجربة لندن الحصرية التي يفوتها معظم السياح. ركز على النصائح الداخلية والعروض المميزة.'
      },
      'food-drink': {
        'en': 'Create an in-depth review of a luxury dining establishment in London, highlighting unique dishes and exceptional service.',
        'ar': 'أنشئ مراجعة متعمقة لمؤسسة طعام فاخرة في لندن، مع التركيز على الأطباق الفريدة والخدمة الاستثنائية.'
      },
      'events': {
        'en': 'Write about an exclusive London event or cultural experience, including booking details and insider access tips.',
        'ar': 'اكتب عن حدث أو تجربة ثقافية حصرية في لندن، بما في ذلك تفاصيل الحجز ونصائح الوصول الداخلي.'
      }
    };

    return prompts[category]?.[language] || prompts['london-guide'][language];
  }

  // Publish content that's ready to be published
  private async publishReadyContent(): Promise<void> {
    try {
      const readyContent = await prisma.scheduledContent.findMany({
        where: {
          status: 'pending',
          scheduled_time: { lte: new Date() }
        },
        take: 10 // Process max 10 items at a time
      });

      console.log(`Found ${readyContent.length} content items ready for publishing`);

      for (const content of readyContent) {
        try {
          await this.publishContent(content);
          
          await prisma.scheduledContent.update({
            where: { id: content.id },
            data: { 
              status: 'published',
              published_time: new Date()
            }
          });

          console.log(`✅ Published: ${content.title}`);
        } catch (error) {
          console.error(`Failed to publish content ${content.id}:`, error);
          
          await prisma.scheduledContent.update({
            where: { id: content.id },
            data: { status: 'failed' }
          });
        }
      }
    } catch (error) {
      console.error('Failed to publish ready content:', error);
    }
  }

  private async publishContent(content: any): Promise<void> {
    if (content.content_type === 'blog_post') {
      // Get a default category and author
      const defaultCategory = await prisma.category.findFirst() || 
        await prisma.category.create({
          data: {
            name_en: 'Auto Generated',
            name_ar: 'مولد تلقائياً',
            slug: 'auto-generated',
            description_en: 'Automatically generated content',
            description_ar: 'محتوى مولد تلقائياً'
          }
        });

      const systemUser = await prisma.user.findFirst() ||
        await prisma.user.create({
          data: {
            email: 'system@yallalondon.com',
            name: 'System'
          }
        });

      // Generate Arabic translations via AI provider if content is English
      const isArabicContent = content.language === 'ar';
      let titleAr = content.title;
      let contentAr = content.content;
      let excerptAr = content.metadata?.metaDescription || content.content.substring(0, 200);
      let metaTitleAr = content.metadata?.metaTitle || content.title;
      let metaDescriptionAr = content.metadata?.metaDescription || '';

      if (!isArabicContent) {
        try {
          const translationResponse = await fetch(
            `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/content/auto-generate`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'blog_post',
                language: 'ar',
                category: content.category,
                customPrompt: `Translate the following English content to Arabic. Maintain the same tone, formatting, and SEO quality. Return JSON with: title, content, metaTitle, metaDescription.\n\nTitle: ${content.title}\n\nContent: ${content.content.substring(0, 3000)}`
              })
            }
          );
          if (translationResponse.ok) {
            const translationResult = await translationResponse.json();
            if (translationResult.success && translationResult.content) {
              titleAr = translationResult.content.title || titleAr;
              contentAr = translationResult.content.content || contentAr;
              excerptAr = translationResult.content.metaDescription || excerptAr;
              metaTitleAr = translationResult.content.metaTitle || metaTitleAr;
              metaDescriptionAr = translationResult.content.metaDescription || metaDescriptionAr;
            }
          }
        } catch (translationError) {
          console.warn('Arabic translation failed, using English content as fallback:', translationError);
        }
      }

      // Create the blog post with proper bilingual content
      await prisma.blogPost.create({
        data: {
          title_en: isArabicContent ? content.title : content.title,
          title_ar: titleAr,
          content_en: isArabicContent ? content.content : content.content,
          content_ar: contentAr,
          slug: this.generateSlug(content.title),
          excerpt_en: content.metadata?.metaDescription || content.content.substring(0, 200),
          excerpt_ar: excerptAr,
          meta_title_en: content.metadata?.metaTitle || content.title,
          meta_title_ar: metaTitleAr,
          meta_description_en: content.metadata?.metaDescription,
          meta_description_ar: metaDescriptionAr,
          tags: content.tags,
          published: true,
          category_id: defaultCategory.id,
          author_id: systemUser.id
        }
      });

      // Submit to search console if configured
      try {
        const { searchConsole } = await import('@/lib/integrations/google-search-console');
        const slug = this.generateSlug(content.title);
        await searchConsole.submitUrl(`${process.env.NEXT_PUBLIC_SITE_URL}/blog/${slug}`);
      } catch (error) {
        console.warn('Failed to submit to Search Console:', error);
      }
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}

export const autoContentScheduler = new AutoContentScheduler();
