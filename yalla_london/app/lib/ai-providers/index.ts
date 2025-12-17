/**
 * Multi-Provider AI Service
 * Supports: Claude, GPT (OpenAI), Grok (xAI), Gemini (Google), Perplexity
 *
 * This service provides a unified interface for multiple AI providers
 * with automatic fallback, rate limiting, and cost tracking.
 */

export type AIProviderType = 'claude' | 'openai' | 'grok' | 'gemini' | 'perplexity' | 'abacus';

export interface AIProviderConfig {
  id: AIProviderType;
  name: string;
  displayName: string;
  endpoint: string;
  models: string[];
  defaultModel: string;
  maxTokens: number;
  costPer1kTokens: {
    input: number;
    output: number;
  };
  capabilities: string[];
  headers: (apiKey: string) => Record<string, string>;
  buildPayload: (messages: AIMessage[], options: AIRequestOptions) => any;
  parseResponse: (response: any) => AIProviderResponse;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequestOptions {
  model?: string;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface AIProviderResponse {
  content: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  model: string;
  finishReason?: string;
}

export interface AIGenerateResult {
  success: boolean;
  content?: string;
  provider: AIProviderType;
  model: string;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
  responseTimeMs: number;
  cost?: number;
  error?: string;
}

// Provider Configurations
export const AI_PROVIDERS: Record<AIProviderType, AIProviderConfig> = {
  claude: {
    id: 'claude',
    name: 'claude',
    displayName: 'Claude (Anthropic)',
    endpoint: 'https://api.anthropic.com/v1/messages',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    defaultModel: 'claude-3-5-sonnet-20241022',
    maxTokens: 8192,
    costPer1kTokens: { input: 0.003, output: 0.015 },
    capabilities: ['text_generation', 'code_generation', 'analysis', 'multilingual'],
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }),
    buildPayload: (messages, options) => ({
      model: options.model || 'claude-3-5-sonnet-20241022',
      max_tokens: options.max_tokens || 1024,
      messages: messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role,
        content: m.content,
      })),
      system: messages.find(m => m.role === 'system')?.content || '',
    }),
    parseResponse: (response) => ({
      content: response.content?.[0]?.text || '',
      tokensUsed: {
        input: response.usage?.input_tokens || 0,
        output: response.usage?.output_tokens || 0,
        total: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      },
      model: response.model || 'claude-3-5-sonnet-20241022',
      finishReason: response.stop_reason,
    }),
  },

  openai: {
    id: 'openai',
    name: 'openai',
    displayName: 'GPT (OpenAI)',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o-mini',
    maxTokens: 4096,
    costPer1kTokens: { input: 0.00015, output: 0.0006 },
    capabilities: ['text_generation', 'code_generation', 'analysis', 'function_calling'],
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
    buildPayload: (messages, options) => ({
      model: options.model || 'gpt-4o-mini',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: options.max_tokens || 1024,
      temperature: options.temperature || 0.7,
      stream: options.stream || false,
    }),
    parseResponse: (response) => ({
      content: response.choices?.[0]?.message?.content || '',
      tokensUsed: {
        input: response.usage?.prompt_tokens || 0,
        output: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
      },
      model: response.model || 'gpt-4o-mini',
      finishReason: response.choices?.[0]?.finish_reason,
    }),
  },

  grok: {
    id: 'grok',
    name: 'grok',
    displayName: 'Grok (xAI)',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    models: ['grok-beta', 'grok-2-1212'],
    defaultModel: 'grok-beta',
    maxTokens: 4096,
    costPer1kTokens: { input: 0.005, output: 0.015 },
    capabilities: ['text_generation', 'real_time_data', 'analysis'],
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
    buildPayload: (messages, options) => ({
      model: options.model || 'grok-beta',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: options.max_tokens || 1024,
      temperature: options.temperature || 0.7,
      stream: options.stream || false,
    }),
    parseResponse: (response) => ({
      content: response.choices?.[0]?.message?.content || '',
      tokensUsed: {
        input: response.usage?.prompt_tokens || 0,
        output: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
      },
      model: response.model || 'grok-beta',
      finishReason: response.choices?.[0]?.finish_reason,
    }),
  },

  gemini: {
    id: 'gemini',
    name: 'gemini',
    displayName: 'Gemini (Google)',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
    defaultModel: 'gemini-1.5-flash',
    maxTokens: 8192,
    costPer1kTokens: { input: 0.00035, output: 0.00105 },
    capabilities: ['text_generation', 'multimodal', 'analysis', 'code_generation'],
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
    }),
    buildPayload: (messages, options) => {
      // Gemini uses a different format
      const model = options.model || 'gemini-1.5-flash';
      const systemInstruction = messages.find(m => m.role === 'system')?.content;
      const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      return {
        model,
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          maxOutputTokens: options.max_tokens || 1024,
          temperature: options.temperature || 0.7,
        },
      };
    },
    parseResponse: (response) => ({
      content: response.candidates?.[0]?.content?.parts?.[0]?.text || '',
      tokensUsed: {
        input: response.usageMetadata?.promptTokenCount || 0,
        output: response.usageMetadata?.candidatesTokenCount || 0,
        total: response.usageMetadata?.totalTokenCount || 0,
      },
      model: 'gemini-1.5-flash',
      finishReason: response.candidates?.[0]?.finishReason,
    }),
  },

  perplexity: {
    id: 'perplexity',
    name: 'perplexity',
    displayName: 'Perplexity AI',
    endpoint: 'https://api.perplexity.ai/chat/completions',
    models: ['sonar', 'sonar-pro', 'llama-3.1-sonar-small-128k-online', 'llama-3.1-sonar-large-128k-online'],
    defaultModel: 'sonar',
    maxTokens: 4096,
    costPer1kTokens: { input: 0.001, output: 0.001 },
    capabilities: ['text_generation', 'real_time_search', 'citations'],
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
    buildPayload: (messages, options) => ({
      model: options.model || 'sonar',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: options.max_tokens || 1024,
      temperature: options.temperature || 0.3,
    }),
    parseResponse: (response) => ({
      content: response.choices?.[0]?.message?.content || response.choices?.[0]?.delta?.content || '',
      tokensUsed: {
        input: response.usage?.prompt_tokens || 0,
        output: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
      },
      model: response.model || 'sonar',
      finishReason: response.choices?.[0]?.finish_reason,
    }),
  },

  abacus: {
    id: 'abacus',
    name: 'abacus',
    displayName: 'Abacus.AI',
    endpoint: 'https://apps.abacus.ai/v1/chat/completions',
    models: ['gpt-4.1-mini', 'gpt-4.1', 'claude-sonnet-4'],
    defaultModel: 'gpt-4.1-mini',
    maxTokens: 4096,
    costPer1kTokens: { input: 0.0005, output: 0.0015 },
    capabilities: ['text_generation', 'analysis'],
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
    buildPayload: (messages, options) => ({
      model: options.model || 'gpt-4.1-mini',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: options.max_tokens || 1024,
      temperature: options.temperature || 0.7,
      stream: false,
    }),
    parseResponse: (response) => ({
      content: response.choices?.[0]?.message?.content || '',
      tokensUsed: {
        input: response.usage?.prompt_tokens || 0,
        output: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
      },
      model: response.model || 'gpt-4.1-mini',
      finishReason: response.choices?.[0]?.finish_reason,
    }),
  },
};

