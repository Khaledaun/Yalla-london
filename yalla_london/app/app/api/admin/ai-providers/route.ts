export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  AI_PROVIDERS,
  AIProviderType,
  getAllProvidersStatus,
  getActiveProvider,
  isProviderConfigured,
  generateWithProvider,
} from '@/lib/ai-providers';

/**
 * GET /api/admin/ai-providers
 * Get all AI providers configuration and status
 */
export async function GET(request: NextRequest) {
  try {
    // Get provider status from environment
    const providersStatus = getAllProvidersStatus();
    const activeProvider = getActiveProvider();

    // Try to get saved preferences from database
    let savedSettings: any = null;
    try {
      savedSettings = await prisma.apiSettings.findUnique({
        where: { key_name: 'ai_provider_settings' },
      });
    } catch (e) {
      // Table might not exist yet
      console.warn('Could not fetch AI provider settings from database:', e);
    }

    const settings = savedSettings?.key_value
      ? JSON.parse(savedSettings.key_value)
      : {
          activeProvider,
          fallbackEnabled: true,
          fallbackOrder: ['claude', 'openai', 'gemini', 'grok', 'perplexity'],
          topicResearchProvider: 'perplexity',
          contentGenerationProvider: activeProvider,
          seoAuditProvider: activeProvider,
        };

    // Build provider details
    const providers = Object.entries(AI_PROVIDERS).map(([id, config]) => ({
      id,
      name: config.name,
      displayName: config.displayName,
      configured: isProviderConfigured(id as AIProviderType),
      models: config.models,
      defaultModel: config.defaultModel,
      capabilities: config.capabilities,
      costPer1kTokens: config.costPer1kTokens,
      maxTokens: config.maxTokens,
      isActive: settings.activeProvider === id,
    }));

    return NextResponse.json({
      success: true,
      providers,
      settings: {
        activeProvider: settings.activeProvider,
        fallbackEnabled: settings.fallbackEnabled,
        fallbackOrder: settings.fallbackOrder,
        routeSettings: {
          topicResearch: settings.topicResearchProvider,
          contentGeneration: settings.contentGenerationProvider,
          seoAudit: settings.seoAuditProvider,
        },
      },
      configuredCount: providers.filter((p) => p.configured).length,
      totalCount: providers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching AI providers:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch AI providers',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai-providers
 * Update AI provider settings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      activeProvider,
      fallbackEnabled,
      fallbackOrder,
      topicResearchProvider,
      contentGenerationProvider,
      seoAuditProvider,
    } = body;

    // Validate provider
    if (activeProvider && !AI_PROVIDERS[activeProvider as AIProviderType]) {
      return NextResponse.json(
        { success: false, error: `Invalid provider: ${activeProvider}` },
        { status: 400 }
      );
    }

    // Build settings object
    const settings = {
      activeProvider: activeProvider || getActiveProvider(),
      fallbackEnabled: fallbackEnabled !== false,
      fallbackOrder: fallbackOrder || ['claude', 'openai', 'gemini', 'grok', 'perplexity'],
      topicResearchProvider: topicResearchProvider || 'perplexity',
      contentGenerationProvider: contentGenerationProvider || activeProvider,
      seoAuditProvider: seoAuditProvider || activeProvider,
      updatedAt: new Date().toISOString(),
    };

    // Save to database
    try {
      await prisma.apiSettings.upsert({
        where: { key_name: 'ai_provider_settings' },
        update: {
          key_value: JSON.stringify(settings),
          updated_at: new Date(),
        },
        create: {
          key_name: 'ai_provider_settings',
          key_value: JSON.stringify(settings),
          is_active: true,
        },
      });
    } catch (e) {
      console.warn('Could not save AI provider settings to database:', e);
      // Continue anyway - settings will work from environment
    }

    return NextResponse.json({
      success: true,
      message: 'AI provider settings updated',
      settings,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating AI providers:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update AI providers',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/ai-providers
 * Test a specific provider
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, testPrompt } = body;

    if (!provider || !AI_PROVIDERS[provider as AIProviderType]) {
      return NextResponse.json(
        { success: false, error: 'Invalid provider specified' },
        { status: 400 }
      );
    }

    if (!isProviderConfigured(provider)) {
      return NextResponse.json(
        {
          success: false,
          error: `Provider ${provider} is not configured. Please set the API key.`,
        },
        { status: 400 }
      );
    }

    const config = AI_PROVIDERS[provider as AIProviderType];
    const prompt = testPrompt || 'Say "Hello from ' + config.displayName + '!" in one sentence.';

    const result = await generateWithProvider(
      provider as AIProviderType,
      [
        { role: 'system', content: 'You are a helpful assistant. Respond briefly.' },
        { role: 'user', content: prompt },
      ],
      { max_tokens: 100, temperature: 0.5 }
    );

    // Update last tested status in database
    try {
      await prisma.apiSettings.upsert({
        where: { key_name: `ai_provider_test_${provider}` },
        update: {
          key_value: JSON.stringify({
            lastTested: new Date().toISOString(),
            success: result.success,
            responseTimeMs: result.responseTimeMs,
            error: result.error,
          }),
          test_status: result.success ? 'success' : 'failed',
          last_tested: new Date(),
          updated_at: new Date(),
        },
        create: {
          key_name: `ai_provider_test_${provider}`,
          key_value: JSON.stringify({
            lastTested: new Date().toISOString(),
            success: result.success,
            responseTimeMs: result.responseTimeMs,
            error: result.error,
          }),
          test_status: result.success ? 'success' : 'failed',
          last_tested: new Date(),
          is_active: true,
        },
      });
    } catch (e) {
      console.warn('Could not save test result to database:', e);
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        provider,
        displayName: config.displayName,
        model: result.model,
        response: result.content,
        tokensUsed: result.tokensUsed,
        responseTimeMs: result.responseTimeMs,
        cost: result.cost,
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          provider,
          displayName: config.displayName,
          error: result.error,
          responseTimeMs: result.responseTimeMs,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error testing AI provider:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test AI provider',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
