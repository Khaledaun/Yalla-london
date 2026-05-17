"use client";

import { useEffect, useState } from "react";

interface PriceDisplayProps {
  amount: number;
  currency: string;
  className?: string;
  showConverted?: boolean;
}

/**
 * Localized price display — shows price in original currency + visitor's currency.
 * Pairs Frankfurter (exchange rates) with Vercel geolocation (visitor detection).
 *
 * Example: "£650 (≈AED 3,035)"
 */
export function PriceDisplay({ amount, currency, className = "", showConverted = true }: PriceDisplayProps) {
  const [convertedDisplay, setConvertedDisplay] = useState<string | null>(null);

  useEffect(() => {
    if (!showConverted) return;
    fetch(`/api/integrations/currency?amount=${amount}&from=${currency}`)
      .then((res) => res.ok ? res.json() : Promise.reject(res.status))
      .then((data) => {
        if (data.convertedDisplay && data.convertedDisplay !== data.baseDisplay) {
          setConvertedDisplay(data.convertedDisplay);
        }
      })
      .catch(() => {});
  }, [amount, currency, showConverted]);

  const symbols: Record<string, string> = {
    GBP: "£", USD: "$", EUR: "€", AED: "AED ", SAR: "SAR ",
    TRY: "₺", THB: "฿",
  };
  const sym = symbols[currency] || `${currency} `;
  const basePrice = `${sym}${amount.toLocaleString()}`;

  return (
    <span className={className}>
      <span className="font-bold">{basePrice}</span>
      {convertedDisplay && (
        <span className="text-gray-500 text-sm ml-1">
          (≈{convertedDisplay})
        </span>
      )}
    </span>
  );
}
