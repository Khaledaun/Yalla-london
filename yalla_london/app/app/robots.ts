import type { MetadataRoute } from "next";
import { headers } from "next/headers";

/**
 * Robots.txt configuration
 *
 * CRITICAL FOR SEO + AIO:
 * - Explicitly allow all AI crawlers (GPTBot, ClaudeBot, etc.) for AIO visibility
 * - Block admin/API routes from indexing
 * - Include sitemap reference
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const hostname = headersList.get("x-hostname") || "www.yalla-london.com";
  const baseUrl =
    hostname === "localhost:3000"
      ? "http://localhost:3000"
      : `https://${hostname}`;

  return {
    rules: [
      // Default: allow everything except admin/api
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
      // Google crawlers
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
      // Google Extended (used for AI training/Gemini/AI Overview)
      {
        userAgent: "Google-Extended",
        allow: "/",
      },
      // OpenAI GPTBot (ChatGPT, AI search)
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
      // OpenAI ChatGPT user browsing
      {
        userAgent: "ChatGPT-User",
        allow: "/",
      },
      // Anthropic Claude
      {
        userAgent: "ClaudeBot",
        allow: "/",
      },
      {
        userAgent: "anthropic-ai",
        allow: "/",
      },
      // Perplexity AI search
      {
        userAgent: "PerplexityBot",
        allow: "/",
      },
      // Bing/Microsoft (Copilot, AI search)
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
      // Meta AI
      {
        userAgent: "FacebookBot",
        allow: "/",
      },
      // Apple (Siri, Apple Intelligence)
      {
        userAgent: "Applebot",
        allow: "/",
      },
      // Cohere AI
      {
        userAgent: "cohere-ai",
        allow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
