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
  const canonicalUrl = `${baseUrl}/destinations`;

  return {
    title: `Yacht Charter Destinations | ${siteName}`,
    description:
      "Explore premier yacht charter destinations across the Mediterranean, Arabian Gulf, and Red Sea. Curated sailing guides, marina info, and seasonal advice for discerning charterers.",
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/destinations`,
        "x-default": canonicalUrl,
      },
    },
    openGraph: {
      title: `Yacht Charter Destinations | ${siteName}`,
      description:
        "Explore premier yacht charter destinations across the Mediterranean, Arabian Gulf, and Red Sea.",
      url: canonicalUrl,
      siteName,
      locale: "en_GB",
      alternateLocale: "ar_SA",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Yacht Charter Destinations | ${siteName}`,
      description:
        "Explore premier yacht charter destinations across the Mediterranean, Arabian Gulf, and Red Sea.",
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

export default async function DestinationsLayout({
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
            { name: "Destinations", url: `${baseUrl}/destinations` },
          ],
        }}
      />
      {children}
    </>
  );
}
