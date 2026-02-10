/**
 * Content Approval Workflow API
 *
 * Multi-step content approval with reviewer assignment, status tracking,
 * and feedback. Supports the following workflow:
 *
 *   draft → pending_review → approved → published
 *                          → changes_requested → pending_review (loop)
 *                          → rejected
 *
 * GET    /api/admin/content/approval         — List posts by approval status
 * POST   /api/admin/content/approval         — Submit post for review
 * PUT    /api/admin/content/approval         — Approve, reject, or request changes
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Types & validation
// ---------------------------------------------------------------------------

const APPROVAL_STATUSES = [
  'draft',
  'pending_review',
  'approved',
  'changes_requested',
  'rejected',
  'published',
] as const;

type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

const SubmitForReviewSchema = z.object({
  post_id: z.string().min(1),
  reviewer_id: z.string().min(1).optional(),
  notes: z.string().max(2000).optional(),
});

const ReviewActionSchema = z.object({
  post_id: z.string().min(1),
  action: z.enum(['approve', 'reject', 'request_changes']),
  feedback: z.string().max(5000).optional(),
  reviewer_id: z.string().optional(),
});

const QuerySchema = z.object({
  status: z.string().optional(),
  reviewer_id: z.string().optional(),
  author_id: z.string().optional(),
  page: z
    .string()
    .transform((v) => parseInt(v, 10))
    .default('1'),
  limit: z
    .string()
    .transform((v) => Math.min(parseInt(v, 10), 100))
    .default('20'),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the approval metadata from a BlogPost's metadata JSON field.
 * We store approval workflow state in the `keywords_json` field's `_approval` key
 * to avoid schema changes. In a production system you'd add dedicated columns.
 */
function getApprovalMeta(post: any): {
  status: ApprovalStatus;
  reviewer_id?: string;
  submitted_at?: string;
  reviewed_at?: string;
  feedback?: string;
  history: Array<{ action: string; by?: string; at: string; note?: string }>;
} {
  const meta = (post.keywords_json as any)?._approval;
  return meta || { status: 'draft', history: [] };
}

function buildApprovalUpdate(
  existing: ReturnType<typeof getApprovalMeta>,
  update: Partial<ReturnType<typeof getApprovalMeta>> & { action?: string; by?: string; note?: string },
) {
  const history = [...(existing.history || [])];
  if (update.action) {
    history.push({
      action: update.action,
      by: update.by,
      at: new Date().toISOString(),
      note: update.note,
    });
  }

  return {
    ...existing,
    ...update,
    history,
  };
}

async function setApprovalMeta(
  postId: string,
  approval: ReturnType<typeof getApprovalMeta>,
) {
  // Read existing keywords_json to merge
  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: { keywords_json: true },
  });

  const existingKeywords = (post?.keywords_json as any) || {};

  await prisma.blogPost.update({
    where: { id: postId },
    data: {
      keywords_json: {
        ...existingKeywords,
        _approval: approval,
      },
      updated_at: new Date(),
    },
  });
}

async function logApprovalAction(
  action: string,
  postId: string,
  details: Record<string, unknown>,
) {
  try {
    await prisma.auditLog.create({
      data: {
        action: `content_${action}`,
        resource: 'BlogPost',
        resourceId: postId,
        details,
        success: true,
      },
    });
  } catch (err) {
    console.error('Failed to log approval action:', err);
  }
}

