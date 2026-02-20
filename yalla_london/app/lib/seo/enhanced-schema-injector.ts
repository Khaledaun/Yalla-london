/**
 * Enhanced Schema Injection Engine
 * Automatically detects content types and injects multiple schemas for maximum SEO impact
 */

import { SchemaGenerator, SchemaBaseProps } from './schema-generator';
import { seoMetaService } from './seo-meta-service';

export interface ContentAnalysis {
  type: 'article' | 'event' | 'place' | 'faq' | 'howto' | 'review' | 'product' | 'recipe';
  confidence: number;
  detectedElements: {
    hasFAQ: boolean;
    hasHowTo: boolean;
    hasReview: boolean;
    hasProduct: boolean;
    hasRecipe: boolean;
    hasEvent: boolean;
    hasPlace: boolean;
  };
  extractedData: {
    faqs?: Array<{ question: string; answer: string }>;
    steps?: Array<{ name: string; text: string; image?: string }>;
    rating?: number;
    products?: Array<{ name: string; price?: string; description?: string }>;
    ingredients?: string[];
    instructions?: string[];
    eventData?: any;
    placeData?: any;
  };
}

export interface SchemaInjectionResult {
  schemas: SchemaBaseProps[];
  injectedCount: number;
  types: string[];
  seoScore: number;
}

export class EnhancedSchemaInjector {
  private schemaGenerator: SchemaGenerator;
  private baseUrl: string;

  constructor(baseUrl?: string, siteId?: string) {
    // Dynamic multi-site config — avoids hardcoding any single site's branding
    let resolvedBaseUrl = baseUrl || process.env.NEXT_PUBLIC_SITE_URL;
    const { getSiteConfig, getSiteDomain, getDefaultSiteId } = require('@/config/sites');
    const effectiveSiteId = siteId || getDefaultSiteId();
    const config = getSiteConfig(effectiveSiteId);
    resolvedBaseUrl = resolvedBaseUrl || getSiteDomain(effectiveSiteId);
    // config should always exist for a valid effectiveSiteId from getDefaultSiteId()
    const domain = config?.domain || getSiteDomain(effectiveSiteId).replace('https://www.', '');
    const brandConfig = {
      siteName: config?.name || effectiveSiteId,
      description: config ? `Luxury ${config.destination} travel guide` : 'Luxury travel guide',
      contact: {
        email: `hello@${domain}`,
        social: {} as Record<string, string>,
      }
    };

    this.baseUrl = resolvedBaseUrl || getSiteDomain(effectiveSiteId);
    this.schemaGenerator = new SchemaGenerator(this.baseUrl, brandConfig);
  }

  /**
   * Analyze content and detect schema opportunities
   */
  async analyzeContent(content: string, title: string, url: string): Promise<ContentAnalysis> {
    const analysis: ContentAnalysis = {
      type: 'article',
      confidence: 0.5,
      detectedElements: {
        hasFAQ: false,
        hasHowTo: false,
        hasReview: false,
        hasProduct: false,
        hasRecipe: false,
        hasEvent: false,
        hasPlace: false
      },
      extractedData: {}
    };

    // FAQ Detection
    const faqPatterns = [
      /Q:\s*([^?]+\?)\s*A:\s*([^Q]+?)(?=Q:|$)/gi,
      /#{2,3}\s*([^#\n]+\?)\s*\n\s*([^#]+?)(?=#{2,3}|\n\n|$)/gi,
      /(?:question|faq|ask)\s*:?\s*([^?]+\?)/gi
    ];

    const faqs: Array<{ question: string; answer: string }> = [];
    for (const pattern of faqPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        faqs.push({
          question: match[1].trim(),
          answer: match[2]?.trim() || 'Answer not found'
        });
      }
    }

    if (faqs.length > 0) {
      analysis.detectedElements.hasFAQ = true;
      analysis.extractedData.faqs = faqs;
      analysis.confidence += 0.2;
    }

    // HowTo Detection
    const howToPatterns = [
      /(\d+\.\s*)([^0-9]+?)(?=\d+\.|$)/gi,
      /#{2,3}\s*(?:Step\s*\d+|Step)\s*:?\s*([^#\n]+)\s*\n\s*([^#]+?)(?=#{2,3}|\n\n|$)/gi,
      /(?:how\s+to|step\s+by\s+step|instructions?)\s*:?/gi
    ];

