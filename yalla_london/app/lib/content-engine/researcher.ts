/**
 * Content Engine — Agent 1: Researcher
 *
 * Discovers trending topics, analyzes audience, mines keywords, and audits competitors.
 * This is the first stage of the 4-agent AI Content Engine pipeline.
 *
 * Data flow:
 *   [Feed-forward from Analyst] --> Researcher --> ContentPipeline.researchData --> Ideator
 *
 * Inputs:
 *   - Site config (destination, audience, keywords, affiliate categories)
 *   - Recent published BlogPosts (top performing by views)
 *   - Recent TopicProposals (to avoid duplicates)
 *   - Previous ContentPerformance data (if available)
 *   - Feed-forward recommendations from previous Analyst run (if any)
 *
 * Outputs:
 *   - Trending topics with scores, sources, and timeliness windows
 *   - Audience profile (demographics, interests, pain points, content preferences)
 *   - Keywords (primary, long-tail, hashtags per platform)
 *   - Competitor insights (top content, gaps)
 *   - Content gaps and recommended topics
 *
 * Results are persisted to ContentPipeline.researchData (JSON column).
 */

import { prisma } from "@/lib/db";
import { generateJSON, isAIAvailable } from "@/lib/ai/provider";
import { SITES, getSiteConfig } from "@/config/sites";
import type { SiteConfig } from "@/config/sites";

const LOG_PREFIX = "[content-engine:researcher]";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResearchInput {
  /** Site ID (e.g., "yalla-london") */
  site: string;
  /** Optional focus area / niche override */
  niche?: string;
  /** Number of days to look back for internal performance data. Default: 7 */
  lookbackDays?: number;
  /** Recommendations from a previous Analyst run to incorporate */
  feedForward?: Record<string, unknown>;
  /** Existing ContentPipeline ID to update (if resuming). Otherwise a new record is created. */
  pipelineId?: string;
}

export interface TrendingTopic {
  topic: string;
  trendScore: number; // 1-100
  source: "web_trend" | "internal_data" | "competitor" | "seasonal";
  relevance: string;
  timelinessWindow: "next 24h" | "this week" | "this month" | "evergreen";
}

export interface AudienceProfile {
  demographics: string;
  interests: string[];
  painPoints: string[];
  contentPreferences: {
    formats: string[];
    tone: string;
    bestTimes: { platform: string; days: string[]; times: string[] }[];
  };
}

export interface KeywordBundle {
  primary: string[];
  longTail: string[];
  hashtags: Record<string, string[]>;
}

export interface CompetitorInsight {
  name: string;
  topContent: {
    title: string;
    format: string;
    estimatedEngagement: string;
  }[];
  gaps: string[];
}

export interface ResearchOutput {
  trendingTopics: TrendingTopic[];
  audienceProfile: AudienceProfile;
  keywords: KeywordBundle;
  competitorInsights: CompetitorInsight[];
  contentGaps: string[];
  recommendedTopics: string[];
}

// ---------------------------------------------------------------------------
// Internal data helpers
// ---------------------------------------------------------------------------

/**
 * Fetch recently published BlogPosts for this site, ordered by page views (descending).
 * Falls back to ordering by created_at if no PageView data exists.
 */
