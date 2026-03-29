/**
 * Unit tests for keyword operations in the commerce engine.
 *
 * Tests keyword deduplication, long-tail generation, search intent classification,
 * seasonality detection, and buyer intent scoring — using patterns and data
 * from the NicheOpportunity type and trend-engine.
 */

import { describe, it, expect } from "vitest";
import type { NicheOpportunity, TrendSignal } from "../../lib/commerce/types";
import { getCategoryTrendSignals } from "../../lib/commerce/trend-engine";
import { PRODUCT_ONTOLOGY } from "../../lib/commerce/constants";

// ─── Keyword Utility Helpers ─────────────────────────────────────────
// These replicate common keyword operations used across the commerce engine.
// They mirror patterns found in listing-generator prompts (long-tail generation),
// campaign-generator (deduplication), and trend-engine (intent classification).

/** Deduplicate keywords case-insensitively, preserving first occurrence order */
function deduplicateKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const kw of keywords) {
    const normalized = kw.trim().toLowerCase();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(kw.trim());
    }
  }
  return result;
}

/** Generate long-tail keyword variants from a base keyword */
function generateLongTailVariants(
  baseKeyword: string,
  destination: string,
): string[] {
  const variants: string[] = [];
  const base = baseKeyword.trim().toLowerCase();
  if (!base) return variants;

  // Common long-tail patterns for travel digital products
  variants.push(`${base} ${destination}`);
  variants.push(`${base} printable`);
  variants.push(`${base} digital download`);
  variants.push(`best ${base} template`);
  variants.push(`${destination} ${base} guide`);
  return variants;
}

/** Classify search intent from a keyword phrase */
function classifySearchIntent(
  keyword: string,
): "commercial" | "informational" | "transactional" | "navigational" {
  const kw = keyword.toLowerCase();

  // Transactional: explicit purchase signals
  if (/\b(buy|purchase|order|download|get|shop|deal|discount|coupon|price)\b/.test(kw)) {
    return "transactional";
  }

  // Navigational: brand or platform names
  if (/\b(etsy|amazon|pinterest|website|login|official)\b/.test(kw)) {
    return "navigational";
  }

  // Commercial: comparison/review signals
  if (/\b(best|top|review|compare|vs|versus|cheapest|premium|luxury|recommended)\b/.test(kw)) {
    return "commercial";
  }

  // Default: informational
  return "informational";
}

/** Detect seasonality from keyword patterns */
function detectSeasonality(keyword: string): string | null {
  const kw = keyword.toLowerCase();

  const seasonalPatterns: Record<string, RegExp> = {
    "winter": /\b(winter|christmas|holiday|december|january|february|snow|ski)\b/,
    "spring": /\b(spring|easter|march|april|may|bloom|garden)\b/,
    "summer": /\b(summer|june|july|august|beach|vacation|pool)\b/,
    "autumn": /\b(autumn|fall|october|november|september|halloween|thanksgiving)\b/,
    "ramadan": /\b(ramadan|eid|iftar|halal)\b/,
    "new_year": /\b(new year|nye|2026|2027)\b/,
  };

  for (const [season, pattern] of Object.entries(seasonalPatterns)) {
    if (pattern.test(kw)) return season;
  }

  return null;
}

