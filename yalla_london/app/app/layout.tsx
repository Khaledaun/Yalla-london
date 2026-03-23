import type { Metadata } from "next";
import React, { Suspense } from "react";
import { headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import "./yalla-tokens.css";
import "./zenitha-tokens.css";
import "./zenitha-luxury-tokens.css";
import { LanguageProvider } from "@/components/language-provider";
import { SiteShell } from "@/components/site-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { BrandThemeProvider } from "@/components/brand-theme-provider";
import { StructuredData } from "@/components/structured-data";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { NextAuthSessionProvider } from "@/components/session-provider";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { brandConfig } from "@/config/brand-config";
// HreflangTags component removed — hreflang is handled by generateMetadata().alternates.languages
// in each layout/page file. The component was causing duplicate hreflang tags on every page.
import { getBaseUrl, getLocaleAwareCanonical } from "@/lib/url-utils";
import { getDefaultSiteId, getSiteConfig, getSiteDescription, getSiteTagline, getSiteNameAr, isYachtSite as checkIsYachtSite } from "@/config/sites";
import type { Language } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();

  // Read the actual site identity from middleware headers — not the static default.
  // This is critical for multi-site: zenithayachts.com must NOT fall back to yalla-london.
  let siteId = getDefaultSiteId();
  try {
    const headersList = await headers();
    siteId = headersList.get("x-site-id") || siteId;
  } catch {
    // headers() unavailable during static generation — use default
  }

  const siteConfig = getSiteConfig(siteId);
  const siteSlug = siteConfig?.slug || "yalla-london";
  const siteName = siteConfig?.name || brandConfig.siteName;
  const siteDescription = getSiteDescription(siteId);
  const siteTagline = getSiteTagline(siteId);
  const siteNameAr = getSiteNameAr(siteId);

  return {
    title: `${siteName} - ${siteTagline} | ${siteNameAr}`,
    description: siteDescription,
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    openGraph: {
      type: "website",
      locale: "en_GB",
      alternateLocale: "ar_SA",
      url: baseUrl,
      siteName,
      title: `${siteName} - ${siteTagline}`,
      description: siteDescription,
      images: [
        {
          url: `${baseUrl}/api/og?siteId=${siteId}`,
          width: 1200,
          height: 630,
          alt: `${siteName} - ${siteTagline}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: `@${siteSlug}`,
      title: `${siteName} - ${siteTagline}`,
      description: siteDescription,
      images: [`${baseUrl}/api/og?siteId=${siteId}`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: await getLocaleAwareCanonical(),
      languages: {
        "en-GB": baseUrl,
        "ar-SA": `${baseUrl}/ar`,
        "x-default": baseUrl,
      },
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read locale and site identity from middleware headers
  const headersList = await headers();
  const locale = (headersList.get("x-locale") || "en") as Language;
  const dir = locale === "ar" ? "rtl" : "ltr";
  const siteId = headersList.get("x-site-id") || getDefaultSiteId();
  const pathname = headersList.get("x-pathname") || "";
  const isAdminRoute = pathname.startsWith("/admin");
  const currentSiteConfig = getSiteConfig(siteId);

  // Geo-targeting coordinates per destination
  const geoData: Record<string, { region: string; placename: string; position: string; icbm: string }> = {
    "London": { region: "GB-LND", placename: "London", position: "51.5074;-0.1278", icbm: "51.5074, -0.1278" },
    "Maldives": { region: "MV", placename: "Malé", position: "4.1755;73.5093", icbm: "4.1755, 73.5093" },
    "French Riviera": { region: "FR-PAC", placename: "Nice", position: "43.7102;7.2620", icbm: "43.7102, 7.2620" },
    "Istanbul": { region: "TR-34", placename: "Istanbul", position: "41.0082;28.9784", icbm: "41.0082, 28.9784" },
    "Thailand": { region: "TH-10", placename: "Bangkok", position: "13.7563;100.5018", icbm: "13.7563, 100.5018" },
    "Mediterranean": { region: "GR", placename: "Athens", position: "37.9838;23.7275", icbm: "37.9838, 23.7275" },
  };
  const geo = geoData[currentSiteConfig?.destination || "London"] || geoData["London"];
  const isYachtSite = checkIsYachtSite(siteId);

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <StructuredData siteId={siteId} />
        {/* Hreflang handled by generateMetadata().alternates.languages per page — no component needed */}
        {/* DNS prefetch + preconnect for Google Fonts — dns-prefetch is a fallback for older browsers */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />

        {/* DNS prefetch + preconnect for Google Analytics domains — reduces connection latency */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="" />
        <link rel="preconnect" href="https://www.google-analytics.com" crossOrigin="" />

        {/* DNS prefetch for common image CDNs used in content */}
        <link rel="dns-prefetch" href="https://images.unsplash.com" />

        {/* Yalla London fonts — Brand Kit v2: Anybody (headings), Source Serif 4 (body), IBM Plex Mono (data/nav), Noto Sans Arabic (Arabic) */}
        {!isYachtSite && (
          <>
            <link
              rel="preload"
              as="style"
              href="https://fonts.googleapis.com/css2?family=Anybody:wght@400;600;700;800&family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@300;400;500&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap"
              crossOrigin=""
            />
            {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router layout.tsx applies to all pages; this rule is Pages Router only */}
            <link
              href="https://fonts.googleapis.com/css2?family=Anybody:wght@400;600;700;800&family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@300;400;500&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap"
              rel="stylesheet"
            />
          </>
        )}

        {/* Zenitha Yachts fonts — preload hint starts download early, stylesheet applies on load */}
        {isYachtSite && (
          <>
            <link
              rel="preload"
              as="style"
              href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;700&family=DM+Sans:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;600&family=IBM+Plex+Sans+Arabic:wght@300;400;500;700&family=JetBrains+Mono:wght@400;500&display=swap"
              crossOrigin=""
            />
            {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router layout.tsx applies to all pages; this rule is Pages Router only */}
            <link
              href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;700&family=DM+Sans:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;600&family=IBM+Plex+Sans+Arabic:wght@300;400;500;700&family=JetBrains+Mono:wght@400;500&display=swap"
              rel="stylesheet"
            />
          </>
        )}

        {/* PWA Meta Tags — Brand Kit v2 */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <meta name="theme-color" content={isYachtSite ? (currentSiteConfig?.primaryColor || "#0F1621") : "#0F1621"} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={currentSiteConfig?.name || brandConfig.siteName} />
        {!isYachtSite && (
          <>
            <link rel="icon" type="image/png" sizes="32x32" href="/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-stamp-32px-favicon.png" />
            <link rel="icon" type="image/png" sizes="192x192" href="/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-icon-192.png" />
            <link rel="apple-touch-icon" href="/branding/yalla-london/brand-kit-v2/yalla-brand-kit/logos/yalla-icon-apple-touch.png" />
          </>
        )}
        {isYachtSite && (
          <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        )}

        {/* Geo-targeting Meta Tags — per-site destination */}
        <meta name="geo.region" content={geo.region} />
        <meta name="geo.placename" content={geo.placename} />
        <meta name="geo.position" content={geo.position} />
        <meta name="ICBM" content={geo.icbm} />
        {/* Google Site Verification — per-site via GOOGLE_SITE_VERIFICATION_{SITE_KEY} */}
        {(() => {
          const envKey = siteId.toUpperCase().replace(/-/g, "_");
          const verificationCode =
            process.env[`GOOGLE_SITE_VERIFICATION_${envKey}`] ||
            process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
            "";
          return verificationCode ? (
            <meta name="google-site-verification" content={verificationCode} />
          ) : null;
        })()}
        {/* Travelpayouts verification — REMOVED: was blocking scroll on the website.
            The tp-em.com script injects a tracking overlay that hijacks mouse wheel events.
            Account 510776 is already verified. Re-add ONLY if Travelpayouts requires it for
            ongoing tracking, but load it lazily (not in <head>) and only on article pages. */}
      </head>
      <body className={`antialiased ${isYachtSite ? 'font-body' : 'font-editorial'}`} suppressHydrationWarning>
        <NextAuthSessionProvider>
          <BrandThemeProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              <LanguageProvider initialLocale={locale}>
                <Suspense fallback={null}>
                  <AnalyticsTracker />
                </Suspense>
                <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-white focus:text-charcoal focus:rounded focus:shadow-lg focus:text-sm focus:font-semibold">
                  Skip to content
                </a>
                <SiteShell siteId={siteId} isAdmin={isAdminRoute}>
                  {children}
                </SiteShell>
                <CookieConsentBanner />
              </LanguageProvider>
            </ThemeProvider>
          </BrandThemeProvider>
        </NextAuthSessionProvider>

        {/* Google Analytics — per-site via GA4_MEASUREMENT_ID_{SITE_KEY} */}
        {(() => {
          const envKey = siteId.toUpperCase().replace(/-/g, "_");
          const gaId = (
            process.env[`GA4_MEASUREMENT_ID_${envKey}`] ||
            process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
            ""
          ).trim();
          return gaId ? (
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
          ) : null;
        })()}

        {/* Performance monitoring */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Core Web Vitals tracking
              function sendToAnalytics({name, value, id}) {
                if (typeof gtag !== 'undefined') {
                  gtag('event', name, {
                    value: Math.round(name === 'CLS' ? value * 1000 : value),
                    event_category: 'Web Vitals',
                    event_label: id,
                    non_interaction: true,
                  });
                }
              }
              
              // Track page performance
              window.addEventListener('load', function() {
                setTimeout(function() {
                  const perfData = performance.getEntriesByType('navigation')[0];
                  console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
                  
                  // Track page load time in GA
                  if (typeof gtag !== 'undefined') {
                    gtag('event', 'page_load_time', {
                      event_category: 'Performance',
                      value: Math.round(perfData.loadEventEnd - perfData.loadEventStart),
                    });
                  }
                }, 0);
              });

              // Track scroll depth — debounced with rAF to reduce INP impact
              let maxScroll = 0;
              let scrollRafId = null;
              window.addEventListener('scroll', function() {
                if (scrollRafId !== null) return;
                scrollRafId = requestAnimationFrame(function() {
                  scrollRafId = null;
                  const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
                  if (scrollPercent > maxScroll && scrollPercent % 25 === 0) {
                    maxScroll = scrollPercent;
                    if (typeof gtag !== 'undefined') {
                      gtag('event', 'scroll_depth', {
                        event_category: 'Engagement',
                        value: scrollPercent,
                      });
                    }
                  }
                });
              }, { passive: true });
            `,
          }}
        />
      </body>
    </html>
  );
}
