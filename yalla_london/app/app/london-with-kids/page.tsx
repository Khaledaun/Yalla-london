import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { PhotoCredits } from '@/components/photo-credits'
import { Baby, MapPin, Star, ArrowRight, Ticket, TreePine, Castle } from 'lucide-react'
import { getDefaultSiteId, getSiteConfig } from '@/config/sites'
import { getBaseUrl } from '@/lib/url-utils'
import { TriBar, BrandButton, BrandCardLight, SectionLabel, Breadcrumbs } from '@/components/brand-kit'
import { StructuredData } from '@/components/structured-data'

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await getBaseUrl();
  const siteConfig = getSiteConfig(getDefaultSiteId());
  const siteName = siteConfig?.name || 'Yalla London';
  const canonicalUrl = `${baseUrl}/london-with-kids`;

  return {
    title: `London with Kids 2026 — Family Activities & Attractions Guide | ${siteName}`,
    description: 'The complete guide to visiting London with children: best family attractions, kid-friendly restaurants, parks, museums, and practical tips for travelling with kids in London.',
    keywords: ['london with kids', 'family activities london', 'things to do in london with children', 'kid friendly london', 'family attractions london', 'london family holiday', 'children london guide'],
    openGraph: {
      title: 'London with Kids 2026 — Family Activities & Attractions Guide',
      description: 'From the Natural History Museum to Harry Potter studios — everything you need for a perfect London family holiday.',
      url: canonicalUrl,
      type: 'website',
      locale: 'en_GB',
      alternateLocale: 'ar_SA',
      siteName,
    },
    twitter: {
      card: 'summary_large_image',
      title: `London with Kids | ${siteName}`,
      description: 'The complete family guide to London — attractions, restaurants, parks, and practical tips.',
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en-GB': canonicalUrl,
        'ar-SA': `${baseUrl}/ar/london-with-kids`,
        'x-default': canonicalUrl,
      },
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' as const, 'max-snippet': -1 } },
  }
}

const CATEGORIES = [
  {
    name: 'Free Museums & Galleries',
    slug: 'museums',
    icon: Castle,
    description: 'London has more free museums than any other city in the world. The Natural History Museum, Science Museum, and V&A are all completely free — and designed with children in mind.',
    attractions: [
      { name: 'Natural History Museum', age: 'All ages', highlight: 'Dinosaur gallery with life-size animatronic T-Rex', free: true },
      { name: 'Science Museum', age: 'Ages 3+', highlight: 'Interactive Wonderlab with 50+ hands-on experiments', free: true },
      { name: 'V&A Museum of Childhood', age: 'Ages 0-12', highlight: 'Dedicated children\'s museum in Bethnal Green', free: true },
      { name: 'British Museum', age: 'Ages 5+', highlight: 'Egyptian mummies and Greek Parthenon sculptures', free: true },
    ],
  },
  {
    name: 'Theme Parks & Attractions',
    slug: 'attractions',
    icon: Ticket,
    description: 'From the Harry Potter studio tour to the London Eye — London\'s paid attractions are world-class. Book online in advance to save 10-20% and skip queues.',
    attractions: [
      { name: 'Warner Bros. Studio Tour', age: 'Ages 5+', highlight: 'Walk through actual Harry Potter film sets', free: false },
      { name: 'London Eye', age: 'All ages', highlight: '30-minute rotation with Thames panoramic views', free: false },
      { name: 'Tower of London', age: 'Ages 6+', highlight: 'Crown Jewels and 1,000 years of history', free: false },
      { name: 'SEA LIFE London Aquarium', age: 'Ages 2+', highlight: 'Shark walk, penguin colony, and touch pools', free: false },
    ],
  },
  {
    name: 'Parks & Outdoor Spaces',
    slug: 'parks',
    icon: TreePine,
    description: 'London\'s Royal Parks are exceptional for families. Hyde Park alone has a dedicated Diana Memorial Playground, the Serpentine Lake, and miles of cycling paths — all free.',
    attractions: [
      { name: 'Hyde Park & Diana Playground', age: 'Ages 2-12', highlight: 'Peter Pan-themed playground with pirate ship', free: true },
      { name: 'Regent\'s Park & London Zoo', age: 'All ages', highlight: 'Boating lake, playgrounds, and world-class zoo', free: false },
      { name: 'Greenwich Park & Royal Observatory', age: 'Ages 5+', highlight: 'Stand on the Prime Meridian line', free: true },
      { name: 'Holland Park Adventure Playground', age: 'Ages 2-14', highlight: 'Zip lines, climbing walls, and rope bridges', free: true },
    ],
  },
  {
    name: 'Family-Friendly Shows',
    slug: 'shows',
    icon: Star,
    description: 'The West End has dedicated family shows year-round. Book matinee performances (2pm) for younger children — they\'re shorter and the atmosphere is more relaxed.',
    attractions: [
      { name: 'The Lion King (Lyceum)', age: 'Ages 6+', highlight: 'Running since 1999 — a London institution', free: false },
      { name: 'Wicked (Apollo Victoria)', age: 'Ages 7+', highlight: 'Spectacular special effects and music', free: false },
      { name: 'Matilda the Musical', age: 'Ages 5+', highlight: 'Roald Dahl adaptation with incredible staging', free: false },
      { name: 'Horrible Histories Live', age: 'Ages 5+', highlight: 'Educational comedy — kids learn without knowing it', free: false },
    ],
  },
];

