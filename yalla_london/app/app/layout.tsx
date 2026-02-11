import type { Metadata } from "next";
import { Suspense } from "react";
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

export const metadata: Metadata = {
  title: `${brandConfig.siteName} - ${brandConfig.tagline} | ${brandConfig.siteNameAr}`,
  description: brandConfig.description,
  authors: [{ name: brandConfig.seo.author }],
  creator: brandConfig.seo.author,
  publisher: brandConfig.seo.author,
  openGraph: {
    type: "website",
    locale: "en_GB",
    alternateLocale: "ar_SA",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com",
    siteName: brandConfig.siteName,
    title: `${brandConfig.siteName} - ${brandConfig.tagline}`,
    description: brandConfig.description,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Yalla London - Luxury London Guide",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: brandConfig.seo.twitterHandle || "@example",
    title: `${brandConfig.siteName} - ${brandConfig.tagline}`,
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
    canonical:
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com",
    languages: {
      "en-GB":
        process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com",
      "ar-SA": `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com"}/ar`,
      "x-default":
        process.env.NEXT_PUBLIC_SITE_URL || "https://www.yalla-london.com",
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <StructuredData />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />

        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#C8322B" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Yalla London" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />

        {/* Other Meta Tags */}
        <meta name="geo.region" content="GB-LND" />
        <meta name="geo.placename" content="London" />
        <meta name="geo.position" content="51.5074;-0.1278" />
        <meta name="ICBM" content="51.5074, -0.1278" />
        {process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && (
          <meta
            name="google-site-verification"
            content={process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION}
          />
        )}
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
              <LanguageProvider>
                <Suspense fallback={null}>
                  <AnalyticsTracker />
                </Suspense>
                <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-white focus:text-charcoal focus:rounded focus:shadow-lg focus:text-sm focus:font-semibold">
                  Skip to content
                </a>
                <div className="min-h-screen flex flex-col">
                  <DynamicHeader />
                  <main id="main-content" className="flex-1 pt-16">{children}</main>
                  <Footer />
                </div>
                <CookieConsentBanner />
              </LanguageProvider>
            </ThemeProvider>
          </BrandThemeProvider>
        </NextAuthSessionProvider>

        {/* Google Analytics */}
        {(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
          process.env.GA4_MEASUREMENT_ID) && (() => {
          const gaId = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.GA4_MEASUREMENT_ID || '').trim();
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
