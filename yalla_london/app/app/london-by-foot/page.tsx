import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Clock, ArrowRight, Footprints, Download } from 'lucide-react'
import { walks } from './walks-data'
import { getDefaultSiteId, getSiteConfig, getSiteDomain } from '@/config/sites'
import { getBaseUrl } from '@/lib/url-utils'
import { TriBar, BrandButton, BrandTag, BrandCardLight, SectionLabel, WatermarkStamp, Breadcrumbs } from '@/components/brand-kit'

// ISR: Revalidate walking guides every hour
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const siteConfig = getSiteConfig(getDefaultSiteId());
  const siteName = siteConfig?.name || 'Yalla London';
  const destination = siteConfig?.destination || 'London';
  const canonicalUrl = `${baseUrl}/london-by-foot`;

  return {
    title: `${destination} by Foot — Self-Guided Walking Tours | ${siteName}`,
    description: `Free self-guided walking routes through ${destination}: royal palaces, hidden markets, street art, secret gardens, and cultural landmarks with maps.`,
    keywords: [`${destination} walking tours`, `self guided walks ${destination}`, `${destination} walking routes`, `free ${destination} walks`, `${destination} by foot`, `${destination} walking guide`],
    openGraph: {
      title: `${destination} by Foot — 5 Self-Guided Walking Tours`,
      description: `Discover ${destination}'s best walking routes. Royal palaces, hidden markets, street art, and secret gardens.`,
      url: canonicalUrl,
      type: 'website',
      locale: 'en_GB',
      alternateLocale: 'ar_SA',
      siteName,
    },
    twitter: {
      card: 'summary_large_image',
      site: `@${siteConfig?.slug || 'yallalondon'}`,
      title: `${destination} by Foot | ${siteName}`,
      description: `5 curated walking routes through ${destination} with maps, photos, and insider tips`,
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en-GB': canonicalUrl,
        'ar-SA': `${baseUrl}/ar/london-by-foot`,
        'x-default': canonicalUrl,
      },
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
  }
}

const difficultyColors: Record<string, { color: 'blue' | 'gold' | 'red' | 'neutral' }> = {
  'Easy': { color: 'blue' },
  'Easy-Moderate': { color: 'gold' },
  'Moderate': { color: 'red' },
}

