export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily Briefing Cron — Runs at 05:00 UTC (08:00 IDT / 07:00 IST)
 *
 * Built 30 minutes after audit-roundup runs at 04:30 UTC so the auto-fixes
 * are reflected in §16 (Fixes Applied 24h) of the briefing.
 *
 * What it does:
 *   1. buildDailyBriefing(null) — aggregate brief covering every active site
 *   2. Render via DailyBriefingEmail React Email template
 *   3. Persist to DailyBriefing table (one row per (siteId=null, date))
 *   4. Send to ADMIN_EMAILS via Resend (Yalla London domain)
 *   5. Log to CronJobLog
 *
 * Spec: docs/briefing/CEO-DAILY-BRIEFING.md
 */

import { NextRequest, NextResponse } from "next/server";
import * as React from "react";
import { logCronExecution } from "@/lib/cron-logger";
import { buildDailyBriefing } from "@/lib/briefing/builder";
import { prisma } from "@/lib/db";

const TOTAL_BUDGET_MS = 280_000;

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

async function handleDailyBriefing(request: NextRequest) {
  const cronStart = Date.now();

  // Auth
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const hasCronAuth = !cronSecret || authHeader === `Bearer ${cronSecret}`;
  if (!hasCronAuth) {
    const { requireAdmin } = await import("@/lib/admin-middleware");
    const authError = await requireAdmin(request);
    if (authError) return authError;
  }

  // Feature flag guard
  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const flagResponse = await checkCronEnabled("daily-briefing");
  if (flagResponse) return flagResponse;

  // Healthcheck
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    return NextResponse.json({ status: "healthy", endpoint: "daily-briefing", timestamp: new Date().toISOString() });
  }

  // Test mode: render briefing + return data WITHOUT sending email or
  // persisting. Used for manual MCP-driven validation after merge.
  const testMode = request.nextUrl.searchParams.get("test") === "true";

  try {
    // 1. Build briefing
    const briefing = await buildDailyBriefing(null);

    // Budget check before doing anything else expensive
    if (Date.now() - cronStart > TOTAL_BUDGET_MS - 30_000) {
      throw new Error("Briefing build exceeded budget — skipping render + send");
    }

    // 2. Render React Email → HTML
    const { renderToStaticMarkup } = await import("react-dom/server");
    const DailyBriefingEmail = (await import("@/emails/daily-briefing")).default;
    const renderedHtml = renderToStaticMarkup(React.createElement(DailyBriefingEmail, { briefing }));

    // 3. Persist briefing row (upsert by composite siteId+date)
    let briefingId: string | null = null;
    if (!testMode) {
      try {
        const row = await prisma.dailyBriefing.upsert({
          where: {
            siteId_briefingDate: {
              siteId: null as unknown as string, // null = aggregate (Prisma quirk: composite key with null)
              briefingDate: new Date(briefing.metadata.briefingDate),
            },
          },
          create: {
            siteId: null,
            briefingDate: new Date(briefing.metadata.briefingDate),
            data: briefing as unknown as Record<string, unknown>,
            renderedHtml,
            emailSent: false,
          },
          update: {
            data: briefing as unknown as Record<string, unknown>,
            renderedHtml,
          },
          select: { id: true },
        });
        briefingId = row.id;
      } catch (err) {
        // The composite-with-null upsert can fail on some Postgres setups.
        // Fall back to plain create — duplicate-day briefings are acceptable
        // for now since DailyBriefing has 90-day retention.
        console.warn("[daily-briefing] upsert failed, falling back to create:", err);
        const row = await prisma.dailyBriefing.create({
          data: {
            siteId: null,
            briefingDate: new Date(briefing.metadata.briefingDate),
            data: briefing as unknown as Record<string, unknown>,
            renderedHtml,
            emailSent: false,
          },
          select: { id: true },
        });
        briefingId = row.id;
      }
    }

    // 4. Send via Resend
    const adminEmails = getAdminEmails();
    let emailSent = false;
    let emailMessageId: string | null = null;
    let emailError: string | null = null;

    if (testMode) {
      emailError = "test mode — email skipped";
    } else if (adminEmails.length === 0) {
      emailError = "ADMIN_EMAILS env var not set — no recipient";
    } else {
      try {
        const { sendResendEmail, isResendConfigured } = await import("@/lib/email/resend-service");
        if (!isResendConfigured()) {
          emailError = "Resend not configured (RESEND_API_KEY missing)";
        } else {
          const result = await sendResendEmail({
            to: adminEmails,
            subject: `[Yalla London] Website Management Briefing — ${briefing.metadata.briefingDate}`,
            from: process.env.EMAIL_FROM || "Yalla London <briefing@yalla-london.com>",
            replyTo: process.env.EMAIL_REPLY_TO || "info@yalla-london.com",
            react: React.createElement(DailyBriefingEmail, { briefing }),
            idempotencyKey: `briefing-${briefing.metadata.briefingDate}`,
            tags: [
              { name: "type", value: "daily-briefing" },
              { name: "date", value: briefing.metadata.briefingDate },
            ],
          });
          emailSent = result.success;
          emailMessageId = result.id || null;
          emailError = result.error || null;
        }
      } catch (err) {
        emailError = err instanceof Error ? err.message : String(err);
      }
    }

    // 5. Update briefing row with email outcome
    if (!testMode && briefingId) {
      try {
        await prisma.dailyBriefing.update({
          where: { id: briefingId },
          data: { emailSent, emailMessageId, emailError },
        });
      } catch (err) {
        console.warn("[daily-briefing] failed to update email outcome:", err);
      }
    }

    const totalDuration = Date.now() - cronStart;
    const overallSuccess = emailSent || testMode;

    await logCronExecution("daily-briefing", overallSuccess ? "completed" : "failed", {
      durationMs: totalDuration,
      itemsProcessed: 1,
      itemsSucceeded: overallSuccess ? 1 : 0,
      itemsFailed: overallSuccess ? 0 : 1,
      resultSummary: {
        briefingId,
        date: briefing.metadata.briefingDate,
        sites: briefing.metadata.siteIds,
        emailSent,
        emailMessageId,
        emailError,
        recipients: adminEmails.length,
        sectionsBuilt: Object.values(briefing.sections).filter((sec) => sec.ok).length,
        sectionsFailed: Object.values(briefing.sections).filter((sec) => !sec.ok).length,
      },
      errorMessage: emailError || undefined,
    });

    return NextResponse.json({
      success: overallSuccess,
      testMode,
      briefingId,
      date: briefing.metadata.briefingDate,
      sites: briefing.metadata.siteIds,
      emailSent,
      emailMessageId,
      emailError,
      recipients: adminEmails.length,
      sectionsBuilt: Object.values(briefing.sections).filter((sec) => sec.ok).length,
      sectionsFailed: Object.values(briefing.sections).filter((sec) => !sec.ok).length,
      durationMs: totalDuration,
      // Return the briefing JSON in test mode so the MCP can inspect it
      ...(testMode ? { briefing } : {}),
    });
  } catch (err: unknown) {
    const totalDuration = Date.now() - cronStart;
    const message = err instanceof Error ? err.message : String(err);
    await logCronExecution("daily-briefing", "failed", {
      durationMs: totalDuration,
      itemsProcessed: 0,
      resultSummary: { error: message },
      errorMessage: message,
    });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export const GET = handleDailyBriefing;
export const POST = handleDailyBriefing;
