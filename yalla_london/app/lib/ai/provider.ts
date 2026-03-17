/**
 * AI Provider Integration Layer
 *
 * Unified interface for Grok (xAI), Claude, GPT, and Gemini.
 * Automatically uses the configured API keys from the database or env vars.
 *
 * Grok is preferred for English content generation due to:
 *   - Cost efficiency ($0.20/$0.50 per 1M tokens on grok-4-1-fast)
 *   - 2M token context window (largest in the industry)
 *   - Real-time web & X search via Responses API (see grok-live-search.ts)
 *
 * CRITICAL RULES (see docs/CRITICAL-RULES-INDEX.md):
 * - Rule #5: Arabic is ~2.5x token-dense — maxTokens: 3500 minimum for Arabic.
 * - Rule #8: Promise.all with 15+ queries kills PgBouncer pool. Serialize dashboard builders.
 * - Rule #13: Circuit breaker opens after 3 consecutive failures — 5-min cooldown, half-open probe.
 */

import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

export type AIProvider = 'grok' | 'claude' | 'openai' | 'gemini' | 'perplexity';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  provider?: AIProvider;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  /** Site this call is for — used for per-site cost separation */
  siteId?: string;
  /** Task category (matches TaskType in provider-config.ts) */
  taskType?: string;
  /** Cron/API route that triggered this call — for attribution */
  calledFrom?: string;
  /** Override the default 25s timeout per AI call (milliseconds). Use for dedicated
   *  API routes where each call gets its own 60s Vercel function execution. */
  timeoutMs?: number;
  /** Budget hint from the content pipeline phase. Controls first-provider vs fallback
   *  budget split. 'heavy' phases (drafting, assembly) use adaptive fallback that gives
   *  the next provider 80% of remaining budget on fast failures (<5s). */
  phaseBudgetHint?: 'light' | 'medium' | 'heavy';
}

// ---------------------------------------------------------------------------
// Cost pricing table — USD per 1M tokens [input, output]
// Sources: xAI / Anthropic / OpenAI / Google pricing pages, Feb 2026
// ---------------------------------------------------------------------------
const MODEL_PRICING: Record<string, [number, number]> = {
  // xAI Grok
  'grok-4-1-fast': [0.20, 0.50],
  'grok-4-latest': [3.00, 15.00],
  'grok-beta': [5.00, 15.00],
  'grok-2-1212': [2.00, 10.00],
  // Anthropic Claude (current models as of March 2026)
  'claude-opus-4-6': [15.00, 75.00],
  'claude-sonnet-4-6': [3.00, 15.00],
  'claude-haiku-4-5-20251001': [0.80, 4.00],
  // OpenAI
  'gpt-4-turbo-preview': [10.00, 30.00],
  'gpt-4o': [5.00, 15.00],
  'gpt-4o-mini': [0.15, 0.60],
  'gpt-3.5-turbo': [0.50, 1.50],
  // Google Gemini
  'gemini-pro': [0.125, 0.375],
  'gemini-1.5-pro': [3.50, 10.50],
  'gemini-1.5-flash': [0.075, 0.30],
  'gemini-2.0-flash': [0.10, 0.40],
  // Perplexity
  'sonar-pro': [3.00, 15.00],
  'sonar': [1.00, 1.00],
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = MODEL_PRICING[model] ?? [1.00, 3.00]; // safe fallback
  return (promptTokens / 1_000_000) * pricing[0] + (completionTokens / 1_000_000) * pricing[1];
}

