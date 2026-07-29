/**
 * Cron: Affiliate URL Backfill — DRY RUN
 *
 * GET/POST /api/cron/affiliate-rebuild-dry
 *
 * Vercel-cron-callable wrapper around the existing admin endpoint
 * `/api/admin/affiliate-rebuild`. Designed to be triggered manually via the
 * Vercel dashboard's "Run cron now" button when CRON_SECRET is sensitive
 * and not curl-able from the outside.
 *
 * This route is **read-only** — it always passes `dry_run: true` and a small
 * `limit: 10` so the operator can inspect the diff in the cron run log
 * before triggering the live variant.
 *
 * Auth: Vercel-cron-only. Accepts the request if either
 *   - `x-vercel-cron: 1` header is present, OR
 *   - `user-agent` contains `vercel-cron`.
 * No Bearer fallback — this route is **not** exposed for external curl.
 * The companion admin route `/api/admin/affiliate-rebuild` remains
 * Bearer-guarded and is still the canonical programmatic entry.
 *
 * Schedule in vercel.json is `0 0 29 2 *` (Feb 29 — leap day only) so the
 * route effectively never auto-fires. It only runs when an operator clicks
 * the "Run" button.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { POST as affiliateRebuildPOST } from "@/app/api/admin/affiliate-rebuild/route";

function isVercelCron(req: NextRequest): boolean {
  if (req.headers.get("x-vercel-cron") === "1") return true;
  const ua = req.headers.get("user-agent") || "";
  if (ua.toLowerCase().includes("vercel-cron")) return true;
  return false;
}

async function handle(request: NextRequest) {
  if (!isVercelCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured on server" },
      { status: 500 },
    );
  }

  // Build an internal NextRequest carrying the Bearer the admin handler
  // expects. We import the POST handler directly so this stays in-process
  // (no extra HTTP roundtrip) and CRON_SECRET never leaves the runtime.
  const body = { dry_run: true as const, limit: 10 };
  const internalReq = new NextRequest(
    new URL("http://internal/api/admin/affiliate-rebuild"),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cronSecret}`,
      },
      body: JSON.stringify(body),
    },
  );

  const upstream = await affiliateRebuildPOST(internalReq);
  const data = await upstream.json().catch(() => ({}));

  // Echo to stdout — Vercel cron run logs surface this for the operator.
  console.log(
    "[cron/affiliate-rebuild-dry] dry_run summary:",
    JSON.stringify({
      ok: data?.ok ?? false,
      posts_scanned: data?.posts_scanned,
      posts_with_changes: data?.posts_with_changes,
      total_swaps: data?.total_swaps,
      total_drops: data?.total_drops,
    }),
  );

  return NextResponse.json(
    {
      ok: data?.ok ?? false,
      mode: "dry_run",
      invoked_via: "vercel-cron",
      ...data,
    },
    { status: upstream.status },
  );
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
