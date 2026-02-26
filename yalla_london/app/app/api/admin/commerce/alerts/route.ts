/**
 * Commerce Alerts API — Notification management
 *
 * GET: List alerts (filterable by type, read status)
 * POST: Mark as read, mark all read, check milestones
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { getDefaultSiteId, getActiveSiteIds } from "@/config/sites";

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");
    const { searchParams } = new URL(req.url);

    const siteId = searchParams.get("siteId") || getDefaultSiteId();
    const activeSiteIds = getActiveSiteIds();
    const targetSiteId = activeSiteIds.includes(siteId) ? siteId : getDefaultSiteId();
    const includeRead = searchParams.get("includeRead") === "true";
    const type = searchParams.get("type") ?? undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50") || 50, 200);

    const where: Record<string, unknown> = { siteId: targetSiteId };
    if (!includeRead) where.read = false;
    if (type) where.type = type;

    const [alerts, unreadCount, total] = await Promise.all([
      prisma.commerceAlert.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.commerceAlert.count({
        where: { siteId: targetSiteId, read: false },
      }),
      prisma.commerceAlert.count({ where }),
    ]);

    return NextResponse.json({ data: alerts, unreadCount, total });
  } catch (err) {
    console.warn("[commerce-alerts] GET error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to load alerts" }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { action } = body as { action: string };

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    // ── Mark alerts as read ──
    if (action === "mark_read") {
      const { alertIds } = body as { alertIds: string[] };
      if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
        return NextResponse.json({ error: "alertIds array required" }, { status: 400 });
      }

      const { markAlertsRead } = await import("@/lib/commerce/alert-engine");
      const count = await markAlertsRead(alertIds);

      return NextResponse.json({
        success: true,
        message: `${count} alert(s) marked as read`,
      });
    }

    // ── Mark all as read ──
    if (action === "mark_all_read") {
      const { siteId: requestedSiteId } = body as { siteId?: string };
      const activeSiteIds = getActiveSiteIds();
      const siteId = requestedSiteId && activeSiteIds.includes(requestedSiteId)
        ? requestedSiteId
        : getDefaultSiteId();

      const { markAllAlertsRead } = await import("@/lib/commerce/alert-engine");
      const count = await markAllAlertsRead(siteId);

      return NextResponse.json({
        success: true,
        message: `${count} alert(s) marked as read`,
      });
    }

    // ── Check campaign milestones ──
    if (action === "check_milestones") {
      const { siteId: requestedSiteId } = body as { siteId?: string };
      const activeSiteIds = getActiveSiteIds();
      const siteId = requestedSiteId && activeSiteIds.includes(requestedSiteId)
        ? requestedSiteId
        : getDefaultSiteId();

      const { checkCampaignMilestones } = await import("@/lib/commerce/alert-engine");
      const alertsFired = await checkCampaignMilestones(siteId);

      return NextResponse.json({
        success: true,
        message: `${alertsFired} milestone alert(s) created`,
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}. Supported: mark_read, mark_all_read, check_milestones` },
      { status: 400 },
    );
  } catch (err) {
    console.warn("[commerce-alerts] POST error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
});
