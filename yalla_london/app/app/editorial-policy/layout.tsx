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
  const alternates = await getLocaleAlternates("/editorial-policy");
  const canonicalUrl = alternates.canonical;

  return {
    title: `Editorial Policy — Content Standards & Fact-Checking | ${siteName}`,
    description: `${siteName}'s editorial policy: how we research, write, fact-check, and update our content. Our commitment to accuracy, transparency, and first-hand experience.`,
    alternates,
    openGraph: {
      title: `Editorial Policy | ${siteName}`,
      description: `${siteName}'s editorial policy: how we research, write, fact-check, and update our content.`,
      url: canonicalUrl,
      siteName,
      locale: "en_GB",
      alternateLocale: "ar_SA",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: `@${siteSlug}`,
      title: `Editorial Policy | ${siteName}`,
      description: `${siteName}'s editorial policy: how we research, write, fact-check, and update our content.`,
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

export default async function Layout({ children }: { children: React.ReactNode }) {
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
            { name: "Editorial Policy", url: `${baseUrl}/editorial-policy` },
          ],
        }}
      />
      {children}
    </>
  );
}