// Environment variable mapping
export const PROVIDER_ENV_KEYS: Record<AIProviderType, string> = {
  claude: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  grok: 'GROK_API_KEY',
  gemini: 'GEMINI_API_KEY',
  perplexity: 'PERPLEXITY_API_KEY',
  abacus: 'ABACUSAI_API_KEY',
};

// Alternative env key names (for backwards compatibility)
export const PROVIDER_ENV_KEYS_ALT: Record<AIProviderType, string[]> = {
  claude: ['CLAUDE_API_KEY', 'ANTHROPIC_API_KEY'],
  openai: ['OPENAI_API_KEY'],
  grok: ['GROK_API_KEY', 'XAI_API_KEY'],
  gemini: ['GEMINI_API_KEY', 'GOOGLE_AI_API_KEY'],
  perplexity: ['PERPLEXITY_API_KEY', 'PPLX_API_KEY'],
  abacus: ['ABACUSAI_API_KEY'],
};

/**
 * Get API key for a provider from environment variables
 */
export function getProviderApiKey(provider: AIProviderType): string | null {
  const envKeys = PROVIDER_ENV_KEYS_ALT[provider] || [PROVIDER_ENV_KEYS[provider]];
  for (const key of envKeys) {
    const value = process.env[key];
    if (value) return value;
  }
  return null;
}

/**
 * Check if a provider is configured (has API key)
 */
