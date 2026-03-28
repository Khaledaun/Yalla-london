import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Hotel, MapPin, Star, ArrowRight, Wifi, Dumbbell, UtensilsCrossed } from 'lucide-react'
import { getDefaultSiteId, getSiteConfig, getSiteDomain } from '@/config/sites'
import { getBaseUrl } from '@/lib/url-utils'
import { TriBar, BrandButton, BrandCardLight, SectionLabel, Breadcrumbs } from '@/components/brand-kit'
import { StructuredData } from '@/components/structured-data'

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const siteConfig = getSiteConfig(getDefaultSiteId());
  const siteName = siteConfig?.name || 'Yalla London';
  const canonicalUrl = `${baseUrl}/luxury-hotels-london`;

  return {
    title: `Best Luxury Hotels in London 2026 — 5-Star Guide | ${siteName}`,
    description: 'The definitive guide to London\'s best luxury hotels: Mayfair palaces, Knightsbridge gems, boutique stays, and the best hotels with halal dining, prayer facilities, and family suites.',
    keywords: ['luxury hotels london', 'best 5 star hotels london', 'halal friendly hotels london', 'best hotels mayfair', 'boutique hotels london', 'london hotel guide', 'family hotels london'],
    openGraph: {
      title: 'Best Luxury Hotels in London 2026 — 5-Star Guide',
      description: 'From The Dorchester to The Shard — the definitive guide to luxury stays in London.',
      url: canonicalUrl,
      type: 'website',
      locale: 'en_GB',
      alternateLocale: 'ar_SA',
      siteName,
    },
    twitter: {
      card: 'summary_large_image',
      title: `Best Luxury Hotels in London | ${siteName}`,
      description: 'The definitive guide to 5-star hotels across London — with halal-friendly and family options.',
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en-GB': canonicalUrl,
        'ar-SA': `${baseUrl}/ar/luxury-hotels-london`,
        'x-default': canonicalUrl,
      },
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' as const, 'max-snippet': -1 } },
  }
}

const NEIGHBOURHOODS = [
  {
    name: 'Mayfair',
    slug: 'mayfair',
    description: 'London\'s most prestigious hotel district. Home to Claridge\'s, The Connaught, and The Dorchester — three of the world\'s most iconic luxury hotels. Mayfair properties offer unparalleled service with many providing Arabic-speaking concierges and halal room service options.',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
    priceRange: '£500 – £3,000+/night',
    hotels: ['Claridge\'s', 'The Dorchester', 'The Connaught', 'Brown\'s Hotel'],
    features: ['Arabic-speaking staff', 'Halal room dining', 'Harrods nearby', 'Green Park views'],
  },
  {
    name: 'Knightsbridge',
    slug: 'knightsbridge',
    description: 'Steps from Harrods and Harvey Nichols. Knightsbridge hotels combine shopping convenience with luxury amenities. The Mandarin Oriental, Bulgari, and The Berkeley are perennial favourites among Gulf visitors.',
    image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80',
    priceRange: '£400 – £2,500+/night',
    hotels: ['Mandarin Oriental', 'Bulgari Hotel', 'The Berkeley', 'The Lanesborough'],
    features: ['Walking distance to Harrods', 'Hyde Park access', 'Halal restaurants nearby', 'Luxury spa facilities'],
  },
  {
    name: 'The Strand & South Bank',
    slug: 'strand-south-bank',
    description: 'River Thames views and cultural landmarks. The Savoy, Corinthia, and Shangri-La at The Shard offer dramatic perspectives of London\'s skyline. Ideal for visitors who want to be near theatres, museums, and the London Eye.',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
    priceRange: '£350 – £2,000+/night',
    hotels: ['The Savoy', 'Corinthia London', 'Shangri-La The Shard', 'The Peninsula'],
    features: ['Thames views', 'Theatre district', 'Waterloo station', 'Cultural attractions'],
  },
  {
    name: 'Marylebone & Fitzrovia',
    slug: 'marylebone',
    description: 'Boutique luxury in village-like settings. Marylebone offers a quieter alternative to Mayfair with charming independent shops, excellent restaurants, and proximity to Regent\'s Park. Popular for longer family stays.',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
    priceRange: '£250 – £1,200+/night',
    hotels: ['The Langham', 'Chiltern Firehouse', 'The Marylebone Hotel', 'Hyatt Regency'],
    features: ['Regent\'s Park nearby', 'Quiet neighbourhood', 'Family-friendly', 'Near Edgware Road halal dining'],
  },
];

