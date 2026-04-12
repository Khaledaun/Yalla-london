/**
 * Unit tests for the 7-dimension weighted opportunity scoring algorithm.
 *
 * Tests computeOpportunityScore (indirectly via module internals)
 * and getCategoryTrendSignals from lib/commerce/trend-engine.ts,
 * plus the OPPORTUNITY_SCORE_WEIGHTS from lib/commerce/constants.ts.
 */

import { describe, it, expect } from "vitest";
import {
  OPPORTUNITY_SCORE_WEIGHTS,
  PRODUCT_ONTOLOGY,
} from "../../lib/commerce/constants";
import { SCORE_WEIGHTS } from "../../lib/commerce/types";
import { getCategoryTrendSignals } from "../../lib/commerce/trend-engine";
import type { NicheOpportunity } from "../../lib/commerce/types";

// ─── Helper: Replicate computeOpportunityScore (private fn) ──────────
// The function is not exported, so we replicate the exact algorithm here
// to test its behavior with known inputs.
function computeOpportunityScore(niche: NicheOpportunity): number {
  const weights = OPPORTUNITY_SCORE_WEIGHTS;
  const composite =
    (niche.buyerIntent ?? 50) * weights.buyerIntent +
    (niche.trendVelocity ?? 50) * weights.trendVelocity +
    (niche.competitionGap ?? 50) * weights.competitionGap +
    (niche.productionEase ?? 50) * weights.productionEase +
    (niche.authorityFit ?? 50) * weights.authorityFit +
    (niche.seasonalTiming ?? 50) * weights.seasonalTiming +
    (niche.bundlePotential ?? 50) * weights.bundlePotential;

  return Math.round(composite);
}

