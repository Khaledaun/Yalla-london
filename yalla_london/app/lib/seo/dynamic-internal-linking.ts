/**
 * Dynamic Internal Linking System
 * Algorithmic auto-linking across articles and programmatic pages for authority distribution
 */

import { prisma } from '@/lib/db';
import { programmaticPagesService } from './programmatic-pages-service';

export interface InternalLink {
  id: string;
  sourceId: string;
  targetId: string;
  anchorText: string;
  context: string;
  relevanceScore: number;
  linkType: 'contextual' | 'related' | 'authority' | 'breadcrumb';
  position: 'inline' | 'sidebar' | 'footer' | 'related';
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'inactive' | 'archived';
}

export interface LinkOpportunity {
  sourcePage: {
    id: string;
    title: string;
    content: string;
    url: string;
    category: string;
  };
  targetPage: {
    id: string;
    title: string;
    url: string;
    category: string;
    seoScore: number;
  };
  anchorText: string;
  context: string;
  relevanceScore: number;
  linkType: 'contextual' | 'related' | 'authority' | 'breadcrumb';
  position: 'inline' | 'sidebar' | 'footer' | 'related';
}

export interface InternalLinkingResult {
  success: boolean;
  linksCreated: number;
  links: InternalLink[];
  opportunities: LinkOpportunity[];
  errors: string[];
}

