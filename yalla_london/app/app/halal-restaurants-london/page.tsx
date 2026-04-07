import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { UtensilsCrossed, MapPin, Star, ArrowRight, Clock } from 'lucide-react'
import { PhotoCredits } from '@/components/photo-credits'
import { getDefaultSiteId, getSiteConfig, getSiteDomain } from '@/config/sites'
import { getBaseUrl } from '@/lib/url-utils'
import { TriBar, BrandButton, BrandCardLight, SectionLabel, Breadcrumbs } from '@/components/brand-kit'
import { StructuredData } from '@/components/structured-data'

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const siteConfig = getSiteConfig(getDefaultSiteId());
  const siteName = siteConfig?.name || 'Yalla London';
  const canonicalUrl = `${baseUrl}/halal-restaurants-london`;

  return {
    title: `Best Halal Restaurants in London 2026 — Complete Guide | ${siteName}`,
    description: 'Discover the best halal restaurants in London: fine dining, casual eats, Middle Eastern, South Asian, and Turkish cuisine across Knightsbridge, Edgware Road, Mayfair, and more.',
    keywords: ['halal restaurants london', 'best halal food london', 'halal fine dining london', 'halal restaurants mayfair', 'halal restaurants knightsbridge', 'halal food edgware road', 'muslim friendly restaurants london'],
    openGraph: {
      title: 'Best Halal Restaurants in London 2026 — Complete Guide',
      description: 'From Michelin-starred fine dining to hidden local gems — the definitive guide to halal restaurants across London.',
      url: canonicalUrl,
      type: 'website',
      locale: 'en_GB',
      alternateLocale: 'ar_SA',
      siteName,
    },
    twitter: {
      card: 'summary_large_image',
      title: `Best Halal Restaurants in London | ${siteName}`,
      description: 'The definitive guide to halal dining across London — fine dining, casual eats, and hidden gems.',
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en-GB': canonicalUrl,
        'ar-SA': `${baseUrl}/ar/halal-restaurants-london`,
        'x-default': canonicalUrl,
      },
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' as const, 'max-snippet': -1 } },
  }
}

// Cornerstone content — curated restaurant areas (static, never stale)
const AREAS = [
  {
    name: 'Edgware Road',
    nameAr: 'شارع إدجوار',
    slug: 'edgware-road',
    description: 'The heart of London\'s Arab community. Lebanese shawarma, Egyptian koshari, Moroccan tagine, and late-night shisha spots along the "Little Cairo" strip.',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
    highlights: ['Maroush', 'Ranoush Juice', 'Beirut Express', 'Al Arez'],
    cuisines: ['Lebanese', 'Egyptian', 'Moroccan', 'Iraqi'],
  },
  {
    name: 'Knightsbridge & Mayfair',
    nameAr: 'نايتسبريدج ومايفير',
    slug: 'knightsbridge-mayfair',
    description: 'Luxury halal fine dining at its finest. Several Michelin-starred restaurants with halal options, five-star hotel restaurants, and upscale Middle Eastern eateries near Harrods.',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    highlights: ['Hakkasan', 'Novikov', 'Zuma', 'Nusr-Et'],
    cuisines: ['Japanese-Halal', 'Turkish', 'Pan-Asian', 'Steakhouse'],
  },
  {
    name: 'Whitechapel & Brick Lane',
    nameAr: 'وايتشابل وبريك لين',
    slug: 'whitechapel-brick-lane',
    description: 'London\'s historic Bengali quarter. Authentic curry houses, street food markets, and some of the best value halal meals in Central London.',
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&q=80',
    highlights: ['Tayyabs', 'Lahore Kebab House', 'Needoo Grill', 'Graam Bangla'],
    cuisines: ['Bengali', 'Pakistani', 'Indian', 'Turkish'],
  },
  {
    name: 'Shepherd\'s Bush & Westfield',
    nameAr: 'شيبردز بوش وويستفيلد',
    slug: 'shepherds-bush',
    description: 'Family-friendly halal dining around Westfield London. Major chain restaurants with halal menus plus independent Middle Eastern and South Asian gems.',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    highlights: ['Abu Zaad', 'Sheba', 'Sushi Samba (halal options)', 'Oka'],
    cuisines: ['Syrian', 'Somali', 'Japanese-Halal', 'Mediterranean'],
  },
  {
    name: 'Tooting & Balham',
    nameAr: 'توتينغ وبلهام',
    slug: 'tooting-balham',
    description: 'South London\'s hidden food paradise. Award-winning Pakistani and Sri Lankan restaurants, vibrant street food, and some of the most authentic subcontinental cooking in the UK.',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    highlights: ['Lahore Karahi', 'Dosa n Chutny', 'Apollo Banana Leaf', 'Taste of Nawab'],
    cuisines: ['Pakistani', 'Sri Lankan', 'South Indian', 'Afghani'],
  },
];

