"use client";

import Script from "next/script";

interface MonetizationScriptsProps {
  siteId: string;
}

/**
 * Three auto-monetization scripts that stack:
 * 1. Stay22 LetMeAllez — auto-converts hotel mentions to affiliate links (30%+ rev share)
 * 2. Travelpayouts Drive — AI finds missed monetization (flights, tours, insurance)
 * 3. Travelpayouts LinkSwitcher — converts raw brand URLs to tracked links
 *
 * Stay22 handles accommodation, Drive handles everything else,
 * LinkSwitcher catches direct partner URLs.
 */
export function MonetizationScripts({ siteId }: MonetizationScriptsProps) {
  // Don't load on admin pages or yacht site (different monetization)
  if (siteId === "zenitha-yachts-med" || siteId === "zenitha-luxury") return null;

  const stay22Aid = process.env.NEXT_PUBLIC_STAY22_AID || "";
  const tpMarker = process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER || "";

  return (
    <>
      {/* ═══ Stay22 LetMeAllez — auto-scans articles, inserts optimized hotel links ═══ */}
      {stay22Aid && (
        <Script
          id="stay22-lma"
          strategy="lazyOnload"
          src={`https://www.stay22.com/script/lma?aid=${stay22Aid}&campaign=${siteId}`}
        />
      )}

      {/* ═══ Travelpayouts Drive — EXACT script from TP dashboard for verification ═══
           Uses the tp-em.com script that Travelpayouts verification checks for.
           Loaded via afterInteractive (not lazyOnload) so the verifier can detect it.
           The NTEwNzc2 is the base64-encoded account ID (510776). */}
      {tpMarker && (
        <Script
          id="tp-drive"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var script = document.createElement("script");
                script.async = 1;
                script.src = 'https://tp-em.com/NTEwNzc2.js?t=${tpMarker}';
                document.head.appendChild(script);
              })();
            `,
          }}
        />
      )}
    </>
  );
}
