/**
 * Auto-SEO Service
 * Automatically generates and applies SEO optimizations
 */

import { seoMetaService, SEOMetaData } from './seo-meta-service';
import { SchemaGenerator } from './schema-generator';
import { enhancedSchemaInjector } from './enhanced-schema-injector';
import { dynamicInternalLinking } from './dynamic-internal-linking';
import { aiSEOAudit } from './ai-seo-audit';
import { enhancedSitemapGenerator } from './enhanced-sitemap-generator';

export interface ContentData {
  id: string;
  title: string;
  content: string;
  slug: string;
  excerpt?: string;
  author?: string;
  publishedAt: string;
  language: 'en' | 'ar';
  category?: string;
  tags?: string[];
  featuredImage?: string;
  type: 'article' | 'event' | 'place' | 'page';
}

export class AutoSEOService {
  private schemaGenerator: SchemaGenerator;
  private baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_SITE_URL || 'https://yalla-london.com') {
    this.baseUrl = baseUrl;
    this.schemaGenerator = new SchemaGenerator(baseUrl, {
      siteName: 'Yalla London',
      description: 'Luxury London travel guide',
      contact: {
        email: 'hello@yalla-london.com',
        social: {
          twitter: 'https://twitter.com/yallalondon',
          instagram: 'https://instagram.com/yallalondon'
        }
      }
    });
  }

  /**
   * Auto-generate SEO metadata for content
   */
  async generateSEOMeta(contentData: ContentData): Promise<SEOMetaData> {
    try {
      // Generate title
      const title = await this.generateSEOTitle(contentData);
      
      // Generate description
      const description = await this.generateSEODescription(contentData);
      
      // Generate canonical URL
      const canonical = this.generateCanonicalURL(contentData);
      
      // Generate Open Graph data
      const ogData = await this.generateOpenGraphData(contentData, title, description);
      
      // Generate Twitter Card data
      const twitterData = await this.generateTwitterCardData(contentData, title, description);
      
      // Generate structured data
      const structuredData = this.generateStructuredData(contentData);
      
      // Generate hreflang alternates
      const hreflangAlternates = this.generateHreflangAlternates(contentData);

      const seoData: SEOMetaData = {
        pageId: contentData.id,
        url: canonical,
        title,
        description,
        canonical,
        metaKeywords: contentData.tags?.join(', '),
        ogTitle: ogData.title,
        ogDescription: ogData.description,
        ogImage: ogData.image,
        ogType: 'article',
        twitterTitle: twitterData.title,
        twitterDescription: twitterData.description,
        twitterImage: twitterData.image,
        twitterCard: 'summary_large_image',
        robotsMeta: 'index,follow',
        schemaType: this.getSchemaType(contentData.type),
        hreflangAlternates,
        structuredData
      };

      // Calculate SEO score
      seoData.seoScore = seoMetaService.calculateSEOScore(seoData);

      return seoData;
    } catch (error) {
      console.error('Failed to generate SEO meta:', error);
      throw new Error('Failed to generate SEO metadata');
    }
  }

  /**
   * Auto-optimize content for SEO
   */
  async optimizeContentForSEO(contentData: ContentData): Promise<{
    optimizedContent: string;
    seoData: SEOMetaData;
  }> {
    try {
      // Generate SEO metadata
      const seoData = await this.generateSEOMeta(contentData);
      
      // Optimize content structure
      const optimizedContent = await this.optimizeContentStructure(contentData);
      
      return {
        optimizedContent,
        seoData
      };
    } catch (error) {
      console.error('Failed to optimize content for SEO:', error);
      throw new Error('Failed to optimize content for SEO');
    }
  }

  /**
   * Apply auto-SEO to content creation
   */
  async applyAutoSEO(contentData: ContentData): Promise<void> {
    try {
      // Generate and save SEO metadata
      const seoData = await this.generateSEOMeta(contentData);
      await seoMetaService.saveSEOMeta(contentData.id, seoData);
      
      // Enhanced schema injection
      const schemaResult = await enhancedSchemaInjector.injectSchemas(
        contentData.content,
        contentData.title,
        seoData.url || '',
        contentData.id,
        {
          author: contentData.author,
          category: contentData.category,
          tags: contentData.tags,
          featuredImage: contentData.featuredImage
        }
      );
      
      // Dynamic internal linking
      const linkingResult = await dynamicInternalLinking.generateInternalLinks(
        contentData.id,
        contentData.content,
        contentData.title,
        contentData.category || 'general'
      );
      
      // AI SEO audit
      const auditData = {
        pageId: contentData.id,
        url: seoData.url || '',
        title: contentData.title,
        metaDescription: seoData.description,
        content: contentData.content,
        images: this.extractImagesFromContent(contentData.content),
        links: this.extractLinksFromContent(contentData.content),
        headings: this.extractHeadingsFromContent(contentData.content),
        wordCount: contentData.content.split(/\s+/).length,
        readingTime: Math.ceil(contentData.content.split(/\s+/).length / 200),
        schemaData: schemaResult.schemas
      };
      
      const auditResult = await aiSEOAudit.performSEOAudit(auditData);
      
      // Update sitemap
      await this.updateSitemap(contentData);
      
      // Submit to Search Console
      await this.submitToSearchConsole(contentData);
      
      console.log(`Enhanced Auto-SEO applied to content: ${contentData.title}`);
      console.log(`- Schemas injected: ${schemaResult.injectedCount}`);
      console.log(`- Internal links created: ${linkingResult.linksCreated}`);
      console.log(`- SEO score: ${auditResult.overallScore}/100`);
      
    } catch (error) {
      console.error('Failed to apply auto-SEO:', error);
      throw new Error('Failed to apply auto-SEO');
    }
  }

  /**
   * Generate SEO-optimized title
   */
  private async generateSEOTitle(contentData: ContentData): Promise<string> {
    try {
      const response = await fetch('/api/seo/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentData.content,
          title: contentData.title,
          language: contentData.language,
          type: contentData.type
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.title || contentData.title;
      }
    } catch (error) {
      console.warn('Failed to generate SEO title, using original:', error);
    }

    // Fallback: optimize original title
    return this.optimizeTitle(contentData.title, contentData.language);
  }

  /**
   * Generate SEO-optimized description
   */
  private async generateSEODescription(contentData: ContentData): Promise<string> {
    try {
      const response = await fetch('/api/seo/generate-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentData.content,
          title: contentData.title,
          language: contentData.language
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.description || contentData.excerpt || '';
      }
    } catch (error) {
      console.warn('Failed to generate SEO description, using excerpt:', error);
    }

    // Fallback: use excerpt or generate from content
    return contentData.excerpt || this.generateDescriptionFromContent(contentData.content);
  }

  /**
   * Generate canonical URL
   */
  private generateCanonicalURL(contentData: ContentData): string {
    const baseUrl = this.baseUrl;
    
    switch (contentData.type) {
      case 'article':
        return `${baseUrl}/blog/${contentData.slug}`;
      case 'event':
        return `${baseUrl}/events/${contentData.slug}`;
      case 'place':
        return `${baseUrl}/places/${contentData.slug}`;
      default:
        return `${baseUrl}/${contentData.slug}`;
    }
  }

  /**
   * Generate Open Graph data
   */
  private async generateOpenGraphData(
    contentData: ContentData, 
    title: string, 
    description: string
  ): Promise<{ title: string; description: string; image: string }> {
    return {
      title: title,
      description: description,
      image: contentData.featuredImage || `${this.baseUrl}/images/default-og-image.jpg`
    };
  }

  /**
   * Generate Twitter Card data
   */
  private async generateTwitterCardData(
    contentData: ContentData, 
    title: string, 
    description: string
  ): Promise<{ title: string; description: string; image: string }> {
    return {
      title: title,
      description: description,
      image: contentData.featuredImage || `${this.baseUrl}/images/default-twitter-image.jpg`
    };
  }

  /**
   * Generate structured data
   */
  private generateStructuredData(contentData: ContentData): any {
    const schemaData = {
      title: contentData.title,
      content: contentData.content,
      slug: contentData.slug,
      author: contentData.author,
      publishedAt: contentData.publishedAt,
      category: contentData.category,
      tags: contentData.tags,
      featuredImage: contentData.featuredImage
    };

    return this.schemaGenerator.generateSchemaForPageType(contentData.type, schemaData);
  }

  /**
   * Generate hreflang alternates
   */
  private generateHreflangAlternates(contentData: ContentData): Record<string, string> {
    const alternates: Record<string, string> = {};
    const canonical = this.generateCanonicalURL(contentData);
    
    // Add current language
    alternates[contentData.language] = canonical;
    
    // Add alternate language if available
    const alternateLang = contentData.language === 'en' ? 'ar' : 'en';
    alternates[alternateLang] = canonical.replace(`/${contentData.language}/`, `/${alternateLang}/`);
    
    return alternates;
  }

  /**
   * Get schema type for content type
   */
  private getSchemaType(contentType: string): string {
    switch (contentType) {
      case 'article':
        return 'Article';
      case 'event':
        return 'Event';
      case 'place':
        return 'Place';
      default:
        return 'WebPage';
    }
  }

  /**
   * Optimize content structure
   */
  private async optimizeContentStructure(contentData: ContentData): Promise<string> {
    try {
      const response = await fetch('/api/seo/optimize-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentData.content,
          title: contentData.title,
          keywords: contentData.tags,
          language: contentData.language
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.optimizedContent || contentData.content;
      }
    } catch (error) {
      console.warn('Failed to optimize content structure, using original:', error);
    }

    return contentData.content;
  }

  /**
   * Update sitemap
   */
  private async updateSitemap(contentData: ContentData): Promise<void> {
    try {
      await fetch('/api/sitemap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'articles' })
      });
    } catch (error) {
      console.warn('Failed to update sitemap:', error);
    }
  }

  /**
   * Submit to Search Console
   */
  private async submitToSearchConsole(contentData: ContentData): Promise<void> {
    try {
      const url = this.generateCanonicalURL(contentData);
      await fetch('/api/seo/submit-to-search-console', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
    } catch (error) {
      console.warn('Failed to submit to Search Console:', error);
    }
  }

  /**
   * Optimize title for SEO
   */
  private optimizeTitle(title: string, language: 'en' | 'ar'): string {
    const maxLength = language === 'en' ? 60 : 80;
    
    if (title.length <= maxLength) {
      return title;
    }
    
    // Truncate and add ellipsis
    return title.substring(0, maxLength - 3) + '...';
  }

  /**
   * Generate description from content
   */
  private generateDescriptionFromContent(content: string): string {
    // Remove HTML tags and get first 160 characters
    const plainText = content.replace(/<[^>]*>/g, '');
    const maxLength = 160;
    
    if (plainText.length <= maxLength) {
      return plainText;
    }
    
    // Find last complete sentence within limit
    const truncated = plainText.substring(0, maxLength);
    const lastSentence = truncated.lastIndexOf('.');
    
    if (lastSentence > maxLength * 0.7) {
      return truncated.substring(0, lastSentence + 1);
    }
    
    return truncated.substring(0, maxLength - 3) + '...';
  }

  /**
   * Extract images from content
   */
  private extractImagesFromContent(content: string): Array<{
    src: string;
    alt: string;
    title?: string;
  }> {
    const images: Array<{ src: string; alt: string; title?: string }> = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*(?:title=["']([^"']*)["'])?[^>]*>/gi;
    
    let match;
    while ((match = imgRegex.exec(content)) !== null) {
      images.push({
        src: match[1],
        alt: match[2] || '',
        title: match[3] || undefined
      });
    }
    
    return images;
  }

  /**
   * Extract links from content
   */
  private extractLinksFromContent(content: string): Array<{
    href: string;
    text: string;
    title?: string;
  }> {
    const links: Array<{ href: string; text: string; title?: string }> = [];
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*(?:title=["']([^"']*)["'])?[^>]*>([^<]*)<\/a>/gi;
    
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      links.push({
        href: match[1],
        text: match[3] || '',
        title: match[2] || undefined
      });
    }
    
    return links;
  }

  /**
   * Extract headings from content
   */
  private extractHeadingsFromContent(content: string): Array<{
    level: number;
    text: string;
  }> {
    const headings: Array<{ level: number; text: string }> = [];
    const headingRegex = /<h([1-6])[^>]*>([^<]*)<\/h[1-6]>/gi;
    
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      headings.push({
        level: parseInt(match[1]),
        text: match[2].trim()
      });
    }
    
    return headings;
  }
}

export const autoSEOService = new AutoSEOService();
