import { headers } from "next/headers";
import type { Language } from "@/lib/types";

/**
 * Get the current locale from middleware headers (server-side only).
 * Returns 'ar' for /ar/* routes, 'en' otherwise.
 */
export async function getServerLocale(): Promise<Language> {
  const headersList = await headers();
  const locale = headersList.get("x-locale");
  return locale === "ar" ? "ar" : "en";
}

/**
 * Get the base URL including locale prefix for link generation.
 */
export async function getLocalizedBaseUrl(): Promise<string> {
  const headersList = await headers();
  const hostname = headersList.get("x-hostname") || "www.yalla-london.com";
  const locale = headersList.get("x-locale") || "en";
  const baseUrl =
    hostname === "localhost:3000"
      ? "http://localhost:3000"
      : `https://${hostname}`;
  return locale === "ar" ? `${baseUrl}/ar` : baseUrl;
}
