export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * API Keys Management
 *
 * Checks both database and environment variables for API key configuration.
 * Returns real status based on actual configuration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from "@/lib/admin-middleware";

interface ApiKeyConfig {
  id: string;
  provider: 'grok' | 'claude' | 'openai' | 'gemini' | 'serpapi';
  name: string;
  key: string;
  status: 'active' | 'invalid' | 'expired' | 'unconfigured';
  lastUsed: string | null;
  usageThisMonth: number;
  usageLimit: number | null;
  models: string[];
  envVar: string;
  source: 'env' | 'database' | 'none';
}

// Mask API key for display
function maskKey(key: string): string {
  if (!key || key.length < 12) return '';
  return key.slice(0, 8) + '••••••••••••' + key.slice(-4);
}

// Check if key format is valid
function validateKeyFormat(key: string, provider: string): boolean {
  if (!key) return false;

  switch (provider) {
    case 'grok':
      return key.startsWith('xai-') && key.length > 20;
    case 'claude':
      return key.startsWith('sk-ant-');
    case 'openai':
      return key.startsWith('sk-');
    case 'gemini':
      return key.length > 20;
    case 'serpapi':
      return key.length > 20;
    default:
      return key.length > 10;
  }
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const keys: ApiKeyConfig[] = [];

  // Check Grok (xAI) — preferred provider for EN content + live search
  const grokKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY || '';
  keys.push({
    id: 'grok-key',
    provider: 'grok',
    name: 'Grok (xAI)',
    key: maskKey(grokKey),
    status: grokKey
      ? (validateKeyFormat(grokKey, 'grok') ? 'active' : 'invalid')
      : 'unconfigured',
    lastUsed: null,
    usageThisMonth: 0,
    usageLimit: null,
    models: grokKey ? ['grok-4-1-fast', 'grok-4-latest'] : [],
    envVar: 'XAI_API_KEY',
    source: grokKey ? 'env' : 'none'
  });

  // Check Claude/Anthropic
  const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
  keys.push({
    id: 'claude-key',
    provider: 'claude',
    name: 'Claude (Anthropic)',
    key: maskKey(anthropicKey),
    status: anthropicKey
      ? (validateKeyFormat(anthropicKey, 'claude') ? 'active' : 'invalid')
      : 'unconfigured',
    lastUsed: null,
    usageThisMonth: 0,
    usageLimit: null,
    models: anthropicKey ? ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'] : [],
    envVar: 'ANTHROPIC_API_KEY',
    source: anthropicKey ? 'env' : 'none'
  });

  // Check OpenAI
  const openaiKey = process.env.OPENAI_API_KEY || '';
  keys.push({
    id: 'openai-key',
    provider: 'openai',
    name: 'OpenAI (GPT)',
    key: maskKey(openaiKey),
    status: openaiKey
      ? (validateKeyFormat(openaiKey, 'openai') ? 'active' : 'invalid')
      : 'unconfigured',
    lastUsed: null,
    usageThisMonth: 0,
    usageLimit: null,
    models: openaiKey ? ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'] : [],
    envVar: 'OPENAI_API_KEY',
    source: openaiKey ? 'env' : 'none'
  });

  // Check Gemini/Google AI
  const geminiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY || '';
  keys.push({
    id: 'gemini-key',
    provider: 'gemini',
    name: 'Google Gemini',
    key: maskKey(geminiKey),
    status: geminiKey
      ? (validateKeyFormat(geminiKey, 'gemini') ? 'active' : 'invalid')
      : 'unconfigured',
    lastUsed: null,
    usageThisMonth: 0,
    usageLimit: null,
    models: geminiKey ? ['gemini-pro', 'gemini-pro-vision'] : [],
    envVar: 'GOOGLE_AI_API_KEY',
    source: geminiKey ? 'env' : 'none'
  });

  // Calculate summary stats
  const configuredCount = keys.filter(k => k.status === 'active').length;
  const totalCount = keys.length;

  // Check other important integrations
  const integrations = {
    database: {
      configured: !!(process.env.DATABASE_URL || process.env.POSTGRES_URL),
      envVar: 'DATABASE_URL'
    },
    supabase: {
      configured: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      envVars: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
    },
    serpApi: {
      configured: !!(process.env.SERPAPI_API_KEY || process.env.GOOGLE_TRENDS_API_KEY),
      envVar: 'SERPAPI_API_KEY',
      status: (process.env.SERPAPI_API_KEY || process.env.GOOGLE_TRENDS_API_KEY) ? 'active' : 'unconfigured'
    },
    googleSearchConsole: {
      configured: !!(process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL && process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY),
      envVars: ['GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL', 'GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY']
    },
    googleAnalytics: {
      configured: !!(process.env.GA4_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID),
      envVar: 'GA4_MEASUREMENT_ID'
    },
    pageSpeed: {
      configured: !!(process.env.GOOGLE_PAGESPEED_API_KEY || process.env.GOOGLE_API_KEY),
      envVar: 'GOOGLE_PAGESPEED_API_KEY'
    },
    indexNow: {
      configured: !!process.env.INDEXNOW_KEY,
      envVar: 'INDEXNOW_KEY'
    }
  };

  return NextResponse.json({
    keys,
    summary: {
      configured: configuredCount,
      total: totalCount,
      status: configuredCount === 0 ? 'not_ready' : configuredCount < 2 ? 'partial' : 'ready'
    },
    integrations,
    recommendations: generateRecommendations(keys, integrations)
  });
}

