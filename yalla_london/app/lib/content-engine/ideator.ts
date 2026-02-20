/**
 * Content Engine — Agent 2: Ideator
 *
 * Takes a topic from the Researcher (Agent 1) and explodes it into 5-10
 * distinct content angles optimized for different platforms. Each angle
 * includes cross-platform format mapping, emotional triggers, effort
 * estimates, and a 7-day content calendar.
 *
 * Pipeline position: Researcher -> **Ideator** -> Writer -> Distributor
 */

import { prisma } from '@/lib/db';
import { generateJSON, isAIAvailable } from '@/lib/ai/provider';
import { getSiteConfig, getDefaultSiteId } from '@/config/sites';
import type { SiteConfig } from '@/config/sites';

const LOG_TAG = '[content-engine:ideator]';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IdeatorInput {
  topic: string;
  researchData: any; // ResearchOutput from Agent 1
  site: string;
  existingTitles?: string[]; // Recent content titles to avoid repeating
}

export type AngleType =
  | 'contrarian'
  | 'listicle'
  | 'story'
  | 'how-to'
  | 'comparison'
  | 'behind-the-scenes'
  | 'data-driven'
  | 'emotional'
  | 'controversial-opinion'
  | 'trend-reaction';

export type EmotionalTrigger =
  | 'curiosity'
  | 'FOMO'
  | 'aspiration'
  | 'nostalgia'
  | 'urgency'
  | 'humor'
  | 'controversy';

export type EffortLevel = 'quick' | 'medium' | 'deep';

export interface ContentFormat {
  platform: string;
  format: string; // reel, carousel, thread, article, email, etc.
  duration?: number;
  slideCount?: number;
  wordCount?: number;
}

export interface ContentAngle {
  id: string;
  title: string;
  hook: string;
  angleType: AngleType;
  emotionalTrigger: EmotionalTrigger;
  targetPlatforms: string[];
  contentFormats: ContentFormat[];
  rationale: string;
  effort: EffortLevel;
  priority: number; // 1-10
  suggestedAssets: string[];
}

export interface CalendarPost {
  angleId: string;
  platform: string;
  format: string;
  suggestedTime: string;
  caption: string;
}

export interface CalendarDay {
  day: number;
  posts: CalendarPost[];
}

export interface PillarContent {
  angleId: string;
  type: 'blog' | 'video' | 'pdf';
  derivativeCount: number;
}

