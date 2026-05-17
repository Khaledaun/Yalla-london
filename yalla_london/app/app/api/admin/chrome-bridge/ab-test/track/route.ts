/**
 * POST /api/admin/chrome-bridge/ab-test/track
 *
 * Increment A/B test counters. Called from frontend JS after variant is shown
 * or user interacts. No auth required (public — this is the tracking beacon).
 * Uses rate limiting + event validation to prevent abuse.
 *
 * Payload: { testId, variant: "A"|"B", event: "impression"|"click"|"conversion" }
 *
 * Atomic updates via Prisma `increment` to handle concurrent hits.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const TrackSchema = z.object({
  testId: z.string().min(1),
  variant: z.enum(["A", "B"]),
  event: z.enum(["impression", "click", "conversion"]),
});

// In-memory rate limiter — one hit per testId+variant+event per minute per IP
const rateLimitBuckets = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 60_000;

function getRateLimitKey(ip: string, testId: string, variant: string, event: string): string {
  return `${ip}:${testId}:${variant}:${event}`;
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const last = rateLimitBuckets.get(key);
  if (last && now - last < RATE_LIMIT_WINDOW_MS) return false;
  rateLimitBuckets.set(key, now);
  // Clean up old entries occasionally
  if (rateLimitBuckets.size > 5000) {
    for (const [k, t] of rateLimitBuckets.entries()) {
      if (now - t > RATE_LIMIT_WINDOW_MS * 5) rateLimitBuckets.delete(k);
    }
  }
  return true;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = TrackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { testId, variant, event } = parsed.data;

    // Rate limit per IP to prevent ballooning counters from a single client
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const rateKey = getRateLimitKey(ip, testId, variant, event);
    if (!checkRateLimit(rateKey)) {
      return NextResponse.json(
        { success: true, rateLimited: true },
        { status: 200 }, // silent — don't reveal rate limit to abusers
      );
    }

    const { prisma } = await import("@/lib/db");

    // Determine field to increment
    const fieldKey =
      event === "impression"
        ? variant === "A"
          ? "impressionsA"
          : "impressionsB"
        : event === "click"
          ? variant === "A"
            ? "clicksA"
            : "clicksB"
          : variant === "A"
            ? "conversionsA"
            : "conversionsB";

    const updated = await prisma.abTest
      .update({
        where: { id: testId, status: "active" },
        data: { [fieldKey]: { increment: 1 } },
        select: { id: true, status: true },
      })
      .catch((err) => {
        // Test doesn't exist OR is not active — silently ignore so beacons from stale pages don't error
        console.warn(
          "[ab-test/track] increment failed:",
          err instanceof Error ? err.message : String(err),
        );
        return null;
      });

    if (!updated) {
      return NextResponse.json({ success: true, applied: false });
    }

    return NextResponse.json({ success: true, applied: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ab-test/track]", message);
    return NextResponse.json({ error: "Track failed" }, { status: 500 });
  }
}
