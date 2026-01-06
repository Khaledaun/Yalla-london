/**
 * Team Member Expertise API
 *
 * POST /api/admin/team/[id]/expertise - Assign skill to team member
 * PUT /api/admin/team/[id]/expertise - Update or bulk assign skills
 * DELETE /api/admin/team/[id]/expertise - Remove skill from team member
 */

import { NextRequest, NextResponse } from 'next/server';
import { ExpertiseService, TeamService } from '@/lib/domains/team';
import { requirePermission } from '@/lib/rbac';

// Define Proficiency enum locally to match Prisma schema
enum Proficiency {
  LEARNING = 'LEARNING',
  PROFICIENT = 'PROFICIENT',
  EXPERT = 'EXPERT',
  THOUGHT_LEADER = 'THOUGHT_LEADER',
}

interface RouteParams {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission(request, 'manage_users');

    const body = await request.json();

    if (!body.skill_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: skill_id' },
        { status: 400 }
      );
    }

    // Validate proficiency if provided
    if (body.proficiency && !Object.values(Proficiency).includes(body.proficiency)) {
      return NextResponse.json(
        { success: false, error: `Invalid proficiency. Must be one of: ${Object.values(Proficiency).join(', ')}` },
        { status: 400 }
      );
    }

    const member = await ExpertiseService.assignSkill({
      team_member_id: params.id,
      skill_id: body.skill_id,
      proficiency: body.proficiency || 'EXPERT',
      years_experience: body.years_experience || null,
      description_en: body.description_en || null,
      description_ar: body.description_ar || null,
      is_primary: body.is_primary || false,
      display_order: body.display_order || 0,
    });

    return NextResponse.json({
      success: true,
      data: member,
    });
  } catch (error: any) {
    console.error('Error assigning expertise:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Team member or skill not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to assign expertise' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission(request, 'manage_users');

    const body = await request.json();

    // Bulk assign skills
    if (body.skills && Array.isArray(body.skills)) {
      const member = await ExpertiseService.bulkAssignSkills(
        params.id,
        body.skills.map((s: any) => ({
          skillId: s.skill_id,
          proficiency: s.proficiency,
          isPrimary: s.is_primary,
        }))
      );

      return NextResponse.json({
        success: true,
        data: member,
      });
    }

    // Set primary skills
    if (body.primary_skill_ids && Array.isArray(body.primary_skill_ids)) {
      await ExpertiseService.setPrimarySkills(params.id, body.primary_skill_ids);

      const member = await TeamService.getMemberById(params.id);

      return NextResponse.json({
        success: true,
        data: member,
      });
    }

    // Update single expertise
    if (body.skill_id) {
      await ExpertiseService.updateExpertise(params.id, body.skill_id, {
        proficiency: body.proficiency,
        years_experience: body.years_experience,
        description_en: body.description_en,
        description_ar: body.description_ar,
        is_primary: body.is_primary,
        display_order: body.display_order,
      });

      const member = await TeamService.getMemberById(params.id);

      return NextResponse.json({
        success: true,
        data: member,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Must provide skills array, primary_skill_ids, or skill_id' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error updating expertise:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Team member, skill, or expertise not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update expertise' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission(request, 'manage_users');

    const { searchParams } = new URL(request.url);
    const skillId = searchParams.get('skill_id');

    if (!skillId) {
      return NextResponse.json(
        { success: false, error: 'Missing required query param: skill_id' },
        { status: 400 }
      );
    }

    await ExpertiseService.removeSkill(params.id, skillId);

    return NextResponse.json({
      success: true,
      message: 'Expertise removed successfully',
    });
  } catch (error: any) {
    console.error('Error removing expertise:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Expertise assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to remove expertise' },
      { status: 500 }
    );
  }
}
