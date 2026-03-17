import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { getQueueSnapshot } = await import("@/lib/content-pipeline/queue-monitor");
    const siteId = request.nextUrl.searchParams.get("siteId") || undefined;
    const snapshot = await getQueueSnapshot(siteId);

    return NextResponse.json(snapshot);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[queue-monitor] GET failed:", msg);
    return NextResponse.json({ error: "Failed to load queue snapshot" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { action, ruleId, siteId } = body;

    if (action === "fix" && ruleId) {
      const { executeQueueFix } = await import("@/lib/content-pipeline/queue-monitor");
      const result = await executeQueueFix(ruleId, siteId);
      return NextResponse.json(result);
    }

    if (action === "fix-all") {
      const { autoFixAll } = await import("@/lib/content-pipeline/queue-monitor");
      const results = await autoFixAll(siteId);
      return NextResponse.json({ results, totalFixed: results.reduce((s, r) => s + r.affectedCount, 0) });
    }

    if (action === "snapshot") {
      const { getQueueSnapshot } = await import("@/lib/content-pipeline/queue-monitor");
      const snapshot = await getQueueSnapshot(siteId);
      return NextResponse.json(snapshot);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[queue-monitor] POST failed:", msg);
    return NextResponse.json({ error: "Failed to execute action" }, { status: 500 });
  }
}