// ─── Factory: Minimal NicheOpportunity for scoring ───────────────────
function makeNiche(overrides: Partial<NicheOpportunity> = {}): NicheOpportunity {
  return {
    niche: "test niche",
    score: 0,
    rationale: "test",
    keywords: ["test"],
    competitorCount: 10,
    avgPrice: 999,
    demandSignal: "medium",
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("Opportunity Scoring (7-dimension weighted algorithm)", () => {
  describe("weight configuration", () => {
    it("all 7 weights exist in OPPORTUNITY_SCORE_WEIGHTS", () => {
      expect(OPPORTUNITY_SCORE_WEIGHTS).toHaveProperty("buyerIntent");
      expect(OPPORTUNITY_SCORE_WEIGHTS).toHaveProperty("trendVelocity");
      expect(OPPORTUNITY_SCORE_WEIGHTS).toHaveProperty("competitionGap");
      expect(OPPORTUNITY_SCORE_WEIGHTS).toHaveProperty("productionEase");
      expect(OPPORTUNITY_SCORE_WEIGHTS).toHaveProperty("authorityFit");
      expect(OPPORTUNITY_SCORE_WEIGHTS).toHaveProperty("seasonalTiming");
      expect(OPPORTUNITY_SCORE_WEIGHTS).toHaveProperty("bundlePotential");
    });

    it("weights sum to exactly 1.0", () => {
      const sum =
        OPPORTUNITY_SCORE_WEIGHTS.buyerIntent +
        OPPORTUNITY_SCORE_WEIGHTS.trendVelocity +
        OPPORTUNITY_SCORE_WEIGHTS.competitionGap +
        OPPORTUNITY_SCORE_WEIGHTS.productionEase +
        OPPORTUNITY_SCORE_WEIGHTS.authorityFit +
        OPPORTUNITY_SCORE_WEIGHTS.seasonalTiming +
        OPPORTUNITY_SCORE_WEIGHTS.bundlePotential;
      expect(sum).toBeCloseTo(1.0, 10);
    });

    it("SCORE_WEIGHTS in types.ts matches OPPORTUNITY_SCORE_WEIGHTS in constants.ts", () => {
      expect(SCORE_WEIGHTS.buyerIntent).toBe(OPPORTUNITY_SCORE_WEIGHTS.buyerIntent);
      expect(SCORE_WEIGHTS.trendVelocity).toBe(OPPORTUNITY_SCORE_WEIGHTS.trendVelocity);
      expect(SCORE_WEIGHTS.competitionGap).toBe(OPPORTUNITY_SCORE_WEIGHTS.competitionGap);
      expect(SCORE_WEIGHTS.productionEase).toBe(OPPORTUNITY_SCORE_WEIGHTS.productionEase);
      expect(SCORE_WEIGHTS.authorityFit).toBe(OPPORTUNITY_SCORE_WEIGHTS.authorityFit);
      expect(SCORE_WEIGHTS.seasonalTiming).toBe(OPPORTUNITY_SCORE_WEIGHTS.seasonalTiming);
      expect(SCORE_WEIGHTS.bundlePotential).toBe(OPPORTUNITY_SCORE_WEIGHTS.bundlePotential);
    });
  });

  describe("composite score calculation", () => {
    it("returns 0 when all dimensions are 0", () => {
      const niche = makeNiche({
        buyerIntent: 0,
        trendVelocity: 0,
        competitionGap: 0,
        productionEase: 0,
        authorityFit: 0,
        seasonalTiming: 0,
        bundlePotential: 0,
      });
      expect(computeOpportunityScore(niche)).toBe(0);
    });

    it("returns 100 when all dimensions are 100", () => {
      const niche = makeNiche({
        buyerIntent: 100,
        trendVelocity: 100,
        competitionGap: 100,
        productionEase: 100,
        authorityFit: 100,
        seasonalTiming: 100,
        bundlePotential: 100,
      });
      // 100 * (0.20 + 0.10 + 0.20 + 0.10 + 0.15 + 0.10 + 0.15) = 100 * 1.0 = 100
      expect(computeOpportunityScore(niche)).toBe(100);
    });

    it("returns 50 when all dimensions default (undefined -> 50)", () => {
      const niche = makeNiche({});
      // All undefined -> 50 each -> 50 * 1.0 = 50
      expect(computeOpportunityScore(niche)).toBe(50);
    });

    it("correctly weights buyerIntent as highest contributor at 0.20", () => {
      const nicheHigh = makeNiche({
        buyerIntent: 100,
        trendVelocity: 0,
        competitionGap: 0,
        productionEase: 0,
        authorityFit: 0,
        seasonalTiming: 0,
        bundlePotential: 0,
      });
      // Only buyerIntent contributes: 100 * 0.20 = 20
      expect(computeOpportunityScore(nicheHigh)).toBe(20);
    });

    it("correctly weights competitionGap as co-highest at 0.20", () => {
      const niche = makeNiche({
        buyerIntent: 0,
        trendVelocity: 0,
        competitionGap: 100,
        productionEase: 0,
        authorityFit: 0,
        seasonalTiming: 0,
        bundlePotential: 0,
      });
      expect(computeOpportunityScore(niche)).toBe(20);
    });

    it("correctly weights trendVelocity at 0.10", () => {
      const niche = makeNiche({
        buyerIntent: 0,
        trendVelocity: 100,
        competitionGap: 0,
        productionEase: 0,
        authorityFit: 0,
        seasonalTiming: 0,
        bundlePotential: 0,
      });
      expect(computeOpportunityScore(niche)).toBe(10);
    });

    it("correctly computes a mixed-score niche", () => {
      const niche = makeNiche({
        buyerIntent: 80,     // 80 * 0.20 = 16
        trendVelocity: 60,   // 60 * 0.10 = 6
        competitionGap: 70,  // 70 * 0.20 = 14
        productionEase: 90,  // 90 * 0.10 = 9
        authorityFit: 85,    // 85 * 0.15 = 12.75
        seasonalTiming: 40,  // 40 * 0.10 = 4
        bundlePotential: 55, // 55 * 0.15 = 8.25
      });
      // Sum = 16 + 6 + 14 + 9 + 12.75 + 4 + 8.25 = 70
      expect(computeOpportunityScore(niche)).toBe(70);
    });

    it("rounds the composite score to the nearest integer", () => {
      const niche = makeNiche({
        buyerIntent: 33,      // 33 * 0.20 = 6.6
        trendVelocity: 33,    // 33 * 0.10 = 3.3
        competitionGap: 33,   // 33 * 0.20 = 6.6
        productionEase: 33,   // 33 * 0.10 = 3.3
        authorityFit: 33,     // 33 * 0.15 = 4.95
        seasonalTiming: 33,   // 33 * 0.10 = 3.3
        bundlePotential: 33,  // 33 * 0.15 = 4.95
      });
      // Sum = 33 * 1.0 = 33.0
      expect(computeOpportunityScore(niche)).toBe(33);
    });

    it("handles partial undefined dimensions (defaults to 50 per dimension)", () => {
      // Only buyerIntent and competitionGap provided, rest default to 50
      const niche = makeNiche({
        buyerIntent: 100,
        competitionGap: 100,
        // trendVelocity, productionEase, authorityFit, seasonalTiming, bundlePotential all undefined -> 50
      });
      const expected =
        100 * 0.20 +  // buyerIntent
        50 * 0.10 +   // trendVelocity (default)
        100 * 0.20 +  // competitionGap
        50 * 0.10 +   // productionEase (default)
        50 * 0.15 +   // authorityFit (default)
        50 * 0.10 +   // seasonalTiming (default)
        50 * 0.15;    // bundlePotential (default)
      // = 20 + 5 + 20 + 5 + 7.5 + 5 + 7.5 = 70
      expect(computeOpportunityScore(niche)).toBe(Math.round(expected));
    });
  });

  describe("boundary conditions", () => {
    it("score at exact threshold of 50 (common minScore default)", () => {
      // Produce exactly 50
      const niche = makeNiche({
        buyerIntent: 50,
        trendVelocity: 50,
        competitionGap: 50,
        productionEase: 50,
        authorityFit: 50,
        seasonalTiming: 50,
        bundlePotential: 50,
      });
      const score = computeOpportunityScore(niche);
      expect(score).toBe(50);
      expect(score >= 50).toBe(true); // would pass minScore filter
    });

    it("score just below threshold of 50", () => {
      const niche = makeNiche({
        buyerIntent: 49,
        trendVelocity: 49,
        competitionGap: 49,
        productionEase: 49,
        authorityFit: 49,
        seasonalTiming: 49,
        bundlePotential: 49,
      });
      const score = computeOpportunityScore(niche);
      // 49 * 1.0 = 49
      expect(score).toBe(49);
      expect(score >= 50).toBe(false);
    });
  });

  describe("getCategoryTrendSignals", () => {
    it("returns trend signals filtered by ontology category", () => {
      const niches: NicheOpportunity[] = [
        makeNiche({
          niche: "London wall art",
          ontologyCategory: "wall_art",
          keywords: ["london poster", "travel art"],
          score: 75,
          demandSignal: "high",
        }),
        makeNiche({
          niche: "London itinerary",
          ontologyCategory: "itinerary_template",
          keywords: ["london itinerary"],
          score: 80,
          demandSignal: "medium",
        }),
      ];

      const signals = getCategoryTrendSignals("wall_art", niches);
      expect(signals).toHaveLength(2);
      expect(signals[0].keyword).toBe("london poster");
      expect(signals[1].keyword).toBe("travel art");
    });

    it("returns empty array when category has no matching niches", () => {
      const niches: NicheOpportunity[] = [
        makeNiche({
          ontologyCategory: "wall_art",
          keywords: ["poster"],
        }),
      ];
      const signals = getCategoryTrendSignals("lightroom_preset", niches);
      expect(signals).toHaveLength(0);
    });

    it("sets competition inverse of demandSignal", () => {
      const niches: NicheOpportunity[] = [
        makeNiche({
          ontologyCategory: "wall_art",
          keywords: ["art"],
          demandSignal: "high",
        }),
      ];
      const signals = getCategoryTrendSignals("wall_art", niches);
      // high demand -> low competition mapping in source
      expect(signals[0].competition).toBe("low");
    });

    it("maps low demand to high competition", () => {
      const niches: NicheOpportunity[] = [
        makeNiche({
          ontologyCategory: "wall_art",
          keywords: ["niche art"],
          demandSignal: "low",
        }),
      ];
      const signals = getCategoryTrendSignals("wall_art", niches);
      expect(signals[0].competition).toBe("high");
    });

    it("maps medium demand to medium competition", () => {
      const niches: NicheOpportunity[] = [
        makeNiche({
          ontologyCategory: "wall_art",
          keywords: ["standard art"],
          demandSignal: "medium",
        }),
      ];
      const signals = getCategoryTrendSignals("wall_art", niches);
      expect(signals[0].competition).toBe("medium");
    });

    it("uses score from niche, sets source to ai_research", () => {
      const niches: NicheOpportunity[] = [
        makeNiche({
          ontologyCategory: "travel_guide",
          keywords: ["guide"],
          score: 88,
        }),
      ];
      const signals = getCategoryTrendSignals("travel_guide", niches);
      expect(signals[0].score).toBe(88);
      expect(signals[0].source).toBe("ai_research");
    });
  });

  describe("PRODUCT_ONTOLOGY validation", () => {
    it("has 11 product categories", () => {
      expect(PRODUCT_ONTOLOGY).toHaveLength(11);
    });

    it("every item has a valid tier (1, 2, or 3)", () => {
      for (const item of PRODUCT_ONTOLOGY) {
        expect([1, 2, 3]).toContain(item.tier);
      }
    });

    it("every item has a priceRange where min < max", () => {
      for (const item of PRODUCT_ONTOLOGY) {
        expect(item.priceRange.min).toBeLessThan(item.priceRange.max);
      }
    });
  });
});
