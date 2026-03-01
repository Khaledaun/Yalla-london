/**
 * Commerce Engine — AI-Powered Product Mockup Image Generation
 *
 * Provides mockup image prompt generation, SVG cover creation,
 * and placeholder image management for Etsy listing previews.
 *
 * Product types: digital downloads sold on Etsy — itineraries,
 * travel guides, wall art, planners, presets, stickers, worksheets, etc.
 *
 * Exports:
 *   - generateMockupPrompt(productTitle, productType, siteId)
 *   - generateMockupVariants(briefId, count?)
 *   - getStockMockupUrl(productType, tier)
 *   - saveMockupToListing(draftId, imageUrl)
 *   - generateProductCoverSvg(title, productType, siteId)
 */

import { generateJSON, type AICompletionOptions } from "@/lib/ai/provider";
import { getBrandProfile, type BrandProfile } from "@/lib/design/brand-provider";
import { PRODUCT_ONTOLOGY } from "@/lib/commerce/constants";

// ─── Types ──────────────────────────────────────────────────────

export interface MockupPromptResult {
  /** The full image generation prompt (DALL-E / Stable Diffusion compatible) */
  prompt: string;
  /** Negative prompt for Stable Diffusion (things to avoid) */
  negativePrompt: string;
  /** Suggested style keywords */
  styleKeywords: string[];
  /** Aspect ratio recommendation */
  aspectRatio: string;
  /** Brief description of what the mockup should look like */
  description: string;
}

export interface MockupVariant {
  variantId: string;
  label: string;
  prompt: string;
  negativePrompt: string;
  style: "flat_lay" | "lifestyle" | "device_mockup" | "minimalist" | "editorial";
  description: string;
}

interface StockMockupEntry {
  url: string;
  alt: string;
}

// ─── Constants ──────────────────────────────────────────────────

const LOG_PREFIX = "[image-generator]";

/** Default AI options for all image generator calls */
const AI_OPTIONS: Partial<AICompletionOptions> = {
  calledFrom: "image-generator",
  taskType: "commerce_listing_copy",
  temperature: 0.8,
  maxTokens: 2048,
};

/**
 * Visual descriptions of how each product type looks as a physical item.
 * Even though these are digital downloads, Etsy buyers respond best to
 * mockups showing them as tangible products.
 */
const PRODUCT_TYPE_VISUALS: Record<string, string> = {
  TEMPLATE: "a beautifully designed printable document with elegant typography, laid out on a marble surface with a gold pen and passport nearby",
  PDF_GUIDE: "a professionally bound travel guidebook with a glossy cover, photographed on a wooden desk with reading glasses and a cup of Arabic coffee",
  BUNDLE: "a collection of neatly arranged printed documents in a branded folder, with a tablet showing the digital version beside it",
  WALL_ART: "a framed vintage-style travel poster hanging on a clean white wall above a mid-century modern credenza with a small plant",
  PLANNER: "a spiral-bound trip planner open to a beautifully designed weekly spread, with washi tape, stickers, and a latte on a cozy desk",
  PRESET: "a before/after photo comparison on a photographer's monitor, with a camera and lens on the desk, warm golden hour lighting",
  STICKER: "a sheet of colorful die-cut digital stickers arranged on an iPad screen running GoodNotes, with a stylus resting nearby",
  WORKSHEET: "colorful educational worksheets printed on high-quality paper, spread on a table with colored pencils and a child's backpack",
  EVENT_GUIDE: "an elegant seasonal event guide displayed on a tablet and as a printed booklet, surrounded by festive decorations relevant to the event",
};

/**
 * Destination-specific scene elements per site that add travel atmosphere.
 */
const SITE_SCENE_ELEMENTS: Record<string, string> = {
  "yalla-london": "hints of London atmosphere — a red phone box blurred in the background, a cup of English tea, iconic skyline silhouette in the distance",
  arabaldives: "tropical Maldivian setting — turquoise water visible through a window, white sand, palm fronds, coral motifs in the decor",
  "french-riviera": "French Riviera elegance — Mediterranean blue sea glimpsed through shutters, lavender sprigs, champagne-gold accents, yacht mast in the distance",
  istanbul: "Ottoman-inspired luxury — intricate tilework visible on a wall, Turkish tea in a tulip glass, Bosphorus view with minarets, warm copper accents",
  thailand: "Thai tropical warmth — lush emerald foliage, golden temple spires in the distance, orchid arrangement, teak wood surfaces",
};

