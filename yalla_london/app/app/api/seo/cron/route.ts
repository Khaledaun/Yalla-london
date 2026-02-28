export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { runAutomatedIndexing, pingSitemaps, type IndexingReport } from "@/lib/seo/indexing-service";
import { getActiveSiteIds, getSiteDomain } from "@/config/sites";
import { logCronExecution } from "@/lib/cron-logger";

const BUDGET_MS = 53_000; // 53s usable out of 60s maxDuration

/**
 * After IndexNow/GSC submission, update URLIndexingStatus so the
 * verify-indexing cron knows these URLs have been submitted.
 * Without this, URLs stay in "discovered" forever (KG-052).
 */
/**
 * After IndexNow/GSC submission, update URLIndexingStatus for URLs that
 * were ACTUALLY processed in this run. Only transitions URLs that were
 * submitted within the last 10 minutes (not all discovered/pending ever).
 * This prevents a successful sitemap ping from marking ancient URLs as "submitted".
 */
async function trackSubmittedUrls(report: IndexingReport, siteId: string) {
  if (report.urlsProcessed === 0) return;

  const indexNowSuccess = report.indexNow.some((r) => r.success);
  const gscSuccess = report.sitemapPings?.google_gsc === true;

  // Only track if at least one submission channel succeeded
  if (!indexNowSuccess && !gscSuccess) return;

  try {
    const { prisma } = await import("@/lib/db");

    // Only update URLs that are still pending AND were created/updated recently.
    // This prevents blanket-updating ancient URLs that weren't part of this run.
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    await prisma.uRLIndexingStatus.updateMany({
      where: {
        site_id: siteId,
        status: { in: ["discovered", "pending"] },
        OR: [
          { created_at: { gte: tenMinutesAgo } },
          { updated_at: { gte: tenMinutesAgo } },
        ],
      },
      data: {
        status: "submitted",
        submitted_indexnow: indexNowSuccess || undefined,
        submitted_sitemap: gscSuccess || undefined,
        last_submitted_at: new Date(),
      },
    });
  } catch (e) {
    console.warn(`[SEO-CRON] Failed to track submitted URLs for ${siteId}:`, e instanceof Error ? e.message : e);
  }
}

/**
 * Cron endpoint for automated SEO tasks
 *
 * Can be triggered by:
 * - Vercel Cron (add to vercel.json)
 * - External cron service (cron-job.org, easycron.com)
 * - GitHub Actions
 *
 * Vercel Cron config example (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/seo/cron",
 *     "schedule": "0 6 * * *"
 *   }]
 * }
 */

