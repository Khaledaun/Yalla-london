import type { Metadata } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

export const metadata: Metadata = {
  title:
    "London Recommendations - Hotels, Restaurants & Attractions | Yalla London",
  description:
    "Handpicked luxury recommendations for London's finest hotels, restaurants, and attractions. Curated for discerning Arab travelers by Yalla London.",
  keywords: [
    "London luxury hotels",
    "London halal restaurants",
    "London attractions",
    "London travel guide",
    "Arab travellers London",
    "best hotels London",
    "luxury dining London",
    "Yalla London recommendations",
  ],
  openGraph: {
    title:
      "London Recommendations - Hotels, Restaurants & Attractions | Yalla London",
    description:
      "Handpicked luxury recommendations for London's finest hotels, restaurants, and attractions.",
    url: `${siteUrl}/recommendations`,
    type: "website",
    locale: "en_GB",
    alternateLocale: "ar_SA",
    siteName: "Yalla London",
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "Yalla London - Luxury London Recommendations",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "London Recommendations | Yalla London",
    description:
      "Handpicked luxury recommendations for London's finest hotels, restaurants, and attractions.",
    images: [`${siteUrl}/og-image.jpg`],
  },
  alternates: {
    canonical: `${siteUrl}/recommendations`,
    languages: {
      "en-GB": `${siteUrl}/recommendations`,
      "ar-SA": `${siteUrl}/ar/recommendations`,
    },
  },
};

export default function RecommendationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
