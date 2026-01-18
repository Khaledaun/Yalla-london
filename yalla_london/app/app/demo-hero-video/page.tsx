'use client';

import ScrollExpandHero from '@/components/home/scroll-expand-hero';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, ArrowRight, Sparkles, Crown, Utensils, Palette } from 'lucide-react';

// High-quality 4K London images
const LONDON_MEDIA = {
  bigBen: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=3840&q=90',
  londonSkyline: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=3840&q=90',
};

// Beautiful 4K London cinematic video (aerial footage)
const LONDON_VIDEO = 'https://www.youtube.com/watch?v=Pb94PvCX-hE';

const categories = [
  {
    icon: Crown,
    title: 'Luxury Living',
    description: 'Exclusive properties and lifestyle experiences',
    count: 42,
  },
  {
    icon: Utensils,
    title: 'Fine Dining',
    description: 'Michelin stars and hidden culinary gems',
    count: 67,
  },
  {
    icon: Palette,
    title: 'Art & Culture',
    description: 'Galleries, exhibitions, and creative spaces',
    count: 89,
  },
  {
    icon: Sparkles,
    title: 'Events',
    description: 'Galas, launches, and exclusive gatherings',
    count: 31,
  },
];

const highlights = [
  {
    title: 'The Savoy Reopens Its Legendary American Bar',
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80',
    category: 'Nightlife',
    featured: true,
  },
  {
    title: 'Frieze London 2026: What to Expect',
    image: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=800&q=80',
    category: 'Art',
    featured: false,
  },
  {
    title: "Harrods' New Wellness Floor",
    image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800&q=80',
    category: 'Lifestyle',
    featured: false,
  },
  {
    title: 'Secret Gardens of Belgravia',
    image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=80',
    category: 'Explore',
    featured: false,
  },
];

export default function DemoHeroVideoPage() {
  return (
    <main className="bg-cream-50">
      <ScrollExpandHero
        mediaType="video"
        mediaSrc={LONDON_VIDEO}
        bgImageSrc={LONDON_MEDIA.londonSkyline}
        title="Experience London"
        subtitle="Where tradition meets sophistication"
        scrollHint="Begin your journey"
      >
        <div className="max-w-7xl mx-auto">
          {/* Categories Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {categories.map((cat, index) => (
              <div
                key={index}
                className="group bg-white p-6 rounded-card shadow-card hover:shadow-elegant transition-all duration-300 cursor-pointer border border-transparent hover:border-gold-300"
              >
                <div className="w-12 h-12 rounded-full bg-burgundy-100 flex items-center justify-center mb-4 group-hover:bg-burgundy-800 transition-colors">
                  <cat.icon className="w-6 h-6 text-burgundy-700 group-hover:text-gold-400 transition-colors" />
                </div>
                <h3 className="text-lg font-serif font-semibold text-burgundy-800 mb-2">
                  {cat.title}
                </h3>
                <p className="text-warm-gray text-sm mb-3">{cat.description}</p>
                <span className="text-gold-600 text-sm font-medium">
                  {cat.count} articles
                </span>
              </div>
            ))}
          </div>

          {/* Featured Content */}
          <div className="mb-20">
            <div className="flex items-center justify-between mb-10">
              <div>
                <span className="text-gold-500 font-medium tracking-widest uppercase text-sm">
                  Editor's Picks
                </span>
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-burgundy-800 mt-2">
                  This Week's Highlights
                </h2>
              </div>
              <Link
                href="#"
                className="hidden md:flex items-center gap-2 text-burgundy-700 hover:text-burgundy-500 font-medium transition-colors"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Featured Large Card */}
              <div className="group relative rounded-2xl overflow-hidden cursor-pointer lg:row-span-2">
                <div className="aspect-[4/5] lg:aspect-auto lg:h-full relative">
                  <Image
                    src={highlights[0].image}
                    alt={highlights[0].title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-burgundy-900/90 via-burgundy-900/30 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <span className="inline-block bg-gold-500 text-burgundy-900 px-3 py-1 rounded-full text-xs font-bold tracking-wide mb-4">
                    FEATURED
                  </span>
                  <h3 className="text-2xl md:text-3xl font-serif font-bold text-cream-50 mb-3 group-hover:text-gold-300 transition-colors">
                    {highlights[0].title}
                  </h3>
                  <span className="text-gold-400 text-sm">{highlights[0].category}</span>
                </div>
              </div>

              {/* Smaller Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                {highlights.slice(1).map((item, index) => (
                  <div
                    key={index}
                    className="group flex gap-4 bg-white p-4 rounded-xl shadow-card hover:shadow-elegant transition-all cursor-pointer"
                  >
                    <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="text-gold-600 text-xs font-medium tracking-wide uppercase mb-1">
                        {item.category}
                      </span>
                      <h4 className="font-serif font-semibold text-burgundy-800 group-hover:text-burgundy-600 transition-colors line-clamp-2">
                        {item.title}
                      </h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="relative rounded-2xl overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1520986606214-8b456906c813?w=1920&q=80"
              alt="St Paul's Cathedral"
              width={1920}
              height={600}
              className="w-full h-64 md:h-80 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-burgundy-900/95 via-burgundy-900/80 to-burgundy-900/60" />
            <div className="absolute inset-0 flex items-center">
              <div className="px-8 md:px-12 max-w-2xl">
                <h3 className="text-2xl md:text-4xl font-serif font-bold text-cream-50 mb-4">
                  Become a Yalla London Insider
                </h3>
                <p className="text-cream-200 mb-6">
                  Get early access to exclusive events, private sales, and curated
                  experiences available only to our community.
                </p>
                <button className="bg-gold-500 hover:bg-gold-400 text-burgundy-900 px-8 py-3 rounded-lg font-semibold transition-colors shadow-lg">
                  Join the Community
                </button>
              </div>
            </div>
          </div>
        </div>
      </ScrollExpandHero>
    </main>
  );
}
