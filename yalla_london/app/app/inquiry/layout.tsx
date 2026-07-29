import React from "react";
import { Metadata } from "next";
import { headers } from "next/headers";
import { getBaseUrl, getLocaleAlternates } from "@/lib/url-utils";
import {
  getDefaultSiteId,
  getSiteConfig,
  getSiteDomain,
} from "@/config/sites";
import { StructuredData } from "@/components/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteDomain = getSiteDomain(siteId);
  const siteName = siteConfig?.name || "Zenitha Yachts";

  const title = `Charter Inquiry | ${siteName}`;
  const description =
    "Request a personalised yacht charter quote. Tell us about your dream Mediterranean sailing holiday and our experts will curate the perfect voyage within 24 hours.";

  const alternates = await getLocaleAlternates("/inquiry");
  const canonicalUrl = alternates.canonical;

  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName,
      type: "website",
      locale: "en_GB",
      alternateLocale: "ar_SA",
      images: [
        {
          url: `${siteDomain}/images/${siteConfig?.slug || "zenitha-yachts"}-og.jpg`,
          width: 1200,
          height: 630,
          alt: `${siteName} - Charter Inquiry`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
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
        "max-image-preview": "large" as const,
        "max-snippet": -1,
      },
    },
  };
}

export default async function InquiryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const baseUrl = await getBaseUrl();

  const breadcrumbItems = [
    { name: "Home", url: baseUrl },
    { name: "Inquiry", url: `${baseUrl}/inquiry` },
  ];

  return (
    <>
      <StructuredData
        type="breadcrumb"
        data={{ items: breadcrumbItems }}
        siteId={siteId}
      />
      {children}
    </>
  );
}
