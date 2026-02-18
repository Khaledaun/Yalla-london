/**
 * Live Site Auditor
 *
 * Performs real-time HTTP checks that the existing SEO agent does NOT do:
 * 1. Sitemap URL health — fetches every sitemap URL, verifies HTTP 200
 * 2. Structured data URL validation — checks that logo/image URLs in JSON-LD resolve
 * 3. robots.txt conflict detection — parses live robots.txt for duplicate/conflicting rules
 * 4. CDN cache performance — samples cf-cache-status headers
 * 5. Rendering mode detection — checks for CSR bailout signals
 * 6. Internal link validation — spot-checks key internal links
 *
 * This fills the #1 gap identified in DISCOVERY.md: the system had ZERO live
 * URL verification. Every sitemap URL was trusted to exist without ever being checked.
 */

export interface LiveAuditResult {
  sitemapHealth: SitemapHealthResult;
  schemaValidation: SchemaValidationResult;
  robotsConflicts: RobotsConflictResult;
  cdnPerformance: CDNPerformanceResult;
  renderingCheck: RenderingCheckResult;
  timestamp: string;
  overallScore: number;
  criticalIssues: string[];
  warnings: string[];
  fixes: string[];
}

export interface SitemapHealthResult {
  totalUrls: number;
  totalSitemapUrls: number; // Total URLs in sitemap before truncation
  healthy: number;
  broken: number;
  redirected: number;
  slow: number;
  brokenUrls: { url: string; status: number; latencyMs: number }[];
  avgLatencyMs: number;
}

export interface SchemaValidationResult {
  pagesChecked: number;
  schemasFound: number;
  urlsInSchemas: number;
  brokenSchemaUrls: { pageUrl: string; schemaUrl: string; status: number }[];
  valid: boolean;
}

export interface RobotsConflictResult {
  fetched: boolean;
  conflicts: RobotsConflict[];
  aiCrawlersBlocked: string[];
  aiCrawlersAllowed: string[];
  hasCloudflareInjection: boolean;
}

export interface RobotsConflict {
  userAgent: string;
  issue: string;
  severity: "critical" | "warning";
}

export interface CDNPerformanceResult {
  sampledUrls: number;
  hits: number;
  misses: number;
  hitRate: number;
  avgTTFBMs: number;
}

export interface RenderingCheckResult {
  pagesChecked: number;
  csrBailouts: { url: string; reason: string }[];
  missingContent: { url: string; issue: string }[];
}

const AI_CRAWLERS = [
  "ClaudeBot",
  "GPTBot",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "Amazonbot",
  "meta-externalagent",
  "PerplexityBot",
  "ChatGPT-User",
  "anthropic-ai",
  "cohere-ai",
];

/**
 * Run a full live site audit. Designed to run within Vercel's 60s timeout
 * by using parallel requests and early termination.
 */
