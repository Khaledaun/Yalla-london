/**
 * Content Versioning API
 *
 * Tracks version history for blog posts with diff view capability.
 * Stores snapshots in the AuditLog table (resource = "BlogPost", action = "content_version").
 *
 * GET  /api/admin/content/versions?post_id=X          — List version history
 * POST /api/admin/content/versions                     — Create a new version snapshot
 * PUT  /api/admin/content/versions                     — Restore a previous version
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/admin-middleware';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const CreateVersionSchema = z.object({
  post_id: z.string().min(1),
  change_summary: z.string().max(500).optional(),
  author_id: z.string().optional(),
});

const RestoreVersionSchema = z.object({
  post_id: z.string().min(1),
  version_id: z.string().min(1),
  author_id: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContentSnapshot {
  title_en: string;
  title_ar: string;
  content_en: string;
  content_ar: string;
  excerpt_en: string | null;
  excerpt_ar: string | null;
  meta_title_en: string | null;
  meta_title_ar: string | null;
  meta_description_en: string | null;
  meta_description_ar: string | null;
  tags: string[];
  category_id: string;
  featured_image: string | null;
  published: boolean;
  seo_score: number | null;
}

interface VersionEntry {
  version_id: string;
  version_number: number;
  created_at: string;
  author_id?: string;
  change_summary?: string;
  snapshot: ContentSnapshot;
  diff?: {
    field: string;
    old_value: string;
    new_value: string;
  }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function snapshotPost(post: any): ContentSnapshot {
  return {
    title_en: post.title_en,
    title_ar: post.title_ar,
    content_en: post.content_en,
    content_ar: post.content_ar,
    excerpt_en: post.excerpt_en,
    excerpt_ar: post.excerpt_ar,
    meta_title_en: post.meta_title_en,
    meta_title_ar: post.meta_title_ar,
    meta_description_en: post.meta_description_en,
    meta_description_ar: post.meta_description_ar,
    tags: post.tags || [],
    category_id: post.category_id,
    featured_image: post.featured_image,
    published: post.published,
    seo_score: post.seo_score,
  };
}

/**
 * Compute a simple diff between two snapshots.
 * Returns array of fields that changed with old/new values.
 */
function computeDiff(
  oldSnap: ContentSnapshot,
  newSnap: ContentSnapshot,
): Array<{ field: string; old_value: string; new_value: string }> {
  const diffs: Array<{ field: string; old_value: string; new_value: string }> = [];

  const fields = [
    'title_en', 'title_ar', 'content_en', 'content_ar',
    'excerpt_en', 'excerpt_ar', 'meta_title_en', 'meta_title_ar',
    'meta_description_en', 'meta_description_ar', 'category_id',
    'featured_image', 'published', 'seo_score',
  ] as const;

  for (const field of fields) {
    const oldVal = String(oldSnap[field] ?? '');
    const newVal = String(newSnap[field] ?? '');

    if (oldVal !== newVal) {
      // Truncate long content fields for the diff summary
      const maxLen = 200;
      diffs.push({
        field,
        old_value: oldVal.length > maxLen ? oldVal.substring(0, maxLen) + '...' : oldVal,
        new_value: newVal.length > maxLen ? newVal.substring(0, maxLen) + '...' : newVal,
      });
    }
  }

  // Tags comparison
  const oldTags = JSON.stringify(oldSnap.tags || []);
  const newTags = JSON.stringify(newSnap.tags || []);
  if (oldTags !== newTags) {
    diffs.push({
      field: 'tags',
      old_value: oldTags,
      new_value: newTags,
    });
  }

  return diffs;
}

// ---------------------------------------------------------------------------
// GET — List version history for a post
// ---------------------------------------------------------------------------

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('post_id');

    if (!postId) {
      return NextResponse.json(
        { error: 'post_id query parameter is required' },
        { status: 400 },
      );
    }

    // Fetch version entries from audit log
    const versionLogs = await prisma.auditLog.findMany({
      where: {
        resource: 'BlogPost',
        resourceId: postId,
        action: 'content_version',
      },
      orderBy: { timestamp: 'desc' },
      take: 50, // Max 50 versions
    });

    const versions: VersionEntry[] = versionLogs.map((log, index) => {
      const details = log.details as any || {};
      return {
        version_id: log.id,
        version_number: versionLogs.length - index,
        created_at: log.timestamp.toISOString(),
        author_id: details.author_id,
        change_summary: details.change_summary,
        snapshot: details.snapshot || {},
        diff: details.diff,
      };
    });

    return NextResponse.json({
      success: true,
      post_id: postId,
      versions,
      total: versions.length,
    });
  } catch (error) {
    console.error('Failed to fetch version history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch version history' },
      { status: 500 },
    );
  }
});

