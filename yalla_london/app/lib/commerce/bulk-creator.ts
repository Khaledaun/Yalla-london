/**
 * Bulk Creator — Generate multiple Etsy listings from a single theme
 *
 * Example: "London neighborhoods" → 10 different itinerary listings
 *
 * Flow:
 *   1. generateBulkIdeas(theme, count, siteId) → AI produces product ideas
 *   2. User reviews ideas in the UI
 *   3. executeBulkCreate(ideas, siteId) → calls quickCreate per idea with budget guard
 *
 * Budget: Vercel Pro 60s limit → 53s budget, 7s buffer.
 * Each quickCreate call takes ~3-8s (AI generation + 2 DB writes).
 */

import { PRODUCT_ONTOLOGY, ETSY_LIMITS } from "./constants";
import type { QuickCreateResult } from "./quick-create";

// ─── Types ──────────────────────────────────────────────

export interface BulkIdea {
  /** Short product concept description */
  idea: string;
  /** Suggested ontology category from PRODUCT_ONTOLOGY */
  suggestedCategory: string;
  /** Suggested price in cents */
  suggestedPrice: number;
  /** Why this idea fits the theme + market opportunity */
  rationale: string;
}

export interface BulkTemplate {
  id: string;
  name: string;
  description: string;
  theme: string;
  count: number;
  defaultCategory: string;
  defaultTier: 1 | 2 | 3;
}

export interface BulkCreateOptions {
  /** Maximum wall-clock seconds before stopping. Default: 53 */
  budgetSeconds?: number;
  /** Override ontology category for all ideas */
  forceCategory?: string;
  /** Override price for all ideas (cents) */
  forcePrice?: number;
}

export interface BulkCreateResult {
  created: QuickCreateResult[];
  failed: { idea: string; error: string }[];
  totalMs: number;
}

// ─── Pre-defined Templates ──────────────────────────────

export const BULK_TEMPLATES: BulkTemplate[] = [
  {
    id: "london-neighborhoods",
    name: "London Neighborhoods",
    description:
      "10 detailed itinerary guides, one per iconic London neighborhood — Mayfair, Shoreditch, Kensington, Notting Hill, Camden, Soho, South Bank, Greenwich, Covent Garden, Marylebone.",
    theme:
      "Create 10 unique London neighborhood itinerary guides. Each covers one distinct neighborhood: Mayfair, Shoreditch, Kensington, Notting Hill, Camden, Soho, South Bank, Greenwich, Covent Garden, Marylebone. Include walking routes, best restaurants, hidden gems, and photography spots specific to each area.",
    count: 10,
    defaultCategory: "itinerary_template",
    defaultTier: 1,
  },
  {
    id: "seasonal-travel",
    name: "Seasonal Travel",
    description:
      "4 comprehensive seasonal travel guides — Spring, Summer, Autumn, Winter — each with destination-specific tips, packing lists, and event calendars.",
    theme:
      "Create 4 seasonal travel guides: Spring (March-May), Summer (June-August), Autumn (September-November), Winter (December-February). Each guide includes best destinations for the season, weather-appropriate packing list, seasonal events and festivals, budget tips, and photography advice.",
    count: 4,
    defaultCategory: "travel_guide",
    defaultTier: 1,
  },
  {
    id: "travel-planning-bundle",
    name: "Travel Planning Bundle",
    description:
      "4-product bundle: complete trip planner, pre-trip checklist, packing list organizer, and travel budget tracker.",
    theme:
      "Create a 4-product travel planning bundle: (1) Complete Trip Planner with day-by-day itinerary template, accommodation tracker, and transport planner, (2) Pre-Trip Checklist covering documents, bookings, insurance, currency, and home preparation, (3) Packing List Organizer with climate-specific templates and carry-on optimization, (4) Travel Budget Tracker with expense categories, currency converter reference, and daily spending log.",
    count: 4,
    defaultCategory: "planner_bundle",
    defaultTier: 2,
  },
  {
    id: "destination-wall-art",
    name: "Destination Wall Art",
    description:
      "8 vintage-style travel poster designs featuring iconic destinations — printable digital wall art in multiple sizes.",
    theme:
      "Create 8 vintage-style travel poster wall art concepts for iconic destinations: London, Paris, Maldives, Istanbul, Dubai, Santorini, Amalfi Coast, Bangkok. Each poster has a distinct color palette inspired by the destination, Art Deco or retro typography, and a signature landmark illustration. Available as printable digital downloads in 8x10, 11x14, 16x20, and A3 sizes.",
    count: 8,
    defaultCategory: "wall_art",
    defaultTier: 2,
  },
  {
    id: "travel-photography",
    name: "Travel Photography",
    description:
      "5 Lightroom preset packs tailored to different travel photography styles — Golden Hour, Beach Paradise, City Nights, Desert Warmth, Tropical Jungle.",
    theme:
      "Create 5 Lightroom preset packs for travel photographers: (1) Golden Hour — warm sunset tones for golden-hour landscapes, (2) Beach Paradise — bright aqua/turquoise tones for coastal and underwater shots, (3) City Nights — moody contrast with neon accents for urban nightlife, (4) Desert Warmth — earthy sand and terracotta tones for arid landscapes, (5) Tropical Jungle — lush green saturation for rainforest and botanical scenes. Each pack includes 8-12 presets with variations.",
    count: 5,
    defaultCategory: "lightroom_preset",
    defaultTier: 3,
  },
];

