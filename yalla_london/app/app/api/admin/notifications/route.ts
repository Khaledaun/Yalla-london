import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AdminNotification {
  id: string;
  type: "cron_failure" | "pipeline_alert" | "seo_alert" | "affiliate_alert" | "system";
  title: string;
  message: string;
  severity: "critical" | "warning" | "info";
  timestamp: string;
  read: boolean;
  meta?: Record<string, unknown>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const NOTIFICATION_SETTINGS_CATEGORY = "notifications";

async function getReadIds(prisma: any, siteId: string): Promise<Set<string>> {
  try {
    const record = await prisma.siteSettings.findUnique({
      where: { siteId_category: { siteId, category: NOTIFICATION_SETTINGS_CATEGORY } },
    });
    if (record?.config && typeof record.config === "object") {
      const cfg = record.config as Record<string, unknown>;
      if (Array.isArray(cfg.readIds)) {
        return new Set<string>(cfg.readIds as string[]);
      }
    }
  } catch {
    // Table may not exist yet — treat as empty
  }
  return new Set<string>();
}

async function saveReadIds(prisma: any, siteId: string, readIds: Set<string>): Promise<void> {
  // Keep last 500 IDs to prevent unbounded growth
  const idsArray = [...readIds].slice(-500);
  await prisma.siteSettings.upsert({
    where: { siteId_category: { siteId, category: NOTIFICATION_SETTINGS_CATEGORY } },
    create: {
      siteId,
      category: NOTIFICATION_SETTINGS_CATEGORY,
      config: { readIds: idsArray, dismissedIds: [] },
      enabled: true,
    },
    update: {
      config: { readIds: idsArray, dismissedIds: [] },
    },
  });
}

async function getDismissedIds(prisma: any, siteId: string): Promise<Set<string>> {
  try {
    const record = await prisma.siteSettings.findUnique({
      where: { siteId_category: { siteId, category: NOTIFICATION_SETTINGS_CATEGORY } },
    });
    if (record?.config && typeof record.config === "object") {
      const cfg = record.config as Record<string, unknown>;
      if (Array.isArray(cfg.dismissedIds)) {
        return new Set<string>(cfg.dismissedIds as string[]);
      }
    }
  } catch {
    // silent
  }
  return new Set<string>();
}

async function saveDismissedIds(prisma: any, siteId: string, readIds: Set<string>, dismissedIds: Set<string>): Promise<void> {
  const readArray = [...readIds].slice(-500);
  const dismissedArray = [...dismissedIds].slice(-500);
  await prisma.siteSettings.upsert({
    where: { siteId_category: { siteId, category: NOTIFICATION_SETTINGS_CATEGORY } },
    create: {
      siteId,
      category: NOTIFICATION_SETTINGS_CATEGORY,
      config: { readIds: readArray, dismissedIds: dismissedArray },
      enabled: true,
    },
    update: {
      config: { readIds: readArray, dismissedIds: dismissedArray },
    },
  });
}

// ─── Notification Builders ──────────────────────────────────────────────────

function buildCronFailureNotifications(
  failedCrons: Array<{
    id: string;
    job_name: string;
    status: string;
    started_at: Date;
    error_message: string | null;
    items_failed: number;
  }>
): AdminNotification[] {
  return failedCrons.map((cron) => ({
    id: `cron-fail-${cron.id}`,
    type: "cron_failure" as const,
    title: `Cron failed: ${cron.job_name}`,
    message: cron.error_message
      ? cron.error_message.slice(0, 200)
      : `${cron.job_name} failed with ${cron.items_failed} item(s) failed`,
    severity: cron.items_failed > 3 ? ("critical" as const) : ("warning" as const),
    timestamp: cron.started_at.toISOString(),
    read: false,
    meta: { jobName: cron.job_name, status: cron.status },
  }));
}

function buildPipelineNotifications(
  stuckDrafts: number,
  reservoirCount: number,
  recentPublished: number
): AdminNotification[] {
  const notifications: AdminNotification[] = [];
  const now = new Date().toISOString();

  if (stuckDrafts > 10) {
    notifications.push({
      id: `pipeline-stuck-${new Date().toISOString().slice(0, 13)}`,
      type: "pipeline_alert",
      title: "Pipeline backlog building",
      message: `${stuckDrafts} drafts stuck in pipeline (not advancing for 4+ hours)`,
      severity: stuckDrafts > 30 ? "critical" : "warning",
      timestamp: now,
      read: false,
    });
  }

  if (reservoirCount > 50) {
    notifications.push({
      id: `reservoir-overflow-${new Date().toISOString().slice(0, 13)}`,
      type: "pipeline_alert",
      title: "Reservoir overflow",
      message: `${reservoirCount} articles waiting in reservoir (cap is 50). Content selector may need attention.`,
      severity: "warning",
      timestamp: now,
      read: false,
    });
  }

  if (recentPublished === 0) {
    notifications.push({
      id: `no-publish-${new Date().toISOString().slice(0, 10)}`,
      type: "pipeline_alert",
      title: "No articles published today",
      message: "Zero articles published in the last 24 hours. Check content selector and scheduled publish crons.",
      severity: "warning",
      timestamp: now,
      read: false,
    });
  }

  return notifications;
}

function buildSeoNotifications(
  neverSubmitted: number,
  indexingErrors: number
): AdminNotification[] {
  const notifications: AdminNotification[] = [];
  const now = new Date().toISOString();

  if (neverSubmitted > 20) {
    notifications.push({
      id: `seo-never-submitted-${new Date().toISOString().slice(0, 10)}`,
      type: "seo_alert",
      title: "Pages not submitted to search engines",
      message: `${neverSubmitted} published pages have never been submitted to IndexNow. Check process-indexing-queue cron.`,
      severity: neverSubmitted > 50 ? "critical" : "warning",
      timestamp: now,
      read: false,
    });
  }

  if (indexingErrors > 5) {
    notifications.push({
      id: `seo-indexing-errors-${new Date().toISOString().slice(0, 10)}`,
      type: "seo_alert",
      title: "Indexing errors detected",
      message: `${indexingErrors} pages have indexing errors. Review the per-page audit.`,
      severity: indexingErrors > 20 ? "critical" : "warning",
      timestamp: now,
      read: false,
    });
  }

  return notifications;
}

function buildCeoInboxNotifications(
  alerts: Array<{
    id: string;
    started_at: Date;
    result_summary: unknown;
    error_message: string | null;
  }>
): AdminNotification[] {
  return alerts.map((alert) => {
    const summary = alert.result_summary as Record<string, unknown> | null;
    return {
      id: `ceo-inbox-${alert.id}`,
      type: "system" as const,
      title: (summary?.title as string) || "System alert",
      message: (summary?.diagnosis as string) || alert.error_message || "Automated alert from CEO Inbox",
      severity: ((summary?.severity as string) === "critical" ? "critical" : "warning") as "critical" | "warning",
      timestamp: alert.started_at.toISOString(),
      read: false,
      meta: { alertId: alert.id },
    };
  });
}

// ─── GET: Fetch notifications ───────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");
    const siteId = request.headers.get("x-site-id") || getDefaultSiteId();

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last4h = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    // Parallel queries for speed
    const [
      failedCrons,
      stuckDrafts,
      reservoirCount,
      recentPublished,
      neverSubmitted,
      indexingErrors,
      ceoAlerts,
      readIds,
      dismissedIds,
    ] = await Promise.all([
      // 1. Failed cron jobs in last 24h
      prisma.cronJobLog.findMany({
        where: {
          status: { in: ["failed", "timed_out"] },
          started_at: { gte: last24h },
        },
        select: {
          id: true,
          job_name: true,
          status: true,
          started_at: true,
          error_message: true,
          items_failed: true,
        },
        orderBy: { started_at: "desc" },
        take: 20,
      }),

      // 2. Stuck drafts (not updated in 4h, still in active phase)
      prisma.articleDraft.count({
        where: {
          current_phase: { in: ["research", "outline", "drafting", "assembly", "images", "seo", "scoring"] },
          updated_at: { lt: last4h },
        },
      }),

      // 3. Reservoir count
      prisma.articleDraft.count({
        where: { current_phase: "reservoir" },
      }),

      // 4. Recently published (last 24h)
      prisma.blogPost.count({
        where: {
          published: true,
          created_at: { gte: last24h },
        },
      }),

      // 5. Never-submitted pages
      prisma.uRLIndexingStatus.count({
        where: {
          submitted_indexnow: false,
          status: { not: "indexed" },
        },
      }),

      // 6. Indexing errors
      prisma.uRLIndexingStatus.count({
        where: {
          status: { in: ["error", "deindexed"] },
        },
      }),

      // 7. CEO Inbox alerts (recent, unresolved)
      prisma.cronJobLog.findMany({
        where: {
          job_name: "ceo-inbox",
          job_type: "alert",
          started_at: { gte: last24h },
        },
        select: {
          id: true,
          started_at: true,
          result_summary: true,
          error_message: true,
        },
        orderBy: { started_at: "desc" },
        take: 10,
      }),

      // 8. Read notification IDs
      getReadIds(prisma, siteId),

      // 9. Dismissed notification IDs
      getDismissedIds(prisma, siteId),
    ]);

    // Build all notifications
    const allNotifications: AdminNotification[] = [
      ...buildCronFailureNotifications(failedCrons),
      ...buildPipelineNotifications(stuckDrafts, reservoirCount, recentPublished),
      ...buildSeoNotifications(neverSubmitted, indexingErrors),
      ...buildCeoInboxNotifications(ceoAlerts),
    ];

    // Filter out dismissed, mark read
    const notifications = allNotifications
      .filter((n) => !dismissedIds.has(n.id))
      .map((n) => ({ ...n, read: readIds.has(n.id) }));

    // Sort: unread first, then by timestamp descending
    notifications.sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    return NextResponse.json({
      notifications,
      unreadCount,
      total: notifications.length,
    });
  } catch (err) {
    console.warn("[notifications] GET error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ notifications: [], unreadCount: 0, total: 0 });
  }
}

