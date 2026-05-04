/**
 * DataForSEO API client for Chrome Bridge.
 *
 * Env vars required:
 *   DATAFORSEO_LOGIN    — account email
 *   DATAFORSEO_PASSWORD — API password from dashboard (NOT the UI password)
 *
 * Auth: HTTP Basic Auth (base64 of "login:password")
 *
 * Endpoints used (pay-as-you-go pricing, Feb 2026):
 *   SERP Live         $0.00075/req  — top 10 Google results for a keyword
 *   Keywords Data     $0.00050/req  — search volume + CPC for up to 1000 keywords
 *   SEO Labs          $0.00075/req  — related keywords, search intent
 *
 * Cost at 100 SERP checks + 500 keyword lookups/mo ≈ $0.33/mo.
 *
 * All fetches use 20s timeout and graceful degradation (returns null + logged
 * warning, never throws to caller).
 */

const DATAFORSEO_BASE = "https://api.dataforseo.com/v3";

export interface DataForSEOConfig {
  login: string;
  password: string;
}

export function getDataForSEOConfig(): DataForSEOConfig | null {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return null;
  return { login, password };
}

export function isDataForSEOConfigured(): boolean {
  return getDataForSEOConfig() !== null;
}

function basicAuthHeader(config: DataForSEOConfig): string {
  const raw = `${config.login}:${config.password}`;
  const encoded =
    typeof btoa !== "undefined"
      ? btoa(raw)
      : Buffer.from(raw, "utf-8").toString("base64");
  return `Basic ${encoded}`;
}

