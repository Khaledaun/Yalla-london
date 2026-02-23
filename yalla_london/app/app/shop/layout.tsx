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
            { name: "Shop", url: `${baseUrl}/shop` },
          ],
        }}
      />
      <StructuredData
        type="itemList"
        siteId={siteId}
        data={{
          name: `${destination} Travel Guides & Digital Products`,
          description: `Premium travel guides, maps, and planning tools for ${destination}`,
          items: [
            { name: `${destination} City Guide`, url: `${baseUrl}/shop` },
            { name: `${destination} Restaurant Guide`, url: `${baseUrl}/shop` },
            { name: `${destination} Travel Planner`, url: `${baseUrl}/shop` },
          ],
        }}
      />
      <StructuredData
        type="product"
        siteId={siteId}
        data={{
          name: `Complete ${destination} Guide 2026`,
          description: `The ultimate 45-page guide covering everything you need to know for your ${destination} visit. Includes halal restaurants, prayer facilities, attractions, and insider tips.`,
          price: "9.99",
          currency: "GBP",
          availability: "https://schema.org/InStock",
          url: `${baseUrl}/shop`,
          image: `${baseUrl}/images/${siteConfig?.slug || "yalla-london"}-og.jpg`,
          category: "Travel Guide",
          sku: `${siteConfig?.slug || "yl"}-guide-2026`,
        }}
      />
      <StructuredData
        type="product"
        siteId={siteId}
        data={{
          name: `Halal Restaurant Guide ${destination}`,
          description: `Discover 100+ halal restaurants across ${destination}. From fine dining to street food, organized by cuisine, location, and price range.`,
          price: "7.99",
          currency: "GBP",
          availability: "https://schema.org/InStock",
          url: `${baseUrl}/shop`,
          image: `${baseUrl}/images/${siteConfig?.slug || "yalla-london"}-og.jpg`,
          category: "Restaurant Guide",
          sku: `${siteConfig?.slug || "yl"}-halal-guide`,
        }}
      />
      <StructuredData
        type="product"
        siteId={siteId}
        data={{
          name: `Ultimate ${destination} Bundle`,
          description: `All our guides in one discounted package. Save 40% and get everything you need for the perfect ${destination} experience.`,
          price: "29.99",
          currency: "GBP",
          availability: "https://schema.org/InStock",
          url: `${baseUrl}/shop`,
          image: `${baseUrl}/images/${siteConfig?.slug || "yalla-london"}-og.jpg`,
          category: "Travel Bundle",
          sku: `${siteConfig?.slug || "yl"}-ultimate-bundle`,
        }}
      />
      {children}
    </>
  );
}
