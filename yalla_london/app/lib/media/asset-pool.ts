/**
 * Per-Site Media Asset Pool
 *
 * Manages media assets scoped by site_id. Provides:
 * - Upload with auto-categorization via AI vision
 * - Per-site folder organization
 * - AI-powered metadata enrichment (alt text, tags, categories)
 * - Browsing/filtering by site, category, folder, tags
 */

import { uploadFile, getPublicUrl, deleteFile } from "@/lib/s3";

// ─── Types ───────────────────────────────────────────────────────

export type AssetCategory =
  | "hero"
  | "blog"
  | "gallery"
  | "social"
  | "background"
  | "logo"
  | "icon"
  | "product"
  | "uncategorized";

export type ContentType =
  | "landscape"
  | "cityscape"
  | "food"
  | "interior"
  | "person"
  | "activity"
  | "product"
  | "abstract"
  | "architecture"
  | "nature";

export type AssetMood =
  | "luxury"
  | "casual"
  | "vibrant"
  | "serene"
  | "dramatic"
  | "cozy"
  | "professional";

export interface AssetUploadResult {
  asset: {
    id: string;
    url: string;
    filename: string;
    site_id: string | null;
    category: AssetCategory;
    folder: string | null;
  };
  enrichment: {
    status: "completed" | "pending" | "failed";
    alt_text?: string;
    tags?: string[];
    content_type?: ContentType;
    mood?: AssetMood;
    objects?: string[];
  } | null;
}

export interface AssetPoolFilter {
  siteId?: string;
  category?: AssetCategory;
  folder?: string;
  fileType?: "image" | "video" | "document";
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AssetPoolStats {
  total: number;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
  enriched: number;
  pending: number;
  totalSize: number;
}

// ─── AI Vision Analysis ──────────────────────────────────────────

const ENRICHMENT_PROMPT = `Analyze this image and return a JSON object with the following structure. Be precise.

Return ONLY valid JSON, no markdown:
{
  "alt_text": "Descriptive alt text for accessibility (50-100 chars)",
  "title": "Short descriptive title (3-6 words)",
  "description": "Detailed description of the image content (1-2 sentences)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "content_type": "landscape" | "cityscape" | "food" | "interior" | "person" | "activity" | "product" | "abstract" | "architecture" | "nature",
  "use_case": "hero" | "blog-featured" | "thumbnail" | "gallery" | "social" | "background",
  "mood": "luxury" | "casual" | "vibrant" | "serene" | "dramatic" | "cozy" | "professional",
  "objects": ["object1", "object2", "object3"],
  "text_in_image": "any text visible in the image or null",
  "destination_tags": ["location-related", "category-related", "cuisine-related"],
  "colors": {
    "dominant": "#hex",
    "secondary": "#hex",
    "accent": "#hex"
  }
}`;

interface AIEnrichmentResult {
  alt_text: string;
  title: string;
  description: string;
  tags: string[];
  content_type: ContentType;
  use_case: string;
  mood: AssetMood;
  objects: string[];
  text_in_image: string | null;
  destination_tags: string[];
  colors: { dominant: string; secondary: string; accent: string };
}

/**
 * Analyze an image using AI vision to extract metadata
 */
export async function analyzeImageWithAI(
  imageBase64: string,
  mimeType: string,
): Promise<AIEnrichmentResult | null> {
  // Try Anthropic Claude vision
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 1500,
          messages: [{
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mimeType, data: imageBase64 },
              },
              { type: "text", text: ENRICHMENT_PROMPT },
            ],
          }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content?.[0]?.text || "";
        return parseEnrichmentJSON(text);
      }
    } catch (e) {
      console.warn("Claude vision enrichment failed:", e);
    }
  }

  // Try OpenAI vision
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 1500,
          messages: [{
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
              { type: "text", text: ENRICHMENT_PROMPT },
            ],
          }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || "";
        return parseEnrichmentJSON(text);
      }
    } catch (e) {
      console.warn("OpenAI vision enrichment failed:", e);
    }
  }

  return null;
}

