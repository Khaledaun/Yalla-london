'use client';

import ScrollExpandHero from '@/components/home/scroll-expand-hero';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, ArrowRight, Star } from 'lucide-react';

// High-quality 4K London images from Unsplash
const LONDON_MEDIA = {
  // Tower Bridge at dusk - stunning 4K
  towerBridge: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=3840&q=90',
  // Big Ben / Elizabeth Tower - iconic 4K
  bigBen: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=3840&q=90',
  // London Eye at night - atmospheric 4K
  londonEye: 'https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=3840&q=90',
  // The Shard - modern London 4K
  theShard: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=3840&q=90',
  // Thames River panorama - wide 4K
  thames: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=3840&q=90',
  // St Paul's Cathedral - classic 4K
  stPauls: 'https://images.unsplash.com/photo-1520986606214-8b456906c813?w=3840&q=90',
  // Buckingham Palace - royal 4K
  buckingham: 'https://images.unsplash.com/photo-1587385789097-0197a7fbd179?w=3840&q=90',
  // Borough Market - vibrant 4K
  boroughMarket: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=3840&q=90',
};

// YouTube 4K London aerial video
const LONDON_VIDEO = 'https://www.youtube.com/embed/vD3wmPGrpHo'; // London 4K aerial

const featuredArticles = [
  {
    id: 1,
    title: "London's Hidden Rooftop Gardens",
    excerpt: "Discover secret green spaces above the city's bustling streets, from ancient churchyards to modern sky gardens.",
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80',
    category: 'Lifestyle',
    date: 'January 15, 2026',
    location: 'Central London',
  },
  {
    id: 2,
    title: 'The Art of Afternoon Tea',
    excerpt: 'A curated guide to the finest afternoon tea experiences in London, from traditional to contemporary.',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80',
    category: 'Food & Drink',
    date: 'January 12, 2026',
    location: 'Mayfair',
  },
  {
    id: 3,
    title: "Spring Exhibition Season Preview",
    excerpt: "What's coming to London's galleries this spring, featuring exclusive previews and curator insights.",
    image: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80',
    category: 'Culture',
    date: 'January 10, 2026',
    location: 'South Kensington',
  },
];

const experiences = [
  {
    title: 'Private Thames Cruise',
    rating: 4.9,
    price: 'From £180',
    image: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=600&q=80',
  },
  {
    title: 'Michelin Dining Experience',
    rating: 4.8,
    price: 'From £250',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
  },
  {
    title: 'West End Theatre Package',
    rating: 4.9,
    price: 'From £150',
    image: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=600&q=80',
  },
  {
    title: 'Royal Palace Tour',
    rating: 4.7,
    price: 'From £95',
    image: 'https://images.unsplash.com/photo-1587385789097-0197a7fbd179?w=600&q=80',
  },
];

export default function DemoHeroPage() {
  return (
    <main className="bg-cream-50">
      <ScrollExpandHero
        mediaType="image"
        mediaSrc={LONDON_MEDIA.towerBridge}
        bgImageSrc={LONDON_MEDIA.thames}
        title="Discover London"
        subtitle="Your guide to the extraordinary"
        scrollHint="Scroll to explore"
      >
        {/* Content revealed after hero expansion */}
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="text-gold-500 font-medium tracking-widest uppercase text-sm">
              Curated for You
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-burgundy-800 mt-3 mb-4">
              Latest Stories
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-gold-400 to-gold-600 mx-auto rounded-full" />
          </div>

          {/* Featured Articles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {featuredArticles.map((article) => (
              <article
                key={article.id}
                className="group bg-white rounded-card overflow-hidden shadow-card hover:shadow-elegant transition-all duration-300 hover:-translate-y-2"
              >
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={article.image}
                    alt={article.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-burgundy-800 text-cream-50 px-3 py-1 rounded-full text-xs font-medium tracking-wide">
                      {article.category}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-4 text-sm text-warm-gray mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gold-500" />
                      {article.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-gold-500" />
                      {article.location}
                    </span>
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-burgundy-800 mb-2 group-hover:text-burgundy-600 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-warm-gray text-sm leading-relaxed mb-4">
                    {article.excerpt}
                  </p>
                  <Link
                    href="#"
                    className="inline-flex items-center gap-2 text-burgundy-700 font-medium text-sm hover:text-burgundy-500 transition-colors"
                  >
                    Read More
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {/* Experiences Section */}
          <div className="bg-burgundy-900 rounded-2xl p-8 md:p-12 mb-20">
            <div className="text-center mb-12">
              <span className="text-gold-400 font-medium tracking-widest uppercase text-sm">
                Exclusive Access
              </span>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-cream-50 mt-3 mb-4">
                Curated Experiences
              </h2>
              <p className="text-cream-200 max-w-2xl mx-auto">
                Handpicked experiences that showcase the very best of London,
                from intimate dining to private tours.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {experiences.map((exp, index) => (
                <div
                  key={index}
                  className="group relative rounded-xl overflow-hidden cursor-pointer"
                >
                  <div className="aspect-[4/5] relative">
                    <Image
                      src={exp.image}
                      alt={exp.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-burgundy-900/90 via-burgundy-900/40 to-transparent" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="w-4 h-4 text-gold-400 fill-gold-400" />
                      <span className="text-gold-400 text-sm font-medium">
                        {exp.rating}
                      </span>
                    </div>
                    <h3 className="text-lg font-serif font-semibold text-cream-50 mb-1">
                      {exp.title}
                    </h3>
                    <p className="text-gold-300 text-sm">{exp.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Newsletter Section */}
          <div className="text-center py-16 border-t border-gold-200">
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-burgundy-800 mb-4">
              Stay Inspired
            </h3>
            <p className="text-warm-gray max-w-xl mx-auto mb-8">
              Subscribe to receive curated stories, exclusive offers, and insider
              guides to London's finest experiences.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 px-5 py-3 rounded-lg border border-gold-300 focus:border-burgundy-500 focus:ring-2 focus:ring-burgundy-200 outline-none transition-all"
              />
              <button className="bg-burgundy-800 hover:bg-burgundy-700 text-cream-50 px-8 py-3 rounded-lg font-medium transition-colors shadow-luxury">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </ScrollExpandHero>
    </main>
  );
}
