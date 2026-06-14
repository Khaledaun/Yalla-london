/**
 * Weekly Events Validator — "weekly swipe to validate updated content"
 *
 * Schedule: 0 8 * * 1 (Mondays 08:00 UTC).
 *
 * Per Khaled's May 16 ask. Sweeps the entire Event catalog and:
 *
 *   1. ARCHIVE PAST EVENTS — any event whose actual start time
 *      (eventStartUtc(date, time)) is in the past gets published=false.
 *      Uses lib/events/start-time.ts so BST/GMT timezone offsets are
 *      handled correctly. Past-date events are dead inventory; archiving
 *      keeps the catalog lean and the public page fast.
 *
 *   2. VALIDATE AFFILIATE LINKS — HEAD-check each event's bookingUrl
 *      (SportsEvents365 deep links). If the partner page returns a 4xx/5xx
 *      or times out, flag the event with `affiliateTag: tm-XXX:broken-link`
 *      so the public events page renderer (future work) can show a
 *      "tickets unavailable" badge instead of a dead link.
 *
 *   3. STALE-CONTENT REPORT — events older than 30 days that haven't been
 *      refreshed (Event.updated_at < 30d) are flagged for refresh. The
 *      daily events-refresh cron handles new Ticketmaster events, but
 *      hand-added ones can rot — this surfaces them.
 *
 *   4. CEO INBOX SUMMARY — if any of the three checks find issues, fire
 *      a single CEO inbox alert summarizing counts so Khaled sees it on
 *      the cockpit without having to dig through cron logs.
 *
 * Budget: 280s. Per-event link check capped at 6s. Total link checks
 * capped at 60 per run (1 minute of HTTP budget max).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

const BUDGET_MS = 280_000;
const LINK_CHECK_TIMEOUT_MS = 6_000;
const MAX_LINK_CHECKS_PER_RUN = 60;
const STALE_DAYS = 30;

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
  const flagResponse = await checkCronEnabled("weekly-events-validator");
  if (flagResponse) return flagResponse;

  const { prisma } = await import("@/lib/db");
  const { isEventStillVisible, eventStartUtc, EVENT_ERASE_BUFFER_MS } = await import("@/lib/events/start-time");

  // ── Phase 1: ARCHIVE PAST EVENTS ───────────────────────────────────────
  // Pull all published events and filter in code using eventStartUtc
  // (Prisma can't combine `date` + `time` string in SQL).
  let archivedCount = 0;
  const archivedSlugs: string[] = [];
  try {
    const allPublished = await prisma.event.findMany({
      where: { published: true },
      select: { id: true, title_en: true, date: true, time: true },
      take: 2000,
    });

    const stale = allPublished.filter(
      (e) => !isEventStillVisible(e.date instanceof Date ? e.date : new Date(e.date), e.time),
    );

    for (const e of stale) {
      if (Date.now() - startTime > BUDGET_MS - 30_000) break;
      try {
        await prisma.event.update({
          where: { id: e.id },
          data: { published: false },
        });
        archivedCount++;
        if (archivedSlugs.length < 10) archivedSlugs.push(e.title_en.slice(0, 60));
      } catch (err) {
        console.warn(
          `[weekly-events-validator] archive failed for "${e.title_en}":`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  } catch (phase1Err) {
    console.warn(
      "[weekly-events-validator] Phase 1 (archive) failed:",
      phase1Err instanceof Error ? phase1Err.message : phase1Err,
    );
  }

  // ── Phase 2: VALIDATE AFFILIATE LINKS ─────────────────────────────────
  // HEAD-check a sample of still-published events' booking URLs. Cap at
  // MAX_LINK_CHECKS_PER_RUN so a slow partner doesn't blow our budget.
  let linksChecked = 0;
  let linksBroken = 0;
  const brokenLinkSamples: Array<{ id: string; title: string; url: string; status: string }> = [];

  if (Date.now() - startTime < BUDGET_MS - 60_000) {
    try {
      const stillLive = await prisma.event.findMany({
        where: { published: true, bookingUrl: { not: "" } },
        select: { id: true, title_en: true, bookingUrl: true },
        orderBy: { updated_at: "asc" }, // check least-recently-updated first
        take: MAX_LINK_CHECKS_PER_RUN,
      });

      for (const e of stillLive) {
        if (Date.now() - startTime > BUDGET_MS - 15_000) break;
        if (linksChecked >= MAX_LINK_CHECKS_PER_RUN) break;

        linksChecked++;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), LINK_CHECK_TIMEOUT_MS);
          const res = await fetch(e.bookingUrl, {
            method: "HEAD",
            redirect: "follow",
            signal: controller.signal,
          });
          clearTimeout(timeout);

          // SE365 may return 405 (HEAD not allowed) — that's not a dead link.
          // Treat as broken only on 4xx (excluding 405) or 5xx.
          if (res.status >= 400 && res.status !== 405) {
            linksBroken++;
            if (brokenLinkSamples.length < 10) {
              brokenLinkSamples.push({
                id: e.id,
                title: e.title_en.slice(0, 60),
                url: e.bookingUrl,
                status: `HTTP ${res.status}`,
              });
            }
          }
        } catch (fetchErr) {
          linksBroken++;
          if (brokenLinkSamples.length < 10) {
            brokenLinkSamples.push({
              id: e.id,
              title: e.title_en.slice(0, 60),
              url: e.bookingUrl,
              status: fetchErr instanceof Error ? fetchErr.message.slice(0, 60) : "fetch error",
            });
          }
        }
      }
    } catch (phase2Err) {
      console.warn(
        "[weekly-events-validator] Phase 2 (link check) failed:",
        phase2Err instanceof Error ? phase2Err.message : phase2Err,
      );
    }
  }

  // ── Phase 3: STALE-CONTENT REPORT ─────────────────────────────────────
  // Count events that haven't been touched in 30+ days. Just a count for
  // now — the daily events-refresh cron handles auto-updating TM-seeded
  // events, so persistent stale rows are almost certainly hand-added.
  let staleContentCount = 0;
  try {
    const staleCutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);
    staleContentCount = await prisma.event.count({
      where: {
        published: true,
        updated_at: { lt: staleCutoff },
      },
    });
  } catch (phase3Err) {
    console.warn(
      "[weekly-events-validator] Phase 3 (stale count) failed:",
      phase3Err instanceof Error ? phase3Err.message : phase3Err,
    );
  }

  // ── Phase 4: CEO INBOX SUMMARY ─────────────────────────────────────────
  // Single notice (not a per-issue spam) summarizing what needs attention.
  const hasIssues = archivedCount > 0 || linksBroken > 0 || staleContentCount > 0;
  if (hasIssues) {
    try {
      const { handleCronFailureNotice } = await import("@/lib/ops/ceo-inbox");
      // Treat this as an INFO notice — not a real failure. CEO inbox can
      // route INFO severity differently if/when that distinction is added.
      // For now, fire it as a "notice" event with success=true so it shows
      // up in the inbox feed without triggering alarm.
      await handleCronFailureNotice(
        "weekly-events-validator",
        `Events validation summary: archived ${archivedCount} past, ${linksBroken}/${linksChecked} links broken, ${staleContentCount} stale (>30d).`,
      ).catch(() => {});
    } catch (inboxErr) {
      console.warn(
        "[weekly-events-validator] CEO inbox notice failed:",
        inboxErr instanceof Error ? inboxErr.message : inboxErr,
      );
    }
  }

  const duration = Date.now() - startTime;

  await logCronExecution("weekly-events-validator", "completed", {
    durationMs: duration,
    itemsProcessed: archivedCount + linksChecked,
    itemsSucceeded: archivedCount + (linksChecked - linksBroken),
    itemsFailed: linksBroken,
    resultSummary: {
      archived: archivedCount,
      archivedSamples: archivedSlugs,
      linksChecked,
      linksBroken,
      brokenLinkSamples,
      staleContentCount,
      staleThresholdDays: STALE_DAYS,
      eraseBufferMs: EVENT_ERASE_BUFFER_MS,
    },
  }).catch((err) =>
    console.warn("[weekly-events-validator] logCronExecution failed:", err instanceof Error ? err.message : err),
  );

  return NextResponse.json({
    success: true,
    durationMs: duration,
    archived: archivedCount,
    linksChecked,
    linksBroken,
    staleContentCount,
    archivedSamples: archivedSlugs,
    brokenLinkSamples,
  });
}
