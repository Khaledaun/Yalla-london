
// Intelligent Internal Linking System for SEO
export interface InternalLink {
  anchor: string;
  url: string;
  context: string;
  relevanceScore: number;
  category: 'event' | 'restaurant' | 'hotel' | 'attraction' | 'blog';
}

export interface ContentEntity {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  keywords: string[];
  language: 'en' | 'ar';
  url: string;
}

export class InternalLinkingEngine {
  private entities: Map<string, ContentEntity> = new Map();
  private linkingRules: Map<string, string[]> = new Map();

  constructor() {
    this.initializeLinkingRules();
  }

  private initializeLinkingRules() {
    // Define keyword to URL mappings for automatic linking
    this.linkingRules.set('tower of london', ['/recommendations/tower-of-london']);
    this.linkingRules.set('british museum', ['/recommendations/british-museum']);
    this.linkingRules.set('buckingham palace', ['/recommendations/buckingham-palace']);
    this.linkingRules.set('london eye', ['/recommendations/london-eye']);
    this.linkingRules.set('tate modern', ['/recommendations/tate-modern']);
    this.linkingRules.set('covent garden', ['/recommendations/covent-garden']);
    this.linkingRules.set('notting hill', ['/recommendations/notting-hill']);
    this.linkingRules.set('mayfair', ['/recommendations/mayfair']);
    this.linkingRules.set('shoreditch', ['/recommendations/shoreditch']);
    this.linkingRules.set('luxury hotels london', ['/recommendations#hotels']);
    this.linkingRules.set('fine dining london', ['/recommendations#restaurants']);
    this.linkingRules.set('london events', ['/events']);
    this.linkingRules.set('michelin star', ['/recommendations#restaurants']);
    this.linkingRules.set('afternoon tea', ['/recommendations/afternoon-tea']);
    this.linkingRules.set('west end shows', ['/events#theatre']);
    this.linkingRules.set('london theatre', ['/events#theatre']);
    this.linkingRules.set('luxury shopping', ['/recommendations#shopping']);
    this.linkingRules.set('oxford street', ['/recommendations/oxford-street']);
    this.linkingRules.set('bond street', ['/recommendations/bond-street']);
    this.linkingRules.set('harrods', ['/recommendations/harrods']);
    this.linkingRules.set('selfridges', ['/recommendations/selfridges']);

    // Arabic keywords
    this.linkingRules.set('برج لندن', ['/ar/recommendations/tower-of-london']);
    this.linkingRules.set('المتحف البريطاني', ['/ar/recommendations/british-museum']);
    this.linkingRules.set('قصر بكنغهام', ['/ar/recommendations/buckingham-palace']);
    this.linkingRules.set('عين لندن', ['/ar/recommendations/london-eye']);
    this.linkingRules.set('فنادق فاخرة لندن', ['/ar/recommendations#hotels']);
    this.linkingRules.set('مطاعم راقية لندن', ['/ar/recommendations#restaurants']);
    this.linkingRules.set('فعاليات لندن', ['/ar/events']);
    this.linkingRules.set('التسوق الفاخر', ['/ar/recommendations#shopping']);
  }

  // Add content entity to the linking system
  addEntity(entity: ContentEntity) {
    this.entities.set(entity.id, entity);
  }

  // Auto-detect and suggest internal links for content
  suggestInternalLinks(content: string, currentUrl: string, language: 'en' | 'ar' = 'en'): InternalLink[] {
    const suggestions: InternalLink[] = [];
    const contentLower = content.toLowerCase();

    // Check for exact keyword matches
    this.linkingRules.forEach((urls, keyword) => {
      const keywordRegex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = contentLower.match(keywordRegex);
      
      if (matches) {
        urls.forEach((url: any) => {
          // Don't link to current page
          if (url !== currentUrl) {
            const relevanceScore = this.calculateRelevanceScore(keyword, content, url);
            suggestions.push({
              anchor: keyword,
              url: url,
              context: this.extractContext(content, keyword),
              relevanceScore: relevanceScore,
              category: this.categorizeUrl(url)
            });
          }
        });
      }
    });

    // Find semantic links based on content entities
    this.entities.forEach((entity: any) => {
      if (entity.url !== currentUrl && entity.language === language) {
        const semanticScore = this.calculateSemanticSimilarity(content, entity.content);
        if (semanticScore > 0.3) {
          suggestions.push({
            anchor: entity.title,
            url: entity.url,
            context: this.extractContext(content, entity.title),
            relevanceScore: semanticScore,
            category: entity.category as any
          });
        }
      }
    });

    // Sort by relevance and remove duplicates
    return this.deduplicateAndSort(suggestions);
  }