/** Fire-and-forget — logs token usage to ApiUsageLog without blocking the caller */
function logUsage(
  result: AICompletionResult | null,
  options: AICompletionOptions,
  error?: string,
): void {
  const provider = result?.provider ?? (options.provider ?? 'unknown');
  const model = result?.model ?? (options.model ?? 'unknown');
  const promptTokens = result?.usage.promptTokens ?? 0;
  const completionTokens = result?.usage.completionTokens ?? 0;

  import('@/lib/db')
    .then(({ prisma }) =>
      prisma.apiUsageLog.create({
        data: {
          siteId: options.siteId ?? 'unknown',
          provider,
          model,
          taskType: options.taskType ?? null,
          calledFrom: options.calledFrom ?? null,
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          estimatedCostUsd: estimateCost(model, promptTokens, completionTokens),
          success: !error,
          errorMessage: error ? error.slice(0, 500) : null,
        },
      })
    )
    .catch((err) => {
      console.warn('[ai/provider] logUsage failed (non-fatal):', err instanceof Error ? err.message : err);
    });
}

export interface AICompletionResult {
  content: string;
  provider: AIProvider;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Default models per provider
const DEFAULT_MODELS: Record<AIProvider, string> = {
  grok: 'grok-4-1-fast',
  claude: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
  gemini: 'gemini-2.0-flash',
  perplexity: 'sonar-pro',
};

// Provider priority — Grok first (cheapest, fastest, 2M context), then OpenAI, Claude.
// Gemini removed: account frozen by owner — re-add when billing is reactivated.
// Perplexity removed: quota exhausted, billing issue — re-add when resolved.
const PROVIDER_PRIORITY: AIProvider[] = ['grok', 'openai', 'claude'];

// ALL providers that COULD work (checked for API keys at runtime).
// Used by last-defense and probe to find ANY working provider beyond the priority list.
const ALL_PROVIDERS: AIProvider[] = ['grok', 'openai', 'claude', 'gemini', 'perplexity'];

// ---------------------------------------------------------------------------
// Circuit Breaker — prevents wasting 15-28s retrying a dead provider.
// After 3 consecutive failures, the provider is "open" (skipped) for 60s.
// After 60s, one probe request is allowed ("half-open"). If it succeeds,
// the circuit closes. Module-scope state resets on Vercel cold start (fine).
// ---------------------------------------------------------------------------
interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

const circuitBreakers = new Map<AIProvider, CircuitState>();

function getCircuitState(provider: AIProvider): CircuitState {
  if (!circuitBreakers.has(provider)) {
    circuitBreakers.set(provider, { failures: 0, lastFailure: 0, state: 'closed' });
  }
  return circuitBreakers.get(provider)!;
}

/** Returns all circuit breaker states — used by campaign runner to detect all-providers-down */
export function getAllCircuitStates(): Record<string, { state: string; failures: number }> {
  const result: Record<string, { state: string; failures: number }> = {};
  for (const [provider, state] of circuitBreakers.entries()) {
    result[provider] = { state: state.state, failures: state.failures };
  }
  return result;
}

function recordProviderSuccess(provider: AIProvider): void {
  circuitBreakers.set(provider, { failures: 0, lastFailure: 0, state: 'closed' });
}

function recordProviderFailure(provider: AIProvider): void {
  const state = getCircuitState(provider);
  state.failures++;
  state.lastFailure = Date.now();
  if (state.failures >= 3) {
    state.state = 'open';
    console.warn(`[ai/provider] Circuit OPEN for ${provider} — ${state.failures} consecutive failures`);
  }
}

function isProviderAvailable(provider: AIProvider, isLastProvider = false): boolean {
  const state = getCircuitState(provider);
  if (state.state === 'closed') return true;
  if (state.state === 'open') {
    // SINGLE-PROVIDER SAFETY: Never circuit-break the LAST available provider.
    // Better to try and fail than to return "no providers available" — at least
    // the failure gets logged and the draft stays in queue for next run.
    if (isLastProvider) {
      console.warn(`[ai/provider] Circuit open for ${provider} but it's the LAST provider — forcing half-open`);
      state.state = 'half-open';
      return true;
    }
    // After 30s in open state, allow one probe request (reduced from 60s
    // to prevent long lockouts during generation bursts)
    if (Date.now() - state.lastFailure > 30_000) {
      state.state = 'half-open';
      return true;
    }
    return false;
  }
  // half-open: allow one attempt (probe)
  return true;
}

/**
 * Get API key for a provider from the database
 */
async function getApiKey(provider: AIProvider): Promise<string | null> {
  // Environment variable mapping — always checked, even if DB is down
  const envKeys: Record<AIProvider, string[]> = {
    grok: ['XAI_API_KEY', 'GROK_API_KEY'],
    claude: ['ANTHROPIC_API_KEY'],
    openai: ['OPENAI_API_KEY'],
    gemini: ['GEMINI_API_KEY', 'GOOGLE_AI_API_KEY', 'GOOGLE_API_KEY'],
    perplexity: ['PERPLEXITY_API_KEY', 'PPLX_API_KEY'],
  };

  // 1. Try DB sources (ModelProvider table, then ApiSettings)
  try {
    const modelProvider = await prisma.modelProvider.findFirst({
      where: { name: provider, is_active: true },
    });
    if (modelProvider?.api_key_encrypted) {
      return decrypt(modelProvider.api_key_encrypted);
    }

    // Check ApiSettings table (not used for grok)
    const settingNames: Record<string, string> = {
      claude: 'anthropic_api_key',
      openai: 'openai_api_key',
      gemini: 'google_api_key',
    };
    if (settingNames[provider]) {
      const apiSetting = await prisma.apiSettings.findUnique({
        where: { key_name: settingNames[provider] },
      });
      if (apiSetting?.key_value) {
        return apiSetting.key_value;
      }
    }
  } catch (error) {
    // DB unavailable or table missing — fall through to env vars
    console.warn(`[ai/provider] DB key lookup failed for ${provider}, checking env vars:`, error instanceof Error ? error.message : error);
  }

  // 2. Always check environment variables as fallback
  for (const envKey of envKeys[provider] || []) {
    const val = process.env[envKey];
    if (val) return val;
  }

  return null;
}

/**
 * Get the first available provider with a valid API key
 */
async function getAvailableProvider(): Promise<{ provider: AIProvider; apiKey: string } | null> {
  for (const provider of PROVIDER_PRIORITY) {
    const apiKey = await getApiKey(provider);
    if (apiKey) {
      return { provider, apiKey };
    }
  }
  return null;
}

/**
 * Call Grok (xAI) API — OpenAI-compatible chat completions
 * Endpoint: https://api.x.ai/v1/chat/completions
 * Models: grok-4-1-fast ($0.20/$0.50/1M), grok-4-latest ($3/$15/1M)
 */
async function callGrok(
  messages: AIMessage[],
  apiKey: string,
  options: AICompletionOptions
): Promise<AICompletionResult> {
  const model = options.model || DEFAULT_MODELS.grok;

  const formattedMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  if (options.systemPrompt && !messages.some((m) => m.role === 'system')) {
    formattedMessages.unshift({ role: 'system', content: options.systemPrompt });
  }

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(options.timeoutMs || 25_000),
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7,
      stream: false,
      messages: formattedMessages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Grok API error (${response.status}): ${error.slice(0, 300)}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0].message.content,
    provider: 'grok',
    model,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  };
}

