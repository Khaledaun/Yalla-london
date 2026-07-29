import type { Metadata } from "next";
import { getBaseUrl, getLocaleAlternates } from "@/lib/url-utils";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();

  return {
    title: "Free SEO Audit Tool — Instant Website Analysis | Yalla London",
    description:
      "Get a free, instant SEO audit of any webpage. Check meta tags, content quality, performance, links, and structured data. No signup required.",
    openGraph: {
      title: "Free SEO Audit Tool — Instant Website Analysis",
      description:
        "Get a comprehensive SEO score for any webpage in seconds. Check technical SEO, content quality, performance, and link structure.",
      url: `${baseUrl}/tools/seo-audit`,
      type: "website",
      siteName: "Yalla London",
    },
    twitter: {
      card: "summary_large_image",
      title: "Free SEO Audit Tool — Instant Website Analysis",
      description:
        "Get a comprehensive SEO score for any webpage in seconds. No signup required.",
    },
    alternates: await getLocaleAlternates("/tools/seo-audit"),
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function SeoAuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
