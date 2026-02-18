export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { SchemaGenerator } from '@/lib/seo/schema-generator';
import { requireAdmin } from "@/lib/admin-middleware";

/**
 * Auto-generate schema markup for articles and pages
 */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { 
      pageType, 
      articleId, 
      data,
      autoDetect = true 
    } = body;

    if (!pageType && !articleId) {
      return NextResponse.json(
        { success: false, error: 'Page type or article ID is required' },
        { status: 400 }
      );
    }

    const { getSiteDomain, getSiteConfig, getDefaultSiteId } = await import("@/config/sites");
    const reqSiteId = data?.siteId || getDefaultSiteId();
    const siteConfig = getSiteConfig(reqSiteId);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || getSiteDomain(reqSiteId);
    const brandConfig = {
      name: siteConfig?.name || 'Yalla London',
      description: siteConfig ? `Luxury ${siteConfig.destination} travel guide` : 'Your Guide to London',
      url: baseUrl
    };

    const schemaGenerator = new SchemaGenerator(baseUrl, brandConfig);
    let articleData = data;

    // If articleId provided, fetch article data
    if (articleId) {
      const { prisma } = await import('@/lib/db');
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

      articleData = {
        title: article.title,
        content: article.content || '',
        slug: article.slug,
        excerpt: article.excerpt,
        publishedAt: article.publishedAt?.toISOString(),
        updatedAt: article.updatedAt?.toISOString(),
        author: article.author,
        category: article.category,
        tags: article.tags,
        featuredImage: article.featuredImage
      };
    }

    let schemas: any = null;
    const detectedTypes: string[] = [];

    if (autoDetect && articleData?.content) {
      // Auto-detect content types
      const contentTypes = detectContentTypes(articleData.content);
      detectedTypes.push(...contentTypes);

      // Generate schema for detected types
      if (contentTypes.length > 0) {
        const allSchemas = [];
        
        for (const type of contentTypes) {
          const schema = schemaGenerator.generateSchemaForPageType(type, articleData);
          if (schema) {
            if (Array.isArray(schema)) {
              allSchemas.push(...schema);
            } else {
              allSchemas.push(schema);
            }
          }
        }
        
        schemas = allSchemas.length === 1 ? allSchemas[0] : allSchemas;
      }
    } else if (pageType) {
      // Generate schema for specified page type
      schemas = schemaGenerator.generateSchemaForPageType(pageType, articleData);
    }

    if (!schemas) {
      return NextResponse.json({
        success: false,
        error: 'Could not generate schema for the provided content'
      }, { status: 400 });
    }

    // Update article with generated schema if articleId provided
    if (articleId) {
      const { prisma } = await import('@/lib/db');
      
      const schemaData = Array.isArray(schemas) ? schemas[0] : schemas;
      
      await prisma.article.update({
        where: { id: articleId },
        data: {
          seoData: {
            upsert: {
              create: {
                schema: schemaData,
                updatedAt: new Date()
              },
              update: {
                schema: schemaData,
                updatedAt: new Date()
              }
            }
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      schema: schemas,
      detected_types: detectedTypes,
      schema_count: Array.isArray(schemas) ? schemas.length : 1,
      message: 'Schema markup generated successfully'
    });

  } catch (error) {
    console.error('Schema generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Schema generation failed' 
      },
      { status: 500 }
    );
  }
}

/**
 * Get available schema types and validation
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');

    if (articleId) {
      // Get current schema for article
      const { prisma } = await import('@/lib/db');
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

      const currentSchema = article.seoData?.schema;
      const validationResults = currentSchema ? validateSchema(currentSchema) : null;

      return NextResponse.json({
        success: true,
        current_schema: currentSchema,
        validation: validationResults,
        has_schema: !!currentSchema
      });
    }

    // Return available schema types
    return NextResponse.json({
      success: true,
      available_types: [
        'article',
        'event',
        'place',
        'restaurant',
        'hotel',
        'faq',
        'howto',
        'guide',
        'review'
      ],
      auto_detect_features: [
        'FAQ detection from Q&A content',
        'HowTo detection from step-by-step content',
        'Review detection from rating content',
        'Multiple schema types per page'
      ]
    });

  } catch (error) {
    console.error('Schema API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process request' 
      },
      { status: 500 }
    );
  }
}

/**
 * Detect content types from article content
 */
function detectContentTypes(content: string): string[] {
  const types: string[] = [];

  // Always include article type for blog content
  types.push('article');

  // Detect FAQ content
  if (/Q:\s*.*\?\s*A:|#{2,3}\s*.*\?\s*\n/i.test(content)) {
    types.push('faq');
  }

  // Detect HowTo/Guide content
  if (/\d+\.\s+|step\s*\d+|how\s*to|guide|tutorial|instructions/i.test(content)) {
    types.push('howto');
  }

  // Detect Review content
  if (/review|rating|stars|recommend|experience|verdict|\d+\/5|\d+\s*out\s*of\s*\d+|★/i.test(content)) {
    types.push('review');
  }

  // Detect Event content
  if (/event|concert|show|festival|exhibition|date:|time:|location:|venue/i.test(content)) {
    types.push('event');
  }

  // Detect Place/Restaurant content
  if (/restaurant|cafe|hotel|address:|opening hours|menu|cuisine|location/i.test(content)) {
    if (/restaurant|cafe|menu|cuisine|food/i.test(content)) {
      types.push('restaurant');
    } else if (/hotel|accommodation|rooms|booking/i.test(content)) {
      types.push('hotel');
    } else {
      types.push('place');
    }
  }

  return types;
}

/**
 * Validate schema markup
 */
function validateSchema(schema: any): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!schema['@context']) {
    errors.push('Missing @context property');
  }

  if (!schema['@type']) {
    errors.push('Missing @type property');
  }

  // Type-specific validation
  switch (schema['@type']) {
    case 'Article':
      if (!schema.headline) warnings.push('Missing headline property');
      if (!schema.author) warnings.push('Missing author property');
      if (!schema.datePublished) warnings.push('Missing datePublished property');
      if (!schema.publisher) warnings.push('Missing publisher property');
      break;

    case 'FAQPage':
      if (!schema.mainEntity || !Array.isArray(schema.mainEntity)) {
        errors.push('FAQPage must have mainEntity array');
      }
      break;

    case 'HowTo':
      if (!schema.step || !Array.isArray(schema.step)) {
        errors.push('HowTo must have step array');
      }
      break;

    case 'Review':
      if (!schema.reviewRating) warnings.push('Missing reviewRating property');
      if (!schema.author) warnings.push('Missing author property');
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}