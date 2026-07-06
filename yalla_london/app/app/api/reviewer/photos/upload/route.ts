export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join, resolve } from "path";
import { existsSync } from "fs";
import { prisma } from "@/lib/db";
import { getCurrentReviewer } from "@/lib/reviewer/auth";

// Allowed image extensions for reviewer photos
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif"]);

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Max data URL size for DB storage: 4MB
const MAX_DATA_URL_SIZE = 4 * 1024 * 1024;

function getUploadsDir(): { dir: string; isTemp: boolean } {
  const publicDir = join(process.cwd(), "public", "uploads", "reviewer-photos");
  try {
    if (!existsSync(publicDir)) {
      const fs = require("fs");
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const testPath = join(publicDir, ".write-test");
    const fs = require("fs");
    fs.writeFileSync(testPath, "");
    fs.unlinkSync(testPath);
    return { dir: publicDir, isTemp: false };
  } catch {
    const tmpDir = "/tmp/reviewer-photos";
    if (!existsSync(tmpDir)) {
      const fs = require("fs");
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return { dir: tmpDir, isTemp: true };
  }
}

/**
 * POST /api/reviewer/photos/upload
 * Upload a photo that the reviewer owns or has rights to
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate reviewer
    const reviewer = await getCurrentReviewer();
    if (!reviewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const contentReviewId = formData.get("contentReviewId") as string | null;
    const ownershipDeclared = formData.get("ownershipDeclared") === "true";
    const declarationText = formData.get("declarationText") as string | null;
    const altText = formData.get("altText") as string | null;
    const caption = formData.get("caption") as string | null;
    const takenAt = formData.get("takenAt") as string | null;
    const location = formData.get("location") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate ownership declaration for "owned" photos
    if (!ownershipDeclared) {
      return NextResponse.json(
        { error: "You must declare ownership of this photo" },
        { status: 400 }
      );
    }

    // Validate file is an image
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    // Validate extension
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.has(fileExtension)) {
      return NextResponse.json(
        { error: `File extension ".${fileExtension}" not allowed. Use jpg, png, or webp.` },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    // Verify content review ownership if provided
    if (contentReviewId) {
      const review = await prisma.contentReview.findUnique({
        where: { id: contentReviewId },
        select: { reviewer_id: true },
      });
      if (!review || review.reviewer_id !== reviewer.id) {
        return NextResponse.json(
          { error: "Invalid content review" },
          { status: 403 }
        );
      }
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const filename = `reviewer-${reviewer.id.slice(-6)}-${timestamp}-${randomId}.${fileExtension}`;

    // Write to disk
    const { dir: uploadsDir, isTemp } = getUploadsDir();
    const filepath = resolve(uploadsDir, filename);

    if (!filepath.startsWith(resolve(uploadsDir))) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    await writeFile(filepath, new Uint8Array(buffer));

    // Determine URL
    let publicUrl: string;
    if (isTemp && file.size <= MAX_DATA_URL_SIZE) {
      publicUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
    } else if (isTemp) {
      publicUrl = `/api/reviewer/photos/serve/${filename}`;
    } else {
      publicUrl = `/uploads/reviewer-photos/${filename}`;
    }

    // Generate thumbnail (smaller version)
    let thumbnailUrl: string | null = null;
    try {
      const sharp = (await import("sharp")).default;
      const thumbnailBuffer = await sharp(buffer)
        .resize(200, 200, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();
      
      if (isTemp || thumbnailBuffer.length <= MAX_DATA_URL_SIZE) {
        thumbnailUrl = `data:image/jpeg;base64,${thumbnailBuffer.toString("base64")}`;
      }
    } catch {
      console.warn("[reviewer-photo] Could not generate thumbnail");
    }

    // Create ReviewerPhoto record
    const photo = await prisma.reviewerPhoto.create({
      data: {
        reviewer_id: reviewer.id,
        content_review_id: contentReviewId,
        url: publicUrl,
        thumbnail_url: thumbnailUrl,
        filename: filename,
        alt_text: altText,
        caption: caption,
        license_type: "owned",
        ownership_declared: ownershipDeclared,
        declaration_text: declarationText || `I took this photo and have the right to use it.`,
        taken_at: takenAt ? new Date(takenAt) : null,
        location: location,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Photo uploaded successfully",
      photo: {
        id: photo.id,
        url: photo.url,
        thumbnailUrl: photo.thumbnail_url,
        filename: photo.filename,
        altText: photo.alt_text,
        caption: photo.caption,
        licenseType: photo.license_type,
        ownershipDeclared: photo.ownership_declared,
        takenAt: photo.taken_at,
        location: photo.location,
      },
    });
  } catch (error) {
    console.error("[reviewer/photos/upload] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}
