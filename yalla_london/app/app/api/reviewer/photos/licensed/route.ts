import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/reviewer/auth";

// Allowed license types for external photos
const ALLOWED_LICENSE_TYPES = [
  "licensed", // Paid stock photo with license
  "unsplash", // Unsplash (free, requires attribution)
  "creative_commons", // Creative Commons licensed
  "stock", // Generic stock photo
  "press_kit", // Official press/media kit photo
] as const;

type LicenseType = (typeof ALLOWED_LICENSE_TYPES)[number];

/**
 * POST /api/reviewer/photos/licensed
 * Add a reference to an externally licensed photo
 * Reviewer provides the source URL for verification
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate reviewer
    const session = await getSessionFromCookie(request);
    if (!session || !session.reviewer_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      contentReviewId,
      sourceUrl,
      imageUrl,
      licenseType,
      licenseDetails,
      photographerCredit,
      altText,
      caption,
    } = body;

    // Validate required fields
    if (!sourceUrl || !imageUrl) {
      return NextResponse.json(
        { error: "Source URL and image URL are required" },
        { status: 400 }
      );
    }

    // Validate license type
    if (!licenseType || !ALLOWED_LICENSE_TYPES.includes(licenseType as LicenseType)) {
      return NextResponse.json(
        { error: `Invalid license type. Must be one of: ${ALLOWED_LICENSE_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Basic URL validation
    try {
      new URL(sourceUrl);
      new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Unsplash requires attribution
    if (licenseType === "unsplash" && !photographerCredit) {
      return NextResponse.json(
        { error: "Photographer credit is required for Unsplash photos" },
        { status: 400 }
      );
    }

    // Verify content review ownership if provided
    if (contentReviewId) {
      const review = await prisma.contentReview.findUnique({
        where: { id: contentReviewId },
        select: { reviewer_id: true },
      });
      if (!review || review.reviewer_id !== session.reviewer_id) {
        return NextResponse.json(
          { error: "Invalid content review" },
          { status: 403 }
        );
      }
    }

    // Generate a filename placeholder from the URL
    const urlParts = new URL(imageUrl);
    const pathParts = urlParts.pathname.split("/");
    const filename = pathParts[pathParts.length - 1] || `licensed-${Date.now()}.jpg`;

    // Create ReviewerPhoto record for the licensed photo
    const photo = await prisma.reviewerPhoto.create({
      data: {
        reviewer_id: session.reviewer_id,
        content_review_id: contentReviewId || null,
        url: imageUrl,
        thumbnail_url: null, // External images don't have our thumbnails
        filename: filename,
        alt_text: altText || null,
        caption: caption || null,
        license_type: licenseType,
        ownership_declared: false, // They don't own it, they have a license
        declaration_text: null,
        source_url: sourceUrl, // Link to verify the license
        license_details: licenseDetails || null,
        photographer_credit: photographerCredit || null,
        is_verified: false, // Admin needs to verify the license
      },
    });

    return NextResponse.json({
      success: true,
      message: "Licensed photo added. It will be verified by an admin.",
      photo: {
        id: photo.id,
        url: photo.url,
        filename: photo.filename,
        altText: photo.alt_text,
        caption: photo.caption,
        licenseType: photo.license_type,
        sourceUrl: photo.source_url,
        licenseDetails: photo.license_details,
        photographerCredit: photo.photographer_credit,
        isVerified: photo.is_verified,
        needsVerification: true,
      },
    });
  } catch (error) {
    console.error("[reviewer/photos/licensed] Error:", error);
    return NextResponse.json(
      { error: "Failed to add licensed photo" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reviewer/photos/licensed
 * Get reviewer's photos (both owned and licensed)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate reviewer
    const session = await getSessionFromCookie(request);
    if (!session || !session.reviewer_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contentReviewId = searchParams.get("contentReviewId");

    const whereClause: Record<string, unknown> = {
      reviewer_id: session.reviewer_id,
    };

    if (contentReviewId) {
      whereClause.content_review_id = contentReviewId;
    }

    const photos = await prisma.reviewerPhoto.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        url: true,
        thumbnail_url: true,
        filename: true,
        alt_text: true,
        caption: true,
        license_type: true,
        ownership_declared: true,
        source_url: true,
        license_details: true,
        photographer_credit: true,
        is_verified: true,
        taken_at: true,
        location: true,
        created_at: true,
      },
    });

    return NextResponse.json({
      photos: photos.map((p) => ({
        id: p.id,
        url: p.url,
        thumbnailUrl: p.thumbnail_url,
        filename: p.filename,
        altText: p.alt_text,
        caption: p.caption,
        licenseType: p.license_type,
        ownershipDeclared: p.ownership_declared,
        sourceUrl: p.source_url,
        licenseDetails: p.license_details,
        photographerCredit: p.photographer_credit,
        isVerified: p.is_verified,
        takenAt: p.taken_at,
        location: p.location,
        createdAt: p.created_at,
      })),
    });
  } catch (error) {
    console.error("[reviewer/photos] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
