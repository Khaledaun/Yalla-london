export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

// ── Fix Action Registry ──────────────────────────────────────────────────────
// Maps fixType → handler. Each handler returns { success, message, details? }.

type FixHandler = (payload: Record<string, unknown>) => Promise<{
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}>;

// Helper: build base URL and auth headers for internal cron calls
function getCronFetchConfig(): { baseUrl: string; headers: Record<string, string> } {
  const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Cron endpoints check Authorization: Bearer header, NOT x-cron-secret
  if (process.env.CRON_SECRET) headers["Authorization"] = `Bearer ${process.env.CRON_SECRET}`;
  return { baseUrl, headers };
}

// Helper: trigger a cron endpoint server-side with proper auth
async function triggerCron(cronPath: string, label: string): Promise<{ success: boolean; message: string; details?: Record<string, unknown> }> {
  try {
    const { baseUrl, headers } = getCronFetchConfig();
    const res = await fetch(`${baseUrl}${cronPath}`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(55_000),
    });
    const data = await res.json().catch(() => ({}));
    return {
      success: res.ok,
      message: res.ok ? `${label} triggered successfully` : `${label} failed: HTTP ${res.status}`,
      details: data,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Failed to trigger ${label}: ${msg}` };
  }
}

const FIX_HANDLERS: Record<string, FixHandler> = {
  // Fix: Create missing tables/columns via db-migrate (the REAL fix, not a terminal suggestion)
  db_push: async () => {
    try {
      const { baseUrl, headers } = getCronFetchConfig();
      // First scan for what's missing
      const scanRes = await fetch(`${baseUrl}/api/admin/db-migrate`, { headers });
      const scanData = await scanRes.json();
      if (!scanRes.ok || !scanData.success) {
        return { success: false, message: `Schema scan failed: ${scanData.error || "Unknown error"}` };
      }
      if (!scanData.summary?.needsMigration) {
        return { success: true, message: "Schema is already up to date — no missing tables or columns", details: scanData.summary };
      }
      // Apply the migration
      const fixRes = await fetch(`${baseUrl}/api/admin/db-migrate`, { method: "POST", headers });
      const fixData = await fixRes.json();
      if (!fixRes.ok || !fixData.success) {
        return { success: false, message: `Migration failed: ${fixData.error || "Unknown error"}`, details: fixData };
      }
      const created = fixData.result?.tablesCreated?.length ?? 0;
      const columns = fixData.result?.columnsAdded?.length ?? 0;
      const indexes = fixData.result?.indexesCreated?.length ?? 0;
      return {
        success: true,
        message: `Schema fixed! Created ${created} table(s), added ${columns} column(s), ${indexes} index(es). Run diagnostics again to verify.`,
        details: fixData.result,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Schema fix failed: ${msg}` };
    }
  },

  // Fix: Check DATABASE_URL is valid
  check_db_url: async () => {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return { success: false, message: "DATABASE_URL is not set. Add it to your Vercel environment variables." };
    }
    try {
      const { prisma } = await import("@/lib/db");
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const ms = Date.now() - start;
      return { success: true, message: `Database connection OK (${ms}ms)`, details: { latencyMs: ms } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Connection failed: ${msg}. Check your DATABASE_URL format and network access.` };
    }
  },

  // Fix: Generate topics
  generate_topics: async () => triggerCron("/api/cron/weekly-topics", "Weekly topics"),

  // Fix: Run content builder
  run_content_builder: async () => triggerCron("/api/cron/content-builder", "Content builder"),

  // Fix: Run content selector
  run_content_selector: async () => triggerCron("/api/cron/content-selector", "Content selector"),

  // Fix: Submit all to IndexNow
  submit_indexnow: async (payload) => {
    try {
      const { baseUrl } = getCronFetchConfig();
      const res = await fetch(`${baseUrl}/api/admin/content-indexing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: payload.action || "submit_all" }),
      });
      const data = await res.json().catch(() => ({}));
      return {
        success: res.ok,
        message: res.ok ? "IndexNow submission triggered" : `Submission failed: HTTP ${res.status}`,
        details: data,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Failed: ${msg}` };
    }
  },

  // Fix: Run SEO agent
  run_seo_agent: async () => triggerCron("/api/cron/seo-agent", "SEO agent"),

  // Fix: Run SEO orchestrator
  run_seo_orchestrator: async () => triggerCron("/api/cron/seo-orchestrator", "SEO orchestrator"),

  // Fix: Run content auto-fix
  run_content_autofix: async () => triggerCron("/api/cron/content-auto-fix", "Content auto-fix"),

  // Generic: Run any cron by path (used by crons diagnostics section)
  run_cron: async (payload) => {
    const cronPath = payload.cronPath as string | undefined;
    if (!cronPath || !cronPath.startsWith("/api/")) {
      return { success: false, message: "Invalid cron path" };
    }
    const label = cronPath.split("/").pop()?.split("?")[0] ?? "cron";
    return triggerCron(cronPath, label);
  },
};

// ── POST: Execute a fix action ───────────────────────────────────────────────

export const POST = withAdminAuth(async (request: NextRequest) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { fixType, ...payload } = body;

  if (!fixType || typeof fixType !== "string") {
    return NextResponse.json({ error: "fixType is required" }, { status: 400 });
  }

  const handler = FIX_HANDLERS[fixType];
  if (!handler) {
    return NextResponse.json({
      error: `Unknown fix type: ${fixType}`,
      available: Object.keys(FIX_HANDLERS),
    }, { status: 400 });
  }

  try {
    const result = await handler(payload);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[diagnostics/fix] Fix "${fixType}" error:`, msg);
    return NextResponse.json({
      success: false,
      message: `Fix execution failed: ${msg}`,
    }, { status: 500 });
  }
});