export class DynamicInternalLinking {
  private baseUrl: string;
  private maxLinksPerPage: number = 5;
  private minRelevanceScore: number = 0.6;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_SITE_URL || 'https://yalla-london.com') {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate internal links for a page
   */
  async generateInternalLinks(
    pageId: string,
    content: string,
    title: string,
    category: string
  ): Promise<InternalLinkingResult> {
    try {
      const errors: string[] = [];
      const links: InternalLink[] = [];
      const opportunities: LinkOpportunity[] = [];

      // Get potential target pages
      const targetPages = await this.getPotentialTargetPages(category, pageId);
      
      // Analyze content for link opportunities
      const linkOpportunities = await this.analyzeContentForLinks(
        content,
        title,
        targetPages
      );

      // Filter opportunities by relevance
      const relevantOpportunities = linkOpportunities.filter(
        opp => opp.relevanceScore >= this.minRelevanceScore
      );

      // Limit to max links per page
      const selectedOpportunities = relevantOpportunities.slice(0, this.maxLinksPerPage);

      // Create internal links
      for (const opportunity of selectedOpportunities) {
        try {
          const link = await this.createInternalLink(opportunity, pageId);
          links.push(link);
          opportunities.push(opportunity);
        } catch (error) {
          errors.push(`Failed to create link: ${error}`);
        }
      }

      return {
        success: errors.length === 0,
        linksCreated: links.length,
        links,
        opportunities,
        errors
      };

    } catch (error) {
      console.error('Failed to generate internal links:', error);
      return {
        success: false,
        linksCreated: 0,
        links: [],
        opportunities: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get potential target pages for linking
   */
  private async getPotentialTargetPages(
    category: string,
    excludePageId: string
  ): Promise<Array<{
    id: string;
    title: string;
    url: string;
    category: string;
    seoScore: number;
    content?: string;
  }>> {
    try {
      // Get pages from same category
      const sameCategoryPages = await prisma.seoMeta.findMany({
        where: {
          pageId: {
            not: excludePageId
          },
          // Add category filtering when implemented
        },
        take: 20,
        orderBy: {
          seoScore: 'desc'
        }
      });

      // Get programmatic pages
      const programmaticPages = await programmaticPagesService.getProgrammaticPagesByCategory(
        category,
        'en',
        10
      );

      // Combine and format results
      const allPages = [
        ...sameCategoryPages.map((page: any) => ({
          id: page.pageId,
          title: page.title,
          url: page.url || '',
          category,
          seoScore: page.seoScore || 0
        })),
        ...programmaticPages.map(page => ({
          id: page.id,
          title: page.title,
          url: `${this.baseUrl}/${page.slug}`,
          category: page.category,
          seoScore: page.seoScore
        }))
      ];

      // Remove duplicates and sort by SEO score
      const uniquePages = allPages.filter((page, index, self) => 
        index === self.findIndex(p => p.id === page.id)
      );

      return uniquePages.sort((a, b) => b.seoScore - a.seoScore);

    } catch (error) {
      console.error('Failed to get potential target pages:', error);
      return [];
    }
  }

  /**
   * Analyze content for link opportunities
   */
  private async analyzeContentForLinks(
    content: string,
    title: string,
    targetPages: Array<{
      id: string;
      title: string;
      url: string;
      category: string;
      seoScore: number;
    }>
  ): Promise<LinkOpportunity[]> {
    const opportunities: LinkOpportunity[] = [];

    for (const targetPage of targetPages) {
      // Calculate relevance score
      const relevanceScore = this.calculateRelevanceScore(
        content,
        title,
        targetPage.title,
        targetPage.category
      );

      if (relevanceScore >= this.minRelevanceScore) {
        // Find best context for the link
        const context = this.findBestContext(content, targetPage.title);
        
        if (context) {
          const opportunity: LinkOpportunity = {
            sourcePage: {
              id: 'current-page',
              title,
              content,
              url: 'current-url',
              category: 'current-category'
            },
            targetPage,
            anchorText: this.generateAnchorText(targetPage.title),
            context: context.text,
            relevanceScore,
            linkType: this.determineLinkType(relevanceScore, targetPage.seoScore),
            position: this.determineLinkPosition(relevanceScore)
          };

          opportunities.push(opportunity);
        }
      }
    }

    return opportunities.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Calculate relevance score between content and target page
   */
  private calculateRelevanceScore(
    content: string,
    sourceTitle: string,
    targetTitle: string,
    targetCategory: string
  ): number {
    let score = 0;

    // Title similarity (40% weight)
    const titleSimilarity = this.calculateTextSimilarity(sourceTitle, targetTitle);
    score += titleSimilarity * 0.4;

    // Content keyword overlap (30% weight)
    const contentKeywords = this.extractKeywords(content);
    const targetKeywords = this.extractKeywords(targetTitle);
    const keywordOverlap = this.calculateKeywordOverlap(contentKeywords, targetKeywords);
    score += keywordOverlap * 0.3;

    // Category relevance (20% weight)
    const categoryRelevance = this.calculateCategoryRelevance(targetCategory);
    score += categoryRelevance * 0.2;

    // Semantic similarity (10% weight)
    const semanticSimilarity = this.calculateSemanticSimilarity(content, targetTitle);
    score += semanticSimilarity * 0.1;

    return Math.min(score, 1);
  }

  /**
   * Calculate text similarity using Jaccard similarity
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\W+/));
    const words2 = new Set(text2.toLowerCase().split(/\W+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ]);

    return text
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 20); // Limit to top 20 keywords
  }

  /**
   * Calculate keyword overlap
   */
  private calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Calculate category relevance
   */
  private calculateCategoryRelevance(category: string): number {
    const categoryWeights: Record<string, number> = {
      'london_travel': 1.0,
      'luxury_hotels': 0.9,
      'fine_dining': 0.9,
      'cultural_experiences': 0.8,
      'shopping': 0.8,
      'entertainment': 0.8
    };

    return categoryWeights[category] || 0.5;
  }

  /**
   * Calculate semantic similarity (simplified)
   */
  private calculateSemanticSimilarity(content: string, targetTitle: string): number {
    // Simple keyword-based semantic similarity
    const contentKeywords = this.extractKeywords(content);
    const targetKeywords = this.extractKeywords(targetTitle);
    
    return this.calculateKeywordOverlap(contentKeywords, targetKeywords);
  }

  /**
   * Find best context for the link
   */
  private findBestContext(content: string, targetTitle: string): { text: string; position: number } | null {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const targetKeywords = this.extractKeywords(targetTitle);
    
    let bestContext = null;
    let bestScore = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      const sentenceKeywords = this.extractKeywords(sentence);
      
      const overlap = this.calculateKeywordOverlap(sentenceKeywords, targetKeywords);
      
      if (overlap > bestScore && overlap > 0.1) {
        bestScore = overlap;
        bestContext = {
          text: sentence,
          position: i
        };
      }
    }

    return bestContext;
  }

  /**
   * Generate anchor text for the link
   */
  private generateAnchorText(targetTitle: string): string {
    // Extract key phrases from title
    const words = targetTitle.split(/\s+/);
    
    if (words.length <= 3) {
      return targetTitle;
    }
    
    // Try to find a meaningful phrase
    const phrases = [
      words.slice(0, 3).join(' '),
      words.slice(1, 4).join(' '),
      words.slice(-3).join(' ')
    ];
    
    // Return the shortest meaningful phrase
    return phrases.reduce((shortest, phrase) => 
      phrase.length < shortest.length ? phrase : shortest
    );
  }

  /**
   * Determine link type based on relevance and SEO score
   */
  private determineLinkType(relevanceScore: number, targetSeoScore: number): 'contextual' | 'related' | 'authority' | 'breadcrumb' {
    if (relevanceScore >= 0.8) return 'contextual';
    if (targetSeoScore >= 80) return 'authority';
    if (relevanceScore >= 0.6) return 'related';
    return 'breadcrumb';
  }

  /**
   * Determine link position based on relevance
   */
  private determineLinkPosition(relevanceScore: number): 'inline' | 'sidebar' | 'footer' | 'related' {
    if (relevanceScore >= 0.8) return 'inline';
    if (relevanceScore >= 0.6) return 'sidebar';
    if (relevanceScore >= 0.4) return 'related';
    return 'footer';
  }

  /**
   * Create internal link record
   */
  private async createInternalLink(
    opportunity: LinkOpportunity,
    sourcePageId: string
  ): Promise<InternalLink> {
    const linkId = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const link: InternalLink = {
      id: linkId,
      sourceId: sourcePageId,
      targetId: opportunity.targetPage.id,
      anchorText: opportunity.anchorText,
      context: opportunity.context,
      relevanceScore: opportunity.relevanceScore,
      linkType: opportunity.linkType,
      position: opportunity.position,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    };

    // Save to database
    await this.saveInternalLink(link);
    
    return link;
  }

  /**
   * Save internal link to database
   */
  private async saveInternalLink(link: InternalLink): Promise<void> {
    try {
      // In a real implementation, this would save to an internal_links table
      // For now, we'll store in a JSON field or create a simple table
      await prisma.seoMeta.update({
        where: { pageId: link.sourceId },
        data: {
          // Store links in structuredData field for now
          structuredData: {
            internalLinks: [link]
          },
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to save internal link:', error);
      throw error;
    }
  }

  /**
   * Get internal links for a page
   */
  async getInternalLinks(pageId: string): Promise<InternalLink[]> {
    try {
      const seoMeta = await prisma.seoMeta.findUnique({
        where: { pageId }
      });

      if (!seoMeta || !seoMeta.structuredData) {
        return [];
      }

      const structuredData = seoMeta.structuredData as any;
      return structuredData.internalLinks || [];

    } catch (error) {
      console.error('Failed to get internal links:', error);
      return [];
    }
  }

  /**
   * Update internal links for a page
   */
  async updateInternalLinks(
    pageId: string,
    content: string,
    title: string,
    category: string
  ): Promise<InternalLinkingResult> {
    try {
      // Remove existing links
      await this.removeInternalLinks(pageId);
      
      // Generate new links
      return await this.generateInternalLinks(pageId, content, title, category);
      
    } catch (error) {
      console.error('Failed to update internal links:', error);
      return {
        success: false,
        linksCreated: 0,
        links: [],
        opportunities: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Remove internal links for a page
   */
  private async removeInternalLinks(pageId: string): Promise<void> {
    try {
      await prisma.seoMeta.update({
        where: { pageId },
        data: {
          structuredData: {
            internalLinks: []
          },
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to remove internal links:', error);
    }
  }

  /**
   * Get link statistics
   */
  async getLinkStatistics(): Promise<{
    totalLinks: number;
    linksByType: Record<string, number>;
    linksByPosition: Record<string, number>;
    averageRelevanceScore: number;
  }> {
    try {
      const seoMetas = await prisma.seoMeta.findMany({
        where: {
          structuredData: {
            not: null
          }
        }
      });

      let totalLinks = 0;
      const linksByType: Record<string, number> = {};
      const linksByPosition: Record<string, number> = {};
      let totalRelevanceScore = 0;

      for (const seoMeta of seoMetas) {
        const structuredData = seoMeta.structuredData as any;
        const links = structuredData?.internalLinks || [];

        for (const link of links) {
          totalLinks++;
          linksByType[link.linkType] = (linksByType[link.linkType] || 0) + 1;
          linksByPosition[link.position] = (linksByPosition[link.position] || 0) + 1;
          totalRelevanceScore += link.relevanceScore;
        }
      }

      return {
        totalLinks,
        linksByType,
        linksByPosition,
        averageRelevanceScore: totalLinks > 0 ? totalRelevanceScore / totalLinks : 0
      };

    } catch (error) {
      console.error('Failed to get link statistics:', error);
      return {
        totalLinks: 0,
        linksByType: {},
        linksByPosition: {},
        averageRelevanceScore: 0
      };
    }
  }
}

export const dynamicInternalLinking = new DynamicInternalLinking();