// Verify cron secret to prevent unauthorized access
// If CRON_SECRET is configured and doesn't match, reject.
// If CRON_SECRET is NOT configured, allow — Vercel crons don't send secrets unless configured.
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return true; // No secret configured — allow (Vercel crons work without CRON_SECRET)
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;

  // Healthcheck mode — quick response confirming endpoint is alive
  if (searchParams.get("healthcheck") === "true") {
    try {
      const { prisma } = await import("@/lib/db");
      let lastRun = null;
      try {
        lastRun = await prisma.cronJobLog.findFirst({
          where: { job_name: "seo-cron" },
          orderBy: { started_at: "desc" },
          select: { status: true, started_at: true, duration_ms: true },
        });
      } catch {
        // cron_job_logs table may not exist yet — still healthy
        await prisma.$queryRaw`SELECT 1`;
      }
      return NextResponse.json({
        status: "healthy",
        endpoint: "seo-cron",
        lastRun,
        timestamp: new Date().toISOString(),
      });
    } catch {
      return NextResponse.json(
        { status: "unhealthy", endpoint: "seo-cron" },
        { status: 503 },
      );
    }
  }

  const task = searchParams.get("task") || "daily";

  const startTime = Date.now();
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    task,
    actions: [],
  };

  console.log(`[SEO-CRON] Starting task="${task}" at ${results.timestamp}`);

  try {
    // Run indexing per-site to prevent cross-site URL contamination.
    // Previously ran without siteId, which collected ALL posts from ALL sites
    // and submitted them under a single domain (yalla-london.com).
    const activeSites = getActiveSiteIds();

    switch (task) {
      case "daily":
        for (const sid of activeSites) {
          if (Date.now() - startTime > BUDGET_MS) {
            console.log(`[SEO-CRON] Budget exhausted (${Date.now() - startTime}ms), skipping remaining sites`);
            break;
          }
          try {
            const siteUrl = getSiteDomain(sid);
            const dailyReport = await runAutomatedIndexing("updated", sid, siteUrl);
            await trackSubmittedUrls(dailyReport, sid);
            results.actions.push({ name: "submit_updated", site: sid, report: dailyReport });
            console.log(
              `[SEO-CRON] Daily [${sid}]: processed ${dailyReport.urlsProcessed} URLs, errors: ${dailyReport.errors.length}`,
            );

            // ── Resubmit "discovered" URLs stuck for >24h ─────────────────
            // These are pages Google found but hasn't crawled yet. Aggressive
            // IndexNow resubmission accelerates crawl for these stuck URLs.
            if (Date.now() - startTime < BUDGET_MS - 5_000) {
              try {
                const { prisma } = await import("@/lib/db");
                const { submitToIndexNow } = await import("@/lib/seo/indexing-service");
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const stuckUrls = await prisma.uRLIndexingStatus.findMany({
                  where: {
                    site_id: sid,
                    status: { in: ["discovered", "pending"] },
                    last_submitted_at: { lt: oneDayAgo },
                  },
                  select: { url: true, id: true },
                  take: 50, // Batch covers all 46 discovered pages in one run
                  orderBy: { last_submitted_at: "asc" }, // Oldest submissions first
                });
                if (stuckUrls.length > 0) {
                  const indexNowKey = process.env.INDEXNOW_KEY;
                  if (indexNowKey) {
                    await submitToIndexNow(stuckUrls.map(u => u.url), siteUrl);
                    // Update last_submitted_at so we don't resubmit the same URLs every run
                    await prisma.uRLIndexingStatus.updateMany({
                      where: { id: { in: stuckUrls.map(u => u.id) } },
                      data: { last_submitted_at: new Date(), submitted_indexnow: true },
                    });
                    console.log(`[SEO-CRON] Resubmitted ${stuckUrls.length} stuck "discovered" URLs for ${sid}`);
                    results.actions.push({ name: "resubmit_stuck", site: sid, count: stuckUrls.length });
                  }
                }
              } catch (stuckErr) {
                console.warn(`[SEO-CRON] Stuck URL resubmission failed for ${sid}:`, stuckErr instanceof Error ? stuckErr.message : stuckErr);
              }
            }
          } catch (siteErr) {
            const msg = siteErr instanceof Error ? siteErr.message : String(siteErr);
            results.actions.push({ name: "submit_updated", site: sid, error: msg });
            console.error(`[SEO-CRON] Daily [${sid}] FAILED: ${msg}`);
          }
        }
        break;

      case "weekly":
        for (const sid of activeSites) {
          if (Date.now() - startTime > BUDGET_MS) {
            console.log(`[SEO-CRON] Budget exhausted (${Date.now() - startTime}ms), skipping remaining sites`);
            break;
          }
          try {
            const siteUrl = getSiteDomain(sid);
            const weeklyReport = await runAutomatedIndexing("all", sid, siteUrl);
            await trackSubmittedUrls(weeklyReport, sid);
            results.actions.push({ name: "submit_all", site: sid, report: weeklyReport });
            console.log(
              `[SEO-CRON] Weekly [${sid}]: processed ${weeklyReport.urlsProcessed} URLs, errors: ${weeklyReport.errors.length}`,
            );
          } catch (siteErr) {
            const msg = siteErr instanceof Error ? siteErr.message : String(siteErr);
            results.actions.push({ name: "submit_all", site: sid, error: msg });
            console.error(`[SEO-CRON] Weekly [${sid}] FAILED: ${msg}`);
          }
        }
        break;

      case "ping":
        // Just ping sitemaps
        const pings = await pingSitemaps();
        results.actions.push({ name: "sitemap_ping", results: pings });
        console.log(`[SEO-CRON] Ping: ${JSON.stringify(pings)}`);
        break;

      case "new":
        for (const sid of activeSites) {
          if (Date.now() - startTime > BUDGET_MS) {
            console.log(`[SEO-CRON] Budget exhausted (${Date.now() - startTime}ms), skipping remaining sites`);
            break;
          }
          try {
            const siteUrl = getSiteDomain(sid);
            const newReport = await runAutomatedIndexing("new", sid, siteUrl);
            await trackSubmittedUrls(newReport, sid);
            results.actions.push({ name: "submit_new", site: sid, report: newReport });
            console.log(
              `[SEO-CRON] New [${sid}]: processed ${newReport.urlsProcessed} URLs, errors: ${newReport.errors.length}`,
            );
          } catch (siteErr) {
            const msg = siteErr instanceof Error ? siteErr.message : String(siteErr);
            results.actions.push({ name: "submit_new", site: sid, error: msg });
            console.error(`[SEO-CRON] New [${sid}] FAILED: ${msg}`);
          }
        }
        break;

      default:
        return NextResponse.json({ error: "Invalid task" }, { status: 400 });
    }

    const durationMs = Date.now() - startTime;
    results.success = true;
    results.durationMs = durationMs;
    console.log(`[SEO-CRON] Completed task="${task}" in ${durationMs}ms`);

    const totalUrlsProcessed = results.actions.reduce((sum: number, a: any) => sum + (a.report?.urlsProcessed || 0), 0);
    const siteErrors = results.actions.filter((a: any) => a.error).length;

    await logCronExecution(`seo-cron-${task}`, siteErrors > 0 && totalUrlsProcessed === 0 ? "failed" : "completed", {
      durationMs,
      itemsProcessed: totalUrlsProcessed,
      itemsSucceeded: totalUrlsProcessed,
      itemsFailed: siteErrors,
      sitesProcessed: activeSites,
      resultSummary: { task, actionsCount: results.actions.length, totalUrlsProcessed, siteErrors },
    }).catch((e: unknown) => console.warn("[SEO-CRON] Failed to log execution:", e));

    return NextResponse.json(results);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    results.success = false;
    results.error = String(error);
    results.durationMs = durationMs;
    console.error(
      `[SEO-CRON] FAILED task="${task}" after ${durationMs}ms: ${error}`,
    );

    await logCronExecution(`seo-cron-${task}`, "failed", {
      durationMs,
      errorMessage: error instanceof Error ? error.message : String(error),
    }).catch((e: unknown) => console.warn("[SEO-CRON] Failed to log execution:", e));

    return NextResponse.json(results, { status: 500 });
  }
}

// Also support POST for webhook-style triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