// ---------------------------------------------------------------------------
// POST — Create a new version snapshot
// ---------------------------------------------------------------------------

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validation = CreateVersionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid version data', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { post_id, change_summary, author_id } = validation.data;

    // Fetch current post state
    const post = await prisma.blogPost.findUnique({
      where: { id: post_id },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const currentSnapshot = snapshotPost(post);

    // Get the previous version to compute diff
    const previousVersionLog = await prisma.auditLog.findFirst({
      where: {
        resource: 'BlogPost',
        resourceId: post_id,
        action: 'content_version',
      },
      orderBy: { timestamp: 'desc' },
    });

    let diff: Array<{ field: string; old_value: string; new_value: string }> = [];
    if (previousVersionLog) {
      const prevSnapshot = (previousVersionLog.details as any)?.snapshot;
      if (prevSnapshot) {
        diff = computeDiff(prevSnapshot, currentSnapshot);
      }
    }

    // Get version number
    const versionCount = await prisma.auditLog.count({
      where: {
        resource: 'BlogPost',
        resourceId: post_id,
        action: 'content_version',
      },
    });

    // Create version entry in audit log
    const versionEntry = await prisma.auditLog.create({
      data: {
        action: 'content_version',
        resource: 'BlogPost',
        resourceId: post_id,
        details: {
          version_number: versionCount + 1,
          snapshot: currentSnapshot,
          diff,
          change_summary: change_summary || `Version ${versionCount + 1}`,
          author_id,
          created_at: new Date().toISOString(),
        },
        success: true,
      },
    });

    return NextResponse.json({
      success: true,
      version_id: versionEntry.id,
      version_number: versionCount + 1,
      diff_count: diff.length,
      change_summary: change_summary || `Version ${versionCount + 1}`,
    });
  } catch (error) {
    console.error('Failed to create version:', error);
    return NextResponse.json(
      { error: 'Failed to create version' },
      { status: 500 },
    );
  }
});

// ---------------------------------------------------------------------------
// PUT — Restore a previous version
// ---------------------------------------------------------------------------

export const PUT = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validation = RestoreVersionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid restore data', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { post_id, version_id, author_id } = validation.data;

    // Fetch the version to restore
    const versionLog = await prisma.auditLog.findUnique({
      where: { id: version_id },
    });

    if (!versionLog || versionLog.resourceId !== post_id || versionLog.action !== 'content_version') {
      return NextResponse.json(
        { error: 'Version not found or does not belong to this post' },
        { status: 404 },
      );
    }

    const snapshot = (versionLog.details as any)?.snapshot as ContentSnapshot;
    if (!snapshot) {
      return NextResponse.json(
        { error: 'Version snapshot is empty or corrupt' },
        { status: 400 },
      );
    }

    // First, save current state as a new version (before restoring)
    const currentPost = await prisma.blogPost.findUnique({
      where: { id: post_id },
    });

    if (!currentPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const currentSnapshot = snapshotPost(currentPost);

    // Save pre-restore version
    const preRestoreCount = await prisma.auditLog.count({
      where: {
        resource: 'BlogPost',
        resourceId: post_id,
        action: 'content_version',
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'content_version',
        resource: 'BlogPost',
        resourceId: post_id,
        details: {
          version_number: preRestoreCount + 1,
          snapshot: currentSnapshot,
          change_summary: `Auto-saved before restore to version ${(versionLog.details as any)?.version_number}`,
          author_id,
          created_at: new Date().toISOString(),
        },
        success: true,
      },
    });

    // Restore the old version
    await prisma.blogPost.update({
      where: { id: post_id },
      data: {
        title_en: snapshot.title_en,
        title_ar: snapshot.title_ar,
        content_en: snapshot.content_en,
        content_ar: snapshot.content_ar,
        excerpt_en: snapshot.excerpt_en,
        excerpt_ar: snapshot.excerpt_ar,
        meta_title_en: snapshot.meta_title_en,
        meta_title_ar: snapshot.meta_title_ar,
        meta_description_en: snapshot.meta_description_en,
        meta_description_ar: snapshot.meta_description_ar,
        tags: snapshot.tags,
        category_id: snapshot.category_id,
        featured_image: snapshot.featured_image,
        updated_at: new Date(),
      },
    });

    // Log the restore action
    await prisma.auditLog.create({
      data: {
        action: 'content_restore',
        resource: 'BlogPost',
        resourceId: post_id,
        details: {
          restored_version_id: version_id,
          restored_version_number: (versionLog.details as any)?.version_number,
          author_id,
        },
        success: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Post restored to version ${(versionLog.details as any)?.version_number}`,
      post_id,
      restored_version_id: version_id,
    });
  } catch (error) {
    console.error('Failed to restore version:', error);
    return NextResponse.json(
      { error: 'Failed to restore version' },
      { status: 500 },
    );
  }
});
