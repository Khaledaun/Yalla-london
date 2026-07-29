/**
 * REST Countries API — Free, no auth
 * https://restcountries.com/v3.1
 */

export interface CountryInfo {
  name: string;
  officialName: string;
  flagSvg: string;
  flagEmoji: string;
  currencies: { code: string; name: string; symbol: string }[];
  languages: string[];
  capital: string;
  timezones: string[];
  callingCode: string;
  population: number;
  region: string;
  subregion: string;
}

// Cache permanently — country data almost never changes
const countryCache = new Map<string, CountryInfo>();

export const DESTINATION_CODES: Record<string, string> = {
  "yalla-london": "GB",
  "arabaldives": "MV",
  "yalla-riviera": "FR",
  "yalla-istanbul": "TR",
  "yalla-thailand": "TH",
};

export async function getCountryInfo(countryCode: string): Promise<CountryInfo | null> {
  const cached = countryCache.get(countryCode);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://restcountries.com/v3.1/alpha/${countryCode}?fields=name,flags,currencies,languages,capital,timezones,idd,population,region,subregion,flag`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) throw new Error(`REST Countries ${res.status}`);
    const data = await res.json();

    const currencies = Object.entries(data.currencies || {}).map(
      ([code, val]: [string, unknown]) => {
        const v = val as { name: string; symbol: string };
        return { code, name: v.name, symbol: v.symbol };
      }
    );

    const info: CountryInfo = {
      name: data.name?.common || countryCode,
      officialName: data.name?.official || "",
      flagSvg: data.flags?.svg || "",
      flagEmoji: data.flag || "",
      currencies,
      languages: Object.values(data.languages || {}),
      capital: (data.capital || [])[0] || "",
      timezones: data.timezones || [],
      callingCode: `${data.idd?.root || ""}${(data.idd?.suffixes || [])[0] || ""}`,
      population: data.population || 0,
      region: data.region || "",
      subregion: data.subregion || "",
    };

    countryCache.set(countryCode, info);
    return info;
  } catch (err) {
    console.warn("[countries] REST Countries failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

export async function getDestinationInfo(siteId: string): Promise<CountryInfo | null> {
  const code = DESTINATION_CODES[siteId];
  if (!code) return null;
  return getCountryInfo(code);
}
