/**
 * Weekly Rescue Campaign Creator
 *
 * Schedule: Monday 09:00 UTC (start of work week for most timezones).
 *
 * Flow:
 *   1. Pulls /api/admin/rescue-plan to identify top N actionable items.
 *   2. Buckets items by failureMode → CampaignOperations.
 *   3. Skips if a "rescue-week-*" campaign created in the last 6 days is
 *      still active (avoids duplicating last week's work).
 *   4. If ≥3 items need any non-destructive AI fix, creates a single
 *      Campaign via createCampaign() with the merged operations list.
 *   5. campaign-executor (every 30 min) picks it up and grinds through.
 *
 * Why a separate cron vs. on-demand:
 *   - Khaled wants this to happen WITHOUT him remembering to push the
 *     "AI Fix Top 10" button. Weekly cadence matches how often the
 *     rescue-plan inputs (GSC near-miss data, indexing state) materially
 *     change.
 *   - Decoupling from /admin/campaigns POST so a deploy or admin auth
 *     issue can't silently break the auto-fix loop.
 *
 * Excluded by design:
 *   - cannibalization → destructive (unpublishes losers); per-item human
 *     confirm required via the rescue-plan UI.
 *   - stale_indexing → handled by content-auto-fix-lite Section 7
 *     (re-submission via IndexNow); no Campaign action needed.
 *   - dead_cj_link → handled by content-auto-fix Section 17 (HTTP HEAD +
 *     strip); not a Campaign-shaped operation.
 *
 * The campaign focuses on the two heavy AI fixes the runner already
 * supports: near_miss (meta rewrites) and thin_content (body expansion).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

const BUDGET_MS = 280_000;
const MAX_ITEMS_PER_CAMPAIGN = 30;
const RECENT_CAMPAIGN_DEDUP_DAYS = 6;

type RescueItem = {
  slug: string;
  title: string;
  failureMode: string;
  leverage: number;
  metrics?: Record<string, unknown>;
};

type RescuePlanResponse = {
  items?: RescueItem[];
  byMode?: Record<string, { count: number; totalLeverage: number }>;
};

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  const startTime = Date.now();

  // ── Cron auth (same pattern as other crons) ───────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Feature flag guard ────────────────────────────────────────────────
  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const flagResponse = await checkCronEnabled("weekly-rescue-campaign");
  if (flagResponse) return flagResponse;

  const { getActiveSiteIds, getDefaultSiteId } = await import("@/config/sites");
  const sites = getActiveSiteIds();
  if (sites.length === 0) {
    return NextResponse.json({ success: false, error: "No active sites configured" });
  }

  const origin = request.nextUrl.origin;
  const perSiteResults: Array<{
    siteId: string;
    status: "created" | "skipped_no_items" | "skipped_existing_campaign" | "failed";
    campaignId?: string;
    totalItems?: number;
    operations?: string[];
    reason?: string;
  }> = [];

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const siteId of sites) {
    if (Date.now() - startTime > BUDGET_MS - 30_000) {
      perSiteResults.push({
        siteId,
        status: "failed",
        reason: "Budget exhausted before this site",
      });
      totalFailed++;
      continue;
    }

    try {
      const result = await createWeeklyCampaignForSite(siteId, origin, request.headers.get("cookie"));
      perSiteResults.push({ siteId, ...result });
      if (result.status === "created") totalCreated++;
      else if (result.status === "failed") totalFailed++;
      else totalSkipped++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      perSiteResults.push({ siteId, status: "failed", reason: msg });
      totalFailed++;
      console.warn(`[weekly-rescue-campaign] ${siteId} failed:`, msg);
    }
  }

  const duration = Date.now() - startTime;
  const isSuccess = totalFailed === 0;

  await logCronExecution("weekly-rescue-campaign", isSuccess ? "completed" : "failed", {
    durationMs: duration,
    itemsProcessed: perSiteResults.length,
    itemsSucceeded: totalCreated + totalSkipped,
    itemsFailed: totalFailed,
    errorMessage: isSuccess
      ? undefined
      : perSiteResults
          .filter((r) => r.status === "failed")
          .map((r) => `${r.siteId}: ${r.reason}`)
          .join(" | "),
    resultSummary: {
      totalSites: sites.length,
      totalCreated,
      totalSkipped,
      totalFailed,
      perSiteResults,
    },
  }).catch((err) => console.warn("[weekly-rescue-campaign] log failed:", err));

  return NextResponse.json({
    success: isSuccess,
    durationMs: duration,
    totalSites: sites.length,
    created: totalCreated,
    skipped: totalSkipped,
    failed: totalFailed,
    perSite: perSiteResults,
  });
}

// ─────────────────────────────────────────────────────────────────────────

async function createWeeklyCampaignForSite(
  siteId: string,
  origin: string,
  cookieHeader: string | null,
): Promise<{
  status: "created" | "skipped_no_items" | "skipped_existing_campaign" | "failed";
  campaignId?: string;
  totalItems?: number;
  operations?: string[];
  reason?: string;
}> {
  const { prisma } = await import("@/lib/db");

  // ── 1. Dedup: skip if a rescue-week campaign created in last 6 days is active ──
  const recentCutoff = new Date(Date.now() - RECENT_CAMPAIGN_DEDUP_DAYS * 24 * 60 * 60 * 1000);
  const recent = await prisma.campaign.findFirst({
    where: {
      siteId,
      name: { startsWith: "Weekly Rescue" },
      createdAt: { gte: recentCutoff },
      status: { in: ["draft", "queued", "running", "paused"] },
    },
    select: { id: true, status: true, createdAt: true },
  });
  if (recent) {
    return {
      status: "skipped_existing_campaign",
      campaignId: recent.id,
      reason: `Active "Weekly Rescue" campaign from ${recent.createdAt.toISOString().slice(0, 10)} (status: ${recent.status})`,
    };
  }

  // ── 2. Fetch rescue plan ───────────────────────────────────────────────
  // Cron-secret authed routes need either CRON_SECRET or a valid admin
  // session. The /api/admin/rescue-plan endpoint uses requireAdmin which
  // accepts both a session cookie AND the X-Cron-Secret header. Forward
  // CRON_SECRET so this works without a session.
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookieHeader) headers["cookie"] = cookieHeader;
  if (process.env.CRON_SECRET) {
    // Some admin routes accept Authorization: Bearer for cron auth fallback.
    headers["authorization"] = `Bearer ${process.env.CRON_SECRET}`;
    headers["x-cron-secret"] = process.env.CRON_SECRET;
  }

  let planRes: Response;
  try {
    planRes = await fetch(`${origin}/api/admin/rescue-plan?siteId=${encodeURIComponent(siteId)}&limit=100`, {
      method: "GET",
      headers,
    });
  } catch (err) {
    return {
      status: "failed",
      reason: `rescue-plan fetch error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  if (!planRes.ok) {
    return { status: "failed", reason: `rescue-plan returned HTTP ${planRes.status}` };
  }

  const plan = (await planRes.json()) as RescuePlanResponse;
  const items = plan.items || [];

  // ── 3. Bucket items by failureMode → operations ───────────────────────
  // Map only to operations the campaign-runner natively supports.
  // The CampaignConfig.operations is a string[] — campaign-runner runs
  // diagnoseArticle() per item to decide which ops actually apply, so it
  // is safe to list more ops than every item needs.
  const FAILURE_MODE_OPS: Record<string, string[]> = {
    near_miss: ["fix_meta_title", "fix_meta_description"],
    thin_content: ["expand_content"],
    // Skipping cannibalization, stale_indexing, dead_cj_link by design
    // (see file header comment).
  };

  const eligibleItems = items.filter((it) => FAILURE_MODE_OPS[it.failureMode]);
  if (eligibleItems.length < 3) {
    return {
      status: "skipped_no_items",
      reason: `Only ${eligibleItems.length} eligible item(s) — need ≥3 to warrant a weekly campaign`,
    };
  }

  // Build the union of operations needed across the eligible items
  const ops = new Set<string>();
  for (const item of eligibleItems) {
    for (const op of FAILURE_MODE_OPS[item.failureMode] || []) ops.add(op);
  }
  const operations = [...ops];

  // ── 4. Build the campaign config ──────────────────────────────────────
  // We use createCampaign's filter mechanism rather than passing specific
  // slugs because:
  //   (a) createCampaign always re-queries BlogPost with filters, so we
  //       can't directly inject slugs without monkey-patching the runner.
  //   (b) The rescue-plan items are derived from current SEO/GSC state.
  //       By the time the executor processes the campaign over the week,
  //       other articles may have entered the same "near-miss" or "thin"
  //       buckets. A filter-based campaign naturally adapts.
  //   (c) The campaign-runner's diagnoseArticle() re-validates each item
  //       before applying operations, so over-targeting is safe (it just
  //       skips items where the op wouldn't apply).
  //
  // Filter logic mirrors the rescue-plan detectors:
  //   thin_content trigger: minWordCount filter (caught when item is BELOW)
  //   near_miss trigger:    maxSeoScore filter (CTR-suboptimal articles)
  const hasThin = eligibleItems.some((i) => i.failureMode === "thin_content");
  const hasNearMiss = eligibleItems.some((i) => i.failureMode === "near_miss");

  const filters: Record<string, unknown> = {};
  if (hasThin) filters.minWordCount = 800; // matches rescue-plan THIN_CONTENT_WORDS-adjacent threshold
  if (hasNearMiss) filters.maxSeoScore = 80; // capture articles that could still rank higher
  filters.publishedBefore = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // ≥7d old (Google has had time to crawl/rank)

  const config = {
    operations: operations as Array<
      | "expand_content"
      | "fix_meta_title"
      | "fix_meta_description"
      | "add_authenticity"
      | "fix_heading_hierarchy"
      | "add_internal_links"
      | "add_affiliate_links"
      | "expand_arabic"
      | "fix_slug_artifacts"
      | "add_structured_data"
      | "inject_images"
      | "inject_maps"
      | "add_banners"
    >,
    filters,
    aiModel: "auto" as const,
    dryRun: false,
  };

  // ── 5. Create the campaign ────────────────────────────────────────────
  const { createCampaign } = await import("@/lib/campaigns/campaign-runner");
  const today = new Date().toISOString().slice(0, 10);
  const campaignName = `Weekly Rescue — ${today}`;
  const campaignType = "rescue_weekly";

  const created = await createCampaign(siteId, campaignName, campaignType, config, "weekly-rescue-cron");

  if (created.totalItems === 0) {
    return {
      status: "skipped_no_items",
      reason:
        "createCampaign filters matched 0 articles (rescue-plan items may not pass diagnoseArticle re-validation)",
    };
  }

  // ── 6. Mark campaign as queued so campaign-executor picks it up ───────
  await prisma.campaign.update({
    where: { id: created.id },
    data: { status: "queued" },
  });

  return {
    status: "created",
    campaignId: created.id,
    totalItems: created.totalItems,
    operations,
  };
}
