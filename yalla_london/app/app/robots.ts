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
 * IMPORTANT: Every rule MUST have explicit `disallow` — even if empty [].
 * Next.js generates `Disallow: /` for user-agent blocks without an explicit
 * disallow field, which blocks ALL crawling for that agent.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const hostname = headersList.get("x-hostname") || getSiteDomain(getDefaultSiteId()).replace(/^https?:\/\//, '');
  const baseUrl =
    hostname === "localhost:3000"
      ? "http://localhost:3000"
      : `https://${hostname}`;

  // Common disallow rules for bots that should skip admin/API
  const standardDisallow = ["/admin/", "/api/"];
  // Explicit empty array — prevents Next.js from generating "Disallow: /"
  const noDisallow: string[] = [];

  return {
    rules: [
      // Default: allow everything except admin/api
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
        disallow: noDisallow,
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
        disallow: noDisallow,
      },
      // Anthropic Claude
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: noDisallow,
      },
      {
        userAgent: "anthropic-ai",
        allow: "/",
        disallow: noDisallow,
      },
      // Perplexity AI search
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: noDisallow,
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
        disallow: noDisallow,
      },
      // Apple (Siri, Apple Intelligence)
      {
        userAgent: "Applebot",
        allow: "/",
        disallow: noDisallow,
      },
      // Cohere AI
      {
        userAgent: "cohere-ai",
        allow: "/",
        disallow: noDisallow,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
