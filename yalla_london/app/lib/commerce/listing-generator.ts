/**
 * Listing Generator — AI-powered Etsy listing copy from approved briefs
 *
 * Takes an approved ProductBrief → generates:
 * - Title (≤140 chars)
 * - Description (rich text, ≤65535 chars)
 * - Tags (≤13 tags, each ≤20 chars)
 * - Section suggestion
 * - Materials
 *
 * Auto-validates against ETSY_LIMITS before saving.
 */

import { ETSY_LIMITS, validateEtsyListing, getOntologyItem } from "./constants";

// ─── Main Entry Point ─────────────────────────────────────

export interface ListingGenerationResult {
  draftId: string;
  title: string;
  tags: string[];
  descriptionPreview: string;
  complianceValid: boolean;
  complianceIssues: { field: string; message: string }[];
}

/**
 * Generate an Etsy listing draft from an approved ProductBrief.
 * Uses AI to write the listing copy, then validates against Etsy limits.
 */
export async function generateListingFromBrief(
  briefId: string,
  options: {
    calledFrom?: string;
  } = {},
): Promise<ListingGenerationResult> {
  const { prisma } = await import("@/lib/db");

  // Load the brief
  const brief = await prisma.productBrief.findUnique({
    where: { id: briefId },
  });

  if (!brief) {
    throw new Error(`ProductBrief ${briefId} not found`);
  }

  if (brief.status !== "approved") {
    throw new Error(
      `ProductBrief ${briefId} status is "${brief.status}" — must be "approved"`,
    );
  }

  // Check if draft already exists
  const existingDraft = await prisma.etsyListingDraft.findUnique({
    where: { briefId },
  });

  if (existingDraft) {
    throw new Error(
      `EtsyListingDraft already exists for brief ${briefId}`,
    );
  }

  // Get ontology info
  const ontology = brief.ontologyCategory
    ? getOntologyItem(brief.ontologyCategory)
    : null;

  // Generate listing copy via AI
  const listingCopy = await generateListingCopy(
    brief.title,
    brief.description ?? "",
    brief.productType,
    (brief.keywordsJson as string[]) ?? [],
    ontology?.etsyCategory ?? "",
    brief.siteId,
    options.calledFrom,
  );

  // Validate against Etsy limits
  const compliance = validateEtsyListing({
    title: listingCopy.title,
    tags: listingCopy.tags,
    description: listingCopy.description,
    price: brief.targetPrice ?? 999,
  });

  // Auto-fix common issues
  const fixedTitle = listingCopy.title.slice(0, ETSY_LIMITS.titleMaxChars);
  const fixedTags = listingCopy.tags
    .slice(0, ETSY_LIMITS.tagsMax)
    .map((t) => t.slice(0, ETSY_LIMITS.tagMaxChars));
  const fixedDescription = listingCopy.description.slice(
    0,
    ETSY_LIMITS.descriptionMaxChars,
  );

  // Create the EtsyListingDraft
  const draft = await prisma.etsyListingDraft.create({
    data: {
      siteId: brief.siteId,
      briefId,
      title: fixedTitle,
      description: fixedDescription,
      tags: fixedTags,
      price: brief.targetPrice ?? 999,
      currency: brief.currency ?? "USD",
      quantity: 999,
      section: listingCopy.section ?? null,
      materials: listingCopy.materials ?? [],
      status: "draft",
    },
  });

  // Update brief status
  await prisma.productBrief.update({
    where: { id: briefId },
    data: {
      status: "in_production",
      listingCopyJson: listingCopy as unknown as Record<string, unknown>,
    },
  });

  return {
    draftId: draft.id,
    title: fixedTitle,
    tags: fixedTags,
    descriptionPreview: fixedDescription.slice(0, 200) + "...",
    complianceValid: compliance.valid,
    complianceIssues: compliance.issues,
  };
}

// ─── AI Copy Generation ───────────────────────────────────

interface ListingCopy {
  title: string;
  description: string;
  tags: string[];
  section?: string;
  materials?: string[];
}

async function generateListingCopy(
  briefTitle: string,
  briefDescription: string,
  productType: string,
  keywords: string[],
  etsyCategory: string,
  siteId: string,
  calledFrom?: string,
): Promise<ListingCopy> {
  const { generateJSON } = await import("@/lib/ai/provider");
  const { getProviderForTask } = await import("@/lib/ai/provider-config");

  const route = await getProviderForTask("commerce_listing_copy", siteId);

  const prompt = `You are an expert Etsy copywriter specializing in digital travel products.

PRODUCT:
- Title: ${briefTitle}
- Description: ${briefDescription}
- Type: ${productType}
- Keywords: ${keywords.join(", ")}
- Etsy Category: ${etsyCategory}

ETSY LISTING REQUIREMENTS:
- Title: maximum ${ETSY_LIMITS.titleMaxChars} characters, front-load keywords, include product type
- Description: compelling, formatted for Etsy (no HTML), max ${ETSY_LIMITS.descriptionMaxChars} chars
  - Start with a hook (what the buyer gets)
  - Include: what's included, how to use, file format, printing instructions
  - End with FAQ section
- Tags: exactly ${ETSY_LIMITS.tagsMax} tags, each max ${ETSY_LIMITS.tagMaxChars} chars
  - Mix long-tail and short-tail keywords
  - Include product type, destination, occasion, style
- Section: suggest the best Etsy shop section name
- Materials: list materials/formats (e.g., "PDF", "Digital Download", "Printable")

Generate the listing copy. Return JSON with:
{
  "title": "...",
  "description": "...",
  "tags": ["tag1", "tag2", ...],
  "section": "...",
  "materials": ["material1", ...]
}

No markdown fencing. Pure JSON.`;

  const result = await generateJSON<ListingCopy>(prompt, {
    provider: route.provider as "grok" | "claude" | "openai" | "gemini",
    model: route.model,
    maxTokens: 2048,
    temperature: 0.7,
    siteId,
    taskType: "commerce_listing_copy",
    calledFrom: calledFrom ?? "listing-generator",
  });

  // Ensure result has required fields
  return {
    title: result.title ?? briefTitle,
    description: result.description ?? briefDescription,
    tags: Array.isArray(result.tags) ? result.tags : keywords.slice(0, 13),
    section: result.section ?? undefined,
    materials: Array.isArray(result.materials)
      ? result.materials
      : ["Digital Download", "PDF"],
  };
}

// ─── Compliance Checker ───────────────────────────────────

/**
 * Run full compliance check on an existing draft.
 * Returns issues with field and message.
 */
export async function checkDraftCompliance(
  draftId: string,
): Promise<{
  valid: boolean;
  issues: { field: string; message: string }[];
}> {
  const { prisma } = await import("@/lib/db");

  const draft = await prisma.etsyListingDraft.findUnique({
    where: { id: draftId },
  });

  if (!draft) {
    return {
      valid: false,
      issues: [{ field: "draft", message: "Draft not found" }],
    };
  }

  return validateEtsyListing({
    title: draft.title,
    tags: draft.tags,
    description: draft.description ?? "",
    price: draft.price,
  });
}
