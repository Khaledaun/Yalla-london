/**
 * Individual Skill Admin API
 *
 * GET /api/admin/skills/[id] - Get a skill by ID
 * PUT /api/admin/skills/[id] - Update a skill
 * DELETE /api/admin/skills/[id] - Delete a skill
 */

import { NextRequest, NextResponse } from 'next/server';
import { SkillCategory } from '@prisma/client';
import { SkillService } from '@/lib/domains/team';
import { requirePermission } from '@/lib/rbac';
import type { UpdateSkillInput } from '@/lib/domains/team';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission(request, 'view_analytics');

    const skill = await SkillService.getSkillById(params.id);

    if (!skill) {
      return NextResponse.json(
        { success: false, error: 'Skill not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: skill,
    });
  } catch (error) {
    console.error('Error fetching skill:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch skill' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission(request, 'manage_system');

    const body = await request.json();

    // Validate category if provided
    if (body.category && !Object.values(SkillCategory).includes(body.category)) {
      return NextResponse.json(
        { success: false, error: `Invalid category. Must be one of: ${Object.values(SkillCategory).join(', ')}` },
        { status: 400 }
      );
    }

    const data: UpdateSkillInput = {};

    // Only include fields that are provided
    if (body.slug !== undefined) data.slug = body.slug;
    if (body.name_en !== undefined) data.name_en = body.name_en;
    if (body.name_ar !== undefined) data.name_ar = body.name_ar;
    if (body.category !== undefined) data.category = body.category;
    if (body.description_en !== undefined) data.description_en = body.description_en;
    if (body.description_ar !== undefined) data.description_ar = body.description_ar;
    if (body.icon !== undefined) data.icon = body.icon;
    if (body.color !== undefined) data.color = body.color;
    if (body.is_active !== undefined) data.is_active = body.is_active;
    if (body.display_order !== undefined) data.display_order = body.display_order;

    const skill = await SkillService.updateSkill(params.id, data);

    return NextResponse.json({
      success: true,
      data: skill,
    });
  } catch (error: any) {
    console.error('Error updating skill:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Skill not found' },
        { status: 404 }
      );
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'A skill with this slug already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update skill' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission(request, 'manage_system');

    await SkillService.deleteSkill(params.id);

    return NextResponse.json({
      success: true,
      message: 'Skill deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting skill:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Skill not found' },
        { status: 404 }
      );
    }

    // Foreign key constraint - skill is assigned to team members
    if (error.code === 'P2003') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete skill that is assigned to team members. Remove assignments first.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete skill' },
      { status: 500 }
    );
  }
}
