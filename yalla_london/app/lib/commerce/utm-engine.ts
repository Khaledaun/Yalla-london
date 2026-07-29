/**
 * UTM Engine — URL tracking and coupon code generation
 *
 * Pure utility module (no DB access) for:
 * - UTM parameter generation and URL building
 * - Coupon code generation (YALLA-{SITE}-{RANDOM6})
 * - UTM URL validation
 */

import type { UtmParams } from "./types";

// ─── UTM URL Builder ──────────────────────────────────────

/**
 * Build a URL with UTM parameters appended.
 */
export function buildUtmUrl(baseUrl: string, params: UtmParams): string {
  const url = new URL(baseUrl);
  url.searchParams.set("utm_source", params.source);
  url.searchParams.set("utm_medium", params.medium);
  url.searchParams.set("utm_campaign", params.campaign);
  if (params.content) url.searchParams.set("utm_content", params.content);
  if (params.term) url.searchParams.set("utm_term", params.term);
  return url.toString();
}

/**
 * Generate UTM parameters for a campaign.
 */
export function generateUtmParams(
  campaignSlug: string,
  channel: "social" | "email" | "blog" | "etsy" | "pinterest",
  variant?: string,
): UtmParams {
  const sourceMap: Record<string, string> = {
    social: "instagram",
    email: "email",
    blog: "blog",
    etsy: "etsy",
    pinterest: "pinterest",
  };

  const mediumMap: Record<string, string> = {
    social: "social",
    email: "email",
    blog: "referral",
    etsy: "marketplace",
    pinterest: "social",
  };

  return {
    source: sourceMap[channel] ?? channel,
    medium: mediumMap[channel] ?? "other",
    campaign: campaignSlug,
    content: variant,
  };
}

// ─── Coupon Code Generator ────────────────────────────────

/**
 * Generate a coupon code in format: YALLA-{SITE}-{RANDOM6}
 * Uses crypto for randomness.
 */
export function generateCouponCode(siteId: string): string {
  const siteSlug = siteId
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6);

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/1/I/L
  let random = "";
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  for (let i = 0; i < 6; i++) {
    random += chars[array[i] % chars.length];
  }

  return `YALLA-${siteSlug}-${random}`;
}

/**
 * Validate a coupon code format.
 */
export function isValidCouponCode(code: string): boolean {
  return /^YALLA-[A-Z0-9]{1,6}-[A-Z0-9]{6}$/.test(code);
}

// ─── UTM Validation ───────────────────────────────────────

/**
 * Validate a URL contains proper UTM parameters.
 */
export function validateUtmUrl(url: string): {
  valid: boolean;
  issues: string[];
  params: Partial<UtmParams>;
} {
  const issues: string[] = [];
  const params: Partial<UtmParams> = {};

  try {
    const parsed = new URL(url);
    params.source = parsed.searchParams.get("utm_source") ?? undefined;
    params.medium = parsed.searchParams.get("utm_medium") ?? undefined;
    params.campaign = parsed.searchParams.get("utm_campaign") ?? undefined;
    params.content = parsed.searchParams.get("utm_content") ?? undefined;
    params.term = parsed.searchParams.get("utm_term") ?? undefined;

    if (!params.source) issues.push("Missing utm_source");
    if (!params.medium) issues.push("Missing utm_medium");
    if (!params.campaign) issues.push("Missing utm_campaign");
  } catch {
    issues.push("Invalid URL format");
  }

  return {
    valid: issues.length === 0,
    issues,
    params,
  };
}

// ─── Campaign Slug Generator ──────────────────────────────

/**
 * Generate a URL-safe campaign slug from a name.
 */
export function generateCampaignSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}
