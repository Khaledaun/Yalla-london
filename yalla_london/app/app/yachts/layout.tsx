import React from "react";
import { headers } from "next/headers";
import { getBaseUrl } from "@/lib/url-utils";
import { getDefaultSiteId } from "@/config/sites";
import { StructuredData } from "@/components/structured-data";

export default async function YachtsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const baseUrl = await getBaseUrl();

  return (
    <>
      <StructuredData
        type="breadcrumb"
        siteId={siteId}
        data={{
          items: [
            { name: "Home", url: baseUrl },
            { name: "Yachts", url: `${baseUrl}/yachts` },
          ],
        }}
      />
      {children}
    </>
  );
}
