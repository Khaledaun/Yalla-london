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
  const canonicalUrl = `${baseUrl}/events`;

  return {
    title: `${destination} Events & Shows | ${siteName}`,
    description: `Discover the best events, shows, exhibitions, and experiences in ${destination}. Book tickets for theatre, football, festivals, and exclusive VIP experiences.`,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/events`,
        "x-default": canonicalUrl,
      },
    },
    openGraph: {
      title: `${destination} Events & Shows | ${siteName}`,
      description: `Discover the best events, shows, exhibitions, and experiences in ${destination}. Book tickets for theatre, football, festivals, and exclusive VIP experiences.`,
      url: canonicalUrl,
      siteName,
      locale: "en_GB",
      alternateLocale: "ar_SA",
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
      {children}
    </>
  );
}