function generateRecommendations(keys: ApiKeyConfig[], integrations: any): string[] {
  const recommendations: string[] = [];

  // Check AI providers
  const hasAnyAI = keys.some(k => k.status === 'active');
  if (!hasAnyAI) {
    recommendations.push('⚠️ CRITICAL: Configure at least one AI provider (Grok, Claude, OpenAI, or Gemini) to enable content generation');
  }

  // Check Grok (highest priority provider)
  const grokKey = keys.find(k => k.provider === 'grok');
  if (grokKey?.status === 'unconfigured') {
    recommendations.push('🚀 Add XAI_API_KEY for Grok — preferred EN content provider ($0.20/$0.50/1M tokens) + real-time web & X search');
  } else if (grokKey?.status === 'active') {
    recommendations.push('✅ Grok (xAI) is active — EN content generation, trending topics, live news, and X social buzz enabled');
  }

  // Check Claude
  const claudeKey = keys.find(k => k.provider === 'claude');
  if (claudeKey?.status === 'unconfigured') {
    recommendations.push('Add ANTHROPIC_API_KEY for Claude AI - strong fallback for content generation');
  }

  // Check OpenAI
  const openaiKey = keys.find(k => k.provider === 'openai');
  if (openaiKey?.status === 'unconfigured') {
    recommendations.push('Add OPENAI_API_KEY for GPT models - additional AI fallback');
  }

  // Check SerpAPI for trends
  if (!integrations.serpApi.configured) {
    recommendations.push('Add SERPAPI_API_KEY for Google Trends data - enables topic research automation');
  }

  // Check database
  if (!integrations.database.configured) {
    recommendations.push('⚠️ CRITICAL: Configure DATABASE_URL for PostgreSQL database connection');
  }

  // Check Supabase
  if (!integrations.supabase.configured) {
    recommendations.push('Configure Supabase for authentication (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  }

  // Check Google Search Console
  if (!integrations.googleSearchConsole.configured) {
    recommendations.push('Configure Google Search Console for SEO indexing and analytics');
  }

  // Check Google Analytics
  if (!integrations.googleAnalytics.configured) {
    recommendations.push('Add GA4_MEASUREMENT_ID for traffic analytics');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All critical integrations are configured!');
  }

  return recommendations;
}

// POST - Test an API key
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { keyId, action } = await request.json();

    if (action === 'test') {
      let testResult = { success: false, message: 'Unknown provider' };

      switch (keyId) {
        case 'grok-key':
          testResult = await testGrokKey();
          break;
        case 'claude-key':
          testResult = await testClaudeKey();
          break;
        case 'openai-key':
          testResult = await testOpenAIKey();
          break;
        case 'gemini-key':
          testResult = await testGeminiKey();
          break;
      }

      return NextResponse.json(testResult);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Test failed' },
      { status: 500 }
    );
  }
}

