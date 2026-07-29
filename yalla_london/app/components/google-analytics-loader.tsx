"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { isInternalTraffic } from "@/lib/analytics/is-internal-traffic";

interface Props {
  gaId: string;
}

/**
 * Loads gtag.js ONLY for real external visitors.
 *
 * Skips init entirely (no gtag.js network request) when isInternalTraffic() is
 * true: /admin/*, /hassan*, *.vercel.app, localhost, or internal=true cookie.
 *
 * Runs on mount so it can read window.location + document.cookie. During SSR,
 * we render nothing — the Script tags only mount after hydration passes the
 * gate check. This is the intended behavior per the audit: kill the script
 * load, don't silently filter events.
 */
export function GoogleAnalyticsLoader({ gaId }: Props) {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (!gaId) return;
    if (isInternalTraffic()) return;
    setShouldLoad(true);
  }, [gaId]);

  if (!gaId || !shouldLoad) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            page_title: document.title,
            page_location: window.location.href,
            send_page_view: true,
            cookie_flags: 'SameSite=None;Secure',
          });
        `}
      </Script>
    </>
  );
}
