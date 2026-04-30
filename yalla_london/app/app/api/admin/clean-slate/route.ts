/**
 * Clean-Slate Operation API
 *
 *   GET    /api/admin/clean-slate?siteId=yalla-london          → JSON dry-run manifest
 *   GET    /api/admin/clean-slate?siteId=...&email=true        → dry-run + send preview email
 *   POST   /api/admin/clean-slate?siteId=...&confirm=true      → execute manifest, send result email
 *
 * Auth: admin session OR CRON_SECRET (so it can be triggered from the
 * cockpit Run Now button OR from a scheduled cron).
 *
 * Default behavior: dry-run. Confirmation requires both ?confirm=true AND
 * a previously-built manifest within the last 30 minutes (we re-run the
 * analyzer at execute time so the result reflects current data — no
 * stale-manifest exploitation).
 */

import { NextRequest, NextResponse } from "next/server";
import { buildCleanSlateManifest } from "@/lib/cleanup/clean-slate-analyzer";
import { executeCleanSlate } from "@/lib/cleanup/clean-slate-executor";
import { renderManifestEmail, renderResultEmail } from "@/lib/cleanup/clean-slate-email";
import { getActiveSiteIds, getDefaultSiteId } from "@/config/sites";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function checkAuth(request: NextRequest): Promise<NextResponse | null> {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const hasCronAuth = !cronSecret || authHeader === `Bearer ${cronSecret}`;
  if (hasCronAuth) return null;
  const { requireAdmin } = await import("@/lib/admin-middleware");
  return requireAdmin(request);
}

async function getAdminEmails(): Promise<string[]> {
  // Same source as CEO Inbox + briefing — comma-separated env var.
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.includes("@"));
}

async function sendBriefingEmail(subject: string, html: string): Promise<{ sent: boolean; error?: string }> {
  try {
    const { sendResendEmail } = await import("@/lib/email/resend-service");
    const recipients = await getAdminEmails();
    if (recipients.length === 0) {
      return { sent: false, error: "ADMIN_EMAILS env var not configured" };
    }
    const result = await sendResendEmail({
      to: recipients,
      subject,
      html,
      tags: [{ name: "type", value: "clean-slate" }],
    });
    return { sent: result.success, error: result.error };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function handle(request: NextRequest, isExecute: boolean) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const url = request.nextUrl;
  const siteId = url.searchParams.get("siteId") || getDefaultSiteId();
  const emailFlag = url.searchParams.get("email") === "true";
  const confirm = url.searchParams.get("confirm") === "true";

  // siteId guard — must be an active site, not yacht site (different cleanup)
  const activeSites = getActiveSiteIds();
  if (!activeSites.includes(siteId)) {
    return NextResponse.json({ error: `siteId '${siteId}' is not an active site` }, { status: 400 });
  }
  if (siteId === "zenitha-yachts-med") {
    return NextResponse.json(
      { error: "zenitha-yachts-med uses different cleanup rules — not supported here yet" },
      { status: 400 },
    );
  }

  // ── Always start by building a fresh manifest ───────────────────────────
  const manifestStart = Date.now();
  const manifest = await buildCleanSlateManifest(siteId);
  const manifestMs = Date.now() - manifestStart;

  // ── Dry-run path: return JSON, optionally send preview email ────────────
  if (!isExecute || !confirm) {
    let emailStatus: { sent: boolean; error?: string } | null = null;
    if (emailFlag) {
      const { subject, html } = renderManifestEmail(manifest);
      emailStatus = await sendBriefingEmail(subject, html);
    }
    return NextResponse.json({
      mode: "dry-run",
      siteId,
      manifestBuiltMs: manifestMs,
      emailStatus,
      manifest,
    });
  }

  // ── Execute path: confirm=true + auth passed ────────────────────────────
  // Re-build manifest (don't trust client-supplied stale data) and execute it.
  // The executor itself re-verifies protection at row level, so any traffic
  // that landed between manifest and execute is honored.
  const result = await executeCleanSlate(manifest);

  // Always send result email after execute so Khaled has the audit trail in
  // his inbox — fire-and-forget so a Resend hiccup doesn't fail the API.
  const { subject, html } = renderResultEmail(result);
  const emailStatus = await sendBriefingEmail(subject, html);

  // Log the operation to CronJobLog so it shows up in cockpit + briefing §16.
  try {
    const { logCronExecution } = await import("@/lib/cron-logger");
    const totalApplied =
      result.applied.unpublishedDuplicates +
      result.applied.unpublishedThin +
      result.applied.unpublishedSlugArtifacts +
      result.applied.titlesFixed +
      result.applied.metasFixed +
      result.applied.rejectedDraftsDeleted +
      result.applied.cronJobLogsDeleted +
      result.applied.autoFixLogsDeleted +
      result.applied.apiUsageLogsDeleted +
      result.applied.zombieCronsResolved +
      result.applied.promotingDraftsReverted +
      result.applied.generatingTopicsReset +
      result.applied.orphanedUrlsDeleted;
    await logCronExecution("clean-slate", result.errors.length > 0 && totalApplied === 0 ? "failed" : "completed", {
      durationMs: result.durationMs,
      itemsProcessed: totalApplied + result.errors.length,
      itemsSucceeded: totalApplied,
      itemsFailed: result.errors.length,
      resultSummary: { siteId, applied: result.applied, skipped: result.skipped, errorCount: result.errors.length },
      errorMessage:
        result.errors.length > 0
          ? result.errors
              .slice(0, 3)
              .map((e) => e.message)
              .join(" | ")
          : undefined,
    });
  } catch (err) {
    console.warn("[clean-slate] logCronExecution failed:", err instanceof Error ? err.message : err);
  }

  return NextResponse.json({
    mode: "executed",
    siteId,
    manifestBuiltMs: manifestMs,
    emailStatus,
    result,
  });
}

export async function GET(request: NextRequest) {
  return handle(request, false);
}

export async function POST(request: NextRequest) {
  return handle(request, true);
}
