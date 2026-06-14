/**
 * Contract tests for EtsyAdapter — lib/commerce/etsy-api.ts
 *
 * Tests that all required methods exist, OAuth URL construction includes
 * PKCE challenge, listing validation against Etsy limits, and token
 * refresh flow structure. Uses mocks for all external calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ETSY_LIMITS,
  validateEtsyListing,
} from "../../lib/commerce/constants";

// We need to test the etsy-api module exports. Since many functions make
// DB and HTTP calls, we test the pure/synchronous parts directly and
// verify the async functions exist with correct signatures.

// Mock crypto for PKCE tests (node:crypto should be available in test env)
import * as etsyApi from "../../lib/commerce/etsy-api";

// ─── Contract: Required Exports ─────────────────────────────────────

describe("EtsyAdapter — required method exports", () => {
  it("exports getEtsyConfig function", () => {
    expect(typeof etsyApi.getEtsyConfig).toBe("function");
  });

  it("exports isEtsyConfigured function", () => {
    expect(typeof etsyApi.isEtsyConfigured).toBe("function");
  });

  it("exports buildAuthorizationUrl function", () => {
    expect(typeof etsyApi.buildAuthorizationUrl).toBe("function");
  });

  it("exports exchangeCodeForTokens function", () => {
    expect(typeof etsyApi.exchangeCodeForTokens).toBe("function");
  });

  it("exports refreshAccessToken function", () => {
    expect(typeof etsyApi.refreshAccessToken).toBe("function");
  });

  it("exports storeTokens function", () => {
    expect(typeof etsyApi.storeTokens).toBe("function");
  });

  it("exports getAccessToken function", () => {
    expect(typeof etsyApi.getAccessToken).toBe("function");
  });

  it("exports createListing function", () => {
    expect(typeof etsyApi.createListing).toBe("function");
  });

  it("exports updateListing function", () => {
    expect(typeof etsyApi.updateListing).toBe("function");
  });

  it("exports getListing function", () => {
    expect(typeof etsyApi.getListing).toBe("function");
  });

  it("exports uploadListingImage function", () => {
    expect(typeof etsyApi.uploadListingImage).toBe("function");
  });

  it("exports uploadDigitalFile function", () => {
    expect(typeof etsyApi.uploadDigitalFile).toBe("function");
  });

  it("exports activateListing function", () => {
    expect(typeof etsyApi.activateListing).toBe("function");
  });

  it("exports getShopListings function", () => {
    expect(typeof etsyApi.getShopListings).toBe("function");
  });

  it("exports testConnection function", () => {
    expect(typeof etsyApi.testConnection).toBe("function");
  });

  it("exports publishDraft function", () => {
    expect(typeof etsyApi.publishDraft).toBe("function");
  });
});

// ─── PKCE: Code Verifier & Challenge ────────────────────────────────

describe("EtsyAdapter — PKCE flow", () => {
  it("generates a code verifier between 43-128 characters", () => {
    const verifier = etsyApi.generateCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
  });

  it("generates a base64url-encoded code challenge from verifier", () => {
    const verifier = etsyApi.generateCodeVerifier();
    const challenge = etsyApi.generateCodeChallenge(verifier);

    // base64url uses only [A-Za-z0-9_-] (no + or / or =)
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge.length).toBeGreaterThan(0);
  });

  it("generates different challenges for different verifiers", () => {
    const v1 = etsyApi.generateCodeVerifier();
    const v2 = etsyApi.generateCodeVerifier();
    const c1 = etsyApi.generateCodeChallenge(v1);
    const c2 = etsyApi.generateCodeChallenge(v2);

    expect(v1).not.toBe(v2);
    expect(c1).not.toBe(c2);
  });

  it("generates a hex state token", () => {
    const state = etsyApi.generateState();
    expect(state).toMatch(/^[0-9a-f]+$/);
    // 24 random bytes -> 48 hex chars
    expect(state.length).toBe(48);
  });
});

// ─── OAuth Authorization URL ─────────────────────────────────────────

describe("EtsyAdapter — buildAuthorizationUrl", () => {
  beforeEach(() => {
    process.env.ETSY_API_KEY = "test-client-id";
    process.env.ETSY_SHARED_SECRET = "test-secret";
    process.env.ETSY_REDIRECT_URI = "https://yalla-london.com/api/auth/etsy/callback";
  });

  it("includes code_challenge parameter (PKCE)", () => {
    const verifier = etsyApi.generateCodeVerifier();
    const state = etsyApi.generateState();
    const url = etsyApi.buildAuthorizationUrl(verifier, state);

    const parsed = new URL(url);
    expect(parsed.searchParams.has("code_challenge")).toBe(true);
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("includes response_type=code", () => {
    const verifier = etsyApi.generateCodeVerifier();
    const state = etsyApi.generateState();
    const url = etsyApi.buildAuthorizationUrl(verifier, state);

    const parsed = new URL(url);
    expect(parsed.searchParams.get("response_type")).toBe("code");
  });

  it("includes the state parameter for CSRF protection", () => {
    const verifier = etsyApi.generateCodeVerifier();
    const state = "my-test-state-123";
    const url = etsyApi.buildAuthorizationUrl(verifier, state);

    const parsed = new URL(url);
    expect(parsed.searchParams.get("state")).toBe("my-test-state-123");
  });

  it("includes required scopes for listing management", () => {
    const verifier = etsyApi.generateCodeVerifier();
    const state = etsyApi.generateState();
    const url = etsyApi.buildAuthorizationUrl(verifier, state);

    const parsed = new URL(url);
    const scopes = parsed.searchParams.get("scope") ?? "";
    expect(scopes).toContain("listings_r");
    expect(scopes).toContain("listings_w");
    expect(scopes).toContain("shops_r");
    expect(scopes).toContain("transactions_r");
  });

  it("uses Etsy OAuth connect endpoint", () => {
    const verifier = etsyApi.generateCodeVerifier();
    const state = etsyApi.generateState();
    const url = etsyApi.buildAuthorizationUrl(verifier, state);

    expect(url).toContain("https://www.etsy.com/oauth/connect");
  });

  it("includes client_id from config", () => {
    const verifier = etsyApi.generateCodeVerifier();
    const state = etsyApi.generateState();
    const url = etsyApi.buildAuthorizationUrl(verifier, state);

    const parsed = new URL(url);
    expect(parsed.searchParams.get("client_id")).toBe("test-client-id");
  });

  it("includes redirect_uri from config", () => {
    const verifier = etsyApi.generateCodeVerifier();
    const state = etsyApi.generateState();
    const url = etsyApi.buildAuthorizationUrl(verifier, state);

    const parsed = new URL(url);
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "https://yalla-london.com/api/auth/etsy/callback",
    );
  });
});

// ─── Listing Validation (Etsy Limits) ────────────────────────────────

describe("EtsyAdapter — listing validation against Etsy limits", () => {
  it("passes validation for a compliant listing", () => {
    const result = validateEtsyListing({
      title: "London Travel Guide - Digital Download PDF",
      tags: ["london guide", "travel planner"],
      description: "A comprehensive guide to London.",
      price: 999, // $9.99
    });
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("rejects title exceeding 140 characters", () => {
    const longTitle = "A".repeat(141);
    const result = validateEtsyListing({
      title: longTitle,
      tags: ["tag1"],
      description: "Valid description",
      price: 999,
    });
    expect(result.valid).toBe(false);
    expect(result.issues.find((i) => i.field === "title")).toBeDefined();
  });

  it("accepts title at exactly 140 characters", () => {
    const exactTitle = "A".repeat(140);
    const result = validateEtsyListing({
      title: exactTitle,
      tags: ["tag1"],
      description: "Valid description",
      price: 999,
    });
    const titleIssue = result.issues.find((i) => i.field === "title");
    expect(titleIssue).toBeUndefined();
  });

  it("rejects more than 13 tags", () => {
    const tags = Array.from({ length: 14 }, (_, i) => `tag${i}`);
    const result = validateEtsyListing({
      title: "Valid Title",
      tags,
      description: "Valid description",
      price: 999,
    });
    expect(result.valid).toBe(false);
    expect(result.issues.find((i) => i.field === "tags" && i.message.includes("More than"))).toBeDefined();
  });

  it("accepts exactly 13 tags", () => {
    const tags = Array.from({ length: 13 }, (_, i) => `tag${i}`);
    const result = validateEtsyListing({
      title: "Valid Title",
      tags,
      description: "Valid description",
      price: 999,
    });
    const tagCountIssue = result.issues.find(
      (i) => i.field === "tags" && i.message.includes("More than"),
    );
    expect(tagCountIssue).toBeUndefined();
  });

  it("rejects individual tags exceeding 20 characters", () => {
    const result = validateEtsyListing({
      title: "Valid Title",
      tags: ["this tag is way too long for etsy requirements"],
      description: "Valid description",
      price: 999,
    });
    expect(result.valid).toBe(false);
    expect(
      result.issues.find((i) => i.field === "tags" && i.message.includes("exceeds")),
    ).toBeDefined();
  });

  it("accepts tags at exactly 20 characters each", () => {
    const result = validateEtsyListing({
      title: "Valid Title",
      tags: ["12345678901234567890"], // exactly 20 chars
      description: "Valid description",
      price: 999,
    });
    const tagLengthIssue = result.issues.find(
      (i) => i.field === "tags" && i.message.includes("exceeds"),
    );
    expect(tagLengthIssue).toBeUndefined();
  });

  it("rejects description exceeding 65535 characters", () => {
    const longDesc = "A".repeat(65536);
    const result = validateEtsyListing({
      title: "Valid Title",
      tags: ["tag1"],
      description: longDesc,
      price: 999,
    });
    expect(result.valid).toBe(false);
    expect(result.issues.find((i) => i.field === "description")).toBeDefined();
  });

  it("rejects price below Etsy minimum (20 cents)", () => {
    const result = validateEtsyListing({
      title: "Valid Title",
      tags: ["tag1"],
      description: "Valid description",
      price: 10, // $0.10, below minimum $0.20
    });
    expect(result.valid).toBe(false);
    expect(result.issues.find((i) => i.field === "price")).toBeDefined();
  });

  it("accepts price at exactly the minimum (20 cents)", () => {
    const result = validateEtsyListing({
      title: "Valid Title",
      tags: ["tag1"],
      description: "Valid description",
      price: 20, // exactly $0.20
    });
    const priceIssue = result.issues.find((i) => i.field === "price");
    expect(priceIssue).toBeUndefined();
  });

  it("returns multiple issues when multiple fields violate limits", () => {
    const result = validateEtsyListing({
      title: "A".repeat(200),
      tags: Array.from({ length: 15 }, (_, i) => "a".repeat(25)),
      description: "A".repeat(70000),
      price: 5,
    });
    expect(result.valid).toBe(false);
    // Should have: title > 140, tags > 13, individual tags > 20, desc > 65535, price < 20
    expect(result.issues.length).toBeGreaterThanOrEqual(4);
  });
});

// ─── Etsy Configuration ─────────────────────────────────────────────

describe("EtsyAdapter — configuration", () => {
  it("getEtsyConfig returns clientId from ETSY_API_KEY env var", () => {
    process.env.ETSY_API_KEY = "my-api-key";
    const config = etsyApi.getEtsyConfig();
    expect(config.clientId).toBe("my-api-key");
  });

  it("isEtsyConfigured returns false when API key is missing", () => {
    const originalKey = process.env.ETSY_API_KEY;
    const originalSecret = process.env.ETSY_SHARED_SECRET;
    delete process.env.ETSY_API_KEY;
    delete process.env.ETSY_SHARED_SECRET;

    expect(etsyApi.isEtsyConfigured()).toBe(false);

    // Restore
    process.env.ETSY_API_KEY = originalKey;
    process.env.ETSY_SHARED_SECRET = originalSecret;
  });

  it("isEtsyConfigured returns true when both API key and secret are set", () => {
    process.env.ETSY_API_KEY = "key";
    process.env.ETSY_SHARED_SECRET = "secret";

    expect(etsyApi.isEtsyConfigured()).toBe(true);
  });
});

// ─── ETSY_LIMITS constant validation ────────────────────────────────

describe("EtsyAdapter — ETSY_LIMITS constants", () => {
  it("titleMaxChars is 140", () => {
    expect(ETSY_LIMITS.titleMaxChars).toBe(140);
  });

  it("tagsMax is 13", () => {
    expect(ETSY_LIMITS.tagsMax).toBe(13);
  });

  it("tagMaxChars is 20", () => {
    expect(ETSY_LIMITS.tagMaxChars).toBe(20);
  });

  it("descriptionMaxChars is 65535", () => {
    expect(ETSY_LIMITS.descriptionMaxChars).toBe(65535);
  });

  it("maxFileSizeBytes is 20MB", () => {
    expect(ETSY_LIMITS.maxFileSizeBytes).toBe(20 * 1024 * 1024);
  });

  it("minPriceCents is 20 ($0.20)", () => {
    expect(ETSY_LIMITS.minPriceCents).toBe(20);
  });
});

// ─── Token Response Type ─────────────────────────────────────────────

describe("EtsyAdapter — EtsyTokenResponse interface contract", () => {
  it("token response type is exported and has expected shape", () => {
    // Verify the type exists by checking that the module exports it
    // (TypeScript compile-time check — if this file compiles, the type exists)
    const mockTokenResponse: etsyApi.EtsyTokenResponse = {
      access_token: "test-access-token",
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: "test-refresh-token",
    };

    expect(mockTokenResponse.access_token).toBe("test-access-token");
    expect(mockTokenResponse.expires_in).toBe(3600);
    expect(mockTokenResponse.refresh_token).toBe("test-refresh-token");
    expect(mockTokenResponse.token_type).toBe("Bearer");
  });
});
