export const dynamic = 'force-dynamic';
export const revalidate = 0;


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from "@/lib/admin-middleware";


// Get all scheduled content
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const contentType = searchParams.get('contentType');
    const limit = parseInt(searchParams.get('limit') || '50');

    const whereClause: any = {};
    if (status && status !== 'all') whereClause.status = status;
    if (contentType && contentType !== 'all') whereClause.content_type = contentType;

    const scheduledContent = await prisma.scheduledContent.findMany({
      where: whereClause,
      orderBy: { scheduled_time: 'asc' },
      take: limit
    });

    // Transform to camelCase for frontend
    const transformedContent = scheduledContent.map((content: any) => ({
      id: content.id,
      title: content.title,
      content: content.content,
      contentType: content.content_type,
      language: content.language,
      category: content.category,
      tags: content.tags,
      scheduledTime: content.scheduled_time.toISOString(),
      publishedTime: content.published_time?.toISOString(),
      status: content.status,
      platform: content.platform,
      createdAt: content.created_at.toISOString(),
      updatedAt: content.updated_at.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      content: transformedContent
    });

  } catch (error) {
    console.error('Failed to fetch scheduled content:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch scheduled content',
        content: []
      },
      { status: 500 }
    );
  }
}

// Create new scheduled content
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { 
      title, 
      content, 
      contentType, 
      language, 
      category, 
      tags, 
      scheduledTime, 
      platform,
      metadata 
    } = await request.json();

    if (!title || !content || !contentType || !scheduledTime) {
      return NextResponse.json(
        { error: 'Missing required fields: title, content, contentType, scheduledTime' },
        { status: 400 }
      );
    }

    const scheduledContent = await prisma.scheduledContent.create({
      data: {
        title,
        content,
        content_type: contentType,
        language: language || 'en',
        category,
        tags: tags || [],
        metadata: metadata || {},
        scheduled_time: new Date(scheduledTime),
        platform,
        status: 'pending'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Content scheduled successfully',
      content: {
        id: scheduledContent.id,
        title: scheduledContent.title,
        scheduledTime: scheduledContent.scheduled_time.toISOString(),
        status: scheduledContent.status
      }
    });

  } catch (error) {
    console.error('Failed to schedule content:', error);
    return NextResponse.json(
      { error: 'Failed to schedule content' },
      { status: 500 }
    );
  }
}

// Update scheduled content status
export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { contentId, status, publishedTime } = await request.json();

    if (!contentId || !status) {
      return NextResponse.json(
        { error: 'contentId and status are required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      status,
      updated_at: new Date()
    };

    if (status === 'published') {
      updateData.published_time = publishedTime ? new Date(publishedTime) : new Date();
    }

    const updatedContent = await prisma.scheduledContent.update({
      where: { id: contentId },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message: `Content status updated to ${status}`,
      content: {
        id: updatedContent.id,
        status: updatedContent.status,
        publishedTime: updatedContent.published_time?.toISOString()
      }
    });

  } catch (error) {
    console.error('Failed to update content status:', error);
    return NextResponse.json(
      { error: 'Failed to update content status' },
      { status: 500 }
    );
  }
}

// Delete scheduled content
export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('id');

    if (!contentId) {
      return NextResponse.json(
        { error: 'Content ID is required' },
        { status: 400 }
      );
    }

    await prisma.scheduledContent.delete({
      where: { id: contentId }
    });

    return NextResponse.json({
      success: true,
      message: 'Scheduled content deleted successfully'
    });

  } catch (error) {
    console.error('Failed to delete scheduled content:', error);
    return NextResponse.json(
      { error: 'Failed to delete scheduled content' },
      { status: 500 }
    );
  }
}
