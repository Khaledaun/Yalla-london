/**
 * Canva MCP Render Engine
 *
 * Replaces the Remotion-based render pipeline (which can't run on Vercel
 * serverless — no Chromium) with Canva's design generation + export API
 * accessed through the Canva MCP server.
 *
 * Flow:
 *   1. VideoProject template → Canva design query (brand-aware)
 *   2. generate-design → candidate selection → create-design-from-candidate
 *   3. export-design as MP4 or PNG
 *   4. Store export URL + Canva design ID on VideoProject record
 *
 * This module provides utility functions that the video-studio API route
 * and admin cockpit invoke. The actual MCP tool calls are made by Claude
 * (the AI agent) — this module prepares the data and handles DB updates.
 *
 * For programmatic (non-agent) use, the module also provides a
 * `buildCanvaDesignQuery()` function that constructs the optimal Canva
 * generation prompt from a VideoProject's template data.
 */

import { prisma } from "@/lib/db";
import { getBrandProfile, type BrandProfile } from "@/lib/design/brand-provider";
import type {
  VideoCategory,
  VideoFormat,
  VideoTemplateConfig,
  VideoScene,
} from "@/lib/video/brand-video-engine";
import { FORMAT_DIMENSIONS } from "@/lib/video/brand-video-engine";

// ─── Types ──────────────────────────────────────────────────────

export interface CanvaRenderRequest {
  videoProjectId: string;
  siteId: string;
  /** Override: use an existing Canva design ID instead of generating */
  existingDesignId?: string;
  /** Export format — defaults to png for static, mp4 for stories */
  exportFormat?: "mp4" | "png" | "jpg";
}

export interface CanvaRenderResult {
  /** Canva design ID (e.g. "DAF1234abcd") */
  canvaDesignId: string;
  /** Download URL for the exported file */
  exportUrl: string;
  /** Export format used */
  format: "mp4" | "png" | "jpg";
  /** File size in bytes (if available) */
  size?: number;
}

/** Maps VideoFormat to the closest Canva design_type */
export type CanvaDesignType =
  | "instagram_post"
  | "your_story"
  | "facebook_post"
  | "twitter_post"
  | "youtube_thumbnail"
  | "youtube_banner"
  | "poster"
  | "flyer";

// ─── Format Mapping ─────────────────────────────────────────────

const VIDEO_FORMAT_TO_CANVA: Record<VideoFormat, CanvaDesignType> = {
  "instagram-reel": "your_story",
  "instagram-post": "instagram_post",
  "instagram-story": "your_story",
  "youtube-short": "your_story",
  "youtube-video": "youtube_thumbnail", // closest 16:9 option
  "tiktok": "your_story",
  "facebook-post": "facebook_post",
  "twitter-post": "twitter_post",
  "landscape-wide": "youtube_banner",
  "square": "instagram_post",
};

/** Which formats should export as MP4 (animated) vs PNG (static) */
const ANIMATED_FORMATS: Set<VideoFormat> = new Set([
  "instagram-reel",
  "instagram-story",
  "youtube-short",
  "tiktok",
  "your_story" as VideoFormat,
]);

// ─── Category to Content Description ────────────────────────────

const CATEGORY_DESCRIPTIONS: Record<VideoCategory, string> = {
  "destination-highlight":
    "A stunning travel destination showcase with scenic imagery, elegant typography, and a call-to-action to explore more",
  "blog-promo":
    "A blog post promotion card with headline, brief description, and a 'Read More' call-to-action",
  "hotel-showcase":
    "A luxury hotel feature with property imagery, star rating, key amenities, and booking call-to-action",
  "restaurant-feature":
    "A restaurant spotlight with cuisine photography, restaurant name, cuisine type, and reservation prompt",
  "experience-promo":
    "An activity or experience promotion with action imagery, experience name, price indicator, and booking link",
  "seasonal-campaign":
    "A seasonal holiday campaign (Ramadan, Eid, Christmas, New Year) with festive design, special offers, and celebration theme",
  "listicle-countdown":
    "A 'Top 5' countdown-style post with numbered items, brief descriptions, and eye-catching design",
  "travel-tip":
    "A quick travel tip or advice card with tip text, supporting icon or image, and clean minimal design",
  "before-after":
    "A before/after comparison or transformation reveal with split imagery and descriptive labels",
  "testimonial":
    "A customer review or quote showcase with testimonial text, author name, star rating, and elegant quotation design",
};

