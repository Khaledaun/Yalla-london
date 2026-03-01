/**
 * Master Audit Engine — Crawler
 *
 * HTTP crawler with:
 * - Batch processing with concurrency limiting (semaphore pattern)
 * - Rate limiting (minimum delay between requests)
 * - Retries with exponential backoff
 * - Redirect chain tracking
 * - Timing capture
 *
 * Uses only native fetch() — no external dependencies.
 */

import type { CrawlResult, CrawlSettings, RedirectHop } from './types';

// ---------------------------------------------------------------------------
// Semaphore for concurrency control
// ---------------------------------------------------------------------------

class Semaphore {
  private queue: Array<() => void> = [];
  private active = 0;

  constructor(private readonly limit: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  release(): void {
    this.active--;
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }
}

// ---------------------------------------------------------------------------
// Rate limiter
// ---------------------------------------------------------------------------

class RateLimiter {
  private lastRequestTime = 0;

  constructor(private readonly minDelayMs: number) {}

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minDelayMs) {
      const waitTime = this.minDelayMs - elapsed;
      await new Promise<void>((resolve) => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
  }
}

// ---------------------------------------------------------------------------
// Single URL fetcher (with redirects + retries)
// ---------------------------------------------------------------------------

async function fetchWithRedirects(
  url: string,
  settings: CrawlSettings
): Promise<CrawlResult> {
  const startMs = Date.now();
  const redirectChain: RedirectHop[] = [];
  let currentUrl = url;
  let lastError: string | undefined;

  for (let attempt = 0; attempt <= settings.maxRetries; attempt++) {
    // Exponential backoff on retries
    if (attempt > 0) {
      const delay = settings.retryBaseDelayMs * Math.pow(2, attempt - 1);
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }

    try {
      // Follow redirects manually to capture the chain
      let hopsRemaining = settings.maxRedirects;
      currentUrl = url;
      redirectChain.length = 0;

      while (hopsRemaining > 0) {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          settings.timeoutMs
        );

        let response: Response;
        try {
          response = await fetch(currentUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'User-Agent': settings.userAgent,
              Accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-GB,en;q=0.9,ar;q=0.8',
              'Accept-Encoding': 'identity',
            },
            redirect: 'manual', // Handle redirects manually
          });
        } finally {
          clearTimeout(timeout);
        }

        const status = response.status;

        // Is this a redirect?
        if (status >= 300 && status < 400) {
          const location = response.headers.get('location');
          if (!location) {
            // Redirect with no Location header — treat as final
            const headers = headersToRecord(response.headers);
            return {
              url,
              status,
              redirectChain,
              finalUrl: currentUrl,
              headers,
              html: '',
              timing: {
                startMs,
                endMs: Date.now(),
                durationMs: Date.now() - startMs,
              },
              error: 'Redirect with no Location header',
            };
          }

          redirectChain.push({ url: currentUrl, status });

          // Resolve relative Location
          try {
            currentUrl = new URL(location, currentUrl).toString();
          } catch {
            currentUrl = location;
          }

          hopsRemaining--;
          continue;
        }

        // Non-redirect response — read body
        const html = await response.text();
        const headers = headersToRecord(response.headers);
        const endMs = Date.now();

        return {
          url,
          status,
          redirectChain,
          finalUrl: currentUrl,
          headers,
          html,
          timing: {
            startMs,
            endMs,
            durationMs: endMs - startMs,
          },
        };
      }

      // Exceeded max redirects
      return {
        url,
        status: 0,
        redirectChain,
        finalUrl: currentUrl,
        headers: {},
        html: '',
        timing: {
          startMs,
          endMs: Date.now(),
          durationMs: Date.now() - startMs,
        },
        error: `Exceeded maximum redirects (${settings.maxRedirects})`,
      };
    } catch (err) {
      lastError =
        err instanceof Error ? err.message : String(err);

      // If this was the last attempt, return the error
      if (attempt === settings.maxRetries) {
        return {
          url,
          status: 0,
          redirectChain,
          finalUrl: currentUrl,
          headers: {},
          html: '',
          timing: {
            startMs,
            endMs: Date.now(),
            durationMs: Date.now() - startMs,
          },
          error: `Failed after ${settings.maxRetries + 1} attempts: ${lastError}`,
        };
      }

      console.warn(
        `[master-audit/crawler] Attempt ${attempt + 1}/${settings.maxRetries + 1} failed for ${url}: ${lastError}`
      );
    }
  }

  // Should not reach here, but TypeScript needs it
  return {
    url,
    status: 0,
    redirectChain: [],
    finalUrl: url,
    headers: {},
    html: '',
    timing: {
      startMs,
      endMs: Date.now(),
      durationMs: Date.now() - startMs,
    },
    error: lastError ?? 'Unknown error',
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function headersToRecord(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key.toLowerCase()] = value;
  });
  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Crawl a batch of URLs with concurrency limiting and rate limiting.
 *
 * @param urls - Array of URLs to crawl
 * @param settings - Crawl settings (concurrency, rate limit, timeout, retries)
 * @returns Array of CrawlResults in same order as input URLs
 */
export async function crawlBatch(
  urls: string[],
  settings: CrawlSettings
): Promise<CrawlResult[]> {
  if (urls.length === 0) {
    return [];
  }

  const semaphore = new Semaphore(settings.concurrency);
  const rateLimiter = new RateLimiter(settings.rateDelayMs);

  const tasks = urls.map(async (url): Promise<CrawlResult> => {
    await semaphore.acquire();
    try {
      await rateLimiter.wait();
      return await fetchWithRedirects(url, settings);
    } finally {
      semaphore.release();
    }
  });

  return Promise.all(tasks);
}

/**
 * Crawl URLs in multiple batches, calling a callback after each batch.
 * This allows the orchestrator to save state between batches.
 *
 * @param allUrls - All URLs to crawl
 * @param settings - Crawl settings
 * @param batchSize - Number of URLs per batch
 * @param onBatchComplete - Called after each batch completes
 * @returns Map of URL -> CrawlResult
 */
export async function crawlInBatches(
  allUrls: string[],
  settings: CrawlSettings,
  batchSize: number,
  onBatchComplete: (
    batchIndex: number,
    results: CrawlResult[]
  ) => Promise<void>
): Promise<Map<string, CrawlResult>> {
  const allResults = new Map<string, CrawlResult>();

  for (let i = 0; i < allUrls.length; i += batchSize) {
    const batchIndex = Math.floor(i / batchSize);
    const batchUrls = allUrls.slice(i, i + batchSize);

    console.log(
      `[master-audit/crawler] Batch ${batchIndex + 1}/${Math.ceil(allUrls.length / batchSize)}: ` +
        `Crawling ${batchUrls.length} URLs...`
    );

    const results = await crawlBatch(batchUrls, settings);

    for (const result of results) {
      allResults.set(result.url, result);
    }

    await onBatchComplete(batchIndex, results);
  }

  return allResults;
}
