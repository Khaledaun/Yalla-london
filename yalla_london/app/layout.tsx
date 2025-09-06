
import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/components/language-provider'
import { DynamicHeader } from '@/components/dynamic-header'
import { Footer } from '@/components/footer'
import { ThemeProvider } from '@/components/theme-provider'
import { BrandThemeProvider } from '@/components/brand-theme-provider'
import { StructuredData } from '@/components/structured-data'
import { AnalyticsTracker } from '@/components/analytics-tracker'
import { NextAuthSessionProvider } from '@/components/session-provider'
import { brandConfig } from '@/config/brand-config'

export const metadata: Metadata = {
  title: `${brandConfig.siteName} - ${brandConfig.tagline} | ${brandConfig.siteNameAr}`,
  description: brandConfig.description,
  keywords: brandConfig.seo.keywords,
  authors: [{ name: brandConfig.seo.author }],
  creator: brandConfig.seo.author,
  publisher: brandConfig.seo.author,
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    alternateLocale: 'ar_SA',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
    siteName: brandConfig.siteName,
    title: `${brandConfig.siteName} - ${brandConfig.tagline}`,
    description: brandConfig.description,
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Yalla London - Luxury London Guide',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: brandConfig.seo.twitterHandle || '@example',
    title: `${brandConfig.siteName} - ${brandConfig.tagline}`,
    description: brandConfig.description,
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://yalla-london.com',
    languages: {
      'en-GB': 'https://yalla-london.com',
      'ar-SA': 'https://yalla-london.com/?lang=ar',
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <StructuredData />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <meta name="geo.region" content="GB-LND" />
        <meta name="geo.placename" content="London" />
        <meta name="geo.position" content="51.5074;-0.1278" />
        <meta name="ICBM" content="51.5074, -0.1278" />
        <meta name="google-site-verification" content="your-google-verification-code" />
      </head>
      <body className="font-tajawal antialiased" suppressHydrationWarning>
        <NextAuthSessionProvider>
          <BrandThemeProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem={false}
              disableTransitionOnChange
            >
              <LanguageProvider>
                <AnalyticsTracker />
                <div className="min-h-screen flex flex-col">
                  <DynamicHeader />
                  <main className="flex-1 pt-16">
                    {children}
                  </main>
                  <Footer />
                </div>
              </LanguageProvider>
            </ThemeProvider>
          </BrandThemeProvider>
        </NextAuthSessionProvider>
        
        {/* Google Analytics */}
        {process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID && process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID !== 'GA_MEASUREMENT_ID_HERE' && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}', {
                    page_title: document.title,
                    page_location: window.location.href,
                  });
                `,
              }}
            />
          </>
        )}

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
  )
}
