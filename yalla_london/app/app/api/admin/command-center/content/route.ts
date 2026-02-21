/**
 * Content Management API
 *
 * List and manage content across all sites.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from "@/lib/admin-middleware";

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'all';
    const site = searchParams.get('site');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause
    const where: any = {};

    if (status !== 'all') {
      if (status === 'published') {
        where.published = true;
      } else if (status === 'draft') {
        where.published = false;
      }
    }

    if (type !== 'all') {
      where.page_type = type;
    }

    // Get blog posts
    const posts = await prisma.blogPost.findMany({
      where,
      take: limit,
      orderBy: { updated_at: 'desc' },
      include: {
        category: true,
        author: {
          select: { name: true },
        },
      },
    });

    // Get scheduled content
    const scheduledContent = await prisma.scheduledContent.findMany({
      where: {
        status: status !== 'all' ? status : undefined,
      },
      take: limit,
      orderBy: { created_at: 'desc' },
    });

    // Map to response format
    const content = [
      ...posts.map((post) => ({
        id: post.id,
        title: post.title_en || post.title_ar,
        type: post.page_type || 'article',
        status: post.published ? 'published' : 'draft',
        site: 'Arabaldives', // Would need site relation
        locale: post.title_ar ? 'ar' : 'en',
        createdAt: post.created_at.toISOString(),
        updatedAt: formatRelativeTime(post.updated_at),
        scheduledFor: null,
        wordCount: (post.content_en || post.content_ar || '').split(/\s+/).length,
        seoScore: post.seo_score || 0,
        author: post.author?.name ? 'human' : 'ai',
      })),
      ...scheduledContent.map((content) => ({
        id: content.id,
        title: content.title,
        type: content.page_type || 'article',
        status: content.status,
        site: 'Arabaldives',
        locale: content.language as 'ar' | 'en',
        createdAt: content.created_at.toISOString(),
        updatedAt: formatRelativeTime(content.updated_at),
        scheduledFor: content.scheduled_time.toISOString(),
        wordCount: content.content.split(/\s+/).length,
        seoScore: content.seo_score || 0,
        author: content.generation_source === 'manual' ? 'human' : 'ai',
      })),
    ];

    // Sort by updated date
    content.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ content: content.slice(0, limit) });
  } catch (error) {
    console.error('Failed to get content:', error);
    return NextResponse.json(
      { error: 'Failed to get content' },
      { status: 500 }
    );
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}