// ─── POST: Mark read / dismiss ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { getDefaultSiteId } = await import("@/config/sites");
    const siteId = request.headers.get("x-site-id") || getDefaultSiteId();

    const body = await request.json();
    const { action, notificationId } = body as {
      action: "mark_read" | "mark_all_read" | "dismiss";
      notificationId?: string;
    };

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    const readIds = await getReadIds(prisma, siteId);
    const dismissedIds = await getDismissedIds(prisma, siteId);

    switch (action) {
      case "mark_read": {
        if (!notificationId) {
          return NextResponse.json({ error: "Missing notificationId" }, { status: 400 });
        }
        readIds.add(notificationId);
        await saveReadIds(prisma, siteId, readIds);
        return NextResponse.json({ success: true, action: "mark_read", notificationId });
      }

      case "mark_all_read": {
        // Re-fetch current notifications to mark them all
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const failedCrons = await prisma.cronJobLog.findMany({
          where: { status: { in: ["failed", "timed_out"] }, started_at: { gte: last24h } },
          select: { id: true },
          take: 50,
        });
        for (const c of failedCrons) {
          readIds.add(`cron-fail-${c.id}`);
        }
        // Also mark synthetic notification IDs
        const hourKey = new Date().toISOString().slice(0, 13);
        const dayKey = new Date().toISOString().slice(0, 10);
        readIds.add(`pipeline-stuck-${hourKey}`);
        readIds.add(`reservoir-overflow-${hourKey}`);
        readIds.add(`no-publish-${dayKey}`);
        readIds.add(`seo-never-submitted-${dayKey}`);
        readIds.add(`seo-indexing-errors-${dayKey}`);

        await saveReadIds(prisma, siteId, readIds);
        return NextResponse.json({ success: true, action: "mark_all_read" });
      }

      case "dismiss": {
        if (!notificationId) {
          return NextResponse.json({ error: "Missing notificationId" }, { status: 400 });
        }
        dismissedIds.add(notificationId);
        await saveDismissedIds(prisma, siteId, readIds, dismissedIds);
        return NextResponse.json({ success: true, action: "dismiss", notificationId });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (err) {
    console.warn("[notifications] POST error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Failed to process notification action" }, { status: 500 });
  }
}