/**
 * Call Claude API
 */
async function callClaude(
  messages: AIMessage[],
  apiKey: string,
  options: AICompletionOptions
): Promise<AICompletionResult> {
  const model = options.model || DEFAULT_MODELS.claude;

  const systemMessage = messages.find((m) => m.role === 'system');
  const nonSystemMessages = messages.filter((m) => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    signal: AbortSignal.timeout(options.timeoutMs || 25_000),
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7,
      system: systemMessage?.content || options.systemPrompt,
      messages: nonSystemMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  const data = await response.json();

  return {
    content: data.content[0].text,
    provider: 'claude',
    model,
    usage: {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: data.usage.input_tokens + data.usage.output_tokens,
    },
  };
}

/**
 * Call OpenAI API
 */
async function callOpenAI(
  messages: AIMessage[],
  apiKey: string,
  options: AICompletionOptions
): Promise<AICompletionResult> {
  const model = options.model || DEFAULT_MODELS.openai;

  const formattedMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  if (options.systemPrompt && !messages.some((m) => m.role === 'system')) {
    formattedMessages.unshift({ role: 'system', content: options.systemPrompt });
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(options.timeoutMs || 25_000),
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7,
      messages: formattedMessages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0].message.content,
    provider: 'openai',
    model,
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    },
  };
}

