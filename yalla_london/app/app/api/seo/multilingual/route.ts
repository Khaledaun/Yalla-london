export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { MultilingualSeoEngine } from '@/lib/seo/multilingual-seo';
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * Multilingual SEO enhancements API
 * Handles hreflang generation, duplicate detection, and locale-specific optimization
 */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { action, articleId, language, data } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }

    const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");
    const siteId = request.nextUrl.searchParams.get("siteId") || request.headers.get("x-site-id") || getDefaultSiteId();
    const baseUrl = getSiteDomain(siteId);

    const config = {
      defaultLanguage: 'en' as const,
      supportedLanguages: ['en', 'ar'] as Array<'en' | 'ar'>,
      baseUrl,
      urlStructure: 'subdirectory' as const
    };

    const multilingualEngine = new MultilingualSeoEngine(config);

    switch (action) {
      case 'generate_hreflang':
        return await handleGenerateHreflang(multilingualEngine, articleId, data);

      case 'detect_duplicates':
        return await handleDetectDuplicates(multilingualEngine);

      case 'generate_locale_schema':
        return await handleGenerateLocaleSchema(multilingualEngine, articleId, language, data, siteId);

      case 'validate_hreflang':
        return await handleValidateHreflang(multilingualEngine, data);
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Multilingual SEO error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Multilingual SEO operation failed' 
      },
      { status: 500 }
    );
  }
}

/**
 * Get multilingual SEO status and recommendations
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');

    const { prisma } = await import('@/lib/db');

    if (articleId) {
      // Get specific article multilingual status
      const article = await prisma.article.findUnique({
        where: { id: articleId },
        include: { seoData: true }
      });

      if (!article) {
        return NextResponse.json(
          { success: false, error: 'Article not found' },
          { status: 404 }
        );
      }

      const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");
      const siteId = request.nextUrl.searchParams.get("siteId") || request.headers.get("x-site-id") || getDefaultSiteId();

      const config = {
        defaultLanguage: 'en' as const,
        supportedLanguages: ['en', 'ar'] as Array<'en' | 'ar'>,
        baseUrl: getSiteDomain(siteId),
        urlStructure: 'subdirectory' as const
      };

      const multilingualEngine = new MultilingualSeoEngine(config);

      // Check if article has translation
      const translations = await prisma.article.findMany({
        where: {
          slug: article.slug,
          language: { not: article.language }
        }
      });

      const availableLanguages = [article.language as 'en' | 'ar'];
      if (translations.length > 0) {
        availableLanguages.push(...translations.map((t: any) => t.language as 'en' | 'ar'));
      }

      const hreflangTags = multilingualEngine.generateHreflangTags(article.slug, availableLanguages);
      const validation = multilingualEngine.validateHreflangImplementation(hreflangTags);

      return NextResponse.json({
        success: true,
        article: {
          id: article.id,
          title: article.title,
          language: article.language,
          has_translations: translations.length > 0,
          available_languages: availableLanguages
        },
        hreflang: {
          tags: hreflangTags,
          validation: validation
        },
        recommendations: generateRecommendations(article, translations, validation)
      });
    }

    // Get overall multilingual SEO status
    const articles = await prisma.article.findMany({
      select: {
        id: true,
        title: true,
        language: true,
        slug: true,
        seoData: {
          select: {
            metaDescription: true
          }
        }
      }
    });

    const multilingualStats = analyzeMutlilingualStats(articles);

    return NextResponse.json({
      success: true,
      stats: multilingualStats,
      recommendations: generateGlobalRecommendations(multilingualStats)
    });

  } catch (error) {
    console.error('Get multilingual SEO status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get multilingual SEO status' 
      },
      { status: 500 }
    );
  }
}

/**
 * Handle hreflang generation
 */
