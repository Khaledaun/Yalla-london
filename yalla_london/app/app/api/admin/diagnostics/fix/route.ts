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

const FIX_HANDLERS: Record<string, FixHandler> = {
  // Fix: Push Prisma schema to database (creates missing tables/columns)
  db_push: async () => {
    try {
      const { prisma } = await import("@/lib/db");
      // Verify connection first
      await prisma.$queryRaw`SELECT 1`;
      return {
        success: true,
        message: "Database connection verified. To create missing tables, run `npx prisma db push` from your deployment pipeline or terminal.",
        details: { note: "Prisma db push cannot be run from within a serverless function. Use your CI/CD pipeline or Vercel CLI." },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Database connection failed: ${msg}` };
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
  generate_topics: async () => {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (process.env.CRON_SECRET) headers["x-cron-secret"] = process.env.CRON_SECRET;

      const res = await fetch(`${baseUrl}/api/cron/weekly-topics`, { method: "GET", headers });
      const data = await res.json().catch(() => ({}));
      return {
        success: res.ok,
        message: res.ok ? "Weekly topics cron triggered successfully" : `Topics cron failed: HTTP ${res.status}`,
        details: data,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Failed to trigger topics: ${msg}` };
    }
  },

  // Fix: Run content builder
  run_content_builder: async () => {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (process.env.CRON_SECRET) headers["x-cron-secret"] = process.env.CRON_SECRET;

      const res = await fetch(`${baseUrl}/api/cron/content-builder`, { method: "GET", headers });
      const data = await res.json().catch(() => ({}));
      return {
        success: res.ok,
        message: res.ok ? "Content builder triggered" : `Content builder failed: HTTP ${res.status}`,
        details: data,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Failed to trigger builder: ${msg}` };
    }
  },

  // Fix: Submit all to IndexNow
  submit_indexnow: async (payload) => {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
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
  run_seo_agent: async () => {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (process.env.CRON_SECRET) headers["x-cron-secret"] = process.env.CRON_SECRET;

      const res = await fetch(`${baseUrl}/api/cron/seo-agent`, { method: "GET", headers });
      const data = await res.json().catch(() => ({}));
      return {
        success: res.ok,
        message: res.ok ? "SEO agent triggered" : `SEO agent failed: HTTP ${res.status}`,
        details: data,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Failed: ${msg}` };
    }
  },

  // Fix: Run content auto-fix
  run_content_autofix: async () => {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (process.env.CRON_SECRET) headers["x-cron-secret"] = process.env.CRON_SECRET;

      const res = await fetch(`${baseUrl}/api/cron/content-auto-fix`, { method: "GET", headers });
      const data = await res.json().catch(() => ({}));
      return {
        success: res.ok,
        message: res.ok ? "Content auto-fix triggered" : `Auto-fix failed: HTTP ${res.status}`,
        details: data,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Failed: ${msg}` };
    }
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