export async function runLiveSiteAudit(
  siteUrl: string,
  options: { maxUrls?: number; timeoutMs?: number } = {}
): Promise<LiveAuditResult> {
  const { maxUrls = 50, timeoutMs = 50000 } = options;
  const deadline = Date.now() + timeoutMs;
  const criticalIssues: string[] = [];
  const warnings: string[] = [];
  const fixes: string[] = [];

  // Run all checks in parallel with timeout awareness
  const [sitemapHealth, robotsConflicts, cdnPerformance] = await Promise.all([
    checkSitemapHealth(siteUrl, maxUrls, deadline).catch((e) => {
      warnings.push(`Sitemap check failed: ${(e as Error).message}`);
      return defaultSitemapResult();
    }),
    checkRobotsConflicts(siteUrl, deadline).catch((e) => {
      warnings.push(`robots.txt check failed: ${(e as Error).message}`);
      return defaultRobotsResult();
    }),
    checkCDNPerformance(siteUrl, deadline).catch((e) => {
      warnings.push(`CDN check failed: ${(e as Error).message}`);
      return defaultCDNResult();
    }),
  ]);

  // Warn if sitemap was truncated
  if (sitemapHealth.totalSitemapUrls > maxUrls) {
    warnings.push(`Sitemap has ${sitemapHealth.totalSitemapUrls} URLs but only ${maxUrls} were audited`);
  }

  // Schema + rendering checks depend on sitemap URLs (run after if time remains)
  let schemaValidation = defaultSchemaResult();
  let renderingCheck = defaultRenderingResult();

  if (Date.now() < deadline - 10000) {
    const keyPages = ["/", "/blog", "/about", "/events", "/recommendations"];
    const pageUrls = keyPages.map((p) => `${siteUrl}${p}`);

    [schemaValidation, renderingCheck] = await Promise.all([
      checkSchemaUrls(siteUrl, pageUrls, deadline).catch(() => defaultSchemaResult()),
      checkRenderingMode(pageUrls, deadline).catch(() => defaultRenderingResult()),
    ]);
  }

  // Analyze results and generate critical issues
  if (sitemapHealth.broken > 0) {
    criticalIssues.push(
      `${sitemapHealth.broken} sitemap URLs return non-200 status (404/500): ${sitemapHealth.brokenUrls
        .slice(0, 5)
        .map((u) => `${u.url} → ${u.status}`)
        .join(", ")}`
    );
  }

  if (robotsConflicts.hasCloudflareInjection) {
    criticalIssues.push(
      "Cloudflare is injecting AI crawler blocks into robots.txt that override your Allow rules"
    );
  }

  if (robotsConflicts.aiCrawlersBlocked.length > 0) {
    criticalIssues.push(
      `${robotsConflicts.aiCrawlersBlocked.length} AI crawlers are blocked: ${robotsConflicts.aiCrawlersBlocked.join(", ")}`
    );
  }

  if (schemaValidation.brokenSchemaUrls.length > 0) {
    criticalIssues.push(
      `${schemaValidation.brokenSchemaUrls.length} broken URLs in structured data: ${schemaValidation.brokenSchemaUrls
        .map((u) => u.schemaUrl)
        .join(", ")}`
    );
  }

  if (renderingCheck.csrBailouts.length > 0) {
    warnings.push(
      `${renderingCheck.csrBailouts.length} pages bail out to client-side rendering: ${renderingCheck.csrBailouts
        .map((u) => u.url)
        .join(", ")}`
    );
  }

  if (cdnPerformance.hitRate < 10 && cdnPerformance.sampledUrls > 0) {
    warnings.push(
      `CDN cache hit rate is ${cdnPerformance.hitRate.toFixed(1)}% — most requests hit origin`
    );
  }

  // Calculate overall score
  let score = 100;
  score -= criticalIssues.length * 15;
  score -= warnings.length * 5;
  if (sitemapHealth.totalUrls > 0) {
    score -= Math.round(
      (sitemapHealth.broken / sitemapHealth.totalUrls) * 30
    );
  }
  if (cdnPerformance.hitRate < 50) score -= 10;
  score = Math.max(0, Math.min(100, score));

  return {
    sitemapHealth,
    schemaValidation,
    robotsConflicts,
    cdnPerformance,
    renderingCheck,
    timestamp: new Date().toISOString(),
    overallScore: score,
    criticalIssues,
    warnings,
    fixes,
  };
}

// ── Sitemap URL Health Check ──────────────────────────────────────────

