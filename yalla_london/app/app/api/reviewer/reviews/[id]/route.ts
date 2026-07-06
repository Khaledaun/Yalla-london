/**
 * GET/PUT /api/reviewer/reviews/[id]
 * Get or update a specific content review
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentReviewer } from '@/lib/reviewer/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const reviewer = await getCurrentReviewer();
    
    if (!reviewer) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    
    // Get review with all related data
    const review = await prisma.contentReview.findFirst({
      where: {
        id,
        reviewer_id: reviewer.id,
      },
      include: {
        article_draft: true,
        blog_post: true,
        photos: true,
      },
    });
    
    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }
    
    // HIDDEN: Track first open time (reviewer doesn't see this)
    if (!review.first_opened_at) {
      await prisma.contentReview.update({
        where: { id },
        data: {
          first_opened_at: new Date(),
          status: review.status === 'assigned' ? 'in_progress' : review.status,
        },
      });
    }
    
    // Get the original content
    let originalContent = null;
    if (review.article_draft) {
      originalContent = {
        type: 'draft',
        id: review.article_draft.id,
        title: review.article_draft.keyword || review.article_draft.topic_title,
        content: review.article_draft.sections_written,
        locale: review.article_draft.locale,
        seo_score: review.article_draft.seo_score,
        word_count: review.article_draft.word_count,
        meta_title: (review.article_draft.seo_meta as Record<string, unknown>)?.metaTitle,
        meta_description: (review.article_draft.seo_meta as Record<string, unknown>)?.metaDescription,
      };
    } else if (review.blog_post) {
      originalContent = {
        type: 'published',
        id: review.blog_post.id,
        slug: review.blog_post.slug,
        title_en: review.blog_post.title_en,
        title_ar: review.blog_post.title_ar,
        content_en: review.blog_post.content_en,
        content_ar: review.blog_post.content_ar,
        seo_score: review.blog_post.seo_score,
        meta_title_en: review.blog_post.meta_title_en,
        meta_title_ar: review.blog_post.meta_title_ar,
        meta_description_en: review.blog_post.meta_description_en,
        meta_description_ar: review.blog_post.meta_description_ar,
      };
    }
    
    return NextResponse.json({
      success: true,
      review: {
        id: review.id,
        site_id: review.site_id,
        status: review.status,
        priority: review.priority,
        due_date: review.due_date,
        assigned_at: review.assigned_at,
        instructions: review.instructions,
        // Reviewer's edits (if any)
        edits: {
          title: review.title_edit,
          content: review.content_edit,
          meta_title: review.meta_title_edit,
          meta_description: review.meta_description_edit,
          experience_notes: review.experience_notes,
        },
        // Progress
        facts_verified: review.facts_verified,
        insider_tips_added: review.insider_tips_added,
        // Submission
        submitted_at: review.submitted_at,
        reviewer_notes: review.reviewer_notes,
        admin_feedback: review.admin_feedback,
        approval_status: review.approval_status,
        // Photos
        photos: review.photos.map(p => ({
          id: p.id,
          url: p.url,
          thumbnail_url: p.thumbnail_url,
          alt_text: p.alt_text,
          caption: p.caption,
          license_type: p.license_type,
          ownership_declared: p.ownership_declared,
          is_verified: p.is_verified,
        })),
      },
      originalContent,
    });
    
  } catch (error) {
    console.error('[review GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const reviewer = await getCurrentReviewer();
    
    if (!reviewer) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    const body = await request.json();
    
    // Get the review
    const review = await prisma.contentReview.findFirst({
      where: {
        id,
        reviewer_id: reviewer.id,
      },
    });
    
    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }
    
    // Can't edit after approval
    if (review.approval_status === 'approved') {
      return NextResponse.json(
        { success: false, error: 'Cannot edit an approved review' },
        { status: 400 }
      );
    }
    
    const {
      title_edit,
      content_edit,
      meta_title_edit,
      meta_description_edit,
      experience_notes,
      facts_verified,
      insider_tips_added,
      reviewer_notes,
      action, // 'save' or 'submit'
    } = body;
    
    // Build update data
    const updateData: Record<string, unknown> = {
      last_activity_at: new Date(),
    };
    
    // Content edits
    if (title_edit !== undefined) {
      updateData.title_edit = title_edit?.trim() || null;
    }
    if (content_edit !== undefined) {
      updateData.content_edit = content_edit?.trim() || null;
    }
    if (meta_title_edit !== undefined) {
      updateData.meta_title_edit = meta_title_edit?.trim() || null;
    }
    if (meta_description_edit !== undefined) {
      updateData.meta_description_edit = meta_description_edit?.trim() || null;
    }
    if (experience_notes !== undefined) {
      updateData.experience_notes = experience_notes?.trim() || null;
    }
    
    // Checkboxes
    if (facts_verified !== undefined) {
      updateData.facts_verified = !!facts_verified;
    }
    if (insider_tips_added !== undefined) {
      if (typeof insider_tips_added !== 'number' || insider_tips_added < 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid insider tips count' },
          { status: 400 }
        );
      }
      updateData.insider_tips_added = insider_tips_added;
    }
    
    // Notes
    if (reviewer_notes !== undefined) {
      updateData.reviewer_notes = reviewer_notes?.trim() || null;
    }
    
    // Handle submission
    if (action === 'submit') {
      // Validate before submission
      if (!updateData.content_edit && !review.content_edit) {
        return NextResponse.json(
          { success: false, error: 'Please add your edits before submitting' },
          { status: 400 }
        );
      }
      
      updateData.status = 'submitted';
      updateData.submitted_at = new Date();
    } else {
      // Just saving - ensure status is in_progress
      if (review.status === 'assigned') {
        updateData.status = 'in_progress';
      }
    }
    
    // Update review
    const updated = await prisma.contentReview.update({
      where: { id },
      data: updateData,
    });
    
    return NextResponse.json({
      success: true,
      review: {
        id: updated.id,
        status: updated.status,
        submitted_at: updated.submitted_at,
      },
      message: action === 'submit' 
        ? 'Review submitted for approval' 
        : 'Changes saved',
    });
    
  } catch (error) {
    console.error('[review PUT] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