// ---------------------------------------------------------------------------
// GET — List posts by approval status
// ---------------------------------------------------------------------------

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const params = QuerySchema.safeParse(Object.fromEntries(searchParams.entries()));

    if (!params.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: params.error.issues },
        { status: 400 },
      );
    }

    const { status, reviewer_id, author_id, page, limit } = params.data;
    const offset = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = { deletedAt: null };

    if (author_id) {
      where.author_id = author_id;
    }

    // Fetch posts with approval data
    const [posts, totalCount] = await Promise.all([
      prisma.blogPost.findMany({
        where: where as any,
        select: {
          id: true,
          title_en: true,
          title_ar: true,
          slug: true,
          published: true,
          author_id: true,
          category_id: true,
          keywords_json: true,
          seo_score: true,
          created_at: true,
          updated_at: true,
          author: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name_en: true } },
        },
        orderBy: { updated_at: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.blogPost.count({ where: where as any }),
    ]);

    // Filter by approval status / reviewer in memory (since it's in JSON)
    let filtered = posts.map((post) => {
      const approval = getApprovalMeta(post);
      return {
        id: post.id,
        title_en: post.title_en,
        title_ar: post.title_ar,
        slug: post.slug,
        published: post.published,
        seo_score: post.seo_score,
        author: post.author,
        category: post.category,
        created_at: post.created_at,
        updated_at: post.updated_at,
        approval_status: approval.status,
        reviewer_id: approval.reviewer_id,
        submitted_at: approval.submitted_at,
        reviewed_at: approval.reviewed_at,
        feedback: approval.feedback,
        history: approval.history,
      };
    });

    if (status) {
      filtered = filtered.filter((p) => p.approval_status === status);
    }

    if (reviewer_id) {
      filtered = filtered.filter((p) => p.reviewer_id === reviewer_id);
    }

    // Count by status
    const allApprovals = posts.map((p) => getApprovalMeta(p));
    const statusCounts: Record<string, number> = {};
    for (const s of APPROVAL_STATUSES) {
      statusCounts[s] = allApprovals.filter((a) => a.status === s).length;
    }

    return NextResponse.json({
      success: true,
      posts: filtered,
      status_counts: statusCounts,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch approval queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approval queue' },
      { status: 500 },
    );
  }
});

// ---------------------------------------------------------------------------
// POST — Submit post for review
// ---------------------------------------------------------------------------

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validation = SubmitForReviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid submission data', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { post_id, reviewer_id, notes } = validation.data;

    // Verify post exists
    const post = await prisma.blogPost.findUnique({
      where: { id: post_id },
      select: { id: true, title_en: true, keywords_json: true, author_id: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const existing = getApprovalMeta(post);

    // Only allow submission from draft or changes_requested
    if (!['draft', 'changes_requested'].includes(existing.status)) {
      return NextResponse.json(
        { error: `Cannot submit for review: current status is "${existing.status}"` },
        { status: 400 },
      );
    }

    const updated = buildApprovalUpdate(existing, {
      status: 'pending_review',
      reviewer_id,
      submitted_at: new Date().toISOString(),
      reviewed_at: undefined,
      feedback: undefined,
      action: 'submit_for_review',
      by: post.author_id,
      note: notes,
    });

    await setApprovalMeta(post_id, updated);

    await logApprovalAction('submit_for_review', post_id, {
      reviewer_id,
      notes,
      title: post.title_en,
    });

    return NextResponse.json({
      success: true,
      message: 'Post submitted for review',
      post_id,
      approval_status: 'pending_review',
      reviewer_id,
    });
  } catch (error) {
    console.error('Failed to submit for review:', error);
    return NextResponse.json(
      { error: 'Failed to submit for review' },
      { status: 500 },
    );
  }
});

// ---------------------------------------------------------------------------
// PUT — Approve, reject, or request changes
// ---------------------------------------------------------------------------

export const PUT = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validation = ReviewActionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid review action', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { post_id, action, feedback, reviewer_id } = validation.data;

    // Verify post exists
    const post = await prisma.blogPost.findUnique({
      where: { id: post_id },
      select: { id: true, title_en: true, keywords_json: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const existing = getApprovalMeta(post);

    // Only allow review actions on pending_review posts
    if (existing.status !== 'pending_review') {
      return NextResponse.json(
        { error: `Cannot review: current status is "${existing.status}", expected "pending_review"` },
        { status: 400 },
      );
    }

    let newStatus: ApprovalStatus;
    switch (action) {
      case 'approve':
        newStatus = 'approved';
        break;
      case 'reject':
        newStatus = 'rejected';
        break;
      case 'request_changes':
        newStatus = 'changes_requested';
        break;
      default:
        return NextResponse.json({ error: 'Unknown review action' }, { status: 400 });
    }

    const updated = buildApprovalUpdate(existing, {
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      feedback: feedback || undefined,
      action,
      by: reviewer_id,
      note: feedback,
    });

    await setApprovalMeta(post_id, updated);

    await logApprovalAction(action, post_id, {
      reviewer_id,
      feedback,
      new_status: newStatus,
      title: post.title_en,
    });

    return NextResponse.json({
      success: true,
      message: `Post ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'sent back for changes'}`,
      post_id,
      approval_status: newStatus,
    });
  } catch (error) {
    console.error('Failed to process review:', error);
    return NextResponse.json(
      { error: 'Failed to process review' },
      { status: 500 },
    );
  }
});
