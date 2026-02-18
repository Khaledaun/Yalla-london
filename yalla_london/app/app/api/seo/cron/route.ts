import { NextRequest, NextResponse } from "next/server";
import { runAutomatedIndexing, pingSitemaps } from "@/lib/seo/indexing-service";

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
    switch (task) {
      case "daily":
        // Daily: Submit new/updated content + ping sitemaps
        const dailyReport = await runAutomatedIndexing("updated");
        results.actions.push({ name: "submit_updated", report: dailyReport });
        console.log(
          `[SEO-CRON] Daily: processed ${dailyReport.urlsProcessed} URLs, errors: ${dailyReport.errors.length}`,
        );
        break;

      case "weekly":
        // Weekly: Submit all content
        const weeklyReport = await runAutomatedIndexing("all");
        results.actions.push({ name: "submit_all", report: weeklyReport });
        console.log(
          `[SEO-CRON] Weekly: processed ${weeklyReport.urlsProcessed} URLs, errors: ${weeklyReport.errors.length}`,
        );
        break;

      case "ping":
        // Just ping sitemaps
        const pings = await pingSitemaps();
        results.actions.push({ name: "sitemap_ping", results: pings });
        console.log(`[SEO-CRON] Ping: ${JSON.stringify(pings)}`);
        break;

      case "new":
        // Submit only new content
        const newReport = await runAutomatedIndexing("new");
        results.actions.push({ name: "submit_new", report: newReport });
        console.log(
          `[SEO-CRON] New: processed ${newReport.urlsProcessed} URLs, errors: ${newReport.errors.length}`,
        );
        break;

      default:
        return NextResponse.json({ error: "Invalid task" }, { status: 400 });
    }

    const durationMs = Date.now() - startTime;
    results.success = true;
    results.durationMs = durationMs;
    console.log(`[SEO-CRON] Completed task="${task}" in ${durationMs}ms`);
    return NextResponse.json(results);
  } catch (error) {
    const durationMs = Date.now() - startTime;
    results.success = false;
    results.error = String(error);
    results.durationMs = durationMs;
    console.error(
      `[SEO-CRON] FAILED task="${task}" after ${durationMs}ms: ${error}`,
    );
    return NextResponse.json(results, { status: 500 });
  }
}

// Also support POST for webhook-style triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
