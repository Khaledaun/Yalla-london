/**
 * Web-based Fact Verification Engine
 *
 * Cross-checks extracted facts against trusted websites using:
 * 1. DuckDuckGo HTML search (no API key needed) to discover relevant pages
 * 2. Direct fetch of trusted domain pages
 * 3. Cheerio-based content extraction and keyword matching
 * 4. Multi-source corroboration scoring
 *
 * Trusted source tiers:
 *   Tier 1 (official):  tfl.gov.uk, gov.uk, royalmail.com, ons.gov.uk
 *   Tier 2 (authority): timeout.com, visitlondon.com, visitbritain.com, londonist.com
 *   Tier 3 (reference): tripadvisor.com, booking.com, wikipedia.org, google.com/maps
 */

import * as cheerio from "cheerio";
import { fetchWithRetry } from "@/lib/resilience";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WebVerificationResult {
  confidence: number; // 0–100
  result: "verified" | "outdated" | "unverifiable" | "flagged_for_review";
  source: string; // comma-separated list of sources checked
  notes: string;
  sources_checked: SourceCheck[];
}

interface SourceCheck {
  url: string;
  domain: string;
  tier: 1 | 2 | 3;
  matched: boolean;
  snippet: string; // extracted relevant snippet, or reason for no match
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

// ---------------------------------------------------------------------------
// Trusted domains by fact category
// ---------------------------------------------------------------------------

const TRUSTED_DOMAINS: Record<string, { domain: string; tier: 1 | 2 | 3 }[]> = {
  price: [
    { domain: "timeout.com", tier: 2 },
    { domain: "visitlondon.com", tier: 2 },
    { domain: "tripadvisor.com", tier: 3 },
    { domain: "booking.com", tier: 3 },
    { domain: "londonist.com", tier: 2 },
  ],
  schedule: [
    { domain: "timeout.com", tier: 2 },
    { domain: "visitlondon.com", tier: 2 },
    { domain: "londonist.com", tier: 2 },
    { domain: "tripadvisor.com", tier: 3 },
  ],
  address: [
    { domain: "royalmail.com", tier: 1 },
    { domain: "timeout.com", tier: 2 },
    { domain: "visitlondon.com", tier: 2 },
    { domain: "tripadvisor.com", tier: 3 },
  ],
  contact: [
    { domain: "timeout.com", tier: 2 },
    { domain: "visitlondon.com", tier: 2 },
    { domain: "tripadvisor.com", tier: 3 },
    { domain: "londonist.com", tier: 2 },
  ],
  transport: [
    { domain: "tfl.gov.uk", tier: 1 },
    { domain: "visitlondon.com", tier: 2 },
    { domain: "timeout.com", tier: 2 },
    { domain: "londonist.com", tier: 2 },
  ],
  regulation: [
    { domain: "gov.uk", tier: 1 },
    { domain: "visitbritain.com", tier: 2 },
    { domain: "visitlondon.com", tier: 2 },
  ],
  statistic: [
    { domain: "ons.gov.uk", tier: 1 },
    { domain: "visitbritain.com", tier: 2 },
    { domain: "visitlondon.com", tier: 2 },
    { domain: "wikipedia.org", tier: 3 },
  ],
};

// All unique trusted domains for filtering search results
const ALL_TRUSTED_DOMAINS = [
  ...new Set(
    Object.values(TRUSTED_DOMAINS)
      .flat()
      .map((d) => d.domain),
  ),
];

// ---------------------------------------------------------------------------
// Search via DuckDuckGo HTML (no API key required)
// ---------------------------------------------------------------------------

/**
 * Searches DuckDuckGo's HTML endpoint and parses results.
 * Returns up to `limit` results. Handles errors gracefully.
 */
async function searchWeb(query: string, limit = 8): Promise<SearchResult[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://html.duckduckgo.com/html/?q=${encoded}`;

  try {
    const response = await fetchWithRetry(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; YallaLondonFactChecker/1.0; +https://yalla-london.com)",
          Accept: "text/html",
        },
      },
      { maxRetries: 2, baseDelayMs: 2000, maxDelayMs: 10000 },
    );

