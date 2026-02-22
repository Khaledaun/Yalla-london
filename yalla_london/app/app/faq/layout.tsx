import { Metadata } from 'next';
import { headers } from 'next/headers';
import { getBaseUrl } from '@/lib/url-utils';
import {
  getDefaultSiteId,
  getSiteConfig,
  getSiteDomain,
  isYachtSite as checkIsYachtSite,
} from '@/config/sites';
import { StructuredData } from '@/components/structured-data';

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const headersList = await headers();
  const siteId = headersList.get('x-site-id') || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteDomain = getSiteDomain(siteId);
  const siteName = siteConfig?.name || 'Zenitha Yachts';

  const isYachtSite = checkIsYachtSite(siteId);

  const title = isYachtSite
    ? `Frequently Asked Questions | ${siteName}`
    : `FAQ | ${siteName}`;

  const description = isYachtSite
    ? 'Answers to common questions about yacht charter booking, halal catering, Mediterranean destinations, costs, and what to expect on your sailing holiday.'
    : `Frequently asked questions about ${siteName}. Find answers to common queries about our services, content, and travel recommendations.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/faq`,
      languages: {
        'en-GB': `${baseUrl}/faq`,
        'ar-SA': `${baseUrl}/ar/faq`,
        'x-default': `${baseUrl}/faq`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/faq`,
      siteName,
      type: 'website',
      locale: 'en_GB',
      alternateLocale: 'ar_SA',
      images: [
        {
          url: `${siteDomain}/images/${siteConfig?.slug || 'zenitha-yachts'}-og.jpg`,
          width: 1200,
          height: 630,
          alt: `${siteName} - FAQ`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large' as const,
        'max-snippet': -1,
      },
    },
  };
}

export default async function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const siteId = headersList.get('x-site-id') || getDefaultSiteId();
  const baseUrl = await getBaseUrl();

  const breadcrumbItems = [
    { name: 'Home', url: baseUrl },
    { name: 'FAQ', url: `${baseUrl}/faq` },
  ];

  return (
    <>
      <StructuredData
        type="breadcrumb"
        data={{ items: breadcrumbItems }}
        siteId={siteId}
      />
      {children}
    </>
  );
}