async function postDataForSEO<T>(
  path: string,
  payload: unknown[],
  config: DataForSEOConfig,
): Promise<T | null> {
  try {
    const response = await fetch(`${DATAFORSEO_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: basicAuthHeader(config),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      console.warn(
        `[dataforseo] ${path} returned ${response.status} ${response.statusText}`,
      );
      return null;
    }
    const json = (await response.json()) as T;
    return json;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[dataforseo] ${path} failed:`, message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// SERP (top 10 Google results for a keyword)
// ---------------------------------------------------------------------------

export interface SerpOrganicResult {
  rank: number;
  domain: string;
  url: string;
  title: string;
  description: string | null;
  breadcrumbs: string | null;
}

export interface SerpResponse {
  keyword: string;
  locationCode: number;
  languageCode: string;
  totalResults: number;
  organic: SerpOrganicResult[];
  featuredSnippet: { domain: string; url: string; text: string } | null;
  peopleAlsoAsk: string[];
  relatedSearches: string[];
  aiOverview: { cited: { url: string; domain: string }[] } | null;
  cost: number;
}

/**
 * Fetch top 10 Google organic results + SERP features for a keyword.
 * locationCode defaults to 2826 (United Kingdom). See DataForSEO locations.
 */
export async function fetchSERP(
  keyword: string,
  locationCode: number = 2826,
  languageCode: string = "en",
): Promise<SerpResponse | null> {
  const config = getDataForSEOConfig();
  if (!config) return null;

  const payload = [
    {
      keyword,
      location_code: locationCode,
      language_code: languageCode,
      device: "desktop",
      depth: 10,
    },
  ];

  interface RawSerpItem {
    type: string;
    rank_group?: number;
    rank_absolute?: number;
    domain?: string;
    url?: string;
    title?: string;
    description?: string;
    breadcrumb?: string;
    text?: string;
    items?: RawSerpItem[];
  }

  interface RawSerpResponse {
    tasks?: Array<{
      result?: Array<{
        total_count?: number;
        items?: RawSerpItem[];
      }>;
      cost?: number;
    }>;
  }

  const raw = await postDataForSEO<RawSerpResponse>(
    "/serp/google/organic/live/advanced",
    payload,
    config,
  );
  const task = raw?.tasks?.[0];
  const result = task?.result?.[0];
  if (!result) return null;

  const organic: SerpOrganicResult[] = [];
  const peopleAlsoAsk: string[] = [];
  const relatedSearches: string[] = [];
  let featuredSnippet: SerpResponse["featuredSnippet"] = null;
  const aiOverviewCited: { url: string; domain: string }[] = [];

  for (const item of result.items ?? []) {
    if (item.type === "organic") {
      organic.push({
        rank: item.rank_absolute ?? item.rank_group ?? organic.length + 1,
        domain: item.domain ?? "",
        url: item.url ?? "",
        title: item.title ?? "",
        description: item.description ?? null,
        breadcrumbs: item.breadcrumb ?? null,
      });
    } else if (item.type === "featured_snippet") {
      featuredSnippet = {
        domain: item.domain ?? "",
        url: item.url ?? "",
        text: (item.description ?? item.text ?? "").slice(0, 500),
      };
    } else if (item.type === "people_also_ask") {
      for (const sub of item.items ?? []) {
        if (sub.title) peopleAlsoAsk.push(sub.title);
      }
    } else if (item.type === "related_searches") {
      for (const sub of item.items ?? []) {
        if (sub.title) relatedSearches.push(sub.title);
      }
    } else if (item.type === "ai_overview") {
      for (const sub of item.items ?? []) {
        if (sub.url && sub.domain) {
          aiOverviewCited.push({ url: sub.url, domain: sub.domain });
        }
      }
    }
  }

  return {
    keyword,
    locationCode,
    languageCode,
    totalResults: result.total_count ?? 0,
    organic,
    featuredSnippet,
    peopleAlsoAsk,
    relatedSearches,
    aiOverview: aiOverviewCited.length > 0 ? { cited: aiOverviewCited } : null,
    cost: task?.cost ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Keyword research (search volume + CPC + competition)
// ---------------------------------------------------------------------------

export interface KeywordMetrics {
  keyword: string;
  searchVolume: number | null;
  cpc: number | null;
  competition: number | null; // 0-1
  competitionLevel: "LOW" | "MEDIUM" | "HIGH" | null;
  monthlyTrend: Array<{ year: number; month: number; searchVolume: number | null }>;
}

/**
 * Fetch search volume + CPC + competition for up to 1000 keywords.
 * locationCode defaults to 2826 (UK).
 */
export async function fetchKeywordMetrics(
  keywords: string[],
  locationCode: number = 2826,
  languageCode: string = "en",
): Promise<KeywordMetrics[]> {
  const config = getDataForSEOConfig();
  if (!config) return [];
  if (keywords.length === 0) return [];

  const payload = [
    {
      keywords: keywords.slice(0, 1000),
      location_code: locationCode,
      language_code: languageCode,
      include_clickstream_data: false,
    },
  ];

  interface RawKeywordItem {
    keyword: string;
    keyword_info?: {
      search_volume?: number | null;
      cpc?: number | null;
      competition?: number | null;
      competition_level?: "LOW" | "MEDIUM" | "HIGH" | null;
      monthly_searches?: Array<{ year: number; month: number; search_volume: number | null }>;
    };
  }

  interface RawKeywordResponse {
    tasks?: Array<{
      result?: RawKeywordItem[];
    }>;
  }

  const raw = await postDataForSEO<RawKeywordResponse>(
    "/keywords_data/google_ads/search_volume/live",
    payload,
    config,
  );
  const result = raw?.tasks?.[0]?.result ?? [];

  return result.map((item) => ({
    keyword: item.keyword,
    searchVolume: item.keyword_info?.search_volume ?? null,
    cpc: item.keyword_info?.cpc ?? null,
    competition: item.keyword_info?.competition ?? null,
    competitionLevel: item.keyword_info?.competition_level ?? null,
    monthlyTrend:
      (item.keyword_info?.monthly_searches ?? []).map((m) => ({
        year: m.year,
        month: m.month,
        searchVolume: m.search_volume ?? null,
      })),
  }));
}

// ---------------------------------------------------------------------------
// Location code lookup (small curated list)
// ---------------------------------------------------------------------------

export const LOCATION_CODES: Record<string, number> = {
  "uk": 2826,
  "united kingdom": 2826,
  "us": 2840,
  "united states": 2840,
  "uae": 2784,
  "saudi arabia": 2682,
  "egypt": 2818,
  "jordan": 2400,
  "kuwait": 2414,
  "qatar": 2634,
  "france": 2250,
  "italy": 2380,
  "turkey": 2792,
  "thailand": 2764,
  "maldives": 2462,
};

export function resolveLocationCode(input?: string): number {
  if (!input) return 2826;
  const normalized = input.toLowerCase().trim();
  return LOCATION_CODES[normalized] ?? 2826;
}
