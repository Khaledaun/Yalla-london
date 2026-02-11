import type { Metadata } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

export const metadata: Metadata = {
  title: "Our Team - Meet the People Behind Yalla London",
  description:
    "Meet the passionate team behind Yalla London. Experts in luxury London travel, dining, and experiences for Arab travellers.",
  openGraph: {
    title: "Our Team | Yalla London",
    description:
      "Meet the passionate team behind Yalla London.",
    url: `${siteUrl}/team`,
    type: "website",
    locale: "en_GB",
    alternateLocale: "ar_SA",
    siteName: "Yalla London",
  },
  alternates: {
    canonical: `${siteUrl}/team`,
    languages: {
      "en-GB": `${siteUrl}/team`,
      "ar-SA": `${siteUrl}/ar/team`,
    },
  },
};

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
