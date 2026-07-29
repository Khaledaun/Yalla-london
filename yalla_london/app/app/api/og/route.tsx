import { ImageResponse } from "next/og";
import {
  getDefaultSiteId,
  getSiteConfig,
  getSiteTagline,
  isYachtSite,
} from "@/config/sites";

export const runtime = "edge";

/**
 * Dynamic OG image generator.
 *
 * Returns a 1200x630 PNG branded per-site.
 *
 * Query params:
 *   ?siteId=yalla-london         (defaults to getDefaultSiteId())
 *   ?title=Custom+Title          (overrides site name)
 *   ?tagline=Custom+Tagline      (overrides site tagline)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const siteId =
    searchParams.get("siteId") ||
    searchParams.get("site") ||
    getDefaultSiteId();

  const config = getSiteConfig(siteId);
  const yacht = isYachtSite(siteId);

  const siteName = searchParams.get("title") || config?.name || "Zenitha";
  const tagline =
    searchParams.get("tagline") ||
    getSiteTagline(siteId);

  // Brand colours — fall back to sensible defaults per site type
  const primaryColor = config?.primaryColor || (yacht ? "#0a1628" : "#1C1917");
  const accentColor = config?.secondaryColor || (yacht ? "#c9a84c" : "#C8322B");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${adjustBrightness(primaryColor, 30)} 100%)`,
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#ffffff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative accent bar at top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: accentColor,
            display: "flex",
          }}
        />

        {/* Subtle radial glow */}
        <div
          style={{
            position: "absolute",
            top: "-200px",
            right: "-200px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accentColor}22 0%, transparent 70%)`,
            display: "flex",
          }}
        />

        {/* Brand logo mark */}
        <div
          style={{
            position: "absolute",
            top: "48px",
            left: "60px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: accentColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            {yacht ? "ZY" : siteName.charAt(0)}
          </div>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 600,
              opacity: 0.9,
              display: "flex",
            }}
          >
            {config?.domain || "zenitha.luxury"}
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "0 80px",
            marginTop: "20px",
          }}
        >
          <div
            style={{
              fontSize: "72px",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-1px",
              maxWidth: "900px",
              display: "flex",
            }}
          >
            {truncate(siteName, 50)}
          </div>

          {/* Accent divider */}
          <div
            style={{
              width: "80px",
              height: "4px",
              background: accentColor,
              borderRadius: "2px",
              marginTop: "28px",
              marginBottom: "28px",
              display: "flex",
            }}
          />

          <div
            style={{
              fontSize: "28px",
              fontWeight: 400,
              opacity: 0.85,
              lineHeight: 1.4,
              maxWidth: "700px",
              display: "flex",
            }}
          >
            {truncate(tagline, 80)}
          </div>
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: accentColor,
            display: "flex",
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}

/** Truncate text to a max length with ellipsis. */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.substring(0, max - 1).trimEnd() + "\u2026";
}

/**
 * Lighten a hex colour by a given amount (0-255).
 * Used to create the gradient end-point from the primary colour.
 */
function adjustBrightness(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
