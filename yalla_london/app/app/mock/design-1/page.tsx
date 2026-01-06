'use client'

/**
 * Design 1: Luxury Editorial
 * Inspired by: Condé Nast Traveler, Monocle Magazine, Wallpaper*
 * Clean typography, editorial photography, sophisticated grid layouts
 */

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function LuxuryEditorialDesign() {
  const [activeCategory, setActiveCategory] = useState('all')

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Navigation - Minimal & Elegant */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAFAF8]/95 backdrop-blur-sm border-b border-stone-200">
        <div className="max-w-[1400px] mx-auto px-8 py-5 flex items-center justify-between">
          <Link href="/mock/design-1" className="flex items-center gap-3">
            <span className="text-2xl font-serif tracking-tight text-stone-900">YALLA</span>
            <span className="text-xs tracking-[0.3em] text-stone-500 uppercase">London</span>
          </Link>

          <div className="hidden md:flex items-center gap-10 text-sm tracking-wide">
            <a href="#" className="text-stone-600 hover:text-stone-900 transition">Discover</a>
            <a href="#" className="text-stone-600 hover:text-stone-900 transition">Dining</a>
            <a href="#" className="text-stone-600 hover:text-stone-900 transition">Stay</a>
            <a href="#" className="text-stone-600 hover:text-stone-900 transition">Experience</a>
            <a href="#" className="text-stone-600 hover:text-stone-900 transition">Journal</a>
          </div>

          <div className="flex items-center gap-6">
            <button className="text-sm text-stone-600 hover:text-stone-900">عربي</button>
            <button className="text-sm bg-stone-900 text-white px-5 py-2.5 hover:bg-stone-800 transition">
              Subscribe
            </button>
          </div>
        </div>
      </nav>

      {/* Hero - Editorial Statement */}
      <section className="pt-32 pb-16 px-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-12 gap-8">
            {/* Left Column - Text */}
            <div className="col-span-12 lg:col-span-5 flex flex-col justify-center">
              <span className="text-xs tracking-[0.3em] text-amber-700 uppercase mb-4">Editor's Selection</span>
              <h1 className="text-5xl lg:text-6xl font-serif text-stone-900 leading-[1.1] mb-6">
                The Art of<br />
                <span className="italic">Refined</span> London
              </h1>
              <p className="text-lg text-stone-600 leading-relaxed mb-8 max-w-md">
                Curated experiences for the discerning traveler. Where cultural heritage meets contemporary luxury.
              </p>
              <div className="flex items-center gap-6">
                <button className="bg-stone-900 text-white px-8 py-4 text-sm tracking-wide hover:bg-stone-800 transition">
                  Explore Collection
                </button>
                <button className="text-stone-900 text-sm tracking-wide flex items-center gap-2 group">
                  <span>Watch Film</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Right Column - Featured Image */}
            <div className="col-span-12 lg:col-span-7">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200"
                  alt="London skyline"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/60 to-transparent">
                  <span className="text-white/80 text-xs tracking-widest uppercase">Featured</span>
                  <h2 className="text-white text-2xl font-serif mt-2">The Thames Collection</h2>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter - Magazine Style */}
      <section className="px-8 py-8 border-y border-stone-200">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              {['all', 'dining', 'hotels', 'culture', 'shopping'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-sm tracking-wide pb-1 border-b-2 transition ${
                    activeCategory === cat
                      ? 'text-stone-900 border-amber-600'
                      : 'text-stone-500 border-transparent hover:text-stone-700'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
            <span className="text-xs text-stone-500">48 Curated Experiences</span>
          </div>
        </div>
      </section>

      {/* Editorial Grid */}
      <section className="px-8 py-16">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-12 gap-8">
            {/* Large Feature */}
            <article className="col-span-12 lg:col-span-8 group cursor-pointer">
              <div className="relative aspect-[16/10] overflow-hidden mb-6">
                <Image
                  src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200"
                  alt="Fine dining"
                  fill
                  className="object-cover group-hover:scale-105 transition duration-700"
                />
              </div>
              <div className="flex items-center gap-4 mb-3">
                <span className="text-xs tracking-[0.2em] text-amber-700 uppercase">Gastronomy</span>
                <span className="text-stone-300">•</span>
                <span className="text-xs text-stone-500">12 min read</span>
              </div>
              <h3 className="text-3xl font-serif text-stone-900 mb-3 group-hover:text-amber-800 transition">
                The Definitive Guide to Halal Fine Dining in Mayfair
              </h3>
              <p className="text-stone-600 leading-relaxed max-w-2xl">
                From the gilded halls of Novikov to the contemporary elegance of Zuma, we explore twelve establishments redefining luxury dining for the discerning palate.
              </p>
            </article>

            {/* Side Stack */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
              <article className="group cursor-pointer">
                <div className="relative aspect-[3/2] overflow-hidden mb-4">
                  <Image
                    src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600"
                    alt="Luxury hotel"
                    fill
                    className="object-cover group-hover:scale-105 transition duration-700"
                  />
                </div>
                <span className="text-xs tracking-[0.2em] text-amber-700 uppercase">Hotels</span>
                <h4 className="text-xl font-serif text-stone-900 mt-2 group-hover:text-amber-800 transition">
                  The Dorchester: A Legacy of Arabian Hospitality
                </h4>
              </article>

              <article className="group cursor-pointer">
                <div className="relative aspect-[3/2] overflow-hidden mb-4">
                  <Image
                    src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600"
                    alt="Harrods"
                    fill
                    className="object-cover group-hover:scale-105 transition duration-700"
                  />
                </div>
                <span className="text-xs tracking-[0.2em] text-amber-700 uppercase">Shopping</span>
                <h4 className="text-xl font-serif text-stone-900 mt-2 group-hover:text-amber-800 transition">
                  Inside the Private Shopping Suites of Harrods
                </h4>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* Numbers Section - Editorial Typography */}
      <section className="px-8 py-20 bg-stone-900 text-white">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            <div>
              <span className="text-5xl font-serif text-amber-500">247</span>
              <p className="text-sm text-stone-400 mt-2 tracking-wide">Curated Venues</p>
            </div>
            <div>
              <span className="text-5xl font-serif text-amber-500">15</span>
              <p className="text-sm text-stone-400 mt-2 tracking-wide">Expert Guides</p>
            </div>
            <div>
              <span className="text-5xl font-serif text-amber-500">98%</span>
              <p className="text-sm text-stone-400 mt-2 tracking-wide">Halal Certified</p>
            </div>
            <div>
              <span className="text-5xl font-serif text-amber-500">24/7</span>
              <p className="text-sm text-stone-400 mt-2 tracking-wide">Concierge Service</p>
            </div>
          </div>
        </div>
      </section>

      {/* Three Column Features */}
      <section className="px-8 py-20">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-serif text-stone-900">This Week's Selections</h2>
            <a href="#" className="text-sm text-stone-600 hover:text-stone-900 flex items-center gap-2">
              View All
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600",
                category: "Experience",
                title: "Afternoon Tea at The Ritz: A Complete Guide",
                excerpt: "The quintessential British ritual, perfected for halal requirements."
              },
              {
                image: "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=600",
                category: "Attractions",
                title: "Tower of London: Skip the Queues",
                excerpt: "Insider access to the Crown Jewels and private Beefeater tours."
              },
              {
                image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600",
                category: "Neighbourhood",
                title: "Edgware Road: The Complete Local's Guide",
                excerpt: "From dawn prayers to midnight shisha, the authentic Arab quarter."
              }
            ].map((item, i) => (
              <article key={i} className="group cursor-pointer">
                <div className="relative aspect-[4/3] overflow-hidden mb-6">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition duration-700"
                  />
                </div>
                <span className="text-xs tracking-[0.2em] text-amber-700 uppercase">{item.category}</span>
                <h3 className="text-xl font-serif text-stone-900 mt-2 mb-3 group-hover:text-amber-800 transition">
                  {item.title}
                </h3>
                <p className="text-stone-600 text-sm leading-relaxed">{item.excerpt}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter - Elegant */}
      <section className="px-8 py-20 bg-amber-50">
        <div className="max-w-xl mx-auto text-center">
          <span className="text-xs tracking-[0.3em] text-amber-700 uppercase">The Journal</span>
          <h2 className="text-3xl font-serif text-stone-900 mt-4 mb-4">
            Weekly dispatches from London
          </h2>
          <p className="text-stone-600 mb-8">
            Exclusive openings, private events, and curated recommendations delivered every Thursday.
          </p>
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 px-5 py-4 bg-white border border-stone-200 text-sm focus:outline-none focus:border-amber-600"
            />
            <button className="bg-stone-900 text-white px-8 py-4 text-sm tracking-wide hover:bg-stone-800 transition">
              Subscribe
            </button>
          </div>
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="px-8 py-16 border-t border-stone-200">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-serif text-stone-900">YALLA</span>
              <span className="text-xs tracking-[0.3em] text-stone-500 uppercase">London</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-stone-500">
              <a href="#" className="hover:text-stone-900">About</a>
              <a href="#" className="hover:text-stone-900">Contact</a>
              <a href="#" className="hover:text-stone-900">Advertise</a>
              <a href="#" className="hover:text-stone-900">Privacy</a>
            </div>
            <p className="text-sm text-stone-400">© 2025 Yalla London. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Back to designs link */}
      <div className="fixed bottom-8 right-8 flex gap-3">
        <Link href="/mock/design-2" className="bg-white shadow-lg px-4 py-2 text-sm hover:bg-stone-50">
          View Design 2 →
        </Link>
        <Link href="/mock/design-3" className="bg-white shadow-lg px-4 py-2 text-sm hover:bg-stone-50">
          View Design 3 →
        </Link>
      </div>
    </div>
  )
}
