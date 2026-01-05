/**
 * Individual Team Member Admin API
 *
 * GET /api/admin/team/[id] - Get a team member by ID
 * PUT /api/admin/team/[id] - Update a team member
 * DELETE /api/admin/team/[id] - Delete a team member
 */

import { NextRequest, NextResponse } from 'next/server';
import { TeamService } from '@/lib/domains/team';
import { requirePermission } from '@/lib/rbac';
import type { UpdateTeamMemberInput } from '@/lib/domains/team';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission(request, 'view_analytics');

    const member = await TeamService.getMemberById(params.id);

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Team member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: member,
    });
  } catch (error) {
    console.error('Error fetching team member:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team member' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission(request, 'manage_users');

    const body = await request.json();

    const data: UpdateTeamMemberInput = {};

    // Only include fields that are provided
    if (body.site_id !== undefined) data.site_id = body.site_id;
    if (body.user_id !== undefined) data.user_id = body.user_id;
    if (body.name_en !== undefined) data.name_en = body.name_en;
    if (body.name_ar !== undefined) data.name_ar = body.name_ar;
    if (body.slug !== undefined) data.slug = body.slug;
    if (body.title_en !== undefined) data.title_en = body.title_en;
    if (body.title_ar !== undefined) data.title_ar = body.title_ar;
    if (body.bio_en !== undefined) data.bio_en = body.bio_en;
    if (body.bio_ar !== undefined) data.bio_ar = body.bio_ar;
    if (body.avatar_url !== undefined) data.avatar_url = body.avatar_url;
    if (body.cover_image_url !== undefined) data.cover_image_url = body.cover_image_url;
    if (body.email_public !== undefined) data.email_public = body.email_public;
    if (body.linkedin_url !== undefined) data.linkedin_url = body.linkedin_url;
    if (body.twitter_url !== undefined) data.twitter_url = body.twitter_url;
    if (body.instagram_url !== undefined) data.instagram_url = body.instagram_url;
    if (body.website_url !== undefined) data.website_url = body.website_url;
    if (body.is_active !== undefined) data.is_active = body.is_active;
    if (body.is_featured !== undefined) data.is_featured = body.is_featured;
    if (body.display_order !== undefined) data.display_order = body.display_order;

    const member = await TeamService.updateMember(params.id, data);

    return NextResponse.json({
      success: true,
      data: member,
    });
  } catch (error: any) {
    console.error('Error updating team member:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Team member not found' },
        { status: 404 }
      );
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'A team member with this slug already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update team member' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission(request, 'manage_users');

    await TeamService.deleteMember(params.id);

    return NextResponse.json({
      success: true,
      message: 'Team member deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting team member:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Team member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete team member' },
      { status: 500 }
    );
  }
}
