import type { Metadata } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

export const metadata: Metadata = {
  title: "Privacy Policy | Yalla London",
  description:
    "Yalla London privacy policy. Learn how we collect, use, and protect your personal information.",
  robots: { index: true, follow: true },
  alternates: {
    canonical: `${siteUrl}/privacy`,
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
