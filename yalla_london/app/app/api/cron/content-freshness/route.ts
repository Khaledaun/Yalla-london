export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Content Freshness Monitor
 *
 * Runs weekly (Sunday 10:00 UTC). Scans published articles for staleness signals:
 *   1. Year references that are now in the past (e.g., "2025" when it's 2026)
 *   2. No update in 6+ months
 *   3. No update in 12+ months
 *
 * Flags stale articles with `needs_refresh` tag so they appear in the cockpit
 * Content Matrix for review. Does NOT modify article content — only flags.
 *
 * Budget: 53s with 7s buffer (Vercel Pro 60s limit).
 */

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

const BUDGET_MS = 280_000;

async function handleFreshnessCheck(request: NextRequest) {
  const cronStart = Date.now();

  // Standard cron auth pattern
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Feature flag guard — can be disabled via DB flag or env var CRON_CONTENT_FRESHNESS=false
  const { checkCronEnabled } = await import("@/lib/cron-feature-guard");
  const flagResponse = await checkCronEnabled("content-freshness");
  if (flagResponse) return flagResponse;

  const { prisma } = await import("@/lib/db");
  const { getActiveSiteIds } = await import("@/config/sites");
  const activeSiteIds = getActiveSiteIds();

  const now = new Date();
  const currentYear = now.getFullYear();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

  const results = {
    scanned: 0,
    staleYearRefs: 0,
    staleSixMonths: 0,
    staleTwelveMonths: 0,
    alreadyFlagged: 0,
    newlyFlagged: 0,
    errors: [] as string[],
  };

  try {
    // Fetch all published articles across active sites
    const articles = await prisma.blogPost.findMany({
      where: {
        siteId: { in: activeSiteIds },
        published: true,
        deletedAt: null,
      },
      select: {
        id: true,
        slug: true,
        title_en: true,
        content_en: true,
        meta_title_en: true,
        tags: true,
        updated_at: true,
        created_at: true,
      },
      orderBy: { updated_at: "asc" },
      take: 500, // Safety limit
    });

    results.scanned = articles.length;

    for (const article of articles) {
      // Budget guard
      if (Date.now() - cronStart > BUDGET_MS) {
        results.errors.push(`Budget exhausted after scanning ${results.scanned} articles`);
        break;
      }

      // Parse existing tags
      let existingTags: string[] = [];
      if (article.tags) {
        try {
          existingTags = typeof article.tags === "string"
            ? JSON.parse(article.tags)
            : Array.isArray(article.tags) ? article.tags : [];
        } catch {
          existingTags = [];
        }
      }

      // Already flagged?
      if (existingTags.includes("needs_refresh")) {
        results.alreadyFlagged++;
        continue;
      }

      let needsRefresh = false;
      const reasons: string[] = [];

      // Check 1: Past year references in title or content
      const contentToCheck = `${article.title_en || ""} ${article.meta_title_en || ""} ${(article.content_en || "").substring(0, 5000)}`;
      for (let year = 2020; year < currentYear; year++) {
        const yearPattern = new RegExp(`\\b${year}\\b`, "g");
        const matches = contentToCheck.match(yearPattern);
        if (matches && matches.length >= 2) {
          // Multiple references to a past year suggest the article is outdated
          needsRefresh = true;
          reasons.push(`past-year-${year}`);
          results.staleYearRefs++;
          break;
        }
      }

      // Check 2: No update in 12+ months (HIGH staleness)
      const lastUpdate = article.updated_at || article.created_at;
      if (lastUpdate && new Date(lastUpdate) < twelveMonthsAgo) {
        needsRefresh = true;
        reasons.push("no-update-12m");
        results.staleTwelveMonths++;
      }
      // Check 3: No update in 6+ months (MEDIUM staleness)
      else if (lastUpdate && new Date(lastUpdate) < sixMonthsAgo) {
        needsRefresh = true;
        reasons.push("no-update-6m");
        results.staleSixMonths++;
      }

      // Flag if stale
      if (needsRefresh) {
        try {
          const newTags = [...existingTags, "needs_refresh"];
          await prisma.blogPost.update({
            where: { id: article.id },
            data: {
              tags: JSON.stringify(newTags),
              // Don't update updated_at — that would reset the staleness clock
            },
          });
          results.newlyFlagged++;
          console.log(`[content-freshness] Flagged "${article.slug}" as stale: ${reasons.join(", ")}`);
        } catch (updateErr) {
          console.warn(`[content-freshness] Failed to flag ${article.slug}:`, updateErr instanceof Error ? updateErr.message : updateErr);
        }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.errors.push(msg);
    console.error("[content-freshness] Fatal error:", msg);
  }

  // Log to CronJobLog for cockpit visibility
  await logCronExecution("content-freshness", results.errors.length > 0 ? "failed" : "completed", {
    durationMs: Date.now() - cronStart,
    resultSummary: results,
  }).catch((err: Error) => console.warn("[content-freshness] Log failed:", err.message));

  return NextResponse.json({
    success: results.errors.length === 0,
    ...results,
    durationMs: Date.now() - cronStart,
  });
}

export async function GET(request: NextRequest) {
  return handleFreshnessCheck(request);
}

export async function POST(request: NextRequest) {
  return handleFreshnessCheck(request);
}
