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
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
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
  } catch (e) {
    console.warn('[ai-models/test] Failed to decrypt API key:', e instanceof Error ? e.message : 'unknown error');
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
    return { success: false, error: `Authentication failed (HTTP ${res.status})` };
  } catch {
    return { success: false, error: 'Connection failed — check your network and API key' };
  }
}

async function testOpenAIKey(apiKey: string): Promise<{ success: boolean; model?: string; error?: string }> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { success: true, model: 'gpt-4o-mini' };
    return { success: false, error: `Authentication failed (HTTP ${res.status})` };
  } catch {
    return { success: false, error: 'Connection failed — check your network and API key' };
  }
}

async function testGeminiKey(apiKey: string): Promise<{ success: boolean; model?: string; error?: string }> {
  try {
    // Use POST with key in header instead of URL query parameter (H-006 fix)
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say ok' }] }],
        generationConfig: { maxOutputTokens: 5 },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { success: true, model: 'gemini-1.5-flash' };
    return { success: false, error: `Authentication failed (HTTP ${res.status})` };
  } catch {
    return { success: false, error: 'Connection failed — check your network and API key' };
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
    return { success: false, error: `Authentication failed (HTTP ${res.status})` };
  } catch {
    return { success: false, error: 'Connection failed — check your network and API key' };
  }
}

async function testXaiKey(apiKey: string): Promise<{ success: boolean; model?: string; error?: string }> {
  try {
    const res = await fetch('https://api.x.ai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { success: true, model: 'grok-2-1212' };
    return { success: false, error: `Authentication failed (HTTP ${res.status})` };
  } catch {
    return { success: false, error: 'Connection failed — check your network and API key' };
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // C-002 fix: read body once and destructure all needed fields
    const { providerId, apiKey: rawKey, providerName: rawProviderName } = await request.json();

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
      // Testing a key before saving — providerName must be provided in the same request body
      if (!rawProviderName) {
        return NextResponse.json({ error: 'providerName required when testing a raw key' }, { status: 400 });
      }
      providerName = rawProviderName;
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