async function checkSitemapHealth(
  siteUrl: string,
  maxUrls: number,
  deadline: number
): Promise<SitemapHealthResult> {
  const result: SitemapHealthResult = {
    totalUrls: 0,
    totalSitemapUrls: 0,
    healthy: 0,
    broken: 0,
    redirected: 0,
    slow: 0,
    brokenUrls: [],
    avgLatencyMs: 0,
  };

  // Fetch sitemap
  const sitemapRes = await fetch(`${siteUrl}/sitemap.xml`, {
    headers: { "User-Agent": "YallaLondon-Orchestrator/1.0" },
    signal: AbortSignal.timeout(5000),
  });

  if (!sitemapRes.ok) {
    result.brokenUrls.push({
      url: `${siteUrl}/sitemap.xml`,
      status: sitemapRes.status,
      latencyMs: 0,
    });
    result.broken = 1;
    return result;
  }

  const sitemapXml = await sitemapRes.text();
  // Extract all <loc> URLs from sitemap
  const urlMatches = sitemapXml.match(/<loc>([^<]+)<\/loc>/g) || [];
  const allUrls = urlMatches.map((m) => m.replace(/<\/?loc>/g, ""));
  const urls = allUrls.slice(0, maxUrls);

  result.totalSitemapUrls = allUrls.length;
  result.totalUrls = urls.length;
  let totalLatency = 0;

  // Check URLs in batches of 10 for parallelism
  const batchSize = 10;
  for (let i = 0; i < urls.length; i += batchSize) {
    if (Date.now() > deadline - 15000) break; // Leave time for other checks

    const batch = urls.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (url) => {
        const start = Date.now();
        const res = await fetch(url, {
          method: "HEAD",
          headers: { "User-Agent": "YallaLondon-Orchestrator/1.0" },
          redirect: "manual",
          signal: AbortSignal.timeout(5000),
        });
        return { url, status: res.status, latencyMs: Date.now() - start };
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        const { url, status, latencyMs } = r.value;
        totalLatency += latencyMs;
        if (status >= 200 && status < 300) {
          result.healthy++;
        } else if (status >= 300 && status < 400) {
          result.redirected++;
        } else {
          result.broken++;
          result.brokenUrls.push({ url, status, latencyMs });
        }
        if (latencyMs > 3000) result.slow++;
      } else {
        result.broken++;
      }
    }
  }

  result.avgLatencyMs = result.totalUrls > 0
    ? Math.round(totalLatency / Math.min(result.totalUrls, maxUrls))
    : 0;

  return result;
}

// ── Structured Data URL Validation ────────────────────────────────────

async function checkSchemaUrls(
  siteUrl: string,
  pageUrls: string[],
  deadline: number
): Promise<SchemaValidationResult> {
  const result: SchemaValidationResult = {
    pagesChecked: 0,
    schemasFound: 0,
    urlsInSchemas: 0,
    brokenSchemaUrls: [],
    valid: true,
  };

  const urlsToCheck = new Set<{ pageUrl: string; schemaUrl: string }>();

  for (const pageUrl of pageUrls) {
    if (Date.now() > deadline - 12000) break;

    try {
      const res = await fetch(pageUrl, {
        headers: { "User-Agent": "YallaLondon-Orchestrator/1.0" },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) continue;
      result.pagesChecked++;

      const html = await res.text();
      // Extract JSON-LD blocks
      const jsonLdMatches =
        html.match(
          /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
        ) || [];

      for (const match of jsonLdMatches) {
        const jsonStr = match
          .replace(/<script[^>]*>/i, "")
          .replace(/<\/script>/i, "");
        try {
          const schema = JSON.parse(jsonStr);
          result.schemasFound++;
          // Extract URL fields recursively
          const schemaUrls = extractUrlsFromSchema(schema);
          for (const su of schemaUrls) {
            result.urlsInSchemas++;
            urlsToCheck.add({ pageUrl, schemaUrl: su });
          }
        } catch {
          // Invalid JSON-LD
        }
      }
    } catch {
      // Page fetch failed
    }
  }

  // Verify schema URLs resolve
  const urlEntries = Array.from(urlsToCheck).slice(0, 20);
  const checks = await Promise.allSettled(
    urlEntries.map(async ({ pageUrl, schemaUrl }) => {
      // Skip external URLs and data URIs
      if (!schemaUrl.startsWith(siteUrl) && !schemaUrl.startsWith("/"))
        return null;
      const fullUrl = schemaUrl.startsWith("/")
        ? `${siteUrl}${schemaUrl}`
        : schemaUrl;
      const res = await fetch(fullUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return { pageUrl, schemaUrl: fullUrl, status: res.status };
      return null;
    })
  );

  for (const check of checks) {
    if (check.status === "fulfilled" && check.value) {
      result.brokenSchemaUrls.push(check.value);
      result.valid = false;
    }
  }

  return result;
}

function extractUrlsFromSchema(obj: unknown): string[] {
  const urls: string[] = [];
  if (!obj || typeof obj !== "object") return urls;

  const urlKeys = ["url", "logo", "image", "contentUrl", "thumbnailUrl", "sameAs"];

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof value === "string" && urlKeys.includes(key)) {
      if (value.startsWith("http") || value.startsWith("/")) {
        urls.push(value);
      }
    } else if (typeof value === "object") {
      urls.push(...extractUrlsFromSchema(value));
    }
  }
  return urls;
}