    if (!response.ok) {
      console.warn(`[fact-verifier] DuckDuckGo search returned ${response.status}`);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    $(".result").each((_, el) => {
      if (results.length >= limit) return false;

      const titleEl = $(el).find(".result__title a, .result__a");
      const snippetEl = $(el).find(".result__snippet");
      const href = titleEl.attr("href") || "";

      // DuckDuckGo wraps URLs in a redirect — extract the actual URL
      let actualUrl = href;
      if (href.includes("uddg=")) {
        const match = href.match(/uddg=([^&]+)/);
        if (match) actualUrl = decodeURIComponent(match[1]);
      }

      if (actualUrl && !actualUrl.startsWith("https://duckduckgo.com")) {
        results.push({
          title: titleEl.text().trim(),
          url: actualUrl,
          snippet: snippetEl.text().trim(),
        });
      }
    });

    return results;
  } catch (error) {
    console.warn(
      `[fact-verifier] Search failed for "${query.slice(0, 60)}...":`,
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

// ---------------------------------------------------------------------------
// Fetch and extract relevant content from a page
// ---------------------------------------------------------------------------

/**
 * Fetches a URL and extracts text content, looking for keywords
 * from the fact. Returns a snippet if keywords are found.
 */
async function fetchAndCheck(
  url: string,
  keywords: string[],
): Promise<{ matched: boolean; snippet: string }> {
  try {
    const response = await fetchWithRetry(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; YallaLondonFactChecker/1.0; +https://yalla-london.com)",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(8000),
      },
      { maxRetries: 1, baseDelayMs: 1000, maxDelayMs: 5000 },
    );

    if (!response.ok) {
      return { matched: false, snippet: `HTTP ${response.status}` };
    }

    const html = await response.text();
    // Limit to first 500KB to avoid memory issues on huge pages
    const trimmedHtml = html.slice(0, 500_000);
    const $ = cheerio.load(trimmedHtml);

    // Remove script, style, nav, footer, header to focus on content
    $("script, style, nav, footer, header, aside, .cookie-banner, .ad").remove();

    const pageText = $("body").text().replace(/\s+/g, " ").toLowerCase();

    // Check how many keywords match
    const lowerKeywords = keywords.map((k) => k.toLowerCase());
    const matchedKeywords = lowerKeywords.filter((kw) => pageText.includes(kw));
    const matchRatio = matchedKeywords.length / Math.max(lowerKeywords.length, 1);

    if (matchRatio >= 0.4) {
      // Extract a snippet around the first matched keyword
      const firstMatch = matchedKeywords[0];
      const idx = pageText.indexOf(firstMatch);
      const start = Math.max(0, idx - 80);
      const end = Math.min(pageText.length, idx + firstMatch.length + 120);
      const snippet = pageText.slice(start, end).trim();

      return {
        matched: true,
        snippet: `...${snippet}... (${matchedKeywords.length}/${lowerKeywords.length} keywords matched)`,
      };
    }

    return {
      matched: false,
      snippet: `0/${lowerKeywords.length} keywords matched on page`,
    };
  } catch (error) {
    return {
      matched: false,
      snippet: error instanceof Error ? error.message : "Fetch failed",
    };
  }
}

// ---------------------------------------------------------------------------
// Keyword extraction from fact text
// ---------------------------------------------------------------------------

/**
 * Extracts meaningful keywords from a fact for search and matching.
 * Strips common words, keeps numbers, proper nouns, and domain terms.
 */
function extractKeywords(factText: string): string[] {
  const stopwords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "shall", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "through", "during",
    "before", "after", "above", "below", "between", "out", "off", "over",
    "under", "again", "further", "then", "once", "here", "there", "when",
    "where", "why", "how", "all", "each", "every", "both", "few", "more",
    "most", "other", "some", "such", "no", "nor", "not", "only", "own",
    "same", "so", "than", "too", "very", "and", "but", "or", "if", "it",
    "its", "this", "that", "these", "those", "i", "you", "he", "she", "we",
    "they", "me", "him", "her", "us", "them", "my", "your", "his",
    "per", "up", "also", "just", "about", "which", "who", "whom",
  ]);

