/**
 * AI Provider Integration Layer
 *
 * Unified interface for Claude, GPT, and Gemini.
 * Automatically uses the configured API keys from the database.
 */

import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';

export type AIProvider = 'claude' | 'openai' | 'gemini';

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
  claude: 'claude-3-5-sonnet-20241022',
  openai: 'gpt-4-turbo-preview',
  gemini: 'gemini-pro',
};

// Provider priority for fallback
const PROVIDER_PRIORITY: AIProvider[] = ['claude', 'openai', 'gemini'];

/**
 * Get API key for a provider from the database
 */
async function getApiKey(provider: AIProvider): Promise<string | null> {
  try {
    // Check ModelProvider table first (has encrypted keys)
    const modelProvider = await prisma.modelProvider.findFirst({
      where: {
        name: provider,
        is_active: true,
      },
    });

    if (modelProvider?.api_key_encrypted) {
      return decrypt(modelProvider.api_key_encrypted);
    }

    // Fallback to ApiSettings table
    const keyNames: Record<AIProvider, string> = {
      claude: 'anthropic_api_key',
      openai: 'openai_api_key',
      gemini: 'google_api_key',
    };

    const apiSetting = await prisma.apiSettings.findUnique({
      where: { key_name: keyNames[provider] },
    });

    if (apiSetting?.key_value) {
      return apiSetting.key_value;
    }

    // Last resort: environment variables
    const envKeys: Record<AIProvider, string> = {
      claude: 'ANTHROPIC_API_KEY',
      openai: 'OPENAI_API_KEY',
      gemini: 'GOOGLE_API_KEY',
    };

    return process.env[envKeys[provider]] || null;
  } catch (error) {
    console.error(`Failed to get API key for ${provider}:`, error);
    return null;
  }
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
 * Generate completion using the AI provider
 * Automatically falls back to other providers if the primary fails
 */
export async function generateCompletion(
  messages: AIMessage[],
  options: AICompletionOptions = {}
): Promise<AICompletionResult> {
  // If a specific provider is requested, try only that one
  if (options.provider) {
    const apiKey = await getApiKey(options.provider);
    if (!apiKey) {
      throw new Error(`No API key configured for ${options.provider}`);
    }

    switch (options.provider) {
      case 'claude':
        return callClaude(messages, apiKey, options);
      case 'openai':
        return callOpenAI(messages, apiKey, options);
      case 'gemini':
        return callGemini(messages, apiKey, options);
    }
  }

  // Try providers in priority order
  const errors: string[] = [];

  for (const provider of PROVIDER_PRIORITY) {
    const apiKey = await getApiKey(provider);
    if (!apiKey) continue;

    try {
      switch (provider) {
        case 'claude':
          return await callClaude(messages, apiKey, options);
        case 'openai':
          return await callOpenAI(messages, apiKey, options);
        case 'gemini':
          return await callGemini(messages, apiKey, options);
      }
    } catch (error) {
      errors.push(`${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      continue;
    }
  }

  throw new Error(`All AI providers failed: ${errors.join('; ')}`);
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
  const systemPrompt = `${options.systemPrompt || ''}\n\nYou must respond with valid JSON only. No markdown, no explanations, just pure JSON.`;

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

  return JSON.parse(jsonStr.trim()) as T;
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
    claude: { configured: false, active: false },
    openai: { configured: false, active: false },
    gemini: { configured: false, active: false },
  };

  for (const provider of PROVIDER_PRIORITY) {
    const apiKey = await getApiKey(provider);
    status[provider].configured = !!apiKey;
    status[provider].active = !!apiKey; // We could add health checks here
  }

  return status;
}

/**
 * Test an API key for a provider
 */
export async function testApiKey(provider: AIProvider, apiKey: string): Promise<boolean> {
  try {
    const testMessage: AIMessage[] = [{ role: 'user', content: 'Say "OK"' }];

    switch (provider) {
      case 'claude':
        await callClaude(testMessage, apiKey, { maxTokens: 10 });
        break;
      case 'openai':
        await callOpenAI(testMessage, apiKey, { maxTokens: 10 });
        break;
      case 'gemini':
        await callGemini(testMessage, apiKey, { maxTokens: 10 });
        break;
    }

    return true;
  } catch (error) {
    console.error(`API key test failed for ${provider}:`, error);
    return false;
  }
}