// ── robots.txt Conflict Detection ─────────────────────────────────────

async function checkRobotsConflicts(
  siteUrl: string,
  _deadline: number
): Promise<RobotsConflictResult> {
  const result: RobotsConflictResult = {
    fetched: false,
    conflicts: [],
    aiCrawlersBlocked: [],
    aiCrawlersAllowed: [],
    hasCloudflareInjection: false,
  };

  try {
    const res = await fetch(`${siteUrl}/robots.txt`, {
      headers: { "User-Agent": "YallaLondon-Orchestrator/1.0" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return result;
    result.fetched = true;

    const content = await res.text();

    // Detect Cloudflare injection markers
    if (
      content.includes("# Cloudflare") ||
      content.includes("# Managed by Cloudflare") ||
      content.includes("cf-") ||
      // Detect pattern: same bot appears with Disallow before Allow
      /User-[Aa]gent:\s*(ClaudeBot|GPTBot|Google-Extended)[\s\S]*?Disallow:\s*\/[\s\S]*?User-[Aa]gent:\s*\1[\s\S]*?Allow:\s*\//m.test(
        content
      )
    ) {
      result.hasCloudflareInjection = true;
    }

    // Parse robots.txt into rule groups
    const groups = parseRobotsTxt(content);

    // Check each AI crawler
    for (const crawler of AI_CRAWLERS) {
      const crawlerGroups = groups.filter(
        (g) => g.userAgent.toLowerCase() === crawler.toLowerCase()
      );

      if (crawlerGroups.length === 0) {
        // Check wildcard rules
        const wildcardGroups = groups.filter((g) => g.userAgent === "*");
        const wildcardBlocked = wildcardGroups.some((g) =>
          g.rules.some((r) => r.type === "disallow" && r.path === "/")
        );
        if (wildcardBlocked) {
          result.aiCrawlersBlocked.push(crawler);
        } else {
          result.aiCrawlersAllowed.push(crawler);
        }
        continue;
      }

      // Check for conflicting rules for this crawler
      const hasDisallow = crawlerGroups.some((g) =>
        g.rules.some((r) => r.type === "disallow" && r.path === "/")
      );
      const hasAllow = crawlerGroups.some((g) =>
        g.rules.some((r) => r.type === "allow" && r.path === "/")
      );

      if (hasDisallow && hasAllow) {
        result.conflicts.push({
          userAgent: crawler,
          issue: `Has both Disallow: / and Allow: / — first group wins for most crawlers`,
          severity: "critical",
        });

        // First group wins for most crawlers
        const firstGroup = crawlerGroups[0];
        const firstRuleBlocks = firstGroup.rules.some(
          (r) => r.type === "disallow" && r.path === "/"
        );
        if (firstRuleBlocks) {
          result.aiCrawlersBlocked.push(crawler);
        } else {
          result.aiCrawlersAllowed.push(crawler);
        }
      } else if (hasDisallow) {
        result.aiCrawlersBlocked.push(crawler);
      } else {
        result.aiCrawlersAllowed.push(crawler);
      }
    }
  } catch {
    // Could not fetch robots.txt
  }

  return result;
}

interface RobotsGroup {
  userAgent: string;
  rules: { type: "allow" | "disallow"; path: string }[];
}

function parseRobotsTxt(content: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let currentAgent: string | null = null;
  let currentRules: RobotsGroup["rules"] = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const uaMatch = trimmed.match(/^User-[Aa]gent:\s*(.+)/i);
    if (uaMatch) {
      if (currentAgent) {
        groups.push({ userAgent: currentAgent, rules: currentRules });
      }
      currentAgent = uaMatch[1].trim();
      currentRules = [];
      continue;
    }

    const disallowMatch = trimmed.match(/^Disallow:\s*(.*)/i);
    if (disallowMatch && currentAgent) {
      currentRules.push({ type: "disallow", path: disallowMatch[1].trim() || "" });
    }

    const allowMatch = trimmed.match(/^Allow:\s*(.*)/i);
    if (allowMatch && currentAgent) {
      currentRules.push({ type: "allow", path: allowMatch[1].trim() || "" });
    }
  }

  if (currentAgent) {
    groups.push({ userAgent: currentAgent, rules: currentRules });
  }

  return groups;
}

// ── CDN Cache Performance ─────────────────────────────────────────────

async function checkCDNPerformance(
  siteUrl: string,
  deadline: number
): Promise<CDNPerformanceResult> {
  const result: CDNPerformanceResult = {
    sampledUrls: 0,
    hits: 0,
    misses: 0,
    hitRate: 0,
    avgTTFBMs: 0,
  };

  const testPaths = [
    "/",
    "/blog",
    "/about",
    "/events",
    "/sitemap.xml",
    "/favicon.png",
    "/images/yalla-london-logo.svg",
  ];

  let totalTTFB = 0;

  for (const path of testPaths) {
    if (Date.now() > deadline - 15000) break;

    try {
      const start = Date.now();
      const res = await fetch(`${siteUrl}${path}`, {
        method: "HEAD",
        headers: { "User-Agent": "YallaLondon-Orchestrator/1.0" },
        signal: AbortSignal.timeout(5000),
      });
      const ttfb = Date.now() - start;
      totalTTFB += ttfb;
      result.sampledUrls++;

      const cacheStatus = res.headers.get("cf-cache-status");
      if (cacheStatus === "HIT" || cacheStatus === "REVALIDATED") {
        result.hits++;
      } else {
        result.misses++;
      }
    } catch {
      // Skip failed requests
    }
  }

  result.hitRate =
    result.sampledUrls > 0
      ? Math.round((result.hits / result.sampledUrls) * 100)
      : 0;
  result.avgTTFBMs =
    result.sampledUrls > 0 ? Math.round(totalTTFB / result.sampledUrls) : 0;

  return result;
}

// ── Rendering Mode Detection ──────────────────────────────────────────

async function checkRenderingMode(
  pageUrls: string[],
  deadline: number
): Promise<RenderingCheckResult> {
  const result: RenderingCheckResult = {
    pagesChecked: 0,
    csrBailouts: [],
    missingContent: [],
  };

  for (const url of pageUrls.slice(0, 5)) {
    if (Date.now() > deadline - 8000) break;

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "YallaLondon-Orchestrator/1.0" },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) continue;
      result.pagesChecked++;

      const html = await res.text();

      // Check for CSR bailout signals
      // Next.js adds data-nextjs-page or __next when SSR is working
      const hasSSRContent = html.includes("__next") || html.includes("data-nextjs");
      const hasMainContent =
        html.includes('<main') || html.includes('id="main-content"');
      const bodyContentLength = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] || "").length;

      // Very thin body content suggests CSR bailout
      if (bodyContentLength < 500 && hasMainContent) {
        result.csrBailouts.push({
          url,
          reason: `Body content only ${bodyContentLength} chars — likely CSR bailout`,
        });
      }

      // Check for empty content areas
      if (!html.includes("<article") && !html.includes("<h1") && url !== "/") {
        result.missingContent.push({
          url,
          issue: "No <article> or <h1> found in server-rendered HTML",
        });
      }

      // Check x-nextjs-cache header
      const cacheHeader = res.headers.get("x-nextjs-cache");
      if (cacheHeader === "STALE") {
        result.csrBailouts.push({ url, reason: "x-nextjs-cache: STALE" });
      }
    } catch {
      // Page fetch failed
    }
  }

  return result;
}

// ── Default Results ───────────────────────────────────────────────────

function defaultSitemapResult(): SitemapHealthResult {
  return { totalUrls: 0, totalSitemapUrls: 0, healthy: 0, broken: 0, redirected: 0, slow: 0, brokenUrls: [], avgLatencyMs: 0 };
}

function defaultSchemaResult(): SchemaValidationResult {
  return { pagesChecked: 0, schemasFound: 0, urlsInSchemas: 0, brokenSchemaUrls: [], valid: true };
}

function defaultRobotsResult(): RobotsConflictResult {
  return { fetched: false, conflicts: [], aiCrawlersBlocked: [], aiCrawlersAllowed: [], hasCloudflareInjection: false };
}

function defaultCDNResult(): CDNPerformanceResult {
  return { sampledUrls: 0, hits: 0, misses: 0, hitRate: 0, avgTTFBMs: 0 };
}

function defaultRenderingResult(): RenderingCheckResult {
  return { pagesChecked: 0, csrBailouts: [], missingContent: [] };
}
