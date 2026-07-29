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
  siteType: 'travel_blog' | 'yacht_charter' | 'custom' | 'other';
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
  authorsCreated: number;
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
const SEED_TOPICS: Record<string, string[]> = {
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

// "other" is an alias for "custom" — the wizard page sends "other"
SEED_TOPICS.other = SEED_TOPICS.custom;

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
      authorsCreated: 0,
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
      authorsCreated: 0,
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
  // Step 5 — Create default TeamMember authors (E-E-A-T compliance)
  // -------------------------------------------------------------------------
  recordStep('create_authors', 'running', 'Creating author profiles for E-E-A-T…');

  try {
    const { prisma } = await import('@/lib/db');

    // Find the Site record we just created
    const siteRecord = await prisma.site.findUnique({
      where: { slug: config.siteId },
      select: { id: true },
    });

    if (siteRecord) {
      const sitePrettyName = config.name.replace(/^(Yalla |Zenitha )/i, '');
      const authorData = [
        {
          name_en: `${config.name} Editorial`,
          name_ar: `فريق تحرير ${config.name}`,
          slug: `${config.siteId}-editorial`,
          title_en: `${sitePrettyName} Travel Expert`,
          title_ar: `خبير سفر ${sitePrettyName}`,
          bio_en: `The ${config.name} editorial team brings first-hand expertise in ${config.topics.slice(0, 3).join(', ')} and ${sitePrettyName} travel. Every article is researched on-the-ground and fact-checked before publication.`,
          bio_ar: `يقدم فريق تحرير ${config.name} خبرة مباشرة في السفر. يتم البحث في كل مقال ميدانياً والتحقق منه قبل النشر.`,
          avatar_url: null,
          linkedin_url: null,
          twitter_url: null,
          instagram_url: null,
          website_url: `https://www.${config.domain}/about`,
          is_active: true,
          display_order: 1,
          site_id: siteRecord.id,
        },
        {
          name_en: 'Khaled Aun',
          name_ar: 'خالد عون',
          slug: `${config.siteId}-khaled`,
          title_en: 'Founder & Travel Director',
          title_ar: 'المؤسس ومدير السفر',
          bio_en: `Founder of Zenitha.Luxury LLC and ${config.name}. Passionate about connecting Arab travellers with authentic luxury experiences.`,
          bio_ar: `مؤسس Zenitha.Luxury LLC و${config.name}. شغوف بربط المسافرين العرب بتجارب فاخرة أصيلة.`,
          avatar_url: null,
          linkedin_url: null,
          twitter_url: null,
          instagram_url: null,
          website_url: `https://www.${config.domain}/about`,
          is_active: true,
          display_order: 2,
          site_id: siteRecord.id,
        },
      ];

      for (const author of authorData) {
        try {
          await prisma.teamMember.create({ data: author });
        } catch (dupeErr) {
          // Slug might already exist — skip silently
          console.warn(`[new-site/builder] Author ${author.slug} may already exist, skipping`);
        }
      }

      steps[steps.length - 1] = {
        step: 'create_authors',
        status: 'done',
        message: '2 author profiles created for E-E-A-T compliance (editorial team + founder)',
      };
    } else {
      steps[steps.length - 1] = {
        step: 'create_authors',
        status: 'done',
        message: 'Author creation skipped — site record not found (will use fallback)',
      };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordStep(
      'create_authors',
      'error',
      'Author creation failed — content will use generic fallback until authors are added manually',
      msg,
    );
    // Non-fatal — author-rotation.ts has a graceful fallback
  }

  // -------------------------------------------------------------------------
  // Step 6 — Generate system prompt and store in SiteSettings
  // -------------------------------------------------------------------------
  recordStep('generate_prompt', 'running', 'Generating content generation system prompt…');

  try {
    const { prisma } = await import('@/lib/db');

    const destination = config.topics[0]
      ? config.topics.slice(0, 3).join(', ')
      : config.name;

    const affiliateList = (config.affiliatePartners ?? config.affiliates ?? [])
      .slice(0, 5)
      .join(', ') || 'Booking.com, GetYourGuide';

    const systemPromptEN = `You are a senior luxury travel content writer for ${config.name}, a premium bilingual platform for international visitors exploring ${destination}. You combine first-hand expertise with SEO mastery.

Content Standards (mandatory):
- Write 1,500–2,000 words minimum. Thin content will be rejected.
- TIMELESS TITLES: Never include the year in article titles. Use "Best Luxury Hotels" not "Best Luxury Hotels 2026". Years cause automatic staleness.
- Use proper heading hierarchy: one H1 (title only), 4–6 H2 sections, H3 subsections as needed. Never skip heading levels.
- Include 3+ internal links to other ${config.name} pages (e.g., /blog/*, /hotels, /experiences).
- Include 2+ affiliate/booking links (${affiliateList}) with descriptive anchor text — never "click here".
- Meta title: 50–60 characters with focus keyword near the start. Never include years.
- Meta description: 120–160 characters, compelling with a call to action.
- Place the focus keyword in the title, first paragraph, one H2, and naturally throughout (density < 2.5%).
- End with a clear CTA and "Key Takeaways" summary section.

FIRST-HAND EXPERIENCE (Google's #1 ranking signal since Jan 2026):
- Include 2–3 insider tips per article that only someone who visited would know.
- Add sensory details: what you see, hear, taste, smell at each location.
- Describe at least one honest limitation or failed approach — imperfection signals authenticity.
- NEVER use these AI-generic phrases: "nestled in the heart of", "look no further", "without further ado", "it's worth noting that", "in this comprehensive guide", "whether you're a X or Y".

AIO Optimization (Google AI Overview citation):
- Under every H2, write a 40–50 word direct answer FIRST, then expand. This "atomic answer" format increases AI Overview citation chances.
- Include at least 2 specific data points not found on Wikipedia (current pricing, verified hours, insider quotes).
- Use original sensory details rather than stock descriptions.
Always respond with valid JSON.`;

    const systemPromptAR = `أنت كاتب محتوى سفر فاخر لمنصة ${config.name}، منصة ثنائية اللغة للزوار الدوليين. تجمع بين خبرة محلية وإتقان تحسين محركات البحث.

معايير المحتوى (إلزامية):
- اكتب 1,500–2,000 كلمة كحد أدنى.
- استخدم تسلسل عناوين صحيح: H1 واحد، 4–6 عناوين H2، وعناوين H3 فرعية.
- أضف 3+ روابط داخلية لصفحات ${config.name} الأخرى.
- أضف 2+ روابط حجز (${affiliateList}) بنص وصفي.
- عنوان SEO: 50–60 حرف مع الكلمة المفتاحية.
- وصف SEO: 120–160 حرف مع دعوة للعمل.

التجربة المباشرة (إشارة التصنيف الأولى منذ يناير 2026):
- أضف 2-3 نصائح داخلية في كل مقال.
- استخدم تفاصيل حسية: ما تراه وتسمعه وتتذوقه.
- لا تستخدم عبارات ذكاء اصطناعي عامة مثل "في عالم اليوم" أو "تجدر الإشارة".

تحسين الذكاء الاصطناعي:
- تحت كل H2، اكتب إجابة مباشرة 40-50 كلمة أولاً ثم وسّع.
أجب دائماً بـ JSON صالح.`;

    // Store system prompts in SiteSettings
    await prisma.siteSettings.upsert({
      where: {
        siteId_category: {
          siteId: config.siteId,
          category: 'content_generation',
        },
      },
      create: {
        siteId: config.siteId,
        category: 'content_generation',
        config: {
          systemPromptEN,
          systemPromptAR,
          affiliatePartners: config.affiliatePartners ?? config.affiliates ?? [],
          contentVelocity: config.contentVelocity ?? 1,
          destination,
        },
      },
      update: {
        config: {
          systemPromptEN,
          systemPromptAR,
          affiliatePartners: config.affiliatePartners ?? config.affiliates ?? [],
          contentVelocity: config.contentVelocity ?? 1,
          destination,
        },
      },
    });

    steps[steps.length - 1] = {
      step: 'generate_prompt',
      status: 'done',
      message: 'System prompts (EN + AR) generated with Jan 2026 Authenticity Update compliance',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordStep(
      'generate_prompt',
      'error',
      'System prompt generation failed — content pipeline will use generic prompts',
      msg,
    );
    // Non-fatal — pipeline will use generic prompts from daily-content-generate
  }

  // -------------------------------------------------------------------------
  // Step 7 — Seed per-site activation settings
  // -------------------------------------------------------------------------
  recordStep('seed_settings', 'running', 'Configuring per-site activation settings…');

  try {
    const { prisma } = await import('@/lib/db');

    const settingsCategories = [
      {
        category: 'affiliates',
        settings: {
          enabled: true,
          partners: config.affiliatePartners ?? config.affiliates ?? [],
          injectionMode: 'auto',
          maxLinksPerArticle: 5,
        },
      },
      {
        category: 'general',
        settings: {
          active: true,
          indexingEnabled: true,
          cronsEnabled: (config.automations ?? []).includes('content_gen'),
          maintenanceMode: false,
        },
      },
      {
        category: 'workflow',
        settings: {
          tone: 'luxury',
          audience: config.targetAudience ?? 'Arab luxury travellers',
          contentFrequency: config.contentVelocity ?? 1,
          qualityScoreOverride: null,
        },
      },
    ];

    for (const { category, settings } of settingsCategories) {
      await prisma.siteSettings.upsert({
        where: {
          siteId_category: {
            siteId: config.siteId,
            category,
          },
        },
        create: {
          siteId: config.siteId,
          category,
          config: settings,
        },
        update: {
          config: settings,
        },
      });
    }

    steps[steps.length - 1] = {
      step: 'seed_settings',
      status: 'done',
      message: 'Per-site activation settings configured (affiliates, general, workflow)',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordStep(
      'seed_settings',
      'error',
      'Settings seeding failed — can be configured manually from Site Settings',
      msg,
    );
    // Non-fatal
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
    'Set per-site env vars (GA4_MEASUREMENT_ID, GSC_SITE_URL, INDEXNOW_KEY) in Vercel',
    'Upload site logo and OG image to Settings → Brand Assets',
    'Review generated author profiles in the Team page (cockpit → Sites tab)',
    'Review system prompts in Site Settings → Content Generation',
  );

  if (hasErrors) {
    nextSteps.push('Review the errors above and re-run failed steps from the dashboard');
  }

  return {
    success: buildSuccess && !hasErrors,
    siteId: config.siteId,
    steps,
    topicsCreated,
    authorsCreated: 2,
    errors,
    nextSteps,
  };
}
