export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

export const POST = withAdminAuth(async (request: NextRequest) => {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // No body is OK — will use defaults
  }

  const siteId = (body.siteId as string) || request.headers.get("x-site-id") || getDefaultSiteId();

  try {
    const { autoGenerateTasks } = await import("@/lib/dev-tasks/auto-generator");
    const result = await autoGenerateTasks(siteId);

    return NextResponse.json({
      success: true,
      siteId,
      created: result.created,
      skipped: result.skipped,
      scanned: result.tasks.length,
      message: result.created > 0
        ? `Created ${result.created} new task(s), skipped ${result.skipped} duplicate(s)`
        : result.skipped > 0
          ? `All ${result.skipped} detected issue(s) already have open tasks`
          : "No issues detected — system looks healthy",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("P2021") || msg.includes("does not exist")) {
      return NextResponse.json({
        _migrationNeeded: true,
        message: "DevTask table not found — run npx prisma db push",
      });
    }
    console.error("[dev-tasks/auto-generate] Error:", msg);
    return NextResponse.json({ error: "Failed to auto-generate tasks" }, { status: 500 });
  }
});
