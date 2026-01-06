/**
 * Skills Admin API
 *
 * GET /api/admin/skills - List all skills
 * POST /api/admin/skills - Create a new skill
 */

import { NextRequest, NextResponse } from 'next/server';
import { SkillService, SkillCategory } from '@/lib/domains/team';
import { requirePermission } from '@/lib/rbac';
import type { CreateSkillInput, SkillFilters } from '@/lib/domains/team';

export async function GET(request: NextRequest) {
  try {
    // Require at least viewer permission
    await requirePermission(request, 'view_analytics');

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as SkillCategory | null;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

    const filters: SkillFilters = {
      ...(category && { category }),
      ...(search && { search }),
      is_active: searchParams.get('include_inactive') !== 'true' ? true : undefined,
    };

    const result = await SkillService.listSkills(filters, page, limit);

    return NextResponse.json({
      success: true,
      data: result.skills,
      meta: {
        total: result.total,
        byCategory: result.byCategory,
        page,
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch skills' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require admin permission to create skills
    await requirePermission(request, 'manage_system');

    const body = await request.json();

    // Validate required fields
    if (!body.slug || !body.name_en || !body.category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: slug, name_en, category' },
        { status: 400 }
      );
    }

    // Validate category enum
    if (!Object.values(SkillCategory).includes(body.category)) {
      return NextResponse.json(
        { success: false, error: `Invalid category. Must be one of: ${Object.values(SkillCategory).join(', ')}` },
        { status: 400 }
      );
    }

    const data: CreateSkillInput = {
      slug: body.slug,
      name_en: body.name_en,
      name_ar: body.name_ar || null,
      category: body.category,
      description_en: body.description_en || null,
      description_ar: body.description_ar || null,
      icon: body.icon || null,
      color: body.color || null,
      is_active: body.is_active !== false,
      display_order: body.display_order || 0,
    };

    const skill = await SkillService.createSkill(data);

    return NextResponse.json({
      success: true,
      data: skill,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating skill:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'A skill with this slug already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create skill' },
      { status: 500 }
    );
  }
}
