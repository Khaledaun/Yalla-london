/**
 * Admin Bulk Content Operations API
 * Handles bulk updates on blog posts (publish, unpublish, delete, tag/category management)
 */
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { withAdminAuth } from '@/lib/admin-middleware';
import { z } from 'zod';

// Validation schema for bulk operation requests
const BulkActionSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, 'At least one post ID is required')
    .max(100, 'Cannot process more than 100 posts at once'),
  action: z.enum(['publish', 'unpublish', 'delete', 'addTag', 'removeTag', 'setCategory']),
  value: z.string().optional(),
});

/**
 * Log a bulk action to the AuditLog table.
 */
async function logBulkAction(
  action: string,
  ids: string[],
  details: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: `bulk_${action}`,
        resource: 'BlogPost',
        resourceId: ids.join(','),
        details: {
          postIds: ids,
          affectedCount: ids.length,
          ...details,
        },
        success: true,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log for bulk action:', error);
  }
}

// BULK UPDATE - Multiple blog posts
export const PUT = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();

    // Validate input
    const validation = BulkActionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid bulk action data',
          details: validation.error.issues,
        },
        { status: 400 },
      );
    }

    const { ids, action, value } = validation.data;

    let affected = 0;

    switch (action) {
      case 'publish': {
        const result = await prisma.blogPost.updateMany({
          where: { id: { in: ids } },
          data: { published: true, updated_at: new Date() },
        });
        affected = result.count;
        break;
      }

      case 'unpublish': {
        const result = await prisma.blogPost.updateMany({
          where: { id: { in: ids } },
          data: { published: false, updated_at: new Date() },
        });
        affected = result.count;
        break;
      }

      case 'delete': {
        const result = await prisma.blogPost.updateMany({
          where: { id: { in: ids } },
          data: { deletedAt: new Date(), updated_at: new Date() },
        });
        affected = result.count;
        break;
      }

      case 'addTag': {
        if (!value) {
          return NextResponse.json(
            { error: 'A "value" (tag name) is required for addTag action' },
            { status: 400 },
          );
        }

        // Fetch posts that do not already contain this tag, then push the tag
        // Using raw SQL with PostgreSQL array_append for atomic update
        const addResult = await prisma.$executeRaw`
          UPDATE "BlogPost"
          SET "tags" = array_append("tags", ${value}),
              "updated_at" = NOW()
          WHERE "id" = ANY(${ids})
            AND NOT (${value} = ANY("tags"))
        `;
        affected = addResult;
        break;
      }

      case 'removeTag': {
        if (!value) {
          return NextResponse.json(
            { error: 'A "value" (tag name) is required for removeTag action' },
            { status: 400 },
          );
        }

        // Remove the specified tag from all matching posts using array_remove
        const removeResult = await prisma.$executeRaw`
          UPDATE "BlogPost"
          SET "tags" = array_remove("tags", ${value}),
              "updated_at" = NOW()
          WHERE "id" = ANY(${ids})
        `;
        affected = removeResult;
        break;
      }

      case 'setCategory': {
        if (!value) {
          return NextResponse.json(
            { error: 'A "value" (category ID) is required for setCategory action' },
            { status: 400 },
          );
        }

        // Validate that the category exists
        const category = await prisma.category.findUnique({
          where: { id: value },
          select: { id: true },
        });

        if (!category) {
          return NextResponse.json(
            { error: 'Category not found' },
            { status: 404 },
          );
        }

        const result = await prisma.blogPost.updateMany({
          where: { id: { in: ids } },
          data: { category_id: value, updated_at: new Date() },
        });
        affected = result.count;
        break;
      }

      default: {
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
      }
    }

    // Log the bulk action to AuditLog
    await logBulkAction(action, ids, { value, affected });

    return NextResponse.json({
      success: true,
      affected,
      action,
    });
  } catch (error) {
    console.error('Bulk content operation failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to perform bulk operation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
});
