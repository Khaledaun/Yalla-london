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
  const canonicalUrl = `${baseUrl}/how-it-works`;

  const title = `How It Works | ${siteName}`;
  const description =
    "Discover how easy it is to book your dream yacht charter. From inquiry to setting sail, our experts handle every detail of your Mediterranean voyage.";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/how-it-works`,
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
          alt: `${siteName} - How It Works`,
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

export default async function HowItWorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const baseUrl = await getBaseUrl();

  const siteName = getSiteConfig(siteId)?.name || "Zenitha Yachts";

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `How It Works | ${siteName}`,
    description:
      "Discover how easy it is to book your dream yacht charter. From initial inquiry to setting sail, our expert team handles every detail.",
    url: `${baseUrl}/how-it-works`,
    isPartOf: { "@type": "WebSite", name: siteName, url: baseUrl },
    mainEntity: {
      "@type": "Service",
      name: "Yacht Charter Booking Service",
      provider: { "@type": "Organization", name: siteName, url: baseUrl },
      description:
        "End-to-end yacht charter booking service covering the Mediterranean. From inquiry to embarkation, our specialists handle every detail.",
      areaServed: "Mediterranean",
      serviceType: "Yacht Charter Brokerage",
    },
  };

  return (
    <>
      <StructuredData
        type="breadcrumb"
        siteId={siteId}
        data={{
          items: [
            { name: "Home", url: baseUrl },
            { name: "How It Works", url: `${baseUrl}/how-it-works` },
          ],
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      {children}
    </>
  );
}
