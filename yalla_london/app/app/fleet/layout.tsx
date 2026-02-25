import React from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getBaseUrl } from "@/lib/url-utils";
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
  const canonicalUrl = `${baseUrl}/fleet`;

  const title = `Our Fleet — Motor Yachts, Catamarans, Sailing Yachts & Gulets | ${siteName}`;
  const description =
    "Browse our curated fleet of luxury charter yachts. Motor yachts, catamarans, sailing yachts, and traditional gulets — each handpicked for exceptional Mediterranean, Adriatic, and Aegean sailing.";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/fleet`,
        "x-default": canonicalUrl,
      },
    },
    openGraph: {
      title,
      description,
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
          alt: `${siteName} - Our Fleet`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: `@${siteSlug}`,
      title,
      description,
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

export default async function FleetLayout({
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
            { name: "Fleet", url: `${baseUrl}/fleet` },
          ],
        }}
      />
      {children}
    </>
  );
}
