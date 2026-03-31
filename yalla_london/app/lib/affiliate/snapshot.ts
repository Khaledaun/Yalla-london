/**
 * Affiliate Injection Snapshot Service
 *
 * Saves content_en / content_ar before affiliate links are injected,
 * enabling 24-hour rollback capability.
 *
 * Storage: AuditLog table with action = "AFFILIATE_SNAPSHOT"
 * Expiry: 24 hours (enforced on list/restore queries)
 */

const SNAPSHOT_ACTION = "AFFILIATE_SNAPSHOT";
const SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SnapshotRecord {
  id: string;
  postId: string;
  slug: string;
  titleEn: string;
  partnersInjected: string[];
  cronRunId?: string;
  createdAt: Date;
  expiresAt: Date;
  expired: boolean;
}

interface SnapshotDetails {
  postId: string;
  slug: string;
  titleEn: string;
  contentEn: string;
  contentAr: string;
  partnersInjected: string[];
  expiresAt: string; // ISO date
  cronRunId?: string;
}

/**
 * Create a snapshot of a BlogPost's content before affiliate injection.
 * Called by the affiliate-injection cron BEFORE modifying content.
 */
export async function createSnapshot(
  postId: string,
  slug: string,
  titleEn: string,
  contentEn: string,
  contentAr: string,
  partnersInjected: string[],
  cronRunId?: string
): Promise<string | null> {
  try {
    const { prisma } = await import("@/lib/db");
    const expiresAt = new Date(Date.now() + SNAPSHOT_TTL_MS);

    const entry = await prisma.auditLog.create({
      data: {
        action: SNAPSHOT_ACTION,
        details: {
          postId,
          slug,
          titleEn,
          contentEn,
          contentAr,
          partnersInjected,
          expiresAt: expiresAt.toISOString(),
          cronRunId: cronRunId || null,
        } satisfies SnapshotDetails,
        userId: "system",
      },
    });
    return entry.id;
  } catch (err) {
    console.warn("[affiliate-snapshot] Failed to create snapshot:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * List non-expired snapshots, newest first.
 */
export async function listSnapshots(siteId?: string, limit = 50): Promise<SnapshotRecord[]> {
  try {
    const { prisma } = await import("@/lib/db");
    const cutoff = new Date(Date.now() - SNAPSHOT_TTL_MS);

    const entries = await prisma.auditLog.findMany({
      where: {
        action: SNAPSHOT_ACTION,
        timestamp: { gte: cutoff },
      },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    const now = Date.now();
    const records: SnapshotRecord[] = [];

    for (const e of entries) {
      const d = e.details as unknown as SnapshotDetails | null;
      if (!d || !d.postId) continue;

      // If siteId filter provided, check the post belongs to that site
      if (siteId) {
        const post = await prisma.blogPost.findUnique({
          where: { id: d.postId },
          select: { siteId: true },
        });
        if (post && post.siteId !== siteId) continue;
      }

      const expiresAt = new Date(d.expiresAt);
      records.push({
        id: e.id,
        postId: d.postId,
        slug: d.slug,
        titleEn: d.titleEn,
        partnersInjected: d.partnersInjected || [],
        cronRunId: d.cronRunId || undefined,
        createdAt: e.timestamp,
        expiresAt,
        expired: now > expiresAt.getTime(),
      });
    }

    return records;
  } catch (err) {
    console.warn("[affiliate-snapshot] Failed to list snapshots:", err instanceof Error ? err.message : String(err));
    return [];
  }
}

/**
 * Restore a BlogPost from a snapshot (undo affiliate injection).
 * Returns the restored post slug on success, null on failure.
 */
export async function restoreSnapshot(snapshotId: string): Promise<{ success: boolean; slug?: string; error?: string }> {
  try {
    const { prisma } = await import("@/lib/db");

    const entry = await prisma.auditLog.findUnique({ where: { id: snapshotId } });
    if (!entry || entry.action !== SNAPSHOT_ACTION) {
      return { success: false, error: "Snapshot not found" };
    }

    const d = entry.details as unknown as SnapshotDetails | null;
    if (!d || !d.postId) {
      return { success: false, error: "Snapshot data corrupt" };
    }

    // Check expiry
    const expiresAt = new Date(d.expiresAt);
    if (Date.now() > expiresAt.getTime()) {
      return { success: false, error: "Snapshot expired (24h window passed)" };
    }

    // Verify post still exists
    const post = await prisma.blogPost.findUnique({
      where: { id: d.postId },
      select: { id: true, slug: true },
    });
    if (!post) {
      return { success: false, error: "BlogPost no longer exists" };
    }

    // Restore content
    await prisma.blogPost.update({
      where: { id: d.postId },
      data: {
        content_en: d.contentEn,
        content_ar: d.contentAr,
      },
    });

    // Log the rollback
    await prisma.auditLog.create({
      data: {
        action: "AFFILIATE_ROLLBACK",
        details: {
          snapshotId,
          postId: d.postId,
          slug: d.slug,
          partnersRemoved: d.partnersInjected,
          restoredAt: new Date().toISOString(),
        },
        userId: "admin",
      },
    });

    return { success: true, slug: d.slug };
  } catch (err) {
    console.warn("[affiliate-snapshot] Rollback failed:", err instanceof Error ? err.message : String(err));
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Restore ALL non-expired snapshots from a specific cron run.
 * Used for bulk undo of an entire injection batch.
 */
export async function restoreCronRunSnapshots(cronRunId: string): Promise<{ restored: number; failed: number; errors: string[] }> {
  try {
    const { prisma } = await import("@/lib/db");
    const cutoff = new Date(Date.now() - SNAPSHOT_TTL_MS);

    const entries = await prisma.auditLog.findMany({
      where: {
        action: SNAPSHOT_ACTION,
        timestamp: { gte: cutoff },
      },
      orderBy: { timestamp: "desc" },
    });

    let restored = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const e of entries) {
      const d = e.details as unknown as SnapshotDetails | null;
      if (!d || d.cronRunId !== cronRunId) continue;

      const result = await restoreSnapshot(e.id);
      if (result.success) {
        restored++;
      } else {
        failed++;
        errors.push(`${d.slug}: ${result.error}`);
      }
    }

    return { restored, failed, errors };
  } catch (err) {
    console.warn("[affiliate-snapshot] Bulk rollback failed:", err instanceof Error ? err.message : String(err));
    return { restored: 0, failed: 0, errors: [err instanceof Error ? err.message : "Unknown error"] };
  }
}

/**
 * Clean up expired snapshots. Called by content-auto-fix or manually.
 */
export async function cleanExpiredSnapshots(): Promise<number> {
  try {
    const { prisma } = await import("@/lib/db");
    const cutoff = new Date(Date.now() - SNAPSHOT_TTL_MS);

    const result = await prisma.auditLog.deleteMany({
      where: {
        action: SNAPSHOT_ACTION,
        timestamp: { lt: cutoff },
      },
    });

    return result.count;
  } catch (err) {
    console.warn("[affiliate-snapshot] Cleanup failed:", err instanceof Error ? err.message : String(err));
    return 0;
  }
}