function parseEnrichmentJSON(text: string): AIEnrichmentResult | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    // Validate required fields
    if (!parsed.alt_text || !parsed.tags) return null;
    return parsed as AIEnrichmentResult;
  } catch {
    return null;
  }
}

// ─── Asset Pool Service ──────────────────────────────────────────

/**
 * Upload a media asset to a site's asset pool with optional AI enrichment
 */
export async function uploadToAssetPool(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  options: {
    siteId?: string;
    category?: AssetCategory;
    folder?: string;
    enrichWithAI?: boolean;
  } = {},
): Promise<AssetUploadResult> {
  const { siteId, category = "uncategorized", folder, enrichWithAI = true } = options;

  // Build S3 path with site-scoped folder structure
  const sitePrefix = siteId || "shared";
  const folderPath = folder ? `/${folder}` : "";
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const s3FileName = `media/${sitePrefix}${folderPath}/${timestamp}_${sanitizedName}`;

  // Upload to S3
  const cloudStoragePath = await uploadFile(buffer, s3FileName);
  const publicUrl = getPublicUrl(cloudStoragePath);

  // Determine file type
  const fileType = mimeType.startsWith("image/") ? "image"
    : mimeType.startsWith("video/") ? "video"
    : "document";

  // Get dimensions for images
  let width: number | undefined;
  let height: number | undefined;
  let responsiveUrls: Record<string, string> | undefined;

  if (fileType === "image") {
    try {
      const sharp = (await import("sharp")).default;
      const metadata = await sharp(buffer).metadata();
      width = metadata.width;
      height = metadata.height;

      // Generate responsive variants
      responsiveUrls = await generateVariants(buffer, cloudStoragePath);
    } catch (e) {
      console.warn("Image processing failed:", e);
    }
  }

  // Save to database
  const { prisma } = await import("@/lib/db");
  const asset = await prisma.mediaAsset.create({
    data: {
      filename: s3FileName,
      original_name: fileName,
      cloud_storage_path: cloudStoragePath,
      url: publicUrl,
      file_type: fileType,
      mime_type: mimeType,
      file_size: buffer.length,
      width,
      height,
      site_id: siteId || null,
      category: category,
      folder: folder || null,
      responsive_urls: responsiveUrls || undefined,
      tags: [],
    },
  });

  // AI enrichment (async, non-blocking for images)
  let enrichment: AssetUploadResult["enrichment"] = null;

  if (enrichWithAI && fileType === "image") {
    try {
      const imageBase64 = buffer.toString("base64");
      const aiResult = await analyzeImageWithAI(imageBase64, mimeType);

      if (aiResult) {
        // Update asset with AI-generated metadata
        await prisma.mediaAsset.update({
          where: { id: asset.id },
          data: {
            alt_text: aiResult.alt_text,
            title: aiResult.title,
            description: aiResult.description,
            tags: aiResult.tags,
            category: aiResult.use_case || category,
          },
        });

        // Create enrichment record
        await prisma.mediaEnrichment.create({
          data: {
            media_id: asset.id,
            alt_text_enhanced: aiResult.alt_text,
            title_enhanced: aiResult.title,
            description_enhanced: aiResult.description,
            tags_ai: aiResult.tags,
            content_type: aiResult.content_type,
            use_case: aiResult.use_case,
            mood: aiResult.mood,
            destination_tags: aiResult.destination_tags,
            objects_detected: aiResult.objects,
            text_detected: aiResult.text_in_image,
            color_palette: aiResult.colors,
            processing_status: "completed",
            ai_metadata: {
              provider: process.env.ANTHROPIC_API_KEY ? "claude" : "openai",
              analyzed_at: new Date().toISOString(),
            },
          },
        });

        enrichment = {
          status: "completed",
          alt_text: aiResult.alt_text,
          tags: aiResult.tags,
          content_type: aiResult.content_type,
          mood: aiResult.mood,
          objects: aiResult.objects,
        };
      } else {
        // Create pending enrichment record
        await prisma.mediaEnrichment.create({
          data: {
            media_id: asset.id,
            processing_status: "failed",
            ai_metadata: { error: "No AI provider returned results" },
          },
        });
        enrichment = { status: "failed" };
      }
    } catch (e) {
      console.warn("AI enrichment failed:", e);
      enrichment = { status: "failed" };
    }
  }

  return {
    asset: {
      id: asset.id,
      url: publicUrl,
      filename: s3FileName,
      site_id: siteId || null,
      category: category,
      folder: folder || null,
    },
    enrichment,
  };
}

