import type { Metadata } from "next";
import { headers } from "next/headers";
import { getBaseUrl } from "@/lib/url-utils";
import { ZenithaLuxuryHomepage } from "@/components/zenitha-luxury/zenitha-luxury-homepage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const title = "Our Brands — Zenitha.Luxury";
  const description =
    "Explore the Zenitha portfolio: Yalla London, Zenitha Yachts, Arabaldives, Yalla Riviera, Yalla Istanbul, and Yalla Thailand.";

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/brands`,
      languages: {
        "en-GB": `${baseUrl}/brands`,
        "ar-SA": `${baseUrl}/ar/brands`,
        "x-default": `${baseUrl}/brands`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/brands`,
      siteName: "Zenitha.Luxury",
      type: "website",
    },
  };
}

export default async function BrandsPage() {
  // The homepage component already has the full portfolio grid
  // This page serves as a dedicated /brands URL for the parent site
  return <ZenithaLuxuryHomepage />;
}
