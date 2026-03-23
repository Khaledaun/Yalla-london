/**
 * Visitor Geolocation — uses Vercel headers (free, unlimited) with IP-API fallback
 *
 * Primary: Vercel x-vercel-ip-country header (free on all plans)
 * Fallback: ip-api.com (45 req/min free, no auth)
 */

export interface VisitorGeo {
  countryCode: string;
  country: string;
  currency: string;
  isGCC: boolean;
}

const GCC_COUNTRIES: Record<string, { name: string; currency: string }> = {
  AE: { name: "United Arab Emirates", currency: "AED" },
  SA: { name: "Saudi Arabia", currency: "SAR" },
  KW: { name: "Kuwait", currency: "KWD" },
  BH: { name: "Bahrain", currency: "BHD" },
  QA: { name: "Qatar", currency: "QAR" },
  OM: { name: "Oman", currency: "OMR" },
};

const COUNTRY_CURRENCIES: Record<string, string> = {
  ...Object.fromEntries(Object.entries(GCC_COUNTRIES).map(([k, v]) => [k, v.currency])),
  GB: "GBP", US: "USD", FR: "EUR", DE: "EUR", IT: "EUR", ES: "EUR",
  TR: "TRY", TH: "THB", MV: "USD", JP: "JPY", CN: "CNY", IN: "INR",
};

/**
 * Detect visitor country from Vercel headers (preferred) or IP-API fallback.
 * Call server-side only — never from client.
 */
export function detectVisitorGeo(headersList: Headers): VisitorGeo {
  // Vercel provides these headers for free on all plans
  const countryCode = headersList.get("x-vercel-ip-country") || "";

  if (countryCode) {
    const currency = COUNTRY_CURRENCIES[countryCode] || "USD";
    const isGCC = countryCode in GCC_COUNTRIES;
    const country = GCC_COUNTRIES[countryCode]?.name || countryCode;
    return { countryCode, country, currency, isGCC };
  }

  // Fallback: unknown
  return { countryCode: "", country: "Unknown", currency: "USD", isGCC: false };
}

/**
 * IP-API fallback for environments without Vercel headers (local dev, etc.)
 * Rate limit: 45 req/min. Cache aggressively.
 */
export async function detectVisitorGeoFromIP(ip: string): Promise<VisitorGeo> {
  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,countryCode,currency,country`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) throw new Error(`IP-API ${res.status}`);
    const data = await res.json();
    if (data.status !== "success") throw new Error("IP-API lookup failed");
    const countryCode = data.countryCode || "";
    const isGCC = countryCode in GCC_COUNTRIES;
    return {
      countryCode,
      country: data.country || "Unknown",
      currency: data.currency || COUNTRY_CURRENCIES[countryCode] || "USD",
      isGCC,
    };
  } catch (err) {
    console.warn("[geolocation] IP-API failed:", err instanceof Error ? err.message : String(err));
    return { countryCode: "", country: "Unknown", currency: "USD", isGCC: false };
  }
}

export function isGCCCountry(countryCode: string): boolean {
  return countryCode in GCC_COUNTRIES;
}
