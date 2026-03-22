import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type ServiceStatus = "ok" | "degraded" | "critical" | "unknown";

interface ServiceCheck {
  name: string;
  status: ServiceStatus;
  latencyMs?: number;
  message?: string;
}

let cachedResult: { services: ServiceCheck[]; overall: ServiceStatus; checked_at: string } | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 60s

async function checkService(name: string, checker: () => Promise<{ ok: boolean; ms?: number; msg?: string }>): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const result: { ok: boolean; ms?: number; msg?: string } = await Promise.race([
      checker(),
      new Promise<{ ok: false; ms: undefined; msg: string }>((resolve) =>
        setTimeout(() => resolve({ ok: false, ms: undefined, msg: "Timeout (5s)" }), 5000)
      ),
    ]);
    return {
      name,
      status: result.ok ? "ok" : "degraded",
      latencyMs: result.ms ?? (Date.now() - start),
      message: result.msg,
    };
  } catch (err) {
    return {
      name,
      status: "critical",
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function GET(request: Request) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  // Return cached result if fresh
  if (cachedResult && Date.now() - cacheTime < CACHE_TTL) {
    return NextResponse.json(cachedResult);
  }

  const services = await Promise.all([
    // 1. Database
    checkService("Database", async () => {
      const { prisma } = await import("@/lib/db");
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true, ms: Date.now() - start };
    }),

    // 2. Grok AI
    checkService("Grok AI", async () => {
      const key = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
      if (!key) return { ok: false, msg: "No API key configured" };
      return { ok: true, msg: "Key configured" };
    }),

    // 3. IndexNow
    checkService("IndexNow", async () => {
      const key = process.env.INDEXNOW_KEY;
      if (!key) return { ok: false, msg: "INDEXNOW_KEY not set" };
      return { ok: true, msg: "Key configured" };
    }),

    // 4. Google Search Console
    checkService("GSC", async () => {
      const email =
        process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL ||
        process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ||
        process.env.GSC_CLIENT_EMAIL;
      const key =
        process.env.GOOGLE_ANALYTICS_PRIVATE_KEY ||
        process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY ||
        process.env.GSC_PRIVATE_KEY;
      if (!email || !key) {
        // Try JSON blob
        const blob = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
        if (blob) {
          try {
            const parsed = JSON.parse(blob);
            if (parsed.client_email && parsed.private_key) return { ok: true, msg: "Configured via service account JSON" };
          } catch { /* fall through */ }
        }
        return { ok: false, msg: "GSC credentials missing" };
      }
      return { ok: true, msg: "Credentials configured" };
    }),

    // 5. GA4
    checkService("GA4", async () => {
      const propId = process.env.GA4_PROPERTY_ID;
      const measureId = process.env.GA4_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
      if (!propId) return { ok: false, msg: "GA4_PROPERTY_ID not set" };
      if (!measureId || measureId === "G-XXXXX") return { ok: false, msg: "GA4_MEASUREMENT_ID is placeholder" };
      return { ok: true, msg: "Configured" };
    }),

    // 6. CJ Affiliate
    checkService("CJ Affiliate", async () => {
      const token = process.env.CJ_API_TOKEN;
      const wid = process.env.CJ_WEBSITE_ID;
      if (!token || !wid) return { ok: false, msg: "CJ credentials missing" };
      return { ok: true, msg: "Configured" };
    }),

    // 7. Crons (check last 1h for any successful run)
    checkService("Crons", async () => {
      const { prisma } = await import("@/lib/db");
      const oneHourAgo = new Date(Date.now() - 3600_000);
      const recentSuccess = await prisma.cronJobLog.count({
        where: { status: "completed", started_at: { gte: oneHourAgo } },
      });
      if (recentSuccess === 0) return { ok: false, msg: "No successful crons in last hour" };
      return { ok: true, msg: `${recentSuccess} successful runs in last hour` };
    }),
  ]);

  // Compute overall
  const hasAnyCritical = services.some((s) => s.status === "critical");
  const hasManyDegraded = services.filter((s) => s.status === "degraded").length >= 3;
  const overall: ServiceStatus = hasAnyCritical ? "critical" : hasManyDegraded ? "degraded" : "ok";

  const result = {
    services,
    overall,
    checked_at: new Date().toISOString(),
  };

  cachedResult = result;
  cacheTime = Date.now();

  return NextResponse.json(result);
}
