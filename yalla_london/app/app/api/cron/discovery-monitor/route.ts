/**
 * Discovery Monitor Cron — Continuous discovery health monitoring + delegation
 *
 * Runs every 6 hours. Scans all active sites, stores snapshot, then DELEGATES
 * to existing batch crons to drain the most common issue types in bulk:
 *
 *   - "never_submitted" (crawlability, critical) → fires content-auto-fix-lite
 *     (Section 7 catches missing URLIndexingStatus records) AND
 *     process-indexing-queue (submits the existing queue via IndexNow)
 *   - "stale_submission" / "chronic_failure" (indexability) → process-indexing-queue
 *   - "thin_content" / "missing_meta" / "perf_high_imp_low_ctr" → seo-deep-review
 *     (Pass 2 enhances under-optimized articles with AI)
 *   - "low_internal_links" / "no_affiliates" / "placeholder_links" / "low_authenticity"
 *     → content-auto-fix (Section 11 inbound links, Section 25 disclosures, etc.)
 *
 * Delegation > per-page fixes: a single batch cron call clears 50-100 pages
 * vs. the old per-page approach that fired 5-13 fixes per cron cycle. With
 * 600+ issues, the old approach was a 12+ day backlog; delegation clears
 * it in 2-3 cycles.
 *
 * Per-page fixes are kept as a fallback for issue types not yet covered by
 * batch crons (placeholder text, H1 fixes).
 *
 * Schedule: 0 3,9,15,21 * * *  (3am, 9am, 3pm, 9pm UTC)
 */

import { NextRequest, NextResponse } from "next/server";
import { getActiveSiteIds, getSiteDomain, getDefaultSiteId } from "@/config/sites";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BUDGET_MS = 280_000;
const PER_DELEGATION_TIMEOUT_MS = 60_000;

// Threshold for triggering a batch-cron delegation. Below this, per-page
// auto-fix is sufficient; above this, we delegate.
const DELEGATE_THRESHOLD_NEVER_SUBMITTED = 10;
const DELEGATE_THRESHOLD_STALE = 5;
const DELEGATE_THRESHOLD_THIN_CONTENT = 5;
const DELEGATE_THRESHOLD_MISSING_META = 3;
const DELEGATE_THRESHOLD_LOW_INTERNAL_LINKS = 10;

interface DelegationOutcome {
  cron: string;
  reason: string;
  triggered: boolean;
  ok: boolean;
  durationMs: number;
  error?: string;
}