async function getRecentTopPosts(
  siteId: string,
  lookbackDays: number,
  limit: number = 10
): Promise<{ title: string; slug: string; tags: string[]; views: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);

  try {
    // Try to get posts with view counts from PageView table
    const posts = await prisma.blogPost.findMany({
      where: {
        siteId,
        published: true,
        created_at: { gte: since },
      },
      select: {
        id: true,
        title_en: true,
        slug: true,
        tags: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      take: limit * 2, // fetch extra, will sort by views below
    });

    if (posts.length === 0) return [];

    // Aggregate page views for each post
    const postIds = posts.map((p) => p.id);
    const viewCounts = await prisma.pageView
      .groupBy({
        by: ["content_id"],
        where: {
          site_id: siteId,
          content_id: { in: postIds },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        _count: { id: true },
      })
      .catch(() => [] as { content_id: string; _count: { id: number } }[]);

    const viewMap = new Map<string, number>();
    for (const vc of viewCounts) {
      viewMap.set(vc.content_id ?? "", vc._count.id);
    }

    return posts
      .map((p) => ({
        title: p.title_en,
        slug: p.slug,
        tags: p.tags,
        views: viewMap.get(p.id) ?? 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} Failed to fetch recent top posts for ${siteId}:`,
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

/**
 * Fetch recent TopicProposals for this site so the AI can avoid duplicates.
 */
async function getRecentTopicProposals(
  siteId: string,
  lookbackDays: number,
  limit: number = 30
): Promise<string[]> {
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);

  try {
    const proposals = await prisma.topicProposal.findMany({
      where: {
        site_id: siteId,
        created_at: { gte: since },
      },
      select: { title: true },
      orderBy: { created_at: "desc" },
      take: limit,
    });
    return proposals.map((p) => p.title);
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} Failed to fetch recent topic proposals for ${siteId}:`,
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

/**
 * Fetch previous ContentPerformance summaries so the AI can learn from past results.
 */
async function getRecentPerformance(
  siteId: string,
  lookbackDays: number,
  limit: number = 20
): Promise<
  {
    platform: string;
    contentType: string;
    impressions: number;
    engagements: number;
    clicks: number;
    grade: string | null;
  }[]
> {
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);

  try {
    const perf = await prisma.contentPerformance.findMany({
      where: {
        pipeline: { site: siteId },
        createdAt: { gte: since },
      },
      select: {
        platform: true,
        contentType: true,
        impressions: true,
        engagements: true,
        clicks: true,
        grade: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return perf;
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} Failed to fetch recent performance for ${siteId}:`,
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildResearchPrompt(
  siteConfig: SiteConfig,
  topPosts: { title: string; slug: string; tags: string[]; views: number }[],
  existingTopics: string[],
  performance: {
    platform: string;
    contentType: string;
    impressions: number;
    engagements: number;
    clicks: number;
    grade: string | null;
  }[],
  niche: string | undefined,
  feedForward: Record<string, unknown> | undefined
): string {
  const siteContext = [
    `Site: ${siteConfig.name}`,
    `Destination: ${siteConfig.destination}, ${siteConfig.country}`,
    `Locale: ${siteConfig.locale}`,
    `Primary keywords: ${siteConfig.primaryKeywordsEN.join(", ")}`,
    `Affiliate categories: ${siteConfig.affiliateCategories.join(", ")}`,
    `Content topics configured: ${siteConfig.topicsEN.map((t) => t.keyword).join("; ")}`,
  ].join("\n");

  const topPostsSummary =
    topPosts.length > 0
      ? topPosts
          .map(
            (p, i) =>
              `${i + 1}. "${p.title}" (${p.views} views, tags: ${p.tags.join(", ")})`
          )
          .join("\n")
      : "No recent published posts yet.";

  const existingTopicsList =
    existingTopics.length > 0
      ? existingTopics.map((t) => `- ${t}`).join("\n")
      : "None.";

  const perfSummary =
    performance.length > 0
      ? performance
          .map(
            (p) =>
              `${p.platform}/${p.contentType}: ${p.impressions} impressions, ${p.engagements} engagements, ${p.clicks} clicks (grade: ${p.grade ?? "N/A"})`
          )
          .join("\n")
      : "No performance data yet.";

  const feedForwardBlock = feedForward
    ? `\n\nFEED-FORWARD FROM PREVIOUS ANALYST RUN:\n${JSON.stringify(feedForward, null, 2)}\n\nUse these recommendations to adjust your research focus, double down on what works, and avoid what underperformed.`
    : "";

  const nicheDirective = niche
    ? `\n\nFOCUS NICHE: "${niche}" — prioritize topics within this niche but still discover adjacent opportunities.`
    : "";

  return `You are a content research specialist for ${siteConfig.name}, a luxury travel platform targeting Arab travelers visiting ${siteConfig.destination}.

SITE CONTEXT:
${siteContext}
${nicheDirective}
${feedForwardBlock}

RECENT TOP-PERFORMING POSTS (last 7 days):
${topPostsSummary}

EXISTING TOPIC PROPOSALS (avoid duplicates):
${existingTopicsList}

RECENT CONTENT PERFORMANCE:
${perfSummary}

YOUR TASK:
1. TRENDING TOPICS: Discover exactly 5 trending topics relevant to ${siteConfig.destination} luxury travel for Arab audiences. For each, provide a trend score (1-100), the source type, relevance explanation, and timeliness window. Consider:
   - Current seasonal events and holidays in ${siteConfig.destination}
   - Emerging travel trends (e.g., wellness, culinary tourism, sustainable luxury)
   - Topics that perform well based on internal data above
   - Gaps in existing coverage
   - Competitor content that is gaining traction

2. AUDIENCE PROFILE: Provide a detailed audience profile including:
   - Demographics (who is the target reader)
   - Top 5 interests
   - Top 5 pain points when traveling to ${siteConfig.destination}
   - Content preferences (preferred formats, tone, best posting times by platform)

3. KEYWORDS: Mine keywords including:
   - 5 primary keywords (high volume, directly relevant)
   - 10 long-tail keywords (lower competition, high intent)
   - Hashtags for Twitter/X, Instagram, TikTok, LinkedIn (3-5 per platform)

4. COMPETITOR INSIGHTS: Identify 3 competitor sites/publications covering ${siteConfig.destination} luxury travel. For each:
   - Name the competitor
   - List their 2 best-performing content pieces (title, format, estimated engagement)
   - Identify 2 content gaps they are missing that we can fill

5. CONTENT GAPS: List 5 specific content gaps in the ${siteConfig.destination} luxury travel space for Arab audiences that no one is covering well.

6. RECOMMENDED TOPICS: Based on all the above, recommend 5 specific article topics we should create next. These must NOT duplicate the existing topics listed above.

Respond with valid JSON matching this exact structure:
{
  "trendingTopics": [
    {
      "topic": "string",
      "trendScore": number,
      "source": "web_trend" | "internal_data" | "competitor" | "seasonal",
      "relevance": "string",
      "timelinessWindow": "next 24h" | "this week" | "this month" | "evergreen"
    }
  ],
  "audienceProfile": {
    "demographics": "string",
    "interests": ["string"],
    "painPoints": ["string"],
    "contentPreferences": {
      "formats": ["string"],
      "tone": "string",
      "bestTimes": [{ "platform": "string", "days": ["string"], "times": ["string"] }]
    }
  },
  "keywords": {
    "primary": ["string"],
    "longTail": ["string"],
    "hashtags": { "twitter": ["string"], "instagram": ["string"], "tiktok": ["string"], "linkedin": ["string"] }
  },
  "competitorInsights": [
    {
      "name": "string",
      "topContent": [{ "title": "string", "format": "string", "estimatedEngagement": "string" }],
      "gaps": ["string"]
    }
  ],
  "contentGaps": ["string"],
  "recommendedTopics": ["string"]
}`;
}

// ---------------------------------------------------------------------------
// Fallback (when AI is unavailable)
// ---------------------------------------------------------------------------

function buildFallbackOutput(siteConfig: SiteConfig): ResearchOutput {
  const destination = siteConfig.destination;
  const keywords = siteConfig.primaryKeywordsEN;
  const topics = siteConfig.topicsEN;

  return {
    trendingTopics: [
      {
        topic: `Best luxury hotels in ${destination} for Arab families`,
        trendScore: 85,
        source: "seasonal",
        relevance: `High-season travel planning for ${destination}`,
        timelinessWindow: "this month",
      },
      {
        topic: `Top halal restaurants in ${destination} — insider guide`,
        trendScore: 78,
        source: "web_trend",
        relevance: "Growing demand for halal fine dining content",
        timelinessWindow: "evergreen",
      },
      {
        topic: `${destination} hidden gems: luxury experiences off the tourist trail`,
        trendScore: 72,
        source: "competitor",
        relevance:
          "Competitors focus on mainstream attractions; gap in exclusive experiences",
        timelinessWindow: "evergreen",
      },
      {
        topic: `Weekend itinerary: ${destination} in 48 hours for luxury travelers`,
        trendScore: 68,
        source: "internal_data",
        relevance: "Itinerary content consistently drives engagement",
        timelinessWindow: "this week",
      },
      {
        topic: `${destination} shopping guide: luxury brands and VAT refund tips`,
        trendScore: 65,
        source: "web_trend",
        relevance: "Shopping is a primary activity for Gulf tourists",
        timelinessWindow: "this month",
      },
    ],
    audienceProfile: {
      demographics: `Affluent Arab travelers aged 28-55, primarily from GCC countries (UAE, Saudi Arabia, Kuwait, Qatar), traveling to ${destination} for leisure, shopping, and family holidays. Household income $100K+, frequent international travelers.`,
      interests: [
        "Luxury hotels and resorts",
        "Halal fine dining",
        "Designer shopping and fashion",
        "Cultural experiences and history",
        "Family-friendly activities",
      ],
      painPoints: [
        `Finding reliable halal food options in ${destination}`,
        "Language barriers and Arabic-speaking services",
        "Navigating public transport with families",
        "Understanding local customs and etiquette",
        "Finding prayer rooms and mosques nearby",
      ],
      contentPreferences: {
        formats: [
          "Long-form guides (1500+ words)",
          "Listicles (top 10 / best of)",
          "Video walkthroughs",
          "Photo galleries",
          "Interactive maps",
        ],
        tone: "Authoritative yet warm, luxury-oriented, culturally sensitive",
        bestTimes: [
          {
            platform: "instagram",
            days: ["Tuesday", "Thursday", "Saturday"],
            times: ["10:00 GST", "20:00 GST"],
          },
          {
            platform: "twitter",
            days: ["Monday", "Wednesday", "Friday"],
            times: ["09:00 GST", "18:00 GST"],
          },
          {
            platform: "tiktok",
            days: ["Wednesday", "Friday", "Sunday"],
            times: ["19:00 GST", "21:00 GST"],
          },
          {
            platform: "linkedin",
            days: ["Tuesday", "Thursday"],
            times: ["08:00 GST", "12:00 GST"],
          },
        ],
      },
    },
    keywords: {
      primary: keywords.slice(0, 5).length > 0
        ? keywords.slice(0, 5)
        : [
            `luxury ${destination.toLowerCase()} travel`,
            `halal restaurants ${destination.toLowerCase()}`,
            `best hotels ${destination.toLowerCase()}`,
            `${destination.toLowerCase()} shopping guide`,
            `${destination.toLowerCase()} travel tips`,
          ],
      longTail: topics
        .flatMap((t) => t.longtails)
        .slice(0, 10)
        .concat(
          topics.length === 0
            ? [
                `best halal fine dining ${destination.toLowerCase()}`,
                `luxury family hotels ${destination.toLowerCase()}`,
                `private tours ${destination.toLowerCase()} Arabic speaking`,
                `VIP experiences ${destination.toLowerCase()}`,
                `${destination.toLowerCase()} spa and wellness luxury`,
              ]
            : []
        )
        .slice(0, 10),
      hashtags: {
        twitter: [
          `#${destination.replace(/\s/g, "")}Travel`,
          "#LuxuryTravel",
          "#HalalTravel",
          `#Visit${destination.replace(/\s/g, "")}`,
          "#ArabTravelers",
        ],
        instagram: [
          `#${destination.replace(/\s/g, "")}Luxury`,
          "#TravelGram",
          "#HalalFood",
          `#${destination.replace(/\s/g, "")}Life`,
          "#LuxuryLifestyle",
        ],
        tiktok: [
          `#${destination.replace(/\s/g, "")}`,
          "#LuxuryTravel",
          "#TravelTok",
          "#HiddenGems",
          "#HalalEats",
        ],
        linkedin: [
          "#LuxuryHospitality",
          "#TravelIndustry",
          `#${destination.replace(/\s/g, "")}Tourism`,
          "#HalalTourism",
          "#GCCTravel",
        ],
      },
    },
    competitorInsights: [
      {
        name: `${destination} Luxury Travel Blog (generic)`,
        topContent: [
          {
            title: `Top 10 Hotels in ${destination}`,
            format: "listicle",
            estimatedEngagement: "High (50K+ monthly views)",
          },
          {
            title: `${destination} Restaurant Guide`,
            format: "guide",
            estimatedEngagement: "Medium (20K+ monthly views)",
          },
        ],
        gaps: [
          "No Arabic-language content",
          "No halal-specific restaurant recommendations",
        ],
      },
      {
        name: "HalalBooking Blog",
        topContent: [
          {
            title: "Best Halal-Friendly Hotels Worldwide",
            format: "listicle",
            estimatedEngagement: "High (global audience)",
          },
          {
            title: "Ramadan Travel Guide",
            format: "seasonal guide",
            estimatedEngagement: "Very High (seasonal spike)",
          },
        ],
        gaps: [
          `Limited ${destination}-specific deep dives`,
          "No luxury-tier positioning",
        ],
      },
      {
        name: "Time Out / Local City Guide",
        topContent: [
          {
            title: `Best Things to Do in ${destination} This Weekend`,
            format: "weekly roundup",
            estimatedEngagement: "Very High (local authority)",
          },
          {
            title: `${destination} Restaurant Awards`,
            format: "awards/ranking",
            estimatedEngagement: "High (seasonal)",
          },
        ],
        gaps: [
          "Not targeted at international Arab tourists",
          "Missing VIP / exclusive experience angle",
        ],
      },
    ],
    contentGaps: [
      `Comprehensive Arabic-language guide to ${destination} neighborhoods for luxury travelers`,
      `${destination} prayer time guide with mosque directory and halal food map`,
      `VIP concierge services comparison in ${destination} for Gulf tourists`,
      `Seasonal ${destination} events calendar curated for Arab families`,
      `${destination} private shopping experiences and personal styling services`,
    ],
    recommendedTopics: [
      `The ultimate halal fine dining guide to ${destination} — 15 restaurants reviewed`,
      `${destination} with kids: luxury family itinerary for Gulf travelers`,
      `Where to pray in ${destination}: mosque directory and quiet spaces guide`,
      `${destination} luxury shopping: insider VAT refund tips and personal shopper services`,
      `Hidden ${destination}: exclusive experiences most travel guides miss`,
    ],
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate and normalize the AI output to ensure it conforms to ResearchOutput.
 * Fills in missing fields with safe defaults rather than crashing.
 */
function validateAndNormalize(
  raw: Record<string, unknown>,
  siteConfig: SiteConfig
): ResearchOutput {
  const fallback = buildFallbackOutput(siteConfig);

  const trendingTopics = Array.isArray(raw.trendingTopics)
    ? (raw.trendingTopics as Record<string, unknown>[]).map((t) => ({
        topic: String(t.topic ?? "Unknown topic"),
        trendScore: Math.min(100, Math.max(1, Number(t.trendScore) || 50)),
        source: (["web_trend", "internal_data", "competitor", "seasonal"].includes(
          String(t.source)
        )
          ? String(t.source)
          : "web_trend") as TrendingTopic["source"],
        relevance: String(t.relevance ?? ""),
        timelinessWindow: (
          ["next 24h", "this week", "this month", "evergreen"].includes(
            String(t.timelinessWindow)
          )
            ? String(t.timelinessWindow)
            : "this month"
        ) as TrendingTopic["timelinessWindow"],
      }))
    : fallback.trendingTopics;

  const rawAudience = (raw.audienceProfile ?? {}) as Record<string, unknown>;
  const rawPrefs = (rawAudience.contentPreferences ?? {}) as Record<
    string,
    unknown
  >;
  const audienceProfile: AudienceProfile = {
    demographics: String(
      rawAudience.demographics ?? fallback.audienceProfile.demographics
    ),
    interests: Array.isArray(rawAudience.interests)
      ? (rawAudience.interests as string[])
      : fallback.audienceProfile.interests,
    painPoints: Array.isArray(rawAudience.painPoints)
      ? (rawAudience.painPoints as string[])
      : fallback.audienceProfile.painPoints,
    contentPreferences: {
      formats: Array.isArray(rawPrefs.formats)
        ? (rawPrefs.formats as string[])
        : fallback.audienceProfile.contentPreferences.formats,
      tone: String(
        rawPrefs.tone ??
          fallback.audienceProfile.contentPreferences.tone
      ),
      bestTimes: Array.isArray(rawPrefs.bestTimes)
        ? (rawPrefs.bestTimes as AudienceProfile["contentPreferences"]["bestTimes"])
        : fallback.audienceProfile.contentPreferences.bestTimes,
    },
  };

  const rawKw = (raw.keywords ?? {}) as Record<string, unknown>;
  const keywords: KeywordBundle = {
    primary: Array.isArray(rawKw.primary)
      ? (rawKw.primary as string[])
      : fallback.keywords.primary,
    longTail: Array.isArray(rawKw.longTail)
      ? (rawKw.longTail as string[])
      : fallback.keywords.longTail,
    hashtags:
      rawKw.hashtags && typeof rawKw.hashtags === "object"
        ? (rawKw.hashtags as Record<string, string[]>)
        : fallback.keywords.hashtags,
  };

  const competitorInsights = Array.isArray(raw.competitorInsights)
    ? (raw.competitorInsights as Record<string, unknown>[]).map((c) => ({
        name: String(c.name ?? "Unknown competitor"),
        topContent: Array.isArray(c.topContent)
          ? (c.topContent as CompetitorInsight["topContent"])
          : [],
        gaps: Array.isArray(c.gaps) ? (c.gaps as string[]) : [],
      }))
    : fallback.competitorInsights;

  const contentGaps = Array.isArray(raw.contentGaps)
    ? (raw.contentGaps as string[])
    : fallback.contentGaps;

  const recommendedTopics = Array.isArray(raw.recommendedTopics)
    ? (raw.recommendedTopics as string[])
    : fallback.recommendedTopics;

  return {
    trendingTopics,
    audienceProfile,
    keywords,
    competitorInsights,
    contentGaps,
    recommendedTopics,
  };
}

// ---------------------------------------------------------------------------
// Pipeline persistence
// ---------------------------------------------------------------------------

/**
 * Create or update a ContentPipeline record with the research results.
 */
async function persistToPipeline(
  siteId: string,
  pipelineId: string | undefined,
  researchData: ResearchOutput,
  topic: string | undefined,
  feedForward: Record<string, unknown> | undefined
): Promise<string> {
  try {
    if (pipelineId) {
      await prisma.contentPipeline.update({
        where: { id: pipelineId },
        data: {
          status: "researching",
          researchData: researchData as unknown as Record<string, unknown>,
          topic:
            topic ??
            researchData.recommendedTopics[0] ??
            "Research complete",
          feedForwardApplied: feedForward
            ? (feedForward as unknown as Record<string, unknown>)
            : undefined,
          updatedAt: new Date(),
        },
      });
      console.log(
        `${LOG_PREFIX} Updated ContentPipeline ${pipelineId} with research data`
      );
      return pipelineId;
    }

    const created = await prisma.contentPipeline.create({
      data: {
        site: siteId,
        status: "researching",
        researchData: researchData as unknown as Record<string, unknown>,
        topic:
          topic ??
          researchData.recommendedTopics[0] ??
          "Research complete",
        feedForwardApplied: feedForward
          ? (feedForward as unknown as Record<string, unknown>)
          : undefined,
      },
    });
    console.log(
      `${LOG_PREFIX} Created ContentPipeline ${created.id} with research data`
    );
    return created.id;
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} Failed to persist research to ContentPipeline:`,
      error instanceof Error ? error.message : error
    );
    return pipelineId ?? "unsaved";
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Run the Researcher agent.
 *
 * 1. Loads site config
 * 2. Queries DB for recent posts, topics, and performance
 * 3. Builds a research prompt and calls the AI
 * 4. Validates/normalizes the response
 * 5. Persists results to ContentPipeline.researchData
 * 6. Returns the structured ResearchOutput
 *
 * If AI is unavailable, returns a realistic fallback based on site config.
 */
export async function runResearcher(
  input: ResearchInput
): Promise<ResearchOutput> {
  const { site, niche, feedForward, pipelineId } = input;
  const lookbackDays = input.lookbackDays ?? 7;

  console.log(
    `${LOG_PREFIX} Starting research for site="${site}" niche="${niche ?? "general"}" lookback=${lookbackDays}d`
  );

  // ---- 1. Load site config ----
  const siteConfig = getSiteConfig(site);
  if (!siteConfig) {
    const availableSites = Object.keys(SITES).join(", ");
    throw new Error(
      `${LOG_PREFIX} Unknown site "${site}". Available: ${availableSites}`
    );
  }

  // ---- 2. Gather internal data (parallel) ----
  const [topPosts, existingTopics, performance] = await Promise.all([
    getRecentTopPosts(site, lookbackDays),
    getRecentTopicProposals(site, lookbackDays),
    getRecentPerformance(site, lookbackDays),
  ]);

  console.log(
    `${LOG_PREFIX} Internal data: ${topPosts.length} top posts, ${existingTopics.length} existing topics, ${performance.length} performance records`
  );

  // ---- 3. Check AI availability ----
  const aiAvailable = await isAIAvailable().catch(() => false);

  if (!aiAvailable) {
    console.warn(
      `${LOG_PREFIX} AI is not available. Returning fallback research output.`
    );
    const fallbackOutput = buildFallbackOutput(siteConfig);
    const savedId = await persistToPipeline(
      site,
      pipelineId,
      fallbackOutput,
      niche,
      feedForward
    );
    console.log(
      `${LOG_PREFIX} Fallback research saved to pipeline ${savedId}`
    );
    return fallbackOutput;
  }

  // ---- 4. Build prompt and call AI ----
  const prompt = buildResearchPrompt(
    siteConfig,
    topPosts,
    existingTopics,
    performance,
    niche,
    feedForward
  );

  let researchOutput: ResearchOutput;

  try {
    console.log(`${LOG_PREFIX} Calling AI for research...`);

    const rawResponse = await generateJSON<Record<string, unknown>>(prompt, {
      systemPrompt: `You are a content research AI specializing in luxury travel markets. You provide data-driven research in structured JSON. Always respond with the exact JSON schema requested. Do not include markdown formatting, explanations, or commentary outside the JSON structure.`,
      maxTokens: 4096,
      temperature: 0.7,
    });

    researchOutput = validateAndNormalize(rawResponse, siteConfig);

    console.log(
      `${LOG_PREFIX} AI research complete: ${researchOutput.trendingTopics.length} trending topics, ${researchOutput.recommendedTopics.length} recommended topics`
    );
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} AI research failed, falling back to config-based output:`,
      error instanceof Error ? error.message : error
    );
    researchOutput = buildFallbackOutput(siteConfig);
  }

  // ---- 5. Persist to ContentPipeline ----
  const savedId = await persistToPipeline(
    site,
    pipelineId,
    researchOutput,
    niche,
    feedForward
  );

  console.log(
    `${LOG_PREFIX} Research complete for "${site}". Pipeline: ${savedId}. Topics: ${researchOutput.recommendedTopics.join("; ")}`
  );

  return researchOutput;
}
