import { Metadata } from "next";
import { headers } from "next/headers";
import { getBaseUrl } from "@/lib/url-utils";
import CompareClient from "./compare-client";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  return {
    title: "Compare Yachts | Zenitha Yachts",
    description:
      "Compare charter yachts side-by-side. View specifications, pricing, amenities, and features to find your perfect Mediterranean yacht charter.",
    alternates: {
      canonical: `${baseUrl}/yachts/compare`,
      languages: {
        "en-GB": `${baseUrl}/yachts/compare`,
        "ar-SA": `${baseUrl}/ar/yachts/compare`,
        "x-default": `${baseUrl}/yachts/compare`,
      },
    },
    robots: { index: true, follow: true },
  };
}

export default async function ComparePage() {
  const hdrs = await headers();
  const locale = (hdrs.get("x-locale") as "en" | "ar") || "en";

  return <CompareClient locale={locale} />;
}
