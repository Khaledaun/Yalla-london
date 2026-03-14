/**
 * Pipeline Phases API
 *
 * GET  — Returns articles grouped by pipeline phase with counts and stuck detection.
 *        Query params: siteId (optional), phase (optional — filter to single phase)
 *
 * POST — Actions on pipeline drafts:
 *        advance    — Force-advance a draft to the next phase
 *        delete     — Hard-delete a draft
 *        retry      — Reset phase_attempts to 0 so it gets picked up again
 *        bulk_advance — Advance all drafts in a phase to the next phase
 *        publish    — Force-publish a reservoir draft (skips selector, runs gate)
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { getDefaultSiteId, getActiveSiteIds } from "@/config/sites";

const PHASE_ORDER = [
  "research",
  "outline",
  "drafting",
  "assembly",
  "images",
  "seo",
  "scoring",
  "reservoir",
] as const;

const NEXT_PHASE: Record<string, string> = {
  research: "outline",
  outline: "drafting",
  drafting: "assembly",
  assembly: "images",
  images: "seo",
  seo: "scoring",
  scoring: "reservoir",
};

interface PhaseDraft {
  id: string;
  keyword: string;
  locale: string;
  siteId: string;
  currentPhase: string;
  phaseAttempts: number;
  sectionsCompleted: number;
  sectionsTotal: number;
  wordCount: number;
  qualityScore: number | null;
  seoScore: number | null;
  lastError: string | null;
  plainError: string | null;
  stuckHours: number;
  isStuck: boolean;
  createdAt: string;
  updatedAt: string;
  phaseStartedAt: string | null;
}

interface PhaseGroup {
  phase: string;
  label: string;
  count: number;
  stuckCount: number;
  drafts: PhaseDraft[];
}

async function handleGet(request: NextRequest) {
  const authError = await withAdminAuth(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");
  const siteId = request.nextUrl.searchParams.get("siteId") || null;
  const phaseFilter = request.nextUrl.searchParams.get("phase") || null;
  const activeSiteIds = getActiveSiteIds();

  const siteFilter = siteId
    ? { site_id: siteId }
    : { site_id: { in: activeSiteIds } };

  const phaseWhere = phaseFilter
    ? { current_phase: phaseFilter }
    : { current_phase: { in: [...PHASE_ORDER] } };

  const drafts = await prisma.articleDraft.findMany({
    where: { ...siteFilter, ...phaseWhere },
    orderBy: { updated_at: "desc" },
    take: 500,
    select: {
      id: true,
      keyword: true,
      locale: true,
      site_id: true,
      current_phase: true,
      phase_attempts: true,
      sections_completed: true,
      sections_total: true,
      word_count: true,
      quality_score: true,
      seo_score: true,
      last_error: true,
      created_at: true,
      updated_at: true,
      phase_started_at: true,
    },
  });

  const { interpretError } = await import("@/lib/error-interpreter");

  const now = Date.now();
  const STUCK_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

  const phaseGroups: Record<string, PhaseGroup> = {};
  for (const phase of PHASE_ORDER) {
    const label = phase.charAt(0).toUpperCase() + phase.slice(1);
    phaseGroups[phase] = { phase, label, count: 0, stuckCount: 0, drafts: [] };
  }

  for (const d of drafts) {
    const phase = d.current_phase as string;
    if (!phaseGroups[phase]) continue;

    const updatedAt = d.updated_at ? new Date(d.updated_at).getTime() : now;
    const stuckMs = now - updatedAt;
    const stuckHours = Math.round(stuckMs / (60 * 60 * 1000) * 10) / 10;
    const isStuck = stuckMs > STUCK_THRESHOLD_MS;

    const lastError = d.last_error as string | null;
    let plainError: string | null = null;
    if (lastError) {
      try {
        const interpreted = interpretError(lastError);
        plainError = interpreted?.plain || lastError;
      } catch {
        plainError = lastError;
      }
    }

    const item: PhaseDraft = {
      id: d.id as string,
      keyword: (d.keyword as string) || "Untitled",
      locale: (d.locale as string) || "en",
      siteId: (d.site_id as string) || getDefaultSiteId(),
      currentPhase: phase,
      phaseAttempts: (d.phase_attempts as number) || 0,
      sectionsCompleted: (d.sections_completed as number) || 0,
      sectionsTotal: (d.sections_total as number) || 0,
      wordCount: (d.word_count as number) || 0,
      qualityScore: d.quality_score as number | null,
      seoScore: d.seo_score as number | null,
      lastError,
      plainError,
      stuckHours,
      isStuck,
      createdAt: d.created_at ? new Date(d.created_at).toISOString() : "",
      updatedAt: d.updated_at ? new Date(d.updated_at).toISOString() : "",
      phaseStartedAt: d.phase_started_at
        ? new Date(d.phase_started_at).toISOString()
        : null,
    };

    phaseGroups[phase].count++;
    if (isStuck) phaseGroups[phase].stuckCount++;
    phaseGroups[phase].drafts.push(item);
  }

  // Sort drafts within each phase: stuck first, then by updatedAt desc
  for (const group of Object.values(phaseGroups)) {
    group.drafts.sort((a, b) => {
      if (a.isStuck && !b.isStuck) return -1;
      if (!a.isStuck && b.isStuck) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  // Also get published count and reservoir-to-published stats
  const [publishedCount, recentPublished] = await Promise.all([
    prisma.blogPost.count({
      where: { published: true, ...(siteId ? { siteId } : { siteId: { in: activeSiteIds } }) },
    }),
    prisma.blogPost.count({
      where: {
        published: true,
        ...(siteId ? { siteId } : { siteId: { in: activeSiteIds } }),
        publishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return NextResponse.json({
    phases: PHASE_ORDER.map((p) => phaseGroups[p]),
    summary: {
      totalDrafts: drafts.length,
      totalStuck: drafts.filter(
        (d) =>
          now - new Date(d.updated_at).getTime() > STUCK_THRESHOLD_MS,
      ).length,
      publishedTotal: publishedCount,
      publishedLast24h: recentPublished,
    },
    siteId: siteId || "all",
  });
}

async function handlePost(request: NextRequest) {
  const authError = await withAdminAuth(request);
  if (authError) return authError;

  const { prisma } = await import("@/lib/db");
  const body = await request.json();
  const { action, draftId, phase, siteId } = body;

  switch (action) {
    case "advance": {
      if (!draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });
      const draft = await prisma.articleDraft.findUnique({ where: { id: draftId } });
      if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

      const currentPhase = draft.current_phase as string;
      const nextPhase = NEXT_PHASE[currentPhase];
      if (!nextPhase) {
        return NextResponse.json({ error: `No next phase after "${currentPhase}"` }, { status: 400 });
      }

      await prisma.articleDraft.update({
        where: { id: draftId },
        data: {
          current_phase: nextPhase,
          phase_attempts: 0,
          phase_started_at: null,
          last_error: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Advanced from "${currentPhase}" to "${nextPhase}"`,
        draftId,
        previousPhase: currentPhase,
        newPhase: nextPhase,
      });
    }

    case "delete": {
      if (!draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });
      await prisma.articleDraft.delete({ where: { id: draftId } }).catch(() => null);
      return NextResponse.json({ success: true, message: "Draft deleted", draftId });
    }

    case "retry": {
      if (!draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });
      await prisma.articleDraft.update({
        where: { id: draftId },
        data: {
          phase_attempts: 0,
          phase_started_at: null,
          last_error: null,
        },
      });
      return NextResponse.json({ success: true, message: "Draft reset for retry", draftId });
    }

    case "bulk_advance": {
      if (!phase) return NextResponse.json({ error: "phase required" }, { status: 400 });
      const nextPhase = NEXT_PHASE[phase];
      if (!nextPhase) return NextResponse.json({ error: `No next phase after "${phase}"` }, { status: 400 });

      const activeSiteIds = getActiveSiteIds();
      const siteFilter = siteId ? { site_id: siteId } : { site_id: { in: activeSiteIds } };

      const result = await prisma.articleDraft.updateMany({
        where: { current_phase: phase, ...siteFilter },
        data: {
          current_phase: nextPhase,
          phase_attempts: 0,
          phase_started_at: null,
          last_error: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Advanced ${result.count} drafts from "${phase}" to "${nextPhase}"`,
        count: result.count,
      });
    }

    case "publish": {
      if (!draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });
      // Use the force-publish endpoint internally
      const forcePublishUrl = new URL("/api/admin/force-publish", request.nextUrl.origin);
      const res = await fetch(forcePublishUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: request.headers.get("cookie") || "",
        },
        body: JSON.stringify({ draftId, skipDedup: true }),
      });
      const result = await res.json().catch(() => ({ error: "Failed to parse response" }));
      return NextResponse.json(result, { status: res.status });
    }

    case "bulk_delete": {
      if (!phase) return NextResponse.json({ error: "phase required" }, { status: 400 });
      const activeSiteIds = getActiveSiteIds();
      const siteFilter = siteId ? { site_id: siteId } : { site_id: { in: activeSiteIds } };

      // Only delete stuck drafts (2h+ old) to prevent accidental mass deletion
      const result = await prisma.articleDraft.deleteMany({
        where: {
          current_phase: phase,
          ...siteFilter,
          updated_at: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        },
      });

      return NextResponse.json({
        success: true,
        message: `Deleted ${result.count} stuck drafts from "${phase}"`,
        count: result.count,
      });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  return handleGet(request);
}

export async function POST(request: NextRequest) {
  return handlePost(request);
}
