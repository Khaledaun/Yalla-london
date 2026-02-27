export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";

/**
 * API Security — Real provider detection from env vars.
 * No mock data. Returns honest empty state when no keys are configured.
 */

const PROVIDERS = [
  { name: "grok", displayName: "Grok (xAI)", envKeys: ["XAI_API_KEY", "GROK_API_KEY"] },
  { name: "openai", displayName: "OpenAI", envKeys: ["OPENAI_API_KEY"] },
  { name: "anthropic", displayName: "Anthropic Claude", envKeys: ["ANTHROPIC_API_KEY"] },
  { name: "google", displayName: "Google AI", envKeys: ["GOOGLE_AI_API_KEY", "GOOGLE_API_KEY"] },
] as const;

function detectConfiguredProviders() {
  return PROVIDERS.map((p) => {
    const configuredKey = p.envKeys.find((k) => !!process.env[k]);
    return {
      name: p.name,
      displayName: p.displayName,
      configured: !!configuredKey,
      envKey: configuredKey ?? p.envKeys[0],
      maskedKey: configuredKey && process.env[configuredKey]
        ? `${process.env[configuredKey]!.slice(0, 6)}...${process.env[configuredKey]!.slice(-4)}`
        : null,
    };
  });
}

// GET — API key status and provider health from real env vars + DB
export const GET = withAdminAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "keys";

  const providers = detectConfiguredProviders();

  switch (type) {
    case "keys": {
      // Return real provider keys from env (masked)
      const keys = providers
        .filter((p) => p.configured)
        .map((p, i) => ({
          id: String(i + 1),
          name: `${p.displayName} API Key`,
          provider: p.name,
          isActive: true,
          maskedKey: p.maskedKey,
          envVar: p.envKey,
        }));
      return NextResponse.json({ keys });
    }

    case "usage": {
      // Query real ApiUsageLog if table exists
      try {
        const { prisma } = await import("@/lib/db");
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const logs = await prisma.apiUsageLog.findMany({
          where: { createdAt: { gte: since } },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            provider: true,
            model: true,
            taskType: true,
            promptTokens: true,
            completionTokens: true,
            estimatedCostUsd: true,
            success: true,
            createdAt: true,
          },
        });
        const totalCost = logs.reduce((s, l) => s + (l.estimatedCostUsd ?? 0), 0);
        const successCount = logs.filter((l) => l.success).length;
        return NextResponse.json({
          logs: logs.map((l) => ({
            id: l.id,
            provider: l.provider,
            model: l.model,
            promptType: l.taskType,
            tokensIn: l.promptTokens,
            tokensOut: l.completionTokens,
            costEst: l.estimatedCostUsd,
            timestamp: l.createdAt.toISOString(),
            success: l.success,
          })),
          summary: {
            totalRequests: logs.length,
            totalTokens: logs.reduce((s, l) => s + (l.promptTokens ?? 0) + (l.completionTokens ?? 0), 0),
            totalCost: Math.round(totalCost * 100) / 100,
            successRate: logs.length > 0 ? Math.round((successCount / logs.length) * 1000) / 10 : 0,
            topProvider: logs[0]?.provider ?? null,
            topModel: logs[0]?.model ?? null,
          },
        });
      } catch {
        // Table may not exist yet
        return NextResponse.json({
          logs: [],
          summary: { totalRequests: 0, totalTokens: 0, totalCost: 0, successRate: 0, topProvider: null, topModel: null },
          _note: "ApiUsageLog table not available — run migration",
        });
      }
    }

    case "providers":
      return NextResponse.json({
        providers: providers.map((p) => ({
          name: p.name,
          displayName: p.displayName,
          configured: p.configured,
          status: p.configured ? "active" : "inactive",
        })),
      });

    case "settings":
      return NextResponse.json({
        settings: {
          configuredProviders: providers.filter((p) => p.configured).length,
          totalProviders: providers.length,
          encryptionAvailable: !!process.env.ENCRYPTION_KEY,
          cronSecretConfigured: !!process.env.CRON_SECRET,
          adminAuthConfigured: !!process.env.NEXTAUTH_SECRET,
        },
      });

    default:
      return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  }
});

// POST — API key management actions (not yet implemented — returns honest error)
export const POST = withAdminAuth(async (request: NextRequest) => {
  const body = await request.json();
  const { action } = body;

  // API Key management is not yet implemented. Return honest response.
  return NextResponse.json(
    {
      success: false,
      error: `API key management action "${action}" is not yet implemented. API keys are currently managed via Vercel environment variables.`,
    },
    { status: 501 },
  );
});
