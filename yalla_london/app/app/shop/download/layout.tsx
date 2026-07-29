import React from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getDefaultSiteId, getSiteConfig } from "@/config/sites";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Yalla London";

  return {
    title: `Download | ${siteName} Shop`,
    robots: { index: false, follow: false },
  };
}

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
