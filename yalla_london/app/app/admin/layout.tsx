import React from "react";
import type { Metadata } from "next";
import { Space_Mono, Space_Grotesk } from "next/font/google";
import { MophyAdminLayout } from "@/components/admin/mophy";
import { SiteProvider } from "@/components/site-provider";

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--f-mono",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--f-ui",
  display: "swap",
});

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
      <div className={`zh-dark ${spaceMono.variable} ${spaceGrotesk.variable}`}>
        <MophyAdminLayout>{children}</MophyAdminLayout>
      </div>
    </SiteProvider>
  );
}
