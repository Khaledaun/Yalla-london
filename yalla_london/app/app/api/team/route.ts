/**
 * Public Team API
 *
 * GET /api/team - List active team members
 */

import { NextRequest, NextResponse } from 'next/server';
import { TeamService } from '@/lib/domains/team';

// Define SkillCategory enum locally to match Prisma schema
enum SkillCategory {
  ENGINEERING = 'ENGINEERING',
  AI_ML = 'AI_ML',
  DESIGN = 'DESIGN',
  DATA = 'DATA',
  CONTENT = 'CONTENT',
  MARKETING = 'MARKETING',
  PSYCHOLOGY = 'PSYCHOLOGY',
  BUSINESS = 'BUSINESS',
  TRAVEL = 'TRAVEL',
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skillCategory = searchParams.get('skill_category') as SkillCategory | null;
    const skillId = searchParams.get('skill_id');
    const featured = searchParams.get('featured') === 'true';

    const result = await TeamService.listMembers(
      {
        is_active: true, // Only show active members publicly
        is_featured: featured ? true : undefined,
        skill_category: skillCategory || undefined,
        skill_id: skillId || undefined,
      },
      page,
      limit
    );

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