// ─── Core Functions ─────────────────────────────────────────────

/**
 * Build the Canva design generation query from a VideoProject's template data.
 *
 * This constructs a detailed prompt that Canva's AI design generator
 * can use to produce a branded design matching the video template.
 */
export function buildCanvaDesignQuery(
  template: VideoTemplateConfig,
  brand: BrandProfile,
  options?: {
    title?: string;
    subtitle?: string;
    locale?: "en" | "ar";
  },
): { query: string; designType: CanvaDesignType } {
  const category = template.category;
  const format = template.format;
  const designType = VIDEO_FORMAT_TO_CANVA[format] || "instagram_post";

  // Extract text content from template scenes
  const textElements = extractTextFromScenes(template.scenes);
  const title = options?.title || textElements.title || template.name;
  const subtitle = options?.subtitle || textElements.subtitle || "";

  // Build the query with brand context
  const brandContext = [
    `Brand: ${brand.name}`,
    `Primary color: ${brand.colors.primary}`,
    `Secondary color: ${brand.colors.secondary}`,
    `Accent color: ${brand.colors.accent}`,
    `Style: Luxury travel, elegant, sophisticated`,
  ].join(". ");

  const categoryDesc = CATEGORY_DESCRIPTIONS[category] || CATEGORY_DESCRIPTIONS["destination-highlight"];

  const locale = options?.locale || "en";
  const langDirective = locale === "ar"
    ? "Text should be in Arabic with right-to-left layout."
    : "Text should be in English.";

  const query = [
    `Create a ${categoryDesc}.`,
    `Title: "${title}"${subtitle ? `. Subtitle: "${subtitle}"` : ""}.`,
    brandContext,
    `Background: Use rich, warm tones complementing ${brand.colors.primary}.`,
    langDirective,
    `The design should feel premium and luxurious, suitable for a high-end travel brand.`,
    `Include the brand name "${brand.name}" subtly in the design.`,
  ].join(" ");

  return { query, designType };
}

/**
 * Get the appropriate Canva design type for a video format.
 */
export function getCanvaDesignType(format: VideoFormat): CanvaDesignType {
  return VIDEO_FORMAT_TO_CANVA[format] || "instagram_post";
}

/**
 * Determine the best export format for a video format.
 */
export function getDefaultExportFormat(format: VideoFormat): "mp4" | "png" {
  return ANIMATED_FORMATS.has(format) ? "mp4" : "png";
}

/**
 * Update a VideoProject record after successful Canva render.
 */
export async function updateProjectWithCanvaResult(
  videoProjectId: string,
  result: CanvaRenderResult,
): Promise<void> {
  await prisma.videoProject.update({
    where: { id: videoProjectId },
    data: {
      status: "rendered",
      exportedUrl: result.exportUrl,
      // Store Canva design ID in compositionCode field for reference
      // (prefixed to distinguish from Remotion code)
      compositionCode: `canva:${result.canvaDesignId}`,
      updatedAt: new Date(),
    },
  });
}

/**
 * Mark a VideoProject as failed after Canva render failure.
 */
export async function markProjectFailed(
  videoProjectId: string,
  error: string,
): Promise<void> {
  await prisma.videoProject.update({
    where: { id: videoProjectId },
    data: {
      status: "failed",
      updatedAt: new Date(),
    },
  });
  console.error(`[canva-render] Failed for ${videoProjectId}: ${error}`);
}

/**
 * Prepare a VideoProject for Canva rendering.
 * Returns the query and design type needed for `generate-design` MCP call.
 */
