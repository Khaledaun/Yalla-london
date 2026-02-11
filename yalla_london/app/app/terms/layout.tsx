import type { Metadata } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com";

export const metadata: Metadata = {
  title: "Terms of Use | Yalla London",
  description:
    "Yalla London terms of use. Review our terms and conditions governing the use of our website and services.",
  robots: { index: true, follow: true },
  alternates: {
    canonical: `${siteUrl}/terms`,
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