async function handleGenerateHreflang(
  engine: MultilingualSeoEngine, 
  articleId: string, 
  data: any
) {
  if (!articleId) {
    return NextResponse.json(
      { success: false, error: 'Article ID is required' },
      { status: 400 }
    );
  }

  const { prisma } = await import('@/lib/db');
  
  const article = await prisma.article.findUnique({
    where: { id: articleId }
  });

  if (!article) {
    return NextResponse.json(
      { success: false, error: 'Article not found' },
      { status: 404 }
    );
  }

  // Find translations of this article
  const translations = await prisma.article.findMany({
    where: {
      slug: article.slug,
      language: { not: article.language }
    }
  });

  const availableLanguages = [article.language as 'en' | 'ar'];
  if (translations.length > 0) {
    availableLanguages.push(...translations.map((t: any) => t.language as 'en' | 'ar'));
  }

  const hreflangTags = engine.generateHreflangTags(article.slug, availableLanguages);
  const validation = engine.validateHreflangImplementation(hreflangTags);

  // Update article SEO data with hreflang
  await prisma.article.update({
    where: { id: articleId },
    data: {
      seoData: {
        upsert: {
          create: {
            hreflang: hreflangTags.reduce((acc, tag) => {
              acc[tag.lang] = tag.url;
              return acc;
            }, {} as Record<string, string>),
            updatedAt: new Date()
          },
          update: {
            hreflang: hreflangTags.reduce((acc, tag) => {
              acc[tag.lang] = tag.url;
              return acc;
            }, {} as Record<string, string>),
            updatedAt: new Date()
          }
        }
      }
    }
  });

  return NextResponse.json({
    success: true,
    hreflang_tags: hreflangTags,
    validation: validation,
    available_languages: availableLanguages,
    message: 'Hreflang tags generated and saved successfully'
  });
}

/**
 * Handle duplicate content detection
 */
async function handleDetectDuplicates(engine: MultilingualSeoEngine) {
  const { prisma } = await import('@/lib/db');
  
  const articles = await prisma.article.findMany({
    select: {
      id: true,
      title: true,
      language: true,
      seoData: {
        select: {
          metaDescription: true
        }
      }
    }
  });

  const duplicateAnalysis = await engine.detectDuplicateContent(
    articles.map((a: any) => ({
      id: a.id,
      title: a.title,
      language: a.language as 'en' | 'ar',
      seoData: a.seoData
    }))
  );

  // Apply automatic fixes for simple cases
  const autoFixResults = [];
  for (const suggestion of duplicateAnalysis.suggestions) {
    if (suggestion.type === 'title') {
      try {
        await prisma.article.update({
          where: { id: suggestion.articleId },
          data: { title: suggestion.suggested }
        });
        autoFixResults.push({
          articleId: suggestion.articleId,
          type: suggestion.type,
          fixed: true,
          newValue: suggestion.suggested
        });
      } catch (error) {
        autoFixResults.push({
          articleId: suggestion.articleId,
          type: suggestion.type,
          fixed: false,
          error: 'Failed to apply fix'
        });
      }
    }
  }

  return NextResponse.json({
    success: true,
    analysis: duplicateAnalysis,
    auto_fixes_applied: autoFixResults,
    message: `Found ${duplicateAnalysis.duplicates.length} duplicate content issues, applied ${autoFixResults.filter(f => f.fixed).length} automatic fixes`
  });
}

/**
 * Handle locale-specific schema generation
 */
async function handleGenerateLocaleSchema(
  engine: MultilingualSeoEngine,
  articleId: string,
  language: 'en' | 'ar',
  data: any,
  siteId?: string
) {
  if (!articleId || !language) {
    return NextResponse.json(
      { success: false, error: 'Article ID and language are required' },
      { status: 400 }
    );
  }

  const { prisma } = await import('@/lib/db');
  const { SchemaGenerator } = await import('@/lib/seo/schema-generator');
  
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { seoData: true }
  });

  if (!article) {
    return NextResponse.json(
      { success: false, error: 'Article not found' },
      { status: 404 }
    );
  }

  // Generate base schema
  const { getDefaultSiteId, getSiteDomain } = await import("@/config/sites");
  const resolvedBaseUrl = getSiteDomain(siteId || getDefaultSiteId());
  const schemaGenerator = new SchemaGenerator(resolvedBaseUrl, {});
  
  const baseSchema = schemaGenerator.generateArticle({
    title: article.title,
    content: article.content || '',
    slug: article.slug,
    excerpt: article.excerpt,
    publishedAt: article.publishedAt?.toISOString() || new Date().toISOString(),
    updatedAt: article.updatedAt?.toISOString(),
    author: article.author,
    category: article.category,
    tags: article.tags,
    featuredImage: article.featuredImage
  });

  // Generate locale-specific schema
  const localeSchema = engine.generateLocaleSpecificSchema(
    baseSchema,
    language,
    {
      title: article.title,
      content: article.content || '',
      slug: article.slug,
      author: article.author
    }
  );

  // Update article with locale-specific schema
  await prisma.article.update({
    where: { id: articleId },
    data: {
      seoData: {
        upsert: {
          create: {
            schema: localeSchema,
            updatedAt: new Date()
          },
          update: {
            schema: localeSchema,
            updatedAt: new Date()
          }
        }
      }
    }
  });

  return NextResponse.json({
    success: true,
    schema: localeSchema,
    language: language,
    message: 'Locale-specific schema generated successfully'
  });
}

