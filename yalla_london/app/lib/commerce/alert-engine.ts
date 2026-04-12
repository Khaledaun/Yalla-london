/**
 * Alert Engine — Commerce notification system
 *
 * Creates CommerceAlert records for:
 * - New sales (website + Etsy)
 * - Campaign milestones (25%, 50%, 75%, 100%)
 * - Trend spikes (high-score niches discovered)
 * - Weekly summary digest
 * - Listing status changes
 * - Brief approvals
 *
 * Called from: Stripe webhook, commerce-trends cron, campaign-generator,
 * listing-generator, report-generator, and manual triggers.
 */

// ─── Alert Types ─────────────────────────────────────────

type AlertType =
  | "new_sale"
  | "campaign_milestone"
  | "trend_spike"
  | "weekly_summary"
  | "listing_status"
  | "brief_approved"
  | "brief_rejected"
  | "low_stock"
  | "price_alert"
  | "system";

type AlertSeverity = "info" | "success" | "warning" | "critical";

interface CreateAlertInput {
  siteId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  productId?: string;
  briefId?: string;
  campaignId?: string;
  actionUrl?: string;
}

// ─── Create Alert ────────────────────────────────────────

/**
 * Create a new CommerceAlert record.
 */
export async function createAlert(input: CreateAlertInput): Promise<string> {
  const { prisma } = await import("@/lib/db");

  const alert = await prisma.commerceAlert.create({
    data: {
      siteId: input.siteId,
      type: input.type,
      severity: input.severity,
      title: input.title,
      message: input.message,
      productId: input.productId ?? null,
      briefId: input.briefId ?? null,
      campaignId: input.campaignId ?? null,
      actionUrl: input.actionUrl ?? null,
      read: false,
    },
  });

  return alert.id;
}

// ─── Specific Alert Creators ─────────────────────────────

/**
 * Alert: New sale recorded.
 */
export async function alertNewSale(
  siteId: string,
  channel: "website" | "etsy",
  productName: string,
  amountCents: number,
  productId?: string,
): Promise<void> {
  await createAlert({
    siteId,
    type: "new_sale",
    severity: "success",
    title: `New ${channel} sale: $${(amountCents / 100).toFixed(2)}`,
    message: `"${productName}" sold on ${channel} for $${(amountCents / 100).toFixed(2)}.`,
    productId,
    actionUrl: "/admin/cockpit/commerce",
  });
}

/**
 * Alert: Campaign milestone reached (25%, 50%, 75%, 100%).
 */
export async function alertCampaignMilestone(
  siteId: string,
  campaignName: string,
  percent: number,
  campaignId: string,
): Promise<void> {
  await createAlert({
    siteId,
    type: "campaign_milestone",
    severity: percent >= 100 ? "success" : "info",
    title: `Campaign ${percent}% complete`,
    message: `"${campaignName}" has reached ${percent}% task completion.`,
    campaignId,
    actionUrl: `/admin/cockpit/commerce/campaign?id=${campaignId}`,
  });
}

/**
 * Alert: High-opportunity niche discovered during trend scan.
 */
export async function alertTrendSpike(
  siteId: string,
  nicheName: string,
  score: number,
  briefId?: string,
): Promise<void> {
  await createAlert({
    siteId,
    type: "trend_spike",
    severity: score >= 80 ? "critical" : "warning",
    title: `Trending niche: ${nicheName} (score: ${score})`,
    message: `AI research discovered a high-opportunity niche "${nicheName}" with a composite score of ${score}/100.${briefId ? " A product brief has been created." : ""}`,
    briefId,
    actionUrl: "/admin/cockpit/commerce?tab=trends",
  });
}

/**
 * Alert: Weekly commerce summary.
 */
export async function alertWeeklySummary(
  siteId: string,
  summary: {
    totalRevenueCents: number;
    orderCount: number;
    newProducts: number;
    activeCampaigns: number;
    topProduct?: string;
  },
): Promise<void> {
  const lines = [
    `Revenue: $${(summary.totalRevenueCents / 100).toFixed(2)} (${summary.orderCount} orders)`,
    `New products: ${summary.newProducts}`,
    `Active campaigns: ${summary.activeCampaigns}`,
  ];
  if (summary.topProduct) {
    lines.push(`Top seller: ${summary.topProduct}`);
  }

  await createAlert({
    siteId,
    type: "weekly_summary",
    severity: "info",
    title: "Weekly Commerce Summary",
    message: lines.join(" | "),
    actionUrl: "/admin/cockpit/commerce",
  });
}

