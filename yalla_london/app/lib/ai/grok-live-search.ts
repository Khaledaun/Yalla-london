/**
 * Grok Live Search — Real-time web & X (Twitter) search via xAI Responses API
 *
 * Uses the new Tools-based Responses API (replaces deprecated Live Search API).
 * Endpoint: POST https://api.x.ai/v1/responses
 *
 * Two tools available:
 *   - web_search: Real-time web search with optional domain filtering
 *   - x_search: Search X/Twitter posts with optional handle/date filtering
 *
 * Env var: XAI_API_KEY or GROK_API_KEY
 *
 * @see https://docs.x.ai/docs/guides/tools/search-tools
 */

// ─── Types ──────────────────────────────────────────────────────

export interface GrokSearchOptions {
  /** Model to use. Default: grok-4-1-fast (optimized for agentic tool calling) */
  model?: string;
  /** Include inline citations in the response */
  inlineCitations?: boolean;
  /** Timeout in ms. Default: 30_000 */
  timeoutMs?: number;
}

export interface WebSearchOptions extends GrokSearchOptions {
  /** Restrict web search to these domains (max 5) */
  allowedDomains?: string[];
  /** Exclude these domains from web search */
  excludedDomains?: string[];
}

export interface XSearchOptions extends GrokSearchOptions {
  /** Only search posts from these X handles */
  allowedHandles?: string[];
  /** Start date for X search (ISO 8601, e.g. "2026-01-01") */
  fromDate?: string;
  /** End date for X search (ISO 8601) */
  toDate?: string;
}

export interface GrokSearchResult {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

// ─── Core API Call ──────────────────────────────────────────────

function getApiKey(): string | null {
  return process.env.XAI_API_KEY || process.env.GROK_API_KEY || null;
}

export function isGrokSearchAvailable(): boolean {
  return !!getApiKey();
}

/**
 * Low-level call to the xAI Responses API with tools.
 */
async function callResponsesAPI(
  input: string | Array<{ role: string; content: string }>,
  tools: any[],
  options: GrokSearchOptions = {},
): Promise<GrokSearchResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('XAI_API_KEY or GROK_API_KEY not configured');
  }

  const model = options.model || 'grok-4-1-fast';
  const timeoutMs = options.timeoutMs || 30_000;

  const body: Record<string, any> = {
    model,
    input,
    tools,
    stream: false,
  };

  if (options.inlineCitations) {
    body.inline_citations = true;
  }

  const response = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Grok Responses API error (${response.status}): ${errorText.slice(0, 300)}`);
  }

  const data = await response.json();

  // Extract the text output from the response
  // The Responses API returns an array of output items
  let content = '';
  if (data.output) {
    for (const item of data.output) {
      if (item.type === 'message' && item.content) {
        for (const block of item.content) {
          if (block.type === 'output_text' || block.type === 'text') {
            content += block.text || '';
          }
        }
      }
    }
  }

  // Fallback: some responses use a different structure
  if (!content && data.output_text) {
    content = data.output_text;
  }

  return {
    content,
    model,
    usage: {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  };
}

// ─── High-Level Search Functions ────────────────────────────────

/**
 * Search the web via Grok with optional domain filtering.
 * Uses the web_search tool for real-time web data.
 */
export async function searchWeb(
  query: string,
  options: WebSearchOptions = {},
): Promise<GrokSearchResult> {
  const tool: Record<string, any> = { type: 'web_search' };

  if (options.allowedDomains?.length) {
    tool.web_search = { allowed_domains: options.allowedDomains.slice(0, 5) };
  } else if (options.excludedDomains?.length) {
    tool.web_search = { excluded_domains: options.excludedDomains.slice(0, 5) };
  }

  return callResponsesAPI(query, [tool], options);
}

/**
 * Search X/Twitter posts via Grok with optional handle/date filtering.
 * Uses the x_search tool for real-time social data.
 */
export async function searchX(
  query: string,
  options: XSearchOptions = {},
): Promise<GrokSearchResult> {
  const tool: Record<string, any> = { type: 'x_search' };

  if (options.allowedHandles?.length) {
    tool.allowed_x_handles = options.allowedHandles;
  }
  if (options.fromDate) {
    tool.from_date = options.fromDate;
  }
  if (options.toDate) {
    tool.to_date = options.toDate;
  }

  return callResponsesAPI(query, [tool], options);
}

/**
 * Combined web + X search for comprehensive real-time research.
 * The model autonomously decides which tool(s) to use.
 */
export async function searchAll(
  query: string,
  options: WebSearchOptions & XSearchOptions = {},
): Promise<GrokSearchResult> {
  const tools: any[] = [{ type: 'web_search' }, { type: 'x_search' }];

  if (options.allowedDomains?.length) {
    tools[0].web_search = { allowed_domains: options.allowedDomains.slice(0, 5) };
  }
  if (options.allowedHandles?.length) {
    tools[1].allowed_x_handles = options.allowedHandles;
  }
  if (options.fromDate) {
    tools[1].from_date = options.fromDate;
  }
  if (options.toDate) {
    tools[1].to_date = options.toDate;
  }

  return callResponsesAPI(query, tools, { ...options, inlineCitations: true });
}

// ─── Domain-Specific Search Functions ───────────────────────────

/**
 * Search for trending travel topics relevant to a destination.
 * Combines X social signals with web news for comprehensive trend detection.
 */
export async function searchTrendingTopics(
  destination: string,
  locale: string = 'en',
): Promise<GrokSearchResult> {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().split('T')[0];

  const prompt = locale === 'en'
    ? `You are a travel content strategist for luxury Arab travelers visiting ${destination}.

