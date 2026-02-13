/**
 * Health Alert API
 *
 * GET  — Fetch recent alerts (from CronJobLog failures)
 * POST — Manually trigger a health check + send alert email to admins
 *
 * Alerts are derived from CronJobLog entries with status=failed or timed_out.
 * When triggered manually (POST), runs a live DB check and emails admins
 * if issues are detected.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { sendEmail } from "@/lib/email-notifications";
import { getAllSiteIds, getSiteConfig } from "@/config/sites";

// ─── GET: Fetch recent alerts ───────────────────────────────────────

export const GET = withAdminAuth(async (request: NextRequest) => {
  const url = new URL(request.url);
  const hours = parseInt(url.searchParams.get("hours") ?? "24", 10);
  const severity = url.searchParams.get("severity"); // critical, warning, info

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  try {
    const { prisma } = await import("@/lib/db");

    const failures = await (prisma as any).cronJobLog.findMany({
      where: {
        status: { in: ["failed", "timed_out"] },
        started_at: { gte: since },
      },
      orderBy: { started_at: "desc" },
      take: 100,
      select: {
        id: true,
        job_name: true,
        site_id: true,
        status: true,
        error_message: true,
        started_at: true,
        completed_at: true,
        duration_ms: true,
        items_processed: true,
        items_failed: true,
        sites_processed: true,
        timed_out: true,
      },
    });

    // Exclude errors from jobs that have since recovered (latest run succeeded)
    const failedJobNames = [...new Set<string>(failures.map((f: any) => f.job_name))];
    const latestRuns = await Promise.all(
      failedJobNames.map(async (jobName: string) => {
        const latest = await (prisma as any).cronJobLog.findFirst({
          where: { job_name: jobName },
          orderBy: { started_at: "desc" },
          select: { job_name: true, status: true },
        });
        return latest;
      }),
    );
    const recoveredJobs = new Set(
      latestRuns
        .filter((r: any) => r && r.status === "completed")
        .map((r: any) => r.job_name),
    );
    const unresolvedFailures = failures.filter(
      (f: any) => !recoveredJobs.has(f.job_name),
    );

    // Classify severity
    const alerts = unresolvedFailures.map((f: any) => {
      let alertSeverity: "critical" | "warning" | "info" = "warning";

      // Critical: DB connection errors or all items failed
      const errMsg = (f.error_message ?? "").toLowerCase();
      if (
        errMsg.includes("prisma") ||
        errMsg.includes("database") ||
        errMsg.includes("connection") ||
        errMsg.includes("timeout") ||
        f.status === "timed_out"
      ) {
        alertSeverity = "critical";
      } else if (f.items_failed > 0 && f.items_processed === f.items_failed) {
        alertSeverity = "critical";
      } else if (f.items_failed > 0) {
        alertSeverity = "warning";
      }

      return {
        id: f.id,
        severity: alertSeverity,
        jobName: f.job_name,
        siteId: f.site_id,
        status: f.status,
        error: f.error_message ?? "Unknown error",
        timestamp: f.started_at?.toISOString(),
        durationMs: f.duration_ms,
        itemsProcessed: f.items_processed ?? 0,
        itemsFailed: f.items_failed ?? 0,
        timedOut: f.timed_out ?? false,
      };
    });

    // Filter by severity if requested
    const filtered = severity
      ? alerts.filter((a: any) => a.severity === severity)
      : alerts;

    const criticalCount = alerts.filter((a: any) => a.severity === "critical").length;
    const warningCount = alerts.filter((a: any) => a.severity === "warning").length;

    return NextResponse.json({
      alerts: filtered,
      summary: {
        total: alerts.length,
        critical: criticalCount,
        warning: warningCount,
        info: alerts.length - criticalCount - warningCount,
        timeRange: `${hours}h`,
        since: since.toISOString(),
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        alerts: [],
        summary: { total: 0, critical: 1, warning: 0, info: 0 },
        dbError: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
});

// ─── POST: Trigger health check + send alert email ──────────────────

export const POST = withAdminAuth(async (request: NextRequest) => {
  const issues: string[] = [];

  // 1. Test DB connection
  let dbConnected = false;
  let dbLatency = 0;
  try {
    const start = Date.now();
    const { prisma } = await import("@/lib/db");
    await (prisma as any).$queryRaw`SELECT 1`;
    dbConnected = true;
    dbLatency = Date.now() - start;
    if (dbLatency > 2000) {
      issues.push(`Database connection slow: ${dbLatency}ms`);
    }
  } catch (err) {
    issues.push(
      `Database connection FAILED: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // 2. Check recent cron failures (last 1h)
  if (dbConnected) {
    try {
      const { prisma } = await import("@/lib/db");
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentFailures = await (prisma as any).cronJobLog.findMany({
        where: {
          status: { in: ["failed", "timed_out"] },
          started_at: { gte: oneHourAgo },
        },
        select: {
          job_name: true,
          error_message: true,
          started_at: true,
        },
        orderBy: { started_at: "desc" },
        take: 20,
      });

      for (const f of recentFailures) {
        issues.push(
          `Cron "${f.job_name}" failed at ${f.started_at?.toISOString()}: ${(f.error_message ?? "").slice(0, 120)}`,
        );
      }
    } catch {
      // non-critical
    }
  }

  // 3. Check site domains are reachable (lightweight HEAD request)
  const siteIds = getAllSiteIds();
  for (const id of siteIds.slice(0, 3)) {
    // Check first 3 to avoid timeout
    const cfg = getSiteConfig(id);
    if (!cfg?.domain) continue;
    try {
      const res = await fetch(`https://${cfg.domain}`, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok && res.status !== 308 && res.status !== 301) {
        issues.push(`Site ${cfg.name} (${cfg.domain}) returned HTTP ${res.status}`);
      }
    } catch (err) {
      issues.push(
        `Site ${cfg.name} (${cfg.domain}) unreachable: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // 4. Send alert email if there are issues
  let emailSent = false;
  if (issues.length > 0) {
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    if (adminEmails.length > 0) {
      const issueList = issues
        .map((i, idx) => `${idx + 1}. ${escapeHtml(i)}`)
        .join("<br/>");

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f9fa;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:24px 32px;color:#fff;">
    <h1 style="margin:0;font-size:20px;">Health Alert</h1>
    <p style="margin:4px 0 0;opacity:0.9;font-size:14px;">${new Date().toLocaleString("en-GB", { timeZone: "UTC" })} UTC</p>
  </div>
  <div style="padding:24px 32px;">
    <p style="margin:0 0 16px;font-size:15px;color:#374151;">
      <strong>${issues.length} issue${issues.length > 1 ? "s" : ""} detected</strong> across the Yalla platform:
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;font-size:14px;color:#991b1b;line-height:1.8;">
      ${issueList}
    </div>
    <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">
      Database: ${dbConnected ? `Connected (${dbLatency}ms)` : "DISCONNECTED"}<br/>
      Sites monitored: ${siteIds.length}
    </p>
  </div>
  <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
    Yalla Platform Health Monitor
  </div>
</div>
</body></html>`;

      for (const email of adminEmails) {
        try {
          await sendEmail({
            to: email,
            subject: `[ALERT] ${issues.length} health issue${issues.length > 1 ? "s" : ""} detected`,
            html,
          });
          emailSent = true;
        } catch {
          // best-effort
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    issues,
    issueCount: issues.length,
    database: { connected: dbConnected, latencyMs: dbLatency },
    emailSent,
    timestamp: new Date().toISOString(),
  });
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
