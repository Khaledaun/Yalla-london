/**
 * Prompt Templates API
 * CRUD operations for content generation prompt templates
 *
 * GET  - List all prompt templates
 * POST - Create a new prompt template
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireAdmin } from "@/lib/admin-middleware";

// Validation schema for prompt templates
const PromptTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: z.enum(['blog', 'guide', 'listicle', 'review', 'event', 'comparison', 'faq', 'news']),
  locale: z.enum(['en', 'ar', 'both']).default('both'),
  template: z.string().min(10),
  variables: z.array(z.string()).default([]),
  targetWordCount: z.number().min(300).max(10000).default(1500),
  tone: z.enum(['professional', 'casual', 'luxury', 'informative']).default('professional'),
  isActive: z.boolean().default(true),
  metadata: z.record(z.any()).optional(),
});

// Get all prompt templates
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const locale = searchParams.get('locale');
    const activeOnly = searchParams.get('active') !== 'false';

    // Get templates from PageTypeRecipe (existing model with prompts)
    const pageTypeRecipes = await prisma.pageTypeRecipe.findMany({
      orderBy: { created_at: 'desc' },
    });

    // Also get any stored API settings with prompt templates
    const promptSettings = await prisma.apiSettings.findMany({
      where: {
        key_name: { startsWith: 'prompt_template_' },
        is_active: activeOnly,
      },
    });

    // Transform recipes into template format
    const recipesAsTemplates = pageTypeRecipes.map(recipe => ({
      id: recipe.id,
      name: `${recipe.type.charAt(0).toUpperCase() + recipe.type.slice(1)} Template`,
      description: `Default template for ${recipe.type} content`,
      category: recipe.type,
      locale: 'both',
      template: typeof recipe.template_prompts_json === 'object'
        ? (recipe.template_prompts_json as any)?.en || JSON.stringify(recipe.template_prompts_json)
        : String(recipe.template_prompts_json || ''),
      templateAr: typeof recipe.template_prompts_json === 'object'
        ? (recipe.template_prompts_json as any)?.ar || ''
        : '',
      variables: ['title', 'keywords', 'targetWordCount'],
      targetWordCount: recipe.min_word_count,
      tone: 'professional',
      isActive: true,
      isSystemTemplate: true,
      requiredBlocks: recipe.required_blocks,
      optionalBlocks: recipe.optional_blocks,
      schemaRequirements: recipe.schema_plan_json,
      createdAt: recipe.created_at,
      updatedAt: recipe.updated_at,
    }));

    // Transform API settings into templates
    const customTemplates = promptSettings.map(setting => {
      const data = JSON.parse(setting.key_value);
      return {
        id: setting.id,
        name: data.name || setting.key_name.replace('prompt_template_', ''),
        description: data.description,
        category: data.category,
        locale: data.locale || 'both',
        template: data.template,
        templateAr: data.templateAr,
        variables: data.variables || [],
        targetWordCount: data.targetWordCount || 1500,
        tone: data.tone || 'professional',
        isActive: setting.is_active,
        isSystemTemplate: false,
        createdAt: setting.created_at,
        updatedAt: setting.updated_at,
      };
    });

    // Combine and filter
    let allTemplates = [...recipesAsTemplates, ...customTemplates];

    if (category) {
      allTemplates = allTemplates.filter(t => t.category === category);
    }

    if (locale && locale !== 'both') {
      allTemplates = allTemplates.filter(t => t.locale === locale || t.locale === 'both');
    }

    return NextResponse.json({
      success: true,
      templates: allTemplates,
      count: allTemplates.length,
      categories: ['blog', 'guide', 'listicle', 'review', 'event', 'comparison', 'faq', 'news'],
    });
  } catch (error) {
    console.error('Failed to fetch prompt templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt templates' },
      { status: 500 }
    );
  }
}

// Create a new prompt template
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    // Validate input
    const validation = PromptTemplateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Store as API setting with prompt_template_ prefix
    const keyName = `prompt_template_${data.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

    const template = await prisma.apiSettings.create({
      data: {
        key_name: keyName,
        key_value: JSON.stringify({
          name: data.name,
          description: data.description,
          category: data.category,
          locale: data.locale,
          template: data.template,
          variables: data.variables,
          targetWordCount: data.targetWordCount,
          tone: data.tone,
          metadata: data.metadata,
        }),
        is_active: data.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Prompt template created successfully',
      template: {
        id: template.id,
        name: data.name,
        category: data.category,
        locale: data.locale,
        isActive: data.isActive,
        createdAt: template.created_at,
      },
    });
  } catch (error) {
    console.error('Failed to create prompt template:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt template' },
      { status: 500 }
    );
  }
}