/**
 * Alert: Listing status change.
 */
export async function alertListingStatus(
  siteId: string,
  draftTitle: string,
  newStatus: string,
  briefId?: string,
): Promise<void> {
  const severityMap: Record<string, AlertSeverity> = {
    published: "success",
    approved: "info",
    failed: "critical",
    archived: "warning",
  };

  await createAlert({
    siteId,
    type: "listing_status",
    severity: severityMap[newStatus] ?? "info",
    title: `Listing ${newStatus}: ${draftTitle}`,
    message: `Listing "${draftTitle}" has been ${newStatus}.`,
    briefId,
    actionUrl: "/admin/cockpit/commerce?tab=briefs",
  });
}

/**
 * Alert: Brief approved or rejected.
 */
export async function alertBriefDecision(
  siteId: string,
  briefTitle: string,
  approved: boolean,
  briefId: string,
  rejectionNote?: string,
): Promise<void> {
  await createAlert({
    siteId,
    type: approved ? "brief_approved" : "brief_rejected",
    severity: approved ? "success" : "warning",
    title: `Brief ${approved ? "approved" : "rejected"}: ${briefTitle}`,
    message: approved
      ? `Product brief "${briefTitle}" has been approved and is ready for listing generation.`
      : `Product brief "${briefTitle}" was rejected.${rejectionNote ? ` Reason: ${rejectionNote}` : ""}`,
    briefId,
    actionUrl: "/admin/cockpit/commerce?tab=briefs",
  });
}

// ─── Alert Management ────────────────────────────────────

/**
 * Mark alert(s) as read.
 */
export async function markAlertsRead(alertIds: string[], siteId: string): Promise<number> {
  const { prisma } = await import("@/lib/db");

  // Scope to siteId to prevent cross-site alert manipulation
  const result = await prisma.commerceAlert.updateMany({
    where: { id: { in: alertIds }, siteId },
    data: { read: true, readAt: new Date() },
  });

  return result.count;
}

/**
 * Mark all alerts as read for a site.
 */
export async function markAllAlertsRead(siteId: string): Promise<number> {
  const { prisma } = await import("@/lib/db");

  const result = await prisma.commerceAlert.updateMany({
    where: { siteId, read: false },
    data: { read: true, readAt: new Date() },
  });

  return result.count;
}

/**
 * Get unread alert count for a site.
 */
export async function getUnreadAlertCount(siteId: string): Promise<number> {
  const { prisma } = await import("@/lib/db");

  return prisma.commerceAlert.count({
    where: { siteId, read: false },
  });
}

/**
 * Get recent alerts for a site.
 */
export async function getRecentAlerts(
  siteId: string,
  limit = 20,
  includeRead = false,
): Promise<{
  alerts: Record<string, unknown>[];
  unreadCount: number;
}> {
  const { prisma } = await import("@/lib/db");

  const where: Record<string, unknown> = { siteId };
  if (!includeRead) where.read = false;

  const [alerts, unreadCount] = await Promise.all([
    prisma.commerceAlert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.commerceAlert.count({
      where: { siteId, read: false },
    }),
  ]);

  return {
    alerts: alerts as unknown as Record<string, unknown>[],
    unreadCount,
  };
}

/**
 * Check campaign milestones and fire alerts if thresholds crossed.
 */
export async function checkCampaignMilestones(siteId: string): Promise<number> {
  const { prisma } = await import("@/lib/db");
  let alertsFired = 0;

  const campaigns = await prisma.commerceCampaign.findMany({
    where: { siteId, status: "active" },
  });

  for (const campaign of campaigns) {
    const tasks = (campaign.tasksJson as { status: string }[]) ?? [];
    if (tasks.length === 0) continue;

    const completedCount = tasks.filter((t) => t.status === "completed").length;
    const percent = Math.round((completedCount / tasks.length) * 100);

    // Check each milestone threshold
    for (const milestone of [25, 50, 75, 100]) {
      if (percent >= milestone) {
        // Check if we already alerted this milestone
        const existing = await prisma.commerceAlert.findFirst({
          where: {
            siteId,
            campaignId: campaign.id,
            type: "campaign_milestone",
            title: { contains: `${milestone}%` },
          },
        });

        if (!existing) {
          await alertCampaignMilestone(siteId, campaign.name, milestone, campaign.id);
          alertsFired++;
        }
      }
    }
  }

  return alertsFired;
}
