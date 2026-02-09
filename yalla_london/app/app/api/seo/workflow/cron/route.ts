import { NextRequest, NextResponse } from "next/server";
import {
  runFullSEOWorkflow,
  runIndexingWorkflow,
  verifyAndSubmitForIndexing,
} from "@/lib/seo/seo-workflow-orchestrator";
import { getNewUrls, getAllIndexableUrls } from "@/lib/seo/indexing-service";
import { identifyQuickWins } from "@/lib/seo/content-improvement-agent";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * SEO Workflow Cron Handler
 *
 * Automated SEO maintenance tasks:
 * - Daily: Check and submit new URLs for indexing
 * - Weekly: Run full SEO audit
 * - Identify quick wins for content improvement
 *
 * Secured with CRON_SECRET environment variable.
 *
 * Usage:
 *   GET /api/seo/workflow/cron?task=daily
 *   GET /api/seo/workflow/cron?task=weekly
 *   GET /api/seo/workflow/cron?task=quick-wins
 *
 * Headers:
 *   Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(request: NextRequest) {
  // Verify authorization - require CRON_SECRET in production
  const authHeader = request.headers.get("authorization");
  const providedSecret = authHeader?.replace("Bearer ", "");

  if (!CRON_SECRET && process.env.NODE_ENV === "production") {
    console.error("CRON_SECRET not configured in production");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 503 },
    );
  }

  if (CRON_SECRET && providedSecret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const task = searchParams.get("task") || "daily";
  const startTime = Date.now();

  console.log(
    `[SEO-WORKFLOW-CRON] Starting task="${task}" at ${new Date().toISOString()}`,
  );

  try {
    switch (task) {
      case "daily": {
        // Daily task: Submit new/updated URLs for indexing
        const newUrls = await getNewUrls(1); // Last 24 hours
        let results = null;

        if (newUrls.length > 0) {
          results = await verifyAndSubmitForIndexing(newUrls, true);
        }

        return NextResponse.json({
          success: true,
          task: "daily",
          timestamp: new Date().toISOString(),
          urlsChecked: newUrls.length,
          results: results
            ? {
                submitted: results.filter((r) => r.submittedForIndexing).length,
                alreadyIndexed: results.filter((r) => r.indexed).length,
              }
            : { message: "No new URLs to process" },
        });
      }

      case "weekly": {
        // Weekly task: Full SEO audit
        const report = await runFullSEOWorkflow();

        return NextResponse.json({
          success: report.status === "completed",
          task: "weekly",
          timestamp: new Date().toISOString(),
          report: {
            id: report.id,
            status: report.status,
            summary: report.summary,
            errors: report.errors,
          },
        });
      }

      case "indexing": {
        // Indexing check for all blog posts
        const report = await runIndexingWorkflow();

        return NextResponse.json({
          success: report.status === "completed",
          task: "indexing",
          timestamp: new Date().toISOString(),
          report: {
            id: report.id,
            status: report.status,
            summary: report.summary,
          },
        });
      }

      case "quick-wins": {
        // Identify quick SEO wins
        const quickWins = await identifyQuickWins();

        return NextResponse.json({
          success: true,
          task: "quick-wins",
          timestamp: new Date().toISOString(),
          quickWins: {
            titleOptimizations: quickWins.titleOptimizations.length,
            ctrImprovements: quickWins.ctrImprovements.length,
            easyRankingGains: quickWins.easyRankingGains.length,
            lowHangingFruit: quickWins.lowHangingFruit.length,
          },
          details: quickWins,
        });
      }

      default:
        return NextResponse.json(
          {
            error: "Invalid task",
            validTasks: ["daily", "weekly", "indexing", "quick-wins"],
          },
          { status: 400 },
        );
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(
      `[SEO-WORKFLOW-CRON] FAILED task="${task}" after ${durationMs}ms:`,
      error,
    );
    return NextResponse.json(
      { error: "Cron task failed", details: String(error), durationMs },
      { status: 500 },
    );
  }
}

/**
 * POST handler for triggering cron tasks programmatically
 */
export async function POST(request: NextRequest) {
  // Verify authorization - require CRON_SECRET in production
  const authHeader = request.headers.get("authorization");
  const providedSecret = authHeader?.replace("Bearer ", "");

  if (!CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 503 },
    );
  }

  if (CRON_SECRET && providedSecret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { task = "daily", urls } = body;

    if (task === "submit-urls" && urls) {
      const results = await verifyAndSubmitForIndexing(urls, true);
      return NextResponse.json({
        success: true,
        task: "submit-urls",
        timestamp: new Date().toISOString(),
        results: {
          total: results.length,
          submitted: results.filter((r) => r.submittedForIndexing).length,
          indexed: results.filter((r) => r.indexed).length,
        },
      });
    }

    // Redirect to GET handler for standard tasks
    const url = new URL(request.url);
    url.searchParams.set("task", task);
    return GET(
      new NextRequest(url, {
        headers: request.headers,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process request", details: String(error) },
      { status: 500 },
    );
  }
}
