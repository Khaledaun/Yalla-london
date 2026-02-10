/**
 * Prompt Template by ID API
 * GET    - Get a specific prompt template
 * PUT    - Update a prompt template
 * DELETE - Delete a prompt template
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireAdmin } from "@/lib/admin-middleware";

const UpdatePromptTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  category: z.enum(['blog', 'guide', 'listicle', 'review', 'event', 'comparison', 'faq', 'news']).optional(),
  locale: z.enum(['en', 'ar', 'both']).optional(),
  template: z.string().min(10).optional(),
  templateAr: z.string().optional(),
  variables: z.array(z.string()).optional(),
  targetWordCount: z.number().min(300).max(10000).optional(),
  tone: z.enum(['professional', 'casual', 'luxury', 'informative']).optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

// Get a specific prompt template
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const id = params.id;

    // Check if it's a PageTypeRecipe (system template)
    const recipe = await prisma.pageTypeRecipe.findUnique({
      where: { id },
    });

    if (recipe) {
      return NextResponse.json({
        success: true,
        template: {
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
        },
      });
    }

    // Check API settings for custom templates
    const setting = await prisma.apiSettings.findUnique({
      where: { id },
    });

    if (setting && setting.key_name.startsWith('prompt_template_')) {
      const data = JSON.parse(setting.key_value);
      return NextResponse.json({
        success: true,
        template: {
          id: setting.id,
          name: data.name,
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
          metadata: data.metadata,
          createdAt: setting.created_at,
          updatedAt: setting.updated_at,
        },
      });
    }

    return NextResponse.json(
      { error: 'Prompt template not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Failed to fetch prompt template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt template' },
      { status: 500 }
    );
  }
}

// Update a prompt template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const id = params.id;
    const body = await request.json();

    const validation = UpdatePromptTemplateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const updates = validation.data;

    // Check if it's a system template (PageTypeRecipe)
    const recipe = await prisma.pageTypeRecipe.findUnique({
      where: { id },
    });

    if (recipe) {
      // Update PageTypeRecipe
      const currentPrompts = typeof recipe.template_prompts_json === 'object'
        ? recipe.template_prompts_json as Record<string, any>
        : {};

      const updatedRecipe = await prisma.pageTypeRecipe.update({
        where: { id },
        data: {
          min_word_count: updates.targetWordCount || recipe.min_word_count,
          template_prompts_json: {
            ...currentPrompts,
            ...(updates.template ? { en: updates.template } : {}),
            ...(updates.templateAr ? { ar: updates.templateAr } : {}),
          },
          updated_at: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'System template updated successfully',
        template: {
          id: updatedRecipe.id,
          category: updatedRecipe.type,
          updatedAt: updatedRecipe.updated_at,
        },
      });
    }

    // Update custom template (API setting)
    const setting = await prisma.apiSettings.findUnique({
      where: { id },
    });

    if (!setting || !setting.key_name.startsWith('prompt_template_')) {
      return NextResponse.json(
        { error: 'Prompt template not found' },
        { status: 404 }
      );
    }

    const currentData = JSON.parse(setting.key_value);
    const updatedData = {
      ...currentData,
      ...updates,
    };

    const updatedSetting = await prisma.apiSettings.update({
      where: { id },
      data: {
        key_value: JSON.stringify(updatedData),
        is_active: updates.isActive !== undefined ? updates.isActive : setting.is_active,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Prompt template updated successfully',
      template: {
        id: updatedSetting.id,
        name: updatedData.name,
        category: updatedData.category,
        isActive: updatedSetting.is_active,
        updatedAt: updatedSetting.updated_at,
      },
    });
  } catch (error) {
    console.error('Failed to update prompt template:', error);
    return NextResponse.json(
      { error: 'Failed to update prompt template' },
      { status: 500 }
    );
  }
}

// Delete a prompt template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const id = params.id;

    // Check if it's a system template
    const recipe = await prisma.pageTypeRecipe.findUnique({
      where: { id },
    });

    if (recipe) {
      return NextResponse.json(
        { error: 'Cannot delete system templates. You can only modify them.' },
        { status: 403 }
      );
    }

    // Delete custom template
    const setting = await prisma.apiSettings.findUnique({
      where: { id },
    });

    if (!setting || !setting.key_name.startsWith('prompt_template_')) {
      return NextResponse.json(
        { error: 'Prompt template not found' },
        { status: 404 }
      );
    }

    await prisma.apiSettings.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Prompt template deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete prompt template:', error);
    return NextResponse.json(
      { error: 'Failed to delete prompt template' },
      { status: 500 }
    );
  }
}
