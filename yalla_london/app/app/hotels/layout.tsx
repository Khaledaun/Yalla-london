import type { Metadata } from "next";
import { getSiteDomain, getDefaultSiteId } from "@/config/sites";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || getSiteDomain(getDefaultSiteId());

export const metadata: Metadata = {
  title: "Best London Hotels for Arab Travellers | Yalla London",
  description:
    "Curated luxury hotel recommendations in London. Find halal-friendly hotels with Arabic-speaking staff, prayer facilities, and premium amenities.",
  keywords: [
    "London hotels",
    "luxury hotels London",
    "halal friendly hotels London",
    "Arab travellers London hotels",
    "five star hotels London",
  ],
  openGraph: {
    title: "Best London Hotels for Arab Travellers | Yalla London",
    description:
      "Curated luxury hotel recommendations with halal-friendly amenities.",
    url: `${siteUrl}/hotels`,
    type: "website",
    locale: "en_GB",
    alternateLocale: "ar_SA",
    siteName: "Yalla London",
  },
  alternates: {
    canonical: `${siteUrl}/hotels`,
    languages: {
      "en-GB": `${siteUrl}/hotels`,
      "ar-SA": `${siteUrl}/ar/hotels`,
    },
  },
};

export default function HotelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
