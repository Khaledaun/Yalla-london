export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

const CRON_JOBS = [
  { name: "content-builder", path: "/api/cron/content-builder" },
  { name: "content-selector", path: "/api/cron/content-selector" },
  { name: "affiliate-injection", path: "/api/cron/affiliate-injection" },
  { name: "seo-agent", path: "/api/cron/seo-agent" },
];

/**
 * POST /api/admin/run-all-crons
 * Triggers key cron jobs in sequence. Returns results for each job.
 */
export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

    if (!baseUrl) {
      return NextResponse.json(
        { success: false, error: "No base URL configured (NEXT_PUBLIC_SITE_URL or VERCEL_URL)" },
        { status: 500 },
      );
    }

    const cronSecret = process.env.CRON_SECRET;
    const results: Array<{ name: string; status: number; ok: boolean; data?: any; error?: string }> = [];

    // Run cron jobs in sequence
    for (const job of CRON_JOBS) {
      try {
        const url = `${baseUrl}${job.path}`;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (cronSecret) {
          headers["authorization"] = `Bearer ${cronSecret}`;
        }

        const res = await fetch(url, {
          method: "POST",
          headers,
          signal: AbortSignal.timeout(55_000), // 55s timeout per job
        });

        let data: any = null;
        try {
          data = await res.json();
        } catch {
          // Response may not be JSON
        }

        results.push({
          name: job.name,
          status: res.status,
          ok: res.ok,
          data,
        });
      } catch (err) {
        results.push({
          name: job.name,
          status: 0,
          ok: false,
          error: err instanceof Error ? err.message : "Request failed",
        });
      }
    }

    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    return NextResponse.json({
      success: failed === 0,
      message: `${succeeded}/${results.length} cron jobs completed successfully${failed > 0 ? `, ${failed} failed` : ""}`,
      results,
    });
  } catch (error) {
    console.error("Run all crons error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
});