export interface IdeatorOutput {
  angles: ContentAngle[];
  contentCalendar: CalendarDay[];
  pillarContent: PillarContent[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_ANGLE_TYPES: AngleType[] = [
  'contrarian',
  'listicle',
  'story',
  'how-to',
  'comparison',
  'behind-the-scenes',
  'data-driven',
  'emotional',
  'controversial-opinion',
  'trend-reaction',
];

const VALID_TRIGGERS: EmotionalTrigger[] = [
  'curiosity',
  'FOMO',
  'aspiration',
  'nostalgia',
  'urgency',
  'humor',
  'controversy',
];

const VALID_EFFORTS: EffortLevel[] = ['quick', 'medium', 'deep'];

// ---------------------------------------------------------------------------
// Existing title fetch
// ---------------------------------------------------------------------------

/**
 * Fetch recent titles from BlogPost and ScheduledContent to avoid repeats.
 * Returns up to 100 titles from the last 60 days, scoped to the site.
 */
async function fetchExistingTitles(siteId: string): Promise<string[]> {
  const since = new Date();
  since.setDate(since.getDate() - 60);

  try {
    const [blogTitles, scheduledTitles] = await Promise.all([
      prisma.blogPost.findMany({
        where: {
          siteId,
          created_at: { gte: since },
          deletedAt: null,
        },
        select: { title_en: true },
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
      prisma.scheduledContent.findMany({
        where: {
          site_id: siteId,
          created_at: { gte: since },
          status: { not: 'cancelled' },
        },
        select: { title: true },
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
    ]);

    return [
      ...blogTitles.map((b) => b.title_en),
      ...scheduledTitles.map((s) => s.title),
    ];
  } catch (error) {
    console.warn(
      `${LOG_TAG} Failed to fetch existing titles for site ${siteId}:`,
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

function buildSystemPrompt(
  siteConfig: SiteConfig,
  topic: string,
  researchData: any,
  existingTitles: string[]
): string {
  const audienceProfile = siteConfig.locale === 'ar'
    ? 'Arabic-speaking luxury travellers, primarily from GCC countries, who value halal-friendly options, cultural sensitivity, and premium experiences.'
    : `English-speaking travellers interested in luxury experiences in ${siteConfig.destination}, including Arab diaspora, affluent millennials, and experience-seeking couples.`;

  const brandVoice =
    `${siteConfig.name} brand voice: authoritative yet approachable, culturally aware, ` +
    `first-hand experience emphasis (Google Jan 2026 Authenticity Update), sensory details over generic descriptions. ` +
    `Primary colors: ${siteConfig.primaryColor} / ${siteConfig.secondaryColor}. ` +
    `Destination: ${siteConfig.destination}, ${siteConfig.country}.`;

  const researchContext = researchData
    ? `\n\nRESEARCH CONTEXT (from Agent 1):\n${JSON.stringify(researchData, null, 2).slice(0, 3000)}`
    : '';

  const existingTitlesList =
    existingTitles.length > 0
      ? `\n\nEXISTING TITLES (DO NOT repeat or closely paraphrase these):\n${existingTitles.slice(0, 40).map((t) => `- ${t}`).join('\n')}`
      : '';

  return `You are a creative content director for ${siteConfig.name}, a luxury travel content brand focused on ${siteConfig.destination}.

AUDIENCE PROFILE:
${audienceProfile}

BRAND VOICE:
${brandVoice}

TOPIC TO IDEATE ON:
"${topic}"
${researchContext}
${existingTitlesList}

FEED-FORWARD PATTERNS (best-performing angle types for travel content):
- "behind-the-scenes" and "story" angles consistently outperform generic listicles
- "contrarian" angles generate highest engagement on social platforms
- "data-driven" and "comparison" angles earn the most backlinks
- Avoid: generic "Top 10" listicles without a unique hook; clickbait that doesn't deliver
- Ensure variety: no two angles should share the same angleType

YOUR TASK:
Generate EXACTLY 7 distinct content angles for this topic. Each angle must:
1. Have a unique angleType (from: contrarian, listicle, story, how-to, comparison, behind-the-scenes, data-driven, emotional, controversial-opinion, trend-reaction)
2. Include an emotionalTrigger (from: curiosity, FOMO, aspiration, nostalgia, urgency, humor, controversy)
3. Map to 2-4 target platforms (from: blog, instagram, tiktok, youtube, twitter, email, pinterest, linkedin)
4. Include specific contentFormats for each platform with realistic estimates (duration in seconds for video, slideCount for carousels, wordCount for written)
5. Include a "hook" — the opening line or scroll-stopping statement
6. Rate effort as "quick" (< 2 hours), "medium" (2-6 hours), or "deep" (6+ hours)
7. Rate priority 1-10 based on expected traffic + revenue impact for a luxury travel site
8. Suggest 2-4 assets needed (e.g., "hero photo of hotel lobby", "comparison infographic", "short interview clip")

Also generate:
- A 7-day content calendar distributing these angles across days and platforms. Each day should have 1-3 posts. Include a suggested posting time (HH:MM UTC) and a short caption for each.
- Identify 1-2 "pillar content" pieces (long-form blog, video, or PDF) and how many derivative pieces each spawns.

RESPOND WITH VALID JSON ONLY matching this exact structure:
{
  "angles": [
    {
      "title": "string",
      "hook": "string",
      "angleType": "string",
      "emotionalTrigger": "string",
      "targetPlatforms": ["string"],
      "contentFormats": [
        {
          "platform": "string",
          "format": "string",
          "duration": number_or_null,
          "slideCount": number_or_null,
          "wordCount": number_or_null
        }
      ],
      "rationale": "string",
      "effort": "quick|medium|deep",
      "priority": number,
      "suggestedAssets": ["string"]
    }
  ],
  "contentCalendar": [
    {
      "day": number,
      "posts": [
        {
          "angleIndex": number,
          "platform": "string",
          "format": "string",
          "suggestedTime": "HH:MM",
          "caption": "string"
        }
      ]
    }
  ],
  "pillarContent": [
    {
      "angleIndex": number,
      "type": "blog|video|pdf",
      "derivativeCount": number
    }
  ]
}

NOTE: Use "angleIndex" (0-based index into the angles array) instead of "angleId" in contentCalendar and pillarContent — IDs will be assigned after parsing.`;
}

// ---------------------------------------------------------------------------
// AI response validation & normalization
// ---------------------------------------------------------------------------

function validateAndNormalize(raw: any): IdeatorOutput {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`${LOG_TAG} AI returned non-object response`);
  }

  const angles: ContentAngle[] = [];
  const rawAngles = Array.isArray(raw.angles) ? raw.angles : [];

  if (rawAngles.length === 0) {
    throw new Error(`${LOG_TAG} AI returned zero angles`);
  }

  for (const a of rawAngles) {
    const id = crypto.randomUUID();
    const angleType = VALID_ANGLE_TYPES.includes(a.angleType)
      ? a.angleType
      : 'story';
    const emotionalTrigger = VALID_TRIGGERS.includes(a.emotionalTrigger)
      ? a.emotionalTrigger
      : 'curiosity';
    const effort = VALID_EFFORTS.includes(a.effort) ? a.effort : 'medium';

    const contentFormats: ContentFormat[] = Array.isArray(a.contentFormats)
      ? a.contentFormats.map((cf: any) => ({
          platform: String(cf.platform || 'blog'),
          format: String(cf.format || 'article'),
          ...(cf.duration != null ? { duration: Number(cf.duration) } : {}),
          ...(cf.slideCount != null ? { slideCount: Number(cf.slideCount) } : {}),
          ...(cf.wordCount != null ? { wordCount: Number(cf.wordCount) } : {}),
        }))
      : [];

    angles.push({
      id,
      title: String(a.title || 'Untitled Angle'),
      hook: String(a.hook || ''),
      angleType,
      emotionalTrigger,
      targetPlatforms: Array.isArray(a.targetPlatforms)
        ? a.targetPlatforms.map(String)
        : ['blog'],
      contentFormats,
      rationale: String(a.rationale || ''),
      effort,
      priority: Math.min(10, Math.max(1, Number(a.priority) || 5)),
      suggestedAssets: Array.isArray(a.suggestedAssets)
        ? a.suggestedAssets.map(String)
        : [],
    });
  }

  // Map angleIndex references to actual generated IDs
  const contentCalendar: CalendarDay[] = [];
  const rawCalendar = Array.isArray(raw.contentCalendar) ? raw.contentCalendar : [];

  for (const day of rawCalendar) {
    const dayNum = Number(day.day) || 1;
    const posts: CalendarPost[] = [];

    const rawPosts = Array.isArray(day.posts) ? day.posts : [];
    for (const p of rawPosts) {
      const idx = Number(p.angleIndex ?? p.angleId ?? 0);
      const resolvedAngle = angles[idx] || angles[0];

      posts.push({
        angleId: resolvedAngle?.id || angles[0]?.id || '',
        platform: String(p.platform || 'blog'),
        format: String(p.format || 'article'),
        suggestedTime: String(p.suggestedTime || '09:00'),
        caption: String(p.caption || ''),
      });
    }

    contentCalendar.push({ day: dayNum, posts });
  }

  // Pillar content
  const pillarContent: PillarContent[] = [];
  const rawPillar = Array.isArray(raw.pillarContent) ? raw.pillarContent : [];

  for (const pc of rawPillar) {
    const idx = Number(pc.angleIndex ?? pc.angleId ?? 0);
    const resolvedAngle = angles[idx] || angles[0];
    const pcType = ['blog', 'video', 'pdf'].includes(pc.type) ? pc.type : 'blog';

    pillarContent.push({
      angleId: resolvedAngle?.id || angles[0]?.id || '',
      type: pcType as 'blog' | 'video' | 'pdf',
      derivativeCount: Math.max(0, Number(pc.derivativeCount) || 3),
    });
  }

  return { angles, contentCalendar, pillarContent };
}

// ---------------------------------------------------------------------------
// Mock fallback
// ---------------------------------------------------------------------------

function generateMockOutput(
  topic: string,
  siteConfig: SiteConfig
): IdeatorOutput {
  const dest = siteConfig.destination;

  const mockAngles: ContentAngle[] = [
    {
      id: crypto.randomUUID(),
      title: `The Insider's Guide to ${topic} in ${dest}`,
      hook: `Most guides get ${topic} in ${dest} completely wrong. Here's what locals actually recommend.`,
      angleType: 'behind-the-scenes',
      emotionalTrigger: 'curiosity',
      targetPlatforms: ['blog', 'instagram', 'pinterest'],
      contentFormats: [
        { platform: 'blog', format: 'article', wordCount: 1800 },
        { platform: 'instagram', format: 'carousel', slideCount: 10 },
        { platform: 'pinterest', format: 'pin', wordCount: 150 },
      ],
      rationale: `Behind-the-scenes content builds trust and E-E-A-T signals. Positions ${siteConfig.name} as a genuine authority on ${dest}.`,
      effort: 'deep',
      priority: 9,
      suggestedAssets: [
        `Hero photo: authentic ${dest} scene`,
        'Carousel graphics with insider tips',
        'Pinterest-optimized vertical image',
      ],
    },
    {
      id: crypto.randomUUID(),
      title: `${topic}: What Nobody Tells You Before Visiting ${dest}`,
      hook: `I spent 3 weeks researching ${topic} in ${dest} and the truth surprised me.`,
      angleType: 'contrarian',
      emotionalTrigger: 'FOMO',
      targetPlatforms: ['blog', 'twitter', 'tiktok'],
      contentFormats: [
        { platform: 'blog', format: 'article', wordCount: 1500 },
        { platform: 'twitter', format: 'thread', wordCount: 800 },
        { platform: 'tiktok', format: 'reel', duration: 60 },
      ],
      rationale: 'Contrarian angles drive social sharing and debate. High engagement on Twitter and TikTok.',
      effort: 'medium',
      priority: 8,
      suggestedAssets: [
        'Short-form video with text overlay',
        'Quote graphic for Twitter',
        `Comparison image: expectation vs reality in ${dest}`,
      ],
    },
    {
      id: crypto.randomUUID(),
      title: `How to Experience ${topic} in ${dest} Like a VIP`,
      hook: `Skip the tourist traps. Here's the VIP playbook for ${topic} in ${dest}.`,
      angleType: 'how-to',
      emotionalTrigger: 'aspiration',
      targetPlatforms: ['blog', 'youtube', 'email'],
      contentFormats: [
        { platform: 'blog', format: 'article', wordCount: 2000 },
        { platform: 'youtube', format: 'video', duration: 480 },
        { platform: 'email', format: 'newsletter', wordCount: 600 },
      ],
      rationale: `How-to content ranks well for transactional search intent. Strong affiliate link opportunity for ${dest} bookings.`,
      effort: 'deep',
      priority: 9,
      suggestedAssets: [
        `Step-by-step infographic`,
        `B-roll footage of luxury ${dest} venues`,
        'Booking screenshot comparisons',
      ],
    },
    {
      id: crypto.randomUUID(),
      title: `${dest} ${topic} Compared: Budget vs Luxury vs Ultra-Luxury`,
      hook: `We tried all three tiers of ${topic} in ${dest}. The price differences will shock you.`,
      angleType: 'comparison',
      emotionalTrigger: 'curiosity',
      targetPlatforms: ['blog', 'youtube', 'instagram'],
      contentFormats: [
        { platform: 'blog', format: 'article', wordCount: 2200 },
        { platform: 'youtube', format: 'video', duration: 600 },
        { platform: 'instagram', format: 'reel', duration: 90 },
      ],
      rationale: 'Comparison content captures high-intent search traffic and drives affiliate conversions across price tiers.',
      effort: 'deep',
      priority: 10,
      suggestedAssets: [
        'Side-by-side comparison graphic',
        'Price breakdown table',
        `Photos from each tier in ${dest}`,
      ],
    },
    {
      id: crypto.randomUUID(),
      title: `7 Things I Wish I Knew About ${topic} in ${dest}`,
      hook: `After 5 trips to ${dest}, these are the lessons I learned the hard way about ${topic}.`,
      angleType: 'listicle',
      emotionalTrigger: 'nostalgia',
      targetPlatforms: ['blog', 'instagram', 'pinterest'],
      contentFormats: [
        { platform: 'blog', format: 'article', wordCount: 1400 },
        { platform: 'instagram', format: 'carousel', slideCount: 8 },
        { platform: 'pinterest', format: 'pin', wordCount: 150 },
      ],
      rationale: 'Listicles with personal experience markers satisfy the Jan 2026 Authenticity Update while being highly shareable.',
      effort: 'medium',
      priority: 7,
      suggestedAssets: [
        'Numbered tip graphics',
        `Personal photo from ${dest}`,
        'Pinterest-optimized list graphic',
      ],
    },
    {
      id: crypto.randomUUID(),
      title: `The Emotional Side of ${topic} in ${dest}`,
      hook: `There's a moment during ${topic} in ${dest} that changes how you see travel forever.`,
      angleType: 'emotional',
      emotionalTrigger: 'aspiration',
      targetPlatforms: ['blog', 'tiktok', 'email'],
      contentFormats: [
        { platform: 'blog', format: 'article', wordCount: 1200 },
        { platform: 'tiktok', format: 'reel', duration: 45 },
        { platform: 'email', format: 'newsletter', wordCount: 500 },
      ],
      rationale: 'Emotional storytelling builds brand loyalty and newsletter subscriptions. Strong for organic social reach.',
      effort: 'medium',
      priority: 6,
      suggestedAssets: [
        `Atmospheric photo of ${dest}`,
        'Short personal-style video clip',
        'Pull-quote graphic',
      ],
    },
    {
      id: crypto.randomUUID(),
      title: `${topic} in ${dest}: The 2026 Trend Report`,
      hook: `The way people experience ${topic} in ${dest} is shifting fast. Here's the data.`,
      angleType: 'trend-reaction',
      emotionalTrigger: 'urgency',
      targetPlatforms: ['blog', 'linkedin', 'twitter'],
      contentFormats: [
        { platform: 'blog', format: 'article', wordCount: 1600 },
        { platform: 'linkedin', format: 'article', wordCount: 800 },
        { platform: 'twitter', format: 'thread', wordCount: 600 },
      ],
      rationale: 'Trend content earns backlinks from industry publications and positions the brand as a thought leader.',
      effort: 'medium',
      priority: 7,
      suggestedAssets: [
        'Data visualization chart',
        'Trend comparison infographic',
        'Industry stats summary graphic',
      ],
    },
  ];

  // 7-day content calendar spreading angles across the week
  const contentCalendar: CalendarDay[] = [
    {
      day: 1,
      posts: [
        { angleId: mockAngles[0].id, platform: 'blog', format: 'article', suggestedTime: '08:00', caption: `New deep-dive: The insider's guide to ${topic} in ${dest}. Link in bio.` },
        { angleId: mockAngles[0].id, platform: 'instagram', format: 'carousel', suggestedTime: '12:00', caption: `Swipe through our insider tips for ${topic} in ${dest} -->` },
      ],
    },
    {
      day: 2,
      posts: [
        { angleId: mockAngles[1].id, platform: 'twitter', format: 'thread', suggestedTime: '10:00', caption: `Thread: What nobody tells you about ${topic} in ${dest}...` },
        { angleId: mockAngles[1].id, platform: 'tiktok', format: 'reel', suggestedTime: '18:00', caption: `The truth about ${topic} in ${dest} that travel blogs won't share` },
      ],
    },
    {
      day: 3,
      posts: [
        { angleId: mockAngles[2].id, platform: 'blog', format: 'article', suggestedTime: '08:00', caption: `How to experience ${topic} in ${dest} like a VIP — full guide out now.` },
        { angleId: mockAngles[2].id, platform: 'email', format: 'newsletter', suggestedTime: '07:00', caption: `This week: the VIP playbook for ${topic} in ${dest}` },
      ],
    },
    {
      day: 4,
      posts: [
        { angleId: mockAngles[3].id, platform: 'instagram', format: 'reel', suggestedTime: '12:00', caption: `Budget vs Luxury vs Ultra-Luxury: ${topic} in ${dest}. Which tier wins?` },
        { angleId: mockAngles[3].id, platform: 'youtube', format: 'video', suggestedTime: '14:00', caption: `We tried all three tiers of ${topic} in ${dest}. Full comparison.` },
      ],
    },
    {
      day: 5,
      posts: [
        { angleId: mockAngles[4].id, platform: 'blog', format: 'article', suggestedTime: '08:00', caption: `7 things I wish I knew about ${topic} in ${dest} before my first trip.` },
        { angleId: mockAngles[4].id, platform: 'pinterest', format: 'pin', suggestedTime: '15:00', caption: `Save this: 7 insider tips for ${topic} in ${dest}` },
      ],
    },
    {
      day: 6,
      posts: [
        { angleId: mockAngles[5].id, platform: 'tiktok', format: 'reel', suggestedTime: '18:00', caption: `This moment during ${topic} in ${dest} changed everything...` },
        { angleId: mockAngles[5].id, platform: 'blog', format: 'article', suggestedTime: '08:00', caption: `The emotional side of ${topic} in ${dest} — a personal reflection.` },
      ],
    },
    {
      day: 7,
      posts: [
        { angleId: mockAngles[6].id, platform: 'linkedin', format: 'article', suggestedTime: '09:00', caption: `2026 trend report: how ${topic} in ${dest} is evolving fast.` },
        { angleId: mockAngles[6].id, platform: 'twitter', format: 'thread', suggestedTime: '11:00', caption: `The data on ${topic} in ${dest} tells a surprising story. Thread:` },
      ],
    },
  ];

  // Pillar content: the comparison piece and the insider guide
  const pillarContent: PillarContent[] = [
    { angleId: mockAngles[3].id, type: 'blog', derivativeCount: 5 },
    { angleId: mockAngles[2].id, type: 'video', derivativeCount: 4 },
  ];

  return { angles: mockAngles, contentCalendar, pillarContent };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function runIdeator(input: IdeatorInput): Promise<IdeatorOutput> {
  const { topic, researchData, site, existingTitles: providedTitles } = input;

  // 1. Load site config
  const siteId = site || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  if (!siteConfig) {
    throw new Error(`${LOG_TAG} Unknown site: "${siteId}". Check config/sites.ts.`);
  }

  console.log(`${LOG_TAG} Starting ideation for topic="${topic}" site=${siteId}`);

  // 2. Fetch existing titles from DB (merge with any provided titles)
  let existingTitles: string[];
  try {
    const dbTitles = await fetchExistingTitles(siteId);
    existingTitles = [
      ...new Set([...(providedTitles || []), ...dbTitles]),
    ];
  } catch (error) {
    console.warn(
      `${LOG_TAG} Failed to merge existing titles, using provided only:`,
      error instanceof Error ? error.message : error
    );
    existingTitles = providedTitles || [];
  }

  console.log(
    `${LOG_TAG} Found ${existingTitles.length} existing titles to avoid`
  );

  // 3. Check AI availability — fall back to mock if unavailable
  const aiReady = await isAIAvailable();
  if (!aiReady) {
    console.warn(
      `${LOG_TAG} No AI provider available. Returning mock ideation output.`
    );
    return generateMockOutput(topic, siteConfig);
  }

  // 4. Build prompt and call AI
  const systemPrompt = buildSystemPrompt(
    siteConfig,
    topic,
    researchData,
    existingTitles
  );

  try {
    const rawResponse = await generateJSON<any>(
      `Generate 7 creative content angles for the topic: "${topic}"`,
      {
        systemPrompt,
        temperature: 0.85, // Higher creativity for ideation
        maxTokens: 4096,
      }
    );

    // 5. Validate and normalize the AI response
    const output = validateAndNormalize(rawResponse);

    console.log(
      `${LOG_TAG} Ideation complete: ${output.angles.length} angles, ` +
        `${output.contentCalendar.length} calendar days, ` +
        `${output.pillarContent.length} pillar pieces`
    );

    return output;
  } catch (error) {
    console.error(
      `${LOG_TAG} AI ideation failed, falling back to mock:`,
      error instanceof Error ? error.message : error
    );
    return generateMockOutput(topic, siteConfig);
  }
}
