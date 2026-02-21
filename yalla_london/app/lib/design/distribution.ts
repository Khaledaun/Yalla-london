/**
 * Design Distribution Module
 *
 * Handles distributing a finished design to various targets across the platform:
 * social posts, email headers, blog featured images, PDF covers, homepage heroes,
 * and direct downloads.
 *
 * Usage:
 *   import { distributeDesign, getDistributionTargetsForDesign } from '@/lib/design/distribution'
 *
 *   const results = await distributeDesign(designId, [
 *     { type: 'blog-featured', articleId: 'clxyz...' },
 *     { type: 'download', format: 'png' },
 *   ])
 */

import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DistributionTarget =
  | { type: "social-post"; platform: string; caption?: string; scheduledAt?: Date }
  | { type: "email-header"; templateId?: string }
  | { type: "blog-featured"; articleId: string }
  | { type: "pdf-cover"; guideId: string }
  | { type: "homepage-hero"; moduleId?: string }
  | { type: "download"; format: "png" | "svg" | "pdf" };

export interface DistributionResult {
  target: DistributionTarget;
  success: boolean;
  /** ID of the created or updated record */
  recordId?: string;
  /** URL of the exported file */
  url?: string;
  /** Error description when success is false */
  error?: string;
}

// ---------------------------------------------------------------------------
// Internal: fetch and validate the Design record
// ---------------------------------------------------------------------------

interface DesignRecord {
  id: string;
  title: string;
  type: string;
  site: string;
  thumbnail: string | null;
  exportedUrls: Record<string, string> | null;
}

async function fetchDesign(designId: string): Promise<DesignRecord> {
  const design = await prisma.design.findUnique({
    where: { id: designId },
  });

  if (!design) {
    throw new Error(`Design not found: ${designId}`);
  }

  // exportedUrls is stored as Json — coerce to a typed object
  const exportedUrls =
    design.exportedUrls && typeof design.exportedUrls === "object"
      ? (design.exportedUrls as Record<string, string>)
      : null;

  return {
    id: design.id,
    title: design.title,
    type: design.type,
    site: design.site,
    thumbnail: design.thumbnail,
    exportedUrls,
  };
}

/**
 * Resolve the best available image URL from a design.
 * Prefers the exported PNG, then falls back to thumbnail.
 */
function resolveImageUrl(design: DesignRecord): string | null {
  return design.exportedUrls?.png ?? design.thumbnail ?? null;
}

// ---------------------------------------------------------------------------
// Per-target distribution handlers
// ---------------------------------------------------------------------------