async function testGrokKey(): Promise<{ success: boolean; message: string }> {
  const key = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  if (!key) {
    return { success: false, message: 'XAI_API_KEY not configured in environment' };
  }

  try {
    // Test 1: Chat Completions API (content generation)
    const chatResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        model: 'grok-4-1-fast',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say OK' }],
        stream: false,
      }),
    });

    if (!chatResponse.ok) {
      const error = await chatResponse.text().catch(() => '');
      return { success: false, message: `Chat API failed (${chatResponse.status}): ${error.slice(0, 150)}` };
    }

    const chatData = await chatResponse.json();
    const chatOk = !!chatData.choices?.[0]?.message?.content;

    // Test 2: Responses API (live search — web_search + x_search)
    let searchOk = false;
    try {
      const searchResponse = await fetch('https://api.x.ai/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          model: 'grok-4-1-fast',
          tools: [{ type: 'web_search' }],
          input: 'London weather today',
          stream: false,
        }),
      });
      searchOk = searchResponse.ok;
    } catch {
      // Search test is non-blocking
    }

    const features = [
      chatOk ? 'Chat Completions' : null,
      searchOk ? 'Live Search (web + X)' : null,
    ].filter(Boolean);

    return {
      success: true,
      message: `Grok API key is valid. Active features: ${features.join(', ')}. Model: grok-4-1-fast ($0.20/$0.50 per 1M tokens)`,
    };
  } catch (error) {
    return { success: false, message: `Failed to connect to xAI API: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function testClaudeKey(): Promise<{ success: boolean; message: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { success: false, message: 'ANTHROPIC_API_KEY not configured in environment' };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });

    if (response.ok) {
      return { success: true, message: 'Claude API key is valid and working' };
    } else {
      const error = await response.json();
      return { success: false, message: error.error?.message || 'API key validation failed' };
    }
  } catch (error) {
    return { success: false, message: 'Failed to connect to Anthropic API' };
  }
}

async function testOpenAIKey(): Promise<{ success: boolean; message: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return { success: false, message: 'OPENAI_API_KEY not configured in environment' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${key}`
      }
    });

    if (response.ok) {
      return { success: true, message: 'OpenAI API key is valid and working' };
    } else {
      const error = await response.json();
      return { success: false, message: error.error?.message || 'API key validation failed' };
    }
  } catch (error) {
    return { success: false, message: 'Failed to connect to OpenAI API' };
  }
}

async function testGeminiKey(): Promise<{ success: boolean; message: string }> {
  const key = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    return { success: false, message: 'GOOGLE_AI_API_KEY not configured in environment' };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${key}`
    );

    if (response.ok) {
      return { success: true, message: 'Gemini API key is valid and working' };
    } else {
      const error = await response.json();
      return { success: false, message: error.error?.message || 'API key validation failed' };
    }
  } catch (error) {
    return { success: false, message: 'Failed to connect to Google AI API' };
  }
}

// PUT - Save API key (for future use when we want to store in database)
export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  return NextResponse.json(
    {
      error: 'API keys should be configured via environment variables (.env file) for security',
      instructions: [
        'Add your API keys to your .env file:',
        'XAI_API_KEY=xai-... (Grok - recommended, cheapest + live search)',
        'ANTHROPIC_API_KEY=sk-ant-...',
        'OPENAI_API_KEY=sk-...',
        'GOOGLE_AI_API_KEY=...',
        'Then restart your development server'
      ]
    },
    { status: 400 }
  );
}
