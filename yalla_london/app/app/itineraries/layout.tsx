import React from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getBaseUrl, getLocaleAlternates } from "@/lib/url-utils";
import { getDefaultSiteId, getSiteConfig, getSiteDomain } from "@/config/sites";
import { StructuredData } from "@/components/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Zenitha Yachts";
  const siteSlug = siteConfig?.slug || "zenitha-yachts";
  const siteDomain = getSiteDomain(siteId);
  // Locale + site-primary-locale-aware alternates.
  const alternates = await getLocaleAlternates("/itineraries");
  const canonicalUrl = alternates.canonical;

  // Soft-404 prevention: if no itineraries exist for this site, the page
  // renders only an empty-state CTA. Tell Google not to index until we
  // have substantive content — otherwise GSC flags as "Soft 404".
  let hasContent = false;
  try {
    const { prisma } = await import("@/lib/db");
    const count = await prisma.charterItinerary.count({
      where: { siteId, status: "active" },
    });
    hasContent = count > 0;
  } catch (err) {
    console.warn("[itineraries/layout] count query failed:", err instanceof Error ? err.message : String(err));
  }

  return {
    title: `Sailing Itineraries | ${siteName}`,
    description:
      "Curated Mediterranean sailing routes with day-by-day breakdowns. Explore Greek Islands, Croatian Coast, Turkish Riviera, and more with expert-planned yacht charter itineraries.",
    alternates,
    openGraph: {
      title: `Sailing Itineraries | ${siteName}`,
      description:
        "Curated Mediterranean sailing routes with day-by-day breakdowns. Expert-planned yacht charter itineraries.",
      url: canonicalUrl,
      siteName,
      locale: "en_GB",
      alternateLocale: "ar_SA",
      type: "website",
      images: [
        {
          url: `${siteDomain}/images/${siteSlug}-og.jpg`,
          width: 1200,
          height: 630,
          alt: `${siteName} - Sailing Itineraries`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `Sailing Itineraries | ${siteName}`,
      description:
        "Curated Mediterranean sailing routes with day-by-day breakdowns.",
    },
    robots: {
      index: hasContent,
      follow: true,
      googleBot: {
        index: hasContent,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function ItinerariesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const baseUrl = await getBaseUrl();

  return (
    <>
      <StructuredData
        type="breadcrumb"
        siteId={siteId}
        data={{
          items: [
            { name: "Home", url: baseUrl },
            { name: "Itineraries", url: `${baseUrl}/itineraries` },
          ],
        }}
      />
      {children}
    </>
  );
}
