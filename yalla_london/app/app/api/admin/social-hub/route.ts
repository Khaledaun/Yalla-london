/**
 * Social Hub API — Unified endpoint for WhatsApp (Kapso) + Social Media (Post Bridge)
 *
 * GET:  Returns status of all integrations + recent activity
 * POST: Actions — send_whatsapp_test, sync_accounts, schedule_post, publish_now
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { isKapsoConfigured, getPhoneNumberId, isKapsoProxyEnabled } from "@/lib/integrations/kapso-client";
import { isPostBridgeConfigured, getPostBridgeClient } from "@/lib/integrations/post-bridge-client";
import { getDefaultSiteId } from "@/config/sites";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");
  const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();

  // --- WhatsApp Status ---
  const whatsappStatus = {
    configured: isKapsoConfigured(),
    proxyEnabled: isKapsoProxyEnabled(),
    phoneNumberId: isKapsoConfigured() ? getPhoneNumberId() : null,
    envVars: {
      WHATSAPP_ACCESS_TOKEN: !!process.env.WHATSAPP_ACCESS_TOKEN,
      WHATSAPP_PHONE_NUMBER_ID: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
      KAPSO_API_KEY: !!process.env.KAPSO_API_KEY,
      KAPSO_PROXY_ENABLED: process.env.KAPSO_PROXY_ENABLED === "true",
    },
  };

  // --- Post Bridge Status ---
  let postBridgeAccounts: unknown[] = [];
  const postBridgeStatus = {
    configured: isPostBridgeConfigured(),
    envVars: {
      POST_BRIDGE_API_KEY: !!process.env.POST_BRIDGE_API_KEY,
    },
    accountCount: 0,
  };

  if (isPostBridgeConfigured()) {
    try {
      const client = getPostBridgeClient();
      if (client) {
        postBridgeAccounts = await client.getAccounts();
        postBridgeStatus.accountCount = postBridgeAccounts.length;
      }
    } catch (err) {
      console.warn("[social-hub] Post Bridge accounts fetch failed:", err instanceof Error ? err.message : err);
    }
  }

  // --- Recent Social Activity ---
  let recentPosts: unknown[] = [];
  let upcomingPosts: unknown[] = [];
  try {
    [recentPosts, upcomingPosts] = await Promise.all([
      prisma.scheduledContent.findMany({
        where: { site_id: siteId, status: "published", platform: { not: "blog" } },
        orderBy: { published_time: "desc" },
        take: 10,
        select: { id: true, title: true, platform: true, published_time: true, status: true },
      }),
      prisma.scheduledContent.findMany({
        where: { site_id: siteId, status: "pending", platform: { not: "blog" } },
        orderBy: { scheduled_time: "asc" },
        take: 20,
        select: { id: true, title: true, platform: true, scheduled_time: true, status: true, content_type: true },
      }),
    ]);
  } catch (err) {
    console.warn("[social-hub] DB query failed:", err instanceof Error ? err.message : err);
  }

  // --- WhatsApp Recent Messages ---
  let recentConversations: unknown[] = [];
  try {
    recentConversations = await prisma.conversation.findMany({
      where: { channel: "whatsapp" },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, status: true, summary: true, sentiment: true, updatedAt: true },
    });
  } catch {
    // Conversation model may not exist yet
  }

  return NextResponse.json({
    whatsapp: { ...whatsappStatus, recentConversations },
    postBridge: { ...postBridgeStatus, accounts: postBridgeAccounts },
    queue: { recent: recentPosts, upcoming: upcomingPosts },
    siteId,
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json();
  const { action } = body;

  switch (action) {
    case "send_whatsapp_test": {
      if (!isKapsoConfigured()) {
        return NextResponse.json({ success: false, error: "WhatsApp not configured" }, { status: 400 });
      }
      try {
        const { getKapsoClient } = await import("@/lib/integrations/kapso-client");
        const client = getKapsoClient();
        const phoneId = getPhoneNumberId();
        const to = body.to as string;
        if (!to) return NextResponse.json({ success: false, error: "Missing 'to' phone number" }, { status: 400 });

        const result = await client.messages.sendText({
          phoneNumberId: phoneId,
          to,
          body: body.message || "Test message from Yalla London admin dashboard",
        });
        return NextResponse.json({ success: true, messageId: result.messages?.[0]?.id });
      } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Send failed" }, { status: 500 });
      }
    }

    case "sync_accounts": {
      if (!isPostBridgeConfigured()) {
        return NextResponse.json({ success: false, error: "Post Bridge not configured" }, { status: 400 });
      }
      try {
        const client = getPostBridgeClient();
        if (!client) return NextResponse.json({ success: false, error: "Client not available" }, { status: 500 });
        const accounts = await client.getAccounts();
        return NextResponse.json({ success: true, accounts });
      } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Sync failed" }, { status: 500 });
      }
    }

    case "schedule_post": {
      const { prisma } = await import("@/lib/db");
      const siteId = body.siteId || getDefaultSiteId();
      const { title, content, platform, scheduledAt } = body;

      if (!title || !content || !platform) {
        return NextResponse.json({ success: false, error: "Missing title, content, or platform" }, { status: 400 });
      }

      const post = await prisma.scheduledContent.create({
        data: {
          title,
          content,
          content_type: `${platform}_post`,
          platform,
          language: "en",
          scheduled_time: scheduledAt ? new Date(scheduledAt) : new Date(),
          status: "pending",
          site_id: siteId,
        },
      });

      return NextResponse.json({ success: true, postId: post.id });
    }

    case "publish_now": {
      const { prisma } = await import("@/lib/db");
      const { postId } = body;
      if (!postId) return NextResponse.json({ success: false, error: "Missing postId" }, { status: 400 });

      // Try Post Bridge first
      const post = await prisma.scheduledContent.findUnique({ where: { id: postId } });
      if (!post) return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });

      let published = false;
      if (isPostBridgeConfigured() && post.platform) {
        try {
          const client = getPostBridgeClient();
          if (client) {
            const accounts = await client.getAccounts();
            const matchingAccount = accounts.find((a) => a.platform === post.platform && a.connected);
            if (matchingAccount) {
              await client.createPost({
                caption: post.content,
                social_account_ids: [matchingAccount.id],
              });
              published = true;
            }
          }
        } catch (err) {
          console.warn("[social-hub] Post Bridge publish failed:", err instanceof Error ? err.message : err);
        }
      }

      await prisma.scheduledContent.update({
        where: { id: postId },
        data: {
          status: published ? "published" : "failed",
          published: published,
          published_time: published ? new Date() : undefined,
        },
      });

      return NextResponse.json({ success: published, method: published ? "post-bridge" : "failed" });
    }

    default:
      return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  }
}
