import { Metadata } from 'next';
import { headers } from 'next/headers';
import { getBaseUrl } from '@/lib/url-utils';
import { getDefaultSiteId, getSiteConfig } from '@/config/sites';
import { YachtSearchClient } from './yacht-search-client';

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const headersList = await headers();
  const siteId = headersList.get('x-site-id') || getDefaultSiteId();
  const siteConfig = getSiteConfig(siteId);
  const siteName = siteConfig?.name || 'Zenitha Yachts';

  return {
    title: `Browse Luxury Yachts for Charter — Sailing, Catamarans, Motor Yachts | ${siteName}`,
    description: 'Explore 200+ handpicked yachts. Filter by destination, type, guests, budget, and halal catering. Mediterranean, Arabian Gulf, and beyond.',
    alternates: {
      canonical: `${baseUrl}/yachts`,
      languages: {
        'en-GB': `${baseUrl}/yachts`,
        'ar-SA': `${baseUrl}/ar/yachts`,
        'x-default': `${baseUrl}/yachts`,
      },
    },
    openGraph: {
      title: `Browse Luxury Yachts for Charter | ${siteName}`,
      description: 'Explore 200+ handpicked yachts. Filter by destination, type, guests, budget, and halal catering.',
      url: `${baseUrl}/yachts`,
      siteName,
      locale: 'en_GB',
      alternateLocale: 'ar_SA',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Browse Luxury Yachts | ${siteName}`,
      description: 'Explore 200+ handpicked yachts for charter across the Mediterranean and beyond.',
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' as const, 'max-snippet': -1 } },
  };
}

// Server component fetches initial data
async function getInitialYachts(siteId: string) {
  try {
    const { prisma } = await import('@/lib/db');
    const yachts = await prisma.yacht.findMany({
      where: { siteId, status: 'active' },
      include: { destination: true },
      orderBy: { createdAt: 'desc' },
      take: 24,
    });
    const total = await prisma.yacht.count({ where: { siteId, status: 'active' } });
    const destinations = await prisma.yachtDestination.findMany({
      where: { siteId, status: 'active' },
      select: { id: true, name: true, slug: true },
    });
    return {
      yachts: yachts.map(y => ({
        id: y.id,
        name: y.name,
        slug: y.slug,
        type: y.type,
        cabins: y.cabins,
        berths: y.berths,
        length: y.length ? Number(y.length) : null,
        pricePerWeekLow: y.pricePerWeekLow ? Number(y.pricePerWeekLow) : null,
        currency: y.currency,
        rating: y.rating ? Number(y.rating) : null,
        reviewCount: y.reviewCount,
        halalCateringAvailable: y.halalCateringAvailable,
        familyFriendly: y.familyFriendly,
        crewIncluded: y.crewIncluded,
        images: y.images as string[] | null,
        featured: y.featured,
        destinationName: y.destination?.name || null,
      })),
      total,
      destinations: destinations.map(d => ({ id: d.id, name: d.name, slug: d.slug })),
    };
  } catch (err) {
    console.warn('[yacht-search] DB query failed, using empty state:', err instanceof Error ? err.message : 'unknown');
    return { yachts: [], total: 0, destinations: [] };
  }
}

export default async function YachtSearchPage() {
  const headersList = await headers();
  const siteId = headersList.get('x-site-id') || getDefaultSiteId();
  const locale = (headersList.get('x-locale') || 'en') as 'en' | 'ar';
  const baseUrl = await getBaseUrl();

  const { yachts, total, destinations } = await getInitialYachts(siteId);

  // Structured data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Luxury Yachts for Charter',
    description: 'Browse handpicked yachts for charter across the Mediterranean, Arabian Gulf, and beyond.',
    url: `${baseUrl}/yachts`,
    numberOfItems: total,
    itemListElement: yachts.slice(0, 10).map((y, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${baseUrl}/yachts/${y.slug}`,
      name: y.name,
    })),
  };

  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Yachts', item: `${baseUrl}/yachts` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }} />
      <YachtSearchClient
        initialYachts={yachts}
        initialTotal={total}
        destinations={destinations}
        locale={locale}
      />
    </>
  );
}
