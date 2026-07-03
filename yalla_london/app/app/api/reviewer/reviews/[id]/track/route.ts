import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookie } from "@/lib/reviewer/auth";

/**
 * POST /api/reviewer/reviews/[id]/track
 * Hidden activity tracking heartbeat - called periodically while reviewer is editing
 * The reviewer doesn't know this endpoint exists - it's called silently by the UI
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get session from cookie
    const session = await getSessionFromCookie(request);
    if (!session || !session.reviewer_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the tracking data
    const body = await request.json();
    const { activeSeconds = 0, isActive = true } = body;

    // Find the review and verify ownership
    const review = await prisma.contentReview.findUnique({
      where: { id },
      select: {
        id: true,
        reviewer_id: true,
        status: true,
        first_opened_at: true,
        total_active_seconds: true,
      },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.reviewer_id !== session.reviewer_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Don't track for completed reviews
    if (["approved", "rejected"].includes(review.status)) {
      return NextResponse.json({ tracked: false, reason: "Review completed" });
    }

    // Update tracking data
    const updateData: Record<string, unknown> = {
      last_activity_at: new Date(),
    };

    // Set first_opened_at if not set (backup in case GET didn't set it)
    if (!review.first_opened_at) {
      updateData.first_opened_at = new Date();
    }

    // Increment active seconds if the user is actively working
    if (isActive && activeSeconds > 0) {
      updateData.total_active_seconds = {
        increment: Math.min(activeSeconds, 60), // Cap at 60 seconds per heartbeat
      };
    }

    await prisma.contentReview.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ 
      tracked: true,
      totalSeconds: (review.total_active_seconds || 0) + (isActive ? Math.min(activeSeconds, 60) : 0),
    });
  } catch (error) {
    console.error("[reviewer/track] Error:", error);
    return NextResponse.json(
      { error: "Failed to track activity" },
      { status: 500 }
    );
  }
}
