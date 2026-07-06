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
  // Locale + site-primary-locale-aware alternates.
  const alternates = await getLocaleAlternates("/events");
  const canonicalUrl = alternates.canonical;

  return {
    title: `${destination} Events & Shows | ${siteName}`,
    description: `Discover the best events, shows, exhibitions, and experiences in ${destination}. Book tickets for theatre, football, festivals, and exclusive VIP experiences.`,
    alternates,
    openGraph: {
      title: `${destination} Events & Shows | ${siteName}`,
      description: `Discover the best events, shows, exhibitions, and experiences in ${destination}. Book tickets for theatre, football, festivals, and exclusive VIP experiences.`,
      url: canonicalUrl,
      siteName,
      locale: "en_GB",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: `@${siteSlug}`,
      title: `${destination} Events & Shows | ${siteName}`,
      description: `Discover the best events, shows, exhibitions, and experiences in ${destination}. Book tickets for theatre, football, festivals, and exclusive VIP experiences.`,
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

// Featured events for schema — only include FUTURE events.
// Past events in Event JSON-LD actively harm SEO (Google penalizes stale structured data).
// These are manually maintained — update quarterly or when events pass.
const ALL_EVENTS = [
  {
    name: "London Marathon 2026",
    date: "2026-04-26T09:00:00+01:00",
    venue: "Greenwich to The Mall",
    city: "London",
    price: "0",
  },
  {
    name: "Chelsea Flower Show 2026",
    date: "2026-05-19T08:00:00+01:00",
    venue: "Royal Hospital Chelsea",
    city: "London",
    price: "40",
  },
  {
    name: "Wimbledon Championships 2026",
    date: "2026-06-29T11:00:00+01:00",
    venue: "All England Lawn Tennis Club",
    city: "London",
    price: "75",
  },
];
// Filter to only future events at build time
const FEATURED_EVENTS = ALL_EVENTS.filter((e) => new Date(e.date) > new Date());

export default async function Layout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Yalla London";
  const destination = siteConfig?.destination || "London";
  const baseUrl = await getBaseUrl();

  // Event JSON-LD for featured events
  const eventSchemas = FEATURED_EVENTS.map((e) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.name,
    startDate: e.date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: e.venue,
      address: { "@type": "PostalAddress", addressLocality: e.city, addressCountry: "GB" },
    },
    offers: {
      "@type": "Offer",
      price: e.price,
      priceCurrency: "GBP",
      availability: "https://schema.org/InStock",
      url: `${baseUrl}/events`,
    },
    organizer: { "@type": "Organization", name: siteName, url: baseUrl },
  }));

  return (
    <>
      <StructuredData
        type="breadcrumb"
        siteId={siteId}
        data={{
          items: [
            { name: "Home", url: baseUrl },
            { name: `${destination} Events`, url: `${baseUrl}/events` },
          ],
        }}
      />
      <StructuredData
        type="itemList"
        siteId={siteId}
        data={{
          name: `${destination} Events & Shows`,
          description: `Upcoming events, shows, exhibitions, and experiences in ${destination}`,
          items: [
            { name: `${destination} Theatre & Shows`, url: `${baseUrl}/events` },
            { name: `${destination} Exhibitions`, url: `${baseUrl}/events` },
            { name: `${destination} Festivals`, url: `${baseUrl}/events` },
          ],
        }}
      />
      {/* Individual Event schema for featured events */}
      {eventSchemas.map((schema, i) => (
        <script
          key={`event-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      {children}
    </>
  );
}