/**
 * Stock/placeholder mockup URL templates per product type and tier.
 * These are fallback URLs when AI image generation is not available.
 * Uses site-hosted placeholder images with product type overlays.
 */
const STOCK_MOCKUPS: Record<string, Record<number, StockMockupEntry>> = {
  TEMPLATE: {
    1: { url: "/images/mockups/template-premium.jpg", alt: "Premium destination itinerary template" },
    2: { url: "/images/mockups/template-standard.jpg", alt: "Standard travel template" },
    3: { url: "/images/mockups/template-basic.jpg", alt: "Basic template design" },
  },
  PDF_GUIDE: {
    1: { url: "/images/mockups/guide-premium.jpg", alt: "Premium travel guide eBook" },
    2: { url: "/images/mockups/guide-standard.jpg", alt: "Standard travel guide" },
    3: { url: "/images/mockups/guide-basic.jpg", alt: "Basic travel guide" },
  },
  BUNDLE: {
    1: { url: "/images/mockups/bundle-premium.jpg", alt: "Premium travel agent toolkit bundle" },
    2: { url: "/images/mockups/bundle-standard.jpg", alt: "Standard bundle" },
    3: { url: "/images/mockups/bundle-basic.jpg", alt: "Basic bundle" },
  },
  WALL_ART: {
    1: { url: "/images/mockups/wallart-premium.jpg", alt: "Premium vintage travel poster" },
    2: { url: "/images/mockups/wallart-standard.jpg", alt: "Standard travel wall art" },
    3: { url: "/images/mockups/wallart-basic.jpg", alt: "Basic wall art print" },
  },
  PLANNER: {
    1: { url: "/images/mockups/planner-premium.jpg", alt: "Premium trip planner bundle" },
    2: { url: "/images/mockups/planner-standard.jpg", alt: "Standard trip planner" },
    3: { url: "/images/mockups/planner-basic.jpg", alt: "Basic planner" },
  },
  PRESET: {
    1: { url: "/images/mockups/preset-premium.jpg", alt: "Premium Lightroom presets" },
    2: { url: "/images/mockups/preset-standard.jpg", alt: "Standard photo presets" },
    3: { url: "/images/mockups/preset-basic.jpg", alt: "Basic presets pack" },
  },
  STICKER: {
    1: { url: "/images/mockups/sticker-premium.jpg", alt: "Premium digital sticker pack" },
    2: { url: "/images/mockups/sticker-standard.jpg", alt: "Standard digital stickers" },
    3: { url: "/images/mockups/sticker-basic.jpg", alt: "Basic sticker set" },
  },
  WORKSHEET: {
    1: { url: "/images/mockups/worksheet-premium.jpg", alt: "Premium educational worksheets" },
    2: { url: "/images/mockups/worksheet-standard.jpg", alt: "Standard worksheets" },
    3: { url: "/images/mockups/worksheet-basic.jpg", alt: "Basic worksheets" },
  },
  EVENT_GUIDE: {
    1: { url: "/images/mockups/event-premium.jpg", alt: "Premium seasonal event guide" },
    2: { url: "/images/mockups/event-standard.jpg", alt: "Standard event guide" },
    3: { url: "/images/mockups/event-basic.jpg", alt: "Basic event guide" },
  },
};

/** Fallback for unknown product types */
const DEFAULT_STOCK_MOCKUP: StockMockupEntry = {
  url: "/images/mockups/generic-product.jpg",
  alt: "Digital product mockup",
};

// ─── SVG Icon Paths ─────────────────────────────────────────────

/**
 * Simple SVG icon path data for each product type.
 * Used in the generateProductCoverSvg function.
 */
const PRODUCT_ICONS: Record<string, string> = {
  TEMPLATE:
    // Document/paper icon
    "M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6zm7 1.5L18.5 9H13V3.5zM8 13h8v2H8v-2zm0 4h5v2H8v-2z",
  PDF_GUIDE:
    // Book icon
    "M4 4a2 2 0 0 1 2-2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4zm2 0v16h12V9h-5V4H6zm3 8h6v1.5H9V12zm0 3h6v1.5H9V15zm0 3h4v1.5H9V18z",
  BUNDLE:
    // Stack/layers icon
    "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  WALL_ART:
    // Frame/image icon
    "M3 3h18v18H3V3zm2 2v14h14V5H5zm2 10l3-3 2 2 4-4 3 3v4H7v-2z",
  PLANNER:
    // Calendar icon
    "M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm-2 6h14v12H5V8zm2 2v2h2v-2H7zm4 0v2h2v-2h-2zm4 0v2h2v-2h-2zm-8 4v2h2v-2H7zm4 0v2h2v-2h-2z",
  PRESET:
    // Camera/sliders icon
    "M3 5h2V3H3v2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zM3 9h2V7H3v2zm8-6h2V1h-2v2zm6 0h2V1h-2v2zm-2 18h2v-6h-2v6zm2-14h2V5h-2v2zm-6 14h2V9h-2v12zm-2-8h2V7H9v6zm-2 8h2v-6H7v6zm-4 0h2v-4H3v4z",
  STICKER:
    // Star/sparkle icon
    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  WORKSHEET:
    // Pencil/education icon
    "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  EVENT_GUIDE:
    // Celebration/sparkle icon
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
};