/**
 * Handle hreflang validation
 */
async function handleValidateHreflang(engine: MultilingualSeoEngine, data: any) {
  if (!data?.hreflang_tags) {
    return NextResponse.json(
      { success: false, error: 'Hreflang tags are required for validation' },
      { status: 400 }
    );
  }

  const validation = engine.validateHreflangImplementation(data.hreflang_tags);

  return NextResponse.json({
    success: true,
    validation: validation,
    message: validation.valid ? 'Hreflang implementation is valid' : 'Hreflang implementation has issues'
  });
}

/**
 * Generate recommendations for specific article
 */
function generateRecommendations(article: any, translations: any[], validation: any) {
  const recommendations = [];

  if (translations.length === 0) {
    recommendations.push({
      type: 'translation',
      priority: 'medium',
      title: 'Add translations',
      description: 'Consider adding Arabic/English translation for better multilingual SEO',
      action: 'Create translation of this article'
    });
  }

  if (!validation.valid) {
    recommendations.push({
      type: 'hreflang',
      priority: 'high',
      title: 'Fix hreflang issues',
      description: validation.errors.join(', '),
      action: 'Update hreflang implementation'
    });
  }

  if (validation.warnings.length > 0) {
    recommendations.push({
      type: 'hreflang',
      priority: 'low',
      title: 'Hreflang warnings',
      description: validation.warnings.join(', '),
      action: 'Review and optimize hreflang setup'
    });
  }

  return recommendations;
}

/**
 * Analyze multilingual statistics
 */
function analyzeMutlilingualStats(articles: any[]) {
  const totalArticles = articles.length;
  const byLanguage = articles.reduce((acc, article) => {
    acc[article.language] = (acc[article.language] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const slugGroups = articles.reduce((acc, article) => {
    if (!acc[article.slug]) acc[article.slug] = [];
    acc[article.slug].push(article);
    return acc;
  }, {} as Record<string, any[]>);

  const hasTranslations = Object.values(slugGroups).filter((group: any) => group.length > 1).length;
  const translationCoverage = totalArticles > 0 ? (hasTranslations / totalArticles) * 100 : 0;

  return {
    total_articles: totalArticles,
    by_language: byLanguage,
    articles_with_translations: hasTranslations,
    translation_coverage_percentage: Math.round(translationCoverage),
    missing_translations: totalArticles - hasTranslations
  };
}

/**
 * Generate global recommendations
 */
function generateGlobalRecommendations(stats: any) {
  const recommendations = [];

  if (stats.translation_coverage_percentage < 50) {
    recommendations.push({
      type: 'translation_coverage',
      priority: 'high',
      title: 'Improve translation coverage',
      description: `Only ${stats.translation_coverage_percentage}% of articles have translations`,
      action: 'Prioritize translating popular articles'
    });
  }

  const languages = Object.keys(stats.by_language);
  if (languages.length < 2) {
    recommendations.push({
      type: 'language_diversity',
      priority: 'medium',
      title: 'Add multilingual content',
      description: 'Consider adding content in both English and Arabic',
      action: 'Develop bilingual content strategy'
    });
  }

  return recommendations;
}