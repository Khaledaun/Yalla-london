import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");

  const siteId =
    request.headers.get("x-site-id") || getDefaultSiteId();
  const siteFilter = {
    OR: [{ site_id: siteId }, { site_id: null }],
  };

  try {
    const [
      subscribers,
      campaigns,
      totalSubscribers,
      activeSubscribers,
      unsubscribed,
      bounced,
      totalCampaigns,
      sentCampaigns,
    ] = await Promise.all([
      prisma.subscriber.findMany({
        where: siteFilter,
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          status: true,
          source: true,
          engagement_score: true,
          created_at: true,
          site_id: true,
        },
        orderBy: { created_at: "desc" },
        take: 200,
      }),
      prisma.emailCampaign.findMany({
        select: {
          id: true,
          name: true,
          subject: true,
          status: true,
          recipientCount: true,
          openCount: true,
          clickCount: true,
          sentCount: true,
          scheduledAt: true,
          sentAt: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
        take: 50,
      }),
      prisma.subscriber.count({ where: siteFilter }),
      prisma.subscriber.count({
        where: { ...siteFilter, status: "CONFIRMED" },
      }),
      prisma.subscriber.count({
        where: { ...siteFilter, status: "UNSUBSCRIBED" },
      }),
      prisma.subscriber.count({
        where: { ...siteFilter, status: "BOUNCED" },
      }),
      prisma.emailCampaign.count(),
      prisma.emailCampaign.count({ where: { status: "SENT" } }),
    ]);

    return NextResponse.json({
      subscribers,
      campaigns,
      stats: {
        totalSubscribers,
        activeSubscribers,
        unsubscribed,
        bounced,
        totalCampaigns,
        sentCampaigns,
      },
    });
  } catch (err) {
    console.warn(
      "[crm-api] Failed to fetch CRM data:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      { error: "Failed to fetch CRM data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");

  const siteId =
    request.headers.get("x-site-id") || getDefaultSiteId();
  const siteFilter = {
    OR: [{ site_id: siteId }, { site_id: null }],
  };

  try {
    const body = await request.json();
    const { action } = body as { action?: string };

    if (action === "export") {
      const subscribers = await prisma.subscriber.findMany({
        where: siteFilter,
        select: {
          email: true,
          first_name: true,
          last_name: true,
          status: true,
          source: true,
          engagement_score: true,
          created_at: true,
          site_id: true,
        },
        orderBy: { created_at: "desc" },
      });

      return NextResponse.json({
        success: true,
        action: "export",
        data: subscribers,
        count: subscribers.length,
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    console.warn(
      "[crm-api] POST failed:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      { error: "Failed to process CRM action" },
      { status: 500 }
    );
  }
}
