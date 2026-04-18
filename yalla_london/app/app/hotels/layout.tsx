import React from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getBaseUrl, getLocaleAlternates } from "@/lib/url-utils";
import { getDefaultSiteId, getSiteConfig } from "@/config/sites";
import { StructuredData } from "@/components/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Yalla London";
  const siteSlug = siteConfig?.slug || "yallalondon";
  const destination = siteConfig?.destination || "London";
  // Locale + site-primary-locale-aware alternates. Works for EN-primary sites
  // (yalla-london) and AR-primary sites (arabaldives). See lib/url-utils.ts.
  const alternates = await getLocaleAlternates("/hotels");
  const canonicalUrl = alternates.canonical;

  return {
    title: `Luxury Hotels in ${destination} | ${siteName}`,
    description: `Discover the finest luxury hotels in ${destination} for Arab visitors. 5-star accommodations with Arabic-speaking staff, halal dining, and prime locations.`,
    alternates,
    openGraph: {
      title: `Luxury Hotels in ${destination} | ${siteName}`,
      description: `Discover the finest luxury hotels in ${destination} for Arab visitors. 5-star accommodations with Arabic-speaking staff, halal dining, and prime locations.`,
      url: canonicalUrl,
      siteName,
      locale: "en_GB",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: `@${siteSlug}`,
      title: `Luxury Hotels in ${destination} | ${siteName}`,
      description: `Discover the finest luxury hotels in ${destination} for Arab visitors. 5-star accommodations with Arabic-speaking staff, halal dining, and prime locations.`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

const FEATURED_HOTELS = [
  {
    name: "The Dorchester",
    description:
      "Iconic 5-star Mayfair hotel with Arabic-speaking staff, halal dining at CUT, and Park Lane views. A favourite among Gulf travelers since 1931.",
    address: "53 Park Lane, Mayfair",
    city: "London",
    postalCode: "W1K 1QA",
    priceRange: "££££",
    url: "https://www.dorchestercollection.com/london/the-dorchester",
  },
  {
    name: "Claridge's",
    description:
      "Art Deco masterpiece in Mayfair. Renowned for impeccable service, afternoon tea, and a strong following among Middle Eastern guests.",
    address: "Brook Street, Mayfair",
    city: "London",
    postalCode: "W1K 4HR",
    priceRange: "££££",
    url: "https://www.claridges.co.uk",
  },
  {
    name: "The Savoy",
    description:
      "Legendary Thames-side hotel since 1889. River-view suites, Gordon Ramsay dining, and Strand location perfect for West End theatre.",
    address: "Strand",
    city: "London",
    postalCode: "WC2R 0EZ",
    priceRange: "££££",
    url: "https://www.thesavoylondon.com",
  },
  {
    name: "Shangri-La The Shard",
    description:
      "London's highest hotel occupying floors 34-52 of The Shard. Panoramic city views, halal options available, and TING restaurant serving Asian-British cuisine.",
    address: "31 St Thomas Street",
    city: "London",
    postalCode: "SE1 9QU",
    priceRange: "££££",
    url: "https://www.shangri-la.com/london/shangrila",
  },
];

export default async function Layout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Yalla London";
  const destination = siteConfig?.destination || "London";
  const baseUrl = await getBaseUrl();

  const hotelSchemas = FEATURED_HOTELS.map((hotel) => ({
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: hotel.name,
    description: hotel.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: hotel.address,
      addressLocality: hotel.city,
      postalCode: hotel.postalCode,
      addressCountry: "GB",
    },
    priceRange: hotel.priceRange,
    url: hotel.url,
    brand: { "@type": "Organization", name: siteName },
  }));

  return (
    <>
      <StructuredData
        type="breadcrumb"
        siteId={siteId}
        data={{
          items: [
            { name: "Home", url: baseUrl },
            { name: `Hotels in ${destination}`, url: `${baseUrl}/hotels` },
          ],
        }}
      />
      <StructuredData
        type="itemList"
        siteId={siteId}
        data={{
          name: `Luxury Hotels in ${destination}`,
          description: `5-star hotels in ${destination} with Arabic-speaking staff and halal dining options`,
          items: FEATURED_HOTELS.map((h) => ({
            name: h.name,
            url: h.url,
          })),
        }}
      />
      {hotelSchemas.map((schema, i) => (
        <script
          key={`hotel-schema-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      {children}
    </>
  );
}
