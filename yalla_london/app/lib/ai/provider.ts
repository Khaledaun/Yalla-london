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
 */

import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

export type AIProvider = 'grok' | 'claude' | 'openai' | 'gemini';

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
  gemini: 'gemini-pro',
};

// Provider priority — Grok first (cheapest, fastest, 2M context), then Claude, OpenAI, Gemini
const PROVIDER_PRIORITY: AIProvider[] = ['grok', 'claude', 'openai', 'gemini'];

/**
 * Get API key for a provider from the database
 */
async function getApiKey(provider: AIProvider): Promise<string | null> {
  // Environment variable mapping — always checked, even if DB is down
  const envKeys: Record<AIProvider, string[]> = {
    grok: ['XAI_API_KEY', 'GROK_API_KEY'],
    claude: ['ANTHROPIC_API_KEY'],
    openai: ['OPENAI_API_KEY'],
    gemini: ['GOOGLE_API_KEY'],
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
    signal: AbortSignal.timeout(30_000), // 30s max per AI call
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
    signal: AbortSignal.timeout(30_000), // 30s max per AI call
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
    signal: AbortSignal.timeout(30_000), // 30s max per AI call
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
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30_000), // 30s max per AI call
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
    throw new Error(`Gemini API error: ${error}`);
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
  // If a specific provider is requested, try only that one
  if (options.provider) {
    const apiKey = await getApiKey(options.provider);
    if (!apiKey) {
      const err = `No API key configured for ${options.provider}`;
      logUsage(null, { ...options, provider: options.provider }, err);
      throw new Error(err);
    }
    try {
      const result = await callProvider(options.provider, messages, apiKey, options);
      logUsage(result, options);
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logUsage(null, options, msg);
      throw error;
    }
  }

  // Try providers in priority order: grok → claude → openai → gemini
  const errors: string[] = [];

  for (const provider of PROVIDER_PRIORITY) {
    const apiKey = await getApiKey(provider);
    if (!apiKey) continue;

    try {
      const result = await callProvider(provider, messages, apiKey, options);
      logUsage(result, options);
      return result;
    } catch (error) {
      const msg = `${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(msg);
      continue;
    }
  }

  const finalErr = `All AI providers failed: ${errors.join('; ')}`;
  logUsage(null, options, finalErr);
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
 * Get status of all AI providers
 */
export async function getProvidersStatus(): Promise<
  Record<AIProvider, { configured: boolean; active: boolean }>
> {
  const status: Record<AIProvider, { configured: boolean; active: boolean }> = {
    grok: { configured: false, active: false },
    claude: { configured: false, active: false },
    openai: { configured: false, active: false },
    gemini: { configured: false, active: false },
  };

  for (const provider of PROVIDER_PRIORITY) {
    const apiKey = await getApiKey(provider);
    status[provider].configured = !!apiKey;
    status[provider].active = !!apiKey;
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