const PRACTICAL_TIPS = [
  { title: 'Oyster Card for Kids', detail: 'Children under 11 travel FREE on all London transport with a paying adult. Ages 11-15 get free Zip Oyster cards (apply online 4 weeks before).' },
  { title: 'Buggy-Friendly Transport', detail: 'All London buses are step-free. Most Tube stations on the Jubilee line have step-free access. The DLR is fully accessible. Download the TfL Go app for step-free route planning.' },
  { title: 'Halal Kids Meals', detail: 'Dishoom (King\'s Cross), Le Bab, and The Real Greek all offer halal kids\' menus. Most Edgware Road restaurants welcome families.' },
  { title: 'Rainy Day Plan', detail: 'London averages 11 rainy days per month. Keep the Natural History Museum, Science Museum, and KidZania as backup indoor options.' },
  { title: 'Best Family Hotels', detail: 'The Langham (Marylebone) offers Kids VIP packs. Corinthia has a dedicated family floor. Premier Inn Hub works for budget family stays.' },
  { title: 'Medical & Emergencies', detail: 'NHS 111 for non-emergency medical advice (free). UCH (Euston) and St Thomas\' (Waterloo) have excellent A&E departments.' },
];

export default async function LondonWithKidsPage() {
  let relatedPosts: Array<{ slug: string; title_en: string; meta_description_en: string; created_at: Date; featured_image_url: string | null }> = [];
  try {
    const { prisma } = await import('@/lib/db');
    relatedPosts = await prisma.blogPost.findMany({
      where: {
        published: true,
        siteId: getDefaultSiteId(),
        OR: [
          { title_en: { contains: 'kids', mode: 'insensitive' } },
          { title_en: { contains: 'family', mode: 'insensitive' } },
          { title_en: { contains: 'children', mode: 'insensitive' } },
          { title_en: { contains: 'park', mode: 'insensitive' } },
          { category: { name: { in: ['Family', 'Kids', 'Parks', 'Attractions'] } } },
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
      <StructuredData type="breadcrumb" data={{ items: [{ name: 'Home', url: baseUrl }, { name: 'London with Kids', url: `${baseUrl}/london-with-kids` }] }} siteId={siteId} />
      <StructuredData type="itemList" data={{ name: 'Family Activity Categories in London', items: CATEGORIES.map((c, i) => ({ position: i + 1, name: c.name, url: `${baseUrl}/london-with-kids#${c.slug}` })) }} siteId={siteId} />

      {/* Hero */}
      <section className="relative bg-yl-dark-navy text-white overflow-hidden pt-28 pb-16">
        <div className="absolute inset-0 opacity-30">
          <Image src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&q=80" alt="Family visiting London" fill className="object-cover" priority />
        </div>
        <div className="relative max-w-6xl mx-auto px-6">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'London with Kids' }]} />
          <div className="mt-8">
            <SectionLabel>FAMILY GUIDE</SectionLabel>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mt-4 leading-tight">
              London with Kids<br />2026 Family Guide
            </h1>
            <p className="text-lg md:text-xl text-white/80 mt-6 max-w-2xl">
              Museums, parks, shows, and practical tips — everything you need to plan the perfect London family holiday, including halal dining and prayer facility locations.
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
            <li className="flex gap-2"><span className="text-yl-gold font-bold">•</span> <strong>Under-11s ride all London transport FREE</strong> with a paying adult — unlimited buses, Tube, DLR</li>
            <li className="flex gap-2"><span className="text-yl-gold font-bold">•</span> London has <strong>4 world-class free museums</strong> perfect for kids: Natural History, Science, V&A, British Museum</li>
            <li className="flex gap-2"><span className="text-yl-gold font-bold">•</span> Budget <strong>£150-250/day</strong> for a family of 4 (2 paid attractions + meals + transport)</li>
            <li className="flex gap-2"><span className="text-yl-gold font-bold">•</span> Book Warner Bros. Studio Tour <strong>3+ months ahead</strong> — it sells out every season</li>
            <li className="flex gap-2"><span className="text-yl-gold font-bold">•</span> Best family neighbourhoods: <strong>South Kensington</strong> (museums), <strong>Greenwich</strong> (parks), <strong>Marylebone</strong> (calm + family hotels)</li>
          </ul>
        </div>
      </section>

      {/* Category Sections */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="space-y-16">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <article key={category.slug} id={category.slug} className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <Icon className="w-7 h-7 text-yl-red" />
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-yl-dark-navy">{category.name}</h2>
                </div>
                <p className="text-yl-charcoal max-w-3xl leading-relaxed mb-6">{category.description}</p>
                <div className="grid md:grid-cols-2 gap-4">
                  {category.attractions.map((attraction) => (
                    <div key={attraction.name}>
                    <BrandCardLight className="p-5">
                      <div className="flex items-start justify-between">
                        <h3 className="font-display font-semibold text-yl-dark-navy">{attraction.name}</h3>
                        {attraction.free && (
                          <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">FREE</span>
                        )}
                      </div>
                      <p className="text-xs text-yl-charcoal/60 mt-1">{attraction.age}</p>
                      <p className="text-sm text-yl-charcoal mt-2">{attraction.highlight}</p>
                      {!attraction.free && (
                        <a
                          href={`/api/affiliate/click?url=${encodeURIComponent(`https://www.tiqets.com/en/search?q=${encodeURIComponent(attraction.name + ' London')}`)}&partner=tiqets&article=london-with-kids`}
                          target="_blank"
                          rel="noopener sponsored"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-yl-red mt-3 hover:underline"
                        >
                          Get Tickets <ArrowRight className="w-3 h-3" />
                        </a>
                      )}
                    </BrandCardLight>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Book Attractions CTA */}
      <section className="bg-yl-dark-navy text-white py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-display font-bold mb-3">Book Family Tickets in Advance</h2>
          <p className="text-white/70 mb-8 max-w-2xl mx-auto">Skip the queues and save 10-20% by booking London attraction tickets online before you arrive.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/api/affiliate/click?url=https%3A%2F%2Fwww.tiqets.com%2Fen%2Flondon-attractions-c81338&partner=tiqets&article=london-with-kids"
              target="_blank"
              rel="noopener sponsored"
              className="inline-flex items-center justify-center gap-2 bg-yl-gold text-yl-dark-navy font-semibold px-8 py-3.5 rounded-lg hover:bg-yl-gold/90 transition-colors"
            >
              <Ticket className="w-5 h-5" /> Browse Attractions on Tiqets
            </a>
            <a
              href="/api/affiliate/click?url=https%3A%2F%2Fwww.expedia.com%2FLondon-Hotels.d178279.Travel-Guide-Hotels&partner=expedia&article=london-with-kids"
              target="_blank"
              rel="noopener sponsored"
              className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-semibold px-8 py-3.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              Family Hotels on Expedia
            </a>
          </div>
          <p className="text-xs text-white/40 mt-4">Affiliate disclosure: We earn a commission when you book through our links at no extra cost to you.</p>
        </div>
      </section>

      {/* Practical Tips */}
      <section className="bg-yl-dark-navy/5 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-yl-dark-navy mb-8">
            <Baby className="inline w-6 h-6 text-yl-red mr-2" />
            Practical Tips for Families
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PRACTICAL_TIPS.map((tip) => (
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
              Our Family Guides
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
            <p className="text-sm text-yl-charcoal/60 mt-1">700+ halal-certified restaurants with kid-friendly options</p>
          </Link>
          <Link href="/luxury-hotels-london" className="group bg-white rounded-lg border border-yl-sand/50 p-5 hover:shadow-md transition-shadow">
            <h3 className="font-display font-semibold text-yl-dark-navy group-hover:text-yl-red transition-colors">Luxury Hotels London</h3>
            <p className="text-sm text-yl-charcoal/60 mt-1">Family suites and connecting rooms at 5-star hotels</p>
          </Link>
          <Link href="/experiences" className="group bg-white rounded-lg border border-yl-sand/50 p-5 hover:shadow-md transition-shadow">
            <h3 className="font-display font-semibold text-yl-dark-navy group-hover:text-yl-red transition-colors">London Experiences</h3>
            <p className="text-sm text-yl-charcoal/60 mt-1">Tours, attractions, and bookable experiences</p>
          </Link>
        </div>
      </section>
      <PhotoCredits photographers={[
        { name: 'Benjamin Davies', username: 'bendavisual' },
        { name: 'Aron Van de Pol', username: 'aronvandepol' },
      ]} className="text-yl-charcoal/30" />
    </div>
  )
}
