/**
 * Monday Audit — manual preview + on-demand send
 *
 * GET  /api/admin/monday-audit?siteId=X
 *      → returns the 4-category action item report (read-only).
 *        Use to preview what the next Monday 09:00 UTC cron will surface.
 *
 * POST /api/admin/monday-audit { siteId?, sendEmail?: true }
 *      → with `sendEmail: true`, fires the digest email to ADMIN_EMAILS[0]
 *        immediately. Useful when Khaled wants to act on a Sunday or after
 *        applying canonicalization to see the new state.
 *      → without `sendEmail`, just returns the same JSON as GET.
 *
 * Same source of truth as weekly-rescue-campaign cron — no logic
 * duplication. Both call getMondayActionItems() + buildMondayActionEmailHtml().
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getActiveSiteIds, getDefaultSiteId } from "@/config/sites";
import { getMondayActionItems, buildMondayActionEmailHtml } from "@/lib/ops/monday-action-items";

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const siteIdParam = request.nextUrl.searchParams.get("siteId");
  const sites = siteIdParam ? [siteIdParam] : getActiveSiteIds();
  if (sites.length === 0) {
    return NextResponse.json({ error: "No active sites" }, { status: 400 });
  }

  const reports = await Promise.all(
    sites.map((s) =>
      getMondayActionItems(s).catch((err) => ({
        siteId: s,
        generatedAt: new Date().toISOString(),
        totalItems: 0,
        itemsByCategory: {},
        items: [],
        error: err instanceof Error ? err.message : String(err),
      })),
    ),
  );

  return NextResponse.json({
    totalSites: sites.length,
    totalActionItems: reports.reduce((n, r) => n + r.items.length, 0),
    reports,
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const siteIdParam = body.siteId;
  const wantEmail = body.sendEmail === true;
  const sites = siteIdParam ? [siteIdParam] : getActiveSiteIds();

  const reports = await Promise.all(sites.map((s) => getMondayActionItems(s).catch(() => null)));
  const validReports = reports.filter((r): r is NonNullable<typeof r> => r !== null);
  const totalActionItems = validReports.reduce((n, r) => n + r.items.length, 0);

  let emailResult: { success: boolean; error?: string; recipientCount?: number } = { success: false };
  if (wantEmail) {
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (adminEmails.length === 0) {
      emailResult = { success: false, error: "No ADMIN_EMAILS configured" };
    } else if (totalActionItems === 0) {
      emailResult = { success: false, error: "No action items to send" };
    } else {
      const { sendEmail } = await import("@/lib/email/sender");
      const baseUrl = request.nextUrl.origin;
      const criticalCount = validReports.reduce(
        (n, r) => n + r.items.filter((i) => i.severity === "critical").length,
        0,
      );
      const subjectPrefix = criticalCount > 0 ? `🚨 [${criticalCount} CRITICAL] ` : "";
      const result = await sendEmail({
        to: adminEmails[0],
        subject: `${subjectPrefix}Monday audit (manual): ${totalActionItems} action item(s)`,
        html: buildMondayActionEmailHtml(validReports, baseUrl),
      });
      emailResult = { success: result.success, error: result.error, recipientCount: 1 };
    }
  }

  return NextResponse.json({
    totalSites: sites.length,
    totalActionItems,
    reports: validReports,
    emailSent: wantEmail,
    emailResult,
  });
}
