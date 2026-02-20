import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";
import { DynamicHeader } from "@/components/dynamic-header";
import { Footer } from "@/components/footer";
import { ThemeProvider } from "@/components/theme-provider";
import { BrandThemeProvider } from "@/components/brand-theme-provider";
import { StructuredData } from "@/components/structured-data";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { NextAuthSessionProvider } from "@/components/session-provider";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { brandConfig } from "@/config/brand-config";
import { HreflangTags } from "@/components/hreflang-tags";
import { getBaseUrl } from "@/lib/url-utils";
import { getDefaultSiteId, getSiteConfig } from "@/config/sites";
import type { Language } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const siteConfig = getSiteConfig(getDefaultSiteId());
  const siteName = siteConfig?.name || brandConfig.siteName;

  return {
    title: `${siteName} - ${brandConfig.tagline} | ${brandConfig.siteNameAr}`,
    description: brandConfig.description,
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    openGraph: {
      type: "website",
      locale: "en_GB",
      alternateLocale: "ar_SA",
      url: baseUrl,
      siteName,
      title: `${siteName} - ${brandConfig.tagline}`,
      description: brandConfig.description,
      images: [
        {
          url: "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: `${siteName} - ${brandConfig.tagline}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: `@${siteConfig?.slug || 'yallalondon'}`,
      title: `${siteName} - ${brandConfig.tagline}`,
      description: brandConfig.description,
      images: ["/og-image.jpg"],
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
      canonical: baseUrl,
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
  const currentSiteConfig = getSiteConfig(siteId);

  // Geo-targeting coordinates per destination
  const geoData: Record<string, { region: string; placename: string; position: string; icbm: string }> = {
    "London": { region: "GB-LND", placename: "London", position: "51.5074;-0.1278", icbm: "51.5074, -0.1278" },
    "Maldives": { region: "MV", placename: "Malé", position: "4.1755;73.5093", icbm: "4.1755, 73.5093" },
    "French Riviera": { region: "FR-PAC", placename: "Nice", position: "43.7102;7.2620", icbm: "43.7102, 7.2620" },
    "Istanbul": { region: "TR-34", placename: "Istanbul", position: "41.0082;28.9784", icbm: "41.0082, 28.9784" },
    "Thailand": { region: "TH-10", placename: "Bangkok", position: "13.7563;100.5018", icbm: "13.7563, 100.5018" },
  };
  const geo = geoData[currentSiteConfig?.destination || "London"] || geoData["London"];

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <StructuredData siteId={siteId} />
        <HreflangTags path="/" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />

        {/* PWA Meta Tags — theme-color and title from site config */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content={currentSiteConfig?.primaryColor || "#C8322B"} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={currentSiteConfig?.name || "Yalla London"} />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />

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
      </head>
      <body className="font-editorial antialiased" suppressHydrationWarning>
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
                <div className="min-h-screen flex flex-col">
                  <DynamicHeader />
                  <main id="main-content" className="flex-1 pt-20">{children}</main>
                  <Footer />
                </div>
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

              // Track scroll depth
              let maxScroll = 0;
              window.addEventListener('scroll', function() {
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
            `,
          }}
        />
      </body>
    </html>
  );
}
