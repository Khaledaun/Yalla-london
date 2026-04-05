"use client";

import { SITE_DESTINATIONS } from "@/lib/apis/weather";

interface Stay22MapProps {
  siteId: string;
  articleSlug?: string;
  lat?: number;
  lng?: number;
  checkin?: string;
  checkout?: string;
  height?: number;
  className?: string;
}

/**
 * Stay22 interactive hotel map — embeds alongside accommodation content.
 * Shows live hotel pricing from multiple OTAs (Booking.com, Expedia, VRBO, etc.)
 * Commission: 30%+ revenue share via Stay22
 */
export function Stay22Map({
  siteId,
  articleSlug,
  lat,
  lng,
  checkin,
  checkout,
  height = 400,
  className = "",
}: Stay22MapProps) {
  const aid = process.env.NEXT_PUBLIC_STAY22_AID;
  if (!aid) {
    // Show a fallback card instead of rendering nothing — env var not yet configured
    const dest = SITE_DESTINATIONS[siteId];
    const mapLat = lat ?? dest?.lat;
    const mapLng = lng ?? dest?.lng;
    const searchUrl = mapLat && mapLng
      ? `https://www.booking.com/searchresults.html?latitude=${mapLat}&longitude=${mapLng}&radius=2&radiusunit=km`
      : `https://www.booking.com`;
    return (
      <div className={`rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-3 p-6 text-center ${className}`} style={{ minHeight: height }}>
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <p className="text-sm font-medium text-gray-600">Hotels near this location</p>
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener sponsored"
          className="text-sm text-blue-600 underline hover:text-blue-800"
        >
          Search available hotels →
        </a>
      </div>
    );
  }

  // Use article coordinates or fall back to site destination
  const dest = SITE_DESTINATIONS[siteId];
  const mapLat = lat ?? dest?.lat;
  const mapLng = lng ?? dest?.lng;
  if (!mapLat || !mapLng) return null;

  const campaign = articleSlug ? `${siteId}-${articleSlug}` : siteId;

  // Brand color mapping
  const brandColors: Record<string, string> = {
    "yalla-london": "C8322B",
    "arabaldives": "0891B2",
    "yalla-riviera": "1E3A5F",
    "yalla-istanbul": "7C2D12",
    "yalla-thailand": "059669",
  };
  const mainColor = brandColors[siteId] || "C8322B";

  const params = new URLSearchParams({
    aid,
    lat: String(mapLat),
    lng: String(mapLng),
    campaign,
    maincolor: mainColor,
  });

  if (checkin) params.set("checkin", checkin);
  if (checkout) params.set("checkout", checkout);

  return (
    <div className={`rounded-xl overflow-hidden border border-gray-200 ${className}`}>
      <iframe
        src={`https://www.stay22.com/embed/gm?${params}`}
        width="100%"
        height={height}
        style={{ border: 0 }}
        loading="lazy"
        title="Hotels near this location"
        allow="geolocation"
      />
    </div>
  );
}
