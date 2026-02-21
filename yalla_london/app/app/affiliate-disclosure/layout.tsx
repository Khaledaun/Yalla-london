import type { Metadata } from "next";
import { headers } from "next/headers";
import { getBaseUrl } from "@/lib/url-utils";
import { getDefaultSiteId, getSiteConfig } from "@/config/sites";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Yalla London";
  const siteSlug = siteConfig?.slug || "yallalondon";
  const destination = siteConfig?.destination || "London";
  const canonicalUrl = `${baseUrl}/affiliate-disclosure`;

  return {
    title: `Affiliate Disclosure | ${siteName}`,
    description: `${siteName} affiliate disclosure. Transparency about our affiliate partnerships, how we earn commissions, and our editorial independence policy.`,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/affiliate-disclosure`,
        "x-default": canonicalUrl,
      },
    },
    openGraph: {
      title: `Affiliate Disclosure | ${siteName}`,
      description: `${siteName} affiliate disclosure. Transparency about our affiliate partnerships, how we earn commissions, and our editorial independence policy.`,
      url: canonicalUrl,
      siteName,
      locale: "en_GB",
      alternateLocale: "ar_SA",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: `@${siteSlug}`,
      title: `Affiliate Disclosure | ${siteName}`,
      description: `${siteName} affiliate disclosure. Transparency about our affiliate partnerships, how we earn commissions, and our editorial independence policy.`,
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

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
