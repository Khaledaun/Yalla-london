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
  const siteSlug = siteConfig?.slug || "zenitha-yachts-med";
  const canonicalUrl = `${baseUrl}/charter-planner`;

  const title = `AI Charter Planner | ${siteName}`;
  const description =
    "Let our intelligent charter planner create your perfect Mediterranean yacht itinerary. Answer a few questions and receive personalised recommendations.";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/charter-planner`,
        "x-default": canonicalUrl,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName,
      locale: "en_GB",
      alternateLocale: "ar_SA",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: `@${siteSlug}`,
      title,
      description,
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

export default async function CharterPlannerLayout({
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
            { name: "Charter Planner", url: `${baseUrl}/charter-planner` },
          ],
        }}
      />
      {children}
    </>
  );
}