const BOOKING_TIPS = [
  { title: 'Best Time to Book', detail: 'Book 3-6 months ahead for peak seasons (July-August, Christmas, Ramadan). Prices drop 20-40% in January-February and November.' },
  { title: 'Halal Dining', detail: 'Request halal room service at booking. The Dorchester, Shangri-La, and Jumeirah Carlton Tower all offer fully halal menus.' },
  { title: 'Prayer Facilities', detail: 'London Central Mosque (Regent\'s Park) is 15 minutes from most Mayfair and Marylebone hotels. Many 5-star hotels provide prayer mats on request.' },
  { title: 'Family Suites', detail: 'The Langham, Corinthia, and Mandarin Oriental offer connecting rooms and kids\' programmes. Ask for interconnecting family suites when booking.' },
];

export default async function LuxuryHotelsLondonPage() {
  let relatedPosts: Array<{ slug: string; title_en: string; meta_description_en: string; created_at: Date; featured_image_url: string | null }> = [];
  try {
    const { prisma } = await import('@/lib/db');
    relatedPosts = await prisma.blogPost.findMany({
      where: {
        published: true,
        siteId: getDefaultSiteId(),
        OR: [
          { title_en: { contains: 'hotel', mode: 'insensitive' } },
          { title_en: { contains: 'accommodation', mode: 'insensitive' } },
          { title_en: { contains: 'stay', mode: 'insensitive' } },
          { title_en: { contains: 'luxury', mode: 'insensitive' } },
          { category: { name: { in: ['Hotels', 'Accommodation', 'Luxury'] } } },
        ],
      },
      select: { slug: true, title_en: true, meta_description_en: true, created_at: true, featured_image_url: true },
      orderBy: { created_at: 'desc' },
      take: 12,
    });
  } catch { /* graceful degradation */ }

  const baseUrl = await getBaseUrl();
  const siteId = getDefaultSiteId();

  return (
    <div className="bg-yl-cream font-body">
      <StructuredData type="breadcrumb" data={{ items: [{ name: 'Home', url: baseUrl }, { name: 'Luxury Hotels London', url: `${baseUrl}/luxury-hotels-london` }] }} siteId={siteId} />
      <StructuredData type="itemList" data={{ name: 'Best Luxury Hotel Areas in London', items: NEIGHBOURHOODS.map((n, i) => ({ position: i + 1, name: n.name, url: `${baseUrl}/luxury-hotels-london#${n.slug}` })) }} siteId={siteId} />

      {/* Hero */}
      <section className="relative bg-yl-dark-navy text-white overflow-hidden pt-28 pb-16">
        <div className="absolute inset-0 opacity-30">
          <Image src="https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1600&q=80" alt="Luxury hotel lobby in London" fill className="object-cover" priority />
        </div>
        <div className="relative max-w-6xl mx-auto px-6">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Luxury Hotels London' }]} />
          <div className="mt-8">
            <SectionLabel>DEFINITIVE GUIDE</SectionLabel>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mt-4 leading-tight">
              Best Luxury Hotels<br />in London 2026
            </h1>
            <p className="text-lg md:text-xl text-white/80 mt-6 max-w-2xl">
              From Mayfair palaces to Shard-top suites — every 5-star hotel worth your stay, with insider tips on halal dining, family suites, and the best views.
            </p>
            <TriBar className="mt-6" />
          </div>
        </div>
      </section>

      {/* Key Takeaways */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl border border-yl-sand/50 p-6 md:p-8 shadow-sm">
          <h2 className="text-xl font-display font-bold text-yl-dark-navy mb-4">
            <Star className="inline w-5 h-5 text-yl-gold mr-2" />
            Key Takeaways
          </h2>
          <ul className="space-y-2 text-yl-charcoal">
            <li className="flex gap-2"><span className="text-yl-gold font-bold">•</span> London has <strong>75+ five-star hotels</strong> — the most of any European city</li>
            <li className="flex gap-2"><span className="text-yl-gold font-bold">•</span> <strong>Mayfair</strong> is the premier hotel district; <strong>Knightsbridge</strong> is best for shopping access</li>
            <li className="flex gap-2"><span className="text-yl-gold font-bold">•</span> Halal room service is available at The Dorchester, Shangri-La, and Jumeirah Carlton Tower</li>
            <li className="flex gap-2"><span className="text-yl-gold font-bold">•</span> Budget for <strong>£400-800/night</strong> for a quality 5-star room; suites start at <strong>£1,200+</strong></li>
            <li className="flex gap-2"><span className="text-yl-gold font-bold">•</span> Book 3-6 months early for summer and Ramadan periods — prices rise 30-50%</li>
          </ul>
        </div>
      </section>

      {/* Neighbourhood Guide */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-yl-dark-navy mb-8">
          <MapPin className="inline w-6 h-6 text-yl-red mr-2" />
          Hotels by Neighbourhood
        </h2>
        <div className="space-y-12">
          {NEIGHBOURHOODS.map((area) => (
            <article key={area.slug} id={area.slug} className="scroll-mt-24">
              <BrandCardLight className="overflow-hidden">
                <div className="md:flex">
                  <div className="relative w-full md:w-1/3 h-48 md:h-auto min-h-[200px]">
                    <Image src={area.image} alt={`Luxury hotels in ${area.name}, London`} fill className="object-cover" />
                  </div>
                  <div className="p-6 md:p-8 flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl md:text-2xl font-display font-bold text-yl-dark-navy">{area.name}</h3>
                      <span className="text-sm font-medium text-yl-gold bg-yl-gold/10 px-3 py-1 rounded-full">{area.priceRange}</span>
                    </div>
                    <p className="text-yl-charcoal mt-3 leading-relaxed">{area.description}</p>
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-yl-dark-navy mb-2">Top Hotels:</h4>
                      <div className="flex flex-wrap gap-2">
                        {area.hotels.map((h) => (
                          <span key={h} className="text-xs font-medium bg-yl-gold/10 text-yl-gold-dark px-3 py-1 rounded-full">{h}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {area.features.map((f) => (
                        <span key={f} className="text-xs bg-yl-cream text-yl-charcoal px-3 py-1 rounded-full border border-yl-sand/50">{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </BrandCardLight>
            </article>
          ))}
        </div>
      </section>

      {/* Booking Tips */}
      <section className="bg-yl-dark-navy/5 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-yl-dark-navy mb-8">Insider Booking Tips</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {BOOKING_TIPS.map((tip) => (
              <div key={tip.title}>
              <BrandCardLight className="p-6">
                <h3 className="font-display font-semibold text-yl-dark-navy">{tip.title}</h3>
                <p className="text-sm text-yl-charcoal mt-2 leading-relaxed">{tip.detail}</p>
              </BrandCardLight>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Blog Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-yl-dark-navy mb-8">
              <Hotel className="inline w-6 h-6 text-yl-red mr-2" />
              Our Hotel Guides
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedPosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                  <BrandCardLight className="h-full hover:shadow-lg transition-shadow">
                    {post.featured_image_url && (
                      <div className="relative h-40 w-full">
                        <Image src={post.featured_image_url} alt={post.title_en} fill className="object-cover rounded-t-lg" />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="font-display font-semibold text-yl-dark-navy group-hover:text-yl-red transition-colors line-clamp-2">{post.title_en}</h3>
                      {post.meta_description_en && (
                        <p className="text-sm text-yl-charcoal/70 mt-2 line-clamp-2">{post.meta_description_en}</p>
                      )}
                      <span className="inline-flex items-center text-sm text-yl-red font-medium mt-3">Read Guide <ArrowRight className="w-4 h-4 ml-1" /></span>
                    </div>
                  </BrandCardLight>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Cross-Links */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-xl font-display font-bold text-yl-dark-navy mb-6">More London Guides</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Link href="/halal-restaurants-london" className="group bg-white rounded-lg border border-yl-sand/50 p-5 hover:shadow-md transition-shadow">
            <h3 className="font-display font-semibold text-yl-dark-navy group-hover:text-yl-red transition-colors">Halal Restaurants London</h3>
            <p className="text-sm text-yl-charcoal/60 mt-1">700+ halal-certified restaurants across every neighbourhood</p>
          </Link>
          <Link href="/london-with-kids" className="group bg-white rounded-lg border border-yl-sand/50 p-5 hover:shadow-md transition-shadow">
            <h3 className="font-display font-semibold text-yl-dark-navy group-hover:text-yl-red transition-colors">London with Kids</h3>
            <p className="text-sm text-yl-charcoal/60 mt-1">Family-friendly attractions and activities</p>
          </Link>
          <Link href="/london-by-foot" className="group bg-white rounded-lg border border-yl-sand/50 p-5 hover:shadow-md transition-shadow">
            <h3 className="font-display font-semibold text-yl-dark-navy group-hover:text-yl-red transition-colors">London by Foot</h3>
            <p className="text-sm text-yl-charcoal/60 mt-1">Self-guided walking tours through London&apos;s best areas</p>
          </Link>
        </div>
      </section>
    </div>
  )
}
