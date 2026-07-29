export const dynamic = "force-dynamic";
export const maxDuration = 45;

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

// Full content pipeline: topics → drafts → build → select → publish → affiliate → index → SEO
const CRON_JOBS = [
  { name: "weekly-topics", path: "/api/cron/weekly-topics" },
  { name: "daily-content-generate", path: "/api/cron/daily-content-generate" },
  { name: "content-builder", path: "/api/cron/content-builder" },
  { name: "content-selector", path: "/api/cron/content-selector" },
  { name: "scheduled-publish", path: "/api/cron/scheduled-publish" },
  { name: "affiliate-injection", path: "/api/cron/affiliate-injection" },
  { name: "google-indexing", path: "/api/cron/google-indexing" },
  { name: "seo-agent", path: "/api/cron/seo-agent" },
];

/**
 * POST /api/admin/run-all-crons
 *
 * Fires all key cron jobs in PARALLEL. Each cron runs in its own
 * serverless function, so they don't share our timeout budget.
 * We wait up to 38s for results, then report whatever finished.
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    // VERCEL_URL = current deployment URL (correct for preview branches)
    // NEXT_PUBLIC_SITE_URL = production domain (wrong for previews)
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL || null;

    if (!baseUrl) {
      return NextResponse.json(
        { success: false, error: "No base URL configured (VERCEL_URL or NEXT_PUBLIC_SITE_URL)" },
        { status: 500 },
      );
    }

    const cronSecret = process.env.CRON_SECRET;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (cronSecret) {
      headers["authorization"] = `Bearer ${cronSecret}`;
    }

    // Fire all jobs in parallel — each runs in its own serverless function
    const promises = CRON_JOBS.map(async (job) => {
      const url = `${baseUrl}${job.path}`;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers,
          signal: AbortSignal.timeout(38_000),
        });

        let data: any = null;
        try {
          data = await res.json();
        } catch {
          // Response may not be JSON
        }

        return {
          name: job.name,
          status: res.status,
          ok: res.ok,
          data,
          error: !res.ok
            ? data?.error || data?.message || `HTTP ${res.status} ${res.statusText}`
            : undefined,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Request failed";
        return {
          name: job.name,
          status: 0,
          ok: false,
          error: msg.includes("abort") ? "Timed out (>38s)" : msg,
        };
      }
    });

    const results = await Promise.allSettled(promises);
    const mapped = results.map((r) =>
      r.status === "fulfilled"
        ? r.value
        : { name: "unknown", status: 0, ok: false, error: "Promise rejected" },
    );

    const succeeded = mapped.filter((r) => r.ok).length;
    const failed = mapped.filter((r) => !r.ok).length;

    return NextResponse.json({
      success: failed === 0,
      message: `${succeeded}/${mapped.length} cron jobs completed successfully${failed > 0 ? `, ${failed} failed` : ""}`,
      baseUrlUsed: baseUrl,
      results: mapped,
    });
  } catch (error) {
    console.error("Run all crons error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
});
