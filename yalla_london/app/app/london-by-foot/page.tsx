import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Clock, ArrowRight, Footprints, Download } from 'lucide-react'
import { walks } from './walks-data'
import { getDefaultSiteId, getSiteConfig, getSiteDomain } from '@/config/sites'
import { getBaseUrl } from '@/lib/url-utils'

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

const difficultyColor: Record<string, string> = {
  'Easy': 'bg-green-100 text-green-800',
  'Easy-Moderate': 'bg-amber-100 text-amber-800',
  'Moderate': 'bg-orange-100 text-orange-800',
}

export default function LondonByFootPage() {
  return (
    <div className="bg-cream font-editorial">
      {/* Hero Section */}
      <section className="relative bg-charcoal text-white overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <Image
            src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&q=80"
            alt="London skyline"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Footprints className="h-8 w-8 text-yalla-gold-400" />
            <span className="text-yalla-gold-400 font-mono text-sm uppercase tracking-widest">Walking Guides</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-6">
            London by Foot
          </h1>
          <p className="text-xl md:text-2xl text-cream-300 max-w-3xl mx-auto mb-8">
            The best way to discover London is on foot. Five curated walking routes through the city&apos;s most iconic landmarks, hidden gems, and secret corners — with maps, photos, and insider tips.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <span className="px-4 py-2 bg-white/10 rounded-full text-sm">5 Curated Routes</span>
            <span className="px-4 py-2 bg-white/10 rounded-full text-sm">Free Online Guides</span>
            <span className="px-4 py-2 bg-white/10 rounded-full text-sm">Offline PDF Guides Available</span>
          </div>
        </div>
      </section>

      {/* Walks Grid */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-display font-bold text-charcoal mb-4">Choose Your Walk</h2>
          <p className="text-stone max-w-2xl mx-auto">
            Each route has been walked, photographed, and written by locals who know London inside out. Choose your adventure below.
          </p>
        </div>

        <div className="grid gap-8">
          {walks.map((walk, index) => (
            <Link key={walk.slug} href={`/london-by-foot/${walk.slug}`} className="group">
              <article className={`bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-luxury transition-all border border-sand/50 ${index % 2 === 1 ? 'md:flex-row-reverse' : ''} md:flex`}>
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
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${difficultyColor[walk.difficulty] || 'bg-gray-100 text-gray-800'}`}>
                      {walk.difficulty}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 md:w-3/5 flex flex-col justify-center">
                  <div className="flex items-center gap-4 text-sm text-stone mb-3">
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {walk.distance}</span>
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {walk.duration}</span>
                  </div>
                  <h3 className="text-2xl font-display font-bold text-charcoal mb-2 group-hover:text-london-600 transition-colors">
                    {walk.title}
                  </h3>
                  <p className="text-london-600 font-medium mb-3">{walk.subtitle}</p>
                  <p className="text-stone text-sm mb-4 line-clamp-3">{walk.intro}</p>
                  <div className="flex items-center gap-2 text-sm text-stone mb-4">
                    <span className="font-medium">{walk.stops.length} stops</span>
                    <span className="text-sand">|</span>
                    <span>{walk.startPoint} → {walk.endPoint}</span>
                  </div>
                  <div className="flex items-center gap-1 text-london-600 font-medium text-sm group-hover:gap-2 transition-all">
                    Read the full guide <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      {/* PDF Guide CTA */}
      <section className="bg-gradient-to-br from-charcoal to-london-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Download className="w-12 h-12 text-yalla-gold-400 mx-auto mb-6" />
          <h2 className="text-3xl font-display font-bold mb-4">
            Take London With You
          </h2>
          <p className="text-cream-300 text-lg mb-8 max-w-2xl mx-auto">
            Download our premium PDF walking guides with offline maps, hidden gems not in the free guides, insider restaurant recommendations, and minute-by-minute timing for each route.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/recommendations"
              className="px-8 py-4 bg-yalla-gold-500 text-charcoal font-semibold rounded-full hover:bg-yalla-gold-400 transition-colors"
            >
              Browse All Guides
            </Link>
            <Link
              href="/blog"
              className="px-8 py-4 bg-white/10 text-white font-semibold rounded-full hover:bg-white/20 transition-colors"
            >
              Read London Stories
            </Link>
          </div>
        </div>
      </section>

      {/* SEO Content Section */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="prose prose-stone max-w-none">
          <h2 className="text-2xl font-display font-bold text-charcoal">Why Walk London?</h2>
          <p>
            London is one of the world&apos;s great walking cities. Unlike many capitals, its major landmarks are close together, connected by parks, riverside paths, and charming side streets that no bus or taxi can access. Walking lets you discover the London that exists between the famous sights — the hidden courtyards, the blue plaques marking where legends lived, the neighbourhood cafés where locals gather, and the views that open up unexpectedly around every corner.
          </p>
          <p>
            Our five walking routes cover the essential London experiences: the royal grandeur of Westminster, the cultural richness of the South Bank, the ancient history of the City, the colourful charm of Notting Hill and Kensington, and the creative energy of East London. Together, they give you a complete picture of this extraordinary city.
          </p>
          <p>
            Each guide includes turn-by-turn directions, the best times to visit each stop, photography tips, and honest recommendations for places to eat and drink along the way. Whether you&apos;re visiting London for the first time or rediscovering it as a returning traveller, these walks will show you the city at its very best.
          </p>
        </div>
      </section>
    </div>
  )
}
