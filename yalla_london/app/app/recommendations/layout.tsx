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
  const canonicalUrl = `${baseUrl}/recommendations`;

  return {
    title: `Curated ${destination} Recommendations | ${siteName}`,
    description: `Our hand-picked ${destination} recommendations — luxury hotels, fine dining restaurants, and must-visit attractions curated for discerning Arab travelers.`,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/recommendations`,
        "x-default": canonicalUrl,
      },
    },
    openGraph: {
      title: `Curated ${destination} Recommendations | ${siteName}`,
      description: `Our hand-picked ${destination} recommendations — luxury hotels, fine dining restaurants, and must-visit attractions curated for discerning Arab travelers.`,
      url: canonicalUrl,
      siteName,
      locale: "en_GB",
      alternateLocale: "ar_SA",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: `@${siteSlug}`,
      title: `Curated ${destination} Recommendations | ${siteName}`,
      description: `Our hand-picked ${destination} recommendations — luxury hotels, fine dining restaurants, and must-visit attractions curated for discerning Arab travelers.`,
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
            { name: `${destination} Recommendations`, url: `${baseUrl}/recommendations` },
          ],
        }}
      />
      <StructuredData
        type="itemList"
        siteId={siteId}
        data={{
          name: `Curated ${destination} Recommendations`,
          description: `Hand-picked luxury hotels, restaurants, and attractions in ${destination} for Arab travelers`,
          items: [
            { name: `Luxury Hotels in ${destination}`, url: `${baseUrl}/hotels` },
            { name: `${destination} Experiences & Tours`, url: `${baseUrl}/experiences` },
            { name: `${destination} Events`, url: `${baseUrl}/events` },
            { name: `${destination} Travel Guides`, url: `${baseUrl}/shop` },
          ],
        }}
      />
      <StructuredData
        type="place"
        siteId={siteId}
        data={{
          type: "TouristAttraction",
          name: `${destination} Curated Recommendations`,
          description: `Hand-picked luxury hotels, fine dining restaurants, and must-visit attractions in ${destination} for discerning Arab travelers.`,
          city: destination,
        }}
      />
      {children}
    </>
  );
}
