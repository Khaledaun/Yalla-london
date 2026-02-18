import type { Metadata } from "next";
import { getSiteDomain, getDefaultSiteId } from "@/config/sites";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || getSiteDomain(getDefaultSiteId());

export const metadata: Metadata = {
  title: "London Travel Guides & Digital Products | Yalla London Shop",
  description:
    "Premium digital London travel guides, curated itineraries, and insider tips. Beautifully designed PDF guides for Arab travellers exploring London.",
  keywords: [
    "London travel guide",
    "London shopping guide",
    "digital travel guide",
    "Arab travellers London",
    "London itinerary",
    "Yalla London shop",
  ],
  openGraph: {
    title: "London Travel Guides & Digital Products | Yalla London Shop",
    description:
      "Premium digital London travel guides and curated itineraries for Arab travellers.",
    url: `${siteUrl}/shop`,
    type: "website",
    locale: "en_GB",
    alternateLocale: "ar_SA",
    siteName: "Yalla London",
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "Yalla London Shop - Digital Travel Guides",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "London Travel Guides | Yalla London Shop",
    description:
      "Premium digital London travel guides and curated itineraries.",
    images: [`${siteUrl}/og-image.jpg`],
  },
  alternates: {
    canonical: `${siteUrl}/shop`,
    languages: {
      "en-GB": `${siteUrl}/shop`,
      "ar-SA": `${siteUrl}/ar/shop`,
    },
  },
};

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
