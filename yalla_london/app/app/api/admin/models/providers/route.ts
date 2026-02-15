/**
 * Phase 4C LLM Model Providers API
 * Manage AI model providers with encrypted API keys
 */
import { NextRequest, NextResponse } from 'next/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/rbac';
import { z } from 'zod';
import crypto from 'crypto';
import { requireAdmin } from "@/lib/admin-middleware";

// Encryption key from environment (should be 32 bytes)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);

// Zod schemas for validation
const ModelProviderSchema = z.object({
  name: z.string().min(1).max(50),
  display_name: z.string().min(1).max(100),
  provider_type: z.enum(['llm', 'search', 'vision', 'embedding']),
  api_endpoint: z.string().url().optional(),
  api_key: z.string().min(1).optional(),
  api_version: z.string().optional(),
  rate_limits_json: z.record(z.any()).optional(),
  cost_per_token: z.number().positive().optional(),
  capabilities: z.array(z.enum(['text_generation', 'image_analysis', 'search', 'embedding'])),
  model_config_json: z.record(z.any()).optional(),
  is_active: z.boolean().default(true)
});

const UpdateModelProviderSchema = ModelProviderSchema.partial();

// Derive a consistent 32-byte key for AES-256
function getKeyBuffer(): Buffer {
  if (Buffer.isBuffer(ENCRYPTION_KEY)) return ENCRYPTION_KEY;
  return crypto.scryptSync(String(ENCRYPTION_KEY), 'model-provider-salt', 32);
}

// AES-GCM encryption/decryption functions
function encryptApiKey(plaintext: string): string {
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, new Uint8Array(getKeyBuffer()), new Uint8Array(iv));

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decryptApiKey(encryptedData: string): string {
  const algorithm = 'aes-256-gcm';
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(algorithm, new Uint8Array(getKeyBuffer()), new Uint8Array(iv));
  decipher.setAuthTag(new Uint8Array(authTag));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// GET - List model providers
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // Feature flag check
    if (!isFeatureEnabled('FEATURE_LLM_ROUTER')) {
      return NextResponse.json(
        { error: 'LLM router feature is disabled' },
        { status: 403 }
      );
    }

    // Permission check
    const permissionCheck = await requirePermission(request, 'manage_system');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    const { searchParams } = new URL(request.url);
    const providerType = searchParams.get('provider_type');
    const isActive = searchParams.get('is_active');

    const where: any = {};
    if (providerType) where.provider_type = providerType;
    if (isActive !== null) where.is_active = isActive === 'true';

    const providers = await prisma.modelProvider.findMany({
      where,
      select: {
        id: true,
        name: true,
        display_name: true,
        provider_type: true,
        api_endpoint: true,
        api_version: true,
        rate_limits_json: true,
        cost_per_token: true,
        capabilities: true,
        model_config_json: true,
        is_active: true,
        last_tested_at: true,
        test_status: true,
        created_at: true,
        updated_at: true,
        // Exclude encrypted API key from response
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: providers,
      total: providers.length
    });

  } catch (error) {
    console.error('Model providers list error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch model providers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Create new model provider
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // Feature flag check
    if (!isFeatureEnabled('FEATURE_LLM_ROUTER')) {
      return NextResponse.json(
        { error: 'LLM router feature is disabled' },
        { status: 403 }
      );
    }

    // Permission check
    const permissionCheck = await requirePermission(request, 'manage_system');
    if (permissionCheck instanceof NextResponse) {
      return permissionCheck;
    }

    const body = await request.json();
    
    // Validate input
    const validation = ModelProviderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { api_key, ...providerData } = validation.data;

    // Encrypt API key if provided
    let encryptedApiKey = null;
    if (api_key) {
      try {
        encryptedApiKey = encryptApiKey(api_key);
      } catch (encryptError) {
        return NextResponse.json(
          { error: 'Failed to encrypt API key' },
          { status: 500 }
        );
      }
    }

    // Create provider
    const provider = await prisma.modelProvider.create({
      data: {
        ...providerData,
        api_key_encrypted: encryptedApiKey,
      },
      select: {
        id: true,
        name: true,
        display_name: true,
        provider_type: true,
        api_endpoint: true,
        api_version: true,
        rate_limits_json: true,
        cost_per_token: true,
        capabilities: true,
        model_config_json: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        // Exclude encrypted API key from response
      }
    });

    // Log the creation
    await prisma.auditLog.create({
      data: {
        userId: permissionCheck.user.id,
        action: 'create',
        resource: 'model_provider',
        resourceId: provider.id,
        details: {
          name: provider.name,
          provider_type: provider.provider_type,
          has_api_key: !!api_key
        },
        success: true
      }
    });

    return NextResponse.json({
      success: true,
      data: provider
    }, { status: 201 });

  } catch (error) {
    console.error('Model provider creation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create model provider',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}