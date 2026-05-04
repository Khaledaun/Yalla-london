import { NextRequest, NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  Public SEO Audit API — lightweight, no auth required               */
/*  Rate limit: 10 requests per IP per hour (in-memory)                */
/* ------------------------------------------------------------------ */

export const runtime = "nodejs";
export const maxDuration = 30;

// ── In-memory rate limiter ──────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ── Types ───────────────────────────────────────────────────────────
interface AuditIssue {
  severity: "critical" | "warning" | "info";
  category: "technical" | "content" | "performance" | "links";
  title: string;
  description: string;
  recommendation: string;
}

interface AuditResult {
  url: string;
  scores: {
    overall: number;
    technical: number;
    content: number;
    performance: number;
    links: number;
  };
  grade: string;
  issues: AuditIssue[];
  meta: {
    title: string | null;
    description: string | null;
    canonical: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    robots: string | null;
    viewport: string | null;
    charset: string | null;
    language: string | null;
  };
  stats: {
    wordCount: number;
    headingCount: { h1: number; h2: number; h3: number };
    imageCount: number;
    imagesWithoutAlt: number;
    internalLinks: number;
    externalLinks: number;
    schemaTypes: string[];
    loadTimeMs: number;
    htmlSizeKb: number;
  };
  timestamp: string;
}

// ── Helpers ─────────────────────────────────────────────────────────

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  // Validate
  new URL(url); // throws on invalid
  return url;
}

function extractMeta(html: string, name: string): string | null {
  // Try name= and property= attributes
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["']`, "i"),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractTag(html: string, tag: string, attr?: string): string | null {
  if (attr) {
    const m = html.match(new RegExp(`<${tag}[^>]+${attr}=["']([^"']*)["']`, "i"));
    return m ? m[1] : null;
  }
  const m = html.match(new RegExp(`<${tag}[^>]*>([^<]*)`, "i"));
  return m ? m[1].trim() : null;
}

function countHeadings(html: string): { h1: number; h2: number; h3: number } {
  return {
    h1: (html.match(/<h1[\s>]/gi) || []).length,
    h2: (html.match(/<h2[\s>]/gi) || []).length,
    h3: (html.match(/<h3[\s>]/gi) || []).length,
  };
}

function countWords(html: string): number {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.split(/\s+/).filter(Boolean).length;
}

function extractSchemaTypes(html: string): string[] {
  const types: string[] = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"]) {
          const t = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
          types.push(...t);
        }
      }
    } catch {
      // malformed JSON-LD
    }
  }
  return [...new Set<string>(types)];
}

function countLinks(html: string, baseHost: string): { internal: number; external: number } {
  const hrefs = [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => m[1]);
  let internal = 0;
  let external = 0;
  for (const href of hrefs) {
    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
    try {
      const u = new URL(href, `https://${baseHost}`);
      if (u.hostname === baseHost || u.hostname === `www.${baseHost}` || `www.${u.hostname}` === baseHost) {
        internal++;
      } else {
        external++;
      }
    } catch {
      internal++; // relative URL
    }
  }
  return { internal, external };
}

function countImages(html: string): { total: number; withoutAlt: number } {
  const imgs = html.match(/<img[^>]*>/gi) || [];
  let withoutAlt = 0;
  for (const img of imgs) {
    if (!/alt=["'][^"']+["']/i.test(img)) withoutAlt++;
  }
  return { total: imgs.length, withoutAlt };
}

function scoreGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

// ── Main audit logic ────────────────────────────────────────────────

