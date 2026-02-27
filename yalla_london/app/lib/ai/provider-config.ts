/**
 * AI Provider Configuration — routing layer for all AI tasks.
 *
 * Reads/writes ModelProvider + ModelRoute records so the admin AI-Config UI
 * can let Khaled choose which model handles each content task without touching
 * code.
 *
 * DB access pattern: `const { prisma } = await import('@/lib/db')`
 * Error strategy: warn + return safe defaults so the pipeline never hard-crashes
 * because of a missing config row.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Every distinct AI task the platform can route to a provider. */
export type TaskType =
  | 'topic_research'
  | 'content_writing_en'
  | 'content_writing_ar'
  | 'seo_meta'
  | 'content_enhancement'
  | 'trend_detection'
  | 'quality_scoring'
  | 'arabic_translation'
  | 'image_alt_generation'
  | 'affiliate_copy'
  | 'commerce_trends'
  | 'commerce_listing_copy';

/** Human-readable labels for the admin UI. */
export const TASK_LABELS: Record<TaskType, string> = {
  topic_research: 'Topic Research',
  content_writing_en: 'Article Writing (English)',
  content_writing_ar: 'Article Writing (Arabic)',
  seo_meta: 'SEO Meta Generation',
  content_enhancement: 'Content Enhancement',
  trend_detection: 'Trend Detection',
  quality_scoring: 'Quality Scoring',
  arabic_translation: 'Arabic Translation',
  image_alt_generation: 'Image Alt Text',
  affiliate_copy: 'Affiliate Copy',
  commerce_trends: 'Commerce Trend Research',
  commerce_listing_copy: 'Commerce Listing Copy',
};

/** All task types as a constant array — used to drive seeding loops. */
const ALL_TASK_TYPES: TaskType[] = Object.keys(TASK_LABELS) as TaskType[];

// Default models per provider name — mirrors lib/ai/provider.ts DEFAULT_MODELS
const DEFAULT_MODELS: Record<string, string> = {
  grok: 'grok-4-1-fast',
  claude: 'claude-3-5-sonnet-20241022',
  openai: 'gpt-4-turbo-preview',
  gemini: 'gemini-pro',
};

// Provider priority — same order as PROVIDER_PRIORITY in lib/ai/provider.ts
const PROVIDER_PRIORITY_NAMES = ['grok', 'claude', 'openai', 'gemini'] as const;

