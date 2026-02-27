/**
 * New Site Builder — orchestrates everything needed to get a new website
 * from "just an idea" to "first 30 topics ready to generate content".
 *
 * Called by the Website Builder wizard after the user completes all steps.
 * Each step is independently try/catched so non-fatal failures are logged
 * and reported without aborting the whole build.
 *
 * DB access: `const { prisma } = await import('@/lib/db')`
 * No hardcoded site IDs anywhere in this file.
 */

import { SITES } from '@/config/sites';
import { seedDefaultRoutes } from '@/lib/ai/provider-config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SiteConfig {
  siteId: string;
  name: string;
  domain: string;
  siteType: 'travel_blog' | 'yacht_charter' | 'custom';
  primaryLanguage: 'en' | 'ar';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  topics: string[];
  // Accept both field names for compatibility with wizard page
  affiliates?: string[];
  affiliatePartners?: string[];
  // Optional fields from wizard
  tagline?: string;
  secondaryLanguage?: string;
  targetAudience?: string;
  targetKeywords?: string[];
  contentVelocity?: number;
  automations?: string[];
  researchNotes?: string;
}

export interface BuildProgress {
  step: string;
  status: 'pending' | 'running' | 'done' | 'error';
  message: string;
  error?: string;
}

export interface BuildResult {
  success: boolean;
  siteId: string;
  steps: BuildProgress[];
  topicsCreated: number;
  errors: string[];
  nextSteps: string[];
}

// ---------------------------------------------------------------------------
// Topic seed lists per site type
// ---------------------------------------------------------------------------

/**
 * Generic seed topics per site type.
 * These give the content pipeline something to work with immediately after
 * the site is created, even before Khaled runs the weekly-topics cron.
 */
