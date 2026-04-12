/**
 * Quick Create — One-tap product creation from idea to Etsy listing
 *
 * Simplified flow for Khaled:
 *   "I want to sell a London 3-day itinerary" →
 *     1. Creates a ProductBrief (auto-approved)
 *     2. AI generates Etsy listing copy (title, tags, description)
 *     3. Creates an EtsyListingDraft ready to publish
 *
 * This bypasses the full trend research pipeline for when you
 * already know what product you want to create.
 */

import { ETSY_LIMITS, validateEtsyListing, getOntologyItem, PRODUCT_ONTOLOGY } from "./constants";

// ─── Types ──────────────────────────────────────────────

export interface QuickCreateInput {
  /** What you want to sell, in plain English: "London 3-day luxury itinerary" */
  idea: string;
  /** Product type from ontology (optional — AI will suggest if omitted) */
  ontologyCategory?: string;
  /** Price in cents (optional — AI will suggest) */
  price?: number;
  /** Site this product belongs to */
  siteId: string;
}

export interface QuickCreateResult {
  briefId: string;
  draftId: string;
  title: string;
  description: string;
  tags: string[];
  price: number;
  suggestedCategory: string;
  complianceValid: boolean;
  complianceIssues: { field: string; message: string }[];
}

// ─── Main Entry Point ───────────────────────────────────

/**
 * Create a full Etsy listing from a single product idea.
 * Auto-approves the brief and generates listing copy in one shot.
 */
export async function quickCreate(
  input: QuickCreateInput,
): Promise<QuickCreateResult> {
  const { prisma } = await import("@/lib/db");
  const { getSiteConfig } = await import("@/config/sites");

  const site = getSiteConfig(input.siteId);
  const siteName = site?.name ?? input.siteId;

  // Step 1: AI generates listing + categorization from the idea
  const aiResult = await generateFromIdea(
    input.idea,
    siteName,
    input.siteId,
    input.ontologyCategory,
    input.price,
  );

  // Step 2: Create ProductBrief (auto-approved)
  const brief = await prisma.productBrief.create({
    data: {
      siteId: input.siteId,
      title: aiResult.briefTitle,
      description: aiResult.briefDescription,
      productType: aiResult.productType,
      tier: aiResult.tier,
      ontologyCategory: aiResult.ontologyCategory,
      targetPrice: aiResult.price,
      keywordsJson: aiResult.tags,
      listingCopyJson: {
        title: aiResult.listingTitle,
        description: aiResult.listingDescription,
        tags: aiResult.tags,
        section: aiResult.section,
        materials: aiResult.materials,
      },
      status: "in_production",
      approvedAt: new Date(),
      approvedBy: "quick-create",
    },
  });

  // Step 3: Validate and auto-fix listing against Etsy limits
  const fixedTitle = aiResult.listingTitle.slice(0, ETSY_LIMITS.titleMaxChars);
  const fixedTags = aiResult.tags
    .slice(0, ETSY_LIMITS.tagsMax)
    .map((t: string) => t.slice(0, ETSY_LIMITS.tagMaxChars));
  const fixedDescription = aiResult.listingDescription.slice(
    0,
    ETSY_LIMITS.descriptionMaxChars,
  );

  const compliance = validateEtsyListing({
    title: fixedTitle,
    tags: fixedTags,
    description: fixedDescription,
    price: aiResult.price,
  });

  // Step 4: Create EtsyListingDraft
  const draft = await prisma.etsyListingDraft.create({
    data: {
      siteId: input.siteId,
      briefId: brief.id,
      title: fixedTitle,
      description: fixedDescription,
      tags: fixedTags,
      price: aiResult.price,
      currency: "USD",
      quantity: 999,
      section: aiResult.section ?? null,
      materials: aiResult.materials,
      status: "draft",
    },
  });

  return {
    briefId: brief.id,
    draftId: draft.id,
    title: fixedTitle,
    description: fixedDescription,
    tags: fixedTags,
    price: aiResult.price,
    suggestedCategory: aiResult.ontologyCategory,
    complianceValid: compliance.valid,
    complianceIssues: compliance.issues,
  };
}

// ─── AI Generation ──────────────────────────────────────

interface AIGeneratedProduct {
  briefTitle: string;
  briefDescription: string;
  productType: string;
  tier: number;
  ontologyCategory: string;
  price: number; // cents
  listingTitle: string; // Etsy-optimized, ≤140 chars
  listingDescription: string;
  tags: string[];
  section: string;
  materials: string[];
}

