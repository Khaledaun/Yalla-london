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
  if (!aid) return null;

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
