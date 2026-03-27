/**
 * CTO Agent Browsing Tool — HTTP fetch with domain allow-list enforcement.
 *
 * Provides read-only browsing of trusted documentation and the own site
 * for the CTO Agent. All requests are validated against a strict domain
 * allow-list before execution.
 *
 * Tools: browsingFetch, browsingSearch
 */

import type { ToolContext, ToolResult } from "../types";

// ---------------------------------------------------------------------------
// Domain Allow-List
// ---------------------------------------------------------------------------

export const ALLOWED_DOMAINS: readonly string[] = [
  "nextjs.org",
  "www.prisma.io",
  "vercel.com",
  "developers.google.com",
  "developer.mozilla.org",
  "www.yalla-london.com",
  "github.com",
] as const;

const USER_AGENT = "YallaLondon-CTO-Agent/1.0";
const DEFAULT_MAX_BODY_KB = 500;
const FETCH_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Validates a URL against the domain allow-list.
 * For github.com, additionally verifies the path starts with /khaledaun/.
 * Returns { valid: true, hostname } or { valid: false, reason }.
 */
function validateUrl(rawUrl: string): {
  valid: boolean;
  hostname?: string;
  reason?: string;
} {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch (err) {
    console.warn("[browsing] URL parse failed:", err instanceof Error ? err.message : String(err));
    return { valid: false, reason: `Invalid URL: ${rawUrl}` };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return {
      valid: false,
      reason: `Disallowed protocol: ${parsed.protocol} — only http/https allowed`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  const domainMatch = ALLOWED_DOMAINS.some((allowed) => {
    if (hostname === allowed) return true;
    // Allow subdomains: docs.nextjs.org matches nextjs.org
    if (hostname.endsWith(`.${allowed}`)) return true;
    return false;
  });

  if (!domainMatch) {
    return {
      valid: false,
      reason: `Domain "${hostname}" is not in the allow-list. Allowed: ${ALLOWED_DOMAINS.join(", ")}`,
    };
  }

  // github.com: restrict to /khaledaun/ repositories only
  if (hostname === "github.com" || hostname.endsWith(".github.com")) {
    const path = parsed.pathname.toLowerCase();
    if (!path.startsWith("/khaledaun/") && path !== "/khaledaun") {
      return {
        valid: false,
        reason: `GitHub access restricted to /khaledaun/ repositories. Got: ${parsed.pathname}`,
      };
    }
  }

  return { valid: true, hostname };
}

/**
 * Strips HTML tags from a string for cleaner text output.
 * Removes <script> and <style> blocks entirely first, then strips remaining tags.
 */
function stripHtml(html: string): string {
  let text = html;

  // Remove script blocks (including content)
  text = text.replace(/<script[\s\S]*?<\/script>/gi, "");

  // Remove style blocks (including content)
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, "");

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Validates that a redirect target stays within the allow-list.
 * Used to prevent redirect-based bypasses of the domain restriction.
 */
function isRedirectAllowed(location: string, baseUrl: string): boolean {
  try {
    const resolved = new URL(location, baseUrl);
    return validateUrl(resolved.href).valid;
  } catch (err) {
    console.warn("[browsing] Redirect URL validation failed:", err instanceof Error ? err.message : String(err));
    return false;
  }
}

// ---------------------------------------------------------------------------
// browsingFetch — core HTTP fetch with domain allow-list
// ---------------------------------------------------------------------------

export async function browsingFetch(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const url = params.url as string | undefined;
  if (!url) {
    return {
      success: false,
      error: "Missing required parameter: url",
    };
  }

  const method = ((params.method as string) || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return {
      success: false,
      error: `Only GET and HEAD methods are allowed. Got: ${method}`,
    };
  }

  const maxBodyKb =
    typeof params.maxBodyKb === "number" ? params.maxBodyKb : DEFAULT_MAX_BODY_KB;
  const customHeaders = (params.headers as Record<string, string>) || {};

  // Validate URL against allow-list
  const validation = validateUrl(url);
  if (!validation.valid) {
    return {
      success: false,
      error: `[browsing] Blocked: ${validation.reason}`,
      summary: `Fetch blocked — ${validation.reason}`,
    };
  }

  // Build request with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html, application/json, text/plain, */*",
        ...customHeaders,
      },
      signal: controller.signal,
      redirect: "manual", // Handle redirects manually to enforce allow-list
    });

    // Handle redirects — verify target is within allow-list
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        return {
          success: false,
          error: `Redirect (${response.status}) with no Location header`,
        };
      }

      if (!isRedirectAllowed(location, url)) {
        return {
          success: false,
          error: `[browsing] Redirect to disallowed domain blocked: ${location}`,
          summary: `Redirect to ${location} blocked — not in allow-list`,
        };
      }

      // Follow the redirect manually (single hop only to prevent chains)
      const redirectController = new AbortController();
      const redirectTimeoutId = setTimeout(
        () => redirectController.abort(),
        FETCH_TIMEOUT_MS,
      );

      try {
        const redirectResponse = await fetch(new URL(location, url).href, {
          method,
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "text/html, application/json, text/plain, */*",
            ...customHeaders,
          },
          signal: redirectController.signal,
          redirect: "manual",
        });

        return await buildResult(redirectResponse, maxBodyKb, url);
      } finally {
        clearTimeout(redirectTimeoutId);
      }
    }

    return await buildResult(response, maxBodyKb, url);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);
    const isTimeout = message.includes("abort") || message.includes("timeout");
    return {
      success: false,
      error: isTimeout
        ? `[browsing] Fetch timed out after ${FETCH_TIMEOUT_MS}ms: ${url}`
        : `[browsing] Fetch failed: ${message}`,
      summary: isTimeout
        ? `Request to ${validation.hostname} timed out`
        : `Fetch error: ${message}`,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Reads the response body, truncates to maxBodyKb, strips HTML, and
 * returns a structured ToolResult.
 */
async function buildResult(
  response: Response,
  maxBodyKb: number,
  originalUrl: string,
): Promise<ToolResult> {
  const contentType = response.headers.get("content-type") || "unknown";
  const maxBytes = maxBodyKb * 1024;

  let rawBody: string;
  try {
    // Read the full body as text, then truncate
    const fullBody = await response.text();
    rawBody = fullBody.length > maxBytes
      ? fullBody.slice(0, maxBytes) + "\n...[truncated]"
      : fullBody;
  } catch (err) {
    console.warn("[browsing] Failed to read response body:", err instanceof Error ? err.message : String(err));
    rawBody = "[Could not read response body]";
  }

  // Strip HTML for cleaner output (skip for JSON responses)
  const isJson = contentType.includes("application/json");
  const body = isJson ? rawBody : stripHtml(rawBody);

  const data = {
    url: originalUrl,
    status: response.status,
    contentType,
    bodyLength: body.length,
    body,
    fetchedAt: new Date().toISOString(),
  };

  return {
    success: response.status >= 200 && response.status < 400,
    data,
    summary: `Fetched ${originalUrl} — ${response.status} (${body.length} chars)`,
  };
}

// ---------------------------------------------------------------------------
// browsingSearch — documentation page fetcher based on query
// ---------------------------------------------------------------------------

/**
 * Maps known documentation sites to their likely URL structure.
 * NOT a real web search — constructs the most likely doc page URL
 * from the query and fetches it directly.
 */
const DOC_URL_BUILDERS: Record<
  string,
  (query: string) => string
> = {
  "nextjs.org": (q) => {
    const slug = q
      .toLowerCase()
      .replace(/next\.?js\s*/i, "")
      .trim()
      .replace(/\s+/g, "-");
    return `https://nextjs.org/docs/${slug}`;
  },
  "www.prisma.io": (q) => {
    const slug = q
      .toLowerCase()
      .replace(/prisma\s*/i, "")
      .trim()
      .replace(/\s+/g, "-");
    return `https://www.prisma.io/docs/${slug}`;
  },
  "vercel.com": (q) => {
    const slug = q
      .toLowerCase()
      .replace(/vercel\s*/i, "")
      .trim()
      .replace(/\s+/g, "-");
    return `https://vercel.com/docs/${slug}`;
  },
  "developers.google.com": (q) => {
    const slug = q
      .toLowerCase()
      .replace(/google\s*/i, "")
      .trim()
      .replace(/\s+/g, "-");
    return `https://developers.google.com/search/docs/${slug}`;
  },
  "developer.mozilla.org": (q) => {
    const slug = q
      .toLowerCase()
      .replace(/mdn\s*/i, "")
      .trim()
      .replace(/\s+/g, "/");
    return `https://developer.mozilla.org/en-US/docs/Web/${slug}`;
  },
};

/**
 * Detects which documentation site a query is most likely targeting
 * based on keyword matching.
 */
function detectTargetDomain(query: string): string | null {
  const lower = query.toLowerCase();

  if (lower.includes("next") || lower.includes("app router") || lower.includes("server component")) {
    return "nextjs.org";
  }
  if (lower.includes("prisma") || lower.includes("schema") || lower.includes("migration")) {
    return "www.prisma.io";
  }
  if (lower.includes("vercel") || lower.includes("deploy") || lower.includes("serverless")) {
    return "vercel.com";
  }
  if (lower.includes("google") || lower.includes("ga4") || lower.includes("gsc") || lower.includes("search central")) {
    return "developers.google.com";
  }
  if (lower.includes("mdn") || lower.includes("web api") || lower.includes("html") || lower.includes("css")) {
    return "developer.mozilla.org";
  }

  return null;
}

export async function browsingSearch(
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const query = params.query as string | undefined;
  if (!query) {
    return {
      success: false,
      error: "Missing required parameter: query",
    };
  }

  const allowedSubset = params.allowedDomains as string[] | undefined;

  // Validate allowedDomains subset
  if (allowedSubset) {
    const invalid = allowedSubset.filter(
      (d) => !ALLOWED_DOMAINS.includes(d),
    );
    if (invalid.length > 0) {
      return {
        success: false,
        error: `Domains not in allow-list: ${invalid.join(", ")}`,
      };
    }
  }

  // Detect target domain from query
  const targetDomain = detectTargetDomain(query);
  if (!targetDomain) {
    return {
      success: false,
      error:
        "Could not determine target documentation site from query. " +
        "Include a keyword like 'Next.js', 'Prisma', 'Vercel', 'Google', or 'MDN' in the query.",
      summary: "Search failed — could not detect target site from query",
    };
  }

  // If allowedSubset provided, verify target is within it
  if (allowedSubset && !allowedSubset.includes(targetDomain)) {
    return {
      success: false,
      error: `Target domain "${targetDomain}" not in provided allowedDomains subset`,
    };
  }

  // Build the documentation URL
  const urlBuilder = DOC_URL_BUILDERS[targetDomain];
  if (!urlBuilder) {
    return {
      success: false,
      error: `No URL builder configured for ${targetDomain}`,
    };
  }

  const docUrl = urlBuilder(query);

  // Fetch the page using browsingFetch
  return browsingFetch(
    {
      url: docUrl,
      method: "GET",
      maxBodyKb: DEFAULT_MAX_BODY_KB,
    },
    ctx,
  );
}
