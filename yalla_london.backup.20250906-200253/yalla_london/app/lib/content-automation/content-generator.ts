
// Advanced Content Generation & Automation System

export interface ContentGenerationRequest {
  type: 'blog_post' | 'event' | 'recommendation' | 'social_post';
  language: 'en' | 'ar';
  category?: string;
  keywords?: string[];
  tone?: 'luxury' | 'casual' | 'professional' | 'friendly';
  wordCount?: number;
  includeSchema?: boolean;
}

export interface GeneratedContent {
  id?: string;
  title: string;
  slug: string;
  content: string;
  metaDescription: string;
  metaTitle: string;
  tags: string[];
  schemaMarkup?: any;
  images?: string[];
  publishDate?: string;
  seoScore?: number;
}

export class ContentAutomationEngine {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ABACUSAI_API_KEY || '';
  }

  // Generate blog post with full SEO optimization
  async generateBlogPost(request: ContentGenerationRequest): Promise<GeneratedContent> {
    const prompt = this.buildBlogPrompt(request);
    
    try {
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          type: 'blog_post',
          language: request.language,
          category: request.category
        })
      });

      const result = await response.json();
      
      return {
        title: result.title,
        slug: this.generateSlug(result.title),
        content: result.content,
        metaDescription: result.metaDescription,
        metaTitle: result.metaTitle,
        tags: result.tags || [],
        schemaMarkup: request.includeSchema ? this.generateArticleSchema(result) : undefined,
        publishDate: new Date().toISOString(),
        seoScore: this.calculateSEOScore(result)
      };
    } catch (error) {
      console.error('Content generation failed:', error);
      throw new Error('Failed to generate content');
    }
  }

  // Generate event with structured data
  async generateEvent(request: ContentGenerationRequest & { venue?: string; date?: string; price?: string }): Promise<GeneratedContent> {
    const prompt = this.buildEventPrompt(request);
    
    const response = await fetch('/api/generate-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, type: 'event', language: request.language })
    });

    const result = await response.json();
    
    return {
      title: result.title,
      slug: this.generateSlug(result.title),
      content: result.description,
      metaDescription: result.metaDescription,
      metaTitle: result.metaTitle,
      tags: result.tags || [],
      schemaMarkup: this.generateEventSchema({
        ...result,
        venue: request.venue,
        date: request.date,
        price: request.price
      }),
      publishDate: request.date || new Date().toISOString()
    };
  }

  // Generate recommendation with Place schema
  async generateRecommendation(request: ContentGenerationRequest & { 
    placeName?: string; 
    address?: string; 
    priceRange?: string; 
  }): Promise<GeneratedContent> {
    const prompt = this.buildRecommendationPrompt(request);
    
    const response = await fetch('/api/generate-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, type: 'recommendation', language: request.language })
    });

    const result = await response.json();
    
    return {
      title: result.title,
      slug: this.generateSlug(result.title),
      content: result.description,
      metaDescription: result.metaDescription,
      metaTitle: result.metaTitle,
      tags: result.tags || [],
      schemaMarkup: this.generatePlaceSchema({
        ...result,
        name: request.placeName,
        address: request.address,
        priceRange: request.priceRange
      })
    };
  }

  // Build prompts based on content type
  private buildBlogPrompt(request: ContentGenerationRequest): string {
    return `
Write a ${request.language === 'en' ? 'English' : 'Arabic'} blog post for a luxury London guide website.

Content Requirements:
- Topic: ${request.category || 'London luxury experiences'}
- Tone: ${request.tone || 'luxury'}
- Word count: ${request.wordCount || 800} words
- Keywords: ${request.keywords?.join(', ') || 'London, luxury, travel'}
- Language: ${request.language}

The blog post should include:
1. Compelling headline
2. Meta description (155 chars max)
3. Engaging introduction
4. 3-4 main sections with subheadings
5. Actionable tips for travelers
6. Strong conclusion with call-to-action
7. SEO-optimized content
8. Tags for categorization

Format the response as JSON:
{
  "title": "Blog post title",
  "metaTitle": "SEO title (60 chars max)",
  "metaDescription": "SEO description (155 chars max)",
  "content": "Full blog content with HTML formatting",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "${request.category}",
  "readingTime": "estimated reading time in minutes"
}
`;
  }

  private buildEventPrompt(request: ContentGenerationRequest): string {
    return `
Create an ${request.language === 'en' ? 'English' : 'Arabic'} event listing for a luxury London guide.

Event Requirements:
- Category: ${request.category || 'London events'}
- Language: ${request.language}
- Tone: Professional and engaging

Include:
1. Event title
2. Compelling description (200-300 words)
3. Key highlights
4. What attendees can expect
5. Meta title and description

Format as JSON:
{
  "title": "Event title",
  "metaTitle": "SEO title",
  "metaDescription": "SEO description",
  "description": "Full event description",
  "highlights": ["highlight1", "highlight2"],
  "tags": ["event", "london", "category"]
}
`;
  }

  private buildRecommendationPrompt(request: ContentGenerationRequest): string {
    return `
Write a ${request.language === 'en' ? 'English' : 'Arabic'} recommendation for a luxury London guide.

Recommendation Requirements:
- Category: ${request.category || 'London attractions'}
- Tone: ${request.tone || 'luxury'}
- Language: ${request.language}

Include:
1. Place/experience name
2. Detailed description (300-400 words)
3. Why it's special
4. Best times to visit
5. Insider tips
6. Meta information

Format as JSON:
{
  "title": "Recommendation title",
  "metaTitle": "SEO title",
  "metaDescription": "SEO description",
  "description": "Full description",
  "features": ["feature1", "feature2"],
  "insiderTips": ["tip1", "tip2"],
  "tags": ["recommendation", "london", "category"]
}
`;
  }

  // Schema generation methods
  private generateArticleSchema(content: any): any {
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": content.title,
      "description": content.metaDescription,
      "author": {
        "@type": "Organization",
        "name": "Yalla London"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Yalla London",
        "logo": {
          "@type": "ImageObject",
          "url": "https://i.pinimg.com/736x/fc/41/c5/fc41c56045c5b08eb352453e0b891d97.jpg"
        }
      },
      "datePublished": new Date().toISOString(),
      "dateModified": new Date().toISOString(),
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://yalla-london.com/blog/${this.generateSlug(content.title)}`
      }
    };
  }

  private generateEventSchema(event: any): any {
    return {
      "@context": "https://schema.org",
      "@type": "Event",
      "name": event.title,
      "description": event.description,
      "startDate": event.date,
      "location": {
        "@type": "Place",
        "name": event.venue || "London, UK",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "London",
          "addressCountry": "GB"
        }
      },
      "organizer": {
        "@type": "Organization",
        "name": "Yalla London",
        "url": "https://yalla-london.com"
      },
      "offers": event.price ? {
        "@type": "Offer",
        "price": event.price,
        "priceCurrency": "GBP"
      } : undefined
    };
  }

  private generatePlaceSchema(place: any): any {
    return {
      "@context": "https://schema.org",
      "@type": "Place",
      "name": place.name || place.title,
      "description": place.description,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": place.address,
        "addressLocality": "London",
        "addressCountry": "GB"
      },
      "priceRange": place.priceRange,
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.5",
        "ratingCount": "100",
        "bestRating": "5"
      }
    };
  }

  // Utility methods
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove multiple hyphens
      .trim();
  }

  private calculateSEOScore(content: any): number {
    let score = 0;
    
    // Title length (60 chars optimal)
    if (content.metaTitle && content.metaTitle.length >= 30 && content.metaTitle.length <= 60) {
      score += 20;
    }
    
    // Description length (155 chars optimal)
    if (content.metaDescription && content.metaDescription.length >= 120 && content.metaDescription.length <= 160) {
      score += 20;
    }
    
    // Content length
    if (content.content && content.content.length >= 300) {
      score += 20;
    }
    
    // Has tags
    if (content.tags && content.tags.length >= 3) {
      score += 20;
    }
    
    // Has structured data
    if (content.schemaMarkup) {
      score += 20;
    }
    
    return score;
  }
}

