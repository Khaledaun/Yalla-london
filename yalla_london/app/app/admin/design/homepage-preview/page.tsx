"use client";

/**
 * Homepage Design Preview — 3 Premium Variants
 *
 * Shows Khaled what Yalla London's homepage could look like in
 * 3 distinct premium design languages, each using the same content
 * data but with different typography, spacing, and layout philosophy.
 *
 * Variants:
 * 1. APPLE — Premium white space, cinematic imagery, SF Pro-inspired clean type
 * 2. BMW — Dark premium surfaces, precise engineering aesthetic, bold contrasts
 * 3. EDITORIAL — Magazine editorial style, serif typography, parchment warmth
 */

import React, { useState } from "react";
import Image from "next/image";
import { ArrowRight, Star, MapPin, ChevronRight } from "lucide-react";

// ─── Shared content data ────────────────────────────────────────────────────

const HERO = {
  title: "Experience London",
  subtitle: "Your Way",
  description: "Curated luxury experiences, halal dining, and insider secrets for the discerning traveller.",
};

const ARTICLES = [
  { title: "Best Halal Restaurants in Central London", category: "Dining", image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80", time: "5 min read" },
  { title: "Spring in London 2026: The Complete Guide", category: "Travel", image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80", time: "8 min read" },
  { title: "Harrods vs Selfridges: The Definitive Comparison", category: "Shopping", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80", time: "6 min read" },
];

const HOTELS = [
  { name: "The Dorchester", area: "Mayfair", stars: 5, price: "From \u00A3650/night", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80" },
  { name: "The Ritz London", area: "Piccadilly", stars: 5, price: "From \u00A3750/night", image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80" },
  { name: "Claridge\u2019s", area: "Mayfair", stars: 5, price: "From \u00A3580/night", image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80" },
];

// ─── VARIANT 1: APPLE ──────────────────────────────────────────────────────
// Premium white space. Let the images speak. Ultra-clean, breathable.

function AppleVariant() {
  return (
    <div className="bg-white min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <span className="text-lg font-semibold tracking-tight text-gray-900">Yalla London</span>
        <div className="flex gap-6 text-sm text-gray-500">
          <span>Explore</span><span>Hotels</span><span>Dining</span><span>Events</span>
        </div>
      </nav>

      {/* Hero — full bleed image, centered type, massive whitespace */}
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
        <Image src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&q=90" alt="London" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
          <h1 className="text-4xl md:text-6xl font-semibold text-white tracking-tight leading-[1.1]">
            {HERO.title}.<br /><span className="text-white/70">{HERO.subtitle}.</span>
          </h1>
          <p className="text-white/60 text-lg mt-4 max-w-lg">{HERO.description}</p>
          <button className="mt-6 bg-white text-black px-6 py-3 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors inline-flex items-center gap-2">
            Start Exploring <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Articles — clean grid, massive images, minimal text */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">Latest Stories</h2>
        <p className="text-gray-500 mt-2 text-lg">Curated guides and insider knowledge.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          {ARTICLES.map((a, i) => (
            <div key={i} className="group cursor-pointer">
              <div className="aspect-[4/3] relative rounded-2xl overflow-hidden">
                <Image src={a.image} alt={a.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="mt-4">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{a.category}</span>
                <h3 className="text-lg font-semibold text-gray-900 mt-1 group-hover:text-blue-600 transition-colors">{a.title}</h3>
                <span className="text-sm text-gray-400 mt-1">{a.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Hotels — horizontal cards */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">Where to Stay</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            {HOTELS.map((h, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
                <div className="aspect-[16/10] relative">
                  <Image src={h.image} alt={h.name} fill className="object-cover" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(h.stars)].map((_, s) => <Star key={s} className="w-3 h-3 fill-current" />)}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mt-1">{h.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{h.area}</p>
                  <p className="text-sm font-medium text-gray-900 mt-3">{h.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center px-6">
        <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">Ready to explore London?</h2>
        <p className="text-gray-500 mt-2 text-lg max-w-md mx-auto">Join thousands of travellers who trust Yalla London for their journey.</p>
        <button className="mt-8 bg-black text-white px-8 py-3.5 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
          Browse All Guides
        </button>
      </section>
    </div>
  );
}

// ─── VARIANT 2: BMW ─────────────────────────────────────────────────────────
// Dark premium. Precise. Engineering-grade. Bold contrasts.

function BmwVariant() {
  return (
    <div className="bg-[#0A0A0A] min-h-screen text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <span className="text-lg font-bold tracking-[0.15em] uppercase text-white">Yalla London</span>
        <div className="flex gap-6 text-[11px] uppercase tracking-[0.2em] text-white/50 font-medium">
          <span>Explore</span><span>Hotels</span><span>Dining</span><span>Events</span>
        </div>
      </nav>

      {/* Hero — cinematic, dark gradient, sharp type */}
      <section className="relative h-[75vh] min-h-[520px] overflow-hidden">
        <Image src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1600&q=90" alt="London" fill className="object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 p-8 md:p-16 max-w-2xl">
          <div className="w-16 h-0.5 bg-[#C49A2A] mb-6" />
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.05] tracking-tight">
            {HERO.title}
          </h1>
          <p className="text-white/40 text-lg mt-4 font-light">{HERO.description}</p>
          <button className="mt-8 border border-white/30 text-white px-8 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all duration-300">
            Discover More
          </button>
        </div>
      </section>

      {/* Articles — dark cards, gold accents */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-0.5 bg-[#C49A2A]" />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">Latest Stories</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ARTICLES.map((a, i) => (
            <div key={i} className="group cursor-pointer bg-[#141414] rounded-lg overflow-hidden border border-white/5 hover:border-[#C49A2A]/30 transition-colors">
              <div className="aspect-[16/10] relative overflow-hidden">
                <Image src={a.image} alt={a.title} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="p-5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C49A2A]">{a.category}</span>
                <h3 className="text-base font-semibold text-white mt-2 leading-snug">{a.title}</h3>
                <div className="flex items-center justify-between mt-4 text-[11px] text-white/30">
                  <span>{a.time}</span>
                  <ChevronRight className="w-4 h-4 group-hover:text-[#C49A2A] transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Hotels — horizontal dark */}
      <section className="border-t border-white/5 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-0.5 bg-[#C49A2A]" />
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">Luxury Hotels</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOTELS.map((h, i) => (
              <div key={i} className="bg-[#141414] border border-white/5 rounded-lg overflow-hidden hover:border-[#C49A2A]/20 transition-colors">
                <div className="aspect-[16/10] relative">
                  <Image src={h.image} alt={h.name} fill className="object-cover" />
                </div>
                <div className="p-5">
                  <h3 className="text-base font-semibold text-white">{h.name}</h3>
                  <p className="text-[11px] text-white/30 uppercase tracking-wider mt-1">{h.area}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[#C49A2A] text-sm font-medium">{h.price}</span>
                    <div className="flex gap-0.5">
                      {[...Array(h.stars)].map((_, s) => <Star key={s} className="w-2.5 h-2.5 fill-[#C49A2A] text-[#C49A2A]" />)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center px-6 border-t border-white/5">
        <div className="w-16 h-0.5 bg-[#C49A2A] mx-auto mb-8" />
        <h2 className="text-3xl font-bold text-white tracking-tight">Your London Awaits</h2>
        <p className="text-white/30 mt-3 max-w-md mx-auto font-light">Precision-curated travel intelligence for the discerning traveller.</p>
        <button className="mt-8 bg-[#C49A2A] text-black px-8 py-3 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#D4AA3A] transition-colors">
          Explore All Guides
        </button>
      </section>
    </div>
  );
}

// ─── VARIANT 3: EDITORIAL ───────────────────────────────────────────────────
// Magazine editorial. Warm parchment. Serif authority. Gold accents.
// This is closest to the current Yalla London DESIGN.md brand.

function EditorialVariant() {
  return (
    <div className="bg-[#FAF8F4] min-h-screen">
      {/* Nav — editorial masthead */}
      <nav className="border-b border-[#D6D0C4]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#C8322B] flex items-center justify-center text-white text-xs font-bold">YL</div>
            <span className="text-xl font-bold text-[#1C1917]" style={{ fontFamily: "var(--font-display, serif)" }}>Yalla London</span>
          </div>
          <div className="hidden md:flex gap-6 text-sm text-[#5C564F]" style={{ fontFamily: "var(--font-body, serif)" }}>
            <span>Explore</span><span>Hotels</span><span>Dining</span><span>Events</span>
          </div>
        </div>
        {/* Tri-color bar */}
        <div className="h-[3px] flex">
          <div className="flex-1 bg-[#C8322B]" />
          <div className="flex-1 bg-[#C49A2A]" />
          <div className="flex-1 bg-[#3B7EA1]" />
        </div>
      </nav>

      {/* Hero — editorial split: text left, image right */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C49A2A]">
              The Definitive London Guide
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-[#1C1917] leading-[1.15] mt-4" style={{ fontFamily: "var(--font-display, serif)" }}>
              {HERO.title},<br />{HERO.subtitle}
            </h1>
            <div className="w-16 h-0.5 bg-[#C49A2A] mt-6" />
            <p className="text-lg text-[#5C564F] mt-6 leading-relaxed" style={{ fontFamily: "var(--font-body, serif)" }}>
              {HERO.description}
            </p>
            <button className="mt-8 bg-[#C8322B] text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-[#B02B25] transition-colors inline-flex items-center gap-2 active:scale-[0.97]">
              Start Exploring <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="aspect-[4/5] relative rounded-2xl overflow-hidden shadow-xl">
            <Image src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=90" alt="London" fill className="object-cover" />
            {/* LDN stamp watermark */}
            <div className="absolute bottom-4 right-4 w-16 h-16 rounded-full border-2 border-white/30 flex items-center justify-center rotate-[-12deg]">
              <span className="text-white/50 text-[10px] font-bold tracking-wider">LDN</span>
            </div>
          </div>
        </div>
      </section>

      {/* Articles — editorial grid with featured + sidebar */}
      <section className="bg-white border-t border-b border-[#D6D0C4] py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-0.5 bg-[#C49A2A]" />
            <h2 className="text-2xl font-bold text-[#1C1917]" style={{ fontFamily: "var(--font-display, serif)" }}>Latest Stories</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Featured large */}
            <div className="md:col-span-7 group cursor-pointer">
              <div className="aspect-[16/10] relative rounded-xl overflow-hidden">
                <Image src={ARTICLES[0].image} alt={ARTICLES[0].title} fill className="object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#C49A2A]">{ARTICLES[0].category}</span>
                  <h3 className="text-xl font-bold text-white mt-1" style={{ fontFamily: "var(--font-display, serif)" }}>{ARTICLES[0].title}</h3>
                </div>
              </div>
            </div>
            {/* Sidebar articles */}
            <div className="md:col-span-5 flex flex-col gap-6">
              {ARTICLES.slice(1).map((a, i) => (
                <div key={i} className="flex gap-4 group cursor-pointer">
                  <div className="w-28 h-20 relative rounded-lg overflow-hidden flex-shrink-0">
                    <Image src={a.image} alt={a.title} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#C49A2A]">{a.category}</span>
                    <h3 className="text-sm font-semibold text-[#1C1917] mt-0.5 leading-snug group-hover:text-[#C8322B] transition-colors" style={{ fontFamily: "var(--font-display, serif)" }}>{a.title}</h3>
                    <span className="text-[11px] text-[#A09A8E] mt-1 block">{a.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Hotels — warm cards */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-0.5 bg-[#C49A2A]" />
            <h2 className="text-2xl font-bold text-[#1C1917]" style={{ fontFamily: "var(--font-display, serif)" }}>Luxury Hotels</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOTELS.map((h, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#D6D0C4] overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer">
                <div className="aspect-[16/10] relative overflow-hidden">
                  <Image src={h.image} alt={h.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-4">
                  <div className="flex gap-0.5 text-[#C49A2A]">
                    {[...Array(h.stars)].map((_, s) => <Star key={s} className="w-3 h-3 fill-current" />)}
                  </div>
                  <h3 className="text-base font-bold text-[#1C1917] mt-1" style={{ fontFamily: "var(--font-display, serif)" }}>{h.name}</h3>
                  <p className="text-xs text-[#A09A8E] flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{h.area}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#EDE9E1]">
                    <span className="text-sm font-semibold text-[#1C1917]">{h.price}</span>
                    <span className="text-[11px] text-[#C8322B] font-medium group-hover:underline">View Details</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter — editorial CTA */}
      <section className="bg-[#1A2332] py-16">
        <div className="max-w-xl mx-auto px-6 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C49A2A]">The Yalla Letter</span>
          <h2 className="text-2xl font-bold text-white mt-3" style={{ fontFamily: "var(--font-display, serif)" }}>Weekly London Intelligence</h2>
          <p className="text-white/50 mt-2 text-sm" style={{ fontFamily: "var(--font-body, serif)" }}>Insider tips, exclusive deals, and curated guides every Friday.</p>
          <div className="flex gap-2 mt-6 max-w-sm mx-auto">
            <input type="email" placeholder="Enter your email" className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#C49A2A]" />
            <button className="px-5 py-2.5 bg-[#C8322B] text-white rounded-lg text-sm font-semibold hover:bg-[#B02B25] transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Variant Selector Page ──────────────────────────────────────────────────

const VARIANTS = [
  { id: "apple", label: "Apple", subtitle: "Premium white space, cinematic imagery", component: AppleVariant },
  { id: "bmw", label: "BMW", subtitle: "Dark surfaces, engineering precision", component: BmwVariant },
  { id: "editorial", label: "Editorial", subtitle: "Magazine warmth, serif authority (brand-aligned)", component: EditorialVariant },
] as const;

export default function HomepagePreviewPage() {
  const [activeVariant, setActiveVariant] = useState<string>("editorial");
  const ActiveComponent = VARIANTS.find(v => v.id === activeVariant)?.component ?? EditorialVariant;

  return (
    <div>
      {/* Selector bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-sm font-bold text-stone-800">Homepage Design Preview</h1>
            <span className="text-[10px] text-stone-400">Tap a style to preview</span>
          </div>
          <div className="flex gap-2">
            {VARIANTS.map(v => (
              <button
                key={v.id}
                onClick={() => setActiveVariant(v.id)}
                className={`flex-1 py-2 px-3 rounded-lg text-center transition-all ${
                  activeVariant === v.id
                    ? "bg-stone-900 text-white shadow-md"
                    : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                }`}
              >
                <span className="text-xs font-semibold block">{v.label}</span>
                <span className={`text-[9px] block mt-0.5 ${activeVariant === v.id ? "text-white/60" : "text-stone-400"}`}>
                  {v.subtitle}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview iframe-style container */}
      <div className="border-4 border-stone-200 rounded-b-xl mx-auto max-w-7xl overflow-hidden">
        <ActiveComponent />
      </div>
    </div>
  );
}