Search for the most trending and newsworthy topics about ${destination} travel RIGHT NOW.
Focus on: luxury hotels, halal restaurants, shopping, events, seasonal activities, transport updates.

Return a JSON array of 8-10 trending topics:
[{
  "title": "Article title (SEO-optimized, 50-60 chars)",
  "slug": "url-friendly-slug",
  "rationale": "Why this is trending now (1-2 sentences)",
  "trending_score": 0.0-1.0,
  "sources": ["source-domain.com"],
  "category": "hotels|restaurants|shopping|events|transport|culture|seasonal"
}]

Return ONLY the JSON array, no other text.`
    : `أنت استراتيجي محتوى سفر للمسافرين العرب الفاخرين الذين يزورون ${destination}.

ابحث عن أكثر المواضيع رواجاً حول السفر إلى ${destination} الآن.
ركز على: الفنادق الفاخرة، المطاعم الحلال، التسوق، الفعاليات، الأنشطة الموسمية.

أرجع مصفوفة JSON من 8-10 مواضيع:
[{"title", "slug", "rationale", "trending_score", "sources", "category"}]

أرجع فقط مصفوفة JSON.`;

  return searchAll(prompt, {
    fromDate: weekAgo,
    toDate: today,
    timeoutMs: 45_000, // Agentic search can take longer
    inlineCitations: true,
  });
}

/**
 * Search for real-time news about a city from trusted sources.
 * Uses web_search with domain filtering for authoritative news.
 */
export async function searchCityNews(
  city: string,
  trustedDomains: string[],
): Promise<GrokSearchResult> {
  const prompt = `Search for the latest news, events, and updates about ${city} from the past 48 hours.
Focus on: transport disruptions, new restaurant/hotel openings, events, weather alerts, safety updates,
seasonal events, sales, and anything relevant to tourists visiting ${city}.

Return a JSON array of 5-8 news items:
[{
  "headline_en": "English headline",
  "headline_ar": "Arabic headline",
  "summary_en": "2-3 sentence summary",
  "summary_ar": "ملخص بجملتين",
  "category": "transport|events|weather|dining|shopping|culture|safety",
  "urgency": "low|medium|high|urgent",
  "source": "source domain",
  "ttl_days": 1-7
}]

Return ONLY the JSON array, no other text.`;

  return searchWeb(prompt, {
    allowedDomains: trustedDomains.slice(0, 5),
    timeoutMs: 30_000,
  });
}

/**
 * Search X for social buzz about a destination.
 * Good for detecting emerging trends before they hit mainstream news.
 */
export async function searchSocialBuzz(
  destination: string,
  handles: string[] = [],
): Promise<GrokSearchResult> {
  const today = new Date().toISOString().split('T')[0];
  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString().split('T')[0];

  const prompt = `What are people on X/Twitter saying about visiting ${destination} right now?
Look for: viral posts about ${destination} travel, trending restaurants/hotels, travel tips,
complaints about transport, exciting new openings, seasonal events.

Summarize the top 5 social trends as a JSON array. IMPORTANT: For each trend, include the
actual X post URL if you found one, and the author's X handle.

[{
  "trend": "Short description",
  "sentiment": "positive|neutral|negative",
  "engagement": "high|medium|low",
  "relevance_to_tourism": 0.0-1.0,
  "suggested_article_angle": "Content idea based on this trend",
  "post_url": "https://x.com/handle/status/12345 (actual X post URL if available, or empty string)",
  "handle": "author_handle (without @, or empty string)",
  "post_text": "Brief excerpt of the post text (max 280 chars, or empty string)"
}]

Return ONLY the JSON array, no other text.`;

  return searchX(prompt, {
    allowedHandles: handles.length > 0 ? handles : undefined,
    fromDate: threeDaysAgo,
    toDate: today,
    timeoutMs: 30_000,
  });
}
