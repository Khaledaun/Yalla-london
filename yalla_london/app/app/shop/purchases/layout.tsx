import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Purchases | Shop",
  robots: { index: false, follow: false },
};

export default function PurchasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