export function isProviderConfigured(provider: AIProviderType): boolean {
  return !!getProviderApiKey(provider);
}

/**
 * Get all configured providers
 */
export function getConfiguredProviders(): AIProviderType[] {
  return Object.keys(AI_PROVIDERS).filter(
    (p) => isProviderConfigured(p as AIProviderType)
  ) as AIProviderType[];
}

/**
 * Get provider status for all providers
 */
export function getAllProvidersStatus(): Record<AIProviderType, {
  configured: boolean;
  displayName: string;
  models: string[];
  capabilities: string[];
}> {
  const status: any = {};
  for (const [id, config] of Object.entries(AI_PROVIDERS)) {
    status[id] = {
      configured: isProviderConfigured(id as AIProviderType),
      displayName: config.displayName,
      models: config.models,
      capabilities: config.capabilities,
    };
  }
  return status;
}

/**
 * Main AI generation function with provider selection and fallback
 */
export async function generateWithProvider(
  provider: AIProviderType,
  messages: AIMessage[],
  options: AIRequestOptions = {}
): Promise<AIGenerateResult> {
  const startTime = Date.now();
  const config = AI_PROVIDERS[provider];

  if (!config) {
    return {
      success: false,
      provider,
      model: '',
      responseTimeMs: Date.now() - startTime,
      error: `Unknown provider: ${provider}`,
    };
  }

  const apiKey = getProviderApiKey(provider);
  if (!apiKey) {
    return {
      success: false,
      provider,
      model: config.defaultModel,
      responseTimeMs: Date.now() - startTime,
      error: `API key not configured for ${config.displayName}`,
    };
  }

  try {
    let endpoint = config.endpoint;
    let payload = config.buildPayload(messages, options);

    // Gemini has a special endpoint format
    if (provider === 'gemini') {
      const model = options.model || config.defaultModel;
      endpoint = `${config.endpoint}/${model}:generateContent?key=${apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: provider === 'gemini'
        ? { 'Content-Type': 'application/json' }
        : config.headers(apiKey),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${config.displayName} API error (${response.status}): ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();
    const parsed = config.parseResponse(data);

    // Calculate cost
    const cost =
      (parsed.tokensUsed.input / 1000) * config.costPer1kTokens.input +
      (parsed.tokensUsed.output / 1000) * config.costPer1kTokens.output;

    return {
      success: true,
      content: parsed.content,
      provider,
      model: parsed.model,
      tokensUsed: parsed.tokensUsed,
      responseTimeMs: Date.now() - startTime,
      cost,
    };
  } catch (error) {
    return {
      success: false,
      provider,
      model: options.model || config.defaultModel,
      responseTimeMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate with automatic fallback to other providers
 */
export async function generateWithFallback(
  preferredProvider: AIProviderType,
  messages: AIMessage[],
  options: AIRequestOptions = {},
  fallbackOrder?: AIProviderType[]
): Promise<AIGenerateResult> {
  // Default fallback order
  const defaultFallbackOrder: AIProviderType[] = ['claude', 'openai', 'gemini', 'grok', 'perplexity', 'abacus'];

  // Build the provider order: preferred first, then fallbacks
  const providerOrder = [
    preferredProvider,
    ...(fallbackOrder || defaultFallbackOrder).filter(p => p !== preferredProvider),
  ];

  let lastError: string | undefined;

  for (const provider of providerOrder) {
    if (!isProviderConfigured(provider)) {
      continue;
    }

    const result = await generateWithProvider(provider, messages, options);

    if (result.success) {
      return result;
    }

    lastError = result.error;
    console.warn(`Provider ${provider} failed: ${result.error}. Trying next...`);
  }

  return {
    success: false,
    provider: preferredProvider,
    model: '',
    responseTimeMs: 0,
    error: lastError || 'All providers failed or none configured',
  };
}

/**
 * Get the active/preferred provider from settings
 */
export function getActiveProvider(): AIProviderType {
  const envProvider = process.env.AI_ACTIVE_PROVIDER as AIProviderType;
  if (envProvider && AI_PROVIDERS[envProvider]) {
    return envProvider;
  }

  // Return first configured provider
  const configured = getConfiguredProviders();
  return configured[0] || 'openai';
}

export default {
  AI_PROVIDERS,
  generateWithProvider,
  generateWithFallback,
  getProviderApiKey,
  isProviderConfigured,
  getConfiguredProviders,
  getAllProvidersStatus,
  getActiveProvider,
};
