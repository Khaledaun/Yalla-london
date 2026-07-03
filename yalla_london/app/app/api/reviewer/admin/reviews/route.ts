import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status');
  const reviewerId = searchParams.get('reviewerId');
  const siteId = searchParams.get('siteId');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    const { prisma } = await import('@/lib/db');

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (reviewerId) {
      where.reviewer_id = reviewerId;
    }

    if (siteId) {
      where.reviewer = { site_id: siteId };
    }

    // Search is handled post-query since we need to search content titles
    // which require joining with blog posts/drafts

    const reviews = await prisma.contentReview.findMany({
      where,
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            profile_picture: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    // Fetch content titles for each review
    const enrichedReviews = await Promise.all(
      reviews.map(async (review) => {
        let contentTitle = 'Unknown Content';

        try {
          if (review.content_type === 'blog_post') {
            const post = await prisma.blogPost.findUnique({
              where: { id: review.content_id },
              select: { title_en: true, title_ar: true },
            });
            contentTitle = post?.title_en || post?.title_ar || 'Untitled Post';
          } else if (review.content_type === 'article_draft') {
            const draft = await prisma.articleDraft.findUnique({
              where: { id: review.content_id },
              select: { topic_title: true, keyword: true },
            });
            contentTitle = draft?.topic_title || draft?.keyword || 'Untitled Draft';
          }
        } catch {
          // Content may have been deleted
        }

        return {
          id: review.id,
          contentType: review.content_type,
          contentId: review.content_id,
          contentTitle,
          status: review.status,
          reviewer: review.reviewer
            ? {
                id: review.reviewer.id,
                name: review.reviewer.name,
                email: review.reviewer.email,
                profilePicture: review.reviewer.profile_picture,
              }
            : null,
          assignedAt: review.assigned_at.toISOString(),
          openedAt: review.opened_at?.toISOString() || null,
          completedAt: review.completed_at?.toISOString() || null,
          reviewTimeMinutes: review.review_time_minutes,
          feedback: review.feedback,
          createdAt: review.created_at.toISOString(),
        };
      })
    );

    // Apply search filter if provided
    let filteredReviews = enrichedReviews;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredReviews = enrichedReviews.filter(
        (review) =>
          review.contentTitle.toLowerCase().includes(searchLower) ||
          review.reviewer?.name.toLowerCase().includes(searchLower) ||
          review.reviewer?.email.toLowerCase().includes(searchLower)
      );
    }

    // Get total count for pagination
    const totalCount = await prisma.contentReview.count({ where });

    return NextResponse.json({
      success: true,
      data: filteredReviews,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + filteredReviews.length < totalCount,
      },
    });
  } catch (error) {
    console.error('[reviewer-reviews-list] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST: Create a new content review assignment
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { contentType, contentId, reviewerId, notes } = body;

    if (!contentType || !contentId || !reviewerId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: contentType, contentId, reviewerId' },
        { status: 400 }
      );
    }

    if (!['blog_post', 'article_draft'].includes(contentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid content type' },
        { status: 400 }
      );
    }

    const { prisma } = await import('@/lib/db');

    // Verify reviewer exists and is active
    const reviewer = await prisma.reviewer.findUnique({
      where: { id: reviewerId },
    });

    if (!reviewer) {
      return NextResponse.json(
        { success: false, error: 'Reviewer not found' },
        { status: 404 }
      );
    }

    if (reviewer.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Reviewer is not active' },
        { status: 400 }
      );
    }

    // Verify content exists
    if (contentType === 'blog_post') {
      const post = await prisma.blogPost.findUnique({
        where: { id: contentId },
      });
      if (!post) {
        return NextResponse.json(
          { success: false, error: 'Blog post not found' },
          { status: 404 }
        );
      }
    } else {
      const draft = await prisma.articleDraft.findUnique({
        where: { id: contentId },
      });
      if (!draft) {
        return NextResponse.json(
          { success: false, error: 'Article draft not found' },
          { status: 404 }
        );
      }
    }

    // Check for existing pending/in_progress review
    const existingReview = await prisma.contentReview.findFirst({
      where: {
        content_type: contentType,
        content_id: contentId,
        status: { in: ['pending', 'in_progress'] },
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { success: false, error: 'Content already has a pending review' },
        { status: 400 }
      );
    }

    // Create the review
    const review = await prisma.contentReview.create({
      data: {
        content_type: contentType,
        content_id: contentId,
        reviewer_id: reviewerId,
        status: 'pending',
        assigned_at: new Date(),
        admin_notes: notes || null,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Send notification email to reviewer
    try {
      const { sendReviewAssignmentEmail } = await import('@/lib/reviewer/email');
      
      // Get content title
      let contentTitle = 'Content';
      if (contentType === 'blog_post') {
        const post = await prisma.blogPost.findUnique({
          where: { id: contentId },
          select: { title_en: true, slug: true },
        });
        contentTitle = post?.title_en || 'Blog Post';
        
        await sendReviewAssignmentEmail({
          to: reviewer.email,
          reviewerName: reviewer.name,
          articleTitle: contentTitle,
          articleSlug: post?.slug || review.id,
        });
      } else {
        const draft = await prisma.articleDraft.findUnique({
          where: { id: contentId },
          select: { topic_title: true },
        });
        contentTitle = draft?.topic_title || 'Article Draft';
        
        await sendReviewAssignmentEmail({
          to: reviewer.email,
          reviewerName: reviewer.name,
          articleTitle: contentTitle,
          articleSlug: review.id,
        });
      }
    } catch (emailError) {
      console.warn('[reviewer-reviews] Failed to send assignment email:', emailError);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: review.id,
        contentType: review.content_type,
        contentId: review.content_id,
        status: review.status,
        reviewer: review.reviewer,
        assignedAt: review.assigned_at.toISOString(),
      },
    });
  } catch (error) {
    console.error('[reviewer-reviews-create] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create review' },
      { status: 500 }
    );
  }
}
