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
      {children}
    </>
  );
}
