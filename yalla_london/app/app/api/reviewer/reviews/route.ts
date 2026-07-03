/**
 * GET /api/reviewer/reviews
 * List all reviews assigned to the current reviewer
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentReviewer } from '@/lib/reviewer/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const reviewer = await getCurrentReviewer();
    
    if (!reviewer) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // assigned, in_progress, submitted, approved, rejected
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build where clause
    const where: Record<string, unknown> = {
      reviewer_id: reviewer.id,
    };
    
    if (status) {
      where.status = status;
    }
    
    // Get reviews with related content
    const reviews = await prisma.contentReview.findMany({
      where,
      include: {
        article_draft: {
          select: {
            id: true,
            keyword: true,
            topic_title: true,
            locale: true,
            seo_score: true,
            word_count: true,
            current_phase: true,
          },
        },
        blog_post: {
          select: {
            id: true,
            slug: true,
            title_en: true,
            title_ar: true,
            seo_score: true,
            category_id: true,
          },
        },
        photos: {
          select: {
            id: true,
            url: true,
            thumbnail_url: true,
            is_verified: true,
          },
        },
      },
      orderBy: [
        { priority: 'asc' }, // urgent first
        { due_date: 'asc' }, // then by due date
        { created_at: 'desc' },
      ],
      take: limit,
      skip: offset,
    });
    
    // Get total count
    const total = await prisma.contentReview.count({ where });
    
    // Format response
    const formattedReviews = reviews.map(review => ({
      id: review.id,
      site_id: review.site_id,
      status: review.status,
      priority: review.priority,
      due_date: review.due_date,
      assigned_at: review.assigned_at,
      instructions: review.instructions,
      // Content info
      content: review.article_draft ? {
        type: 'draft',
        id: review.article_draft.id,
        title: review.article_draft.keyword || review.article_draft.topic_title,
        locale: review.article_draft.locale,
        seo_score: review.article_draft.seo_score,
        word_count: review.article_draft.word_count,
        phase: review.article_draft.current_phase,
      } : review.blog_post ? {
        type: 'published',
        id: review.blog_post.id,
        title: review.blog_post.title_en || review.blog_post.title_ar,
        slug: review.blog_post.slug,
        seo_score: review.blog_post.seo_score,
      } : null,
      // Review progress
      has_edits: !!(review.title_edit || review.content_edit),
      photos_count: review.photos.length,
      insider_tips_added: review.insider_tips_added,
      facts_verified: review.facts_verified,
      // Submission
      submitted_at: review.submitted_at,
      admin_feedback: review.admin_feedback,
      approval_status: review.approval_status,
    }));
    
    return NextResponse.json({
      success: true,
      reviews: formattedReviews,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + reviews.length < total,
      },
    });
    
  } catch (error) {
    console.error('[reviews GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
