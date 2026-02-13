/**
 * Resilience utilities for production multi-site autonomy.
 * Provides timeout guards, retry logic, and rate limit handling.
 */

// ─── Timeout Guard ───────────────────────────────────────────────

const VERCEL_FUNCTION_TIMEOUT_MS = 60_000;
const SAFETY_MARGIN_MS = 5_000;

/**
 * Creates a deadline checker for Vercel serverless functions.
 * Call `isExpired()` inside loops to exit before the timeout.
 *
 * @param marginMs - Safety margin before the hard limit (default 5s)
 * @param totalTimeoutMs - Total function timeout (default 60s; use route's maxDuration for longer routes)
 * @returns Object with `isExpired()`, `remainingMs()`, and `startTime`
 */
export function createDeadline(marginMs = SAFETY_MARGIN_MS, totalTimeoutMs = VERCEL_FUNCTION_TIMEOUT_MS) {
  const startTime = Date.now();
  const deadline = startTime + totalTimeoutMs - marginMs;
  return {
    startTime,
    isExpired: () => Date.now() >= deadline,
    remainingMs: () => Math.max(0, deadline - Date.now()),
    elapsedMs: () => Date.now() - startTime,
  };
}

// ─── Fetch with Retry ────────────────────────────────────────────

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOnStatus?: number[];
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
  retryOnStatus: [429, 503, 502, 504],
};

/**
 * Fetch wrapper with exponential backoff retry for rate limits and transient errors.
 * Respects Retry-After headers from Google APIs and Cloudflare.
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (opts.retryOnStatus.includes(response.status) && attempt < opts.maxRetries) {
        const retryAfter = response.headers.get("retry-after");
        let delayMs: number;

        if (retryAfter) {
          // Retry-After can be seconds or an HTTP date
          const seconds = parseInt(retryAfter, 10);
          delayMs = isNaN(seconds)
            ? Math.max(0, new Date(retryAfter).getTime() - Date.now())
            : seconds * 1_000;
        } else {
          // Exponential backoff: 1s, 2s, 4s, ...
          delayMs = Math.min(opts.baseDelayMs * Math.pow(2, attempt), opts.maxDelayMs);
        }

        console.warn(
          `[fetchWithRetry] ${response.status} on attempt ${attempt + 1}/${opts.maxRetries + 1}, ` +
          `retrying in ${delayMs}ms: ${url}`
        );
        await sleep(delayMs);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < opts.maxRetries) {
        const delayMs = Math.min(opts.baseDelayMs * Math.pow(2, attempt), opts.maxDelayMs);
        console.warn(
          `[fetchWithRetry] Network error on attempt ${attempt + 1}/${opts.maxRetries + 1}, ` +
          `retrying in ${delayMs}ms: ${url} — ${lastError.message}`
        );
        await sleep(delayMs);
        continue;
      }
    }
  }

  throw lastError || new Error(`fetchWithRetry failed after ${opts.maxRetries + 1} attempts`);
}

// ─── Promise with Timeout ────────────────────────────────────────

/**
 * Wraps a promise with a timeout. Rejects if the promise doesn't settle
 * within the specified duration.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label = "Operation"
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
    promise
      .then((result) => { clearTimeout(timer); resolve(result); })
      .catch((error) => { clearTimeout(timer); reject(error); });
  });
}

// ─── Per-Site Loop Helper ────────────────────────────────────────

interface SiteLoopResult<T> {
  results: Record<string, T>;
  errors: Record<string, string>;
  skipped: string[];
  completed: number;
  failed: number;
  timedOut: boolean;
}

/**
 * Iterates over all site IDs with deadline awareness.
 * Skips remaining sites if the timeout approaches.
 * Catches per-site errors without failing the whole loop.
 */
export async function forEachSite<T>(
  siteIds: string[],
  fn: (siteId: string) => Promise<T>,
  marginMs = SAFETY_MARGIN_MS
): Promise<SiteLoopResult<T>> {
  const deadline = createDeadline(marginMs);
  const result: SiteLoopResult<T> = {
    results: {},
    errors: {},
    skipped: [],
    completed: 0,
    failed: 0,
    timedOut: false,
  };

  for (const siteId of siteIds) {
    if (deadline.isExpired()) {
      result.skipped.push(siteId);
      result.timedOut = true;
      console.warn(`[forEachSite] Timeout approaching, skipping ${siteId} (${deadline.elapsedMs()}ms elapsed)`);
      continue;
    }

    try {
      result.results[siteId] = await fn(siteId);
      result.completed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors[siteId] = message;
      result.failed++;
      console.error(`[forEachSite] Error processing ${siteId}: ${message}`);
    }
  }

  // Add remaining sites as skipped if we timed out
  if (result.timedOut) {
    const processedSites = new Set([
      ...Object.keys(result.results),
      ...Object.keys(result.errors),
      ...result.skipped,
    ]);
    for (const siteId of siteIds) {
      if (!processedSites.has(siteId)) {
        result.skipped.push(siteId);
      }
    }
  }

  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
