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
  const canonicalUrl = `${baseUrl}/shop`;

  return {
    title: `${destination} Travel Guides & Digital Products | ${siteName} Shop`,
    description: `Download premium ${destination} travel guides, maps, and planning tools. Expert-curated content for Arab visitors — instant digital delivery.`,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/shop`,
        "x-default": canonicalUrl,
      },
    },
    openGraph: {
      title: `${destination} Travel Guides & Digital Products | ${siteName} Shop`,
      description: `Download premium ${destination} travel guides, maps, and planning tools. Expert-curated content for Arab visitors — instant digital delivery.`,
      url: canonicalUrl,
      siteName,
      locale: "en_GB",
      alternateLocale: "ar_SA",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: `@${siteSlug}`,
      title: `${destination} Travel Guides & Digital Products | ${siteName} Shop`,
      description: `Download premium ${destination} travel guides, maps, and planning tools. Expert-curated content for Arab visitors — instant digital delivery.`,
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
            { name: "Shop", url: `${baseUrl}/shop` },
          ],
        }}
      />
      {children}
    </>
  );
}
