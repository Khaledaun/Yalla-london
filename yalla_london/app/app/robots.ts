import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getSiteDomain, getDefaultSiteId } from "@/config/sites";

/**
 * Robots.txt configuration
 *
 * CRITICAL FOR SEO + AIO:
 * - Explicitly allow all AI crawlers (GPTBot, ClaudeBot, etc.) for AIO visibility
 * - Block admin/API routes from indexing
 * - Include sitemap reference
 *
 * IMPORTANT: Every rule MUST have explicit `disallow` — even if empty string "".
 * Next.js omits the Disallow line entirely for empty arrays [], which can cause
 * ambiguous interpretation. Using "" generates `Disallow: ` (explicit allow-all).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  // Middleware sets x-hostname for most routes but skips /robots.txt (EXCLUDED_PATHS).
  // Fall back to x-forwarded-host (set by Vercel) → host header → config default.
  const hostname =
    headersList.get("x-hostname") ||
    headersList.get("x-forwarded-host") ||
    headersList.get("host") ||
    getSiteDomain(getDefaultSiteId()).replace(/^https?:\/\//, "");
  const baseUrl =
    hostname === "localhost:3000"
      ? "http://localhost:3000"
      : `https://${hostname}`;

  // Common disallow rules for bots that should skip admin/API/internal paths
  // /cdn-cgi/ = Cloudflare internal endpoints (email protection, etc.) — wastes crawl budget
  // /d/ = blocks malformed /d/ownload URL pattern discovered by Google (broken external link)
  const standardDisallow = ["/admin/", "/api/", "/_next/", "/cdn-cgi/", "/d/"];
  // Empty string generates explicit `Disallow: ` line (= allow all).
  // Do NOT use [] — Next.js omits the Disallow line entirely for empty arrays.
  const allowAll = "";

  return {
    rules: [
      // Default: allow everything except admin/api/_next
      {
        userAgent: "*",
        allow: "/",
        disallow: standardDisallow,
      },
      // Google crawlers
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: standardDisallow,
      },
      // Google Extended (used for AI training/Gemini/AI Overview)
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: allowAll,
      },
      // OpenAI GPTBot (ChatGPT, AI search)
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: standardDisallow,
      },
      // OpenAI ChatGPT user browsing
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: allowAll,
      },
      // Anthropic Claude
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: allowAll,
      },
      {
        userAgent: "anthropic-ai",
        allow: "/",
        disallow: allowAll,
      },
      // Perplexity AI search
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: allowAll,
      },
      // Bing/Microsoft (Copilot, AI search)
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: standardDisallow,
      },
      // Meta AI
      {
        userAgent: "FacebookBot",
        allow: "/",
        disallow: allowAll,
      },
      // Apple (Siri, Apple Intelligence)
      {
        userAgent: "Applebot",
        allow: "/",
        disallow: allowAll,
      },
      // Cohere AI
      {
        userAgent: "cohere-ai",
        allow: "/",
        disallow: allowAll,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
