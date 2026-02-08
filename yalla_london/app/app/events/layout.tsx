import type { Metadata } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

export const metadata: Metadata = {
  title:
    "London Events & Tickets - Football, Theatre, Festivals | Yalla London",
  description:
    "Book premium tickets for London's best events. Premier League football, West End theatre, festivals, and exclusive experiences curated for Arab travellers.",
  keywords: [
    "London events",
    "London tickets",
    "Premier League tickets",
    "West End theatre",
    "London festivals",
    "London experiences",
    "Arab travellers London events",
    "luxury London entertainment",
  ],
  openGraph: {
    title:
      "London Events & Tickets - Football, Theatre, Festivals | Yalla London",
    description:
      "Book premium tickets for London's best events. Football, theatre, festivals, and exclusive experiences.",
    url: `${siteUrl}/events`,
    type: "website",
    locale: "en_GB",
    alternateLocale: "ar_SA",
    siteName: "Yalla London",
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "Yalla London - London Events & Tickets",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "London Events & Tickets | Yalla London",
    description:
      "Book premium tickets for London's best events. Football, theatre, festivals, and exclusive experiences.",
    images: [`${siteUrl}/og-image.jpg`],
  },
  alternates: {
    canonical: `${siteUrl}/events`,
    languages: {
      "en-GB": `${siteUrl}/events`,
      "ar-SA": `${siteUrl}/ar/events`,
    },
  },
};

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
