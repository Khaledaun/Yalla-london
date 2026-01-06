/**
 * Team Members Admin API
 *
 * GET /api/admin/team - List all team members
 * POST /api/admin/team - Create a new team member
 */

import { NextRequest, NextResponse } from 'next/server';
import { TeamService, SkillCategory } from '@/lib/domains/team';
import { requirePermission } from '@/lib/rbac';
import type { CreateTeamMemberInput, TeamMemberFilters } from '@/lib/domains/team';

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'view_analytics');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const siteId = searchParams.get('site_id');
    const skillCategory = searchParams.get('skill_category') as SkillCategory | null;
    const skillId = searchParams.get('skill_id');

    const filters: TeamMemberFilters = {
      ...(siteId && { site_id: siteId === 'global' ? null : siteId }),
      ...(skillCategory && { skill_category: skillCategory }),
      ...(skillId && { skill_id: skillId }),
      is_active: searchParams.get('include_inactive') !== 'true' ? true : undefined,
      is_featured: searchParams.get('featured_only') === 'true' ? true : undefined,
    };

    const result = await TeamService.listMembers(filters, page, limit);

    return NextResponse.json({
      success: true,
      data: result.members,
      meta: {
        total: result.total,
        pages: result.pages,
        page,
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission(request, 'manage_users');

    const body = await request.json();

    // Validate required fields
    if (!body.name_en || !body.title_en || !body.bio_en) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name_en, title_en, bio_en' },
        { status: 400 }
      );
    }

    const data: CreateTeamMemberInput = {
      site_id: body.site_id || null,
      user_id: body.user_id || null,
      name_en: body.name_en,
      name_ar: body.name_ar || null,
      slug: body.slug || generateSlug(body.name_en),
      title_en: body.title_en,
      title_ar: body.title_ar || null,
      bio_en: body.bio_en,
      bio_ar: body.bio_ar || null,
      avatar_url: body.avatar_url || null,
      cover_image_url: body.cover_image_url || null,
      email_public: body.email_public || null,
      linkedin_url: body.linkedin_url || null,
      twitter_url: body.twitter_url || null,
      instagram_url: body.instagram_url || null,
      website_url: body.website_url || null,
      is_active: body.is_active !== false,
      is_featured: body.is_featured || false,
      display_order: body.display_order || 0,
    };

    const member = await TeamService.createMember(data);

    return NextResponse.json({
      success: true,
      data: member,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating team member:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'A team member with this slug already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create team member' },
      { status: 500 }
    );
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