/**
 * Call Google Gemini API
 */
async function callGemini(
  messages: AIMessage[],
  apiKey: string,
  options: AICompletionOptions
): Promise<AICompletionResult> {
  const model = options.model || DEFAULT_MODELS.gemini;

  // Convert messages to Gemini format
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const systemMessage = messages.find((m) => m.role === 'system');
  const systemInstruction = systemMessage?.content || options.systemPrompt;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(options.timeoutMs || 25_000),
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction
          ? { parts: [{ text: systemInstruction }] }
          : undefined,
        generationConfig: {
          maxOutputTokens: options.maxTokens || 4096,
          temperature: options.temperature ?? 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    // Detect OAuth credential used instead of API key
    if (error.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") || error.includes("Expected OAuth 2 access token")) {
      throw new Error(`Gemini: Wrong credential type. You need a Google AI API Key (starts with AIza...), not an OAuth token. Go to Google Cloud Console → API & Services → Credentials → Create API Key.`);
    }
    throw new Error(`Gemini API error (${response.status}): ${error.slice(0, 200)}`);
  }

  const data = await response.json();

  return {
    content: data.candidates[0].content.parts[0].text,
    provider: 'gemini',
    model,
    usage: {
      promptTokens: data.usageMetadata?.promptTokenCount || 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata?.totalTokenCount || 0,
    },
  };
}

/**
 * Call Perplexity API — OpenAI-compatible chat completions
 * Endpoint: https://api.perplexity.ai/chat/completions
 * Models: sonar-pro ($3/$15/1M), sonar ($1/$1/1M)
 */
async function callPerplexity(
  messages: AIMessage[],
  apiKey: string,
  options: AICompletionOptions
): Promise<AICompletionResult> {
  const model = options.model || DEFAULT_MODELS.perplexity;

  const formattedMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  if (options.systemPrompt && !messages.some((m) => m.role === 'system')) {
    formattedMessages.unshift({ role: 'system', content: options.systemPrompt });
  }

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(options.timeoutMs || 25_000),
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Perplexity API error (${response.status}): ${error}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0].message.content,
    provider: 'perplexity',
    model,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  };
}

/**
 * Route a call to the appropriate provider
 */
async function callProvider(
  provider: AIProvider,
  messages: AIMessage[],
  apiKey: string,
  options: AICompletionOptions,
): Promise<AICompletionResult> {
  switch (provider) {
    case 'grok':
      return callGrok(messages, apiKey, options);
    case 'claude':
      return callClaude(messages, apiKey, options);
    case 'openai':
      return callOpenAI(messages, apiKey, options);
    case 'gemini':
      return callGemini(messages, apiKey, options);
    case 'perplexity':
      return callPerplexity(messages, apiKey, options);
  }
}

/**
 * Generate completion using the AI provider
 * Automatically falls back to other providers if the primary fails.
 * Every call — success or failure — is logged to ApiUsageLog (fire-and-forget).
 */