async function distributeSocialPost(
  design: DesignRecord,
  target: Extract<DistributionTarget, { type: "social-post" }>
): Promise<DistributionResult> {
  const imageUrl = resolveImageUrl(design);

  if (!imageUrl) {
    return {
      target,
      success: false,
      error: "Design has no exported PNG or thumbnail to use as social media image",
    };
  }

  try {
    const record = await prisma.scheduledContent.create({
      data: {
        title: design.title,
        content: target.caption ?? "",
        content_type: "social_post",
        language: "en",
        platform: target.platform,
        scheduled_time: target.scheduledAt ?? new Date(),
        status: target.scheduledAt ? "pending" : "pending",
        metadata: {
          designId: design.id,
          imageUrl,
        },
        site_id: design.site,
      },
    });

    return {
      target,
      success: true,
      recordId: record.id,
      url: imageUrl,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn(`[design-distribution] social-post failed for design ${design.id}: ${message}`);
    return { target, success: false, error: message };
  }
}

async function distributeEmailHeader(
  design: DesignRecord,
  target: Extract<DistributionTarget, { type: "email-header" }>
): Promise<DistributionResult> {
  const imageUrl = resolveImageUrl(design);

  if (!imageUrl) {
    return {
      target,
      success: false,
      error: "Design has no exported PNG or thumbnail to use as email header",
    };
  }

  try {
    // If a specific templateId is provided, update that template.
    // Otherwise find the default template for the design's site.
    let templateId = target.templateId;

    if (!templateId) {
      const defaultTemplate = await prisma.emailTemplate.findFirst({
        where: { site: design.site, isDefault: true },
        select: { id: true },
      });

      if (!defaultTemplate) {
        return {
          target,
          success: false,
          error: `No default EmailTemplate found for site "${design.site}" and no templateId provided`,
        };
      }
      templateId = defaultTemplate.id;
    }

    const updated = await prisma.emailTemplate.update({
      where: { id: templateId },
      data: {
        thumbnail: imageUrl,
        // Store design reference in jsonContent so the email renderer can
        // pull the header image at send-time.
        jsonContent: {
          headerImageUrl: imageUrl,
          headerDesignId: design.id,
        },
      },
    });

    return {
      target,
      success: true,
      recordId: updated.id,
      url: imageUrl,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn(`[design-distribution] email-header failed for design ${design.id}: ${message}`);
    return { target, success: false, error: message };
  }
}

async function distributeBlogFeatured(
  design: DesignRecord,
  target: Extract<DistributionTarget, { type: "blog-featured" }>
): Promise<DistributionResult> {
  const imageUrl = resolveImageUrl(design);

  if (!imageUrl) {
    return {
      target,
      success: false,
      error: "Design has no exported PNG or thumbnail to use as featured image",
    };
  }

  try {
    const post = await prisma.blogPost.findUnique({
      where: { id: target.articleId },
      select: { id: true },
    });

    if (!post) {
      return {
        target,
        success: false,
        error: `BlogPost not found: ${target.articleId}`,
      };
    }

    const updated = await prisma.blogPost.update({
      where: { id: target.articleId },
      data: {
        featured_image: imageUrl,
        // Also set og_image_id to the design ID so the OG image resolver
        // can trace back to the design record.
        og_image_id: design.id,
      },
    });

    return {
      target,
      success: true,
      recordId: updated.id,
      url: imageUrl,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn(`[design-distribution] blog-featured failed for design ${design.id}: ${message}`);
    return { target, success: false, error: message };
  }
}

async function distributePdfCover(
  design: DesignRecord,
  target: Extract<DistributionTarget, { type: "pdf-cover" }>
): Promise<DistributionResult> {
  try {
    const guide = await prisma.pdfGuide.findUnique({
      where: { id: target.guideId },
      select: { id: true },
    });

    if (!guide) {
      return {
        target,
        success: false,
        error: `PdfGuide not found: ${target.guideId}`,
      };
    }

    const updated = await prisma.pdfGuide.update({
      where: { id: target.guideId },
      data: {
        coverDesignId: design.id,
      },
    });

    return {
      target,
      success: true,
      recordId: updated.id,
      url: resolveImageUrl(design) ?? undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn(`[design-distribution] pdf-cover failed for design ${design.id}: ${message}`);
    return { target, success: false, error: message };
  }
}

async function distributeHomepageHero(
  design: DesignRecord,
  target: Extract<DistributionTarget, { type: "homepage-hero" }>
): Promise<DistributionResult> {
  const imageUrl = resolveImageUrl(design);

  if (!imageUrl) {
    return {
      target,
      success: false,
      error: "Design has no exported PNG or thumbnail to use as homepage hero",
    };
  }

  try {
    // Find the hero block. If a moduleId is specified, use it directly.
    // Otherwise look for the first "hero"-type block on this site's homepage.
    let blockId = target.moduleId;

    if (!blockId) {
      const heroBlock = await prisma.homepageBlock.findFirst({
        where: { type: "hero", enabled: true },
        orderBy: { position: "asc" },
        select: { id: true },
      });

      if (!heroBlock) {
        return {
          target,
          success: false,
          error: "No active hero HomepageBlock found and no moduleId provided",
        };
      }
      blockId = heroBlock.id;
    }

    // Merge the design reference into the block's config JSON
    const existing = await prisma.homepageBlock.findUnique({
      where: { id: blockId },
      select: { id: true, config: true },
    });

    if (!existing) {
      return {
        target,
        success: false,
        error: `HomepageBlock not found: ${blockId}`,
      };
    }

    const currentConfig =
      existing.config && typeof existing.config === "object"
        ? (existing.config as Record<string, unknown>)
        : {};

    const updated = await prisma.homepageBlock.update({
      where: { id: blockId },
      data: {
        config: {
          ...currentConfig,
          heroImageUrl: imageUrl,
          heroDesignId: design.id,
        },
      },
    });

    return {
      target,
      success: true,
      recordId: updated.id,
      url: imageUrl,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn(`[design-distribution] homepage-hero failed for design ${design.id}: ${message}`);
    return { target, success: false, error: message };
  }
}

async function distributeDownload(
  design: DesignRecord,
  target: Extract<DistributionTarget, { type: "download" }>
): Promise<DistributionResult> {
  const url = design.exportedUrls?.[target.format] ?? null;

  if (!url) {
    return {
      target,
      success: false,
      error: `No exported ${target.format.toUpperCase()} URL available for this design`,
    };
  }

  return {
    target,
    success: true,
    recordId: design.id,
    url,
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Distribute a finished design to one or more targets across the platform.
 *
 * Returns a result for every target — even if one fails, the rest still run.
 */
export async function distributeDesign(
  designId: string,
  targets: DistributionTarget[]
): Promise<DistributionResult[]> {
  if (!targets.length) {
    return [];
  }

  let design: DesignRecord;
  try {
    design = await fetchDesign(designId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // Return a failure result for every requested target
    return targets.map((target) => ({
      target,
      success: false,
      error: message,
    }));
  }

  const results: DistributionResult[] = [];

  for (const target of targets) {
    try {
      let result: DistributionResult;

      switch (target.type) {
        case "social-post":
          result = await distributeSocialPost(design, target);
          break;
        case "email-header":
          result = await distributeEmailHeader(design, target);
          break;
        case "blog-featured":
          result = await distributeBlogFeatured(design, target);
          break;
        case "pdf-cover":
          result = await distributePdfCover(design, target);
          break;
        case "homepage-hero":
          result = await distributeHomepageHero(design, target);
          break;
        case "download":
          result = await distributeDownload(design, target);
          break;
        default: {
          // Exhaustive check — TypeScript will flag if a target type is unhandled
          const _exhaustive: never = target;
          result = {
            target: _exhaustive,
            success: false,
            error: "Unknown distribution target type",
          };
        }
      }

      results.push(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.warn(
        `[design-distribution] Unexpected error distributing to ${target.type} for design ${designId}: ${message}`
      );
      results.push({ target, success: false, error: message });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Helper: infer relevant distribution targets from a design's metadata
// ---------------------------------------------------------------------------

/** Design type → which distribution target types are applicable */
const TARGET_MAP: Record<string, DistributionTarget["type"][]> = {
  // Design.type values from the schema: canvas, social-post, email-header,
  // pdf-cover, logo, banner
  "social-post": ["social-post", "download"],
  "email-header": ["email-header", "download"],
  "pdf-cover": ["pdf-cover", "download"],
  banner: ["homepage-hero", "blog-featured", "download"],
  logo: ["download"],
  canvas: ["social-post", "email-header", "blog-featured", "homepage-hero", "pdf-cover", "download"],
};

/**
 * Returns which distribution target types are relevant for a given design
 * based on its `type` field.
 *
 * A "canvas" design (generic) can go anywhere.
 * A "social-post" design logically maps to social-post + download.
 * Etc.
 */
export function getDistributionTargetsForDesign(design: {
  type: string;
  site: string;
}): DistributionTarget["type"][] {
  return TARGET_MAP[design.type] ?? ["download"];
}
