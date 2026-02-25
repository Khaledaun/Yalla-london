/**
 * AI Model Test Connection API
 * Tests a provider's API key by making a minimal request.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-middleware';
import crypto from 'crypto';

function getDerivedKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || 'default-dev-key-do-not-use-in-prod';
  return crypto.scryptSync(raw, 'ai-model-salt-v1', 32);
}

function decryptApiKey(ciphertext: string): string | null {
  try {
    const key = getDerivedKey();
    const parts = ciphertext.split(':');
    if (parts.length !== 3) return null;
    const [ivHex, authTagHex, encHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  } catch {
    return null;
  }
}

async function testAnthropicKey(apiKey: string): Promise<{ success: boolean; model?: string; error?: string }> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say "ok"' }],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { success: true, model: 'claude-haiku-4-5-20251001' };
    const body = await res.json().catch(() => ({}));
    return { success: false, error: body.error?.message || `HTTP ${res.status}` };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Connection failed' };
  }
}

async function testOpenAIKey(apiKey: string): Promise<{ success: boolean; model?: string; error?: string }> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { success: true, model: 'gpt-4o-mini' };
    const body = await res.json().catch(() => ({}));
    return { success: false, error: body.error?.message || `HTTP ${res.status}` };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Connection failed' };
  }
}

async function testGeminiKey(apiKey: string): Promise<{ success: boolean; model?: string; error?: string }> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (res.ok) return { success: true, model: 'gemini-1.5-flash' };
    const body = await res.json().catch(() => ({}));
    return { success: false, error: body.error?.message || `HTTP ${res.status}` };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Connection failed' };
  }
}

async function testPerplexityKey(apiKey: string): Promise<{ success: boolean; model?: string; error?: string }> {
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: 'Say "ok"' }],
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { success: true, model: 'sonar' };
    const body = await res.json().catch(() => ({}));
    return { success: false, error: body.error?.message || `HTTP ${res.status}` };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Connection failed' };
  }
}

async function testXaiKey(apiKey: string): Promise<{ success: boolean; model?: string; error?: string }> {
  try {
    const res = await fetch('https://api.x.ai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { success: true, model: 'grok-2-1212' };
    const body = await res.json().catch(() => ({}));
    return { success: false, error: body.error?.message || `HTTP ${res.status}` };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Connection failed' };
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { providerId, apiKey: rawKey } = await request.json();

    let providerName: string;
    let apiKey: string;

    if (providerId) {
      const provider = await prisma.modelProvider.findUnique({ where: { id: providerId } });
      if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
      if (!provider.api_key_encrypted) return NextResponse.json({ error: 'No API key stored' }, { status: 400 });
      const decrypted = decryptApiKey(provider.api_key_encrypted);
      if (!decrypted) return NextResponse.json({ error: 'Failed to decrypt key' }, { status: 500 });
      apiKey = decrypted;
      providerName = provider.name;
    } else if (rawKey) {
      // Testing a key before saving — provider name must be provided
      const { providerName: name } = await request.json().catch(() => ({}));
      providerName = name || 'unknown';
      apiKey = rawKey;
    } else {
      return NextResponse.json({ error: 'providerId or apiKey required' }, { status: 400 });
    }

    let result: { success: boolean; model?: string; error?: string };
    switch (providerName) {
      case 'anthropic': result = await testAnthropicKey(apiKey); break;
      case 'openai':    result = await testOpenAIKey(apiKey); break;
      case 'google':    result = await testGeminiKey(apiKey); break;
      case 'perplexity': result = await testPerplexityKey(apiKey); break;
      case 'xai':       result = await testXaiKey(apiKey); break;
      default:          result = { success: false, error: 'Unknown provider' };
    }

    // Update test status in DB
    if (providerId) {
      await prisma.modelProvider.update({
        where: { id: providerId },
        data: {
          last_tested_at: new Date(),
          test_status: result.success ? 'success' : 'failed',
        },
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.warn('[ai-models/test]', err);
    return NextResponse.json({ error: 'Test failed' }, { status: 500 });
  }
}