const CUISINE_TYPES = [
  { name: 'Lebanese & Middle Eastern', icon: '🫓', count: '200+' },
  { name: 'Turkish & Ottoman', icon: '🥙', count: '150+' },
  { name: 'South Asian & Pakistani', icon: '🍛', count: '300+' },
  { name: 'Fine Dining & Michelin', icon: '⭐', count: '25+' },
  { name: 'Japanese & East Asian', icon: '🍣', count: '40+' },
  { name: 'Steakhouse & Grill', icon: '🥩', count: '60+' },
];

export default async function HalalRestaurantsLondonPage() {
  // Fetch related blog posts from DB
  let relatedPosts: Array<{ slug: string; title_en: string; meta_description_en: string; created_at: Date; featured_image_url: string | null }> = [];
  try {
    const { prisma } = await import('@/lib/db');
    relatedPosts = await prisma.blogPost.findMany({
      where: {
        published: true,
        siteId: getDefaultSiteId(),
        OR: [
          { title_en: { contains: 'halal', mode: 'insensitive' } },
          { title_en: { contains: 'restaurant', mode: 'insensitive' } },
          { title_en: { contains: 'food', mode: 'insensitive' } },
          { title_en: { contains: 'dining', mode: 'insensitive' } },
          { category: { name: { in: ['Food & Dining', 'Restaurants', 'Halal'] } } },
        ],
      },
      select: { slug: true, title_en: true, meta_description_en: true, created_at: true, featured_image_url: true },
      orderBy: { created_at: 'desc' },
      take: 12,
    });
  } catch { /* graceful degradation — static content still renders */ }

  const baseUrl = await getBaseUrl();
  const siteId = getDefaultSiteId();

  return (
    <div className="bg-yl-cream font-body">
      <StructuredData type="breadcrumb" data={{ items: [{ name: 'Home', url: baseUrl }, { name: 'Halal Restaurants London', url: `${baseUrl}/halal-restaurants-london` }] }} siteId={siteId} />
      <StructuredData type="itemList" data={{ name: 'Best Halal Restaurant Areas in London', items: AREAS.map((a, i) => ({ position: i + 1, name: a.name, url: `${baseUrl}/halal-restaurants-london#${a.slug}` })) }} siteId={siteId} />

      {/* Hero */}
      <section className="relative bg-yl-dark-navy text-white overflow-hidden pt-28 pb-16">
        <div className="absolute inset-0 opacity-30">
          <Image src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1600&q=80" alt="Halal restaurant in London" fill className="object-cover" priority />
        </div>
        <div className="relative max-w-6xl mx-auto px-6">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Halal Restaurants London' }]} />
          <div className="mt-8">
            <SectionLabel>DEFINITIVE GUIDE</SectionLabel>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mt-4 leading-tight">
              Best Halal Restaurants<br />in London 2026
            </h1>
            <p className="text-lg md:text-xl text-white/80 mt-6 max-w-2xl">
              From Michelin-starred fine dining in Mayfair to legendary curry houses on Brick Lane — every halal restaurant worth visiting, organised by neighbourhood.
            </p>
            <TriBar className="mt-6" />
          </div>
        </div>
      </section>

      {/* Key Takeaways — AIO-optimised answer capsule */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl border border-yl-sand/50 p-6 md:p-8 shadow-sm">
          <h2 className="text-xl font-display font-bold text-yl-dark-navy mb-4">
            <Star className="inline w-5 h-5 text-yl-gold mr-2" />
            Key Takeaways
          </h2>
          <ul className="space-y-2 text-yl-charcoal">
            <li className="flex gap-2"><span className="text-yl-gold font-bold">•</span> London has <strong>700+ halal-certified restaurants</strong> — more than any other European capital</li>
            <li className="flex gap-2"><span className="text-yl-gold font-bold">•</span> <strong>Edgware Road</strong> is the epicentre of Arab dining; <strong>Knightsbridge</strong> leads for luxury halal</li>
            <li className="flex gap-2"><span className="text-yl-gold font-bold">•</span> Fine dining options include Hakkasan, Zuma, and Novikov — all with halal-certified menus</li>
            <li className="flex gap-2"><span className="text-yl-gold font-bold">•</span> Budget meals start from <strong>£6-8</strong> on Brick Lane; fine dining averages <strong>£80-150 per person</strong></li>
            <li className="flex gap-2"><span className="text-yl-gold font-bold">•</span> Most halal restaurants are clustered within <strong>Zones 1-2</strong>, easily accessible by Tube</li>
          </ul>
        </div>
      </section>

      {/* Cuisine Type Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-12">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-yl-dark-navy mb-6">
          Halal Cuisine Types in London
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {CUISINE_TYPES.map((cuisine) => (
            <div key={cuisine.name} className="bg-white rounded-lg border border-yl-sand/50 p-4 text-center hover:shadow-md transition-shadow">
              <span className="text-3xl">{cuisine.icon}</span>
              <h3 className="font-display font-semibold text-yl-dark-navy mt-2 text-sm">{cuisine.name}</h3>
              <p className="text-yl-gold font-bold text-lg">{cuisine.count}</p>
              <p className="text-xs text-yl-charcoal/60">restaurants</p>
            </div>
          ))}
        </div>
      </section>

      {/* Area-by-Area Guide */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-yl-dark-navy mb-8">
          <MapPin className="inline w-6 h-6 text-yl-red mr-2" />
          Halal Restaurants by Neighbourhood
        </h2>
        <div className="space-y-12">
          {AREAS.map((area) => (
            <article key={area.slug} id={area.slug} className="scroll-mt-24">
              <BrandCardLight className="overflow-hidden">
                <div className="md:flex">
                  <div className="relative w-full md:w-1/3 h-48 md:h-auto min-h-[200px]">
                    <Image src={area.image} alt={`Halal restaurants in ${area.name}, London`} fill className="object-cover" />
                  </div>
                  <div className="p-6 md:p-8 flex-1">
                    <h3 className="text-xl md:text-2xl font-display font-bold text-yl-dark-navy">{area.name}</h3>
                    <p className="text-yl-charcoal mt-3 leading-relaxed">{area.description}</p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {area.cuisines.map((c) => (
                        <span key={c} className="text-xs bg-yl-cream text-yl-charcoal px-3 py-1 rounded-full border border-yl-sand/50">{c}</span>
                      ))}
                    </div>
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-yl-dark-navy mb-2">Must-Visit:</h4>
                      <div className="flex flex-wrap gap-2">
                        {area.highlights.map((h) => (
                          <span key={h} className="text-xs font-medium bg-yl-gold/10 text-yl-gold-dark px-3 py-1 rounded-full">{h}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </BrandCardLight>
            </article>
          ))}
        </div>
      </section>

      {/* Related Blog Posts — Hub-and-Spoke Links */}
      {relatedPosts.length > 0 && (
        <section className="bg-yl-dark-navy/5 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-yl-dark-navy mb-8">
              <UtensilsCrossed className="inline w-6 h-6 text-yl-red mr-2" />
              Our Halal Restaurant Guides
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
                      <h3 className="font-display font-semibold text-yl-dark-navy group-hover:text-yl-red transition-colors line-clamp-2">
                        {post.title_en}
                      </h3>
                      {post.meta_description_en && (
                        <p className="text-sm text-yl-charcoal/70 mt-2 line-clamp-2">{post.meta_description_en}</p>
                      )}
                      <span className="inline-flex items-center text-sm text-yl-red font-medium mt-3">
                        Read Guide <ArrowRight className="w-4 h-4 ml-1" />
                      </span>
                    </div>
                  </BrandCardLight>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Book Your Stay CTA */}
      <section className="bg-yl-dark-navy text-white py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">Planning Your London Food Trip?</h2>
          <p className="text-white/70 mb-8 max-w-2xl mx-auto">Stay near the best halal dining in London. Book a hotel in Edgware Road, Knightsbridge, or Whitechapel for easy access to 700+ halal restaurants.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/api/affiliate/click?url=https%3A%2F%2Fwww.expedia.com%2FLondon-Hotels.d178279.Travel-Guide-Hotels&partner=expedia&article=halal-restaurants-london"
              target="_blank"
              rel="noopener sponsored"
              className="inline-flex items-center justify-center gap-2 bg-yl-gold text-yl-dark-navy font-semibold px-8 py-3.5 rounded-lg hover:bg-yl-gold/90 transition-colors"
            >
              Hotels Near Halal Dining — Expedia
            </a>
            <a
              href="/api/affiliate/click?url=https%3A%2F%2Fwww.vrbo.com%2Fvacation-rentals%2Fengland%2Flondon&partner=vrbo&article=halal-restaurants-london"
              target="_blank"
              rel="noopener sponsored"
              className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-semibold px-8 py-3.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              Self-Catering Apartments — Vrbo
            </a>
          </div>
          <p className="text-xs text-white/40 mt-4">Affiliate disclosure: We earn a commission when you book through our links at no extra cost to you.</p>
        </div>
      </section>

      {/* Internal Links to Related Pillar Pages */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-xl font-display font-bold text-yl-dark-navy mb-6">More London Guides</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Link href="/luxury-hotels-london" className="group bg-white rounded-lg border border-yl-sand/50 p-5 hover:shadow-md transition-shadow">
            <h3 className="font-display font-semibold text-yl-dark-navy group-hover:text-yl-red transition-colors">Luxury Hotels London</h3>
            <p className="text-sm text-yl-charcoal/60 mt-1">The best 5-star hotels with halal-friendly facilities</p>
          </Link>
          <Link href="/london-with-kids" className="group bg-white rounded-lg border border-yl-sand/50 p-5 hover:shadow-md transition-shadow">
            <h3 className="font-display font-semibold text-yl-dark-navy group-hover:text-yl-red transition-colors">London with Kids</h3>
            <p className="text-sm text-yl-charcoal/60 mt-1">Family-friendly activities and halal-friendly venues</p>
          </Link>
          <Link href="/experiences" className="group bg-white rounded-lg border border-yl-sand/50 p-5 hover:shadow-md transition-shadow">
            <h3 className="font-display font-semibold text-yl-dark-navy group-hover:text-yl-red transition-colors">London Experiences</h3>
            <p className="text-sm text-yl-charcoal/60 mt-1">Tours, attractions, and cultural experiences</p>
          </Link>
        </div>
      </section>

      {/* Per-restaurant JSON-LD for rich results */}
      {AREAS.flatMap(area =>
        area.highlights.map(restaurantName => (
          <script
            key={`restaurant-${area.slug}-${restaurantName}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Restaurant",
                "name": restaurantName,
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": area.name,
                  "addressRegion": "London",
                  "addressCountry": "GB"
                },
                "servesCuisine": area.cuisines,
                "url": `${baseUrl}/halal-restaurants-london#${area.slug}`
              })
            }}
          />
        ))
      )}
      <PhotoCredits photographers={[
        { name: 'Jay Wennington', username: 'jaywennington' },
        { name: 'Jason Leung', username: 'ninjason' },
      ]} className="text-yl-charcoal/30" />
    </div>
  )
}
