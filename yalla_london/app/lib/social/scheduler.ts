/**
 * Social Media Post Scheduler & Publish Assistant
 *
 * Manages the lifecycle of scheduled social media content:
 * query, publish, reschedule, and mark-as-published.
 *
 * Works against the ScheduledContent Prisma model.
 * Import prisma from @/lib/db (canonical import path).
 *
 * Actual auto-publishing is only supported for Twitter/X when
 * twitter-api-v2 credentials are configured. All other platforms
 * require manual copy-paste — the scheduler tracks status and
 * surfaces them to the dashboard for Khaled to act on.
 */

// ─── Types ──────────────────────────────────────────────────────

export interface ScheduledPost {
  id: string;
  title: string;
  content: string;
  contentType: string;
  language: string;
  category: string | null;
  tags: string[];
  metadata: Record<string, unknown> | null;
  scheduledTime: Date;
  publishedTime: Date | null;
  status: string;
  platform: string | null;
  published: boolean;
  siteId: string | null;
  seoScore: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublishResult {
  success: boolean;
  error?: string;
  postUrl?: string;
}

// ─── Internal Helpers ───────────────────────────────────────────

/** Map a raw Prisma ScheduledContent row to our ScheduledPost interface. */
function mapToScheduledPost(row: Record<string, unknown>): ScheduledPost {
  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    contentType: row.content_type as string,
    language: row.language as string,
    category: (row.category as string) ?? null,
    tags: (row.tags as string[]) ?? [],
    metadata: (row.metadata as Record<string, unknown>) ?? null,
    scheduledTime: row.scheduled_time as Date,
    publishedTime: (row.published_time as Date) ?? null,
    status: row.status as string,
    platform: (row.platform as string) ?? null,
    published: (row.published as boolean) ?? false,
    siteId: (row.site_id as string) ?? null,
    seoScore: (row.seo_score as number) ?? null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

async function getPrisma() {
  const { prisma } = await import("@/lib/db");
  return prisma;
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Get scheduled posts filtered by site and optional parameters.
 * Results are ordered by scheduled_time ascending (next-to-publish first).
 */
export async function getScheduledPosts(
  site: string,
  options?: {
    from?: Date;
    to?: Date;
    platform?: string;
    status?: string;
  },
): Promise<ScheduledPost[]> {
  const prisma = await getPrisma();

  // Build the where clause dynamically
  const where: Record<string, unknown> = {
    site_id: site,
  };

  // Date range filter on scheduled_time
  if (options?.from || options?.to) {
    const scheduledTimeFilter: Record<string, Date> = {};
    if (options.from) scheduledTimeFilter.gte = options.from;
    if (options.to) scheduledTimeFilter.lte = options.to;
    where.scheduled_time = scheduledTimeFilter;
  }

  // Platform filter (instagram, tiktok, twitter, blog, etc.)
  if (options?.platform) {
    where.platform = options.platform;
  }

  // Status filter (pending, published, failed, cancelled)
  if (options?.status) {
    where.status = options.status;
  }

  const rows = await prisma.scheduledContent.findMany({
    where,
    orderBy: { scheduled_time: "asc" },
  });

  return rows.map((row: Record<string, unknown>) => mapToScheduledPost(row));
}

/**
 * Attempt to publish a post.
 *
 * - Twitter/X: auto-publishes via twitter-api-v2 when TWITTER_API_KEY,
 *   TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET are set.
 * - All other platforms: returns a structured "manual publish required" result
 *   so the dashboard can prompt Khaled to copy/paste.
 */
export async function publishPost(postId: string): Promise<PublishResult> {
  const prisma = await getPrisma();

  const post = await prisma.scheduledContent.findUnique({
    where: { id: postId },
  });

  if (!post) {
    return { success: false, error: "Post not found" };
  }

  if (post.status === "published" || post.published) {
    return { success: false, error: "Post is already published" };
  }

  if (post.status === "cancelled") {
    return { success: false, error: "Post has been cancelled" };
  }

  const platform = (post.platform || "").toLowerCase();

  // ── Twitter/X auto-publish ──────────────────────────────────
  if (platform === "twitter" || platform === "x") {
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET || process.env.TWITTER_ACCESS_SECRET;

    if (apiKey && apiSecret && accessToken && accessSecret) {
      try {
        // Dynamic import — twitter-api-v2 is an optional peer dependency.
        const { TwitterApi } = require("twitter-api-v2") as { TwitterApi: new (opts: { appKey: string; appSecret: string; accessToken: string; accessSecret: string }) => { v2: { tweet: (text: string) => Promise<{ data: { id: string } }> } } };
        const client = new TwitterApi({
          appKey: apiKey,
          appSecret: apiSecret,
          accessToken,
          accessSecret,
        });

        const tweet = await client.v2.tweet(post.content);
        const tweetUrl = `https://twitter.com/i/status/${tweet.data.id}`;

        await prisma.scheduledContent.update({
          where: { id: postId },
          data: {
            status: "published",
            published: true,
            published_time: new Date(),
            metadata: {
              ...(typeof post.metadata === "object" && post.metadata !== null
                ? post.metadata
                : {}),
              tweet_id: tweet.data.id,
              post_url: tweetUrl,
            },
          },
        });

        return { success: true, postUrl: tweetUrl };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown Twitter API error";
        console.warn(`[social-scheduler] Twitter publish failed for post ${postId}: ${message}`);

        await prisma.scheduledContent.update({
          where: { id: postId },
          data: {
            status: "failed",
            metadata: {
              ...(typeof post.metadata === "object" && post.metadata !== null
                ? post.metadata
                : {}),
              last_publish_error: message,
              last_publish_attempt: new Date().toISOString(),
            },
          },
        });

        return { success: false, error: `Twitter API error: ${message}` };
      }
    }

    return {
      success: false,
      error: "Twitter API credentials not configured. Set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, and TWITTER_ACCESS_TOKEN_SECRET environment variables.",
    };
  }

  // ── All other platforms — manual publish required ────────────
  return {
    success: false,
    error: `Manual publish required for ${platform || "unknown platform"}. Copy the post text and any images, then use markAsPublished() after posting.`,
  };
}

/**
 * Mark a post as published (after manual publishing on a platform).
 * Optionally store the public URL of the published post.
 */
export async function markAsPublished(
  postId: string,
  postUrl?: string,
): Promise<void> {
  const prisma = await getPrisma();

  const post = await prisma.scheduledContent.findUnique({
    where: { id: postId },
  });

  if (!post) {
    throw new Error(`Post not found: ${postId}`);
  }

  const metadataUpdate: Record<string, unknown> = {
    ...(typeof post.metadata === "object" && post.metadata !== null
      ? post.metadata
      : {}),
    manually_published: true,
    published_at_utc: new Date().toISOString(),
  };

  if (postUrl) {
    metadataUpdate.post_url = postUrl;
  }

  await prisma.scheduledContent.update({
    where: { id: postId },
    data: {
      status: "published",
      published: true,
      published_time: new Date(),
      metadata: metadataUpdate,
    },
  });
}

/**
 * Reschedule a post to a new date/time.
 * Only works for posts that are still pending (not published or cancelled).
 */
export async function reschedulePost(
  postId: string,
  newDate: Date,
): Promise<void> {
  const prisma = await getPrisma();

  const post = await prisma.scheduledContent.findUnique({
    where: { id: postId },
  });

  if (!post) {
    throw new Error(`Post not found: ${postId}`);
  }

  if (post.status === "published" || post.published) {
    throw new Error("Cannot reschedule a published post");
  }

  if (post.status === "cancelled") {
    throw new Error("Cannot reschedule a cancelled post");
  }

  await prisma.scheduledContent.update({
    where: { id: postId },
    data: {
      scheduled_time: newDate,
      metadata: {
        ...(typeof post.metadata === "object" && post.metadata !== null
          ? post.metadata
          : {}),
        rescheduled_from: post.scheduled_time.toISOString(),
        rescheduled_at: new Date().toISOString(),
      },
    },
  });
}

/**
 * Get posts that are due for publishing right now.
 * Returns posts where scheduled_time <= now AND status = 'pending'.
 * Used by cron jobs to identify posts that need publishing.
 */
export async function getPostsDueNow(site: string): Promise<ScheduledPost[]> {
  const prisma = await getPrisma();

  const rows = await prisma.scheduledContent.findMany({
    where: {
      site_id: site,
      status: "pending",
      published: false,
      scheduled_time: {
        lte: new Date(),
      },
    },
    orderBy: { scheduled_time: "asc" },
  });

  return rows.map((row: Record<string, unknown>) => mapToScheduledPost(row));
}
