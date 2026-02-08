import type { Metadata } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

export const metadata: Metadata = {
  title: "Contact Us - Get in Touch | Yalla London",
  description:
    "Contact the Yalla London team for luxury London travel recommendations, partnerships, press inquiries, or personalized itinerary planning.",
  keywords: [
    "contact Yalla London",
    "London travel help",
    "London travel planning",
    "luxury London concierge",
    "Arab travellers support",
  ],
  openGraph: {
    title: "Contact Us | Yalla London",
    description:
      "Get in touch with Yalla London for luxury travel recommendations, partnerships, and personalized itinerary planning.",
    url: `${siteUrl}/contact`,
    type: "website",
    locale: "en_GB",
    alternateLocale: "ar_SA",
    siteName: "Yalla London",
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "Contact Yalla London",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Us | Yalla London",
    description:
      "Get in touch with Yalla London for luxury travel recommendations and personalized itinerary planning.",
    images: [`${siteUrl}/og-image.jpg`],
  },
  alternates: {
    canonical: `${siteUrl}/contact`,
    languages: {
      "en-GB": `${siteUrl}/contact`,
      "ar-SA": `${siteUrl}/ar/contact`,
    },
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
