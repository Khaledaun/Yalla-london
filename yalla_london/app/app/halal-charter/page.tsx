import { headers } from 'next/headers';
import { Metadata } from 'next';
import { getDefaultSiteId, getSiteConfig } from '@/config/sites';
import { getBaseUrlForSite } from '@/lib/url-utils';
import { HalalCharterClient } from './halal-charter-client';

export async function generateMetadata(): Promise<Metadata> {
  const hdrs = await headers();
  const siteId = hdrs.get('x-site-id') || getDefaultSiteId();
  const baseUrl = getBaseUrlForSite(siteId);

  const config = getSiteConfig(siteId);
  const brandName = config?.name || 'Yalla London';

  return {
    title: `Halal-Certified Yacht Charters | ${brandName}`,
    description:
      'Luxury halal yacht charters in the Mediterranean. Certified halal catering, prayer-friendly spaces, alcohol-free options, and Arabic-speaking crew. Book your family-friendly charter today.',
    alternates: {
      canonical: `${baseUrl}/halal-charter`,
      languages: { 'en-GB': `${baseUrl}/halal-charter`, 'ar-SA': `${baseUrl}/ar/halal-charter` },
    },
    openGraph: {
      title: `Halal-Certified Yacht Charters | ${brandName}`,
      description: 'Luxury halal yacht charters with certified catering, prayer spaces, and Arabic-speaking crew.',
      url: `${baseUrl}/halal-charter`,
      type: 'website',
    },
  };
}

export default async function HalalCharterPage() {
  const hdrs = await headers();
  const siteId = hdrs.get('x-site-id') || getDefaultSiteId();
  const locale = (hdrs.get('x-locale') || 'en') as 'en' | 'ar';
  const config = getSiteConfig(siteId);
  const baseUrl = getBaseUrlForSite(siteId);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Halal Yacht Charter Service',
    description: 'Premium halal-certified yacht charters in the Mediterranean with certified catering, prayer facilities, and Arabic-speaking crew.',
    provider: {
      '@type': 'Organization',
      name: config?.name || 'Zenitha Yachts',
      url: baseUrl,
    },
    areaServed: {
      '@type': 'Place',
      name: 'Mediterranean Sea',
    },
    serviceType: 'Halal Yacht Charter',
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: `${baseUrl}/inquiry`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HalalCharterClient
        siteName={config?.name || 'Zenitha Yachts'}
        siteId={siteId}
        serverLocale={locale}
        baseUrl={baseUrl}
      />
    </>
  );
}