const SEED_TOPICS: Record<SiteConfig['siteType'], string[]> = {
  travel_blog: [
    'luxury hotels',
    'halal restaurants',
    'local neighbourhood guides',
    'day trips from the city',
    'shopping districts and souks',
    'hidden gems for Arab travellers',
    'best rooftop bars and views',
    'family-friendly attractions',
    'airport transfer tips',
    'spa and wellness retreats',
    'street food guide',
    'top beaches and coastal spots',
    'cultural heritage sites',
    'mosque and prayer facilities',
    'Arabic-speaking tour guides',
    'luxury car hire',
    'private villa rentals',
    'Michelin-starred dining',
    'boat tours and water experiences',
    'photography spots',
    'weekend itineraries',
    'budget luxury travel tips',
    'seasonal events and festivals',
    'first-time visitor guide',
    'transport and getting around',
    'currency and tipping guide',
    'packing list for Arab travellers',
    'travel insurance guide',
    'visa requirements and tips',
    'best time to visit',
  ],
  yacht_charter: [
    'how to charter a yacht',
    'yacht charter itineraries',
    'best sailing destinations in the Mediterranean',
    'crewed vs bareboat charters',
    'luxury yacht features and amenities',
    'superyacht dining on board',
    'Mediterranean islands guide',
    'yacht charter cost breakdown',
    'best anchorages and bays',
    'water sports on a charter yacht',
    'yacht charter for families',
    'corporate yacht charter events',
    'sunset sailing experiences',
    'yacht charter tips for first timers',
    'what to pack for a yacht holiday',
    'halal-friendly yacht charters',
    'private chef on board',
    'yacht charter vs cruise comparison',
    'best months for Mediterranean sailing',
    'how to choose the right yacht size',
    'Turkish gulet sailing holidays',
    'Greek island hopping by yacht',
    'Croatian coast sailing route',
    'Amalfi Coast yacht charter guide',
    'yacht broker partnership guide',
    'environmental impact of yachting',
    'yacht racing events calendar',
    'exclusive anchorages off the beaten track',
    'photography from a yacht',
    'booking a last-minute yacht charter',
  ],
  custom: [
    'getting started guide',
    'top tips for visitors',
    'local culture and customs',
    'accommodation options',
    'dining guide',
    'transport and logistics',
    'shopping recommendations',
    'entertainment and nightlife',
    'family activities',
    'outdoor adventures',
    'luxury experiences',
    'budget-friendly options',
    'seasonal highlights',
    'hidden local secrets',
    'photography locations',
    'wellness and relaxation',
    'cultural events and festivals',
    'day trip ideas',
    'food and drink highlights',
    'safety and travel tips',
    'language and communication',
    'money and payments guide',
    'emergency contacts and services',
    'sustainable travel guide',
    'solo traveller tips',
    'group travel planning',
    'booking in advance vs last-minute',
    'travel insurance advice',
    'visa and entry requirements',
    'top highlights overview',
  ],
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Check that siteId + domain are not already in use before starting the build.
 *
 * Checks both the static SITES config (in-code definitions) and the Site DB
 * table (runtime records created via the wizard) so we catch duplicates
 * regardless of how the site was originally created.
 */
export async function validateNewSite(
  siteId: string,
  domain: string,
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // 1. Format validation
  if (!/^[a-z0-9-]+$/.test(siteId)) {
    errors.push(
      'Site ID may only contain lowercase letters, numbers, and hyphens (e.g. "yalla-london")',
    );
  }

  // 2. Check static SITES config for slug collision
  if (SITES[siteId]) {
    errors.push('Site ID already taken — choose a different identifier');
  }

  // 3. Check static SITES config for domain collision
  const domainAlreadyInConfig = Object.values(SITES).some((s) => s.domain === domain);
  if (domainAlreadyInConfig) {
    errors.push('Domain already configured — this domain belongs to an existing site');
  }

  // 4. Check DB Site table (for sites created at runtime via the wizard)
  try {
    const { prisma } = await import('@/lib/db');

    const existingBySlug = await prisma.site.findUnique({ where: { slug: siteId } });
    if (existingBySlug && !SITES[siteId]) {
      // Only add if not already caught by static check above
      errors.push('Site ID already taken — choose a different identifier');
    }

    const existingByDomain = await prisma.site.findUnique({ where: { domain } });
    if (existingByDomain && !domainAlreadyInConfig) {
      errors.push('Domain already in use — this domain belongs to an existing site');
    }
  } catch (error) {
    // DB check is best-effort — don't block validation if DB is unreachable
    console.warn(
      '[new-site/builder] validateNewSite DB check failed (non-fatal):',
      error instanceof Error ? error.message : error,
    );
  }

  // Deduplicate errors (both static + DB checks may produce the same message)
  const uniqueErrors = [...new Set(errors)];

  return {
    valid: uniqueErrors.length === 0,
    errors: uniqueErrors,
  };
}

// ---------------------------------------------------------------------------
// Build orchestration
// ---------------------------------------------------------------------------

/**
 * Create a new site end-to-end.
 *
 * Steps:
 *  1. Validate inputs
 *  2. Create Site DB record
 *  3. Seed 30 TopicProposal records
 *  4. Seed default AI ModelRoute records (idempotent)
 *
 * Each step is wrapped in try/catch. Steps 3 and 4 are non-fatal — if they
 * fail the site record still exists and the build is considered partially
 * successful so Khaled can retry the failed step from the dashboard.
 */
export async function buildNewSite(config: SiteConfig): Promise<BuildResult> {
  const steps: BuildProgress[] = [];
  const errors: string[] = [];
  let topicsCreated = 0;
  let buildSuccess = true;

  // Helper to record a step
  function recordStep(
    step: string,
    status: BuildProgress['status'],
    message: string,
    error?: string,
  ) {
    steps.push({ step, status, message, error });
    if (status === 'error' && error) {
      errors.push(`${step}: ${error}`);
    }
  }

  // -------------------------------------------------------------------------
  // Step 1 — Validate
  // -------------------------------------------------------------------------
  recordStep('validate', 'running', 'Validating site ID and domain…');

  const validation = await validateNewSite(config.siteId, config.domain);
  if (!validation.valid) {
    recordStep(
      'validate',
      'error',
      'Validation failed — cannot create site',
      validation.errors.join('; '),
    );
    return {
      success: false,
      siteId: config.siteId,
      steps,
      topicsCreated: 0,
      errors: validation.errors,
      nextSteps: [
        'Fix the validation errors shown above',
        'Choose a unique site ID and domain',
        'Run the wizard again',
      ],
    };
  }
  // Replace the 'running' entry with a 'done' entry
  steps[steps.length - 1] = {
    step: 'validate',
    status: 'done',
    message: 'Site ID and domain are available',
  };

  // -------------------------------------------------------------------------
  // Step 2 — Create Site DB record
  // -------------------------------------------------------------------------
  recordStep('create_site', 'running', 'Creating site record in database…');

  try {
    const { prisma } = await import('@/lib/db');

    // Compute text direction from primary language
    const direction = config.primaryLanguage === 'ar' ? 'rtl' : 'ltr';

    await prisma.site.create({
      data: {
        name: config.name,
        slug: config.siteId,
        domain: config.domain,
        default_locale: config.primaryLanguage,
        direction,
        primary_color: config.primaryColor,
        secondary_color: config.secondaryColor,
        is_active: true,
        settings_json: {
          primaryColor: config.primaryColor,
          secondaryColor: config.secondaryColor,
          accentColor: config.accentColor,
          topics: config.topics,
          affiliatePartners: config.affiliatePartners ?? config.affiliates ?? [],
          siteType: config.siteType,
          targetAudience: config.targetAudience ?? '',
          tagline: config.tagline ?? '',
          secondaryLanguage: config.secondaryLanguage ?? 'none',
          targetKeywords: config.targetKeywords ?? [],
          contentVelocity: config.contentVelocity ?? 1,
          automations: config.automations ?? [],
        },
      },
    });

    steps[steps.length - 1] = {
      step: 'create_site',
      status: 'done',
      message: `Site "${config.name}" created successfully`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordStep('create_site', 'error', 'Failed to create site record', msg);
    buildSuccess = false;

    // Site creation is fatal — no point continuing without the DB record
    return {
      success: false,
      siteId: config.siteId,
      steps,
      topicsCreated: 0,
      errors,
      nextSteps: [
        'Check database connection (Supabase dashboard)',
        'Verify the DB migration has been run (Settings → Database tab)',
        'Try again from the Website Builder wizard',
      ],
    };
  }

  // -------------------------------------------------------------------------
  // Step 3 — Seed 30 topic proposals
  // -------------------------------------------------------------------------
  recordStep('seed_topics', 'running', 'Seeding 30 starter topics…');

  try {
    const { prisma } = await import('@/lib/db');

    // Merge platform-default seed topics with any custom topics provided
    const seedList = SEED_TOPICS[config.siteType] ?? SEED_TOPICS.custom;
    const customTopics = config.topics.filter((t) => t.trim().length > 0);

    // Deduplicate: custom topics first, then generic seeds up to 30 total
    const combined = [
      ...customTopics,
      ...seedList.filter((t) => !customTopics.includes(t)),
    ].slice(0, 30);

    // Determine locale for the topics
    const locale = config.primaryLanguage;

    const topicData = combined.map((topicTitle) => ({
      site_id: config.siteId,
      title: topicTitle,
      locale,
      primary_keyword: topicTitle,
      longtails: [] as string[],
      featured_longtails: [] as string[],
      questions: [] as string[],
      authority_links_json: [] as unknown[],
      intent: 'info',
      suggested_page_type: 'guide',
      source_weights_json: {} as Record<string, unknown>,
      status: 'ready',
      confidence_score: 0.7,
      evergreen: true,
    }));

    const result = await prisma.topicProposal.createMany({ data: topicData });
    topicsCreated = result.count;

    steps[steps.length - 1] = {
      step: 'seed_topics',
      status: 'done',
      message: `${topicsCreated} topics seeded and ready for content generation`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordStep(
      'seed_topics',
      'error',
      'Topic seeding failed — site was created but has no starter topics',
      msg,
    );
    // Non-fatal — continue to next step
  }

  // -------------------------------------------------------------------------
  // Step 4 — Seed default AI ModelRoute records
  // -------------------------------------------------------------------------
  recordStep('seed_routes', 'running', 'Configuring default AI provider routes…');

  try {
    await seedDefaultRoutes();
    steps[steps.length - 1] = {
      step: 'seed_routes',
      status: 'done',
      message: 'AI provider routes configured (Grok as default for all tasks)',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordStep(
      'seed_routes',
      'error',
      'AI route seeding failed — site will use env-var fallback until fixed',
      msg,
    );
    // Non-fatal — content pipeline will still work via env-var priority
  }

  // -------------------------------------------------------------------------
  // Result
  // -------------------------------------------------------------------------
  const hasErrors = errors.length > 0;

  const nextSteps: string[] = [];

  if (topicsCreated > 0) {
    nextSteps.push(
      `Trigger "Generate Content" from the Content Hub to start producing articles for ${config.name}`,
    );
  } else {
    nextSteps.push(
      'Run the Weekly Topics cron from the Cron Jobs panel to generate topic ideas automatically',
    );
  }

  nextSteps.push(
    `Add ${config.domain} to your Vercel domain settings and DNS`,
    'Set per-site env vars (GA4_MEASUREMENT_ID, GSC_SITE_URL) in Vercel',
    'Upload site logo to Settings → Brand Assets',
  );

  if (hasErrors) {
    nextSteps.push('Review the errors above and re-run failed steps from the dashboard');
  }

  return {
    success: buildSuccess && !hasErrors,
    siteId: config.siteId,
    steps,
    topicsCreated,
    errors,
    nextSteps,
  };
}
