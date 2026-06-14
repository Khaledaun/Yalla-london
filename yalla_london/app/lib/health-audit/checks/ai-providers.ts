/**
 * Health Audit — AI Provider Checks
 *
 * 4 checks: grok (xAI), openai, claude (Anthropic), perplexity.
 * Each check sends a minimal prompt to verify connectivity and measure latency.
 * Uses raw fetch() — no SDKs imported.
 */

import {
  type AuditConfig,
  type CheckResult,
  makeResult,
  runCheck,
} from "@/lib/health-audit/types";

/* ------------------------------------------------------------------ */
/* Shared helper                                                       */
/* ------------------------------------------------------------------ */

interface ProviderDef {
  name: string;
  envVar: string;
  url: string;
  buildBody: (model: string) => Record<string, unknown>;
  model: string;
  headers?: (key: string) => Record<string, string>;
}

async function probeProvider(
  provider: ProviderDef,
  config: AuditConfig
): Promise<CheckResult> {
  const key = process.env[provider.envVar];
  if (!key) {
    return makeResult("skip", { provider: provider.name, reason: `${provider.envVar} not set` }, {
      action: `Set ${provider.envVar} in environment to enable ${provider.name}.`,
    }) as CheckResult;
  }

  const t0 = Date.now();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(provider.headers ? provider.headers(key) : { Authorization: `Bearer ${key}` }),
  };

  const res = await fetch(provider.url, {
    method: "POST",
    headers,
    body: JSON.stringify(provider.buildBody(provider.model)),
    signal: config.signal,
  });

  const latencyMs = Date.now() - t0;

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const shortErr = text.slice(0, 200);
    return makeResult("fail", { provider: provider.name, latencyMs, httpStatus: res.status }, {
      error: `${provider.name} returned ${res.status}: ${shortErr}`,
      action: `Check ${provider.envVar} validity and account status.`,
    }) as CheckResult;
  }

  // Drain response body (we don't need it)
  await res.json().catch(() => null);

  const status = latencyMs < 5000 ? "pass" : latencyMs < 15000 ? "warn" : "fail";
  return makeResult(status, { provider: provider.name, latencyMs, model: provider.model }, {
    ...(status === "warn" && { action: `${provider.name} responded in ${latencyMs}ms — elevated latency.` }),
    ...(status === "fail" && { error: `${provider.name} latency ${latencyMs}ms exceeds 15s threshold.`, action: "Provider may be overloaded or rate-limited." }),
  }) as CheckResult;
}

/* ------------------------------------------------------------------ */
/* Provider definitions                                                */
/* ------------------------------------------------------------------ */

const PROVIDERS: Record<string, ProviderDef> = {
  grok: {
    name: "Grok (xAI)",
    envVar: "XAI_API_KEY",
    url: "https://api.x.ai/v1/chat/completions",
    model: "grok-4-1-fast",
    buildBody: (model) => ({
      model,
      messages: [{ role: "user", content: "Say OK" }],
      max_tokens: 5,
    }),
  },
  openai: {
    name: "OpenAI",
    envVar: "OPENAI_API_KEY",
    url: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
    buildBody: (model) => ({
      model,
      messages: [{ role: "user", content: "Say OK" }],
      max_tokens: 5,
    }),
  },
  claude: {
    name: "Anthropic Claude",
    envVar: "ANTHROPIC_API_KEY",
    url: "https://api.anthropic.com/v1/messages",
    model: "claude-3-haiku-20240307",
    headers: (key) => ({
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    }),
    buildBody: (model) => ({
      model,
      messages: [{ role: "user", content: "Say OK" }],
      max_tokens: 5,
    }),
  },
  perplexity: {
    name: "Perplexity",
    envVar: "PERPLEXITY_API_KEY",
    url: "https://api.perplexity.ai/chat/completions",
    model: "sonar",
    buildBody: (model) => ({
      model,
      messages: [{ role: "user", content: "Say OK" }],
      max_tokens: 5,
    }),
  },
};

/* ------------------------------------------------------------------ */
/* Individual check functions                                          */
/* ------------------------------------------------------------------ */

async function grokCheck(config: AuditConfig): Promise<CheckResult> {
  return probeProvider(PROVIDERS.grok, config);
}

async function openaiCheck(config: AuditConfig): Promise<CheckResult> {
  return probeProvider(PROVIDERS.openai, config);
}

async function claudeCheck(config: AuditConfig): Promise<CheckResult> {
  return probeProvider(PROVIDERS.claude, config);
}

async function perplexityCheck(config: AuditConfig): Promise<CheckResult> {
  return probeProvider(PROVIDERS.perplexity, config);
}

/* ------------------------------------------------------------------ */
/* Exported runner                                                     */
/* ------------------------------------------------------------------ */
export async function runAIProviderChecks(
  config: AuditConfig
): Promise<Record<string, CheckResult>> {
  const checks: Record<string, (c: AuditConfig) => Promise<CheckResult>> = {
    grokConnectivity: grokCheck,
    openaiConnectivity: openaiCheck,
    claudeConnectivity: claudeCheck,
    perplexityConnectivity: perplexityCheck,
  };

  const results: Record<string, CheckResult> = {};
  for (const [name, fn] of Object.entries(checks)) {
    results[name] = await runCheck(name, fn, config, 20_000); // 20s timeout per provider
  }
  return results;
}