async function generateFromIdea(
  idea: string,
  siteName: string,
  siteId: string,
  forcedCategory?: string,
  forcedPrice?: number,
): Promise<AIGeneratedProduct> {
  const { generateJSON } = await import("@/lib/ai/provider");
  const { getProviderForTask } = await import("@/lib/ai/provider-config");

  const route = await getProviderForTask("commerce_listing_copy", siteId);

  // Build category reference for AI
  const categoryList = PRODUCT_ONTOLOGY.map(
    (c) =>
      `- "${c.category}" (${c.label}): Tier ${c.tier}, $${(c.priceRange.min / 100).toFixed(2)}-$${(c.priceRange.max / 100).toFixed(2)}, ${c.platforms.join("+")}`,
  ).join("\n");

  const prompt = `You are an expert Etsy seller and travel product creator for "${siteName}".

TASK: Create a complete digital product listing from this idea:
"${idea}"

PRODUCT CATEGORIES (pick the best fit${forcedCategory ? ` — USE "${forcedCategory}"` : ""}):
${categoryList}

ETSY LISTING REQUIREMENTS:
- Title: max ${ETSY_LIMITS.titleMaxChars} chars, front-load keywords, include product type
- Description: compelling Etsy copy (no HTML), structured with sections:
  * Hook: What the buyer gets (first 2 lines — shown in search preview)
  * What's Included: bullet list of files/pages
  * How to Use: step by step
  * File Format: PDF/Canva/PNG etc.
  * FAQ: 3-4 common questions
- Tags: exactly ${ETSY_LIMITS.tagsMax} tags, each max ${ETSY_LIMITS.tagMaxChars} chars
  * Mix: product type + destination + occasion + style + long-tail
- Section: suggest shop section name
- Materials: list formats ("PDF", "Digital Download", "Printable", etc.)

${forcedPrice ? `USE PRICE: $${(forcedPrice / 100).toFixed(2)}` : "SUGGEST a competitive price based on the category range."}

Return ONLY valid JSON (no markdown fencing):
{
  "briefTitle": "Internal product name",
  "briefDescription": "2-3 sentence product description for our records",
  "productType": "TEMPLATE|PDF_GUIDE|BUNDLE|WALL_ART|PLANNER|PRESET|STICKER|WORKSHEET|EVENT_GUIDE",
  "tier": 1|2|3,
  "ontologyCategory": "category_key from the list above",
  "price": <cents integer>,
  "listingTitle": "Etsy-optimized title (max ${ETSY_LIMITS.titleMaxChars} chars)",
  "listingDescription": "Full Etsy description with sections",
  "tags": ["tag1", "tag2", ...exactly 13],
  "section": "Shop section name",
  "materials": ["PDF", "Digital Download", ...]
}`;

  const result = await generateJSON<AIGeneratedProduct>(prompt, {
    provider: route.provider as "grok" | "claude" | "openai" | "gemini",
    model: route.model,
    maxTokens: 3000,
    temperature: 0.7,
    siteId,
    taskType: "commerce_listing_copy",
    calledFrom: "quick-create",
  });

  // Ensure valid fields with fallbacks
  const ontology = getOntologyItem(result.ontologyCategory ?? forcedCategory ?? "itinerary_template");

  return {
    briefTitle: result.briefTitle ?? idea,
    briefDescription: result.briefDescription ?? `Digital product: ${idea}`,
    productType: result.productType ?? ontology?.productType ?? "TEMPLATE",
    tier: result.tier ?? ontology?.tier ?? 1,
    ontologyCategory: result.ontologyCategory ?? forcedCategory ?? "itinerary_template",
    price: forcedPrice ?? result.price ?? ontology?.priceRange.min ?? 999,
    listingTitle: result.listingTitle ?? idea.slice(0, ETSY_LIMITS.titleMaxChars),
    listingDescription:
      result.listingDescription ?? `${idea}\n\nDigital download. Instant delivery.`,
    tags: Array.isArray(result.tags)
      ? result.tags.filter((t: string) => typeof t === "string" && t.length > 0)
      : [],
    section: result.section ?? "Digital Downloads",
    materials: Array.isArray(result.materials)
      ? result.materials
      : ["Digital Download", "PDF"],
  };
}