export default function LondonByFootPage() {
  return (
    <div className="bg-yl-cream font-body">
      {/* Hero Section */}
      <section className="relative bg-yl-dark-navy text-white overflow-hidden pt-28 pb-16">
        <div className="absolute inset-0 opacity-30">
          <Image
            src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&q=80"
            alt="London skyline"
            fill
            className="object-cover"
            priority
          />
        </div>
        <WatermarkStamp />
        <div className="relative z-10 max-w-7xl mx-auto px-7 text-center">
          <Breadcrumbs items={[
            { label: 'Home', href: '/' },
            { label: 'London by Foot' },
          ]} />
          <div className="flex items-center justify-center gap-3 mb-6">
            <Footprints className="h-8 w-8 text-yl-gold" />
            <SectionLabel>Walking Guides</SectionLabel>
          </div>
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6">
            London by Foot
          </h1>
          <p className="text-xl md:text-2xl text-yl-gray-400 max-w-3xl mx-auto mb-8 font-body">
            The best way to discover London is on foot. Five curated walking routes through the city&apos;s most iconic landmarks, hidden gems, and secret corners — with maps, photos, and insider tips.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <BrandTag color="neutral">5 Curated Routes</BrandTag>
            <BrandTag color="neutral">Free Online Guides</BrandTag>
            <BrandTag color="gold">Offline PDF Guides Available</BrandTag>
          </div>
        </div>
      </section>

      <TriBar />

      {/* Walks Grid */}
      <section className="max-w-7xl mx-auto px-7 py-16">
        <div className="text-center mb-12">
          <SectionLabel>Select Your Route</SectionLabel>
          <h2 className="text-3xl font-heading font-bold text-yl-charcoal mb-4">Choose Your Walk</h2>
          <p className="text-yl-gray-500 max-w-2xl mx-auto font-body">
            Each route has been walked, photographed, and written by locals who know London inside out. Choose your adventure below.
          </p>
        </div>

        <div className="grid gap-8">
          {walks.map((walk, index) => (
            <Link key={walk.slug} href={`/london-by-foot/${walk.slug}`} className="group">
              <BrandCardLight className={`overflow-hidden ${index % 2 === 1 ? 'md:flex-row-reverse' : ''} md:flex`}>
                {/* Image */}
                <div className="relative md:w-2/5 aspect-[16/10] md:aspect-auto">
                  <Image
                    src={walk.heroImage}
                    alt={walk.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 40vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <BrandTag color={difficultyColors[walk.difficulty]?.color || 'neutral'}>
                      {walk.difficulty}
                    </BrandTag>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 md:w-3/5 flex flex-col justify-center">
                  <div className="flex items-center gap-4 font-mono text-[10px] tracking-wider uppercase text-yl-gray-500 mb-3">
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-yl-gold" /> {walk.distance}</span>
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-yl-gold" /> {walk.duration}</span>
                  </div>
                  <h3 className="text-2xl font-heading font-bold text-yl-charcoal mb-2 group-hover:text-yl-red transition-colors">
                    {walk.title}
                  </h3>
                  <p className="text-yl-red font-heading font-medium mb-3">{walk.subtitle}</p>
                  <p className="text-yl-gray-500 text-sm font-body mb-4 line-clamp-3">{walk.intro}</p>
                  <div className="flex items-center gap-2 font-mono text-[10px] tracking-wider uppercase text-yl-gray-500 mb-4">
                    <span className="font-medium">{walk.stops.length} stops</span>
                    <span className="text-yl-gray-300">|</span>
                    <span>{walk.startPoint} → {walk.endPoint}</span>
                  </div>
                  <div className="flex items-center gap-1 text-yl-red font-heading font-medium text-sm group-hover:gap-2 transition-all">
                    Read the full guide <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </BrandCardLight>
            </Link>
          ))}
        </div>
      </section>

      <TriBar />

      {/* PDF Guide CTA */}
      <section className="bg-yl-dark-navy text-white py-16">
        <div className="max-w-4xl mx-auto px-7 text-center">
          <Download className="w-12 h-12 text-yl-gold mx-auto mb-6" />
          <SectionLabel>Premium Guides</SectionLabel>
          <h2 className="text-3xl font-heading font-bold mb-4">
            Take London With You
          </h2>
          <p className="text-yl-gray-400 text-lg mb-8 max-w-2xl mx-auto font-body">
            Download our premium PDF walking guides with offline maps, hidden gems not in the free guides, insider restaurant recommendations, and minute-by-minute timing for each route.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/recommendations">
              <BrandButton variant="gold">
                Browse All Guides
              </BrandButton>
            </Link>
            <Link href="/blog">
              <BrandButton variant="outline" className="border-white/30 text-white hover:bg-white/10">
                Read London Stories
              </BrandButton>
            </Link>
          </div>
        </div>
      </section>

      <TriBar />

      {/* SEO Content Section */}
      <section className="max-w-4xl mx-auto px-7 py-16">
        <div className="prose prose-stone max-w-none">
          <h2 className="text-2xl font-heading font-bold text-yl-charcoal">Why Walk London?</h2>
          <p className="font-body text-yl-gray-500">
            London is one of the world&apos;s great walking cities. Unlike many capitals, its major landmarks are close together, connected by parks, riverside paths, and charming side streets that no bus or taxi can access. Walking lets you discover the London that exists between the famous sights — the hidden courtyards, the blue plaques marking where legends lived, the neighbourhood cafés where locals gather, and the views that open up unexpectedly around every corner.
          </p>
          <p className="font-body text-yl-gray-500">
            Our five walking routes cover the essential London experiences: the royal grandeur of Westminster, the cultural richness of the South Bank, the ancient history of the City, the colourful charm of Notting Hill and Kensington, and the creative energy of East London. Together, they give you a complete picture of this extraordinary city.
          </p>
          <p className="font-body text-yl-gray-500">
            Each guide includes turn-by-turn directions, the best times to visit each stop, photography tips, and honest recommendations for places to eat and drink along the way. Whether you&apos;re visiting London for the first time or rediscovering it as a returning traveller, these walks will show you the city at its very best.
          </p>
        </div>
      </section>
    </div>
  )
}