async function fireCron(path: string, reason: string, cronSecret: string): Promise<DelegationOutcome> {
  const start = Date.now();
  // Canonical production domain — VERCEL_URL is the deployment URL (rule #181)
  const baseUrl = getSiteDomain(getDefaultSiteId());
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "x-cron-secret": cronSecret,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(PER_DELEGATION_TIMEOUT_MS - 1000),
    });
    return { cron: path, reason, triggered: true, ok: res.ok, durationMs: Date.now() - start };
  } catch (err) {
    return {
      cron: path,
      reason,
      triggered: true,
      ok: false,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function handler() {
  const cronStart = Date.now();
  const activeSiteIds = getActiveSiteIds();
  const cronSecret = process.env.CRON_SECRET || "dev";
  const results: Record<
    string,
    {
      totalPages: number;
      totalIssues: number;
      autoFixed: number;
      score: number;
      grade: string;
      delegations: DelegationOutcome[];
    }
  > = {};

  // Check if cron is enabled via standard guard
  try {
    const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
    const flagResponse = await checkCronEnabled("discovery-monitor");
    if (flagResponse) return flagResponse;
  } catch (err) {
    console.warn("[discovery-monitor] Feature flag check failed:", err instanceof Error ? err.message : String(err));
  }

  // Track which crons we've already fired this cycle so multi-site loops don't
  // hammer the same downstream cron multiple times when both sites need it.
  const firedCrons = new Set<string>();

  for (const siteId of activeSiteIds) {
    if (Date.now() - cronStart > BUDGET_MS - 30_000) break;
    if (siteId === "zenitha-yachts-med") continue; // Yacht site doesn't use blog pipeline

    const delegations: DelegationOutcome[] = [];
    let autoFixed = 0;

    try {
      const { scanSiteDiscovery } = await import("@/lib/discovery/scanner");
      const summary = await scanSiteDiscovery(siteId, {
        budgetMs: Math.min(20_000, BUDGET_MS - (Date.now() - cronStart) - 5_000),
        limit: 200,
      });

      // ── Batch delegation by issue category ────────────────────────────
      // issuesByCategory aggregates across all pages. Fire each batch cron
      // when its category exceeds the threshold — drains 50-100 issues per
      // cron call vs. 5-13 with per-page fixes.

      // 1. crawlability (never-submitted) → content-auto-fix-lite + process-indexing-queue
      const crawlIssues = summary.issuesByCategory.crawlability || 0;
      if (crawlIssues >= DELEGATE_THRESHOLD_NEVER_SUBMITTED) {
        if (!firedCrons.has("content-auto-fix-lite") && Date.now() - cronStart < BUDGET_MS - 65_000) {
          firedCrons.add("content-auto-fix-lite");
          const r = await fireCron(
            "/api/cron/content-auto-fix-lite",
            `${crawlIssues} crawlability issues — Section 7 catches missing URLIndexingStatus records`,
            cronSecret,
          );
          delegations.push(r);
          if (r.ok) autoFixed += Math.min(crawlIssues, 200); // Section 7 cap
        }
        if (!firedCrons.has("process-indexing-queue") && Date.now() - cronStart < BUDGET_MS - 65_000) {
          firedCrons.add("process-indexing-queue");
          const r = await fireCron(
            "/api/cron/process-indexing-queue",
            `${crawlIssues} crawlability issues — submit existing queue via IndexNow`,
            cronSecret,
          );
          delegations.push(r);
          if (r.ok) autoFixed += 50;
        }
      }

      // 2. indexability (stale + chronic) → process-indexing-queue
      const indexIssues = summary.issuesByCategory.indexability || 0;
      if (indexIssues >= DELEGATE_THRESHOLD_STALE && !firedCrons.has("process-indexing-queue")) {
        if (Date.now() - cronStart < BUDGET_MS - 65_000) {
          firedCrons.add("process-indexing-queue");
          const r = await fireCron(
            "/api/cron/process-indexing-queue",
            `${indexIssues} indexability issues — retry with exponential backoff`,
            cronSecret,
          );
          delegations.push(r);
          if (r.ok) autoFixed += 50;
        }
      }

      // 3. content_quality (thin content + low authenticity + missing meta + perf) → seo-deep-review
      const contentIssues = summary.issuesByCategory.content_quality || 0;
      const metaIssues = summary.issuesByCategory.meta_tags || 0;
      if (
        (contentIssues >= DELEGATE_THRESHOLD_THIN_CONTENT || metaIssues >= DELEGATE_THRESHOLD_MISSING_META) &&
        !firedCrons.has("seo-deep-review") &&
        Date.now() - cronStart < BUDGET_MS - 65_000
      ) {
        firedCrons.add("seo-deep-review");
        const r = await fireCron(
          "/api/cron/seo-deep-review",
          `${contentIssues} content quality + ${metaIssues} meta issues — AI expand + meta optimization`,
          cronSecret,
        );
        delegations.push(r);
        if (r.ok) autoFixed += 5; // seo-deep-review processes ~3 articles per run
      }

      // 4. internal_linking + authority → content-auto-fix (Section 11 + Section 25)
      const linkIssues = summary.issuesByCategory.internal_linking || 0;
      const authorityIssues = summary.issuesByCategory.authority || 0;
      if (
        (linkIssues >= DELEGATE_THRESHOLD_LOW_INTERNAL_LINKS || authorityIssues >= 3) &&
        !firedCrons.has("content-auto-fix") &&
        Date.now() - cronStart < BUDGET_MS - 65_000
      ) {
        firedCrons.add("content-auto-fix");
        const r = await fireCron(
          "/api/cron/content-auto-fix",
          `${linkIssues} internal-link + ${authorityIssues} authority issues — Section 11 (inbound links) + Section 25 (FTC disclosures)`,
          cronSecret,
        );
        delegations.push(r);
        if (r.ok) autoFixed += 30; // content-auto-fix typical fixes per run
      }

      // ── Per-page fallback fixes ────────────────────────────────────────
      // For issue types not yet covered by batch crons (placeholder text,
      // H1 fixes), keep the per-page approach but with higher caps.
      // pagesNeedingAttention is capped at 20 pages — that's the bottleneck,
      // not the per-cron cap.

      // Placeholder links — only fix-engine handles these (no batch cron)
      const placeholderPages = summary.pagesNeedingAttention.filter((p) => p.topIssue.includes("placeholder"));
      if (placeholderPages.length > 0 && Date.now() - cronStart < BUDGET_MS - 5_000) {
        try {
          const { fixPlaceholders } = await import("@/lib/discovery/fix-engine");
          for (const page of placeholderPages.slice(0, 15)) {
            if (Date.now() - cronStart > BUDGET_MS - 3_000) break;
            const r = await fixPlaceholders(page.slug, siteId);
            if (r.success) autoFixed++;
          }
        } catch (err) {
          console.warn(
            `[discovery-monitor] Per-page placeholder fix failed for ${siteId}:`,
            err instanceof Error ? err.message : String(err),
          );
        }
      }

      // H1 headings — only fix-engine handles these
      const h1Pages = summary.pagesNeedingAttention.filter((p) => p.topIssue.includes("H1"));
      if (h1Pages.length > 0 && Date.now() - cronStart < BUDGET_MS - 3_000) {
        try {
          const { fixHeadings } = await import("@/lib/discovery/fix-engine");
          for (const page of h1Pages.slice(0, 15)) {
            if (Date.now() - cronStart > BUDGET_MS - 2_000) break;
            const r = await fixHeadings(page.slug, siteId);
            if (r.success) autoFixed++;
          }
        } catch (err) {
          console.warn(
            `[discovery-monitor] Per-page H1 fix failed for ${siteId}:`,
            err instanceof Error ? err.message : String(err),
          );
        }
      }

      results[siteId] = {
        totalPages: summary.totalPages,
        totalIssues: summary.totalIssues,
        autoFixed,
        score: summary.overallScore,
        grade: summary.overallGrade,
        delegations,
      };

      console.log(
        `[discovery-monitor] ${siteId}: ${summary.totalPages} pages, ${summary.totalIssues} issues, ${autoFixed} auto-fixed, ${delegations.length} delegations, grade ${summary.overallGrade}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[discovery-monitor] Failed for ${siteId}:`, msg);
      results[siteId] = { totalPages: 0, totalIssues: 0, autoFixed: 0, score: 0, grade: "F", delegations: [] };
    }
  }

  // Log cron execution via standard logger
  try {
    const { logCronExecution } = await import("@/lib/cron-logger");
    await logCronExecution("discovery-monitor", "completed", {
      durationMs: Date.now() - cronStart,
      itemsProcessed: Object.values(results).reduce((s, r) => s + r.totalPages, 0),
      itemsSucceeded: Object.values(results).reduce((s, r) => s + r.autoFixed, 0),
      resultSummary: results as Record<string, unknown>,
      sitesProcessed: Object.keys(results),
    });
  } catch (err) {
    console.warn("[discovery-monitor] Failed to log cron execution:", err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json({
    status: "completed",
    duration_ms: Date.now() - cronStart,
    results,
  });
}

export async function GET(request: NextRequest) {
  // Cron auth: allow if CRON_SECRET unset, reject if set and doesn't match
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return handler();
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return handler();
}
