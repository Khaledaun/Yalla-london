import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  getDefaultSiteId,
  getSiteConfig,
  getSiteDescription,
  getSiteTagline,
} from "@/config/sites";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  let siteId = getDefaultSiteId();
  try {
    const headersList = await headers();
    siteId = headersList.get("x-site-id") || siteId;
  } catch {
    // headers() unavailable — use default
  }

  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || "Yalla London";
  const shortName = siteName.replace(/\s+/g, "");
  const description = getSiteDescription(siteId);
  const tagline = getSiteTagline(siteId);
  const themeColor = siteConfig?.primaryColor || "#C8322B";

  const manifest = {
    name: `${siteName} - ${tagline}`,
    short_name: shortName,
    description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: themeColor,
    orientation: "portrait-primary",
    scope: "/",
    lang: "en-GB",
    categories: ["travel", "lifestyle", "local"],
    icons: [
      { src: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png", purpose: "maskable any" },
      { src: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png", purpose: "maskable any" },
      { src: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png", purpose: "maskable any" },
      { src: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png", purpose: "maskable any" },
      { src: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png", purpose: "maskable any" },
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable any" },
      { src: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png", purpose: "maskable any" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable any" },
    ],
    screenshots: [
      { src: "/screenshots/mobile-home.png", sizes: "390x844", type: "image/png", form_factor: "narrow", label: "Home screen on mobile" },
      { src: "/screenshots/desktop-home.png", sizes: "1280x720", type: "image/png", form_factor: "wide", label: "Home screen on desktop" },
    ],
    shortcuts: [
      {
        name: "Latest Blog Posts",
        short_name: "Blog",
        description: `Read the latest ${siteName} articles`,
        url: "/blog",
        icons: [{ src: "/icons/blog-shortcut.png", sizes: "96x96" }],
      },
      {
        name: "Events",
        short_name: "Events",
        description: `Discover ${siteName} events`,
        url: "/events",
        icons: [{ src: "/icons/events-shortcut.png", sizes: "96x96" }],
      },
      {
        name: "Recommendations",
        short_name: "Picks",
        description: `Curated ${siteName} recommendations`,
        url: "/recommendations",
        icons: [{ src: "/icons/recommendations-shortcut.png", sizes: "96x96" }],
      },
    ],
    prefer_related_applications: false,
    edge_side_panel: { preferred_width: 400 },
    share_target: {
      action: "/share",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