export async function generateCompletion(
  messages: AIMessage[],
  options: AICompletionOptions = {}
): Promise<AICompletionResult> {
  // If a specific provider is requested, try that one first.
  // CRITICAL CHANGE: If it fails, fall through to the standard fallback chain
  // instead of throwing. This ensures no single provider failure blocks generation.
  if (options.provider) {
    const apiKey = await getApiKey(options.provider);
    if (apiKey) {
      try {
        const result = await callProvider(options.provider, messages, apiKey, {
          ...options,
          timeoutMs: options.timeoutMs || 25_000,
        });
        logUsage(result, options);
        return result;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`[ai/provider] Requested provider ${options.provider} failed, falling through to chain: ${msg}`);
        recordProviderFailure(options.provider);
        // Fall through to standard fallback chain below
      }
    } else {
      console.warn(`[ai/provider] No API key for requested provider ${options.provider}, falling through to chain`);
    }
    // Clear the explicit provider so the fallback chain runs normally
    options = { ...options, provider: undefined };
  }

  // Try providers in priority order: grok → openai → claude → gemini
  // Use the per-call timeout as a total budget for the fallback chain.
  // This prevents cascading timeouts (4 providers × 25s = 100s > Vercel 60s).
  const fallbackStart = Date.now();
  const totalBudgetMs = options.timeoutMs || 25_000;
  const errors: string[] = [];

  // Task-type routing: if taskType is set, check DB for a configured provider route.
  // This allows the admin UI to route e.g. Arabic writing to Claude, scoring to gpt-4o-mini.
  // Falls back to PROVIDER_PRIORITY if no DB route is configured.
  let routedPriority: AIProvider[] = [...PROVIDER_PRIORITY];
  if (options.taskType) {
    try {
      const { getProviderForTask } = await import('@/lib/ai/provider-config');
      const route = await getProviderForTask(options.taskType as import('@/lib/ai/provider-config').TaskType, options.siteId);
      if (route.provider && PROVIDER_PRIORITY.includes(route.provider as AIProvider)) {
        // Build custom priority: routed provider first, then its fallback, then rest
        const routedProvider = route.provider as AIProvider;
        routedPriority = [routedProvider];
        if (route.fallback && PROVIDER_PRIORITY.includes(route.fallback as AIProvider)) {
          routedPriority.push(route.fallback as AIProvider);
        }
        // Fill remaining from PROVIDER_PRIORITY (skip already-added)
        for (const p of PROVIDER_PRIORITY) {
          if (!routedPriority.includes(p)) routedPriority.push(p);
        }
      }
    } catch (routeErr) {
      // DB or import failure — fall through to default PROVIDER_PRIORITY
      console.warn('[ai/provider] Task routing lookup failed (non-fatal):', routeErr instanceof Error ? routeErr.message : routeErr);
    }
  }

  // Pre-scan which providers have API keys AND are not circuit-broken.
  // First pass: find all providers with valid keys
  const keyedProviders: Array<{ provider: AIProvider; apiKey: string }> = [];
  for (const p of routedPriority) {
    const k = await getApiKey(p);
    if (k) keyedProviders.push({ provider: p, apiKey: k });
  }

  // Second pass: filter by circuit breaker, but never lock out the last keyed provider
  const availableProviders: Array<{ provider: AIProvider; apiKey: string }> = [];
  for (let idx = 0; idx < keyedProviders.length; idx++) {
    const { provider: p, apiKey } = keyedProviders[idx];
    const isLast = keyedProviders.length === 1 || (idx === keyedProviders.length - 1 && availableProviders.length === 0);
    if (!isProviderAvailable(p, isLast)) {
      errors.push(`${p}: skipped — circuit open`);
      continue;
    }
    availableProviders.push({ provider: p, apiKey });
  }

  // Phase-aware budget split ratios
  const hint = options.phaseBudgetHint;
  const isSingleProvider = availableProviders.length === 1;
  // First provider share reduced from 65%→50% default. With 20s total budget,
  // 65% gave first provider 13s and left only 7s for 2+ fallbacks (2.3s each).
  // At 50%, first gets 10s and fallbacks share 10s (5s each) — enough for a real attempt.
  const firstSharePct = isSingleProvider ? 0.95 // Single provider: give it almost everything
    : hint === 'light' ? 0.45
    : hint === 'medium' ? 0.50
    : hint === 'heavy' ? 0.55 // Heavy tasks (campaign-enhance) — first provider still gets majority
    : 0.50; // default — balanced split for reliable fallback
  const maxPerProviderMs = isSingleProvider ? 50_000 // Single provider: no cap
    : hint === 'light' ? 15_000
    : hint === 'medium' ? 25_000
    : 50_000; // Heavy tasks: allow up to 50s per provider

  if (isSingleProvider) {
    console.log(`[ai/provider] Single-provider mode: ${availableProviders[0].provider} gets 95% budget (${Math.round(totalBudgetMs / 1000)}s total)`);
  }

  let lastFailWasFast = false; // Track fast failures for adaptive fallback

  for (let i = 0; i < availableProviders.length; i++) {
    const { provider, apiKey } = availableProviders[i];
    const elapsed = Date.now() - fallbackStart;
    const remaining = Math.max(0, totalBudgetMs - elapsed);
    if (remaining < 2_000) {
      errors.push(`${provider}: skipped — only ${Math.max(0, Math.round(remaining / 1000))}s remaining in budget`);
      continue;
    }

    const remainingProviders = availableProviders.length - i;
    const isFirstProvider = i === 0;
    let rawShare: number;

    if (isSingleProvider) {
      // SINGLE PROVIDER: give it the full remaining budget minus a small buffer
      rawShare = remaining - 1_000;
    } else if (isFirstProvider) {
      rawShare = Math.floor((remaining - 1_000) * firstSharePct);
    } else if (hint === 'heavy' && lastFailWasFast) {
      // Adaptive fallback: fast failure (<5s) means provider is down, not slow.
      // Give the next provider 80% of remaining budget instead of equal split.
      rawShare = Math.floor((remaining - 1_000) * 0.80);
      lastFailWasFast = false; // Reset after one adaptive allocation
    } else {
      rawShare = Math.floor((remaining - 1_000) / remainingProviders);
    }

    // Ensure minimum 5s per provider, but NEVER exceed actual remaining budget.
    // Previous bug: the 5s floor could overallocate when remaining < 5s, causing
    // later providers to get "only 2s remaining" and be skipped entirely.
    // Guard against negative values when remaining < 500ms (e.g. clock drift).
    const providerTimeout = Math.min(
      Math.max(rawShare, 5_000),        // At least 5s (or rawShare if bigger)
      Math.max(500, remaining - 500)    // But never exceed remaining budget (floor 500ms)
    );
    const attemptStart = Date.now();
    try {
      const result = await callProvider(provider, messages, apiKey, {
        ...options,
        timeoutMs: providerTimeout,
      });
      recordProviderSuccess(provider);
      logUsage(result, options);
      return result;
    } catch (error) {
      const attemptDurationMs = Date.now() - attemptStart;
      const msg = `${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(msg);
      recordProviderFailure(provider);
      // Detect fast failures (<5s) for adaptive fallback on heavy phases
      lastFailWasFast = attemptDurationMs < 5_000;
      continue;
    }
  }

  const finalErr = `All AI providers failed: ${errors.join('; ')}`;
  // Log with the first attempted provider so it doesn't show as "unknown/unknown"
  const firstTriedProvider = PROVIDER_PRIORITY.find(p => errors.some(e => e.startsWith(`${p}:`)));
  logUsage(null, {
    ...options,
    provider: firstTriedProvider || options.provider || ('unknown' as AIProvider),
    model: firstTriedProvider ? DEFAULT_MODELS[firstTriedProvider] : options.model,
  }, finalErr);
  throw new Error(finalErr);
}

/**
 * Generate text completion with a simple prompt
 */
export async function generateText(
  prompt: string,
  options: AICompletionOptions = {}
): Promise<string> {
  const result = await generateCompletion(
    [{ role: 'user', content: prompt }],
    options
  );
  return result.content;
}

/**
 * Generate JSON output from AI
 */
export async function generateJSON<T>(
  prompt: string,
  options: AICompletionOptions = {}
): Promise<T> {
  const systemPrompt = `${options.systemPrompt || ''}\n\nYou must respond with valid JSON only. No markdown, no explanations, just pure JSON. Ensure all strings are properly escaped and the JSON is complete.`;

  const result = await generateCompletion(
    [{ role: 'user', content: prompt }],
    { ...options, systemPrompt }
  );

  // Clean the response - remove markdown code blocks if present
  let jsonStr = result.content.trim();
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  }
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  // Attempt 1: Direct parse
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    // Attempt 2: Repair common JSON issues
  }

  const repaired = repairJSON(jsonStr);
  try {
    return JSON.parse(repaired) as T;
  } catch {
    // Attempt 3: Extract JSON object from the response
  }

  // Try to find the outermost { ... } and parse that
  const start = jsonStr.indexOf('{');
  const end = jsonStr.lastIndexOf('}');
  if (start !== -1 && end > start) {
    const extracted = jsonStr.substring(start, end + 1);
    try {
      return JSON.parse(repairJSON(extracted)) as T;
    } catch {
      // Fall through to error
    }
  }

  // Attempt 4: Regex field extraction fallback — handles Arabic content where embedded
  // quotes/HTML break JSON parsing but the AI actually returned the right structure.
  // This only works for the {heading, content, wordCount, keywords_used} schema used
  // by the drafting phase, but that's the main failure point.
  try {
    const headingMatch = jsonStr.match(/"heading"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const contentMatch = jsonStr.match(/"content"\s*:\s*"([\s\S]*?)"\s*,\s*"wordCount"/);
    if (headingMatch && contentMatch) {
      const heading = headingMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
      const content = contentMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
      const wcMatch = jsonStr.match(/"wordCount"\s*:\s*(\d+)/);
      const wordCount = wcMatch ? parseInt(wcMatch[1], 10) : content.split(/\s+/).length;
      console.warn(`[generateJSON] Used regex fallback to extract fields from unparseable JSON (${jsonStr.length} chars)`);
      return { heading, content, wordCount, keywords_used: [] } as unknown as T;
    }
  } catch {
    // Fall through to error
  }

  throw new Error(`Invalid JSON from AI (length: ${jsonStr.length}). First 200 chars: ${jsonStr.substring(0, 200)}`);
}

/**
 * Escape unescaped control characters (newline, tab, carriage return) that appear
 * inside JSON string values. Uses a character-by-character state machine so it
 * correctly handles strings that contain embedded HTML attribute quotes like
 * dir="rtl" — the old lookbehind regex (/(?<=":[ ]*"[^"]*)\n/) stopped working
 * at the first inner quote, leaving subsequent newlines unescaped and crashing
 * JSON.parse on Arabic HTML content sections.
 */
function escapeControlCharsInStrings(s: string): string {
  // Pre-processing: convert HTML attribute double quotes to single quotes.
  // Pattern: word="value" → word='value' (e.g., href="url" → href='url')
  // This prevents the state machine from mis-tracking string boundaries
  // when AI returns unescaped HTML attributes inside JSON string values.
  // Safe because JSON key-value pairs use ": " (colon-space), not "=" (equals).
  s = s.replace(/(\w[\w-]*)="([^"\\]{0,500})"/g, "$1='$2'");

  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      result += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    if (inString) {
      if (ch === '\n') { result += '\\n'; continue; }
      if (ch === '\r') { result += '\\r'; continue; }
      if (ch === '\t') { result += '\\t'; continue; }
    }
    result += ch;
  }
  return result;
}

/**
 * Attempt to repair common JSON issues from AI responses:
 * - Truncated output (missing closing brackets/braces)
 * - Unescaped control characters in strings
 * - Trailing commas
 * - Single quotes instead of double quotes (outside of string values)
 */
function repairJSON(input: string): string {
  let s = input.trim();

  // Remove any non-JSON prefix (sometimes AI adds text before JSON)
  const firstBrace = s.indexOf('{');
  if (firstBrace > 0) {
    s = s.substring(firstBrace);
  }

  // Fix unescaped control characters (newline, tab, carriage return) inside strings.
  // Uses a state machine instead of a lookbehind regex — the lookbehind approach
  // breaks as soon as the string contains embedded HTML attribute quotes like dir="rtl".
  s = escapeControlCharsInStrings(s);

  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, '$1');

  // Fix truncated JSON: count brackets and add missing closers
  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') braces++;
    if (ch === '}') braces--;
    if (ch === '[') brackets++;
    if (ch === ']') brackets--;
  }

  // If we ended inside a string, close it
  if (inString) {
    s += '"';
  }

  // Close any unclosed brackets/braces
  while (brackets > 0) {
    s += ']';
    brackets--;
  }
  while (braces > 0) {
    s += '}';
    braces--;
  }

  return s;
}

/**
 * Check if any AI provider is available
 */
export async function isAIAvailable(): Promise<boolean> {
  const available = await getAvailableProvider();
  return available !== null;
}

/**
 * Probe all providers to find which ones are ACTUALLY responding right now.
 * Sends a tiny "say OK" request with a 4s timeout per provider.
 * Returns providers sorted by response time (fastest first).
 * Used by last-defense fallback to find a working provider.
 */
export async function probeActiveProviders(): Promise<Array<{
  provider: AIProvider;
  apiKey: string;
  responseMs: number;
}>> {
  const results: Array<{ provider: AIProvider; apiKey: string; responseMs: number }> = [];
  const probePromises = ALL_PROVIDERS.map(async (p) => {
    const apiKey = await getApiKey(p);
    if (!apiKey) return null;
    const start = Date.now();
    try {
      await callProvider(p, [{ role: 'user', content: 'Say OK' }], apiKey, {
        maxTokens: 5,
        timeoutMs: 4_000,
      });
      return { provider: p, apiKey, responseMs: Date.now() - start };
    } catch {
      return null;
    }
  });

  const probed = await Promise.allSettled(probePromises);
  for (const r of probed) {
    if (r.status === 'fulfilled' && r.value) results.push(r.value);
  }
  results.sort((a, b) => a.responseMs - b.responseMs);
  return results;
}

/** Expose getApiKey for external modules (last-defense, diagnostics) */
export { getApiKey, callProvider, ALL_PROVIDERS, DEFAULT_MODELS };

/**
 * Get status of all AI providers
 */
export async function getProvidersStatus(): Promise<
  Record<AIProvider, { configured: boolean; active: boolean; warning?: string }>
> {
  const status: Record<AIProvider, { configured: boolean; active: boolean; warning?: string }> = {
    grok: { configured: false, active: false },
    claude: { configured: false, active: false },
    openai: { configured: false, active: false },
    gemini: { configured: false, active: false },
    perplexity: { configured: false, active: false },
  };

  for (const provider of PROVIDER_PRIORITY) {
    const apiKey = await getApiKey(provider);
    status[provider].configured = !!apiKey;
    status[provider].active = !!apiKey;

    // Validate key format for known providers
    if (apiKey) {
      if (provider === "gemini" && !apiKey.startsWith("AIza")) {
        status[provider].active = false;
        status[provider].warning = "Wrong key type — needs Google AI API Key (starts with AIza...), not OAuth token";
      }
      if (provider === "perplexity" && apiKey.length < 20) {
        status[provider].active = false;
        status[provider].warning = "API key looks too short — check PERPLEXITY_API_KEY in Vercel env vars";
      }
    }
  }

  // Perplexity is deactivated — quota exhausted (401). Re-enable after billing is resolved.
  status.perplexity.active = false;
  if (!status.perplexity.warning) {
    status.perplexity.warning = "Deactivated — API quota exhausted. Check billing at perplexity.ai dashboard.";
  }

  return status;
}

/**
 * Test an API key for a provider
 */
export async function testApiKey(provider: AIProvider, apiKey: string): Promise<boolean> {
  try {
    const testMessage: AIMessage[] = [{ role: 'user', content: 'Say "OK"' }];
    await callProvider(provider, testMessage, apiKey, { maxTokens: 10 });
    return true;
  } catch (error) {
    console.error(`API key test failed for ${provider}:`, error);
    return false;
  }
}
