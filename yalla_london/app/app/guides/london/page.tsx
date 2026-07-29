import { Metadata } from "next";
import LondonGuideContent from "./london-guide-content";

export const metadata: Metadata = {
  title: "The Complete London Travel Guide 2026 | Yalla London",
  description:
    "Your essential guide to London — weather, transport, attractions, restaurants, markets, and insider tips. Free from Yalla London.",
  openGraph: {
    title: "The Complete London Travel Guide 2026",
    description:
      "Weather, transport, attractions, 10 restaurant picks, markets, and everything you need for your London trip.",
  },
};

export default function LondonGuidePage() {
  return <LondonGuideContent />;
}