export async function prepareCanvaRender(
  videoProjectId: string,
): Promise<{
  project: {
    id: string;
    title: string;
    site: string;
    category: string;
    format: string;
    language: string;
    scenes: unknown;
    width: number;
    height: number;
  };
  query: string;
  designType: CanvaDesignType;
  exportFormat: "mp4" | "png";
  brand: BrandProfile;
}> {
  const project = await prisma.videoProject.findUnique({
    where: { id: videoProjectId },
  });

  if (!project) {
    throw new Error(`VideoProject "${videoProjectId}" not found`);
  }

  // Get brand profile for the site
  const brand = getBrandProfile(project.site);

  // Build template config from project data
  const template: VideoTemplateConfig = {
    id: project.id,
    name: project.title,
    nameAr: project.title,
    category: project.category as VideoCategory,
    format: project.format as VideoFormat,
    durationFrames: project.duration * project.fps,
    fps: project.fps,
    width: project.width,
    height: project.height,
    scenes: (project.scenes as VideoScene[]) || [],
    siteId: project.site,
    brand: undefined,
  };

  const { query, designType } = buildCanvaDesignQuery(template, brand, {
    title: project.title,
    locale: project.language as "en" | "ar",
  });

  const exportFormat = getDefaultExportFormat(project.format as VideoFormat);

  // Mark as queued
  await prisma.videoProject.update({
    where: { id: videoProjectId },
    data: { status: "queued", updatedAt: new Date() },
  });

  return {
    project: {
      id: project.id,
      title: project.title,
      site: project.site,
      category: project.category,
      format: project.format,
      language: project.language,
      scenes: project.scenes,
      width: project.width,
      height: project.height,
    },
    query,
    designType,
    exportFormat,
    brand,
  };
}

/**
 * Get rendering instructions for the Canva MCP workflow.
 *
 * Returns a step-by-step guide that the AI agent (Claude) can follow
 * to render a VideoProject using Canva MCP tools.
 */
export function getCanvaRenderInstructions(
  projectId: string,
  query: string,
  designType: CanvaDesignType,
  exportFormat: "mp4" | "png",
): string {
  return [
    `## Canva Render Instructions for VideoProject ${projectId}`,
    "",
    "### Step 1: Generate Design",
    `Call \`mcp__Canva__generate-design\` with:`,
    `- design_type: "${designType}"`,
    `- query: "${query}"`,
    "",
    "### Step 2: Create Design from Candidate",
    "Select the best candidate and call `mcp__Canva__create-design-from-candidate` with the job_id and candidate_id.",
    "",
    "### Step 3: Export Design",
    `Call \`mcp__Canva__export-design\` with:`,
    `- format.type: "${exportFormat}"`,
    exportFormat === "mp4" ? `- format.quality: "horizontal_1080p"` : `- format.width: 1080`,
    "",
    "### Step 4: Update Database",
    `Call the video-studio API: POST /api/admin/video-studio`,
    `with action: "canva-complete"`,
    `and body: { videoProjectId: "${projectId}", canvaDesignId, exportUrl, format: "${exportFormat}" }`,
  ].join("\n");
}

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Extract title and subtitle text from VideoScene elements.
 */
function extractTextFromScenes(
  scenes: VideoScene[],
): { title: string; subtitle: string } {
  let title = "";
  let subtitle = "";

  if (!scenes || !Array.isArray(scenes)) {
    return { title, subtitle };
  }

  for (const scene of scenes) {
    if (!scene.elements || !Array.isArray(scene.elements)) continue;

    for (const el of scene.elements) {
      if (el.type !== "text" || !el.text) continue;

      const text = el.text.content || "";
      if (!text.trim()) continue;

      // Heuristic: largest font size is the title
      if (!title || (el.text.fontSize && el.text.fontSize > 36)) {
        if (!title) {
          title = text;
        } else if (!subtitle) {
          subtitle = text;
        }
      } else if (!subtitle) {
        subtitle = text;
      }
    }
  }

  return { title, subtitle };
}

/**
 * Check if a compositionCode indicates it was rendered via Canva.
 */
export function isCanvaRendered(compositionCode: string | null): boolean {
  return compositionCode?.startsWith("canva:") ?? false;
}

/**
 * Extract the Canva design ID from a compositionCode.
 */
export function extractCanvaDesignId(compositionCode: string | null): string | null {
  if (!compositionCode?.startsWith("canva:")) return null;
  return compositionCode.slice(6); // Remove "canva:" prefix
}