/**
 * List assets in a site's media pool with filtering
 */
export async function listAssetPool(filter: AssetPoolFilter) {
  const { prisma } = await import("@/lib/db");

  const where: Record<string, unknown> = { deletedAt: null };

  if (filter.siteId) {
    // Include both site-specific AND shared assets
    where.OR = [{ site_id: filter.siteId }, { site_id: null }];
  }
  if (filter.category) where.category = filter.category;
  if (filter.folder) where.folder = { startsWith: filter.folder };
  if (filter.fileType) where.file_type = filter.fileType;
  if (filter.tags && filter.tags.length > 0) {
    where.tags = { hasSome: filter.tags };
  }
  if (filter.search) {
    where.OR = [
      { title: { contains: filter.search, mode: "insensitive" } },
      { alt_text: { contains: filter.search, mode: "insensitive" } },
      { original_name: { contains: filter.search, mode: "insensitive" } },
    ];
  }

  const [assets, total] = await Promise.all([
    prisma.mediaAsset.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: filter.limit || 24,
      skip: filter.offset || 0,
    }),
    prisma.mediaAsset.count({ where }),
  ]);

  return { assets, total, hasMore: (filter.offset || 0) + assets.length < total };
}

/**
 * Get stats for a site's media pool
 */
export async function getAssetPoolStats(siteId?: string): Promise<AssetPoolStats> {
  const { prisma } = await import("@/lib/db");

  const where: Record<string, unknown> = { deletedAt: null };
  if (siteId) {
    where.OR = [{ site_id: siteId }, { site_id: null }];
  }

  const [total, byCategory, byType, enriched, pending, sizeResult] = await Promise.all([
    prisma.mediaAsset.count({ where }),
    prisma.mediaAsset.groupBy({ by: ["category"], where, _count: true }),
    prisma.mediaAsset.groupBy({ by: ["file_type"], where, _count: true }),
    prisma.mediaEnrichment.count({ where: { processing_status: "completed" } }),
    prisma.mediaEnrichment.count({ where: { processing_status: "pending" } }),
    prisma.mediaAsset.aggregate({ where, _sum: { file_size: true } }),
  ]);

  return {
    total,
    byCategory: Object.fromEntries(
      (byCategory as Array<{ category: string | null; _count: number }>).map((g) => [g.category || "uncategorized", g._count]),
    ),
    byType: Object.fromEntries(
      (byType as Array<{ file_type: string; _count: number }>).map((g) => [g.file_type, g._count]),
    ),
    enriched,
    pending,
    totalSize: sizeResult._sum.file_size || 0,
  };
}

/**
 * Bulk enrich un-enriched assets with AI
 */
