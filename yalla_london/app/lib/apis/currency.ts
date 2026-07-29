/**
 * Frankfurter Currency API — Free ECB exchange rates
 * No auth, no rate limits, no API key needed
 * https://api.frankfurter.app
 */

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface CachedRates {
  rates: Record<string, number>;
  fetchedAt: number;
  base: string;
}

const rateCache = new Map<string, CachedRates>();

export const SITE_BASE_CURRENCIES: Record<string, string> = {
  "yalla-london": "GBP",
  "arabaldives": "USD",
  "yalla-riviera": "EUR",
  "yalla-istanbul": "TRY",
  "yalla-thailand": "THB",
  "zenitha-yachts-med": "EUR",
};

export const GCC_CURRENCIES = ["AED", "SAR", "KWD", "BHD", "QAR", "OMR"];
const TARGET_CURRENCIES = [...GCC_CURRENCIES, "USD", "GBP", "EUR"];

export async function getExchangeRates(
  baseCurrency: string
): Promise<Record<string, number>> {
  const cached = rateCache.get(baseCurrency);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rates;
  }

  try {
    const targets = TARGET_CURRENCIES.filter((c) => c !== baseCurrency).join(",");
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${baseCurrency}&to=${targets}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) throw new Error(`Frankfurter API ${res.status}`);
    const data = await res.json();
    const rates = data.rates as Record<string, number>;
    rateCache.set(baseCurrency, { rates, fetchedAt: Date.now(), base: baseCurrency });
    return rates;
  } catch (err) {
    console.warn("[currency] Frankfurter API failed:", err instanceof Error ? err.message : String(err));
    return cached?.rates || {};
  }
}

export function convertPrice(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number | null {
  if (fromCurrency === toCurrency) return amount;
  const rate = rates[toCurrency];
  if (!rate) return null;
  return Math.round(amount * rate * 100) / 100;
}

export function formatPrice(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    GBP: "£", USD: "$", EUR: "€", AED: "AED ", SAR: "SAR ",
    KWD: "KD ", BHD: "BD ", QAR: "QAR ", OMR: "OMR ",
    TRY: "₺", THB: "฿",
  };
  const sym = symbols[currency] || `${currency} `;
  return `${sym}${amount.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Get display string: "£650 (≈AED 3,035)"
 */
export async function getPriceDisplay(
  amount: number,
  baseCurrency: string,
  visitorCurrency?: string
): Promise<string> {
  const base = formatPrice(amount, baseCurrency);
  if (!visitorCurrency || visitorCurrency === baseCurrency) return base;
  const rates = await getExchangeRates(baseCurrency);
  const converted = convertPrice(amount, baseCurrency, visitorCurrency, rates);
  if (!converted) return base;
  return `${base} (≈${formatPrice(converted, visitorCurrency)})`;
}
