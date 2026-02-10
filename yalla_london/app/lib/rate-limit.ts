/**
 * Simple in-memory rate limiter for Next.js API routes.
 *
 * Uses a sliding window counter keyed by client IP address.
 * Each Vercel serverless function instance gets its own Map, so limits
 * are per-instance — good enough for burst protection, not a hard global cap.
 *
 * Usage in an API route:
 *
 *   import { apiLimiter } from "@/lib/rate-limit";
 *
 *   export async function GET(request: NextRequest) {
 *     const blocked = apiLimiter(request);
 *     if (blocked) return blocked;
 *     // ... handle request
 *   }
 */

import { NextRequest, NextResponse } from "next/server";

// ─── Types ──────────────────────────────────────────────────────

interface RateLimitOptions {
  /** Maximum number of requests allowed within the interval. */
  tokens: number;
  /** Interval duration in milliseconds. */
  intervalMs: number;
}

interface WindowEntry {
  /** Number of requests consumed in the current window. */
  count: number;
  /** Timestamp (ms) when the current window started. */
  windowStart: number;
}

// ─── Store & Cleanup ────────────────────────────────────────────

/**
 * Global store shared across all limiter instances within one
 * serverless function invocation.  Keys are "prefix:ip".
 */
const store = new Map<string, WindowEntry>();

/** Tracks the last time we ran a full cleanup sweep. */
let lastCleanup = Date.now();

/** Minimum gap between cleanup sweeps (5 minutes). */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1_000;

/**
 * Removes entries whose window has fully expired so the Map
 * does not grow unbounded across warm function reuses.
 */
function cleanup(maxAge: number): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const expired: string[] = [];
  store.forEach((entry, key) => {
    if (now - entry.windowStart > maxAge) {
      expired.push(key);
    }
  });
  expired.forEach((key) => store.delete(key));
}

// ─── IP Extraction ──────────────────────────────────────────────

/**
 * Extracts the client IP from standard proxy headers.
 * Prefers Cloudflare CF-Connecting-IP, then x-real-ip, then
 * the first address in x-forwarded-for.
 */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anonymous"
  );
}

// ─── Core Factory ───────────────────────────────────────────────

/**
 * Creates a rate limiter function.
 *
 * @param options - tokens (max requests) and intervalMs (window size)
 * @returns A function that accepts a NextRequest and returns:
 *   - `null` if the request is allowed
 *   - A `NextResponse` with status 429 if the limit is exceeded
 */
export function rateLimit(options: RateLimitOptions) {
  const { tokens, intervalMs } = options;

  // Use the interval as a unique prefix so different limiters
  // sharing the same store do not collide.
  const prefix = `rl:${tokens}:${intervalMs}`;

  return function check(request: NextRequest): NextResponse | null {
    const ip = getClientIp(request);
    const key = `${prefix}:${ip}`;
    const now = Date.now();

    // Opportunistic cleanup (non-blocking, infrequent).
    cleanup(intervalMs);

    const entry = store.get(key);

    // No existing window or window has expired — start fresh.
    if (!entry || now - entry.windowStart >= intervalMs) {
      store.set(key, { count: 1, windowStart: now });
      return null;
    }

    // Window is still active — check capacity.
    if (entry.count < tokens) {
      entry.count++;
      return null;
    }

    // Limit exceeded — calculate when the window resets.
    const resetAtMs = entry.windowStart + intervalMs;
    const retryAfterSec = Math.ceil((resetAtMs - now) / 1_000);

    return NextResponse.json(
      {
        error: "Too many requests",
        message: `Rate limit exceeded. Try again in ${retryAfterSec} seconds.`,
        retryAfter: retryAfterSec,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Limit": String(tokens),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(resetAtMs / 1_000)),
        },
      },
    );
  };
}

// ─── Preset Limiters ────────────────────────────────────────────

/** General API routes: 60 requests per minute. */
export const apiLimiter = rateLimit({ tokens: 60, intervalMs: 60 * 1_000 });

/** AI generation endpoints: 10 requests per minute. */
export const aiLimiter = rateLimit({ tokens: 10, intervalMs: 60 * 1_000 });

/** Public / read-heavy endpoints: 120 requests per minute. */
export const publicLimiter = rateLimit({ tokens: 120, intervalMs: 60 * 1_000 });

/** Webhook and cron endpoints: 30 requests per minute. */
export const webhookLimiter = rateLimit({ tokens: 30, intervalMs: 60 * 1_000 });