  // Split on word boundaries, keep meaningful tokens
  const tokens = factText
    .replace(/[^\w\s£$€.,-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .filter((t) => !stopwords.has(t.toLowerCase()))
    // Keep numbers (prices, postcodes, stats)
    .filter((t) => t.length >= 3 || /\d/.test(t));

  // Deduplicate while preserving order
  const seen = new Set<string>();
  return tokens.filter((t) => {
    const lower = t.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

/**
 * Builds a targeted search query for a fact.
 * Includes category-specific site restrictions when possible.
 */
function buildSearchQuery(
  factText: string,
  category: string | null,
): string {
  // Extract the most distinctive keywords (max 8 for search)
  const keywords = extractKeywords(factText).slice(0, 8);

  // Add location context for London travel facts
  const hasLondon = factText.toLowerCase().includes("london");
  const locationHint = hasLondon ? "" : " London";

  // Category-specific site hints
  const siteHints: Record<string, string> = {
    transport: "site:tfl.gov.uk OR site:timeout.com",
    regulation: "site:gov.uk OR site:visitbritain.com",
    statistic: "site:ons.gov.uk OR site:visitbritain.com",
  };

  const siteRestriction = siteHints[category ?? ""] || "";
  const query = keywords.join(" ") + locationHint;

  // If we have a site restriction, run a targeted search
  return siteRestriction ? `${query} ${siteRestriction}` : query;
}

// ---------------------------------------------------------------------------
// Domain matching helper
// ---------------------------------------------------------------------------

function getDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Strip www. prefix
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getTierForDomain(
  domain: string,
  category: string | null,
): 1 | 2 | 3 {
  const categoryDomains = TRUSTED_DOMAINS[category ?? ""] || [];
  const found = categoryDomains.find((d) => domain.includes(d.domain));
  if (found) return found.tier;

  // Check across all categories
  for (const domainList of Object.values(TRUSTED_DOMAINS)) {
    const match = domainList.find((d) => domain.includes(d.domain));
    if (match) return match.tier;
  }

  return 3; // Default tier for unknown domains
}

// ---------------------------------------------------------------------------
// Main verification function
// ---------------------------------------------------------------------------

/**
 * Verifies a fact by cross-checking it against trusted websites.
 *
 * Process:
 * 1. Extract keywords from the fact text
 * 2. Search DuckDuckGo for relevant pages (preferring trusted domains)
 * 3. Fetch top results from trusted domains and check for keyword matches
 * 4. Score based on:
 *    - Number of sources that corroborate (more = higher confidence)
 *    - Tier of corroborating sources (tier 1 = official = highest weight)
 *    - Age of the fact (older = lower baseline)
 *    - Category volatility (prices/schedules decay faster)
 */
export async function verifyFactViaWeb(fact: {
  id: string;
  category: string | null;
  status: string;
  verification_count: number;
  created_at: Date;
  fact_text_en: string;
}): Promise<WebVerificationResult> {
  const keywords = extractKeywords(fact.fact_text_en);

  if (keywords.length < 2) {
    return {
      confidence: 30,
      result: "unverifiable",
      source: "insufficient-keywords",
      notes: `Only ${keywords.length} keyword(s) extracted — fact too short or generic for web verification.`,
      sources_checked: [],
    };
  }

  // 1. Search the web
  const searchQuery = buildSearchQuery(fact.fact_text_en, fact.category);
  const searchResults = await searchWeb(searchQuery, 10);

  if (searchResults.length === 0) {
    return {
      confidence: 25,
      result: "unverifiable",
      source: "search-no-results",
      notes: `Web search returned no results for query: "${searchQuery.slice(0, 100)}"`,
      sources_checked: [],
    };
  }

  // 2. Prioritise results from trusted domains
  const trustedDomainSet = new Set(
    (TRUSTED_DOMAINS[fact.category ?? ""] || []).map((d) => d.domain),
  );

  const prioritised = [...searchResults].sort((a, b) => {
    const aDomain = getDomainFromUrl(a.url);
    const bDomain = getDomainFromUrl(b.url);
    const aIsTrusted = ALL_TRUSTED_DOMAINS.some((d) => aDomain.includes(d));
    const bIsTrusted = ALL_TRUSTED_DOMAINS.some((d) => bDomain.includes(d));
    if (aIsTrusted && !bIsTrusted) return -1;
    if (!aIsTrusted && bIsTrusted) return 1;
    // Within trusted, prefer category-specific domains
    const aCatTrusted = [...trustedDomainSet].some((d) => aDomain.includes(d));
    const bCatTrusted = [...trustedDomainSet].some((d) => bDomain.includes(d));
    if (aCatTrusted && !bCatTrusted) return -1;
    if (!aCatTrusted && bCatTrusted) return 1;
    return 0;
  });

  // 3. Fetch and check top results (max 5 to stay within time budget)
  const toCheck = prioritised.slice(0, 5);
  const sourcesChecked: SourceCheck[] = [];
  let tier1Matches = 0;
  let tier2Matches = 0;
  let tier3Matches = 0;

  for (const result of toCheck) {
    const domain = getDomainFromUrl(result.url);
    const tier = getTierForDomain(domain, fact.category);

    // Check the search snippet first (cheaper than full fetch)
    const snippetKeywords = keywords.slice(0, 5);
    const snippetLower = result.snippet.toLowerCase();
    const snippetMatches = snippetKeywords.filter((kw) =>
      snippetLower.includes(kw.toLowerCase()),
    ).length;
    const snippetMatchRatio = snippetMatches / Math.max(snippetKeywords.length, 1);

    if (snippetMatchRatio >= 0.5) {
      // Snippet already corroborates — skip full fetch to save time
      sourcesChecked.push({
        url: result.url,
        domain,
        tier,
        matched: true,
        snippet: `Search snippet match: "${result.snippet.slice(0, 150)}..."`,
      });
      if (tier === 1) tier1Matches++;
      else if (tier === 2) tier2Matches++;
      else tier3Matches++;
      continue;
    }

    // Full page fetch and check
    const { matched, snippet } = await fetchAndCheck(result.url, keywords);
    sourcesChecked.push({ url: result.url, domain, tier, matched, snippet });

    if (matched) {
      if (tier === 1) tier1Matches++;
      else if (tier === 2) tier2Matches++;
      else tier3Matches++;
    }
  }

  // 4. Score the verification
  const totalMatches = tier1Matches + tier2Matches + tier3Matches;
  const totalChecked = sourcesChecked.length;

  // Base confidence from source corroboration
  let confidence = 20; // Start at 20 (we at least searched)

  // Tier 1 (official) matches are worth the most
  confidence += tier1Matches * 25;
  // Tier 2 (authority) matches
  confidence += tier2Matches * 15;
  // Tier 3 (reference) matches
  confidence += tier3Matches * 10;

  // Cap at 95
  confidence = Math.min(95, confidence);

  // Age decay — prices and schedules lose confidence faster
  const ageMs = Date.now() - new Date(fact.created_at).getTime();
  const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  const volatileCategories = ["price", "schedule"];
  const isVolatile = volatileCategories.includes(fact.category ?? "");

  if (isVolatile && ageDays > 90) {
    confidence = Math.max(20, confidence - 20);
  } else if (isVolatile && ageDays > 30) {
    confidence = Math.max(30, confidence - 10);
  } else if (ageDays > 180) {
    confidence = Math.max(25, confidence - 15);
  }

  // Determine result
  let result: WebVerificationResult["result"];
  let notes: string;
  const sourceNames = sourcesChecked
    .filter((s) => s.matched)
    .map((s) => s.domain)
    .join(", ");

  if (totalMatches === 0) {
    if (totalChecked === 0) {
      result = "unverifiable";
      notes = "No pages could be fetched for verification.";
    } else {
      result = "flagged_for_review";
      notes = `Checked ${totalChecked} sources but none corroborated the fact. Manual review recommended.`;
      confidence = Math.min(confidence, 35);
    }
  } else if (confidence < 40) {
    result = "outdated";
    notes = `Low confidence (${confidence}). ${totalMatches}/${totalChecked} sources matched but fact is ${ageDays} days old in volatile category. Sources: ${sourceNames}`;
  } else if (totalMatches >= 2 && confidence >= 60) {
    result = "verified";
    notes = `Cross-verified on ${totalMatches} sources (${tier1Matches} official, ${tier2Matches} authority, ${tier3Matches} reference). Sources: ${sourceNames}`;
  } else if (totalMatches >= 1 && confidence >= 45) {
    result = "verified";
    notes = `Partially verified on ${totalMatches} source(s). Confidence: ${confidence}. Sources: ${sourceNames}`;
  } else {
    result = "flagged_for_review";
    notes = `Weak corroboration: ${totalMatches}/${totalChecked} sources matched, confidence ${confidence}. Sources checked: ${sourcesChecked.map((s) => s.domain).join(", ")}`;
  }

  return {
    confidence,
    result,
    source: sourceNames || sourcesChecked.map((s) => s.domain).join(", "),
    notes,
    sources_checked: sourcesChecked,
  };
}