// Content scheduling system
export class ContentScheduler {
  private db: any; // Replace with actual DB instance

  constructor(db: any) {
    this.db = db;
  }

  // Schedule content for future publishing
  async scheduleContent(content: GeneratedContent, publishDate: Date): Promise<void> {
    await this.db.contentGeneration.create({
      data: {
        ...content,
        type: 'scheduled',
        publishDate: publishDate,
        used: false
      }
    });
  }

  // Get scheduled content ready for publishing
  async getReadyContent(): Promise<GeneratedContent[]> {
    const now = new Date();
    return await this.db.contentGeneration.findMany({
      where: {
        type: 'scheduled',
        publishDate: { lte: now },
        used: false
      }
    });
  }

  // Publish scheduled content
  async publishScheduledContent(): Promise<void> {
    const readyContent = await this.getReadyContent();
    
    for (const content of readyContent) {
      try {
        // Create blog post
        await this.db.blogPost.create({
          data: {
            title_en: content.title,
            title_ar: content.title, // Translate if needed
            content_en: content.content,
            content_ar: content.content, // Translate if needed
            slug: content.slug,
            meta_title_en: content.metaTitle,
            meta_description_en: content.metaDescription,
            published: true,
            tags: content.tags,
            author_id: 'system-generated' // Replace with actual author ID
          }
        });

        // Mark as used
        await this.db.contentGeneration.update({
          where: { id: content.id },
          data: { used: true }
        });

      } catch (error) {
        console.error('Failed to publish content:', error);
      }
    }
  }
}

export const contentEngine = new ContentAutomationEngine();
