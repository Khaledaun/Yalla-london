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
  const siteName = siteConfig?.name || "Zenitha Yachts";
  const canonicalUrl = `${baseUrl}/itineraries`;

  return {
    title: `Sailing Itineraries | ${siteName}`,
    description:
      "Curated Mediterranean sailing routes with day-by-day breakdowns. Explore Greek Islands, Croatian Coast, Turkish Riviera, and more with expert-planned yacht charter itineraries.",
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/itineraries`,
        "x-default": canonicalUrl,
      },
    },
    openGraph: {
      title: `Sailing Itineraries | ${siteName}`,
      description:
        "Curated Mediterranean sailing routes with day-by-day breakdowns. Expert-planned yacht charter itineraries.",
      url: canonicalUrl,
      siteName,
      locale: "en_GB",
      alternateLocale: "ar_SA",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Sailing Itineraries | ${siteName}`,
      description:
        "Curated Mediterranean sailing routes with day-by-day breakdowns.",
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
