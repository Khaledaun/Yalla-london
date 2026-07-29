/**
 * Social Tool Handlers — wraps social scheduling for CEO Agent.
 *
 * Tools: publish_to_social, get_social_status
 */

import type { ToolContext, ToolResult } from "../types";

// ---------------------------------------------------------------------------
// Publish to social — routes through Post Bridge → Twitter → manual fallback
// ---------------------------------------------------------------------------

export async function publishToSocial(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const platform = (params.platform as string || "").toLowerCase();
  const content = params.content as string;
  const scheduledTime = params.scheduledTime as string | undefined;

  if (!platform) {
    return { success: false, error: "Missing required parameter: platform" };
  }
  if (!content) {
    return { success: false, error: "Missing required parameter: content" };
  }

  const { prisma } = await import("@/lib/db");
  const { getDefaultSiteId } = await import("@/config/sites");

  const siteId = (params.siteId as string) || ctx.siteId || getDefaultSiteId();

  // Create a ScheduledContent record
  const scheduled = await prisma.scheduledContent.create({
    data: {
      title: (params.title as string) || content.slice(0, 80),
      content,
      content_type: "social",
      language: (params.language as string) || "en",
      platform,
      status: scheduledTime ? "pending" : "pending",
      scheduled_time: scheduledTime ? new Date(scheduledTime) : new Date(),
      site_id: siteId,
    },
  });

  // If no scheduled time (publish now), attempt immediate publish
  if (!scheduledTime) {
    const { publishPost } = await import("@/lib/social/scheduler");
    const result = await publishPost(scheduled.id);

    return {
      success: result.success,
      data: {
        postId: scheduled.id,
        platform,
        published: result.success,
        postUrl: result.postUrl,
        error: result.error,
      },
      summary: result.success
        ? `Published to ${platform}: ${result.postUrl}`
        : `Failed to publish to ${platform}: ${result.error}`,
    };
  }

  return {
    success: true,
    data: {
      postId: scheduled.id,
      platform,
      scheduledTime,
      status: "scheduled",
    },
    summary: `Scheduled ${platform} post for ${scheduledTime}.`,
  };
}

// ---------------------------------------------------------------------------
// Social status query
// ---------------------------------------------------------------------------

export async function getSocialStatus(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const { prisma } = await import("@/lib/db");
  const { getDefaultSiteId } = await import("@/config/sites");

  const siteId = (params.siteId as string) || ctx.siteId || getDefaultSiteId();
  const platform = params.platform as string | undefined;

  const where: Record<string, unknown> = {
    site_id: siteId,
    platform: platform ? { not: "blog" } : { not: "blog" },
  };
  if (platform) where.platform = platform;

  const [pending, published, failed] = await Promise.all([
    prisma.scheduledContent.count({ where: { ...where, status: "pending" } }),
    prisma.scheduledContent.count({ where: { ...where, status: "published" } }),
    prisma.scheduledContent.count({ where: { ...where, status: "failed" } }),
  ]);

  // Check Post Bridge connectivity
  const { isPostBridgeConfigured, getPostBridgeClient } = await import(
    "@/lib/integrations/post-bridge-client"
  );
  let postBridgePlatforms: string[] = [];
  if (isPostBridgeConfigured()) {
    const pbClient = getPostBridgeClient();
    if (pbClient) {
      try {
        const accounts = await pbClient.getAccounts();
        postBridgePlatforms = accounts
          .filter((a) => a.connected)
          .map((a) => a.platform);
      } catch {
        // Post Bridge unavailable — continue without it
      }
    }
  }

  const twitterConfigured = !!(
    process.env.TWITTER_API_KEY &&
    process.env.TWITTER_API_SECRET &&
    process.env.TWITTER_ACCESS_TOKEN &&
    (process.env.TWITTER_ACCESS_TOKEN_SECRET || process.env.TWITTER_ACCESS_SECRET)
  );

  return {
    success: true,
    data: {
      pending,
      published,
      failed,
      postBridgeConfigured: isPostBridgeConfigured(),
      postBridgePlatforms,
      twitterConfigured,
    },
    summary: `Social: ${pending} pending, ${published} published, ${failed} failed. Post Bridge: ${postBridgePlatforms.length} platforms. Twitter: ${twitterConfigured ? "yes" : "no"}.`,
  };
}
