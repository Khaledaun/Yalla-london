export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { logCronExecution } from "@/lib/cron-logger";

/**
 * DEPRECATED — daily-publish cron route
 *
 * This route queried TopicProposals with status "approved", but that status is
 * never set by any active pipeline step. Topics go through:
 *   planned → ready → queued → generated → drafted → published
 *
 * The functional publish path is `/api/cron/scheduled-publish` (runs 9 AM + 4 PM UTC).
 * Content reaches BlogPost via: weekly-topics → content-builder → content-selector → scheduled-publish.
 *
 * This route is kept as a no-op stub because dashboard components reference it
 * (health-monitoring, automation-status, pipeline API). Deleting it would break those UIs.
 *
 * See AUDIT-LOG.md KG-029 for full analysis.
 */

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await logCronExecution("daily-publish", "completed", {
    durationMs: 0,
    resultSummary: { deprecated: true, message: "Route deprecated — use scheduled-publish instead" },
  });

  return NextResponse.json({
    success: true,
    deprecated: true,
    message: 'daily-publish is deprecated. Publishing is handled by /api/cron/scheduled-publish.',
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("healthcheck") === "true") {
    return NextResponse.json({
      status: 'healthy',
      endpoint: 'daily-publish cron',
      deprecated: true,
      message: 'Route deprecated — use scheduled-publish instead',
      timestamp: new Date().toISOString(),
    });
  }

  return POST(request);
}
