"use client";

import React, { useState } from "react";

interface LocaleDotsProps {
  wordCountEn: number;
  wordCountAr?: number;
}

export function LocaleDots({ wordCountEn, wordCountAr = 0 }: LocaleDotsProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const enOk = wordCountEn >= 100;
  const arOk = wordCountAr >= 100;

  const dotColor = (ok: boolean, wc: number) => {
    if (wc === 0) return "bg-stone-300"; // missing entirely
    if (ok) return "bg-[#2D5A3D]"; // complete
    return "bg-[#C8322B]"; // exists but thin
  };

  return (
    <span
      className="relative inline-flex items-center gap-0.5 cursor-default"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip(!showTooltip)}
      title={`EN: ${wordCountEn.toLocaleString()}w | AR: ${wordCountAr.toLocaleString()}w`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor(enOk, wordCountEn)}`} />
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor(arOk, wordCountAr)}`} />

      {showTooltip && (
        <span className="absolute left-0 top-full mt-1 z-50 bg-stone-800 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
          EN: {wordCountEn.toLocaleString()}w {enOk ? "✓" : "✗"} | AR: {wordCountAr.toLocaleString()}w {arOk ? "✓" : "✗"}
        </span>
      )}
    </span>
  );
}
