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
  const canonicalUrl = `${baseUrl}/about`;

  return {
    title: `About ${siteName} | ${destination} Travel Guide for Arab Visitors`,
    description: `About ${siteName} — your premium ${destination} travel guide for Arab visitors. Discover our story, mission, team, and commitment to luxury travel.`,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/about`,
        "x-default": canonicalUrl,
      },
    },
    openGraph: {
      title: `About ${siteName} | ${destination} Travel Guide for Arab Visitors`,
      description: `About ${siteName} — your premium ${destination} travel guide for Arab visitors. Discover our story, mission, team, and commitment to luxury travel.`,
      url: canonicalUrl,
      siteName,
      locale: "en_GB",
      alternateLocale: "ar_SA",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: `@${siteSlug}`,
      title: `About ${siteName} | ${destination} Travel Guide for Arab Visitors`,
      description: `About ${siteName} — your premium ${destination} travel guide for Arab visitors. Discover our story, mission, team, and commitment to luxury travel.`,
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
            { name: "About", url: `${baseUrl}/about` },
          ],
        }}
      />
      <StructuredData type="organization" siteId={siteId} />
      {children}
    </>
  );
}
