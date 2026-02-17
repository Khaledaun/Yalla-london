export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { logCronExecution } from "@/lib/cron-logger";

/**
 * Verify Indexing Cron — Checks if submitted URLs are actually indexed by Google
 *
 * Runs daily at 11:00 UTC.
 *
 * Pipeline position:
 *   Content Selector (8:30) → Google Indexing (9:15) → Verify Indexing (11:00)
 *
 * What it does:
 * 1. Finds URLs with status "submitted" or "discovered" that haven't been checked recently
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
    const { getActiveSiteIds, getSiteDomain } = await import("@/config/sites");

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
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    let totalChecked = 0;
    let totalIndexed = 0;
    let totalNotIndexed = 0;
    let totalErrors = 0;
    const siteResults: Array<{ siteId: string; checked: number; indexed: number; notIndexed: number; errors: number }> = [];

    for (const siteId of activeSites) {
      if (Date.now() - cronStart > BUDGET_MS) break;

      const siteUrl = getSiteDomain(siteId);
      gsc.setSiteUrl(siteUrl);

      // Find URLs that need verification:
      // - status is "submitted" or "discovered" (not yet confirmed indexed)
      // - haven't been checked in the last 6 hours
      let urlsToCheck: Array<Record<string, unknown>> = [];
      try {
        urlsToCheck = await prisma.uRLIndexingStatus.findMany({
          where: {
            site_id: siteId,
            status: { in: ["submitted", "discovered"] },
            OR: [
              { last_inspected_at: null },
              { last_inspected_at: { lt: sixHoursAgo } },
            ],
          },
          orderBy: { last_submitted_at: "desc" },
          take: 10, // Rate limit: GSC API has quota of ~600/day
        });
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

      for (const urlRecord of urlsToCheck) {
        if (Date.now() - cronStart > BUDGET_MS) break;

        const url = urlRecord.url as string;
        try {
          const inspection = await gsc.getIndexingStatus(url);

          if (inspection) {
            const isIndexed = inspection.indexingState === "INDEXED" || inspection.indexingState === "PARTIALLY_INDEXED";

            await prisma.uRLIndexingStatus.update({
              where: { id: urlRecord.id as string },
              data: {
                status: isIndexed ? "indexed" : "submitted", // Keep "submitted" if not indexed yet
                indexing_state: inspection.indexingState,
                coverage_state: inspection.coverageState,
                last_inspected_at: new Date(),
                last_crawled_at: inspection.lastCrawlTime ? new Date(inspection.lastCrawlTime) : undefined,
                inspection_result: inspection as unknown as Record<string, unknown>,
                last_error: null,
              },
            });

            if (isIndexed) {
              siteIndexed++;
              console.log(`[verify-indexing] ${url} → INDEXED (${inspection.coverageState})`);
            } else {
              siteNotIndexed++;
              console.log(`[verify-indexing] ${url} → NOT INDEXED (${inspection.coverageState || inspection.indexingState})`);
            }
          } else {
            // GSC returned null — API error or not enough permissions
            await prisma.uRLIndexingStatus.update({
              where: { id: urlRecord.id as string },
              data: {
                last_inspected_at: new Date(),
                last_error: "GSC inspection returned no data — check API permissions",
              },
            });
            siteErrors++;
          }

          siteChecked++;

          // Rate limit: 1 request per second to avoid GSC quota issues
          await new Promise((resolve) => setTimeout(resolve, 1000));
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

      siteResults.push({
        siteId,
        checked: siteChecked,
        indexed: siteIndexed,
        notIndexed: siteNotIndexed,
        errors: siteErrors,
      });
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
