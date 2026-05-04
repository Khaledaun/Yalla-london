import { Metadata } from "next";
import { headers } from "next/headers";
import { getLocaleAlternates } from "@/lib/url-utils";
import CompareClient from "./compare-client";

export async function generateMetadata(): Promise<Metadata> {
  const alternates = await getLocaleAlternates("/yachts/compare");
  return {
    title: "Compare Yachts | Zenitha Yachts",
    description:
      "Compare charter yachts side-by-side. View specifications, pricing, amenities, and features to find your perfect Mediterranean yacht charter.",
    alternates,
    robots: { index: true, follow: true },
  };
}

export default async function ComparePage() {
  const hdrs = await headers();
  const locale = (hdrs.get("x-locale") as "en" | "ar") || "en";

  return <CompareClient locale={locale} />;
}
