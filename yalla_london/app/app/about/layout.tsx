import type { Metadata } from "next";
import { headers } from "next/headers";
import { getBaseUrl } from "@/lib/url-utils";
import { getDefaultSiteId, getSiteConfig, isYachtSite as checkIsYachtSite } from "@/config/sites";
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

  // Yacht-specific metadata
  if (checkIsYachtSite(siteId)) {
    return {
      title: "About Zenitha Yachts | Luxury Yacht Charters",
      description:
        "Discover the Zenitha Yachts story. We curate exceptional Mediterranean yacht charter experiences for discerning GCC travellers, with halal-certified options and personalised service.",
      alternates: {
        canonical: canonicalUrl,
        languages: {
          "en-GB": canonicalUrl,
          "ar-SA": `${baseUrl}/ar/about`,
          "x-default": canonicalUrl,
        },
      },
      openGraph: {
        title: "About Zenitha Yachts | Luxury Yacht Charters",
        description:
          "Discover the Zenitha Yachts story. We curate exceptional Mediterranean yacht charter experiences for discerning GCC travellers, with halal-certified options and personalised service.",
        url: canonicalUrl,
        siteName: "Zenitha Yachts",
        locale: "en_GB",
        alternateLocale: "ar_SA",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        site: "@zenithayachts",
        title: "About Zenitha Yachts | Luxury Yacht Charters",
        description:
          "Discover the Zenitha Yachts story. We curate exceptional Mediterranean yacht charter experiences for discerning GCC travellers, with halal-certified options and personalised service.",
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

  // Default: travel blog sites
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
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Yalla London";
  const baseUrl = await getBaseUrl();

  // Person schema for founder — strengthens E-E-A-T entity understanding
  const founderSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Khaled N. Aun",
    jobTitle: "Founder",
    knowsAbout: [
      "London travel",
      "Halal dining",
      "Luxury hospitality",
      "Arab tourism",
      "Travel content creation",
    ],
    worksFor: {
      "@type": "Organization",
      name: "Zenitha.Luxury LLC",
      url: baseUrl,
    },
    brand: {
      "@type": "Brand",
      name: siteName,
    },
  };

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(founderSchema) }}
      />
      {children}
    </>
  );
}
