/**
 * AI Costs & Provider Diagnostics
 *
 * Tests: provider configuration, usage logging, cost tracking, task routing.
 */

import type { DiagnosticResult } from "../types";

const SECTION = "ai-costs";

function pass(id: string, name: string, detail: string, explanation: string): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "pass", detail, explanation };
}
function warn(id: string, name: string, detail: string, explanation: string, diagnosis?: string): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "warn", detail, explanation, diagnosis };
}
function fail(id: string, name: string, detail: string, explanation: string, diagnosis?: string): DiagnosticResult {
  return { id: `${SECTION}-${id}`, section: SECTION, name, status: "fail", detail, explanation, diagnosis };
}

const aiModelsSection = async (
  siteId: string,
  _budgetMs: number,
  _startTime: number,
): Promise<DiagnosticResult[]> => {
  const results: DiagnosticResult[] = [];

  // ── 1. AI Provider API Keys ────────────────────────────────────────
  const providers = [
    { key: "XAI_API_KEY", name: "xAI (Grok)", role: "Primary content generation" },
    { key: "OPENAI_API_KEY", name: "OpenAI", role: "Fallback generation" },
    { key: "ANTHROPIC_API_KEY", name: "Anthropic (Claude)", role: "Quality assessment" },
    { key: "GOOGLE_AI_API_KEY", name: "Google AI", role: "Optional provider" },
  ];

  let configuredCount = 0;
  for (const p of providers) {
    const key = process.env[p.key];
    if (key && key.length > 10) {
      configuredCount++;
      results.push(pass(`provider-${p.key.toLowerCase()}`, `${p.name}`, `API key configured`, `${p.name} — ${p.role}. This provider is available for AI tasks like content generation, SEO analysis, and quality scoring.`));
    } else {
      const severity = p.key === "XAI_API_KEY" ? "fail" : "warn";
      if (severity === "fail") {
        results.push(fail(`provider-${p.key.toLowerCase()}`, `${p.name}`, `${p.key} not set`, `${p.name} — ${p.role}. This is the primary AI provider. Without it, content generation will not work.`, "Set the XAI_API_KEY environment variable with your Grok API key."));
      } else {
        results.push(warn(`provider-${p.key.toLowerCase()}`, `${p.name}`, `${p.key} not set`, `${p.name} — ${p.role}. Optional but recommended for provider redundancy.`, "This provider isn't configured. The platform will use available alternatives."));
      }
    }
  }

  if (configuredCount >= 2) {
    results.push(pass("provider-redundancy", "Provider Redundancy", `${configuredCount} providers configured — failover available`, "Having multiple AI providers means if one goes down, tasks can route to alternatives. This prevents content pipeline stalls."));
  } else if (configuredCount === 1) {
    results.push(warn("provider-redundancy", "Provider Redundancy", "Only 1 provider — no failover", "Having multiple AI providers prevents pipeline stalls if one goes down.", "Configure at least 2 AI providers for redundancy."));
  } else {
    results.push(fail("provider-redundancy", "Provider Redundancy", "No AI providers configured", "AI providers are required for content generation, SEO analysis, and quality scoring.", "At minimum, set XAI_API_KEY to enable content generation."));
  }

  // ── 2. Usage Logging (ApiUsageLog) ─────────────────────────────────
  try {
    const { prisma } = await import("@/lib/db");

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [totalCalls, recentCalls, failedCalls] = await Promise.all([
      prisma.apiUsageLog.count(),
      prisma.apiUsageLog.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.apiUsageLog.count({ where: { createdAt: { gte: oneDayAgo }, success: false } }),
    ]);

    if (totalCalls > 0) {
      const successRate = recentCalls > 0 ? Math.round(((recentCalls - failedCalls) / recentCalls) * 100) : 100;
      results.push(pass("usage-logging", "Usage Logging", `${totalCalls} total calls logged — ${recentCalls} today`, "AI usage logging tracks every API call with token counts and costs. This helps you monitor spending and detect anomalies."));

      if (successRate >= 95) {
        results.push(pass("success-rate", "AI Success Rate (24h)", `${successRate}% — ${recentCalls} calls, ${failedCalls} failed`, "Success rate of AI API calls in the last 24 hours. Target: 95%+. Low rates indicate provider issues or bad prompts."));
      } else if (successRate >= 80) {
        results.push(warn("success-rate", "AI Success Rate (24h)", `${successRate}% — ${failedCalls} failed out of ${recentCalls}`, "Success rate of AI API calls in the last 24 hours.", "Some AI calls are failing. Check provider status and API key validity."));
      } else {
        results.push(fail("success-rate", "AI Success Rate (24h)", `${successRate}% — ${failedCalls} of ${recentCalls} calls failed`, "Success rate of AI API calls.", "Most AI calls are failing. Check your API keys and provider status."));
      }

      // Cost estimate
      try {
        const costData = await prisma.apiUsageLog.aggregate({
          where: { createdAt: { gte: oneDayAgo } },
          _sum: { estimatedCostUsd: true, totalTokens: true },
        });
        const dailyCost = costData._sum.estimatedCostUsd || 0;
        const dailyTokens = costData._sum.totalTokens || 0;

        results.push(pass("daily-cost", "Daily AI Cost", `$${dailyCost.toFixed(4)} — ${dailyTokens.toLocaleString()} tokens`, "Estimated AI spending for today. Monitor this to keep costs predictable. Typical daily cost: $0.50-$5.00 depending on content volume."));
      } catch (err) {
        console.warn("[diagnostics:ai-models] Cost aggregate failed:", err instanceof Error ? err.message : String(err));
      }
    } else {
      results.push(warn("usage-logging", "Usage Logging", "No API calls logged yet", "AI usage logging tracks every API call with costs.", "The ApiUsageLog table exists but has no records. AI calls will start logging automatically."));
    }

    // Per-site cost if siteId provided
    if (siteId) {
      try {
        const siteCost = await prisma.apiUsageLog.aggregate({
          where: { siteId, createdAt: { gte: oneDayAgo } },
          _sum: { estimatedCostUsd: true },
          _count: true,
        });
        if (siteCost._count > 0) {
          results.push(pass("site-cost", `Site Cost (${siteId})`, `$${(siteCost._sum.estimatedCostUsd || 0).toFixed(4)} — ${siteCost._count} calls today`, "AI spending for this specific site today. Helps identify which sites consume the most AI resources."));
        }
      } catch {
        // Per-site cost not critical
      }
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("P2021") || msg.includes("does not exist")) {
      results.push(warn("usage-logging", "Usage Logging", "ApiUsageLog table missing", "AI usage logging requires the ApiUsageLog table. Run prisma db push to create it."));
    } else {
      results.push(warn("usage-logging", "Usage Logging", `Error: ${msg}`, "Checks AI usage logging status."));
    }
  }

  // ── 3. Task Routing ────────────────────────────────────────────────
  try {
    const { prisma } = await import("@/lib/db");
    const routeCount = await prisma.modelRoute.count();
    if (routeCount > 0) {
      results.push(pass("task-routing", "AI Task Routing", `${routeCount} task route(s) configured`, "Task routing maps AI tasks (content generation, SEO, scoring, etc.) to specific providers. This allows using the best provider for each task type."));
    } else {
      results.push(warn("task-routing", "AI Task Routing", "No custom routes — using defaults", "Task routing maps AI tasks to providers.", "Configure custom routes in the AI Config tab to optimize provider selection per task."));
    }
  } catch {
    results.push(warn("task-routing", "AI Task Routing", "Could not check routes", "Checks AI task routing configuration."));
  }

  return results;
};

export default aiModelsSection;
