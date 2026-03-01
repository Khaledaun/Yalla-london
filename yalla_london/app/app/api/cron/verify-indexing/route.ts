export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

/**
 * Verify Indexing Cron — Checks if submitted URLs are actually indexed by Google
 *
 * Runs twice daily at 11:00 and 17:00 UTC.
 * GSC API quota: 2,000 inspections/day per property.
 * Target throughput: ~150 URLs per run × 2 runs = ~300 URLs/day.
 *
 * Pipeline position:
 *   Content Selector (8:30) → Google Indexing (9:15) → Verify Indexing (11:00, 17:00)
 *
 * What it does:
 * 1. Priority-based queue: never-inspected → submitted >7d → errors → discovered → indexed re-check
 * 2. Uses Google Search Console URL Inspection API to verify indexing state
 * 3. Updates URLIndexingStatus with real coverage/indexing data from Google
 * 4. Logs results for dashboard visibility
 */

async function handleVerifyIndexing(request: NextRequest) {
  const cronStart = Date.now();
  const BUDGET_MS = 53_000;

  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Healthcheck mode
    if (request.nextUrl.searchParams.get("healthcheck") === "true") {
      const { GoogleSearchConsole } = await import("@/lib/integrations/google-search-console");
      const gsc = new GoogleSearchConsole();
      return NextResponse.json({
        status: "healthy",
        endpoint: "verify-indexing",
        gscConfigured: gsc.isConfigured(),
        timestamp: new Date().toISOString(),
      });
    }

    const { prisma } = await import("@/lib/db");
    const { GoogleSearchConsole } = await import("@/lib/integrations/google-search-console");
    const { getActiveSiteIds, getSiteSeoConfig } = await import("@/config/sites");

    const gsc = new GoogleSearchConsole();
    if (!gsc.isConfigured()) {
      await logCronExecution("verify-indexing", "completed", {
        durationMs: Date.now() - cronStart,
        resultSummary: { message: "GSC not configured — skipping verification. Set GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL and GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY." },
      });
      return NextResponse.json({
        success: true,
        message: "GSC not configured — skipping verification",
        timestamp: new Date().toISOString(),
      });
    }

    const activeSites = getActiveSiteIds();
    // Timing thresholds for priority queue
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    // Per-site budget: 50 URLs per site per run
    // Math: 35 URLs × 600ms rate-limit = 21s, leaving 32s for queue building + rate-drop checks.
    // Reduced from 50 (30s API time) to prevent 53 runs exceeding 50s threshold.
    const MAX_PER_SITE = 35;

    let totalChecked = 0;
    let totalIndexed = 0;
    let totalNotIndexed = 0;
    let totalErrors = 0;
    let totalAutoResubmitted = 0;
    let totalChronicFailures = 0;
    let totalHreflangMismatches = 0;
    const siteResults: Array<{
      siteId: string; checked: number; indexed: number; notIndexed: number;
      errors: number; autoResubmitted: number; chronicFailures: number; hreflangMismatches: number;
    }> = [];

    for (const siteId of activeSites) {
      if (Date.now() - cronStart > BUDGET_MS) break;

      // CRITICAL: Use the GSC property URL (e.g. "sc-domain:yalla-london.com"),
      // NOT getSiteDomain() which returns "https://www.yalla-london.com".
      // Domain properties in GSC require the sc-domain: prefix.
      const seoConfig = getSiteSeoConfig(siteId);
      gsc.setSiteUrl(seoConfig.gscSiteUrl);

      // Priority-based verification queue:
      // P1: Never inspected (brand new tracking records)
      // P2: Submitted >7d ago still not indexed (stuck)
      // P3: Error status (inspect again to see if resolved)
      // P4: Discovered/submitted not checked in 4h
      // P5: Indexed URLs not re-checked in 14d (catch deindexing)
      // Slots filled top-down from P1→P5 until MAX_PER_SITE reached
      let urlsToCheck: Array<Record<string, unknown>> = [];
      let remaining = MAX_PER_SITE;
      try {
        // P1: Never inspected — highest priority
        if (remaining > 0) {
          const neverInspected = await prisma.uRLIndexingStatus.findMany({
            where: {
              site_id: siteId,
              last_inspected_at: null,
              status: { in: ["submitted", "discovered", "pending"] },
            },
            orderBy: { last_submitted_at: "desc" },
            take: remaining,
          });
          urlsToCheck.push(...neverInspected);
          remaining -= neverInspected.length;
        }

        // P2: Submitted >7d ago, still not indexed — stuck pages
        if (remaining > 0) {
          const existingIds = urlsToCheck.map(u => u.id as string);
          const stuck = await prisma.uRLIndexingStatus.findMany({
            where: {
              site_id: siteId,
              status: { in: ["submitted", "discovered", "pending"] },
              last_submitted_at: { lt: sevenDaysAgo },
              last_inspected_at: { lt: fourHoursAgo },
              ...(existingIds.length > 0 ? { id: { notIn: existingIds } } : {}),
            },
            orderBy: { last_submitted_at: "asc" },
            take: remaining,
          });
          urlsToCheck.push(...stuck);
          remaining -= stuck.length;
        }

        // P3: Error status — re-check if resolved
        if (remaining > 0) {
          const existingIds = urlsToCheck.map(u => u.id as string);
          const errors = await prisma.uRLIndexingStatus.findMany({
            where: {
              site_id: siteId,
              status: "error",
              last_inspected_at: { lt: fourHoursAgo },
              ...(existingIds.length > 0 ? { id: { notIn: existingIds } } : {}),
            },
            orderBy: { last_inspected_at: "asc" },
            take: remaining,
          });
          urlsToCheck.push(...errors);
          remaining -= errors.length;
        }

        // P4: Discovered/submitted not checked in 4h (routine checks)
        if (remaining > 0) {
          const existingIds = urlsToCheck.map(u => u.id as string);
          const routine = await prisma.uRLIndexingStatus.findMany({
            where: {
              site_id: siteId,
              status: { in: ["submitted", "discovered", "pending"] },
              last_inspected_at: { not: null, lt: fourHoursAgo },
              ...(existingIds.length > 0 ? { id: { notIn: existingIds } } : {}),
            },
            orderBy: { last_inspected_at: "asc" },
            take: remaining,
          });
          urlsToCheck.push(...routine);
          remaining -= routine.length;
        }

        // P5: Indexed re-check every 14 days (catch deindexing)
        if (remaining > 0) {
          const recheck = await prisma.uRLIndexingStatus.findMany({
            where: {
              site_id: siteId,
              status: "indexed",
              OR: [
                { last_inspected_at: null },
                { last_inspected_at: { lt: fourteenDaysAgo } },
              ],
            },
            orderBy: { last_inspected_at: "asc" },
            take: remaining,
          });
          urlsToCheck.push(...recheck);
          remaining -= recheck.length;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("does not exist") || msg.includes("P2021")) {
          return NextResponse.json({
            success: false,
            message: "URLIndexingStatus table not found. Run Fix Database first.",
            timestamp: new Date().toISOString(),
          });
        }
        throw e;
      }

      let siteChecked = 0;
      let siteIndexed = 0;
      let siteNotIndexed = 0;
      let siteErrors = 0;
      let siteAutoResubmitted = 0;
      let siteChronicFailures = 0;
      let siteHreflangMismatches = 0;

      for (const urlRecord of urlsToCheck) {
        if (Date.now() - cronStart > BUDGET_MS) break;

        const url = urlRecord.url as string;
        try {
          const inspection = await gsc.getIndexingStatus(url);

          if (inspection) {
            // Check both indexingState and coverageState — GSC can report indexing
            // through either field depending on the URL's lifecycle stage
            const indexingStateMatch = inspection.indexingState === "INDEXED" || inspection.indexingState === "PARTIALLY_INDEXED";
            const coverageStateMatch = typeof inspection.coverageState === "string" &&
              inspection.coverageState.toLowerCase().includes("indexed");
            const isIndexed = indexingStateMatch || coverageStateMatch;

            const previousStatus = urlRecord.status as string;
            const attempts = (urlRecord.submission_attempts as number) || 0;

            // Determine detailed status for URLs not yet indexed
            let status = "submitted";
            if (isIndexed) {
              status = "indexed";
            } else if (inspection.coverageState) {
              // Map GSC coverage states to our status values
              const cs = inspection.coverageState.toLowerCase();
              if (cs.includes("crawled") || cs.includes("discovered")) {
                status = "discovered";
              }
              // "submitted" stays as default for everything else
            }

            // ── Deindexing detection & auto-resubmit ──
            // If a URL was previously indexed but GSC now says it's not,
            // reset to "discovered" so the next google-indexing run resubmits it.
            const wasIndexed = previousStatus === "indexed";
            const nowDeindexed = wasIndexed && !isIndexed;
            if (nowDeindexed) {
              status = "discovered"; // triggers resubmission
              console.warn(`[verify-indexing] DEINDEXED: ${url} — was indexed, now ${inspection.coverageState || inspection.indexingState}. Queued for auto-resubmit.`);
              siteAutoResubmitted++;
            }

            // ── Chronic failure detection ──
            // URLs submitted 5+ times that still aren't indexed need investigation.
            const isChronicFailure = !isIndexed && attempts >= 5;
            if (isChronicFailure) {
              status = "chronic_failure";
              siteChronicFailures++;
              console.warn(`[verify-indexing] CHRONIC FAILURE: ${url} — ${attempts} submission attempts, still not indexed`);
            }

            const updateData: Record<string, unknown> = {
              status,
              indexing_state: inspection.indexingState,
              coverage_state: inspection.coverageState,
              last_inspected_at: new Date(),
              last_crawled_at: inspection.lastCrawlTime ? new Date(inspection.lastCrawlTime) : undefined,
              inspection_result: inspection as unknown as Record<string, unknown>,
              last_error: isChronicFailure
                ? `Chronic failure: ${attempts} attempts, not indexed (${inspection.coverageState || "unknown"})`
                : null,
            };

            // If deindexed, reset submission flags so google-indexing resubmits
            if (nowDeindexed) {
              updateData.submitted_indexnow = false;
              updateData.submitted_sitemap = false;
              updateData.submitted_google_api = false;
              updateData.submission_attempts = attempts + 1;
            }

            await prisma.uRLIndexingStatus.update({
              where: { id: urlRecord.id as string },
              data: updateData,
            });

            if (isIndexed) {
              siteIndexed++;
              console.log(`[verify-indexing] ${url} → INDEXED (${inspection.coverageState})`);

              // ── Hreflang reciprocity check ──
              // When a URL is indexed, check if its counterpart (/ar/... or without /ar/) is also indexed.
              // Mismatches hurt SEO — Google expects hreflang pairs to both be indexable.
              try {
                const urlObj = new URL(url);
                const path = urlObj.pathname;
                let counterpartPath: string | null = null;
                if (path.startsWith("/ar/") || path === "/ar") {
                  // AR URL → find EN counterpart
                  counterpartPath = path === "/ar" ? "/" : path.replace(/^\/ar/, "");
                } else {
                  // EN URL → find AR counterpart
                  counterpartPath = path === "/" ? "/ar" : `/ar${path}`;
                }
                if (counterpartPath) {
                  const counterpartUrl = `${urlObj.origin}${counterpartPath}`;
                  const counterpart = await prisma.uRLIndexingStatus.findFirst({
                    where: { site_id: siteId, url: counterpartUrl },
                    select: { status: true, indexing_state: true },
                  });
                  if (counterpart && counterpart.status !== "indexed" &&
                      counterpart.indexing_state !== "INDEXED" && counterpart.indexing_state !== "PARTIALLY_INDEXED") {
                    siteHreflangMismatches++;
                    console.warn(`[verify-indexing] HREFLANG MISMATCH: ${url} is indexed but counterpart ${counterpartUrl} is ${counterpart.status}`);
                  }
                }
              } catch { /* hreflang check is non-critical */ }
            } else {
              siteNotIndexed++;
              console.log(`[verify-indexing] ${url} → NOT INDEXED (${inspection.coverageState || inspection.indexingState})`);
            }
          } else {
            // GSC returned null — this is normal for very new URLs that Google
            // hasn't discovered yet. NOT necessarily an API permission error.
            const daysSinceSubmit = urlRecord.last_submitted_at
              ? Math.floor((Date.now() - new Date(urlRecord.last_submitted_at as string).getTime()) / 86400000)
              : 0;
            const errorMsg = daysSinceSubmit < 3
              ? `URL too new for GSC inspection (submitted ${daysSinceSubmit}d ago) — Google needs time to discover it`
              : "GSC inspection returned no data — URL may not be in Google's index yet";
            await prisma.uRLIndexingStatus.update({
              where: { id: urlRecord.id as string },
              data: {
                last_inspected_at: new Date(),
                last_error: errorMsg,
              },
            });
            siteErrors++;
          }

          siteChecked++;

          // Rate limit: 600ms between requests (GSC handles ~2 req/s)
          await new Promise((resolve) => setTimeout(resolve, 600));
        } catch (inspectErr) {
          const errMsg = inspectErr instanceof Error ? inspectErr.message : String(inspectErr);
          console.error(`[verify-indexing] Failed to inspect ${url}:`, errMsg);

          await prisma.uRLIndexingStatus.update({
            where: { id: urlRecord.id as string },
            data: {
              last_inspected_at: new Date(),
              last_error: errMsg.substring(0, 300),
            },
          }).catch(() => {});

          siteErrors++;
          siteChecked++;

          // If we get a 429 or quota error, stop for this run
          if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("rate")) {
            console.warn("[verify-indexing] Rate limited — stopping early");
            break;
          }
        }
      }

      totalChecked += siteChecked;
      totalIndexed += siteIndexed;
      totalNotIndexed += siteNotIndexed;
      totalErrors += siteErrors;
      totalAutoResubmitted += siteAutoResubmitted;
      totalChronicFailures += siteChronicFailures;
      totalHreflangMismatches += siteHreflangMismatches;

      siteResults.push({
        siteId,
        checked: siteChecked,
        indexed: siteIndexed,
        notIndexed: siteNotIndexed,
        errors: siteErrors,
        autoResubmitted: siteAutoResubmitted,
        chronicFailures: siteChronicFailures,
        hreflangMismatches: siteHreflangMismatches,
      });
    }

    // ── Rate drop alerting ──────────────────────────────────────────────
    // Compare current vs previous 7d indexing rate. If rate dropped >15pp, log critical.
    // Budget guard: skip if less than 15s remaining — this runs 4 count queries per site
    // which can take 5-10s on large tables. Better to skip than timeout.
    if (Date.now() - cronStart < BUDGET_MS - 15_000) {
      try {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgoAlert = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        for (const siteId of activeSites) {
          if (Date.now() - cronStart > BUDGET_MS - 8_000) break; // inner budget check — 8s per site for 4 count queries

          const [currentIndexed, totalTracked] = await Promise.all([
            prisma.uRLIndexingStatus.count({ where: { site_id: siteId, status: "indexed" } }),
            prisma.uRLIndexingStatus.count({ where: { site_id: siteId } }),
          ]);
          const currentRate = totalTracked > 0 ? (currentIndexed / totalTracked) * 100 : 0;

          // Count how many were indexed 7d ago (those indexed before that window)
          const [indexedThisWeek, indexedLastWeek] = await Promise.all([
            prisma.uRLIndexingStatus.count({
              where: { site_id: siteId, status: "indexed", updated_at: { gte: sevenDaysAgo } },
            }),
            prisma.uRLIndexingStatus.count({
              where: {
                site_id: siteId, status: "indexed",
                updated_at: { gte: fourteenDaysAgoAlert, lt: sevenDaysAgo },
              },
            }),
          ]);

          // Alert if velocity dropped significantly (not just rate)
          if (indexedLastWeek >= 15 && indexedThisWeek < indexedLastWeek * 0.5) {
            console.error(`[verify-indexing] RATE DROP ALERT: ${siteId} — ${indexedThisWeek} indexed this week vs ${indexedLastWeek} last week (${currentRate.toFixed(0)}% overall rate)`);
            await logCronExecution("verify-indexing-rate-alert", "completed", {
              durationMs: 0,
              resultSummary: {
                alert: "INDEXING_RATE_DROP",
                siteId,
                currentRate: Math.round(currentRate),
                indexedThisWeek,
                indexedLastWeek,
                message: `Indexing velocity dropped: ${indexedThisWeek} new this week vs ${indexedLastWeek} last week`,
              },
            });
          }
        }
      } catch (rateErr) {
        console.warn("[verify-indexing] Rate drop check failed:", rateErr instanceof Error ? rateErr.message : String(rateErr));
      }
    } else {
      console.log("[verify-indexing] Budget exhausted — skipping rate drop check");
    }

    const durationMs = Date.now() - cronStart;

    await logCronExecution("verify-indexing", "completed", {
      durationMs,
      itemsProcessed: totalChecked,
      itemsSucceeded: totalIndexed,
      itemsFailed: totalNotIndexed + totalErrors,
      resultSummary: {
        totalChecked,
        totalIndexed,
        totalNotIndexed,
        totalErrors,
        totalAutoResubmitted,
        totalChronicFailures,
        totalHreflangMismatches,
        sites: siteResults,
      },
    });

    return NextResponse.json({
      success: true,
      durationMs,
      totalChecked,
      totalIndexed,
      totalNotIndexed,
      totalErrors,
      totalAutoResubmitted,
      totalChronicFailures,
      totalHreflangMismatches,
      sites: siteResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[verify-indexing] Cron failed:", errMsg);

    await logCronExecution("verify-indexing", "failed", {
      durationMs: Date.now() - cronStart,
      errorMessage: errMsg,
    }).catch(() => {});

    const { onCronFailure } = await import("@/lib/ops/failure-hooks");
    onCronFailure({ jobName: "verify-indexing", error: errMsg }).catch(() => {});

    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleVerifyIndexing(request);
}

export async function POST(request: NextRequest) {
  return handleVerifyIndexing(request);
}