async function runAudit(url: string): Promise<AuditResult> {
  const issues: AuditIssue[] = [];
  const startTime = Date.now();

  // Fetch the page
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let html: string;
  let loadTimeMs: number;
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "ZenithaAuditBot/1.0 (+https://zenitha.luxury/audit)",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    loadTimeMs = Date.now() - startTime;

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    html = await res.text();
  } finally {
    clearTimeout(timeout);
  }

  const host = new URL(url).hostname.replace(/^www\./, "");
  const htmlSizeKb = Math.round(Buffer.byteLength(html, "utf8") / 1024);

  // ── Extract signals ────────────────────────────────────────────
  const title = extractTag(html, "title") || null;
  const metaDescription = extractMeta(html, "description");
  const canonical = (() => {
    const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
    return m ? m[1] : null;
  })();
  const ogTitle = extractMeta(html, "og:title");
  const ogDescription = extractMeta(html, "og:description");
  const ogImage = extractMeta(html, "og:image");
  const robots = extractMeta(html, "robots");
  const viewport = extractMeta(html, "viewport");
  const charset = (() => {
    const m = html.match(/<meta[^>]+charset=["']?([^"'\s>]+)/i);
    return m ? m[1] : null;
  })();
  const language = extractTag(html, "html", "lang");

  const headings = countHeadings(html);
  const wordCount = countWords(html);
  const images = countImages(html);
  const links = countLinks(html, host);
  const schemaTypes = extractSchemaTypes(html);

  // ── Score: Technical SEO (0-100) ───────────────────────────────
  let technical = 100;

  if (!title) {
    technical -= 20;
    issues.push({ severity: "critical", category: "technical", title: "Missing page title", description: "The page has no <title> tag.", recommendation: "Add a unique, descriptive title tag between 30-60 characters." });
  } else if (title.length < 30) {
    technical -= 10;
    issues.push({ severity: "warning", category: "technical", title: "Title too short", description: `Title is only ${title.length} characters.`, recommendation: "Expand the title to 30-60 characters for better CTR." });
  } else if (title.length > 60) {
    technical -= 5;
    issues.push({ severity: "warning", category: "technical", title: "Title may be truncated", description: `Title is ${title.length} characters (>60).`, recommendation: "Keep title under 60 characters to avoid truncation in SERPs." });
  }

  if (!metaDescription) {
    technical -= 15;
    issues.push({ severity: "critical", category: "technical", title: "Missing meta description", description: "No meta description tag found.", recommendation: "Add a compelling meta description of 120-160 characters." });
  } else if (metaDescription.length < 120) {
    technical -= 5;
    issues.push({ severity: "warning", category: "technical", title: "Meta description too short", description: `Description is ${metaDescription.length} chars (recommended 120-160).`, recommendation: "Expand to 120-160 characters for full SERP visibility." });
  } else if (metaDescription.length > 160) {
    technical -= 5;
    issues.push({ severity: "warning", category: "technical", title: "Meta description too long", description: `Description is ${metaDescription.length} chars (may truncate at 160).`, recommendation: "Trim to under 160 characters." });
  }

  if (!canonical) {
    technical -= 10;
    issues.push({ severity: "warning", category: "technical", title: "No canonical URL", description: "Missing <link rel=\"canonical\"> tag.", recommendation: "Add a canonical tag to prevent duplicate content issues." });
  }

  if (!viewport) {
    technical -= 15;
    issues.push({ severity: "critical", category: "technical", title: "Missing viewport meta", description: "No viewport meta tag found — page may not be mobile-friendly.", recommendation: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">." });
  }

  if (!robots) {
    issues.push({ severity: "info", category: "technical", title: "No robots meta tag", description: "Defaults to index,follow which is fine for most pages.", recommendation: "Explicitly set <meta name=\"robots\"> for clarity." });
  } else if (robots.includes("noindex")) {
    technical -= 20;
    issues.push({ severity: "critical", category: "technical", title: "Page is noindexed", description: "The robots meta tag contains 'noindex' — this page won't appear in search.", recommendation: "Remove 'noindex' if this page should be discoverable." });
  }

  if (!language) {
    technical -= 5;
    issues.push({ severity: "warning", category: "technical", title: "Missing lang attribute", description: "The <html> tag has no lang attribute.", recommendation: "Add lang=\"en\" (or appropriate language) to the <html> tag." });
  }

  if (!charset) {
    technical -= 5;
    issues.push({ severity: "warning", category: "technical", title: "Missing charset declaration", description: "No charset meta tag found.", recommendation: "Add <meta charset=\"UTF-8\"> for correct text rendering." });
  }

  if (!ogTitle && !ogDescription) {
    technical -= 5;
    issues.push({ severity: "warning", category: "technical", title: "Missing Open Graph tags", description: "No og:title or og:description found.", recommendation: "Add Open Graph tags for better social media previews." });
  }

  if (!ogImage) {
    technical -= 3;
    issues.push({ severity: "info", category: "technical", title: "No Open Graph image", description: "Missing og:image tag for social sharing.", recommendation: "Add an og:image (1200x630px recommended) for rich social previews." });
  }

  if (schemaTypes.length === 0) {
    technical -= 5;
    issues.push({ severity: "warning", category: "technical", title: "No structured data", description: "No JSON-LD schema markup found.", recommendation: "Add structured data (Article, Organization, BreadcrumbList) for rich results." });
  } else {
    issues.push({ severity: "info", category: "technical", title: "Structured data found", description: `Schema types: ${schemaTypes.join(", ")}`, recommendation: "Validate with Google's Rich Results Test." });
  }

  technical = Math.max(0, Math.min(100, technical));

  // ── Score: Content Quality (0-100) ─────────────────────────────
  let content = 100;

  if (headings.h1 === 0) {
    content -= 20;
    issues.push({ severity: "critical", category: "content", title: "No H1 heading", description: "The page has no H1 tag.", recommendation: "Add exactly one H1 tag that includes your primary keyword." });
  } else if (headings.h1 > 1) {
    content -= 10;
    issues.push({ severity: "warning", category: "content", title: "Multiple H1 headings", description: `Found ${headings.h1} H1 tags (should be exactly 1).`, recommendation: "Use a single H1 for the main heading; use H2-H6 for subheadings." });
  }

  if (headings.h2 === 0) {
    content -= 10;
    issues.push({ severity: "warning", category: "content", title: "No H2 headings", description: "No H2 subheadings found.", recommendation: "Add H2 headings to structure your content and improve readability." });
  }

  if (wordCount < 300) {
    content -= 25;
    issues.push({ severity: "critical", category: "content", title: "Thin content", description: `Only ${wordCount} words detected.`, recommendation: "Aim for at least 800-1,500 words of quality content for better rankings." });
  } else if (wordCount < 800) {
    content -= 10;
    issues.push({ severity: "warning", category: "content", title: "Content could be longer", description: `${wordCount} words detected.`, recommendation: "Consider expanding to 1,000-1,500+ words for competitive topics." });
  } else {
    issues.push({ severity: "info", category: "content", title: "Good content length", description: `${wordCount} words detected.`, recommendation: "Content length is solid. Focus on depth and quality." });
  }

  if (images.total === 0) {
    content -= 10;
    issues.push({ severity: "warning", category: "content", title: "No images", description: "The page has no images.", recommendation: "Add relevant images to improve engagement and visual appeal." });
  }

  if (images.withoutAlt > 0) {
    content -= Math.min(15, images.withoutAlt * 3);
    issues.push({ severity: "warning", category: "content", title: "Images missing alt text", description: `${images.withoutAlt} of ${images.total} images lack alt attributes.`, recommendation: "Add descriptive alt text to all images for accessibility and SEO." });
  }

  content = Math.max(0, Math.min(100, content));

  // ── Score: Performance (0-100) ─────────────────────────────────
  let performance = 100;

  if (loadTimeMs > 5000) {
    performance -= 30;
    issues.push({ severity: "critical", category: "performance", title: "Very slow response", description: `Page took ${(loadTimeMs / 1000).toFixed(1)}s to load.`, recommendation: "Optimize server response time. Target under 1s TTFB." });
  } else if (loadTimeMs > 2000) {
    performance -= 15;
    issues.push({ severity: "warning", category: "performance", title: "Slow response", description: `Response time: ${loadTimeMs}ms.`, recommendation: "Consider caching, CDN, or server optimization." });
  } else {
    issues.push({ severity: "info", category: "performance", title: "Fast response", description: `Response time: ${loadTimeMs}ms.`, recommendation: "Server response is good." });
  }

  if (htmlSizeKb > 500) {
    performance -= 20;
    issues.push({ severity: "warning", category: "performance", title: "Large HTML document", description: `HTML size: ${htmlSizeKb}KB.`, recommendation: "Reduce HTML size by removing inline styles/scripts and compressing." });
  } else if (htmlSizeKb > 200) {
    performance -= 10;
    issues.push({ severity: "info", category: "performance", title: "Moderate HTML size", description: `HTML size: ${htmlSizeKb}KB.`, recommendation: "Consider reducing HTML payload for faster paint." });
  }

  // Check for render-blocking hints
  const hasDeferedScripts = /<script[^>]+(defer|async)/i.test(html);
  if (!hasDeferedScripts && /<script[^>]+src=/i.test(html)) {
    performance -= 10;
    issues.push({ severity: "warning", category: "performance", title: "Render-blocking scripts", description: "External scripts without defer/async detected.", recommendation: "Add 'defer' or 'async' to non-critical scripts." });
  }

  performance = Math.max(0, Math.min(100, performance));

  // ── Score: Links (0-100) ───────────────────────────────────────
  let linksScore = 100;

  if (links.internal === 0) {
    linksScore -= 25;
    issues.push({ severity: "critical", category: "links", title: "No internal links", description: "No internal links found on the page.", recommendation: "Add internal links to related content to improve crawlability." });
  } else if (links.internal < 3) {
    linksScore -= 10;
    issues.push({ severity: "warning", category: "links", title: "Few internal links", description: `Only ${links.internal} internal links found.`, recommendation: "Add 3+ internal links to distribute page authority." });
  } else {
    issues.push({ severity: "info", category: "links", title: "Good internal linking", description: `${links.internal} internal links found.`, recommendation: "Internal linking looks healthy." });
  }

  if (links.external === 0) {
    linksScore -= 10;
    issues.push({ severity: "info", category: "links", title: "No external links", description: "No outbound links to external sites.", recommendation: "Linking to authoritative sources can boost credibility." });
  } else {
    issues.push({ severity: "info", category: "links", title: "External links present", description: `${links.external} external links found.`, recommendation: "Ensure external links point to reputable, relevant sources." });
  }

  linksScore = Math.max(0, Math.min(100, linksScore));

  // ── Composite score ────────────────────────────────────────────
  const overall = Math.round(
    technical * 0.35 + content * 0.30 + performance * 0.20 + linksScore * 0.15
  );

  // Sort issues: critical first, then warning, then info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    url,
    scores: {
      overall,
      technical,
      content,
      performance,
      links: linksScore,
    },
    grade: scoreGrade(overall),
    issues,
    meta: {
      title,
      description: metaDescription,
      canonical,
      ogTitle,
      ogDescription,
      ogImage,
      robots,
      viewport,
      charset,
      language,
    },
    stats: {
      wordCount,
      headingCount: headings,
      imageCount: images.total,
      imagesWithoutAlt: images.withoutAlt,
      internalLinks: links.internal,
      externalLinks: links.external,
      schemaTypes,
      loadTimeMs,
      htmlSizeKb,
    },
    timestamp: new Date().toISOString(),
  };
}

// ── Route handler ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Maximum 10 audits per hour." },
      { status: 429 }
    );
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json({ error: "Missing or invalid 'url' field" }, { status: 400 });
  }

  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeUrl(body.url);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  try {
    const result = await runAudit(normalizedUrl);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? "The website took too long to respond (>10s timeout)."
          : err.message
        : "An unexpected error occurred.";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
