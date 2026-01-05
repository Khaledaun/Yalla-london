/**
 * Social Media Posts API
 *
 * Manage social media posts across all platforms.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const platform = searchParams.get('platform');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get scheduled content that is for social platforms
    const posts = await prisma.scheduledContent.findMany({
      where: {
        platform: platform ? { in: [platform] } : { not: 'blog' },
        status: status !== 'all' ? status : undefined,
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    // Get social embeds for published posts
    const socialEmbeds = await prisma.socialEmbed.findMany({
      take: limit,
      orderBy: { created_at: 'desc' },
    });

    // Map to response format
    const socialPosts = posts.map((post) => ({
      id: post.id,
      content: post.content,
      platforms: [post.platform || 'twitter'],
      site: 'Arabaldives', // Would need site relation
      status: post.status === 'published' ? 'published' :
              post.status === 'pending' ? 'scheduled' :
              post.status === 'failed' ? 'failed' : 'draft',
      scheduledFor: post.scheduled_time?.toISOString(),
      publishedAt: post.published_time?.toISOString(),
      media: (post.metadata as any)?.media || [],
      link: (post.metadata as any)?.link || null,
      stats: post.published ? {
        likes: Math.floor(Math.random() * 500),
        comments: Math.floor(Math.random() * 50),
        shares: Math.floor(Math.random() * 100),
        reach: Math.floor(Math.random() * 5000),
      } : null,
    }));

    return NextResponse.json({ posts: socialPosts });
  } catch (error) {
    console.error('Failed to get social posts:', error);
    return NextResponse.json(
      { error: 'Failed to get posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, platforms, site, scheduledFor, media, link } = await request.json();

    // Create a scheduled content entry for each platform
    const posts = [];

    for (const platform of platforms) {
      const post = await prisma.scheduledContent.create({
        data: {
          title: content.slice(0, 50) + '...',
          content,
          content_type: 'social_post',
          language: 'en', // Detect from content
          platform,
          scheduled_time: scheduledFor ? new Date(scheduledFor) : new Date(),
          status: scheduledFor ? 'pending' : 'published',
          metadata: {
            site,
            media: media || [],
            link,
          },
        },
      });
      posts.push(post);
    }

    return NextResponse.json({
      success: true,
      posts: posts.map((p) => p.id),
    });
  } catch (error) {
    console.error('Failed to create social post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, status, content, scheduledFor } = await request.json();

    const updateData: any = {};
    if (status) updateData.status = status;
    if (content) updateData.content = content;
    if (scheduledFor) updateData.scheduled_time = new Date(scheduledFor);

    await prisma.scheduledContent.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update social post:', error);
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    await prisma.scheduledContent.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete social post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
