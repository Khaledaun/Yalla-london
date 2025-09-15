/**
 * Multilingual SEO enhancements
 * Handles hreflang, duplicate content detection, and locale-specific optimization
 */

export interface HreflangEntry {
  lang: string;
  url: string;
  isDefault?: boolean;
}

export interface MultilingualSeoConfig {
  defaultLanguage: 'en' | 'ar';
  supportedLanguages: Array<'en' | 'ar'>;
  baseUrl: string;
  urlStructure: 'subdirectory' | 'subdomain' | 'domain';
}

export class MultilingualSeoEngine {
  private config: MultilingualSeoConfig;

  constructor(config: MultilingualSeoConfig) {
    this.config = config;
  }

  /**
   * Generate hreflang tags with x-default fallback
   */
  generateHreflangTags(slug: string, availableLanguages: Array<'en' | 'ar'>): HreflangEntry[] {
    const entries: HreflangEntry[] = [];

    // Generate entries for each available language
    availableLanguages.forEach(lang => {
      const url = this.generateUrlForLanguage(slug, lang);
      entries.push({
        lang: lang,
        url: url
      });
    });

    // Add x-default fallback (always points to English version)
    const defaultUrl = this.generateUrlForLanguage(slug, this.config.defaultLanguage);
    entries.push({
      lang: 'x-default',
      url: defaultUrl,
      isDefault: true
    });

    return entries;
  }

  /**
   * Auto-detect and fix duplicate EN/AR titles and descriptions
   */
  async detectDuplicateContent(articles: Array<{
    id: string;
    title: string;
    language: 'en' | 'ar';
    seoData?: {
      metaDescription?: string;
    };
  }>): Promise<{
    duplicates: Array<{
      type: 'title' | 'description';
      articles: Array<{ id: string; title: string; language: string }>;
      similarity: number;
    }>;
    suggestions: Array<{
      articleId: string;
      type: 'title' | 'description';
      current: string;
      suggested: string;
      reason: string;
    }>;
  }> {
    const duplicates = [];
    const suggestions = [];

    // Group articles by language
    const articlesByLang = {
      en: articles.filter(a => a.language === 'en'),
      ar: articles.filter(a => a.language === 'ar')
    };

    // Check for duplicate titles within same language
    for (const lang of ['en', 'ar'] as const) {
      const langArticles = articlesByLang[lang];
      
      for (let i = 0; i < langArticles.length; i++) {
        for (let j = i + 1; j < langArticles.length; j++) {
          const similarity = this.calculateTextSimilarity(
            langArticles[i].title,
            langArticles[j].title
          );

          if (similarity > 0.8) { // 80% similarity threshold
            duplicates.push({
              type: 'title' as const,
              articles: [
                { id: langArticles[i].id, title: langArticles[i].title, language: lang },
                { id: langArticles[j].id, title: langArticles[j].title, language: lang }
              ],
              similarity: Math.round(similarity * 100)
            });

            // Suggest title variations
            suggestions.push({
              articleId: langArticles[j].id,
              type: 'title' as const,
              current: langArticles[j].title,
              suggested: this.generateTitleVariation(langArticles[j].title, lang),
              reason: `Similar to existing article: "${langArticles[i].title}"`
            });
          }
        }
      }
    }

    // Check for duplicate meta descriptions
    for (const lang of ['en', 'ar'] as const) {
      const langArticles = articlesByLang[lang].filter(a => a.seoData?.metaDescription);
      
      for (let i = 0; i < langArticles.length; i++) {
        for (let j = i + 1; j < langArticles.length; j++) {
          const desc1 = langArticles[i].seoData?.metaDescription || '';
          const desc2 = langArticles[j].seoData?.metaDescription || '';
          
          const similarity = this.calculateTextSimilarity(desc1, desc2);

          if (similarity > 0.7) { // 70% similarity threshold for descriptions
            duplicates.push({
              type: 'description' as const,
              articles: [
                { id: langArticles[i].id, title: langArticles[i].title, language: lang },
                { id: langArticles[j].id, title: langArticles[j].title, language: lang }
              ],
              similarity: Math.round(similarity * 100)
            });
          }
        }
      }
    }

    return { duplicates, suggestions };
  }

