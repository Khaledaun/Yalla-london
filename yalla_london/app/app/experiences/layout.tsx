import type { Metadata } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

export const metadata: Metadata = {
  title: "London Experiences & Activities | Yalla London",
  description:
    "Discover curated London experiences. From private tours and afternoon tea to exclusive cultural events, find the best activities for your London visit.",
  keywords: [
    "London experiences",
    "London activities",
    "London tours",
    "things to do London",
    "luxury London experiences",
  ],
  openGraph: {
    title: "London Experiences & Activities | Yalla London",
    description:
      "Discover curated London experiences from private tours to exclusive cultural events.",
    url: `${siteUrl}/experiences`,
    type: "website",
    locale: "en_GB",
    alternateLocale: "ar_SA",
    siteName: "Yalla London",
  },
  alternates: {
    canonical: `${siteUrl}/experiences`,
    languages: {
      "en-GB": `${siteUrl}/experiences`,
      "ar-SA": `${siteUrl}/ar/experiences`,
    },
  },
};

export default function ExperiencesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
