export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Daily Content Cleanup Cron — Runs at 03:15 UTC (06:15 IDT)
 *
 * Calls /api/admin/content-cleanup with action="fix_all" so duplicate
 * slug clusters and title/meta artifacts get consolidated automatically
 * every day. Without this cron, duplicates accumulate (current state:
 * 5 spa URLs + 2 afternoon-tea URLs competing for the same query in GSC,
 * splitting authority and traffic).
 *
 * fix_all does two things:
 *   1. fix_artifacts   — sanitize title/meta artifacts on all BlogPosts
 *      (strips "Title:" prefixes, "(under 60 chars)" notes, etc.)
 *   2. fix_duplicates  — group by normalized slug, unpublish duplicate
 *      articles, set canonical_slug on losers so blog page issues 301
 *      redirects (preserves SEO equity).
 *
 * Runs BEFORE audit-roundup (04:30 UTC) so the briefing reflects the
 * post-cleanup state.
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";
import { getSiteDomain, getDefaultSiteId, getActiveSiteIds } from "@/config/sites";

const TOTAL_BUDGET_MS = 110_000;

async function callCleanupForSite(
  siteId: string,
  cronSecret: string,
): Promise<{ ok: boolean; data?: unknown; error?: string; durationMs: number }> {
  const start = Date.now();
  // Use canonical production domain (rule #181 — VERCEL_URL is the
  // deployment URL, not production).
  const baseUrl = getSiteDomain(getDefaultSiteId());
  try {
    const res = await fetch(`${baseUrl}/api/admin/content-cleanup`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "x-cron-secret": cronSecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "fix_all", siteId }),
      signal: AbortSignal.timeout(60_000),
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { ok: res.ok, data, durationMs: Date.now() - start };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }
}

async function handleContentCleanupDaily(request: NextRequest) {
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
  const flagResponse = await checkCronEnabled("content-cleanup-daily");
  if (flagResponse) return flagResponse;

  // Healthcheck
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    return NextResponse.json({
      status: "healthy",
      endpoint: "content-cleanup-daily",
      timestamp: new Date().toISOString(),
    });
  }

  const siteIds = getActiveSiteIds();
  const outcomes: Array<{
    site: string;
    ok: boolean;
    durationMs: number;
    error?: string;
    summary?: unknown;
  }> = [];
  let totalArtifactsFixed = 0;
  let totalDuplicatesFixed = 0;

  try {
    for (const siteId of siteIds) {
      if (Date.now() - cronStart > TOTAL_BUDGET_MS - 30_000) {
        outcomes.push({ site: siteId, ok: false, durationMs: 0, error: "budget exhausted" });
        continue;
      }
      const result = await callCleanupForSite(siteId, cronSecret || "dev");
      // Try to extract counts from the response for logging/dashboard
      const data = result.data as Record<string, unknown> | undefined;
      const results = data?.results as Record<string, unknown> | undefined;
      const artifactsFixed = (results?.artifactsFixed as number) || 0;
      const duplicatesFixed = (results?.duplicatesFixed as number) || 0;
      totalArtifactsFixed += artifactsFixed;
      totalDuplicatesFixed += duplicatesFixed;

      outcomes.push({
        site: siteId,
        ok: result.ok,
        durationMs: result.durationMs,
        error: result.ok ? undefined : result.error || JSON.stringify(result.data).slice(0, 250),
        summary: { artifactsFixed, duplicatesFixed },
      });
    }
  } catch (err: unknown) {
    const totalDuration = Date.now() - cronStart;
    const message = err instanceof Error ? err.message : String(err);
    await logCronExecution("content-cleanup-daily", "failed", {
      durationMs: totalDuration,
      itemsProcessed: outcomes.length,
      resultSummary: { error: message, partial: outcomes },
      errorMessage: message,
    });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }

  const totalDuration = Date.now() - cronStart;
  const successCount = outcomes.filter((o) => o.ok).length;
  const failureCount = outcomes.length - successCount;
  const overallSuccess = successCount > 0 && failureCount === 0;

  await logCronExecution("content-cleanup-daily", overallSuccess ? "completed" : "failed", {
    durationMs: totalDuration,
    itemsProcessed: outcomes.length,
    itemsSucceeded: successCount,
    itemsFailed: failureCount,
    resultSummary: {
      sites: siteIds.length,
      artifactsFixed: totalArtifactsFixed,
      duplicatesFixed: totalDuplicatesFixed,
      outcomes,
    },
  });

  return NextResponse.json({
    success: overallSuccess,
    sites: siteIds.length,
    artifactsFixed: totalArtifactsFixed,
    duplicatesFixed: totalDuplicatesFixed,
    durationMs: totalDuration,
    outcomes,
  });
}

export const GET = handleContentCleanupDaily;
export const POST = handleContentCleanupDaily;
