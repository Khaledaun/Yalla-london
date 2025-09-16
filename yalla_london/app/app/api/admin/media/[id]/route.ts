/**
 * Individual Media File Management API
 * CRUD operations for individual media files
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const MediaUpdateSchema = z.object({
  filename: z.string().min(1).optional(),
  alt_text: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional()
});

/**
 * GET /api/admin/media/[id]
 * Get a specific media file by ID
 */
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    // Extract ID from URL pathname
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];
    
    if (!id) {
      return NextResponse.json(
        { error: 'Media file ID is required' },
        { status: 400 }
      );
    }
    
    const mediaFile = await prisma.media.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!mediaFile) {
      return NextResponse.json(
        { error: 'Media file not found' },
        { status: 404 }
      );
    }
    
    const transformedData = {
      id: mediaFile.id,
      filename: mediaFile.filename,
      url: mediaFile.url,
      thumbnailUrl: mediaFile.thumbnail_url,
      size: mediaFile.size,
      mimeType: mediaFile.mime_type,
      width: mediaFile.width,
      height: mediaFile.height,
      altText: mediaFile.alt_text,
      description: mediaFile.description,
      tags: mediaFile.tags,
      createdAt: mediaFile.created_at,
      updatedAt: mediaFile.updated_at,
      uploadedBy: mediaFile.uploadedBy,
      usageCount: mediaFile.usage_count || 0
    };
    
    return NextResponse.json({
      success: true,
      data: transformedData
    });
    
  } catch (error) {
    console.error('Failed to fetch media file:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch media file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/admin/media/[id]
 * Update a specific media file
 */
export const PUT = withAdminAuth(async (request: NextRequest) => {
  try {
    // Extract ID from URL pathname
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];
    
    if (!id) {
      return NextResponse.json(
        { error: 'Media file ID is required' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    const validation = MediaUpdateSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid media data',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }
    
    const data = validation.data;
    
    // Check if media file exists
    const existingFile = await prisma.media.findUnique({
      where: { id }
    });
    
    if (!existingFile) {
      return NextResponse.json(
        { error: 'Media file not found' },
        { status: 404 }
      );
    }
    
    // Update the media file
    const updatedFile = await prisma.media.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date()
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    const transformedData = {
      id: updatedFile.id,
      filename: updatedFile.filename,
      url: updatedFile.url,
      thumbnailUrl: updatedFile.thumbnail_url,
      size: updatedFile.size,
      mimeType: updatedFile.mime_type,
      width: updatedFile.width,
      height: updatedFile.height,
      altText: updatedFile.alt_text,
      description: updatedFile.description,
      tags: updatedFile.tags,
      createdAt: updatedFile.created_at,
      updatedAt: updatedFile.updated_at,
      uploadedBy: updatedFile.uploadedBy,
      usageCount: updatedFile.usage_count || 0
    };
    
    return NextResponse.json({
      success: true,
      message: 'Media file updated successfully',
      data: transformedData
    });
    
  } catch (error) {
    console.error('Failed to update media file:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update media file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/admin/media/[id]
 * Delete a specific media file
 */
export const DELETE = withAdminAuth(async (request: NextRequest) => {
  try {
    // Extract ID from URL pathname
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];
    
    if (!id) {
      return NextResponse.json(
        { error: 'Media file ID is required' },
        { status: 400 }
      );
    }
    
    // Check if media file exists and if it's in use
    const existingFile = await prisma.media.findUnique({
      where: { id },
      select: {
        id: true,
        filename: true,
        usage_count: true
      }
    });
    
    if (!existingFile) {
      return NextResponse.json(
        { error: 'Media file not found' },
        { status: 404 }
      );
    }
    
    if (existingFile.usage_count && existingFile.usage_count > 0) {
      return NextResponse.json({
        error: 'Cannot delete media file that is currently in use',
        details: `File "${existingFile.filename}" is used in ${existingFile.usage_count} location(s)`
      }, { status: 400 });
    }
    
    // Delete the media file
    await prisma.media.delete({
      where: { id }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Media file deleted successfully'
    });
    
  } catch (error) {
    console.error('Failed to delete media file:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete media file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/admin/media/[id]
 * Update specific fields or perform actions on media file
 */
export const PATCH = withAdminAuth(async (request: NextRequest) => {
  try {
    // Extract ID from URL pathname
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const id = pathSegments[pathSegments.length - 1];
    
    if (!id) {
      return NextResponse.json(
        { error: 'Media file ID is required' },
        { status: 400 }
      );
    }
    
    const { action, ...data } = await request.json();
    
    // Check if media file exists
    const existingFile = await prisma.media.findUnique({
      where: { id }
    });
    
    if (!existingFile) {
      return NextResponse.json(
        { error: 'Media file not found' },
        { status: 404 }
      );
    }
    
    let updateData: any = { updated_at: new Date() };
    let message = 'Media file updated successfully';
    
    switch (action) {
      case 'increment_usage':
        updateData.usage_count = {
          increment: 1
        };
        message = 'Media usage count incremented';
        break;
      case 'decrement_usage':
        updateData.usage_count = {
          decrement: 1
        };
        message = 'Media usage count decremented';
        break;
      case 'reset_usage':
        updateData.usage_count = 0;
        message = 'Media usage count reset';
        break;
      default:
        // Regular field updates
        const validation = MediaUpdateSchema.safeParse(data);
        if (!validation.success) {
          return NextResponse.json(
            { 
              error: 'Invalid media data',
              details: validation.error.issues
            },
            { status: 400 }
          );
        }
        updateData = { ...updateData, ...validation.data };
        break;
    }
    
    // Update the media file
    const updatedFile = await prisma.media.update({
      where: { id },
      data: updateData,
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    const transformedData = {
      id: updatedFile.id,
      filename: updatedFile.filename,
      url: updatedFile.url,
      thumbnailUrl: updatedFile.thumbnail_url,
      size: updatedFile.size,
      mimeType: updatedFile.mime_type,
      width: updatedFile.width,
      height: updatedFile.height,
      altText: updatedFile.alt_text,
      description: updatedFile.description,
      tags: updatedFile.tags,
      createdAt: updatedFile.created_at,
      updatedAt: updatedFile.updated_at,
      uploadedBy: updatedFile.uploadedBy,
      usageCount: updatedFile.usage_count || 0
    };
    
    return NextResponse.json({
      success: true,
      message,
      data: transformedData
    });
    
  } catch (error) {
    console.error('Failed to update media file:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update media file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});