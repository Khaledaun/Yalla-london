/**
 * Discovery Monitor Cron — Continuous discovery health monitoring
 *
 * Runs every 6 hours. Scans all active sites, stores snapshot,
 * auto-fixes critical issues (never-submitted pages, placeholder links).
 *
 * Schedule: 0 3,9,15,21 * * *  (3am, 9am, 3pm, 9pm UTC)
 */

import { NextRequest, NextResponse } from "next/server";
import { getActiveSiteIds } from "@/config/sites";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUDGET_MS = 53_000;

async function handler() {
  const cronStart = Date.now();
  const { prisma } = await import("@/lib/db");
  const activeSiteIds = getActiveSiteIds();
  const results: Record<string, { totalPages: number; totalIssues: number; autoFixed: number; score: number; grade: string }> = {};

  // Check if cron is enabled
  try {
    const flag = await prisma.featureFlag.findFirst({
      where: { key: "cron:discovery-monitor" },
      select: { enabled: true },
    });
    if (flag && !flag.enabled) {
      return NextResponse.json({ status: "disabled", message: "Discovery monitor cron is disabled via feature flag" });
    }
  } catch {
    // FeatureFlag table may not exist — continue
  }

  for (const siteId of activeSiteIds) {
    if (Date.now() - cronStart > BUDGET_MS - 8_000) break;
    if (siteId === "zenitha-yachts-med") continue; // Yacht site doesn't use blog pipeline

    try {
      const { scanSiteDiscovery } = await import("@/lib/discovery/scanner");
      const summary = await scanSiteDiscovery(siteId, {
        budgetMs: Math.min(20_000, BUDGET_MS - (Date.now() - cronStart) - 5_000),
        limit: 200,
      });

      // ── Auto-fix critical issues ────────────────────────────────
      let autoFixed = 0;

      // 1. Submit never-submitted pages
      const neverSubmitted = summary.pagesNeedingAttention.filter(
        p => p.topIssue.includes("Never submitted")
      );
      if (neverSubmitted.length > 0 && Date.now() - cronStart < BUDGET_MS - 5_000) {
        try {
          const { submitPage } = await import("@/lib/discovery/fix-engine");
          for (const page of neverSubmitted.slice(0, 5)) {
            if (Date.now() - cronStart > BUDGET_MS - 3_000) break;
            const r = await submitPage(page.slug, siteId);
            if (r.success) autoFixed++;
          }
        } catch (err) {
          console.warn(`[discovery-monitor] Auto-submit failed for ${siteId}:`, err instanceof Error ? err.message : String(err));
        }
      }

      // 2. Fix placeholder links
      const placeholderPages = summary.pagesNeedingAttention.filter(
        p => p.topIssue.includes("placeholder")
      );
      if (placeholderPages.length > 0 && Date.now() - cronStart < BUDGET_MS - 5_000) {
        try {
          const { fixPlaceholders } = await import("@/lib/discovery/fix-engine");
          for (const page of placeholderPages.slice(0, 3)) {
            if (Date.now() - cronStart > BUDGET_MS - 3_000) break;
            const r = await fixPlaceholders(page.slug, siteId);
            if (r.success) autoFixed++;
          }
        } catch (err) {
          console.warn(`[discovery-monitor] Auto-fix placeholders failed for ${siteId}:`, err instanceof Error ? err.message : String(err));
        }
      }

      // 3. Fix H1 headings
      const h1Pages = summary.pagesNeedingAttention.filter(
        p => p.topIssue.includes("H1")
      );
      if (h1Pages.length > 0 && Date.now() - cronStart < BUDGET_MS - 3_000) {
        try {
          const { fixHeadings } = await import("@/lib/discovery/fix-engine");
          for (const page of h1Pages.slice(0, 5)) {
            if (Date.now() - cronStart > BUDGET_MS - 2_000) break;
            const r = await fixHeadings(page.slug, siteId);
            if (r.success) autoFixed++;
          }
        } catch (err) {
          console.warn(`[discovery-monitor] Auto-fix headings failed for ${siteId}:`, err instanceof Error ? err.message : String(err));
        }
      }

      results[siteId] = {
        totalPages: summary.totalPages,
        totalIssues: summary.totalIssues,
        autoFixed,
        score: summary.overallScore,
        grade: summary.overallGrade,
      };

      console.log(`[discovery-monitor] ${siteId}: ${summary.totalPages} pages, ${summary.totalIssues} issues, ${autoFixed} auto-fixed, grade ${summary.overallGrade}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[discovery-monitor] Failed for ${siteId}:`, msg);
      results[siteId] = { totalPages: 0, totalIssues: 0, autoFixed: 0, score: 0, grade: "F" };
    }
  }

  // Log cron execution
  try {
    await prisma.cronJobLog.create({
      data: {
        job_name: "discovery-monitor",
        status: "completed",
        started_at: new Date(cronStart),
        completed_at: new Date(),
        duration_ms: Date.now() - cronStart,
        items_processed: Object.values(results).reduce((s, r) => s + r.totalPages, 0),
        items_succeeded: Object.values(results).reduce((s, r) => s + r.autoFixed, 0),
        result_summary: results,
        sites_processed: Object.keys(results),
      },
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
