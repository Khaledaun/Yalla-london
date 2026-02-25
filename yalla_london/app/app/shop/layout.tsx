import React from "react";
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

// Product data for schema — kept in sync with page fallback products
const SHOP_PRODUCTS = [
  { name: "Complete London Guide 2026", description: "The ultimate 45-page guide covering everything you need to know for your London visit.", price: "9.99", slug: "complete-london-guide-2026", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80" },
  { name: "Halal Restaurant Guide London", description: "Discover 100+ halal restaurants across London, from fine dining to street food.", price: "7.99", slug: "halal-restaurant-guide-london", image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80" },
  { name: "London Shopping Secrets", description: "Your insider guide to shopping in London — best boutiques, outlets, tax-free tips.", price: "6.99", slug: "london-shopping-secrets", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80" },
  { name: "Family London Adventure Pack", description: "Complete family travel bundle with kid-friendly attractions and activity guides.", price: "14.99", slug: "family-london-adventure-pack", image: "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=600&q=80" },
  { name: "Prayer Times & Mosques Guide", description: "Comprehensive guide to mosques and prayer facilities across London.", price: "4.99", slug: "prayer-times-mosques-guide", image: "https://images.unsplash.com/photo-1564769625392-651b89c75a66?w=600&q=80" },
  { name: "Ultimate London Bundle", description: "All our guides in one discounted package — save 40%.", price: "29.99", slug: "ultimate-london-bundle", image: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&q=80" },
];

export default async function Layout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Yalla London";
  const destination = siteConfig?.destination || "London";
  const baseUrl = await getBaseUrl();

  // Product JSON-LD for each guide
  const productSchemas = SHOP_PRODUCTS.map((p) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.image,
    brand: { "@type": "Organization", name: siteName },
    offers: {
      "@type": "Offer",
      price: p.price,
      priceCurrency: "GBP",
      availability: "https://schema.org/InStock",
      url: `${baseUrl}/shop#${p.slug}`,
      seller: { "@type": "Organization", name: siteName },
    },
    category: "Travel Guide",
  }));

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
          items: SHOP_PRODUCTS.map((p) => ({ name: p.name, url: `${baseUrl}/shop#${p.slug}` })),
        }}
      />
      {/* Individual Product schema for each guide */}
      {productSchemas.map((schema, i) => (
        <script
          key={`product-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      {children}
    </>
  );
}
