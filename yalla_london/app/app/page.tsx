import type { Metadata } from "next";
import { headers } from "next/headers";
import { getBaseUrl } from "@/lib/url-utils";
import {
  getDefaultSiteId,
  getSiteConfig,
  getSiteDescription,
  getSiteTagline,
  getSiteNameAr,
  isYachtSite,
} from "@/config/sites";
import { StructuredData } from "@/components/structured-data";
import { YallaHomepage } from "@/components/home/yalla-homepage";
import { ZenithaHomepage } from "@/components/zenitha/zenitha-homepage";

// Force dynamic rendering so headers() always returns the real request hostname.
// Without this, Next.js may statically generate the homepage at build time when
// headers() is unavailable — causing all sites to show the default (Yalla London) metadata.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();

  let siteId = getDefaultSiteId();
  try {
    const headersList = await headers();
    siteId = headersList.get("x-site-id") || siteId;
  } catch {
    // headers() unavailable during static generation
  }

  const siteConfig = getSiteConfig(siteId);
  const siteSlug = siteConfig?.slug || "yalla-london";
  const siteName = siteConfig?.name || "Yalla London";
  const siteNameAr = getSiteNameAr(siteId);

  if (isYachtSite(siteId)) {
    // Title: broad appeal — Mediterranean + Arabian Gulf, not GCC-only.
    // 74 chars (slightly over 60-char ideal but covers both key regions).
    const title = "Zenitha Yachts — Luxury Yacht Charters in the Mediterranean & Arabian Gulf";
    // Description: 156 chars — specific destinations + target markets (Europe, North America, Arab travellers).
    const description =
      "Private luxury yacht charters in the Greek Islands, Croatian Coast, Turkish Riviera & Arabian Gulf. Halal catering, multilingual crews, bespoke itineraries.";

    return {
      title,
      description,
      alternates: {
        canonical: baseUrl,
        languages: {
          "en-GB": baseUrl,
          "ar-SA": `${baseUrl}/ar`,
          "x-default": baseUrl,
        },
      },
      openGraph: {
        title,
        description,
        url: baseUrl,
        siteName: "Zenitha Yachts",
        locale: "en_GB",
        alternateLocale: "ar_SA",
        type: "website",
        images: [
          {
            url: `${baseUrl}/api/og?siteId=${siteId}`,
            width: 1200,
            height: 630,
            alt: "Zenitha Yachts — Luxury Yacht Charters in the Mediterranean & Arabian Gulf",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        site: "@zenithayachts",
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

  // Default: Yalla London and other travel blog sites
  const siteTagline = getSiteTagline(siteId);
  const siteDescription = getSiteDescription(siteId);

  return {
    title: `${siteName} — ${siteTagline} | ${siteNameAr}`,
    description: siteDescription,
    alternates: {
      canonical: baseUrl,
      languages: {
        "en-GB": baseUrl,
        "ar-SA": `${baseUrl}/ar`,
        "x-default": baseUrl,
      },
    },
    openGraph: {
      title: `${siteName} — ${siteTagline}`,
      description: siteDescription,
      url: baseUrl,
      siteName,
      locale: "en_GB",
      alternateLocale: "ar_SA",
      type: "website",
      images: [
        {
          url: `${baseUrl}/api/og?siteId=${siteId}`,
          width: 1200,
          height: 630,
          alt: `${siteName} — ${siteTagline}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: `@${siteSlug}`,
      title: `${siteName} — ${siteTagline}`,
      description: siteDescription,
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

export default async function Home() {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const locale = (headersList.get("x-locale") || "en") as "en" | "ar";
  const baseUrl = await getBaseUrl();

  if (isYachtSite(siteId)) {
    return (
      <>
        <StructuredData
          type="breadcrumb"
          siteId={siteId}
          data={{
            items: [{ name: "Home", url: baseUrl }],
          }}
        />
        <ZenithaHomepage locale={locale} />
      </>
    );
  }

  return (
    <>
      <StructuredData
        type="breadcrumb"
        siteId={siteId}
        data={{
          items: [{ name: "Home", url: baseUrl }],
        }}
      />
      <YallaHomepage locale={locale} />
    </>
  );
}
