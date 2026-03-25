export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — delayed-retest waits 2 minutes

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

/**
 * CEO Inbox API — Automated Incident Response
 *
 * GET:  List inbox alerts (latest 20)
 * POST: Actions — delayed-retest, dismiss, retest, mark-read
 *
 * The delayed-retest action is called fire-and-forget by handleCronFailureNotice().
 * It waits 2 minutes, retests the cron, and updates the inbox entry.
 */

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { getInboxAlerts } = await import("@/lib/ops/ceo-inbox");
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20", 10);
    const siteId = request.nextUrl.searchParams.get("siteId") || getDefaultSiteId();
    const alerts = await getInboxAlerts(limit);

    // CEO inbox alerts are global (cron failures affect all sites), but filter
    // if result_summary contains a siteId that doesn't match the requested site
    const filtered = alerts.filter((a) => {
      // Keep alerts that have no siteId (global) or match the requested site
      const alertSiteId = (a as Record<string, unknown>).siteId as string | undefined;
      return !alertSiteId || alertSiteId === siteId;
    });

    const unread = filtered.filter((a) => !a.read && a.status !== "resolved").length;

    return NextResponse.json({
      success: true,
      alerts: filtered,
      unread,
      total: filtered.length,
      siteId,
    });
  } catch (err) {
    console.error("[ceo-inbox-api] GET error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: "Failed to fetch inbox" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action as string;

  // ─── delayed-retest: called fire-and-forget, no admin auth (internal call) ──
  // This action is triggered by handleCronFailureNotice() as a self-invocation.
  // It runs in its own serverless invocation with a 300s budget.
  if (action === "delayed-retest") {
    const entryId = body.entryId as string;
    const jobName = body.jobName as string;
    const cronPath = body.cronPath as string;
    const delayMs = (body.delayMs as number) || 120_000;

    if (!entryId || !jobName || !cronPath) {
      return NextResponse.json({ success: false, error: "Missing entryId, jobName, or cronPath" }, { status: 400 });
    }

    // Resolve base URL — prefer request origin (production domain) over VERCEL_URL
    // VERCEL_URL returns deployment-specific URLs that are blocked by deployment protection (401)
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.nextUrl.origin;

    // Wait, then retest — this is why maxDuration = 300
    console.log(`[ceo-inbox-api] Delayed retest: waiting ${delayMs}ms before retesting "${jobName}"`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    const { retestCronJob } = await import("@/lib/ops/ceo-inbox");
    const result = await retestCronJob(entryId, jobName, cronPath, baseUrl);

    console.log(`[ceo-inbox-api] Retest result for "${jobName}": ${result.success ? "PASSED" : "FAILED"} — ${result.message}`);

    return NextResponse.json({ success: true, result });
  }

  // ─── All other actions require admin auth ──────────────────────────────────
  const authError = await requireAdmin(request);
  if (authError) return authError;

  if (action === "dismiss") {
    const entryId = body.entryId as string;
    if (!entryId) return NextResponse.json({ success: false, error: "Missing entryId" }, { status: 400 });

    const { dismissAlert } = await import("@/lib/ops/ceo-inbox");
    const dismissed = await dismissAlert(entryId);
    return NextResponse.json({ success: dismissed });
  }

  if (action === "retest") {
    const entryId = body.entryId as string;
    const jobName = body.jobName as string;
    const cronPath = body.cronPath as string;
    if (!entryId || !jobName || !cronPath) {
      return NextResponse.json({ success: false, error: "Missing entryId, jobName, or cronPath" }, { status: 400 });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.nextUrl.origin;

    const { retestCronJob } = await import("@/lib/ops/ceo-inbox");
    const result = await retestCronJob(entryId, jobName, cronPath, baseUrl);
    return NextResponse.json({ success: true, result });
  }

  if (action === "mark-read") {
    const entryId = body.entryId as string;
    if (!entryId) return NextResponse.json({ success: false, error: "Missing entryId" }, { status: 400 });

    try {
      const { prisma } = await import("@/lib/db");
      const existing = await prisma.cronJobLog.findUnique({
        where: { id: entryId },
        select: { result_summary: true },
      });
      const summary = (existing?.result_summary || {}) as Record<string, unknown>;
      await prisma.cronJobLog.update({
        where: { id: entryId },
        data: { result_summary: { ...summary, read: true } },
      });
      return NextResponse.json({ success: true });
    } catch (err) {
      console.warn("[ceo-inbox-api] mark-read failed:", err instanceof Error ? err.message : err);
      return NextResponse.json({ success: false, error: "Failed to mark read" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
}
