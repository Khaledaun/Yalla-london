import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MapPin, Clock, ArrowLeft, ArrowRight, Download, Footprints, Compass, Camera, Coffee } from 'lucide-react'
import { walks } from '../walks-data'
import { getDefaultSiteId, getSiteConfig, getSiteDomain } from '@/config/sites'
import { getBaseUrl } from '@/lib/url-utils'

// ISR: Revalidate walk detail pages every hour
export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return walks.map((walk) => ({ slug: walk.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const walk = walks.find(w => w.slug === slug)
  if (!walk) return { title: 'Walk Not Found' }

  const baseUrl = await getBaseUrl();
  const siteConfig = getSiteConfig(getDefaultSiteId());
  const siteName = siteConfig?.name || 'Yalla London';
  const destination = siteConfig?.destination || 'London';
  const canonicalUrl = `${baseUrl}/london-by-foot/${slug}`;

  return {
    title: `${walk.title} — ${destination} Walking Guide | ${siteName}`,
    description: `${walk.subtitle}. ${walk.distance}, ${walk.duration}. Free self-guided walking tour with ${walk.stops.length} stops, maps, photos, and insider tips.`,
    keywords: [walk.title, `${destination} walking tour`, `self guided walk ${destination}`, walk.startPoint, walk.endPoint, `${destination} by foot`],
    openGraph: {
      title: `${walk.title} — ${destination} Walking Guide`,
      description: walk.subtitle,
      url: canonicalUrl,
      type: 'article',
      locale: 'en_GB',
      alternateLocale: 'ar_SA',
      siteName,
      images: [{ url: walk.heroImage, width: 1200, height: 630, alt: walk.title }],
    },
    twitter: {
      card: 'summary_large_image',
      site: `@${siteConfig?.slug || 'yallalondon'}`,
      title: `${walk.title} | ${siteName}`,
      description: walk.subtitle,
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en-GB': canonicalUrl,
        'ar-SA': `${baseUrl}/ar/london-by-foot/${slug}`,
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

export default async function WalkDetailPage({ params }: Props) {
  const { slug } = await params;
  const walk = walks.find(w => w.slug === slug)
  if (!walk) notFound()

  const walkIndex = walks.findIndex(w => w.slug === slug)
  const prevWalk = walkIndex > 0 ? walks[walkIndex - 1] : null
  const nextWalk = walkIndex < walks.length - 1 ? walks[walkIndex + 1] : null

  return (
    <div className="bg-cream font-editorial">
      {/* Hero */}
      <section className="relative h-[50vh] min-h-[400px] bg-charcoal">
        <Image
          src={walk.heroImage}
          alt={walk.title}
          fill
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="max-w-4xl mx-auto">
            <Link href="/london-by-foot" className="inline-flex items-center gap-2 text-cream-300 hover:text-white mb-4 text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> All Walking Guides
            </Link>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-3">{walk.title}</h1>
            <p className="text-xl text-cream-300 mb-4">{walk.subtitle}</p>
            <div className="flex flex-wrap gap-4 text-sm text-cream-200">
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
                <MapPin className="w-4 h-4" /> {walk.distance}
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
                <Clock className="w-4 h-4" /> {walk.duration}
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
                <Footprints className="w-4 h-4" /> {walk.difficulty}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Facts */}
      <section className="bg-white border-b border-sand">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-stone mb-1">Start</div>
              <div className="font-medium text-charcoal">{walk.startPoint}</div>
            </div>
            <div>
              <div className="text-stone mb-1">End</div>
              <div className="font-medium text-charcoal">{walk.endPoint}</div>
            </div>
            <div>
              <div className="text-stone mb-1">Best Time</div>
              <div className="font-medium text-charcoal">{walk.bestTime}</div>
            </div>
            <div>
              <div className="text-stone mb-1">Stops</div>
              <div className="font-medium text-charcoal">{walk.stops.length} locations</div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Introduction */}
        <div className="prose prose-stone max-w-none mb-12">
          <p className="text-lg leading-relaxed text-stone">{walk.intro}</p>
        </div>

        {/* Map Embed */}
        <div className="mb-12 rounded-2xl overflow-hidden shadow-card border border-sand/50">
          <div className="bg-charcoal text-white px-6 py-4 flex items-center gap-2">
            <Compass className="w-5 h-5 text-yalla-gold-400" />
            <h2 className="font-display font-bold">Route Map</h2>
          </div>
          <div className="aspect-[16/9] bg-cream-100 relative">
            <iframe
              src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${walk.startPoint.replace(/ /g, '+')},London&destination=${walk.endPoint.replace(/ /g, '+')},London&mode=walking`}
              width="100%"
              height="100%"
              style={{ border: 0, position: 'absolute', inset: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Walking route: ${walk.title}`}
            />
          </div>
        </div>

        {/* Stops */}
        <div className="mb-12">
          <h2 className="text-2xl font-display font-bold text-charcoal mb-8 flex items-center gap-2">
            <Footprints className="w-6 h-6 text-london-600" />
            The Route — {walk.stops.length} Stops
          </h2>

          <div className="space-y-8">
            {walk.stops.map((stop, index) => (
              <article key={index} className="relative">
                {/* Timeline connector */}
                {index < walk.stops.length - 1 && (
                  <div className="absolute left-6 top-14 bottom-0 w-px bg-sand hidden md:block" />
                )}

                <div className="flex gap-6">
                  {/* Step number */}
                  <div className="hidden md:flex shrink-0 w-12 h-12 bg-london-600 text-white rounded-full items-center justify-center font-bold text-lg z-10">
                    {index + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-white rounded-2xl p-6 shadow-card border border-sand/50">
                    <div className="flex items-center gap-2 mb-2 md:hidden">
                      <span className="w-8 h-8 bg-london-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </span>
                      <span className="text-xs text-stone">Stop {index + 1} of {walk.stops.length}</span>
                    </div>
                    <h3 className="text-xl font-bold text-charcoal mb-3">{stop.name}</h3>
                    <p className="text-stone leading-relaxed mb-4">{stop.description}</p>
                    <div className="bg-cream-100 rounded-xl p-4 flex gap-3">
                      <Camera className="w-5 h-5 text-london-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-london-600 uppercase tracking-wider mb-1">Insider Tip</div>
                        <p className="text-sm text-stone">{stop.tip}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* PDF Guide CTA — the funnel */}
        <div className="bg-gradient-to-br from-london-600 to-london-800 rounded-2xl p-8 md:p-12 text-white mb-12 shadow-luxury">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <Download className="w-6 h-6 text-yalla-gold-400" />
                <span className="text-yalla-gold-400 font-mono text-xs uppercase tracking-widest">Premium PDF Guide</span>
              </div>
              <h3 className="text-2xl font-display font-bold mb-4">
                Get the Complete {walk.title} Guide
              </h3>
              <p className="text-london-100 mb-6">{walk.pdfTeaser}</p>
              <ul className="space-y-2 text-sm text-london-100 mb-6">
                <li className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-yalla-gold-400" /> Offline map — no internet needed
                </li>
                <li className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-yalla-gold-400" /> Best photography positions marked
                </li>
                <li className="flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-yalla-gold-400" /> Restaurant & café recommendations
                </li>
              </ul>
              <Link
                href="/recommendations"
                className="inline-flex items-center gap-2 px-6 py-3 bg-yalla-gold-500 text-charcoal font-semibold rounded-full hover:bg-yalla-gold-400 transition-colors"
              >
                Download PDF Guide <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation between walks */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          {prevWalk ? (
            <Link href={`/london-by-foot/${prevWalk.slug}`} className="flex-1 group">
              <div className="bg-white rounded-xl p-4 border border-sand/50 hover:shadow-card transition-all">
                <div className="flex items-center gap-2 text-sm text-stone mb-1">
                  <ArrowLeft className="w-4 h-4" /> Previous Walk
                </div>
                <div className="font-bold text-charcoal group-hover:text-london-600 transition-colors">{prevWalk.title}</div>
              </div>
            </Link>
          ) : <div className="flex-1" />}
          {nextWalk ? (
            <Link href={`/london-by-foot/${nextWalk.slug}`} className="flex-1 group text-right">
              <div className="bg-white rounded-xl p-4 border border-sand/50 hover:shadow-card transition-all">
                <div className="flex items-center justify-end gap-2 text-sm text-stone mb-1">
                  Next Walk <ArrowRight className="w-4 h-4" />
                </div>
                <div className="font-bold text-charcoal group-hover:text-london-600 transition-colors">{nextWalk.title}</div>
              </div>
            </Link>
          ) : <div className="flex-1" />}
        </div>
      </div>

      {/* Cross-links for internal SEO */}
      <section className="bg-white border-t border-sand py-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-xl font-display font-bold text-charcoal mb-6">Explore More</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/london-by-foot" className="px-5 py-2.5 bg-cream-100 text-charcoal rounded-full text-sm font-medium hover:bg-cream-200 transition-colors">
              All Walking Guides
            </Link>
            <Link href="/recommendations" className="px-5 py-2.5 bg-cream-100 text-charcoal rounded-full text-sm font-medium hover:bg-cream-200 transition-colors">
              Our Recommendations
            </Link>
            <Link href="/hotels" className="px-5 py-2.5 bg-cream-100 text-charcoal rounded-full text-sm font-medium hover:bg-cream-200 transition-colors">
              Luxury Hotels
            </Link>
            <Link href="/experiences" className="px-5 py-2.5 bg-cream-100 text-charcoal rounded-full text-sm font-medium hover:bg-cream-200 transition-colors">
              London Experiences
            </Link>
            <Link href="/blog" className="px-5 py-2.5 bg-cream-100 text-charcoal rounded-full text-sm font-medium hover:bg-cream-200 transition-colors">
              London Stories
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
