/**
 * Public Team Member API
 *
 * GET /api/team/[slug] - Get a team member by slug
 */

import { NextRequest, NextResponse } from 'next/server';
import { TeamService } from '@/lib/domains/team';

interface RouteParams {
  params: { slug: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const member = await TeamService.getMemberBySlug(params.slug);

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Team member not found' },
        { status: 404 }
      );
    }

    // Only show active members publicly
    if (!(member as any).is_active) {
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