/** Score buyer intent from a keyword (0-100) */
function scoreBuyerIntent(keyword: string): number {
  const kw = keyword.toLowerCase();
  let score = 30; // base intent

  // High-intent signals
  if (/\b(buy|purchase|order|add to cart)\b/.test(kw)) score += 40;
  if (/\b(download|get now|instant)\b/.test(kw)) score += 30;
  if (/\b(price|cost|how much|deal|discount|coupon)\b/.test(kw)) score += 25;
  if (/\b(best|top|recommended)\b/.test(kw)) score += 15;
  if (/\b(template|printable|planner|guide)\b/.test(kw)) score += 10;

  // Low-intent signals
  if (/\b(what is|how to|why|history|meaning)\b/.test(kw)) score -= 15;
  if (/\b(free|diy|homemade)\b/.test(kw)) score -= 20;

  return Math.max(0, Math.min(100, score));
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("Keyword Deduplication", () => {
  it("removes exact duplicate keywords", () => {
    const input = ["london guide", "london guide", "travel art"];
    const result = deduplicateKeywords(input);
    expect(result).toEqual(["london guide", "travel art"]);
  });

  it("removes case-insensitive duplicates, keeping first occurrence", () => {
    const input = ["London Guide", "london guide", "LONDON GUIDE"];
    const result = deduplicateKeywords(input);
    expect(result).toEqual(["London Guide"]);
  });

  it("trims whitespace and ignores empty strings", () => {
    const input = ["  london guide  ", "", "  ", "london guide", "travel art"];
    const result = deduplicateKeywords(input);
    expect(result).toEqual(["london guide", "travel art"]);
  });

  it("preserves order of first appearances", () => {
    const input = ["gamma", "alpha", "beta", "alpha", "gamma"];
    const result = deduplicateKeywords(input);
    expect(result).toEqual(["gamma", "alpha", "beta"]);
  });

  it("returns empty array for all-empty input", () => {
    const input = ["", "  ", ""];
    expect(deduplicateKeywords(input)).toEqual([]);
  });
});

describe("Long-Tail Keyword Generation", () => {
  it("generates 5 long-tail variants from a base keyword", () => {
    const variants = generateLongTailVariants("travel planner", "london");
    expect(variants).toHaveLength(5);
  });

  it("includes destination-qualified variant", () => {
    const variants = generateLongTailVariants("wall art", "maldives");
    expect(variants).toContain("wall art maldives");
  });

  it("includes printable variant", () => {
    const variants = generateLongTailVariants("itinerary", "paris");
    expect(variants).toContain("itinerary printable");
  });

  it("includes digital download variant", () => {
    const variants = generateLongTailVariants("travel poster", "istanbul");
    expect(variants).toContain("travel poster digital download");
  });

  it("returns empty array for empty base keyword", () => {
    const variants = generateLongTailVariants("", "london");
    expect(variants).toEqual([]);
  });
});

describe("Search Intent Classification", () => {
  it("classifies 'buy london travel guide' as transactional", () => {
    expect(classifySearchIntent("buy london travel guide")).toBe("transactional");
  });

  it("classifies 'download itinerary template' as transactional", () => {
    expect(classifySearchIntent("download itinerary template")).toBe("transactional");
  });

  it("classifies 'best london wall art' as commercial", () => {
    expect(classifySearchIntent("best london wall art")).toBe("commercial");
  });

  it("classifies 'luxury travel planner review' as commercial", () => {
    expect(classifySearchIntent("luxury travel planner review")).toBe("commercial");
  });

  it("classifies 'etsy official website login' as navigational", () => {
    expect(classifySearchIntent("etsy official website login")).toBe("navigational");
  });

  it("classifies 'london landmarks' as informational (default)", () => {
    expect(classifySearchIntent("london landmarks")).toBe("informational");
  });

  it("transactional takes priority over commercial when both signals present", () => {
    // 'buy' (transactional) + 'best' (commercial) -> transactional wins
    expect(classifySearchIntent("buy best london guide")).toBe("transactional");
  });
});

describe("Seasonality Detection", () => {
  it("detects summer keywords", () => {
    expect(detectSeasonality("summer beach vacation planner")).toBe("summer");
  });

  it("detects winter/holiday keywords", () => {
    expect(detectSeasonality("christmas london market guide")).toBe("winter");
  });

  it("detects ramadan-specific keywords", () => {
    expect(detectSeasonality("ramadan travel guide halal")).toBe("ramadan");
  });

  it("detects autumn keywords", () => {
    expect(detectSeasonality("fall foliage travel poster")).toBe("autumn");
  });

  it("returns null for non-seasonal keywords", () => {
    expect(detectSeasonality("london travel art poster")).toBeNull();
  });

  it("detects new year keywords", () => {
    expect(detectSeasonality("new year london celebration guide")).toBe("new_year");
  });
});

describe("Buyer Intent Scoring", () => {
  it("scores 'buy london travel guide now' high (>=70)", () => {
    const score = scoreBuyerIntent("buy london travel guide now");
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it("scores pure informational 'what is london' low (<=30)", () => {
    const score = scoreBuyerIntent("what is london");
    expect(score).toBeLessThanOrEqual(30);
  });

  it("scores 'best travel planner template' moderately (>=40)", () => {
    const score = scoreBuyerIntent("best travel planner template");
    // 'best' (+15) + 'template' (+10) + base 30 = 55
    expect(score).toBeGreaterThanOrEqual(40);
  });

  it("scores 'free diy travel guide' low due to 'free' penalty", () => {
    const score = scoreBuyerIntent("free diy travel guide");
    expect(score).toBeLessThan(scoreBuyerIntent("premium travel guide"));
  });

  it("clamps score to 0-100 range", () => {
    const highScore = scoreBuyerIntent("buy purchase order download get deal discount coupon template printable");
    expect(highScore).toBeLessThanOrEqual(100);
    expect(highScore).toBeGreaterThanOrEqual(0);

    const lowScore = scoreBuyerIntent("what is why history free diy homemade");
    expect(lowScore).toBeGreaterThanOrEqual(0);
    expect(lowScore).toBeLessThanOrEqual(100);
  });

  it("returns base score for neutral keyword with no signals", () => {
    const score = scoreBuyerIntent("london skyline poster");
    expect(score).toBe(30); // base only, no modifiers
  });
});

describe("Keyword-to-TrendSignal mapping (getCategoryTrendSignals)", () => {
  it("maps multiple keywords from a single niche into separate TrendSignals", () => {
    const niches: NicheOpportunity[] = [
      {
        niche: "London itinerary printables",
        score: 80,
        rationale: "test",
        keywords: ["london itinerary", "london planner", "uk travel template"],
        competitorCount: 50,
        avgPrice: 999,
        demandSignal: "high",
        ontologyCategory: "itinerary_template",
      },
    ];

    const signals = getCategoryTrendSignals("itinerary_template", niches);
    expect(signals).toHaveLength(3);
    expect(signals.map((s) => s.keyword)).toEqual([
      "london itinerary",
      "london planner",
      "uk travel template",
    ]);
  });

  it("handles niches with empty keywords array", () => {
    const niches: NicheOpportunity[] = [
      {
        niche: "Empty niche",
        score: 50,
        rationale: "test",
        keywords: [],
        competitorCount: 0,
        avgPrice: 0,
        demandSignal: "low",
        ontologyCategory: "wall_art",
      },
    ];
    const signals = getCategoryTrendSignals("wall_art", niches);
    expect(signals).toHaveLength(0);
  });

  it("all ontology categories can be used as filter keys", () => {
    for (const item of PRODUCT_ONTOLOGY) {
      // Should not throw
      const signals = getCategoryTrendSignals(item.category, []);
      expect(signals).toEqual([]);
    }
  });
});
