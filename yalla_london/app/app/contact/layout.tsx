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
  const canonicalUrl = `${baseUrl}/contact`;

  // Yacht-specific metadata
  if (checkIsYachtSite(siteId)) {
    return {
      title: "Contact Zenitha Yachts | Charter Inquiries & Support",
      description:
        "Get in touch with Zenitha Yachts for Mediterranean yacht charter inquiries, destination questions, partnerships, or press. WhatsApp, email, or phone — we respond within 24 hours.",
      alternates: {
        canonical: canonicalUrl,
        languages: {
          "en-GB": canonicalUrl,
          "ar-SA": `${baseUrl}/ar/contact`,
          "x-default": canonicalUrl,
        },
      },
      openGraph: {
        title: "Contact Zenitha Yachts | Charter Inquiries & Support",
        description:
          "Get in touch with Zenitha Yachts for Mediterranean yacht charter inquiries, destination questions, partnerships, or press. WhatsApp, email, or phone — we respond within 24 hours.",
        url: canonicalUrl,
        siteName: "Zenitha Yachts",
        locale: "en_GB",
        alternateLocale: "ar_SA",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        site: "@zenithayachts",
        title: "Contact Zenitha Yachts | Charter Inquiries & Support",
        description:
          "Get in touch with Zenitha Yachts for Mediterranean yacht charter inquiries, destination questions, partnerships, or press. WhatsApp, email, or phone — we respond within 24 hours.",
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
    title: `Contact Us — Get in Touch | ${siteName}`,
    description: `Reach the ${siteName} team for ${destination} travel questions, partnerships, advertising, or feedback. We'd love to hear from you.`,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-GB": canonicalUrl,
        "ar-SA": `${baseUrl}/ar/contact`,
        "x-default": canonicalUrl,
      },
    },
    openGraph: {
      title: `Contact Us | ${siteName}`,
      description: `Reach the ${siteName} team for ${destination} travel questions, partnerships, advertising, or feedback. We'd love to hear from you.`,
      url: canonicalUrl,
      siteName,
      locale: "en_GB",
      alternateLocale: "ar_SA",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      site: `@${siteSlug}`,
      title: `Contact Us | ${siteName}`,
      description: `Reach the ${siteName} team for ${destination} travel questions, partnerships, advertising, or feedback. We'd love to hear from you.`,
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
            { name: "Contact", url: `${baseUrl}/contact` },
          ],
        }}
      />
      {children}
    </>
  );
}
