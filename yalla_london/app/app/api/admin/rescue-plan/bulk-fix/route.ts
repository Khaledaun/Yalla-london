/**
 * Rescue Plan Bulk Fix — AI fix iterator.
 *
 * POST /api/admin/rescue-plan/bulk-fix
 *   Body: {
 *     siteId?: string,
 *     limit?: number = 10,
 *     modes?: string[] = ["near_miss", "thin_content", "stale_indexing", "dead_cj_link"],
 *     onlyExecutable?: boolean = true,
 *   }
 *
 * Iterates the top-N rescue plan items and runs the AI fix per item by
 * calling lib/discovery/fix-engine functions directly (no HTTP roundtrip).
 * Returns a per-item status array so the UI can render success/failure
 * inline.
 *
 * SAFETY: never auto-runs destructive actions in bulk mode. Cannibalization
 * (unpublishes a loser) is excluded regardless of input. Each destructive
 * action still requires a per-item human confirm via the existing UI flow.
 *
 * Budget: 280s total (Vercel Pro). Per-item soft cap of 25s (AI calls may
 * take 15-20s). Stops early when budget remaining < 20s so the response
 * always returns within the serverless window.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

const BUDGET_MS = 280_000;
const PER_ITEM_BUDGET_MS = 25_000;

// rescue-plan failureMode → discovery fix-engine method name + args.
// Only AI-powered, additive fixes are listed here — destructive modes
// (cannibalization) are intentionally omitted from bulk mode.
const MODE_HANDLERS: Record<
  string,
  {
    name: string;
    run: (
      mod: typeof import("@/lib/discovery/fix-engine"),
      slug: string,
      siteId: string,
    ) => Promise<{ success: boolean; result?: { message?: string } }>;
  }
> = {
  near_miss: {
    name: "optimizeCtr",
    run: (mod, slug, siteId) => mod.optimizeCtr(slug, siteId),
  },
  thin_content: {
    name: "expandContent",
    run: (mod, slug, siteId) => mod.expandContent(slug, siteId, 1200),
  },
  stale_indexing: {
    name: "retrySubmission",
    run: (mod, slug, siteId) => mod.retrySubmission(slug, siteId),
  },
  dead_cj_link: {
    name: "fixPlaceholders",
    run: (mod, slug, siteId) => mod.fixPlaceholders(slug, siteId),
  },
};

const DESTRUCTIVE_MODES = new Set(["cannibalization"]);

type ItemResult = {
  slug: string;
  title: string;
  failureMode: string;
  action: string | null;
  status: "success" | "skipped" | "failed" | "destructive";
  message?: string;
  durationMs?: number;
};

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const startTime = Date.now();
  const body = await request.json().catch(() => ({}));
  const { getDefaultSiteId } = await import("@/config/sites");
  const siteId = (body.siteId as string) || getDefaultSiteId();
  const limit = Math.min((body.limit as number) || 10, 30);
  const modesIn = (body.modes as string[]) || ["near_miss", "thin_content", "stale_indexing", "dead_cj_link"];
  const modes = modesIn.filter((m) => !DESTRUCTIVE_MODES.has(m) && m in MODE_HANDLERS);
  const onlyExecutable = body.onlyExecutable !== false;

  // ── 1. Pull the rescue plan from our own endpoint ────────────────────
  // Single source of truth — re-using detector logic, not duplicating.
  const origin = request.nextUrl.origin;
  let planRes: Response;
  try {
    planRes = await fetch(`${origin}/api/admin/rescue-plan?siteId=${encodeURIComponent(siteId)}&limit=100`, {
      method: "GET",
      headers: { cookie: request.headers.get("cookie") || "" },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: `Failed to fetch rescue plan: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }

  if (!planRes.ok) {
    return NextResponse.json({ success: false, error: `rescue-plan returned HTTP ${planRes.status}` }, { status: 502 });
  }

  const planJson = (await planRes.json()) as {
    items: Array<{
      slug: string;
      title: string;
      failureMode: string;
      action: { endpoint: string | null; payload: Record<string, unknown> | null; executable: boolean };
    }>;
  };

  // ── 2. Filter to mode + executable, cap at limit ─────────────────────
  const targets = (planJson.items || [])
    .filter((it) => modes.includes(it.failureMode))
    .filter((it) => (onlyExecutable ? it.action.executable : true))
    .slice(0, limit);

  if (targets.length === 0) {
    return NextResponse.json({
      success: true,
      siteId,
      processed: 0,
      succeeded: 0,
      failed: 0,
      summary: "No matching items to fix.",
      results: [],
      durationMs: Date.now() - startTime,
    });
  }

  // ── 3. Load the fix engine once ───────────────────────────────────────
  let fixEngineMod: typeof import("@/lib/discovery/fix-engine");
  try {
    fixEngineMod = await import("@/lib/discovery/fix-engine");
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: `fix-engine import failed: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 },
    );
  }

  // ── 4. Iterate, dispatch the AI action per mode ──────────────────────
  const results: ItemResult[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const item of targets) {
    const remaining = BUDGET_MS - (Date.now() - startTime);
    if (remaining < 20_000) {
      results.push({
        slug: item.slug,
        title: item.title,
        failureMode: item.failureMode,
        action: null,
        status: "skipped",
        message: "Budget exhausted before this item",
      });
      break;
    }

    if (DESTRUCTIVE_MODES.has(item.failureMode)) {
      results.push({
        slug: item.slug,
        title: item.title,
        failureMode: item.failureMode,
        action: null,
        status: "destructive",
        message: "Destructive action — needs human confirm in UI",
      });
      continue;
    }

    const handler = MODE_HANDLERS[item.failureMode];
    if (!handler) {
      results.push({
        slug: item.slug,
        title: item.title,
        failureMode: item.failureMode,
        action: null,
        status: "skipped",
        message: `No AI handler for mode "${item.failureMode}"`,
      });
      continue;
    }

    const itemStart = Date.now();
    try {
      // Per-item timeout — never let one slow item starve the rest.
      const fixPromise = handler.run(fixEngineMod, item.slug, siteId);
      const timeoutPromise = new Promise<{
        success: false;
        result: { message: string };
      }>((resolve) =>
        setTimeout(
          () => resolve({ success: false, result: { message: "Per-item timeout (25s)" } }),
          PER_ITEM_BUDGET_MS,
        ),
      );
      const fixResult = await Promise.race([fixPromise, timeoutPromise]);

      if (fixResult.success) {
        succeeded++;
        results.push({
          slug: item.slug,
          title: item.title,
          failureMode: item.failureMode,
          action: handler.name,
          status: "success",
          message: fixResult.result?.message?.slice(0, 200) ?? "Fixed",
          durationMs: Date.now() - itemStart,
        });
      } else {
        failed++;
        results.push({
          slug: item.slug,
          title: item.title,
          failureMode: item.failureMode,
          action: handler.name,
          status: "failed",
          message: fixResult.result?.message?.slice(0, 200) ?? "Unknown failure",
          durationMs: Date.now() - itemStart,
        });
      }
    } catch (err) {
      failed++;
      results.push({
        slug: item.slug,
        title: item.title,
        failureMode: item.failureMode,
        action: handler.name,
        status: "failed",
        message: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - itemStart,
      });
    }
  }

  const totalDuration = Date.now() - startTime;
  return NextResponse.json({
    success: true,
    siteId,
    processed: results.length,
    succeeded,
    failed,
    summary: `AI-fixed ${succeeded}/${results.length} items in ${(totalDuration / 1000).toFixed(1)}s`,
    results,
    durationMs: totalDuration,
  });
}
