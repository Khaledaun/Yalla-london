import type { Metadata } from "next";
import { getDefaultSiteId, getSiteDomain } from "@/config/sites";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || getSiteDomain(getDefaultSiteId());

export const metadata: Metadata = {
  title: "About Yalla London - Your Luxury London Guide | Yalla London",
  description:
    "Discover the story behind Yalla London. Over 10 years of experience connecting Arab travellers with London's most exclusive hotels, restaurants, and experiences.",
  keywords: [
    "about Yalla London",
    "London luxury guide",
    "Arab travellers London",
    "London travel expert",
    "bilingual London guide",
    "London lifestyle blog",
  ],
  openGraph: {
    title: "About Yalla London - Your Luxury London Guide",
    description:
      "Over 10 years connecting Arab travellers with London's most exclusive experiences.",
    url: `${siteUrl}/about`,
    type: "website",
    locale: "en_GB",
    alternateLocale: "ar_SA",
    siteName: "Yalla London",
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "About Yalla London",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Yalla London",
    description:
      "Over 10 years connecting Arab travellers with London's most exclusive experiences.",
    images: [`${siteUrl}/og-image.jpg`],
  },
  alternates: {
    canonical: `${siteUrl}/about`,
    languages: {
      "en-GB": `${siteUrl}/about`,
      "ar-SA": `${siteUrl}/ar/about`,
    },
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