// ─── 1. generateMockupPrompt ────────────────────────────────────

/**
 * Uses AI to create a detailed DALL-E/Stable Diffusion prompt for a
 * product mockup image based on the product type and site branding.
 *
 * @param productTitle - The product's display title (e.g. "7-Day London Luxury Itinerary")
 * @param productType - Prisma ProductType enum value (e.g. "TEMPLATE", "WALL_ART")
 * @param siteId - The site this product belongs to (e.g. "yalla-london")
 * @returns A detailed prompt object ready for image generation APIs
 */
export async function generateMockupPrompt(
  productTitle: string,
  productType: string,
  siteId: string,
): Promise<MockupPromptResult> {
  const brand = getBrandProfile(siteId);
  const ontologyItem = PRODUCT_ONTOLOGY.find((o) => o.productType === productType);
  const productVisual = PRODUCT_TYPE_VISUALS[productType] || PRODUCT_TYPE_VISUALS.TEMPLATE;
  const sceneElements = SITE_SCENE_ELEMENTS[siteId] || "";

  const prompt = `You are an expert product photographer and art director for luxury travel brands.

Generate a detailed image generation prompt (for DALL-E 3 or Stable Diffusion XL) for a product mockup image.

PRODUCT DETAILS:
- Title: "${productTitle}"
- Type: ${ontologyItem?.label || productType} (${productType})
- Category: ${ontologyItem?.category || "digital product"}
- Tier: ${ontologyItem?.tier || 1} (1=premium, 2=complementary, 3=seasonal)

BRAND CONTEXT:
- Site: ${brand.name} (${brand.domain})
- Primary color: ${brand.colors.primary}
- Secondary color: ${brand.colors.secondary}
- Accent color: ${brand.colors.accent}
- Font style: ${brand.fonts.heading.name} headings, ${brand.fonts.body.name} body

VISUAL REFERENCE:
- The product should look like: ${productVisual}
- Scene atmosphere: ${sceneElements}

REQUIREMENTS:
1. The prompt must describe a "flat lay" or "lifestyle mockup" photographic scene
2. The product must be the clear hero — centred and prominent
3. Include realistic props that a luxury traveller would own (passport, designer sunglasses, leather journal, etc.)
4. Lighting should be soft, natural, and magazine-quality
5. Color palette should harmonise with the brand colors (${brand.colors.primary}, ${brand.colors.secondary})
6. The scene should feel aspirational but authentic — not stock-photo generic
7. NO text overlay in the image (the title will be added separately)
8. The image should work at 1200x800px (Etsy listing image dimensions)
9. Include a subtle depth-of-field effect (foreground sharp, background softly blurred)

Respond with a JSON object containing:
{
  "prompt": "the full detailed image generation prompt (150-250 words)",
  "negativePrompt": "things to avoid in the image (text overlays, watermarks, blurry, low quality, etc.)",
  "styleKeywords": ["5-8 style keywords like 'flat lay', 'luxury', 'editorial', etc."],
  "aspectRatio": "3:2",
  "description": "A brief 1-sentence description of what the mockup shows"
}`;

  try {
    const result = await generateJSON<MockupPromptResult>(prompt, {
      ...AI_OPTIONS,
      siteId,
      systemPrompt:
        "You are a product photography art director specialising in luxury travel digital products. Respond with valid JSON only.",
    });

    return result;
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} AI prompt generation failed for "${productTitle}" (${productType}, ${siteId}):`,
      error instanceof Error ? error.message : error,
    );

    // Return a handcrafted fallback prompt
    return buildFallbackPrompt(productTitle, productType, brand);
  }
}

/**
 * Build a reasonable fallback prompt when AI is unavailable.
 */
function buildFallbackPrompt(
  productTitle: string,
  productType: string,
  brand: BrandProfile,
): MockupPromptResult {
  const productVisual = PRODUCT_TYPE_VISUALS[productType] || PRODUCT_TYPE_VISUALS.TEMPLATE;

  return {
    prompt: `Professional flat lay product photography of ${productVisual}. The product is titled "${productTitle}". Shot from above on a clean surface with soft natural window lighting from the left. Color palette features ${brand.colors.primary} and ${brand.colors.secondary} accents. Props include a luxury passport holder, designer sunglasses, and a small succulent plant. The scene is styled for a luxury travel brand. Shot with a Canon EOS R5, 35mm lens, f/2.8, creating a subtle depth of field. Magazine-quality editorial style. No text overlays. 1200x800 pixels, 3:2 aspect ratio.`,
    negativePrompt:
      "text, watermark, logo, blurry, low quality, oversaturated, cartoon, illustration, 3D render, CGI, stock photo look, cluttered, messy, dark shadows, harsh lighting",
    styleKeywords: [
      "flat lay",
      "product photography",
      "luxury travel",
      "editorial",
      "magazine quality",
      "natural lighting",
    ],
    aspectRatio: "3:2",
    description: `A professional flat lay mockup of "${productTitle}" styled for a luxury travel brand.`,
  };
}

// ─── 2. generateMockupVariants ──────────────────────────────────

/**
 * Generates multiple prompt variants for A/B testing different mockup styles.
 * Retrieves the ProductBrief from the database, then generates variants.
 *
 * @param briefId - The ProductBrief.id to generate variants for
 * @param count - Number of variants to generate (default: 3, max: 5)
 * @returns Array of mockup variants with different photographic styles
 */
export async function generateMockupVariants(
  briefId: string,
  count: number = 3,
): Promise<MockupVariant[]> {
  const safeCount = Math.min(Math.max(count, 1), 5);

  // Fetch the brief from DB
  let brief: {
    id: string;
    title: string;
    productType: string;
    siteId: string;
    tier: number;
    ontologyCategory: string;
    description: string;
  };

  try {
    const { prisma } = await import("@/lib/db");
    const dbBrief = await prisma.productBrief.findUnique({
      where: { id: briefId },
      select: {
        id: true,
        title: true,
        productType: true,
        siteId: true,
        tier: true,
        ontologyCategory: true,
        description: true,
      },
    });

    if (!dbBrief) {
      console.warn(`${LOG_PREFIX} ProductBrief not found: ${briefId}`);
      return [];
    }

    brief = dbBrief;
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} Failed to fetch ProductBrief ${briefId}:`,
      error instanceof Error ? error.message : error,
    );
    return [];
  }

  const brand = getBrandProfile(brief.siteId);
  const sceneElements = SITE_SCENE_ELEMENTS[brief.siteId] || "";
  const productVisual =
    PRODUCT_TYPE_VISUALS[brief.productType] || PRODUCT_TYPE_VISUALS.TEMPLATE;

  const prompt = `You are an expert product photographer creating A/B test variants for an Etsy listing.

PRODUCT:
- Title: "${brief.title}"
- Type: ${brief.productType}
- Category: ${brief.ontologyCategory}
- Description: ${brief.description.slice(0, 300)}
- Tier: ${brief.tier}

BRAND:
- Site: ${brand.name} (${brand.domain})
- Colors: primary=${brand.colors.primary}, secondary=${brand.colors.secondary}, accent=${brand.colors.accent}
- Scene elements: ${sceneElements}
- Product visual: ${productVisual}

Generate exactly ${safeCount} visually distinct mockup variants. Each variant should use a DIFFERENT photographic style:

1. "flat_lay" — overhead shot, clean surface, carefully arranged props
2. "lifestyle" — product in use, hands visible, real environment
3. "device_mockup" — product displayed on iPad/laptop screen, desk setting
4. "minimalist" — single product on solid/gradient background, dramatic lighting
5. "editorial" — magazine-style composition, lots of negative space, artistic

Pick ${safeCount} of the 5 styles above. Each variant needs a unique visual approach.

Respond with a JSON array:
[
  {
    "variantId": "v1",
    "label": "Short human-readable label (e.g. 'Flat Lay — Marble & Gold')",
    "prompt": "Detailed DALL-E/SD prompt (150-200 words). NO text overlays. 1200x800px.",
    "negativePrompt": "things to avoid",
    "style": "flat_lay",
    "description": "One-sentence description"
  }
]`;

  try {
    const variants = await generateJSON<MockupVariant[]>(prompt, {
      ...AI_OPTIONS,
      siteId: brief.siteId,
      systemPrompt:
        "You are a product photography art director. Respond with a JSON array only. No markdown.",
    });

    // Validate and sanitise
    if (!Array.isArray(variants)) {
      console.warn(`${LOG_PREFIX} AI returned non-array for variants of brief ${briefId}`);
      return [];
    }

    return variants.slice(0, safeCount).map((v, i) => ({
      variantId: v.variantId || `v${i + 1}`,
      label: v.label || `Variant ${i + 1}`,
      prompt: v.prompt || "",
      negativePrompt: v.negativePrompt || "",
      style: v.style || "flat_lay",
      description: v.description || "",
    }));
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} AI variant generation failed for brief ${briefId}:`,
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

// ─── 3. getStockMockupUrl ───────────────────────────────────────

/**
 * Returns a placeholder mockup URL from a curated set of template URLs
 * per product type. This is the zero-cost fallback when AI image
 * generation is not available or not yet configured.
 *
 * @param productType - Prisma ProductType enum value
 * @param tier - Product tier (1=premium, 2=standard, 3=basic)
 * @returns URL string and alt text for the stock mockup
 */
export function getStockMockupUrl(
  productType: string,
  tier: 1 | 2 | 3 = 1,
): StockMockupEntry {
  const typeEntry = STOCK_MOCKUPS[productType];
  if (!typeEntry) {
    return DEFAULT_STOCK_MOCKUP;
  }

  return typeEntry[tier] || typeEntry[1] || DEFAULT_STOCK_MOCKUP;
}

// ─── 4. saveMockupToListing ─────────────────────────────────────

/**
 * Updates an EtsyListingDraft's previewImages JSON array with a new image URL.
 * Appends the URL if the array has fewer than 10 images (Etsy's maximum).
 *
 * @param draftId - The EtsyListingDraft.id to update
 * @param imageUrl - The URL of the mockup image to add
 * @returns The updated previewImages array, or null on failure
 */
export async function saveMockupToListing(
  draftId: string,
  imageUrl: string,
): Promise<string[] | null> {
  try {
    const { prisma } = await import("@/lib/db");

    // Fetch current draft
    const draft = await prisma.etsyListingDraft.findUnique({
      where: { id: draftId },
      select: { previewImages: true },
    });

    if (!draft) {
      console.warn(`${LOG_PREFIX} EtsyListingDraft not found: ${draftId}`);
      return null;
    }

    // Parse existing images
    let currentImages: string[] = [];
    if (draft.previewImages) {
      try {
        const parsed = draft.previewImages as unknown;
        if (Array.isArray(parsed)) {
          currentImages = parsed.filter(
            (item): item is string => typeof item === "string",
          );
        }
      } catch (parseError) {
        console.warn(
          `${LOG_PREFIX} Failed to parse existing previewImages for draft ${draftId}:`,
          parseError instanceof Error ? parseError.message : parseError,
        );
      }
    }

    // Etsy allows max 10 images per listing
    if (currentImages.length >= 10) {
      console.warn(
        `${LOG_PREFIX} Draft ${draftId} already has 10 preview images (Etsy maximum). Skipping add.`,
      );
      return currentImages;
    }

    // Avoid duplicate URLs
    if (currentImages.includes(imageUrl)) {
      console.warn(`${LOG_PREFIX} Image URL already exists in draft ${draftId}. Skipping duplicate.`);
      return currentImages;
    }

    const updatedImages = [...currentImages, imageUrl];

    await prisma.etsyListingDraft.update({
      where: { id: draftId },
      data: {
        previewImages: updatedImages,
      },
    });

    return updatedImages;
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} Failed to save mockup to draft ${draftId}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

// ─── 5. generateProductCoverSvg ─────────────────────────────────

/**
 * Generates a simple SVG product cover with site branding colors,
 * product title, and type icon. Returns SVG string.
 *
 * This is a zero-dependency fallback that works without AI or
 * external image generation services. Suitable for placeholder
 * listing images during draft phase.
 *
 * Dimensions: 1200x800px (Etsy recommended listing image size)
 *
 * @param title - Product title to display on the cover
 * @param productType - Prisma ProductType enum value
 * @param siteId - The site ID for brand colors
 * @returns SVG markup string
 */
export function generateProductCoverSvg(
  title: string,
  productType: string,
  siteId: string,
): string {
  const brand = getBrandProfile(siteId);
  const ontologyItem = PRODUCT_ONTOLOGY.find((o) => o.productType === productType);
  const typeLabel = ontologyItem?.label || productType.replace(/_/g, " ");
  const iconPath = PRODUCT_ICONS[productType] || PRODUCT_ICONS.TEMPLATE;

  // Truncate title for display (max ~60 chars to fit nicely)
  const displayTitle =
    title.length > 60 ? title.slice(0, 57) + "..." : title;

  // Split title into lines if it's long (wrap at ~30 chars)
  const titleLines = wrapText(displayTitle, 30);

  // Generate a unique gradient ID to avoid collisions if multiple SVGs on one page
  const gradientId = `bg-grad-${siteId.replace(/[^a-z0-9]/gi, "")}-${productType}`;
  const borderGradientId = `border-grad-${gradientId}`;

  // Compute a lighter shade for the gradient end
  const gradientEnd = brand.colors.secondary;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <!-- Background gradient using site brand colors -->
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${brand.colors.primary}" />
      <stop offset="100%" stop-color="${gradientEnd}" />
    </linearGradient>

    <!-- Border gradient (slightly lighter) -->
    <linearGradient id="${borderGradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${brand.colors.accent}" stop-opacity="0.6" />
      <stop offset="50%" stop-color="${brand.colors.accent}" stop-opacity="1" />
      <stop offset="100%" stop-color="${brand.colors.accent}" stop-opacity="0.6" />
    </linearGradient>

    <!-- Subtle pattern overlay for texture -->
    <pattern id="dots-${gradientId}" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="10" cy="10" r="0.8" fill="white" opacity="0.08" />
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="1200" height="800" fill="url(#${gradientId})" rx="0" />
  <rect width="1200" height="800" fill="url(#dots-${gradientId})" />

  <!-- Decorative border (inset) -->
  <rect x="30" y="30" width="1140" height="740" rx="8" ry="8"
    fill="none" stroke="url(#${borderGradientId})" stroke-width="2" />
  <rect x="40" y="40" width="1120" height="720" rx="6" ry="6"
    fill="none" stroke="${brand.colors.accent}" stroke-width="0.5" stroke-opacity="0.3" />

  <!-- Product type icon (centred, upper area) -->
  <g transform="translate(564, 200) scale(3)" fill="white" fill-opacity="0.9">
    <path d="${iconPath}" />
  </g>

  <!-- Product title (centred) -->
  <text text-anchor="middle" fill="white" font-family="'${brand.fonts.heading.name}', 'Segoe UI', Arial, sans-serif" font-weight="700" letter-spacing="0.5">
${titleLines
  .map(
    (line, i) =>
      `    <tspan x="600" y="${420 + i * 52}" font-size="42">${escapeXml(line)}</tspan>`,
  )
  .join("\n")}
  </text>

  <!-- Product type subtitle -->
  <text x="600" y="${420 + titleLines.length * 52 + 30}" text-anchor="middle" fill="white" fill-opacity="0.7"
    font-family="'${brand.fonts.body.name}', 'Segoe UI', Arial, sans-serif" font-size="22" font-weight="400" letter-spacing="2"
    text-transform="uppercase">
    ${escapeXml(typeLabel.toUpperCase())}
  </text>

  <!-- Brand name (bottom) -->
  <text x="600" y="720" text-anchor="middle" fill="white" fill-opacity="0.5"
    font-family="'${brand.fonts.heading.name}', 'Segoe UI', Arial, sans-serif" font-size="18" font-weight="600" letter-spacing="3">
    ${escapeXml(brand.name.toUpperCase())}
  </text>

  <!-- Decorative accent line (below title area) -->
  <line x1="500" y1="${420 + titleLines.length * 52 + 55}" x2="700" y2="${420 + titleLines.length * 52 + 55}"
    stroke="${brand.colors.accent}" stroke-width="2" stroke-opacity="0.6" />
</svg>`;
}

// ─── SVG Helpers ────────────────────────────────────────────────

/**
 * Escape special XML characters to prevent SVG injection.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Simple word-wrap for SVG text (no built-in text wrapping in SVG).
 * Splits at word boundaries to fit within maxCharsPerLine.
 */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 > maxCharsPerLine && currentLine.length > 0) {
      lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += (currentLine ? " " : "") + word;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  // Maximum 3 lines to keep it visually clean
  if (lines.length > 3) {
    lines.length = 3;
    lines[2] = lines[2].slice(0, -3) + "...";
  }

  return lines;
}
