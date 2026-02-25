import React from "react";
import type { Metadata } from "next";
import { MophyAdminLayout } from "@/components/admin/mophy";
import { SiteProvider } from "@/components/site-provider";

// Admin pages are client-rendered with interactive elements - prevent static generation
export const dynamic = "force-dynamic";

// Prevent admin pages from being indexed by search engines
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SiteProvider>
      <MophyAdminLayout>{children}</MophyAdminLayout>
    </SiteProvider>
  );
}
