/**
 * Events Refresh Cron
 *
 * Schedule: 0 6 * * * (daily 06:00 UTC).
 *
 * Calls the same logic as POST /api/admin/events-seed but with replace=false
 * so it ADDS new Ticketmaster events to the catalog without nuking existing
 * ones. The /api/events GET filter (isEventStillVisible from
 * lib/events/start-time.ts) drops events whose start time is less than 15
 * minutes away, so the page naturally rotates fresh events in as stale ones
 * drop out.
 *
 * Khaled's ask: "weekly swipe to validate updated content" → daily refresh
 * keeps the catalog topped up; weekly-events-validator does deeper checks
 * (link health, AR translation, archiving past-date events).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  const startTime = Date.now();
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const flagResponse = await checkCronEnabled("events-refresh");
  if (flagResponse) return flagResponse;

  const aid = process.env.SPORTSEVENTS365_AID;
  const tmKey = process.env.TICKETMASTER_API_KEY;
  if (!aid || !tmKey) {
    await logCronExecution("events-refresh", "completed", {
      durationMs: Date.now() - startTime,
      itemsProcessed: 0,
      resultSummary: {
        skipped: true,
        reason: !aid ? "SPORTSEVENTS365_AID not set" : "TICKETMASTER_API_KEY not set",
      },
    }).catch(() => {});
    return NextResponse.json({
      success: false,
      skipped: true,
      reason: !aid ? "SPORTSEVENTS365_AID missing" : "TICKETMASTER_API_KEY missing",
    });
  }

  // Call our own seed endpoint internally — single source of truth.
  // Authenticate with CRON_SECRET (admin endpoint accepts requireAdmin OR
  // a session, plus we pass the secret as Bearer for service-to-service).
  const origin = request.nextUrl.origin;
  const { getActiveSiteIds } = await import("@/config/sites");

  // Events refresh is yalla-london specific (Ticketmaster only has UK +
  // Istanbul coverage and we only have the SE365 AID configured for London
  // category paths). Skip other sites; they'll get events when we expand.
  const eligibleSites = getActiveSiteIds().filter((s) => s === "yalla-london" || s === "istanbul");

  const perSiteResults: Array<{
    siteId: string;
    status: "success" | "skipped" | "failed";
    created?: number;
    updated?: number;
    failed?: number;
    reason?: string;
  }> = [];

  for (const siteId of eligibleSites) {
    try {
      const res = await fetch(`${origin}/api/admin/events-seed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${cronSecret || ""}`,
          cookie: request.headers.get("cookie") || "",
        },
        body: JSON.stringify({ siteId, target: 50, replace: false }),
      });
      if (!res.ok) {
        perSiteResults.push({
          siteId,
          status: "failed",
          reason: `HTTP ${res.status}`,
        });
        continue;
      }
      const json = (await res.json()) as {
        created?: number;
        updated?: number;
        failed?: number;
        success?: boolean;
        message?: string;
      };
      if (!json.success) {
        perSiteResults.push({
          siteId,
          status: "failed",
          reason: json.message || "seed endpoint returned success=false",
        });
        continue;
      }
      perSiteResults.push({
        siteId,
        status: "success",
        created: json.created || 0,
        updated: json.updated || 0,
        failed: json.failed || 0,
      });
    } catch (err) {
      perSiteResults.push({
        siteId,
        status: "failed",
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const duration = Date.now() - startTime;
  const isSuccess = perSiteResults.every((r) => r.status !== "failed");
  const totalCreated = perSiteResults.reduce((s, r) => s + (r.created || 0), 0);
  const totalUpdated = perSiteResults.reduce((s, r) => s + (r.updated || 0), 0);

  await logCronExecution("events-refresh", isSuccess ? "completed" : "failed", {
    durationMs: duration,
    itemsProcessed: totalCreated + totalUpdated,
    itemsSucceeded: totalCreated + totalUpdated,
    itemsFailed: perSiteResults.reduce((s, r) => s + (r.failed || 0), 0),
    errorMessage: isSuccess
      ? undefined
      : perSiteResults
          .filter((r) => r.status === "failed")
          .map((r) => `${r.siteId}: ${r.reason}`)
          .join(" | "),
    resultSummary: {
      totalSites: eligibleSites.length,
      totalCreated,
      totalUpdated,
      perSiteResults,
    },
  }).catch((err) =>
    console.warn("[events-refresh] logCronExecution failed:", err instanceof Error ? err.message : err),
  );

  return NextResponse.json({
    success: isSuccess,
    durationMs: duration,
    totalCreated,
    totalUpdated,
    perSiteResults,
  });
}
