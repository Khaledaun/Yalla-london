/**
 * Force-Reject Stuck Drafts — Manual cockpit trigger
 *
 * GET  /api/admin/force-reject-stuck?dryRun=true
 *      Returns the drafts that WOULD be rejected (no DB writes).
 *
 * POST /api/admin/force-reject-stuck
 *      Body: { siteId?: string, hoursStuck?: number }
 *      Rejects drafts matching ANY of these criteria:
 *        - phase_attempts >= LIFETIME_RECOVERY_CAP (5) — past lifetime cap,
 *          permanently broken regardless of phase.
 *        - updated_at older than `hoursStuck` (default 24h) AND not in a
 *          terminal phase (published / reservoir / rejected).
 *        - last_error contains MAX_RECOVERIES_EXCEEDED — diagnostic-agent
 *          already gave up but didn't update the phase.
 *
 * Why this exists: the May 15 briefing showed 37 drafts stuck >24h and
 * 11 drafts 1 attempt from rejection. diagnostic-sweep runs every 2h and
 * SHOULD drain these, but Vercel pool timeouts can leave them in limbo for
 * days. Khaled needs a one-tap "clear the backlog" button.
 *
 * Designed to be safe: only touches drafts in non-terminal phases,
 * preserves topic_proposal_id linkage so the topic can be re-claimed,
 * logs every rejection to AutoFixLog for audit trail.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { LIFETIME_RECOVERY_CAP } from "@/lib/content-pipeline/constants";

const TERMINAL_PHASES = ["published", "rejected", "reservoir", "promoting"];

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const url = request.nextUrl;
  const siteId = url.searchParams.get("siteId");
  const hoursStuck = parseInt(url.searchParams.get("hoursStuck") || "24", 10);

  const candidates = await findStuckDrafts({ siteId, hoursStuck });

  return NextResponse.json({
    success: true,
    dryRun: true,
    siteId,
    hoursStuck,
    candidateCount: candidates.length,
    candidates: candidates.map((d) => ({
      id: d.id,
      keyword: d.keyword,
      site_id: d.site_id,
      locale: d.locale,
      current_phase: d.current_phase,
      phase_attempts: d.phase_attempts,
      hours_since_update: d.hoursSinceUpdate,
      last_error: d.last_error?.slice(0, 200),
      reason: d.rejectReason,
    })),
  });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const siteId = (body.siteId as string) || null;
  const hoursStuck = (body.hoursStuck as number) || 24;
  const reasonOverride = (body.reason as string) || null;

  const candidates = await findStuckDrafts({ siteId, hoursStuck });

  if (candidates.length === 0) {
    return NextResponse.json({
      success: true,
      rejected: 0,
      message: "No stuck drafts found matching criteria.",
    });
  }

  const { prisma } = await import("@/lib/db");

  let rejected = 0;
  let failed = 0;
  const results: Array<{ id: string; keyword: string; status: string; error?: string }> = [];

  for (const draft of candidates) {
    try {
      const reason = reasonOverride || `MAX_RECOVERIES_EXCEEDED [force-reject-stuck:${draft.rejectReason}]`;

      await prisma.articleDraft.update({
        where: { id: draft.id },
        data: {
          current_phase: "rejected",
          last_error: reason,
          // Preserve attempt count and topic linkage for audit/re-queue
        },
      });

      // Log to AutoFixLog so the action shows up in cockpit history
      try {
        await prisma.autoFixLog.create({
          data: {
            siteId: draft.site_id,
            targetType: "draft",
            targetId: draft.id,
            fixType: "reject_stuck_draft",
            agent: "force-reject-stuck",
            success: true,
            before: {
              phase: draft.current_phase,
              attempts: draft.phase_attempts,
              hoursSinceUpdate: draft.hoursSinceUpdate,
              keyword: draft.keyword,
              last_error: draft.last_error?.slice(0, 500) || null,
            },
            after: {
              phase: "rejected",
              reason: draft.rejectReason,
            },
          },
        });
      } catch (logErr) {
        console.warn(
          "[force-reject-stuck] AutoFixLog write failed:",
          logErr instanceof Error ? logErr.message : logErr,
        );
      }

      rejected++;
      results.push({ id: draft.id, keyword: draft.keyword, status: "rejected" });
    } catch (err) {
      failed++;
      results.push({
        id: draft.id,
        keyword: draft.keyword,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    success: true,
    rejected,
    failed,
    totalProcessed: candidates.length,
    results: results.slice(0, 100),
  });
}

// ─────────────────────────────────────────────────────────────────────────

async function findStuckDrafts(opts: { siteId: string | null; hoursStuck: number }): Promise<
  Array<{
    id: string;
    keyword: string;
    site_id: string;
    locale: string | null;
    current_phase: string;
    phase_attempts: number;
    last_error: string | null;
    updated_at: Date;
    hoursSinceUpdate: number;
    rejectReason: string;
  }>
> {
  const { prisma } = await import("@/lib/db");
  const cutoff = new Date(Date.now() - opts.hoursStuck * 60 * 60 * 1000);

  // Pull drafts matching ANY of three criteria. Single query with OR.
  const drafts = await prisma.articleDraft.findMany({
    where: {
      current_phase: { notIn: TERMINAL_PHASES },
      ...(opts.siteId ? { site_id: opts.siteId } : {}),
      OR: [
        // 1. Past lifetime cap
        { phase_attempts: { gte: LIFETIME_RECOVERY_CAP } },
        // 2. Stuck >hoursStuck (no advancement)
        { updated_at: { lt: cutoff } },
        // 3. Already marked MAX_RECOVERIES_EXCEEDED in last_error
        { last_error: { contains: "MAX_RECOVERIES_EXCEEDED" } },
      ],
    },
    select: {
      id: true,
      keyword: true,
      site_id: true,
      locale: true,
      current_phase: true,
      phase_attempts: true,
      last_error: true,
      updated_at: true,
    },
    take: 500, // Cap to protect against runaway processing
    orderBy: { updated_at: "asc" }, // Oldest first
  });

  const now = Date.now();
  return drafts.map((d) => {
    const hoursSinceUpdate = Math.round(((now - d.updated_at.getTime()) / (60 * 60 * 1000)) * 10) / 10;
    let rejectReason = "stuck-24h";
    if (d.phase_attempts >= LIFETIME_RECOVERY_CAP) rejectReason = "lifetime-cap-exceeded";
    else if ((d.last_error || "").includes("MAX_RECOVERIES_EXCEEDED")) rejectReason = "diagnostic-agent-gave-up";
    else if (d.updated_at.getTime() < cutoff.getTime()) rejectReason = `stuck-${opts.hoursStuck}h`;

    return {
      ...d,
      hoursSinceUpdate,
      rejectReason,
    };
  });
}
