import React from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getBaseUrl } from "@/lib/url-utils";
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
  const canonicalUrl = `${baseUrl}/experiences`;

  return {
    title: `${destination} Experiences & Tours | ${siteName}`,
    description: `Book the best tours, attractions, and experiences in ${destination}. From iconic landmarks to hidden gems — curated for Arab visitors with halal-friendly options.`,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/experiences`,
        "x-default": canonicalUrl,
      },
    },
    openGraph: {
      title: `${destination} Experiences & Tours | ${siteName}`,
      description: `Book the best tours, attractions, and experiences in ${destination}. From iconic landmarks to hidden gems — curated for Arab visitors with halal-friendly options.`,
      url: canonicalUrl,
      siteName,
      locale: "en_GB",
      alternateLocale: "ar_SA",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: `@${siteSlug}`,
      title: `${destination} Experiences & Tours | ${siteName}`,
      description: `Book the best tours, attractions, and experiences in ${destination}. From iconic landmarks to hidden gems — curated for Arab visitors with halal-friendly options.`,
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

const FEATURED_EXPERIENCES = [
  {
    name: "Tower of London",
    description: "Nearly 1,000 years of royal history. See the Crown Jewels, explore the medieval palace, and hear tales from the Yeoman Warders. Audio guides available in Arabic.",
    address: "Tower Hill",
    city: "London",
    postalCode: "EC3N 4AB",
    priceRange: "££",
  },
  {
    name: "Afternoon Tea at The Ritz",
    description: "The quintessential London experience — finger sandwiches, scones with clotted cream, and 18 varieties of loose-leaf tea in the Palm Court. Halal options on request.",
    address: "150 Piccadilly",
    city: "London",
    postalCode: "W1J 9BR",
    priceRange: "£££",
  },
  {
    name: "Warner Bros. Studio Tour — The Making of Harry Potter",
    description: "Walk through authentic sets, discover filmmaking secrets, and taste Butterbeer. Located 20 miles northwest of London with direct shuttle buses from Watford Junction.",
    address: "Studio Tour Drive, Leavesden",
    city: "Watford",
    postalCode: "WD25 7LR",
    priceRange: "££",
  },
  {
    name: "Harrods",
    description: "The world's most famous department store. Seven floors of luxury fashion, beauty, and the legendary Food Halls. Personal shopping service and Arabic-speaking staff available.",
    address: "87-135 Brompton Road, Knightsbridge",
    city: "London",
    postalCode: "SW1X 7XL",
    priceRange: "££££",
  },
];

export default async function Layout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const destination = siteConfig?.destination || "London";
  const baseUrl = await getBaseUrl();

  return (
    <>
      <StructuredData
        type="breadcrumb"
        siteId={siteId}
        data={{
          items: [
            { name: "Home", url: baseUrl },
            { name: `Experiences in ${destination}`, url: `${baseUrl}/experiences` },
          ],
        }}
      />
      <StructuredData
        type="itemList"
        siteId={siteId}
        data={{
          name: `${destination} Experiences & Tours`,
          description: `Must-visit attractions and experiences in ${destination} curated for Arab visitors`,
          items: FEATURED_EXPERIENCES.map((e) => ({
            name: e.name,
            url: `${baseUrl}/experiences`,
          })),
        }}
      />
      {FEATURED_EXPERIENCES.map((exp, i) => (
        <StructuredData
          key={`exp-schema-${i}`}
          type="place"
          siteId={siteId}
          data={{
            type: "TouristAttraction",
            name: exp.name,
            description: exp.description,
            address: exp.address,
            city: exp.city,
            postalCode: exp.postalCode,
            priceRange: exp.priceRange,
          }}
        />
      ))}
      {children}
    </>
  );
}