export async function bulkEnrichAssets(
  siteId?: string,
  limit: number = 10,
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const { prisma } = await import("@/lib/db");

  // Find images without enrichment
  const where: Record<string, unknown> = {
    deletedAt: null,
    file_type: "image",
    NOT: {
      id: {
        in: (await prisma.mediaEnrichment.findMany({
          where: { processing_status: "completed" },
          select: { media_id: true },
        })).map((e) => e.media_id),
      },
    },
  };
  if (siteId) where.site_id = siteId;

  const assets = await prisma.mediaAsset.findMany({
    where,
    take: limit,
    orderBy: { created_at: "desc" },
  });

  let succeeded = 0;
  let failed = 0;

  for (const asset of assets) {
    try {
      // Fetch the image from S3 URL
      const response = await fetch(asset.url);
      if (!response.ok) {
        failed++;
        continue;
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());
      const imageBase64 = imageBuffer.toString("base64");
      const aiResult = await analyzeImageWithAI(imageBase64, asset.mime_type);

      if (aiResult) {
        await prisma.mediaAsset.update({
          where: { id: asset.id },
          data: {
            alt_text: aiResult.alt_text,
            title: aiResult.title,
            description: aiResult.description,
            tags: aiResult.tags,
            category: aiResult.use_case || asset.category || "uncategorized",
          },
        });

        await prisma.mediaEnrichment.upsert({
          where: { media_id: asset.id },
          create: {
            media_id: asset.id,
            alt_text_enhanced: aiResult.alt_text,
            title_enhanced: aiResult.title,
            description_enhanced: aiResult.description,
            tags_ai: aiResult.tags,
            content_type: aiResult.content_type,
            use_case: aiResult.use_case,
            mood: aiResult.mood,
            destination_tags: aiResult.destination_tags,
            objects_detected: aiResult.objects,
            text_detected: aiResult.text_in_image,
            color_palette: aiResult.colors,
            processing_status: "completed",
            ai_metadata: {
              provider: process.env.ANTHROPIC_API_KEY ? "claude" : "openai",
              analyzed_at: new Date().toISOString(),
              bulk_enrichment: true,
            },
          },
          update: {
            alt_text_enhanced: aiResult.alt_text,
            title_enhanced: aiResult.title,
            description_enhanced: aiResult.description,
            tags_ai: aiResult.tags,
            content_type: aiResult.content_type,
            use_case: aiResult.use_case,
            mood: aiResult.mood,
            destination_tags: aiResult.destination_tags,
            objects_detected: aiResult.objects,
            text_detected: aiResult.text_in_image,
            color_palette: aiResult.colors,
            processing_status: "completed",
          },
        });

        succeeded++;
      } else {
        failed++;
      }
    } catch (e) {
      console.warn(`Enrichment failed for asset ${asset.id}:`, e);
      failed++;
    }
  }

  return { processed: assets.length, succeeded, failed };
}

/**
 * Delete an asset and its S3 files
 */
export async function deleteAsset(assetId: string): Promise<void> {
  const { prisma } = await import("@/lib/db");

  const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
  if (!asset) throw new Error("Asset not found");

  // Delete from S3
  try {
    await deleteFile(asset.cloud_storage_path);
    // Delete responsive variants
    if (asset.responsive_urls) {
      const variants = asset.responsive_urls as Record<string, string>;
      for (const url of Object.values(variants)) {
        try {
          const key = url.split(".amazonaws.com/")[1];
          if (key) await deleteFile(key);
        } catch { /* ignore variant deletion errors */ }
      }
    }
  } catch (e) {
    console.warn("S3 deletion failed:", e);
  }

  // Delete enrichment record
  await prisma.mediaEnrichment.deleteMany({ where: { media_id: assetId } });

  // Soft delete the asset
  await prisma.mediaAsset.update({
    where: { id: assetId },
    data: { deletedAt: new Date() },
  });
}

// ─── Image Variant Generation ────────────────────────────────────

async function generateVariants(
  buffer: Buffer,
  originalPath: string,
): Promise<Record<string, string>> {
  const sharp = (await import("sharp")).default;
  const sizes = [
    { width: 400, suffix: "sm" },
    { width: 800, suffix: "md" },
    { width: 1200, suffix: "lg" },
  ];

  const variants: Record<string, string> = {};

  for (const size of sizes) {
    try {
      const webpBuffer = await sharp(buffer)
        .resize(size.width, null, { withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const webpName = originalPath.replace(/\.[^.]+$/, `_${size.suffix}.webp`).split("/").pop() || "webp";
      const webpKey = await uploadFile(webpBuffer, webpName);
      variants[`webp_${size.suffix}`] = getPublicUrl(webpKey);
    } catch (e) {
      console.warn(`Variant generation failed for ${size.suffix}:`, e);
    }
  }

  return variants;
}
