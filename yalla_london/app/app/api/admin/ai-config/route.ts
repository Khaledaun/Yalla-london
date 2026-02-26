/**
 * AI Config API
 *
 * GET  — Returns all ModelProvider records + ModelRoute assignments + env-var key status.
 *        Falls back to env-var defaults if DB is empty.
 *
 * PUT  — Save route assignments (primary + fallback provider per task type).
 *        Upserts ModelRoute records in the database.
 *
 * POST — { action: 'test_all' } — calls each configured provider with a simple
 *        test prompt and returns latency + success/failure for each.
 *
 * Auth: withAdminAuth on all handlers.
 *
 * Note: This route delegates heavily to lib/ai/provider-config.ts which already
 * implements the canonical getAllRoutes / saveRoutes / getProviderForTask logic.
 * We do NOT duplicate that logic here.
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { getAllRoutes, saveRoutes, TASK_LABELS, TaskType } from "@/lib/ai/provider-config";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ProviderInfo {
  id: string;
  name: string;
  displayName: string;
  isActive: boolean;
  hasKey: boolean;
  testStatus: string | null;
  lastTestedAt: string | null;
}

interface RouteInfo {
  taskType: string;
  label: string;
  primary: string;
  primaryModel: string;
  fallback: string | null;
  status: "active" | "fallback_only" | "inactive";
}

interface ProviderKeyStatus {
  XAI_API_KEY: boolean;
  ANTHROPIC_API_KEY: boolean;
  OPENAI_API_KEY: boolean;
  GOOGLE_AI_API_KEY: boolean;
}

// Provider metadata — used for UI display
const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  grok: "xAI Grok",
  claude: "Anthropic Claude",
  openai: "OpenAI GPT",
  gemini: "Google Gemini",
};

const PROVIDER_ENV_KEYS: Record<string, string[]> = {
  grok: ["XAI_API_KEY", "GROK_API_KEY"],
  claude: ["ANTHROPIC_API_KEY"],
  openai: ["OPENAI_API_KEY"],
  gemini: ["GOOGLE_AI_API_KEY", "GOOGLE_API_KEY"],
};

function providerHasKey(name: string): boolean {
  return (PROVIDER_ENV_KEYS[name] ?? []).some((k) => !!process.env[k]);
}

// ─────────────────────────────────────────────
// GET — Read current config
// ─────────────────────────────────────────────

export const GET = withAdminAuth(async (_req: NextRequest) => {
  try {
    const { prisma } = await import("@/lib/db");

    // ── Provider key status (env vars only — never expose secrets) ──
    const providerKeyStatus: ProviderKeyStatus = {
      XAI_API_KEY: !!(process.env.XAI_API_KEY || process.env.GROK_API_KEY),
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      GOOGLE_AI_API_KEY: !!(process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY),
    };

    // ── Providers from DB ─────────────────────────────────
    const providerNames = Object.keys(PROVIDER_DISPLAY_NAMES);
    const providers: ProviderInfo[] = [];

    interface DbProviderRow {
      id: string;
      name: string;
      display_name: string;
      is_active: boolean;
      test_status: string | null;
      last_tested_at: Date | null;
    }

    try {
      const rawDbProviders = await prisma.modelProvider.findMany({
        where: { provider_type: "llm" },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          display_name: true,
          is_active: true,
          test_status: true,
          last_tested_at: true,
        },
      });
      const dbProviders = rawDbProviders as unknown as DbProviderRow[];

      // Build a set of provider names that have DB records
      const dbProviderMap = new Map<string, DbProviderRow>(dbProviders.map((p) => [p.name, p]));

      for (const name of providerNames) {
        const dbRecord = dbProviderMap.get(name);
        providers.push({
          id: dbRecord?.id ?? `env-${name}`,
          name,
          displayName: dbRecord?.display_name ?? PROVIDER_DISPLAY_NAMES[name] ?? name,
          isActive: dbRecord?.is_active ?? providerHasKey(name),
          hasKey: providerHasKey(name),
          testStatus: dbRecord?.test_status ?? null,
          lastTestedAt: dbRecord?.last_tested_at?.toISOString() ?? null,
        });
      }

      // Include any extra DB providers not in our known list
      for (const [dbName, dbRecord] of dbProviderMap) {
        if (!(providerNames as readonly string[]).includes(dbName)) {
          providers.push({
            id: dbRecord.id,
            name: dbName,
            displayName: dbRecord.display_name,
            isActive: dbRecord.is_active,
            hasKey: providerHasKey(dbName),
            testStatus: dbRecord.test_status ?? null,
            lastTestedAt: dbRecord.last_tested_at?.toISOString() ?? null,
          });
        }
      }
    } catch (err) {
      console.warn("[ai-config] ModelProvider query failed, returning env-only data:", err instanceof Error ? err.message : err);

      // Fallback: build providers from env vars only
      for (const name of providerNames) {
        providers.push({
          id: `env-${name}`,
          name,
          displayName: PROVIDER_DISPLAY_NAMES[name] ?? name,
          isActive: providerHasKey(name),
          hasKey: providerHasKey(name),
          testStatus: null,
          lastTestedAt: null,
        });
      }
    }

    // ── Routes from DB (via provider-config.ts) ───────────
    let routes: RouteInfo[] = [];
    try {
      const rawRoutes = await getAllRoutes();
      routes = rawRoutes.map((r) => ({
        taskType: r.taskType,
        label: r.label,
        primary: r.primary,
        primaryModel: r.primaryModel,
        fallback: r.fallback,
        status: r.status,
      }));
    } catch (err) {
      console.warn("[ai-config] getAllRoutes failed, returning empty routes:", err instanceof Error ? err.message : err);

      // Return a skeleton row for every known task type
      for (const [taskType, label] of Object.entries(TASK_LABELS)) {
        routes.push({
          taskType,
          label,
          primary: "grok",
          primaryModel: "grok-4-1-fast",
          fallback: null,
          status: providerHasKey("grok") ? "active" : "inactive",
        });
      }
    }

    return NextResponse.json({ providers, routes, providerKeyStatus });
  } catch (err) {
    console.warn("[ai-config] GET handler error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to load AI config" }, { status: 500 });
  }
});

// ─────────────────────────────────────────────
// PUT — Save route assignments
// ─────────────────────────────────────────────

export const PUT = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();

    if (!body?.routes || !Array.isArray(body.routes)) {
      return NextResponse.json({ error: "routes array is required" }, { status: 400 });
    }

    const routesToSave: Array<{ taskType: TaskType; primary: string; fallback: string | null }> = [];

    for (const r of body.routes) {
      if (!r.taskType || !r.primary) {
        return NextResponse.json(
          { error: `Each route entry requires taskType and primary. Got: ${JSON.stringify(r)}` },
          { status: 400 },
        );
      }

      // Validate taskType is a known value
      if (!(r.taskType in TASK_LABELS)) {
        return NextResponse.json(
          { error: `Unknown taskType: ${r.taskType}. Valid types: ${Object.keys(TASK_LABELS).join(", ")}` },
          { status: 400 },
        );
      }

      routesToSave.push({
        taskType: r.taskType as TaskType,
        primary: String(r.primary),
        fallback: r.fallback ? String(r.fallback) : null,
      });
    }

    try {
      await saveRoutes(routesToSave);
    } catch (err) {
      console.warn("[ai-config] saveRoutes failed:", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { success: false, error: "Failed to save routes to database" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, updated: routesToSave.length });
  } catch (err) {
    console.warn("[ai-config] PUT handler error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to save AI config" }, { status: 500 });
  }
});

// ─────────────────────────────────────────────
// POST — Test all providers
// ─────────────────────────────────────────────

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();

    if (body?.action !== "test_all") {
      return NextResponse.json(
        { error: `Unknown action: ${body?.action}. Supported: test_all` },
        { status: 400 },
      );
    }

    const TEST_PROMPT = "Say hello in exactly 5 words.";

    // Identify which providers have keys configured
    const providerNames = ["grok", "claude", "openai", "gemini"] as const;
    const providerEnvMap: Record<string, string[]> = {
      grok: ["XAI_API_KEY", "GROK_API_KEY"],
      claude: ["ANTHROPIC_API_KEY"],
      openai: ["OPENAI_API_KEY"],
      gemini: ["GOOGLE_AI_API_KEY", "GOOGLE_API_KEY"],
    };

    const { prisma } = await import("@/lib/db");
    const { generateCompletion } = await import("@/lib/ai/provider");

    interface TestResult {
      provider: string;
      success: boolean;
      latencyMs: number;
      error?: string;
    }

    const results: TestResult[] = await Promise.all(
      providerNames.map(async (name) => {
        const hasKey = (providerEnvMap[name] ?? []).some((k) => !!process.env[k]);
        if (!hasKey) {
          return {
            provider: name,
            success: false,
            latencyMs: 0,
            error: "No API key configured",
          };
        }

        const t0 = Date.now();
        try {
          await generateCompletion(
            [{ role: "user", content: TEST_PROMPT }],
            { provider: name, maxTokens: 50, temperature: 0 },
          );
          const latencyMs = Date.now() - t0;

          // Update test_status in DB (best-effort, non-fatal)
          try {
            const existing = await prisma.modelProvider.findFirst({
              where: { name, provider_type: "llm" },
            });
            if (existing) {
              await prisma.modelProvider.update({
                where: { id: existing.id },
                data: {
                  test_status: "success",
                  last_tested_at: new Date(),
                },
              });
            }
          } catch (dbErr) {
            console.warn(`[ai-config] DB update after test failed for ${name}:`, dbErr instanceof Error ? dbErr.message : dbErr);
          }

          return { provider: name, success: true, latencyMs };
        } catch (err) {
          const latencyMs = Date.now() - t0;
          const errMsg = err instanceof Error ? err.message : String(err);

          // Update test_status in DB (best-effort)
          try {
            const existing = await prisma.modelProvider.findFirst({
              where: { name, provider_type: "llm" },
            });
            if (existing) {
              await prisma.modelProvider.update({
                where: { id: existing.id },
                data: {
                  test_status: "failed",
                  last_tested_at: new Date(),
                },
              });
            }
          } catch (dbErr) {
            console.warn(`[ai-config] DB update after test failed for ${name}:`, dbErr instanceof Error ? dbErr.message : dbErr);
          }

          console.warn(`[ai-config] Provider test failed for ${name}:`, errMsg);
          return {
            provider: name,
            success: false,
            latencyMs,
            error: errMsg.slice(0, 200), // truncate — no internal details to client
          };
        }
      }),
    );

    return NextResponse.json({ results });
  } catch (err) {
    console.warn("[ai-config] POST handler error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Provider test failed" }, { status: 500 });
  }
});
