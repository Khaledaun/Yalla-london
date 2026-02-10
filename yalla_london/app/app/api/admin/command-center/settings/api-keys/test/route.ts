/**
 * Test API Key
 *
 * Test if an API key is valid by making a simple request.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { testApiKey, AIProvider } from '@/lib/ai/provider';
import { decrypt } from '@/lib/encryption';
import { requireAdmin } from "@/lib/admin-middleware";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { keyId, provider, key } = await request.json();

    let apiKey = key;

    // If no key provided, get from database
    if (!apiKey && keyId) {
      const providerRecord = await prisma.modelProvider.findUnique({
        where: { id: keyId },
      });

      if (providerRecord?.api_key_encrypted) {
        apiKey = decrypt(providerRecord.api_key_encrypted);
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No API key found to test' },
        { status: 400 }
      );
    }

    // Test the key
    const isValid = await testApiKey(provider as AIProvider, apiKey);

    // Update test status in database
    if (keyId) {
      await prisma.modelProvider.update({
        where: { id: keyId },
        data: {
          test_status: isValid ? 'success' : 'failed',
          last_tested_at: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: isValid,
      status: isValid ? 'active' : 'invalid',
      message: isValid
        ? 'API key is valid and working'
        : 'API key test failed - please check the key',
    });
  } catch (error) {
    console.error('Failed to test API key:', error);
    return NextResponse.json(
      {
        success: false,
        status: 'error',
        message: 'Failed to test API key',
        error: String(error),
      },
      { status: 500 }
    );
  }
}
