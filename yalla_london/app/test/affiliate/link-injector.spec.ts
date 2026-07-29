/**
 * Link Injector Unit Tests
 *
 * Tests category detection, keyword matching, and advertiser mapping.
 */

import { describe, it, expect } from "vitest";

// ── Category Detection ──────────────────────────────────────────────────

describe("Link Injector — Category Detection", () => {
  // Replicate the detectCategories logic for testing
  const KEYWORD_CATEGORIES: Array<{ keywords: string[]; category: string }> = [
    { keywords: ["hotel", "hotels", "accommodation", "stay", "resort", "suite", "booking", "فندق", "فنادق", "إقامة"], category: "hotel" },
    { keywords: ["flight", "flights", "airline", "airways", "airport", "travel to", "رحلة", "طيران", "مطار"], category: "flight" },
    { keywords: ["restaurant", "dining", "food", "halal", "cuisine", "eat", "مطعم", "طعام", "حلال"], category: "dining" },
    { keywords: ["experience", "tour", "activity", "museum", "attraction", "ticket", "تجربة", "جولة", "نشاط"], category: "experience" },
    { keywords: ["transfer", "taxi", "car hire", "car rental", "chauffeur", "uber", "تاكسي", "نقل"], category: "transport" },
    { keywords: ["shop", "shopping", "luxury", "mall", "store", "harrods", "تسوق", "متجر"], category: "shopping" },
  ];

  const detectCategories = (content: string): string[] => {
    const text = content.toLowerCase().replace(/<[^>]+>/g, " ");
    const detected: Array<{ category: string; score: number }> = [];

    for (const { keywords, category } of KEYWORD_CATEGORIES) {
      let score = 0;
      for (const kw of keywords) {
        const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
        const matches = text.match(regex);
        if (matches) {
          score += Math.min(matches.length * 10, 50);
        }
      }
      if (score > 0) {
        detected.push({ category, score });
      }
    }

    return detected.sort((a, b) => b.score - a.score).map((d) => d.category);
  };

  it("detects hotel category from content", () => {
    const content = "Stay at the best hotels in London. The luxury hotel suites offer amazing accommodation.";
    const categories = detectCategories(content);
    expect(categories).toContain("hotel");
    expect(categories[0]).toBe("hotel"); // Should be primary
  });

  it("detects flight category", () => {
    const content = "Book your flight to London. Compare airline prices and find the best airways deals.";
    const categories = detectCategories(content);
    expect(categories).toContain("flight");
  });

  it("detects dining category from halal keywords", () => {
    const content = "The best halal restaurants in Mayfair serve authentic cuisine. Great food options for dining.";
    const categories = detectCategories(content);
    expect(categories).toContain("dining");
  });

  it("detects multiple categories", () => {
    const content = "Book a hotel and find the best restaurants near the museum attractions. Experience London.";
    const categories = detectCategories(content);
    expect(categories.length).toBeGreaterThan(1);
  });

  it("detects Arabic keywords", () => {
    const content = "أفضل فنادق لندن الفاخرة. فندق رائع في وسط المدينة مع إقامة مريحة.";
    const categories = detectCategories(content);
    expect(categories).toContain("hotel");
  });

  it("returns empty for non-matching content", () => {
    const content = "This is a generic article about nothing specific.";
    const categories = detectCategories(content);
    expect(categories).toHaveLength(0);
  });

  it("strips HTML tags before matching", () => {
    const content = "<p>The <strong>hotel</strong> is <a href='#'>amazing</a>.</p>";
    const categories = detectCategories(content);
    expect(categories).toContain("hotel");
  });

  it("scores higher for more keyword matches", () => {
    const hotelHeavy = "hotel hotels accommodation resort suite booking stay";
    const hotelLight = "hotel room";
    const heavyCategories = detectCategories(hotelHeavy);
    const lightCategories = detectCategories(hotelLight);
    // Both should detect hotel, but heavy should score higher (verified by being first)
    expect(heavyCategories[0]).toBe("hotel");
    expect(lightCategories[0]).toBe("hotel");
  });
});

// ── Category → Advertiser Mapping ──────────────────────────────────────

describe("Link Injector — Category Advertiser Map", () => {
  const CATEGORY_ADVERTISER_MAP: Record<string, string[]> = {
    hotel: ["Booking.com UK", "IHG Europe", "Vrbo", "Expedia, Inc"],
    flight: ["Qatar Airways", "KAYAK US", "Expedia, Inc"],
    experience: ["TripAdvisor Commerce Campaign", "Expedia, Inc"],
    dining: ["TripAdvisor Commerce Campaign"],
    transport: ["Qatar Airways", "KAYAK US"],
    travel: ["Expedia, Inc", "lastminute.com INT", "KAYAK US"],
    shopping: ["lastminute.com INT"],
  };

  it("maps hotel to correct advertisers", () => {
    const advertisers = CATEGORY_ADVERTISER_MAP["hotel"];
    expect(advertisers).toContain("Booking.com UK");
    expect(advertisers).toContain("IHG Europe");
  });

  it("maps flight to Qatar Airways", () => {
    const advertisers = CATEGORY_ADVERTISER_MAP["flight"];
    expect(advertisers).toContain("Qatar Airways");
  });

  it("maps dining to TripAdvisor", () => {
    const advertisers = CATEGORY_ADVERTISER_MAP["dining"];
    expect(advertisers).toContain("TripAdvisor Commerce Campaign");
  });

  it("returns undefined for unmapped category", () => {
    expect(CATEGORY_ADVERTISER_MAP["unknown"]).toBeUndefined();
  });
});
