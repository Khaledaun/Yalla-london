/**
 * AI Models API — Provider Management + Task Routing
 * Handles CRUD for ModelProvider and ModelRoute records.
 * API keys are stored AES-GCM encrypted. Never returned in plaintext.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-middleware';
import { getActiveSiteIds } from '@/config/sites';
import crypto from 'crypto';

// ── Encryption helpers ──────────────────────────────────────────────────────

function getDerivedKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || 'default-dev-key-do-not-use-in-prod';
  return crypto.scryptSync(raw, 'ai-model-salt-v1', 32);
}

function encryptApiKey(plaintext: string): string {
  const key = getDerivedKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
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

function maskApiKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return key.substring(0, 4) + '••••••••' + key.slice(-4);
}

// ── Known provider catalogue ────────────────────────────────────────────────

const KNOWN_PROVIDERS = {
  anthropic: {
    display_name: 'Anthropic (Claude)',
    provider_type: 'llm',
    api_endpoint: 'https://api.anthropic.com/v1',
    models: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5-20251001'],
    capabilities: ['text_generation'],
    color: '#C8322B',
    icon: 'claude',
  },
  openai: {
    display_name: 'OpenAI',
    provider_type: 'llm',
    api_endpoint: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini'],
    capabilities: ['text_generation', 'image_analysis'],
    color: '#10A37F',
    icon: 'openai',
  },
  google: {
    display_name: 'Google (Gemini)',
    provider_type: 'llm',
    api_endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'],
    capabilities: ['text_generation', 'image_analysis', 'search'],
    color: '#4285F4',
    icon: 'gemini',
  },
  perplexity: {
    display_name: 'Perplexity',
    provider_type: 'llm',
    api_endpoint: 'https://api.perplexity.ai',
    models: ['sonar-pro', 'sonar', 'sonar-reasoning'],
    capabilities: ['text_generation', 'search'],
    color: '#20808D',
    icon: 'perplexity',
  },
  xai: {
    display_name: 'xAI (Grok)',
    provider_type: 'llm',
    api_endpoint: 'https://api.x.ai/v1',
    models: ['grok-2-1212', 'grok-2-vision-1212', 'grok-beta'],
    capabilities: ['text_generation', 'image_analysis'],
    color: '#1DA1F2',
    icon: 'xai',
  },
} as const;

// ── Task definitions ────────────────────────────────────────────────────────

const PIPELINE_TASKS = [
  { id: 'topic_generation',        label: 'Topic Generation',         description: 'Discovers weekly content topics' },
  { id: 'content_generation_en',   label: 'Content Generation (EN)',  description: 'Writes English articles' },
  { id: 'content_generation_ar',   label: 'Content Generation (AR)',  description: 'Writes Arabic articles' },
  { id: 'content_outline',         label: 'Content Outline',          description: 'Creates article outlines' },
  { id: 'fact_verification',       label: 'Fact Verification',        description: 'Verifies article facts & claims' },
  { id: 'seo_audit',               label: 'SEO Audit',                description: 'Audits page SEO health' },
  { id: 'affiliate_injection',     label: 'Affiliate Link Finder',    description: 'Finds affiliate opportunities' },
  { id: 'social_content',          label: 'Social Content',           description: 'Generates social media posts' },
  { id: 'image_description',       label: 'Image Alt Text',           description: 'Describes images for accessibility' },
  { id: 'seo_meta_generation',     label: 'Meta Tag Generation',      description: 'Writes SEO meta titles & descriptions' },
];

// ── GET: List providers + routes ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const view = searchParams.get('view') || 'providers'; // providers | routes | tasks | usage

    if (view === 'catalogue') {
      return NextResponse.json({ catalogue: KNOWN_PROVIDERS, tasks: PIPELINE_TASKS });
    }

    if (view === 'routes') {
      const routes = await prisma.modelRoute.findMany({
        where: siteId ? { site_id: siteId } : {},
        include: { primary_provider: { select: { id: true, name: true, display_name: true, is_active: true } } },
        orderBy: { route_name: 'asc' },
      });

      return NextResponse.json({
        routes: routes.map((r) => ({
          id: r.id,
          siteId: r.site_id,
          routeName: r.route_name,
          primaryProviderId: r.primary_provider_id,
          primaryProviderName: r.primary_provider?.display_name,
          fallbackProviderId: r.fallback_provider_id,
          costOptimization: r.cost_optimization,
          maxRetries: r.max_retries,
          isActive: r.is_active,
        })),
        tasks: PIPELINE_TASKS,
      });
    }

    if (view === 'usage') {
      // Aggregate LLM usage from CronJobLog result_summary field
      const recentLogs = await prisma.cronJobLog.findMany({
        where: {
          started_at: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          result_summary: { not: null },
        },
        select: { job_name: true, started_at: true, result_summary: true, site_id: true },
        orderBy: { started_at: 'desc' },
        take: 500,
      });

      // Count runs per job name as proxy for model usage
      const usageByJob: Record<string, number> = {};
      recentLogs.forEach((log) => {
        usageByJob[log.job_name] = (usageByJob[log.job_name] || 0) + 1;
      });

      return NextResponse.json({ usageByJob, logCount: recentLogs.length });
    }

    // Default: list providers
    const providers = await prisma.modelProvider.findMany({
      where: siteId ? { site_id: siteId } : {},
      orderBy: [{ is_active: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({
      providers: providers.map((p) => ({
        id: p.id,
        siteId: p.site_id,
        name: p.name,
        displayName: p.display_name,
        providerType: p.provider_type,
        apiEndpoint: p.api_endpoint,
        hasApiKey: !!p.api_key_encrypted,
        apiKeyMasked: p.api_key_encrypted
          ? maskApiKey(decryptApiKey(p.api_key_encrypted) || '••••')
          : null,
        capabilities: p.capabilities,
        modelConfigJson: p.model_config_json as Record<string, unknown> | null,
        isActive: p.is_active,
        lastTestedAt: p.last_tested_at?.toISOString() ?? null,
        testStatus: p.test_status,
        createdAt: p.created_at.toISOString(),
        // Catalogue metadata
        knownProvider: KNOWN_PROVIDERS[p.name as keyof typeof KNOWN_PROVIDERS] ?? null,
      })),
      catalogue: KNOWN_PROVIDERS,
      tasks: PIPELINE_TASKS,
    });
  } catch (err) {
    console.warn('[ai-models GET]', err);
    return NextResponse.json({ error: 'Failed to load AI models' }, { status: 500 });
  }
}

// ── POST: Create or update provider / route ──────────────────────────────────

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { action } = body;

    // ── Upsert provider ──
    if (action === 'upsert_provider') {
      const { name, displayName, apiKey, siteId, modelConfigJson, isActive } = body;
      if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

      const catalogue = KNOWN_PROVIDERS[name as keyof typeof KNOWN_PROVIDERS];
      const encryptedKey = apiKey ? encryptApiKey(apiKey) : undefined;

      const existing = await prisma.modelProvider.findFirst({
        where: { name, site_id: siteId ?? null },
      });

      if (existing) {
        const updated = await prisma.modelProvider.update({
          where: { id: existing.id },
          data: {
            display_name: displayName || catalogue?.display_name || name,
            ...(encryptedKey ? { api_key_encrypted: encryptedKey } : {}),
            model_config_json: modelConfigJson || existing.model_config_json,
            is_active: isActive ?? existing.is_active,
            updated_at: new Date(),
          },
        });
        return NextResponse.json({ success: true, id: updated.id, mode: 'updated' });
      }

      const created = await prisma.modelProvider.create({
        data: {
          name,
          display_name: displayName || catalogue?.display_name || name,
          provider_type: catalogue?.provider_type || 'llm',
          api_endpoint: catalogue?.api_endpoint,
          api_key_encrypted: encryptedKey,
          capabilities: catalogue?.capabilities ? [...catalogue.capabilities] : ['text_generation'],
          model_config_json: modelConfigJson || { defaultModel: catalogue?.models[0] },
          is_active: isActive ?? true,
          site_id: siteId ?? null,
        },
      });
      return NextResponse.json({ success: true, id: created.id, mode: 'created' });
    }

    // ── Upsert route (task → provider mapping) ──
    if (action === 'upsert_route') {
      const { routeName, primaryProviderId, fallbackProviderId, siteId, isActive } = body;
      if (!routeName || !primaryProviderId) {
        return NextResponse.json({ error: 'routeName and primaryProviderId required' }, { status: 400 });
      }

      const existing = await prisma.modelRoute.findFirst({
        where: { route_name: routeName, site_id: siteId ?? null },
      });

      if (existing) {
        await prisma.modelRoute.update({
          where: { id: existing.id },
          data: {
            primary_provider_id: primaryProviderId,
            fallback_provider_id: fallbackProviderId ?? null,
            is_active: isActive ?? true,
            updated_at: new Date(),
          },
        });
      } else {
        await prisma.modelRoute.create({
          data: {
            route_name: routeName,
            primary_provider_id: primaryProviderId,
            fallback_provider_id: fallbackProviderId ?? null,
            routing_rules_json: {},
            is_active: isActive ?? true,
            site_id: siteId ?? null,
          },
        });
      }

      return NextResponse.json({ success: true });
    }

    // ── Delete provider ──
    if (action === 'delete_provider') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      await prisma.modelProvider.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    // ── Toggle provider active ──
    if (action === 'toggle_provider') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      const provider = await prisma.modelProvider.findUnique({ where: { id } });
      if (!provider) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await prisma.modelProvider.update({
        where: { id },
        data: { is_active: !provider.is_active },
      });
      return NextResponse.json({ success: true, isActive: !provider.is_active });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.warn('[ai-models POST]', err);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