// Env-var names that signal a provider key is configured
const PROVIDER_ENV_KEYS: Record<string, string[]> = {
  grok: ['XAI_API_KEY', 'GROK_API_KEY'],
  claude: ['ANTHROPIC_API_KEY'],
  openai: ['OPENAI_API_KEY'],
  gemini: ['GOOGLE_AI_API_KEY', 'GOOGLE_API_KEY'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return true when at least one env var for this provider name is non-empty. */
function providerHasEnvKey(providerName: string): boolean {
  const keys = PROVIDER_ENV_KEYS[providerName] ?? [];
  return keys.some((k) => !!process.env[k]);
}

/**
 * Derive the env-var fallback provider (first one that has a key set).
 * Mirrors the PROVIDER_PRIORITY logic in lib/ai/provider.ts.
 */
function getEnvFallbackProvider(): { provider: string; model: string } {
  for (const name of PROVIDER_PRIORITY_NAMES) {
    if (providerHasEnvKey(name)) {
      return { provider: name, model: DEFAULT_MODELS[name] ?? 'unknown' };
    }
  }
  // Absolute last resort — xAI Grok is the platform default
  return { provider: 'grok', model: DEFAULT_MODELS.grok };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the configured provider + model for a specific task type.
 *
 * Resolution order:
 * 1. ModelRoute DB record for this taskType (+ optional siteId)
 * 2. Env-var priority fallback (XAI_API_KEY → ANTHROPIC_API_KEY → …)
 */
export async function getProviderForTask(
  taskType: TaskType,
  siteId?: string,
): Promise<{ provider: string; model: string; fallback?: string }> {
  try {
    const { prisma } = await import('@/lib/db');

    // Try site-scoped route first, then global
    const whereOptions = siteId
      ? [
          { route_name: taskType, site_id: siteId, is_active: true },
          { route_name: taskType, site_id: null, is_active: true },
        ]
      : [{ route_name: taskType, site_id: null as string | null, is_active: true }];

    let route = null;
    for (const where of whereOptions) {
      route = await prisma.modelRoute.findFirst({
        where,
        include: { primary_provider: true },
      });
      if (route) break;
    }

    if (!route) {
      // No DB route configured — use env-var priority
      return getEnvFallbackProvider();
    }

    const primaryName = route.primary_provider.name;
    const primaryModel =
      (route.primary_provider.model_config_json as { model?: string } | null)?.model ??
      DEFAULT_MODELS[primaryName] ??
      'unknown';

    // Resolve fallback provider name if a fallback_provider_id is set
    let fallbackName: string | undefined;
    if (route.fallback_provider_id) {
      try {
        const fallbackProvider = await prisma.modelProvider.findUnique({
          where: { id: route.fallback_provider_id },
          select: { name: true },
        });
        fallbackName = fallbackProvider?.name ?? undefined;
      } catch (fbErr) {
        console.warn('[ai/provider-config] Failed to resolve fallback provider name (non-fatal):', fbErr instanceof Error ? fbErr.message : fbErr);
      }
    }

    return {
      provider: primaryName,
      model: primaryModel,
      fallback: fallbackName,
    };
  } catch (error) {
    console.warn(
      '[ai/provider-config] getProviderForTask failed, using env fallback:',
      error instanceof Error ? error.message : error,
    );
    return getEnvFallbackProvider();
  }
}

/**
 * Seed default ModelRoute + ModelProvider records if the table is empty.
 *
 * Idempotent — safe to call on every cold start.
 * Uses Grok as the default primary provider for all task types.
 */
export async function seedDefaultRoutes(): Promise<void> {
  try {
    const { prisma } = await import('@/lib/db');

    // Check whether any routes already exist (fast path — skip seeding)
    const existingCount = await prisma.modelRoute.count();
    if (existingCount > 0) return;

    // Find or create the default Grok provider record
    let grokProvider = await prisma.modelProvider.findFirst({
      where: { name: 'grok', provider_type: 'llm' },
    });

    if (!grokProvider) {
      grokProvider = await prisma.modelProvider.create({
        data: {
          name: 'grok',
          display_name: 'xAI Grok',
          provider_type: 'llm',
          capabilities: ['text_generation'],
          is_active: true,
          model_config_json: { model: DEFAULT_MODELS.grok },
        },
      });
    }

    // Create a ModelRoute for every task type
    await Promise.all(
      ALL_TASK_TYPES.map((taskType) =>
        prisma.modelRoute.create({
          data: {
            route_name: taskType,
            primary_provider_id: grokProvider!.id,
            routing_rules_json: {
              strategy: 'primary_with_fallback',
              description: `Default route for ${TASK_LABELS[taskType]}`,
            },
            cost_optimization: false,
            max_retries: 3,
            timeout_seconds: 30,
            is_active: true,
          },
        }),
      ),
    );

    console.info('[ai/provider-config] Seeded default ModelRoute records for all task types.');
  } catch (error) {
    console.warn(
      '[ai/provider-config] seedDefaultRoutes failed (non-fatal):',
      error instanceof Error ? error.message : error,
    );
  }
}

// Narrow type for a ModelRoute row when joined with its primary ModelProvider.
// Defined here because the dynamic import pattern loses Prisma's generated
// payload type inference — we only need these specific fields anyway.
interface RouteWithProvider {
  id: string;
  route_name: string;
  primary_provider_id: string;
  fallback_provider_id: string | null;
  is_active: boolean;
  primary_provider: {
    id: string;
    name: string;
    display_name: string;
    model_config_json: unknown; // cast to { model?: string } when reading
  };
}

/**
 * Return all routes joined with their provider names — used by the AI Config admin UI.
 */
export async function getAllRoutes(): Promise<
  Array<{
    taskType: TaskType;
    label: string;
    primary: string;
    primaryModel: string;
    fallback: string | null;
    status: 'active' | 'fallback_only' | 'inactive';
  }>
> {
  try {
    const { prisma } = await import('@/lib/db');

    const rawRoutes = await prisma.modelRoute.findMany({
      where: { is_active: true },
      include: { primary_provider: true },
    });

    // Cast to our narrow type — the shape is guaranteed by the include above
    const routes = rawRoutes as unknown as RouteWithProvider[];

    // Build a map of route_name → route for quick lookup
    const routeMap = new Map(routes.map((r) => [r.route_name, r]));

    // For every known task type, produce a row (even if no DB row exists yet)
    return await Promise.all(
      ALL_TASK_TYPES.map(async (taskType) => {
        const route = routeMap.get(taskType);

        if (!route) {
          // No DB record — determine status from env vars only
          const { provider, model } = getEnvFallbackProvider();
          const hasKey = providerHasEnvKey(provider);
          return {
            taskType,
            label: TASK_LABELS[taskType],
            primary: provider,
            primaryModel: model,
            fallback: null,
            status: hasKey ? ('active' as const) : ('inactive' as const),
          };
        }

        const primaryName = route.primary_provider.name;
        const primaryModel =
          (route.primary_provider.model_config_json as { model?: string } | null)?.model ??
          DEFAULT_MODELS[primaryName] ??
          'unknown';

        // Resolve fallback provider name
        let fallbackName: string | null = null;
        if (route.fallback_provider_id) {
          try {
            const fp = await prisma.modelProvider.findUnique({
              where: { id: route.fallback_provider_id },
              select: { name: true },
            });
            fallbackName = fp?.name ?? null;
          } catch (fbErr) {
            console.warn('[ai/provider-config] Failed to resolve fallback provider name in getAllRoutes (non-fatal):', fbErr instanceof Error ? fbErr.message : fbErr);
          }
        }

        // Determine status
        const primaryHasKey = providerHasEnvKey(primaryName);
        const fallbackHasKey = fallbackName ? providerHasEnvKey(fallbackName) : false;

        let status: 'active' | 'fallback_only' | 'inactive';
        if (primaryHasKey) {
          status = 'active';
        } else if (fallbackHasKey) {
          status = 'fallback_only';
        } else {
          status = 'inactive';
        }

        return {
          taskType,
          label: TASK_LABELS[taskType],
          primary: primaryName,
          primaryModel,
          fallback: fallbackName,
          status,
        };
      }),
    );
  } catch (error) {
    console.warn(
      '[ai/provider-config] getAllRoutes failed, returning env-based defaults:',
      error instanceof Error ? error.message : error,
    );

    // Return safe defaults so the UI doesn't crash
    const { provider, model } = getEnvFallbackProvider();
    const hasKey = providerHasEnvKey(provider);

    return ALL_TASK_TYPES.map((taskType) => ({
      taskType,
      label: TASK_LABELS[taskType],
      primary: provider,
      primaryModel: model,
      fallback: null,
      status: hasKey ? ('active' as const) : ('inactive' as const),
    }));
  }
}

/**
 * Persist updated route assignments from the AI Config UI.
 *
 * For each entry:
 * - Finds or creates a ModelProvider record for the primary + fallback names.
 * - Upserts the ModelRoute (match on route_name, global scope).
 */
export async function saveRoutes(
  routes: Array<{
    taskType: TaskType;
    primary: string;
    fallback: string | null;
  }>,
): Promise<void> {
  try {
    const { prisma } = await import('@/lib/db');

    for (const entry of routes) {
      // Find or create primary provider
      let primaryProvider = await prisma.modelProvider.findFirst({
        where: { name: entry.primary, provider_type: 'llm' },
      });
      if (!primaryProvider) {
        primaryProvider = await prisma.modelProvider.create({
          data: {
            name: entry.primary,
            display_name: entry.primary.charAt(0).toUpperCase() + entry.primary.slice(1),
            provider_type: 'llm',
            capabilities: ['text_generation'],
            is_active: true,
            model_config_json: { model: DEFAULT_MODELS[entry.primary] ?? 'unknown' },
          },
        });
      }

      // Find or create fallback provider (if specified)
      let fallbackProviderId: string | null = null;
      if (entry.fallback) {
        let fallbackProvider = await prisma.modelProvider.findFirst({
          where: { name: entry.fallback, provider_type: 'llm' },
        });
        if (!fallbackProvider) {
          fallbackProvider = await prisma.modelProvider.create({
            data: {
              name: entry.fallback,
              display_name:
                entry.fallback.charAt(0).toUpperCase() + entry.fallback.slice(1),
              provider_type: 'llm',
              capabilities: ['text_generation'],
              is_active: true,
              model_config_json: { model: DEFAULT_MODELS[entry.fallback] ?? 'unknown' },
            },
          });
        }
        fallbackProviderId = fallbackProvider.id;
      }

      // Upsert the ModelRoute (global scope — no site_id)
      const existing = await prisma.modelRoute.findFirst({
        where: { route_name: entry.taskType, site_id: null },
      });

      if (existing) {
        await prisma.modelRoute.update({
          where: { id: existing.id },
          data: {
            primary_provider_id: primaryProvider.id,
            fallback_provider_id: fallbackProviderId,
            updated_at: new Date(),
          },
        });
      } else {
        await prisma.modelRoute.create({
          data: {
            route_name: entry.taskType,
            primary_provider_id: primaryProvider.id,
            fallback_provider_id: fallbackProviderId,
            routing_rules_json: {
              strategy: 'primary_with_fallback',
              description: `Route for ${TASK_LABELS[entry.taskType]}`,
            },
            cost_optimization: false,
            max_retries: 3,
            timeout_seconds: 30,
            is_active: true,
          },
        });
      }
    }
  } catch (error) {
    console.warn(
      '[ai/provider-config] saveRoutes failed:',
      error instanceof Error ? error.message : error,
    );
    throw error; // Re-throw so the API route can return a 500 to the UI
  }
}