  /**
   * Generate locale-specific schema markup
   */
  generateLocaleSpecificSchema(
    baseSchema: any,
    language: 'en' | 'ar',
    article: {
      title: string;
      content: string;
      slug: string;
      author?: string;
    }
  ): any {
    const localeSchema = { ...baseSchema };

    // Set language-specific properties
    localeSchema.inLanguage = language;

    // Add locale-specific URL
    localeSchema.url = this.generateUrlForLanguage(article.slug, language);
    localeSchema['@id'] = `${localeSchema.url}#article`;

    // Add alternate language versions if available
    if (this.config.supportedLanguages.length > 1) {
      const alternateLanguages = this.config.supportedLanguages
        .filter(lang => lang !== language)
        .map(lang => ({
          '@type': 'WebPage',
          '@id': this.generateUrlForLanguage(article.slug, lang),
          inLanguage: lang
        }));

      if (alternateLanguages.length > 0) {
        localeSchema.translationOfWork = alternateLanguages;
      }
    }

    // Language-specific author handling
    if (article.author && language === 'ar') {
      // For Arabic content, ensure proper RTL text handling
      localeSchema.author = {
        ...localeSchema.author,
        name: article.author,
        inLanguage: 'ar'
      };
    }

    // Add language-specific breadcrumbs
    localeSchema.breadcrumb = this.generateLocaleBreadcrumbs(article.slug, language);

    return localeSchema;
  }

  /**
   * Validate hreflang implementation
   */
  validateHreflangImplementation(hreflangEntries: HreflangEntry[]): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for x-default
    const hasXDefault = hreflangEntries.some(entry => entry.lang === 'x-default');
    if (!hasXDefault) {
      errors.push('Missing x-default hreflang entry');
    }

    // Check for duplicate languages
    const languages = hreflangEntries.map(entry => entry.lang);
    const uniqueLanguages = new Set(languages);
    if (languages.length !== uniqueLanguages.size) {
      errors.push('Duplicate language entries found in hreflang');
    }

    // Check URL accessibility
    for (const entry of hreflangEntries) {
      if (!this.isValidUrl(entry.url)) {
        errors.push(`Invalid URL for language ${entry.lang}: ${entry.url}`);
      }
    }

    // Check for self-referencing
    const urlCounts = hreflangEntries.reduce((acc, entry) => {
      acc[entry.url] = (acc[entry.url] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(urlCounts).forEach(([url, count]) => {
      if (count > 1) {
        warnings.push(`URL ${url} is referenced by multiple language entries`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate URL for specific language
   */
  private generateUrlForLanguage(slug: string, language: 'en' | 'ar'): string {
    const { baseUrl, urlStructure } = this.config;

    switch (urlStructure) {
      case 'subdirectory':
        return language === 'en' 
          ? `${baseUrl}/blog/${slug}`
          : `${baseUrl}/${language}/blog/${slug}`;
      
      case 'subdomain':
        return language === 'en'
          ? `${baseUrl}/blog/${slug}`
          : `https://${language}.${baseUrl.replace('https://', '')}/blog/${slug}`;
      
      case 'domain':
        // This would require different domains per language
        return `${baseUrl}/blog/${slug}`;
      
      default:
        return `${baseUrl}/blog/${slug}`;
    }
  }

  /**
   * Calculate text similarity using simple algorithm
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  /**
   * Generate title variation to avoid duplicates
   */
  private generateTitleVariation(originalTitle: string, language: 'en' | 'ar'): string {
    const variations = {
      en: [' - Complete Guide', ' - Expert Tips', ' - Ultimate Guide', ' - 2024 Edition'],
      ar: [' - دليل شامل', ' - نصائح الخبراء', ' - الدليل النهائي', ' - إصدار 2024']
    };

    const suffixes = variations[language];
    const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return originalTitle + randomSuffix;
  }

  /**
   * Generate locale-specific breadcrumbs
   */
  private generateLocaleBreadcrumbs(slug: string, language: 'en' | 'ar') {
    const breadcrumbs = {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: language === 'en' ? 'Home' : 'الرئيسية',
          item: this.generateUrlForLanguage('', language).replace('/blog/', '')
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: language === 'en' ? 'Blog' : 'المدونة',
          item: this.generateUrlForLanguage('', language).replace(`/${slug}`, '')
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: slug.replace(/-/g, ' '),
          item: this.generateUrlForLanguage(slug, language)
        }
      ]
    };

    return breadcrumbs;
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}