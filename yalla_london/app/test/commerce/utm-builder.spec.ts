/**
 * Unit tests for UTM engine — lib/commerce/utm-engine.ts
 *
 * Tests UTM URL construction, coupon code generation, URL validation,
 * campaign slug generation, and special character handling.
 */

import { describe, it, expect } from "vitest";
import {
  buildUtmUrl,
  generateUtmParams,
  generateCouponCode,
  isValidCouponCode,
  validateUtmUrl,
  generateCampaignSlug,
} from "../../lib/commerce/utm-engine";

// ─── buildUtmUrl ─────────────────────────────────────────────────────

describe("buildUtmUrl", () => {
  it("appends all 5 UTM params when all are provided", () => {
    const url = buildUtmUrl("https://yalla-london.com/shop/guide", {
      source: "instagram",
      medium: "social",
      campaign: "launch-london-guide",
      content: "variant-a",
      term: "london travel",
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get("utm_source")).toBe("instagram");
    expect(parsed.searchParams.get("utm_medium")).toBe("social");
    expect(parsed.searchParams.get("utm_campaign")).toBe("launch-london-guide");
    expect(parsed.searchParams.get("utm_content")).toBe("variant-a");
    expect(parsed.searchParams.get("utm_term")).toBe("london travel");
  });

  it("only appends required params when content and term are omitted", () => {
    const url = buildUtmUrl("https://yalla-london.com/shop", {
      source: "email",
      medium: "email",
      campaign: "newsletter-feb",
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get("utm_source")).toBe("email");
    expect(parsed.searchParams.get("utm_medium")).toBe("email");
    expect(parsed.searchParams.get("utm_campaign")).toBe("newsletter-feb");
    expect(parsed.searchParams.has("utm_content")).toBe(false);
    expect(parsed.searchParams.has("utm_term")).toBe(false);
  });

  it("preserves existing query parameters on the base URL", () => {
    const url = buildUtmUrl("https://yalla-london.com/shop?category=guides", {
      source: "blog",
      medium: "referral",
      campaign: "cross-sell",
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get("category")).toBe("guides");
    expect(parsed.searchParams.get("utm_source")).toBe("blog");
  });

  it("encodes special characters in UTM parameter values", () => {
    const url = buildUtmUrl("https://yalla-london.com/shop", {
      source: "face book",
      medium: "social & referral",
      campaign: "test campaign #1",
    });

    // URL constructor should encode spaces and special chars
    expect(url).toContain("utm_source=face+book");
    expect(url).toContain("utm_campaign=test+campaign+%231");
  });

  it("throws for invalid base URL", () => {
    expect(() =>
      buildUtmUrl("not-a-url", {
        source: "test",
        medium: "test",
        campaign: "test",
      }),
    ).toThrow();
  });
});

// ─── generateUtmParams ──────────────────────────────────────────────

describe("generateUtmParams", () => {
  it("maps 'social' channel to instagram source and social medium", () => {
    const params = generateUtmParams("my-campaign", "social");
    expect(params.source).toBe("instagram");
    expect(params.medium).toBe("social");
    expect(params.campaign).toBe("my-campaign");
  });

  it("maps 'email' channel to email source and email medium", () => {
    const params = generateUtmParams("launch", "email");
    expect(params.source).toBe("email");
    expect(params.medium).toBe("email");
  });

  it("maps 'blog' channel to blog source and referral medium", () => {
    const params = generateUtmParams("launch", "blog");
    expect(params.source).toBe("blog");
    expect(params.medium).toBe("referral");
  });

  it("maps 'etsy' channel to etsy source and marketplace medium", () => {
    const params = generateUtmParams("launch", "etsy");
    expect(params.source).toBe("etsy");
    expect(params.medium).toBe("marketplace");
  });

  it("maps 'pinterest' channel to pinterest source and social medium", () => {
    const params = generateUtmParams("launch", "pinterest");
    expect(params.source).toBe("pinterest");
    expect(params.medium).toBe("social");
  });

  it("includes variant as content param when provided", () => {
    const params = generateUtmParams("launch", "social", "hero-banner");
    expect(params.content).toBe("hero-banner");
  });

  it("omits content param when variant is not provided", () => {
    const params = generateUtmParams("launch", "social");
    expect(params.content).toBeUndefined();
  });
});

// ─── generateCouponCode ──────────────────────────────────────────────

describe("generateCouponCode", () => {
  it("follows YALLA-{SITE}-{RANDOM6} format", () => {
    const code = generateCouponCode("yalla-london");
    expect(code).toMatch(/^YALLA-[A-Z0-9]{1,6}-[A-Z0-9]{6}$/);
  });

  it("strips non-alphanumeric characters from site slug", () => {
    const code = generateCouponCode("yalla-london");
    // "yalla-london" -> strip non-alphanumeric -> "yallalondon" -> uppercase -> "YALLALONDON" -> slice(0,6) -> "YALLAL"
    expect(code.startsWith("YALLA-YALLAL-")).toBe(true);
  });

  it("generates unique codes on consecutive calls", () => {
    const code1 = generateCouponCode("yalla-london");
    const code2 = generateCouponCode("yalla-london");
    // Random portion should differ (astronomically unlikely to collide)
    expect(code1).not.toBe(code2);
  });

  it("handles short siteId", () => {
    const code = generateCouponCode("ab");
    expect(code).toMatch(/^YALLA-AB-[A-Z0-9]{6}$/);
  });

  it("handles siteId with only special characters", () => {
    const code = generateCouponCode("---");
    // Strip non-alphanumeric -> empty, slice(0,6) -> ""
    expect(code).toMatch(/^YALLA--[A-Z0-9]{6}$/);
  });

  it("excludes ambiguous characters (O, 0, 1, I) from random portion", () => {
    // The charset is "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" — no O, 0, 1, I
    // L is intentionally included (only O/0/1/I excluded for readability)
    // Generate many codes and check the random portion
    for (let i = 0; i < 20; i++) {
      const code = generateCouponCode("test");
      const randomPart = code.split("-")[2];
      expect(randomPart).not.toMatch(/[O01I]/);
    }
  });
});

// ─── isValidCouponCode ───────────────────────────────────────────────

describe("isValidCouponCode", () => {
  it("accepts valid coupon code", () => {
    expect(isValidCouponCode("YALLA-LONDON-ABC234")).toBe(true);
  });

  it("accepts code with short site slug (1 char)", () => {
    expect(isValidCouponCode("YALLA-A-ABC234")).toBe(true);
  });

  it("rejects code missing YALLA prefix", () => {
    expect(isValidCouponCode("HELLO-LONDON-ABC234")).toBe(false);
  });

  it("rejects code with random part shorter than 6 chars", () => {
    expect(isValidCouponCode("YALLA-LONDON-ABC23")).toBe(false);
  });

  it("rejects code with random part longer than 6 chars", () => {
    expect(isValidCouponCode("YALLA-LONDON-ABC2345")).toBe(false);
  });

  it("rejects lowercase codes", () => {
    expect(isValidCouponCode("yalla-london-abc234")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidCouponCode("")).toBe(false);
  });
});

// ─── validateUtmUrl ──────────────────────────────────────────────────

describe("validateUtmUrl", () => {
  it("returns valid=true when all 3 required UTM params are present", () => {
    const result = validateUtmUrl(
      "https://yalla-london.com?utm_source=email&utm_medium=email&utm_campaign=test",
    );
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("returns issues when utm_source is missing", () => {
    const result = validateUtmUrl(
      "https://yalla-london.com?utm_medium=email&utm_campaign=test",
    );
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.stringContaining("utm_source"));
  });

  it("returns issues when utm_medium is missing", () => {
    const result = validateUtmUrl(
      "https://yalla-london.com?utm_source=email&utm_campaign=test",
    );
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.stringContaining("utm_medium"));
  });

  it("returns issues when utm_campaign is missing", () => {
    const result = validateUtmUrl(
      "https://yalla-london.com?utm_source=email&utm_medium=email",
    );
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.stringContaining("utm_campaign"));
  });

  it("returns 'Invalid URL format' for malformed URLs", () => {
    const result = validateUtmUrl("not a valid url");
    expect(result.valid).toBe(false);
    expect(result.issues).toContain("Invalid URL format");
  });

  it("extracts optional content and term params when present", () => {
    const result = validateUtmUrl(
      "https://example.com?utm_source=x&utm_medium=y&utm_campaign=z&utm_content=hero&utm_term=travel",
    );
    expect(result.valid).toBe(true);
    expect(result.params.content).toBe("hero");
    expect(result.params.term).toBe("travel");
  });

  it("returns undefined for optional params when absent", () => {
    const result = validateUtmUrl(
      "https://example.com?utm_source=x&utm_medium=y&utm_campaign=z",
    );
    expect(result.params.content).toBeUndefined();
    expect(result.params.term).toBeUndefined();
  });
});

// ─── generateCampaignSlug ────────────────────────────────────────────

describe("generateCampaignSlug", () => {
  it("converts name to lowercase URL-safe slug", () => {
    expect(generateCampaignSlug("London Travel Guide Launch")).toBe(
      "london-travel-guide-launch",
    );
  });

  it("replaces special characters with hyphens", () => {
    expect(generateCampaignSlug("Guide #1 (Premium)")).toBe("guide-1-premium");
  });

  it("removes leading and trailing hyphens", () => {
    expect(generateCampaignSlug("---Launch Event---")).toBe("launch-event");
  });

  it("truncates slug to maximum 50 characters", () => {
    const longName = "This is a very long campaign name that exceeds fifty characters and should be truncated";
    const slug = generateCampaignSlug(longName);
    expect(slug.length).toBeLessThanOrEqual(50);
  });

  it("collapses consecutive special characters into single hyphen", () => {
    expect(generateCampaignSlug("London   &&&   Travel")).toBe("london-travel");
  });

  it("handles empty string", () => {
    expect(generateCampaignSlug("")).toBe("");
  });
});

// ─── Integration: buildUtmUrl + generateUtmParams ────────────────────

describe("UTM round-trip: generate params then build URL then validate", () => {
  it("produces a valid UTM URL from generated params", () => {
    const params = generateUtmParams("summer-launch-2026", "social", "hero-v2");
    const url = buildUtmUrl("https://yalla-london.com/shop/guide", params);
    const validation = validateUtmUrl(url);

    expect(validation.valid).toBe(true);
    expect(validation.params.source).toBe("instagram");
    expect(validation.params.medium).toBe("social");
    expect(validation.params.campaign).toBe("summer-launch-2026");
    expect(validation.params.content).toBe("hero-v2");
  });
});
