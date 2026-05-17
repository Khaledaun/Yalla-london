/**
 * Asset Manager — Product file and image management for commerce
 *
 * Handles:
 * - Product file uploads (digital downloads)
 * - Preview image uploads (up to 10 per listing)
 * - File size validation (20MB max per Etsy)
 * - URL generation for stored assets
 */

import { ETSY_LIMITS } from "./constants";

// ─── Types ────────────────────────────────────────────────

export interface AssetUploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface AssetValidation {
  valid: boolean;
  issues: string[];
}

// ─── File Validation ──────────────────────────────────────

/**
 * Validate a product file before upload.
 */
export function validateProductFile(
  fileName: string,
  fileSize: number,
): AssetValidation {
  const issues: string[] = [];

  // Check file size
  if (fileSize > ETSY_LIMITS.maxFileSizeBytes) {
    const maxMB = ETSY_LIMITS.maxFileSizeBytes / (1024 * 1024);
    const actualMB = (fileSize / (1024 * 1024)).toFixed(1);
    issues.push(
      `File size ${actualMB}MB exceeds Etsy limit of ${maxMB}MB`,
    );
  }

  // Check file extension
  const allowedExtensions = [
    ".pdf",
    ".zip",
    ".png",
    ".jpg",
    ".jpeg",
    ".svg",
    ".eps",
    ".ai",
    ".psd",
    ".tiff",
    ".gif",
  ];
  const ext = fileName.toLowerCase().split(".").pop();
  if (!ext || !allowedExtensions.includes(`.${ext}`)) {
    issues.push(
      `File type ".${ext}" not recommended. Supported: ${allowedExtensions.join(", ")}`,
    );
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Validate preview images for a listing.
 */
export function validatePreviewImages(
  images: { fileName: string; fileSize: number }[],
): AssetValidation {
  const issues: string[] = [];

  if (images.length > ETSY_LIMITS.imagesMax) {
    issues.push(
      `Too many images: ${images.length} (max ${ETSY_LIMITS.imagesMax})`,
    );
  }

  for (const img of images) {
    const ext = img.fileName.toLowerCase().split(".").pop();
    if (!ext || !["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
      issues.push(`"${img.fileName}" is not a supported image format`);
    }

    // Etsy recommends images at least 2000px wide, max 20MB
    if (img.fileSize > ETSY_LIMITS.maxFileSizeBytes) {
      issues.push(
        `"${img.fileName}" exceeds ${ETSY_LIMITS.maxFileSizeBytes / (1024 * 1024)}MB`,
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

// ─── Preview Images JSON Management ───────────────────────

export interface PreviewImage {
  url: string;
  fileName: string;
  position: number; // 1-10 (Etsy ordering)
  alt?: string;
}

/**
 * Update the preview images JSON for a listing draft.
 */
export async function updateDraftPreviewImages(
  draftId: string,
  images: PreviewImage[],
): Promise<void> {
  const { prisma } = await import("@/lib/db");

  // Validate image count
  if (images.length > ETSY_LIMITS.imagesMax) {
    throw new Error(
      `Cannot add more than ${ETSY_LIMITS.imagesMax} preview images`,
    );
  }

  // Sort by position
  const sorted = [...images].sort((a, b) => a.position - b.position);

  await prisma.etsyListingDraft.update({
    where: { id: draftId },
    data: {
      previewImages: sorted as unknown as Record<string, unknown>,
    },
  });
}

/**
 * Set the product file URL for a listing draft.
 */
export async function updateDraftFileUrl(
  draftId: string,
  fileUrl: string,
): Promise<void> {
  const { prisma } = await import("@/lib/db");

  await prisma.etsyListingDraft.update({
    where: { id: draftId },
    data: { fileUrl },
  });
}

// ─── Asset URL Helpers ────────────────────────────────────

/**
 * Generate a storage path for a product file.
 * Pattern: commerce/{siteId}/products/{briefId}/{fileName}
 */
export function getProductFilePath(
  siteId: string,
  briefId: string,
  fileName: string,
): string {
  return `commerce/${siteId}/products/${briefId}/${fileName}`;
}

/**
 * Generate a storage path for a preview image.
 * Pattern: commerce/{siteId}/previews/{briefId}/{position}_{fileName}
 */
export function getPreviewImagePath(
  siteId: string,
  briefId: string,
  position: number,
  fileName: string,
): string {
  return `commerce/${siteId}/previews/${briefId}/${position}_${fileName}`;
}

/**
 * Get all assets for a listing draft.
 */
export async function getDraftAssets(
  draftId: string,
): Promise<{
  fileUrl: string | null;
  previewImages: PreviewImage[];
}> {
  const { prisma } = await import("@/lib/db");

  const draft = await prisma.etsyListingDraft.findUnique({
    where: { id: draftId },
    select: { fileUrl: true, previewImages: true },
  });

  if (!draft) {
    return { fileUrl: null, previewImages: [] };
  }

  return {
    fileUrl: draft.fileUrl,
    previewImages: (draft.previewImages as PreviewImage[] | null) ?? [],
  };
}