// ─── Generate Ideas from Theme ──────────────────────────

/**
 * Uses AI to generate `count` product ideas from a theme string.
 * Returns ideas for user review before creating listings.
 */
export async function generateBulkIdeas(
  theme: string,
  count: number,
  siteId: string,
): Promise<BulkIdea[]> {
  const { generateJSON } = await import("@/lib/ai/provider");
  const { getProviderForTask } = await import("@/lib/ai/provider-config");
  const { getSiteConfig } = await import("@/config/sites");

  const site = getSiteConfig(siteId);
  const siteName = site?.name ?? siteId;

  const route = await getProviderForTask("commerce_listing_copy", siteId);

  // Build category reference
  const categoryList = PRODUCT_ONTOLOGY.map(
    (c) =>
      `- "${c.category}" (${c.label}): Tier ${c.tier}, $${(c.priceRange.min / 100).toFixed(2)}-$${(c.priceRange.max / 100).toFixed(2)}`,
  ).join("\n");

  const clampedCount = Math.min(Math.max(count, 1), 20);

  const prompt = `You are a product strategist for "${siteName}", a luxury travel brand selling digital products on Etsy.

TASK: Generate exactly ${clampedCount} distinct product ideas based on this theme:
"${theme}"

PRODUCT CATEGORIES (pick the best fit for each idea):
${categoryList}

ETSY CONTEXT:
- These are digital download products (PDFs, templates, presets, planners, wall art)
- Titles should be Etsy-search-optimized (max ${ETSY_LIMITS.titleMaxChars} chars)
- Each idea must be DIFFERENT — no duplicate concepts
- Prices should be competitive for the Etsy digital products market
- Ideas should appeal to travel enthusiasts and luxury travelers

For EACH idea, provide:
1. "idea" — A clear, specific product concept (40-80 words). Include what the buyer gets.
2. "suggestedCategory" — The best ontology category key from the list above.
3. "suggestedPrice" — Price in cents (e.g., 999 = $9.99). Use the category price range as guidance.
4. "rationale" — Why this product will sell well (20-40 words). Reference market demand or gap.

Return ONLY valid JSON array (no markdown fencing):
[
  { "idea": "...", "suggestedCategory": "...", "suggestedPrice": 999, "rationale": "..." },
  ...
]`;

  const ideas = await generateJSON<BulkIdea[]>(prompt, {
    provider: route.provider as "grok" | "claude" | "openai" | "gemini",
    model: route.model,
    maxTokens: 4000,
    temperature: 0.8,
    siteId,
    taskType: "commerce_listing_copy",
    calledFrom: "bulk-creator/generateBulkIdeas",
  });

  // Validate and normalize
  if (!Array.isArray(ideas)) {
    console.warn("[bulk-creator] AI returned non-array, wrapping");
    return [];
  }

  return ideas
    .filter(
      (item) =>
        item &&
        typeof item.idea === "string" &&
        item.idea.length > 0,
    )
    .slice(0, clampedCount)
    .map((item) => ({
      idea: item.idea,
      suggestedCategory: item.suggestedCategory ?? "itinerary_template",
      suggestedPrice:
        typeof item.suggestedPrice === "number" && item.suggestedPrice >= 20
          ? item.suggestedPrice
          : 999,
      rationale: item.rationale ?? "AI-generated product idea",
    }));
}

// ─── Execute Bulk Create ────────────────────────────────

/**
 * Creates Etsy listings for each idea by calling quickCreate in sequence.
 * Includes a budget guard — stops creating if remaining time is too low.
 *
 * Each quickCreate call involves:
 *   - 1 AI generation call (~2-6s)
 *   - 1 ProductBrief DB write
 *   - 1 EtsyListingDraft DB write
 *   - 1 Etsy compliance validation
 */
export async function executeBulkCreate(
  ideas: BulkIdea[],
  siteId: string,
  options?: BulkCreateOptions,
): Promise<BulkCreateResult> {
  const { quickCreate } = await import("./quick-create");

  const budgetMs = (options?.budgetSeconds ?? 53) * 1000;
  const startTime = Date.now();

  const created: QuickCreateResult[] = [];
  const failed: { idea: string; error: string }[] = [];

  for (const item of ideas) {
    const elapsed = Date.now() - startTime;
    const remaining = budgetMs - elapsed;

    // Need at least 8s to safely create one listing (AI call + DB writes + buffer)
    if (remaining < 8000) {
      // Mark remaining ideas as budget-exceeded
      const remainingIdeas = ideas.slice(ideas.indexOf(item));
      for (const skipped of remainingIdeas) {
        if (!created.some((c) => c.title === skipped.idea) && !failed.some((f) => f.idea === skipped.idea)) {
          failed.push({
            idea: skipped.idea,
            error: `Budget exceeded (${Math.round(elapsed / 1000)}s of ${Math.round(budgetMs / 1000)}s used)`,
          });
        }
      }
      break;
    }

    try {
      const result = await quickCreate({
        idea: item.idea,
        ontologyCategory: options?.forceCategory ?? item.suggestedCategory,
        price: options?.forcePrice ?? item.suggestedPrice,
        siteId,
      });

      created.push(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error during creation";
      console.warn(`[bulk-creator] Failed to create "${item.idea.slice(0, 50)}...":`, message);
      failed.push({ idea: item.idea, error: message });
    }
  }

  return {
    created,
    failed,
    totalMs: Date.now() - startTime,
  };
}
