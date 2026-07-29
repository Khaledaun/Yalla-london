"use client";

import { useEffect, useState } from "react";
import type { CountryInfo } from "@/lib/apis/countries";

interface DestinationInfoCardProps {
  siteId: string;
  compact?: boolean;
  className?: string;
}

/**
 * Destination info card — real country data from REST Countries API (free, no auth).
 * Shows: flag, currency, languages, timezone, calling code.
 */
export function DestinationInfoCard({ siteId, compact = false, className = "" }: DestinationInfoCardProps) {
  const [info, setInfo] = useState<CountryInfo | null>(null);

  useEffect(() => {
    fetch(`/api/integrations/countries?siteId=${siteId}`)
      .then((res) => res.ok ? res.json() : Promise.reject(res.status))
      .then((data) => setInfo(data.country || null))
      .catch(() => {});
  }, [siteId]);

  if (!info) return null;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 text-sm ${className}`}>
        <span className="text-lg">{info.flagEmoji}</span>
        <span>{info.name}</span>
        <span className="text-gray-400">|</span>
        <span>{info.currencies[0]?.code}</span>
      </div>
    );
  }

  // Calculate current local time
  const tz = info.timezones[0];
  let localTime = "";
  try {
    localTime = new Date().toLocaleTimeString("en-GB", {
      timeZone: tz?.startsWith("UTC") ? undefined : tz,
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    // Timezone format may not be IANA
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{info.flagEmoji}</span>
        <div>
          <h4 className="font-bold text-gray-900">{info.name}</h4>
          <p className="text-xs text-gray-500">{info.officialName}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <InfoRow label="Capital" value={info.capital} />
        <InfoRow label="Currency" value={`${info.currencies[0]?.code} (${info.currencies[0]?.symbol})`} />
        <InfoRow label="Languages" value={info.languages.slice(0, 3).join(", ")} />
        <InfoRow label="Calling" value={info.callingCode} />
        {localTime && <InfoRow label="Local time" value={localTime} />}
        <InfoRow label="Region" value={info.subregion || info.region} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-gray-400 text-xs">{label}</span>
      <div className="text-gray-900 font-medium">{value}</div>
    </div>
  );
}
