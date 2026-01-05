/**
 * API Keys Management
 *
 * Manage AI provider API keys with encryption.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt, maskApiKey } from '@/lib/encryption';
import { testApiKey, AIProvider } from '@/lib/ai/provider';

export async function GET() {
  try {
    // Get all AI providers
    const providers = await prisma.modelProvider.findMany({
      where: {
        provider_type: 'llm',
      },
      orderBy: { created_at: 'asc' },
    });

    // Map to response format with masked keys
    const keys = providers.map((provider) => ({
      id: provider.id,
      provider: provider.name as AIProvider,
      name: provider.display_name,
      key: provider.api_key_encrypted ? maskApiKey(decrypt(provider.api_key_encrypted)) : '',
      status: provider.test_status === 'success' ? 'active' :
              provider.api_key_encrypted ? 'unconfigured' : 'unconfigured',
      lastUsed: provider.last_tested_at?.toISOString() || null,
      usageThisMonth: 0, // Would need separate tracking
      usageLimit: null,
      models: provider.capabilities || [],
    }));

    // Add missing providers
    const existingProviders = keys.map((k) => k.provider);
    const allProviders: Array<{ id: string; name: AIProvider; displayName: string }> = [
      { id: 'claude', name: 'claude', displayName: 'Claude (Anthropic)' },
      { id: 'openai', name: 'openai', displayName: 'OpenAI (GPT)' },
      { id: 'gemini', name: 'gemini', displayName: 'Google Gemini' },
    ];

    for (const p of allProviders) {
      if (!existingProviders.includes(p.name)) {
        keys.push({
          id: p.id,
          provider: p.name,
          name: p.displayName,
          key: '',
          status: 'unconfigured',
          lastUsed: null,
          usageThisMonth: 0,
          usageLimit: null,
          models: [],
        });
      }
    }

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Failed to get API keys:', error);
    return NextResponse.json(
      { error: 'Failed to get API keys' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { keyId, key, provider } = await request.json();

    if (!key) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Encrypt the key
    const encryptedKey = encrypt(key);

    // Upsert the provider
    const providerNames: Record<string, string> = {
      claude: 'Claude (Anthropic)',
      openai: 'OpenAI (GPT)',
      gemini: 'Google Gemini',
    };

    const providerRecord = await prisma.modelProvider.upsert({
      where: { id: keyId || `provider-${provider}` },
      create: {
        id: `provider-${provider}`,
        name: provider,
        display_name: providerNames[provider] || provider,
        provider_type: 'llm',
        api_key_encrypted: encryptedKey,
        is_active: true,
        capabilities: [],
      },
      update: {
        api_key_encrypted: encryptedKey,
        is_active: true,
        updated_at: new Date(),
      },
    });

    // Also update ApiSettings for backward compatibility
    const keyNames: Record<string, string> = {
      claude: 'anthropic_api_key',
      openai: 'openai_api_key',
      gemini: 'google_api_key',
    };

    if (keyNames[provider]) {
      await prisma.apiSettings.upsert({
        where: { key_name: keyNames[provider] },
        create: {
          key_name: keyNames[provider],
          key_value: key, // Store plaintext for ApiSettings (legacy)
          is_active: true,
        },
        update: {
          key_value: key,
          is_active: true,
          updated_at: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      provider: providerRecord.name,
      masked: maskApiKey(key),
    });
  } catch (error) {
    console.error('Failed to save API key:', error);
    return NextResponse.json(
      { error: 'Failed to save API key' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider is required' },
        { status: 400 }
      );
    }

    // Remove from ModelProvider
    await prisma.modelProvider.deleteMany({
      where: { name: provider },
    });

    // Remove from ApiSettings
    const keyNames: Record<string, string> = {
      claude: 'anthropic_api_key',
      openai: 'openai_api_key',
      gemini: 'google_api_key',
    };

    if (keyNames[provider]) {
      await prisma.apiSettings.delete({
        where: { key_name: keyNames[provider] },
      }).catch(() => {
        // Key might not exist
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete API key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}
