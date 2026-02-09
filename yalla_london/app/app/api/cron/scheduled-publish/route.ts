export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Scheduled Content Publishing Cron Job
 * Runs 2x daily at 9:00 AM and 4:00 PM UTC
 *
 * Finds blog posts with status='scheduled' and scheduled_at <= now,
 * then publishes them by setting published=true and status='published'.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!cronSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 503 },
    );
  }

  const now = new Date();
  const results: {
    id: string;
    title: string;
    slug: string;
    site_id: string;
  }[] = [];

  try {
    // Find all posts that are scheduled and due for publishing
    const duePosts = await prisma.blogPost.findMany({
      where: {
        status: "scheduled",
        published: false,
        scheduled_at: { lte: now },
        deletedAt: null,
      },
      select: {
        id: true,
        title_en: true,
        slug: true,
        site_id: true,
      },
    });

    // Publish each due post
    for (const post of duePosts) {
      try {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: {
            published: true,
            status: "published",
            updated_at: now,
          },
        });

        results.push({
          id: post.id,
          title: post.title_en || "Untitled",
          slug: post.slug,
          site_id: post.site_id || "unknown",
        });

        console.log(
          `[Scheduled Publish] Published: ${post.title_en} (${post.slug})`,
        );
      } catch (err) {
        console.error(`[Scheduled Publish] Failed to publish ${post.id}:`, err);
      }
    }

    // Submit newly published URLs to IndexNow
    if (results.length > 0) {
      try {
        const indexNowKey = process.env.INDEXNOW_KEY;
        if (indexNowKey) {
          for (const post of results) {
            const url = `https://yalla-london.com/blog/${post.slug}`;
            await fetch(
              `https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=${indexNowKey}`,
            ).catch(() => {});
          }
          console.log(
            `[Scheduled Publish] Submitted ${results.length} URLs to IndexNow`,
          );
        }
      } catch {
        // IndexNow is best-effort
      }
    }

    // Get next scheduled posts
    const nextScheduled = await prisma.blogPost.findMany({
      where: {
        status: "scheduled",
        published: false,
        scheduled_at: { gt: now },
        deletedAt: null,
      },
      select: { id: true, title_en: true, scheduled_at: true },
      orderBy: { scheduled_at: "asc" },
      take: 5,
    });

    console.log(
      `[Scheduled Publish] Published ${results.length} posts. ${nextScheduled.length} upcoming.`,
    );

    return NextResponse.json({
      success: true,
      executed_at: now.toISOString(),
      published_count: results.length,
      published: results,
      next_scheduled: nextScheduled.map((p) => ({
        id: p.id,
        title: p.title_en,
        scheduled_at: p.scheduled_at?.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[Scheduled Publish] Cron failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Publishing failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