  // Automatically insert internal links into content
  autoLinkContent(content: string, currentUrl: string, language: 'en' | 'ar' = 'en', maxLinks: number = 5): string {
    const suggestions = this.suggestInternalLinks(content, currentUrl, language);
    let linkedContent = content;
    let linksAdded = 0;

    // Take top suggestions up to maxLinks
    const topSuggestions = suggestions.slice(0, maxLinks);

    topSuggestions.forEach((suggestion: any) => {
      if (linksAdded < maxLinks) {
        const linkRegex = new RegExp(`\\b${suggestion.anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        
        // Only link first occurrence to avoid over-linking
        if (linkRegex.test(linkedContent) && !linkedContent.includes(`href="${suggestion.url}"`)) {
          linkedContent = linkedContent.replace(linkRegex, 
            `<a href="${suggestion.url}" class="internal-link text-purple-600 hover:text-purple-800 underline" data-category="${suggestion.category}">${suggestion.anchor}</a>`
          );
          linksAdded++;
        }
      }
    });

    return linkedContent;
  }

  // Generate related content suggestions
  generateRelatedContent(currentEntity: ContentEntity, limit: number = 6): ContentEntity[] {
    const related: Array<{entity: ContentEntity, score: number}> = [];

    this.entities.forEach((entity: any) => {
      if (entity.id !== currentEntity.id && entity.language === currentEntity.language) {
        const score = this.calculateContentSimilarity(currentEntity, entity);
        if (score > 0.2) {
          related.push({ entity, score });
        }
      }
    });

    return related
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item: any) => item.entity);
  }

  // Generate topic clusters for SEO
  generateTopicClusters(language: 'en' | 'ar' = 'en'): Map<string, ContentEntity[]> {
    const clusters = new Map<string, ContentEntity[]>();
    const categories = ['events', 'restaurants', 'hotels', 'attractions', 'shopping', 'nightlife'];

    categories.forEach((category: any) => {
      const categoryEntities = Array.from(this.entities.values())
        .filter((entity: any) => entity.category === category && entity.language === language);
      
      if (categoryEntities.length > 0) {
        clusters.set(category, categoryEntities);
      }
    });

    return clusters;
  }

  // Generate breadcrumb navigation
  generateBreadcrumbs(currentPath: string, language: 'en' | 'ar' = 'en'): Array<{name: string, url: string}> {
    const pathSegments = currentPath.split('/').filter(Boolean);
    const breadcrumbs: Array<{name: string, url: string}> = [];

    // Home
    breadcrumbs.push({
      name: language === 'ar' ? 'الرئيسية' : 'Home',
      url: language === 'ar' ? '/ar' : '/'
    });

    let currentUrl = language === 'ar' ? '/ar' : '';
    
    pathSegments.forEach((segment, index) => {
      // Skip language prefix
      if (segment === 'ar' && index === 0) return;
      
      currentUrl += `/${segment}`;
      
      // Map segments to readable names
      const segmentName = this.getSegmentName(segment, language);
      breadcrumbs.push({
        name: segmentName,
        url: currentUrl
      });
    });

    return breadcrumbs;
  }

  // Track internal link performance
  trackLinkPerformance(linkUrl: string, sourceUrl: string, clickPosition: number) {
    // This would integrate with analytics
    const linkData = {
      link_url: linkUrl,
      source_url: sourceUrl,
      position: clickPosition,
      timestamp: new Date().toISOString()
    };

    // Send to analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'internal_link_performance', {
        custom_parameter: JSON.stringify(linkData),
        value: clickPosition
      });
    }
  }

  private calculateRelevanceScore(keyword: string, content: string, url: string): number {
    let score = 0.5; // Base score

    // Boost score based on keyword frequency
    const keywordCount = (content.toLowerCase().match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
    score += Math.min(keywordCount * 0.1, 0.3);

    // Boost score based on URL relevance
    if (url.toLowerCase().includes(keyword.toLowerCase().replace(/\s+/g, '-'))) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private calculateSemanticSimilarity(content1: string, content2: string): number {
    // Simple keyword overlap similarity
    const words1 = content1.toLowerCase().split(/\W+/).filter((w: any) => w.length > 3);
    const words2 = content2.toLowerCase().split(/\W+/).filter((w: any) => w.length > 3);
    
    const overlap = words1.filter((word: any) => words2.includes(word));
    return overlap.length / Math.max(words1.length, words2.length);
  }

  private calculateContentSimilarity(entity1: ContentEntity, entity2: ContentEntity): number {
    let score = 0;

    // Category similarity
    if (entity1.category === entity2.category) score += 0.4;

    // Keyword overlap
    const keywordOverlap = entity1.keywords.filter((k: any) => entity2.keywords.includes(k));
    score += (keywordOverlap.length / Math.max(entity1.keywords.length, entity2.keywords.length)) * 0.6;

    return score;
  }

  private extractContext(content: string, keyword: string): string {
    const index = content.toLowerCase().indexOf(keyword.toLowerCase());
    if (index === -1) return '';

    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + keyword.length + 50);
    return content.substring(start, end).trim();
  }

  private categorizeUrl(url: string): 'event' | 'restaurant' | 'hotel' | 'attraction' | 'blog' {
    if (url.includes('/events')) return 'event';
    if (url.includes('/restaurant')) return 'restaurant';
    if (url.includes('/hotel')) return 'hotel';
    if (url.includes('/blog')) return 'blog';
    return 'attraction';
  }

  private deduplicateAndSort(suggestions: InternalLink[]): InternalLink[] {
    const seen = new Set();
    return suggestions
      .filter((suggestion: any) => {
        const key = `${suggestion.anchor}-${suggestion.url}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private getSegmentName(segment: string, language: 'en' | 'ar'): string {
    const segmentMap = {
      'en': {
        'recommendations': 'Recommendations',
        'events': 'Events',
        'blog': 'Blog',
        'about': 'About',
        'contact': 'Contact',
        'hotels': 'Hotels',
        'restaurants': 'Restaurants',
        'attractions': 'Attractions',
        'shopping': 'Shopping'
      },
      'ar': {
        'recommendations': 'التوصيات',
        'events': 'الفعاليات',
        'blog': 'المدونة',
        'about': 'حول',
        'contact': 'اتصل بنا',
        'hotels': 'الفنادق',
        'restaurants': 'المطاعم',
        'attractions': 'المعالم',
        'shopping': 'التسوق'
      }
    };

    return segmentMap[language][segment as keyof typeof segmentMap.en] || 
           segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

export const internalLinking = new InternalLinkingEngine();
