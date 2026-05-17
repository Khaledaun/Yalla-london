import { NextRequest, NextResponse } from "next/server";
import { getExchangeRates, convertPrice, formatPrice } from "@/lib/apis/currency";

export async function GET(request: NextRequest) {
  const amount = parseFloat(request.nextUrl.searchParams.get("amount") || "0");
  const from = request.nextUrl.searchParams.get("from") || "GBP";
  const to = request.nextUrl.searchParams.get("to") || "";

  // Detect visitor currency from Vercel header if not specified
  const visitorCountry = request.headers.get("x-vercel-ip-country") || "";
  const countryCurrencyMap: Record<string, string> = {
    AE: "AED", SA: "SAR", KW: "KWD", BH: "BHD", QA: "QAR", OM: "OMR",
    GB: "GBP", US: "USD", FR: "EUR", DE: "EUR", TR: "TRY", TH: "THB",
  };
  const targetCurrency = to || countryCurrencyMap[visitorCountry] || "";

  if (!amount || !from) {
    return NextResponse.json({ error: "amount and from required" }, { status: 400 });
  }

  const rates = await getExchangeRates(from);
  const baseDisplay = formatPrice(amount, from);

  if (!targetCurrency || targetCurrency === from) {
    return NextResponse.json(
      { baseDisplay, convertedDisplay: null, rates },
      { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600" } }
    );
  }

  const converted = convertPrice(amount, from, targetCurrency, rates);
  const convertedDisplay = converted ? formatPrice(converted, targetCurrency) : null;

  return NextResponse.json(
    { baseDisplay, convertedDisplay, targetCurrency, rate: rates[targetCurrency], rates },
    { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600" } }
  );
}