    const steps: Array<{ name: string; text: string; image?: string }> = [];
    for (const pattern of howToPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        steps.push({
          name: match[1]?.trim() || `Step ${steps.length + 1}`,
          text: match[2]?.trim() || match[0].trim()
        });
      }
    }

    if (steps.length >= 2) {
      analysis.detectedElements.hasHowTo = true;
      analysis.extractedData.steps = steps;
      analysis.confidence += 0.2;
    }

    // Review Detection
    const reviewPatterns = [
      /(\d+)\/5|(\d+)\s*out\s*of\s*5|★+/gi,
      /(?:review|rating|stars|recommend|experience|verdict)/gi,
      /(?:excellent|good|average|poor|terrible)/gi
    ];

    const hasReviewContent = reviewPatterns.some(pattern => pattern.test(content));
    if (hasReviewContent) {
      analysis.detectedElements.hasReview = true;
      analysis.extractedData.rating = this.extractRating(content);
      analysis.confidence += 0.15;
    }

    // Product Detection
    const productPatterns = [
      /(?:price|cost|£|€|\$)\s*(\d+(?:\.\d{2})?)/gi,
      /(?:buy|purchase|order|shop)/gi,
      /(?:product|item|service)/gi
    ];

    const hasProductContent = productPatterns.some(pattern => pattern.test(content));
    if (hasProductContent) {
      analysis.detectedElements.hasProduct = true;
      analysis.confidence += 0.1;
    }

    // Event Detection
    const eventPatterns = [
      /(?:event|conference|workshop|meeting|concert|show)/gi,
      /(?:date|time|location|venue|address)/gi,
      /(?:ticket|booking|registration)/gi
    ];

    const hasEventContent = eventPatterns.some(pattern => pattern.test(content));
    if (hasEventContent) {
      analysis.detectedElements.hasEvent = true;
      analysis.confidence += 0.15;
    }

    // Place Detection
    const placePatterns = [
      /(?:restaurant|hotel|attraction|museum|gallery|park)/gi,
      /(?:address|location|map|directions)/gi,
      /(?:opening\s+hours|contact|phone|email)/gi
    ];

    const hasPlaceContent = placePatterns.some(pattern => pattern.test(content));
    if (hasPlaceContent) {
      analysis.detectedElements.hasPlace = true;
      analysis.confidence += 0.15;
    }

    // Determine primary type
    if (analysis.detectedElements.hasFAQ && faqs.length >= 3) {
      analysis.type = 'faq';
    } else if (analysis.detectedElements.hasHowTo && steps.length >= 3) {
      analysis.type = 'howto';
    } else if (analysis.detectedElements.hasReview) {
      analysis.type = 'review';
    } else if (analysis.detectedElements.hasEvent) {
      analysis.type = 'event';
    } else if (analysis.detectedElements.hasPlace) {
      analysis.type = 'place';
    }

    return analysis;
  }

  /**
   * Inject multiple schemas based on content analysis
   */
  async injectSchemas(
    content: string,
    title: string,
    url: string,
    pageId: string,
    additionalData?: any
  ): Promise<SchemaInjectionResult> {
    try {
      // Analyze content
      const analysis = await this.analyzeContent(content, title, url);
      
      const schemas: SchemaBaseProps[] = [];
      const types: string[] = [];

      // Base Article Schema
      const articleSchema = this.schemaGenerator.generateArticle({
        title,
        content,
        slug: this.extractSlugFromUrl(url),
        publishedAt: new Date().toISOString(),
        author: additionalData?.author || 'Yalla London Team',
        category: additionalData?.category,
        tags: additionalData?.tags,
        featuredImage: additionalData?.featuredImage
      });
      schemas.push(articleSchema);
      types.push('Article');

      // FAQ Schema — DEPRECATED (Aug 2023): FAQPage restricted to govt/health sites only
      // HowTo Schema — DEPRECATED (Sept 2023): No longer generates rich results
      // FAQ/HowTo content is still valuable — it just gets Article schema instead

      // Review Schema
      if (analysis.detectedElements.hasReview) {
        const reviewSchema = this.schemaGenerator.generateReviewFromContent({
          title,
          content,
          author: additionalData?.author || 'Yalla London Team',
          publishedAt: new Date().toISOString(),
          slug: this.extractSlugFromUrl(url),
          rating: analysis.extractedData.rating,
          reviewedItem: additionalData?.reviewedItem
        });
        if (reviewSchema) {
          schemas.push(reviewSchema);
          types.push('Review');
        }
      }

      // Event Schema
      if (analysis.detectedElements.hasEvent && additionalData?.eventData) {
        const eventSchema = this.schemaGenerator.generateEvent(additionalData.eventData);
        schemas.push(eventSchema);
        types.push('Event');
      }

      // Place Schema
      if (analysis.detectedElements.hasPlace && additionalData?.placeData) {
        const placeSchema = this.schemaGenerator.generatePlace(additionalData.placeData);
        schemas.push(placeSchema);
        types.push('Place');
      }

      // Breadcrumb Schema
      const breadcrumbSchema = this.generateBreadcrumbSchema(url, title);
      if (breadcrumbSchema) {
        schemas.push(breadcrumbSchema);
        types.push('BreadcrumbList');
      }

      // Website Schema
      const websiteSchema = this.schemaGenerator.generateWebsite(true);
      schemas.push(websiteSchema);
      types.push('Website');

      // Calculate SEO score
      const seoScore = this.calculateSchemaSEOScore(schemas, analysis);

      // Save to database
      await this.saveSchemasToDatabase(pageId, schemas, seoScore);

      return {
        schemas,
        injectedCount: schemas.length,
        types,
        seoScore
      };

    } catch (error) {
      console.error('Failed to inject schemas:', error);
      throw new Error('Schema injection failed');
    }
  }

  /**
   * Save schemas to database
   */
  private async saveSchemasToDatabase(pageId: string, schemas: SchemaBaseProps[], seoScore: number): Promise<void> {
    try {
      const seoData = {
        pageId,
        url: `${this.baseUrl}/${pageId}`,
        title: 'Auto-generated SEO',
        description: 'Auto-generated description',
        structuredData: schemas,
        seoScore
      };

      await seoMetaService.saveSEOMeta(pageId, seoData);
    } catch (error) {
      console.error('Failed to save schemas to database:', error);
    }
  }

  /**
   * Generate breadcrumb schema
   */
  private generateBreadcrumbSchema(url: string, title: string): SchemaBaseProps | null {
    try {
      const urlParts = url.split('/').filter(part => part);
      const breadcrumbs = [
        { name: 'Home', url: this.baseUrl }
      ];

      let currentUrl = this.baseUrl;
      for (let i = 0; i < urlParts.length - 1; i++) {
        currentUrl += `/${urlParts[i]}`;
        breadcrumbs.push({
          name: this.formatBreadcrumbName(urlParts[i]),
          url: currentUrl
        });
      }

      breadcrumbs.push({ name: title, url });

      return this.schemaGenerator.generateBreadcrumbs(breadcrumbs);
    } catch (error) {
      console.error('Failed to generate breadcrumb schema:', error);
      return null;
    }
  }

  /**
   * Calculate SEO score based on schemas
   */
  private calculateSchemaSEOScore(schemas: SchemaBaseProps[], analysis: ContentAnalysis): number {
    let score = 0;
    const maxScore = 100;

    // Base score for having schemas
    score += Math.min(schemas.length * 10, 50);

    // Bonus for multiple schema types
    const uniqueTypes = new Set(schemas.map(s => s['@type']));
    score += uniqueTypes.size * 5;

    // Bonus for content analysis confidence
    score += analysis.confidence * 20;

    // Bonus for specific schema types
    // FAQPage and HowTo deprecated — no bonus for deprecated schema types
    if (schemas.some(s => s['@type'] === 'Review')) score += 10;
    if (schemas.some(s => s['@type'] === 'Event')) score += 10;
    if (schemas.some(s => s['@type'] === 'Place')) score += 10;

    return Math.min(score, maxScore);
  }

  /**
   * Extract rating from content
   */
  private extractRating(content: string): number {
    const ratingPatterns = [
      /(\d+)\/5/g,
      /(\d+)\s*out\s*of\s*5/gi,
      /(\d+)\s*\/\s*10/g
    ];

    for (const pattern of ratingPatterns) {
      const match = content.match(pattern);
      if (match) {
        const rating = parseInt(match[1]);
        return pattern.source.includes('10') ? Math.round(rating / 2) : rating;
      }
    }

    // Count star symbols
    const starMatch = content.match(/★+/);
    if (starMatch) {
      return Math.min(starMatch[0].length, 5);
    }

    return 4; // Default rating
  }

  /**
   * Extract time from content
   */
  private extractTimeFromContent(content: string): string | undefined {
    const timeMatch = content.match(/(\d+)\s*(minutes?|hours?|min|hr)/i);
    if (timeMatch) {
      const value = parseInt(timeMatch[1]);
      const unit = timeMatch[2].toLowerCase();
      if (unit.startsWith('h')) {
        return `PT${value}H`;
      } else {
        return `PT${value}M`;
      }
    }
    return undefined;
  }

  /**
   * Extract supplies from content
   */
  private extractSuppliesFromContent(content: string): string[] {
    const supplyPatterns = [
      /(?:supplies?|materials?|ingredients?)\s*:?\s*([^.\n]+)/gi,
      /(?:you\s+will\s+need|required|needed)\s*:?\s*([^.\n]+)/gi
    ];

    const supplies: string[] = [];
    for (const pattern of supplyPatterns) {
      const match = content.match(pattern);
      if (match) {
        const supplyText = match[1].trim();
        const supplyList = supplyText.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 0);
        supplies.push(...supplyList);
      }
    }

    return supplies.slice(0, 10); // Limit to 10 supplies
  }

  /**
   * Extract tools from content
   */
  private extractToolsFromContent(content: string): string[] {
    const toolPatterns = [
      /(?:tools?|equipment|gear)\s*:?\s*([^.\n]+)/gi,
      /(?:you\s+will\s+need|required|needed)\s*:?\s*([^.\n]+)/gi
    ];

    const tools: string[] = [];
    for (const pattern of toolPatterns) {
      const match = content.match(pattern);
      if (match) {
        const toolText = match[1].trim();
        const toolList = toolText.split(/[,;]/).map(t => t.trim()).filter(t => t.length > 0);
        tools.push(...toolList);
      }
    }

    return tools.slice(0, 10); // Limit to 10 tools
  }

  /**
   * Extract slug from URL
   */
  private extractSlugFromUrl(url: string): string {
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1] || 'page';
  }

  /**
   * Format breadcrumb name
   */
  private formatBreadcrumbName(name: string): string {
    return name
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }
}

export const enhancedSchemaInjector = new EnhancedSchemaInjector();







