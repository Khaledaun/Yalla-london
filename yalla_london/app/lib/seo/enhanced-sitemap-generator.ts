/**
 * Enhanced Sitemap Generator
 * Split sitemaps by type with priority pings for fast indexing
 */

import { prisma } from '@/lib/db';
import { programmaticPagesService } from './programmatic-pages-service';

export interface SitemapEntry {
  url: string;
  lastmod: Date;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
  images?: Array<{
    loc: string;
    caption?: string;
    title?: string;
  }>;
}

export interface SitemapData {
  type: 'articles' | 'programmatic' | 'events' | 'places' | 'static';
  entries: SitemapEntry[];
  totalCount: number;
  lastGenerated: Date;
}

export interface SitemapGenerationResult {
  success: boolean;
  sitemaps: SitemapData[];
  totalEntries: number;
  pingResults: {
    google: boolean;
    bing: boolean;
    indexNow: boolean;
  };
  errors: string[];
}

export class EnhancedSitemapGenerator {
  private baseUrl: string;
  private maxEntriesPerSitemap: number = 50000;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yalla-london.com') {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate all sitemaps
   */
  async generateAllSitemaps(): Promise<SitemapGenerationResult> {
    try {
      const errors: string[] = [];
      const sitemaps: SitemapData[] = [];

      // Generate articles sitemap
      try {
        const articlesSitemap = await this.generateArticlesSitemap();
        sitemaps.push(articlesSitemap);
      } catch (error) {
        errors.push(`Failed to generate articles sitemap: ${error}`);
      }

      // Generate programmatic pages sitemap
      try {
        const programmaticSitemap = await this.generateProgrammaticSitemap();
        sitemaps.push(programmaticSitemap);
      } catch (error) {
        errors.push(`Failed to generate programmatic sitemap: ${error}`);
      }

      // Generate events sitemap
      try {
        const eventsSitemap = await this.generateEventsSitemap();
        sitemaps.push(eventsSitemap);
      } catch (error) {
        errors.push(`Failed to generate events sitemap: ${error}`);
      }

      // Generate places sitemap
      try {
        const placesSitemap = await this.generatePlacesSitemap();
        sitemaps.push(placesSitemap);
      } catch (error) {
        errors.push(`Failed to generate places sitemap: ${error}`);
      }

      // Generate static pages sitemap
      try {
        const staticSitemap = await this.generateStaticSitemap();
        sitemaps.push(staticSitemap);
      } catch (error) {
        errors.push(`Failed to generate static sitemap: ${error}`);
      }

      // Calculate total entries
      const totalEntries = sitemaps.reduce((sum, sitemap) => sum + sitemap.totalCount, 0);

      // Ping search engines
      const pingResults = await this.pingSearchEngines();

      return {
        success: errors.length === 0,
        sitemaps,
        totalEntries,
        pingResults,
        errors
      };

    } catch (error) {
      console.error('Failed to generate all sitemaps:', error);
      return {
        success: false,
        sitemaps: [],
        totalEntries: 0,
        pingResults: { google: false, bing: false, indexNow: false },
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Generate articles sitemap
   */
  private async generateArticlesSitemap(): Promise<SitemapData> {
    try {
      const articles = await prisma.seoMeta.findMany({
        where: {
          pageId: {
            not: {
              startsWith: 'programmatic_'
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      const entries: SitemapEntry[] = articles.map((article: any) => ({
        url: article.url || `${this.baseUrl}/blog/${article.pageId}`,
        lastmod: article.updatedAt,
        changefreq: 'weekly' as const,
        priority: 0.8,
        images: this.extractImagesFromContent(article.structuredData)
      }));

      return {
        type: 'articles',
        entries,
        totalCount: entries.length,
        lastGenerated: new Date()
      };

    } catch (error) {
      console.error('Failed to generate articles sitemap:', error);
      throw error;
    }
  }

  /**
   * Generate programmatic pages sitemap
   */
  private async generateProgrammaticSitemap(): Promise<SitemapData> {
    try {
      const programmaticPages = await programmaticPagesService.getProgrammaticPagesByCategory(
        'london_travel',
        'en',
        1000
      );

      const entries: SitemapEntry[] = programmaticPages.map((page: any) => ({
        url: `${this.baseUrl}/${page.slug}`,
        lastmod: page.updatedAt,
        changefreq: 'monthly' as const,
        priority: 0.6,
        images: this.extractImagesFromBodyBlocks(page.bodyBlocks)
      }));

      return {
        type: 'programmatic',
        entries,
        totalCount: entries.length,
        lastGenerated: new Date()
      };

    } catch (error) {
      console.error('Failed to generate programmatic sitemap:', error);
      throw error;
    }
  }

  /**
   * Generate events sitemap
   */
  private async generateEventsSitemap(): Promise<SitemapData> {
    try {
      // In a real implementation, this would fetch from an events table
      const events = await prisma.seoMeta.findMany({
        where: {
          schemaType: 'Event'
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      const entries: SitemapEntry[] = events.map((event: any) => ({
        url: event.url || `${this.baseUrl}/events/${event.pageId}`,
        lastmod: event.updatedAt,
        changefreq: 'daily' as const,
        priority: 0.9,
        images: this.extractImagesFromContent(event.structuredData)
      }));

      return {
        type: 'events',
        entries,
        totalCount: entries.length,
        lastGenerated: new Date()
      };

    } catch (error) {
      console.error('Failed to generate events sitemap:', error);
      throw error;
    }
  }

  /**
   * Generate places sitemap
   */
  private async generatePlacesSitemap(): Promise<SitemapData> {
    try {
      // In a real implementation, this would fetch from a places table
      const places = await prisma.seoMeta.findMany({
        where: {
          schemaType: {
            in: ['Place', 'Restaurant', 'Hotel', 'TouristAttraction']
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      const entries: SitemapEntry[] = places.map((place: any) => ({
        url: place.url || `${this.baseUrl}/places/${place.pageId}`,
        lastmod: place.updatedAt,
        changefreq: 'monthly' as const,
        priority: 0.7,
        images: this.extractImagesFromContent(place.structuredData)
      }));

      return {
        type: 'places',
        entries,
        totalCount: entries.length,
        lastGenerated: new Date()
      };

    } catch (error) {
      console.error('Failed to generate places sitemap:', error);
      throw error;
    }
  }

  /**
   * Generate static pages sitemap
   */
  private async generateStaticSitemap(): Promise<SitemapData> {
    const staticPages = [
      { url: '/', priority: 1.0, changefreq: 'daily' as const },
      { url: '/about', priority: 0.8, changefreq: 'monthly' as const },
      { url: '/contact', priority: 0.7, changefreq: 'monthly' as const },
      { url: '/blog', priority: 0.9, changefreq: 'daily' as const },
      { url: '/events', priority: 0.8, changefreq: 'weekly' as const },
      { url: '/places', priority: 0.8, changefreq: 'weekly' as const },
      { url: '/search', priority: 0.5, changefreq: 'monthly' as const }
    ];

    const entries: SitemapEntry[] = staticPages.map((page: any) => ({
      url: `${this.baseUrl}${page.url}`,
      lastmod: new Date(),
      changefreq: page.changefreq,
      priority: page.priority
    }));

    return {
      type: 'static',
      entries,
      totalCount: entries.length,
      lastGenerated: new Date()
    };
  }

  /**
   * Generate XML sitemap
   */
  generateXMLSitemap(sitemapData: SitemapData): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${sitemapData.entries.map(entry => this.generateXMLEntry(entry)).join('\n')}
</urlset>`;

    return xml;
  }

  /**
   * Generate XML entry
   */
  private generateXMLEntry(entry: SitemapEntry): string {
    const imagesXML = entry.images?.map(image => `
    <image:image>
      <image:loc>${image.loc}</image:loc>
      ${image.caption ? `<image:caption>${this.escapeXML(image.caption)}</image:caption>` : ''}
      ${image.title ? `<image:title>${this.escapeXML(image.title)}</image:title>` : ''}
    </image:image>`).join('') || '';

    return `  <url>
    <loc>${this.escapeXML(entry.url)}</loc>
    <lastmod>${entry.lastmod.toISOString()}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>${imagesXML}
  </url>`;
  }

  /**
   * Generate sitemap index
   */
  generateSitemapIndex(sitemaps: SitemapData[]): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(sitemap => `  <sitemap>
    <loc>${this.baseUrl}/sitemap-${sitemap.type}.xml</loc>
    <lastmod>${sitemap.lastGenerated.toISOString()}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;

    return xml;
  }

  /**
   * Ping search engines
   */
  private async pingSearchEngines(): Promise<{
    google: boolean;
    bing: boolean;
    indexNow: boolean;
  }> {
    const results = {
      google: false,
      bing: false,
      indexNow: false
    };

    try {
      // Ping Google
      const googlePingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(`${this.baseUrl}/sitemap.xml`)}`;
      const googleResponse = await fetch(googlePingUrl, { method: 'GET' });
      results.google = googleResponse.ok;

      // Ping Bing
      const bingPingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(`${this.baseUrl}/sitemap.xml`)}`;
      const bingResponse = await fetch(bingPingUrl, { method: 'GET' });
      results.bing = bingResponse.ok;

      // Ping IndexNow
      const indexNowUrl = 'https://api.indexnow.org/indexnow';
      const indexNowResponse = await fetch(indexNowUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          host: this.baseUrl.replace(/^https?:\/\//, ''),
          key: process.env.INDEXNOW_KEY || 'default-key',
          urlList: [`${this.baseUrl}/sitemap.xml`]
        })
      });
      results.indexNow = indexNowResponse.ok;

    } catch (error) {
      console.error('Failed to ping search engines:', error);
    }

    return results;
  }

  /**
   * Submit sitemap to Google Search Console
   */
  async submitToGoogleSearchConsole(): Promise<boolean> {
    try {
      const searchConsoleKey = process.env.GOOGLE_SEARCH_CONSOLE_KEY;
      if (!searchConsoleKey) {
        console.warn('Google Search Console key not configured');
        return false;
      }

      // In a real implementation, this would use the Google Search Console API
      // For now, we'll simulate the submission
      console.log('Submitting sitemap to Google Search Console...');
      return true;

    } catch (error) {
      console.error('Failed to submit to Google Search Console:', error);
      return false;
    }
  }

  /**
   * Extract images from content
   */
  private extractImagesFromContent(content: any): Array<{
    loc: string;
    caption?: string;
    title?: string;
  }> {
    if (!content) return [];

    const images: Array<{ loc: string; caption?: string; title?: string }> = [];

    // Handle different content structures
    if (Array.isArray(content)) {
      content.forEach(item => {
        if (item.type === 'image' && item.src) {
          images.push({
            loc: item.src,
            caption: item.caption,
            title: item.title
          });
        }
      });
    } else if (typeof content === 'object') {
      // Extract images from structured data
      if (content.image) {
        images.push({
          loc: content.image,
          caption: content.caption,
          title: content.title
        });
      }
    }

    return images;
  }

  /**
   * Extract images from body blocks
   */
  private extractImagesFromBodyBlocks(bodyBlocks: any[]): Array<{
    loc: string;
    caption?: string;
    title?: string;
  }> {
    if (!Array.isArray(bodyBlocks)) return [];

    const images: Array<{ loc: string; caption?: string; title?: string }> = [];

    bodyBlocks.forEach(block => {
      if (block.type === 'image' && block.data?.src) {
        images.push({
          loc: block.data.src,
          caption: block.data.caption,
          title: block.data.title
        });
      }
    });

    return images;
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Get sitemap statistics
   */
  async getSitemapStatistics(): Promise<{
    totalSitemaps: number;
    totalEntries: number;
    entriesByType: Record<string, number>;
    lastGenerated: Date;
  }> {
    try {
      const result = await this.generateAllSitemaps();
      
      const entriesByType: Record<string, number> = {};
      result.sitemaps.forEach(sitemap => {
        entriesByType[sitemap.type] = sitemap.totalCount;
      });

      return {
        totalSitemaps: result.sitemaps.length,
        totalEntries: result.totalEntries,
        entriesByType,
        lastGenerated: new Date()
      };

    } catch (error) {
      console.error('Failed to get sitemap statistics:', error);
      return {
        totalSitemaps: 0,
        totalEntries: 0,
        entriesByType: {},
        lastGenerated: new Date()
      };
    }
  }

  /**
   * Update sitemap for a specific page
   */
  async updateSitemapForPage(pageId: string, pageData: {
    url: string;
    lastmod: Date;
    changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority: number;
    type: 'articles' | 'programmatic' | 'events' | 'places' | 'static';
  }): Promise<void> {
    try {
      // In a real implementation, this would update the specific sitemap
      // For now, we'll regenerate the relevant sitemap
      console.log(`Updating sitemap for page: ${pageId}`);
      
      // Trigger sitemap regeneration
      await this.generateAllSitemaps();
      
    } catch (error) {
      console.error('Failed to update sitemap for page:', error);
    }
  }
}

export const enhancedSitemapGenerator = new EnhancedSitemapGenerator();


