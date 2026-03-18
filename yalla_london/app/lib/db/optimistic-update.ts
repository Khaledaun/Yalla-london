/**
 * Optimistic Concurrency Control for BlogPost writes.
 *
 * Problem: Multiple crons (seo-agent, content-auto-fix, affiliate-injection, etc.)
 * update the same BlogPost concurrently. Without version checking, later writes
 * silently overwrite earlier writes — losing content changes, affiliate links,
 * meta optimizations, etc.
 *
 * Solution: Read the BlogPost, compute changes, then update with an `updated_at`
 * guard in the WHERE clause. If another process updated the row between our read
 * and write, 0 rows are affected and we retry with fresh data.
 *
 * Usage:
 *   await optimisticBlogPostUpdate(postId, (post) => ({
 *     content_en: post.content_en + appendedHtml,
 *   }));
 */

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

// Use a generic record type for the post — Prisma v6 doesn't directly export model types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlogPostRecord = Record<string, any>;
type UpdaterFn = (post: BlogPostRecord) => Record<string, unknown> | null;

/**
 * Optimistic concurrency update for BlogPost.
 *
 * @param id - BlogPost ID
 * @param updater - Function that receives current post and returns update data (or null to skip)
 * @param options - Optional: tag for logging, custom prisma client
 * @returns The updated BlogPost, or null if updater returned null / post not found
 */
export async function optimisticBlogPostUpdate(
  id: string,
  updater: UpdaterFn,
  options?: { tag?: string }
): Promise<BlogPostRecord | null> {
  const { prisma } = await import("@/lib/db");
  const tag = options?.tag || "[optimistic-update]";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // 1. Read current state
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      console.warn(`${tag} BlogPost ${id} not found`);
      return null;
    }

    // 2. Compute changes
    const changes = updater(post);
    if (!changes || Object.keys(changes).length === 0) {
      return post; // Nothing to update
    }

    // 3. Attempt update with optimistic concurrency guard
    // Use updateMany with updated_at check — returns count instead of throwing
    try {
      const result = await prisma.blogPost.updateMany({
        where: {
          id,
          updated_at: post.updated_at, // Optimistic lock: only update if unchanged
        },
        data: {
          ...changes,
          updated_at: new Date(),
        },
      });

      if (result.count > 0) {
        // Success — fetch and return updated post
        return await prisma.blogPost.findUnique({ where: { id } });
      }

      // 0 rows updated — stale read, another process updated first
      if (attempt < MAX_RETRIES) {
        console.warn(
          `${tag} Stale write on BlogPost ${id} (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying...`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
      }
    } catch (err) {
      console.warn(
        `${tag} Update error on BlogPost ${id}:`,
        err instanceof Error ? err.message : String(err)
      );
      if (attempt >= MAX_RETRIES) throw err;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
    }
  }

  console.warn(`${tag} Failed to update BlogPost ${id} after ${MAX_RETRIES + 1} attempts (concurrent writes)`);
  return null;
}
